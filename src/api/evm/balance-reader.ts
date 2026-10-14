import { ethers } from "ethers";
import { default as IERC20 } from "@uniswap/v2-core/build/IERC20.json";
import { assert } from "../errors";
import { parseNumberOrFail, CachedValue } from "../utils";
import { Multicall } from "./multicall";
import { convertEthersError } from "./utils";


///////////////////////////////////////////////////////////////////////////////
const EVM_BALANCE_BATCH_SIZE = 10;
const EVM_BALANCE_MAX_CACHE_AGE = 5000;


///////////////////////////////////////////////////////////////////////////////
export interface BalanceReader {
    // note: all addresses are expected to be normalized
    registerToken(address: string): void;
    getTokenBalance(token: string, owner: string, force?: boolean): Promise<bigint>;
    clearCache(): void;
}


///////////////////////////////////////////////////////////////////////////////
export class BasicEvmBalanceReader implements BalanceReader {

    private readonly _provider: ethers.Provider;
    private readonly _erc20Interface: ethers.Interface;
    private readonly _cache: Map<string, CachedValue<bigint>>;

    constructor(provider: ethers.Provider) {
        this._provider = provider;
        this._erc20Interface = new ethers.Interface(IERC20.abi);
        this._cache = new Map();
    }

    registerToken(_address: string) {}

    clearCache() {
        this._cache.clear();
    }

    getTokenBalance(token: string, owner: string, force?: boolean): Promise<bigint> {
        const key = `${token}|${owner}`;
        let cachedValue = this._cache.get(key);

        if( !cachedValue ) {
            cachedValue = new CachedValue(() => this._doGetTokenBalance(token, owner), EVM_BALANCE_MAX_CACHE_AGE);
            this._cache.set(key, cachedValue);
        } else if( !!force ) {
            cachedValue.reset();
        }

        return cachedValue.get();
    }

    private async _doGetTokenBalance(token: string, owner: string): Promise<bigint> {
        let balance = BigInt(0);

        try {
            if( token === "_" ) {
                balance = await this._provider.getBalance(owner);
            } else {
                balance = await this._getErc20Balance(token, owner);
            }
        } catch(error: any) {
            // treat contract errors as 'no-error'
            if( error.code !== "CALL_EXCEPTION" &&
                error.code !== "BAD_DATA"
            ) {
                throw convertEthersError(error);
            }
        }

        return balance;
    }

    private async _getErc20Balance(token: string, owner: string): Promise<bigint> {
        const result = await this._provider.call({
            to: token,
            data: this._erc20Interface.encodeFunctionData("balanceOf", [owner]),
        });

        const balance = this._erc20Interface.decodeFunctionResult("balanceOf", result)[0];
        return (typeof balance === "bigint") ? balance : BigInt(0);
    }
}


///////////////////////////////////////////////////////////////////////////////
interface BatchValue {
    balances: Map<string, bigint>;
    blockNumber: number;
}

interface Batch {
    tokens: string[];
    values: Map<string, CachedValue<BatchValue>>;   // { owner: BatchValue }
}


///////////////////////////////////////////////////////////////////////////////
export class BatchEvmBalanceReader implements BalanceReader {

    private readonly _multicall: Multicall;
    private readonly _erc20Interface: ethers.Interface;
    private readonly _batchByToken: Map<string, Batch>;
    private readonly _batches: Batch[];

    constructor(multicall: Multicall) {
        this._multicall = multicall;
        this._erc20Interface = new ethers.Interface(IERC20.abi);
        this._batchByToken = new Map();
        this._batches = [];
    }

    registerToken(address: string): void {
        this._register(address);
    }

    clearCache(): void {
        for( const batch of this._batches ) {
            batch.values.clear();
        }
    }

    async getTokenBalance(token: string, owner: string, force?: boolean): Promise<bigint> {
        const batch = this._register(token);
        let cachedBalances = batch.values.get(owner);

        if( !cachedBalances ) {
            const tokens = Array.from(batch.tokens);
            cachedBalances = new CachedValue(async (oldValue?: BatchValue) => {
                const newValue = await this._doGetBalances(tokens, owner);
                return (oldValue?.blockNumber ?? 0) <= newValue.blockNumber ? newValue : undefined;
            }, EVM_BALANCE_MAX_CACHE_AGE);
            batch.values.set(owner, cachedBalances);
        } else if( !!force ) {
            cachedBalances.reset();
        }

        const batchValue = await cachedBalances.get();
        return batchValue.balances.get(token) ?? BigInt(0);
    }

    private _register(token: string): Batch {
        let batch = this._batchByToken.get(token);

        if( !batch ) {
            batch = this._batches.at(-1);

            if( !batch || batch.tokens.length >= EVM_BALANCE_BATCH_SIZE ) {
                batch = { tokens: [], values: new Map() };
                this._batches.push(batch);
            }

            batch.tokens.push(token);
            batch.values.clear();
            this._batchByToken.set(token, batch);
        }

        return batch;
    }

    private async _doGetBalances(tokens: string[], owner: string): Promise<BatchValue> {
        // prepare calls
        const calls = tokens.map(x => {
            if( x === "_" ) {
                return this._multicall.buildGetEthBalance(owner);
            } else {
                return {
                    target: x,
                    interface: this._erc20Interface,
                    fnName: "balanceOf",
                    fnArgs: [owner],
                };
            }
        });

        calls.push(this._multicall.buildGetBlockNumber());

        // execute calls
        const results = await this._multicall.execute(calls);
        assert(results.length === (tokens.length + 1));

        // collect balances
        const balances: Map<string, bigint> = new Map();
        for( let i = 0; i < tokens.length; i++ ) {
            if( results[i].success ) {
                assert(typeof results[i].data === "bigint");
                balances.set(tokens[i], results[i].data);
            }
        }

        const blockNumResult = results.at(-1);
        assert(blockNumResult?.success);
        const blockNumber = parseNumberOrFail(blockNumResult.data);

        return { balances, blockNumber };
    }
}

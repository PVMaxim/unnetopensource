import { TronWeb } from "tronweb";
import { BalanceReader } from "../evm/balance-reader";
import { CachedValue } from "../utils";
import { TRC20_ABI } from "./trc20-token";

const TRON_BALANCE_MAX_CACHE_AGE = 5000;

export class BasicTronBalanceReader implements BalanceReader {

    private readonly _provider: TronWeb;
    private readonly _cache: Map<string, CachedValue<bigint>>;

    constructor(provider: TronWeb) {
        this._provider = provider;
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
            cachedValue = new CachedValue(() => this._doGetTokenBalance(token, owner), TRON_BALANCE_MAX_CACHE_AGE);
            this._cache.set(key, cachedValue);
        } else if( !!force ) {
            cachedValue.reset();
        }

        return cachedValue.get();
    }

    private async _doGetTokenBalance(token: string, owner: string): Promise<bigint> {
        let balance: bigint;

        if( token === "_" ) {
            balance = BigInt(await this._provider.trx.getUnconfirmedBalance(owner));
        } else {
            const contract = this._provider.contract(TRC20_ABI, token);
            balance = BigInt(await contract.balanceOf(owner).call());
        }

        return balance;
    }
}

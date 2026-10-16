import { ethers } from "ethers";
import { default as IERC20 } from "@uniswap/v2-core/build/IERC20.json";
import { CardKeys, HistoryProvider, Request, Token, TransactionInfo } from "../common";
import { UniError, UniLowBalanceError } from "../errors";
import { PriceProvider } from "../pricing";
import { BasicTokenMetadata, GenericTokenBase } from "../token-base";
import { BalanceReader } from "./balance-reader";
import { Multicall } from "./multicall";
import { EvmRequest } from "./request";
import { parseNumberOrFail, getSecp256k1Key, LazyValue, toBlockchainUnits } from "../utils";

export class EvmErc20Token extends GenericTokenBase implements Token {

    private readonly _provider: ethers.Provider;
    private readonly _contract: ethers.Contract;
    private readonly _address: string;
    private readonly _balanceReader: BalanceReader;
    private readonly _history: HistoryProvider;
    private readonly _multicall?: Multicall;

    constructor(args: {
        provider: ethers.Provider,
        priceProvider: PriceProvider,
        address: string,
        balanceReader: BalanceReader,
        history: HistoryProvider,
        ticker: LazyValue<string | undefined>,
        multicall?: Multicall,
        name?: string,
        symbol?: string,
        decimals?: number,
        isMandatory?: boolean,
    }) {
        super({
            ...args,
            id: args.address.toLowerCase(),
        });

        this._provider = args.provider;
        this._address = args.address;
        this._contract = new ethers.Contract(args.address, IERC20.abi, args.provider);
        this._multicall = args.multicall;
        this._history = args.history;

        this._balanceReader = args.balanceReader;
        this._balanceReader.registerToken(this.id);
    }

    static async checkTokenOnChain(args: {
        provider: ethers.Provider,
        address: string,
    }): Promise<boolean> {
        const contract = new ethers.Contract(args.address, IERC20.abi, args.provider);

        try {
            await contract.name();
            await contract.symbol();
            await contract.decimals();
        }
        catch(e: any) {
            if( e.code === "BAD_DATA" ) {
                return false;
            } else {
                throw e;
            }
        }

        return true;
    }

    async getBalance(owner: string): Promise<string> {
        if( !ethers.isAddress(owner) ) {
            return "0";
        }

        const balance = await this._balanceReader.getTokenBalance(this.id, owner);
        if( balance === BigInt(0) ) {
            return "0";
        }

        const decimals = await this.getDecimals();
        return ethers.formatUnits(balance, decimals);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !ethers.isAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const offset = args.offset ?? 0;
        const allItems = await this._history.getTokenTransactions({
            token: this._address,
            owner: args.owner,
        });

        return {
            total: allItems.length,
            items: allItems.slice(offset, offset + args.limit),
        };
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const publicKey = getSecp256k1Key(args.keys);
        const sender = ethers.computeAddress(`0x${publicKey}`);

        if( !ethers.isAddress(args.recipient) ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid address : ${args.recipient}`);
        }

        if( args.recipient.toLowerCase() === sender.toLowerCase() ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const decimals = await this.getAndVerifyDecimals();
        const amount = toBlockchainUnits(args.amount, decimals);
        const data = this._contract.interface.encodeFunctionData("transfer", [args.recipient, amount]);

        const balance = await this._balanceReader.getTokenBalance(this.id, sender, true);
        if( amount > balance ) {
            throw new UniLowBalanceError(this.id);
        }

        return EvmRequest.create({
            provider: this._provider,
            tx: {
                to: this._address,
                data,
            },
            publicKey,
        });
    }

    protected async _doGetMetadata(): Promise<BasicTokenMetadata> {
        return getEvmMetadata(this._provider, this._address, this._multicall);
    }

    async approve(args: {
        spender: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const decimals = await this.getAndVerifyDecimals();
        const amount = toBlockchainUnits(args.amount, decimals);
        const data = this._contract.interface.encodeFunctionData("approve", [args.spender, amount]);

        return EvmRequest.create({
            provider: this._provider,
            tx: {
                to: this._address,
                data,
            },
            publicKey: getSecp256k1Key(args.keys),
        });
    }

    async getApprovedAmount(args:{owner: string, spender: string}): Promise<string> {
        return await this._contract.allowance(args.owner, args.spender);
    }

    swap(args: {
        to: string,
        data: string,
        value: string,
        keys: CardKeys,
    }): Promise<Request> {
        return EvmRequest.create({
            provider: this._provider,
            tx: {
                to: args.to,
                value: args.value,
                data: args.data,
            },
            publicKey: getSecp256k1Key(args.keys),
        });
    }

    getAddress(): string {
        return this._address;
    }

    async wrap(args: {
        amount: number | string;
        keys?: CardKeys;
    }): Promise<Request> {
        const publicKey = getSecp256k1Key(args.keys);

        const decimals = await this.getAndVerifyDecimals();
        const amount = ethers.parseUnits(args.amount.toString(), decimals);
        const wrapErcContract = new ethers.Contract(this._address, [{
            "inputs": [],
            "name": "deposit",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
            }], this._provider);
        const data = wrapErcContract.interface.encodeFunctionData("deposit");

        return EvmRequest.create({
            provider: this._provider,
            tx: {
                to: this._address,
                data,
                value: amount,
            },
            publicKey,
        });
    }
}

function getEvmMetadata(provider: ethers.Provider, address: string, multicall?: Multicall): Promise<BasicTokenMetadata> {
    if( !multicall ) {
        return getEvmNonBatchMetadata(provider, address);
    } else {
        return getEvmBatchMetadata(multicall, address);
    }
}

async function getEvmNonBatchMetadata(provider: ethers.Provider, address: string): Promise<BasicTokenMetadata> {
    const contract = new ethers.Contract(address, IERC20.abi, provider);
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = parseNumberOrFail(await contract.decimals());

    return { name, symbol, decimals };
}

async function getEvmBatchMetadata(multicall: Multicall, address: string): Promise<BasicTokenMetadata> {
    const erc20Interface = new ethers.Interface(IERC20.abi);

    const results = await multicall.execute(
        ["name", "symbol", "decimals"].map(x => ({
            target: address,
            interface: erc20Interface,
            fnName: x,
        }))
    );

    return {
        name: results[0].data,
        symbol: results[1].data,
        decimals: parseNumberOrFail(results[2].data),
    };
}

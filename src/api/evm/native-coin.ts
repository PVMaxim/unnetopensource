import { ethers } from "ethers";
import { CardKeys, HistoryProvider, Request, Token, TransactionInfo } from "../common";
import { UniError } from "../errors";
import { PriceProvider } from "../pricing";
import { NativeTokenBase } from "../token-base"
import { getSecp256k1Key, toBlockchainUnits } from "../utils";
import { BalanceReader } from "./balance-reader";
import { EvmRequest } from "./request";
import { SWAP_NATIVE_ADDRESS } from "../constants-types";

const EVM_NATIVE_DECIMALS = 18;

export class EvmNativeCoin extends NativeTokenBase implements Token {

    private readonly _provider: ethers.Provider;
    private readonly _balanceReader: BalanceReader;
    private readonly _history: HistoryProvider;

    constructor(args: {
        provider: ethers.Provider,
        priceProvider: PriceProvider,
        balanceReader: BalanceReader,
        history: HistoryProvider,
        name: string,
        symbol: string,
        ticker?: string,
    }) {
        super({
            ...args,
            decimals: EVM_NATIVE_DECIMALS,
        });

        this._provider = args.provider;
        this._history = args.history;

        this._balanceReader = args.balanceReader;
        this._balanceReader.registerToken(this.id);
    }

    async getBalance(owner: string): Promise<string> {
        if( !ethers.isAddress(owner) ) {
            return "0";
        }

        const balance = await this._balanceReader.getTokenBalance(this.id, owner);
        return ethers.formatEther(balance);
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
        const allItems = await this._history.getNativeTransactions(args.owner);

        return {
            total: allItems.length,
            items: allItems.slice(offset, offset + args.limit),
        };
    }

    transfer(args: { 
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

        return EvmRequest.create({
            provider: this._provider,
            tx: {
                to: args.recipient,
                value: toBlockchainUnits(args.amount, EVM_NATIVE_DECIMALS),
            },
            publicKey,
        });
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
        return SWAP_NATIVE_ADDRESS;
    }
}

import { ethers } from "ethers";
import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { UniError } from "../errors";
import { NativeTokenBase } from "../token-base"
import { getSecp256k1Key, toBlockchainUnits, fromBlockchainUnits } from "../utils";
import { EvmRequest } from "../evm/request";
import { SWAP_NATIVE_ADDRESS } from "../constants-types";
import { CotiCore } from "./core";

const COTI_NATIVE_DECIMALS = 18;

export class CotiNativeCoin extends NativeTokenBase implements Token {

    private readonly _core: CotiCore;

    constructor(args: {
        core: CotiCore,
        name: string,
        symbol: string,
        ticker?: string,
    }) {
        super({
            ...args,
            priceProvider: args.core.priceProvider,
            decimals: COTI_NATIVE_DECIMALS,
        });

        this._core = args.core;
    }

    async isSecure(): Promise<boolean> {
        return false;
    }

    async getBalance(owner: string): Promise<string> {
        if( !ethers.isAddress(owner) ) {
            return "0";
        }

        const balance = await this._core.provider.getBalance(owner);
        return fromBlockchainUnits(balance, COTI_NATIVE_DECIMALS);
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
        const allItems = await this._core.history.getNativeTransactions(args.owner);

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
        return this._transfer({
            ...args,
            value: toBlockchainUnits(args.amount, COTI_NATIVE_DECIMALS),
        });
    }

    swap(args: {
        to: string,
        data: string,
        value: string,
        keys: CardKeys,
    }): Promise<Request> {
        return this._transfer({
            recipient: args.to,
            value: BigInt(args.value),
            data: args.data,
            keys: args.keys,
        });
    }

    getAddress(): string {
        return SWAP_NATIVE_ADDRESS;
    }

    private _transfer(args: {
        recipient: string,
        value: bigint,
        data?: string,
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
            provider: this._core.provider,
            tx: {
                to: args.recipient,
                value: args.value,
            },
            publicKey,
        });
    }
}

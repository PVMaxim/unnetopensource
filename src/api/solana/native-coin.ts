import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { UniError } from "../errors";
import { PriceProvider } from "../pricing";
import { NativeTokenBase } from "../token-base";
import { fromBlockchainUnits, toBlockchainUnits } from "../utils";
import { SolanaCore, solanaPublicKeyFromHex, SOLANA_NATIVE_DECIMALS } from "./core";
import { SWAP_NATIVE_ADDRESS } from "../constants-types";

export class SolanaNativeCoin extends NativeTokenBase implements Token {

    private readonly _core: SolanaCore;

    constructor(args: {
        core: SolanaCore,
        priceProvider: PriceProvider,
        name: string,
        symbol: string,
        ticker?: string,
    }) {
        super({
            ...args,
            decimals: SOLANA_NATIVE_DECIMALS,
        });

        this._core = args.core;
    }

    async getBalance(owner: string): Promise<string> {
        let ownerPublicKey: PublicKey;
        try {
            ownerPublicKey = new PublicKey(owner);
        } catch(error) {
            return "0";
        }

        const balance = await this._core.rpc.getBalance(ownerPublicKey);
        return fromBlockchainUnits(balance, SOLANA_NATIVE_DECIMALS);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !this._core.scannerApiClient || !this._core.isValidAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        return this._core.scannerApiClient.getTransactions({
            token: "_",
            ...args,
        });
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const senderPubKey = solanaPublicKeyFromHex(this._core.getPublicKey(args.keys));
        const recipientPubKey = new PublicKey(args.recipient);
        const amount = toBlockchainUnits(args.amount, SOLANA_NATIVE_DECIMALS);

        if( senderPubKey.equals(recipientPubKey) ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        return this._core.createRequest({
            instructions: [
                SystemProgram.transfer({
                    fromPubkey: senderPubKey,
                    toPubkey: recipientPubKey,
                    lamports: amount,
                }),
            ],
            senderPublicKey: this._core.getPublicKey(args.keys),
            solAmount: amount,
        });
    }

    swap(args: {
        to: string,
        tx: TransactionInstruction[],
        fromAmount: string,
        keys: CardKeys,
    }): Promise<Request> {
        const amount = toBlockchainUnits(args.fromAmount, SOLANA_NATIVE_DECIMALS);

        let instructions = args.tx
        instructions.forEach((item) => {
            item.keys.forEach((list) => {
                list.pubkey = new PublicKey(list.pubkey)
            })
        })

        return this._core.createRequest({
            instructions,
            senderPublicKey: this._core.getPublicKey(args.keys),
            solAmount: amount,
        });
    }

    getAddress(): string {
        return SWAP_NATIVE_ADDRESS;
    }
}

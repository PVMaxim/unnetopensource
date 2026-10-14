import * as xrpl from "xrpl";
import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { SWAP_NATIVE_ADDRESS } from "../constants-types";
import { UniAmountTooSmallError, UniError } from "../errors";
import { NativeTokenBase } from "../token-base"
import { PriceProvider } from "../pricing";
import { fromBlockchainUnits, getSecp256k1Key, toPosBlockchainUnits, toPosBigInt, toInt } from "../utils";
import { XrplCore, XRPL_NATIVE_DECIMALS, MIN_XRP_AMOUNT_NO_DST } from "./core";
import { XrplRequest } from "./request";


///////////////////////////////////////////////////////////////////////////////
export class XrplNativeCoin extends NativeTokenBase implements Token {

    private readonly _core: XrplCore;

    constructor(args: {
        core: XrplCore,
        priceProvider: PriceProvider,
        name: string,
        symbol: string,
        ticker?: string,
    }) {
        super({
            ...args,
            decimals: XRPL_NATIVE_DECIMALS,
        });

        this._core = args.core;
    }

    async getBalance(owner: string): Promise<string> {
        const value = await this._core.getRawXrpBalance(owner);
        return fromBlockchainUnits(value, XRPL_NATIVE_DECIMALS);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        return this._core.getTransactions({
            ...args,
            tokenId: this.id,
        });
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
        extraId?: string,
    }): Promise<Request> {
        const senderPublicKey = getSecp256k1Key(args.keys);
        const sender = xrpl.deriveAddress(senderPublicKey);

        if( this._core.extractClassicAddress(args.recipient) === sender ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const recipientExists = await this._core.accountExists(args.recipient);
        const amount = toPosBlockchainUnits(args.amount, XRPL_NATIVE_DECIMALS);

        if( !recipientExists && amount < BigInt(MIN_XRP_AMOUNT_NO_DST) ) {
            throw new UniAmountTooSmallError(fromBlockchainUnits(MIN_XRP_AMOUNT_NO_DST, XRPL_NATIVE_DECIMALS));
        }

        return XrplRequest.create({
            core: this._core,
            publicKey: senderPublicKey,
            tx: {
                TransactionType: "Payment",
                Account: sender,
                Destination: args.recipient,
                Amount: amount.toString(),
                DestinationTag: args.extraId ? toInt(args.extraId) : undefined,
            },
            nativeAmount: amount,
        });
    }

    swap(args: {
        TransactionType: "Payment",
        Destination: string,
        Amount: string,
        Memos: any[],
        keys?: CardKeys,
    }): Promise<Request> {
        const senderPublicKey = getSecp256k1Key(args.keys);
        const sender = xrpl.deriveAddress(senderPublicKey);

        return XrplRequest.create({
            core: this._core,
            publicKey: senderPublicKey,
            tx: {
                TransactionType: args.TransactionType,
                Account: sender,
                Destination: args.Destination,
                Amount: args.Amount,
                Memos: args.Memos,
                DestinationTag: 0,
            },
            nativeAmount: toPosBigInt(args.Amount),
        });
    }

    getAddress(): string {
        return SWAP_NATIVE_ADDRESS;
    }

    async getReserveAmount(owner: string): Promise<string> {
        try {
            const provider = await this._core.provider.get();
            const accountData = await provider.request({
                command: "account_info",
                account: owner,
                ledger_index: "validated",
            });
            const serverState = await provider.request({ command: "server_state" });
            const baseReserve = serverState.result.state.validated_ledger?.reserve_base ?? 0;
            const ownerReserve = serverState.result.state.validated_ledger?.reserve_inc ?? 0;
            const ownerCount = accountData.result.account_data.OwnerCount;
            const totalReserve = baseReserve + (ownerReserve * ownerCount);
            return fromBlockchainUnits(totalReserve.toString(), XRPL_NATIVE_DECIMALS);
        } catch (error) {
            return "0";
        }
    }
}

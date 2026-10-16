import { z } from "zod";
import { TronWeb } from "tronweb";
import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { UniError } from "../errors";
import { BalanceReader } from "../evm/balance-reader";
import { HttpClient } from "../http-client";
import { PriceProvider } from "../pricing";
import { NativeTokenBase } from "../token-base";
import { getSecp256k1Key, fromBlockchainUnits, toBlockchainUnits } from "../utils";
import { calcTronAddress, TronRequest, TRON_NATIVE_TOKEN_DECIMALS } from "./request";
import { SWAP_NATIVE_ADDRESS } from "../constants-types";
import BigNumber from "bignumber.js";

const TransfersSchema = z.object({
    total: z.number(),
    data: z.object({
        hash: z.string(),
        timestamp: z.number().int(),
        ownerAddress: z.string(),
        toAddress: z.string(),
        confirmed: z.boolean(),
        result: z.string(),
        amount: z.coerce.bigint(),
        contractType: z.number().int(),
    }).array(),
});

const CONTRACT_TYPE_TRANSFER_TRX = 1;

export class TronNativeCoin extends NativeTokenBase implements Token {

    private readonly MAX_TRANSACTIONS = 50;

    private readonly _provider: TronWeb;
    private readonly _scannerApi: HttpClient;
    private readonly _formatTxUrl: (txHash: string) => string;
    private readonly _balanceReader: BalanceReader;

    constructor(args: {
        provider: TronWeb,
        scannerApi: HttpClient,
        formatTxUrl: (txHash: string) => string,
        priceProvider: PriceProvider,
        balanceReader: BalanceReader,
        name: string,
        symbol: string,
        decimals: number,
        ticker?: string,
    }) {
        super({
            ...args,
            decimals: TRON_NATIVE_TOKEN_DECIMALS,
        });

        this._provider = args.provider;
        this._scannerApi = args.scannerApi;
        this._formatTxUrl = args.formatTxUrl;

        this._balanceReader = args.balanceReader;
        this._balanceReader.registerToken(this.id);
    }

    async getBalance(owner: string): Promise<string> {
        if( !TronWeb.isAddress(owner) ) {
            return "0";
        }

        const balance = await this._balanceReader.getTokenBalance(this.id, owner);
        return fromBlockchainUnits(balance, this._decimals);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !TronWeb.isAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const data = await this._scannerApi.getTyped({
            schema: TransfersSchema,
            url: "api/transaction",
            params: {
                sort: "-timestamp",
                count: "true",
                limit: this.MAX_TRANSACTIONS.toString(),
                start: "0",
                address: args.owner,
            },
        });

        const offset = args.offset ?? 0;
        const allItems: TransactionInfo[] = data.data
            .filter(x => !!x.amount && x.contractType === CONTRACT_TYPE_TRANSFER_TRX)
            .map(x => ({
                id: x.hash,
                success: x.result === "SUCCESS",
                confirmed: x.confirmed,
                direction: (x.ownerAddress === args.owner) ? "out" : "in",
                timestamp: ~~(x.timestamp / 1000),
                amount: fromBlockchainUnits(x.amount, this._decimals),
                scannerUrl: this._formatTxUrl(x.hash),
            }));

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
        const sender = calcTronAddress(publicKey);

        if( !TronWeb.isAddress(args.recipient) ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid address : ${args.recipient}`);
        }

        if( sender === args.recipient ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const amount = toBlockchainUnits(args.amount, this._decimals);
        const tx = await this._provider.transactionBuilder.sendTrx(args.recipient, Number(amount), sender);

        return TronRequest.create({
            provider: this._provider,
            publicKey,
            transaction: tx,
            nativeAmount: amount,
        });
    }

    async swap(args: {
        to: string,
        tronRouterAddrees: string,
        functionName: string,
        options: {
            feeLimit: number,
            callValue: number,
        },
        parameter: any,
        fromAddress: string,
        keys: CardKeys,
    }): Promise<Request> {
        const publicKey = getSecp256k1Key(args.keys);
        const increasedFeeLimit = new BigNumber(args.options.feeLimit).multipliedBy(1.15).toNumber();

        const dryRunTx = await this._provider.transactionBuilder.triggerConstantContract(
            args.tronRouterAddrees,
            args.functionName,
            args.options,
            args.parameter,
            this._provider.address.fromHex(args.fromAddress)
        );

        const tx = await this._provider.transactionBuilder.triggerSmartContract(
            args.tronRouterAddrees,
            args.functionName,
            { feeLimit: increasedFeeLimit, callValue: args.options.callValue },
            args.parameter,
            this._provider.address.fromHex(args.fromAddress)
        );

        return TronRequest.create({
            provider: this._provider,
            publicKey,
            transaction: tx.transaction,
            energy: dryRunTx.energy_used ?? 0,
            nativeAmount: BigInt(args.options.callValue),
        });
    }

    getAddress(): string {
        return SWAP_NATIVE_ADDRESS;
    }
}

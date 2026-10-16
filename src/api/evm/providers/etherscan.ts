import { ethers } from "ethers";
import { z } from "zod";
import { HistoryProvider, TransactionInfo, TokenTransactionInfo } from "../../common";
import { HttpClient } from "../../http-client";

const TxListSchema = z.object({
    status: z.string(),
    message: z.string(),
    result: z.object({
        timeStamp: z.coerce.number().int().positive(),
        hash: z.string(),
        from: z.string(),
        to: z.string(),
        value: z.coerce.bigint().nonnegative(),
        isError: z.string(),
        txreceipt_status: z.string(),
    }).array(),
});

const TokenTxSchema = z.object({
    status: z.string(),
    message: z.string(),
    result: z.object({
        timeStamp: z.coerce.number().int().positive(),
        hash: z.string(),
        from: z.string(),
        to: z.string(),
        value: z.coerce.bigint().nonnegative(),
        contractAddress: z.string(),
        tokenDecimal: z.coerce.number().int().nonnegative(),
    }).array(),
});

export class EtherScanHistory implements HistoryProvider {

    protected readonly MAX_TRANSACTIONS = 50;

    protected readonly _client: HttpClient;
    protected readonly _txUrlFormatter: (id: string) => string;

    constructor(args: {
        baseUrl: string,
        txUrlFormatter: (id: string) => string,
    }) {
        this._client = new HttpClient({ baseUrl: args.baseUrl });
        this._txUrlFormatter = args.txUrlFormatter;
    }

    async getNativeTransactions(owner: string): Promise<TransactionInfo[]> {
        const data = await this._client.getTyped({
            schema: TxListSchema,
            params: {
                module: "account",
                action: "txlist",
                address: owner,
                startblock: "0",
                endblock: "99999999",
                page: "1",
                offset: this.MAX_TRANSACTIONS.toString(),
                sort: "desc",
            },
        });

        if( data.status !== "1" ) {
            return [];
        }

        return data.result
            .filter(x => !!x.value)
            .map(x => ({
                id: x.hash,
                success: x.isError === "0",
                confirmed: x.txreceipt_status === "1",
                direction: (x.from.toLowerCase() === owner.toLowerCase()) ? "out" : "in",
                timestamp: x.timeStamp,
                amount: ethers.formatEther(x.value),
                scannerUrl: this._txUrlFormatter(x.hash),
            }));
    }

    async getTokenTransactions(args: {
        token: string,
        owner: string,
    }): Promise<TransactionInfo[]> {
        const data = await this._client.getTyped({
            schema: TokenTxSchema,
            params: {
                module: "account",
                action: "tokentx",
                address: args.owner,
                contractaddress: args.token,
                startblock: "0",
                endblock: "99999999",
                page: "1",
                offset: this.MAX_TRANSACTIONS.toString(),
                sort: "desc",
            },
        });

        if( data.status !== "1" ) {
            return [];
        }

        return data.result.map(x => ({
            id: x.hash,
            success: true,
            confirmed: true,
            direction: (x.from.toLowerCase() === args.owner.toLowerCase()) ? "out" : "in",
            timestamp: x.timeStamp,
            amount: ethers.formatUnits(x.value, x.tokenDecimal),
            scannerUrl: this._txUrlFormatter(x.hash),
        }));
    }

    async getAllTokenTransactions(owner: string): Promise<TokenTransactionInfo[]> {
        const data = await this._client.getTyped({
            schema: TokenTxSchema,
            params: {
                module: "account",
                action: "tokentx",
                address: owner,
                startblock: "0",
                endblock: "99999999",
                page: "1",
                offset: this.MAX_TRANSACTIONS.toString(),
                sort: "desc",
            },
        });

        if( data.status !== "1" ) {
            return [];
        }

        return data.result.map(x => ({
            id: x.hash,
            tokenId: x.contractAddress.toLowerCase(),
            success: true,
            confirmed: true,
            direction: (x.from.toLowerCase() === owner.toLowerCase()) ? "out" : "in",
            timestamp: x.timeStamp,
            amount: ethers.formatUnits(x.value, x.tokenDecimal),
            scannerUrl: this._txUrlFormatter(x.hash),
        }));
    }
}

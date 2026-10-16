import { BigNumber } from "bignumber.js";
import { z } from "zod";
import { HistoryProvider, TransactionInfo, TokenTransactionInfo } from "../../common";
import { UniError } from "../../errors";
import { HttpClient } from "../../http-client";

const TatumTxListSchema = z.object({
    result: z.object({
        timestamp: z.coerce.number().int().positive(),
        hash: z.string(),
        amount: z.string(),
        transactionType: z.string(),
        transactionSubtype: z.string(),
    }).array(),
});

export class TatumEvmHistory implements HistoryProvider {

    private readonly MAX_TRANSACTIONS = 50;

    private readonly _client: HttpClient;
    private readonly _chain: string;
    private readonly _txUrlFormatter: (id: string) => string;

    constructor(args: {
        baseUrl: string,
        chain: string,
        txUrlFormatter: (id: string) => string,
    }) {
        this._client = new HttpClient({ baseUrl: args.baseUrl });
        this._chain = args.chain;
        this._txUrlFormatter = args.txUrlFormatter;
    }

    async getNativeTransactions(owner: string): Promise<TransactionInfo[]> {
        return this._doGetTransactions({
            addresses: owner,
            transactionTypes: "native",
        });
    }

    async getTokenTransactions(args: {
        token: string,
        owner: string,
    }): Promise<TransactionInfo[]> {
        return this._doGetTransactions({
            addresses: args.owner,
            tokenAddress: args.token,
            transactionTypes: "fungible",
        });
    }

    async _doGetTransactions(args: {
        addresses: string,
        transactionTypes?: string,
        tokenAddress?: string,
    }): Promise<TransactionInfo[]> {
        const data = await this._client.getTyped({
            schema: TatumTxListSchema,
            url: "v4/data/transaction/history",
            params: {
                chain: this._chain,
                pageSize: this.MAX_TRANSACTIONS.toString(),
                ...args,
            },
        });

        return data.result
            .filter(x => x.transactionSubtype === "incoming" || x.transactionSubtype === "outgoing")
            .map(x => ({
                id: x.hash,
                success: true,
                confirmed: true,
                direction: x.transactionSubtype === "incoming" ? "in" : "out",
                timestamp: ~~(x.timestamp / 1000),
                amount: new BigNumber(x.amount).abs().toFixed(),
                scannerUrl: this._txUrlFormatter(x.hash),
            }));
    }

    async getAllTokenTransactions(_owner: string): Promise<TokenTransactionInfo[]> {
        throw new UniError("NOT_SUPPORTED");
    }
}

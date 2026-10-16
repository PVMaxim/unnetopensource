import { BigNumber } from "bignumber.js";
import { z } from "zod";
import { TransactionInfo, TokenTransactionInfo } from "../common";
import { HttpClient } from "../http-client";

const TransfersResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        trans_id: z.string(),
        block_time: z.number(),
        token_address: z.string(),
        token_decimals: z.number(),
        amount: z.coerce.bigint(),
        flow: z.string(),
    }).array().nullish(),
});

export class SolScan {

    private readonly NATIVE_TOKEN_ADDRESS = "So11111111111111111111111111111111111111111";
    private readonly MAX_TRANSACTIONS = 30;

    private readonly _http: HttpClient;
    private readonly _txUrlFormatter: (id: string) => string;

    constructor(args: {
        baseUrl: string,
        txUrlFormatter: (id: string) => string,
    }) {
        this._http = new HttpClient({ baseUrl: args.baseUrl });
        this._txUrlFormatter = args.txUrlFormatter;
    }

    async getTransactions(args: {
        token: string,
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        const offset = args.offset ?? 0;
        const allItems = await this._getAllTransfers({
            owner: args.owner,
            token: args.token === "_" ? this.NATIVE_TOKEN_ADDRESS : args.token,
        });

        return {
            total: allItems.length,
            items: allItems.slice(offset, offset + args.limit),
        };
    }

    async getTransactions2(args: {
        owner: string,
        limit: number,
        allowedTokens: string[],
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        const offset = args.offset ?? 0;
        const allItems = (await this._getAllTransfers2({
            owner: args.owner,
        })).filter(x => args.allowedTokens.includes(x.tokenId));

        return {
            total: allItems.length,
            items: allItems.slice(offset, offset + args.limit),
        };
    }

    private async _getAllTransfers(args: {
        owner: string,
        token: string,
    }): Promise<TransactionInfo[]> {
        const response = await this._http.getTyped({
            schema: TransfersResponseSchema,
            url: "v2.0/account/transfer",
            params: {
                address: args.owner,
                token: args.token,
                exclude_amount_zero: "true",
                page: "1",
                page_size: this.MAX_TRANSACTIONS.toString(),
                sort_by: "block_time",
                sort_order: "desc",
            },
        });

        if( !response.success || !response.data ) {
            return [];
        }

        return response.data.map(x => ({
            id: x.trans_id,
            scannerUrl: this._txUrlFormatter(x.trans_id),
            confirmed: true,
            success: true,
            direction: x.flow === "in" ? "in" : "out",
            timestamp: x.block_time,
            amount: new BigNumber(x.amount.toString()).shiftedBy(-x.token_decimals).toFixed(),
        }));
    }

    private async _getAllTransfers2(args: {
        owner: string,
    }): Promise<TokenTransactionInfo[]> {
        const response = await this._http.getTyped({
            schema: TransfersResponseSchema,
            url: "v2.0/account/transfer",
            params: {
                address: args.owner,
                exclude_amount_zero: "true",
                page: "1",
                page_size: this.MAX_TRANSACTIONS.toString(),
                sort_by: "block_time",
                sort_order: "desc",
            },
        });

        if( !response.success || !response.data ) {
            return [];
        }

        return response.data.map(x => ({
            id: x.trans_id,
            tokenId: x.token_address === this.NATIVE_TOKEN_ADDRESS ? "_" : x.token_address,
            scannerUrl: this._txUrlFormatter(x.trans_id),
            confirmed: true,
            success: true,
            direction: x.flow === "in" ? "in" : "out",
            timestamp: x.block_time,
            amount: new BigNumber(x.amount.toString()).shiftedBy(-x.token_decimals).toFixed(),
        }));
    }
}

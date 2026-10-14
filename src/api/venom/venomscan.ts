import { BigNumber } from "bignumber.js";
import { z } from "zod";
import { TokenTransactionInfo } from "../common";
import { VENOM_NATIVE_COIN_DECIMALS } from "./constants";
import { HttpClient } from "../http-client";


///////////////////////////////////////////////////////////////////////////////
const API_BASE_URL = "https://api.venomscan.com/";
const TOKENS_BASE_URL = "https://tokens.venomscan.com/";


///////////////////////////////////////////////////////////////////////////////
const TxCountResponseSchema = z.object({
    count: z.number().int(),
});

const TransactionsResponseSchema = z.object({
    time: z.number(),
    hash: z.string(),
    balanceChange: z.coerce.bigint(),
    aborted: z.boolean(),
}).array();

const TokensTxCountResponseSchema = z.object({
    totalCount: z.number().int(),
});

const TokensTxResponseSchema = z.object({
    transactions: z.object({
        transactionHash: z.string(),
        sender: z.object({
            ownerAddress: z.string(),
        }).nullish(),
        receiver: z.object({
            ownerAddress: z.string(),
        }).nullish(),
        amount: z.string(),
        rootAddress: z.string(),
        blockTime: z.number(),
    }).array(),
});


///////////////////////////////////////////////////////////////////////////////
export class VenomScan {

    private readonly _apiHttp: HttpClient;
    private readonly _tokensHttp: HttpClient;
    private readonly _txUrlFormatter: (id: string) => string;

    constructor(args: {
        txUrlFormatter: (id: string) => string,
    }) {
        this._apiHttp = new HttpClient({ baseUrl: API_BASE_URL });
        this._tokensHttp = new HttpClient({ baseUrl: TOKENS_BASE_URL });
        this._txUrlFormatter = args.txUrlFormatter;
    }

    async getNativeTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        const total = (await this._apiHttp.postTyped({
            schema: TxCountResponseSchema,
            url: "/v1/transactions/count",
            body: {
                includeAccounts: [args.owner],
                txTypes: ["Ordinary"],
            },
        })).count;

        const offset = args.offset ?? 0;
        if( !total || offset >= total ) {
            return { total, items: [] };
        }

        const itemsResponse = await this._apiHttp.postTyped({
            schema: TransactionsResponseSchema,
            url: "/v1/transactions/list",
            body: {
                includeAccounts: [args.owner],
                txTypes: ["Ordinary"],
                limit: args.limit,
                offset,
                ordering: {
                    column: "time",
                    direction: "DESC",
                }
            },
        });

        const items: TokenTransactionInfo[] = itemsResponse.map(x => ({
            id: x.hash,
            tokenId: "_",
            direction: x.balanceChange > BigInt(0) ? "in" : "out",
            confirmed: true,
            success: !x.aborted || x.balanceChange > BigInt(0),
            timestamp: x.time,
            scannerUrl: this._txUrlFormatter(x.hash),
            amount: new BigNumber(x.balanceChange.toString()).abs().shiftedBy(-VENOM_NATIVE_COIN_DECIMALS).toFixed(),
        }));

        return { total, items };
    }

    async getTokenTransactions(args: {
        root?: string,
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        const requestArgs = {
            limit: args.limit,
            ordering: "blocktimeatdescending",
            ownerAddress: args.owner,
            rootAddress: args.root ? [args.root] : undefined,
            kind: ["mint", "burn", "send", "sendcancellation", "burncancellation", "receive"],
        };

        const total = (await this._tokensHttp.postTyped({
            schema: TokensTxCountResponseSchema,
            url: "/v1/transactions/count",
            body: {
                offset: 0,
                ...requestArgs,
            },
        })).totalCount;

        const offset = args.offset ?? 0;
        if( !total || offset >= total ) {
            return { total, items: [] };
        }

        const itemsResponse = await this._tokensHttp.postTyped({
            schema: TokensTxResponseSchema,
            url: "/v1/transactions",
            body: {
                offset,
                ...requestArgs,
            },
        });

        const items: TokenTransactionInfo[] = itemsResponse.transactions.map(x => ({
            id: x.transactionHash,
            tokenId: x.rootAddress.toLowerCase(),
            direction: x.sender && x.sender.ownerAddress.toLowerCase() === args.owner.toLowerCase() ? "out" : "in",
            confirmed: true,
            success: true,
            timestamp: ~~(x.blockTime / 1000),
            amount: x.amount,
            scannerUrl: this._txUrlFormatter(x.transactionHash),
        }));

        return { total, items };
    }
}

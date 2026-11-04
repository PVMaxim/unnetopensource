import { z } from "zod";
import { UniError } from "../errors";
import { HttpClient } from "../http-client";

const RecommendedFeesSchema = z.object({
    fastestFee: z.number().positive(),
    halfHourFee: z.number().positive(),
    hourFee: z.number().positive(),
    economyFee: z.number().positive(),
    minimumFee: z.number().positive(),
});

const BlockTimestampSchema = z.object({
    height: z.number().int().positive(),
    hash: z.string(),
    timestamp: z.string(),
});

const UtxoSchema = z.object({
    txid: z.string(),
    vout: z.number(),
    value: z.preprocess(v => (v === null || v === undefined ? 0n : v), z.coerce.bigint().nonnegative()),
    status: z.object({
        confirmed: z.boolean(),
        block_height: z.number().int().positive().optional(),
        block_hash: z.string().optional(),
        block_time: z.number().int().positive().optional(),
    }),
});

const TransactionSchema = z.object({
    txid: z.string(),
    version: z.number().optional().default(1),
    locktime: z.number().optional().default(0),
    size: z.number().int().optional().default(0),
    weight: z.number().int().optional().default(0),
    fee: z.coerce.number().int().optional().default(0),
    status: z.object({
        confirmed: z.boolean().optional().default(false),
        block_height: z.number().int().nonnegative().optional(),
        block_hash: z.string().optional(),
        block_time: z.number().int().nonnegative().optional(),
    }),
    vin: z.object({
        txid: z.string().optional().default(""),
        vout: z.number().optional().default(0),
        prevout: z.object({
            scriptpubkey: z.string().optional().default(""),
            scriptpubkey_asm: z.string().optional().default(""),
            scriptpubkey_type: z.string().optional().default(""),
            scriptpubkey_address: z.string().optional(),
            value: z.preprocess(v => (v === null || v === undefined ? 0n : v), z.coerce.bigint().nonnegative()),
        }).nullish(),
        scriptsig: z.string().optional().default(""),
        scriptsig_asm: z.string().optional().default(""),
        is_coinbase: z.boolean().optional().default(false),
        sequence: z.number().optional().default(0),
    }).array().optional().default([]),
    vout: z.object({
        scriptpubkey: z.string().optional().default(""),
        scriptpubkey_asm: z.string().optional().default(""),
        scriptpubkey_type: z.string().optional().default(""),
        scriptpubkey_address: z.string().optional(),
        value: z.preprocess(v => (v === null || v === undefined ? 0n : v), z.coerce.bigint().nonnegative()),
    }).array().optional().default([]),
});

const AddressUtxoListSchema = z.preprocess((val) => Array.isArray(val) ? val : [], z.array(UtxoSchema));
const AddressTransactionsSchema = z.preprocess((val) => Array.isArray(val) ? val : [], z.array(TransactionSchema));

export type Utxo = z.infer<typeof UtxoSchema>;

export class MempoolClient {

    private readonly _httpClient: HttpClient;

    constructor(host: string, timeout: number = 30 * 1000) {
        this._httpClient = new HttpClient({baseUrl: host, timeout});
    }

    getLatestBlock() {
        const now = ~~(Date.now() / 1000);
        return this._httpClient.getTyped({
            schema: BlockTimestampSchema,
            url: `api/v1/mining/blocks/timestamp/${now}`,
        });
    }

    getUtxo(address: string) {
        return this._httpClient.getTyped({
            schema: AddressUtxoListSchema,
            url: `api/address/${address}/utxo`,
        });
    }

    getTransactions(address: string) {
        return this._httpClient.getTyped({
            schema: AddressTransactionsSchema,
            url: `api/address/${address}/txs`,
        });
    }

    getTransaction(txId: string) {
        return this._httpClient.getTyped({
            schema: TransactionSchema,
            url: `api/tx/${txId}`,
        });
    }

    async sendTransaction(hexData: string): Promise<void> {
        const response = await this._httpClient.fetch({
            method: "POST",
            url: "api/tx",
            body: hexData,
            validateStatus: (status: number)=> status === 200 || status === 400,
        });

        if( response.status === 400 ) {
            const error = await response.text();
            throw new UniError("INTERNAL_ERROR", `Failed to send transaction : ${error}`);
        }
    }

    getRecommendedFees() {
        return this._httpClient.getTyped({
            schema: RecommendedFeesSchema,
            url: "api/v1/fees/recommended",
        });
    }
}

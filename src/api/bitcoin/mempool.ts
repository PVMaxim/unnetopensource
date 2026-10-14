import { z } from "zod";
import { UniError } from "../errors";
import { HttpClient } from "../http-client";


///////////////////////////////////////////////////////////////////////////////
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
    value: z.number().int().nonnegative().pipe(z.coerce.bigint()),
    status: z.object({
        confirmed: z.boolean(),
        block_height: z.number().int().positive().optional(),
        block_hash: z.string().optional(),
        block_time: z.number().int().positive().optional(),
    }),
});

const TransactionSchema = z.object({
    txid: z.string(),
    version: z.number(),
    locktime: z.number(),
    size: z.number().int(),
    weight: z.number().int(),
    fee: z.number().int(),
    status: z.object({      // todo: make common
        confirmed: z.boolean(),
        block_height: z.number().int().positive().optional(),
        block_hash: z.string().optional(),
        block_time: z.number().int().positive().optional(),
    }),
    vin: z.object({
        txid: z.string(),
        vout: z.number(),
        prevout: z.object({
            scriptpubkey: z.string(),
            scriptpubkey_asm: z.string(),
            scriptpubkey_type: z.string(),
            scriptpubkey_address: z.string().optional(),
            value: z.number().int().nonnegative().pipe(z.coerce.bigint()),
        }).nullish(),
        // todo: witness
        scriptsig: z.string(),
        scriptsig_asm: z.string(),
        is_coinbase: z.boolean(),
        sequence: z.number(),
    }).array(),
    vout: z.object({
        scriptpubkey: z.string(),
        scriptpubkey_asm: z.string(),
        scriptpubkey_type: z.string(),
        scriptpubkey_address: z.string().optional(),
        value: z.number().int().nonnegative().pipe(z.coerce.bigint()),
    }).array(),
});

const AddressUtxoListSchema = z.array(UtxoSchema);
const AddressTransactionsSchema = z.array(TransactionSchema);


///////////////////////////////////////////////////////////////////////////////
export type Utxo = z.infer<typeof UtxoSchema>;


///////////////////////////////////////////////////////////////////////////////
export class MempoolClient {

    private readonly _httpClient: HttpClient;

    // todo: cache

    constructor(host: string) {
        this._httpClient = new HttpClient({baseUrl: host});
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

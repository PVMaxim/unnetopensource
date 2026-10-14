import { z } from "zod";
import { Address, internal, SendMode, fromNano, Cell } from "@ton/ton";
import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { UniError } from "../errors";
import { PriceProvider } from "../pricing";
import { NativeTokenBase } from "../token-base";
import { UniTonCore, base64ToSafe } from "./core";
import { SWAP_NATIVE_ADDRESS } from "../constants-types";
import { toBlockchainUnits } from "../utils";


///////////////////////////////////////////////////////////////////////////////
const TON_NATIVE_DECIMALS = 9;


///////////////////////////////////////////////////////////////////////////////
const AccountStateSchema = z.object({
    balance: z.coerce.bigint().nonnegative().nullish(),
    // skipped: code_boc, code_hash, data_boc, data_hash, frozen_hash, hash, account_status
});

const MessageSchema = z.object({
    hash: z.string(),
    source: z.string().nullish(),
    destination: z.string().nullish(),
    value: z.coerce.bigint().nullish(),
    // skipped: fwd_fee, ihr_fee, created_lt, created_at
    // skipped: import_fee, message_content, init_state, opcode, ihr_disabled
    bounce: z.boolean().nullish(),
    bounced: z.boolean().nullish(),
});

const TransactionSchema = z.object({
    account: z.string(),
    hash: z.string(),
    lt: z.coerce.bigint(),
    now: z.number().int(),
    total_fees: z.coerce.bigint(),
    // skipped: mc_block_seqno, trace_id, prev_trans_hash, prev_trans_lt
    // skipped: description, block_ref, orig_status, end_status
    in_msg: MessageSchema,
    out_msgs: z.array(MessageSchema),
    account_state_before: AccountStateSchema,
    account_state_after: AccountStateSchema,
});

const TransactionsSchema = z.object({
    transactions: z.array(TransactionSchema),
    // skipped: address_book
});


///////////////////////////////////////////////////////////////////////////////
export class TonNativeCoin extends NativeTokenBase implements Token {

    private readonly MAX_TRANSACTIONS = 50;

    private readonly _core: UniTonCore;

    constructor(args: {
        core: UniTonCore,
        priceProvider: PriceProvider,
        name: string,
        symbol: string,
        ticker?: string,
    }) {
        super({
            ...args,
            decimals: TON_NATIVE_DECIMALS,
        });

        this._core = args.core;
    }

    async getBalance(owner: string): Promise<string> {
        if( !Address.isFriendly(owner) ) {
            return "0";
        }

        const address = Address.parse(owner);
        const rawBalance = await this._core.client.getBalance(address);
        return fromNano(rawBalance);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !Address.isFriendly(args.owner) ) {
            return { total: 0, items: [] };
        }

        const parsed = await this._core.indexerApi.getTyped({
            schema: TransactionsSchema,
            url: "api/v3/transactions",
            params: {
                account: Address.parse(args.owner).toRawString(),
                limit: this.MAX_TRANSACTIONS.toString(),
                offset: "0",
                sort: "desc",
            },
        });

        const allTxList: TransactionInfo[] = [];
        for( const item of parsed.transactions ) {
            if( item.in_msg.bounced ) {
                continue;
            }

            let amount = (item.in_msg.value || BigInt(0)) - item.total_fees;
            for( const msg of item.out_msgs ) {
                amount -= msg.value || BigInt(0);
            }

            const isOutput = !item.in_msg.source;

            allTxList.push({
                id: base64ToSafe(item.hash),
                success: !isOutput || isOutput && item.out_msgs.length > 0,
                confirmed: true,
                amount: fromNano(amount < BigInt(0) ? -amount : amount),
                direction: isOutput ? "out" : "in",
                scannerUrl: this._core.formatTxUrl(item.hash),
                timestamp: item.now,
            });
        }

        const offset = args.offset ?? 0;
        const txList = allTxList.slice(offset, offset + args.limit);

        return { 
            total: allTxList.length, 
            items: txList,
        };
    }

    async transfer(args: { 
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        if( !Address.isFriendly(args.recipient) ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid address : ${args.recipient}`);
        }

        const sender = this._core.getWalletAddress(args.keys ?? {});
        const recipient = Address.parse(args.recipient);

        if( sender.equals(recipient) ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const message = internal({
            to: recipient,
            value: toBlockchainUnits(args.amount, TON_NATIVE_DECIMALS),
            bounce: false,
        });

        return this._core.createRequest({
            keys: args.keys,
            messages: [message],
            sendMode: SendMode.IGNORE_ERRORS | SendMode.PAY_GAS_SEPARATELY,
        });
    }

    async swap(args: {
        address: string,
        amount: string,
        payload?: string,
        keys?: CardKeys,
    }): Promise<Request> {
        let payload;

        if( args.payload ) {
          try {
            payload = Cell.fromBase64(args.payload);
          } catch (error) {
            payload = Cell.fromHex(args.payload);
          } 
        }

        const message = internal({
            to: Address.parse(args.address),
            value: fromNano(args.amount),
            bounce: !!args.payload,
            body: payload,
        });

        return this._core.createRequest({
            keys: args.keys,
            messages: [message],
            sendMode: SendMode.IGNORE_ERRORS | SendMode.PAY_GAS_SEPARATELY,
        });
    }

    getAddress(): string {
        return SWAP_NATIVE_ADDRESS;
    }
}

import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";

import { CardKeys, Request } from "../common";
import { UniError } from "../errors";
import { Ed25519RequestChunk } from "../request-chunks";
import { fromBlockchainUnits, getEd25519Key, wait } from "../utils";
import { SolScan } from "./solscan";
import { SplBalanceReader } from "./spl-balance-reader";


///////////////////////////////////////////////////////////////////////////////
const SOLANA_MAX_TIME_BEFORE_TX_SEND = 40 * 1000;
export const SOLANA_TX_CONFIRM_TIMEOUT = 60 * 1000;
export const SOLANA_NATIVE_DECIMALS = 9;


///////////////////////////////////////////////////////////////////////////////
export class SolanaCore {

    readonly rpc: Connection;
    readonly scannerApiClient?: SolScan;
    readonly splBalanceReader: SplBalanceReader;

    private readonly _formatTxUrl: (txHash: string) => string;

    constructor(args: {
        rpc: Connection,
        formatTxUrl: (txHash: string) => string,
        scannerApiUrl?: string,
    }) {
        this.rpc = args.rpc;
        this.splBalanceReader = new SplBalanceReader(args.rpc);
        this._formatTxUrl = args.formatTxUrl;

        if( args.scannerApiUrl ) {
            this.scannerApiClient = new SolScan({
                baseUrl: args.scannerApiUrl,
                txUrlFormatter: args.formatTxUrl,
            });
        }
    }

    isValidAddress(address: string): boolean {
        try {
            return !!(new PublicKey(address));
        } catch(error) {
            return false;
        }
    }

    getPublicKey(keys?: CardKeys): string {
        return getEd25519Key(keys);
    }

    getWalletAddress(keys: CardKeys): string {
        return solanaPublicKeyFromHex(this.getPublicKey(keys)).toString();
    }

    getTransactionLink(signature: string): string {
        return this._formatTxUrl(signature);
    }

    async createRequest(args: {
        senderPublicKey: string,
        instructions: TransactionInstruction[],
        solAmount?: bigint,
    }): Promise<SolanaRequest> {
        const sender = solanaPublicKeyFromHex(args.senderPublicKey);
        const senderSolBalance = await this.rpc.getBalance(sender);

        // create separate transaction for fee estimation because transaction has very short lifetime (~60 seconds)
        const feeTx = await this._createTransaction({ sender, instructions: args.instructions });
        const fee = BigInt((await feeTx.getEstimatedFee(this.rpc)) || 0);
        const solTotal = (args.solAmount ?? BigInt(0)) + fee;

        if( solTotal > senderSolBalance ) {
            throw new UniError("LOW_BALANCE", "_");
        }

        return new SolanaRequest({
            rpc: this.rpc,
            tx: await this._createTransaction({ sender, instructions: args.instructions }),
            fee,
            senderPublicKey: args.senderPublicKey,
            deadline: Date.now() + SOLANA_MAX_TIME_BEFORE_TX_SEND,
        });
    }

    private async _createTransaction(args: {
        sender: PublicKey,
        instructions: TransactionInstruction[],
    }): Promise<Transaction> {
        return new Transaction({
            ...(await this.rpc.getLatestBlockhash("finalized")),
            feePayer: args.sender,
        }).add(
            ...args.instructions
        );
    }
}


///////////////////////////////////////////////////////////////////////////////
export class SolanaRequest implements Request {

    readonly chunks: Ed25519RequestChunk[];

    private readonly _rpc: Connection;
    private readonly _tx: Transaction;
    private readonly _fee: bigint;
    private readonly _deadline: number;

    constructor(args: {
        rpc: Connection,
        tx: Transaction,
        fee: bigint,
        senderPublicKey: string,
        deadline: number,
    }) {
        this._rpc = args.rpc;
        this._tx = args.tx;
        this._fee = args.fee;
        this._deadline = args.deadline;

        this.chunks = [
            new Ed25519RequestChunk({
                hash: args.tx.serializeMessage().toString("hex"),
                expectedPublicKey: args.senderPublicKey,
            }),
        ];
    }

    async estimateFee(): Promise<string> {
        return fromBlockchainUnits(this._fee, SOLANA_NATIVE_DECIMALS);
    }

    async send(): Promise<string> {
        const signature = this.chunks[0].signature;

        if( !signature ) {
            throw new UniError("INVALID_ARGUMENT", "Request is not signed");
        }

        if( !this._tx.feePayer ) {
            throw new UniError("INTERNAL_ERROR");   // should never get here
        }

        if( Date.now() > this._deadline ) {
            throw new UniError("OUTDATED_TRANSACTION");
        }

        this._tx.addSignature(
            this._tx.feePayer,
            Buffer.from(signature, "hex")
        );

        // todo: verify

        const retSignature = await this._rpc.sendRawTransaction(this._tx.serialize());
        await this._waitForConfirmation(retSignature);

        return retSignature;
    }

    private async _waitForConfirmation(signature: string) {
        // implement waiting via HTTP as a fallback method
        // because there were cases when RPC websocket node reached its subscription limit and responded with errors
        let status;
        try {
            status = (await this._rpc.confirmTransaction(signature)).value;
        } catch(e) {
            status = await this._waitViaHttp(signature);
        }

        if( !status ) {
            throw new UniError("INTERNAL_ERROR", `Transaction confirmation timed out : ${signature}`);
        }

        if( status.err ) {
            throw new UniError(
                "INTERNAL_ERROR",
                `Transaction failed : ${signature} : ${JSON.stringify(status.err)}`
            );
        }
    }

    private async _waitViaHttp(signature: string) {
        const deadline = Date.now() + SOLANA_TX_CONFIRM_TIMEOUT;
        let delay = 1000;

        while( Date.now() < deadline ) {
            await wait(delay);

            const status = await this._rpc.getSignatureStatus(signature);
            if( status.value?.confirmationStatus === "confirmed" ) {
                return status.value;
            }

            delay = Math.min(delay * 2, 10_000);
        }

        return undefined;
    }
}


///////////////////////////////////////////////////////////////////////////////
export function solanaPublicKeyFromHex(src: string): PublicKey {
    return new PublicKey(Buffer.from(src, "hex"));
}

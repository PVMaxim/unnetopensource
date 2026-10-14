import { Address, ProviderRpcClient, Transaction, TransactionId, parseTransaction } from "everscale-inpage-provider";
import { TransactionInfo } from "../common";
import { UniError, UniLowBalanceError } from "../errors";
import * as constants from "./constants";
import { wait } from "../utils";


///////////////////////////////////////////////////////////////////////////////
export abstract class TxCollectorBase {

    protected readonly _rpc: ProviderRpcClient;
    protected readonly _address: Address;
    protected readonly _decimals: number;
    protected readonly _transactions: Map<string, TransactionInfo>;
    protected readonly _txUrlFormatter: (id: string) => string;
    protected _lastTransactionId?: TransactionId;

    constructor(args: {
        rpc: ProviderRpcClient,
        address: Address,
        decimals: number,
        txUrlFormatter: (id: string) => string,
    }) {
        this._rpc = args.rpc;
        this._address = args.address;
        this._decimals = args.decimals;
        this._txUrlFormatter = args.txUrlFormatter;
        this._transactions = new Map();
    }

    async addTransaction(tx: Transaction) {
        const txInfo = await this._parseTransaction(tx);
        if( !!txInfo && !this._transactions.has(tx.id.hash.toString().toLowerCase()) ) {
            this._transactions.set(tx.id.hash.toLowerCase(), txInfo);
        }
    }

    async getTransactions(): Promise<TransactionInfo[]> {
        const rawTransactions = await this._readTransactions({
            rpc: this._rpc,
            address: this._address,
            until: this._lastTransactionId,
        });

        await Promise.all(
            rawTransactions.map(x => this.addTransaction(x))
        );

        if( rawTransactions.length > 0 ) {
            this._lastTransactionId = rawTransactions[0].id;
        }

        return Array.from(this._transactions.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    protected async _readTransactions(args: {
        rpc: ProviderRpcClient,
        address: Address,
        until?: TransactionId,
    }): Promise<Transaction[]> {
        let continuation: TransactionId | undefined = undefined;
        const result: Transaction[] = [];

        do {
            const response = await args.rpc.getTransactions({
                address: args.address,
                limit: constants.TX_COLLECTOR_CHUNK_SIZE,
                continuation,
            });

            for( const transaction of response.transactions ) {
                if( !!args.until && transaction.id.hash == args.until.hash ) {
                    return result;
                }

                result.push(transaction);
            }

            continuation = response.continuation;

        } while( !!continuation );

        return result;
    }

    protected abstract _parseTransaction(tx: Transaction): Promise<TransactionInfo | undefined>;
}


///////////////////////////////////////////////////////////////////////////////
export async function waitForTransactionTree(
    rpc: ProviderRpcClient,
    startTx: Transaction,
): Promise<Transaction[]> {
    const deadline = Date.now() + (constants.TRANSACTION_WAIT_TIMEOUT * 1000);
    const transactions = [startTx];
    let queue = startTx.outMessages.map(x => x.hash);

    while( queue.length > 0 && Date.now() < deadline ) {
        const response = await rpc.rawApi.findTransaction({
            inMessageHash: queue[0],
        }).catch(err => {
            if( err.toString().indexOf("findTransaction: Error: Bad server  answer") >= 0 ) {
                return { transaction: undefined };
            }

            throw err;
        });

        if( response.transaction === undefined ) {
            await wait(constants.TRANSACTION_WAIT_DELAY * 1000);
            continue;
        }

        transactions.push(parseTransaction(response.transaction));
        queue = queue.slice(1).concat(response.transaction.outMessages.map(x => x.hash));
    }

    return transactions;

}


///////////////////////////////////////////////////////////////////////////////
export function checkCardTransaction(tx: Transaction): void {
    if( tx.resultCode === 1030 ) {
        throw new UniLowBalanceError("_");
    }

    if( tx.aborted ) {
        throw new UniError("INTERNAL_ERROR");
    }
}

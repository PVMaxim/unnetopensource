import { Buffer } from "buffer";
import { MessageRelaxed, SendMode, Cell, beginCell, Address, fromNano, StateInit, external, storeMessage, Transaction } from "@ton/core";
import { WalletContractV3R2, OpenedContract, TonClient } from "@ton/ton";
import { CardKeys, Request } from "../common";
import { HttpClient } from "../http-client";
import { Ed25519RequestChunk } from "../request-chunks";
import { assertArgument, UniLowBalanceError, UniError } from "../errors";
import { getEd25519Key, wait } from "../utils";


///////////////////////////////////////////////////////////////////////////////
const TON_WALLET_WORKCHAIN = 0;


///////////////////////////////////////////////////////////////////////////////
export class UniTonCore {

    readonly client: TonClient;
    readonly indexerApi: HttpClient;

    private readonly _txUrlFormatter: (id: string) => string;

    constructor(args: {
        client: TonClient,
        indexerApi: HttpClient,
        txUrlFormatter: (id: string) => string,
    }) {
        this.client = args.client;
        this.indexerApi = args.indexerApi;
        this._txUrlFormatter = args.txUrlFormatter;
    }

    static formatTxHash(hash: Buffer): string {
        return base64ToSafe(hash.toString("base64"));
    }

    static getPublicKey(keys: CardKeys): string {
        return getEd25519Key(keys);
    }

    formatTxUrl(hash: string): string {
        const safeHash = base64ToSafe(hash);
        return this._txUrlFormatter(safeHash);
    }

    getWalletAddress(keys: CardKeys): Address {
        const publicKey = UniTonCore.getPublicKey(keys);
        const wallet = this._getWallet(publicKey);
        return wallet.address;
    }

    async createRequest(args: {
        messages: MessageRelaxed[],
        keys?: CardKeys,
        sendMode?: SendMode | null | undefined,
        timeout?: number | null | undefined,
    }): Promise<Request> {
        const publicKey = UniTonCore.getPublicKey(args.keys ?? {});
        const wallet = this._getWallet(publicKey);
        const contract = this.client.open(wallet);
        const seqno = await contract.getSeqno();

        const cell = await contract.createTransfer({
            seqno,
            messages: args.messages,
            sendMode: args.sendMode,
            timeout: args.timeout,
            signer: async (_: Cell) => Buffer.alloc(0),
        });

        // todo: calculate fees in jetton requests
        const fee = await estimateMessageFee({
            client: this.client,
            contract,
            cell,
        });

        let total = this._calcTotalValue(args.messages) + fee;
        const balance = await contract.getBalance();

        if( total > balance ) {
            throw new UniLowBalanceError("_");
        }

        return new WalletV3R2Request({
            client: this.client,
            contract, 
            cell, 
            publicKey,
            fee,
         });
    }

    private _getWallet(publicKey: string) {
        return WalletContractV3R2.create({
            workchain: TON_WALLET_WORKCHAIN, 
            publicKey: Buffer.from(publicKey, "hex"),
        });
    }

    private _calcTotalValue(messages: MessageRelaxed[]) {
        let total = BigInt(0);
        for( const msg of messages ) {
            if( msg.info.type === "internal" ) {
                total += msg.info.value.coins;
            }
        }

        return total;
    }
}


///////////////////////////////////////////////////////////////////////////////
class WalletV3R2Request implements Request {

    readonly TX_WAIT_POLL_WINDOW_SIZE = 3;
    readonly TX_WAIT_POLL_INTERVAL = 1000;
    readonly TX_WAIT_INITIAL_DELAY = 500;
    readonly TX_WAIT_TIMEOUT = 60 * 1000;

    readonly chunks: Ed25519RequestChunk[];

    private readonly _client: TonClient;
    private readonly _contract: OpenedContract<WalletContractV3R2>;
    private readonly _cell: Cell;
    private readonly _fee: bigint;

    constructor(args: {
        client: TonClient,
        contract: OpenedContract<WalletContractV3R2>,
        cell: Cell,
        publicKey: string,
        fee: bigint,
    }) {
        this._client = args.client;
        this._contract = args.contract;
        this._cell = args.cell;
        this._fee = args.fee;

        this.chunks = [
            new Ed25519RequestChunk({
                hash: this._cell.hash().toString("hex"),
                expectedPublicKey: args.publicKey,
            }),
        ];
    }

    async estimateFee(): Promise<string> {
        return fromNano(this._fee);
    }

    async send(): Promise<string> {
        const signature = this.chunks[0].signature;
        assertArgument(!!signature, "Request is not signed");

        const stateBefore = await this._client.getContractState(this._contract.address);

        const message = buildMessage(this._cell, Buffer.from(signature, "hex"));
        const extMsgHash = (await this._sendExternalMessage(message)).toString("base64");

        const txHash = await this._waitForTransaction(
            stateBefore.lastTransaction?.hash,
            extMsgHash,
        );

        return base64ToSafe(txHash);
    }

    private async _waitForTransaction(
        lastTransactionHash: string | undefined,
        extMessageHash: string,
    ): Promise<string> {
        const deadline = Date.now() + this.TX_WAIT_TIMEOUT;
        await wait(this.TX_WAIT_INITIAL_DELAY);

        while( Date.now() < deadline ) {
            const txList = await this._readTransactionsUntil(lastTransactionHash, deadline);

            for( const tx of txList ) {
                if( lastTransactionHash === tx.hash().toString("base64") ) {
                    break;
                }

                if( !tx.inMessage ) {
                    continue;
                }

                const txInMsgHash = beginCell()
                    .store(storeMessage(tx.inMessage))
                    .endCell()
                    .hash()
                    .toString("base64");

                if( txInMsgHash === extMessageHash ) {
                    return tx.hash().toString("base64");
                }
            }

            if( txList.length > 0 ) {
                lastTransactionHash = txList[0].hash().toString("base64");
            }

            await wait(this.TX_WAIT_POLL_INTERVAL);
        }

        throw new UniError( "INTERNAL_ERROR","Transaction timed out")
    }

    private async _readTransactionsUntil(
        targetTxHash: string | undefined,
        deadline: number,
    ): Promise<Transaction[]> {
        const result: Transaction[] = [];
        let startTxHash: string | undefined = undefined;
        let startTxLt: string | undefined = undefined;

        while( Date.now() < deadline ) {
            // transactions are received in latest-first order
            const txList = await this._client.getTransactions(this._contract.address, {
                limit: this.TX_WAIT_POLL_WINDOW_SIZE,
                hash: startTxHash,
                lt: startTxLt,
                archival: true
            });

            for( const tx of txList ) {
                const txHash = tx.hash().toString("base64");
                if( targetTxHash === txHash ) {
                    return result;
                } else {
                    result.push(tx);
                    startTxHash = txHash;
                    startTxLt = tx.lt.toString();
                }
            }

            if( txList.length < this.TX_WAIT_POLL_WINDOW_SIZE ) {
                break;
            }
        }

        return result;
    }

    private async _sendExternalMessage(message: Cell) {
        let neededInit: StateInit | null = null;
        if( this._contract.init && !await this._client.isContractDeployed(this._contract.address) ) {
            neededInit = this._contract.init;
        }

        const ext = external({
            to: this._contract.address,
            init: neededInit,
            body: message,
        });

        const extCell = beginCell()
            .store(storeMessage(ext))
            .endCell();

        await this._client.sendFile(extCell.toBoc());
        return extCell.hash();
    }
}


///////////////////////////////////////////////////////////////////////////////
export function base64ToSafe(src: string): string {
    return src.replace(/\+/g, '-').replace(/\//g, '_');
}

function buildMessage(cell: Cell, signature: Buffer): Cell {
    return beginCell()
        .storeBuffer(signature)
        .storeSlice(cell.asSlice())
        .endCell();
}

async function estimateMessageFee(args: {
    client: TonClient,
    contract: OpenedContract<WalletContractV3R2>,
    cell: Cell,
}) {
    const fees = await args.client.estimateExternalMessageFee(args.contract.address, {
        body: buildMessage(args.cell, Buffer.alloc(64)),
        initCode: args.contract.init.code,
        initData: args.contract.init.data,
        ignoreSignature: true,
    });

    return BigInt(Math.ceil(
        fees.source_fees.fwd_fee +
        fees.source_fees.gas_fee +
        fees.source_fees.in_fwd_fee +
        fees.source_fees.storage_fee
    ));
}

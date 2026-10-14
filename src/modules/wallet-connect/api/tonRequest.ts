import { Buffer } from "buffer";
import { MessageRelaxed, SendMode, Cell, beginCell, fromNano, StateInit, external, storeMessage, Transaction } from "@ton/core";
import { WalletContractV3R2, OpenedContract, TonClient } from "@ton/ton";
import { CardKeys, Request } from "@/api/common";
import { Ed25519RequestChunk } from "@/api/request-chunks";
import { assertArgument, UniError, UniLowBalanceError } from "@/api/errors";
import { getEd25519Key, wait } from "@/api/utils";
import { base64ToSafe } from "@/api/ton/core";

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
        Number(fees.source_fees.in_fwd_fee + fees.source_fees.storage_fee + fees.source_fees.gas_fee + fees.source_fees.fwd_fee) * 1.1
    ));
}

export class TonWalletConnectRequest implements Request {
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

    static async create(args: {
        client: TonClient,
        messages: MessageRelaxed[],
        keys: CardKeys,
        sendMode?: SendMode | null | undefined,
        timeout?: number | null | undefined,
    }): Promise<TonWalletConnectRequest> {
        const publicKey = getEd25519Key(args.keys);
        const wallet = WalletContractV3R2.create({
            workchain: 0,
            publicKey: Buffer.from(publicKey, "hex"),
        });
        const contract = args.client.open(wallet);
        const seqno = await contract.getSeqno();

        const cell = await contract.createTransfer({
            seqno,
            messages: args.messages,
            sendMode: args.sendMode,
            timeout: args.timeout,
            signer: async (_: Cell) => Buffer.alloc(0),
        });

        const fee = await estimateMessageFee({
            client: args.client,
            contract,
            cell,
        });

        const total = TonWalletConnectRequest._calcTotalValue(args.messages) + fee;
        const balance = await contract.getBalance();

        if (total > balance) {
            throw new UniLowBalanceError("_");
        }

        return new TonWalletConnectRequest({
            client: args.client,
            contract,
            cell,
            publicKey,
            fee,
        });
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

    getSignedBoc(): string {
        const signature = this.chunks[0].signature;
        assertArgument(!!signature, "Request is not signed");
        const message = buildMessage(this._cell, Buffer.from(signature, "hex"));
        return message.toBoc().toString("base64");
    }

    private static _calcTotalValue(messages: MessageRelaxed[]) {
        let total = BigInt(0);
        for (const msg of messages) {
            if (msg.info.type === "internal") {
                total += msg.info.value.coins;
            }
        }
        return total;
    }

    private async _waitForTransaction(
        lastTransactionHash: string | undefined,
        extMessageHash: string,
    ): Promise<string> {
        const deadline = Date.now() + this.TX_WAIT_TIMEOUT;
        await wait(this.TX_WAIT_INITIAL_DELAY);

        while (Date.now() < deadline) {
            const txList = await this._readTransactionsUntil(lastTransactionHash, deadline);

            for (const tx of txList) {
                if (lastTransactionHash === tx.hash().toString("base64")) {
                    break;
                }

                if (!tx.inMessage) {
                    continue;
                }

                const txInMsgHash = beginCell()
                    .store(storeMessage(tx.inMessage))
                    .endCell()
                    .hash()
                    .toString("base64");

                if (txInMsgHash === extMessageHash) {
                    return tx.hash().toString("base64");
                }
            }

            if (txList.length > 0) {
                lastTransactionHash = txList[0].hash().toString("base64");
            }

            await wait(this.TX_WAIT_POLL_INTERVAL);
        }

        throw new UniError("INTERNAL_ERROR", "Transaction timed out")
    }

    private async _readTransactionsUntil(
        targetTxHash: string | undefined,
        deadline: number,
    ): Promise<Transaction[]> {
        const result: Transaction[] = [];
        let startTxHash: string | undefined = undefined;
        let startTxLt: string | undefined = undefined;

        while (Date.now() < deadline) {
            const txList = await this._client.getTransactions(this._contract.address, {
                limit: this.TX_WAIT_POLL_WINDOW_SIZE,
                hash: startTxHash,
                lt: startTxLt,
                archival: true
            });

            for (const tx of txList) {
                const txHash = tx.hash().toString("base64");
                if (targetTxHash === txHash) {
                    return result;
                } else {
                    result.push(tx);
                    startTxHash = txHash;
                    startTxLt = tx.lt.toString();
                }
            }

            if (txList.length < this.TX_WAIT_POLL_WINDOW_SIZE) {
                break;
            }
        }

        return result;
    }

    private async _sendExternalMessage(message: Cell) {
        let neededInit: StateInit | null = null;
        if (this._contract.init && !await this._client.isContractDeployed(this._contract.address)) {
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

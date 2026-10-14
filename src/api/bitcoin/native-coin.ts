import * as bitcoin from "bitcoinjs-lib";
import * as varuint from "varuint-bitcoin";
import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { UniError, UniLowBalanceError, UniAmountTooSmallError } from "../errors";
import { BITCOIN_NATIVE_DECIMALS } from "./constants";
import { PriceProvider } from "../pricing";
import { NativeTokenBase } from "../token-base";
import { MempoolClient, Utxo } from "./mempool";
import { BtcRequest, DummyBtcSigner } from "./request";
import { getSecp256k1Key, toBlockchainUnits, fromBlockchainUnits } from "../utils";
import { SWAP_NATIVE_ADDRESS } from "../constants-types";


///////////////////////////////////////////////////////////////////////////////
const DUST_RELAY_FEE = 3;
const UTXO_MIN_CONFIRMATIONS = 3;
const MIN_FEE_RATE = 1.5;


///////////////////////////////////////////////////////////////////////////////
export class BitcoinNativeCoin extends NativeTokenBase implements Token {

    private readonly _client: MempoolClient;
    private readonly _network: bitcoin.Network;
    private readonly _txUrlFormatter: (id: string) => string;

    constructor(args: {
        apiBaseUrl: string,
        network: bitcoin.Network,
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
        name: string,
        symbol: string,
        ticker?: string,
    }) {
        super({
            ...args,
            decimals: BITCOIN_NATIVE_DECIMALS,
        });

        this._client = new MempoolClient(args.apiBaseUrl);
        this._txUrlFormatter = args.txUrlFormatter;
        this._network = args.network;
    }

    async getBalance(owner: string): Promise<string> {
        if( !this.isValidAddress(owner) ) {
            return "0";
        }

        const utxo = await this._client.getUtxo(owner);
        const balance = utxo.reduce((acc, x) => acc + x.value, BigInt(0));

        return fromBlockchainUnits(balance, BITCOIN_NATIVE_DECIMALS);
    }

    async getAvailableBalance(owner: string): Promise<string> {
        if( !this.isValidAddress(owner) ) {
            return "0";
        }

        const utxo = await this._getConfirmedUtxo(owner);
        const balance = utxo.reduce((acc, x) => acc + x.value, BigInt(0));

        return fromBlockchainUnits(balance, BITCOIN_NATIVE_DECIMALS);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !this.isValidAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const now = ~~(Date.now() / 1000);
        const offset = args.offset ?? 0;
        const allItems = await this._client.getTransactions(args.owner);
        allItems.sort((a, b) => (b.status.block_time ?? now) - (a.status.block_time ?? now));

        if( !allItems.length ) {
            return { total: 0, items: [] };
        }

        const latestBlock = await this._client.getLatestBlock();
        const maxBlockHeight = latestBlock.height - UTXO_MIN_CONFIRMATIONS + 1;

        const items: TransactionInfo[] = allItems
            .slice(offset, offset + args.limit)
            .map(tx => {
                const amountOut = tx.vin
                    .filter(x => !!x.prevout && x.prevout.scriptpubkey_address === args.owner)
                    .reduce((acc, x) => acc + (x.prevout?.value ?? BigInt(0)), BigInt(0));

                const amountIn = tx.vout
                    .filter(x => x.scriptpubkey_address === args.owner)
                    .reduce((acc, x) => acc + x.value, BigInt(0));

                return {
                    id: tx.txid,
                    direction: amountIn > amountOut ? "in" : "out",
                    success: true,
                    confirmed: tx.status.confirmed &&
                               !!tx.status.block_height &&
                               tx.status.block_height <= maxBlockHeight,
                    amount: fromBlockchainUnits(
                        amountIn > amountOut ? (amountIn - amountOut) : (amountOut - amountIn),
                        BITCOIN_NATIVE_DECIMALS
                    ),
                    timestamp: tx.status.block_time ?? now,
                    scannerUrl: this._txUrlFormatter(tx.txid),
                };
            });

        return { total: allItems.length, items };
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        memo?: string,
        keys?: CardKeys,
    }): Promise<Request> {
        if( !this.isValidAddress(args.recipient) ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid address : ${args.recipient}`);
        }

        const amount = toBlockchainUnits(args.amount, BITCOIN_NATIVE_DECIMALS);
        const minAmount = this._getDustThreshold(args.recipient);
        if( amount < minAmount ) {
            throw new UniAmountTooSmallError(fromBlockchainUnits(minAmount, BITCOIN_NATIVE_DECIMALS));
        }

        const sender = this.getAccountAddress(args.keys);
        if( args.recipient === sender ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const allUtxo = await this._getConfirmedUtxo(sender);
        const feeRate = await this._getRecommendedFee();

        const selected = this._selectUtxoForTx({
            sender,
            senderPublicKey: getSecp256k1Key(args.keys),
            recipient: args.recipient,
            memo: args.memo,
            amount,
            allUtxo,
            feeRate,
        });

        const psbt = await this._createPsbt({
            sender,
            recipient: args.recipient,
            memo: args.memo,
            amount,
            fee: selected.fee,
            utxo: selected.utxo,
        });

        return new BtcRequest({
            client: this._client,
            psbt,
            publicKey: getSecp256k1Key(args.keys),
        });
    }

    async swap (args: {
        toAddress: string,
        fromAmount: number | string,
        memo: string,
        txData?: string,
        keys?: CardKeys,
    }): Promise<Request> {
        if(args.txData) {
            const psbt = bitcoin.Psbt.fromHex(args.txData, { network: this._network });
            return new BtcRequest({
                client: this._client,
                psbt,
                publicKey: getSecp256k1Key(args.keys),
            });
        }

        return this.transfer({
            recipient: args.toAddress,
            amount: args.fromAmount,
            memo: args.memo,
            keys: args.keys,
        });
    }

    getAccountAddress(keys?: CardKeys): string {
        const pubkey = Buffer.from(getSecp256k1Key(keys), "hex");
        const { address } = bitcoin.payments.p2wpkh({ pubkey, network: this._network });

        if( !address ) {
            throw new UniError("INTERNAL_ERROR", "Failed to generate address");
        }

        return address;
    }

    isValidAddress(address: string): boolean {
        try {
            const script = bitcoin.address.toOutputScript(address, this._network);
            return script.length > 0;
        } catch(err) {
            return false;
        }
    }

    private async _getRecommendedFee(): Promise<number> {
        const fee = (await this._client.getRecommendedFees()).fastestFee;
        return Math.max(fee, MIN_FEE_RATE);
    }

    private async _getConfirmedUtxo(address: string) {
        const utxo = await this._client.getUtxo(address);
        const latestBlock = await this._client.getLatestBlock();
        const maxBlockHeight = latestBlock.height - UTXO_MIN_CONFIRMATIONS + 1;

        return utxo.filter(
            x => x.status.confirmed &&
                 !!x.status.block_height &&
                 x.status.block_height <= maxBlockHeight
        );
    }

    private async _createPsbt(args: {
        sender: string,
        recipient: string,
        amount: bigint,
        fee: {
            withChange: bigint,
            noChange: bigint,
        },
        utxo: Utxo[],
        memo?: string,
    }) {
        const psbt = new bitcoin.Psbt({ network: this._network });
        let totalInput = BigInt(0);

        for( const item of args.utxo ) {
            const tx = await this._client.getTransaction(item.txid);
            if( item.vout >= tx.vout.length ) {
                throw new UniError("INTERNAL_ERROR", "Invalid UTXO");
            }

            const itemTxOutput = tx.vout[item.vout];
            if( itemTxOutput.value !== item.value ) {
                throw new UniError("INTERNAL_ERROR", "Invalid UTXO");
            }

            totalInput += item.value;

            psbt.addInput({
                hash: item.txid,
                index: item.vout,
                witnessUtxo: {
                    script: Buffer.from(itemTxOutput.scriptpubkey, "hex"),
                    value: bigIntToNumber(itemTxOutput.value),
                },
            });
        }

        psbt.addOutput({
            address: args.recipient,
            value: bigIntToNumber(args.amount),
        });

        if( args.memo ) {
            const data = Buffer.from(args.memo, "utf8");
            const embed = bitcoin.payments.embed({ data: [data] });

            psbt.addOutput({
                script: embed.output!,
                value: 0,
            });
        }

        const change = totalInput - args.amount - args.fee.withChange;
        if( change > this._getDustThreshold(args.sender) ) {
            psbt.addOutput({
                address: args.sender,
                value: bigIntToNumber(change),
            });
        } else if( (totalInput - args.amount) < args.fee.noChange ) {
            throw new UniError("INTERNAL_ERROR", "Transaction outputs exceed inputs");
        }

        return psbt;
    }

    private _selectUtxoForTx(args: {
        sender: string,
        senderPublicKey: string,
        recipient: string,
        allUtxo: Utxo[],
        feeRate: number,
        amount:  bigint,
        memo?: string,
    }): {
        utxo: Utxo[],
        fee: {
            withChange: bigint,
            noChange: bigint,
        },
    } {
        const selectedUtxo: Utxo[] = [];
        let total = BigInt(0);

        const orderedUtxo = Array.from(args.allUtxo).sort(
            (a, b) => {
                const diff = b.value - a.value;
                if( !diff ) {
                    return 0;
                }

                return diff > BigInt(0) ? 1 : -1;
            }
        );

        for( const item of orderedUtxo ) {
            selectedUtxo.push(item);
            total += item.value;

            if( total > args.amount ) {
                const { vSizeNoChange, vSizeWithChange } = estimateTxVSize({
                    network: this._network,
                    sender: args.sender,
                    recipient: args.recipient,
                    senderPublicKey: args.senderPublicKey,
                    amount: args.amount,
                    utxo: selectedUtxo,
                    memo: args.memo,
                });

                const feeWithChange = BigInt(Math.ceil(vSizeWithChange * args.feeRate));
                const feeNoChange = BigInt(Math.ceil(vSizeNoChange * args.feeRate));

                if( total >= (args.amount + feeNoChange) ) {
                    return {
                        utxo: selectedUtxo,
                        fee: {
                            withChange: feeWithChange,
                            noChange: feeNoChange,
                        },
                    };
                }
            }
        }

        throw new UniLowBalanceError(this.id);
    }

    private _getDustThreshold(address: string): bigint {
        return getDustThreshold(address, this._network);
    }

    getAddress(): string {
        return SWAP_NATIVE_ADDRESS;
    }
}


///////////////////////////////////////////////////////////////////////////////
function isPaymentMethod(
    payment: (x: bitcoin.Payment) => bitcoin.Payment,
    script: Buffer
): boolean {
    try {
        payment({ output: script });
        return true;
    } catch(err) {
        return false;
    }
}

function getDustThreshold(address: string, network: bitcoin.Network): bigint {
    // see GetDustThreshold() in Bitcoin Core

    const script = bitcoin.address.toOutputScript(address, network);
    let size = 8 + varuint.encodingLength(script.length) + script.length;

    if( isPaymentMethod(bitcoin.payments.p2wpkh, script) ||
        isPaymentMethod(bitcoin.payments.p2tr, script)
    ) {
        size += (32 + 4 + 1 + Math.ceil(107 / 4) + 4);
    } else {
        size += (32 + 4 + 1 + 107 + 4);
    }

    return BigInt(size * DUST_RELAY_FEE);
}


///////////////////////////////////////////////////////////////////////////////
function estimateTxVSize(args: {
    network: bitcoin.Network,
    sender: string,
    senderPublicKey: string,
    recipient: string,
    amount: bigint,
    utxo: Utxo[],
    memo?: string,
}): {
    vSizeNoChange: number,
    vSizeWithChange: number,
} {
    const psbt = new bitcoin.Psbt({ network: args.network });
    const senderScript = bitcoin.address.toOutputScript(args.sender, args.network);

    for( const item of args.utxo ) {
        psbt.addInput({
            hash: item.txid,
            index: item.vout,
            witnessUtxo: {
                script: senderScript,
                value: bigIntToNumber(item.value),
            },
        });
    }

    psbt.addOutput({
        address: args.recipient,
        value: bigIntToNumber(args.amount),
    });

    if( args.memo ) {
        const data = Buffer.from(args.memo, "utf8");
        const embed = bitcoin.payments.embed({ data: [data] });

        psbt.addOutput({
            script: embed.output!,
            value: 0,
        });
    }

    const signer = new DummyBtcSigner(args.senderPublicKey);
    psbt.signAllInputs(signer);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    const vSizeNoChange = tx.virtualSize();

    // virtual size if some amount is returned to sender
    const vSizeWithChange = vSizeNoChange + 8 + varuint.encodingLength(senderScript.length) + senderScript.length;

    return { vSizeNoChange, vSizeWithChange };
}


///////////////////////////////////////////////////////////////////////////////
function bigIntToNumber(value: bigint): number {
    if( value > Number.MAX_SAFE_INTEGER ) {
        throw new UniError("INVALID_ARGUMENT", "Value is greater than MAX_SAFE_INTEGER");
    }

    return Number(value);
}

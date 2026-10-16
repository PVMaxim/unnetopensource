import { ethers } from "@coti-io/coti-ethers";
import { CmdSignSecp256k1 } from "../card-io";
import { UniError, assert } from "../errors";
import { CardErrorCode, CardKeys, RequestChunk } from "../common";
import { BatchSecp256k1RequestChunk } from "../request-chunks";
import { convertSignatureForEvm } from "../evm/request";
import { getSecp256k1Key } from "../utils";

export class CotiArgSignChunk extends BatchSecp256k1RequestChunk {
    processCardResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        keys: CardKeys,
        pinRemaining: number,
    } {
        const result = super.processCardResponse(rawData);

        if( this._signatures ) {
            assert(this._signatures.length === this.hashes.length);
            assert(result.keys.secp256k1);

            for( let i = 0; i < this._signatures.length; i++ ) {
                this._signatures[i] = this._convertSignature({
                    dataHash: this.hashes[i],
                    publicKey: result.keys.secp256k1,
                    signature: this._signatures[i],
                });
            }
        }

        return result;
    }

    protected _convertSignature(args: {
        dataHash: string,
        publicKey: string,
        signature: string
    }): string {
        const evmSignature = Buffer.from(convertSignatureForEvm(args), "hex");

        return Buffer.concat([
            evmSignature.subarray(0, 64),
            Buffer.from([
                evmSignature[64] - 27,
            ]),
        ]).toString("hex");
    }
}

export class CotiLazyTxChunk implements RequestChunk {

    private readonly _command: CmdSignSecp256k1;
    private readonly _txFactory: () => Promise<ethers.Transaction>;
    private readonly _expectedPublicKey: string;
    private _tx?: ethers.Transaction;
    private _txHash?: string;

    constructor(args: {
        txFactory: () => Promise<ethers.Transaction>,
        expectedPublicKey: string;
    }) {
        this._command = new CmdSignSecp256k1();
        this._txFactory = args.txFactory;
        this._expectedPublicKey = args.expectedPublicKey;
    }

    isSigned(): boolean {
        return !!this._tx?.isSigned();
    }

    getExpectedResponseSize(): number {
        return this._command.getExpectedResponseSize();
    }

    getSignedTransaction(): ethers.Transaction {
        if( !this.isSigned() ) {
            throw new UniError("NOT_SIGNED");
        }

        return this._tx!;
    }

    async buildCardRequest(args: {
        pin: string,
    }): Promise<Uint8Array> {
        this._tx = await this._txFactory();
        this._txHash = this._tx.unsignedHash.slice(2);

        return this._command.buildRequest({
            dataHash: this._txHash,
            pin: args.pin,
        });
    }

    processCardResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        keys: CardKeys,
        pinRemaining: number,
    } {
        assert(this._tx && !this._tx.isSigned());
        assert(this._txHash);

        const { errorCode, keys, signature, pinRemaining } = this._command.parseResponse(rawData);

        if( errorCode === CardErrorCode.Success ) {
            const publicKey = getSecp256k1Key(keys);

            if( publicKey.toLowerCase() !== this._expectedPublicKey.toLowerCase() ) {
                throw new UniError("PUBLIC_KEY_MISMATCH");
            }

            const evmSignature = convertSignatureForEvm({
                dataHash: this._txHash!,
                publicKey,
                signature,
            });

            this._tx.signature = `0x${evmSignature}`;
        }

        return { errorCode, keys, pinRemaining };
    }
}

export async function buildTransaction(args: {
    provider: ethers.Provider,
    walletAddress: string,
    tx: ethers.TransactionRequest,
}): Promise<ethers.Transaction> {
    const voidSigner = new ethers.VoidSigner(args.walletAddress, args.provider);

    const populated = await voidSigner.populateTransaction(args.tx);
    delete populated.from;

    return ethers.Transaction.from(populated);
}

export function arrayPopFrontN<T>(src: T[], n: number): T[] {
    const result = src.slice(0, n);
    src.splice(0, n);
    return result;
}

export function splitIntoChunks<R, T extends ArrayLike<R> & { slice: (start: number, end: number) => T }>(
    src: T,
    size: number
): T[] {
    const result: T[] = [];
    for( let i = 0; i < src.length; i += size ) {
        result.push(src.slice(i, size));
    }

    return result;
}

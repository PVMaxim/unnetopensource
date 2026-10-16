import * as bitcoin from "bitcoinjs-lib";
import { secp256k1 } from "@noble/curves/secp256k1";
import { Buffer } from "buffer";
import { Request } from "../common";
import { UniError } from "../errors";
import { BatchSecp256k1RequestChunk } from "../request-chunks";
import { fromBlockchainUnits } from "../utils";
import { BITCOIN_NATIVE_DECIMALS } from "./constants";
import { MempoolClient } from "./mempool";

export class BtcRequest implements Request {

    readonly chunks: BatchSecp256k1RequestChunk[];
    private readonly _client: MempoolClient;
    private readonly _psbt: bitcoin.Psbt;
    private readonly _publicKey: string;
    private readonly _fee: bigint;

    constructor(args: {
        client: MempoolClient,
        psbt: bitcoin.Psbt,
        publicKey: string,
    }) {
        this._client = args.client;
        this._psbt = args.psbt;
        this._publicKey = args.publicKey;

        const signer = new DummyBtcSigner(args.publicKey);
        const psbtClone = args.psbt.clone();
        psbtClone.signAllInputs(signer);
        psbtClone.finalizeAllInputs();

        const maxChunkSize = BatchSecp256k1RequestChunk.getMaxChunkSize();
        let startHashPos = 0;
        this.chunks = [];

        while( startHashPos < signer.hashes.length ) {
            this.chunks.push(new BatchSecp256k1RequestChunk({
                hashes: signer.hashes.slice(startHashPos, startHashPos + maxChunkSize),
                expectedPublicKey: args.publicKey,
            }));

            startHashPos += maxChunkSize;
        }

        this._fee = BigInt(psbtClone.getFee());
    }

    async estimateFee(): Promise<string> {
        return fromBlockchainUnits(this._fee, BITCOIN_NATIVE_DECIMALS);
    }

    async send(): Promise<string> {
        const signer = new StoredBtcSigner(this._publicKey);
        for( const chunk of this.chunks ) {
            if( !chunk.signatures ) {
                throw new UniError("NOT_SIGNED", "Request not signed");
            }

            for( let i = 0; i < chunk.hashes.length; i++ ) {
                signer.addSignature(chunk.hashes[i], chunk.signatures[i]);
            }
        }

        const psbt = this._psbt.clone();
        psbt.signAllInputs(signer);

        let valid;
        try {
            valid = psbt.validateSignaturesOfAllInputs((pk: Uint8Array, h: Uint8Array, sig: Uint8Array) => {
                return secp256k1.verify(sig, h, pk);
            });
        } catch(_e) {
            valid = false;
        }

        if( !valid ) {
            throw new UniError("INTERNAL_ERROR", "Signature validation failed");
        }

        psbt.finalizeAllInputs();

        const tx = psbt.extractTransaction();
        await this._client.sendTransaction(tx.toHex());

        return tx.getId();
    }
}

export class DummyBtcSigner implements bitcoin.Signer {

    readonly publicKey: Buffer;
    readonly hashes: string[];

    constructor(publicKey: string) {
        this.publicKey = Buffer.from(publicKey, "hex");
        this.hashes = [];
    }

    sign(hash: Buffer, _lowR?: boolean): Buffer {
        this.hashes.push(hash.toString("hex"));

        return Buffer.alloc(64, 0x01);
    }
}

class StoredBtcSigner implements bitcoin.Signer {

    readonly publicKey: Buffer;
    readonly signatures: Map<string, Buffer>;

    constructor(publicKey: string) {
        this.publicKey = Buffer.from(publicKey, "hex");
        this.signatures = new Map();
    }

    addSignature(hash: string, signature: string) {
        const normSignature = secp256k1.Signature.fromCompact(signature).normalizeS();
        this.signatures.set(hash.toLowerCase(), Buffer.from(normSignature.toCompactRawBytes()));
    }

    sign(hash: Buffer, _lowR?: boolean): Buffer {

        const key = hash.toString("hex").toLowerCase();
        const signature = this.signatures.get(key);

        if( !signature ) {
            throw new UniError("INTERNAL_ERROR", `Signature not found : hash=${key}`);
        }

        return signature;
    }
}

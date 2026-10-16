import { Buffer } from "buffer";
import { UniError } from "../errors";
import { Keystore, Signer } from "everscale-standalone-client";

export class CustomKeyStore implements Keystore {
    private readonly _signers: Map<string, Signer>;

    constructor() {
        this._signers = new Map();
    }

    addSigner(signer: Signer) {
        if( this._signers.has(signer.publicKey) ) {
            throw new UniError("INTERNAL_ERROR", "Signer already exists");
        }

        this._signers.set(signer.publicKey, signer);
    }

    removeSigner(id: string) {
        this._signers.delete(id);
    }

    async getSigner(id: string): Promise<Signer | undefined> {
        return this._signers.get(id);
    }
}

export class DummySIDSigner implements Signer {
    lastSignatureId?: number;

    constructor(readonly publicKey: string) {}

    async sign(_rawData: string, signatureId?: number): Promise<string> {
        this.lastSignatureId = signatureId;
        return Buffer.alloc(64).toString("base64");
    }
}

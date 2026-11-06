import { CardErrorCode, CardKeys, RequestChunk } from "./common";
import { CmdSignSecp256k1, CmdSignEd25519, CmdBatchSignSecp256k1 } from "./card-io";
import { UniError } from "./errors";
import { getEd25519Key, getSecp256k1Key } from "./utils";
import { prepareCardSignIsolated, processCardResponseIsolated } from "./hardware-bridge";

abstract class BasicRequestChunkBase implements RequestChunk {

    readonly command: CmdSignSecp256k1 | CmdSignEd25519;
    readonly hash: string;
    readonly expectedPublicKey?: string;
    protected abstract readonly curve: 'secp256k1' | 'ed25519';
    private _sessionId?: string;
    private _publicKey?: string;
    private _signature?: string;

    protected constructor(args: {
        command: CmdSignSecp256k1 | CmdSignEd25519,
        hash: string,
        expectedPublicKey?: string,
    }) {
        this.command = args.command;
        this.hash = args.hash;
        this.expectedPublicKey = args.expectedPublicKey;
    }

    get publicKey(): string | undefined {
        return this._publicKey;
    }

    get signature(): string | undefined {
        return this._signature;
    }

    isSigned(): boolean {
        return !!this._signature;
    }

    getExpectedResponseSize(): number {
        return this.command.getExpectedResponseSize();
    }

    async buildCardRequest(args: {
        pin: string,
    }): Promise<Uint8Array> {
        try {
            const plan = await prepareCardSignIsolated({
                curve: this.curve,
                dataHash: this.hash,
                expectedPublicKey: this.expectedPublicKey,
                pin: args.pin,
            });
            this._sessionId = plan.sessionId;
            return plan.apduBytes;
        } catch {
            return this.command.buildRequest({
                dataHash: this.hash,
                pin: args.pin,
            });
        }
    }

    processCardResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        keys: CardKeys,
        pinRemaining: number,
    } {
        const rawBuffer = rawData instanceof Uint8Array ? rawData : new Uint8Array(rawData);

        // Hardware Bridge reconciliation if active session exists
        if (this._sessionId) {
            processCardResponseIsolated(this._sessionId, rawBuffer, {
                curve: this.curve,
                dataHash: this.hash,
                expectedPublicKey: this.expectedPublicKey,
                pin: '',
            }).catch(() => {
            });
        }

        const { errorCode, keys, signature, pinRemaining } = this.command.parseResponse(rawBuffer);

        if (errorCode === CardErrorCode.Success) {
            const publicKey = this.getPublicKey(keys);

            if (!!this.expectedPublicKey &&
                publicKey.toLowerCase() !== this.expectedPublicKey?.toLowerCase()
            ) {
                throw new UniError("PUBLIC_KEY_MISMATCH");
            }

            this._publicKey = publicKey;
            this._signature = this.convertSignature(publicKey, signature);
        }

        return { errorCode, keys, pinRemaining };
    }

    protected abstract getPublicKey(keys: CardKeys): string;

    protected convertSignature(_publicKey: string, signature: string): string {
        return signature;
    }
}

export class Secp256k1RequestChunk extends BasicRequestChunkBase {
    protected readonly curve = 'secp256k1' as const;

    constructor(args: {
        hash: string,
        expectedPublicKey?: string,
    }) {
        super({
            command: new CmdSignSecp256k1(),
            ...args,
        });
    }

    protected getPublicKey(keys: CardKeys): string {
        return getSecp256k1Key(keys);
    }
}

export class Ed25519RequestChunk extends BasicRequestChunkBase {
    protected readonly curve = 'ed25519' as const;

    constructor(args: {
        hash: string,
        expectedPublicKey?: string,
    }) {
        super({
            command: new CmdSignEd25519(),
            ...args,
        });
    }

    protected getPublicKey(keys: CardKeys): string {
        return getEd25519Key(keys);
    }
}

export class BatchSecp256k1RequestChunk implements RequestChunk {

    readonly hashes: string[];
    protected readonly _command: CmdBatchSignSecp256k1;
    protected readonly _expectedPublicKey?: string;
    protected _publicKey?: string;
    protected _signatures?: string[];

    constructor(args: {
        hashes: string[],
        expectedPublicKey?: string,
    }) {
        this.hashes = args.hashes;
        this._expectedPublicKey = args.expectedPublicKey;
        this._command = new CmdBatchSignSecp256k1();
    }

    static getMaxChunkSize(): number {
        return CmdBatchSignSecp256k1.MAX_NUM_HASHES;
    }

    get publicKey(): string | undefined {
        return this._publicKey;
    }

    get signatures(): string[] | undefined {
        return !!this._signatures ? Array.from(this._signatures) : undefined;
    }

    isSigned(): boolean {
        return !!this._signatures;
    }

    getExpectedResponseSize(): number {
        return this._command.getExpectedResponseSize(this.hashes.length);
    }

    buildCardRequest(args: {
        pin: string,
    }): Promise<Uint8Array> {
        return this._command.buildRequest({
            hashes: this.hashes,
            pin: args.pin,
        });
    }

    processCardResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        keys: CardKeys,
        pinRemaining: number,
    } {
        const { errorCode, keys, signatures, pinRemaining } = this._command.parseResponse(rawData);

        if (errorCode === CardErrorCode.Success) {
            const publicKey = getSecp256k1Key(keys);

            if (!!this._expectedPublicKey &&
                publicKey.toLowerCase() !== this._expectedPublicKey?.toLowerCase()
            ) {
                throw new UniError("PUBLIC_KEY_MISMATCH");
            }

            if (signatures.length !== this.hashes.length) {
                throw new UniError("INVALID_CARD_RESPONSE");
            }

            this._publicKey = publicKey;
            this._signatures = signatures;
        }

        return { errorCode, keys, pinRemaining };
    }
}

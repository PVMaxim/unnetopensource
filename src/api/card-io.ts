import { Buffer } from "buffer";
import { p256 } from "@noble/curves/p256";
import { CardErrorCode, CardKeys } from "./common";
import { UniError, assertArgument } from "./errors";
import { parseHex } from "./utils";
const { subtle } = globalThis.crypto;

enum KeyType {
    ioPublicKey = 0,
    secp256k1 = 1,
    ed25519 = 2,
}

enum CardInfoFlags {
    isNewCard = 1,
}

const CARD_MAGIC = [0xC2, 0xF5, 0x0F, 0x01];
const MIN_ERROR_CODE = 0;
const MAX_ERROR_CODE = 2;

export class CmdGetInfo {

    static getExpectedResponseSize(): number {
        return 4 + 1 + 4 + 1 + 1 + 33 * 3;
    }

    static async buildRequest(): Promise<Uint8Array> {
        return Buffer.from([0x01]);
    }

    static parseResponse(rawData: Uint8Array | ArrayBuffer): {
        version: string,
        keys: CardKeys,
        isNewCard: boolean,
    } {
        const reader = new BufferReader(rawData);

        verifyMagic(reader.read(4));
        const error = reader.read(1)[0];
        const version = reader.read(4).toString("hex");
        const flags = reader.read(1)[0];
        const keys = readPublicKeys(reader);
        reader.failIfNonEmpty();

        assertCardResponse(error === CardErrorCode.Success);

        return {
            version, 
            keys, 
            isNewCard: (flags & CardInfoFlags.isNewCard) !== 0,
        };
    }
}

class CmdSignBase {

    getExpectedResponseSize(): number {
        return 4 + 1 + 33 + 64 + 1;
    }

    protected async _doBuildRequest(args: {
        opCode: number,
        data: Uint8Array,
        pin: string,
    }): Promise<Uint8Array> {
        const signedPin = await signPin(args.pin);

        let lengthBuf: Buffer;
        if( args.data.length > 0 && args.data.length < 256 ) {
            lengthBuf = Buffer.from([args.data.length]);
        } else {
            lengthBuf = Buffer.alloc(3);
            lengthBuf.writeUint16BE(args.data.length, 1);
        }

        return Buffer.concat([
            Buffer.from([args.opCode]),
            Buffer.from(signedPin.publicKey),
            Buffer.from(signedPin.signature),
            lengthBuf,
            Buffer.from(args.data),
        ]);
    }

    protected _doParseResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        publicKey: {
            type: number,
            data: Buffer,
        },
        signature: Buffer,
        pinRemaining: number,
    } {
        const reader = new BufferReader(rawData);

        verifyMagic(reader.read(4));
        const errorCode = reader.read(1)[0];
        const publicKey = parsePublicKey(reader.read(33));
        const signature = reader.read(64);
        const pinRemaining = reader.read(1)[0];
        reader.failIfNonEmpty();

        assertCardResponse(errorCode >= MIN_ERROR_CODE && errorCode <= MAX_ERROR_CODE);

        return { errorCode, publicKey, signature, pinRemaining };
    }
}

export class CmdSignSecp256k1 extends CmdSignBase {

    async buildRequest(args: {
        dataHash: string,
        pin: string,
    }): Promise<Uint8Array> {
        return this._doBuildRequest({
            opCode: 0x02,
            data: parseHex(args.dataHash, 32),
            pin: args.pin,
        });
    }

    parseResponse(rawData: Uint8Array | ArrayBuffer): { 
        errorCode: CardErrorCode,
        keys: CardKeys,
        signature: string,
        pinRemaining: number
    } {
        const response = this._doParseResponse(rawData);

        if( response.errorCode !== 0 ) {
            return {
                errorCode: response.errorCode,
                keys: {},
                signature: Buffer.alloc(64).toString("hex"),
                pinRemaining: response.pinRemaining,
            };
        }

        if( response.publicKey.type !== KeyType.secp256k1 ) {
            throw new UniError("INVALID_CARD_RESPONSE");
        }

        return {
            errorCode: response.errorCode,
            keys: {
                secp256k1: response.publicKey.data.toString("hex"),
            },
            signature: response.signature.toString("hex"),
            pinRemaining: response.pinRemaining,
        };
    }
}

export class CmdSignEd25519 extends CmdSignBase {

    async buildRequest(args: {
        dataHash: string,
        pin: string,
    }): Promise<Uint8Array> {
        return this._doBuildRequest({ 
            opCode: 0x03,
            data: Buffer.from(args.dataHash, "hex"),
            pin: args.pin,
        });
    }

    parseResponse(rawData: Uint8Array | ArrayBuffer): { 
        errorCode: CardErrorCode,
        keys: CardKeys,
        signature: string,
        pinRemaining: number
    } {
        const response = this._doParseResponse(rawData);

        if( response.errorCode !== 0 ) {
            return {
                errorCode: response.errorCode,
                keys: {},
                signature: Buffer.alloc(64).toString("hex"),
                pinRemaining: response.pinRemaining,
            };
        }

        if( response.publicKey.type !== KeyType.ed25519 ) {
            throw new UniError("INVALID_CARD_RESPONSE");
        }

        return {
            errorCode: response.errorCode,
            keys: {
                ed25519: response.publicKey.data.toString("hex"),
            },
            signature: response.signature.toString("hex"),
            pinRemaining: response.pinRemaining,
        };
    }
}

export class CmdBatchSignSecp256k1 {

    static readonly MAX_NUM_HASHES: number = 3;

    getExpectedResponseSize(numHashes: number): number {
        return 4 + 1 + 33 + 1 + 1 + numHashes * 64;
    }

    async buildRequest(args: {
        hashes: string[],
        pin: string,
    }): Promise<Uint8Array> {
        assertArgument(args.hashes.length > 0, "No hashes");
        assertArgument(args.hashes.length <= CmdBatchSignSecp256k1.MAX_NUM_HASHES, "Too many hashes");
        return this._doBuildRequest(args);
    }

    protected async _doBuildRequest(args: {
        hashes: string[],
        pin: string,
    }): Promise<Uint8Array> {
        const signedPin = await signPin(args.pin);
        return Buffer.concat([
            Buffer.from([0x06]),
            Buffer.from(signedPin.publicKey),
            Buffer.from(signedPin.signature),
            Buffer.from([args.hashes.length]),
            ...args.hashes.map(x => parseHex(x, 32)),
        ]);
    }

    parseResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        keys: CardKeys,
        signatures: string[],
        pinRemaining: number,
    } {
        const reader = new BufferReader(rawData);

        verifyMagic(reader.read(4));
        const errorCode = reader.read(1)[0];
        const publicKey = parsePublicKey(reader.read(33));

        assertCardResponse(errorCode >= MIN_ERROR_CODE && errorCode <= MAX_ERROR_CODE);

        let pinRemaining: number;
        let signatures: Buffer[] = [];

        if( errorCode !== 0 && rawData.byteLength === 103 ) {
            reader.read(64);
            pinRemaining = reader.read(1)[0];
        } else {
            pinRemaining = reader.read(1)[0];

            const numSignatures = reader.read(1)[0];
            for( let i = 0; i < numSignatures; i++ ) {
                signatures.push(reader.read(64));
            }
        }

        reader.failIfNonEmpty();

        if( errorCode !== 0 ) {
            return {
                errorCode,
                keys: {},
                signatures: [],
                pinRemaining,
            };
        }

        assertCardResponse(publicKey.type === KeyType.secp256k1);

        return {
            errorCode,
            keys: {
                secp256k1: publicKey.data.toString("hex"),
            },
            signatures: signatures.map(x => x.toString("hex")),
            pinRemaining,
        };
    }
}

export class CmdSetPin {

    static getExpectedResponseSize(): number {
        return 4 + 1 + 1;
    }

    static async buildRequest(args: {
        keys: CardKeys,
        oldPin: string,
        newPin: string,
    }): Promise<Uint8Array> {
        if( !args.keys.ioPublicKey ) {
            throw new UniError("INVALID_ARGUMENT", "No ioPublicKey");
        }

        const cardIOPublicKey = parseHex(args.keys.ioPublicKey, 33);
        const oldPinHash = await computePinHash(args.oldPin);
        const newPinHash = await computePinHash(args.newPin);

        const { encryptedData, clientPublicKey } = await encrypt({ 
            cardIOPublicKey, 
            data: Buffer.concat([
                oldPinHash,
                newPinHash,
            ]),
        });

        return Buffer.concat([
            Buffer.from([0x04]),
            clientPublicKey,
            encryptedData,
        ]);
    }

    static parseResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        pinRemaining: number,
    } {
        const reader = new BufferReader(rawData);

        verifyMagic(reader.read(4));
        const errorCode = reader.read(1)[0];
        const pinRemaining = reader.read(1)[0];
        reader.failIfNonEmpty();

        assertCardResponse(errorCode >= MIN_ERROR_CODE && errorCode <= MAX_ERROR_CODE);

        return { errorCode, pinRemaining };
    }
}

export class CmdInit {

    static getExpectedResponseSize(): number {
        return 4 + 1 + 1 + 33 * 3;
    }

    static async buildRequest(args: {
        seed: string,
        keys: CardKeys,
        pin: string,
    }): Promise<Uint8Array> {
        if( !args.keys.ioPublicKey ) {
            throw new UniError("INVALID_ARGUMENT", "No ioPublicKey");
        }

        const seed = parseHex(args.seed, 32);
        const cardIOPublicKey = parseHex(args.keys.ioPublicKey, 33);
        const pinHash = await computePinHash(args.pin);

        const { encryptedData, clientPublicKey } = await encrypt({ 
            cardIOPublicKey, 
            data: Buffer.concat([
                seed,
                pinHash,
            ]),
        });

        return Buffer.concat([
            Buffer.from([0x05]),
            clientPublicKey,
            encryptedData,
        ]);
    }

    static parseResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        keys: CardKeys,
    } {
        const reader = new BufferReader(rawData);

        verifyMagic(reader.read(4));
        const errorCode = reader.read(1)[0];
        const keys = readPublicKeys(reader);
        reader.failIfNonEmpty();

        assertCardResponse(errorCode >= MIN_ERROR_CODE && errorCode <= MAX_ERROR_CODE);

        return { errorCode, keys };
    }
}

async function computePinHash(pin: string): Promise<Uint8Array> {
    const buffer = new TextEncoder().encode(pin);
    const hash = await subtle.digest("SHA-256", buffer);
    return Buffer.from(hash);
}

async function encrypt(args: {
    cardIOPublicKey: Uint8Array,
    data: Uint8Array,
}): Promise<{
    encryptedData: Uint8Array,
    clientPublicKey: Uint8Array,
}> {
    const clientKeys = await subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true,
        ["deriveKey"],
    );

    const cardIoPublicKey = await subtle.importKey(
        "raw",
        p256.ProjectivePoint.fromHex(args.cardIOPublicKey).toRawBytes(false),
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        false,
        [],
    );

    const secret = await subtle.deriveKey(
        {
            name: "ECDH",
            public: cardIoPublicKey,
        },
        clientKeys.privateKey,
        {
            name: "AES-CTR",
            length: 256,
        },
        false,
        ["encrypt", "decrypt"],
    );

    const dataHash = await subtle.digest("SHA-256", args.data);

    const encryptedData = await subtle.encrypt(
        {
            name: "AES-CTR",
            counter: Buffer.alloc(16),
            length: 64,
        },
        secret,
        Buffer.concat([
            args.data,
            Buffer.from(dataHash),
        ]),
    );

    const clientPublicKey = await subtle.exportKey("raw", clientKeys.publicKey);

    return { 
        encryptedData: Buffer.from(encryptedData), 
        clientPublicKey: Buffer.from(clientPublicKey),
    };
}

async function signPin(pin: string) {
    const pinHash = await computePinHash(pin);

    const keys = await subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-256",
        },
        true,
        ["sign", "verify"],
    );

    const signature = await subtle.sign(
        {
            name: "ECDSA",
            hash: "SHA-256",
        },
        keys.privateKey,
        pinHash,
    );

    const publicKey = await subtle.exportKey("raw", keys.publicKey);

    return { publicKey, signature };
}

class BufferReader {
    private readonly _buffer: Buffer;
    private _offset: number;

    constructor(buffer: Uint8Array | ArrayBuffer) {
        if(buffer instanceof ArrayBuffer) {
            this._buffer = Buffer.from(buffer);
        } else {
            this._buffer = Buffer.from(buffer);
        }

        this._offset = 0;
    }

    read(length: number): Buffer {
        const end = this._offset + length;

        if( end > this._buffer.length ) {
            throw new UniError("INVALID_CARD_RESPONSE");
        }

        const result = Buffer.from(this._buffer.subarray(this._offset, end));
        this._offset = end;

        return result;
    }

    failIfNonEmpty() {
        if( this._offset !== this._buffer.length ) {
            throw new UniError("INVALID_CARD_RESPONSE");
        }
    }
}

function verifyMagic(magic: Uint8Array) {
    if( Buffer.compare(magic, new Uint8Array(CARD_MAGIC)) ) {
        throw new UniError("INVALID_CARD_RESPONSE");
    }
}

function assertCardResponse(condition: unknown, message?: string): asserts condition {
    if( !condition ) {
        throw new UniError("INVALID_CARD_RESPONSE", message);
    }
}

function parsePublicKey(src: Buffer) {
    const type = (src[0] & 0xF0) >> 4;
    let data = src.subarray(1);

    if( type === KeyType.secp256k1 || type === KeyType.ioPublicKey ) {
        const prefix = Buffer.from([src[0] & 0x0F]);
        data = Buffer.concat([prefix, data]);
    }

    return { type, data };
}

function readPublicKeys(reader: BufferReader): CardKeys {
    const keyCount = reader.read(1)[0];
    const keys: CardKeys = {};

    for( let i = 0; i < keyCount; i++ ) {
        const key = parsePublicKey(reader.read(33));

        if( key.type === KeyType.ioPublicKey ) {
            keys.ioPublicKey = key.data.toString("hex");
        } else if( key.type === KeyType.secp256k1 ) {
            keys.secp256k1 = key.data.toString("hex");
        } else if( key.type === KeyType.ed25519 ) {
            keys.ed25519 = key.data.toString("hex");
        } else {
            throw new UniError("INVALID_CARD_RESPONSE");
        }
    }

    return keys;
}

export function parsePublicKeyHexList(src: string): CardKeys | undefined {
    try {
        const reader = new BufferReader(Buffer.from(src, "hex"));
        const keys = readPublicKeys(reader);
        reader.failIfNonEmpty();
        return keys;
    } catch(_) {
        return undefined;
    }
}

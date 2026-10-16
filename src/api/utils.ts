import { BigNumber } from "bignumber.js";
import { Buffer } from "buffer";
import { CardKeys } from "./common";
import { assert, assertArgument, UniError, UniTooManyDecimalsError } from "./errors";

export function validateLength(value: Uint8Array, length: number) {
    assertArgument(value.length === length);
}

export function parseNumberOrFail(src: string): number {
    const value = Number(src);
    assertArgument(!Number.isNaN(value), "Value is not a number");
    return value;
}

export async function wait(interval: number): Promise<void>{
    return new Promise((resolve) => {
        setTimeout(resolve, interval);
    });
}

export function validateHex256(src: string): void {
    assertArgument(src.match(/^[a-fA-F0-9]{64}$/));
}

export function validateHex512(src: string): void {
    assertArgument(src.match(/^[a-fA-F0-9]{128}$/));
}

export function validateHex(src: string, bytesLength: number): void {
    assertArgument(src.match(/^[a-fA-F0-9]+$/) && src.length === (bytesLength * 2));
}

export function parseHex(src: string, bytesLength: number): Uint8Array {
    validateHex(src, bytesLength);
    return Buffer.from(src, "hex");
}

export function getSecp256k1Key(keys?: CardKeys): string {
    assertArgument(!!keys?.secp256k1, "No secp256k1 key");
    return keys.secp256k1;
}

export function getEd25519Key(keys?: CardKeys): string {
    assertArgument(!!keys?.ed25519, "No ed25519 key");
    return keys.ed25519;
}

export function fromBlockchainUnits(value: number | bigint | string, decimals: number): string {
    const initialBn = new BigNumber(value.toString());
    const bn = initialBn.shiftedBy(-decimals);

    if( !initialBn.isInteger() || bn.isNaN() ) {
        throw new UniError("INVALID_ARGUMENT", `Invalid number : ${value}`);
    }

    return bn.toFixed();
}

export function toBlockchainUnits(value: number | string, decimals: number): bigint {
    const bn = new BigNumber(value).shiftedBy(decimals);

    if( bn.isNaN() ) {
        throw new UniError("INVALID_ARGUMENT", `Invalid number : ${value}`);
    } else if( !bn.isInteger() ) {
        throw new UniTooManyDecimalsError(decimals);
    }

    return BigInt(bn.toFixed());
}

export function toPosBlockchainUnits(value: number | string, decimals: number): bigint {
    const result = toBlockchainUnits(value, decimals);
    assertArgument(result > BigInt(0), "Number must be positive");
    return result;
}

export function toBigInt(value: number | string): bigint {
    const bn = new BigNumber(value);

    if( bn.isNaN() || !bn.isInteger() ) {
        throw new UniError("INVALID_ARGUMENT", `Invalid number : ${value}`);
    }

    return BigInt(bn.toFixed());
}

export function toPosBigInt(value: number | string): bigint {
    const result = toBigInt(value);
    assertArgument(result > BigInt(0), "Number must be positive");
    return result;
}

export function toInt(value: string): number {
    const result = parseInt(value, 10);
    if( Number.isNaN(result) ) {
        throw new UniError("INVALID_ARGUMENT", `Invalid number : ${value}`);
    }

    return result;
}

export class LazyValue<T> {

    private _getter?: () => Promise<T>;
    private _value?: T;
    private _pending?: Promise<T>;

    constructor(getter: () => Promise<T>) {
        this._getter = getter;
    }

    async get(): Promise<T> {
        if( !this._getter ) {
            return this._value!;
        }

        if( !this._pending ) {
            this._pending = (async (getter) => {
                try {
                    this._value = await getter();
                    return this._value;

                } finally {
                    this._pending = undefined;
                    this._getter = undefined;
                }
            })(this._getter);
        }

        return this._pending;
    }
}

export class CachedValue<T> {

    private readonly _getter: (oldValue?: T) => Promise<T | undefined>;
    private readonly _maxAge: number;
    private _expiration: number;
    private _value?: T;
    private _pending?: Promise<NonNullable<T>>;

    constructor(
        getter: (oldValue?: T) => Promise<T | undefined>,
        maxAge: number
    ) {
        this._getter = getter;
        this._maxAge = maxAge;
        this._expiration = 0;
    }

    reset() {
        this._expiration = 0;
        this._value = undefined;
        this._pending = undefined;
    }

    async get(): Promise<NonNullable<T>> {
        if( Date.now() < this._expiration ) {
            return this._value!;
        }

        if( !this._pending ) {
            this._pending = (async () => {
                try {
                    const value = await this._getter(this._value);
                    if( value != null ) {
                        this._value = value;
                        this._expiration = Date.now() + this._maxAge;
                    }

                    assert(this._value != null);
                    return this._value;

                } finally {
                    this._pending = undefined;
                }
            })();
        }

        return this._pending;
    }
}

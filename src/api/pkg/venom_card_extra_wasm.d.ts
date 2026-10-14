/* tslint:disable */
/* eslint-disable */
/**
* Get BIP39 mnemonic words by given prefix
* @param {string} prefix
* @returns {Array<string>}
*/
export function getBip39Hints(prefix: string): Array<string>;
/**
* Generate 12-word BIP39 mnemonic
* @returns {Array<string>}
*/
export function generateLabsMnemonic(): Array<string>;
/**
* Generate derived key by given 12-word BIP39 mnemonic
* @param {string} phrase
* @param {number} id
* @returns {string}
*/
export function deriveFromLabsMnemonic(phrase: string, id: number): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly getBip39Hints: (a: number, b: number) => number;
  readonly generateLabsMnemonic: () => number;
  readonly deriveFromLabsMnemonic: (a: number, b: number, c: number, d: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

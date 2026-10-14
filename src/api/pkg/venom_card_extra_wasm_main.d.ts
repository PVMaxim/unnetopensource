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

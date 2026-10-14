import type { PublicKeyCardType, cardVersionType } from '../api/constants-types';
import { cardVersionHistory } from '../api/constants-types';
import { store } from '../store/index.js';

/** Matches a zero-filled secp256k1 public key. */
const REGEX_SEC_P256K1_ZERO: RegExp = /^[0]{66}$/;

/** Matches a zero-filled ed25519 public key. */
const REGEX_ED25519_ZERO: RegExp = /^[0]{64}$/;

/** Matches a valid hex secp256k1 public key. */
const REGEX_SEC_P256K1_HEX: RegExp = /^[a-fA-F0-9]{66}$/;

/** Matches a valid hex ed25519 public key. */
const REGEX_ED25519_HEX: RegExp = /^[a-fA-F0-9]{64}$/;

/** Matches a specific 134-character hex hash format. */
const REGEX_TAG_HASH: RegExp = /^[a-fA-F0-9]{134}$/;

/** Matches a valid card version in url. */
const REGEX_URL_VERSION: RegExp = /[v][0-9]{1,6}$/g;

/**
 * Checks if the card is new by verifying if its public keys are all zeros.
 * A new card has not been initialized with a seed phrase.
 * @returns `true` if both secp256k1 and ed25519 keys are zero-filled, otherwise `false`.
 */
export const isCardIsNew = (): boolean => {
    const publicKeyCard: PublicKeyCardType | undefined = store.state.user.publicKeyCard;
    // Using the nullish coalescing operator `?? ''` ensures type safety with RegExp.test().
    return REGEX_SEC_P256K1_ZERO.test(publicKeyCard?.secp256k1 ?? '') && REGEX_ED25519_ZERO.test(publicKeyCard?.ed25519 ?? '');
};

/**
 * Checks if the card has been registered and initialized.
 * A registered card has valid, non-zero public keys.
 * @returns `true` if both keys are valid hex strings and not zero-filled.
 */
export const isCardRegistered = (): boolean => {
    const publicKeyCard: PublicKeyCardType | undefined = store.state.user.publicKeyCard;
    const secpKey = publicKeyCard?.secp256k1 ?? '';
    const edKey = publicKeyCard?.ed25519 ?? '';

    const isSecpValid = REGEX_SEC_P256K1_HEX.test(secpKey) && !REGEX_SEC_P256K1_ZERO.test(secpKey);
    const isEd25519Valid = REGEX_ED25519_HEX.test(edKey) && !REGEX_ED25519_ZERO.test(edKey);

    return isSecpValid && isEd25519Valid;
};

/**
 * Checks if the card is in a broken or inconsistent state.
 * This occurs if one public key is initialized (valid and non-zero) while the other is not (zero-filled).
 * @returns `true` if one key is valid and the other is zero-filled.
 */
export const isCardBroken = (): boolean => {
    const publicKeyCard: PublicKeyCardType | undefined = store.state.user.publicKeyCard;
    const secpKey = publicKeyCard?.secp256k1 ?? '';
    const edKey = publicKeyCard?.ed25519 ?? '';

    const isSecpInitialized = REGEX_SEC_P256K1_HEX.test(secpKey) && !REGEX_SEC_P256K1_ZERO.test(secpKey);
    const isEd25519Initialized = REGEX_ED25519_HEX.test(edKey) && !REGEX_ED25519_ZERO.test(edKey);

    const isSecpZero = REGEX_SEC_P256K1_ZERO.test(secpKey);
    const isEd25519Zero = REGEX_ED25519_ZERO.test(edKey);

    return (isSecpInitialized && isEd25519Zero) || (isSecpZero && isEd25519Initialized);
};

/**
 * Validates if the given string is a specific format of a tag hash.
 * @param url The string to validate.
 * @returns `true` if the string is a 134-character hex string.
 */
export const isTagHash = (url: string): boolean => {
    return REGEX_TAG_HASH.test(url);
};

export const getCardVersion = (input: string): cardVersionType | null => {
let found = cardVersionHistory.find(v => v.versionUrl === input);
if (found) return found;

found = cardVersionHistory.find(v => v.versionCard === input);
if (found) return found;

return null;
}

/**
 * Validates if the given string is a specific format of a tag hash.
 * @param query The object to validate.
 * @returns Card version if the url has it or null.
 */
export const getVersionFromUrl = (query: object): string | null => {
    if (typeof(query) !== 'object') return null;
    const key = Object.keys(query).find(key => key.match(REGEX_URL_VERSION));
    console.log(`query typeof = ${typeof query}, data = ${JSON.stringify(query)}, key = ${key}`);
    return key ?? null;
}

export const checkAndSetVersionFromUrl = (query: object): void => {
    const key = getVersionFromUrl(query);
    if ( typeof key === 'string' ) {
        const cardVersion = getCardVersion(key);
        if ( typeof cardVersion?.versionCard === 'string' ) {
            console.log(`Enter set CardVersion`);
            store.dispatch('settings/setCardVersion',  cardVersion?.versionCard )
        }
    }
}
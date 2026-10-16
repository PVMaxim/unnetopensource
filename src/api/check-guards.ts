import type { PublicKeyCardType, cardVersionType } from '../api/constants-types';
import { cardVersionHistory } from '../api/constants-types';
import { store } from '../store/index.js';

const REGEX_SEC_P256K1_ZERO: RegExp = /^[0]{66}$/;

const REGEX_ED25519_ZERO: RegExp = /^[0]{64}$/;

const REGEX_SEC_P256K1_HEX: RegExp = /^[a-fA-F0-9]{66}$/;

const REGEX_ED25519_HEX: RegExp = /^[a-fA-F0-9]{64}$/;

const REGEX_TAG_HASH: RegExp = /^[a-fA-F0-9]{134}$/;

const REGEX_URL_VERSION: RegExp = /[v][0-9]{1,6}$/g;

export const isCardIsNew = (): boolean => {
    const publicKeyCard: PublicKeyCardType | undefined = store.state.user.publicKeyCard;
    return REGEX_SEC_P256K1_ZERO.test(publicKeyCard?.secp256k1 ?? '') && REGEX_ED25519_ZERO.test(publicKeyCard?.ed25519 ?? '');
};

export const isCardRegistered = (): boolean => {
    const publicKeyCard: PublicKeyCardType | undefined = store.state.user.publicKeyCard;
    const secpKey = publicKeyCard?.secp256k1 ?? '';
    const edKey = publicKeyCard?.ed25519 ?? '';

    const isSecpValid = REGEX_SEC_P256K1_HEX.test(secpKey) && !REGEX_SEC_P256K1_ZERO.test(secpKey);
    const isEd25519Valid = REGEX_ED25519_HEX.test(edKey) && !REGEX_ED25519_ZERO.test(edKey);

    return isSecpValid && isEd25519Valid;
};

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

export const getVersionFromUrl = (query: object): string | null => {
    if (typeof(query) !== 'object') return null;
    const key = Object.keys(query).find(key => key.match(REGEX_URL_VERSION));
    return key ?? null;
}

export const checkAndSetVersionFromUrl = (query: object): void => {
    const key = getVersionFromUrl(query);
    if ( typeof key === 'string' ) {
        const cardVersion = getCardVersion(key);
        if ( typeof cardVersion?.versionCard === 'string' ) {
            store.dispatch('settings/setCardVersion',  cardVersion?.versionCard )
        }
    }
}
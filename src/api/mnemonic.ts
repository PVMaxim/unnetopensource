import { ethers } from "ethers";
import { UniError } from "./errors";

const derivationPath = "m/44'/396'/0'/0/0";

export function generateMnemonic(): string[] {
    let wallet: ethers.HDNodeWallet;

    try {
        wallet = ethers.HDNodeWallet.createRandom(undefined, derivationPath);
    } catch(_) {
        throw new UniError("INTERNAL_ERROR", "Failed to generate mnemonic");
    }

    const words = (wallet.mnemonic?.phrase ?? "").split(" ");
    if( words.length !== 12 ) {
        throw new UniError("INTERNAL_ERROR", "Failed to generate mnemonic");
    }

    return words;
}

export function deriveSeedFromMnemonic(phrase: string): string {
    let wallet: ethers.HDNodeWallet;

    try {
        wallet = ethers.HDNodeWallet.fromPhrase(phrase, undefined, derivationPath);
    } catch(_) {
        throw new UniError("INVALID_ARGUMENT", "Invalid mnemonic");
    }

    const seed = wallet.privateKey.toLowerCase();
    if( !seed.match(/^0x[a-f0-9]{64}$/) ) {
        throw new UniError("INTERNAL_ERROR", "Failed to generate seed from mnemonic");
    }

    return seed.slice(2);
}

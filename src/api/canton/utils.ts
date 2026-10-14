import { Buffer } from "buffer";
import { PublicKey } from "@canton-network/core-signing-lib";
import { CardKeys } from "../common";
import { getEd25519Key } from "../utils";


///////////////////////////////////////////////////////////////////////////////
// from https://github.com/canton-network/wallet/blob/main/sdk/wallet-sdk/src/wallet/namespace/keys/client.ts
async function getFingerprint(publicKey: PublicKey) {
    const hashPurpose = 12 // For `PublicKeyFingerprint`
    const keyBytes = Buffer.from(publicKey, 'base64')
    const hashInput = Buffer.alloc(4 + keyBytes.length)
    hashInput.writeUInt32BE(hashPurpose, 0)
    Buffer.from(keyBytes).copy(hashInput, 4)
    const hash = new Uint8Array(
        await crypto.subtle.digest('SHA-256', hashInput)
    )
    const multiprefix = Buffer.from([0x12, 0x20])
    return Buffer.concat([multiprefix, hash]).toString('hex')
}


///////////////////////////////////////////////////////////////////////////////
export async function getCardKeyFingerprint(keys: CardKeys) {
    const publicKey = getEd25519Key(keys);
    const publicKeyB64 = Buffer.from(publicKey, "hex").toString("base64");
    return getFingerprint(publicKeyB64);
}

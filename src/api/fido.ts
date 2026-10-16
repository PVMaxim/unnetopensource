import { Buffer } from "buffer";
const { crypto } = globalThis;

const FIDO_DEFAULT_TIMEOUT       = 60;

export function buildFidoRequest(args: {
    hostname: string, 
    data: Uint8Array,
    timeout?: number,
}) {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    return {
        rpId: args.hostname,
        challenge: toBase64Url(challenge),
        allowCredentials: [
            {
                id: toBase64Url(args.data),
                transports: [
                    "nfc"
                ],
                type: "public-key"
            }
        ],
        timeout: args.timeout ?? (FIDO_DEFAULT_TIMEOUT * 1000),
        userVerification: "discouraged"
    };
}

function toBase64Url(data: Uint8Array): string {
    return Buffer.from(data)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

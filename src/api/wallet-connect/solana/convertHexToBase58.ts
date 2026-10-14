import bs58 from "bs58";

export const convertHexToBase58 = (hex: string): string => {
    const buf = Buffer.from(hex, 'hex');
    const bytes = Uint8Array.from(buf);
    const base58String = bs58.encode(bytes);
    return base58String;
}
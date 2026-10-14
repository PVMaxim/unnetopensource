import { Buffer } from "buffer";


///////////////////////////////////////////////////////////////////////////////
const NFC_TAG_LONG_CMD_OPCODE = 0xF0;
const NFC_TAG_LONG_CMD_THRESHOLD = 255;


///////////////////////////////////////////////////////////////////////////////
export function buildNfcTagRequest(payload: Uint8Array): Uint8Array {
    if( payload.length <= NFC_TAG_LONG_CMD_THRESHOLD ) {
        return payload;
    }

    const result = Buffer.alloc(payload.length + 3);
    result[0] = NFC_TAG_LONG_CMD_OPCODE;
    result.writeUint16BE(payload.length, 1);
    result.set(payload, 3);

    return result;
}

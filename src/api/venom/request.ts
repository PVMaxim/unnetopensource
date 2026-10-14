import { Ed25519RequestChunk } from "../request-chunks";


///////////////////////////////////////////////////////////////////////////////
export class VenomRequestChunkFactory {

    constructor(readonly sidReader: () => Promise<number | undefined>) {
    }

    async create(args: {
        hash: string,
        expectedPublicKey?: string,
    }): Promise<Ed25519RequestChunk> {
        const signatureId = await this.sidReader();
        let prefix = "";

        if( signatureId !== undefined ) {
            const signatureIdBuf = Buffer.alloc(4);
            signatureIdBuf.writeUInt32BE(signatureId, 0);
            prefix = signatureIdBuf.toString("hex");
        }

        return new Ed25519RequestChunk({
            hash: prefix + args.hash,
            expectedPublicKey: args.expectedPublicKey,
        });
    }
}

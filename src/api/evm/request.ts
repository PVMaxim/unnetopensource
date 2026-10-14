import { secp256k1 } from "@noble/curves/secp256k1";
import { ethers } from "ethers";
import { Request } from "../common";
import { UniLowBalanceError , UniError } from "../errors";
import { Secp256k1RequestChunk } from "../request-chunks";


///////////////////////////////////////////////////////////////////////////////
export class EvmRequestChunk extends Secp256k1RequestChunk {
    protected convertSignature(
        publicKey: string, 
        signature: string
    ): string {
        return convertSignatureForEvm({
            dataHash: this.hash,
            publicKey,
            signature,
        });
    }
}


///////////////////////////////////////////////////////////////////////////////
export class EvmRequest implements Request {
    readonly chunks: EvmRequestChunk[];

    private readonly _provider: ethers.Provider;
    private readonly _transaction: ethers.Transaction;
    private readonly _gas: bigint;

    private constructor(args: {
        provider: ethers.Provider,
        publicKey: string,
        transaction: ethers.Transaction,
        gas: bigint,
    }) {
        this._provider = args.provider;
        this._transaction = args.transaction;
        this._gas = args.gas;

        this.chunks = [
            new EvmRequestChunk({
                hash: this._transaction.unsignedHash.slice(2),
                expectedPublicKey: args.publicKey,
            }),
        ];
    }

    static async create(args: {
        provider: ethers.Provider,
        tx: ethers.TransactionRequest,
        publicKey: string,
    }): Promise<EvmRequest> {
        const address = ethers.computeAddress(`0x${args.publicKey}`);
        const voidSigner = new ethers.VoidSigner(address, args.provider);

        const populated = await voidSigner.populateTransaction(args.tx);
        delete populated.from;

        const gas = await args.provider.estimateGas({
            ...args.tx,
            from: address,
        });

        const fee = await estimateFee(args.provider, gas);
        const totalAmount = BigInt(args.tx.value ?? "0") + fee;
        const balance = await args.provider.getBalance(address);

        if( totalAmount > balance ) {
            throw new UniLowBalanceError("_");
        }

        return new EvmRequest({
            transaction: ethers.Transaction.from(populated),
            gas,
            ...args,
        });
    }

    async estimateFee(): Promise<string> {
        const fee = await estimateFee(this._provider, this._gas);
        return ethers.formatEther(fee);
    }

    async send(): Promise<string> {
        const signature = this.chunks[0].signature;

        if( !signature ) {
            throw new UniError("INVALID_ARGUMENT", "Request is not signed");
        }

        const btx = ethers.Transaction.from(this._transaction);
        btx.signature = `0x${signature}`;

        try {
            const response = await this._provider.broadcastTransaction(btx.serialized);
            await response.wait();

            return response.hash;

        } catch(err: any) {
            if( err.code === "INSUFFICIENT_FUNDS" ) {
                throw new UniLowBalanceError("_");
            }

            throw err;
        }
    }
}


///////////////////////////////////////////////////////////////////////////////
export function convertSignatureForEvm(args: {
    dataHash: string, 
    signature: string,
    publicKey: string,
}): string {
    // Ethereum expects signature in the following format:
    // <r:32 bytes><s: 32 bytes><v:1 byte>
    // where "s" is normalized : s <= (CURVE_ORDER / 2)
    // and v = recoveryBit + 27

    const normSignature = secp256k1.Signature.fromCompact(args.signature).normalizeS();

    for( const rec of [0, 1] ) {
        const rSignature = normSignature.addRecoveryBit(rec);
        const rPublicKey = rSignature.recoverPublicKey(args.dataHash).toHex(true);

        if( rPublicKey.toLowerCase() === args.publicKey.toLowerCase() ) {
            const v = rec ? "1c" : "1b";
            return rSignature.toCompactHex() + v;
        }
    }

    throw new UniError("INVALID_ARGUMENT", "Invalid signature");
}


///////////////////////////////////////////////////////////////////////////////
async function estimateFee(provider: ethers.Provider, gas: bigint): Promise<bigint> {
    const feeData = await provider.getFeeData();
    return (feeData.gasPrice || BigInt(0)) * gas;
}


///////////////////////////////////////////////////////////////////////////////
export function evmNormalizeAddress(address: string) {
    return address.toLowerCase();
}

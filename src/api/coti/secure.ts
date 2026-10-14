import { ethers } from "@coti-io/coti-ethers";
import { encodeUint, encodeKey, encrypt, decodeUint } from "@coti-io/coti-sdk-typescript"
import { Request, RequestChunk } from "../common";
import { UniLowBalanceError, assert} from "../errors";
import { CotiLazyTxChunk, CotiArgSignChunk, splitIntoChunks, arrayPopFrontN, buildTransaction } from "./utils";


///////////////////////////////////////////////////////////////////////////////
export abstract class CotiSecureArg {

    protected readonly _rawChunks: Uint8Array[];
    protected _encrypted?: bigint[];

    protected constructor(rawChunks: Uint8Array[]) {
        assert(rawChunks.every(x => x.length === 16));
        this._rawChunks = rawChunks;
    }

    get numChunks(): number {
        return this._rawChunks.length;
    }

    encrypt(userKey: string): bigint[] {
        this._encrypted = this._rawChunks.map(raw => {
            const keyBytes = encodeKey(userKey);
            const { ciphertext, r } = encrypt(keyBytes, raw);
            const ct = new Uint8Array([...ciphertext, ...r]);

            return decodeUint(ct);
        });

        return this._encrypted;
    }

    abstract buildValue(signatures: string[]): any;
}


///////////////////////////////////////////////////////////////////////////////
export class CotiSecureUint64 extends CotiSecureArg {
    constructor(value: bigint) {
        assert(value >= 0 && value <= BigInt(2) ** BigInt(64));
        super([ encodeUint(value) ]);
    }

    buildValue(signatures: string[]): any {
        assert(this._encrypted);
        assert(signatures.length === 1);

        return {
            ciphertext: this._encrypted[0],
            signature: `0x${signatures[0]}`,
        };
    }
}

///////////////////////////////////////////////////////////////////////////////
export class CotiSecureString extends CotiSecureArg {
    constructor(value: string) {
        let utf8Value = new TextEncoder().encode(value);

        // pad to 8-byte chunks
        if( utf8Value.length % 8 !== 0 ) {
            utf8Value = new Uint8Array([ ...utf8Value, ...new Uint8Array(8 - (utf8Value.length % 8)) ]);
        }

        const rawChunks = [];
        for( let i = 0; i < utf8Value.length; i += 8 ) {
            rawChunks.push(utf8Value.slice(i, i + 8));
        }

        super(rawChunks);
    }

    buildValue(signatures: string[]): any {
        assert(this._encrypted);
        assert(signatures.length === this._encrypted.length);

        return {
            ciphertext: this._encrypted,
            signature: signatures.map(x => `0x${x}`),
        };
    }
}


///////////////////////////////////////////////////////////////////////////////
export class CotiRequest implements Request {

    readonly chunks: RequestChunk[];

    protected readonly _provider: ethers.Provider;
    protected readonly _txChunk: CotiLazyTxChunk;
    protected readonly _fee?: bigint;

    protected constructor(args: {
        provider: ethers.Provider,
        contract: {
            interface: ethers.Interface,
            address: string,
            method: string,
            params?: any[],
        },
        userKey: string,
        publicKey: string,
        value?: bigint,
        gasLimit?: bigint,
        estimatedFee?: bigint,
    }) {
        this._provider = args.provider;
        this._fee = args.estimatedFee;

        const contractArgs = (args.contract.params ?? []);
        const walletAddress = ethers.computeAddress(`0x${args.publicKey}`);
        const functionSelector = args.contract.interface.getFunction(args.contract.method)?.selector;
        assert(!!functionSelector);

        const hashEncryptedArg = (ciphertext: bigint) => {
            return ethers.solidityPackedKeccak256(
                ["address", "address", "bytes4", "uint256"],
                [walletAddress, args.contract.address, functionSelector, ciphertext]
            ).substring(2);
        }

        const hashesToSign = contractArgs
            .filter(x => x instanceof CotiSecureArg)
            .flatMap(x => x.encrypt(args.userKey))
            .map(x => hashEncryptedArg(x));

        const argChunks = splitIntoChunks(hashesToSign, CotiArgSignChunk.getMaxChunkSize())
            .map(x => new CotiArgSignChunk({ hashes: x, expectedPublicKey: args.publicKey }));

        this._txChunk = new CotiLazyTxChunk({
            txFactory: async () => {
                let signatures = argChunks.flatMap(x => x.signatures);
                assert(signatures.every(x => !!x));

                const txFnArgs = contractArgs.map(x => {
                    if( x instanceof CotiSecureArg ) {
                        return x.buildValue(arrayPopFrontN(signatures, x.numChunks) as string[]);
                    } else {
                        return x;
                    }
                });

                assert(signatures.length === 0);

                return buildTransaction({
                    provider: args.provider,
                    walletAddress,
                    tx: {
                        to: args.contract.address,
                        data: args.contract.interface.encodeFunctionData(args.contract.method, txFnArgs),
                        value: args.value,
                        gasLimit: args.gasLimit,
                    },
                });
            },
            expectedPublicKey: args.publicKey,
        });

        this.chunks = [ ...argChunks, this._txChunk ];
    }

    static async create(args: {
        provider: ethers.Provider,
        contract: {
            interface: ethers.Interface,
            address: string,
            method: string,
            params?: any[],
        },
        userKey: string,
        publicKey: string,
        value?: bigint,
        gasLimit?: bigint,
        estimatedGas?: bigint,
    }): Promise<Request> {
        let fee: bigint = BigInt(0);
        if( args.estimatedGas ) {
            const feeData = await args.provider.getFeeData();
            fee = (feeData.gasPrice || BigInt(0)) * args.estimatedGas;
        }

        // todo: estimate if no secure args

        const totalAmount = fee + (args.value ?? BigInt(0));
        const sender = ethers.computeAddress(`0x${args.publicKey}`);
        const balance = await args.provider.getBalance(sender);

        if( totalAmount > balance ) {
            throw new UniLowBalanceError("_");
        }

        return new CotiRequest({
            ...args,
            estimatedFee: fee,
        });
    }

    async estimateFee(): Promise<string> {
        return this._fee ? ethers.formatEther(this._fee) : "0";
    }

    async send(): Promise<string> {
        const tx = this._txChunk.getSignedTransaction();

        try {
            const response = await this._provider.broadcastTransaction(tx.serialized);
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

import { generateRSAKeyPair, recoverUserKey } from "@coti-io/coti-sdk-typescript"
import { getAccountOnboardContract, ONBOARD_CONTRACT_ADDRESS, ethers } from "@coti-io/coti-ethers";
import { RequestChunk, Request } from "../common";
import { UniError, UniLowBalanceError, assert } from "../errors";
import { CotiLazyTxChunk, CotiArgSignChunk, buildTransaction } from "./utils";


///////////////////////////////////////////////////////////////////////////////
const COTI_ONBOARDING_GAS_LIMIT = 12_000_000;
const COTI_ONBOARDING_GAS_USAGE = 500_000;


///////////////////////////////////////////////////////////////////////////////
export class CotiOnBoardingRequest implements Request {

    private readonly _provider: ethers.Provider;
    private readonly _contract: ethers.Contract;
    private readonly _stage1: CotiArgSignChunk;
    private readonly _stage2: CotiLazyTxChunk;
    private readonly _onFinish: (userKey: string) => void;
    private readonly _fee: bigint;

    private readonly _rsaKeyPair: {
        publicKey: Uint8Array;
        privateKey: Uint8Array;
    };

    private constructor(args: {
        provider: ethers.Provider,
        publicKey: string,
        onFinish: (userKey: string) => void,
        fee: bigint,
    }) {
        this._provider = args.provider;
        this._onFinish = args.onFinish;
        this._fee = args.fee;
        this._rsaKeyPair = generateRSAKeyPair();
        this._contract = getAccountOnboardContract(ONBOARD_CONTRACT_ADDRESS, args.provider);

        this._stage1 = new CotiArgSignChunk({
            hashes: [ethers.keccak256(this._rsaKeyPair.publicKey).substring(2)],
            expectedPublicKey: args.publicKey,
        });

        this._stage2 = new CotiLazyTxChunk({
            txFactory: async () => {
                assert(this._stage1.signatures && this._stage1.signatures.length === 1);

                return buildTransaction({
                    provider: args.provider,
                    tx: {
                        to: ONBOARD_CONTRACT_ADDRESS,
                        data: this._contract.interface.encodeFunctionData(
                            "onboardAccount", [
                                this._rsaKeyPair.publicKey,
                                Buffer.from(this._stage1.signatures[0], "hex"),
                            ],
                        ),
                        gasLimit: COTI_ONBOARDING_GAS_LIMIT,
                    },
                    walletAddress: ethers.computeAddress(`0x${args.publicKey}`),
                });
            },
            expectedPublicKey: args.publicKey,
        });
    }

    static async create(args: {
        provider: ethers.Provider,
        publicKey: string,
        onFinish: (userKey: string) => void,
    }): Promise<CotiOnBoardingRequest> {
        const feeData = await args.provider.getFeeData();
        const fee = (feeData.gasPrice ?? BigInt(0)) * BigInt(COTI_ONBOARDING_GAS_USAGE);

        const address = ethers.computeAddress(`0x${args.publicKey}`);
        const balance = await args.provider.getBalance(address);

        if( fee > balance ) {
            throw new UniLowBalanceError("_");
        }

        return new CotiOnBoardingRequest({
            ...args,
            fee,
        });
    }

    get chunks(): RequestChunk[] {
        return [ this._stage1, this._stage2 ];
    }

    async estimateFee(): Promise<string> {
        return ethers.formatEther(this._fee);
    }

    async send(): Promise<string> {
        const tx = this._stage2.getSignedTransaction();
        const txResponse = await this._provider.broadcastTransaction(tx.serialized);
        const receipt = await txResponse.wait();

        if (!receipt || !receipt.logs || !receipt.logs[0]) {
            throw new UniError("INTERNAL_ERROR", "failed to onboard account");
        }

        const decodedLog = this._contract.interface.parseLog(receipt.logs[0]);
        if (!decodedLog) {
            throw new UniError("INTERNAL_ERROR", "failed to onboard account");
        }

        const userKey1 = decodedLog.args.userKey1.substring(2);
        const userKey2 = decodedLog.args.userKey2.substring(2);

        this._onFinish(recoverUserKey(this._rsaKeyPair.privateKey, userKey1, userKey2));

        return txResponse.hash;
    }
}

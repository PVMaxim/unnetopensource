import { ProviderRpcClient, Address, Contract } from "everscale-inpage-provider";
import { Request, CardKeys } from "../../common";
import { CardWalletABI } from "../abi/CardWallet";
import { SWAP_MIN_VALUE_AMOUNT } from "../../constants-types";
import { UniError } from "../../errors";
import { Deployer, DeploymentRequest } from "../deployer";
import { checkCardTransaction } from "../tx-utils";
import { validateHex256, validateHex512, getEd25519Key } from "../../utils";
import { WVenomVaultABI } from "../abi/WVEnomVault";
import { Ed25519RequestChunk } from "../../request-chunks";
import { VenomRequestChunkFactory } from "../request";
import BigNumber from "bignumber.js";
import { TIP3_DEPLOY_WALLET_COST, VENOM_NATIVE_COIN_DECIMALS } from "../constants";

interface NativeTransactionData {
    timestamp: string;
    transfers: {
        recipient: Address,
        value: string,
        bounce: boolean,
        flags: number,
        payload: string,
    }[];

}

const NATIVE_STATIC_FEE = "3000000";

const STATIC_FEE = "15000000";
///////////////////////////////////////////////////////////////////////////////
class WVaultTransferRequest implements Request {

    readonly chunks: Ed25519RequestChunk[];

    private readonly _rpc: ProviderRpcClient;
    private readonly _deployer: Deployer;
    private readonly _data: NativeTransactionData;
    private readonly _hash: string;

    private constructor(args: {
        rpc: ProviderRpcClient,
        deployer:  Deployer,
        data: NativeTransactionData,
        hash: string,
        chunks: Ed25519RequestChunk[],
    }) {
        this.chunks = args.chunks;
        this._rpc = args.rpc;
        this._deployer = args.deployer;
        this._data = args.data;
        this._hash = args.hash;
    }

    static async create(args: {
        rpc: ProviderRpcClient,
        deployer:  Deployer,
        root: Address,
        chunkFactory: VenomRequestChunkFactory,
        value?: string,
        payload?: string,
    }): Promise<WVaultTransferRequest> {

        const data = {
            timestamp: Math.floor(Date.now() / 1000).toFixed(0),
            transfers: [{
                recipient: args.root,
                value: args.value || SWAP_MIN_VALUE_AMOUNT,
                bounce: false,
                flags: 1,
                payload: args?.payload ? args.payload : "",
            }],
        };

        const { hash } = await args.rpc.packIntoCell({
            structure: NATIVE_TRANSFER_STRUCTURE,
            data,
        });

        const chunk = await args.chunkFactory.create({ hash });

        return new WVaultTransferRequest({  chunks: [chunk], data, hash, ...args });
    }

    async estimateFee(): Promise<string> {
        return new BigNumber(NATIVE_STATIC_FEE).shiftedBy(-VENOM_NATIVE_COIN_DECIMALS).toFixed();
    }


    async send(): Promise<string> {

        const publicKey = this.chunks[0].publicKey;
        const signature = this.chunks[0].signature;

        if( !publicKey || !signature ) {
            throw new UniError("INVALID_ARGUMENT", "Request is not signed");
        }

        validateHex256(publicKey);
        validateHex512(signature);

        const sender = await this._deployer.getWalletAddress(publicKey);
        const isSenderDeployed = await this._deployer.isWalletDeployed(sender);
        const account = new this._rpc.Contract(CardWalletABI, new Address(sender));

        if( !isSenderDeployed ) {
            throw new UniError("WALLET_NOT_DEPLOYED");
        }

        const tx = await account.methods.sendTransactionsWithSign({
            data: this._data,
            signature: {
                highPart: `0x${signature.slice(0, 64)}`,
                lowPart: `0x${signature.slice(64)}`,
                pubkey: `0x${publicKey}`,
            },
        }).sendExternal({
            withoutSignature: true,
        }).then(x => x.transaction);

        checkCardTransaction(tx);

        return tx.id.hash;
    }
}

///////////////////////////////////////////////////////////////////////////////
const NATIVE_TRANSFER_STRUCTURE = [
    { name: "timestamp", type: "uint64" },
    {
        components: [
            { name: "recipient", type: "address" },
            { name: "value", type: "uint128" },
            { name: "bounce", type: "bool" },
            { name: "flags", type: "uint8" },
            { name: "payload", type: "cell" },
        ],
        name: "transfers",
        type: "tuple[]"
    }
] as const;

///////////////////////////////////////////////////////////////////////////////
export class WVenomVault{

    private readonly _rpc: ProviderRpcClient;
    private readonly _deployer: Deployer;
    private readonly _root: Contract<typeof WVenomVaultABI>;
    private readonly _chunkFactory: VenomRequestChunkFactory;

    constructor(args: {
        rpc: ProviderRpcClient,
        deployer: Deployer,
        root: Address,
        chunkFactory: VenomRequestChunkFactory,
    }) {
        this._chunkFactory = args.chunkFactory;
        this._rpc = args.rpc;
        this._deployer = args.deployer;
        this._root = new args.rpc.Contract(WVenomVaultABI, args.root);
    }

    async acceptNative(args: {
        value: string,
        crossSwapPayload: any,
        keys?: CardKeys,
    }): Promise<Request> {
        const publicKey = getEd25519Key(args.keys);
        const owner = await this._deployer.getWalletAddress(publicKey);
        const data = await this._rpc.rawApi.decodeInput({
            abi: args.crossSwapPayload?.abi ?? '',
            body: args.crossSwapPayload?.payload ?? '',
            internal: true,
            method: args.crossSwapPayload?.abiFunction.toString() ?? '',
        });

        const tx = this._root.methods.acceptNative({
            amount: data?.input.amount as string,
            remainingGasTo: new Address(owner),
            deployWalletValue: (data?.input.deployWalletValue as string) ?? '0',
            payload: data?.input.payload as string,
        })

        const boc = await tx.encodeInternal()

        const isSenderDeployed = await this._deployer.isWalletDeployed(owner);

        if( !isSenderDeployed ) {
            return DeploymentRequest.create({
                rpc: this._rpc,
                deployer: this._deployer,
                publicKey: publicKey,
                sendAfterDeployment: {
                    dest: this._root.address,
                    value: args.value || SWAP_MIN_VALUE_AMOUNT,
                    bounce: false,
                    flags: 1,
                    payload: boc,
                },
                chunkFactory: this._chunkFactory,
                fee: STATIC_FEE,
            })
        }

        return WVaultTransferRequest.create({
            rpc: this._rpc,
            deployer: this._deployer,
            root: this._root.address,
            value: args.value,
            payload: boc,
            chunkFactory: this._chunkFactory,
        });
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        payload?: string,
        keys?: CardKeys,
    }): Promise<Request> {
        const publicKey = getEd25519Key(args.keys);
        const owner = await this._deployer.getWalletAddress(publicKey);

        const tx = this._root.methods.transfer({
            amount: args.amount,
            recipient: new Address(args.recipient),
            remainingGasTo: new Address(owner),
            payload: args?.payload ? args.payload : "",
            deployWalletValue: TIP3_DEPLOY_WALLET_COST,
            notify: true,
        })

        const boc = await tx.encodeInternal()

        const isSenderDeployed = await this._deployer.isWalletDeployed(owner);

        if( !isSenderDeployed ) {
            return DeploymentRequest.create({
                rpc: this._rpc,
                deployer: this._deployer,
                publicKey: publicKey,
                sendAfterDeployment: {
                    dest: this._root.address,
                    value: SWAP_MIN_VALUE_AMOUNT,
                    bounce: false,
                    flags: 1,
                    payload: boc,
                },
                chunkFactory: this._chunkFactory,
                fee: STATIC_FEE,
            })
        }

        return WVaultTransferRequest.create({
            chunkFactory: this._chunkFactory,
            rpc: this._rpc,
            deployer: this._deployer,
            root: this._root.address,
            payload: boc,
        });
    }


    async swap(args: {
        crossSwapPayload: any,
        keys?: CardKeys,
    }): Promise<Request> {
        const publicKey = getEd25519Key(args.keys);
        const owner = await this._deployer.getWalletAddress(publicKey);
        const data = await this._rpc.rawApi.decodeInput({
            abi: args.crossSwapPayload?.abi ?? '',
            body: args.crossSwapPayload?.payload ?? '',
            internal: true,
            method: args.crossSwapPayload?.abiFunction.toString() ?? '',
        });

        const tx = this._root.methods.transfer({
            amount: data?.input.amount as string,
            deployWalletValue: (data?.input.deployWalletValue as string) ?? '0',
            payload: data?.input.payload as string,
            recipient: new Address(String(data?.input.recipient)),
            remainingGasTo: new Address(owner),
            notify: true,
        });

        const boc = await tx.encodeInternal()

        const isSenderDeployed = await this._deployer.isWalletDeployed(owner);

        if( !isSenderDeployed ) {
            return DeploymentRequest.create({
                rpc: this._rpc,
                deployer: this._deployer,
                publicKey: publicKey,
                sendAfterDeployment: {
                    dest: this._root.address,
                    value:  SWAP_MIN_VALUE_AMOUNT,
                    bounce: false,
                    flags: 1,
                    payload: boc,
                },
                chunkFactory: this._chunkFactory,
                fee: STATIC_FEE,
            })
        }

        return WVaultTransferRequest.create({
            rpc: this._rpc,
            deployer: this._deployer,
            root: this._root.address,
            value: SWAP_MIN_VALUE_AMOUNT,
            payload: boc,
            chunkFactory: this._chunkFactory,
        });
    }
}

import { BigNumber } from "bignumber.js";
import { ProviderRpcClient, Address } from "everscale-inpage-provider";
import { Token, TransactionInfo, Request, CardKeys } from "../../common";
import { CardWalletABI } from "../abi/CardWallet";
import { VENOM_NATIVE_COIN_DECIMALS } from "../constants";
import { Deployer, DeploymentRequest } from "../deployer";
import { VenomRequestChunkFactory } from "../request";
import { checkCardTransaction } from "../tx-utils";
import { VenomScan } from "../venomscan";
import { UniError } from "../../errors";
import { PriceProvider } from "../../pricing";
import { NativeTokenBase } from "../../token-base";
import { Ed25519RequestChunk } from "../../request-chunks";
import { validateHex256, validateHex512 } from "../../utils";
import { SWAP_NATIVE_ADDRESS } from "../../constants-types";


///////////////////////////////////////////////////////////////////////////////
const NATIVE_STATIC_FEE = "3000000";


///////////////////////////////////////////////////////////////////////////////
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


///////////////////////////////////////////////////////////////////////////////
class NativeTransferRequest implements Request {
    readonly chunks: Ed25519RequestChunk[];

    private readonly _rpc: ProviderRpcClient;
    private readonly _deployer: Deployer;
    private readonly _data: NativeTransactionData;

    private constructor(args: {
        rpc: ProviderRpcClient,
        deployer:  Deployer,
        data: NativeTransactionData,
        chunks: Ed25519RequestChunk[],
    }) {
        this.chunks = args.chunks;
        this._rpc = args.rpc;
        this._deployer = args.deployer;
        this._data = args.data;
    }

    static async create(args: {
        rpc: ProviderRpcClient,
        deployer:  Deployer,
        recipient: Address,
        amount: string,
        chunkFactory: VenomRequestChunkFactory,
    }): Promise<NativeTransferRequest> {
        const data = {
            timestamp: Math.floor(Date.now() / 1000).toFixed(0),
            transfers: [{
                recipient: args.recipient,
                value: args.amount,
                bounce: false,
                flags: 1,
                payload: "",
            }],
        };

        const { hash } = await args.rpc.packIntoCell({
            structure: NATIVE_TRANSFER_STRUCTURE,
            data,
        });

        const chunk = await args.chunkFactory.create({ hash });

        return new NativeTransferRequest({ 
            chunks: [chunk],
            data, 
            ...args 
        });
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

        if( this._data.transfers.some(x => x.recipient.equals(sender)) ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

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
export class NativeToken extends NativeTokenBase implements Token {

    private readonly _rpc: ProviderRpcClient;
    private readonly _deployer: Deployer;
    private readonly _chunkFactory: VenomRequestChunkFactory;
    private readonly _venomScan: VenomScan;

    constructor(args: {
        rpc: ProviderRpcClient,
        deployer: Deployer,
        venomScan: VenomScan,
        chunkFactory: VenomRequestChunkFactory,
        priceProvider: PriceProvider,
        name: string,
        symbol: string,
        ticker?: string,
    }) {
        super({
            ...args,
            decimals: VENOM_NATIVE_COIN_DECIMALS,
        });

        this._rpc = args.rpc;
        this._deployer = args.deployer;
        this._venomScan = args.venomScan;
        this._chunkFactory = args.chunkFactory;
    }

    async getBalance(owner: string): Promise<string> {
        const rawBalance = await this._rpc.getBalance(new Address(owner));
        return new BigNumber(rawBalance).shiftedBy(-VENOM_NATIVE_COIN_DECIMALS).toFixed();
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const publicKey = args.keys?.ed25519;

        if( publicKey !== undefined ) {
            const owner = await this._deployer.getWalletAddress(publicKey);
            const isDeployed = await this._deployer.isWalletDeployed(owner);

            if( owner.toLowerCase() === args.recipient.toLowerCase() ) {
                throw new UniError("SAME_SENDER_AND_RECIPIENT");
            }

            if( !isDeployed ) {
                return DeploymentRequest.create({
                    rpc: this._rpc,
                    deployer: this._deployer,
                    publicKey: publicKey,
                    chunkFactory: this._chunkFactory,
                    sendAfterDeployment: {
                        dest: new Address(args.recipient),
                        value: new BigNumber(args.amount).shiftedBy(VENOM_NATIVE_COIN_DECIMALS).toString(),
                        bounce: false,
                        flags: 1,
                        payload: "",
                    },
                    fee: NATIVE_STATIC_FEE,
                });
            }
        }

        return NativeTransferRequest.create({
            rpc: this._rpc,
            deployer: this._deployer,
            recipient: new Address(args.recipient),
            amount: new BigNumber(args.amount).shiftedBy(VENOM_NATIVE_COIN_DECIMALS).toString(),
            chunkFactory: this._chunkFactory,
        });
    }

    getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        return this._venomScan.getNativeTransactions(args);
    }

    getAddress(): string {
        return SWAP_NATIVE_ADDRESS;
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

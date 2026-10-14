import { BigNumber } from "bignumber.js";
import { ProviderRpcClient, Address, Contract, Transaction, TvmException } from "everscale-inpage-provider";
import { Token, TransactionInfo, Request, CardKeys } from "../../common";
import { CardWalletABI } from "../abi/CardWallet";
import { TokenRootABI } from "../abi/TokenRoot";
import { TokenWalletABI } from "../abi/TokenWallet";
import { VENOM_NATIVE_COIN_DECIMALS, TIP3_DEPLOY_WALLET_COST, TIP3_TRANSFER_COST, ZERO_ADDRESS } from "../constants";
import { Deployer, DeploymentRequest } from "../deployer";
import { VenomRequestChunkFactory } from "../request";
import { VenomScan } from "../venomscan";
import { UniError, UniLowBalanceError } from "../../errors";
import { checkCardTransaction, waitForTransactionTree } from "../tx-utils";
import { PriceProvider } from "../../pricing";
import { Ed25519RequestChunk } from "../../request-chunks";
import { BasicTokenMetadata, GenericTokenBase } from "../../token-base";
import { validateHex256, validateHex512, parseNumberOrFail, LazyValue } from "../../utils";


///////////////////////////////////////////////////////////////////////////////
const TIP3_STATIC_FEE = "15000000";


///////////////////////////////////////////////////////////////////////////////
interface Tip3TransferData {
    tokenTransfers: {
        tokenRoot: Address,
        amount: string,
        recipient: Address,
        deployWalletValue: string,
        remainingGasTo: Address,
        notify: boolean,
        payload: string,
        value: string,
    }[];
    timestamp: string;
}

enum Tip3ErrorCodes {
    NOT_ENOUGH_BALANCE = 1060,
}


///////////////////////////////////////////////////////////////////////////////
class Tip3TransferRequest implements Request {
    readonly chunks: Ed25519RequestChunk[];

    private readonly _rpc: ProviderRpcClient;
    private readonly _deployer: Deployer;
    private readonly _data: Tip3TransferData;
    private readonly _tokenId: string;

    private constructor(args: {
        rpc: ProviderRpcClient,
        deployer:  Deployer,
        data: Tip3TransferData,
        chunks: Ed25519RequestChunk[],
        tokenId: string,
    }) {
        this.chunks = args.chunks;
        this._rpc = args.rpc;
        this._deployer = args.deployer;
        this._data = args.data;
        this._tokenId = args.tokenId;
    }

    static async create(args: {
        rpc: ProviderRpcClient,
        deployer:  Deployer,
        root: Address,
        recipient: Address,
        amount: string,
        deployWallet: boolean,
        chunkFactory: VenomRequestChunkFactory,
        tokenId: string,
    }): Promise<Tip3TransferRequest> {
        const deployWalletValue = args.deployWallet ? TIP3_DEPLOY_WALLET_COST : "0";

        const data = {
            tokenTransfers: [{
                tokenRoot: args.root,
                amount: args.amount,
                recipient: args.recipient,
                deployWalletValue,
                remainingGasTo: ZERO_ADDRESS,
                notify: false,
                payload: "",
                value: BigNumber.sum(TIP3_TRANSFER_COST, deployWalletValue).toFixed(0),
            }],
            timestamp: Math.floor(Date.now() / 1000).toFixed(0),
        };

        const { hash } = await args.rpc.packIntoCell({
            structure: TIP3_TRANSFER_STRUCTURE,
            data,
        });

        const chunk = await args.chunkFactory.create({ hash });

        return new Tip3TransferRequest({
            chunks: [chunk],
            data, 
            ...args 
        });
    }

    async estimateFee(): Promise<string> {
        return new BigNumber(TIP3_STATIC_FEE).shiftedBy(-VENOM_NATIVE_COIN_DECIMALS).toFixed();
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

        if( this._data.tokenTransfers.some(x => x.recipient.equals(sender)) ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        if( !isSenderDeployed ) {
            throw new UniError("WALLET_NOT_DEPLOYED");
        }

        const tx = await account.methods.sendTokensWithSign({
            data: this._data,
            signature: {
                highPart: `0x${signature.slice(0, 64)}`,
                lowPart: `0x${signature.slice(64)}`,
                pubkey: `0x${publicKey}`,
            },
        }).sendExternal({
            withoutSignature: true
        }).then(x => x.transaction);

        const transactions = await waitForTransactionTree(this._rpc, tx);

        checkCardTransaction(tx);
        await checkTip3Transactions(this._rpc, transactions, new Address(sender), this._tokenId);

        return tx.id.hash;
    }
}


///////////////////////////////////////////////////////////////////////////////
export class Tip3Token extends GenericTokenBase implements Token {

    private readonly _rpc: ProviderRpcClient;
    private readonly _deployer: Deployer;
    private readonly _root: Contract<typeof TokenRootABI>;
    private readonly _walletByOwner: Map<string, Address>;
    private readonly _deployedWallets: Set<string>;
    private readonly _chunkFactory: VenomRequestChunkFactory;
    private readonly _venomScan: VenomScan;

    constructor(args: {
        rpc: ProviderRpcClient,
        deployer: Deployer,
        root: Address,
        venomScan: VenomScan,
        chunkFactory: VenomRequestChunkFactory,
        priceProvider: PriceProvider,
        ticker: LazyValue<string | undefined>,
        name?: string,
        symbol?: string,
        decimals?: number,
        isMandatory?: boolean,
    }) {
        super({
            ...args,
            id: args.root.toString().toLowerCase(),
        });

        this._rpc = args.rpc;
        this._deployer = args.deployer;
        this._root = new args.rpc.Contract(TokenRootABI, args.root);
        this._venomScan = args.venomScan;
        this._chunkFactory = args.chunkFactory;
        this._walletByOwner = new Map();
        this._deployedWallets = new Set();
    }

    static async checkTokenOnChain(args: {
        rpc: ProviderRpcClient,
        root: Address,
    }): Promise<boolean> {
        const contract = new args.rpc.Contract(TokenRootABI, args.root);
        const cachedState = (await contract.getFullState()).state;

        if( !cachedState || !cachedState.isDeployed ) {
            return false;
        }

        try {
            await contract.methods.decimals({answerId: 0}).call({cachedState});
            await contract.methods.symbol({answerId: 0}).call({cachedState});
            // await contract.methods.walletOf({answerId: 0, walletOwner: args.root}).call({cachedState});
        } 
        catch(e: any) {
            if( e instanceof TvmException ) {
                return false;
            } else {
                throw e;
            }
        }

        return true;
    }

    async getBalance(owner: string): Promise<string> {
        const walletAddress = await this._getWalletAddress(new Address(owner));
        const wallet = new this._rpc.Contract(TokenWalletABI, walletAddress);
        const cachedState = (await wallet.getFullState()).state;

        if( !cachedState?.isDeployed ) {
            return "0";
        }

        const rawBalance = (await wallet.methods.balance({answerId: 0}).call({cachedState})).value0;
        const bnBalance = new BigNumber(rawBalance);

        if( bnBalance.isZero() ) {
            return "0";
        }

        const decimals = await this.getDecimals();
        return bnBalance.shiftedBy(-decimals).toFixed();
    }

    async getWalletAddress(owner: string): Promise<string> {
        const walletAddress = await this._getWalletAddress(new Address(owner));
        return walletAddress.toString();
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const publicKey = args.keys?.ed25519;
        const decimals = await this.getAndVerifyDecimals();
        const recipientWallet = await this._getWalletAddress(new Address(args.recipient));
        const isRecipientWalletDeployed = await this._isWalletDeployed(recipientWallet);
        const deployWalletValue = isRecipientWalletDeployed ? "0" : TIP3_DEPLOY_WALLET_COST;

        if( publicKey !== undefined ) {
            const sender = await this._deployer.getWalletAddress(publicKey);
            const isSenderDeployed = await this._deployer.isWalletDeployed(sender);

            if( sender.toLowerCase() === args.recipient.toLowerCase() ) {
                throw new UniError("SAME_SENDER_AND_RECIPIENT");
            }

            if( !isSenderDeployed ) {
                const senderWalletAddr = await this._getWalletAddress(new Address(sender));
                const tip3WalletContract = new this._rpc.Contract(TokenWalletABI, ZERO_ADDRESS);

                const tip3Payload = await tip3WalletContract.methods.transfer({
                    recipient: new Address(args.recipient),
                    amount: new BigNumber(args.amount).shiftedBy(decimals).toString(),
                    notify: false,
                    payload: "",
                    deployWalletValue,
                    remainingGasTo: new Address(sender),
                }).encodeInternal();

                return DeploymentRequest.create({
                    rpc: this._rpc,
                    deployer: this._deployer,
                    publicKey: publicKey,
                    sendAfterDeployment: {
                        dest: senderWalletAddr,
                        value: BigNumber.sum(TIP3_TRANSFER_COST, deployWalletValue).toFixed(0),
                        bounce: true,
                        flags: 0,
                        payload: tip3Payload,
                    },
                    checkTransactions: (transactions: Transaction[]) => {
                        return checkTip3Transactions(this._rpc, transactions, new Address(sender), this.id);
                    },
                    chunkFactory: this._chunkFactory,
                    fee: TIP3_STATIC_FEE,
                });
            }
        }

        return Tip3TransferRequest.create({
            rpc: this._rpc,
            deployer: this._deployer,
            root: this._root.address,
            recipient: new Address(args.recipient),
            amount: new BigNumber(args.amount).shiftedBy(decimals).toString(),
            deployWallet: !isRecipientWalletDeployed,
            chunkFactory: this._chunkFactory,
            tokenId: this.id,
        });
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        return this._venomScan.getTokenTransactions({
            root: this._root.address.toString(),
            ...args,
        });
    }

    private async _isWalletDeployed(walletAddress: Address): Promise<boolean> {
        const key = walletAddress.toString().toLowerCase();
        let isDeployed = this._deployedWallets.has(key);

        if( !isDeployed ) {
            isDeployed = !!(await this._rpc.getFullContractState({address: walletAddress})).state?.isDeployed;

            if( isDeployed ) {
                this._deployedWallets.add(key);
            }
        }

        return isDeployed;
    }

    private async _getWalletAddress(owner: Address): Promise<Address> {
        const key = owner.toString().toLowerCase();
        const cachedWallet = this._walletByOwner.get(key);

        if( !!cachedWallet ) {
            return cachedWallet;
        }

        const wallet = (await this._root.methods.walletOf({
            answerId: 0,
            walletOwner: owner,
        }).call()).value0;

        if( !this._walletByOwner.has(key) ) {
            this._walletByOwner.set(key, wallet);
        }

        return wallet;
    }

    protected async _doGetMetadata(): Promise<BasicTokenMetadata> {
        const cachedState = await this._root.getFullState().then(x => x.state);
        if( !cachedState ) {
            throw new UniError("INTERNAL_ERROR", `Token root is not deployed : ${this._root.address.toString()}`);
        }

        const decimals = await this._root.methods
            .decimals({answerId: 0})
            .call({cachedState})
            .then(x => x.value0);

        const name = await this._root.methods
            .name({answerId: 0})
            .call({cachedState})
            .then(x => x.value0);

        const symbol = await this._root.methods
            .symbol({answerId: 0})
            .call({cachedState})
            .then(x => x.value0);

        return {
            name,
            symbol,
            decimals: parseNumberOrFail(decimals),  // todo: parseIntOrFail
        };
    }

    getAddress(): string {
        return this._root.address.toString();
    }
}


///////////////////////////////////////////////////////////////////////////////
const TIP3_TRANSFER_STRUCTURE = [
    { name: "timestamp", type: "uint64" },
    {
        components: [
            { name: "tokenRoot", type: "address" },
            { name: "amount", type: "uint128" },
            { name: "recipient", type: "address" },
            { name: "deployWalletValue", type: "uint128" },
            { name: "remainingGasTo", type: "address" },
            { name: "notify", type: "bool" },
            { name: "payload", type: "cell" },
            { name: "value", type: "uint128" }
        ],
        name: "tokenTransfers",
        type: "tuple[]"
    }
] as const;


///////////////////////////////////////////////////////////////////////////////
async function checkTip3Transactions(
    rpc: ProviderRpcClient, 
    transactions: Transaction[], 
    sender: Address,
    tokenId: string,
) {
    const tip3WalletContract = new rpc.Contract(TokenWalletABI, ZERO_ADDRESS);

    for( const tx of transactions ) {
        if( !tx.inMessage.src ||
            !tx.inMessage.dst ||
            !tx.inMessage.dst.equals(sender) ||
            tx.inMessage.src.equals(tx.inMessage.dst)
        ) {
            continue;
        }

        const decoded = await tip3WalletContract.decodeTransaction({
            transaction: tx,
            methods: ["transfer"],
        });

        if( !decoded ) {
            continue;
        }

        if( tx.exitCode === Tip3ErrorCodes.NOT_ENOUGH_BALANCE ) {
            throw new UniLowBalanceError(tokenId);
        }
    }

    if( transactions.some(x => x.aborted) ) {
        throw new UniError("INTERNAL_ERROR");
    }
}

import * as nt from "nekoton-wasm";
import { Buffer } from "buffer";
import { Mutex } from "@broxus/await-semaphore";
import { BigNumber } from "bignumber.js";
import { ProviderRpcClient, Address, Transaction } from "everscale-inpage-provider";
import { Account, SimpleAccountsStorage, AccountsStorageContext, PrepareMessageParams } from "everscale-standalone-client";
import { CardWalletABI, CardWalletTvc } from "./abi/CardWallet";
import { VenomRequestChunkFactory } from "./request";
import { waitForTransactionTree } from "./tx-utils";
import { Logger, Request } from "../common";
import { UniError, UniLowBalanceError } from "../errors";
import * as constants from "./constants";
import { Ed25519RequestChunk } from "../request-chunks";
import { validateHex256, validateHex512 } from "../utils";

class DummyAccount implements Account {

    readonly address: Address;
    private readonly _publicKey: string;
    private readonly _message: nt.SignedMessage;

    constructor(args: {
        address: Address, 
        publicKey: string,
        message: nt.SignedMessage,
    }) {
        this.address = args.address;
        this._publicKey = args.publicKey;
        this._message = args.message;
    }

    async fetchPublicKey(_ctx: AccountsStorageContext): Promise<string> {
        return this._publicKey;
    }

    async prepareMessage(_args: PrepareMessageParams, _ctx: AccountsStorageContext): Promise<nt.SignedMessage> {
        return this._message;
    }
}

export class Deployer {

    static readonly MIN_BALANCE = constants.DEPLOYER_MIN_BALANCE;

    private readonly _rpc: ProviderRpcClient;
    private readonly _accountsStorage: SimpleAccountsStorage;
    private readonly _mutex: Mutex;

    constructor(args: {
        rpc: ProviderRpcClient, 
        accountsStorage: SimpleAccountsStorage,
        logger?: Logger,
    }) {
        this._rpc = args.rpc;
        this._accountsStorage = args.accountsStorage;
        this._mutex = new Mutex();
    }

    async getWalletAddress(publicKey: string): Promise<string> {
        validateHex256(publicKey);
        const address = await this._getWalletAddress(publicKey);
        return address.toString();
    }

    async isWalletDeployed(address: string): Promise<boolean> {
        return !!(await this._rpc.getFullContractState({
            address: new Address(address),
        })).state?.isDeployed;
    }

    async getWalletBalance(address: string): Promise<string> {
        const state = await this._rpc.getFullContractState({address: new Address(address)});
        const rawBalance = new BigNumber(state.state?.balance ?? "0");
        return rawBalance.shiftedBy(-constants.VENOM_NATIVE_COIN_DECIMALS).toFixed();
    }

    async buildDeploymentMessage(publicKey: string, postMsgData?: string): Promise<nt.UnsignedMessage> {
        validateHex256(publicKey);

        const { address, stateInit } = await this._rpc.getStateInit(CardWalletABI, {
            publicKey: publicKey,
            tvc: CardWalletTvc,
            initParams: {},
        });

        return nt.createExternalMessage(
            new nt.ClockWithOffset(),
            address.toString(),
            JSON.stringify(CardWalletABI),
            "constructor",
            stateInit,
            {
                transactionLifeTime: constants.TRANSACTION_LIFE_TIME,
                postMsgBody: postMsgData ?? null,
            },
            publicKey,
            ~~constants.WALLET_DEPLOYMENT_TIMEOUT,
        );
    }

    async deployWallet(args: {
        publicKey: string,
        message: nt.UnsignedMessage,
        signature: string,
    }): Promise<Transaction> {
        validateHex256(args.publicKey);
        validateHex512(args.signature);

        const signature = Buffer.from(args.signature, "hex");
        const address = await this._getWalletAddress(args.publicKey);
        const signedMessage = await args.message.sign(signature.toString("base64"));

        return this._mutex.use(async () => {
            this._accountsStorage.addAccount(
                new DummyAccount({
                    publicKey: args.publicKey,
                    message: signedMessage,
                    address,
                })
            );

            try {
                const tx = await this._rpc.sendMessage({
                    sender: address,
                    amount: "0",
                    bounce: true,
                    recipient: constants.ZERO_ADDRESS,
                });

                return tx.transaction;
            } 
            finally {
                this._accountsStorage.removeAccount(address);
            }
        });
    }

    private async _getWalletAddress(publicKey: string): Promise<Address> {
        const { address } = await this._rpc.getStateInit(CardWalletABI, {
            publicKey: publicKey,
            tvc: CardWalletTvc,
            initParams: {},
        });

        return address;
    }
}

export class DeploymentRequest implements Request {
    readonly chunks: Ed25519RequestChunk[];

    private readonly _rpc: ProviderRpcClient;
    private readonly _deployer: Deployer;
    private readonly _publicKey: string;
    private readonly _message: nt.UnsignedMessage;
    private readonly _checkTransactions?: (transactions: Transaction[]) => Promise<void>;
    private readonly _fee?: string;

    private constructor(args: {
        rpc: ProviderRpcClient,
        deployer:  Deployer,
        publicKey: string,
        message: nt.UnsignedMessage,
        chunks: Ed25519RequestChunk[],
        checkTransactions?: (transactions: Transaction[]) => Promise<void>,
        fee?: string,
    }) {
        this.chunks = args.chunks;
        this._rpc = args.rpc;
        this._deployer = args.deployer;
        this._publicKey = args.publicKey;
        this._message = args.message;
        this._checkTransactions = args.checkTransactions;
        this._fee = args.fee;
    }

    static async create(args: {
        rpc: ProviderRpcClient,
        deployer:  Deployer,
        publicKey: string,
        chunkFactory: VenomRequestChunkFactory,
        sendAfterDeployment?: {
            dest: Address,
            value: string,
            bounce: boolean,
            flags: number,
            payload: string,
        },
        checkTransactions?: (transactions: Transaction[]) => Promise<void>,
        fee?: string,
    }): Promise<DeploymentRequest> {
        validateHex256(args.publicKey);

        let minBalance = new BigNumber(Deployer.MIN_BALANCE);
        let payload: string | undefined;

        if( args.sendAfterDeployment !== undefined ) {
            const account = new args.rpc.Contract(CardWalletABI, constants.ZERO_ADDRESS);

            payload = await account.methods
                .sendTransaction(args.sendAfterDeployment)
                .encodeInternal();

            minBalance = minBalance.plus(args.sendAfterDeployment.value);
        }

        const walletAddress = await args.deployer.getWalletAddress(args.publicKey);
        const walletState = await args.rpc.getFullContractState({address: new Address(walletAddress)});
        const balance = new BigNumber(walletState.state?.balance ?? "0");

        if( balance.lte(minBalance) ) {
            throw new UniLowBalanceError("_");
        }

        const message = await args.deployer.buildDeploymentMessage(args.publicKey, payload);
        const chunk = await args.chunkFactory.create({
            hash: message.hash,
            expectedPublicKey: args.publicKey,
        });

        return new DeploymentRequest({ 
            chunks: [chunk],
            message,
            ...args
        });
    }

    async estimateFee(): Promise<string> {
        return new BigNumber(this._fee ?? "0").shiftedBy(-constants.VENOM_NATIVE_COIN_DECIMALS).toFixed();
    }

    async send(): Promise<string> {
        const signature = this.chunks[0].signature;

        if( !signature ) {
            throw new UniError("INVALID_ARGUMENT", "Request is not signed");
        }

        validateHex512(signature);

        const tx = await this._deployer.deployWallet({
            publicKey: this._publicKey, 
            message: this._message,
            signature,
        });

        if( tx.aborted ) {
            throw new UniError("INTERNAL_ERROR");
        }

        const transactions = await waitForTransactionTree(this._rpc, tx);

        if( !!this._checkTransactions ) {
            await this._checkTransactions(transactions);
        }

        return tx.id.hash;
    }
}

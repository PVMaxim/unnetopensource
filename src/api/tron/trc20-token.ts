import { z } from "zod";
import { formatUnits, parseUnits } from "ethers";
import { TronWeb, Contract } from "tronweb";
import BigNumber from "bignumber.js";
import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { UniError, UniLowBalanceError } from "../errors";
import { BalanceReader } from "../evm/balance-reader";
import { HttpClient } from "../http-client";
import { PriceProvider } from "../pricing";
import { BasicTokenMetadata, GenericTokenBase } from "../token-base";
import { parseNumberOrFail, getSecp256k1Key, LazyValue } from "../utils";
import { TronRequest, calcTronAddress } from "./request";


///////////////////////////////////////////////////////////////////////////////
export const TRC20_ABI = [
    {
        constant:true,
        inputs: [], 
        name: "name", outputs: [{name: "", type: "string"}],
        payable: false, 
        stateMutability: "view", 
        type: "function"
    },
    {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{name:"", type: "string"}],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{name: "", type: "uint8"}],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [{name: "who", type: "address"}],
        name: "balanceOf",
        outputs: [{name: "", type: "uint256"}],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [{name: "_owner", type: "address"}, {name: "_spender", type: "address"}],
        name: "allowance",
        outputs: [{name: "", type: "uint256"}],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    }
];


///////////////////////////////////////////////////////////////////////////////
const Trc20TransfersSchema = z.object({
    total: z.number(),
    token_transfers: z.object({
        transaction_id: z.string(),
        block_ts: z.number(),
        from_address: z.string(),
        to_address: z.string(),
        quant: z.coerce.bigint(),
        confirmed: z.boolean(),
        finalResult: z.string(),
    }).array(),
});


///////////////////////////////////////////////////////////////////////////////
export class Trc20Token extends GenericTokenBase implements Token {

    private readonly MAX_TRANSACTIONS = 50;

    private readonly _provider: TronWeb;
    private readonly _scannerApi: HttpClient;
    private readonly _contract: Contract;
    private readonly _address: string;
    private readonly _formatTxUrl: (txHash: string) => string;
    private readonly _balanceReader: BalanceReader;

    constructor(args: {
        provider: TronWeb,
        scannerApi: HttpClient,
        priceProvider: PriceProvider,
        formatTxUrl: (txHash: string) => string;
        address: string,
        ticker: LazyValue<string | undefined>,
        balanceReader: BalanceReader,
        name?: string,
        symbol?: string,
        decimals?: number,
        isMandatory?: boolean,
    }) {
        super({
            ...args,
            id: args.address,
        });

        this._provider = args.provider;
        this._scannerApi = args.scannerApi;
        this._address = args.address;
        this._contract = this._provider.contract(TRC20_ABI, args.address);
        this._formatTxUrl = args.formatTxUrl;

        this._balanceReader = args.balanceReader;
        this._balanceReader.registerToken(this.id);
    }

    static async checkTokenOnChain(args: {
        provider: TronWeb,
        address: string,
    }): Promise<boolean> {
        const contract = args.provider.contract(TRC20_ABI, args.address);

        try {
            await contract.name().call();
            await contract.symbol().call();
            await contract.decimals().call();
        } 
        catch(e: any) {
            const error = `${e}`;
            if( error.includes("Smart contract is not exist") || 
                error.includes("REVERT opcode executed") 
            ) {
                return false;
            } else {
                throw e;
            }
        }

        return true;
    }

    async getBalance(owner: string): Promise<string> {
        if( !TronWeb.isAddress(owner) ) {
            return "0";
        }

        const balance = await this._balanceReader.getTokenBalance(this.id, owner);
        if( balance === BigInt(0) ) {
            return "0";
        }

        const decimals = await this.getDecimals();
        return formatUnits(balance, decimals);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !TronWeb.isAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const data = await this._scannerApi.getTyped({
            schema: Trc20TransfersSchema,
            url: "api/token_trc20/transfers",
            params: {
                start: "0",
                limit: this.MAX_TRANSACTIONS.toString(),
                contract_address: this._address,
                relatedAddress: args.owner,
            },
        });

        const offset = args.offset ?? 0;
        const decimals = await this.getDecimals();
        const allItems: TransactionInfo[] = data.token_transfers
            .map(x => ({
                id: x.transaction_id,
                success: x.finalResult === "SUCCESS",
                confirmed: true,
                direction: (x.from_address.toLowerCase() === args.owner.toLowerCase()) ? "out" : "in",
                timestamp: ~~(x.block_ts / 1000),
                amount: formatUnits(x.quant, decimals),
                scannerUrl: this._formatTxUrl(x.transaction_id),
            }));

        return {
            total: allItems.length,
            items: allItems.slice(offset, offset + args.limit),
        };
    }

    async getApprovedAmount(args:{owner: string, spender: string}): Promise<string> {
        return await this._contract.allowance(args.owner, args.spender).call();
    }

    async approve(args: {
        spender: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const publicKey = getSecp256k1Key(args.keys);
        const sender = calcTronAddress(publicKey);

        const decimals = await this.getAndVerifyDecimals();
        const amount = parseUnits(args.amount.toString(), decimals);
        const functionSelector = "approve(address,uint256)";
        const parameters = [
            {type: "address", value: args.spender},
            {type: "uint256", value: amount},
        ];

        const dryRunTx = await this._provider.transactionBuilder.triggerConstantContract(
            this._address, functionSelector, {}, parameters, sender
        );

        const tx = await this._provider.transactionBuilder.triggerSmartContract(
            this._address, functionSelector, {}, parameters, sender
        );

        return TronRequest.create({
            provider: this._provider,
            publicKey,
            transaction: tx.transaction,
            energy: dryRunTx.energy_used ?? 0,
        });
    }

    async transfer(args: { 
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const publicKey = getSecp256k1Key(args.keys);
        const sender = calcTronAddress(publicKey);

        if( !TronWeb.isAddress(args.recipient) ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid address : ${args.recipient}`);
        }

        // todo: normalize recipient
        if( sender === args.recipient ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const decimals = await this.getAndVerifyDecimals();
        const amount = parseUnits(args.amount.toString(), decimals);
        const balance = BigInt(await this._contract.balanceOf(sender).call());

        if( amount > balance ) {
            throw new UniLowBalanceError(this.id);
        }

        const functionSelector = "transfer(address,uint256)";
        const parameters = [
            {type: "address", value: args.recipient},
            {type: "uint256", value: amount},
        ];

        const dryRunTx = await this._provider.transactionBuilder.triggerConstantContract(
            this._address, functionSelector, {}, parameters, sender
        );

        const tx = await this._provider.transactionBuilder.triggerSmartContract(
            this._address, functionSelector, {}, parameters, sender
        );

        return TronRequest.create({
            provider: this._provider,
            publicKey,
            transaction: tx.transaction,
            energy: dryRunTx.energy_used ?? 0,
        });
    }

    protected async _doGetMetadata(): Promise<BasicTokenMetadata> {
        // todo: use multicall
        const name = await this._contract.name().call();
        const symbol = await this._contract.symbol().call();
        const decimals = parseNumberOrFail(await this._contract.decimals().call());

        return { name, symbol, decimals };
    }

    async swap(args: {
        to: string,
        tronRouterAddrees: string,
        functionName: string,
        options: {
            feeLimit: number,
            callValue: number,
            _isConstant?: boolean,
        },
        parameter: any,
        fromAddress: string,
        keys: CardKeys,
    }): Promise<Request> {
        const publicKey = getSecp256k1Key(args.keys);
        const increasedFeeLimit = new BigNumber(args.options.feeLimit).multipliedBy(1.15).toNumber();

        const dryRunTx = await this._provider.transactionBuilder.triggerConstantContract(
            args.tronRouterAddrees,
            args.functionName,
            args.options,
            args.parameter,
            this._provider.address.fromHex(args.fromAddress)
        );

        const tx = await this._provider.transactionBuilder.triggerSmartContract(
            args.tronRouterAddrees,
            args.functionName,
            {feeLimit: increasedFeeLimit, callValue: args.options.callValue},
            args.parameter,
            this._provider.address.fromHex(args.fromAddress)
        );

        return TronRequest.create({
            provider: this._provider,
            publicKey,
            transaction: tx.transaction,
            energy: dryRunTx.energy_used ?? 0,
        });
    }

    getAddress(): string {
        return this._address;
    }
}

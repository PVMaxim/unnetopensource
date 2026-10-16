import { z } from "zod";
import { Address, Cell, JettonMaster, JettonWallet, SendMode, beginCell, fromNano, internal, toNano } from "@ton/ton";
import { CardKeys, Request, Token, TransactionInfo, TokenTransactionInfo } from "../common";
import { UniError, UniLowBalanceError } from "../errors";
import { PriceProvider } from "../pricing";
import { BasicTokenMetadata, GenericTokenBase } from "../token-base";
import { LazyValue, fromBlockchainUnits, toBlockchainUnits } from "../utils";
import { UniTonCore, base64ToSafe } from "./core";

const JETTON_DEFAULT_DECIMALS = 9;

const JettonMetadataSchema = z.object({
    uri: z.string().url().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    image: z.string().url().optional(),
    image_data: z.string().optional(),
    symbol: z.string().optional(),
    decimals: z.coerce.number().positive().optional(),
    amount_style: z.string().optional(),
    render_type: z.string().optional(),
});

const JettonMastersResponseSchema = z.object({
    jetton_masters: z.object({
        address: z.string(),
        admin_address: z.string().nullable().optional(),
        code_hash: z.string(),
        data_hash: z.string(),
        jetton_content: JettonMetadataSchema,
        jetton_wallet_code_hash: z.string(),
        last_transaction_lt: z.string(),
        mintable: z.boolean(),
        total_supply: z.string(),
    }).array(),
    address_book: z.record(z.string(), z.object({
        user_friendly: z.string(),
    })),
});

const JettonTransferResponseSchema = z.object({
    jetton_transfers: z.object({
        query_id: z.string(),
        source: z.string(),
        destination: z.string(),
        amount: z.coerce.bigint(),
        source_wallet: z.string(),
        jetton_master: z.string(),
        transaction_hash: z.string(),
        transaction_lt: z.coerce.number().positive(),
        transaction_now: z.coerce.number().positive(),
        transaction_aborted: z.boolean(),
        response_destination: z.string(),
        custom_payload: z.string().nullable(),
        forward_ton_amount: z.coerce.number(),
        forward_payload: z.string().nullable(),
        trace_id: z.string(),
    }).array(),
    address_book: z.record(z.string(), z.object({
        user_friendly: z.string(),
    })),
});

export class Jetton extends GenericTokenBase implements Token {

    private readonly MAX_TRANSACTIONS = 50;

    private readonly _core: UniTonCore;
    private readonly _address: Address;
    private readonly _cachedWallets: Map<string, LazyValue<Address>>;

    constructor(args: {
        core: UniTonCore,
        priceProvider: PriceProvider,
        address: string,
        ticker: LazyValue<string | undefined>,
        name?: string,
        symbol?: string,
        decimals?: number,
        isMandatory?: boolean,
    }) {
        super({
            ...args,
            id: args.address,
        });

        this._core = args.core;
        this._address = Address.parse(args.address);
        this._cachedWallets = new Map();
    }

    static async checkTokenOnChain(args: {
        core: UniTonCore,
        address: string,
    }): Promise<boolean> {
        const rawAddress = Address.parse(args.address).toRawString().toUpperCase();

        const data = await args.core.indexerApi.getTyped({
            schema: JettonMastersResponseSchema,
            url: "api/v3/jetton/masters",
            params: {
                address: rawAddress,
            },
        });

        return data.jetton_masters.length === 1 &&
               data.jetton_masters[0].address.toUpperCase() === rawAddress;
    }

    async getBalance(owner: string): Promise<string> {
        let ownerAddress: Address;
        try {
            ownerAddress = Address.parse(owner);
        } catch(error) {
            return "0";
        }

        const walletAddress = await this._getCachedTokenWallet(ownerAddress);
        const walletContract = this._core.client.open(JettonWallet.create(walletAddress));
        const rawBalance = await walletContract.getBalance();

        if( rawBalance === BigInt(0) ) {
            return "0";
        }

        const decimals = await this.getDecimals();
        return fromBlockchainUnits(rawBalance, decimals);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        const safeOwner = Address.parse(args.owner).toRawString().toUpperCase();
        const safeMaster = this._address.toRawString();

        const parsedData = await this._core.indexerApi.getTyped({
            schema: JettonTransferResponseSchema,
            url: "api/v3/jetton/transfers",
            params: {
                owner_address: safeOwner,
                jetton_master: safeMaster,
                limit: this.MAX_TRANSACTIONS.toString(),
                sort: "desc",
            },
        });

        const offset = args.offset ?? 0;
        const rawItems = parsedData.jetton_transfers.slice(offset, offset + args.limit);
        const decimals = await this.getDecimals();

        const items: TransactionInfo[] = rawItems.map(x => ({
            id: base64ToSafe(x.transaction_hash),
            success: !x.transaction_aborted,
            confirmed: true,
            amount: fromBlockchainUnits(x.amount, decimals),
            direction: x.source.toUpperCase() === safeOwner ? "out" : "in",
            scannerUrl: this._core.formatTxUrl(x.transaction_hash),
            timestamp: x.transaction_now,
        }));

        return { 
            total: parsedData.jetton_transfers.length, 
            items,
        };
    }

    async transfer(args: { 
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const owner = this._core.getWalletAddress(args.keys ?? {});
        const jettonWalletAddress = await this._getTokenWalletAddress(owner);
        const toAddress = Address.parse(args.recipient);

        if( owner.equals(toAddress) ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const queryId = 0;
        const decimals = await this.getAndVerifyDecimals();
        const jettonAmount = toBlockchainUnits(args.amount, decimals);
        const forwardAmount = 1;

        const walletContract = this._core.client.open(JettonWallet.create(jettonWalletAddress));
        const balance = await walletContract.getBalance();

        if( jettonAmount > balance ) {
            throw new UniLowBalanceError(this.id);
        }

        const cell = beginCell()
            .storeUint(0xf8a7ea5, 32)
            .storeUint(queryId, 64)
            .storeCoins(jettonAmount)
            .storeAddress(toAddress)
            .storeAddress(owner)
            .storeBit(false)
            .storeCoins(forwardAmount)
            .storeBit(false)
            .endCell();

        const message = internal({
            to: jettonWalletAddress,
            value: toNano("0.1"),
            bounce: true,
            body: cell,
        });

        return this._core.createRequest({
            keys: args.keys,
            messages: [message],
            sendMode: SendMode.IGNORE_ERRORS | SendMode.PAY_GAS_SEPARATELY,
        });
    }

    protected async _doGetMetadata(): Promise<BasicTokenMetadata> {
        const rawAddress = this._address.toRawString().toUpperCase();

        const parsedData = await this._core.indexerApi.getTyped({
            schema: JettonMastersResponseSchema,
            url: "api/v3/jetton/masters",
            params: {
                address: rawAddress,
            },
        });

        if( parsedData.jetton_masters.length !== 1 || 
            parsedData.jetton_masters[0].address.toUpperCase() !== rawAddress ) {
            throw new UniError("SERVER_ERROR", `Token not found : ${this._address}`);
        }

        const item = parsedData.jetton_masters[0];
        const externalMetadata = await this._fetchExternalMetadata(item.jetton_content.uri);
        const metadata = { ...externalMetadata, ...item.jetton_content };

        if( !metadata.name || !metadata.symbol ) {
            throw new UniError("SERVER_ERROR", `Invalid token : ${this._address}`);
        }

        return {
            name: metadata.name,
            symbol: metadata.symbol,
            decimals: metadata.decimals ?? JETTON_DEFAULT_DECIMALS,
        };
    }

    private async _fetchExternalMetadata(url?: string) {
        if( !url ) {
            return {};
        }

        return await this._core.indexerApi.getTyped({
            schema: JettonMetadataSchema,
            url: "jetton-meta",
            params: {
                href: url,
            },
        });
    }

    private _getTokenWalletAddress(owner: Address): Promise<Address> {
        const masterContract = this._core.client.open(JettonMaster.create(this._address));
        return masterContract.getWalletAddress(owner);
    }

    async swap(args: {
        address: string,
        amount: string,
        payload?: string,
        keys?: CardKeys,
    }): Promise<Request> {
        let payload;

        if( args.payload ) {
          try {
            payload = Cell.fromBase64(args.payload);
          } catch (error) {
            payload = Cell.fromHex(args.payload);
          } 
        }

        const message = internal({
            to: Address.parse(args.address),
            value: fromNano(args.amount),
            bounce: !!args.payload,
            body: payload,
        });

        return this._core.createRequest({
            keys: args.keys,
            messages: [message],
            sendMode: SendMode.IGNORE_ERRORS | SendMode.PAY_GAS_SEPARATELY,
        });
    }

    private _getCachedTokenWallet(owner: Address): Promise<Address> {
        const key = owner.toRawString();
        let lazyWallet = this._cachedWallets.get(key);

        if( !lazyWallet ) {
            lazyWallet = new LazyValue(() => this._getTokenWalletAddress(owner));
            this._cachedWallets.set(key, lazyWallet);
        }

        return lazyWallet.get();
    }

    getAddress(): string {
        return this._address.toString();
    }
}

export async function getJettonTransactions(args: {
    core: UniTonCore,
    owner: string,
    limit: number,
    knownTokens: Token[],
}): Promise<TokenTransactionInfo[]> {
    const safeOwner = Address.parse(args.owner).toRawString().toUpperCase();

    const parsedData = await args.core.indexerApi.getTyped({
        schema: JettonTransferResponseSchema,
        url: "api/v3/jetton/transfers",
        params: {
            owner_address: safeOwner,
            limit: args.limit.toString(),
            sort: "desc",
        },
    });

    const result: TokenTransactionInfo[] = [];
    for( const item of parsedData.jetton_transfers ) {
        const masterAddress = Address.parse(item.jetton_master).toString();
        const token = args.knownTokens.find(x => x.id === masterAddress);

        if( !token ) {
            continue;
        }

        const decimals = await token.getDecimals();
        result.push({
            id: base64ToSafe(item.transaction_hash),
            tokenId: masterAddress,
            success: !item.transaction_aborted,
            confirmed: true,
            amount: fromBlockchainUnits(item.amount, decimals),
            direction: item.source.toUpperCase() === safeOwner ? "out" : "in",
            scannerUrl: args.core.formatTxUrl(item.transaction_hash),
            timestamp: item.transaction_now,
        });
    }

    return result;
}

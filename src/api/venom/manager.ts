import { Buffer } from "buffer";
import { ProviderRpcClient, Address } from "everscale-inpage-provider";
import { EverscaleStandaloneClient, SimpleAccountsStorage } from "everscale-standalone-client";
import { CardKeys, Logger, Token, BlockchainManager, TokenMetadataInput, TokenTransactionInfo } from "../common";
import { BlockchainManagerBase } from "../manager-base";
import { PriceProvider } from "../pricing";
import { getEd25519Key } from "../utils";
import { Deployer } from "./deployer";
import { CustomKeyStore, DummySIDSigner } from "./keystore";
import { VenomRequestChunkFactory } from "./request";
import { NativeToken } from "./tokens/native";
import { Tip3Token } from "./tokens/tip3";
import { WVenomVault } from "./tokens/WVenomVault";
import { VenomScan } from "./venomscan";

export class VenomWalletManager extends BlockchainManagerBase implements BlockchainManager {

    readonly type = "venom";
    readonly nativeCoin: Token;

    private readonly _rpc: ProviderRpcClient;
    private readonly _keystore: CustomKeyStore;
    private readonly _deployer: Deployer;
    private readonly _chunkFactory: VenomRequestChunkFactory;
    private readonly _venomScan: VenomScan;

    constructor(args: {
        rpcUrl: string,
        nativeToken: {
            name: string,
            symbol: string,
            ticker?: string,
        },
        txUrlFormatter: (id: string) => string
        priceProvider: PriceProvider,
        tokenManifest?: string | TokenMetadataInput[],
        logger?: Logger,
    }) {
        super({
            priceProvider: args.priceProvider,
            tokenManifest: args.tokenManifest,
        });

        this._venomScan = new VenomScan({ txUrlFormatter: args.txUrlFormatter });
        this._keystore = new CustomKeyStore();

        const accountsStorage = new SimpleAccountsStorage();

        this._rpc = new ProviderRpcClient({
            fallback: () => EverscaleStandaloneClient.create({
                connection: {
                    id: 1,
                    type: 'jrpc',
                    data: {
                        endpoint: args.rpcUrl,
                    },
                },
                keystore: this._keystore,
                accountsStorage,
                message: {
                    retryTransfers: false,
                },
            }),
            forceUseFallback: true,
        });

        this._chunkFactory = new VenomRequestChunkFactory(() => this._getSignatureId());

        this._deployer = new Deployer({
            rpc: this._rpc, 
            logger: args.logger,
            accountsStorage,
        });

        this.nativeCoin = new NativeToken({
            rpc: this._rpc, 
            deployer: this._deployer,
            venomScan: this._venomScan,
            chunkFactory: this._chunkFactory,
            priceProvider: args.priceProvider,
            ...args.nativeToken,
        });

        this.addToken(this.nativeCoin);
    }

    getWalletAddress(keys: CardKeys): Promise<string> {
        const publicKey = getEd25519Key(keys);
        return this._deployer.getWalletAddress(publicKey);
    }

    isValidAddress(address: string): boolean {
        return !!address.match(/^[0-9]+:[a-fA-F0-9]{64}$/);
    }

    protected _normalizeAddress(address: string): string {
        return address;
    }

    protected _createToken(metadata: TokenMetadataInput): Token {
        return new Tip3Token({
            ...metadata,
            rpc: this._rpc, 
            deployer: this._deployer,
            root: new Address(metadata.address),
            venomScan: this._venomScan,
            priceProvider: this._priceProvider,
            ticker: this._getLazyTicker(metadata),
            chunkFactory: this._chunkFactory,
        });
    }

    createToken(addressOrMeta: string | TokenMetadataInput) {
        if( typeof addressOrMeta === "string" ) {
            return this._createToken({address: addressOrMeta})
        }

        return this._createToken(addressOrMeta);
    }

    protected _createVault(args: {
        address: string }) {
        return new WVenomVault({
            rpc: this._rpc,
            deployer: this._deployer,
            root: new Address(args.address),
            chunkFactory: this._chunkFactory,
        });
    }

    createVault(address: string) {
        return this._createVault({address})
    }

    protected _checkTokenOnChain(address: string): Promise<boolean> {
        return Tip3Token.checkTokenOnChain({
            rpc: this._rpc, 
            root: new Address(address),
        });
    }

    private async _getSignatureId(): Promise<number | undefined> {

        const data = Buffer.alloc(1).toString("base64");
        const publicKey = Buffer.alloc(32).toString("hex");

        const signer = new DummySIDSigner(publicKey);
        this._keystore.addSigner(signer);

        try {
            await this._rpc.signDataRaw({data, publicKey});
            return signer.lastSignatureId;
        } 
        finally {
            this._keystore.removeSigner(publicKey);
        }
    }

    async getTransactionStatus(txHash: string): Promise<number> {
        const { transaction } = await this._rpc.getTransaction({ hash: txHash});
        if (transaction) {
            return 1;
        } else {
            return 0;
        }
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        const allowedTokens: string[] = [];
        for( const token of this._tokens.values() ) {
            allowedTokens.push(token.id);
        }

        const nativeTxs = await this._venomScan.getNativeTransactions({
            owner: args.owner,
            limit: 50,
        });

        const tokenTxs = await this._venomScan.getTokenTransactions({
            owner: args.owner,
            limit: 50,
        });

        const allTxs = [ ...nativeTxs.items, ...tokenTxs.items ]
            .filter(x => allowedTokens.includes(x.tokenId))
            .sort((a, b) => b.timestamp - a.timestamp);

        const offset = args.offset ?? 0;
        return {
            total: allTxs.length,
            items: allTxs.slice(offset, offset + args.limit),
        };
    }
}

import { Connection } from "@solana/web3.js";
import { CardKeys, Token, BlockchainManager, TokenMetadataInput, TokenTransactionInfo } from "../common";
import { BlockchainManagerBase } from "../manager-base";
import { PriceProvider } from "../pricing";
import { SolanaCore, SOLANA_TX_CONFIRM_TIMEOUT } from "./core";
import { SolanaNativeCoin } from "./native-coin";
import { SplToken } from "./spl-token";

export class SolanaManager extends BlockchainManagerBase implements BlockchainManager {

    readonly type = "solana";
    readonly nativeCoin: Token;

    private readonly _core: SolanaCore;

    constructor(args: {
        rpcUrl: string,
        rpcWsUrl?: string,
        nativeToken: {
            name: string,
            symbol: string,
            ticker?: string,
        },
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
        scannerApiUrl?: string,
        tokenManifest?: string | TokenMetadataInput[],
    }) {
        super({
            priceProvider: args.priceProvider,
            tokenManifest: args.tokenManifest,
        });

        this._core = new SolanaCore({
            rpc: new Connection(args.rpcUrl, {
                commitment: "confirmed",
                confirmTransactionInitialTimeout: SOLANA_TX_CONFIRM_TIMEOUT,
                wsEndpoint: args.rpcWsUrl,
            }),
            scannerApiUrl: args.scannerApiUrl,
            formatTxUrl: args.txUrlFormatter,
        });

        this.nativeCoin = new SolanaNativeCoin({
            core: this._core,
            priceProvider: args.priceProvider,
            ...args.nativeToken,
        });

        this.addToken(this.nativeCoin);
    }

    async getWalletAddress(keys: CardKeys): Promise<string> {
        return this._core.getWalletAddress(keys);
    }

    isValidAddress(address: string): boolean {
        return this._core.isValidAddress(address);
    }

    protected _normalizeAddress(address: string): string {
        return address;
    }

    protected _createToken(metadata: TokenMetadataInput): Token {
        return new SplToken({
            ...metadata,
            core: this._core,
            priceProvider: this._priceProvider,
            ticker: this._getLazyTicker(metadata),
        });
    }

    protected async _checkTokenOnChain(address: string): Promise<boolean> {
        return SplToken.checkTokenOnChain({
            core: this._core,
            address,
        });
    }

    getCore(): SolanaCore {
        return this._core;
    }

    async getTransactionStatus(_txHash: string): Promise<number> {
        return 1;
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        if( !this._core.scannerApiClient || !this._core.isValidAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const allowedTokens: string[] = [];
        for( const token of this._tokens.values() ) {
            allowedTokens.push(token.id);
        }

        return this._core.scannerApiClient.getTransactions2({
            ...args,
            allowedTokens,
        });
    }
}

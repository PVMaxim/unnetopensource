import { ethers } from "@coti-io/coti-ethers";
import { CardKeys, Token, BlockchainManager, TokenMetadataInput, Request, Storage, TokenTransactionInfo } from "../common";
import { BlockchainManagerBase } from "../manager-base";
import { PriceProvider } from "../pricing";
import { CotiScanHistory } from "./cotiscan";
import { CotiCore } from "./core";
import { CotiNativeCoin } from "./native-coin";
import { CotiErc20Token } from "./erc20-token";


///////////////////////////////////////////////////////////////////////////////
export class CotiManager extends BlockchainManagerBase implements BlockchainManager {

    readonly type = "coti";
    readonly core: CotiCore;
    readonly nativeCoin: Token;

    constructor(args: {
        chainId: number,
        rpcUrl: string,
        scannerApiUrl: string,
        nativeToken: {
            name: string,
            symbol: string,
            ticker?: string,
        },
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
        storage?: Storage,
        tokenManifest?: string | TokenMetadataInput[],
    }) {
        super({
            priceProvider: args.priceProvider,
            tokenManifest: args.tokenManifest,
        });

        this.core = new CotiCore({
            provider: new ethers.JsonRpcProvider(args.rpcUrl, args.chainId, {staticNetwork: true}),
            priceProvider: args.priceProvider,
            history: new CotiScanHistory({
                baseUrl: args.scannerApiUrl,
                txUrlFormatter: args.txUrlFormatter,
            }),
            txUrlFormatter: args.txUrlFormatter,
            storage: args.storage,
        });

        this.nativeCoin = new CotiNativeCoin({
            ...args.nativeToken,
            core: this.core,
        });

        this.addToken(this.nativeCoin);
    }

    isOnBoarded(keys: CardKeys): Promise<boolean> {
        return this.core.isOnBoarded(this.core.getWalletAddress(keys));
    }

    performOnBoarding(keys: CardKeys): Promise<Request> {
        return this.core.performOnBoarding(keys);
    }

    async getWalletAddress(keys: CardKeys): Promise<string> {
        return this.core.getWalletAddress(keys);
    }

    isValidAddress(address: string): boolean {
        return ethers.isAddress(address);
    }

    protected _normalizeAddress(address: string): string {
        return address.toLowerCase();
    }

    protected _createToken(metadata: TokenMetadataInput): Token {
        return new CotiErc20Token({
            ...metadata,
            core: this.core,
            ticker: this._getLazyTicker(metadata),
        });
    }

    protected _checkTokenOnChain(address: string): Promise<boolean> {
        return CotiErc20Token.checkTokenOnChain({
            provider: this.core.provider,
            address,
        });
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        if( !ethers.isAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const allowedTokens: string[] = [];
        for( const token of this._tokens.values() ) {
            allowedTokens.push(token.id);
        }

        const offset = args.offset ?? 0;
        const nativeTxs = await this.core.history.getNativeTransactions(args.owner);
        const tokenTxs = await this.core.history.getAllTokenTransactions(args.owner);
        // todo: include secure tokens

        const txs = [
            ...tokenTxs.filter(x => allowedTokens.includes(x.tokenId)),
            ...nativeTxs.map(x => ({ ...x, tokenId: "_" })),
        ].sort((a, b) => b.timestamp - a.timestamp);

        return {
            total: txs.length,
            items: txs.slice(offset, offset + args.limit),
        };
    }
}

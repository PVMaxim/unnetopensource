import { BlockchainManager, CardKeys, Token, TokenMetadataInput, TokenTransactionInfo } from "../common";
import { BlockchainManagerBase } from "../manager-base";
import { PriceProvider } from "../pricing";
import { XrplNativeCoin } from "./native-coin";
import { XrplCore } from "./core";
import { XrplToken, parseTokenId } from "./token";

export class XrplManager extends BlockchainManagerBase implements BlockchainManager {

    readonly type = "xrpl";
    readonly nativeCoin: Token;
    readonly core: XrplCore;

    constructor(args: {
        rpcUrl: string,
        nativeToken: {
            name: string,
            symbol: string,
            ticker?: string,
        },
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
        tokenManifest?: string | TokenMetadataInput[],
    }) {
        super({
            priceProvider: args.priceProvider,
            tokenManifest: args.tokenManifest,
        });

        this.core = new XrplCore(args);

        this.nativeCoin = new XrplNativeCoin({
            core: this.core,
            priceProvider: args.priceProvider,
            ...args.nativeToken,
        });

        this.addToken(this.nativeCoin);
    }

    async getWalletAddress(keys: CardKeys): Promise<string> {
        return this.core.getWalletAddress(keys);
    }

    isValidAddress(address: string): boolean {
        return this.core.isValidAddress(address);
    }

    protected _normalizeAddress(address: string): string {
        return address;
    }

    protected _createToken(metadata: TokenMetadataInput): Token {
        return new XrplToken({
            ...metadata,
            core: this.core,
            priceProvider: this._priceProvider,
            ticker: this._getLazyTicker(metadata),
        });
    }

    protected async _checkTokenOnChain(address: string): Promise<boolean> {
        return XrplToken.checkTokenOnChain({
            core: this.core,
            address,
        });
    }

    protected _isValidTokenAddress(address: string): boolean {
        try {
            parseTokenId(address);
            return true;
        } catch(_) {
            return false;
        }
    }

    async getTransactionStatus(_txHash: string): Promise<number> {
        const provider = await this.core.provider.get();
        const transaction = await provider.request({
            command: 'tx',
            transaction: _txHash,
            binary: false
        })

        let status: string | undefined = undefined;
        if (
            transaction &&
            transaction.result &&
            transaction.result.meta &&
            typeof transaction.result.meta !== "string" &&
            "TransactionResult" in transaction.result.meta
        ) {
            status = (transaction.result.meta as { TransactionResult?: string }).TransactionResult;
        }

        if (status === "tesSUCCESS") {
            return 1;
        } else {
            return 0;
        }
    }

    getTransactions(args: {
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

        return this.core.getAllTransactions({
            ...args,
            allowedTokens,
        });
    }
}
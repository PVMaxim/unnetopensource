import { Token, TokenMetadataInput } from "./common";
import { HttpClient } from "./http-client";
import { TokenManifestSchema } from "./manifests";
import { PriceProvider } from "./pricing";
import { LazyValue } from "./utils";


///////////////////////////////////////////////////////////////////////////////
interface ParsedTokenManifest {
    items: TokenMetadataInput[];
    byAddress: Map<string, TokenMetadataInput>;
}


///////////////////////////////////////////////////////////////////////////////
export abstract class BlockchainManagerBase {

    protected readonly _tokens: Map<string, Token>;
    protected readonly _priceProvider: PriceProvider;
    protected readonly _lazyTokenManifest?: LazyValue<ParsedTokenManifest>;

    protected constructor(args: {
        priceProvider: PriceProvider,
        tokenManifest?: string | TokenMetadataInput[],
    }) {
        this._tokens = new Map();
        this._priceProvider = args.priceProvider;

        const tokenManifest = args.tokenManifest;
        if( typeof tokenManifest === "string" ) {
            this._lazyTokenManifest = new LazyValue(
                () => this._fetchTokenManifest(tokenManifest)
            );
        } else if( !!tokenManifest ) {
            this._lazyTokenManifest = new LazyValue(
                async () => this._parseTokenManifest(tokenManifest)
            );
        }
    }

    addToken(token: Token) {
        if( "setPriceProvider" in token ) {
            (token.setPriceProvider as (p: PriceProvider) => void)(this._priceProvider);
        }

        this._tokens.set(token.id, token);
    }

    addTokenByMetadata(metadata: TokenMetadataInput) {
        const token = this._createToken(metadata);
        this.addToken(token);

        // notify price provider about token if we know its ticker to allow price preloading
        if( metadata.ticker ) {
            this._priceProvider.registerToken(metadata.ticker);
        }
    }

    getToken(id: string): Token | undefined {
        return this._tokens.get(this._normalizeAddress(id));
    }

    getTokens(): Token[] {
        return Array.from(this._tokens.values());
    }

    createToken(metadata: TokenMetadataInput): Token {
        return this._createToken(metadata);
    }

    async findTokens(text: string): Promise<Token[]> {
        const canBeAddress = this._isValidTokenAddress(text);
        const textAsNormAddress = this._normalizeAddress(text);

        // check if already added and text is address
        if( canBeAddress && this._tokens.has(textAsNormAddress) ) {
            return [this._tokens.get(textAsNormAddress)!];
        }

        const textLwr = text.toLowerCase();
        const found: Map<string, Token> = new Map();

        // check if already added and name/symbol contains text
        for( const token of this._tokens.values() ) {
            const name = await token.getName();
            const symbol = await token.getSymbol();

            if( name.toLowerCase().includes(textLwr) ||
                symbol.toLowerCase().includes(textLwr)
            ) {
                found.set(token.id, token);
            }
        }

        // search in token manifest
        if( !!this._lazyTokenManifest ) {
            const manifest = await this._lazyTokenManifest.get();

            for( const item of manifest.items ) {
                const itemAddress = this._normalizeAddress(item.address);

                if( !found.has(itemAddress) &&
                    (
                        item.name && item.name.toLowerCase().includes(textLwr) ||
                        item.symbol && item.symbol.toLowerCase().includes(textLwr) ||
                        canBeAddress && itemAddress === textAsNormAddress
                    )
                ) {
                    const token = this._createToken(item);
                    found.set(token.id, token);
                }
            }
        }

        // search using price provider
        const priceProviderItems = await this._priceProvider.findTokens(textLwr);
        const customPriceProvider = this._priceProvider.clone();
        for( const item of priceProviderItems ) {
            if( !item.address || !this._isValidTokenAddress(item.address) ) {
                continue;
            }

            const token = this._createToken({
                address: item.address,
                ticker: item.ticker,
                name: item.name,
                symbol: item.symbol,
            });

            if( !found.has(token.id) ) {
                if( "setPriceProvider" in token ) {
                    customPriceProvider.registerToken(item.ticker);
                    (token.setPriceProvider as (p: PriceProvider) => void)(customPriceProvider);
                }

                found.set(token.id, token);
            }
        }

        // search on-chain
        if( found.size === 0 && canBeAddress ) {
            const exists = await this._checkTokenOnChain(text);
            if( exists ) {
                return [this._createToken({address: text})];
            }
        }

        return Array.from(found.values());
    }

    protected _getLazyTicker(metadata: TokenMetadataInput): LazyValue<string | undefined> {
        if( metadata.ticker ) {
            return new LazyValue(async () => metadata.ticker);
        }

        return new LazyValue(
            async () => {
                const normAddress = this._normalizeAddress(metadata.address);
                let ticker: string | undefined;

                if( this._lazyTokenManifest ) {
                    const manifest = await this._lazyTokenManifest.get();
                    ticker = manifest.byAddress.get(normAddress)?.ticker;
                }

                if( !ticker ) {
                    ticker = await this._priceProvider.getTickerByAddress(normAddress);
                }

                return ticker;
            },
        );
    }

    private async _fetchTokenManifest(url: string): Promise<ParsedTokenManifest> {
        let items: TokenMetadataInput[] = [];

        try {
            const client = new HttpClient({
                baseUrl: url,
            });

            const manifest = await client.getTyped({
                schema: TokenManifestSchema,
            });

            if( manifest.version === 1 ) {
                items = manifest.tokens;
            }
        } catch(error) {}

        return this._parseTokenManifest(items);
    }

    private _parseTokenManifest(tokens: TokenMetadataInput[]): ParsedTokenManifest {
        return {
            items: tokens,
            byAddress: new Map(tokens.map(x => [this._normalizeAddress(x.address), x])),
        };
    }

    protected _isValidTokenAddress(address: string): boolean {
        return this.isValidAddress(address);
    }

    abstract isValidAddress(address: string): boolean;
    protected abstract _normalizeAddress(address: string): string;
    protected abstract _createToken(metadata: TokenMetadataInput): Token;
    protected abstract _checkTokenOnChain(address: string): Promise<boolean>;
}

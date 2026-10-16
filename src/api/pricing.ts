import { z } from "zod";
import { TokenPriceInfo } from "./common";
import { HttpClient } from "./http-client";
import { CachedValue } from "./utils";

const SimplePriceSchema = z.record(
    z.string(),
    z.object({
        usd: z.number().nonnegative().nullish(),
        usd_24h_change: z.number().nullish(),
    }),
);

const CoinDataSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    platforms: z.record(z.string(), z.string()),
});

const CoinListSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    platforms: z.record(z.string(), z.string()),
}).array();

interface CoinSearchItem {
    name: string;
    symbol: string;
    ticker: string;
    address: string;
    search: string;
}

export class PriceProvider {

    private readonly CACHE_LIFE_TIME = 60 * 1000;
    private readonly COIN_LIST_CACHE_TIME = 3600 * 1000;

    private readonly _client: HttpClient;
    private readonly _platform: string;
    private readonly _registeredTokens: string[];
    private readonly _cachedCoinList: CachedValue<CoinSearchItem[]>;
    private _cachedPrices: Map<string, TokenPriceInfo>;
    private _lastUpdateTime: number;
    private _pending?: Promise<void>;
    private _pendingNumTokens: number;

    constructor(args: {
        host: string,
        platform: string,
    }) {
        this._client = new HttpClient({ baseUrl: args.host });
        this._platform = args.platform;
        this._registeredTokens = [];
        this._cachedPrices = new Map();
        this._lastUpdateTime = 0;
        this._pendingNumTokens = 0;
        this._cachedCoinList = new CachedValue(() => this._getCoinList(), this.COIN_LIST_CACHE_TIME);
    }

    clone(): PriceProvider {
        return new PriceProvider({
            host: this._client.baseUrl.toString(),
            platform: this._platform,
        });
    }

    registerToken(ticker: string): void {
        if( !this._registeredTokens.includes(ticker) ) {
            this._registeredTokens.push(ticker);
            this._registeredTokens.sort();
        }
    }

    async getTickerByAddress(address: string): Promise<string | undefined> {
        if( !this._platform ) {
            return undefined;
        }

        const response = await this._client.fetch({
            url: `api/v3/coins/${this._platform}/contract/${address}`,
            validateStatus: (status: number)=> status === 200 || status === 404,
        });

        if( response.status === 404 ) {
            return undefined;
        }

        const data = await HttpClient.parseTypedResponse({
            response,
            schema: CoinDataSchema,
        });

        if( data.platforms[this._platform] === address ) {
            return data.id;
        }

        return undefined;
    }

    async getPrice(ticker: string): Promise<TokenPriceInfo | undefined> {
        this.registerToken(ticker);

        if( this._isCacheUpToDate() && this._cachedPrices.has(ticker) ) {
            return this._cachedPrices.get(ticker);
        }

        if( !this._pending || this._registeredTokens.length > this._pendingNumTokens ) {
            this._pendingNumTokens = this._registeredTokens.length;
            this._pending = (async () => {
                try {
                    this._cachedPrices = await this._doGetPrices();
                    this._lastUpdateTime = Date.now();
                } catch(err) {
                } finally {
                    if( this._pendingNumTokens === this._registeredTokens.length ) {
                        this._pending = undefined;
                    }
                }

                return undefined;
            })();
        }

        await this._pending;
        return this._cachedPrices.get(ticker);
    }

    async findTokens(text: string): Promise<CoinSearchItem[]> {
        text = text.trim().toLowerCase();

        if( !text.length ) {
            return [];
        }

        const items = await this._cachedCoinList.get();
        return items.filter(x => x.search.includes(text));
    }

    getIconUrl(ticker: string): string {
        return new URL(`__icons/${ticker}`, this._client.baseUrl).toString();
    }

    async _getCoinList(): Promise<CoinSearchItem[]> {
        const items = await this._client.getTyped({
            schema: CoinListSchema,
            url: "api/v3/coins/list",
            params: {
                include_platform: "true",
            },
        });

        const result: CoinSearchItem[] = [];
        for( const item of items ) {
            const address = item.platforms[this._platform];
            if( address ) {
                const search = `${item.name.toLowerCase()}||${item.symbol.toLowerCase()}`;
                result.push({
                    name: item.name,
                    symbol: item.symbol.toUpperCase(),
                    ticker: item.id,
                    address,
                    search,
                });
            }
        }

        return result;
    }

    async getTokenPriceByAddress(id:string, tokenAddress: string): Promise<number>{
        const response = await this._client.fetch({
            url: `token_price/${id}/?contract_addresses=${tokenAddress}&vs_currencies=usd`,
            validateStatus: (status: number)=> status === 200 || status === 404,
        });
        const data = await response.json();

        return data[tokenAddress]?.usd || 0;
    }

    async getTokenPriceByIds(id:string): Promise<number>{
        const response = await this._client.fetch({
            url: `price/?ids=${id}&vs_currencies=usd`,
            validateStatus: (status: number)=> status === 200 || status === 404,
        });

        const data = await response.json();

        return data[id]?.usd || 0;
    }

    private _isCacheUpToDate(): boolean {
        return Date.now() < (this._lastUpdateTime + this.CACHE_LIFE_TIME);
    }

    private async _doGetPrices() {
        const data = await this._client.getTyped({
            schema: SimplePriceSchema,
            url: "api/v3/simple/price",
            params: {
                ids: this._registeredTokens.join(","),
                vs_currencies: "usd",
                include_24hr_change: "true",
            },
        });

        const result: Map<string, TokenPriceInfo> = new Map();
        for( const ticker of this._registeredTokens ) {
            const price = data[ticker]?.usd || 0;
            const change = data[ticker]?.usd_24h_change || 0;

            if( !!price ) {
                result.set(ticker, { 
                    usdPrice: price.toString(), 
                    usd24hChange: change.toString(),
                });
            }
        }

        return result;
    }
}

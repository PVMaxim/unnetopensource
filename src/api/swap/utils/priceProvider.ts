import { HttpClient } from "../../http-client";
import { SwapToken } from "../types";
import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS, WRAPPED_VENOM_ADDRESS } from "../../constants-types";

const COINGECKO_IDS: Record<string, string> = {
    [SWAP_CHAINS.ETH]: 'ethereum',
    [SWAP_CHAINS.BSC]: 'binance-smart-chain',
    [SWAP_CHAINS.TRON]: 'tron',
    [SWAP_CHAINS.TON]: 'the-open-network',
    [SWAP_CHAINS.VENOM]: 'venom',
    [SWAP_CHAINS.SOLANA]: 'solana',
    [SWAP_CHAINS.BTC]: 'bitcoin',
    [SWAP_CHAINS.AVALANCHE]: 'avalanche',
    [SWAP_CHAINS.BASE]: 'base',
    [SWAP_CHAINS.ARBITRUM]: 'arbitrum-one',
    [SWAP_CHAINS.POLYGON]: 'polygon-pos',
    [SWAP_CHAINS.XRP]: 'xrp',

}
const COINGECKO_CORE_TOKEN_IDS: Record<string, string> = {
  [SWAP_CHAINS.ETH]: "ethereum",
  [SWAP_CHAINS.BSC]: "binancecoin",
  [SWAP_CHAINS.TRON]: "tron",
  [SWAP_CHAINS.TON]: "the-open-network",
  [SWAP_CHAINS.VENOM]: "venom",
  [SWAP_CHAINS.SOLANA]: "solana",
  [SWAP_CHAINS.BTC]: "bitcoin",
  [SWAP_CHAINS.AVALANCHE]: "avalanche-2",
  [SWAP_CHAINS.BASE]: "based-eth",
  [SWAP_CHAINS.ARBITRUM]: "arbitrum-bridged-weth-arbitrum-one",
  [SWAP_CHAINS.POLYGON]: "matic-network",
  [SWAP_CHAINS.XRP]: "ripple",
};
// currencies_usdt_prices
export class SwapPriceProvider {

    private readonly CACHE_LIFE_TIME = 60 * 5000; 

    private readonly _coingeckoClient: HttpClient;
    private readonly _web3Client: HttpClient;
    private _cachedPrices: Map<string, string>;
    private _cachedTimes: Map<string, number>;
   

    constructor() {
        this._coingeckoClient = new HttpClient({ baseUrl: "https://coingecko.worker.united.network/" });
        this._web3Client = new HttpClient({ baseUrl: "https://api.web3.world/v1/" });
        this._cachedPrices = new Map();
        this._cachedTimes = new Map();
    }

    async getPrice(token: SwapToken): Promise<string> {
        const key = `${token.chain}:${token.address}`;
        const cachedPrice = this._cachedPrices.get(key);
       

        if( cachedPrice && this._isCacheUpToDate(key) ) {
            return cachedPrice;
        }

        if(token.chain === SWAP_CHAINS.VENOM) {
            const price = await this.getVenomTokenPrice(token.address);
            this._cachedPrices.set(key, price.toString());
            this._cachedTimes.set(key, Date.now());
            return price.toString();
        }

        if(token.address===SWAP_NATIVE_ADDRESS) {
            const id = COINGECKO_CORE_TOKEN_IDS[token.chain];
            const price = await this.getTokenPriceByIds(id);
            this._cachedPrices.set(key, price.toString());
            this._cachedTimes.set(key, Date.now());
            return price.toString();
        } 
        if(token.chain === SWAP_CHAINS.XRP) {
            const id = COINGECKO_IDS[token.chain];
            const price = await this.getTokenPriceByAddress(id, `${token.currencyCode}.${token.address}`);
            this._cachedPrices.set(key, price.toString());
            this._cachedTimes.set(key, Date.now());
            return price.toString();
        }

        const id = COINGECKO_IDS[token.chain];
        const price = await this.getTokenPriceByAddress(id, token.address);
        this._cachedPrices.set(key, price.toString());
        this._cachedTimes.set(key, Date.now());
        return price.toString();
    }

    async getTokenPriceByAddress(id:string, tokenAddress: string): Promise<number>{
        const response = await this._coingeckoClient.fetch({
            url: `api/v3/simple/token_price/${id}/?contract_addresses=${tokenAddress}&vs_currencies=usd`,
            validateStatus: (status: number)=> status === 200 || status === 404,
        });
        const data = await response.json();

        return data[tokenAddress.toLowerCase()]?.usd || data[tokenAddress]?.usd || 0;
    }

     async getTokenPriceByIds(id:string): Promise<number>{
        const response = await this._coingeckoClient.fetch({
            url: `api/v3/simple/price/?ids=${id}&vs_currencies=usd`,
            validateStatus: (status: number)=> status === 200 || status === 404,
        });
       
        const data = await response.json();

        return data[id]?.usd || 0;
    }

    async getVenomTokenPrice(tokenAddress: string): Promise<number> {
        let address = tokenAddress.toLowerCase();
        if( address === SWAP_NATIVE_ADDRESS ) {
            address = WRAPPED_VENOM_ADDRESS        
        }     
        const response = await this._web3Client.fetch({
            url: 'currencies_usdt_prices',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ currency_addresses: [address] }),
        });
       
        const data = await response.json();

        return data[address] || 0;
    }

    private _isCacheUpToDate(key: string): boolean {
        const cachedTime = this._cachedTimes?.get(key);
        if (!cachedTime) {
            return false;
        }
        return Date.now() < (cachedTime + this.CACHE_LIFE_TIME);
    }
    
}

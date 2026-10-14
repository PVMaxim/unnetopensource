import { TokenPriceInfo } from "./common";
import { UniError } from "./errors";
import { PriceProvider } from "./pricing";
import { LazyValue } from "./utils";


///////////////////////////////////////////////////////////////////////////////
export interface BasicTokenMetadata {
    name: string,
    symbol: string,
    decimals: number,
}


///////////////////////////////////////////////////////////////////////////////
export abstract class NativeTokenBase {

    readonly id = "_";
    readonly isNative = true;
    readonly isMandatory = true;

    protected readonly _name: string;
    protected readonly _symbol: string;
    protected readonly _decimals: number;
    protected readonly _priceProvider: PriceProvider;
    protected readonly _ticker?: string;
    protected readonly _icon?: string;

    protected constructor(args: {
        priceProvider: PriceProvider,
        name: string,
        symbol: string,
        decimals: number,
        ticker?: string,
        icon?: string,
    }) {
        this._name = args.name;
        this._symbol = args.symbol;
        this._decimals = args.decimals;
        this._ticker = args.ticker;
        this._priceProvider = args.priceProvider;
        this._icon = args.icon ?? (args.ticker ? args.priceProvider.getIconUrl(args.ticker) : undefined);
    }

    async getName(): Promise<string> {
        return this._name;
    }

    async getSymbol(): Promise<string> {
        return this._symbol;
    }

    async getDecimals(): Promise<number> {
        return this._decimals;
    }

    async getPrice(): Promise<TokenPriceInfo | undefined> {
        if( !this._ticker ) {
            return undefined;
        }

        return this._priceProvider.getPrice(this._ticker);
    }

    async getIconUrl(): Promise<string | undefined> {
        return this._icon;
    }

    getAvailableBalance(owner: string): Promise<string> {
        return this.getBalance(owner);
    }

    abstract getBalance(owner: string): Promise<string>;
}


///////////////////////////////////////////////////////////////////////////////
export abstract class GenericTokenBase<MetadataType extends BasicTokenMetadata = BasicTokenMetadata> {

    readonly id: string;
    readonly isNative = false;
    readonly isMandatory: boolean;

    protected _priceProvider: PriceProvider;
    protected readonly _lazyTicker: LazyValue<string | undefined>;
    protected readonly _lazyMetadata: LazyValue<MetadataType>;
    protected readonly _nameOverride?: string;
    protected readonly _symbolOverride?: string;
    protected readonly _decimalsOverride?: number;
    protected readonly _iconOverride?: string;

    protected constructor(args: {
        id: string,
        priceProvider: PriceProvider,
        ticker: LazyValue<string | undefined>,
        name?: string,
        symbol?: string,
        decimals?: number,
        isMandatory?: boolean,
        icon?: string,
    }) {
        this.id = args.id;
        this.isMandatory = args.isMandatory ?? false;
        this._priceProvider = args.priceProvider;
        this._nameOverride = args.name;
        this._symbolOverride = args.symbol;
        this._decimalsOverride = args.decimals;
        this._iconOverride = args.icon;
        this._lazyTicker = args.ticker;
        this._lazyMetadata = new LazyValue(() => this._doGetMetadata());
    }

    async getName(): Promise<string> {
        if( this._nameOverride ) {
            return this._nameOverride;
        }

        return this._lazyMetadata.get().then(x => x.name);
    }

    async getSymbol(): Promise<string> {
        if( this._symbolOverride ) {
            return this._symbolOverride;
        }

        return this._lazyMetadata.get().then(x => x.symbol);
    }

    async getDecimals(): Promise<number> {
        if( this._decimalsOverride ) {
            return this._decimalsOverride;
        }

        return this._lazyMetadata.get().then(x => x.decimals);
    }

    async getPrice(): Promise<TokenPriceInfo | undefined> {
        const ticker = await this._lazyTicker.get();

        if( !ticker ) {
            return undefined;
        }

        return this._priceProvider.getPrice(ticker);
    }

    async getIconUrl(): Promise<string | undefined> {
        if( this._iconOverride ) {
            return this._iconOverride;
        }

        const ticker = await this._lazyTicker.get();
        if( !ticker ) {
            return undefined;
        }

        return this._priceProvider.getIconUrl(ticker);
    }

    getAvailableBalance(owner: string): Promise<string> {
        return this.getBalance(owner);
    }

    setPriceProvider(priceProvider: PriceProvider): void {
        this._priceProvider = priceProvider;
    }

    async getAndVerifyDecimals(): Promise<number> {
        const decimals = await this.getDecimals();
        const metadata = await this._lazyMetadata.get();

        // verify decimals in case it was overridden with invalid value
        if( decimals !== metadata.decimals ) {
            throw new UniError(
                "INTERNAL_ERROR",
                `Token decimals does not match on-chain token decimals : ${this.id} : ` +
                `current=${decimals} on-chain=${metadata.decimals}`
            );
        }

        return decimals;
    }

    protected _getMetadata(): Promise<MetadataType> {
        return this._lazyMetadata.get();
    }

    abstract getBalance(owner: string): Promise<string>;

    protected abstract _doGetMetadata(): Promise<MetadataType>;
}

import { HOLDING_INTERFACE_ID, InstrumentId } from "@canton-network/core-token-standard";
import { Holding } from "@canton-network/core-tx-parser";
import { BigNumber } from "bignumber.js";
import { CardKeys, Request, Token, TokenPriceInfo, TransactionInfo } from "../common";
import { SWAP_NATIVE_ADDRESS } from "../constants-types";
import { UniError, UniLowBalanceError } from "../errors";
import { PriceProvider } from "../pricing";
import { LazyValue } from "../utils";
import { CantonCore, CantonAsset } from "./core";
import { CantonHistoryReader } from "./history";

export class CantonStandardToken implements Token {

    readonly id: string;
    readonly isNative: boolean;
    readonly isMandatory: boolean;
    readonly internalMetadata: LazyValue<CantonAsset>;
    readonly instrument: InstrumentId;

    private readonly _coreFactory: () => Promise<CantonCore>;
    private readonly _txUrlFormatter: (id: string) => string;
    private readonly _nameOverride?: string;
    private readonly _symbolOverride?: string;
    private readonly _ticker?: string;
    private readonly _icon?: string;
    private _priceProvider: PriceProvider;

    constructor(args: {
        instrument: string,
        coreFactory: () => Promise<CantonCore>,
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
        name?: string,
        symbol?: string,
        ticker?: string,
        icon?: string,
        isNative?: boolean,
        isMandatory?: boolean,
    }) {
        const instrument = CantonStandardToken.unpackInstrumentId(args.instrument);
        if( !instrument ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid token : ${args.instrument}`);
        }

        this._coreFactory = args.coreFactory;
        this._txUrlFormatter = args.txUrlFormatter;
        this._priceProvider = args.priceProvider;

        this._nameOverride = args.name;
        this._symbolOverride = args.symbol;
        this._ticker = args.ticker;
        this._icon = args.icon ?? (args.ticker ? args.priceProvider.getIconUrl(args.ticker) : undefined);

        this.isNative = args.isNative ?? false;
        this.isMandatory = args.isMandatory ?? this.isNative;
        this.id = this.isNative ? "_" : args.instrument;
        this.instrument = instrument;

        this.internalMetadata = new LazyValue(async () => {
            const core = await args.coreFactory();
            const assetInfo = await core.findAsset(this.instrument);

            if( !assetInfo ) {
                throw new UniError(
                    "INTERNAL_ERROR",
                    `Asset not found : id=${this.instrument.id} admin=${this.instrument.admin}`
                );
            }

            return assetInfo;
        });
    }

    static packInstrumentId(src: InstrumentId): string {
        return `${src.admin}|${src.id}`;
    }

    static unpackInstrumentId(src: string): InstrumentId | null {
        const parts = src.split("|");
        if( parts.length === 2 && parts.every(x => x.length > 0) ) {
            return {
                admin: parts[0],
                id: parts[1],
            };
        }

        return null;
    }

    async getName(): Promise<string> {
        if( this._nameOverride ) {
            return this._nameOverride;
        }

        return this.internalMetadata.get().then(x => x.displayName);
    }

    async getSymbol(): Promise<string> {
        if( this._symbolOverride ) {
            return this._symbolOverride;
        }

        return this.internalMetadata.get().then(x => x.symbol);
    }

    async getDecimals(): Promise<number> {
        throw new UniError("NOT_SUPPORTED");
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

    async getAvailableBalance(owner: string): Promise<string> {
        return this.getBalance(owner);
    }

    async getBalance(owner: string): Promise<string> {
        return (await this._doGetBalance(owner)).toFixed();
    }

    private async _doGetBalance(owner: string): Promise<BigNumber> {
        const core = await this._coreFactory();

        const utxos = await core.tokenStdService.listContractsByInterface<Holding>(
            HOLDING_INTERFACE_ID,
            owner,
        );

        let result = new BigNumber("0");
        for( const utxo of utxos ) {
            if( utxo.interfaceViewValue.instrumentId.admin === this.instrument.admin &&
                utxo.interfaceViewValue.instrumentId.id === this.instrument.id
            ) {
                result = result.plus(utxo.interfaceViewValue.amount);
            }
        }

        return result;
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        const core = await this._coreFactory();
        const reader = new CantonHistoryReader({
            core,
            party: args.owner,
            nativeInstrumentId: this.isNative ? CantonStandardToken.packInstrumentId(this.instrument) : "",
            txLinkFormatter: this._txUrlFormatter,
        });

        const allItems: TransactionInfo[] = (await reader.getTransactions()).filter(x => x.tokenId === this.id);

        const offset = args.offset ?? 0;
        return {
            total: allItems.length,
            items: allItems.slice(offset, offset + args.limit),
        };
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys: CardKeys,
    }): Promise<Request> {
        const core = await this._coreFactory();
        const sender = await CantonCore.getWalletAddress(args.keys);
        const metadata = await this.internalMetadata.get();

        if( sender === args.recipient ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const balance = await this._doGetBalance(sender);
        if( balance.lt(args.amount) ) {
            throw new UniLowBalanceError(this.id);
        }

        const [transferCommand, disclosedContracts] =
            await core.tokenStdService.transfer.createTransfer(
                sender,
                args.recipient,
                args.amount.toString(),
                metadata.admin,
                metadata.id,
                metadata.registryUrl,
            );

        return core.createLedgerRequest({
            commands: [{ ExerciseCommand: transferCommand }],
            disclosedContracts,
            keys: args.keys,
        });
    }

    getAddress(): string {
        return SWAP_NATIVE_ADDRESS;
    }
}

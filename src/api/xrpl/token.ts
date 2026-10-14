import { BigNumber } from "bignumber.js";
import * as xrpl from "xrpl";
import { CardKeys, Request, Token, TokenPriceInfo, TransactionInfo } from "../common";
import { UniError, UniLowBalanceError } from "../errors";
import { PriceProvider } from "../pricing";
import { getSecp256k1Key, LazyValue, toInt } from "../utils";
import { XrplCore } from "./core";
import { XrplRequest } from "./request";


///////////////////////////////////////////////////////////////////////////////
export class XrplToken implements Token {

    readonly id: string;
    readonly isNative = false;
    readonly isMandatory: boolean;

    private readonly _core: XrplCore;
    private readonly _lazyTicker: LazyValue<string | undefined>;
    private readonly _currencyCode: string;
    private readonly _issuer: string;
    private readonly _symbol: string;
    private readonly _name: string;
    private _priceProvider: PriceProvider;

    constructor(args: {
        core: XrplCore,
        priceProvider: PriceProvider,
        address: string,
        ticker: LazyValue<string | undefined>,
        name?: string,
        symbol?: string,
        isMandatory?: boolean,
    }) {
        [this._currencyCode, this._issuer] = parseTokenId(args.address);
        const symbol = normalizeCurrencyCode(this._currencyCode);

        this.id = args.address;
        this.isMandatory = args.isMandatory ?? false;

        this._core = args.core;
        this._priceProvider = args.priceProvider;
        this._lazyTicker = args.ticker;
        this._symbol = args.symbol ?? symbol;
        this._name = args.name ?? symbol;
    }

    static async checkTokenOnChain(args: {
        core: XrplCore,
        address: string,
    }): Promise<boolean> {
        let currencyCode: string;
        let issuer: string;

        try {
            [currencyCode, issuer] = parseTokenId(args.address);
        } catch(_) {
            return false;
        }

        const provider = await args.core.provider.get();

        try {
            const response = await provider.request({
                command: "account_currencies",
                account: issuer,
                ledger_index: "validated",
            });

            return response.result.receive_currencies.includes(currencyCode);

        } catch(err: any) {
            if( err?.data?.error === "actNotFound" ) {      // account not found
                return false;
            } else {
                throw err;
            }
        }
    }

    async getName(): Promise<string> {
        return this._name;
    }

    async getSymbol(): Promise<string> {
        return this._symbol;
    }

    async getDecimals(): Promise<number> {
        throw new UniError("NOT_SUPPORTED");
    }

    async getBalance(owner: string): Promise<string> {
        const trustLines = await this._core.getTrustLines(owner);
        return new BigNumber(trustLines.get(this.id)?.balance ?? "0").toFixed();
    }

    getAvailableBalance(owner: string): Promise<string> {
        return this.getBalance(owner);
    }

    setPriceProvider(priceProvider: PriceProvider): void {
        this._priceProvider = priceProvider;
    }

    async getPrice(): Promise<TokenPriceInfo | undefined> {
        const ticker = await this._lazyTicker.get();

        if( !ticker ) {
            return undefined;
        }

        return this._priceProvider.getPrice(ticker);
    }

    async getIconUrl(): Promise<string | undefined> {
        const ticker = await this._lazyTicker.get();
        if( !ticker ) {
            return undefined;
        }

        return this._priceProvider.getIconUrl(ticker);
    }

    async getTrustLimit(owner: string): Promise<string> {
        const trustLines = await this._core.getTrustLines(owner);
        return new BigNumber(trustLines.get(this.id)?.limit ?? "0").minus(new BigNumber(trustLines.get(this.id)?.balance ?? "0")).toFixed();
    }

    async setTrustLimit(args: {
        limit: number | string,
        keys: CardKeys,
    }): Promise<Request> {
        const publicKey = getSecp256k1Key(args.keys);
        const bnLimit = new BigNumber(args.limit);

        if( bnLimit.isNaN() || bnLimit.isLessThan(0) ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid amount : ${args.limit}`);
        }

        return XrplRequest.create({
            core: this._core,
            publicKey,
            tx: {
                TransactionType: "TrustSet",
                Account: xrpl.deriveAddress(publicKey),
                LimitAmount: {
                    currency: this._currencyCode,
                    issuer: this._issuer,
                    value: bnLimit.toString(),
                },
            },
        });
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        return this._core.getTransactions({
            ...args,
            tokenId: this.id,
        });
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
        extraId?: string,
    }): Promise<Request> {
        const senderPublicKey = getSecp256k1Key(args.keys);
        const sender = xrpl.deriveAddress(senderPublicKey);

        if( this._core.extractClassicAddress(args.recipient) === sender ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const bnAmount = new BigNumber(args.amount);
        if( bnAmount.isNaN() || !bnAmount.isGreaterThan(0) ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid amount : ${args.amount}`);
        }

        const balance = await this.getBalance(sender);
        if( bnAmount.isGreaterThan(balance) ) {
            throw new UniLowBalanceError(this.id);
        }

        const dstTrustLine = (await this._core.getTrustLines(args.recipient)).get(this.id);
        const dstAvailableTrust = new BigNumber(dstTrustLine?.limit ?? "0").minus(dstTrustLine?.balance ?? "0");
        if( bnAmount.isGreaterThan(dstAvailableTrust) ) {
            throw new UniError("LOW_DST_LIMIT");
        }

        return XrplRequest.create({
            core: this._core,
            publicKey: senderPublicKey,
            tx: {
                TransactionType: "Payment",
                Account: sender,
                Destination: args.recipient,
                DestinationTag: args.extraId ? toInt(args.extraId) : undefined,
                Amount: {
                    currency: this._currencyCode,
                    issuer: this._issuer,
                    value: bnAmount.toString(),
                },
            },
        });
    }

    swap(args: {
        TransactionType: "Payment",
        Destination: string,
        Amount: string,
        Memos: any[],
        keys?: CardKeys,
    }): Promise<Request> {
        const senderPublicKey = getSecp256k1Key(args.keys);
        const sender = xrpl.deriveAddress(getSecp256k1Key(args.keys));
        return XrplRequest.create({
            core: this._core,
            publicKey: senderPublicKey,
            tx: {
                TransactionType: args.TransactionType,
                Account: sender,
                Destination: args.Destination,
                Amount: args.Amount,
                Memos: args.Memos,
            },
        });
    }

    getAddress(): string {
        return this._issuer;
    }
}


///////////////////////////////////////////////////////////////////////////////
export function parseTokenId(src: string) {
    const parts = src.split(".");

    if( parts.length === 2 ) {
        let [code, issuer] = parts;
        code = currencyCodeToCanonical(code);

        if( code.length > 0 && xrpl.isValidAddress(issuer) ) {
            return [code, issuer];
        }
    }

    throw new UniError("INVALID_ARGUMENT", `Invalid token id : ${src}`);
}

function normalizeCurrencyCode(currencyCode: string): string {
    if( currencyCode.length === 3 && currencyCode.trim().toLowerCase() !== "xrp" ) {
        // "Standard" currency code
        return currencyCode.trim()
    }

    if( currencyCode.match(/^[a-fA-F0-9]{40}$/) && !isNaN(parseInt(currencyCode, 16)) ) {
        // Hexadecimal currency code
        const hex = currencyCode.toString().replace(/(00)+$/g, "")

        if( hex.startsWith("01") ||     // Old demurrage code
            hex.startsWith("02")        // NFT
        ) {
            return "";
        }

        const decodedHex = Buffer.from(hex, "hex").toString("utf-8").slice(0, 20).trim()
        if (decodedHex.match(/[a-zA-Z0-9]{3,}/) && decodedHex.toLowerCase() !== "xrp") {
            // ASCII or UTF-8 encoded alphanumeric code, 3+ characters long
            return decodedHex
        }
    }

    return "";
}

function currencyCodeToCanonical(currencyCode: string): string {
    if( currencyCode.length === 3 && currencyCode.trim().toLowerCase() !== "xrp" ) {
        return currencyCode.trim()
    }

    if( currencyCode.match(/^[a-fA-F0-9]{40}$/) && !isNaN(parseInt(currencyCode, 16)) ) {
        return currencyCode.toUpperCase();
    }

    if( currencyCode.length > 0 && currencyCode.length <= 20 ) {
        const buf = Buffer.alloc(20);
        buf.write(currencyCode, "utf-8");
        return buf.toString("hex").toUpperCase();
    }

    return "";
}

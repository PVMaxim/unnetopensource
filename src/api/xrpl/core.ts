import { sha512 } from "@noble/hashes/sha512";
import { Buffer } from "buffer";
import { BigNumber } from "bignumber.js";
import * as xrpl from "xrpl";
import { CardKeys, TransactionInfo, TokenTransactionInfo } from "../common";
import { UniError } from "../errors";
import { CachedValue, getSecp256k1Key, LazyValue, fromBlockchainUnits } from "../utils";

export const XRPL_NATIVE_DECIMALS = 6;
export const MIN_XRP_AMOUNT_NO_DST = 1_000_000;

const CACHE_LIFE_TIME = 3000;

export interface TrustLineInfo {
    balance: string;
    limit: string;
}

interface XrplPaymentTxInfo {
    hash: string;
    timestamp: number;
    success: boolean;
    confirmed: boolean;
    srcAccount: string;
    srcTokenId: string;
    srcAmount: string;
    dstAccount: string;
    dstTokenId: string;
    dstAmount: string;
}

export class XrplCore {

    readonly provider: LazyValue<xrpl.Client>;
    readonly getTransactionLink: (hash: string) => string;

    private readonly _cachedTrustLines: Map<string, CachedValue<Map<string, TrustLineInfo>>>;

    constructor(args: {
        rpcUrl: string,
        txUrlFormatter: (hash: string) => string,
    }) {
        this.provider = new LazyValue(async () => {
            const client = new xrpl.Client(args.rpcUrl);
            await client.connect();
            return client;
        });

        this.getTransactionLink = args.txUrlFormatter;
        this._cachedTrustLines = new Map();
    }

    isValidAddress(address: string): boolean {
        return xrpl.isValidAddress(address);
    }

    extractClassicAddress(address: string): string {
        if( xrpl.isValidClassicAddress(address) ) {
            return address;
        }

        try {
            return xrpl.xAddressToClassicAddress(address).classicAddress;
        } catch(_) {
            throw new UniError("INVALID_ARGUMENT", `Invalid address: ${address}`);
        }
    }

    async getWalletAddress(keys: CardKeys): Promise<string> {
        return xrpl.deriveAddress(getSecp256k1Key(keys));
    }

    async accountExists(account: string): Promise<boolean> {
        return !!(await this._getAccountInfo(account));
    }

    async getRawXrpBalance(account: string): Promise<bigint> {
        if( !this.isValidAddress(account) ) {
            return BigInt(0);
        }

        const info = await this._getAccountInfo(account);
        return BigInt(new BigNumber(info?.result.account_data.Balance ?? "0").toFixed());
    }

    private async _getAccountInfo(account: string): Promise<xrpl.AccountInfoResponse | undefined> {
        const provider = await this.provider.get();

        try {
            return (await provider.request({
                command: "account_info",
                account: this.extractClassicAddress(account),
                ledger_index: "validated",
            }));
        } catch(err: any) {
            if( err?.data?.error === "actNotFound" ) {
                return undefined;
            } else {
                throw err;
            }
        }
    }

    async getTrustLines(account: string, force?: boolean): Promise<Map<string, TrustLineInfo>> {
        if( !this.isValidAddress(account) ) {
            return new Map();
        }

        const classicAccount = this.extractClassicAddress(account);
        let cached = this._cachedTrustLines.get(classicAccount);

        if( !cached || force ) {
            cached = new CachedValue(() => this._doGetTrustLines(classicAccount), CACHE_LIFE_TIME);
            this._cachedTrustLines.set(classicAccount, cached);
        }

        return cached.get();
    }

    private async _doGetTrustLines(account: string): Promise<Map<string, TrustLineInfo>> {
        const provider = await this.provider.get();

        try {
            const responses = await provider.requestAll({
                command: "account_lines",
                account,
                ledger_index: "validated",
            });

            const result = new Map<string, TrustLineInfo>();
            for( const response of responses ) {
                for( const line of response.result.lines ) {
                    result.set(`${line.currency}.${line.account}`, {
                        balance: line.balance,
                        limit: line.limit,
                    });
                }
            }

            return result;

        } catch(err: any) {
            if( err?.data?.error === "actNotFound" ) {
                return new Map();
            } else {
                throw err;
            }
        }
    }

    async getTransactions(args: {
        tokenId: string,
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !this.isValidAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const provider = await this.provider.get();
        const owner = this.extractClassicAddress(args.owner);

        const response = await provider.request({
            command: "account_tx",
            account: owner,
            limit: 100,
            binary: false,
        });

        const allItems = response.result.transactions
            .map(x => this._parseTransaction(x))
            .filter(x => !!x)
            .filter(x => x.srcTokenId === args.tokenId && x.srcAccount === owner ||
                         x.dstTokenId === args.tokenId && x.dstAccount === owner);

        const offset = args.offset ?? 0;
        const items: TransactionInfo[] = allItems
            .slice(offset, offset + args.limit)
            .map(x => ({
                id: x.hash,
                confirmed: x.confirmed,
                success: x.success,
                direction: x.srcAccount === owner ? "out" : "in",
                timestamp: x.timestamp,
                amount: x.srcAccount === owner ? x.srcAmount : x.dstAmount,
                scannerUrl: this.getTransactionLink(x.hash),
            }));

        return { total: allItems.length, items };
    }

    async getAllTransactions(args: {
        owner: string,
        limit: number,
        allowedTokens: string[],
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        if( !this.isValidAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const provider = await this.provider.get();
        const owner = this.extractClassicAddress(args.owner);

        const response = await provider.request({
            command: "account_tx",
            account: owner,
            limit: 100,
            binary: false,
        });

        const allItems = response.result.transactions
            .map(x => this._parseTransaction(x))
            .filter(x => !!x)
            .filter(x => args.allowedTokens.includes(x?.srcTokenId) && x.srcAccount === owner ||
                                         args.allowedTokens.includes(x?.dstTokenId) && x.dstAccount === owner);

        const offset = args.offset ?? 0;
        const items: TokenTransactionInfo[] = allItems
            .slice(offset, offset + args.limit)
            .map(x => ({
                id: x.hash,
                tokenId: x.srcAccount === owner ? x.srcTokenId : x.dstTokenId,
                confirmed: x.confirmed,
                success: x.success,
                direction: x.srcAccount === owner ? "out" : "in",
                timestamp: x.timestamp,
                amount: x.srcAccount === owner ? x.srcAmount : x.dstAmount,
                scannerUrl: this.getTransactionLink(x.hash),
            }));

        return { total: allItems.length, items };
    }

    private _parseTransaction(tx: xrpl.AccountTxTransaction): XrplPaymentTxInfo | undefined {
        if( tx.tx_json?.TransactionType !== "Payment" ||
            !tx.hash ||
            typeof(tx.meta) === "string" ||
            tx.meta.delivered_amount === "unavailable"
        ) {
            return undefined;
        }

        const timestamp = ~~(xrpl.rippleTimeToUnixTime(tx.tx_json.date ?? 0) / 1000);
        const success = tx.meta.TransactionResult === "tesSUCCESS" && !!tx.meta.delivered_amount;

        const requestedSrcAmount = tx.tx_json.SendMax ?? tx.tx_json.DeliverMax ?? tx.tx_json.Amount;
        const requestedDstAmount = tx.tx_json.DeliverMax ?? tx.tx_json.Amount;

        let srcAmount: { tokenId?: string, value?: string } = {};
        let dstAmount: { tokenId?: string, value?: string };

        if( !success || !tx.meta.delivered_amount ) {
            srcAmount = this.parseTxAmount(requestedSrcAmount);
            dstAmount = this.parseTxAmount(requestedDstAmount);
        } else {
            if( typeof(requestedSrcAmount) === "string" ) {
                srcAmount.tokenId = "_";
                srcAmount.value = this._getXrpAmountFromNodes(tx.meta.AffectedNodes, tx.tx_json.Account);
            } else if(
                "issuer" in requestedSrcAmount &&
                requestedSrcAmount.issuer
            ) {
                srcAmount.tokenId = `${requestedSrcAmount.currency}.${requestedSrcAmount.issuer}`;
                srcAmount.value = this._getTokenAmountFromNodes({
                    nodes: tx.meta.AffectedNodes,
                    account: tx.tx_json.Account,
                    tokenCurrency: requestedSrcAmount.currency,
                    tokenIssuer: requestedSrcAmount.issuer,
                });
            }

            dstAmount = this.parseTxAmount(tx.meta.delivered_amount);
        }

        if( !srcAmount.tokenId ||
            !srcAmount.value ||
            !dstAmount.tokenId ||
            !dstAmount.value
        ) {
            return undefined;
        }

        return {
            hash: tx.hash,
            timestamp: timestamp,
            success,
            confirmed: tx.validated,
            srcAccount: tx.tx_json.Account,
            srcTokenId: srcAmount.tokenId,
            srcAmount: srcAmount.value,
            dstAccount: tx.tx_json.Destination,
            dstTokenId: dstAmount.tokenId,
            dstAmount: dstAmount.value,
        };
    }

    parseTxAmount(
        src: xrpl.Amount | xrpl.MPTAmount
    ): {
        tokenId?: string,
        value?: string,
    } {
        if( typeof(src) === "string" ) {
            return {
                tokenId: "_",
                value: fromBlockchainUnits(src, XRPL_NATIVE_DECIMALS),
            };
        }

        if( "mpt_issuance_id" in src ||
            !src.issuer
        ) {
            return {};
        }

        return {
            tokenId: `${src.currency}.${src.issuer}`,
            value: new BigNumber(src.value).toFixed(),
        };
    }

    private _getValueFromAmount(field?: xrpl.Amount): string | undefined {
        if( typeof field === "string" ) {
            return field;
        } else {
            return field?.value;
        }
    }

    private _getBalanceDeltaFromNode(node: xrpl.ModifiedNode): string | undefined {
        const prevBalance = new BigNumber(this._getValueFromAmount((node.ModifiedNode as any).PreviousFields?.Balance) ?? "NaN");
        const curBalance = new BigNumber(this._getValueFromAmount((node.ModifiedNode as any).FinalFields?.Balance) ?? "NaN");

        if( prevBalance.isNaN() || curBalance.isNaN() ) {
            return undefined;
        }

        return prevBalance.minus(curBalance).abs().toFixed();
    }

    private _getXrpAmountFromNodes(nodes: xrpl.Node[], account: string): string | undefined {
        let delta: string | undefined;
        for( const node of nodes ) {
            if( "CreatedNode" in node &&
                node.CreatedNode.LedgerEntryType === "AccountRoot" &&
                node.CreatedNode.NewFields.Account === account
            ) {
                delta = node.CreatedNode.NewFields.Balance as (string | undefined);
                break;
            }

            if( "ModifiedNode" in node &&
                node.ModifiedNode.LedgerEntryType === "AccountRoot" &&
                node.ModifiedNode.FinalFields?.Account === account
            ) {
                delta = this._getBalanceDeltaFromNode(node);
                break;
            }
        }

        if( delta ) {
            return fromBlockchainUnits(delta, XRPL_NATIVE_DECIMALS);
        }

        return undefined;
    }

    private _getTokenAmountFromNodes(args: {
        nodes: xrpl.Node[],
        account: string,
        tokenCurrency: string,
        tokenIssuer: string,
    }): string | undefined {
        const encCurrency = this._encodeCurrencyCode(args.tokenCurrency);
        if( !encCurrency ) {
            return undefined;
        }

        const rstId = this._getRippleStateId(
            Buffer.from(xrpl.decodeAccountID(args.account)),
            Buffer.from(xrpl.decodeAccountID(args.tokenIssuer)),
            encCurrency,
        ).toString("hex").toUpperCase();

        for( const node of args.nodes ) {
            if( "CreatedNode" in node &&
                node.CreatedNode.LedgerEntryType === "RippleState" &&
                node.CreatedNode.LedgerIndex === rstId
            ) {
                return (node.CreatedNode.NewFields as any).Balance?.value;
            }

            if( "ModifiedNode" in node &&
                node.ModifiedNode.LedgerEntryType === "RippleState" &&
                node.ModifiedNode.LedgerIndex === rstId
            ) {
                return this._getBalanceDeltaFromNode(node);
            }
        }

        return undefined;
    }

    private _getRippleStateId(account0: Buffer, account1: Buffer, currency: Buffer): Buffer {
        const [lowerAcc, higherAcc] = account0.compare(account1) < 0 ? [account0, account1] : [account1, account0];
        const hash = sha512(Buffer.concat([
            Buffer.from([0x00, 0x72]),
            lowerAcc,
            higherAcc,
            currency,
        ]));

        return Buffer.from(hash.subarray(0, 32));
    }

    private _encodeCurrencyCode(src: string): Buffer | undefined {
        if( src.length === 3 ) {

            const result = Buffer.alloc(20);
            result[12] = src.charCodeAt(0);
            result[13] = src.charCodeAt(1);
            result[14] = src.charCodeAt(2);
            return result;
        }

        if( src.match(/^[a-fA-F0-9]{40}$/) ) {
            return Buffer.from(src, "hex");
        }

        return undefined;
    }
}

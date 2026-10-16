import { Address, beginCell, Cell, fromNano, storeMessage, TonClient } from "@ton/ton";
import { CardKeys, Token, BlockchainManager, TokenMetadataInput, TokenTransactionInfo } from "../common";
import { HttpClient } from "../http-client";
import { BlockchainManagerBase } from "../manager-base";
import { PriceProvider } from "../pricing";
import { UniTonCore } from "./core";
import { Jetton, getJettonTransactions } from "./jetton";
import { TonNativeCoin } from "./native-coin";

export class TonManager extends BlockchainManagerBase implements BlockchainManager {

    readonly type = "ton";
    readonly nativeCoin: Token;
    readonly provider: TonClient;

    private readonly _core: UniTonCore;

    constructor(args: {
        apiBaseUrl: string,
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

        this.provider = new TonClient({ 
            endpoint: new URL("api/v2/jsonRPC", args.apiBaseUrl).toString(),
        });

        this._core = new UniTonCore({ 
            client: this.provider, 
            indexerApi: new HttpClient({baseUrl: args.apiBaseUrl}),
            txUrlFormatter: args.txUrlFormatter,
        });

        this.nativeCoin = new TonNativeCoin({
            core: this._core,
            priceProvider: args.priceProvider,
            ...args.nativeToken,
        });

        this.addToken(this.nativeCoin);
    }

    async getWalletAddress(keys: CardKeys): Promise<string> {
        return this._core.getWalletAddress(keys).toString();
    }

    isValidAddress(address: string): boolean {
        return Address.isFriendly(address);
    }

    protected _normalizeAddress(address: string): string {
        return address;
    }

    protected _createToken(metadata: TokenMetadataInput): Token {
        return new Jetton({
            ...metadata,
            core: this._core,
            priceProvider: this._priceProvider,
            ticker: this._getLazyTicker(metadata),
        });
    }

    protected async _checkTokenOnChain(address: string): Promise<boolean> {
        return Jetton.checkTokenOnChain({
            core: this._core,
            address,
        });
    }

    async getTransactionStatus(txHash: string, options: {ownerAddress: string}): Promise<number> {
        const refetchLimit = 10;
        return new Promise((resolve) => {
            let refetches = 0;
            const walletAddress = Address.parse(options.ownerAddress);
            const interval = setInterval(async () => {
                refetches += 1;

                const state = await this.provider.getContractState(walletAddress);
                if (!state || !state.lastTransaction) {
                    clearInterval(interval);
                    resolve(0);
                    return;
                }

                const { lt: lastLt, hash: lastHash } = state.lastTransaction;
                const lastTx = await this.provider.getTransaction(walletAddress, lastLt, lastHash);

                if (lastTx && lastTx.inMessage) {
                    const msgCell = beginCell().store(storeMessage(lastTx.inMessage)).endCell();
                    const inMsgHash = msgCell.hash().toString("base64");

                    if (inMsgHash === txHash) {
                        clearInterval(interval);
                        resolve(1);
                    }
                }

                if (refetchLimit && refetches >= refetchLimit) {
                    clearInterval(interval);
                    resolve(0);
                }
            }, 1000);
        });
    }

    async getEstimatedCost({ address, payload }: { address: string, payload: string }) {
        try {
            let bodyCell = new Cell();
            if (payload) {
                try {
                    bodyCell = Cell.fromBase64(payload);
                } catch {
                    bodyCell = Cell.fromHex(payload);
                }
            }

            const tx = await this.provider.estimateExternalMessageFee(Address.parse(address), {
                body: bodyCell,
                initCode: null,
                initData: null,
                ignoreSignature: false,
            });

            return fromNano(tx.source_fees.in_fwd_fee + tx.source_fees.storage_fee + tx.source_fees.gas_fee + tx.source_fees.fwd_fee);

        } catch (error) {
            throw error;
        }
    }

    getCore(): UniTonCore {
        return this._core;
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        const nativeTxs = (await this.nativeCoin.getTransactions({
            owner: args.owner,
            limit: 50,
        })).items;

        const tokenTxs = await getJettonTransactions({
            core: this._core,
            owner: args.owner,
            limit: 50,
            knownTokens: Array.from(this._tokens.values()),
        });

        const txs = [
            ...tokenTxs,
            ...nativeTxs.map(x => ({ ...x, tokenId: "_" })),
        ].sort((a, b) => b.timestamp - a.timestamp);

        const offset = args.offset ?? 0;

        return {
            total: txs.length,
            items: txs.slice(offset, offset + args.limit),
        };
    }
}

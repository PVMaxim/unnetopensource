import { ethers, parseUnits, Transaction } from "ethers";
import { CardKeys, HistoryProvider, Token, BlockchainManager, TokenMetadataInput, TokenTransactionInfo } from "../common";
import { BlockchainManagerBase } from "../manager-base";
import { PriceProvider } from "../pricing";
import { getSecp256k1Key } from "../utils";
import { BasicEvmBalanceReader, BatchEvmBalanceReader, BalanceReader } from "./balance-reader";
import { EvmNativeCoin } from "./native-coin";
import { EvmErc20Token } from "./erc20-token";
import { EvmMulticall } from "./multicall";
import { EtherScanHistory } from "./providers/etherscan";
import { TatumEvmHistory } from "./providers/tatum";

class FixedJsonRpcProvider extends ethers.JsonRpcProvider {
    async send(method: string, params: Array<any> | Record<string, any>): Promise<any> {
        try {
            return (await super.send(method, params));
        } catch (e: any) {
            if( method === "eth_getBlockByNumber" &&
                e.error?.code === -32000 &&
                e.error?.message === "cannot query unfinalized data"
            ) {
                return null;
            }

            throw e;
        }
    }
}

export class EvmManager extends BlockchainManagerBase implements BlockchainManager {

    readonly type = "evm";
    readonly provider: ethers.Provider;
    readonly nativeCoin: Token;

    private readonly _balanceReader: BalanceReader;
    private readonly _history: HistoryProvider;

    constructor(args: {
        chainId: number,
        rpcUrl: string,
        scannerApiUrl: string | {type: "tatum", chain: string, baseUrl: string},
        nativeToken: {
            name: string,
            symbol: string,
            ticker?: string,
        },
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
        multicallAddress?: string,
        tokenManifest?: string | TokenMetadataInput[],
    }) {
        super({
            priceProvider: args.priceProvider,
            tokenManifest: args.tokenManifest,
        });

        this.provider = new FixedJsonRpcProvider(args.rpcUrl, args.chainId, {staticNetwork: true});

        if( typeof args.scannerApiUrl === "string" ) {
            this._history = new EtherScanHistory({
                baseUrl: args.scannerApiUrl,
                txUrlFormatter: args.txUrlFormatter,
            });
        } else {
            this._history = new TatumEvmHistory({
                chain: args.scannerApiUrl.chain,
                baseUrl: args.scannerApiUrl.baseUrl,
                txUrlFormatter: args.txUrlFormatter,
            });
        }

        if( args.multicallAddress ) {
            this._balanceReader = new BatchEvmBalanceReader(new EvmMulticall(this.provider, args.multicallAddress));
        } else {
            this._balanceReader = new BasicEvmBalanceReader(this.provider);
        }

        this.nativeCoin = new EvmNativeCoin({
            provider: this.provider,
            priceProvider: args.priceProvider,
            balanceReader: this._balanceReader,
            history: this._history,
            ...args.nativeToken,
        });

        this.addToken(this.nativeCoin);
    }

    async getWalletAddress(keys: CardKeys): Promise<string> {
        const publicKey = getSecp256k1Key(keys);
        return ethers.computeAddress(`0x${publicKey}`);
    }

    isValidAddress(address: string): boolean {
        return ethers.isAddress(address);
    }

    protected _normalizeAddress(address: string): string {
        return address.toLowerCase();
    }

    protected _createToken(metadata: TokenMetadataInput): Token {
        return new EvmErc20Token({
            ...metadata,
            provider: this.provider,
            priceProvider: this._priceProvider,
            balanceReader: this._balanceReader,
            history: this._history,
            ticker: this._getLazyTicker(metadata),
        });
    }

    protected _checkTokenOnChain(address: string): Promise<boolean> {
        return EvmErc20Token.checkTokenOnChain({
            provider: this.provider,
            address,
        });
    }

    async getTransactionStatus(txHash: string): Promise<number> {
        const receipt = await this.provider.waitForTransaction(txHash);
        return receipt?.status ?? 0;
    }

    async getEstimatedCost(transaction: Transaction): Promise<any> {
        const { gasPrice } = await this.provider.getFeeData();
        const estimatedGas = await this.provider.estimateGas(transaction);
        const gasCost = parseUnits(estimatedGas.toString(), 0) * parseUnits(gasPrice?.toString() ?? "0", 0);
        return ethers.formatEther(gasCost);
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
        const nativeTxs = await this._history.getNativeTransactions(args.owner);
        const tokenTxs = await this._history.getAllTokenTransactions(args.owner);

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

import BigNumber from "bignumber.js";
import { Request } from "../../common";
import { SWAP_CHAINS, SWAP_SERVICES } from "../../constants-types";
import oneInchApi from "../api/oneInchApi";
import { GetQuoteParams, GetTransactionParams, HistoryTransaction, ISwapService, QuoteResponse, SwapToken } from "../types";
import { SwapService } from "./swap";
import { getOwnerAddress } from "../utils/ownerAddress";
import { createProviderManagerAndToken } from "../utils/tokenBalances";
import tokens from "../../manifests/swap-tokens.json";
import { getHistoryStatus } from "../utils/serviceStatuses";
import { formatHistoryDate } from "../utils/historyTime";
import { ONE_INCH_CHAIN_IDS, EXPLORER_TX_URLS, getChainByEvmId } from "../chainConfig";

class OneInchClassicService extends SwapService implements ISwapService {
    private _name: string = SWAP_SERVICES.OneInch;

    public get name(): string {
        return this._name;  
    }

    constructor(){
        super([
            SWAP_CHAINS.ETH,
            SWAP_CHAINS.ARBITRUM,
            SWAP_CHAINS.AVALANCHE,
            SWAP_CHAINS.BSC,
            SWAP_CHAINS.POLYGON,
            SWAP_CHAINS.BASE,
        ])
    }

    checkDirection(fromToken: SwapToken, toToken: SwapToken): boolean {
        return fromToken.chain === toToken.chain && this._suportedProviders.includes(fromToken.chain) && this._suportedProviders.includes(toToken.chain);
    }

    async getQuote(params: GetQuoteParams, signal: AbortSignal): Promise<QuoteResponse> {
        const response = await oneInchApi().getQuote({
            chain: ONE_INCH_CHAIN_IDS[params.fromToken.chain],
            src: params.fromToken.address,
            dst: params.toToken.address,
            amount: new BigNumber(params.amount).shiftedBy(params.fromToken.decimals).decimalPlaces(0, BigNumber.ROUND_FLOOR).toFixed(),
            fee: 1,
        }, signal);
        if(!response || !response.dstAmount) {
            throw new Error("No quote available from OneInch.");
        }

        const { address } = await oneInchApi().getRouteAddress(ONE_INCH_CHAIN_IDS[params.fromToken.chain], signal);
        return {
            txData: {
                fromTokenAmount: new BigNumber(params.amount)
                  .shiftedBy(params.fromToken.decimals)
                  .decimalPlaces(0, BigNumber.ROUND_FLOOR)
                  .toFixed(),
                fromTokenDecimal: params.fromToken.decimals,
                toTokenAmount: new BigNumber(response.dstAmount)
                    .shiftedBy(-(params.toToken?.decimals))
                    .toFixed(),
                toTokenDecimal: params.toToken.decimals,
                path: [],
                fee: 0,
                feeToken: "",
                contractAddress: address,
                logoUrl: "",
                chainFee: "",

                amountOutMin: response.dstAmount,

                dex: SWAP_SERVICES.OneInch,
            },
        };
    }

    async createTransaction({ fromProvider, publicKeyCard, fromAmount, fromToken, toToken, slippage}: GetTransactionParams): Promise<{ tx: Request; orderId: string; }> {
        const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);
        const response = await oneInchApi().getTxData({
            chain: ONE_INCH_CHAIN_IDS[fromToken.chain],
            src: fromToken.address,
            dst: toToken.address,
            amount: new BigNumber(fromAmount).shiftedBy(fromToken.decimals).decimalPlaces(0, BigNumber.ROUND_FLOOR).toString(),
            from: fromAddress,
            slippage,
            origin: fromAddress,
            fee: 1,
            referrer: "0xe6a98c68730aFb3329Fb501623ABAb9660EbF29f",
        });
        const { token } = await createProviderManagerAndToken(
            fromProvider,
            fromToken
        );

        if (!token.swap) {
            throw new Error(
            `Swap method is not implemented for ${fromProvider.name} provider.`
            );
        }

        const tx = await token.swap({
            to: response.tx.to,
            data: response.tx.data,
            value: response.tx.value,
            keys: publicKeyCard,
        });

        return { tx, orderId: "" };
    }

    async createPrepareTransaction(params: GetTransactionParams): Promise<Request> {
        const { tx } = await this.createTransaction(params);
        return tx;
    }

    async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
        const chainIds = this._suportedProviders.map(chain => ONE_INCH_CHAIN_IDS[chain].toString());
        const historyPromises = addresses.map(address =>
            oneInchApi().getHistory(chainIds, address).then(data => data.items)
        );

        const results = (await Promise.all(historyPromises)).flat(3);
        const history = results.map((order) => {
            const firstTokenAction = order.details.tokenActions.find(action => action.direction === "Out");
            if (!firstTokenAction) {
                throw new Error("Invalid order data: missing 'In' token action");
            }
            const lastTokenAction = order.details.tokenActions.find(action => action.direction === "In");
            if (!lastTokenAction) {
                throw new Error("Invalid order data: missing 'Out' token action");
            }
            const fromTokenChain = getChainByEvmId(Number(firstTokenAction.chainId));
            if (!fromTokenChain) {
                throw new Error("Unsupported from token chain");
            }
            const toTokenChain = getChainByEvmId(Number(lastTokenAction.chainId));
            if (!toTokenChain) {
                throw new Error("Unsupported to token chain");
            }

            const fromToken = tokens.find(
                (token) => token.chain === fromTokenChain && token.address.toLowerCase() === firstTokenAction.address.toLowerCase()
            );
            if (!fromToken) {
                throw new Error("From token not found in manifest");
            }
            const toToken = tokens.find(
                (token) => token.chain === toTokenChain && token.address.toLowerCase() === lastTokenAction.address.toLowerCase()
            );
            if (!toToken) {
                throw new Error("To token not found in manifest");
            }

            return {
                fromChain: fromTokenChain,
                toChain: toTokenChain,
                id: order.id,
                fromTokenAmount: new BigNumber(firstTokenAction.amount)
                    .shiftedBy(-(fromToken?.decimals ?? 0))
                    .toString(),
                toTokenAmount: new BigNumber(lastTokenAction.amount)
                    .shiftedBy(-(toToken?.decimals ?? 0))
                    .toString(),
                status: getHistoryStatus(order.details.status),
                createTime: formatHistoryDate(order.timeMs, SWAP_SERVICES.OneInch),
                depositHashExplore: `${EXPLORER_TX_URLS[fromToken?.chain ?? ""] ?? ""}${order.details.txHash}`,
                orderId: order.id,
                fromTokenSymbol: fromToken.symbol,
                toTokenSymbol: toToken.symbol,
                provider: SWAP_SERVICES.OneInch,
            };
        });

        return history;
    }
}   

export default new OneInchClassicService();
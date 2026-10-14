import BigNumber from "bignumber.js";
import { Request } from "../../common";
import { SWAP_CHAINS, SWAP_SERVICES } from "../../constants-types";
import {
  GetQuoteParams,
  GetTransactionParams,
  HistoryTransaction,
  ISwapService,
  QuoteResponse,
  SwapToken,
} from "../types";
import oneInchFusionApi from "../api/oneInchFusionApi";
import { getOwnerAddress } from "../utils/ownerAddress";

import { Quote, QuoterRequest } from "@1inch/fusion-sdk";
import { LimitOrderV4Struct } from "@1inch/cross-chain-sdk";

import { getSecp256k1Key } from "../../utils";
import { OneInch } from "./oneInch";
import { OrderItemV2 } from "../api/oneInchFusionApi.types";
import tokens from "../../manifests/swap-tokens.json";
import { getHistoryStatus } from "../utils/serviceStatuses";
import { formatHistoryDate } from "../utils/historyTime";
import { EvmTypedDataRequestSecp } from "../utils/request";

class OneInchFusionV2 extends OneInch implements ISwapService {
  private _name: string = SWAP_SERVICES.OneInchFusionV2;

  public get name(): string {
    return this._name;
  }

  constructor() {
    super([
      SWAP_CHAINS.ETH,
      SWAP_CHAINS.ARBITRUM,
      SWAP_CHAINS.AVALANCHE,
      SWAP_CHAINS.BSC,
      SWAP_CHAINS.POLYGON,
      SWAP_CHAINS.BASE,
    ]);
  }

  checkDirection(fromToken: SwapToken, toToken: SwapToken): boolean {
    return (
      fromToken.chain === toToken.chain &&
      this._suportedProviders.includes(fromToken.chain) &&
      this._suportedProviders.includes(toToken.chain)
    );
  }

  async getQuote(
    { fromToken, toToken, amount, accountAddress }: GetQuoteParams,
    signal?: AbortSignal
  ): Promise<QuoteResponse> {
    try {
      const fromTokenAddress = this.normalizeFromTokenAddress(fromToken);
      const toTokenAddress = this.normalizeToTokenAddress(toToken);
      const chain = this.getChainId(fromToken.chain);
      const bnAmount = new BigNumber(amount)
        .shiftedBy(fromToken.decimals)
        .decimalPlaces(0, BigNumber.ROUND_FLOOR)
        .toFixed();

      const response = await oneInchFusionApi().getQuoteV2(
        {
          chain,
          fromTokenAddress,
          toTokenAddress,
          amount: bnAmount,
          walletAddress: accountAddress,
          enableEstimate: false,
          fee: "100",
          source: "united-network"
        },
        signal
      );

      return {
        txData: {
          fromTokenAmount: new BigNumber(amount)
            .shiftedBy(fromToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_FLOOR)
            .toFixed(),
          fromTokenDecimal: fromToken.decimals,
          toTokenAmount: new BigNumber(response.toTokenAmount)
            .shiftedBy(-toToken?.decimals)
            .toFixed(),
          toTokenDecimal: toToken.decimals,
          path: [],
          fee: 0,
          feeToken: "",
          contractAddress: this.aggregateAddress,
          logoUrl: "",
          chainFee: "",
          amountOutMin: response.toTokenAmount,
          dex: this._name,
        },
      };
    } catch (error) {
      if (
        (error as any)?.response?.data?.description &&
        (error as any).response.data.description === "insufficient amount"
      ) {
        return {
          txData: {
            fromTokenAmount: new BigNumber(amount)
              .shiftedBy(fromToken.decimals)
              .decimalPlaces(0, BigNumber.ROUND_FLOOR)
              .toString(),
            fromTokenDecimal: fromToken.decimals,
            toTokenAmount: "0",
            toTokenDecimal: toToken.decimals,
            depositMin: "-1",
            depositMax: "0",
            amountOutMin: "0",
            fee: 0,
            feeToken: "",
            contractAddress: "",
            dex: this._name,
            path: [],
            logoUrl: "",
            chainFee: "",
          },
        };
      }
      throw error;
    }
  }

  async getQuoteWithId({
    fromToken,
    toToken,
    amount,
    accountAddress,
  }: GetQuoteParams) {
    const fromTokenAddress = this.normalizeFromTokenAddress(fromToken);
    const toTokenAddress = this.normalizeToTokenAddress(toToken);
    const chain = this.getChainId(fromToken.chain);
    const bnAmount = new BigNumber(amount)
      .shiftedBy(fromToken.decimals)
      .decimalPlaces(0, BigNumber.ROUND_FLOOR)
      .toString();

    const response = await oneInchFusionApi().getQuoteV2({
      chain,
      fromTokenAddress,
      toTokenAddress,
      amount: bnAmount,
      walletAddress: accountAddress,
      enableEstimate: true,
      fee: "100",
      source: "united-network",
    });

    return response;
  }

  async createTransaction({
    fromToken,
    toToken,
    fromAmount,
    fromProvider,
    publicKeyCard,
    slippage,
  }: GetTransactionParams): Promise<{
    tx: Request;
    orderId: string;
    dstAmount: string;
  }> {
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);
    const quoteWithId = await this.getQuoteWithId({
      fromToken,
      toToken,
      amount: fromAmount,
      accountAddress: fromAddress,
      slippage: Number(slippage),
    });
    const preset = quoteWithId.presets[quoteWithId.recommended_preset];
    if (!preset) {
      throw new Error("preset is not defined");
    }
    const fromTokenAddress = this.normalizeFromTokenAddress(fromToken);
    const toTokenAddress = this.normalizeToTokenAddress(toToken);
    const chainId = this.getChainId(fromToken.chain);
    const quoterRequest = QuoterRequest.new({
      fromTokenAddress,
      toTokenAddress,
      amount: new BigNumber(fromAmount)
        .shiftedBy(fromToken.decimals)
        .decimalPlaces(0, BigNumber.ROUND_FLOOR)
        .toString(),
      walletAddress: fromAddress,
      enableEstimate: true,
    });
    const quote = new Quote(quoterRequest, quoteWithId);
    const fusionOrder = quote.createFusionOrder({
      network: chainId,
      preset: quoteWithId.recommended_preset,
    });
    const order = fusionOrder.build();
    const typedData = fusionOrder.getTypedData(chainId);
    const dataHash = this.convertTypedDataToHash(typedData);
    const publicKey = getSecp256k1Key(publicKeyCard);

    const tx = new EvmTypedDataRequestSecp(
      { hash: dataHash, publicKey },
      async (signature) => {
        await this.submitOrder({
          order,
          chainId,
          signature,
          quoteId: quoteWithId?.quoteId ?? "",
          extension: fusionOrder.extension.encode(),
        });
      }
    );

    return {
      tx,
      orderId: "",
      dstAmount: quoteWithId.toTokenAmount,
    };
  }

  async createPrepareTransaction(
    params: GetTransactionParams
  ): Promise<Request> {
    return this.createTransaction(params).then((res) => res.tx);
  }
  async submitOrder({
    order,
    chainId,
    signature,
    quoteId,
    extension,
  }: {
    order: LimitOrderV4Struct;
    chainId: number;
    signature: string;
    quoteId: string;
    extension: string;
  }) {
    return oneInchFusionApi().submitOrder({
      order,
      signature,
      quoteId,
      chain: chainId,
      extension,
    });
  }
  async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    const evmChainIds = this.getEvmChainIds();

    const ordersRequests = addresses
      .map((address) => {
        return evmChainIds.map(async (chainId) => {
          return oneInchFusionApi()
            .getOrdersByChainAndMakerV2(chainId, address)
            .then((history) =>
              history.items.map((item) => ({
                ...item,
                chainId,
              }))
            );
        });
      })
      .flat();

    const orders = (await Promise.all(ordersRequests)).flat();
    const history = orders
      .filter((order) => order !== undefined)
      .map((order) => this.convertOrderToHistory(order));
    return history;
  }
  convertOrderToHistory(order: OrderItemV2): HistoryTransaction {
    const chain = this.getSwapChainById(order.chainId);

    const fromTokenAddress = this.checkSolanaNativeAddress(order.makerAsset);

    const fromToken = tokens.find(
      (token) =>
        token.chain === chain &&
        token.address.toLowerCase() === fromTokenAddress.toLowerCase()
    );
    if (!fromToken) {
      throw new Error("From token not found in manifest");
    }

    const toTokenAddress = this.checkSolanaNativeAddress(order.takerAsset);

    const toToken = tokens.find(
      (token) =>
        token.chain === chain &&
        token.address.toLowerCase() === toTokenAddress.toLowerCase()
    );
    if (!toToken) {
      throw new Error("To token not found in manifest");
    }

    let toAmount = order.minTakerAmount;

    if (order.fills.length > 0) {
      toAmount = order.fills.reduce((acc, item) => {
        return new BigNumber(acc)
          .plus(item.filledAuctionTakerAmount || 0)
          .toString();
      }, "0");
    }

    return {
      fromChain: chain,
      toChain: chain,
      fromTokenAmount: new BigNumber(order.makerAmount)
        .shiftedBy(-fromToken?.decimals)
        .toString(),
      toTokenAmount: new BigNumber(toAmount)
        .shiftedBy(-toToken?.decimals)
        .toString(),
      id: order.orderHash,
      fromTokenSymbol: fromToken.symbol,
      toTokenSymbol: toToken.symbol,
      status: getHistoryStatus(order.status),
      orderId: order.orderHash,
      createTime: formatHistoryDate(new Date(order.createdAt), SWAP_SERVICES.OneInch),
      depositHashExplore: this.getScanLinkByChain(
        fromToken.chain,
        order.fills[0]?.txHash
      ),
      provider: this._name,
    };
  }
}

export default new OneInchFusionV2();

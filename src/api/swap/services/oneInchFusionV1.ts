import BigNumber from "bignumber.js";
import { Request } from "../../common";
import { SWAP_CHAINS, SWAP_SERVICES } from "../../constants-types";
import {
  GetQuoteParams,
  GetTransactionParams,
  HistoryTransaction,
  ISwapService,
  SwapToken,
} from "../types";
import oneInchFusionApi from "../api/oneInchFusionApi";
import { getOwnerAddress } from "../utils/ownerAddress";
import { Address, FusionSwapContract, Quote } from "@1inch/solana-fusion-sdk";
import { OneInch } from "./oneInch";
import { OrderItemV1 } from "../api/oneInchFusionApi.types";
import tokens from "../../manifests/swap-tokens.json";
import { getHistoryStatus } from "../utils/serviceStatuses";
import { formatHistoryDate } from "../utils/historyTime";
import { createProviderManagerAndToken } from "../utils/tokenBalances";
import { PublicKey } from "@solana/web3.js";

class OneInchFusionV1 extends OneInch implements ISwapService {
  private _name: string = SWAP_SERVICES.OneInchFusionV1;

  public get name(): string {
    return this._name;
  }

  constructor() {
    super([SWAP_CHAINS.SOLANA]);
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
  ) {
    try {
      const srcToken = this.normalizeFromTokenAddress(fromToken);
      const dstToken = this.normalizeToTokenAddress(toToken);
      const chain = this.getChainId(fromToken.chain);
      const bnAmount = new BigNumber(amount)
        .shiftedBy(fromToken.decimals)
        .decimalPlaces(0, BigNumber.ROUND_FLOOR)
        .toFixed();

      const response = await oneInchFusionApi().getQuoteV1(
        {
          chain,
          srcToken,
          dstToken,
          amount: bnAmount,
          wallet: accountAddress,
          enableEstimate: false,
          fee: "0",
        },
        signal
      );
      if (!response || !response.dstAmount) {
        throw new Error("No quote available from OneInch Fusion.");
      }

      return {
        txData: {
          fromTokenAmount: new BigNumber(amount)
            .shiftedBy(fromToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_FLOOR)
            .toFixed(),
          fromTokenDecimal: fromToken.decimals,
          toTokenAmount: new BigNumber(response.dstAmount)
            .shiftedBy(-toToken?.decimals)
            .toFixed(),
          toTokenDecimal: toToken.decimals,
          path: [],
          fee: 0,
          feeToken: "",
          contractAddress: "",
          logoUrl: "",
          chainFee: "",
          amountOutMin: response.srcAmount,
          dex: this._name,
        },
      };
    } catch (error) {
      if (
        (error as any)?.response?.data?.description &&
        (error as any).response.data.description === "swap amount too small"
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
    const srcToken = this.normalizeFromTokenAddress(fromToken);
    const dstToken = this.normalizeToTokenAddress(toToken);
    const chain = this.getChainId(fromToken.chain);
    const bnAmount = new BigNumber(amount)
      .shiftedBy(fromToken.decimals)
      .decimalPlaces(0, BigNumber.ROUND_FLOOR)
      .toString();

    const response = await oneInchFusionApi().getQuoteV1({
      chain,
      srcToken,
      dstToken,
      amount: bnAmount,
      wallet: accountAddress,
      enableEstimate: true,
      fee: "0",
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
  }> {
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);
    const quoteWithId = await this.getQuoteWithId({
      fromToken,
      toToken,
      amount: fromAmount,
      accountAddress: fromAddress,
      slippage: Number(slippage),
    });
    const srcToken = this.normalizeFromTokenAddress(fromToken);
    const dstToken = this.normalizeToTokenAddress(toToken);

    const order = Quote.fromJSON(
      new Address(srcToken),
      new Address(dstToken),
      new Address(fromAddress),
      quoteWithId
    ).toOrder();

    const contract = FusionSwapContract.default();

    const ix = contract.create(order, {
      maker: new Address(fromAddress),
      srcTokenProgram: Address.TOKEN_PROGRAM_ID,
    });

    const instruction = {
      data: ix.data,
      programId: new PublicKey(ix.programId.toBuffer()),
      keys: ix.accounts.map((a) => ({
        isSigner: a.isSigner,
        isWritable: a.isWritable,
        pubkey: a.pubkey.toBuffer(),
      })),
    };

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
      tx: [instruction],
      keys: publicKeyCard,
      fromAmount: "0",
    });

    return { tx, orderId: "" };
  }

  async createPrepareTransaction(
    params: GetTransactionParams
  ): Promise<Request> {
    return this.createTransaction(params).then((res) => res.tx);
  }
  async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    const solanaChainId = this.getSolanaChainId();

    const ordersRequests = addresses
      .map((address) => {
        return oneInchFusionApi()
          .getOrdersByChainAndMakerV1(solanaChainId, address)
          .then((history) => history.items);
      })
      .flat();

    const orders = (await Promise.all(ordersRequests)).flat();
    const history = orders
      .filter((order) => order !== undefined)
      .map((order) => this.convertOrderToHistory(order, solanaChainId));
    return history;
  }
  convertOrderToHistory(
    order: OrderItemV1,
    chainId: number
  ): HistoryTransaction {
    const chain = this.getSwapChainById(chainId);

    const fromTokenAddress = this.checkSolanaNativeAddress(order.order.srcMint);

    const fromToken = tokens.find(
      (token) =>
        token.chain === chain &&
        token.address.toLowerCase() === fromTokenAddress.toLowerCase()
    );
    if (!fromToken) {
      throw new Error("From token not found in manifest");
    }

    const toTokenAddress = this.checkSolanaNativeAddress(order.order.dstMint);

    const toToken = tokens.find(
      (token) =>
        token.chain === chain &&
        token.address.toLowerCase() === toTokenAddress.toLowerCase()
    );
    if (!toToken) {
      throw new Error("To token not found in manifest");
    }

    let toAmount = order.approximateTakingAmount;

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
      fromTokenAmount: new BigNumber(order.order.srcAmount)
        .shiftedBy(-fromToken?.decimals)
        .toString(),
      toTokenAmount: new BigNumber(toAmount)
        .shiftedBy(-toToken?.decimals)
        .toString(),
      id: order.orderHash,
      fromTokenSymbol: fromToken.symbol,
      toTokenSymbol: toToken.symbol,
      status: getHistoryStatus(order.status.toString()),
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

export default new OneInchFusionV1();

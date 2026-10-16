import { ethers } from "ethers";
import bridgersApi from "../api/bridgersApi";
import {
  GetQuoteParams,
  GetTransactionParams,
  ISwapService,
  QuoteResponse,
  SwapToken,
} from "../types";
import { getOwnerAddress } from "../utils/ownerAddress";
import { createProviderManagerAndToken } from "../utils/tokenBalances";
import {
  ETH_USDT_ADDRESS,
  SWAP_CHAINS,
  SWAP_SERVICES,
} from "../../constants-types";
import { formatHistoryDate } from "../utils/historyTime";
import { SwapService } from "./swap";
import { Request } from "../../common";
import { getHistoryStatus } from "../utils/serviceStatuses";

class BridgersService extends SwapService implements ISwapService {
  private _name: string = SWAP_SERVICES.Bridgers;
  public get name(): string {
    return this._name;
  }

  constructor() {
    super([
      SWAP_CHAINS.BSC,
      SWAP_CHAINS.ETH,
      SWAP_CHAINS.TRON,
      SWAP_CHAINS.TON,
      SWAP_CHAINS.SOLANA,
      SWAP_CHAINS.BTC,
      SWAP_CHAINS.AVALANCHE,
      SWAP_CHAINS.BASE,
      SWAP_CHAINS.ARBITRUM,
      SWAP_CHAINS.POLYGON,
      SWAP_CHAINS.XRP,
    ]);
  }

  async getQuote(
    { fromToken, toToken, amount, accountAddress }: GetQuoteParams,
    signal: AbortSignal
  ): Promise<QuoteResponse> {
    if (
      fromToken.chain === SWAP_CHAINS.ETH &&
      fromToken.address === ETH_USDT_ADDRESS
    ) {
      throw new Error(
        "Bridgers does not support USDT on Ethereum chain. Please select another token."
      );
    }
    const quoteResponse = await bridgersApi().getQuote(
      {
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        fromTokenAmount: ethers
          .parseUnits(amount.toString(), fromToken.decimals)
          .toString(),
        fromTokenChain: fromToken.chain,
        toTokenChain: toToken.chain,
        userAddr: accountAddress,
        sourceFlag: "jetswap",
        equipmentNo: accountAddress,
      },
      signal
    );
    if (quoteResponse.resCode !== 100) {
      throw new Error(quoteResponse.resMsg);
    }

    return {
      txData: { ...quoteResponse.data.txData, dex: SWAP_SERVICES.Bridgers },
    };
  }

  async getSwapData({
    fromToken,
    toToken,
    fromAmount,
    amountOutMin,
    fromProvider,
    toProvider,
    slippage,
    publicKeyCard,
  }: GetTransactionParams) {
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);

    const toAddress = await getOwnerAddress(toProvider, publicKeyCard);

    const params = {
      fromTokenAddress: fromToken.address,
      toTokenAddress: toToken.address,
      fromAddress,
      toAddress,
      fromTokenChain: fromToken.chain,
      toTokenChain: toToken.chain,
      fromTokenAmount: ethers
        .parseUnits(fromAmount.toString(), fromToken.decimals)
        .toString(),
      amountOutMin,
      fromCoinCode: fromToken.symbol,
      toCoinCode: toToken.symbol,
      equipmentNo: fromAddress,
      sourceFlag: "jetswap",
      slippage,
    };

    const response = await bridgersApi().getSwapData(params);
    if (response.resCode !== 100) {
      throw new Error(response.resMsg);
    }

    if (typeof response.data.txData === "string") {
      return { txData: response.data.txData, dex: SWAP_SERVICES.Bridgers };
    }

    return { ...response.data.txData, dex: SWAP_SERVICES.Bridgers };
  }

  async createTransaction({
    fromProvider,
    fromToken,
    toToken,
    fromAmount,
    amountOutMin,
    slippage,
    toProvider,
    publicKeyCard,
  }: GetTransactionParams): Promise<{ tx: Request; orderId: string }> {
    const { token } = await createProviderManagerAndToken(
      fromProvider,
      fromToken
    );
    const quote = await this.getSwapData({
      fromToken,
      toToken,
      fromAmount,
      amountOutMin,
      fromProvider,
      toProvider,
      slippage,
      publicKeyCard,
    });
    if (!token.swap) {
      throw new Error(
        `Swap method is not implemented for ${fromProvider.name} provider.`
      );
    }

    if (typeof quote.txData === "string") {
      const tx = await token.swap({
        txData: quote.txData,
        keys: publicKeyCard,
      });
      return { tx, orderId: "" };
    }

    const swapParams = {
      to: quote.to,
      data: quote.data,
      value: quote.value,
      keys: publicKeyCard,
      tronRouterAddrees: quote.tronRouterAddrees,
      functionName: quote.functionName,
      options: quote.options,
      parameter: quote.parameter,
      fromAddress: quote.fromAddress,
      address: quote.address,
      amount: quote.amount,
      payload: quote.payload,
      tx: quote.tx,
      signer: quote.signer,
      solanaTx: quote.solanaTx,
      fromAmount,
      memo: quote.memo,
      toAddress: quote.toAddress,
      TransactionType: quote.TransactionType,
      Destination: quote.Destination,
      Amount: quote.Amount,
      Memos: quote.Memos,
    };

    const tx = await token.swap(swapParams);
    return { tx, orderId: "" };
  }

  async updateOrderAnaUploadHash({
    amountOutMin,
    fromAddress,
    fromToken,
    toToken,
    fromAmount,
    toAddress,
    hash,
  }: {
    amountOutMin: string;
    fromAddress: string;
    fromToken: SwapToken;
    toToken: SwapToken;
    fromAmount: string;
    toAddress: string;
    hash: string;
  }): Promise<number> {
    const params = {
      amountOutMin,
      fromAddress,
      fromCoinCode: fromToken.symbol,
      toCoinCode: toToken.symbol,
      fromTokenAddress: fromToken.address,
      toTokenAddress: toToken.address,
      fromTokenAmount: ethers
        .parseUnits(fromAmount.toString(), fromToken.decimals)
        .toString(),
      fromTokenChain: fromToken.chain,
      toTokenChain: toToken.chain,
      toAddress,
      hash,
      equipmentNo: fromAddress,
      sourceFlag: "jetswap",
    };

    let maxAttempts = 30;

    const checkOrderStatus = async () => {
      if (maxAttempts === 0) {
        return 101;
      }
      maxAttempts--;
      const orderData = await bridgersApi().updateDataAndStatus(params);

      if (orderData.resCode === 100 || orderData.resCode === 101) {
        return orderData.resCode;
      }
    };

    return new Promise<number>((resolve, reject) => {
      const intervalId = setInterval(async () => {
        try {
          const result = await checkOrderStatus();
          if (result !== undefined) {
            clearInterval(intervalId);
            resolve(result);
          }
        } catch (error) {
          clearInterval(intervalId);
          reject(error);
        }
      }, 5000);
    });
  }

  async getSwapHistory(addresses: string[]) {
    const historyPromises = addresses.map(async (address) => {
      return bridgersApi()
        .getHistoryByAddress({
          fromAddress: address,
          equipmentNo: "",
          sourceFlag: "jetswap",
          pageNo: 1,
          pageSize: 100,
        })
        .then((history) => history.data.list);
    });
    const history = await Promise.all(historyPromises);

    const uniqueHistory = history
      .flat()
      .filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.orderId === item.orderId)
      );
    return uniqueHistory.map((item) => ({
      ...item,
      fromTokenSymbol: item.fromCoinCode,
      toTokenSymbol: item.toCoinCode,
      status: getHistoryStatus(item.status),
      createTime: formatHistoryDate(item.createTime, SWAP_SERVICES.Bridgers),
      provider: SWAP_SERVICES.Bridgers,
      id: item.orderId,
    }));
  }

  async createPrepareTransaction({
    fromProvider,
    fromToken,
    toToken,
    fromAmount,
    amountOutMin,
    slippage,
    toProvider,
    publicKeyCard,
  }: GetTransactionParams): Promise<Request> {
    const { tx } = await this.createTransaction({
      fromProvider,
      fromToken,
      toToken,
      fromAmount,
      amountOutMin,
      slippage,
      toProvider,
      publicKeyCard,
    });
    return tx;
  }
}

export default new BridgersService();

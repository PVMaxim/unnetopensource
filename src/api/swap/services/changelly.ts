import BigNumber from "bignumber.js";
import { SWAP_CHAINS, SWAP_SERVICES } from "../../constants-types";
import { changellyApi } from "../api/changellyApi";
import {
  GetQuoteParams,
  GetTransactionParams,
  HistoryTransaction,
  ISwapService,
} from "../types";
import { getOwnerAddress } from "../utils/ownerAddress";
import { createProviderManagerAndToken } from "../utils/tokenBalances";
import { formatHistoryDate } from "../utils/historyTime";
import tokens from "../../manifests/swap-tokens.json";
import { SwapService } from "./swap";
import { Request } from "../../common";
import { getHistoryStatus } from "../utils/serviceStatuses";
import { EXPLORER_TX_URLS } from "../chainConfig";

// fake addresses for get cost on network fee
// we cant use real addresses because changelly api create order and save in history
// this addressses gets from changelly api
const SAMPLE_ADDRESSES = {
  [SWAP_CHAINS.BSC]: "0x5b181874ee88e19fa4d7c3d46978da81c7f6bc8e",
  [SWAP_CHAINS.ETH]: "0x47302a24923e2b8c5109f7f701ddcda0eb9e46fc",
  [SWAP_CHAINS.TRON]: "TStz2wecNjNNXhB9mYQui4rMSwf26zEH1V",
  [SWAP_CHAINS.TON]: "UQD5MipSFawcjbQyHKJRp166LpMyKPOfQ0RAkcrgYMoIpal2",
  [SWAP_CHAINS.VENOM]:
    "0:86f60180800ae52c1fc518548e6c4361b39a2d71188b570bb1892cec4a1d374c",
  [SWAP_CHAINS.BTC]: "bc1qn2tqx0rpkhklw24zj9x6h28y27utt6f499d638",
  [SWAP_CHAINS.SOLANA]: "XKekLAgC3yVuCsqDqFEWP9NmrsLPrWEzzWyHtNjqcUV",
  [SWAP_CHAINS.AVALANCHE]: "0x5b181874ee88e19fa4d7c3d46978da81c7f6bc8e",
  [SWAP_CHAINS.BASE]: "0x5b181874ee88e19fa4d7c3d46978da81c7f6bc8e",
  [SWAP_CHAINS.ARBITRUM]: "0x5b181874ee88e19fa4d7c3d46978da81c7f6bc8e",
  [SWAP_CHAINS.POLYGON]: "0x5b181874ee88e19fa4d7c3d46978da81c7f6bc8e",
  [SWAP_CHAINS.XRP]: "rQrqppDZMMKeq1x9gDuoytWeRLmLfXYV3q",
};

class ChangellyService extends SwapService implements ISwapService {
  private _name: string = SWAP_SERVICES.Changelly;
  public get name(): string {
    return this._name;
  }

  constructor() {
    super(Object.values(SWAP_CHAINS));
  }

  async getQuote(
    { fromToken, toToken, amount }: GetQuoteParams,
    signal: AbortSignal,
  ): Promise<any> {
    if (!fromToken.changellyTicker || !toToken.changellyTicker) {
      throw new Error("No tickers for changelly");
    }
    const quoteResponse = await changellyApi().getExchangeAmount(
      {
        fromTicker: fromToken.changellyTicker,
        toTicker: toToken.changellyTicker,
        amountFrom: amount,
      },
      signal,
    );
    if (
      quoteResponse.error &&
      (quoteResponse.error.code === -32600 ||
        quoteResponse.error.code === -32602)
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
          depositMin: quoteResponse.error.data.limits.min.from,
          depositMax: quoteResponse.error.data.limits.max.from,
          amountOutMin: "0",
          fee: 0.1,
          contractAddress: "",
          dex: SWAP_SERVICES.Changelly,
        },
      };
    }

    const toTokenAmount = new BigNumber(quoteResponse.result[0].amountTo)
      .minus(new BigNumber(quoteResponse.result[0].networkFee))
      .toString();

    return {
      txData: {
        fromTokenAmount: new BigNumber(amount)
          .shiftedBy(fromToken.decimals)
          .decimalPlaces(0, BigNumber.ROUND_FLOOR)
          .toFixed(),
        fromTokenDecimal: fromToken.decimals,
        toTokenAmount,
        toTokenDecimal: toToken.decimals,
        depositMin: quoteResponse.result[0].minFrom,
        depositMax: quoteResponse.result[0].maxFrom,
        fee: 0.1,
        amountOutMin: new BigNumber(toTokenAmount)
          .shiftedBy(toToken.decimals)
          .decimalPlaces(0, BigNumber.ROUND_FLOOR)
          .toFixed(),
        contractAddress: "",
        dex: SWAP_SERVICES.Changelly,
      },
    };
  }

  async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    const response = await changellyApi().getTransactions({
      addresses,
      limit: 100,
      offset: 0,
    });

    const history = response.result.map((transaction) => {
      const fromToken = tokens.find(
        (token) => token.changellyTicker === transaction.currencyFrom,
      );
      const toToken = tokens.find(
        (token) => token.changellyTicker === transaction.currencyTo,
      );
      return {
        fromChain: fromToken?.chain ?? "",
        toChain: toToken?.chain ?? "",
        id: transaction.id,
        fromTokenAmount: transaction.amountExpectedFrom,
        toTokenAmount: transaction.amountTo,
        status: getHistoryStatus(transaction.status),
        createTime: formatHistoryDate(transaction.createdAt / 1000, SWAP_SERVICES.Changelly),
        depositHashExplore:
          transaction.payinHash &&
          `${EXPLORER_TX_URLS[fromToken?.chain ?? ""] ?? ""}${transaction.payinHash}`,
        orderId: transaction.id,
        fromTokenSymbol: fromToken?.symbol ?? "",
        toTokenSymbol: toToken?.symbol ?? "",
        provider: SWAP_SERVICES.Changelly,
      };
    });
    return history;
  }

  async createTransaction({
    fromProvider,
    fromToken,
    toToken,
    fromAmount,
    toProvider,
    publicKeyCard,
  }: GetTransactionParams): Promise<{ tx: Request; orderId: string }> {
    const toAddress = await getOwnerAddress(toProvider, publicKeyCard);
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);
    const {
      result: { payinAddress, id, payinExtraId },
    } = await changellyApi().createTransaction({
      fromTicker: fromToken.changellyTicker,
      toTicker: toToken.changellyTicker,
      amountFrom: fromAmount,
      toAddress,
      fromAddress,
    });
    const { token } = await createProviderManagerAndToken(
      fromProvider,
      fromToken,
    );
    const tx = await token.transfer({
      recipient: payinAddress,
      amount: fromAmount,
      keys: publicKeyCard,
      extraId: payinExtraId,
    });
    return { tx, orderId: id };
  }

  async createPrepareTransaction({
    fromProvider,
    fromToken,
    fromAmount,
    publicKeyCard,
  }: GetTransactionParams): Promise<Request> {
    const sampleRecipient = SAMPLE_ADDRESSES[fromToken.chain];

    const { token } = await createProviderManagerAndToken(
      fromProvider,
      fromToken,
    );
    const tx = await token.transfer({
      recipient: sampleRecipient,
      amount: fromAmount,
      keys: publicKeyCard,
    });
    return tx;
  }
}

export default new ChangellyService();

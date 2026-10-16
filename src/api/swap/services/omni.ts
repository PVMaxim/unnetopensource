import { formatUnits } from "ethers";
import {
  ETH_USDT_ADDRESS,
  SWAP_CHAINS,
  SWAP_SERVICES,
} from "../../constants-types";
import { omniBridgeApi } from "../api/omniBridgeApi";
import {
  GetQuoteParams,
  GetTransactionParams,
  HistoryTransaction,
  ISwapService,
  QuoteResponse,
} from "../types";
import { getOwnerAddress } from "../utils/ownerAddress";
import { createProviderManagerAndToken } from "../utils/tokenBalances";
import BigNumber from "bignumber.js";
import { formatHistoryDate } from "../utils/historyTime";
import { SwapService } from "./swap";
import { Request } from "../../common";
import { getHistoryStatus } from "../utils/serviceStatuses";

const OMNI_CONTRACT_ADDRESS = "0xB685760EBD368a891F27ae547391F4E2A289895b";

const getChainByCoinCode = (coinCode: string): string => {
  const match = coinCode.match(/\(([^)]+)\)/);
  const result = match ? match[1] : coinCode;

  switch (result) {
    case "ERC20":
      return SWAP_CHAINS.ETH;
    case "BSC":
      return SWAP_CHAINS.BSC;
    case "TRON":
      return SWAP_CHAINS.TRON;
    case "TON":
      return SWAP_CHAINS.TON;
    case "TRX":
      return SWAP_CHAINS.TRON;
    case "SOL":
      return SWAP_CHAINS.SOLANA;
    case "BTC":
      return SWAP_CHAINS.BTC;
    case "C-Chain":
      return SWAP_CHAINS.AVALANCHE;
    case "BASE":
      return SWAP_CHAINS.BASE;
    default:
      return SWAP_CHAINS.ETH;
  }
};
class OmniBridgeService extends SwapService implements ISwapService {
  private _name: string = SWAP_SERVICES.OmniBridgs;
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
    ]);
  }

  async getQuote(
    params: GetQuoteParams,
    signal: AbortSignal
  ): Promise<QuoteResponse> {
    if (
      params.fromToken.chain === SWAP_CHAINS.ETH &&
      params.fromToken.address === ETH_USDT_ADDRESS
    ) {
      const apiParams = {
        depositCoinCode: params.fromToken.symbol,
        receiveCoinCode: params.toToken.symbol,
        depositCoinAmt: params.amount.toString(),
        sourceFlag: "jetswap",
      };
      const res = await omniBridgeApi().getBaseInfo(apiParams, signal);

      const toTokenAmountBG = new BigNumber(params.amount)
        .multipliedBy(new BigNumber(0.999))
        .multipliedBy(new BigNumber(res.data.instantRate))
        .minus(new BigNumber(res.data.receiveCoinFee));

      const amountOutMin = toTokenAmountBG
        .shiftedBy(params.toToken.decimals)
        .decimalPlaces(0, BigNumber.ROUND_FLOOR)
        .toString();

      return {
        txData: {
          fromTokenAmount: new BigNumber(params.amount)
            .shiftedBy(params.fromToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_FLOOR)
            .toString(),
          fromTokenDecimal: params.fromToken.decimals,
          toTokenAmount: toTokenAmountBG.toFixed(),
          toTokenDecimal: params.toToken.decimals,
          path: [],
          fee: res.data.depositCoinFeeRate,
          feeToken: "",
          contractAddress: "",
          logoUrl: "",
          chainFee: res.data.chainFee,
          depositMin: res.data.depositMin,
          depositMax: res.data.depositMax,
          amountOutMin,
          estimatedTime: res.data.estimatedTime,
          instantRate: res.data.instantRate,
          dex: SWAP_SERVICES.OmniBridgs,
        },
      };
    }
    throw new Error();
  }
  async getSwapData(_params: GetTransactionParams): Promise<any> {
    throw new Error("Method not implemented.");
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
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);

    const toAddress = await getOwnerAddress(toProvider, publicKeyCard);

    const paramsCreateOrder = {
      depositCoinCode: fromToken.symbol,
      receiveCoinCode: toToken.symbol,
      depositCoinAmt: fromAmount,
      receiveCoinAmt: formatUnits(amountOutMin, toToken.decimals).toString(),
      destinationAddr: toAddress,
      refundAddr: fromAddress,
      equipmentNo: fromAddress,
      sourceType: "H5",
      sourceFlag: "jetswap",
      isNoGas: false,
      slippage: slippage.toString(),
    };

    const {
      data: { orderId, platformAddr },
    } = await omniBridgeApi().createOrder(paramsCreateOrder);
    const { token } = await createProviderManagerAndToken(
      fromProvider,
      fromToken
    );

    const tx = await token.transfer({
      recipient: platformAddr,
      amount: fromAmount,
      keys: publicKeyCard,
    });

    return { tx, orderId };
  }

  async updateOrderAnaUploadHash({ hash, orderId }: { hash: string; orderId: string }): Promise<number> {
    const params = {
      orderId,
      depositTxid: hash,
    };
    const res = await omniBridgeApi().uploadTransactionHash(params);
    if (res.resCode !== "800") {
      throw new Error("Transaction hash upload failed");
    }
    return 100;
  }

  async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    const ordersPromises = addresses.map(async (address) => {
      return omniBridgeApi()
        .queryAllTrade({
          equipmentNo: address,
          sourceType: "H5",
          pageNo: "1",
          pageSize: "100",
        })
        .then((response) => {
          if (response.resCode !== "800") {
            throw Error(
              `omni error res code ${response.resCode} and message ${response.resMsg}`
            );
          }
          return response;
        })
        .then((history) =>
          history.data?.pageContent.map(
            (pageContentItem) => pageContentItem?.orderId
          )
        );
    });
    const orders = (await Promise.all(ordersPromises)).flat();
    if (orders.length === 0) {
      return [];
    }
    const batchedOrders = await omniBridgeApi().batchQueryOrderState({
      orderIds: orders,
    });
    const ordersWithDepisitHash = batchedOrders.data.filter(
      (order) => order.depositTxid !== null
    );

    const history = ordersWithDepisitHash.map((order) => {
      return {
        fromChain: getChainByCoinCode(order.depositCoinCode),
        toChain: getChainByCoinCode(order.receiveCoinCode),
        id: order.orderId,
        fromTokenAmount: order.depositCoinAmt,
        toTokenAmount: order.receiveCoinAmt,
        status: getHistoryStatus(order.detailState),
        createTime: formatHistoryDate(order.createTime, SWAP_SERVICES.OmniBridgs),
        depositHashExplore: order.depositHashExplore,
        orderId: order.orderId,
        fromTokenSymbol: order.depositCoinCode,
        toTokenSymbol: order.receiveCoinCode,
        provider: SWAP_SERVICES.OmniBridgs,
      };
    });

    return history;
  }

  async createPrepareTransaction({
    fromProvider,
    fromToken,
    fromAmount,
    publicKeyCard,
  }: GetTransactionParams): Promise<Request> {
    const { token } = await createProviderManagerAndToken(
      fromProvider,
      fromToken
    );

    const tx = await token.transfer({
      recipient: OMNI_CONTRACT_ADDRESS,
      amount: fromAmount,
      keys: publicKeyCard,
    });

    return tx;
  }
}

export default new OmniBridgeService();

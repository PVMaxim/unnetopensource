import swapTokensManifest from "../../manifests/swap-tokens.json";
import {
  GetQuoteParams,
  GetTransactionParams,
  HistoryTransaction,
  ISwapService,
  QuoteResponse,
  SwapToken,
} from "../types";
import { getExplorerTxUrl } from "../chainConfig";
import {
  SWAP_CHAINS,
  SWAP_HISTORY_STATUSES,
  SWAP_NATIVE_ADDRESS,
  SWAP_SERVICES,
  WRAPPED_VENOM_ADDRESS,
} from "../../constants-types";
import BigNumber from "bignumber.js";
import {
  createProviderManagerAndToken,
  getTokenBalance,
} from "../utils/tokenBalances";
import { GetSwapPayloadParams, web3WorlApi } from "../api/web3WorldApi";
import { initialVenomWalletManager } from "../../ApiHandler";
import { getOwnerAddress } from "../utils/ownerAddress";
import { formatHistoryDate } from "../utils/historyTime";
import { web3WorldWhiteListCurrencies } from "../configs";
import { SwapService } from "./swap";
import { sortTokensByChainIds } from "../utils/tokens";
import { Request } from "../../common";

class Web3WorldService extends SwapService implements ISwapService {
  private _name: string = SWAP_SERVICES.Web3World;
  public get name(): string {
    return this._name;
  }

  constructor() {
    super([SWAP_CHAINS.VENOM]);
  }
  async getTokens(): Promise<SwapToken[]> {
    const chainsTokens = sortTokensByChainIds(swapTokensManifest);
    return chainsTokens[SWAP_CHAINS.VENOM] || [];
  }
  async getQuote(
    { fromToken, toToken, amount, accountAddress, slippage }: GetQuoteParams,
    signal: AbortSignal
  ): Promise<QuoteResponse> {
    const isFromTokenIsCore = fromToken.address === SWAP_NATIVE_ADDRESS;
    const isToTokenIsCore = toToken.address === SWAP_NATIVE_ADDRESS;

    const fromTokenIsWrapped = fromToken.address === WRAPPED_VENOM_ADDRESS;
    const toTokenIsWrapped = toToken.address === WRAPPED_VENOM_ADDRESS;

    const isWrap = isFromTokenIsCore && toTokenIsWrapped;
    const isUnwrap = fromTokenIsWrapped && isToTokenIsCore;
    if (isWrap || isUnwrap) {
      return {
        txData: {
          fromTokenAmount: new BigNumber(amount)
            .shiftedBy(fromToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_FLOOR)
            .toFixed(),
          fromTokenDecimal: fromToken.decimals,
          toTokenAmount: amount,
          toTokenDecimal: toToken.decimals,
          dex: SWAP_SERVICES.Web3World,
          path: [],
          fee: 0,
          feeToken: "",
          contractAddress: "",
          logoUrl: "",
          chainFee: "",
          amountOutMin: new BigNumber(amount)
            .shiftedBy(toToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_FLOOR)
            .toString(),
          crossSwapPayload: {
            method: isWrap ? "wrap" : "unwrap",
          },
        },
      };
    }

    const callId = Math.abs(~~(Math.random() * 2 ** 64) | 0);
    const tokenBalance = await getTokenBalance(toToken);
    const tokensList = await this.getTokens();
    const coreToken = tokensList.find(
      (token: any) => token.address === SWAP_NATIVE_ADDRESS
    );
    if (!coreToken) {
      throw new Error("core token not found");
    }
    const nativeBalance = await getTokenBalance(coreToken);
    const params: GetSwapPayloadParams = {
      crossPairInput: {
        amount: new BigNumber(amount)
          .shiftedBy(fromToken.decimals)
          .decimalPlaces(0, BigNumber.ROUND_FLOOR)
          .toString(),
        deep: 3,
        direction: "expectedexchange",
        fromCurrencyAddress: fromToken.address,
        minTvl: "10000",
        slippage: "0.005",
        toCurrencyAddress: toToken.address,
        whiteListCurrencies: web3WorldWhiteListCurrencies,
      },
      id: callId,
      nativeBalance: new BigNumber(nativeBalance)
        .shiftedBy(coreToken.decimals)
        .decimalPlaces(0, BigNumber.ROUND_FLOOR)
        .toString(),
      recipient: accountAddress,
      tokenBalance: new BigNumber(tokenBalance)
        .shiftedBy(toToken.decimals)
        .decimalPlaces(0, BigNumber.ROUND_FLOOR)
        .toString(),
    };

    if (isFromTokenIsCore) {
      params.nativeInfo = "spendonlynative";
      params.crossPairInput.fromCurrencyAddress = WRAPPED_VENOM_ADDRESS;
    }

    if (isToTokenIsCore) {
      params.nativeInfo = "receivenative";
      params.crossPairInput.toCurrencyAddress = WRAPPED_VENOM_ADDRESS;
    }

    const res = await web3WorlApi().getSwapPayload(params, signal);

    return {
      txData: {
        fromTokenAmount: new BigNumber(amount)
          .shiftedBy(fromToken.decimals)
          .decimalPlaces(0, BigNumber.ROUND_FLOOR)
          .toFixed(),
        fromTokenDecimal: fromToken.decimals,
        toTokenAmount: new BigNumber(
          res.route.steps.slice(-1)[0].expectedReceiveAmount
        )
          .shiftedBy(-(toToken?.decimals ?? 9))
          .toFixed(),
        toTokenDecimal: toToken.decimals,
        path: [],
        dex: SWAP_SERVICES.Web3World,
        fee: 0,
        feeToken: "",
        contractAddress: "",
        logoUrl: "",
        chainFee: "",
        amountOutMin: res.route.steps.slice(-1)[0].expectedReceiveAmount,
        crossSwapPayload: {
          method: isFromTokenIsCore ? "acceptNative" : "swap",
          ...res,
        },
      },
    };
  }

  async createTransaction({
    crossSwapPayload,
    fromProvider,
    fromToken,
    fromAmount,
    publicKeyCard,
  }: GetTransactionParams): Promise<{ tx: Request; orderId: string }> {
    console.log("called createTransaction", crossSwapPayload);
    if (crossSwapPayload?.method === "wrap") {
      const { token } = await createProviderManagerAndToken(
        fromProvider,
        fromToken
      );
      const tx = await token.transfer({
        recipient: WRAPPED_VENOM_ADDRESS,
        amount: Number(fromAmount) + 1,
        keys: publicKeyCard,
      });
      return { tx, orderId: "" };
    }

    if (crossSwapPayload?.method === "unwrap") {
      const { token, providerManager } = await createProviderManagerAndToken(
        fromProvider,
        fromToken
      );
      const owner = await getOwnerAddress(providerManager, publicKeyCard);
      if (token.getWalletAddress === undefined) {
        throw new Error(
          "getWalletAddress method is not implemented for this token"
        );
      }
      const walletAddress = await token.getWalletAddress(owner);
      const venomWallet = (providerManager as any).createVault(walletAddress);
      const tx = await venomWallet.transfer({
        recipient: WRAPPED_VENOM_ADDRESS,
        amount: new BigNumber(fromAmount)
          .shiftedBy(fromToken.decimals)
          .toString(),
        keys: publicKeyCard,
      });
      return { tx, orderId: "" };
    }
    if (crossSwapPayload?.method === "acceptNative") {
      const provider: any = initialVenomWalletManager(false);
      const venomWallet = provider.createVault(
        crossSwapPayload.walletOfDestination
      );

      const tx = await venomWallet.acceptNative({
        value: new BigNumber(fromAmount).plus(1)
          .shiftedBy(fromToken.decimals)
          .toString(),
        crossSwapPayload,
        keys: publicKeyCard,
      });
      return { tx, orderId: "" };
    }

    if (crossSwapPayload?.method === "swap") {
      const provider: any = initialVenomWalletManager(false);
      const venomWallet = provider.createVault(
        crossSwapPayload.walletOfDestination
      );
      const tx = await venomWallet.swap({
        crossSwapPayload,
        keys: publicKeyCard,
      });
      return { tx, orderId: "" };
    }

    throw new Error("Method not implemented.");
  }

  async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    console.log("called getSwapHistory", addresses);
    const ordersPromises = addresses.map(async (address) => {
      return web3WorlApi()
        .getTransactionsHistory({
          limit: 100,
          offset: 0,
          ordering: "blocktimedescending",
          whiteListUri: "https://static.web3.world/assets/manifest.json",
          eventType: ["swap", "deposit", "withdraw"],
          userAddress: address,
        })
        .then((res) => {
          console.log({ res });
          return res.transactions.map((tx: any) => tx);
        });
    });
    const orders = (await Promise.all(ordersPromises)).flat();
    if (orders.length === 0) {
      return [];
    }
    const tokens = await this.getTokens();
    const history = orders.map((order) => {
      const fromToken = tokens.find(
        (token) => token.address === order.currencyAddresses[0]
      );
      const toToken = tokens.find(
        (token) => token.address === order.currencyAddresses[1]
      );
      return {
        fromChain: fromToken?.chain ?? "",
        toChain: toToken?.chain ?? "",
        id: order.messageHash,
        fromTokenAmount: new BigNumber(order.volumes[0])
          .shiftedBy(-(fromToken?.decimals || 0))
          .toFixed(),
        toTokenAmount: new BigNumber(order.volumes[1])
          .shiftedBy(-(toToken?.decimals || 0))
          .toFixed(),
        status: SWAP_HISTORY_STATUSES.SUCCESS,
        createTime: formatHistoryDate(order.timestampBlock * 1000, SWAP_SERVICES.Web3World),
        depositHashExplore: getExplorerTxUrl(SWAP_CHAINS.VENOM, order.transactionHash),
        orderId: order.messageHash,
        fromTokenSymbol: fromToken?.symbol ?? "",
        toTokenSymbol: toToken?.symbol ?? "",
        provider: SWAP_SERVICES.Web3World,
      };
    });

    return history;
  }

  async createPrepareTransaction(args: GetTransactionParams): Promise<Request> {
    const { tx } = await this.createTransaction(args);
    return tx;
  }
}

export default new Web3WorldService();

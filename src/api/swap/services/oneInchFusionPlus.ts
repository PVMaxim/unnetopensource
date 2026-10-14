import BigNumber from "bignumber.js";
import { CardKeys, Request } from "../../common";
import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS, SWAP_SERVICES } from "../../constants-types";
import oneInchApi, {
  EvmSignedOrder,
  type OneInchMultiChainToken,
  OrderData,
  OrderItem,
  ReadyToAcceptSecretFill,
} from "../api/oneInchApi";
import { getChainByEvmId } from "../chainConfig";
import {
  FusionQuote,
  GetQuoteParams,
  GetTransactionParams,
  HistoryTransaction,
  ISwapService,
  QuoteResponse,
  SwapChain,
  SwapToken,
} from "../types";
import tokens from "../../manifests/swap-tokens.json";
import { createProviderManagerAndToken } from "../utils/tokenBalances";
import { getOwnerAddress } from "../utils/ownerAddress";
import {
  generateSecrets,
  genSecretsAndHashes,
  getHashesFromSecrets,
} from "../utils/oneInchSdk";
import {
  EvmAddress,
  Quote,
  SolanaAddress,
  Preset as SdkPreset,
  SvmSrcEscrowFactory,
  HashLock,
} from "@1inch/cross-chain-sdk";
import { PublicKey } from "@solana/web3.js";
import { getHistoryStatus } from "../utils/serviceStatuses";
import { formatHistoryDate } from "../utils/historyTime";
import { getSecp256k1Key } from "../../utils";
import { OneInch } from "./oneInch";
import { EvmTypedDataRequestSecp } from "../utils/request";
import { sortTokensByChainIds } from "../utils/tokens";

function manifestChainId(chain: SwapChain): string {
  return chain === SWAP_CHAINS.SOLANA ? "SOL" : chain;
}

function mapOneInchTokenToSwapToken(
  t: OneInchMultiChainToken,
): SwapToken | null {
  const chain = getChainByEvmId(t.chainId);
  if (!chain) return null;

  
  let address =
    chain === SWAP_CHAINS.SOLANA ? t.address : t.address.toLowerCase();

  if(chain === SWAP_CHAINS.SOLANA && t.address === "SoNative11111111111111111111111111111111111")  {
    address = SWAP_NATIVE_ADDRESS;
  }
  
  return {
    symbol: t.symbol,
    name: t.name,
    address,
    decimals: t.decimals,
    logoURI: t.logoURI ?? null,
    chain,
    chainId: manifestChainId(chain),
    isCrossEnable: 1,
    withdrawGas: 0,
  };
}

class OneInchFusionPlus extends OneInch implements ISwapService {
  private _name: string = SWAP_SERVICES.OneInchFusionPlus;
  private _secrets = new Map<string, string[]>();

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
      SWAP_CHAINS.SOLANA,
    ]);
  }

  async getTokens(signal?: AbortSignal): Promise<SwapToken[]> {
    const raw = await oneInchApi().getTokens(signal);
    const swapTokens = raw
      .map(mapOneInchTokenToSwapToken)
      .filter((t): t is SwapToken => t !== null);
      console.log("OneInch getTokens sorted by chain ids:", sortTokensByChainIds(swapTokens));
    return swapTokens;
  }

  checkDirection(fromToken: SwapToken, toToken: SwapToken): boolean {
    return (
      fromToken.chain !== toToken.chain &&
      this._suportedProviders.includes(fromToken.chain) &&
      this._suportedProviders.includes(toToken.chain)
    );
  }

  async getQuote(
    params: GetQuoteParams,
    signal: AbortSignal
  ): Promise<QuoteResponse> {
    try {
      const srcTokenAddress = this.normalizeFromTokenAddress(params.fromToken);
      const dstTokenAddress = this.normalizeToTokenAddress(params.toToken);
      const response = await oneInchApi().getCrossChainQuote(
        {
          srcChain: this.getChainId(params.fromToken.chain),
          dstChain: this.getChainId(params.toToken.chain),
          srcTokenAddress,
          dstTokenAddress,
          amount: new BigNumber(params.amount)
            .shiftedBy(params.fromToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_FLOOR)
            .toFixed(),
          walletAddress: params.accountAddress,
          enableEstimate: false,
          fee: "0",
        },
        signal
      );
      if (!response || !response.dstTokenAmount) {
        throw new Error("No quote available from OneInch.");
      }
      let address = "";
      if (params.fromToken.chain !== SWAP_CHAINS.SOLANA) {
        address = await oneInchApi()
          .getRouteAddress(this.getChainId(params.fromToken.chain), signal)
          .then((res) => res.address);
      }

      return {
        txData: {
          fromTokenAmount: new BigNumber(params.amount)
            .shiftedBy(params.fromToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_FLOOR)
            .toFixed(),
          fromTokenDecimal: params.fromToken.decimals,
          toTokenAmount: new BigNumber(response.dstTokenAmount)
            .shiftedBy(-params.toToken?.decimals)
            .toFixed(),
          toTokenDecimal: params.toToken.decimals,
          path: [],
          fee: 0,
          feeToken: "",
          contractAddress: address,
          logoUrl: "",
          chainFee: "",
          amountOutMin: response.dstTokenAmount,
          dex: SWAP_SERVICES.OneInchFusionPlus,
        },
      };
    } catch (error) {
      if (
        (error as any)?.response?.data?.description &&
        (error as any).response.data.description === "swap amount too small"
      ) {
        return {
          txData: {
            fromTokenAmount: new BigNumber(params.amount)
              .shiftedBy(params.fromToken.decimals)
              .decimalPlaces(0, BigNumber.ROUND_FLOOR)
              .toString(),
            fromTokenDecimal: params.fromToken.decimals,
            toTokenAmount: "0",
            toTokenDecimal: params.toToken.decimals,
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

  async getQuoteWithId(params: GetQuoteParams): Promise<FusionQuote> {
    const srcTokenAddress = this.normalizeFromTokenAddress(params.fromToken);
    const dstTokenAddress = this.normalizeToTokenAddress(params.toToken);

    const response = await oneInchApi().getCrossChainQuote({
      srcChain: this.getChainId(params.fromToken.chain),
      dstChain: this.getChainId(params.toToken.chain),
      srcTokenAddress,
      dstTokenAddress,
      amount: new BigNumber(params.amount)
        .shiftedBy(params.fromToken.decimals)
        .decimalPlaces(0, BigNumber.ROUND_FLOOR)
        .toString(),
      walletAddress: params.accountAddress,
      enableEstimate: true,
      fee: "0",
    });
    if (!response || !response.dstTokenAmount) {
      throw new Error("No quote available from OneInch.");
    }

    return response;
  }

  async createSolanaTransaction({
    fromProvider,
    publicKeyCard,
    fromAmount,
    fromToken,
    toToken,
    slippage,
    toProvider,
  }: GetTransactionParams): Promise<{ tx: Request; orderId: string }> {
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);
    const toAddress = await getOwnerAddress(toProvider, publicKeyCard);
    const fusionQuote = await this.getQuoteWithId({
      fromToken: fromToken,
      toToken: toToken,
      amount: fromAmount,
      accountAddress: fromAddress,
      slippage: Number(slippage),
    });

    const recomendedPresetData =
      fusionQuote.presets[fusionQuote.recommendedPreset];
    const secretsCount = recomendedPresetData.secretsCount;
    const { secrets, hashLock, secretHashes } =
      genSecretsAndHashes(secretsCount);

    const sdkQuote = this.createSdkQuote(
      {
        fromToken: fromToken,
        toToken: toToken,
        amount: fromAmount,
        accountAddress: fromAddress,
        slippage: Number(slippage),
      },
      fusionQuote
    );

    const sdkOrder = sdkQuote.createSolanaOrder({
      hashLock,
      preset: sdkQuote.recommendedPreset,
      receiver: EvmAddress.fromString(toAddress),
    });

    const solanaOrder = sdkOrder.toJSON();

    const auctionDetails = new SdkPreset(
      fusionQuote.presets[fusionQuote.recommendedPreset]
    ).createAuctionDetails();

    const auction = solanaOrder.details.auction;
    const startTime = Number(auction.startTime);
    const duration = Number(auction.duration);

    const orderForSubmit = {
      srcChainId: this.getChainId(fromToken.chain),
      dstChainId: this.getChainId(toToken.chain),
      auctionData: {
        startTime,
        duration,
        initialRateBump: Number(auction.initialRateBump),
        pointsAndTimeDeltas: auction.points.map((p) => ({
          rateBump: Number(p.coefficient),
          timeDelta: Number(p.delay),
        })),
      },
      secretHashes: secretHashes.length === 1 ? undefined : secretHashes,
      quoteId: fusionQuote.quoteId!,

      order: {
        hashLock: solanaOrder.escrowParams.hashLock,
        amount: solanaOrder.orderInfo.srcAmount,
        srcSafetyDeposit: solanaOrder.escrowParams.srcSafetyDeposit,
        dstSafetyDeposit: solanaOrder.escrowParams.dstSafetyDeposit,
        timeLocks: solanaOrder.escrowParams.timeLocks,
        expirationTime:
          Number(solanaOrder.extra.orderExpirationDelay) + startTime + duration,
        assetIsNative: solanaOrder.extra.srcAssetIsNative,
        dstAmount: solanaOrder.orderInfo.minDstAmount,
        dutchAuctionDataHash:
          "0x" + Buffer.from(auctionDetails.hashForSolana()).toString("hex"),
        maxCancellationPremium:
          solanaOrder.extra.resolverCancellationConfig.maxCancellationPremium,
        cancellationAuctionDuration: Number(
          solanaOrder.extra.resolverCancellationConfig
            .cancellationAuctionDuration
        ),
        allowMultipleFills: solanaOrder.extra.allowMultipleFills,
        salt: solanaOrder.extra.salt,
        maker: solanaOrder.orderInfo.maker,
        receiver: solanaOrder.orderInfo.receiver,
        srcMint: solanaOrder.orderInfo.srcToken,
        dstMint: solanaOrder.orderInfo.dstToken,
      },
    };
    const orderId = sdkOrder.getOrderHash(this.getChainId(fromToken.chain));
    await oneInchApi().submitOrder(orderForSubmit);

    const ix = SvmSrcEscrowFactory.DEFAULT.createOrder(sdkOrder, {
      srcTokenProgramId: SolanaAddress.TOKEN_PROGRAM_ID,
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
    this._secrets.set(orderId, secrets);
    return { tx, orderId };
  }

  async createEvmTransaction({
    fromProvider,
    publicKeyCard,
    fromAmount,
    fromToken,
    toToken,
    slippage,
    toProvider,
  }: GetTransactionParams): Promise<{
    tx: Request;
    orderId: string;
    dstAmount: string;
  }> {
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);
    const toAddress = await getOwnerAddress(toProvider, publicKeyCard);
    const fusionQuote = await this.getQuoteWithId({
      fromToken,
      toToken,
      amount: fromAmount,
      accountAddress: fromAddress,
      slippage: Number(slippage),
    });
    if (fusionQuote.quoteId === null) {
      throw new Error("Is need quote id");
    }
    const recomendedPresetData =
      fusionQuote.presets[fusionQuote.recommendedPreset];

    const secretsCount = recomendedPresetData.secretsCount;
    const secrets = generateSecrets(secretsCount);
    const hashLocks = getHashesFromSecrets(secrets);

    const order = await this.buildEvmOrder(fusionQuote, [hashLocks], toAddress);
    const dataHash = this.convertTypedDataToHash(order.typedData);
    const publicKey = getSecp256k1Key(publicKeyCard as CardKeys);
    const tx = new EvmTypedDataRequestSecp(
      { hash: dataHash, publicKey },
      async (signature) => {
        await this.submitOrder({
          order: order.typedData.message,
          secretHashes: secretsCount === 1 ? undefined : [hashLocks],
          quoteId: fusionQuote.quoteId,
          srcChainId: this.getChainId(fromProvider.swapChain),
          signature,
          extension: order.extension,
        });
      }
    );
    this._secrets.set(order.orderHash, secrets);
    return {
      tx,
      orderId: order.orderHash,
      dstAmount: fusionQuote.dstTokenAmount,
    };
  }

  async createTransaction(
    params: GetTransactionParams
  ): Promise<{ tx: Request; orderId: string }> {
    if (params.fromToken.chain === SWAP_CHAINS.SOLANA) {
      return this.createSolanaTransaction(params);
    }
    return this.createEvmTransaction(params);
  }

  async updateOrderAnaUploadHash({
    orderId,
  }: {
    orderId: string;
  }): Promise<number> {
    if (this._secrets.has(orderId)) {
      this.monitorAndSubmitSecrets(orderId, this._secrets.get(orderId)!);
      this._secrets.delete(orderId);
    }
    return 100;
  }

  async createPrepareSolanaTransaction({
    fromProvider,
    publicKeyCard,
    fromAmount,
    fromToken,
    toToken,
    slippage,
    toProvider,
  }: GetTransactionParams): Promise<Request> {
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);
    const toAddress = await getOwnerAddress(toProvider, publicKeyCard);
    const fusionQuote = await this.getQuoteWithId({
      fromToken: fromToken,
      toToken: toToken,
      amount: fromAmount,
      accountAddress: fromAddress,
      slippage: Number(slippage),
    });

    const recomendedPresetData =
      fusionQuote.presets[fusionQuote.recommendedPreset];
    const secretsCount = recomendedPresetData.secretsCount;
    const { hashLock } = genSecretsAndHashes(secretsCount);

    const sdkQuote = this.createSdkQuote(
      {
        fromToken: fromToken,
        toToken: toToken,
        amount: fromAmount,
        accountAddress: fromAddress,
        slippage: Number(slippage),
      },
      fusionQuote
    );

    const sdkOrder = sdkQuote.createSolanaOrder({
      hashLock,
      preset: sdkQuote.recommendedPreset,
      receiver: EvmAddress.fromString(toAddress),
    });

    const ix = SvmSrcEscrowFactory.DEFAULT.createOrder(sdkOrder, {
      srcTokenProgramId: SolanaAddress.TOKEN_PROGRAM_ID,
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

    return tx;
  }

  async createPrepareEvmTransaction({
    fromProvider,
    publicKeyCard,
    fromAmount,
    fromToken,
    toToken,
    slippage,
    toProvider,
  }: GetTransactionParams): Promise<Request> {
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);
    const toAddress = await getOwnerAddress(toProvider, publicKeyCard);
    const fusionQuote = await this.getQuoteWithId({
      fromToken,
      toToken,
      amount: fromAmount,
      accountAddress: fromAddress,
      slippage: Number(slippage),
    });
    if (fusionQuote.quoteId === null) {
      throw new Error("Is need quote id");
    }
    const recomendedPresetData =
      fusionQuote.presets[fusionQuote.recommendedPreset];

    const secretsCount = recomendedPresetData.secretsCount;
    const secrets = generateSecrets(secretsCount);
    const hashLocks = getHashesFromSecrets(secrets);

    const order = await this.buildEvmOrder(fusionQuote, [hashLocks], toAddress);
    const dataHash = this.convertTypedDataToHash(order.typedData);
    const publicKey = getSecp256k1Key(publicKeyCard);
    const tx = new EvmTypedDataRequestSecp({
      hash: dataHash,
      publicKey,
    });
    return tx;
  }

  async createPrepareTransaction(
    params: GetTransactionParams
  ): Promise<Request> {
    if (params.fromToken.chain === SWAP_CHAINS.SOLANA) {
      return this.createPrepareSolanaTransaction(params);
    }
    return this.createPrepareEvmTransaction(params);
  }

  async buildEvmOrder(
    quote: FusionQuote,
    secretsHashList: HashLock[],
    receiver: string
  ): Promise<OrderData> {
    if (!quote.quoteId) {
      throw new Error("Is need quote id");
    }
    const order = await oneInchApi().buildEvmOrder(
      {
        quoteId: quote.quoteId,
      },
      {
        secretsHashList,
        receiver,
        preset: quote.recommendedPreset,
      }
    );
    return order;
  }

  async submitOrder(order: EvmSignedOrder) {
    return oneInchApi().submitOrder(order);
  }

  async monitorAndSubmitSecrets(
    orderHash: string,
    secrets: string[]
  ): Promise<void> {
    console.log("Starting to monitor for fills...");

    const alreadyShared = new Set<number>();

    while (true) {
      try {
        const order = await oneInchApi().getOrderByHash(orderHash);
        if (order.status === "executed") {
          console.log("Order is complete.");
          return;
        }
      } catch (err) {
        console.error(
          `Error while getting order status: ${JSON.stringify(err, null, 2)}`
        );
      }

      try {
        const readyToAcceptSecrets =
          await oneInchApi().getReadyToAcceptSecretFills(orderHash);
        const idxes = readyToAcceptSecrets.fills.map(
          (f: ReadyToAcceptSecretFill) => f.idx
        );

        for (const idx of idxes) {
          if (!alreadyShared.has(idx)) {
            try {
              await oneInchApi().submitSecret(orderHash, secrets[idx]);
              alreadyShared.add(idx);
              console.log("Submitted secret for index:", idx);
            } catch (err) {
              console.error("Failed to submit secret for index", idx, ":", err);
            }
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
        console.log("polling for fills...");
      } catch (err) {
        console.error("Error while monitoring fills:", err);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        console.log("retrying after error...");
      }
    }
  }

  createSdkQuote(params: GetQuoteParams, quoteResponse: FusionQuote): Quote {
    const srcTokenAddress = this.normalizeFromTokenAddress(params.fromToken);
    const dstTokenAddress = this.normalizeToTokenAddress(params.toToken);

    return Quote.fromSolanaQuote(
      {
        srcChain: this.getChainId(params.fromToken.chain),
        dstChain: this.getChainId(params.toToken.chain),
        srcTokenAddress: SolanaAddress.fromString(srcTokenAddress),
        dstTokenAddress: EvmAddress.fromString(dstTokenAddress),
        amount: new BigNumber(params.amount)
          .shiftedBy(params.fromToken.decimals)
          .decimalPlaces(0, BigNumber.ROUND_FLOOR)
          .toString(),
        walletAddress: SolanaAddress.fromString(params.accountAddress),
        enableEstimate: true,
        fee: 0,
      },
      quoteResponse
    );
  }

  async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    const orderPromises = addresses.map(async (address) => {
      return oneInchApi()
        .getOrdersByMaker(address)
        .then((history) => history.items);
    });
    const orders = (await Promise.all(orderPromises)).flat();
    const history = orders.map((order) => this.convertOrderToHistory(order));
    return history;
  }

  convertOrderToHistory(order: OrderItem): HistoryTransaction {
    const fromChain = this.getSwapChainById(order.srcChainId);
    const toChain = this.getSwapChainById(order.dstChainId);

    const fromTokenAddress = this.checkSolanaNativeAddress(order.makerAsset);

    const fromToken = tokens.find(
      (token) =>
        token.chain === fromChain &&
        token.address.toLowerCase() === fromTokenAddress.toLowerCase()
    );
    if (!fromToken) {
      throw new Error("From token not found in manifest");
    }

    const toTokenAddress = this.checkSolanaNativeAddress(order.takerAsset);

    const toToken = tokens.find(
      (token) =>
        token.chain === toChain &&
        token.address.toLowerCase() === toTokenAddress.toLowerCase()
    );
    if (!toToken) {
      throw new Error("To token not found in manifest");
    }
    return {
      fromChain,
      toChain,
      fromTokenAmount: new BigNumber(order.makerAmount)
        .shiftedBy(-fromToken?.decimals)
        .toString(),
      toTokenAmount: new BigNumber(order.minTakerAmount)
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
      provider: SWAP_SERVICES.OneInchFusionPlus,
    };
  }
}

export default new OneInchFusionPlus();

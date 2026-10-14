import { FusionQuote } from "../types";
import { MessageTypes, TypedMessage } from "@metamask/eth-sig-util";
import { HashLock } from "@1inch/cross-chain-sdk";

export interface OneInchMultiChainToken {
  chainId: number;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string;
  providers: string[];
  eip2612: boolean;
  tags: string[];
}

export type OneInchMultiChainTokensResponse = OneInchMultiChainToken[];

type GeQuoteParams = {
  chain: number;
  src: string;
  dst: string;
  amount: string;
  fee:  number;
};

type GetCrossChainQuoteParams = {
  srcChain: number;
  dstChain: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  amount: string;
  walletAddress: string;
  enableEstimate: boolean;
  fee: string;
};

type GetTxDataParams = {
  chain: number;
  src: string;
  dst: string;
  amount: string;
  from: string;
  slippage: string;
  origin: string;
  fee: number;
  referrer: string;
};

type HistoryTokenAction = {
  chainId: string;
  address: string;
  standard: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  direction: string;
};

type HistoryItem = {
  timeMs: number;
  address: string;
  type: number;
  rating: string;
  direction: string;
  details: {
    txHash: string;
    chainId: number;
    blockNumber: number;
    blockTimeSec: number;
    status: string;
    type: string;
    tokenActions: HistoryTokenAction[];
    fromAddress: string;
    toAddress: string;
    nonce: number;
    orderInBlock: number;
    feeInSmallestNative: string;
  };
  id: string;
  eventOrderInTransaction: number;
};

type HistoryResponse = {
  cacheCounter: number;
  items: HistoryItem[];
};

type BuildEvmOrderParams = {
  quoteId: string;
};

type BuildEvmOrderBody = {
  secretsHashList: HashLock[];
  receiver: string;
  preset: string;
  permit?: string;
  isPermit2?: boolean;
};

export interface EIP712Type {
  name: string;
  type: string;
}

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}



export interface OrderData {
  typedData: TypedMessage<MessageTypes>;
  orderHash: string;
  extension: string;
}

export interface EvmSignedOrder {
  order: Record<string, any>;
  srcChainId: number;
  signature: string;
  extension: string;
  quoteId: string;
  secretHashes: HashLock[] | undefined;
}

interface SolanaSubmittedOrderInput {
  order: CreateSolanaOrderParams;
  srcChainId: string;
  dstChainId: string;
  auctionData: AuctionData;
  secretHashes: string[];
  quoteId: string;
}

interface CreateSolanaOrderParams {
  hashLock: string;
  amount: string;
  srcSafetyDeposit: string;
  dstSafetyDeposit: string;
  timeLocks: string;
  expirationTime: number;
  assetIsNative: boolean;
  dstAmount: string;
  dutchAuctionDataHash: string;
  maxCancellationPremium: string;
  cancellationAuctionDuration: number;
  allowMultipleFills: boolean;
  salt: number;
  maker: string;
  receiver: string;
  srcMint: string;
  dstMint: string;
}

interface AuctionData {
  startTime: number;
  duration: number;
  initialRateBump: number;
  pointsAndTimeDeltas: PointAndTimeDelta[];
}

interface PointAndTimeDelta {
  rateBump: number;
  timeDelta: number;
}

export enum OrderStatus {
  Pending = "pending",
  Executed = "executed",
  Expired = "expired",
  Cancelled = "cancelled",
  Refunding = "refunding",
  Refunded = "refunded",
}

export type OrderStatusResponse = {
  orderHash: string;
  status: OrderStatus;
};

export type ReadyToAcceptSecretFill = {
  idx: number;
  srcEscrowDeployTxHash: string;
  dstEscrowDeployTxHash: string;
};

export type ReadyToAcceptSecretFills = {
  fills: ReadyToAcceptSecretFill[];
};

export type SolanaOrderAuctionData = {
  startTime: number;
  duration: number;
  initialRateBump: number;
  pointsAndTimeDeltas: Array<{
    rateBump: number;
    timeDelta: number;
  }>;
};

type SolanaOrder = {
  srcChainId: number;
  dstChainId: number;
  auctionData: SolanaOrderAuctionData;
  secretHashes: string[] | undefined;
  quoteId: string;
  order: {
    hashLock: string;
    amount: string;
    srcSafetyDeposit: string;
    dstSafetyDeposit: string;
    timeLocks: string;
    expirationTime: number;
    assetIsNative: boolean;
    dstAmount: string;
    dutchAuctionDataHash: string;
    maxCancellationPremium: string;
    cancellationAuctionDuration: number;
    allowMultipleFills: boolean;
    salt: string;
    maker: string;
    receiver: string;
    srcMint: string;
    dstMint: string;
  };
};

export interface OrdersDataResponse {
  meta: Meta;
  items: OrderItem[];
}

export interface Meta {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

export interface OrderItem {
  deadline: number;
  srcChainId: number;
  dstChainId: number;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  minTakerAmount: string;
  remainingMakerAmount: string;
  fills: Fill[];
  maker: string;
  validation: string;
  createdAt: number;
  orderHash: string;
  approximateTakingAmount: string;
  status: string;
  cancelTx: string | null;
  auctionStartDate: number;
  auctionDuration: number;
  initialRateBump: number;
  points: unknown | null;
  order: EvmOrderItem | SolanaOrderItem;
  extension: string;
  timeLocks: string;
  receiver: string;
  positiveSurplus: string;
  isNativeOrder: boolean;
  cancelable: boolean;
}

export interface Fill {
  txHash: string;
  filledMakerAmount: string;
  filledAuctionTakerAmount: string;
  escrowEvents: EscrowEvent[];
  status: string;
}

export interface EscrowEvent {
  transactionHash: string;
  escrow: string;
  side: string;
  action: "src_escrow_created" | "dst_escrow_created" | "withdrawn" | string;
  blockTimestamp: number;
}

export interface EvmOrderItem {
  salt: string;
  maker: string;
  receiver: string;
  makerAsset: string;
  takerAsset: string;
  makerTraits: string;
  makingAmount: string;
  takingAmount: string;
}

interface SolanaOrderItem {
  extra: SolanaOrderExtra;
  details: SolanaOrderDetails;
  quoteId: string;
  orderInfo: SolanaOrderInfo;
  escrowParams: SolanaEscrowParams;
}

interface SolanaOrderExtra {
  salt: string;
  source: string;
  srcAssetIsNative: boolean;
  allowMultipleFills: boolean;
  orderExpirationDelay: string;
  resolverCancellationConfig: ResolverCancellationConfig;
}

interface ResolverCancellationConfig {
  maxCancellationPremium: string;
  cancellationAuctionDuration: number;
}

interface SolanaOrderDetails {
  auction: SolanaAuction;
}

interface SolanaAuction {
  points: AuctionPoint[];
  duration: string;
  startTime: string;
  initialRateBump: number;
}
interface AuctionPoint {
  delay: number;
  coefficient: number;
}
interface SolanaOrderInfo {
  maker: string;
  dstToken: string;
  receiver: string;
  srcToken: string;
  srcAmount: string;
  minDstAmount: string;
}

interface SolanaEscrowParams {
  hashLock: string;
  timeLocks: string;
  dstChainId: number;
  srcChainId: number;
  dstSafetyDeposit: string;
  srcSafetyDeposit: string;
}

const oneInchApi = () => {
  const apiUrlPrefix = "https://1inch.worker.united.network";
  const defaultHeaders = { "Content-Type": "application/json" };

  const getTokens = async (
    signal?: AbortSignal
  ): Promise<OneInchMultiChainTokensResponse> => {
    const url = new URL(apiUrlPrefix + `/token/v1.4/multi-chain`);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: defaultHeaders,
      signal,
    });
    return response.json();
  };

  const getQuote = async (params: GeQuoteParams, signal: AbortSignal) => {
    const url = new URL(apiUrlPrefix + `/swap/v6.1/${params.chain}/quote`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(url.toString(), { headers: defaultHeaders, signal });
    return response.json();
  };

  const getCrossChainQuote = async (
    params: GetCrossChainQuoteParams,
    signal?: AbortSignal
  ): Promise<FusionQuote> => {
    const url = new URL(apiUrlPrefix + `/fusion-plus/quoter/v1.2/quote/receive`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(url.toString(), { headers: defaultHeaders, signal });
    return response.json();
  };

  const getRouteAddress = async (chainId: number, signal?: AbortSignal) => {
    const response = await fetch(
      apiUrlPrefix + `/swap/v6.1/${chainId}/approve/spender`,
      { headers: defaultHeaders, signal }
    );
    return response.json();
  };

  const getTxData = async (params: GetTxDataParams) => {
    const url = new URL(apiUrlPrefix + `/swap/v6.1/${params.chain}/swap`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(url.toString(), { headers: defaultHeaders });
    return response.json();
  };

  const getHistory = async (
    chainIds: string[],
    address: string
  ): Promise<HistoryResponse> => {
    const response = await fetch(
      apiUrlPrefix + `/history/v2.0/history/${address}/events`,
      {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          filter: {
            chain_ids: chainIds,
            transaction_types: ["SwapExactInput"],
            limit: 200,
          },
        }),
      }
    );
    return response.json();
  };

  const buildEvmOrder = async (
    params: BuildEvmOrderParams,
    body: BuildEvmOrderBody
  ): Promise<OrderData> => {
    const url = new URL(apiUrlPrefix + `/fusion-plus/quoter/v1.1/quote/build/evm`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ ...body }),
    });
    return response.json();
  };

  const submitOrder = async (
    body: EvmSignedOrder | SolanaOrder
  ): Promise<void> => {
    await fetch(
      apiUrlPrefix + `/fusion-plus/relayer/v1.1/submit`,
      {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ ...body }),
      }
    );
  };

  const getOrderByHash = async (hash: string): Promise<OrderStatusResponse> => {
    const response = await fetch(
      apiUrlPrefix + `/fusion-plus/orders/v1.1/order/status/${hash}`,
      { headers: defaultHeaders }
    );
    return response.json();
  };

  const getReadyToAcceptSecretFills = async (
    hash: string
  ): Promise<ReadyToAcceptSecretFills> => {
    const response = await fetch(
      apiUrlPrefix +
        `/fusion-plus/orders/v1.1/order/ready-to-accept-secret-fills/${hash}`,
      { headers: defaultHeaders }
    );
    return response.json();
  };

  const submitSecret = async (orderHash: string, secret: string) => {
     await fetch(
      apiUrlPrefix + "/fusion-plus/relayer/v1.1/submit/secret",
      {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ secret, orderHash }),
      }
    );
  };

  const getOrdersByMaker = async (
    maker: string
  ): Promise<OrdersDataResponse> => {
    const response = await fetch(
      apiUrlPrefix + `/fusion-plus/orders/v1.1/order/maker/${maker}`,
      { headers: defaultHeaders }
    );
    return response.json();
  };

  return {
    getTokens,
    getQuote,
    getRouteAddress,
    getTxData,
    getHistory,
    getCrossChainQuote,
    buildEvmOrder,
    submitOrder,
    getOrderByHash,
    getReadyToAcceptSecretFills,
    submitSecret,
    getOrdersByMaker,
  };
};

export default oneInchApi;

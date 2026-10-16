import { CardKeys, Request } from "../common";
import { SWAP_CHAINS, SWAP_HISTORY_STATUSES } from "../constants-types";
import { SwapQuoteResponse } from "./api/omnistonApi.types";

export  type SwapToken = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string | null;
  chain: string;
  ticker?: string;
  isCrossEnable?: number;
  withdrawGas?: number;
  chainId?: string;
  changellyTicker?: string;
  currencyCode?: string;  // for XRP tokens
}

export type GetQuoteParams = {
  fromToken: SwapToken;
  toToken: SwapToken;
  amount: string;
  accountAddress: string;
  slippage: number;
};

export interface QuoteResponse {
    txData: {
        fromTokenAmount: string;
        fromTokenDecimal: number;
        toTokenAmount: string;
        toTokenDecimal: number;
        dex: string;
        path: string[];
        fee: number;
        feeToken: string;
        contractAddress: string;
        logoUrl: string;
        chainFee: string;
        depositMin?: string;
        depositMax?: string;
        amountOutMin: string;
        estimatedTime?: number;
        instantRate?: string;
        crossSwapPayload?: {
            method: string;
        };
        quote?: SwapQuoteResponse;
    }
}

export type SwapChain = typeof SWAP_CHAINS[keyof typeof SWAP_CHAINS];

export type SwapProvider = {
    name: string;
    type: string;
    swapChain: SwapChain;
}

export type GetTransactionParams = {
    fromToken: SwapToken;
    toToken: SwapToken;
    fromAmount: string;
    amountOutMin: string;
    fromProvider: SwapProvider;
    toProvider: SwapProvider;
    slippage: string;
    publicKeyCard: CardKeys;
    crossSwapPayload?: any;
    quote?: SwapQuoteResponse
}

export type GetSwapDataResponse = {
    data: string;
    to: string;
    value: string;
    tronRouterAddrees: string;
    functionName: string;
    options: {
        feeLimit: number;
        callValue: number;
    };
    parameter: any;
    fromAddress: string;
    address: string;
    amount: string;
    payload: string;
    tx: {
        keys: {
        pubkey: string;
        isSigner: boolean;
        isWritable: boolean;
        }[];
        programId: string;
        data: number[];
    }[];
    signer: string;
    solanaTx: {
        from: string;
        serializedMessage: string;
    };
    memo: string;
    toAddress: string;
}

export type XRPGetSwapDataResponse = {
    TransactionType: string;
    Destination: string;
    Amount: string;
    Memos: {
        Memo: {
            MemoData: string;
        }
    }[]
}
    
export type HistoryTransaction = {
  fromChain: string;
  toChain: string;
  id: number | string;
  fromTokenAmount: string;
  toTokenAmount: string;
  status: typeof SWAP_HISTORY_STATUSES[keyof typeof SWAP_HISTORY_STATUSES] | string;
  createTime: string;
  depositHashExplore: string;
  orderId: string;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  provider: string;
}


export interface ISwapService {
   name: string;
   checkDirection(fromToken: SwapToken, toToken: SwapToken): boolean;
   getQuote(params: GetQuoteParams, signal: AbortSignal): Promise<QuoteResponse>;
   createTransaction(params: GetTransactionParams): Promise<{ tx: Request, orderId: string }>;
   getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]>;
   createPrepareTransaction(params: GetTransactionParams): Promise<Request>;
}

export type SwapQuoteServiceRow = {
  service: string;
  amount: string;
  minAmount: string;
  maxAmount: string;
  isSelected: boolean;
  /** false when toTokenAmount is 0 — user must not select this row */
  isSelectable: boolean;
};

export type GetQuoteOutcome = {
  quote: QuoteResponse;
  allQuotes: QuoteResponse[];
  servicesResult: SwapQuoteServiceRow[];
};

export interface ICoreSwapService {
    getQuote(params: GetQuoteParams, signal: AbortSignal): Promise<GetQuoteOutcome>;
    getTokens(): Promise<SwapToken[]>;
    createTransaction(
      params: GetTransactionParams,
      dexName: string,
    ): Promise<{ tx: Request; orderId: string }>;
    getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]>;
    createPrepareTransaction(
      params: GetTransactionParams,
      dexName: string,
    ): Promise<Request>;
}

export type CheckIsAmountIsApprovedParams = {
    provider: SwapProvider;
    keyCard: string;
    token: SwapToken;
    spenderAddress: string;
    amount: string;
}

export type Chain = typeof SWAP_CHAINS[keyof typeof SWAP_CHAINS] | string;


export interface FusionQuote {
  quoteId: string | null;
  srcTokenAmount: string;
  dstTokenAmount: string;
  presets: {
    fast: Preset;
    medium: Preset;
    slow: Preset;
  };
  timeLocks: TimeLocks;
  srcEscrowFactory: string;
  dstEscrowFactory: string;
  srcSafetyDeposit: string;
  dstSafetyDeposit: string;
  whitelist: string[];
  recommendedPreset: 'fast' | 'medium' | 'slow';
  prices: {
    usd: {
      srcToken: string;
      dstToken: string;
    };
  };
  volume: {
    usd: {
      srcToken: string;
      dstToken: string;
    };
  };
  priceImpactPercent: number;
  autoK: number;
  k: number;
  mxK: number;
  nativeOrderFactoryAddress: string;
  nativeOrderImplAddress: string;
}

export interface Preset {
  auctionDuration: number;
  startAuctionIn: number;
  initialRateBump: number;
  auctionStartAmount: string;
  startAmount: string;
  auctionEndAmount: string;
  exclusiveResolver: string | null;
  costInDstToken: string;
  points: Point[];
  allowPartialFills: boolean;
  allowMultipleFills: boolean;
  gasCost: {
    gasBumpEstimate: number;
    gasPriceEstimate: string;
  };
  secretsCount: number;
}

export interface Point {
  delay: number;
  coefficient: number;
}

export interface TimeLocks {
  srcWithdrawal: number;
  srcPublicWithdrawal: number;
  srcCancellation: number;
  srcPublicCancellation: number;
  dstWithdrawal: number;
  dstPublicWithdrawal: number;
  dstCancellation: number;
}




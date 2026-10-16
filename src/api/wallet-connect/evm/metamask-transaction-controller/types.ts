import type { AccessList } from "@ethereumjs/tx";

export type Hex = `0x${string}`;
export type Json = boolean | number | string | null | { [key: string]: Json } | Json[];
export type Operation = any;
export type AccountsController = any;
export type EthQuery = any;
export type GasFeeState = any;
export type NetworkClientId = string;
export type Provider = any;

type MakeJsonCompatible<T> = T extends Json
  ? T
  : {
      [K in keyof T]: T[K] extends Json ? T[K] : never;
    };

type JsonCompatibleOperation = MakeJsonCompatible<Operation>;

export type TransactionMeta = TransactionMetaBase &
  (
    | {
        status: Exclude<TransactionStatus, TransactionStatus.failed>;
      }
    | {
        status: TransactionStatus.failed;
        error: TransactionError;
      }
  );

type TransactionMetaBase = {
  approvalTxId?: string;

  actionId?: string;

  baseFeePerGas?: Hex;

  blockNumber?: string;

  blockTimestamp?: string;

  chainId: Hex;

  contractMethodName?: string;

  currentTokenBalance?: string;

  custodyId?: string;

  custodyStatus?: string;

  customNonceValue?: string;

  customTokenAmount?: string;

  dappProposedTokenAmount?: string;

  dappSuggestedGasFees?: DappSuggestedGasFees;

  defaultGasEstimates?: DefaultGasEstimates;

  deviceConfirmedOn?: WalletDevice;

  destinationChainId?: Hex;

  destinationTokenAddress?: string;

  destinationTokenAmount?: string;

  destinationTokenDecimals?: number;

  destinationTokenSymbol?: string;

  estimatedBaseFee?: string;

  estimateSuggested?: string;

  estimateUsed?: string;

  finalApprovalAmount?: string;

  firstRetryBlockNumber?: string;

  isFirstTimeInteraction?: boolean;

  gasFeeEstimates?: GasFeeEstimates;

  gasFeeEstimatesLoaded?: boolean;

  gasLimitNoBuffer?: string;

  hash?: string;

  history?: TransactionHistory;

  id: string;

  isTransfer?: boolean;

  isUserOperation?: boolean;

  layer1GasFee?: Hex;

  networkClientId: NetworkClientId;

  readonly networkID?: string;

  origin?: string;

  originalApprovalAmount?: string;

  originalGasEstimate?: string;

  originalType?: TransactionType;

  postTxBalance?: string;

  preTxBalance?: string;

  previousGas?: {
    gasLimit?: string;

    maxFeePerGas?: string;

    maxPriorityFeePerGas?: string;
  };

  r?: string;

  rawTx?: string;

  replacedBy?: string;

  replacedById?: string;

  retryCount?: number;

  s?: string;

  securityAlertResponse?: SecurityAlertResponse;

  securityProviderResponse?: Record<string, any>;

  sendFlowHistory?: SendFlowHistoryEntry[];

  simulationData?: SimulationData;

  simulationFails?: {
    reason?: string;
    errorKey?: string;
    debug: {
      blockNumber?: string;
      blockGasLimit?: string;
    };
  };

  submittedTime?: number;

  sourceTokenAddress?: string;

  sourceTokenAmount?: string;

  sourceTokenDecimals?: number;

  sourceTokenSymbol?: string;

  swapAndSendRecipient?: string;

  swapMetaData?: Record<string, any>;

  swapTokenValue?: string;

  time: number;

  toSmartContract?: boolean;

  transferInformation?: {
    contractAddress: string;
    decimals: number;
    symbol: string;
  };

  txParams: TransactionParams;

  txReceipt?: TransactionReceipt;

  type?: TransactionType;

  userEditedGasLimit?: boolean;

  userFeeLevel?: string;

  v?: string;

  verifiedOnBlockchain?: boolean;

  warning?: {
    error: string;
    message: string;
  };
};

export type SendFlowHistoryEntry = {
  entry: string;

  timestamp: number;
};

export enum TransactionStatus {
  unapproved = "unapproved",

  approved = "approved",

  signed = "signed",

  submitted = "submitted",

  confirmed = "confirmed",

  failed = "failed",

  dropped = "dropped",

  rejected = "rejected",

  cancelled = "cancelled",
}

export enum WalletDevice {
  MM_MOBILE = "metamask_mobile",
  MM_EXTENSION = "metamask_extension",
  OTHER = "other_device",
}

export enum TransactionType {
  bridge = "bridge",

  bridgeApproval = "bridgeApproval",

  cancel = "cancel",

  contractInteraction = "contractInteraction",

  deployContract = "contractDeployment",

  ethDecrypt = "eth_decrypt",

  ethGetEncryptionPublicKey = "eth_getEncryptionPublicKey",

  incoming = "incoming",

  personalSign = "personal_sign",

  retry = "retry",

  simpleSend = "simpleSend",

  signTypedData = "eth_signTypedData",

  smart = "smart",

  stakingClaim = "stakingClaim",

  stakingDeposit = "stakingDeposit",

  stakingUnstake = "stakingUnstake",

  swap = "swap",

  swapAndSend = "swapAndSend",

  swapApproval = "swapApproval",

  tokenMethodApprove = "approve",

  tokenMethodSafeTransferFrom = "safetransferfrom",

  tokenMethodTransfer = "transfer",

  tokenMethodTransferFrom = "transferfrom",

  tokenMethodSetApprovalForAll = "setapprovalforall",

  tokenMethodIncreaseAllowance = "increaseAllowance",
}

export type TransactionParams = {
  accessList?: AccessList;

  authorizationList?: AuthorizationList;

  chainId?: Hex;

  data?: string;

  estimateGasError?: string;

  estimatedBaseFee?: string;

  estimateSuggested?: string;

  estimateUsed?: string;

  from: string;

  gas?: string;

  gasLimit?: string;

  gasPrice?: string;

  gasUsed?: string;

  maxFeePerGas?: string;

  maxPriorityFeePerGas?: string;

  nonce?: string;

  to?: string;

  value?: string;

  type?: string;
};

export type TransactionReceipt = {
  blockHash?: string;

  blockNumber?: string;

  effectiveGasPrice?: string;

  gasUsed?: string;

  l1Fee?: string;

  logs?: Log[];

  status?: string;

  transactionIndex?: string;
};

export type Log = {
  address?: string;
  topics?: string;
};

export interface RemoteTransactionSourceRequest {
  address: Hex;

  cache: Record<string, unknown>;

  chainIds: Hex[];

  includeTokenTransfers: boolean;

  queryEntireHistory: boolean;

  updateCache(fn: (cache: Record<string, unknown>) => void): void;

  updateTransactions: boolean;
}

export interface RemoteTransactionSource {
  getSupportedChains: () => Hex[];

  fetchTransactions: (
    request: RemoteTransactionSourceRequest
  ) => Promise<TransactionMeta[]>;
}

export type DappSuggestedGasFees = {
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
};

export interface SavedGasFees {
  maxBaseFee: string;
  priorityFee: string;
}

type ExtendedHistoryOperation = JsonCompatibleOperation & {
  note?: string;
  timestamp?: number;
};

export type TransactionHistoryEntry = [
  ExtendedHistoryOperation,
  ...JsonCompatibleOperation[]
];

export type TransactionHistory = [
  TransactionMeta,
  ...TransactionHistoryEntry[]
];

export type InferTransactionTypeResult = {
  getCodeResponse?: string | null;

  type: TransactionType;
};

export type SecurityProviderRequest = (
  requestData: TransactionMeta,
  messageType: string
) => Promise<any>;

export enum TransactionEnvelopeType {
  legacy = "0x0",

  accessList = "0x1",

  feeMarket = "0x2",

  setCode = "0x4",
}

export enum UserFeeLevel {
  CUSTOM = "custom",
  DAPP_SUGGESTED = "dappSuggested",
  MEDIUM = "medium",
}

export type DefaultGasEstimates = {
  estimateType?: string;

  gas?: string;

  gasPrice?: string;

  maxFeePerGas?: string;

  maxPriorityFeePerGas?: string;
};

export type TransactionError = {
  name: string;

  message: string;

  stack?: string;

  code?: string;

  rpc?: any;
};

export type SecurityAlertResponse = {
  reason: string;
  features?: string[];
  result_type: string;
  providerRequestsCount?: Record<string, number>;
};

export enum GasFeeEstimateLevel {
  Low = "low",
  Medium = "medium",
  High = "high",
}

export enum GasFeeEstimateType {
  FeeMarket = "fee-market",
  Legacy = "legacy",
  GasPrice = "eth_gasPrice",
}

export type FeeMarketGasFeeEstimateForLevel = {
  maxFeePerGas: Hex;

  maxPriorityFeePerGas: Hex;
};

export type FeeMarketGasFeeEstimates = {
  type: GasFeeEstimateType.FeeMarket;
  [GasFeeEstimateLevel.Low]: FeeMarketGasFeeEstimateForLevel;
  [GasFeeEstimateLevel.Medium]: FeeMarketGasFeeEstimateForLevel;
  [GasFeeEstimateLevel.High]: FeeMarketGasFeeEstimateForLevel;
};

export type LegacyGasFeeEstimates = {
  type: GasFeeEstimateType.Legacy;
  [GasFeeEstimateLevel.Low]: Hex;
  [GasFeeEstimateLevel.Medium]: Hex;
  [GasFeeEstimateLevel.High]: Hex;
};

export type GasPriceGasFeeEstimates = {
  type: GasFeeEstimateType.GasPrice;
  gasPrice: Hex;
};

export type GasFeeEstimates =
  | FeeMarketGasFeeEstimates
  | LegacyGasFeeEstimates
  | GasPriceGasFeeEstimates;

export type GasFeeFlowRequest = {
  ethQuery: EthQuery;

  gasFeeControllerData: GasFeeState;

  transactionMeta: TransactionMeta;
};

export type GasFeeFlowResponse = {
  estimates: GasFeeEstimates;
};

export type GasFeeFlow = {
  matchesTransaction(transactionMeta: TransactionMeta): boolean;

  getGasFees: (request: GasFeeFlowRequest) => Promise<GasFeeFlowResponse>;
};

export type Layer1GasFeeFlowRequest = {
  provider: Provider;

  transactionMeta: TransactionMeta;
};

export type Layer1GasFeeFlowResponse = {
  layer1Fee: Hex;
};

export type Layer1GasFeeFlow = {
  matchesTransaction(transactionMeta: TransactionMeta): boolean;

  getLayer1Fee: (
    request: Layer1GasFeeFlowRequest
  ) => Promise<Layer1GasFeeFlowResponse>;
};

export type SimulationBalanceChange = {
  previousBalance: Hex;

  newBalance: Hex;

  difference: Hex;

  isDecrease: boolean;
};

export enum SimulationTokenStandard {
  erc20 = "erc20",
  erc721 = "erc721",
  erc1155 = "erc1155",
}

export type SimulationToken = {
  address: Hex;

  standard: SimulationTokenStandard;

  id?: Hex;
};

export type SimulationTokenBalanceChange = SimulationToken &
  SimulationBalanceChange;

export enum SimulationErrorCode {
  ChainNotSupported = "chain-not-supported",
  Disabled = "disabled",
  InvalidResponse = "invalid-response",
  Reverted = "reverted",
}

export type SimulationError = {
  code?: string | number;

  message?: string;
};

export type SimulationData = {
  error?: SimulationError;

  isUpdatedAfterSecurityCheck?: boolean;

  nativeBalanceChange?: SimulationBalanceChange;

  tokenBalanceChanges: SimulationTokenBalanceChange[];
};

export type GasPriceValue = {
  gasPrice: string;
};

export type FeeMarketEIP1559Values = {
  maxFeePerGas: string;

  maxPriorityFeePerGas: string;
};

export type SubmitHistoryEntry = {
  chainId?: Hex;

  hash: string;

  migration?: boolean;

  networkType?: string;

  networkUrl?: string | string[];

  origin?: string;

  rawTransaction: string;

  time: number;

  transaction: TransactionParams;
};

export type InternalAccount = ReturnType<
  AccountsController["getSelectedAccount"]
>;

export type Authorization = {
  address: Hex;

  chainId?: Hex;

  nonce?: Hex;

  r?: Hex;

  s?: Hex;

  yParity?: Hex;
};

export type AuthorizationList = Authorization[];

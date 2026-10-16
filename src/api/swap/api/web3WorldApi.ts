export type CrossPairInputData = {
  amount: string;
  deep: number;
  direction: string;
  fromCurrencyAddress: string;
  minTvl: string;
  slippage: string;
  toCurrencyAddress: string;
  whiteListCurrencies: string[];
};

export type GetSwapPayloadParams = {
  crossPairInput: CrossPairInputData;
  id: number;
  nativeBalance: string;
  recipient: string;
  tokenBalance: string;
  nativeInfo?: 'spendonlynative' | 'receivenative';
}

export type GetSwapPayloadResponse = {
  error: null | string;
  route: CrossPairsRouteApiResponse;
  walletOfDestination: string;
  payload: string;
  abi: string;
  abiFunction: string;
  gas: string;
  id: number;
};

export type CrossPairsRouteApiResponse = {
  steps: CrossPairRouteStep[];
  globalPriceImpact: string;
  globalFee: string;
};

export type CrossPairRouteStep = {
  spentCurrencyAddress: string;
  receiveCurrencyAddress: string;
  spentAmount: string;
  minimumReceiveAmount: string;
  expectedReceiveAmount: string;
  fee: string;
  priceImpact: string;
  actionType: 'Swap' | 'Withdraw';
  poolAddress: string;
  currencyAddresses: string[];
  poolType: 'default' | 'stable';
};

type GetHistoryParams ={
    limit: number;
    offset: number;
    ordering: string;
    whiteListUri: string;
    eventType: string[];
    userAddress: string;
}

export type Transaction = {
  messageHash: string;
  transactionHash: string;
  poolAddress: string;
  currencyAddresses: string[];
  lpAddress: string;
  userAddress: string;
  currencies: string[];
  lp: string;
  tv: string;
  volumes: string[];
  lpVolume: string;
  timestampBlock: number;
  eventType: string;
  feeCurrencies: string[];
  feeCurrencyAddresses: string[];
  feeUsdt: string;
  fees: string[];
  beneficiaryFeeUsdt: string;
  beneficiaryFees: string[];
  beneficiaryAddresses: string[];
  senderAddress: string;
};

export type TransactionsResponse = {
  transactions: Transaction[];
  count: number;
  offset: number;
  totalCount: number;
};

export const web3WorlApi = () =>  {
    const apiUrlPrefix = 'https://api.web3.world/v2';
    const defaultHeaders = { 'Content-Type': 'application/json' };

    const getSwapPayload = async (params: GetSwapPayloadParams, signal: AbortSignal): Promise<GetSwapPayloadResponse> => {
        const response = await fetch(apiUrlPrefix + '/pools/cross_swap_payload', {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(params),
            signal,
        });
        return response.json();
    }

    const getTransactionsHistory = async (params: GetHistoryParams): Promise<TransactionsResponse> => {
        const response = await fetch(apiUrlPrefix + '/transactions', {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(params),
        });
        return response.json();
    }

    return {
      getSwapPayload,
      getTransactionsHistory,
    }
}
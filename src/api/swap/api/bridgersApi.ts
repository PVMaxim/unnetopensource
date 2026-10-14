import { GetSwapDataResponse, XRPGetSwapDataResponse } from '../types';

type GetExchangeRateParams = {
  fromTokenAddress: string;
  toTokenAddress: string; 
  fromTokenAmount: string; 
  fromTokenChain: string; 
  toTokenChain:string; 
  userAddr: string; 
  sourceFlag: string; 
  equipmentNo: string; 
}

type FetchSwapDataParams = {
  equipmentNo: string; 
  sourceFlag: string; 
  fromTokenAddress: string;
  toTokenAddress: string; 
  fromAddress: string;
  fromTokenChain: string;
  toTokenChain: string;
  fromTokenAmount: string;
  amountOutMin: string;
  fromCoinCode: string;
  toCoinCode: string;
  slippage: string;
}

type FetchSwapDataResponse = {
  data: {
    txData: GetSwapDataResponse & XRPGetSwapDataResponse | string;
  },
  resCode: number;
  resMsg: string;
}

type UpdateDataAndStatusParams = {
  hash: string;
  fromTokenAddress:  string;
  toTokenAddress: string;
  fromAddress: string;
  toAddress: string;
  fromTokenChain: string;
  toTokenChain: string;
  fromTokenAmount:  string;
  amountOutMin: string;
  fromCoinCode: string;
  toCoinCode: string;
}

type Token = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string | null;
  chain: string;
  isCrossEnable: number;
  withdrawGas: number;
  chainId: string;
}

type GetHistoryByAddressParams = {
  fromAddress: string;
  equipmentNo: string;
  sourceFlag: string;
  pageNo: number;
  pageSize: number;
}
 type HistoryTransactionResponse = {
  fromChain: string;
  toChain: string;
  id: number | string;
  fromTokenAmount: string;
  toTokenAmount: string;
  status: string;
  createTime: string;
  depositHashExplore: string;
  orderId: string;
  fromCoinCode: string;
  toCoinCode: string;
}

type GetHistoryByAddressResponse = {
  data: {
    list: HistoryTransactionResponse[];
  }
}

const bridgersApi = () => {
  const apiUrlPrefix = "https://apibridgersxyz.worker.united.network/api";
  const defaultHeaders = { "Content-Type": "application/json" };

  const getQuote = async (params: GetExchangeRateParams, signal: AbortSignal) => {
    const response = await fetch(apiUrlPrefix + '/sswap/quote', {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(params),
      signal,
    });
    return response.json();
  }

  const getTokens = async (): Promise<Token[]> => {
    const response = await fetch(apiUrlPrefix + '/exchangeRecord/getToken', {
      method: 'POST',
      headers: defaultHeaders,
    });
    const data = await response.json();
    return data.data.tokens;
  }

  const getSwapData = async (params: FetchSwapDataParams): Promise<FetchSwapDataResponse> => {
    const response = await fetch(apiUrlPrefix + '/sswap/swap', {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(params),
    });
    return response.json();
  };

  const updateDataAndStatus = async (params: UpdateDataAndStatusParams) => {
    const response = await fetch(apiUrlPrefix + '/exchangeRecord/updateDataAndStatus', {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(params),
    });
    return response.json();
  };

  const getHistoryByAddress = async (params: GetHistoryByAddressParams): Promise<GetHistoryByAddressResponse> => {
    const response = await fetch(apiUrlPrefix + '/exchangeRecord/getTransData', {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(params),
    });
    return response.json();
  }

  return {
    getQuote,
    getTokens,
    getSwapData,
    updateDataAndStatus,
    getHistoryByAddress
  };
}

export default bridgersApi;
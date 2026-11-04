import { ENDPOINTS } from "@/config/endpoints";
import { TonApiTransaction, TonApiTransactionWithTrace } from "./tonApi.types";

const tonApi = () => {
  const apiUrlPrefix = ENDPOINTS.tonApi;
  const defaultHeaders = { "Content-Type": "application/json" };

  const getAccountTransactions = async (
    accountId: string,
    signal: AbortSignal,
  ): Promise<TonApiTransaction[]> => {
    const response = await fetch(
      apiUrlPrefix +
        `/blockchain/accounts/${accountId}/transactions?limit=100&sort_order=desc`,
      { headers: defaultHeaders, signal },
    );
    const data = await response.json();
    return data.transactions;
  };

  const getTransactionTrace = async (
    transactionHash: string,
  ): Promise<TonApiTransactionWithTrace> => {
    const response = await fetch(
      apiUrlPrefix + `/traces/${transactionHash}`,
      { headers: defaultHeaders },
    );
    return response.json();
  };

  return {
    getAccountTransactions,
    getTransactionTrace,
  };
};

export default tonApi;

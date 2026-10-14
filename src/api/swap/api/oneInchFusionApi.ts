import {
  GetQuoteParamsV1,
  GetQuoteParamsV2,
  OrderItemWithMetaV1,
  OrderItemWithMetaV2,
  OrderWithSignature,
  QuoteResponseV1,
} from "./oneInchFusionApi.types";
import { QuoterResponse } from "@1inch/fusion-sdk";

const oneInchFusionApi = () => {
  const apiUrlPrefix = "https://1inch.worker.united.network";
  const defaultHeaders = { "Content-Type": "application/json" };

  const getQuoteV2 = async (
    params: GetQuoteParamsV2,
    signal?: AbortSignal
  ): Promise<QuoterResponse> => {
    const url = new URL(apiUrlPrefix + `/fusion/quoter/v2.0/${params.chain}/quote/receive`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(url.toString(), { headers: defaultHeaders, signal });
    return response.json();
  };

  const getQuoteV1 = async (
    params: GetQuoteParamsV1,
    signal?: AbortSignal
  ): Promise<QuoteResponseV1> => {
    const url = new URL(apiUrlPrefix + `/fusion/quoter/v1.0/${params.chain}/quote`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(url.toString(), { headers: defaultHeaders, signal });
    return response.json();
  };

  const submitOrder = async (order: OrderWithSignature) => {
    const response = await fetch(
      apiUrlPrefix + `/fusion/relayer/v2.0/${order.chain}/order/submit`,
      {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ ...order }),
      }
    );
    return response.json();
  };

  const getOrdersByChainAndMakerV2 = async (
    chain: number,
    maker: string
  ): Promise<OrderItemWithMetaV2> => {
    const response = await fetch(
      apiUrlPrefix + `/fusion/orders/v2.0/${chain}/order/maker/${maker}`,
      { headers: defaultHeaders }
    );
    return response.json();
  };

  const getOrdersByChainAndMakerV1 = async (
    chain: number,
    maker: string
  ): Promise<OrderItemWithMetaV1> => {
    const response = await fetch(
      apiUrlPrefix + `/fusion/orders/v1.0/${chain}/order/maker/${maker}`,
      { headers: defaultHeaders }
    );
    return response.json();
  };

  return {
    getQuoteV1,
    getQuoteV2,
    submitOrder,
    getOrdersByChainAndMakerV1,
    getOrdersByChainAndMakerV2,
  };
};

export default oneInchFusionApi;

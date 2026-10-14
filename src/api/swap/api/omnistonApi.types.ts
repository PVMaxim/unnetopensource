import { WSMethods } from "./omnistonApi";

export interface PendingRequest<T = SwapQuoteResponse> {
  resolve: (value: T) => void;
  reject: (reason?: Error) => void;
  timeout: NodeJS.Timeout;
  method: WSMethods;
  subscriptionId: string;
}

export interface WSRequest {
  id: number;
  method: string;
  params: unknown;
  jsonrpc: "2.0";
}

export interface WSResponse<T> {
  id?: number;
  method?: string;
  result?: T;
  error?: { code: number; message: string };
  params?: Record<string, unknown>;
}

export interface WSQuoteResponse {
  event?: {
    quote_updated?: SwapQuoteResponse;
    no_quote?: boolean;
  };
}

interface AssetAddress {
  blockchain: number;
  address: string;
}

interface Amount {
  bid_units: string;
}

interface SettlementParams {
  max_price_slippage_bps: number;
  max_outgoing_messages: number;
  gasless_settlement: number;
  flexible_referrer_fee: boolean;
}

export interface QuoteParams {
  bid_asset_address: AssetAddress;
  ask_asset_address: AssetAddress;
  amount: Amount;
  referrer_fee_bps: number;
  settlement_methods: number[];
  settlement_params: SettlementParams;
}

export type WSRequestParams = QuoteParams | WSBuildTransactionRequest;

export interface SwapQuoteRequest {
  bid_asset_address: AssetAddress;
  ask_asset_address: AssetAddress;
  amount: {
    bid_units: string;
  };
  referrer_fee_bps: number;
  settlement_methods: number[];
  settlement_params: SettlementParams;
  refferer_address?: AssetAddress;
}

export interface SwapQuoteResponse {
  quote_id: string;
  resolver_id: string;
  resolver_name: string;

  bid_asset_address: AssetAddress;
  ask_asset_address: AssetAddress;

  bid_units: string;
  ask_units: string;

  referrer_address: string | null;

  referrer_fee_asset: AssetAddress;
  referrer_fee_units: string;

  protocol_fee_asset: AssetAddress;
  protocol_fee_units: string;

  quote_timestamp: number;
  trade_start_deadline: number;

  gas_budget: string;
  estimated_gas_consumption: string;

  params: SwapParams;
}

interface SwapParams {
  swap: Swap;
}

interface Swap {
  routes: Route[];
  min_ask_amount: string;
  recommended_min_ask_amount: string;
  recommended_slippage_bps: number;
}

interface Route {
  steps: Step[];
}

interface Step {
  bid_asset_address: AssetAddress;
  ask_asset_address: AssetAddress;
  chunks: Chunk[];
}

enum Protocol {
  StonFiV2 = "StonFiV2",
}

interface Chunk {
  protocol: Protocol;
  bid_amount: string;
  ask_amount: string;
  extra_version: number;
  extra: number[];
}

export type WSResponseRequest = SwapQuoteResponse | WSBuildTransactionResponse;

export type WSBuildTransactionRequest = {
  destination_address: AssetAddress;
  gas_excess_address: AssetAddress;
  quote: SwapQuoteResponse;
  source_address: AssetAddress;
  use_recommended_slippage: boolean;
};

export type TonMessage = {
  target_address: string;
  send_amount: string;
  payload: string;
  jetton_wallet_state_init?: string;
};

export type WSBuildTransactionResponse = {
  ton: {
    messages: TonMessage[];
  };
};

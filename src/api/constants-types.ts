import type { TokenPriceInfo } from "./common";

export const NATIVE_COIN_DECIMALS = 9;
export const NATIVE_COIN_SYMBOL = "VENOM";
export const NATIVE_COIN_NAME = "VENOM";

export const WALLET_DEPLOYMENT_TIMEOUT = 60;
export const TRANSACTION_LIFE_TIME = 3 * 60;
export const DEPLOYER_MIN_BALANCE = 0.01;

export const TIP3_TRANSFER_COST = "100000000";
export const TIP3_DEPLOY_WALLET_COST = "100000000";

export const FIDO_DEFAULT_TIMEOUT = 60;

export const TX_COLLECTOR_CHUNK_SIZE = 5;
export const TRANSACTION_WAIT_TIMEOUT = 60;
export const TRANSACTION_WAIT_DELAY = 5;

export const SWAP_MIN_VALUE_AMOUNT = "1000000000";
export const WRAPPED_VENOM_ADDRESS = "0:77d36848bb159fa485628bc38dc37eadb74befa514395e09910f601b841f749e";
export const ETH_USDT_ADDRESS = "0xdac17f958d2ee523a2206206994597c13d831ec7"
export const SWAP_CHAINS = {
  ETH: "ETH",
  BSC: "BSC",
  TRON: "TRON",
  TON: "TON",
  VENOM: 'VENOM',
  SOLANA: 'SOLANA',
  BTC: 'BTC',
  AVALANCHE: 'AVALANCHE',
  BASE: 'BASE',
  ARBITRUM: 'ARBITRUM',
  POLYGON: 'POLYGON',
  XRP: 'XRP',
} as const;

export const SWAP_HISTORY_STATUSES = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  HOLD: "HOLD",
} as const;

export const SWAP_SERVICES = {
  Bridgers: "Bridgers",
  Changelly: "Changelly",
  OmniBridgs: "OmniBridgs",
  Web3World: "Web3World",
  OneInch: "1Inch",
  OneInchFusionPlus: "1InchFusionPlus",
  OneInchFusionV1: "1InchFusionV1",
  OneInchFusionV2: "1InchFusionV2",
  Omniston: "Omniston",
} as const;

export const SWAP_NATIVE_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const RPC_NAMES = {
  VENOM: "Venom",
  ETH: "Ethereum",
  TRON: "Tron",
  BSC: "BNB Chain",
  TON: "Ton",
  BTC: "Bitcoin",
  SOLANA: "Solana",
  ARBITRUM: "Arbitrum",
  BASE: "Base",
  POLYGON: "Polygon",
  AVALANCHE: "Avalanche",
  XRP: "Xrp",
  COTI: "Coti",
  KATANA: "Katana",
  CANTON_TEST: "Canton test",
  CANTON_DEV: "Canton dev",
} as const;

export const PING_LENGTH_MIN = 4;
export const PING_LENGTH_MAX = 8;
export const ALLOWED_PING_LENGTH = [4, 6, 8];

export type RpcName = typeof RPC_NAMES[keyof typeof RPC_NAMES] | (string & {});
export type SwapChain = typeof SWAP_CHAINS[keyof typeof SWAP_CHAINS] | (string & {});

export type RpcNamesType = RpcName;
export type SwapChainsType = typeof SWAP_CHAINS;

export interface RpcListItem {
  name: RpcName;
  type: 'b' | 's' | 't' | 'v';
  swapChain?: SwapChain;
  serialnumber: number;
  displayName?: string;
}

export const rpcList: RpcListItem[] = [
  { name: RPC_NAMES.SOLANA, type: 's', swapChain: SWAP_CHAINS.SOLANA, serialnumber: 1 },
  { name: RPC_NAMES.BTC, type: 'b', swapChain: SWAP_CHAINS.BTC, serialnumber: 2 },
  { name: RPC_NAMES.ETH, type: 't', swapChain: SWAP_CHAINS.ETH, serialnumber: 3 },
  { name: RPC_NAMES.BSC, type: 't', swapChain: SWAP_CHAINS.BSC, serialnumber: 4 },
  { name: RPC_NAMES.TRON, type: 't', swapChain: SWAP_CHAINS.TRON, serialnumber: 5 },
  { name: RPC_NAMES.TON, type: 't', swapChain: SWAP_CHAINS.TON, serialnumber: 6 },
  { name: RPC_NAMES.ARBITRUM, type: 't', swapChain: SWAP_CHAINS.ARBITRUM, serialnumber: 7 },
  { name: RPC_NAMES.BASE, type: 't', swapChain: SWAP_CHAINS.BASE, serialnumber: 8 },
  { name: RPC_NAMES.POLYGON, type: 't', swapChain: SWAP_CHAINS.POLYGON, serialnumber: 9 },
  { name: RPC_NAMES.AVALANCHE, type: 't', swapChain: SWAP_CHAINS.AVALANCHE, serialnumber: 10 },
  { name: RPC_NAMES.XRP, type: 't', swapChain: SWAP_CHAINS.XRP, serialnumber: 11 },
  { name: RPC_NAMES.COTI, type: 't', swapChain: undefined, serialnumber: 12 },
  { name: RPC_NAMES.KATANA, type: 't', swapChain: undefined, serialnumber: 13 },
  { name: RPC_NAMES.CANTON_TEST, type: 't', swapChain: undefined, serialnumber: 14 },
  { name: RPC_NAMES.CANTON_DEV, type: 't', swapChain: undefined, serialnumber: 15 },
  { name: RPC_NAMES.VENOM, type: 'v', swapChain: SWAP_CHAINS.VENOM, serialnumber: 16, displayName: "Venom (Old)" }
];

export type rpcListType = RpcListItem;

export interface PublicKeyCardType {
  secp256k1?: string;
  ed25519?: string;
}

export interface TokenAdditionalData {
  tokenLimits?: string | null;
  isEnoughRootTokenBalance?: boolean;
  cotiIsSecureToken?: boolean | null;
  isOnBoarded?: boolean | null;
  [key: string]: unknown;
}

export interface TokenType {
  root: string | null;
  symbol: string | null;
  balance: string | number | null;
  price: { usdPrice: number | string; usd24hChange: number | string } | TokenPriceInfo | null;
  name: string | null;
  isMandatory?: boolean;
  iconUrl: string | null;
  additionalData: TokenAdditionalData;
}

export interface SelectedTokenList {
  [key: string]: TokenType | null;
}

export interface CustomTokenBase {
  [key: string]: TokenType[];
}

export function getSelectedToken(): SelectedTokenList {
  return Object.fromEntries(
    Object.values(RPC_NAMES).map(name => [name, null])
  ) as SelectedTokenList;
}

export function getCustomTokenBase(): CustomTokenBase {
  return Object.fromEntries(
    Object.values(RPC_NAMES).map(name => [name, []])
  ) as CustomTokenBase;
}

export type cardVersionType = {
  versionUrl: string;
  versionCard: string;
  date: string;
};

export const cardVersionHistory: cardVersionType[] = [
  { versionUrl: "v1", versionCard: "00000201", date: "2025-05-25" },
  { versionUrl: "v2", versionCard: "00000202", date: "2025-09-23" },
];
import { SWAP_CHAINS } from "../constants-types";
import { SwapChain } from "./types";

export const ONE_INCH_CHAIN_IDS: Record<string, number> = {
  [SWAP_CHAINS.ETH]: 1,
  [SWAP_CHAINS.ARBITRUM]: 42161,
  [SWAP_CHAINS.AVALANCHE]: 43114,
  [SWAP_CHAINS.BSC]: 56,
  [SWAP_CHAINS.POLYGON]: 137,
  [SWAP_CHAINS.BASE]: 8453,
  [SWAP_CHAINS.SOLANA]: 501,
};

export const EXPLORER_TX_URLS: Record<string, string> = {
  [SWAP_CHAINS.ETH]: "https://etherscan.io/tx/",
  [SWAP_CHAINS.BSC]: "https://bscscan.com/tx/",
  [SWAP_CHAINS.TRON]: "https://tronscan.org/#/transaction/",
  [SWAP_CHAINS.TON]: "https://tonscan.org/transaction/",
  [SWAP_CHAINS.VENOM]: "https://venomscan.com/transactions/",
  [SWAP_CHAINS.BTC]: "https://www.oklink.com/ru/bitcoin/tx/",
  [SWAP_CHAINS.SOLANA]: "https://solscan.io/tx/",
  [SWAP_CHAINS.AVALANCHE]: "https://avascan.info/blockchain/c/tx/",
  [SWAP_CHAINS.BASE]: "https://basescan.org/tx/",
  [SWAP_CHAINS.XRP]: "https://xrpscan.com/tx/",
  [SWAP_CHAINS.ARBITRUM]: "https://arbiscan.io/tx/",
  [SWAP_CHAINS.POLYGON]: "https://polygonscan.com/tx/",
};

export function getExplorerTxUrl(chain: string, txHash: string): string {
  return `${EXPLORER_TX_URLS[chain] ?? ""}${txHash}`;
}

export function getChainByEvmId(chainId: number): SwapChain | undefined {
  return Object.keys(ONE_INCH_CHAIN_IDS).find(
    (key) => ONE_INCH_CHAIN_IDS[key] === chainId
  ) as SwapChain | undefined;
}

import { initialArbitrumManager, initialAvalancheManager, initialBaseManager, initialBitcoinManager, initialBnbManager, initialEvmManager, initialPolygonManager, initialSolanaManager, initialTonManager, initialTronManager, initialVenomWalletManager, initialXrplManager } from "../../ApiHandler";
import { BlockchainManager } from "../../common";
import { SWAP_CHAINS } from "../../constants-types";
import { Chain } from "../types";

export const createProviderManager = (chain: Chain, isForced = false):BlockchainManager => {
 
  switch (chain) {
    case SWAP_CHAINS.ETH: {
      const manager = initialEvmManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialEvmManager did not return a valid BlockchainManager"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.TRON: {
      const manager = initialTronManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialTronManager did not return a valid BlockchainManager"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.BSC: {
      const manager = initialBnbManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialBnbManager did not return a valid BlockchainManager"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.TON: {
      const manager = initialTonManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialTonManager did not return a valid BlockchainManager"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.SOLANA: {
      const manager = initialSolanaManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialSolanaManager did not return a valid BlockchainManager"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.BTC: {
      const manager = initialBitcoinManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialBitcoinManager did not return a valid BlockchainManager"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.VENOM: {
      const manager = initialVenomWalletManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialVenomWalletManager did not return a valid BlockchainManager"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.AVALANCHE: {
      const manager = initialAvalancheManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialAvalancheManager did not return a valid BlockchainManager"
        );
      }
      return manager;
    }

    case SWAP_CHAINS.BASE: {
      const manager = initialBaseManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialEvmManager did not return a valid BlockchainManager for BASE"
        );
      }
      return manager;
    }
     case SWAP_CHAINS.ARBITRUM: {
      const manager = initialArbitrumManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialEvmManager did not return a valid BlockchainManager for Arbitrum"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.POLYGON: {
       const manager = initialPolygonManager(isForced);
      if (!manager || typeof manager === "string") {
        throw new Error(
          "initialEvmManager did not return a valid BlockchainManager for Polygon"
        );
      }
      return manager;
    }
    case SWAP_CHAINS.XRP: {
      const manager = initialXrplManager(isForced);
       if (!manager || typeof manager === "string") {
        throw new Error(
          "initialEvmManager did not return a valid BlockchainManager for XRP"
        );
      }
      return manager;
    }
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}; 
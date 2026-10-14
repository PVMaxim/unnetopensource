import { initialEvmManager, initialBnbManager, initialVenomWalletManager, initialTronManager, initialTonManager, initialSolanaManager, initialBitcoinManager, initialAvalancheManager, initialBaseManager, initialArbitrumManager, initialPolygonManager, initialXrplManager} from "../../ApiHandler"
import { SWAP_CHAINS } from "../../constants-types";

export const getOwnerAddress = async (rpcProvider, publicKeys) => {
  let providerManager;
  if (rpcProvider?.swapChain === SWAP_CHAINS.ETH) {
    providerManager = initialEvmManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.TRON) {
    providerManager = initialTronManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.BSC) {
    providerManager = initialBnbManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.TON) {
    providerManager = initialTonManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.SOLANA ){
    providerManager = initialSolanaManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.BTC) {
    providerManager = initialBitcoinManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.AVALANCHE) {
    providerManager = initialAvalancheManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.BASE) {
    providerManager = initialBaseManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.ARBITRUM) {
    providerManager = initialArbitrumManager();
  } else if (rpcProvider?.swapChain === SWAP_CHAINS.POLYGON) {
    providerManager = initialPolygonManager();
  } else if(rpcProvider?.swapChain === SWAP_CHAINS.XRP) {
    providerManager = initialXrplManager();
  } else {
    providerManager = initialVenomWalletManager();
  }
  return providerManager.getWalletAddress(publicKeys);
};
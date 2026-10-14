import {
  initialArbitrumManager,
  initialAvalancheManager,
  initialBaseManager,
  initialBnbManager,
  initialCotiManager,
  initialEvmManager,
  initialKatanaManager,
  initialPolygonManager,
  initialSolanaManager,
  initialTronManager,
  initialTonManager,
} from "@/api/ApiHandler";
import { BlockchainManager } from "@/api/common";

type GetBlockchainManagerFunc = () => BlockchainManager | string;

export type ChainData = {
  name: string;
  namespace: string;
  id: string;
  getBlockchainManager: GetBlockchainManagerFunc;
};

export const EIP155_CHAINS: Record<string, ChainData> = {
  "eip155:1": {
    name: "Ethereum",
    namespace: "eip155",
    id: "1",
    getBlockchainManager: initialEvmManager as GetBlockchainManagerFunc,
  },
  "eip155:56": {
    name: "BNB Chain",
    namespace: "eip155",
    id: "56",
    getBlockchainManager: initialBnbManager as GetBlockchainManagerFunc,
  },
  "eip155:43114": {
    name: "Avalanche",
    namespace: "eip155",
    id: "43114",
    getBlockchainManager: initialAvalancheManager as GetBlockchainManagerFunc,
  },
  "eip155:8453": {
    name: "Base",
    namespace: "eip155",
    id: "8453",
    getBlockchainManager: initialBaseManager as GetBlockchainManagerFunc,
  },
  "eip155:42161": {
    name: "Arbitrum",
    namespace: "eip155",
    id: "42161",
    getBlockchainManager: initialArbitrumManager as GetBlockchainManagerFunc,
  },
  "eip155:137": {
    name: "Polygon",
    namespace: "eip155",
    id: "137",
    getBlockchainManager: initialPolygonManager as GetBlockchainManagerFunc,
  },
  "eip155:747474": {
    name: "Katana",
    namespace: "eip155",
    id: "747474",
    getBlockchainManager: initialKatanaManager as GetBlockchainManagerFunc,
  },
  "eip155:2632500": {
    name: "COTI",
    namespace: "eip155",
    id: "2632500",
    getBlockchainManager: initialCotiManager as GetBlockchainManagerFunc,
  },
};
export const EIP155_CHAIN_NAMES = Object.keys(EIP155_CHAINS);

export const SOLANA_CHAINS: Record<string, ChainData> = {
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
    name: "Solana",
    namespace: "solana",
    id: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    getBlockchainManager: initialSolanaManager as GetBlockchainManagerFunc,
  }
};

export const SOLANA_CHAIN_NAMES = Object.keys(SOLANA_CHAINS);

export const TRON_CHAINS: Record<string, ChainData> = {
   'tron:0x2b6653dc': {
     name: 'Tron',
     namespace: 'tron',
     id: '0x2b6653dc',
     getBlockchainManager: initialTronManager as GetBlockchainManagerFunc,
   },
 };
 export const TRON_CHAIN_NAMES = Object.keys(TRON_CHAINS);

export const TON_CHAINS: Record<string, ChainData> = {
  "ton:-239": {
    name: "TON",
    namespace: "ton",
    id: "-239",
    getBlockchainManager: initialTonManager as GetBlockchainManagerFunc,
  },
};
export const TON_CHAIN_NAMES = Object.keys(TON_CHAINS);

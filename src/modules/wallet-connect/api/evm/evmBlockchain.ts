import { EvmManager } from '@/api/evm/manager';
import { EvmChainId } from './evmChainId';

export interface EvmBlockchain {
  chainId: EvmChainId;
  manager: EvmManager;
}

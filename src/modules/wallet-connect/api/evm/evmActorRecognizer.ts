import { EvmBlockchain } from './evmBlockchain';
import {
  evmTokenRecognizer,
  EvmTokenRecognizedRef,
} from './evmTokenRecognizer';

export interface EvmActorRecognized {
  address: string;
  asToken: EvmTokenRecognizedRef;
}

export type EvmActorRecognizedRef = EvmActorRecognized | undefined;

class EvmActorRecognizer {
  async recognize(
    address: string,
    blockchain?: EvmBlockchain,
    options?: {
      canBeToken?: boolean;
    }
  ): Promise<EvmActorRecognized> {
    const result: EvmActorRecognized = {
      address,
      asToken:
        blockchain && options?.canBeToken
          ? await evmTokenRecognizer.recognize(address, blockchain)
          : undefined,
    };

    return result;
  }

  
}

export const evmActorRecognizer = new EvmActorRecognizer();

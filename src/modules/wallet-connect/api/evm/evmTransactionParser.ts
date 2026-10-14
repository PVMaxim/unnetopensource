import { isStrictHexString } from '@metamask/utils';
import { EvmBlockchain } from './evmBlockchain';
import {
  evmActorRecognizer,
  EvmActorRecognizedRef,
} from './evmActorRecognizer';
import { evmMethodParser, EvmMethodParsedRef } from './evmMethodParser';

export interface EvmTransactionParsed {
  to: EvmActorRecognizedRef;
  method: EvmMethodParsedRef;
}

export type EvmTransactionParsedRef = EvmTransactionParsed;
export type EvmTransactionParsedDerefed = EvmTransactionParsed;

class EvmTransactionParser {
  async parse(transactionRequest: any, blockchain: EvmBlockchain): Promise<EvmTransactionParsed> {
    const { data, to } = transactionRequest || {};

    const result: EvmTransactionParsed = {
      to:
        to || isStrictHexString(to)
          ? await evmActorRecognizer.recognize(to, blockchain, {
              canBeToken: true,
            })
          : undefined,
      method:
        data && isStrictHexString(data)
          ? await  evmMethodParser.parse(data)
          : evmMethodParser.notParsed(),
    };

    return result;
  }
}

export const evmTransactionParser = new EvmTransactionParser();

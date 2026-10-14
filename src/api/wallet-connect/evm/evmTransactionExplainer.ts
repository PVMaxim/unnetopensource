import {
  EvmActorRecognizedRef,
  evmActorRecognizer,
} from './evmActorRecognizer';
import { EvmMethodParsed } from './evmMethodParser';
import { EvmTokenRecognized } from './evmTokenRecognizer';
import {
  EvmTransactionParsedDerefed,
} from './evmTransactionParser';
import { EvmAmount } from './evmAmount';

export const EVM_TOKEN_APPROVE_NONE = 'EVM_TOKEN_APPROVE_NONE';
export const EVM_TOKEN_APPROVE = 'EVM_TOKEN_APPROVE';

export enum EvmTransactionExplanationType {
  EvmTokenApproveNone = EVM_TOKEN_APPROVE_NONE,
  EvmTokenApprove = EVM_TOKEN_APPROVE,
}

export interface EvmTokenApproveNoneExplanation {
  type: EvmTransactionExplanationType.EvmTokenApproveNone;
  token: EvmTokenRecognized;
  spender: EvmActorRecognizedRef;
}

export interface EvmTokenApproveExplanation {
  type: EvmTransactionExplanationType.EvmTokenApprove;
  token: EvmTokenRecognized;
  spender: EvmActorRecognizedRef;
  limit: EvmAmount;
}

export type EvmTransactionExplanation =
  | EvmTokenApproveNoneExplanation
  | EvmTokenApproveExplanation
  | undefined;

class EvmTransactionExplainer {
  async explainTokenApprove(token: EvmTokenRecognized, method: EvmMethodParsed) {
    if (
      method.name != 'approve' ||
      method.params?.length != 2 ||
      method.params[0]?.type != 'address' ||
      method.params[1]?.type != 'uint256'
    ) {
      return undefined;
    }

    const spender = await evmActorRecognizer.recognize(method.params[0].value);

    const limit = new EvmAmount(
      method.params[1].value.toString(),
      token.decimals
    );
    if (limit.isZero()) {
      return <EvmTokenApproveNoneExplanation>{
        type: EvmTransactionExplanationType.EvmTokenApproveNone,
        token,
        spender,
      };
    }

    return <EvmTokenApproveExplanation>{
      type: EvmTransactionExplanationType.EvmTokenApprove,
      token,
      spender,
      limit,
    };
  }

  async explainToken(transaction: EvmTransactionParsedDerefed | undefined): Promise<EvmTransactionExplanation> {
    if (!transaction) {
      return undefined;
    }

    const to = transaction?.to;
    if (!to) {
      return undefined;
    }

    const method = transaction?.method;
    if (!method) {
      return undefined;
    }

    const token = to.asToken;
    if (!token) {
      return undefined;
    }

    {
      const result = await this.explainTokenApprove(token, method);
      if (result) {
        return result;
      }
    }

    return undefined;
  }

  explain(transaction: EvmTransactionParsedDerefed | undefined): Promise<EvmTransactionExplanation> {
    return this.explainToken(transaction);
  }
}

export const evmTransactionExplaner = new EvmTransactionExplainer();

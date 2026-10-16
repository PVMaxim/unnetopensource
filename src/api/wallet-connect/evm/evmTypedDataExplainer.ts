import { ref, watch } from 'vue';
import { EvmBlockchain } from './evmBlockchain';
import {
  EvmTypedDataParsedDerefed,
  EvmTypedDataParsedRef,
  EvmTypedDataSignMethodVersion,
} from './evmTypedDataParser';
import { BigNumberish, isAddress } from 'ethers';
import { EvmAmount, EvmAmountRef } from './evmAmount';
import {
  EvmActorRecognizedRef,
  evmActorRecognizer,
} from './evmActorRecognizer';

export const EVM_PERMIT2_PERMIT_TOKENS = 'EVM_PERMIT2_PERMIT_TOKENS';

export enum EvmTypedDataExplanationType {
  Permit2PermitTokens = EVM_PERMIT2_PERMIT_TOKENS,
}

export interface EvmPermit2PermitTokensExplanation {
  type: EvmTypedDataExplanationType.Permit2PermitTokens;
  spender: EvmActorRecognizedRef;
  details: {
    amount: EvmAmountRef;
    tokenActor: EvmActorRecognizedRef;
  }[];
}

export type EvmTypedDataExplanation = EvmPermit2PermitTokensExplanation;

class EvmTypedDataExplainer {
  async explainPermit2PermitTokens(
    typedDataParsed: EvmTypedDataParsedDerefed,
    blockchain: EvmBlockchain
  ) {
    const {
      primaryType,
      message = {},
      signMethodVersion,
    } = typedDataParsed ?? {};
    if (
      signMethodVersion != EvmTypedDataSignMethodVersion.V3 &&
      signMethodVersion != EvmTypedDataSignMethodVersion.V4
    ) {
      return undefined;
    }

    if (primaryType != 'PermitSingle' && primaryType != 'PermitBatch') {
      return undefined;
    }
    const { spender, details } = message;

    if (!isAddress(spender)) {
      return undefined;
    }

    interface ValidatedItem {
      token: string;
      amount: BigNumberish;
    }

    const validatedItems: ValidatedItem[] = [];
    const addValidatedItem = (token: any, amount: any) => {
      if (!isAddress(token)) {
        return undefined;
      }

      if (amount == undefined) {
        return undefined;
      }
      validatedItems.push({ token, amount });
    };

    if (primaryType == 'PermitSingle') {
      addValidatedItem(details?.token, details?.amount);
    } else {
      for (const item of details || []) {
        addValidatedItem(item?.token, item?.amount);
      }
    }

    if (!validatedItems.length) {
      return undefined;
    }

    const spenderActor = await evmActorRecognizer.recognize(spender, blockchain);
    const detailItems = await Promise.all(
      validatedItems.map(async ({ token, amount }) => {
        const tokenActor = await evmActorRecognizer.recognize(token, blockchain, {
          canBeToken: true,
        });
        return {
          tokenActor,
          amount: EvmAmount.forTokenActorRef(amount, tokenActor),
        };
      })
    );

    return <EvmPermit2PermitTokensExplanation>{
      type: EvmTypedDataExplanationType.Permit2PermitTokens,
      spender: spenderActor,
      details: detailItems,
    };
  }

  explain(
    typedDataParsedRef: EvmTypedDataParsedRef,
    blockchain: EvmBlockchain
  ) {
    const result = ref<EvmTypedDataExplanation>();

    watch(
      typedDataParsedRef,
      async (typedDataParsed) => {
        if (!typedDataParsed) {
          result.value = undefined;
          return;
        }
        result.value = await this.explainPermit2PermitTokens(
          typedDataParsed,
          blockchain
        );
      },
      { immediate: true, deep: true }
    );

    return result;
  }
}

export const evmTypedDataExplainer = new EvmTypedDataExplainer();

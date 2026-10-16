import { Ref, ref } from 'vue';
import { Hex } from '@metamask/utils';
import { SimulationData } from './metamask-transaction-controller/types';
import { getSimulationData } from './metamask-transaction-controller/utils/simulation';
import { EvmBlockchain } from './evmBlockchain';
import { EvmAmount, EvmAmountRef } from './evmAmount';
import {
  EvmActorRecognizedRef,
  evmActorRecognizer,
} from './evmActorRecognizer';
import { evmTokenRecognizer } from './evmTokenRecognizer';

export interface EvmTokenBalanceChange {
  isNative: boolean;
  isPositive: boolean;
  amount: EvmAmountRef;
  tokenActor: EvmActorRecognizedRef;
}

export interface EvmTransactionPrediction {
  tokenBalanceChanges: Ref<EvmTokenBalanceChange[]>;
}

export type EvmTransactionPredictionRef = ReturnType<
  typeof evmTransactionPredictor.predict
>;

class EvmTransactionPredictor {
  predict(transactionRequest: any, blockchain: EvmBlockchain) {
    const tokenBalanceChanges = ref<EvmTokenBalanceChange[]>([]);

    if (transactionRequest) {
      (async () => {
        try {
          const simulationData = await getSimulationData({
            chainId: blockchain.chainId.asHexString() as Hex,
            data: transactionRequest.data,
            from: transactionRequest.from,
            to: transactionRequest.to,
            value: transactionRequest.value,
          });
          tokenBalanceChanges.value =
            await this.tokenBalanceChangesFromSimulationData(
              simulationData,
              blockchain
            );
        } catch (error) {
          console.error('getSimulationData error', error);
        }
      })();
    }

    return { tokenBalanceChanges };
  }

  private async tokenBalanceChangesFromSimulationData(
    simulationData: SimulationData,
    blockchain: EvmBlockchain
  ) {
    const result: EvmTokenBalanceChange[] = [];
    if (simulationData?.nativeBalanceChange) {
      const rawChange = simulationData.nativeBalanceChange;
      result.push(
        await this.buildTokenBalanceChange(
          undefined,
          rawChange.isDecrease,
          rawChange.difference,
          blockchain
        )
      );
    }

    if (simulationData?.tokenBalanceChanges?.length) {
      for (const rawChange of simulationData.tokenBalanceChanges) {
        result.push(
          await this.buildTokenBalanceChange(
            rawChange.address,
            rawChange.isDecrease,
            rawChange.difference,
            blockchain
          )
        );
      }
    }

    return result;
  }

  async buildTokenBalanceChange(
    address: string | undefined,
    isDecrease: boolean,
    difference: Hex,
    blockchain: EvmBlockchain
  ) {
    const tokenActorRef = await evmActorRecognizer.recognize(
      address ?? evmTokenRecognizer.nativeCoinPseudoAddress(),
      blockchain,
      { canBeToken: true }
    );

    const amountRef = EvmAmount.forTokenActorRef(difference, tokenActorRef);

    return <EvmTokenBalanceChange>{
      isNative: !address,
      isPositive: !isDecrease,
      amount: amountRef,
      tokenActor: tokenActorRef,
    };
  }
}

export const evmTransactionPredictor = new EvmTransactionPredictor();

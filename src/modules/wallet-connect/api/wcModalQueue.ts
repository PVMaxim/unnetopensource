import { ref, watch } from 'vue';
import { SessionTypes } from '@walletconnect/types';
import { uuidv4 } from '@walletconnect/utils';
import { SessionProposalEventArgs, SessionRequestEventArgs } from './wcTypes';

export const MODAL_SESSION_PROPOSAL = 'SessionProposal';
export const MODAL_EVM_SEND_TRANSACTION = 'EvmSendTransaction';
export const MODAL_EVM_SIGN_TYPED_DATA = 'EvmSignTypedData';
export const MODAL_TRON_SIGN_TYPED_DATA = 'TronSignTypedData';
export const MODAL_SOLANA_SIGN_TRANSACTION = 'SolanaSignTransaction';
export const MODAL_EVM_PERSONAL_SIGN = 'EvmPersonalSign';
export const MODAL_TON_SEND_TRANSACTION = 'TonSendTransaction';
export const MODAL_TON_SIGN_DATA = 'TonSignData';

export enum WalletConnectModalType {
  SessionProposal = MODAL_SESSION_PROPOSAL,
  EvmSendTransaction = MODAL_EVM_SEND_TRANSACTION,
  EvmSignTypedData = MODAL_EVM_SIGN_TYPED_DATA,
  TronSignTypedData = MODAL_TRON_SIGN_TYPED_DATA,
  SolanaSignTransaction = MODAL_SOLANA_SIGN_TRANSACTION,
  EvmPersonalSign = MODAL_EVM_PERSONAL_SIGN,
  TonSendTransaction = MODAL_TON_SEND_TRANSACTION,
  TonSignData = MODAL_TON_SIGN_DATA,
}

export type WalletConnectModalInfo =
  | {
      type: WalletConnectModalType.SessionProposal;
      proposal: SessionProposalEventArgs;
    }
  | {
      type: WalletConnectModalType.EvmSendTransaction;
      requestEvent: SessionRequestEventArgs;
      requestSession?: SessionTypes.Struct;
    }
  | {
      type: WalletConnectModalType.EvmSignTypedData;
      requestEvent: SessionRequestEventArgs;
      requestSession?: SessionTypes.Struct;
    }
  |
    {
      type: WalletConnectModalType.TronSignTypedData;
      requestEvent: SessionRequestEventArgs;
      requestSession?: SessionTypes.Struct;
    }
  | {
      type: WalletConnectModalType.SolanaSignTransaction;
      requestEvent: SessionRequestEventArgs;
      requestSession?: SessionTypes.Struct;
  }  | {
      type: WalletConnectModalType.EvmPersonalSign;
      requestEvent: SessionRequestEventArgs;
      requestSession?: SessionTypes.Struct;
    } | {
      type: WalletConnectModalType.TonSendTransaction;
      requestEvent: SessionRequestEventArgs;
      requestSession?: SessionTypes.Struct;
    } | {
      type: WalletConnectModalType.TonSignData;
      requestEvent: SessionRequestEventArgs;
      requestSession?: SessionTypes.Struct;
    }

export type WalletConnectQueuedModalInfo = WalletConnectModalInfo & {
  uniqueId: string;
};

export class WalletConnectModalQueue {
  readonly front = ref<WalletConnectQueuedModalInfo>();

  private readonly queue = ref<WalletConnectQueuedModalInfo[]>([]);

  constructor() {
    watch(
      this.queue,
      (queue) => {
        if (queue.length == 0) {
          this.front.value = undefined;
          return;
        }

        if (queue[0].uniqueId == this.front.value?.uniqueId) {
          return;
        }

        this.front.value = queue[0];
      },
      { immediate: true, deep: true }
    );
  }

  push(info: WalletConnectModalInfo): string {
    const uniqueId = uuidv4();
    this.queue.value.push({ ...info, uniqueId });

    return uniqueId;
  }

  pop(): boolean {
    return !!this.queue.value.shift();
  }
}

export const wcModalQueue = new WalletConnectModalQueue();

<template>
  <Teleport to="body">
    <div v-if="signedIn && front" class="wallet-connect-request-modal-socket" :key="front.uniqueId">
      <SessionProposalModal v-if="front.type == MODAL_SESSION_PROPOSAL" :proposal="front.proposal" />
      <EvmSendTransactionModal v-else-if="front.type == MODAL_EVM_SEND_TRANSACTION" :requestEvent="front.requestEvent"
        :requestSession="front.requestSession" :nfcHandlerWindow="nfcHandlerWindow"/>
      <EvmSignTypedDataModal v-else-if="front.type == MODAL_EVM_SIGN_TYPED_DATA" :requestEvent="front.requestEvent"
        :requestSession="front.requestSession" :nfcHandlerWindow="nfcHandlerWindow"/>
      <TronSignModal v-else-if="front.type == MODAL_TRON_SIGN_TYPED_DATA" :requestEvent="front.requestEvent"
        :requestSession="front.requestSession" :nfcHandlerWindow="nfcHandlerWindow"/>
      <SolanaSignTransactionModal v-else-if="front.type == MODAL_SOLANA_SIGN_TRANSACTION" :requestEvent="front.requestEvent"
        :requestSession="front.requestSession" :nfcHandlerWindow="nfcHandlerWindow"/>
      <EvmPersonalSignModal v-else-if="front.type == MODAL_EVM_PERSONAL_SIGN" :requestEvent="front.requestEvent"
        :requestSession="front.requestSession" :nfcHandlerWindow="nfcHandlerWindow"/>
      <TonSendTransactionModal v-else-if="front.type == MODAL_TON_SEND_TRANSACTION" :requestEvent="front.requestEvent"
        :requestSession="front.requestSession" :nfcHandlerWindow="nfcHandlerWindow"/>
    </div>
  </Teleport>
  <NFCHandlerWindow
    ref="nfcHandlerWindow"
    title="Touch your card"
    subTitle="Hold your card flat against the back of your device until this window is open."
    v-model:isActive="nfcIsActive"
  />
 
</template>

<script>
import { defineComponent, ref } from 'vue';
import SessionProposalModal from './SessionProposalModal.vue';
import EvmSendTransactionModal from './EvmSendTransactionModal.vue';
import EvmSignTypedDataModal from './EvmSignTypedDataModal.vue';
import TronSignModal from './TronSignModal.vue';
import TonSendTransactionModal from './TonSendTransactionModal.vue';
import { wcModalQueue, MODAL_EVM_SEND_TRANSACTION, MODAL_EVM_SIGN_TYPED_DATA, MODAL_SESSION_PROPOSAL, MODAL_TRON_SIGN_TYPED_DATA, MODAL_SOLANA_SIGN_TRANSACTION, MODAL_EVM_PERSONAL_SIGN, MODAL_TON_SEND_TRANSACTION } from '@/api/wallet-connect/wcModalQueue';
import { isWalletConnectDebugMode } from '@/api/wallet-connect/wcDebug';
import { checkCardKeys } from '@/api/wallet-connect/wcCardKeys';
import { store } from '@/store';
import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
import SolanaSignTransactionModal from './SolanaSignTransactionModal.vue';
import EvmPersonalSignModal from './EvmPersonalSignModal.vue';

export const walletConnectResultModalData = ref();

export default defineComponent({
  name: 'WalletConnectRequestModalSocket',
  components: {
    SessionProposalModal,
    EvmSendTransactionModal,
    EvmSignTypedDataModal,
    NFCHandlerWindow,
    TronSignModal,
    SolanaSignTransactionModal,
    EvmPersonalSignModal,
    TonSendTransactionModal,
  },
  setup: () => {
    const signedIn = ref(false);
    const nfcHandlerWindow = ref(NFCHandlerWindow);
    const nfcIsActive = ref(false);

    if (isWalletConnectDebugMode()) {
      signedIn.value = true;
    } else {
      store.watch(
        (state) => state.user.publicKeyCard,
        (cardKeys) => {
          signedIn.value = checkCardKeys(cardKeys);
        },
        {
          immediate: true
        }
      );
    }

    return {
      signedIn,
      front: wcModalQueue.front,
      MODAL_SESSION_PROPOSAL,
      MODAL_EVM_SEND_TRANSACTION,
      MODAL_EVM_SIGN_TYPED_DATA,
      MODAL_TRON_SIGN_TYPED_DATA,
      MODAL_SOLANA_SIGN_TRANSACTION,
      MODAL_EVM_PERSONAL_SIGN,
      MODAL_TON_SEND_TRANSACTION,
      nfcHandlerWindow,
      nfcIsActive,
    };
  },
});
</script>

<style lang="scss" scoped>
.wallet-connect-request-modal-socket {
  position: fixed;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: center;

  z-index: 1000;
}
</style>
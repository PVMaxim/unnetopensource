<template>
  <WalletConnectRequestModalLayout :state="state" :progressTitle="progressTitle" :showCloseButton="!pinState"
    :close="reject"
    :contentClass="pinState ? 'pin-request' : ''"
    :bodyContentClass="pinState ? 'pin-request' : ''"
    >
    <template v-slot:header>
      <AppIntentionHeader :metadata="requestSession?.peer?.metadata" :verifyContext="requestEvent.verifyContext">
        <template v-slot:intention>wants to send a transaction</template>
      </AppIntentionHeader>
    </template>

    <template v-slot:body>
      <PinCode v-if="pinState" title="Enter PIN" v-model="pinPre" :error=null :buttonClick=null
        :useStorePinCode=true @isStore="onStorePinChange($event.value)" @cancelButton="onPinCancelButton($event.value)"
        @change="onPinChange($event.value)" v-model:numberOfDigits=pinLength
        @changePinLength="changePinLength()"/>

      <div v-else class="body-container">
        <EvmTransactionExplanationCard v-if="txExplanation" :txExplanation="txExplanation" />
        <EvmTransactionPredictionCard title="Predicted changes" :tokenBalanceChanges="tokenBalanceChanges" />
        <EvmTransactionCallDetailsCard v-if="chainKey && txParsed" title="Call details" :chainKey="chainKey" :txRequest="txRequest"
          :txParsed="txParsed" :isCurrentAccount="isCurrentAccount" />
      </div>
    </template>

    <template v-if="!pinState" v-slot:actions>
      <ApproveAction :approve="approve" :isLoading="isLoading"/>
    </template>

    <template v-slot:process-success>
      <ResultDialog :success="true" :close="closeModal" :message="successMessage" :details="successDetails" />
    </template>

    <template v-slot:process-fail>
      <ResultDialog :success="false" :close="closeModal" :message="failMessage" :details="failDetails" />
    </template>

    <template v-slot:step-fail>
      <ResultDialog :success="false" :close="closeStepFail" :message="failMessage" :details="failDetails" />
    </template>
  </WalletConnectRequestModalLayout>
  </template>

<script>
import { computed, defineComponent, onMounted, ref, shallowRef, unref, watch } from "vue";

import WalletConnectRequestModalLayout, { STATE_DEFAULT, STATE_INPROGRESS, STATE_PROCESS_FAIL, STATE_PROCESS_SUCCESS, STATE_STEP_FAIL } from "./WalletConnectRequestModalLayout.vue";
import AppIntentionHeader from "../AppIntentionHeader.vue";
import ApproveAction from "../ApproveAction.vue";
import ResultDialog from "../ResultDialog.vue";
import EvmTransactionExplanationCard from "../EvmTransactionExplanationCard.vue";
import EvmTransactionCallDetailsCard from "../EvmTransactionDetailsCard.vue";
import EvmTransactionPredictionCard from "../EvmTransactionPredictionCard.vue";
import PinCode from '@/components/PinCode.vue';
import { prefixStore } from '@/api/ApiHandler';
import { SUPPORTED_CHAINS } from "@/api/wallet-connect/wcNamespaces";
import { createRejectResponse } from "@/api/wallet-connect/wcJsonRpcUtils"
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { walletConnectHelper } from "@/api/wallet-connect/wcHelper";
import { wcModalQueue } from "@/api/wallet-connect/wcModalQueue";
import { evmTransactionParser } from "@/api/wallet-connect/evm/evmTransactionParser";
import { evmTransactionExplaner } from "@/api/wallet-connect/evm/evmTransactionExplainer";
import { EvmChainId } from "@/api/wallet-connect/evm/evmChainId";
import { evmTransactionPredictor } from "@/api/wallet-connect/evm/evmTransactionPredictor";
import { getSuccessfulSignPinByAddress, storeSuccessfulSignPin } from "@/api/wallet-connect/wcPin";
import { checkIsCurrentAccountAddress } from "@/api/wallet-connect/wcCardKeys";
import { useStore } from "vuex";
import { getSecp256k1Key } from "@/api/utils";
import { EvmRequest } from "@/api/evm/request";
import { setUniSettings } from "@/api/global-settings";

export default defineComponent({
  name: "EvmSendTransactionModal",
  components: {
    WalletConnectRequestModalLayout,
    AppIntentionHeader,
    ApproveAction,
    ResultDialog,
    EvmTransactionExplanationCard,
    EvmTransactionCallDetailsCard,
    EvmTransactionPredictionCard,
    PinCode,
  },
  props: {
    requestEvent: Object,
    requestSession: Object,
    nfcHandlerWindow: Object,
  },

  setup({ requestEvent, nfcHandlerWindow }) {
    const state = ref(STATE_DEFAULT);
    const store = useStore();
    const progressTitle = ref(null);
    const failMessage = ref("");
    const failDetails = ref("");
    const successMessage = ref("");
    const successDetails = ref("");
    const pinState = ref(false);
    const pinPre = ref(null);
    const needStorePin = ref(false);
    const isLoading = ref(false);
    const txRequest = ref();
    const txExplanation = ref();
    const tokenBalanceChanges = ref([]);
    const chainKey = ref();
    const txParsed = ref();

    onMounted(async () => {
      isLoading.value = true;
      const { params } = requestEvent ?? {};
      const { chainId, request } = params ?? {};
      txRequest.value = request?.params[0];
      chainKey.value = chainId;
      const supportedChain = SUPPORTED_CHAINS[chainId];
      const supportedChainId = supportedChain.id;
      const supportedChainProviderManager = supportedChain.getBlockchainManager();

      const blockchain = {
        chainId: new EvmChainId(supportedChainId),
        manager: supportedChainProviderManager,
      };
      txParsed.value = await evmTransactionParser.parse(txRequest.value, blockchain);

      const predictedEvmTransaction = evmTransactionPredictor.predict(txRequest.value, blockchain);
      tokenBalanceChanges.value = unref(predictedEvmTransaction.tokenBalanceChanges);
      txExplanation.value = await evmTransactionExplaner.explain(txParsed.value);
      isCurrentAccount.value = await checkIsCurrentAccountAddress(txRequest.value.from, supportedChainProviderManager);
      isLoading.value = false;
    })

    const pinLength = computed(() => { 
      if ( typeof store.state[`${prefixStore.value}.customtoken`]?.pinLength !== undefined ) {
        return store.state[`${prefixStore.value}.customtoken`]?.pinLength
      }
      return 4
    });

    const isCurrentAccount = ref(true);

    let closeModalCalled = false;
    const closeModal = () => {
      if (closeModalCalled) {
        return;
      }
      closeModalCalled = true;
      wcModalQueue.pop();
    };

    const changePinLength = () => {
      pinPre.value = null;
    }

    const closeStepFail = () => {
      state.value = STATE_DEFAULT;
    }

    const respondRejected = async () => {
      try {
        const result = createRejectResponse(requestEvent);
        await walletConnectHelper.value.respondSessionRequest(requestEvent, result);
      } catch (error) {
      }
    }

    const reject = async () => {
      if (state.value == STATE_DEFAULT && walletConnectHelper.value) {
        respondRejected();
      }

      closeModal();
    };

    const approve = async () => {
      if (state.value == STATE_INPROGRESS || !walletConnectHelper.value) {

        failMessage.value = 'Failed';
        failDetails.value = 'Unable to perform the operation at the moment.';
        state.value = STATE_STEP_FAIL;

        return;
      }

      pinPre.value = null;
      needStorePin.value = false;
      const supportedChain = SUPPORTED_CHAINS[chainKey.value];
      const supportedChainProviderManager = supportedChain.getBlockchainManager();

      const storedPin = await getSuccessfulSignPinByAddress(txRequest.value.from, supportedChainProviderManager);
      if (storedPin) {
        pinPre.value = storedPin;
        await approveWithPin();
      } else {
        pinState.value = true;
      }
    };

    const onStorePinChange = async (value) => {
      needStorePin.value = value;
    }

    const onPinCancelButton = () => {
      pinState.value = false;
      pinPre.value = null;
      needStorePin.value = false;
    };

    const onPinChange = async () => {
      if (pinPre.value?.length !== pinLength.value) {
        return;
      }

      pinState.value = false;
      await approveWithPin();
    }

    const approveWithPin = async () => {
      state.value = STATE_INPROGRESS;

      let txSendRequest;

      try {
        txSendRequest = await createTxSendRequest();
      }catch (error) {
      } finally {
        progressTitle.value = "";
      }

      let processResult = undefined;

      progressTitle.value = "Signing message";

      try {
        progressTitle.value = "Signing transaction";
        await signTransaction(txSendRequest.tx);
      } catch (error) {
      }

      try {
        const { tx } = txSendRequest;
        processResult = await tx.send();
      } catch (error) {
      } finally {
        progressTitle.value = "";
      }

      if (!processResult) {
        const isSignErrorFatal = false;
        if (isSignErrorFatal) {
          failMessage.value = 'Signing message failed';
          failDetails.value = '';
          state.value = STATE_PROCESS_FAIL;

          respondRejected();
        } else {
          failMessage.value = 'Signing message failed';
          failDetails.value = '';
          state.value = STATE_STEP_FAIL;
        }
        return;
      }

      if (needStorePin.value) {
        storeSuccessfulSignPin(pinPre.value, processResult.signature?.keys);
      }

      let processSuccess = false;

      progressTitle.value = "Responding to the application";
      try {
        const { id } = requestEvent ?? {};
        await walletConnectHelper.value.respondSessionRequest(requestEvent, formatJsonRpcResult(id, processResult));
        processSuccess = true;
      } catch (error) {
      } finally {
        progressTitle.value = "";
      }

      if (processSuccess) {
        state.value = STATE_DEFAULT;
        closeModal();
      } else {
        failMessage.value = 'Application not notified'
        failDetails.value = 'Message was signed successfully, but the application was not notified about the result.';
        state.value = STATE_PROCESS_FAIL;

      }
    };

    const signTransaction = async (transaction) => {
      try {
        setUniSettings({
          ioMethod:
            store.state.settings.cardReaderPriority === "fido" ? "fido" : "nfc",
        });
        const resultStart = shallowRef(null);
        resultStart.value =
          await nfcHandlerWindow.nfcProgressChunksHandler(
            transaction,
            pinPre.value,
            true
          );
      } catch (err) {
        throw new Error(`Error signing transaction: ${err.message}`);
      } finally {
        pinPre.value = null;
      }
    }

    const createTxSendRequest = async () => {
      progressTitle.value = "Preparing transaction";
      const publicKey = getSecp256k1Key(store.state.user.publicKeyCard) 
      const supportedChain = SUPPORTED_CHAINS[chainKey.value];
      const supportedChainProviderManager = supportedChain.getBlockchainManager();
      const tx = await EvmRequest.create({ provider: supportedChainProviderManager.provider, tx: txRequest.value, publicKey: publicKey, });
      return { tx };
    } 

    return {
      state,
      progressTitle,
      failMessage,
      failDetails,
      successMessage,
      successDetails,

      chainKey,
      txRequest,
      tokenBalanceChanges,
      txParsed,
      txExplanation,
      isCurrentAccount,

      pinState,
      pinPre,
      pinLength,
      changePinLength,
      onPinCancelButton,
      onPinChange,
      onStorePinChange,

      reject,
      approve,
      closeModal,
      closeStepFail,
      isLoading
    };
  },
});
</script>

<style lang="css" scoped>
.body-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
</style>
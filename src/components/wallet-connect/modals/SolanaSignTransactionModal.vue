<template>
  <WalletConnectRequestModalLayout :state="state" :progressTitle="progressTitle" :showCloseButton="!pinState"
    :close="reject"
    :contentClass="pinState ? 'pin-request' : ''"
    :bodyContentClass="pinState ? 'pin-request' : ''"
    >
    <template v-slot:header>
      <AppIntentionHeader :metadata="requestSession?.peer?.metadata" :verifyContext="requestEvent.verifyContext">
        <template v-slot:intention> wants to sign a transaction</template>
      </AppIntentionHeader>
    </template>

    <template v-slot:body>
      <PinCode v-if="pinState" title="Enter PIN" v-model="pinPre" :numberOfDigits=4 :error=null :buttonClick=null
        :useStorePinCode=true @isStore="onStorePinChange($event.value)" @cancelButton="onPinCancelButton($event.value)"
        @change="onPinChange($event.value)" />
    </template>

    <template v-if="!pinState" v-slot:actions>
      <ApproveAction :approve="approve" />
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

import { defineComponent, ref } from "vue";

import WalletConnectRequestModalLayout, { STATE_DEFAULT, STATE_INPROGRESS, STATE_PROCESS_FAIL, STATE_STEP_FAIL } from "./WalletConnectRequestModalLayout.vue";
import AppIntentionHeader from "../AppIntentionHeader.vue";
import ApproveAction from "../ApproveAction.vue";
import ResultDialog from "../ResultDialog.vue";
import PinCode from '@/components/PinCode.vue';
import { SUPPORTED_CHAINS } from "@/api/wallet-connect/wcNamespaces";
import { createRejectResponse } from "@/api/wallet-connect/wcJsonRpcUtils"
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { walletConnectHelper } from "@/api/wallet-connect/wcHelper";
import { wcModalQueue } from "@/api/wallet-connect/wcModalQueue";
import { getSuccessfulSignPinByAddress, storeSuccessfulSignPin } from "@/api/wallet-connect/wcPin";
import { setUniSettings } from "@/api/global-settings";
import { useStore } from "vuex";
import { getEd25519Key } from "@/api/utils";
import { Ed25519RequestChunk } from "@/api/request-chunks";
import { deserializeTransaction } from  "@/api/wallet-connect/solana/deserializeTransaction";
import bs58 from 'bs58';

export default defineComponent({
  name: "SolanaSignTransactionModal",
  components: {
    WalletConnectRequestModalLayout,
    AppIntentionHeader,
    ApproveAction,
    ResultDialog,
    PinCode,
  },
  props: {
    requestEvent: Object,
    requestSession: Object,
    nfcHandlerWindow: Object,
  },

  setup({ requestEvent, nfcHandlerWindow }) {
    const store = useStore();

    const state = ref(STATE_DEFAULT);
    const progressTitle = ref(null);
    const failMessage = ref("");
    const failDetails = ref("");
    const pinState = ref(false);
    const pinPre = ref(null);
    const needStorePin = ref(false);

    const { params, id } = requestEvent ?? {};
    const { chainId, request } = params ?? {};
    const method = request?.method ?? "";
    const methodParams = request?.params ?? [];

    const supportedChain = SUPPORTED_CHAINS[chainId];
    const supportedChainProviderManager = supportedChain.getBlockchainManager();

    let closeModalCalled = false;
    const closeModal = () => {
      if (closeModalCalled) {
        return;
      }
      closeModalCalled = true;
      wcModalQueue.pop();
    };

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

      const storedPin = await getSuccessfulSignPinByAddress(params.request.params.address, supportedChainProviderManager);
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
      if (pinPre.value?.length !== 4) {
        return;
      }

      pinState.value = false;
      await approveWithPin();
    }

     const approveWithPin = async () => {
        state.value = STATE_INPROGRESS;

        let processResult = undefined;

        progressTitle.value = "Signing message";
        try {
          processResult = await sign();
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
            storeSuccessfulSignPin(pinPre.value, store.state.user.publicKeyCard);
        }

        let processSuccess = false;

        progressTitle.value = "Responding to the application";
        try {
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

      const sign = async () => {
         try {
          failDetails.value = "";
          setUniSettings({
            ioMethod:
              store.state.settings.cardReaderPriority === "fido" ? "fido" : "nfc",
          });

          const publicKey = getEd25519Key(store.state.user.publicKeyCard);
          const desirializedTransaction = deserializeTransaction(methodParams.transaction);
          const message = desirializedTransaction.message.serialize();
          const request = {
            chunks: [
              new Ed25519RequestChunk({
                hash: Buffer.from(message).toString("hex"),
                expectedPublicKey: publicKey,
              })
            ]
          }
          await nfcHandlerWindow.nfcProgressChunksHandler(request, pinPre.value, true);

          const signature = request.chunks[0].signature;

          const rawSignature = Buffer.from(signature, "hex");

          const signResult = {
              signature:  bs58.encode(rawSignature),
          }
          return signResult;
        } catch (err) {
          throw new Error(`Error signing transaction: ${err.message}`);
        } finally {
          pinPre.value = null;
        } 

      } 

    return {
      state,
      progressTitle,
      failMessage,
      failDetails,
      chainId,
      method,
      pinState,
      pinPre,
      onPinCancelButton,
      onPinChange,
      onStorePinChange,
      reject,
      approve,
      closeModal,
      closeStepFail,
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


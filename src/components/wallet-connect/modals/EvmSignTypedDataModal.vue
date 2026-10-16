<template>
  <WalletConnectRequestModalLayout :state="state" :progressTitle="progressTitle" :showCloseButton="!pinState"
    :close="reject"
    :contentClass="pinState ? 'pin-request' : ''"
    :bodyContentClass="pinState ? 'pin-request' : ''"
    >
    <template v-slot:header>
      <AppIntentionHeader :metadata="requestSession?.peer?.metadata" :verifyContext="requestEvent.verifyContext">
        <template v-slot:intention>wants to sign a message</template>
      </AppIntentionHeader>
    </template>

    <template v-slot:body>
      <PinCode v-if="pinState" title="Enter PIN" v-model="pinPre" :error=null :buttonClick=null
        :useStorePinCode=true @isStore="onStorePinChange($event.value)" @cancelButton="onPinCancelButton($event.value)"
        @change="onPinChange($event.value)" v-model:numberOfDigits=pinLength
        @changePinLength="changePinLength()"/>

      <div v-else class="body-container">
        <EvmTypedDataExplanationCard v-if="explanation" :explanation="explanation" />
        <EvmTypedDataDetailsCard title="Message details" :chainKey="chainId" :from="from" :parsed="parsed"
          :isCurrentAccount="isCurrentAccount" />
      </div>
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

import { computed, defineComponent, ref, shallowRef } from "vue";

import WalletConnectRequestModalLayout, { STATE_DEFAULT, STATE_INPROGRESS, STATE_PROCESS_FAIL, STATE_PROCESS_SUCCESS, STATE_STEP_FAIL } from "./WalletConnectRequestModalLayout.vue";
import AppIntentionHeader from "../AppIntentionHeader.vue";
import ApproveAction from "../ApproveAction.vue";
import ResultDialog from "../ResultDialog.vue";
import EvmTypedDataExplanationCard from "../EvmTypedDataExplanationCard.vue";
import EvmTypedDataDetailsCard from "../EvmTypedDataDetailsCard.vue";
import PinCode from '@/components/PinCode.vue';
import { SUPPORTED_CHAINS } from "@/api/wallet-connect/wcNamespaces";
import { createRejectResponse } from "@/api/wallet-connect/wcJsonRpcUtils"
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { walletConnectHelper } from "@/api/wallet-connect/wcHelper";
import { wcModalQueue } from "@/api/wallet-connect/wcModalQueue";
import { evmTypedDataParser } from "@/api/wallet-connect/evm/evmTypedDataParser";
import { EvmChainId } from "@/api/wallet-connect/evm/evmChainId";
import { evmTypedDataExplainer } from "@/api/wallet-connect/evm/evmTypedDataExplainer";
import { getSuccessfulSignPinByAddress, storeSuccessfulSignPin } from "@/api/wallet-connect/wcPin";
import { checkIsCurrentAccountAddress } from "@/api/wallet-connect/wcCardKeys";
import { convertSignatureForEvm } from "@/api/evm/request";
import { BatchSecp256k1RequestChunk } from "@/api/request-chunks";
import { add0xPrefix } from "@/api/evm/common";
import { getTypedDataHashToSign } from "@/api/wallet-connect/evm/evmSignUtils";
import { EIP155_SIGNING_METHODS } from "@/api/wallet-connect/wcMethods";
import { setUniSettings } from "@/api/global-settings";
import { useStore } from "vuex";
import { getSecp256k1Key } from "@/api/utils";
import { prefixStore } from '@/api/ApiHandler';

export default defineComponent({
  name: "EvmSignTypedDataModal",
  components: {
    WalletConnectRequestModalLayout,
    AppIntentionHeader,
    ApproveAction,
    ResultDialog,
    EvmTypedDataExplanationCard,
    EvmTypedDataDetailsCard,
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
    const from = methodParams[0] ?? "";
    const methodParamDataStr = methodParams[1];
    const methodParamData = JSON.parse(methodParamDataStr || "{}");

    const supportedChain = SUPPORTED_CHAINS[chainId];
    const supportedChainId = supportedChain.id;
    const supportedChainProviderManager = supportedChain.getBlockchainManager();
    const isCurrentAccount = ref(true);
    const pinLength = computed(() => { 
      if ( typeof store.state[`${prefixStore.value}.customtoken`]?.pinLength !== undefined ) {
        return store.state[`${prefixStore.value}.customtoken`]?.pinLength
      }
      return 4
    });

    (async () => {
      isCurrentAccount.value = await checkIsCurrentAccountAddress(from, supportedChainProviderManager);
    })();

    const blockchain = {
      chainId: new EvmChainId(supportedChainId),
      manager: supportedChainProviderManager,
    };
    const parsed = evmTypedDataParser.parse(methodParamData, method);
    const explanation = evmTypedDataExplainer.explain(parsed, blockchain);

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

      const storedPin = await getSuccessfulSignPinByAddress(from, supportedChainProviderManager);
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

          const dataHash = getTypedDataHashToSign({
            data: methodParamData,
            version: (method == EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA)
              ? "V1"
              : (
                (method == EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3)
                  ? "V3"
                  : "V4"
              )
          });

          const publicKey = getSecp256k1Key(store.state.user.publicKeyCard);

          const requestChunk = new BatchSecp256k1RequestChunk({
            hashes: [dataHash],
            expectedPublicKey: publicKey,
          })

          const resultStart = shallowRef(null);

          resultStart.value = await nfcHandlerWindow.nfcProgressChunksHandler(
              {chunks: [requestChunk]},
              pinPre.value,
              false         
             ); 

          const signature = requestChunk.signatures[0];

          const signResult = add0xPrefix(convertSignatureForEvm({
            dataHash,
            signature: signature,
            publicKey: resultStart.value.keys.secp256k1
          }));

          if (needStorePin.value) {
            storeSuccessfulSignPin(pinPre.value, signature.keys);
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
      methodParamData,
      from,
      parsed,
      explanation,
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
<template>
  <WalletConnectRequestModalLayout :state="state" :progressTitle="progressTitle" :showCloseButton="!pinState"
    :close="reject"
    :contentClass="pinState ? 'pin-request' : ''"
    :bodyContentClass="pinState ? 'pin-request' : ''"
    >
    <template v-slot:header>
      <AppIntentionHeader :metadata="requestSession?.peer?.metadata" :verifyContext="requestEvent.verifyContext">
        <template v-slot:intention>wants to sign a transaction</template>
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

import { defineComponent, onMounted, ref, shallowRef } from "vue";

import WalletConnectRequestModalLayout, { STATE_DEFAULT, STATE_INPROGRESS, STATE_PROCESS_FAIL, STATE_PROCESS_SUCCESS, STATE_STEP_FAIL } from "./WalletConnectRequestModalLayout.vue";
import AppIntentionHeader from "../AppIntentionHeader.vue";
import ApproveAction from "../ApproveAction.vue";
import ResultDialog from "../ResultDialog.vue";
import PinCode from '@/components/PinCode.vue';
import { SUPPORTED_CHAINS } from "@/modules/wallet-connect/api/wcNamespaces";
import { createRejectResponse } from "@/modules/wallet-connect/api/wcJsonRpcUtils"
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { walletConnectHelper } from "@/modules/wallet-connect/api/wcHelper";
import { wcModalQueue } from "@/modules/wallet-connect/api/wcModalQueue";
import { getSuccessfulSignPinByAddress, storeSuccessfulSignPin } from "@/modules/wallet-connect/api/wcPin";
import { setUniSettings } from "@/api/global-settings";
import { useStore } from "vuex";
import { getSecp256k1Key } from "@/api/utils";
import { TronWeb } from "tronweb";
import { TronRequest } from "@/api/tron/request";

export default defineComponent({
  name: "TronSignModal",
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

    const supportedChain = SUPPORTED_CHAINS[chainId];
    const supportedChainProviderManager = supportedChain.getBlockchainManager();

    onMounted(async () => {
        const contractHexAddress = params.request.params.transaction.transaction.raw_data.contract[0].parameter.value.contract_address;
        const contractAddress = TronWeb.address.fromHex(contractHexAddress);
        const contract = await supportedChainProviderManager.provider.trx.getContract(contractAddress);
        console.log("hi", contract);
        const rawData = params.request.params.transaction.transaction.raw_data.contract[0].parameter.value.data;
        const selector = rawData.slice(0, 8); 
        console.log("hi", selector);
        for (const item of contract.abi.entrys) {
            if (item.type.toLowerCase() !== 'function' ) continue;

            if(!item.inputs) continue;

            const inputTypes = item.inputs.map(i => {
                if (i.type === 'tuple') {
                // support tuple syntax
                
                return `tuple()`;
                }
                return i.type;
            }).join(',');

            const signature = `${item.name}(${inputTypes})`;

            // Use TronWeb to hash the function signature (keccak256)
            const hash = supportedChainProviderManager.provider.sha3(signature).substring(2, 10); // 0x + 8 hex chars
            console.log(hash, signature)
            if (hash === selector) {
                console.log(`✅ Selector ${selector} matches function: ${signature}`);
                break;
            }
        } 

       
    })

    let closeModalCalled = false;
    const closeModal = () => {
      if (closeModalCalled) {
        console.warn('Extra attempt to close modal');
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
        console.error('respondSessionRequest (reject) error', error);
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
        console.error('approve error', {
          state,
          walletConnectHelper: walletConnectHelper.value ? 'available' : 'unexpected unavailable',
        });

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

    const createTxSendRequest = async () => {
      progressTitle.value = "Preparing transaction";
      const publicKey = getSecp256k1Key(store.state.user.publicKeyCard);
      const tx = new TronRequest({ provider: supportedChainProviderManager.provider, transaction: params.request.params.transaction.transaction, publicKey: publicKey, });
      return { tx };
    } 

     const approveWithPin = async () => {
      console.log("called evmSendTransactionModal approveWithPin");
      state.value = STATE_INPROGRESS;

      let txSendRequest;

      try {
        txSendRequest = await createTxSendRequest();
      }catch (error) {
        console.error('createTxSendRequest error', error)
      } finally {
        progressTitle.value = "";
      }

      let processResult = undefined;

      progressTitle.value = "Signing message";
      

      try {
        progressTitle.value = "Signing transaction";
        await signTransaction(txSendRequest.tx);
      } catch (error) {
         failMessage.value = 'Signing message failed';
          failDetails.value = '';
          state.value = STATE_PROCESS_FAIL;
      }

      if (needStorePin.value) {
        storeSuccessfulSignPin(pinPre.value, processResult.signature?.keys);
      }

      let processSuccess = false;

      progressTitle.value = "Responding to the application";
      try {
        const copyTransaction = JSON.parse(JSON.stringify(params.request.params.transaction.transaction))
        console.log({ copyTransaction })
        const responseData = formatJsonRpcResult(id, {
            transaction: {
              ...copyTransaction,
              signature: [txSendRequest.tx.chunks[0].signature]
            }
           
        }) 
        console.log("responseData", JSON.stringify(responseData), responseData,)
        
        await walletConnectHelper.value.respondSessionRequest(requestEvent, responseData);
        processSuccess = true;
      } catch (error) {
        console.error('respondSessionRequest (result) error', error);
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

        //respondRejected(); //???
      }
    };

    const signTransaction = async (transaction) => {
      try {
        setUniSettings({
          ioMethod:
            store.state.settings.cardReaderPriority === "fido" ? "fido" : "nfc",
        });
        console.log("signTransaction", transaction);
        const resultStart = shallowRef(null);
        resultStart.value =
          await nfcHandlerWindow.nfcProgressChunksHandler(
            transaction,
            pinPre.value,
            true
          );
        console.log('resultStart : ' + JSON.stringify(resultStart.value));
        console.log("transaction", transaction)


      } catch (err) {
        console.log(
          `nfcHandlerWindow ERROR:  type is ${typeof err} data is ${JSON.stringify(err)}`
        );
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


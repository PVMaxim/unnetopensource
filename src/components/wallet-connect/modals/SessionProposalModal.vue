<template>
  <WalletConnectRequestModalLayout :state="state" :progressTitle="progressTitle" :showCloseButton="true"
    :close="reject"
    :contentClass="pinState ? 'pin-request' : ''"
    :bodyContentClass="pinState ? 'pin-request' : ''"
    >
    <template v-slot:header>
      <AppIntentionHeader :metadata="proposal.params.proposer.metadata" :verifyContext="proposal.verifyContext">
        <template v-slot:intention>requests to connect</template>
      </AppIntentionHeader>
    </template>

    <template v-slot:body>
      <div>
        <InfoCard>
          <template v-slot:legend>
            The application will be able to see you balances and send approval requests, it won't be able to move your
            funds without permission.
          </template>
          <InfoItemList>
            <InfoItem name="Accounts">
              <InfoItemMultiValue>
                <template v-for="account in accounts" :key="account.address">
                  <AddressWithChainElement :chainKey="account.chainKey" :address="account.address || 'N/A'" />
                </template>
              </InfoItemMultiValue>
            </InfoItem>
          </InfoItemList>
        </InfoCard>
      </div>
    </template>

    <template v-slot:actions>
      <ApproveAction :approve="approve" />
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
import { defineComponent, onMounted, ref } from "vue";
import { buildApprovedNamespaces } from "@walletconnect/utils";

import WalletConnectRequestModalLayout, { STATE_DEFAULT, STATE_INPROGRESS, STATE_PROCESS_FAIL, STATE_PROCESS_SUCCESS } from "./WalletConnectRequestModalLayout.vue";

import AppIntentionHeader from "../AppIntentionHeader.vue";
import ApproveAction from "../ApproveAction.vue";
import ResultDialog from "../ResultDialog.vue";
import InfoCard from "../InfoCard.vue";
import InfoItemList from "../InfoItemList.vue";
import InfoItem from "../InfoItem.vue";
import InfoItemMultiValue from "../InfoItemMultiValue.vue";

import { checkCardKeys, getCardKeys } from "@/api/wallet-connect/wcCardKeys";
import { wcModalQueue } from "@/api/wallet-connect/wcModalQueue";
import { SUPPORTED_CHAINS, getSupportedNamespaces, getTonSessionProperties } from "@/api/wallet-connect/wcNamespaces";
import { invalidateConnectedAppsCache, walletConnectHelper } from "@/api/wallet-connect/wcHelper";
import AddressWithChainElement from "../AddressWithChainElement.vue";

export default defineComponent({
  name: "SessionProposalModal",
  components: {
    WalletConnectRequestModalLayout,
    AppIntentionHeader,
    ApproveAction,
    ResultDialog,
    InfoCard,
    InfoItemList,
    InfoItem,
    InfoItemMultiValue,
    AddressWithChainElement
  },
  props: {
    proposal: Object,
  },

  setup({ proposal }) {
    const state = ref(STATE_DEFAULT);
    const progressTitle = ref(null);
    const accounts = ref([]);
    const failMessage = ref(null);
    const failDetails = ref(null);
    const successMessage = ref(null);
    const successDetails = ref(null);

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

    const reject = async () => {
      if (state.value == STATE_DEFAULT && walletConnectHelper.value) {
        walletConnectHelper.value.rejectSession(proposal).catch((error) => {
          console.error('rejectSession error', error);
        });
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


      let success = false;

      state.value = STATE_INPROGRESS;
      progressTitle.value = "Approving connection request";
      try {
        const optionalKeys = Object.keys(proposal.params.optionalNamespaces || {});
        const requiredKeys = Object.keys(proposal.params.requiredNamespaces || {});

        const chains = optionalKeys.length ? optionalKeys : requiredKeys;

        if (chains.length === 0) {
          throw new Error(`Unsupported chain: ${chains}`);
        }

        let supportedNamespaces = {};

        for(const chain of chains){
          const supportedNamespace = await getSupportedNamespaces(getCardKeys(), chain);
          supportedNamespaces = {...supportedNamespaces, ...supportedNamespace }
        }
       
        const approvedNamespaces = buildApprovedNamespaces({
          proposal: proposal.params,
          supportedNamespaces,
        });

        let sessionProperties = undefined;
        if (approvedNamespaces.ton) {
          try {
            sessionProperties = await getTonSessionProperties(getCardKeys());
            console.log("TON sessionProperties approved:", sessionProperties);
          } catch (e) {
            console.error("Failed to get TON session properties:", e);
          }
        }

        await walletConnectHelper.value.approveSession(
          proposal,
          approvedNamespaces,
          sessionProperties,
        );

        invalidateConnectedAppsCache();
        success = true;
      } catch (error) {
        console.error('approveSession error', error);
      } finally {
        progressTitle.value = "";
      }

      if (success) {
        const appName = proposal?.params.proposer.metadata.name;
        successMessage.value = 'Successful!'
        successDetails.value = `Application${appName ? (' ' + appName) : ''} has\xA0been\xA0connected.`;
        state.value = STATE_PROCESS_SUCCESS;
      } else {
        failMessage.value = 'Unable to connect';
        failDetails.value = 'Try again with new connection QR code / URL.';
        state.value = STATE_PROCESS_FAIL;

        //respondRejected(); //???
      }
    };

    const getRequestedNamespaceNames = (requestedNamespaces) => {
      if (!requestedNamespaces) {
        return [];
      }

      const result = [];
      for (const [key, values] of Object.entries(requestedNamespaces)) {
        const chains = key.includes(":") ? key : values.chains;
        result.push(chains);
      }

      return [...new Set(result.flat())];
    };

    const requiredRequestedNamespaceNames = getRequestedNamespaceNames(
      proposal?.params.requiredNamespaces
    );
    const optionalRequestedNamespaceNames = getRequestedNamespaceNames(
      proposal?.params.optionalNamespaces
    );

    const supportedNamespaceNames = [
      ...requiredRequestedNamespaceNames,
      ...optionalRequestedNamespaceNames,
    ].filter((requested) => !!SUPPORTED_CHAINS[requested]);
    const unsupportedNamespaceNames = requiredRequestedNamespaceNames.filter(
      (requested) => !SUPPORTED_CHAINS[requested]
    );

    if (unsupportedNamespaceNames.length > 0) {
      state.value = STATE_PROCESS_FAIL;
      failMessage.value = 'Request from uncompatible application';
      failDetails.value = 'Required accounts are not available on your card.';
    }

    onMounted(async () => {
      const keys = getCardKeys();

      const prevState = state.value;
      state.value = STATE_INPROGRESS;
      progressTitle.value = "";
      try {
        accounts.value = await Promise.all(
          supportedNamespaceNames.map((name) =>
            (async () => {
              const chain = SUPPORTED_CHAINS[name];

              const address = await (async () => {
                if (!checkCardKeys(keys)) {
                  return "";
                }

                const manager = chain.getBlockchainManager();
                if (typeof manager == "string") {
                  return "";
                }

                try {
                  return await manager.getWalletAddress(keys);
                } catch (_) {
                  console.error(_);
                }

                return "";
              })();

              return {
                chainKey: name,
                chainName: chain.name,
                address,
              };
            })(name)
          )
        );
      } finally {
        progressTitle.value = "";
        state.value = prevState;
      }
    });

    return {
      state,
      progressTitle,
      accounts,
      failMessage,
      failDetails,
      successMessage,
      successDetails,

      reject,
      approve,
      closeModal,
      closeStepFail,
    };
  },
});
</script>

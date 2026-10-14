<template>
  <InfoCard v-if="(explanation.type == EVM_PERMIT2_PERMIT_TOKENS)" :title="title">
    <template v-slot:legend>You're giving someone else permission to spend this amount from your account.</template>
    <InfoItemList>
      <InfoItem name="Tokens">
        <InfoItemMultiValue>
          <template v-for="details in explanation.details">
            <EvmTokenAmountElement v-if="details.amount" :token="details.tokenActor.asToken" :amount="details.amount"
              :supportUnlimited="true" />
            <div v-else>-</div>
          </template>
        </InfoItemMultiValue>
      </InfoItem>
      <InfoItem name="Spender">
        <EvmActorElement :actor="explanation.spender" />
      </InfoItem>
    </InfoItemList>
  </InfoCard>
</template>

<script>
import { defineComponent } from "vue";

import InfoCard from "./InfoCard.vue";
import InfoItemList from "./InfoItemList.vue";
import InfoItem from "./InfoItem.vue";
import InfoItemMultiValue from "./InfoItemMultiValue.vue";
import EvmTokenAmountElement from "./EvmTokenAmountElement.vue";
import EvmActorElement from "./EvmActorElement.vue";

import { EVM_PERMIT2_PERMIT_TOKENS } from "@/api/wallet-connect/evm/evmTypedDataExplainer";

export default defineComponent({
  name: "EvmTypedDataExplanationCard",
  components: {
    InfoCard,
    InfoItemList,
    InfoItem,
    InfoItemMultiValue,
    EvmTokenAmountElement,
    EvmActorElement,
  },
  props: {
    title: String,
    explanation: Object,
  },
  setup() {
    return {
      EVM_PERMIT2_PERMIT_TOKENS,
    };
  },
});
</script>

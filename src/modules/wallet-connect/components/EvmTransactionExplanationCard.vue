<template>
  <InfoCard v-if="txExplanation.type == EVM_TOKEN_APPROVE_NONE" :title="title">
    <template v-slot:legend>You're removing someone's permission to spend tokens from your account.</template>
    <InfoItemList>
      <InfoItem name="Token">
        <EvmTokenElement :token="txExplanation.token" />
      </InfoItem>
      <InfoItem name="Spender">
        <EvmActorElement :actor="txExplanation.spender" />
      </InfoItem>
    </InfoItemList>
  </InfoCard>
  <InfoCard v-else-if="txExplanation.type == EVM_TOKEN_APPROVE" :title="title">
    <template v-slot:legend>You're giving someone else permission to spend this amount from your account.</template>
    <InfoItemList>
      <InfoItem name="Tokens">
        <EvmTokenAmountElement :amount="txExplanation.limit" :token="txExplanation.token" :supportUnlimited="true" />
      </InfoItem>
      <InfoItem name="Spender">
        <EvmActorElement :actor="txExplanation.spender" />
      </InfoItem>
    </InfoItemList>
  </InfoCard>
</template>

<script>
import { defineComponent } from "vue";

import InfoCard from "./InfoCard.vue";
import InfoItemList from "./InfoItemList.vue";
import InfoItem from "./InfoItem.vue";

import { EVM_TOKEN_APPROVE, EVM_TOKEN_APPROVE_NONE } from "@/modules/wallet-connect/api/evm/evmTransactionExplainer";
import EvmActorElement from "./EvmActorElement.vue";
import EvmTokenElement from "./EvmTokenElement.vue";
import EvmTokenAmountElement from "./EvmTokenAmountElement.vue";

export default defineComponent({
  name: "EvmTransactionExplanationCard",
  components: {
    InfoCard,
    InfoItemList,
    InfoItem,
    EvmActorElement,
    EvmTokenElement,
    EvmTokenAmountElement,
  },
  props: {
    title: String,
    txExplanation: Object,
  },
  setup() {
    return {
      EVM_TOKEN_APPROVE_NONE,
      EVM_TOKEN_APPROVE,
    };
  },
});
</script>

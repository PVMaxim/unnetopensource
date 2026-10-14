<template>
  <InfoCard v-if="sendChanges.length || receiveChanges.length" :title="title">
    <InfoItemList>
      <InfoItem v-if="sendChanges.length" name="You send">
        <InfoItemMultiValue>
          <EvmTokenAmountElement v-for="change in sendChanges" :token="change.tokenActor.asToken"
            :amount="change.amount" />
        </InfoItemMultiValue>
      </InfoItem>
      <InfoItem v-if="receiveChanges.length" name="You receive">
        <InfoItemMultiValue>
          <EvmTokenAmountElement v-for="change in receiveChanges" :token="change.tokenActor.asToken"
            :amount="change.amount" />
        </InfoItemMultiValue>
      </InfoItem>
    </InfoItemList>
  </InfoCard>
</template>

<script>
import { defineComponent, ref, unref, watch } from "vue";
import InfoCard from "./InfoCard.vue";
import InfoItemList from "./InfoItemList.vue";
import InfoItemMultiValue from "./InfoItemMultiValue.vue";
import EvmTokenAmountElement from "./EvmTokenAmountElement.vue";
import InfoItem from "./InfoItem.vue";

export default defineComponent({
  name: "EvmTransactionPredictionCard",
  components: {
    InfoCard,
    InfoItemList,
    InfoItem,
    InfoItemMultiValue,
    EvmTokenAmountElement,
  },
  props: {
    title: String,
    tokenBalanceChanges: Object,
  },
  setup(props) {
    const sendChanges = ref([]);
    const receiveChanges = ref([]);

    watch(() => props.tokenBalanceChanges, (tokenBalanceChanges) => {
      const sendChangesValue = [];
      const receiveChangesValue = [];

      for (const change of tokenBalanceChanges) {
        if (unref(change.amount)) {
          (change.isPositive ? receiveChangesValue : sendChangesValue).push(change);
        }
      }

      sendChanges.value = sendChangesValue;
      receiveChanges.value = receiveChangesValue;
    }, { immediate: true, deep: true });

    return {
      sendChanges,
      receiveChanges,
    }
  }
});
</script>

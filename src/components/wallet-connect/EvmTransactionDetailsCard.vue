<template>
  <InfoCard :title="title">
    <InfoItemList>
      <InfoItem v-if="txRequest.from" name="Your account">
        <template v-if="!isCurrentAccount">
          <AnotherCardAccountElement />
          {{ '&nbsp;' }}
        </template>
        <EvmAddressWithChainElement :chainKey="chainKey" :address="txRequest.from" />
      </InfoItem>
      <InfoItem v-if="txParsed.to" name="Interacting with">
        <EvmActorElement :actor="txParsed.to" />
      </InfoItem>
      <InfoItem v-if="txParsed.method?.name" name="Method">{{ txParsed.method.name }}
      </InfoItem>
      <InfoItemRawData name="Transaction request" :data="txRequest" />
    </InfoItemList>
  </InfoCard>
</template>

<script>
import { defineComponent } from "vue";
import InfoCard from "./InfoCard.vue";
import InfoItemList from "./InfoItemList.vue";
import InfoItem from "./InfoItem.vue";
import InfoItemRawData from "./InfoItemRawData.vue";
import EvmActorElement from "./EvmActorElement.vue";
import EvmAddressWithChainElement from "./AddressWithChainElement.vue";
import AnotherCardAccountElement from "./AnotherCardAccountElement.vue";

export default defineComponent({
  name: "EvmTransactionCallDetailsCard",
  components: {
    InfoCard,
    InfoItemList,
    InfoItem,
    InfoItemRawData,
    EvmActorElement,
    EvmAddressWithChainElement,
    AnotherCardAccountElement,
  },
  props: {
    title: String,
    chainKey: String,
    txParsed: Object,
    txRequest: Object,
    isCurrentAccount: Boolean,
  },
});
</script>

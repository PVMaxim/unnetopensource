<template>
  <InfoCard :title="title">
    <InfoItemList>
      <InfoItem v-if="from" name="Your account">
        <template v-if="!isCurrentAccount">
          <AnotherCardAccountElement />
          {{ '&nbsp;' }}
        </template>
        <EvmAddressWithChainElement :chainKey="chainKey" :address="from" />
      </InfoItem>
      <InfoItem name="Primary type">{{ parsed.primaryType }}
      </InfoItem>
      <InfoItemRawData name="Message" :data="parsed.message" />
    </InfoItemList>
  </InfoCard>
</template>

<script>
import { defineComponent } from "vue";
import InfoCard from "./InfoCard.vue";
import InfoItemList from "./InfoItemList.vue";
import InfoItem from "./InfoItem.vue";
import InfoItemRawData from "./InfoItemRawData.vue";
import EvmAddressWithChainElement from "./AddressWithChainElement.vue";
import AnotherCardAccountElement from "./AnotherCardAccountElement.vue";

export default defineComponent({
  name: "EvmTypedDataDetailsCard",
  components: {
    InfoCard,
    InfoItemList,
    InfoItem,
    InfoItemRawData,
    EvmAddressWithChainElement,
    AnotherCardAccountElement
  },
  props: {
    title: String,
    chainKey: String,
    from: String,
    parsed: Object,
    isCurrentAccount: Boolean,
  },
});
</script>

<style lang="scss" scoped>
.message {
  overflow: auto;
  margin: 0px !important;
  padding: 6px;

  user-select: text !important;
  font-size: 12px;
  color: rgba($color-white, .5);

  border: 1px solid rgba(205, 205, 205, 0.04);
  border-radius: 16px;
  background: $color-black-light;
}
</style>
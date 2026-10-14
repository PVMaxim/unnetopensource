<template>
  <span class="address-with-chain-element">
    <span v-if="chainName" class="chain-icon">
      <component :is="getNetworkIcon(chainName)" class="icon"></component>
      {{ '&nbsp;' }}
    </span>
    <EvmActorElement :actor="{ address }" />
  </span>
</template>

<script>
import { defineComponent } from "vue";
import EvmActorElement from "./EvmActorElement.vue";
import { getNetworkIcon } from "@/api/sub-utils"
import { SUPPORTED_CHAINS } from "@/api/wallet-connect/wcNamespaces";

export default defineComponent({
  name: "AddressWithChainElement",
  components: {
    EvmActorElement,
  },
  props: {
    address: String,
    chainKey: String,
  },
  setup(props) {
    const chainName = SUPPORTED_CHAINS[props.chainKey]?.name ?? props.chainKey;
    return { chainName, getNetworkIcon };
  },
});
</script>

<style lang="scss" scoped>
.address-with-chain-element {
  overflow-wrap: anywhere;
}

.chain-icon {
  svg {
    width: 16px;
    height: 16px;
    display: inline-block;
    vertical-align: text-top;
  }

  margin: 0px;
  white-space: nowrap;
}
</style>
<template>
  <span class="address-with-chain-element">
    <span v-if="chainName" class="chain-icon">
      <component :is="getTokenIcon(chainName)" class="icon"></component>
      {{ '&nbsp;' }}
    </span>
    <EvmActorElement :actor="{ address }" />
  </span>
</template>

<script>
import { defineComponent } from "vue";
import EvmActorElement from "./EvmActorElement.vue";
import { EIP155_CHAINS } from "@/modules/wallet-connect/api/wcChains";
import { getTokenIcon } from "@/api/token-icons";

export default defineComponent({
  name: "EvmAddressWithChainElement",
  components: {
    EvmActorElement,
  },
  props: {
    address: String,
    chainKey: String,
  },
  setup(props) {
    const chainName = EIP155_CHAINS[props.chainKey]?.name ?? props.chainKey;
    return { chainName, getTokenIcon };
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
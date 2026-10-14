<template>
  <span v-if="!actor.asToken" class="actor-address">
    {{ shortifyAddress(actor.address) }}
  </span>
  <EvmTokenElement v-else :token="actor.asToken" />
</template>

<script>
import { defineComponent } from "vue";
import EvmTokenElement from "./EvmTokenElement.vue";


export default defineComponent({
  name: "EvmActorElement",
  components: {
    EvmTokenElement
  },
  props: {
    actor: Object,
  },
  setup() {
    const shortifyAddress = (address) => {
      const addrStr = typeof address === 'string' ? address : (address?.address || String(address || ''));
      if (!addrStr || addrStr === 'undefined' || addrStr === '[object Object]') {
        return "";
      }
      const prologueLength = 7;
      const epilogueLength = 5;
      const interlude = "...";
      if (addrStr.length <= prologueLength + interlude.length + epilogueLength) {
        return addrStr;
      }
      return addrStr.slice(0, prologueLength) + interlude + addrStr.slice(-epilogueLength);
    }
    return {
      shortifyAddress,
    }
  }
});
</script>

<style lang="scss" scoped>
.actor-address {
  font-size: 14px;
  font-weight: 400;
  color: $color-white;
  overflow-wrap: anywhere;
}
</style>
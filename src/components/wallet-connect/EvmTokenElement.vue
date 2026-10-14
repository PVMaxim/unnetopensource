<template>
  <span class="token-element">
    <span class="token-icon">
      <Avatar :border="false" :size="16" :imageSrc="token.iconUrl" :name="token.symbol" />
      {{ '&nbsp;' }}
    </span>

    <span class="token-symbol">
      {{ token.symbol.toUpperCase() }}
    </span>
  </span>
</template>

<script>
import { defineComponent } from "vue";
import Avatar from "vue3-avatar";

export default defineComponent({
  name: "EvmTokenElement",
  components: {
    Avatar,
  },
  props: {
    token: Object,
  },
});
</script>

<style lang="scss" scoped>
.token-element {
  overflow-wrap: anywhere;
}

.token-icon {
  div {
    display: inline-block;
    vertical-align: text-top;
    padding: 0px;
  }

  margin: 0px;
  white-space: nowrap;
}

.token-symbol {
  font-size: 14px;
  font-weight: 400;
  color: $color-white;
}
</style>
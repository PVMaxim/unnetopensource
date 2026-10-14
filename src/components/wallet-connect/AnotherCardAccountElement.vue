<template>
  <span class="another-card-account-element">Another card</span>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "AnotherCardAccountElement",
});
</script>

<style lang="scss" scoped>
.another-card-account-element {
  font-size: 14px;
  font-weight: 400;

  color: $color-black;
  background-color: yellow;
  padding: 0px 7px 0px 7px;
  border-radius: 20px;

  overflow-wrap: anywhere;
}
</style>
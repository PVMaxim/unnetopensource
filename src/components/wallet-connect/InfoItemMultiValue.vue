<template>
  <div class="info-item-multi-value">
    <slot></slot>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "InfoItemMultiValue",
});
</script>

<style lang="scss" scoped>
.info-item-multi-value {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
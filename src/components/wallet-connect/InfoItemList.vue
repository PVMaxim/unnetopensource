<template>
  <div class="info-item-list">
    <slot></slot>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "InfoItemList",
});
</script>

<style lang="scss" scoped>
.info-item-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
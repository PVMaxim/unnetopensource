<template>
  <div class="info-item">
    <div class="info-item-name">{{ name }}
    </div>
    <div class="info-item-value">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "InfoItem",
  props: {
    name: String,
  },
});
</script>

<style lang="scss" scoped>
.info-item {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 5px;
}

.info-item-name {
  font-size: 14px;
  font-weight: 400;
  color: rgba($color-white, .4);
}

.info-item-value {
  font-size: 14px;
  font-weight: 400;
  color: $color-white;
  text-align: right;
}
</style>
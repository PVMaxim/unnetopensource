<template>
  <div class="info-card">
    <div v-if="title" class="info-card-title">
      {{ title }}
    </div>
    <div class="info-card-content">
      <div v-if="$slots.legend" class="info-card-legend">
        <slot name="legend"></slot>
      </div>
      <div>
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "InfoCard",
  props: {
    title: String,
  },
});
</script>

<style lang="scss" scoped>
.info-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-card-title {
  width: 100%;
  text-align: left;
  font-size: 12px;
  font-weight: 500;
  color: rgba($color-white, .4);
}

.info-card-content {
  padding: 24px 16px;
  border-radius: 16px;
  border: 1px solid rgba(205, 205, 205, 0.04);
  border-radius: 16px;
  background: $color-black-23;

  display: flex;
  flex-direction: column;
  gap: 30px;
}

.info-card-legend {
  font-size: 14px;
  font-weight: 400;
  color: $color-white;
  text-align: left;
  overflow-wrap: anywhere;
}
</style>

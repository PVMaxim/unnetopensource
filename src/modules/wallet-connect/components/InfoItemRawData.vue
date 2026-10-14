<template>
  <div class="info-item-raw-data">
    <div class="name-row">
      <div class="name">{{ name }}
      </div>
      <div @click="toggleCollapsed">
        <svg :class="['expand-arrow', { collapsed }]" width="11" height="7" viewBox="0 0 11 7" fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M10 0.666992L5.33333 5.33366L0.666667 0.666992" stroke="white" stroke-opacity="0.4" />
        </svg>
      </div>
    </div>
    <pre v-if="!collapsed" class="raw-data">{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>

<script>
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "InfoItemRawData",
  props: {
    name: String,
    data: Object,
  },
  setup() {
    const collapsed = ref(true);

    const toggleCollapsed = () => {
      collapsed.value = !collapsed.value;
    }

    return {
      collapsed, toggleCollapsed
    }
  }
});
</script>

<style lang="scss" scoped>
.info-item-raw-data {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.name-row {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 5px;
}

.name {
  font-size: 14px;
  font-weight: 400;
  color: rgba($color-white, .4);
}

.expand-arrow.collapsed {
  transition: Rotate 0.5s;
  transform: rotate(180deg);
}

.raw-data {
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
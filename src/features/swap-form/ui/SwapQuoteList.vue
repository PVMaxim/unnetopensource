<template>
  <div class="results" v-if="quoteServicesList?.length > 0">
    <div
      v-for="result in quoteServicesList"
      :key="result.service"
      class="result-item"
      :class="{
        'active-item': result.isSelected,
        'result-item--disabled': !result.isSelectable,
      }"
      :role="result.isSelectable ? 'button' : 'presentation'"
      :tabindex="result.isSelectable ? 0 : -1"
      @click="selectService(result)"
      @keydown.enter.prevent="selectService(result)"
    >
      <span class="swap-bottom-text">{{ result.service }}</span>
      <span class="swap-bottom-text">{{ result.amount }}</span>
      <span class="swap-bottom-text">{{ result.minAmount }}</span>
      <span class="swap-bottom-text">{{ result.maxAmount }}</span>
    </div>
  </div>
</template>

<script setup>
import { useStore } from "vuex";
import { useSwapFormState } from "@/features/swap-form/model/useSwapFormState";

const store = useStore();
const { quoteServicesList } = useSwapFormState();

const selectService = (result) => {
  if (!result?.isSelectable) return;
  store.dispatch("swap/selectQuoteService", result.service);
};
</script>

<style scoped lang="scss">
.results {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.result-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  margin-bottom: 4px;
  border-radius: 10px;
  border: 2px solid transparent;
  box-sizing: border-box;
  cursor: pointer;
  outline: none;

  .swap-bottom-text {
    font-size: 12px;
    color: $color-gray;
    min-width: 25%;
  }

  &:focus-visible {
    border-color: color-mix(in srgb, $color-orange 70%, transparent);
  }
}

.result-item--disabled {
  cursor: not-allowed;
  pointer-events: none;
  opacity: 0.45;

  .swap-bottom-text {
    color: $color-gray;
  }
}

.active-item {
  border-color: $color-orange;

  .swap-bottom-text {
    font-size: 12px;
    color: $color-white;
  }
}

.active-item.result-item--disabled {
  border-color: transparent;
}
</style>

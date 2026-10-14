<template>
  <div class="buttons-group">
    <button
      class="button-main"
      :disabled="isActionButtonDisabled"
      :class="{ loading: isQuoteLoading }"
      @click="handleClick"
    >
      <span v-if="!isQuoteLoading">{{ actionButtonText }}</span>
      <Loading v-else size="30" borderWidth="5" />
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Loading from "@/components/Loading.vue";
import { useSwapFormState } from "@/features/swap-form/model/useSwapFormState";

const { t } = useI18n();

const {
  fromProvider,
  toProvider,
  fromAmount,
  toAmount,
  fromToken,
  toToken,
  isLoading,
  quoteData,
  inputError,
  isQuoteLoading,
  isNeedApprove,
  isNeedIncreaseTrustLimit,
} = useSwapFormState();

const emit = defineEmits(["approve", "openModal"]);

const actionButtonText = computed(() => {
  if (isNeedApprove.value) {
    return t("swap.action.approve", {
      amount: fromAmount.value,
      symbol: fromToken.value?.symbol,
    });
  }
  if (isNeedIncreaseTrustLimit.value) {
    return t("swap.action.increaseTrustLimit", {
      symbol: toToken.value?.symbol,
    });
  }
  return t("swap.action.continue");
});

const handleClick = () => {
  if (isActionButtonDisabled.value) return;
  if (isNeedApprove.value || isNeedIncreaseTrustLimit.value) {
    emit("approve");
  } else {
    emit("openModal");
  }
};

const isActionButtonDisabled = computed(() => {
  if (isQuoteLoading.value || isLoading.value) return true;
  if (!fromProvider.value || !toProvider.value) return true;
  if (!fromToken.value || !toToken.value) return true;

  const numAmount = Number(fromAmount.value);
  if (!fromAmount.value || isNaN(numAmount) || numAmount <= 0) return true;
  if (!!inputError.value) return true;
  if (!toAmount.value || Number(toAmount.value) <= 0) return true;
  if (!quoteData.value) return true;

  if (
    fromProvider.value?.swapChain === toProvider.value?.swapChain &&
    fromToken.value?.address?.toLowerCase() ===
      toToken.value?.address?.toLowerCase()
  ) {
    return true;
  }

  return false;
});
</script>

<style scoped lang="scss">
.buttons-group {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 16px;

  .button-main {
    width: 100%;
    max-width: none;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: $color-orange;
    color: $color-black-17;
    border-radius: 12px;
    border: none;
    font-family: 'Inter Tight';
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;

    &:disabled,
    &[disabled] {
      cursor: not-allowed;
      background-color: $color-orange-disable;
    }
  }
}
</style>

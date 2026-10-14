<template>
  <div class="form-main">
    <SwapLoader v-if="isLoading" />
    <PinCode
      v-else-if="pinState"
      :title="$t('pin.enterPin')"
      v-model="pinPre"
      :error="null"
      :buttonClick="null"
      :useStorePinCode="true"
      @isStore="storePinHandler($event.value)"
      @cancelButton="pinCancelButton($event.value)"
      @change="updatePin($event.value)"
      v-model:numberOfDigits="pinLength"
      @changePinLength="changePinLength()"
    />
    <div class="content" v-else>
      <div class="swap-panels-box">
        <div class="swap-panels">
          <div class="swap-token-panel">
            <div class="main-block" v-if="fromProvider">
              <SelectNetwork
                :provider="fromProvider"
                :setProvider="handleSetFromProvider"
              />
              <div class="swap-input-block" v-if="fromToken">
                <InputDigits
                  inputId="fromAmount"
                  inputClass="swap-input"
                  v-model="fromAmount"
                  placeholder="0.00"
                  min="0"
                  max="1000000"
                  step="0.0000000000000001"
                  @input="fromAmountInputHandler"
                />
                <SelectToken
                  :token="fromToken"
                  :provider="fromProvider"
                  :setToken="handleSetFromToken"
                  title="From"
                />
              </div>
              <p class="error-deposit" v-if="inputError">
                {{ inputError }}
              </p>
              <SwapTokenBalance
                v-if="fromToken"
                :token="fromToken"
                :amount="fromAmount"
                :click="setFromValueMaxBalance"
              />
            </div>
          </div>
          <swapIcon customClass="swap-icon" @click="replaceTokens" />
          <div class="swap-token-panel">
            <div class="main-block" v-if="toProvider">
              <SelectNetwork
                :provider="toProvider"
                :setProvider="handleSetToProvider"
              />
              <div class="swap-input-block" v-if="toToken">
                <input
                  class="swap-input"
                  type="text"
                  disabled
                  :value="formatApproximateAmount(toAmount)"
                  placeholder="0.00"
                />
                <SelectToken
                  :token="toToken"
                  :provider="toProvider"
                  :setToken="handleSetToToken"
                  title="To"
                  :disabledToken="fromToken"
                />
              </div>
              <SwapTokenBalance
                v-if="toToken"
                :token="toToken"
                :amount="toAmount"
              />
            </div>
            <Rate />
            <SwapQuoteList />
          </div>
        </div>
        <Slippage v-model="slippage" />
      </div>
      <SwapActionButton @approve="checkPin" @openModal="openModal" />
    </div>
  </div>
  <SwapConfirmModal :confirm="checkPin" />
  <SuccessSwapModal />
  <SwapTransactionErrorModal
    :isOpen="isOpenTransactionErrorModal"
    :close="closeTransactionErrorModal"
  />
  <OneInchCrossChainModalVue :nfcHandlerWindow="nfcHandlerWindow" />
  <NFCHandlerWindow
    ref="nfcHandlerWindow"
    :title="$t('nfcHandler.touchYourCard')"
    :subTitle="$t('nfcHandler.holdYourCard')"
    v-model:isActive="nfcIsActive"
    @onCancel="pinPre = null"
  />
</template>

<script setup>
import { onMounted, onErrorCaptured, onUnmounted, watch } from "vue";
import SelectNetwork from "@/components/SelectNetwork.vue";
import SelectToken from "../components/SelectToken.vue";
import swapIcon from "@/components/svg/swapIcon.vue";
import Button from "@/components/Button.vue";
import infoIcon from "@/components/svg/infoIcon.vue";
import Slippage from "@/components/Slippage.vue";
import SwapConfirmModal from "@/components/SwapConfirmModal.vue";
import SuccessSwapModal from "@/components/SuccessSwapModal.vue";
import SwapTransactionErrorModal from "@/components/SwapTransactionErrorModal.vue";
import SwapErrorModal from "./SwapErrorModal.vue";
import PinCode from "@/components/PinCode.vue";
import SwapTokenBalance from "@/components/SwapTokenBalance.vue";
import NFCHandlerWindow from "@/components/NFCHandlerWindow.vue";
import SwapLoader from "./SwapLoader.vue";
import InputDigits from "@/components/InputDigits.vue";
import OneInchCrossChainModalVue from "./swap/OneInchCrossChainModal.vue";
import Rate from "./swap/Rate.vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import {
  isOpenTransactionErrorModal,
  openTransactionErrorModal,
  closeTransactionErrorModal,
} from "@/utils/modalHandlers";
import { useDebounceFn } from "../plugins/utils/useDebounceFn";
import { validateSwapInput } from "../api/swap/utils/validate";
import { formatApproximateAmount } from "../api/swap/utils/formatting";
import { getErrorMessage } from "@/api/sub-utils";
import { useSwapFormState } from "@/features/swap-form/model/useSwapFormState";
import { useSwapPin } from "@/features/swap-form/model/useSwapPin";
import { useSwapSigner } from "@/features/swap-form/model/useSwapSigner";
import { useSwapActions } from "@/features/swap-form/model/useSwapActions";
import SwapQuoteList from "@/features/swap-form/ui/SwapQuoteList.vue";
import SwapActionButton from "@/features/swap-form/ui/SwapActionButton.vue";

defineOptions({ name: "Swap Form", layout: "Dashboard" });

const store = useStore();
const { t } = useI18n();
const router = useRouter();

const {
  fromProvider,
  toProvider,
  fromAmount,
  toAmount,
  fromToken,
  toToken,
  isLoading,
  isError,
  quoteData,
  inputError,
  isQuoteLoading,
  isNeedApprove,
  isNeedIncreaseTrustLimit,
  quoteServicesList,
  pinLength,
  publicKeyCard,
  accountAddress,
} = useSwapFormState();

const {
  pinState,
  pinPre,
  changePinLength,
  storePinHandler,
  pinCancelButton,
  clearPin,
  updatePin,
  checkPin,
} = useSwapPin(pinLength, () => submitApproveOrSwap());

const { nfcHandlerWindow, nfcIsActive, signTransaction } = useSwapSigner(pinPre);

const {
  slippage,
  comission,
  comissionInUsd,
  approveToken,
  confirmSwap,
  increaseTrustLimit,
  setFromValueMaxBalance,
  openModal,
} = useSwapActions({ signTransaction, clearPin });

const submitApproveOrSwap = async () => {
  if (isNeedIncreaseTrustLimit.value) {
    await increaseTrustLimit();
  } else if (isNeedApprove.value) {
    await approveToken();
  } else {
    await confirmSwap();
  }
};

const debouncedGetQuote = useDebounceFn(async () => {
  await store.dispatch("swap/getQuote");
}, 500);

const resetQuoteResults = () => {
  store.dispatch("swap/setToAmount", undefined);
  store.dispatch("swap/resetQuoteData");
};

const handleSetFromToken = (token) => {
  store.dispatch("swap/setFromToken", token);
  store.dispatch("swap/setFromAmount", "");
  resetQuoteResults();
};

const handleSetFromProvider = (provider) => {
  store.dispatch("swap/setFromProvider", provider);
  store.dispatch("swap/setFromAmount", "");
  resetQuoteResults();
};

const handleSetToProvider = (provider) => {
  store.dispatch("swap/setToProvider", provider);
  store.dispatch("swap/setFromAmount", "");
  resetQuoteResults();
};

const handleSetToToken = (token) => {
  store.dispatch("swap/setToToken", token);
  if (fromAmount.value) {
    store.dispatch("swap/setToAmount", undefined);
    store.dispatch("swap/getQuote");
  }
};

const replaceTokens = () => {
  store.dispatch("swap/replaceProviders");
  store.dispatch("swap/setToAmount", undefined);
  if (fromAmount.value > 0) store.dispatch("swap/getQuote");
  store.dispatch("swap/resetQuoteData");
};

const fromAmountInputHandler = (event) => {
  store.dispatch("swap/setInputError", null);
  if (validateSwapInput(event.target.value)) {
    store.dispatch("swap/setFromAmount", event.target.value);
  } else {
    store.dispatch("swap/setFromAmount", "");
    event.target.value = "";
  }
};

onMounted(async () => {
  if (
    !publicKeyCard.value ||
    !accountAddress.value ||
    publicKeyCard.value.ed25519 ===
      "0000000000000000000000000000000000000000000000000000000000000000"
  ) {
    router.push({ name: "authorization" });
  }
  await store.dispatch("swap/initializeStore", store.state.settings.rpcProvider);
});

watch(
  () => store.state.settings.rpcProvider,
  (newProvider) => {
    store.dispatch("swap/setFromProvider", newProvider);
    if (fromAmount.value && fromAmount.value > 0) {
      store.dispatch("swap/getQuote");
    }
  }
);

onUnmounted(() => {
  store.dispatch("swap/autoReload/stopAutoReload");
  store.dispatch("swap/resetQuoteData");
});

watch(fromAmount, () => debouncedGetQuote());

onErrorCaptured(async (err) => {
  const { title, message } = await getErrorMessage(err);
  store.dispatch("swap/setError", {
    title: title ?? err.message,
    message: message ?? t("swap.action.pressOk"),
  });
  return false;
});
</script>

<style scoped lang="scss">
.content {
  padding-bottom: 28px;
  width: 100%;
  height: calc(100% + 230px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;

  .panel {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .swap-panels {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .swap-token-panel {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: start;
    background: #1f1f1f;
    border: 1px solid #cdcdcd0a;
    border-radius: 16px;
    box-sizing: border-box;
  }

  .swap-input-block {
    margin-top: 3vh;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;

    div {
      padding: 0;
    }
  }
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
  }

  .main-block {
    padding: 16px;
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
  }

  .info-red {
    color: $color-red;
  }

  .info-white {
    color: $color-white;
  }

  .swap-icon {
    margin-top: -20px;
    margin-bottom: -20px;
    z-index: 1;
  }

  .error-deposit {
    margin-top: 8px;
    color: $color-red;
    font-size: 12px;
  }
}

.form-main {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

:deep(.keyboard-wrap) {
  height: 100% !important;
}
:deep(.security-code-wrap) {
  height: 100% !important;
}
:deep(.security-code-container) {
  height: 100% !important;
}
</style>

<style lang="scss">
.swap-input {
  padding: 0 !important;
  width: 70%;
  background: transparent;
  font-family: 'Inter Tight';
  border: none !important;
  font-size: 28px;
  color: $color-white;

  &:focus,
  &:valid {
    background-color: rgba(255, 255, 255, 0) !important;
  }
}
</style>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="backdrop">
      <div class="options" v-if="isOpen">
        <div class="icon-wrapper">
          <successSwapIcon class="icon" />
        </div>
        <h3 class="title">Transaction in progress</h3>
        <p class="subtitle">You'll receive</p>
        <div class="info" v-if="typeof data === 'object' && data?.token">
          <SwapTokenIcon
            :token="data.token"
            iconClass="success-swap-token-icon"
          />
          <img
            v-if="tokenIcon"
            :src="tokenIcon"
            class="success-token-icon"
            loading="lazy"
          />
          <span class="info-amount">{{ formatAmount(data.amount) }}</span>

          <span class="info-token-symbol">{{ data.token.symbol }}</span>
        </div>
        <span
          class="warning-text"
          v-if="data.dexName === SWAP_SERVICES.OneInchFusionPlus"
          >Please, do not close the main page until the transaction is completed
          successfully.</span
        >
        <div class="buttons">
          <button class="ok-button" @click="closeAndSwitchToHistory">
            View history
          </button>
          <button class="close-button" @click="closeModal">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import successSwapIcon from "@/components/svg/successSwapIcon.vue";
import { useStore } from "vuex";
import { computed, ref, watch } from "vue";
import SwapTokenIcon from "./SwapTokenIcon.vue";
import { formatAmount } from "../api/swap/utils/formatting";
import { SWAP_SERVICES } from "../api/constants-types";
export default {
  name: "SuccessSwapModal",
  components: {
    successSwapIcon,
    SwapTokenIcon,
  },
  setup() {
    const store = useStore();
    const isOpen = computed(() => store.state.swap.isOpenSuccessModal);
    const data = computed(() => store.state.swap.successSwapData);

    const closeModal = () => {
      store.dispatch("swap/closeSuccessSwapModal");
    };

    const closeAndSwitchToHistory = () => {
      store.dispatch("swap/closeSuccessSwapModalAndOpenHistory");
    };

    return {
      isOpen,
      closeModal,
      data,
      closeAndSwitchToHistory,
      formatAmount,
      SWAP_SERVICES,
    };
  },
};
</script>

<style scoped lang="scss">
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
}

.options {
  padding: 12px 16px;
  position: absolute;
  width: 90%;
  max-width: 620px;
  left: calc(50% - 310px);
  box-sizing: border-box;
  background: rgba(23, 23, 23, 1);
  border-radius: 24px;
  z-index: 103;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
}

.modal-header {
  display: flex;
  justify-content: end;
  align-items: center;
  width: 100%;

  svg {
    cursor: pointer;
    width: 18px;
    height: 18px;

    stroke: rgba(255, 152, 0, 1);
  }
}

.icon-wrapper {
  margin-top: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #fca100 0%, #fd7b00 100%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
}

.title {
  margin-top: 10px;
  margin-bottom: 0;
  font-size: 24px;
  font-weight: 500;
  font-family: 'Inter Tight';
  color: $color-white;
}

.subtitle {
  margin-top: 6px;
  margin-bottom: 0;
  font-size: 16px;
  font-weight: 500;
  font-family: 'Inter Tight';
  color: $color-gray;
}

.info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.info-amount {
  font-size: 20px;
  font-weight: 500;
  color: $color-white;
}

.info-token-symbol {
  font-size: 20px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
}

.warning-text {
  font-size: 12px;
  font-weight: 400;
  color: $color-red;
  text-align: center;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.ok-button {
  margin-top: 20px;
  padding: 16px 16px;
  background: $color-orange;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'Inter Tight';
  font-weight: 600;
  width: 100%;
  color: $color-black;
  border: none;
}

.close-button {
  padding: 16px 16px;
  background: transparent;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'Inter Tight';
  font-weight: 600;
  width: 100%;
  color: $color-orange;
  border: none;
}

@media (max-width: 690px) {
  .options {
    left: 32px;
    right: 32px;
    width: calc(100% - 64px);
  }
}
</style>

<style lang="scss">
.success-swap-token-icon {
  width: 24px;
  height: 24px;
}
</style>

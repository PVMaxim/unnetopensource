<template>
  <Teleport to="body">
    <div class="backdrop" v-if="isOpenConfirmModal">
      <div class="swap-confirm-modal-content" v-if="confirmModalData">
        <close-icon
          @click="closeConfirmModal"
          class="swap-confirm-modal-close-icon"
        />
        <h3 class="swap-confirm-modal-title">
          {{ confirmModalData.fromToken.symbol }} to
          {{ confirmModalData.toToken.symbol }} swap confirmation
        </h3>
        <div class="swap-confirm-modal-icons">
          <SwapTokenIcon
            :token="confirmModalData.fromToken"
            iconClass="swap-confirm-modal-token-icon"
          />

          <div class="swap-confirm-modal-icons-devider"></div>
          <div class="swap-confirm-modal-arrow-icon-wrapper">
            <swapArrowIcon />
          </div>
          <div class="swap-confirm-modal-icons-devider"></div>
          <SwapTokenIcon
            :token="confirmModalData.toToken"
            iconClass="swap-confirm-modal-token-icon"
          />
        </div>
        <div class="swap-confirm-modal-info">
          <div class="swap-confirm-modal-info-item">
            <span class="swap-confirm-modal-info-item-title">Exchange</span>
            <div class="swap-confirm-modal-info-values">
              <div class="swap-confirm-modal-main-info-titles">
                <SwapTokenIcon
                  :token="confirmModalData.fromToken"
                  iconClass="swap-confirm-modal-main-info-icon"
                />

                <span class="swap-confirm-modal-info-values-title"
                  >{{ confirmModalData.fromAmount }}
                  {{ confirmModalData.fromToken.symbol }}</span
                >
              </div>
              <span class="swap-confirm-modal-info-value-desc"
                >≈ ${{ confirmModalData.fromAmountInUsd }}</span
              >
            </div>
          </div>
          <div class="swap-confirm-modal-info-item">
            <span class="swap-confirm-modal-info-item-title"
              >Min. amount to receive</span
            >
            <div class="swap-confirm-modal-info-values">
              <div class="swap-confirm-modal-main-info-titles">
                <SwapTokenIcon
                  :token="confirmModalData.toToken"
                  iconClass="swap-confirm-modal-main-info-icon"
                />
                <span class="swap-confirm-modal-info-values-title"
                  >{{ formatAmount(confirmModalData.toAmount) }}
                  {{ confirmModalData.toToken.symbol }}</span
                >
              </div>
              <span class="swap-confirm-modal-info-value-desc"
                >≈ ${{ confirmModalData.toAmountInUsd }}</span
              >
            </div>
          </div>
          <div class="swap-confirm-modal-info-item">
            <span class="swap-confirm-modal-info-item-title"
              >Exchange provider:</span
            >
            <span class="swap-confirm-modal-info-item-desc">{{
              confirmModalData.serviceName
            }}</span>
          </div>
          <div
            v-if="confirmModalData.serviceName === SWAP_SERVICES.Changelly"
            class="swap-confirm-modal-info-item"
          >
            <span class="swap-confirm-modal-info-item-warn">
              The transaction may trigger KYC/AML verification by Changelly.
            </span>
          </div>
        </div>
        <div
          class="swap-confirm-modal-more-details"
          v-if="confirmModalData.networkCommissionData"
        >
          <div class="swap-confirm-modal-more-details-titles">
            <span class="swap-confirm-modal-more-details-title"
              >More details</span
            >
            <svg
              @click="toggleCollapseMoreDetails"
              :class="[
                'swap-confirm-modal-more-details-arrow',
                {
                  collapsed: isCollapsedMoreDetails,
                },
              ]"
              width="11"
              height="7"
              viewBox="0 0 11 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 0.666992L5.33333 5.33366L0.666667 0.666992"
                stroke="white"
                stroke-opacity="0.4"
              />
            </svg>
          </div>
          <div
            :class="[
              'swap-confirm-modal-details-info',
              { collapsed: isCollapsedMoreDetails },
            ]"
          >
            <div class="swap-confirm-modal-info-item">
              <span class="swap-confirm-modal-info-item-title"
                >Network commission +</span
              >
              <div class="swap-confirm-modal-info-values">
                <span class="swap-confirm-modal-info-values-title"
                  >{{ confirmModalData.networkCommissionData.comission }}
                  {{ confirmModalData.networkCommissionData.tokenSymbol }}</span
                >
                <span class="swap-confirm-modal-info-value-desc"
                  >≈ ${{
                    confirmModalData.networkCommissionData.comissionInUsd
                  }}</span
                >
              </div>
            </div>
          </div>
        </div>
        <Button
          buttonName="Confirm"
          @click="confirm"
          class="swap-confirm-modal-confirm-button"
        ></Button>
      </div>
    </div>
  </Teleport>
</template>

<script>
import closeIcon from "@/components/svg/closeIcon.vue";
import swapArrowIcon from "@/components/svg/swapArrowIcon.vue";
import Button from "@/components/Button.vue";
import {
  isOpenConfirmModal,
  closeConfirmModal,
  confirmModalData,
} from "@/utils/modalHandlers";
import { ref } from "vue";
import SwapTokenIcon from "./SwapTokenIcon.vue";
import { formatAmount } from "../api/swap/utils/formatting";
import { SWAP_SERVICES } from "../api/constants-types";
export default {
  name: "SwapConfirmModal",
  components: {
    closeIcon,
    swapArrowIcon,
    Button,
    SwapTokenIcon,
  },
  props: {
    confirm: {
      type: Function,
      default: () => {},
    },
  },
  setup(_) {
    const isCollapsedMoreDetails = ref(false);
    const fromTokenIcon = ref(null);
    const toTokenIcon = ref(null);

    const toggleCollapseMoreDetails = () => {
      isCollapsedMoreDetails.value = !isCollapsedMoreDetails.value;
    };

    return {
      isOpenConfirmModal,
      closeConfirmModal,
      isCollapsedMoreDetails,
      toggleCollapseMoreDetails,
      confirmModalData,
      fromTokenIcon,
      toTokenIcon,
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
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swap-confirm-modal-content {
  width: 100%;
  height: 100%;
  max-width: 620px;
  background: $color-black;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.swap-confirm-modal-close-icon {
  cursor: pointer;
  width: 24px;
  height: 24px;
  stroke: rgba(255, 152, 0, 1);
}

.swap-confirm-modal-title {
  margin: 35px 0 0;
  font-size: 20px;
  font-weight: 500;
  font-family: 'Inter Tight';
  color: $color-white;
}
.swap-confirm-modal-icons {
  margin-top: 32px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgba(205, 205, 205, 0.04);
  border-radius: 16px;
  background: rgba(23, 23, 23, 1);
}

.swap-confirm-modal-arrow-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.swap-confirm-modal-icons-devider {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.swap-confirm-modal-info {
  margin-top: 20px;
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid rgba(205, 205, 205, 0.04);
  border-radius: 16px;
  background: rgba(23, 23, 23, 1);
}

.swap-confirm-modal-info-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 5px;
}

.swap-confirm-modal-info-item-title {
  font-family: 'Inter Tight';
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
}

.swap-confirm-modal-info-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.swap-confirm-modal-main-info-titles {
  display: flex;
  align-items: center;
  gap: 6px;
}

.swap-confirm-modal-info-values-title {
  font-size: 14px;
}

.swap-confirm-modal-info-value-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.swap-confirm-modal-info-item-warn {
  font-size: 12px;
  color: $color-orange;
  margin-top: 8px;
  width: 100%;
  text-align: center;
}

.swap-confirm-modal-info-price {
  font-size: 14px;
  color: $color-red;
}

.swap-confirm-modal-more-details {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
}

.swap-confirm-modal-more-details-titles {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.swap-confirm-modal-more-details-title {
  font-family: 'Inter Tight';
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.swap-confirm-modal-details-info {
  margin-top: 8px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid rgba(205, 205, 205, 0.04);
  border-radius: 16px;
  background: rgba(23, 23, 23, 1);
}
.swap-confirm-modal-details-info.collapsed {
  max-height: 0;
  padding: 0;
  overflow: hidden;
  border: none;
}

.swap-confirm-modal-more-details-arrow.collapsed {
  transition: Rotate 0.5s;
  transform: rotate(180deg);
}

.swap-confirm-modal-confirm-button {
  margin-top: 24px;
  width: 100%;
  border-radius: 12px;
  font-family: 'Inter Tight';
  color: $color-black;
  font-size: 14px;
}
</style>
<style lang="scss">
.swap-confirm-modal-main-info-icon {
  width: 16px;
  height: 16px;
}
.swap-confirm-modal-token-icon {
  width: 48px;
  height: 48px;
}
</style>

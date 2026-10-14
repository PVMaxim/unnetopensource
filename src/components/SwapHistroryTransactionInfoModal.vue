<template>
  <Teleport to="body">
    <div v-if="isOpen" class="backdrop">
      <div class="info-modal-content" v-if="isOpen">
        <div class="info-modal-header">
          <h3>Transaction info</h3>
          <CloseIcon @click="close" />
        </div>
        <div class="info-modal-content-item">
          <span class="info-modal-content-label">Swap provider</span>
          <span class="info-modal-content-value">{{
            transaction.provider
          }}</span>
        </div>
        <div class="info-modal-content-item">
          <span class="info-modal-content-label">Transaction ID:</span>
          <div class="info-modal-conten-id-wrapper">
            <span class="info-modal-content-id">{{ transaction.id }}</span
            ><button class="button-clipboard" @click.prevent="copyToClip">
              <CopyIcon
                class="copy-icon-animation"
                :class="{ active: copied }"
              />
              <svg
                class="success-icon-animation"
                :class="{ active: copied }"
                viewBox="0 0 16 16"
              >
                <path d="M13.25 4.75L6 12L2.75 8.75"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="info-modal-content-item">
          <span class="info-modal-content-label">Transaction link:</span>
          <a
            class="info-modal-content-transaction-link"
            :href="transaction.depositHashExplore"
            target="_blank"
            >{{ transaction.depositHashExplore }}
          </a>
        </div>
        <div
          class="info-modal-content-item"
          v-if="SWAP_SERVICES_EMAILS[transaction.provider]"
        >
          <span class="info-modal-content-label">Support:</span>
          <a
            class="info-modal-mail"
            :href="`mailto:${SWAP_SERVICES_EMAILS[transaction.provider]}`"
            >{{ SWAP_SERVICES_EMAILS[transaction.provider] }}</a
          >
        </div>

        <div class="warn-modal-bottom">
          <input
            id="card-address"
            ref="cardAddress"
            type="text"
            :value="transaction.id"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import CloseIcon from "@/components/svg/closeIcon.vue";
import CopyIcon from "@/components/svg/copyIcon.vue";
import { ref } from "vue";
import { SWAP_SERVICES_EMAILS } from "../api/swap/constants";
export default {
  name: "SwapHistoryTransactionInfoModal",
  components: {
    CloseIcon,
    CopyIcon,
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    close: {
      type: Function,
      required: true,
    },
    transaction: {
      type: Object,
      default: () => ({}),
    },
  },
  setup() {
    const cardAddress = ref(null);
    const copied = ref(false);
    const copyToClip = () => {
      navigator.clipboard.writeText(cardAddress.value.value);
      if (cardAddress.value.value.length > 0) {
        copied.value = true;
        setTimeout(() => (copied.value = false), 2000);
      }
    };

    return {
      cardAddress,
      copyToClip,
      copied,
      SWAP_SERVICES_EMAILS,
    };
  },
};
</script>

<style lang="scss" scoped>
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
.info-modal-content {
  padding: 25px 16px;
  position: absolute;
  width: 80%;
  max-width: 620px;
  box-sizing: border-box;
  background: #262626;
  border-radius: 24px;
  z-index: 103;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
  }

  svg {
    margin-left: auto;
    cursor: pointer;
    width: 18px;
    height: 18px;

    stroke: rgba(255, 152, 0, 1);
  }
}

.info-modal-content-item {
  display: flex;
  justify-content: space-between;
  gap: 4px;

  .info-modal-content-label {
    color: $color-gray;
    font-size: 14px;
  }

  .info-modal-content-value {
    color: $color-white;
    font-size: 14px;
  }

  .info-modal-content-id {
    display: inline-block;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
  }

  .info-modal-conten-id-wrapper {
    display: flex;
    gap: 5px;
  }

  .info-modal-content-transaction-link {
    display: inline-block;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: $color-orange;
    font-size: 14px;
  }
  .info-modal-mail {
    color: $color-yellow;
    text-decoration: none;
  }
}

.warn-modal-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
}

#card-address {
  display: none;
}

.card-address {
  color: $color-orange;
  margin: 0 7px;
}

.warn-modal-text {
  margin: 0;
}

.button-clipboard {
  width: initial;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0);
  color: rgb(255, 255, 255);
  border-radius: 0px;
  overflow: hidden;
  border: none;
  padding: 9px;
  position: relative;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  height: 18px;

  svg {
    width: 18px;
    height: 18px;

    &.copy-icon-animation {
      position: absolute;
      top: 0;
      left: 0;
      stroke-dasharray: 50;
      stroke-dashoffset: revert-layer;
      -webkit-transition: all 300ms ease-in-out;
      transition: all 300ms ease-in-out;
      fill: $color-orange;

      &.active {
        fill: none;
      }
    }

    &.success-icon-animation {
      position: absolute;
      top: 0;
      left: 0;
      stroke-dasharray: 50;
      stroke-dashoffset: -50;
      -webkit-transition: all 300ms ease-in-out;
      transition: all 300ms ease-in-out;
      fill: none;
      stroke: #28a745;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;

      &.active {
        stroke-dashoffset: 0;
      }
    }
  }
}
</style>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="backdrop">
      <div class="warn-modal-content" v-if="isOpen">
        <div class="warn-modal-header">
            <h3>Action needed</h3>
            <CloseIcon @click="close" /></div>
        <p class="warn-modal-text">
          The swap has been performed by our 3rd party partner Changelly. In
          order to proceed with the transaction please contact Changelly
          security team at
          <a class="warn-modal-mail" href="mailto:compliance@changelly.com"
            >compliance@changelly.com</a
          >
          in order to pass the KYC procedure. After the issue has been solved
          your transaction will be completed.
        </p>
        <div class="warn-modal-bottom">
          <p class="warn-modal-text">Your transaction ID - {{ selectedId }}</p>
          <button class="button-clipboard" @click.prevent="copyToClip">
            <CopyIcon class="copy-icon-animation" :class="{ active: copied }" />
            <svg
              class="success-icon-animation"
              :class="{ active: copied }"
              viewBox="0 0 16 16"
            >
              <path d="M13.25 4.75L6 12L2.75 8.75"></path>
            </svg>
          </button>
          <input
            id="card-address"
            ref="cardAddress"
            type="text"
            :value="selectedId"
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
export default {
  name: "SwapHistoryWarnModal",
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
    selectedId: {
      type: String,
      default: "",
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
.warn-modal-content {
  padding: 25px 16px;
  position: absolute;
  width: 90%;
  max-width: 620px;
  box-sizing: border-box;
  background: #262626;
  border-radius: 24px;
  z-index: 103;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warn-modal-header {
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

.warn-modal-mail {
  color: $color-yellow;
  text-decoration: none;
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

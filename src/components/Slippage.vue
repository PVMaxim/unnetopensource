<template>
  <div
    class="slippage-block"
    @click="toggleSlippageModal"
  >
    <span class="slippage-block-title">Maximum slip</span>
    <span class="slippage-block-info">{{ modelValue }} %
      <moreIcon />
    </span>
  </div>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="backdrop"
    >
      <div
        class="options"
        v-if="isOpen"
      >
        <div class="slippage-modal-header">
          <h3>Maximum slip</h3>
          <closeIcon @click="toggleSlippageModal" />
        </div>
        <div class="slippage-modal-input-wrapper">
          <input
            class="slippage-modal-input"
            type="number"
            :value="modalSlippage"
            @input="onChangeModalSlippage"
            placeholder="Enter Slippage"
          />
          <span>%</span>
        </div>
        <div class="slippage-modal-buttons">
          <button
            class="slippage-modal-button"
            :class="{ active: modalSlippage === 0.1 }"
            @click="setModalSlippage(0.1)"
          >
            0.1%
          </button>
          <button
            class="slippage-modal-button"
            :class="{ active: modalSlippage === 0.5 }"
            @click="setModalSlippage(0.5)"
          >
            0.5%
          </button>
          <button
            class="slippage-modal-button"
            :class="{ active: modalSlippage === 2 }"
            @click="setModalSlippage(2)"
          >
            2%
          </button>
          <button
            class="slippage-modal-button"
            :class="{ active: modalSlippage === 5 }"
            @click="setModalSlippage(5)"
          >
            5%
          </button>
        </div>
        <button
          class="slippage-modal-apply-button"
          @click="apllySlippage"
          :disabled="!modalSlippage"
        >Apply</button>
      </div>
    </div>
  </Teleport>
</template>

<script>
import moreIcon from "@/components/svg/moreIcon.vue";
import closeIcon from "@/components/svg/closeIcon.vue";
import { ref } from "vue";
export default {
  name: "Slippage",
  components: {
    moreIcon,
    closeIcon,
  },
  props: {
    modelValue: {
      type: Number,
      default: 0,
    },
  },
  emits: ["update:modelValue"],
  setup(_, { emit }) {
    const isOpen = ref(false);

    const modalSlippage = ref("");

    const toggleSlippageModal = (event) => {
      event.stopPropagation();
      isOpen.value = !isOpen.value;
    };

    const onChangeModalSlippage = (event) => {
      modalSlippage.value = event.target.value;
    };
    const setModalSlippage = (slippage) => {
      modalSlippage.value = slippage;
    };

    const apllySlippage = (event) => {
      event.stopPropagation();
      emit("update:modelValue", modalSlippage.value);
      isOpen.value = false;
      modalSlippage.value = "";
    };
    return {
      isOpen,
      setModalSlippage,
      toggleSlippageModal,
      onChangeModalSlippage,
      modalSlippage,
      apllySlippage,
    };
  },
};
</script>

<style scoped lang="scss">
.slippage-block {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.slippage-block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: $color-gray;
  font-size: 14px;
}

.slippage-block-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

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
  padding: 22px 16px;
  position: absolute;
  width: 90%;
  max-width: 620px;
  left: calc(50% - 310px);
  box-sizing: border-box;
  background: #262626;
  border-radius: 24px;
  z-index: 103;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slippage-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 20px;
  }

  svg {
    cursor: pointer;
    width: 18px;
    height: 18px;

    stroke: rgba(255, 152, 0, 1);
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

.slippage-modal-input-wrapper {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: $color-black;
  border-radius: 10px;
  span {
    color: rgba(255, 255, 255, 0.3);
  }
}

.slippage-modal-input {
  width: 100%;
  background: transparent;
  border: none;
  font-size: 14px;
  color: $color-white;
  border-bottom: none;
  font-family: 'Inter Tight';

  &:focus,
  &:valid {
    background-color: rgba(255, 255, 255, 0) !important;
  }
}

.slippage-modal-buttons {
  display: flex;
  gap: 8px;
}

.slippage-modal-button {
  padding: 9px 16px;
  background: rgba(255, 152, 0, 0.19);
  border: none;
  border-radius: 20px;
  color: $color-orange;
  font-size: 12px;
  font-family: 'Inter Tight';
  font-weight: 600;
  cursor: pointer;

  &.active {
    background-color: $color-orange;
    color: $color-black;
  }
}

.slippage-modal-apply-button {
  padding: 19px 16px;
  background: $color-orange;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'Inter Tight';
  font-weight: 600;
}

@media (max-width: 690px) {
  .options {
    left: 32px;
    right: 32px;
    width: calc(100% - 64px);
  }
}
</style>
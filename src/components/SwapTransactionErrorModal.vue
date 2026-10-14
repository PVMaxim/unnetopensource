<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="backdrop"
    >
      <div
        class="options"
        v-if="isOpen"
      >
        <div class="modal-header">
          <closeIcon @click="close" />
        </div>
        <div class="icon-wrapper">
          <errorSwapIcon />
        </div>
        <h3 class="title">Transaction failed!</h3>
        <div class="info">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g filter="url(#filter0_b_2163_139)">
              <path
                d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z"
                fill="#5C79FB"
              />
            </g>
            <path
              d="M12.3789 3V9.6525L18.0017 12.165L12.3789 3Z"
              fill="white"
              fill-opacity="0.602"
            />
            <path
              d="M12.3774 3L6.75391 12.165L12.3774 9.6525V3Z"
              fill="white"
            />
            <path
              d="M12.3711 16.472V20.9923L17.9976 13.208L12.3711 16.472Z"
              fill="white"
              fill-opacity="0.602"
            />
            <path
              d="M12.3791 20.9943V16.4733L6.75562 13.2101L12.3791 20.9943Z"
              fill="white"
            />
            <path
              d="M12.3789 15.4286L18.0017 12.1647L12.3789 9.6543V15.4286Z"
              fill="white"
              fill-opacity="0.2"
            />
            <path
              d="M6.75391 12.1637L12.3774 15.4276V9.65332L6.75391 12.1637Z"
              fill="white"
              fill-opacity="0.602"
            />
            <defs>
              <filter
                id="filter0_b_2163_139"
                x="-27.3364"
                y="-27.3364"
                width="78.6729"
                height="78.6729"
                filterUnits="userSpaceOnUse"
                color-interpolation-filters="sRGB"
              >
                <feFlood
                  flood-opacity="0"
                  result="BackgroundImageFix"
                />
                <feGaussianBlur
                  in="BackgroundImageFix"
                  stdDeviation="13.6682"
                />
                <feComposite
                  in2="SourceAlpha"
                  operator="in"
                  result="effect1_backgroundBlur_2163_139"
                />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="effect1_backgroundBlur_2163_139"
                  result="shape"
                />
              </filter>
            </defs>
          </svg>
          <span class="info-amount">0.0545364</span>
          <span class="info-token-symbol">ETH</span>

        </div>

        <button
          class="ok-button"
          @click="close"
        >OK</button>
      </div>
    </div>
  </Teleport>
</template>

<script>
import closeIcon from "@/components/svg/closeIcon.vue";
import errorSwapIcon from "@/components/svg/errorSwapIcon.vue";

export default {
  name: "SwapTransactionErrorModal",
  components: {
    closeIcon,
    errorSwapIcon,
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    close: {
      type: Function,
      default: () => {},
    },
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
  justify-content: center;
  align-items: center;
  gap: 16px;
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
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #fca100 0%, #fd7b00 100%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
}

.title {
  margin-top: 16px;
  font-size: 20px;
  font-weight: 500;
  font-family: 'Inter Tight';
  color: $color-white;
}

.info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.info-amount {
  font-size: 24px;
  font-weight: 500;
  color: $color-white;
}

.info-token-symbol {
  font-size: 24px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
}

.ok-button {
  margin-top: 32px;
  padding: 19px 16px;
  background: $color-orange;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'Inter Tight';
  font-weight: 600;
  width: 100%;
  color: $color-black;
}
@media (max-width: 690px) {
  .options {
    left: 32px;
    right: 32px;
    width: calc(100% - 64px);
  }
}
</style>
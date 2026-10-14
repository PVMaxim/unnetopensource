<template>
  <div v-if="modelValue" class="message-window-background"></div>
  <div v-if="modelValue" class="message-window">
    <div v-if="title" class="title" v-html="title"></div>
    <div v-if="subTitle" class="subtitle" v-html="subTitle"></div>
    <div v-if="token" class="balance-group">
      <div class="balance-icon">
        <TokenIcon  v-if="typeof token === 'object' && token?.symbol" :tokenIconSymbol="token?.symbol" :tokenIconUrl="token?.iconUrl"  iconClass="icon" />
      </div>
      <div class="balance-token-box">
        <div class="balance-token">{{ token?.symbol }}</div>
        <div v-if="isShowCoingecko" class="coingecko-text text-gray"><span class="text-white">CoinGecko</span><CoingeckoIcon class="icon" /></div>
      </div>
    </div>
    <div class="button-group">
      <button  v-if="buttonConfirmText" class="button-main" @click=buttonConfirm>{{ buttonConfirmText }}</button>
      <button  v-if="buttonCancelText" class="button-second" @click=buttonCancel>{{ buttonCancelText }}</button>
    </div>
    <div v-if="$slots.disclaimer" class="disclaimer text-gray">
      <slot name="disclaimer"></slot>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { roundNumber } from '@/api/sub-utils';
import TokenIcon from "@/components/TokenIcon.vue";
import CoingeckoIcon from '@/components/svg/coingecko.vue';

/**
 * A generic confirmation modal window. It is controlled by v-model and can be configured
 * with a title, subtitle, token information, and custom button texts. It emits events
 * on user actions (confirm/cancel).
 * @vue-component
 */
export default defineComponent({
  name: 'AlertConfirm',
  /**
   * @emits update:modelValue - Emitted to update the v-model value, effectively closing the modal.
   * @emits onConfirm - Emitted when the user clicks the confirm button. Payload: `{ value: true, srcEvent: 'confirmButton' }`.
   * @emits onCancel - Emitted when the user clicks the cancel button. Payload: `{ value: true, srcEvent: 'cancelButton' }`.
   */
  emits: ['update:modelValue', 'onConfirm', 'onCancel'],
    props: {
      /**
       * Controls the visibility of the modal. Supports `v-model`.
       */
      modelValue: [Boolean, false],
      /**
       * The main title of the modal. Can contain HTML via `v-html`.
       */
      title: {
        type: [String, null],
        default: null,
        required: false
      },
      /**
       * The subtitle/description text of the modal. Can contain HTML via `v-html`.
       */
      subTitle: {
        type: [String, null],
        default: null,
        required: false
      },
      /**
       * Text for the confirm button. If not provided, the button is not rendered.
       */
      buttonConfirmText: {
        type: [String, null],
        default: null
      },
      /**
       * Text for the cancel button. If not provided, the button is not rendered.
       */
      buttonCancelText: {
        type: [String, null],
        default: null
      },
      /**
       * An object representing a token to be displayed in the modal.
       * @type {Object | null}
       * @property {string} symbol - The symbol of the token (e.g., 'ETH').
       * @property {string} iconUrl - The URL of the token's icon.
       */
      token: {
        type: [Object, null],
        default: null
      },
      /**
       * If true, displays the CoinGecko attribution next to the token.
       */
      isShowCoingecko: {
        type: [Boolean],
        default: false
      },
    },
    /**
     * @slot disclaimer - A slot for adding disclaimer text at the bottom of the modal, below the buttons.
     */
    components: {
      TokenIcon,
      CoingeckoIcon
    },

    setup(props, { emit }) {
      /**
       * Handles the click on the confirm button.
       * Emits 'onConfirm' and 'update:modelValue' to close the modal.
       */
      const buttonConfirm= () => {
        emit('onConfirm', {
          value: true,
          srcEvent: 'confirmButton'
        });
        emit('update:modelValue', false);
      }

      /**
       * Handles the click on the cancel button.
       * Emits 'onCancel' and 'update:modelValue' to close the modal.
       */
      const buttonCancel = () => {
        emit('onCancel', {
          value: true,
          srcEvent: 'cancelButton'
        });
        emit('update:modelValue', false);
      }

      return {props, buttonConfirm, buttonCancel, roundNumber }
    }
})
</script>

<style scoped lang="scss">
  .message-window-background{
    position: fixed;
    background-color: rgba($color-black-10, .8);
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100;
  }
  .message-window {
    background-color: $color-black-23;
    color: rgb(255, 255, 255);
    width: 80vw;
    max-width: 620px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: fixed;
    left: 50vw;
    top: 50vh;
    padding: 24px;
    border: 1px solid $color-black-40;
    border-radius: 12px;
    z-index: 101;
    flex-wrap: nowrap;
    @include transforma(translateX(-50%) translateY(-50%));

    .title {
      font-size: 24px;
      font-weight: 500;
    }
    .subtitle {
      font-size: 14px;
      font-weight: 400;
      margin-top: 7%;
      max-width: 400px;
      text-align: center;
    }
    .button-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      margin-top: 20px;

      button {
        width: 100%;
      }

      button:nth-child(2) {
        margin-top: 9px;
      }
    }

    .balance-group {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-top: 40px;

      :deep(.icon) {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }

      .balance-token-box {
        display: flex;
        flex-direction: column;
        margin-left: 9px;

        // .balance-token {
          
        // }

        .coingecko-text {
          display: flex;
          flex-direction: row;
          align-items: center;
          font-size: 12px;

          span {
            margin-left: 4px;
          }

          svg {
            width: 12px;
            height: 12px;
            margin-left: 4px;
          }
        }
      }
    }

    .disclaimer {
      font-size: 12px;
      margin-top: 9px;
      padding-top: 12px;
      border-top: 1px solid $color-black-38;
    }
  }
</style>
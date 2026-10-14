<template>
  <div class="keyboard-wrap">
    <div class="security-code-wrap">
      <div class="security-code-container">
        <div v-if="title" class="security-code-title" v-html="title"></div>
        <ul class="pin-code-container">
          <li class="pin-code-item" v-for="(item, index) in numberOfDigits" :key="index" :class="[inputClass, { enable: pinCode[index] }]">
          </li> 
        </ul>
        <div v-if="error" class="security-code-error" v-html="error"></div>
        <div v-else class="security-code-error"></div>
        <ToggleSwitch class="toggle-switch-pin-lenght"
          v-model:selectedSwitch=pinLength
          :options="toggleOptions"
          @change="changePinLength($event.value)" 
          name="pinLength"
        />
        <InputCheckbox v-if="useStorePinCode"
        inputId="storePinCode"
          inputClass="wallet"
          v-model="storePinCode"
          :label = "$t('pin.rememberPinCode')"
          @change="storePinCodeHandle($event.value)" 
        />
      </div>
      <div v-if="confirm" class="button-container">
        <button v-if="confirm" class="button-main" @click.prevent=buttonClick>{{ buttonName ?? $t('button.confirm') }}</button>
      </div>
      <div class='keyboard'>
        <div class='key-row'>
          <div class='key-cell' data-num='1' @click.stop.prevent='handleKeyPress'>1<div class="key-cell-alphabet"> </div></div>
          <div class='key-cell' data-num='2' @click.stop.prevent='handleKeyPress'>2<div class="key-cell-alphabet">ABC</div></div>
          <div class='key-cell' data-num='3' @click.stop.prevent='handleKeyPress'>3<div class="key-cell-alphabet">DEF</div></div>
        </div>
        <div class='key-row'>
          <div class='key-cell' data-num='4' @click.stop.prevent='handleKeyPress'>4<div class="key-cell-alphabet">GHI</div></div>
          <div class='key-cell' data-num='5' @click.stop.prevent='handleKeyPress'>5<div class="key-cell-alphabet">JKL</div></div>
          <div class='key-cell' data-num='6' @click.stop.prevent='handleKeyPress'>6<div class="key-cell-alphabet">MNO</div></div>
        </div>
        <div class='key-row'>
          <div class='key-cell' data-num='7' @click.stop.prevent='handleKeyPress'>7<div class="key-cell-alphabet">PQRS</div></div>
          <div class='key-cell' data-num='8' @click.stop.prevent='handleKeyPress'>8<div class="key-cell-alphabet">TUV</div></div>
          <div class='key-cell' data-num='9' @click.stop.prevent='handleKeyPress'>9<div class="key-cell-alphabet">WXYZ</div></div>
        </div>
        <div class='key-row'>
          <div class='key-cell cancel disabled' data-num="C" @click.stop.prevent='handleKeyPress'>{{ $t('button.cancel') }}</div>
          <div class='key-cell' data-num='0' @click.stop.prevent='handleKeyPress'>0</div>
          <div class='key-cell delete disabled' data-num="D" @click.stop.prevent='handleKeyPress'><DeleteIcon/></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, watchEffect, ref} from 'vue'
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import DeleteIcon from '@/components/svg/deleteIcon.vue'
import InputCheckbox from '@/components/InputCheckbox.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { PING_LENGTH_MIN, ALLOWED_PING_LENGTH } from '../api/constants-types';
import { prefixStore, getStorePrefix} from '../api/ApiHandler';

export default defineComponent({
  name: 'PinCode',
  emits: ['update:modelValue', 'update:numberOfDigits', 'change', 'changePinLength', 'isStore', 'cancelButton', 'pinRight'],
    props: {
      modelValue: [String, null],
      numberOfDigitsMin: {
        type: Number,
        default: PING_LENGTH_MIN
      },
      numberOfDigits: {
        type: [Number],
        default(props) {
          return props.numberOfDigitsMin
        }
      },
      inputClass: {
        type: String,
        default: '',
      },
      title: {
        type: [String, null],
        default: null
      },
      error: {
        type: [String, null],
        default: null
      },
      buttonClick: {
        type: [Function],
        default: null
      },
      buttonName: {
        type: [String, null],
        default: null
      },
      confirm: {
        type: [Boolean],
        default: false
      },
      useStorePinCode: {
        type: [Boolean],
        default: false
      },
      isNewCard: {
        type: [Boolean],
        default: false
      },
    },
    components: {
      ToggleSwitch,
      DeleteIcon,
      InputCheckbox
    },

    setup(props, { emit }) {
      const { t } = useI18n();
      const isActive = ref(false);
      const pinCode = ref('');
      const storePinCode = ref(false);
      const pinLength = ref(props.numberOfDigits.toString());
      const store = useStore();

      const toggleOptions = {
        layout: {
          color: 'rgb2(255, 255, 255, .6)',
          backgroundColor: 'rgba(0,0,0,0)',
          selectedColor: 'rgba(17, 17, 17, 1)',
          selectedBackgroundColor: 'rgb(255, 152, 0)',
          borderColor: 'none',
          fontWeightSelected: 'normal',
          squareCorners: true,
          noBorder: false
        },
        size: {
          fontSize: 1.5,
          height: 3.25,
          padding: 0.5,
          width: 10
        },
        config: {
          delay: 0.4,
          disabled: false,
          items: [
            { name: ALLOWED_PING_LENGTH[0].toString(), value: ALLOWED_PING_LENGTH[0].toString(),  width: '40px', padding: '6px 8px' },
            { name: ALLOWED_PING_LENGTH[1].toString(), value: ALLOWED_PING_LENGTH[1].toString(),  width: '40px', padding: '6px 8px' },
            { name: ALLOWED_PING_LENGTH[2].toString(), value: ALLOWED_PING_LENGTH[2].toString(), width: '40px', padding: '6px 8px' }
          ]
        }
      }

      const changePinLength =  (event) => {
        if (typeof prefixStore.value !== 'string') {
          prefixStore.value = getStorePrefix();
        }
        pinLength.value = event;
        emit('changePinLength', Number(event));
        emit('update:numberOfDigits', Number(event));
        if (!props.isNewCard) {
          store.dispatch(`${prefixStore.value}.customtoken/setPinLength`, Number(event));
        }
        pinCode.value = '';
      }

      const storePinCodeHandle = async(event) => {
        emit('isStore', {
          value: storePinCode.value,
          srcEvent: 'storePin'
        })
      }

      const handleKeyPress = async (e) => {
        const num = ref(e.currentTarget?.getAttribute('data-num'));
          switch (String(num.value)) {
            case 'C':
              handleCancelKey();
              break
            case 'D':
              handleDeleteKey();
              break
            default:
              handleNumberKey(num.value);
              break
          }
      };

      const handleCancelKey = async () => {
        emit('cancelButton', {
          value: true,
          srcEvent: 'cancelButton'
        });
      }

      const handleDeleteKey = async () => {
        const S = ref(pinCode.value);
        if (S.value?.length) {
          pinCode.value = S.value?.substring(0, S.value?.length - 1);
          emit('update:modelValue', pinCode.value);
          emit('change', {
            value: pinCode.value,
            srcEvent: 'changePin'
          });
        }
      };

      const handleNumberKey = async (num) => {
        const S = ref(pinCode.value);
        if (pinCode.value?.length < props.numberOfDigits) {
          pinCode.value = S.value + num
        }
        if (pinCode.value?.length ===  props.numberOfDigits) {
          if (S.value?.length !==  props.numberOfDigits) {
            emit('update:modelValue', pinCode.value);
          }
        }
        emit('change', {
          value: pinCode.value,
          srcEvent: 'changePin'
        })
      };

      watchEffect(() => {
        if (props.confirm === true)  {
          emit('pinRight', {
            value: true,
            srcEvent: 'pinRight'
          });
        }
      });

      return { isActive, pinCode, toggleOptions, pinLength, handleKeyPress, handleDeleteKey, handleNumberKey, storePinCode, storePinCodeHandle, handleCancelKey, changePinLength }
    }
})
</script>

<style scoped lang="scss">
.keyboard-wrap {
  width: 100%;
  height: calc( 100% - 24px );
}

.security-code-wrap {
  width: 100%;
  height: 100%;
}

.security-code-container {
  width: 100%;
  height: 100%;
}

.security-code-title {
  font-size: 18px;
  color: $color-gray;
  margin-bottom: 18px;
}
.security-code-wrap, .security-code-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.pin-code-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin: 0;
  padding: 0;

  .pin-code-item {
    list-style: none;
    width: 4vw;
    height: 4vw;
    max-width: 20px;
    max-height: 20px;
    border: 1px solid $color-white;
    border-radius: 50%;
    margin: 5px;

    &.enable {
      background-color: $color-white;
    }
  }
}

.security-code-error {
  color: red;
  min-height: 18px;
}

.keyboard {
  height: 200px;
  width: 100%;

  .key-row {
    display: flex;
    position: relative;
    height: 50px;
    font-family: arial;
    font-size: 15px;
  }

  .key-cell {
    width: 33.33%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
    background-color: $color-gray;
    border-radius: 8px;
    margin: 3px;

    .key-cell-alphabet{
      font-size: 10px;
    }

    &.delete {
      svg {
        height: 20px;
      }
    }
  }
  .key-cell:active {
    background: rgba(26, 26, 26, 0.2);
  }

  .disabled {
    background: rgba(50, 50, 50, 0.12);
  }

}

.button-container {
    width: 100%;
    height: 90px;
    padding: 18px;
    display: flex;
    flex-direction: row;
    justify-content: center;

    .button-main {
      width: 90%;
    }
  }

</style>
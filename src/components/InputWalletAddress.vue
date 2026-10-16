<template>
    <div class="input-container">
      <fieldset class="input-wallet">
        <legend class="input-wallet-legend">{{ label }}</legend>
        <input
            :class="[inputClass, { error: modelValue === 0 || props.errorMessage !== null }]"
            :id="inputId"
            type="text"
            :value="modelValue"
            :placeholder="placeholder"
            @input="onChanged"
        />
        <slot name="buttons"></slot>
      </fieldset>
      <div class="error-message marquee-container" ref="errorMessageContainer"> 
        <div class="marquee-content" :class="{ animate: isOverflowing }">
          <span class="marquee-text">{{ props.errorMessage }}</span>
          <span v-if="isOverflowing" class="marquee-text">{{ props.errorMessage }}</span>
        </div>
      </div>
    </div>
  </template>

  <script>
    import { watchEffect, defineComponent, ref, nextTick } from 'vue'

    export default defineComponent({
      name: 'InputWalletAddress',
      emits: ['update:modelValue, update:errorMessage'],
      props: {
        modelValue: String,
        placeholder: {
          type: String,
          default: ''
        },
        inputId: {
          type: String,
          default: ''
        },
        inputClass: {
          type: String,
          default: '',
        },
        label: {
          type: String,
          default: ''
        },
        errorMessage: {
          type: [String,null],
          default: null
        }
      },

      setup(props, { emit }) {
        const errorMessageContainer = ref(null);
        const isOverflowing = ref(false);

        function onChanged(e) {
          emit('update:modelValue', e.currentTarget.value);
        }

        const checkOverflow = () => {
          if (errorMessageContainer.value) {
            const container = errorMessageContainer.value;
            const content = container.querySelector('.marquee-content');
            if (content) {
              isOverflowing.value = content.offsetWidth > container.offsetWidth;
            }
          }
        };

        watchEffect(() => {
          if (props.errorMessage !== null) {
            nextTick(() => {
              checkOverflow();
            });
            setTimeout(() => emit('update:errorMessage', null ), 5000);
          } else {
            isOverflowing.value = false;
          }
        })

        return {
          props, onChanged, errorMessageContainer, isOverflowing
        }
      }
    })
</script>

<style scoped lang="scss">
.input-container {
  padding: 16px 0 0 0;
  position: relative;
  overflow: hidden;

  label {
    display: block;
    position: relative;
    transition: all 0.2s;
    color: $color-white;
    pointer-events: none;
    margin-bottom: 8px;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active{
      -webkit-background-clip: text;
      -webkit-text-fill-color: #ffffff;
  }

  input {
    width: calc( 100% - 16px );
    min-width: 150px;
    border: 0;
    background-color: rgba(255,255,255,0) !important;
    border-bottom: 1px solid $color-gray;
    border-radius: 0px;
    padding: 6px 0px;
    color: $color-white;

    &.error {
      border-bottom-color: $color-red;
    }

    &:focus, &:valid {
      background-color: rgba(255,255,255,0) !important;
    }

    &:focus + label,
    &.valid + label {
      top: 3px;
      left: 0;
      font-size: 0.8rem;
      color: $color-white;
    }
  }

  .input-wallet {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    position: relative;
    border-color: $color-black-136;
    border-radius: 10px;
    border-width: 1px;
    margin: 0;
    padding: 4px 0 10px 0;
    @include transition(border-color .3s ease-in-out);

    .input-wallet-legend {
      font-size: 13px;
      color: $color-black-136;
      padding: 0 4px;
      margin-left: 8px;
      @include transition(color .3s ease-in-out);
    }

    input {
      font-size: 18px;
      border: none !important;
      padding: 0;
      margin: 0;
      position: relative;
      left: 10px;
      margin-right: 8px;

      &::placeholder {
        font-size: 15px;
      }
    }

    &:has(input:focus) {
      border-color: $color-white;

      .input-wallet-legend {
        color: $color-white;
      }
    }

    &:has(input.error) {
      border-color: $color-red;

      .input-wallet-legend {
        color: $color-red;
      }
    }
  }

  .error-message {
    height: 15px;
    font-size: 12px;
    color: $color-red;
  }

}
</style>
<template>
    <div v-if="useFieldset" class="input-container">
      <fieldset class="input-digits">
        <legend class="input-digits-legend">{{ label }}</legend>
        <input
          :class="[inputClass, { error: modelValue === 0 || props.errorMessage !== null  , valid: formReadyToSubmit}]"
          :id="inputId"
          type="text"
          inputmode="decimal"
          :value="modelValue"
          @input="onInput"
          @change="onChanged"
          :placeholder="placeholder"
          ref="inputRef"
          @keydown.enter="onEnterInputRef"
        />
      </fieldset>
      <div class="error-message marquee-container" :class="[{ error: modelValue === 0 || props.errorMessage !== null}]" ref="errorMessageContainer"> 
        <div class="marquee-content" :class="{ animate: isOverflowing }">
          <span class="marquee-text">{{ props.errorMessage }}</span>
          <span v-if="isOverflowing" class="marquee-text">{{ props.errorMessage }}</span>
        </div>
      </div>
    </div>
    <div v-else class="input-container">
      <label v-if="label" :for="inputId" v-html="label"></label>
      <input
        :class="[inputClass, { error: modelValue === 0 || props.errorMessage !== null  , valid: formReadyToSubmit}]"
        :id="inputId"
        type="text"
        inputmode="decimal"
        :value="modelValue"
        @input="onInput"
        @change="onChanged"
        :placeholder="placeholder"
        ref="inputRef"
        @keydown.enter="onEnterInputRef"
      />
      <div v-if="showError" class="error-message marquee-container" :class="[{ error: modelValue === 0 || props.errorMessage !== null}]" ref="errorMessageContainerElse"> 
        <div class="marquee-content" :class="{ animate: isOverflowing }">
          <span class="marquee-text">{{ props.errorMessage }}</span>
          <span v-if="isOverflowing" class="marquee-text">{{ props.errorMessage }}</span>
        </div>
      </div>
    </div>
  </template>
  
  <script>
    import { ref, computed, defineComponent, watchEffect, nextTick } from 'vue';
  
    export default defineComponent({
      name: 'InputDigits',
      emits: ['update:modelValue', 'update:errorMessage'],
      props: {
        modelValue: [String, null],
        inputId: {
          type: String,
          default: ''
        },
        inputClass: {
          type: String,
          default: '',
        },
        label: {
          type: [String, null],
          default: null
        },
        placeholder: {
          type: [String, null],
          default: null
        },
        errorMessage: {
          type: [String, null],
          default: null
        },
        useFieldset: {
          type: [Boolean],
          default: false
        },
        showError: {
          type: [Boolean],
          default: false
        }
      },
  
      setup(props, { emit }) {
        const inputRef = ref(null);
        const errorMessageContainer = ref(null);
        const errorMessageContainerElse = ref(null);
        const isOverflowing = ref(false);

        const onEnterInputRef = () => {
          inputRef.value?.blur();
        };

        const checkOverflow = () => {
          const container = props.useFieldset ? errorMessageContainer.value : errorMessageContainerElse.value;
          if (container) {
            const content = container.querySelector('.marquee-content');
            if (content) {
              isOverflowing.value = content.offsetWidth > container.offsetWidth;
            }
          }
        };

        const INTEGER_PATTERN = '(0|[1-9]\\d*)'
        const DECIMAL_SEPARATOR = ','
        const DECIMAL_SEPARATORS = [
          ',', 
          '.', 
          '٫', 
          '。' // Chinese dot
        ]
        const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const decimalSymbolInsertedAt = ref(null);

        const escapeRegExp = (str) => {
          return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        }

        const normalizeDecimalSeparator = (str, from) => {
          DECIMAL_SEPARATORS.forEach((s) => {
            str = str.substring(0, from) + str.substring(from).replace(s, DECIMAL_SEPARATOR)
          })
          return str
        }
        const normalizeDecimalChar = (str, from) => {
          DECIMAL_SEPARATORS.forEach((s) => {
            str = str.substring(0, from) + str.substring(from).replace(s, '.')
          })
          return str
        }

        const normalizeDigits = (str) => {
          if (digits[0] !== '0') {
            digits.forEach((digit, index) => {
              str = str.replace(new RegExp(digit, 'g'), String(index))
            })
          }
          return str
        }

        const onlyDigits = (str) => {
          return normalizeDigits(str).replace(/\D+/g, '')
        }

        const removeLeadingZeros = (str) => {
          return str.replace(/^0+(0$|[^0])/, '$1')
        }

        const isFractionIncomplete = (str) => {
          return !!normalizeDigits(str).match(new RegExp(`^${INTEGER_PATTERN}${escapeRegExp(DECIMAL_SEPARATOR)}$`))
        }

        function onChanged(e) {
          emit('update:modelValue', e.currentTarget.value);
        }

        const onInput = (e) => {
          let { value, selectionStart } =  e.currentTarget;
          const dot = ref('');
          const inputEvent = e
          if (selectionStart && inputEvent && DECIMAL_SEPARATORS.includes(inputEvent.data)) {
            decimalSymbolInsertedAt.value = selectionStart - 1
            dot.value = '.'
          }
          if (decimalSymbolInsertedAt.value !== null) {
            decimalSymbolInsertedAt.value = null
          }
          value = normalizeDecimalChar(value, decimalSymbolInsertedAt.value)
          if (isFractionIncomplete(value)) {
            e.currentTarget.value = `${value}`;
          }
          value = normalizeDecimalSeparator(value, decimalSymbolInsertedAt.value)
          const [integer, ...fraction] = value.split(DECIMAL_SEPARATOR)
          const integerDigits = removeLeadingZeros(onlyDigits(integer))
          const fractionDigits = onlyDigits(fraction.join(''))
          const valueFormated = ref(0)
          if (integerDigits.length > 0) {
            valueFormated.value = `${integerDigits}`;
          } 
          if (integerDigits.length > 0 && dot.value.length > 0 ) {
            valueFormated.value = `${integerDigits}${dot.value}`;
          } 
          if (integerDigits.length > 0  && fractionDigits.length > 0 ) {
            valueFormated.value = `${integerDigits}.${fractionDigits}`;
          }
          e.currentTarget.value = valueFormated.value
        }

        const formReadyToSubmit = computed(
        () => {
            return props.modelValue.length > 0 ? 'valid' : '';
            }
        );

        watchEffect(() => {
          if (props.errorMessage !== null) {
            nextTick(() => {
              checkOverflow();
            });
            setTimeout(() => emit('update:errorMessage', null ), 10000);
          } else {
            isOverflowing.value = false;
          }
        })
  
        return {
          props, onChanged, onInput, formReadyToSubmit, inputRef, onEnterInputRef, errorMessageContainer, errorMessageContainerElse, isOverflowing
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

  .input-digits {
    position: relative;
    border-color: $color-black-136;
    border-radius: 10px;
    border-width: 1px;
    margin: 0;
    padding: 4px 10px 10px;
    @include transition(border-color .3s ease-in-out);

    .input-digits-legend {
      font-size: 13px;
      color: $color-black-136;
      padding: 0 4px;
      @include transition(color .3s ease-in-out);
    }

    input {
      width: 100%;
      font-size: 18px;
      border: none !important;
      padding: 0;
      margin: 0;

      &::placeholder {
        font-size: 15px;
      }
    }

    &:has(input:focus) {
      border-color: $color-white;

      .input-digits-legend {
        color: $color-white;
      }
    }

    &:has(input.error) {
      border-color: $color-red;

      .input-digits-legend {
        color: $color-red;
      }
    }
  }

  .error-message {
    height: 15px;
    font-size: 12px;
    color: rgba($color-white, 0);
    @include transition(color .3s ease-in-out);

    &.error {
      color: $color-red;
    }
  }
}
</style>

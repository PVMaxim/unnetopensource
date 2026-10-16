<template>
    <div class="input-container">
      <div v-if="label" class="input-label">
        <label :for="inputId" v-html="label"></label> 
        <input
            :class="[inputClass, { error: modelValue === 0 || props.errorMessage !== null }]"
            :id="inputId"
            type="text"
            :value="modelValue"
            :placeholder="placeholder"
            @input="onChanged"
        />
      </div>
      <input v-else
            :class="[inputClass, { error: modelValue === 0 || props.errorMessage !== null }]"
            :id="inputId"
            type="text"
            :value="modelValue"
            :placeholder="placeholder"
            @input="onChanged"
        />
      <div v-if="showError" class="error-message marquee-container" ref="errorMessageContainer"> 
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
      name: 'InputText',
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
        },
        showError: {
          type: [Boolean],
          default: false
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
            setTimeout(() => emit('update:errorMessage', null ), 10000);
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

  .input-label {
    display: flex;
    flex-direction: column;
    align-items: start;
  }

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

    .error-message {
      height: 15px;
      font-size: 12px;
      color: $color-red;
    }

}
</style>
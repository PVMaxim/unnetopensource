<template>
    <div class="input-container-checkbox">   
        <input
            :class="[inputClass, { error: modelValue === 0 }]"
            :id="inputId"
            type="checkbox"
            :value="modelValue"
            :disabled="disabled"
            @input="onChanged"
        />
        <label v-if="label" :for="inputId" v-html="label"></label>
    </div>
  </template>
  
  <script>
    import { defineComponent } from 'vue'
  
    export default defineComponent({
      name: 'InputCheckbox',
      emits: ['update:modelValue', 'change'],
      props: {
        modelValue: Boolean,
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
        disabled: {
          type: Boolean,
          default: false
        }
      },
  
      setup(props, { emit }) {
        function onChanged(e) {
          emit('update:modelValue', e.currentTarget.checked);
          emit('change', {
            value: e.currentTarget.checked,
            srcEvent: 'changeCheckbox'
          });
        }
        return {
          onChanged
        }
      }
    })
  </script>

<style scoped lang="scss">
.input-container-checkbox {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24px 0 0 0;
  position: relative;

    label {
        position: relative;
        transition: all 0.2s;
        color: $color-white;
        margin: 0px;
        padding-left: 22px;
        min-height: 20px;
        line-height: 20px;
    }

    input {

        border: 0;
        clip: rect(0 0 0 0);
        height: 0px;
        margin: 0px;
        padding: 0;
        position: relative;
        width: 0px;

        &:before, &:after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        &:before {
          left: 0;
          height: 16px;
          width: 16px;
          box-shadow: inset 0 0 0 2px hsl(240deg, 10%, 90%);
          border-radius: .4rem;
        }

        &:after {
          left: calc(16px / 2);
          border-radius: .14rem;
          height: 0;
          width: 0;
          transition: 200ms ease-out;
        }

        &:checked:after {
          left: 4px;
          height: calc(16px - ((2px + 2px) * 2));
          width: calc(16px - ((2px + 2px) * 2));
          background-color: $color-orange;
        }

        &:checked:before {
          box-shadow: inset 0 0 0 1.5px $color-orange;
        }
    }
}
</style>
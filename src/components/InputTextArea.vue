<template>
    <div class="input-container">   
        <textarea
            :class="[inputClass, { error: modelValue === 0 , valid: formReadyToSubmit}]"
            :id="inputId"
            type="text"
            :value="modelValue"
            @input="onChanged"
            rows="7"
        />
        <label :for="inputId" v-html="label"></label>
    </div>
  </template>

  <script>
    import { computed, defineComponent } from 'vue'

    export default defineComponent({
      name: 'InputTextArea',

      emits: ['update:modelValue'],

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
        }
      },

      setup(props, { emit }) {
        function onChanged(e) {
          emit('update:modelValue', e.currentTarget.value);
        }

        const formReadyToSubmit = computed(
        () => {
            return props.modelValue.length > 0 ? 'valid' : '';
            }
        );

        return {
          onChanged, formReadyToSubmit
        }
      }
    })
</script>

<style scoped lang="scss">
.input-container {
  padding: 16px 0 0 0;
  position: relative;

    label {
        position: absolute;
        top: 27px;
        left: 10px;
        transition: all 0.2s;
        color: $color-black;
        pointer-events: none;
    }

    textarea {
        width: 100%;
        min-width: 150px;
        max-width: 100%;
        border: 0;
        border-bottom: none;
        border-radius: 8px;
        padding: 6px 8px;

        &:focus + label,
        &.valid + label {
            top: 3px;
            left: 0;
            font-size: 0.8rem;
            color: $color-white;
        }
    }

}
</style>
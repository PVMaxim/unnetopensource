<template>
    <div class="input-container">
      <label :for="inputId" v-html="label"></label>
      <select
          :class="[inputClass, { error: modelValue === 0 , valid: formReadyToSubmit}]"
          :id="inputId"
          :value="modelValue"
          @change="onChanged"
      >
      <option disabled hidden style="display: none !important;"></option>
      <option
          v-for="(option, index) in options"
          :value="option.id ? option.id : (option.value ? option.value : option)"
          :key="option.id ? option.id : index"
      >
          {{ option.name ? option.name : option }}
      </option>
    </select>
  </div>
</template>

  <script>
    import { computed, defineComponent } from 'vue'

    export default defineComponent({
      name: 'SelectOptions',

      emits: ['update:modelValue'],

      props: {
        modelValue: String,
        options: {
            type: Object
        },
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
      display: block;
      position: relative;
      color: $color-white;
      pointer-events: none;
      margin-bottom: 8px;
    }

    select {
        width: 100%;
        min-width: 150px;
        border: 0;
        border-bottom: none;
        border-radius: 8px;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        padding: 6px 8px;
        color: $color-white;
        background-color: $color-gray-dark;

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
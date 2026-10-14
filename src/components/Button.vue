<template>
    <button 
      class="button" 
      :class="[
        {buttonMain: buttonType === 'main'}, 
        {buttonSecond: buttonType === 'second'}, 
        {buttonTransparent: buttonType === 'transparent'},
        {borderRound50: buttonRound === 'round50'},
        {borderRound12: buttonRound === 'round12'},
      ]" 
      @click=buttonClick 
      :disabled=isDisabled
      >
      <span v-if="isLoading" class="loader"></span>
      <span v-else>{{ buttonName }}</span>
    </button>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Button',
  emits: ['onClick'],
  props: {
    iconUrl: {
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
    buttonType: {
      type: [String, null],
      default: 'main'
    },
    buttonRound: {
      type: [String, null],
      default: 'round50'
    },
    isLoading: {
      type: [Boolean],
      default: false
    },
    isDisabled: {
      type: [Boolean],
      default: false
    },
  },
  setup(props, { emit }) {
    const buttonClick = () => {
      emit('onClick')
    }
    return { props, buttonClick }
  }
});
</script>

<style scoped lang="scss">
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: $color-orange;
    color: $color-black;
    overflow: hidden;
    border: none;
    font-size: 18px;
    padding: 12px 18px;
    max-width: 620px;
    cursor: default;

    &:hover, &:hover span{
      cursor: pointer;
    }

    &:disabled,
    &[disabled] {
      cursor: pointer;
      svg {
        path {
          stroke: $color-orange-disable;
        }
      }
    }

    svg {
      height: 20px;
      margin-right: 12px;
    }

    &.borderRound12 {
      border-radius: 12px;
    }

    &.borderRound50 {
      border-radius: 200px;
    }

    &.buttonSecond {
      height: 42px;
      background-color: rgba(255, 255, 255, 0);
      outline: 1px solid $color-orange;
      color: $color-orange;
    }

    &.buttonTransparent {
      height: 42px;
      color: $color-orange;
      background-color: rgba(255, 255, 255, 0);
      outline: none;
      border: none;
    }
    .loader {
      position:relative;
      width:20px;
      height:20px;
      border-radius:50%;
      border: 3px solid;
      border-color:  #000000 $color-orange;
      box-sizing: border-box;
      animation:spin 0.5s infinite;
      }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  }
</style>

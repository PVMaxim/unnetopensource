<template>
    <button 
      class="button" 
      :type="buttonType" 
      @click=handleClick 
      :disabled=isDisabled
      >
      <component :is="getIcon()"></component>
      <slot name="permission"></slot>
    </button>
</template>

<script>
import { shallowRef, markRaw, hydrateOnVisible, defineComponent, defineAsyncComponent } from 'vue'

export default defineComponent({
  name: 'Button',
  emits: ['onClick'],
  props: {
    iconComponent: {
      type: [String],
      default: null
    },
    buttonType: {
      type: [String],
      default: 'button'
    },
    buttonClick: {
      type: [Function],
      default: null
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
    const getIcon = () => {
      const icon = shallowRef(undefined);
        icon.value = markRaw(defineAsyncComponent({
          loader: () => import(`@/components/svg/${props.iconComponent}.vue`),
          hydrate: hydrateOnVisible(),
          delay: 2000,
          suspensible: false,
        }));
        if ( icon.value !== undefined ) {
          return icon.value;
        } else {
        return undefined;
      }
    };

    const handleClick = (event) => {
      if (props.buttonType !== 'submit') {
        event.preventDefault();
      }
      emit('onClick')
    }
    return { props, handleClick, getIcon }
  }
});
</script>

<style lang="scss">
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background-color: rgba(255, 255, 255, 0);
    color: rgb(255, 255, 255);
    border-radius: 8px;
    overflow: hidden;
    border: none;
    font-size: 18px;
    padding: 7px;
    width: 42px;
    cursor: default;

    &:hover, &:hover span{
      cursor: pointer;
    }

    &:disabled,
    &[disabled] {
      cursor: pointer;
    }

    &.stroke:disabled,
    &.stroke[disabled] {
      svg {
        path {
          stroke: $color-orange-disable;
        }
      }
    }

    &.fill:disabled,
    &.fill[disabled] {
      svg {
        path {
          fill: $color-orange-disable;
        }
      }
    }

    svg {
      height: 24px;
      width: 24px;
    }

    .permissionAttention {
      position: absolute;
      color: rgba(255, 255, 255, 0.8);
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: rgba(255, 0, 0, 0.4);
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      right: calc(50% - 15px);
      bottom: calc(50% - 15px);
    }
  }
</style>

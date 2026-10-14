<template>
  <div class="panel">
    <img v-if="iconUrl" :src=iconUrl class="icon" loading="lazy">
    <h1 v-if="title" class="title" v-html="title" />
    <div v-if="subtitle" class="subtitle" v-html="subtitle" />
    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
  <slot name="after"></slot>
  <div class="button-group">
    <button  v-if="buttonName" class="button-main submit" :class="[{subButton: buttonSubName}, { main: props.design === 'main' }]" @click=buttonClick :disabled="isLoading || isDisabled">{{ buttonName }}</button>
    <button  v-if="buttonSubName" class="button-main button-second sub" :class="[{subButton: buttonName}, { main: props.design === 'main' }]" @click=buttonSubClick>{{ buttonSubName }}</button>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Panel',
  props: {
    title: {
      type: [String, null],
      default: null
    },
    subtitle: {
      type: [String, null],
      default: null
    },
    error: {
      type: [String, null],
      default: null
    },
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
    buttonSubClick: {
      type: [Function],
      default: null
    },
    buttonSubName: {
      type: [String, null],
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
    design: {
      type: [String],
      default: 'main'
    },
  },
  setup(props) {
    return { props }
  }
});
</script>

<style scoped lang="scss">
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 24px;

  .icon {
    width: 100px;
    margin-bottom: 36px;
  }

  .title{
    font-size: 36px;
    line-height: 48px;
    font-weight: 600;
    letter-spacing: 0em;
    text-align: center;
    margin: 0;
    padding-bottom: 16px;
    width: 100%;
    word-break: break-word;
  }
  .subtitle{
    font-size: 16px;
    font-weight: 400;
    line-height: 19px;
    letter-spacing: 0em;
    text-align: center;
    margin-bottom: 20px;
    width: 100%;
    word-break: break-word;
  }
  .error {
    color: red;
    width: 100%;
    word-break: break-word;
  }
}

.button-group {
  width: 90%;
  position: absolute;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .button-main {
    width: 100%;

    &:disabled,
    &[disabled] {
      cursor: pointer;
      background-color: $color-orange-disable;
    }

    &.subButton {
      width: 100%;

      &.submit {
        margin-right: 1%;
      }

      &.sub {
        color: $color-orange;
        margin-top: 3%;
      }
    }
  }
}

.web-app {
  .button-group {
    bottom: 42px;
  }
}
</style>

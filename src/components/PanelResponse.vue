<template>
  <div class="panel">
    <img v-if="iconUrl" :src=iconUrl class="icon" loading="lazy">
    <h1 v-if="title" class="title">
      {{ title }}
    </h1>
    <div v-if="subtitle" class="subtitle">
      {{ subtitle }}
    </div>
    <div v-if="response" class="response">
      {{ JSON.stringify(response) }}
    </div>
  </div>
  <button class="button-main" @click=buttonClick :disabled=isLoading>{{ buttonName }}</button>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PanelResponse',
  props: {
    title: {
      type: [String, null],
      default: null
    },
    subtitle: {
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
    isLoading: {
      type: [Boolean],
      default: false
    },
    isDisabled: {
      type: [Boolean],
      default: false
    },
    response: {
      default: null
    },
  },
  setup() {
  }
});
</script>

<style scoped lang="scss">
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 24px;

  .title{
    font-size: 36px;
    line-height: 48px;
    font-weight: 600;
    letter-spacing: 0em;
    text-align: center;
    margin: 0;
    padding-bottom: 36px;
  }
  .subtitle{
    font-size: 16px;
    font-weight: 400;
    line-height: 19px;
    letter-spacing: 0em;
    text-align: center;
    margin-bottom: 20px;
  }
}
.button-main {
    width: 90%;
    position: absolute;
    bottom: 24px;
  }
</style>

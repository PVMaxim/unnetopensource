<template>
  <div class="loader">
  </div>
  <div class="title" v-if="titleLoad !== null && titleLoad.length > 0">
    {{ titleLoad }}
  </div>
  <div class="waitMessage"  v-if="messageLoad !== null && messageLoad.length > 0">
    {{ messageLoad }}
  </div>
</template>

<script>
import { defineComponent, computed} from 'vue'

export default defineComponent({
  name: 'Loading',
  props: {
    messageLoad: {
      type: [String, null],
      default: null
    },
    titleLoad: {
      type: [String, null],
      default: null
    },
    size: {
      type: Number,
      default: 60
    },
    borderWidth: {
      type: Number,
      default: 10
    }
  },
  setup(props) {
    const spinnerSize = computed(() => {
      return `${props.size}px`;
    });
    const spinnerBorderWidth = computed(() => {
      return `${props.borderWidth}px`;
    });
    return {spinnerSize, spinnerBorderWidth}
  }
});
</script>

<style scoped lang="scss">
  .waitMessage{
    padding-top: 7px;
    font-size: 12px;
  }
  .title {
    padding-top: 18px;
    font-size: 15px;
    font-weight: 500;
  }
  .loader {
    position:relative;
    width: v-bind(spinnerSize);
    height: v-bind(spinnerSize);
    border-radius: 50%;
    border: v-bind(spinnerBorderWidth) solid;
    border-color: $color-orange #0000;
    box-sizing: border-box;
    animation:s1 0.5s linear infinite;
    will-change: transform;
  }

  @keyframes s1 {to{transform: rotate(.5turn)}}
</style>

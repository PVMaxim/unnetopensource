<template>
  <div class="rate-wrapper" v-if="rate && reverseRate">
    <CountDownAnimation :duration="timerDuration" :secondsLeft="secondsLeft" />
    <p v-if="isShowReverseRate" class="rate-text">
      1 {{ toToken?.symbol }} = {{ reverseRate }}
      {{ fromToken?.symbol }}
    </p>
    <p v-else class="rate-text">
      1 {{ fromToken?.symbol }} = {{ rate }} {{ toToken?.symbol }}
    </p>
    <arrowsIcon @click="toggleRate" />
  </div>
</template>

<script>
import arrowsIcon from "@/components/svg/arrowsIcon.vue";
import { computed, ref } from "vue";
import { useStore } from "vuex";
import CountDownAnimation from "./CountDownAnimation.vue";
import { AUTO_RELOAD_INTERVAL } from "../../store/modules/swap/modules/autoReload/constants";
export default {
  name: "Rate",
  components: {
    arrowsIcon,
    CountDownAnimation,
  },
  setup() {
    const store = useStore();
    const rate = computed(() => store.state.swap.rate);
    const isShowReverseRate = ref(false);
    const reverseRate = computed(() => store.state.swap.reverseRate);
    const fromToken = computed(() => store.state.swap.fromToken);
    const toToken = computed(() => store.state.swap.toToken);
    const timerDuration = AUTO_RELOAD_INTERVAL;

    const secondsLeft = computed(() => store.state.swap.autoReload.secondsLeft);

    const toggleRate = () => {
      isShowReverseRate.value = !isShowReverseRate.value;
    };
    return {
      rate,
      reverseRate,
      isShowReverseRate,
      fromToken,
      toToken,
      toggleRate,
      secondsLeft,
      timerDuration,
    };
  },
};
</script>

<style scoped lang="scss">
.rate-wrapper {
  padding: 16px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #ffffff0f;
  box-sizing: border-box;
}
.rate-text {
  margin: 0;
  color: $color-gray;
  font-size: 12px;
}
</style>

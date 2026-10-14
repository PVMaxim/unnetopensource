<template>
  <div class="timer">
    <svg class="ring" :width="18" :height="18" viewBox="0 0 100 100">
      <circle class="ring-bg" cx="50" cy="50" r="45" />

      <circle
        class="ring-progress"
        cx="50"
        cy="50"
        r="45"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  duration: { type: Number, default: 10 },
  secondsLeft: { type: Number, default: 10 },
});

const radius = 45;
const circumference = 2 * Math.PI * radius;

const dashOffset = computed(() => {
  const progress = props.secondsLeft / props.duration;
  return circumference * (1 - progress);
});
</script>

<style scoped>
.timer {
  position: relative;
  width: 18px;
  height: 18px;
}

.ring {
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: #666;
  stroke-width: 10;
  opacity: 0.4;
}

.ring-progress {
  fill: none;
  stroke: white;
  stroke-width: 10;
  stroke-linecap: butt;
  transition: stroke-dashoffset 1s linear;
}
</style>

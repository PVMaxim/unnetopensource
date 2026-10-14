<template>
  <div ref="element" :class="['reveal-wrapper', { 'is-revealed': isRevealed }]" :style="{ transitionDelay: `${delay}s` }">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  delay: {
    type: Number,
    default: 0
  },
  threshold: {
    type: Number,
    default: 0.1
  }
});

const element = ref(null);
const isRevealed = ref(false);
let observer = null;

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      isRevealed.value = true;
      observer.disconnect();
    }
  }, { threshold: props.threshold });
  
  if (element.value) {
    observer.observe(element.value);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<style scoped>
.reveal-wrapper {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.reveal-wrapper.is-revealed {
  opacity: 1;
  transform: translateY(0);
}
</style>

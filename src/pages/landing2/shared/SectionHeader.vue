<template>
  <div :class="['section-header-wrapper', align === 'center' ? 'text-center' : 'text-left']">
    <RevealOnScroll>
      <span class="section-label">
        {{ label }}
      </span>
    </RevealOnScroll>
    <RevealOnScroll :delay="0.05">
      <h2 class="section-title">
        {{ title }}
        <span v-if="titleHighlight" class="gradient-text">{{ titleHighlight }}</span>
      </h2>
    </RevealOnScroll>
    <RevealOnScroll v-if="description" :delay="0.1">
      <p :class="['section-description', align === 'center' ? 'mx-auto' : '']">
        {{ description }}
      </p>
    </RevealOnScroll>
  </div>
</template>

<script setup>
import RevealOnScroll from './RevealOnScroll.vue';

defineProps({
  label: { type: String, required: true },
  title: { type: String, required: true },
  titleHighlight: { type: String, default: '' },
  description: { type: String, default: '' },
  align: { type: String, default: 'center' }
});
</script>

<style scoped>
.section-header-wrapper {
  margin-bottom: 1.5rem;
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.section-label {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-orange);
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.025em;
  margin-bottom: 0.625rem;
}

.section-description {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
  max-width: 460px;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}
</style>

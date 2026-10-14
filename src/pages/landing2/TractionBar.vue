<template>
  <RevealOnScroll class="traction-bar-container">
    <div class="desktop-view">
      <template v-for="(feat, i) in features" :key="`desktop-${i}`">
        <div class="divider" v-if="i > 0"></div>
        <div class="feature-item">
          <span class="feature-value">{{ feat.value }}</span>
          <span class="feature-label">{{ feat.label }}</span>
        </div>
      </template>
    </div>

    <div class="mobile-view">
      <div v-for="(feat, i) in features" :key="`mobile-${i}`" class="mobile-feature-item">
        <span class="mobile-feature-value">{{ feat.value }}</span>
        <span class="mobile-feature-label">{{ feat.label }}</span>
      </div>
    </div>
  </RevealOnScroll>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from './shared/RevealOnScroll.vue';

const { t } = useI18n();

const features = computed(() => {
  return [
    { value: t('landing_v2.tractionBar.features.eal.value'), label: t('landing_v2.tractionBar.features.eal.label') },
    { value: t('landing_v2.tractionBar.features.fido.value'), label: t('landing_v2.tractionBar.features.fido.label') },
    { value: t('landing_v2.tractionBar.features.multichain.value'), label: t('landing_v2.tractionBar.features.multichain.label') },
    { value: t('landing_v2.tractionBar.features.partners.value'), label: t('landing_v2.tractionBar.features.partners.label') }
  ];
});
</script>

<style scoped>
.traction-bar-container {
  display: flex;
  justify-content: center;
  padding: 1rem 1.25rem;
}

@media (min-width: 640px) {
  .traction-bar-container {
    padding: 1.5rem;
  }
}

.desktop-view {
  display: none;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 2.25rem;
  background-color: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: 14px;
}

@media (min-width: 640px) {
  .desktop-view {
    display: flex;
  }
}

.divider {
  width: 1px;
  height: 2rem;
  background-color: var(--color-border-subtle);
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.feature-value {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-orange);
}

.feature-label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mobile-view {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  width: 100%;
  max-width: 320px;
}

@media (min-width: 640px) {
  .mobile-view {
    display: none;
  }
}

.mobile-feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.75rem 0.5rem;
  background-color: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: 0.75rem;
}

.mobile-feature-value {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-orange);
}

.mobile-feature-label {
  font-size: 0.5625rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>

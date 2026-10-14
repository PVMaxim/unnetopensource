<template>
  <section class="pricing-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Pricing'"
        :title="locales?.title || 'Volume'"
        :titleHighlight="locales?.titleHighlight || 'Pricing'"
        :description="locales?.description || 'Transparent partnership tiers. All plans include manufacturing, security, and logistics.'"
      />

      <div class="grid-layout">
        <RevealOnScroll v-for="(tier, i) in tiersData" :key="i" :delay="i * 0.08">
          <div :class="['pricing-card', { 'highlighted': tier.highlighted }]">
            <span class="tier-name">{{ tier.name }}</span>
            <p class="tier-price">{{ tier.price }}</p>
            <ul class="features-list">
              <li v-for="(feature, j) in tier.features" :key="j" class="feature-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="feature-icon" aria-hidden="true">
                  <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                {{ feature }}
              </li>
            </ul>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from '../shared/RevealOnScroll.vue';
import SectionHeader from '../shared/SectionHeader.vue';

export default defineComponent({
  name: 'Pricing',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.pricing.label'),
      title: t('enterprise_v2.pricing.title'),
      titleHighlight: t('enterprise_v2.pricing.titleHighlight'),
      description: t('enterprise_v2.pricing.description')
    }));

    const tiersData = computed(() => {
      return [
        {
          name: t('enterprise_v2.pricing.tiers.starter.name'),
          volume: t('enterprise_v2.pricing.tiers.starter.volume'),
          price: t('enterprise_v2.pricing.tiers.starter.price'),
          features: [
            t('enterprise_v2.pricing.tiers.starter.f1'),
            t('enterprise_v2.pricing.tiers.starter.f2'),
            t('enterprise_v2.pricing.tiers.starter.f3'),
            t('enterprise_v2.pricing.tiers.starter.f4')
          ]
        },
        {
          name: t('enterprise_v2.pricing.tiers.growth.name'),
          volume: t('enterprise_v2.pricing.tiers.growth.volume'),
          price: t('enterprise_v2.pricing.tiers.growth.price'),
          highlighted: true,
          features: [
            t('enterprise_v2.pricing.tiers.growth.f1'),
            t('enterprise_v2.pricing.tiers.growth.f2'),
            t('enterprise_v2.pricing.tiers.growth.f3'),
            t('enterprise_v2.pricing.tiers.growth.f4'),
            t('enterprise_v2.pricing.tiers.growth.f5')
          ]
        },
        {
          name: t('enterprise_v2.pricing.tiers.enterprise.name'),
          volume: t('enterprise_v2.pricing.tiers.enterprise.volume'),
          price: t('enterprise_v2.pricing.tiers.enterprise.price'),
          features: [
            t('enterprise_v2.pricing.tiers.enterprise.f1'),
            t('enterprise_v2.pricing.tiers.enterprise.f2'),
            t('enterprise_v2.pricing.tiers.enterprise.f3'),
            t('enterprise_v2.pricing.tiers.enterprise.f4'),
            t('enterprise_v2.pricing.tiers.enterprise.f5')
          ]
        }
      ];
    });

    return { locales, tiersData };
  }
});
</script>

<style scoped>
.pricing-section {
  padding-top: 3rem;
  padding-bottom: 3rem;
}

@media (min-width: 640px) {
  .pricing-section {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }
}

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 1.25rem;
}

@media (min-width: 640px) {
  .container {
    padding: 0 1.5rem;
  }
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .grid-layout {
    grid-template-columns: repeat(3, 1fr);
  }
}

.pricing-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  height: calc(100% - 2px - 1.5rem * 2);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  transition: all 0.2s;
}

.pricing-card.highlighted {
  border-color: var(--color-orange-border);
}

.tier-name {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-orange);
}

.tier-volume {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.tier-price {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.75rem;
  margin-bottom: 1rem;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.feature-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
  color: var(--color-orange);
}
</style>

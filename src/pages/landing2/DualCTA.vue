<template>
  <section class="dual-cta-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Get Started'"
        :title="locales?.title || 'Choose Your'"
        :titleHighlight="locales?.titleHighlight || 'Path'"
        :description="locales?.description || 'Whether you\'re an individual or a business, we have a solution for you.'"
      />

      <div class="cta-grid">
        <RevealOnScroll class="h-full">
          <div class="cta-card group">
            <span class="cta-label">{{ locales?.forUsers || 'For Users' }}</span>
            <h3 class="cta-title">
              {{ locales?.forUsersTitle || 'Get Your' }} <span class="gradient-text">{{ locales?.forUsersHighlight || 'Card' }}</span>
            </h3>
            <p class="cta-desc">
              {{ locales?.forUsersDesc || 'One card, multichain, 20,000+ tokens. Starting at $39.' }}
            </p>
            <a
              href="https://shop.united.network/products/nfc-card-wallet/"
              target="_blank"
              rel="noopener noreferrer"
              class="primary-btn gradient-orange"
            >
              {{ locales?.forUsersBtn || 'Shop Now — $39' }}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m0 0l-3-3m3 3l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </div>
        </RevealOnScroll>

        <RevealOnScroll :delay="0.1" class="h-full">
          <div class="cta-card group">
            <span class="cta-label">{{ locales?.forPlatforms || 'For Platforms' }}</span>
            <h3 class="cta-title">
              {{ locales?.forPlatformsTitle || 'White-Label for' }} <span class="gradient-text">{{ locales?.forPlatformsHighlight || 'Your Users' }}</span>
            </h3>
            <p class="cta-desc">
              {{ locales?.forPlatformsDesc || 'Custom-branded NFC wallet cards for your platform.' }}
            </p>
            <router-link to="/enterprise" class="secondary-btn">
              {{ locales?.forPlatformsBtn || 'Explore Enterprise' }}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m0 0l-3-3m3 3l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </router-link>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from './shared/RevealOnScroll.vue';
import SectionHeader from './shared/SectionHeader.vue';

export default defineComponent({
  name: 'DualCTA',
  components: { RevealOnScroll, SectionHeader },
  setup() {
    const { t } = useI18n();
    const locales = computed(() => ({
      label: t('landing_v2.dualCta.label'),
      title: t('landing_v2.dualCta.title'),
      titleHighlight: t('landing_v2.dualCta.titleHighlight'),
      description: t('landing_v2.dualCta.description'),
      forUsers: t('landing_v2.dualCta.forUsers'),
      forUsersTitle: t('landing_v2.dualCta.forUsersTitle'),
      forUsersHighlight: t('landing_v2.dualCta.forUsersHighlight'),
      forUsersDesc: t('landing_v2.dualCta.forUsersDesc'),
      forUsersBtn: t('landing_v2.dualCta.forUsersBtn'),
      forPlatforms: t('landing_v2.dualCta.forPlatforms'),
      forPlatformsTitle: t('landing_v2.dualCta.forPlatformsTitle'),
      forPlatformsHighlight: t('landing_v2.dualCta.forPlatformsHighlight'),
      forPlatformsDesc: t('landing_v2.dualCta.forPlatformsDesc'),
      forPlatformsBtn: t('landing_v2.dualCta.forPlatformsBtn')
    }));

    return { locales };
  }
});
</script>

<style scoped>
.dual-cta-section {
  padding-top: 2rem;
  padding-bottom: 2.5rem;
}

@media (min-width: 640px) {
  .dual-cta-section {
    padding-top: 2.5rem;
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

.cta-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .cta-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.h-full {
  height: 100%;
}

.cta-card {
  position: relative;
  height: calc(100% - 2px - 1.5rem * 2);
  padding: 1.5rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.2s;
}

@media (min-width: 640px) {
  .cta-card {
    padding: 2rem;
    height: calc(100% - 2px - 2rem * 2);
  }
}

.cta-card:hover {
  border-color: var(--color-orange-border);
}

.cta-label {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-orange);
  margin-bottom: 0.75rem;
}

.cta-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.cta-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
  margin-bottom: 1.25rem;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  color: #000;
  font-weight: 700;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s;
}

.primary-btn:hover {
  box-shadow: 0 0 24px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}

.secondary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border-hover);
  color: #fff;
  font-weight: 700;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s;
}

.secondary-btn:hover {
  border-color: var(--color-orange);
  color: var(--color-orange);
  background-color: var(--color-orange-subtle);
}
</style>

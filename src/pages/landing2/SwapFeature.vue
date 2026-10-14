<template>
  <section class="swap-feature-section">
    <div class="fade-top"></div>
    <div class="fade-bottom"></div>

    <div class="container relative">
      <SectionHeader
        :label="locales?.label || 'Built-In Swaps'"
        :title="locales?.title || 'Multichain Swaps —'"
        :titleHighlight="locales?.titleHighlight || 'With a Tap'"
        :description="locales?.description || 'No need to juggle multiple wallets or pay bridge fees. Swap between Ethereum, Solana, Bitcoin, Tron, and more — decentralized, secure, and affordable.'"
      />

      <div class="content-grid">
        <RevealOnScroll class="phone-reveal">
          <div class="phone-container">
            <img
              :src="phoneImg"
              alt="United Network wallet showing swap"
              class="phone-img"
              style="filter: drop-shadow(0 0 80px rgba(255,140,0,0.1));"
            />
          </div>
        </RevealOnScroll>

        <div class="bullets-container">
          <div class="bullets-wrapper">
          <RevealOnScroll v-for="(item, i) in highlightsData" :key="i" :delay="i * 0.08">
            <div class="bullet-item">
              <span class="bullet-icon">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" class="icon-svg">
                  <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span>
                <span class="bullet-label">{{ item.label }}</span>
                <span class="bullet-text hidden-mobile"> — {{ item.text }}</span>
              </span>
            </div>
          </RevealOnScroll>
        </div>
          <RevealOnScroll :delay="0.35">
            <a
              href="/sign-in"
              target="_self"
              rel="noopener noreferrer"
              class="cta-button gradient-orange"
            >
              {{ locales?.cta || 'Try Swaps Now' }}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m0 0l-3-3m3 3l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </RevealOnScroll>
        </div>
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
  name: 'SwapFeature',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('landing_v2.swapFeature.label'),
      title: t('landing_v2.swapFeature.title'),
      titleHighlight: t('landing_v2.swapFeature.titleHighlight'),
      description: t('landing_v2.swapFeature.description'),
      cta: t('landing_v2.swapFeature.cta')
    }));

    const highlightsData = computed(() => {
      return [
        { label: t('landing_v2.swapFeature.multichain.label'), text: t('landing_v2.swapFeature.multichain.text') },
        { label: t('landing_v2.swapFeature.instant.label'), text: t('landing_v2.swapFeature.instant.text') },
        { label: t('landing_v2.swapFeature.lowFees.label'), text: t('landing_v2.swapFeature.lowFees.text') },
        { label: t('landing_v2.swapFeature.selfCustody.label'), text: t('landing_v2.swapFeature.selfCustody.text') }
      ];
    });

    const phoneImg = new URL('@/pages/landing2/assets/images/phone mockups/iphone-15-pro-on-white-background-top-view2.svg', import.meta.url).href;

    return { locales, highlightsData, phoneImg };
  }
});
</script>

<style scoped>
.swap-feature-section {
  padding-top: 2rem;
  padding-bottom: 2rem;
  position: relative;
  overflow: hidden;
}

@media (min-width: 640px) {
  .swap-feature-section {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }
}

.fade-top {
  position: absolute;
  top: 0; left: 0; right: 0; height: 16rem;
  background: linear-gradient(to bottom, var(--color-bg-primary), rgba(13,13,13,0.4), transparent);
  pointer-events: none;
}

.fade-bottom {
  position: absolute;
  bottom: 0; left: 0; right: 0; height: 16rem;
  background: linear-gradient(to top, var(--color-bg-primary), rgba(13,13,13,0.4), transparent);
  pointer-events: none;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.25rem;
}

@media (min-width: 640px) {
  .container {
    padding: 0 1.5rem;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: center;
}

@media (min-width: 768px) {
  .content-grid {
    grid-template-columns: 11fr 9fr;
    gap: 60px;
  }
}

.phone-reveal {
  order: 1;
}

.bullets-container {
  order: 2;
  display: grid;
  gap: 0.75rem;
  width: fit-content;
  margin: 0 auto;
  justify-items: center;
}

.bullets-wrapper {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  width: fit-content;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .bullets-container, .bullets-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    margin: 0;
  }

  .bullets-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0;
  }
}

.phone-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.phone-img {
  width: 100%;
  max-width: 240px;
  height: auto;
  filter: drop-shadow(0 20px 60px rgba(0,0,0,0.5));
}

@media (min-width: 768px) {
  .phone-img {
    max-width: 195px;
  }
}

.bullet-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .bullet-item {
    gap: 1rem;
  }
}

.bullet-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background-color: rgba(247, 147, 26, 0.15);
  color: var(--color-orange);
}

@media (min-width: 768px) {
  .bullet-icon {
    width: 1.5rem;
    height: 1.5rem;
  }
}

.icon-svg {
  width: 10px;
  height: 10px;
}

@media (min-width: 768px) {
  .icon-svg {
    width: 12px;
    height: 12px;
  }
}

.bullet-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

@media (min-width: 768px) {
  .bullet-label {
    font-size: 1.125rem;
  }
}

.hidden-mobile {
  display: none;
}

@media (min-width: 768px) {
  .hidden-mobile {
    display: inline;
  }
}

.bullet-text {
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.75rem;
  margin-top: 1rem;
  border-radius: 0.75rem;
  color: #000;
  font-weight: 700;
  font-size: 0.875rem;
  transition: all 0.2s;
  text-decoration: none;
  grid-column: span 2;
}

@media (min-width: 768px) {
  .cta-button {
    font-size: 1rem;
    grid-column: span 1;
  }
}

.cta-button:hover {
  box-shadow: 0 0 24px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}
</style>

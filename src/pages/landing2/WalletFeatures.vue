<template>
  <section class="wallet-features-section" id="features">
    <div class="container">
      <RevealOnScroll>
        <div class="header-content">
          <span class="label">{{ $t('landing_v2.walletFeatures.label') }}</span>
          <h2 class="title">
            {{ $t('landing_v2.walletFeatures.title') }}
            <span class="gradient-text">{{ $t('landing_v2.walletFeatures.titleHighlight') }}</span>
          </h2>
          <p class="description">{{ $t('landing_v2.walletFeatures.description') }}</p>
        </div>
      </RevealOnScroll>

      <div class="layout-grid">
        <div class="features-list">
          <RevealOnScroll v-for="(feat, i) in featuresData" :key="i" :delay="i * 0.1">
            <div class="feature-card group">
              <div class="icon-wrapper">
                <span v-html="feat.icon"></span>
              </div>
              <div class="feature-text">
                <h3 class="feature-title">{{ feat.title }}</h3>
                <p class="feature-desc">{{ feat.description }}</p>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        <RevealOnScroll :delay="0.2">
          <div class="mockup-container">
            <div class="relative-mockup">
              <img
                :src="cardImg"
                alt="United Network NFC card"
                class="card-img"
              />
              <img
                :src="phoneImg"
                alt="United Network wallet interface"
                class="phone-img"
              />
            </div>
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

export default defineComponent({
  name: 'WalletFeatures',
  components: {
    RevealOnScroll
  },
  setup() {
    const { t } = useI18n();

    const featuresData = computed(() => {
      return [
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>',
          title: t('landing_v2.walletFeatures.sendTokens.title'),
          description: t('landing_v2.walletFeatures.sendTokens.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="7" x2="7" y2="17" /><polyline points="17 17 7 17 7 7" /></svg>',
          title: t('landing_v2.walletFeatures.receiveAssets.title'),
          description: t('landing_v2.walletFeatures.receiveAssets.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>',
          title: t('landing_v2.walletFeatures.multichainSwaps.title'),
          description: t('landing_v2.walletFeatures.multichainSwaps.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>',
          title: t('landing_v2.walletFeatures.walletConnect.title'),
          description: t('landing_v2.walletFeatures.walletConnect.desc')
        }
      ];
    });

    const cardImg = new URL('@/pages/landing2/assets/images/product/Group 427320205.png', import.meta.url).href;
    const phoneImg = new URL('@/pages/landing2/assets/images/phone mockups/iPhone-16-pro-isolated-on-white-background-v4-front-view 1.png', import.meta.url).href;

    return { featuresData, cardImg, phoneImg };
  }
});
</script>

<style scoped>
.wallet-features-section {
  padding-top: 2rem;
  padding-bottom: 0;
}

@media (min-width: 640px) {
  .wallet-features-section {
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

.header-content {
  text-align: center;
  margin-bottom: 2rem;
}

.label {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-orange);
  margin-bottom: 0.75rem;
}

.title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.025em;
  margin-bottom: 0.625rem;
}

.description {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.625;
}

.layout-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: center;
}

@media (min-width: 768px) {
  .layout-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2.5rem;
  }
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  transition: all 0.2s;
}

.feature-card:hover {
  border-color: var(--color-orange-border);
}

.icon-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background-color: var(--color-orange-subtle);
  border: 1px solid var(--color-orange-border);
  color: var(--color-orange);
  transition: transform 0.2s;
}

.feature-card:hover .icon-wrapper {
  transform: scale(1.1);
}

.feature-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.feature-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.mockup-container {
  display: flex;
  justify-content: center;
}

.relative-mockup {
  position: relative;
}

.card-img {
  position: absolute;
  width: 320px;
  height: auto;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-6deg);
  opacity: 0.8;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
}

@media (min-width: 640px) {
  .card-img {
    width: 380px;
  }
}

@media (min-width: 768px) {
  .card-img {
    width: 440px;
  }
}

.phone-img {
  position: relative;
  z-index: 1;
  width: 240px;
  height: auto;
  filter: drop-shadow(0 20px 50px rgba(247, 147, 26, 0.15));
}

@media (min-width: 640px) {
  .phone-img {
    width: 300px;
  }
}

@media (min-width: 768px) {
  .phone-img {
    width: 340px;
  }
}
</style>

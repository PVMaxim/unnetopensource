<template>
  <section class="social-proof-section">
    <div class="container">
      <RevealOnScroll>
        <div class="header">
          <span class="label">{{ locales?.label || 'Multi-Chain' }}</span>
          <h2 class="title">
            {{ locales?.title || 'Multichain' }}
            <span class="gradient-text">{{ locales?.titleHighlight || 'Support' }}</span>
          </h2>
          <p class="description">{{ locales?.description || 'Bitcoin, Ethereum, Solana, and more.' }}</p>
        </div>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.1">
        <div class="chains-grid">
          <div
            v-for="chain in blockchains"
            :key="chain.symbol"
            class="chain-card group"
            :title="chain.name"
          >
            <TokenIcon :tokenIconSymbol="chain?.name" iconClass="icon-wrapper" />
            <span class="chain-name">{{ chain.name }}</span>
          </div>

          <div class="chain-card group" title="More blockchains supported">
            <div class="icon-wrapper">
              <span class="more-icon">+</span>
            </div>
            <span class="chain-name more-text">{{ locales?.more || 'More' }}</span>
          </div>
        </div>
        <p class="footer-text">{{ locales?.tokens || '+ over 20,000 tokens across all supported networks' }}</p>
      </RevealOnScroll>
    </div>
  </section>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from './shared/RevealOnScroll.vue';
import TokenIcon from "@/components/TokenIcon.vue";

export default defineComponent({
  name: 'SocialProof',
  components: { RevealOnScroll, TokenIcon },
  setup() {
    const { t } = useI18n();
    const locales = computed(() => ({
      label: t('landing_v2.socialProof.label'),
      title: t('landing_v2.socialProof.title'),
      titleHighlight: t('landing_v2.socialProof.titleHighlight'),
      description: t('landing_v2.socialProof.description'),
      more: t('landing_v2.socialProof.more'),
      tokens: t('landing_v2.socialProof.tokens')
    }));

    const blockchains = [
      { name: "Bitcoin", symbol: "BTC", logo: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/btc.svg" },
      { name: "Ethereum", symbol: "ETH", logo: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/eth.svg" },
      { name: "Solana", symbol: "SOL", logo: 'solana-sol-logo.svg', local: true },
      { name: "Arbitrum", symbol: "ARB", logo: 'arbitrum-arb-logo.svg', local: true },
      { name: "Avalanche", symbol: "AVAX", logo: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/avax.svg" },
      { name: "BASE", symbol: "BASE", logo: null },
      { name: "Polygon", symbol: "MATIC", logo: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/matic.svg" },
      { name: "TON", symbol: "TON", logo: 'toncoin-ton-logo.svg', local: true },
      { name: "BNB Chain", symbol: "BNB", logo: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/bnb.svg" },
      { name: "Tron", symbol: "TRX", logo: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/trx.svg" },
      { name: "COTI", symbol: "COTI", logo: 'coti-coti-logo.svg', local: true },
    ];

    return { locales, blockchains };
  }
});
</script>

<style scoped>
.social-proof-section {
  padding-top: 2rem;
  padding-bottom: 2.5rem;
}

@media (min-width: 640px) {
  .social-proof-section {
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

.header {
  text-align: center;
  margin-bottom: 1.5rem;
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
  max-width: 460px;
  margin: 0 auto;
  line-height: 1.625;
}

.chains-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  justify-items: center;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
}

@media (min-width: 640px) {
  .chains-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: 1rem;
  }
}

.chain-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  width: calc(100% - 2px - 0.375rem * 2);
  padding: 0.75rem 0.375rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 0.75rem;
  transition: all 0.2s;
}

@media (min-width: 640px) {
  .chain-card {
    gap: 0.5rem;
    padding: 1rem 0.5rem;
    border-radius: 14px;
    width: calc(100% - 2px - .5rem * 2);
  }
}

.chain-card:hover {
  border-color: var(--color-orange-border);
  transform: translateY(-4px);
}

.icon-wrapper {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  overflow: hidden;
  transition: transform 0.2s;
}

@media (min-width: 640px) {
  .icon-wrapper {
    width: 2.5rem;
    height: 2.5rem;
  }
}

.chain-card:hover .icon-wrapper {
  transform: scale(1.1);
}

.chain-logo {
  width: 2rem;
  height: 2rem;
}

@media (min-width: 640px) {
  .chain-logo {
    width: 2.5rem;
    height: 2.5rem;
  }
}

.more-icon {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-muted);
  transition: color 0.2s;
}

@media (min-width: 640px) {
  .more-icon {
    font-size: 1.25rem;
  }
}

.chain-card:hover .more-icon {
  color: var(--color-orange);
}

.chain-name {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.2;
  transition: color 0.2s;
}

@media (min-width: 640px) {
  .chain-name {
    font-size: 0.6875rem;
  }
}

.chain-card:hover .chain-name {
  color: var(--color-text-primary);
}

.more-text {
  color: var(--color-text-muted);
}

.chain-card:hover .more-text {
  color: var(--color-text-secondary);
}

.footer-text {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}
</style>

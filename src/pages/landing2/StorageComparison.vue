<template>
  <section class="storage-comparison-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Self-Custody Matters'"
        :title="locales?.title || 'How Do You Store'"
        :titleHighlight="locales?.titleHighlight || 'Your Crypto?'"
        :description="locales?.description || 'Not all wallets are created equal.'"
      />

      <div class="comparison-grid">
        <RevealOnScroll v-for="(method, i) in methodsData" :key="i" :delay="i * 0.08">
          <div :class="['storage-card', method.highlighted ? 'highlighted group' : 'normal']">
            <div v-if="method.highlighted" class="highlight-glow"></div>

            <div class="card-content">
              <div class="icon-row">
                <div :class="['card-icon', method.highlighted ? 'icon-highlighted' : 'icon-normal']" v-html="method.icon"></div>
                <a
                  v-if="method.highlighted"
                  href="https://shop.united.network/products/nfc-card-wallet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="buy-button gradient-orange"
                >
                  {{ locales?.buyNow || 'Buy Now' }}
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" class="buy-svg">
                    <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </a>
              </div>

              <h3 :class="['card-title', method.highlighted ? 'gradient-text' : '']">
                <span class="lg-hidden">{{ method.titleShort || method.title }}</span>
                <span class="hidden-lg">{{ method.title }}</span>
              </h3>

              <ul class="points-list">
                <li v-for="(point, j) in method.points" :key="j" class="point-item">
                  <span v-if="point.positive === true" class="icon-pos text-emerald">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" class="list-svg"><path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </span>
                  <span v-else-if="point.positive === false" class="icon-pos text-red">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" class="list-svg"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </span>
                  <span v-else class="icon-pos text-muted">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" class="list-svg"><path d="M8 4v8M4 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
                  </span>

                  <span :class="point.positive === true ? 'text-primary' : 'text-secondary'">
                    <span class="lg-hidden">{{ point.short }}</span>
                    <span class="hidden-lg">{{ point.text }}</span>
                  </span>
                </li>
              </ul>

              <p :class="['card-footer', method.highlighted ? 'text-orange' : 'text-muted']">
                <span class="lg-hidden">{{ method.footerShort || method.footer }}</span>
                <span class="hidden-lg">{{ method.footer }}</span>
              </p>
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
import SectionHeader from './shared/SectionHeader.vue';

export default defineComponent({
  name: 'StorageComparison',
  components: { RevealOnScroll, SectionHeader },
  setup() {
    const { t } = useI18n();
    const locales = computed(() => ({
      label: t('landing_v2.storageComparison.label'),
      title: t('landing_v2.storageComparison.title'),
      titleHighlight: t('landing_v2.storageComparison.titleHighlight'),
      description: t('landing_v2.storageComparison.description'),
      buyNow: t('landing_v2.storageComparison.buyNow')
    }));

    const methodsData = computed(() => {
      return [
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>',
          title: t('landing_v2.storageComparison.onExchange.title'),
          points: [
            { text: t('landing_v2.storageComparison.onExchange.p1'), short: t('landing_v2.storageComparison.onExchange.s1'), positive: false },
            { text: t('landing_v2.storageComparison.onExchange.p2'), short: t('landing_v2.storageComparison.onExchange.s2'), positive: null },
            { text: t('landing_v2.storageComparison.onExchange.p3'), short: t('landing_v2.storageComparison.onExchange.s3'), positive: false },
            { text: t('landing_v2.storageComparison.onExchange.p4'), short: t('landing_v2.storageComparison.onExchange.s4'), positive: false },
            { text: t('landing_v2.storageComparison.onExchange.p5'), short: t('landing_v2.storageComparison.onExchange.s5'), positive: false },
          ],
          footer: t('landing_v2.storageComparison.onExchange.footer'), footerShort: t('landing_v2.storageComparison.onExchange.footerShort')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><path d="M12 18h.01" /></svg>',
          title: t('landing_v2.storageComparison.softwareWallet.title'),
          points: [
            { text: t('landing_v2.storageComparison.softwareWallet.p1'), short: t('landing_v2.storageComparison.softwareWallet.s1'), positive: null },
            { text: t('landing_v2.storageComparison.softwareWallet.p2'), short: t('landing_v2.storageComparison.softwareWallet.s2'), positive: null },
            { text: t('landing_v2.storageComparison.softwareWallet.p3'), short: t('landing_v2.storageComparison.softwareWallet.s3'), positive: false },
            { text: t('landing_v2.storageComparison.softwareWallet.p4'), short: t('landing_v2.storageComparison.softwareWallet.s4'), positive: false },
            { text: t('landing_v2.storageComparison.softwareWallet.p5'), short: t('landing_v2.storageComparison.softwareWallet.s5'), positive: false },
          ],
          footer: t('landing_v2.storageComparison.softwareWallet.footer'), footerShort: t('landing_v2.storageComparison.softwareWallet.footerShort')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="M2 8h4" /><path d="M2 16h4" /><path d="M18 8h4" /><path d="M18 16h4" /></svg>',
          title: t('landing_v2.storageComparison.hardwareWallet.title'),
          points: [
            { text: t('landing_v2.storageComparison.hardwareWallet.p1'), short: t('landing_v2.storageComparison.hardwareWallet.s1'), positive: null },
            { text: t('landing_v2.storageComparison.hardwareWallet.p2'), short: t('landing_v2.storageComparison.hardwareWallet.s2'), positive: null },
            { text: t('landing_v2.storageComparison.hardwareWallet.p3'), short: t('landing_v2.storageComparison.hardwareWallet.s3'), positive: false },
            { text: t('landing_v2.storageComparison.hardwareWallet.p4'), short: t('landing_v2.storageComparison.hardwareWallet.s4'), positive: false },
            { text: t('landing_v2.storageComparison.hardwareWallet.p5'), short: t('landing_v2.storageComparison.hardwareWallet.s5'), positive: false },
          ],
          footer: t('landing_v2.storageComparison.hardwareWallet.footer'), footerShort: t('landing_v2.storageComparison.hardwareWallet.footerShort')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M12 9v4" /><path d="M10 11h4" /></svg>',
          title: t('landing_v2.storageComparison.unitedCard.title'), titleShort: t('landing_v2.storageComparison.unitedCard.titleShort'),
          highlighted: true,
          points: [
            { text: t('landing_v2.storageComparison.unitedCard.p1'), short: t('landing_v2.storageComparison.unitedCard.s1'), positive: true },
            { text: t('landing_v2.storageComparison.unitedCard.p2'), short: t('landing_v2.storageComparison.unitedCard.s2'), positive: true },
            { text: t('landing_v2.storageComparison.unitedCard.p3'), short: t('landing_v2.storageComparison.unitedCard.s3'), positive: true },
            { text: t('landing_v2.storageComparison.unitedCard.p4'), short: t('landing_v2.storageComparison.unitedCard.s4'), positive: true },
            { text: t('landing_v2.storageComparison.unitedCard.p5'), short: t('landing_v2.storageComparison.unitedCard.s5'), positive: true },
          ],
          footer: t('landing_v2.storageComparison.unitedCard.footer'), footerShort: t('landing_v2.storageComparison.unitedCard.footerShort')
        }
      ];
    });

    return { locales, methodsData };
  }
});
</script>

<style scoped>
.storage-comparison-section {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

@media (min-width: 640px) {
  .storage-comparison-section {
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

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
}

@media (min-width: 1024px) {
  .comparison-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.875rem;
  }
}

.storage-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0.875rem;
  border-radius: 0.75rem;
  transition: all 0.2s;
  height: calc(100% - 0.875rem * 2);
}

@media (min-width: 1024px) {
  .storage-card {
    padding: 1.5rem;
    border-radius: 1rem;
    height: calc(100% - 1.5rem * 2);
  }
}

.storage-card:hover {
  transform: translateY(-2px);
}

.normal {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
}

.normal:hover {
  border-color: var(--color-border-hover);
}

.highlighted {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-orange-border);
}

.highlight-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(ellipse at center, rgba(247,147,26,0.06) 0%, transparent 70%);
  pointer-events: none;
}

.card-content {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.icon-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

@media (min-width: 1024px) {
  .icon-row {
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
}

@media (min-width: 1024px) {
  .card-icon {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
  }
}

.icon-normal {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
}

.icon-highlighted {
  background-color: var(--color-orange-subtle);
  border: 1px solid var(--color-orange-border);
  color: var(--color-orange);
}

.buy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 2.25rem;
  padding: 0 0.625rem;
  border-radius: 0.5rem;
  color: #000;
  font-weight: 700;
  font-size: 0.6rem;
  text-decoration: none;
  transition: all 0.2s;
}

@media (min-width: 1024px) {
  .buy-button {
    gap: 0.375rem;
    height: 2.75rem;
    padding: 0 0.875rem;
    border-radius: 0.75rem;
    font-size: 0.75rem;
  }
}

.buy-button:hover {
  box-shadow: 0 0 24px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}

.buy-svg {
  width: 12px;
  height: 12px;
}

@media (min-width: 1024px) {
  .buy-svg {
    width: 14px;
    height: 14px;
  }
}

.card-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

@media (min-width: 1024px) {
  .card-title {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
  flex-grow: 1;
  list-style: none;
  padding: 0;
}

@media (min-width: 1024px) {
  .points-list {
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
}

.point-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  line-height: 1.2;
}

@media (min-width: 1024px) {
  .point-item {
    gap: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.625;
  }
}

.icon-pos {
  flex-shrink: 0;
}

.text-emerald { color: #34d399; }
.text-red { color: rgba(248, 113, 113, 0.7); }
.text-muted { color: var(--color-text-muted); }

.list-svg {
  width: 12px;
  height: 12px;
}

@media (min-width: 1024px) {
  .list-svg {
    width: 14px;
    height: 14px;
  }
}

.text-primary { color: var(--color-text-primary); }
.text-secondary { color: var(--color-text-secondary); }

.card-footer {
  font-size: 0.65rem;
  font-style: italic;
  margin-top: auto;
}

@media (min-width: 1024px) {
  .card-footer {
    font-size: 0.75rem;
  }
}

.lg-hidden { display: inline; }
.hidden-lg { display: none; }

@media (min-width: 1024px) {
  .lg-hidden { display: none; }
  .hidden-lg { display: inline; }
}
</style>

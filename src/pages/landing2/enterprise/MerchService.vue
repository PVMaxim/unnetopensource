<template>
  <section class="merch-service-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Exclusive Pack'"
        :title="locales?.title || 'Card-as-a-Merch:'"
        :titleHighlight="locales?.titleHighlight || 'Beyond White-Label'"
      />

      <RevealOnScroll>
        <div class="tagline-container">
          <p class="tagline-main">
            {{ locales?.taglineMain || 'A familiar card becomes a unique merch item that empowers brands with a Web3 tool.' }}
          </p>
          <p class="tagline-sub">
            {{ locales?.taglineSub || 'Launch your own branded merch item that won\'t be left in a warehouse or discarded after your event. Your branded NFC card-wallet provides real value: a secure, convenient self-custody wallet.' }}
          </p>
        </div>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3 class="included-header">
          {{ locales?.includedHeader || 'What\'s Included' }}
        </h3>
      </RevealOnScroll>

      <div class="steps-grid">
        <RevealOnScroll v-for="(step, i) in stepsData" :key="i" :delay="i * 0.08" class="h-full">
          <div class="step-card">
            <span class="step-num">{{ step.num }}</span>
            <h4 class="step-title">{{ step.title }}</h4>
            <p class="step-text">{{ step.text }}</p>
          </div>
        </RevealOnScroll>
      </div>

      <RevealOnScroll>
        <div class="why-merch-box">
          <div class="why-merch-glow"></div>
          <div class="why-merch-content">
            <h3 class="why-title">{{ locales?.whyTitle || 'Why Card-as-a-Merch?' }}</h3>
            <p class="why-desc" v-html="locales?.whyDesc || 'Launch unique merch that won\'t be left in a warehouse — your branded NFC card-wallet provides <span class=\'font-semibold text-text-primary\'>real value</span> and extends your personalized ecosystem.'"></p>

            <div class="benefits-grid">
              <div v-for="(b, i) in benefitsData" :key="i" class="benefit-item">
                <span class="benefit-icon">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                <span class="benefit-text">
                  <span class="benefit-label">{{ b.label }}:</span>
                  {{ b.text }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>

      <RevealOnScroll>
        <div class="cta-container">
          <a
            href="https://calendly.com/akril212/30min"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-button gradient-orange"
          >
            {{ locales?.cta || 'Request Merch Pack Info' }}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
        </div>
      </RevealOnScroll>
    </div>
  </section>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from '../shared/RevealOnScroll.vue';
import SectionHeader from '../shared/SectionHeader.vue';

export default defineComponent({
  name: 'MerchService',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.merch.label'),
      title: t('enterprise_v2.merch.title'),
      titleHighlight: t('enterprise_v2.merch.titleHighlight'),
      taglineMain: t('enterprise_v2.merch.taglineMain'),
      taglineSub: t('enterprise_v2.merch.taglineSub'),
      includedHeader: t('enterprise_v2.merch.includedHeader'),
      whyTitle: t('enterprise_v2.merch.whyTitle'),
      whyDesc: t('enterprise_v2.merch.whyDesc'),
      cta: t('enterprise_v2.merch.cta')
    }));

    const stepsData = computed(() => {
      return [
        { num: '01', title: t('enterprise_v2.merch.steps.s1.title'), text: t('enterprise_v2.merch.steps.s1.desc') },
        { num: '02', title: t('enterprise_v2.merch.steps.s2.title'), text: t('enterprise_v2.merch.steps.s2.desc') },
        { num: '03', title: t('enterprise_v2.merch.steps.s3.title'), text: t('enterprise_v2.merch.steps.s3.desc') },
        { num: '04', title: t('enterprise_v2.merch.steps.s4.title'), text: t('enterprise_v2.merch.steps.s4.desc') }
      ];
    });

    const benefitsData = computed(() => {
      return [
        { label: t('enterprise_v2.merch.benefits.b1.label'), text: t('enterprise_v2.merch.benefits.b1.text') },
        { label: t('enterprise_v2.merch.benefits.b2.label'), text: t('enterprise_v2.merch.benefits.b2.text') },
        { label: t('enterprise_v2.merch.benefits.b3.label'), text: t('enterprise_v2.merch.benefits.b3.text') },
        { label: t('enterprise_v2.merch.benefits.b4.label'), text: t('enterprise_v2.merch.benefits.b4.text') }
      ];
    });

    return { locales, stepsData, benefitsData };
  }
});
</script>

<style scoped>
.merch-service-section {
  padding-top: 2.5rem;
  padding-bottom: 2.5rem;
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

.tagline-container {
  text-align: center;
  max-width: 640px;
  margin: -0.5rem auto 2.5rem;
}

.tagline-main {
  font-size: 0.9375rem;
  font-style: italic;
  color: var(--color-text-secondary);
  line-height: 1.625;
  margin-bottom: 0.75rem;
}

.tagline-sub {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.625;
}

.included-header {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-orange);
  margin-bottom: 1.5rem;
}

.steps-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
  margin-bottom: 1.75rem;
  align-items: stretch;
}

@media (min-width: 640px) {
  .steps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .steps-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.h-full { height: 100%; }

.step-card {
  position: relative;
  padding: 1.25rem;
  height: calc(100% - 2px - 1.25rem * 2);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  transition: all 0.2s;
}

.step-card:hover {
  border-color: var(--color-orange-border);
  background-color: var(--color-bg-card-hover);
  transform: translateY(-0.125rem);
}

.step-num {
  display: block;
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-orange);
  line-height: 1;
  margin-bottom: 0.75rem;
}

.step-title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.step-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.why-merch-box {
  position: relative;
  padding: 1.5rem;
  background-color: var(--color-bg-card);
  border: 2px solid var(--color-orange-border);
  border-radius: 1rem;
  overflow: hidden;
  margin-bottom: 1.75rem;
}

@media (min-width: 640px) {
  .why-merch-box {
    padding: 2rem;
  }
}

.why-merch-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(247,147,26,0.06) 0%, transparent 60%);
  pointer-events: none;
}

.why-merch-content {
  position: relative;
}

.why-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-orange);
  margin-bottom: 0.75rem;
}

@media (min-width: 640px) {
  .why-title { font-size: 1.25rem; }
}

.why-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
  margin-bottom: 1.25rem;
}

:deep(.font-semibold) { font-weight: 600; }
:deep(.text-text-primary) { color: var(--color-text-primary); }

.benefits-grid {
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 2rem;
  row-gap: 1rem;
}

@media (min-width: 640px) {
  .benefits-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.benefit-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background-color: rgba(247,147,26,0.15);
  color: var(--color-orange);
}

.benefit-text {
  font-size: 0.875rem;
  line-height: 1.625;
  color: var(--color-text-secondary);
}

.benefit-label {
  font-weight: 600;
  color: var(--color-text-primary);
}

.cta-container {
  display: flex;
  justify-content: center;
  margin-top: 1.75rem;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.75rem;
  border-radius: 0.75rem;
  color: #000;
  font-weight: 700;
  font-size: 0.9375rem;
  transition: all 0.2s;
  text-decoration: none;
}

.cta-button:hover {
  box-shadow: 0 0 32px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}
</style>

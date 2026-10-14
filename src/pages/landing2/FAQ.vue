<template>
  <section id="faq" class="faq-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'FAQ'"
        :title="locales?.title || 'Common'"
        :titleHighlight="locales?.titleHighlight || 'Questions'"
      />

      <div class="faq-grid">
        <RevealOnScroll class="h-full order-feedback">
          <div class="feedback-card">
            <div class="dot-grid"></div>
            <div class="radial-glow"></div>

            <div class="feedback-content">
              <div class="icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>

              <span class="fb-label">{{ locales?.feedbackLabel || 'Community-Driven' }}</span>
              <h3 class="fb-title">
                {{ locales?.feedbackTitle || 'Help Us' }} <span class="gradient-text">{{ locales?.feedbackHighlight || 'Build Better' }}</span>
              </h3>
              <p class="fb-desc">
                {{ locales?.feedbackDesc || 'Your feedback shapes the future of self-custody.' }}
              </p>

              <div class="fb-buttons">
                <a
                  href="https://feedback.united.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-primary gradient-orange"
                >
                  <span class="md-hidden">Feedback</span>
                  <span class="hidden-md">{{ locales?.btnFeedback || 'Share Feedback' }}</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10m0 0l-3-3m3 3l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </a>
                <a
                  href="mailto:team@unitednetwork.cards"
                  class="btn-secondary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 4l-10 8L2 4" />
                  </svg>
                  {{ locales?.btnEmail || 'Email Us' }}
                </a>
              </div>

              <div
                class="easter-egg"
                :style="{ maxHeight: openIndex !== null ? '80px' : '0' }"
              >
                <p
                  class="egg-text"
                  :style="{
                    opacity: openIndex !== null ? 1 : 0
                  }"
                >
                  {{ locales?.easterEgg || 'We\'re happy to hear from you.' }}
                </p>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        <div class="accordion-container order-accordion">
          <RevealOnScroll v-for="(faq, i) in faqsData" :key="i" :delay="i * 0.03">
            <div class="faq-item">
              <button
                @click="toggle(i)"
                class="faq-btn"
              >
                <span class="faq-q">{{ faq.q }}</span>
                <svg
                  width="20" height="20" viewBox="0 0 20 20" fill="none"
                  :class="['faq-icon', openIndex === i ? 'icon-open' : '']"
                >
                  <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <div
                class="faq-a-wrapper"
                :style="{ maxHeight: openIndex === i ? '200px' : '0' }"
              >
                <p class="faq-a">{{ faq.a }}</p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from './shared/RevealOnScroll.vue';
import SectionHeader from './shared/SectionHeader.vue';

export default defineComponent({
  name: 'FAQSection',
  components: { RevealOnScroll, SectionHeader },
  setup() {
    const { t } = useI18n();
    const locales = computed(() => ({
      label: t('landing_v2.faq.label'),
      title: t('landing_v2.faq.title'),
      titleHighlight: t('landing_v2.faq.titleHighlight'),
      feedbackLabel: t('landing_v2.faq.feedbackLabel'),
      feedbackTitle: t('landing_v2.faq.feedbackTitle'),
      feedbackHighlight: t('landing_v2.faq.feedbackHighlight'),
      feedbackDesc: t('landing_v2.faq.feedbackDesc'),
      btnFeedback: t('landing_v2.faq.btnFeedback'),
      btnEmail: t('landing_v2.faq.btnEmail'),
      easterEgg: t('landing_v2.faq.easterEgg')
    }));

    const openIndex = ref(null);
    const toggle = (i) => {
      openIndex.value = openIndex.value === i ? null : i;
    };

    const faqsData = computed(() => {
      return [
        { q: t('landing_v2.faq.q1.q'), a: t('landing_v2.faq.q1.a') },
        { q: t('landing_v2.faq.q2.q'), a: t('landing_v2.faq.q2.a') },
        { q: t('landing_v2.faq.q3.q'), a: t('landing_v2.faq.q3.a') },
        { q: t('landing_v2.faq.q4.q'), a: t('landing_v2.faq.q4.a') },
        { q: t('landing_v2.faq.q5.q'), a: t('landing_v2.faq.q5.a') }
      ];
    });

    return { locales, openIndex, toggle, faqsData };
  }
});
</script>

<style scoped>
.faq-section {
  padding-top: 2rem;
  padding-bottom: 2.5rem;
}

@media (min-width: 640px) {
  .faq-section {
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

.faq-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: stretch;
}

@media (min-width: 768px) {
  .faq-grid {
    grid-template-columns: 5fr 7fr;
    gap: 2rem;
  }
}

.h-full {
  height: 100%;
}

.order-feedback {
  order: 2;
}
.order-accordion {
  order: 1;
}

@media (min-width: 768px) {
  .order-feedback {
    order: 1;
  }
  .order-accordion {
    order: 2;
  }
}

.feedback-card {
  position: relative;
  padding: 1.25rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  overflow: hidden;
  height: calc(100% - 1.25rem * 2);
}

@media (min-width: 640px) {
  .feedback-card {
    padding: 1.5rem;
    height: calc(100% - 1.5rem * 2);
  }
}

.dot-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px);
  background-size: 24px 24px;
}

.radial-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(247,147,26,0.06) 0%, transparent 60%);
  pointer-events: none;
}

.feedback-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background-color: var(--color-orange-subtle);
  border: 1px solid var(--color-orange-border);
  color: var(--color-orange);
  margin-bottom: 0.75rem;
}

.fb-label {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-orange);
  margin-bottom: 0.5rem;
}

.fb-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.375rem;
}

@media (min-width: 640px) {
  .fb-title {
    font-size: 1.5rem;
  }
}

.fb-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
  margin-bottom: 1rem;
}

.fb-buttons {
  display: flex;
  gap: 0.625rem;
}

.btn-primary {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.75rem;
  color: #000;
  font-weight: 700;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s;
}

@media (min-width: 768px) {
  .btn-primary {
    flex: none;
  }
}

.btn-primary:hover {
  box-shadow: 0 0 24px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}

.btn-secondary {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: 0.875rem;
  transition: all 0.2s;
  text-decoration: none;
}

@media (min-width: 768px) {
  .btn-secondary {
    flex: none;
  }
}

.btn-secondary:hover {
  border-color: var(--color-orange-border);
  color: var(--color-orange);
  transform: translateY(-2px);
}

.md-hidden { display: inline; }
.hidden-md { display: none; }

@media (min-width: 768px) {
  .md-hidden { display: none; }
  .hidden-md { display: inline; }
}

.easter-egg {
  overflow: hidden;
  transition: all 0.5s;
  display: none;
}

@media (min-width: 768px) {
  .easter-egg {
    display: block;
  }
}

.egg-text {
  padding-top: 0.75rem;
  font-size: 1.375rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.025em;
  transition: opacity 0.7s;
  user-select: none;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.08);
  -webkit-text-fill-color: transparent;
}

@media (min-width: 640px) {
  .egg-text {
    font-size: 1.75rem;
  }
}

.accordion-container {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.faq-item {
  border: 1px solid var(--color-border-subtle);
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.faq-item:hover {
  border-color: var(--color-border-hover);
}

.faq-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1.125rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--color-text-primary);
}

.faq-q {
  font-size: 0.9375rem;
  font-weight: 500;
}

.faq-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: transform 0.3s;
}

.icon-open {
  transform: rotate(180deg);
  color: var(--color-orange);
}

.faq-a-wrapper {
  overflow: hidden;
  transition: all 0.5s;
}

.faq-a {
  padding: 0 1.125rem 0.875rem 1.125rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}
</style>

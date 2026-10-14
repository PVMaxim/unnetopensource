<template>
  <section class="partnership-cta-section">
    <div class="container">
      <RevealOnScroll>
        <div class="cta-box">
          <div class="cta-glow"></div>

          <div class="cta-content">
            <span class="cta-label">{{ locales?.label || 'Get Started' }}</span>
            <h2 class="cta-title">
              {{ locales?.title || 'Ready to explore a ' }}
              <span class="gradient-text">{{ locales?.titleHighlight || 'partnership?' }}</span>
            </h2>
            <p class="cta-description">
              {{ locales?.description || 'Whether you\'re deploying 1,000 cards or 100,000, we\'ll tailor a solution to your platform. Let\'s talk.' }}
            </p>

            <div class="cta-buttons">
              <a
                href="https://calendly.com/akril212/30min"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary gradient-orange"
              >
                {{ locales?.btnPrimary || 'Schedule a Call' }}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
              <a
                href="mailto:partnerships@united.network"
                class="btn-secondary"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 4l-10 8L2 4" />
                </svg>
                {{ locales?.btnSecondary || 'Email Us' }}
              </a>
            </div>

            <p class="cta-note">
              {{ locales?.note || 'Typical response time: 24 hours. NDA available on request.' }}
            </p>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  </section>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from '../shared/RevealOnScroll.vue';

export default defineComponent({
  name: 'PartnershipCTA',
  components: {
    RevealOnScroll
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.cta.label'),
      title: t('enterprise_v2.cta.title'),
      titleHighlight: t('enterprise_v2.cta.titleHighlight'),
      description: t('enterprise_v2.cta.description'),
      btnPrimary: t('enterprise_v2.cta.btnPrimary'),
      btnSecondary: t('enterprise_v2.cta.btnSecondary'),
      note: t('enterprise_v2.cta.note')
    }));

    return { locales };
  }
});
</script>

<style scoped>
.partnership-cta-section {
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

.cta-box {
  position: relative;
  padding: 2rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  overflow: hidden;
  text-align: center;
}

@media (min-width: 768px) {
  .cta-box {
    padding: 2.5rem;
  }
}

.cta-glow {
  position: absolute;
  width: 400px;
  height: 400px;
  background-color: var(--color-orange);
  border-radius: 9999px;
  filter: blur(120px);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.05;
  pointer-events: none;
}

.cta-content {
  position: relative;
  z-index: 1;
}

.cta-label {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-orange);
  margin-bottom: 0.75rem;
}

.cta-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.025em;
  margin-bottom: 0.75rem;
}

.cta-description {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
  max-width: 460px;
  margin: 0 auto 2rem;
}

.cta-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  width: 100%;
}

@media (min-width: 640px) {
  .cta-buttons {
    flex-direction: row;
    width: auto;
  }
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1.75rem;
  border-radius: 0.75rem;
  color: #000;
  font-weight: 700;
  font-size: 0.9375rem;
  transition: all 0.2s;
  text-decoration: none;
}

@media (min-width: 640px) {
  .btn-primary { width: auto; }
}

.btn-primary:hover {
  box-shadow: 0 0 32px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: 0.9375rem;
  transition: all 0.2s;
  text-decoration: none;
}

@media (min-width: 640px) {
  .btn-secondary { width: auto; }
}

.btn-secondary:hover {
  border-color: var(--color-orange-border);
  color: var(--color-orange);
  transform: translateY(-2px);
}

.cta-note {
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>

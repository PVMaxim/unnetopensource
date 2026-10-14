<template>
  <section class="enterprise-hero">
    <div class="background-container">
      <div class="bg-grid"></div>
      <div class="glow-orange"></div>
      <div class="glow-orange-dark"></div>
      <div class="fade-to-black"></div>
    </div>

    <div class="content-container">
      <RevealOnScroll>
        <span class="badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          {{ locales.badge }}
        </span>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.05">
        <h1 class="title">
          {{ locales.titleP1 }}<br />
          <span class="gradient-text">{{ locales.titleP2 }}</span>
        </h1>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.1">
        <p class="subtitle">
          {{ locales.subtitle }}
        </p>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.12">
        <p class="micro-note">
          {{ locales.micronote }}
        </p>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.15">
        <div class="cta-group">
          <a
            href="https://calendly.com/akril212/30min"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-primary gradient-orange"
          >
            {{ locales.ctaPrimary }}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
          <a
            href="mailto:partnerships@united.network"
            class="cta-secondary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4l-10 8L2 4" />
            </svg>
            {{ locales.ctaSecondary }}
          </a>
        </div>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.2">
        <div class="trust-signals">
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9l-3 1.5.5-3.5L2 4.5l3.5-.5L7 1z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" />
            </svg>
            {{ locales.trust1 }}
          </span>
          <span class="divider"></span>
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v4l3 2" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1" />
            </svg>
            {{ locales.trust2 }}
          </span>
          <span class="divider"></span>
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.75 2.75l1.5 1.5M9.75 9.75l1.5 1.5M11.25 2.75l-1.5 1.5M4.25 9.75l-1.5 1.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
            </svg>
            {{ locales.trust3 }}
          </span>
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
  name: 'EnterpriseHero',
  components: {
    RevealOnScroll
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      badge: t('enterprise_v2.hero.badge'),
      titleP1: t('enterprise_v2.hero.titleP1'),
      titleP2: t('enterprise_v2.hero.titleP2'),
      subtitle: t('enterprise_v2.hero.subtitle'),
      micronote: t('enterprise_v2.hero.micronote'),
      ctaPrimary: t('enterprise_v2.hero.ctaPrimary'),
      ctaSecondary: t('enterprise_v2.hero.ctaSecondary'),
      trust1: t('enterprise_v2.hero.trust1'),
      trust2: t('enterprise_v2.hero.trust2'),
      trust3: t('enterprise_v2.hero.trust3')
    }));

    return { locales };
  }
});
</script>

<style scoped>
.enterprise-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 7rem;
  padding-bottom: 2.5rem;
  overflow: hidden;
}

.background-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.bg-grid {
  position: absolute;
  inset: 0;
}

.glow-orange {
  position: absolute;
  width: 600px;
  height: 600px;
  background-color: var(--color-orange);
  border-radius: 9999px;
  filter: blur(180px);
  top: -300px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.06;
  animation: glowPulse 8s ease-in-out infinite;
}

.glow-orange-dark {
  position: absolute;
  width: 300px;
  height: 300px;
  background-color: var(--color-orange-dark);
  border-radius: 9999px;
  filter: blur(150px);
  bottom: -100px;
  left: -100px;
  opacity: 0.03;
  animation: glowPulse 8s ease-in-out infinite 4s;
}

.fade-to-black {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 12rem;
  background: linear-gradient(to bottom, transparent, var(--color-bg-primary));
}

.content-container {
  position: relative;
  z-index: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 1.25rem;
}

@media (min-width: 640px) {
  .content-container {
    padding: 0 1.5rem;
  }
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  background-color: var(--color-orange-subtle);
  border: 1px solid var(--color-orange-border);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-orange);
  margin-bottom: 1.5rem;
}

.title {
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.05em;
  margin-bottom: 0.875rem;
}

.subtitle {
  font-size: clamp(0.9375rem, 1.5vw, 1rem);
  color: var(--color-text-secondary);
  max-width: 560px;
  margin-bottom: 1rem;
  line-height: 1.625;
}

.micro-note {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 1.75rem;
}

.cta-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  width: 100%;
}

@media (min-width: 640px) {
  .cta-group {
    flex-direction: row;
    width: auto;
    justify-content: center;
  }
}

.cta-primary {
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
  .cta-primary {
    width: auto;
  }
}

.cta-primary:hover {
  box-shadow: 0 0 32px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}

.cta-secondary {
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
  .cta-secondary {
    width: auto;
  }
}

.cta-secondary:hover {
  border-color: var(--color-orange-border);
  color: var(--color-orange);
  transform: translateY(-2px);
}

.trust-signals {
  margin-top: 2rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.divider {
  width: 1px;
  height: 0.75rem;
  background-color: var(--color-border-subtle);
}
</style>

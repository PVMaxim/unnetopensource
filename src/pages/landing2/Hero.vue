<template>
  <section class="hero-section">
    <div class="background-container">
      <div class="bg-grid"></div>
      <div class="glow-orange"></div>
      <div class="glow-orange-dark"></div>
      <div class="fade-to-black"></div>
    </div>

    <div class="content-container">
      <RevealOnScroll :delay="0">
        <span class="badge">
          <span class="dot-pulse"></span>
          {{ $t('landing_v2.hero.shippingBadge') }}
        </span>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.1">
        <h1 class="title">
          {{ $t('landing_v2.hero.titlePart1') }}<br class="mobile-hidden" />
          {{ $t('landing_v2.hero.titlePart2') }}<br />
          <span class="gradient-text">{{ $t('landing_v2.hero.titlePart3') }}</span>
        </h1>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.2">
        <p class="subtitle">
          {{ $t('landing_v2.hero.subtitle') }}
        </p>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.3">
        <div class="cta-group">
          <a
            href="https://shop.united.network/products/nfc-card-wallet/"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-primary gradient-orange"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            {{ $t('landing_v2.hero.buyCta') }}
          </a>

          <a
            href="/sign-in"
            target="_self"
            rel="noopener noreferrer"
            class="cta-secondary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {{ $t('landing_v2.hero.connectCta') }}
          </a>

          <router-link
            to="/enterprise"
            class="cta-tertiary hidden-mobile"
          >
            {{ $t('landing_v2.hero.whiteLabelCta') }}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </router-link>
        </div>
      </RevealOnScroll>

      <RevealOnScroll :delay="0.5">
        <Card3D />
      </RevealOnScroll>
    </div>
  </section>
</template>

<script setup>
import RevealOnScroll from './shared/RevealOnScroll.vue';
import Card3D from './shared/Card3D.vue';
</script>

<style scoped>
.hero-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 5rem;
  padding-bottom: 0;
  overflow: hidden;
}

@media (min-width: 640px) {
  .hero-section {
    padding-top: 6rem;
  }
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
  filter: blur(120px);
  top: -250px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.12;
  animation: glowPulse 8s ease-in-out infinite;
}

.glow-orange-dark {
  position: absolute;
  width: 400px;
  height: 400px;
  background-color: var(--color-orange-dark);
  border-radius: 9999px;
  filter: blur(120px);
  bottom: -100px;
  right: -100px;
  opacity: 0.08;
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
  margin-bottom: 1rem;
}

.dot-pulse {
  width: 0.375rem;
  height: 0.375rem;
  background-color: var(--color-positive);
  border-radius: 9999px;
  animation: dotPulse 2s ease-in-out infinite;
}

.title {
  font-size: clamp(2.75rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.05em;
  margin-bottom: 0.875rem;
}

.mobile-hidden {
  display: block;
}

@media (min-width: 640px) {
  .mobile-hidden {
    display: none;
  }
}

.subtitle {
  font-size: clamp(0.9375rem, 1.5vw, 1rem);
  color: var(--color-text-secondary);
  max-width: 500px;
  margin-bottom: 1.25rem;
  line-height: 1.625;
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

.cta-primary:hover {
  box-shadow: 0 0 32px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}

@media (min-width: 640px) {
  .cta-primary {
    width: auto;
  }
}

.cta-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border-hover);
  color: white;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: all 0.2s;
  text-decoration: none;
}

.cta-secondary:hover {
  border-color: var(--color-orange);
  color: var(--color-orange);
  background-color: var(--color-orange-subtle);
}

@media (min-width: 640px) {
  .cta-secondary {
    width: auto;
  }
}

.cta-tertiary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.875rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: color 0.2s;
  text-decoration: none;
}

.cta-tertiary:hover {
  color: var(--color-orange);
}

.hidden-mobile {
  display: none;
}

@media (min-width: 640px) {
  .hidden-mobile {
    display: inline-flex;
  }
}
</style>

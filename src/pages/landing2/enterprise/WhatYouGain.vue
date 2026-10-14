<template>
  <section class="what-you-gain">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'What You Gain'"
        :title="locales?.title || 'Six reasons to'"
        :titleHighlight="locales?.titleHighlight || 'partner.'"
      />

      <div class="grid-layout">
        <RevealOnScroll v-for="(item, i) in gainsData" :key="i" :delay="i * 0.08">
          <div
            class="gain-card card-glow"
            @mousemove="handleMouseMove"
          >
            <div class="icon-box" v-html="item.icon"></div>
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-description">{{ item.description }}</p>
            <span class="highlight-badge">{{ item.highlight }}</span>
          </div>
        </RevealOnScroll>

        <RevealOnScroll :delay="0.48">
          <div
            class="gain-card mystery-card card-glow group"
            @mousemove="handleMouseMove"
          >
            <div class="mystery-bg">
              <div class="particle p1"></div>
              <div class="particle p2"></div>
              <div class="particle p3"></div>
              <div class="particle p4"></div>
              <div class="particle p5"></div>
              
              <div class="pulse-glow"></div>
              
              <div class="ring-rotate"></div>
              <div class="ring-rotate-reverse"></div>
            </div>

            <div class="mystery-content">
              <div class="icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <h3 class="card-title">{{ locales.mysteryTitle }}</h3>
              <p class="card-description">{{ locales.mysteryDesc }}</p>
              
              <a
                href="https://calendly.com/akril212/30min"
                target="_blank"
                rel="noopener noreferrer"
                class="mystery-cta gradient-orange"
              >
                {{ locales.mysteryCta }}
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
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
import RevealOnScroll from '../shared/RevealOnScroll.vue';
import SectionHeader from '../shared/SectionHeader.vue';

export default defineComponent({
  name: 'WhatYouGain',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.whatYouGain.label'),
      title: t('enterprise_v2.whatYouGain.title'),
      titleHighlight: t('enterprise_v2.whatYouGain.titleHighlight'),
      mysteryTitle: t('enterprise_v2.whatYouGain.mysteryTitle'),
      mysteryDesc: t('enterprise_v2.whatYouGain.mysteryDesc'),
      mysteryCta: t('enterprise_v2.whatYouGain.mysteryCta')
    }));

    const gainsData = computed(() => {
      return [
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>',
          title: t('enterprise_v2.whatYouGain.items.revenue.title'),
          description: t('enterprise_v2.whatYouGain.items.revenue.desc'),
          highlight: t('enterprise_v2.whatYouGain.items.revenue.highlight')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>',
          title: t('enterprise_v2.whatYouGain.items.onboarding.title'),
          description: t('enterprise_v2.whatYouGain.items.onboarding.desc'),
          highlight: t('enterprise_v2.whatYouGain.items.onboarding.highlight')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>',
          title: t('enterprise_v2.whatYouGain.items.retention.title'),
          description: t('enterprise_v2.whatYouGain.items.retention.desc'),
          highlight: t('enterprise_v2.whatYouGain.items.retention.highlight')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>',
          title: t('enterprise_v2.whatYouGain.items.exposure.title'),
          description: t('enterprise_v2.whatYouGain.items.exposure.desc'),
          highlight: t('enterprise_v2.whatYouGain.items.exposure.highlight')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><path d="M8 21h8M12 17v4" /></svg>',
          title: t('enterprise_v2.whatYouGain.items.product.title'),
          description: t('enterprise_v2.whatYouGain.items.product.desc'),
          highlight: t('enterprise_v2.whatYouGain.items.product.highlight')
        }
      ];
    });

    const handleMouseMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
      e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
    };

    return { locales, gainsData, handleMouseMove };
  }
});
</script>

<style scoped>
.what-you-gain {
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

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}

@media (min-width: 640px) {
  .grid-layout {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-layout {
    grid-template-columns: repeat(3, 1fr);
  }
}

.gain-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  height: calc(100% - 2px - 1.25rem * 2);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.2s;
}

.gain-card:hover {
  border-color: var(--color-orange-border);
  background-color: var(--color-bg-card-hover);
  transform: translateY(-0.125rem);
}

.icon-box {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-orange);
  background-color: var(--color-orange-subtle);
  border-radius: 0.75rem;
  border: 1px solid var(--color-orange-border);
  margin-bottom: 0.25rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
}

.card-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.highlight-badge {
  display: inline-flex;
  align-self: flex-start;
  margin-top: auto;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-orange);
  background-color: var(--color-orange-subtle);
  padding: 0.25rem 0.625rem;
  border-radius: 0.5rem;
}

.mystery-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  border-radius: 9999px;
  background-color: rgba(247, 147, 26, 0.2);
}

.p1 {
  width: 0.375rem; height: 0.375rem;
  top: 15%; left: 20%;
  animation: mysteryFloat1 4s ease-in-out infinite;
}
.p2 {
  width: 0.25rem; height: 0.25rem;
  top: 40%; right: 25%;
  background-color: rgba(247, 147, 26, 0.15);
  animation: mysteryFloat2 5s ease-in-out infinite 0.5s;
}
.p3 {
  width: 0.5rem; height: 0.5rem;
  bottom: 30%; left: 60%;
  background-color: rgba(247, 147, 26, 0.1);
  animation: mysteryFloat1 6s ease-in-out infinite 1s;
}
.p4 {
  width: 0.25rem; height: 0.25rem;
  top: 60%; left: 40%;
  animation: mysteryFloat2 3.5s ease-in-out infinite 0.3s;
}
.p5 {
  width: 0.375rem; height: 0.375rem;
  bottom: 20%; right: 35%;
  background-color: rgba(247, 147, 26, 0.15);
  animation: mysteryFloat1 5s ease-in-out infinite 1.5s;
}

.pulse-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 180px; height: 180px;
  border-radius: 9999px;
  background-color: rgba(247, 147, 26, 0.04);
  filter: blur(60px);
  animation: glowPulse 4s ease-in-out infinite;
  transition: background-color 0.3s;
}

.mystery-card:hover .pulse-glow {
  background-color: rgba(247, 147, 26, 0.08);
}

.ring-rotate {
  position: absolute;
  top: 50%; left: 50%;
  margin-top: -50px;
  margin-left: -50px;
  width: 100px; height: 100px;
  border-radius: 9999px;
  border: 1px dashed rgba(247, 147, 26, 0.1);
  animation: ringRotate 20s linear infinite;
  transition: border-color 0.3s;
}

.mystery-card:hover .ring-rotate {
  border-color: rgba(247, 147, 26, 0.2);
}

.ring-rotate-reverse {
  position: absolute;
  top: 50%; left: 50%;
  margin-top: -30px;
  margin-left: -30px;
  width: 60px; height: 60px;
  border-radius: 9999px;
  border: 1px dashed rgba(247, 147, 26, 0.07);
  animation: ringRotate 15s linear infinite reverse;
  transition: border-color 0.3s;
}

.mystery-card:hover .ring-rotate-reverse {
  border-color: rgba(247, 147, 26, 0.15);
}

.mystery-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
}

.mystery-cta {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.5rem;
  margin-top: auto;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  color: #000;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s;
}

.mystery-cta:hover {
  box-shadow: 0 0 20px 3px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}
</style>

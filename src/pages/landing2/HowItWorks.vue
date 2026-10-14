<template>
  <section id="how-it-works" class="how-it-works-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'How It Works'"
        :title="locales?.title || 'Tap. Confirm.'"
        :titleHighlight="locales?.titleHighlight || 'Done.'"
        :description="locales?.description || 'Three steps. No apps, no cables, no complexity.'"
      />

      <div class="steps-grid">
        <RevealOnScroll v-for="(step, i) in stepsData" :key="i" :delay="i * 0.1" class="h-full">
          <div class="step-card group">
            <div class="step-header">
              <span class="step-number">{{ step.number }}</span>
              <div class="step-icon-wrapper" v-html="step.icon"></div>
            </div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-desc">{{ step.description }}</p>
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
  name: 'HowItWorks',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('landing_v2.howItWorks.label'),
      title: t('landing_v2.howItWorks.title'),
      titleHighlight: t('landing_v2.howItWorks.titleHighlight'),
      description: t('landing_v2.howItWorks.description')
    }));

    const stepsData = computed(() => {
      return [
        {
          number: "01",
          title: t('landing_v2.howItWorks.step1.title'),
          description: t('landing_v2.howItWorks.step1.desc'),
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><path d="M12 18h.01" /></svg>'
        },
        {
          number: "02",
          title: t('landing_v2.howItWorks.step2.title'),
          description: t('landing_v2.howItWorks.step2.desc'),
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>'
        },
        {
          number: "03",
          title: t('landing_v2.howItWorks.step3.title'),
          description: t('landing_v2.howItWorks.step3.desc'),
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>'
        }
      ];
    });

    return { locales, stepsData };
  }
});
</script>

<style scoped>
.how-it-works-section {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

@media (min-width: 640px) {
  .how-it-works-section {
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

.steps-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .steps-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.h-full {
  height: 100%;
}

.step-card {
  position: relative;
  height: calc(100% - 2px - 1.5rem * 2);
  padding: 1.5rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  transition: all 0.2s;
}

.step-card:hover {
  border-color: var(--color-orange-border);
  transform: translateY(-2px);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background-color: var(--color-orange-subtle);
  border: 1px solid var(--color-orange-border);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-orange);
}

.step-icon-wrapper {
  color: var(--color-orange);
  transition: transform 0.2s;
}

.step-card:hover .step-icon-wrapper {
  transform: scale(1.1);
}

.step-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.step-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}
</style>

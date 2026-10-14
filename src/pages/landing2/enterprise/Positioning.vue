<template>
  <section class="positioning-section">
    <div class="container">
      <RevealOnScroll>
        <div class="text-center mb-6">
          <span class="inline-block font-mono text-[0.6875rem] font-medium tracking-[0.14em] uppercase text-orange mb-3">
            {{ locales?.label || 'Your Business, Your Way' }}
          </span>
          <h2 class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-[1.15] tracking-tight">
            {{ locales?.title || 'You know your business — ' }}
            <span class="gradient-text">{{ locales?.titleHighlight || 'you decide how you position it.' }}</span>
          </h2>
        </div>
      </RevealOnScroll>

      <div class="grid-layout">
        <RevealOnScroll v-for="(model, i) in modelsData" :key="i" :delay="i * 0.08">
          <div
            class="model-card card-glow"
            @mousemove="handleMouseMove"
          >
            <div class="icon-box" v-html="model.icon"></div>
            <h3 class="card-title">{{ model.title }}</h3>
            <p class="card-description">{{ model.description }}</p>
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

export default defineComponent({
  name: 'Positioning',
  components: {
    RevealOnScroll
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.positioning.label'),
      title: t('enterprise_v2.positioning.title'),
      titleHighlight: t('enterprise_v2.positioning.titleHighlight')
    }));

    const modelsData = computed(() => {
      return [
        {
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M9.17 14.83l-4.24 4.24" /></svg>',
          title: t('enterprise_v2.positioning.items.ecosystem.title'),
          description: t('enterprise_v2.positioning.items.ecosystem.desc')
        },
        {
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><path d="M7 7h.01" /></svg>',
          title: t('enterprise_v2.positioning.items.techyMerch.title'),
          description: t('enterprise_v2.positioning.items.techyMerch.desc')
        },
        {
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>',
          title: t('enterprise_v2.positioning.items.standalone.title'),
          description: t('enterprise_v2.positioning.items.standalone.desc')
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

    return { locales, modelsData, handleMouseMove };
  }
});
</script>

<style scoped>
.positioning-section {
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

.text-center {
  text-align: center;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.inline-block {
  display: inline-block;
}

.font-mono {
  font-family: var(--font-mono);
}

.text-\[0\.6875rem\] {
  font-size: 0.6875rem;
}

.font-medium {
  font-weight: 500;
}

.tracking-\[0\.14em\] {
  letter-spacing: 0.14em;
}

.uppercase {
  text-transform: uppercase;
}

.text-orange {
  color: var(--color-orange);
}

.text-\[clamp\(1\.5rem\,3vw\,2\.25rem\)\] {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
}

.font-bold {
  font-weight: 700;
}

.leading-\[1\.15\] {
  line-height: 1.15;
}

.tracking-tight {
  letter-spacing: -0.025em;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}

@media (min-width: 640px) {
  .grid-layout {
    grid-template-columns: repeat(3, 1fr);
  }
}

.model-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding: 1.5rem;
  height: calc(100% - 2px - 1.5rem * 2);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.2s;
}

.model-card:hover {
  border-color: var(--color-orange-border);
  background-color: var(--color-bg-card-hover);
  transform: translateY(-0.125rem);
}

.icon-box {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-orange);
  background-color: var(--color-orange-subtle);
  border-radius: 0.75rem;
  border: 1px solid var(--color-orange-border);
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.card-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}
</style>

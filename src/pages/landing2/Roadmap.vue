<template>
  <section class="roadmap-section">
    <div class="container">
      <RevealOnScroll>
        <div class="header">
          <span class="label">{{ locales?.label || 'Roadmap' }}</span>
          <h2 class="title">
            {{ locales?.title || 'What\'s coming' }}
            <span class="gradient-text">{{ locales?.titleHighlight || 'next?' }}</span>
          </h2>
          <p class="description">{{ locales?.description || 'Our development roadmap focuses on creating a more inclusive and efficient financial ecosystem.' }}</p>
        </div>
      </RevealOnScroll>

      <div class="roadmap-grid">
        <RevealOnScroll v-for="(item, i) in itemsData" :key="i" :delay="i * 0.08" class="h-full">
          <div class="roadmap-card group">
            <div class="icon-wrap" v-html="item.icon"></div>
            <div>
              <h3 class="card-title">{{ item.title }}</h3>
              <p class="card-desc">{{ item.description }}</p>
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

export default defineComponent({
  name: 'RoadmapSection',
  components: { RevealOnScroll },
  setup() {
    const { t } = useI18n();
    const locales = computed(() => ({
      label: t('landing_v2.roadmap.label'),
      title: t('landing_v2.roadmap.title'),
      titleHighlight: t('landing_v2.roadmap.titleHighlight'),
      description: t('landing_v2.roadmap.description')
    }));

    const itemsData = computed(() => {
      return [
        {
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>',
          title: t('landing_v2.roadmap.i1.title'),
          description: t('landing_v2.roadmap.i1.desc')
        },
        {
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>',
          title: t('landing_v2.roadmap.i2.title'),
          description: t('landing_v2.roadmap.i2.desc')
        },
        {
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>',
          title: t('landing_v2.roadmap.i3.title'),
          description: t('landing_v2.roadmap.i3.desc')
        },
        {
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" /></svg>',
          title: t('landing_v2.roadmap.i4.title'),
          description: t('landing_v2.roadmap.i4.desc')
        }
      ];
    });

    return { locales, itemsData };
  }
});
</script>

<style scoped>
.roadmap-section {
  padding-top: 2rem;
  padding-bottom: 2.5rem;
}

@media (min-width: 640px) {
  .roadmap-section {
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

.header {
  text-align: center;
  margin-bottom: 2rem;
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
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.625;
}

.roadmap-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}

@media (min-width: 640px) {
  .roadmap-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.h-full {
  height: 100%;
}

.roadmap-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  transition: all 0.2s;
  height: calc(100% - 2px - 1rem * 2);
}

.roadmap-card:hover {
  border-color: var(--color-orange-border);
  transform: translateY(-2px);
}

.icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background-color: var(--color-orange-subtle);
  border: 1px solid var(--color-orange-border);
  color: var(--color-orange);
  transition: transform 0.2s;
}

.roadmap-card:hover .icon-wrap {
  transform: scale(1.1);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.card-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}
</style>

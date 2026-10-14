<template>
  <section class="use-cases-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Use Cases'"
        :title="locales?.title || 'Built for'"
        :titleHighlight="locales?.titleHighlight || 'every vertical.'"
        :description="locales?.description || 'From exchanges to ecosystems, our white-label solution adapts to your needs.'"
      />

      <div class="grid-layout">
        <RevealOnScroll v-for="(uc, i) in useCasesData" :key="i" :delay="i * 0.08">
          <div class="use-case-card group">
            <div class="icon-box" v-html="uc.icon"></div>
            <div>
              <h3 class="card-title">{{ uc.title }}</h3>
              <p class="card-description">{{ uc.description }}</p>
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
  name: 'UseCases',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.useCases.label'),
      title: t('enterprise_v2.useCases.title'),
      titleHighlight: t('enterprise_v2.useCases.titleHighlight'),
      description: t('enterprise_v2.useCases.description')
    }));

    const useCasesData = computed(() => {
      return [
        {
          icon: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M4 12l12-8 12 8v12a2 2 0 01-2 2H6a2 2 0 01-2-2V12z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /><path d="M12 26V18h8v8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>',
          title: t('enterprise_v2.useCases.items.exchanges.title'),
          description: t('enterprise_v2.useCases.items.exchanges.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.5" /><circle cx="16" cy="16" r="5" stroke="currentColor" stroke-width="1.5" /><path d="M16 4v7M16 21v7M4 16h7M21 16h7" stroke="currentColor" stroke-width="1.5" /></svg>',
          title: t('enterprise_v2.useCases.items.ecosystems.title'),
          description: t('enterprise_v2.useCases.items.ecosystems.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="6" stroke="currentColor" stroke-width="1.5" /><circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" /><path d="M16 4v4M16 24v4M4 16h4M24 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>',
          title: t('enterprise_v2.useCases.items.projects.title'),
          description: t('enterprise_v2.useCases.items.projects.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none"><rect x="4" y="8" width="24" height="16" rx="2" stroke="currentColor" stroke-width="1.5" /><path d="M4 14h24" stroke="currentColor" stroke-width="1.5" /><path d="M10 19h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><path d="M10 22h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>',
          title: t('enterprise_v2.useCases.items.infra.title'),
          description: t('enterprise_v2.useCases.items.infra.desc')
        }
      ];
    });

    return { locales, useCasesData };
  }
});
</script>

<style scoped>
.use-cases-section {
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

.use-case-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  height: calc(100% - 2px - 1rem * 2);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  transition: all 0.2s;
}

.use-case-card:hover {
  border-color: var(--color-orange-border);
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
  transition: transform 0.2s;
}

.use-case-card:hover .icon-box {
  transform: scale(1.1);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.card-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}
</style>

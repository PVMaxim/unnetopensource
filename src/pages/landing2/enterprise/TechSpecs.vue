<template>
  <section class="tech-specs-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Technical Specs'"
        :title="locales?.title || 'Enterprise-grade'"
        :titleHighlight="locales?.titleHighlight || 'infrastructure.'"
        :description="locales?.description || 'Built for security-first organizations that don\'t compromise.'"
      />

      <div class="grid-layout">
        <RevealOnScroll v-for="(spec, i) in specsData" :key="i" :delay="i * 0.06" class="h-full">
          <div class="spec-card">
            <div class="spec-header">
              <span class="spec-label">{{ spec.label }}</span>
              <span class="spec-value">{{ spec.value }}</span>
            </div>
            <p class="spec-description">{{ spec.description }}</p>
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
  name: 'TechSpecs',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.techSpecs.label'),
      title: t('enterprise_v2.techSpecs.title'),
      titleHighlight: t('enterprise_v2.techSpecs.titleHighlight'),
      description: t('enterprise_v2.techSpecs.description')
    }));

    const specsData = computed(() => {
      return [
        {
          label: t('enterprise_v2.techSpecs.items.security.label'),
          value: t('enterprise_v2.techSpecs.items.security.value'),
          description: t('enterprise_v2.techSpecs.items.security.desc')
        },
        {
          label: t('enterprise_v2.techSpecs.items.auth.label'),
          value: t('enterprise_v2.techSpecs.items.auth.value'),
          description: t('enterprise_v2.techSpecs.items.auth.desc')
        },
        {
          label: t('enterprise_v2.techSpecs.items.chains.label'),
          value: t('enterprise_v2.techSpecs.items.chains.value'),
          description: t('enterprise_v2.techSpecs.items.chains.desc')
        },
        {
          label: t('enterprise_v2.techSpecs.items.integration.label'),
          value: t('enterprise_v2.techSpecs.items.integration.value'),
          description: t('enterprise_v2.techSpecs.items.integration.desc')
        },
        {
          label: t('enterprise_v2.techSpecs.items.tokens.label'),
          value: t('enterprise_v2.techSpecs.items.tokens.value'),
          description: t('enterprise_v2.techSpecs.items.tokens.desc')
        },
        {
          label: t('enterprise_v2.techSpecs.items.connectivity.label'),
          value: t('enterprise_v2.techSpecs.items.connectivity.value'),
          description: t('enterprise_v2.techSpecs.items.connectivity.desc')
        }
      ];
    });

    return { locales, specsData };
  }
});
</script>

<style scoped>
.tech-specs-section {
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

.h-full {
  height: 100%;
}

.spec-card {
  height: calc(100% - 2px - 1.25rem * 2);
  padding: 1.25rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  transition: border-color 0.2s;
}

.spec-card:hover {
  border-color: var(--color-border-hover);
}

.spec-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.spec-label {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.spec-value {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-orange);
  line-height: 1;
}

.spec-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}
</style>

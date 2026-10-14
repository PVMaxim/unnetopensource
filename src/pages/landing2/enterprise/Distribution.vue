<template>
  <section class="distribution-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Distribution Partnership'"
        :title="locales?.title || 'Distribute Under'"
        :titleHighlight="locales?.titleHighlight || 'United Network Brand'"
        :description="locales?.description || 'Don\'t want to build your own brand? Become a distribution partner and sell United Network cards directly to your audience. We handle product, support, and branding — you focus on sales.'"
      />

      <div class="grid-layout">
        <RevealOnScroll v-for="(item, i) in itemsData" :key="i" :delay="i * 0.08">
          <div class="dist-card">
            <div class="icon-box" v-html="item.icon"></div>
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-description">{{ item.description }}</p>
          </div>
        </RevealOnScroll>
      </div>

      <RevealOnScroll :delay="0.3">
        <div class="cta-container">
          <a
            href="https://calendly.com/akril212/30min"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-button gradient-orange"
          >
            {{ locales?.cta || 'Become a Distribution Partner' }}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
        </div>
      </RevealOnScroll>
    </div>
  </section>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from '../shared/RevealOnScroll.vue';
import SectionHeader from '../shared/SectionHeader.vue';

export default defineComponent({
  name: 'Distribution',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.distribution.label'),
      title: t('enterprise_v2.distribution.title'),
      titleHighlight: t('enterprise_v2.distribution.titleHighlight'),
      description: t('enterprise_v2.distribution.description'),
      cta: t('enterprise_v2.distribution.cta')
    }));

    const itemsData = computed(() => {
      return [
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>',
          title: t('enterprise_v2.distribution.items.retail.title'),
          description: t('enterprise_v2.distribution.items.retail.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>',
          title: t('enterprise_v2.distribution.items.regional.title'),
          description: t('enterprise_v2.distribution.items.regional.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" /></svg>',
          title: t('enterprise_v2.distribution.items.benefits.title'),
          description: t('enterprise_v2.distribution.items.benefits.desc')
        }
      ];
    });

    return { locales, itemsData };
  }
});
</script>

<style scoped>
.distribution-section {
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

.dist-card {
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

.dist-card:hover {
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
  font-size: 0.9375rem;
  font-weight: 600;
}

.card-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.cta-container {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.75rem;
  border-radius: 0.75rem;
  color: #000;
  font-weight: 700;
  font-size: 0.9375rem;
  transition: all 0.2s;
  text-decoration: none;
}

.cta-button:hover {
  box-shadow: 0 0 32px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}
</style>

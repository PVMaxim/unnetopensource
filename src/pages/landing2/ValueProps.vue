<template>
  <section id="features" class="value-props-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Why United Network'"
        :title="locales?.title || 'Everything you need.'"
        :titleHighlight="locales?.titleHighlight || 'Nothing you don\'t.'"
        :description="locales?.description || 'The most secure, simple, and versatile hardware wallet on the market.'"
      />

      <div class="features-grid">
        <RevealOnScroll v-for="(f, i) in featuresData" :key="i" :delay="i * 0.08" class="h-full">
          <div
            class="feature-card card-glow"
            @mousemove="handleMouseMove"
          >
            <div class="icon-container">
              <img :src="f.icon" :alt="f.title" class="feature-icon" />
            </div>
            <h3 class="feature-title">{{ f.title }}</h3>
            <p class="feature-desc">{{ f.description }}</p>
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
  name: 'ValueProps',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();
    const locales = computed(() => ({
      label: t('landing_v2.valueProps.label'),
      title: t('landing_v2.valueProps.title'),
      titleHighlight: t('landing_v2.valueProps.titleHighlight'),
      description: t('landing_v2.valueProps.description')
    }));

    const featuresData = computed(() => {
      return [
        {
          icon: new URL('@/pages/landing2/assets/images/icon-wallet.png', import.meta.url).href,
          title: t('landing_v2.valueProps.noApp.title'),
          description: t('landing_v2.valueProps.noApp.desc')
        },
        {
          icon: new URL('@/pages/landing2/assets/images/icon-security.png', import.meta.url).href,
          title: t('landing_v2.valueProps.security.title'),
          description: t('landing_v2.valueProps.security.desc')
        },
        {
          icon: new URL('@/pages/landing2/assets/images/icon-multichain.png', import.meta.url).href,
          title: t('landing_v2.valueProps.multichain.title'),
          description: t('landing_v2.valueProps.multichain.desc')
        },
        {
          icon: new URL('@/pages/landing2/assets/images/icon-coldstorage.png', import.meta.url).href,
          title: t('landing_v2.valueProps.selfCustody.title'),
          description: t('landing_v2.valueProps.selfCustody.desc')
        }
      ];
    });

    const handleMouseMove = (e) => {
      const target = e.currentTarget;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty("--mouse-x", `${x}%`);
      target.style.setProperty("--mouse-y", `${y}%`);
    };

    return { locales, featuresData, handleMouseMove };
  }
});
</script>

<style scoped>
.value-props-section {
  padding-top: 2rem;
  padding-bottom: 2.5rem;
}

@media (min-width: 640px) {
  .value-props-section {
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

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}

@media (min-width: 640px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.h-full {
  height: 100%;
}

.feature-card {
  position: relative;
  height: calc(100% - 2px - 1.5rem * 2);
  padding: 1.5rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.2s;
}

.feature-card:hover {
  border-color: var(--color-orange-border);
  background-color: var(--color-bg-card-hover);
  transform: translateY(-2px);
}

.icon-container {
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: 1rem;
}

.feature-icon {
  object-fit: contain;
  width: auto;
  height: auto;
  max-width: 56px;
  max-height: 56px;
}

.feature-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
}

.feature-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}
</style>

<template>
  <section class="b2b-value-props">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Why Partner With Us'"
        :title="locales?.title || 'Everything to launch.'"
        :titleHighlight="locales?.titleHighlight || 'Nothing to build.'"
        :description="locales?.description || 'We\'ve already solved the hard parts of hardware wallet deployment — so you don\'t have to.'"
      />

      <div class="grid-layout">
        <RevealOnScroll v-for="(item, i) in propsData" :key="i" :delay="i * 0.08">
          <div
            class="b2b-card card-glow"
            @mousemove="handleMouseMove"
          >
            <div class="icon-box" v-html="item.icon"></div>
            <div>
              <h3 class="card-title">{{ item.title }}</h3>
              <p class="card-description">{{ item.description }}</p>
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
  name: 'B2BValueProps',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.b2bValueProps.label'),
      title: t('enterprise_v2.b2bValueProps.title'),
      titleHighlight: t('enterprise_v2.b2bValueProps.titleHighlight'),
      description: t('enterprise_v2.b2bValueProps.description')
    }));

    const propsData = computed(() => {
      return [
        {
          icon: '<svg width="22" height="22" viewBox="0 0 28 28" fill="none"><rect x="3" y="6" width="22" height="16" rx="3" stroke="currentColor" stroke-width="1.5" /><path d="M3 11h22" stroke="currentColor" stroke-width="1.5" /><rect x="6" y="15" width="6" height="3" rx="1" stroke="currentColor" stroke-width="1" /></svg>',
          title: t('enterprise_v2.b2bValueProps.items.turnkey.title'),
          description: t('enterprise_v2.b2bValueProps.items.turnkey.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="10" stroke="currentColor" stroke-width="1.5" /><path d="M14 8v6l4 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>',
          title: t('enterprise_v2.b2bValueProps.items.brand.title'),
          description: t('enterprise_v2.b2bValueProps.items.brand.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 28 28" fill="none"><path d="M14 4l2 4h4l-3 3 1 5-4-2-4 2 1-5-3-3h4l2-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /><path d="M7 22h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><path d="M10 25h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>',
          title: t('enterprise_v2.b2bValueProps.items.pricing.title'),
          description: t('enterprise_v2.b2bValueProps.items.pricing.desc')
        },
        {
          icon: '<svg width="22" height="22" viewBox="0 0 28 28" fill="none"><path d="M14 4v4M14 20v4M4 14h4M20 14h4M7.5 7.5l3 3M17.5 17.5l3 3M20.5 7.5l-3 3M10.5 17.5l-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><circle cx="14" cy="14" r="4" stroke="currentColor" stroke-width="1.5" /></svg>',
          title: t('enterprise_v2.b2bValueProps.items.traction.title'),
          description: t('enterprise_v2.b2bValueProps.items.traction.desc')
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

    return { locales, propsData, handleMouseMove };
  }
});
</script>

<style scoped>
.b2b-value-props {
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

.b2b-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  height: calc(100% - 2px - 1rem * 2);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.2s;
}

.b2b-card:hover {
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

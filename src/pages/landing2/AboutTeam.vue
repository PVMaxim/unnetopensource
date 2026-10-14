<template>
  <section class="about-team-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'About Us'"
        :title="locales?.title || 'Who We'"
        :titleHighlight="locales?.titleHighlight || 'Are'"
        :description="locales?.description || 'A team of hardware engineers, embedded systems specialists, and crypto-natives.'"
      />

      <div class="cards-grid">
        <RevealOnScroll v-for="(item, i) in highlightsData" :key="i" :delay="i * 0.08">
          <div class="team-card">
            <div class="icon-box" v-html="item.icon"></div>
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-desc">{{ item.text }}</p>
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
  name: 'AboutTeam',
  components: { RevealOnScroll, SectionHeader },
  setup() {
    const { t } = useI18n();
    const locales = computed(() => ({
      label: t('landing_v2.aboutTeam.label'),
      title: t('landing_v2.aboutTeam.title'),
      titleHighlight: t('landing_v2.aboutTeam.titleHighlight'),
      description: t('landing_v2.aboutTeam.description')
    }));

    const highlightsData = computed(() => {
      return [
        {
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" /></svg>',
          title: t('landing_v2.aboutTeam.h1.title'),
          text: t('landing_v2.aboutTeam.h1.desc')
        },
        {
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>',
          title: t('landing_v2.aboutTeam.h2.title'),
          text: t('landing_v2.aboutTeam.h2.desc')
        },
        {
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>',
          title: t('landing_v2.aboutTeam.h3.title'),
          text: t('landing_v2.aboutTeam.h3.desc')
        }
      ];
    });

    return { locales, highlightsData };
  }
});
</script>

<style scoped>
.about-team-section {
  padding-top: 3rem;
  padding-bottom: 3rem;
}

@media (min-width: 640px) {
  .about-team-section {
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

.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.h-full {
  height: 100%;
}

.team-card {
  padding: 1.25rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: 1rem;
  height: calc(100% - 2px - 1.25rem * 2);
}

@media (min-width: 640px) {
  .team-card {
    padding: 1.5rem;
    height: calc(100% - 2px - 1.5rem * 2);
  }
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background-color: var(--color-orange-subtle);
  border: 1px solid var(--color-orange-border);
  color: var(--color-orange);
  margin-bottom: 0.75rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.375rem;
}

.card-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}
</style>

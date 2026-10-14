<template>
  <section class="what-we-offer">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'What We Offer'"
        :title="locales?.title || 'Your brand.'"
        :titleHighlight="locales?.titleHighlight || 'Everywhere it matters.'"
      />

      <div class="content-row">
        <div class="text-side">
          <RevealOnScroll v-for="(item, i) in featuresData" :key="i" :delay="i * 0.05">
            <div class="feature-card">
              <div class="icon-box" v-html="item.icon"></div>
              <div>
                <h4 class="feature-title">{{ item.title }}</h4>
                <p class="feature-desc">{{ item.description }}</p>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        <RevealOnScroll :delay="0.15" class="image-side">
          <div class="img-float">
            <div class="img-wrapper">
              <img
                :src="handImage"
                alt="White-label branded NFC card wallet held in hand"
                class="hand-image"
              />
              <div class="img-gradient-overlay"></div>
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
  name: 'WhatWeOffer',
  components: {
    RevealOnScroll,
    SectionHeader
  },
  setup() {
    const { t } = useI18n();

    const locales = computed(() => ({
      label: t('enterprise_v2.whatWeOffer.label'),
      title: t('enterprise_v2.whatWeOffer.title'),
      titleHighlight: t('enterprise_v2.whatWeOffer.titleHighlight')
    }));

    const featuresData = computed(() => {
      return [
        {
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>',
          title: t('enterprise_v2.whatWeOffer.f1.title'),
          description: t('enterprise_v2.whatWeOffer.f1.desc')
        },
        {
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>',
          title: t('enterprise_v2.whatWeOffer.f2.title'),
          description: t('enterprise_v2.whatWeOffer.f2.desc')
        },
        {
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>',
          title: t('enterprise_v2.whatWeOffer.f3.title'),
          description: t('enterprise_v2.whatWeOffer.f3.desc')
        }
      ];
    });

    const handImage = new URL('@/pages/landing2/assets/images/Group 427320814 1.png', import.meta.url).href; 

    return { locales, featuresData, handImage };
  }
});
</script>

<style scoped>
.what-we-offer {
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

.content-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .content-row {
    flex-direction: row;
    gap: 2rem;
  }
}

.text-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  width: 100%;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  transition: all 0.2s;
}

.feature-card:hover {
  border-color: var(--color-orange-border);
}

.icon-box {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-orange);
  background-color: var(--color-orange-subtle);
  border-radius: 0.75rem;
  border: 1px solid var(--color-orange-border);
}

.feature-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.feature-desc {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.image-side {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  justify-content: center;
}

@media (min-width: 768px) {
  .image-side {
    width: auto;
  }
}

.img-float {
  animation: cardFloat 6s ease-in-out infinite;
}

.img-wrapper {
  position: relative;
}

.hand-image {
  width: 280px;
  height: auto;
  filter: drop-shadow(0 20px 50px rgba(0,0,0,0.5));
}

@media (min-width: 640px) {
  .hand-image {
    width: 320px;
  }
}

@media (min-width: 768px) {
  .hand-image {
    width: 380px;
  }
}

.img-gradient-overlay {
  position: absolute;
  top: 0;
  right: 0;
  width: 30%;
  height: 100%;
  background: linear-gradient(to left, var(--color-bg-primary), transparent);
  pointer-events: none;
}
</style>

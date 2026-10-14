<template>
  <section class="app-download-section">
    <div class="container">
      <SectionHeader
        :label="locales?.label || 'Mobile App'"
        :title="locales?.title || 'App or Web —'"
        :titleHighlight="locales?.titleHighlight || 'Your Choice'"
      />

      <RevealOnScroll>
        <div class="card-wrapper">
          <div class="bg-glow"></div>

          <div class="card-content">
            <div class="text-side">
              <h3 class="heading">
                {{ locales?.heading || 'United Network' }}<br />
                <span class="gradient-text">{{ locales?.headingHighlight || 'is available for download' }}</span>
              </h3>

              <p class="desc-note">
                {{ locales?.p1 || 'The app is ' }}<strong class="font-semibold text-primary">{{ locales?.p1bold || 'not required' }}</strong>{{ locales?.p2 || ' — your wallet works directly in any mobile browser.' }}
                <span class="sub-note">
                  {{ locales?.note1 || 'These are the only official download links, verified by ' }}
                  <span class="text-orange font-medium">{{ locales?.note2 || 'united.network' }}</span>.
                </span>
              </p>

              <div class="badges-row">
                <a
                  :href="GOOGLE_PLAY_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="badge-link"
                >
                  <img
                    :src="playImg"
                    alt="Get it on Google Play"
                    class="badge-img"
                  />
                </a>

                <a
                  :href="APP_STORE_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="badge-link"
                >
                  <img
                    :src="appleImg"
                    alt="Download on the App Store"
                    class="badge-img"
                  />
                </a>

                <a
                  :href="APK_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="badge-link"
                >
                  <img
                    :src="apkImg"
                    alt="Download APK"
                    class="badge-img"
                  />
                </a>
              </div>
            </div>

            <div class="image-side">
              <img
                :src="phoneAppImg"
                alt="United Network mobile app"
                class="phone-app-img"
              />
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  </section>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RevealOnScroll from './shared/RevealOnScroll.vue';
import SectionHeader from './shared/SectionHeader.vue';

export default defineComponent({
  name: 'AppDownload',
  components: { RevealOnScroll, SectionHeader },
  setup() {
    const { t } = useI18n();
    const locales = computed(() => ({
      label: t('landing_v2.appDownload.label'),
      title: t('landing_v2.appDownload.title'),
      titleHighlight: t('landing_v2.appDownload.titleHighlight'),
      heading: t('landing_v2.appDownload.heading'),
      headingHighlight: t('landing_v2.appDownload.headingHighlight'),
      p1: t('landing_v2.appDownload.p1'),
      p1bold: t('landing_v2.appDownload.p1bold'),
      p2: t('landing_v2.appDownload.p2'),
      note1: t('landing_v2.appDownload.note1'),
      note2: t('landing_v2.appDownload.note2')
    }));

    const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=united.network";
    const APP_STORE_URL = "https://apps.apple.com/ua/app/united-network-crypto-wallet/id6743347938";
    const APK_URL = "https://apk.united.network/unitednetwork.apk?v=1";

    const playImg = new URL('@/pages/landing2/assets/images/badge-google-play.svg', import.meta.url).href;
    const appleImg = new URL('@/pages/landing2/assets/images/badge-app-store.svg', import.meta.url).href;
    const apkImg = new URL('@/pages/landing2/assets/images/badge-apk.svg', import.meta.url).href;
    const phoneAppImg = new URL('@/pages/landing2/assets/images/mobile-application.1.0.86.-k-GzdgU..png', import.meta.url).href;

    return { locales, GOOGLE_PLAY_URL, APP_STORE_URL, APK_URL, playImg, appleImg, apkImg, phoneAppImg };
  }
});
</script>

<style scoped>
.app-download-section {
  padding-top: 2.5rem;
  padding-bottom: 4rem;
  overflow: hidden;
}

@media (min-width: 640px) {
  .app-download-section {
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

.card-wrapper {
  position: relative;
  border-radius: 1rem;
  border: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-card);
  overflow: hidden;
}

.bg-glow {
  position: absolute;
  top: -8rem;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 300px;
  background-color: var(--color-orange);
  border-radius: 9999px;
  filter: blur(100px);
  opacity: 0.06;
  pointer-events: none;
}

.card-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (min-width: 768px) {
  .card-content {
    flex-direction: row;
    align-items: stretch;
    padding: 2rem;
  }
}

.text-side {
  flex: 1;
  text-align: center;
}

@media (min-width: 768px) {
  .text-side {
    text-align: left;
  }
}

.heading {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

@media (min-width: 640px) {
  .heading {
    font-size: 1.875rem;
  }
}

.desc-note {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
  margin-bottom: 1.5rem;
  max-width: 28rem;
  margin-left: auto;
  margin-right: auto;
}

@media (min-width: 768px) {
  .desc-note {
    margin-left: 0;
  }
}

.text-primary { color: var(--color-text-primary); }
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }

.sub-note {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.375rem;
}

.badges-row {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

@media (min-width: 640px) {
  .badges-row {
    flex-direction: row;
  }
}

@media (min-width: 768px) {
  .badges-row {
    justify-content: flex-start;
  }
}

.badge-link {
  width: 100%;
  transition: opacity 0.2s;
}

@media (min-width: 640px) {
  .badge-link {
    width: auto;
  }
}

.badge-link:hover {
  opacity: 0.8;
}

.badge-img {
  height: 2.5rem;
  width: 100%;
  object-fit: contain;
}

@media (min-width: 640px) {
  .badge-img {
    width: auto;
  }
}

.image-side {
  flex-shrink: 0;
  width: 100%;
  max-width: 220px;
  margin: 0 auto;
  position: relative;
}

@media (min-width: 768px) {
  .image-side {
    max-width: none;
    width: 384px;
    align-self: stretch;
    margin-bottom: -2rem;
    margin-right: -0.5rem;
  }
}

.phone-app-img {
  width: 100%;
  height: auto;
  object-fit: contain;
  object-position: bottom;
  filter: drop-shadow(0 24px 48px rgba(247, 147, 26, 0.15));
}

@media (min-width: 768px) {
  .phone-app-img {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 100%;
    height: auto;
  }
}
</style>

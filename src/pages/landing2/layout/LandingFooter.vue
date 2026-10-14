<template>
  <footer class="landing-footer">
    <div class="footer-container">
      <div class="footer-top">
        <div class="footer-brand">
          <router-link to="/" class="footer-logo-link">
            <img :src="logoImg" alt="United Network" class="footer-logo" />
          </router-link>
          <p class="footer-desc">
            {{ t('landing_v2.footer.description') }}
          </p>
        </div>

        <div class="footer-links-grid">
          <div class="footer-links-col">
            <h4 class="footer-col-title">
              {{ t('landing_v2.footer.product') }}
            </h4>
            <router-link to="/#features" class="footer-link">{{ t('landing_v2.header.features') }}</router-link>
            <router-link to="/#how-it-works" class="footer-link">{{ t('landing_v2.header.howItWorks') }}</router-link>
            <a href="https://shop.united.network/products/nfc-card-wallet/" target="_blank" rel="noopener noreferrer" class="footer-link">{{ t('landing_v2.header.shopNow') }}</a>
          </div>
          <div class="footer-links-col">
            <h4 class="footer-col-title">
              {{ t('landing_v2.footer.company') }}
            </h4>
            <router-link to="/enterprise" class="footer-link">{{ t('landing_v2.header.enterprise') }}</router-link>
            <router-link to="/#faq" class="footer-link">{{ t('landing_v2.header.faq') }}</router-link>
            <a href="mailto:team@united.network" class="footer-link">{{ t('landing_v2.footer.contact') }}</a>
          </div>
          <div class="footer-links-col">
            <h4 class="footer-col-title">
              {{ t('landing_v2.footer.social') }}
            </h4>
            <a href="https://x.com/UN_wallet" target="_blank" rel="noopener noreferrer" class="footer-link">X (Twitter)</a>
            <a href="https://t.me/UnitedNetworkWallet" target="_blank" rel="noopener noreferrer" class="footer-link">Telegram</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="footer-copyright">{{ t('landing_v2.footer.rights') }}</p>
        <div class="footer-legal">
          <a href="https://united.network/privacy/privacy-policy.pdf" target="_blank" rel="noopener noreferrer" class="footer-legal-link">{{ t('landing_v2.footer.privacyPolicy') }}</a>
          <a href="https://united.network/privacy/terms-of-use.pdf" target="_blank" rel="noopener noreferrer" class="footer-legal-link">{{ t('landing_v2.footer.termsOfUse') }}</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const logoImg = new URL('@/pages/landing2/assets/images/logo-full-orange.png', import.meta.url).href;
</script>

<style scoped>
.landing-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 32px;
  padding-bottom: 24px;
  background-color: transparent;
}

.footer-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer-top {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .footer-top {
    flex-direction: row;
    justify-content: space-between;
  }
}

.footer-brand {
  max-width: 260px;
}

.footer-logo-link {
  display: flex;
  align-items: center;
}

.footer-logo {
  object-fit: contain;
  height: 26px;
  width: auto;
}

.footer-desc {
  margin-top: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.3); 
  line-height: 1.5;
}

.footer-links-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (min-width: 640px) {
  .footer-links-grid {
    display: flex;
    gap: 56px;
    flex-wrap: wrap;
  }
}

.footer-links-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-col-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 2px;
  margin-top: 0;
}

.footer-link {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #ff9800;
}

.footer-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

@media (min-width: 640px) {
  .footer-bottom {
    flex-direction: row;
    justify-content: space-between;
  }
}

.footer-copyright {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

.footer-legal {
  display: flex;
  gap: 20px;
}

.footer-legal-link {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-legal-link:hover {
  color: rgba(255, 255, 255, 0.5);
}
</style>

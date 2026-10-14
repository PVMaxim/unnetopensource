import { createI18n } from 'vue-i18n';
import { nextTick } from "vue";
import { store } from '@/store/index';
import messages from "@intlify/unplugin-vue-i18n/messages";
import getBrowserLocale from "@/plugins/i18n/get-browser-locale.js";

export const SUPPORT_LOCALES = ['en'];

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: messages,
  globalInjection: true,
});

export const loadLocaleMessages = async (locale) => {
  const messages = await import(`@/locales/${locale}.json`);
  i18n.global.setLocaleMessage(locale, messages.default);
  
  i18n.mode === 'legacy' ? i18n.global.locale = locale : i18n.global.locale.value = locale;

  return nextTick();
}

export const setI18nLanguage = async (locale) => {
  if (!locale) {
    return false;
  }
  const locales = store.state.lang.locales || SUPPORT_LOCALES;
  if (!locales.includes(locale)) {
    locale = 'en';
  }
  store.dispatch('lang/setLocale', { locale });
  await loadLocaleMessages(locale);
  document.querySelector('html').setAttribute('lang', locale);
  return locale;
}

import { readEncryptedDB } from '@/api/indexeddb-storage';
import { STORAGE_KEYS } from '@/api/storage-keys';

export const initI18n = async () => {
  if (!store.state.lang.locales || !store.state.lang.locales.length) {
    store.dispatch('lang/setLocales', [...SUPPORT_LOCALES]);
  }
  await store.dispatch('lang/initializeLang');
  const savedLocale = store.state.lang.locale || (await readEncryptedDB(STORAGE_KEYS.LANG, null));
  await setI18nLanguage(savedLocale || getBrowserLocale({ countryCodeOnly: true }) || 'en');
}

export default i18n;

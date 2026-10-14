import * as types from '../mutation-types';
import { readEncryptedDB, writeEncryptedDB } from '@/api/indexeddb-storage';
import { STORAGE_KEYS } from '@/api/storage-keys';

export default {
  namespaced: true,
  state: {
    locale: null,
    locales: null
  },
  getters: {
    locale: state => state.locale,
    locales: state => state.locales
  },
  mutations: {
    [types.SET_LOCALE](state, { locale }) {
      state.locale = locale
    },
    [types.SET_LOCALES](state, locales) {
      state.locales = locales
    }
  },
  actions: {
    async initializeLang({ commit }) {
      const locale = await readEncryptedDB(STORAGE_KEYS.LANG, null);
      if (locale) {
        commit(types.SET_LOCALE, { locale });
      }
    },
    async setLocale({ commit }, { locale }) {
      commit(types.SET_LOCALE, { locale })
      await writeEncryptedDB(STORAGE_KEYS.LANG, locale);
    },
    setLocales({ commit }, locales) {
      commit(types.SET_LOCALES, locales)
    }
  }
}
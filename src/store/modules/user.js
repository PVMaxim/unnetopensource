import * as types from '../mutation-types';
import { getSelectedToken, getCustomTokenBase } from '@/api/constants-types';
import { writeEncryptedDB, readEncryptedDB, deleteEncryptedDB } from '@/api/indexeddb-storage';
import { getSessionEncrypted, setSessionEncrypted, removeSessionEncrypted } from '@/api/session-storage';
import { STORAGE_KEYS } from '@/api/storage-keys';
import { useEventsBus } from '@/plugins/eventBus.js';

export default {
  namespaced: true,
  state: {
    publicKeyCard: null,
    accountAddress: null,
    registered: null,
    tokenBalance: getCustomTokenBase(),
    selectedToken: getSelectedToken(),
    tokensData: getCustomTokenBase(),
    pinPublicKey: null,
    pinHash: null,
    seedPhrase: null,
  },
  getters: {
    publicKeyCard: state => state.publicKeyCard,
    accountAddress: state => state.accountAddress,
    registered: state => state.registered,
    tokenBalance: state => state.tokenBalance,
    selectedToken: state => state.selectedToken,
    tokensData: state => state.tokensData,
    pinPublicKey: state => state.pinPublicKey,
    pinHash: state => state.pinHash,
    seedPhrase: state => state.seedPhrase,
  },
  mutations: {
    [types.SET_PUBLIC_KEY_CARD](state, publicKeyCard) {
      state.publicKeyCard = publicKeyCard;
    },
    [types.SET_ACCOUNT_ADDRESS](state, accountAddress) {
      state.accountAddress = accountAddress;
    },
    [types.SET_REGISTERED](state, registered) {
      state.registered = registered;
    },
    [types.SET_TOKEN_BALANCE](state, { provider, value }) {
      state.tokenBalance[provider] = value;
    },
    [types.SET_TOKEN_BALANCE_ITEM](state, { provider, key, value, action }) {
      let duplicateObject = state.tokenBalance[provider];
      let filteredObject = duplicateObject ? duplicateObject.filter(item => item !== undefined) : [];
      let index = filteredObject.findIndex(item => item.root === key);

      let existing = index >= 0 ? filteredObject[index] : null;
      if (existing && existing.balance === value.balance &&
        existing.price?.usdPrice === value.price?.usdPrice &&
        existing.symbol === value.symbol &&
        existing.name === value.name) {
        return;
      }

      if (index < 0) {
        filteredObject.push(value);
      } else {
        filteredObject[index] = value;
      }
      state.tokenBalance[provider] = filteredObject.sort((a, b) => b.balance - a.balance);
      useEventsBus().emit('tokenBalanceUpdated', action);
    },

    [types.SET_SELECTED_TOKEN](state, { key, value }) {
      const duplicateObject = JSON.parse(JSON.stringify(state.selectedToken));
      duplicateObject[key] = value;
      state.selectedToken = duplicateObject;
    },
    [types.SET_TOKEN_DATA](state, { provider, key, value }) {
      state.tokensData[provider] = { [key.toString()]: value };
    },
    [types.SET_PIN_PUBLIC_KEY](state, pinPublicKey) {
      state.pinPublicKey = pinPublicKey;
    },
    [types.SET_PIN_HASH](state, pinHash) {
      state.pinHash = pinHash;
    },
    [types.SET_SEED_PHRASE](state, seedPhrase) {
      state.seedPhrase = seedPhrase;
    },
    [types.RESET_TOKEN](state) {
      state.selectedToken = getSelectedToken();
      state.tokenBalance = getCustomTokenBase();
      state.tokensData = getCustomTokenBase();
    },
    [types.RESET_USER](state) {
      state.publicKeyCard = null;
      state.accountAddress = null;
      state.registered = null;
      state.tokenBalance = getCustomTokenBase();
      state.selectedToken = getSelectedToken();
      state.tokensData = getCustomTokenBase();
      state.pinPublicKey = null;
      state.pinHash = null;
      state.seedPhrase = null;
    },
    [types.RESET_TOKEN_BALANCE](state) {
      state.tokenBalance = getCustomTokenBase();
    },
    [types.RESET_PIN_HASH](state) {
      state.pinHash = null;
    },
    [types.RESET_SEED_PHRASE](state) {
      state.seedPhrase = null;
    },
    INITIALIZE_STATE(state, payload) {
      Object.assign(state, payload);
    }
  },
  actions: {
    async initialize({ commit }) {
      const [
        publicKeyCard,
        accountAddress,
        registered,
        tokenBalance,
        selectedToken,
        tokensData,
        pinPublicKey,
        seedPhrase,
        pinHash
      ] = await Promise.all([
        readEncryptedDB(STORAGE_KEYS.PUBLIC_KEY_CARD, null),
        readEncryptedDB(STORAGE_KEYS.ACCOUNT_ADDRESS, null),
        readEncryptedDB(STORAGE_KEYS.REGISTERED, null),
        readEncryptedDB(STORAGE_KEYS.TOKEN_BALANCE, getCustomTokenBase()),
        readEncryptedDB(STORAGE_KEYS.SELECTED_TOKEN, getSelectedToken()),
        readEncryptedDB(STORAGE_KEYS.TOKENS_DATA, getCustomTokenBase()),
        readEncryptedDB(STORAGE_KEYS.PIN_PUBLIC_KEY, null),
        readEncryptedDB(STORAGE_KEYS.SEED_PHRASE, null),
        getSessionEncrypted(STORAGE_KEYS.PIN_HASH, null)
      ]);

      commit('INITIALIZE_STATE', {
        publicKeyCard,
        accountAddress,
        registered,
        tokenBalance,
        selectedToken,
        tokensData,
        pinPublicKey,
        seedPhrase,
        pinHash
      });
    },
    async setPublicKeyCard({ commit, state }, publicKeyCard) {
      commit(types.SET_PUBLIC_KEY_CARD, publicKeyCard)
      await writeEncryptedDB(STORAGE_KEYS.PUBLIC_KEY_CARD, state.publicKeyCard);
    },
    async setAccountAddress({ commit, state }, accountAddress) {
      commit(types.SET_ACCOUNT_ADDRESS, accountAddress)
      await writeEncryptedDB(STORAGE_KEYS.ACCOUNT_ADDRESS, state.accountAddress);
    },
    async setRegistered({ commit, state }, registered) {
      commit(types.SET_REGISTERED, registered)
      await writeEncryptedDB(STORAGE_KEYS.REGISTERED, state.registered);
    },
    async setTokenBalance({ commit, state }, { provider, value }) {
      commit(types.SET_TOKEN_BALANCE, { provider, value })
      await writeEncryptedDB(STORAGE_KEYS.TOKEN_BALANCE, state.tokenBalance);
    },
    async setTokenBalanceItem({ commit, state }, { provider, key, value, action }) {
      commit(types.SET_TOKEN_BALANCE_ITEM, { provider, key, value, action })
      await writeEncryptedDB(STORAGE_KEYS.TOKEN_BALANCE, state.tokenBalance);
    },
    async setSelectedToken({ commit, state }, { key, value }) {
      commit(types.SET_SELECTED_TOKEN, { key, value })
      await writeEncryptedDB(STORAGE_KEYS.SELECTED_TOKEN, state.selectedToken);
    },
    async setTokenData({ commit, state }, { provider, key, value }) {
      commit(types.SET_TOKEN_DATA, { provider, key, value })
      await writeEncryptedDB(STORAGE_KEYS.TOKENS_DATA, state.tokensData);
    },
    async setPinPublicKey({ commit, state }, pinPublicKey) {
      commit(types.SET_PIN_PUBLIC_KEY, pinPublicKey)
      await writeEncryptedDB(STORAGE_KEYS.PIN_PUBLIC_KEY, state.pinPublicKey);
    },
    async setPinHash({ commit, state }, pinHash) {
      commit(types.SET_PIN_HASH, pinHash)
      await setSessionEncrypted(STORAGE_KEYS.PIN_HASH, state.pinHash);
    },
    async resetToken({ commit }) {
      commit(types.RESET_TOKEN)
      await Promise.all([
        deleteEncryptedDB(STORAGE_KEYS.PUBLIC_KEY_CARD),
        deleteEncryptedDB(STORAGE_KEYS.ACCOUNT_ADDRESS),
        deleteEncryptedDB(STORAGE_KEYS.REGISTERED),
        deleteEncryptedDB(STORAGE_KEYS.TOKEN_BALANCE),
        deleteEncryptedDB(STORAGE_KEYS.SELECTED_TOKEN),
        deleteEncryptedDB(STORAGE_KEYS.PIN_PUBLIC_KEY),
        deleteEncryptedDB(STORAGE_KEYS.TOKENS_DATA)
      ]);
      removeSessionEncrypted(STORAGE_KEYS.PIN_HASH);
    },
    resetPinHash({ commit }) {
      commit(types.RESET_PIN_HASH)
      removeSessionEncrypted(STORAGE_KEYS.PIN_HASH);
    },
    async resetTokenBalance({ commit }) {
      commit(types.RESET_TOKEN_BALANCE)
      await deleteEncryptedDB(STORAGE_KEYS.TOKEN_BALANCE);
    },
    async setSeedPhrase({ commit, state }, seedPhrase) {
      commit(types.SET_SEED_PHRASE, seedPhrase)
      await writeEncryptedDB(STORAGE_KEYS.SEED_PHRASE, state.seedPhrase);
    },
    async resetSeedPhrase({ commit }) {
      commit(types.RESET_SEED_PHRASE)
      await deleteEncryptedDB(STORAGE_KEYS.SEED_PHRASE);
    }
  }
}
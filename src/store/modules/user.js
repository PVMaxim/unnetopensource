import * as types from '../mutation-types';
import { getSelectedToken, getCustomTokenBase, rpcList } from '@/api/constants-types';
import { 
  writeEncryptedDB, 
  readEncryptedDB, 
  deleteEncryptedDB,
  writeEncryptedDBImmediate,
  flushEncryptedDB,
  preloadEncryptedDBKeys,
  initStorageShutdownHandlers
} from '@/api/indexeddb-storage';
import { STORAGE_KEYS } from '@/api/storage-keys';
import { purgeAllSeedTraces, saveOnboardingSecret, restoreOnboardingSecret } from '@/api/onboarding-vault';
import { savePinSession, getPinSession, purgePinSession } from '@/api/pin-session-vault';
import { useEventsBus } from '@/plugins/eventBus.js';

const getTokenBalanceKey = (provider) => `${STORAGE_KEYS.TOKEN_BALANCE}.${provider}`;
const getSelectedTokenKey = (provider) => `${STORAGE_KEYS.SELECTED_TOKEN}.${provider}`;
const getTokensDataKey = (provider) => `${STORAGE_KEYS.TOKENS_DATA}.${provider}`;

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
      const list = Array.isArray(value) ? value.filter(item => item !== undefined) : [];
      state.tokenBalance[provider] = [...list].sort(
        (a, b) => (Number(b?.balance) || 0) - (Number(a?.balance) || 0)
      );
    },
    [types.SET_TOKEN_BALANCE_ITEM](state, { provider, key, value, action }) {
      let duplicateObject = Array.isArray(state.tokenBalance[provider])
        ? state.tokenBalance[provider].filter(item => item !== undefined)
        : [];
      let index = duplicateObject.findIndex(item => item.root === key);

      if (index < 0) {
        duplicateObject.push(value);
      } else {
        duplicateObject[index] = value;
      }
      state.tokenBalance[provider] = [...duplicateObject].sort(
        (a, b) => (Number(b?.balance) || 0) - (Number(a?.balance) || 0)
      );
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
      initStorageShutdownHandlers();

      const granularBalanceKeys = rpcList.map(rpc => getTokenBalanceKey(rpc.name));
      const granularSelectedKeys = rpcList.map(rpc => getSelectedTokenKey(rpc.name));
      const granularDataKeys = rpcList.map(rpc => getTokensDataKey(rpc.name));

      await preloadEncryptedDBKeys([
        STORAGE_KEYS.PUBLIC_KEY_CARD,
        STORAGE_KEYS.ACCOUNT_ADDRESS,
        STORAGE_KEYS.REGISTERED,
        STORAGE_KEYS.PIN_PUBLIC_KEY,
        STORAGE_KEYS.SEED_PHRASE,
        ...granularBalanceKeys,
        ...granularSelectedKeys,
        ...granularDataKeys,
      ]);

      const [
        publicKeyCard,
        accountAddress,
        registered,
        pinPublicKey,
        seedPhrase,
        pinHash,
        granularBalances,
        granularSelected,
        granularData,
      ] = await Promise.all([
        readEncryptedDB(STORAGE_KEYS.PUBLIC_KEY_CARD, null),
        readEncryptedDB(STORAGE_KEYS.ACCOUNT_ADDRESS, null),
        readEncryptedDB(STORAGE_KEYS.REGISTERED, null),
        readEncryptedDB(STORAGE_KEYS.PIN_PUBLIC_KEY, null),
        readEncryptedDB(STORAGE_KEYS.SEED_PHRASE, null),
        getPinSession(),
        Promise.all(granularBalanceKeys.map(k => readEncryptedDB(k, null))),
        Promise.all(granularSelectedKeys.map(k => readEncryptedDB(k, null))),
        Promise.all(granularDataKeys.map(k => readEncryptedDB(k, null))),
      ]);

      let finalSeedPhrase = seedPhrase;
      if (registered || (publicKeyCard && publicKeyCard.ed25519)) {
        if (seedPhrase) {
          await deleteEncryptedDB(STORAGE_KEYS.SEED_PHRASE);
        }
        finalSeedPhrase = null;
      } else {
        if (Array.isArray(seedPhrase) && seedPhrase.length === 12) {
          await saveOnboardingSecret(seedPhrase);
          await deleteEncryptedDB(STORAGE_KEYS.SEED_PHRASE);
        } else {
          finalSeedPhrase = await restoreOnboardingSecret();
        }
      }

      const baseTokenBalance = getCustomTokenBase();
      const normalizedTokenBalance = { ...baseTokenBalance };
      rpcList.forEach((rpc, idx) => {
        if (Array.isArray(granularBalances[idx])) {
          normalizedTokenBalance[rpc.name] = granularBalances[idx]
            .filter(item => item !== undefined)
            .sort((a, b) => (Number(b?.balance) || 0) - (Number(a?.balance) || 0));
        }
      });

      const baseSelectedToken = getSelectedToken();
      const normalizedSelectedToken = { ...baseSelectedToken };
      rpcList.forEach((rpc, idx) => {
        if (granularSelected[idx] !== null && granularSelected[idx] !== undefined) {
          normalizedSelectedToken[rpc.name] = granularSelected[idx];
        }
      });

      const baseTokensData = getCustomTokenBase();
      const normalizedTokensData = { ...baseTokensData };
      rpcList.forEach((rpc, idx) => {
        if (granularData[idx] !== null && granularData[idx] !== undefined) {
          normalizedTokensData[rpc.name] = granularData[idx];
        }
      });

      commit('INITIALIZE_STATE', {
        publicKeyCard,
        accountAddress,
        registered,
        tokenBalance: normalizedTokenBalance,
        selectedToken: normalizedSelectedToken,
        tokensData: normalizedTokensData,
        pinPublicKey,
        pinHash,
        seedPhrase: finalSeedPhrase,
      });
    },
    async setPublicKeyCard({ commit, state }, publicKeyCard) {
      commit(types.SET_PUBLIC_KEY_CARD, publicKeyCard);
      await writeEncryptedDBImmediate(STORAGE_KEYS.PUBLIC_KEY_CARD, state.publicKeyCard);
    },
    async setAccountAddress({ commit, state }, accountAddress) {
      commit(types.SET_ACCOUNT_ADDRESS, accountAddress);
      await writeEncryptedDBImmediate(STORAGE_KEYS.ACCOUNT_ADDRESS, state.accountAddress);
    },
    async setRegistered({ commit, state }, registered) {
      commit(types.SET_REGISTERED, registered);
      await writeEncryptedDBImmediate(STORAGE_KEYS.REGISTERED, state.registered);
    },
    async setTokenBalance({ commit, state }, { provider, value }) {
      commit(types.SET_TOKEN_BALANCE, { provider, value });
      if (provider) {
        writeEncryptedDB(getTokenBalanceKey(provider), state.tokenBalance[provider]).catch(() => {});
      }
    },
    async setTokenBalanceItem({ commit, state }, { provider, key, value, action }) {
      commit(types.SET_TOKEN_BALANCE_ITEM, { provider, key, value, action });
      if (provider && state.tokenBalance[provider]) {
        writeEncryptedDB(getTokenBalanceKey(provider), state.tokenBalance[provider]).catch(() => {});
      }
    },
    async setSelectedToken({ commit, state }, { key, value }) {
      commit(types.SET_SELECTED_TOKEN, { key, value });
      if (key) {
        writeEncryptedDB(getSelectedTokenKey(key), value).catch(() => {});
      }
    },
    async setTokenData({ commit, state }, { provider, key, value }) {
      commit(types.SET_TOKEN_DATA, { provider, key, value });
      if (provider && state.tokensData[provider]) {
        writeEncryptedDB(getTokensDataKey(provider), state.tokensData[provider]).catch(() => {});
      }
    },
    async setPinPublicKey({ commit, state }, pinPublicKey) {
      commit(types.SET_PIN_PUBLIC_KEY, pinPublicKey);
      await writeEncryptedDBImmediate(STORAGE_KEYS.PIN_PUBLIC_KEY, state.pinPublicKey);
    },
    async setPinHash({ commit }, pinHash) {
      commit(types.SET_PIN_HASH, pinHash);
      if (pinHash && pinHash.pin) {
        const ttlMs = pinHash.date ? Math.max(0, pinHash.date - Date.now()) : undefined;
        await savePinSession(pinHash.pin, ttlMs);
      }
    },
    async resetToken({ commit }) {
      commit(types.RESET_TOKEN);
      await flushEncryptedDB();
      const deletePromises = [
        deleteEncryptedDB(STORAGE_KEYS.PUBLIC_KEY_CARD),
        deleteEncryptedDB(STORAGE_KEYS.ACCOUNT_ADDRESS),
        deleteEncryptedDB(STORAGE_KEYS.REGISTERED),
        deleteEncryptedDB(STORAGE_KEYS.PIN_PUBLIC_KEY),
        deleteEncryptedDB(STORAGE_KEYS.SEED_PHRASE)
      ];
      for (const rpc of rpcList) {
        deletePromises.push(deleteEncryptedDB(getTokenBalanceKey(rpc.name)));
        deletePromises.push(deleteEncryptedDB(getSelectedTokenKey(rpc.name)));
        deletePromises.push(deleteEncryptedDB(getTokensDataKey(rpc.name)));
      }
      await Promise.all(deletePromises);
      await purgeAllSeedTraces();
      await purgePinSession();
    },
    async resetPinHash({ commit }) {
      commit(types.RESET_PIN_HASH);
      await purgePinSession();
    },
    async resetTokenBalance({ commit }) {
      commit(types.RESET_TOKEN_BALANCE);
      await flushEncryptedDB();
      await Promise.all([
        ...rpcList.map(rpc => deleteEncryptedDB(getTokenBalanceKey(rpc.name))),
      ]);
    },
    async setSeedPhrase({ commit }, seedPhrase) {
      commit(types.SET_SEED_PHRASE, seedPhrase);
      if (Array.isArray(seedPhrase) && seedPhrase.length === 12) {
        await saveOnboardingSecret(seedPhrase);
      }
      await deleteEncryptedDB(STORAGE_KEYS.SEED_PHRASE);
    },
    async resetSeedPhrase({ commit }) {
      commit(types.RESET_SEED_PHRASE);
      await flushEncryptedDB();
      await deleteEncryptedDB(STORAGE_KEYS.SEED_PHRASE);
      await purgeAllSeedTraces();
    }
  }
}

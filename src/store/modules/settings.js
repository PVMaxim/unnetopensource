import * as types from '../mutation-types';
import { rpcList } from '@/api/constants-types';
import { removeEncrypted } from '@/api/encrypt-decrypt';
import { readEncryptedDB, writeEncryptedDB, deleteEncryptedDB } from '@/api/indexeddb-storage';
import { STORAGE_KEYS } from '@/api/storage-keys';

export default {
  namespaced: true,
  state: {
    cardReaderPriority: null,
    rpcProvider: rpcList[0],
    cardVersion: null,
  },
  getters: {
    cardReaderPriority: state => state.cardReaderPriority,
    rpcProvider: state => state.rpcProvider,
    cardVersion: state => state.cardVersion,
  },
  mutations: {
    [types.SET_CARD_READER_PRIORITY](state, cardReaderPriority) {
      state.cardReaderPriority = cardReaderPriority;
    },
    [types.SET_RPC_PROVIDER](state, rpcProvider) {
      state.rpcProvider = rpcProvider;
    },
    [types.SET_CARD_VERSION](state, cardVersion) {
      state.cardVersion = cardVersion;
    },
    [types.RESET_SETTINGS](state) {
      state.cardReaderPriority = null;
      state.rpcProvider = rpcList[0];
      state.cardVersion = null;
    },
    [types.RESET_CARD_VERSION](state) {
      state.cardVersion = null;
    },
  },
  actions: {
    async initializeSettings({ commit }) {
      const [cardReaderPriority, savedRpc, cardVersion] = await Promise.all([
        readEncryptedDB(STORAGE_KEYS.CARD_READER_PRIORITY, null),
        readEncryptedDB(STORAGE_KEYS.RPC_PROVIDER, rpcList[0]),
        readEncryptedDB(STORAGE_KEYS.CARD_VERSION, null),
      ]);

      commit(types.SET_CARD_READER_PRIORITY, cardReaderPriority);
      const matchedRpc = rpcList.find(rpc => rpc.name === savedRpc?.name) || rpcList[0];
      commit(types.SET_RPC_PROVIDER, matchedRpc);
      commit(types.SET_CARD_VERSION, cardVersion);
    },
    async setCardReaderPriority({ commit }, cardReaderPriority) {
      commit(types.SET_CARD_READER_PRIORITY, cardReaderPriority);
      await writeEncryptedDB(STORAGE_KEYS.CARD_READER_PRIORITY, cardReaderPriority);
    },
    async setRpcProvider({ commit }, rpcProvider) {
      commit(types.SET_RPC_PROVIDER, rpcProvider);
      await writeEncryptedDB(STORAGE_KEYS.RPC_PROVIDER, rpcProvider);
    },
    async setCardVersion({ commit }, cardVersion) {
      commit(types.SET_CARD_VERSION, cardVersion);
      await writeEncryptedDB(STORAGE_KEYS.CARD_VERSION, cardVersion);
    },
    async resetSettings({ commit }) {
      commit(types.RESET_SETTINGS);
      await Promise.all([
        deleteEncryptedDB(STORAGE_KEYS.CARD_READER_PRIORITY),
        deleteEncryptedDB(STORAGE_KEYS.RPC_PROVIDER),
        deleteEncryptedDB(STORAGE_KEYS.CARD_VERSION),
      ]);
      removeEncrypted(STORAGE_KEYS.CARD_READER_PRIORITY);
      removeEncrypted(STORAGE_KEYS.RPC_PROVIDER);
      removeEncrypted(STORAGE_KEYS.CARD_VERSION);
    },
    async resetCardVersion({ commit }) {
      commit(types.RESET_CARD_VERSION);
      await deleteEncryptedDB(STORAGE_KEYS.CARD_VERSION);
      removeEncrypted(STORAGE_KEYS.CARD_VERSION);
    },
  }
}
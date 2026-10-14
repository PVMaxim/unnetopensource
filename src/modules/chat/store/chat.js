export const SET_CHAT_MESSAGES = 'SET_CHAT_MESSAGES';
export const ADD_CHAT_MESSAGE = 'ADD_CHAT_MESSAGE';
export const SET_CHAT_SDK_READY = 'SET_CHAT_SDK_READY';
export const SET_CHAT_SDK_LOADING = 'SET_CHAT_SDK_LOADING';
export const CLEAR_CHAT_MESSAGES = 'CLEAR_CHAT_MESSAGES';

export default {
  namespaced: true,
  state: {
    messages: [],
    sdkReady: false,
    sdkLoading: false,
  },
  getters: {
    messages: (state) => state.messages,
    sdkReady: (state) => state.sdkReady,
    sdkLoading: (state) => state.sdkLoading,
  },
  mutations: {
    [ADD_CHAT_MESSAGE](state, message) {
      state.messages.push(message);
    },
    [SET_CHAT_MESSAGES](state, messages) {
      state.messages = messages;
    },
    [SET_CHAT_SDK_READY](state, ready) {
      state.sdkReady = ready;
    },
    [SET_CHAT_SDK_LOADING](state, loading) {
      state.sdkLoading = loading;
    },
    [CLEAR_CHAT_MESSAGES](state) {
      state.messages = [];
    },
    SET_MESSAGE_SEND_CONFIRMED(state, { id }) {
      const msg = state.messages.find((m) => m.id === id);
      if (msg) msg.sendConfirmed = true;
    },
    SET_MESSAGE_SEND_DECLINED(state, { id }) {
      const msg = state.messages.find((m) => m.id === id);
      if (msg) msg.sendDeclined = true;
    },
  },
  actions: {
    addMessage({ commit }, message) {
      commit(ADD_CHAT_MESSAGE, {
        ...message,
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
      });
    },
    setSdkReady({ commit }, ready) {
      commit(SET_CHAT_SDK_READY, ready);
    },
    setSdkLoading({ commit }, loading) {
      commit(SET_CHAT_SDK_LOADING, loading);
    },
    clearMessages({ commit }) {
      commit(CLEAR_CHAT_MESSAGES);
    },
  },
};

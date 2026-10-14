import { rpcList } from '@/api/constants-types';
import { getOwnerAddress } from '../../api/swap/utils/ownerAddress';
import * as types from '../mutation-types';
import CoreSwapService from '../../api/swap/services/core';
import { readEncryptedDB, writeEncryptedDB, deleteEncryptedDB } from '@/api/indexeddb-storage';
import { STORAGE_KEYS } from '@/api/storage-keys';

export default {
    namespaced: true,
    state: {
        history: [],
        isLoading: false,
        isError: false,
        errorTitle: '',
        errorMessage: '',
    },
    getters: {
        history: state => state.history,
        isLoading: state => state.isLoading,
        isError: state => state.isError,
        errorTitle: state => state.errorTitle,
        errorMessage: state => state.errorMessage
    },
    mutations: {
        [types.SET_SWAP_HISTORY] (state, history) {
            if (JSON.stringify(state.history) !== JSON.stringify(history)) {
                state.history = history;
            }
        },
        [types.RESET_SWAP_HISTORY] (state) {
            state.history = [];
        },
        [types.SET_SWAP_HISTORY_LOADING] (state, isLoading) {
            state.isLoading = isLoading;
        },
        [types.SET_SWAP_HISTORY_ERROR] (state, isError) {
            state.isError = isError;
        },
        [types.SET_SWAP_HISTORY_ERROR_TITLE] (state, errorTitle) {
            state.errorTitle = errorTitle;
        },
        [types.SET_SWAP_HISTORY_ERROR_MESSAGE] (state, errorMessage) {
            state.errorMessage = errorMessage;
        }
    },

    actions: {
        async initializeHistory({ commit }) {
            const history = await readEncryptedDB(STORAGE_KEYS.SWAP_HISTORY, []);
            if (Array.isArray(history) && history.length > 0) {
                commit(types.SET_SWAP_HISTORY, history);
            }
        },
        async setSwapHistory({ commit }, history) {
            commit(types.SET_SWAP_HISTORY, history);
            await writeEncryptedDB(STORAGE_KEYS.SWAP_HISTORY, history);
        },
        async clearHistory({ commit }) {
            commit(types.RESET_SWAP_HISTORY);
            await deleteEncryptedDB(STORAGE_KEYS.SWAP_HISTORY);
        },
        setError({commit},{ title, message}){
            commit(types.SET_SWAP_HISTORY_ERROR, true);
            commit(types.SET_SWAP_HISTORY_ERROR_TITLE, title);
            commit(types.SET_SWAP_HISTORY_ERROR_MESSAGE, message);
        },
        resetError({commit}) {
            commit(types.SET_SWAP_HISTORY_ERROR, false);
            commit(types.SET_SWAP_HISTORY_ERROR_TITLE, '');
            commit(types.SET_SWAP_HISTORY_ERROR_MESSAGE, '');
        },
        async getHistory({ commit }) {
            const publicKeyCard = this.state.user.publicKeyCard;
            if (!publicKeyCard) {
                throw new Error("No public key card found");
            }
            const addressPromises = rpcList.map(rpc => getOwnerAddress(rpc, publicKeyCard));
            const addresses = (await Promise.all(addressPromises)).filter(Boolean);

            if(addresses.length === 0) {
              throw new Error("No wallet addresses found");
            }

            const history = await CoreSwapService.getSwapHistory(addresses);
            const sortedHistory = history.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
            commit(types.SET_SWAP_HISTORY, sortedHistory);
            await writeEncryptedDB(STORAGE_KEYS.SWAP_HISTORY, sortedHistory);
        },

        async updateHistory ({ commit, dispatch, state }) {
            try {
                if (state.isLoading) {
                    return;
                }
                dispatch('resetError');
                await dispatch('getHistory');
            } catch (error) {
                dispatch('setError',{ title: "Error", message: error.message || "An error occurred while fetching history"});
            } finally {
                commit(types.SET_SWAP_HISTORY_LOADING, false);
            }
        },
            
        async checkIsHistoryExist({ dispatch, commit, state }){
            try {
                if (state.history && state.history.length > 0) {
                    return;
                }
                const saved = await readEncryptedDB(STORAGE_KEYS.SWAP_HISTORY, []);
                if (Array.isArray(saved) && saved.length > 0) {
                    commit(types.SET_SWAP_HISTORY, saved);
                    return;
                }
                commit(types.SET_SWAP_HISTORY_LOADING, true);
                try {
                    await dispatch('getHistory');
                } finally {
                    commit(types.SET_SWAP_HISTORY_LOADING, false);
                }
            } catch (error) {
            }
        }
    }
}
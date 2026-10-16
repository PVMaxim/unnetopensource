import * as types from '../mutation-types';
import { store } from '../index';
import { syncCustomTokensWithManagers } from '../../api/ApiHandler';
import { readEncryptedDB, writeEncryptedDB, deleteEncryptedDB } from '../../api/indexeddb-storage';
import { DYNAMIC_KEYS } from '../../api/storage-keys';
import { PING_LENGTH_MIN, rpcList, getCustomTokenBase } from '../../api/constants-types';

const customTokenStore = (prefix) => {
    return {
        namespaced: true,
        state: {
            customToken: getCustomTokenBase(),
            pinLength: PING_LENGTH_MIN,
            cotiSecretKey: null,
            rpcListHistory: [],
            txNotifications: [],
        },
        getters: {
            customToken: state => state.customToken,
            pinLength: state => state.pinLength,
            cotiSecretKey: state => state.cotiSecretKey,
            rpcListHistory: state => state.rpcListHistory,
            txNotifications: state => state.txNotifications,
        },
        mutations: {
            ['SET_CUSTOM_TOKEN_STATE'](state, customToken) {
                const base = getCustomTokenBase();
                const sanitized = { ...base };
                if (customToken && typeof customToken === 'object') {
                    for (const key of Object.keys(customToken)) {
                        if (Array.isArray(customToken[key])) {
                            sanitized[key] = [...new Set(customToken[key])];
                        }
                    }
                }
                state.customToken = sanitized;
            },
            ['SET_RPC_LIST_HISTORY_STATE'](state, rpcListHistory) {
                state.rpcListHistory = rpcListHistory;
            },
            ['SET_TX_NOTIFICATIONS_STATE'](state, txNotifications) {
                state.txNotifications = Array.isArray(txNotifications) ? txNotifications.slice(0, 20) : [];
            },
            ['ADD_TX_NOTIFICATION_MUTATION'](state, notification) {
                const existing = Array.isArray(state.txNotifications) ? state.txNotifications : [];
                const notifId = notification.id;
                if (notifId && existing.some(item => {
                    const itemId = typeof item === 'object' && item ? (item.id || item.value?.id) : null;
                    return itemId && String(itemId).toLowerCase() === String(notifId).toLowerCase();
                })) {
                    return;
                }
                const updated = [notification, ...existing].slice(0, 20);
                state.txNotifications = updated;
            },
            [types.CHECK_CUSTOM_TOKEN](state, key) {
                const base = getCustomTokenBase()[key];
                if (base !== undefined) {
                    state.customToken = {
                        ...state.customToken,
                        [key]: Array.isArray(state.customToken[key]) ? state.customToken[key] : base
                    };
                }
            },
            [types.SET_CUSTOM_TOKEN](state, { key, value }) {
                state.customToken = {
                    ...state.customToken,
                    [key]: Array.isArray(value) ? [...new Set(value)] : []
                };
            },
            [types.RESET_CUSTOM_TOKEN](state) {
                state.customToken = getCustomTokenBase();
            },
            [types.SET_PIN_LENGTH](state, pinLength) {
                state.pinLength = pinLength;
            },
            [types.SET_COTI_SECRET_KEY](state, cotiSecretKey) {
                state.cotiSecretKey = cotiSecretKey;
            },
            [types.SET_RPC_LIST_HISTORY](state, rpcProvider) {
                if (!rpcProvider) return;

                const history = [...state.rpcListHistory];
                const index = history.findIndex(item => item.name === rpcProvider.name);

                if (index !== -1) {
                    history.splice(index, 1);
                }

                history.unshift(rpcProvider);
                state.rpcListHistory = history.slice(0, 3);
            },
        },
        actions: {
            async initializeCustomToken({ commit, state }) {
                const [customToken, pinLength, cotiSecretKey, rawHistory, savedNotifications] = await Promise.all([
                    readEncryptedDB(`${prefix}.${DYNAMIC_KEYS.CUSTOM_TOKEN}`, getCustomTokenBase()),
                    readEncryptedDB(`${prefix}.${DYNAMIC_KEYS.PIN_LENGTH}`, PING_LENGTH_MIN),
                    readEncryptedDB(`${prefix}.${DYNAMIC_KEYS.COTI_SECRET_KEY}`, null),
                    readEncryptedDB(`${prefix}.${DYNAMIC_KEYS.RPC_LIST_HISTORY}`, []),
                    readEncryptedDB(`${prefix}.${DYNAMIC_KEYS.TX_NOTIFICATIONS}`, []),
                ]);

                commit('SET_CUSTOM_TOKEN_STATE', customToken);
                commit(types.SET_PIN_LENGTH, pinLength);
                commit(types.SET_COTI_SECRET_KEY, cotiSecretKey);
                const history = Array.isArray(rawHistory)
                    ? rawHistory.map(savedRpc => rpcList.find(rpc => rpc.name === savedRpc?.name)).filter(Boolean)
                    : [];
                commit('SET_RPC_LIST_HISTORY_STATE', history);
                commit('SET_TX_NOTIFICATIONS_STATE', savedNotifications);

                syncCustomTokensWithManagers(state.customToken);
            },
            async checkCustomToken({ commit, state }, key) {
                commit(types.CHECK_CUSTOM_TOKEN, key);
                const toSave = JSON.parse(JSON.stringify(state.customToken));
                await writeEncryptedDB(`${prefix}.${DYNAMIC_KEYS.CUSTOM_TOKEN}`, toSave);
            },
            async setCustomToken({ commit, state }, { key, value }) {
                commit(types.SET_CUSTOM_TOKEN, { key, value });
                const toSave = JSON.parse(JSON.stringify(state.customToken));
                await writeEncryptedDB(`${prefix}.${DYNAMIC_KEYS.CUSTOM_TOKEN}`, toSave);
                syncCustomTokensWithManagers(state.customToken);
            },
            async resetCustomToken({ commit }) {
                commit(types.RESET_CUSTOM_TOKEN);
                await deleteEncryptedDB(`${prefix}.${DYNAMIC_KEYS.CUSTOM_TOKEN}`);
            },
            async setPinLength({ commit }, pinLength) {
                commit(types.SET_PIN_LENGTH, pinLength);
                await writeEncryptedDB(`${prefix}.${DYNAMIC_KEYS.PIN_LENGTH}`, pinLength);
            },
            async setCotiSecretKey({ commit }, cotiSecretKey) {
                commit(types.SET_COTI_SECRET_KEY, cotiSecretKey);
                await writeEncryptedDB(`${prefix}.${DYNAMIC_KEYS.COTI_SECRET_KEY}`, cotiSecretKey);
            },
            async setRpcListHistory({ commit, state }, rpcProvider) {
                commit(types.SET_RPC_LIST_HISTORY, rpcProvider);
                const toSave = JSON.parse(JSON.stringify(state.rpcListHistory));
                await writeEncryptedDB(`${prefix}.${DYNAMIC_KEYS.RPC_LIST_HISTORY}`, toSave);
            },
            async addTxNotification({ commit, state }, notificationData) {
                if (!notificationData) return;
                const formattedRecord = {
                    id: notificationData.id || notificationData.txId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    timestamp: notificationData.timestamp || new Date().toISOString(),
                    chain: notificationData.chain || 'Unknown',
                    symbol: notificationData.symbol || 'TOKEN',
                    tokenId: notificationData.tokenId ?? notificationData.contractAddress ?? '',
                    amount: notificationData.diffAmount || notificationData.amount || notificationData.balance || '0',
                    totalBalance: notificationData.totalBalance ?? 0,
                    iconUrl: notificationData.iconUrl || null,
                };
                commit('ADD_TX_NOTIFICATION_MUTATION', formattedRecord);
                const toSave = JSON.parse(JSON.stringify(state.txNotifications));
                await writeEncryptedDB(`${prefix}.${DYNAMIC_KEYS.TX_NOTIFICATIONS}`, toSave);
            },
        }
    };
};

export const registerCustomTokenStore = (prefix) => {
    if (!prefix || typeof prefix !== 'string' || prefix.length < 4) {
        throw new Error('Invalid store prefix', { cause: { errorSubtitle: "Please try sign in again." } });
    }
    if (!store.hasModule(`${prefix}.customtoken`)) {
        store.registerModule(`${prefix}.customtoken`, customTokenStore(`${prefix}`));
        store.dispatch(`${prefix}.customtoken/initializeCustomToken`).catch(() => {});
    }
};

export const unRegisterCustomTokenStore = (prefix) => {
    if (!prefix || prefix === null) return;
    if (store.hasModule(`${prefix}.customtoken`)) store.unregisterModule(`${prefix}.customtoken`);
};
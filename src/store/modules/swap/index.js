import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS , rpcList } from "@/api/constants-types";
import { SWAP_PAGE_TABS } from "../../constants";
import * as types from "../../mutation-types";
import {
  sortTokensByChainIds,
  sortTokensByProviderTokens,
} from "@/api/swap/utils/tokens";

import { createProviderManager } from "@/api/swap/utils/provider";
import {
  DEFAULT_ADDRESSES_BY_CHAIN,
  INITIAL_SLIPPAGE,
} from "@/api/swap/configs";
import CoreSwapService from "@/api/swap/services/core";
import { calculateRate, checkIsBetweenMinMax } from "@/api/swap/utils/rate";
import { getOwnerAddress } from "@/api/swap/utils/ownerAddress";
import {
  checkBalance,
  checkIsAmountIsApproved,
} from "@/api/swap/utils/tokenBalances";
import { checkBalanceForFee } from "@/api/swap/utils/token";
import { autoReload } from "./modules/autoReload";
import { readEncryptedDB, writeEncryptedDB, deleteEncryptedDB } from "@/api/indexeddb-storage";
import { STORAGE_KEYS } from "@/api/storage-keys";

export default {
  namespaced: true,
  state: {
    activeTab: SWAP_PAGE_TABS.SWAP,
    tokens: null,
    balances: {},
    isLoading: false,
    isOpenSuccessModal: false,
    successSwapData: null,
    titleLoad: "",
    messageLoad: "",
    isError: false,
    errorTitle: "",
    errorMessage: "",
    errorHandler: undefined,
    fromProvider: null,
    toProvider: null,
    fromToken: null,
    toToken: null,
    quoteData: null,
    isOpenOneInchCrossChainModal: false,
    fromAmount: "",
    toAmount: undefined,
    rate: undefined,
    reverseRate: undefined,
    inputError: undefined,
    isNeedApprove: false,
    quoteServicesList: [],
    quoteCandidates: [],
    selectedQuoteServiceName: null,
    isNeedIncreaseTrustLimit: false,
    isQuoteLoading: false,
    quoteAbortController: null,
    slippage: INITIAL_SLIPPAGE,
  },
  getters: {
    tokens: (state) => state.tokens,
    tokenBalance: (state) => (token) =>
      state.balances[`${token.chain}-${token.address}`],
    tokenBalancesByChainId:
      (state) =>
      ({ chainId }) => {
        const balances = {};
        for (const balance in state.balances) {
          const indexOfDivider = balance.indexOf("-");
          const cachedChainId = balance.slice(0, indexOfDivider);
          const tokenAddress = balance.slice(indexOfDivider + 1);

          if (cachedChainId === chainId) {
            balances[tokenAddress] = state.balances[balance].amount;
          }
        }
        return balances;
      },
  },
  mutations: {
    [types.SET_TOKENS](state, tokens) {
      state.tokens = tokens;
    },
    [types.SET_SWAP_TOKEN_BALANCE](state, { token, balance }) {
      state.balances[`${token.chain}-${token.address}`] = {
        timestamp: Date.now(),
        amount: balance,
      };
    },
    [types.SET_ALL_SWAP_BALANCES](state, balances) {
      state.balances = balances;
    },
    [types.RESET_SWAP_TOKEN_BALANCE](state) {
      state.balances = {};
    },
    [types.SET_SWAP_LOADING](state, isLoading) {
      state.isLoading = isLoading;
    },
    [types.SET_SWAP_LOADING_TITLE](state, title) {
      state.titleLoad = title;
    },
    [types.SET_SWAP_LOADING_MESSAGE](state, message) {
      state.messageLoad = message;
    },
    [types.SET_SWAP_ERROR](state, isError) {
      state.isError = isError;
    },
    [types.SET_SWAP_ERROR_TITLE](state, title) {
      state.errorTitle = title;
    },
    [types.SET_SWAP_ERROR_MESSAGE](state, message) {
      state.errorMessage = message;
    },
    [types.SET_SWAP_ERROR_HANDLER](state, handler) {
      state.errorHandler = handler;
    },
    [types.SET_ACTIVE_TAB](state, tab) {
      state.activeTab = tab;
    },
    [types.SET_SWAP_SUCCESS_IS_OPEN](state, isOpen) {
      state.isOpenSuccessModal = isOpen;
    },
    [types.SET_SWAP_SUCCESS_DATA](state, data) {
      state.successSwapData = data;
    },
    [types.SET_SWAP_FROM_PROVIDER](state, provider) {
      state.fromProvider = provider;
    },
    [types.SET_SWAP_TO_PROVIDER](state, provider) {
      state.toProvider = provider;
    },
    [types.SET_SWAP_FROM_TOKEN](state, token) {
      state.fromToken = token;
    },
    [types.SET_SWAP_TO_TOKEN](state, token) {
      state.toToken = token;
    },
    [types.SET_SWAP_QUOTE_DATA](state, quoteData) {
      state.quoteData = quoteData;
    },
    [types.RESET_SWAP_QUOTE_DATA](state) {
      state.quoteData = null;
      state.rate = undefined;
      state.reverseRate = undefined;
      state.inputError = undefined;
      state.isNeedApprove = false;
      state.quoteServicesList = [];
      state.quoteCandidates = [];
      state.selectedQuoteServiceName = null;
      state.isNeedIncreaseTrustLimit = false;
      state.toAmount = undefined;
    },
    [types.SET_ONE_INCH_CROSS_CHAIN_MODAL](state, isOpen) {
      state.isOpenOneInchCrossChainModal = isOpen;
    },
    [types.SET_SWAP_FROM_AMOUNT](state, amount) {
      state.fromAmount = amount;
    },
    [types.SET_SWAP_TO_AMOUNT](state, amount) {
      state.toAmount = amount;
    },
    [types.SET_SWAP_RATE_DATA](state, { rate, reverseRate }) {
      state.rate = rate;
      state.reverseRate = reverseRate;
    },
    [types.SET_SWAP_INPUT_ERROR](state, error) {
      state.inputError = error;
    },
    [types.SET_SWAP_IS_NEED_APPROVE](state, isNeedApprove) {
      state.isNeedApprove = isNeedApprove;
    },
    [types.SET_SWAP_QUOTE_SERVICES_LIST](state, servicesList) {
      state.quoteServicesList = servicesList;
    },
    [types.SET_SWAP_QUOTE_CANDIDATES](state, candidates) {
      state.quoteCandidates = candidates;
    },
    [types.SET_SWAP_SELECTED_QUOTE_SERVICE_NAME](state, name) {
      state.selectedQuoteServiceName = name;
    },
    [types.SET_SWAP_IS_NEED_INCREASE_TRUST_LIMIT](state, isNeedIncrease) {
      state.isNeedIncreaseTrustLimit = isNeedIncrease;
    },
    [types.SET_SWAP_IS_QUOTE_LOADING](state, isLoading) {
      state.isQuoteLoading = isLoading;
    },
    [types.SET_SWAP_QUOTE_ABORT_CONTROLLER](state, controller) {
      state.quoteAbortController = controller;
    },
  },
  actions: {
    setTokens({ commit, dispatch, state }, tokens) {
      commit(types.SET_TOKENS, tokens);
      if (!state.fromToken) {
        dispatch("setFromDefaultToken");
      }
      if (!state.toToken) {
        dispatch("setToDefaultToken");
      }
    },
    async setBalance({ commit, state }, { token, balance }) {
      commit(types.SET_SWAP_TOKEN_BALANCE, { token, balance });
      await writeEncryptedDB(STORAGE_KEYS.SWAP_BALANCES, state.balances);
    },
    async resetBalances({ commit }) {
      commit(types.RESET_SWAP_TOKEN_BALANCE);
      await deleteEncryptedDB(STORAGE_KEYS.SWAP_BALANCES);
    },
    openLoading({ commit }, { title, message }) {
      commit(types.SET_SWAP_LOADING, true);
      commit(types.SET_SWAP_LOADING_TITLE, title);
      commit(types.SET_SWAP_LOADING_MESSAGE, message);
    },
    closeLoading({ commit }) {
      commit(types.SET_SWAP_LOADING, false);
      commit(types.SET_SWAP_LOADING_TITLE, "");
      commit(types.SET_SWAP_LOADING_MESSAGE, "");
    },
    setLoadTitle({ commit }, title) {
      commit(types.SET_SWAP_LOADING_TITLE, title);
    },
    setError({ commit }, { title, message, handler }) {
      commit(types.SET_SWAP_ERROR, true);
      commit(types.SET_SWAP_ERROR_TITLE, title);
      commit(types.SET_SWAP_ERROR_MESSAGE, message);
      commit(types.SET_SWAP_ERROR_HANDLER, handler);
    },
    resetError({ commit }) {
      commit(types.SET_SWAP_ERROR, false);
      commit(types.SET_SWAP_ERROR_TITLE, "");
      commit(types.SET_SWAP_ERROR_MESSAGE, "");
      commit(types.SET_SWAP_ERROR_HANDLER, undefined);
    },

    async initializeStore({ commit, dispatch, state }, headerStoreProvider) {
      const savedBalances = await readEncryptedDB(STORAGE_KEYS.SWAP_BALANCES, {});
      if (savedBalances && Object.keys(savedBalances).length > 0) {
        commit(types.SET_ALL_SWAP_BALANCES, savedBalances);
      }

      if (state.tokens === null) {
        await dispatch("getTokens");
      }

      if (headerStoreProvider) {
        dispatch("setFromProvider", headerStoreProvider);
      }

      if (state.toProvider === null) {
        let targetProvider = rpcList[0];

        for (let i = 0; i < rpcList.length; i++) {
          if (rpcList[i].swapChain && rpcList[i].swapChain !== headerStoreProvider?.swapChain) {
            targetProvider = rpcList[i];
            break;
          }
        }
        dispatch("setToProvider", targetProvider);
      }
    },
    async getTokens({ dispatch, state }) {
      try {
        dispatch("openLoading", { title: "Loading tokens" });
        let tokens = await CoreSwapService.getTokens();
        const sortedByChainsTokens = sortTokensByChainIds(tokens);
        const sortedByProviderTokens =
          sortTokensByProviderTokens(sortedByChainsTokens);
        dispatch("setTokens", sortedByProviderTokens);
      } catch (error) {
        dispatch("setError", {
          title: "Get tokens error",
          message: "Something went wrong. Please try again.",
        });
      } finally {
        dispatch("closeLoading");
      }
    },

    openSuccessSwapModal({ commit }, data) {
      commit(types.SET_SWAP_SUCCESS_IS_OPEN, true);
      commit(types.SET_SWAP_SUCCESS_DATA, data);
    },
    closeSuccessSwapModal({ commit }) {
      commit(types.SET_SWAP_SUCCESS_IS_OPEN, false);
      commit(types.SET_SWAP_SUCCESS_DATA, null);
    },
    closeSuccessSwapModalAndOpenHistory({ commit }) {
      commit(types.SET_SWAP_SUCCESS_IS_OPEN, false);
      commit(types.SET_SWAP_SUCCESS_DATA, null);
      commit(types.SET_ACTIVE_TAB, SWAP_PAGE_TABS.HISTORY);
    },
    setActiveTab({ commit }, tab) {
      commit(types.SET_ACTIVE_TAB, tab);
    },
    handleGetQuoteError({ dispatch }, error) {
      let title = "Get quote error.";
      let message = "Something went wrong.";

      switch (error.message) {
        case "quote fail":
          title = "This direction not supported.";
          message = "Please select another tokens.";
          break;
        case "unsupported_provider":
          title = "This direction not supported.";
          message = "Please select another target provider.";
          break;
        case "only_venom":
          title = "This direction not supported.";
          message = "Please select Venom target provider.";
          break;
        case "This fromToken does not support exchange yet":
          title = "Get quote error.";
          message = "This source token does not support exchange yet";
          break;
        case "This toToken does not support exchange yet":
          title = "Get quote error.";
          message = "This target token does not support exchange yet";
          break;
        case "Not supported direction":
          title = "Get quote error.";
          message =
            "This direction not supported. Please select another tokens.";
          break;
        default:
          break;
      }

      dispatch("setError", { title, message });
    },

    setFromDefaultToken({ dispatch, state }) {
      const fromChain = state.fromProvider?.swapChain;
      const toChain = state.toProvider?.swapChain;
      const tokens = state.tokens?.[fromChain];

      if (!fromChain || !tokens || tokens.length === 0) return;

      const defaultAddresses = DEFAULT_ADDRESSES_BY_CHAIN[fromChain] || [
        tokens[0].address,
      ];
      const prevToken = tokens.find(
        (token) =>
          token.address.toLowerCase() ===
          state.fromToken?.address?.toLowerCase()
      );
      const defaultToken = tokens.find(
        (token) =>
          token.address.toLowerCase() === defaultAddresses[0].toLowerCase()
      );
      const token = prevToken || defaultToken || tokens[0];

      if (
        toChain === fromChain &&
        state.toToken?.address?.toLowerCase() === token.address.toLowerCase()
      ) {
        const altToken = tokens.find(
          (token) =>
            token.address.toLowerCase() ===
            (defaultAddresses[1]?.toLowerCase() || "")
        );
        dispatch("setFromToken", altToken || tokens[0]);
        return;
      }

      dispatch("setFromToken", token);
    },

    setToDefaultToken({ dispatch, state }) {
      if (!state.toProvider?.swapChain || !state.tokens) {
        return;
      }
      const tokensList = state.tokens[state.toProvider?.swapChain];
      if (!tokensList || tokensList.length === 0) {
        return;
      }
      const defaultAddresses = DEFAULT_ADDRESSES_BY_CHAIN[
        state.toProvider?.swapChain
      ] || [tokensList[0].address];

      let selectedToken = tokensList.find(
        (token) =>
          token.address.toLowerCase() === defaultAddresses[0].toLowerCase()
      );
      if (
        state.toProvider?.swapChain === state.fromProvider?.swapChain &&
        state.fromToken?.address === selectedToken.address
      ) {
        dispatch(
          "setToToken",
          tokensList.find(
            (token) =>
              token.address.toLowerCase() === defaultAddresses[1]?.toLowerCase()
          ) || tokensList[0]
        );
        return;
      } else {
        dispatch("setToToken", selectedToken);
      }
    },

    setFromProvider({ commit, dispatch, state }, provider) {
      if (!provider) return;

      const isCorrectProvider =
        !!provider.swapChain &&
        Object.keys(SWAP_CHAINS).includes(provider.swapChain);

      if (isCorrectProvider) {
        dispatch("resetError");
        if (
          provider.swapChain === state.fromProvider?.swapChain &&
          provider.name === state.fromProvider?.name
        ) {
          if (!state.fromToken) {
            dispatch("setFromDefaultToken");
          }
          return;
        }
        commit(types.SET_SWAP_FROM_PROVIDER, provider);
        if (this.state.settings?.rpcProvider?.name !== provider.name) {
          dispatch("settings/setRpcProvider", provider, { root: true });
          const publicKeyCard = this.state.user.publicKeyCard;
          const providerManager = createProviderManager(provider.swapChain);
          providerManager
            .getWalletAddress(publicKeyCard)
            .then((accountAddress) => {
              dispatch("user/setAccountAddress", accountAddress, { root: true });
            });
        }
        dispatch("setFromDefaultToken");
      } else {
        commit(types.SET_SWAP_FROM_PROVIDER, provider);
        dispatch("setError", {
          title: "Selected provider not supported",
          message: "Please select another provider.",
        });
      }
    },

    setToProvider({ commit, dispatch }, provider) {
      dispatch("resetError");
      commit(types.SET_SWAP_TO_PROVIDER, provider);
      dispatch("setToDefaultToken");
    },

    setFromToken({ commit, dispatch }, token) {
      commit(types.SET_SWAP_FROM_TOKEN, token);
    },

    setToToken({ commit }, token) {
      commit(types.SET_SWAP_TO_TOKEN, token);
    },

    replaceProviders({ commit, dispatch, state }) {
      const { fromProvider, toProvider, fromToken, toToken } = state;
      const fromProviderCopy = fromProvider;
      commit(types.SET_SWAP_FROM_PROVIDER, toProvider);
      dispatch("settings/setRpcProvider", toProvider, { root: true });
      const publicKeyCard = this.state.user.publicKeyCard;
      const providerManager = createProviderManager(toProvider.swapChain);
      providerManager.getWalletAddress(publicKeyCard).then((accountAddress) => {
        dispatch("user/setAccountAddress", accountAddress, { root: true });
      });

      commit(types.SET_SWAP_TO_PROVIDER, fromProviderCopy);

      const fromTokenCopy = fromToken;
      dispatch("setFromToken", toToken);
      dispatch("setToToken", fromTokenCopy);
    },
    async calcRate({ commit }, quoteData) {
      const rateData = await calculateRate({
        fromAmount: quoteData.txData.fromTokenAmount,
        fromDecimal: quoteData.txData.fromTokenDecimal,
        toAmount: quoteData.txData.amountOutMin,
        toDecimal: quoteData.txData.toTokenDecimal,
      });

      commit(types.SET_SWAP_RATE_DATA, rateData);
    },
    setQuoteData({ commit, dispatch }, quoteData) {
      commit(types.SET_SWAP_QUOTE_DATA, quoteData);
      dispatch("calcRate", quoteData);
    },
    resetQuoteData({ commit }) {
      commit(types.RESET_SWAP_QUOTE_DATA);
    },
    openOneInchCrossChainModal({ commit }) {
      commit(types.SET_ONE_INCH_CROSS_CHAIN_MODAL, true);
    },
    closeOneInchCrossChainModal({ commit }) {
      commit(types.SET_ONE_INCH_CROSS_CHAIN_MODAL, false);
    },
    setFromAmount({ commit }, amount) {
      commit(types.SET_SWAP_FROM_AMOUNT, amount);
    },
    setToAmount({ commit }, amount) {
      commit(types.SET_SWAP_TO_AMOUNT, amount);
    },

    setIsQuoteLoading({ commit }, isLoading) {
      commit(types.SET_SWAP_IS_QUOTE_LOADING, isLoading);
    },
    setQuoteAbortController({ commit }, controller) {
      commit(types.SET_SWAP_QUOTE_ABORT_CONTROLLER, controller);
    },
    abortPreviousRequest({ dispatch, state }) {
      if (state.quoteAbortController) {
        state.quoteAbortController.abort();
      }
      dispatch("setQuoteAbortController", new AbortController());
    },
    setQuoteServicesList({ commit }, servicesList) {
      commit(types.SET_SWAP_QUOTE_SERVICES_LIST, servicesList);
    },
    setQuoteCandidates({ commit }, candidates) {
      commit(types.SET_SWAP_QUOTE_CANDIDATES, candidates);
    },
    setSelectedQuoteServiceName({ commit }, name) {
      commit(types.SET_SWAP_SELECTED_QUOTE_SERVICE_NAME, name);
    },
    selectQuoteService({ commit, state, dispatch }, serviceName) {
      dispatch("setInputError", null);
      const candidate = state.quoteCandidates.find(
        (q) => q.txData.dex === serviceName,
      );
      if (!candidate) {
        return;
      }
      if (Number(candidate.txData?.toTokenAmount ?? 0) <= 0) {
        return;
      }
      commit(types.SET_SWAP_SELECTED_QUOTE_SERVICE_NAME, serviceName);
      commit(types.SET_SWAP_QUOTE_DATA, candidate);
      dispatch("setToAmount", candidate.txData?.toTokenAmount);
      const servicesList = state.quoteServicesList.map((row) => ({
        ...row,
        isSelected: row.service === serviceName,
      }));
      commit(types.SET_SWAP_QUOTE_SERVICES_LIST, servicesList);
     
      try {
        if (
        candidate.txData.depositMin &&
        candidate.txData.depositMax
      ) {
        checkIsBetweenMinMax(
          state.fromAmount,
          candidate.txData.depositMin,
          candidate.txData.depositMax,
          state.fromToken,
        );
      }
      dispatch("checkIsNeedApprove");
      } catch (error) {
        if (error.name === "InputError") {
          dispatch("setInputError", error.message);
          return;
        }
      }
      
    },

    async checkIsNeedApprove({ commit, state }) {
      const { fromProvider, fromToken, fromAmount, quoteData } = state;
      const isNeedApprove = await checkIsAmountIsApproved({
        provider: fromProvider,
        keyCard: this.state.user.publicKeyCard,
        token: fromToken,
        amount: fromAmount,
        spenderAddress: quoteData.txData.contractAddress,
      });
      commit(types.SET_SWAP_IS_NEED_APPROVE, isNeedApprove);
    },

    setInputError({ commit }, error) {
      commit(types.SET_SWAP_INPUT_ERROR, error);
    },

    setIsNeedIncreaseTrustLimit({ commit }, isNeedIncrease) {
      commit(types.SET_SWAP_IS_NEED_INCREASE_TRUST_LIMIT, isNeedIncrease);
    },
    async getQuote({ dispatch, state }) {
      dispatch("abortPreviousRequest");
      dispatch("resetQuoteData");
      dispatch("autoReload/stopAutoReload");
      dispatch("setInputError", null);

      const { fromAmount, fromToken, fromProvider, toToken, toProvider, slippage } = state;
      const numAmount = Number(fromAmount);
      if (!fromAmount || isNaN(numAmount) || numAmount <= 0) {
        return;
      }
      if (!fromToken || !toToken || !fromProvider || !toProvider) {
        return;
      }

      dispatch("setIsQuoteLoading", true);

      try {
        await checkBalance(fromAmount, fromToken);

        const publicKeyCard = this.state.user.publicKeyCard;
        const ownerAddressByProvider = await getOwnerAddress(
          fromProvider,
          publicKeyCard
        );
        const quoteOutcome = await CoreSwapService.getQuote(
          {
            fromToken,
            toToken,
            amount: fromAmount,
            accountAddress: ownerAddressByProvider,
            slippage,
          },
          state.quoteAbortController.signal
        );

        dispatch("setQuoteCandidates", quoteOutcome.allQuotes);
        dispatch(
          "setSelectedQuoteServiceName",
          quoteOutcome.quote.txData.dex,
        );
        dispatch("setQuoteServicesList", quoteOutcome.servicesResult);
        dispatch("setQuoteData", quoteOutcome.quote);

        dispatch("setToAmount", quoteOutcome.quote.txData?.toTokenAmount);
        if (
          quoteOutcome.quote.txData.depositMin &&
          quoteOutcome.quote.txData.depositMax
        ) {
          checkIsBetweenMinMax(
            fromAmount,
            quoteOutcome.quote.txData.depositMin,
            quoteOutcome.quote.txData.depositMax,
            fromToken
          );
        }

        if (quoteOutcome.quote.txData?.fee) {
          try {
            await checkBalanceForFee({
              swapProvider: fromProvider,
              feeAmount: quoteOutcome.quote.txData.fee,
              publicKey: publicKeyCard,
              nativeTokenAmount:
                fromToken.address === SWAP_NATIVE_ADDRESS ? fromAmount : "0",
            });
          } catch (feeError) {
            if (feeError.name === "InputError") {
              dispatch("setInputError", feeError.message);
              return;
            }
          }
        }

        dispatch("autoReload/startAutoReload");

        await dispatch("checkIsNeedApprove");
      } catch (error) {
        dispatch("autoReload/stopAutoReload");
        if (error.message === "Aborted") {
          return;
        }
        if (error.name === "InputError") {
          dispatch("setInputError", error.message);
          return;
        }
        dispatch("handleGetQuoteError", error);
        dispatch("resetQuoteData");
      } finally {
        dispatch("setIsQuoteLoading", false);
        dispatch("setQuoteAbortController", null);
      }
    },
  },
  modules: {
    autoReload,
  },
};

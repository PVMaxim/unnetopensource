import { ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useSwapFormState } from './useSwapFormState';
import {
  createProviderManagerAndToken,
  updateAndGetTokenBalance,
  getTokenBalance,
} from '@/api/swap/utils/tokenBalances';
import { getOwnerAddress } from '@/api/swap/utils/ownerAddress';
import { calculateComission } from '@/api/swap/utils/rate';
import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS, SWAP_SERVICES } from '@/api/constants-types';
import { getTokenPrice } from '@/api/swap/utils/tokenPrice';
import {
  openConfirmModal,
  openTransactionErrorModal,
} from '@/utils/modalHandlers';
import { INITIAL_SLIPPAGE } from '@/api/swap/configs';
import { checkAndAddUserToken } from '@/api/swap/utils/tokens';
import CoreSwapService from '@/api/swap/services/core';
import { checkBalanceForFee } from '@/api/swap/utils/token';
import { checkIsNeedIncreaseTrustLimitXrp } from '@/api/swap/utils/xrpUtils';
import { formatAmount } from '@/api/swap/utils/formatting';
import { getErrorMessage } from '@/api/sub-utils';

export function useSwapActions({ signTransaction, clearPin }) {
  const store = useStore();
  const { t } = useI18n();

  const {
    fromProvider,
    toProvider,
    fromAmount,
    toAmount,
    fromToken,
    toToken,
    quoteData,
    selectedQuoteServiceName,
    selectedSwapService,
    swapTokens,
    publicKeyCard,
  } = useSwapFormState();

  const slippage        = ref(INITIAL_SLIPPAGE);
  const comission       = ref(null);
  const comissionInUsd  = ref(null);

  watch(quoteData, async (newQuoteData) => {
    if (newQuoteData) {
      comission.value = calculateComission(newQuoteData.txData.fee, fromAmount.value);
    }
  });

  watch(comission, async (newComission) => {
    if (newComission) {
      comissionInUsd.value = await getTokenPrice(fromToken.value, newComission);
    }
  });

  const checkAmount = () => {
    const num = Number(fromAmount.value);
    if (!Number.isFinite(num) || num <= 0) {
      throw new Error(t('swap.errors.invalidAmount'));
    }
  };

  const approveToken = async () => {
    try {
      checkAmount();
      store.dispatch('swap/openLoading', { title: t('swap.loader.createManager') });
      const { providerManager, token } = await createProviderManagerAndToken(
        fromProvider.value,
        fromToken.value,
      );
      store.dispatch('swap/setLoadTitle', t('swap.loader.createTx'));
      const tx = await token.approve({
        spender: quoteData.value.txData.contractAddress,
        amount: fromAmount.value,
        keys: publicKeyCard.value,
      });
      const fee = await tx.estimateFee();
      await checkBalanceForFee({
        swapProvider: fromProvider.value,
        feeAmount: fee,
        publicKey: publicKeyCard.value,
      });
      store.dispatch('swap/setLoadTitle', t('swap.loader.createTxHash'));
      await signTransaction(tx);
      const hash = await tx.send();
      await providerManager.getTransactionStatus(hash);
      await store.dispatch('swap/checkIsNeedApprove');
      store.dispatch('swap/closeLoading');
    } catch (err) {
      store.dispatch('swap/closeLoading');
      clearPin();
      const { title, message } = await getErrorMessage(err);
      store.dispatch('swap/setError', {
        title: title ?? err.message,
        message: message ?? t('swap.action.pressOk'),
      });
    }
  };

  const updateOrderAndUploadHash = async (hash, orderId) => {
    const fromAddress = await getOwnerAddress(fromProvider.value, publicKeyCard.value);
    const toAddress   = await getOwnerAddress(toProvider.value,   publicKeyCard.value);

    if (selectedSwapService.value?.updateOrderAnaUploadHash === undefined) {
      store.dispatch('swap/closeLoading');
      store.dispatch('swap/openSuccessSwapModal', {
        token: toToken.value,
        amount: toAmount.value,
        dexName: quoteData.value.txData.dex,
      });
      await updateAndGetTokenBalance(fromAddress, fromToken.value);
      await updateAndGetTokenBalance(toAddress, toToken.value);
      return;
    }

    const resultCode = await selectedSwapService.value.updateOrderAnaUploadHash({
      amountOutMin: quoteData.value.txData.amountOutMin,
      fromAddress,
      fromToken: fromToken.value,
      toToken: toToken.value,
      toAddress,
      fromAmount: fromAmount.value,
      hash,
      orderId,
    });
    store.dispatch('swap/closeLoading');
    if (resultCode === 100) {
      store.dispatch('swapHistory/updateHistory');
      store.dispatch('swap/openSuccessSwapModal', {
        token: toToken.value,
        amount: toAmount.value,
        dexName: quoteData.value.txData.dex,
      });
      await updateAndGetTokenBalance(fromAddress, fromToken.value);
      await updateAndGetTokenBalance(toAddress, toToken.value);
    } else {
      openTransactionErrorModal();
    }
  };

  const confirmSwap = async () => {
    try {
      store.dispatch('swap/openLoading', { title: t('swap.loader.checkingAmounts') });
      checkAmount();
      store.dispatch('swap/setLoadTitle', t('swap.loader.getQuote'));
      const { providerManager } = await createProviderManagerAndToken(
        fromProvider.value,
        fromToken.value,
      );
      store.dispatch('swap/setLoadTitle', t('swap.loader.createTransaction'));
      const { tx, orderId } = await CoreSwapService.createTransaction(
        {
          fromProvider: fromProvider.value,
          fromToken: fromToken.value,
          toToken: toToken.value,
          fromAmount: fromAmount.value,
          amountOutMin: quoteData.value.txData.amountOutMin,
          slippage: slippage.value,
          toProvider: toProvider.value,
          publicKeyCard: publicKeyCard.value,
          crossSwapPayload: quoteData.value.txData?.crossSwapPayload,
          quote: quoteData.value.txData?.quote,
        },
        selectedQuoteServiceName.value,
      );
      await signTransaction(tx);
      store.dispatch('swap/setLoadTitle', t('swap.loader.sendingTransaction'));
      let hash = await tx.send();

      if (fromProvider.value.swapChain === SWAP_CHAINS.TON) {
        hash = Buffer.from(hash, 'base64').toString('hex');
      }
      const ownerAddressByProvider = await getOwnerAddress(
        fromProvider.value,
        publicKeyCard.value,
      );
      store.dispatch('swap/setLoadTitle', t('swap.loader.waitingConfirmation'));
      if (hash) {
        await providerManager.getTransactionStatus(hash, {
          ownerAddress: ownerAddressByProvider,
        });
      }
      updateOrderAndUploadHash(hash, orderId);
      checkAndAddUserToken(fromToken.value);
      checkAndAddUserToken(toToken.value);
    } catch (err) {
      clearPin();
      store.dispatch('swap/closeLoading');
      throw err?.cause?.errorBody
        ? new Error(err.message, { cause: err?.cause })
        : err;
    }
  };

  const increaseTrustLimit = async () => {
    try {
      store.dispatch('swap/openLoading', { title: t('swap.loader.createTransaction') });
      const { providerManager, token: xrpToken } = await createProviderManagerAndToken(
        toProvider.value,
        toToken.value,
      );
      const tx = await xrpToken.setTrustLimit({
        limit: 9999999999999999e80,
        keys: publicKeyCard.value,
      });
      await signTransaction(tx);
      const hash = await tx.send();
      await providerManager.getTransactionStatus(hash);
      store.dispatch('swap/setIsNeedIncreaseTrustLimit', false);
      store.dispatch('swap/closeLoading');
    } catch (err) {
      store.dispatch('swap/closeLoading');
      clearPin();
      const { title, message } = await getErrorMessage(err);
      store.dispatch('swap/setError', {
        title: title ?? err.message,
        message: message ?? t('swap.action.pressOk'),
      });
    }
  };

  const setFromValueMaxBalance = async () => {
    const balance = await getTokenBalance(fromToken.value);
    if (Number(balance) > 0) {
      store.dispatch('swap/setFromAmount', formatAmount(balance));
    }
  };

  const openModal = async () => {
    store.dispatch('swap/autoReload/stopAutoReload');

    if (
      fromProvider.value.swapChain !== SWAP_CHAINS.SOLANA &&
      fromToken.value.address === SWAP_NATIVE_ADDRESS &&
      [SWAP_SERVICES.OneInchFusionV2, SWAP_SERVICES.OneInchFusionPlus].includes(
        quoteData.value.txData.dex,
      )
    ) {
      store.dispatch('swap/openOneInchCrossChainModal');
      return;
    }

    store.dispatch('swap/setIsQuoteLoading', true);
    let networkCommissionData;
    try {
      const isNeedIncrease = await checkIsNeedIncreaseTrustLimitXrp(
        toProvider.value,
        toToken.value,
        toAmount.value,
        publicKeyCard.value,
      );
      if (isNeedIncrease) {
        store.dispatch('swap/setIsNeedIncreaseTrustLimit', true);
        store.dispatch('swap/setIsQuoteLoading', false);
        return;
      }

      const prepareTransaction = await CoreSwapService.createPrepareTransaction(
        {
          fromProvider: fromProvider.value,
          fromToken: fromToken.value,
          toToken: toToken.value,
          fromAmount: fromAmount.value,
          amountOutMin: quoteData.value.txData.amountOutMin,
          slippage: slippage.value,
          toProvider: toProvider.value,
          publicKeyCard: publicKeyCard.value,
          crossSwapPayload: quoteData.value.txData?.crossSwapPayload,
          quote: quoteData.value.txData?.quote,
        },
        selectedQuoteServiceName.value,
      );
      const networkCommission = await prepareTransaction.estimateFee();
      await checkBalanceForFee({
        swapProvider: fromProvider.value,
        feeAmount: networkCommission,
        publicKey: publicKeyCard.value,
        nativeTokenAmount:
          fromToken.value.address === SWAP_NATIVE_ADDRESS ? fromAmount.value : '0',
      });

      const tokensList = swapTokens.value[fromProvider.value?.swapChain];
      const coreToken  = tokensList.find((token) => token.address === SWAP_NATIVE_ADDRESS);

      const networkCommissionInUsd = await getTokenPrice(coreToken, networkCommission);
      networkCommissionData = {
        comission: networkCommission,
        comissionInUsd: networkCommissionInUsd,
        tokenSymbol: coreToken.symbol,
      };
      const fromAmountInUsd = await getTokenPrice(fromToken.value, fromAmount.value);
      const toAmountInUsd   = await getTokenPrice(toToken.value,   toAmount.value);

      store.dispatch('swap/setIsQuoteLoading', false);

      openConfirmModal({
        fromAmount: fromAmount.value,
        fromToken: fromToken.value,
        toAmount: toAmount.value,
        toToken: toToken.value,
        comission: comission.value,
        fromAmountInUsd,
        toAmountInUsd,
        networkCommissionData,
        serviceName: selectedQuoteServiceName.value ?? '',
      });
    } catch (error) {
      store.dispatch('swap/setIsQuoteLoading', false);
      const { title, message } = await getErrorMessage(error);
      store.dispatch('swap/setError', {
        title: title ?? error.message,
        message: message ?? t('swap.action.pressOk'),
      });
    }
  };

  return {
    slippage,
    comission,
    comissionInUsd,
    approveToken,
    confirmSwap,
    increaseTrustLimit,
    setFromValueMaxBalance,
    openModal,
  };
}

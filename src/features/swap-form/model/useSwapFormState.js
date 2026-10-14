import { computed } from 'vue';
import { useStore } from 'vuex';
import { prefixStore } from '@/api/ApiHandler';
import CoreSwapService from '@/api/swap/services/core';

/**
 * Provides reactive read-only access to all Vuex state slices
 * needed by the swap form and its child business logic.
 * Single source of truth — no dispatches happen here.
 */
export function useSwapFormState() {
  const store = useStore();

  // ── swap form tokens & providers ──────────────────────────────────────────
  const fromProvider = computed(() => store.state.swap.fromProvider);
  const toProvider   = computed(() => store.state.swap.toProvider);
  const fromAmount   = computed(() => store.state.swap.fromAmount);
  const toAmount     = computed(() => store.state.swap.toAmount);
  const fromToken    = computed(() => store.state.swap.fromToken);
  const toToken      = computed(() => store.state.swap.toToken);

  // ── quote & loading state ─────────────────────────────────────────────────
  const isLoading              = computed(() => store.state.swap.isLoading);
  const isError                = computed(() => store.state.swap.isError);
  const quoteData              = computed(() => store.state.swap.quoteData);
  const inputError             = computed(() => store.state.swap.inputError);
  const isQuoteLoading         = computed(() => store.state.swap.isQuoteLoading);
  const isNeedApprove          = computed(() => store.state.swap.isNeedApprove);
  const isNeedIncreaseTrustLimit = computed(() => store.state.swap.isNeedIncreaseTrustLimit);
  const quoteServicesList      = computed(() => store.state.swap.quoteServicesList);
  const selectedQuoteServiceName = computed(() => store.state.swap.selectedQuoteServiceName);
  const swapTokens             = computed(() => store.state.swap.tokens);

  // ── derived: currently selected swap service object ───────────────────────
  const selectedSwapService = computed(() =>
    CoreSwapService.getSwapServiceByName(selectedQuoteServiceName.value)
  );

  // ── user & settings ───────────────────────────────────────────────────────
  const publicKeyCard       = computed(() => store.state.user.publicKeyCard);
  const accountAddress      = computed(() => store.state.user.accountAddress);
  const cardReaderPriority  = computed(() => store.state.settings.cardReaderPriority);

  // ── card-specific PIN length (stored per card prefix) ─────────────────────
  const pinLength = computed(() => {
    const cardState = store.state[`${prefixStore.value}.customtoken`];
    return cardState?.pinLength ?? 4;
  });

  return {
    fromProvider,
    toProvider,
    fromAmount,
    toAmount,
    fromToken,
    toToken,
    isLoading,
    isError,
    quoteData,
    inputError,
    isQuoteLoading,
    isNeedApprove,
    isNeedIncreaseTrustLimit,
    quoteServicesList,
    selectedQuoteServiceName,
    selectedSwapService,
    swapTokens,
    publicKeyCard,
    accountAddress,
    cardReaderPriority,
    pinLength,
  };
}

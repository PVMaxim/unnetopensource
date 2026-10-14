import { ref } from 'vue';
import { closeConfirmModal } from '@/utils/modalHandlers';

/**
 * Manages the PIN / store-pin flow for the swap form.
 *
 * @param {import('vue').ComputedRef<number>} pinLength - reactive PIN length (4 | 6 | 8).
 * @param {() => Promise<void>} onPinReady - called once PIN is collected and ready to use.
 */
export function useSwapPin(pinLength, onPinReady) {
  const pinState        = ref(false);
  const pinPre          = ref(null);
  const storePin        = ref(null);
  const usePinFromStore = ref(false);

  // ── helpers ───────────────────────────────────────────────────────────────

  /** Reset the current PIN input (e.g. when PIN length changes). */
  const changePinLength = () => {
    pinPre.value = null;
  };

  /** Toggle whether to remember the PIN in memory for this session. */
  const storePinHandler = (shouldStore) => {
    usePinFromStore.value = shouldStore;
  };

  /** Called when the user presses Cancel in the PIN dialog. */
  const pinCancelButton = () => {
    pinState.value = false;
    pinPre.value   = null;
  };

  /** Silently clear the active PIN value (e.g. after a failed tx). */
  const clearPin = () => {
    pinPre.value = null;
  };

  // ── main flow ─────────────────────────────────────────────────────────────

  /** Open the PIN modal. */
  const openPinModal = () => {
    pinState.value = true;
  };

  /**
   * Called every time the user changes the PIN input.
   * When the PIN reaches the required length the modal closes
   * and `onPinReady` is invoked.
   */
  const updatePin = async () => {
    if (pinPre.value !== null && pinPre.value?.length === pinLength.value) {
      pinState.value = false;
      if (usePinFromStore.value) {
        storePin.value = pinPre.value;
      }
      await onPinReady();
    }
  };

  /**
   * Entry point after the user clicks the main action button
   * (Approve / Increase trust limit / Swap).
   * - If store-pin is active: inject it and proceed immediately.
   * - Otherwise: open the PIN modal.
   */
  const checkPin = async () => {
    closeConfirmModal();
    if (usePinFromStore.value) {
      pinPre.value = storePin.value;
      await onPinReady();
    } else {
      openPinModal();
    }
  };

  return {
    pinState,
    pinPre,
    storePin,
    usePinFromStore,
    changePinLength,
    storePinHandler,
    pinCancelButton,
    clearPin,
    openPinModal,
    updatePin,
    checkPin,
  };
}

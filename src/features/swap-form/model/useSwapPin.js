import { ref } from 'vue';
import { closeConfirmModal } from '@/utils/modalHandlers';

export function useSwapPin(pinLength, onPinReady) {
  const pinState        = ref(false);
  const pinPre          = ref(null);
  const storePin        = ref(null);
  const usePinFromStore = ref(false);

  const changePinLength = () => {
    pinPre.value = null;
  };

  const storePinHandler = (shouldStore) => {
    usePinFromStore.value = shouldStore;
  };

  const pinCancelButton = () => {
    pinState.value = false;
    pinPre.value   = null;
  };

  const clearPin = () => {
    pinPre.value = null;
  };

  const openPinModal = () => {
    pinState.value = true;
  };

  const updatePin = async () => {
    if (pinPre.value !== null && pinPre.value?.length === pinLength.value) {
      pinState.value = false;
      if (usePinFromStore.value) {
        storePin.value = pinPre.value;
      }
      await onPinReady();
    }
  };

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

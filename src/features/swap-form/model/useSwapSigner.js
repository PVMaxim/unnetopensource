import { ref } from 'vue';
import { useStore } from 'vuex';
import { setUniSettings } from '@/api/global-settings';

/**
 * Encapsulates card signing via NFC or FIDO.
 *
 * @param {import('vue').Ref<string|null>} pinRef
 *   Shared PIN ref owned by useSwapPin.
 *   It is read by signTransaction and cleared in the finally block.
 */
export function useSwapSigner(pinRef) {
  const store = useStore();

  /**
   * Template ref bound to <NFCHandlerWindow ref="nfcHandlerWindow">.
   * Declared here so the signing logic lives in one place.
   */
  const nfcHandlerWindow = ref(null);
  const nfcIsActive      = ref(false);

  /**
   * Signs `transaction` using the current card IO method (NFC or FIDO).
   * Clears the PIN from memory regardless of success or failure.
   *
   * @param {import('@/api/common').Request} transaction
   * @throws {Error} Re-throws with cause preserved when available.
   */
  const signTransaction = async (transaction) => {
    try {
      setUniSettings({
        ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc',
      });

      await nfcHandlerWindow.value?.nfcProgressChunksHandler(
        transaction,
        pinRef.value,
        true,
      );
    } catch (err) {
      throw err?.cause?.errorBody
        ? new Error(err.message, { cause: err?.cause })
        : new Error(`Error signing transaction: ${err.message}`);
    } finally {
      pinRef.value = null;
    }
  };

  return {
    nfcHandlerWindow,
    nfcIsActive,
    signTransaction,
  };
}

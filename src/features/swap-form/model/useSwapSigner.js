import { ref } from 'vue';
import { useStore } from 'vuex';
import { setUniSettings } from '@/api/global-settings';

export function useSwapSigner(pinRef) {
  const store = useStore();

  const nfcHandlerWindow = ref(null);
  const nfcIsActive      = ref(false);

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

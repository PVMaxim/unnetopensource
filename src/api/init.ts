import { store } from '@/store/index';

let initPromise: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await store.dispatch('lang/initializeLang');
      } catch (err) {
      }

      try {
        await store.dispatch('settings/initializeSettings');
      } catch (err) {
      }

      try {
        await store.dispatch('user/initialize');
      } catch (err) {
      }

      try {
        await store.dispatch('swapHistory/initializeHistory');
      } catch (err) {
      }
    })();
  }
  return initPromise;
}

import { store } from '@/store/index';
import { runDataMigration } from './migration';

let initPromise: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await runDataMigration();
        await store.dispatch('lang/initializeLang');
        await store.dispatch('settings/initializeSettings');
        await store.dispatch('user/initialize');
        await store.dispatch('swapHistory/initializeHistory');
      } catch (e) {
      }
    })();
  }
  return initPromise;
}

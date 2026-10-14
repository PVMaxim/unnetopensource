import { ref } from 'vue';
import { store } from '../store/index';
import { isCardRegistered } from '../api/check-guards';
import { RPC_NAMES } from '../api/constants-types';
import { isValidWalletAddress } from '../api/ApiHandler';

const isExcludedRoute = (path) => {
  if (!path) return false;
  const lowerPath = path.toLowerCase();
  return lowerPath.includes('restore-card') ||
    lowerPath.includes('settings') ||
    lowerPath.includes('re-registration-card') ||
    lowerPath.includes('sign-in') ||
    lowerPath.includes('authorization');
};

const checkInitially = () => {
  const providerName = store.state.settings.rpcProvider?.name;
  // NOTE (Temporary Dev/Test): Split into CANTON_TEST and CANTON_DEV.
  // To revert back to single CANTON: `const isCanton = providerName === RPC_NAMES.CANTON;`
  const isCanton = providerName === RPC_NAMES.CANTON_TEST || providerName === RPC_NAMES.CANTON_DEV;
  const path = window.location.pathname;
  if (isExcludedRoute(path)) return false;
  if (!isCardRegistered()) return false;

  if (isCanton) {
    return isCardRegistered();
  } else {
    const addr = store.state.user.accountAddress;
    return !addr || !isCardRegistered() || !isValidWalletAddress(addr);
  }
};

export const isCantonOnboardingActive = ref(checkInitially());

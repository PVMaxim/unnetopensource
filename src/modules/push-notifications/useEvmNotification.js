import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ethers } from 'ethers';
import { SWAP_CHAINS } from '@/api/constants-types';

const EVM_CHAINS = new Set([
  SWAP_CHAINS.ETH,
  SWAP_CHAINS.BSC,
  SWAP_CHAINS.ARBITRUM,
  SWAP_CHAINS.BASE,
  SWAP_CHAINS.POLYGON,
  SWAP_CHAINS.AVALANCHE,
]);

const ANALYZE_API = 'https://web3-retainer.sss-from-ls.workers.dev/analyze';
const NEWS_STORAGE_KEY = 'push_news_notifications_enabled';

const isNewsEnabled = ref(
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(NEWS_STORAGE_KEY) !== 'false'
    : true
);

const notificationText = ref(null);
const isVisible = ref(false);

export const setNewsNotificationsEnabled = (enabled) => {
  isNewsEnabled.value = Boolean(enabled);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(NEWS_STORAGE_KEY, String(enabled));
  }
  if (!enabled) {
    isVisible.value = false;
  }
};

export const getNewsNotificationsEnabled = () => isNewsEnabled.value;

const dismiss = () => {
  isVisible.value = false;
};

const fetchNotification = async (address) => {
  if (!isNewsEnabled.value) return;
  try {
    const res = await fetch(`${ANALYZE_API}/${address}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.pushNotificationText && isNewsEnabled.value) {
      notificationText.value = data.pushNotificationText;
      isVisible.value = true;
    }
  } catch (e) {
    console.error('[useEvmNotification] API error:', e);
  }
};

let watcherRegistered = false;

const registerWatcher = (store) => {
  const target = computed(() => {
    const chain = store.state.settings?.rpcProvider?.swapChain;
    const address = store.state.user?.accountAddress;
    const isEvmChain = Boolean(chain && EVM_CHAINS.has(chain));
    const isValidAddress = Boolean(address && ethers.isAddress(address));

    return {
      chain,
      address: isValidAddress ? address : null,
      canFetch: isEvmChain && isValidAddress,
    };
  });

  watch(target, ({ canFetch, address }) => {
    if (canFetch && address) {
      fetchNotification(address);
    }
  }, { immediate: true });
};

export function useEvmNotification() {
  if (!watcherRegistered) {
    watcherRegistered = true;
    registerWatcher(useStore());
  }

  return { notificationText, isVisible, dismiss };
}

<template>
  <Teleport to="body">
    <div v-if="isVisible" class="toast-wrapper">
      <Transition name="slide-top" appear>
        <div 
          v-if="isVisible" 
          class="toast-card" 
          @click="handleClick"
          @mouseenter="pauseTimer"
          @mouseleave="resumeTimer"
        >
          <div class="toast-content">
            <!-- Left: Blockchain Icon + Blockchain Name -->
            <div class="toast-left">
              <component 
                v-if="token?.chain && getTokenIcon(token.chain)" 
                :is="getTokenIcon(token.chain)" 
                class="chain-icon" 
              />
              <span class="chain-name" v-if="token?.chain">{{ token.chain }}</span>
            </div>

            <!-- Right details: Amount on top, Token Icon + Name underneath (aligned right) -->
            <div class="toast-details">
              <div class="toast-amount">+{{ token?.balance }}</div>
              <div class="toast-token-row">
                <div class="token-mini-icon">
                  <component 
                    v-if="token?.symbol && getTokenIcon(token.symbol) !== null" 
                    :is="getTokenIcon(token.symbol)" 
                    class="icon" 
                  />
                  <img 
                    v-else-if="tokenIconUrl && !hasIconError" 
                    :src="tokenIconUrl" 
                    class="icon" 
                    :alt="token?.symbol" 
                    @error="handleIconError" 
                  />
                  <div v-else class="token-avatar-mini">
                    {{ token?.symbol?.slice(0, 3) || 'TOK' }}
                  </div>
                </div>
                <span class="symbol-name">{{ token?.symbol }}</span>
                <span class="token-fullname" v-if="token?.name && token.name !== token.symbol">({{ token.name }})</span>
                <span class="contract-text" v-if="token?.contractAddress">
                  • {{ shortenAddress(token.contractAddress) }}
                </span>
              </div>
            </div>

            <!-- Far Right: Close Button -->
            <div class="toast-actions">
              <button class="toast-close" @click.stop="close" title="Закрыть">✕</button>
            </div>
          </div>

          <!-- Bottom Progress Bar -->
          <div class="progress-bar-container">
            <div 
              class="progress-bar" 
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { getManager } from '@/api/ApiHandler';
import { getTokenIcon, getCoinGeckoIconUrl } from '@/api/token-icons';
import { useEventsBus } from '@/plugins/eventBus';
import type { DetectedTokenInfo, TransactionNotificationPayload } from '../services/TokenDetectorService';

const isVisible = ref(false);
const alertType = ref<'unknown' | 'transaction'>('transaction');
const hasIconError = ref(false);
const remoteIconUrl = ref<string | null>(null);
const remoteIconCache = new Map<string, string>();

const token = ref<{
  chain: string;
  symbol: string;
  name?: string;
  balance: string | number;
  totalBalance?: string | number;
  contractAddress?: string;
  decimals?: number;
  iconUrl?: string;
} | null>(null);

// 10-second timer state
const DURATION_MS = 10000;
const progressPercent = ref(100);
let timerId: any = null;
let startTime = 0;
let remainingMs = DURATION_MS;
let animFrameId: any = null;

const { on } = useEventsBus();

const COINGECKO_PLATFORMS: Record<string, string> = {
  Ethereum: 'ethereum',
  Polygon: 'polygon-pos',
  BSC: 'binance-smart-chain',
  Arbitrum: 'arbitrum-one',
  Base: 'base',
  Avalanche: 'avalanche',
  Solana: 'solana',
  TRON: 'tron',
  TON: 'the-open-network',
  XRP: 'xrp',
  COTI: 'coti',
  Venom: 'venom'
};

const tokenIconUrl = computed(() => {
  if (hasIconError.value) return null;
  if (token.value?.iconUrl) return token.value.iconUrl;
  if (remoteIconUrl.value) return remoteIconUrl.value;
  return null;
});

function handleIconError() {
  hasIconError.value = true;
}

/**
 * Dynamically fetches remote token icon for any arbitrary ERC20/SPL/Jetton token
 * using project core tokens and CoinGecko worker proxy.
 */
async function fetchRemoteTokenIcon(chain: string, symbol: string, contractAddress?: string) {
  remoteIconUrl.value = null;
  if (!contractAddress && !symbol) return;

  const cacheKey = `${chain}:${contractAddress || symbol}`.toLowerCase();
  if (remoteIconCache.has(cacheKey)) {
    remoteIconUrl.value = remoteIconCache.get(cacheKey) || null;
    return;
  }

  // 1. Check if blockchain manager has configured token with icon
  try {
    const mgr = getManager(chain);
    if (mgr && typeof (mgr as any).getTokens === 'function') {
      const tokens = await (mgr as any).getTokens();
      const found = tokens.find(
        (t: any) =>
          (contractAddress && (t.id?.toLowerCase() === contractAddress.toLowerCase() || t.address?.toLowerCase() === contractAddress.toLowerCase())) ||
          (symbol && t.symbol?.toUpperCase() === symbol.toUpperCase())
      );
      if (found && typeof found.getIconUrl === 'function') {
        const url = await found.getIconUrl();
        if (url) {
          remoteIconCache.set(cacheKey, url);
          remoteIconUrl.value = url;
          return;
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Query CoinGecko worker proxy by contract address
  const platform = COINGECKO_PLATFORMS[chain];
  if (platform && contractAddress && contractAddress !== '_') {
    try {
      const resp = await fetch(`https://coingecko.worker.united.network/api/v3/coins/${platform}/contract/${encodeURIComponent(contractAddress)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.id) {
          const icon = getCoinGeckoIconUrl(data.id);
          remoteIconCache.set(cacheKey, icon);
          remoteIconUrl.value = icon;
          return;
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Query CoinGecko worker proxy by symbol search
  if (symbol && symbol !== 'NATIVE') {
    try {
      const resp = await fetch(`https://coingecko.worker.united.network/api/v3/search?query=${encodeURIComponent(symbol)}`);
      if (resp.ok) {
        const data = await resp.json();
        const coin = data?.coins?.find((c: any) => c.symbol?.toUpperCase() === symbol.toUpperCase());
        if (coin?.id) {
          const icon = getCoinGeckoIconUrl(coin.id);
          remoteIconCache.set(cacheKey, icon);
          remoteIconUrl.value = icon;
          return;
        }
      }
    } catch {
      // ignore
    }
  }

  remoteIconCache.set(cacheKey, '');
}

function startCountdown(duration: number) {
  clearTimers();
  remainingMs = duration;
  startTime = Date.now();
  progressPercent.value = 100;

  function update() {
    const elapsed = Date.now() - startTime;
    const left = Math.max(0, remainingMs - elapsed);
    progressPercent.value = (left / DURATION_MS) * 100;

    if (left > 0) {
      animFrameId = requestAnimationFrame(update);
    } else {
      close();
    }
  }

  animFrameId = requestAnimationFrame(update);
}

function pauseTimer() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  const elapsed = Date.now() - startTime;
  remainingMs = Math.max(0, remainingMs - elapsed);
}

function resumeTimer() {
  if (remainingMs > 0 && isVisible.value) {
    startCountdown(remainingMs);
  }
}

function clearTimers() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

on('unknownTokenReceived', (data: DetectedTokenInfo & { diffAmount?: string }) => {
  alertType.value = 'unknown';
  hasIconError.value = false;
  token.value = {
    chain: data.chain,
    symbol: data.symbol,
    name: data.name,
    balance: data.diffAmount || data.balance,
    totalBalance: data.balance,
    contractAddress: data.contractAddress,
    decimals: data.decimals,
    iconUrl: data.iconUrl
  };
  isVisible.value = true;

  fetchRemoteTokenIcon(data.chain, data.symbol, data.contractAddress);
  startCountdown(DURATION_MS);
});

on('transactionReceived', (data: TransactionNotificationPayload) => {
  alertType.value = 'transaction';
  hasIconError.value = false;
  token.value = {
    chain: data.chain,
    symbol: data.symbol,
    balance: data.diffAmount,
    totalBalance: data.totalBalance,
    contractAddress: data.contractAddress,
    iconUrl: data.iconUrl
  };
  isVisible.value = true;

  fetchRemoteTokenIcon(data.chain, data.symbol, data.contractAddress);
  startCountdown(DURATION_MS);
});

function close() {
  clearTimers();
  isVisible.value = false;
  token.value = null;
  remoteIconUrl.value = null;
}

function handleClick() {
  close();
}

function shortenAddress(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

onUnmounted(() => {
  clearTimers();
});
</script>

<style scoped lang="scss">
.toast-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999999;
  pointer-events: none;
  display: flex;
  justify-content: center;
  padding: 12px;
}

.toast-card {
  pointer-events: auto;
  background: linear-gradient(135deg, $color-black-17 0%, $color-black-24 100%);
  border: 1px solid rgba($color-white, 0.14);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba($color-black-10, 0.8), 0 0 20px rgba($color-orange, 0.1);
  overflow: hidden;
  max-width: 480px;
  width: 100%;
  color: $color-white;
  cursor: pointer;
  user-select: none;
  @include transition(transform 0.2s ease, box-shadow 0.2s ease);

  &:hover {
    transform: translateY(1px);
    box-shadow: 0 18px 45px rgba($color-black-10, 0.9);
  }
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 16px;
}

.toast-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  .chain-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .chain-name {
    font-size: 13px;
    font-weight: 600;
    color: $color-white;
    letter-spacing: 0.2px;
  }
}

.toast-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  text-align: right;
  margin-right: 6px;
}

.toast-amount {
  font-size: 15px;
  font-weight: 800;
  color: $color-white;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-token-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 3px;
  font-size: 12px;
  color: $color-gray;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.token-mini-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba($color-white, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .icon, img, svg {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.token-avatar-mini {
  font-size: 8px;
  font-weight: 700;
  color: $color-orange;
  text-transform: uppercase;
}

.symbol-name {
  font-weight: 600;
  color: $color-white;
}

.token-fullname {
  color: $color-gray;
  font-size: 12px;
}

.contract-text {
  font-family: monospace;
  font-size: 11px;
  color: rgba($color-white, 0.5);
}

.toast-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toast-close {
  width: 28px;
  height: 28px;
  color: $color-gray;
  appearance: none;
  border: 1px solid rgba($color-white, 0.12);
  border-radius: 50%;
  background-color: rgba($color-white, 0.05);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  @include transition(color 0.2s ease, background 0.2s ease);

  &:hover {
    color: $color-white;
    background: rgba($color-white, 0.15);
  }
}

/* Bottom Progress Bar */
.progress-bar-container {
  height: 3px;
  width: 100%;
  background: rgba($color-white, 0.1);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, $color-orange 0%, $color-white 100%);
  @include transition(width 0.1s linear);
}

/* Animations */
.slide-top-enter-active,
.slide-top-leave-active {
  @include transition(all 0.35s cubic-bezier(0.16, 1, 0.3, 1));
}

.slide-top-enter-from {
  opacity: 0;
  @include transforma(translateY(-30px) scale(0.96));
}

.slide-top-leave-to {
  opacity: 0;
  @include transforma(translateY(-20px) scale(0.96));
}
</style>

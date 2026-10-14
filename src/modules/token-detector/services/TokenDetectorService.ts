import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
// @ts-ignore
import { Store } from 'vuex';
import { wsManager } from './WebSocketManager';
import { pushService } from './PushNotificationService';
import { RPC_NAMES } from '@/api/constants-types';
import { getCachedWalletAddress, getManager, getStorePrefix } from '@/api/ApiHandler';
import { fromBlockchainUnits } from '@/api/utils';
import { roundNumber } from '@/api/sub-utils';
import { getCoinGeckoIconUrl } from '@/api/token-icons';
import { useEventsBus } from '@/plugins/eventBus';
import { soundNotifier } from './SoundNotifierService';
import { readEncryptedDB, writeEncryptedDB } from '@/api/indexeddb-storage';
import { STORAGE_KEYS } from '@/api/storage-keys';

function formatExactAmount(val: string | number, decimals: number = 6): string {
  return roundNumber(val, decimals, BigNumber.ROUND_DOWN).toString();
}

function calculateDiff(newVal: string | number, prevVal: string | number, decimals: number = 6): string {
  const newBN = new BigNumber(newVal || 0);
  const prevBN = new BigNumber(prevVal || 0);
  const diff = newBN.minus(prevBN);
  if (diff.isLessThanOrEqualTo(0)) return '0';
  return roundNumber(diff.toString(), decimals, BigNumber.ROUND_DOWN).toString();
}

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)'
];

const EVM_SCANNER_URLS: Record<string, string> = {
  [RPC_NAMES.BASE]: 'https://etherscan.worker.test.united.network/?chainid=8453',
  [RPC_NAMES.ETH]: 'https://etherscan.worker.united.network',
  [RPC_NAMES.POLYGON]: 'https://etherscan.worker.test.united.network/?chainid=137',
  [RPC_NAMES.BSC]: 'https://etherscan.worker.test.united.network/?chainid=56',
  [RPC_NAMES.ARBITRUM]: 'https://etherscan.worker.test.united.network/?chainid=42161',
  [RPC_NAMES.AVALANCHE]: 'https://etherscan.worker.test.united.network/?chainid=43114'
};

function buildScannerUrl(chain: string, params: Record<string, string>): string | null {
  const baseUrl = EVM_SCANNER_URLS[chain];
  if (!baseUrl) return null;
  const sep = baseUrl.includes('?') ? '&' : '?';
  const query = new URLSearchParams(params).toString();
  return `${baseUrl}${sep}${query}`;
}

export interface DetectedTokenInfo {
  chain: string;
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  rawBalance: string;
  isUnknown: boolean;
  iconUrl?: string;
}

export interface TransactionNotificationPayload {
  chain: string;
  symbol: string;
  diffAmount: string;
  totalBalance: number;
  title: string;
  body: string;
  isUnknown?: boolean;
  iconUrl?: string;
  contractAddress?: string;
  txId?: string;
  tokenId?: string;
}

/**
 * Anti-Spam Rate Limiter for RPC queries.
 * Prevents looped balance queries, debounces burst WebSocket events,
 * and enforces deduplication of transaction signatures.
 */
export class RpcRateLimiter {
  private inFlightMap = new Map<string, boolean>();
  private lastExecutedMap = new Map<string, number>();
  private debounceTimers = new Map<string, any>();
  private seenPayloadHashes = new Map<string, number>();

  private readonly DEBOUNCE_MS = 1500;
  private readonly MIN_COOLDOWN_MS = 5000;
  private readonly PAYLOAD_TTL_MS = 5000;

  public isDuplicatePayload(chain: string, payload: any): boolean {
    try {
      const signature = payload?.params?.result?.value?.signature ||
        payload?.params?.result?.signature ||
        payload?.params?.result?.transactionHash ||
        payload?.params?.result?.transaction?.signatures?.[0];

      if (!signature) return false;

      const key = `${chain}:${signature}`;
      const now = Date.now();
      const lastSeen = this.seenPayloadHashes.get(key);

      if (lastSeen && now - lastSeen < this.PAYLOAD_TTL_MS) {
        return true;
      }

      this.seenPayloadHashes.set(key, now);
      if (this.seenPayloadHashes.size > 200) {
        this.seenPayloadHashes.forEach((ts, k) => {
          if (now - ts > this.PAYLOAD_TTL_MS) this.seenPayloadHashes.delete(k);
        });
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  public scheduleRefresh(chain: string, refreshFn: () => Promise<void>) {
    if (this.inFlightMap.get(chain)) return;

    if (this.debounceTimers.has(chain)) {
      clearTimeout(this.debounceTimers.get(chain));
    }

    const now = Date.now();
    const lastExecuted = this.lastExecutedMap.get(chain) || 0;
    const timeSinceLast = now - lastExecuted;

    let delay = this.DEBOUNCE_MS;
    if (timeSinceLast < this.MIN_COOLDOWN_MS) {
      delay = Math.max(this.DEBOUNCE_MS, this.MIN_COOLDOWN_MS - timeSinceLast);
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(chain);
      if (this.inFlightMap.get(chain)) return;

      this.inFlightMap.set(chain, true);
      this.lastExecutedMap.set(chain, Date.now());

      try {
        await refreshFn();
      } catch (err) {
        // ignore
      } finally {
        this.inFlightMap.set(chain, false);
      }
    }, delay);

    this.debounceTimers.set(chain, timer);
  }

  public reset() {
    this.debounceTimers.forEach(t => clearTimeout(t));
    this.debounceTimers.clear();
    this.inFlightMap.clear();
    this.lastExecutedMap.clear();
    this.seenPayloadHashes.clear();
  }
}

export const rpcRateLimiter = new RpcRateLimiter();

export class TokenDetectorService {
  private store: Store<any> | null = null;
  private unsubscribeWs: (() => void) | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private cantonPendingInterval: any = null;
  private httpPollInterval: any = null;
  private isListening = false;
  private serviceEnabled = true;
  private seenPendingTransferIds: Set<string> = new Set();
  private unonboardedCantonChains: Set<string> = new Set();
  private tokenBalanceCache: Map<string, number> = new Map();
  private recentSyntheticDeltas: Map<string, number> = new Map();

  public async init(store: Store<any>) {
    this.store = store;
    await this.loadSettings();
    this.loadSeenPendingTransferIds();
    if (this.serviceEnabled) {
      this.startListening();
    }
  }

  private async loadSettings() {
    try {
      const saved = await readEncryptedDB(STORAGE_KEYS.TOKEN_DETECTOR_ENABLED, null);
      if (saved !== null && saved !== undefined) {
        this.serviceEnabled = Boolean(saved);
      } else if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem('token_detector_enabled');
        if (local !== null) {
          this.serviceEnabled = local === 'true';
        }
      }
    } catch (e) {
      // ignore
    }
  }

  public async toggleService(enabled: boolean) {
    this.serviceEnabled = enabled;
    try {
      await writeEncryptedDB(STORAGE_KEYS.TOKEN_DETECTOR_ENABLED, enabled);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('token_detector_enabled', String(enabled));
      }
    } catch (e) {
      // ignore
    }

    if (enabled) {
      this.startListening();
    } else {
      this.stopListening();
    }
  }

  public async setServiceEnabled(enabled: boolean) {
    return this.toggleService(enabled);
  }

  public isServiceEnabled(): boolean {
    return this.serviceEnabled;
  }

  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;

    if (this.unsubscribeWs) {
      this.unsubscribeWs();
      this.unsubscribeWs = null;
    }

    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    if (this.cantonPendingInterval) {
      clearInterval(this.cantonPendingInterval);
      this.cantonPendingInterval = null;
    }

    if (this.httpPollInterval) {
      clearInterval(this.httpPollInterval);
      this.httpPollInterval = null;
    }

    wsManager.disconnectAll();
    rpcRateLimiter.reset();
  }

  private loadSeenPendingTransferIds() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('canton_seen_tx_ids');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.seenPendingTransferIds = new Set(parsed);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private saveSeenPendingTransferIds() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('canton_seen_tx_ids', JSON.stringify(Array.from(this.seenPendingTransferIds)));
      }
    } catch (e) {
      // ignore
    }
  }

  public startListening() {
    if (this.isListening) return;
    this.isListening = true;

    this.unsubscribeWs = wsManager.onMessage((chain, payload) => {
      this.handleWsMessage(chain, payload);
    });

    // Subscribe to store updates for publicKeyCard
    if (this.store) {
      this.store.watch(
        (state: any) => state.user?.publicKeyCard,
        (publicKeyCard: any) => {
          this.unonboardedCantonChains.clear();
          if (publicKeyCard && this.serviceEnabled) {
            this.subscribeUserChains();
            this.pollHttpChains();
          } else {
            rpcRateLimiter.reset();
            wsManager.disconnectAll();
          }
        },
        { immediate: true }
      );

      this.store.watch(
        (state: any) => state.settings?.rpcProvider?.name,
        (rpcName: string) => {
          if (rpcName) {
            this.unonboardedCantonChains.delete(rpcName);
          }
        }
      );

      if (!this.unsubscribeStore) {
        this.unsubscribeStore = this.store.subscribe((mutation: any) => {
          if (!this.serviceEnabled) return;
          if (mutation.type === 'user/SET_TOKEN_BALANCE_ITEM') {
            const { provider, key, value } = mutation.payload || {};
            if (!provider || !value || typeof value.balance === 'undefined' || value.balance === null) return;
            this.onStoreBalanceItemUpdated(provider, key, value);
          }
        });
      }
    }

    // Periodic background check for Canton pending transfers and fallback polling
    if (!this.cantonPendingInterval) {
      this.cantonPendingInterval = setInterval(() => {
        if (this.serviceEnabled && this.store?.state.user?.publicKeyCard) {
          this.checkCantonPendingTransfers();
          
          // Only poll chains that strictly require HTTP polling, or as fallback
          const pollChains = [
            RPC_NAMES.TRON, 
            RPC_NAMES.VENOM, 
            RPC_NAMES.CANTON_TEST, 
            RPC_NAMES.CANTON_DEV,
            RPC_NAMES.TON // TON WS is fallback-reliant
          ];
          
          for (const chain of pollChains) {
             this.processNativeCoin(chain);
          }
        }
      }, 30000); // Polling every 30 seconds to drastically reduce HTTP RPC spam
    }
  }

  private async primeAllChainsBaseline() {
    if (!this.serviceEnabled || !this.store?.state.user?.publicKeyCard) return;
    for (const chain of Object.values(RPC_NAMES)) {
      const nativeKey = `${chain}:native`;
      if (!this.tokenBalanceCache.has(nativeKey)) {
        try {
          const address = await this.getAddressForChain(chain);
          if (address) {
            const mgr = getManager(chain);
            if (mgr?.nativeCoin) {
              const rawBal = await mgr.nativeCoin.getAvailableBalance(address);
              const numBal = Number(rawBal) || 0;
              this.tokenBalanceCache.set(nativeKey, numBal);
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  private async pollHttpChains() {
    if (!this.serviceEnabled || !this.store?.state.user?.publicKeyCard) return;

    try {
      await this.checkCantonPendingTransfers();
      await this.primeAllChainsBaseline();
      for (const cantonChain of [RPC_NAMES.CANTON_TEST, RPC_NAMES.CANTON_DEV, RPC_NAMES.VENOM]) {
        await this.processNativeCoin(cantonChain);
      }
    } catch {
      // ignore
    }
  }

  private onStoreBalanceItemUpdated(chain: string, key: string, tokenData: any) {
    try {
      const numBal = Number(tokenData.balance);
      if (isNaN(numBal) || numBal < 0) return;

      const isNative = tokenData.isNative || key === '_' || tokenData.id === '_';
      const cacheKey = isNative ? `${chain}:native` : `${chain}:${String(key || tokenData.root || tokenData.address || tokenData.id || '').toLowerCase()}`;

      const hasCache = this.tokenBalanceCache.has(cacheKey);
      const prevBal = hasCache ? this.tokenBalanceCache.get(cacheKey)! : numBal;

      this.tokenBalanceCache.set(cacheKey, numBal);

      if (hasCache && numBal > prevBal && prevBal >= 0) {
        const diffStr = calculateDiff(tokenData.balance, prevBal);
        if (new BigNumber(diffStr).isGreaterThan(0.0000001)) {
          const symbol = tokenData.symbol || (isNative ? 'NATIVE' : 'TOKEN');
          console.log(`[TokenDetectorService] 💸 Store Balance Delta Detected [${chain}]:`, {
            chain,
            symbol,
            prevBal,
            newBal: numBal,
            diff: diffStr
          });
          this.notifyTransaction(
            chain,
            symbol,
            diffStr,
            numBal,
            Boolean(tokenData.isUnknown),
            tokenData.iconUrl,
            undefined,
            key === '_' ? undefined : key
          );
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private async checkCantonPendingTransfers() {
    try {
      const keys = this.store?.state.user?.publicKeyCard;
      if (!keys) return;

      for (const cantonChain of [RPC_NAMES.CANTON_TEST, RPC_NAMES.CANTON_DEV]) {
        if (this.unonboardedCantonChains.has(cantonChain)) {
          if (this.store?.state.settings?.rpcProvider?.name !== cantonChain) {
            continue;
          }
        }
        try {
          const mgr = getManager(cantonChain);
          if (mgr && typeof (mgr as any).getPendingTransfers === 'function') {
            if (typeof (mgr as any).setPrimaryCard === 'function') {
              (mgr as any).setPrimaryCard(keys);
            }
            const pending = await (mgr as any).getPendingTransfers(keys);
            this.unonboardedCantonChains.delete(cantonChain);
            if (pending && pending.length > 0) {
              const allTokens = typeof (mgr as any).getTokens === 'function' ? await (mgr as any).getTokens() : [];
              for (const item of pending) {
                const contractId = item.contractId || item.id || item.transferId;
                if (contractId && !this.isTxSeen(contractId)) {
                  const amount = item.amount ? String(item.amount) : '0';
                  const tokenId = item.tokenId || '_';
                  let symbol = 'CC';

                  if (tokenId !== '_') {
                    const foundToken = allTokens.find((t: any) => t.id === tokenId);
                    if (foundToken) {
                      symbol = (typeof foundToken.getSymbol === 'function' ? await foundToken.getSymbol() : foundToken.symbol) || symbol;
                    }
                  }

                  console.log(`[TokenDetectorService] 💸 Canton Pending Transfer Detected [${cantonChain}]:`, item);
                  this.notifyTransaction(
                    cantonChain,
                    symbol,
                    amount,
                    0,
                    false,
                    undefined,
                    contractId,
                    tokenId
                  );
                }
              }
            }
          }
        } catch (chainErr: any) {
          const errMsg = String(chainErr?.message || chainErr || '');
          if (errMsg.includes('not onboarded') || errMsg.includes('Forbidden') || errMsg.includes('403')) {
            this.unonboardedCantonChains.add(cantonChain);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private async getAddressForChain(chain: string): Promise<string | null> {
    try {
      return await getCachedWalletAddress(chain);
    } catch (e) {
      return null;
    }
  }

  private primeBalanceCacheFromStore() {
    try {
      if (!this.store?.state.user?.tokenBalance) return;
      const allBalances = this.store.state.user.tokenBalance;
      for (const [chain, tokens] of Object.entries(allBalances)) {
        if (Array.isArray(tokens)) {
          for (const token of tokens) {
            if (!token) continue;
            const balNum = Number(token.balance);
            if (isNaN(balNum)) continue;
            if (token.isNative || token.id === '_' || token.symbol?.toUpperCase() === 'SOL' || token.symbol?.toUpperCase() === 'TON' || token.symbol?.toUpperCase() === 'CC') {
              const nativeKey = `${chain}:native`;
              if (!this.tokenBalanceCache.has(nativeKey)) {
                this.tokenBalanceCache.set(nativeKey, balNum);
              }
            }
            const rootKey = token.root || token.address || token.id || token.mint;
            if (rootKey && rootKey !== '_') {
              const tokenKey = `${chain}:${String(rootKey).toLowerCase()}`;
              if (!this.tokenBalanceCache.has(tokenKey)) {
                this.tokenBalanceCache.set(tokenKey, balNum);
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private async subscribeUserChains() {
    if (!this.store?.state.user?.publicKeyCard) return;
    this.primeBalanceCacheFromStore();
    this.primeAllChainsBaseline();

    for (const chain of Object.values(RPC_NAMES)) {
      try {
        const address = await this.getAddressForChain(chain);
        if (address) {
          wsManager.connect(chain, address);
        }
      } catch (err) {
        // ignore
      }
    }
  }

  private async handleWsMessage(chain: string, payload: any) {
    if (!this.serviceEnabled) return;
    const isNewHeads = payload?.method === 'eth_subscription' && payload?.params?.result?.number && payload?.params?.result?.hash;
    if (!isNewHeads) {
      console.log(`[TokenDetectorService] 📡 [${chain}] Received WS/JRPC payload:`, payload);
    }
    if (!payload || payload.error) return;

    // Filter subscription confirmations, pings, status responses, and XRP keep-alives
    if (
      typeof payload.result === 'string' ||
      typeof payload.result === 'number' ||
      (payload.status === 'success' && payload.type === 'response') ||
      payload.result?.pong ||
      payload.result?.ip ||
      payload.result?.username ||
      payload.method === 'ping'
    ) {
      return;
    }

    // Deduplicate duplicate payload signatures
    if (rpcRateLimiter.isDuplicatePayload(chain, payload)) {
      return;
    }

    // EVM Transfer Log Event (ERC-20 tokens) or newHeads block (Native BNB / ETH / MATIC / AVAX)
    if (payload.method === 'eth_subscription' && payload.params?.result) {
      const result = payload.params.result;
      
      // newHeads block handling (Native balances)
      if (result.number && result.hash && result.parentHash) {
        // Debounce native balance check for this chain to max once per 10-12s
        rpcRateLimiter.scheduleRefresh(chain, async () => {
          await this.processNativeCoin(chain);
        });
        return;
      }

      console.log(`[TokenDetectorService] 💸 Transaction Payload Received [${chain}]:`, payload);
      // ERC-20 transfer event handling
      if (typeof result === 'object' && result.address) {
        const contractAddress = result.address.toLowerCase();
        const rawDataHex = typeof result.data === 'string' ? result.data : undefined;
        const txHash = result.transactionHash;
        const blockTsHex = result.blockTimestamp;
        let isoTs: string | undefined = undefined;
        if (blockTsHex) {
          const tsNum = parseInt(blockTsHex, 16);
          if (!isNaN(tsNum)) isoTs = new Date(tsNum * 1000).toISOString();
        }
        const address = await this.getAddressForChain(chain);
        if (address) {
          const topics = result.topics || [];
          const cleanAddr = address.toLowerCase().replace(/^0x/, '');
          const isTargetedToUser = topics.some((t: string) => typeof t === 'string' && t.toLowerCase().includes(cleanAddr));

          if (isTargetedToUser || topics.length <= 1) {
            // Process immediately without debounce for targeted tokens
            this.processEvmToken(chain, contractAddress, address, rawDataHex, txHash, isoTs);
          }
        }
      }
    }
    // Solana Account Notification Event
    else if (payload.method === 'accountNotification') {
      console.log(`[TokenDetectorService] 💸 Transaction Payload Received [${chain}]:`, payload);
      const result = payload.params?.result;
      const parsedInfo = result?.value?.data?.parsed?.info;
      if (parsedInfo && parsedInfo.mint) {
        const mint = parsedInfo.mint;
        const slot = result.context?.slot;
        const txId = slot ? `solana-slot-${slot}` : undefined;
        const uiAmountString = parsedInfo.tokenAmount?.uiAmountString || String(parsedInfo.tokenAmount?.uiAmount || '0');
        rpcRateLimiter.scheduleRefresh(chain, async () => {
          await this.processSolanaToken(chain, mint, uiAmountString, txId);
        });
      } else if (result?.value && typeof result.value.lamports === 'number') {
        // Native SOL account update
        rpcRateLimiter.scheduleRefresh(chain, () => this.processNativeCoin(chain));
      }
    }
    // XRP Transaction Payment Event
    else if (chain === RPC_NAMES.XRP || payload.engine_result === 'tesSUCCESS') {
      console.log(`[TokenDetectorService] 💸 Transaction Payload Received [${chain}]:`, payload);
      const tx = payload.tx_json || payload.transaction || payload;
      const dest = tx?.Destination || tx?.destination;
      const txType = tx?.TransactionType || tx?.transaction_type;

      if (txType === 'Payment' && dest) {
        const userAddr = await this.getAddressForChain(RPC_NAMES.XRP);
        if (userAddr && dest.toLowerCase() === userAddr.toLowerCase()) {
          const txHash = tx.hash || payload.hash || payload.ctid;
          if (txHash && !this.seenPendingTransferIds.has(txHash) && !this.seenPendingTransferIds.has(txHash.toLowerCase())) {
            const rawAmount = payload.meta?.delivered_amount || tx.Amount || tx.amount;
            let rawNum = 0;
            let symbol = 'XRP';

            if (typeof rawAmount === 'string' && /^\d+$/.test(rawAmount)) {
              rawNum = Number(rawAmount) / 1e6;
            } else if (typeof rawAmount === 'object' && rawAmount.value) {
              rawNum = Number(rawAmount.value);
              symbol = rawAmount.currency || 'XRP';
            }

            if (rawNum > 0) {
              const formattedDiff = formatExactAmount(rawNum);
              const date = tx.date || payload.date;
              const isoTs = date ? new Date((date + 946684800) * 1000).toISOString() : undefined;
              this.notifyTransaction(RPC_NAMES.XRP, symbol, formattedDiff, 0, false, undefined, txHash, '_', isoTs);
            }
          }
        }
      }
      rpcRateLimiter.scheduleRefresh(chain, () => this.processNativeCoin(chain));
    }
    // TON Transaction / Account update
    else if (chain === RPC_NAMES.TON || payload.account_id || payload.tx_hash || payload.actions || payload.operation === 'account_update') {
      console.log(`[TokenDetectorService] 💸 TON Transaction Event Received:`, payload);
      rpcRateLimiter.scheduleRefresh(RPC_NAMES.TON, () => this.processNativeCoin(RPC_NAMES.TON));
    }
    // Activity notifications (Solana / BTC / TRON / Others)
    else if (
      payload.method === 'logsNotification' ||
      payload.method === 'accountNotification' ||
      payload.method === 'programNotification' ||
      payload.method === 'subscribe-account' ||
      payload.event === 'account-update' ||
      payload.type === 'transaction' ||
      payload['track-address'] ||
      payload.params?.subscription !== undefined
    ) {
      console.log(`[TokenDetectorService] 💸 Transaction Payload Received [${chain}]:`, payload);
      rpcRateLimiter.scheduleRefresh(chain, () => this.processNativeCoin(chain));
    }
  }

  /**
   * Process targeted native coin balance update ONLY for the specified chain
   */
  public async processNativeCoin(chain: string) {
    if (!this.serviceEnabled) return;
    try {
      const mgr = getManager(chain);
      if (!mgr) return;

      // Handle Canton pending transfers
      if ((chain === RPC_NAMES.CANTON_TEST || chain === RPC_NAMES.CANTON_DEV) && typeof (mgr as any).setPrimaryCard === 'function' && this.store?.state.user?.publicKeyCard) {
        const keys = this.store.state.user.publicKeyCard;
        (mgr as any).setPrimaryCard(keys);
        try {
          const pending = await (mgr as any).getPendingTransfers(keys);
          if (pending && pending.length > 0) {
            const allTokens = typeof (mgr as any).getTokens === 'function' ? await (mgr as any).getTokens() : [];
            for (const item of pending) {
              const contractId = item.contractId || item.id || item.transferId;
              if (contractId && !this.isTxSeen(contractId)) {
                console.log(`[TokenDetectorService] 💸 Transaction Raw Payload [Canton]:`, item);
                const pendingAmount = item.amount ? formatExactAmount(item.amount) : 'Pending';
                const tokenId = item.tokenId || '_';
                let symbol = 'CC';

                if (tokenId !== '_') {
                  const foundToken = allTokens.find((t: any) => t.id === tokenId);
                  if (foundToken) {
                    symbol = (typeof foundToken.getSymbol === 'function' ? await foundToken.getSymbol() : foundToken.symbol) || symbol;
                  }
                }

                this.notifyTransaction(chain, symbol, pendingAmount, 0, false, undefined, contractId, tokenId);
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }

      const address = await this.getAddressForChain(chain);
      if (!address) return;

      const nativeSymbol = (await mgr.nativeCoin.getSymbol()) || 'NATIVE';
      const rawBal = await mgr.nativeCoin.getAvailableBalance(address);
      const numBal = Number(rawBal) || 0;

      const currentBalances = this.store?.state.user?.tokenBalance?.[chain] || [];
      const existingToken = currentBalances.find((t: any) =>
        t?.isNative || t?.symbol?.toUpperCase() === nativeSymbol.toUpperCase() || t?.id === '_'
      );

      const cacheKey = `${chain}:native`;
      const hasCache = this.tokenBalanceCache.has(cacheKey);

      let previousBalance = -1;
      if (hasCache) {
        previousBalance = this.tokenBalanceCache.get(cacheKey)!;
      } else if (existingToken && typeof existingToken.balance !== 'undefined' && existingToken.balance !== null) {
        previousBalance = Number(existingToken.balance);
      }
      this.tokenBalanceCache.set(cacheKey, numBal);

      if (existingToken) {
        // Targeted Vuex mutation ONLY for this native token
        if (Number(existingToken.balance) !== numBal) {
          this.store?.commit('user/SET_TOKEN_BALANCE_ITEM', {
            provider: chain,
            key: existingToken.root || existingToken.address || '_',
            value: {
              ...existingToken,
              balance: numBal
            },
            action: 'update'
          });
        }
      } else {
        this.store?.commit('user/SET_TOKEN_BALANCE_ITEM', {
          provider: chain,
          key: '_',
          value: {
            root: '_',
            symbol: nativeSymbol,
            balance: numBal,
            isNative: true,
            price: null
          },
          action: 'add'
        });
      }

      if (previousBalance >= 0 && numBal > previousBalance) {
        const diffStr = calculateDiff(numBal, previousBalance);
        if (new BigNumber(diffStr).isGreaterThan(0.0000001)) {
          console.log(`[TokenDetectorService] 💸 Transaction Raw Payload [${chain}]:`, {
            chain,
            symbol: nativeSymbol,
            previousBalance,
            newBalance: numBal,
            diff: diffStr
          });
          this.notifyTransaction(chain, nativeSymbol, diffStr, numBal, false, undefined, undefined, '_');
        }
      }

      // Check all TIP-3 tokens on Venom in background
      if (chain === RPC_NAMES.VENOM && typeof (mgr as any).getTokens === 'function') {
        const tokens = (mgr as any).getTokens();
        for (const token of tokens) {
          if (!token || token.id === '_' || token.isNative) continue;
          try {
            const tokenAddr = token.root?.toString?.() || (token as any).address?.toString?.() || token.id;
            if (!tokenAddr) continue;
            const rawTokenBal = await token.getAvailableBalance(address);
            const tokenNumBal = Number(rawTokenBal) || 0;
            const tokenSymbol = (await token.getSymbol()) || 'TIP3';
            const tokenCacheKey = `${chain}:${String(tokenAddr).toLowerCase()}`;
            const tokenHasCache = this.tokenBalanceCache.has(tokenCacheKey);
            let tokenPrevBal = -1;
            if (tokenHasCache) {
              tokenPrevBal = this.tokenBalanceCache.get(tokenCacheKey)!;
            } else {
              const currentStoreBalances = this.store?.state.user?.tokenBalance?.[chain] || [];
              const tStore = currentStoreBalances.find((t: any) => 
                (t?.root && String(t.root).toLowerCase() === String(tokenAddr).toLowerCase()) ||
                (t?.address && String(t.address).toLowerCase() === String(tokenAddr).toLowerCase()) ||
                (t?.id && String(t.id).toLowerCase() === String(tokenAddr).toLowerCase())
              );
              if (tStore && typeof tStore.balance !== 'undefined' && tStore.balance !== null) {
                tokenPrevBal = Number(tStore.balance);
              }
            }
            this.tokenBalanceCache.set(tokenCacheKey, tokenNumBal);

            if (tokenPrevBal >= 0 && tokenNumBal > tokenPrevBal) {
              const diffStr = calculateDiff(tokenNumBal, tokenPrevBal);
              if (new BigNumber(diffStr).isGreaterThan(0.0000001)) {
                console.log(`[TokenDetectorService] 💸 Venom TIP-3 Token Detected:`, {
                  symbol: tokenSymbol,
                  prev: tokenPrevBal,
                  now: tokenNumBal,
                  diff: diffStr
                });
                this.notifyTransaction(chain, tokenSymbol, diffStr, tokenNumBal, false, undefined, undefined, tokenAddr);
              }
            }
          } catch {
            // ignore individual token error
          }
        }
      }
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (!msg.includes('websocket was closed') && !msg.includes('DisconnectedError')) {
        console.warn(`[TokenDetectorService] ⚠️ processNativeCoin error [${chain}]:`, err);
      }
    }
  }

  public isTxSeen(txId?: string | null): boolean {
    if (!txId) return false;
    const cleanTxId = txId.toLowerCase();
    if (this.seenPendingTransferIds.has(cleanTxId) || this.seenPendingTransferIds.has(txId)) {
      return true;
    }

    if (this.recentSyntheticDeltas.has(cleanTxId)) {
      const ts = this.recentSyntheticDeltas.get(cleanTxId) || 0;
      if (Date.now() - ts < 60000) {
        return true;
      }
      this.recentSyntheticDeltas.delete(cleanTxId);
    }

    // Only query Vuex state for real transaction hashes / contract IDs
    const isRealHash = cleanTxId.startsWith('0x') || cleanTxId.length > 16 || cleanTxId.includes('::') || cleanTxId.includes('-');
    if (isRealHash && this.store) {
      try {
        const prefix = getStorePrefix();
        if (prefix) {
          const stateNotifications = this.store.state[`${prefix}.customtoken`]?.txNotifications;
          if (Array.isArray(stateNotifications)) {
            const isDuplicate = stateNotifications.some((item: any) => {
              const itemId = typeof item === 'object' && item ? (item.id || item.txId || item.value?.id) : null;
              return itemId && String(itemId).toLowerCase() === cleanTxId;
            });
            if (isDuplicate) {
              this.seenPendingTransferIds.add(txId);
              this.seenPendingTransferIds.add(cleanTxId);
              return true;
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return false;
  }

  private notifyTransaction(
    chain: string,
    symbol: string,
    diffAmount: string,
    totalBalance: number,
    isUnknown: boolean,
    iconUrl?: string,
    txId?: string,
    tokenId?: string,
    timestamp?: string
  ) {
    if (!this.serviceEnabled) return;
    const formattedDiff = formatExactAmount(diffAmount);

    const isSynthetic = !txId;
    const effectiveTxId = txId || `${chain}:${tokenId || '_'}:${formattedDiff}:${totalBalance}`;

    if (isSynthetic) {
      if (this.isTxSeen(effectiveTxId)) {
        return;
      }
      this.recentSyntheticDeltas.set(effectiveTxId.toLowerCase(), Date.now());
    } else {
      if (this.isTxSeen(txId)) {
        console.log(`[TokenDetectorService] ⚠️ Transaction ${txId} already processed. Skipping notification.`);
        return;
      }
      this.seenPendingTransferIds.add(txId);
      this.seenPendingTransferIds.add(txId.toLowerCase());
      this.saveSeenPendingTransferIds();
    }

    const title = isUnknown ? `New Token Detected (${chain})!` : `Transaction received on ${chain}!`;
    const body = `+${formattedDiff} ${symbol}`;

    // 1. Play Sound Notification IMMEDIATELY
    soundNotifier.playTransactionChime(title, body);

    // 2. Foreground UI Toast / Modal trigger
    useEventsBus().emit('transactionReceived', {
      chain,
      symbol,
      diffAmount: formattedDiff,
      totalBalance,
      title,
      body,
      isUnknown,
      iconUrl,
      txId: effectiveTxId,
      tokenId: tokenId ?? ''
    });

    // 3. Web Push / OS notification trigger
    pushService.sendTokenAlert(title, body);

    // Save to Vuex store txNotifications history
    if (this.store) {
      try {
        const prefix = getStorePrefix();
        if (prefix) {
          const actionPath = `${prefix}.customtoken/addTxNotification`;
          this.store.dispatch(actionPath, {
            id: effectiveTxId,
            chain,
            symbol,
            tokenId: tokenId ?? '',
            diffAmount: formattedDiff,
            totalBalance,
            iconUrl: iconUrl || null,
            timestamp: timestamp || new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('[TokenDetectorService] Failed to dispatch addTxNotification to Vuex:', e);
      }
    }
  }

  /**
   * Inspect EVM token contract on-chain and update store/notify ONLY for this token
   */
  public async processEvmToken(
    chain: string,
    contractAddress: string,
    userAddress: string,
    rawDataHex?: string,
    txHash?: string,
    isoTimestamp?: string
  ) {
    try {
      const currentBalances = this.store?.state.user?.tokenBalance?.[chain] || [];
      const lowerContract = contractAddress.toLowerCase();
      const existingToken = currentBalances.find((t: any) =>
        (t?.root && String(t.root).toLowerCase() === lowerContract) ||
        (t?.address && String(t.address).toLowerCase() === lowerContract) ||
        (t?.id && String(t.id).toLowerCase() === lowerContract)
      );

      let decimals = 18;
      let symbol = 'UNKNOWN';
      let name = 'Unknown Token';
      
      const cacheKey = `${chain}:${lowerContract}`;
      const hasCache = this.tokenBalanceCache.has(cacheKey);
      let previousBalance = 0;

      if (hasCache) {
        previousBalance = this.tokenBalanceCache.get(cacheKey)!;
      } else if (existingToken && typeof existingToken.balance !== 'undefined' && existingToken.balance !== null) {
        previousBalance = Number(existingToken.balance) || 0;
      }

      if (existingToken) {
        decimals = Number(existingToken.decimals || 18);
        symbol = existingToken.symbol || 'UNKNOWN';
        name = existingToken.name || symbol || 'Unknown Token';
      }

      let diffStr = '0';
      let formattedBalance = previousBalance;
      let needsRpc = !existingToken || !existingToken.decimals || !existingToken.symbol || !hasCache;

      // Extract exact transfer amount from WS log data
      if (rawDataHex && rawDataHex !== '0x') {
        try {
          const rawUnits = BigInt(rawDataHex);
          diffStr = formatExactAmount(fromBlockchainUnits(rawUnits, decimals));
          formattedBalance = previousBalance + Number(diffStr);
        } catch (e) {
          needsRpc = true;
        }
      } else {
        needsRpc = true; // No data field, must query on-chain balance
      }

      if (needsRpc) {
        const rpcUrl = this.getRpcUrlForChain(chain);
        if (!rpcUrl) return;

        const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
        const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

        if (!existingToken || !existingToken.decimals) {
          decimals = await contract.decimals().catch(() => 18);
        }
        if (!existingToken || !existingToken.symbol) {
          symbol = await contract.symbol().catch(() => 'UNKNOWN');
          name = await contract.name().catch(() => symbol || 'Unknown Token');
        }

        const rawBalance = await contract.balanceOf(userAddress).catch(() => BigInt(0));
        formattedBalance = Number(ethers.formatUnits(rawBalance, decimals));

        if (rawDataHex && rawDataHex !== '0x') {
          try {
            const rawUnits = BigInt(rawDataHex);
            diffStr = formatExactAmount(fromBlockchainUnits(rawUnits, decimals));
          } catch (e) {
            diffStr = calculateDiff(formattedBalance, previousBalance);
          }
        } else {
          diffStr = calculateDiff(formattedBalance, previousBalance);
        }
      }

      this.tokenBalanceCache.set(cacheKey, formattedBalance);

      const tokenInfo: DetectedTokenInfo = {
        chain,
        contractAddress,
        name,
        symbol,
        decimals,
        balance: formattedBalance,
        rawBalance: ethers.parseUnits(formattedBalance.toFixed(decimals), decimals).toString(),
        isUnknown: !existingToken
      };

      if (existingToken) {
        // Targeted balance update for this specific EVM token only
        this.store?.commit('user/SET_TOKEN_BALANCE_ITEM', {
          provider: chain,
          key: existingToken.root || existingToken.address || contractAddress,
          value: {
            ...existingToken,
            balance: formattedBalance
          },
          action: 'update'
        });

        if (Number(diffStr) > 0.000001) {
          this.notifyTransaction(chain, symbol, diffStr, formattedBalance, false, undefined, txHash, contractAddress, isoTimestamp);
        }
      } else {
        if (Number(diffStr) > 0.000001) {
          this.notifyTransaction(chain, symbol, diffStr, formattedBalance, true, undefined, txHash, contractAddress, isoTimestamp);
        }
      }
    } catch (err) {
      // ignore
    }
  }

  /**
   * Process Solana SPL token update ONLY for the targeted mint
   */
  public async processSolanaToken(
    chain: string,
    mint: string,
    newBalanceStr: string,
    txId?: string,
    isoTimestamp?: string
  ) {
    try {
      const mgr = getManager(chain);
      if (!mgr) return;

      const tokens = mgr.getTokens ? mgr.getTokens() : [];
      const targetToken = tokens.find((t: any) => t.id === mint || (t as any).address === mint);
      let symbol = targetToken ? await targetToken.getSymbol() : '';
      let name: string | undefined;
      let iconUrl: string | undefined;

      if (!symbol || symbol === 'SPL Token') {
        const meta = await this.fetchSolanaMintSymbol(mint);
        symbol = meta.symbol || 'SPL Token';
        name = meta.name;
        iconUrl = meta.iconUrl;
      }

      const currentBalances = this.store?.state.user?.tokenBalance?.[chain] || [];
      const lowerMint = mint.toLowerCase();
      const existingToken = currentBalances.find((t: any) =>
        (t?.root && String(t.root).toLowerCase() === lowerMint) ||
        (t?.address && String(t.address).toLowerCase() === lowerMint) ||
        (t?.id && String(t.id).toLowerCase() === lowerMint) ||
        (t?.symbol && t?.symbol.toUpperCase() === symbol.toUpperCase())
      );

      const numBal = Number(newBalanceStr) || 0;
      const cacheKey = `${chain}:${mint.toLowerCase()}`;
      const hasCache = this.tokenBalanceCache.has(cacheKey);

      let previousBalance = -1;
      if (hasCache) {
        previousBalance = this.tokenBalanceCache.get(cacheKey)!;
      } else if (existingToken && typeof existingToken.balance !== 'undefined' && existingToken.balance !== null) {
        previousBalance = Number(existingToken.balance);
      } else if (!existingToken) {
        previousBalance = 0;
      }
      this.tokenBalanceCache.set(cacheKey, numBal);

      if (existingToken) {
        // Targeted balance update for this specific SPL token only
        this.store?.commit('user/SET_TOKEN_BALANCE_ITEM', {
          provider: chain,
          key: existingToken.root || existingToken.address || mint,
          value: {
            ...existingToken,
            name: name || existingToken.name,
            balance: numBal
          },
          action: 'update'
        });
      }

      if (previousBalance >= 0 && numBal > previousBalance) {
        const diffStr = calculateDiff(newBalanceStr, previousBalance);
        if (new BigNumber(diffStr).isGreaterThan(0.0000001)) {
          this.notifyTransaction(chain, symbol, diffStr, numBal, !existingToken, iconUrl, txId, mint, isoTimestamp);
        }
      }
    } catch (err) {
      // ignore
    }
  }

  private async fetchSolanaMintSymbol(mint: string): Promise<{ symbol: string; name?: string; iconUrl?: string }> {
    try {
      const resp = await fetch(`https://coingecko.worker.united.network/api/v3/coins/solana/contract/${encodeURIComponent(mint)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.id) {
          return {
            symbol: (data.symbol || 'SPL Token').toUpperCase(),
            name: data.name,
            iconUrl: getCoinGeckoIconUrl(data.id)
          };
        }
      }
    } catch {
      // ignore
    }
    return { symbol: 'SPL Token' };
  }

  private getRpcUrlForChain(chain: string): string | null {
    try {
      const mgr = getManager(chain);
      if (mgr && (mgr as any).rpcUrl) return (mgr as any).rpcUrl;
      if (mgr && (mgr as any).providerUrl) return (mgr as any).providerUrl;
    } catch (e) {
      // ignore
    }

    const rpcUrls: Record<string, string> = {
      [RPC_NAMES.ETH]: 'https://eth.drpc.org',
      [RPC_NAMES.BSC]: 'https://bsc-rpc.publicnode.com',
      [RPC_NAMES.POLYGON]: 'https://polygon.drpc.org',
      [RPC_NAMES.ARBITRUM]: 'https://arbitrum-rpc.publicnode.com',
      [RPC_NAMES.BASE]: 'https://base.drpc.org',
      [RPC_NAMES.AVALANCHE]: 'https://avalanche-rpc.publicnode.com',
      [RPC_NAMES.COTI]: 'https://coti.worker.united.network',
      [RPC_NAMES.KATANA]: 'https://katana.worker.united.network',
    };

    return rpcUrls[chain] || 'https://evm.worker.united.network';
  }

  public stop() {
    if (this.unsubscribeWs) {
      this.unsubscribeWs();
      this.unsubscribeWs = null;
    }
    rpcRateLimiter.reset();
    wsManager.disconnectAll();
    this.isListening = false;
  }
}

export const tokenDetectorService = new TokenDetectorService();

import type { ShallowRef } from 'vue';
import type { BlockchainManager, Storage as cotiStorage, CardKeys, Token } from '../api/common';
import { shallowRef, computed, ref } from 'vue';
import { RPC_NAMES, rpcList } from '../api/constants-types';
import type { TokenType, CustomTokenBase, RpcName, PublicKeyCardType } from '../api/constants-types';

export { rpcList, getSelectedToken, getCustomTokenBase, RPC_NAMES, SWAP_CHAINS } from '../api/constants-types';

import { store } from '../store/index';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { createManager } from '../api/factory';
import venomManifest from '../api/manifests/venom.json';
import tronManifest from '../api/manifests/tron.json';
import ethereumManifest from '../api/manifests/ethereum.json';
import binanceManifest from '../api/manifests/binance.json';
import tonManifest from '../api/manifests/ton.json';
import bitcoinManifest from '../api/manifests/bitcoin.json';
import solanaManifest from '../api/manifests/solana.json';
import arbitrumManifest from '../api/manifests/arbitrum.json';
import baseManifest from '../api/manifests/base.json';
import polygonManifest from '../api/manifests/polygon.json';
import avalancheManifest from '../api/manifests/avalanche.json';
import xrplManifest from '../api/manifests/xrpl.json';
import cotiManifest from '../api/manifests/coti.json';
import katanaManifest from '../api/manifests/katana.json';
import { isCardRegistered, isCardIsNew, isCardBroken } from '../api/check-guards';
import { registerCustomTokenStore } from '../store/modules/dynamicCustomToken.js';
import i18n from "../plugins/i18n";

export const getHost = (): string => {
  return window.location.hostname;
};

export const prefixStore = ref<string | null>(null);

export const getStorePrefixByKey = (key: PublicKeyCardType): string | null => {
  if (isCardRegistered() && !isCardIsNew()) {
    const storePrefixStart = key?.ed25519?.slice(6, 10);
    const storePrefixEnd = key?.secp256k1?.slice(6, 10);
    if (storePrefixStart && storePrefixEnd) {
      return storePrefixStart + storePrefixEnd;
    }
  }
  return null;
};

export const getStorePrefix = (): string | null => {
  const prefix = getStorePrefixByKey(store.state.user.publicKeyCard);
  if (prefix) {
    prefixStore.value = prefix;
    if (!store.hasModule(`${prefixStore.value}.customtoken`)) {
      registerCustomTokenStore(prefixStore.value);
    }
    return prefixStore.value;
  } else if (isCardBroken()) {
    clearData();
    throw new Error(i18n.global.t('errors.cardError'), { cause: { errorSubtitle: i18n.global.t('pages.authorization.errors.validError') } });
  }

  return null;
};

class CotiApproveKey implements cotiStorage {
  async set(_key: string, value: string) {
    if (store.hasModule(`${prefixStore.value}.customtoken`)) {
      store.dispatch(`${prefixStore.value}.customtoken/setCotiSecretKey`, value);
    }
  }

  async get(_key: string) {
    if (store.hasModule(`${prefixStore.value}.customtoken`)) {
      return store.state[`${prefixStore.value}.customtoken`]?.cotiSecretKey;
    }
  }
}

interface ChainConfig {
  manifest: unknown;
  ref: ShallowRef<BlockchainManager | undefined>;
  hasExtraTokens: boolean;
  storage?: cotiStorage;
}

const chainRegistry: Record<string, ChainConfig> = {
  [RPC_NAMES.VENOM]: { manifest: venomManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.ETH]: { manifest: ethereumManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.BSC]: { manifest: binanceManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.TRON]: { manifest: tronManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.TON]: { manifest: tonManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.BTC]: { manifest: bitcoinManifest, ref: shallowRef(undefined), hasExtraTokens: false },
  [RPC_NAMES.SOLANA]: { manifest: solanaManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.ARBITRUM]: { manifest: arbitrumManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.BASE]: { manifest: baseManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.POLYGON]: { manifest: polygonManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.AVALANCHE]: { manifest: avalancheManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.XRP]: { manifest: xrplManifest, ref: shallowRef(undefined), hasExtraTokens: true },
  [RPC_NAMES.COTI]: { manifest: cotiManifest, ref: shallowRef(undefined), hasExtraTokens: true, storage: new CotiApproveKey() },
  [RPC_NAMES.KATANA]: { manifest: katanaManifest, ref: shallowRef(undefined), hasExtraTokens: true },
};

interface ManagerWithMetadataToken {
  addTokenByMetadata(args: { address: string }): void | Promise<unknown>;
}

interface CotiManagerType {
  performOnBoarding(keys: unknown): Promise<string>;
  isOnBoarded(keys: unknown): Promise<boolean>;
}

function hasAddTokenByMetadata(mgr: unknown): mgr is ManagerWithMetadataToken {
  return typeof mgr === 'object' && mgr !== null && 'addTokenByMetadata' in mgr && typeof (mgr as { addTokenByMetadata: unknown }).addTokenByMetadata === 'function';
}

function isCotiManager(mgr: unknown): mgr is CotiManagerType {
  return typeof mgr === 'object' && mgr !== null && 'performOnBoarding' in mgr;
}

export const syncCustomTokensWithManagers = (customTokens?: CustomTokenBase) => {
  if (!customTokens || typeof customTokens !== 'object') return;
  for (const [rpcName, tokens] of Object.entries(customTokens)) {
    const config = chainRegistry[rpcName];
    if (config?.ref?.value && Array.isArray(tokens)) {
      for (const tokenItem of tokens) {
        const address = typeof tokenItem === 'string' ? tokenItem : tokenItem?.root;
        if (address && hasAddTokenByMetadata(config.ref.value)) {
          try {
            config.ref.value.addTokenByMetadata({ address: String(address) });
          } catch (e) {
          }
        }
      }
    }
  }
};

export function getOrCreateManager(rpcName: string, isForced = false): BlockchainManager {
  let resolvedName = rpcName;
  let config = chainRegistry[resolvedName];
  if (!config && rpcName) {
    const rawKey = rpcName.toLowerCase().trim();
    const matchedRpc = rpcList.find(
      (rpc) =>
        rpc.name.toLowerCase() === rawKey ||
        (rpc.swapChain && rpc.swapChain.toLowerCase() === rawKey) ||
        (rpc.displayName && rpc.displayName.toLowerCase() === rawKey)
    );
    if (matchedRpc && chainRegistry[matchedRpc.name]) {
      resolvedName = matchedRpc.name;
      config = chainRegistry[resolvedName];
    }
  }

  if (!config) {
    throw new Error(`Unknown chain: ${rpcName}`);
  }

  const prefix = getStorePrefix();
  const extraTokens: string[] = config.hasExtraTokens && prefix
    ? store.state[`${prefix}.customtoken`]?.customToken?.[resolvedName] || []
    : [];

  if (config.ref.value === undefined || isForced) {
    const manager = createManager({
      manifest: config.manifest,
      extraTokens,
      storage: config.storage,
    });
    config.ref.value = manager;
  } else {
    if (Array.isArray(extraTokens) && extraTokens.length > 0 && config.ref.value) {
      for (const address of extraTokens) {
        if (address && hasAddTokenByMetadata(config.ref.value)) {
          try {
            config.ref.value.addTokenByMetadata({ address });
          } catch (e) {
          }
        }
      }
    }
  }
  return config.ref.value;
}

export function getManager(rpcName: string, isForced = false): BlockchainManager | undefined {
  try { return getOrCreateManager(rpcName, isForced); } catch { return undefined; }
}

export const initialVenomWalletManager = (isForced = false) => getManager(RPC_NAMES.VENOM, isForced);
export const initialEvmManager = (isForced = false) => getManager(RPC_NAMES.ETH, isForced);
export const initialBnbManager = (isForced = false) => getManager(RPC_NAMES.BSC, isForced);
export const initialTronManager = (isForced = false) => getManager(RPC_NAMES.TRON, isForced);
export const initialTonManager = (isForced = false) => getManager(RPC_NAMES.TON, isForced);
export const initialBitcoinManager = (isForced = false) => getManager(RPC_NAMES.BTC, isForced);
export const initialSolanaManager = (isForced = false) => getManager(RPC_NAMES.SOLANA, isForced);
export const initialArbitrumManager = (isForced = false) => getManager(RPC_NAMES.ARBITRUM, isForced);
export const initialBaseManager = (isForced = false) => getManager(RPC_NAMES.BASE, isForced);
export const initialPolygonManager = (isForced = false) => getManager(RPC_NAMES.POLYGON, isForced);
export const initialAvalancheManager = (isForced = false) => getManager(RPC_NAMES.AVALANCHE, isForced);
export const initialXrplManager = (isForced = false) => getManager(RPC_NAMES.XRP, isForced);
export const initialCotiManager = (isForced = false) => getManager(RPC_NAMES.COTI, isForced);
export const initialKatanaManager = (isForced = false) => getManager(RPC_NAMES.KATANA, isForced);

export function initialManager(
  isForced?: boolean,
  rpcProvider?: RpcName | string,
  checkOnly?: false
): BlockchainManager;
export function initialManager(
  isForced: boolean | undefined,
  rpcProvider: RpcName | string | undefined,
  checkOnly: true
): BlockchainManager | undefined;
export function initialManager(
  isForced = false,
  rpcProvider: RpcName | string = store.state.settings.rpcProvider?.name,
  checkOnly = false
): BlockchainManager | undefined {
  const config = chainRegistry[rpcProvider as string];

  if (checkOnly) {
    const refEntry = config ? config.ref : chainRegistry[RPC_NAMES.VENOM].ref;
    return refEntry.value;
  }

  return getOrCreateManager(rpcProvider as string, isForced);
}

const walletAddressCache = new Map<string, string>();

export const getCachedWalletAddress = async (
  rpcProvider: string,
  isForced = false
): Promise<string | null> => {
  if (!isForced && walletAddressCache.has(rpcProvider)) {
    return walletAddressCache.get(rpcProvider)!;
  }
  try {
    const mgr = getOrCreateManager(rpcProvider);
    const address = await mgr.getWalletAddress(store.state.user.publicKeyCard);
    walletAddressCache.set(rpcProvider, address);
    return address;
  } catch (err) {
    return null;
  }
};

export const isValidWalletAddress = (address: string): boolean => {
  const mgr = getOrCreateManager(store.state.settings.rpcProvider?.name);
  return mgr.isValidAddress(address);
};

export const getNativeCoinSymbol = async (): Promise<string | null> => {
  try {
    const mgr = getOrCreateManager(store.state.settings.rpcProvider?.name);
    const symbol = await mgr.nativeCoin.getSymbol();
    return symbol;
  } catch (err) {
    return null;
  }
};

export const getNativeCoinId = async (): Promise<string | null> => {
  try {
    const mgr = getOrCreateManager(store.state.settings.rpcProvider?.name);
    const id = mgr.nativeCoin?.id;
    return id;
  } catch (err) {
    return null;
  }
};

export const getCotiSecret = async (isForced = false): Promise<string | null> => {
  try {
    const mgr = getOrCreateManager(RPC_NAMES.COTI, isForced);
    if (!isCotiManager(mgr)) {
      throw new Error('Coti manager not available');
    }
    const secretKey = await mgr.performOnBoarding(store.state.user.publicKeyCard);
    return secretKey;
  } catch (err) {
    throw new Error(i18n.global.t('errors.tokenLimit'), { cause: { errorSubtitle: i18n.global.t('messages.messageXrpMinBalance'), errorBody: err } });
  }
};

export const getWallet = async (publicKeyCard: CardKeys, isForced = false): Promise<string | null> => {
  try {
    const mgr = getOrCreateManager(store.state.settings.rpcProvider?.name, isForced);
    const walletAddress = await mgr.getWalletAddress(publicKeyCard);
    return walletAddress;
  } catch (err) {
    return null;
  }
};

export const setProviderUSDBalance = async (rpcProvider: RpcName | string = store.state.settings.rpcProvider?.name): Promise<boolean | void> => {
  let tokensSum = 0;
  for (const tokenItem of store.state.user.tokenBalance[rpcProvider]) {
    if (typeof tokenItem?.balance === 'undefined' || isNaN(tokenItem?.balance) === true || typeof tokenItem?.price?.usdPrice === 'undefined' || isNaN(tokenItem?.price?.usdPrice) === true) {
      continue;
    }
    tokensSum = tokensSum + (tokenItem?.balance * tokenItem?.price?.usdPrice);
  }

  if (typeof tokensSum === 'undefined' || isNaN(tokensSum) === true) {
    return false;
  }

  store.dispatch('user/setTokenData', { "provider": rpcProvider, "key": 'providerUSDBalance', "value": tokensSum ?? 0 });
};

export const setDefaultSelectedToken = async (isForced = false): Promise<void> => {
  const rpcProvider = store.state.settings.rpcProvider?.name;
  const mgr = getOrCreateManager(rpcProvider, isForced);
  const walletAddress = await getCachedWalletAddress(rpcProvider as string, isForced);

  let balance: string | number | null = null;
  if (walletAddress) {
    try {
      balance = await mgr.nativeCoin.getAvailableBalance(walletAddress);
    } catch (err) {
    }
  }

  const [symbolResult, priceResult, nameResult, iconUrlResult] = await Promise.allSettled([
    mgr.nativeCoin.getSymbol(),
    mgr.nativeCoin.getPrice(),
    mgr.nativeCoin.getName(),
    mgr.nativeCoin.getIconUrl(),
  ]);

  const tokenObject: TokenType = {
    "root": mgr.nativeCoin?.id ?? null,
    "symbol": symbolResult.status === 'fulfilled' ? symbolResult.value : null,
    "balance": balance,
    "price": priceResult.status === 'fulfilled' ? (priceResult.value ?? null) : null,
    "name": nameResult.status === 'fulfilled' ? nameResult.value : null,
    "isMandatory": mgr.nativeCoin?.isMandatory,
    "iconUrl": iconUrlResult.status === 'fulfilled' ? (iconUrlResult.value ?? null) : null,
    additionalData: {},
  };
  store.dispatch('user/setSelectedToken', { "key": store.state.settings.rpcProvider?.name, "value": tokenObject }).then(() => {
  }).catch((_error: unknown) => {
  });
};

export const getTokenObject = async (id: string, rpcProvider: RpcName | string = store.state.settings.rpcProvider?.name): Promise<Token | undefined> => {
  const mgr = getOrCreateManager(rpcProvider as string, false);
  try {
    return mgr.getToken(id);
  } catch (err) {
    return undefined;
  }
};

const safeCall = async <T>(fn: () => Promise<T>, _label?: string): Promise<T | null> => {
  try {
    return await fn();
  } catch (err) {
    return null;
  }
};

const pendingTokenFetches = new Map<string, Promise<void>>();
const pendingProviderBalances = new Map<string, Promise<void>>();
const lastTokenFetchTimestamp = new Map<string, number>();
const GLOBAL_TOKEN_FETCH_COOLDOWN_MS = 5000;

interface InternalTokenFields {
  _symbol?: string;
  _symbolOverride?: string;
  _name?: string;
  _nameOverride?: string;
  _icon?: string;
  _iconOverride?: string;
}

export const seedProviderTokenList = async (
  rpcProvider: RpcName | string = store.state.settings.rpcProvider?.name,
  isForced = false
): Promise<TokenType[]> => {
  if (!rpcProvider) return [];
  const mgr = getOrCreateManager(rpcProvider as string, false);
  const tokens = mgr.getTokens();
  const currentList: TokenType[] = Array.isArray(store.state.user.tokenBalance?.[rpcProvider])
    ? store.state.user.tokenBalance[rpcProvider]
    : [];

  const existingByRoot = new Map<string, TokenType>();
  for (const item of currentList) {
    if (item && item.root) {
      existingByRoot.set(item.root, item);
    }
  }

  const activeTokenIds = new Set<string>(tokens.map((t) => t.id));
  let changed = false;
  const nextList: TokenType[] = [];

  for (const existing of currentList) {
    if (!existing || !existing.root) continue;
    if (!activeTokenIds.has(existing.root) && isForced) {
      changed = true;
      continue;
    }
    if (existing.symbol === undefined && existing.isMandatory === undefined) {
      const token = mgr.getToken(existing.root);
      const raw = (token as unknown as InternalTokenFields) || {};
      changed = true;
      nextList.push({
        ...existing,
        symbol: raw._symbol ?? raw._symbolOverride ?? null,
        name: raw._name ?? raw._nameOverride ?? null,
        iconUrl: raw._icon ?? raw._iconOverride ?? null,
        isMandatory: token?.isMandatory,
        additionalData: existing.additionalData || {},
      });
    } else {
      nextList.push(existing);
    }
  }

  for (const token of tokens) {
    if (!existingByRoot.has(token.id)) {
      changed = true;
      const raw = (token as unknown as InternalTokenFields) || {};
      nextList.push({
        root: token.id,
        symbol: raw._symbol ?? raw._symbolOverride ?? null,
        balance: null,
        price: null,
        name: raw._name ?? raw._nameOverride ?? null,
        isMandatory: token.isMandatory,
        iconUrl: raw._icon ?? raw._iconOverride ?? null,
        additionalData: {},
      });
    }
  }

  if (changed || currentList.length === 0) {
    await store.dispatch('user/setTokenBalance', {
      provider: rpcProvider,
      value: nextList,
    });
  }

  return nextList;
};

export const setTokenBalance = async (
  id: string,
  rpcProvider: RpcName | string = store.state.settings.rpcProvider?.name,
  isForced = false
): Promise<void> => {
  const key = `${rpcProvider}:${id}`;
  const now = Date.now();
  const lastFetch = lastTokenFetchTimestamp.get(key) || 0;

  if (!isForced && now - lastFetch < GLOBAL_TOKEN_FETCH_COOLDOWN_MS) {
    return;
  }

  if (!isForced && pendingTokenFetches.has(key)) {
    return pendingTokenFetches.get(key)!;
  }

  const promise = (async () => {
    try {
      lastTokenFetchTimestamp.set(key, Date.now());
      await _executeSetTokenBalance(id, rpcProvider, isForced);
    } finally {
      pendingTokenFetches.delete(key);
    }
  })();

  pendingTokenFetches.set(key, promise);
  return promise;
};

const _executeSetTokenBalance = async (
  id: string,
  rpcProvider: RpcName | string = store.state.settings.rpcProvider?.name,
  isForced = false
): Promise<void> => {
  const mgr = getOrCreateManager(rpcProvider as string, false);
  if (isForced) {
    const mgrWithReader = mgr as unknown as { _balanceReader?: { clearCache?: () => void } };
    if (typeof mgrWithReader?._balanceReader?.clearCache === 'function') {
      mgrWithReader._balanceReader.clearCache();
    }
  }

  const token: Token | undefined = await getTokenObject(id, rpcProvider);
  if (!token) return;

  const walletAddress = await getCachedWalletAddress(rpcProvider as string);

  interface XrpTokenLike {
    getTrustLimit(address: string): Promise<string>;
  }

  interface CotiTokenLike {
    isSecure(): Promise<boolean>;
  }

  const existingList: TokenType[] = Array.isArray(store.state.user.tokenBalance?.[rpcProvider])
    ? store.state.user.tokenBalance[rpcProvider]
    : [];
  const existingItem = existingList.find((item) => item?.root === id) || null;
  const rawToken = (token as unknown as InternalTokenFields) || {};

  let resolvedPrice: TokenType['price'] = existingItem?.price ?? null;
  let resolvedIconUrl: string | null = existingItem?.iconUrl ?? rawToken._icon ?? rawToken._iconOverride ?? null;

  const priceAndIconPromise = Promise.allSettled([
    token.getPrice(),
    resolvedIconUrl ? Promise.resolve(resolvedIconUrl) : token.getIconUrl(),
  ]).then(([priceRes, iconRes]) => {
    if (priceRes.status === 'fulfilled' && priceRes.value !== undefined) {
      resolvedPrice = priceRes.value ?? resolvedPrice;
    }
    if (iconRes.status === 'fulfilled' && iconRes.value) {
      resolvedIconUrl = iconRes.value;
    }
  });

  const [symbolResult, balanceResult, nameResult] = await Promise.allSettled([
    rawToken._symbol || rawToken._symbolOverride
      ? Promise.resolve(rawToken._symbol ?? rawToken._symbolOverride ?? null)
      : token.getSymbol(),
    walletAddress ? token.getAvailableBalance(walletAddress) : Promise.resolve(null),
    rawToken._name || rawToken._nameOverride
      ? Promise.resolve(rawToken._name ?? rawToken._nameOverride ?? null)
      : token.getName(),
  ]);

  const tokenObject: TokenType = {
    root: id,
    symbol:
      symbolResult.status === 'fulfilled' && symbolResult.value !== null
        ? symbolResult.value
        : (existingItem?.symbol ?? null),
    balance:
      balanceResult.status === 'fulfilled' && balanceResult.value !== null
        ? balanceResult.value
        : (existingItem?.balance ?? null),
    price: resolvedPrice,
    name:
      nameResult.status === 'fulfilled' && nameResult.value !== null
        ? nameResult.value
        : (existingItem?.name ?? null),
    isMandatory: token.isMandatory,
    iconUrl: resolvedIconUrl,
    additionalData: { ...(existingItem?.additionalData || {}) },
  };

  if (rpcProvider === RPC_NAMES.XRP && tokenObject) {
    if (!token.isNative) {
      tokenObject.additionalData.tokenLimits =
        'getTrustLimit' in token && walletAddress
          ? await safeCall(() => (token as unknown as XrpTokenLike).getTrustLimit(walletAddress), "getTrustLimit")
          : (existingItem?.additionalData?.tokenLimits ?? null);
    } else {
      tokenObject.additionalData.isEnoughRootTokenBalance =
        tokenObject.balance !== undefined && tokenObject.balance !== null && Number(tokenObject.balance) >= 1;
    }
  }

  if (rpcProvider === RPC_NAMES.COTI) {
    tokenObject.additionalData.cotiIsSecureToken = 'isSecure' in token
      ? await safeCall(() => (token as unknown as CotiTokenLike).isSecure(), "isSecure")
      : false;
    tokenObject.additionalData.isOnBoarded = isCotiManager(mgr)
      ? await safeCall(() => mgr.isOnBoarded(store.state.user.publicKeyCard), "isOnBoarded")
      : false;
  }

  const commitTokenUpdate = async (snapshot: TokenType) => {
    try {
      await store.dispatch('user/setTokenBalanceItem', {
        provider: rpcProvider,
        key: id,
        value: snapshot,
        action: "updateToken",
      });
    } catch (err) {
    }

    const selected = store.state.user.selectedToken?.[rpcProvider];
    if (selected?.root === snapshot?.root && selected?.balance !== snapshot?.balance) {
      try {
        await store.dispatch('user/setSelectedToken', { key: rpcProvider, value: snapshot });
      } catch (err) {
      }
    }
  };

  await commitTokenUpdate({ ...tokenObject });
  if (tokenObject.price) {
    setProviderUSDBalance(rpcProvider);
  }

  await priceAndIconPromise;
  if (resolvedPrice !== tokenObject.price || resolvedIconUrl !== tokenObject.iconUrl) {
    tokenObject.price = resolvedPrice;
    tokenObject.iconUrl = resolvedIconUrl;
    await commitTokenUpdate({ ...tokenObject });
    if (tokenObject.price) {
      setProviderUSDBalance(rpcProvider);
    }
  }
};

export const getTokensList = (isForced = false): Token[] => {
  const mgr = getOrCreateManager(store.state.settings.rpcProvider?.name, isForced);
  return mgr.getTokens();
};

export const getToken = (id: string): Token | undefined => {
  const mgr = getOrCreateManager(store.state.settings.rpcProvider?.name);
  return mgr.getToken(id);
};

export const setTokensBalances = async (
  isForced = false,
  targetProvider?: RpcName | string
): Promise<void> => {
  const rpcProvider = targetProvider || store.state.settings.rpcProvider?.name;
  if (!rpcProvider) return;

  if (!isForced && pendingProviderBalances.has(rpcProvider as string)) {
    return pendingProviderBalances.get(rpcProvider as string)!;
  }

  const runRefresh = (async () => {
    try {
      if (isForced) {
        walletAddressCache.delete(rpcProvider as string);
        for (const key of lastTokenFetchTimestamp.keys()) {
          if (key.startsWith(`${rpcProvider}:`)) {
            lastTokenFetchTimestamp.delete(key);
          }
        }
      }

      await seedProviderTokenList(rpcProvider, isForced);

      const mgr = getOrCreateManager(rpcProvider as string, false);
      if (isForced) {
        const mgrWithReader = mgr as unknown as { _balanceReader?: { clearCache?: () => void } };
        if (typeof mgrWithReader?._balanceReader?.clearCache === 'function') {
          mgrWithReader._balanceReader.clearCache();
        }
      }

      const tokens = mgr.getTokens();
      if (tokens.length === 0) return;

      const concurrencyLimit = 6;
      let cursor = 0;
      const workers = Array.from({ length: Math.min(concurrencyLimit, tokens.length) }, async () => {
        while (cursor < tokens.length) {
          const currentIndex = cursor++;
          const tokenItem = tokens[currentIndex];
          if (tokenItem) {
            await setTokenBalance(tokenItem.id, rpcProvider, isForced);
          }
        }
      });

      await Promise.allSettled(workers);
      setProviderUSDBalance(rpcProvider);
    } finally {
      pendingProviderBalances.delete(rpcProvider as string);
    }
  })();

  pendingProviderBalances.set(rpcProvider as string, runRefresh);
  return runRefresh;
};

export const clearData = async (): Promise<boolean> => {
  walletAddressCache.clear();
  await store.dispatch('user/resetToken');
  await store.dispatch('swap/resetBalances');

  return true;
};

export const clearUserSettings = (): boolean => {
  walletAddressCache.clear();
  store.dispatch('user/resetToken');
  store.dispatch('settings/resetCardVersion');
  store.dispatch('swap/resetBalances');
  store.dispatch('swapHistory/clearHistory');
  return true;
};
export const checkFidoSupport = computed(() => browserSupportsWebAuthn());

export const checkNfcSupport = computed(() => typeof window !== 'undefined' && 'NDEFReader' in window);

export const checkNfcPermissionIsGranted = checkNfcSupport;

export const getTokenNameById = async (
  id: string,
  rpcProvider: RpcName | string = store.state.settings.rpcProvider?.name
): Promise<string | null> => {
  const mgr = getOrCreateManager(rpcProvider as string, false);
  const token = mgr.getToken(id);
  if (!token) return null;

  return await safeCall(() => token?.getName(), "getName");
};

export const getTokenSymbolById = async (
  id: string | null,
  rpcProvider: RpcName | string = store.state.settings.rpcProvider?.name
): Promise<string | null> => {
  if (id == null) return null;
  const mgr = getOrCreateManager(rpcProvider as string, false);
  let token: Token | undefined;
  try {
    token = mgr.getToken(id);
  } catch (err) {
  }
  if (!token) return null;

  return await safeCall(() => token?.getSymbol(), "getSymbol");
};
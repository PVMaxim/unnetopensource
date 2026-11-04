import { markRaw, defineAsyncComponent, defineComponent, h } from 'vue';
import { getOrCreateManager } from '@/api/ApiHandler';
import noneIcon from '@/components/svg/none.vue';
import { rpcList, SWAP_NATIVE_ADDRESS } from '@/api/constants-types';
import store from '@/store';

const providerIcons = import.meta.glob('../components/svg/provider/*.vue', { eager: true });
const tokenSymbolIcons = import.meta.glob('../components/svg/tokens/*.vue', { eager: true });
const tokenIcons = import.meta.glob('../components/svg/tokens/*/*.vue', { eager: true });

const providerComponentsMap = new Map<string, any>();
for (const [path, mod] of Object.entries(providerIcons)) {
  const match = path.match(/\/([^/]+)\.vue$/);
  if (match) {
    const comp = (mod as any)?.default || mod;
    providerComponentsMap.set(match[1].toLowerCase(), markRaw(comp));
  }
}

for (const [path, mod] of Object.entries(tokenSymbolIcons)) {
  const match = path.match(/\/([^/]+)\.vue$/);
  if (match) {
    const key = match[1].toLowerCase();
    const comp = (mod as any)?.default || mod;
    if (!providerComponentsMap.has(key)) {
      providerComponentsMap.set(key, markRaw(comp));
    }
  }
}

const tokenComponentsMap = new Map<string, any>();
for (const [path, mod] of Object.entries(tokenIcons)) {
  const match = path.match(/tokens\/([^/]+)\/([^/]+)\.vue$/);
  if (match) {
    const key = `${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
    const comp = (mod as any)?.default || mod;
    tokenComponentsMap.set(key, markRaw(comp));
  }
}

const aliasToProviderKey = new Map<string, string>();
for (const rpc of rpcList) {
  const target = rpc.name.toLowerCase();
  aliasToProviderKey.set(rpc.name.toLowerCase(), target);
  if (rpc.swapChain) aliasToProviderKey.set(rpc.swapChain.toLowerCase(), target);
  if (rpc.displayName) aliasToProviderKey.set(rpc.displayName.toLowerCase(), target);
}
aliasToProviderKey.set('bnb', 'bnb chain');
aliasToProviderKey.set('sol', 'solana');
aliasToProviderKey.set('matic', 'polygon');
aliasToProviderKey.set('pol', 'polygon');
aliasToProviderKey.set('avax', 'avalanche');
aliasToProviderKey.set('shib', 'shiba');

const localResolutionCache = new Map<string, any>();
const remoteComponentCache = new Map<string, any>();

const loadedImageUrls = new Set<string>();
const preloadedImages = new Map<string, HTMLImageElement>();

export function isImageUrlCached(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return loadedImageUrls.has(url.trim());
}

export function markImageUrlCached(url?: string | null): void {
  if (!url || typeof url !== 'string') return;
  const clean = url.trim();
  if (!clean || clean.includes('unknownTokenIcon.svg')) return;
  loadedImageUrls.add(clean);
}

export function preloadTokenIconUrl(url?: string | null): void {
  if (!url || typeof url !== 'string') return;
  const clean = url.trim();
  if (!clean || clean.includes('unknownTokenIcon.svg') || loadedImageUrls.has(clean)) return;
  if (typeof Image === 'undefined' || preloadedImages.has(clean)) return;
  try {
    const img = new Image();
    img.onload = () => {
      loadedImageUrls.add(clean);
    };
    img.src = clean;
    if (img.complete && img.naturalWidth > 0) {
      loadedImageUrls.add(clean);
    }
    preloadedImages.set(clean, img);
  } catch {
  }
}

function resolveLocalTokenIcon(arg: any): any {
  if (!arg) return null;

  if (typeof arg === 'string') {
    const rawKey = arg.toLowerCase().trim();
    if (localResolutionCache.has(rawKey)) {
      return localResolutionCache.get(rawKey);
    }

    const mappedKey = aliasToProviderKey.get(rawKey) || rawKey;
    const comp = providerComponentsMap.get(mappedKey) || providerComponentsMap.get(rawKey) || null;
    localResolutionCache.set(rawKey, comp);
    return comp;
  }

  if (typeof arg === 'object' && arg.chain && arg.address) {
    const chain = String(arg.chain).toLowerCase().trim();
    const address = String(arg.address).toLowerCase().trim();
    const key = `${chain}/${address}`;

    if (localResolutionCache.has(key)) {
      return localResolutionCache.get(key);
    }

    const comp = tokenComponentsMap.get(key) || null;
    localResolutionCache.set(key, comp);
    return comp;
  }

  return null;
}

export function getTokenIcon(arg: any, isOnlyUrl: boolean = false, isOnlyLocal: boolean = false): any {
  if (!arg) return null;

  if (isOnlyUrl) {
    return getRemoteTokenIconUrl(arg);
  }

  const localComponent = resolveLocalTokenIcon(arg);
  if (localComponent) {
    return localComponent;
  }

  if (isOnlyLocal) {
    return null;
  }

  const key = getCacheKey(arg);
  if (remoteComponentCache.has(key)) {
    return remoteComponentCache.get(key);
  }

  const remoteUrlPromise = getRemoteTokenIconUrl(arg);
  const comp = markRaw(
    defineAsyncComponent(async () => {
      const url = await remoteUrlPromise;
      if (!url || (typeof url === 'string' && url.includes('unknownTokenIcon.svg'))) {
        return noneIcon;
      }
      return defineComponent({
        render() {
          return h('img', { src: url, class: 'icon' });
        }
      });
    })
  );

  remoteComponentCache.set(key, comp);
  return comp;
}

const unknownTokenIcon = () =>
  new URL(`../assets/images/unknownTokenIcon.svg`, import.meta.url).href;

const urlCache = new Map<string, string | null>();
const fetchingMap = new Map<string, Promise<string | null>>();

function findStoreTokenIcon(chain: string, address?: string, symbol?: string): string | null {
  try {
    const rpcName = resolveRpcName(chain) || chain;
    const userTokens = store?.state?.user?.tokenBalance?.[rpcName];
    if (Array.isArray(userTokens)) {
      const match = userTokens.find((item: any) => {
        if (!item) return false;
        if (address && item.root && item.root.toLowerCase() === address.toLowerCase()) return true;
        if (symbol && item.symbol && item.symbol.toLowerCase() === symbol.toLowerCase()) return true;
        return false;
      });
      if (match?.iconUrl && typeof match.iconUrl === 'string' && !match.iconUrl.includes('unknownTokenIcon.svg')) {
        return match.iconUrl;
      }
    }
    const swapTokens = store?.state?.swap?.tokens?.[chain];
    if (Array.isArray(swapTokens)) {
      const match = swapTokens.find((item: any) => {
        if (!item) return false;
        if (address && item.address && item.address.toLowerCase() === address.toLowerCase()) return true;
        if (symbol && item.symbol && item.symbol.toLowerCase() === symbol.toLowerCase()) return true;
        return false;
      });
      const icon = match?.logoURI || match?.iconUrl || match?.icon;
      if (icon && typeof icon === 'string' && !icon.includes('unknownTokenIcon.svg')) {
        return icon;
      }
    }
  } catch {
  }
  return null;
}

export function getCachedTokenIconUrl(arg: any): string | null {
  if (!arg) return null;
  if (typeof arg === 'object' && arg !== null) {
    const directIcon = arg.iconUrl || arg.logoURI || arg.icon || arg.image || arg.imageUrl;
    if (typeof directIcon === 'string' && directIcon.trim()) {
      preloadTokenIconUrl(directIcon.trim());
      return directIcon.trim();
    }
    if (arg.chain) {
      const storeIcon = findStoreTokenIcon(arg.chain, arg.address, arg.symbol);
      if (storeIcon) {
        preloadTokenIconUrl(storeIcon);
        return storeIcon;
      }
    }
    if (typeof arg.changellyTicker === 'string' && arg.changellyTicker.trim() && !resolveLocalTokenIcon(arg)) {
      const url = `https://cdn.changelly.com/icons/${arg.changellyTicker.toLowerCase().trim()}.png`;
      preloadTokenIconUrl(url);
      return url;
    }
  }
  const key = getCacheKey(arg);
  if (urlCache.has(key)) {
    return urlCache.get(key) || null;
  }
  if (typeof arg === 'object' && typeof arg.symbol === 'string' && arg.symbol.trim()) {
    const symKey = arg.symbol.toLowerCase().trim();
    if (urlCache.has(symKey)) {
      return urlCache.get(symKey) || null;
    }
  }
  return null;
}

export const getCachedTokenIconUrlSync = getCachedTokenIconUrl;

export function toXrplCanonicalCurrencyCode(rawCode: string): string {
  if (!rawCode) return '';
  const clean = rawCode.replace(/\s*\([^)]*\)/g, '').trim();
  if (clean.length === 3 && clean.toLowerCase() !== 'xrp') {
    return clean;
  }
  if (clean.match(/^[a-fA-F0-9]{40}$/) && !isNaN(parseInt(clean, 16))) {
    return clean.toUpperCase();
  }
  if (clean.length > 0 && clean.length <= 20) {
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.alloc(20);
      buf.write(clean, 'utf-8');
      return buf.toString('hex').toUpperCase();
    } else {
      let hex = '';
      for (let i = 0; i < clean.length; i++) {
        hex += clean.charCodeAt(i).toString(16).padStart(2, '0');
      }
      return hex.padEnd(40, '0').toUpperCase();
    }
  }
  return '';
}

function getCacheKey(arg: any): string {
  if (typeof arg === 'string') {
    return arg.toLowerCase().trim();
  }

  if (typeof arg === 'object' && arg !== null) {
    const directIcon = arg.iconUrl || arg.logoURI || arg.icon || arg.image || arg.imageUrl;
    if (typeof directIcon === 'string' && directIcon.trim()) {
      return `direct:${directIcon.trim()}`;
    }

    const chain = (arg.chain || arg.rpcName || '').toLowerCase().trim();
    let address = (arg.address || '').toLowerCase().trim();

    if ((chain === 'xrp' || chain === 'xrpl') && address) {
      if (address.includes('.')) {
        const parts = address.split('.');
        const canonical = toXrplCanonicalCurrencyCode(parts[0]) || parts[0];
        address = `${canonical.toLowerCase().trim()}.${parts[1]}`;
      } else {
        const code = arg.currencyCode || toXrplCanonicalCurrencyCode(arg.symbol || arg.name || '');
        if (code) {
          const canonical = toXrplCanonicalCurrencyCode(code) || code;
          address = `${canonical.toLowerCase().trim()}.${address}`;
        }
      }
    }

    if (chain && address && address !== '_' && address !== 'native' && address !== SWAP_NATIVE_ADDRESS && address !== '0x0000000000000000000000000000000000000000' && address !== '0:77d36848bb159fa485628bc38dc37eadb74befa514395e09910f601b841f749e') {
      return `${chain}/${address}`;
    }
    const symbol = (arg.symbol || '').toLowerCase().trim();
    if (chain && symbol) {
      return `${chain}/${symbol}`;
    }
    const ticker = arg.ticker || arg.coinGeckoId || arg.coingeckoId;
    if (typeof ticker === 'string') {
      return ticker.toLowerCase().trim();
    }
    if (chain) return chain;
    if (symbol) return symbol;
  }

  return 'unknown';
}

export const getCoinGeckoIconUrl = (ticker: string): string => {
  if (!ticker) return '';
  return `https://coingecko.worker.united.network/__icons/${encodeURIComponent(ticker)}`;
};

function resolveRpcName(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  const matched = rpcList.find(
    (rpc) =>
      rpc.name.toLowerCase() === lower ||
      (rpc.swapChain && rpc.swapChain.toLowerCase() === lower) ||
      (rpc.displayName && rpc.displayName.toLowerCase() === lower)
  );
  return matched ? matched.name : null;
}

export async function getRemoteTokenIconUrl(arg: any): Promise<string> {
  if (!arg) return unknownTokenIcon();

  if (typeof arg === 'object' && arg !== null) {
    const directIcon = arg.iconUrl || arg.logoURI || arg.icon || arg.image || arg.imageUrl;
    if (typeof directIcon === 'string' && directIcon.trim()) {
      return directIcon.trim();
    }

    if (arg.chain) {
      const storeIcon = findStoreTokenIcon(arg.chain, arg.address, arg.symbol);
      if (storeIcon) return storeIcon;
    }

    if (typeof arg.tip3?.getIconUrl === 'function') {
      try {
        const icon = await arg.tip3.getIconUrl();
        if (icon) return icon;
      } catch {
      }
    }
    if (typeof arg.token?.getIconUrl === 'function') {
      try {
        const icon = await arg.token.getIconUrl();
        if (icon) return icon;
      } catch {
      }
    }
  }

  const key = getCacheKey(arg);

  if (urlCache.has(key)) {
    return urlCache.get(key) || unknownTokenIcon();
  }

  if (fetchingMap.has(key)) {
    const result = await fetchingMap.get(key);
    return result || unknownTokenIcon();
  }

  const fetchPromise = (async () => {
    try {
      if (typeof arg === 'string') {
        const rpcName = resolveRpcName(arg);
        if (rpcName) {
          try {
            const mgr = getOrCreateManager(rpcName, false);
            if (mgr?.nativeCoin) {
              const iconUrl = await mgr.nativeCoin.getIconUrl();
              if (iconUrl) return iconUrl;
            }
          } catch {
          }
        }
        return null;
      }

      if (typeof arg === 'object' && arg !== null) {
        const chain = arg.chain || arg.rpcName;
        let address = arg.address;
        const rpcName = (chain ? resolveRpcName(chain) : null) || chain;

        if (rpcName) {
          try {
            const mgr = getOrCreateManager(rpcName, false);
            let iconUrl: string | undefined = undefined;

            const isXrplChain =
              String(chain).toLowerCase() === 'xrp' ||
              String(rpcName).toLowerCase() === 'xrp' ||
              String(rpcName).toLowerCase() === 'xrpl';

            if (isXrplChain && address) {
              if (address.includes('.')) {
                const parts = address.split('.');
                const canonical = toXrplCanonicalCurrencyCode(parts[0]) || parts[0];
                address = `${canonical}.${parts[1]}`;
              } else {
                const code = arg.currencyCode || toXrplCanonicalCurrencyCode(arg.symbol || arg.name || '');
                if (code) {
                  const canonical = toXrplCanonicalCurrencyCode(code) || code;
                  address = `${canonical}.${address}`;
                }
              }
            }

            if (!address || address === '_' || address === 'native' || address === SWAP_NATIVE_ADDRESS || address === '0x0000000000000000000000000000000000000000' || address === '0:77d36848bb159fa485628bc38dc37eadb74befa514395e09910f601b841f749e') {
              if (mgr.nativeCoin) {
                iconUrl = await mgr.nativeCoin.getIconUrl();
              }
            } else {
              let token = mgr.getToken(address);

              if (!token && isXrplChain && typeof mgr.getTokens === 'function') {
                const allTokens = mgr.getTokens();
                token = allTokens.find((t: any) => {
                  if (t.id === address) return true;
                  if (arg.address && typeof t.id === 'string' && t.id.toLowerCase().endsWith(`.${arg.address.toLowerCase()}`)) return true;
                  return false;
                });
              }

              if (!token && typeof (mgr as any).findTokenInManifest === 'function') {
                try {
                  const manifestMeta = await (mgr as any).findTokenInManifest(address);
                  if (manifestMeta) {
                    if (manifestMeta.icon) {
                      return manifestMeta.icon;
                    }
                    token = mgr.createToken({
                      ...manifestMeta,
                      ticker: manifestMeta.ticker,
                    });
                  }
                } catch {
                }
              }

              const explicitTicker = arg.ticker || arg.coinGeckoId || arg.coingeckoId;
              if (!token && (isXrplChain || explicitTicker) && typeof mgr.createToken === 'function') {
                try {
                  token = mgr.createToken({
                    address,
                    name: arg.name || '',
                    symbol: arg.symbol || '',
                    decimals: arg.decimals || 0,
                    ticker: explicitTicker,
                  });
                } catch {
                }
              }

              if (token) {
                iconUrl = await token.getIconUrl();
              }
            }

            if (iconUrl) {
              return iconUrl;
            }
          } catch {
          }
        }

        const ticker = arg.ticker || arg.coinGeckoId || arg.coingeckoId;
        if (typeof ticker === 'string' && ticker.trim()) {
          return getCoinGeckoIconUrl(ticker.toLowerCase().trim());
        }

        if (typeof arg.changellyTicker === 'string' && arg.changellyTicker.trim()) {
          return `https://cdn.changelly.com/icons/${arg.changellyTicker.toLowerCase().trim()}.png`;
        }
      }

      return null;
    } catch {
      return null;
    }
  })();

  fetchingMap.set(key, fetchPromise);
  const resolved = await fetchPromise;
  urlCache.set(key, resolved);
  if (resolved && typeof arg === 'object' && typeof arg.symbol === 'string' && arg.symbol.trim()) {
    const symKey = arg.symbol.toLowerCase().trim();
    if (!urlCache.has(symKey)) {
      urlCache.set(symKey, resolved);
    }
  }
  if (resolved) {
    preloadTokenIconUrl(resolved);
  }
  fetchingMap.delete(key);

  return resolved || unknownTokenIcon();
}

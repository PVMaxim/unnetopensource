import { markRaw, defineAsyncComponent, defineComponent, h } from 'vue';
import { getOrCreateManager } from '@/api/ApiHandler';
import noneIcon from '@/components/svg/none.vue';
import { rpcList, SWAP_NATIVE_ADDRESS } from '@/api/constants-types';

const providerIcons = import.meta.glob('../components/svg/provider/*.vue');
const tokenIcons = import.meta.glob('../components/svg/tokens/*/*.vue');

// 1. Pre-index provider components
const providerComponentsMap = new Map<string, any>();
for (const [path, loader] of Object.entries(providerIcons)) {
  const match = path.match(/\/([^/]+)\.vue$/);
  if (match) {
    providerComponentsMap.set(match[1].toLowerCase(), markRaw(defineAsyncComponent(loader as any)));
  }
}

// 2. Pre-index token components
const tokenComponentsMap = new Map<string, any>();
for (const [path, loader] of Object.entries(tokenIcons)) {
  const match = path.match(/tokens\/([^/]+)\/([^/]+)\.vue$/);
  if (match) {
    const key = `${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
    tokenComponentsMap.set(key, markRaw(defineAsyncComponent(loader as any)));
  }
}

// 3. Pre-index alias lookups for O(1) matching
const aliasToProviderKey = new Map<string, string>();
for (const rpc of rpcList) {
  const target = rpc.name.toLowerCase();
  aliasToProviderKey.set(rpc.name.toLowerCase(), target);
  if (rpc.swapChain) aliasToProviderKey.set(rpc.swapChain.toLowerCase(), target);
  if (rpc.displayName) aliasToProviderKey.set(rpc.displayName.toLowerCase(), target);
}

// 4. Memoize lookups (including negative / null lookups to prevent repeated scanning)
const localResolutionCache = new Map<string, any>();
const remoteComponentCache = new Map<string, any>();

/**
 * Resolves a local SVG component synchronously if available.
 */
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

/**
 * Returns a token icon component or URL.
 * 1. Checks Cache
 * 2. Checks Local SVG
 * 3. Checks CoinGecko via Manager
 *
 * @param arg Token object or chain string
 * @param isOnlyUrl If true, returns a Promise<string> (URL only)
 * @param isOnlyLocal If true, prevents falling back to CoinGecko
 */
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

  // Fallback to CoinGecko URL but return as a cached Vue component
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

/**
 * Converts a currency code or symbol to canonical XRPL format.
 * - 3 chars: standard code (e.g. 'USD')
 * - 40 hex chars: canonical hex
 * - 1..20 chars: UTF-8 encoded hex padded to 40 chars
 */
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

/**
 * Generates a consistent cache key for token objects or strings.
 */
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

/**
 * Returns a remote CoinGecko URL asynchronously via the manager.
 */
export async function getRemoteTokenIconUrl(arg: any): Promise<string> {
  if (!arg) return unknownTokenIcon();

  // 1. Direct custom token icon URL if present
  if (typeof arg === 'object' && arg !== null) {
    const directIcon = arg.iconUrl || arg.logoURI || arg.icon || arg.image || arg.imageUrl;
    if (typeof directIcon === 'string' && directIcon.trim()) {
      return directIcon.trim();
    }

    // Direct tip3 / token instance
    if (typeof arg.tip3?.getIconUrl === 'function') {
      try {
        const icon = await arg.tip3.getIconUrl();
        if (icon) return icon;
      } catch {
        // ignore
      }
    }
    if (typeof arg.token?.getIconUrl === 'function') {
      try {
        const icon = await arg.token.getIconUrl();
        if (icon) return icon;
      } catch {
        // ignore
      }
    }
  }

  const key = getCacheKey(arg);
  
  if (urlCache.has(key)) {
    return urlCache.get(key) || unknownTokenIcon();
  }

  // Prevent multiple identical requests at the same time
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
            // Ignore manager error
          }
        }
        return getCoinGeckoIconUrl(arg);
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

            // Format XRP trustline address: currencyCode.issuer
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

            // Native token
            if (!address || address === '_' || address === 'native' || address === SWAP_NATIVE_ADDRESS || address === '0x0000000000000000000000000000000000000000' || address === '0:77d36848bb159fa485628bc38dc37eadb74befa514395e09910f601b841f749e') {
              if (mgr.nativeCoin) {
                iconUrl = await mgr.nativeCoin.getIconUrl();
              }
            } else {
              // 1. Get Token instance directly by address
              let token = mgr.getToken(address);

              // 2. If not found and XRPL, check if any token in mgr.getTokens() matches issuer address or symbol
              if (!token && isXrplChain && typeof mgr.getTokens === 'function') {
                const allTokens = mgr.getTokens();
                token = allTokens.find((t: any) => {
                  if (t.id === address) return true;
                  if (arg.address && typeof t.id === 'string' && t.id.toLowerCase().endsWith(`.${arg.address.toLowerCase()}`)) return true;
                  return false;
                });
              }

              // 3. If still not in memory, create it dynamically
              if (!token && typeof mgr.createToken === 'function') {
                try {
                  token = mgr.createToken({
                    address,
                    name: arg.name || '',
                    symbol: arg.symbol || '',
                    decimals: arg.decimals || 0,
                  });
                } catch {
                  // Ignore creation failure for malformed address
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
            // Fall through to ticker fallback
          }
        }

        // Fallback ONLY to explicit CoinGecko ticker if available (do not guess arbitrary symbols to prevent 500 errors)
        const ticker = arg.ticker || arg.coinGeckoId || arg.coingeckoId;
        if (typeof ticker === 'string' && ticker.trim()) {
          return getCoinGeckoIconUrl(ticker.toLowerCase().trim());
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
  fetchingMap.delete(key);

  return resolved || unknownTokenIcon();
}

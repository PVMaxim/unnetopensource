export interface EndpointsConfig {
  coingecko: string;
  oneInch: string;
  changelly: string;
  bridgers: string;
  tonApi: string;
  omniBridge: string;
  thirdPartyProxy: string;
  tokenIconsCdn: string;
  rpc: Record<string, string | undefined>;
  rpcWs: Record<string, string | undefined>;
  scanner: Record<string, string | undefined>;
}

export const ENDPOINTS: EndpointsConfig = {
  coingecko: import.meta.env.VITE_COINGECKO_API_URL || 'https://api.coingecko.com',
  oneInch: import.meta.env.VITE_1INCH_API_URL || 'https://api.1inch.dev',
  changelly: import.meta.env.VITE_CHANGELLY_API_URL || 'https://api.changelly.com/v2',
  bridgers: import.meta.env.VITE_BRIDGERS_API_URL || 'https://api.bridgers.xyz/api',
  tonApi: import.meta.env.VITE_TON_API_URL || 'https://tonapi.io/v2',
  omniBridge: import.meta.env.VITE_OMNIBRIDGE_API_URL || 'https://www.swftc.info/api',
  thirdPartyProxy: import.meta.env.VITE_THIRD_PARTY_PROXY_URL || '',
  tokenIconsCdn: import.meta.env.VITE_TOKEN_ICONS_CDN_URL || '',
  rpc: {
    ethereum: import.meta.env.VITE_RPC_ETHEREUM,
    binance: import.meta.env.VITE_RPC_BINANCE,
    solana: import.meta.env.VITE_RPC_SOLANA,
    polygon: import.meta.env.VITE_RPC_POLYGON,
    arbitrum: import.meta.env.VITE_RPC_ARBITRUM,
    base: import.meta.env.VITE_RPC_BASE,
    avalanche: import.meta.env.VITE_RPC_AVALANCHE,
    tron: import.meta.env.VITE_RPC_TRON,
    ton: import.meta.env.VITE_RPC_TON,
    bitcoin: import.meta.env.VITE_RPC_BITCOIN,
    katana: import.meta.env.VITE_RPC_KATANA,
    coti: import.meta.env.VITE_RPC_COTI,
    venom: import.meta.env.VITE_RPC_VENOM,
    xrpl: import.meta.env.VITE_RPC_XRPL,
  },
  rpcWs: {
    solana: import.meta.env.VITE_RPC_SOLANA_WS,
    xrpl: import.meta.env.VITE_RPC_XRPL_WS,
  },
  scanner: {
    ethereum: import.meta.env.VITE_SCANNER_ETHEREUM,
    binance: import.meta.env.VITE_SCANNER_BINANCE,
    solana: import.meta.env.VITE_SCANNER_SOLANA,
    polygon: import.meta.env.VITE_SCANNER_POLYGON,
    arbitrum: import.meta.env.VITE_SCANNER_ARBITRUM,
    base: import.meta.env.VITE_SCANNER_BASE,
    avalanche: import.meta.env.VITE_SCANNER_AVALANCHE,
    tron: import.meta.env.VITE_SCANNER_TRON,
    katana: import.meta.env.VITE_SCANNER_KATANA,
    coti: import.meta.env.VITE_SCANNER_COTI,
  },
};

const resolveChainKey = (manifest: any): string => {
  if (!manifest) return '';
  const rawName = (manifest.name || manifest.type || '').toLowerCase();
  if (rawName.includes('eth')) return 'ethereum';
  if (rawName.includes('binance') || rawName.includes('bsc')) return 'binance';
  if (rawName.includes('solana')) return 'solana';
  if (rawName.includes('polygon') || rawName.includes('matic')) return 'polygon';
  if (rawName.includes('arbitrum')) return 'arbitrum';
  if (rawName.includes('base')) return 'base';
  if (rawName.includes('avalanche') || rawName.includes('avax')) return 'avalanche';
  if (rawName.includes('tron')) return 'tron';
  if (rawName.includes('ton')) return 'ton';
  if (rawName.includes('bitcoin') || rawName.includes('btc')) return 'bitcoin';
  if (rawName.includes('katana')) return 'katana';
  if (rawName.includes('coti')) return 'coti';
  if (rawName.includes('venom')) return 'venom';
  if (rawName.includes('xrp')) return 'xrpl';
  return rawName;
};

export function applyManifestOverrides(rawManifest: any): any {
  if (!rawManifest || typeof rawManifest !== 'object') {
    return rawManifest;
  }

  const manifest = JSON.parse(JSON.stringify(rawManifest));
  const chainKey = resolveChainKey(manifest);

  if (manifest.priceProvider && ENDPOINTS.coingecko) {
    manifest.priceProvider.url = ENDPOINTS.coingecko;
  }

  if (chainKey && ENDPOINTS.rpc[chainKey]) {
    const customRpc = ENDPOINTS.rpc[chainKey]!;
    if ('rpcUrl' in manifest) {
      manifest.rpcUrl = customRpc;
    } else if ('apiBaseUrl' in manifest) {
      manifest.apiBaseUrl = customRpc;
    }
  }

  if (chainKey && ENDPOINTS.rpcWs[chainKey] && 'rpcWsUrl' in manifest) {
    manifest.rpcWsUrl = ENDPOINTS.rpcWs[chainKey]!;
  }

  if (chainKey && ENDPOINTS.scanner[chainKey]) {
    const customScanner = ENDPOINTS.scanner[chainKey]!;
    if ('scannerApiUrl' in manifest) {
      manifest.scannerApiUrl = customScanner;
    } else if ('scannerApiHost' in manifest) {
      manifest.scannerApiHost = customScanner;
    }
  }

  return manifest;
}

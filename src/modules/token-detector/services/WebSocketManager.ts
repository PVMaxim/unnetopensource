import { RPC_NAMES } from '@/api/constants-types';
import { getManager } from '@/api/ApiHandler';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

export interface WSMessageCallback {
  (chain: string, data: any): void;
}

export const WORKER_WS_BASE_URL = 'wss://rpcpush.proxy.united.network/ws';
export const BACKUP_SOLANA_WS_URL = 'wss://solana-websocket.worker.united.network';

const PUBLIC_EVM_WS_ENDPOINTS: Record<string, string[]> = {
  [RPC_NAMES.ETH]: ['wss://ethereum-rpc.publicnode.com'],
  [RPC_NAMES.BSC]: ['wss://bsc-rpc.publicnode.com'],
  [RPC_NAMES.POLYGON]: ['wss://polygon-bor-rpc.publicnode.com'],
  [RPC_NAMES.ARBITRUM]: ['wss://arbitrum-one-rpc.publicnode.com'],
  [RPC_NAMES.BASE]: ['wss://base-rpc.publicnode.com'],
  [RPC_NAMES.AVALANCHE]: ['wss://avalanche-c-chain-rpc.publicnode.com'],
};

const DEFAULT_WORKER_SECRET = '02130d0ab77a3f0c7f362fd7570024ca68fed1be6bc4390dd1c63ec2d0598a4f6ee220cfedff2f368aef7350e2054d1bc345eee12643ca6594074199c05e9ebe95c7cc?v2';

const getWorkerSecret = (): string => {
  try {
    if (typeof WORKER_SHARED_SECRET !== 'undefined' && WORKER_SHARED_SECRET) {
      return WORKER_SHARED_SECRET;
    }
  } catch (e) {
    // ignore
  }
  return import.meta.env?.VITE_WS_WORKER_SECRET || DEFAULT_WORKER_SECRET;
};

export const WS_WORKER_SECRET = getWorkerSecret();

const MAX_RECONNECT_ATTEMPTS = 5;

// Popular Solana token mints to monitor
const DEFAULT_SOLANA_MINTS = [
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
];

function getSolanaAddressesToWatch(ownerAddress: string): string[] {
  const addresses: string[] = [ownerAddress];
  try {
    const ownerPubkey = new PublicKey(ownerAddress);
    const mintSet = new Set<string>(DEFAULT_SOLANA_MINTS);

    try {
      const mgr = getManager(RPC_NAMES.SOLANA);
      const tokens = mgr?.getTokens ? mgr.getTokens() : [];
      tokens.forEach((t: any) => {
        if (t?.id && typeof t.id === 'string' && t.id.length > 30) {
          mintSet.add(t.id);
        }
      });
    } catch (e) {
      // ignore
    }

    mintSet.forEach(mintStr => {
      try {
        const mintPubkey = new PublicKey(mintStr);
        const ata = getAssociatedTokenAddressSync(mintPubkey, ownerPubkey);
        addresses.push(ata.toString());
      } catch (e) {
        // ignore
      }
    });
  } catch (err) {
    // ignore derivation errors
  }
  return Array.from(new Set(addresses));
}

export async function generateWsAuthToken(userAddress: string, secretKey: string): Promise<{ token: string; ts: number }> {
  const ts = Math.floor(Date.now() / 60000); // 1-minute window bucket
  const message = `${ts}:${(userAddress || 'anonymous').toLowerCase()}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { token, ts };
}

export class WebSocketManager {
  private sockets: Map<string, WebSocket> = new Map();
  private callbacks: Set<WSMessageCallback> = new Set();
  private reconnectTimers: Map<string, any> = new Map();
  private pingTimers: Map<string, any> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private endpointIndex: Map<string, number> = new Map();
  private lastActiveAddresses: Map<string, string> = new Map();

  constructor() {
    this.setupMobileWakeupListener();
  }

  private setupMobileWakeupListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.lastActiveAddresses.forEach((address, chain) => {
          const socket = this.sockets.get(chain);
          if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
            this.reconnectAttempts.set(chain, 0);
            this.connect(chain, address);
          }
        });
      }
    });
  }

  public onMessage(callback: WSMessageCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  public async getWsUrlsForChain(chain: string, address: string, overrideUrl?: string): Promise<string[]> {
    if (overrideUrl) return [overrideUrl];

    if (chain === RPC_NAMES.SOLANA) {
      return [`${BACKUP_SOLANA_WS_URL}?addr=${encodeURIComponent(address)}`];
    }

    // Canton and Venom use HTTP JSON-RPC via their managers & workers, not raw browser WebSockets
    if (chain === RPC_NAMES.CANTON_TEST || chain === RPC_NAMES.CANTON_DEV || chain === RPC_NAMES.VENOM) {
      return [];
    }

    const urls: string[] = [];
    if (PUBLIC_EVM_WS_ENDPOINTS[chain]) {
      urls.push(...PUBLIC_EVM_WS_ENDPOINTS[chain]);
    }

    if (WS_WORKER_SECRET) {
      const { token, ts } = await generateWsAuthToken(address, WS_WORKER_SECRET);
      const encodedAddr = encodeURIComponent(address || 'anon');
      urls.push(`${WORKER_WS_BASE_URL}/${encodeURIComponent(chain)}?auth=${token}&ts=${ts}&addr=${encodedAddr}`);
    }

    return urls;
  }

  public async connect(chain: string, address: string, overrideUrl?: string) {
    if (!address) return;
    this.lastActiveAddresses.set(chain, address);

    const wsUrls = await this.getWsUrlsForChain(chain, address, overrideUrl);
    if (!wsUrls || wsUrls.length === 0) return;

    let currentIndex = this.endpointIndex.get(chain) || 0;
    if (currentIndex >= wsUrls.length) {
      currentIndex = 0;
      this.endpointIndex.set(chain, 0);
    }
    const wsUrl = wsUrls[currentIndex];

    this.disconnect(chain, false);

    const attempts = this.reconnectAttempts.get(chain) || 0;
    if (attempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    try {
      const socket = new WebSocket(wsUrl);
      this.sockets.set(chain, socket);

      socket.onopen = () => {
        this.reconnectAttempts.set(chain, 0);

        // Chain-specific subscription frames
        if (chain === RPC_NAMES.SOLANA) {
          const addressesToWatch = getSolanaAddressesToWatch(address);
          addressesToWatch.forEach((addr, idx) => {
            const subPayload = JSON.stringify({
              jsonrpc: '2.0',
              id: idx + 1,
              method: 'accountSubscribe',
              params: [addr, { encoding: 'jsonParsed', commitment: 'confirmed' }]
            });
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(subPayload);
            }
          });
        } else if (chain === RPC_NAMES.XRP) {
          const subPayload = JSON.stringify({
            id: 'xrp-sub',
            command: 'subscribe',
            accounts: [address]
          });
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(subPayload);
          }
        } else if (chain === RPC_NAMES.TON) {
          const frames = [
            JSON.stringify({ operation: 'subscribe_account', accounts: [address] }),
            JSON.stringify({ operation: 'subscribe_account', account: [address] }),
            JSON.stringify({ operation: 'subscribe_account', account: address }),
            JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'subscribe-account', params: [address] }),
            JSON.stringify({ id: 2, jsonrpc: '2.0', method: 'subscribe_account', params: [address] }),
          ];
          if (socket.readyState === WebSocket.OPEN) {
            frames.forEach(frame => {
              try { socket.send(frame); } catch {}
            });
          }
        } else if (chain === RPC_NAMES.BTC) {
          const initPayload = JSON.stringify({ action: 'init' });
          const trackPayload = JSON.stringify({ 'track-address': address });
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(initPayload);
            socket.send(trackPayload);
          }
        } else if (chain === RPC_NAMES.TRON) {
          const subPayload = JSON.stringify({
            event: 'subscribe',
            topic: 'transaction',
            address
          });
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(subPayload);
          }
        } else if (
          chain === RPC_NAMES.ETH ||
          chain === RPC_NAMES.BSC ||
          chain === RPC_NAMES.POLYGON ||
          chain === RPC_NAMES.ARBITRUM ||
          chain === RPC_NAMES.BASE ||
          chain === RPC_NAMES.AVALANCHE ||
          chain === RPC_NAMES.COTI ||
          chain === RPC_NAMES.KATANA
        ) {
          const cleanAddr = address.toLowerCase().replace(/^0x/, '');
          const paddedAddr = '0x' + cleanAddr.padStart(64, '0');
          // Targeted ERC-20 Transfer logs for user address
          const subLogs = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_subscribe',
            params: [
              'logs',
              {
                topics: [
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // ERC-20 Transfer
                  null,
                  paddedAddr // Recipient
                ]
              }
            ]
          });
          // newHeads subscription for native balance tracking
          const subHeads = JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_subscribe',
            params: ['newHeads']
          });
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(subLogs);
            socket.send(subHeads);
          }
        }

        // Heartbeat Ping Timer for chains requiring explicit ping (e.g. XRP / TON)
        if (chain === RPC_NAMES.XRP || chain === RPC_NAMES.TON) {
          const pingTimer = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              try {
                if (chain === RPC_NAMES.XRP) {
                  socket.send(JSON.stringify({ command: 'ping' }));
                } else if (chain === RPC_NAMES.TON) {
                  socket.send(JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'ping', params: [] }));
                }
              } catch (e) {
                // ignore
              }
            }
          }, 25000);
          this.pingTimers.set(chain, pingTimer);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Filter out RPC "Method not found" errors (-32601 / -32600) or null-id error frames
          if (data?.error && (data.id === null || data.error.code === -32601 || data.error.code === -32600)) {
            return;
          }

          // Filter out subscription confirmation numbers/strings without params/events
          if ((typeof data?.result === 'number' || typeof data?.result === 'string') && !data?.params && !data?.method) {
            return;
          }

          // Filter out XRP keep-alive ping responses (role: identified, ip, username)
          if (data?.result?.ip || data?.result?.username || (data?.status === 'success' && data?.type === 'response' && !data?.result?.engine_result)) {
            return;
          }

          const isNewHeads = data?.method === 'eth_subscription' && data?.params?.result?.number && data?.params?.result?.hash;
          if (!isNewHeads) {
            console.log(`[WebSocketManager] 📡 WS Raw Message [${chain}]:`, data);
          }
          this.callbacks.forEach(cb => {
            try {
              cb(chain, data);
            } catch (err) {
              // ignore callback error
            }
          });
        } catch (e) {
          // ignore parsing error
        }
      };

      socket.onerror = () => {
        // Silent error handling to avoid console noise
      };

      socket.onclose = async () => {
        this.cleanupPingTimer(chain);
        this.sockets.delete(chain);

        const currentAttempts = (this.reconnectAttempts.get(chain) || 0) + 1;
        this.reconnectAttempts.set(chain, currentAttempts);
        
        // If we fail a lot, try next endpoint
        if (currentAttempts > 2) {
            const urls = await this.getWsUrlsForChain(chain, address, overrideUrl);
            let idx = this.endpointIndex.get(chain) || 0;
            if (urls.length > 1) {
                idx = (idx + 1) % urls.length;
                this.endpointIndex.set(chain, idx);
                this.reconnectAttempts.set(chain, 0); // Reset attempts for new endpoint
            }
        }

        if (this.reconnectAttempts.get(chain)! <= MAX_RECONNECT_ATTEMPTS) {
          const backoff = Math.min(30000, 2000 * Math.pow(1.5, this.reconnectAttempts.get(chain)!));
          const timer = setTimeout(() => {
            this.connect(chain, address);
          }, backoff);
          this.reconnectTimers.set(chain, timer);
        }
      };
    } catch (err) {
      // ignore
    }
  }

  private cleanupPingTimer(chain: string) {
    if (this.pingTimers.has(chain)) {
      clearInterval(this.pingTimers.get(chain));
      this.pingTimers.delete(chain);
    }
  }

  public disconnect(chain: string, resetAttempts = true) {
    this.cleanupPingTimer(chain);

    if (this.reconnectTimers.has(chain)) {
      clearTimeout(this.reconnectTimers.get(chain));
      this.reconnectTimers.delete(chain);
    }

    if (resetAttempts) {
      this.reconnectAttempts.delete(chain);
      this.endpointIndex.delete(chain);
    }

    const socket = this.sockets.get(chain);
    if (socket) {
      try {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      } catch (e) {
        // ignore
      }
      this.sockets.delete(chain);
    }
  }

  public disconnectAll() {
    this.sockets.forEach((_, chain) => this.disconnect(chain, true));
    this.sockets.clear();
    this.reconnectTimers.forEach(t => clearTimeout(t));
    this.reconnectTimers.clear();
    this.pingTimers.forEach(t => clearInterval(t));
    this.pingTimers.clear();
    this.reconnectAttempts.clear();
  }
}

export const wsManager = new WebSocketManager();

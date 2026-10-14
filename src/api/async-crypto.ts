/**
 * Async Crypto Helper interfacing with Web Worker.
 * Offloads heavy tasks with main-thread fallback.
 */

let worker: Worker | null = null;
const pendingCallbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
let messageCounter = 0;

function getWorker(): Worker | null {
  if (typeof window === 'undefined') return null;

  if (!worker && window.Worker) {
    try {
      worker = new Worker(new URL('../workers/crypto-worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent) => {
        const { id, success, result, error } = e.data;
        const cb = pendingCallbacks.get(id);
        if (cb) {
          pendingCallbacks.delete(id);
          if (success) {
            cb.resolve(result);
          } else {
            cb.reject(new Error(error));
          }
        }
      };
    } catch {
      worker = null;
    }
  }
  return worker;
}

export async function deriveBitsAsync(password: string, salt: string, iterations = 100000, length = 32): Promise<string> {
  const w = getWorker();
  if (!w) {
    // Sync WebCrypto fallback
    const enc = new TextEncoder();
    const webCrypto = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
    const keyMaterial = await webCrypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const bits = await webCrypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
      keyMaterial,
      length * 8
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const id = `msg_${++messageCounter}_${Date.now()}`;
  return new Promise((resolve, reject) => {
    pendingCallbacks.set(id, { resolve, reject });
    w.postMessage({ id, type: 'PBKDF2_DERIVE', payload: { password, salt, iterations, length } });
  });
}

export async function encryptDataAsync(data: string, derivedKeyHex: string): Promise<string | undefined> {
  if (!data) return undefined;
  const w = getWorker();
  if (!w) return undefined;

  const id = `msg_${++messageCounter}_${Date.now()}`;
  return new Promise((resolve, reject) => {
    pendingCallbacks.set(id, { resolve, reject });
    w.postMessage({ id, type: 'AES_GCM_ENCRYPT', payload: { data, derivedKeyHex } });
  }).catch(() => undefined) as Promise<string | undefined>;
}

export async function decryptDataAsync(data: string, derivedKeyHex: string): Promise<string | undefined> {
  if (!data || !data.startsWith('gcm:v2:')) return undefined;
  const w = getWorker();
  if (!w) return undefined;

  const id = `msg_${++messageCounter}_${Date.now()}`;
  return new Promise((resolve, reject) => {
    pendingCallbacks.set(id, { resolve, reject });
    w.postMessage({ id, type: 'AES_GCM_DECRYPT', payload: { data, derivedKeyHex } });
  }).catch(() => undefined) as Promise<string | undefined>;
}

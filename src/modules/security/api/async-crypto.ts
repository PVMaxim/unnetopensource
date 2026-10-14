/**
 * Async Crypto Helper interfacing with Web Worker.
 * Offloads heavy tasks with main-thread fallback.
 */

import { SECURITY_CONFIG } from './security-config';

let worker: Worker | null = null;
const pendingCallbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
let messageCounter = 0;

function getWorker(): Worker | null {
  if (typeof window === 'undefined') return null;
  if (!SECURITY_CONFIG.asyncCryptoWorker) return null;

  if (!worker && window.Worker) {
    try {
      worker = new Worker(new URL('../../../workers/crypto-worker.ts', import.meta.url), { type: 'module' });
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

function postToWorker<T>(type: string, payload: any): Promise<T> {
  const w = getWorker();
  if (!w) {
    return Promise.reject(new Error('Worker unavailable'));
  }
  const id = `msg_${++messageCounter}_${Date.now()}`;
  return new Promise((resolve, reject) => {
    pendingCallbacks.set(id, { resolve, reject });
    w.postMessage({ id, type, payload });
  });
}

export async function deriveBitsAsync(password: string, salt: string, iterations = 100000, length = 32): Promise<string> {
  try {
    return await postToWorker<string>('PBKDF2_DERIVE', { password, salt, iterations, length });
  } catch {
    // Fallback to main thread Web Crypto API
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
}

export async function digestSha256Async(data: string | ArrayBuffer): Promise<string> {
  try {
    return await postToWorker<string>('SHA256_DIGEST', data);
  } catch {
    const enc = new TextEncoder();
    const buffer = typeof data === 'string' ? enc.encode(data) : data;
    const webCrypto = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
    const hashBuffer = await webCrypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export async function encryptGcmAsync(data: string, derivedKeyHex: string): Promise<string> {
  try {
    return await postToWorker<string>('AES_GCM_ENCRYPT', { data, derivedKeyHex });
  } catch {
    const webCrypto = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
    const bytes = new Uint8Array(derivedKeyHex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
    const key = await webCrypto.subtle.importKey(
      'raw',
      bytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    const iv = webCrypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    const ciphertextBuffer = await webCrypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(ciphertextBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `gcm:v2:${ivHex}:${cipherHex}`;
  }
}

export async function decryptGcmAsync(data: string, derivedKeyHex: string): Promise<string> {
  try {
    return await postToWorker<string>('AES_GCM_DECRYPT', { data, derivedKeyHex });
  } catch {
    if (!data.startsWith('gcm:v2:')) {
      throw new Error('Unsupported format');
    }
    const parts = data.split(':');
    const ivHex = parts[2];
    const cipherHex = parts[3];

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)?.map((b: string) => parseInt(b, 16)) || []);
    const ciphertext = new Uint8Array(cipherHex.match(/.{1,2}/g)?.map((b: string) => parseInt(b, 16)) || []);

    const webCrypto = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
    const bytes = new Uint8Array(derivedKeyHex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
    const key = await webCrypto.subtle.importKey(
      'raw',
      bytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    const decryptedBuffer = await webCrypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decryptedBuffer);
  }
}

import { initDB } from './indexeddb-storage';

export const getWebCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto;
};

export function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[a-fA-F0-9]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives ephemeral AES-GCM-256 CryptoKey using HMAC-SHA256 as PRF + HKDF-SHA256.
 * Guaranteed Split-Secret: requires BOTH non-extractable IDB HMAC key AND in-memory sessionStorage secret.
 * The derived AES key is never saved to disk and lives only in RAM for the duration of encrypt/decrypt.
 */
export async function deriveVaultAesKey(
  idbKey: CryptoKey,
  sessionSecret: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array
): Promise<CryptoKey> {
  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    throw new Error('WebCrypto subtle is unavailable');
  }

  // 1. Compute 256-bit PRF IKM via HMAC(idbKey, sessionSecret)
  const ikmBuffer = await cryptoObj.subtle.sign('HMAC', idbKey, sessionSecret);
  const ikmBytes = new Uint8Array(ikmBuffer);

  try {
    // 2. Import raw IKM as HKDF base key material
    const baseKey = await cryptoObj.subtle.importKey(
      'raw',
      ikmBytes,
      'HKDF',
      false,
      ['deriveKey']
    );

    // 3. Derive 256-bit AES-GCM key with per-record salt and domain separation info
    const aesKey = await cryptoObj.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info,
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false, // Strictly non-extractable: cannot be exported via JS API
      ['encrypt', 'decrypt']
    );

    return aesKey;
  } finally {
    // Best-effort memory zeroization of intermediate IKM
    ikmBytes.fill(0);
  }
}

/**
 * Generates a non-extractable HMAC-SHA-256 CryptoKey for storage in IndexedDB KeyStore.
 */
export async function generateVaultHmacKey(): Promise<CryptoKey> {
  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    throw new Error('WebCrypto subtle is unavailable');
  }
  return cryptoObj.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false, // Non-extractable: raw key bytes cannot be extracted by JS
    ['sign']
  );
}

/**
 * Retrieves a CryptoKey from IndexedDB KeyStore.
 */
export async function idbKeyStoreGet(keyId: string): Promise<CryptoKey | undefined> {
  const db = await initDB();
  return new Promise<CryptoKey | undefined>((resolve) => {
    try {
      const tx = db.transaction('KeyStore', 'readonly');
      const store = tx.objectStore('KeyStore');
      const req = store.get(keyId);
      req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

/**
 * Detects storage quota errors, commonly triggered in Safari Private Browsing mode.
 */
export function isQuotaOrPrivateBrowsingError(err: unknown): boolean {
  if (!err) return false;
  const errorObj = err as { name?: string; message?: string; code?: number };
  const name = errorObj.name || '';
  const message = errorObj.message || '';
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    message.includes('quota') ||
    message.includes('QuotaExceeded') ||
    errorObj.code === 22
  );
}

/**
 * Stores a CryptoKey in IndexedDB KeyStore.
 */
export async function idbKeyStorePut(keyId: string, key: CryptoKey): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction('KeyStore', 'readwrite');
      const store = tx.objectStore('KeyStore');
      const req = store.put(key, keyId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to put key in KeyStore'));
      tx.onerror = () => reject(tx.error || new Error('KeyStore transaction error'));
      tx.onabort = () => reject(tx.error || new Error('KeyStore transaction aborted'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes a CryptoKey from IndexedDB KeyStore.
 */
export async function idbKeyStoreDelete(keyId: string): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction('KeyStore', 'readwrite');
      const store = tx.objectStore('KeyStore');
      const req = store.delete(keyId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Retrieves an encrypted record from IndexedDB EncryptedStore.
 */
export async function idbEncryptedStoreGet<T>(storeKey: string): Promise<T | undefined> {
  const db = await initDB();
  return new Promise<T | undefined>((resolve, reject) => {
    try {
      const tx = db.transaction('EncryptedStore', 'readonly');
      const store = tx.objectStore('EncryptedStore');
      const req = store.get(storeKey);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  }).catch(() => undefined);
}

/**
 * Stores an encrypted record in IndexedDB EncryptedStore.
 */
export async function idbEncryptedStorePut<T>(storeKey: string, record: T): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction('EncryptedStore', 'readwrite');
      const store = tx.objectStore('EncryptedStore');
      const req = store.put(record, storeKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to put record in EncryptedStore'));
      tx.onerror = () => reject(tx.error || new Error('EncryptedStore transaction error'));
      tx.onabort = () => reject(tx.error || new Error('EncryptedStore transaction aborted'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes an encrypted record from IndexedDB EncryptedStore.
 */
export async function idbEncryptedStoreDelete(storeKey: string): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction('EncryptedStore', 'readwrite');
      const store = tx.objectStore('EncryptedStore');
      const req = store.delete(storeKey);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}


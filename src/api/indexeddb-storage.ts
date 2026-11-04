import { IndexedDBWriteManager } from '../utils/indexeddb-write-manager';
import { STORAGE_KEYS, DYNAMIC_KEYS } from './storage-keys';

const DB_NAME = 'UnitedNetworkDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('KeyStore')) {
            db.createObjectStore('KeyStore');
          }
          if (!db.objectStoreNames.contains('EncryptedStore')) {
            db.createObjectStore('EncryptedStore');
          }
        };

        request.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
          dbPromise = null;
          reject((event.target as IDBOpenDBRequest).error);
        };
      } catch (e) {
        dbPromise = null;
        reject(e);
      }
    });
  }
  return dbPromise;
};

function idbOp<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = executor(store);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

let encryptionKeyPromise: Promise<CryptoKey> | null = null;

export const getEncryptionKey = async (): Promise<CryptoKey> => {
  if (encryptionKeyPromise) return encryptionKeyPromise;

  encryptionKeyPromise = (async () => {
    const db = await initDB();

    const existing = await idbOp<CryptoKey | undefined>(
      db,
      'KeyStore',
      'readonly',
      (store) => store.get('masterKey'),
    );
    if (existing) return existing;

    const cryptoObj = getWebCrypto();
    const newKey = await cryptoObj.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    await idbOp<void>(
      db,
      'KeyStore',
      'readwrite',
      (store) => store.put(newKey, 'masterKey'),
    );

    return newKey;
  })().catch((err) => {
    encryptionKeyPromise = null;
    throw err;
  });

  return encryptionKeyPromise;
};

export const getWebCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto;
};

export interface EncryptedPayload {
  v?: number;
  kid?: string;
  iv?: number[];
  data: ArrayBuffer | string;
}

export function extractCardPrefix(storageKey?: string): string | null {
  if (!storageKey || typeof storageKey !== 'string') return null;
  const dotIdx = storageKey.indexOf('.');
  if (dotIdx >= 4 && dotIdx <= 32) {
    const prefix = storageKey.slice(0, dotIdx);
    if (/^[a-fA-F0-9]+$/.test(prefix)) {
      return prefix.toLowerCase();
    }
  }
  return null;
}

export function resolveKeyStoreId(storageKey?: string): string {
  const prefix = extractCardPrefix(storageKey);
  return prefix ? `cardKey:${prefix}` : 'masterKey';
}

function normalizeUint8Array(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (Array.isArray(input)) {
    return new Uint8Array(input);
  }
  return new Uint8Array(Array.from(input as ArrayLike<number>));
}

export const encryptStringDB = async (
  data: string,
  _storageKey?: string,
): Promise<EncryptedPayload> => {
  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    throw new Error('WebCrypto subtle is not available in this environment');
  }
  const key = await getEncryptionKey();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  return { iv: Array.from(iv), data: encryptedBuffer };
};

export const decryptStringDB = async (
  encrypted: unknown,
  storageKey?: string,
): Promise<string | null> => {
  if (!encrypted) return null;

  const encObj = encrypted as { v?: number; kid?: string; iv?: unknown; data?: unknown };
  const cryptoObj = getWebCrypto();
  if (cryptoObj?.subtle && encObj.iv && encObj.data) {
    try {
      const key = await getEncryptionKey();
      const ivBuffer = normalizeUint8Array(encObj.iv);
      const dataBuffer = normalizeUint8Array(encObj.data);

      if (encObj.v === 2 && storageKey) {
        const keyId = encObj.kid || 'masterKey';
        const aad = new TextEncoder().encode(`united:idb:v2:${keyId}:${storageKey}`);
        try {
          const decryptedData = await cryptoObj.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBuffer, additionalData: aad },
            key,
            dataBuffer,
          );
          return new TextDecoder().decode(decryptedData);
        } catch {}
      }

      const decryptedData = await cryptoObj.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        key,
        dataBuffer,
      );
      return new TextDecoder().decode(decryptedData);
    } catch {}
  }

  return null;
};

async function rawReadEncryptedDB<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await initDB();
    const encrypted = await idbOp<unknown>(
      db,
      'EncryptedStore',
      'readonly',
      (store) => store.get(key),
    );

    if (encrypted) {
      const decryptedString = await decryptStringDB(encrypted, key);
      if (decryptedString) {
        try {
          return JSON.parse(decryptedString) as T;
        } catch {
          return decryptedString as unknown as T;
        }
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function isCoalescingKey(key: string): boolean {
  if (!key) return false;
  if (
    key === STORAGE_KEYS.TOKEN_BALANCE ||
    key.includes(STORAGE_KEYS.TOKEN_BALANCE) ||
    key === STORAGE_KEYS.TOKENS_DATA ||
    key.includes(STORAGE_KEYS.TOKENS_DATA) ||
    key === STORAGE_KEYS.SELECTED_TOKEN ||
    key.includes(STORAGE_KEYS.SELECTED_TOKEN) ||
    key === STORAGE_KEYS.SWAP_BALANCES ||
    key.includes(STORAGE_KEYS.SWAP_BALANCES) ||
    key.includes('swap-tokens') ||
    key === STORAGE_KEYS.SWAP_HISTORY ||
    key === DYNAMIC_KEYS.TX_NOTIFICATIONS ||
    key.includes(DYNAMIC_KEYS.TX_NOTIFICATIONS) ||
    key.includes(DYNAMIC_KEYS.CUSTOM_TOKEN)
  ) {
    return true;
  }
  return false;
}

async function writeBatchDirect(entries: Array<[string, unknown]>): Promise<void> {
  if (entries.length === 0) return;
  const db = await initDB();
  const encryptedEntries = await Promise.all(
    entries.map(async ([key, val]) => {
      const encrypted = await encryptStringDB(JSON.stringify(val), key);
      return [key, encrypted] as const;
    }),
  );

  await new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction('EncryptedStore', 'readwrite');
      const store = tx.objectStore('EncryptedStore');
      let pendingCount = 0;
      let settled = false;

      const finishSuccess = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      const finishError = (err: unknown) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      for (const [key, enc] of encryptedEntries) {
        if (enc) {
          pendingCount++;
          const req = store.put(enc, key);
          req.onsuccess = () => {
            pendingCount--;
            if (pendingCount === 0) {
              finishSuccess();
            }
          };
          req.onerror = () => finishError(req.error);
        }
      }

      tx.oncomplete = () => finishSuccess();
      tx.onerror = () => finishError(tx.error);
      tx.onabort = () => finishError(tx.error);

      if (pendingCount === 0) {
        finishSuccess();
      }
    } catch (err) {
      reject(err);
    }
  });
}

export const idbWriteManager = new IndexedDBWriteManager({
  debounceDelayMs: 25,
  maxBatchSize: 100,
  writeBatchDirect,
  deleteDirect: async (key: string) => {
    const db = await initDB();
    await idbOp<void>(db, 'EncryptedStore', 'readwrite', (store) => store.delete(key));
  },
});

export async function readEncryptedDB<T>(key: string, fallback: T): Promise<T> {
  const peek = idbWriteManager.peekMemory(key);
  if (peek.has) {
    return peek.value as T;
  }
  return rawReadEncryptedDB(key, fallback);
}

export async function preloadEncryptedDBKeys(_keys: readonly string[]): Promise<void> {}

export async function writeEncryptedDB(
  key: string,
  value: unknown,
  options?: { immediate?: boolean },
): Promise<void> {
  const immediate = options?.immediate ?? !isCoalescingKey(key);
  return idbWriteManager.scheduleWrite(key, value, immediate);
}

export async function writeEncryptedDBImmediate(key: string, value: unknown): Promise<void> {
  return idbWriteManager.scheduleWrite(key, value, true);
}

export async function deleteEncryptedDB(key: string): Promise<void> {
  return idbWriteManager.scheduleDelete(key);
}

export async function flushEncryptedDB(): Promise<void> {
  await idbWriteManager.flush();
}

export async function flushEncryptedDBKey(key: string): Promise<void> {
  await idbWriteManager.flushKey(key);
}

export function hasPendingEncryptedWrite(key: string): boolean {
  return idbWriteManager.hasPendingWrite(key);
}

export function getPendingEncryptedValue<T>(key: string): T | undefined {
  const peek = idbWriteManager.peekMemory(key);
  return peek.has ? (peek.value as T) : undefined;
}

export async function purgeCardStorageByPrefix(cardPrefix: string): Promise<void> {
  if (!cardPrefix || typeof cardPrefix !== 'string') return;
  const normalizedPrefix = cardPrefix.toLowerCase();
  const suffixKeys = Object.values(DYNAMIC_KEYS).map((suffix) => `${normalizedPrefix}.${suffix}`);
  await Promise.all(suffixKeys.map((k) => deleteEncryptedDB(k)));
}

let shutdownHandlersInitialized = false;

export function initStorageShutdownHandlers(): void {
  if (shutdownHandlersInitialized || typeof window === 'undefined') return;
  shutdownHandlersInitialized = true;

  const flushHandler = () => {
    void idbWriteManager.flush();
  };
  window.addEventListener('beforeunload', flushHandler);
  window.addEventListener('pagehide', flushHandler);
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushHandler();
      }
    });
  }
}

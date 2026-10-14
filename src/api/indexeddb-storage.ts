import { encryptData, decryptData, readEncrypted, writeEncrypted, removeEncrypted } from './encrypt-decrypt';

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

const getEncryptionKey = async (): Promise<CryptoKey> => {
  const db = await initDB();

  const existing = await idbOp<CryptoKey | undefined>(
    db, 'KeyStore', 'readonly',
    (store) => store.get('masterKey'),
  );
  if (existing) return existing;

  const newKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, 
    ['encrypt', 'decrypt'],
  );

  await idbOp<void>(
    db, 'KeyStore', 'readwrite',
    (store) => store.put(newKey, 'masterKey'),
  );

  return newKey;
};

const getWebCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto;
};

export const encryptStringDB = async (data: string): Promise<any> => {
  const cryptoObj = getWebCrypto();
  if (cryptoObj?.subtle) {
    try {
      const key = await getEncryptionKey();
      const iv = cryptoObj.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(data);
      const encryptedBuffer = await cryptoObj.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );
      return { iv: Array.from(iv), data: encryptedBuffer };
    } catch {
      /* fallback to encryptData below */
    }
  }
  const encrypted = await encryptData(data);
  if (!encrypted) throw new Error('Encryption failed');
  return { data: encrypted };
};

export const decryptStringDB = async (encrypted: any): Promise<string | null> => {
  if (!encrypted) return null;

  // 1. Direct string format or { data: string } format
  if (typeof encrypted === 'string' && encrypted.length > 0) {
    return (await decryptData(encrypted)) || null;
  }
  if (typeof encrypted?.data === 'string' && encrypted.data.length > 0) {
    return (await decryptData(encrypted.data)) || null;
  }

  // 2. Binary AES-GCM format { iv, data }
  const cryptoObj = getWebCrypto();
  if (cryptoObj?.subtle && encrypted.iv && encrypted.data) {
    try {
      const key = await getEncryptionKey();
      let ivBuffer: Uint8Array;
      if (encrypted.iv instanceof Uint8Array) {
        ivBuffer = encrypted.iv;
      } else if (Array.isArray(encrypted.iv)) {
        ivBuffer = new Uint8Array(encrypted.iv);
      } else {
        ivBuffer = new Uint8Array(Array.from(encrypted.iv as ArrayLike<number>));
      }

      let dataBuffer: ArrayBuffer;
      if (encrypted.data instanceof ArrayBuffer) {
        dataBuffer = encrypted.data;
      } else if (ArrayBuffer.isView(encrypted.data)) {
        dataBuffer = encrypted.data.buffer.slice(
          encrypted.data.byteOffset,
          encrypted.data.byteOffset + encrypted.data.byteLength
        );
      } else if (Array.isArray(encrypted.data)) {
        dataBuffer = new Uint8Array(encrypted.data).buffer;
      } else {
        dataBuffer = new Uint8Array(Array.from(encrypted.data as ArrayLike<number>)).buffer;
      }

      const decryptedData = await cryptoObj.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        key,
        dataBuffer,
      );
      return new TextDecoder().decode(decryptedData);
    } catch {
      /* AES-GCM decryption failed */
    }
  }

  return null;
};

export async function readEncryptedDB<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await initDB();
    const encrypted = await idbOp<any>(
      db, 'EncryptedStore', 'readonly',
      (store) => store.get(key),
    );

    if (encrypted) {
      const decryptedString = await decryptStringDB(encrypted);
      if (decryptedString !== null && decryptedString !== undefined) {
        try {
          return JSON.parse(decryptedString) as T;
        } catch {
          return decryptedString as unknown as T;
        }
      }
    }

    // Fallback to localStorage if not yet in IndexedDB
    let localVal: T | undefined = await readEncrypted<T>(key, undefined as unknown as T);
    if (localVal === undefined) {
      localVal = await readLegacyEncrypted<T>(key, undefined as unknown as T);
    }
    if (localVal === undefined && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw && raw !== 'undefined') {
        try {
          localVal = JSON.parse(raw) as T;
        } catch {
          localVal = raw as unknown as T;
        }
      }
    }

    if (localVal !== undefined && localVal !== null) {
      // Auto-populate IndexedDB for future instant loads
      await writeEncryptedDB(key, localVal);
      // Clean up localStorage
      removeEncrypted(key);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return localVal;
    }
    return fallback;
  } catch {
    return await readEncrypted<T>(key, fallback);
  }
}

export async function writeEncryptedDB(key: string, value: unknown): Promise<void> {
  try {
    const db = await initDB();
    const encrypted = await encryptStringDB(JSON.stringify(value));
    if (encrypted) {
      await idbOp<void>(
        db, 'EncryptedStore', 'readwrite',
        (store) => store.put(encrypted, key),
      );
    }
    // Delete from localStorage upon successful write to IndexedDB
    removeEncrypted(key);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    await writeEncrypted(key, value);
  }
}

export async function deleteEncryptedDB(key: string): Promise<void> {
  try {
    const db = await initDB();
    await idbOp<void>(
      db, 'EncryptedStore', 'readwrite',
      (store) => store.delete(key),
    );
  } catch {
  } finally {
    removeEncrypted(key);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}

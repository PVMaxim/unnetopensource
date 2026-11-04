import { initDB } from './indexeddb-storage';

export const PIN_SESSION_STORE_KEY = 'k9XqT2mW8bVn';
export const PIN_SESSION_KEY_NAME = 'qL7mP4vZ9rKd';
export const PIN_SESSION_INSTANCE_ID = 'vB3wN8tX1jQm';
export const PIN_SESSION_IDB_KEY_ID = 'mK5rY9tP2nLw';
export const DEFAULT_PIN_TTL_MS = 15 * 60 * 1000;

export interface PinSessionPayload {
  pin: string;
  date: number;
}

export interface PinSessionRecord {
  v?: number;
  iv: number[];
  data: ArrayBuffer;
  instanceId: string;
}

const getWebCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto;
};

function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[a-fA-F0-9]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function buildPinAadBytes(secretBytes: Uint8Array, instanceId: string): Uint8Array {
  const instanceBytes = new TextEncoder().encode(`:pin:v2:${instanceId}`);
  const combined = new Uint8Array(secretBytes.length + instanceBytes.length);
  combined.set(secretBytes, 0);
  combined.set(instanceBytes, secretBytes.length);
  return combined;
}

export function getOrCreatePinInstanceId(): string {
  if (typeof sessionStorage === 'undefined') {
    return 'non-browser-env';
  }
  let id = sessionStorage.getItem(PIN_SESSION_INSTANCE_ID);
  if (!id) {
    const cryptoObj = getWebCrypto();
    if (cryptoObj?.randomUUID) {
      id = cryptoObj.randomUUID();
    } else {
      const randBytes = cryptoObj.getRandomValues(new Uint8Array(16));
      id = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    sessionStorage.setItem(PIN_SESSION_INSTANCE_ID, id);
  }
  return id;
}

export async function savePinSession(pin: string, ttlMs: number = DEFAULT_PIN_TTL_MS): Promise<void> {
  if (!pin || typeof pin !== 'string') {
    throw new Error('Invalid PIN: must be a non-empty string');
  }

  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    throw new Error('WebCrypto subtle is not available in this environment');
  }

  const instanceId = getOrCreatePinInstanceId();

  const ephemeralKey = await cryptoObj.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const sessionSecretBytes = cryptoObj.getRandomValues(new Uint8Array(32));
  const sessionTokenHex = Array.from(sessionSecretBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(PIN_SESSION_KEY_NAME, sessionTokenHex);
  }

  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const payload: PinSessionPayload = {
    pin,
    date: Date.now() + ttlMs,
  };

  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const additionalData = buildPinAadBytes(sessionSecretBytes, instanceId);

  const ciphertext = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData },
    ephemeralKey,
    encoded
  );
  const version = 2;

  const db = await initDB();

  await new Promise<void>((resolve) => {
    try {
      const keyTx = db.transaction('KeyStore', 'readwrite');
      const keyStore = keyTx.objectStore('KeyStore');
      const req = keyStore.put(ephemeralKey, PIN_SESSION_IDB_KEY_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction('EncryptedStore', 'readwrite');
      const store = tx.objectStore('EncryptedStore');
      const record: PinSessionRecord = {
        v: version,
        iv: Array.from(iv),
        data: ciphertext,
        instanceId,
      };
      const req = store.put(record, PIN_SESSION_STORE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getPinSession(): Promise<PinSessionPayload | null> {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const sessionTokenHex = sessionStorage.getItem(PIN_SESSION_KEY_NAME);
  const currentInstanceId = sessionStorage.getItem(PIN_SESSION_INSTANCE_ID);

  if (!sessionTokenHex || !currentInstanceId) {
    return null;
  }

  let db: IDBDatabase;
  try {
    db = await initDB();
  } catch {
    return null;
  }

  const record = await new Promise<PinSessionRecord | undefined>((resolve, reject) => {
    try {
      const tx = db.transaction('EncryptedStore', 'readonly');
      const store = tx.objectStore('EncryptedStore');
      const req = store.get(PIN_SESSION_STORE_KEY);
      req.onsuccess = () => resolve(req.result as PinSessionRecord | undefined);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  }).catch(() => undefined);

  if (!record || record.instanceId !== currentInstanceId) {
    return null;
  }

  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    return null;
  }

  try {
    const secretBytes = hexToBytes(sessionTokenHex);
    if (!secretBytes) return null;

    const storedKey = await new Promise<CryptoKey | undefined>((resolve) => {
      try {
        const keyTx = db.transaction('KeyStore', 'readonly');
        const keyStore = keyTx.objectStore('KeyStore');
        const req = keyStore.get(PIN_SESSION_IDB_KEY_ID);
        req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });

    if (!storedKey) {
      return null;
    }

    const additionalData = buildPinAadBytes(secretBytes, currentInstanceId);
    const decrypted = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(record.iv), additionalData },
      storedKey,
      record.data
    );

    const parsed: PinSessionPayload = JSON.parse(new TextDecoder().decode(decrypted));

    if (!parsed.date || parsed.date <= Date.now()) {
      await purgePinSession();
      return null;
    }

    if (typeof parsed.pin === 'string' && parsed.pin.length >= 4) {
      return parsed;
    }

    return null;
  } catch {
    await purgePinSession();
    return null;
  }
}

export async function purgePinSession(): Promise<void> {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(PIN_SESSION_KEY_NAME);
      sessionStorage.removeItem(PIN_SESSION_INSTANCE_ID);
    } catch {}
  }

  try {
    const db = await initDB();
    await new Promise<void>((resolve) => {
      try {
        const keyTx = db.transaction('KeyStore', 'readwrite');
        const keyStore = keyTx.objectStore('KeyStore');
        const req = keyStore.delete(PIN_SESSION_IDB_KEY_ID);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction('EncryptedStore', 'readwrite');
        const store = tx.objectStore('EncryptedStore');
        const req = store.delete(PIN_SESSION_STORE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {}
}


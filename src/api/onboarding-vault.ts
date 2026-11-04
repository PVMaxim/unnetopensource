import { initDB } from './indexeddb-storage';

export const ONBOARDING_STORE_KEY = 'zP4nL8wQ2tVb';
export const SESSION_KEY_NAME = 'wX9rM3kP7tNb';
export const SESSION_INSTANCE_ID = 'jR2tN5vW8kLm';
export const ONBOARDING_IDB_KEY_ID = 'bL6mP9vX1tQz';
export const ONBOARDING_TTL_MS = 15 * 60 * 1000;

export interface OnboardingPayload {
  words: string[];
  createdAt: number;
}

export interface OnboardingRecord {
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

function buildOnboardingAadBytes(secretBytes: Uint8Array, instanceId: string): Uint8Array {
  const instanceBytes = new TextEncoder().encode(`:seed:v2:${instanceId}`);
  const combined = new Uint8Array(secretBytes.length + instanceBytes.length);
  combined.set(secretBytes, 0);
  combined.set(instanceBytes, secretBytes.length);
  return combined;
}

export function getOrCreateInstanceId(): string {
  if (typeof sessionStorage === 'undefined') {
    return 'non-browser-env';
  }
  let id = sessionStorage.getItem(SESSION_INSTANCE_ID);
  if (!id) {
    const cryptoObj = getWebCrypto();
    if (cryptoObj?.randomUUID) {
      id = cryptoObj.randomUUID();
    } else {
      const randBytes = cryptoObj.getRandomValues(new Uint8Array(16));
      id = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    sessionStorage.setItem(SESSION_INSTANCE_ID, id);
  }
  return id;
}

export async function saveOnboardingSecret(words: string[]): Promise<void> {
  if (!Array.isArray(words) || words.length === 0) {
    throw new Error('Invalid seed words array');
  }

  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    throw new Error('WebCrypto subtle is not available in this environment');
  }

  const instanceId = getOrCreateInstanceId();

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
    sessionStorage.setItem(SESSION_KEY_NAME, sessionTokenHex);
  }

  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const payload: OnboardingPayload = {
    words,
    createdAt: Date.now(),
  };

  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const additionalData = buildOnboardingAadBytes(sessionSecretBytes, instanceId);

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
      const req = keyStore.put(ephemeralKey, ONBOARDING_IDB_KEY_ID);
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
      const record: OnboardingRecord = {
        v: version,
        iv: Array.from(iv),
        data: ciphertext,
        instanceId,
      };
      const req = store.put(record, ONBOARDING_STORE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function restoreOnboardingSecret(): Promise<string[] | null> {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const sessionTokenHex = sessionStorage.getItem(SESSION_KEY_NAME);
  const currentInstanceId = sessionStorage.getItem(SESSION_INSTANCE_ID);

  if (!sessionTokenHex || !currentInstanceId) {
    return null;
  }

  let db: IDBDatabase;
  try {
    db = await initDB();
  } catch {
    return null;
  }

  const record = await new Promise<OnboardingRecord | undefined>((resolve, reject) => {
    try {
      const tx = db.transaction('EncryptedStore', 'readonly');
      const store = tx.objectStore('EncryptedStore');
      const req = store.get(ONBOARDING_STORE_KEY);
      req.onsuccess = () => resolve(req.result as OnboardingRecord | undefined);
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
        const req = keyStore.get(ONBOARDING_IDB_KEY_ID);
        req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });

    if (!storedKey) {
      return null;
    }

    const additionalData = buildOnboardingAadBytes(secretBytes, currentInstanceId);
    const decrypted = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(record.iv), additionalData },
      storedKey,
      record.data
    );

    const parsed: OnboardingPayload = JSON.parse(new TextDecoder().decode(decrypted));

    if (Date.now() - parsed.createdAt > ONBOARDING_TTL_MS) {
      await purgeAllSeedTraces();
      return null;
    }

    if (Array.isArray(parsed.words) && parsed.words.length === 12) {
      return parsed.words;
    }

    return null;
  } catch {
    await purgeAllSeedTraces();
    return null;
  }
}

export async function purgeAllSeedTraces(): Promise<void> {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_KEY_NAME);
      sessionStorage.removeItem(SESSION_INSTANCE_ID);
    } catch {}
  }

  try {
    const db = await initDB();
    await new Promise<void>((resolve) => {
      try {
        const keyTx = db.transaction('KeyStore', 'readwrite');
        const keyStore = keyTx.objectStore('KeyStore');
        const req = keyStore.delete(ONBOARDING_IDB_KEY_ID);
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
        const req = store.delete(ONBOARDING_STORE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {}

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText('');
    } catch {}
  }
}


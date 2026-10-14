
import { z } from 'zod';
const hexToBuffer = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const getWebCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto;
};

let cryptoKey: CryptoKey | null = null;
let legacyCryptoKey: CryptoKey | null = null;

const getCryptoKey = async (): Promise<CryptoKey> => {
  if (!cryptoKey) {
    cryptoKey = await getWebCrypto().subtle.importKey(
      'raw',
      hexToBuffer(UNITED_CARDS_DERIVED_KEY),
      { name: 'AES-CBC' },
      false, 
      ['encrypt', 'decrypt']
    );
  }
  return cryptoKey;
};

const getLegacyCryptoKey = async (): Promise<CryptoKey> => {
  if (!legacyCryptoKey) {
    legacyCryptoKey = await getWebCrypto().subtle.importKey(
      'raw',
      hexToBuffer(UNITED_CARDS_LEGACY_DERIVED_KEY),
      { name: 'AES-CBC' },
      false, 
      ['encrypt', 'decrypt']
    );
  }
  return legacyCryptoKey;
};

export const encryptData = async (data: string): Promise<string | undefined> => {
  if (!data) return undefined;
  try {
    const key = await getCryptoKey();
    const iv = getWebCrypto().getRandomValues(new Uint8Array(16));
    const encodedData = new TextEncoder().encode(data);
    
    const ciphertextBuffer = await getWebCrypto().subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      encodedData
    );
    
    return `${bufferToHex(iv.buffer)}:${bufferToHex(ciphertextBuffer)}`;
  } catch (err) {
    return undefined;
  }
};

export const decryptData = async (data: string | null): Promise<string | undefined> => {
  if (!data) return undefined;
  try {
    const key = await getCryptoKey();
    let iv: Uint8Array;
    let ciphertext: Uint8Array;

    if (data.includes(':')) {
      const parts = data.split(':');
      iv = hexToBuffer(parts[0]);
      ciphertext = hexToBuffer(parts[1]);
    } else {
      iv = new TextEncoder().encode(UNITED_CARDS_IV_KEY);
      ciphertext = hexToBuffer(data);
    }

    const decryptedBuffer = await getWebCrypto().subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    return undefined; 
  }
};

export const decryptDataLegacy = async (data: string | null): Promise<string | undefined> => {
  if (!data) return undefined;
  try {
    const key = await getLegacyCryptoKey();
    const iv = new TextEncoder().encode(UNITED_CARDS_IV_KEY);
    const ciphertext = hexToBuffer(data);

    const decryptedBuffer = await getWebCrypto().subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    return undefined;
  }
};

export async function readEncrypted<T>(key: string, fallback: T, schema?: z.ZodType<T>): Promise<T> {
  const raw = localStorage.getItem(key);
  if (!raw || raw === 'undefined') return fallback;
  try {
    const decrypted = await decryptData(raw);
    if (decrypted) {
      const parsed = JSON.parse(decrypted);
      const validated = schema ? schema.parse(parsed) : parsed as T;
      if (!raw.includes(':')) {
        await writeEncrypted(key, validated); 
      }
      return validated;
    }

    const decryptedLegacy = await decryptDataLegacy(raw);
    if (decryptedLegacy) {
      const parsed = JSON.parse(decryptedLegacy);
      const validated = schema ? schema.parse(parsed) : parsed as T;
      await writeEncrypted(key, validated); 
      return validated;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export async function readLegacyEncrypted<T>(key: string, fallback: T): Promise<T> {
  const raw = localStorage.getItem(key);
  if (!raw || raw === 'undefined') return fallback;
  try {
    const decrypted = await decryptDataLegacy(raw);
    return decrypted ? JSON.parse(decrypted) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeEncrypted(key: string, value: unknown): Promise<void> {
  const encrypted = await encryptData(JSON.stringify(value));
  if (encrypted) {
    localStorage.setItem(key, encrypted);
  }
}

export function removeEncrypted(key: string): void {
  localStorage.removeItem(key);
}
import { encryptData, decryptData } from './encrypt-decrypt';

export async function getSessionEncrypted<T>(key: string, fallback: T): Promise<T> {
  const raw = sessionStorage.getItem(key);
  if (!raw || raw === 'undefined') return fallback;
  try {
    const decrypted = await decryptData(raw);
    return decrypted ? JSON.parse(decrypted) : fallback;
  } catch {
    return fallback;
  }
}

export async function setSessionEncrypted(key: string, value: unknown): Promise<void> {
  const encrypted = await encryptData(JSON.stringify(value));
  if (encrypted) {
    sessionStorage.setItem(key, encrypted);
  }
}

export function removeSessionEncrypted(key: string): void {
  sessionStorage.removeItem(key);
}

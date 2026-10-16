import { readLegacyEncrypted, readEncrypted, removeEncrypted, encryptData } from './encrypt-decrypt';
import { writeEncryptedDB, readEncryptedDB } from './indexeddb-storage';
import { MIGRATABLE_KEYS, STORAGE_KEYS, DYNAMIC_KEYS_SUFFIXES } from './storage-keys';

export async function runDataMigration(): Promise<void> {
  for (const key of MIGRATABLE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw && raw !== 'undefined') {
      try {
        const existingInDB = await readEncryptedDB(key, undefined);
        if (existingInDB === undefined) {
          let decryptedValue = await readEncrypted<unknown>(key, undefined);
          if (decryptedValue === undefined) {
            decryptedValue = await readLegacyEncrypted<unknown>(key, undefined);
          }
          if (decryptedValue === undefined) {
            try {
              decryptedValue = JSON.parse(raw);
            } catch {
              decryptedValue = raw;
            }
          }
          if (decryptedValue !== undefined && decryptedValue !== null) {
            await writeEncryptedDB(key, decryptedValue);
          }
        }
      } catch (err) {
      } finally {
        removeEncrypted(key);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      }
    }
  }

  const dynamicKeysToMigrate: string[] = [];
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && DYNAMIC_KEYS_SUFFIXES.some(suffix => key.endsWith(suffix))) {
        dynamicKeysToMigrate.push(key);
      }
    }
  }

  for (const key of dynamicKeysToMigrate) {
    const raw = localStorage.getItem(key);
    try {
      const existingInDB = await readEncryptedDB(key, undefined);
      if (existingInDB === undefined) {
        let decryptedValue = await readEncrypted<unknown>(key, undefined);
        if (decryptedValue === undefined && raw) {
          try {
            decryptedValue = JSON.parse(raw);
          } catch {
            decryptedValue = raw;
          }
        }
        if (decryptedValue !== undefined && decryptedValue !== null) {
          await writeEncryptedDB(key, decryptedValue);
        }
      }
    } catch (err) {
    } finally {
      removeEncrypted(key);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    }
  }

  const legacyPinHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
  if (legacyPinHash && legacyPinHash !== 'undefined') {
    try {
      const decryptedPinHash = await readLegacyEncrypted<unknown>(STORAGE_KEYS.PIN_HASH, undefined);
      if (decryptedPinHash !== undefined) {
        const newEncrypted = await encryptData(JSON.stringify(decryptedPinHash));
        if (newEncrypted) {
          sessionStorage.setItem(STORAGE_KEYS.PIN_HASH, newEncrypted);
        }
      }
    } catch (err) {
    } finally {
      removeEncrypted(STORAGE_KEYS.PIN_HASH);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
      }
    }
  }
}

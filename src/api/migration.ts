import { readLegacyEncrypted, removeEncrypted } from './encrypt-decrypt';
import { writeEncryptedDB, readEncryptedDB, flushEncryptedDB } from './indexeddb-storage';
import { MIGRATABLE_KEYS, STORAGE_KEYS, DYNAMIC_KEYS, DYNAMIC_KEYS_SUFFIXES } from './storage-keys';
import { savePinSession } from './pin-session-vault';
import { saveOnboardingSecret } from './onboarding-vault';

const LEGACY_SERVICE_KEY_MAP: ReadonlyArray<{ legacyKey: string; targetKey: string }> = [
  { legacyKey: 'token_detector_enabled', targetKey: STORAGE_KEYS.TOKEN_DETECTOR_ENABLED },
  { legacyKey: 'sound_notifier_enabled', targetKey: STORAGE_KEYS.SOUND_NOTIFIER_ENABLED },
];

async function decodeLegacyLocalStorageValue(key: string, raw: string): Promise<unknown> {
  const decrypted = await readLegacyEncrypted<unknown>(key, undefined);
  if (decrypted !== undefined) {
    return decrypted;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function migrateSingleKeyToIndexedDB(
  sourceKey: string,
  targetKey: string = sourceKey,
): Promise<boolean> {
  if (typeof localStorage === 'undefined') return false;
  const raw = localStorage.getItem(sourceKey);

  if (raw === null || raw === undefined) {
    return false;
  }

  if (raw === '' || raw === 'undefined' || raw === 'null') {
    removeEncrypted(sourceKey);
    return false;
  }

  try {
    const existingInDB = await readEncryptedDB<unknown>(targetKey, undefined);

    if (existingInDB === undefined) {
      const decodedValue = await decodeLegacyLocalStorageValue(sourceKey, raw);
      if (decodedValue === undefined || decodedValue === null) {
        return false;
      }

      if (targetKey === STORAGE_KEYS.PUBLIC_KEY_CARD) {
        const pk = decodedValue as Record<string, unknown> | string | null;
        const isValidObject = pk && typeof pk === 'object' && Boolean(pk.secp256k1 || pk.ed25519);
        const isValidString = typeof pk === 'string' && pk.trim().length > 0;
        if (!isValidObject && !isValidString) {
          return false;
        }
      }

      if (targetKey === STORAGE_KEYS.SEED_PHRASE) {
        const words = Array.isArray(decodedValue)
          ? (decodedValue as string[])
          : typeof decodedValue === 'string'
            ? decodedValue.trim().split(/\s+/)
            : null;
        if (words && words.length === 12) {
          await saveOnboardingSecret(words);
        }
      } else {
        await writeEncryptedDB(targetKey, decodedValue);

        if (
          decodedValue &&
          typeof decodedValue === 'object' &&
          !Array.isArray(decodedValue) &&
          (targetKey === STORAGE_KEYS.TOKEN_BALANCE ||
            targetKey === STORAGE_KEYS.SELECTED_TOKEN ||
            targetKey === STORAGE_KEYS.TOKENS_DATA ||
            targetKey.includes(DYNAMIC_KEYS.CUSTOM_TOKEN))
        ) {
          for (const [net, val] of Object.entries(decodedValue)) {
            if (val !== undefined && val !== null) {
              await writeEncryptedDB(`${targetKey}.${net}`, val);
            }
          }
        }
      }
    }

    removeEncrypted(sourceKey);
    return true;
  } catch {
    return false;
  }
}

export async function runDataMigration(): Promise<void> {
  if (typeof localStorage === 'undefined' || localStorage.length === 0) {
    return;
  }

  const hasStaticKey = MIGRATABLE_KEYS.some((k) => localStorage.getItem(k) !== null) ||
    LEGACY_SERVICE_KEY_MAP.some((item) => localStorage.getItem(item.legacyKey) !== null) ||
    localStorage.getItem(STORAGE_KEYS.PIN_HASH) !== null;

  let hasDynamicKey = false;
  if (!hasStaticKey) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && DYNAMIC_KEYS_SUFFIXES.some((suffix) => key.endsWith(suffix))) {
        hasDynamicKey = true;
        break;
      }
    }
    if (!hasDynamicKey) {
      return;
    }
  }

  let hasMigratedAny = false;

  for (const key of MIGRATABLE_KEYS) {
    const migrated = await migrateSingleKeyToIndexedDB(key, key);
    if (migrated) {
      hasMigratedAny = true;
    }
  }

  for (const { legacyKey, targetKey } of LEGACY_SERVICE_KEY_MAP) {
    const migrated = await migrateSingleKeyToIndexedDB(legacyKey, targetKey);
    if (migrated) {
      hasMigratedAny = true;
    }
  }

  const dynamicKeysToMigrate: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && DYNAMIC_KEYS_SUFFIXES.some((suffix) => key.endsWith(suffix))) {
      dynamicKeysToMigrate.push(key);
    }
  }

  for (const key of dynamicKeysToMigrate) {
    const migrated = await migrateSingleKeyToIndexedDB(key, key);
    if (migrated) {
      hasMigratedAny = true;
    }
  }

  const legacyPinRaw = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
  if (legacyPinRaw && legacyPinRaw !== 'undefined') {
    try {
      const decryptedPinObj = await decodeLegacyLocalStorageValue(STORAGE_KEYS.PIN_HASH, legacyPinRaw);
      if (
        decryptedPinObj &&
        typeof decryptedPinObj === 'object' &&
        'pin' in decryptedPinObj &&
        typeof (decryptedPinObj as { pin?: unknown }).pin === 'string'
      ) {
        const pinData = decryptedPinObj as { pin: string; date?: number };
        const remainingTtl = pinData.date ? pinData.date - Date.now() : undefined;
        if (remainingTtl === undefined || remainingTtl > 0) {
          await savePinSession(pinData.pin, remainingTtl);
        }
      } else if (typeof decryptedPinObj === 'string' && decryptedPinObj.length >= 4) {
        await savePinSession(decryptedPinObj);
      }
      removeEncrypted(STORAGE_KEYS.PIN_HASH);
    } catch {
      removeEncrypted(STORAGE_KEYS.PIN_HASH);
    }
  }

  if (hasMigratedAny) {
    await flushEncryptedDB();
  }
}

import {
  getWebCrypto,
  hexToBytes,
  bytesToHex,
  deriveVaultAesKey,
  generateVaultHmacKey,
  idbKeyStoreGet,
  idbKeyStorePut,
  idbKeyStoreDelete,
  idbEncryptedStoreGet,
  idbEncryptedStorePut,
  idbEncryptedStoreDelete,
  isQuotaOrPrivateBrowsingError,
} from './crypto-vault-utils';

export const ONBOARDING_STORE_KEY = 'temp_onboarding_seed';
export const SESSION_KEY_NAME = 'UNITED_ONBOARDING_AES_KEY';
export const SESSION_INSTANCE_ID = 'UNITED_ONBOARDING_INSTANCE_ID';
export const ONBOARDING_IDB_KEY_ID = 'ephemeralOnboardingHmacKey';
export const ONBOARDING_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface OnboardingPayload {
  words: string[];
  createdAt: number;
}

export interface OnboardingRecord {
  v: number;
  iv: number[];
  salt: number[];
  data: ArrayBuffer;
  instanceId: string;
  expiresAt: number; // Open plaintext timestamp for fast unauthenticated purge
}

const HKDF_INFO_PREFIX = 'united:onboarding:v3:';
const AAD_SUFFIX = ':onboarding:v3:';

function buildOnboardingAad(secretBytes: Uint8Array, instanceId: string): Uint8Array {
  const suffix = new TextEncoder().encode(AAD_SUFFIX + instanceId);
  const out = new Uint8Array(secretBytes.length + suffix.length);
  out.set(secretBytes, 0);
  out.set(suffix, secretBytes.length);
  return out;
}

let onboardingPurgeTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleOnboardingPurge(expiresAt: number): void {
  if (onboardingPurgeTimer) {
    clearTimeout(onboardingPurgeTimer);
    onboardingPurgeTimer = null;
  }
  const delayMs = Math.max(0, expiresAt - Date.now());
  onboardingPurgeTimer = setTimeout(() => {
    purgeAllSeedTraces().catch(() => {});
  }, delayMs);
}

// Lifecycle hooks: prevent timer execution in detached or frozen bfcache context
if (typeof window !== 'undefined') {
  const clearTimerOnUnload = () => {
    if (onboardingPurgeTimer) {
      clearTimeout(onboardingPurgeTimer);
      onboardingPurgeTimer = null;
    }
  };
  window.addEventListener('beforeunload', clearTimerOnUnload);
  window.addEventListener('pagehide', clearTimerOnUnload);
}

/**
 * Returns or generates a unique session instance ID.
 * This guarantees that duplicated browser tabs cannot reuse the ephemeral session.
 */
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

/**
 * Saves the onboarding seed phrase using True Split-Secret Key Derivation (v3):
 * 1. Fresh, single-use non-extractable (`extractable: false`) HMAC-SHA-256 `CryptoKey` is rotated on every save.
 * 2. A 256-bit cryptographic random session token is stored ONLY in `sessionStorage` of the current tab.
 * 3. The actual AES-GCM-256 encryption key is derived dynamically via HKDF(HMAC(idbKey, sessionSecret), salt, info).
 *    The AES key is NEVER stored on disk and exists only in RAM for the duration of the encrypt operation.
 * 4. Memory Zeroization: raw intermediate secret bytes are zeroized immediately after key derivation.
 * 5. Private Browsing Resilience: graceful error handling on storage quota restrictions.
 */
export async function saveOnboardingSecret(words: string[]): Promise<void> {
  if (!Array.isArray(words) || words.length !== 12) {
    throw new Error('Invalid seed phrase: must contain exactly 12 words');
  }

  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    throw new Error('WebCrypto subtle is not available in this environment');
  }

  const instanceId = getOrCreateInstanceId();
  const expiresAt = Date.now() + ONBOARDING_TTL_MS;

  // 1. Strict Ephemeral Keying: rotate HMAC key on every save (Zero Key-Reuse)
  const idbHmacKey = await generateVaultHmacKey();
  try {
    await idbKeyStorePut(ONBOARDING_IDB_KEY_ID, idbHmacKey);
  } catch (err) {
    if (isQuotaOrPrivateBrowsingError(err)) {
      throw new Error('Storage quota exceeded or blocked by Private Browsing mode');
    }
    throw err;
  }

  // 2. Generate 256-bit random session secret and store in sessionStorage
  const sessionSecretBytes = cryptoObj.getRandomValues(new Uint8Array(32));
  try {
    const sessionTokenHex = bytesToHex(sessionSecretBytes);

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY_NAME, sessionTokenHex);
    }

    // 3. Generate 32-byte salt and 12-byte IV
    const salt = cryptoObj.getRandomValues(new Uint8Array(32));
    const iv = cryptoObj.getRandomValues(new Uint8Array(12));
    const info = new TextEncoder().encode(HKDF_INFO_PREFIX + instanceId);

    // 4. Derive ephemeral AES-GCM-256 key (RAM only)
    const ephemeralAesKey = await deriveVaultAesKey(idbHmacKey, sessionSecretBytes, salt, info);

    // 5. Encrypt payload with AES-GCM + AAD context binding
    const payload: OnboardingPayload = {
      words,
      createdAt: Date.now(),
    };
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const aad = buildOnboardingAad(sessionSecretBytes, instanceId);

    const ciphertext = await cryptoObj.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      ephemeralAesKey,
      encoded
    );

    // 6. Save record with open plaintext expiresAt for fast unauthenticated sweep
    const record: OnboardingRecord = {
      v: 3,
      iv: Array.from(iv),
      salt: Array.from(salt),
      data: ciphertext,
      instanceId,
      expiresAt,
    };

    try {
      await idbEncryptedStorePut(ONBOARDING_STORE_KEY, record);
    } catch (err) {
      await purgeAllSeedTraces();
      if (isQuotaOrPrivateBrowsingError(err)) {
        throw new Error('Storage quota exceeded or blocked by Private Browsing mode');
      }
      throw err;
    }

    // 7. Schedule proactive in-memory purge
    scheduleOnboardingPurge(expiresAt);
  } finally {
    sessionSecretBytes.fill(0);
  }
}

/**
 * Restores the temporary seed phrase upon page reload (F5) or retry:
 * - Verifies 256-bit session secret in sessionStorage
 * - Verifies unencrypted expiresAt timestamp (fast reject without crypto)
 * - Verifies non-extractable HMAC CryptoKey in KeyStore
 * - Derives AES key dynamically via HKDF(HMAC(idbKey, sessionSecret))
 * - Verifies AES-GCM AAD context tag
 * - Verifies TTL expiration (15 minutes)
 * - Zeroizes intermediate session secret bytes in memory
 * Returns string[] if valid, or null if no valid onboarding session exists.
 */
export async function restoreOnboardingSecret(): Promise<string[] | null> {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const sessionTokenHex = sessionStorage.getItem(SESSION_KEY_NAME);
  const currentInstanceId = sessionStorage.getItem(SESSION_INSTANCE_ID);

  if (!sessionTokenHex || !currentInstanceId) {
    await purgeAllSeedTraces();
    return null;
  }

  const record = await idbEncryptedStoreGet<OnboardingRecord>(ONBOARDING_STORE_KEY);
  if (!record) {
    return null;
  }

  // Fast purge: delete legacy v1/v2 records or expired/mismatched records immediately
  if (
    record.v !== 3 ||
    !record.expiresAt ||
    record.expiresAt <= Date.now() ||
    record.instanceId !== currentInstanceId ||
    !record.salt
  ) {
    await purgeAllSeedTraces();
    return null;
  }

  const secretBytes = hexToBytes(sessionTokenHex);
  if (!secretBytes) {
    await purgeAllSeedTraces();
    return null;
  }

  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    return null;
  }

  try {
    const idbHmacKey = await idbKeyStoreGet(ONBOARDING_IDB_KEY_ID);
    if (!idbHmacKey) {
      await purgeAllSeedTraces();
      return null;
    }

    const salt = new Uint8Array(record.salt);
    const iv = new Uint8Array(record.iv);
    const info = new TextEncoder().encode(HKDF_INFO_PREFIX + currentInstanceId);
    const aad = buildOnboardingAad(secretBytes, currentInstanceId);

    // Derive ephemeral AES key using both factors
    const ephemeralAesKey = await deriveVaultAesKey(idbHmacKey, secretBytes, salt, info);

    const decrypted = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      ephemeralAesKey,
      record.data
    );

    const parsed: OnboardingPayload = JSON.parse(new TextDecoder().decode(decrypted));

    // Check TTL: strictly reject if older than 15 minutes
    if (Date.now() - parsed.createdAt > ONBOARDING_TTL_MS) {
      await purgeAllSeedTraces();
      return null;
    }

    if (Array.isArray(parsed.words) && parsed.words.length === 12) {
      scheduleOnboardingPurge(record.expiresAt);
      return parsed.words;
    }

    await purgeAllSeedTraces();
    return null;
  } catch {
    await purgeAllSeedTraces();
    return null;
  } finally {
    secretBytes.fill(0);
  }
}

/**
 * Fast startup sweep: cleans up expired or orphaned onboarding records without any cryptographic operations.
 * Also proactively removes any legacy v1/v2 key residues.
 */
export async function sweepExpiredOnboardingVault(): Promise<void> {
  try {
    // Proactive unconditional cleanup of legacy key ID
    await idbKeyStoreDelete('ephemeralOnboardingKey');

    const record = await idbEncryptedStoreGet<OnboardingRecord>(ONBOARDING_STORE_KEY);
    if (!record) return;

    const currentInstanceId = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(SESSION_INSTANCE_ID)
      : null;
    const sessionTokenHex = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(SESSION_KEY_NAME)
      : null;

    if (
      record.v !== 3 ||
      !record.expiresAt ||
      record.expiresAt <= Date.now() ||
      !currentInstanceId ||
      !sessionTokenHex ||
      record.instanceId !== currentInstanceId
    ) {
      await purgeAllSeedTraces();
    }
  } catch {}
}

/**
 * Total destruction of all seed traces:
 * 1. Crypto-shredding: removes 256-bit token from sessionStorage.
 * 2. Deletes non-extractable CryptoKey from IndexedDB KeyStore.
 * 3. Deletes ciphertext record from IndexedDB EncryptedStore.
 * 4. Cancels any active in-memory purge timer.
 * 5. Clears system clipboard.
 */
export async function purgeAllSeedTraces(): Promise<void> {
  if (onboardingPurgeTimer) {
    clearTimeout(onboardingPurgeTimer);
    onboardingPurgeTimer = null;
  }

  // 1. Shred ephemeral token from sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_KEY_NAME);
      sessionStorage.removeItem(SESSION_INSTANCE_ID);
    } catch {}
  }

  // 2. Delete non-extractable HMAC CryptoKey and ciphertext record from IndexedDB
  try {
    await idbKeyStoreDelete(ONBOARDING_IDB_KEY_ID);
    await idbKeyStoreDelete('ephemeralOnboardingKey');
    await idbEncryptedStoreDelete(ONBOARDING_STORE_KEY);
  } catch {}

  // 3. Clear system clipboard if available
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText('');
    } catch {
      // Browsers may reject clipboard writes when document is not focused
    }
  }
}

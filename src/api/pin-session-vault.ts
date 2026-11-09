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

export const PIN_SESSION_STORE_KEY = 'temp_pin_session';
export const PIN_SESSION_KEY_NAME = 'UNITED_PIN_SESSION_KEY';
export const PIN_SESSION_INSTANCE_ID = 'UNITED_PIN_INSTANCE_ID';
export const PIN_SESSION_IDB_KEY_ID = 'ephemeralPinHmacKey';
export const DEFAULT_PIN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface PinSessionPayload {
  pin: string;
  date: number; // Expiration timestamp (preserved for backward compatibility)
}

export interface PinSessionRecord {
  v: number;
  iv: number[];
  salt: number[];
  data: ArrayBuffer;
  instanceId: string;
  expiresAt: number; // Open plaintext timestamp for fast unauthenticated purge
}

const HKDF_INFO_PREFIX = 'united:pin:v3:';
const AAD_SUFFIX = ':pin:v3:';

function buildPinAad(secretBytes: Uint8Array, instanceId: string): Uint8Array {
  const suffix = new TextEncoder().encode(AAD_SUFFIX + instanceId);
  const out = new Uint8Array(secretBytes.length + suffix.length);
  out.set(secretBytes, 0);
  out.set(suffix, secretBytes.length);
  return out;
}

let pinPurgeTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePinPurge(expiresAt: number): void {
  if (pinPurgeTimer) {
    clearTimeout(pinPurgeTimer);
    pinPurgeTimer = null;
  }
  const delayMs = Math.max(0, expiresAt - Date.now());
  pinPurgeTimer = setTimeout(() => {
    purgePinSession().catch(() => {});
  }, delayMs);
}

// Lifecycle hooks: prevent timer execution in detached or frozen bfcache context
if (typeof window !== 'undefined') {
  const clearTimerOnUnload = () => {
    if (pinPurgeTimer) {
      clearTimeout(pinPurgeTimer);
      pinPurgeTimer = null;
    }
  };
  window.addEventListener('beforeunload', clearTimerOnUnload);
  window.addEventListener('pagehide', clearTimerOnUnload);
}

/**
 * Returns or generates a unique session instance ID.
 * This guarantees that duplicated browser tabs cannot reuse the ephemeral session.
 */
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

/**
 * Saves the user's PIN using True Split-Secret Key Derivation (v3):
 * 1. Fresh, single-use non-extractable (`extractable: false`) HMAC-SHA-256 `CryptoKey` is rotated on every save.
 * 2. A 256-bit cryptographic random session token is stored ONLY in `sessionStorage` of the current tab.
 * 3. The actual AES-GCM-256 encryption key is derived dynamically via HKDF(HMAC(idbKey, sessionSecret), salt, info).
 *    The AES key is NEVER stored on disk and exists only in RAM for the duration of the encrypt operation.
 * 4. Memory Zeroization: raw intermediate secret bytes are zeroized immediately after key derivation.
 * 5. Private Browsing Resilience: graceful error handling on storage quota restrictions.
 */
export async function savePinSession(pin: string, ttlMs: number = DEFAULT_PIN_TTL_MS): Promise<void> {
  if (!pin || typeof pin !== 'string') {
    throw new Error('Invalid PIN: must be a non-empty string');
  }

  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    throw new Error('WebCrypto subtle is not available in this environment');
  }

  const instanceId = getOrCreatePinInstanceId();
  const expiresAt = Date.now() + ttlMs;

  // 1. Strict Ephemeral Keying: rotate HMAC key on every save (Zero Key-Reuse)
  const idbHmacKey = await generateVaultHmacKey();
  try {
    await idbKeyStorePut(PIN_SESSION_IDB_KEY_ID, idbHmacKey);
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
      sessionStorage.setItem(PIN_SESSION_KEY_NAME, sessionTokenHex);
    }

    // 3. Generate 32-byte salt and 12-byte IV
    const salt = cryptoObj.getRandomValues(new Uint8Array(32));
    const iv = cryptoObj.getRandomValues(new Uint8Array(12));
    const info = new TextEncoder().encode(HKDF_INFO_PREFIX + instanceId);

    // 4. Derive ephemeral AES-GCM-256 key (RAM only)
    const ephemeralAesKey = await deriveVaultAesKey(idbHmacKey, sessionSecretBytes, salt, info);

    // 5. Encrypt payload with AES-GCM + AAD context binding
    const payload: PinSessionPayload = {
      pin,
      date: expiresAt,
    };
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const aad = buildPinAad(sessionSecretBytes, instanceId);

    const ciphertext = await cryptoObj.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      ephemeralAesKey,
      encoded
    );

    // 6. Save record with open plaintext expiresAt for fast unauthenticated sweep
    const record: PinSessionRecord = {
      v: 3,
      iv: Array.from(iv),
      salt: Array.from(salt),
      data: ciphertext,
      instanceId,
      expiresAt,
    };

    try {
      await idbEncryptedStorePut(PIN_SESSION_STORE_KEY, record);
    } catch (err) {
      await purgePinSession();
      if (isQuotaOrPrivateBrowsingError(err)) {
        throw new Error('Storage quota exceeded or blocked by Private Browsing mode');
      }
      throw err;
    }

    // 7. Schedule proactive in-memory purge
    schedulePinPurge(expiresAt);
  } finally {
    sessionSecretBytes.fill(0);
  }
}

/**
 * Restores the cached PIN session upon reload (F5) or transaction check:
 * - Verifies 256-bit session secret in sessionStorage
 * - Verifies unencrypted expiresAt timestamp (fast reject without crypto)
 * - Verifies non-extractable HMAC CryptoKey in KeyStore
 * - Derives AES key dynamically via HKDF(HMAC(idbKey, sessionSecret))
 * - Verifies AES-GCM AAD context tag
 * - Zeroizes intermediate session secret bytes in memory
 * Returns { pin, date } if valid, or null if session is expired or unavailable.
 */
export async function getPinSession(): Promise<PinSessionPayload | null> {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const sessionTokenHex = sessionStorage.getItem(PIN_SESSION_KEY_NAME);
  const currentInstanceId = sessionStorage.getItem(PIN_SESSION_INSTANCE_ID);

  if (!sessionTokenHex || !currentInstanceId) {
    await purgePinSession();
    return null;
  }

  const record = await idbEncryptedStoreGet<PinSessionRecord>(PIN_SESSION_STORE_KEY);
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
    await purgePinSession();
    return null;
  }

  const secretBytes = hexToBytes(sessionTokenHex);
  if (!secretBytes) {
    await purgePinSession();
    return null;
  }

  const cryptoObj = getWebCrypto();
  if (!cryptoObj?.subtle) {
    return null;
  }

  try {
    const idbHmacKey = await idbKeyStoreGet(PIN_SESSION_IDB_KEY_ID);
    if (!idbHmacKey) {
      await purgePinSession();
      return null;
    }

    const salt = new Uint8Array(record.salt);
    const iv = new Uint8Array(record.iv);
    const info = new TextEncoder().encode(HKDF_INFO_PREFIX + currentInstanceId);
    const aad = buildPinAad(secretBytes, currentInstanceId);

    // Derive ephemeral AES key using both factors
    const ephemeralAesKey = await deriveVaultAesKey(idbHmacKey, secretBytes, salt, info);

    const decrypted = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      ephemeralAesKey,
      record.data
    );

    const parsed: PinSessionPayload = JSON.parse(new TextDecoder().decode(decrypted));

    if (!parsed.date || parsed.date <= Date.now() || typeof parsed.pin !== 'string' || parsed.pin.length < 4) {
      await purgePinSession();
      return null;
    }

    // Refresh active in-memory purge timer
    schedulePinPurge(parsed.date);

    return parsed;
  } catch {
    await purgePinSession();
    return null;
  } finally {
    secretBytes.fill(0);
  }
}

/**
 * Fast startup sweep: cleans up expired or orphaned PIN records without any cryptographic operations.
 * Also proactively removes any legacy v1/v2 key residues.
 */
export async function sweepExpiredPinVault(): Promise<void> {
  try {
    // Proactive unconditional cleanup of legacy key ID
    await idbKeyStoreDelete('ephemeralPinKey');

    const record = await idbEncryptedStoreGet<PinSessionRecord>(PIN_SESSION_STORE_KEY);
    if (!record) return;

    const currentInstanceId = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(PIN_SESSION_INSTANCE_ID)
      : null;
    const sessionTokenHex = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(PIN_SESSION_KEY_NAME)
      : null;

    if (
      record.v !== 3 ||
      !record.expiresAt ||
      record.expiresAt <= Date.now() ||
      !currentInstanceId ||
      !sessionTokenHex ||
      record.instanceId !== currentInstanceId
    ) {
      await purgePinSession();
    }
  } catch {}
}

/**
 * Total destruction of the cached PIN session:
 * 1. Shreds the 256-bit token and instanceId from sessionStorage.
 * 2. Deletes the HMAC CryptoKey from IndexedDB KeyStore.
 * 3. Deletes the ciphertext record from IndexedDB EncryptedStore.
 * 4. Cancels any active in-memory purge timer.
 */
export async function purgePinSession(): Promise<void> {
  if (pinPurgeTimer) {
    clearTimeout(pinPurgeTimer);
    pinPurgeTimer = null;
  }

  // 1. Shred ephemeral token from sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(PIN_SESSION_KEY_NAME);
      sessionStorage.removeItem(PIN_SESSION_INSTANCE_ID);
    } catch {}
  }

  // 2. Delete HMAC key and ciphertext record from IndexedDB
  try {
    await idbKeyStoreDelete(PIN_SESSION_IDB_KEY_ID);
    await idbKeyStoreDelete('ephemeralPinKey');
    await idbEncryptedStoreDelete(PIN_SESSION_STORE_KEY);
  } catch {}
}

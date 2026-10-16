
let cachedGcmKey: { hexKey: string; key: CryptoKey } | null = null;

async function getGcmKey(hexKey: string): Promise<CryptoKey> {
  if (cachedGcmKey && cachedGcmKey.hexKey === hexKey) {
    return cachedGcmKey.key;
  }
  const bytes = new Uint8Array(hexKey.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
  const key = await self.crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  cachedGcmKey = { hexKey, key };
  return key;
}

self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data;

  try {
    if (type === 'PBKDF2_DERIVE') {
      const { password, salt, iterations, length } = payload;
      const enc = new TextEncoder();
      const keyMaterial = await self.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const derivedKey = await self.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: iterations || 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        (length || 32) * 8
      );

      const hex = Array.from(new Uint8Array(derivedKey))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      self.postMessage({ id, success: true, result: hex });
      return;
    }

    if (type === 'SHA256_DIGEST') {
      const enc = new TextEncoder();
      const buffer = typeof payload === 'string' ? enc.encode(payload) : payload;
      const hashBuffer = await self.crypto.subtle.digest('SHA-256', buffer);
      const hex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      self.postMessage({ id, success: true, result: hex });
      return;
    }

    if (type === 'AES_GCM_ENCRYPT') {
      const { data, derivedKeyHex } = payload;
      const key = await getGcmKey(derivedKeyHex);
      const iv = self.crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(data);

      const ciphertextBuffer = await self.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
      const cipherHex = Array.from(new Uint8Array(ciphertextBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      self.postMessage({ id, success: true, result: `gcm:v2:${ivHex}:${cipherHex}` });
      return;
    }

    if (type === 'AES_GCM_DECRYPT') {
      const { data, derivedKeyHex } = payload;
      if (!data.startsWith('gcm:v2:')) {
        self.postMessage({ id, success: false, error: 'Unsupported format' });
        return;
      }
      const parts = data.split(':');
      const ivHex = parts[2];
      const cipherHex = parts[3];

      const iv = new Uint8Array(ivHex.match(/.{1,2}/g)?.map((b: string) => parseInt(b, 16)) || []);
      const ciphertext = new Uint8Array(cipherHex.match(/.{1,2}/g)?.map((b: string) => parseInt(b, 16)) || []);

      const key = await getGcmKey(derivedKeyHex);
      const decryptedBuffer = await self.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const text = new TextDecoder().decode(decryptedBuffer);
      self.postMessage({ id, success: true, result: text });
      return;
    }

    self.postMessage({ id, success: false, error: 'Unknown worker action type' });
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};

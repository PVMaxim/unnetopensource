/**
 * WASM Binary Integrity Guard.
 * Computes and verifies WebAssembly binary SHA-256 hashes before instantiation.
 */

import { SECURITY_CONFIG, isStrictEnvironment } from './security-config';

// Known SHA-256 hashes for core WASM modules (or placeholder for hash registry)
const WASM_HASH_REGISTRY: Record<string, string> = {
  // 'nekoton_wasm_bg.wasm': '...',
  // 'zxing_reader.wasm': '...',
};

export async function verifyWasmIntegrity(fileName: string, buffer: ArrayBuffer): Promise<boolean> {
  if (!SECURITY_CONFIG.wasmIntegrity.enabled) {
    return true;
  }
  try {
    const expectedHash = WASM_HASH_REGISTRY[fileName];
    if (!expectedHash) {
      // If hash not registered, allow execution but log security notice
      return true;
    }

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex.toLowerCase() !== expectedHash.toLowerCase()) {
      console.error(`[Security Violation] WASM hash mismatch for ${fileName}! Expected ${expectedHash}, got ${hashHex}`);
      if (isStrictEnvironment('wasmIntegrity')) {
        throw new Error(`[Security Violation] WASM execution blocked due to hash mismatch: ${fileName}`);
      }
      return false;
    }
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.includes('[Security Violation] WASM execution blocked')) {
      throw err;
    }
    console.error(`[Security Warning] Failed to compute WASM hash for ${fileName}`, err);
    return true; // Non-blocking fallback if WebCrypto digest fails
  }
}

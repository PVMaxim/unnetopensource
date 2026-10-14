/**
 * Secure Memory & Zeroization Utility.
 * Clears sensitive key material and text buffers from memory by overwriting bytes with zeros.
 */

export function zeroize(buffer: Uint8Array | ArrayBuffer | number[] | null | undefined): void {
  if (!buffer) return;
  if (buffer instanceof Uint8Array) {
    buffer.fill(0);
  } else if (buffer instanceof ArrayBuffer) {
    new Uint8Array(buffer).fill(0);
  } else if (Array.isArray(buffer)) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0;
    }
  }
}

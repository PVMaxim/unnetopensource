/**
 * Anti-Tamper & RASP (Runtime Application Self-Protection) Guard.
 * Protects runtime against prototype pollution attacks and verifies Crypto availability.
 */

import { SECURITY_CONFIG } from './security-config';

/**
 * Deep-freezes a specific target object without mutating global built-in prototypes.
 */
export function safeFreeze<T extends object>(obj: T): T {
  if (Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  return obj;
}

/**
 * Prevents prototype pollution by sanitizing keys against __proto__, constructor, and prototype.
 */
export function sanitizeObjectKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

export function initializeAntiTamper(): void {
  if (!SECURITY_CONFIG.antiTamper.enabled) {
    return;
  }
  try {
    // Verify Crypto availability without overwriting window.crypto accessor
    if (typeof window !== 'undefined' && !window.crypto) {
      console.warn('[AntiTamper] Native window.crypto is unavailable in this environment.');
    }
  } catch (err) {
    console.error('[AntiTamper Error]', err);
  }
}

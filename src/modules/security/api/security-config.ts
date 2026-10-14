/**
 * Security Feature Flags & Environment Configuration.
 * Allows centralized, environment-aware configuration for each security module.
 */

export type AppEnvironment = 'production' | 'development' | 'test';

export interface FeatureSecurityConfig {
  enabled: boolean;
  /** Environments where strict enforcement (e.g. blocking phishing screen or freezing prototypes) applies */
  strictEnvironments: AppEnvironment[];
}

export interface SecurityModuleConfig {
  /** Domain Guard & Anti-Clickjacking */
  domainGuard: FeatureSecurityConfig;
  /** Anti-Tamper & Prototype Freezing */
  antiTamper: FeatureSecurityConfig;
  /** WebAssembly Binary SHA-256 Hash Integrity Guard */
  wasmIntegrity: FeatureSecurityConfig;
  /** Offload CPU-intensive crypto tasks to Web Worker */
  asyncCryptoWorker: boolean;
  /** AES-256-GCM Encryption with AEAD (Fallback to AES-CBC if false) */
  gcmEncryption: boolean;
}

export const currentEnv: AppEnvironment = (
  typeof ENVIRONMENT !== 'undefined' ? ENVIRONMENT : 'development'
) as AppEnvironment;

export const SECURITY_CONFIG: SecurityModuleConfig = {
  domainGuard: {
    enabled: false,
    strictEnvironments: []
  },
  antiTamper: {
    enabled: true,
    strictEnvironments: ['production']
  },
  wasmIntegrity: {
    enabled: true,
    strictEnvironments: ['production']
  },
  asyncCryptoWorker: true,
  gcmEncryption: true
};

/**
 * Check if strict security enforcement is active for a feature in the current environment.
 */
export function isStrictEnvironment(feature: 'domainGuard' | 'antiTamper' | 'wasmIntegrity'): boolean {
  const cfg = SECURITY_CONFIG[feature];
  if (!cfg || !cfg.enabled) return false;
  return cfg.strictEnvironments.includes(currentEnv);
}

/**
 * Dynamically configure or toggle security modules and strict environments at runtime or test startup.
 */
export function configureSecurity(overrides: Partial<SecurityModuleConfig>): void {
  if (overrides.domainGuard) Object.assign(SECURITY_CONFIG.domainGuard, overrides.domainGuard);
  if (overrides.antiTamper) Object.assign(SECURITY_CONFIG.antiTamper, overrides.antiTamper);
  if (overrides.wasmIntegrity) Object.assign(SECURITY_CONFIG.wasmIntegrity, overrides.wasmIntegrity);
  if (typeof overrides.asyncCryptoWorker === 'boolean') SECURITY_CONFIG.asyncCryptoWorker = overrides.asyncCryptoWorker;
  if (typeof overrides.gcmEncryption === 'boolean') SECURITY_CONFIG.gcmEncryption = overrides.gcmEncryption;
}

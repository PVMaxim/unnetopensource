/**
 * Granular Environment-based Feature Flags for Settings Extra Menu Items.
 *
 * You can configure allowed environments for each settings item:
 * - List of environments: e.g. ['development', 'staging', 'test']
 * - Wildcard ['*']: Enabled in all environments (including production)
 * - Boolean (true / false) or custom predicate function: (env) => boolean
 */
export const SETTINGS_EXTRA_CONFIG = {
  // NFC priority settings: enabled in all environments except production
  nfcSettings: (env: string) => env !== 'production',

  // Language selector: enabled in all environments except production
  languageSelect: (env: string) => env !== 'production',

  // Notification toggles (token detector & sound): enabled in ALL environments including production
  notificationSettings: (_env: string) => true,

  // Web3 news alerts toggle: enabled in non-production environments matching push-notifications module
  newsSettings: (env: string) => env !== 'production',
};

export type SettingsExtraFeature = keyof typeof SETTINGS_EXTRA_CONFIG;

export function getCurrentEnvironment(): string {
  if (typeof ENVIRONMENT !== 'undefined' && ENVIRONMENT) {
    return ENVIRONMENT;
  }
  return 'development';
}

export function isFeatureEnabledForEnv(
  feature: SettingsExtraFeature,
  env: string = getCurrentEnvironment()
): boolean {
  const allowed = SETTINGS_EXTRA_CONFIG[feature] as readonly string[] | boolean | ((env: string) => boolean);

  if (typeof allowed === 'boolean') {
    return allowed;
  }

  if (typeof allowed === 'function') {
    return allowed(env);
  }

  if (Array.isArray(allowed)) {
    if (allowed.includes('*')) return true;
    return allowed.includes(env) || (env !== 'production' && allowed.includes('development'));
  }

  return true;
}

export function isAnySettingsExtraEnabled(env: string = getCurrentEnvironment()): boolean {
  const features: SettingsExtraFeature[] = ['nfcSettings', 'languageSelect', 'notificationSettings', 'newsSettings'];
  return features.some(f => isFeatureEnabledForEnv(f, env));
}

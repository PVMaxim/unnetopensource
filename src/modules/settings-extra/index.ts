import { defineAsyncComponent } from 'vue';
import { AppModule, registerModuleLocales } from '../registry';
import { isAnySettingsExtraEnabled, isFeatureEnabledForEnv } from './config';

export * from './config';

const settingsLocales: Record<string, any> = {};
const localeModules = import.meta.glob('./locales/*.json', { eager: true });

for (const path in localeModules) {
  const match = path.match(/\/([^/]+)\.json$/);
  if (match) {
    const localeCode = match[1];
    settingsLocales[localeCode] = (localeModules[path] as any).default;
  }
}

export const settingsExtraModule: AppModule = {
  name: 'settings-extra',
  enabled: isAnySettingsExtraEnabled(),
  register({ app, store }) {
    if (isFeatureEnabledForEnv('languageSelect')) {
      store.dispatch('lang/setLocales', ['en', 'ru']);
    }
    registerModuleLocales(settingsLocales);

    app.component(
      'SettingsExtraItems',
      defineAsyncComponent(() => import('./components/SettingsExtraItems.vue'))
    );

    if (isFeatureEnabledForEnv('nfcSettings')) {
      app.component(
        'NfcSettingsView',
        defineAsyncComponent(() => import('./components/NfcSettingsView.vue'))
      );
    }
  }
};
export default settingsExtraModule;

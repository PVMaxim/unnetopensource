import { AppModule, registerNavigationLink, registerModuleLocales } from '../registry';
import stakingStore from './store';
const stakingLocales: Record<string, any> = {};
const localeModules = import.meta.glob('./locales/*.json', { eager: true });

for (const path in localeModules) {
  const match = path.match(/\/([^/]+)\.json$/);
  if (match) {
    const localeCode = match[1];
    stakingLocales[localeCode] = (localeModules[path] as any).default;
  }
}

export const stakingModule: AppModule = {
  name: 'staking',
  enabled: true,
  register({ router, store }) {
    // 1. Register Vuex store module dynamically
    store.registerModule('staking', stakingStore);

    // 2. Register locales dynamically
    registerModuleLocales(stakingLocales);

    // 3. Register navigation link
    registerNavigationLink('staking', 'nav.staking');

    // 4. Register route dynamically
    router.addRoute({
      path: '/staking',
      name: 'staking',
      component: () => import('./pages/Staking.vue'),
      meta: {
        layout: 'Dashboard',
        title: 'Staking',
        description: 'Staking'
      }
    });
  }
};
export default stakingModule;

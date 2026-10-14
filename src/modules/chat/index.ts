import { AppModule, registerNavigationLink, registerModuleLocales } from '../registry';
import chatStore from './store/chat';

const chatLocales: Record<string, any> = {};
const localeModules = import.meta.glob('./locales/*.json', { eager: true });

for (const path in localeModules) {
  const match = path.match(/\/([^/]+)\.json$/);
  if (match) {
    const localeCode = match[1];
    chatLocales[localeCode] = (localeModules[path] as any).default;
  }
}

export const chatModule: AppModule = {
  name: 'chat',
  enabled: typeof ENVIRONMENT !== 'undefined' && ENVIRONMENT !== 'production',
  register({ router, store }) {
    // 1. Dynamically register Vuex store module
    store.registerModule('chat', chatStore);

    // 2. Dynamically register locales
    registerModuleLocales(chatLocales);

    // 3. Dynamically register navigation link
    registerNavigationLink('chat', 'nav.chat');

    // 4. Dynamically register route
    router.addRoute({
      path: '/chat',
      name: 'chat',
      component: () => import('./components/Chat.vue'),
      meta: {
        layout: 'Dashboard',
        title: 'Chat',
        description: 'AI Chat Assistant'
      }
    });
  }
};
export default chatModule;

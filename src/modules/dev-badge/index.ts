import { defineAsyncComponent } from 'vue';
import { AppModule, registerGlobalComponent } from '../registry';

export const devBadgeModule: AppModule = {
  name: 'dev-badge',
  enabled: typeof ENVIRONMENT !== 'undefined' && ENVIRONMENT !== 'production',
  register() {
    registerGlobalComponent(
      'DevBadge',
      defineAsyncComponent(() => import('./components/DevBadge.vue'))
    );
  }
};

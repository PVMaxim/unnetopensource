import { defineAsyncComponent } from 'vue';
import { AppModule, registerGlobalComponent } from '../registry';
import { setNewsNotificationsEnabled, getNewsNotificationsEnabled } from './useEvmNotification';

export { setNewsNotificationsEnabled, getNewsNotificationsEnabled };

export const pushNotificationsModule: AppModule = {
  name: 'push-notifications',
  enabled: typeof ENVIRONMENT !== 'undefined' && ENVIRONMENT !== 'production',
  register() {
    registerGlobalComponent(
      'PushNotificationBanner',
      defineAsyncComponent(() => import('./PushNotificationBanner.vue'))
    );
  }
};

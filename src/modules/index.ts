import { App } from 'vue';
import { Router } from 'vue-router';
import { Store } from 'vuex';

import { securityModule } from './security';
import { pushNotificationsModule } from './push-notifications';
import { walletConnectModule } from './wallet-connect';
import { chatModule } from './chat';
import { stakingModule } from './staking';
import { devBadgeModule } from './dev-badge';
import { settingsExtraModule } from './settings-extra';
// import { networkRetryModule } from './network-retry';
import { tokenDetectorModule } from './token-detector';

const appModules = [
  // networkRetryModule,
  securityModule,
  pushNotificationsModule,
  walletConnectModule,
  chatModule,
  stakingModule,
  devBadgeModule,
  settingsExtraModule,
  tokenDetectorModule,
];

export function bootstrapModules(app: App, router: Router, store: Store<any>) {
  const originalAddRoute = router.addRoute.bind(router);

  for (const module of appModules) {
    if (module.enabled) {
      const moduleRouter = Object.create(router);
      moduleRouter.addRoute = originalAddRoute;
      module.register({ app, router: moduleRouter, store });
    }
  }

  router.addRoute = () => {
    throw new Error('Runtime route injection is disabled for security reasons.');
  };
}

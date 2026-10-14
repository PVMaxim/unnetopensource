import { defineAsyncComponent } from 'vue';
import { AppModule, registerGlobalComponent, registerNavigationLink } from '../registry';

export const walletConnectModule: AppModule = {
  name: 'wallet-connect',
  enabled: typeof ENVIRONMENT !== 'undefined' && ENVIRONMENT !== 'production',
  register({ router }) {
    // 1. Register modal socket globally
    registerGlobalComponent(
      'WalletConnectRequestModalSocket',
      defineAsyncComponent(() => import('./components/modals/WalletConnectRequestModalSocket.vue'))
    );

    // 2. Register navigation link
    registerNavigationLink('wallet-connect', 'nav.wallet-connect');

    // 3. Register route dynamically
    router.addRoute({
      path: '/wallet-connect',
      name: 'wallet-connect',
      component: () => import('./components/ConnectedApps.vue'),
      meta: {
        layout: 'Dashboard',
        title: 'Wallet connect',
        description: 'Wallet connect'
      }
    });

    // 4. Initialize helper automatically
    import('./api/wcHelper').then(({ initWalletConnectHelper }) => {
      initWalletConnectHelper().catch(
        err => console.error('[WalletConnect] Init failed:', err)
      );
    });
  }
};
export default walletConnectModule;

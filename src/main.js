import '@/assets/scss/app.scss';
import { createApp, nextTick } from 'vue';
import App from './components/App.vue';
import { store } from './store/index';
import i18n, { initI18n } from "./plugins/i18n";
import router from './router/index';
import { registerLayouts } from './layouts/index';

const app = createApp(App);
app.use(store);
app.use(i18n);
app.use(router);
registerLayouts(app);

router.isReady().then(() => {
  app.mount('#united-network');
});

nextTick(async () => {

  const { default: vIntersect } = await import('./plugins/intersect');
  app.directive('intersect', vIntersect);

  const { isWebViewApp } = await import('@/api/sub-utils');
  if (isWebViewApp()) {
    document.body.classList.add('web-app')
  } else {
    document.body.classList.remove('web-app');
  }
  const { runApplicationChecks } = await import('@/api/updatesChainResponsability');
  await initI18n();
  runApplicationChecks();

  const { initWalletConnectHelper } = await import('@/api/wallet-connect/wcHelper');
  initWalletConnectHelper().catch(err => {});

  let viewportHeight = window.innerHeight;
  let doc = document.documentElement;
  window.addEventListener("resize", () => {
    viewportHeight = window.innerHeight;
    doc.style.setProperty('--doc-height', `${viewportHeight}px`);
  })
  doc.style.setProperty('--doc-height', `${viewportHeight}px`);
});
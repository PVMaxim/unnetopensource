import { ref } from 'vue';
import { store } from '@/store/index';
import { ensureInitialized } from '@/api/init';
import { createRouter, createWebHistory } from 'vue-router';
import { i18n, setI18nLanguage } from '@/plugins/i18n';
import { isCardRegistered, isCardIsNew } from '@/api/check-guards';
import { setTitle, setDescription, setFollow, setCurrentUrl, setCanonical } from '@/plugins/metaTags';
import { isWebViewApp, deniteAndroid201 } from '@/api/sub-utils';
import { isDesktop, supportedBrowser } from '@/plugins/checkDevice';
import { errorReload } from '@/plugins/vitePreloadError';

export const isRouteLoading = ref(false);

const { global: { locale, t } } = i18n;
export const router = createRouter({
  history: createWebHistory(),
  mode: "history",
  linkActiveClass: "active",
  linkExactActiveClass: "exact-active",

  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      if (to.path !== from.path) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              el: to.hash,
              behavior: 'smooth',
            });
          }, 400);
        });
      }
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }
    return { top: 0 };
  },

  routes: [
    {
      path: '/:publicKey([a-fA-F0-9]{134})?',
      alias: '/sign-in/:publicKey?',
      name: 'authorization',
      beforeEnter: (to, from, next) => {
        if (isDesktop) {
          next({ name: 'NotSupportedDevice' });
        } else if (!isWebViewApp() && !supportedBrowser()) {
          next({ name: 'NotSupportedBrowser' });
        } else {
          next();
        }
      },
      component: () => import('../pages/Authorization.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.authorization'),
        description: i18n.global.t('description.authorization'),
        follow: true
      }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      beforeEnter: (to, from, next) => {
        if (isDesktop) {
          next({ name: 'NotSupportedDevice' });
        } else if ((!isWebViewApp() && !supportedBrowser())) {
          next({ name: 'NotSupportedBrowser' });
        } else if (deniteAndroid201()) {
          next({ name: 'NotSupportedBrowserOnlyApp' });
        } else if (isCardRegistered()) {
          next();
        } else if (isCardIsNew()) {
          next({ name: 'registration-card' });
        } else {
          next({ name: 'authorization' });
        }
      },
      component: () => import('../pages/Dashboard.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.dashboard'),
        description: i18n.global.t('description.dashboard'),
        follow: false
      }
    },
    {
      path: '/registration-card',
      name: 'registration-card',
      beforeEnter: (to, from, next) => {
        if (isDesktop) {
          next({ name: 'NotSupportedDevice' });
        } else if ((!isWebViewApp() && !supportedBrowser())) {
          next({ name: 'NotSupportedBrowser' });
        } else if (deniteAndroid201()) {
          next({ name: 'NotSupportedBrowserOnlyApp' });
        } else if (isCardIsNew()) {
          next();
        } else {
          router.go(-1);
        }
      },
      component: () => import('../pages/SeedPhrase.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.registration-card'),
        description: i18n.global.t('description.registration-card')
      }
    },
    {
      path: '/re-registration-card',
      name: 're-registration-card',
      beforeEnter: (to, from, next) => {
        if (isDesktop) {
          next({ name: 'NotSupportedDevice' });
        } else if ((!isWebViewApp() && !supportedBrowser())) {
          next({ name: 'NotSupportedBrowser' });
        } else if (deniteAndroid201()) {
          next({ name: 'NotSupportedBrowserOnlyApp' });
        } else {
          next();
        }
      },
      component: () => import('../pages/ReCreateSeedPhrase.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.re-registration-card'),
        description: i18n.global.t('description.re-registration-card')
      }
    },
    {
      path: '/restore-card',
      name: 'restore-card',
      beforeEnter: (to, from, next) => {
        if (isDesktop) {
          next({ name: 'NotSupportedDevice' });
        } else if ((!isWebViewApp() && !supportedBrowser())) {
          next({ name: 'NotSupportedBrowser' });
        } else if (deniteAndroid201()) {
          next({ name: 'NotSupportedBrowserOnlyApp' });
        } else {
          next();
        }
      },
      component: () => import('../pages/RestoreSeedPhrase.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.restore-card'),
        description: i18n.global.t('description.restore-card')
      }
    },
    {
      path: '/receive',
      name: 'receive',
      beforeEnter: (to, from, next) => {
        if (isDesktop) {
          next({ name: 'NotSupportedDevice' });
        } else if ((!isWebViewApp() && !supportedBrowser())) {
          next({ name: 'NotSupportedBrowser' });
        } else if (deniteAndroid201()) {
          next({ name: 'NotSupportedBrowserOnlyApp' });
        } else if (isCardRegistered()) {
          next();
        } else if (isCardIsNew()) {
          next({ name: 'registration-card' });
        } else {
          next({ name: 'authorization' });
        }
      },
      component: () => import('../pages/Receive.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.receive'),
        description: i18n.global.t('description.receive')
      }
    },
    {
      path: '/send',
      name: 'send',
      beforeEnter: (to, from, next) => {
        if (isDesktop) {
          next({ name: 'NotSupportedDevice' });
        } else if ((!isWebViewApp() && !supportedBrowser())) {
          next({ name: 'NotSupportedBrowser' });
        } else if (deniteAndroid201()) {
          next({ name: 'NotSupportedBrowserOnlyApp' });
        } else if (isCardRegistered()) {
          next();
        } else if (isCardIsNew()) {
          next({ name: 'registration-card' });
        } else {
          next({ name: 'authorization' });
        }
      },
      component: () => import('../pages/Send.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.send'),
        description: i18n.global.t('description.send')
      }
    },
    {
      path: '/settings',
      name: 'settings',
      beforeEnter: (to, from, next) => {
        if (isDesktop) {
          next({ name: 'NotSupportedDevice' });
        } else if (!isWebViewApp() && !supportedBrowser()) {
          next({ name: 'NotSupportedBrowser' });
        } else {
          next();
        }
      },
      component: () => import('../pages/Settings.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.settings'),
        description: i18n.global.t('description.settings')
      }
    },
    {
      path: '/swap',
      name: 'swap',
      component: () => import('../pages/Swap.vue'),
      meta: {
        layout: 'Dashboard',
        title: i18n.global.t('title.swap'),
        description: i18n.global.t('description.swap')
      }
    },
    {
      path: '/not-supported-device',
      name: 'NotSupportedDevice',
      component: () => import('../pages/NotSupportedDevice.vue'),
      meta: {
        layout: 'NotSupported',
        title: i18n.global.t('title.not-supported-device'),
        description: i18n.global.t('description.not-supported-device')
      }
    },
    {
      path: '/not-supported-browser',
      name: 'NotSupportedBrowser',
      component: () => import('../pages/NotSupportedBrowser.vue'),
      meta: {
        layout: 'NotSupported',
        title: i18n.global.t('title.not-supported-browser'),
        description: i18n.global.t('description.not-supported-browser')
      }
    },
    {
      path: '/not-supported-app',
      name: 'NotSupportedBrowserOnlyApp',
      component: () => import('../pages/NotSupportedBrowserOnlyApp.vue'),
      meta: {
        layout: 'NotSupported',
        title: i18n.global.t('title.not-supported-browser-only-app'),
        description: i18n.global.t('description.not-supported-browser-only-app')
      }
    },

    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../pages/404.vue'),
      meta: {
        layout: 'NotSupported',
        title: i18n.global.t('title.not-found'),
        description: i18n.global.t('description.not-found')
      }
    },
  ]
})

router.beforeEach(async (to, from, next) => {
  if (to.path !== from.path) {
    isRouteLoading.value = true;
  }
  await ensureInitialized();
  let newLocale = to.params.locale;
  let prevLocale = from.params.locale;
  const titleFromParams = to.params?.pageTitle;

  if (to.name === 'authorization' && !(/^[a-fA-F0-9]{134}$/.test(to.params.publicKey)) && to.params.publicKey?.length > 0 && to.name !== from.name) {
    isRouteLoading.value = false;
    return { name: 'NotFound' };
  }

  if (!newLocale) {
    newLocale = store.state.lang.locale;
  }

  if (prevLocale !== newLocale) {
    setI18nLanguage(newLocale);
  }

  setCanonical(to);
  setTitle(to.meta?.title ?
    to.name === 'authorization' ? `${to.meta?.title}` : `United Network | ${to.meta?.title}` :
    'United Network');
  setDescription(to.meta?.description);
  setFollow(to.meta?.follow);
  setCurrentUrl();

  next();
})

router.afterEach(() => {
  isRouteLoading.value = false;
});

router.onError((error) => {
  isRouteLoading.value = false;
  if (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed')
  ) {
    errorReload('Router ChunkLoadError', 3);
  }
});

export default router;
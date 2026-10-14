
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare const ENVIRONMENT: string;
declare const GIT_BRANCH: string;
declare const WEB_VERSION: string;
declare const UNITED_CARDS_KEY: string;
declare const UNITED_CARDS_DERIVED_KEY: string;
declare const UNITED_CARDS_LEGACY_DERIVED_KEY: string;
declare const UNITED_CARDS_IV_KEY: string;
declare const UNITED_CONNECT_PROJECT_ID: string;

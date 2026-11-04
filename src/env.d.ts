declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, unknown>
  export default component
}

declare module 'vuex' {
  export interface Store<S = unknown> {
    state: S;
    dispatch: (type: string, payload?: unknown, options?: unknown) => Promise<unknown>;
    commit: (type: string, payload?: unknown, options?: unknown) => void;
    registerModule: (path: string | string[], module: unknown, options?: unknown) => void;
    unregisterModule: (path: string | string[]) => void;
    hasModule: (path: string | string[]) => boolean;
    getters: Record<string, unknown>;
    watch: <T = unknown>(getter: (state: S, getters: Record<string, unknown>) => T, cb: (value: T, oldValue: T) => void, options?: unknown) => () => void;
    subscribe: (fn: (mutation: unknown, state: S) => unknown) => () => void;
  }
  export interface ActionContext<S = unknown, R = unknown> {
    dispatch: (type: string, payload?: unknown, options?: unknown) => Promise<unknown>;
    commit: (type: string, payload?: unknown, options?: unknown) => void;
    state: S;
    rootState: R;
    getters: Record<string, unknown>;
    rootGetters: Record<string, unknown>;
  }
  export function useStore<S = unknown>(): Store<S>;
}

declare const UNITED_CARDS_KEY: string | undefined;
declare const UNITED_CARDS_DERIVED_KEY: string | undefined;
declare const UNITED_CARDS_LEGACY_DERIVED_KEY: string | undefined;
declare const UNITED_CARDS_IV_KEY: string;
declare const UNITED_CONNECT_PROJECT_ID: string;

interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}

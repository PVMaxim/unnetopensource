import { shallowRef, ref, App } from 'vue';
import { Router } from 'vue-router';
import { Store } from 'vuex';

export interface AppModule {
  name: string;
  enabled: boolean;
  register(ctx: {
    app: App;
    router: Router;
    store: Store<any>;
  }): void | Promise<void>;
}

export interface GlobalComponentInfo {
  name: string;
  component: any;
}

export interface NavigationLinkInfo {
  name: string;
  label: string;
}

export const globalComponents = shallowRef<GlobalComponentInfo[]>([]);
export const navigationLinks = ref<NavigationLinkInfo[]>([]);
export const registeredLocales = ref<Record<string, Record<string, any>>>({});

import { permissionManager, PermissionItem } from '@/components/permissionManager';

export function registerGlobalComponent(name: string, component: any) {
  globalComponents.value = [...globalComponents.value, { name, component }];
}

export function registerNavigationLink(name: string, label: string) {
  navigationLinks.value = [...navigationLinks.value, { name, label }];
}

export function registerPermission(item: PermissionItem) {
  permissionManager.register(item);
}

export function registerModuleLocales(locales: Record<string, Record<string, any>>) {
  for (const [lang, msgs] of Object.entries(locales)) {
    if (!registeredLocales.value[lang]) {
      registeredLocales.value[lang] = {};
    }
    registeredLocales.value[lang] = mergeDeep(registeredLocales.value[lang], msgs);
  }
}

function mergeDeep(target: any, source: any): any {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}


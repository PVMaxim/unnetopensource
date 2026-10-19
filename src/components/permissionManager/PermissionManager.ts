import { ref } from 'vue';
import { PermissionItem, PermissionStatus } from './types';
import { useEventsBus } from '@/plugins/eventBus';

const STORAGE_DONT_ASK_KEY = 'unnet_permissions_dont_ask';

const isSecure = () => typeof window !== 'undefined' && (
  window.isSecureContext ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.endsWith('.localhost')
);


export const isCameraSupported = () =>
  typeof navigator !== 'undefined' &&
  isSecure() &&
  !!(navigator.mediaDevices?.getUserMedia || (navigator as any).getUserMedia);

export const checkCameraPermission = async (): Promise<PermissionStatus> => {
  if (!isCameraSupported()) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'camera' as any });
      if (status.state === 'granted') return 'granted';
      if (status.state === 'denied') return 'denied';
      return 'prompt';
    }
  } catch {
  }
  if (navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      if (videoDevices.length > 0 && videoDevices.some(d => d.label !== '')) {
        return 'granted';
      }
    } catch {
    }
  }
  return 'prompt';
};

export const requestCameraPermission = async (): Promise<boolean> => {
  if (!isCameraSupported()) return false;
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    return true;
  } catch {
    return false;
  } finally {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }
};

export const isNfcSupported = () =>
  typeof window !== 'undefined' && isSecure() && 'NDEFReader' in window;

export const checkNfcPermission = async (): Promise<PermissionStatus> => {
  if (!isNfcSupported()) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'nfc' as any });
      if (status.state === 'granted') return 'granted';
      if (status.state === 'denied') return 'denied';
      return 'prompt';
    }
  } catch {
  }
  return 'prompt';
};

export const requestNfcPermission = async (): Promise<boolean> => {
  if (!isNfcSupported()) return false;
  try {
    const ndef = new (window as any).NDEFReader();
    await ndef.scan();
    return true;
  } catch {
    return false;
  }
};

export const isClipboardSupported = () =>
  typeof navigator !== 'undefined' && isSecure() && !!navigator.clipboard?.readText;

export const checkClipboardPermission = async (): Promise<PermissionStatus> => {
  if (!isClipboardSupported()) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'clipboard-read' as any });
      if (status.state === 'granted') return 'granted';
      if (status.state === 'denied') return 'denied';
      return 'prompt';
    }
  } catch {
  }
  return 'prompt';
};

export const requestClipboardPermission = async (): Promise<boolean> => {
  if (!isClipboardSupported()) return false;
  try {
    await navigator.clipboard.readText();
    return true;
  } catch {
    return false;
  }
};

export class PermissionManager {
  private static instance: PermissionManager;
  private permissionsList = ref<PermissionItem[]>([]);
  public isModalVisible = ref(false);
  public statuses = ref<Record<string, PermissionStatus>>({});
  private activeListenersInitialized = false;
  private isDismissedThisSession = false;

  private constructor() {
    this.registerDefaultPermissions();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('unnet_permissions_dismissed_until');
      } catch {
      }
      this.initPermissionListeners();
    }
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private registerDefaultPermissions() {

    this.register({
      id: 'camera',
      name: 'Camera',
      titleKey: 'permissions.cameraTitle',
      descriptionKey: 'permissions.cameraDesc',
      iconName: 'camera',
      category: 'hardware',
      isSupported: isCameraSupported,
      checkStatus: checkCameraPermission,
      request: requestCameraPermission,
    });

    this.register({
      id: 'nfc',
      name: 'NFC Card',
      titleKey: 'permissions.nfcTitle',
      descriptionKey: 'permissions.nfcDesc',
      iconName: 'nfc',
      category: 'hardware',
      isSupported: isNfcSupported,
      checkStatus: checkNfcPermission,
      request: requestNfcPermission,
    });

    this.register({
      id: 'clipboard',
      name: 'Clipboard',
      titleKey: 'permissions.clipboardTitle',
      descriptionKey: 'permissions.clipboardDesc',
      iconName: 'clipboard',
      category: 'system',
      optional: true,
      isSupported: isClipboardSupported,
      checkStatus: checkClipboardPermission,
      request: requestClipboardPermission,
    });
  }

  private async initPermissionListeners() {
    if (this.activeListenersInitialized || !navigator?.permissions?.query) return;
    this.activeListenersInitialized = true;

    const queryNames: Record<string, string> = {
      camera: 'camera',
      clipboard: 'clipboard-read',
      nfc: 'nfc',
    };

    for (const [id, queryName] of Object.entries(queryNames)) {
      try {
        const queryRes = await navigator.permissions.query({ name: queryName as any });
        queryRes.addEventListener('change', async () => {
          await this.getPermissionStatuses();
          useEventsBus().emit('permissionsUpdated', { [id]: queryRes.state });
        });
      } catch {
      }
    }
  }

  public register(item: PermissionItem) {
    const idx = this.permissionsList.value.findIndex(p => p.id === item.id);
    if (idx >= 0) {
      this.permissionsList.value[idx] = item;
    } else {
      this.permissionsList.value.push(item);
    }
  }

  public getPermissions() {
    return this.permissionsList;
  }

  public getSupportedPermissions() {
    return this.permissionsList;
  }

  public async getPermissionStatuses(): Promise<Record<string, PermissionStatus>> {
    const statuses: Record<string, PermissionStatus> = {};
    const supported = this.getSupportedPermissions().value;

    await Promise.all(
      supported.map(async (perm) => {
        if (perm.checkStatus) {
          try {
            statuses[perm.id] = await perm.checkStatus();
          } catch {
            statuses[perm.id] = 'prompt';
          }
        } else {
          statuses[perm.id] = 'prompt';
        }
      })
    );

    this.statuses.value = statuses;
    return statuses;
  }

  public async requestSingle(permId: string): Promise<boolean> {
    const supported = this.getSupportedPermissions().value;
    const perm = supported.find(p => p.id === permId);
    if (!perm) return false;

    try {
      const res = await perm.request();
      await this.getPermissionStatuses();
      useEventsBus().emit('permissionsUpdated', { [permId]: res });
      return res;
    } catch {
      return false;
    }
  }

  public async requestAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const supported = this.getSupportedPermissions().value;
    const currentStatuses = await this.getPermissionStatuses();

    const order = ['camera', 'nfc', 'clipboard'];
    const sorted = [...supported].sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });

    for (const perm of sorted) {
      const status = currentStatuses[perm.id];
      if (status === 'granted') {
        results[perm.id] = true;
        continue;
      }
      if (status === 'denied' || status === 'unsupported') {
        results[perm.id] = false;
        continue;
      }

      try {
        const res = await perm.request();
        results[perm.id] = res;
        await this.getPermissionStatuses();
      } catch {
        results[perm.id] = false;
      }
    }

    useEventsBus().emit('permissionsUpdated', results);

    const shouldPrompt = await this.shouldShowPrompt();
    if (!shouldPrompt) {
      this.dismiss();
    }

    return results;
  }

  public async shouldShowPrompt(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      if (localStorage.getItem(STORAGE_DONT_ASK_KEY) === 'true') {
        return false;
      }
    } catch {
    }

    if (this.isDismissedThisSession) {
      return false;
    }

    const supported = this.getSupportedPermissions().value;
    if (supported.length === 0) return false;

    const statuses = await this.getPermissionStatuses();

    const hasAnyDenied = supported.some(perm => statuses[perm.id] === 'denied');
    if (hasAnyDenied) {
      return true;
    }

    const hasUngranted = supported.some(perm => {
      const status = statuses[perm.id];
      return status === 'prompt';
    });

    return hasUngranted;
  }

  public prompt(force = false) {
    if (force) {
      this.isDismissedThisSession = false;
      try {
        localStorage.removeItem(STORAGE_DONT_ASK_KEY);
        localStorage.removeItem('unnet_permissions_dismissed_until');
      } catch {
      }
    }
    this.isModalVisible.value = true;
  }

  public dismiss(dontAskAgain = false) {
    this.isModalVisible.value = false;
    this.isDismissedThisSession = true;
    try {
      if (dontAskAgain) {
        localStorage.setItem(STORAGE_DONT_ASK_KEY, 'true');
      }
    } catch {
    }
  }

  public logPermissionsState(_source?: string): void {
  }
}

export const permissionManager = PermissionManager.getInstance();

if (typeof window !== 'undefined') {
  (window as any).permissionManager = permissionManager;
}

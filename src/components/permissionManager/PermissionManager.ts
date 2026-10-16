import { ref, computed } from 'vue';
import { PermissionItem, PermissionStatus } from './types';
import { useEventsBus } from '@/plugins/eventBus';
import { isSafariBrowser, isFirefoxBrowser } from '@/plugins/checkDevice';

export const isNotificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const checkNotificationsPermission = async (): Promise<PermissionStatus> => {
  if (!isNotificationsSupported()) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions && (navigator.permissions as any).query) {
      const queryRes = await navigator.permissions.query({ name: 'notifications' as any });
      if (queryRes.state === 'granted') {
        return 'granted';
      }
      if (queryRes.state === 'denied') {
        return 'denied';
      }
      return 'prompt';
    }
  } catch {
  }
  const perm = Notification.permission;
  if (perm === 'granted') {
    return 'granted';
  }
  if (perm === 'denied') {
    return 'denied';
  }
  return 'prompt';
};
export const requestNotificationsPermission = async () => {
  try {
    if (isNotificationsSupported()) {
      if (Notification.permission === 'granted') {
        return true;
      }
      let perm: NotificationPermission;
      try {
        perm = await Notification.requestPermission();
      } catch {
        perm = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((result) => resolve(result));
        });
      }
      if (perm === 'granted') {
        return true;
      } else {
        return false;
      }
    }
    return false;
  } catch (e: any) {
    return false;
  }
};

export const isAudioSupported = () => typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
export const checkAudioPermission = async (): Promise<PermissionStatus> => {
  if (!isAudioSupported()) {
    return 'unsupported';
  }
  return 'granted';
};
export const requestAudioPermission = async () => {
  try {
    return true;
  } catch (e: any) {
    return false;
  }
};

export const isCameraSupported = () => typeof navigator !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia || (navigator as any).getUserMedia);
export const checkCameraPermission = async (): Promise<PermissionStatus> => {
  if (!isCameraSupported()) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions && (navigator.permissions as any).query) {
      const status = await navigator.permissions.query({ name: 'camera' as any });
      if (status.state === 'granted') {
        return 'granted';
      }
      if (status.state === 'denied') {
        return 'denied';
      }
      return 'prompt';
    }
  } catch (err: any) {
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
export const requestCameraPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err: any) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
    } else {
    }
    return false;
  }
};

export const isNfcSupported = () => typeof window !== 'undefined' && 'NDEFReader' in window;
export const checkNfcPermission = async (): Promise<PermissionStatus> => {
  if (!isNfcSupported()) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions && (navigator.permissions as any).query) {
      const status = await navigator.permissions.query({ name: 'nfc' as any });
      if (status.state === 'granted') {
        return 'granted';
      }
      if (status.state === 'denied') {
        return 'denied';
      }
      return 'prompt';
    }
  } catch {
  }
  return 'prompt';
};
export const requestNfcPermission = async () => {
  try {
    if ('NDEFReader' in window) {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      return true;
    }
    return false;
  } catch (e: any) {
    return false;
  }
};

export const isClipboardSupported = () => typeof navigator !== 'undefined' && !!navigator.clipboard?.readText && !isSafariBrowser;
export const checkClipboardPermission = async (): Promise<PermissionStatus> => {
  if (!isClipboardSupported()) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions && (navigator.permissions as any).query) {
      const status = await navigator.permissions.query({ name: 'clipboard-read' as any });
      if (status.state === 'granted') {
        return 'granted';
      }
      if (status.state === 'denied') {
        return 'denied';
      }
      return 'prompt';
    }
  } catch {
  }
  return 'prompt';
};
export const requestClipboardPermission = async () => {
  if (isSafariBrowser) {
    return false;
  }
  try {
    if (navigator?.clipboard?.readText) {
      await navigator.clipboard.readText();
      return true;
    }
    return false;
  } catch (e: any) {
    return false;
  }
};

export class PermissionManager {
  private static instance: PermissionManager;
  private permissionsList = ref<PermissionItem[]>([]);
  public isModalVisible = ref(false);

  private constructor() {
    this.registerDefaultPermissions();
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private registerDefaultPermissions() {
    this.register({
      id: 'notifications',
      name: 'Notifications',
      titleKey: 'permissions.notificationsTitle',
      descriptionKey: 'permissions.notificationsDesc',
      iconName: 'notifications',
      category: 'system',
      isSupported: isNotificationsSupported,
      checkStatus: checkNotificationsPermission,
      request: requestNotificationsPermission
    });

    this.register({
      id: 'audio',
      name: 'Audio',
      titleKey: 'permissions.audioTitle',
      descriptionKey: 'permissions.audioDesc',
      iconName: 'audio',
      category: 'system',
      optional: true,
      isSupported: isAudioSupported,
      checkStatus: checkAudioPermission,
      request: requestAudioPermission
    });

    this.register({
      id: 'camera',
      name: 'Camera',
      titleKey: 'permissions.cameraTitle',
      descriptionKey: 'permissions.cameraDesc',
      iconName: 'camera',
      category: 'hardware',
      isSupported: isCameraSupported,
      checkStatus: checkCameraPermission,
      request: requestCameraPermission
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
      request: requestNfcPermission
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
      request: requestClipboardPermission
    });
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
    return computed(() => {
      return this.permissionsList.value.filter(p => !p.isSupported || p.isSupported());
    });
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

    return statuses;
  }

  public async requestSingle(permId: string): Promise<boolean> {
    const supported = this.getSupportedPermissions().value;
    const perm = supported.find(p => p.id === permId);
    if (!perm) return false;

    try {
      const res = await perm.request();
      useEventsBus().emit('permissionsUpdated', { [permId]: res });
      return res;
    } catch (e) {
      return false;
    }
  }

  public async requestAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const supported = this.getSupportedPermissions().value;

    const audioPerm = supported.find(p => p.id === 'audio');
    if (audioPerm) {
      try {
        results['audio'] = await audioPerm.request();
      } catch {
        results['audio'] = false;
      }
    }

    const order = ['notifications', 'camera', 'clipboard', 'nfc'];

    const interactivePerms = supported.filter(p => p.id !== 'audio');
    interactivePerms.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });

    for (const perm of interactivePerms) {
      if (perm.id === 'notifications' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        results['notifications'] = true;
        continue;
      }

      try {
        const res = await perm.request();
        results[perm.id] = res;
      } catch (err) {
        results[perm.id] = false;
      }
    }

    this.isModalVisible.value = false;
    useEventsBus().emit('permissionsUpdated', results);

    return results;
  }

  public async shouldShowPrompt(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const supported = this.getSupportedPermissions().value;
    if (supported.length === 0) return false;

    const statuses = await this.getPermissionStatuses();

    const hasAnyDenied = supported.some(perm => statuses[perm.id] === 'denied');
    if (hasAnyDenied) {
      return true;
    }

    const hasUngranted = supported.some(perm => {
      if (perm.optional) return false;
      const status = statuses[perm.id];

      if ((isSafariBrowser || isFirefoxBrowser) && perm.id === 'camera') {
        return false;
      }

      return status !== 'granted' && status !== 'unsupported';
    });

    return hasUngranted;
  }

  public prompt() {
    this.isModalVisible.value = true;
  }

  public dismiss() {
    this.isModalVisible.value = false;
  }
}

export const permissionManager = PermissionManager.getInstance();

if (typeof window !== 'undefined') {
  (window as any).permissionManager = permissionManager;
}

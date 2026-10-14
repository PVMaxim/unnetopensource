import { ref, computed } from 'vue';
import { PermissionItem, PermissionStatus } from './types';
import { useEventsBus } from '@/plugins/eventBus';
import { isSafariBrowser, isFirefoxBrowser } from '@/plugins/checkDevice';

// --- Extracted Permission Functions ---

// 1. Notifications
export const isNotificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const checkNotificationsPermission = async (): Promise<PermissionStatus> => {
  if (!isNotificationsSupported()) {
    console.log("[PermissionManager] Background check: Notifications unsupported.");
    return 'unsupported';
  }
  try {
    if (navigator.permissions && (navigator.permissions as any).query) {
      const queryRes = await navigator.permissions.query({ name: 'notifications' as any });
      if (queryRes.state === 'granted') {
        console.log("[PermissionManager] Background check: Notifications access allowed.");
        return 'granted';
      }
      if (queryRes.state === 'denied') {
        console.log("[PermissionManager] Background check: Notifications access denied.");
        return 'denied';
      }
      console.log("[PermissionManager] Background check: Notifications state is 'prompt'.");
      return 'prompt';
    }
  } catch {
    // fallback
  }
  const perm = Notification.permission;
  if (perm === 'granted') {
    console.log("[PermissionManager] Background check: Notifications access allowed (fallback).");
    return 'granted';
  }
  if (perm === 'denied') {
    console.log("[PermissionManager] Background check: Notifications access denied (fallback).");
    return 'denied';
  }
  console.log("[PermissionManager] Background check: Notifications state is 'prompt' (fallback).");
  return 'prompt';
};
export const requestNotificationsPermission = async () => {
  try {
    if (isNotificationsSupported()) {
      if (Notification.permission === 'granted') {
        console.log("[PermissionManager] Notifications request: Already granted.");
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
        console.log("[PermissionManager] Notifications request: Access allowed.");
        return true;
      } else {
        console.log("[PermissionManager] Notifications request: Access denied.");
        return false;
      }
    }
    console.log("[PermissionManager] Notifications request: Unsupported.");
    return false;
  } catch (e: any) {
    console.warn('[PermissionManager] Notifications request: Error:', e.message);
    return false;
  }
};

// 2. Audio
export const isAudioSupported = () => typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
export const checkAudioPermission = async (): Promise<PermissionStatus> => {
  if (!isAudioSupported()) {
    console.log("[PermissionManager] Background check: Audio unsupported.");
    return 'unsupported';
  }
  console.log("[PermissionManager] Background check: Audio access implicitly allowed.");
  return 'granted';
};
export const requestAudioPermission = async () => {
  try {
    return true;
  } catch (e: any) {
    console.warn('[PermissionManager] Audio request: Error:', e.message);
    return false;
  }
};

// 3. Camera
export const isCameraSupported = () => typeof navigator !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia || (navigator as any).getUserMedia);
export const checkCameraPermission = async (): Promise<PermissionStatus> => {
  if (!isCameraSupported()) {
    console.log("[PermissionManager] Background check: Camera unsupported.");
    return 'unsupported';
  }
  try {
    if (navigator.permissions && (navigator.permissions as any).query) {
      const status = await navigator.permissions.query({ name: 'camera' as any });
      if (status.state === 'granted') {
        console.log("[PermissionManager] Background check: Camera access allowed.");
        return 'granted';
      }
      if (status.state === 'denied') {
        console.log("[PermissionManager] Background check: Camera access denied.");
        return 'denied';
      }
      console.log("[PermissionManager] Background check: Camera state is 'prompt'.");
      return 'prompt';
    }
  } catch (err: any) {
    // Safari / WebKit / Firefox fallback
    // Firefox throws TypeError on querying 'camera'
  }
  if (navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      if (videoDevices.length > 0 && videoDevices.some(d => d.label !== '')) {
        console.log("[PermissionManager] Background check: Camera access allowed (via labels).");
        return 'granted';
      }
    } catch {
      // ignore
    }
  }
  console.log("[PermissionManager] Background check: Camera state is 'prompt' (fallback).");
  return 'prompt';
};
export const requestCameraPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    console.log("[PermissionManager] Camera request: Access allowed");
    return true;
  } catch (err: any) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      console.log("[PermissionManager] Camera request: Access denied by user or system.");
    } else {
      console.log("[PermissionManager] Camera request: An error occurred:", err.message);
    }
    return false;
  }
};

// 4. NFC
export const isNfcSupported = () => typeof window !== 'undefined' && 'NDEFReader' in window;
export const checkNfcPermission = async (): Promise<PermissionStatus> => {
  if (!isNfcSupported()) {
    console.log("[PermissionManager] Background check: NFC unsupported.");
    return 'unsupported';
  }
  try {
    if (navigator.permissions && (navigator.permissions as any).query) {
      const status = await navigator.permissions.query({ name: 'nfc' as any });
      if (status.state === 'granted') {
        console.log("[PermissionManager] Background check: NFC access allowed.");
        return 'granted';
      }
      if (status.state === 'denied') {
        console.log("[PermissionManager] Background check: NFC access denied.");
        return 'denied';
      }
      console.log("[PermissionManager] Background check: NFC state is 'prompt'.");
      return 'prompt';
    }
  } catch {
    // ignore
  }
  console.log("[PermissionManager] Background check: NFC state is 'prompt' (fallback).");
  return 'prompt';
};
export const requestNfcPermission = async () => {
  try {
    if ('NDEFReader' in window) {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      console.log("[PermissionManager] NFC request: Access allowed.");
      return true;
    }
    console.log("[PermissionManager] NFC request: Unsupported.");
    return false;
  } catch (e: any) {
    console.warn('[PermissionManager] NFC request: Error / Denied:', e.message);
    return false;
  }
};

// 5. Clipboard
export const isClipboardSupported = () => typeof navigator !== 'undefined' && !!navigator.clipboard?.readText && !isSafariBrowser;
export const checkClipboardPermission = async (): Promise<PermissionStatus> => {
  if (!isClipboardSupported()) {
    console.log("[PermissionManager] Background check: Clipboard unsupported.");
    return 'unsupported';
  }
  try {
    if (navigator.permissions && (navigator.permissions as any).query) {
      const status = await navigator.permissions.query({ name: 'clipboard-read' as any });
      if (status.state === 'granted') {
        console.log("[PermissionManager] Background check: Clipboard access allowed.");
        return 'granted';
      }
      if (status.state === 'denied') {
        console.log("[PermissionManager] Background check: Clipboard access denied.");
        return 'denied';
      }
      console.log("[PermissionManager] Background check: Clipboard state is 'prompt'.");
      return 'prompt';
    }
  } catch {
    // ignore
  }
  console.log("[PermissionManager] Background check: Clipboard state is 'prompt' (fallback).");
  return 'prompt';
};
export const requestClipboardPermission = async () => {
  if (isSafariBrowser) {
    console.log("[PermissionManager] Clipboard request: Skipped (Safari doesn't support automatic clipboard requests).");
    return false;
  }
  try {
    if (navigator?.clipboard?.readText) {
      await navigator.clipboard.readText();
      console.log("[PermissionManager] Clipboard request: Access allowed.");
      return true;
    }
    console.log("[PermissionManager] Clipboard request: Unsupported.");
    return false;
  } catch (e: any) {
    console.warn('[PermissionManager] Clipboard request: Error / Denied:', e.message);
    return false;
  }
};

/**
 * Permission Manager
 * Centralized registry for all browser, system, and hardware permissions.
 * Modules and components can dynamically register additional permissions.
 */
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

  /**
   * Registers default core permissions (Notifications, Audio, Camera, NFC, Clipboard)
   */
  private registerDefaultPermissions() {
    // 1. Push / Web Notifications
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

    // 2. Sound & Chimes
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

    // 3. Camera & QR Scanner
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

    // 4. NFC Card Access (Web NFC)
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

    // 5. Clipboard (Read)
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

  /**
   * Registers an extensible permission item.
   * If a permission with this ID already exists, it is updated.
   */
  public register(item: PermissionItem) {
    const idx = this.permissionsList.value.findIndex(p => p.id === item.id);
    if (idx >= 0) {
      this.permissionsList.value[idx] = item;
    } else {
      this.permissionsList.value.push(item);
    }
  }

  /**
   * Returns all registered permissions
   */
  public getPermissions() {
    return this.permissionsList;
  }

  /**
   * Returns only supported permissions for the current device/browser
   */
  public getSupportedPermissions() {
    return computed(() => {
      return this.permissionsList.value.filter(p => !p.isSupported || p.isSupported());
    });
  }

  /**
   * Evaluates and returns current permission statuses for all supported permissions.
   */
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

  /**
   * Requests a single permission by ID
   */
  public async requestSingle(permId: string): Promise<boolean> {
    const supported = this.getSupportedPermissions().value;
    const perm = supported.find(p => p.id === permId);
    if (!perm) return false;

    try {
      const res = await perm.request();
      useEventsBus().emit('permissionsUpdated', { [permId]: res });
      return res;
    } catch (e) {
      console.warn(`[PermissionManager] Error requesting permission ${permId}:`, e);
      return false;
    }
  }

  /**
   * Requests all ungranted supported permissions sequentially in response to user click gesture.
   */
  public async requestAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const supported = this.getSupportedPermissions().value;

    // 1. Audio first (sync gesture unlock)
    const audioPerm = supported.find(p => p.id === 'audio');
    if (audioPerm) {
      try {
        results['audio'] = await audioPerm.request();
      } catch {
        results['audio'] = false;
      }
    }

    // 2. Sequential execution for system/hardware dialogs:
    // Notifications STRICTLY requires a direct synchronous gesture in Safari and Chrome.
    // If we await camera first, the gesture is lost and notifications will fail.
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
        console.warn(`[PermissionManager] Error requesting ${perm.id}:`, err);
        results[perm.id] = false;
      }
    }

    // Close modal and emit event
    this.isModalVisible.value = false;
    useEventsBus().emit('permissionsUpdated', results);

    return results;
  }

  /**
   * Checks if permission prompt modal should be shown automatically.
   * Returns true in ANY case if at least one supported permission is 'denied'.
   * Also returns true if any mandatory (non-optional) permission is not yet granted.
   * In Safari: camera in 'prompt' state does NOT trigger modal.
   */
  public async shouldShowPrompt(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const supported = this.getSupportedPermissions().value;
    if (supported.length === 0) return false;

    const statuses = await this.getPermissionStatuses();

    // 1. Показываем окно В ЛЮБОМ СЛУЧАЕ, если хотя бы одно поддерживаемое разрешение 'denied'
    const hasAnyDenied = supported.some(perm => statuses[perm.id] === 'denied');
    if (hasAnyDenied) {
      return true;
    }

    // 2. Иначе проверяем, есть ли незапрошенные обязательные разрешения:
    const hasUngranted = supported.some(perm => {
      if (perm.optional) return false;
      const status = statuses[perm.id];

      // В Safari и Firefox камера в статусе 'prompt' не триггерит модалку ('denied' уже обработан выше)
      if ((isSafariBrowser || isFirefoxBrowser) && perm.id === 'camera') {
        return false;
      }

      return status !== 'granted' && status !== 'unsupported';
    });

    return hasUngranted;
  }

  /**
   * Open the Permissions Modal
   */
  public prompt() {
    this.isModalVisible.value = true;
  }

  /**
   * Dismiss modal for the current session
   */
  public dismiss() {
    this.isModalVisible.value = false;
  }
}

export const permissionManager = PermissionManager.getInstance();

if (typeof window !== 'undefined') {
  (window as any).permissionManager = permissionManager;
}

/**
 * Push Notification Service
 *
 * PRIMARY sound delivery mechanism for the token detector.
 * Uses the browser Notification API / Service Worker showNotification
 * to trigger OS-level notification sounds and vibration.
 *
 * This is the ONLY reliable way to produce sound:
 * - Without requiring a per-play user gesture
 * - When the browser tab is in the background
 * - When the browser window is minimized
 *
 * Requires ONE-TIME permission grant (handled by PushPermissionModal).
 */

export class PushNotificationService {
  private static instance: PushNotificationService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isPermissionGranted = false;
  private initPromise: Promise<void>;

  private constructor() {
    this.initPromise = this.initServiceWorker();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initializes Service Worker registration and checks notification permission.
   */
  private async initServiceWorker() {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = reg;
      } catch (err) {
        // Service Worker registration failed — fallback to Notification constructor
      }
    }

    if ('Notification' in window) {
      this.isPermissionGranted = Notification.permission === 'granted';
    }
  }

  /**
   * Requests user permission for OS Push Notifications.
   * Must be called from a user gesture handler.
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      this.isPermissionGranted = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        let permission: NotificationPermission;
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = await new Promise<NotificationPermission>((resolve) => {
            Notification.requestPermission((result) => resolve(result));
          });
        }
        this.isPermissionGranted = permission === 'granted';
        return this.isPermissionGranted;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  /**
   * Triggers an OS notification with system sound.
   * This is INSTANT — no permission checks that could delay it.
   * If permission is not granted, silently does nothing.
   */
  public sendTokenAlert(title: string, body: string, icon = '/favicons/android-chrome-192x192.png') {
    if (typeof window === 'undefined') return;

    // Quick sync check — no await, no blocking
    if (!this.isPermissionGranted) {
      if ('Notification' in window && Notification.permission === 'granted') {
        this.isPermissionGranted = true;
      } else {
        return;
      }
    }

    // Fire and forget — no await
    this.showNotification(title, body, icon);
  }

  /**
   * Internal: show the notification via SW or Notification constructor.
   */
  private async showNotification(title: string, body: string, icon: string) {
    try {
      // Ensure SW is registered
      if (!this.swRegistration) {
        await this.initPromise;
      }

      if (this.swRegistration && 'showNotification' in this.swRegistration) {
        this.swRegistration.showNotification(title, {
          body,
          icon,
          badge: '/favicons/favicon-32x32.png',
          vibrate: [200, 100, 200],
          tag: 'wallet-tx-alert',
          renotify: true,
          silent: false,
          actions: [
            { action: 'open', title: 'Open' }
          ]
        } as any);
      } else if ('Notification' in window) {
        new Notification(title, { body, icon });
      }
    } catch (err) {
      // Last resort: plain Notification constructor
      try {
        if ('Notification' in window) {
          new Notification(title, { body, icon });
        }
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Helper to check if page is currently hidden / in background.
   */
  public isBackground(): boolean {
    return typeof document !== 'undefined' && document.hidden;
  }
}

export const pushService = PushNotificationService.getInstance();

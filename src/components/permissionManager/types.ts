export type PermissionId = 'camera' | 'nfc' | 'clipboard' | string;
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface PermissionItem {
  id: PermissionId;
  name: string;
  titleKey: string;
  descriptionKey: string;
  iconName?: string;
  iconComponent?: any;
  category?: 'system' | 'hardware' | 'network';
  optional?: boolean;
  isSupported?: () => boolean;
  checkStatus?: () => Promise<PermissionStatus> | PermissionStatus;
  request: () => Promise<boolean>;
}

export interface PermissionState {
  granted: boolean;
  status: PermissionStatus;
}

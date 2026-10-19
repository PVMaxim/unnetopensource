import PermissionsModal from './PermissionsModal.vue';
import { permissionManager } from './PermissionManager';

export * from './types';
export * from './PermissionManager';
export { PermissionsModal };

export function usePermissionManager() {
  return {
    permissionManager,
    isModalVisible: permissionManager.isModalVisible,
    statuses: permissionManager.statuses,
    supportedPermissions: permissionManager.getSupportedPermissions(),
    prompt: (force = true) => permissionManager.prompt(force),
    dismiss: (dontAskAgain = false) => permissionManager.dismiss(dontAskAgain),
    requestSingle: (id: string) => permissionManager.requestSingle(id),
    requestAll: () => permissionManager.requestAll(),
    getStatuses: () => permissionManager.getPermissionStatuses(),
  };
}

export default PermissionsModal;

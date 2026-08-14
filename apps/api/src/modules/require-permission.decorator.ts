import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from './rbac.js';

export const REQUIRED_PERMISSION = 'requiredPermission';
export const REQUIRED_PERMISSION_MODE = 'requiredPermissionMode';
export const REQUIRED_AUTH = 'requiredAuth';
export const RequirePermission = (permission: PermissionKey | PermissionKey[]) => SetMetadata(REQUIRED_PERMISSION, permission);
export const RequireAllPermissions = (...permissions: PermissionKey[]) => (
  target: object,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor
) => {
  SetMetadata(REQUIRED_PERMISSION, permissions)(target, propertyKey!, descriptor!);
  SetMetadata(REQUIRED_PERMISSION_MODE, 'all')(target, propertyKey!, descriptor!);
};
export const RequireAuth = () => SetMetadata(REQUIRED_AUTH, true);

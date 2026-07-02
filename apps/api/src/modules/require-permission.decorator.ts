import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from './rbac.js';

export const REQUIRED_PERMISSION = 'requiredPermission';
export const REQUIRED_AUTH = 'requiredAuth';
export const RequirePermission = (permission: PermissionKey | PermissionKey[]) => SetMetadata(REQUIRED_PERMISSION, permission);
export const RequireAuth = () => SetMetadata(REQUIRED_AUTH, true);

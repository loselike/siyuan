import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from './rbac.js';

export const REQUIRED_PERMISSION = 'requiredPermission';
export const RequirePermission = (permission: PermissionKey) => SetMetadata(REQUIRED_PERMISSION, permission);

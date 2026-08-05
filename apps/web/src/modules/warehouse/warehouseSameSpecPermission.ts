import type { PermissionKey } from '../../apiClient';

export function canUseWarehouseSameSpecReplenish(role: string, permissions: readonly PermissionKey[]) {
  return role === 'ADMIN' || permissions.includes('warehouse:in-stock:same-spec-replenish');
}

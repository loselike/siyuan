import type { PermissionKey, RoleKey } from '../../apiClient';

export function canViewOrderLifecycleBusinessCosts(
  role: RoleKey | string | undefined,
  permissions: readonly (PermissionKey | string)[] = []
) {
  return role === 'ADMIN'
    || permissions.includes('business:order-entry:business-cost-view')
    || permissions.includes('business:order-entry:business-cost-write');
}

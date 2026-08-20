import {
  defaultPermissionsForRole,
  effectivePermissionsForRole,
  isBuiltinRoleKey,
  type PermissionKey,
  type RoleKey
} from './rbac.js';

export const rolePermissionConfigurationMarker = 'system-internal:role-permissions-configured';

export function resolveStoredRolePermissions(role: RoleKey, permissions?: readonly string[]): PermissionKey[] {
  const explicitlyConfigured = permissions?.includes(rolePermissionConfigurationMarker) === true;
  const stored = (permissions ?? []).filter((permission) => permission !== rolePermissionConfigurationMarker) as PermissionKey[];
  const effective = permissions === undefined
    ? effectivePermissionsForRole(role)
    : explicitlyConfigured
      ? effectivePermissionsForRole(role, stored)
      : effectivePermissionsForRole(role, [...defaultPermissionsForRole(role), ...stored]);
  const legacySalesScopedCustomRole = !isBuiltinRoleKey(role)
    && role !== 'UG_MARKET'
    && stored.includes('business:order-entry:view')
    && stored.includes('master-data:customers:view-own');
  if (legacySalesScopedCustomRole && !effective.includes('data-scope:sales-own')) {
    effective.push('data-scope:sales-own');
  }
  return effective;
}

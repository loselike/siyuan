export type RoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'FINANCE' | 'CUSTOMER';
export type PermissionKey =
  | 'shipments:read'
  | 'shipments:write'
  | 'finance:read'
  | 'finance:settle'
  | 'master-data:read'
  | 'system:manage';

export interface Principal {
  id: string;
  username: string;
  role: RoleKey;
  customerId?: string;
}

export const rolePermissions: Record<RoleKey, PermissionKey[]> = {
  ADMIN: ['shipments:read', 'shipments:write', 'finance:read', 'finance:settle', 'master-data:read', 'system:manage'],
  CUSTOMER_SERVICE: ['shipments:read', 'shipments:write', 'master-data:read'],
  OPERATOR: ['shipments:read', 'shipments:write', 'master-data:read'],
  FINANCE: ['shipments:read', 'finance:read', 'finance:settle', 'master-data:read'],
  CUSTOMER: ['shipments:read', 'shipments:write', 'finance:read']
};

export function hasPermission(role: RoleKey, permission: PermissionKey): boolean {
  return rolePermissions[role].includes(permission);
}

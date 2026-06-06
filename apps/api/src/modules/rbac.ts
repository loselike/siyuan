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

export interface PermissionDefinition {
  code: PermissionKey;
  label: string;
  group: string;
}

export interface RolePermissionRow {
  key: RoleKey;
  label: string;
  account: string;
  scope: string;
  permissions: PermissionKey[];
  restriction: string;
}

export const permissionDefinitions: PermissionDefinition[] = [
  { code: 'shipments:read', label: '运单读取', group: '运单' },
  { code: 'shipments:write', label: '运单写入', group: '运单' },
  { code: 'finance:read', label: '财务读取', group: '财务' },
  { code: 'finance:settle', label: '财务核销', group: '财务' },
  { code: 'master-data:read', label: '基础资料读取', group: '资料' },
  { code: 'system:manage', label: '系统管理', group: '系统' }
];

export const rolePermissions: Record<RoleKey, PermissionKey[]> = {
  ADMIN: ['shipments:read', 'shipments:write', 'finance:read', 'finance:settle', 'master-data:read', 'system:manage'],
  CUSTOMER_SERVICE: ['shipments:read', 'shipments:write', 'master-data:read'],
  OPERATOR: ['shipments:read', 'shipments:write', 'master-data:read'],
  FINANCE: ['shipments:read', 'finance:read', 'finance:settle', 'master-data:read'],
  CUSTOMER: ['shipments:read', 'shipments:write', 'finance:read']
};

export const roleMetadata: Record<RoleKey, Omit<RolePermissionRow, 'permissions'>> = {
  ADMIN: {
    key: 'ADMIN',
    label: '系统管理员',
    account: 'admin',
    scope: '全局数据',
    restriction: '全部权限：运单、财务、基础资料、系统管理'
  },
  CUSTOMER_SERVICE: {
    key: 'CUSTOMER_SERVICE',
    label: '客服',
    account: 'service',
    scope: '客户与问题件',
    restriction: '运单读写、基础资料读取；不能核销、不能改系统权限'
  },
  OPERATOR: {
    key: 'OPERATOR',
    label: '操作',
    account: 'operator',
    scope: '仓库与履约',
    restriction: '运单读写、基础资料读取；不能改财务、不能改权限'
  },
  FINANCE: {
    key: 'FINANCE',
    label: '财务',
    account: 'finance',
    scope: '财务数据',
    restriction: '运单读取、财务读取、财务核销、基础资料读取；不能改系统权限'
  },
  CUSTOMER: {
    key: 'CUSTOMER',
    label: '客户',
    account: 'customer',
    scope: '本人客户数据',
    restriction: '客户门户、本人运单、本人费用、本人问题件'
  }
};

export function allPermissions(): PermissionKey[] {
  return permissionDefinitions.map((item) => item.code);
}

export function hasPermission(role: RoleKey, permission: PermissionKey): boolean {
  if (role === 'ADMIN') {
    return true;
  }
  return rolePermissions[role].includes(permission);
}

export function normalizeRolePermissions(role: RoleKey, permissions: PermissionKey[]): PermissionKey[] {
  if (role === 'ADMIN') {
    return allPermissions();
  }
  const allowed = new Set(allPermissions());
  return [...new Set(permissions)].filter((permission) => allowed.has(permission));
}

export function buildRolePermissionRow(role: RoleKey, permissions: PermissionKey[]): RolePermissionRow {
  return {
    ...roleMetadata[role],
    permissions: normalizeRolePermissions(role, permissions)
  };
}

export type RoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type PermissionKey =
  | 'workspace:access'
  | 'orders:read'
  | 'orders:write'
  | 'routing:read'
  | 'routing:write'
  | 'warehouse:read'
  | 'warehouse:write'
  | 'tracking:read'
  | 'tracking:write'
  | 'problems:read'
  | 'problems:write'
  | 'pricing:lookup'
  | 'pricing:manage'
  | 'finance:read'
  | 'finance:settle'
  | 'master-data:read'
  | 'master-data:write'
  | 'reports:read'
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
  { code: 'workspace:access', label: '运营工作台', group: '工作台' },
  { code: 'orders:read', label: '运单查看', group: '运单履约' },
  { code: 'orders:write', label: '运单操作', group: '运单履约' },
  { code: 'routing:read', label: '渠道排货查看', group: '渠道排货' },
  { code: 'routing:write', label: '渠道排货操作', group: '渠道排货' },
  { code: 'warehouse:read', label: '仓库查看', group: '仓库管理' },
  { code: 'warehouse:write', label: '仓库操作', group: '仓库管理' },
  { code: 'tracking:read', label: '轨迹查看', group: '轨迹监控' },
  { code: 'tracking:write', label: '轨迹操作', group: '轨迹监控' },
  { code: 'problems:read', label: '问题件查看', group: '问题件' },
  { code: 'problems:write', label: '问题件处理', group: '问题件' },
  { code: 'pricing:lookup', label: '报价查询', group: '报价查价' },
  { code: 'pricing:manage', label: '报价管理', group: '报价查价' },
  { code: 'finance:read', label: '财务查看', group: '财务结算' },
  { code: 'finance:settle', label: '财务核销', group: '财务结算' },
  { code: 'reports:read', label: '统计报表', group: '统计报表' },
  { code: 'master-data:read', label: '基础资料查看', group: '基础资料' },
  { code: 'master-data:write', label: '基础资料维护', group: '基础资料' },
  { code: 'system:manage', label: '系统设置', group: '系统设置' }
];

export const rolePermissions: Record<RoleKey, PermissionKey[]> = {
  ADMIN: allPermissions(),
  CUSTOMER_SERVICE: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'],
  OPERATOR: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'tracking:read', 'pricing:lookup', 'master-data:read'],
  WAREHOUSE: ['workspace:access', 'orders:read', 'warehouse:read', 'warehouse:write', 'tracking:read'],
  FINANCE: ['workspace:access', 'orders:read', 'pricing:lookup', 'finance:read', 'finance:settle', 'reports:read', 'master-data:read'],
  CUSTOMER: ['workspace:access', 'orders:read', 'orders:write', 'finance:read', 'problems:read', 'problems:write', 'pricing:lookup']
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
    label: '业务员',
    account: 'operator',
    scope: '客户出货与渠道排货',
    restriction: '可操作运单、排货和查询报价；不能查看成本、加价、价格表管理、财务核销和系统设置'
  },
  WAREHOUSE: {
    key: 'WAREHOUSE',
    label: '仓库',
    account: 'warehouse',
    scope: '入库、合票、打单、出货',
    restriction: '只处理仓库管理和必要轨迹查看；不能访问报价管理、财务和系统设置'
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

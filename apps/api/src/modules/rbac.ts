export type BuiltinRoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type RoleKey = BuiltinRoleKey | (string & {});
export type PermissionKey =
  | 'workspace:access'
  | 'orders:read'
  | 'orders:write'
  | 'orders:review:restore'
  | 'orders:review:purge'
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
  | 'finance:business-cost:read'
  | 'finance:business-cost:manage'
  | 'finance:business-cost:audit'
  | 'finance:business-cost:reverse'
  | 'finance:business-cost:void'
  | 'finance:business-cost:export'
  | 'finance:business-cost:view-all'
  | 'finance:business-cost:view-agent'
  | 'finance:business-cost:view-profit'
  | 'finance:order-fee:payable:view'
  | 'finance:order-fee:payable:manage'
  | 'finance:order-fee:profit:receivable-payable'
  | 'finance:order-fee:profit:receivable-business'
  | 'finance:order-fee:profit:business-payable'
  | 'finance:payable:read'
  | 'finance:payable:manage'
  | 'finance:payable:audit'
  | 'finance:payable:reverse'
  | 'finance:payable:void'
  | 'finance:payable:export'
  | 'finance:payable:payment'
  | 'finance:payable:bank'
  | 'finance:payable:attachment'
  | 'finance:payable:view-sensitive'
  | 'finance:payable:view-profit'
  | 'finance:payable:paid-read'
  | 'finance:payable:paid-confirm'
  | 'finance:payable:paid-reverse'
  | 'finance:payable:paid-export'
  | 'finance:payable:paid-voucher'
  | 'finance:payable:paid-bank-view'
  | 'finance:water-receipt:read'
  | 'finance:water-receipt:manage'
  | 'finance:water-receipt:arrive'
  | 'finance:water-receipt:match'
  | 'finance:water-receipt:adjust'
  | 'finance:water-receipt:void'
  | 'finance:water-receipt:archive'
  | 'finance:water-receipt:export'
  | 'finance:water-receipt:voucher'
  | 'finance:water-receipt:view-all'
  | 'master-data:read'
  | 'master-data:write'
  | 'master-data:customers:read'
  | 'master-data:customers:write'
  | 'master-data:finance:read'
  | 'master-data:finance:write'
  | 'master-data:agents:read'
  | 'master-data:agents:write'
  | 'master-data:agent-channels:read'
  | 'master-data:agent-channels:write'
  | 'master-data:channels:read'
  | 'master-data:channels:write'
  | 'master-data:channel-categories:read'
  | 'master-data:channel-categories:write'
  | 'master-data:remote-areas:read'
  | 'master-data:remote-areas:write'
  | 'master-data:exchange-rates:read'
  | 'master-data:exchange-rates:write'
  | 'master-data:assistant:read'
  | 'reports:read'
  | 'system:manage';

export interface Principal {
  id: string;
  username: string;
  role: RoleKey;
  customerId?: string;
  name?: string;
  phone?: string;
  gender?: string;
  nickname?: string;
  mustChangePassword?: boolean;
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
  description?: string;
  site?: string;
  sortOrder?: number;
  enabled?: boolean;
  systemBuiltin?: boolean;
}

export const permissionDefinitions: PermissionDefinition[] = [
  { code: 'workspace:access', label: '运营工作台', group: '工作台' },
  { code: 'orders:read', label: '运单查看', group: '我的订单' },
  { code: 'orders:write', label: '运单操作', group: '我的订单' },
  { code: 'orders:review:restore', label: '待审核恢复', group: '我的订单' },
  { code: 'orders:review:purge', label: '待审核彻底删除', group: '我的订单' },
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
  { code: 'finance:business-cost:read', label: '业务员成本查看', group: '财务结算' },
  { code: 'finance:business-cost:manage', label: '业务员成本维护', group: '财务结算' },
  { code: 'finance:business-cost:audit', label: '业务员成本审核', group: '财务结算' },
  { code: 'finance:business-cost:reverse', label: '业务员成本反审核', group: '财务结算' },
  { code: 'finance:business-cost:void', label: '业务员成本作废', group: '财务结算' },
  { code: 'finance:business-cost:export', label: '业务员成本导出', group: '财务结算' },
  { code: 'finance:business-cost:view-all', label: '业务员成本查看全部', group: '财务结算' },
  { code: 'finance:business-cost:view-agent', label: '业务员成本查看代理', group: '财务结算' },
  { code: 'finance:business-cost:view-profit', label: '业务员成本查看利润', group: '财务结算' },
  { code: 'finance:order-fee:payable:view', label: '单票费用查看应付', group: '财务结算' },
  { code: 'finance:order-fee:payable:manage', label: '单票费用维护应付', group: '财务结算' },
  { code: 'finance:order-fee:profit:receivable-payable', label: '单票费用应收应付利润', group: '财务结算' },
  { code: 'finance:order-fee:profit:receivable-business', label: '单票费用应收业务利润', group: '财务结算' },
  { code: 'finance:order-fee:profit:business-payable', label: '单票费用业务应付利润', group: '财务结算' },
  { code: 'finance:payable:read', label: '市场应付审核查看', group: '财务结算' },
  { code: 'finance:payable:manage', label: '应付费用维护', group: '财务结算' },
  { code: 'finance:payable:audit', label: '应付费用审核', group: '财务结算' },
  { code: 'finance:payable:reverse', label: '应付反审核', group: '财务结算' },
  { code: 'finance:payable:void', label: '应付作废', group: '财务结算' },
  { code: 'finance:payable:export', label: '应付导出', group: '财务结算' },
  { code: 'finance:payable:payment', label: '待付款维护', group: '财务结算' },
  { code: 'finance:payable:bank', label: '代理银行维护', group: '财务结算' },
  { code: 'finance:payable:attachment', label: '应付账单截图', group: '财务结算' },
  { code: 'finance:payable:view-sensitive', label: '应付敏感字段', group: '财务结算' },
  { code: 'finance:payable:view-profit', label: '应付利润查看', group: '财务结算' },
  { code: 'finance:payable:paid-read', label: '待支付/已支付查看', group: '财务结算' },
  { code: 'finance:payable:paid-confirm', label: '确认付款', group: '财务结算' },
  { code: 'finance:payable:paid-reverse', label: '已支付反核销', group: '财务结算' },
  { code: 'finance:payable:paid-export', label: '已支付导出', group: '财务结算' },
  { code: 'finance:payable:paid-voucher', label: '付款水单维护', group: '财务结算' },
  { code: 'finance:payable:paid-bank-view', label: '付款银行查看', group: '财务结算' },
  { code: 'finance:water-receipt:read', label: '水单查看', group: '财务结算' },
  { code: 'finance:water-receipt:manage', label: '水单维护', group: '财务结算' },
  { code: 'finance:water-receipt:arrive', label: '水单到账确认', group: '财务结算' },
  { code: 'finance:water-receipt:match', label: '水单匹配应收', group: '财务结算' },
  { code: 'finance:water-receipt:adjust', label: '已到账金额调整', group: '财务结算' },
  { code: 'finance:water-receipt:void', label: '水单作废', group: '财务结算' },
  { code: 'finance:water-receipt:archive', label: '水单归档', group: '财务结算' },
  { code: 'finance:water-receipt:export', label: '水单导出', group: '财务结算' },
  { code: 'finance:water-receipt:voucher', label: '水单凭证维护', group: '财务结算' },
  { code: 'finance:water-receipt:view-all', label: '水单查看全部', group: '财务结算' },
  { code: 'reports:read', label: '统计报表', group: '统计报表' },
  { code: 'master-data:read', label: '基础资料查看', group: '基础资料' },
  { code: 'master-data:write', label: '基础资料维护', group: '基础资料' },
  { code: 'master-data:customers:read', label: '客户资料查看', group: '基础资料' },
  { code: 'master-data:customers:write', label: '客户资料维护', group: '基础资料' },
  { code: 'master-data:finance:read', label: '财务资料查看', group: '基础资料' },
  { code: 'master-data:finance:write', label: '财务资料维护', group: '基础资料' },
  { code: 'master-data:agents:read', label: '代理资料查看', group: '基础资料' },
  { code: 'master-data:agents:write', label: '代理资料维护', group: '基础资料' },
  { code: 'master-data:agent-channels:read', label: '代理渠道查看', group: '基础资料' },
  { code: 'master-data:agent-channels:write', label: '代理渠道维护', group: '基础资料' },
  { code: 'master-data:channels:read', label: '公司渠道查看', group: '基础资料' },
  { code: 'master-data:channels:write', label: '公司渠道维护', group: '基础资料' },
  { code: 'master-data:channel-categories:read', label: '渠道类别查看', group: '基础资料' },
  { code: 'master-data:channel-categories:write', label: '渠道类别维护', group: '基础资料' },
  { code: 'master-data:remote-areas:read', label: '偏远查看', group: '基础资料' },
  { code: 'master-data:remote-areas:write', label: '偏远维护', group: '基础资料' },
  { code: 'master-data:exchange-rates:read', label: '汇率查看', group: '基础资料' },
  { code: 'master-data:exchange-rates:write', label: '汇率维护', group: '基础资料' },
  { code: 'master-data:assistant:read', label: '资料辅助查看', group: '基础资料' },
  { code: 'system:manage', label: '系统设置', group: '系统设置' }
];

export const builtinRoleKeys: BuiltinRoleKey[] = ['ADMIN', 'CUSTOMER_SERVICE', 'OPERATOR', 'WAREHOUSE', 'FINANCE', 'CUSTOMER'];

export function isBuiltinRoleKey(role: string): role is BuiltinRoleKey {
  return builtinRoleKeys.includes(role as BuiltinRoleKey);
}

export const defaultRoleGroups: Array<{
  key: RoleKey;
  label: string;
  description?: string;
  site?: string;
  sortOrder: number;
  templateRole: BuiltinRoleKey;
}> = [
  { key: 'UG_WAREHOUSE_RECEIVE', label: '仓库收货', site: '深圳思远', sortOrder: 1, templateRole: 'WAREHOUSE' },
  { key: 'UG_WAREHOUSE_OUTBOUND', label: '仓库出货', site: '深圳思远', sortOrder: 2, templateRole: 'WAREHOUSE' },
  { key: 'UG_CUSTOMER_SERVICE', label: '客服', description: '处理一般客服工作', site: '深圳思远', sortOrder: 3, templateRole: 'CUSTOMER_SERVICE' },
  { key: 'UG_FINANCE', label: '财务', site: '深圳思远', sortOrder: 4, templateRole: 'FINANCE' },
  { key: 'UG_PAYABLE_FINANCE', label: '出入账财务', description: '处理代理结算', site: '深圳思远', sortOrder: 5, templateRole: 'FINANCE' },
  { key: 'UG_MARKET', label: '市场部', description: '处理排货', site: '深圳思远', sortOrder: 6, templateRole: 'OPERATOR' },
  { key: 'UG_BUSINESS', label: '业务部', sortOrder: 7, templateRole: 'OPERATOR' },
  { key: 'UG_SZ_WUHAN', label: '深圳思远武汉', sortOrder: 8, templateRole: 'OPERATOR' },
  { key: 'UG_ZZ_SIHUA', label: '漳州思华', sortOrder: 9, templateRole: 'OPERATOR' },
  { key: 'UG_WH_JIUYULIAN', label: '武汉九域联', sortOrder: 10, templateRole: 'OPERATOR' },
  { key: 'UG_BUSINESS_MANAGER', label: '业务经理', sortOrder: 11, templateRole: 'OPERATOR' },
  { key: 'UG_BUSINESS_SUPERVISOR', label: '业务主管', sortOrder: 12, templateRole: 'OPERATOR' }
];

export const rolePermissions: Record<BuiltinRoleKey, PermissionKey[]> = {
  ADMIN: allPermissions(),
  CUSTOMER_SERVICE: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'],
  OPERATOR: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:write', 'master-data:channels:read'],
  WAREHOUSE: ['workspace:access', 'orders:read', 'warehouse:read', 'warehouse:write', 'tracking:read'],
  FINANCE: ['workspace:access', 'orders:read', 'orders:review:restore', 'pricing:lookup', 'finance:read', 'finance:settle', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:audit', 'finance:business-cost:reverse', 'finance:business-cost:void', 'finance:business-cost:export', 'finance:business-cost:view-all', 'finance:business-cost:view-agent', 'finance:business-cost:view-profit', 'finance:order-fee:payable:view', 'finance:order-fee:payable:manage', 'finance:order-fee:profit:receivable-payable', 'finance:order-fee:profit:receivable-business', 'finance:order-fee:profit:business-payable', 'finance:payable:read', 'finance:payable:manage', 'finance:payable:audit', 'finance:payable:reverse', 'finance:payable:void', 'finance:payable:export', 'finance:payable:payment', 'finance:payable:bank', 'finance:payable:attachment', 'finance:payable:view-sensitive', 'finance:payable:view-profit', 'finance:payable:paid-read', 'finance:payable:paid-confirm', 'finance:payable:paid-reverse', 'finance:payable:paid-export', 'finance:payable:paid-voucher', 'finance:payable:paid-bank-view', 'finance:water-receipt:read', 'finance:water-receipt:manage', 'finance:water-receipt:arrive', 'finance:water-receipt:match', 'finance:water-receipt:adjust', 'finance:water-receipt:void', 'finance:water-receipt:archive', 'finance:water-receipt:export', 'finance:water-receipt:voucher', 'finance:water-receipt:view-all', 'reports:read', 'master-data:read', 'master-data:agents:read'],
  CUSTOMER: ['workspace:access', 'orders:read', 'orders:write', 'finance:read', 'problems:read', 'problems:write', 'pricing:lookup']
};

export const roleMetadata: Record<BuiltinRoleKey, Omit<RolePermissionRow, 'permissions'>> = {
  ADMIN: {
    key: 'ADMIN',
    label: '管理员组',
    account: 'admin',
    scope: '全局数据',
    restriction: '系统管理员：全部权限，运单、财务、基础资料、系统管理'
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
    restriction: '可操作运单、排货、查询报价和维护自己范围的业务成本；不能查看代理、全部成本、价格表管理、财务核销和系统设置'
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
  return defaultPermissionsForRole(role).includes(permission);
}

export function normalizeRolePermissions(role: RoleKey, permissions: PermissionKey[]): PermissionKey[] {
  if (role === 'ADMIN') {
    return allPermissions();
  }
  const allowed = new Set(allPermissions());
  return [...new Set(permissions)].filter((permission) => allowed.has(permission));
}

export function defaultPermissionsForRole(role: RoleKey): PermissionKey[] {
  return isBuiltinRoleKey(role) ? rolePermissions[role] : [];
}

export function getRoleMetadata(role: RoleKey): Omit<RolePermissionRow, 'permissions'> {
  if (isBuiltinRoleKey(role)) {
    return roleMetadata[role];
  }
  return {
    key: role,
    label: role,
    account: '-',
    scope: '自定义用户组',
    restriction: '按勾选权限执行',
    sortOrder: 0,
    enabled: true,
    systemBuiltin: false
  };
}

export function buildRolePermissionRow(role: RoleKey, permissions: PermissionKey[], metadata: Partial<Omit<RolePermissionRow, 'key' | 'permissions'>> = {}): RolePermissionRow {
  return {
    ...getRoleMetadata(role),
    ...metadata,
    key: role,
    permissions: normalizeRolePermissions(role, permissions)
  };
}

import { createHmac } from 'node:crypto';
import { PRICING_BUSINESS_CAPABILITIES, PRICING_MODULES } from '@siyuan/shared';
import type { PermissionKey } from '@siyuan/shared/permissions';

export type { PermissionKey } from '@siyuan/shared/permissions';

export type BuiltinRoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type RoleKey = BuiltinRoleKey | (string & {});
export const YOYO_ADMIN_ROLE_KEY = 'UG_796F796FE7AEA1E79086E591' as const;

export function isAdministratorRole(role: string | undefined): boolean {
  return role === 'ADMIN' || role === YOYO_ADMIN_ROLE_KEY;
}

export function toSessionRole(role: RoleKey): RoleKey {
  return isAdministratorRole(role) ? 'ADMIN' : role;
}
export interface Principal {
  id: string;
  username: string;
  role: RoleKey;
  assignedRole?: RoleKey;
  roleLabel?: string;
  site?: string;
  customerId?: string;
  name?: string;
  phone?: string;
  gender?: string;
  nickname?: string;
  mustChangePassword?: boolean;
  dataScope?: 'SALES_OWN';
  departmentId?: string;
  directManagerId?: string;
  departmentTeamScope?: string[];
  /** Runtime effective permissions hydrated from the authoritative role store. */
  effectivePermissions?: PermissionKey[];
  shipmentAllView?: boolean;
  /** 财务模块显式全量查看能力；不等同于业务员/经理订单费用归属范围。 */
  financeAllView?: boolean;
  /** 应收费用资源的全量单票查看能力；不能由运单或其他财务资源权限推导。 */
  financeReceivableAllView?: boolean;
  globalFieldMasks?: GlobalFieldMaskState;
  /** Opaque client cache boundary; derived from the hydrated authorization scope. */
  warehouseScopeFingerprint?: string;
}

export function createPrincipalScopeFingerprint(
  principal: Principal,
  permissions: PermissionKey[] = [],
  secret: string
) {
  const scope = {
    id: principal.id,
    username: principal.username,
    customerId: principal.customerId ?? null,
    name: principal.name ?? null,
    nickname: principal.nickname ?? null,
    site: principal.site ?? null,
    role: principal.role,
    assignedRole: principal.assignedRole ?? null,
    roleLabel: principal.roleLabel ?? null,
    dataScope: principal.dataScope ?? null,
    shipmentAllView: principal.shipmentAllView === true,
    departmentTeamScope: Array.from(new Set(principal.departmentTeamScope ?? [])).sort(),
    permissions: Array.from(new Set(permissions)).sort()
  };
  return createHmac('sha256', secret)
    .update(`siyuan:warehouse-scope:v1:${JSON.stringify(scope)}`)
    .digest('hex');
}

/**
 * Only explicit global finance capabilities may bypass an order-fee owner
 * scope. Ordinary maintenance permissions must still use resource scope.
 */
const explicitFinanceAllViewPermissions: readonly PermissionKey[] = [
  'finance:receivable:view-all',
  'finance:business-cost:view-all'
];

export function hasExplicitFinanceReceivableAllViewPermission(permissions: readonly PermissionKey[]) {
  return permissions.includes('finance:receivable:view-all');
}

export function hasExplicitFinanceAllViewPermission(permissions: readonly PermissionKey[]) {
  return permissions.some((permission) => explicitFinanceAllViewPermissions.includes(permission));
}

export interface PermissionDefinition {
  code: PermissionKey;
  label: string;
  group: string;
  assignable?: boolean;
}

export type PermissionWorkspaceKey =
  | 'operations'
  | 'pricing'
  | 'business'
  | 'warehouse'
  | 'market'
  | 'customerService'
  | 'tracking'
  | 'finance'
  | 'miscFees'
  | 'master'
  | 'system';

export type GlobalFieldMaskKey =
  | 'agent-short-name'
  | 'agent-company-name'
  | 'agent-channel'
  | 'agent-data'
  | 'payable-cost'
  | 'payable-status';

export const globalFieldMaskKeys: readonly GlobalFieldMaskKey[] = [
  'agent-short-name',
  'agent-company-name',
  'agent-channel',
  'agent-data',
  'payable-cost',
  'payable-status'
];

const globalFieldMaskLabels: Record<GlobalFieldMaskKey, string> = {
  'agent-short-name': '屏蔽代理简称',
  'agent-company-name': '屏蔽代理详细公司名',
  'agent-channel': '屏蔽代理渠道',
  'agent-data': '屏蔽代理数据',
  'payable-cost': '屏蔽应付成本',
  'payable-status': '屏蔽应付状态'
};

export function globalFieldMaskPermissionCode(mask: GlobalFieldMaskKey): PermissionKey {
  return `system:global-mask:${mask}` as PermissionKey;
}

export type GlobalFieldMaskState = Record<GlobalFieldMaskKey, boolean>;

export function resolveGlobalFieldMaskState(permissions: readonly PermissionKey[]): GlobalFieldMaskState {
  const granted = new Set(permissions);
  const state = Object.fromEntries(globalFieldMaskKeys.map((key) => [
    key,
    granted.has(globalFieldMaskPermissionCode(key))
  ])) as GlobalFieldMaskState;
  if (state['agent-data']) {
    state['agent-short-name'] = true;
    state['agent-company-name'] = true;
    state['agent-channel'] = true;
  }
  return state;
}

export function isPaymentVoucherGloballyMasked(state: GlobalFieldMaskState | undefined): boolean {
  return state?.['agent-short-name'] === true
    || state?.['agent-company-name'] === true
    || state?.['agent-channel'] === true
    || state?.['agent-data'] === true
    || state?.['payable-cost'] === true
    || state?.['payable-status'] === true;
}

export function isFinanceBankDataGloballyMasked(state: GlobalFieldMaskState | undefined): boolean {
  return state?.['agent-short-name'] === true
    || state?.['agent-company-name'] === true
    || state?.['agent-channel'] === true
    || state?.['agent-data'] === true
    || state?.['payable-cost'] === true;
}

export function applyGlobalPermissionDenies(permissions: readonly PermissionKey[]): PermissionKey[] {
  const masks = resolveGlobalFieldMaskState(permissions);
  return permissions.filter((permission) => {
    if (isFinanceBankDataGloballyMasked(masks)) {
      if (permission === 'finance:pending-payment:create'
        || permission === 'finance:pending-payment:bank-select'
        || permission === 'finance:pending-payment:bank-manage'
        || permission === 'finance:paid-payment:confirm'
        || permission === 'finance:paid-payment:bank-view'
        || permission === 'master-data:agents:bank-view'
        || permission === 'master-data:agents:bank-manage') return false;
    }
    if (masks['agent-short-name'] || masks['agent-company-name'] || masks['agent-channel'] || masks['agent-data']) {
      if (/^pricing:price-books:(?:upload|import|legacy-source-import|legacy-rebuild|cleanup-original-agents)$/.test(permission)) return false;
      if (/^market:pending-routing:(?:route|edit|approve)$/.test(permission)) return false;
      if (permission === 'market:routed:replace-agent') return false;
      if (permission === 'customer-service:transfer:request-agent-change') return false;
      if (permission === 'finance:pending-payment:payment-voucher-upload'
        || permission === 'finance:paid-payment:voucher-upload'
        || permission === 'finance:paid-payment:voucher-delete') return false;
    }
    if (masks['agent-data']) {
      if (permission.startsWith('master-data:agents:') || permission.startsWith('master-data:agent-channels:')) return false;
      if (permission === 'business:shipment:agent-weight-view') return false;
      if (/^(customer-service|market):.*:(?:agent|agent-data|view-agent|view-agent-data|agent-view|agent-channel-view|agent-cost-view|agent-stats-view)$/.test(permission)) return false;
      if (permission.startsWith('finance:agent-bill:')) return false;
    }
    if (masks['agent-channel']) {
      if (permission.startsWith('master-data:agent-channels:')) return false;
      if (permission.endsWith(':agent-channel-view') || permission.endsWith(':channel-mode-stats-view')) return false;
    }
    if (masks['payable-cost']) {
      if (permission.startsWith('master-data:payer-banks:')) return false;
      if (/^market:pending-routing:(?:route|edit|approve)$/.test(permission)) return false;
      if (permission === 'market:routed:replace-agent') return false;
      if (permission.startsWith('market:pending-routing:payable-cost:')) return false;
      if (/^finance:payable:(?:manage|export|payment|attachment|attachment-view|view-sensitive|view-profit|paid-export|paid-voucher)$/.test(permission)) return false;
      if (/^finance:pending-payment:(?:create|update|bill-voucher-view|payment-voucher-view|payment-voucher-upload|export|view-sensitive)$/.test(permission)) return false;
      if (/^finance:paid-payment:(?:update|voucher-view|voucher-upload|voucher-delete|export|view-sensitive)$/.test(permission)) return false;
      if (/^finance:agent-bill:(?:import|save|difference-manage|difference-resolve|attachment-view|export|view-sensitive)$/.test(permission)) return false;
      if (/^pricing:price-books:(?:upload|import|legacy-source-import|legacy-rebuild|cleanup-original-agents|cost-row-view|export)$/.test(permission)) return false;
      if (permission === 'business:order-entry:payable-fee' || permission === 'business:shipment:payable-view' || permission === 'business:shipment:profit-view') return false;
      if (/:(?:payable-cost-view|agent-cost-view|cost-total-view|cost-view|view-profit)$/.test(permission)) return false;
      if (/^misc-fee:[^:]+:(?:create|update|export|view-payable|settlement-generate)$/.test(permission)) return false;
      if (/^misc-fee:[^:]+:attachment-view$/.test(permission)) return false;
    }
    if (masks['payable-status']) {
      if (/^market:pending-routing:(?:route|edit|approve)$/.test(permission)) return false;
      if (permission === 'market:routed:replace-agent') return false;
      if (/^finance:payable:(?:audit|reverse|void|payment|paid-confirm|paid-reverse|batch-audit|batch-reverse|batch-void)$/.test(permission)) return false;
      if (/^finance:pending-payment:(?:create|update|cancel|payment-voucher-upload)$/.test(permission)) return false;
      if (/^finance:paid-payment:(?:confirm|update|reverse|voucher-upload|voucher-delete)$/.test(permission)) return false;
      if (/^finance:agent-bill:(?:save|difference-resolve|archive|reverse-archive)$/.test(permission)) return false;
      if (/^finance:(?:pending-payment:(?:payment-voucher-view)|paid-payment:voucher-view|payable:paid-voucher)$/.test(permission)) return false;
      if (/^misc-fee:[^:]+:(?:confirm|audit|reverse-audit|void|match|hang|hang-approve|settlement-generate|settlement-audit|settlement-reverse)$/.test(permission)) return false;
    }
    return true;
  });
}

const globalFieldMaskPermissionDefinitions: PermissionDefinition[] = globalFieldMaskKeys.map((mask) => ({
  code: globalFieldMaskPermissionCode(mask),
  label: `总规则 · ${globalFieldMaskLabels[mask]}`,
  group: '系统管理 / 角色权限分配'
}));

const miscFeeAssignableActions: Record<string, readonly string[]> = {
  kuayue: ['read', 'create', 'update', 'audit', 'reverse-audit', 'void', 'hang', 'attachment-view', 'attachment-upload'],
  pickup: ['read', 'create', 'update', 'audit', 'reverse-audit', 'void', 'match', 'hang', 'attachment-view', 'attachment-upload'],
  tally: ['read', 'create', 'update', 'confirm', 'audit', 'reverse-audit', 'void', 'hang', 'attachment-view', 'attachment-upload'],
  purchase: ['read', 'create', 'update', 'void', 'hang', 'attachment-view', 'attachment-upload'],
  delivery: ['read', 'create', 'confirm', 'audit', 'reverse-audit', 'void', 'match', 'hang', 'attachment-view', 'attachment-upload'],
  hang: ['read', 'hang-approve'],
  'market-profit': ['read', 'settlement-generate', 'settlement-audit', 'settlement-reverse'],
  'warehouse-profit': ['read', 'settlement-generate', 'settlement-audit', 'settlement-reverse'],
  'finance-profit': ['read', 'export', 'settlement-generate', 'settlement-audit', 'settlement-reverse']
};

const miscFeeActionLabels: Record<string, string> = {
  read: '查看', create: '新增/导入', update: '修改', confirm: '确认', audit: '审核',
  'reverse-audit': '反审核', void: '作废/删除', match: '匹配业务成本', hang: '发起挂账',
  'hang-approve': '处理挂账', 'attachment-view': '查看附件', 'attachment-upload': '上传附件', export: '导出',
  'settlement-generate': '生成和维护结算单', 'settlement-audit': '审核和归档结算单',
  'settlement-reverse': '反审核结算单'
};

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
  administratorEquivalent?: boolean;
}

export const permissionDefinitions: PermissionDefinition[] = [
  { code: 'data-scope:sales-own', label: '业务员本人客户数据范围', group: '系统管理 / 数据范围', assignable: false },
  { code: 'data-scope:misc-fee-all', label: '杂费全部数据范围', group: '系统管理 / 数据范围', assignable: false },
  { code: 'data-scope:misc-fee-warehouse-site', label: '杂费仓库本站数据范围', group: '系统管理 / 数据范围', assignable: false },
  { code: 'data-scope:misc-fee-market', label: '杂费市场数据范围', group: '系统管理 / 数据范围', assignable: false },
  { code: 'operations:line-shipment:view', label: '查看专线运单池', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:detail', label: '查看运单详情', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:process', label: '处理运单', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:status-update', label: '修改运营状态', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:tracking-add', label: '添加运营轨迹', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:problem-create', label: '新建运营问题件', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:import', label: '导入运单', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:internal-log-view', label: '查看内部流通日志', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:export', label: '导出专线运单池', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:review-pending', label: '屏蔽待审核编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:waiting-sort', label: '屏蔽待排货编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:waiting-dispatch', label: '屏蔽待出库编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:outbounded', label: '屏蔽已出库编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:data-confirm', label: '屏蔽数据确认编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:transfer-no', label: '屏蔽转单号编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:waiting-departure', label: '屏蔽待离港编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:departed', label: '屏蔽已离港编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:arrived-port', label: '屏蔽已到港编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:delivering', label: '屏蔽已派送编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:signed', label: '屏蔽已签收编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:problem', label: '屏蔽问题件编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit-block:after-sale', label: '屏蔽售后编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:review-pending', label: '授权待审核编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:waiting-sort', label: '授权待排货编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:waiting-dispatch', label: '授权待出库编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:outbounded', label: '授权已出库编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:data-confirm', label: '授权数据确认编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:transfer-no', label: '授权转单号编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:waiting-departure', label: '授权待离港编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:departed', label: '授权已离港编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:arrived-port', label: '授权已到港编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:delivering', label: '授权已派送编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:signed', label: '授权已签收编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:problem', label: '授权问题件编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:stage-edit:after-sale', label: '授权售后编辑', group: '运营工作台 / 专线运单池' },
  { code: 'operations:ai-queue:view', label: '查看 AI 优先队列', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:assist', label: '调用运营 AI 助手', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:mark-read', label: '标记 AI 队列已读', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:handle', label: '处理 AI 推荐任务', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:product-map:view', label: '查看产品地图', group: '运营工作台 / 产品地图' },
  { code: 'operations:product-map:route-view', label: '查看产品渠道关系', group: '运营工作台 / 产品地图' },
  { code: 'operations:product-map:cost-sensitive-view', label: '查看产品地图敏感成本', group: '运营工作台 / 产品地图' },
  { code: 'operations:product-map:export', label: '导出产品地图', group: '运营工作台 / 产品地图' },
  { code: 'operations:import-quality:view', label: '查看导入质检', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:upload', label: '上传运单导入文件', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:retry', label: '重试导入', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:error-detail-view', label: '查看导入错误详情', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:confirm', label: '确认导入结果', group: '运营工作台 / 导入质检' },
  { code: 'business:dashboard:view', label: '查看业务看板', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:team-view', label: '查看团队统计', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:all-view', label: '查看全部统计', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:trend-view', label: '兼容：查看录单趋势', group: '业务管理 / 业务看板', assignable: false },
  { code: 'business:dashboard:pending-review-summary', label: '兼容：查看待审核摘要', group: '业务管理 / 业务看板', assignable: false },
  { code: 'business:order-entry:view', label: '录单页面技术入口', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-entry:edit', label: '编辑', group: '业务管理 / 录单' },
  { code: 'business:order-entry:business-cost', label: '业务成本', group: '业务管理 / 录单' },
  { code: 'business:order-entry:payable-fee', label: '应付费用', group: '业务管理 / 录单' },
  { code: 'business:order-entry:warehouse-package-select', label: '选择在仓货物录单', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-entry:create', label: '新建录单', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-entry:draft-view', label: '查看草稿箱', group: '业务管理 / 草稿箱' },
  { code: 'business:order-entry:draft-edit', label: '编辑草稿', group: '业务管理 / 草稿箱' },
  { code: 'business:order-entry:draft-delete', label: '删除草稿', group: '业务管理 / 草稿箱' },
  { code: 'business:order-entry:submit-review', label: '提交审核', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-entry:invoice-upload', label: '上传业务发票', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-entry:label-upload', label: '上传业务标签', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-fee:view', label: '兼容：查看订单费用', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-fee:create', label: '兼容：新增订单费用', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-fee:update', label: '兼容：修改订单费用', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-fee:delete', label: '兼容：删除订单费用', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-fee:lock', label: '兼容：锁定订单费用', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-fee:unlock', label: '兼容：解锁订单费用', group: '业务管理 / 录单', assignable: false },
  { code: 'business:order-fee:profit-view', label: '兼容：查看订单利润', group: '业务管理 / 录单', assignable: false },
  { code: 'business:review:view', label: '查看', group: '业务管理 / 待审核运单' },
  { code: 'business:review:edit', label: '编辑', group: '业务管理 / 待审核运单' },
  { code: 'business:shipment:list', label: '查看运单管理列表', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:detail', label: '查看运单详情', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:self-view', label: '查看本人运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:team-view', label: '查看团队运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:all-view', label: '查看全部运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:update-basic', label: '修改运单基础资料', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:update-operational', label: '兼容：修改运单运营资料', group: '业务管理 / 运单管理', assignable: false },
  { code: 'business:shipment:delete', label: '删除运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:payment-record', label: '登记收付款信息', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:tracking-add', label: '兼容：添加运单轨迹', group: '业务管理 / 运单管理', assignable: false },
  { code: 'business:shipment:problem-create', label: '创建运单问题件', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:finance-detail-view', label: '兼容：查看运单财务明细', group: '业务管理 / 运单管理', assignable: false },
  { code: 'business:shipment:receivable-view', label: '兼容：查看运单应收', group: '业务管理 / 运单管理', assignable: false },
  { code: 'business:shipment:payable-view', label: '兼容：查看运单应付', group: '业务管理 / 运单管理', assignable: false },
  { code: 'business:shipment:profit-view', label: '兼容：查看运单利润', group: '业务管理 / 运单管理', assignable: false },
  { code: 'business:shipment:agent-weight-view', label: '兼容：查看代理计费重', group: '业务管理 / 运单管理', assignable: false },
  { code: 'business:shipment:export', label: '兼容：导出运单', group: '业务管理 / 运单管理', assignable: false },
  { code: 'business:order-ai:view', label: '查看 AI 订单助手', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:assist', label: '调用 AI 订单助手', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:finance-context', label: '兼容：允许 AI 使用财务上下文', group: '业务管理 / AI 订单助手', assignable: false },
  { code: 'business:order-ai:all-order-context', label: '允许 AI 使用全部订单上下文', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:export-result', label: '兼容：导出 AI 订单结果', group: '业务管理 / AI 订单助手', assignable: false },
  { code: 'market:dashboard:view', label: '查看', group: '市场管理 / 市场看板' },
  { code: 'market:pending-routing:view', label: '查看', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:route', label: '排货', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:edit', label: '修改', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:approve', label: '审核', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:operation-log:view', label: '查看操作日志', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:business-cost:view', label: '查看业务成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:business-cost:create', label: '新增业务成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:business-cost:edit', label: '修改业务成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:business-cost:delete', label: '删除业务成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:payable-cost:view', label: '查看应付成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:payable-cost:create', label: '新增应付成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:payable-cost:edit', label: '修改应付成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:payable-cost:delete', label: '删除应付成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:return-review', label: '退回重审', group: '市场管理 / 待排货' },
  { code: 'market:routed:view', label: '查看', group: '市场管理 / 已排货' },
  { code: 'market:routed:reroute', label: '退回重排', group: '市场管理 / 已排货' },
  { code: 'market:routed:replace-agent', label: '处理代理变更', group: '市场管理 / 已排货' },
  { code: 'market:routed:routing-log:view', label: '查看排货日志', group: '市场管理 / 已排货' },
  { code: 'market:routing-report:view', label: '查看', group: '市场管理 / 排货数据' },
  { code: 'market:routing-report:export', label: '导出', group: '市场管理 / 排货数据' },
  { code: 'warehouse:dashboard:view', label: '查看', group: '仓库管理 / 仓库看板' },
  { code: 'warehouse:today-receipt:view', label: '查看', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:edit', label: '编辑', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:delete', label: '删除', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:manual-create', label: '手动添加收货', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:import', label: '批量导入', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:export', label: '批量下载', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:in-stock:view', label: '查看', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:edit', label: '编辑', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:delete', label: '删除', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:split', label: '拆票', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:tally', label: '发起理货', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:order-entry', label: '录单', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:import', label: '批量导入', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:export', label: '批量下载', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:tally-pending:view', label: '查看', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:detail', label: '查看任务', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:edit', label: '修改', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:start', label: '开始理货', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:process', label: '处理理货', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:restart', label: '退回重理', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:sort-rule-manage', label: '排序规则', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:problem-view', label: '查看理货问题件', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:shipment-create', label: '技术前置：创建理货出货单', group: '仓库管理 / 未完成理货', assignable: false },
  { code: 'warehouse:tally-completed:view', label: '查看', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-completed:print', label: '打印标签', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-completed:download', label: '下载标签', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-completed:scan', label: '扫描应用标签', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-completed:reverse', label: '反审核', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-completed:correct', label: '纠正历史数据', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:dispatch-pending:view', label: '查看', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:edit', label: '编辑', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:handover-print', label: '打印交接单', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:label-manage', label: '管理内部面单', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:shipping-mark-confirm', label: '确认贴唛头', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:confirm', label: '确认出库', group: '仓库管理 / 待出库' },
  { code: 'warehouse:outbounded:view', label: '查看', group: '仓库管理 / 已出库' },
  { code: 'warehouse:outbounded:export', label: '导出', group: '仓库管理 / 已出库' },
  { code: 'warehouse:rent-detail:view', label: '查看', group: '仓库管理 / 仓租细分表' },
  { code: 'warehouse:rent-detail:export', label: '导出', group: '仓库管理 / 仓租细分表' },
  { code: 'warehouse:rent-detail:edit', label: '编辑仓租规则', group: '仓库管理 / 仓租细分表' },
  { code: 'warehouse:rent-detail:scope-self', label: '仅本人客户', group: '仓库管理 / 仓租数据范围' },
  { code: 'warehouse:rent-detail:scope-team', label: '本人及直属组员', group: '仓库管理 / 仓租数据范围' },
  { code: 'warehouse:rent-detail:scope-site', label: '所属站点', group: '仓库管理 / 仓租数据范围' },
  { code: 'warehouse:rent-detail:scope-all', label: '全部站点', group: '仓库管理 / 仓租数据范围' },
  { code: 'tracking:carrier-task:sync', label: '同步轨迹', group: '物流轨迹管理 / 承运商任务' },
  { code: 'tracking:external:import', label: '导入轨迹', group: '物流轨迹管理 / 外部物流轨迹' },
  ...[
    ['carrier-task', 'view', '查看承运商任务', '承运商任务'], ['carrier-task', 'detail', '查看任务详情', '承运商任务'], ['carrier-task', 'run', '手动同步轨迹', '承运商任务'], ['carrier-task', 'retry', '重试失败任务', '承运商任务'], ['carrier-task', 'error-view', '查看失败原因', '承运商任务'], ['carrier-task', 'log-view', '查看同步日志', '承运商任务'],
    ['external', 'view', '查看外部物流轨迹', '外部物流轨迹'], ['external', 'latest-view', '查看最新物流轨迹', '外部物流轨迹'], ['external', 'stale-days-view', '查看未更新天数', '外部物流轨迹'], ['external', 'detail', '查看轨迹详情', '外部物流轨迹'], ['external', 'single-add', '单票添加轨迹', '外部物流轨迹'], ['external', 'import-upload', '上传轨迹表', '外部物流轨迹'], ['external', 'import-preview', '查看导入预览', '外部物流轨迹'], ['external', 'import-confirm', '确认导入轨迹', '外部物流轨迹'], ['external', 'import-error-view', '查看失败行', '外部物流轨迹'], ['external', 'unmatched-view', '查看未匹配单号', '外部物流轨迹'], ['external', 'overwrite', '覆盖最新物流轨迹', '外部物流轨迹'], ['external', 'customer-visible-update', '更新客户可见轨迹', '外部物流轨迹'], ['external', 'export', '导出轨迹列表', '外部物流轨迹']
  ].map(([section, action, label, group]) => {
    const code = `tracking:${section}:${action}` as PermissionKey;
    const legacyRuntimeOnly = new Set<PermissionKey>([
      'tracking:carrier-task:detail', 'tracking:carrier-task:run', 'tracking:carrier-task:retry', 'tracking:carrier-task:error-view',
      'tracking:carrier-task:log-view',
      'tracking:external:latest-view', 'tracking:external:stale-days-view', 'tracking:external:single-add',
      'tracking:external:import-upload', 'tracking:external:import-preview', 'tracking:external:import-confirm',
      'tracking:external:import-error-view', 'tracking:external:unmatched-view', 'tracking:external:overwrite',
      'tracking:external:customer-visible-update', 'tracking:external:export'
    ]);
    return { code, label: legacyRuntimeOnly.has(code) ? `兼容：${label}` : label, group: `物流轨迹管理 / ${group}`, assignable: legacyRuntimeOnly.has(code) ? false : undefined };
  }),
  { code: 'customer-service:dashboard:view', label: '查看客服看板', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:task-card-view', label: '查看任务卡片', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:problem-summary-view', label: '查看问题件摘要', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:after-sale-summary-view', label: '查看需协助摘要', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:team-view', label: '查看团队看板数据', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:all-view', label: '查看全部客服看板数据', group: '客服管理 / 客服看板' },
  { code: 'customer-service:problem:tag-manage', label: '维护问题件常用标签', group: '客服管理 / 问题件' },
  { code: 'customer-service:data-confirm:view', label: '查看数据确认', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:business-view', label: '查看业务数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:agent-view', label: '查看代理数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:business-update', label: '修改业务数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:agent-update', label: '修改代理数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:business-approve', label: '审核业务数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:agent-approve', label: '审核代理数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:business-approve-block', label: '兼容：屏蔽业务审核', group: '客服管理 / 数据确认', assignable: false },
  { code: 'customer-service:data-confirm:business-update-block', label: '兼容：屏蔽业务修改', group: '客服管理 / 数据确认', assignable: false },
  { code: 'customer-service:data-confirm:agent-update-block', label: '兼容：屏蔽代理修改', group: '客服管理 / 数据确认', assignable: false },
  { code: 'customer-service:data-confirm:agent-approve-block', label: '兼容：屏蔽代理审核', group: '客服管理 / 数据确认', assignable: false },
  { code: 'customer-service:data-confirm:approve-all', label: '双数据审核通过', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:reverse', label: '反审核数据确认', group: '客服管理 / 数据确认' },
  { code: 'customer-service:transfer:view', label: '转单号查看', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:write', label: '填写转单号', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:batch-write', label: '批量填写转单号', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:fill-block', label: '兼容：屏蔽填写转单号', group: '客服管理 / 转单号', assignable: false },
  { code: 'customer-service:transfer:sub-order-write', label: '填写分单号', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:push-sales', label: '推送业务待办', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:tracking-website-view', label: '查看追踪网站', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:label-upload', label: '上传面单', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:label-view', label: '查看面单', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:request-agent-change', label: '发起代理变更', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-outbound-time', label: '查看转单号出库时间', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-agent', label: '查看转单号代理信息', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-agent-data', label: '查看转单号代理数据', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-sensitive', label: '查看转单号敏感货物属性', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-all', label: '查看全部授权转单号订单', group: '客服管理 / 转单号' },
  ...[
    ['pending-routing', 'view', '查看待排货'], ['pending-routing', 'fee-detail-view', '查看费用明细'], ['pending-routing', 'fee-detail-block', '兼容：屏蔽查看费用'], ['pending-routing', 'readonly-block', '兼容：屏蔽只读'], ['pending-routing', 'agent-view', '查看代理信息'], ['pending-routing', 'problem-create', '创建问题件'],
    ['waiting-departure', 'view', '查看待离港'], ['waiting-departure', 'update-info', '修改待离港资料'], ['waiting-departure', 'update-transfer-no', '修改转单号'], ['waiting-departure', 'update-etd-eta', '修改 ETD/ETA'], ['waiting-departure', 'update-tracking-website', '修改追踪网站'], ['waiting-departure', 'confirm-departure', '确认离港'], ['waiting-departure', 'problem-create', '创建问题件'], ['waiting-departure', 'label-upload', '上传面单'],
    ['departed', 'view', '查看已离港'], ['departed', 'update-info', '修改已离港资料'], ['departed', 'update-eta', '修改 ETA'], ['departed', 'update-tracking-website', '修改追踪网站'], ['departed', 'confirm-arrived-port', '确认到港'], ['departed', 'problem-create', '创建问题件'],
    ['arrived-port', 'view', '查看已到港'], ['arrived-port', 'update-info', '修改已到港资料'], ['arrived-port', 'update-tracking-website', '修改追踪网站'], ['arrived-port', 'confirm-delivering', '确认派送'], ['arrived-port', 'problem-create', '创建问题件'],
    ['delivering', 'view', '查看已派送'], ['delivering', 'update-info', '修改已派送资料'], ['delivering', 'confirm-signed', '确认签收'], ['delivering', 'after-sale-create', '创建售后'], ['delivering', 'problem-create', '创建问题件'],
    ['signed', 'view', '查看已签收'], ['signed', 'confirm', '确认签收'], ['signed', 'remark', '维护签收备注'], ['signed', 'after-sale-create', '创建售后'], ['signed', 'after-sale-view', '查看售后'], ['signed', 'after-sale-assist', '标记售后需协助'], ['signed', 'after-sale-close', '关闭售后'],
    ['problem', 'view', '查看问题件'], ['problem', 'create', '创建问题件'], ['problem', 'reply', '回复问题件'], ['problem', 'close', '关闭问题件'], ['problem', 'assist', '标记需协助'], ['problem', 'after-sale-view', '查看需协助问题件'], ['problem', 'customer-visible-view', '查看客户可见信息'], ['problem', 'customer-visible-update', '维护客户可见信息'], ['problem', 'filter', '筛选问题件'], ['problem', 'export', '导出问题件']
  ].map(([section, action, label]) => ({ code: `customer-service:${section}:${action}` as PermissionKey, label, group: `客服管理 / ${({ 'pending-routing': '待排货', 'waiting-departure': '待离港', departed: '已离港', 'arrived-port': '已到港', delivering: '已派送', signed: '已签收 / 售后', problem: '问题件' } as Record<string, string>)[section]}`, ...(action.endsWith('-block') ? { assignable: false } : {}) })),
  ...[
    ['lookup:view', '进入报价查价页面', '查价'], ['lookup:meta-view', '加载查价基础数据', '查价'],
    ['lookup:amazon', '亚马逊查询', '查价'], ['lookup:europe-oversize', '欧洲海运超大件查询', '查价'], ['lookup:europe-express', '欧洲空海运铁路快递查询', '查价'], ['lookup:south-africa', '南非专线查询', '查价'], ['lookup:usa-air-sea', '美国空海运查询', '查价'], ['lookup:canada-air-sea', '加拿大空海查询', '查价'], ['lookup:dubai-air-sea', '迪拜空海运查询', '查价'],
    ['lookup:module-block:amazon', '屏蔽亚马逊查询', '查价'], ['lookup:module-block:inquiry', '屏蔽欧洲超大件综合查询', '查价'], ['lookup:module-block:europeExpress', '屏蔽欧洲空海运铁路快递查询', '查价'], ['lookup:module-block:southAfrica', '屏蔽南非专线查询', '查价'], ['lookup:module-block:usaAirSea', '屏蔽美国空海运查询', '查价'], ['lookup:module-block:canadaAirSea', '屏蔽加拿大空海查询', '查价'], ['lookup:module-block:dubaiAirSea', '屏蔽迪拜空海运查询', '查价'],
    ['lookup:dubai-image-view', '查看迪拜业务价格图片', '查价'], ['lookup:south-africa-table-view', '查看南非规则表与匹配明细', '查价'], ['lookup:copy-quote', '复制推荐报价', '查价'], ['lookup:requirement-detail-view', '查看渠道要求详情', '查价'], ['lookup:postal-rule-view', '查看美国邮编规则与价格区', '查价'], ['lookup:error-detail-view', '查看查价失败详情', '查价'],
    ['lookup:internal-source-view', '查看内部来源价格表', '查价 / 敏感字段'], ['lookup:cost-view', '查看成本单价与成本总价', '查价 / 敏感字段'], ['lookup:gross-profit-view', '查看毛利与利润差额', '查价 / 敏感字段'], ['lookup:markup-breakdown-view', '查看代理加价拆分', '查价 / 敏感字段'],
    ['markup:read', '查看代理加价规则', '代理加价规则'], ['markup:metrics-view', '查看加价规则统计', '代理加价规则'], ['markup:module-view', '按查价模块切换规则', '代理加价规则'], ['markup:default-create', '新增默认代理加价', '代理加价规则'], ['markup:update', '编辑代理加价', '代理加价规则'], ['markup:enable', '启用停用代理加价', '代理加价规则'], ['markup:delete', '删除代理加价', '代理加价规则'], ['markup:export', '导出代理加价规则', '代理加价规则'], ['markup:import', '导入代理加价规则', '代理加价规则'], ['markup:batch-upsert', '批量新增或覆盖代理加价', '代理加价规则'], ['markup:batch-enable', '批量启用停用代理加价', '代理加价规则'], ['markup:batch-delete', '批量删除代理加价', '代理加价规则'], ['markup:preview', '预览代理加价变更', '代理加价规则'], ['markup:line-detail-view', '查看渠道线路详情', '代理加价规则'], ['markup:line-custom-create', '新增线路自定义加价', '代理加价规则'], ['markup:line-custom-update', '修改线路自定义加价', '代理加价规则'], ['markup:batch-line-update', '批量设置线路加价范围', '代理加价规则'], ['markup:source-price-book-view', '查看关联来源价格表', '代理加价规则'], ['markup:unmatched-view', '查看无有效价格表异常', '代理加价规则'],
    ['markup:module:amazon:view', '查看亚马逊查询加价规则', '代理加价规则'], ['markup:module:amazon:edit', '编辑亚马逊查询加价规则', '代理加价规则'],
    ['markup:module:inquiry:view', '查看欧洲超大件综合查询加价规则', '代理加价规则'], ['markup:module:inquiry:edit', '编辑欧洲超大件综合查询加价规则', '代理加价规则'],
    ['markup:module:europeExpress:view', '查看欧洲空海运铁路快递查询加价规则', '代理加价规则'], ['markup:module:europeExpress:edit', '编辑欧洲空海运铁路快递查询加价规则', '代理加价规则'],
    ['markup:module:southAfrica:view', '查看南非专线查询加价规则', '代理加价规则'], ['markup:module:southAfrica:edit', '编辑南非专线查询加价规则', '代理加价规则'],
    ['markup:module:usaAirSea:view', '查看美国空海运查询加价规则', '代理加价规则'], ['markup:module:usaAirSea:edit', '编辑美国空海运查询加价规则', '代理加价规则'],
    ['markup:module:canadaAirSea:view', '查看加拿大空海查询加价规则', '代理加价规则'], ['markup:module:canadaAirSea:edit', '编辑加拿大空海查询加价规则', '代理加价规则'],
    ['markup:module:dubaiAirSea:view', '查看迪拜空海运查询加价规则', '代理加价规则'], ['markup:module:dubaiAirSea:edit', '编辑迪拜空海运查询加价规则', '代理加价规则'],
    ['markup:module-block:amazon', '屏蔽亚马逊加价规则', '代理加价规则'], ['markup:module-block:inquiry', '屏蔽欧洲超大件综合加价规则', '代理加价规则'], ['markup:module-block:europeExpress', '屏蔽欧洲空海运铁路快递加价规则', '代理加价规则'], ['markup:module-block:southAfrica', '屏蔽南非专线加价规则', '代理加价规则'], ['markup:module-block:usaAirSea', '屏蔽美国空海运加价规则', '代理加价规则'], ['markup:module-block:canadaAirSea', '屏蔽加拿大空海查询加价规则', '代理加价规则'], ['markup:module-block:dubaiAirSea', '屏蔽迪拜空海运加价规则', '代理加价规则'],
    ['markup:view-block:amazon', '屏蔽查看亚马逊加价规则', '代理加价规则'], ['markup:view-block:inquiry', '屏蔽查看欧洲超大件综合加价规则', '代理加价规则'], ['markup:view-block:europeExpress', '屏蔽查看欧洲空海运铁路快递加价规则', '代理加价规则'], ['markup:view-block:southAfrica', '屏蔽查看南非专线加价规则', '代理加价规则'], ['markup:view-block:usaAirSea', '屏蔽查看美国空海运加价规则', '代理加价规则'], ['markup:view-block:canadaAirSea', '屏蔽查看加拿大空海运加价规则', '代理加价规则'], ['markup:view-block:dubaiAirSea', '屏蔽查看迪拜空海运加价规则', '代理加价规则'],
    ['markup:edit-block:amazon', '屏蔽编辑亚马逊加价规则', '代理加价规则'], ['markup:edit-block:inquiry', '屏蔽编辑欧洲超大件综合加价规则', '代理加价规则'], ['markup:edit-block:europeExpress', '屏蔽编辑欧洲空海运铁路快递加价规则', '代理加价规则'], ['markup:edit-block:southAfrica', '屏蔽编辑南非专线加价规则', '代理加价规则'], ['markup:edit-block:usaAirSea', '屏蔽编辑美国空海运加价规则', '代理加价规则'], ['markup:edit-block:canadaAirSea', '屏蔽编辑加拿大空海运加价规则', '代理加价规则'], ['markup:edit-block:dubaiAirSea', '屏蔽编辑迪拜空海运加价规则', '代理加价规则'],
    ['markup-tier:read', '查看渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:create', '新增渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:update', '修改渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:enable', '启用停用渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:delete', '删除渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:kg-view', '查看 KG 阶梯', '渠道阶梯加价'], ['markup-tier:cbm-view', '查看 CBM 阶梯', '渠道阶梯加价'],
    ['channel-remark:read', '查看代理渠道自定义备注', '代理渠道自定义备注'], ['channel-remark:create', '新增代理渠道自定义备注', '代理渠道自定义备注'], ['channel-remark:update', '修改代理渠道自定义备注', '代理渠道自定义备注'], ['channel-remark:enable', '启用停用代理渠道自定义备注', '代理渠道自定义备注'],
    ['price-books:read', '查看价格表管理', '价格表管理'], ['price-books:list-view', '查看价格表列表', '价格表管理'], ['price-books:rows-view', '查看价格表明细行', '价格表管理'], ['price-books:import-job-view', '查看价格表导入任务', '价格表管理'], ['price-books:upload', '上传价格表文件', '价格表管理'], ['price-books:import', '确认导入价格表', '价格表管理'], ['price-books:import-error-view', '查看导入失败原因', '价格表管理'], ['price-books:remark-update', '修改价格表备注', '价格表管理'], ['price-books:delete', '删除价格表', '价格表管理'], ['price-books:sync-health-view', '查看价格表同步体检', '价格表管理'], ['price-books:health-report-view', '查看价格表健康报告', '价格表管理'], ['price-books:legacy-source-view', '查看历史价格源', '价格表管理'], ['price-books:legacy-source-import', '导入历史价格源', '价格表管理'], ['price-books:legacy-source-delete', '删除历史价格源', '价格表管理'], ['price-books:legacy-rebuild', '重建历史价格源索引', '价格表管理'], ['price-books:cleanup-original-agents', '清理旧原始代理数据', '价格表管理'], ['price-books:cost-row-view', '查看价格表成本行', '价格表管理 / 敏感字段'], ['price-books:view-all-agents', '查看所有代理价格表', '价格表管理 / 敏感字段'], ['price-books:postal-rule-view', '查看邮编规则与价格区', '价格表管理'],
    ['price-books:create-block:amazon', '屏蔽亚马逊新增', '价格表管理'], ['price-books:create-block:inquiry', '屏蔽欧洲超大件新增', '价格表管理'], ['price-books:create-block:europeExpress', '屏蔽欧洲空海运铁路快递新增', '价格表管理'], ['price-books:create-block:southAfrica', '屏蔽南非专线新增', '价格表管理'], ['price-books:create-block:usaAirSea', '屏蔽美国空海运新增', '价格表管理'], ['price-books:create-block:canadaAirSea', '屏蔽加拿大空海运新增', '价格表管理'], ['price-books:create-block:dubaiAirSea', '屏蔽迪拜空海运新增', '价格表管理'],
    ['price-books:delete-block:amazon', '屏蔽亚马逊删减', '价格表管理'], ['price-books:delete-block:inquiry', '屏蔽欧洲超大件删减', '价格表管理'], ['price-books:delete-block:europeExpress', '屏蔽欧洲空海运铁路快递删减', '价格表管理'], ['price-books:delete-block:southAfrica', '屏蔽南非专线删减', '价格表管理'], ['price-books:delete-block:usaAirSea', '屏蔽美国空海运删减', '价格表管理'], ['price-books:delete-block:canadaAirSea', '屏蔽加拿大空海运删减', '价格表管理'], ['price-books:delete-block:dubaiAirSea', '屏蔽迪拜空海运删减', '价格表管理'],
    ['price-books:remark-block:amazon', '屏蔽亚马逊修改备注', '价格表管理'], ['price-books:remark-block:inquiry', '屏蔽欧洲超大件修改备注', '价格表管理'], ['price-books:remark-block:europeExpress', '屏蔽欧洲空海运铁路快递修改备注', '价格表管理'], ['price-books:remark-block:southAfrica', '屏蔽南非专线修改备注', '价格表管理'], ['price-books:remark-block:usaAirSea', '屏蔽美国空海运修改备注', '价格表管理'], ['price-books:remark-block:canadaAirSea', '屏蔽加拿大空海运修改备注', '价格表管理'], ['price-books:remark-block:dubaiAirSea', '屏蔽迪拜空海运修改备注', '价格表管理'],
    ['dubai-display:active-view', '查看迪拜当前展示版本', '迪拜业务价格图片'], ['dubai-display:versions-view', '查看迪拜历史展示版本', '迪拜业务价格图片'], ['dubai-display:retry', '重新生成迪拜展示图片', '迪拜业务价格图片'], ['dubai-display:activate', '手动切换迪拜展示版本', '迪拜业务价格图片'], ['dubai-display:unpublished-view', '查看迪拜未发布或失败版本', '迪拜业务价格图片'], ['dubai-display:markup-view', '查看迪拜海运图片加价', '迪拜业务价格图片'], ['dubai-display:markup-update', '调整迪拜海运图片加价', '迪拜业务价格图片'],
    ['south-africa:rules-read', '查看南非专线规则', '南非专线规则'], ['south-africa:cost-markup-view', '查看南非成本与加价', '南非专线规则 / 敏感字段'], ['south-africa:rules-create', '新增南非规则', '南非专线规则'], ['south-africa:rules-update', '修改南非规则', '南非专线规则'], ['south-africa:rules-enable', '启用停用南非规则', '南非专线规则'], ['south-africa:rules-delete', '删除南非规则', '南非专线规则'], ['south-africa:image-view', '查看南非图片或附件', '南非专线规则'], ['south-africa:image-upload', '上传南非图片或附件', '南非专线规则'], ['south-africa:match-result-view', '查看南非匹配明细', '南非专线规则']
  ]
    .map(([code, label, group]) => ({ code: `pricing:${code}` as PermissionKey, label, group: `报价查价 / ${group}`, assignable: false }))
    .filter((definition) => !PRICING_BUSINESS_CAPABILITIES.some((capability) => capability.code === definition.code)),
  ...PRICING_BUSINESS_CAPABILITIES.map((capability) => ({
    code: capability.code as PermissionKey,
    label: capability.label,
    group: `报价查价 / ${capability.group === '代理加价规则' && capability.module
      ? `代理加价规则 / ${PRICING_MODULES.find((module) => module.key === capability.module)?.label ?? capability.module}`
      : capability.group}`
  })),
  ...[
    ['dashboard', 'view', '查看'],
    ['receivable', 'read', '查看'], ['receivable', 'create', '新增'], ['receivable', 'audit', '审核'], ['receivable', 'reverse', '反审核'], ['receivable', 'void', '删除'], ['receivable', 'export', '导出'], ['receivable', 'view-all', '查看全部数据'],
    ['business-cost', 'read', '查看'], ['business-cost', 'manage', '新增和修改'], ['business-cost', 'audit', '审核'], ['business-cost', 'reverse', '反审核'], ['business-cost', 'void', '作废'], ['business-cost', 'export', '导出'], ['business-cost', 'view-all', '查看全部数据'], ['business-cost', 'view-agent', '查看代理信息'], ['business-cost', 'view-profit', '查看利润'],
    ['payable', 'read', '查看'], ['payable', 'manage', '新增和修改'], ['payable', 'match-shipment', '匹配订单'], ['payable', 'audit', '审核'], ['payable', 'reverse', '反审核'], ['payable', 'void', '删除'], ['payable', 'export', '导出'], ['payable', 'view-sensitive', '查看应付金额和代理'], ['payable', 'view-profit', '查看利润'],
    ['pending-payment', 'read', '查看'], ['pending-payment', 'create', '生成付款申请'], ['pending-payment', 'cancel', '撤回付款申请'], ['pending-payment', 'bank-select', '选择收款银行'], ['pending-payment', 'bank-manage', '维护收款银行'], ['pending-payment', 'bill-voucher-upload', '上传供应商账单'], ['pending-payment', 'export', '导出'],
    ['paid-payment', 'read', '查看'], ['paid-payment', 'confirm', '确认支付'], ['paid-payment', 'update', '补充付款信息'], ['paid-payment', 'reverse', '反核销'], ['paid-payment', 'voucher-view', '查看付款凭证'], ['paid-payment', 'voucher-upload', '上传付款凭证'], ['paid-payment', 'voucher-delete', '删除付款凭证'], ['paid-payment', 'bank-view', '查看付款银行'], ['paid-payment', 'export', '导出'],
    ['water-receipt', 'read', '查看'], ['water-receipt', 'create', '新增'], ['water-receipt', 'update', '修改'], ['water-receipt', 'arrive', '确认到账'], ['water-receipt', 'archive', '归档'], ['water-receipt', 'void', '作废'], ['water-receipt', 'voucher-view', '查看凭证'], ['water-receipt', 'voucher-upload', '上传凭证'], ['water-receipt', 'voucher-delete', '删除凭证'], ['water-receipt', 'export', '导出'], ['water-receipt', 'view-all', '查看全部数据'],
    ['water-match', 'read', '查看'], ['water-match', 'create', '匹配'], ['water-match', 'audit', '审核匹配'], ['water-match', 'reverse', '反审核匹配'], ['water-match', 'adjust', '修改待审核分配金额'], ['water-match', 'cancel', '删除待审核分配'], ['water-match', 'export', '导出'],
    ['agent-bill', 'read', '查看'], ['agent-bill', 'import', '保存代理账单'], ['agent-bill', 'difference-resolve', '处理差异'], ['agent-bill', 'archive', '归档'], ['agent-bill', 'reverse-archive', '反归档']
  ].map(([section, action, label]) => ({ code: `finance:${section}:${action}` as PermissionKey, label, group: `财务管理 / ${({ dashboard: '财务看板', receivable: '应收审核', 'business-cost': '业务成本审核', payable: '市场应付审核', 'pending-payment': '待付款', 'paid-payment': '已付款', 'water-receipt': '水单到账查询', 'water-match': '水单匹配', 'agent-bill': '代理账单' } as Record<string, string>)[section]}` })),
  { code: 'finance:customer-account:read', label: '查看客户账户与流水', group: '财务管理 / 客户账户', assignable: false },
  ...(
    ['kuayue', 'pickup', 'tally', 'purchase', 'delivery', 'hang', 'market-profit', 'warehouse-profit', 'finance-profit'] as const
  ).flatMap((section) => (
    ['read', 'create', 'update', 'confirm', 'audit', 'reverse-audit', 'void', 'match', 'hang', 'hang-approve', 'attachment-view', 'attachment-upload', 'export', 'view-payable', 'view-all', 'settlement-generate', 'settlement-audit', 'settlement-reverse'] as const
  ).map((action) => ({
    code: `misc-fee:${section}:${action}` as PermissionKey,
    label: miscFeeActionLabels[action] ?? action,
    group: `杂费 / ${({ kuayue: '跨越账单', pickup: '提货费', tally: '理货杂费', purchase: '代购费', delivery: '送货费', hang: '挂账', 'market-profit': '市场利润结算', 'warehouse-profit': '仓库利润结算', 'finance-profit': '财务利润结算' } as Record<string, string>)[section]}`,
    assignable: miscFeeAssignableActions[section]?.includes(action) ? undefined : false
  }))),
  { code: 'finance:order-fee:payable:view', label: '单票费用查看应付', group: '财务管理 / 单票费用' },
  { code: 'finance:order-fee:payable:manage', label: '单票费用维护应付', group: '财务管理 / 单票费用' },
  { code: 'finance:order-fee:receivable:manage', label: '兼容：单票费用维护应收', group: '财务管理 / 单票费用', assignable: false },
  { code: 'finance:order-fee:profit:receivable-payable', label: '单票费用应收应付利润', group: '财务管理 / 单票费用' },
  { code: 'finance:order-fee:profit:receivable-business', label: '单票费用应收业务利润', group: '财务管理 / 单票费用' },
  { code: 'finance:order-fee:profit:business-payable', label: '单票费用业务应付利润', group: '财务管理 / 单票费用' },
  ...[
    ['customers', 'read', '查看客户资料'], ['customers', 'view-own', '查看本人客户'], ['customers', 'view-all', '查看全部客户'], ['customers', 'detail', '查看客户详情'], ['customers', 'create', '新增客户'], ['customers', 'update', '编辑客户'], ['customers', 'assign-salesperson', '调整业务员归属'], ['customers', 'enable', '启用停用客户'], ['customers', 'delete', '删除客户'], ['customers', 'import', '导入客户'], ['customers', 'export', '导出客户'], ['customers', 'contacts-view', '查看收货人'], ['customers', 'contacts-manage', '维护收货人'], ['customers', 'contacts-disable', '停用收货人'], ['customers', 'user-create', '创建客户登录账号'], ['customers', 'view-sensitive', '查看客户敏感信息'],
    ['finance', 'read', '查看财务资料'], ['finance', 'fee-name:create', '新增费用名称'], ['finance', 'fee-name:update', '编辑费用名称'], ['finance', 'fee-name:delete', '删除费用名称'], ['finance', 'fee-name:reorder', '调整费用名称排序'], ['finance', 'settlement:create', '新增结算方式'], ['finance', 'settlement:update', '编辑结算方式'], ['finance', 'settlement:delete', '删除结算方式'], ['finance', 'cargo-type:create', '新增货物类型'], ['finance', 'cargo-type:update', '编辑货物类型'], ['finance', 'cargo-type:delete', '删除货物类型'], ['finance', 'product-name:create', '新增品名'], ['finance', 'product-name:update', '编辑品名'], ['finance', 'product-name:delete', '删除品名'], ['finance', 'surcharge-manage', '维护附加费'], ['finance', 'surcharge-enable', '启用停用附加费'], ['finance', 'fuel-rate-manage', '维护燃油费率'], ['finance', 'view-sensitive', '查看财务资料敏感配置'],
    ['payer-banks', 'read', '查看付款银行资料'], ['payer-banks', 'create', '新增付款银行'], ['payer-banks', 'update', '编辑付款银行'], ['payer-banks', 'delete', '删除付款银行'], ['payer-banks', 'manage', '兼容：维护付款银行资料'],
    ['agents', 'read', '查看代理资料'], ['agents', 'detail', '查看代理详情'], ['agents', 'create', '新增代理'], ['agents', 'update', '编辑代理'], ['agents', 'enable', '启用停用代理'], ['agents', 'batch-enable', '批量启用停用代理'], ['agents', 'delete', '删除代理'], ['agents', 'batch-delete', '批量删除代理'], ['agents', 'warehouse-view', '查看代理仓库'], ['agents', 'tracking-site-view', '查看代理查询网站'], ['agents', 'invoice-template-view', '查看发票模板'], ['agents', 'invoice-template-manage', '维护发票模板'], ['agents', 'bank-view', '查看代理银行'], ['agents', 'bank-manage', '维护代理银行'], ['agents', 'integration-type-view', '查看代理对接类型'],
    ['agent-channels', 'read', '查看代理渠道'], ['agent-channels', 'filter-agent', '按代理筛选渠道'], ['agent-channels', 'create', '新增代理渠道'], ['agent-channels', 'update', '编辑代理渠道'], ['agent-channels', 'enable', '启用停用代理渠道'], ['agent-channels', 'delete', '删除代理渠道'],
    ['channels', 'read', '查看公司渠道'], ['channels', 'create', '新增公司渠道'], ['channels', 'update', '编辑公司渠道'], ['channels', 'enable', '启用停用公司渠道'], ['channels', 'delete', '删除公司渠道'], ['channels', 'batch-delete', '批量删除公司渠道'], ['channels', 'carrier-manage', '维护承运商'], ['channels', 'carrier-enable', '启用停用承运商'], ['channels', 'business-type-manage', '维护业务类型'], ['channels', 'category-manage', '维护渠道类别'], ['channels', 'volume-rule-manage', '维护除材积'], ['channels', 'weight-rule-manage', '维护多件重量规则'], ['channels', 'settlement-rule-manage', '维护结算重量规则'], ['channels', 'large-cargo-rule-manage', '维护大货起始重量'], ['channels', 'remote-rule-manage', '维护偏远规则'],
    ['channel-categories', 'read', '查看渠道类别'], ['channel-categories', 'create', '新增渠道类别'], ['channel-categories', 'update', '编辑渠道类别'], ['channel-categories', 'enable', '启用停用渠道类别'], ['channel-categories', 'delete', '删除渠道类别'],
    ['remote-areas', 'read', '查看偏远规则'], ['remote-areas', 'file-view', '查看偏远附件'], ['remote-areas', 'file-upload', '上传偏远附件'], ['remote-areas', 'file-delete', '删除偏远附件'], ['remote-areas', 'file-paste-upload', '粘贴上传偏远附件'], ['remote-areas', 'rule-manage', '维护偏远规则'],
    ['exchange-rates', 'read', '查看当前汇率'], ['exchange-rates', 'history-view', '查看历史汇率'], ['exchange-rates', 'create', '新增历史汇率'], ['exchange-rates', 'update', '修改历史汇率'], ['exchange-rates', 'disable', '停用历史汇率'], ['exchange-rates', 'period-view', '查看汇率生效区间'], ['exchange-rates', 'export', '导出汇率记录'],
    ['assistant', 'read', '查看资料辅助'], ['assistant', 'ai-check', '执行 AI 资料体检'], ['assistant', 'missing-warning-view', '查看资料缺失提醒'], ['assistant', 'stats-view', '查看资料快捷统计'], ['assistant', 'suggestion-generate', '生成维护建议']
  ].map(([section, action, label]) => {
    const code = `master-data:${section}:${action}` as PermissionKey;
    const legacyRuntimeOnly = new Set<PermissionKey>([
      'master-data:customers:detail', 'master-data:customers:assign-salesperson', 'master-data:customers:enable', 'master-data:customers:import',
      'master-data:customers:contacts-view', 'master-data:customers:contacts-disable', 'master-data:customers:user-create', 'master-data:customers:view-sensitive',
      'master-data:payer-banks:manage',
      'master-data:finance:surcharge-manage', 'master-data:finance:surcharge-enable',
      'master-data:finance:fuel-rate-manage', 'master-data:finance:view-sensitive',
      'master-data:agents:detail', 'master-data:agents:enable', 'master-data:agents:batch-enable',
      'master-data:agents:batch-delete', 'master-data:agents:warehouse-view',
      'master-data:agents:tracking-site-view', 'master-data:agents:invoice-template-view', 'master-data:agents:bank-view',
      'master-data:agents:invoice-template-manage', 'master-data:agents:bank-manage',
      'master-data:agents:integration-type-view',
      'master-data:agent-channels:filter-agent', 'master-data:agent-channels:enable',
      'master-data:channels:enable', 'master-data:channels:batch-delete',
      'master-data:channels:carrier-manage', 'master-data:channels:carrier-enable',
      'master-data:channels:business-type-manage', 'master-data:channels:category-manage',
      'master-data:channels:volume-rule-manage', 'master-data:channels:weight-rule-manage',
      'master-data:channels:settlement-rule-manage', 'master-data:channels:large-cargo-rule-manage',
      'master-data:channels:remote-rule-manage', 'master-data:channel-categories:enable',
      'master-data:remote-areas:file-view', 'master-data:remote-areas:file-paste-upload',
      'master-data:remote-areas:rule-manage',
      'master-data:exchange-rates:history-view', 'master-data:exchange-rates:period-view',
      'master-data:exchange-rates:export',
      'master-data:assistant:missing-warning-view', 'master-data:assistant:stats-view'
    ]);
    return { code, label: legacyRuntimeOnly.has(code) ? `兼容：${label}` : label, group: `基础资料库 / ${({ customers: '客户资料', finance: '财务资料', 'payer-banks': '付款银行资料', agents: '代理资料', 'agent-channels': '代理渠道', channels: '公司渠道', 'channel-categories': '渠道类别', remote: '偏远', 'remote-areas': '偏远', 'exchange-rates': '汇率', assistant: '资料辅助' } as Record<string, string>)[section]}`, assignable: legacyRuntimeOnly.has(code) ? false : undefined };
  }),
  ...[
    ['user-groups', 'read', '查看用户组'], ['user-groups', 'detail', '查看用户组详情'], ['user-groups', 'create', '新建用户组'], ['user-groups', 'update', '编辑用户组'], ['user-groups', 'enable', '启用停用用户组'], ['user-groups', 'delete', '删除用户组'], ['user-groups', 'create-from-template', '从模板创建用户组'], ['user-groups', 'staff-view', '查看用户组绑定员工'], ['user-groups', 'audit-view', '查看用户组审计日志'], ['user-groups', 'export', '导出用户组'],
    ['accounts', 'read', '查看员工账号'], ['accounts', 'filter', '筛选员工账号'], ['accounts', 'create', '新建员工账号'], ['accounts', 'update-profile', '编辑员工资料'], ['accounts', 'update-role', '修改员工用户组'], ['accounts', 'update-site', '修改员工站点'], ['accounts', 'enable', '启用停用员工账号'], ['accounts', 'delete', '删除员工账号'], ['accounts', 'reset-password', '重置员工密码'], ['accounts', 'import', '导入员工账号'], ['accounts', 'export', '导出员工账号'], ['accounts', 'view-sensitive', '查看员工敏感资料'], ['accounts', 'must-change-password-view', '查看需改密账号'], ['accounts', 'incomplete-view', '查看资料未完善账号'],
    ['sites', 'read', '查看站点'], ['sites', 'create', '新建站点'], ['sites', 'update', '编辑站点'], ['sites', 'enable', '启用停用站点'], ['sites', 'sort', '调整站点排序'], ['sites', 'staff-view', '查看站点绑定员工'], ['sites', 'export', '导出站点'],
    ['audit', 'read', '查看操作日志'], ['audit', 'failed-view', '查看失败操作'], ['audit', 'important-view', '查看重要操作'], ['audit', 'permission-finance-view', '查看权限与财务变更'], ['audit', 'filter-actor', '按操作人筛选'], ['audit', 'filter-module', '按模块筛选'], ['audit', 'filter-target', '按对象筛选'], ['audit', 'filter-time', '按时间筛选'], ['audit', 'ip-view', '查看 IP 地址'], ['audit', 'detail-view', '查看审计详情'], ['audit', 'before-after-view', '查看变更前后'], ['audit', 'raw-request-view', '查看原始请求'], ['audit', 'export', '导出操作日志'], ['audit', 'lineage-view', '查看链路追溯'], ['audit', 'permission-denied-view', '查看权限拒绝日志'],
    ['role-permissions', 'read', '查看角色权限分配'], ['role-permissions', 'module-tree-view', '查看权限模块树'], ['role-permissions', 'overview-view', '查看角色权限概览'], ['role-permissions', 'update', '编辑角色权限'], ['role-permissions', 'save', '保存角色权限'], ['role-permissions', 'copy-role', '复制角色权限'], ['role-permissions', 'batch-grant', '批量授权'], ['role-permissions', 'batch-revoke', '批量取消授权'], ['role-permissions', 'clear', '清空角色权限'], ['role-permissions', 'readonly-mode', '仅查看权限'], ['role-permissions', 'compare', '对比其他角色'], ['role-permissions', 'risk-view', '查看高风险权限'], ['role-permissions', 'admin-update', '修改管理员组权限'],
    ['security', 'read', '查看权限安全区'], ['security', 'denied-view', '查看越权拦截记录'], ['security', 'risk-permission-view', '查看高风险权限清单'], ['security', 'role-conflict-view', '查看角色冲突提示'], ['security', 'sensitive-field-view', '查看敏感字段覆盖'], ['security', 'api-scan-view', '查看未授权接口扫描'], ['security', 'export', '导出安全区报告'],
    ['ai-security', 'read', '查看 AI 接口安全'], ['ai-security', 'permission-check', '执行 AI 权限体检'], ['ai-security', 'scenario-view', '查看 AI 调用场景'], ['ai-security', 'scenario-manage', '维护 AI 场景白名单'], ['ai-security', 'log-view', '查看 AI 调用日志'], ['ai-security', 'redaction-view', '查看 AI 脱敏策略'], ['ai-security', 'redaction-manage', '维护 AI 脱敏策略'], ['ai-security', 'scenario-enable', '启用停用 AI 场景'], ['ai-security', 'failed-view', '查看 AI 失败记录'],
    ['announcements', 'read', '查看公告管理'], ['announcements', 'publish', '发布公告'], ['announcements', 'withdraw', '撤回公告'],
    ['notifications', 'operations-read', '查看通知运行状态'], ['notifications', 'retry', '重试失败通知'],
    ['base-config', 'read', '查看系统基础配置'], ['base-config', 'template-manage', '维护系统模板'], ['base-config', 'status-dictionary-manage', '维护状态字典'], ['base-config', 'default-manage', '维护默认配置'], ['base-config', 'import-config-manage', '维护导入配置'], ['base-config', 'export-config-manage', '维护导出配置'], ['base-config', 'audit-view', '查看配置变更记录'], ['base-config', 'restore', '恢复系统配置'], ['base-config', 'export', '导出系统配置'], ['config', 'import', '导入系统配置'], ['permissions', 'export', '导出权限矩阵']
  ].map(([section, action, label]) => ({ code: `system:${section}:${action}` as PermissionKey, label, group: `系统管理 / ${({ 'user-groups': '用户组', accounts: '用户名', sites: '站点', audit: '操作日志', 'role-permissions': '角色权限分配', security: '权限安全区', 'ai-security': 'AI 接口安全', announcements: '公告管理', notifications: '通知运行', 'base-config': '系统基础配置', config: '系统基础配置', permissions: '角色权限分配' } as Record<string, string>)[section]}` })),
  ...globalFieldMaskPermissionDefinitions
];

const pricingMarkupLegacyActions = new Set<PermissionKey>([
  'pricing:markup:metrics-view', 'pricing:markup:module-view', 'pricing:markup:default-create', 'pricing:markup:update',
  'pricing:markup:enable', 'pricing:markup:delete', 'pricing:markup:export', 'pricing:markup:import',
  'pricing:markup:batch-upsert', 'pricing:markup:batch-enable', 'pricing:markup:batch-delete', 'pricing:markup:preview',
  'pricing:markup:line-detail-view', 'pricing:markup:line-custom-create', 'pricing:markup:line-custom-update',
  'pricing:markup:batch-line-update', 'pricing:markup:unmatched-view', 'pricing:markup-tier:read', 'pricing:markup-tier:create',
  'pricing:markup-tier:update', 'pricing:markup-tier:enable', 'pricing:markup-tier:delete', 'pricing:markup-tier:kg-view',
  'pricing:markup-tier:cbm-view', 'pricing:channel-remark:read', 'pricing:channel-remark:create',
  'pricing:channel-remark:update', 'pricing:channel-remark:enable'
]);

for (const definition of permissionDefinitions) {
  if (pricingMarkupLegacyActions.has(definition.code) || /^pricing:markup:(module-block|view-block|edit-block):/.test(definition.code)) {
    definition.assignable = false;
  }
}

export const builtinRoleKeys: BuiltinRoleKey[] = ['ADMIN', 'CUSTOMER_SERVICE', 'OPERATOR', 'WAREHOUSE', 'FINANCE', 'CUSTOMER'];

const permissionWorkspacePrefixes = [
  '运营工作台 / ',
  '报价查价 / ',
  '业务管理 / ',
  '仓库管理 / ',
  '市场管理 / ',
  '客服管理 / ',
  '物流轨迹管理 / ',
  '财务管理 / ',
  '杂费 / ',
  '基础资料库 / ',
  '系统管理 / '
] as const;

/** 权限目录是角色配置页面的唯一事实源，不能由前端按文案静默去重。 */
export function assertPermissionDefinitionsIntegrity(definitions: readonly PermissionDefinition[] = permissionDefinitions): void {
  const codes = new Set<string>();
  const groupLabels = new Set<string>();

  for (const definition of definitions) {
    if (codes.has(definition.code)) throw new Error(`权限定义重复 code：${definition.code}`);
    if (!permissionWorkspacePrefixes.some((prefix) => definition.group.startsWith(prefix))) {
      throw new Error(`权限定义目录错误：${definition.code} 不属于已登记业务模块`);
    }
    const groupLabel = `${definition.group}::${definition.label.trim()}`;
    if (groupLabels.has(groupLabel)) throw new Error(`权限定义重复文案：${definition.group} / ${definition.label}`);
    codes.add(definition.code);
    groupLabels.add(groupLabel);
  }
}

export function getPermissionDefinitions(): PermissionDefinition[] {
  assertPermissionDefinitionsIntegrity();
  return permissionDefinitions.filter((permission) => permission.assignable !== false);
}

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

const warehouseBasePermissions: PermissionKey[] = [
  'warehouse:dashboard:view',
  'warehouse:today-receipt:view', 'warehouse:today-receipt:edit', 'warehouse:today-receipt:delete', 'warehouse:today-receipt:manual-create', 'warehouse:today-receipt:import', 'warehouse:today-receipt:export',
  'warehouse:in-stock:view', 'warehouse:in-stock:edit', 'warehouse:in-stock:delete', 'warehouse:in-stock:split', 'warehouse:in-stock:tally', 'warehouse:in-stock:order-entry', 'warehouse:in-stock:import', 'warehouse:in-stock:export',
  'warehouse:tally-pending:view', 'warehouse:tally-pending:detail', 'warehouse:tally-pending:edit', 'warehouse:tally-pending:start', 'warehouse:tally-pending:process', 'warehouse:tally-pending:restart', 'warehouse:tally-pending:sort-rule-manage', 'warehouse:tally-pending:problem-view', 'warehouse:tally-pending:shipment-create',
  'warehouse:tally-completed:view', 'warehouse:tally-completed:print', 'warehouse:tally-completed:download', 'warehouse:tally-completed:scan', 'warehouse:tally-completed:reverse', 'warehouse:tally-completed:correct',
  'warehouse:dispatch-pending:view', 'warehouse:dispatch-pending:edit', 'warehouse:dispatch-pending:handover-print', 'warehouse:dispatch-pending:label-manage', 'warehouse:dispatch-pending:shipping-mark-confirm', 'warehouse:dispatch-pending:confirm',
  'warehouse:outbounded:view', 'warehouse:outbounded:export',
  'warehouse:rent-detail:view', 'warehouse:rent-detail:export', 'warehouse:rent-detail:edit', 'warehouse:rent-detail:scope-all'
];

const marketBasePermissions: PermissionKey[] = [
  'business:shipment:agent-weight-view',
  'market:dashboard:view',
  'market:pending-routing:view', 'market:pending-routing:route', 'market:pending-routing:edit', 'market:pending-routing:approve', 'market:pending-routing:operation-log:view', 'market:pending-routing:business-cost:view', 'market:pending-routing:business-cost:create', 'market:pending-routing:business-cost:edit', 'market:pending-routing:business-cost:delete', 'market:pending-routing:payable-cost:view', 'market:pending-routing:payable-cost:create', 'market:pending-routing:payable-cost:edit', 'market:pending-routing:payable-cost:delete', 'market:pending-routing:return-review',
  'market:routed:view', 'market:routed:reroute', 'market:routed:replace-agent', 'market:routed:routing-log:view',
  'market:routing-report:view', 'market:routing-report:export'
];

const customerServiceBasePermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.code.startsWith('customer-service:'))
  .filter((permission) => !permission.code.endsWith('-block'))
  .map((permission) => permission.code);

const financeFunctionPermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.code.startsWith('finance:'))
  .map((permission) => permission.code);

const miscFeeAllPermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.assignable !== false && permission.code.startsWith('misc-fee:'))
  .map((permission) => permission.code);

const miscFeeBusinessPermissions: PermissionKey[] = [
  'misc-fee:kuayue:read', 'misc-fee:kuayue:update', 'misc-fee:kuayue:hang', 'misc-fee:kuayue:attachment-view',
  'misc-fee:pickup:read', 'misc-fee:pickup:match', 'misc-fee:pickup:attachment-view',
  'misc-fee:tally:read',
  'misc-fee:purchase:read', 'misc-fee:purchase:create', 'misc-fee:purchase:update', 'misc-fee:purchase:void', 'misc-fee:purchase:hang', 'misc-fee:purchase:attachment-view', 'misc-fee:purchase:attachment-upload',
  'misc-fee:delivery:read',
  'misc-fee:hang:read'
];

const miscFeeWarehousePermissions: PermissionKey[] = [
  'misc-fee:pickup:read', 'misc-fee:pickup:create', 'misc-fee:pickup:update', 'misc-fee:pickup:match', 'misc-fee:pickup:hang', 'misc-fee:pickup:attachment-view', 'misc-fee:pickup:attachment-upload',
  'misc-fee:tally:read', 'misc-fee:tally:create', 'misc-fee:tally:update', 'misc-fee:tally:void', 'misc-fee:tally:confirm', 'misc-fee:tally:hang', 'misc-fee:tally:attachment-view', 'misc-fee:tally:attachment-upload',
  'misc-fee:warehouse-profit:read', 'misc-fee:warehouse-profit:settlement-generate'
];

const miscFeeMarketPermissions: PermissionKey[] = [
  'misc-fee:pickup:read', 'misc-fee:pickup:create', 'misc-fee:pickup:update', 'misc-fee:pickup:match', 'misc-fee:pickup:hang', 'misc-fee:pickup:attachment-view', 'misc-fee:pickup:attachment-upload',
  'misc-fee:delivery:read', 'misc-fee:delivery:create', 'misc-fee:delivery:confirm', 'misc-fee:delivery:match', 'misc-fee:delivery:hang', 'misc-fee:delivery:attachment-view', 'misc-fee:delivery:attachment-upload',
  'misc-fee:market-profit:read', 'misc-fee:market-profit:settlement-generate'
];

const pricingLookupBusinessPermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.assignable !== false && permission.code.startsWith('pricing:lookup:'))
  .map((permission) => permission.code)
  .filter((permission) => !permission.startsWith('pricing:lookup:module-block:'))
  .filter((permission) => ![
    'pricing:lookup:internal-source-view',
    'pricing:lookup:cost-view',
    'pricing:lookup:gross-profit-view',
    'pricing:lookup:markup-breakdown-view'
  ].includes(permission));

const pricingManagementPermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.assignable !== false && permission.code.startsWith('pricing:'))
  .map((permission) => permission.code)
  .filter((permission) => !permission.startsWith('pricing:lookup:module-block:')
    && !permission.startsWith('pricing:markup:module-block:')
    && !permission.startsWith('pricing:markup:view-block:')
    && !permission.startsWith('pricing:markup:edit-block:')
    && !permission.startsWith('pricing:price-books:create-block:')
    && !permission.startsWith('pricing:price-books:delete-block:')
    && !permission.startsWith('pricing:price-books:remark-block:'));

const masterDataReferencePermissions: PermissionKey[] = [
  'master-data:customers:read',
  'master-data:finance:read',
  'master-data:agents:read',
  'master-data:agent-channels:read',
  'master-data:channels:read',
  'master-data:channel-categories:read',
  'master-data:exchange-rates:read'
];

const businessMasterDataReferencePermissions: PermissionKey[] = [
  'data-scope:sales-own',
  'business:order-entry:edit',
  'business:order-entry:business-cost',
  'business:order-entry:payable-fee',
  'master-data:customers:read',
  'master-data:customers:view-own',
  'master-data:customers:create',
  'master-data:customers:update',
  'master-data:customers:delete',
  'master-data:customers:contacts-manage',
  'master-data:finance:read',
  'master-data:channels:read',
  'master-data:channel-categories:read',
  'master-data:exchange-rates:read'
];

const lineShipmentStageEditPermissions: PermissionKey[] = [
  'review-pending', 'waiting-sort', 'waiting-dispatch', 'outbounded', 'data-confirm', 'transfer-no',
  'waiting-departure', 'departed', 'arrived-port', 'delivering', 'signed', 'problem', 'after-sale'
].map((stage) => `operations:line-shipment:stage-edit:${stage}` as PermissionKey);

export const rolePermissions: Record<BuiltinRoleKey, PermissionKey[]> = {
  ADMIN: allRuntimePermissions(),
  CUSTOMER_SERVICE: [...pricingLookupBusinessPermissions, ...masterDataReferencePermissions, 'tracking:external:view', 'tracking:external:detail', ...customerServiceBasePermissions],
  OPERATOR: [...pricingLookupBusinessPermissions, ...lineShipmentStageEditPermissions, 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'finance:water-receipt:create', 'finance:water-receipt:update', 'finance:water-receipt:voucher-view', 'finance:water-receipt:voucher-upload', 'finance:water-receipt:voucher-delete', 'finance:water-match:read', ...businessMasterDataReferencePermissions, 'operations:line-shipment:view', 'operations:line-shipment:detail', 'operations:line-shipment:process', 'operations:line-shipment:status-update', 'operations:line-shipment:tracking-add', 'operations:line-shipment:problem-create', 'operations:line-shipment:import', 'operations:line-shipment:internal-log-view', 'operations:ai-queue:view', 'operations:ai-queue:assist', 'operations:ai-queue:mark-read', 'operations:ai-queue:handle', 'operations:product-map:view', 'operations:product-map:route-view', 'operations:import-quality:view', 'operations:import-quality:upload', 'operations:import-quality:retry', 'operations:import-quality:error-detail-view', 'operations:import-quality:confirm', 'business:dashboard:view', 'business:dashboard:trend-view', 'business:dashboard:pending-review-summary', 'business:order-entry:view', 'business:order-entry:warehouse-package-select', 'business:order-entry:create', 'business:order-entry:draft-view', 'business:order-entry:draft-edit', 'business:order-entry:draft-delete', 'business:order-entry:submit-review', 'business:order-entry:invoice-upload', 'business:order-entry:label-upload', 'business:review:view', 'business:review:edit', 'business:shipment:list', 'business:shipment:detail', 'business:shipment:self-view', 'business:shipment:update-basic', 'business:shipment:tracking-add', 'business:shipment:problem-create', 'business:order-ai:view', 'business:order-ai:assist', 'warehouse:in-stock:view'],
  WAREHOUSE: ['operations:line-shipment:view', 'operations:line-shipment:detail', ...lineShipmentStageEditPermissions, ...warehouseBasePermissions],
  FINANCE: ['business:shipment:list', ...pricingLookupBusinessPermissions, ...financeFunctionPermissions, 'master-data:finance:read', 'master-data:payer-banks:read', 'master-data:payer-banks:create', 'master-data:payer-banks:update', 'master-data:payer-banks:delete', 'master-data:agents:read', 'master-data:exchange-rates:read'],
  CUSTOMER: [
    'business:order-entry:create',
    'business:shipment:list',
    'business:shipment:detail',
    'business:shipment:self-view',
    'customer-service:problem:view',
    'customer-service:problem:create',
    'customer-service:problem:reply',
    'customer-service:problem:close',
    'finance:customer-account:read'
  ]
};

rolePermissions.OPERATOR.push('warehouse:in-stock:import');
rolePermissions.OPERATOR.push(...miscFeeBusinessPermissions);
rolePermissions.WAREHOUSE.push('data-scope:misc-fee-warehouse-site', ...miscFeeWarehousePermissions);
rolePermissions.FINANCE.push('data-scope:misc-fee-all', ...miscFeeAllPermissions);

export const roleMetadata: Record<BuiltinRoleKey, Omit<RolePermissionRow, 'permissions'>> = {
  ADMIN: {
    key: 'ADMIN',
    label: '管理员组',
    account: 'admin',
    scope: '全局数据',
    restriction: '系统管理员：全部权限，运单、财务、基础资料、系统管理',
    systemBuiltin: true
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
  return getPermissionDefinitions().filter((item) => item.assignable !== false).map((item) => item.code);
}

export function allRuntimePermissions(): PermissionKey[] {
  return [...new Set<PermissionKey>([
    ...permissionDefinitions
      .filter((item) => !item.code.includes('-block') && !item.code.includes(':block:') && !item.code.startsWith('system:global-mask:'))
      .map((item) => item.code),
    'data-scope:sales-own',
    'data-scope:misc-fee-all',
    'data-scope:misc-fee-warehouse-site',
    'data-scope:misc-fee-market'
  ])];
}

export function isSalesScopedRole(role: string): boolean {
  return [
    'OPERATOR',
    'UG_MARKET',
    'UG_BUSINESS',
    'UG_SZ_WUHAN',
    'UG_ZZ_SIHUA',
    'UG_WH_JIUYULIAN',
    'UG_BUSINESS_MANAGER',
    'UG_BUSINESS_SUPERVISOR'
  ].includes(role);
}

export function isFinanceFullScopeRole(role: string): boolean {
  return role === 'FINANCE' || role === 'UG_FINANCE' || role === 'UG_PAYABLE_FINANCE';
}

export function isBusinessAgentRestrictedRole(role: string): boolean {
  return isSalesScopedRole(role) && role !== 'UG_MARKET';
}

export function isWarehouseWideScopePrincipal(
  principal: Pick<Principal, 'role' | 'assignedRole' | 'roleLabel' | 'dataScope'>
): boolean {
  if (isAdministratorRole(principal.role)) return true;
  const effectiveRole = principal.assignedRole ?? principal.role;
  if (['WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND', 'UG_MARKET'].includes(effectiveRole)) {
    return true;
  }
  if (principal.dataScope === 'SALES_OWN') return false;
  if (isBusinessAgentRestrictedRole(effectiveRole)) return false;
  const label = principal.roleLabel?.trim() ?? '';
  if (label.includes('业务')) return false;
  return label === '仓库理货';
}

/**
 * Individual business roles must stay on their own-customer data scope.
 * Managers/supervisors intentionally keep their team scope and are not in
 * this list; a role must opt into those broader grants explicitly.
 */
export function isBusinessAgentOwnOnlyRole(role: string): boolean {
  return [
    'OPERATOR',
    'UG_BUSINESS',
    'UG_SZ_WUHAN',
    'UG_ZZ_SIHUA',
    'UG_WH_JIUYULIAN'
  ].includes(role);
}

function isBusinessAgentCrossScopePermission(permission: PermissionKey): boolean {
  return /(?:^|:)(?:all-view|team-view|view-all|all-order-context|scope-(?:team|site|all))$/.test(permission);
}

function isBusinessAgentBroadScopeRole(role: string): boolean {
  return role === 'UG_BUSINESS_MANAGER' || role === 'UG_BUSINESS_SUPERVISOR';
}

/**
 * Transitional runtime aliases for permissions that no longer appear in the
 * role editor or database catalog.  Existing page code can keep asking its
 * historical field/action question while the persisted contract stays on the
 * user-observable page/action permission.  Global denies run after expansion,
 * so a total-rule mask still removes the corresponding field and write path.
 */
const legacyRuntimePermissionsByCanonical: Partial<Record<PermissionKey, readonly PermissionKey[]>> = {
  'business:dashboard:view': [
    'business:dashboard:trend-view',
    'business:dashboard:pending-review-summary'
  ],
  'business:shipment:list': [
    'business:shipment:finance-detail-view',
    'business:shipment:receivable-view',
    'business:shipment:payable-view',
    'business:shipment:profit-view',
    'business:shipment:agent-weight-view'
  ],
  'business:order-ai:assist': ['business:order-ai:finance-context'],
  'tracking:carrier-task:view': [
    'tracking:carrier-task:detail',
    'tracking:carrier-task:error-view',
    'tracking:carrier-task:log-view'
  ],
  'tracking:carrier-task:sync': [
    'tracking:carrier-task:run',
    'tracking:carrier-task:retry'
  ],
  'tracking:external:view': [
    'tracking:external:latest-view',
    'tracking:external:stale-days-view'
  ],
  'tracking:external:import': [
    'tracking:external:single-add',
    'tracking:external:import-upload',
    'tracking:external:import-preview',
    'tracking:external:import-confirm',
    'tracking:external:import-error-view',
    'tracking:external:unmatched-view',
    'tracking:external:overwrite'
  ],
  'master-data:customers:read': [
    'master-data:customers:detail',
    'master-data:customers:contacts-view',
    'master-data:customers:view-sensitive'
  ],
  'master-data:finance:read': ['master-data:finance:view-sensitive'],
  'master-data:agents:read': [
    'master-data:agents:detail',
    'master-data:agents:warehouse-view',
    'master-data:agents:tracking-site-view',
    'master-data:agents:invoice-template-view',
    'master-data:agents:bank-view',
    'master-data:agents:integration-type-view'
  ],
  'master-data:agents:create': [
    'master-data:agents:invoice-template-manage',
    'master-data:agents:bank-manage'
  ],
  'master-data:agents:update': [
    'master-data:agents:enable',
    'master-data:agents:batch-enable',
    'master-data:agents:invoice-template-manage',
    'master-data:agents:bank-manage'
  ],
  'master-data:agents:delete': ['master-data:agents:batch-delete'],
  'master-data:agent-channels:read': ['master-data:agent-channels:filter-agent'],
  'master-data:agent-channels:update': ['master-data:agent-channels:enable'],
  'master-data:channels:create': [
    'master-data:channels:carrier-manage',
    'master-data:channels:business-type-manage',
    'master-data:channels:category-manage',
    'master-data:channels:volume-rule-manage',
    'master-data:channels:weight-rule-manage',
    'master-data:channels:settlement-rule-manage',
    'master-data:channels:large-cargo-rule-manage',
    'master-data:channels:remote-rule-manage'
  ],
  'master-data:channels:update': [
    'master-data:channels:enable',
    'master-data:channels:carrier-manage',
    'master-data:channels:carrier-enable',
    'master-data:channels:business-type-manage',
    'master-data:channels:category-manage',
    'master-data:channels:volume-rule-manage',
    'master-data:channels:weight-rule-manage',
    'master-data:channels:settlement-rule-manage',
    'master-data:channels:large-cargo-rule-manage',
    'master-data:channels:remote-rule-manage'
  ],
  'master-data:channels:delete': ['master-data:channels:batch-delete'],
  'master-data:channel-categories:update': ['master-data:channel-categories:enable'],
  'master-data:exchange-rates:read': [
    'master-data:exchange-rates:history-view',
    'master-data:exchange-rates:period-view'
  ],
  'master-data:assistant:read': [
    'master-data:assistant:missing-warning-view',
    'master-data:assistant:stats-view'
  ]
};

for (const section of ['kuayue', 'pickup', 'tally', 'purchase', 'delivery', 'hang', 'market-profit', 'warehouse-profit', 'finance-profit']) {
  legacyRuntimePermissionsByCanonical[`misc-fee:${section}:read` as PermissionKey] = [
    `misc-fee:${section}:view-payable` as PermissionKey
  ];
}

export function withImpliedLegacyRuntimePermissions(permissions: readonly PermissionKey[]): PermissionKey[] {
  const next = new Set(permissions);
  for (const [canonical, aliases] of Object.entries(legacyRuntimePermissionsByCanonical)) {
    if (!next.has(canonical as PermissionKey)) continue;
    for (const alias of aliases ?? []) next.add(alias);
  }
  return [...next];
}

function withImpliedTargetPageViewPermissions(permissions: readonly PermissionKey[]): PermissionKey[] {
  const next = new Set(permissions);
  const pageViews: Array<[string, PermissionKey]> = [
    ['business:dashboard:', 'business:dashboard:view'],
    ['business:shipment:', 'business:shipment:list'],
    ['business:order-ai:', 'business:order-ai:view'],
    ['operations:line-shipment:', 'operations:line-shipment:view'],
    ['operations:ai-queue:', 'operations:ai-queue:view'],
    ['operations:product-map:', 'operations:product-map:view'],
    ['operations:import-quality:', 'operations:import-quality:view'],
    ['tracking:carrier-task:', 'tracking:carrier-task:view'],
    ['tracking:external:', 'tracking:external:view'],
    ['system:announcements:', 'system:announcements:read'],
    ['system:notifications:', 'system:notifications:operations-read'],
    ...(['kuayue', 'pickup', 'tally', 'purchase', 'delivery', 'hang', 'market-profit', 'warehouse-profit', 'finance-profit'] as const)
      .map((section) => [`misc-fee:${section}:`, `misc-fee:${section}:read` as PermissionKey] as [string, PermissionKey]),
    ...(['customers', 'finance', 'payer-banks', 'agents', 'agent-channels', 'channels', 'channel-categories', 'remote-areas', 'exchange-rates', 'assistant'] as const)
      .map((section) => [`master-data:${section}:`, `master-data:${section}:read` as PermissionKey] as [string, PermissionKey])
  ];
  for (const [prefix, view] of pageViews) {
    const hasAssignableAction = permissionDefinitions.some((definition) => (
      definition.assignable !== false
      && definition.code !== view
      && definition.code.startsWith(prefix)
      && !definition.code.includes('-block')
      && !definition.code.includes(':block:')
      && next.has(definition.code)
    ));
    if (hasAssignableAction) next.add(view);
  }
  return [...next];
}

/**
 * Customer-service actions are independently assignable, but every action
 * still needs its module view permission.  Keeping this dependency in the
 * canonical RBAC normalizer means a single checkbox is sufficient and the
 * API cannot accidentally persist a dead action without its parent entry.
 * Legacy `*-block` permissions are deliberately ignored; they remain
 * non-assignable compatibility records until a separately reviewed migration.
 */
export function withImpliedCustomerServiceViewPermissions(permissions: readonly PermissionKey[]): PermissionKey[] {
  const assignableCodes = new Set(
    permissionDefinitions
      .filter((permission) => permission.assignable !== false)
      .map((permission) => permission.code)
  );
  const next = new Set(permissions);
  for (const permission of [...next]) {
    if (!permission.startsWith('customer-service:') || permission.endsWith('-block')) continue;
    const separator = permission.lastIndexOf(':');
    if (separator <= 'customer-service:'.length) continue;
    if (permission.slice(separator + 1) === 'view') continue;
    const viewPermission = `${permission.slice(0, separator)}:view` as PermissionKey;
    if (assignableCodes.has(viewPermission)) next.add(viewPermission);
  }
  return [...next];
}

function withImpliedOperationalPermissions(permissions: readonly PermissionKey[]): PermissionKey[] {
  const next = new Set(permissions);
  const warehouseViewDependencies: Record<string, PermissionKey> = {
    'warehouse:today-receipt': 'warehouse:today-receipt:view',
    'warehouse:in-stock': 'warehouse:in-stock:view',
    'warehouse:tally-pending': 'warehouse:tally-pending:view',
    'warehouse:tally-completed': 'warehouse:tally-completed:view',
    'warehouse:dispatch-pending': 'warehouse:dispatch-pending:view',
    'warehouse:outbounded': 'warehouse:outbounded:view',
    'warehouse:rent-detail': 'warehouse:rent-detail:view'
  };
  for (const permission of [...next]) {
    const match = /^(warehouse:[^:]+):(.+)$/.exec(permission);
    if (!match || match[2] === 'view' || match[2].startsWith('scope-')) continue;
    // 理货问题件和隐藏的出货兼容能力都不是普通任务列表入口。
    if (permission === 'warehouse:tally-pending:problem-view'
      || permission === 'warehouse:tally-pending:shipment-create') continue;
    const viewPermission = warehouseViewDependencies[match[1]];
    if (viewPermission) next.add(viewPermission);
  }
  if (next.has('warehouse:rent-detail:view')
    && ![...next].some((permission) => permission.startsWith('warehouse:rent-detail:scope-'))) {
    next.add('warehouse:rent-detail:scope-self');
  }
  const rentScopes: PermissionKey[] = [
    'warehouse:rent-detail:scope-self',
    'warehouse:rent-detail:scope-team',
    'warehouse:rent-detail:scope-site',
    'warehouse:rent-detail:scope-all'
  ];
  const selectedScopes = rentScopes.filter((permission) => next.has(permission));
  if (selectedScopes.length && !next.has('warehouse:rent-detail:view')) {
    next.add('warehouse:rent-detail:view');
  }
  if (selectedScopes.length > 1) {
    const winner = selectedScopes.find((permission) => permission === 'warehouse:rent-detail:scope-all')
      ?? selectedScopes.find((permission) => permission === 'warehouse:rent-detail:scope-site')
      ?? selectedScopes.find((permission) => permission === 'warehouse:rent-detail:scope-team')
      ?? 'warehouse:rent-detail:scope-self';
    for (const permission of rentScopes) next.delete(permission);
    next.add(winner);
  }
  return [...next];
}

export function hasPermission(role: RoleKey, permission: PermissionKey): boolean {
  return effectivePermissionsForRole(role).includes(permission);
}

export const protectedDataScopePermissions: readonly PermissionKey[] = [
  'data-scope:sales-own',
  'data-scope:misc-fee-all',
  'data-scope:misc-fee-warehouse-site',
  'data-scope:misc-fee-market'
];

export const hiddenPersistedApiPermissions: readonly PermissionKey[] = [
  'master-data:customers:user-create',
  'master-data:finance:surcharge-manage',
  'master-data:finance:surcharge-enable',
  'master-data:finance:fuel-rate-manage',
  'warehouse:tally-pending:shipment-create'
];

export function hiddenPersistedApiPermissionsForRole(
  role: RoleKey,
  permissions: readonly PermissionKey[] = []
): PermissionKey[] {
  if (isAdministratorRole(role) || role === 'CUSTOMER') return [];
  const allowed = new Set(hiddenPersistedApiPermissions);
  return [...new Set(permissions.filter((permission) => allowed.has(permission)))];
}

export function configuredPermissionsForRole(
  role: RoleKey,
  configuredPermissions?: readonly PermissionKey[]
): PermissionKey[] {
  const configuredGlobalMasks = globalFieldMaskKeys
    .map(globalFieldMaskPermissionCode)
    .filter((permission) => configuredPermissions?.includes(permission));
  if (configuredGlobalMasks.includes(globalFieldMaskPermissionCode('agent-data'))) {
    for (const dependency of ['agent-short-name', 'agent-company-name', 'agent-channel'] as GlobalFieldMaskKey[]) {
      const code = globalFieldMaskPermissionCode(dependency);
      if (!configuredGlobalMasks.includes(code)) configuredGlobalMasks.push(code);
    }
  }
  if (isAdministratorRole(role)) return [...allRuntimePermissions(), ...configuredGlobalMasks];
  if (role === 'CUSTOMER') {
    return [
      ...withImpliedOperationalPermissions(withImpliedCustomerServiceViewPermissions(defaultPermissionsForRole(role))),
      ...configuredGlobalMasks
    ];
  }
  const permissions = configuredPermissions === undefined
    ? defaultPermissionsForRole(role)
    : normalizeRolePermissions(role, [...configuredPermissions]);
  const hiddenApiPermissions = hiddenPersistedApiPermissionsForRole(role, configuredPermissions ?? []);
  const defaultProtectedScopes = protectedDataScopePermissions.filter((permission) =>
    defaultPermissionsForRole(role).includes(permission)
  );
  const protectedScopes = defaultProtectedScopes.length
    ? defaultProtectedScopes
    : protectedDataScopePermissions.filter((permission) => configuredPermissions?.includes(permission));
  const effective = [
    ...new Set<PermissionKey>([
      ...permissions,
      ...protectedScopes,
      ...hiddenApiPermissions
    ])
  ];
  return withImpliedOperationalPermissions(withImpliedCustomerServiceViewPermissions([...new Set(effective)]));
}

export function effectivePermissionsForRole(
  role: RoleKey,
  configuredPermissions?: readonly PermissionKey[]
): PermissionKey[] {
  return applyGlobalPermissionDenies(withImpliedLegacyRuntimePermissions(configuredPermissionsForRole(role, configuredPermissions)));
}

export function normalizeRolePermissions(role: RoleKey, permissions: PermissionKey[]): PermissionKey[] {
  if (isAdministratorRole(role)) {
    const selectedGlobalMasks = [...new Set(permissions)].filter((permission) =>
      globalFieldMaskKeys.some((mask) => permission === globalFieldMaskPermissionCode(mask))
    );
    return [
      ...allPermissions().filter((permission) => !permission.startsWith('system:global-mask:')),
      ...selectedGlobalMasks
    ];
  }
  if (role === 'CUSTOMER') {
    const customerPermissions = new Set(defaultPermissionsForRole('CUSTOMER'));
    return withImpliedCustomerServiceViewPermissions([...new Set(permissions)].filter((permission) =>
      customerPermissions.has(permission) || globalFieldMaskKeys.some((mask) => permission === globalFieldMaskPermissionCode(mask))
    ));
  }
  // Hidden compatibility capabilities may remain effective after a migration,
  // but are intentionally omitted from the role-permission UI catalog.
  const allowed = new Set<PermissionKey>([
    ...allPermissions(),
    'finance:order-fee:receivable:manage'
  ]);
  const normalized = [...new Set(permissions)]
    .filter((permission) => allowed.has(permission))
    .filter((permission) => !(
      isBusinessAgentOwnOnlyRole(role)
      || (
        !isBusinessAgentBroadScopeRole(role)
        && permissions.includes('data-scope:sales-own')
      )
    ) || !isBusinessAgentCrossScopePermission(permission));
  if (normalized.includes(globalFieldMaskPermissionCode('agent-data'))) {
    for (const dependency of ['agent-short-name', 'agent-company-name', 'agent-channel'] as GlobalFieldMaskKey[]) {
      const code = globalFieldMaskPermissionCode(dependency);
      if (!normalized.includes(code)) normalized.push(code);
    }
  }
  const pricingCapabilityCodes = new Set(PRICING_BUSINESS_CAPABILITIES.map((item) => item.code as PermissionKey));
  if (permissions.some((permission) => permission.startsWith('pricing:'))) {
    for (let index = normalized.length - 1; index >= 0; index -= 1) {
      const permission = normalized[index];
      if (permission.startsWith('pricing:') && !pricingCapabilityCodes.has(permission)) normalized.splice(index, 1);
    }
  }
  for (const module of PRICING_MODULES) {
    const viewCode = `pricing:markup:${module.key}:view` as PermissionKey;
    const modulePrefix = `pricing:markup:${module.key}:`;
    if (normalized.some((permission) => permission.startsWith(modulePrefix) && permission !== viewCode)
      && !normalized.includes(viewCode)) normalized.push(viewCode);
  }
  if (normalized.some((permission) => permission.startsWith('pricing:price-books:') && permission !== 'pricing:price-books:view')
    && !normalized.includes('pricing:price-books:view')) {
    normalized.push('pricing:price-books:view');
  }
  const orderEntryCapabilities: PermissionKey[] = [
    'business:order-entry:edit',
    'business:order-entry:business-cost',
    'business:order-entry:payable-fee'
  ];
  if (orderEntryCapabilities.some((code) => normalized.includes(code))) {
    if (!normalized.includes('business:order-entry:view')) normalized.push('business:order-entry:view');
    if (!normalized.includes('business:order-entry:draft-view')) normalized.push('business:order-entry:draft-view');
  }
  if (normalized.includes('business:order-entry:business-cost')
    || normalized.includes('business:order-entry:payable-fee')) {
    if (!normalized.includes('master-data:agents:read')) normalized.push('master-data:agents:read');
  }
  if (normalized.includes('business:order-entry:edit')) {
    if (!normalized.includes('business:order-entry:create')) normalized.push('business:order-entry:create');
    if (!normalized.includes('business:order-entry:warehouse-package-select')) normalized.push('business:order-entry:warehouse-package-select');
    if (!normalized.includes('business:order-entry:submit-review')) normalized.push('business:order-entry:submit-review');
    if (!normalized.includes('business:order-entry:invoice-upload')) normalized.push('business:order-entry:invoice-upload');
    if (!normalized.includes('business:order-entry:label-upload')) normalized.push('business:order-entry:label-upload');
  }
  if (normalized.includes('business:order-entry:draft-edit')) {
    if (!normalized.includes('business:order-entry:draft-view')) normalized.push('business:order-entry:draft-view');
    if (!normalized.includes('business:order-entry:view')) normalized.push('business:order-entry:view');
  }
  if (normalized.includes('business:order-entry:draft-delete')
    && !normalized.includes('business:order-entry:draft-view')) {
    normalized.push('business:order-entry:draft-view');
  }
  if (normalized.includes('business:review:edit') && !normalized.includes('business:review:view')) {
    normalized.push('business:review:view');
  }
  if (normalized.includes('business:review:edit')) {
    for (const dependency of ['master-data:customers:read', 'master-data:channels:read'] as PermissionKey[]) {
      if (!normalized.includes(dependency)) normalized.push(dependency);
    }
  }
  if (normalized.includes('warehouse:in-stock:order-entry')) {
    for (const dependency of [
      'business:order-entry:view',
      'business:order-entry:create',
      'business:order-entry:warehouse-package-select'
    ] as PermissionKey[]) {
      if (!normalized.includes(dependency)) normalized.push(dependency);
    }
  }
  const marketViewDependencies: Array<[PermissionKey, PermissionKey]> = [
    ['market:pending-routing:route', 'market:pending-routing:view'],
    ['market:pending-routing:edit', 'market:pending-routing:view'],
    ['market:pending-routing:approve', 'market:pending-routing:view'],
    ['market:pending-routing:operation-log:view', 'market:pending-routing:view'],
    ['market:pending-routing:business-cost:view', 'market:pending-routing:view'],
    ['market:pending-routing:business-cost:create', 'market:pending-routing:view'],
    ['market:pending-routing:business-cost:create', 'market:pending-routing:business-cost:view'],
    ['market:pending-routing:business-cost:edit', 'market:pending-routing:view'],
    ['market:pending-routing:business-cost:edit', 'market:pending-routing:business-cost:view'],
    ['market:pending-routing:business-cost:delete', 'market:pending-routing:view'],
    ['market:pending-routing:business-cost:delete', 'market:pending-routing:business-cost:view'],
    ['market:pending-routing:payable-cost:view', 'market:pending-routing:view'],
    ['market:pending-routing:payable-cost:create', 'market:pending-routing:view'],
    ['market:pending-routing:payable-cost:create', 'market:pending-routing:payable-cost:view'],
    ['market:pending-routing:payable-cost:edit', 'market:pending-routing:view'],
    ['market:pending-routing:payable-cost:edit', 'market:pending-routing:payable-cost:view'],
    ['market:pending-routing:payable-cost:delete', 'market:pending-routing:view'],
    ['market:pending-routing:payable-cost:delete', 'market:pending-routing:payable-cost:view'],
    ['market:pending-routing:return-review', 'market:pending-routing:view'],
    ['market:routed:reroute', 'market:routed:view'],
    ['market:routed:replace-agent', 'market:routed:view'],
    ['market:routed:routing-log:view', 'market:routed:view'],
    ['market:routing-report:export', 'market:routing-report:view']
  ];
  for (const [action, view] of marketViewDependencies) {
    if (normalized.includes(action) && !normalized.includes(view)) normalized.push(view);
  }
  if (normalized.includes('customer-service:transfer:request-agent-change')
    && !normalized.includes('customer-service:transfer:view')) {
    normalized.push('customer-service:transfer:view');
  }
  const financePageViewByPrefix: Array<[string, PermissionKey]> = [
    ['finance:dashboard:', 'finance:dashboard:view'],
    ['finance:receivable:', 'finance:receivable:read'],
    ['finance:business-cost:', 'finance:business-cost:read'],
    ['finance:payable:', 'finance:payable:read'],
    ['finance:pending-payment:', 'finance:pending-payment:read'],
    ['finance:paid-payment:', 'finance:paid-payment:read'],
    ['finance:water-receipt:', 'finance:water-receipt:read'],
    ['finance:water-match:', 'finance:water-match:read'],
    ['finance:agent-bill:', 'finance:agent-bill:read']
  ];
  for (const [prefix, view] of financePageViewByPrefix) {
    if (normalized.some((permission) => permission.startsWith(prefix) && permission !== view)
      && !normalized.includes(view)) {
      normalized.push(view);
    }
  }
  if (normalized.some((permission) => permission === 'finance:water-match:audit' || permission === 'finance:water-match:reverse')
    && !normalized.includes('finance:receivable:read')) {
    normalized.push('finance:receivable:read');
  }
  if (normalized.includes('finance:pending-payment:create')
    && !normalized.includes('finance:pending-payment:bill-voucher-upload')) {
    normalized.push('finance:pending-payment:bill-voucher-upload');
  }
  if (normalized.includes('finance:pending-payment:create')
    && !normalized.includes('finance:pending-payment:bank-select')) {
    normalized.push('finance:pending-payment:bank-select');
  }
  if (normalized.includes('finance:paid-payment:voucher-delete')
    && !normalized.includes('finance:paid-payment:voucher-view')) {
    normalized.push('finance:paid-payment:voucher-view');
  }
  if (normalized.includes('finance:order-fee:payable:manage')
    && !normalized.includes('finance:order-fee:payable:view')) {
    normalized.push('finance:order-fee:payable:view');
  }
  return withImpliedOperationalPermissions(withImpliedCustomerServiceViewPermissions(withImpliedTargetPageViewPermissions(normalized)));
}

export function managementPermissionsForRole(
  role: RoleKey,
  configuredPermissions?: readonly PermissionKey[]
): PermissionKey[] {
  return normalizeRolePermissions(role, [
    ...(configuredPermissions ?? defaultPermissionsForRole(role))
  ]);
}

const marketSensitivePermissionKeys = new Set<PermissionKey>([
  'business:shipment:agent-weight-view',
  'finance:payable:view-sensitive',
  'finance:business-cost:view-agent',
  'market:pending-routing:payable-cost:view',
  'market:pending-routing:payable-cost:create',
  'market:pending-routing:payable-cost:edit',
  'market:pending-routing:payable-cost:delete'
]);

export function getNewlyAddedMarketSensitivePermissions(
  before: readonly PermissionKey[],
  after: readonly PermissionKey[]
): PermissionKey[] {
  const existing = new Set(before);
  return after.filter((permission) => marketSensitivePermissionKeys.has(permission) && !existing.has(permission));
}

export function defaultPermissionsForRole(role: RoleKey): PermissionKey[] {
  if (isBuiltinRoleKey(role)) {
    return [...rolePermissions[role]];
  }
  const roleGroup = defaultRoleGroups.find((group) => group.key === role);
  if (roleGroup) {
    const inherited = [...rolePermissions[roleGroup.templateRole]];
    if (role === 'UG_WAREHOUSE_RECEIVE') {
      return inherited.filter((permission) => permission.startsWith('warehouse:today-receipt:')
        || permission.startsWith('warehouse:rent-detail:')
        || permission === 'warehouse:in-stock:view'
        || permission === 'warehouse:in-stock:edit'
        || !permission.startsWith('warehouse:'));
    }
    if (role === 'UG_WAREHOUSE_OUTBOUND') {
      return inherited.filter((permission) => permission.startsWith('warehouse:dispatch-pending:')
        || permission.startsWith('warehouse:outbounded:')
        || permission.startsWith('warehouse:rent-')
        || !permission.startsWith('warehouse:'));
    }
    if (role === 'UG_MARKET') {
      return [...new Set<PermissionKey>([
        ...pricingLookupBusinessPermissions,
        'data-scope:misc-fee-market',
        'master-data:agents:read',
        'master-data:agent-channels:read',
        'master-data:channels:read',
        'master-data:channel-categories:read',
        'master-data:exchange-rates:read',
        ...marketBasePermissions,
        ...miscFeeMarketPermissions,
        ...pricingManagementPermissions
      ])];
    }
    if (role === 'UG_BUSINESS_MANAGER') {
      inherited.push(
        'business:dashboard:team-view',
        'business:shipment:team-view'
      );
    }
    if (role === 'UG_BUSINESS_SUPERVISOR') {
      inherited.push(
        'business:dashboard:team-view',
        'business:review:view',
        'business:review:edit',
        'business:shipment:team-view',
        'business:shipment:update-operational',
        'business:shipment:payment-record'
      );
    }
    return [...new Set(inherited)];
  }
  return [];
}

export function getRoleMetadata(role: RoleKey): Omit<RolePermissionRow, 'permissions'> {
  if (isBuiltinRoleKey(role)) {
    return roleMetadata[role];
  }
  if (role === YOYO_ADMIN_ROLE_KEY) {
    return {
      key: role,
      label: 'yoyo管理员',
      account: 'yoyo01',
      scope: '全局数据',
      restriction: '管理员等效用户组：固定拥有全部权限',
      sortOrder: 15,
      enabled: true,
      systemBuiltin: false,
      administratorEquivalent: true
    };
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

export function isBusinessNamedUserGroup(principal: Pick<Principal, 'role' | 'assignedRole' | 'roleLabel'>): boolean {
  const role = principal.assignedRole ?? principal.role;
  const label = String(principal.roleLabel?.trim() || getRoleMetadata(role).label).trim();
  return label.includes('业务');
}

export type TrackingShipmentScope = 'all' | 'customer' | 'customer-service' | 'market' | 'sales' | 'none';

/** Tracking reuses existing ownership/site scopes; unknown custom groups fail closed. */
export function trackingShipmentScopeForPrincipal(
  principal: Pick<Principal, 'role' | 'assignedRole' | 'roleLabel' | 'dataScope' | 'effectivePermissions' | 'shipmentAllView'>
): TrackingShipmentScope {
  const role = principal.assignedRole ?? principal.role;
  const label = String(principal.roleLabel?.trim() || getRoleMetadata(role).label).trim();
  if (isAdministratorRole(role)) return 'all';
  if (role === 'CUSTOMER') return 'customer';
  if (principal.shipmentAllView && !isBusinessAgentOwnOnlyRole(role)) return 'all';
  if (role === 'CUSTOMER_SERVICE' || role === 'UG_CUSTOMER_SERVICE' || label.includes('客服')) return 'customer-service';
  if (role === 'UG_MARKET' || label.includes('市场')) return 'market';
  if (
    principal.dataScope === 'SALES_OWN'
    || principal.effectivePermissions?.includes('data-scope:sales-own')
    || isSalesScopedRole(role)
    || isBusinessNamedUserGroup(principal)
  ) return 'sales';
  return 'none';
}

export function buildRolePermissionRow(role: RoleKey, permissions: PermissionKey[], metadata: Partial<Omit<RolePermissionRow, 'key' | 'permissions'>> = {}): RolePermissionRow {
  return {
    ...getRoleMetadata(role),
    ...metadata,
    key: role,
    permissions: normalizeRolePermissions(role, permissions),
    administratorEquivalent: role === YOYO_ADMIN_ROLE_KEY
  };
}

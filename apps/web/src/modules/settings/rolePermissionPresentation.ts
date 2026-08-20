import type { PermissionDefinition, PermissionKey, RoleKey } from '../../apiClient';

export type PermissionControlCategory = '页面访问' | '业务操作' | '敏感字段' | '高风险操作';
export type PermissionControlRisk = 'normal' | 'sensitive' | 'high' | 'critical';

export interface PermissionControl {
  id: string;
  label: string;
  description: string;
  category: PermissionControlCategory;
  risk: PermissionControlRisk;
  codes: PermissionKey[];
  adminGrantOnly?: boolean;
}

export function updateFinanceOrderFeePermission(
  grantedPermissions: PermissionKey[],
  codes: PermissionKey[],
  checked: boolean
): PermissionKey[] {
  const next = new Set(grantedPermissions);
  const viewCode: PermissionKey = 'finance:order-fee:payable:view';
  const manageCode: PermissionKey = 'finance:order-fee:payable:manage';
  if (checked) {
    codes.forEach((code) => next.add(code));
    if (codes.includes(manageCode)) next.add(viewCode);
  } else {
    codes.forEach((code) => next.delete(code));
    if (codes.includes(viewCode)) next.delete(manageCode);
  }
  return [...next];
}

export type PermissionGroupAccessControl = Pick<PermissionControl, 'id' | 'label' | 'description' | 'codes'>;

export const permissionControlCategoryOrder: PermissionControlCategory[] = ['页面访问', '业务操作', '敏感字段', '高风险操作'];

const marketPermissionControls: Record<string, PermissionControl[]> = {
  '市场管理 / 市场看板': [
    {
      id: 'market-dashboard-view',
      label: '查看',
      description: '查看市场看板。',
      category: '页面访问',
      risk: 'normal',
      codes: ['market:dashboard:view']
    }
  ],
  '市场管理 / 待排货': [
    {
      id: 'market-pending-view',
      label: '查看',
      description: '查看待排货列表和详情。',
      category: '页面访问',
      risk: 'normal',
      codes: ['market:pending-routing:view']
    },
    {
      id: 'market-pending-route',
      label: '排货',
      description: '为待排货订单分配代理和渠道并保存排货资料。',
      category: '业务操作',
      risk: 'normal',
      codes: ['market:pending-routing:route']
    },
    {
      id: 'market-pending-edit',
      label: '修改',
      description: '修改待排货订单的排货资料。',
      category: '业务操作',
      risk: 'normal',
      codes: ['market:pending-routing:edit']
    },
    {
      id: 'market-pending-approve',
      label: '审核',
      description: '审核排货并推进订单状态。',
      category: '高风险操作',
      risk: 'high',
      codes: ['market:pending-routing:approve']
    },
    {
      id: 'market-pending-operation-log-view',
      label: '查看操作日志',
      description: '查看该票待排货操作记录。',
      category: '页面访问',
      risk: 'normal',
      codes: ['market:pending-routing:operation-log:view']
    },
    {
      id: 'market-pending-business-cost-view',
      label: '查看业务成本',
      description: '查看业务成本明细，不包含真实应付和利润。',
      category: '敏感字段',
      risk: 'sensitive',
      codes: ['market:pending-routing:business-cost:view']
    },
    {
      id: 'market-pending-business-cost-create',
      label: '新增业务成本',
      description: '新增业务成本；审核后仍只允许新增，不允许改动已审核成本。',
      category: '敏感字段',
      risk: 'sensitive',
      codes: ['market:pending-routing:business-cost:create']
    },
    {
      id: 'market-pending-business-cost-edit',
      label: '修改业务成本',
      description: '修改未完成审核的业务成本。',
      category: '敏感字段',
      risk: 'sensitive',
      codes: ['market:pending-routing:business-cost:edit']
    },
    {
      id: 'market-pending-business-cost-delete',
      label: '删除业务成本',
      description: '删除未完成审核的业务成本。',
      category: '高风险操作',
      risk: 'high',
      codes: ['market:pending-routing:business-cost:delete']
    },
    {
      id: 'market-pending-payable-cost-view',
      label: '查看应付成本',
      description: '查看该票代理侧应付费用明细。',
      category: '敏感字段',
      risk: 'sensitive',
      codes: ['market:pending-routing:payable-cost:view']
    },
    {
      id: 'market-pending-payable-cost-create',
      label: '新增应付成本',
      description: '新增代理侧应付费用；审核后仍只允许新增。',
      category: '敏感字段',
      risk: 'sensitive',
      codes: ['market:pending-routing:payable-cost:create']
    },
    {
      id: 'market-pending-payable-cost-edit',
      label: '修改应付成本',
      description: '修改未完成审核的代理侧应付费用。',
      category: '敏感字段',
      risk: 'sensitive',
      codes: ['market:pending-routing:payable-cost:edit']
    },
    {
      id: 'market-pending-payable-cost-delete',
      label: '删除应付成本',
      description: '删除未完成审核且未被付款引用的代理侧应付费用。',
      category: '高风险操作',
      risk: 'high',
      codes: ['market:pending-routing:payable-cost:delete']
    },
    {
      id: 'market-pending-return-review',
      label: '退回重审',
      description: '将待排货订单退回业务重新审核。',
      category: '高风险操作',
      risk: 'high',
      codes: ['market:pending-routing:return-review']
    }
  ],
  '市场管理 / 已排货': [
    {
      id: 'market-routed-view',
      label: '查看',
      description: '查看已排货列表和详情。',
      category: '页面访问',
      risk: 'normal',
      codes: ['market:routed:view']
    },
    {
      id: 'market-routed-routing-log-view',
      label: '查看排货日志',
      description: '查看已排货订单的排货记录。',
      category: '页面访问',
      risk: 'normal',
      codes: ['market:routed:routing-log:view']
    },
    {
      id: 'market-routed-replace-agent',
      label: '处理代理变更',
      description: '处理客服在转单号阶段发起的代理或代理渠道变更申请。',
      category: '高风险操作',
      risk: 'high',
      codes: ['market:routed:replace-agent']
    },
    {
      id: 'market-routed-reroute',
      label: '退回重新排货',
      description: '将已排货订单退回待排货并重新处理。',
      category: '高风险操作',
      risk: 'high',
      codes: ['market:routed:reroute']
    }
  ],
  '市场管理 / 排货数据': [
    {
      id: 'market-report-view',
      label: '查看',
      description: '查看本周或本月排货汇总和明细。',
      category: '页面访问',
      risk: 'normal',
      codes: ['market:routing-report:view']
    },
    {
      id: 'market-report-export',
      label: '导出',
      description: '导出当前周期排货明细，导出内容继续按字段权限裁剪。',
      category: '高风险操作',
      risk: 'high',
      codes: ['market:routing-report:export']
    }
  ]
};

const financePermissionControls: Record<string, PermissionControl[]> = {
  '财务管理 / 财务看板': [
    control('finance-dashboard-view', '查看', '查看财务看板。', '页面访问', 'normal', ['finance:dashboard:view'])
  ],
  '财务管理 / 应收审核': [
    control('finance-receivable-read', '查看', '查看应收审核列表。', '页面访问', 'normal', ['finance:receivable:read']),
    control('finance-receivable-create', '新增', '新增应收记录。', '业务操作', 'normal', ['finance:receivable:create']),
    control('finance-receivable-audit', '审核', '审核单条或批量审核应收。', '高风险操作', 'high', ['finance:receivable:audit']),
    control('finance-receivable-reverse', '反审核', '反审核单条或批量反审核应收。', '高风险操作', 'high', ['finance:receivable:reverse']),
    control('finance-receivable-void', '删除', '删除单条或批量删除应收。', '高风险操作', 'high', ['finance:receivable:void']),
    control('finance-receivable-export', '导出', '导出应收审核数据。', '高风险操作', 'high', ['finance:receivable:export']),
    control('finance-receivable-view-all', '查看全部数据', '查看职责范围外的全部应收数据。', '敏感字段', 'sensitive', ['finance:receivable:view-all'])
  ],
  '财务管理 / 业务成本审核': [
    control('finance-business-cost-read', '查看', '查看业务成本审核列表。', '页面访问', 'normal', ['finance:business-cost:read']),
    control('finance-business-cost-manage', '新增和修改', '新增或修改业务成本。', '业务操作', 'normal', ['finance:business-cost:manage']),
    control('finance-business-cost-audit', '审核', '审核单条或批量审核业务成本。', '高风险操作', 'high', ['finance:business-cost:audit']),
    control('finance-business-cost-reverse', '反审核', '反审核单条或批量反审核业务成本。', '高风险操作', 'high', ['finance:business-cost:reverse']),
    control('finance-business-cost-void', '作废', '作废单条或批量作废业务成本。', '高风险操作', 'high', ['finance:business-cost:void']),
    control('finance-business-cost-export', '导出', '导出业务成本数据。', '高风险操作', 'high', ['finance:business-cost:export']),
    control('finance-business-cost-view-agent', '查看代理信息', '查看业务成本关联的代理信息。', '敏感字段', 'sensitive', ['finance:business-cost:view-agent']),
    control('finance-business-cost-view-profit', '查看利润', '查看业务利润字段。', '敏感字段', 'sensitive', ['finance:business-cost:view-profit']),
    control('finance-business-cost-view-all', '查看全部数据', '查看职责范围外的全部业务成本。', '敏感字段', 'sensitive', ['finance:business-cost:view-all'])
  ],
  '财务管理 / 市场应付审核': [
    control('finance-payable-read', '查看', '查看市场应付审核列表。', '页面访问', 'normal', ['finance:payable:read']),
    control('finance-payable-manage', '新增和修改', '新增或修改应付费用。', '业务操作', 'normal', ['finance:payable:manage']),
    control('finance-payable-match-shipment', '匹配订单', '按单号匹配应付所属订单。', '业务操作', 'normal', ['finance:payable:match-shipment']),
    control('finance-payable-audit', '审核', '审核单条或批量审核应付。', '高风险操作', 'high', ['finance:payable:audit']),
    control('finance-payable-reverse', '反审核', '反审核单条或批量反审核应付。', '高风险操作', 'high', ['finance:payable:reverse']),
    control('finance-payable-void', '删除', '删除单条或批量删除应付。', '高风险操作', 'high', ['finance:payable:void']),
    control('finance-payable-export', '导出', '导出市场应付数据。', '高风险操作', 'high', ['finance:payable:export']),
    control('finance-payable-view-sensitive', '查看应付金额和代理', '查看真实应付金额及代理字段。', '敏感字段', 'sensitive', ['finance:payable:view-sensitive']),
    control('finance-payable-view-profit', '查看利润', '查看应收利润和运营利润。', '敏感字段', 'sensitive', ['finance:payable:view-profit'])
  ],
  '财务管理 / 单票费用': [
    control('finance-order-fee-payable-view', '查看应付费用', '查看单票费用中的真实应付金额。', '敏感字段', 'sensitive', ['finance:order-fee:payable:view']),
    control('finance-order-fee-payable-manage', '维护应付费用', '新增、修改或删除单票应付费用。', '高风险操作', 'high', ['finance:order-fee:payable:manage']),
    control('finance-order-fee-profit-receivable-payable', '查看应收应付利润', '查看应收与应付之间的利润。', '敏感字段', 'sensitive', ['finance:order-fee:profit:receivable-payable']),
    control('finance-order-fee-profit-receivable-business', '查看应收业务利润', '查看应收与业务成本之间的利润。', '敏感字段', 'sensitive', ['finance:order-fee:profit:receivable-business']),
    control('finance-order-fee-profit-business-payable', '查看业务应付利润', '查看业务成本与应付之间的利润。', '敏感字段', 'sensitive', ['finance:order-fee:profit:business-payable'])
  ],
  '财务管理 / 待付款': [
    control('finance-pending-read', '查看', '查看待付款列表。', '页面访问', 'normal', ['finance:pending-payment:read']),
    control('finance-pending-create', '生成付款申请', '按付款组生成付款申请并上传必需的供应商账单。', '高风险操作', 'high', ['finance:pending-payment:create', 'finance:pending-payment:bill-voucher-upload']),
    control('finance-pending-cancel', '撤回付款申请', '撤回尚未支付的付款申请。', '高风险操作', 'high', ['finance:pending-payment:cancel']),
    control('finance-pending-bank-select', '选择收款银行', '从已有银行资料中选择收款银行。', '敏感字段', 'sensitive', ['finance:pending-payment:bank-select']),
    control('finance-pending-bank-manage', '维护收款银行', '录入并保存收款银行资料。', '高风险操作', 'high', ['finance:pending-payment:bank-manage']),
    control('finance-pending-export', '导出', '导出待付款数据。', '高风险操作', 'high', ['finance:pending-payment:export'])
  ],
  '财务管理 / 已付款': [
    control('finance-paid-read', '查看', '查看已付款列表。', '页面访问', 'normal', ['finance:paid-payment:read']),
    control('finance-paid-confirm', '确认支付', '确认付款并形成已付款记录。', '高风险操作', 'high', ['finance:paid-payment:confirm']),
    control('finance-paid-update', '补充付款信息', '补充已付款信息。', '业务操作', 'normal', ['finance:paid-payment:update']),
    control('finance-paid-reverse', '反核销', '撤销已付款确认并退回待付款。', '高风险操作', 'high', ['finance:paid-payment:reverse']),
    control('finance-paid-voucher-view', '查看付款凭证', '查看付款凭证。', '敏感字段', 'sensitive', ['finance:paid-payment:voucher-view']),
    control('finance-paid-voucher-upload', '上传付款凭证', '上传或补充付款凭证。', '高风险操作', 'high', ['finance:paid-payment:voucher-upload']),
    control('finance-paid-bank-view', '查看付款银行', '查看收付款银行字段。', '敏感字段', 'sensitive', ['finance:paid-payment:bank-view']),
    control('finance-paid-export', '导出', '导出已付款数据。', '高风险操作', 'high', ['finance:paid-payment:export'])
  ],
  '财务管理 / 水单到账查询': [
    control('finance-water-read', '查看', '查看水单到账列表。', '页面访问', 'normal', ['finance:water-receipt:read']),
    control('finance-water-create', '新增', '新增水单。', '业务操作', 'normal', ['finance:water-receipt:create']),
    control('finance-water-update', '修改', '修改水单信息。', '业务操作', 'normal', ['finance:water-receipt:update']),
    control('finance-water-arrive', '确认到账', '确认水单到账。', '高风险操作', 'high', ['finance:water-receipt:arrive']),
    control('finance-water-archive', '归档', '归档已完成水单。', '高风险操作', 'high', ['finance:water-receipt:archive']),
    control('finance-water-void', '作废', '作废水单。', '高风险操作', 'high', ['finance:water-receipt:void']),
    control('finance-water-voucher-view', '查看凭证', '查看水单凭证。', '敏感字段', 'sensitive', ['finance:water-receipt:voucher-view']),
    control('finance-water-voucher-upload', '上传凭证', '上传或替换水单凭证。', '高风险操作', 'high', ['finance:water-receipt:voucher-upload']),
    control('finance-water-voucher-delete', '删除凭证', '删除水单凭证。', '高风险操作', 'high', ['finance:water-receipt:voucher-delete']),
    control('finance-water-export', '导出', '导出水单数据。', '高风险操作', 'high', ['finance:water-receipt:export']),
    control('finance-water-view-all', '查看全部数据', '查看职责范围外的全部水单。', '敏感字段', 'sensitive', ['finance:water-receipt:view-all'])
  ],
  '财务管理 / 水单匹配': [
    control('finance-water-match-read', '查看', '查看水单匹配列表。', '页面访问', 'normal', ['finance:water-match:read']),
    control('finance-water-match-create', '匹配', '发起水单与应收匹配。', '高风险操作', 'high', ['finance:water-match:create']),
    control('finance-water-match-audit', '审核匹配', '审核单条或批量审核水单匹配。', '高风险操作', 'high', ['finance:water-match:audit']),
    control('finance-water-match-reverse', '反审核匹配', '反审核单条或批量反审核水单匹配。', '高风险操作', 'high', ['finance:water-match:reverse']),
    control('finance-water-match-adjust', '修改待审核分配金额', '修改尚未审核的水单分配金额。', '高风险操作', 'high', ['finance:water-match:adjust']),
    control('finance-water-match-cancel', '删除待审核分配', '删除单条或批量删除尚未审核的水单分配。', '高风险操作', 'high', ['finance:water-match:cancel']),
    control('finance-water-match-export', '导出', '导出水单匹配数据。', '高风险操作', 'high', ['finance:water-match:export'])
  ],
  '财务管理 / 代理账单': [
    control('finance-agent-bill-read', '查看', '查看代理账单列表。', '页面访问', 'normal', ['finance:agent-bill:read']),
    control('finance-agent-bill-import', '保存代理账单', '录入并保存代理账单。', '高风险操作', 'high', ['finance:agent-bill:import']),
    control('finance-agent-bill-difference', '处理差异', '将代理账单差异标记为已处理。', '高风险操作', 'high', ['finance:agent-bill:difference-resolve']),
    control('finance-agent-bill-archive', '归档', '归档代理账单。', '高风险操作', 'high', ['finance:agent-bill:archive']),
    control('finance-agent-bill-reverse-archive', '反归档', '恢复已归档代理账单。', '高风险操作', 'high', ['finance:agent-bill:reverse-archive'])
  ]
};

function control(
  id: string,
  label: string,
  description: string,
  category: PermissionControlCategory,
  risk: PermissionControlRisk,
  codes: PermissionKey[]
): PermissionControl {
  return { id, label, description, category, risk, codes };
}

export function isUiPreferencePermission(permission: Pick<PermissionDefinition, 'code' | 'label'>): boolean {
  return /:(?:column-setting|list-setting)$/i.test(permission.code) || /保存.*列设置/.test(permission.label);
}

export function isLineShipmentStageEditBlockPermission(permission: Pick<PermissionDefinition, 'code'>): boolean {
  return permission.code.startsWith('operations:line-shipment:stage-edit-block:');
}
export function isLineShipmentStageEditPermission(permission: Pick<PermissionDefinition, 'code'>): boolean {
  return permission.code.startsWith('operations:line-shipment:stage-edit:');
}


export function inferPermissionRisk(permission: Pick<PermissionDefinition, 'code' | 'label'>): PermissionControlRisk {
  const value = `${permission.code} ${permission.label}`;
  if (/^system:role-permissions:(update|save|copy-role|batch-grant|batch-revoke|clear|admin-update)$/i.test(permission.code)) return 'critical';
  if (/^system:accounts:update-role$/i.test(permission.code)) return 'critical';
  if (/^system:accounts:reset-password$/i.test(permission.code)) return 'high';
  if (/(purge|admin-update|hard-delete|restore-config|彻底删除|修改管理员组|恢复系统配置)/i.test(value)) return 'critical';
  if (/(delete|void|reverse|audit|approve|reject|confirm|payment|import|upload|export|(?:^|[-:])process\b|status-update|(?:^|[-:])assist\b|删除|作废|反审|审核|确认|付款|导入|上传|导出)/i.test(value)) return 'high';
  if (/(profit|cost|payable|bank|internal-source|agent-channel|raw-request|利润|成本|应付|银行|内部来源|真实代理|代理渠道|敏感字段)/i.test(value)) return 'sensitive';
  return 'normal';
}

function inferPermissionCategory(permission: PermissionDefinition, risk: PermissionControlRisk): PermissionControlCategory {
  // Exact :view/:read/:list actions are second-level entry switches. A
  // module name such as data-confirm must not make its entry switch high-risk.
  if (/(?:^|:)(?:view|read|list)$/i.test(permission.code)) return '页面访问';
  if (risk === 'critical' || risk === 'high') return '高风险操作';
  if (risk === 'sensitive') return '敏感字段';
  if (/(view|read|list|detail|查看|进入)/i.test(`${permission.code} ${permission.label}`)) return '页面访问';
  return '业务操作';
}

export function getPermissionControls(group: string, permissions: PermissionDefinition[]): PermissionControl[] {
  const configured = marketPermissionControls[group] ?? financePermissionControls[group];
  const configurablePermissions = permissions.filter(
    (permission) => !isUiPreferencePermission(permission)
      && !isLineShipmentStageEditBlockPermission(permission)
      && !isLineShipmentStageEditPermission(permission)
      && !permission.code.includes('-block')
  );
  if (!configured) {
    return configurablePermissions.map((permission) => {
      const risk = inferPermissionRisk(permission);
      return {
        id: permission.code,
        label: permission.label,
        description: `允许该岗位${permission.label}。`,
        category: inferPermissionCategory(permission, risk),
        risk,
        codes: [permission.code]
      };
    });
  }
  const availableCodes = new Set(configurablePermissions.map((permission) => permission.code));
  return configured
    .map((control) => ({ ...control, codes: control.codes.filter((code) => availableCodes.has(code)) }))
    .filter((control) => control.codes.length > 0);
}

const businessAgentOwnOnlyRoles = new Set<RoleKey>([
  'OPERATOR',
  'UG_BUSINESS',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN'
]);
const businessAgentBroadScopeRoles = new Set<RoleKey>([
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR'
]);

export function isPermissionAssignableForRole(
  role: RoleKey | null | undefined,
  permission: PermissionKey,
  grantedPermissions: readonly PermissionKey[] = []
): boolean {
  const ownOnly = Boolean(role) && (
    businessAgentOwnOnlyRoles.has(role!)
    || (
      !businessAgentBroadScopeRoles.has(role!)
      && grantedPermissions.includes('data-scope:sales-own')
    )
  );
  return !role
    || !ownOnly
    || !/(?:^|:)(?:all-view|team-view|view-all|all-order-context|scope-(?:team|site|all))$/.test(permission);
}

export function filterPermissionControlsForRole<T extends Pick<PermissionControl, 'codes'>>(
  role: RoleKey | null | undefined,
  controls: T[],
  grantedPermissions: readonly PermissionKey[] = []
): T[] {
  return controls
    .map((control) => ({
      ...control,
      codes: control.codes.filter((code) => isPermissionAssignableForRole(role, code, grantedPermissions))
    }))
    .filter((control) => control.codes.length > 0);
}

/**
 * Every permission page has one human-facing entry switch. The switch maps
 * to the existing page-access permission and does not invent a new root code.
 * The current UI treats the whole group as one二级开关; the individual codes
 * remain available here so existing role permissions can be carried forward.
 */
export function getPermissionGroupAccessControl(
  group: string,
  permissions: PermissionDefinition[]
): PermissionGroupAccessControl | null {
  const controls = getPermissionControls(group, permissions);
  const accessControl = controls.find((control) => control.category === '页面访问');
  if (!accessControl) return null;
  const entryCode = accessControl.codes.find((code) => /:(?:view|read|list)$/i.test(code));
  return entryCode ? { ...accessControl, codes: [entryCode] } : accessControl;
}

export function getPermissionDetailControls(group: string, permissions: PermissionDefinition[]): PermissionControl[] {
  const accessControl = getPermissionGroupAccessControl(group, permissions);
  if (!accessControl) return [];
  return getPermissionControls(group, permissions).filter((control) => control.id !== accessControl.id);
}

export function getPermissionControlState(control: Pick<PermissionControl, 'codes'>, grantedPermissions: PermissionKey[]) {
  const granted = new Set(grantedPermissions);
  const grantedCount = control.codes.filter((code) => granted.has(code)).length;
  return {
    checked: grantedCount === control.codes.length,
    indeterminate: grantedCount > 0 && grantedCount < control.codes.length,
    grantedCount
  };
}

/**
 * 二级入口是当前阶段唯一可配置的权限开关。历史角色可能只有入口下的
 * 某些旧操作码，没有显式的 :view/:read/:list 入口码；只要已有任一权限，
 * 页面就应把该二级入口显示为已开放，避免兼容旧授权时出现“权限丢失”的错觉。
 */
export function getPermissionGroupAccessState(
  group: string,
  permissions: PermissionDefinition[],
  grantedPermissions: PermissionKey[]
) {
  if (usesIndependentPageEntry(group)) {
    const accessControl = getPermissionGroupAccessControl(group, permissions);
    const granted = new Set(grantedPermissions);
    const accessCodes = accessControl?.codes ?? [];
    const grantedCount = accessCodes.filter((code) => granted.has(code)).length;
    return {
      checked: accessCodes.length > 0 && grantedCount === accessCodes.length,
      indeterminate: grantedCount > 0 && grantedCount < accessCodes.length,
      grantedCount
    };
  }
  const codes = getPermissionControls(group, permissions).flatMap((control) => control.codes);
  const granted = new Set(grantedPermissions);
  const grantedCount = codes.filter((code) => granted.has(code)).length;
  return {
    checked: grantedCount > 0,
    indeterminate: false,
    grantedCount
  };
}

export function updatePermissionGroupAccess(
  grantedPermissions: PermissionKey[],
  group: string,
  permissions: PermissionDefinition[],
  checked: boolean
): PermissionKey[] {
  const groupCodes = getPermissionControls(group, permissions).flatMap((control) => control.codes);
  if (!groupCodes.length) return grantedPermissions;

  const next = new Set(grantedPermissions);
  if (usesIndependentPageEntry(group)) {
    if (checked) {
      getPermissionGroupAccessControl(group, permissions)?.codes.forEach((code) => next.add(code));
    } else {
      groupCodes.forEach((code) => next.delete(code));
    }
    return [...next];
  }
  if (checked) {
    groupCodes.forEach((code) => next.add(code));
  } else {
    groupCodes.forEach((code) => next.delete(code));
  }
  return [...next];
}

function usesIndependentPageEntry(group: string): boolean {
  return [
    '运营工作台 / ',
    '业务管理 / ',
    '客服管理 / ',
    '物流轨迹管理 / ',
    '财务管理 / ',
    '杂费 / ',
    '基础资料库 / ',
    '系统管理 / '
  ].some((prefix) => group.startsWith(prefix));
}

export function updatePermissionControl(
  grantedPermissions: PermissionKey[],
  control: PermissionControl,
  checked: boolean
): PermissionKey[] {
  const next = new Set(grantedPermissions);
  control.codes.forEach((code) => checked ? next.add(code) : next.delete(code));
  return [...next];
}

export function getUnrepresentedPermissionCount(permissions: PermissionDefinition[], controls: PermissionControl[]): number {
  const represented = new Set(controls.flatMap((control) => control.codes));
  return permissions.filter((permission) => !isUiPreferencePermission(permission) && !represented.has(permission.code)).length;
}

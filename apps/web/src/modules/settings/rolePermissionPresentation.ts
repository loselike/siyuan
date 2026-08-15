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
  bulkGrantEligible?: boolean;
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
      bulkGrantEligible: true,
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
      bulkGrantEligible: true,
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
      bulkGrantEligible: true,
      codes: ['market:routed:view']
    },
    {
      id: 'market-routed-edit',
      label: '修改',
      description: '修改已排货订单中允许调整的运营资料。',
      category: '业务操作',
      risk: 'normal',
      codes: ['market:routed:edit']
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
      bulkGrantEligible: true,
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

export function canBulkGrantPermissionControl(control: PermissionControl, _role: RoleKey): boolean {
  return control.bulkGrantEligible === true && control.risk === 'normal';
}

export function requiresPermissionGrantConfirmation(control: PermissionControl, checked: boolean): boolean {
  return checked && (control.risk === 'sensitive' || control.risk === 'high' || control.risk === 'critical');
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
  const configured = marketPermissionControls[group];
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
  if (checked) {
    groupCodes.forEach((code) => next.add(code));
  } else {
    groupCodes.forEach((code) => next.delete(code));
  }
  return [...next];
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

import type { PermissionDefinition, PermissionKey } from '../../apiClient';
import { lineShipmentEditStageKeys, lineShipmentEditStageLabels, type LegacyPricingModule, type LineShipmentEditStageKey } from '@siyuan/shared';

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

export type WorkspaceFieldMaskKey =
  | 'agent-short-name'
  | 'agent-company-name'
  | 'agent-channel'
  | 'agent-data'
  | 'payable-cost'
  | 'payable-status';

export const firstLevelFieldMaskCatalog: Array<{ key: WorkspaceFieldMaskKey; label: string; description: string }> = [
  { key: 'agent-short-name', label: '屏蔽代理简称', description: '不返回代理简称字段。' },
  { key: 'agent-company-name', label: '屏蔽代理详细公司名', description: '不返回代理详细公司名字段。' },
  { key: 'agent-channel', label: '屏蔽代理渠道', description: '不返回代理渠道字段。' },
  { key: 'agent-data', label: '屏蔽代理数据', description: '不返回代理相关身份、渠道和计费字段。' },
  { key: 'payable-cost', label: '屏蔽应付成本', description: '不返回应付费用、应付金额和相关利润字段。' },
  { key: 'payable-status', label: '屏蔽应付状态', description: '不返回应付结算、核销和锁定状态字段。' }
];

export const firstLevelFieldMaskCatalogByWorkspace: Partial<Record<PermissionWorkspaceKey, typeof firstLevelFieldMaskCatalog>> = {
  operations: firstLevelFieldMaskCatalog
};

export function getFirstLevelFieldMaskCatalog(workspace: PermissionWorkspaceKey) {
  return firstLevelFieldMaskCatalogByWorkspace[workspace] ?? [];
}

export function workspaceFieldMaskPermissionCode(workspace: PermissionWorkspaceKey, mask: WorkspaceFieldMaskKey): PermissionKey {
  return `system:workspace-mask:${workspace}:${mask}` as PermissionKey;
}

export function isWorkspaceFieldMaskPermission(code: string): boolean {
  return code.startsWith('system:workspace-mask:');
}

export type OrderEntryFinanceMaskKey = 'business-cost' | 'payable-fee';

export const orderEntryFinanceMaskControls: Array<{
  key: OrderEntryFinanceMaskKey;
  label: string;
  description: string;
  code: PermissionKey;
}> = [
  {
    key: 'business-cost',
    label: '屏蔽业务成本',
    description: '不返回业务成本区块、字段和接口数据。',
    code: 'business:order-entry:business-cost-mask'
  },
  {
    key: 'payable-fee',
    label: '屏蔽应付费用',
    description: '不返回应付费用区块、字段和接口数据。',
    code: 'business:order-entry:payable-fee-mask'
  }
];

export function isOrderEntryFinanceMaskPermission(code: string): boolean {
  return orderEntryFinanceMaskControls.some((control) => control.code === code);
}

export const customerServiceTransferFillMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽填写转单号', code: 'customer-service:transfer:fill-block' }
];

export function isCustomerServiceTransferFillMaskPermission(code: string): boolean {
  return customerServiceTransferFillMaskControls.some((control) => control.code === code);
}

export const customerServicePendingRoutingMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽查看费用', code: 'customer-service:pending-routing:fee-detail-block' },
  { label: '屏蔽只读', code: 'customer-service:pending-routing:readonly-block' }
];

export function isCustomerServicePendingRoutingMaskPermission(code: string): boolean {
  return customerServicePendingRoutingMaskControls.some((control) => control.code === code);
}

export const customerServiceDataConfirmMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽业务审核', code: 'customer-service:data-confirm:business-approve-block' },
  { label: '屏蔽业务修改', code: 'customer-service:data-confirm:business-update-block' },
  { label: '屏蔽代理修改', code: 'customer-service:data-confirm:agent-update-block' },
  { label: '屏蔽代理审核', code: 'customer-service:data-confirm:agent-approve-block' }
];

export function isCustomerServiceDataConfirmMaskPermission(code: string): boolean {
  return customerServiceDataConfirmMaskControls.some((control) => control.code === code);
}

export const warehouseTodayReceiptMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽批量导入', code: 'warehouse:today-receipt:batch-import-block' },
  { label: '屏蔽批量下载', code: 'warehouse:today-receipt:batch-download-block' },
  { label: '屏蔽站点筛选', code: 'warehouse:today-receipt:site-filter-block' },
  { label: '屏蔽手动添加收货', code: 'warehouse:today-receipt:manual-create-block' }
];

export function isWarehouseTodayReceiptMaskPermission(code: string): boolean {
  return warehouseTodayReceiptMaskControls.some((control) => control.code === code);
}

export const warehouseTallyPendingMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽查看', code: 'warehouse:tally-pending:view-block' },
  { label: '屏蔽修改', code: 'warehouse:tally-pending:update-block' },
  { label: '屏蔽取消任务', code: 'warehouse:tally-pending:cancel-block' },
  { label: '屏蔽处理理货', code: 'warehouse:tally-pending:process-block' }
];

export function isWarehouseTallyPendingMaskPermission(code: string): boolean {
  return warehouseTallyPendingMaskControls.some((control) => control.code === code);
}

export const warehouseTallyCompletedMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽查看', code: 'warehouse:tally-completed:view-block' },
  { label: '屏蔽重新打印', code: 'warehouse:tally-label:reprint-block' },
  { label: '屏蔽下载', code: 'warehouse:tally-label:download-block' },
  { label: '屏蔽反审核', code: 'warehouse:tally-completed:reverse-block' }
];

export function isWarehouseTallyCompletedMaskPermission(code: string): boolean {
  return warehouseTallyCompletedMaskControls.some((control) => control.code === code);
}

export const warehouseRentDetailMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽规则编辑', code: 'warehouse:rent-rule:manage-block' },
  { label: '屏蔽查看所有仓租', code: 'warehouse:rent-detail:all-view-block' },
  { label: '屏蔽查看归属仓租', code: 'warehouse:rent-detail:own-view-block' }
];

export function isWarehouseRentDetailMaskPermission(code: string): boolean {
  return warehouseRentDetailMaskControls.some((control) => control.code === code);
}

export const marketPendingRoutingMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽排货', code: 'market:pending-routing:route-block' },
  { label: '屏蔽修改', code: 'market:pending-routing:update-block' },
  { label: '屏蔽审核', code: 'market:pending-routing:audit-block' },
  { label: '屏蔽操作日志', code: 'market:pending-routing:operation-log-block' },
  { label: '屏蔽业务成本修改', code: 'market:pending-routing:business-cost-update-block' },
  { label: '屏蔽业务成本新增', code: 'market:pending-routing:business-cost-create-block' },
  { label: '屏蔽业务成本删除', code: 'market:pending-routing:business-cost-delete-block' },
  { label: '屏蔽退回重审', code: 'market:pending-routing:reroute-block' }
];

export function isMarketPendingRoutingMaskPermission(code: string): boolean {
  return marketPendingRoutingMaskControls.some((control) => control.code === code);
}

export const marketRoutedMaskControls: Array<{
  label: string;
  code: PermissionKey;
}> = [
  { label: '屏蔽退回重排', code: 'market:routed:reroute-block' },
  { label: '屏蔽修改', code: 'market:routed:update-block' },
  { label: '屏蔽排货日志', code: 'market:routed:log-block' }
];

export function isMarketRoutedMaskPermission(code: string): boolean {
  return marketRoutedMaskControls.some((control) => control.code === code);
}

/** 历史录单财务权限仍由 API 兼容，但不再作为录单二级入口的可配置项展示。 */
export function isLegacyOrderEntryFinancePermission(code: string): boolean {
  return code === 'business:order-entry:business-cost-view'
    || code === 'business:order-entry:business-cost-write';
}

export function lineShipmentStageEditBlockPermissionCode(stage: LineShipmentEditStageKey): PermissionKey {
  return `operations:line-shipment:stage-edit-block:${stage.toLowerCase().replaceAll('_', '-')}` as PermissionKey;
}

export const lineShipmentStageEditBlockControls = lineShipmentEditStageKeys.map((stage) => ({
  stage,
  label: `屏蔽${lineShipmentEditStageLabels[stage]}编辑`,
  description: `勾选后，拥有“专线运单池”的用户组仍可查看该阶段，但不能打开处理/编辑。`,
  code: lineShipmentStageEditBlockPermissionCode(stage)
}));

export function isLineShipmentStageEditBlockPermission(code: string): boolean {
  return code.startsWith('operations:line-shipment:stage-edit-block:');
}

export type PricingModuleBlockScope = 'lookup' | 'markup';
export type PricingMarkupBlockMode = 'view' | 'edit';

export const pricingModuleControls: Array<{ module: LegacyPricingModule; label: string }> = [
  { module: 'amazon', label: '亚马逊查询' },
  { module: 'inquiry', label: '欧洲超大件综合查询' },
  { module: 'europeExpress', label: '欧洲空海运铁路快递查询' },
  { module: 'southAfrica', label: '南非专线查询' },
  { module: 'usaAirSea', label: '美国空海运查询' },
  { module: 'canadaAirSea', label: '加拿大空海查询' },
  { module: 'dubaiAirSea', label: '迪拜空海运查询' }
];

export function pricingModuleBlockPermissionCode(scope: PricingModuleBlockScope, module: LegacyPricingModule): PermissionKey {
  return `pricing:${scope}:module-block:${module}` as PermissionKey;
}

export function pricingMarkupModuleBlockPermissionCode(mode: PricingMarkupBlockMode, module: LegacyPricingModule): PermissionKey {
  return `pricing:markup:${mode}-block:${module}` as PermissionKey;
}

export const pricingLookupModuleBlockControls = pricingModuleControls.map((control) => ({
  ...control,
  label: `屏蔽${control.label}`,
  description: `勾选后，仍保留“查价”入口，但隐藏${control.label}，并拒绝该模块的查价请求。`,
  code: pricingModuleBlockPermissionCode('lookup', control.module)
}));

export const pricingMarkupModuleBlockControls = pricingModuleControls.map((control) => ({
  ...control,
  label: `屏蔽${control.label.replace(/查询$/, '')}加价规则`,
  description: `勾选后，仍保留“代理加价规则”入口，但隐藏${control.label.replace(/查询$/, '')}加价规则，并拒绝该模块的规则请求。`,
  code: pricingModuleBlockPermissionCode('markup', control.module)
}));

export const pricingMarkupViewBlockControls = pricingModuleControls.map((control) => ({
  ...control,
  mode: 'view' as const,
  label: `屏蔽查看${control.label.replace(/查询$/, '')}加价规则`,
  description: `勾选后，仍保留“代理加价规则”入口，但隐藏${control.label.replace(/查询$/, '')}加价规则并拒绝查看请求。`,
  code: pricingMarkupModuleBlockPermissionCode('view', control.module)
}));

export const pricingMarkupEditBlockControls = pricingModuleControls.map((control) => ({
  ...control,
  mode: 'edit' as const,
  label: `屏蔽编辑${control.label.replace(/查询$/, '')}加价规则`,
  description: `勾选后，仍可查看${control.label.replace(/查询$/, '')}加价规则，但不能新增、修改、启停、删除或批量维护。`,
  code: pricingMarkupModuleBlockPermissionCode('edit', control.module)
}));

export type PricingPriceBookBlockMode = 'create' | 'delete' | 'remark';

function pricingPriceBookChannelLabel(control: { label: string }) {
  return control.label.replace(/综合查询$|查询$/, '');
}

export function pricingPriceBookBlockPermissionCode(mode: PricingPriceBookBlockMode, module: LegacyPricingModule): PermissionKey {
  return `pricing:price-books:${mode}-block:${module}` as PermissionKey;
}

export const pricingPriceBookCreateBlockControls = pricingModuleControls.map((control) => ({
  ...control,
  mode: 'create' as const,
  label: `屏蔽${pricingPriceBookChannelLabel(control)}新增`,
  description: `勾选后，仍可进入价格表管理，但不能新增${pricingPriceBookChannelLabel(control)}价格表。`,
  code: pricingPriceBookBlockPermissionCode('create', control.module)
}));

export const pricingPriceBookDeleteBlockControls = pricingModuleControls.map((control) => ({
  ...control,
  mode: 'delete' as const,
  label: `屏蔽${pricingPriceBookChannelLabel(control)}删减`,
  description: `勾选后，仍可查看${pricingPriceBookChannelLabel(control)}价格表，但不能删减价格表。`,
  code: pricingPriceBookBlockPermissionCode('delete', control.module)
}));

export const pricingPriceBookRemarkBlockControls = pricingModuleControls.map((control) => ({
  ...control,
  mode: 'remark' as const,
  label: `屏蔽${pricingPriceBookChannelLabel(control)}修改备注`,
  description: `勾选后，仍可查看${pricingPriceBookChannelLabel(control)}价格表，但不能修改默认备注。`,
  code: pricingPriceBookBlockPermissionCode('remark', control.module)
}));

export function isPricingPriceBookBlockPermission(code: string): boolean {
  return code.startsWith('pricing:price-books:create-block:')
    || code.startsWith('pricing:price-books:delete-block:')
    || code.startsWith('pricing:price-books:remark-block:');
}

export function isPricingModuleBlockPermission(code: string): boolean {
  return code.startsWith('pricing:lookup:module-block:')
    || code.startsWith('pricing:markup:module-block:')
    || code.startsWith('pricing:markup:view-block:')
    || code.startsWith('pricing:markup:edit-block:')
    || isPricingPriceBookBlockPermission(code);
}

export function isPricingMarkupModuleBlockPermission(code: string): boolean {
  return code.startsWith('pricing:markup:module-block:')
    || code.startsWith('pricing:markup:view-block:')
    || code.startsWith('pricing:markup:edit-block:');
}

interface PermissionWorkspaceGroup {
  label: string;
  permissionGroup?: string;
}

export interface PermissionWorkspaceDefinition {
  key: PermissionWorkspaceKey;
  label: string;
  groups: PermissionWorkspaceGroup[];
}

/**
 * The permission editor follows the user's navigation, not the raw RBAC group
 * list. Nested groups remain available to the third-level editor later, while
 * legacy groups are folded into their real second-level entry here.
 */
export const permissionWorkspaceCatalog: PermissionWorkspaceDefinition[] = [
  {
    key: 'operations',
    label: '运营工作台',
    groups: ['专线运单池', 'AI 优先队列', '产品地图', '导入质检'].map((label) => ({ label }))
  },
  {
    key: 'pricing',
    label: '报价查价',
    groups: ['查价', '代理加价规则', '价格表管理'].map((label) => ({ label }))
  },
  {
    key: 'business',
    label: '业务管理',
    groups: ['业务看板', '录单', '待审核运单', '运单管理', 'AI 订单助手'].map((label) => ({ label }))
  },
  {
    key: 'warehouse',
    label: '仓库管理',
    // 仓库看板是所有仓库读权限的聚合页，没有独立 RBAC 入口，故不制造重复勾选项。
    groups: ['今日收货', '在仓数据', '未完成理货', '已完成理货', '待出库', '已出库', '仓租细分表'].map((label) => ({ label }))
  },
  {
    key: 'market',
    label: '市场管理',
    groups: [
      { label: '市场看板' },
      { label: '待排货' },
      { label: '已排货' },
      { label: '排货数据', permissionGroup: '本周排货数据' }
    ]
  },
  {
    key: 'customerService',
    label: '客服管理',
    groups: [
      '客服看板',
      '待排货',
      '数据确认',
      '转单号',
      '待离港',
      '已离港',
      '已到港',
      '已派送',
      '已签收 / 售后',
      '问题件'
    ].map((label) => ({ label }))
  },
  {
    key: 'tracking',
    label: '物流轨迹管理',
    groups: ['承运商任务', '外部物流轨迹'].map((label) => ({ label }))
  },
  {
    key: 'finance',
    label: '财务管理',
    // 付款申请与待付款共用 finance:pending-payment:* 权限，统一成一个入口开关。
    groups: ['财务看板', '应收审核', '业务成本审核', '市场应付审核', '待付款', '已付款', '水单到账查询', '水单匹配', '代理账单'].map((label) => ({ label }))
  },
  {
    key: 'miscFees',
    label: '杂费',
    groups: [
      '跨越账单',
      '提货费',
      '理货杂费',
      '代购费',
      '送货费',
      '挂账',
      '市场利润结算',
      '仓库利润结算',
      '财务利润结算'
    ].map((label) => ({ label }))
  },
  {
    key: 'master',
    label: '基础资料库',
    // 客户来源沿用客户资料权限；这里不重复生成一个会修改同一批编码的开关。
    groups: ['客户资料', '财务资料', '付款银行资料', '代理资料', '代理渠道', '公司渠道', '渠道类别', '偏远', '汇率', '资料辅助'].map((label) => ({ label }))
  },
  {
    key: 'system',
    label: '系统管理',
    groups: ['用户组', '用户名', '站点', '操作日志', '角色权限分配', '权限安全区', 'AI 接口安全', '系统基础配置'].map((label) => ({ label }))
  }
];

export function getPermissionWorkspaceDefinition(key: PermissionWorkspaceKey) {
  return permissionWorkspaceCatalog.find((workspace) => workspace.key === key) ?? permissionWorkspaceCatalog[0];
}

export function getWorkspacePermissionGroups(
  permissionGroups: Array<[string, PermissionDefinition[]]>,
  workspaceKey: PermissionWorkspaceKey
): Array<[string, PermissionDefinition[]]> {
  const workspace = getPermissionWorkspaceDefinition(workspaceKey);
  return workspace.groups.flatMap((group) => {
    const permissionGroup = group.permissionGroup ?? group.label;
    const canonicalGroup = `${workspace.label} / ${group.label}`;
    const prefix = `${workspace.label} / ${permissionGroup}`;
    const permissions = permissionGroups
      .filter(([candidate]) => candidate === prefix || candidate.startsWith(`${prefix} / `))
      .flatMap(([, groupPermissions]) => groupPermissions)
      .filter((permission) => !isWorkspaceFieldMaskPermission(permission.code))
      .filter((permission) => !isOrderEntryFinanceMaskPermission(permission.code))
      .filter((permission) => !isLegacyOrderEntryFinancePermission(permission.code))
      // 屏蔽项只在对应三级面板单独配置，不能随二级入口默认授予。
      .filter((permission) => !isWarehouseTodayReceiptMaskPermission(permission.code))
      .filter((permission) => !isWarehouseTallyPendingMaskPermission(permission.code))
      .filter((permission) => !isWarehouseTallyCompletedMaskPermission(permission.code))
      .filter((permission) => !isWarehouseRentDetailMaskPermission(permission.code))
      .filter((permission) => !isMarketPendingRoutingMaskPermission(permission.code))
      .filter((permission) => !isMarketRoutedMaskPermission(permission.code))
      .filter((permission) => !isCustomerServicePendingRoutingMaskPermission(permission.code))
      .filter((permission) => !isCustomerServiceDataConfirmMaskPermission(permission.code))
      .filter((permission) => !isCustomerServiceTransferFillMaskPermission(permission.code))
      .filter((permission, index, all) => all.findIndex((item) => item.code === permission.code) === index);
    return permissions.length ? [[canonicalGroup, permissions] as [string, PermissionDefinition[]]] : [];
  });
}

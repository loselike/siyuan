import type { LegacyPricingModule } from '@siyuan/shared';
import { pricingMarkupCapability, type PricingMarkupAction } from '@siyuan/shared';
import type { PermissionKey, Principal } from './rbac.js';

export const pricingMarkupModules: readonly LegacyPricingModule[] = [
  'amazon',
  'inquiry',
  'europeExpress',
  'southAfrica',
  'usaAirSea',
  'canadaAirSea',
  'dubaiAirSea'
];

export const pricingMarkupModuleLabels: Record<LegacyPricingModule, string> = {
  amazon: '亚马逊查询',
  inquiry: '欧洲超大件综合查询',
  europeExpress: '欧洲空海运铁路快递查询',
  southAfrica: '南非专线查询',
  usaAirSea: '美国空海运查询',
  canadaAirSea: '加拿大空海查询',
  dubaiAirSea: '迪拜空海运查询'
};

export function pricingMarkupModulePermission(module: LegacyPricingModule, action: PricingMarkupAction): PermissionKey {
  return pricingMarkupCapability(module, action) as PermissionKey;
}

export function pricingMarkupViewPermission(module: LegacyPricingModule): PermissionKey {
  return pricingMarkupModulePermission(module, 'view');
}

export function pricingMarkupActionPermission(module: LegacyPricingModule, action: PricingMarkupAction): PermissionKey {
  return pricingMarkupModulePermission(module, action === 'view' ? 'view' : 'edit');
}

export const pricingMarkupEditActions: readonly PermissionKey[] = [
  'pricing:markup:default-create',
  'pricing:markup:update',
  'pricing:markup:enable',
  'pricing:markup:delete',
  'pricing:markup:export',
  'pricing:markup:import',
  'pricing:markup:batch-upsert',
  'pricing:markup:batch-enable',
  'pricing:markup:batch-delete',
  'pricing:markup:line-custom-create',
  'pricing:markup:line-custom-update',
  'pricing:markup:batch-line-update',
  'pricing:markup-tier:create',
  'pricing:markup-tier:update',
  'pricing:markup-tier:enable',
  'pricing:markup-tier:delete',
  'pricing:channel-remark:create',
  'pricing:channel-remark:update',
  'pricing:channel-remark:enable'
];

export const pricingMarkupReadActions: readonly PermissionKey[] = [
  'pricing:markup:metrics-view',
  'pricing:markup:module-view',
  'pricing:markup:preview',
  'pricing:markup:line-detail-view',
  'pricing:markup:unmatched-view',
  'pricing:markup-tier:read',
  'pricing:markup-tier:kg-view',
  'pricing:markup-tier:cbm-view',
  'pricing:channel-remark:read'
];

export function isAdministrator(principal: Principal): boolean {
  return principal.role === 'ADMIN';
}

export const pricingMarkupLegacyBlockPermission = (kind: 'module-block' | 'view-block' | 'edit-block', module: LegacyPricingModule): PermissionKey =>
  `pricing:markup:${kind}:${module}` as PermissionKey;

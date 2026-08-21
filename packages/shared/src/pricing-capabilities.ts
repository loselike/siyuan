export type PricingModuleKey = 'amazon' | 'inquiry' | 'europeExpress' | 'ukExpress' | 'southAfrica' | 'usaAirSea' | 'canadaAirSea' | 'dubaiAirSea';

export const PRICING_MODULES = [
  { key: 'amazon', label: '亚马逊查询', lookupCode: 'pricing:lookup:amazon' },
  { key: 'inquiry', label: '欧洲超大件综合查询', lookupCode: 'pricing:lookup:europe-oversize' },
  { key: 'europeExpress', label: '欧洲空海运铁路快递查询', lookupCode: 'pricing:lookup:europe-express' },
  { key: 'ukExpress', label: '英国空海运铁路快递查询', lookupCode: 'pricing:lookup:uk-express' },
  { key: 'southAfrica', label: '南非专线查询', lookupCode: 'pricing:lookup:south-africa' },
  { key: 'usaAirSea', label: '美国空海运查询', lookupCode: 'pricing:lookup:usa-air-sea' },
  { key: 'canadaAirSea', label: '加拿大空海查询', lookupCode: 'pricing:lookup:canada-air-sea' },
  { key: 'dubaiAirSea', label: '迪拜空海运查询', lookupCode: 'pricing:lookup:dubai-air-sea' }
] as const satisfies ReadonlyArray<{ key: PricingModuleKey; label: string; lookupCode: `pricing:lookup:${string}` }>;

export type PricingMarkupAction = 'view' | 'edit' | 'create' | 'update' | 'import' | 'export' | 'status' | 'delete' | 'tier';
export type PricingMarkupGrantAction = 'view' | 'edit';
export const PRICING_MARKUP_ACTIONS = [
  { key: 'view', label: '查看' },
  { key: 'edit', label: '编辑' }
] as const satisfies ReadonlyArray<{ key: PricingMarkupGrantAction; label: string }>;

export type PricingPriceBookAction = 'view' | 'import' | 'export' | 'update' | 'delete' | 'health';
export const PRICING_PRICE_BOOK_ACTIONS = [
  { key: 'view', label: '查看价格表' }, { key: 'import', label: '导入价格表' }, { key: 'export', label: '导出价格表' },
  { key: 'update', label: '修改价格表' }, { key: 'delete', label: '删除价格表' }, { key: 'health', label: '同步体检' }
] as const satisfies ReadonlyArray<{ key: PricingPriceBookAction; label: string }>;

export type PricingLookupCapability = typeof PRICING_MODULES[number]['lookupCode'];
export type PricingMarkupCapability = `pricing:markup:${PricingModuleKey}:${PricingMarkupGrantAction}`;
export type PricingPriceBookCapability = `pricing:price-books:${PricingPriceBookAction}`;
export type PricingBusinessCapability = PricingLookupCapability | PricingMarkupCapability | PricingPriceBookCapability;

export const pricingMarkupCapability = (module: PricingModuleKey, action: PricingMarkupAction): PricingMarkupCapability =>
  `pricing:markup:${module}:${action === 'view' ? 'view' : 'edit'}`;

export const PRICING_BUSINESS_CAPABILITIES = [
  ...PRICING_MODULES.map((module) => ({ code: module.lookupCode, label: module.label, group: '查价' as const, module: module.key })),
  ...PRICING_MODULES.flatMap((module) => PRICING_MARKUP_ACTIONS.map((action) => ({
    code: pricingMarkupCapability(module.key, action.key), label: `${action.label}${module.label}加价规则`,
    group: '代理加价规则' as const, module: module.key, action: action.key
  }))),
  ...PRICING_PRICE_BOOK_ACTIONS.map((action) => ({ code: `pricing:price-books:${action.key}` as PricingPriceBookCapability, label: action.label, group: '价格表管理' as const, action: action.key }))
];

export function isPricingBusinessCapability(value: string): value is PricingBusinessCapability {
  return PRICING_BUSINESS_CAPABILITIES.some((item) => item.code === value);
}

export function hasPricingWorkspaceCapability(permissions: readonly string[]): boolean {
  return permissions.some(isPricingBusinessCapability);
}

export function hasPricingMarkupModuleCapability(permissions: readonly string[], module: PricingModuleKey): boolean {
  return permissions.some((permission) => permission.startsWith(`pricing:markup:${module}:`) && isPricingBusinessCapability(permission));
}

export function hasPricingPriceBookCapability(permissions: readonly string[]): boolean {
  return permissions.some((permission) => permission.startsWith('pricing:price-books:') && isPricingBusinessCapability(permission));
}

export function hasEffectivePricingCapability(permissions: readonly string[], requested: string): boolean {
  if (permissions.includes(requested)) return true;
  const markupEdit = requested.match(/^pricing:markup:([^:]+):(create|update|import|export|status|delete|tier)$/);
  if (markupEdit && PRICING_MODULES.some((module) => module.key === markupEdit[1])) {
    return permissions.includes(pricingMarkupCapability(markupEdit[1] as PricingModuleKey, 'edit'));
  }
  const markupView = requested.match(/^pricing:markup:([^:]+):view$/);
  if (markupView && PRICING_MODULES.some((module) => module.key === markupView[1])) {
    return permissions.includes(pricingMarkupCapability(markupView[1] as PricingModuleKey, 'view'))
      || permissions.includes(pricingMarkupCapability(markupView[1] as PricingModuleKey, 'edit'));
  }
  if (requested === 'pricing:price-books:view') return hasPricingPriceBookCapability(permissions);
  return false;
}

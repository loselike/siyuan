import {
  CANADA_ADDRESS_SCOPE_UNSPECIFIED_WAREHOUSE_CODE,
  CANADA_AMAZON_UNMAPPED_WAREHOUSE_CODE,
  CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE,
  type LegacyPricingModule,
  type LegacyPricingRecommendation
} from '@siyuan/shared';

export function getLegacyRecommendationScopeLabel(
  module: LegacyPricingModule,
  record: Pick<LegacyPricingRecommendation, 'warehouseCode' | 'destinationCountry'>
) {
  const warehouseCode = record.warehouseCode?.trim();
  if (module !== 'canadaAirSea') return warehouseCode || record.destinationCountry || '-';
  const normalizedCode = warehouseCode?.toUpperCase();
  if (!normalizedCode || normalizedCode === CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE) return '私人地址';
  if (normalizedCode === CANADA_AMAZON_UNMAPPED_WAREHOUSE_CODE) return '亚马逊仓（仓库范围未映射）';
  if (normalizedCode === CANADA_ADDRESS_SCOPE_UNSPECIFIED_WAREHOUSE_CODE) return '地址范围未识别';
  return `亚马逊仓（${warehouseCode}）`;
}

export function getLegacyRecommendationScopeColumnTitle(module: LegacyPricingModule) {
  return module === 'canadaAirSea' ? '适用地址' : '仓库/国家';
}

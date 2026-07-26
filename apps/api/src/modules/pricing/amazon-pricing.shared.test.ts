import { describe, expect, it } from 'vitest';
import type { PriceBookRowSummary } from '@siyuan/shared';
import {
  calculateLookupChargeableWeight,
  cbmTierMatches,
  createWarehouseLookupProfile,
  isOpenEndedKgTier,
  normalizeAmazonCbmTier,
  normalizeAmazonOriginWarehouseName,
  normalizeAmazonWeightBand,
  selectPriceRowsForLookup,
  uniqueAmazonOriginWarehouseNames
} from './amazon-pricing.shared.js';

function priceRow(overrides: Partial<PriceBookRowSummary>): PriceBookRowSummary {
  return {
    id: 'row',
    priceBookId: 'book',
    agentName: '亿阳国际',
    channelName: 'YY美西特惠海卡',
    realChannelName: 'YY美西特惠海卡',
    sourceSheetName: '海卡快速查询',
    warehouseCode: 'ONT8',
    destinationCountry: '美国',
    minWeightKg: 51,
    maxWeightKg: 99.999,
    costPerKg: 5,
    currency: 'RMB',
    ...overrides
  };
}

describe('amazon pricing helpers', () => {
  it('normalizes known origin labels without treating route names or code headers as origins', () => {
    expect(normalizeAmazonOriginWarehouseName('出货仓：华东')).toBe('华东');
    expect(normalizeAmazonOriginWarehouseName('深圳／广州仓')).toBe('深圳/广州仓');
    expect(normalizeAmazonOriginWarehouseName('FBA仓库代码')).toBeUndefined();
    expect(normalizeAmazonOriginWarehouseName('欧洲海运快递派')).toBeUndefined();
  });

  it('deduplicates origins in the established business order', () => {
    expect(uniqueAmazonOriginWarehouseNames(['深圳/广州仓', '华南', '出货仓：华东', '华南', 'TPD-S4-美西组合海卡']))
      .toEqual(['华东', '华南', '深圳/广州仓']);
  });

  it('preserves source KG tiers and distinguishes CBM labels', () => {
    expect(normalizeAmazonWeightBand('21kg+')).toBe('21KG+');
    expect(normalizeAmazonWeightBand('45公斤以上')).toBe('45KG+');
    expect(normalizeAmazonCbmTier('1CBM+ 按方包税')).toBe('按方包税');
    expect(normalizeAmazonCbmTier('按方不含税')).toBe('按方不包税');
    expect(normalizeAmazonCbmTier('CBM')).toBe('按方未标注');
    expect(normalizeAmazonCbmTier('100KG+')).toBeUndefined();
  });

  it('keeps the existing CBM and open-ended KG boundaries', () => {
    expect(cbmTierMatches('1-2CBM', 1)).toBe(true);
    expect(cbmTierMatches('1-2CBM', 2)).toBe(true);
    expect(cbmTierMatches('1CBM+', 1)).toBe(false);
    expect(cbmTierMatches('1CBM+', 1.001)).toBe(true);
    expect(isOpenEndedKgTier('100KG+')).toBe(true);
    expect(isOpenEndedKgTier('1CBM+')).toBe(false);
  });

  it('keeps the established ONT8 warehouse profile and chargeable-weight maximum', () => {
    const profile = createWarehouseLookupProfile({ amazonCode: ' ont 8 ', destinationCountry: '美国', chargeableWeightKg: 0 });
    expect(profile.code).toBe('ONT8');
    expect(profile.warehouseCodes.has('LAX9')).toBe(true);
    expect(profile.warehouseCodes.has('IUSJ')).toBe(true);
    expect(profile.keywords).toContain('美西');
    expect(calculateLookupChargeableWeight({
      destinationCountry: '美国',
      chargeableWeightKg: 100,
      actualWeightKg: 120,
      volumeCbm: 0.8,
      lengthCm: 50,
      widthCm: 40,
      heightCm: 30,
      packageCount: 2
    })).toBe(133.6);
    expect(calculateLookupChargeableWeight({
      destinationCountry: '美国',
      chargeableWeightKg: 0,
      unitActualWeightKg: 12.345,
      packageCount: 3
    })).toBe(37.04);
  });

  it('keeps exact warehouse fallback ahead of mapped warehouse rows', () => {
    const profile = createWarehouseLookupProfile({ amazonCode: 'ONT8', destinationCountry: '美国', chargeableWeightKg: 835 });
    const rows = [
      priceRow({ id: 'exact-expensive', costPerKg: 5 }),
      priceRow({ id: 'exact-cheapest', costPerKg: 4.5 }),
      priceRow({ id: 'mapped-higher-tier', warehouseCode: 'IUSJ', minWeightKg: 100, maxWeightKg: 99999, costPerKg: 4.8 }),
      priceRow({ id: 'unrelated', warehouseCode: 'HOU8', minWeightKg: 0, maxWeightKg: 99999, costPerKg: 1 })
    ];
    expect(selectPriceRowsForLookup(rows, profile, '美国', 835)).toEqual([
      expect.objectContaining({ id: 'exact-cheapest', warehouseCode: 'ONT8', costPerKg: 4.5 })
    ]);
  });

  it('uses mapped warehouses and rejects unrelated regional rows', () => {
    const profile = createWarehouseLookupProfile({ amazonCode: 'ONT8', destinationCountry: '美国', chargeableWeightKg: 100 });
    const rows = [
      priceRow({ id: 'mapped', warehouseCode: 'LAX9', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 18 }),
      priceRow({ id: 'unrelated', warehouseCode: 'HOU8', channelName: 'YY美中休斯顿海卡', realChannelName: 'YY美中休斯顿海卡', sourceSheetName: 'YY美中快线', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 12 })
    ];
    expect(selectPriceRowsForLookup(rows, profile, '美国', 100)).toEqual([
      expect.objectContaining({ id: 'mapped', warehouseCode: 'LAX9' })
    ]);
  });
});

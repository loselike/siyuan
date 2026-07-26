import { describe, expect, it } from 'vitest';
import {
  cbmTierMatches,
  isOpenEndedKgTier,
  normalizeAmazonCbmTier,
  normalizeAmazonOriginWarehouseName,
  normalizeAmazonWeightBand,
  uniqueAmazonOriginWarehouseNames
} from './amazon-pricing.shared.js';

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
});

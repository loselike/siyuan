import { describe, expect, it } from 'vitest';
import { normalizeAmazonOriginWarehouseName, uniqueAmazonOriginWarehouseNames } from './amazon-origin.shared.js';

describe('amazon origin warehouse helpers', () => {
  it('normalizes known origin labels without treating route names or code headers as origins', () => {
    expect(normalizeAmazonOriginWarehouseName('出货仓：华东')).toBe('华东');
    expect(normalizeAmazonOriginWarehouseName('深圳／广州仓')).toBe('深圳/广州仓');
    expect(normalizeAmazonOriginWarehouseName('FBA仓库代码')).toBeUndefined();
    expect(normalizeAmazonOriginWarehouseName('欧洲海运快递派')).toBeUndefined();
  });

  it('deduplicates origins in the established business order', () => {
    expect(uniqueAmazonOriginWarehouseNames([
      '深圳/广州仓',
      '华南',
      '出货仓：华东',
      '华南',
      'TPD-S4-美西组合海卡'
    ])).toEqual(['华东', '华南', '深圳/广州仓']);
  });
});

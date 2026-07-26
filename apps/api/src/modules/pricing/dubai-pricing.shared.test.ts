import { describe, expect, it } from 'vitest';
import type { PriceBookRowSummary } from '@siyuan/shared';
import { buildDubaiPriceTableResponse, formatDubaiPriceTier, inferDubaiPriceMode, uniqueDubaiText } from './dubai-pricing.shared.js';

function priceRow(overrides: Partial<PriceBookRowSummary>): PriceBookRowSummary {
  return {
    id: 'row',
    priceBookId: 'book',
    agentName: '亿阳国际',
    sourceSheetName: '阿联酋空派',
    channelName: '阿联酋空派 内电普货 A区',
    realChannelName: '阿联酋空派 内电普货 A区',
    destinationCountry: '迪拜',
    minWeightKg: 16,
    maxWeightKg: 99,
    costPerKg: 18,
    currency: 'RMB',
    ...overrides
  };
}

describe('dubai pricing helpers', () => {
  it('keeps AIR and SEA classification, tiers, public fields and ordered unique requirements', () => {
    const response = buildDubaiPriceTableResponse([
      priceRow({ id: 'air', productCategory: '内电普货', region: 'A区', priceTierLabel: '16-99KG', channelCode: 'AE空运-P' }),
      priceRow({ id: 'sea-cbm', sourceSheetName: '阿联酋海派', channelName: '阿联酋海派 普货类', realChannelName: '阿联酋海派 普货类', serviceContent: '普货类', cbmPrice: 1800, costPerKg: 1800, priceTierLabel: '0.5-5CBM', channelCode: 'AH海运-P', productSurchargeRemark: '不接危险品\n不接液体', specialRemark: '不接危险品\n禁电池' }),
      priceRow({ id: 'sea-code', sourceSheetName: '阿联酋海派', channelName: '阿联酋海派 敏感货', realChannelName: '阿联酋海派 敏感货', serviceContent: '敏感货', costPerKg: 1600, priceTierLabel: '0KG+', channelCode: 'AH海运-M' }),
      priceRow({ id: 'zero', costPerKg: 0 })
    ], [], (_row, _rules, mode) => mode === 'SEA' ? 2 : 0);

    expect(response.air).toEqual([
      expect.objectContaining({ id: 'air', mode: 'AIR', productCategory: '内电普货', region: 'A区', priceTierLabel: '16-99KG', businessUnitPrice: 18, unit: 'RMB/KG' })
    ]);
    expect(response.sea).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'sea-cbm', mode: 'SEA', serviceContent: '普货类', priceTierLabel: '0.5-5CBM', businessUnitPrice: 1802, unit: 'RMB/CBM', channelRequirement: '不接危险品\n不接液体\n禁电池' }),
      expect.objectContaining({ id: 'sea-code', mode: 'SEA', serviceContent: '敏感货', priceTierLabel: '按方', businessUnitPrice: 1602, unit: 'RMB/CBM' })
    ]));
    expect(response.air.some((row) => row.id === 'zero')).toBe(false);
    expect(response.sea.some((row) => row.id === 'zero')).toBe(false);
  });

  it('keeps standalone mode, tier and text boundaries', () => {
    const openAir = priceRow({ priceTierLabel: undefined, maxWeightKg: 99999 });
    expect(inferDubaiPriceMode(openAir)).toBe('AIR');
    expect(formatDubaiPriceTier(openAir, 'AIR')).toBe('16KG+');
    expect(formatDubaiPriceTier(priceRow({ priceTierLabel: '0KG+', channelCode: 'AH海运-M' }), 'SEA')).toBe('按方');
    expect(uniqueDubaiText(['同一说明\n第二条', '同一说明\n第三条'])).toBe('同一说明\n第二条\n第三条');
  });
});

import type { PriceBookRowSummary, PriceLookupRecommendation } from '@siyuan/shared';
import { describe, expect, it } from 'vitest';
import { inferBackendPriceCarrierName, matchedTransitDays, publicPricingRouteCode } from './price-recommendation-display.shared.js';

describe('price recommendation display helpers', () => {
  it('keeps public route, carrier and transit display fallbacks unchanged', () => {
    expect(publicPricingRouteCode('TPD-S4-美西组合海卡', 'DHL Express')).toBe('美西组合海卡');
    expect(publicPricingRouteCode('DHL Express')).toBe('可报价线路');
    expect(['UPS快线', 'FedEx专线', 'DHK03', '海运洛杉矶', '空运快递', '普通线路'].map((channelName) =>
      inferBackendPriceCarrierName({ channelName } as PriceBookRowSummary)
    )).toEqual(['UPS', 'FEDEX', 'DHL', '海运', '空运', '专线']);
    expect(matchedTransitDays({ price: { transitDays: 5 } } as PriceLookupRecommendation)).toBe(5);
    expect(matchedTransitDays({ price: {} } as PriceLookupRecommendation)).toBe(Number.POSITIVE_INFINITY);
  });
});

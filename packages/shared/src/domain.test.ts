import { describe, expect, it } from 'vitest';
import {
  calculateChargeableWeight,
  calculateQuote,
  canTransitionShipment,
  createShipmentInsights,
  ShipmentStatus
} from './index';

describe('shipment state transitions', () => {
  it('allows the happy path from draft to signed', () => {
    const path: ShipmentStatus[] = [
      'DRAFT',
      'DECLARED',
      'WAITING_RECEIVE',
      'WAITING_SORT',
      'WAITING_DISPATCH',
      'WAITING_ONLINE',
      'WAITING_SIGNED',
      'SIGNED'
    ];

    for (let index = 0; index < path.length - 1; index += 1) {
      expect(canTransitionShipment(path[index], path[index + 1])).toBe(true);
    }
  });

  it('blocks an invalid jump from draft directly to signed', () => {
    expect(canTransitionShipment('DRAFT', 'SIGNED')).toBe(false);
  });
});

describe('shipment weight and quote calculations', () => {
  it('uses the larger value between actual weight and volumetric weight', () => {
    const result = calculateChargeableWeight({
      actualWeightKg: 8.1,
      lengthCm: 60,
      widthCm: 50,
      heightCm: 40,
      divisor: 5000
    });

    expect(result.volumetricWeightKg).toBe(24);
    expect(result.chargeableWeightKg).toBe(24);
  });

  it('calculates receivable quote with fuel and surcharges', () => {
    const quote = calculateQuote({
      chargeableWeightKg: 12,
      baseRatePerKg: 31,
      fuelRate: 0.18,
      surcharges: [
        { name: '偏远费', amount: 80 },
        { name: '超长费', amount: 120 }
      ]
    });

    expect(quote.freight).toBe(372);
    expect(quote.fuel).toBe(66.96);
    expect(quote.surchargeTotal).toBe(200);
    expect(quote.total).toBe(638.96);
  });
});

describe('AI-friendly shipment insights', () => {
  it('flags stale tracking and problem shipments with suggested actions', () => {
    const insights = createShipmentInsights({
      status: 'WAITING_ONLINE',
      trackingStaleDays: 6,
      isRemoteArea: true,
      hasProblemTicket: true,
      chargeableWeightKg: 56,
      carrier: 'DHL'
    });

    expect(insights.riskLevel).toBe('high');
    expect(insights.tags).toContain('轨迹超时');
    expect(insights.tags).toContain('偏远地区');
    expect(insights.suggestedActions).toContain('优先联系代理确认上网节点');
  });
});

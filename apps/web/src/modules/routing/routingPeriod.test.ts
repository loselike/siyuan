import type { Shipment } from '@siyuan/shared';
import { describe, expect, it } from 'vitest';
import { getBeijingMonthStartTimestamp, getRoutingPeriodSnapshot } from './routingPeriod';

describe('routing period statistics', () => {
  it('uses Beijing calendar boundaries and includes earlier rows only in this month', () => {
    const now = '2026-07-20T04:00:00.000Z';
    const shipments = [
      {
        id: 'this-week',
        routedAt: '2026-07-20T02:00:00.000Z',
        outboundAt: '2026-07-20T03:00:00.000Z',
        sensitive: true,
        declarationRequired: true
      },
      {
        id: 'month-before-week',
        routedAt: '2026-07-02T04:00:00.000Z',
        routeReturnedAt: '2026-07-03T04:00:00.000Z',
        sensitive: true,
        declarationRequired: true
      },
      {
        id: 'previous-month',
        routedAt: '2026-06-29T04:00:00.000Z',
        outboundAt: '2026-06-29T05:00:00.000Z',
        routeReturnedAt: '2026-06-29T06:00:00.000Z',
        sensitive: true,
        declarationRequired: true
      }
    ] as Shipment[];

    expect(getBeijingMonthStartTimestamp(now)).toBe(Date.parse('2026-06-30T16:00:00.000Z'));
    expect(getRoutingPeriodSnapshot(shipments, 'week', now)).toMatchObject({
      routedShipments: [{ id: 'this-week' }],
      outboundShipments: [{ id: 'this-week' }],
      reroutedShipments: [],
      sensitiveCount: 1,
      declaredCount: 1
    });
    expect(getRoutingPeriodSnapshot(shipments, 'month', now)).toMatchObject({
      routedShipments: [{ id: 'this-week' }, { id: 'month-before-week' }],
      outboundShipments: [{ id: 'this-week' }],
      reroutedShipments: [{ id: 'month-before-week' }],
      sensitiveCount: 2,
      declaredCount: 2
    });
  });
});

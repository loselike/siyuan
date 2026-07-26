import type { Shipment } from '@siyuan/shared';
import { formatBeijingDate, getBeijingWeekStartTimestamp } from '../shared/format';

export type RoutingDataPeriod = 'week' | 'month';

export function getBeijingMonthStartTimestamp(value: string | number | Date = new Date()) {
  const monthKey = formatBeijingDate(value).slice(0, 7);
  const timestamp = Date.parse(`${monthKey}-01T00:00:00+08:00`);
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

export function getRoutingPeriodSnapshot(
  shipments: Shipment[],
  period: RoutingDataPeriod,
  now: string | number | Date = new Date()
) {
  const startedAt = period === 'week'
    ? getBeijingWeekStartTimestamp(now)
    : getBeijingMonthStartTimestamp(now);
  const isInPeriod = (value?: string) => Boolean(value && new Date(value).getTime() >= startedAt);
  const routedShipments = shipments.filter((shipment) => isInPeriod(shipment.routedAt));

  return {
    startedAt,
    routedShipments,
    outboundShipments: shipments.filter((shipment) => isInPeriod(shipment.outboundAt)),
    reroutedShipments: shipments.filter((shipment) => isInPeriod(shipment.routeReturnedAt)),
    sensitiveCount: routedShipments.filter((shipment) => shipment.sensitive === true).length,
    declaredCount: routedShipments.filter((shipment) => shipment.declarationRequired === true).length
  };
}

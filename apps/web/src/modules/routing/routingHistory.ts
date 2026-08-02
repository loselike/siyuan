import type { Shipment } from '@siyuan/shared';

export const ROUTED_RECENT_WINDOW_DAYS = 30;

export function isRoutedShipmentHistory(shipment: Pick<Shipment, 'status' | 'routedAt'>) {
  if (shipment.status === 'WAITING_DISPATCH') return true;
  return shipment.status !== 'WAITING_SORT' && Boolean(shipment.routedAt);
}

export function selectRoutedShipmentHistory(shipments: Shipment[]) {
  return shipments
    .filter(isRoutedShipmentHistory)
    .sort((left, right) => (
      new Date(right.routedAt ?? right.createdAt).getTime()
      - new Date(left.routedAt ?? left.createdAt).getTime()
    ));
}

export function selectRecentRoutedShipmentHistory(
  shipments: Shipment[],
  now = Date.now(),
  windowDays = ROUTED_RECENT_WINDOW_DAYS
) {
  const windowStart = now - windowDays * 24 * 60 * 60 * 1000;

  return selectRoutedShipmentHistory(shipments).filter((shipment) => {
    const routedAt = new Date(shipment.routedAt ?? shipment.createdAt).getTime();
    return Number.isFinite(routedAt) && routedAt >= windowStart && routedAt <= now;
  });
}

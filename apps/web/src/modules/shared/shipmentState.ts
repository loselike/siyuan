import type { Shipment } from '@siyuan/shared';

export function mergeShipmentListRecord(current: Shipment, incoming: Shipment): Shipment {
  return {
    ...current,
    ...incoming,
    site: incoming.site ?? current.site
  };
}

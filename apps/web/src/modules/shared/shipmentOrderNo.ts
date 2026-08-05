import type { ShipmentOutboundOrderNoSource } from '@siyuan/shared';

export function resolveShipmentOutboundOrderNo(source: ShipmentOutboundOrderNoSource): string {
  return source.customerOrderNo?.trim()
    || source.outboundOrderNo?.trim()
    || source.systemOrderNo?.trim()
    || '-';
}

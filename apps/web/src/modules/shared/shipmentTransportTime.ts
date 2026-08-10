import type { Shipment } from '@siyuan/shared';

export function getShipmentTransportTimeText(shipment: Shipment) {
  return shipment.transportTime?.durationText ?? '-';
}

export function getShipmentTransportTimeSeconds(shipment: Shipment) {
  return shipment.transportTime?.durationSeconds ?? -1;
}

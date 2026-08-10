import type { Shipment } from '@siyuan/shared';

type ShipmentStageDwellSnapshot = { stageKey?: string; durationText: string; durationSeconds: number };
type ShipmentWithStageDwell = Shipment & { stageDwell?: ShipmentStageDwellSnapshot; stageDwellHistory?: ShipmentStageDwellSnapshot[] };

export function getShipmentStageDwellText(shipment: Shipment, stageKey?: string) {
  const value = shipment as ShipmentWithStageDwell;
  if (stageKey) {
    const latestVisit = value.stageDwellHistory?.filter((item) => item.stageKey === stageKey).at(-1);
    if (latestVisit) return latestVisit.durationText;
    if (value.stageDwell?.stageKey === stageKey) return value.stageDwell.durationText;
    return '-';
  }
  return value.stageDwell?.durationText ?? '-';
}

export function getShipmentStageDwellSeconds(shipment: Shipment, stageKey?: string) {
  const value = shipment as ShipmentWithStageDwell;
  if (stageKey) {
    const latestVisit = value.stageDwellHistory?.filter((item) => item.stageKey === stageKey).at(-1);
    if (latestVisit) return latestVisit.durationSeconds;
    if (value.stageDwell?.stageKey === stageKey) return value.stageDwell.durationSeconds;
    return -1;
  }
  return value.stageDwell?.durationSeconds ?? -1;
}

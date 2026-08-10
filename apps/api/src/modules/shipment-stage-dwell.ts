import {
  formatShipmentDwellSeconds,
  shipmentDwellStageForStatus,
  shipmentDwellStageLabels,
  type ShipmentDwellStageKey,
  type ShipmentStageDwell,
  type ShipmentStageDwellHistoryItem,
  type ShipmentStatus
} from '@siyuan/shared';

export interface ShipmentStageHistoryRecord {
  stageKey: ShipmentDwellStageKey;
  enteredAt: Date | string;
  exitedAt?: Date | string | null;
  visitNo?: number;
}

export function buildShipmentStageDwellHistory(history: ShipmentStageHistoryRecord[], now = new Date()): ShipmentStageDwellHistoryItem[] {
  return [...history].sort((left, right) => toTimestamp(left.enteredAt) - toTimestamp(right.enteredAt)).flatMap((row, index) => {
    const enteredTimestamp = toTimestamp(row.enteredAt);
    const exitedTimestamp = row.exitedAt ? toTimestamp(row.exitedAt) : toTimestamp(now);
    const enteredAt = toIso(row.enteredAt);
    const exitedAt = row.exitedAt ? toIso(row.exitedAt) : undefined;
    if (!enteredAt || !Number.isFinite(enteredTimestamp) || !Number.isFinite(exitedTimestamp)) return [];
    const durationSeconds = Math.max(0, Math.floor((exitedTimestamp - enteredTimestamp) / 1000));
    return [{ stageKey: row.stageKey, enteredAt, ...(exitedAt ? { exitedAt } : {}), visitNo: row.visitNo ?? index + 1, completed: Boolean(exitedAt), durationSeconds, durationText: formatShipmentDwellSeconds(durationSeconds) }];
  });
}

export function stageForShipmentStatus(status?: ShipmentStatus | null): ShipmentDwellStageKey | undefined {
  return status ? shipmentDwellStageForStatus(status) : undefined;
}

export function buildShipmentStageDwell(history: ShipmentStageHistoryRecord[], currentStage: ShipmentDwellStageKey | undefined, fallbackEnteredAt?: Date | string, now = new Date()): ShipmentStageDwell | undefined {
  if (!currentStage) return undefined;
  const currentRows = history.filter((row) => row.stageKey === currentStage).sort((left, right) => toTimestamp(left.enteredAt) - toTimestamp(right.enteredAt));
  const openRow = [...currentRows].reverse().find((row) => !row.exitedAt);
  const latestRow = currentRows[currentRows.length - 1];
  const enteredAt = openRow?.enteredAt ?? latestRow?.enteredAt ?? fallbackEnteredAt;
  const enteredTimestamp = toTimestamp(enteredAt);
  const nowTimestamp = toTimestamp(now);
  if (!enteredAt || !Number.isFinite(enteredTimestamp) || !Number.isFinite(nowTimestamp)) return undefined;
  const enteredAtIso = toIso(enteredAt);
  if (!enteredAtIso) return undefined;
  const durationSeconds = Math.max(0, Math.floor((nowTimestamp - enteredTimestamp) / 1000));
  return { stageKey: currentStage, stageLabel: shipmentDwellStageLabels[currentStage], enteredAt: enteredAtIso, durationSeconds, durationText: formatShipmentDwellSeconds(durationSeconds) };
}

export function stageFallbackEnteredAt(shipment: Pick<{ createdAt: string | Date; entryAt?: string | Date; reviewedAt?: string | Date; outboundAt?: string | Date; routedAt?: string | Date; etdAt?: string | Date; etaAt?: string | Date }, 'createdAt' | 'entryAt' | 'reviewedAt' | 'outboundAt' | 'routedAt' | 'etdAt' | 'etaAt'>, stageKey: ShipmentDwellStageKey): string | Date | undefined {
  switch (stageKey) {
    case 'REVIEW_PENDING': return shipment.entryAt ?? shipment.createdAt;
    case 'WAITING_SORT': return shipment.reviewedAt ?? shipment.entryAt ?? shipment.createdAt;
    case 'WAITING_DISPATCH': return shipment.routedAt ?? shipment.reviewedAt ?? shipment.createdAt;
    case 'OUTBOUNDED': return shipment.outboundAt ?? shipment.createdAt;
    case 'DATA_CONFIRM':
    case 'TRANSFER_NO': return shipment.outboundAt ?? shipment.createdAt;
    case 'WAITING_DEPARTURE': return shipment.outboundAt ?? shipment.createdAt;
    case 'DEPARTED': return shipment.etdAt ?? shipment.outboundAt ?? shipment.createdAt;
    case 'ARRIVED_PORT':
    case 'DELIVERING': return shipment.etaAt ?? shipment.etdAt ?? shipment.outboundAt ?? shipment.createdAt;
    default: return shipment.createdAt;
  }
}

function toTimestamp(value: Date | string | undefined | null): number {
  if (!value) return NaN;
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

function toIso(value: Date | string): string | undefined {
  const timestamp = toTimestamp(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

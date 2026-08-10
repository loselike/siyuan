import {
  buildShipmentTransportTime,
  type Shipment,
  type ShipmentTransportTime
} from '@siyuan/shared';

export type ShipmentTransportAuditRecord = {
  action: string;
  before?: unknown;
  after?: unknown;
  createdAt: Date | string;
};

type AuditObject = Record<string, unknown>;

function asObject(value: unknown): AuditObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AuditObject : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asIso(value: unknown): string | undefined {
  const text = asNonEmptyString(value);
  if (!text) return undefined;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function auditCreatedAt(row: ShipmentTransportAuditRecord): string | undefined {
  return row.createdAt instanceof Date ? row.createdAt.toISOString() : asIso(row.createdAt);
}

function transferStartedAt(row: ShipmentTransportAuditRecord): string | undefined {
  const before = asObject(row.before);
  const after = asObject(row.after);
  const beforeTransferNo = asNonEmptyString(before?.transferNo);
  const transferNoTo = asNonEmptyString(after?.transferNoTo);
  const transferNo = asNonEmptyString(after?.transferNo);
  const hasNewTransferNo = Boolean((transferNoTo || transferNo) && !beforeTransferNo)
    || (row.action === 'customer_service.transfer.fill' && Boolean(transferNo));
  if (!hasNewTransferNo) return undefined;

  return asIso(after?.transferNoFilledAt)
    ?? asIso(after?.uploadedAt)
    ?? auditCreatedAt(row);
}

function transportCompletedAt(row: ShipmentTransportAuditRecord): string | undefined {
  const after = asObject(row.after);
  const statusTo = asNonEmptyString(after?.statusTo) ?? asNonEmptyString(after?.status);
  if (row.action === 'customer_service.signature.confirm' || row.action === 'shipment.sign') {
    return asIso(after?.signedAt) ?? asIso(after?.signatureConfirmedAt) ?? auditCreatedAt(row);
  }
  if (row.action === 'customer_service.status.update' && statusTo === 'SIGNED') {
    return asIso(after?.statusAt) ?? auditCreatedAt(row);
  }
  return undefined;
}

export function resolveShipmentTransportTime(
  shipment: Pick<Shipment, 'status' | 'transferNo'> & { transportStartedAt?: Date | string | null; transportCompletedAt?: Date | string | null; signedAt?: string },
  auditRows: ShipmentTransportAuditRecord[] = [],
  now: Date | string = new Date()
): ShipmentTransportTime | undefined {
  let startedAt = shipment.transportStartedAt
    ? (shipment.transportStartedAt instanceof Date ? shipment.transportStartedAt.toISOString() : asIso(shipment.transportStartedAt))
    : undefined;
  let completedAt = shipment.transportCompletedAt
    ? (shipment.transportCompletedAt instanceof Date ? shipment.transportCompletedAt.toISOString() : asIso(shipment.transportCompletedAt))
    : undefined;

  for (const row of [...auditRows].sort((left, right) => Date.parse(String(left.createdAt)) - Date.parse(String(right.createdAt)))) {
    if (!startedAt) startedAt = transferStartedAt(row);
    if (!completedAt) completedAt = transportCompletedAt(row);
    if (startedAt && completedAt) break;
  }

  if (!completedAt && shipment.status === 'SIGNED' && shipment.signedAt) {
    completedAt = asIso(shipment.signedAt);
  }
  return buildShipmentTransportTime(startedAt, completedAt, now);
}

import type { CarrierAdapterCode, CarrierTaskSummary } from '@siyuan/shared';

export interface CarrierTaskRow {
  id: string;
  shipmentId: string;
  type: string;
  carrier: string;
  transferNo: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  shipment: { systemOrderNo: string; customer: { code: string; name: string } };
}

export function mapCarrierTask(row: CarrierTaskRow): CarrierTaskSummary {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    systemOrderNo: row.shipment.systemOrderNo,
    customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
    type: row.type as CarrierTaskSummary['type'],
    carrier: toCarrierAdapterCode(row.carrier),
    transferNo: row.transferNo,
    status: row.status as CarrierTaskSummary['status'],
    attempts: row.attempts,
    lastError: row.lastError ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString()
  };
}

export function toCarrierAdapterCode(carrier: string): CarrierAdapterCode {
  const normalized = carrier.toUpperCase();
  if (normalized.includes('DHL')) return 'DHL';
  if (normalized.includes('FEDEX')) return 'FEDEX';
  if (normalized.includes('UPS')) return 'UPS';
  if (normalized.includes('USPS')) return 'USPS';
  return 'OTHER';
}

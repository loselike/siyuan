import type {
  CustomerServiceDataConfirmRow,
  CustomerServiceDataSnapshot,
  FinanceBillingUnit,
  Shipment
} from '@siyuan/shared';

export type CustomerServiceDataAuditRow = {
  action: string;
  after?: unknown;
  createdAt: string | Date;
};

export function isCustomerServiceDataApprovedFromRows(rows: CustomerServiceDataAuditRow[], kind: 'business' | 'agent', outboundAt?: string | Date) {
  const latest = rows.find((row) => customerServiceDataAuditIsInCurrentCycle(row, outboundAt) && [
    `customer_service.${kind}_data.approved`,
    `customer_service.${kind}_data.reversed`
  ].includes(row.action));
  return latest?.action === `customer_service.${kind}_data.approved`;
}

export function readCustomerServiceDataSnapshot(rows: CustomerServiceDataAuditRow[], kind: 'business' | 'agent', outboundAt?: string | Date): CustomerServiceDataSnapshot | undefined {
  const row = rows.find((item) => customerServiceDataAuditIsInCurrentCycle(item, outboundAt) && item.action === `customer_service.${kind}_data.updated`);
  const after = row?.after && typeof row.after === 'object' ? row.after as Record<string, unknown> : undefined;
  const snapshot = after?.snapshot && typeof after.snapshot === 'object' ? after.snapshot as Record<string, unknown> : undefined;
  if (!snapshot) return undefined;
  const result = {
    packageCount: Number(snapshot.packageCount),
    weightKg: Number(snapshot.weightKg),
    volumeCbm: Number(snapshot.volumeCbm),
    chargeWeightKg: Number(snapshot.chargeWeightKg)
  };
  return Number.isInteger(result.packageCount)
    && result.packageCount > 0
    && [result.weightKg, result.volumeCbm, result.chargeWeightKg].every((value) => Number.isFinite(value) && value > 0)
    ? result
    : undefined;
}

export function buildCustomerServiceDataConfirmRow(shipment: Shipment, rows: CustomerServiceDataAuditRow[]): CustomerServiceDataConfirmRow {
  return {
    shipment,
    businessDataApproved: isCustomerServiceDataApprovedFromRows(rows, 'business', shipment.outboundAt),
    agentDataApproved: isCustomerServiceDataApprovedFromRows(rows, 'agent', shipment.outboundAt),
    businessDataSnapshot: readCustomerServiceDataSnapshot(rows, 'business', shipment.outboundAt),
    agentDataSnapshot: readCustomerServiceDataSnapshot(rows, 'agent', shipment.outboundAt)
  };
}

export function attachPrimaryAgentBilling(
  row: CustomerServiceDataConfirmRow,
  billing?: { agentBillingQuantity: number; agentBillingUnit: FinanceBillingUnit }
): CustomerServiceDataConfirmRow {
  return billing ? { ...row, agentBillingQuantity: billing.agentBillingQuantity, agentBillingUnit: billing.agentBillingUnit } : row;
}

export function scopeCustomerServiceDataConfirmRow(
  row: CustomerServiceDataConfirmRow,
  permissions: { canViewBusiness: boolean; canViewAgent: boolean }
): CustomerServiceDataConfirmRow {
  const shipment = { ...row.shipment } as Record<string, unknown>;
  const scoped: CustomerServiceDataConfirmRow = { shipment: shipment as unknown as Shipment };
  if (permissions.canViewBusiness) {
    scoped.businessDataApproved = row.businessDataApproved;
    scoped.businessDataSnapshot = row.businessDataSnapshot;
  } else {
    [
      'packageCount', 'actualWeightKg', 'weightKg', 'volumeCbm', 'receivableWeightKg', 'chargeableWeightKg',
      'declarationRequired', 'sensitive', 'cargoDataSource', 'chargeWeightOverridden'
    ].forEach((key) => delete shipment[key]);
  }
  if (permissions.canViewAgent) {
    scoped.agentDataApproved = row.agentDataApproved;
    scoped.agentDataSnapshot = row.agentDataSnapshot;
    scoped.agentBillingQuantity = row.agentBillingQuantity;
    scoped.agentBillingUnit = row.agentBillingUnit;
  } else {
    [
      'agentId', 'agentName', 'agentWeightKg', 'channelId', 'channelName', 'carrier', 'routeAgentChannelName',
      'routeChargeWeightKg', 'routeUnitPrice', 'routeOtherFee', 'routeCostTotal', 'routeCurrency', 'routeCostSummary'
    ].forEach((key) => delete shipment[key]);
  }
  return scoped;
}

export function customerServiceDataAuditIsInCurrentCycle(row: CustomerServiceDataAuditRow, outboundAt?: string | Date) {
  const cycleStartedAt = validCustomerServiceDataCycleStart(outboundAt);
  if (!cycleStartedAt) return true;
  const after = row.after && typeof row.after === 'object' ? row.after as Record<string, unknown> : undefined;
  if (typeof after?.dataConfirmationCycleStartedAt === 'string') {
    const auditedCycle = validCustomerServiceDataCycleStart(after.dataConfirmationCycleStartedAt);
    return Boolean(auditedCycle && auditedCycle.getTime() === cycleStartedAt.getTime());
  }
  const createdAt = new Date(row.createdAt);
  return !Number.isNaN(createdAt.getTime()) && createdAt.getTime() >= cycleStartedAt.getTime();
}

export function validCustomerServiceDataCycleStart(value?: string | Date | null) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

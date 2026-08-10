import type { ChargeWeightChangeSummary } from '@siyuan/shared';

type ChargeWeightChangeKind = 'BUSINESS_COST' | 'PAYABLE';

type FinanceWeightRow = {
  id: string;
  shipmentId: string;
  chargeWeightKg?: unknown;
  createdAt?: unknown;
  outboundAt?: unknown;
  shipment?: { outboundAt?: unknown };
};

type WeightAuditRow = {
  action: string;
  target: string;
  before?: unknown;
  after?: unknown;
  createdAt: unknown;
};

const auditConfig = {
  BUSINESS_COST: [{
    action: 'customer_service.business_data.updated',
    source: 'CUSTOMER_SERVICE_BUSINESS_DATA'
  }],
  PAYABLE: [
    {
      action: 'customer_service.agent_data.updated',
      source: 'CUSTOMER_SERVICE_AGENT_DATA'
    },
    {
      action: 'customer_service.business_data.updated',
      source: 'CUSTOMER_SERVICE_BUSINESS_DATA'
    }
  ]
} as const;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function timestamp(value: unknown): number | undefined {
  const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sameWeight(left: number, right: number) {
  return Math.abs(left - right) < 0.000_001;
}

export function buildChargeWeightChangeMap(
  kind: ChargeWeightChangeKind,
  financeRows: FinanceWeightRow[],
  auditRows: WeightAuditRow[]
): Map<string, ChargeWeightChangeSummary> {
  const configs = auditConfig[kind];
  const auditsByShipment = new Map<string, Array<WeightAuditRow & { source: ChargeWeightChangeSummary['source'] }>>();

  auditRows
    .map((row) => {
      const config = configs.find((candidate) => candidate.action === row.action);
      return config ? { ...row, source: config.source } : undefined;
    })
    .filter((row): row is WeightAuditRow & { source: ChargeWeightChangeSummary['source'] } => Boolean(row))
    .forEach((row) => {
      const rows = auditsByShipment.get(row.target) ?? [];
      rows.push(row);
      auditsByShipment.set(row.target, rows);
    });
  auditsByShipment.forEach((rows) => rows.sort((left, right) => (timestamp(right.createdAt) ?? 0) - (timestamp(left.createdAt) ?? 0)));

  const result = new Map<string, ChargeWeightChangeSummary>();
  financeRows.forEach((financeRow) => {
    const currentChargeWeightKg = finiteNumber(financeRow.chargeWeightKg);
    const financeCreatedAt = timestamp(financeRow.createdAt);
    const outboundAt = timestamp(financeRow.shipment?.outboundAt ?? financeRow.outboundAt);
    if (currentChargeWeightKg === undefined) return;

    const matchedAudit = (auditsByShipment.get(financeRow.shipmentId) ?? []).find((audit) => {
      const auditCreatedAt = timestamp(audit.createdAt);
      if (financeCreatedAt !== undefined && auditCreatedAt !== undefined && auditCreatedAt < financeCreatedAt) return false;
      const after = asRecord(audit.after);
      const auditCycleStartedAt = timestamp(after?.dataConfirmationCycleStartedAt);
      if (outboundAt === undefined || auditCycleStartedAt === undefined || outboundAt !== auditCycleStartedAt) return false;
      const financeItemChanges = Array.isArray(after?.financeItemChanges) ? after.financeItemChanges : [];
      const financeItemChange = financeItemChanges
        .map(asRecord)
        .find((change) => change?.financeItemId === financeRow.id);
      const originalChargeWeightKg = finiteNumber(financeItemChange?.originalChargeWeightKg);
      const auditCurrentWeight = finiteNumber(financeItemChange?.currentChargeWeightKg);
      return originalChargeWeightKg !== undefined
        && auditCurrentWeight !== undefined
        && !sameWeight(originalChargeWeightKg, auditCurrentWeight);
    });
    if (!matchedAudit) return;

    const matchedAfter = asRecord(matchedAudit.after);
    const matchedChange = (Array.isArray(matchedAfter?.financeItemChanges) ? matchedAfter.financeItemChanges : [])
      .map(asRecord)
      .find((change) => change?.financeItemId === financeRow.id);
    const originalChargeWeightKg = finiteNumber(matchedChange?.originalChargeWeightKg);
    const auditCurrentWeight = finiteNumber(matchedChange?.currentChargeWeightKg);
    const changedAt = matchedAudit.createdAt instanceof Date
      ? matchedAudit.createdAt.toISOString()
      : String(matchedAudit.createdAt);
    if (originalChargeWeightKg === undefined
      || auditCurrentWeight === undefined
      || !sameWeight(auditCurrentWeight, currentChargeWeightKg)
      || !changedAt) return;
    result.set(financeRow.id, {
      originalChargeWeightKg,
      currentChargeWeightKg,
      changedAt,
      source: matchedAudit.source
    });
  });

  return result;
}

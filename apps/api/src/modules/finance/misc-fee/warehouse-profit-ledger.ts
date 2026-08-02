import type {
  MiscFeeMatchStatus,
  MiscFeeSourceType,
  ProfitSettlementStatus,
  WarehouseProfitLedgerRow
} from '@siyuan/shared';

export type WarehouseProfitLedgerCandidate = {
  id: string;
  sourceType: MiscFeeSourceType;
  ownerSite: string;
  feeName: string;
  customerCode: string;
  systemOrderNo?: string;
  agentName?: string;
  matchStatus: MiscFeeMatchStatus;
  confirmationStatus: 'PENDING' | 'CONFIRMED';
  businessRmbAmount?: number;
  payableRmbAmount: number;
  profitEligibleAt?: string;
  createdAt: string;
  createdBy?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  reviewedAt: string;
  reviewedBy?: string;
  settlementStatus?: ProfitSettlementStatus;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function warehouseProfitSettlementSourceWhere(periodFrom: Date, periodTo: Date, ownerSite: string) {
  return {
    ownerType: 'WAREHOUSE',
    confirmationStatus: 'CONFIRMED',
    businessRmbAmount: { not: null },
    profitEligibleAt: { gte: periodFrom, lte: periodTo },
    ownerSiteSnapshot: ownerSite
  } as const;
}

export function buildWarehouseProfitLedgerRows(
  candidates: WarehouseProfitLedgerCandidate[],
  actorLabels: Record<string, string> = {}
): WarehouseProfitLedgerRow[] {
  return candidates.map((candidate) => {
    const ready = candidate.confirmationStatus === 'CONFIRMED'
      && candidate.businessRmbAmount !== undefined
      && Boolean(candidate.profitEligibleAt);
    const businessCostRmbAmount = ready ? roundMoney(candidate.businessRmbAmount!) : undefined;
    const payableCostRmbAmount = roundMoney(candidate.payableRmbAmount);
    return {
      id: `warehouse-profit:${candidate.id}`,
      miscFeeRecordId: candidate.id,
      sourceType: candidate.sourceType,
      ownerSite: candidate.ownerSite,
      feeName: candidate.feeName,
      customerCode: candidate.customerCode,
      systemOrderNo: candidate.systemOrderNo,
      agentName: candidate.agentName,
      matchStatus: candidate.matchStatus,
      eligibilityStatus: ready ? 'READY' : 'PENDING_PRICING',
      businessCostRmbAmount,
      payableCostRmbAmount,
      warehouseProfitRmbAmount: ready
        ? roundMoney(businessCostRmbAmount! - payableCostRmbAmount)
        : undefined,
      settlementStatus: candidate.settlementStatus,
      ledgerAt: candidate.profitEligibleAt ?? candidate.reviewedAt,
      createdAt: candidate.createdAt,
      createdBy: candidate.createdBy ? actorLabels[candidate.createdBy] ?? candidate.createdBy : undefined,
      confirmedAt: candidate.confirmedAt,
      confirmedBy: candidate.confirmedBy ? actorLabels[candidate.confirmedBy] ?? candidate.confirmedBy : undefined,
      reviewedAt: candidate.reviewedAt,
      reviewedBy: candidate.reviewedBy ? actorLabels[candidate.reviewedBy] ?? candidate.reviewedBy : undefined
    } satisfies WarehouseProfitLedgerRow;
  }).sort((left, right) => right.ledgerAt.localeCompare(left.ledgerAt)
    || left.customerCode.localeCompare(right.customerCode, 'zh-CN')
    || left.feeName.localeCompare(right.feeName, 'zh-CN'));
}

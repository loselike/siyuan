import type {
  FinanceProfitAttributionStatus,
  FinanceProfitCashStatus,
  FinanceProfitCostOwner,
  FinanceProfitLedgerResponse,
  FinanceProfitLedgerRow,
  FinanceProfitLedgerType,
  FinanceProfitSourceOrigin,
  ProfitSettlementStatus
} from '@siyuan/shared';

export type FinanceProfitLedgerCandidate = {
  id: string;
  sourceKey: string;
  financeType: FinanceProfitLedgerType;
  sourceOrigin: FinanceProfitSourceOrigin;
  miscFeeRecordId?: string;
  shipmentId?: string;
  customerCode?: string;
  systemOrderNo?: string;
  transferNo?: string;
  feeName: string;
  agentName?: string;
  ownerType?: string;
  rmbAmount: number;
  confirmationStatus?: string;
  receiptStatus?: string;
  pendingPaymentStatus?: string;
  paymentApplicationStatus?: string;
  settlementStatus?: ProfitSettlementStatus;
  effectiveAt: string;
  createdAt: string;
  createdBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

function attributionStatus(candidate: FinanceProfitLedgerCandidate): FinanceProfitAttributionStatus {
  if (candidate.financeType !== 'PAYABLE' || candidate.sourceOrigin !== 'MISC_FEE') return 'ASSIGNED';
  if (!candidate.shipmentId) return 'PENDING_ORDER';
  return candidate.confirmationStatus === 'CONFIRMED' ? 'ASSIGNED' : 'PENDING_BUSINESS_COST';
}

function cashStatus(candidate: FinanceProfitLedgerCandidate): FinanceProfitCashStatus {
  if (candidate.financeType === 'BUSINESS_COST') return 'NOT_APPLICABLE';
  if (candidate.financeType === 'RECEIVABLE') {
    if (candidate.receiptStatus === 'RECEIVED') return 'PAID';
    if (candidate.receiptStatus === 'PARTIAL') return 'PARTIAL';
    return 'UNPAID';
  }
  if (candidate.paymentApplicationStatus === 'PAID' || candidate.pendingPaymentStatus === 'PAID') return 'PAID';
  if (candidate.paymentApplicationStatus === 'WAITING_PAYMENT' || candidate.pendingPaymentStatus === 'APPLIED') return 'PAYMENT_PENDING';
  if (candidate.pendingPaymentStatus === 'READY') return 'READY';
  return 'UNPAID';
}

function costOwner(candidate: FinanceProfitLedgerCandidate): FinanceProfitCostOwner {
  if (candidate.ownerType === 'WAREHOUSE') return 'WAREHOUSE';
  if (candidate.ownerType === 'MARKET') return 'MARKET';
  if (candidate.financeType === 'BUSINESS_COST') return 'INTERNAL';
  return 'EXTERNAL';
}

export function buildFinanceProfitLedgerRows(
  candidates: FinanceProfitLedgerCandidate[],
  actorLabels: Record<string, string> = {}
): FinanceProfitLedgerRow[] {
  const seen = new Set<string>();
  return candidates.flatMap((candidate) => {
    if (seen.has(candidate.sourceKey)) return [];
    seen.add(candidate.sourceKey);
    const amount = roundMoney(candidate.rmbAmount);
    return [{
      id: `finance-profit:${candidate.sourceKey}`,
      sourceKey: candidate.sourceKey,
      financeType: candidate.financeType,
      sourceOrigin: candidate.sourceOrigin,
      miscFeeRecordId: candidate.miscFeeRecordId,
      shipmentId: candidate.shipmentId,
      customerCode: candidate.customerCode,
      systemOrderNo: candidate.systemOrderNo,
      transferNo: candidate.transferNo,
      feeName: candidate.feeName,
      agentName: candidate.agentName,
      costOwner: costOwner(candidate),
      receivableRmbAmount: candidate.financeType === 'RECEIVABLE' ? amount : 0,
      businessCostRmbAmount: candidate.financeType === 'BUSINESS_COST' ? amount : 0,
      payableRmbAmount: candidate.financeType === 'PAYABLE' ? amount : 0,
      companyProfitImpactRmbAmount: candidate.financeType === 'RECEIVABLE'
        ? amount
        : candidate.financeType === 'PAYABLE'
          ? roundMoney(-amount)
          : 0,
      attributionStatus: attributionStatus(candidate),
      cashStatus: cashStatus(candidate),
      settlementStatus: candidate.settlementStatus,
      effectiveAt: candidate.effectiveAt,
      createdAt: candidate.createdAt,
      createdBy: candidate.createdBy ? actorLabels[candidate.createdBy] ?? candidate.createdBy : undefined,
      reviewedAt: candidate.reviewedAt,
      reviewedBy: candidate.reviewedBy ? actorLabels[candidate.reviewedBy] ?? candidate.reviewedBy : undefined
    } satisfies FinanceProfitLedgerRow];
  }).sort((left, right) => right.effectiveAt.localeCompare(left.effectiveAt)
    || (left.systemOrderNo ?? '').localeCompare(right.systemOrderNo ?? '', 'zh-CN')
    || left.feeName.localeCompare(right.feeName, 'zh-CN'));
}

export function summarizeFinanceProfitLedgerRows(rows: FinanceProfitLedgerRow[]): FinanceProfitLedgerResponse['totals'] {
  const totals = rows.reduce((result, row) => {
    result.receivableRmbAmount = roundMoney(result.receivableRmbAmount + row.receivableRmbAmount);
    result.businessCostRmbAmount = roundMoney(result.businessCostRmbAmount + row.businessCostRmbAmount);
    result.payableRmbAmount = roundMoney(result.payableRmbAmount + row.payableRmbAmount);
    result.companyProfitRmbAmount = roundMoney(result.companyProfitRmbAmount + row.companyProfitImpactRmbAmount);
    if (row.financeType === 'PAYABLE' && row.attributionStatus !== 'ASSIGNED') {
      result.unmatchedPayableRmbAmount = roundMoney(result.unmatchedPayableRmbAmount + row.payableRmbAmount);
    }
    return result;
  }, {
    receivableRmbAmount: 0,
    businessCostRmbAmount: 0,
    payableRmbAmount: 0,
    unmatchedPayableRmbAmount: 0,
    marketProfitRmbAmount: 0,
    warehouseProfitRmbAmount: 0,
    companyProfitRmbAmount: 0
  });
  const miscFeeCosts = new Map<string, {
    owner?: FinanceProfitCostOwner;
    hasBusiness: boolean;
    hasPayable: boolean;
    business: number;
    payable: number;
    assigned: boolean;
  }>();
  rows.forEach((row) => {
    if (!row.miscFeeRecordId || !['MARKET', 'WAREHOUSE'].includes(row.costOwner)) return;
    const current = miscFeeCosts.get(row.miscFeeRecordId) ?? {
      owner: row.costOwner,
      hasBusiness: false,
      hasPayable: false,
      business: 0,
      payable: 0,
      assigned: false
    };
    current.owner = row.costOwner;
    if (row.financeType === 'BUSINESS_COST') {
      current.hasBusiness = true;
      current.business = roundMoney(current.business + row.businessCostRmbAmount);
    }
    if (row.financeType === 'PAYABLE') {
      current.hasPayable = true;
      current.payable = roundMoney(current.payable + row.payableRmbAmount);
      current.assigned = row.attributionStatus === 'ASSIGNED';
    }
    miscFeeCosts.set(row.miscFeeRecordId, current);
  });
  miscFeeCosts.forEach((cost) => {
    if (!cost.hasBusiness || !cost.hasPayable || !cost.assigned) return;
    const profit = roundMoney(cost.business - cost.payable);
    if (cost.owner === 'MARKET') totals.marketProfitRmbAmount = roundMoney(totals.marketProfitRmbAmount + profit);
    if (cost.owner === 'WAREHOUSE') totals.warehouseProfitRmbAmount = roundMoney(totals.warehouseProfitRmbAmount + profit);
  });
  return totals;
}

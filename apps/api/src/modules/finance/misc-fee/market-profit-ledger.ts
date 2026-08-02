import type { MarketProfitLedgerRow } from '@siyuan/shared';

export type MarketProfitLedgerCandidate = {
  id: string;
  shipmentId: string;
  type: 'BUSINESS_COST' | 'PAYABLE';
  feeName: string;
  agentName?: string;
  customerCode: string;
  systemOrderNo: string;
  transferNo?: string;
  salesperson?: string;
  rmbAmount: number;
  reconciliationStatus: string;
  createdAt?: string;
  createdBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function buildMarketProfitLedgerRows(
  candidates: MarketProfitLedgerCandidate[],
  actorLabels: Record<string, string> = {}
): MarketProfitLedgerRow[] {
  const groups = new Map<string, MarketProfitLedgerCandidate[]>();
  candidates.forEach((candidate) => {
    const normalizedFeeName = candidate.feeName.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
    const key = `${candidate.shipmentId}::${normalizedFeeName}`;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  });
  const latestBy = (rows: MarketProfitLedgerCandidate[], field: 'createdAt' | 'reviewedAt') => [...rows]
    .filter((row) => Boolean(row[field]))
    .sort((left, right) => String(right[field]).localeCompare(String(left[field])))[0];
  return Array.from(groups.entries()).map(([key, rows]) => {
    const businessRows = rows.filter((row) => row.type === 'BUSINESS_COST');
    const payableRows = rows.filter((row) => row.type === 'PAYABLE');
    const auditRows = payableRows.length ? payableRows : businessRows;
    const created = latestBy(rows, 'createdAt');
    const reviewed = latestBy(auditRows, 'reviewedAt');
    const base = rows[0];
    const businessCostRmbAmount = roundMoney(businessRows.reduce((sum, row) => sum + row.rmbAmount, 0));
    const agentCostRmbAmount = roundMoney(payableRows.reduce((sum, row) => sum + row.rmbAmount, 0));
    const approved = auditRows.length > 0 && auditRows.every((row) => ['CONFIRMED', 'LOCKED'].includes(row.reconciliationStatus));
    return {
      id: `market-profit:${key}`,
      shipmentId: base.shipmentId,
      agentName: payableRows.find((row) => row.agentName)?.agentName ?? rows.find((row) => row.agentName)?.agentName,
      feeName: base.feeName.trim(),
      customerCode: base.customerCode,
      systemOrderNo: base.systemOrderNo,
      transferNo: base.transferNo,
      reconciliationStatus: approved ? 'CONFIRMED' : 'PENDING',
      currency: 'RMB',
      businessCostRmbAmount,
      agentCostRmbAmount,
      businessProfitRmbAmount: roundMoney(businessCostRmbAmount - agentCostRmbAmount),
      salesperson: base.salesperson ? actorLabels[base.salesperson] ?? base.salesperson : undefined,
      createdAt: created?.createdAt,
      createdBy: created?.createdBy ? actorLabels[created.createdBy] ?? created.createdBy : undefined,
      reviewedAt: reviewed?.reviewedAt,
      reviewedBy: reviewed?.reviewedBy ? actorLabels[reviewed.reviewedBy] ?? reviewed.reviewedBy : undefined
    } satisfies MarketProfitLedgerRow;
  }).sort((left, right) => left.systemOrderNo.localeCompare(right.systemOrderNo, 'zh-CN')
    || left.feeName.localeCompare(right.feeName, 'zh-CN'));
}

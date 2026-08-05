import type {
  LegacyPricingModule,
  PriceBookImportJobSummary,
  PriceBookSummary
} from '@siyuan/shared';
import {
  normalizeAgentMarkupLegacyModule,
  type ActivePriceBookAgentSource
} from '../agent-markup-query.shared.js';

export function mapPriceBook(
  row: any,
  legacyModuleCounts?: Partial<Record<LegacyPricingModule, number>>,
  importedRowCount = 0,
  operational?: { source?: ActivePriceBookAgentSource; failedRowCount?: number }
): PriceBookSummary {
  const priceRowCount = Array.isArray(row.rows) ? row.rows.length : Number(row._count?.rows ?? row.rowCount ?? 0);
  const legacyRowCount = legacyModuleCounts
    ? Object.values(legacyModuleCounts).reduce((sum, value) => sum + Number(value ?? 0), 0)
    : 0;
  return {
    id: row.id,
    fileName: row.fileName,
    targetModule: normalizeAgentMarkupLegacyModule(row.targetModule),
    agentId: row.agentId ?? undefined,
    agentShortName: row.agentShortName ?? undefined,
    rowCount: Math.max(priceRowCount, Number(importedRowCount ?? 0), legacyRowCount),
    importRowCount: Math.max(Number(importedRowCount ?? 0), priceRowCount, legacyRowCount),
    activeRouteCount: Number(operational?.source?.routeCount ?? 0),
    activeQuoteRowCount: Number(operational?.source?.quoteRowCount ?? 0),
    activeKgQuoteRowCount: Number(operational?.source?.kgQuoteRowCount ?? 0),
    activeCbmQuoteRowCount: Number(operational?.source?.cbmQuoteRowCount ?? 0),
    failedRowCount: Number(operational?.failedRowCount ?? 0),
    importedAt: row.importedAt.toISOString(),
    customRemark: row.remark ?? undefined,
    remark: row.remark ?? undefined,
    ...(row.targetModule ? { targetModule: row.targetModule } : {}),
    ...(row.parserRuleVersion !== undefined && row.parserRuleVersion !== null ? { parserRuleVersion: Number(row.parserRuleVersion) } : {}),
    ...(row.refreshStatus ? { refreshStatus: row.refreshStatus } : {}),
    ...(row.lastRuleRefreshAt ? { lastRuleRefreshAt: row.lastRuleRefreshAt.toISOString?.() ?? new Date(row.lastRuleRefreshAt).toISOString() } : {}),
    ...(legacyModuleCounts && Object.keys(legacyModuleCounts).length ? { legacyModuleCounts } : {})
  };
}

export function mapPriceBookImportJob(row: any, book?: PriceBookSummary): PriceBookImportJobSummary {
  const rawErrorSummary = Array.isArray(row.errorSummary) ? row.errorSummary : [];
  return {
    id: row.id,
    fileName: row.fileName,
    targetModule: normalizeAgentMarkupLegacyModule(row.targetModule),
    agentId: row.agentId ?? undefined,
    agentShortName: row.agentShortName ?? undefined,
    status: row.status as PriceBookImportJobSummary['status'],
    processedRows: Number(row.processedRows ?? 0),
    totalRows: Number(row.totalRows ?? 0),
    failedRows: Number(row.failedRows ?? 0),
    message: row.message ?? undefined,
    errorSummary: rawErrorSummary
      .map((item: any) => ({ index: Number(item?.index ?? 0), reason: String(item?.reason ?? '') }))
      .filter((item: { index: number; reason: string }) => item.index > 0 && item.reason),
    book,
    createdAt: row.createdAt?.toISOString?.() ?? new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt?.toISOString?.() ?? new Date(row.updatedAt).toISOString(),
    completedAt: row.completedAt ? row.completedAt?.toISOString?.() ?? new Date(row.completedAt).toISOString() : undefined
  };
}

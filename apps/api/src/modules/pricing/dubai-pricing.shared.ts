import {
  sanitizePricingTransitLabel,
  type AgentMarkupSummary,
  type DubaiPriceTableResponse,
  type DubaiPriceTableRow,
  type PriceBookRowSummary
} from '@siyuan/shared';

export type ResolveDubaiPriceMarkup = (row: PriceBookRowSummary, markupRules: AgentMarkupSummary[], mode: DubaiPriceTableRow['mode']) => number;

export function buildDubaiPriceTableResponse(
  rows: PriceBookRowSummary[],
  markupRules: AgentMarkupSummary[],
  resolveMarkup: ResolveDubaiPriceMarkup
): DubaiPriceTableResponse {
  const tableRows = rows
    .filter((row) => Number(row.costPerKg ?? row.cbmPrice ?? 0) > 0)
    .map((row): DubaiPriceTableRow => {
      const mode = inferDubaiPriceMode(row);
      const baseUnitPrice = mode === 'SEA' ? Number(row.cbmPrice ?? row.costPerKg) : Number(row.costPerKg);
      const markup = Number(resolveMarkup(row, markupRules, mode));
      const channelRequirement = uniqueDubaiText([row.productSurchargeRemark, row.specialRemark]);
      return {
        id: row.id,
        mode,
        productCategory: mode === 'AIR' ? row.productCategory ?? row.realChannelName ?? row.channelName : undefined,
        region: mode === 'AIR' ? row.region ?? row.destinationCountry : undefined,
        serviceContent: mode === 'SEA' ? row.serviceContent ?? row.realChannelName ?? row.channelName : undefined,
        priceTierLabel: formatDubaiPriceTier(row, mode),
        businessUnitPrice: roundDubaiMoney(baseUnitPrice + markup),
        unit: mode === 'SEA' ? 'RMB/CBM' : 'RMB/KG',
        inboundRequirement: row.inboundRequirement,
        channelCode: row.channelCode,
        transitLabel: sanitizePricingTransitLabel(row.transitLabel),
        channelRequirement
      };
    })
    .sort((left, right) =>
      left.mode.localeCompare(right.mode)
      || (left.productCategory ?? left.serviceContent ?? '').localeCompare(right.productCategory ?? right.serviceContent ?? '', 'zh-CN')
      || (left.region ?? '').localeCompare(right.region ?? '', 'zh-CN')
      || left.priceTierLabel.localeCompare(right.priceTierLabel, 'zh-CN')
    );
  return {
    air: tableRows.filter((row) => row.mode === 'AIR'),
    sea: tableRows.filter((row) => row.mode === 'SEA'),
    generatedAt: new Date().toISOString()
  };
}

export function inferDubaiPriceMode(row: PriceBookRowSummary): DubaiPriceTableRow['mode'] {
  if (Number(row.cbmPrice ?? 0) > 0 || /CBM|方/.test(row.priceTierLabel ?? '')) return 'SEA';
  const text = [
    row.channelCode,
    row.sourceSheetName,
    row.channelName,
    row.realChannelName,
    row.businessRouteName,
    row.serviceContent,
    row.productCategory
  ].filter(Boolean).join(' ');
  if (/AH\s*海运|海运|海派|SEA/i.test(text)) return 'SEA';
  return 'AIR';
}

export function formatDubaiPriceTier(row: PriceBookRowSummary, mode: DubaiPriceTableRow['mode']) {
  if (mode === 'SEA') {
    return row.priceTierLabel && !/KG/i.test(row.priceTierLabel) ? row.priceTierLabel : '按方';
  }
  if (row.priceTierLabel) return row.priceTierLabel;
  if (row.maxWeightKg >= 99999) return `${row.minWeightKg}KG+`;
  return `${row.minWeightKg}-${row.maxWeightKg}KG`;
}

export function uniqueDubaiText(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const parts = values
    .flatMap((value) => String(value ?? '').split('\n'))
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  return parts.length ? parts.join('\n') : undefined;
}

function roundDubaiMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

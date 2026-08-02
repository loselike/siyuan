import type { AgentMarkupListQuery, AgentMarkupSummary, AgentMarkupUnit, LegacyPricingModule, PriceBookRowSummary, PriceBookRowsQuery } from '@siyuan/shared';

export interface ActivePriceBookAgentSource {
  agentName: string;
  priceBookId: string;
  fileName: string;
  lineCount: number;
  routeCount?: number;
  quoteRowCount?: number;
  kgQuoteRowCount?: number;
  cbmQuoteRowCount?: number;
  legacyModule?: LegacyPricingModule;
}

export function normalizeAgentSources(agentSources: Array<string | ActivePriceBookAgentSource>): ActivePriceBookAgentSource[] {
  return agentSources
    .map((source) => typeof source === 'string'
      ? { agentName: source, priceBookId: '', fileName: '', lineCount: 0 }
      : source)
    .filter((source) => source.agentName?.trim())
    .map((source) => ({ ...source, agentName: source.agentName.trim(), priceBookId: source.priceBookId?.trim() ?? '', fileName: source.fileName?.trim() ?? '', legacyModule: normalizeAgentMarkupLegacyModule(source.legacyModule) }));
}

export function groupAgentSourcesByScope(sources: ActivePriceBookAgentSource[]) {
  const grouped = new Map<string, ActivePriceBookAgentSource[]>();
  for (const source of sources) {
    const key = agentMarkupScopeKey(source);
    const list = grouped.get(key) ?? [];
    const existing = list.find((item) => item.priceBookId === source.priceBookId && item.fileName === source.fileName);
    if (existing) {
      existing.lineCount += source.lineCount;
      existing.routeCount = Number(existing.routeCount ?? 0) + Number(source.routeCount ?? 0);
      existing.quoteRowCount = Number(existing.quoteRowCount ?? 0) + Number(source.quoteRowCount ?? source.lineCount);
      existing.kgQuoteRowCount = Number(existing.kgQuoteRowCount ?? 0) + Number(source.kgQuoteRowCount ?? source.lineCount);
      existing.cbmQuoteRowCount = Number(existing.cbmQuoteRowCount ?? 0) + Number(source.cbmQuoteRowCount ?? 0);
    } else {
      list.push({ ...source });
    }
    grouped.set(key, list);
  }
  for (const list of grouped.values()) {
    list.sort((left, right) => left.fileName.localeCompare(right.fileName, 'zh-CN') || left.priceBookId.localeCompare(right.priceBookId));
  }
  return grouped;
}

export function agentMarkupScopeKey(scope: Pick<AgentMarkupSummary, 'agentName' | 'priceBookId' | 'legacyModule'> | ActivePriceBookAgentSource | { agentName: string; priceBookId?: string; legacyModule?: LegacyPricingModule }) {
  return `${scope.legacyModule ?? ''}\u0001${scope.priceBookId ?? ''}\u0001${scope.agentName}`;
}

export function isLegacyPricingModule(value: unknown): value is LegacyPricingModule {
  return value === 'amazon'
    || value === 'inquiry'
    || value === 'europeExpress'
    || value === 'southAfrica'
    || value === 'usaAirSea'
    || value === 'canadaAirSea'
    || value === 'dubaiAirSea';
}

export function normalizeAgentMarkupLegacyModule(value: unknown): LegacyPricingModule | undefined {
  return isLegacyPricingModule(value)
    ? value
    : undefined;
}

export function normalizeAgentMarkupModuleQuery(value: unknown): LegacyPricingModule | 'unclassified' | undefined {
  if (value === 'unclassified') return 'unclassified';
  return normalizeAgentMarkupLegacyModule(value);
}

export function filterAgentMarkupRulesByModule(rules: AgentMarkupSummary[], module: LegacyPricingModule | 'unclassified' | undefined, priceRows: PriceBookRowSummary[]) {
  if (!module) {
    return rules;
  }
  const priceBookIds = new Set(priceRows.map((row) => row.priceBookId).filter(Boolean));
  return rules.filter((rule) => {
    const explicitModule = normalizeAgentMarkupLegacyModule(rule.legacyModule);
    if (module === 'unclassified') {
      return !explicitModule && !rule.priceBookId;
    }
    if (explicitModule) {
      return explicitModule === module;
    }
    return Boolean(rule.priceBookId && priceBookIds.has(rule.priceBookId));
  });
}

export function shouldIncludeAgentMarkupHits(query: AgentMarkupListQuery) {
  return query.includeHits !== false && String(query.includeHits ?? 'true') !== 'false';
}

export function formatMarkupNumber(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function formatMarkupPerKg(value: number) {
  return `+¥${formatMarkupNumber(value)}/kg`;
}

export function hasPriceBookRowMarkupControls(query: PriceBookRowsQuery) {
  const amount = String(query.markupAmount ?? 'ALL').trim();
  const source = String(query.markupSource ?? 'ALL').trim();
  const sort = String(query.markupSort ?? 'NONE').trim();
  return (amount && amount !== 'ALL') || (source && source !== 'ALL') || sort === 'ASC' || sort === 'DESC';
}

export function applyPriceBookRowMarkupControls(rows: PriceBookRowSummary[], query: PriceBookRowsQuery) {
  const amount = String(query.markupAmount ?? 'ALL').trim();
  const source = String(query.markupSource ?? 'ALL').trim();
  const sort = String(query.markupSort ?? 'NONE').trim();
  let next = rows.filter((row) => {
    const rowMarkup = roundMoney(Number(row.lineMarkupPerKg ?? 0.5));
    if (source !== 'ALL' && row.markupSource !== source) {
      return false;
    }
    if (!amount || amount === 'ALL') {
      return true;
    }
    if (amount === 'DEFAULT') {
      return row.markupSource === 'AGENT_DEFAULT' || row.markupSource === 'VIRTUAL_DEFAULT';
    }
    if (amount === 'OTHER_CUSTOM') {
      return row.markupSource === 'LINE_CUSTOM';
    }
    const expected = Number(amount);
    return Number.isFinite(expected) && rowMarkup === roundMoney(expected);
  });
  if (sort === 'ASC' || sort === 'DESC') {
    const factor = sort === 'ASC' ? 1 : -1;
    next = [...next].sort((left, right) =>
      factor * (roundMoney(Number(left.lineMarkupPerKg ?? 0.5)) - roundMoney(Number(right.lineMarkupPerKg ?? 0.5))) ||
      left.channelName.localeCompare(right.channelName, 'zh-CN') ||
      left.destinationCountry.localeCompare(right.destinationCountry, 'zh-CN') ||
      left.minWeightKg - right.minWeightKg
    );
  }
  return next;
}

export function markupScopeRank(rule: AgentMarkupSummary) {
  return [rule.channelName, rule.realChannelName, rule.destinationCountry].filter(Boolean).length;
}

export function matchingPriceRowsForRule(rule: AgentMarkupSummary, priceRows: PriceBookRowSummary[]) {
  return priceRows.filter((row) =>
    (rule.priceBookId ? row.priceBookId === rule.priceBookId : row.agentName === rule.agentName) &&
    (!rule.channelName || row.channelName === rule.channelName) &&
    (!rule.realChannelName || (row.realChannelName ?? row.channelName) === rule.realChannelName) &&
    (!rule.destinationCountry || row.destinationCountry === rule.destinationCountry)
  );
}

export function countAgentMarkupHits(rule: AgentMarkupSummary, priceRows: PriceBookRowSummary[]) {
  return matchingPriceRowsForRule(rule, priceRows).length;
}

export function applyAgentMarkup(costPerKg: number, chargeableWeightKg: number, rule: AgentMarkupSummary) {
  const type = rule.markupType ?? 'WEIGHT';
  const value = Number(rule.markupValue ?? rule.markupPerKg ?? 0);
  const totalCost = roundMoney(costPerKg * chargeableWeightKg);
  if (type === 'PERCENT') {
    const totalSales = roundMoney(totalCost * (1 + value / 100));
    return { totalSales, salesRatePerKg: roundMoney(totalSales / chargeableWeightKg) };
  }
  if (type === 'PER_SHIPMENT' || type === 'FIXED') {
    const totalSales = roundMoney(totalCost + value);
    return { totalSales, salesRatePerKg: roundMoney(totalSales / chargeableWeightKg) };
  }
  const salesRatePerKg = roundMoney(costPerKg + value);
  return { totalSales: roundMoney(salesRatePerKg * chargeableWeightKg), salesRatePerKg };
}

export function markupUnitForRow(row: PriceBookRowSummary): AgentMarkupUnit {
  return Number(row.cbmPrice ?? 0) > 0 ? 'CBM' : 'KG';
}

export function buildMarkupRuleIndex(markupRules: AgentMarkupSummary[]): Map<string, AgentMarkupSummary[]> {
  const index = new Map<string, AgentMarkupSummary[]>();
  for (const rule of markupRules) {
    if (!rule.enabled || rule.deletedAt) continue;
    const key = markupRuleIndexKey(rule.agentName, rule.priceBookId);
    const rows = index.get(key) ?? [];
    rows.push(rule);
    index.set(key, rows);
  }
  return index;
}

export function markupRuleIndexKey(agentName: string, priceBookId?: string) {
  return `${priceBookId ?? ''}\u0001${agentName}`;
}

export function markupSpecificity(rule: AgentMarkupSummary, channel: string, realChannel: string, destination: string): number {
  let score = 0;
  if (rule.channelName && rule.channelName === channel) {
    score += 2;
  }
  if (rule.realChannelName && rule.realChannelName === realChannel) {
    score += 4;
  }
  if (rule.destinationCountry && rule.destinationCountry === destination) {
    score += 1;
  }
  return score;
}

export function enrichPriceBookRowMarkup(row: PriceBookRowSummary, markupRules: AgentMarkupSummary[], ownerAgentName: string): PriceBookRowSummary {
  return { ...row, ...resolvePriceBookRowMarkup(row, markupRules, ownerAgentName) };
}

export function resolvePriceBookRowMarkup(row: PriceBookRowSummary, markupRules: AgentMarkupSummary[], ownerAgentName: string): Pick<PriceBookRowSummary, 'lineMarkupPerKg' | 'markupSource'> {
  const rule = findBestPriceBookRouteMarkupRule(markupRules, row)
    ?? findBestMarkupRule(markupRules, row, ownerAgentName)
    ?? (row.agentName !== ownerAgentName ? findBestMarkupRule(markupRules, row, row.agentName) : undefined)
  const lineMarkupPerKg = rule?.markupValue ?? rule?.markupPerKg ?? 0.5;
  if (!rule || rule.id.startsWith('price-agent:')) {
    return { lineMarkupPerKg, markupSource: 'VIRTUAL_DEFAULT' };
  }
  if (rule.channelName || rule.realChannelName || rule.destinationCountry) {
    return { lineMarkupPerKg, markupSource: 'LINE_CUSTOM' };
  }
  return { lineMarkupPerKg, markupSource: 'AGENT_DEFAULT' };
}

export function findBestPriceBookRouteMarkupRule(markupRules: AgentMarkupSummary[], row: PriceBookRowSummary): AgentMarkupSummary | undefined {
  const destination = row.destinationCountry.trim();
  const channel = row.channelName.trim();
  const realChannel = row.realChannelName?.trim() || channel;
  return [...markupRules]
    .filter((rule) => rule.enabled && !rule.deletedAt && rule.priceBookId === row.priceBookId && Boolean(rule.channelName || rule.realChannelName || rule.destinationCountry))
    .filter((rule) => {
      const channelMatches = !rule.channelName || rule.channelName === channel;
      const realChannelMatches = !rule.realChannelName || rule.realChannelName === realChannel;
      const countryMatches = !rule.destinationCountry || rule.destinationCountry === destination;
      return channelMatches && realChannelMatches && countryMatches;
    })
    .sort((left, right) =>
      (left.priority ?? 100) - (right.priority ?? 100)
      || markupSpecificity(right, channel, realChannel, destination) - markupSpecificity(left, channel, realChannel, destination)
      || safeTime(right.updatedAt) - safeTime(left.updatedAt)
    )[0];
}

export function findBestMarkupRule(markupRules: AgentMarkupSummary[], price: PriceBookRowSummary, ownerAgentName = price.agentName, chargeable?: { unit: 'KG' | 'CBM'; value: number }): AgentMarkupSummary | undefined {
  const destination = price.destinationCountry.trim();
  const channel = price.channelName.trim();
  const realChannel = price.realChannelName?.trim() || price.channelName.trim();
  const candidates = [...markupRules]
    .filter((rule) => rule.enabled && !rule.deletedAt && rule.agentName === ownerAgentName && (!rule.priceBookId || rule.priceBookId === price.priceBookId))
    .filter((rule) => {
      const channelMatches = !rule.channelName || rule.channelName === channel;
      const realChannelMatches = !rule.realChannelName || rule.realChannelName === realChannel;
      const countryMatches = !rule.destinationCountry || rule.destinationCountry === destination;
      return channelMatches && realChannelMatches && countryMatches;
    });
  const matchedTiers = chargeable
    ? candidates.filter((rule) => rule.markupUnit === chargeable.unit && rule.minChargeableValue !== undefined && chargeable.value >= rule.minChargeableValue && (rule.maxChargeableValue === undefined || chargeable.value < rule.maxChargeableValue))
    : [];
  const eligible = matchedTiers.length ? matchedTiers : candidates.filter((rule) => !rule.markupUnit);
  return eligible
    .sort((left, right) =>
      (Boolean(right.priceBookId) ? 1 : 0) - (Boolean(left.priceBookId) ? 1 : 0)
      || (left.priority ?? 100) - (right.priority ?? 100)
      || markupSpecificity(right, channel, realChannel, destination) - markupSpecificity(left, channel, realChannel, destination)
      || safeTime(right.updatedAt) - safeTime(left.updatedAt)
    )[0];
}

export function safeTime(value?: string) {
  const time = Date.parse(value ?? '');
  return Number.isFinite(time) ? time : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

import { describe, expect, it } from 'vitest';
import type { AgentMarkupSummary, PriceBookRowSummary } from '@siyuan/shared';
import { agentMarkupScopeKey, applyAgentMarkup, applyPriceBookRowMarkupControls, buildMarkupRuleIndex, countAgentMarkupHits, filterAgentMarkupRulesByModule, formatMarkupNumber, formatMarkupPerKg, groupAgentSourcesByScope, hasPriceBookRowMarkupControls, isLegacyPricingModule, markupRuleIndexKey, markupScopeRank, markupSpecificity, markupUnitForRow, matchingPriceRowsForRule, normalizeAgentMarkupLegacyModule, normalizeAgentMarkupModuleQuery, normalizeAgentSources, shouldIncludeAgentMarkupHits } from './agent-markup-query.shared.js';

function priceRow(id: string, overrides: Partial<PriceBookRowSummary> = {}): PriceBookRowSummary {
  return {
    id,
    priceBookId: 'book-a',
    agentName: '代理甲',
    sourceSheetName: 'Sheet1',
    channelName: '渠道甲',
    destinationCountry: '美国',
    minWeightKg: 10,
    maxWeightKg: 20,
    costPerKg: 8,
    currency: 'RMB',
    ...overrides
  };
}

function markupRule(overrides: Partial<AgentMarkupSummary> = {}): AgentMarkupSummary {
  return {
    id: 'rule-a',
    agentName: '代理甲',
    markupPerKg: 0.5,
    enabled: true,
    priority: 100,
    ...overrides
  };
}

describe('agent markup query helpers', () => {
  it('keeps amount/source filtering, money rounding and deterministic row sorting', () => {
    const rows = [
      priceRow('custom-b', { channelName: '渠道乙', lineMarkupPerKg: 0.3, markupSource: 'LINE_CUSTOM' }),
      priceRow('default', { lineMarkupPerKg: 0.5, markupSource: 'AGENT_DEFAULT' }),
      priceRow('custom-a', { channelName: '渠道甲', minWeightKg: 5, lineMarkupPerKg: 0.1 + 0.2, markupSource: 'LINE_CUSTOM' })
    ];

    expect(applyPriceBookRowMarkupControls(rows, { markupAmount: 'DEFAULT' }).map((row) => row.id)).toEqual(['default']);
    expect(applyPriceBookRowMarkupControls(rows, { markupAmount: 'OTHER_CUSTOM', markupSort: 'ASC' }).map((row) => row.id)).toEqual(['custom-a', 'custom-b']);
    expect(applyPriceBookRowMarkupControls(rows, { markupAmount: '0.30', markupSource: 'LINE_CUSTOM' }).map((row) => row.id)).toEqual(['custom-b', 'custom-a']);
    expect(hasPriceBookRowMarkupControls({})).toBe(false);
    expect(hasPriceBookRowMarkupControls({ markupSort: 'DESC' })).toBe(true);
  });

  it('keeps price-book and agent rule matching boundaries', () => {
    const rows = [
      priceRow('exact', { realChannelName: '线路甲' }),
      priceRow('other-book', { priceBookId: 'book-b', realChannelName: '线路甲' }),
      priceRow('other-agent', { agentName: '代理乙', realChannelName: '线路甲' }),
      priceRow('channel-fallback', { realChannelName: undefined })
    ];
    const bookRule = markupRule({ priceBookId: 'book-a', channelName: '渠道甲', realChannelName: '线路甲', destinationCountry: '美国' });
    const agentRule = markupRule({ priceBookId: undefined, channelName: '渠道甲', realChannelName: undefined });

    expect(matchingPriceRowsForRule(bookRule, rows).map((row) => row.id)).toEqual(['exact', 'other-agent']);
    expect(matchingPriceRowsForRule(agentRule, rows).map((row) => row.id)).toEqual(['exact', 'other-book', 'channel-fallback']);
    expect(countAgentMarkupHits(agentRule, rows)).toBe(3);
  });

  it('keeps hit switches, scope rank and markup display formatting', () => {
    expect(shouldIncludeAgentMarkupHits({})).toBe(true);
    expect(shouldIncludeAgentMarkupHits({ includeHits: false })).toBe(false);
    expect(shouldIncludeAgentMarkupHits({ includeHits: 'false' as never })).toBe(false);
    expect(markupScopeRank(markupRule({ channelName: '渠道甲', realChannelName: '线路甲', destinationCountry: '美国' }))).toBe(3);
    expect(formatMarkupNumber(0.005)).toBe('0.01');
    expect(formatMarkupPerKg(0.5)).toBe('+¥0.50/kg');
  });

  it('keeps markup totals, units, active-rule indexing and route specificity', () => {
    expect(applyAgentMarkup(10, 3, markupRule({ markupType: 'WEIGHT', markupValue: 0.5 }))).toEqual({ totalSales: 31.5, salesRatePerKg: 10.5 });
    expect(applyAgentMarkup(10, 3, markupRule({ markupType: 'PERCENT', markupValue: 10 }))).toEqual({ totalSales: 33, salesRatePerKg: 11 });
    expect(applyAgentMarkup(10, 3, markupRule({ markupType: 'PER_SHIPMENT', markupValue: 5 }))).toEqual({ totalSales: 35, salesRatePerKg: 11.67 });
    expect(markupUnitForRow(priceRow('kg'))).toBe('KG');
    expect(markupUnitForRow(priceRow('cbm', { cbmPrice: 120 }))).toBe('CBM');

    const active = markupRule({ id: 'active', priceBookId: 'book-a' });
    const index = buildMarkupRuleIndex([
      active,
      markupRule({ id: 'disabled', enabled: false }),
      markupRule({ id: 'deleted', deletedAt: '2026-07-26T00:00:00.000Z' })
    ]);
    expect(index.get(markupRuleIndexKey('代理甲', 'book-a'))).toEqual([active]);
    expect([...index.values()].flat()).toHaveLength(1);
    expect(markupSpecificity(markupRule({ channelName: '渠道甲', realChannelName: '线路甲', destinationCountry: '美国' }), '渠道甲', '线路甲', '美国')).toBe(7);
  });

  it('keeps legacy module recognition and explicit, scoped-book and unclassified rule isolation', () => {
    expect(['amazon', 'inquiry', 'europeExpress', 'southAfrica', 'usaAirSea', 'canadaAirSea', 'dubaiAirSea'].every(isLegacyPricingModule)).toBe(true);
    expect(isLegacyPricingModule('unclassified')).toBe(false);
    expect(normalizeAgentMarkupLegacyModule('amazon')).toBe('amazon');
    expect(normalizeAgentMarkupLegacyModule('invalid')).toBeUndefined();
    expect(normalizeAgentMarkupModuleQuery('unclassified')).toBe('unclassified');

    const explicitAmazon = markupRule({ id: 'amazon', legacyModule: 'amazon', priceBookId: undefined });
    const explicitInquiry = markupRule({ id: 'inquiry', legacyModule: 'inquiry', priceBookId: undefined });
    const scopedBook = markupRule({ id: 'book', legacyModule: undefined, priceBookId: 'book-a' });
    const unclassified = markupRule({ id: 'unclassified', legacyModule: undefined, priceBookId: undefined });
    const rules = [explicitAmazon, explicitInquiry, scopedBook, unclassified];

    expect(filterAgentMarkupRulesByModule(rules, 'amazon', [priceRow('amazon-row')]).map((rule) => rule.id)).toEqual(['amazon', 'book']);
    expect(filterAgentMarkupRulesByModule(rules, 'inquiry', [priceRow('other-row', { priceBookId: 'book-b' })]).map((rule) => rule.id)).toEqual(['inquiry']);
    expect(filterAgentMarkupRulesByModule(rules, 'unclassified', []).map((rule) => rule.id)).toEqual(['unclassified']);
    expect(filterAgentMarkupRulesByModule(rules, undefined, [])).toBe(rules);
  });

  it('keeps source cleanup, scoped duplicate merging and stable source sorting', () => {
    const sources = normalizeAgentSources([
      ' 代理甲 ',
      { agentName: ' 代理甲 ', priceBookId: ' book-b ', fileName: '乙表.xlsx', lineCount: 2, legacyModule: 'amazon' },
      { agentName: '代理甲', priceBookId: 'book-b', fileName: '乙表.xlsx', lineCount: 3, legacyModule: 'amazon' },
      { agentName: '代理甲', priceBookId: 'book-b', fileName: '甲表.xlsx', lineCount: 1, legacyModule: 'amazon' },
      { agentName: '代理甲', priceBookId: 'book-c', fileName: '丙表.xlsx', lineCount: 4, legacyModule: 'invalid' as never },
      { agentName: '   ', priceBookId: 'ignored', fileName: '忽略.xlsx', lineCount: 9 }
    ]);
    const grouped = groupAgentSourcesByScope(sources);
    const merged = grouped.get(agentMarkupScopeKey({ agentName: '代理甲', priceBookId: 'book-b', legacyModule: 'amazon' }));

    expect(sources[0]).toEqual({ agentName: '代理甲', priceBookId: '', fileName: '', lineCount: 0, legacyModule: undefined });
    expect(sources.find((source) => source.priceBookId === 'book-c')?.legacyModule).toBeUndefined();
    expect(merged).toEqual([
      { agentName: '代理甲', priceBookId: 'book-b', fileName: '甲表.xlsx', lineCount: 1, legacyModule: 'amazon' },
      { agentName: '代理甲', priceBookId: 'book-b', fileName: '乙表.xlsx', lineCount: 5, legacyModule: 'amazon' }
    ]);
  });
});

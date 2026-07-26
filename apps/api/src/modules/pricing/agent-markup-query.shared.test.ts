import { describe, expect, it } from 'vitest';
import type { AgentMarkupSummary, PriceBookRowSummary } from '@siyuan/shared';
import { applyPriceBookRowMarkupControls, countAgentMarkupHits, formatMarkupNumber, formatMarkupPerKg, hasPriceBookRowMarkupControls, markupScopeRank, matchingPriceRowsForRule, shouldIncludeAgentMarkupHits } from './agent-markup-query.shared.js';

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
});

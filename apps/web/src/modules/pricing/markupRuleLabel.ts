import type { PricingCalculationBreakdown } from '@siyuan/shared';

function formatMarkupTierRange(rangeLabel?: string) {
  const value = rangeLabel?.trim();
  if (!value) return undefined;
  const bounded = value.match(/^(\d+(?:\.\d+)?)(KG|CBM)?\s*-\s*(\d+(?:\.\d+)?)(KG|CBM)$/i);
  if (!bounded) return value;
  const unit = (bounded[4] || bounded[2] || '').toUpperCase();
  return `${bounded[1]}–${bounded[3]}${unit}`;
}

export function getMarkupRuleLabel(markup?: PricingCalculationBreakdown['markup']) {
  if (!markup) return '-';
  if (markup.source !== 'LINE_TIER') return '代理默认规则';
  const range = formatMarkupTierRange(markup.rangeLabel);
  return range ? `阶梯加价（${range}）` : '阶梯加价';
}

import type { PriceBookRowSummary, PriceLookupRecommendation } from '@siyuan/shared';

export function publicPricingRouteCode(...values: Array<string | undefined>): string {
  for (const value of values) {
    const displayName = extractChinesePricingRouteName(value);
    if (displayName) return displayName;
  }
  return '可报价线路';
}

export function matchedTransitDays(item: PriceLookupRecommendation): number {
  return item.price.transitDays ?? Number.POSITIVE_INFINITY;
}

export function inferBackendPriceCarrierName(row: PriceBookRowSummary): string {
  const channel = row.channelName.toUpperCase();
  if (channel.includes('UPS')) return 'UPS';
  if (channel.includes('FEDEX') || channel.includes('FDX')) return 'FEDEX';
  if (channel.includes('DHL') || channel.includes('DHK')) return 'DHL';
  if (channel.includes('海运')) return '海运';
  if (channel.includes('空运')) return '空运';
  return '专线';
}

function extractChinesePricingRouteName(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  const cleaned = text
    .replace(/[A-Za-z0-9_]+/g, '')
    .replace(/[－–—]/g, '-')
    .replace(/[^\u3400-\u9FFF\s\-、，,（）()]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[-\s,，、]+|[-\s,，、]+$/g, '')
    .trim();
  return /[\u3400-\u9FFF]/.test(cleaned) ? cleaned : undefined;
}

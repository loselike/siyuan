import type { PriceBookRowSummary } from '@siyuan/shared';

const amazonOriginWarehouseNames = [
  '义乌仓',
  '华东',
  '华南',
  '厦门/泉州/福州',
  '天津/南昌/石家庄',
  '武汉/长沙/成都',
  '汕头',
  '济南/潍坊',
  '深圳/广州仓',
  '西安/沧州/保定',
  '重庆',
  '青岛/郑州/温州/台州/连云港/南京/合肥'
];

export function normalizeAmazonOriginWarehouseName(value: unknown): string | undefined {
  const text = String(value ?? '')
    .replace(/[／｜|、，,；;]/g, '/')
    .replace(/\s+/g, '')
    .replace(/^(?:出货仓|起运仓|发货仓|发货地|起运地|来源地|仓库区域|揽收区域|报价组)[:：]?/, '')
    .trim();
  if (!text) return undefined;
  const compact = text.replace(/[()（）]/g, '');
  if (/^(?:仓库编码|仓库代码|亚马逊代码|FBA仓库代码|仓库|编码)$/i.test(compact)) {
    return undefined;
  }
  const matched = amazonOriginWarehouseNames.find((name) => compact.includes(name.replace(/[()（）]/g, '')));
  if (matched) return matched;
  if (/深圳/.test(compact) && /广州/.test(compact)) {
    return '深圳/广州仓';
  }
  if (/欧洲|西班牙|英国|铁路|空派|快递|海运|专线|渠道|DHL|UPS|FEDEX|美西|美东|包税|双清|卡派|海卡/i.test(compact)) {
    return undefined;
  }
  if (/(仓|华东|华南|义乌|深圳|广州|汕头|厦门|泉州|福州|天津|南昌|石家庄|武汉|长沙|成都|济南|潍坊|西安|沧州|保定|重庆|青岛|郑州|温州|台州|连云港|南京|合肥)/.test(compact)) {
    return compact.slice(0, 30);
  }
  return undefined;
}

export function uniqueAmazonOriginWarehouseNames(values: Array<unknown>): string[] {
  const unique = new Set(values.map(normalizeAmazonOriginWarehouseName).filter((value): value is string => Boolean(value)));
  return [...unique].sort((left, right) => {
    const leftIndex = amazonOriginWarehouseNames.indexOf(left);
    const rightIndex = amazonOriginWarehouseNames.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
    }
    return left.localeCompare(right, 'zh-CN');
  });
}

export function normalizeAmazonCbmTier(value?: string | number | null): '按方包税' | '按方不包税' | '按方未标注' | undefined {
  const text = String(value ?? '').trim().replace(/\s+/g, '');
  if (!/按方|CBM|方/i.test(text)) return undefined;
  if (/不包税|不含税|未包税/.test(text)) return '按方不包税';
  if (/包税|含税/.test(text)) return '按方包税';
  return '按方未标注';
}

export function amazonWeightBandMinimum(value?: string | number | null): number | undefined {
  const text = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const weight = Number(match[1]);
  return Number.isFinite(weight) ? weight : undefined;
}

export function normalizeAmazonWeightBand(value?: string | number | null): string | undefined {
  const weight = amazonWeightBandMinimum(value);
  if (weight === undefined) return undefined;
  // A source workbook's tier is authoritative. Do not collapse 21KG+, 45KG+
  // or any other valid source tier into the historic 12/51/100 UI buckets.
  return `${weight}KG+`;
}

export function inferAmazonWeightBandFromMin(minWeightKg?: number | null): string | undefined {
  const min = Number(minWeightKg ?? 0);
  if (!Number.isFinite(min)) return undefined;
  return normalizeAmazonWeightBand(min);
}

export function priceRowAmazonWeightBandMatches(row: PriceBookRowSummary, weightBand?: string) {
  const cbmTier = normalizeAmazonCbmTier(weightBand);
  const rowCbmTier = normalizeAmazonCbmTier(row.priceTierLabel);
  if (cbmTier) return Number(row.cbmPrice ?? 0) > 0 && (rowCbmTier ? rowCbmTier === cbmTier : true);
  if (Number(row.cbmPrice ?? 0) > 0) return false;
  return true;
}

export function isOpenEndedKgTier(label?: string) {
  const text = String(label ?? '').trim();
  return !normalizeAmazonCbmTier(text) && /(?:kg|kgs|公斤)?\s*(?:\+|以上)$/i.test(text);
}

export function cbmTierMatches(tierLabel: string | undefined, volumeCbm: number) {
  if (!Number.isFinite(volumeCbm) || volumeCbm <= 0) return false;
  const text = String(tierLabel ?? '').toUpperCase().replace(/\s+/g, '');
  const range = text.match(/(\d+(?:\.\d+)?)\s*[-~－—]\s*(\d+(?:\.\d+)?)\s*CBM?/);
  if (range) {
    return volumeCbm >= Number(range[1]) && volumeCbm <= Number(range[2]);
  }
  const above = text.match(/(\d+(?:\.\d+)?)\s*CBM?\+/) ?? text.match(/(\d+(?:\.\d+)?)\s*CBM?以上/);
  if (above) {
    return volumeCbm > Number(above[1]);
  }
  return true;
}

export function withOpenEndedHighestPriceTiers(rows: PriceBookRowSummary[]) {
  const highestMinimumByRoute = new Map<string, number>();
  for (const row of rows) {
    if (Number(row.cbmPrice ?? 0) > 0 || !isOpenEndedKgTier(row.priceTierLabel)) continue;
    const key = [row.priceBookId, row.agentName, row.sourceSheetName, row.channelName, row.businessRouteName, row.realChannelName, row.warehouseCode, row.destinationCountry].join('\u0001');
    highestMinimumByRoute.set(key, Math.max(highestMinimumByRoute.get(key) ?? Number.NEGATIVE_INFINITY, row.minWeightKg));
  }
  return rows.map((row) => {
    if (Number(row.cbmPrice ?? 0) > 0 || !isOpenEndedKgTier(row.priceTierLabel)) return row;
    const key = [row.priceBookId, row.agentName, row.sourceSheetName, row.channelName, row.businessRouteName, row.realChannelName, row.warehouseCode, row.destinationCountry].join('\u0001');
    return highestMinimumByRoute.get(key) === row.minWeightKg && row.maxWeightKg < 99999
      ? { ...row, maxWeightKg: 99999 }
      : row;
  });
}

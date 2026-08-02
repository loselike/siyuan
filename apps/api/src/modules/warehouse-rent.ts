import type {
  WarehouseRentBillingUnit,
  WarehouseRentDetailResponse,
  WarehouseRentDetailSummary,
  WarehouseRentPeriodUnit,
  WarehouseRentRuleSummary
} from '@siyuan/shared';

const dayMs = 24 * 60 * 60 * 1000;
const fixedMonthDays = 30;

export interface WarehouseRentSourcePackage {
  id: string;
  sourcePackageId?: string;
  site?: string;
  salesperson?: string;
  customerCode: string;
  customerName?: string;
  domesticTrackingNo: string;
  packageCount: number;
  weightKg: number;
  cbm: number;
  scanTime?: string;
  createdAt: string;
  status: string;
  measurementStatus?: string;
  outboundAt?: string;
}

export interface WarehouseRentCalculationFilters {
  site?: string;
  salesperson?: string;
  customerCode?: string;
  domesticTrackingNo?: string;
  inboundFrom?: string;
  inboundTo?: string;
  outboundFrom?: string;
  outboundTo?: string;
  status?: 'IN_STOCK' | 'OUTBOUNDED';
  hasRent?: boolean;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function beijingDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Date.UTC(read('year'), read('month') - 1, read('day'));
}

function dateRangeMatches(value: string | undefined, from?: string, to?: string) {
  if (!from && !to) return true;
  if (!value) return false;
  const day = beijingDayKey(value);
  return (!from || day >= beijingDayKey(from)) && (!to || day <= beijingDayKey(to));
}

function ruleMatchesDay(
  rule: WarehouseRentRuleSummary,
  site: string | undefined,
  density: number,
  dayKey: number
) {
  const normalizedSite = site?.trim() || undefined;
  const ruleSite = rule.site?.trim() || undefined;
  if (ruleSite && ruleSite !== normalizedSite) return false;
  if (density < rule.densityMin) return false;
  if (dayKey < beijingDayKey(rule.effectiveFrom)) return false;
  if (rule.effectiveTo && dayKey > beijingDayKey(rule.effectiveTo)) return false;
  if (!rule.enabled && !rule.effectiveTo) return false;
  return true;
}

function findRule(
  rules: WarehouseRentRuleSummary[],
  site: string | undefined,
  density: number,
  dayKey: number
) {
  return rules
    .filter((rule) => ruleMatchesDay(rule, site, density, dayKey))
    .sort((left, right) => {
      const siteSpecificity = Number(Boolean(right.site)) - Number(Boolean(left.site));
      if (siteSpecificity) return siteSpecificity;
      const densityThreshold = right.densityMin - left.densityMin;
      if (densityThreshold) return densityThreshold;
      const enabledPriority = Number(right.enabled) - Number(left.enabled);
      if (enabledPriority) return enabledPriority;
      return beijingDayKey(right.effectiveFrom) - beijingDayKey(left.effectiveFrom);
    })[0];
}

function billingQuantity(unit: WarehouseRentBillingUnit, totalWeightKg: number, totalCbm: number) {
  return unit === 'KG' ? totalWeightKg : totalCbm;
}

function periodDays(value: number, unit: WarehouseRentPeriodUnit = 'DAY') {
  return value * (unit === 'MONTH' ? fixedMonthDays : 1);
}

function dailyUnitRate(rule: Pick<WarehouseRentRuleSummary, 'unitRate' | 'billingCycleUnit'>) {
  return rule.unitRate / (rule.billingCycleUnit === 'MONTH' ? fixedMonthDays : 1);
}

function actualWeightKg(item: WarehouseRentSourcePackage) {
  return item.sourcePackageId ? item.weightKg : item.weightKg * item.packageCount;
}

function packageIsActiveOnDay(item: WarehouseRentSourcePackage, dayKey: number, nowDay: number) {
  const inboundDay = beijingDayKey(item.scanTime || item.createdAt);
  if (dayKey <= inboundDay) return false;
  if (!item.outboundAt) return dayKey <= nowDay;
  return dayKey <= beijingDayKey(item.outboundAt);
}

export function calculateWarehouseRentDetails(
  packages: WarehouseRentSourcePackage[],
  rules: WarehouseRentRuleSummary[],
  filters: WarehouseRentCalculationFilters = {},
  now: Date = new Date()
): WarehouseRentDetailResponse {
  const rawHasRent = filters.hasRent as boolean | string | undefined;
  const hasRentFilter = rawHasRent === undefined || rawHasRent === ''
    ? undefined
    : rawHasRent === true || rawHasRent === 'true';
  const splitParentIds = new Set(packages.map((item) => item.sourcePackageId).filter((id): id is string => Boolean(id)));
  const groups = new Map<string, WarehouseRentSourcePackage[]>();
  packages
    .filter((pkg) => ['RECEIVED', 'CONSOLIDATED', 'SHIPPED'].includes(pkg.status))
    .filter((pkg) => !splitParentIds.has(pkg.id))
    .forEach((pkg) => {
      const key = [pkg.site ?? '', pkg.customerCode, pkg.domesticTrackingNo].join('|');
      groups.set(key, [...(groups.get(key) ?? []), pkg]);
    });

  const rows = Array.from(groups.entries()).map(([id, items]): WarehouseRentDetailSummary => {
    const inboundAt = items
      .map((item) => item.scanTime || item.createdAt)
      .sort((left, right) => Date.parse(left) - Date.parse(right))[0];
    const isOutbounded = items.every((item) => item.status === 'SHIPPED' && item.outboundAt);
    const outboundAt = isOutbounded
      ? items.map((item) => item.outboundAt!).sort((left, right) => Date.parse(right) - Date.parse(left))[0]
      : undefined;
    const endAt = outboundAt || now.toISOString();
    const inboundDay = beijingDayKey(inboundAt);
    const endDay = beijingDayKey(endAt);
    const warehouseDays = Math.max(0, Math.floor((endDay - inboundDay) / dayMs));
    const totalWeightKg = round(items.reduce((sum, item) => sum + actualWeightKg(item), 0), 3);
    const totalCbm = round(items.reduce((sum, item) => sum + item.cbm, 0), 3);
    const matchingDensityKgPerCbm = totalCbm > 0 ? totalWeightKg / totalCbm : 0;
    const densityKgPerCbm = round(matchingDensityKgPerCbm, 2);
    const measurementReady = totalWeightKg > 0
      && totalCbm > 0
      && items.every((item) => !item.measurementStatus || item.measurementStatus === 'MEASURED');
    let rentAmountRmb = 0;
    let chargeDays = 0;
    const matchedRules: WarehouseRentRuleSummary[] = [];

    for (let day = 1; measurementReady && day <= warehouseDays; day += 1) {
      const chargeDayKey = inboundDay + day * dayMs;
      const rule = findRule(rules, items[0]?.site, matchingDensityKgPerCbm, chargeDayKey);
      if (!rule) continue;
      const activeItems = items.filter((item) => {
        if (!packageIsActiveOnDay(item, chargeDayKey, beijingDayKey(now))) return false;
        const itemInboundDay = beijingDayKey(item.scanTime || item.createdAt);
        const itemWarehouseDays = Math.floor((chargeDayKey - itemInboundDay) / dayMs);
        return itemWarehouseDays > periodDays(rule.freeDays, rule.freePeriodUnit);
      });
      if (!activeItems.length) continue;
      const activeWeightKg = activeItems.reduce((sum, item) => sum + actualWeightKg(item), 0);
      const activeCbm = activeItems.reduce((sum, item) => sum + item.cbm, 0);
      const quantity = billingQuantity(rule.billingUnit, activeWeightKg, activeCbm);
      rentAmountRmb += quantity * dailyUnitRate(rule);
      chargeDays += 1;
      matchedRules.push(rule);
    }

    const latestRule = matchedRules.at(-1)
      ?? findRule(rules, items[0]?.site, matchingDensityKgPerCbm, endDay);
    const matchedRuleNames = Array.from(new Set(matchedRules.map((rule) => rule.name)));
    return {
      id,
      site: items[0]?.site,
      salesperson: items.find((item) => item.salesperson)?.salesperson,
      customerCode: items[0]!.customerCode,
      customerName: items.find((item) => item.customerName)?.customerName,
      domesticTrackingNo: items[0]!.domesticTrackingNo,
      packageCount: items.reduce((sum, item) => sum + item.packageCount, 0),
      totalWeightKg,
      totalCbm,
      densityKgPerCbm,
      inboundAt,
      outboundAt,
      warehouseDays,
      freeDays: latestRule?.freeDays ?? 0,
      freePeriodUnit: latestRule?.freePeriodUnit,
      chargeDays,
      billingUnit: latestRule?.billingUnit,
      billingCycleUnit: latestRule?.billingCycleUnit,
      billingQuantity: latestRule ? round(billingQuantity(latestRule.billingUnit, totalWeightKg, totalCbm), 3) : 0,
      unitRate: latestRule?.unitRate ?? 0,
      rentAmountRmb: round(rentAmountRmb, 2),
      status: outboundAt ? 'OUTBOUNDED' : 'IN_STOCK',
      matchedRuleId: latestRule?.id,
      matchedRuleName: !measurementReady
        ? '待测量'
        : matchedRuleNames.length > 1
          ? `多段规则（${matchedRuleNames.length}）`
          : latestRule?.name
    };
  });

  const keywordMatches = (value: string | undefined, query: string | undefined) =>
    !query?.trim() || (value ?? '').toLowerCase().includes(query.trim().toLowerCase());
  const visibleRows = rows
    .filter((row) =>
      keywordMatches(row.site, filters.site)
      && keywordMatches(row.salesperson, filters.salesperson)
      && keywordMatches(row.customerCode, filters.customerCode)
      && keywordMatches(row.domesticTrackingNo, filters.domesticTrackingNo)
      && dateRangeMatches(row.inboundAt, filters.inboundFrom, filters.inboundTo)
      && dateRangeMatches(row.outboundAt, filters.outboundFrom, filters.outboundTo)
      && (!filters.status || row.status === filters.status)
      && (hasRentFilter === undefined || (row.rentAmountRmb > 0) === hasRentFilter)
    )
    .sort((left, right) => Date.parse(right.inboundAt) - Date.parse(left.inboundAt));

  return {
    totals: {
      inStockCount: visibleRows.filter((row) => row.status === 'IN_STOCK').length,
      overdueCount: visibleRows.filter((row) => row.chargeDays > 0).length,
      currentRentAmountRmb: round(visibleRows.filter((row) => row.status === 'IN_STOCK').reduce((sum, row) => sum + row.rentAmountRmb, 0), 2),
      outboundedRentAmountRmb: round(visibleRows.filter((row) => row.status === 'OUTBOUNDED').reduce((sum, row) => sum + row.rentAmountRmb, 0), 2)
    },
    rows: visibleRows,
    sites: Array.from(new Set(rows.map((row) => row.site).filter((site): site is string => Boolean(site)))).sort(),
    salespeople: Array.from(new Set(rows.map((row) => row.salesperson).filter((name): name is string => Boolean(name)))).sort()
  };
}

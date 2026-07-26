import * as xlsx from '@e965/xlsx';
import {
  isInvalidWarehouseCodeRule,
  CANADA_ADDRESS_SCOPE_UNSPECIFIED_WAREHOUSE_CODE,
  CANADA_AMAZON_UNMAPPED_WAREHOUSE_CODE,
  CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE,
  sanitizePricingChannelRequirement as sanitizePricingChannelRequirementRule,
  sanitizePricingTransitLabel as sanitizePricingTransitLabelRule,
  warehouseCodeRulesForImport,
  type EuropeOversizeCargoType,
  type EuropeTransportMode,
  type PriceBookImportTargetModule,
  type PriceBookRowSummary,
  type PriceLookupRequest,
  type QuoteSourceType
} from '@siyuan/shared';
import { normalizeAmazonOriginWarehouseName } from './pricing/amazon-origin.shared.js';

export type ExcelCellValue = string | number | null;
export type SimpleWorksheet = {
  name: string;
  rows: ExcelCellValue[][];
};
export type SimpleWorkbook = {
  worksheets: SimpleWorksheet[];
};
export type ExcelModule = { xlsx: typeof xlsx };

export type ImportedPriceRow = Omit<PriceBookRowSummary, 'priceBookId'> & {
  priceBookId?: string;
  remark?: string;
};

export type PriceLookupFormValues = PriceLookupRequest;

type PricingImportDisplayRow = {
  channelName: string;
  realChannelName?: string;
  businessRouteName?: string;
  sourceSheetName?: string;
  transitLabel?: string;
  specialRemark?: string;
  productSurchargeRemark?: string;
};

const EUROPE_CHANNEL_MODULES = new Set<PriceBookImportTargetModule>(['inquiry', 'europeExpress']);
const EUROPE_DISPLAY_ARTIFACT_PATTERN = /系统下单渠道|下单渠道|渠道名称|(?:备注|参考时效|全程时效|派送时效|运输时效|渠道说明)\s*[:：]/i;
const EUROPE_PRICE_GROUP_PROMOTION_PATTERN = /\d+\s*[:：]\s*\d+(?:\.\d+)?\s*(?:减|降)/i;

/**
 * Bump only the module whose workbook parsing or matching contract changed.
 * The background refresh worker compares this map with PriceBook.parserRuleVersion
 * and serially rebuilds retained original workbooks without another upload.
 */
export const PRICING_PARSER_RULE_VERSIONS: Record<PriceBookImportTargetModule, number> = {
  // v8 replays retained workbooks with the shared tail-paragraph requirement
  // reader and the normalised transit label contract.
  amazon: 8,
  // v7 applies the same shared requirement and transit contract to inquiry.
  inquiry: 7,
  // v9 applies the shared requirement and transit contract to Europe Express.
  europeExpress: 9,
  southAfrica: 1,
  // v7 replays US air/sea workbooks with the shared requirement and transit
  // contract, including small route tables.
  usaAirSea: 7,
  // v4 adds an explicit private/FBA address scope and normalises FBA matching
  // to the three-letter prefix used by the supplier's Canada sheets.
  canadaAirSea: 4,
  dubaiAirSea: 1
};

export function pricingParserRuleVersion(module?: PriceBookImportTargetModule): number {
  return module ? PRICING_PARSER_RULE_VERSIONS[module] : 0;
}

const EUROPE_TRANSPORT_PATTERNS: Array<[Exclude<EuropeTransportMode, 'UNCLASSIFIED'>, RegExp]> = [
  ['SEA', /海运|海派|海卡|卡派|卡车|truck/i],
  ['RAIL', /铁路|铁派|rail/i],
  ['AIR', /空运|空派|\bair\b/i]
];

function europeTransportEvidence(value?: string): Set<Exclude<EuropeTransportMode, 'UNCLASSIFIED'>> {
  const source = String(value ?? '').trim();
  // Treat a named sea-rail service as one transport type instead of the
  // ambiguous combination of both words. Individual sections in the same
  // workbook can still explicitly identify themselves as sea or rail.
  if (/铁海|海铁|sea\s*[-/]?\s*rail|rail\s*[-/]?\s*sea/i.test(source)) return new Set(['SEA_RAIL']);
  return new Set(EUROPE_TRANSPORT_PATTERNS.filter(([, pattern]) => pattern.test(source)).map(([mode]) => mode));
}

/**
 * Classifies Europe Express rows only from immutable route structure. Remarks,
 * transit labels, compensation clauses and channel requirements are deliberately
 * excluded: they often contain "快递" but are not a transport mode.
 */
export function inferEuropeTransportMode(row: Pick<PricingImportDisplayRow, 'channelName' | 'realChannelName' | 'businessRouteName' | 'sourceSheetName'>): EuropeTransportMode {
  const displayPriceGroup = row.channelName.includes(' - ')
    ? row.channelName.slice(row.channelName.lastIndexOf(' - ') + 3)
    : undefined;
  const routeFields = [row.realChannelName, row.businessRouteName, displayPriceGroup, row.channelName]
    .map(europeTransportEvidence)
    .filter((evidence) => evidence.size > 0);
  const decisiveRouteModes = new Set(routeFields.filter((evidence) => evidence.size === 1).flatMap((evidence) => Array.from(evidence)));
  if (decisiveRouteModes.size === 1) return Array.from(decisiveRouteModes)[0];
  if (decisiveRouteModes.size > 1) return 'UNCLASSIFIED';

  // A sheet can provide the source classification only when it unambiguously
  // identifies one mode. Generic "空海运铁路快递" sheets are intentionally not
  // allowed to decide a row's transport type.
  const sheetModes = europeTransportEvidence(row.sourceSheetName);
  return sheetModes.size === 1 ? Array.from(sheetModes)[0] : 'UNCLASSIFIED';
}

export function normalizeEuropeTransportModeFilter(value?: string): Exclude<EuropeTransportMode, 'UNCLASSIFIED'> | undefined {
  const text = String(value ?? '').trim();
  if (!text || text === '全部渠道') return undefined;
  const modes = europeTransportEvidence(text);
  return modes.size === 1 ? Array.from(modes)[0] : undefined;
}

export function europeTransportClassificationIssue(row: Pick<PricingImportDisplayRow, 'channelName' | 'realChannelName' | 'businessRouteName' | 'sourceSheetName'>): string | undefined {
  return inferEuropeTransportMode(row) === 'UNCLASSIFIED'
    ? '未从工作表、价格组或原始线路识别出空运、海运、铁路或铁海联运，已排除出业务报价'
    : undefined;
}

export function summarizeEuropeTransportImportHealth(rows: Array<Pick<PricingImportDisplayRow, 'channelName' | 'realChannelName' | 'businessRouteName' | 'sourceSheetName'>>) {
  const counts: Record<EuropeTransportMode, number> = { AIR: 0, SEA: 0, RAIL: 0, SEA_RAIL: 0, UNCLASSIFIED: 0 };
  const errorSummary = rows.flatMap((row, index) => {
    const mode = inferEuropeTransportMode(row);
    counts[mode] += 1;
    const reason = europeTransportClassificationIssue(row);
    return reason ? [{ index: index + 1, reason }] : [];
  });
  return { counts, errorSummary };
}

const zhenyunOversizeSheetLabels = [
  '欧洲空运超大件',
  '欧洲海运普货超大件专线',
  '欧洲铁路超大件专线',
  '中欧铁海运超大件联邦专线',
  '电池专线超大件专线'
] as const;

/**
 * Import feedback for the combined oversized pool. It reports every target
 * sheet explicitly, so “upload succeeded” can no longer hide a skipped air
 * or battery table behind a single total row count.
 */
export function inspectEuropeOversizeWorkbookSheets(
  buffer: Buffer,
  rows: Array<Pick<PricingImportDisplayRow, 'sourceSheetName' | 'channelName' | 'realChannelName' | 'businessRouteName'>>
) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const countsBySheet = new Map<string, number>();
  rows.forEach((row) => {
    const sheetName = String(row.sourceSheetName ?? '').trim();
    if (sheetName) countsBySheet.set(sheetName, (countsBySheet.get(sheetName) ?? 0) + 1);
  });
  const sheets = workbook.SheetNames
    .map((sheetName, index) => {
      const expectedName = zhenyunOversizeSheetLabels.find((label) => sheetName.includes(label));
      if (!expectedName) return undefined;
      const importedRows = countsBySheet.get(sheetName) ?? 0;
      return {
        index: index + 1,
        sheetName,
        importedRows,
        ...(importedRows > 0 ? {} : { ignoredReason: `工作表“${sheetName}”未识别到有效目的地、重量档或单价` })
      };
    })
    .filter((sheet): sheet is { index: number; sheetName: string; importedRows: number; ignoredReason?: string } => Boolean(sheet));
  return {
    sheets,
    errorSummary: sheets.flatMap((sheet) => sheet.ignoredReason ? [{ index: sheet.index, reason: sheet.ignoredReason }] : [])
  };
}

/** A dedicated battery sheet is an eligibility constraint, not a transport mode. */
export function inferEuropeOversizeCargoType(row: Pick<PricingImportDisplayRow, 'channelName' | 'realChannelName' | 'businessRouteName' | 'sourceSheetName'>): EuropeOversizeCargoType {
  const source = [row.channelName, row.realChannelName, row.businessRouteName, row.sourceSheetName].filter(Boolean).join(' ');
  return /电池|带电|battery/i.test(source) ? 'BATTERY' : 'GENERAL';
}

/** Shared rule exports retained for importer compatibility. */
export const sanitizePricingTransitLabel = sanitizePricingTransitLabelRule;
export const sanitizePricingChannelRequirement = sanitizePricingChannelRequirementRule;

function cleanEuropePriceGroup(value?: string, sheetName?: string) {
  let text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^(?:系统下单渠道|下单渠道|渠道名称|渠道)\s*[:：]?\s*/i, '')
    .replace(/(?:备注|参考时效|全程时效|派送时效|运输时效|时效|渠道说明)\s*[:：]?.*$/i, '')
    // Promotional suffixes belong to a temporary pricing campaign rather than
    // the price group. Keeping them in the display name makes the same route
    // look like a different channel after each campaign adjustment.
    .replace(/\s*[-—–]?\s*\d+\s*[:：]\s*\d+(?:\.\d+)?\s*(?:减|降)\s*\d+(?:\.\d+)?(?:\s*(?:元|rmb|\/?(?:kg|票)))?(?:\s*(?:不包税|包税))?\s*$/i, '')
    .replace(/(?:\d+(?:\.\d+)?\s*(?:kg|kgs|公斤)\+?|\d+(?:\.\d+)?\s*元\s*\/?\s*(?:kg|票))/gi, '')
    .replace(/[|｜/／]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (sheetName) {
    text = text
      // Only remove a leading sheet label. A route such as
      // "UPS英国海运双清" legitimately contains "英国海运" and must retain it.
      .replace(new RegExp(`^${escapeRegExp(sheetName)}\\s*(?:[-—–:：/／]+\\s*)(?=\\S)`, 'i'), '')
      .replace(/^[\s\-—–:：]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const groupInParentheses = Array.from(text.matchAll(/[（(]([^（）()]+)[）)]/g))
    .map((match) => match[1].trim())
    .find((item) => /[\u3400-\u9FFF]/.test(item) && !/专业\d+年操作/.test(item));
  if (groupInParentheses) return groupInParentheses;
  text = text
    .replace(/[（(][^（）()]*[）)]/g, ' ')
    .replace(/专业\d+年操作/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || /^(?:系统|价格表|报价表|适用情况)$/i.test(text)) return undefined;
  const midpoint = text.length % 2 === 0 ? text.slice(0, text.length / 2) : undefined;
  return midpoint && midpoint === text.slice(text.length / 2) ? midpoint : text;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Applies the Europe-only display contract while keeping source rows intact. */
export function normalizePricingImportRowForModule<T extends PricingImportDisplayRow>(row: T, targetModule?: PriceBookImportTargetModule): T {
  const transitCandidates = [row.transitLabel, row.specialRemark, row.productSurchargeRemark]
    .map((value) => sanitizePricingTransitLabel(value));
  // A route-description cell can mention only a flight leg (for example
  // "航程1-3天"), while the full channel requirement carries the actual
  // pickup promise. Prefer that promise across all source fields, but retain
  // the source requirements unchanged in `specialRemark` for the detail view.
  const transitLabel = transitCandidates.find((value) => /\d+(?:\.\d+)?(?:[-~至到]\d+(?:\.\d+)?)?个自然日(?:内)?提取/i.test(value ?? ''))
    ?? transitCandidates.find(Boolean);
  const normalized: T = { ...row, ...(transitLabel ? { transitLabel } : {}) };
  if (!targetModule || !EUROPE_CHANNEL_MODULES.has(targetModule)) return normalized;

  const sheetName = String(row.sourceSheetName ?? '').replace(/\s+/g, ' ').trim();
  // Manual/API price rows often use a generic source label. They are already
  // a complete business channel and must not be rewritten as a fake
  // "Sheet - group" value. Normalize only rows that actually contain an
  // imported sheet/group shape or the spreadsheet artifacts we need to hide.
  if (!sheetName || (
    !EUROPE_DISPLAY_ARTIFACT_PATTERN.test(row.channelName)
    && !EUROPE_PRICE_GROUP_PROMOTION_PATTERN.test(row.channelName)
    && !row.channelName.includes(sheetName)
  )) {
    return normalized;
  }
  // Agent profiles may already have emitted the exact `sheet - price group`
  // display contract. Do not run a complete route such as
  // `欧洲空派普货快递专线（大陆直飞）` through the generic parenthesis cleaner.
  if (row.channelName.startsWith(`${sheetName} - `) && row.businessRouteName?.trim()) {
    return normalized;
  }
  // Horizontal price sheets repeat a row label such as "不包税" or "包税"
  // after the price-group header. The header is the only stable display name;
  // preserve the full row value in realChannelName for rate/markup matching.
  const priceGroup = cleanEuropePriceGroup(row.businessRouteName, sheetName)
    ?? cleanEuropePriceGroup(row.channelName, sheetName)
    ?? cleanEuropePriceGroup(row.realChannelName, sheetName);
  if (!sheetName || !priceGroup) return normalized;
  // Keep both structural layers even when their text happens to be identical.
  // It lets users see this is a sheet-specific price group rather than an
  // arbitrary display label, e.g. "欧洲海运电池快递专线 - 欧洲海运电池快递专线".
  const channelName = `${sheetName} - ${priceGroup}`;
  // `channelName` is the user-facing European label. Keep the original route
  // in `realChannelName` so existing agent-markup rules and channel filters
  // continue to match the same imported price line.
  return {
    ...normalized,
    channelName,
    realChannelName: row.realChannelName?.trim() || row.channelName,
    businessRouteName: priceGroup
  };
}

export async function parsePriceWorkbookBuffer(
  buffer: Buffer,
  sourceName?: string,
  targetModule?: PriceBookImportTargetModule,
  agentShortName?: string
): Promise<ImportedPriceRow[]> {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return (await parsePriceWorkbook(arrayBuffer, { xlsx }, sourceName, targetModule, agentShortName))
    .map((row) => normalizePricingImportRowForModule(row, targetModule));
}

export function inspectDubaiWorkbookSheets(buffer: Buffer): Array<{ sheetName: string; mode: 'AIR' | 'SEA' | 'UNASSIGNED' }> {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  return workbook.SheetNames.map((sheetName) => {
    const normalized = sheetName.replace(/\s+/g, '').toLowerCase();
    return {
      sheetName,
      mode: /空运|空派|air/.test(normalized) ? 'AIR' : /海运|海派|sea/.test(normalized) ? 'SEA' : 'UNASSIGNED'
    };
  });
}

function readWorkbook(arrayBuffer: ArrayBuffer, excel: ExcelModule): SimpleWorkbook {
  const workbook = excel.xlsx.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
  return {
    worksheets: workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      restoreNumericCachedFormulaErrors(worksheet);
      return {
        name: sheetName,
        rows: (excel.xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null }) as unknown[][])
          .map((row) => row.map(cellToPrimitive))
      };
    })
  };
}

function restoreNumericCachedFormulaErrors(worksheet: xlsx.WorkSheet) {
  for (const address of Object.keys(worksheet)) {
    if (address.startsWith('!')) continue;
    const cell = worksheet[address];
    if (cell?.t === 'e' && typeof cell.v === 'number' && Number.isFinite(cell.v)) {
      cell.t = 'n';
      delete cell.f;
      delete cell.w;
    }
  }
}

function worksheetToRows(sheet: SimpleWorksheet): ExcelCellValue[][] {
  return sheet.rows;
}

function cellToPrimitive(value: unknown): ExcelCellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export const seedImportedPriceRows: ImportedPriceRow[] = [
  {
    id: 'price-a-us-0-5',
    agentName: 'a代理',
    carrierName: 'DHL',
    channelName: 'DHL HK',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHL代理',
    destinationCountry: '美国',
    postalRule: '全国通用',
    minWeightKg: 0,
    maxWeightKg: 5,
    costPerKg: 22,
    currency: 'RMB',
    transitDays: 5,
    transitLabel: '4-7 天'
  },
  {
    id: 'price-a-la-0-1000',
    agentName: 'a代理',
    carrierName: 'DHL',
    sourceSheetName: 'YY美西快线海卡渠道汇总',
    channelName: '海运洛杉矶专线',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHK03',
    destinationCountry: '美国',
    postalRule: '90000-93599',
    minWeightKg: 0,
    maxWeightKg: 1000,
    costPerKg: 18,
    currency: 'RMB',
    transitDays: 25,
    transitLabel: '22-28 天'
  },
  {
    id: 'price-a-houston-0-1000',
    agentName: 'a代理',
    carrierName: 'DHL',
    sourceSheetName: 'YY美中快线海卡渠道汇总',
    channelName: '海运休斯顿专线',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHK01',
    destinationCountry: '美国',
    postalRule: '77000-79999',
    minWeightKg: 0,
    maxWeightKg: 1000,
    costPerKg: 19,
    currency: 'RMB',
    transitDays: 22,
    transitLabel: '20-25 天'
  },
  {
    id: 'price-a-air-la-0-1000',
    agentName: 'a代理',
    carrierName: 'DHL',
    sourceSheetName: 'YY美西快线海卡渠道汇总',
    channelName: '空运洛杉矶专线',
    realChannelName: 'DHL-A',
    destinationCountry: '美国',
    postalRule: '90001',
    minWeightKg: 0,
    maxWeightKg: 1000,
    costPerKg: 32,
    currency: 'RMB',
    transitDays: 7,
    transitLabel: '5-9 天'
  },
  {
    id: 'price-a-us-5-20',
    agentName: 'a代理',
    carrierName: 'DHL',
    channelName: 'DHL HK',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHL代理',
    destinationCountry: '美国',
    postalRule: '全国通用',
    minWeightKg: 5,
    maxWeightKg: 20,
    costPerKg: 20,
    currency: 'RMB',
    transitDays: 5,
    transitLabel: '4-7 天'
  },
  {
    id: 'price-b-us-0-5',
    agentName: 'b代理',
    carrierName: 'UPS',
    channelName: 'UPS 加美线',
    businessRouteName: 'HK-UPS蓝单',
    realChannelName: 'UPS-HK-C蓝单',
    destinationCountry: '美国',
    postalRule: '全国通用',
    minWeightKg: 0,
    maxWeightKg: 5,
    costPerKg: 21.5,
    currency: 'RMB',
    transitDays: 8,
    transitLabel: '6-10 天'
  }
];

export function calculatePriceChargeableWeight(values: Partial<PriceLookupFormValues>): number {
  const packageCount = values.packageCount ?? 1;
  const dimensionWeight =
    values.lengthCm && values.widthCm && values.heightCm
      ? (values.lengthCm * values.widthCm * values.heightCm * packageCount) / 6000
      : 0;
  const volumeWeight = values.volumeCbm ? values.volumeCbm * 167 : 0;
  const actualWeight = values.actualWeightKg ?? (values.unitActualWeightKg ? values.unitActualWeightKg * packageCount : 0);
  return roundMoney(Math.max(dimensionWeight, volumeWeight, actualWeight));
}

export async function parsePriceWorkbook(
  arrayBuffer: ArrayBuffer,
  excel: ExcelModule,
  sourceName?: string,
  targetModule?: PriceBookImportTargetModule,
  agentShortName?: string
): Promise<ImportedPriceRow[]> {
  const workbook = await readWorkbook(arrayBuffer, excel);
  if (!workbook.worksheets.length) {
    throw new Error('价格表为空');
  }

  const lookupNotes = extractWorkbookLookupNotes(workbook);
  const canonicalRows = parseCanonicalPriceWorkbook(workbook);
  if (canonicalRows.length) {
    return attachWorkbookLookupNotes(canonicalRows, lookupNotes);
  }

  const parserAgent = normalizePricingParserAgent(agentShortName ?? sourceName);
  if (parserAgent === '拓普达') {
    const profile = parseTopudaPricingProfile(workbook, sourceName, agentShortName);
    // One agent profile deliberately owns all known TPD sheet shapes. The
    // selected module chooses its branch and price pool; it never selects a
    // second, divergent parser for the same supplier workbook.
    const rows = targetModule === 'usaAirSea'
      ? profile.usPostalRows
      : targetModule === 'amazon'
        ? profile.amazonRows
        : targetModule === 'canadaAirSea'
          ? profile.canadaRows
          : [];
    if (targetModule === 'usaAirSea' && !rows.length) {
      throw new Error('未识别拓普达美国空海运价格表，请确认包含区域/重量、邮编范围和至少两个重量阶梯列');
    }
    if ((targetModule === 'amazon' || targetModule === 'canadaAirSea') && !rows.length) {
      throw new Error('未识别拓普达仓库代码价格表，请确认包含国家分区、仓库分区和至少两个重量阶梯列');
    }
    if (rows.length) return attachWorkbookLookupNotes(rows, lookupNotes);
  }
  if (parserAgent === '振韵') {
    const profile = parseZhenyunPricingProfile(workbook, sourceName, agentShortName);
    const rows = targetModule === 'amazon'
      ? profile.amazonRows
      : targetModule === 'inquiry'
        ? profile.inquiryRows
        : targetModule === 'europeExpress'
          ? profile.europeExpressRows
          : [];
    if (rows.length) {
      return attachWorkbookLookupNotes(rows, {
        productSurchargeRemark: lookupNotes.productSurchargeRemark,
        specialRemark: mergeRemarkBlocks(lookupNotes.specialRemark, extractZhenyunHomepageRequirement(workbook))
      });
    }
  }
  if (parserAgent === '驰汉') {
    const rows = parseChihanEuropeExpressPriceWorkbook(workbook, sourceName, agentShortName);
    if (rows.length) {
      if (targetModule && targetModule !== 'europeExpress') {
        throw new Error('驰汉价格表仅适用于欧洲空海运铁路快递查询，请选择该查价模块导入');
      }
      return attachWorkbookLookupNotes(rows, lookupNotes);
    }
  }

  const canadaAirSeaRows = !targetModule || targetModule === 'canadaAirSea'
    ? parseKunyunCanadaAirSeaPriceWorkbook(workbook, sourceName, agentShortName)
    : [];
  if (canadaAirSeaRows.length) {
    return attachWorkbookLookupNotes(canadaAirSeaRows, lookupNotes);
  }

  // A workbook can contain FBA warehouse-summary tabs beside US air/sea
  // postal pricing. The selected target module is the data boundary: Paige's
  // US quote import must never write those warehouse rows to USA Air/Sea.
  const warehouseSummaryRows = !targetModule || targetModule === 'amazon' || targetModule === 'canadaAirSea'
    ? parseWarehouseSummaryPriceWorkbook(workbook, sourceName)
    : [];
  const usAirSeaRows = !targetModule || targetModule === 'usaAirSea'
    ? parseUsAirSeaPriceWorkbook(workbook, sourceName)
    : [];
  if (warehouseSummaryRows.length || usAirSeaRows.length) {
    return attachWorkbookLookupNotes([...usAirSeaRows, ...warehouseSummaryRows], lookupNotes);
  }

  const middleEastAirSeaRows = parseMiddleEastAirSeaPriceWorkbook(workbook, sourceName);
  if (middleEastAirSeaRows.length) {
    return attachWorkbookLookupNotes(middleEastAirSeaRows, lookupNotes);
  }

  const horizontalRows = parseHorizontalTierPriceWorkbook(workbook, sourceName, targetModule);
  if (horizontalRows.length) {
    return attachWorkbookLookupNotes(horizontalRows, lookupNotes);
  }

  throw new Error('价格表必须包含代理、渠道、目的地、最小重量、最大重量、成本单价，或包含对应渠道、仓库编码、12KG+/51KG+等卡派汇总表头');
}

type TopudaPricingProfile = {
  amazonRows: ImportedPriceRow[];
  canadaRows: ImportedPriceRow[];
  usPostalRows: ImportedPriceRow[];
};

type ZhenyunPricingProfile = {
  amazonRows: ImportedPriceRow[];
  inquiryRows: ImportedPriceRow[];
  europeExpressRows: ImportedPriceRow[];
};

function parseTopudaPricingProfile(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): TopudaPricingProfile {
  const regionalWarehouseRows = parseRegionalWarehouseTierPriceWorkbook(workbook, sourceName, agentShortName);
  const usWarehouseDetailRows = parseTopudaUsWarehouseDetailPriceWorkbook(workbook, sourceName, agentShortName);
  const warehouseSummaryRows = parseWarehouseSummaryPriceWorkbook(workbook, sourceName)
    .map((row) => ({
      ...row,
      // The summary covers both Canada and US FBA routes. Its channel name is
      // the only reliable country marker, whereas the generic parser defaults
      // warehouse summaries to the US.
      destinationCountry: /加拿大|canada/i.test(row.channelName) ? '加拿大' : '美国'
    }));
  const detailedWarehouseRoutes = new Set(usWarehouseDetailRows.map((row) => normalizeTopudaWarehouseRouteKey(row.channelName)));
  return {
    amazonRows: [
      ...regionalWarehouseRows,
      ...usWarehouseDetailRows,
      // The workbook summary is still the fallback for routes that have no
      // dedicated tab. Never stop after the first matched sheet.
      ...warehouseSummaryRows.filter((row) => !detailedWarehouseRoutes.has(normalizeTopudaWarehouseRouteKey(row.channelName)))
    ],
    // Keep Canada's existing dedicated regional parser intact. The larger
    // warehouse summary is retained by Amazon so US FBA routes do not leak
    // into the Canada air/sea lookup pool.
    canadaRows: regionalWarehouseRows,
    usPostalRows: parseTopudaUsAirSeaPriceWorkbook(workbook, sourceName, agentShortName)
  };
}

/**
 * 振韵的同一份工作簿横跨三个报价模块。按目标模块选择唯一分支，避免
 * 亚马逊仓库码、欧洲两位邮编区和空派国家价表相互写入对方价格池。
 */
function parseZhenyunPricingProfile(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ZhenyunPricingProfile {
  return {
    amazonRows: parseZhenyunAmazonPriceWorkbook(workbook, sourceName, agentShortName),
    inquiryRows: parseZhenyunEuropeOversizePriceWorkbook(workbook, sourceName, agentShortName),
    europeExpressRows: parseZhenyunEuropeExpressPriceWorkbook(workbook, sourceName, agentShortName)
  };
}

function parseZhenyunAmazonPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  const sheet = workbook.worksheets.find((item) => item.name.includes('德国海运直送和卡派'));
  if (!sheet) return [];
  const rows = worksheetToRows(sheet);
  const agentName = agentShortName?.trim() || inferImportedAmazonAgentName(sourceName ?? sheet.name);
  return rows.flatMap((groupHeaders, groupIndex) => {
    if (normalizeHeader(groupHeaders[0]) !== '系统下单渠道') return [];
    const headers = rows[groupIndex + 1] ?? [];
    if (normalizeHeader(headers[0]) !== '国家/重量区间') return [];
    const tierColumns = buildImportedTierColumns(headers);
    if (tierColumns.length < 2) return [];
    const transitIndex = findLooseHeaderIndex(groupHeaders, ['参考时效', '全程时效', '派送时效', '船期', '时效']);
    const remarkIndexes = getNamedRemarkColumnIndexes(
      groupHeaders,
      headers,
      [transitIndex, ...tierColumns.map((item) => item.columnIndex)],
      /备注|渠道要求|要求|说明|附加费|尺寸|限制|注意|须知/
    );
    let inheritedTransitLabel: string | undefined;
    const dataRows = zhenyunSectionDataRows(rows, groupIndex + 1);
    const sheetTotalRemark = extractTrailingPriceSectionRequirement(
      rows,
      groupIndex + 1,
      tierColumns.map((item) => item.columnIndex)
    );
    return dataRows.flatMap(({ row, rowIndex }) => {
      const warehouseCodes = splitImportedWarehouseCodes(cellToText(row[0]));
      if (!warehouseCodes.length) return [];
      const rowTransitLabel = transitIndex >= 0 ? extractZhenyunTransitLabel(row[transitIndex]) : undefined;
      if (rowTransitLabel) inheritedTransitLabel = rowTransitLabel;
      const transitLabel = rowTransitLabel ?? inheritedTransitLabel;
      const specialRemark = mergeRemarkBlocks(extractRemarkFromColumns(row, remarkIndexes), sheetTotalRemark);
      return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
        const price = cellToNumber(row[columnIndex]);
        if (price <= 0) return [];
        const group = zhenyunColumnPriceGroup(groupHeaders, columnIndex);
        if (!group) return [];
        const nextTier = tierColumns[tierIndex + 1]?.tier;
        const maxWeightKg = tier.kind === 'kg' && tier.maxWeightKg >= 99999 && nextTier?.kind === 'kg' && nextTier.minWeightKg > tier.minWeightKg
          ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
          : tier.maxWeightKg;
        const channelName = `${sheet.name} - ${group}`;
        const sourceTierLabel = cellToText(headers[columnIndex]) || tier.label;
        return warehouseCodes.map((warehouseCode) => ({
          id: `import-price-${Date.now()}-${sheet.name}-${groupIndex}-${rowIndex}-${columnIndex}-${warehouseCode}`,
          agentName,
          sourceSheetName: sheet.name,
          carrierName: inferPriceCarrierName({ channelName }),
          channelName,
          realChannelName: group,
          businessRouteName: group,
          warehouseCode,
          destinationCountry: '德国',
          minWeightKg: tier.minWeightKg,
          maxWeightKg,
          costPerKg: price,
          ...(tier.kind === 'cbm' ? { cbmPrice: price } : {}),
          priceTierLabel: sourceTierLabel,
          currency: 'RMB',
          transitDays: parseTransitDays(transitLabel),
          transitLabel,
          ...(specialRemark ? { specialRemark } : {})
        }));
      });
    });
  });
}

type ZhenyunOversizeZoneSheet = {
  sheetMatcher: string;
  group: string;
  transportMode: Exclude<EuropeTransportMode, 'UNCLASSIFIED'>;
  cargoType: EuropeOversizeCargoType;
};

const zhenyunOversizeZoneSheets: ZhenyunOversizeZoneSheet[] = [
  { sheetMatcher: '欧洲海运普货超大件专线', group: '欧洲海运普货超大件', transportMode: 'SEA', cargoType: 'GENERAL' },
  { sheetMatcher: '欧洲铁路超大件专线', group: '欧洲铁路普货超大件', transportMode: 'RAIL', cargoType: 'GENERAL' },
  { sheetMatcher: '电池专线超大件专线', group: '欧洲电池超大件专线', transportMode: 'RAIL', cargoType: 'BATTERY' }
];

/**
 * The original workbook carries five independent oversized price tables.
 * Keep them in the inquiry pool, but parse and label every sheet separately;
 * sending the workbook to Europe Express would mix two different products.
 */
function parseZhenyunEuropeOversizePriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  return [
    ...zhenyunOversizeZoneSheets.flatMap((config) => parseZhenyunOversizeZonePriceWorkbook(workbook, config, sourceName, agentShortName)),
    ...parseZhenyunOversizeAirPriceWorkbook(workbook, sourceName, agentShortName),
    ...parseZhenyunOversizeSeaRailPriceWorkbook(workbook, sourceName, agentShortName)
  ];
}

function parseZhenyunOversizeZonePriceWorkbook(
  workbook: SimpleWorkbook,
  config: ZhenyunOversizeZoneSheet,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  const sheet = workbook.worksheets.find((item) => item.name.includes(config.sheetMatcher));
  if (!sheet) return [];
  const rows = worksheetToRows(sheet);
  const agentName = agentShortName?.trim() || inferAgentNameFromText(sourceName ?? sheet.name) || '深圳振韵国际';
  const group = config.group;
  const channelName = `${sheet.name} - ${group}`;
  const sheetTotalRemark = extractZhenyunSheetTotalRequirement(rows);
  return rows.flatMap((headers, headerIndex) => {
    const countryIndex = findHeaderIndex(headers, ['国家']);
    const postalIndex = findLooseHeaderIndex(headers, ['邮编']);
    const tierColumns = buildImportedTierColumns(headers).filter((item) => item.tier.kind === 'kg');
    if (countryIndex < 0 || postalIndex < 0 || tierColumns.length < 2) return [];
    let inheritedCountry = '';
    let inheritedTransitLabel: string | undefined;
    return zhenyunSectionDataRows(rows, headerIndex).flatMap(({ row, rowIndex }) => {
      const countryCell = cellToText(row[countryIndex]);
      if (countryCell) inheritedCountry = countryCell;
      const destinationCountry = inferDestinationFromText(inheritedCountry);
      const postalRule = cellToText(row[postalIndex]);
      if (!inheritedCountry || destinationCountry === '未标记目的地' || !postalRule) return [];
      const remarkCells = row.slice(Math.max(...tierColumns.map((item) => item.columnIndex)) + 1);
      const rowTransitLabel = remarkCells.map((cell) => extractZhenyunTransitLabel(cell)).find(Boolean);
      if (rowTransitLabel) inheritedTransitLabel = rowTransitLabel;
      const transitLabel = rowTransitLabel ?? inheritedTransitLabel;
      const specialRemark = mergeRemarkBlocks(...remarkCells.map(cellToRemarkLine), sheetTotalRemark);
      return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
        const costPerKg = cellToNumber(row[columnIndex]);
        if (costPerKg <= 0) return [];
        const nextTier = tierColumns[tierIndex + 1]?.tier;
        const maxWeightKg = tier.maxWeightKg >= 99999 && nextTier && nextTier.minWeightKg > tier.minWeightKg
          ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
          : tier.maxWeightKg;
        return [{
          id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowIndex}-${columnIndex}`,
          agentName,
          sourceSheetName: sheet.name,
          carrierName: inferPriceCarrierName({ channelName }),
          channelName,
          realChannelName: group,
          businessRouteName: group,
          transportMode: config.transportMode,
          cargoType: config.cargoType,
          destinationCountry,
          postalRule,
          minWeightKg: tier.minWeightKg,
          maxWeightKg,
          costPerKg,
          priceTierLabel: tier.label,
          currency: 'RMB',
          transitDays: parseTransitDays(transitLabel),
          transitLabel,
          ...(specialRemark ? { specialRemark } : {})
        }];
      });
    });
  });
}

function parseZhenyunOversizeAirPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  const sheet = workbook.worksheets.find((item) => item.name.includes('欧洲空运超大件'));
  if (!sheet) return [];
  const rows = worksheetToRows(sheet);
  const agentName = agentShortName?.trim() || inferAgentNameFromText(sourceName ?? sheet.name) || '深圳振韵国际';
  const sheetTotalRemark = extractZhenyunSheetTotalRequirement(rows);
  return rows.flatMap((headers, headerIndex) => {
    const destinationIndex = findHeaderIndex(headers, ['目的地']);
    const tierColumns = buildImportedTierColumns(headers).filter((item) => item.tier.kind === 'kg');
    if (destinationIndex < 0 || tierColumns.length < 2) return [];
    const group = findZhenyunOversizeAirGroup(rows, headerIndex) ?? '欧洲空运超大件';
    const channelName = `${sheet.name} - ${group}`;
    const remarkCells = headers.slice(Math.max(...tierColumns.map((item) => item.columnIndex)) + 1);
    const transitLabel = remarkCells.map((cell) => extractZhenyunTransitLabel(cell)).find(Boolean);
    const specialRemark = mergeRemarkBlocks(...remarkCells.map(cellToRemarkLine), sheetTotalRemark);
    return zhenyunSectionDataRows(rows, headerIndex).flatMap(({ row, rowIndex }) => {
      const destinations = splitZhenyunExpressDestinations(cellToText(row[destinationIndex]));
      if (!destinations.length) return [];
      return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
        const costPerKg = cellToNumber(row[columnIndex]);
        if (costPerKg <= 0) return [];
        const nextTier = tierColumns[tierIndex + 1]?.tier;
        const maxWeightKg = tier.maxWeightKg >= 99999 && nextTier && nextTier.minWeightKg > tier.minWeightKg
          ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
          : tier.maxWeightKg;
        return destinations.map(({ destinationCountry, postalRule }, destinationIndex) => ({
          id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowIndex}-${columnIndex}-${destinationIndex}`,
          agentName,
          sourceSheetName: sheet.name,
          carrierName: inferPriceCarrierName({ channelName }),
          channelName,
          realChannelName: group,
          businessRouteName: group,
          transportMode: 'AIR' as const,
          cargoType: 'GENERAL' as const,
          destinationCountry,
          postalRule,
          minWeightKg: tier.minWeightKg,
          maxWeightKg,
          costPerKg,
          priceTierLabel: tier.label,
          currency: 'RMB',
          transitDays: parseTransitDays(transitLabel),
          transitLabel,
          ...(specialRemark ? { specialRemark } : {})
        }));
      });
    });
  });
}

function findZhenyunOversizeAirGroup(rows: ExcelCellValue[][], headerIndex: number) {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const title = rowToRemarkLine(rows[index]);
    const match = title.match(/欧洲空派超大件（[^）]+）/);
    if (match) return match[0];
    if (title && !/深圳振韵|返回首页/.test(title)) break;
  }
  return undefined;
}

function parseZhenyunOversizeSeaRailPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  const sheet = workbook.worksheets.find((item) => item.name.includes('中欧铁海运超大件联邦专线'));
  if (!sheet) return [];
  const rows = worksheetToRows(sheet);
  const agentName = agentShortName?.trim() || inferAgentNameFromText(sourceName ?? sheet.name) || '深圳振韵国际';
  const sheetTotalRemark = extractZhenyunSheetTotalRequirement(rows);
  return rows.flatMap((headers, headerIndex) => {
    const destinationIndex = findHeaderIndex(headers, ['国家/重量区间']);
    const tierColumns = buildImportedTierColumns(headers).filter((item) => item.tier.kind === 'kg');
    if (destinationIndex < 0 || tierColumns.length < 2) return [];
    const group = cellToText(rows[headerIndex - 1]?.[1]) || '中欧铁海运超大件联邦专线';
    const transportMode: Exclude<EuropeTransportMode, 'UNCLASSIFIED'> = /铁路|铁派|rail/i.test(group)
      ? 'RAIL'
      : /铁海|海铁/i.test(group) ? 'SEA_RAIL' : 'SEA';
    const channelName = `${sheet.name} - ${group}`;
    return zhenyunSectionDataRows(rows, headerIndex).flatMap(({ row, rowIndex }) => {
      const destinations = splitZhenyunExpressDestinations(cellToText(row[destinationIndex]));
      if (!destinations.length) return [];
      return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
        const costPerKg = cellToNumber(row[columnIndex]);
        if (costPerKg <= 0) return [];
        const nextTier = tierColumns[tierIndex + 1]?.tier;
        const maxWeightKg = tier.maxWeightKg >= 99999 && nextTier && nextTier.minWeightKg > tier.minWeightKg
          ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
          : tier.maxWeightKg;
        return destinations.map(({ destinationCountry, postalRule }, destinationIndex) => ({
          id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowIndex}-${columnIndex}-${destinationIndex}`,
          agentName,
          sourceSheetName: sheet.name,
          carrierName: inferPriceCarrierName({ channelName }),
          channelName,
          realChannelName: group,
          businessRouteName: group,
          transportMode,
          cargoType: 'GENERAL' as const,
          destinationCountry,
          postalRule,
          minWeightKg: tier.minWeightKg,
          maxWeightKg,
          costPerKg,
          priceTierLabel: tier.label,
          currency: 'RMB',
          ...(sheetTotalRemark ? { specialRemark: sheetTotalRemark } : {})
        }));
      });
    });
  });
}

function parseZhenyunEuropeExpressPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  const sheet = workbook.worksheets.find((item) => item.name.includes('欧洲空派快递派'));
  if (!sheet) return [];
  const rows = worksheetToRows(sheet);
  const agentName = agentShortName?.trim() || inferAgentNameFromText(sourceName ?? sheet.name) || '深圳振韵国际';
  const sheetTotalRemark = extractZhenyunSheetTotalRequirement(rows);
  return rows.flatMap((headers, headerIndex) => {
    if (normalizeHeader(headers[0]) !== '目的地') return [];
    const tierColumns = buildImportedTierColumns(headers).filter((item) => item.tier.kind === 'kg');
    if (tierColumns.length < 2) return [];
    const group = findZhenyunExpressGroup(rows, headerIndex);
    if (!group) return [];
    const channelName = `${sheet.name} - ${group}`;
    const transitLabel = headers
      .slice(Math.max(...tierColumns.map((item) => item.columnIndex)) + 1)
      .map((cell) => extractZhenyunTransitLabel(cell))
      .find(Boolean);
    const specialRemark = mergeRemarkBlocks(...headers.map(cellToRemarkLine), sheetTotalRemark);
    return zhenyunSectionDataRows(rows, headerIndex).flatMap(({ row, rowIndex }) => {
      const destinations = splitZhenyunExpressDestinations(cellToText(row[0]));
      if (!destinations.length) return [];
      return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
        const costPerKg = cellToNumber(row[columnIndex]);
        if (costPerKg <= 0) return [];
        const nextTier = tierColumns[tierIndex + 1]?.tier;
        const maxWeightKg = tier.maxWeightKg >= 99999 && nextTier && nextTier.minWeightKg > tier.minWeightKg
          ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
          : tier.maxWeightKg;
        return destinations.map(({ destinationCountry, postalRule }, destinationIndex) => ({
          id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowIndex}-${columnIndex}-${destinationIndex}`,
          agentName,
          sourceSheetName: sheet.name,
          carrierName: inferPriceCarrierName({ channelName }),
          channelName,
          realChannelName: group,
          businessRouteName: group,
          destinationCountry,
          postalRule,
          minWeightKg: tier.minWeightKg,
          maxWeightKg,
          costPerKg,
          priceTierLabel: tier.label,
          currency: 'RMB',
          transitDays: parseTransitDays(transitLabel),
          transitLabel,
          ...(specialRemark ? { specialRemark } : {})
        }));
      });
    });
  });
}

/**
 * 坤宇加拿大报价表以“分区/重量”或“分区”作为首列，价格档位位于同一
 * 行；它没有通用价格表所要求的代理、渠道、最小/最大重量字段。该布局
 * 同时覆盖空派、海派和 FBA 按方表，故按目标模块独立解析，避免流入亚马逊。
 */
function parseKunyunCanadaAirSeaPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    const rows = worksheetToRows(sheet);
    return rows.flatMap((headers, headerIndex) => {
      const countryIndex = findHeaderIndex(headers, ['国家']);
      const zoneIndex = findHeaderIndex(headers, ['FBA仓', 'FBA仓库', '仓库', '分区/重量', '分区']);
      const tierColumns = buildImportedTierColumns(headers);
      if (zoneIndex < 0 || tierColumns.length < 2) return [];

      const defaultCountry = /加拿大|美转加/.test(sheet.name) ? '加拿大' : '';
      const firstCountry = countryIndex >= 0 ? cellToText(rows[headerIndex + 1]?.[countryIndex]) : '';
      if (!defaultCountry && !firstCountry.includes('加拿大')) return [];

      const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '全程时效', '提取时效', '船期', '时效']);
      const dataRows = kunyunCanadaPriceDataRows(rows, headerIndex, tierColumns.map((item) => item.columnIndex));
      if (!dataRows.length) return [];
      const { productSurchargeRemark, specialRemark } = splitKunyunCanadaRequirementBlocks(
        rows.slice(dataRows[dataRows.length - 1].rowIndex + 1)
      );
      const channelName = sheet.name.trim();
      const agentName = agentShortName?.trim() || (/坤宇/.test(sourceName ?? '') ? '坤宇' : '未知代理');
      let inheritedCountry = firstCountry || defaultCountry;
      let inheritedTransitLabel: string | undefined;

      return dataRows.flatMap(({ row, rowIndex }) => {
        const countryCell = countryIndex >= 0 ? cellToText(row[countryIndex]) : '';
        if (countryCell) inheritedCountry = countryCell;
        const destinationCountry = inheritedCountry.includes('加拿大') ? '加拿大' : defaultCountry;
        if (!destinationCountry) return [];

        const zone = cellToText(row[zoneIndex]);
        const warehouseValues = canadaAddressScopeRulesForImport(zone);
        const rowTransitLabel = transitIndex >= 0 ? extractTransitLabelFromText(row[transitIndex]) : undefined;
        if (rowTransitLabel) inheritedTransitLabel = rowTransitLabel;
        const transitLabel = rowTransitLabel ?? inheritedTransitLabel;

        return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
          const price = cellToNumber(row[columnIndex]);
          if (price <= 0) return [];
          const nextTier = tierColumns[tierIndex + 1]?.tier;
          const maxWeightKg = tier.kind === 'kg' && tier.maxWeightKg >= 99999 && nextTier?.kind === 'kg' && nextTier.minWeightKg > tier.minWeightKg
            ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
            : tier.maxWeightKg;
          return warehouseValues.map((warehouseCode) => ({
            id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowIndex}-${columnIndex}-${warehouseCode ?? 'general'}`,
            agentName,
            sourceSheetName: sheet.name,
            carrierName: inferPriceCarrierName({ channelName }),
            channelName,
            realChannelName: channelName,
            businessRouteName: channelName,
            warehouseCode,
            destinationCountry,
            minWeightKg: tier.minWeightKg,
            maxWeightKg,
            costPerKg: price,
            ...(tier.kind === 'cbm' ? { cbmPrice: price } : {}),
            priceTierLabel: tier.label,
            currency: 'RMB',
            transitDays: parseTransitDays(transitLabel),
            transitLabel,
            ...(productSurchargeRemark ? { productSurchargeRemark } : {}),
            ...(specialRemark ? { specialRemark } : {})
          }));
        });
      });
    });
  });
}

/**
 * Canada supplier sheets distinguish private deliveries with a literal
 * “非亚马逊地址” row. FBA rows are selected from the first three letters of a
 * warehouse zone (YVR / YYC / YYZ ...), not the full Amazon warehouse code.
 */
function canadaAddressScopeRulesForImport(value: string): string[] {
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  if (/非亚马逊|私人(?:地址|住宅)?|非FBA/.test(normalized)) {
    return [CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE];
  }
  if (/FBA|AMAZON|亚马逊/.test(normalized)) {
    const prefixes = Array.from(new Set(normalized
      .split(/[+／/|｜,，、;；\n\r]+/)
      .map((segment) => segment.match(/[A-Z]{3}/)?.[0])
      .filter((prefix): prefix is string => prefix !== undefined && !['FBA', 'AMZ', 'AMA'].includes(prefix))));
    return prefixes.length ? prefixes : [CANADA_AMAZON_UNMAPPED_WAREHOUSE_CODE];
  }
  // A zone list such as "YVR+YXX2" has no explicit FBA suffix but is still
  // an Amazon warehouse table. Preserve only its three-letter zone prefixes.
  const prefixes = Array.from(new Set(normalized
    .split(/[+／/|｜,，、;；\n\r]+/)
    .map((segment) => segment.match(/^[A-Z]{3}/)?.[0])
    .filter((prefix): prefix is string => prefix !== undefined && !['FBA', 'AMZ', 'AMA'].includes(prefix))));
  return prefixes.length ? prefixes : [CANADA_ADDRESS_SCOPE_UNSPECIFIED_WAREHOUSE_CODE];
}

/** Keep product surcharges separate from operational/channel requirements. */
function splitKunyunCanadaRequirementBlocks(rows: ExcelCellValue[][]) {
  const lines = rows.map(rowToRemarkLine).filter(Boolean);
  return {
    productSurchargeRemark: mergeRemarkBlocks(...lines.filter((line) => /产品附加费|产品.*加收|附加费/.test(line))),
    specialRemark: mergeRemarkBlocks(...lines.filter((line) => !/产品附加费|产品.*加收|附加费/.test(line)))
  };
}

function kunyunCanadaPriceDataRows(
  rows: ExcelCellValue[][],
  headerIndex: number,
  tierColumnIndexes: number[]
) {
  const dataRows: Array<{ row: ExcelCellValue[]; rowIndex: number }> = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!tierColumnIndexes.some((columnIndex) => cellToNumber(row[columnIndex]) > 0)) {
      if (dataRows.length) break;
      continue;
    }
    dataRows.push({ row, rowIndex });
  }
  return dataRows;
}

/**
 * 驰汉的英国与非英国工作表同时包含 KG 海运双清和 CBM 卡车头程表。
 * 两类均只进入欧洲空海运铁路快递池；末端派送/托盘明细不是完整总价，
 * 仅写入说明，不把它们误当作线路单价。
 */
function parseChihanEuropeExpressPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  const agentName = agentShortName?.trim() || inferAgentNameFromText(sourceName ?? '') || '驰汉';
  return workbook.worksheets
    .filter((sheet) => sheet.name.includes('英国海运') || sheet.name.includes('非英海运'))
    .flatMap((sheet) => parseChihanEuropeSheet(sheet, agentName));
}

function parseChihanEuropeSheet(sheet: SimpleWorksheet, agentName: string): ImportedPriceRow[] {
  const rows = worksheetToRows(sheet);
  return rows.flatMap((headers, headerIndex) => {
    if (!['渠道', '国家'].includes(normalizeHeader(headers[0]))) return [];
    const title = findChihanRouteTitle(rows, headerIndex);
    if (!title) return [];
    const tierColumns = buildImportedTierColumns(headers);
    const isCbm = tierColumns.some((item) => item.tier.kind === 'cbm');
    const usableTiers = tierColumns.filter((item) => item.tier.kind === (isCbm ? 'cbm' : 'kg'));
    if (usableTiers.length < 2) return [];
    const isUk = title.includes('英国');
    const transitIndex = findLooseHeaderIndex(headers, ['时效']);
    const headhaulRemark = isCbm
      ? '头程参考价：最终费用=头程费用+产品附加费+派送费+托盘费；派送费另收13%燃油费，请按目的地、邮编及托盘/整车规则确认末端费用。'
      : undefined;
    const dataRows = chihanSectionDataRows(rows, headerIndex);
    const sheetTotalRemark = extractTrailingPriceSectionRequirement(
      rows,
      headerIndex,
      usableTiers.map((item) => item.columnIndex)
    );
    const sectionRemark = mergeRemarkBlocks(headhaulRemark, sheetTotalRemark);
    return dataRows.flatMap(({ row, rowIndex }) => {
      const ukTaxInclusion = isUk ? cellToText(row[0]) : undefined;
      if (isUk && !/^(包税|不包税)$/.test(ukTaxInclusion ?? '')) return [];
      const destinations = isUk ? ['英国'] : splitChihanDestinationCountries(cellToText(row[0]));
      if (!destinations.length) return [];
      const transitLabel = transitIndex >= 0 ? extractTransitLabelFromText(row[transitIndex]) : undefined;
      const route = cleanChihanRouteTitle(title);
      return usableTiers.flatMap(({ columnIndex, tier }, tierIndex) => {
        const taxInclusion = ukTaxInclusion ?? chihanColumnTaxInclusion(rows[headerIndex - 1] ?? [], columnIndex);
        if (!/^(包税|不包税)$/.test(taxInclusion ?? '')) return [];
        const channelName = `${sheet.name} - ${route}（${taxInclusion}）`;
        const price = cellToNumber(row[columnIndex]);
        if (price <= 0) return [];
        const nextTier = usableTiers[tierIndex + 1]?.tier;
        const maxWeightKg = tier.kind === 'kg' && tier.maxWeightKg >= 99999 && nextTier?.kind === 'kg' && nextTier.minWeightKg > tier.minWeightKg
          ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
          : tier.maxWeightKg;
        const tierLabel = cellToText(headers[columnIndex]) || tier.label;
        return destinations.map((destinationCountry, destinationIndex) => ({
          id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowIndex}-${columnIndex}-${destinationIndex}`,
          agentName,
          sourceSheetName: sheet.name,
          carrierName: inferPriceCarrierName({ channelName }),
          channelName,
          realChannelName: route,
          businessRouteName: `${route}（${taxInclusion}）`,
          destinationCountry,
          minWeightKg: tier.minWeightKg,
          maxWeightKg,
          costPerKg: price,
          ...(tier.kind === 'cbm' ? { cbmPrice: price } : {}),
          priceTierLabel: tierLabel,
          currency: 'RMB',
          transitDays: parseTransitDays(transitLabel),
          transitLabel,
          ...(sectionRemark ? { specialRemark: sectionRemark } : {})
        }));
      });
    });
  });
}

function findChihanRouteTitle(rows: ExcelCellValue[][], headerIndex: number) {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const value = rowToRemarkLine(rows[index]);
    // Non-UK tables share the tax-group row with right-side explanatory
    // columns, so its full text is not only “包税/不包税”. Its first cell is.
    if (/^(包税|不包税)$/.test(cellToText(rows[index][0]))) continue;
    if (/海运.*双清/.test(value)) return value;
    if (value && !/^(?:(?:包税|不包税)(?:[\s/]+(?:包税|不包税))*)$/.test(value) && !/国家|渠道|时效/.test(value)) break;
  }
  return undefined;
}

function cleanChihanRouteTitle(value: string) {
  return value
    .replace(/[-—–]?\s*1\s*[:：]\s*300\s*减\s*0\.5/gi, '')
    .replace(/[-—–]?\s*头程费用.*$/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function chihanSectionDataRows(rows: ExcelCellValue[][], headerIndex: number) {
  const result: Array<{ row: ExcelCellValue[]; rowIndex: number }> = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const first = cellToText(row[0]);
    if (!first && !row.some((cell) => Boolean(cellToText(cell)))) break;
    if (/海运.*双清|渠道|国家/.test(first) && !/^(包税|不包税)$/.test(first)) break;
    result.push({ row, rowIndex });
  }
  return result;
}

function chihanColumnTaxInclusion(groupHeaders: ExcelCellValue[], columnIndex: number) {
  for (let index = columnIndex; index >= 0; index -= 1) {
    const value = cellToText(groupHeaders[index]);
    if (/^(包税|不包税)$/.test(value)) return value;
  }
  return undefined;
}

function splitChihanDestinationCountries(value: string) {
  const countryNames = ['卢森堡', '荷兰', '比利时', '保加利亚', '克罗地亚', '爱沙尼亚', '希腊', '匈牙利', '拉脱维亚', '爱尔兰', '立陶宛', '波兰', '斯洛伐克', '斯洛文尼亚', '捷克', '丹麦', '芬兰', '瑞典', '西班牙', '意大利', '葡萄牙', '奥地利', '德国', '法国', '英国', '塞尔维亚'];
  return countryNames.filter((country) => value.includes(country));
}

function zhenyunSectionDataRows(rows: ExcelCellValue[][], headerIndex: number) {
  const result: Array<{ row: ExcelCellValue[]; rowIndex: number }> = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const first = cellToText(row[0]);
    if (!first && !row.some((cell) => Boolean(cellToText(cell)))) break;
    if (normalizeHeader(first) === '系统下单渠道' || normalizeHeader(first) === '目的地' || normalizeHeader(first) === '国家') break;
    result.push({ row, rowIndex });
  }
  return result;
}

function zhenyunColumnPriceGroup(headers: ExcelCellValue[], columnIndex: number) {
  for (let index = columnIndex; index >= 0; index -= 1) {
    const value = cellToText(headers[index]);
    if (value && value !== '系统下单渠道' && !/备注|时效/.test(value)) return value;
  }
  return undefined;
}

function findZhenyunExpressGroup(rows: ExcelCellValue[][], headerIndex: number) {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const value = rowToRemarkLine(rows[index]);
    const match = value.match(/欧洲空派普货快递专线（[^）]+）/);
    if (match) return match[0];
    if (value && !/深圳振韵|返回首页/.test(value)) break;
  }
  return undefined;
}

function splitZhenyunExpressDestinations(value: string) {
  return value.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean).flatMap((item) => {
    const destinationCountry = inferDestinationFromText(item);
    if (destinationCountry === '未标记目的地') return [];
    const range = item.replace(/[－—–~至到]/g, '-').match(/(\d{4,6}\s*-\s*\d{4,6})/);
    const postalRule = range?.[1].replace(/\s+/g, '')
      ?? (destinationCountry === '意大利' && /意大利\s*-\s*其他/.test(item) ? '其他10000-50999' : undefined);
    return [{ destinationCountry, postalRule }];
  });
}

function extractZhenyunTransitLabel(value: string | number | null | undefined) {
  const source = cellToText(value).replace(/\s+/g, ' ').trim();
  const compact = source.replace(/\s+/g, '');
  const range = compact.match(/(\d+(?:\.\d+)?\s*[-~－—至到]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)(?:自然)?(?:天|日)/);
  if (!range) return extractTransitLabelFromText(value);
  const days = `${range[1].replace(/\s+/g, '').replace(/[~－—至到]/g, '-')}天`;
  const parenthetical = compact.match(/[（(]([^（）()]+)[）)]/)?.[1];
  if (parenthetical && /开船|提取/.test(parenthetical)) return `${days}（${parenthetical}）`;
  if (/开船/.test(compact) && /提取/.test(compact)) return `${days}（开船-提取）`;
  return days;
}

function normalizePricingParserAgent(value?: string) {
  const normalized = value?.replace(/\s+/g, '').toUpperCase() ?? '';
  if (/拓普达|TPD/.test(normalized)) return '拓普达';
  if (/振韵|ZHENYUN/.test(normalized)) return '振韵';
  if (/驰汉|CCH/.test(normalized)) return '驰汉';
  return undefined;
}

function attachWorkbookLookupNotes(
  rows: ImportedPriceRow[],
  notes: Pick<ImportedPriceRow, 'productSurchargeRemark' | 'specialRemark'>
) {
  if (!notes.productSurchargeRemark && !notes.specialRemark) {
    return rows;
  }
  return rows.map((row) => ({
    ...row,
    productSurchargeRemark: mergeRemarkBlocks(row.productSurchargeRemark, notes.productSurchargeRemark),
    specialRemark: mergeRemarkBlocks(row.specialRemark, notes.specialRemark)
  }));
}

function extractWorkbookLookupNotes(workbook: SimpleWorkbook): Pick<ImportedPriceRow, 'productSurchargeRemark' | 'specialRemark'> {
  const productSurchargeRemark = extractSheetRemark(workbook, (sheetName) => sheetName.includes('产品附加'));
  const specialRemark = extractSheetRemark(workbook, (sheetName) =>
    /特别说明|尺寸|注意事项|产品加收|赔偿说明|免责声明|渠道说明|备注/.test(sheetName)
  );
  return {
    ...(productSurchargeRemark ? { productSurchargeRemark } : {}),
    ...(specialRemark ? { specialRemark } : {})
  };
}

function extractZhenyunHomepageRequirement(workbook: SimpleWorkbook) {
  return mergeRemarkBlocks(...workbook.worksheets
    .filter((sheet) => /首页/.test(sheet.name))
    .map((sheet) => extractSheetTotalRemarkFromRows(worksheetToRows(sheet), 0)));
}

function extractZhenyunSheetTotalRequirement(rows: ExcelCellValue[][]) {
  const lastPriceHeader = rows.reduce<{ index: number; tierColumnIndexes: number[] } | undefined>((latest, row, index) => {
    const hasDestination = findHeaderIndex(row, ['国家', '目的地', '国家/重量区间']) >= 0;
    const tierColumnIndexes = buildImportedTierColumns(row)
      .filter((item) => item.tier.kind === 'kg')
      .map((item) => item.columnIndex);
    return hasDestination && tierColumnIndexes.length >= 2
      ? { index, tierColumnIndexes }
      : latest;
  }, undefined);
  if (!lastPriceHeader) {
    return undefined;
  }

  // The last price section can be followed directly by unlabelled requirements
  // (for example, packaging or tail-lift rules). Start after the final row that
  // actually contains a price, rather than waiting for a known section title.
  const lastPriceRowIndex = rows.reduce((latestIndex, row, index) => {
    if (index <= lastPriceHeader.index) return latestIndex;
    return lastPriceHeader.tierColumnIndexes.some((columnIndex) => cellToNumber(row[columnIndex]) > 0)
      ? index
      : latestIndex;
  }, lastPriceHeader.index);
  return extractSheetTotalRemarkFromRows(rows, lastPriceRowIndex + 1, { collectUnlabelled: true });
}

function extractSheetRemark(workbook: SimpleWorkbook, matcher: (sheetName: string) => boolean) {
  const sheet = workbook.worksheets.find((worksheet) => matcher(worksheet.name));
  if (!sheet) {
    return undefined;
  }
  const rows = worksheetToRows(sheet);
  const lines = rows
    .map(rowToRemarkLine)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line && !/^回到目录$/.test(line) && !extractTransitLabelFromText(line, { requireKeyword: true }));
  return mergeRemarkBlocks(...lines);
}

function parseCanonicalPriceWorkbook(workbook: SimpleWorkbook): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    const sheetName = sheet.name;
    const rows = worksheetToRows(sheet);
    const sheetTransitLabel = extractSheetTransitLabel(sheet);
    const [headers, ...dataRows] = rows;
    if (!headers?.length) {
      return [];
    }

    const agentIndex = findHeaderIndex(headers, ['代理', '代理名称', 'agent']);
    const channelIndex = findHeaderIndex(headers, ['渠道', '渠道名称', 'channel']);
    const carrierIndex = findHeaderIndex(headers, ['承运商', '承运商大类', 'carrier']);
    const businessRouteIndex = findHeaderIndex(headers, ['承运路线', '内部路线', '业务路线', 'businessRoute', 'route']);
    const realChannelIndex = findHeaderIndex(headers, ['渠道报价表', '真实渠道', '报价渠道', '代理渠道', 'agentChannelName', 'realChannelName']);
    const countryIndex = findHeaderIndex(headers, ['目的地', '目的国', '国家', 'destination']);
    const postalRuleIndex = findHeaderIndex(headers, ['邮编规则', '邮编范围', 'ZIP', 'Zip Code', 'Postal Code', '分区']);
    const minWeightIndex = findHeaderIndex(headers, ['最小重量', '起始重量', 'minWeight', 'min']);
    const maxWeightIndex = findHeaderIndex(headers, ['最大重量', '结束重量', 'maxWeight', 'max']);
    const costIndex = findHeaderIndex(headers, ['成本单价', '代理成本价', '成本价', '单价', 'cost']);
    const currencyIndex = findHeaderIndex(headers, ['币种', 'currency']);
    const warehouseIndex = findHeaderIndex(headers, ['仓库编码', '亚马逊代码', 'FBA仓库代码', 'warehouse']);
    const originIndex = findHeaderIndex(headers, ['出货仓', '起运仓', '发货仓', '发货地', '起运地', '来源地', '仓库区域', '揽收区域', '报价组']);
    const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '全程时效', '派送时效', '船期', '时效', '运输时效', 'transit']);
    const productRemarkColumnIndexes = getNamedRemarkColumnIndexes(headers, [], [transitIndex], /产品附加|产品说明|磁检产品|附加费/);
    const specialRemarkColumnIndexes = getNamedRemarkColumnIndexes(headers, [], [transitIndex, ...productRemarkColumnIndexes], /备注|渠道要求|要求|说明|尺寸|限制|注意|须知|拒收|超标准/);

    if (agentIndex < 0 || channelIndex < 0 || countryIndex < 0 || minWeightIndex < 0 || maxWeightIndex < 0 || costIndex < 0) {
      return [];
    }
    const sheetTotalRemark = extractTrailingPriceSectionRequirement(rows, 0, [costIndex]);

    return dataRows
      .flatMap((row, index) => {
        const transitLabel = transitIndex >= 0
          ? extractTransitLabelFromText(row[transitIndex]) ?? sheetTransitLabel
          : sheetTransitLabel;
        const warehouseCodes = warehouseIndex >= 0 ? splitImportedWarehouseCodes(cellToText(row[warehouseIndex])) : [];
        const warehouseValues = warehouseCodes.length ? warehouseCodes : [undefined];
        return warehouseValues.map((warehouseCode) => ({
          id: `import-price-${Date.now()}-${sheetName}-${index}-${warehouseCode ?? 'general'}`,
          agentName: cellToText(row[agentIndex]),
          sourceSheetName: normalizeAmazonOriginWarehouseName(originIndex >= 0 ? row[originIndex] : undefined) ?? normalizeAmazonOriginWarehouseName(sheetName) ?? (sheetName.trim() ? sheetName.trim() : sheetName),
          channelName: cellToText(row[channelIndex]),
          carrierName: carrierIndex >= 0 ? cellToText(row[carrierIndex]) || undefined : undefined,
          businessRouteName: businessRouteIndex >= 0 ? cellToText(row[businessRouteIndex]) || undefined : undefined,
          realChannelName: realChannelIndex >= 0 ? cellToText(row[realChannelIndex]) || undefined : cellToText(row[channelIndex]),
          warehouseCode,
          destinationCountry: cellToText(row[countryIndex]),
          postalRule: postalRuleIndex >= 0 ? cellToText(row[postalRuleIndex]) || undefined : undefined,
          minWeightKg: cellToNumber(row[minWeightIndex]),
          maxWeightKg: cellToNumber(row[maxWeightIndex]),
          costPerKg: cellToNumber(row[costIndex]),
          currency: currencyIndex >= 0 ? cellToText(row[currencyIndex]) || 'RMB' : 'RMB',
          transitDays: parseTransitDays(transitLabel),
          transitLabel,
          productSurchargeRemark: extractRemarkFromColumns(row, productRemarkColumnIndexes),
          specialRemark: mergeRemarkBlocks(
            extractRemarkFromColumns(row, specialRemarkColumnIndexes),
            sheetTotalRemark
          )
        }));
      })
      .filter((row) => row.agentName && row.channelName && row.destinationCountry && row.maxWeightKg > row.minWeightKg && row.costPerKg > 0);
  });
}

/**
 * Parses supplier sheets that explicitly separate a country region, warehouse
 * region and order channel. TPD Canada workbooks use this layout throughout:
 * the large heading is the business group, the row above the headers carries
 * the route title and order-channel code, while the first column is a region
 * such as "加拿大东部" rather than the country itself.
 */
function parseRegionalWarehouseTierPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    const rows = worksheetToRows(sheet);
    const headerIndexes = rows.flatMap((headers, index) => {
      const countryRegionIndex = findHeaderIndex(headers, ['国家分区']);
      const warehouseRegionIndex = findHeaderIndex(headers, ['仓库分区']);
      const tierColumns = headers
        .map((header, columnIndex) => ({ columnIndex, tier: getImportedPriceTier(header) }))
        .filter((item): item is { columnIndex: number; tier: ImportedAmazonPriceTier } => Boolean(item.tier));
      return countryRegionIndex >= 0 && warehouseRegionIndex >= 0 && tierColumns.length >= 2
        ? [{ index, countryRegionIndex, warehouseRegionIndex, tierColumns }]
        : [];
    });
    if (!headerIndexes.length) return [];

    const sheetTotalRemark = extractHorizontalSheetTotalRemark(rows);
    return headerIndexes.flatMap(({ index: headerIndex, countryRegionIndex, warehouseRegionIndex, tierColumns }) => {
      const routeHeader = findRegionalWarehouseRouteHeader(rows, headerIndex);
      if (!routeHeader) return [];
      const routeGroup = findRegionalWarehouseRouteGroup(rows, headerIndex) ?? sheet.name;
      const displayRoute = routeGroup === routeHeader.title
        ? routeHeader.title
        : `${routeGroup}-${routeHeader.title}`;
      const transitIndex = findLooseHeaderIndex(rows[headerIndex], ['参考时效', '全程时效', '派送时效', '船期', '时效']);
      const sectionRemark = mergeRemarkBlocks(
        extractHorizontalSectionRemark(rows, headerIndex, tierColumns.map((item) => item.columnIndex)),
        sheetTotalRemark
      );
      const sectionTransitLabel = extractTransitLabelFromRemark(sectionRemark);
      let inheritedDestination = '';
      let inheritedTransitLabel: string | undefined;

      return getHorizontalDataRows(rows, headerIndex).flatMap((row, rowIndex) => {
        const destinationCell = cellToText(row[countryRegionIndex]);
        if (destinationCell) inheritedDestination = destinationCell;
        const destinationCountry = destinationCell || inheritedDestination;
        // Invalid fragments are retained as non-matchable sentinel rows so
        // import health can point back to the original price group instead of
        // silently discarding a malformed warehouse rule.
        const warehouseCodes = splitImportedWarehouseCodes(cellToText(row[warehouseRegionIndex]));
        const rowTransitLabel = transitIndex >= 0
          ? extractTransitLabelFromText(row[transitIndex])
          : undefined;
        if (rowTransitLabel) inheritedTransitLabel = rowTransitLabel;
        const transitLabel = rowTransitLabel ?? inheritedTransitLabel ?? sectionTransitLabel;
        if (!destinationCountry || !warehouseCodes.length) return [];

        return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
          const unitPrice = cellToNumber(row[columnIndex]);
          if (unitPrice <= 0) return [];
          const nextTier = tierColumns[tierIndex + 1]?.tier;
          const maxWeightKg = tier.kind === 'kg' && tier.maxWeightKg >= 99999 && nextTier?.kind === 'kg' && nextTier.minWeightKg > tier.minWeightKg
            ? nextTier.minWeightKg - 0.001
            : tier.maxWeightKg;
          return warehouseCodes.map((warehouseCode) => ({
            id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowIndex}-${columnIndex}-${warehouseCode}`,
            agentName: agentShortName?.trim() || inferAgentNameFromText(sourceName ?? '') || inferAgentNameFromText(sheet.name) || '未知代理',
            sourceSheetName: sheet.name,
            carrierName: inferPriceCarrierName({ channelName: displayRoute }),
            channelName: displayRoute,
            realChannelName: displayRoute,
            businessRouteName: routeHeader.orderChannel ?? routeHeader.title,
            warehouseCode,
            destinationCountry,
            minWeightKg: tier.minWeightKg,
            maxWeightKg,
            costPerKg: unitPrice,
            ...(tier.kind === 'cbm' ? { cbmPrice: unitPrice } : {}),
            priceTierLabel: tier.label,
            currency: 'RMB',
            transitDays: parseTransitDays(transitLabel),
            transitLabel,
            ...(sectionRemark ? { specialRemark: sectionRemark } : {})
          }));
        });
      });
    });
  });
}

/**
 * Parses Topuda's US air/sea sheets. They use a section title as the route,
 * followed by `区域/重量` and source ZIP ranges such as
 * `美西（邮编80000-99999）`. The ZIP range is stored as a machine-readable
 * postal rule; the lookup service then rejects every ZIP outside that range.
 */
function parseTopudaUsAirSeaPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  const regionalRows = workbook.worksheets.flatMap((sheet) => {
    const rows = worksheetToRows(sheet);
    const routeGroup = normalizeTopudaUsRouteGroup(sheet.name, rows);
    if (!routeGroup) return [];

    return rows.flatMap((headers, headerIndex) => {
      const regionIndex = findHeaderIndex(headers, ['区域/重量', '区域重量']);
      const tierColumns = buildImportedTierColumns(headers).filter((item) => item.tier.kind === 'kg');
      if (regionIndex < 0 || tierColumns.length < 2) return [];

      const sectionTitle = findTopudaUsSectionTitle(rows, headerIndex);
      if (!sectionTitle) return [];
      const channelName = `${routeGroup}-${sectionTitle}`;
      const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '全程时效', '派送时效', '船期', '时效']);
      const tierColumnIndexes = tierColumns.map((item) => item.columnIndex);
      const specialRemarkColumnIndexes = getNamedRemarkColumnIndexes(
        headers,
        [],
        [transitIndex, ...tierColumnIndexes],
        /渠道说明|限时赔付|备注|渠道要求|要求|说明|尺寸|限制|注意|须知|拒收|查验/
      );
      const sectionRemark = extractTopudaUsSectionRemark(rows, headerIndex, tierColumnIndexes);
      let inheritedRegion = '';
      let inheritedTransitLabel: string | undefined;

      return topudaUsDataRows(rows, headerIndex).flatMap(({ row, rowIndex }) => {
        const regionCell = cellToText(row[regionIndex]);
        if (regionCell) inheritedRegion = regionCell;
        const sourcePostalRule = extractTopudaUsPostalRuleCandidate(regionCell || inheritedRegion);
        if (!sourcePostalRule) return [];
        // Keep an invalid original expression in the administrative data
        // health trail. `matchUsPostalRule` cannot match it, so it never
        // leaks into a business quote.
        const postalRule = sourcePostalRule;

        const rowTransitLabel = transitIndex >= 0 ? extractTransitLabelFromText(row[transitIndex]) : undefined;
        if (rowTransitLabel) inheritedTransitLabel = rowTransitLabel;
        const transitLabel = rowTransitLabel ?? inheritedTransitLabel ?? extractTransitLabelFromRemark(sectionRemark);
        const specialRemark = mergeRemarkBlocks(
          extractRemarkFromColumns(row, specialRemarkColumnIndexes),
          sectionRemark
        );

        return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
          const costPerKg = cellToNumber(row[columnIndex]);
          if (costPerKg <= 0) return [];
          const nextTier = tierColumns[tierIndex + 1]?.tier;
          const maxWeightKg = tier.maxWeightKg >= 99999 && nextTier && nextTier.minWeightKg > tier.minWeightKg
            ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
            : tier.maxWeightKg;
          return [{
            id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowIndex}-${columnIndex}`,
            agentName: agentShortName?.trim() || inferImportedAmazonAgentName(sourceName ?? sheet.name),
            sourceSheetName: sheet.name,
            carrierName: inferPriceCarrierName({ channelName }),
            channelName,
            realChannelName: channelName,
            businessRouteName: sectionTitle,
            destinationCountry: '美国',
            postalRule,
            minWeightKg: tier.minWeightKg,
            maxWeightKg,
            costPerKg,
            priceTierLabel: tier.label,
            currency: 'RMB',
            transitDays: parseTransitDays(transitLabel),
            transitLabel,
            ...(specialRemark ? { specialRemark } : {})
          }];
        });
      });
    });
  });
  const detailedSeaRows = parseTopudaUsSeaParallelPostalWorkbooks(workbook, sourceName, agentShortName);
  const detailedSeaRoutes = new Set(detailedSeaRows.map((row) => row.businessRouteName));
  return [
    ...regionalRows,
    ...detailedSeaRows,
    // A summary row is a safe fallback for channels that have no detailed
    // postal block. When both exist, the detailed block wins because it can
    // carry a stricter source tier (for example 25KG+ for oversized cargo)
    // and the channel's acceptance requirements.
    ...parseTopudaUsSeaCourierSummaryWorkbook(workbook, sourceName, agentShortName)
      .filter((row) => !detailedSeaRoutes.has(row.businessRouteName))
  ];
}

function parseTopudaUsSeaParallelPostalWorkbooks(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    if (!/美国.*(?:海派|快递)|中超大件海派/i.test(sheet.name)) return [];
    const rows = worksheetToRows(sheet);
    const sheetColumnCount = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
    return rows.flatMap((titleRow, titleIndex) => {
      const titleColumns = titleRow
        .map((value, columnIndex) => ({ columnIndex, title: cleanTopudaUsSeaRouteTitle(cellToText(value)) }))
        .filter((item): item is { columnIndex: number; title: string } => Boolean(item.title));
      return titleColumns.flatMap(({ columnIndex: zoneIndex, title }, titlePosition) => {
        const nextTitleColumn = titleColumns[titlePosition + 1]?.columnIndex ?? sheetColumnCount;
        const headers = rows[titleIndex + 1] ?? [];
        const ownZoneHeader = /邮编|美国分区/.test(cellToText(headers[zoneIndex]).replace(/\s+/g, ''));
        // Right-hand tables often reuse the left table's ZIP column instead
        // of repeating it. Their title starts at the first price column, so
        // locate the shared ZIP column and keep the rate block independent.
        const postalZoneIndex = ownZoneHeader
          ? zoneIndex
          : findTopudaUsSharedPostalColumn(headers, zoneIndex);
        const priceStartColumn = ownZoneHeader ? zoneIndex + 1 : zoneIndex;
        const tierColumns = Array.from({ length: Math.max(0, nextTitleColumn - priceStartColumn) }, (_, offset) => {
          const columnIndex = priceStartColumn + offset;
          return { columnIndex, tier: getImportedPriceTier(headers[columnIndex]) };
        }).filter((item): item is { columnIndex: number; tier: ImportedAmazonPriceTier } => Boolean(item.tier && item.tier.kind === 'kg'));
        if (postalZoneIndex < 0 || tierColumns.length < 2) return [];

        const dataRows = topudaUsSeaBlockDataRows(rows, titleIndex + 1, postalZoneIndex, nextTitleColumn, tierColumns.map((item) => item.columnIndex));
        if (!dataRows.length) return [];
        const sectionRemark = mergeRemarkBlocks(...dataRows.flatMap(({ row }) =>
          row.slice(priceStartColumn, nextTitleColumn)
            .filter((_, columnOffset) => !tierColumns.some((item) => item.columnIndex === priceStartColumn + columnOffset))
            .map(cellToRemarkLine)
        ));
        const transitLabel = extractTransitLabelFromRemark(sectionRemark);
        const channelName = `美国海运专线-${title}`;

        return dataRows.flatMap(({ row, rowIndex }) => {
          const postalRule = extractTopudaUsPostalRuleCandidate(cellToText(row[postalZoneIndex]));
          if (!postalRule) return [];
          return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
            const costPerKg = cellToNumber(row[columnIndex]);
            if (costPerKg <= 0) return [];
            const nextTier = tierColumns[tierIndex + 1]?.tier;
            const maxWeightKg = tier.maxWeightKg >= 99999 && nextTier && nextTier.minWeightKg > tier.minWeightKg
              ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
              : tier.maxWeightKg;
            return [{
              id: `import-price-${Date.now()}-${sheet.name}-${rowIndex}-${columnIndex}`,
              agentName: agentShortName?.trim() || inferImportedAmazonAgentName(sourceName ?? sheet.name),
              sourceSheetName: sheet.name,
              carrierName: inferPriceCarrierName({ channelName }),
              channelName,
              realChannelName: title,
              businessRouteName: title,
              destinationCountry: '美国',
              postalRule,
              minWeightKg: tier.minWeightKg,
              maxWeightKg,
              costPerKg,
              priceTierLabel: tier.label,
              currency: 'RMB',
              transitDays: parseTransitDays(transitLabel),
              transitLabel,
              ...(sectionRemark ? { specialRemark: sectionRemark } : {})
            }];
          });
        });
      });
    });
  });
}

function findTopudaUsSharedPostalColumn(headers: Array<string | number | null>, beforeColumn: number) {
  for (let columnIndex = beforeColumn - 1; columnIndex >= 0; columnIndex -= 1) {
    if (/邮编|美国分区/.test(cellToText(headers[columnIndex]).replace(/\s+/g, ''))) return columnIndex;
  }
  return -1;
}

function cleanTopudaUsSeaRouteTitle(value: string) {
  const title = value.replace(/\s+/g, ' ').trim();
  if (title.length > 120 || /下单渠道|渠道说明|参考时效|赔付/.test(title)) return undefined;
  return /^TPD[-－—]/i.test(title) && /(快递派|海派|专线)/.test(title) ? title : undefined;
}

function topudaUsSeaBlockDataRows(
  rows: Array<Array<string | number | null>>,
  headerIndex: number,
  zoneIndex: number,
  nextTitleColumn: number,
  tierColumnIndexes: number[]
) {
  const result: Array<{ row: Array<string | number | null>; rowIndex: number }> = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const zone = cellToText(row[zoneIndex]);
    const hasTierPrice = tierColumnIndexes.some((columnIndex) => cellToNumber(row[columnIndex]) > 0);
    if (!zone && !hasTierPrice) continue;
    if (/^(?:邮编|美国分区)/.test(zone.replace(/\s+/g, '')) || (cleanTopudaUsSeaRouteTitle(zone) && !hasTierPrice)) break;
    if (!zone || !hasTierPrice) continue;
    result.push({ row: row.slice(0, nextTitleColumn), rowIndex });
  }
  return result;
}

/**
 * `RS6-RS8美国海派包税专线` and the other Topuda US sea tabs contain several
 * side-by-side rate blocks. Their stable import source is the accompanying
 * courier summary, whose rows have one route and one ZIP interval each. Read
 * that summary instead of guessing the boundaries of visually merged blocks.
 */
function parseTopudaUsSeaCourierSummaryWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  const sheet = workbook.worksheets.find((item) => normalizeHeader(item.name) === '快递渠道汇总表');
  if (!sheet) return [];
  const rows = worksheetToRows(sheet);
  const headerIndex = rows.findIndex((headers) =>
    findHeaderIndex(headers, ['渠道', '渠道名称', '下单渠道', '对应渠道']) >= 0
    && findHeaderIndex(headers, ['分区名', '分区', '邮编范围', '邮编规则', '邮编', 'ZIP']) >= 0
    && buildImportedTierColumns(headers).filter((item) => item.tier.kind === 'kg').length >= 2
  );
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex];
  const channelIndex = findHeaderIndex(headers, ['渠道', '渠道名称', '下单渠道', '对应渠道']);
  const postalRuleIndex = findHeaderIndex(headers, ['分区名', '分区', '邮编范围', '邮编规则', '邮编', 'ZIP']);
  const startPostalIndex = findHeaderIndex(headers, ['起始ZIP', '起始邮编', '开始ZIP', '开始邮编']);
  const endPostalIndex = findHeaderIndex(headers, ['结束ZIP', '结束邮编', '终止ZIP', '终止邮编']);
  const tierColumns = buildImportedTierColumns(headers).filter((item) => item.tier.kind === 'kg');
  let inheritedChannelName = '';

  return rows.slice(headerIndex + 1).flatMap((row, rowIndex) => {
    const sourceChannelName = cellToText(row[channelIndex]);
    if (sourceChannelName) inheritedChannelName = normalizeImportedChannelName(sourceChannelName);
    const businessRouteName = inheritedChannelName;
    const postalRule = normalizeTopudaUsSummaryPostalRule(
      cellToText(row[postalRuleIndex]),
      row[startPostalIndex],
      row[endPostalIndex]
    );
    if (!businessRouteName || !postalRule) return [];
    const channelName = `美国海运专线-${businessRouteName}`;

    return tierColumns.flatMap(({ columnIndex, tier }, tierIndex) => {
      const costPerKg = cellToNumber(row[columnIndex]);
      if (costPerKg <= 0) return [];
      const nextTier = tierColumns[tierIndex + 1]?.tier;
      const maxWeightKg = tier.maxWeightKg >= 99999 && nextTier && nextTier.minWeightKg > tier.minWeightKg
        ? Number((nextTier.minWeightKg - 0.001).toFixed(3))
        : tier.maxWeightKg;
      return [{
        id: `import-price-${Date.now()}-${sheet.name}-${rowIndex}-${columnIndex}`,
        agentName: agentShortName?.trim() || inferImportedAmazonAgentName(sourceName ?? sheet.name),
        sourceSheetName: sheet.name,
        carrierName: inferPriceCarrierName({ channelName }),
        channelName,
        realChannelName: businessRouteName,
        businessRouteName,
        destinationCountry: '美国',
        postalRule,
        minWeightKg: tier.minWeightKg,
        maxWeightKg,
        costPerKg,
        priceTierLabel: tier.label,
        currency: 'RMB'
      }];
    });
  });
}

function normalizeTopudaUsSummaryPostalRule(
  value: string,
  startValue: string | number | null | undefined,
  endValue: string | number | null | undefined
) {
  const fromLabel = extractTopudaUsPostalRuleCandidate(value);
  if (fromLabel && /\d/.test(fromLabel)) return fromLabel;
  const start = Number(startValue);
  const end = Number(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end > 99999) return undefined;
  return `${String(Math.trunc(start)).padStart(5, '0')}-${String(Math.trunc(end)).padStart(5, '0')}`;
}

function normalizeTopudaUsRouteGroup(sheetName: string, rows: Array<Array<string | number | null>>) {
  const candidates = [sheetName, ...rows.slice(0, 12).map(rowToRemarkLine)];
  const source = candidates.find((value) => /美国(?:空运|海运|空海运).*(?:价格表|专线)/.test(value));
  if (!source) return undefined;
  if (/美国空运/.test(source)) return '美国空运专线';
  if (/美国海运/.test(source)) return '美国海运专线';
  return '美国空海运专线';
}

function findTopudaUsSectionTitle(rows: Array<Array<string | number | null>>, headerIndex: number) {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const text = rowToRemarkLine(rows[index]);
    if (/区域\s*\/\s*重量/.test(text)) break;
    if (/美国.*(?:空派|海派|海卡|专线|限时达)/.test(text) && !/价格表/.test(text)) {
      return text
        .replace(/^.*?(美国.*(?:空派|海派|海卡|专线|限时达).*)$/, '$1')
        // The source places unrelated merged-cell flags such as "分泡50%"
        // beside the route title. They are a pricing condition, not a route.
        .replace(/\s*\/\s*分泡\s*\d+%.*$/i, '')
        .trim();
    }
  }
  return undefined;
}

function topudaUsDataRows(rows: Array<Array<string | number | null>>, headerIndex: number) {
  const result: Array<{ row: Array<string | number | null>; rowIndex: number }> = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const firstCell = cellToText(row[0]);
    if (normalizeHeader(firstCell) === '区域/重量' || normalizeHeader(firstCell) === '区域重量') break;
    if (/美国.*(?:空派|海派|海卡|专线|限时达)/.test(firstCell) && !/邮编/.test(firstCell)) break;
    result.push({ row, rowIndex });
  }
  return result;
}

function extractTopudaUsPostalRuleCandidate(value: string) {
  const normalized = value.replace(/[－—–~至]/g, '-').replace(/\s+/g, '');
  const postalExpression = normalized
    .replace(/[（(]邮编(?:开头|段)?[）)]/g, ',')
    .replace(/邮编(?:开头|段)?/g, ',')
    .replace(/,+/g, ',')
    .replace(/^,|,$/g, '');
  const fullRange = postalExpression.match(/([0-9]{5}-[0-9]{5})/);
  if (fullRange) return fullRange[1];
  const shortExpression = postalExpression.match(/([0-9]{1,4}(?:[-、][0-9]{1,4})+(?:[,，/][0-9]{1,4}(?:[-、][0-9]{1,4})+)*)/);
  if (shortExpression) return shortExpression[1];
  const singlePostalPrefix = postalExpression.match(/^(\d{1,4})$/);
  if (singlePostalPrefix && /邮编/.test(normalized)) return `${singlePostalPrefix[1]}-${singlePostalPrefix[1]}`;
  // A recognized regional table row with an unparseable zone must remain in
  // health diagnostics rather than quietly becoming an all-US quote.
  return normalized || undefined;
}

function extractTopudaUsSectionRemark(
  rows: Array<Array<string | number | null>>,
  headerIndex: number,
  tierColumnIndexes: number[]
) {
  const headers = rows[headerIndex] ?? [];
  const remarkIndexes = getNamedRemarkColumnIndexes(headers, [], tierColumnIndexes, /渠道说明|限时赔付|备注|渠道要求|要求|说明|赔付/);
  const namedRemark = Array.from(new Set(topudaUsDataRows(rows, headerIndex)
    .flatMap(({ row }) => (extractRemarkFromColumns(row, remarkIndexes) ?? '').split('\n'))
    .map((value) => value.trim())
    .filter(Boolean)))
    .join('\n') || undefined;
  return mergeRemarkBlocks(
    namedRemark,
    extractTrailingPriceSectionRequirement(rows, headerIndex, tierColumnIndexes)
  );
}

function findRegionalWarehouseRouteHeader(rows: Array<Array<string | number | null>>, headerIndex: number) {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const text = rowToRemarkLine(rows[index]);
    const match = text.match(/^(.+?)\s*下单渠道\s*[:：]\s*(.+)$/);
    if (match) {
      return { title: match[1].trim(), orderChannel: match[2].trim() };
    }
  }
  return undefined;
}

function findRegionalWarehouseRouteGroup(rows: Array<Array<string | number | null>>, headerIndex: number) {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const text = rowToRemarkLine(rows[index]);
    if (/下单渠道/.test(text)) continue;
    const match = text.match(/TPD[-－—]加拿大[^（(\n]*?(?:经济线|快线|限时达|专线)/i);
    if (match) return match[0].trim();
  }
  return undefined;
}

/**
 * Topuda's US FBA sea rates are spread across a set of small route tabs
 * (M8/M7, S4, Z4, M4, Q8, X6, Z6, S9/AMG, etc.).  They are not a single
 * worksheet: scan every tab with a FBA-destination header and parse every
 * horizontal route block on that tab.
 */
function parseTopudaUsWarehouseDetailPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  agentShortName?: string
): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    if (!isTopudaUsWarehouseDetailSheet(sheet)) return [];
    const rows = worksheetToRows(sheet);
    const agentName = agentShortName?.trim() || inferImportedAmazonAgentName(sourceName ?? sheet.name);
    const sheetTransitLabel = extractSheetTransitLabel(sheet);

    return rows.flatMap((headers, headerIndex) => {
      const destinationColumns = headers
        .map((header, columnIndex) => ({ columnIndex, header: normalizeHeader(cellToText(header)) }))
        .filter((item) => /(?:亚马逊)?fba(?:代码|仓库)?|亚马逊代码|目的地/.test(item.header));
      const allTierColumns = buildImportedTierColumns(headers, rows[headerIndex + 1] ?? [])
        .filter(({ columnIndex }) => isTopudaWarehouseRateHeader(headers[columnIndex]));
      const hasExplicitRateHeader = headers.some(isTopudaWarehouseRateHeader);
      if (!destinationColumns.length || !allTierColumns.length || !hasExplicitRateHeader) return [];

      return destinationColumns.flatMap(({ columnIndex: destinationColumn }, destinationPosition) => {
        const nextDestinationColumn = destinationColumns[destinationPosition + 1]?.columnIndex ?? headers.length;
        const tierGroups = groupTopudaWarehouseDetailTierColumns(
          allTierColumns.filter(({ columnIndex }) => columnIndex > destinationColumn && columnIndex < nextDestinationColumn),
          nextDestinationColumn
        );
        if (!tierGroups.length) return [];

        const baseTitle = findTopudaWarehouseDetailTitle(rows, headerIndex, destinationColumn);
        if (!baseTitle) return [];
        return tierGroups.flatMap(({ tierColumns, nextGroupColumn }) => {
          const groupBaseTitle = findTopudaWarehouseDetailTitle(rows, headerIndex, tierColumns[0].columnIndex) ?? baseTitle;
          const blockRemark = findTopudaWarehouseDetailBlockRemark(rows, headerIndex, tierColumns, nextGroupColumn);
          const channelName = resolveTopudaWarehouseDetailChannelName(
            groupBaseTitle,
            findTopudaWarehouseDetailGroupLabel(rows[headerIndex + 1] ?? [], tierColumns[0].columnIndex, nextGroupColumn),
            extractTopudaOrderChannel(blockRemark)
          );
          const transitLabel = extractTransitLabelFromText(blockRemark) ?? sheetTransitLabel;
          const tierColumnIndexes = tierColumns.map((item) => item.columnIndex);
          const sectionRequirement = extractTrailingPriceSectionRequirement(rows, headerIndex, tierColumnIndexes);
          let inheritedWarehouseValue = '';

          return rows.slice(headerIndex + 1).flatMap((row, rowOffset) => {
            const rowWarehouseValue = cellToText(row[destinationColumn]);
            if (rowWarehouseValue) inheritedWarehouseValue = rowWarehouseValue;
            const warehouseCodes = splitImportedWarehouseCodes(rowWarehouseValue || inheritedWarehouseValue);
            if (!warehouseCodes.length) return [];

            const rowTransitLabel = findHorizontalTransitLabel(headers, row, tierColumnIndexes);
            const rowRemark = extractRemarkFromColumns(row, [
              ...getNamedRemarkColumnIndexes(headers, rows[headerIndex + 1] ?? [], tierColumnIndexes, /渠道及时效|渠道说明|备注|要求|说明|赔付/)
            ].filter((columnIndex) => columnIndex >= tierColumns[0].columnIndex && columnIndex < nextGroupColumn));
            const resolvedTransitLabel = rowTransitLabel ?? extractTransitLabelFromText(rowRemark) ?? transitLabel;

            return tierColumns.flatMap(({ columnIndex, tier }) => {
              const costPerKg = cellToNumber(row[columnIndex]);
              if (costPerKg <= 0) return [];
              return warehouseCodes.map((warehouseCode) => ({
                id: `import-price-${Date.now()}-${sheet.name}-${headerIndex}-${rowOffset}-${columnIndex}-${warehouseCode}`,
                agentName,
                sourceSheetName: sheet.name,
                carrierName: inferPriceCarrierName({ channelName }),
                channelName,
                realChannelName: channelName,
                businessRouteName: channelName,
                warehouseCode,
                destinationCountry: '美国',
                minWeightKg: tier.minWeightKg,
                maxWeightKg: tier.maxWeightKg,
                costPerKg,
                ...(tier.kind === 'cbm' ? { cbmPrice: costPerKg } : {}),
                priceTierLabel: tier.label,
                currency: 'RMB',
                transitDays: parseTransitDays(resolvedTransitLabel),
                transitLabel: resolvedTransitLabel,
                specialRemark: mergeRemarkBlocks(rowRemark, blockRemark, sectionRequirement)
              }));
            });
          });
        });
      });
    });
  });
}

function isTopudaWarehouseRateHeader(header: string | number | null | undefined) {
  const text = cellToText(header);
  return !/\r?\n/.test(text) && /(?:\d+\s*(?:kg|公斤)\s*\+?|\d+\s*\+(?:\s*[（(]?包税[）)]?)?|\d+(?:\.\d+)?\s*cbm|按方包税)/i.test(text);
}

function isTopudaUsWarehouseDetailSheet(sheet: SimpleWorksheet) {
  if (!/美国|美森|以星|海卡|洛杉矶|休斯顿|萨凡纳|芝加哥|美东|纽约/i.test(sheet.name)) return false;
  const rows = worksheetToRows(sheet);
  const hasTopudaTitle = rows.some((row) => row.some((cell) => /^TPD[-－—]/i.test(cellToText(cell).trim())));
  const hasFbaHeader = rows.some((row) => row.some((cell) => /(?:亚马逊)?FBA(?:代码|仓库)?|亚马逊代码|目的地/i.test(cellToText(cell))));
  return hasTopudaTitle && hasFbaHeader;
}

function findTopudaWarehouseDetailTitle(rows: Array<Array<string | number | null>>, headerIndex: number, destinationColumn: number) {
  for (let rowIndex = headerIndex - 1; rowIndex >= 0; rowIndex -= 1) {
    for (let columnIndex = destinationColumn; columnIndex >= 0; columnIndex -= 1) {
      const title = cleanTopudaWarehouseDetailTitle(cellToText(rows[rowIndex]?.[columnIndex]));
      if (title) return title;
    }
  }
  return undefined;
}

function cleanTopudaWarehouseDetailTitle(value: string) {
  const firstLine = value.split(/\r?\n/)[0]?.replace(/\s+/g, ' ').trim() ?? '';
  if (!/^TPD[-－—]/i.test(firstLine) || /下单渠道|返回报价总目录/.test(firstLine)) return undefined;
  return firstLine.replace(/[－—]/g, '-');
}

function findTopudaWarehouseDetailGroupLabel(
  row: Array<string | number | null>,
  startColumn: number,
  nextGroupColumn: number
) {
  for (let columnIndex = startColumn; columnIndex < nextGroupColumn; columnIndex += 1) {
    const value = cellToText(row[columnIndex]);
    if (value && !/^(?:头程|商私卡|下单渠道|参考时效|无时效)/.test(value)) return value.replace(/\s+/g, ' ').trim();
  }
  return undefined;
}

function groupTopudaWarehouseDetailTierColumns<T extends { columnIndex: number }>(tierColumns: T[], endColumn: number) {
  return tierColumns.reduce<Array<{ tierColumns: T[]; nextGroupColumn: number }>>((groups, tierColumn, index) => {
    const previous = tierColumns[index - 1];
    if (!previous || tierColumn.columnIndex - previous.columnIndex > 1) {
      groups.push({ tierColumns: [tierColumn], nextGroupColumn: endColumn });
      if (groups.length > 1) groups[groups.length - 2].nextGroupColumn = tierColumn.columnIndex;
    } else {
      groups[groups.length - 1].tierColumns.push(tierColumn);
    }
    return groups;
  }, []);
}

function findTopudaWarehouseDetailBlockRemark(
  rows: Array<Array<string | number | null>>,
  headerIndex: number,
  tierColumns: Array<{ columnIndex: number }>,
  nextDestinationColumn: number
) {
  const startColumn = Math.min(...tierColumns.map((item) => item.columnIndex));
  const endColumn = Math.max(nextDestinationColumn, startColumn + 1);
  for (let rowIndex = headerIndex + 1; rowIndex < Math.min(rows.length, headerIndex + 5); rowIndex += 1) {
    for (let columnIndex = startColumn; columnIndex < endColumn; columnIndex += 1) {
      const value = cellToText(rows[rowIndex]?.[columnIndex]);
      if (/下单渠道/.test(value)) return value;
    }
  }
  return undefined;
}

function extractTopudaOrderChannel(value: string | undefined) {
  const match = String(value ?? '').match(/下单渠道\s*[:：]\s*(TPD[-－—][^\s\r\n]+)/i);
  return match?.[1]?.replace(/[－—]/g, '-');
}

function resolveTopudaWarehouseDetailChannelName(baseTitle: string, groupLabel?: string, orderChannel?: string) {
  const baseCode = baseTitle.match(/^TPD-[^\s/]+/i)?.[0];
  if (/^TPD-M8\/M7/i.test(baseTitle) && groupLabel) {
    const inferredOrderChannel = orderChannel ?? groupLabel.match(/^(M[78])/i)?.[1]?.toUpperCase().replace(/^/, 'TPD-');
    if (inferredOrderChannel) {
      return `${inferredOrderChannel} ${groupLabel.replace(/^(?:M8|M7)/i, '').replace(/^[\s-]+/, '')}`.trim();
    }
  }
  if (/^TPD-SU7\b/i.test(baseTitle) && groupLabel && orderChannel) {
    const suffix = groupLabel.replace(/^(?:ZIM合德|ZIM|合德)[-－—]?/i, '').trim();
    const routeCode = orderChannel.replace(/卡派/g, '');
    return `${routeCode}${suffix && !routeCode.endsWith(suffix) ? ` ${suffix}` : ''} 以星/合德专线`.replace(/\s+/g, ' ').trim();
  }
  if (baseCode && orderChannel && orderChannel !== baseCode && orderChannel.startsWith(baseCode)) {
    return baseTitle.replace(baseCode, orderChannel);
  }
  return baseTitle;
}

function normalizeTopudaWarehouseRouteKey(value: string) {
  return value.toLowerCase().replace(/[\s\-－—()（）/]/g, '');
}

function parseWarehouseSummaryPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string
): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    const sheetName = sheet.name;
    const rows = worksheetToRows(sheet);
    const sheetTransitLabel = extractSheetTransitLabel(sheet);
    const sheetWarehouseCode = findSheetWarehouseCode(rows);
    const headerIndex = rows.findIndex((row, index) => {
      const channelHeaderIndex = findHeaderIndex(row, ['对应渠道', '下单渠道']);
      if (channelHeaderIndex < 0 || (findHeaderIndex(row, ['仓库编码', '仓库代码', '亚马逊代码', 'FBA仓库代码']) < 0 && !sheetWarehouseCode)) {
        return false;
      }
      const currentRowHasWeightTier = row.some((cell) => Boolean(getImportedPriceTier(cell)));
      const nextRowHasWeightTier = (rows[index + 1] ?? []).some((cell) => Boolean(getImportedPriceTier(cell)));
      return currentRowHasWeightTier || nextRowHasWeightTier;
    });
    if (headerIndex < 0) {
      return [];
    }

    const headers = rows[headerIndex];
    const secondaryHeaders = rows[headerIndex + 1] ?? [];
    const channelIndex = findHeaderIndex(headers, ['对应渠道', '下单渠道']);
    const warehouseIndex = findHeaderIndex(headers, ['仓库编码', '仓库代码', '亚马逊代码', 'FBA仓库代码']);
    const originIndex = findHeaderIndex(headers, ['出货仓', '起运仓', '发货仓', '发货地', '起运地', '来源地', '仓库区域', '揽收区域', '报价组']);
    const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '全程时效', '派送时效', '船期', '时效', '时效赔付']) >= 0
      ? findLooseHeaderIndex(headers, ['参考时效', '全程时效', '派送时效', '船期', '时效', '时效赔付'])
      : findLooseHeaderIndex(secondaryHeaders, ['参考时效', '全程时效', '派送时效', '船期', '时效', '时效赔付']);
    const tierColumns = buildImportedTierColumns(headers, secondaryHeaders);
    const tierOriginByColumn = buildTierOriginByColumn(headers, tierColumns.map((item) => item.columnIndex));
    const tierColumnIndexes = tierColumns.map((item) => item.columnIndex);
    const sheetTotalRemark = extractTrailingPriceSectionRequirement(rows, headerIndex, tierColumnIndexes);
    const productRemarkColumnIndexes = getNamedRemarkColumnIndexes(headers, secondaryHeaders, [transitIndex, ...tierColumnIndexes], /产品附加|产品说明|磁检产品|附加费/);
    const specialRemarkColumnIndexes = getNamedRemarkColumnIndexes(headers, secondaryHeaders, [transitIndex, ...tierColumnIndexes, ...productRemarkColumnIndexes], /备注|渠道要求|要求|说明|尺寸|限制|注意|须知|拒收|超标准/);

    const sheetOriginName = normalizeAmazonOriginWarehouseName(sheetName);
    const inferredAgentName = inferImportedAmazonAgentName(sourceName ?? sheetName);
    let inheritedChannelName = '';
    return rows.slice(headerIndex + 1).flatMap((row, rowIndex) => {
      const rowChannelName = cellToText(row[channelIndex]);
      if (rowChannelName) {
        inheritedChannelName = normalizeImportedChannelName(rowChannelName);
      }
      const channelName = rowChannelName ? normalizeImportedChannelName(rowChannelName) : inheritedChannelName;
      const warehouseCode = warehouseIndex >= 0 ? cellToText(row[warehouseIndex]) : sheetWarehouseCode;
      const warehouseCodes = splitImportedWarehouseCodes(warehouseCode);
      const transitLabel = transitIndex >= 0 ? extractTransitLabelFromText(row[transitIndex]) ?? sheetTransitLabel : sheetTransitLabel;
      if (!channelName || !warehouseCodes.length) {
        return [];
      }

      return tierColumns
        .flatMap(({ columnIndex, tier }) =>
          warehouseCodes.map((code) => ({
            id: `import-price-${Date.now()}-${sheetName}-${rowIndex}-${columnIndex}-${code}`,
            agentName: inferredAgentName,
            sourceSheetName: normalizeAmazonOriginWarehouseName(originIndex >= 0 ? row[originIndex] : undefined) ?? tierOriginByColumn.get(columnIndex) ?? sheetOriginName ?? (sheetName.trim() ? sheetName.trim() : sheetName),
            carrierName: inferPriceCarrierName({ channelName }),
            channelName,
            realChannelName: channelName,
            warehouseCode: code,
            destinationCountry: '美国',
            minWeightKg: tier.minWeightKg,
            maxWeightKg: tier.maxWeightKg,
            costPerKg: cellToNumber(row[columnIndex]),
            ...(tier.kind === 'cbm' ? { cbmPrice: cellToNumber(row[columnIndex]) } : {}),
            priceTierLabel: tier.label,
            currency: 'RMB',
            transitDays: parseTransitDays(transitLabel),
            transitLabel,
            productSurchargeRemark: extractRemarkFromColumns(row, productRemarkColumnIndexes),
            specialRemark: mergeRemarkBlocks(
              extractRemarkFromColumns(row, specialRemarkColumnIndexes),
              sheetTotalRemark
            )
          }))
        )
        .filter((price) => price.costPerKg > 0);
    });
  });
}

function parseUsAirSeaPriceWorkbook(workbook: SimpleWorkbook, sourceName?: string): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    const rows = worksheetToRows(sheet);
    const headerIndex = rows.findIndex((row, index) =>
      findHeaderIndex(row, ['渠道名称', '渠道', '下单渠道', '对应渠道']) >= 0
      && findHeaderIndex(row, ['分区', '区域', '邮编段', '邮编范围', '邮编规则', '邮编', 'ZIP', 'Zip Code', 'Postal Code']) >= 0
      && buildImportedTierColumns(row, rows[index + 1] ?? []).filter((item) => item.tier.kind === 'kg').length >= 2
    );
    if (headerIndex < 0) return [];

    const headers = rows[headerIndex];
    const secondaryHeaders = rows[headerIndex + 1] ?? [];
    const hasSecondaryTierHeaders = secondaryHeaders.some((cell) => Boolean(getImportedPriceTier(cell)));
    const channelIndex = findHeaderIndex(headers, ['渠道名称', '渠道', '下单渠道', '对应渠道']);
    const zoneIndex = findHeaderIndex(headers, ['分区', '区域', '邮编段', '邮编范围', '邮编规则', '邮编', 'ZIP', 'Zip Code', 'Postal Code']);
    const tierColumns = buildImportedTierColumns(headers, secondaryHeaders).filter((item) => item.tier.kind === 'kg');
    const tierColumnIndexes = tierColumns.map((item) => item.columnIndex);
    const sheetTotalRemark = extractTrailingPriceSectionRequirement(rows, headerIndex, tierColumnIndexes);
    const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '全程时效', '派送时效', '船期', '时效']);
    const specialRemarkColumnIndexes = getNamedRemarkColumnIndexes(
      headers,
      secondaryHeaders,
      [transitIndex, ...tierColumnIndexes],
      /其它相关费用|其它条款|备注|渠道要求|要求|说明|尺寸|限制|注意|须知|拒收|查验|赔付/
    );
    const sourceSheetName = headers
      .map((header) => normalizeAmazonOriginWarehouseName(header))
      .find(Boolean) ?? normalizeAmazonOriginWarehouseName(sheet.name) ?? sheet.name;
    const agentName = inferImportedAmazonAgentName(sourceName ?? sheet.name);
    let inheritedChannelName = '';
    let inheritedTransitLabel: string | undefined;

    return rows.slice(headerIndex + (hasSecondaryTierHeaders ? 2 : 1)).flatMap((row, rowIndex) => {
      const firstCell = cellToText(row[channelIndex]);
      const zone = cellToText(row[zoneIndex]);
      const zoneLikeFirstCell = /美西|美中|美东|邮编/.test(firstCell);
      if (firstCell && !zoneLikeFirstCell) {
        inheritedChannelName = normalizeImportedChannelName(firstCell);
      }
      const routeName = zoneLikeFirstCell ? inheritedChannelName : normalizeImportedChannelName(firstCell || inheritedChannelName);
      const channelName = isPaigeUsAirExpressSheet(sourceName, sheet.name)
        ? `${sheet.name.trim()} - ${routeName}`
        : routeName;
      if (!channelName || (!firstCell && !zone)) return [];

      const rowTransitLabel = findHorizontalTransitLabel(headers, row, tierColumnIndexes);
      if (rowTransitLabel) inheritedTransitLabel = rowTransitLabel;
      const transitLabel = rowTransitLabel ?? inheritedTransitLabel;
      const specialRemark = mergeRemarkBlocks(
        extractRemarkFromColumns(row, specialRemarkColumnIndexes),
        sheetTotalRemark
      );

      return tierColumns.flatMap(({ columnIndex, tier }) => {
        const costPerKg = cellToNumber(row[columnIndex]);
        if (costPerKg <= 0) return [];
        return [{
          id: `import-price-${Date.now()}-${sheet.name}-${rowIndex}-${columnIndex}`,
          agentName,
          sourceSheetName,
          carrierName: inferPriceCarrierName({ channelName }),
          channelName,
          realChannelName: channelName,
          businessRouteName: routeName,
          destinationCountry: '美国',
          postalRule: zone || (zoneLikeFirstCell ? firstCell : undefined),
          minWeightKg: tier.minWeightKg,
          maxWeightKg: tier.maxWeightKg,
          costPerKg,
          priceTierLabel: tier.label,
          currency: 'RMB',
          transitDays: parseTransitDays(transitLabel),
          transitLabel,
          specialRemark
        }];
      });
    });
  });
}

function isPaigeUsAirExpressSheet(sourceName: string | undefined, sheetName: string) {
  return /派格/.test(String(sourceName ?? '')) && /^空运快递派\s*$/.test(sheetName);
}

function parseMiddleEastAirSeaPriceWorkbook(workbook: SimpleWorkbook, sourceName?: string): ImportedPriceRow[] {
  const workbookText = `${sourceName ?? ''} ${workbook.worksheets.map((sheet) => sheet.name).join(' ')}`;
  if (!/迪拜|阿联酋|dubai|uae/i.test(workbookText)) {
    return [];
  }
  return workbook.worksheets.flatMap((sheet) => {
    if (/目录/.test(sheet.name) || !/迪拜|阿联酋|dubai|uae/i.test(sheet.name)) {
      return [];
    }
    const rows = worksheetToRows(sheet);
    const sheetTransitLabel = extractSheetTransitLabel(sheet);
    if (/空/.test(sheet.name)) {
      return parseDubaiAirSheetRows(sheet.name, rows, sourceName, sheetTransitLabel);
    }
    if (/海/.test(sheet.name)) {
      return parseDubaiSeaSheetRows(sheet.name, rows, sourceName, sheetTransitLabel);
    }
    return [];
  });
}

function parseDubaiAirSheetRows(sheetName: string, rows: ExcelCellValue[][], sourceName?: string, sheetTransitLabel?: string): ImportedPriceRow[] {
  const headerIndex = rows.findIndex((row, index) =>
    row.some((cell) => /产品类别/.test(cellToText(cell))) &&
    row.some((cell) => /区域/.test(cellToText(cell))) &&
    (rows[index + 1] ?? []).some((cell) => /16\s*-\s*99|100\s*-\s*499|首\s*0\.?5|续\s*0\.?5/.test(cellToText(cell)))
  );
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex];
  const secondaryHeaders = rows[headerIndex + 1] ?? [];
  const categoryIndex = findHeaderIndex(headers, ['产品类别']);
  const regionIndex = findHeaderIndex(headers, ['区域']);
  if (categoryIndex < 0 || regionIndex < 0) return [];
  const tierColumns = secondaryHeaders
    .map((cell, columnIndex) => ({ columnIndex, tier: parseDubaiAirWeightTier(cellToText(cell)) }))
    .filter((item): item is { columnIndex: number; tier: { label: string; minWeightKg: number; maxWeightKg: number } } => Boolean(item.tier));
  if (!tierColumns.length) return [];
  const tierColumnIndexes = tierColumns.map((item) => item.columnIndex);
  const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '时效', '运输时效']);
  const inboundIndex = findLooseHeaderIndex(headers, ['进仓地', '入仓地', '入仓要求', '附加费']);
  const channelCodeIndex = findLooseHeaderIndex(headers, ['渠道代码', '通道代码']);
  const specialRemarkColumnIndexes = getNamedRemarkColumnIndexes(headers, secondaryHeaders, [transitIndex, inboundIndex, channelCodeIndex, ...tierColumnIndexes], /备注|注意事项|渠道要求|要求|说明|限制|须知|拒收/);
  const agentName = inferAgentNameFromText(sourceName ?? '') ?? inferAgentNameFromText(sheetName) ?? '未知代理';
  let currentCategory = '';
  let currentChannelCode = '';
  return rows.slice(headerIndex + 2).flatMap((row, rowOffset) => {
    const rowCategory = cellToText(row[categoryIndex]);
    const rowChannelCode = channelCodeIndex >= 0 ? cellToText(row[channelCodeIndex]) : '';
    if (rowCategory) {
      currentCategory = rowCategory;
      currentChannelCode = rowChannelCode;
    } else if (rowChannelCode) {
      currentChannelCode = rowChannelCode;
    }
    const category = rowCategory || currentCategory;
    const region = cellToText(row[regionIndex]);
    if (!category || !region) return [];
    return tierColumns.flatMap(({ columnIndex, tier }) => {
      const costPerKg = cellToNumber(row[columnIndex]);
      if (costPerKg <= 0) return [];
      const channelName = `${sheetName} ${category} ${region}`.replace(/\s+/g, ' ').trim();
      const transitLabel = transitIndex >= 0 ? (cellToText(row[transitIndex]) || sheetTransitLabel) : sheetTransitLabel;
      return [{
        id: `import-price-${Date.now()}-${sheetName}-${rowOffset}-${columnIndex}`,
        agentName,
        sourceSheetName: sheetName,
        carrierName: inferPriceCarrierName({ channelName }),
        channelName,
        realChannelName: channelName,
        destinationCountry: '迪拜',
        minWeightKg: tier.minWeightKg,
        maxWeightKg: tier.maxWeightKg,
        costPerKg,
        priceTierLabel: tier.label,
        currency: 'RMB',
        transitDays: parseTransitDays(transitLabel),
        transitLabel,
        productCategory: category,
        region,
        inboundRequirement: inboundIndex >= 0 ? cellToText(row[inboundIndex]) || undefined : undefined,
        channelCode: currentChannelCode || undefined,
        specialRemark: extractRemarkFromColumns(row, specialRemarkColumnIndexes)
      }];
    });
  });
}

function parseDubaiSeaSheetRows(sheetName: string, rows: ExcelCellValue[][], sourceName?: string, sheetTransitLabel?: string): ImportedPriceRow[] {
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => /服务内容/.test(cellToText(cell))) &&
    row.some((cell) => /CBM|方/.test(cellToText(cell)))
  );
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex];
  const serviceIndex = findHeaderIndex(headers, ['服务内容']);
  if (serviceIndex < 0) return [];
  const tierColumns = headers
    .map((cell, columnIndex) => ({ columnIndex, tier: parseDubaiSeaCbmTier(cellToText(cell)) }))
    .filter((item): item is { columnIndex: number; tier: { label: string } } => Boolean(item.tier));
  if (!tierColumns.length) return [];
  const tierColumnIndexes = tierColumns.map((item) => item.columnIndex);
  const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '时效', '运输时效']);
  const inboundIndex = findLooseHeaderIndex(headers, ['进仓地', '入仓地', '入仓要求', '附加费']);
  const channelCodeIndex = findLooseHeaderIndex(headers, ['渠道代码', '通道代码']);
  const specialRemarkColumnIndexes = getNamedRemarkColumnIndexes(headers, [], [transitIndex, inboundIndex, channelCodeIndex, ...tierColumnIndexes], /备注|注意事项|渠道要求|要求|说明|限制|须知|拒收/);
  const agentName = inferAgentNameFromText(sourceName ?? '') ?? inferAgentNameFromText(sheetName) ?? '未知代理';
  let currentServiceName = '';
  let currentChannelCode = '';
  return rows.slice(headerIndex + 1).flatMap((row, rowOffset) => {
    const rowServiceName = cellToText(row[serviceIndex]);
    const rowChannelCode = channelCodeIndex >= 0 ? cellToText(row[channelCodeIndex]) : '';
    if (rowServiceName) {
      currentServiceName = rowServiceName;
      currentChannelCode = rowChannelCode;
    } else if (rowChannelCode) {
      currentChannelCode = rowChannelCode;
    }
    const serviceName = rowServiceName || currentServiceName;
    if (!serviceName) return [];
    return tierColumns.flatMap(({ columnIndex, tier }) => {
      const cbmPrice = cellToNumber(row[columnIndex]);
      if (cbmPrice <= 0) return [];
      const channelName = `${sheetName} ${serviceName}`.replace(/\s+/g, ' ').trim();
      const transitLabel = transitIndex >= 0 ? (cellToText(row[transitIndex]) || sheetTransitLabel) : sheetTransitLabel;
      return [{
        id: `import-price-${Date.now()}-${sheetName}-${rowOffset}-${columnIndex}`,
        agentName,
        sourceSheetName: sheetName,
        carrierName: inferPriceCarrierName({ channelName }),
        channelName,
        realChannelName: channelName,
        destinationCountry: '迪拜',
        minWeightKg: 0,
        maxWeightKg: 99999,
        costPerKg: cbmPrice,
        cbmPrice,
        priceTierLabel: tier.label,
        currency: 'RMB',
        transitDays: parseTransitDays(transitLabel),
        transitLabel,
        serviceContent: serviceName,
        inboundRequirement: inboundIndex >= 0 ? cellToText(row[inboundIndex]) || undefined : undefined,
        channelCode: currentChannelCode || undefined,
        specialRemark: extractRemarkFromColumns(row, specialRemarkColumnIndexes)
      }];
    });
  });
}

function parseDubaiAirWeightTier(text: string) {
  const normalized = text.replace(/\s+/g, '');
  if (/首0?\.?5/.test(normalized)) return { label: '首0.5KG', minWeightKg: 0, maxWeightKg: 0.5 };
  if (/续0?\.?5/.test(normalized)) return { label: '续0.5KG', minWeightKg: 0.501, maxWeightKg: 15.999 };
  const range = normalized.match(/(\d+(?:\.\d+)?)\s*[-~－—]\s*(\d+(?:\.\d+)?)/);
  if (range) return { label: `${range[1]}-${range[2]}KG`, minWeightKg: Number(range[1]), maxWeightKg: Number(range[2]) };
  const above = normalized.match(/(\d+(?:\.\d+)?)\s*(?:以上|\+)/);
  if (above) return { label: `${above[1]}KG+`, minWeightKg: Number(above[1]), maxWeightKg: 99999 };
  return undefined;
}

function parseDubaiSeaCbmTier(text: string) {
  const normalized = text.replace(/\s+/g, '').toUpperCase();
  if (!/CBM|方/.test(normalized)) return undefined;
  const range = normalized.match(/(\d+(?:\.\d+)?)\s*[-~－—]\s*(\d+(?:\.\d+)?)/);
  if (range) return { label: `${range[1]}-${range[2]}CBM` };
  const above = normalized.match(/(\d+(?:\.\d+)?)\s*(?:CBM)?以上/);
  if (above) return { label: `${above[1]}CBM+` };
  return { label: text.trim() };
}

function parseHorizontalTierPriceWorkbook(
  workbook: SimpleWorkbook,
  sourceName?: string,
  targetModule?: PriceBookImportTargetModule
): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    const sheetName = sheet.name;
    const rows = worksheetToRows(sheet);
    const sheetTotalRemark = extractHorizontalSheetTotalRemark(rows);
    const sheetTransitLabel = extractTransitLabelFromRemark(sheetTotalRemark);
    return rows.flatMap((headers, headerIndex) => {
      const firstHeader = normalizeHeader(headers[0]);
      if (!isHorizontalPriceHeader(firstHeader)) {
        return [];
      }

      const tierColumns = headers
        .map((header, columnIndex) => ({ columnIndex, range: getImportedWeightRange(header) }))
        .filter((item): item is { columnIndex: number; range: { minWeightKg: number; maxWeightKg?: number } } => Boolean(item.range));
      if (tierColumns.length < 2) {
        return [];
      }

      const sectionName = findHorizontalSectionName(rows, headerIndex, sheetName);
      const sectionOriginName = normalizeAmazonOriginWarehouseName(sectionName) ?? normalizeAmazonOriginWarehouseName(sheetName);
      const sectionRemark = mergeRemarkBlocks(
        extractHorizontalSectionRemark(rows, headerIndex, tierColumns.map((item) => item.columnIndex)),
        sheetTotalRemark
      );
      const sectionTransitLabel = extractTransitLabelFromRemark(sectionRemark) ?? sheetTransitLabel;
      const warehouseColumnIndex = findLooseHeaderIndex(headers, ['仓库分区', '仓库编码', '仓库代码', '亚马逊代码', 'FBA仓库代码']);
      let inheritedTransitLabel: string | undefined;
      return getHorizontalDataRows(rows, headerIndex).flatMap((row, offset) => {
        const label = cellToText(row[0]);
        if (!label) {
          return [];
        }

        // A horizontal "国家/重量区间" first column carries country/postal
        // zones, not FBA codes. Expanding values such as "10,12,13" as
        // warehouse rules duplicates one European rate dozens of times.
        const destinations = firstHeader === '渠道'
          ? [inferDestinationFromText(`${sheetName} ${sectionName}`)]
          : splitImportedDestinations(label, `${sheetName} ${sectionName}`, targetModule);
        const rowTransitLabel = findHorizontalTransitLabel(headers, row, tierColumns.map((item) => item.columnIndex));
        if (rowTransitLabel) {
          inheritedTransitLabel = rowTransitLabel;
        }
        const transitLabel = rowTransitLabel ?? inheritedTransitLabel ?? sectionTransitLabel;
        // Warehouse rule expansion is opt-in through an explicit warehouse
        // header. Never infer it from the first destination/region column.
        const warehouseValue = warehouseColumnIndex >= 0 ? cellToText(row[warehouseColumnIndex]) : '';
        const warehouseCodes = warehouseColumnIndex >= 0
          ? splitImportedWarehouseCodes(warehouseValue).filter((code) => !isInvalidWarehouseCodeRule(code))
          : [];
        const rowWarehouseCodes = warehouseCodes.length ? warehouseCodes : [undefined];

        return tierColumns.flatMap(({ columnIndex, range }, tierIndex) => {
          const costPerKg = cellToNumber(row[columnIndex]);
          if (costPerKg <= 0) {
            return [];
          }
          const channelName = firstHeader === '渠道'
            ? `${sectionName} ${label}`.trim()
            : inferHorizontalChannelName(rows, headerIndex, columnIndex, sectionName);
          const nextRange = tierColumns[tierIndex + 1]?.range;
          const maxWeightKg = range.maxWeightKg ?? (nextRange && nextRange.minWeightKg > range.minWeightKg ? nextRange.minWeightKg - 0.001 : 99999);
          return destinations.flatMap((destinationCountry, destinationIndex) => rowWarehouseCodes.map((warehouseCode) => ({
            id: `import-price-${Date.now()}-${sheetName}-${headerIndex}-${offset}-${columnIndex}-${destinationIndex}-${warehouseCode ?? 'none'}`,
            agentName: inferAgentNameFromText(sheetName) ?? inferAgentNameFromText(sourceName ?? '') ?? '未知代理',
            sourceSheetName: sectionOriginName ?? sheetName,
            carrierName: inferPriceCarrierName({ channelName }),
          channelName,
          realChannelName: channelName,
          businessRouteName: sectionName,
            warehouseCode,
            destinationCountry,
            postalRule: firstHeader === '渠道' ? undefined : label,
            minWeightKg: range.minWeightKg,
            maxWeightKg,
            costPerKg,
            currency: 'RMB',
            transitDays: parseTransitDays(transitLabel),
            transitLabel,
            ...(sectionRemark ? { specialRemark: sectionRemark } : {})
          })));
        });
      });
    });
  });
}

type ImportedAmazonPriceTier =
  | { kind: 'kg'; label: string; minWeightKg: number; maxWeightKg: number; openEnded?: boolean }
  | { kind: 'cbm'; label: '按方包税' | '按方不包税' | '按方未标注'; minWeightKg: number; maxWeightKg: number };

function buildImportedTierColumns(headers: ExcelCellValue[], secondaryHeaders: ExcelCellValue[] = []) {
  const columns = Array.from({ length: Math.max(headers.length, secondaryHeaders.length) })
    .map((_, columnIndex) => ({ columnIndex, tier: getImportedPriceTier(headers[columnIndex]) ?? getImportedPriceTier(secondaryHeaders[columnIndex]) }))
    .filter((item): item is { columnIndex: number; tier: ImportedAmazonPriceTier } => Boolean(item.tier));
  const kgMinimums = columns
    .filter((item) => item.tier.kind === 'kg')
    .map((item) => item.tier.minWeightKg)
    .sort((left, right) => left - right);
  return columns.map((item) => {
    if (item.tier.kind !== 'kg' || !item.tier.openEnded) return item;
    const nextMinimum = kgMinimums.find((minimum) => minimum > item.tier.minWeightKg);
    return {
      ...item,
      tier: {
        ...item.tier,
        maxWeightKg: nextMinimum === undefined ? 99999 : Number((nextMinimum - 0.001).toFixed(3))
      }
    };
  });
}

function inferImportedAmazonAgentName(value?: string) {
  const text = cellToText(value);
  if (/拓普达|topda|tuopuda/i.test(text)) return '拓普达';
  if (/亿阳|yiyang/i.test(text)) return '亿阳国际';
  if (/振韵|zhenyun/i.test(text)) return '深圳振韵国际';
  if (/驰汉|chihan/i.test(text)) return '驰汉';
  const fileAgent = text.match(/([\u3400-\u9FFFA-Za-z0-9]+?)(?:20\d{2}|价格表|报价|\.xls|\.xlsx|$)/i)?.[1]?.trim();
  return fileAgent || '未知代理';
}

function buildTierOriginByColumn(headers: ExcelCellValue[], tierColumnIndexes: number[]) {
  const result = new Map<number, string>();
  const tierColumns = new Set(tierColumnIndexes);
  let inheritedOrigin: string | undefined;
  headers.forEach((header, columnIndex) => {
    const origin = normalizeAmazonOriginWarehouseName(header);
    if (origin) {
      inheritedOrigin = origin;
    }
    if (tierColumns.has(columnIndex) && inheritedOrigin) {
      result.set(columnIndex, inheritedOrigin);
    }
  });
  return result;
}

function getHorizontalDataRows(rows: Array<Array<string | number | null>>, headerIndex: number) {
  const dataRows: Array<Array<string | number | null>> = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const label = cellToText(row[0]);
    if (!label) {
      continue;
    }
    const normalized = normalizeHeader(label);
    if (isHorizontalPriceHeader(normalized) || isHorizontalSectionBreak(label)) {
      break;
    }
    dataRows.push(row);
  }
  return dataRows;
}

function extractHorizontalSectionRemark(
  rows: Array<Array<string | number | null>>,
  headerIndex: number,
  tierColumnIndexes: number[]
) {
  const dataRows = getHorizontalDataRows(rows, headerIndex);
  const dataEndIndex = headerIndex + dataRows.length;
  const maxTierColumnIndex = Math.max(...tierColumnIndexes);
  const remarkColumnIndexes = getHorizontalRemarkColumnIndexes(rows[headerIndex] ?? [], tierColumnIndexes, rows[headerIndex - 1] ?? []);
  const namedSideLines = remarkColumnIndexes.flatMap((columnIndex) =>
    dataRows.map((row) => cellToRemarkLine(row[columnIndex])).filter(Boolean)
  );
  const sideLines = dataRows
    .flatMap((row) => row.slice(maxTierColumnIndex + 1))
    .map(cellToRemarkLine)
    .filter(isChannelRequirementLine);
  const trailingRequirement = extractTrailingPriceSectionRequirement(rows, headerIndex, tierColumnIndexes);
  const bottomLines: string[] = [];
  for (const row of rows.slice(dataEndIndex + 1)) {
    const firstText = cellToText(row[0]);
    const normalizedFirst = normalizeHeader(firstText);
    if (isHorizontalPriceHeader(normalizedFirst)) {
      break;
    }
    if (firstText && !isHorizontalSectionBreak(firstText) && !isChannelRequirementLine(firstText)) {
      break;
    }
    const line = rowToRemarkLine(row);
    if (isChannelRequirementLine(line)) {
      bottomLines.push(line);
    }
  }
  return mergeRemarkBlocks(
    ...namedSideLines,
    ...sideLines,
    ...bottomLines,
    trailingRequirement
  );
}

/**
 * Supplier sheets frequently place a free-form paragraph block immediately
 * below a price table. The heading varies (or is absent), but after the final
 * priced row it belongs to that table until another price section begins.
 */
function extractTrailingPriceSectionRequirement(
  rows: Array<Array<string | number | null>>,
  headerIndex: number,
  priceColumnIndexes: number[]
) {
  let lastPriceRowIndex = headerIndex;
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const firstText = cellToText(row[0]);
    if (isHorizontalPriceHeader(normalizeHeader(firstText))) break;
    const nextFirstText = cellToText(rows[rowIndex + 1]?.[0]);
    if (firstText && isHorizontalPriceHeader(normalizeHeader(nextFirstText))) break;
    if (priceColumnIndexes.some((columnIndex) => cellToNumber(row[columnIndex]) > 0)) {
      lastPriceRowIndex = rowIndex;
    }
  }
  if (lastPriceRowIndex <= headerIndex) return undefined;

  const lines: string[] = [];
  for (let rowIndex = lastPriceRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const line = rowToRemarkLine(row);
    if (!line) continue;
    const firstText = cellToText(row[0]);
    if (isHorizontalPriceHeader(normalizeHeader(firstText))) break;
    // A non-header title followed by a new price header starts the next table;
    // it is not a requirement of the preceding one.
    const nextFirstText = cellToText(rows[rowIndex + 1]?.[0]);
    if (firstText && isHorizontalPriceHeader(normalizeHeader(nextFirstText))) break;
    lines.push(line);
  }
  return mergeRemarkBlocks(...lines);
}

function extractHorizontalSheetTotalRemark(rows: Array<Array<string | number | null>>) {
  const lastSectionDataEndIndex = rows.reduce((latestEndIndex, headers, headerIndex) => {
    const firstHeader = normalizeHeader(headers[0]);
    if (!isHorizontalPriceHeader(firstHeader)) {
      return latestEndIndex;
    }
    const tierColumnCount = headers.filter((header) => Boolean(getImportedWeightRange(header))).length;
    if (tierColumnCount < 2) {
      return latestEndIndex;
    }
    return Math.max(latestEndIndex, headerIndex + getHorizontalDataRows(rows, headerIndex).length);
  }, -1);
  if (lastSectionDataEndIndex < 0) {
    return undefined;
  }

  return extractSheetTotalRemarkFromRows(rows, lastSectionDataEndIndex + 1);
}

function extractSheetTotalRemarkFromRows(
  rows: Array<Array<string | number | null>>,
  startIndex: number,
  options: { collectUnlabelled?: boolean } = {}
) {
  const totalLines: string[] = [];
  let collecting = false;
  for (const row of rows.slice(Math.max(0, startIndex))) {
    const line = rowToRemarkLine(row);
    if (!line) {
      continue;
    }
    const firstText = cellToText(row[0]);
    const normalizedFirst = normalizeHeader(firstText);
    if (isHorizontalPriceHeader(normalizedFirst)) {
      break;
    }
    if (!collecting) {
      if (!options.collectUnlabelled && !isSheetTotalRemarkStart(line)) {
        continue;
      }
      collecting = true;
    }
    if (collecting) {
      totalLines.push(line);
    }
  }

  return mergeRemarkBlocks(...totalLines);
}

function getNamedRemarkColumnIndexes(
  headers: Array<string | number | null>,
  secondaryHeaders: Array<string | number | null> = [],
  excludedIndexes: number[] = [],
  matcher: RegExp = /备注|渠道要求|要求|说明|附加费|尺寸|限制/
) {
  const excluded = new Set(excludedIndexes.filter((index) => index >= 0));
  const length = Math.max(headers.length, secondaryHeaders.length);
  return Array.from({ length }, (_, columnIndex) => columnIndex)
    .filter((columnIndex) => !excluded.has(columnIndex))
    .filter((columnIndex) => matcher.test(`${cellToRemarkLine(headers[columnIndex])} ${cellToRemarkLine(secondaryHeaders[columnIndex])}`));
}

function isHorizontalPriceHeader(normalizedHeader: string) {
  return ['渠道', '目的地', '国家', '国家分区', '国家/重量区间'].includes(normalizedHeader);
}

function extractRemarkFromColumns(row: Array<string | number | null>, columnIndexes: number[]) {
  return mergeRemarkBlocks(...columnIndexes.map((columnIndex) => cellToRemarkLine(row[columnIndex])).filter(Boolean));
}

function isSheetTotalRemarkStart(value: string | number | null | undefined) {
  return /总备注|通用备注|全局备注|渠道说明|特别提示|特别声明|注意(?:事项)?|责任说明|赔偿|燃油附加|燃油价格|操作明细收费|渠道货物限制|卸货能力要求|(?:操作|后续).*费用/.test(cellToRemarkLine(value));
}

function mergeRemarkBlocks(...blocks: Array<string | undefined>) {
  const lines = blocks
    .flatMap((block) => (block ?? '').split('\n'))
    .flatMap(splitRequirementRemarkItems)
    .map((line) => line.trim())
    .filter((line) => line && shouldKeepChannelRequirementLine(line));
  return Array.from(new Set(lines)).join('\n').slice(0, 20000) || undefined;
}

function splitRequirementRemarkItems(line: string) {
  return line
    .replace(/\s*(?=(?:\d+[、）)]|\d+\.(?!\d)|[一二三四五六七八九十]+[、）)]))/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function shouldKeepChannelRequirementLine(line: string) {
  const compact = line.replace(/\s+/g, '');
  if (!compact) {
    return false;
  }
  const hasFilteredRule = /按方包税计算方式|最低\d*(?:\.\d+)?CBM起运|1CBM=363KGS|实际按照体积计算|重轻货报价|时效赔偿|时效赔付|时效延误|延误赔偿|超过承诺时效|最高理赔|最高赔偿|最高补偿|赔偿标准|赔偿说明|赔偿条款|签收当天不计赔偿日|按每天赔偿|丢件赔偿/.test(compact);
  if (!hasFilteredRule) {
    return true;
  }
  return /品名|单件|尺寸|超长|超重|超大|木箱|木架|托盘|包装|不接|拒收|查验|清关|报关|关税|偏远|尾板|卸货|退件|附加费|单询|提供资料|认证|文件|带磁|磁检|敏感|电池|液体|危险|不可|限制|扣货|申报不符/.test(compact);
}

function getHorizontalRemarkColumnIndexes(
  headers: Array<string | number | null>,
  tierColumnIndexes: number[],
  secondaryHeaders: Array<string | number | null> = []
) {
  const maxTierColumnIndex = Math.max(...tierColumnIndexes);
  return headers
    .map((header, columnIndex) => ({ columnIndex, header: cellToRemarkLine(header) }))
    .filter(({ columnIndex, header }) =>
      columnIndex > maxTierColumnIndex && /备注|渠道要求|要求|说明|附加费|尺寸|限制/.test(`${header} ${cellToRemarkLine(secondaryHeaders[columnIndex])}`)
    )
    .map(({ columnIndex }) => columnIndex);
}

function rowToRemarkLine(row: Array<string | number | null>) {
  return row.map(cellToRemarkLine).filter(Boolean).join(' / ').replace(/\s+/g, ' ').trim();
}

function cellToRemarkLine(value: string | number | null | undefined) {
  const text = cellToText(value).replace(/\s+/g, ' ').trim();
  return isImageFormulaText(text) ? '' : text;
}

function isImageFormulaText(value: string) {
  return /^=?(?:_xlfn\.)?DISPIMG\s*\(/i.test(value);
}

function isChannelRequirementLine(value: string | number | null | undefined) {
  const text = cellToRemarkLine(value);
  return Boolean(text)
    && /备注|要求|说明|附加费|超标准|磁检|报关|罚款|拒收|冲货|产品|尺寸|超长|超重|超大|收费|费用|托盘|一托|偏远|不可堆叠|派送|退回|免责|提示|最长边|实重|计费重|木箱|卡脚|燃油|汇率|卸货|派送费|海关|查验|清关|关税|税单|预收|品名|等时|准点|条款|服务/.test(text);
}

function extractTransitLabelFromRemark(value: string | undefined) {
  return (value ?? '')
    .split('\n')
    .map((line) => extractTransitLabelFromText(line, { requireKeyword: true }))
    .find(Boolean);
}

function inferPriceCarrierName(row: Pick<ImportedPriceRow, 'carrierName' | 'realChannelName' | 'businessRouteName' | 'channelName'>) {
  if (row.carrierName?.trim()) {
    return row.carrierName.trim();
  }

  const source = `${row.realChannelName ?? ''} ${row.businessRouteName ?? ''} ${row.channelName}`.toLowerCase();
  if (/dhl|dhk/.test(source)) {
    return 'DHL';
  }
  if (/ups|1z/.test(source)) {
    return 'UPS';
  }
  if (/fedex|fdx/.test(source)) {
    return 'FEDEX';
  }
  if (/aramex/.test(source)) {
    return 'Aramex';
  }
  if (/usps/.test(source)) {
    return 'USPS';
  }
  if (/海|空|专线/.test(source)) {
    return '专线';
  }
  return '其他';
}

function normalizeImportedChannelName(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item && !item.includes('按方包税') && !item.startsWith('船司'))
    .join(' ') || value.trim();
}

function splitImportedWarehouseCodes(value: string) {
  return warehouseCodeRulesForImport(value);
}

function findSheetWarehouseCode(rows: Array<Array<string | number | null>>) {
  const amazonCodePattern = /^[A-Z]{2,5}\d[A-Z0-9]*$/;
  for (const row of rows.slice(0, 5)) {
    for (const cell of row) {
      const value = cellToText(cell).replace(/\s+/g, '').toUpperCase();
      if (amazonCodePattern.test(value)) {
        return value;
      }
    }
  }
  return '';
}

function getImportedPriceTier(value: string | number | null | undefined): ImportedAmazonPriceTier | null {
  const cbmLabel = getImportedCbmTierLabel(value);
  if (cbmLabel) {
    return { kind: 'cbm', label: cbmLabel, minWeightKg: 0, maxWeightKg: 99999 };
  }
  const range = getImportedWeightRange(value);
  if (!range) return null;
  const normalizedHeader = normalizeHeader(value).replace(/\s+/g, '');
  // Some supplier sheets use bare headers such as "30kg, 50kg, 100kg" to
  // mean the same progressive tiers as 30KG+/50KG+/100KG+.
  const openEnded = normalizedHeader.includes('+') || /^\d+(?:\.\d+)?(?:kg|kgs|公斤)$/.test(normalizedHeader);
  const label = openEnded
    ? `${range.minWeightKg}KG+`
    : `${range.minWeightKg}-${range.maxWeightKg ?? 99999}KG`;
  return { kind: 'kg', label, minWeightKg: range.minWeightKg, maxWeightKg: range.maxWeightKg ?? 99999, openEnded };
}

function getImportedCbmTierLabel(value: string | number | null | undefined): '按方包税' | '按方不包税' | '按方未标注' | null {
  const header = normalizeHeader(value).replace(/\s+/g, '');
  if (!/cbm|方/.test(header)) return null;
  if (/不包税|不含税|未包税/.test(header)) return '按方不包税';
  if (/包税|含税/.test(header)) return '按方包税';
  return '按方未标注';
}

function getImportedWeightRange(value: string | number | null | undefined) {
  const header = normalizeHeader(value).replace(/\s+/g, '');
  if (/cbm|方/.test(header)) {
    return null;
  }
  if (header.includes('12kg+')) {
    return { minWeightKg: 12, maxWeightKg: 50.999 };
  }
  if (header.includes('51kg+')) {
    return { minWeightKg: 51, maxWeightKg: 99.999 };
  }
  if (header.includes('100kg+')) {
    return { minWeightKg: 100, maxWeightKg: 99999 };
  }
  const rangeMatch = header.match(/^(\d+(?:\.\d+)?)(?:kg|kgs|公斤)?[-~－—–到](\d+(?:\.\d+)?)(?:kg|kgs|公斤)?$/);
  if (rangeMatch) {
    return { minWeightKg: Number(rangeMatch[1]), maxWeightKg: Number(rangeMatch[2]) };
  }
  const plusMatch = header.match(/^(\d+(?:\.\d+)?)(?:kg|kgs|公斤)?\+(?:[（(][^）)]*[）)])?$/);
  if (plusMatch) {
    return { minWeightKg: Number(plusMatch[1]) };
  }
  const bareKgMatch = header.match(/^(\d+(?:\.\d+)?)(?:kg|kgs|公斤)$/);
  if (bareKgMatch) {
    return { minWeightKg: Number(bareKgMatch[1]) };
  }
  return null;
}

function findHorizontalSectionName(rows: Array<Array<string | number | null>>, headerIndex: number, sheetName: string) {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const text = rows[index].map(cellToText).filter(Boolean).join(' ').trim();
    if (text && !/返回首页|深圳振韵国际货运代理有限公司|联系人/.test(text) && !isHorizontalGroupLabel(text)) {
      return normalizeImportedChannelName(text);
    }
  }
  return sheetName;
}

function inferHorizontalChannelName(
  rows: Array<Array<string | number | null>>,
  headerIndex: number,
  columnIndex: number,
  fallback: string
) {
  const group = nearestLeftText(rows[headerIndex - 1] ?? [], columnIndex);
  return [fallback, group].filter(Boolean).join(' ').trim() || fallback;
}

function nearestLeftText(row: Array<string | number | null>, columnIndex: number) {
  for (let index = columnIndex; index >= 0; index -= 1) {
    const text = cellToText(row[index]);
    if (text && !['系统下单渠道', '适用情况'].includes(text)) {
      return text;
    }
  }
  return '';
}

function findHorizontalTransitLabel(
  headers: Array<string | number | null>,
  row: Array<string | number | null>,
  tierColumnIndexes: number[]
) {
  const aliases = ['参考时效', '全程时效', '派送时效', '船期', '时效'];
  for (const [index, header] of headers.entries()) {
    const normalizedHeader = normalizeHeader(header);
    if (!aliases.some((alias) => normalizedHeader.includes(normalizeHeader(alias)))) {
      continue;
    }
    const label = extractTransitLabelFromText(row[index] ?? header);
    if (label) {
      return label;
    }
  }
  const maxTierColumnIndex = Math.max(...tierColumnIndexes);
  for (let index = maxTierColumnIndex + 1; index < row.length; index += 1) {
    if (/备注|渠道要求|要求|说明|附加费|尺寸|限制/.test(cellToRemarkLine(headers[index]))) {
      continue;
    }
    const label = extractTransitLabelFromText(row[index], { requireKeyword: true, compactLabel: true });
    if (label) {
      return label;
    }
  }
  return undefined;
}

function splitImportedDestinations(value: string, fallbackText: string, targetModule?: PriceBookImportTargetModule) {
  // Only warehouse-oriented pools may treat a destination cell as a FBA rule.
  // European price sheets often use numeric postal regions in this position.
  const supportsWarehouseDestination = targetModule === 'amazon' || targetModule === 'canadaAirSea';
  const warehouseCodes = supportsWarehouseDestination
    ? splitImportedWarehouseCodes(value).filter((code) => !isInvalidWarehouseCodeRule(code))
    : [];
  if (warehouseCodes.length) return [inferDestinationFromText(fallbackText)];
  const fallbackDestination = inferDestinationFromText(fallbackText);
  // European sheets commonly put postcode zones such as "10,12,13" in a
  // country/weight column. They are one country's postal rule, not four
  // destinations. Keep the country from the sheet and persist the raw value
  // separately as postalRule on the imported row.
  if (
    (targetModule === 'inquiry' || targetModule === 'europeExpress')
    && fallbackDestination !== '未标记目的地'
    && /^[\d\s,，、/\\-]+$/.test(value)
  ) {
    return [fallbackDestination];
  }
  const values = value
    .replace(/[()（）]/g, ' ')
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length
    ? values.map((item) => {
      const destination = inferDestinationFromText(item);
      return destination === '未标记目的地' ? item : destination;
    })
    : [inferDestinationFromText(fallbackText)];
}

function inferDestinationFromText(value: string) {
  const countries = ['英国', '德国', '法国', '意大利', '西班牙', '波兰', '荷兰', '比利时', '卢森堡', '奥地利', '丹麦', '芬兰', '瑞典', '葡萄牙', '捷克', '匈牙利', '爱尔兰', '希腊', '摩纳哥', '斯洛伐克', '斯洛文尼亚', '保加利亚', '立陶宛', '拉脱维亚', '罗马尼亚', '爱沙尼亚', '克罗地亚', '美国', '加拿大', '阿联酋', '南非'];
  return countries.find((country) => value.includes(country)) ?? '未标记目的地';
}

function isHorizontalSectionBreak(value: string) {
  return /说明|备注|收费|报价总费用|渠道说明|附加费|返回|服务|注意/.test(value);
}

function isHorizontalGroupLabel(value: string) {
  return value.replace(/\s+/g, '').replace(/不包税|不含税|包税|含税|PVA/gi, '') === '';
}

function inferAgentNameFromText(value: string) {
  if (value.includes('振韵')) return '深圳振韵国际';
  if (value.includes('驰汉')) return '驰汉';
  return undefined;
}

function parseTransitDays(value: string | number | null | undefined) {
  if (typeof value === 'number' && value > 0) {
    return value;
  }

  const rawText = cellToText(value);
  const text = extractTransitLabelFromText(value) ?? (/^\d+(?:\.\d+)?$/.test(rawText.trim()) ? rawText.trim() : '');
  if (!text) {
    return undefined;
  }
  const transitMatch = text.replace(/\s+/g, '').match(TRANSIT_DAY_PATTERN);
  const numbers = transitMatch
    ? [transitMatch[1], transitMatch[2]].filter(Boolean).map(Number).filter((item) => item > 0)
    : [];
  if (!numbers.length) {
    const numericText = text.trim();
    return /^\d+(?:\.\d+)?$/.test(numericText) ? Number(numericText) : undefined;
  }

  return Math.min(...numbers);
}

function extractSheetTransitLabel(sheet: SimpleWorksheet) {
  for (const row of worksheetToRows(sheet)) {
    for (const cell of row) {
      const label = extractTransitLabelFromText(cell, { requireKeyword: true });
      if (label) return label;
    }
  }
  return undefined;
}

function extractTransitLabelFromText(
  value: string | number | null | undefined,
  options: { requireKeyword?: boolean; compactLabel?: boolean } = {}
) {
  const text = cellToText(value)
    .replace(/[：:]/g, ':')
    .replace(/[－—–]/g, '-')
    .replace(/[～]/g, '~')
    .replace(/\s+/g, ' ')
    .trim();
  const compactText = text.replace(/\s+/g, '');
  if (!compactText) {
    return undefined;
  }
  const hasBusinessTransitSignal = /参考时效|全程时效|派送时效|运输时效|航程时效|船期|开船|发车|提取|起飞|飞|派送|交付|签收|时效[:：]?\d/i.test(compactText);
  const isFalseTransitSignal = /时效赔付|时效延误|延误赔偿|时效不保证|超时不赔|保留\d+(?:天|日)|\d+(?:天|日)后退回|无法送货上门/.test(compactText);
  if ((options.requireKeyword && !hasBusinessTransitSignal) || (isFalseTransitSignal && !hasBusinessTransitSignal)) {
    return undefined;
  }
  const match = compactText.match(TRANSIT_DAY_PATTERN);
  if (!match) {
    return undefined;
  }
  if (options.compactLabel) {
    return sanitizePricingTransitLabel(match[2] ? `${match[1]}-${match[2]}天` : `${match[1]}天`);
  }
  return sanitizePricingTransitLabel(text);
}

const TRANSIT_DAY_PATTERN = /(\d+(?:\.\d+)?)(?:[-~至到](\d+(?:\.\d+)?))?(?:个)?(?:自然|工作)?(?:天|日|days?)/i;

function cellToNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }
  return Number(String(value ?? '').trim()) || 0;
}

function findHeaderIndex(headers: Array<string | number | null>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function findLooseHeaderIndex(headers: Array<string | number | null>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => {
    const normalizedHeader = normalizeHeader(header);
    return normalizedAliases.some((alias) => normalizedHeader.includes(alias));
  });
}

function normalizeHeader(value: string | number | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function cellToText(value: string | number | null | undefined) {
  return String(value ?? '').trim();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

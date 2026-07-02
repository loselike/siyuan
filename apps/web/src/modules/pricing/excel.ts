import type * as XLSXModule from 'xlsx';
import type { PriceBookRowSummary, PriceLookupRequest, QuoteSourceType } from '@siyuan/shared';

export type XlsxModule = typeof XLSXModule;

export type ImportedPriceRow = Omit<PriceBookRowSummary, 'priceBookId'> & {
  priceBookId?: string;
  remark?: string;
};

export type PriceLookupFormValues = PriceLookupRequest & {
  actualWeightKg?: number;
  volumeCbm?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageCount?: number;
  unitActualWeightKg?: number;
};

export const seedImportedPriceRows: ImportedPriceRow[] = [
  {
    id: 'price-a-us-0-5',
    agentName: 'a代理',
    carrierName: 'DHL',
    channelName: 'DHL HK',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHL代理',
    destinationCountry: '美国',
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

export function parsePriceWorkbook(arrayBuffer: ArrayBuffer, xlsx: XlsxModule, sourceName?: string): ImportedPriceRow[] {
  const workbook = xlsx.read(arrayBuffer, { type: 'array', cellDates: false });
  if (!workbook.SheetNames.length) {
    throw new Error('价格表为空');
  }

  const lookupNotes = extractWorkbookLookupNotes(workbook, xlsx);
  const canonicalRows = parseCanonicalPriceWorkbook(workbook, xlsx);
  if (canonicalRows.length) {
    return attachWorkbookLookupNotes(canonicalRows, lookupNotes);
  }

  const warehouseSummaryRows = parseWarehouseSummaryPriceWorkbook(workbook, xlsx);
  if (warehouseSummaryRows.length) {
    return attachWorkbookLookupNotes(warehouseSummaryRows, lookupNotes);
  }

  const horizontalRows = parseHorizontalTierPriceWorkbook(workbook, xlsx, sourceName);
  if (horizontalRows.length) {
    return attachWorkbookLookupNotes(horizontalRows, lookupNotes);
  }

  throw new Error('价格表必须包含代理、渠道、目的地、最小重量、最大重量、成本单价，或包含对应渠道、仓库编码、12KG+/51KG+等卡派汇总表头');
}

function attachWorkbookLookupNotes(
  rows: ImportedPriceRow[],
  notes: Pick<ImportedPriceRow, 'productSurchargeRemark' | 'specialRemark'>
) {
  if (!notes.productSurchargeRemark && !notes.specialRemark) {
    return rows;
  }
  return rows.map((row) => (shouldAttachWorkbookLookupNotes(row) ? { ...row, ...notes } : row));
}

function shouldAttachWorkbookLookupNotes(row: Pick<ImportedPriceRow, 'agentName'>) {
  return !row.agentName.includes('亿阳');
}

function extractWorkbookLookupNotes(workbook: XLSXModule.WorkBook, xlsx: XlsxModule): Pick<ImportedPriceRow, 'productSurchargeRemark' | 'specialRemark'> {
  const productSurchargeRemark = extractSheetRemark(workbook, xlsx, (sheetName) => sheetName.includes('产品附加'));
  const specialRemark = extractSheetRemark(workbook, xlsx, (sheetName) => sheetName.includes('特别说明') || sheetName.includes('尺寸'));
  return {
    ...(productSurchargeRemark ? { productSurchargeRemark } : {}),
    ...(specialRemark ? { specialRemark } : {})
  };
}

function extractSheetRemark(workbook: XLSXModule.WorkBook, xlsx: XlsxModule, matcher: (sheetName: string) => boolean) {
  const sheetName = workbook.SheetNames.find(matcher);
  if (!sheetName) {
    return undefined;
  }
  const rows = sheetToRows(workbook.Sheets[sheetName], xlsx);
  const lines = rows
    .map((row) => row.map(cellToText).filter(Boolean).join(' / '))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line && !/^回到目录$/.test(line));
  return Array.from(new Set(lines)).join('\n').slice(0, 4000) || undefined;
}

function parseCanonicalPriceWorkbook(workbook: XLSXModule.WorkBook, xlsx: XlsxModule): ImportedPriceRow[] {
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = sheetToRows(sheet, xlsx);
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
    const minWeightIndex = findHeaderIndex(headers, ['最小重量', '起始重量', 'minWeight', 'min']);
    const maxWeightIndex = findHeaderIndex(headers, ['最大重量', '结束重量', 'maxWeight', 'max']);
    const costIndex = findHeaderIndex(headers, ['成本单价', '代理成本价', '成本价', '单价', 'cost']);
    const currencyIndex = findHeaderIndex(headers, ['币种', 'currency']);
    const warehouseIndex = findHeaderIndex(headers, ['仓库编码', '亚马逊代码', 'FBA仓库代码', 'warehouse']);
    const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '时效', '运输时效', 'transit']);

    if (agentIndex < 0 || channelIndex < 0 || countryIndex < 0 || minWeightIndex < 0 || maxWeightIndex < 0 || costIndex < 0) {
      return [];
    }

    return dataRows
      .map((row, index) => ({
        id: `import-price-${Date.now()}-${sheetName}-${index}`,
        agentName: cellToText(row[agentIndex]),
        sourceSheetName: sheetName.trim() || sheetName,
        channelName: cellToText(row[channelIndex]),
        carrierName: carrierIndex >= 0 ? cellToText(row[carrierIndex]) || undefined : undefined,
        businessRouteName: businessRouteIndex >= 0 ? cellToText(row[businessRouteIndex]) || undefined : undefined,
        realChannelName: realChannelIndex >= 0 ? cellToText(row[realChannelIndex]) || undefined : cellToText(row[channelIndex]),
        warehouseCode: warehouseIndex >= 0 ? cellToText(row[warehouseIndex]) || undefined : undefined,
        destinationCountry: cellToText(row[countryIndex]),
        minWeightKg: cellToNumber(row[minWeightIndex]),
        maxWeightKg: cellToNumber(row[maxWeightIndex]),
        costPerKg: cellToNumber(row[costIndex]),
        currency: currencyIndex >= 0 ? cellToText(row[currencyIndex]) || 'RMB' : 'RMB',
        transitDays: transitIndex >= 0 ? parseTransitDays(row[transitIndex]) : undefined,
          transitLabel: transitIndex >= 0 ? cellToText(row[transitIndex]) || undefined : undefined
      }))
      .filter((row) => row.agentName && row.channelName && row.destinationCountry && row.maxWeightKg > row.minWeightKg && row.costPerKg > 0);
  });
}

function parseWarehouseSummaryPriceWorkbook(workbook: XLSXModule.WorkBook, xlsx: XlsxModule): ImportedPriceRow[] {
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = sheetToRows(sheet, xlsx);
    const sheetWarehouseCode = findSheetWarehouseCode(rows);
    const headerIndex = rows.findIndex((row, index) => {
      const channelHeaderIndex = findHeaderIndex(row, ['对应渠道', '下单渠道']);
      if (channelHeaderIndex < 0 || (findHeaderIndex(row, ['仓库编码', '仓库代码', '亚马逊代码', 'FBA仓库代码']) < 0 && !sheetWarehouseCode)) {
        return false;
      }
      const currentRowHasWeightTier = row.some((cell) => Boolean(getImportedWeightRange(cell)));
      const nextRowHasWeightTier = (rows[index + 1] ?? []).some((cell) => Boolean(getImportedWeightRange(cell)));
      return currentRowHasWeightTier || nextRowHasWeightTier;
    });
    if (headerIndex < 0) {
      return [];
    }

    const headers = rows[headerIndex];
    const secondaryHeaders = rows[headerIndex + 1] ?? [];
    const channelIndex = findHeaderIndex(headers, ['对应渠道', '下单渠道']);
    const warehouseIndex = findHeaderIndex(headers, ['仓库编码', '仓库代码', '亚马逊代码', 'FBA仓库代码']);
    const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '时效', '时效赔付']) >= 0
      ? findLooseHeaderIndex(headers, ['参考时效', '时效', '时效赔付'])
      : findLooseHeaderIndex(secondaryHeaders, ['参考时效', '时效', '时效赔付']);
    const tierColumns = Array.from({ length: Math.max(headers.length, secondaryHeaders.length) })
      .map((_, columnIndex) => ({ columnIndex, range: getImportedWeightRange(headers[columnIndex]) ?? getImportedWeightRange(secondaryHeaders[columnIndex]) }))
      .filter((item): item is { columnIndex: number; range: { minWeightKg: number; maxWeightKg: number } } => Boolean(item.range));

    let inheritedChannelName = '';
    return rows.slice(headerIndex + 1).flatMap((row, rowIndex) => {
      const rowChannelName = cellToText(row[channelIndex]);
      if (rowChannelName) {
        inheritedChannelName = normalizeImportedChannelName(rowChannelName);
      }
      const channelName = rowChannelName ? normalizeImportedChannelName(rowChannelName) : inheritedChannelName;
      const warehouseCode = warehouseIndex >= 0 ? cellToText(row[warehouseIndex]) : sheetWarehouseCode;
      const warehouseCodes = splitImportedWarehouseCodes(warehouseCode);
      const transitLabel = transitIndex >= 0 ? cellToText(row[transitIndex]) || undefined : undefined;
      if (!channelName || !warehouseCodes.length) {
        return [];
      }

      return tierColumns
        .flatMap(({ columnIndex, range }) =>
          warehouseCodes.map((code) => ({
            id: `import-price-${Date.now()}-${sheetName}-${rowIndex}-${columnIndex}-${code}`,
            agentName: '亿阳国际',
            sourceSheetName: sheetName.trim() || sheetName,
            carrierName: inferPriceCarrierName({ channelName }),
            channelName,
            realChannelName: channelName,
            warehouseCode: code,
            destinationCountry: '美国',
            minWeightKg: range.minWeightKg,
            maxWeightKg: range.maxWeightKg,
            costPerKg: cellToNumber(row[columnIndex]),
            currency: 'RMB',
            transitDays: parseTransitDays(transitLabel),
            transitLabel
          }))
        )
        .filter((price) => price.costPerKg > 0);
    });
  });
}

function parseHorizontalTierPriceWorkbook(workbook: XLSXModule.WorkBook, xlsx: XlsxModule, sourceName?: string): ImportedPriceRow[] {
  return workbook.SheetNames.flatMap((sheetName) => {
    const rows = sheetToRows(workbook.Sheets[sheetName], xlsx);
    return rows.flatMap((headers, headerIndex) => {
      const firstHeader = normalizeHeader(headers[0]);
      if (!['渠道', '目的地', '国家', '国家/重量区间'].includes(firstHeader)) {
        return [];
      }

      const tierColumns = headers
        .map((header, columnIndex) => ({ columnIndex, range: getImportedWeightRange(header) }))
        .filter((item): item is { columnIndex: number; range: { minWeightKg: number; maxWeightKg?: number } } => Boolean(item.range));
      if (tierColumns.length < 2) {
        return [];
      }

      const sectionName = findHorizontalSectionName(rows, headerIndex, sheetName);
      return getHorizontalDataRows(rows, headerIndex).flatMap((row, offset) => {
        const label = cellToText(row[0]);
        if (!label) {
          return [];
        }

        const destinations = firstHeader === '渠道'
          ? [inferDestinationFromText(`${sheetName} ${sectionName}`)]
          : splitImportedDestinations(label, `${sheetName} ${sectionName}`);
        const transitLabel = findHorizontalTransitLabel(headers, row);
        const warehouseCodes = looksLikeWarehouseCodeList(label) ? splitImportedWarehouseCodes(label) : [];

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
          return destinations.map((destinationCountry, destinationIndex) => ({
            id: `import-price-${Date.now()}-${sheetName}-${headerIndex}-${offset}-${columnIndex}-${destinationIndex}`,
            agentName: inferAgentNameFromWorkbook(workbook.Props?.Title) ?? inferAgentNameFromText(sheetName) ?? inferAgentNameFromText(sourceName ?? '') ?? '未知代理',
            sourceSheetName: sheetName,
            carrierName: inferPriceCarrierName({ channelName }),
            channelName,
            realChannelName: channelName,
            warehouseCode: warehouseCodes[0],
            destinationCountry,
            minWeightKg: range.minWeightKg,
            maxWeightKg,
            costPerKg,
            currency: 'RMB',
            transitDays: parseTransitDays(transitLabel),
            transitLabel
          }));
        });
      });
    });
  });
}

function getHorizontalDataRows(rows: Array<Array<string | number | null>>, headerIndex: number) {
  const dataRows: Array<Array<string | number | null>> = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const label = cellToText(row[0]);
    if (!label) {
      continue;
    }
    const normalized = normalizeHeader(label);
    if (['渠道', '目的地', '国家', '国家/重量区间'].includes(normalized) || isHorizontalSectionBreak(label)) {
      break;
    }
    dataRows.push(row);
  }
  return dataRows;
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

function sheetToRows(sheet: XLSXModule.WorkSheet, xlsx: XlsxModule): Array<Array<string | number | null>> {
  const range = getValueRange(sheet, xlsx);
  if (!range) {
    return [];
  }
  return xlsx.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, defval: '', blankrows: false, range });
}

function getValueRange(sheet: XLSXModule.WorkSheet, xlsx: XlsxModule) {
  const cells = Object.keys(sheet)
    .filter((key) => /^[A-Z]+[0-9]+$/.test(key))
    .filter((key) => {
      const value = sheet[key]?.v;
      return value !== undefined && value !== null && String(value).trim() !== '';
    })
    .map((key) => xlsx.utils.decode_cell(key));
  if (!cells.length) {
    return undefined;
  }
  return {
    s: {
      r: Math.min(...cells.map((cell) => cell.r)),
      c: Math.min(...cells.map((cell) => cell.c))
    },
    e: {
      r: Math.max(...cells.map((cell) => cell.r)),
      c: Math.max(...cells.map((cell) => cell.c))
    }
  };
}

function normalizeImportedChannelName(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item && !item.includes('按方包税') && !item.startsWith('船司')) ?? value.trim();
}

function splitImportedWarehouseCodes(value: string) {
  const normalized = value
    .replace(/[，、;；/]/g, ' ')
    .replace(/\([^)]*\)|（[^）]*）/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!normalized) {
    return [];
  }
  return Array.from(new Set(normalized.split(' ').filter((item) => /^[A-Z]{2,6}\d[A-Z0-9]*$/.test(item))));
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
  const rangeMatch = header.match(/^(\d+(?:\.\d+)?)[-~－—–到](\d+(?:\.\d+)?)(?:kg|公斤)?$/);
  if (rangeMatch) {
    return { minWeightKg: Number(rangeMatch[1]), maxWeightKg: Number(rangeMatch[2]) };
  }
  const plusMatch = header.match(/^(\d+(?:\.\d+)?)(?:kg|kgs|公斤)?\+$/);
  if (plusMatch) {
    return { minWeightKg: Number(plusMatch[1]) };
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

function findHorizontalTransitLabel(headers: Array<string | number | null>, row: Array<string | number | null>) {
  const index = findLooseHeaderIndex(headers, ['参考时效', '时效']);
  return index >= 0 ? cellToText(row[index] ?? headers[index]) || undefined : undefined;
}

function splitImportedDestinations(value: string, fallbackText: string) {
  if (looksLikeWarehouseCodeList(value)) {
    return [inferDestinationFromText(fallbackText)];
  }
  const values = value
    .replace(/[()（）]/g, ' ')
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length ? values : [inferDestinationFromText(fallbackText)];
}

function inferDestinationFromText(value: string) {
  const countries = ['英国', '德国', '法国', '意大利', '西班牙', '波兰', '荷兰', '比利时', '卢森堡', '奥地利', '丹麦', '芬兰', '瑞典', '葡萄牙', '捷克', '匈牙利', '爱尔兰', '希腊', '美国'];
  return countries.find((country) => value.includes(country)) ?? '未标记目的地';
}

function looksLikeWarehouseCodeList(value: string) {
  const codes = splitImportedWarehouseCodes(value);
  return codes.length > 0 && codes.join('').length >= Math.min(6, value.replace(/\s+/g, '').length / 2);
}

function isHorizontalSectionBreak(value: string) {
  return /说明|备注|收费|报价总费用|渠道说明|附加费|返回|服务|注意/.test(value);
}

function isHorizontalGroupLabel(value: string) {
  return value.replace(/\s+/g, '').replace(/不包税|不含税|包税|含税|PVA/gi, '') === '';
}

function inferAgentNameFromWorkbook(title?: string) {
  return title?.trim() || undefined;
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

  const text = cellToText(value);
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number).filter((item) => item > 0) ?? [];
  if (!numbers.length) {
    return undefined;
  }

  return Math.min(...numbers);
}

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

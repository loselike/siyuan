import { readWorkbook, worksheetToRows, type ExcelModule, type SimpleWorkbook, type SimpleWorksheet } from '../shared/excel';
import { warehouseCodeRulesForImport, type PriceBookRowSummary, type PriceLookupRequest, type QuoteSourceType } from '@siyuan/shared';

export type ExcelCellValue = string | number | null;

export type ImportedPriceRow = Omit<PriceBookRowSummary, 'priceBookId'> & {
  priceBookId?: string;
  remark?: string;
};

export type PriceLookupFormValues = PriceLookupRequest;

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

export async function parsePriceWorkbook(arrayBuffer: ArrayBuffer, excel: ExcelModule, sourceName?: string): Promise<ImportedPriceRow[]> {
  const workbook = await readWorkbook(arrayBuffer, excel);
  if (!workbook.worksheets.length) {
    throw new Error('价格表为空');
  }

  const lookupNotes = extractWorkbookLookupNotes(workbook);
  const canonicalRows = parseCanonicalPriceWorkbook(workbook);
  if (canonicalRows.length) {
    return attachWorkbookLookupNotes(canonicalRows, lookupNotes);
  }

  const warehouseSummaryRows = parseWarehouseSummaryPriceWorkbook(workbook, sourceName);
  const usAirSeaRows = parseUsAirSeaPriceWorkbook(workbook, sourceName);
  if (warehouseSummaryRows.length || usAirSeaRows.length) {
    return attachWorkbookLookupNotes([...usAirSeaRows, ...warehouseSummaryRows], lookupNotes);
  }

  const middleEastAirSeaRows = parseMiddleEastAirSeaPriceWorkbook(workbook, sourceName);
  if (middleEastAirSeaRows.length) {
    return attachWorkbookLookupNotes(middleEastAirSeaRows, lookupNotes);
  }

  const horizontalRows = parseHorizontalTierPriceWorkbook(workbook, sourceName);
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
    const sheetTotalRemark = extractSheetTotalRemarkFromRows(rows, 1);
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
          sourceSheetName: (normalizeAmazonOriginWarehouseName(originIndex >= 0 ? row[originIndex] : undefined) ?? normalizeAmazonOriginWarehouseName(sheetName) ?? sheetName.trim()) || sheetName,
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

function parseWarehouseSummaryPriceWorkbook(workbook: SimpleWorkbook, sourceName?: string): ImportedPriceRow[] {
  return workbook.worksheets.flatMap((sheet) => {
    const sheetName = sheet.name;
    const rows = worksheetToRows(sheet);
    const sheetTransitLabel = extractSheetTransitLabel(sheet);
    const sheetTotalRemark = extractSheetTotalRemarkFromRows(rows, 0);
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
            sourceSheetName: (normalizeAmazonOriginWarehouseName(originIndex >= 0 ? row[originIndex] : undefined) ?? tierOriginByColumn.get(columnIndex) ?? sheetOriginName ?? sheetName.trim()) || sheetName,
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
      const channelName = zoneLikeFirstCell ? inheritedChannelName : normalizeImportedChannelName(firstCell || inheritedChannelName);
      if (!channelName || (!firstCell && !zone)) return [];

      const rowTransitLabel = findHorizontalTransitLabel(headers, row, tierColumnIndexes);
      if (rowTransitLabel) inheritedTransitLabel = rowTransitLabel;
      const transitLabel = rowTransitLabel ?? inheritedTransitLabel;
      const specialRemark = extractRemarkFromColumns(row, specialRemarkColumnIndexes);

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

function parseHorizontalTierPriceWorkbook(workbook: SimpleWorkbook, sourceName?: string): ImportedPriceRow[] {
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
      let inheritedTransitLabel: string | undefined;
      return getHorizontalDataRows(rows, headerIndex).flatMap((row, offset) => {
        const label = cellToText(row[0]);
        if (!label) {
          return [];
        }

        const destinations = firstHeader === '渠道'
          ? [inferDestinationFromText(`${sheetName} ${sectionName}`)]
          : splitImportedDestinations(label, `${sheetName} ${sectionName}`);
        const rowTransitLabel = findHorizontalTransitLabel(headers, row, tierColumns.map((item) => item.columnIndex));
        if (rowTransitLabel) {
          inheritedTransitLabel = rowTransitLabel;
        }
        const transitLabel = rowTransitLabel ?? inheritedTransitLabel ?? sectionTransitLabel;
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
            agentName: inferAgentNameFromText(sheetName) ?? inferAgentNameFromText(sourceName ?? '') ?? '未知代理',
            sourceSheetName: sectionOriginName ?? sheetName,
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
            transitLabel,
            ...(sectionRemark ? { specialRemark: sectionRemark } : {})
          }));
        });
      });
    });
  });
}

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

function normalizeAmazonOriginWarehouseName(value: string | number | null | undefined): string | undefined {
  const text = cellToText(value)
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
  return Array.from(new Set([...namedSideLines, ...sideLines, ...bottomLines])).join('\n').slice(0, 20000) || undefined;
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

function extractSheetTotalRemarkFromRows(rows: Array<Array<string | number | null>>, startIndex: number) {
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
      if (!isSheetTotalRemarkStart(line)) {
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
  return /总备注|通用备注|全局备注|渠道说明|特别提示|特别声明|注意事项|责任说明|赔偿|燃油附加|燃油价格|操作明细收费|渠道货物限制|卸货能力要求/.test(cellToRemarkLine(value));
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
    .find((item) => item && !item.includes('按方包税') && !item.startsWith('船司')) ?? value.trim();
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
  const openEnded = /\+$/.test(normalizedHeader);
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
  const hasBusinessTransitSignal = /参考时效|全程时效|派送时效|运输时效|航程时效|船期|开船|发车|提取|起飞|飞|派送|时效[:：]?\d/i.test(compactText);
  const isFalseTransitSignal = /时效赔付|时效延误|延误赔偿|时效不保证|超时不赔|保留\d+(?:天|日)|\d+(?:天|日)后退回|无法送货上门/.test(compactText);
  if ((options.requireKeyword && !hasBusinessTransitSignal) || (isFalseTransitSignal && !hasBusinessTransitSignal)) {
    return undefined;
  }
  const match = compactText.match(TRANSIT_DAY_PATTERN);
  if (!match) {
    return undefined;
  }
  if (options.compactLabel) {
    return match[2] ? `${match[1]}-${match[2]}天` : `${match[1]}天`;
  }
  return text;
}

const TRANSIT_DAY_PATTERN = /(\d+(?:\.\d+)?)(?:[-~至到](\d+(?:\.\d+)?))?(?:自然)?(?:天|日|days?)/i;

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

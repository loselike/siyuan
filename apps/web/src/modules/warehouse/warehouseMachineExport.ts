import { addRowsWorksheet, createWorkbook, downloadWorkbook, type ExcelCellValue, type SimpleWorkbook } from '../shared/excel';
import { formatBeijingDate, formatBeijingDateTime } from '../shared/format';
import { splitWarehouseDeviceRemark } from './warehouseDeviceRemark';
import { resolveWarehouseMeasurementStatusPresentation } from './warehouseMeasurementStatus';

export const warehouseMachineImportHeaders = [
  '条码',
  '实重',
  '长',
  '宽',
  '高',
  '件数'
] as const;

export const warehouseMachineImportColumnWidths = [32, 12, 10, 10, 10, 10] as const;

export const warehouseMachineExportHeaders = [
  '站点',
  '客户编号',
  '客户名称',
  '快递单号',
  '客户编号-快递单号',
  '件数',
  '单件实重 KG',
  '长 cm',
  '宽 cm',
  '高 cm',
  '尺寸 cm',
  '单件体积 CBM',
  '围长 cm',
  '单件5000材积 KG',
  '单件6000材积 KG',
  '扫描时间',
  '入仓时间',
  '设备号',
  '操作人',
  '操作时间',
  '总实重 KG',
  '总体积 CBM',
  '总5000材积 KG',
  '总6000材积 KG',
  '理货状态',
  '测量状态',
  '拆票状态',
  '合票状态',
  '出库状态',
  '在仓天数',
  '仓租 RMB',
  '备注',
  '异常'
] as const;

export const warehouseMachineExportColumnWidths = [
  12, 12, 18, 22, 32, 8, 12, 9, 9, 9, 16, 14, 10, 16, 16, 20, 20,
  16, 12, 20, 12, 14, 16, 16, 12, 12, 12, 12, 12, 10, 12, 24, 28
] as const;

export interface WarehouseMachineExportRecord {
  site?: string;
  customerCode: string;
  customerName?: string;
  domesticTrackingNo: string;
  combinedOrderNo?: string;
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  girthCm?: number;
  scanTime?: string;
  inboundAt?: string;
  createdAt?: string;
  createdBy?: string;
  scanSource?: string;
  tallyTaskId?: string;
  tallyTaskNo?: string;
  tallyStatus?: string;
  measurementStatus?: 'MEASURED' | 'PENDING_REMEASURE';
  splitStatus?: string;
  consolidationStatus?: string;
  outboundStatus?: string;
  warehouseDays?: number;
  warehouseRentAmountRmb?: number;
  remark?: string;
  manualException?: string;
  exceptions?: string[];
}

export function resolveWarehouseMachineExportRecords<T extends { id: string }>(records: T[], selectedIds: string[]) {
  if (!selectedIds.length) return { selected: false, records };
  const selectedIdSet = new Set(selectedIds);
  return { selected: true, records: records.filter((record) => selectedIdSet.has(record.id)) };
}

export function isWarehouseMachineExportReady(loadedQueryKey: string | null, currentQueryKey: string) {
  return loadedQueryKey !== null && loadedQueryKey === currentQueryKey;
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function buildWarehouseMachineExportRows(records: WarehouseMachineExportRecord[]): ExcelCellValue[][] {
  const rows: ExcelCellValue[][] = [[...warehouseMachineExportHeaders]];
  records.forEach((record) => {
    const pieceCount = Math.max(1, Math.floor(Number(record.packageCount) || 1));
    const singleCbm = (record.lengthCm * record.widthCm * record.heightCm) / 1_000_000;
    const singleVolumetricWeightKg5000 = (record.lengthCm * record.widthCm * record.heightCm) / 5_000;
    const singleVolumetricWeightKg6000 = (record.lengthCm * record.widthCm * record.heightCm) / 6_000;
    const sides = [record.lengthCm, record.widthCm, record.heightCm].sort((left, right) => right - left);
    const girthCm = record.girthCm ?? sides[0] + 2 * (sides[1] + sides[2]);
    const { deviceNo, businessRemark } = splitWarehouseDeviceRemark(record.scanSource, record.remark);
    const exceptions = [...(record.exceptions ?? []), ...(record.manualException ? [record.manualException] : [])]
      .filter(Boolean)
      .join('；');
    rows.push([
      record.site ?? '',
      record.customerCode,
      record.customerName ?? '',
      record.domesticTrackingNo,
      record.combinedOrderNo?.trim() || `${record.customerCode.trim()}-${record.domesticTrackingNo.trim()}`,
      pieceCount,
      record.weightKg,
      record.lengthCm,
      record.widthCm,
      record.heightCm,
      `${record.lengthCm}×${record.widthCm}×${record.heightCm}`,
      roundTo(singleCbm, 6),
      roundTo(girthCm, 0),
      roundTo(singleVolumetricWeightKg5000, 2),
      roundTo(singleVolumetricWeightKg6000, 2),
      record.scanTime ? formatBeijingDateTime(record.scanTime) : '',
      record.inboundAt ? formatBeijingDateTime(record.inboundAt) : '',
      deviceNo ?? '',
      record.createdBy ?? '',
      record.createdAt ? formatBeijingDateTime(record.createdAt) : '',
      roundTo(record.weightKg * pieceCount, 2),
      roundTo(singleCbm * pieceCount, 3),
      roundTo(singleVolumetricWeightKg5000 * pieceCount, 2),
      roundTo(singleVolumetricWeightKg6000 * pieceCount, 2),
      record.tallyStatus ?? '待理货',
      resolveWarehouseMeasurementStatusPresentation(record).label,
      record.splitStatus ?? '原始票',
      record.consolidationStatus ?? '未合票',
      record.outboundStatus ?? '未出库',
      record.warehouseDays ?? null,
      record.warehouseRentAmountRmb ?? null,
      businessRemark,
      exceptions
    ]);
  });
  return rows;
}

export function buildWarehouseMachineExportWorkbook(
  records: WarehouseMachineExportRecord[],
  worksheetName = '在仓数据'
): SimpleWorkbook {
  const workbook = createWorkbook();
  addRowsWorksheet(workbook, worksheetName, buildWarehouseMachineExportRows(records), {
    columnWidths: [...warehouseMachineExportColumnWidths],
    headerRow: true
  });
  return workbook;
}

export function buildWarehouseMachineImportTemplateWorkbook(): SimpleWorkbook {
  const workbook = createWorkbook();
  addRowsWorksheet(workbook, '机器过机数据', [[...warehouseMachineImportHeaders]], {
    columnWidths: [...warehouseMachineImportColumnWidths],
    headerRow: true
  });
  return workbook;
}

export async function downloadWarehouseMachineImportTemplate() {
  await downloadWorkbook(buildWarehouseMachineImportTemplateWorkbook(), '机器过机数据导入模板.xlsx');
}

export async function downloadWarehouseMachineExport(
  records: WarehouseMachineExportRecord[],
  selected: boolean,
  exportName = '在仓数据'
) {
  const physicalPieceCount = records.reduce(
    (sum, record) => sum + Math.max(1, Math.floor(Number(record.packageCount) || 1)),
    0
  );
  const scopeLabel = selected ? `已选${physicalPieceCount}件` : '全部';
  await downloadWorkbook(
    buildWarehouseMachineExportWorkbook(records, exportName),
    `${exportName}-${scopeLabel}-${formatBeijingDate(new Date()).replace(/-/g, '')}.xlsx`
  );
  return physicalPieceCount;
}

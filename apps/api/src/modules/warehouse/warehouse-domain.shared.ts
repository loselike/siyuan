import { BadRequestException } from '@nestjs/common';
import type {
  WarehouseManualReceiptCartonSpecInput,
  WarehouseManualReceiptCreateInput,
  WarehousePackageCreateInput,
  WarehousePackageSummary,
  WarehouseTallyTaskSummary,
  WarehouseTodayQuery
} from '@siyuan/shared';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const beijingUtcOffsetMs = 8 * 60 * 60 * 1000;
const oneDayMs = 24 * 60 * 60 * 1000;

function getBeijingDateKey(date: Date): string {
  const shifted = new Date(date.getTime() + beijingUtcOffsetMs);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBeijingDayRange(date: Date): { start: Date; end: Date } {
  const startTimestamp = Date.parse(`${getBeijingDateKey(date)}T00:00:00+08:00`);
  return { start: new Date(startTimestamp), end: new Date(startTimestamp + oneDayMs) };
}

export function buildWarehouseManualReceiptPackageInputs(
  input: WarehouseManualReceiptCreateInput
): WarehousePackageCreateInput[] {
  const parsedCombinedOrderNo = parseWarehouseCombinedOrderNo(input.combinedOrderNo);
  const customerOrderNo = input.customerOrderNo?.trim() || parsedCombinedOrderNo.customerOrderNo || input.customerCode?.trim() || '';
  const domesticTrackingNo = input.domesticTrackingNo?.trim() || parsedCombinedOrderNo.domesticTrackingNo;
  if (!Array.isArray(input.cartonSpecs) || input.cartonSpecs.length < 1) {
    throw new BadRequestException('请至少填写一条箱规');
  }
  const totalCartonSpecs = input.cartonSpecs.length;
  return input.cartonSpecs.map((spec: WarehouseManualReceiptCartonSpecInput, index: number) => {
    const rowNo = index + 1;
    const weightKg = Number(spec.weightKg);
    const lengthCm = Number(spec.lengthCm);
    const widthCm = Number(spec.widthCm);
    const heightCm = Number(spec.heightCm);
    const packageCount = Math.floor(Number(spec.packageCount));
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      throw new BadRequestException(`第 ${rowNo} 条箱规重量必须大于 0`);
    }
    if (!Number.isFinite(lengthCm) || lengthCm <= 0 || !Number.isFinite(widthCm) || widthCm <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
      throw new BadRequestException(`第 ${rowNo} 条箱规长宽高必须大于 0`);
    }
    if (!Number.isInteger(packageCount) || packageCount <= 0) {
      throw new BadRequestException(`第 ${rowNo} 条箱规件数必须为正整数`);
    }
    return {
      customerCode: input.customerCode,
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
      expectedTotalPackageCount: totalCartonSpecs,
      packageIndex: rowNo,
      packageCount,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      scanTime: input.scanTime,
      remark: input.remark,
      manualException: input.manualException,
      scanSource: input.scanSource ?? '手动添加'
    };
  });
}

export function parseWarehouseCombinedOrderNo(value?: string) {
  const normalized = value?.trim() ?? '';
  const separatorIndex = normalized.search(/[-－—–]/);
  if (separatorIndex <= 0) {
    return { customerOrderNo: normalized, domesticTrackingNo: '' };
  }
  return {
    customerOrderNo: normalized.slice(0, separatorIndex).trim(),
    domesticTrackingNo: normalized.slice(separatorIndex + 1).trim()
  };
}

export function resolveWarehouseTodayRange(query: WarehouseTodayQuery) {
  const now = new Date();
  const preset = query.datePreset ?? 'TODAY';
  const todayRange = getBeijingDayRange(now);
  let start = todayRange.start;
  let end = todayRange.end;
  if (preset === 'WEEK') {
    const day = new Date(start.getTime() + beijingUtcOffsetMs).getUTCDay() || 7;
    start = new Date(start.getTime() - (day - 1) * oneDayMs);
    end = new Date(start.getTime() + 7 * oneDayMs);
  } else if (preset === 'LAST_7_DAYS') {
    start = new Date(start.getTime() - 6 * oneDayMs);
  } else if (preset === 'MONTH') {
    const monthKey = `${getBeijingDateKey(now).slice(0, 7)}-01`;
    start = new Date(`${monthKey}T00:00:00+08:00`);
    const shifted = new Date(start.getTime() + beijingUtcOffsetMs);
    end = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1, -8));
  } else if (preset === 'CUSTOM') {
    start = query.customFrom ? new Date(`${query.customFrom}T00:00:00+08:00`) : start;
    end = query.customTo ? new Date(Date.parse(`${query.customTo}T00:00:00+08:00`) + oneDayMs) : end;
  }
  return { start, end };
}

export function createWarehouseInboundLabelNo(
  customerCode: string,
  domesticTrackingNo: string,
  packageIndex: number,
  totalPackages: number
): string {
  return `${customerCode}-${domesticTrackingNo}-${packageIndex}/${totalPackages}`;
}

export function buildWarehouseTallyLabelQrContent(task: WarehouseTallyTaskSummary, labelNo: string): string {
  return JSON.stringify({
    type: 'WAREHOUSE_TALLY_LABEL',
    labelNo,
    taskNo: task.taskNo,
    customerCode: task.customerCode,
    date: (task.completedAt ?? new Date().toISOString()).slice(0, 10),
    packageCount: task.completedPackageCount ?? task.packageCount,
    sourcePackageId: task.sourcePackageId,
    sourceCombinedOrderNo: task.sourceCombinedOrderNo
  });
}

export function normalizeOrderEntryPackageIds(value?: string | string[]): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(new Set(values.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean)));
}

export function warehousePackageActualWeightTotal(
  pkg: Pick<WarehousePackageSummary, 'sourcePackageId' | 'weightKg' | 'packageCount'>
): number {
  return pkg.sourcePackageId ? pkg.weightKg : pkg.weightKg * pkg.packageCount;
}

export function warehousePackageSplitTotals(packages: WarehousePackageSummary[]) {
  return {
    packageCount: packages.reduce((sum, pkg) => sum + pkg.packageCount, 0),
    weightKg: roundMoney(packages.reduce((sum, pkg) => sum + warehousePackageActualWeightTotal(pkg), 0)),
    cbm: roundMoney(packages.reduce((sum, pkg) => sum + pkg.cbm, 0)),
    volumetricWeightKg: roundMoney(packages.reduce((sum, pkg) => sum + pkg.volumetricWeightKg, 0)),
    volumetricWeightKg5000: roundMoney(packages.reduce((sum, pkg) => sum + (pkg.volumetricWeightKg5000 ?? 0), 0))
  };
}

export function nextWarehouseSplitSequence(rootCombinedOrderNo: string, combinedOrderNos: string[]) {
  const prefix = `${rootCombinedOrderNo}-`;
  return combinedOrderNos.reduce((max, combinedOrderNo) => {
    if (!combinedOrderNo.startsWith(prefix)) return max;
    const suffix = Number(combinedOrderNo.slice(prefix.length));
    return Number.isInteger(suffix) && suffix > max ? suffix : max;
  }, 0) + 1;
}

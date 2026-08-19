import {
  RuntimeInputValidationError,
  defineRuntimeSchema
} from './runtime-schema.js';
import type {
  WarehouseManualReceiptCartonSpecInput,
  WarehouseManualReceiptCreateInput,
  WarehouseSameSpecReplenishInput
} from './warehouse.js';

const SUPPLEMENT_COUNT_ERROR = '补录箱数必须为 1 至 500 的正整数';
const REQUEST_ID_ERROR = '页面已更新，请刷新后重新发起补录';
const MANUAL_RECEIPT_CARTON_SPECS_ERROR = '请至少填写一条箱规';

export const warehouseSameSpecReplenishInputSchema = defineRuntimeSchema<WarehouseSameSpecReplenishInput>((value) => {
  const input = isRecord(value) ? value : {};
  const supplementCount = parseSupplementCount(input.supplementCount);
  const requestId = typeof input.requestId === 'string' ? input.requestId.trim() : '';

  if (!requestId || requestId.length > 100) {
    throw new RuntimeInputValidationError(REQUEST_ID_ERROR);
  }

  return { supplementCount, requestId };
});

export const warehouseManualReceiptCreateInputSchema = defineRuntimeSchema<WarehouseManualReceiptCreateInput>((value) => {
  const input = isRecord(value) ? value : {};
  const customerCode = parseOptionalString(input.customerCode, '客户编号格式不正确');
  const customerOrderNo = parseOptionalString(input.customerOrderNo, '客户单号格式不正确');
  const combinedOrderNo = parseOptionalString(input.combinedOrderNo, '合并单号格式不正确');
  const domesticTrackingNo = parseOptionalString(input.domesticTrackingNo, '快递单号格式不正确') ?? '';
  const scanTime = parseOptionalString(input.scanTime, '扫描时间格式不正确');
  const remark = parseOptionalString(input.remark, '备注格式不正确');
  const manualException = parseOptionalString(input.manualException, '异常说明格式不正确');
  const scanSource = parseOptionalString(input.scanSource, '扫描来源格式不正确');

  if (!Array.isArray(input.cartonSpecs) || input.cartonSpecs.length < 1) {
    throw new RuntimeInputValidationError(MANUAL_RECEIPT_CARTON_SPECS_ERROR);
  }

  const cartonSpecs = input.cartonSpecs.map(parseManualReceiptCartonSpec);
  return {
    ...(customerCode === undefined ? {} : { customerCode }),
    ...(customerOrderNo === undefined ? {} : { customerOrderNo }),
    ...(combinedOrderNo === undefined ? {} : { combinedOrderNo }),
    domesticTrackingNo,
    cartonSpecs,
    ...(scanTime === undefined ? {} : { scanTime }),
    ...(remark === undefined ? {} : { remark }),
    ...(manualException === undefined ? {} : { manualException }),
    ...(scanSource === undefined ? {} : { scanSource })
  };
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseSupplementCount(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new RuntimeInputValidationError(SUPPLEMENT_COUNT_ERROR);
  }
  return parsed;
}

function parseManualReceiptCartonSpec(value: unknown, index: number): WarehouseManualReceiptCartonSpecInput {
  const input = isRecord(value) ? value : {};
  const rowNo = index + 1;
  const weightKg = parsePositiveNumber(input.weightKg, `第 ${rowNo} 条箱规重量必须大于 0`);
  const dimensionError = `第 ${rowNo} 条箱规长宽高必须大于 0`;
  const lengthCm = parsePositiveNumber(input.lengthCm, dimensionError);
  const widthCm = parsePositiveNumber(input.widthCm, dimensionError);
  const heightCm = parsePositiveNumber(input.heightCm, dimensionError);
  const packageCount = parsePositiveInteger(input.packageCount, `第 ${rowNo} 条箱规件数必须为正整数`);
  return { weightKg, lengthCm, widthCm, heightCm, packageCount };
}

function parsePositiveNumber(value: unknown, message: string): number {
  const parsed = parseNumber(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new RuntimeInputValidationError(message);
  }
  return parsed;
}

function parsePositiveInteger(value: unknown, message: string): number {
  const parsed = parseNumber(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new RuntimeInputValidationError(message);
  }
  return parsed;
}

function parseNumber(value: unknown): number {
  return typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
}

function parseOptionalString(value: unknown, message: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new RuntimeInputValidationError(message);
  }
  return value;
}

import {
  RuntimeInputValidationError,
  defineRuntimeSchema
} from './runtime-schema.js';
import type {
  WarehouseManualReceiptCartonSpecInput,
  WarehouseManualReceiptCreateInput,
  WarehousePackageCreateInput,
  WarehousePackageSplitInput,
  WarehousePackageUpdateInput,
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

export const warehousePackageCreateInputSchema = defineRuntimeSchema<WarehousePackageCreateInput>((value) => {
  const input = isRecord(value) ? value : {};
  const customerCode = parseOptionalString(input.customerCode, '客户编号格式不正确');
  const customerOrderNo = parseOptionalString(input.customerOrderNo, '客户单号格式不正确');
  const combinedOrderNo = parseOptionalString(input.combinedOrderNo, '合并单号格式不正确');
  const domesticTrackingNo = parseOptionalString(input.domesticTrackingNo, '快递单号格式不正确') ?? '';
  const expectedTotalPackageCount = parseLegacyPositiveInteger(
    input.expectedTotalPackageCount,
    '预计总箱数格式不正确'
  );
  const packageIndex = Math.min(
    expectedTotalPackageCount,
    parseLegacyPositiveInteger(input.packageIndex, '箱序号格式不正确')
  );
  const packageCount = parseLegacyPositiveInteger(input.packageCount, '件数格式不正确');
  const weightKg = parseLegacyMeasurement(input.weightKg, '重量格式不正确');
  const lengthCm = parseLegacyMeasurement(input.lengthCm, '长宽高格式不正确');
  const widthCm = parseLegacyMeasurement(input.widthCm, '长宽高格式不正确');
  const heightCm = parseLegacyMeasurement(input.heightCm, '长宽高格式不正确');
  const scanTime = parseOptionalString(input.scanTime, '扫描时间格式不正确');
  const remark = parseOptionalString(input.remark, '备注格式不正确');
  const manualException = parseOptionalString(input.manualException, '异常说明格式不正确');
  const scanSource = parseOptionalString(input.scanSource, '扫描来源格式不正确');

  return {
    ...(customerCode === undefined ? {} : { customerCode }),
    ...(customerOrderNo === undefined ? {} : { customerOrderNo }),
    ...(combinedOrderNo === undefined ? {} : { combinedOrderNo }),
    domesticTrackingNo,
    expectedTotalPackageCount,
    packageIndex,
    packageCount,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    ...(scanTime === undefined ? {} : { scanTime }),
    ...(remark === undefined ? {} : { remark }),
    ...(manualException === undefined ? {} : { manualException }),
    ...(scanSource === undefined ? {} : { scanSource })
  };
});

export const warehousePackageSplitInputSchema = defineRuntimeSchema<WarehousePackageSplitInput>((value) => {
  const input = isRecord(value) ? value : {};
  if (input.pieces !== undefined) {
    if (!Array.isArray(input.pieces)) {
      throw new RuntimeInputValidationError('每票件数必须是大于 0 的整数');
    }
    if (input.pieces.length > 0) {
      const pieces = input.pieces.map((piece) => parsePositiveInteger(piece, '每票件数必须是大于 0 的整数'));
      if (pieces.length < 2) {
        throw new RuntimeInputValidationError('拆分票数至少为 2');
      }
      const remark = parseOptionalString(input.remark, '备注格式不正确');
      return {
        pieces,
        ...(remark === undefined ? {} : { remark })
      };
    }
  }

  const splitCount = parseLegacySplitCount(input.splitCount);
  const remark = parseOptionalString(input.remark, '备注格式不正确');
  return {
    splitCount,
    ...(remark === undefined ? {} : { remark })
  };
});

export const warehousePackageUpdateInputSchema = defineRuntimeSchema<WarehousePackageUpdateInput>((value) => {
  if (!isRecord(value)) {
    throw new RuntimeInputValidationError('包裹修改参数格式不正确');
  }
  const customerCode = parseOptionalString(value.customerCode, '客户编号格式不正确');
  const customerOrderNo = parseOptionalString(value.customerOrderNo, '客户单号格式不正确');
  const domesticTrackingNo = parseOptionalString(value.domesticTrackingNo, '快递单号格式不正确');
  const combinedOrderNo = parseOptionalString(value.combinedOrderNo, '合并单号格式不正确');
  const expectedTotalPackageCount = parseOptionalLegacyPositiveInteger(
    value.expectedTotalPackageCount,
    '预计总箱数格式不正确'
  );
  const packageIndex = parseOptionalLegacyPositiveInteger(value.packageIndex, '箱序号格式不正确');
  const packageCount = parseOptionalLegacyPositiveInteger(value.packageCount, '件数格式不正确');
  const weightKg = parseOptionalLegacyMeasurement(value.weightKg, '重量格式不正确');
  const lengthCm = parseOptionalLegacyMeasurement(value.lengthCm, '长宽高格式不正确');
  const widthCm = parseOptionalLegacyMeasurement(value.widthCm, '长宽高格式不正确');
  const heightCm = parseOptionalLegacyMeasurement(value.heightCm, '长宽高格式不正确');
  const scanTime = parseOptionalLegacyScanTime(value.scanTime);
  const remark = parseOptionalString(value.remark, '备注格式不正确');
  const manualException = parseOptionalString(value.manualException, '异常说明格式不正确');

  return {
    ...(customerCode === undefined ? {} : { customerCode }),
    ...(customerOrderNo === undefined ? {} : { customerOrderNo }),
    ...(domesticTrackingNo === undefined ? {} : { domesticTrackingNo }),
    ...(combinedOrderNo === undefined ? {} : { combinedOrderNo }),
    ...(expectedTotalPackageCount === undefined ? {} : { expectedTotalPackageCount }),
    ...(packageIndex === undefined ? {} : { packageIndex }),
    ...(packageCount === undefined ? {} : { packageCount }),
    ...(weightKg === undefined ? {} : { weightKg }),
    ...(lengthCm === undefined ? {} : { lengthCm }),
    ...(widthCm === undefined ? {} : { widthCm }),
    ...(heightCm === undefined ? {} : { heightCm }),
    ...(scanTime === undefined ? {} : { scanTime: scanTime as string }),
    ...(remark === undefined ? {} : { remark }),
    ...(manualException === undefined ? {} : { manualException })
  };
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

function parseLegacyPositiveInteger(value: unknown, message: string): number {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return 1;
  }
  const parsed = parseFiniteNumber(value, message);
  return Math.max(1, Math.floor(parsed || 1));
}

function parseLegacyMeasurement(value: unknown, message: string): number {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return 0;
  }
  return parseFiniteNumber(value, message);
}

function parseOptionalLegacyPositiveInteger(value: unknown, message: string): number | undefined {
  return value === undefined ? undefined : parseLegacyPositiveInteger(value, message);
}

function parseOptionalLegacyMeasurement(value: unknown, message: string): number | undefined {
  return value === undefined ? undefined : parseLegacyMeasurement(value, message);
}

function parseOptionalLegacyScanTime(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') {
    throw new RuntimeInputValidationError('扫描时间格式不正确');
  }
  return value;
}

function parseLegacySplitCount(value: unknown): number {
  const splitCount = Math.floor(parseFiniteNumber(value, '拆分票数至少为 2'));
  if (splitCount < 2) {
    throw new RuntimeInputValidationError('拆分票数至少为 2');
  }
  return splitCount;
}

function parseFiniteNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new RuntimeInputValidationError(message);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new RuntimeInputValidationError(message);
  }
  return parsed;
}

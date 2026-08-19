import {
  RuntimeInputValidationError,
  defineRuntimeSchema
} from './runtime-schema.js';
import type { WarehouseSameSpecReplenishInput } from './warehouse.js';

const SUPPLEMENT_COUNT_ERROR = '补录箱数必须为 1 至 500 的正整数';
const REQUEST_ID_ERROR = '页面已更新，请刷新后重新发起补录';

export const warehouseSameSpecReplenishInputSchema = defineRuntimeSchema<WarehouseSameSpecReplenishInput>((value) => {
  const input = isRecord(value) ? value : {};
  const supplementCount = parseSupplementCount(input.supplementCount);
  const requestId = typeof input.requestId === 'string' ? input.requestId.trim() : '';

  if (!requestId || requestId.length > 100) {
    throw new RuntimeInputValidationError(REQUEST_ID_ERROR);
  }

  return { supplementCount, requestId };
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

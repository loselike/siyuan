import { describe, expect, it } from 'vitest';
import { RuntimeInputValidationError } from './runtime-schema.js';
import {
  warehouseManualReceiptCreateInputSchema,
  warehouseSameSpecReplenishInputSchema
} from './warehouse-input.js';

describe('warehouseSameSpecReplenishInputSchema', () => {
  it('normalizes the legacy numeric-string form and strips unknown fields', () => {
    expect(warehouseSameSpecReplenishInputSchema.parse({
      supplementCount: '2',
      requestId: '  phase3-request  ',
      ignored: 'not-forwarded'
    })).toEqual({ supplementCount: 2, requestId: 'phase3-request' });
  });

  it.each([
    [undefined],
    [null],
    [[]],
    [{}],
    [{ supplementCount: true, requestId: 'phase3-request' }],
    [{ supplementCount: 1.5, requestId: 'phase3-request' }],
    [{ supplementCount: 0, requestId: 'phase3-request' }],
    [{ supplementCount: 501, requestId: 'phase3-request' }]
  ])('rejects an invalid supplement count before the request reaches the API adapter', (input) => {
    expect(() => warehouseSameSpecReplenishInputSchema.parse(input)).toThrow(
      new RuntimeInputValidationError('补录箱数必须为 1 至 500 的正整数')
    );
  });

  it.each([
    [{ supplementCount: 2 }],
    [{ supplementCount: 2, requestId: 123 }],
    [{ supplementCount: 2, requestId: '   ' }],
    [{ supplementCount: 2, requestId: 'x'.repeat(101) }]
  ])('rejects an invalid idempotency request identifier', (input) => {
    expect(() => warehouseSameSpecReplenishInputSchema.parse(input)).toThrow(
      new RuntimeInputValidationError('页面已更新，请刷新后重新发起补录')
    );
  });
});

describe('warehouseManualReceiptCreateInputSchema', () => {
  it('normalizes nested legacy numeric strings and strips undeclared fields', () => {
    expect(warehouseManualReceiptCreateInputSchema.parse({
      customerCode: ' 9409 ',
      customerOrderNo: '9409',
      domesticTrackingNo: ' KY-MANUAL-001 ',
      combinedOrderNo: '9409-KY-MANUAL-001',
      cartonSpecs: [{
        weightKg: '8.5',
        lengthCm: '40',
        widthCm: 30,
        heightCm: '20',
        packageCount: '2',
        ignored: 'not-forwarded'
      }],
      remark: ' 保留原始空格，既有领域层负责 trim ',
      ignored: 'not-forwarded'
    })).toEqual({
      customerCode: ' 9409 ',
      customerOrderNo: '9409',
      domesticTrackingNo: ' KY-MANUAL-001 ',
      combinedOrderNo: '9409-KY-MANUAL-001',
      cartonSpecs: [{ weightKg: 8.5, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: 2 }],
      remark: ' 保留原始空格，既有领域层负责 trim '
    });
  });

  it.each([
    [undefined],
    [null],
    [[]],
    [{}],
    [{ cartonSpecs: [] }],
    [{ cartonSpecs: 'not-an-array' }]
  ])('rejects a request without at least one carton specification', (input) => {
    expect(() => warehouseManualReceiptCreateInputSchema.parse(input)).toThrow(
      new RuntimeInputValidationError('请至少填写一条箱规')
    );
  });

  it.each([
    [[null], '第 1 条箱规重量必须大于 0'],
    [[{ weightKg: true, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: 1 }], '第 1 条箱规重量必须大于 0'],
    [[{ weightKg: 8, lengthCm: 0, widthCm: 30, heightCm: 20, packageCount: 1 }], '第 1 条箱规长宽高必须大于 0'],
    [[{ weightKg: 8, lengthCm: 40, widthCm: [], heightCm: 20, packageCount: 1 }], '第 1 条箱规长宽高必须大于 0'],
    [[{ weightKg: 8, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: 1.5 }], '第 1 条箱规件数必须为正整数'],
    [[{ weightKg: 8, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: false }], '第 1 条箱规件数必须为正整数'],
    [[
      { weightKg: 8, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: 1 },
      { weightKg: 0, lengthCm: 30, widthCm: 20, heightCm: 10, packageCount: 1 }
    ], '第 2 条箱规重量必须大于 0']
  ])('rejects an invalid nested carton specification with its stable row message', (cartonSpecs, message) => {
    expect(() => warehouseManualReceiptCreateInputSchema.parse({ cartonSpecs })).toThrow(
      new RuntimeInputValidationError(message)
    );
  });

  it.each([
    ['customerCode', 9409, '客户编号格式不正确'],
    ['customerOrderNo', {}, '客户单号格式不正确'],
    ['combinedOrderNo', [], '合并单号格式不正确'],
    ['domesticTrackingNo', true, '快递单号格式不正确'],
    ['scanTime', 123, '扫描时间格式不正确'],
    ['remark', false, '备注格式不正确'],
    ['manualException', {}, '异常说明格式不正确'],
    ['scanSource', [], '扫描来源格式不正确']
  ])('rejects a non-string %s field', (field, value, message) => {
    expect(() => warehouseManualReceiptCreateInputSchema.parse({
      [field]: value,
      cartonSpecs: [{ weightKg: 8, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: 1 }]
    })).toThrow(new RuntimeInputValidationError(message));
  });
});

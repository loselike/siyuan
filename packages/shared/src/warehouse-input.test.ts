import { describe, expect, it } from 'vitest';
import {
  warehousePackageDeleteInputSchema,
  warehousePackageExceptionInputSchema,
  warehousePackageRemarkInputSchema,
  warehousePackageUpdateInputSchema
} from './warehouse-input.js';

describe('warehouse package runtime input schemas', () => {
  it('normalizes update inputs while preserving legacy number coercion and dropping unknown fields', () => {
    expect(warehousePackageUpdateInputSchema.parse({
      customerCode: '9409',
      customerOrderNo: null,
      domesticTrackingNo: 'KY-001',
      combinedOrderNo: undefined,
      expectedTotalPackageCount: '3.9',
      packageIndex: '2',
      packageCount: null,
      weightKg: '6.5',
      lengthCm: '',
      widthCm: -1,
      heightCm: '20',
      scanTime: null,
      remark: '',
      manualException: '外箱破损',
      ignored: 'legacy unknown field'
    })).toEqual({
      customerCode: '9409',
      domesticTrackingNo: 'KY-001',
      expectedTotalPackageCount: 3,
      packageIndex: 2,
      packageCount: 1,
      weightKg: 6.5,
      lengthCm: 0,
      widthCm: -1,
      heightCm: 20,
      scanTime: '',
      remark: '',
      manualException: '外箱破损'
    });
  });

  it.each([
    [null, '请求体格式不正确'],
    [[], '请求体格式不正确'],
    [{ customerCode: 9409 }, '客户编号格式不正确'],
    [{ scanTime: 123 }, '扫描时间格式不正确'],
    [{ remark: null }, '备注格式不正确'],
    [{ manualException: false }, '异常说明格式不正确'],
    [{ packageCount: true }, '件数格式不正确'],
    [{ weightKg: {} }, '重量格式不正确'],
    [{ lengthCm: [50] }, '长宽高格式不正确'],
    [{ weightKg: 'NaN' }, '重量格式不正确'],
    [{ weightKg: 'Infinity' }, '重量格式不正确'],
    [{ packageCount: '-Infinity' }, '件数格式不正确']
  ])('rejects malformed update input %# with a stable message', (value, message) => {
    expect(() => warehousePackageUpdateInputSchema.parse(value)).toThrow(message as string);
  });

  it('preserves remark and exception empty-body and nullable-clear behavior', () => {
    expect(warehousePackageRemarkInputSchema.parse({})).toEqual({});
    expect(warehousePackageRemarkInputSchema.parse({ remark: null })).toEqual({});
    expect(warehousePackageRemarkInputSchema.parse({ remark: '' })).toEqual({ remark: '' });
    expect(warehousePackageExceptionInputSchema.parse({})).toEqual({});
    expect(warehousePackageExceptionInputSchema.parse({ manualException: null })).toEqual({});
    expect(warehousePackageExceptionInputSchema.parse({ manualException: '' })).toEqual({ manualException: '' });
    expect(() => warehousePackageRemarkInputSchema.parse({ remark: 1 })).toThrow('备注格式不正确');
    expect(() => warehousePackageExceptionInputSchema.parse({ manualException: 1 })).toThrow('异常说明格式不正确');
  });

  it('preserves delete business validation inputs and rejects malformed structures', () => {
    expect(warehousePackageDeleteInputSchema.parse({ ids: [], reason: '' })).toEqual({ ids: [], reason: '' });
    expect(warehousePackageDeleteInputSchema.parse({ ids: [' package-1 '], reason: ' 复核删除 ' })).toEqual({
      ids: [' package-1 '],
      reason: ' 复核删除 '
    });
    expect(warehousePackageDeleteInputSchema.parse({})).toEqual({ ids: [], reason: '' });
    expect(() => warehousePackageDeleteInputSchema.parse({ ids: 'package-1', reason: '删除' })).toThrow('包裹编号格式不正确');
    expect(() => warehousePackageDeleteInputSchema.parse({ ids: [1], reason: '删除' })).toThrow('包裹编号格式不正确');
    expect(() => warehousePackageDeleteInputSchema.parse({ ids: ['package-1'], reason: 1 })).toThrow('删除原因格式不正确');
  });
});

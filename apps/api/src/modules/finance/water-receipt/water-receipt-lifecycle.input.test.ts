import { describe, expect, it } from 'vitest';
import {
  parseWaterReceiptCreateInput,
  parseWaterReceiptMarkArrivedInput,
  parseWaterReceiptUpdateInput,
  parseWaterReceiptVoidInput
} from './water-receipt-lifecycle.input.js';

describe('water receipt lifecycle runtime inputs', () => {
  it('preserves valid create input and legacy numeric JSON strings', () => {
    expect(parseWaterReceiptCreateInput({
      customerCode: '9409',
      site: '思远收款',
      receiptMethod: '招商银行',
      receiptDate: '2026-08-11T10:00:00.000Z',
      currency: 'RMB',
      amount: '100.25',
      paymentNo: 20260811001,
      remark: '测试水单'
    })).toEqual({
      customerCode: '9409',
      site: '思远收款',
      receiptMethod: '招商银行',
      receiptDate: '2026-08-11T10:00:00.000Z',
      currency: 'RMB',
      amount: 100.25,
      paymentNo: '20260811001',
      remark: '测试水单'
    });
  });

  it('preserves partial update, arrival and void contracts', () => {
    expect(parseWaterReceiptUpdateInput({ paymentNo: 'PAY-EDITED', amount: '88.5', adjustReason: '修正金额' })).toEqual({
      paymentNo: 'PAY-EDITED',
      amount: 88.5,
      adjustReason: '修正金额'
    });
    expect(parseWaterReceiptMarkArrivedInput({ arrivedAt: '2026-08-11T11:00:00.000Z', note: '财务确认' })).toEqual({
      arrivedAt: '2026-08-11T11:00:00.000Z',
      note: '财务确认'
    });
    expect(parseWaterReceiptVoidInput({ reason: '重复录入' })).toEqual({ reason: '重复录入' });
    expect(parseWaterReceiptMarkArrivedInput(undefined)).toEqual({});
    expect(parseWaterReceiptVoidInput(undefined)).toEqual({});
  });

  it.each([
    [parseWaterReceiptCreateInput, { receiptDate: '2026-08-11', amount: 1, paymentNo: 'P-1' }, '结算方式不能为空'],
    [parseWaterReceiptCreateInput, { receiptMethod: '招商银行', receiptDate: 'invalid', amount: 1, paymentNo: 'P-1' }, '到账日期无效'],
    [parseWaterReceiptCreateInput, { receiptMethod: '招商银行', receiptDate: '2026-08-11', amount: 0, paymentNo: 'P-1' }, '水单金额必须大于 0'],
    [parseWaterReceiptUpdateInput, { amount: 1 }, '付款编号不能为空'],
    [parseWaterReceiptUpdateInput, { paymentNo: 'P-1', receiptDate: 'invalid' }, '水单日期无效'],
    [parseWaterReceiptMarkArrivedInput, { arrivedAt: 'invalid' }, '到账时间无效'],
    [parseWaterReceiptVoidInput, { reason: 1 }, '请求数据格式错误']
  ])('rejects malformed lifecycle input before repository access: %j', (parser, input, message) => {
    expect(() => parser(input)).toThrow(message as string);
  });
});

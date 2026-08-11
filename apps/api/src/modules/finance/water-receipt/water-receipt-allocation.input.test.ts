import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { RuntimeInputPipe } from '../../runtime-input.pipe.js';
import { parseWaterReceiptMatchOrdersInput } from './water-receipt-allocation.input.js';

describe('parseWaterReceiptMatchOrdersInput', () => {
  it('preserves current and legacy valid contracts while normalizing numeric JSON strings', () => {
    expect(parseWaterReceiptMatchOrdersInput({
      amountCurrency: 'RMB',
      exchangeRate: '7.245',
      matches: [{ receivableId: 'receivable-1', receivableSourceType: 'SYSTEM', amount: '100.25' }]
    })).toEqual({
      amountCurrency: 'RMB',
      exchangeRate: 7.245,
      matches: [{ receivableId: 'receivable-1', receivableSourceType: 'SYSTEM', amount: 100.25 }]
    });

    expect(parseWaterReceiptMatchOrdersInput({
      matches: [{ receivableFinanceItemId: 'legacy-receivable-1', amount: 50 }]
    })).toEqual({
      matches: [{ receivableFinanceItemId: 'legacy-receivable-1', amount: 50 }]
    });
  });

  it.each([
    [{}, '请选择要匹配的应收费用'],
    [{ amountCurrency: 'USD', matches: [{ receivableId: 'r-1', amount: 1 }] }, '匹配金额币种无效'],
    [{ matches: [{ receivableId: 'r-1', receivableSourceType: 'EXTERNAL', amount: 1 }] }, '应收来源类型无效'],
    [{ matches: [{ receivableId: 'r-1', amount: 0 }] }, '匹配金额必须大于 0'],
    [{ matches: [{ amount: 1 }] }, '应收费用不能为空']
  ])('rejects malformed finance input before it reaches a repository: %j', (input, message) => {
    expect(() => parseWaterReceiptMatchOrdersInput(input)).toThrow(message);
  });

  it('uses the same parser through the reusable Nest pipe', () => {
    const pipe = new RuntimeInputPipe(parseWaterReceiptMatchOrdersInput);
    expect(() => pipe.transform({ matches: 'not-an-array' })).toThrow(BadRequestException);
  });
});

import { describe, expect, it } from 'vitest';
import { RuntimeInputValidationError } from './runtime-schema.js';
import { warehouseSameSpecReplenishInputSchema } from './warehouse-input.js';

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

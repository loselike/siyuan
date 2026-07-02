import { describe, expect, it } from 'vitest';

import {
  calculateFinanceEntryFeeAmount,
  createFinanceEntryFeeDraft,
  roundFinanceNumber
} from './entryModel';

describe('finance entry model', () => {
  it('rounds invalid and valid finance numbers safely', () => {
    expect(roundFinanceNumber(Number.NaN)).toBe(0);
    expect(roundFinanceNumber(12.345)).toBe(12.35);
    expect(roundFinanceNumber(12.344)).toBe(12.34);
    expect(roundFinanceNumber(12.3456, 3)).toBe(12.346);
  });

  it('calculates fee amount from charge weight and unit price first', () => {
    expect(
      calculateFinanceEntryFeeAmount({
        id: 'fee-1',
        type: 'BUSINESS_COST',
        name: '业务员成本',
        amount: 999,
        chargeWeightKg: 35,
        unitPrice: 20
      })
    ).toBe(700);
  });

  it('falls back to manual amount when weight or unit price is missing', () => {
    expect(
      calculateFinanceEntryFeeAmount({
        id: 'fee-2',
        type: 'RECEIVABLE',
        name: '运费',
        amount: 1864.205
      })
    ).toBe(1864.21);
    expect(
      calculateFinanceEntryFeeAmount({
        id: 'fee-3',
        type: 'PAYABLE',
        name: '代理成本'
      })
    ).toBe(0);
  });

  it('creates fee drafts with stable defaults for each fee type', () => {
    expect(createFinanceEntryFeeDraft('RECEIVABLE')).toMatchObject({
      type: 'RECEIVABLE',
      name: '运费',
      currency: 'RMB'
    });
    expect(createFinanceEntryFeeDraft('BUSINESS_COST')).toMatchObject({
      type: 'BUSINESS_COST',
      name: '业务员成本',
      currency: 'RMB'
    });
    expect(createFinanceEntryFeeDraft('PAYABLE')).toMatchObject({
      type: 'PAYABLE',
      name: '代理成本',
      currency: 'RMB'
    });
  });

  it('normalizes CNY currency to RMB when creating fee drafts', () => {
    const draft = createFinanceEntryFeeDraft('RECEIVABLE', {
      name: '报关费',
      currency: 'cny',
      settlementMethod: '农村商业银行'
    });

    expect(draft).toMatchObject({
      type: 'RECEIVABLE',
      name: '报关费',
      currency: 'RMB',
      settlementMethod: '农村商业银行'
    });
    expect(draft.id).toMatch(/^finance-entry-/);
  });
});

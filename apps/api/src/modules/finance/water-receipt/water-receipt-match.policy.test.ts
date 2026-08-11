import { describe, expect, it } from 'vitest';
import {
  normalizeWaterReceiptCurrency,
  normalizeWaterReceiptMatchAmountCurrency,
  planWaterReceiptMatchAmount
} from './water-receipt-match.policy.js';

describe('water receipt match policy', () => {
  it('normalizes legacy CNY and defaults omitted input amounts to source currency', () => {
    expect(normalizeWaterReceiptCurrency('cny')).toBe('RMB');
    expect(normalizeWaterReceiptCurrency()).toBe('RMB');
    expect(normalizeWaterReceiptMatchAmountCurrency()).toBe('SOURCE');
  });

  it('keeps source-currency amounts unchanged for a same-currency match', () => {
    expect(planWaterReceiptMatchAmount({
      amountCurrency: 'SOURCE',
      submittedAmount: 88.23,
      receiptCurrency: 'USD',
      receivableCurrency: 'usd',
      receiptExchangeRate: 7.2,
      receivableExchangeRate: 7.2
    })).toMatchObject({
      amount: 88.23,
      receivableAmount: 88.23,
      receiptCurrency: 'USD',
      receivableCurrency: 'USD'
    });
  });

  it('converts RMB input into source currency using the server rate', () => {
    expect(planWaterReceiptMatchAmount({
      amountCurrency: 'RMB',
      submittedAmount: 720,
      submittedExchangeRate: 7.2,
      receiptCurrency: 'USD',
      receivableCurrency: 'USD',
      receiptExchangeRate: 7.2,
      receivableExchangeRate: 7.2
    })).toEqual({
      amount: 100,
      receivableAmount: 100,
      rmbAmount: 720,
      receiptCurrency: 'USD',
      receivableCurrency: 'USD',
      receiptExchangeRate: 7.2,
      receivableExchangeRate: 7.2
    });
  });

  it('allows a legacy RMB-to-RMB caller to omit the fixed 1:1 rate', () => {
    expect(planWaterReceiptMatchAmount({
      amountCurrency: 'RMB',
      submittedAmount: 120,
      receiptCurrency: 'RMB',
      receivableCurrency: 'CNY',
      receiptExchangeRate: 1,
      receivableExchangeRate: 1
    }).amount).toBe(120);
  });

  it.each([
    {
      name: 'invalid amount mode',
      run: () => normalizeWaterReceiptMatchAmountCurrency('USD'),
      message: '匹配金额币种无效'
    },
    {
      name: 'non-positive amount',
      run: () => planWaterReceiptMatchAmount({ amountCurrency: 'SOURCE', submittedAmount: 0, receiptCurrency: 'RMB', receivableCurrency: 'RMB', receiptExchangeRate: 1, receivableExchangeRate: 1 }),
      message: '匹配金额必须大于 0'
    },
    {
      name: 'different source currencies',
      run: () => planWaterReceiptMatchAmount({ amountCurrency: 'SOURCE', submittedAmount: 1, receiptCurrency: 'USD', receivableCurrency: 'RMB', receiptExchangeRate: 7.2, receivableExchangeRate: 1 }),
      message: '水单币种与应收币种不一致'
    },
    {
      name: 'stale exchange rate',
      run: () => planWaterReceiptMatchAmount({ amountCurrency: 'RMB', submittedAmount: 720, submittedExchangeRate: 7.1, receiptCurrency: 'USD', receivableCurrency: 'USD', receiptExchangeRate: 7.2, receivableExchangeRate: 7.2 }),
      message: '汇率已更新，请刷新后重新匹配'
    }
  ])('rejects $name with the existing API message', ({ run, message }) => {
    expect(run).toThrow(message);
  });
});


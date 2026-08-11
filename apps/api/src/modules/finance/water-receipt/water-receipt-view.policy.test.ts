import { BadRequestException } from '@nestjs/common';
import type { WaterReceiptSummary, WaterReceiptVoucherSummary } from '@siyuan/shared';
import { describe, expect, it } from 'vitest';
import {
  buildWaterReceiptListTotals,
  buildWaterReceiptVoucherAuditSnapshot,
  redactWaterReceiptVoucher,
  sanitizeWaterReceiptPaymentNo
} from './water-receipt-view.policy.js';

const voucher: WaterReceiptVoucherSummary = {
  id: 'voucher-2',
  waterReceiptId: 'receipt-1',
  fileName: 'new.png',
  mimeType: 'image/png',
  sizeBytes: 2048,
  uploadedBy: '财务甲',
  createdAt: '2026-08-12T02:00:00.000Z'
};

function receipt(overrides: Partial<WaterReceiptSummary> = {}): WaterReceiptSummary {
  return {
    id: 'receipt-1',
    receiptNo: 'SD20260812001',
    site: '广州',
    receiptDate: '2026-08-12T00:00:00.000Z',
    currency: 'RMB',
    amount: 0,
    matchedAmount: 0,
    balance: 0,
    status: 'PENDING',
    matches: [],
    ...overrides
  };
}

describe('water receipt view policy', () => {
  it('keeps the existing payment-number cleanup and length limit', () => {
    expect(sanitizeWaterReceiptPaymentNo(' \u0000PAY<2026>\u200b-01 ')).toBe('PAY2026-01');
    expect(sanitizeWaterReceiptPaymentNo(' \u200b<> ')).toBeUndefined();
    expect(sanitizeWaterReceiptPaymentNo()).toBeUndefined();
    expect(sanitizeWaterReceiptPaymentNo('A'.repeat(80))).toBe('A'.repeat(80));
    expect(() => sanitizeWaterReceiptPaymentNo('A'.repeat(81)))
      .toThrow(new BadRequestException('付款编号不能超过 80 个字符'));
  });

  it('redacts vouchers without mutating rows and keeps visible rows by identity', () => {
    const row = receipt({ voucher });
    expect(redactWaterReceiptVoucher(row, true)).toBe(row);
    const redacted = redactWaterReceiptVoucher(row, false);
    expect(redacted).not.toBe(row);
    expect(redacted.voucher).toBeUndefined();
    expect(row.voucher).toBe(voucher);
  });

  it('keeps the existing voucher audit fields', () => {
    expect(buildWaterReceiptVoucherAuditSnapshot(receipt(), voucher, {
      ...voucher,
      id: 'voucher-1',
      fileName: 'old.png'
    })).toEqual({
      waterReceiptId: 'receipt-1',
      receiptNo: 'SD20260812001',
      voucherId: 'voucher-2',
      fileName: 'new.png',
      sizeBytes: 2048,
      mimeType: 'image/png',
      uploadedBy: '财务甲',
      uploadedAt: '2026-08-12T02:00:00.000Z',
      previousVoucherId: 'voucher-1',
      previousFileName: 'old.png'
    });
  });

  it('keeps totals, status counts, currency groups and fallback amounts unchanged', () => {
    const totals = buildWaterReceiptListTotals([
      receipt({ amount: 10.2, matchedAmount: 2.3, balance: 7.9, rmbAmount: 10.2, rmbMatchedAmount: 2.3, rmbBalance: 7.9 }),
      receipt({ id: 'receipt-2', currency: 'USD', amount: 5.55, matchedAmount: 1.11, pendingAllocatedAmount: 0.44, availableAllocationAmount: 4, balance: 4.44, rmbAmount: 39.96, rmbMatchedAmount: 7.99, rmbPendingAllocatedAmount: 3.17, rmbAvailableAllocationAmount: 28.8, rmbBalance: 31.97, status: 'PARTIAL_MATCHED' }),
      receipt({ id: 'receipt-3', currency: 'USD', amount: 4.45, matchedAmount: 4.45, balance: 0, status: 'MATCHED' }),
      receipt({ id: 'receipt-4', amount: 1, matchedAmount: 1, balance: 0, status: 'ARCHIVED' })
    ]);

    expect(totals).toEqual({
      count: 4,
      pendingCount: 1,
      arrivedCount: 1,
      matchedCount: 1,
      archivedCount: 1,
      amount: 21.2,
      matchedAmount: 8.86,
      pendingAllocatedAmount: 0.44,
      availableAllocationAmount: 11.9,
      balance: 12.34,
      amountByCurrency: [
        { currency: 'RMB', amount: 11.2, matchedAmount: 3.3, balance: 7.9 },
        { currency: 'USD', amount: 10, matchedAmount: 5.56, balance: 4.44 }
      ],
      rmbAmount: 50.16,
      rmbMatchedAmount: 10.29,
      rmbPendingAllocatedAmount: 3.17,
      rmbAvailableAllocationAmount: 36.7,
      rmbBalance: 39.87
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import type {
  WaterReceiptListResponse,
  WaterReceiptSummary,
  WaterReceiptVoucherSummary
} from '@siyuan/shared';

export function sanitizeWaterReceiptPaymentNo(value?: string | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const cleaned = String(value).replace(/[\u0000-\u001f\u007f\u200b-\u200d\ufeff<>]/g, '').trim();
  if (!cleaned) return undefined;
  if (cleaned.length > 80) throw new BadRequestException('付款编号不能超过 80 个字符');
  return cleaned;
}

export function redactWaterReceiptVoucher(
  row: WaterReceiptSummary,
  canViewVoucher: boolean
): WaterReceiptSummary {
  if (canViewVoucher || !row.voucher) return row;
  return { ...row, voucher: undefined };
}

export function buildWaterReceiptVoucherAuditSnapshot(
  row: Pick<WaterReceiptSummary, 'id' | 'receiptNo'>,
  voucher: WaterReceiptVoucherSummary,
  before?: WaterReceiptVoucherSummary
) {
  return {
    waterReceiptId: row.id,
    receiptNo: row.receiptNo,
    voucherId: voucher.id,
    fileName: voucher.fileName,
    sizeBytes: voucher.sizeBytes,
    mimeType: voucher.mimeType,
    uploadedBy: voucher.uploadedBy,
    uploadedAt: voucher.createdAt,
    previousVoucherId: before?.id,
    previousFileName: before?.fileName
  };
}

export function buildWaterReceiptListTotals(
  rows: WaterReceiptSummary[]
): WaterReceiptListResponse['totals'] {
  return rows.reduce<WaterReceiptListResponse['totals']>((acc, row) => {
    acc.amount = roundMoney(acc.amount + row.amount);
    acc.matchedAmount = roundMoney(acc.matchedAmount + row.matchedAmount);
    acc.pendingAllocatedAmount = roundMoney(Number(acc.pendingAllocatedAmount ?? 0) + Number(row.pendingAllocatedAmount ?? 0));
    acc.availableAllocationAmount = roundMoney(Number(acc.availableAllocationAmount ?? 0) + Number(row.availableAllocationAmount ?? row.balance));
    acc.balance = roundMoney(acc.balance + row.balance);
    acc.rmbAmount = roundMoney(Number(acc.rmbAmount ?? 0) + Number(row.rmbAmount ?? 0));
    acc.rmbMatchedAmount = roundMoney(Number(acc.rmbMatchedAmount ?? 0) + Number(row.rmbMatchedAmount ?? 0));
    acc.rmbPendingAllocatedAmount = roundMoney(Number(acc.rmbPendingAllocatedAmount ?? 0) + Number(row.rmbPendingAllocatedAmount ?? 0));
    acc.rmbAvailableAllocationAmount = roundMoney(Number(acc.rmbAvailableAllocationAmount ?? 0) + Number(row.rmbAvailableAllocationAmount ?? row.rmbBalance ?? 0));
    acc.rmbBalance = roundMoney(Number(acc.rmbBalance ?? 0) + Number(row.rmbBalance ?? 0));
    const currency = row.currency ?? 'RMB';
    const amountByCurrency = acc.amountByCurrency ?? (acc.amountByCurrency = []);
    const currencyTotal = amountByCurrency.find((item) => item.currency === currency);
    if (currencyTotal) {
      currencyTotal.amount = roundMoney(currencyTotal.amount + row.amount);
      currencyTotal.matchedAmount = roundMoney(currencyTotal.matchedAmount + row.matchedAmount);
      currencyTotal.balance = roundMoney(currencyTotal.balance + row.balance);
    } else {
      amountByCurrency.push({
        currency,
        amount: roundMoney(row.amount),
        matchedAmount: roundMoney(row.matchedAmount),
        balance: roundMoney(row.balance)
      });
    }
    if (row.status === 'PENDING') acc.pendingCount += 1;
    if (row.status === 'ARRIVED' || row.status === 'PARTIAL_MATCHED') acc.arrivedCount += 1;
    if (row.status === 'MATCHED') acc.matchedCount += 1;
    if (row.status === 'ARCHIVED') acc.archivedCount += 1;
    return acc;
  }, {
    count: rows.length,
    pendingCount: 0,
    arrivedCount: 0,
    matchedCount: 0,
    archivedCount: 0,
    amount: 0,
    matchedAmount: 0,
    pendingAllocatedAmount: 0,
    availableAllocationAmount: 0,
    balance: 0,
    amountByCurrency: [] as NonNullable<WaterReceiptListResponse['totals']['amountByCurrency']>,
    rmbAmount: 0,
    rmbMatchedAmount: 0,
    rmbPendingAllocatedAmount: 0,
    rmbAvailableAllocationAmount: 0,
    rmbBalance: 0
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

import { BadRequestException, ConflictException } from '@nestjs/common';

export type WaterReceiptMatchAmountCurrency = 'SOURCE' | 'RMB';

export interface WaterReceiptMatchAmountPlanInput {
  amountCurrency: WaterReceiptMatchAmountCurrency;
  submittedAmount: unknown;
  submittedExchangeRate?: unknown;
  receiptCurrency?: string;
  receivableCurrency?: string;
  receiptExchangeRate: number;
  receivableExchangeRate: number;
}

export interface WaterReceiptMatchAmountPlan {
  amount: number;
  receivableAmount: number;
  rmbAmount?: number;
  receiptCurrency: string;
  receivableCurrency: string;
  receiptExchangeRate: number;
  receivableExchangeRate: number;
}

export function normalizeWaterReceiptCurrency(currencyValue?: string): string {
  const currency = (currencyValue ?? 'RMB').toUpperCase();
  return currency === 'CNY' ? 'RMB' : currency;
}

export function normalizeWaterReceiptMatchAmountCurrency(value?: string): WaterReceiptMatchAmountCurrency {
  const amountCurrency = value ?? 'SOURCE';
  if (amountCurrency !== 'SOURCE' && amountCurrency !== 'RMB') {
    throw new BadRequestException('匹配金额币种无效');
  }
  return amountCurrency;
}

export function planWaterReceiptMatchAmount(input: WaterReceiptMatchAmountPlanInput): WaterReceiptMatchAmountPlan {
  const submittedAmount = Number(input.submittedAmount);
  if (!Number.isFinite(submittedAmount) || submittedAmount <= 0) {
    throw new BadRequestException('匹配金额必须大于 0');
  }

  const receiptCurrency = normalizeWaterReceiptCurrency(input.receiptCurrency);
  const receivableCurrency = normalizeWaterReceiptCurrency(input.receivableCurrency);
  if (receivableCurrency !== receiptCurrency) {
    throw new BadRequestException('水单币种与应收币种不一致');
  }

  const expectedRate = receiptCurrency !== 'RMB'
    ? input.receiptExchangeRate
    : receivableCurrency !== 'RMB'
      ? input.receivableExchangeRate
      : 1;
  if (input.amountCurrency === 'RMB') {
    // RMB-to-RMB is a fixed 1:1 conversion, so legacy callers may omit the rate.
    // Foreign-currency requests still fail because 1 cannot match the current rate.
    const submittedRate = Number(input.submittedExchangeRate ?? 1);
    if (!Number.isFinite(submittedRate) || submittedRate <= 0 || Math.abs(submittedRate - expectedRate) > 0.000001) {
      throw new ConflictException('汇率已更新，请刷新后重新匹配');
    }
  }

  return {
    amount: input.amountCurrency === 'RMB'
      ? roundMoney(submittedAmount / input.receiptExchangeRate)
      : submittedAmount,
    receivableAmount: input.amountCurrency === 'RMB'
      ? roundMoney(submittedAmount / input.receivableExchangeRate)
      : submittedAmount,
    rmbAmount: input.amountCurrency === 'RMB' ? roundMoney(submittedAmount) : undefined,
    receiptCurrency,
    receivableCurrency,
    receiptExchangeRate: input.receiptExchangeRate,
    receivableExchangeRate: input.receivableExchangeRate
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

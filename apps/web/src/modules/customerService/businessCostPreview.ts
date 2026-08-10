import type { BusinessCostFeeSummary } from '@siyuan/shared';

export type BusinessCostCurrencyTotal = {
  currency: string;
  currentAmount: number;
  previewAmount: number;
};

export function isFormulaBusinessCost(row: BusinessCostFeeSummary) {
  return Boolean(row.unitPrice) && !row.amountOverridden;
}

export function isLockedBusinessCost(row: BusinessCostFeeSummary) {
  return row.locked === true || row.reconciliationStatus === 'CONFIRMED';
}

export function previewBusinessCostAmount(row: BusinessCostFeeSummary, chargeWeightKg?: number) {
  if (!isFormulaBusinessCost(row) || typeof chargeWeightKg !== 'number' || !Number.isFinite(chargeWeightKg) || chargeWeightKg <= 0) {
    return Number(row.amount.toFixed(2));
  }
  return Number((chargeWeightKg * Number(row.unitPrice)).toFixed(2));
}

export function summarizeBusinessCostPreview(rows: BusinessCostFeeSummary[], chargeWeightKg?: number) {
  const totals = new Map<string, BusinessCostCurrencyTotal>();
  rows.forEach((row) => {
    const currency = row.currency?.trim() || 'RMB';
    const current = totals.get(currency) ?? { currency, currentAmount: 0, previewAmount: 0 };
    current.currentAmount = Number((current.currentAmount + row.amount).toFixed(2));
    current.previewAmount = Number((current.previewAmount + previewBusinessCostAmount(row, chargeWeightKg)).toFixed(2));
    totals.set(currency, current);
  });
  return [...totals.values()];
}

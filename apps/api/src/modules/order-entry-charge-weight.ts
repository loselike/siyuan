import { roundMonetaryTotal } from '@siyuan/shared';

type OrderEntryFinanceRow = {
  type: string;
  billingUnit?: 'KG' | 'CBM';
  billingQuantity?: number;
  chargeWeightKg?: number;
  unitPrice?: number;
  amount?: number;
  amountOverridden?: boolean;
};

function positiveNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

export function applyOrderEntryChannelChargeWeight<T extends OrderEntryFinanceRow>(
  rows: T[],
  shipmentChargeWeightKg?: number
): T[] {
  const shipmentWeight = positiveNumber(shipmentChargeWeightKg);
  if (shipmentWeight === undefined) return rows;

  return rows.map((row) => {
    const isBusinessCost = row.type === 'BUSINESS_COST';
    const businessQuantity = isBusinessCost
      ? positiveNumber(row.billingQuantity) ?? positiveNumber(row.chargeWeightKg) ?? shipmentWeight
      : undefined;
    const quantity = isBusinessCost ? businessQuantity ?? shipmentWeight : shipmentWeight;
    const unitPrice = positiveNumber(row.unitPrice);
    const chargeWeightKg = isBusinessCost
      ? row.billingUnit === 'CBM' ? undefined : businessQuantity
      : shipmentWeight;

    return {
      ...row,
      ...(isBusinessCost && row.billingQuantity !== undefined ? { billingQuantity: businessQuantity } : {}),
      chargeWeightKg,
      ...(unitPrice !== undefined && !row.amountOverridden
        ? { amount: roundMonetaryTotal(quantity * unitPrice), amountOverridden: false }
        : {})
    };
  });
}

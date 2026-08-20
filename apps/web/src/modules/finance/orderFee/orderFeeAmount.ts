import type { FinanceBillingUnit, ShipmentFinanceItemType } from '@siyuan/shared';

type OrderFeeAmountInput = {
  type: ShipmentFinanceItemType;
  billingUnit?: FinanceBillingUnit;
  billingQuantity?: unknown;
  chargeWeightKg?: unknown;
  unitPrice?: unknown;
};

function toNonNegativeNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

/**
 * Business costs and payables always use the operator-entered quantity × unit price.
 * The shipment weight is never used as an implicit replacement for either input.
 */
export function calculateOrderFeeAmount(input: OrderFeeAmountInput) {
  if (input.type === 'RECEIVABLE') return undefined;
  const rawQuantity = input.type === 'BUSINESS_COST'
    ? input.billingQuantity ?? input.chargeWeightKg
    : input.chargeWeightKg;
  const quantity = toNonNegativeNumber(rawQuantity);
  const unitPrice = toNonNegativeNumber(input.unitPrice);
  if (quantity === undefined || unitPrice === undefined) return undefined;
  return Number((quantity * unitPrice).toFixed(2));
}

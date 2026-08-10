import type { FinanceBillingUnit, ShipmentFinanceItemType } from '@siyuan/shared';

type BillingFields = {
  type?: ShipmentFinanceItemType;
  billingUnit?: unknown;
  billingQuantity?: unknown;
  chargeWeightKg?: unknown;
  unitPrice?: unknown;
};

export type ResolvedBusinessCostBilling = {
  billingUnit: FinanceBillingUnit;
  billingQuantity?: number;
  chargeWeightKg?: number;
};

export type ResolvedFinanceCostBilling = ResolvedBusinessCostBilling;

export function isFinanceBillingUnit(value: unknown): value is FinanceBillingUnit {
  return value === 'KG' || value === 'CBM';
}

export function resolveBusinessCostBillingFields(input: BillingFields = {}, current?: BillingFields): ResolvedBusinessCostBilling {
  return resolveFinanceCostBillingFields('BUSINESS_COST', input, current);
}

export function resolveFinanceCostBillingFields(_type: 'BUSINESS_COST' | 'PAYABLE', input: BillingFields = {}, current?: BillingFields): ResolvedFinanceCostBilling {
  const currentUnit = isFinanceBillingUnit(current?.billingUnit) ? current.billingUnit : undefined;
  const billingUnit = isFinanceBillingUnit(input.billingUnit)
    ? input.billingUnit
    : currentUnit ?? 'KG';
  const changedUnit = current !== undefined && input.billingUnit !== undefined && input.billingUnit !== currentUnit;
  const rawQuantity = input.billingQuantity !== undefined
    ? input.billingQuantity
    : changedUnit
      ? undefined
      : current?.billingQuantity !== undefined
        ? current.billingQuantity
        : billingUnit === 'KG'
          ? input.chargeWeightKg ?? current?.chargeWeightKg
          : undefined;
  const quantity = rawQuantity === undefined || rawQuantity === null ? undefined : Number(rawQuantity);
  const normalizedQuantity = quantity !== undefined && Number.isFinite(quantity) ? quantity : undefined;
  return {
    billingUnit,
    billingQuantity: normalizedQuantity,
    chargeWeightKg: billingUnit === 'KG' ? normalizedQuantity : undefined
  };
}

export function resolveFinanceItemQuantity(type: ShipmentFinanceItemType, input: BillingFields = {}, current?: BillingFields) {
  if (type === 'BUSINESS_COST' || (type === 'PAYABLE' && (isFinanceBillingUnit(input.billingUnit) || isFinanceBillingUnit(current?.billingUnit)))) {
    return resolveFinanceCostBillingFields(type, input, current).billingQuantity;
  }
  const value = input.chargeWeightKg ?? current?.chargeWeightKg;
  return value === undefined || value === null ? undefined : Number(value);
}

export function calculateFinanceItemAmount(
  type: ShipmentFinanceItemType,
  input: BillingFields = {},
  current?: BillingFields,
  fallback = 0
) {
  const quantity = resolveFinanceItemQuantity(type, input, current);
  const unitPrice = input.unitPrice ?? current?.unitPrice;
  if (quantity !== undefined && unitPrice !== undefined && Number.isFinite(quantity) && Number.isFinite(Number(unitPrice))) {
    return Number((quantity * Number(unitPrice)).toFixed(2));
  }
  return fallback;
}

export function isFinanceAmountOverridden(input: BillingFields & { amount?: unknown }) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount)) return false;
  const type = input.type ?? 'PAYABLE';
  const quantity = resolveFinanceItemQuantity(type, input);
  const unitPrice = Number(input.unitPrice);
  if (quantity === undefined || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return true;
  return Math.round(amount * 100) !== Math.round(quantity * unitPrice * 100);
}

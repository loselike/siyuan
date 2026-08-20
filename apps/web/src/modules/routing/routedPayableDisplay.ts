import { roundMonetaryTotal, type Shipment, type ShipmentRouteCostLineSummary } from '@siyuan/shared';

export interface RoutedPayableDisplay {
  billingQuantity: string;
  unitPrice: string;
  otherFees: string;
  total: string;
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

function formatLinesByCurrency(lines: ShipmentRouteCostLineSummary[]) {
  if (!lines.length) return '-';
  const totals = new Map<string, number>();
  lines.forEach((line) => totals.set(
    line.currency,
    roundMonetaryTotal((totals.get(line.currency) ?? 0) + line.amount)
  ));
  return [...totals.entries()]
    .sort(([left], [right]) => left === 'RMB' ? -1 : right === 'RMB' ? 1 : left.localeCompare(right))
    .map(([currency, amount]) => formatAmount(amount, currency))
    .join(' / ');
}

export function getRoutedPayableDisplay(shipment: Shipment): RoutedPayableDisplay {
  const summary = shipment.routeCostSummary;
  const mainFreight = summary?.mainFreight;
  const billingQuantity = mainFreight?.billingQuantity
    ?? mainFreight?.chargeWeightKg
    ?? shipment.routeChargeWeightKg;
  const billingUnit = mainFreight?.billingUnit
    ?? (mainFreight?.chargeWeightKg !== undefined || shipment.routeChargeWeightKg !== undefined ? 'KG' : undefined);
  const currency = mainFreight?.currency ?? shipment.routeCurrency ?? 'RMB';
  const unitPrice = mainFreight?.unitPrice ?? shipment.routeUnitPrice;

  return {
    billingQuantity: billingQuantity === undefined
      ? '-'
      : `${billingQuantity.toFixed(3)}${billingUnit ? ` ${billingUnit}` : ''}`,
    unitPrice: unitPrice === undefined
      ? '-'
      : `${formatAmount(unitPrice, currency)}${billingUnit ? `/${billingUnit}` : ''}`,
    otherFees: summary
      ? formatLinesByCurrency(summary.otherFees)
      : shipment.routeOtherFee === undefined
        ? '-'
        : formatAmount(shipment.routeOtherFee, currency),
    total: summary?.totals.length
      ? summary.totals.map((row) => formatAmount(row.amount, row.currency)).join(' / ')
      : shipment.routeCostTotal === undefined
        ? '-'
        : formatAmount(shipment.routeCostTotal, currency)
  };
}

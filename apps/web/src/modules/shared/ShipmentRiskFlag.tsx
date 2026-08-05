import type { ReactNode } from 'react';

export type ShipmentRiskFlagValue = boolean | string | null | undefined;

export function formatShipmentRiskFlagValue(value: ShipmentRiskFlagValue): string {
  if (value === true) return '是';
  if (value === false) return '否';
  const text = value?.trim();
  return text || '-';
}

export function isShipmentRiskFlagActive(value: ShipmentRiskFlagValue): boolean {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  const text = value.trim();
  return Boolean(text && text !== '-' && text !== '否');
}

export function ShipmentRiskFlag({ value }: { value: ShipmentRiskFlagValue }): ReactNode {
  const text = formatShipmentRiskFlagValue(value);
  return (
    <span className={isShipmentRiskFlagActive(value) ? 'shipment-risk-flag shipment-risk-flag-active' : 'shipment-risk-flag'}>
      {text}
    </span>
  );
}

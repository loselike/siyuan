import type { WarehousePackageSummary } from '@siyuan/shared';
import type { Principal } from '../../../rbac.js';

export function warehousePrincipal(overrides: Partial<Principal> = {}): Principal {
  return {
    id: 'warehouse-user-1',
    username: 'warehouse-user',
    role: 'WAREHOUSE',
    ...overrides
  };
}

export function warehousePackageSummary(
  overrides: Partial<WarehousePackageSummary> = {}
): WarehousePackageSummary {
  return {
    id: 'pkg-1',
    customerCode: '9476',
    customerOrderNo: 'ORDER-9476',
    domesticTrackingNo: 'SF9476',
    combinedOrderNo: '9476-SF9476',
    packageCount: 1,
    weightKg: 21.4,
    lengthCm: 54,
    widthCm: 45,
    heightCm: 44,
    cbm: 0.10692,
    volumetricWeightKg: 21.38,
    chargeableWeightKg: 21.4,
    divisor: 5000,
    roundingRule: 'NONE',
    scanTime: '2026-08-04T05:33:26.000Z',
    status: 'RECEIVED',
    exceptions: [],
    createdAt: '2026-08-04T05:33:26.000Z',
    ...overrides
  } as WarehousePackageSummary;
}

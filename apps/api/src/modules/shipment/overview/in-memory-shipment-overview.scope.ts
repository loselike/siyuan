import { NotFoundException } from '@nestjs/common';
import { isBusinessAgentOwnOnlyRole, type Principal } from '../../rbac.js';

type SalesScopeMode = 'CUSTOMER_OR_ENTRY' | 'ENTRY_ONLY' | undefined;

export function scopeInMemoryShipmentOverviewRows<T>(
  activeShipments: T[],
  principal: Pick<Principal, 'role' | 'shipmentAllView' | 'departmentTeamScope'>,
  salesScopeMode: SalesScopeMode,
  isShipmentInSalesScope: (shipment: T, scope: string[]) => boolean,
  fallback: () => T[]
): T[] {
  if (principal.shipmentAllView && !isBusinessAgentOwnOnlyRole(principal.role)) return activeShipments;
  const teamScope = principal.departmentTeamScope?.filter(Boolean);
  if (!teamScope?.length || salesScopeMode === 'ENTRY_ONLY') return fallback();
  return activeShipments.filter((shipment) => isShipmentInSalesScope(shipment, teamScope));
}

export function findInMemoryShipmentOverviewRow<T>(
  activeShipments: T[],
  principal: Pick<Principal, 'role' | 'shipmentAllView' | 'departmentTeamScope'>,
  shipmentId: string,
  isShipmentInSalesScope: (shipment: T, scope: string[]) => boolean,
  fallback: () => T[],
  idOf: (shipment: T) => string
): T {
  const shipment = scopeInMemoryShipmentOverviewRows(activeShipments, principal, undefined, isShipmentInSalesScope, fallback)
    .find((item) => idOf(item) === shipmentId);
  if (!shipment) throw new NotFoundException('运单不存在');
  return shipment;
}

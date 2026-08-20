import type { NavigationUnreadBadgesResponse, Shipment, ShipmentStatus } from '@siyuan/shared/shipment';
import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';

export const SHIPMENT_OVERVIEW_QUERY_REPOSITORY = 'SHIPMENT_OVERVIEW_QUERY_REPOSITORY';

export interface ShipmentOverviewQueryOptions {
  exposeWarehouseRouting?: boolean;
  salesScopeMode?: 'CUSTOMER_OR_ENTRY' | 'ENTRY_ONLY';
  customerServiceFieldScope?: boolean;
  customerServiceTransferAgentWeight?: boolean;
  routeCostScope?: 'ROUTED';
  includeLinePoolFinanceSummary?: boolean;
  marketSiteScope?: boolean;
  customerServiceScope?: boolean;
}

export type ShipmentOverviewRow = Shipment;
export type ShipmentStatusCounts = Record<ShipmentStatus, number>;

/**
 * Compatibility port for overview reads that are still implemented by the
 * legacy repositories. Keeping this surface narrow prevents the query service
 * from growing new dependencies on the aggregate repository.
 */
export interface ShipmentOverviewQueryRepository {
  hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean>;
  getShipments(principal: Principal, options?: ShipmentOverviewQueryOptions): Promise<ShipmentOverviewRow[]>;
  getShipmentStatusCounts(principal: Principal): Promise<ShipmentStatusCounts>;
  getNavigationUnreadBadges(principal: Principal): Promise<NavigationUnreadBadgesResponse>;
}

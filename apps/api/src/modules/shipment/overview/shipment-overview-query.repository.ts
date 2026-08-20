import type { NavigationUnreadBadgesResponse, Shipment, ShipmentStatus } from '@siyuan/shared/shipment';
import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';

export const SHIPMENT_OVERVIEW_QUERY_REPOSITORY = 'SHIPMENT_OVERVIEW_QUERY_REPOSITORY';

export interface ShipmentOverviewQueryOptions {
  routeCostScope?: 'ROUTED';
  marketSiteScope?: boolean;
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

import type { NavigationUnreadBadgesResponse, Shipment, ShipmentStatus } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';
import { LegacyShipmentOverviewQueryRepository } from './legacy-shipment-overview-query.repository.js';
import type { ShipmentOverviewQueryOptions } from './shipment-overview-query.repository.js';

const principal: Principal = {
  id: 'user-1',
  username: 'operator',
  role: 'OPERATOR',
  dataScope: 'SALES_OWN'
};

describe('LegacyShipmentOverviewQueryRepository', () => {
  it('delegates the narrow query contract without changing arguments or results', async () => {
    const shipments = [{ id: 'shipment-1' }] as Shipment[];
    const statusCounts = { DRAFT: 1 } as Record<ShipmentStatus, number>;
    const unreadBadges: NavigationUnreadBadgesResponse = { items: [] };
    const legacy = {
      hasPermission: vi.fn(async (_role: RoleKey, _permission: PermissionKey) => true),
      getShipments: vi.fn(async (_principal: Principal, _options?: ShipmentOverviewQueryOptions) => shipments),
      getShipmentStatusCounts: vi.fn(async (_principal: Principal) => statusCounts),
      getNavigationUnreadBadges: vi.fn(async (_principal: Principal) => unreadBadges)
    };
    const repository = new LegacyShipmentOverviewQueryRepository(legacy);
    const options: ShipmentOverviewQueryOptions = { routeCostScope: 'ROUTED', marketSiteScope: true };

    await expect(repository.hasPermission(principal.role, 'business:shipment:list')).resolves.toBe(true);
    await expect(repository.getShipments(principal, options)).resolves.toBe(shipments);
    await expect(repository.getShipmentStatusCounts(principal)).resolves.toBe(statusCounts);
    await expect(repository.getNavigationUnreadBadges(principal)).resolves.toBe(unreadBadges);

    expect(legacy.hasPermission).toHaveBeenCalledWith(principal.role, 'business:shipment:list');
    expect(legacy.getShipments).toHaveBeenCalledWith(principal, options);
    expect(legacy.getShipmentStatusCounts).toHaveBeenCalledWith(principal);
    expect(legacy.getNavigationUnreadBadges).toHaveBeenCalledWith(principal);
  });
});

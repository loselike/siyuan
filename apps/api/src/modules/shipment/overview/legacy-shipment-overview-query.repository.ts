import { Inject, Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';
import type {
  ShipmentOverviewQueryOptions,
  ShipmentOverviewQueryRepository
} from './shipment-overview-query.repository.js';

type LegacyShipmentOverviewQueries = Pick<
  ShipmentOverviewQueryRepository,
  'getNavigationUnreadBadges' | 'getShipments' | 'getShipmentStatusCounts' | 'hasPermission'
>;

/**
 * The only allowed bridge from the shipment overview module to the aggregate
 * repository. Keeping the bridge explicit lets the controller, service and
 * port evolve without importing the legacy implementation.
 */
@Injectable()
export class LegacyShipmentOverviewQueryRepository implements ShipmentOverviewQueryRepository {
  constructor(
    @Inject(PrismaRepository)
    private readonly repository: LegacyShipmentOverviewQueries
  ) {}

  hasPermission(role: RoleKey, permission: PermissionKey) {
    return this.repository.hasPermission(role, permission);
  }

  getShipments(principal: Principal, options?: ShipmentOverviewQueryOptions) {
    return this.repository.getShipments(principal, options);
  }

  getShipmentStatusCounts(principal: Principal) {
    return this.repository.getShipmentStatusCounts(principal);
  }

  getNavigationUnreadBadges(principal: Principal) {
    return this.repository.getNavigationUnreadBadges(principal);
  }
}

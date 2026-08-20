import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { ShipmentOverviewQueryService } from './shipment-overview-query.service.js';

@Controller()
export class ShipmentOverviewQueryController {
  constructor(@Inject(ShipmentOverviewQueryService) private readonly queries: ShipmentOverviewQueryService) {}

  @Get('shipments')
  @RequirePermission([
    'business:shipment:list',
    'market:dashboard:view',
    'market:pending-routing:view',
    'market:routed:view',
    'market:routing-report:view'
  ])
  shipments(@Req() request: { user: Principal }, @Query('costScope') costScope?: string) {
    return this.queries.listShipments(request.user, costScope);
  }

  @Get('market/shipments')
  @RequirePermission([
    'market:dashboard:view',
    'market:pending-routing:view',
    'market:routed:view',
    'market:routing-report:view'
  ])
  marketShipments(@Req() request: { user: Principal }, @Query('costScope') costScope?: string) {
    return this.queries.listMarketShipments(request.user, costScope);
  }

  @Get('shipments/status-counts')
  @RequirePermission('business:shipment:list')
  shipmentStatusCounts(@Req() request: { user: Principal }) {
    return this.queries.getShipmentStatusCounts(request.user);
  }

  @Get('navigation/unread-badges')
  @RequirePermission('business:shipment:list')
  navigationUnreadBadges(@Req() request: { user: Principal }) {
    return this.queries.getNavigationUnreadBadges(request.user);
  }
}

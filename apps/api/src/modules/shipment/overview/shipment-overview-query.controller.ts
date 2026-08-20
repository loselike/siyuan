import { Controller, ForbiddenException, Get, Inject, Req } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';

@Controller()
export class ShipmentOverviewQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('shipments/status-counts')
  @RequirePermission('business:shipment:list')
  shipmentStatusCounts(@Req() request: { user: Principal }) {
    return this.repository.getShipmentStatusCounts(request.user);
  }

  @Get('navigation/unread-badges')
  @RequirePermission('business:shipment:list')
  navigationUnreadBadges(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不使用员工端导航角标');
    return this.repository.getNavigationUnreadBadges(request.user);
  }
}

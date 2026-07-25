import { Controller, ForbiddenException, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { OrderEntryWarehousePackageQuery } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';

@Controller()
export class OrderEntryQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('shipments/order-entry/packages')
  @RequirePermission('business:order-entry:warehouse-package-select')
  async orderEntryPackages(@Req() request: { user: Principal }, @Query() query: OrderEntryWarehousePackageQuery) {
    if (request.user.role === 'CUSTOMER' || request.user.role === 'WAREHOUSE') {
      throw new ForbiddenException('当前角色不能使用内部录单');
    }
    return this.repository.getOrderEntryWarehousePackages(request.user, query);
  }

  @Get('shipments/:id/order-entry')
  @RequirePermission('business:order-entry:view')
  async orderEntryDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER' || request.user.role === 'WAREHOUSE') {
      throw new ForbiddenException('当前角色不能使用内部录单');
    }
    return this.repository.getOrderEntryDetail(request.user, id);
  }
}

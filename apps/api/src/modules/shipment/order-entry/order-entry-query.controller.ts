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
    this.ensureOrderEntryScope(request.user);
    return this.repository.getOrderEntryWarehousePackages(request.user, query);
  }

  @Get('shipments/:id/order-entry')
  @RequirePermission('business:order-entry:view')
  async orderEntryDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    this.ensureOrderEntryScope(request.user);
    return this.repository.getOrderEntryDetail(request.user, id);
  }

  private ensureOrderEntryScope(principal: Principal) {
    if (principal.role === 'CUSTOMER') throw new ForbiddenException('当前角色不能使用内部录单');
    if (principal.shipmentAllView || principal.dataScope === 'SALES_OWN' || principal.departmentTeamScope?.length) return;
    throw new ForbiddenException('当前岗位未配置录单数据范围');
  }
}

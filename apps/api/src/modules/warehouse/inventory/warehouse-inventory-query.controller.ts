import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { WarehouseInStockQuery, WarehouseTodayQuery } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';

@Controller()
export class WarehouseInventoryQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('warehouse/packages')
  @RequirePermission(['warehouse:today-receipt:view', 'warehouse:in-stock:view'])
  warehousePackages(@Req() request: { user: Principal }) {
    return this.repository.getWarehousePackages(request.user);
  }

  @Get('warehouse/today-receipts')
  @RequirePermission('warehouse:today-receipt:view')
  warehouseTodayReceipts(@Req() request: { user: Principal }, @Query() query: WarehouseTodayQuery) {
    return this.repository.getWarehouseTodayReceipts(request.user, query);
  }

  @Get('warehouse/in-stock')
  @RequirePermission('warehouse:in-stock:view')
  warehouseInStock(@Req() request: { user: Principal }, @Query() query: WarehouseInStockQuery) {
    return this.repository.getWarehouseInStock(request.user, query);
  }

  @Get('warehouse/package-groups')
  @RequirePermission('warehouse:in-stock:view')
  warehousePackageGroups(@Req() request: { user: Principal }) {
    return this.repository.getWarehousePackageGroups(request.user);
  }

  @Get('warehouse/manual-receipt/customers')
  @RequirePermission('warehouse:today-receipt:manual-create')
  warehouseManualReceiptCustomers(@Req() request: { user: Principal }) {
    return this.repository.getWarehouseManualReceiptCustomers(request.user);
  }
}

import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { WarehouseInStockQuery, WarehouseTodayQuery } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_INVENTORY_QUERY_REPOSITORY,
  type WarehouseInventoryQueryRepository
} from './warehouse-inventory-query.repository.js';

@Controller()
export class WarehouseInventoryQueryController {
  constructor(
    @Inject(WAREHOUSE_INVENTORY_QUERY_REPOSITORY)
    private readonly repository: WarehouseInventoryQueryRepository,
    @Inject(PrismaRepository)
    private readonly auditedRepository: PrismaRepository
  ) {}

  @Get('warehouse/packages')
  @RequirePermission(['warehouse:today-receipt:view', 'warehouse:in-stock:view'])
  warehousePackages(@Req() request: { user: Principal }) {
    return this.repository.getWarehousePackages(request.user);
  }

  @Get('warehouse/today-receipts')
  @RequirePermission('warehouse:today-receipt:view')
  warehouseTodayReceipts(@Req() request: { user: Principal }, @Query() query: WarehouseTodayQuery) {
    return this.auditedRepository.getWarehouseTodayReceipts(request.user, query);
  }

  @Get('warehouse/in-stock')
  @RequirePermission('warehouse:in-stock:view')
  warehouseInStock(@Req() request: { user: Principal }, @Query() query: WarehouseInStockQuery) {
    return this.auditedRepository.getWarehouseInStock(request.user, query);
  }

  @Get('warehouse/in-stock-summary')
  @RequirePermission('warehouse:in-stock:view')
  warehouseInStockSummary(@Req() request: { user: Principal }) {
    return this.auditedRepository.getWarehouseInStockSummary(request.user);
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

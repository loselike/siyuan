import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { WarehouseInStockPageQuery, WarehouseInStockQuery, WarehouseTodayQuery } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseInventoryQueryService } from './warehouse-inventory-query.service.js';

@Controller()
export class WarehouseInventoryQueryController {
  constructor(
    @Inject(WarehouseInventoryQueryService)
    private readonly service: WarehouseInventoryQueryService,
    @Inject(PrismaRepository)
    private readonly auditedRepository: PrismaRepository
  ) {}

  @Get('warehouse/packages')
  @RequirePermission(['warehouse:today-receipt:view', 'warehouse:in-stock:view'])
  warehousePackages(@Req() request: { user: Principal }) {
    return this.service.listPackages(request.user);
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

  @Get('warehouse/in-stock-page')
  @RequirePermission('warehouse:in-stock:view')
  warehouseInStockPage(@Req() request: { user: Principal }, @Query() query: WarehouseInStockPageQuery) {
    return this.service.listInStockPage(request.user, query);
  }

  @Get('warehouse/in-stock-summary')
  @RequirePermission('warehouse:in-stock:view')
  warehouseInStockSummary(@Req() request: { user: Principal }) {
    return this.auditedRepository.getWarehouseInStockSummary(request.user);
  }

  @Get('warehouse/package-groups')
  @RequirePermission('warehouse:in-stock:view')
  warehousePackageGroups(@Req() request: { user: Principal }) {
    return this.service.listPackageGroups(request.user);
  }

  @Get('warehouse/manual-receipt/customers')
  @RequirePermission('warehouse:today-receipt:manual-create')
  warehouseManualReceiptCustomers(@Req() request: { user: Principal }) {
    return this.service.listManualReceiptCustomers(request.user);
  }
}

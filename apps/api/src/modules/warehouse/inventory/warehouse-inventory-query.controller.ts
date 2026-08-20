import { Body, Controller, Get, Inject, Post, Query, Req } from '@nestjs/common';
import type { WarehouseInStockPageQuery, WarehouseInStockQuery, WarehousePackageDeleteInput, WarehouseTodayQuery } from '@siyuan/shared';
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
    return this.service.listTodayReceipts(request.user, query);
  }

  @Get('warehouse/in-stock')
  @RequirePermission('warehouse:in-stock:view')
  warehouseInStock(@Req() request: { user: Principal }, @Query() query: WarehouseInStockQuery) {
    return this.service.listInStock(request.user, query);
  }

  @Get('warehouse/in-stock-page')
  @RequirePermission('warehouse:in-stock:view')
  warehouseInStockPage(@Req() request: { user: Principal }, @Query() query: WarehouseInStockPageQuery) {
    return this.service.listInStockPage(request.user, query);
  }

  @Get('warehouse/in-stock-summary')
  @RequirePermission(['warehouse:dashboard:view', 'warehouse:in-stock:view'])
  warehouseInStockSummary(@Req() request: { user: Principal }) {
    return this.service.getInStockSummary(request.user);
  }

  @Post('warehouse/today-receipts/batch-delete')
  @RequirePermission('warehouse:today-receipt:delete')
  deleteTodayReceiptPackages(@Req() request: { user: Principal }, @Body() body: WarehousePackageDeleteInput) {
    return this.auditedRepository.deleteWarehousePackages(request.user, body);
  }

  @Post('warehouse/in-stock/batch-delete')
  @RequirePermission('warehouse:in-stock:delete')
  deleteInStockPackages(@Req() request: { user: Principal }, @Body() body: WarehousePackageDeleteInput) {
    return this.auditedRepository.deleteWarehousePackages(request.user, body);
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

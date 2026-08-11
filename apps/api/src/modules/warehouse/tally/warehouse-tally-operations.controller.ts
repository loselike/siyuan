import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { RequireAuth, RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseTallyOperationsService } from './warehouse-tally-operations.service.js';

type WarehouseConsolidationCreateInput = Parameters<WarehouseTallyOperationsService['createConsolidation']>[1];
type WarehouseTallyRepeatStatisticsQuery = Parameters<WarehouseTallyOperationsService['repeatStatistics']>[1];

@Controller()
export class WarehouseTallyOperationsController {
  constructor(
    @Inject(WarehouseTallyOperationsService)
    private readonly operations: WarehouseTallyOperationsService
  ) {}

  @Post('warehouse/consolidations')
  @RequireAuth()
  createWarehouseConsolidation(
    @Req() request: { user: Principal },
    @Body() body: WarehouseConsolidationCreateInput
  ) {
    return this.operations.createConsolidation(request.user, body);
  }

  @Post('warehouse/consolidations/:id/create-shipment')
  @RequirePermission('warehouse:tally-pending:merge-and-ship')
  createWarehouseConsolidationShipment(
    @Req() request: { user: Principal },
    @Param('id') id: string
  ) {
    return this.operations.createShipment(request.user, id);
  }

  @Get('warehouse/tally-repeat-statistics')
  @RequirePermission('warehouse:tally-completed:view')
  warehouseTallyRepeatStatistics(
    @Req() request: { user: Principal },
    @Query() query: WarehouseTallyRepeatStatisticsQuery
  ) {
    return this.operations.repeatStatistics(request.user, query);
  }
}

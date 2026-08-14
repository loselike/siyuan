import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseRentService } from './warehouse-rent.service.js';

type WarehouseRentDetailQuery = Parameters<WarehouseRentService['details']>[1];
type WarehouseRentRuleInput = Parameters<WarehouseRentService['createRule']>[1];
type WarehouseRentRuleEnabledInput = Parameters<WarehouseRentService['updateRuleEnabled']>[2];

@Controller()
export class WarehouseRentController {
  constructor(
    @Inject(WarehouseRentService)
    private readonly warehouseRent: WarehouseRentService
  ) {}

  @Get('warehouse/rent-details')
  @RequirePermission('warehouse:rent-detail:view')
  warehouseRentDetails(@Req() request: { user: Principal }, @Query() query: WarehouseRentDetailQuery) {
    return this.warehouseRent.details(request.user, query);
  }

  @Get('warehouse/rent-details/export')
  @RequirePermission('warehouse:rent-detail:export')
  exportWarehouseRentDetails(@Req() request: { user: Principal }, @Query() query: WarehouseRentDetailQuery) {
    return this.warehouseRent.exportDetails(request.user, query);
  }

  @Get('warehouse/rent-rules')
  @RequirePermission('warehouse:rent-detail:view')
  warehouseRentRules(@Req() request: { user: Principal }) {
    return this.warehouseRent.rules(request.user);
  }

  @Post('warehouse/rent-rules')
  @RequirePermission('warehouse:rent-detail:edit')
  createWarehouseRentRule(
    @Req() request: { user: Principal },
    @Body() body: WarehouseRentRuleInput
  ) {
    return this.warehouseRent.createRule(request.user, body);
  }

  @Put('warehouse/rent-rules/:id')
  @RequirePermission('warehouse:rent-detail:edit')
  updateWarehouseRentRule(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseRentRuleInput
  ) {
    return this.warehouseRent.updateRule(request.user, id, body);
  }

  @Delete('warehouse/rent-rules/:id')
  @RequirePermission('warehouse:rent-detail:edit')
  deleteWarehouseRentRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.warehouseRent.deleteRule(request.user, id);
  }

  @Put('warehouse/rent-rules/:id/enabled')
  @RequirePermission('warehouse:rent-detail:edit')
  updateWarehouseRentRuleEnabled(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseRentRuleEnabledInput
  ) {
    return this.warehouseRent.updateRuleEnabled(request.user, id, body);
  }
}

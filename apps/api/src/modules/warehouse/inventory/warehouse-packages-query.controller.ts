import { Controller, Get, Inject, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseInventoryQueryService } from './warehouse-inventory-query.service.js';

@Controller()
export class WarehousePackagesQueryController {
  constructor(
    @Inject(WarehouseInventoryQueryService)
    private readonly service: WarehouseInventoryQueryService
  ) {}

  @Get('warehouse/packages')
  @RequirePermission(['warehouse:today-receipt:view', 'warehouse:in-stock:view'])
  warehousePackages(@Req() request: { user: Principal }) {
    return this.service.listPackages(request.user);
  }
}

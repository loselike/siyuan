import { Body, Controller, Inject, Param, Patch, Post, Put, Req } from '@nestjs/common';
import {
  warehouseManualReceiptCreateInputSchema,
  warehousePackageCreateInputSchema,
  warehousePackageExceptionInputSchema,
  warehousePackageRemarkInputSchema,
  warehousePackageSplitInputSchema,
  warehousePackageUpdateInputSchema,
  warehouseSameSpecReplenishInputSchema
} from '@siyuan/shared/warehouse-input';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { RuntimeInputPipe } from '../../runtime-input.pipe.js';
import { WarehousePackageLifecycleService } from './warehouse-package-lifecycle.service.js';

type WarehousePackageCreateInput = Parameters<WarehousePackageLifecycleService['create']>[1];
type WarehouseManualReceiptCreateInput = Parameters<WarehousePackageLifecycleService['createManualReceipt']>[1];
type WarehouseSameSpecReplenishInput = Parameters<WarehousePackageLifecycleService['replenishSameSpec']>[2];
type WarehousePackageSplitInput = Parameters<WarehousePackageLifecycleService['split']>[2];
type WarehousePackageUpdateInput = Parameters<WarehousePackageLifecycleService['update']>[2];
type WarehousePackageRemarkInput = Parameters<WarehousePackageLifecycleService['updateRemark']>[2];
type WarehousePackageExceptionInput = Parameters<WarehousePackageLifecycleService['updateException']>[2];

@Controller()
export class WarehousePackageLifecycleController {
  constructor(
    @Inject(WarehousePackageLifecycleService)
    private readonly warehousePackageLifecycle: WarehousePackageLifecycleService
  ) {}

  @Post('warehouse/packages')
  @RequirePermission('warehouse:today-receipt:manual-create')
  createWarehousePackage(
    @Req() request: { user: Principal },
    @Body(new RuntimeInputPipe(warehousePackageCreateInputSchema)) body: WarehousePackageCreateInput
  ) {
    return this.warehousePackageLifecycle.create(request.user, body);
  }

  @Post('warehouse/packages/manual-receipt')
  @RequirePermission('warehouse:today-receipt:manual-create')
  createWarehouseManualReceipt(
    @Req() request: { user: Principal },
    @Body(new RuntimeInputPipe(warehouseManualReceiptCreateInputSchema)) body: WarehouseManualReceiptCreateInput
  ) {
    return this.warehousePackageLifecycle.createManualReceipt(request.user, body);
  }

  @Post('warehouse/packages/:id/same-spec-replenish')
  @RequirePermission('warehouse:in-stock:edit')
  replenishWarehouseSameSpec(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body(new RuntimeInputPipe(warehouseSameSpecReplenishInputSchema)) body: WarehouseSameSpecReplenishInput
  ) {
    return this.warehousePackageLifecycle.replenishSameSpec(request.user, id, body);
  }

  @Post('warehouse/packages/:id/split')
  @RequirePermission('warehouse:in-stock:split')
  splitWarehousePackage(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body(new RuntimeInputPipe(warehousePackageSplitInputSchema)) body: WarehousePackageSplitInput
  ) {
    return this.warehousePackageLifecycle.split(request.user, id, body);
  }

  @Patch('warehouse/packages/:id')
  @RequirePermission(['warehouse:today-receipt:edit', 'warehouse:in-stock:edit'])
  updateWarehousePackage(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body(new RuntimeInputPipe(warehousePackageUpdateInputSchema)) body: WarehousePackageUpdateInput
  ) {
    return this.warehousePackageLifecycle.update(request.user, id, body);
  }

  @Put('warehouse/packages/:id/remark')
  @RequirePermission(['warehouse:today-receipt:edit', 'warehouse:in-stock:edit'])
  updateWarehousePackageRemark(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body(new RuntimeInputPipe(warehousePackageRemarkInputSchema)) body: WarehousePackageRemarkInput
  ) {
    return this.warehousePackageLifecycle.updateRemark(request.user, id, body);
  }

  @Patch('warehouse/packages/:id/exception')
  @RequirePermission(['warehouse:today-receipt:edit', 'warehouse:in-stock:edit'])
  updateWarehousePackageException(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body(new RuntimeInputPipe(warehousePackageExceptionInputSchema)) body: WarehousePackageExceptionInput
  ) {
    return this.warehousePackageLifecycle.updateException(request.user, id, body);
  }
}

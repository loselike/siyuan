import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { RequireAuth, RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseDispatchService } from './warehouse-dispatch.service.js';

type WarehouseDispatchDeclarationInput = Parameters<WarehouseDispatchService['updateDeclaration']>[2];
type WarehouseDispatchInboundNoInput = Parameters<WarehouseDispatchService['updateInboundNo']>[2];
type WarehouseHandoverPrintInput = Parameters<WarehouseDispatchService['printHandover']>[1];
type ShipmentDispatchInput = Parameters<WarehouseDispatchService['dispatch']>[2];

@Controller()
export class WarehouseDispatchController {
  constructor(
    @Inject(WarehouseDispatchService)
    private readonly warehouseDispatch: WarehouseDispatchService
  ) {}

  @Get('warehouse/dispatch-shipments')
  @RequirePermission(['warehouse:dispatch-pending:view', 'warehouse:outbounded:view'])
  warehouseDispatchShipments(@Req() request: { user: Principal }) {
    return this.warehouseDispatch.shipments(request.user);
  }

  @Patch('warehouse/dispatch-shipments/:id/declaration')
  @RequirePermission('warehouse:dispatch-pending:edit')
  updateWarehouseDispatchDeclaration(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseDispatchDeclarationInput
  ) {
    return this.warehouseDispatch.updateDeclaration(request.user, id, body);
  }

  @Patch('warehouse/dispatch-shipments/:id/inbound-no')
  @RequirePermission('warehouse:dispatch-pending:edit')
  updateWarehouseDispatchInboundNo(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseDispatchInboundNoInput
  ) {
    return this.warehouseDispatch.updateInboundNo(request.user, id, body);
  }

  @Get('warehouse/handover/:shipmentId')
  @RequirePermission('warehouse:dispatch-pending:handover-print')
  warehouseHandover(
    @Req() request: { user: Principal },
    @Param('shipmentId') shipmentId: string
  ) {
    return this.warehouseDispatch.handover(request.user, shipmentId);
  }

  @Post('warehouse/handover/print')
  @RequirePermission('warehouse:dispatch-pending:handover-print')
  printWarehouseHandover(
    @Req() request: { user: Principal },
    @Body() body: WarehouseHandoverPrintInput
  ) {
    return this.warehouseDispatch.printHandover(request.user, body);
  }

  @Post('shipments/:id/dispatch')
  @RequireAuth()
  dispatchShipment(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: ShipmentDispatchInput
  ) {
    return this.warehouseDispatch.dispatch(request.user, id, body);
  }
}

import { Body, Controller, Get, Inject, Param, Patch, Req } from '@nestjs/common';
import type { WarehouseDispatchDeclarationUpdateInput } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';

@Controller()
export class WarehouseDispatchQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('warehouse/dispatch-shipments')
  @RequirePermission(['warehouse:dispatch-pending:view', 'warehouse:outbounded:view'])
  async warehouseDispatchShipments(@Req() request: { user: Principal }) {
    return this.repository.getWarehouseDispatchShipments(request.user);
  }

  @Patch('warehouse/dispatch-shipments/:id/declaration')
  @RequirePermission('warehouse:dispatch-pending:declaration-update')
  async updateWarehouseDispatchDeclaration(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseDispatchDeclarationUpdateInput
  ) {
    return this.repository.updateWarehouseDispatchDeclaration(request.user, id, body);
  }

  @Get('warehouse/handover/:shipmentId')
  @RequirePermission('warehouse:dispatch-pending:handover-preview')
  async warehouseHandover(@Req() request: { user: Principal }, @Param('shipmentId') shipmentId: string) {
    return this.repository.getWarehouseHandover(request.user, shipmentId);
  }
}

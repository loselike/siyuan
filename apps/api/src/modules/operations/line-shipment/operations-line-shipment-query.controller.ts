import { Controller, ForbiddenException, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { LineShipmentPoolQuery } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';

@Controller()
export class OperationsLineShipmentQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('operations/line-shipments')
  @RequirePermission('operations:line-shipment:view')
  async lineShipments(@Req() request: { user: Principal }, @Query() query: LineShipmentPoolQuery) {
    return this.repository.getLineShipmentPool(request.user, query);
  }

  @Get('operations/line-shipments/:id/internal-flow-log')
  @RequirePermission('operations:line-shipment:internal-log-view')
  async lineShipmentInternalFlowLog(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不能查看内部流通日志');
    return this.repository.getShipmentInternalFlowLog(request.user, id);
  }
}

import { Controller, ForbiddenException, Get, Inject, Param, Req } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequireAuth, RequirePermission } from '../../require-permission.decorator.js';
import type { PermissionKey, Principal } from '../../rbac.js';

@Controller()
export class ShipmentFulfillmentQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('shipments/:id/labels')
  @RequireAuth()
  async shipmentLabels(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看内部面单');
    }
    await this.ensureAnyPermission(request.user, ['warehouse:dispatch-pending:label-view', 'customer-service:transfer:label-view']);
    return this.repository.getShipmentLabels(request.user, id);
  }

  @Get('carrier-tasks')
  @RequirePermission('tracking:carrier-task:view')
  async carrierTasks(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看承运商任务');
    }
    return this.repository.getCarrierTasks(request.user);
  }

  private async ensureAnyPermission(principal: Principal, permissions: PermissionKey[]) {
    const allowed = await Promise.all(permissions.map((permission) => this.repository.hasPermission(principal.role, permission)));
    if (allowed.some(Boolean)) return;
    await (this.repository as any).recordPermissionDenied?.(principal, {
      permissions,
      method: 'SERVER',
      path: 'customer-service granular action'
    }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }
}

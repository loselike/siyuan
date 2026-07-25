import { Controller, Get, Inject, Req } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';

@Controller()
export class CustomerServiceQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('customer-service/transfer-shipments')
  @RequirePermission('customer-service:transfer:view')
  async customerServiceTransferShipments(@Req() request: { user: Principal }) {
    return this.repository.customerServiceTransferShipments(request.user);
  }

  @Get('problem-tickets')
  @RequirePermission('customer-service:problem:view')
  async problemTickets(@Req() request: { user: Principal }) {
    return this.repository.getProblemTickets(request.user);
  }
}

import { Controller, Get, Inject, Req } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { ProblemTicketQueryService } from '../problem-ticket/problem-ticket-query.service.js';

@Controller()
export class CustomerServiceQueryController {
  constructor(
    @Inject(PrismaRepository) private readonly repository: PrismaRepository,
    @Inject(ProblemTicketQueryService) private readonly problemTicketQuery: ProblemTicketQueryService
  ) {}

  @Get('customer-service/transfer-shipments')
  @RequirePermission('customer-service:transfer:view')
  async customerServiceTransferShipments(@Req() request: { user: Principal }) {
    return this.repository.customerServiceTransferShipments(request.user);
  }

  @Get('problem-tickets')
  @RequirePermission('customer-service:problem:view')
  async problemTickets(@Req() request: { user: Principal }) {
    return this.problemTicketQuery.list(request.user);
  }
}

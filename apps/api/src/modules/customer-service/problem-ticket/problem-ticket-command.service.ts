import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { ProblemTicketCreateInput } from '@siyuan/shared/problem-ticket';
import type { PermissionKey, Principal } from '../../rbac.js';
import {
  PROBLEM_TICKET_COMMAND_REPOSITORY,
  type ProblemTicketCommandRepository
} from './problem-ticket-command.repository.js';

const customerServiceProblemCreatePermissions: PermissionKey[] = [
  'customer-service:problem:create',
  'customer-service:pending-routing:problem-create',
  'customer-service:waiting-departure:problem-create',
  'customer-service:departed:problem-create',
  'customer-service:arrived-port:problem-create',
  'customer-service:delivering:problem-create',
  'customer-service:delivering:after-sale-create',
  'customer-service:signed:after-sale-create'
];

@Injectable()
export class ProblemTicketCommandService {
  constructor(
    @Inject(PROBLEM_TICKET_COMMAND_REPOSITORY)
    private readonly repository: ProblemTicketCommandRepository
  ) {}

  async createForCustomerService(principal: Principal, shipmentId: string, input: ProblemTicketCreateInput) {
    await this.ensureAnyPermission(principal, customerServiceProblemCreatePermissions);
    await this.repository.assertCustomerServiceProblemCreationAllowed(principal, shipmentId);
    return this.repository.createProblemTicket(principal, shipmentId, input);
  }

  createForBusiness(principal: Principal, shipmentId: string, input: ProblemTicketCreateInput) {
    return this.repository.createProblemTicket(principal, shipmentId, {
      ...input,
      customerVisible: true,
      pushToSales: undefined
    });
  }

  createForOperations(principal: Principal, shipmentId: string, input: ProblemTicketCreateInput) {
    return this.repository.createProblemTicket(principal, shipmentId, {
      ...input,
      customerVisible: false,
      pushToSales: undefined
    });
  }

  reply(principal: Principal, ticketId: string, message?: string) {
    return this.repository.replyProblemTicket(principal, ticketId, message ?? '');
  }

  close(principal: Principal, ticketId: string, reason?: string) {
    return this.repository.closeProblemTicket(principal, ticketId, reason);
  }

  assist(principal: Principal, ticketId: string, reason?: string) {
    return this.repository.assistProblemTicket(principal, ticketId, reason ?? '需要协助处理');
  }

  private async ensureAnyPermission(principal: Principal, permissions: PermissionKey[]) {
    const checks = await Promise.all(permissions.map((permission) => this.repository.hasPermission(principal.role, permission)));
    if (checks.some(Boolean)) return;
    await this.repository.recordPermissionDenied(principal, {
      permissions,
      method: 'SERVER',
      path: 'customer-service granular action'
    }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }
}

import { Body, Controller, Inject, Param, Post, Req } from '@nestjs/common';
import type { ProblemTicketCreateInput } from '@siyuan/shared/problem-ticket';
import { RequireAuth, RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { ProblemTicketCommandService } from './problem-ticket-command.service.js';

@Controller()
export class ProblemTicketCommandController {
  constructor(
    @Inject(ProblemTicketCommandService)
    private readonly commands: ProblemTicketCommandService
  ) {}

  @Post('shipments/:id/problem-tickets')
  @RequireAuth()
  createProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    return this.commands.createForCustomerService(request.user, id, body);
  }

  @Post('business/shipments/:id/problem-tickets')
  @RequirePermission('business:shipment:problem-create')
  createBusinessProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    return this.commands.createForBusiness(request.user, id, body);
  }

  @Post('operations/line-shipments/:id/problem-tickets')
  @RequirePermission('operations:line-shipment:problem-create')
  createOperationProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    return this.commands.createForOperations(request.user, id, body);
  }

  @Post('problem-tickets/:id/replies')
  @RequirePermission('customer-service:problem:reply')
  replyProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { message?: string }) {
    return this.commands.reply(request.user, id, body.message);
  }

  @Post('problem-tickets/:id/close')
  @RequirePermission('customer-service:problem:close')
  closeProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.commands.close(request.user, id, body.reason);
  }

  @Post('problem-tickets/:id/assist')
  @RequirePermission('customer-service:problem:assist')
  assistProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.commands.assist(request.user, id, body.reason);
  }
}

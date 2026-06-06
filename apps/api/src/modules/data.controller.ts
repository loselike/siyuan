import { Body, Controller, ForbiddenException, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type {
  CustomerStatementCreateInput,
  PricingQuoteRequest,
  ProblemTicketCreateInput,
  ReceivableAdjustmentInput,
  ShipmentCreateInput,
  ShipmentImportRequest,
  TrackingEventInput
} from '@siyuan/shared';
import { PrismaRepository } from './prisma.repository.js';
import { RequirePermission } from './require-permission.decorator.js';
import type { Principal } from './rbac.js';

@Controller()
export class DataController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('health')
  health() {
    return { ok: true, service: 'siyuan-api' };
  }

  @Get('shipments')
  @RequirePermission('shipments:read')
  async shipments(@Req() request: { user: Principal }) {
    return this.repository.getShipments(request.user);
  }

  @Get('shipments/status-counts')
  @RequirePermission('shipments:read')
  async shipmentStatusCounts(@Req() request: { user: Principal }) {
    return this.repository.getShipmentStatusCounts(request.user);
  }

  @Post('shipments')
  @RequirePermission('shipments:write')
  async createShipment(@Req() request: { user: Principal }, @Body() body: ShipmentCreateInput) {
    return this.repository.createShipment(request.user, body);
  }

  @Post('shipments/import')
  @RequirePermission('shipments:write')
  async importShipments(@Req() request: { user: Principal }, @Body() body: ShipmentImportRequest) {
    return this.repository.importShipments(request.user, body);
  }

  @Post('shipments/:id/receive')
  @RequirePermission('shipments:write')
  async receiveShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.receiveShipment(request.user, id);
  }

  @Post('shipments/:id/route')
  @RequirePermission('shipments:write')
  async routeShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { channelId?: string; agentId?: string }) {
    return this.repository.routeShipment(request.user, id, body);
  }

  @Post('shipments/:id/dispatch')
  @RequirePermission('shipments:write')
  async dispatchShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { transferNo?: string }) {
    return this.repository.dispatchShipment(request.user, id, body);
  }

  @Post('shipments/:id/labels')
  @RequirePermission('shipments:write')
  async createShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能申请面单');
    }
    return this.repository.createShipmentLabel(request.user, id);
  }

  @Get('shipments/:id/labels')
  @RequirePermission('shipments:read')
  async shipmentLabels(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看内部面单');
    }
    return this.repository.getShipmentLabels(request.user, id);
  }

  @Post('shipments/:id/labels/:labelId/void')
  @RequirePermission('shipments:write')
  async voidShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string, @Param('labelId') labelId: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能作废面单');
    }
    return this.repository.voidShipmentLabel(request.user, id, labelId);
  }

  @Post('shipments/:id/fees/generate')
  @RequirePermission('finance:settle')
  async generateShipmentFees(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { baseRatePerKg: number; payableRatePerKg: number; fuelRate: number; surcharges?: Array<{ name: string; amount: number }> }
  ) {
    return this.repository.generateShipmentFees(request.user, id, body);
  }

  @Post('shipments/:id/receivable-adjustments')
  @RequirePermission('finance:settle')
  async addReceivableAdjustment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ReceivableAdjustmentInput) {
    return this.repository.addReceivableAdjustment(request.user, id, body);
  }

  @Post('shipments/:id/tracking-events')
  @RequirePermission('shipments:write')
  async addTrackingEvent(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: TrackingEventInput) {
    return this.repository.addTrackingEvent(request.user, id, body);
  }

  @Get('problem-tickets')
  @RequirePermission('shipments:read')
  async problemTickets(@Req() request: { user: Principal }) {
    return this.repository.getProblemTickets(request.user);
  }

  @Post('shipments/:id/problem-tickets')
  @RequirePermission('shipments:write')
  async createProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    return this.repository.createProblemTicket(request.user, id, body);
  }

  @Post('problem-tickets/:id/replies')
  @RequirePermission('shipments:write')
  async replyProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { message?: string }) {
    return this.repository.replyProblemTicket(request.user, id, body.message ?? '');
  }

  @Post('problem-tickets/:id/close')
  @RequirePermission('shipments:write')
  async closeProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.closeProblemTicket(request.user, id);
  }

  @Get('master-data')
  @RequirePermission('master-data:read')
  async masterData() {
    return this.repository.getMasterData();
  }

  @Post('pricing/quote')
  @RequirePermission('finance:read')
  quote(@Body() body: PricingQuoteRequest) {
    return this.repository.quote(body);
  }

  @Get('finance/receivables')
  @RequirePermission('finance:read')
  async receivables(@Req() request: { user: Principal }) {
    return this.repository.getReceivables(request.user);
  }

  @Get('finance/customer-statements')
  @RequirePermission('finance:read')
  async customerStatements(@Req() request: { user: Principal }) {
    return this.repository.getCustomerStatements(request.user);
  }

  @Post('finance/customer-statements')
  @RequirePermission('finance:settle')
  async createCustomerStatement(@Req() request: { user: Principal }, @Body() body: CustomerStatementCreateInput) {
    return this.repository.createCustomerStatement(request.user, body);
  }
}

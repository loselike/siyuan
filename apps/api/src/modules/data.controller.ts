import { Body, Controller, ForbiddenException, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import type {
  AgentCreateInput,
  CarrierCreateInput,
  ChannelCreateInput,
  CustomerStatementCreateInput,
  CustomerContactCreateInput,
  CustomerCreateInput,
  CustomerUserCreateInput,
  EnabledUpdateInput,
  ExchangeRateCreateInput,
  FuelRateCreateInput,
  PaymentCreateInput,
  PricingQuoteRequest,
  PricingRuleCreateInput,
  PricingRuleQuoteRequest,
  ProblemTicketCreateInput,
  ReceivableAdjustmentInput,
  SurchargeCreateInput,
  ShipmentCreateInput,
  ShipmentImportRequest,
  TrackingEventInput
} from '@siyuan/shared';
import { PrismaRepository } from './prisma.repository.js';
import { RequirePermission } from './require-permission.decorator.js';
import { roleMetadata, type PermissionKey, type Principal, type RoleKey } from './rbac.js';

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

  @Get('carrier-tasks')
  @RequirePermission('shipments:read')
  async carrierTasks(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看承运商任务');
    }
    return this.repository.getCarrierTasks(request.user);
  }

  @Post('carrier-tasks/:id/run')
  @RequirePermission('shipments:write')
  async runCarrierTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { fail?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能执行承运商任务');
    }
    return this.repository.runCarrierTask(request.user, id, body);
  }

  @Post('carrier-tasks/:id/retry')
  @RequirePermission('shipments:write')
  async retryCarrierTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { fail?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能重试承运商任务');
    }
    return this.repository.retryCarrierTask(request.user, id, body);
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

  @Get('master-data/customers')
  @RequirePermission('master-data:read')
  async masterDataCustomers() {
    return (await this.repository.getMasterData()).customers;
  }

  @Post('master-data/customers')
  @RequirePermission('system:manage')
  async createMasterDataCustomer(@Req() request: { user: Principal }, @Body() body: CustomerCreateInput) {
    return this.repository.createCustomer(request.user, body);
  }

  @Post('master-data/customers/:id/contacts')
  @RequirePermission('system:manage')
  async createMasterDataCustomerContact(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerContactCreateInput) {
    return this.repository.createCustomerContact(request.user, id, body);
  }

  @Post('master-data/customers/:id/users')
  @RequirePermission('system:manage')
  async createMasterDataCustomerUser(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerUserCreateInput) {
    return this.repository.createCustomerUser(request.user, id, body);
  }

  @Put('master-data/customers/:id/enabled')
  @RequirePermission('system:manage')
  async updateMasterDataCustomerEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateCustomerEnabled(request.user, id, body);
  }

  @Get('master-data/agents')
  @RequirePermission('master-data:read')
  async masterDataAgents() {
    return (await this.repository.getMasterData()).agents;
  }

  @Post('master-data/agents')
  @RequirePermission('system:manage')
  async createMasterDataAgent(@Req() request: { user: Principal }, @Body() body: AgentCreateInput) {
    return this.repository.createAgent(request.user, body);
  }

  @Put('master-data/agents/:id/enabled')
  @RequirePermission('system:manage')
  async updateMasterDataAgentEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateAgentEnabled(request.user, id, body);
  }

  @Get('master-data/carriers')
  @RequirePermission('master-data:read')
  async masterDataCarriers() {
    return (await this.repository.getMasterData()).carriers;
  }

  @Post('master-data/carriers')
  @RequirePermission('system:manage')
  async createMasterDataCarrier(@Req() request: { user: Principal }, @Body() body: CarrierCreateInput) {
    return this.repository.createCarrier(request.user, body);
  }

  @Put('master-data/carriers/:id/enabled')
  @RequirePermission('system:manage')
  async updateMasterDataCarrierEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateCarrierEnabled(request.user, id, body);
  }

  @Get('master-data/channels')
  @RequirePermission('master-data:read')
  async masterDataChannels() {
    return (await this.repository.getMasterData()).channels;
  }

  @Post('master-data/channels')
  @RequirePermission('system:manage')
  async createMasterDataChannel(@Req() request: { user: Principal }, @Body() body: ChannelCreateInput) {
    return this.repository.createChannel(request.user, body);
  }

  @Put('master-data/channels/:id/enabled')
  @RequirePermission('system:manage')
  async updateMasterDataChannelEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateChannelEnabled(request.user, id, body);
  }

  @Get('master-data/surcharges')
  @RequirePermission('master-data:read')
  async masterDataSurcharges() {
    return (await this.repository.getMasterData()).surcharges;
  }

  @Post('master-data/surcharges')
  @RequirePermission('system:manage')
  async createMasterDataSurcharge(@Req() request: { user: Principal }, @Body() body: SurchargeCreateInput) {
    return this.repository.createSurcharge(request.user, body);
  }

  @Put('master-data/surcharges/:id/enabled')
  @RequirePermission('system:manage')
  async updateMasterDataSurchargeEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateSurchargeEnabled(request.user, id, body);
  }

  @Get('master-data/fuel-rates')
  @RequirePermission('master-data:read')
  async masterDataFuelRates() {
    return (await this.repository.getMasterData()).fuelRates;
  }

  @Post('master-data/fuel-rates')
  @RequirePermission('system:manage')
  async createMasterDataFuelRate(@Req() request: { user: Principal }, @Body() body: FuelRateCreateInput) {
    return this.repository.createFuelRate(request.user, body);
  }

  @Get('master-data/exchange-rates')
  @RequirePermission('master-data:read')
  async masterDataExchangeRates() {
    return (await this.repository.getMasterData()).exchangeRates;
  }

  @Post('master-data/exchange-rates')
  @RequirePermission('system:manage')
  async createMasterDataExchangeRate(@Req() request: { user: Principal }, @Body() body: ExchangeRateCreateInput) {
    return this.repository.createExchangeRate(request.user, body);
  }

  @Get('system/roles')
  @RequirePermission('system:manage')
  async systemRoles() {
    return this.repository.getRolePermissionMatrix();
  }

  @Put('system/roles/:role/permissions')
  @RequirePermission('system:manage')
  async updateRolePermissions(
    @Req() request: { user: Principal },
    @Param('role') role: RoleKey,
    @Body() body: { permissions?: PermissionKey[] }
  ) {
    if (!roleMetadata[role]) {
      throw new ForbiddenException('角色不存在');
    }
    return this.repository.updateRolePermissions(request.user, role, body.permissions ?? []);
  }

  @Post('pricing/quote')
  @RequirePermission('finance:read')
  quote(@Body() body: PricingQuoteRequest) {
    return this.repository.quote(body);
  }

  @Get('pricing/rules')
  @RequirePermission('finance:read')
  async pricingRules(@Req() request: { user: Principal }) {
    return this.repository.getPricingRules(request.user);
  }

  @Post('pricing/rules')
  @RequirePermission('finance:settle')
  async createPricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleCreateInput) {
    return this.repository.createPricingRule(request.user, body);
  }

  @Put('pricing/rules/:id/enabled')
  @RequirePermission('finance:settle')
  async updatePricingRuleEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updatePricingRuleEnabled(request.user, id, body);
  }

  @Post('pricing/rules/quote')
  @RequirePermission('finance:read')
  async quotePricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleQuoteRequest) {
    return this.repository.quotePricingRule(request.user, body);
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

  @Get('finance/customer-accounts')
  @RequirePermission('finance:read')
  async customerAccounts(@Req() request: { user: Principal }) {
    return this.repository.getCustomerAccounts(request.user);
  }

  @Get('finance/account-ledger')
  @RequirePermission('finance:read')
  async accountLedger(@Req() request: { user: Principal }) {
    return this.repository.getAccountLedger(request.user);
  }

  @Post('finance/payments')
  @RequirePermission('finance:settle')
  async createPayment(@Req() request: { user: Principal }, @Body() body: PaymentCreateInput) {
    return this.repository.createPayment(request.user, body);
  }
}

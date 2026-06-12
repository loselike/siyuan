import { Body, Controller, Delete, ForbiddenException, Get, Inject, Param, Patch, Post, Put, Req } from '@nestjs/common';
import type {
  AgentCreateInput,
  AgentMarkupCreateInput,
  AgentMarkupUpdateInput,
  AgentUpdateInput,
  CarrierCreateInput,
  ChannelCreateInput,
  CustomerStatementCreateInput,
  CustomerContactCreateInput,
  CustomerCreateInput,
  CustomerUpdateInput,
  CustomerUserCreateInput,
  EnabledUpdateInput,
  ExchangeRateCreateInput,
  FuelRateCreateInput,
  PaymentCreateInput,
  PriceBookImportInput,
  PriceBookRemarkUpdateInput,
  PriceLookupRequest,
  PricingQuoteRequest,
  PricingRuleCreateInput,
  PricingRuleQuoteRequest,
  ProblemTicketCreateInput,
  ReceivableAdjustmentInput,
  SurchargeCreateInput,
  BulkTrackingApplyRequest,
  ShipmentCreateInput,
  ShipmentImportRequest,
  ShipmentOperationalUpdateInput,
  ShipmentPaymentUpdateInput,
  TrackingEventInput,
  WarehouseConsolidationCreateInput
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
  @RequirePermission('orders:read')
  async shipments(@Req() request: { user: Principal }) {
    return this.repository.getShipments(request.user);
  }

  @Get('shipments/status-counts')
  @RequirePermission('orders:read')
  async shipmentStatusCounts(@Req() request: { user: Principal }) {
    return this.repository.getShipmentStatusCounts(request.user);
  }

  @Post('shipments')
  @RequirePermission('orders:write')
  async createShipment(@Req() request: { user: Principal }, @Body() body: ShipmentCreateInput) {
    return this.repository.createShipment(request.user, body);
  }

  @Post('shipments/import')
  @RequirePermission('orders:write')
  async importShipments(@Req() request: { user: Principal }, @Body() body: ShipmentImportRequest) {
    return this.repository.importShipments(request.user, body);
  }

  @Post('shipments/:id/receive')
  @RequirePermission('warehouse:write')
  async receiveShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.receiveShipment(request.user, id);
  }

  @Post('shipments/:id/route')
  @RequirePermission('routing:write')
  async routeShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { channelId?: string; agentId?: string }) {
    return this.repository.routeShipment(request.user, id, body);
  }

  @Post('shipments/:id/dispatch')
  @RequirePermission('warehouse:write')
  async dispatchShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { transferNo?: string }) {
    return this.repository.dispatchShipment(request.user, id, body);
  }

  @Patch('shipments/:id/operational')
  @RequirePermission('orders:write')
  async updateShipmentOperational(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentOperationalUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能人工修改运单');
    }
    return this.repository.updateShipmentOperational(request.user, id, body);
  }

  @Post('shipments/:id/payment')
  @RequirePermission('orders:write')
  async registerShipmentPayment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentPaymentUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能登记收款');
    }
    return this.repository.registerShipmentPayment(request.user, id, body);
  }

  @Post('shipments/tracking-events/import')
  @RequirePermission('tracking:write')
  async importTrackingEvents(@Req() request: { user: Principal }, @Body() body: BulkTrackingApplyRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能批量导入轨迹');
    }
    return this.repository.importTrackingEvents(request.user, body);
  }

  @Delete('shipments/:id')
  @RequirePermission('orders:write')
  async deleteShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    return this.repository.deleteShipment(request.user, id);
  }

  @Post('shipments/:id/labels')
  @RequirePermission('warehouse:write')
  async createShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能申请面单');
    }
    return this.repository.createShipmentLabel(request.user, id);
  }

  @Get('shipments/:id/labels')
  @RequirePermission('warehouse:read')
  async shipmentLabels(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看内部面单');
    }
    return this.repository.getShipmentLabels(request.user, id);
  }

  @Post('shipments/:id/labels/:labelId/void')
  @RequirePermission('warehouse:write')
  async voidShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string, @Param('labelId') labelId: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能作废面单');
    }
    return this.repository.voidShipmentLabel(request.user, id, labelId);
  }

  @Get('carrier-tasks')
  @RequirePermission('tracking:read')
  async carrierTasks(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看承运商任务');
    }
    return this.repository.getCarrierTasks(request.user);
  }

  @Post('carrier-tasks/:id/run')
  @RequirePermission('tracking:write')
  async runCarrierTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { fail?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能执行承运商任务');
    }
    return this.repository.runCarrierTask(request.user, id, body);
  }

  @Post('carrier-tasks/:id/retry')
  @RequirePermission('tracking:write')
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
  @RequirePermission('tracking:write')
  async addTrackingEvent(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: TrackingEventInput) {
    return this.repository.addTrackingEvent(request.user, id, body);
  }

  @Get('problem-tickets')
  @RequirePermission('problems:read')
  async problemTickets(@Req() request: { user: Principal }) {
    return this.repository.getProblemTickets(request.user);
  }

  @Post('shipments/:id/problem-tickets')
  @RequirePermission('problems:write')
  async createProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    return this.repository.createProblemTicket(request.user, id, body);
  }

  @Post('problem-tickets/:id/replies')
  @RequirePermission('problems:write')
  async replyProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { message?: string }) {
    return this.repository.replyProblemTicket(request.user, id, body.message ?? '');
  }

  @Post('problem-tickets/:id/close')
  @RequirePermission('problems:write')
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
  @RequirePermission('master-data:write')
  async createMasterDataCustomer(@Req() request: { user: Principal }, @Body() body: CustomerCreateInput) {
    return this.repository.createCustomer(request.user, body);
  }

  @Put('master-data/customers/:id')
  @RequirePermission('master-data:write')
  async updateMasterDataCustomer(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerUpdateInput) {
    return this.repository.updateCustomer(request.user, id, body);
  }

  @Post('master-data/customers/:id/contacts')
  @RequirePermission('master-data:write')
  async createMasterDataCustomerContact(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerContactCreateInput) {
    return this.repository.createCustomerContact(request.user, id, body);
  }

  @Post('master-data/customers/:id/users')
  @RequirePermission('master-data:write')
  async createMasterDataCustomerUser(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerUserCreateInput) {
    return this.repository.createCustomerUser(request.user, id, body);
  }

  @Put('master-data/customers/:id/enabled')
  @RequirePermission('master-data:write')
  async updateMasterDataCustomerEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateCustomerEnabled(request.user, id, body);
  }

  @Get('master-data/agents')
  @RequirePermission('master-data:read')
  async masterDataAgents() {
    return (await this.repository.getMasterData()).agents;
  }

  @Post('master-data/agents')
  @RequirePermission('master-data:write')
  async createMasterDataAgent(@Req() request: { user: Principal }, @Body() body: AgentCreateInput) {
    return this.repository.createAgent(request.user, body);
  }

  @Put('master-data/agents/:id')
  @RequirePermission('master-data:write')
  async updateMasterDataAgent(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentUpdateInput) {
    return this.repository.updateAgent(request.user, id, body);
  }

  @Put('master-data/agents/:id/enabled')
  @RequirePermission('master-data:write')
  async updateMasterDataAgentEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateAgentEnabled(request.user, id, body);
  }

  @Get('master-data/carriers')
  @RequirePermission('master-data:read')
  async masterDataCarriers() {
    return (await this.repository.getMasterData()).carriers;
  }

  @Post('master-data/carriers')
  @RequirePermission('master-data:write')
  async createMasterDataCarrier(@Req() request: { user: Principal }, @Body() body: CarrierCreateInput) {
    return this.repository.createCarrier(request.user, body);
  }

  @Put('master-data/carriers/:id/enabled')
  @RequirePermission('master-data:write')
  async updateMasterDataCarrierEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateCarrierEnabled(request.user, id, body);
  }

  @Get('master-data/channels')
  @RequirePermission('master-data:read')
  async masterDataChannels() {
    return (await this.repository.getMasterData()).channels;
  }

  @Post('master-data/channels')
  @RequirePermission('master-data:write')
  async createMasterDataChannel(@Req() request: { user: Principal }, @Body() body: ChannelCreateInput) {
    return this.repository.createChannel(request.user, body);
  }

  @Put('master-data/channels/:id/enabled')
  @RequirePermission('master-data:write')
  async updateMasterDataChannelEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateChannelEnabled(request.user, id, body);
  }

  @Get('master-data/surcharges')
  @RequirePermission('master-data:read')
  async masterDataSurcharges() {
    return (await this.repository.getMasterData()).surcharges;
  }

  @Post('master-data/surcharges')
  @RequirePermission('master-data:write')
  async createMasterDataSurcharge(@Req() request: { user: Principal }, @Body() body: SurchargeCreateInput) {
    return this.repository.createSurcharge(request.user, body);
  }

  @Put('master-data/surcharges/:id/enabled')
  @RequirePermission('master-data:write')
  async updateMasterDataSurchargeEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateSurchargeEnabled(request.user, id, body);
  }

  @Get('master-data/fuel-rates')
  @RequirePermission('master-data:read')
  async masterDataFuelRates() {
    return (await this.repository.getMasterData()).fuelRates;
  }

  @Post('master-data/fuel-rates')
  @RequirePermission('master-data:write')
  async createMasterDataFuelRate(@Req() request: { user: Principal }, @Body() body: FuelRateCreateInput) {
    return this.repository.createFuelRate(request.user, body);
  }

  @Get('master-data/exchange-rates')
  @RequirePermission('master-data:read')
  async masterDataExchangeRates() {
    return (await this.repository.getMasterData()).exchangeRates;
  }

  @Post('master-data/exchange-rates')
  @RequirePermission('master-data:write')
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
  @RequirePermission('pricing:lookup')
  quote(@Body() body: PricingQuoteRequest) {
    return this.repository.quote(body);
  }

  @Get('pricing/books')
  @RequirePermission('pricing:manage')
  async priceBooks(@Req() request: { user: Principal }) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以查看价格表明细');
    }
    return this.repository.getPriceBooks(request.user);
  }

  @Post('pricing/lookup')
  @RequirePermission('pricing:lookup')
  async priceLookup(@Req() request: { user: Principal }, @Body() body: PriceLookupRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
    }
    return this.repository.lookupPrice(request.user, body);
  }

  @Get('pricing/markup-rules')
  @RequirePermission('pricing:manage')
  async agentMarkupRules(@Req() request: { user: Principal }) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以查看代理加价规则');
    }
    return this.repository.getAgentMarkupRules(request.user);
  }

  @Post('pricing/markup-rules')
  @RequirePermission('pricing:manage')
  async createAgentMarkupRule(@Req() request: { user: Principal }, @Body() body: AgentMarkupCreateInput) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以新增代理加价规则');
    }
    return this.repository.createAgentMarkupRule(request.user, body);
  }

  @Put('pricing/markup-rules/:id')
  @RequirePermission('pricing:manage')
  async updateAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentMarkupUpdateInput) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以修改代理加价规则');
    }
    return this.repository.updateAgentMarkupRule(request.user, id, body);
  }

  @Delete('pricing/markup-rules/:id')
  @RequirePermission('pricing:manage')
  async deleteAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以删除代理加价规则');
    }
    return this.repository.deleteAgentMarkupRule(request.user, id);
  }

  @Post('pricing/books/import')
  @RequirePermission('pricing:manage')
  async importPriceBook(@Req() request: { user: Principal }, @Body() body: PriceBookImportInput) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以导入价格表');
    }
    return this.repository.importPriceBook(request.user, body);
  }

  @Put('pricing/books/:id/remark')
  @RequirePermission('pricing:manage')
  async updatePriceBookRemark(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PriceBookRemarkUpdateInput) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以维护价格表备注');
    }
    return this.repository.updatePriceBookRemark(request.user, id, body);
  }

  @Delete('pricing/books/:id')
  @RequirePermission('pricing:manage')
  async deletePriceBook(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以删除价格表');
    }
    return this.repository.deletePriceBook(request.user, id);
  }

  @Get('pricing/rules')
  @RequirePermission('pricing:manage')
  async pricingRules(@Req() request: { user: Principal }) {
    return this.repository.getPricingRules(request.user);
  }

  @Post('pricing/rules')
  @RequirePermission('pricing:manage')
  async createPricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleCreateInput) {
    return this.repository.createPricingRule(request.user, body);
  }

  @Put('pricing/rules/:id/enabled')
  @RequirePermission('pricing:manage')
  async updatePricingRuleEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updatePricingRuleEnabled(request.user, id, body);
  }

  @Post('pricing/rules/quote')
  @RequirePermission('pricing:lookup')
  async quotePricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleQuoteRequest) {
    return this.repository.quotePricingRule(request.user, body);
  }

  @Get('warehouse/packages')
  @RequirePermission('warehouse:read')
  async warehousePackages(@Req() request: { user: Principal }) {
    if (!['ADMIN', 'WAREHOUSE'].includes(request.user.role)) {
      throw new ForbiddenException('当前角色不能查看仓库包裹');
    }
    return this.repository.getWarehousePackages(request.user);
  }

  @Get('warehouse/package-groups')
  @RequirePermission('warehouse:read')
  async warehousePackageGroups(@Req() request: { user: Principal }) {
    if (!['ADMIN', 'WAREHOUSE'].includes(request.user.role)) {
      throw new ForbiddenException('当前角色不能查看仓库包裹');
    }
    return this.repository.getWarehousePackageGroups(request.user);
  }

  @Post('warehouse/packages/sync-mock')
  @RequirePermission('warehouse:write')
  async syncWarehouseMockPackages(@Req() request: { user: Principal }) {
    if (!['ADMIN', 'WAREHOUSE'].includes(request.user.role)) {
      throw new ForbiddenException('当前角色不能同步仓库包裹');
    }
    return this.repository.syncMockWarehousePackages(request.user);
  }

  @Post('warehouse/consolidations')
  @RequirePermission('warehouse:write')
  async createWarehouseConsolidation(@Req() request: { user: Principal }, @Body() body: WarehouseConsolidationCreateInput) {
    if (!['ADMIN', 'WAREHOUSE'].includes(request.user.role)) {
      throw new ForbiddenException('当前角色不能合并仓库包裹');
    }
    return this.repository.createWarehouseConsolidation(request.user, body);
  }

  @Post('warehouse/consolidations/:id/create-shipment')
  @RequirePermission('warehouse:write')
  async createWarehouseConsolidationShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (!['ADMIN', 'WAREHOUSE'].includes(request.user.role)) {
      throw new ForbiddenException('当前角色不能创建仓库出货单');
    }
    return this.repository.createShipmentFromWarehouseConsolidation(request.user, id);
  }

  @Get('warehouse/consolidations/:id/items')
  @RequirePermission('warehouse:read')
  async warehouseConsolidationItems(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (!['ADMIN', 'WAREHOUSE'].includes(request.user.role)) {
      throw new ForbiddenException('当前角色不能查看合并包裹明细');
    }
    return this.repository.getWarehouseConsolidationItems(request.user, id);
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

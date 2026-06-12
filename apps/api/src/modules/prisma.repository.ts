import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Shipment as PrismaShipment } from '@prisma/client';
import {
  canTransitionShipment,
  calculateQuote,
  quoteWithPricingRules,
  createFeeLinesFromQuote,
  createMockTransferNo,
  createMockTrackingStatus,
  createSystemOrderNo,
  summarizeStatement,
  summarizePaymentSettlement,
  summarizeStatusCounts,
  validateShipmentImportRows,
  type AccountLedgerSummary,
  type AgentCreateInput,
  type AgentMarkupCreateInput,
  type AgentMarkupSummary,
  type AgentMarkupUpdateInput,
  type AgentSummary,
  type AgentUpdateInput,
  type BusinessType,
  type CarrierAdapterCode,
  type CarrierCreateInput,
  type CarrierSummary,
  type CarrierTaskRunResponse,
  type CarrierTaskSummary,
  type ChannelCreateInput,
  type ChannelSummary,
  type CustomerAccountSummary,
  type CustomerContactCreateInput,
  type CustomerContactSummary,
  type CustomerCreateInput,
  type CustomerStatementCreateInput,
  type CustomerStatementSummary,
  type CustomerSummary,
  type CustomerUpdateInput,
  type CustomerUserCreateInput,
  type CustomerUserSummary,
  type EnabledUpdateInput,
  type ExchangeRateCreateInput,
  type ExchangeRateSummary,
  type FuelRateCreateInput,
  type FuelRateSummary,
  type LabelCreateResponse,
  type MasterDataSnapshot,
  type PaymentCreateInput,
  type PaymentCreateResponse,
  type PriceBookImportInput,
  type PriceBookRemarkUpdateInput,
  type PriceBooksResponse,
  type PriceBookRowSummary,
  type PriceBookSummary,
  type PriceLookupRequest,
  type PriceLookupResponse,
  type PriceLookupRecommendation,
  type PricingQuoteRequest,
  type PricingRuleCreateInput,
  type PricingRuleQuoteRequest,
  type PricingRuleQuoteResponse,
  type PricingRuleSummary,
  type ProblemTicketCreateInput,
  type ProblemTicketSummary,
  type ReceivableAdjustmentInput,
  type ReceivableFeeSummary,
  type SurchargeCreateInput,
  type SurchargeSummary,
  shipmentStatusLabels,
  type BulkTrackingApplyRequest,
  type BulkTrackingApplyResponse,
  type Shipment,
  type ShipmentCreateInput,
  type ShipmentImportRequest,
  type ShipmentImportResponse,
  type ShipmentLabelSummary,
  type ShipmentOperationalUpdateInput,
  type ShipmentPaymentUpdateInput,
  type ShipmentPaymentMethod,
  type ShipmentStatus,
  type TrackingEventInput,
  type WarehouseConsolidationCreateInput,
  type WarehouseConsolidationSummary,
  type WarehousePackageGroupSummary,
  type WarehousePackageStatus,
  type WarehousePackageSummary
} from '@siyuan/shared';
import { hashPassword } from './password.js';
import { PrismaService } from './prisma.service.js';
import {
  allPermissions,
  buildRolePermissionRow,
  normalizeRolePermissions,
  permissionDefinitions,
  roleMetadata,
  rolePermissions,
  type PermissionKey,
  type Principal,
  type RoleKey,
  type RolePermissionRow
} from './rbac.js';

type ShipmentWithRelations = PrismaShipment & {
  customer: { code: string; name: string };
  channel: ({ name: string; carrier: { name: string } } | null);
  agent: ({ name: string } | null);
  problemTickets: Array<{ id: string; status: string }>;
};

const defaultAgentMarkupRules = [
  { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, enabled: true },
  { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, enabled: true },
  { id: 'markup-yiyang', agentName: '亿阳国际', markupPerKg: 0.5, enabled: true }
];

const seedAgentQuoteErrors = [
  { agentName: 'BSD', quoteCount: 0, errorCode: 'TOKEN_INVALID', errorMessage: 'Token不正确' }
];

const warehouseMockPackages = [
  { id: 'wh-api-1399-1', combinedOrderNo: '1399-KY4001036478949', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', expectedTotalPackageCount: 10, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, scanTime: new Date('2026-06-08T10:07:28+08:00') },
  { id: 'wh-api-1399-2', combinedOrderNo: '1399-KY4001036478949', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', expectedTotalPackageCount: 10, weightKg: 13.9, lengthCm: 130, widthCm: 46, heightCm: 51, cbm: 0.30498, volumetricWeightKg: 50.83, scanTime: new Date('2026-06-08T10:08:08+08:00') },
  { id: 'wh-api-1399-3', combinedOrderNo: '1399-KY4001036478949', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', expectedTotalPackageCount: 10, weightKg: 14.2, lengthCm: 129, widthCm: 46, heightCm: 51, cbm: 0.302634, volumetricWeightKg: 50.44, scanTime: new Date('2026-06-08T10:08:48+08:00') },
  { id: 'wh-api-p710-1', combinedOrderNo: 'P710-999056444656', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', expectedTotalPackageCount: 5, weightKg: 18, lengthCm: 54, widthCm: 34, heightCm: 41, cbm: 0.075276, volumetricWeightKg: 12.55, scanTime: new Date('2026-06-08T10:14:14+08:00') },
  { id: 'wh-api-p710-2', combinedOrderNo: 'P710-999056444656', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', expectedTotalPackageCount: 5, weightKg: 18, lengthCm: 54, widthCm: 34, heightCm: 41, cbm: 0.075276, volumetricWeightKg: 12.55, scanTime: new Date('2026-06-08T10:14:14+08:00') },
  { id: 'wh-api-p710-3', combinedOrderNo: 'P710-999056444656', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', expectedTotalPackageCount: 5, weightKg: 18, lengthCm: 54, widthCm: 35, heightCm: 41, cbm: 0.07749, volumetricWeightKg: 12.91, scanTime: new Date('2026-06-08T10:14:23+08:00') }
];

@Injectable()
export class PrismaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAccount(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, enabled: true },
      include: { role: true }
    });

    if (!user || user.passwordHash !== hashPassword(password)) {
      return undefined;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role.name as RoleKey,
      customerId: user.customerId ?? undefined
    };
  }

  async recordLoginLog(principal: Principal, input: { ip: string; userAgent?: string }) {
    await (this.prisma as any).loginLog.create({
      data: {
        userId: principal.id,
        username: principal.username,
        ip: input.ip,
        region: inferIpRegion(input.ip),
        userAgent: input.userAgent ?? null
      }
    });
  }

  async getLoginLogs(principal: Principal) {
    const rows = await (this.prisma as any).loginLog.findMany({
      where: { userId: principal.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      ip: row.ip,
      region: row.region,
      userAgent: row.userAgent ?? undefined,
      createdAt: row.createdAt.toISOString()
    }));
  }

  async changePassword(principal: Principal, input: { currentPassword?: string; newPassword?: string }) {
    const currentPassword = input.currentPassword ?? '';
    const newPassword = input.newPassword ?? '';
    if (newPassword.length < 6) {
      throw new BadRequestException('新密码至少需要 6 位');
    }

    const user = await this.prisma.user.findUnique({ where: { id: principal.id } });
    if (!user || user.passwordHash !== hashPassword(currentPassword)) {
      throw new ForbiddenException('当前密码不正确');
    }

    await this.prisma.user.update({
      where: { id: principal.id },
      data: { passwordHash: hashPassword(newPassword) }
    });
    await (this.prisma as any).auditLog.create({
      data: {
        actorId: principal.id,
        action: 'auth.password.change',
        target: `user:${principal.id}`,
        before: null,
        after: { username: principal.username }
      }
    });
    return { ok: true };
  }

  async getShipments(principal: Principal): Promise<Shipment[]> {
    const rows = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
      },
      include: shipmentIncludes,
      orderBy: { createdAt: 'desc' }
    });

    return rows.map(mapShipment);
  }

  async getShipmentStatusCounts(principal: Principal) {
    return summarizeStatusCounts(await this.getShipments(principal));
  }

  async getMasterData(): Promise<MasterDataSnapshot> {
    const [customers, contacts, customerUsers, carriers, channels, roles, agents, surcharges, fuelRates, exchangeRates] = await Promise.all([
      this.prisma.customer.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.customerContact.findMany({ include: { customer: true }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { customerId: { not: null }, role: { name: 'CUSTOMER' } }, include: { customer: true }, orderBy: { username: 'asc' } }),
      this.prisma.carrier.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.channel.findMany({ include: { carrier: true }, orderBy: { name: 'asc' } }),
      this.prisma.role.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.agent.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.surcharge.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.fuelRate.findMany({ orderBy: { activeAt: 'desc' } }),
      (this.prisma as any).exchangeRate.findMany({ orderBy: { activeAt: 'desc' } })
    ]);
    const channelMap = new Map(channels.map((channel) => [channel.id, channel.name]));

    return {
      customers: customers.map((customer) => ({
        id: customer.id,
        code: customer.code,
        name: customer.name,
        shortName: customer.name,
        fullName: `${customer.name} Co., Ltd.`,
        customerType: '直客',
        salesperson: '',
        enabled: customer.enabled
      })),
      contacts: contacts.map((contact) => ({
        id: contact.id,
        customerId: contact.customerId,
        customerName: `${contact.customer.code}-${contact.customer.name}`,
        name: contact.name,
        phone: contact.phone ?? undefined,
        email: contact.email ?? undefined,
        enabled: contact.enabled
      })),
      customerUsers: customerUsers.map((user) => ({
        id: user.id,
        customerId: user.customerId!,
        customerName: user.customer ? `${user.customer.code}-${user.customer.name}` : user.customerId!,
        username: user.username,
        enabled: user.enabled
      })),
      carriers: carriers.map((carrier) => ({
        id: carrier.id,
        name: carrier.name,
        enabled: carrier.enabled
      })),
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        carrierId: channel.carrierId,
        carrierName: channel.carrier.name,
        enabled: channel.enabled
      })),
      agents: agents.map((agent) => ({
        id: agent.id,
        code: agent.name.toUpperCase().slice(0, 6),
        shortName: agent.name,
        name: agent.name,
        integrationType: 'MANUAL',
        enabled: agent.enabled
      })),
      surcharges: surcharges.map((surcharge) => ({
        id: surcharge.id,
        name: surcharge.name,
        amount: Number(surcharge.amount),
        enabled: surcharge.enabled
      })),
      fuelRates: fuelRates.map((fuelRate) => ({
        id: fuelRate.id,
        channelId: fuelRate.channelId,
        channelName: channelMap.get(fuelRate.channelId) ?? fuelRate.channelId,
        rate: Number(fuelRate.rate),
        activeAt: fuelRate.activeAt.toISOString()
      })),
      exchangeRates: exchangeRates.map((exchangeRate: any) => ({
        id: exchangeRate.id,
        baseCurrency: exchangeRate.baseCurrency,
        quoteCurrency: exchangeRate.quoteCurrency,
        rate: Number(exchangeRate.rate),
        activeAt: exchangeRate.activeAt.toISOString(),
        enabled: exchangeRate.enabled
      })),
      roles: roles.map((role) => role.name)
    };
  }

  async createCustomer(_principal: Principal, input: CustomerCreateInput): Promise<CustomerSummary> {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    const customer = await this.prisma.customer.create({
      data: { id: `c-${input.code.trim()}`, code: input.code.trim(), name: input.name.trim() }
    });
    await this.prisma.customerAccount.create({
      data: { id: `ca-${customer.code}-cny`, customerId: customer.id, balance: 0, currency: 'CNY' }
    });
    return {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      shortName: input.shortName?.trim() || customer.name,
      fullName: input.fullName?.trim() || `${customer.name} Co., Ltd.`,
      customerType: input.customerType?.trim() || '直客',
      salesperson: input.salesperson?.trim() || '',
      enabled: customer.enabled
    };
  }

  async updateCustomer(_principal: Principal, id: string, input: CustomerUpdateInput): Promise<CustomerSummary> {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        code: input.code.trim(),
        name: input.name.trim(),
        enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
      }
    });
    return {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      shortName: input.shortName?.trim() || customer.name,
      fullName: input.fullName?.trim() || `${customer.name} Co., Ltd.`,
      customerType: input.customerType?.trim() || '直客',
      salesperson: input.salesperson?.trim() || '',
      enabled: customer.enabled
    };
  }

  async createCustomerContact(_principal: Principal, customerId: string, input: CustomerContactCreateInput): Promise<CustomerContactSummary> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    if (!input.name?.trim()) {
      throw new BadRequestException('联系人名称不能为空');
    }
    const contact = await this.prisma.customerContact.create({
      data: {
        customerId,
        name: input.name.trim(),
        phone: input.phone?.trim(),
        email: input.email?.trim()
      }
    });
    return {
      id: contact.id,
      customerId,
      customerName: `${customer.code}-${customer.name}`,
      name: contact.name,
      phone: contact.phone ?? undefined,
      email: contact.email ?? undefined,
      enabled: contact.enabled
    };
  }

  async createCustomerUser(_principal: Principal, customerId: string, input: CustomerUserCreateInput): Promise<CustomerUserSummary> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    if (!input.username?.trim() || !input.password?.trim()) {
      throw new BadRequestException('账号和密码不能为空');
    }
    const role = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!role) {
      throw new BadRequestException('客户角色不存在');
    }
    const user = await this.prisma.user.create({
      data: {
        id: `u-${input.username.trim()}`,
        username: input.username.trim(),
        passwordHash: hashPassword(input.password),
        roleId: role.id,
        customerId
      }
    });
    return {
      id: user.id,
      customerId,
      customerName: `${customer.code}-${customer.name}`,
      username: user.username,
      enabled: user.enabled
    };
  }

  async updateCustomerEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<CustomerSummary> {
    const customer = await this.prisma.customer.update({ where: { id }, data: { enabled: input.enabled === true } });
    return {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      shortName: customer.name,
      fullName: `${customer.name} Co., Ltd.`,
      customerType: '直客',
      salesperson: '',
      enabled: customer.enabled
    };
  }

  async createAgent(_principal: Principal, input: AgentCreateInput): Promise<AgentSummary> {
    const agent = await this.prisma.agent.create({ data: { id: `a-${slug(input.name)}`, name: input.name.trim() } });
    return {
      id: agent.id,
      code: input.code?.trim() || agent.name.toUpperCase().slice(0, 6),
      shortName: input.shortName?.trim() || agent.name,
      name: agent.name,
      integrationType: input.integrationType ?? 'MANUAL',
      enabled: agent.enabled
    };
  }

  async updateAgent(_principal: Principal, id: string, input: AgentUpdateInput): Promise<AgentSummary> {
    const agent = await this.prisma.agent.update({
      where: { id },
      data: {
        name: input.name.trim(),
        enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
      }
    });
    return {
      id: agent.id,
      code: input.code?.trim() || agent.name.toUpperCase().slice(0, 6),
      shortName: input.shortName?.trim() || agent.name,
      name: agent.name,
      integrationType: input.integrationType ?? 'MANUAL',
      enabled: agent.enabled
    };
  }

  async updateAgentEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<AgentSummary> {
    const agent = await this.prisma.agent.update({ where: { id }, data: { enabled: input.enabled === true } });
    return {
      id: agent.id,
      code: agent.name.toUpperCase().slice(0, 6),
      shortName: agent.name,
      name: agent.name,
      integrationType: 'MANUAL',
      enabled: agent.enabled
    };
  }

  async createCarrier(_principal: Principal, input: CarrierCreateInput): Promise<CarrierSummary> {
    const carrier = await this.prisma.carrier.create({ data: { id: `cr-${slug(input.name)}`, name: input.name.trim() } });
    return { id: carrier.id, name: carrier.name, enabled: carrier.enabled };
  }

  async updateCarrierEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<CarrierSummary> {
    const carrier = await this.prisma.carrier.update({ where: { id }, data: { enabled: input.enabled === true } });
    return { id: carrier.id, name: carrier.name, enabled: carrier.enabled };
  }

  async createChannel(_principal: Principal, input: ChannelCreateInput): Promise<ChannelSummary> {
    const carrier = await this.prisma.carrier.findUnique({ where: { id: input.carrierId } });
    if (!carrier) {
      throw new BadRequestException('承运商不存在');
    }
    const channel = await this.prisma.channel.create({
      data: { id: `ch-${slug(input.name)}`, name: input.name.trim(), carrierId: carrier.id }
    });
    return { id: channel.id, name: channel.name, carrierId: carrier.id, carrierName: carrier.name, enabled: channel.enabled };
  }

  async updateChannelEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<ChannelSummary> {
    const channel = await this.prisma.channel.update({ where: { id }, data: { enabled: input.enabled === true }, include: { carrier: true } });
    return { id: channel.id, name: channel.name, carrierId: channel.carrierId, carrierName: channel.carrier.name, enabled: channel.enabled };
  }

  async createSurcharge(_principal: Principal, input: SurchargeCreateInput): Promise<SurchargeSummary> {
    const surcharge = await this.prisma.surcharge.create({ data: { id: `sc-${slug(input.name)}`, name: input.name.trim(), amount: input.amount } });
    return { id: surcharge.id, name: surcharge.name, amount: Number(surcharge.amount), enabled: surcharge.enabled };
  }

  async updateSurchargeEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<SurchargeSummary> {
    const surcharge = await this.prisma.surcharge.update({ where: { id }, data: { enabled: input.enabled === true } });
    return { id: surcharge.id, name: surcharge.name, amount: Number(surcharge.amount), enabled: surcharge.enabled };
  }

  async createFuelRate(_principal: Principal, input: FuelRateCreateInput): Promise<FuelRateSummary> {
    const channel = await this.prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) {
      throw new BadRequestException('渠道不存在');
    }
    const fuelRate = await this.prisma.fuelRate.create({
      data: { id: `fr-${Date.now()}`, channelId: channel.id, rate: input.rate, activeAt: new Date(input.activeAt) }
    });
    return { id: fuelRate.id, channelId: channel.id, channelName: channel.name, rate: Number(fuelRate.rate), activeAt: fuelRate.activeAt.toISOString() };
  }

  async createExchangeRate(_principal: Principal, input: ExchangeRateCreateInput): Promise<ExchangeRateSummary> {
    const exchangeRate = await (this.prisma as any).exchangeRate.create({
      data: {
        id: `er-${input.baseCurrency.toLowerCase()}-${input.quoteCurrency.toLowerCase()}-${Date.now()}`,
        baseCurrency: input.baseCurrency.trim().toUpperCase(),
        quoteCurrency: input.quoteCurrency.trim().toUpperCase(),
        rate: input.rate,
        activeAt: new Date(input.activeAt),
        enabled: true
      }
    });
    return {
      id: exchangeRate.id,
      baseCurrency: exchangeRate.baseCurrency,
      quoteCurrency: exchangeRate.quoteCurrency,
      rate: Number(exchangeRate.rate),
      activeAt: exchangeRate.activeAt.toISOString(),
      enabled: exchangeRate.enabled
    };
  }

  async hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean> {
    if (role === 'ADMIN') {
      return true;
    }
    const row = await this.prisma.role.findUnique({
      where: { name: role },
      include: { permissions: true }
    });
    const permissions = resolveStoredRolePermissions(role, row?.permissions.map((item) => item.code as PermissionKey));
    return permissions.includes(permission);
  }

  async getPermissionsForRole(role: RoleKey): Promise<PermissionKey[]> {
    if (role === 'ADMIN') {
      return allPermissions();
    }
    const row = await this.prisma.role.findUnique({
      where: { name: role },
      include: { permissions: true }
    });
    return resolveStoredRolePermissions(role, row?.permissions.map((item) => item.code as PermissionKey));
  }

  async getRolePermissionMatrix(): Promise<{ availablePermissions: typeof permissionDefinitions; roles: RolePermissionRow[] }> {
    const rows = await this.prisma.role.findMany({ include: { permissions: true } });
    const byName = new Map(rows.map((row) => [row.name as RoleKey, row.permissions.map((item) => item.code as PermissionKey)]));
    return {
      availablePermissions: permissionDefinitions,
      roles: (Object.keys(roleMetadata) as RoleKey[]).map((role) => buildRolePermissionRow(role, resolveStoredRolePermissions(role, byName.get(role))))
    };
  }

  async updateRolePermissions(principal: Principal, role: RoleKey, permissions: PermissionKey[]): Promise<RolePermissionRow> {
    const normalized = normalizeRolePermissions(role, permissions);
    const before = (await this.getRolePermissionMatrix()).roles.find((item) => item.key === role)?.permissions ?? [];
    for (const permission of normalized) {
      await this.prisma.permission.upsert({
        where: { code: permission },
        create: { code: permission },
        update: {}
      });
    }
    const updated = await this.prisma.role.upsert({
      where: { name: role },
      create: {
        id: `r-${role.toLowerCase()}`,
        name: role,
        permissions: { connect: normalized.map((code) => ({ code })) }
      },
      update: { permissions: { set: normalized.map((code) => ({ code })) } },
      include: { permissions: true }
    });
    const after = updated.permissions.map((item) => item.code as PermissionKey);
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.role_permissions.update',
        target: `role:${role}`,
        before,
        after
      }
    });
    return buildRolePermissionRow(role, after);
  }

  quote(input: PricingQuoteRequest) {
    return calculateQuote(input);
  }

  async lookupPrice(principal: Principal, input: PriceLookupRequest): Promise<PriceLookupResponse> {
    this.ensureStaffPricingAccess(principal);
    const [books, markupRules] = await Promise.all([
      (this.prisma as any).priceBook.findMany({
        where: { deletedAt: null },
        include: { rows: true },
        orderBy: { importedAt: 'desc' }
      }),
      this.loadAgentMarkupRules()
    ]);
    return createBackendPriceLookup(
      principal,
      input,
      books.flatMap((book: any) => book.rows.map(mapPriceBookRow)),
      books.map(mapPriceBook),
      markupRules
    );
  }

  async getAgentMarkupRules(principal: Principal): Promise<AgentMarkupSummary[]> {
    this.ensureAdmin(principal, '只有管理员可以查看代理加价规则');
    return this.loadAgentMarkupRules();
  }

  async createAgentMarkupRule(principal: Principal, input: AgentMarkupCreateInput): Promise<AgentMarkupSummary> {
    this.ensureAdmin(principal, '只有管理员可以新增代理加价规则');
    if (!input.agentName?.trim() || !Number.isFinite(input.markupPerKg) || input.markupPerKg < 0) {
      throw new BadRequestException('代理名称和加价金额不能为空');
    }
    const row = await (this.prisma as any).agentMarkupRule.create({
      data: {
        agentName: input.agentName.trim(),
        channelName: input.channelName?.trim() || null,
        realChannelName: input.realChannelName?.trim() || null,
        destinationCountry: input.destinationCountry?.trim() || null,
        markupPerKg: input.markupPerKg,
        enabled: input.enabled !== false
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.create', target: row.id, after: { ...mapAgentMarkupRule(row) } }
    });
    return mapAgentMarkupRule(row);
  }

  async updateAgentMarkupRule(principal: Principal, id: string, input: AgentMarkupUpdateInput): Promise<AgentMarkupSummary> {
    this.ensureAdmin(principal, '只有管理员可以修改代理加价规则');
    const current = await (this.prisma as any).agentMarkupRule.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('代理加价规则不存在');
    }
    const row = await (this.prisma as any).agentMarkupRule.update({
      where: { id },
      data: {
        ...(input.agentName !== undefined ? { agentName: input.agentName.trim() } : {}),
        ...(input.channelName !== undefined ? { channelName: input.channelName.trim() || null } : {}),
        ...(input.realChannelName !== undefined ? { realChannelName: input.realChannelName.trim() || null } : {}),
        ...(input.destinationCountry !== undefined ? { destinationCountry: input.destinationCountry.trim() || null } : {}),
        ...(input.markupPerKg !== undefined ? { markupPerKg: input.markupPerKg } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {})
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.update', target: id, before: { ...mapAgentMarkupRule(current) }, after: { ...mapAgentMarkupRule(row) } }
    });
    return mapAgentMarkupRule(row);
  }

  async deleteAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupSummary> {
    return this.updateAgentMarkupRule(principal, id, { enabled: false });
  }

  async getPriceBooks(principal: Principal): Promise<PriceBooksResponse> {
    this.ensureStaffPricingAccess(principal);
    const books = await (this.prisma as any).priceBook.findMany({
      where: { deletedAt: null },
      include: { rows: true },
      orderBy: { importedAt: 'desc' }
    });

    return {
      books: books.map(mapPriceBook),
      rows: books.flatMap((book: any) => book.rows.map(mapPriceBookRow))
    };
  }

  async importPriceBook(principal: Principal, input: PriceBookImportInput): Promise<{ book: PriceBookSummary; rows: PriceBookRowSummary[] }> {
    this.ensureStaffPricingAccess(principal);
    if (!input.fileName?.trim()) {
      throw new BadRequestException('价格表名称不能为空');
    }
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      throw new BadRequestException('价格表没有可导入的报价行');
    }
    input.rows.forEach((row, index) => {
      if (!row.agentName?.trim() || !row.channelName?.trim() || !row.destinationCountry?.trim() || row.maxWeightKg <= row.minWeightKg || row.costPerKg <= 0) {
        throw new BadRequestException(`第 ${index + 1} 行报价数据不完整`);
      }
    });

    const created = await (this.prisma as any).priceBook.create({
      data: {
        fileName: input.fileName.trim(),
        rows: {
          create: input.rows.map((row) => ({
            agentName: row.agentName.trim(),
            carrierName: row.carrierName?.trim() || null,
            sourceSheetName: row.sourceSheetName?.trim() || null,
            channelName: row.channelName.trim(),
            businessRouteName: row.businessRouteName?.trim() || null,
            realChannelName: row.realChannelName?.trim() || row.channelName.trim(),
            warehouseCode: row.warehouseCode?.trim() || null,
            destinationCountry: row.destinationCountry.trim(),
            minWeightKg: row.minWeightKg,
            maxWeightKg: row.maxWeightKg,
            costPerKg: row.costPerKg,
            currency: row.currency?.trim().toUpperCase() || 'CNY',
            transitDays: row.transitDays ?? null,
            transitLabel: row.transitLabel?.trim() || null,
            quoteSourceType: row.quoteSourceType ?? 'local',
            surchargeFee: row.surchargeFee ?? null,
            surchargeDetails: row.surchargeDetails ?? []
          }))
        }
      },
      include: { rows: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.import',
        target: created.id,
        after: { fileName: created.fileName, rowCount: created.rows.length }
      }
    });
    return { book: mapPriceBook(created), rows: created.rows.map(mapPriceBookRow) };
  }

  async updatePriceBookRemark(principal: Principal, id: string, input: PriceBookRemarkUpdateInput): Promise<PriceBookSummary> {
    this.ensureStaffPricingAccess(principal);
    const current = await (this.prisma as any).priceBook.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      throw new NotFoundException('价格表不存在');
    }
    const updated = await (this.prisma as any).priceBook.update({
      where: { id },
      data: { remark: input.remark?.trim() || null },
      include: { rows: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.remark.update',
        target: id,
        before: { remark: current.remark },
        after: { remark: updated.remark }
      }
    });
    return mapPriceBook(updated);
  }

  async deletePriceBook(principal: Principal, id: string): Promise<PriceBookSummary> {
    this.ensureStaffPricingAccess(principal);
    const current = await (this.prisma as any).priceBook.findFirst({ where: { id, deletedAt: null }, include: { rows: true } });
    if (!current) {
      throw new NotFoundException('价格表不存在');
    }
    const deleted = await (this.prisma as any).priceBook.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: { rows: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.delete',
        target: id,
        before: { fileName: current.fileName, rowCount: current.rows.length },
        after: { deletedAt: deleted.deletedAt }
      }
    });
    return mapPriceBook(deleted);
  }

  async getPricingRules(principal: Principal): Promise<PricingRuleSummary[]> {
    this.ensureStaffPricingAccess(principal);
    const rows = await (this.prisma as any).pricingRule.findMany({ include: { channel: true }, orderBy: [{ channelId: 'asc' }, { minWeightKg: 'asc' }] });
    return rows.map(mapPricingRule);
  }

  async createPricingRule(principal: Principal, input: PricingRuleCreateInput): Promise<PricingRuleSummary> {
    this.ensureStaffPricingAccess(principal);
    if (!input.channelId?.trim() || !input.destinationCountry?.trim() || input.minWeightKg < 0 || input.maxWeightKg <= input.minWeightKg || input.ratePerKg <= 0) {
      throw new BadRequestException('报价规则参数不完整');
    }
    const channel = await this.prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel || !channel.enabled) {
      throw new BadRequestException('渠道不存在或已停用');
    }
    const row = await (this.prisma as any).pricingRule.create({
      data: {
        id: `pr-${slug(channel.name)}-${Date.now()}`,
        channelId: channel.id,
        destinationCountry: input.destinationCountry.trim(),
        minWeightKg: input.minWeightKg,
        maxWeightKg: input.maxWeightKg,
        ratePerKg: input.ratePerKg,
        currency: input.currency.trim().toUpperCase() || 'CNY',
        enabled: true
      },
      include: { channel: true }
    });
    return mapPricingRule(row);
  }

  async updatePricingRuleEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<PricingRuleSummary> {
    this.ensureStaffPricingAccess(principal);
    const row = await (this.prisma as any).pricingRule.update({
      where: { id },
      data: { enabled: input.enabled === true },
      include: { channel: true }
    });
    return mapPricingRule(row);
  }

  async quotePricingRule(principal: Principal, input: PricingRuleQuoteRequest): Promise<PricingRuleQuoteResponse> {
    this.ensureStaffPricingAccess(principal);
    return this.quoteFromRules(input);
  }

  async getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    const rows = await (this.prisma as any).warehousePackage.findMany({ orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }] });
    return rows.map(mapWarehousePackage);
  }

  async getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]> {
    const packages = await this.getWarehousePackages(principal);
    return summarizeWarehousePackageGroups(packages);
  }

  async syncMockWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehousePackage.count();
    if (existing === 0) {
      await (this.prisma as any).warehousePackage.createMany({
        data: warehouseMockPackages.map((pkg) => ({
          ...pkg,
          receivingChannel: '仓库接口返回',
          destinationCountry: '美国',
          packageCount: 1,
          chargeableWeightKg: Math.max(pkg.weightKg, pkg.volumetricWeightKg),
          divisor: 6000,
          roundingRule: 'NONE',
          status: 'RECEIVED',
          exceptions: pkg.expectedTotalPackageCount ? ['部分到仓'] : []
        }))
      });
    }
    return this.getWarehousePackages(principal);
  }

  async createWarehouseConsolidation(principal: Principal, input: WarehouseConsolidationCreateInput): Promise<WarehouseConsolidationSummary> {
    this.ensureWarehouseAccess(principal);
    if (!Array.isArray(input.packageIds) || input.packageIds.length === 0) {
      throw new BadRequestException('请先选择要合并的包裹');
    }
    const packages = await (this.prisma as any).warehousePackage.findMany({ where: { id: { in: input.packageIds }, status: { not: 'CONSOLIDATED' } } });
    if (packages.length !== input.packageIds.length) {
      throw new BadRequestException('部分包裹不存在或已合并');
    }
    const summaries: WarehousePackageSummary[] = packages.map(mapWarehousePackage);
    const consolidationNo = await this.nextWarehouseConsolidationNo(summaries, input.mode);
    const created = await (this.prisma as any).warehouseConsolidation.create({
      data: {
        consolidationNo,
        mode: input.mode,
        totalPackages: summaries.reduce((total, pkg) => total + pkg.packageCount, 0),
        totalActualWeightKg: summaries.reduce((total, pkg) => total + pkg.weightKg * pkg.packageCount, 0),
        totalVolumetricWeightKg: summaries.reduce((total, pkg) => total + pkg.volumetricWeightKg, 0),
        totalChargeableWeightKg: summaries.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0),
        items: { create: summaries.map((pkg) => ({ packageId: pkg.id })) }
      },
      include: { items: true }
    });
    await (this.prisma as any).warehousePackage.updateMany({ where: { id: { in: input.packageIds } }, data: { status: 'CONSOLIDATED' } });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'warehouse.consolidation.create', target: created.id, after: { consolidationNo, mode: input.mode, packageIds: input.packageIds } }
    });
    if (input.mode === 'MERGE_AND_SHIP') {
      return this.createShipmentFromWarehouseConsolidation(principal, created.id);
    }
    return mapWarehouseConsolidation(created, input.packageIds);
  }

  async createShipmentFromWarehouseConsolidation(principal: Principal, id: string): Promise<WarehouseConsolidationSummary> {
    this.ensureWarehouseAccess(principal);
    const consolidation = await (this.prisma as any).warehouseConsolidation.findUnique({
      where: { id },
      include: { items: { include: { package: true } } }
    });
    if (!consolidation) {
      throw new NotFoundException('合并批次不存在');
    }
    if (consolidation.shipmentId) {
      return mapWarehouseConsolidation(consolidation, consolidation.items.map((item: any) => item.packageId));
    }
    const packages = consolidation.items.map((item: any) => mapWarehousePackage(item.package));
    const first = packages[0];
    const customer = await this.prisma.customer.findFirst({ where: { code: first.customerCode } }) ?? await this.prisma.customer.findFirst({ orderBy: { code: 'asc' } });
    if (!customer) {
      throw new BadRequestException('缺少客户资料，无法创建出货订单');
    }
    const systemOrderNo = consolidation.consolidationNo;
    const shipment = await this.createShipment(principal, {
      customerId: customer.id,
      customerOrderNo: first.customerOrderNo,
      systemOrderNo,
      businessType: 'DEDICATED_LINE',
      packageType: 'WPX',
      destinationCountry: first.destinationCountry || '美国',
      packageCount: Number(consolidation.totalPackages),
      receivableWeightKg: Number(consolidation.totalChargeableWeightKg),
      agentWeightKg: Number(consolidation.totalChargeableWeightKg),
      initialStatus: 'DRAFT',
      latestTracking: '合并包裹创建出货订单，待审核'
    });
    const updated = await (this.prisma as any).warehouseConsolidation.update({
      where: { id },
      data: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo },
      include: { items: true }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'warehouse.consolidation.create_shipment', target: id, after: { shipmentId: shipment.id, systemOrderNo } }
    });
    return mapWarehouseConsolidation(updated, updated.items.map((item: any) => item.packageId));
  }

  async getWarehouseConsolidationItems(principal: Principal, id: string): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    const items = await (this.prisma as any).warehouseConsolidationItem.findMany({
      where: { consolidationId: id },
      include: { package: true },
      orderBy: { id: 'asc' }
    });
    return items.map((item: any) => mapWarehousePackage(item.package));
  }

  async getReceivables(principal: Principal): Promise<ReceivableFeeSummary[]> {
    const rows = await this.prisma.receivableFee.findMany({
      where: principal.role === 'CUSTOMER' ? { shipment: { customerId: principal.customerId } } : undefined,
      include: { shipment: { include: { customer: true } } },
      orderBy: { id: 'asc' }
    });

    return rows.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: row.shipment.systemOrderNo,
      customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
      name: row.name,
      amount: Number(row.amount),
      settled: row.settled
    }));
  }

  async generateShipmentFees(
    principal: Principal,
    shipmentId: string,
    input: { baseRatePerKg?: number; payableRatePerKg?: number; fuelRate?: number; surcharges?: Array<{ name: string; amount: number }>; pricingRuleId?: string; channelId?: string; destinationCountry?: string }
  ) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.prisma.receivableFee.deleteMany({ where: { shipmentId: shipment.id, settled: false } });
    await this.prisma.payableFee.deleteMany({ where: { shipmentId: shipment.id, settled: false } });

    const receivableQuote = input.baseRatePerKg && input.fuelRate !== undefined
      ? calculateQuote({
        chargeableWeightKg: Number(shipment.receivableWeightKg),
        baseRatePerKg: input.baseRatePerKg,
        fuelRate: input.fuelRate,
        surcharges: input.surcharges ?? []
      })
      : await this.quoteFromRules({
        channelId: input.channelId ?? shipment.channelId ?? '',
        destinationCountry: input.destinationCountry ?? shipment.destinationCountry,
        chargeableWeightKg: Number(shipment.receivableWeightKg)
      });
    const payableQuote = calculateQuote({
      chargeableWeightKg: Number(shipment.agentWeightKg),
      baseRatePerKg: input.payableRatePerKg ?? 0,
      fuelRate: input.fuelRate ?? 0,
      surcharges: []
    });

    await this.prisma.receivableFee.createMany({
      data: createFeeLinesFromQuote(shipment.id, receivableQuote).map((line) => ({
        shipmentId: line.shipmentId,
        name: line.name,
        amount: line.amount
      }))
    });
    await this.prisma.payableFee.createMany({
      data: createFeeLinesFromQuote(shipment.id, payableQuote).map((line) => ({
        shipmentId: line.shipmentId,
        name: line.name,
        amount: line.amount
      }))
    });

    const [receivables, payables] = await Promise.all([
      this.prisma.receivableFee.findMany({
        where: { shipmentId: shipment.id },
        include: { shipment: { include: { customer: true } } },
        orderBy: { id: 'asc' }
      }),
      this.prisma.payableFee.findMany({ where: { shipmentId: shipment.id }, orderBy: { id: 'asc' } })
    ]);

    return {
      receivables: receivables.map((row) => ({
        id: row.id,
        shipmentId: row.shipmentId,
        systemOrderNo: row.shipment.systemOrderNo,
        customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
        name: row.name,
        amount: Number(row.amount),
        settled: row.settled
      })),
      payables: payables.map((row) => ({
        id: row.id,
        shipmentId: row.shipmentId,
        name: row.name,
        amount: Number(row.amount),
        settled: row.settled
      })),
      receivableTotal: receivableQuote.total,
      payableTotal: payableQuote.total
    };
  }

  async addReceivableAdjustment(principal: Principal, shipmentId: string, input: ReceivableAdjustmentInput): Promise<ReceivableFeeSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const fee = await this.prisma.receivableFee.create({
      data: {
        shipmentId: shipment.id,
        name: input.name,
        amount: input.amount
      },
      include: { shipment: { include: { customer: true } } }
    });

    return {
      id: fee.id,
      shipmentId: fee.shipmentId,
      systemOrderNo: fee.shipment.systemOrderNo,
      customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
      name: fee.name,
      amount: Number(fee.amount),
      settled: fee.settled
    };
  }

  async getCustomerStatements(principal: Principal): Promise<CustomerStatementSummary[]> {
    const rows = await this.prisma.customerStatement.findMany({
      where: principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: rows.map((row) => row.customerId) } }
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    return rows.map((row) => {
      const customer = customerMap.get(row.customerId);
      return {
        id: row.id,
        customerId: row.customerId,
        customerName: customer ? `${customer.code}-${customer.name}` : row.customerId,
        periodStart: row.createdAt.toISOString().slice(0, 10),
        periodEnd: row.createdAt.toISOString().slice(0, 10),
        total: Number(row.total),
        feeCount: 0,
        status: row.status as CustomerStatementSummary['status'],
        createdAt: row.createdAt.toISOString()
      };
    });
  }

  async createCustomerStatement(_principal: Principal, input: CustomerStatementCreateInput): Promise<CustomerStatementSummary> {
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const fees = await this.prisma.receivableFee.findMany({
      where: {
        settled: false,
        shipment: {
          customerId: input.customerId,
          createdAt: {
            gte: new Date(`${input.periodStart}T00:00:00.000Z`),
            lte: new Date(`${input.periodEnd}T23:59:59.999Z`)
          }
        }
      },
      include: { shipment: { include: { customer: true } } }
    });
    const draft = summarizeStatement({
      customerId: customer.id,
      customerName: `${customer.code}-${customer.name}`,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      fees: fees.map((fee) => ({
        id: fee.id,
        shipmentId: fee.shipmentId,
        systemOrderNo: fee.shipment.systemOrderNo,
        customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
        name: fee.name,
        amount: Number(fee.amount),
        settled: fee.settled
      }))
    });
    const created = await this.prisma.customerStatement.create({
      data: {
        customerId: customer.id,
        total: draft.total,
        status: draft.status
      }
    });

    return { ...draft, id: created.id, createdAt: created.createdAt.toISOString() };
  }

  async getCustomerAccounts(principal: Principal): Promise<CustomerAccountSummary[]> {
    const rows = await this.prisma.customerAccount.findMany({
      where: principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : undefined,
      include: { customer: true },
      orderBy: { customerId: 'asc' }
    });

    return rows.map((row) => ({
      customerId: row.customerId,
      customerName: `${row.customer.code}-${row.customer.name}`,
      balance: Number(row.balance),
      currency: row.currency
    }));
  }

  async getAccountLedger(principal: Principal): Promise<AccountLedgerSummary[]> {
    const rows = await this.prisma.accountLedger.findMany({
      where: {
        partyType: 'CUSTOMER',
        ...(principal.role === 'CUSTOMER' ? { partyId: principal.customerId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: rows.map((row) => row.partyId) } }
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    return rows.map((row) => {
      const customer = customerMap.get(row.partyId);
      return {
        id: row.id,
        customerId: row.partyId,
        customerName: customer ? `${customer.code}-${customer.name}` : row.partyId,
        amount: Number(row.amount),
        balance: Number(row.balance),
        note: row.note ?? undefined,
        createdAt: row.createdAt.toISOString()
      };
    });
  }

  async createPayment(_principal: Principal, input: PaymentCreateInput): Promise<PaymentCreateResponse> {
    if (input.amount <= 0) {
      throw new BadRequestException('收款金额必须大于 0');
    }
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const account = await this.prisma.customerAccount.upsert({
      where: { id: `ca-${customer.code}-cny` },
      update: {},
      create: { id: `ca-${customer.code}-cny`, customerId: customer.id, balance: 0, currency: 'CNY' },
      include: { customer: true }
    });
    const feeIds = input.feeIds ?? [];
    const fees = await this.prisma.receivableFee.findMany({
      where: { id: { in: feeIds } },
      include: { shipment: { include: { customer: true } } }
    });
    if (fees.length !== feeIds.length) {
      throw new BadRequestException('应收费用不存在');
    }
    if (fees.some((fee) => fee.shipment.customerId !== input.customerId)) {
      throw new BadRequestException('应收费用不属于该客户');
    }
    if (fees.some((fee) => fee.settled)) {
      throw new BadRequestException('应收费用已核销');
    }
    const settledAmount = roundMoney(fees.reduce((sum, fee) => sum + Number(fee.amount), 0));
    if (input.amount < settledAmount) {
      throw new BadRequestException('收款金额不足以核销选中费用');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          partyType: 'CUSTOMER',
          partyId: input.customerId,
          amount: input.amount
        }
      });
      const afterReceiptBalance = roundMoney(Number(account.balance) + input.amount);
      await tx.customerAccount.update({
        where: { id: account.id },
        data: { balance: afterReceiptBalance }
      });
      await tx.accountLedger.create({
        data: {
          partyType: 'CUSTOMER',
          partyId: input.customerId,
          amount: input.amount,
          balance: afterReceiptBalance,
          note: input.note?.trim() || '收款登记'
        }
      });

      let finalBalance = afterReceiptBalance;
      if (settledAmount > 0) {
        finalBalance = roundMoney(afterReceiptBalance - settledAmount);
        await tx.receivableFee.updateMany({ where: { id: { in: feeIds } }, data: { settled: true } });
        await tx.customerAccount.update({
          where: { id: account.id },
          data: { balance: finalBalance }
        });
        await tx.accountLedger.create({
          data: {
            partyType: 'CUSTOMER',
            partyId: input.customerId,
            amount: -settledAmount,
            balance: finalBalance,
            note: '核销应收费用'
          }
        });
        await tx.settlement.createMany({
          data: fees.map((fee) => ({
            paymentId: payment.id,
            feeId: fee.id,
            amount: Number(fee.amount)
          }))
        });
      }

      let statement: CustomerStatementSummary | undefined;
      if (input.statementId) {
        const updated = await tx.customerStatement.updateMany({
          where: { id: input.statementId, customerId: input.customerId },
          data: { status: 'SETTLED' }
        });
        if (updated.count > 0) {
          const row = await tx.customerStatement.findUnique({ where: { id: input.statementId } });
          if (row) {
            statement = {
              id: row.id,
              customerId: row.customerId,
              customerName: `${customer.code}-${customer.name}`,
              periodStart: row.createdAt.toISOString().slice(0, 10),
              periodEnd: row.createdAt.toISOString().slice(0, 10),
              total: Number(row.total),
              feeCount: 0,
              status: row.status as CustomerStatementSummary['status'],
              createdAt: row.createdAt.toISOString()
            };
          }
        }
      }

      return {
        payment,
        accountBalance: finalBalance,
        statement
      };
    });

    const paymentSummary = summarizePaymentSettlement({
      id: result.payment.id,
      customerId: customer.id,
      customerName: `${customer.code}-${customer.name}`,
      amount: Number(result.payment.amount),
      settledAmount,
      createdAt: result.payment.createdAt.toISOString()
    });

    return {
      payment: paymentSummary,
      account: {
        customerId: customer.id,
        customerName: `${customer.code}-${customer.name}`,
        balance: result.accountBalance,
        currency: account.currency
      },
      settledFees: fees.map((fee) => ({
        id: fee.id,
        shipmentId: fee.shipmentId,
        systemOrderNo: fee.shipment.systemOrderNo,
        customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
        name: fee.name,
        amount: Number(fee.amount),
        settled: true
      })),
      statement: result.statement
    };
  }

  async createShipment(principal: Principal, input: ShipmentCreateInput): Promise<Shipment> {
    const customerId = principal.role === 'CUSTOMER' ? principal.customerId : input.customerId;
    if (!customerId) {
      throw new BadRequestException('缺少客户');
    }

    if (principal.role === 'CUSTOMER' && input.customerId && input.customerId !== principal.customerId) {
      throw new ForbiddenException('客户不能为其他客户创建预报');
    }

    const now = new Date();
    const initialStatus: ShipmentStatus = principal.role === 'CUSTOMER' ? 'DECLARED' : input.initialStatus ?? 'DECLARED';
    const latestTracking = input.latestTracking?.trim() || (initialStatus === 'DRAFT' ? '新建出货订单，待审核' : '客户已预报');
    const systemOrderNo =
      principal.role === 'CUSTOMER'
        ? await this.nextSystemOrderNo(input.businessType, now)
        : input.systemOrderNo?.trim() || (await this.nextSystemOrderNo(input.businessType, now));
    const created = await this.prisma.shipment.create({
      data: {
        customerId,
        channelId: input.channelId,
        customerOrderNo: input.customerOrderNo.trim(),
        systemOrderNo,
        transferNo: input.transferNo?.trim() || undefined,
        businessType: input.businessType,
        status: initialStatus,
        destinationCountry: input.destinationCountry.trim(),
        packageType: input.packageType,
        packageCount: input.packageCount,
        receivableWeightKg: input.receivableWeightKg,
        agentWeightKg: input.agentWeightKg ?? input.receivableWeightKg,
        latestTracking,
        trackingStaleDays: 0,
        isRemoteArea: false,
        createdAt: now,
        packages: {
          create: {
            lengthCm: 0,
            widthCm: 0,
            heightCm: 0,
            actualKg: input.receivableWeightKg,
            volumeKg: input.receivableWeightKg
          }
        },
        events: { create: { toStatus: initialStatus, note: initialStatus === 'DRAFT' ? '创建出货订单' : '创建预报' } },
        trackingEvents: { create: { status: latestTracking, happenedAt: now } }
      },
      include: shipmentIncludes
    });

    return mapShipment(created);
  }

  async importShipments(principal: Principal, request: ShipmentImportRequest): Promise<ShipmentImportResponse> {
    const validation = validateShipmentImportRows(request.rows);
    const created: Shipment[] = [];
    const customerId = principal.role === 'CUSTOMER' ? principal.customerId : request.customerId;

    if (!customerId) {
      throw new BadRequestException('缺少客户');
    }

    for (const row of validation.validRows) {
      const channel = await this.prisma.channel.findFirst({
        where: { name: { contains: row.channelName } }
      });
      created.push(
        await this.createShipment(principal, {
          customerId,
          customerOrderNo: row.customerOrderNo,
          businessType: 'EXPRESS',
          packageType: 'WPX',
          destinationCountry: row.destinationCountry,
          packageCount: 1,
          receivableWeightKg: row.weightKg,
          agentWeightKg: row.weightKg,
          channelId: channel?.id
        })
      );
    }

    return { created, errors: validation.errors };
  }

  async receiveShipment(principal: Principal, shipmentId: string): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (shipment.status === 'DECLARED') {
      if (!canTransitionShipment('DECLARED', 'WAITING_RECEIVE') || !canTransitionShipment('WAITING_RECEIVE', 'WAITING_SORT')) {
        throw new BadRequestException('当前状态不允许确认收货');
      }
      await this.createEvent(shipment.id, 'DECLARED', 'WAITING_RECEIVE', '确认到仓');
      return this.updateShipmentStatus(shipment.id, 'WAITING_RECEIVE', 'WAITING_SORT', '确认收货');
    }

    if (!canTransitionShipment(shipment.status as ShipmentStatus, 'WAITING_SORT')) {
      throw new BadRequestException('当前状态不允许确认收货');
    }

    return this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'WAITING_SORT', '确认收货');
  }

  async routeShipment(principal: Principal, shipmentId: string, body: { channelId?: string; agentId?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (!body.channelId) {
      throw new BadRequestException('缺少渠道');
    }
    if (!canTransitionShipment(shipment.status as ShipmentStatus, 'WAITING_DISPATCH')) {
      throw new BadRequestException('当前状态不允许排货');
    }

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { channelId: body.channelId, agentId: body.agentId }
    });

    return this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'WAITING_DISPATCH', '排货');
  }

  async dispatchShipment(principal: Principal, shipmentId: string, body: { transferNo?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const transferNo = body.transferNo ?? shipment.transferNo;
    if (!transferNo) {
      throw new BadRequestException('发货前必须填写转单号');
    }
    const voidedLabel = await this.prisma.shipmentLabel.findFirst({
      where: { shipmentId: shipment.id, transferNo, status: 'VOIDED' }
    });
    if (voidedLabel) {
      throw new BadRequestException('已作废面单不能发货');
    }
    if (!canTransitionShipment(shipment.status as ShipmentStatus, 'WAITING_ONLINE')) {
      throw new BadRequestException('当前状态不允许发货');
    }

    await this.prisma.shipment.update({ where: { id: shipment.id }, data: { transferNo } });
    const updated = await this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'WAITING_ONLINE', '确认发货');
    await this.ensureCarrierTask(updated.id, updated.carrier, updated.transferNo ?? transferNo);
    return updated;
  }

  async updateShipmentOperational(principal: Principal, shipmentId: string, input: ShipmentOperationalUpdateInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const latestTracking = input.latestTracking?.trim();
    const transferNo = input.transferNo?.trim() || null;
    const nextStatus = input.status ?? (shipment.status as ShipmentStatus);

    if (!(nextStatus in shipmentStatusLabels)) {
      throw new BadRequestException('运单状态无效');
    }
    if (!latestTracking && input.latestTracking !== undefined) {
      throw new BadRequestException('最新轨迹不能为空');
    }

    const notes: string[] = [];
    if (shipment.transferNo !== transferNo) {
      notes.push(`更新转单号：${shipment.transferNo ?? '空'} -> ${transferNo ?? '空'}`);
    }
    if (latestTracking !== undefined && shipment.latestTracking !== latestTracking) {
      notes.push(`更新最新轨迹：${latestTracking}`);
    }
    if (shipment.status !== nextStatus) {
      notes.push(`更新状态：${shipmentStatusLabels[shipment.status as ShipmentStatus]} -> ${shipmentStatusLabels[nextStatus]}`);
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        latestTracking: latestTracking ?? shipment.latestTracking,
        transferNo,
        status: nextStatus,
        trackingStaleDays: latestTracking !== undefined ? 0 : shipment.trackingStaleDays,
        ...(latestTracking !== undefined
          ? {
              trackingEvents: {
                create: {
                  status: latestTracking,
                  happenedAt: new Date(),
                  visibleToCustomer: true
                }
              }
            }
          : {})
      },
      include: shipmentIncludes
    });

    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, nextStatus, notes.length > 0 ? `人工修改运单：${notes.join('；')}` : '人工修改运单');
    return mapShipment(updated);
  }

  async registerShipmentPayment(principal: Principal, shipmentId: string, input: ShipmentPaymentUpdateInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const hasUsd = input.paymentAmountUsd !== undefined && input.paymentAmountUsd !== null;
    const hasCny = input.paymentAmountCny !== undefined && input.paymentAmountCny !== null;
    if (!hasUsd && !hasCny) {
      throw new BadRequestException('USD 或 CNY 至少填写一个');
    }
    if ((hasUsd && Number(input.paymentAmountUsd) < 0) || (hasCny && Number(input.paymentAmountCny) < 0)) {
      throw new BadRequestException('收款金额不能小于 0');
    }
    if (!['对公', '对私', '阿里店铺', '外汇'].includes(input.paymentMethod)) {
      throw new BadRequestException('收款方式无效');
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        paymentAmountUsd: hasUsd ? Number(input.paymentAmountUsd) : null,
        paymentAmountCny: hasCny ? Number(input.paymentAmountCny) : null,
        paymentMethod: input.paymentMethod
      },
      include: shipmentIncludes
    });

    await this.createEvent(
      shipment.id,
      shipment.status as ShipmentStatus,
      shipment.status as ShipmentStatus,
      `登记收款：USD ${hasUsd ? Number(input.paymentAmountUsd).toFixed(2) : '未知'} / CNY ${hasCny ? Number(input.paymentAmountCny).toFixed(2) : '未知'} / ${input.paymentMethod}`
    );
    return mapShipment(updated);
  }

  async importTrackingEvents(principal: Principal, request: BulkTrackingApplyRequest): Promise<BulkTrackingApplyResponse> {
    if (!Array.isArray(request.updates) || request.updates.length === 0) {
      throw new BadRequestException('没有可导入的轨迹记录');
    }

    const updated: Shipment[] = [];
    for (const item of request.updates) {
      const shipment = await this.getVisibleShipment(principal, item.shipmentId);
      const latestTracking = item.latestTracking?.trim();
      if (!latestTracking) {
        throw new BadRequestException('最新轨迹不能为空');
      }
      const happenedAt = this.parseTrackingDate(item.trackingDate);
      const row = await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          latestTracking,
          trackingStaleDays: 0,
          trackingEvents: {
            create: {
              status: latestTracking,
              happenedAt,
              visibleToCustomer: true
            }
          }
        },
        include: shipmentIncludes
      });
      await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `批量添加轨迹：${latestTracking}`);
      updated.push(mapShipment(row));
    }

    return { updated };
  }

  async deleteShipment(principal: Principal, shipmentId: string): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (shipment.deletedAt) {
      throw new NotFoundException('运单不存在');
    }
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, '人工删除运单');
    const deleted = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { deletedAt: new Date() },
      include: shipmentIncludes
    });
    return mapShipment(deleted);
  }

  async getCarrierTasks(_principal: Principal): Promise<CarrierTaskSummary[]> {
    const tasks = await this.prisma.carrierTask.findMany({
      include: { shipment: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return tasks.map(mapCarrierTask);
  }

  async runCarrierTask(_principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    return this.executeCarrierTask(taskId, body.fail === true);
  }

  async retryCarrierTask(_principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    const task = await this.prisma.carrierTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    if (task.status !== 'FAILED') {
      throw new BadRequestException('只有失败任务可以重试');
    }
    await this.prisma.carrierTask.update({
      where: { id: task.id },
      data: { status: 'PENDING', lastError: null }
    });
    return this.executeCarrierTask(taskId, body.fail === true);
  }

  async createShipmentLabel(principal: Principal, shipmentId: string): Promise<LabelCreateResponse> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (shipment.status !== 'WAITING_DISPATCH') {
      throw new BadRequestException('当前状态不允许申请面单');
    }

    const existing = await this.prisma.shipmentLabel.findFirst({
      where: { shipmentId: shipment.id, status: 'CREATED' },
      orderBy: { createdAt: 'desc' }
    });
    if (existing) {
      return { label: mapShipmentLabel(existing), shipment: mapShipment(shipment) };
    }

    const now = new Date();
    const sequence = await this.nextLabelSequence(now);
    const carrier = toCarrierAdapterCode(shipment.channel?.carrier.name ?? '');
    const labelNo = `LBL${formatDate(now)}${String(sequence).padStart(5, '0')}`;
    const transferNo = createMockTransferNo(carrier, now, sequence);
    const label = await this.prisma.shipmentLabel.create({
      data: {
        shipmentId: shipment.id,
        carrier,
        channelName: shipment.channel?.name ?? '',
        labelNo,
        transferNo,
        labelUrl: `/mock-labels/${labelNo}.pdf`,
        status: 'CREATED',
        createdAt: now
      }
    });

    await this.prisma.shipmentEvent.create({
      data: { shipmentId: shipment.id, fromStatus: shipment.status, toStatus: shipment.status, note: '申请模拟面单' }
    });
    await this.prisma.trackingEvent.create({
      data: { shipmentId: shipment.id, status: '已生成面单', happenedAt: now, visibleToCustomer: true }
    });
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { transferNo, latestTracking: '已生成面单', trackingStaleDays: 0 },
      include: shipmentIncludes
    });

    return { label: mapShipmentLabel(label), shipment: mapShipment(updated) };
  }

  async getShipmentLabels(principal: Principal, shipmentId: string): Promise<ShipmentLabelSummary[]> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const labels = await this.prisma.shipmentLabel.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { createdAt: 'desc' }
    });
    return labels.map(mapShipmentLabel);
  }

  async voidShipmentLabel(principal: Principal, shipmentId: string, labelId: string): Promise<ShipmentLabelSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const label = await this.prisma.shipmentLabel.findFirst({ where: { id: labelId, shipmentId: shipment.id } });
    if (!label) {
      throw new NotFoundException('面单不存在');
    }
    if (shipment.status !== 'WAITING_DISPATCH') {
      throw new BadRequestException('已发货运单不能作废面单');
    }
    if (label.status !== 'CREATED') {
      throw new BadRequestException('面单已作废');
    }

    const now = new Date();
    const updatedLabel = await this.prisma.shipmentLabel.update({
      where: { id: label.id },
      data: { status: 'VOIDED', voidedAt: now }
    });
    if (shipment.transferNo === label.transferNo) {
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: { transferNo: null, latestTracking: '面单已作废', trackingStaleDays: 0 }
      });
      await this.prisma.trackingEvent.create({
        data: { shipmentId: shipment.id, status: '面单已作废', happenedAt: now, visibleToCustomer: false }
      });
    }

    return mapShipmentLabel(updatedLabel);
  }

  async addTrackingEvent(principal: Principal, shipmentId: string, input: TrackingEventInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status: input.status,
        happenedAt: new Date(input.happenedAt),
        visibleToCustomer: input.visibleToCustomer ?? true
      }
    });

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { latestTracking: input.status, trackingStaleDays: 0 },
      include: shipmentIncludes
    });

    return mapShipment(updated);
  }

  async getProblemTickets(principal: Principal): Promise<ProblemTicketSummary[]> {
    const rows = await this.prisma.problemTicket.findMany({
      where:
        principal.role === 'CUSTOMER'
          ? { customerVisible: true, shipment: { customerId: principal.customerId } }
          : undefined,
      include: {
        shipment: { include: { customer: true } },
        replies: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return rows.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: row.shipment.systemOrderNo,
      customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
      reason: row.reason,
      status: row.status,
      customerVisible: row.customerVisible,
      createdAt: row.createdAt.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      replies: row.replies.map((reply) => ({
        id: reply.id,
        author: reply.author,
        message: reply.message,
        createdAt: reply.createdAt.toISOString()
      }))
    }));
  }

  async createProblemTicket(principal: Principal, shipmentId: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const ticket = await this.prisma.problemTicket.create({
      data: {
        shipmentId: shipment.id,
        reason: input.reason,
        status: 'OPEN',
        customerVisible: input.customerVisible ?? true
      }
    });

    if (canTransitionShipment(shipment.status as ShipmentStatus, 'PROBLEM')) {
      await this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'PROBLEM', '创建问题件');
    }

    return (await this.getProblemTickets({ ...principal, role: 'ADMIN' })).find((item) => item.id === ticket.id)!;
  }

  async replyProblemTicket(principal: Principal, ticketId: string, message: string): Promise<ProblemTicketSummary> {
    const ticket = await this.getVisibleProblemTicket(principal, ticketId);
    await this.prisma.problemReply.create({
      data: {
        ticketId: ticket.id,
        author: principal.role === 'CUSTOMER' ? '客户' : principal.username,
        message
      }
    });

    return (await this.getProblemTickets(principal)).find((item) => item.id === ticketId)!;
  }

  async closeProblemTicket(principal: Principal, ticketId: string): Promise<ProblemTicketSummary> {
    const ticket = await this.getVisibleProblemTicket(principal, ticketId);
    await this.prisma.problemTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt: new Date() }
    });

    return (await this.getProblemTickets({ ...principal, role: 'ADMIN' })).find((item) => item.id === ticketId)!;
  }

  private async quoteFromRules(input: PricingRuleQuoteRequest): Promise<PricingRuleQuoteResponse> {
    const [rules, fuelRates, surcharges, exchangeRates, channels] = await Promise.all([
      (this.prisma as any).pricingRule.findMany({ include: { channel: true } }),
      this.prisma.fuelRate.findMany({ orderBy: { activeAt: 'desc' } }),
      this.prisma.surcharge.findMany({ where: { enabled: true } }),
      (this.prisma as any).exchangeRate.findMany({ where: { enabled: true }, orderBy: { activeAt: 'desc' } }),
      this.prisma.channel.findMany()
    ]);
    const channelMap = new Map(channels.map((channel) => [channel.id, channel.name]));
    try {
      return quoteWithPricingRules({
        ...input,
        rules: rules.map(mapPricingRule),
        fuelRates: fuelRates.map((fuelRate) => ({
          id: fuelRate.id,
          channelId: fuelRate.channelId,
          channelName: channelMap.get(fuelRate.channelId) ?? fuelRate.channelId,
          rate: Number(fuelRate.rate),
          activeAt: fuelRate.activeAt.toISOString()
        })),
        surcharges: surcharges.map((surcharge) => ({
          id: surcharge.id,
          name: surcharge.name,
          amount: Number(surcharge.amount),
          enabled: surcharge.enabled
        })),
        exchangeRates: exchangeRates.map((exchangeRate: any) => ({
          id: exchangeRate.id,
          baseCurrency: exchangeRate.baseCurrency,
          quoteCurrency: exchangeRate.quoteCurrency,
          rate: Number(exchangeRate.rate),
          activeAt: exchangeRate.activeAt.toISOString(),
          enabled: exchangeRate.enabled
        }))
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : '报价失败');
    }
  }

  private ensureStaffPricingAccess(principal: Principal) {
    if (principal.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部报价规则');
    }
  }

  private ensureAdmin(principal: Principal, message = '只有管理员可以执行该操作') {
    if (principal.role !== 'ADMIN') {
      throw new ForbiddenException(message);
    }
  }

  private ensureWarehouseAccess(principal: Principal) {
    if (!['ADMIN', 'WAREHOUSE'].includes(principal.role)) {
      throw new ForbiddenException('当前角色不能操作仓库管理');
    }
  }

  private async loadAgentMarkupRules(): Promise<AgentMarkupSummary[]> {
    const rows = await (this.prisma as any).agentMarkupRule.findMany({ orderBy: [{ agentName: 'asc' }, { channelName: 'asc' }, { realChannelName: 'asc' }] });
    return rows.map(mapAgentMarkupRule);
  }

  private async nextWarehouseConsolidationNo(packages: WarehousePackageSummary[], mode: WarehouseConsolidationCreateInput['mode']) {
    const customerOrderNos = Array.from(new Set(packages.map((pkg) => pkg.customerOrderNo.trim()).filter(Boolean)));
    const prefix = customerOrderNos.length === 1 ? customerOrderNos[0] : 'MIX';
    const actionCode = mode === 'MERGE_AND_SHIP' ? 'OUT' : 'MERGE';
    const existing = await (this.prisma as any).warehouseConsolidation.count({
      where: { consolidationNo: { startsWith: `${prefix}-${actionCode}` } }
    });
    return `${prefix}-${actionCode}${String(existing + 1).padStart(3, '0')}`;
  }

  private async nextSystemOrderNo(businessType: BusinessType, date: Date): Promise<string> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const count = await this.prisma.shipment.count({ where: { createdAt: { gte: start, lt: end } } });
    return createSystemOrderNo(businessType, date, count + 1);
  }

  private async nextLabelSequence(date: Date): Promise<number> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const count = await this.prisma.shipmentLabel.count({ where: { createdAt: { gte: start, lt: end } } });
    return count + 1;
  }

  private async ensureCarrierTask(shipmentId: string, carrier: string, transferNo: string) {
    const existing = await this.prisma.carrierTask.findFirst({
      where: { shipmentId, type: 'TRACKING_SYNC' }
    });
    if (existing) {
      return existing;
    }
    return this.prisma.carrierTask.create({
      data: {
        shipmentId,
        type: 'TRACKING_SYNC',
        carrier: toCarrierAdapterCode(carrier),
        transferNo,
        status: 'PENDING',
        attempts: 0
      }
    });
  }

  private async executeCarrierTask(taskId: string, fail: boolean): Promise<CarrierTaskRunResponse> {
    const task = await this.prisma.carrierTask.findUnique({
      where: { id: taskId },
      include: { shipment: { include: shipmentIncludes } }
    });
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    if (task.status === 'SUCCESS') {
      throw new BadRequestException('已成功任务不能重复执行');
    }

    if (fail) {
      const failed = await this.prisma.carrierTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', attempts: { increment: 1 }, lastError: '模拟承运商接口失败' },
        include: { shipment: { include: { customer: true } } }
      });
      return { task: mapCarrierTask(failed), shipment: mapShipment(task.shipment) };
    }

    const now = new Date();
    const trackingStatus = createMockTrackingStatus(toCarrierAdapterCode(task.carrier), task.transferNo);
    const [updatedTask, updatedShipment] = await this.prisma.$transaction([
      this.prisma.carrierTask.update({
        where: { id: task.id },
        data: { status: 'SUCCESS', attempts: { increment: 1 }, lastError: null, completedAt: now },
        include: { shipment: { include: { customer: true } } }
      }),
      this.prisma.shipment.update({
        where: { id: task.shipmentId },
        data: {
          latestTracking: trackingStatus,
          trackingStaleDays: 0,
          trackingEvents: { create: { status: trackingStatus, happenedAt: now, visibleToCustomer: true } }
        },
        include: shipmentIncludes
      })
    ]);

    return { task: mapCarrierTask(updatedTask), shipment: mapShipment(updatedShipment) };
  }

  private async getVisibleShipment(principal: Principal, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
      },
      include: shipmentIncludes
    });

    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }

    return shipment;
  }

  private async getVisibleProblemTicket(principal: Principal, ticketId: string) {
    const ticket = await this.prisma.problemTicket.findFirst({
      where: {
        id: ticketId,
        ...(principal.role === 'CUSTOMER' ? { customerVisible: true, shipment: { customerId: principal.customerId } } : {})
      }
    });
    if (!ticket) {
      throw new NotFoundException('问题件不存在');
    }
    return ticket;
  }

  private async updateShipmentStatus(
    shipmentId: string,
    fromStatus: ShipmentStatus,
    toStatus: ShipmentStatus,
    note: string
  ): Promise<Shipment> {
    await this.createEvent(shipmentId, fromStatus, toStatus, note);
    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: toStatus },
      include: shipmentIncludes
    });
    return mapShipment(updated);
  }

  private async createEvent(shipmentId: string, fromStatus: ShipmentStatus | null, toStatus: ShipmentStatus, note: string) {
    await this.prisma.shipmentEvent.create({
      data: { shipmentId, fromStatus, toStatus, note }
    });
  }

  private parseTrackingDate(value: string | number): Date {
    if (typeof value === 'number') {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
      return Number.isNaN(date.getTime()) ? new Date() : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }
}

const shipmentIncludes = {
  customer: true,
  channel: { include: { carrier: true } },
  agent: true,
  problemTickets: true
} as const;

function mapShipment(row: ShipmentWithRelations): Shipment {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    customerName: `${row.customer.code}-${row.customer.name}`,
    customerOrderNo: row.customerOrderNo,
    systemOrderNo: row.systemOrderNo,
    transferNo: row.transferNo ?? undefined,
    businessType: row.businessType as BusinessType,
    packageType: row.packageType as 'DOC' | 'WPX' | 'PAK',
    destinationCountry: row.destinationCountry,
    carrier: row.channel?.carrier.name ?? '',
    packageCount: row.packageCount,
    receivableWeightKg: Number(row.receivableWeightKg),
    agentWeightKg: Number(row.agentWeightKg),
    latestTracking: row.latestTracking ?? '',
    trackingStaleDays: row.trackingStaleDays,
    isRemoteArea: row.isRemoteArea,
    status: row.status as ShipmentStatus,
    channelName: row.channel?.name ?? '',
    agentName: row.agent?.name ?? '',
    paymentAmountUsd: row.paymentAmountUsd === null ? undefined : Number(row.paymentAmountUsd),
    paymentAmountCny: row.paymentAmountCny === null ? undefined : Number(row.paymentAmountCny),
    paymentMethod: row.paymentMethod === null ? undefined : row.paymentMethod as ShipmentPaymentMethod,
    hasProblemTicket: row.problemTickets.some((ticket) => ticket.status !== 'CLOSED')
  };
}

function mapShipmentLabel(row: {
  id: string;
  shipmentId: string;
  carrier: string;
  channelName: string;
  labelNo: string;
  transferNo: string;
  labelUrl: string;
  status: string;
  createdAt: Date;
  voidedAt: Date | null;
}): ShipmentLabelSummary {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    carrier: toCarrierAdapterCode(row.carrier),
    channelName: row.channelName,
    labelNo: row.labelNo,
    transferNo: row.transferNo,
    labelUrl: row.labelUrl,
    status: row.status as ShipmentLabelSummary['status'],
    createdAt: row.createdAt.toISOString(),
    voidedAt: row.voidedAt?.toISOString()
  };
}

function mapPricingRule(row: any): PricingRuleSummary {
  return {
    id: row.id,
    channelId: row.channelId,
    channelName: row.channel?.name ?? row.channelName ?? row.channelId,
    destinationCountry: row.destinationCountry,
    minWeightKg: Number(row.minWeightKg),
    maxWeightKg: Number(row.maxWeightKg),
    ratePerKg: Number(row.ratePerKg),
    currency: row.currency,
    enabled: row.enabled
  };
}

function mapPriceBook(row: any): PriceBookSummary {
  return {
    id: row.id,
    fileName: row.fileName,
    rowCount: Array.isArray(row.rows) ? row.rows.length : Number(row.rowCount ?? 0),
    importedAt: row.importedAt.toISOString(),
    remark: row.remark ?? undefined
  };
}

function mapPriceBookRow(row: any): PriceBookRowSummary {
  return {
    id: row.id,
    priceBookId: row.priceBookId,
    agentName: row.agentName,
    carrierName: row.carrierName ?? undefined,
    sourceSheetName: row.sourceSheetName ?? undefined,
    channelName: row.channelName,
    businessRouteName: row.businessRouteName ?? undefined,
    realChannelName: row.realChannelName ?? undefined,
    warehouseCode: row.warehouseCode ?? undefined,
    destinationCountry: row.destinationCountry,
    minWeightKg: Number(row.minWeightKg),
    maxWeightKg: Number(row.maxWeightKg),
    costPerKg: Number(row.costPerKg),
    currency: row.currency,
    transitDays: row.transitDays ?? undefined,
    transitLabel: row.transitLabel ?? undefined,
    quoteSourceType: row.quoteSourceType ?? 'local',
    surchargeFee: row.surchargeFee === null || row.surchargeFee === undefined ? undefined : Number(row.surchargeFee),
    surchargeDetails: Array.isArray(row.surchargeDetails) ? row.surchargeDetails : []
  };
}

function mapAgentMarkupRule(row: any): AgentMarkupSummary {
  return {
    id: row.id,
    agentName: row.agentName,
    channelName: row.channelName ?? undefined,
    realChannelName: row.realChannelName ?? undefined,
    destinationCountry: row.destinationCountry ?? undefined,
    markupPerKg: Number(row.markupPerKg),
    enabled: row.enabled
  };
}

function mapCarrierTask(row: {
  id: string;
  shipmentId: string;
  type: string;
  carrier: string;
  transferNo: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  shipment: { systemOrderNo: string; customer: { code: string; name: string } };
}): CarrierTaskSummary {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    systemOrderNo: row.shipment.systemOrderNo,
    customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
    type: row.type as CarrierTaskSummary['type'],
    carrier: toCarrierAdapterCode(row.carrier),
    transferNo: row.transferNo,
    status: row.status as CarrierTaskSummary['status'],
    attempts: row.attempts,
    lastError: row.lastError ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString()
  };
}

function mapWarehousePackage(row: any): WarehousePackageSummary {
  return {
    id: row.id,
    customerCode: row.customerCode,
    customerOrderNo: row.customerOrderNo,
    domesticTrackingNo: row.domesticTrackingNo,
    combinedOrderNo: row.combinedOrderNo,
    systemOrderNo: row.systemOrderNo ?? undefined,
    shipmentId: row.shipmentId ?? undefined,
    receivingChannel: row.receivingChannel,
    destinationCountry: row.destinationCountry ?? undefined,
    expectedTotalPackageCount: row.expectedTotalPackageCount ?? undefined,
    packageCount: row.packageCount,
    weightKg: Number(row.weightKg),
    lengthCm: Number(row.lengthCm),
    widthCm: Number(row.widthCm),
    heightCm: Number(row.heightCm),
    cbm: Number(row.cbm),
    volumetricWeightKg: Number(row.volumetricWeightKg),
    chargeableWeightKg: Number(row.chargeableWeightKg),
    divisor: row.divisor,
    roundingRule: row.roundingRule,
    scanTime: row.scanTime?.toISOString(),
    status: row.status as WarehousePackageStatus,
    exceptions: row.exceptions ?? [],
    createdAt: row.createdAt.toISOString()
  };
}

function mapWarehouseConsolidation(row: any, packageIds: string[]): WarehouseConsolidationSummary {
  return {
    id: row.id,
    consolidationNo: row.consolidationNo,
    mode: row.mode,
    shipmentId: row.shipmentId ?? undefined,
    systemOrderNo: row.systemOrderNo ?? undefined,
    packageIds,
    totalPackages: row.totalPackages,
    totalActualWeightKg: Number(row.totalActualWeightKg),
    totalVolumetricWeightKg: Number(row.totalVolumetricWeightKg),
    totalChargeableWeightKg: Number(row.totalChargeableWeightKg),
    createdAt: row.createdAt.toISOString()
  };
}

function summarizeWarehousePackageGroups(packages: WarehousePackageSummary[]): WarehousePackageGroupSummary[] {
  const groups = new Map<string, WarehousePackageSummary[]>();
  for (const pkg of packages) {
    const key = `${pkg.customerOrderNo}__${pkg.domesticTrackingNo}`;
    groups.set(key, [...(groups.get(key) ?? []), pkg]);
  }
  return Array.from(groups.values()).map((items) => {
    const first = items[0];
    const expected = Math.max(...items.map((item) => item.expectedTotalPackageCount ?? items.length));
    const maxByVolume = items.reduce((best, item) => (item.volumetricWeightKg > best.volumetricWeightKg ? item : best), first);
    return {
      id: `${first.customerOrderNo}-${first.domesticTrackingNo}`,
      customerCode: first.customerCode,
      customerOrderNo: first.customerOrderNo,
      domesticTrackingNo: first.domesticTrackingNo,
      combinedOrderNo: first.combinedOrderNo,
      expectedTotalPackageCount: expected,
      arrivedPackageCount: items.length,
      remainingPackageCount: Math.max(expected - items.length, 0),
      totalActualWeightKg: roundMoney(items.reduce((total, item) => total + item.weightKg * item.packageCount, 0)),
      totalCbm: roundMoney(items.reduce((total, item) => total + item.cbm, 0)),
      maxLengthCm: maxByVolume.lengthCm,
      maxWidthCm: maxByVolume.widthCm,
      maxHeightCm: maxByVolume.heightCm,
      maxVolumetricWeightKg: maxByVolume.volumetricWeightKg,
      totalChargeableWeightKg: roundMoney(items.reduce((total, item) => total + item.chargeableWeightKg, 0)),
      latestScanTime: items.map((item) => item.scanTime).filter(Boolean).sort().at(-1)
    };
  });
}

function toCarrierAdapterCode(carrier: string): CarrierAdapterCode {
  const normalized = carrier.toUpperCase();
  if (normalized.includes('DHL')) {
    return 'DHL';
  }
  if (normalized.includes('FEDEX')) {
    return 'FEDEX';
  }
  if (normalized.includes('UPS')) {
    return 'UPS';
  }
  if (normalized.includes('USPS')) {
    return 'USPS';
  }
  return 'OTHER';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function createBackendPriceLookup(
  principal: Principal,
  input: PriceLookupRequest,
  priceRows: PriceBookRowSummary[],
  priceBooks: Array<Pick<PriceBookSummary, 'id' | 'remark'>>,
  persistedMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules
): PriceLookupResponse {
  const destinationCountry = input.destinationCountry?.trim();
  const chargeableWeightKg = Number(input.chargeableWeightKg);
  if (!destinationCountry || !Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) {
    throw new BadRequestException('目的地和计费重不能为空');
  }

  const warehouseProfile = createWarehouseLookupProfile(input);
  const priceBookRemarkMap = new Map(priceBooks.map((book) => [book.id, book.remark?.trim() || undefined]));
  const markupRules = persistedMarkupRules.length ? persistedMarkupRules : defaultAgentMarkupRules;
  const matchedPrices = selectPriceRowsForLookup(priceRows, warehouseProfile, destinationCountry, chargeableWeightKg);
  if (!matchedPrices.length) {
    throw new BadRequestException('没有匹配的代理成本价');
  }

  const isAdmin = principal.role === 'ADMIN';
  const recommendations = matchedPrices
    .map<PriceLookupRecommendation | null>((price) => {
      const markup = findBestMarkupRule(markupRules, price);
      if (!markup) {
        return null;
      }

      const salesRatePerKg = roundMoney(price.costPerKg + markup.markupPerKg);
      const totalCost = roundMoney(price.costPerKg * chargeableWeightKg);
      const totalSales = roundMoney(salesRatePerKg * chargeableWeightKg);
      const surchargeFee = roundMoney(price.surchargeFee ?? 0);
      const realChannelName = price.realChannelName?.trim() || price.channelName.trim();
      const businessRouteName = price.businessRouteName?.trim() || undefined;
      return {
        price: isAdmin ? { ...price } : omitInternalPriceFields(price),
        ...(isAdmin ? { markup } : {}),
        channelName: price.channelName,
        carrierName: price.carrierName?.trim() || inferBackendPriceCarrierName(price),
        agentName: price.agentName,
        realChannelName,
        isRouteMapped: Boolean(businessRouteName),
        quoteSourceType: price.quoteSourceType ?? 'local',
        weightSegmentLabel: `${price.minWeightKg}-${price.maxWeightKg}kg`,
        salesRatePerKg,
        freightFee: totalSales,
        surchargeFee,
        totalFee: roundMoney(totalSales + surchargeFee),
        freightUnitPrice: salesRatePerKg,
        totalUnitPrice: roundMoney((totalSales + surchargeFee) / chargeableWeightKg),
        ...(isAdmin ? { totalCost, grossProfit: roundMoney(totalSales - totalCost) } : {}),
        totalSales,
        transitLabel: price.transitLabel ?? '时效待确认',
        surchargeDetails: price.surchargeDetails ?? [],
        ...(businessRouteName ? { businessRouteName } : {}),
        ...(price.priceBookId && priceBookRemarkMap.get(price.priceBookId) ? { remark: priceBookRemarkMap.get(price.priceBookId) } : {})
      };
    })
    .filter((recommendation): recommendation is PriceLookupRecommendation => Boolean(recommendation));

  if (!recommendations.length) {
    throw new BadRequestException('没有启用的代理加价规则');
  }

  const cheapestRecommendations = [...recommendations].sort((left, right) => left.totalSales - right.totalSales || left.salesRatePerKg - right.salesRatePerKg).slice(0, 3);
  const fastestRecommendations = [...recommendations].sort((left, right) => matchedTransitDays(left) - matchedTransitDays(right) || left.totalSales - right.totalSales).slice(0, 3);
  const bestRecommendation = cheapestRecommendations[0];
  if (!bestRecommendation) {
    throw new BadRequestException('没有可用报价');
  }

  return {
    price: bestRecommendation.price,
    ...(isAdmin && bestRecommendation.markup ? { markup: bestRecommendation.markup } : {}),
    recommendations,
    cheapestRecommendations,
    fastestRecommendations,
    agentErrors: seedAgentQuoteErrors,
    amazonCode: input.amazonCode?.trim() ?? '',
    productName: input.productName?.trim() ?? '',
    postalCode: input.postalCode?.trim() ?? '',
    address: input.address?.trim() ?? '',
    packageInfo: input.packageInfo?.trim() ?? '',
    channelName: bestRecommendation.channelName,
    chargeableWeightKg,
    weightSegmentLabel: bestRecommendation.weightSegmentLabel,
    salesRatePerKg: bestRecommendation.salesRatePerKg,
    ...(isAdmin ? { totalCost: bestRecommendation.totalCost, grossProfit: bestRecommendation.grossProfit } : {}),
    totalSales: bestRecommendation.totalSales,
    totalPrice: bestRecommendation.totalSales
  };
}

function findBestMarkupRule(markupRules: AgentMarkupSummary[], price: PriceBookRowSummary): AgentMarkupSummary | undefined {
  const destination = price.destinationCountry.trim();
  const channel = price.channelName.trim();
  const realChannel = (price.realChannelName?.trim() || price.channelName.trim());
  return markupRules
    .filter((rule) => rule.enabled && rule.agentName === price.agentName)
    .sort((left, right) => markupSpecificity(right, channel, realChannel, destination) - markupSpecificity(left, channel, realChannel, destination))
    .find((rule) => {
      const channelMatches = !rule.channelName || rule.channelName === channel;
      const realChannelMatches = !rule.realChannelName || rule.realChannelName === realChannel;
      const countryMatches = !rule.destinationCountry || rule.destinationCountry === destination;
      return channelMatches && realChannelMatches && countryMatches;
    });
}

function markupSpecificity(rule: AgentMarkupSummary, channel: string, realChannel: string, destination: string): number {
  let score = 0;
  if (rule.channelName && rule.channelName === channel) {
    score += 2;
  }
  if (rule.realChannelName && rule.realChannelName === realChannel) {
    score += 4;
  }
  if (rule.destinationCountry && rule.destinationCountry === destination) {
    score += 1;
  }
  return score;
}

function omitInternalPriceFields(price: PriceBookRowSummary): PriceLookupRecommendation['price'] {
  return { ...price, costPerKg: undefined };
}

const amazonWarehouseProfiles: Record<string, { warehouseCodes: string[]; keywords: string[] }> = {
  ONT8: {
    warehouseCodes: [
      'ONT8',
      'LAX9',
      'LAX2T',
      'LGB8',
      'SBD1',
      'SBD2',
      'SCK4',
      'SCK8',
      'OAK3',
      'FAT2',
      'SMF3',
      'SMF6',
      'IUSJ',
      'IUSP',
      'IUSQ',
      'POC1',
      'POC3',
      'PSP3',
      'VGT2',
      'MCE1',
      'XLX7',
      'ABQ2'
    ],
    keywords: ['美西', '洛杉矶', '洛杉机', 'LAX', 'ONT', '加州']
  }
};

function normalizeWarehouseCode(value?: string) {
  return value?.trim().replace(/[\s-]/g, '').toUpperCase() ?? '';
}

function createWarehouseLookupProfile(input: PriceLookupRequest) {
  const code = normalizeWarehouseCode(input.amazonCode);
  const profile = code ? amazonWarehouseProfiles[code] : undefined;
  return {
    code,
    warehouseCodes: new Set([code, ...(profile?.warehouseCodes ?? [])].filter(Boolean).map(normalizeWarehouseCode)),
    keywords: profile?.keywords ?? []
  };
}

function getWarehouseMatchRank(row: PriceBookRowSummary, profile: ReturnType<typeof createWarehouseLookupProfile>) {
  const rowWarehouseCode = normalizeWarehouseCode(row.warehouseCode);
  if (!rowWarehouseCode || !profile.code) {
    return 3;
  }
  if (rowWarehouseCode === profile.code) {
    return 0;
  }
  if (profile.warehouseCodes.has(rowWarehouseCode)) {
    return 1;
  }
  const searchableText = [row.channelName, row.realChannelName, row.businessRouteName, row.sourceSheetName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  return profile.keywords.some((keyword) => searchableText.includes(keyword.toUpperCase())) ? 2 : undefined;
}

function selectPriceRowsForLookup(
  priceRows: PriceBookRowSummary[],
  warehouseProfile: ReturnType<typeof createWarehouseLookupProfile>,
  destinationCountry: string,
  chargeableWeightKg: number
) {
  const candidates = priceRows
    .map((row) => ({ row, rank: getWarehouseMatchRank(row, warehouseProfile) }))
    .filter(
      (candidate): candidate is { row: PriceBookRowSummary; rank: number } =>
        candidate.rank !== undefined &&
        candidate.row.destinationCountry === destinationCountry &&
        chargeableWeightKg >= candidate.row.minWeightKg
    );

  const ranks = [...new Set(candidates.map((candidate) => candidate.rank))].sort((left, right) => left - right);
  for (const rank of ranks) {
    const rankCandidates = candidates.filter((candidate) => candidate.rank === rank);
    const exactWeightRows = rankCandidates
      .filter((candidate) => chargeableWeightKg <= candidate.row.maxWeightKg)
      .map((candidate) => candidate.row);
    if (exactWeightRows.length) {
      return exactWeightRows;
    }

    const fallbackRowsByRoute = new Map<string, PriceBookRowSummary>();
    for (const { row } of rankCandidates) {
      const routeKey = [
        row.agentName,
        row.channelName,
        row.realChannelName?.trim() || row.channelName,
        row.warehouseCode ?? '',
        row.destinationCountry
      ].join('|');
      const current = fallbackRowsByRoute.get(routeKey);
      if (!current || row.minWeightKg > current.minWeightKg || (row.minWeightKg === current.minWeightKg && row.costPerKg < current.costPerKg)) {
        fallbackRowsByRoute.set(routeKey, row);
      }
    }
    const fallbackRows = [...fallbackRowsByRoute.values()];
    if (fallbackRows.length) {
      return fallbackRows;
    }
  }

  return [];
}

function matchedTransitDays(item: PriceLookupRecommendation): number {
  return item.price.transitDays ?? Number.POSITIVE_INFINITY;
}

function inferBackendPriceCarrierName(row: PriceBookRowSummary): string {
  const channel = row.channelName.toUpperCase();
  if (channel.includes('UPS')) return 'UPS';
  if (channel.includes('FEDEX') || channel.includes('FDX')) return 'FEDEX';
  if (channel.includes('DHL') || channel.includes('DHK')) return 'DHL';
  if (channel.includes('海运')) return '海运';
  if (channel.includes('空运')) return '空运';
  return '专线';
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(Date.now());
}

function resolveStoredRolePermissions(role: RoleKey, permissions?: PermissionKey[]): PermissionKey[] {
  if (!permissions) {
    return rolePermissions[role];
  }
  const normalized = normalizeRolePermissions(role, permissions);
  return normalized;
}

function inferIpRegion(ip: string): string {
  const normalized = ip.replace('::ffff:', '');
  if (normalized === '::1' || normalized === '127.0.0.1' || normalized === 'localhost') {
    return '本机';
  }
  if (/^(10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[0-1])\\.)/.test(normalized)) {
    return '内网';
  }
  if (!normalized || normalized === '未知') {
    return '未知';
  }
  return '公网 IP，地区待解析';
}

function formatDate(date: Date): string {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

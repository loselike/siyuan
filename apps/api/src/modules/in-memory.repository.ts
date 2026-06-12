import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  type AgentMarkupCreateInput,
  type AgentMarkupSummary,
  type AgentMarkupUpdateInput,
  type AgentCreateInput,
  type AgentSummary,
  type AgentUpdateInput,
  type CarrierTaskRunResponse,
  type CarrierTaskSummary,
  type CarrierTaskStatus,
  type CarrierAdapterCode,
  type CarrierCreateInput,
  type CarrierSummary,
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
  type PaymentSummary,
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
  type ShipmentStatus,
  type TrackingEventInput,
  type WarehouseConsolidationCreateInput,
  type WarehouseConsolidationSummary,
  type WarehousePackageGroupSummary,
  type WarehousePackageSummary
} from '@siyuan/shared';
import { hashPassword } from './password.js';
import {
  buildRolePermissionRow,
  normalizeRolePermissions,
  permissionDefinitions,
  rolePermissions,
  type PermissionKey,
  type Principal,
  type RoleKey,
  type RolePermissionRow
} from './rbac.js';

interface Account extends Principal {
  passwordHash: string;
}

interface Ticket extends ProblemTicketSummary {
  shipmentCustomerId: string;
}

interface StoredReceivableFee extends ReceivableFeeSummary {
  customerId: string;
  createdAt: string;
}

interface StoredLabel extends ShipmentLabelSummary {}

interface StoredCarrierTask extends CarrierTaskSummary {}

interface StoredCustomerAccount extends CustomerAccountSummary {}

interface StoredAccountLedger extends AccountLedgerSummary {}

interface StoredPayment extends PaymentSummary {}

interface StoredCustomer extends CustomerSummary {}

interface StoredCustomerContact extends CustomerContactSummary {}

interface StoredCustomerUser extends CustomerUserSummary {}

interface StoredAgent extends AgentSummary {}

interface StoredCarrier extends CarrierSummary {}

interface StoredChannel extends ChannelSummary {
  carrier: string;
}

interface StoredSurcharge extends SurchargeSummary {}

interface StoredFuelRate extends FuelRateSummary {}

interface StoredExchangeRate extends ExchangeRateSummary {}

interface StoredPricingRule extends PricingRuleSummary {}

interface StoredPriceBook extends PriceBookSummary {
  deleted?: boolean;
}

interface StoredPriceBookRow extends PriceBookRowSummary {}

const defaultAgentMarkupRules = [
  { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, enabled: true },
  { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, enabled: true },
  { id: 'markup-yiyang', agentName: '亿阳国际', markupPerKg: 0.5, enabled: true }
];

const seedAgentQuoteErrors = [
  { agentName: 'BSD', quoteCount: 0, errorCode: 'TOKEN_INVALID', errorMessage: 'Token不正确' }
];

const warehouseMockPackages: Array<Omit<WarehousePackageSummary, 'status' | 'createdAt' | 'chargeableWeightKg' | 'roundingRule' | 'divisor' | 'exceptions'>> = [
  { id: 'wh-1399-1', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, scanTime: '2026-06-08T10:07:28.000+08:00' },
  { id: 'wh-1399-2', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478950', combinedOrderNo: '1399-KY4001036478950', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 13.8, lengthCm: 120, widthCm: 45, heightCm: 50, cbm: 0.27, volumetricWeightKg: 45, scanTime: '2026-06-08T10:09:11.000+08:00' },
  { id: 'wh-1399-3', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478951', combinedOrderNo: '1399-KY4001036478951', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 15.1, lengthCm: 126, widthCm: 47, heightCm: 52, cbm: 0.307944, volumetricWeightKg: 51.32, scanTime: '2026-06-08T10:12:43.000+08:00' },
  { id: 'wh-p710-1', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', combinedOrderNo: 'P710-999056444656', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 8.6, lengthCm: 90, widthCm: 40, heightCm: 42, cbm: 0.1512, volumetricWeightKg: 25.2, scanTime: '2026-06-09T09:15:03.000+08:00' },
  { id: 'wh-p710-2', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444657', combinedOrderNo: 'P710-999056444657', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 9.1, lengthCm: 92, widthCm: 41, heightCm: 40, cbm: 0.15088, volumetricWeightKg: 25.15, scanTime: '2026-06-09T09:18:22.000+08:00' },
  { id: 'wh-p710-3', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444658', combinedOrderNo: 'P710-999056444658', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 8.9, lengthCm: 91, widthCm: 39, heightCm: 41, cbm: 0.145509, volumetricWeightKg: 24.25, scanTime: '2026-06-09T09:21:09.000+08:00' }
];

export class InMemoryRepository {
  private sequence = 20;
  private readonly deletedShipmentIds = new Set<string>();
  private readonly rolePermissionMatrix: Record<RoleKey, PermissionKey[]> = {
    ADMIN: [...rolePermissions.ADMIN],
    CUSTOMER_SERVICE: [...rolePermissions.CUSTOMER_SERVICE],
    OPERATOR: [...rolePermissions.OPERATOR],
    WAREHOUSE: [...rolePermissions.WAREHOUSE],
    FINANCE: [...rolePermissions.FINANCE],
    CUSTOMER: [...rolePermissions.CUSTOMER]
  };
  private readonly accounts: Account[] = [
    { id: 'u-admin', username: 'admin', passwordHash: hashPassword('admin123'), role: 'ADMIN' },
    { id: 'u-cs', username: 'service', passwordHash: hashPassword('service123'), role: 'CUSTOMER_SERVICE' },
    { id: 'u-op', username: 'operator', passwordHash: hashPassword('operator123'), role: 'OPERATOR' },
    { id: 'u-warehouse', username: 'warehouse', passwordHash: hashPassword('warehouse123'), role: 'WAREHOUSE' },
    { id: 'u-finance', username: 'finance', passwordHash: hashPassword('finance123'), role: 'FINANCE' },
    { id: 'u-customer', username: 'customer', passwordHash: hashPassword('customer123'), role: 'CUSTOMER', customerId: 'c-9409' }
  ];

  readonly customers: StoredCustomer[] = [
    { id: 'c-9409', code: '9409', name: 'Daloday', shortName: 'Daloday', fullName: 'Daloday Inc.', customerType: '直客', salesperson: '何俊妮', enabled: true },
    { id: 'c-1344', code: '1344', name: 'TILL', shortName: 'TILL', fullName: 'TILL Trading LLC', customerType: '直客', salesperson: 'jylannie', enabled: true },
    { id: 'c-9509', code: '9509', name: 'Cam&Clae', shortName: 'Cam&Clae', fullName: 'Cam&Clae Co., Ltd.', customerType: '直客', salesperson: '陈冰心', enabled: true }
  ];

  readonly customerContacts: StoredCustomerContact[] = [
    { id: 'cc-9409-main', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Daloday 联系人', phone: '13800000001', email: 'daloday@example.com', enabled: true },
    { id: 'cc-1344-main', customerId: 'c-1344', customerName: '1344-TILL', name: 'TILL 联系人', phone: '13800000002', email: 'till@example.com', enabled: true }
  ];

  readonly customerUsers: StoredCustomerUser[] = [
    { id: 'u-customer', customerId: 'c-9409', customerName: '9409-Daloday', username: 'customer', enabled: true }
  ];

  readonly carriers: StoredCarrier[] = [
    { id: 'cr-dhl', name: 'DHL', enabled: true },
    { id: 'cr-fedex', name: 'FEDEX', enabled: true },
    { id: 'cr-ups', name: 'UPS', enabled: true },
    { id: 'cr-usps', name: 'USPS', enabled: true },
    { id: 'cr-line', name: '专线承运商', enabled: true }
  ];

  readonly channels: StoredChannel[] = [
    { id: 'ch-dhl-hk', name: 'DHL HK', carrierId: 'cr-dhl', carrierName: 'DHL', carrier: 'DHL', enabled: true },
    { id: 'ch-fedex-au', name: 'FEDEX AU 促销', carrierId: 'cr-fedex', carrierName: 'FEDEX', carrier: 'FEDEX', enabled: true },
    { id: 'ch-ups-ca', name: 'UPS 加美线', carrierId: 'cr-ups', carrierName: 'UPS', carrier: 'UPS', enabled: true },
    { id: 'ch-usps', name: 'USPS 小包线', carrierId: 'cr-usps', carrierName: 'USPS', carrier: 'USPS', enabled: true },
    { id: 'ch-europe-truck', name: '欧洲卡航', carrierId: 'cr-line', carrierName: '专线承运商', carrier: '专线承运商', enabled: true }
  ];

  readonly agents: StoredAgent[] = [
    { id: 'a-yuhuan', code: 'YH', shortName: '宇环', name: '深圳宇环', integrationType: 'MANUAL', enabled: true },
    { id: 'a-far-east', code: 'YD', shortName: '远东', name: '深圳远东', integrationType: 'MANUAL', enabled: true },
    { id: 'a-canada', code: 'JMDL', shortName: '加美代理', name: '深圳加美代理', integrationType: 'API', enabled: true },
    { id: 'a-lanmate', code: 'LMT', shortName: '蓝玛特', name: '蓝玛特', integrationType: 'PLATFORM', enabled: true },
    { id: 'a-europe', code: 'OZDL', shortName: '欧洲代理', name: '欧洲代理', integrationType: 'MANUAL', enabled: true }
  ];

  readonly surcharges: StoredSurcharge[] = [
    { id: 'sc-remote', name: '偏远附加费', amount: 50, enabled: true }
  ];

  readonly fuelRates: StoredFuelRate[] = [
    { id: 'fr-dhl-hk', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.15, activeAt: '2026-06-06T00:00:00.000Z' }
  ];

  readonly exchangeRates: StoredExchangeRate[] = [
    { id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'CNY', rate: 7.245, activeAt: '2026-06-06T00:00:00.000Z', enabled: true }
  ];

  readonly pricingRules: StoredPricingRule[] = [
    { id: 'pr-dhl-us-0-5', channelId: 'ch-dhl-hk', channelName: 'DHL HK', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 10, currency: 'USD', enabled: true },
    { id: 'pr-dhl-us-5-20', channelId: 'ch-dhl-hk', channelName: 'DHL HK', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 9.5, currency: 'USD', enabled: true },
    { id: 'pr-fedex-us-0-5', channelId: 'ch-fedex-au', channelName: 'FEDEX AU 促销', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 68, currency: 'CNY', enabled: true },
    { id: 'pr-line-us-5-20', channelId: 'ch-europe-truck', channelName: '欧洲卡航', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 42, currency: 'CNY', enabled: true }
  ];

  readonly priceBooks: StoredPriceBook[] = [];
  readonly priceBookRows: StoredPriceBookRow[] = [];
  readonly agentMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules.map((rule) => ({ ...rule }));
  readonly warehousePackages: WarehousePackageSummary[] = warehouseMockPackages.map((pkg) => normalizeWarehousePackage(pkg));
  readonly warehouseConsolidations: WarehouseConsolidationSummary[] = [];

  private readonly shipments: Array<Shipment & { customerId: string; channelId?: string; agentId?: string }> = [
    this.seedShipment('s-seed-1', 'c-9409', 'DAL-0605-AU', 'SYGJ06059409051', 'WAITING_SORT', 'FEDEX AU 促销', '远东'),
    this.seedShipment('s-seed-2', 'c-1344', 'TILL-0529', 'SYGJ05291344165', 'WAITING_ONLINE', 'DHL HK', '宇环', {
      transferNo: '9064656160',
      dispatchedAt: '2026-06-02T10:00:00.000Z',
      trackingStaleDays: 9,
      hasProblemTicket: true
    }),
    this.seedShipment('s-seed-3', 'c-9409', 'RCV-0606', 'SYGJ06061230001', 'WAITING_RECEIVE', 'DHL HK', '宇环'),
    this.seedShipment('s-seed-4', 'c-9509', 'DSP-0606', 'SYGJ06061230002', 'WAITING_DISPATCH', 'UPS 加美线', '加美代理'),
    this.seedShipment('s-seed-5', 'c-9409', 'SP-US-0606', 'SYXB0606US001', 'DECLARED', 'USPS 小包线', '蓝玛特', {
      businessType: 'SMALL_PACKET',
      packageType: 'PAK'
    }),
    this.seedShipment('s-seed-6', 'c-1344', 'FBA-UK-0606', 'SYZX0606UK001', 'STUCK', '欧洲卡航', '欧洲代理', {
      businessType: 'DEDICATED_LINE',
      receivableWeightKg: 460,
      agentWeightKg: 455,
      latestTracking: '清关查验',
      trackingStaleDays: 4,
      hasProblemTicket: true
    })
  ];

  private readonly tickets: Ticket[] = [
    {
      id: 'pt-seed-1',
      shipmentId: 's-seed-2',
      shipmentCustomerId: 'c-1344',
      systemOrderNo: 'SYGJ05291344165',
      customerName: '1344-TILL',
      reason: '轨迹超过3天未更新',
      status: 'OPEN',
      customerVisible: true,
      createdAt: new Date('2026-06-06T10:00:00Z').toISOString(),
      replies: [{ id: 'ptr-seed-1', author: '客服', message: '已联系代理确认上网节点', createdAt: new Date().toISOString() }]
    }
  ];

  private readonly receivableFees: StoredReceivableFee[] = [
    {
      id: 'rf-seed-1',
      shipmentId: 's-seed-1',
      systemOrderNo: 'SYGJ06059409051',
      customerId: 'c-9409',
      customerName: '9409-Daloday',
      name: '基础运费',
      amount: 1864.2,
      settled: false,
      createdAt: '2026-06-06T10:00:00.000Z'
    },
    {
      id: 'rf-seed-2',
      shipmentId: 's-seed-2',
      systemOrderNo: 'SYGJ05291344165',
      customerId: 'c-1344',
      customerName: '1344-TILL',
      name: '基础运费',
      amount: 2410.5,
      settled: false,
      createdAt: '2026-06-06T10:00:00.000Z'
    }
  ];

  private readonly payableFees: Array<{ id: string; shipmentId: string; name: string; amount: number; settled: boolean }> = [];
  private readonly customerStatements: CustomerStatementSummary[] = [];
  private readonly customerAccounts: StoredCustomerAccount[] = [
    { customerId: 'c-9409', customerName: '9409-Daloday', balance: 10000, currency: 'CNY' },
    { customerId: 'c-1344', customerName: '1344-TILL', balance: 8000, currency: 'CNY' },
    { customerId: 'c-9509', customerName: '9509-Cam&Clae', balance: 0, currency: 'CNY' }
  ];
  private readonly payments: StoredPayment[] = [];
  private readonly accountLedger: StoredAccountLedger[] = [
    {
      id: 'al-seed-9409',
      customerId: 'c-9409',
      customerName: '9409-Daloday',
      amount: 10000,
      balance: 10000,
      note: '期初余额',
      createdAt: '2026-06-01T10:00:00.000Z'
    },
    {
      id: 'al-seed-1344',
      customerId: 'c-1344',
      customerName: '1344-TILL',
      amount: 8000,
      balance: 8000,
      note: '期初余额',
      createdAt: '2026-06-01T10:00:00.000Z'
    }
  ];
  private readonly labels: StoredLabel[] = [];
  private readonly carrierTasks: StoredCarrierTask[] = [
    this.seedCarrierTask('ct-seed-dhl', 's-seed-2', 'PENDING', 0, '9064656160'),
    this.seedCarrierTask('ct-seed-ups', 's-seed-4', 'FAILED', 1, '1Z26060600001', '模拟承运商接口失败')
  ];

  async findAccount(username: string, password: string): Promise<Principal | undefined> {
    const passwordHash = hashPassword(password);
    const account = this.accounts.find((item) => item.username === username && item.passwordHash === passwordHash);
    if (!account) {
      return undefined;
    }
    return { id: account.id, username: account.username, role: account.role, customerId: account.customerId };
  }

  async getShipments(principal: Principal): Promise<Shipment[]> {
    return this.visibleShipments(principal);
  }

  async getShipmentStatusCounts(principal: Principal) {
    return summarizeStatusCounts(await this.getShipments(principal));
  }

  async getMasterData(): Promise<MasterDataSnapshot> {
    return {
      customers: this.customers.map((customer) => ({ ...customer })),
      contacts: this.customerContacts.map((contact) => ({ ...contact })),
      customerUsers: this.customerUsers.map((user) => ({ ...user })),
      agents: this.agents.map((agent) => ({ ...agent })),
      carriers: this.carriers.map((carrier) => ({ ...carrier })),
      channels: this.channels.map((channel) => this.channelSummary(channel)),
      surcharges: this.surcharges.map((surcharge) => ({ ...surcharge })),
      fuelRates: this.fuelRates.map((fuelRate) => ({ ...fuelRate })),
      exchangeRates: this.exchangeRates.map((exchangeRate) => ({ ...exchangeRate })),
      roles: this.getRoles()
    };
  }

  async createCustomer(_principal: Principal, input: CustomerCreateInput): Promise<CustomerSummary> {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    if (this.customers.some((customer) => customer.code === input.code.trim())) {
      throw new BadRequestException('客户代码已存在');
    }
    const customer = {
      id: `c-${input.code.trim()}`,
      code: input.code.trim(),
      name: input.name.trim(),
      shortName: input.shortName?.trim() || input.name.trim(),
      fullName: input.fullName?.trim() || `${input.name.trim()} Co., Ltd.`,
      customerType: input.customerType?.trim() || '直客',
      salesperson: input.salesperson?.trim() || '',
      enabled: true
    };
    this.customers.push(customer);
    this.customerAccounts.push({ customerId: customer.id, customerName: this.customerDisplayName(customer), balance: 0, currency: 'CNY' });
    return { ...customer };
  }

  async updateCustomer(_principal: Principal, id: string, input: CustomerUpdateInput): Promise<CustomerSummary> {
    const customer = this.findCustomer(id);
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    const nextCode = input.code.trim();
    if (this.customers.some((item) => item.id !== id && item.code === nextCode)) {
      throw new BadRequestException('客户代码已存在');
    }
    customer.code = nextCode;
    customer.name = input.name.trim();
    customer.shortName = input.shortName?.trim() || customer.name;
    customer.fullName = input.fullName?.trim() || `${customer.name} Co., Ltd.`;
    customer.customerType = input.customerType?.trim() || '直客';
    customer.salesperson = input.salesperson?.trim() || '';
    if (typeof input.enabled === 'boolean') {
      customer.enabled = input.enabled;
    }
    return { ...customer };
  }

  async createCustomerContact(_principal: Principal, customerId: string, input: CustomerContactCreateInput): Promise<CustomerContactSummary> {
    const customer = this.findCustomer(customerId);
    if (!input.name?.trim()) {
      throw new BadRequestException('联系人名称不能为空');
    }
    const contact = {
      id: `cc-${customer.id}-${this.customerContacts.length + 1}`,
      customerId: customer.id,
      customerName: this.customerDisplayName(customer),
      name: input.name.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim(),
      enabled: true
    };
    this.customerContacts.push(contact);
    return { ...contact };
  }

  async createCustomerUser(_principal: Principal, customerId: string, input: CustomerUserCreateInput): Promise<CustomerUserSummary> {
    const customer = this.findCustomer(customerId);
    if (!input.username?.trim() || !input.password?.trim()) {
      throw new BadRequestException('账号和密码不能为空');
    }
    if (this.accounts.some((account) => account.username === input.username.trim())) {
      throw new BadRequestException('账号已存在');
    }
    const account = {
      id: `u-${input.username.trim()}`,
      username: input.username.trim(),
      passwordHash: hashPassword(input.password),
      role: 'CUSTOMER' as const,
      customerId: customer.id
    };
    this.accounts.push(account);
    const summary = { id: account.id, customerId: customer.id, customerName: this.customerDisplayName(customer), username: account.username, enabled: true };
    this.customerUsers.push(summary);
    return { ...summary };
  }

  async updateCustomerEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<CustomerSummary> {
    const customer = this.findCustomer(id);
    customer.enabled = input.enabled === true;
    return { ...customer };
  }

  async createAgent(_principal: Principal, input: AgentCreateInput): Promise<AgentSummary> {
    if (!input.name?.trim()) {
      throw new BadRequestException('代理名称不能为空');
    }
    const agent = {
      id: `a-${this.slug(input.name)}`,
      code: input.code?.trim() || input.name.trim().toUpperCase().slice(0, 6),
      shortName: input.shortName?.trim() || input.name.trim(),
      name: input.name.trim(),
      integrationType: input.integrationType ?? 'MANUAL',
      enabled: true
    };
    this.agents.push(agent);
    return { ...agent };
  }

  async updateAgent(_principal: Principal, id: string, input: AgentUpdateInput): Promise<AgentSummary> {
    const agent = this.findEnabledEntity(this.agents, id, '代理不存在');
    if (!input.name?.trim()) {
      throw new BadRequestException('代理名称不能为空');
    }
    agent.code = input.code?.trim() || agent.code;
    agent.shortName = input.shortName?.trim() || input.name.trim();
    agent.name = input.name.trim();
    agent.integrationType = input.integrationType ?? agent.integrationType ?? 'MANUAL';
    if (typeof input.enabled === 'boolean') {
      agent.enabled = input.enabled;
    }
    return { ...agent };
  }

  async updateAgentEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<AgentSummary> {
    const agent = this.findEnabledEntity(this.agents, id, '代理不存在');
    agent.enabled = input.enabled === true;
    return { ...agent };
  }

  async createCarrier(_principal: Principal, input: CarrierCreateInput): Promise<CarrierSummary> {
    if (!input.name?.trim()) {
      throw new BadRequestException('承运商名称不能为空');
    }
    const carrier = { id: `cr-${this.slug(input.name)}`, name: input.name.trim(), enabled: true };
    this.carriers.push(carrier);
    return { ...carrier };
  }

  async updateCarrierEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<CarrierSummary> {
    const carrier = this.findEnabledEntity(this.carriers, id, '承运商不存在');
    carrier.enabled = input.enabled === true;
    return { ...carrier };
  }

  async createChannel(_principal: Principal, input: ChannelCreateInput): Promise<ChannelSummary> {
    const carrier = this.findEnabledEntity(this.carriers, input.carrierId, '承运商不存在');
    if (!input.name?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    const channel = {
      id: `ch-${this.slug(input.name)}`,
      name: input.name.trim(),
      carrierId: carrier.id,
      carrierName: carrier.name,
      carrier: carrier.name,
      enabled: true
    };
    this.channels.push(channel);
    return this.channelSummary(channel);
  }

  async updateChannelEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<ChannelSummary> {
    const channel = this.findEnabledEntity(this.channels, id, '渠道不存在');
    channel.enabled = input.enabled === true;
    return this.channelSummary(channel);
  }

  async createSurcharge(_principal: Principal, input: SurchargeCreateInput): Promise<SurchargeSummary> {
    if (!input.name?.trim() || input.amount <= 0) {
      throw new BadRequestException('附加费名称和金额无效');
    }
    const surcharge = { id: `sc-${this.slug(input.name)}`, name: input.name.trim(), amount: roundMoney(input.amount), enabled: true };
    this.surcharges.push(surcharge);
    return { ...surcharge };
  }

  async updateSurchargeEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<SurchargeSummary> {
    const surcharge = this.findEnabledEntity(this.surcharges, id, '附加费不存在');
    surcharge.enabled = input.enabled === true;
    return { ...surcharge };
  }

  async createFuelRate(_principal: Principal, input: FuelRateCreateInput): Promise<FuelRateSummary> {
    const channel = this.findEnabledEntity(this.channels, input.channelId, '渠道不存在');
    if (input.rate < 0) {
      throw new BadRequestException('燃油费率无效');
    }
    const fuelRate = {
      id: `fr-${this.fuelRates.length + 1}`,
      channelId: channel.id,
      channelName: channel.name,
      rate: roundMoney(input.rate),
      activeAt: new Date(input.activeAt).toISOString()
    };
    this.fuelRates.push(fuelRate);
    return { ...fuelRate };
  }

  async createExchangeRate(_principal: Principal, input: ExchangeRateCreateInput): Promise<ExchangeRateSummary> {
    if (!input.baseCurrency?.trim() || !input.quoteCurrency?.trim() || input.rate <= 0) {
      throw new BadRequestException('汇率信息无效');
    }
    const exchangeRate = {
      id: `er-${input.baseCurrency.toLowerCase()}-${input.quoteCurrency.toLowerCase()}-${this.exchangeRates.length + 1}`,
      baseCurrency: input.baseCurrency.trim().toUpperCase(),
      quoteCurrency: input.quoteCurrency.trim().toUpperCase(),
      rate: roundMoney(input.rate),
      activeAt: new Date(input.activeAt).toISOString(),
      enabled: true
    };
    this.exchangeRates.push(exchangeRate);
    return { ...exchangeRate };
  }

  async hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean> {
    return role === 'ADMIN' || this.rolePermissionMatrix[role].includes(permission);
  }

  async getRolePermissionMatrix(): Promise<{ availablePermissions: typeof permissionDefinitions; roles: RolePermissionRow[] }> {
    return {
      availablePermissions: permissionDefinitions,
      roles: this.getRoles().map((role) => buildRolePermissionRow(role, this.rolePermissionMatrix[role]))
    };
  }

  async updateRolePermissions(principal: Principal, role: RoleKey, permissions: PermissionKey[]): Promise<RolePermissionRow> {
    const before = [...this.rolePermissionMatrix[role]];
    this.rolePermissionMatrix[role] = normalizeRolePermissions(role, permissions);
    this.audit('system.role_permissions.update', `role:${role}`, principal, before, this.rolePermissionMatrix[role]);
    return buildRolePermissionRow(role, this.rolePermissionMatrix[role]);
  }

  quote(input: PricingQuoteRequest) {
    return calculateQuote(input);
  }

  async lookupPrice(principal: Principal, input: PriceLookupRequest): Promise<PriceLookupResponse> {
    this.ensureStaffPricingAccess(principal);
    return createBackendPriceLookup(principal, input, this.priceBookRows, this.priceBooks, this.agentMarkupRules);
  }

  async getAgentMarkupRules(principal: Principal): Promise<AgentMarkupSummary[]> {
    this.ensureAdmin(principal, '只有管理员可以查看代理加价规则');
    return this.agentMarkupRules.map((rule) => ({ ...rule }));
  }

  async createAgentMarkupRule(principal: Principal, input: AgentMarkupCreateInput): Promise<AgentMarkupSummary> {
    this.ensureAdmin(principal, '只有管理员可以新增代理加价规则');
    if (!input.agentName?.trim() || !Number.isFinite(input.markupPerKg) || input.markupPerKg < 0) {
      throw new BadRequestException('代理名称和加价金额不能为空');
    }
    const rule: AgentMarkupSummary = {
      id: `markup-${this.agentMarkupRules.length + 1}`,
      agentName: input.agentName.trim(),
      channelName: input.channelName?.trim() || undefined,
      realChannelName: input.realChannelName?.trim() || undefined,
      destinationCountry: input.destinationCountry?.trim() || undefined,
      markupPerKg: roundMoney(input.markupPerKg),
      enabled: input.enabled !== false
    };
    this.agentMarkupRules.unshift(rule);
    this.audit('pricing.markup.create', rule.id, principal, null, rule);
    return { ...rule };
  }

  async updateAgentMarkupRule(principal: Principal, id: string, input: AgentMarkupUpdateInput): Promise<AgentMarkupSummary> {
    this.ensureAdmin(principal, '只有管理员可以修改代理加价规则');
    const rule = this.agentMarkupRules.find((item) => item.id === id);
    if (!rule) {
      throw new NotFoundException('代理加价规则不存在');
    }
    const before = { ...rule };
    if (input.agentName !== undefined) {
      rule.agentName = input.agentName.trim();
    }
    if (input.channelName !== undefined) {
      rule.channelName = input.channelName.trim() || undefined;
    }
    if (input.realChannelName !== undefined) {
      rule.realChannelName = input.realChannelName.trim() || undefined;
    }
    if (input.destinationCountry !== undefined) {
      rule.destinationCountry = input.destinationCountry.trim() || undefined;
    }
    if (input.markupPerKg !== undefined) {
      rule.markupPerKg = roundMoney(input.markupPerKg);
    }
    if (input.enabled !== undefined) {
      rule.enabled = input.enabled;
    }
    this.audit('pricing.markup.update', id, principal, before, rule);
    return { ...rule };
  }

  async deleteAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupSummary> {
    return this.updateAgentMarkupRule(principal, id, { enabled: false });
  }

  async getPriceBooks(principal: Principal): Promise<PriceBooksResponse> {
    this.ensureStaffPricingAccess(principal);
    const activeBooks = this.priceBooks.filter((book) => !book.deleted);
    const activeBookIds = new Set(activeBooks.map((book) => book.id));
    return {
      books: activeBooks.map((book) => this.toPriceBookSummary(book)),
      rows: this.priceBookRows.filter((row) => activeBookIds.has(row.priceBookId)).map((row) => ({ ...row }))
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

    const book: StoredPriceBook = {
      id: `pb-${Date.now()}-${this.priceBooks.length + 1}`,
      fileName: input.fileName.trim(),
      rowCount: input.rows.length,
      importedAt: new Date().toISOString()
    };
    const rows = input.rows.map((row, index): StoredPriceBookRow => this.normalizePriceBookRow(book.id, row, index));
    this.priceBooks.unshift(book);
    this.priceBookRows.unshift(...rows);
    this.audit('pricing.price_book.import', book.id, principal, null, { book, rowCount: rows.length });
    return { book: { ...book }, rows: rows.map((row) => ({ ...row })) };
  }

  async updatePriceBookRemark(principal: Principal, id: string, input: PriceBookRemarkUpdateInput): Promise<PriceBookSummary> {
    this.ensureStaffPricingAccess(principal);
    const book = this.priceBooks.find((item) => item.id === id && !item.deleted);
    if (!book) {
      throw new NotFoundException('价格表不存在');
    }
    const before = { ...book };
    book.remark = input.remark?.trim() || undefined;
    this.audit('pricing.price_book.remark.update', id, principal, before, book);
    return this.toPriceBookSummary(book);
  }

  async deletePriceBook(principal: Principal, id: string): Promise<PriceBookSummary> {
    this.ensureStaffPricingAccess(principal);
    const book = this.priceBooks.find((item) => item.id === id && !item.deleted);
    if (!book) {
      throw new NotFoundException('价格表不存在');
    }
    const before = { ...book };
    book.deleted = true;
    this.audit('pricing.price_book.delete', id, principal, before, book);
    return this.toPriceBookSummary(book);
  }

  async getPricingRules(principal: Principal): Promise<PricingRuleSummary[]> {
    this.ensureStaffPricingAccess(principal);
    return this.pricingRules.map((rule) => ({ ...rule }));
  }

  async createPricingRule(principal: Principal, input: PricingRuleCreateInput): Promise<PricingRuleSummary> {
    this.ensureStaffPricingAccess(principal);
    if (!input.channelId?.trim() || !input.destinationCountry?.trim() || input.minWeightKg < 0 || input.maxWeightKg <= input.minWeightKg || input.ratePerKg <= 0) {
      throw new BadRequestException('报价规则参数不完整');
    }
    const channel = this.findEnabledEntity(this.channels, input.channelId, '渠道不存在');
    if (!channel.enabled) {
      throw new BadRequestException('渠道已停用');
    }
    const rule = {
      id: `pr-${this.slug(channel.name)}-${this.pricingRules.length + 1}`,
      channelId: channel.id,
      channelName: channel.name,
      destinationCountry: input.destinationCountry.trim(),
      minWeightKg: roundMoney(input.minWeightKg),
      maxWeightKg: roundMoney(input.maxWeightKg),
      ratePerKg: roundMoney(input.ratePerKg),
      currency: input.currency.trim().toUpperCase() || 'CNY',
      enabled: true
    };
    this.pricingRules.push(rule);
    return { ...rule };
  }

  async updatePricingRuleEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<PricingRuleSummary> {
    this.ensureStaffPricingAccess(principal);
    const rule = this.findEnabledEntity(this.pricingRules, id, '报价规则不存在');
    rule.enabled = input.enabled === true;
    return { ...rule };
  }

  async quotePricingRule(principal: Principal, input: PricingRuleQuoteRequest): Promise<PricingRuleQuoteResponse> {
    this.ensureStaffPricingAccess(principal);
    return this.quoteFromRules(input);
  }

  async getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    return this.warehousePackages.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }));
  }

  async getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]> {
    return summarizeWarehousePackageGroups(await this.getWarehousePackages(principal));
  }

  async syncMockWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    for (const pkg of warehouseMockPackages) {
      if (!this.warehousePackages.some((item) => item.id === pkg.id)) {
        this.warehousePackages.push(normalizeWarehousePackage(pkg));
      }
    }
    this.audit('warehouse.packages.sync_mock', 'warehousePackage', principal, null, { count: this.warehousePackages.length });
    return this.getWarehousePackages(principal);
  }

  async createWarehouseConsolidation(principal: Principal, input: WarehouseConsolidationCreateInput): Promise<WarehouseConsolidationSummary> {
    this.ensureWarehouseAccess(principal);
    if (!Array.isArray(input.packageIds) || input.packageIds.length === 0) {
      throw new BadRequestException('请先选择要合并的包裹');
    }
    const packages = input.packageIds.map((id) => this.warehousePackages.find((pkg) => pkg.id === id));
    if (packages.some((pkg) => !pkg || pkg.status === 'CONSOLIDATED')) {
      throw new BadRequestException('部分包裹不存在或已合并');
    }
    const selected = packages as WarehousePackageSummary[];
    const consolidationNo = this.nextWarehouseConsolidationNo(selected, input.mode);
    const consolidation: WarehouseConsolidationSummary = {
      id: `whc-${this.warehouseConsolidations.length + 1}`,
      consolidationNo,
      mode: input.mode,
      packageIds: selected.map((pkg) => pkg.id),
      totalPackages: selected.reduce((total, pkg) => total + pkg.packageCount, 0),
      totalActualWeightKg: roundMoney(selected.reduce((total, pkg) => total + pkg.weightKg * pkg.packageCount, 0)),
      totalVolumetricWeightKg: roundMoney(selected.reduce((total, pkg) => total + pkg.volumetricWeightKg, 0)),
      totalChargeableWeightKg: roundMoney(selected.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0)),
      createdAt: new Date().toISOString()
    };
    this.warehouseConsolidations.unshift(consolidation);
    selected.forEach((pkg) => {
      pkg.status = 'CONSOLIDATED';
    });
    this.audit('warehouse.consolidation.create', consolidation.id, principal, null, consolidation);
    if (input.mode === 'MERGE_AND_SHIP') {
      return this.createShipmentFromWarehouseConsolidation(principal, consolidation.id);
    }
    return { ...consolidation, packageIds: [...consolidation.packageIds] };
  }

  async createShipmentFromWarehouseConsolidation(principal: Principal, id: string): Promise<WarehouseConsolidationSummary> {
    this.ensureWarehouseAccess(principal);
    const consolidation = this.warehouseConsolidations.find((item) => item.id === id);
    if (!consolidation) {
      throw new NotFoundException('合并批次不存在');
    }
    if (consolidation.shipmentId) {
      return { ...consolidation, packageIds: [...consolidation.packageIds] };
    }
    const packages = consolidation.packageIds.map((packageId) => this.warehousePackages.find((pkg) => pkg.id === packageId)).filter(Boolean) as WarehousePackageSummary[];
    const first = packages[0];
    const customer = this.customers.find((item) => item.code === first.customerCode) ?? this.customers[0];
    if (!customer) {
      throw new BadRequestException('缺少客户资料，无法创建出货订单');
    }
    const shipment = await this.createShipment(principal, {
      customerId: customer.id,
      customerOrderNo: first.customerOrderNo,
      systemOrderNo: consolidation.consolidationNo,
      businessType: 'DEDICATED_LINE',
      packageType: 'WPX',
      destinationCountry: first.destinationCountry || '美国',
      packageCount: consolidation.totalPackages,
      receivableWeightKg: consolidation.totalChargeableWeightKg,
      agentWeightKg: consolidation.totalChargeableWeightKg,
      initialStatus: 'DRAFT',
      latestTracking: '合并包裹创建出货订单，待审核'
    });
    consolidation.shipmentId = shipment.id;
    consolidation.systemOrderNo = shipment.systemOrderNo;
    this.audit('warehouse.consolidation.create_shipment', id, principal, null, { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo });
    return { ...consolidation, packageIds: [...consolidation.packageIds] };
  }

  async getWarehouseConsolidationItems(principal: Principal, id: string): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    const consolidation = this.warehouseConsolidations.find((item) => item.id === id);
    if (!consolidation) {
      throw new NotFoundException('合并批次不存在');
    }
    return consolidation.packageIds
      .map((packageId) => this.warehousePackages.find((pkg) => pkg.id === packageId))
      .filter((pkg): pkg is WarehousePackageSummary => Boolean(pkg))
      .map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }));
  }

  async getReceivables(principal: Principal): Promise<ReceivableFeeSummary[]> {
    return this.receivableFees
      .filter((fee) => principal.role !== 'CUSTOMER' || fee.customerId === principal.customerId)
      .map((fee) => this.toReceivableSummary(fee));
  }

  async generateShipmentFees(
    principal: Principal,
    shipmentId: string,
    input: { baseRatePerKg?: number; payableRatePerKg?: number; fuelRate?: number; surcharges?: Array<{ name: string; amount: number }>; pricingRuleId?: string; channelId?: string; destinationCountry?: string }
  ) {
    const shipment = this.visibleShipment(principal, shipmentId);
    this.receivableFees.splice(0, this.receivableFees.length, ...this.receivableFees.filter((fee) => fee.shipmentId !== shipment.id));
    this.payableFees.splice(0, this.payableFees.length, ...this.payableFees.filter((fee) => fee.shipmentId !== shipment.id));

    const receivableQuote = input.baseRatePerKg && input.fuelRate !== undefined
      ? calculateQuote({
        chargeableWeightKg: shipment.receivableWeightKg,
        baseRatePerKg: input.baseRatePerKg,
        fuelRate: input.fuelRate,
        surcharges: input.surcharges ?? []
      })
      : this.quoteFromRules({
        channelId: input.channelId ?? shipment.channelId ?? '',
        destinationCountry: input.destinationCountry ?? shipment.destinationCountry,
        chargeableWeightKg: shipment.receivableWeightKg
      });
    const payableQuote = calculateQuote({
      chargeableWeightKg: shipment.agentWeightKg,
      baseRatePerKg: input.payableRatePerKg ?? 0,
      fuelRate: input.fuelRate ?? 0,
      surcharges: []
    });
    const receivables = createFeeLinesFromQuote(shipment.id, receivableQuote).map((line, index): StoredReceivableFee => ({
      id: `rf-${Date.now()}-${index}`,
      shipmentId: shipment.id,
      systemOrderNo: shipment.systemOrderNo,
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      name: line.name,
      amount: line.amount,
      settled: false,
      createdAt: new Date().toISOString()
    }));
    const payables = createFeeLinesFromQuote(shipment.id, payableQuote).map((line, index) => ({
      id: `pf-${Date.now()}-${index}`,
      shipmentId: shipment.id,
      name: line.name,
      amount: line.amount,
      settled: false
    }));
    this.receivableFees.push(...receivables);
    this.payableFees.push(...payables);

    return {
      receivables: receivables.map((fee) => this.toReceivableSummary(fee)),
      payables,
      receivableTotal: receivableQuote.total,
      payableTotal: payableQuote.total
    };
  }

  async addReceivableAdjustment(principal: Principal, shipmentId: string, input: ReceivableAdjustmentInput): Promise<ReceivableFeeSummary> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const fee: StoredReceivableFee = {
      id: `rf-adjust-${this.receivableFees.length + 1}`,
      shipmentId: shipment.id,
      systemOrderNo: shipment.systemOrderNo,
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      name: input.name,
      amount: input.amount,
      settled: false,
      createdAt: new Date().toISOString()
    };
    this.receivableFees.push(fee);
    return this.toReceivableSummary(fee);
  }

  async getCustomerStatements(principal: Principal): Promise<CustomerStatementSummary[]> {
    return this.customerStatements.filter((statement) => principal.role !== 'CUSTOMER' || statement.customerId === principal.customerId);
  }

  async createCustomerStatement(_principal: Principal, input: CustomerStatementCreateInput): Promise<CustomerStatementSummary> {
    const customer = this.customers.find((item) => item.id === input.customerId);
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const statement = {
      ...summarizeStatement({
        customerId: customer.id,
        customerName: `${customer.code}-${customer.name}`,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        fees: this.receivableFees
          .filter((fee) => fee.customerId === customer.id)
          .map((fee) => this.toReceivableSummary(fee))
      }),
      id: `cs-${this.customerStatements.length + 1}`,
      createdAt: new Date().toISOString()
    };
    this.customerStatements.push(statement);
    return statement;
  }

  async getCustomerAccounts(principal: Principal): Promise<CustomerAccountSummary[]> {
    return this.customerAccounts.filter((account) => principal.role !== 'CUSTOMER' || account.customerId === principal.customerId);
  }

  async getAccountLedger(principal: Principal): Promise<AccountLedgerSummary[]> {
    return this.accountLedger
      .filter((entry) => principal.role !== 'CUSTOMER' || entry.customerId === principal.customerId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createPayment(_principal: Principal, input: PaymentCreateInput): Promise<PaymentCreateResponse> {
    if (input.amount <= 0) {
      throw new BadRequestException('收款金额必须大于 0');
    }
    const account = this.customerAccounts.find((item) => item.customerId === input.customerId);
    if (!account) {
      throw new BadRequestException('客户账户不存在');
    }
    const feeIds = input.feeIds ?? [];
    const selectedFees = this.receivableFees.filter((fee) => feeIds.includes(fee.id));
    if (selectedFees.length !== feeIds.length) {
      throw new BadRequestException('应收费用不存在');
    }
    if (selectedFees.some((fee) => fee.customerId !== input.customerId)) {
      throw new BadRequestException('应收费用不属于该客户');
    }
    if (selectedFees.some((fee) => fee.settled)) {
      throw new BadRequestException('应收费用已核销');
    }
    const settledAmount = roundMoney(selectedFees.reduce((sum, fee) => sum + fee.amount, 0));
    if (input.amount < settledAmount) {
      throw new BadRequestException('收款金额不足以核销选中费用');
    }

    const now = new Date().toISOString();
    const payment = summarizePaymentSettlement({
      id: `pay-${this.payments.length + 1}`,
      customerId: account.customerId,
      customerName: account.customerName,
      amount: input.amount,
      settledAmount,
      createdAt: now
    });
    this.payments.push(payment);

    account.balance = roundMoney(account.balance + input.amount);
    this.accountLedger.push({
      id: `al-${this.accountLedger.length + 1}`,
      customerId: account.customerId,
      customerName: account.customerName,
      amount: roundMoney(input.amount),
      balance: account.balance,
      note: input.note?.trim() || '收款登记',
      createdAt: now
    });

    if (settledAmount > 0) {
      selectedFees.forEach((fee) => {
        fee.settled = true;
      });
      account.balance = roundMoney(account.balance - settledAmount);
      this.accountLedger.push({
        id: `al-${this.accountLedger.length + 1}`,
        customerId: account.customerId,
        customerName: account.customerName,
        amount: -settledAmount,
        balance: account.balance,
        note: '核销应收费用',
        createdAt: now
      });
    }

    const statement = input.statementId ? this.customerStatements.find((item) => item.id === input.statementId) : undefined;
    if (statement && statement.customerId === input.customerId && input.amount >= statement.total) {
      statement.status = 'SETTLED';
    }

    return {
      payment,
      account: { ...account },
      settledFees: selectedFees.map((fee) => this.toReceivableSummary(fee)),
      statement
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
    const customer = this.customers.find((item) => item.id === customerId);
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const channel = this.channels.find((item) => item.id === input.channelId) ?? this.channels[0];
    const receivingChannel = input.receivingChannel?.trim();
    const initialStatus = principal.role === 'CUSTOMER' ? 'DECLARED' : input.initialStatus ?? 'DECLARED';
    const latestTracking = input.latestTracking?.trim() || (initialStatus === 'DRAFT' ? '新建出货订单，待审核' : '客户已预报');
    this.sequence += 1;
    const shipment: Shipment & { customerId: string; channelId?: string; agentId?: string } = {
      id: `s-created-${this.sequence}`,
      customerId,
      channelId: channel.id,
      createdAt: new Date().toISOString(),
      customerName: `${customer.code}-${customer.name}`,
      customerOrderNo: input.customerOrderNo.trim(),
      systemOrderNo: principal.role === 'CUSTOMER' ? createSystemOrderNo(input.businessType, new Date(), this.sequence) : input.systemOrderNo?.trim() || createSystemOrderNo(input.businessType, new Date(), this.sequence),
      transferNo: input.transferNo?.trim() || undefined,
      businessType: input.businessType,
      packageType: input.packageType,
      destinationCountry: input.destinationCountry.trim(),
      carrier: receivingChannel || channel.carrier,
      packageCount: input.packageCount,
      receivableWeightKg: input.receivableWeightKg,
      agentWeightKg: input.agentWeightKg ?? input.receivableWeightKg,
      latestTracking,
      trackingStaleDays: 0,
      isRemoteArea: false,
      status: initialStatus,
      channelName: channel.name,
      agentName: '',
      hasProblemTicket: false
    };
    this.shipments.unshift(shipment);
    return shipment;
  }

  async importShipments(principal: Principal, request: ShipmentImportRequest): Promise<ShipmentImportResponse> {
    const validation = validateShipmentImportRows(request.rows);
    const created: Shipment[] = [];
    for (const row of validation.validRows) {
      const channel = this.channels.find((item) => item.name.includes(row.channelName));
      created.push(
        await this.createShipment(principal, {
          customerId: request.customerId,
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
    const shipment = this.visibleShipment(principal, shipmentId);
    if (shipment.status === 'DECLARED' || shipment.status === 'WAITING_RECEIVE') {
      shipment.status = 'WAITING_SORT';
      shipment.latestTracking = '已收货';
      return shipment;
    }
    throw new BadRequestException('当前状态不允许确认收货');
  }

  async routeShipment(principal: Principal, shipmentId: string, body: { channelId?: string; agentId?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!canTransitionShipment(shipment.status, 'WAITING_DISPATCH')) {
      throw new BadRequestException('当前状态不允许排货');
    }
    const channel = this.channels.find((item) => item.id === body.channelId);
    const agent = this.agents.find((item) => item.id === body.agentId);
    shipment.status = 'WAITING_DISPATCH';
    shipment.channelId = channel?.id;
    shipment.channelName = channel?.name ?? shipment.channelName;
    shipment.carrier = channel?.carrier ?? shipment.carrier;
    shipment.agentId = agent?.id;
    shipment.agentName = agent?.name ?? shipment.agentName;
    return shipment;
  }

  async dispatchShipment(principal: Principal, shipmentId: string, body: { transferNo?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const transferNo = body.transferNo ?? shipment.transferNo;
    if (!transferNo) {
      throw new BadRequestException('发货前必须填写转单号');
    }
    if (this.labels.some((label) => label.shipmentId === shipment.id && label.transferNo === transferNo && label.status === 'VOIDED')) {
      throw new BadRequestException('已作废面单不能发货');
    }
    if (!canTransitionShipment(shipment.status, 'WAITING_ONLINE')) {
      throw new BadRequestException('当前状态不允许发货');
    }
    shipment.transferNo = transferNo;
    shipment.status = 'WAITING_ONLINE';
    shipment.latestTracking = '已发货';
    shipment.dispatchedAt = new Date().toISOString();
    this.ensureCarrierTask(shipment, transferNo);
    return shipment;
  }

  async updateShipmentOperational(principal: Principal, shipmentId: string, input: ShipmentOperationalUpdateInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const nextStatus = input.status ?? shipment.status;
    if (!(nextStatus in shipmentStatusLabels)) {
      throw new BadRequestException('运单状态无效');
    }
    const latestTracking = input.latestTracking?.trim();
    if (input.latestTracking !== undefined && !latestTracking) {
      throw new BadRequestException('最新轨迹不能为空');
    }
    if (latestTracking !== undefined) {
      shipment.latestTracking = latestTracking;
      shipment.trackingStaleDays = 0;
    }
    shipment.transferNo = input.transferNo?.trim() || undefined;
    shipment.status = nextStatus;
    this.audit('人工修改运单', shipment.id, principal, null, shipment);
    return shipment;
  }

  async registerShipmentPayment(principal: Principal, shipmentId: string, input: ShipmentPaymentUpdateInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
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
    shipment.paymentAmountUsd = hasUsd ? Number(input.paymentAmountUsd) : undefined;
    shipment.paymentAmountCny = hasCny ? Number(input.paymentAmountCny) : undefined;
    shipment.paymentMethod = input.paymentMethod;
    this.audit('登记收款', shipment.id, principal, null, shipment);
    return shipment;
  }

  async importTrackingEvents(principal: Principal, request: BulkTrackingApplyRequest): Promise<BulkTrackingApplyResponse> {
    if (!Array.isArray(request.updates) || request.updates.length === 0) {
      throw new BadRequestException('没有可导入的轨迹记录');
    }
    const updated: Shipment[] = [];
    for (const item of request.updates) {
      const shipment = this.visibleShipment(principal, item.shipmentId);
      if (!item.latestTracking?.trim()) {
        throw new BadRequestException('最新轨迹不能为空');
      }
      shipment.latestTracking = item.latestTracking.trim();
      shipment.trackingStaleDays = 0;
      this.audit('批量添加轨迹', shipment.id, principal, null, shipment);
      updated.push(shipment);
    }
    return { updated };
  }

  async deleteShipment(principal: Principal, shipmentId: string): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    this.deletedShipmentIds.add(shipment.id);
    return shipment;
  }

  async getCarrierTasks(_principal: Principal): Promise<CarrierTaskSummary[]> {
    return this.carrierTasks;
  }

  async runCarrierTask(_principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    return this.executeCarrierTask(taskId, body.fail === true);
  }

  async retryCarrierTask(_principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    const task = this.carrierTask(taskId);
    if (task.status !== 'FAILED') {
      throw new BadRequestException('只有失败任务可以重试');
    }
    task.status = 'PENDING';
    task.lastError = undefined;
    task.updatedAt = new Date().toISOString();
    return this.executeCarrierTask(taskId, body.fail === true);
  }

  async createShipmentLabel(principal: Principal, shipmentId: string): Promise<LabelCreateResponse> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (shipment.status !== 'WAITING_DISPATCH') {
      throw new BadRequestException('当前状态不允许申请面单');
    }

    const existing = this.labels.find((label) => label.shipmentId === shipment.id && label.status === 'CREATED');
    if (existing) {
      return { label: existing, shipment };
    }

    const now = new Date();
    const sequence = this.labels.length + 1;
    const carrier = this.toCarrierAdapterCode(shipment.carrier);
    const labelNo = `LBL${this.formatDate(now)}${String(sequence).padStart(5, '0')}`;
    const transferNo = createMockTransferNo(carrier, now, sequence);
    const label: StoredLabel = {
      id: `lbl-${sequence}`,
      shipmentId: shipment.id,
      carrier,
      channelName: shipment.channelName,
      labelNo,
      transferNo,
      labelUrl: `/mock-labels/${labelNo}.pdf`,
      status: 'CREATED',
      createdAt: now.toISOString()
    };

    this.labels.unshift(label);
    shipment.transferNo = transferNo;
    shipment.latestTracking = '已生成面单';
    shipment.trackingStaleDays = 0;
    return { label, shipment };
  }

  async getShipmentLabels(principal: Principal, shipmentId: string): Promise<ShipmentLabelSummary[]> {
    const shipment = this.visibleShipment(principal, shipmentId);
    return this.labels.filter((label) => label.shipmentId === shipment.id);
  }

  async voidShipmentLabel(principal: Principal, shipmentId: string, labelId: string): Promise<ShipmentLabelSummary> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const label = this.labels.find((item) => item.shipmentId === shipment.id && item.id === labelId);
    if (!label) {
      throw new NotFoundException('面单不存在');
    }
    if (shipment.status !== 'WAITING_DISPATCH') {
      throw new BadRequestException('已发货运单不能作废面单');
    }
    if (label.status !== 'CREATED') {
      throw new BadRequestException('面单已作废');
    }

    label.status = 'VOIDED';
    label.voidedAt = new Date().toISOString();
    if (shipment.transferNo === label.transferNo) {
      shipment.transferNo = undefined;
      shipment.latestTracking = '面单已作废';
      shipment.trackingStaleDays = 0;
    }
    return label;
  }

  async addTrackingEvent(principal: Principal, shipmentId: string, input: TrackingEventInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    shipment.latestTracking = input.status;
    shipment.trackingStaleDays = 0;
    return shipment;
  }

  async getProblemTickets(principal: Principal): Promise<ProblemTicketSummary[]> {
    return this.tickets
      .filter((ticket) => principal.role !== 'CUSTOMER' || (ticket.customerVisible && ticket.shipmentCustomerId === principal.customerId))
      .map((ticket) => this.toTicketSummary(ticket));
  }

  async createProblemTicket(principal: Principal, shipmentId: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const ticket: Ticket = {
      id: `pt-${this.tickets.length + 1}`,
      shipmentId: shipment.id,
      shipmentCustomerId: shipment.customerId,
      systemOrderNo: shipment.systemOrderNo,
      customerName: shipment.customerName,
      reason: input.reason,
      status: 'OPEN',
      customerVisible: input.customerVisible ?? true,
      createdAt: new Date().toISOString(),
      replies: []
    };
    shipment.hasProblemTicket = true;
    if (canTransitionShipment(shipment.status, 'PROBLEM')) {
      shipment.status = 'PROBLEM';
    }
    this.tickets.unshift(ticket);
    return this.toTicketSummary(ticket);
  }

  async replyProblemTicket(principal: Principal, ticketId: string, message: string): Promise<ProblemTicketSummary> {
    const ticket = this.visibleTicket(principal, ticketId);
    ticket.replies.push({ id: `ptr-${ticket.replies.length + 1}`, author: principal.username, message, createdAt: new Date().toISOString() });
    return this.toTicketSummary(ticket);
  }

  async closeProblemTicket(principal: Principal, ticketId: string): Promise<ProblemTicketSummary> {
    const ticket = this.visibleTicket(principal, ticketId);
    ticket.status = 'CLOSED';
    ticket.closedAt = new Date().toISOString();
    const shipment = this.shipments.find((item) => item.id === ticket.shipmentId);
    if (shipment) {
      shipment.hasProblemTicket = this.tickets.some((item) => item.shipmentId === shipment.id && item.status !== 'CLOSED');
    }
    return this.toTicketSummary(ticket);
  }

  getRoles(): RoleKey[] {
    return ['ADMIN', 'CUSTOMER_SERVICE', 'OPERATOR', 'WAREHOUSE', 'FINANCE', 'CUSTOMER'];
  }

  private audit(action: string, target: string, principal: Principal, before: unknown, after: unknown) {
    void { action, target, actorId: principal.id, before, after, createdAt: new Date().toISOString() };
  }

  private visibleShipments(principal: Principal) {
    const activeShipments = this.shipments.filter((shipment) => !this.deletedShipmentIds.has(shipment.id));
    return principal.role === 'CUSTOMER'
      ? activeShipments.filter((shipment) => shipment.customerId === principal.customerId)
      : activeShipments;
  }

  private visibleShipment(principal: Principal, shipmentId: string) {
    const shipment = this.visibleShipments(principal).find((item) => item.id === shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    return shipment;
  }

  private visibleTicket(principal: Principal, ticketId: string) {
    const ticket = this.tickets.find(
      (item) => item.id === ticketId && (principal.role !== 'CUSTOMER' || (item.customerVisible && item.shipmentCustomerId === principal.customerId))
    );
    if (!ticket) {
      throw new NotFoundException('问题件不存在');
    }
    return ticket;
  }

  private ensureCarrierTask(shipment: Shipment & { customerId: string }, transferNo: string) {
    const existing = this.carrierTasks.find((task) => task.shipmentId === shipment.id && task.type === 'TRACKING_SYNC');
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const task: StoredCarrierTask = {
      id: `ct-${this.carrierTasks.length + 1}`,
      shipmentId: shipment.id,
      systemOrderNo: shipment.systemOrderNo,
      customerName: shipment.customerName,
      type: 'TRACKING_SYNC',
      carrier: this.toCarrierAdapterCode(shipment.carrier),
      transferNo,
      status: 'PENDING',
      attempts: 0,
      createdAt: now,
      updatedAt: now
    };
    this.carrierTasks.unshift(task);
    return task;
  }

  private seedCarrierTask(
    id: string,
    shipmentId: string,
    status: CarrierTaskStatus,
    attempts: number,
    transferNo: string,
    lastError?: string
  ): StoredCarrierTask {
    const shipment = this.shipments.find((item) => item.id === shipmentId);
    if (!shipment) {
      throw new NotFoundException('种子承运商任务缺少运单');
    }
    const createdAt = '2026-06-06T10:00:00.000Z';
    return {
      id,
      shipmentId,
      systemOrderNo: shipment.systemOrderNo,
      customerName: shipment.customerName,
      type: 'TRACKING_SYNC',
      carrier: this.toCarrierAdapterCode(shipment.carrier),
      transferNo,
      status,
      attempts,
      lastError,
      createdAt,
      updatedAt: status === 'FAILED' ? '2026-06-06T10:01:00.000Z' : createdAt
    };
  }

  private executeCarrierTask(taskId: string, fail: boolean): CarrierTaskRunResponse {
    const task = this.carrierTask(taskId);
    if (task.status === 'SUCCESS') {
      throw new BadRequestException('已成功任务不能重复执行');
    }
    const shipment = this.shipments.find((item) => item.id === task.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    const now = new Date().toISOString();
    task.attempts += 1;
    task.updatedAt = now;
    if (fail) {
      task.status = 'FAILED';
      task.lastError = '模拟承运商接口失败';
      return { task, shipment };
    }

    const trackingStatus = createMockTrackingStatus(task.carrier, task.transferNo);
    task.status = 'SUCCESS';
    task.lastError = undefined;
    task.completedAt = now;
    shipment.latestTracking = trackingStatus;
    shipment.trackingStaleDays = 0;
    return { task, shipment };
  }

  private carrierTask(taskId: string) {
    const task = this.carrierTasks.find((item) => item.id === taskId);
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    return task;
  }

  private toTicketSummary(ticket: Ticket): ProblemTicketSummary {
    return {
      id: ticket.id,
      shipmentId: ticket.shipmentId,
      systemOrderNo: ticket.systemOrderNo,
      customerName: ticket.customerName,
      reason: ticket.reason,
      status: ticket.status,
      customerVisible: ticket.customerVisible,
      createdAt: ticket.createdAt,
      closedAt: ticket.closedAt,
      replies: ticket.replies
    };
  }

  private toReceivableSummary(fee: StoredReceivableFee): ReceivableFeeSummary {
    return {
      id: fee.id,
      shipmentId: fee.shipmentId,
      systemOrderNo: fee.systemOrderNo,
      customerName: fee.customerName,
      name: fee.name,
      amount: fee.amount,
      settled: fee.settled
    };
  }

  private toCarrierAdapterCode(carrier: string): CarrierAdapterCode {
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

  private findCustomer(id: string): StoredCustomer {
    const customer = this.customers.find((item) => item.id === id);
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    return customer;
  }

  private customerDisplayName(customer: Pick<StoredCustomer, 'code' | 'name'>): string {
    return `${customer.code}-${customer.name}`;
  }

  private findEnabledEntity<T extends { id: string }>(rows: T[], id: string, message: string): T {
    const row = rows.find((item) => item.id === id);
    if (!row) {
      throw new BadRequestException(message);
    }
    return row;
  }

  private quoteFromRules(input: PricingRuleQuoteRequest): PricingRuleQuoteResponse {
    try {
      return quoteWithPricingRules({
        ...input,
        rules: this.pricingRules,
        fuelRates: this.fuelRates,
        surcharges: this.surcharges,
        exchangeRates: this.exchangeRates
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

  private ensureAdmin(principal: Principal, message = '只有管理员可以操作') {
    if (principal.role !== 'ADMIN') {
      throw new ForbiddenException(message);
    }
  }

  private ensureWarehouseAccess(principal: Principal) {
    if (principal.role !== 'ADMIN' && principal.role !== 'WAREHOUSE') {
      throw new ForbiddenException('没有仓库管理权限');
    }
  }

  private normalizePriceBookRow(priceBookId: string, row: PriceBookImportInput['rows'][number], index: number): StoredPriceBookRow {
    if (!row.agentName?.trim() || !row.channelName?.trim() || !row.destinationCountry?.trim() || row.maxWeightKg <= row.minWeightKg || row.costPerKg <= 0) {
      throw new BadRequestException(`第 ${index + 1} 行报价数据不完整`);
    }
    return {
      id: `pbr-${Date.now()}-${index + 1}`,
      priceBookId,
      agentName: row.agentName.trim(),
      carrierName: row.carrierName?.trim() || undefined,
      sourceSheetName: row.sourceSheetName?.trim() || undefined,
      channelName: row.channelName.trim(),
      businessRouteName: row.businessRouteName?.trim() || undefined,
      realChannelName: row.realChannelName?.trim() || row.channelName.trim(),
      warehouseCode: row.warehouseCode?.trim() || undefined,
      destinationCountry: row.destinationCountry.trim(),
      minWeightKg: roundMoney(row.minWeightKg),
      maxWeightKg: roundMoney(row.maxWeightKg),
      costPerKg: roundMoney(row.costPerKg),
      currency: row.currency?.trim().toUpperCase() || 'CNY',
      transitDays: row.transitDays,
      transitLabel: row.transitLabel?.trim() || undefined,
      quoteSourceType: row.quoteSourceType ?? 'local',
      surchargeFee: typeof row.surchargeFee === 'number' ? roundMoney(row.surchargeFee) : undefined,
      surchargeDetails: row.surchargeDetails ?? []
    };
  }

  private toPriceBookSummary(book: StoredPriceBook): PriceBookSummary {
    return {
      id: book.id,
      fileName: book.fileName,
      rowCount: book.rowCount,
      importedAt: book.importedAt,
      remark: book.remark
    };
  }

  private channelSummary(channel: ChannelSummary & { carrier?: string }): ChannelSummary {
    return {
      id: channel.id,
      name: channel.name,
      carrierId: channel.carrierId,
      carrierName: channel.carrierName,
      enabled: channel.enabled
    };
  }

  private slug(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(Date.now());
  }

  private formatDate(date: Date): string {
    const year = String(date.getUTCFullYear()).slice(-2);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private nextWarehouseConsolidationNo(packages: WarehousePackageSummary[], mode: WarehouseConsolidationCreateInput['mode']): string {
    const first = packages[0];
    const prefix = mode === 'MERGE_AND_SHIP' ? 'OUT' : 'MERGE';
    const count = this.warehouseConsolidations.filter((item) => item.consolidationNo.startsWith(`${first.customerOrderNo}-${prefix}`)).length + 1;
    return `${first.customerOrderNo}-${prefix}${String(count).padStart(3, '0')}`;
  }

  private seedShipment(
    id: string,
    customerId: string,
    customerOrderNo: string,
    systemOrderNo: string,
    status: ShipmentStatus,
    channelName: string,
    agentName: string,
    overrides: Partial<Shipment> = {}
  ): Shipment & { customerId: string; channelId?: string; agentId?: string } {
    const customer = this.customers.find((item) => item.id === customerId)!;
    const channel = this.channels.find((item) => item.name === channelName);
    const agent = this.agents.find((item) => item.name === agentName);
    return {
      id,
      customerId,
      channelId: channel?.id,
      agentId: agent?.id,
      createdAt: '2026-06-06T09:40:00.000Z',
      customerName: `${customer.code}-${customer.name}`,
      customerOrderNo,
      systemOrderNo,
      businessType: 'EXPRESS',
      packageType: 'WPX',
      destinationCountry: '美国',
      carrier: channel?.carrier ?? '',
      packageCount: 1,
      receivableWeightKg: 18,
      agentWeightKg: 18,
      latestTracking: '客户已预报',
      trackingStaleDays: 0,
      isRemoteArea: false,
      status,
      channelName,
      agentName,
      hasProblemTicket: false,
      ...overrides
    };
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeWarehousePackage(pkg: Omit<WarehousePackageSummary, 'status' | 'createdAt' | 'chargeableWeightKg' | 'roundingRule' | 'divisor' | 'exceptions'>): WarehousePackageSummary {
  return {
    ...pkg,
    chargeableWeightKg: roundMoney(Math.max(pkg.weightKg, pkg.volumetricWeightKg)),
    divisor: 6000,
    roundingRule: 'NONE',
    status: 'RECEIVED',
    exceptions: pkg.expectedTotalPackageCount ? ['部分到仓'] : [],
    createdAt: pkg.scanTime ?? new Date().toISOString()
  };
}

function summarizeWarehousePackageGroups(packages: WarehousePackageSummary[]): WarehousePackageGroupSummary[] {
  const groups = new Map<string, WarehousePackageSummary[]>();
  for (const pkg of packages) {
    const key = pkg.customerOrderNo;
    groups.set(key, [...(groups.get(key) ?? []), pkg]);
  }
  return Array.from(groups.values()).map((items) => {
    const first = items[0];
    const expected = Math.max(...items.map((item) => item.expectedTotalPackageCount ?? items.length));
    const maxByVolume = items.reduce((best, item) => (item.volumetricWeightKg > best.volumetricWeightKg ? item : best), first);
    return {
      id: first.customerOrderNo,
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

function createBackendPriceLookup(
  principal: Principal,
  input: PriceLookupRequest,
  priceRows: PriceBookRowSummary[],
  priceBooks: Array<Pick<PriceBookSummary, 'id' | 'remark'> & { deleted?: boolean }>,
  persistedMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules
): PriceLookupResponse {
  const destinationCountry = input.destinationCountry?.trim();
  const chargeableWeightKg = Number(input.chargeableWeightKg);
  if (!destinationCountry || !Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) {
    throw new BadRequestException('目的地和计费重不能为空');
  }

  const warehouseProfile = createWarehouseLookupProfile(input);
  const priceBookRemarkMap = new Map(priceBooks.filter((book) => !book.deleted).map((book) => [book.id, book.remark?.trim() || undefined]));
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
      const visiblePrice = isAdmin ? { ...price } : omitInternalPriceFields(price);
      return {
        price: visiblePrice,
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
  const fastestRecommendations = [...recommendations].sort((left, right) => (matchedTransitDays(left) - matchedTransitDays(right)) || left.totalSales - right.totalSales).slice(0, 3);
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

function findBestMarkupRule(markupRules: AgentMarkupSummary[], price: PriceBookRowSummary): AgentMarkupSummary | undefined {
  const destination = price.destinationCountry.trim();
  const channel = price.channelName.trim();
  const realChannel = price.realChannelName?.trim() || price.channelName.trim();
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

import type {
  AgentCreateInput,
  AgentMarkupCreateInput,
  AgentMarkupSummary,
  AgentMarkupUpdateInput,
  AgentSummary,
  AgentUpdateInput,
  CustomerStatementCreateInput,
  CustomerStatementSummary,
  CustomerAccountSummary,
  CarrierCreateInput,
  CarrierSummary,
  CarrierTaskRunResponse,
  CarrierTaskSummary,
  AccountLedgerSummary,
  ChannelCreateInput,
  ChannelSummary,
  CustomerContactCreateInput,
  CustomerContactSummary,
  CustomerCreateInput,
  CustomerSummary,
  CustomerUpdateInput,
  CustomerUserCreateInput,
  CustomerUserSummary,
  EnabledUpdateInput,
  ExchangeRateCreateInput,
  ExchangeRateSummary,
  FuelRateCreateInput,
  FuelRateSummary,
  LabelCreateResponse,
  MasterDataSnapshot,
  PaymentCreateInput,
  PaymentCreateResponse,
  PriceBookImportInput,
  PriceBookRemarkUpdateInput,
  PriceBookRowSummary,
  PriceBooksResponse,
  PriceBookSummary,
  PriceLookupRequest,
  PriceLookupResponse,
  PricingQuoteRequest,
  PricingRuleCreateInput,
  PricingRuleQuoteRequest,
  PricingRuleQuoteResponse,
  PricingRuleSummary,
  ProblemTicketCreateInput,
  ProblemTicketSummary,
  QuoteResponse,
  ReceivableAdjustmentInput,
  ReceivableFeeSummary,
  SurchargeCreateInput,
  SurchargeSummary,
  BulkTrackingApplyRequest,
  BulkTrackingApplyResponse,
  Shipment,
  ShipmentCreateInput,
  ShipmentLabelSummary,
  ShipmentOperationalUpdateInput,
  ShipmentPaymentUpdateInput,
  TrackingEventInput,
  WarehouseConsolidationCreateInput,
  WarehouseConsolidationSummary,
  WarehousePackageGroupSummary,
  WarehousePackageSummary
} from '@siyuan/shared';

export type RoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type PermissionKey =
  | 'workspace:access'
  | 'orders:read'
  | 'orders:write'
  | 'routing:read'
  | 'routing:write'
  | 'warehouse:read'
  | 'warehouse:write'
  | 'tracking:read'
  | 'tracking:write'
  | 'problems:read'
  | 'problems:write'
  | 'pricing:lookup'
  | 'pricing:manage'
  | 'finance:read'
  | 'finance:settle'
  | 'master-data:read'
  | 'master-data:write'
  | 'reports:read'
  | 'system:manage';

export interface Principal {
  id: string;
  username: string;
  role: RoleKey;
  customerId?: string;
}

export interface Session {
  accessToken: string;
  user: Principal;
  permissions: PermissionKey[];
}

export interface PermissionDefinition {
  code: PermissionKey;
  label: string;
  group: string;
}

export interface RolePermissionRow {
  key: RoleKey;
  label: string;
  account: string;
  scope: string;
  permissions: PermissionKey[];
  restriction: string;
}

export interface RolePermissionMatrix {
  availablePermissions: PermissionDefinition[];
  roles: RolePermissionRow[];
}

export interface LoginLogSummary {
  id: string;
  username: string;
  ip: string;
  region: string;
  userAgent?: string;
  createdAt: string;
}

export interface AiAssistResponse {
  provider: 'siliconflow';
  mode: 'live' | 'mock';
  model: string;
  content: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

export class ApiClient {
  constructor(
    private readonly getToken: () => string | null,
    private readonly onUnauthorized: () => void
  ) {}

  async login(username: string, password: string): Promise<Session> {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }, false);
  }

  async loginLogs(): Promise<LoginLogSummary[]> {
    return this.request('/auth/login-logs');
  }

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<{ ok: true }> {
    return this.request('/auth/change-password', { method: 'POST', body: JSON.stringify(input) });
  }

  async shipments(): Promise<Shipment[]> {
    return this.request('/shipments');
  }

  async createShipment(input: ShipmentCreateInput): Promise<Shipment> {
    return this.request('/shipments', { method: 'POST', body: JSON.stringify(input) });
  }

  async receiveShipment(id: string): Promise<Shipment> {
    return this.request(`/shipments/${id}/receive`, { method: 'POST' });
  }

  async routeShipment(id: string, body: { channelId?: string; agentId?: string }): Promise<Shipment> {
    return this.request(`/shipments/${id}/route`, { method: 'POST', body: JSON.stringify(body) });
  }

  async dispatchShipment(id: string, body: { transferNo?: string }): Promise<Shipment> {
    return this.request(`/shipments/${id}/dispatch`, { method: 'POST', body: JSON.stringify(body) });
  }

  async deleteShipment(id: string): Promise<Shipment> {
    return this.request(`/shipments/${id}`, { method: 'DELETE' });
  }

  async updateShipmentOperational(id: string, input: ShipmentOperationalUpdateInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/operational`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async registerShipmentPayment(id: string, input: ShipmentPaymentUpdateInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/payment`, { method: 'POST', body: JSON.stringify(input) });
  }

  async importTrackingEvents(input: BulkTrackingApplyRequest): Promise<BulkTrackingApplyResponse> {
    return this.request('/shipments/tracking-events/import', { method: 'POST', body: JSON.stringify(input) });
  }

  async createShipmentLabel(id: string): Promise<LabelCreateResponse> {
    return this.request(`/shipments/${id}/labels`, { method: 'POST' });
  }

  async shipmentLabels(id: string): Promise<ShipmentLabelSummary[]> {
    return this.request(`/shipments/${id}/labels`);
  }

  async voidShipmentLabel(id: string, labelId: string): Promise<ShipmentLabelSummary> {
    return this.request(`/shipments/${id}/labels/${labelId}/void`, { method: 'POST' });
  }

  async addTrackingEvent(id: string, input: TrackingEventInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/tracking-events`, { method: 'POST', body: JSON.stringify(input) });
  }

  async carrierTasks(): Promise<CarrierTaskSummary[]> {
    return this.request('/carrier-tasks');
  }

  async runCarrierTask(id: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    return this.request(`/carrier-tasks/${id}/run`, { method: 'POST', body: JSON.stringify(body) });
  }

  async retryCarrierTask(id: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    return this.request(`/carrier-tasks/${id}/retry`, { method: 'POST', body: JSON.stringify(body) });
  }

  async problemTickets(): Promise<ProblemTicketSummary[]> {
    return this.request('/problem-tickets');
  }

  async createProblemTicket(id: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    return this.request(`/shipments/${id}/problem-tickets`, { method: 'POST', body: JSON.stringify(input) });
  }

  async quote(input: PricingQuoteRequest): Promise<QuoteResponse> {
    return this.request('/pricing/quote', { method: 'POST', body: JSON.stringify(input) });
  }

  async pricingRules(): Promise<PricingRuleSummary[]> {
    return this.request('/pricing/rules');
  }

  async createPricingRule(input: PricingRuleCreateInput): Promise<PricingRuleSummary> {
    return this.request('/pricing/rules', { method: 'POST', body: JSON.stringify(input) });
  }

  async updatePricingRuleEnabled(id: string, input: EnabledUpdateInput): Promise<PricingRuleSummary> {
    return this.request(`/pricing/rules/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async quotePricingRule(input: PricingRuleQuoteRequest): Promise<PricingRuleQuoteResponse> {
    return this.request('/pricing/rules/quote', { method: 'POST', body: JSON.stringify(input) });
  }

  async priceBooks(): Promise<PriceBooksResponse> {
    return this.request('/pricing/books');
  }

  async importPriceBook(input: PriceBookImportInput): Promise<{ book: PriceBookSummary; rows: PriceBookRowSummary[] }> {
    return this.request('/pricing/books/import', { method: 'POST', body: JSON.stringify(input) });
  }

  async updatePriceBookRemark(id: string, input: PriceBookRemarkUpdateInput): Promise<PriceBookSummary> {
    return this.request(`/pricing/books/${id}/remark`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deletePriceBook(id: string): Promise<PriceBookSummary> {
    return this.request(`/pricing/books/${id}`, { method: 'DELETE' });
  }

  async lookupPrice(input: PriceLookupRequest): Promise<PriceLookupResponse> {
    return this.request('/pricing/lookup', { method: 'POST', body: JSON.stringify(input) });
  }

  async agentMarkupRules(): Promise<AgentMarkupSummary[]> {
    return this.request('/pricing/markup-rules');
  }

  async createAgentMarkupRule(input: AgentMarkupCreateInput): Promise<AgentMarkupSummary> {
    return this.request('/pricing/markup-rules', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateAgentMarkupRule(id: string, input: AgentMarkupUpdateInput): Promise<AgentMarkupSummary> {
    return this.request(`/pricing/markup-rules/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteAgentMarkupRule(id: string): Promise<AgentMarkupSummary> {
    return this.request(`/pricing/markup-rules/${id}`, { method: 'DELETE' });
  }

  async warehousePackages(): Promise<WarehousePackageSummary[]> {
    return this.request('/warehouse/packages');
  }

  async warehousePackageGroups(): Promise<WarehousePackageGroupSummary[]> {
    return this.request('/warehouse/package-groups');
  }

  async syncWarehouseMockPackages(): Promise<WarehousePackageSummary[]> {
    return this.request('/warehouse/packages/sync-mock', { method: 'POST' });
  }

  async createWarehouseConsolidation(input: WarehouseConsolidationCreateInput): Promise<WarehouseConsolidationSummary> {
    return this.request('/warehouse/consolidations', { method: 'POST', body: JSON.stringify(input) });
  }

  async createWarehouseConsolidationShipment(id: string): Promise<WarehouseConsolidationSummary> {
    return this.request(`/warehouse/consolidations/${id}/create-shipment`, { method: 'POST' });
  }

  async warehouseConsolidationItems(id: string): Promise<WarehousePackageSummary[]> {
    return this.request(`/warehouse/consolidations/${id}/items`);
  }

  async receivables(): Promise<ReceivableFeeSummary[]> {
    return this.request('/finance/receivables');
  }

  async addReceivableAdjustment(id: string, input: ReceivableAdjustmentInput): Promise<ReceivableFeeSummary> {
    return this.request(`/shipments/${id}/receivable-adjustments`, { method: 'POST', body: JSON.stringify(input) });
  }

  async customerStatements(): Promise<CustomerStatementSummary[]> {
    return this.request('/finance/customer-statements');
  }

  async createCustomerStatement(input: CustomerStatementCreateInput): Promise<CustomerStatementSummary> {
    return this.request('/finance/customer-statements', { method: 'POST', body: JSON.stringify(input) });
  }

  async customerAccounts(): Promise<CustomerAccountSummary[]> {
    return this.request('/finance/customer-accounts');
  }

  async accountLedger(): Promise<AccountLedgerSummary[]> {
    return this.request('/finance/account-ledger');
  }

  async createPayment(input: PaymentCreateInput): Promise<PaymentCreateResponse> {
    return this.request('/finance/payments', { method: 'POST', body: JSON.stringify(input) });
  }

  async masterData(): Promise<MasterDataSnapshot> {
    return this.request('/master-data');
  }

  async createCustomer(input: CustomerCreateInput): Promise<CustomerSummary> {
    return this.request('/master-data/customers', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateCustomer(id: string, input: CustomerUpdateInput): Promise<CustomerSummary> {
    return this.request(`/master-data/customers/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createCustomerContact(customerId: string, input: CustomerContactCreateInput): Promise<CustomerContactSummary> {
    return this.request(`/master-data/customers/${customerId}/contacts`, { method: 'POST', body: JSON.stringify(input) });
  }

  async createCustomerUser(customerId: string, input: CustomerUserCreateInput): Promise<CustomerUserSummary> {
    return this.request(`/master-data/customers/${customerId}/users`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateCustomerEnabled(id: string, input: EnabledUpdateInput): Promise<CustomerSummary> {
    return this.request(`/master-data/customers/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createAgent(input: AgentCreateInput): Promise<AgentSummary> {
    return this.request('/master-data/agents', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateAgent(id: string, input: AgentUpdateInput): Promise<AgentSummary> {
    return this.request(`/master-data/agents/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateAgentEnabled(id: string, input: EnabledUpdateInput): Promise<AgentSummary> {
    return this.request(`/master-data/agents/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createCarrier(input: CarrierCreateInput): Promise<CarrierSummary> {
    return this.request('/master-data/carriers', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateCarrierEnabled(id: string, input: EnabledUpdateInput): Promise<CarrierSummary> {
    return this.request(`/master-data/carriers/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createChannel(input: ChannelCreateInput): Promise<ChannelSummary> {
    return this.request('/master-data/channels', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateChannelEnabled(id: string, input: EnabledUpdateInput): Promise<ChannelSummary> {
    return this.request(`/master-data/channels/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createSurcharge(input: SurchargeCreateInput): Promise<SurchargeSummary> {
    return this.request('/master-data/surcharges', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateSurchargeEnabled(id: string, input: EnabledUpdateInput): Promise<SurchargeSummary> {
    return this.request(`/master-data/surcharges/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createFuelRate(input: FuelRateCreateInput): Promise<FuelRateSummary> {
    return this.request('/master-data/fuel-rates', { method: 'POST', body: JSON.stringify(input) });
  }

  async createExchangeRate(input: ExchangeRateCreateInput): Promise<ExchangeRateSummary> {
    return this.request('/master-data/exchange-rates', { method: 'POST', body: JSON.stringify(input) });
  }

  async rolePermissions(): Promise<RolePermissionMatrix> {
    return this.request('/system/roles');
  }

  async updateRolePermissions(role: RoleKey, permissions: PermissionKey[]): Promise<RolePermissionRow> {
    return this.request(`/system/roles/${role}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) });
  }

  async aiAssist(input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }): Promise<AiAssistResponse> {
    return this.request('/ai/assist', { method: 'POST', body: JSON.stringify(input) });
  }

  private async request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) };
    const token = this.getToken();
    if (authenticated && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error('Unauthorized');
    }
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json() as Promise<T>;
  }
}

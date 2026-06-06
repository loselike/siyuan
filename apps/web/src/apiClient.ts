import type {
  AgentCreateInput,
  AgentSummary,
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
  Shipment,
  ShipmentCreateInput,
  ShipmentLabelSummary,
  TrackingEventInput
} from '@siyuan/shared';

export type RoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'FINANCE' | 'CUSTOMER';
export type PermissionKey =
  | 'shipments:read'
  | 'shipments:write'
  | 'finance:read'
  | 'finance:settle'
  | 'master-data:read'
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

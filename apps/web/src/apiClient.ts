import type {
  CustomerStatementCreateInput,
  CustomerStatementSummary,
  LabelCreateResponse,
  PricingQuoteRequest,
  ProblemTicketCreateInput,
  ProblemTicketSummary,
  QuoteResponse,
  ReceivableAdjustmentInput,
  ReceivableFeeSummary,
  Shipment,
  ShipmentCreateInput,
  ShipmentLabelSummary,
  TrackingEventInput
} from '@siyuan/shared';

export type RoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'FINANCE' | 'CUSTOMER';

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

  async problemTickets(): Promise<ProblemTicketSummary[]> {
    return this.request('/problem-tickets');
  }

  async createProblemTicket(id: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    return this.request(`/shipments/${id}/problem-tickets`, { method: 'POST', body: JSON.stringify(input) });
  }

  async quote(input: PricingQuoteRequest): Promise<QuoteResponse> {
    return this.request('/pricing/quote', { method: 'POST', body: JSON.stringify(input) });
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

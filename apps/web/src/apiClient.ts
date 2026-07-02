import type {
  AgentCreateInput,
  AgentChannelCreateInput,
  AgentChannelSummary,
  AgentChannelUpdateInput,
  AgentMarkupCreateInput,
  AgentMarkupSummary,
  AgentMarkupUpdateInput,
  AgentSummary,
  AgentUpdateInput,
  AuditLogListResponse,
  AuditLogQuery,
  CustomerStatementCreateInput,
  CustomerStatementSummary,
  CustomerAccountSummary,
  CarrierCreateInput,
  CarrierSummary,
  CarrierTaskRunResponse,
  CarrierTaskSummary,
  AccountLedgerSummary,
  ChannelCreateInput,
  ChannelCategoryCreateInput,
  ChannelCategorySummary,
  ChannelCategoryUpdateInput,
  ChannelSummary,
  ChannelUpdateInput,
  CustomerContactCreateInput,
  CustomerContactSummary,
  CustomerContactUpdateInput,
  CustomerCreateInput,
  CustomerSummary,
  CustomerUpdateInput,
  CustomerUserCreateInput,
  CustomerUserSummary,
  EnabledUpdateInput,
  ExchangeRateCreateInput,
  ExchangeRateSummary,
  ExchangeRateUpdateInput,
  FinanceCatalogItemInput,
  FinanceCatalogItemSummary,
  FinanceCatalogListQuery,
  FinanceCatalogListResponse,
  FinanceCatalogReorderInput,
  FinanceDashboardResponse,
  FuelRateCreateInput,
  FuelRateSummary,
  LabelCreateResponse,
  MasterDataSnapshot,
  OrderEntryCreateInput,
  OrderEntryDetailSummary,
  OrderEntryDraftUpdateInput,
  PaymentCreateInput,
  PaymentCreateResponse,
  PaymentApplicationCancelInput,
  PaymentApplicationCreateInput,
  PaymentApplicationExportRequest,
  PaymentApplicationExportResponse,
  PaymentApplicationSummary,
  PaymentApplicationUpdateInput,
  PaidPaymentExportRequest,
  PaidPaymentExportResponse,
  PaidPaymentListQuery,
  PaidPaymentListResponse,
  PaidPaymentReverseInput,
  PaidPaymentUpdateInput,
  PaymentConfirmPaidInput,
  PaymentWaterReceiptInput,
  PayableAuditBatchInput,
  PayableAuditCreateInput,
  PayableAuditExportRequest,
  PayableAuditExportResponse,
  PayableAuditShipmentMatchInput,
  PayableAuditShipmentMatchSummary,
  PayableAuditSummary,
  PayableAuditUpdateInput,
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
  ReceivableAuditBatchInput,
  ReceivableAuditBatchResult,
  ReceivableAuditCreateInput,
  ReceivableAuditExportRequest,
  ReceivableAuditExportResponse,
  ReceivableAuditListQuery,
  ReceivableAuditListResponse,
  ReceivableReceiptMatchInput,
  ReceivableAuditSummary,
  ReceivableAuditUpdateInput,
  ReceivableAdjustmentInput,
  ReceivableFeeSummary,
  WaterReceiptCreateInput,
  WaterReceiptExportRequest,
  WaterReceiptExportResponse,
  WaterReceiptListQuery,
  WaterReceiptListResponse,
  WaterReceiptMarkArrivedInput,
  WaterReceiptMatchOrdersInput,
  WaterReceiptUnmatchInput,
  WaterReceiptUpdateInput,
  WaterReceiptVoucherInput,
  WaterReceiptVoucherSummary,
  BusinessCostAuditBatchInput,
  BusinessCostAuditBatchResult,
  BusinessCostAuditCreateInput,
  BusinessCostAuditExportRequest,
  BusinessCostAuditExportResponse,
  BusinessCostAuditListQuery,
  BusinessCostAuditListResponse,
  BusinessCostAuditSummary,
  BusinessCostAuditUpdateInput,
  AgentBankAccountInput,
  AgentBankAccountSummary,
  PayableAuditBatchResult,
  PayableAuditListQuery,
  PayableAuditListResponse,
  PayeeBankAccountInput,
  PayeeBankAccountSummary,
  PendingPaymentListQuery,
  PendingPaymentListResponse,
  PaymentVoucherArchiveInput,
  PaymentVoucherInput,
  PaymentVoucherDifferenceInput,
  PaymentVoucherListQuery,
  PaymentVoucherSummary,
  VoucherImageUploadInput,
  VoucherImageUploadResponse,
  SurchargeCreateInput,
  SurchargeSummary,
  SiteCreateInput,
  SiteSummary,
  SiteUpdateInput,
  StaffGender,
  StaffAccountCreateInput,
  StaffAccountPasswordResetInput,
  StaffAccountPasswordResetResult,
  StaffAccountQuery,
  StaffAccountSummary,
  StaffAccountUpdateInput,
  BulkTrackingApplyRequest,
  BulkTrackingApplyResponse,
  Shipment,
  ShipmentCreateInput,
  ShipmentFinanceDetailSummary,
  ShipmentFinanceItemCreateInput,
  ShipmentRerouteInput,
  ShipmentRouteInput,
  BusinessCostFeeSummary,
  PayableFeeSummary,
  ShipmentFinanceItemUpdateInput,
  ShipmentRestoreInput,
  ShipmentReviewDeleteInput,
  ShipmentReviewDetailSummary,
  ShipmentReviewRejectInput,
  ShipmentLabelSummary,
  ShipmentOperationalUpdateInput,
  ShipmentPaymentUpdateInput,
  TrackingEventInput,
  WarehouseConsolidationCreateInput,
  WarehouseConsolidationSummary,
  WarehouseInStockQuery,
  WarehouseInStockResponse,
  WarehousePackageCreateInput,
  WarehousePackageGroupSummary,
  WarehousePackageSplitInput,
  WarehousePackageSplitResponse,
  WarehousePackageSummary,
  WarehouseTallyTaskCompleteInput,
  WarehouseTallyTaskCreateInput,
  WarehouseTallyTaskListQuery,
  WarehouseTallyTaskSummary,
  WarehouseTallyTaskUpdateInput,
  WarehouseTodayQuery,
  WarehouseTodayResponse
} from '@siyuan/shared';

export type BuiltinRoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type RoleKey = BuiltinRoleKey | (string & {});
export type PermissionKey =
  | 'workspace:access'
  | 'orders:read'
  | 'orders:write'
  | 'orders:review:restore'
  | 'orders:review:purge'
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
  | 'finance:business-cost:read'
  | 'finance:business-cost:manage'
  | 'finance:business-cost:audit'
  | 'finance:business-cost:reverse'
  | 'finance:business-cost:void'
  | 'finance:business-cost:export'
  | 'finance:business-cost:view-all'
  | 'finance:business-cost:view-agent'
  | 'finance:business-cost:view-profit'
  | 'finance:order-fee:payable:view'
  | 'finance:order-fee:payable:manage'
  | 'finance:order-fee:profit:receivable-payable'
  | 'finance:order-fee:profit:receivable-business'
  | 'finance:order-fee:profit:business-payable'
  | 'finance:payable:read'
  | 'finance:payable:manage'
  | 'finance:payable:audit'
  | 'finance:payable:reverse'
  | 'finance:payable:void'
  | 'finance:payable:export'
  | 'finance:payable:payment'
  | 'finance:payable:bank'
  | 'finance:payable:attachment'
  | 'finance:payable:view-sensitive'
  | 'finance:payable:view-profit'
  | 'finance:payable:paid-read'
  | 'finance:payable:paid-confirm'
  | 'finance:payable:paid-reverse'
  | 'finance:payable:paid-export'
  | 'finance:payable:paid-voucher'
  | 'finance:payable:paid-bank-view'
  | 'finance:water-receipt:read'
  | 'finance:water-receipt:manage'
  | 'finance:water-receipt:arrive'
  | 'finance:water-receipt:match'
  | 'finance:water-receipt:adjust'
  | 'finance:water-receipt:void'
  | 'finance:water-receipt:archive'
  | 'finance:water-receipt:export'
  | 'finance:water-receipt:voucher'
  | 'finance:water-receipt:view-all'
  | 'master-data:read'
  | 'master-data:write'
  | 'master-data:agents:read'
  | 'master-data:agents:write'
  | 'master-data:channels:read'
  | 'master-data:channels:write'
  | 'reports:read'
  | 'system:manage';

export interface Principal {
  id: string;
  username: string;
  role: RoleKey;
  customerId?: string;
  name?: string;
  phone?: string;
  gender?: StaffGender;
  nickname?: string;
  mustChangePassword?: boolean;
}

export interface ProfileUpdateInput {
  name?: string;
  phone?: string;
  gender?: StaffGender;
  nickname?: string;
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
  description?: string;
  site?: string;
  sortOrder?: number;
  enabled?: boolean;
  systemBuiltin?: boolean;
}

export interface RolePermissionMatrix {
  availablePermissions: PermissionDefinition[];
  roles: RolePermissionRow[];
}

export interface RoleGroupInput {
  label: string;
  description?: string;
  site?: string;
  sortOrder?: number;
  enabled?: boolean;
  templateRole?: RoleKey;
}

export interface LoginLogSummary {
  id: string;
  username: string;
  ip: string;
  region: string;
  userAgent?: string;
  createdAt: string;
}

export interface CaptchaChallenge {
  captchaId: string;
  image: string;
}

export interface AiAssistResponse {
  provider: 'siliconflow';
  mode: 'live' | 'mock';
  model: string;
  content: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

function formatApiErrorMessage(body: string, status: number): string {
  if (!body) {
    if (status === 401) {
      return '用户名或密码错误';
    }
    return `请求失败，状态码 ${status}`;
  }

  try {
    const payload = JSON.parse(body) as { message?: unknown; error?: unknown; statusCode?: unknown };
    const message = Array.isArray(payload.message)
      ? payload.message.join('；')
      : typeof payload.message === 'string'
        ? payload.message
        : undefined;
    const fallback = typeof payload.error === 'string' ? payload.error : undefined;
    return message ?? fallback ?? `请求失败，状态码 ${payload.statusCode ?? status}`;
  } catch {
    if (status === 401) {
      return '用户名或密码错误';
    }
    return body;
  }
}

export class ApiClient {
  constructor(
    private readonly getToken: () => string | null,
    private readonly onUnauthorized: () => void
  ) {}

  async captcha(): Promise<CaptchaChallenge> {
    return this.request('/auth/captcha', { method: 'GET' }, false);
  }

  async login(username: string, password: string, captchaId?: string, captchaCode?: string): Promise<Session> {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password, captchaId, captchaCode }) }, false);
  }

  async loginLogs(): Promise<LoginLogSummary[]> {
    return this.request('/auth/login-logs');
  }

  async me(): Promise<Principal> {
    return this.request('/auth/me');
  }

  async updateProfile(input: ProfileUpdateInput): Promise<Principal> {
    return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(input) });
  }

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<{ ok: true }> {
    return this.request('/auth/change-password', { method: 'POST', body: JSON.stringify(input) });
  }

  async shipments(): Promise<Shipment[]> {
    return this.request('/shipments');
  }

  async reviewPendingShipments(): Promise<Shipment[]> {
    return this.request('/shipments/review-pending');
  }

  async reviewDeletedShipments(): Promise<Shipment[]> {
    return this.request('/shipments/review-deleted');
  }

  async shipmentReviewDetail(id: string): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/review-detail`);
  }

  async approveShipmentReview(id: string): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/review/approve`, { method: 'POST' });
  }

  async rejectShipmentReview(id: string, input: ShipmentReviewRejectInput): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/review/reject`, { method: 'POST', body: JSON.stringify(input) });
  }

  async deleteShipmentReview(id: string, input: ShipmentReviewDeleteInput): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/review`, { method: 'DELETE', body: JSON.stringify(input) });
  }

  async restoreShipment(id: string, input: ShipmentRestoreInput): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/restore`, { method: 'POST', body: JSON.stringify(input) });
  }

  async permanentlyDeleteShipmentReview(id: string): Promise<{ id: string; deleted: true }> {
    return this.request(`/shipments/${id}/review/permanent`, { method: 'DELETE' });
  }

  async createShipment(input: ShipmentCreateInput): Promise<Shipment> {
    return this.request('/shipments', { method: 'POST', body: JSON.stringify(input) });
  }

  async orderEntryPackages(): Promise<WarehousePackageSummary[]> {
    return this.request('/shipments/order-entry/packages');
  }

  async createOrderEntry(input: OrderEntryCreateInput): Promise<OrderEntryDetailSummary> {
    return this.request('/shipments/order-entry', { method: 'POST', body: JSON.stringify(input) });
  }

  async orderEntryDetail(id: string): Promise<OrderEntryDetailSummary> {
    return this.request(`/shipments/${id}/order-entry`);
  }

  async updateOrderEntryDraft(id: string, input: OrderEntryDraftUpdateInput): Promise<OrderEntryDetailSummary> {
    return this.request(`/shipments/${id}/order-entry-draft`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async receiveShipment(id: string): Promise<Shipment> {
    return this.request(`/shipments/${id}/receive`, { method: 'POST' });
  }

  async routeShipment(id: string, body: ShipmentRouteInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/route`, { method: 'POST', body: JSON.stringify(body) });
  }

  async rerouteShipment(id: string, body: ShipmentRerouteInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/reroute`, { method: 'POST', body: JSON.stringify(body) });
  }

  async dispatchShipment(id: string, body: { transferNo?: string }): Promise<Shipment> {
    return this.request(`/shipments/${id}/dispatch`, { method: 'POST', body: JSON.stringify(body) });
  }

  async approveShipmentBusinessData(id: string, body: { remark?: string } = {}): Promise<Shipment> {
    return this.request(`/shipments/${id}/business-data/approve`, { method: 'POST', body: JSON.stringify(body) });
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

  async uploadShipmentLabel(id: string, input: { file: File; transferNo?: string }): Promise<LabelCreateResponse> {
    const body = new FormData();
    body.append('file', input.file);
    if (input.transferNo) body.append('transferNo', input.transferNo);
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/shipments/${id}/labels/upload`, { method: 'POST', body, headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) {
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    return response.json() as Promise<LabelCreateResponse>;
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

  async replyProblemTicket(id: string, message: string): Promise<ProblemTicketSummary> {
    return this.request(`/problem-tickets/${id}/replies`, { method: 'POST', body: JSON.stringify({ message }) });
  }

  async closeProblemTicket(id: string): Promise<ProblemTicketSummary> {
    return this.request(`/problem-tickets/${id}/close`, { method: 'POST' });
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

  async warehouseTodayReceipts(query: WarehouseTodayQuery = {}): Promise<WarehouseTodayResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/today-receipts${search ? `?${search}` : ''}`);
  }

  async warehouseInStock(query: WarehouseInStockQuery = {}): Promise<WarehouseInStockResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/in-stock${search ? `?${search}` : ''}`);
  }

  async warehousePackageGroups(): Promise<WarehousePackageGroupSummary[]> {
    return this.request('/warehouse/package-groups');
  }

  async createWarehousePackage(input: WarehousePackageCreateInput): Promise<WarehousePackageSummary> {
    return this.request('/warehouse/packages', { method: 'POST', body: JSON.stringify(input) });
  }

  async splitWarehousePackage(id: string, input: WarehousePackageSplitInput): Promise<WarehousePackageSplitResponse> {
    return this.request(`/warehouse/packages/${id}/split`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateWarehousePackageRemark(id: string, input: { remark?: string }): Promise<WarehousePackageSummary> {
    return this.request(`/warehouse/packages/${id}/remark`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateWarehousePackageException(id: string, input: { manualException?: string }): Promise<WarehousePackageSummary> {
    return this.request(`/warehouse/packages/${id}/exception`, { method: 'PATCH', body: JSON.stringify(input) });
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

  async warehouseTallyTasks(query: WarehouseTallyTaskListQuery = {}): Promise<WarehouseTallyTaskSummary[]> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/tally-tasks${search ? `?${search}` : ''}`);
  }

  async createWarehouseTallyTask(input: WarehouseTallyTaskCreateInput): Promise<WarehouseTallyTaskSummary> {
    return this.request('/warehouse/tally-tasks', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateWarehouseTallyTask(id: string, input: WarehouseTallyTaskUpdateInput): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async completeWarehouseTallyTask(id: string, input: WarehouseTallyTaskCompleteInput): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/complete`, { method: 'POST', body: JSON.stringify(input) });
  }

  async generateWarehouseTallyTaskLabel(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/label`, { method: 'POST' });
  }

  async printWarehouseTallyTaskLabel(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/label/print`, { method: 'POST' });
  }

  async downloadWarehouseTallyTaskLabel(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/label/download`, { method: 'POST' });
  }

  async createShipmentFinanceItem(id: string, input: ShipmentFinanceItemCreateInput): Promise<ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/finance-items`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateShipmentFinanceItem(id: string, feeId: string, input: ShipmentFinanceItemUpdateInput): Promise<ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/finance-items/${feeId}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteShipmentFinanceItem(id: string, feeId: string): Promise<ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/finance-items/${feeId}`, { method: 'DELETE' });
  }

  async lockShipmentFinanceItem(id: string, feeId: string): Promise<ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/finance-items/${feeId}/lock`, { method: 'POST' });
  }

  async unlockShipmentFinanceItem(id: string, feeId: string): Promise<ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/finance-items/${feeId}/unlock`, { method: 'POST' });
  }

  async receivables(): Promise<ReceivableFeeSummary[]> {
    return this.request('/finance/receivables');
  }

  async financeDashboard(): Promise<FinanceDashboardResponse> {
    return this.request('/finance/dashboard');
  }

  async financeCatalog(query: FinanceCatalogListQuery = {}): Promise<FinanceCatalogListResponse> {
    const params = new globalThis.URLSearchParams();
    if (query.category) {
      params.set('category', query.category);
    }
    if (query.keyword?.trim()) {
      params.set('keyword', query.keyword.trim());
    }
    if (query.enabledOnly !== undefined) {
      params.set('enabledOnly', String(query.enabledOnly));
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/finance/catalog${suffix}`);
  }

  async createFinanceCatalogItem(input: FinanceCatalogItemInput): Promise<FinanceCatalogItemSummary> {
    return this.request('/finance/catalog', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateFinanceCatalogItem(id: string, input: Partial<FinanceCatalogItemInput>): Promise<FinanceCatalogItemSummary> {
    return this.request(`/finance/catalog/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async disableFinanceCatalogItem(id: string): Promise<FinanceCatalogItemSummary> {
    return this.request(`/finance/catalog/${id}`, { method: 'DELETE' });
  }

  async reorderFinanceCatalogItems(input: FinanceCatalogReorderInput): Promise<FinanceCatalogListResponse> {
    return this.request('/finance/catalog/reorder', { method: 'PUT', body: JSON.stringify(input) });
  }

  async receivableAudits(query: ReceivableAuditListQuery = {}): Promise<ReceivableAuditListResponse> {
    return this.request(`/finance/receivable-audits${this.queryString(query)}`);
  }

  async createReceivableAudit(input: ReceivableAuditCreateInput): Promise<ReceivableAuditSummary> {
    return this.request('/finance/receivable-audits', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateReceivableAudit(id: string, input: ReceivableAuditUpdateInput): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-audits/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async auditReceivable(id: string): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-audits/${id}/audit`, { method: 'POST' });
  }

  async reverseAuditReceivable(id: string): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-audits/${id}/reverse-audit`, { method: 'POST' });
  }

  async deleteReceivableAudit(id: string): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-audits/${id}`, { method: 'DELETE' });
  }

  async batchAuditReceivables(input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    return this.request('/finance/receivable-audits/batch-audit', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchReverseAuditReceivables(input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    return this.request('/finance/receivable-audits/batch-reverse-audit', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchVoidReceivables(input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    return this.request('/finance/receivable-audits/batch-void', { method: 'POST', body: JSON.stringify(input) });
  }

  async matchReceivableReceipt(id: string, input: ReceivableReceiptMatchInput): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-audits/${id}/match-receipt`, { method: 'POST', body: JSON.stringify(input) });
  }

  async exportReceivableAudits(input: ReceivableAuditExportRequest): Promise<ReceivableAuditExportResponse> {
    return this.request('/finance/receivable-audits/export', { method: 'POST', body: JSON.stringify(input) });
  }

  async businessCostAudits(query: BusinessCostAuditListQuery = {}): Promise<BusinessCostAuditListResponse> {
    return this.request(`/finance/business-cost-audits${this.queryString(query)}`);
  }

  async createBusinessCostAudit(input: BusinessCostAuditCreateInput): Promise<BusinessCostAuditSummary> {
    return this.request('/finance/business-cost-audits', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateBusinessCostAudit(id: string, input: BusinessCostAuditUpdateInput): Promise<BusinessCostAuditSummary> {
    return this.request(`/finance/business-cost-audits/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async auditBusinessCost(id: string): Promise<BusinessCostAuditSummary> {
    return this.request(`/finance/business-cost-audits/${id}/audit`, { method: 'POST' });
  }

  async reverseAuditBusinessCost(id: string): Promise<BusinessCostAuditSummary> {
    return this.request(`/finance/business-cost-audits/${id}/reverse-audit`, { method: 'POST' });
  }

  async deleteBusinessCostAudit(id: string): Promise<BusinessCostAuditSummary> {
    return this.request(`/finance/business-cost-audits/${id}`, { method: 'DELETE' });
  }

  async batchAuditBusinessCosts(input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    return this.request('/finance/business-cost-audits/batch-audit', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchReverseAuditBusinessCosts(input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    return this.request('/finance/business-cost-audits/batch-reverse-audit', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchVoidBusinessCosts(input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    return this.request('/finance/business-cost-audits/batch-void', { method: 'POST', body: JSON.stringify(input) });
  }

  async exportBusinessCostAudits(input: BusinessCostAuditExportRequest): Promise<BusinessCostAuditExportResponse> {
    return this.request('/finance/business-cost-audits/export', { method: 'POST', body: JSON.stringify(input) });
  }

  async payableAudits(query: PayableAuditListQuery = {}): Promise<PayableAuditListResponse> {
    return this.request(`/finance/payable-audits${this.queryString(query)}`);
  }

  async createPayableAudit(input: PayableAuditCreateInput): Promise<PayableAuditSummary> {
    return this.request('/finance/payable-audits', { method: 'POST', body: JSON.stringify(input) });
  }

  async matchPayableAuditShipment(input: PayableAuditShipmentMatchInput): Promise<PayableAuditShipmentMatchSummary> {
    return this.request('/finance/payable-audits/match-shipment', { method: 'POST', body: JSON.stringify(input) });
  }

  async updatePayableAudit(id: string, input: PayableAuditUpdateInput): Promise<PayableAuditSummary> {
    return this.request(`/finance/payable-audits/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async auditPayable(id: string): Promise<PayableAuditSummary> {
    return this.request(`/finance/payable-audits/${id}/audit`, { method: 'POST' });
  }

  async reverseAuditPayable(id: string): Promise<PayableAuditSummary> {
    return this.request(`/finance/payable-audits/${id}/reverse-audit`, { method: 'POST' });
  }

  async deletePayableAudit(id: string): Promise<PayableAuditSummary> {
    return this.request(`/finance/payable-audits/${id}`, { method: 'DELETE' });
  }

  async batchAuditPayables(input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    return this.request('/finance/payable-audits/batch-audit', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchReverseAuditPayables(input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    return this.request('/finance/payable-audits/batch-reverse-audit', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchVoidPayables(input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    return this.request('/finance/payable-audits/batch-void', { method: 'POST', body: JSON.stringify(input) });
  }

  async exportPayableAudits(input: PayableAuditExportRequest): Promise<PayableAuditExportResponse> {
    return this.request('/finance/payable-audits/export', { method: 'POST', body: JSON.stringify(input) });
  }

  async pendingPayments(query: PendingPaymentListQuery = {}): Promise<PendingPaymentListResponse> {
    return this.request(`/finance/pending-payments${this.queryString(query)}`);
  }

  async createPaymentApplications(input: PaymentApplicationCreateInput): Promise<PaymentApplicationSummary[]> {
    return this.request('/finance/payment-applications', { method: 'POST', body: JSON.stringify(input) });
  }

  async updatePaymentApplication(id: string, input: PaymentApplicationUpdateInput): Promise<PaymentApplicationSummary> {
    return this.request(`/finance/payment-applications/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async cancelPaymentApplication(id: string, input: PaymentApplicationCancelInput = {}): Promise<PaymentApplicationSummary> {
    return this.request(`/finance/payment-applications/${id}/cancel`, { method: 'POST', body: JSON.stringify(input) });
  }

  async exportPaymentApplications(input: PaymentApplicationExportRequest): Promise<PaymentApplicationExportResponse> {
    return this.request('/finance/payment-applications/export', { method: 'POST', body: JSON.stringify(input) });
  }

  async payeeBankAccounts(query: { agentName?: string; agentId?: string; currency?: 'RMB' | 'USD' } = {}): Promise<PayeeBankAccountSummary[]> {
    return this.request(`/finance/payee-bank-accounts${this.queryString(query)}`);
  }

  async savePayeeBankAccount(input: PayeeBankAccountInput): Promise<PayeeBankAccountSummary> {
    return this.request('/finance/payee-bank-accounts', { method: 'POST', body: JSON.stringify(input) });
  }

  async addPaymentVoucher(input: PaymentVoucherInput): Promise<PaymentVoucherSummary> {
    return this.request('/finance/payment-vouchers', { method: 'POST', body: JSON.stringify(input) });
  }

  async paymentVouchers(query: PaymentVoucherListQuery = {}): Promise<PaymentVoucherSummary[]> {
    return this.request(`/finance/payment-vouchers${this.queryString(query)}`);
  }

  async updatePaymentVoucherDifference(id: string, input: PaymentVoucherDifferenceInput): Promise<PaymentVoucherSummary> {
    return this.request(`/finance/payment-vouchers/${id}/difference`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async updatePaymentVoucherArchive(id: string, input: PaymentVoucherArchiveInput): Promise<PaymentVoucherSummary> {
    return this.request(`/finance/payment-vouchers/${id}/archive`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async uploadVoucherImage(input: VoucherImageUploadInput & { file: File }): Promise<VoucherImageUploadResponse> {
    const body = new FormData();
    body.append('file', input.file);
    body.append('context', input.context);
    if (input.pendingPaymentId) body.append('pendingPaymentId', input.pendingPaymentId);
    if (input.paymentApplicationId) body.append('paymentApplicationId', input.paymentApplicationId);
    if (input.waterReceiptId) body.append('waterReceiptId', input.waterReceiptId);

    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/finance/voucher-images`, { method: 'POST', body, headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) {
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    return response.json() as Promise<VoucherImageUploadResponse>;
  }

  async paidPayments(query: PaidPaymentListQuery = {}): Promise<PaidPaymentListResponse> {
    return this.request(`/finance/paid-payments${this.queryString(query)}`);
  }

  async confirmPaymentApplicationPaid(id: string, input: PaymentConfirmPaidInput): Promise<PaidPaymentListResponse['rows'][number]> {
    return this.request(`/finance/payment-applications/${id}/confirm-paid`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updatePaidPayment(id: string, input: PaidPaymentUpdateInput): Promise<PaidPaymentListResponse['rows'][number]> {
    return this.request(`/finance/paid-payments/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async reversePaidPayment(id: string, input: PaidPaymentReverseInput = {}): Promise<PaidPaymentListResponse['rows'][number]> {
    return this.request(`/finance/paid-payments/${id}/reverse`, { method: 'POST', body: JSON.stringify(input) });
  }

  async exportPaidPayments(input: PaidPaymentExportRequest): Promise<PaidPaymentExportResponse> {
    return this.request('/finance/paid-payments/export', { method: 'POST', body: JSON.stringify(input) });
  }

  async addPaymentWaterReceipt(input: PaymentWaterReceiptInput): Promise<PaymentVoucherSummary> {
    return this.request('/finance/payment-water-receipts', { method: 'POST', body: JSON.stringify(input) });
  }

  async agentBankAccounts(query: { agentName?: string; agentId?: string } = {}): Promise<AgentBankAccountSummary[]> {
    return this.request(`/finance/agent-bank-accounts${this.queryString(query)}`);
  }

  async saveAgentBankAccount(input: AgentBankAccountInput): Promise<AgentBankAccountSummary> {
    return this.request('/finance/agent-bank-accounts', { method: 'POST', body: JSON.stringify(input) });
  }

  async shipmentFinanceDetail(id: string): Promise<ShipmentFinanceDetailSummary> {
    return this.request(`/shipments/${id}/finance-detail`);
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

  async waterReceipts(query: WaterReceiptListQuery = {}): Promise<WaterReceiptListResponse> {
    return this.request(`/finance/water-receipts${this.queryString(query)}`);
  }

  async createWaterReceipt(input: WaterReceiptCreateInput): Promise<WaterReceiptListResponse['rows'][number]> {
    return this.request('/finance/water-receipts', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateWaterReceipt(id: string, input: WaterReceiptUpdateInput): Promise<WaterReceiptListResponse['rows'][number]> {
    return this.request(`/finance/water-receipts/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async markWaterReceiptArrived(id: string, input: WaterReceiptMarkArrivedInput = {}): Promise<WaterReceiptListResponse['rows'][number]> {
    return this.request(`/finance/water-receipts/${id}/mark-arrived`, { method: 'POST', body: JSON.stringify(input) });
  }

  async waterReceiptMatchableReceivables(id: string): Promise<ReceivableAuditSummary[]> {
    return this.request(`/finance/water-receipts/${id}/matchable-receivables`);
  }

  async matchWaterReceiptOrders(id: string, input: WaterReceiptMatchOrdersInput): Promise<WaterReceiptListResponse['rows'][number]> {
    return this.request(`/finance/water-receipts/${id}/match-orders`, { method: 'POST', body: JSON.stringify(input) });
  }

  async unmatchWaterReceipt(id: string, input: WaterReceiptUnmatchInput): Promise<WaterReceiptListResponse['rows'][number]> {
    return this.request(`/finance/water-receipts/${id}/unmatch`, { method: 'POST', body: JSON.stringify(input) });
  }

  async archiveWaterReceipt(id: string): Promise<WaterReceiptListResponse['rows'][number]> {
    return this.request(`/finance/water-receipts/${id}/archive`, { method: 'POST' });
  }

  async voidWaterReceipt(id: string, input: { reason?: string } = {}): Promise<WaterReceiptListResponse['rows'][number]> {
    return this.request(`/finance/water-receipts/${id}/void`, { method: 'POST', body: JSON.stringify(input) });
  }

  async uploadWaterReceiptVoucher(id: string, input: WaterReceiptVoucherInput): Promise<WaterReceiptVoucherSummary> {
    return this.request(`/finance/water-receipts/${id}/voucher`, { method: 'POST', body: JSON.stringify(input) });
  }

  async exportWaterReceipts(input: WaterReceiptExportRequest): Promise<WaterReceiptExportResponse> {
    return this.request('/finance/water-receipts/export', { method: 'POST', body: JSON.stringify(input) });
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

  async updateCustomerContact(customerId: string, contactId: string, input: CustomerContactUpdateInput): Promise<CustomerContactSummary> {
    return this.request(`/master-data/customers/${customerId}/contacts/${contactId}`, { method: 'PUT', body: JSON.stringify(input) });
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

  async createAgentChannel(input: AgentChannelCreateInput): Promise<AgentChannelSummary> {
    return this.request('/master-data/agent-channels', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateAgentChannel(id: string, input: AgentChannelUpdateInput): Promise<AgentChannelSummary> {
    return this.request(`/master-data/agent-channels/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateAgentChannelEnabled(id: string, input: EnabledUpdateInput): Promise<AgentChannelSummary> {
    return this.request(`/master-data/agent-channels/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
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

  async updateChannel(id: string, input: ChannelUpdateInput): Promise<ChannelSummary> {
    return this.request(`/master-data/channels/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateChannelEnabled(id: string, input: EnabledUpdateInput): Promise<ChannelSummary> {
    return this.request(`/master-data/channels/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createChannelCategory(input: ChannelCategoryCreateInput): Promise<ChannelCategorySummary> {
    return this.request('/master-data/channel-categories', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateChannelCategory(id: string, input: ChannelCategoryUpdateInput): Promise<ChannelCategorySummary> {
    return this.request(`/master-data/channel-categories/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateChannelCategoryEnabled(id: string, input: EnabledUpdateInput): Promise<ChannelCategorySummary> {
    return this.request(`/master-data/channel-categories/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
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

  async updateExchangeRate(id: string, input: ExchangeRateUpdateInput): Promise<ExchangeRateSummary> {
    return this.request(`/master-data/exchange-rates/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteExchangeRate(id: string): Promise<ExchangeRateSummary> {
    return this.request(`/master-data/exchange-rates/${id}`, { method: 'DELETE' });
  }

  async rolePermissions(): Promise<RolePermissionMatrix> {
    return this.request('/system/roles');
  }

  async createRoleGroup(input: RoleGroupInput): Promise<RolePermissionRow> {
    return this.request('/system/roles', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateRoleGroup(role: RoleKey, input: RoleGroupInput): Promise<RolePermissionRow> {
    return this.request(`/system/roles/${role}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateRoleGroupEnabled(role: RoleKey, input: EnabledUpdateInput): Promise<RolePermissionRow> {
    return this.request(`/system/roles/${role}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async staffAccounts(query: StaffAccountQuery = {}): Promise<StaffAccountSummary[]> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return this.request(`/system/staff-accounts${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async sites(): Promise<SiteSummary[]> {
    return this.request('/system/sites');
  }

  async createSite(input: SiteCreateInput): Promise<SiteSummary> {
    return this.request('/system/sites', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateSite(id: string, input: SiteUpdateInput): Promise<SiteSummary> {
    return this.request(`/system/sites/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateSiteEnabled(id: string, input: EnabledUpdateInput): Promise<SiteSummary> {
    return this.request(`/system/sites/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createStaffAccount(input: StaffAccountCreateInput): Promise<StaffAccountSummary> {
    return this.request('/system/staff-accounts', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateStaffAccount(id: string, input: StaffAccountUpdateInput): Promise<StaffAccountSummary> {
    return this.request(`/system/staff-accounts/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteStaffAccount(id: string): Promise<StaffAccountSummary> {
    return this.request(`/system/staff-accounts/${id}`, { method: 'DELETE' });
  }

  async updateStaffAccountSite(id: string, input: { site?: string }): Promise<StaffAccountSummary> {
    return this.request(`/system/staff-accounts/${id}/site`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async resetStaffAccountPasswords(input: StaffAccountPasswordResetInput): Promise<StaffAccountPasswordResetResult[]> {
    return this.request('/system/staff-accounts/reset-passwords', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateRolePermissions(role: RoleKey, permissions: PermissionKey[]): Promise<RolePermissionRow> {
    return this.request(`/system/roles/${role}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) });
  }

  async auditLogs(query: AuditLogQuery = {}): Promise<AuditLogListResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/system/audit-logs${search ? `?${search}` : ''}`);
  }

  async aiAssist(input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }): Promise<AiAssistResponse> {
    return this.request('/ai/assist', { method: 'POST', body: JSON.stringify(input) });
  }

  private queryString(query: object) {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return search ? `?${search}` : '';
  }

  private async request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) };
    const token = this.getToken();
    if (authenticated && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
    if (response.status === 401) {
      if (authenticated) {
        this.onUnauthorized();
      }
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) {
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    return response.json() as Promise<T>;
  }
}

import type {
  AgentCreateInput,
  AgentDeleteResponse,
  AgentChannelCreateInput,
  AgentChannelSummary,
  AgentChannelUpdateInput,
  AgentMarkupCreateInput,
  AgentMarkupExportResponse,
  AgentMarkupListQuery,
  AgentMarkupListResponse,
  AgentMarkupPreviewResponse,
  AgentMarkupSummary,
  AgentMarkupUpdateInput,
  MarkupRoutePreviewInput,
  MarkupRoutePreviewResponse,
  MarkupRouteTierReplaceInput,
  AgentSummary,
  AgentUpdateInput,
  AuditLogListResponse,
  AuditLogQuery,
  AuditLogSummary,
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
  OrderEntryWarehousePackageQuery,
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
  PriceBookImportTargetModule,
  PriceBookImportJobResponse,
  PriceBookImportResult,
  PriceBookRemarkUpdateInput,
  PriceBookRowsQuery,
  PriceBookRowsResponse,
  PriceBooksResponse,
  PriceBookSummary,
  PricingSyncHealthResponse,
  PricingRuleRefreshProgressResponse,
  LegacyPricingImportInput,
  LegacyPricingMetaResponse,
  LegacyPricingModule,
  LegacyPricingQuoteRequest,
  LegacyPricingQuoteResponse,
  LegacyPricingSourcesResponse,
  DubaiPriceTableResponse,
  DubaiPriceDisplayActivateInput,
  DubaiPriceDisplayResponse,
  DubaiPriceDisplayVersionListResponse,
  SouthAfricaLookupRequest,
  SouthAfricaLookupResponse,
  SouthAfricaRateRuleInput,
  SouthAfricaRateRuleListResponse,
  SouthAfricaRateRuleSummary,
  PriceLookupRequest,
  PriceLookupResponse,
  LineShipmentPoolQuery,
  ShipmentInternalFlowLogResponse,
  LineShipmentPoolResponse,
  NavigationReadStateInput,
  NavigationUnreadBadgesResponse,
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
  DepartmentSummary,
  StaffAccountPasswordResetInput,
  StaffAccountPasswordResetResult,
  StaffAccountQuery,
  StaffAccountSummary,
  StaffAccountUpdateInput,
  BulkTrackingApplyRequest,
  BulkTrackingApplyResponse,
  Shipment,
  ShipmentCreateInput,
  ShipmentReviewBasicUpdateInput,
  ShipmentFinanceDetailSummary,
  ShipmentFinanceItemCreateInput,
  ShipmentRerouteInput,
  ShipmentRouteInput,
  BusinessCostFeeSummary,
  PayableFeeSummary,
  ShipmentFinanceItemUpdateInput,
  ShipmentDispatchInput,
  WarehouseHandoverPrintInput,
  WarehouseHandoverPrintResponse,
  WarehouseHandoverSummary,
  ShipmentRestoreInput,
  ShipmentReviewDeleteInput,
  ShipmentReviewDetailSummary,
  ShipmentReviewRejectInput,
  ShipmentLabelSummary,
  ShipmentOperationalUpdateInput,
  CustomerServiceTransferBatchInput,
  CustomerServiceTransferBatchResponse,
  ShipmentPaymentUpdateInput,
  TrackingEventInput,
  WarehouseConsolidationCreateInput,
  WarehouseConsolidationSummary,
  WarehouseInStockQuery,
  WarehouseInStockResponse,
  WarehouseManualReceiptCreateInput,
  WarehouseManualReceiptCreateResponse,
  WarehousePackageCreateInput,
  WarehouseManualReceiptCustomerOption,
  WarehousePackageGroupSummary,
  WarehousePackageSplitInput,
  WarehousePackageSplitResponse,
  WarehousePackageSummary,
  WarehousePackageUpdateInput,
  WarehouseTallyLabelScanInput,
  WarehouseTallyLabelScanResponse,
  WarehouseTallyTaskCompleteInput,
  WarehouseTallyTaskCreateInput,
  WarehouseTallyTaskListQuery,
  WarehouseTallyTaskSummary,
  WarehouseTallyTaskUpdateInput,
  WarehouseTodayQuery,
  WarehouseTodayResponse
} from '@siyuan/shared';
import { AppShellClient } from './api/appShellClient';
import { SystemDirectoryClient } from './api/systemDirectoryClient';

export type BuiltinRoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type RoleKey = BuiltinRoleKey | (string & {});
export type PermissionKey =
  | `customer-service:${string}`
  | `tracking:${string}`
  | `finance:${string}`
  | `master-data:${string}`
  | 'operations:line-shipment:view'
  | 'operations:line-shipment:detail'
  | 'operations:line-shipment:process'
  | 'operations:line-shipment:status-update'
  | 'operations:line-shipment:tracking-add'
  | 'operations:line-shipment:problem-create'
  | 'operations:line-shipment:import'
  | 'operations:line-shipment:internal-log-view'
  | 'operations:line-shipment:export'
  | 'operations:ai-queue:view'
  | 'operations:ai-queue:assist'
  | 'operations:ai-queue:mark-read'
  | 'operations:ai-queue:handle'
  | 'operations:product-map:view'
  | 'operations:product-map:route-view'
  | 'operations:product-map:cost-sensitive-view'
  | 'operations:product-map:export'
  | 'operations:import-quality:view'
  | 'operations:import-quality:upload'
  | 'operations:import-quality:retry'
  | 'operations:import-quality:error-detail-view'
  | 'operations:import-quality:confirm'
  | 'business:dashboard:view'
  | 'business:dashboard:team-view'
  | 'business:dashboard:all-view'
  | 'business:dashboard:trend-view'
  | 'business:dashboard:pending-review-summary'
  | 'business:order-entry:view'
  | 'business:order-entry:warehouse-package-select'
  | 'business:order-entry:create'
  | 'business:order-entry:draft-view'
  | 'business:order-entry:draft-save'
  | 'business:order-entry:draft-delete'
  | 'business:order-entry:submit-review'
  | 'business:order-entry:invoice-upload'
  | 'business:order-entry:label-upload'
  | 'business:order-fee:view'
  | 'business:order-fee:create'
  | 'business:order-fee:update'
  | 'business:order-fee:delete'
  | 'business:order-fee:lock'
  | 'business:order-fee:unlock'
  | 'business:order-fee:profit-view'
  | 'business:review:list'
  | 'business:review:detail'
  | 'business:review:deleted-list'
  | 'business:review:approve'
  | 'business:review:reject'
  | 'business:review:reverse'
  | 'business:review:delete'
  | 'business:review:restore'
  | 'business:review:purge'
  | 'business:review:finance-detail-view'
  | 'business:review:operation-log-view'
  | 'business:shipment:list'
  | 'business:shipment:detail'
  | 'business:shipment:self-view'
  | 'business:shipment:team-view'
  | 'business:shipment:all-view'
  | 'business:shipment:update-basic'
  | 'business:shipment:update-operational'
  | 'business:shipment:delete'
  | 'business:shipment:payment-record'
  | 'business:shipment:tracking-add'
  | 'business:shipment:problem-create'
  | 'business:shipment:finance-detail-view'
  | 'business:shipment:receivable-view'
  | 'business:shipment:payable-view'
  | 'business:shipment:profit-view'
  | 'business:shipment:export'
  | 'business:shipment:column-setting'
  | 'business:order-ai:view'
  | 'business:order-ai:assist'
  | 'business:order-ai:finance-context'
  | 'business:order-ai:all-order-context'
  | 'business:order-ai:export-result'
  | 'market:dashboard:view'
  | 'market:dashboard:pending-summary'
  | 'market:dashboard:routed-summary'
  | 'market:dashboard:weekly-summary'
  | 'market:dashboard:agent-stats-view'
  | 'market:dashboard:channel-mode-stats-view'
  | 'market:dashboard:sensitive-summary-view'
  | 'market:dashboard:team-view'
  | 'market:dashboard:all-view'
  | 'market:pending-routing:view'
  | 'market:pending-routing:detail'
  | 'market:pending-routing:assign'
  | 'market:pending-routing:save-draft'
  | 'market:pending-routing:confirm'
  | 'market:pending-routing:audit'
  | 'market:pending-routing:update'
  | 'market:pending-routing:delete'
  | 'market:pending-routing:operation-log-view'
  | 'market:pending-routing:business-cost-view'
  | 'market:pending-routing:payable-cost-view'
  | 'market:pending-routing:agent-channel-view'
  | 'market:pending-routing:cost-field-view'
  | 'market:pending-routing:column-setting'
  | 'market:routed:view'
  | 'market:routed:detail'
  | 'market:routed:update'
  | 'market:routed:reroute'
  | 'market:routed:log-view'
  | 'market:routed:agent-cost-view'
  | 'market:routed:cost-total-view'
  | 'market:routed:agent-channel-view'
  | 'market:routed:column-setting'
  | 'market:weekly-routing:view'
  | 'market:weekly-routing:detail'
  | 'market:weekly-routing:agent-stats-view'
  | 'market:weekly-routing:channel-mode-stats-view'
  | 'market:weekly-routing:cost-view'
  | 'market:weekly-routing:reroute-stats-view'
  | 'market:weekly-routing:sensitive-stats-view'
  | 'market:weekly-routing:export'
  | 'market:weekly-routing:column-setting'
  | 'warehouse:today-receipt:view'
  | 'warehouse:today-receipt:filter'
  | 'warehouse:today-receipt:manual-create'
  | 'warehouse:today-receipt:update'
  | 'warehouse:today-receipt:remark-update'
  | 'warehouse:today-receipt:exception-manage'
  | 'warehouse:today-receipt:device-import'
  | 'warehouse:today-receipt:device-log-view'
  | 'warehouse:today-receipt:column-setting'
  | 'warehouse:in-stock:view'
  | 'warehouse:in-stock:update'
  | 'warehouse:in-stock:split'
  | 'warehouse:in-stock:batch-select'
  | 'warehouse:in-stock:tally-start'
  | 'warehouse:in-stock:batch-tally-start'
  | 'warehouse:in-stock:order-entry-select'
  | 'warehouse:in-stock:batch-order-entry'
  | 'warehouse:in-stock:tally-record-view'
  | 'warehouse:in-stock:column-setting'
  | 'warehouse:tally-pending:view'
  | 'warehouse:tally-pending:task-create'
  | 'warehouse:tally-pending:task-update'
  | 'warehouse:tally-pending:task-process'
  | 'warehouse:tally-pending:merge-only'
  | 'warehouse:tally-pending:merge-and-ship'
  | 'warehouse:tally-pending:split'
  | 'warehouse:tally-pending:detail-view'
  | 'warehouse:tally-pending:history-view'
  | 'warehouse:tally-pending:filter'
  | 'warehouse:tally-completed:view'
  | 'warehouse:tally-completed:history-view'
  | 'warehouse:tally-completed:detail-view'
  | 'warehouse:tally-label:generate'
  | 'warehouse:tally-label:reprint'
  | 'warehouse:tally-label:print'
  | 'warehouse:tally-label:download'
  | 'warehouse:tally-label:scan-apply'
  | 'warehouse:tally-label:overwrite-package'
  | 'warehouse:dispatch-pending:view'
  | 'warehouse:dispatch-pending:batch-select'
  | 'warehouse:dispatch-pending:handover-preview'
  | 'warehouse:dispatch-pending:handover-print'
  | 'warehouse:dispatch-pending:dispatch-confirm'
  | 'warehouse:dispatch-pending:batch-dispatch-confirm'
  | 'warehouse:dispatch-pending:shipping-mark-confirm'
  | 'warehouse:dispatch-pending:label-generate'
  | 'warehouse:dispatch-pending:label-view'
  | 'warehouse:dispatch-pending:label-void'
  | 'warehouse:dispatch-pending:column-setting'
  | 'warehouse:outbounded:view'
  | 'warehouse:outbounded:handover-view'
  | 'warehouse:outbounded:detail-view'
  | 'warehouse:outbounded:export'
  | `pricing:${string}`
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
  | 'finance:customer-account:read'
  | 'master-data:customers:read'
  | 'master-data:customers:write'
  | 'master-data:finance:read'
  | 'master-data:finance:write'
  | 'master-data:agents:read'
  | 'master-data:agents:write'
  | 'master-data:agent-channels:read'
  | 'master-data:agent-channels:write'
  | 'master-data:channels:read'
  | 'master-data:channels:write'
  | 'master-data:channel-categories:read'
  | 'master-data:channel-categories:write'
  | 'master-data:remote-areas:read'
  | 'master-data:remote-areas:write'
  | 'master-data:exchange-rates:read'
  | 'master-data:exchange-rates:write'
  | 'master-data:assistant:read'
  | `system:${string}`;

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

export function resolveApiAssetUrl(url?: string) {
  if (!url || /^(?:https?:|data:|blob:)/i.test(url)) return url;
  const apiUrl = new URL(API_BASE, window.location.origin);
  if (url.startsWith('/api/')) return new URL(url, apiUrl.origin).toString();
  if (url.startsWith('/uploads/')) return new URL(`/api${url}`, apiUrl.origin).toString();
  return url;
}

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
    if (status === 502 || status === 504 || /<html[\s>]/i.test(body) || /Gateway Time-out|Bad Gateway/i.test(body)) {
      return '服务暂不可用，请稍后重试';
    }
    return body;
  }
}

export class ApiClient {
  readonly appShell = new AppShellClient(<T>(path: string, init?: RequestInit) => this.request<T>(path, init));
  readonly systemDirectory = new SystemDirectoryClient(<T>(path: string, init?: RequestInit) =>
    this.request<T>(path, init)
  );

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

  async accountEvents(): Promise<AuditLogSummary[]> {
    return this.request('/auth/account-events');
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

  async warehouseDispatchShipments(): Promise<Shipment[]> {
    return this.request('/warehouse/dispatch-shipments');
  }

  async navigationUnreadBadges(): Promise<NavigationUnreadBadgesResponse> { return this.appShell.navigationUnreadBadges(); }

  async markNavigationRead(input: NavigationReadStateInput): Promise<{ ok: true; moduleKey: string; sectionKey?: string; readAt: string; watermark: string }> { return this.appShell.markNavigationRead(input); }

  async reportPageRenderError(input: {
    errorId: string;
    route: string;
    releaseId: string;
    menuKey?: string;
    sectionKey?: string;
    message: string;
    stack?: string;
    componentStack?: string;
  }): Promise<{ ok: true }> {
    return this.appShell.reportPageRenderError(input);
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

  async updateShipmentReviewBasic(id: string, input: ShipmentReviewBasicUpdateInput): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/review-basic`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async approveShipmentReview(id: string, input?: { businessReview?: boolean }): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/review/approve`, {
      method: 'POST',
      ...(input ? { body: JSON.stringify(input) } : {})
    });
  }

  async rejectShipmentReview(id: string, input: ShipmentReviewRejectInput): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/review/reject`, { method: 'POST', body: JSON.stringify(input) });
  }

  async reverseShipmentReview(id: string, input?: { reason?: string }): Promise<ShipmentReviewDetailSummary> {
    return this.request(`/shipments/${id}/review/reverse`, { method: 'POST', ...(input ? { body: JSON.stringify(input) } : {}) });
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

  async orderEntryPackages(query: OrderEntryWarehousePackageQuery): Promise<WarehousePackageSummary[]> {
    const params = new URLSearchParams();
    if (query.customerCode?.trim()) {
      params.set('customerCode', query.customerCode.trim());
    }
    if (query.domesticTrackingNo?.trim()) {
      params.set('domesticTrackingNo', query.domesticTrackingNo.trim());
    }
    query.packageIds?.forEach((id) => {
      if (id.trim()) params.append('packageIds', id.trim());
    });
    return this.request(`/shipments/order-entry/packages?${params.toString()}`);
  }

  async orderEntryDrafts(): Promise<Shipment[]> {
    return this.request('/shipments/order-entry/drafts');
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

  async deleteOrderEntryDraft(id: string, input: ShipmentReviewDeleteInput): Promise<OrderEntryDetailSummary> {
    return this.request(`/shipments/${id}/order-entry-draft`, { method: 'DELETE', body: JSON.stringify(input) });
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

  async deletePendingRoutingShipment(id: string, body: ShipmentReviewDeleteInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/pending-routing`, { method: 'DELETE', body: JSON.stringify(body) });
  }

  async dispatchShipment(id: string, body: ShipmentDispatchInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/dispatch`, { method: 'POST', body: JSON.stringify(body) });
  }

  async printWarehouseHandover(input: WarehouseHandoverPrintInput): Promise<WarehouseHandoverPrintResponse> {
    return this.request('/warehouse/handover/print', { method: 'POST', body: JSON.stringify(input) });
  }

  async warehouseHandover(shipmentId: string): Promise<WarehouseHandoverSummary> {
    return this.request(`/warehouse/handover/${shipmentId}`);
  }

  async approveShipmentBusinessData(id: string, body: { remark?: string } = {}): Promise<Shipment> {
    return this.request(`/shipments/${id}/business-data/approve`, { method: 'POST', body: JSON.stringify(body) });
  }

  async approveShipmentAgentData(id: string, body: { remark?: string } = {}): Promise<Shipment> {
    return this.request(`/shipments/${id}/agent-data/approve`, { method: 'POST', body: JSON.stringify(body) });
  }

  async updateShipmentBusinessData(id: string, body: { packageCount: number; weightKg: number; volumeCbm: number; chargeWeightKg: number; remark?: string; pushToSales?: boolean }): Promise<Shipment> {
    return this.request(`/shipments/${id}/business-data`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async updateShipmentAgentData(id: string, body: { packageCount: number; weightKg: number; volumeCbm: number; chargeWeightKg: number; remark?: string }): Promise<Shipment> {
    return this.request(`/shipments/${id}/agent-data`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async reverseShipmentBusinessData(id: string, body: { reason: string }): Promise<Shipment> {
    return this.request(`/shipments/${id}/business-data/reverse`, { method: 'POST', body: JSON.stringify(body) });
  }

  async reverseShipmentAgentData(id: string, body: { reason: string }): Promise<Shipment> {
    return this.request(`/shipments/${id}/agent-data/reverse`, { method: 'POST', body: JSON.stringify(body) });
  }

  async approveShipmentAllData(id: string, body: { remark?: string } = {}): Promise<Shipment> {
    return this.request(`/shipments/${id}/data-confirmation/approve-all`, { method: 'POST', body: JSON.stringify(body) });
  }

  async reverseShipmentAllData(id: string, body: { reason: string }): Promise<Shipment> {
    return this.request(`/shipments/${id}/data-confirmation/reverse-all`, { method: 'POST', body: JSON.stringify(body) });
  }

  async deleteShipment(id: string): Promise<Shipment> {
    return this.request(`/shipments/${id}`, { method: 'DELETE' });
  }

  async updateShipmentOperational(id: string, input: ShipmentOperationalUpdateInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/operational`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async updateOperationShipmentOperational(id: string, input: ShipmentOperationalUpdateInput): Promise<Shipment> {
    return this.request(`/operations/line-shipments/${id}/operational`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async customerServiceTransferShipments(): Promise<Shipment[]> {
    return this.request('/customer-service/transfer-shipments');
  }

  async fillCustomerServiceTransferShipments(input: CustomerServiceTransferBatchInput): Promise<CustomerServiceTransferBatchResponse> {
    return this.request('/customer-service/transfer-shipments/fill', { method: 'POST', body: JSON.stringify(input) });
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

  async uploadAgentInvoiceTemplate(file: File): Promise<{ fileName: string; url: string }> {
    const body = new FormData();
    body.append('file', file);
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/master-data/agent-invoice-template/upload`, { method: 'POST', body, headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) {
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    return response.json() as Promise<{ fileName: string; url: string }>;
  }

  async uploadShipmentBusinessInvoice(id: string, file: File): Promise<{ shipment: Shipment; fileName: string; url: string }> {
    const body = new FormData();
    body.append('file', file);
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/shipments/${id}/invoice/upload`, { method: 'POST', body, headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) {
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    return response.json() as Promise<{ shipment: Shipment; fileName: string; url: string }>;
  }

  async addTrackingEvent(id: string, input: TrackingEventInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/tracking-events`, { method: 'POST', body: JSON.stringify(input) });
  }

  async addOperationTrackingEvent(id: string, input: TrackingEventInput): Promise<Shipment> {
    return this.request(`/operations/line-shipments/${id}/tracking-events`, { method: 'POST', body: JSON.stringify(input) });
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

  async createOperationProblemTicket(id: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    return this.request(`/operations/line-shipments/${id}/problem-tickets`, { method: 'POST', body: JSON.stringify(input) });
  }

  async lineShipmentPool(query: LineShipmentPoolQuery = {}): Promise<LineShipmentPoolResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    return this.request(`/operations/line-shipments${params.size ? `?${params.toString()}` : ''}`);
  }

  async lineShipmentInternalFlowLog(id: string): Promise<ShipmentInternalFlowLogResponse> {
    return this.request(`/operations/line-shipments/${id}/internal-flow-log`);
  }

  async replyProblemTicket(id: string, message: string): Promise<ProblemTicketSummary> {
    return this.request(`/problem-tickets/${id}/replies`, { method: 'POST', body: JSON.stringify({ message }) });
  }

  async closeProblemTicket(id: string, reason?: string): Promise<ProblemTicketSummary> {
    return this.request(`/problem-tickets/${id}/close`, { method: 'POST', body: JSON.stringify({ reason }) });
  }

  async assistProblemTicket(id: string, reason: string): Promise<ProblemTicketSummary> {
    return this.request(`/problem-tickets/${id}/assist`, { method: 'POST', body: JSON.stringify({ reason }) });
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

  async priceBooks(options: { includeRows?: boolean; targetModule?: PriceBookImportTargetModule } = {}): Promise<PriceBooksResponse> {
    const params = new globalThis.URLSearchParams();
    if (options.includeRows === false) {
      params.set('includeRows', 'false');
    }
    if (options.targetModule) {
      params.set('targetModule', options.targetModule);
    }
    return this.request(`/pricing/books${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async importPriceBook(input: PriceBookImportInput, options: { returnRows?: boolean } = {}): Promise<PriceBookImportResult> {
    const params = new globalThis.URLSearchParams();
    if (options.returnRows === false) {
      params.set('returnRows', 'false');
    }
    return this.request(`/pricing/books/import${params.toString() ? `?${params.toString()}` : ''}`, { method: 'POST', body: JSON.stringify(input) });
  }

  async createPriceBookImportJob(file: File, input: Pick<PriceBookImportInput, 'targetModule' | 'agentId' | 'agentShortName'>): Promise<PriceBookImportJobResponse> {
    const form = new FormData();
    form.append('file', file);
    form.append('targetModule', input.targetModule);
    if (input.agentId) form.append('agentId', input.agentId);
    if (input.agentShortName) form.append('agentShortName', input.agentShortName);
    return this.request('/pricing/books/import-jobs', { method: 'POST', body: form });
  }

  async priceBookImportJob(id: string): Promise<PriceBookImportJobResponse> {
    return this.request(`/pricing/books/import-jobs/${id}`);
  }

  async priceBookRows(priceBookId?: string, query: PriceBookRowsQuery = {}): Promise<PriceBookRowsResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const path = priceBookId ? `/pricing/books/${priceBookId}/rows` : '/pricing/book-rows';
    return this.request(`${path}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async pricingSyncHealth(query: { page?: number; pageSize?: number; legacyModule?: LegacyPricingModule | 'unclassified' } = {}): Promise<PricingSyncHealthResponse> {
    const params = new globalThis.URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    if (query.legacyModule) params.set('legacyModule', String(query.legacyModule));
    return this.request(`/pricing/sync-health${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async priceBookRuleRefreshProgress(): Promise<PricingRuleRefreshProgressResponse> {
    return this.request('/pricing/books/rule-refresh-progress');
  }

  async downloadPriceBook(id: string): Promise<{ fileName: string; blob: Blob }> {
    const path = `/pricing/books/${encodeURIComponent(id)}/download`;
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
        throw new Error('查价请求失败，请检查网络后重试');
      }
      throw error;
    }
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) {
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
    let fileName = '价格表.xlsx';
    try {
      fileName = encodedName ? decodeURIComponent(encodedName) : plainName || fileName;
    } catch {
      fileName = plainName || fileName;
    }
    return { fileName, blob: await response.blob() };
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

  async legacyPricingMeta(): Promise<LegacyPricingMetaResponse> {
    return this.request('/pricing/legacy/quote-meta');
  }

  async quoteLegacyPricing(input: LegacyPricingQuoteRequest): Promise<LegacyPricingQuoteResponse> {
    const paths: Record<LegacyPricingModule, string> = {
      amazon: '/pricing/legacy/amazon/quote',
      inquiry: '/pricing/legacy/inquiry/quote',
      europeExpress: '/pricing/legacy/europe-express/quote',
      southAfrica: '/pricing/legacy/south-africa/quote',
      usaAirSea: '/pricing/legacy/usa-air-sea/quote',
      canadaAirSea: '/pricing/legacy/canada-air-sea/quote',
      dubaiAirSea: '/pricing/legacy/dubai-air-sea/quote'
    };
    const { module: _module, ...body } = input;
    return this.request(paths[input.module], { method: 'POST', body: JSON.stringify(body) });
  }

  async dubaiPriceTable(): Promise<DubaiPriceTableResponse> {
    return this.request('/pricing/legacy/dubai-air-sea/table');
  }

  async dubaiPriceDisplay(): Promise<DubaiPriceDisplayResponse> {
    return this.request('/pricing/legacy/dubai-air-sea/display');
  }

  async dubaiPriceDisplayVersions(): Promise<DubaiPriceDisplayVersionListResponse> {
    return this.request('/pricing/legacy/dubai-air-sea/display-versions');
  }

  async activateDubaiPriceDisplayVersion(id: string, input: DubaiPriceDisplayActivateInput): Promise<DubaiPriceDisplayVersionListResponse> {
    return this.request(`/pricing/legacy/dubai-air-sea/display-versions/${id}/activate`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async retryDubaiPriceDisplayVersion(id: string): Promise<DubaiPriceDisplayVersionListResponse> {
    return this.request(`/pricing/legacy/dubai-air-sea/display-versions/${id}/retry`, { method: 'POST' });
  }

  async legacyPricingSources(module?: LegacyPricingModule): Promise<LegacyPricingSourcesResponse> {
    const params = module ? `?module=${encodeURIComponent(module)}` : '';
    return this.request(`/pricing/legacy/sources${params}`);
  }

  async importLegacyPricingSource(input: LegacyPricingImportInput): Promise<{ source: LegacyPricingSourcesResponse['sources'][number]; rowCount: number }> {
    return this.request('/pricing/legacy/sources/import', { method: 'POST', body: JSON.stringify(input) });
  }

  async deleteLegacyPricingSource(id: string): Promise<LegacyPricingSourcesResponse['sources'][number]> {
    return this.request(`/pricing/legacy/sources/${id}`, { method: 'DELETE' });
  }

  async rebuildLegacyPricing(module?: LegacyPricingModule): Promise<{ module: LegacyPricingModule | 'all'; rowCount: number; rebuiltAt: string }> {
    return this.request('/pricing/legacy/rebuild', { method: 'POST', body: JSON.stringify({ module }) });
  }

  async legacyPricingHealth(module?: LegacyPricingModule): Promise<{ module: LegacyPricingModule | 'all'; rowCount: number; issues: Array<{ severity: string; message: string }> }> {
    const params = module ? `?module=${encodeURIComponent(module)}` : '';
    return this.request(`/pricing/legacy/health-report${params}`);
  }

  async southAfricaRateRules(): Promise<SouthAfricaRateRuleListResponse> {
    return this.request('/pricing/south-africa/rules');
  }

  async createSouthAfricaRateRule(input: SouthAfricaRateRuleInput): Promise<SouthAfricaRateRuleSummary> {
    return this.request('/pricing/south-africa/rules', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateSouthAfricaRateRule(id: string, input: SouthAfricaRateRuleInput): Promise<SouthAfricaRateRuleSummary> {
    return this.request(`/pricing/south-africa/rules/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateSouthAfricaRateRuleEnabled(id: string, enabled: boolean): Promise<SouthAfricaRateRuleSummary> {
    return this.request(`/pricing/south-africa/rules/${id}/enabled`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
  }

  async deleteSouthAfricaRateRule(id: string): Promise<SouthAfricaRateRuleSummary> {
    return this.request(`/pricing/south-africa/rules/${id}`, { method: 'DELETE' });
  }

  async lookupSouthAfricaPricing(input: SouthAfricaLookupRequest): Promise<SouthAfricaLookupResponse> {
    return this.request('/pricing/south-africa/lookup', { method: 'POST', body: JSON.stringify(input) });
  }

  async agentMarkupRules(query: AgentMarkupListQuery = {}): Promise<AgentMarkupListResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    return this.request(`/pricing/markup-rules${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async previewAgentMarkupRule(id: string): Promise<AgentMarkupPreviewResponse> {
    return this.request(`/pricing/markup-rules/${id}/preview`);
  }

  async previewMarkupRoute(input: MarkupRoutePreviewInput): Promise<MarkupRoutePreviewResponse> {
    return this.request('/pricing/markup-rules/route-preview', { method: 'POST', body: JSON.stringify(input) });
  }

  async replaceMarkupRouteTiers(input: MarkupRouteTierReplaceInput): Promise<MarkupRoutePreviewResponse> {
    return this.request('/pricing/markup-rules/route-tiers', { method: 'POST', body: JSON.stringify(input) });
  }

  async migrateLegacyMarkupRouteScopes(): Promise<{ migratedCount: number; archivedCount: number; skippedCount: number }> {
    return this.request('/pricing/markup-rules/migrate-pricebook-scopes', { method: 'POST' });
  }

  async exportAgentMarkupRules(query: AgentMarkupListQuery = {}): Promise<AgentMarkupExportResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    return this.request(`/pricing/markup-rules/export${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async importAgentMarkupRules(rows: AgentMarkupCreateInput[]): Promise<{ successCount: number; errorRows: Array<{ index: number; reason: string }>; rows: AgentMarkupSummary[] }> {
    return this.request('/pricing/markup-rules/import', { method: 'POST', body: JSON.stringify({ rows }) });
  }

  async batchUpsertAgentMarkupRules(rows: AgentMarkupCreateInput[]): Promise<{ successCount: number; errorRows: Array<{ index: number; reason: string }>; rows: AgentMarkupSummary[] }> {
    return this.request('/pricing/markup-rules/batch-upsert', { method: 'POST', body: JSON.stringify({ rows }) });
  }

  async batchUpdateAgentMarkupRules(input: { ids?: string[]; agentNames?: string[]; scopes?: Array<{ agentName: string; priceBookId?: string; legacyModule?: LegacyPricingModule }>; enabled: boolean }): Promise<{ successCount: number; rows: AgentMarkupSummary[] }> {
    return this.request('/pricing/markup-rules/batch-status', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchDeleteAgentMarkupRules(input: { ids?: string[]; agentNames?: string[]; scopes?: Array<{ agentName: string; priceBookId?: string; legacyModule?: LegacyPricingModule }> }): Promise<{ successCount: number; rows: AgentMarkupSummary[] }> {
    return this.request('/pricing/markup-rules/batch-delete', { method: 'POST', body: JSON.stringify(input) });
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

  async warehouseManualReceiptCustomers(): Promise<WarehouseManualReceiptCustomerOption[]> {
    return this.request('/warehouse/manual-receipt/customers');
  }

  async createWarehousePackage(input: WarehousePackageCreateInput): Promise<WarehousePackageSummary> {
    return this.request('/warehouse/packages', { method: 'POST', body: JSON.stringify(input) });
  }

  async createWarehouseManualReceipt(input: WarehouseManualReceiptCreateInput): Promise<WarehouseManualReceiptCreateResponse> {
    return this.request('/warehouse/packages/manual-receipt', { method: 'POST', body: JSON.stringify(input) });
  }

  async splitWarehousePackage(id: string, input: WarehousePackageSplitInput): Promise<WarehousePackageSplitResponse> {
    return this.request(`/warehouse/packages/${id}/split`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateWarehousePackage(id: string, input: WarehousePackageUpdateInput): Promise<WarehousePackageSummary> {
    return this.request(`/warehouse/packages/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
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

  async warehouseTallyTaskHistoryChain(packageId: string): Promise<WarehouseTallyTaskSummary[]> {
    return this.request(`/warehouse/tally-task-history-chain?packageId=${encodeURIComponent(packageId)}`);
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

  async warehouseTallyTaskOutputPackages(id: string): Promise<WarehousePackageSummary[]> {
    return this.request(`/warehouse/tally-tasks/${id}/output-packages`);
  }

  async printWarehouseTallyTaskLabel(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/label/print`, { method: 'POST' });
  }

  async downloadWarehouseTallyTaskLabel(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/label/download`, { method: 'POST' });
  }

  async applyWarehouseTallyTaskLabel(input: WarehouseTallyLabelScanInput): Promise<WarehouseTallyLabelScanResponse> {
    return this.request('/warehouse/tally-tasks/label-scan', { method: 'POST', body: JSON.stringify(input) });
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
    return this.updateFinanceCatalogItem(id, { enabled: false });
  }

  async deleteFinanceCatalogItem(id: string): Promise<{ id: string; deleted: boolean }> {
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

  async agentBankAccounts(query: { agentName?: string; agentId?: string; includeDisabled?: boolean } = {}): Promise<AgentBankAccountSummary[]> {
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

  async deleteWaterReceiptVoucher(id: string): Promise<{ deleted: true }> {
    return this.request(`/finance/water-receipts/${id}/voucher`, { method: 'DELETE' });
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

  async customers(): Promise<CustomerSummary[]> {
    return this.request('/master-data/customers');
  }

  async createCustomer(input: CustomerCreateInput): Promise<CustomerSummary> {
    return this.request('/master-data/customers', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateCustomer(id: string, input: CustomerUpdateInput): Promise<CustomerSummary> {
    return this.request(`/master-data/customers/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteCustomer(id: string): Promise<CustomerSummary> {
    return this.request(`/master-data/customers/${id}`, { method: 'DELETE' });
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

  async batchUpdateAgentsEnabled(input: { ids: string[]; enabled: boolean }): Promise<{ successCount: number; rows: AgentSummary[] }> {
    return this.request('/master-data/agents/batch-enabled', { method: 'POST', body: JSON.stringify(input) });
  }

  async deleteAgents(input: { ids: string[] }): Promise<AgentDeleteResponse> {
    return this.request('/master-data/agents/batch-delete', { method: 'POST', body: JSON.stringify(input) });
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

  async deleteAgentChannel(id: string): Promise<AgentChannelSummary> {
    return this.request(`/master-data/agent-channels/${id}`, { method: 'DELETE' });
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

  async deleteChannel(id: string): Promise<ChannelSummary> {
    return this.request(`/master-data/channels/${id}`, { method: 'DELETE' });
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

  async deleteChannelCategory(id: string): Promise<ChannelCategorySummary> {
    return this.request(`/master-data/channel-categories/${id}`, { method: 'DELETE' });
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

  async departments(): Promise<DepartmentSummary[]> { return this.systemDirectory.departments(); }

  async sites(): Promise<SiteSummary[]> { return this.systemDirectory.sites(); }

  async createSite(input: SiteCreateInput): Promise<SiteSummary> { return this.systemDirectory.createSite(input); }

  async updateSite(id: string, input: SiteUpdateInput): Promise<SiteSummary> { return this.systemDirectory.updateSite(id, input); }

  async updateSiteEnabled(id: string, input: EnabledUpdateInput): Promise<SiteSummary> { return this.systemDirectory.updateSiteEnabled(id, input); }

  async createStaffAccount(input: StaffAccountCreateInput): Promise<StaffAccountSummary> {
    return this.request('/system/staff-accounts', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateStaffAccount(id: string, input: StaffAccountUpdateInput): Promise<StaffAccountSummary> {
    return this.request(`/system/staff-accounts/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateStaffAccountEnabled(id: string, input: { enabled: boolean }): Promise<StaffAccountSummary> {
    return this.request(`/system/staff-accounts/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
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
    const headers: Record<string, string> = {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers as Record<string, string> | undefined)
    };
    const token = this.getToken();
    if (authenticated && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { ...init, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
        throw new Error(path.includes('/pricing/') ? '查价请求失败，请检查网络后重试' : '网络请求失败，请稍后重试');
      }
      throw error;
    }
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

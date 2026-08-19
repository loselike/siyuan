import type {
  AgentCreateInput,
  AgentDeleteResponse,
  AgentChannelCreateInput,
  AgentChannelSummary,
  AgentChannelUpdateInput,
  AgentMarkupCreateInput,
  AgentMarkupSummary,
  AgentMarkupUpdateInput,
  MarkupRouteListQuery,
  MarkupRouteListResponse,
  MarkupRoutePreviewBatchInput,
  MarkupRoutePreviewBatchResponse,
  MarkupRoutePreviewInput,
  MarkupRoutePreviewResponse,
  MarkupRouteTierBatchReplaceInput,
  MarkupRouteTierBatchReplaceResponse,
  MarkupRouteTierReplaceInput,
  AgentSummary,
  AgentUpdateInput,
  CustomerStatementCreateInput,
  CustomerStatementSummary,
  CustomerAccountSummary,
  CarrierCreateInput,
  CarrierSummary,
  CarrierTaskRunResponse,
  AccountLedgerSummary,
  ChannelCreateInput,
  ChannelDeleteResponse,
  ChannelCategoryCreateInput,
  ChannelCategorySummary,
  ChannelCategoryUpdateInput,
  ChannelSummary,
  ChannelUpdateInput,
  CustomerContactCreateInput,
  CustomerContactSummary,
  CustomerContactUpdateInput,
  CustomerCreateInput,
  CustomerSourceInput,
  CustomerSourceListQuery,
  CustomerSourceListResponse,
  CustomerSourceSummary,
  CustomerSummary,
  CustomerUpdateInput,
  CustomerUserCreateInput,
  CustomerUserSummary,
  EnabledUpdateInput,
  ExchangeRateCreateInput,
  ExchangeRateSummary,
  ExchangeRateUpdateInput,
  FinanceDashboardResponse,
  FuelRateCreateInput,
  FuelRateSummary,
  LabelCreateResponse,
  MasterDataSnapshot,
  KuayueImportCommitInput,
  KuayueImportCommitResult,
  KuayueImportLineClaimInput,
  KuayueImportLineListResponse,
  KuayueImportLineQuery,
  KuayueImportPreview,
  MiscFeeActionInput,
  MiscFeeBusinessAssignmentInput,
  MiscFeeHangBatchApproveInput,
  MiscFeeHangBatchApproveResult,
  MiscFeeDetail,
  MiscFeeDeliveryShipmentOption,
  MiscFeeHangListResponse,
  MiscFeeHangQuery,
  MiscFeeHangRequestInput,
  MiscFeeHangRequestSummary,
  MiscFeeTallyDueSummary,
  MiscFeeInput,
  MiscFeeListResponse,
  MiscFeeMatchInput,
  MiscFeeQuery,
  MiscFeeUpdateInput,
  MiscFeeVoidInput,
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
  PayerBankAccountInput,
  PayerBankAccountListQuery,
  PayerBankAccountListResponse,
  PayerBankAccountSummary,
  PayableAuditBatchInput,
  PayableAuditCreateInput,
  PayableAuditExportRequest,
  PayableAuditExportResponse,
  PayableAuditShipmentMatchInput,
  PayableAuditShipmentMatchSummary,
  PayableAuditSummary,
  PayableAuditUpdateInput,
  PriceBookImportInput,
  PriceBookBatchDeleteInput,
  PriceBookBatchDeleteResponse,
  PriceBookImportJobListQuery,
  PriceBookImportJobListResponse,
  PriceBookImportTargetModule,
  PriceBookImportJobResponse,
  PriceBookImportResult,
  PriceBookRemarkUpdateInput,
  PriceBooksResponse,
  PriceBookSummary,
  LegacyPricingImportInput,
  LegacyPricingModule,
  LegacyPricingQuoteRequest,
  LegacyPricingQuoteResponse,
  LegacyPricingSourcesResponse,
  DubaiPriceDisplayActivateInput,
  DubaiSeaMarkupUpdateInput,
  DubaiPriceDisplayVersionListResponse,
  SouthAfricaLookupRequest,
  SouthAfricaLookupResponse,
  SouthAfricaRateRuleInput,
  SouthAfricaRateRuleSummary,
  PriceLookupRequest,
  PriceLookupResponse,
  LineShipmentPoolQuery,
  ShipmentInternalFlowLogResponse,
  LineShipmentPoolResponse,
  PricingQuoteRequest,
  PricingRuleCreateInput,
  PricingRuleQuoteRequest,
  PricingRuleQuoteResponse,
  PricingRuleSummary,
  QuoteResponse,
  ReceivableAuditBatchInput,
  ReceivableAuditBatchResult,
  ReceivableAuditCreateInput,
  ReceivableAuditExportRequest,
  ReceivableAuditExportResponse,
  ReceivableAuditListQuery,
  ReceivableAuditListResponse,
  ReceivableMatchRequestBatchInput,
  ReceivableMatchRequestUpdateInput,
  ReceivableMatchReviewInput,
  ReceivableReceiptMatchInput,
  ReceivableWaterReceiptCandidatesResponse,
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
  MarketProfitLedgerQuery,
  MarketProfitLedgerResponse,
  WarehouseProfitLedgerQuery,
  WarehouseProfitLedgerResponse,
  FinanceProfitLedgerQuery,
  FinanceProfitLedgerResponse,
  ProfitSettlementDetail,
  ProfitSettlementInput,
  ProfitSettlementListResponse,
  ProfitSettlementQuery,
  ProfitSettlementReleaseResult,
  VoucherImageUploadInput,
  VoucherImageUploadResponse,
  SurchargeCreateInput,
  SurchargeSummary,
  SiteSummary,
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
  ShipmentReviewBasicUpdateInput,
  ShipmentFinanceDetailSummary,
  ShipmentFinanceItemCreateInput,
  ShipmentRerouteInput,
  ShipmentRouteInput,
  BusinessCostFeeSummary,
  PayableFeeSummary,
  ShipmentFinanceItemUpdateInput,
  ShipmentDispatchInput,
  WarehouseDispatchDeclarationUpdateInput,
  WarehouseDispatchInboundNoUpdateInput,
  WarehouseHandoverPrintInput,
  WarehouseHandoverPrintResponse,
  ShipmentRestoreInput,
  ShipmentReviewDeleteInput,
  ShipmentReviewDetailSummary,
  ShipmentReviewRejectInput,
  ShipmentLabelSummary,
  ShipmentOperationalUpdateInput,
  CustomerServiceDataConfirmListQuery,
  CustomerServiceDataConfirmListResponse,
  CustomerServiceDataReviewInput,
  CustomerServiceDataReverseInput,
  CustomerServiceDataUpdateInput,
  CustomerServiceFinanceItemUpdateInput,
  CustomerServiceFinanceUpdatePreview,
  CustomerServiceFinanceUpdatePreviewRow,
  CustomerServiceTransferBatchInput,
  CustomerServiceTransferBatchResponse,
  ShipmentPaymentUpdateInput,
  TrackingEventInput,
  WarehouseConsolidationCreateInput,
  WarehouseConsolidationSummary,
  WarehouseManualReceiptCreateInput,
  WarehouseManualReceiptCreateResponse,
  WarehouseMachineImportResponse,
  WarehouseSameSpecReplenishInput,
  WarehouseSameSpecReplenishResponse,
  WarehousePackageCreateInput,
  WarehousePackageSplitInput,
  WarehousePackageSplitResponse,
  WarehousePackageSummary,
  WarehousePackageUpdateInput,
  WarehouseRentDetailQuery,
  WarehouseRentDetailResponse,
  WarehouseRentRuleEnabledInput,
  WarehouseRentRuleInput,
  WarehouseRentRuleSummary,
  WarehouseTallyLabelScanInput,
  WarehouseTallyLabelScanResponse,
  WarehouseTallyTaskCompleteInput,
  WarehouseTallyTaskCompletedCountUpdateInput,
  WarehouseTallyHistoricalAggregateCorrectionPreview,
  WarehouseTallyHistoricalAggregateCorrectionInput,
  WarehouseTallyHistoricalAggregateCorrectionResult,
  WarehouseTallyTaskCreateInput,
  WarehouseTallyRepeatStatisticsQuery,
  WarehouseTallyRepeatStatisticsResponse,
  WarehouseTallyTaskSummary,
  WarehouseTallyTaskUpdateInput
} from '@siyuan/shared';
import type {
  FinanceCatalogItemInput,
  FinanceCatalogItemSummary,
  FinanceCatalogListQuery,
  FinanceCatalogListResponse,
  FinanceCatalogReorderInput
} from '@siyuan/shared/finance-catalog';
import type {
  CommonTagCreateInput,
  CommonTagSummary,
  CommonTagUpdateInput,
  ProblemTicketCreateInput,
  ProblemTicketSummary
} from '@siyuan/shared/problem-ticket';
import type {
  AnnouncementAudienceOptions,
  AnnouncementCreateInput,
  AnnouncementSummary,
  NotificationActionTaskListResponse,
  NotificationListResponse,
  NotificationOperationsResponse,
  NotificationPreferenceSummary,
  NotificationUnreadSummary
} from './modules/notifications/notificationTypes';
import { AppShellClient } from './api/appShellClient';
import { AuditQueryClient } from './api/auditQueryClient';
import { CarrierTaskQueryClient } from './api/carrierTaskQueryClient';
import { MarkupQueryClient } from './api/markupQueryClient';
import { PriceBookQueryClient } from './api/priceBookQueryClient';
import { SystemDirectoryClient } from './api/systemDirectoryClient';
import { WarehouseQueryClient } from './api/warehouseQueryClient';

export type BuiltinRoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type RoleKey = BuiltinRoleKey | (string & {});
export const YOYO_ADMIN_ROLE_KEY = 'UG_796F796FE7AEA1E79086E591' as const;

export function isAdministratorRole(role: string | undefined): boolean {
  return role === 'ADMIN' || role === YOYO_ADMIN_ROLE_KEY;
}

export type UserTablePreferenceValue = Record<string, unknown>;

export type UserTablePreferenceSummary = {
  key: string;
  value: UserTablePreferenceValue;
  updatedAt: string;
};

export type PermissionKey =
  | 'data-scope:sales-own'
  | 'data-scope:misc-fee-all'
  | 'data-scope:misc-fee-warehouse-site'
  | 'data-scope:misc-fee-market'
  | `customer-service:${string}`
  | `tracking:${string}`
  | `finance:${string}`
  | `master-data:${string}`
  | `misc-fee:${string}`
  | 'operations:line-shipment:view'
  | 'operations:line-shipment:detail'
  | 'operations:line-shipment:process'
  | 'operations:line-shipment:status-update'
  | `operations:line-shipment:stage-edit-block:${string}`
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
  | 'business:order-entry:edit'
  | 'business:order-entry:business-cost'
  | 'business:order-entry:payable-fee'
  | 'business:order-entry:warehouse-package-select'
  | 'business:order-entry:create'
  | 'business:order-entry:draft-view'
  | 'business:order-entry:draft-edit'
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
  | 'business:review:view'
  | 'business:review:edit'
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
  | 'business:shipment:agent-weight-view'
  | 'business:shipment:export'
  | 'business:order-ai:view'
  | 'business:order-ai:assist'
  | 'business:order-ai:finance-context'
  | 'business:order-ai:all-order-context'
  | 'business:order-ai:export-result'
  | 'market:dashboard:view'
  | 'market:pending-routing:view'
  | 'market:pending-routing:route'
  | 'market:pending-routing:edit'
  | 'market:pending-routing:approve'
  | 'market:pending-routing:operation-log:view'
  | 'market:pending-routing:business-cost:view'
  | 'market:pending-routing:business-cost:create'
  | 'market:pending-routing:business-cost:edit'
  | 'market:pending-routing:business-cost:delete'
  | 'market:pending-routing:payable-cost:view'
  | 'market:pending-routing:payable-cost:create'
  | 'market:pending-routing:payable-cost:edit'
  | 'market:pending-routing:payable-cost:delete'
  | 'market:pending-routing:return-review'
  | 'market:routed:view'
  | 'market:routed:edit'
  | 'market:routed:reroute'
  | 'market:routed:routing-log:view'
  | 'market:routing-report:view'
  | 'market:routing-report:export'
  | 'warehouse:dashboard:view'
  | 'warehouse:today-receipt:view'
  | 'warehouse:today-receipt:edit'
  | 'warehouse:today-receipt:delete'
  | 'warehouse:today-receipt:manual-create'
  | 'warehouse:today-receipt:import'
  | 'warehouse:today-receipt:export'
  | 'warehouse:in-stock:view'
  | 'warehouse:in-stock:edit'
  | 'warehouse:in-stock:delete'
  | 'warehouse:in-stock:split'
  | 'warehouse:in-stock:tally'
  | 'warehouse:in-stock:order-entry'
  | 'warehouse:in-stock:import'
  | 'warehouse:in-stock:export'
  | 'warehouse:tally-pending:view'
  | 'warehouse:tally-pending:edit'
  | 'warehouse:tally-pending:cancel'
  | 'warehouse:tally-pending:process'
  | 'warehouse:tally-pending:complete-and-ship'
  | 'warehouse:tally-completed:view'
  | 'warehouse:tally-completed:print'
  | 'warehouse:tally-completed:download'
  | 'warehouse:tally-completed:scan'
  | 'warehouse:tally-completed:reverse'
  | 'warehouse:tally-completed:correct'
  | 'warehouse:dispatch-pending:view'
  | 'warehouse:dispatch-pending:edit'
  | 'warehouse:dispatch-pending:handover-print'
  | 'warehouse:dispatch-pending:label-manage'
  | 'warehouse:dispatch-pending:shipping-mark-confirm'
  | 'warehouse:dispatch-pending:confirm'
  | 'warehouse:outbounded:view'
  | 'warehouse:outbounded:export'
  | 'warehouse:rent-detail:view'
  | 'warehouse:rent-detail:export'
  | 'warehouse:rent-detail:edit'
  | 'warehouse:rent-detail:scope-self'
  | 'warehouse:rent-detail:scope-team'
  | 'warehouse:rent-detail:scope-site'
  | 'warehouse:rent-detail:scope-all'
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
  | 'finance:water-receipt:arrived-update'
  | 'finance:water-receipt:void'
  | 'finance:water-receipt:archive'
  | 'finance:water-receipt:export'
  | 'finance:water-receipt:voucher'
  | 'finance:water-receipt:view-all'
  | 'finance:water-receipt:detail'
  | 'finance:water-receipt:create'
  | 'finance:water-receipt:update'
  | 'finance:water-receipt:reverse-archive'
  | 'finance:water-receipt:voucher-view'
  | 'finance:water-receipt:voucher-upload'
  | 'finance:water-receipt:voucher-delete'
  | 'finance:water-receipt:view-sensitive'
  | 'finance:water-match:read'
  | 'finance:water-match:receivable-view'
  | 'finance:water-match:create'
  | 'finance:water-match:audit'
  | 'finance:water-match:reverse'
  | 'finance:water-match:cancel'
  | 'finance:water-match:adjust'
  | 'finance:water-match:history-view'
  | 'finance:water-match:difference-view'
  | 'finance:water-match:export'
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
  assignedRole?: RoleKey;
  roleLabel?: string;
  site?: string;
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
  administratorEquivalent?: boolean;
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
  sourceRoleKey?: RoleKey;
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
const CUSTOMER_SERVICE_DATA_CONFIRM_TIMEOUT_MS = 15_000;

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
  readonly auditQuery = new AuditQueryClient(<T>(path: string, init?: RequestInit) => this.request<T>(path, init));
  readonly carrierTaskQuery = new CarrierTaskQueryClient(<T>(path: string, init?: RequestInit) =>
    this.request<T>(path, init)
  );
  readonly markupQuery = new MarkupQueryClient(<T>(path: string, init?: RequestInit) =>
    this.request<T>(path, init)
  );
  readonly priceBookQuery = new PriceBookQueryClient(<T>(path: string, init?: RequestInit) =>
    this.request<T>(path, init)
  );
  readonly systemDirectory = new SystemDirectoryClient(<T>(path: string, init?: RequestInit) =>
    this.request<T>(path, init)
  );
  readonly warehouseQuery = new WarehouseQueryClient(<T>(path: string, init?: RequestInit) =>
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

  async me(): Promise<Principal> {
    return this.request('/auth/me');
  }

  async currentSession(): Promise<Pick<Session, 'user' | 'permissions'>> {
    return this.request('/auth/session');
  }

  /**
   * Compatibility facades for pages that still call the legacy flat client.
   * The request/response contracts live in the focused API clients; keeping
   * these delegates avoids a flag-day UI migration and does not alter routes,
   * permissions, or response shaping.
   */
  auditLogs(query: Parameters<AuditQueryClient['auditLogs']>[0] = {}) {
    return this.auditQuery.auditLogs(query);
  }

  priceBookRows(
    priceBookId?: string,
    query: Parameters<PriceBookQueryClient['priceBookRows']>[1] = {}
  ) {
    return this.priceBookQuery.priceBookRows(priceBookId, query);
  }

  legacyPricingMeta() {
    return this.priceBookQuery.legacyPricingMeta();
  }

  southAfricaRateRules() {
    return this.priceBookQuery.southAfricaRateRules();
  }

  dubaiPriceDisplay() {
    return this.priceBookQuery.dubaiPriceDisplay();
  }

  dubaiPriceDisplayVersions() {
    return this.priceBookQuery.dubaiPriceDisplayVersions();
  }

  priceBookRuleRefreshProgress() {
    return this.priceBookQuery.priceBookRuleRefreshProgress();
  }

  pricingSyncHealth(query: Parameters<PriceBookQueryClient['pricingSyncHealth']>[0] = {}) {
    return this.priceBookQuery.pricingSyncHealth(query);
  }

  agentMarkupRules(query: Parameters<MarkupQueryClient['agentMarkupRules']>[0] = {}) {
    return this.markupQuery.agentMarkupRules(query);
  }

  exportAgentMarkupRules(query: Parameters<MarkupQueryClient['exportAgentMarkupRules']>[0] = {}) {
    return this.markupQuery.exportAgentMarkupRules(query);
  }

  warehouseTallyTaskHistoryChain(packageId: string) {
    return this.warehouseQuery.warehouseTallyTaskHistoryChain(packageId);
  }

  async userTablePreferences(): Promise<UserTablePreferenceSummary[]> {
    return this.request('/user-table-preferences');
  }

  async updateUserTablePreference(key: string, value: UserTablePreferenceValue): Promise<UserTablePreferenceSummary> {
    return this.request(`/user-table-preferences/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  }

  async deleteUserTablePreference(key: string): Promise<{ ok: true }> {
    return this.request(`/user-table-preferences/${encodeURIComponent(key)}`, { method: 'DELETE' });
  }

  async downloadProtectedAsset(url: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const assetUrl = resolveApiAssetUrl(url);
    if (!assetUrl) throw new Error('文件地址不存在');
    const response = await fetch(assetUrl, { headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) {
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    return response.blob();
  }

  async updateProfile(input: ProfileUpdateInput): Promise<Principal> {
    return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(input) });
  }

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<{ ok: true }> {
    return this.request('/auth/change-password', { method: 'POST', body: JSON.stringify(input) });
  }

  async shipments(): Promise<Shipment[]> {
    return this.request('/shipments?costScope=routed');
  }

  async marketShipments(): Promise<Shipment[]> {
    return this.request('/market/shipments?costScope=routed');
  }

  async marketRoutingOptions(): Promise<Pick<MasterDataSnapshot, 'agents' | 'agentChannels' | 'channels'>> {
    return this.request('/market/routing-options');
  }

  async marketRoutingReportRows(): Promise<Shipment[]> {
    return this.request('/market/routing-report/rows');
  }

  async warehouseDispatchShipments(): Promise<Shipment[]> {
    return this.request('/warehouse/dispatch-shipments');
  }

  async updateWarehouseDispatchDeclaration(id: string, input: WarehouseDispatchDeclarationUpdateInput): Promise<Shipment> {
    return this.request(`/warehouse/dispatch-shipments/${id}/declaration`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async updateWarehouseDispatchInboundNo(id: string, input: WarehouseDispatchInboundNoUpdateInput): Promise<Shipment> {
    return this.request(`/warehouse/dispatch-shipments/${id}/inbound-no`, { method: 'PATCH', body: JSON.stringify(input) });
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

  async shipmentPackageDetail(id: string): Promise<Pick<ShipmentReviewDetailSummary, 'shipment' | 'packages'>> {
    return this.request(`/shipments/${id}/package-detail`);
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

  async deleteShipmentReview(id: string, input: ShipmentReviewDeleteInput): Promise<{ id: string; deleted: true }> {
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
    if (query.shipmentId?.trim()) {
      params.set('shipmentId', query.shipmentId.trim());
    }
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

  async dispatchShipment(id: string, body: ShipmentDispatchInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/dispatch`, { method: 'POST', body: JSON.stringify(body) });
  }

  async printWarehouseHandover(input: WarehouseHandoverPrintInput): Promise<WarehouseHandoverPrintResponse> {
    return this.request('/warehouse/handover/print', { method: 'POST', body: JSON.stringify(input) });
  }

  async approveShipmentBusinessData(id: string, body: CustomerServiceDataReviewInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/business-data/approve`, { method: 'POST', body: JSON.stringify(body) });
  }

  async approveShipmentAgentData(id: string, body: CustomerServiceDataReviewInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/agent-data/approve`, { method: 'POST', body: JSON.stringify(body) });
  }

  async updateShipmentBusinessData(id: string, body: CustomerServiceDataUpdateInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/business-data`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async customerServiceFinanceUpdatePreview(id: string, kind: 'business' | 'agent' = 'business'): Promise<CustomerServiceFinanceUpdatePreview> {
    return this.request(`/shipments/${id}/customer-service/cost-preview?kind=${encodeURIComponent(kind)}`);
  }

  async updateCustomerServiceFinanceItem(id: string, feeId: string, kind: 'business' | 'agent', input: CustomerServiceFinanceItemUpdateInput): Promise<CustomerServiceFinanceUpdatePreviewRow> {
    return this.request(`/shipments/${id}/customer-service/finance-items/${feeId}?kind=${encodeURIComponent(kind)}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async updateShipmentAgentData(id: string, body: CustomerServiceDataUpdateInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/agent-data`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async reverseShipmentBusinessData(id: string, body: CustomerServiceDataReverseInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/business-data/reverse`, { method: 'POST', body: JSON.stringify(body) });
  }

  async reverseShipmentAgentData(id: string, body: CustomerServiceDataReverseInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/agent-data/reverse`, { method: 'POST', body: JSON.stringify(body) });
  }

  async approveShipmentAllData(id: string, body: CustomerServiceDataReviewInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/data-confirmation/approve-all`, { method: 'POST', body: JSON.stringify(body) });
  }

  async reverseShipmentAllData(id: string, body: CustomerServiceDataReverseInput): Promise<Shipment> {
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

  async customerServiceShipments(includeProblem = false): Promise<Shipment[]> {
    return this.request(`/customer-service/shipments${includeProblem ? '?includeProblem=true' : ''}`);
  }

  async customerServiceTransferShipments(): Promise<Shipment[]> {
    return this.request('/customer-service/transfer-shipments');
  }

  async customerServiceDataConfirmShipments(query: CustomerServiceDataConfirmListQuery = {}): Promise<CustomerServiceDataConfirmListResponse> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), CUSTOMER_SERVICE_DATA_CONFIRM_TIMEOUT_MS);
    try {
      return await this.request(`/customer-service/data-confirm-shipments${this.queryString(query)}`, { signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('数据确认列表加载超时，请检查网络后重试');
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
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

  async downloadShipmentLabel(id: string, labelId: string): Promise<{ fileName: string; blob: Blob }> {
    return this.downloadAuthorizedFile(`/shipments/${encodeURIComponent(id)}/labels/${encodeURIComponent(labelId)}/file`, '面单.pdf', '面单下载失败，请检查网络后重试');
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

  async downloadShipmentInvoiceTemplate(id: string, templateId?: string): Promise<{ fileName: string; blob: Blob }> {
    const query = templateId ? `?templateId=${encodeURIComponent(templateId)}` : '';
    return this.downloadAuthorizedFile(`/shipments/${encodeURIComponent(id)}/invoice-template/download${query}`, '发票模板.xlsx', '发票模板下载失败，请检查网络后重试');
  }

  async downloadShipmentBusinessInvoice(id: string): Promise<{ fileName: string; blob: Blob }> {
    return this.downloadAuthorizedFile(`/shipments/${encodeURIComponent(id)}/invoice/download`, '业务发票.xlsx', '业务发票下载失败，请检查网络后重试');
  }

  private async downloadAuthorizedFile(path: string, fallbackName: string, networkErrorMessage: string): Promise<{ fileName: string; blob: Blob }> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
        throw new Error(networkErrorMessage);
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
    let fileName = fallbackName;
    try {
      fileName = encodedName ? decodeURIComponent(encodedName) : plainName || fileName;
    } catch {
      fileName = plainName || fileName;
    }
    return { fileName, blob: await response.blob() };
  }

  async addTrackingEvent(id: string, input: TrackingEventInput): Promise<Shipment> {
    return this.request(`/shipments/${id}/tracking-events`, { method: 'POST', body: JSON.stringify(input) });
  }

  async addOperationTrackingEvent(id: string, input: TrackingEventInput): Promise<Shipment> {
    return this.request(`/operations/line-shipments/${id}/tracking-events`, { method: 'POST', body: JSON.stringify(input) });
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

  async problemTicketCommonTags(): Promise<CommonTagSummary[]> {
    return this.request('/customer-service/problem-tags');
  }

  async createProblemTicketCommonTag(input: CommonTagCreateInput): Promise<CommonTagSummary> {
    return this.request('/customer-service/problem-tags', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateProblemTicketCommonTag(id: string, input: CommonTagUpdateInput): Promise<CommonTagSummary> {
    return this.request(`/customer-service/problem-tags/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteProblemTicketCommonTag(id: string): Promise<CommonTagSummary> {
    return this.request(`/customer-service/problem-tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async createProblemTicket(id: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    return this.request(`/shipments/${id}/problem-tickets`, { method: 'POST', body: JSON.stringify(input) });
  }

  async createBusinessProblemTicket(id: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    return this.request(`/business/shipments/${id}/problem-tickets`, { method: 'POST', body: JSON.stringify(input) });
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

  async createPricingRule(input: PricingRuleCreateInput): Promise<PricingRuleSummary> {
    return this.request('/pricing/rules', { method: 'POST', body: JSON.stringify(input) });
  }

  async updatePricingRuleEnabled(id: string, input: EnabledUpdateInput): Promise<PricingRuleSummary> {
    return this.request(`/pricing/rules/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async quotePricingRule(input: PricingRuleQuoteRequest): Promise<PricingRuleQuoteResponse> {
    return this.request('/pricing/rules/quote', { method: 'POST', body: JSON.stringify(input) });
  }

  async priceBooks(options: { includeRows?: boolean; targetModule?: PriceBookImportTargetModule | 'unclassified'; signal?: AbortSignal } = {}): Promise<PriceBooksResponse> {
    const params = new globalThis.URLSearchParams();
    if (options.includeRows === false) params.set('includeRows', 'false');
    if (options.targetModule) params.set('targetModule', options.targetModule);
    return this.request(`/pricing/books${params.toString() ? `?${params.toString()}` : ''}`, { signal: options.signal });
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

  async priceBookImportJobs(query: PriceBookImportJobListQuery = {}): Promise<PriceBookImportJobListResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) params.set(key, String(value));
    });
    return this.request(`/pricing/books/import-jobs${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async retryPriceBookImportJob(id: string): Promise<PriceBookImportJobResponse> {
    return this.request(`/pricing/books/import-jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' });
  }

  async markupRoutes(priceBookId: string, query: MarkupRouteListQuery = {}): Promise<MarkupRouteListResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.filter((item) => String(item).trim()).forEach((item) => params.append(key, String(item)));
      } else if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    return this.request(`/pricing/books/${priceBookId}/markup-routes${params.toString() ? `?${params.toString()}` : ''}`);
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

  async batchDeletePriceBooks(input: PriceBookBatchDeleteInput): Promise<PriceBookBatchDeleteResponse> {
    return this.request('/pricing/books/batch-delete', { method: 'POST', body: JSON.stringify(input) });
  }

  async lookupPrice(input: PriceLookupRequest): Promise<PriceLookupResponse> {
    return this.request('/pricing/lookup', { method: 'POST', body: JSON.stringify(input) });
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

  async dubaiPriceDisplayPageImage(path: string): Promise<Blob> {
    if (!path.startsWith('/pricing/legacy/dubai-air-sea/display-pages/')) throw new Error('迪拜价格图片地址无效');
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}${path}`, { headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) throw new Error(formatApiErrorMessage(await response.text(), response.status));
    return response.blob();
  }

  async dubaiPriceDisplayVersionPageImage(versionId: string, pageId: string): Promise<Blob> {
    const path = `/pricing/legacy/dubai-air-sea/display-versions/${encodeURIComponent(versionId)}/pages/${encodeURIComponent(pageId)}/image`;
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}${path}`, { headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error(formatApiErrorMessage(await response.text(), response.status));
    }
    if (!response.ok) throw new Error(formatApiErrorMessage(await response.text(), response.status));
    return response.blob();
  }

  async activateDubaiPriceDisplayVersion(id: string, input: DubaiPriceDisplayActivateInput): Promise<DubaiPriceDisplayVersionListResponse> {
    return this.request(`/pricing/legacy/dubai-air-sea/display-versions/${id}/activate`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async retryDubaiPriceDisplayVersion(id: string): Promise<DubaiPriceDisplayVersionListResponse> {
    return this.request(`/pricing/legacy/dubai-air-sea/display-versions/${id}/retry`, { method: 'POST' });
  }

  async updateDubaiSeaMarkup(id: string, input: DubaiSeaMarkupUpdateInput): Promise<DubaiPriceDisplayVersionListResponse> {
    return this.request(`/pricing/legacy/dubai-air-sea/display-versions/${id}/sea-markup`, { method: 'POST', body: JSON.stringify(input) });
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

  async previewMarkupRoute(input: MarkupRoutePreviewInput): Promise<MarkupRoutePreviewResponse> {
    return this.request('/pricing/markup-rules/route-preview', { method: 'POST', body: JSON.stringify(input) });
  }

  async previewMarkupRoutesBatch(input: MarkupRoutePreviewBatchInput): Promise<MarkupRoutePreviewBatchResponse> {
    return this.request('/pricing/markup-rules/route-preview/batch', { method: 'POST', body: JSON.stringify(input) });
  }

  async replaceMarkupRouteTiers(input: MarkupRouteTierReplaceInput): Promise<MarkupRoutePreviewResponse> {
    return this.request('/pricing/markup-rules/route-tiers', { method: 'POST', body: JSON.stringify(input) });
  }

  async replaceMarkupRouteTiersBatch(input: MarkupRouteTierBatchReplaceInput): Promise<MarkupRouteTierBatchReplaceResponse> {
    return this.request('/pricing/markup-rules/route-tiers/batch', { method: 'POST', body: JSON.stringify(input) });
  }

  async migrateLegacyMarkupRouteScopes(): Promise<{ migratedCount: number; archivedCount: number; skippedCount: number }> {
    return this.request('/pricing/markup-rules/migrate-pricebook-scopes', { method: 'POST' });
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

  async warehouseRentDetails(query: WarehouseRentDetailQuery = {}): Promise<WarehouseRentDetailResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach((item) => params.append(key, String(item)));
        return;
      }
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/rent-details${search ? `?${search}` : ''}`);
  }

  async exportWarehouseRentDetails(query: WarehouseRentDetailQuery = {}): Promise<WarehouseRentDetailResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/rent-details/export${search ? `?${search}` : ''}`);
  }

  async warehouseRentRules(): Promise<WarehouseRentRuleSummary[]> {
    return this.request('/warehouse/rent-rules');
  }

  async createWarehouseRentRule(input: WarehouseRentRuleInput): Promise<WarehouseRentRuleSummary> {
    return this.request('/warehouse/rent-rules', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateWarehouseRentRule(id: string, input: WarehouseRentRuleInput): Promise<WarehouseRentRuleSummary> {
    return this.request(`/warehouse/rent-rules/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteWarehouseRentRule(id: string): Promise<WarehouseRentRuleSummary> {
    return this.request(`/warehouse/rent-rules/${id}`, { method: 'DELETE' });
  }

  async updateWarehouseRentRuleEnabled(
    id: string,
    input: WarehouseRentRuleEnabledInput
  ): Promise<WarehouseRentRuleSummary> {
    return this.request(`/warehouse/rent-rules/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createWarehousePackage(input: WarehousePackageCreateInput): Promise<WarehousePackageSummary> {
    return this.request('/warehouse/packages', { method: 'POST', body: JSON.stringify(input) });
  }

  async warehouseMachineImport(file: File, commit = false): Promise<WarehouseMachineImportResponse> {
    const body = new FormData();
    body.append('file', file);
    body.append('commit', String(commit));
    return this.request('/warehouse/packages/machine-import', { method: 'POST', body });
  }

  async createWarehouseManualReceipt(input: WarehouseManualReceiptCreateInput): Promise<WarehouseManualReceiptCreateResponse> {
    return this.request('/warehouse/packages/manual-receipt', { method: 'POST', body: JSON.stringify(input) });
  }

  async replenishWarehouseSameSpec(id: string, input: WarehouseSameSpecReplenishInput): Promise<WarehouseSameSpecReplenishResponse> {
    return this.request(`/warehouse/packages/${id}/same-spec-replenish`, { method: 'POST', body: JSON.stringify(input) });
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

  async warehouseTallyRepeatStatistics(
    query: WarehouseTallyRepeatStatisticsQuery = {}
  ): Promise<WarehouseTallyRepeatStatisticsResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/tally-repeat-statistics${search ? `?${search}` : ''}`);
  }

  async createWarehouseTallyTask(input: WarehouseTallyTaskCreateInput): Promise<WarehouseTallyTaskSummary> {
    return this.request('/warehouse/tally-tasks', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateWarehouseTallyTask(id: string, input: WarehouseTallyTaskUpdateInput): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async startWarehouseTallyTask(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/start`, { method: 'POST' });
  }

  async cancelWarehouseTallyTask(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/cancel`, { method: 'POST' });
  }

  async restartWarehouseTallyProblemTask(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/restart-problem`, { method: 'POST' });
  }

  async completeWarehouseTallyTask(id: string, input: WarehouseTallyTaskCompleteInput): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/complete`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateCompletedWarehouseTallyTaskCount(
    id: string,
    input: WarehouseTallyTaskCompletedCountUpdateInput
  ): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/completed-count`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  async reverseReviewWarehouseTallyTask(id: string): Promise<WarehouseTallyTaskSummary> {
    return this.request(`/warehouse/tally-tasks/${id}/reverse-review`, { method: 'POST' });
  }

  async warehouseTallyHistoricalAggregateCorrectionPreview(id: string): Promise<WarehouseTallyHistoricalAggregateCorrectionPreview> {
    return this.request(`/warehouse/tally-tasks/${id}/historical-aggregate-correction`);
  }

  async correctWarehouseTallyHistoricalAggregate(
    id: string,
    input: WarehouseTallyHistoricalAggregateCorrectionInput
  ): Promise<WarehouseTallyHistoricalAggregateCorrectionResult> {
    return this.request(`/warehouse/tally-tasks/${id}/historical-aggregate-correction`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
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

  async applyWarehouseTallyTaskLabel(input: WarehouseTallyLabelScanInput): Promise<WarehouseTallyLabelScanResponse> {
    return this.request('/warehouse/tally-tasks/label-scan', { method: 'POST', body: JSON.stringify(input) });
  }

  async createShipmentFinanceItem(id: string, input: ShipmentFinanceItemCreateInput): Promise<ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/finance-items`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateShipmentFinanceItem(id: string, feeId: string, input: ShipmentFinanceItemUpdateInput): Promise<ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/finance-items/${feeId}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createMarketRoutingCost(id: string, input: ShipmentFinanceItemCreateInput): Promise<PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/market/shipments/${id}/routing-costs`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateMarketRoutingCost(id: string, feeId: string, input: ShipmentFinanceItemUpdateInput): Promise<PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/market/shipments/${id}/routing-costs/${feeId}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteShipmentFinanceItem(id: string, feeId: string): Promise<ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/finance-items/${feeId}`, { method: 'DELETE' });
  }

  async createPendingReviewBusinessCost(id: string, input: ShipmentFinanceItemCreateInput): Promise<BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/review-business-costs`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updatePendingReviewBusinessCost(id: string, feeId: string, input: ShipmentFinanceItemUpdateInput): Promise<BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/review-business-costs/${feeId}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deletePendingReviewBusinessCost(id: string, feeId: string): Promise<BusinessCostFeeSummary> {
    return this.request(`/shipments/${id}/review-business-costs/${feeId}`, { method: 'DELETE' });
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

  async createFinanceProductName(
    input: Pick<FinanceCatalogItemInput, 'name' | 'enabled' | 'remark'>
  ): Promise<FinanceCatalogItemSummary> {
    return this.request('/finance/catalog/product-name', {
      method: 'POST',
      body: JSON.stringify(input)
    });
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

  async payerBankAccounts(query: PayerBankAccountListQuery = {}): Promise<PayerBankAccountListResponse> {
    return this.request(`/master-data/payer-bank-accounts${this.queryString(query)}`);
  }

  async createPayerBankAccount(input: PayerBankAccountInput): Promise<PayerBankAccountSummary> {
    return this.request('/master-data/payer-bank-accounts', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async updatePayerBankAccount(
    id: string,
    input: Partial<PayerBankAccountInput>
  ): Promise<PayerBankAccountSummary> {
    return this.request(`/master-data/payer-bank-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    });
  }

  async deletePayerBankAccount(id: string): Promise<{ id: string; deleted: boolean }> {
    return this.request(`/master-data/payer-bank-accounts/${id}`, { method: 'DELETE' });
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

  async miscFees(query: MiscFeeQuery = {}): Promise<MiscFeeListResponse> {
    return this.request(`/misc-fees${this.queryString(query)}`);
  }

  async miscFeeDeliveryShipmentOptions(customerCode: string): Promise<MiscFeeDeliveryShipmentOption[]> {
    return this.request(`/misc-fees/delivery/shipment-options${this.queryString({ customerCode })}`);
  }

  async previewKuayueImport(file: File): Promise<KuayueImportPreview> {
    const body = new FormData();
    body.append('file', file);
    return this.request('/misc-fees/kuayue/import-preview', { method: 'POST', body });
  }

  async commitKuayueImport(input: KuayueImportCommitInput): Promise<KuayueImportCommitResult> {
    return this.request('/misc-fees/kuayue/import-commit', { method: 'POST', body: JSON.stringify(input) });
  }

  async kuayueImportLines(query: KuayueImportLineQuery = {}): Promise<KuayueImportLineListResponse> {
    return this.request(`/misc-fees/kuayue/import-lines${this.queryString(query)}`);
  }

  async claimKuayueImportLine(lineId: string, input: KuayueImportLineClaimInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/kuayue/import-lines/${lineId}/claim`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async miscFee(id: string): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}`);
  }

  async downloadMiscFeeAttachment(attachmentId: string): Promise<{ fileName: string; blob: Blob }> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/misc-fee-attachments/${encodeURIComponent(attachmentId)}/file`, { headers });
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
    let fileName = '杂费附件';
    try {
      fileName = encodedName ? decodeURIComponent(encodedName) : plainName || fileName;
    } catch {
      fileName = plainName || fileName;
    }
    return { fileName, blob: await response.blob() };
  }

  async createMiscFee(input: MiscFeeInput): Promise<MiscFeeDetail> {
    return this.request('/misc-fees', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateMiscFee(id: string, input: MiscFeeUpdateInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async matchMiscFee(id: string, input: MiscFeeMatchInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}/match`, { method: 'POST', body: JSON.stringify(input) });
  }

  async assignMiscFeeBusinessCost(id: string, input: MiscFeeBusinessAssignmentInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}/business-assignment`, { method: 'POST', body: JSON.stringify(input) });
  }

  async confirmMiscFee(id: string, input: MiscFeeActionInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}/confirm`, { method: 'POST', body: JSON.stringify(input) });
  }

  async auditMiscFee(id: string, input: MiscFeeActionInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}/audit`, { method: 'POST', body: JSON.stringify(input) });
  }

  async directPayAndArchiveKuayueMiscFee(id: string, input: MiscFeeActionInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}/direct-paid-archive`, { method: 'POST', body: JSON.stringify(input) });
  }

  async reverseAuditMiscFee(id: string, input: MiscFeeActionInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}/reverse-audit`, { method: 'POST', body: JSON.stringify(input) });
  }

  async voidMiscFee(id: string, input: MiscFeeVoidInput): Promise<MiscFeeDetail> {
    return this.request(`/misc-fees/${id}/void`, { method: 'POST', body: JSON.stringify(input) });
  }

  async createMiscFeeHangRequest(id: string, input: MiscFeeHangRequestInput): Promise<MiscFeeHangRequestSummary> {
    return this.request(`/misc-fees/${id}/hang-requests`, { method: 'POST', body: JSON.stringify(input) });
  }

  async createMiscFeeHangRequestWithFile(
    id: string,
    input: { version: number; remark?: string; idempotencyKey?: string; purchase?: boolean; file?: File }
  ): Promise<MiscFeeHangRequestSummary> {
    const body = new FormData();
    body.append('version', String(input.version));
    if (input.remark) body.append('remark', input.remark);
    if (input.idempotencyKey) body.append('idempotencyKey', input.idempotencyKey);
    if (input.purchase) body.append('purchase', 'true');
    if (input.file) body.append('file', input.file);
    return this.request(`/misc-fees/${id}/hang-requests-with-file`, { method: 'POST', body });
  }

  async applyMiscFeePurchasePayment(id: string, input: MiscFeeHangRequestInput): Promise<MiscFeeHangRequestSummary> {
    return this.request(`/misc-fees/${id}/purchase-payment-request`, { method: 'POST', body: JSON.stringify(input) });
  }

  async miscFeeHangRequests(query: MiscFeeHangQuery = {}): Promise<MiscFeeHangListResponse> {
    return this.request(`/misc-fee-hang-requests${this.queryString(query)}`);
  }

  async miscFeeTallyDue(customerCode: string): Promise<MiscFeeTallyDueSummary> {
    return this.request(`/misc-fees/tally/due${this.queryString({ customerCode })}`);
  }

  async approveMiscFeeHangRequest(id: string, input: MiscFeeActionInput): Promise<MiscFeeHangRequestSummary> {
    return this.request(`/misc-fee-hang-requests/${id}/approve`, { method: 'POST', body: JSON.stringify(input) });
  }

  async batchApproveMiscFeeHangRequests(input: MiscFeeHangBatchApproveInput): Promise<MiscFeeHangBatchApproveResult> {
    return this.request('/misc-fee-hang-requests/batch-approve', { method: 'POST', body: JSON.stringify(input) });
  }

  async rejectMiscFeeHangRequest(id: string, input: MiscFeeActionInput): Promise<MiscFeeHangRequestSummary> {
    return this.request(`/misc-fee-hang-requests/${id}/reject`, { method: 'POST', body: JSON.stringify(input) });
  }

  async withdrawMiscFeeHangRequest(id: string, input: MiscFeeActionInput): Promise<MiscFeeHangRequestSummary> {
    return this.request(`/misc-fee-hang-requests/${id}/withdraw`, { method: 'POST', body: JSON.stringify(input) });
  }

  async miscFeeMarketProfitLedger(query: MarketProfitLedgerQuery): Promise<MarketProfitLedgerResponse> {
    return this.request(`/misc-fees/market-profit/ledger${this.queryString(query)}`);
  }

  async miscFeeWarehouseProfitLedger(query: WarehouseProfitLedgerQuery): Promise<WarehouseProfitLedgerResponse> {
    return this.request(`/misc-fees/warehouse-profit/ledger${this.queryString(query)}`);
  }

  async miscFeeFinanceProfitLedger(query: FinanceProfitLedgerQuery): Promise<FinanceProfitLedgerResponse> {
    return this.request(`/misc-fees/finance-profit/ledger${this.queryString(query)}`);
  }

  async exportMiscFeeFinanceProfitLedger(query: FinanceProfitLedgerQuery): Promise<FinanceProfitLedgerResponse> {
    return this.request('/misc-fees/finance-profit/export', { method: 'POST', body: JSON.stringify(query) });
  }

  async miscFeeProfitSettlements(query: ProfitSettlementQuery): Promise<ProfitSettlementListResponse> {
    return this.request(`/misc-fee-profit-settlements${this.queryString(query)}`);
  }

  async miscFeeProfitSettlement(id: string): Promise<ProfitSettlementDetail> {
    return this.request(`/misc-fee-profit-settlements/${id}`);
  }

  async createMiscFeeProfitSettlement(input: ProfitSettlementInput): Promise<ProfitSettlementDetail> {
    return this.request('/misc-fee-profit-settlements', { method: 'POST', body: JSON.stringify(input) });
  }

  async transitionMiscFeeProfitSettlement(
    id: string,
    action: 'submit' | 'audit' | 'reverse-audit' | 'archive',
    input: MiscFeeActionInput
  ): Promise<ProfitSettlementDetail> {
    return this.request(`/misc-fee-profit-settlements/${id}/${action}`, { method: 'POST', body: JSON.stringify(input) });
  }

  async recomputeMiscFeeProfitSettlement(id: string, input: MiscFeeActionInput): Promise<ProfitSettlementDetail> {
    return this.request(`/misc-fee-profit-settlements/${id}/recompute`, { method: 'POST', body: JSON.stringify(input) });
  }

  async releaseMiscFeeProfitSettlement(id: string, input: MiscFeeActionInput): Promise<ProfitSettlementReleaseResult> {
    return this.request(`/misc-fee-profit-settlements/${id}/release`, { method: 'POST', body: JSON.stringify(input) });
  }

  async createPaymentApplications(input: PaymentApplicationCreateInput, voucherFile?: File): Promise<PaymentApplicationSummary[]> {
    if (!voucherFile) {
      return this.request('/finance/payment-applications', { method: 'POST', body: JSON.stringify(input) });
    }
    const body = new FormData();
    body.append('payload', JSON.stringify(input));
    body.append('voucherFile', voucherFile, voucherFile.name);
    return this.request('/finance/payment-applications', { method: 'POST', body });
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

  async deletePendingPaymentBillVoucher(id: string): Promise<{ deleted: true }> {
    return this.request(`/finance/pending-payment-bill-vouchers/${id}`, { method: 'DELETE' });
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

  async waterReceiptSiteOptions(): Promise<SiteSummary[]> {
    return this.request('/finance/water-receipts/site-options');
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

  async receivableWaterReceiptCandidates(id: string): Promise<ReceivableWaterReceiptCandidatesResponse> {
    return this.request(`/finance/receivable-audits/${id}/water-receipt-candidates`);
  }

  async matchWaterReceiptOrders(id: string, input: WaterReceiptMatchOrdersInput): Promise<WaterReceiptListResponse['rows'][number]> {
    return this.request(`/finance/water-receipts/${id}/match-orders`, { method: 'POST', body: JSON.stringify(input) });
  }

  async approveReceivableMatchRequest(id: string): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-match-requests/${id}/approve`, { method: 'POST' });
  }

  async updateReceivableMatchRequest(id: string, input: ReceivableMatchRequestUpdateInput): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-match-requests/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteReceivableMatchRequest(id: string): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-match-requests/${id}`, { method: 'DELETE' });
  }

  async reverseReceivableMatchRequest(id: string, input: ReceivableMatchReviewInput = {}): Promise<ReceivableAuditSummary> {
    return this.request(`/finance/receivable-match-requests/${id}/reverse-audit`, { method: 'POST', body: JSON.stringify(input) });
  }

  async batchApproveReceivableMatchRequests(input: ReceivableMatchRequestBatchInput): Promise<ReceivableAuditBatchResult> {
    return this.request('/finance/receivable-match-requests/batch-approve', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchReverseReceivableMatchRequests(input: ReceivableMatchRequestBatchInput): Promise<ReceivableAuditBatchResult> {
    return this.request('/finance/receivable-match-requests/batch-reverse-audit', { method: 'POST', body: JSON.stringify(input) });
  }

  async batchDeleteReceivableMatchRequests(input: ReceivableMatchRequestBatchInput): Promise<ReceivableAuditBatchResult> {
    return this.request('/finance/receivable-match-requests/batch-delete', { method: 'POST', body: JSON.stringify(input) });
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

  async customerSources(query: CustomerSourceListQuery = {}): Promise<CustomerSourceListResponse> {
    const params = new globalThis.URLSearchParams();
    if (query.keyword?.trim()) params.set('keyword', query.keyword.trim());
    if (query.enabledOnly !== undefined) params.set('enabledOnly', String(query.enabledOnly));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/master-data/customer-sources${suffix}`);
  }

  async createCustomerSource(input: CustomerSourceInput): Promise<CustomerSourceSummary> {
    return this.request('/master-data/customer-sources', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateCustomerSource(id: string, input: Partial<CustomerSourceInput>): Promise<CustomerSourceSummary> {
    return this.request(`/master-data/customer-sources/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteCustomerSource(id: string): Promise<{ id: string; deleted: boolean }> {
    return this.request(`/master-data/customer-sources/${id}`, { method: 'DELETE' });
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

  async deleteChannels(input: { ids: string[] }): Promise<ChannelDeleteResponse> {
    return this.request('/master-data/channels/batch-delete', { method: 'POST', body: JSON.stringify(input) });
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

  async deleteRoleGroup(role: RoleKey): Promise<RolePermissionRow> {
    return this.request(`/system/roles/${role}`, { method: 'DELETE' });
  }

  async staffAccounts(query: StaffAccountQuery = {}): Promise<StaffAccountSummary[]> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return this.request(`/system/staff-accounts${params.toString() ? `?${params.toString()}` : ''}`);
  }

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

  async copyRolePermissions(role: RoleKey, sourceRoleKey: RoleKey): Promise<RolePermissionRow> {
    return this.request(`/system/roles/${role}/permissions/copy`, {
      method: 'PUT',
      body: JSON.stringify({ sourceRoleKey })
    });
  }

  async notificationSummary(): Promise<NotificationUnreadSummary> {
    return this.request('/notifications/summary');
  }

  async notifications(query: { status?: 'ALL' | 'UNREAD' | 'ARCHIVED'; category?: string; keyword?: string; page?: number; pageSize?: number } = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    if (query.status && query.status !== 'ALL') params.set('status', query.status);
    if (query.category && query.category !== 'ALL') params.set('category', query.category);
    if (query.keyword?.trim()) params.set('keyword', query.keyword.trim());
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    const suffix = params.toString();
    return this.request(`/notifications${suffix ? `?${suffix}` : ''}`);
  }

  async notificationActionTasks(): Promise<NotificationActionTaskListResponse> {
    return this.request('/notifications/action-tasks');
  }

  async markNotificationRead(id: string): Promise<{ ok: true }> {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead(): Promise<{ ok: true; updatedCount: number }> {
    return this.request('/notifications/read-all', { method: 'POST' });
  }

  async archiveNotification(id: string): Promise<{ ok: true }> {
    return this.request(`/notifications/${id}/archive`, { method: 'PATCH' });
  }

  async restoreNotification(id: string): Promise<{ ok: true }> {
    return this.request(`/notifications/${id}/restore`, { method: 'PATCH' });
  }

  async acknowledgeNotification(id: string): Promise<{ ok: true }> {
    return this.request(`/notifications/${id}/acknowledge`, { method: 'POST' });
  }

  async notificationPreferences(): Promise<NotificationPreferenceSummary[]> {
    return this.request('/notifications/preferences');
  }

  async updateNotificationPreferences(items: Array<{ category: string; enabled: boolean }>): Promise<NotificationPreferenceSummary[]> {
    return this.request('/notifications/preferences', { method: 'PATCH', body: JSON.stringify({ items }) });
  }

  async notificationOperations(status?: string): Promise<NotificationOperationsResponse> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    return this.request(`/system/notification-operations${params.size ? `?${params.toString()}` : ''}`);
  }

  async retryNotificationOperation(id: string): Promise<{ ok: true }> {
    return this.request(`/system/notification-operations/${id}/retry`, { method: 'POST' });
  }

  async announcementAudienceOptions(): Promise<AnnouncementAudienceOptions> {
    return this.request('/system/announcements/audience-options');
  }

  async announcements(): Promise<AnnouncementSummary[]> {
    return this.request('/system/announcements');
  }

  async publishAnnouncement(input: AnnouncementCreateInput): Promise<AnnouncementSummary> {
    return this.request('/system/announcements', { method: 'POST', body: JSON.stringify(input) });
  }

  async withdrawAnnouncement(id: string): Promise<AnnouncementSummary> {
    return this.request(`/system/announcements/${id}/withdraw`, { method: 'POST' });
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

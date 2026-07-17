import type { CanadaAddressType } from './pricing-rule-engine.js';

export type BusinessType = 'EXPRESS' | 'SMALL_PACKET' | 'DEDICATED_LINE';

export type BuiltinStaffRoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type StaffRoleKey = BuiltinStaffRoleKey | (string & {});
export type StaffAccountRoleKey = Exclude<StaffRoleKey, 'CUSTOMER'>;
export type StaffGender = 'UNKNOWN' | 'MALE' | 'FEMALE' | 'OTHER';
export type StaffMenuKey =
  | 'workspace'
  | 'business'
  | 'orders'
  | 'receive'
  | 'market'
  | 'routing'
  | 'customerService'
  | 'tracking'
  | 'logisticsTracking'
  | 'problems'
  | 'pricing'
  | 'finance'
  | 'reports'
  | 'master'
  | 'settings';

const roleMenuMatrix: Record<BuiltinStaffRoleKey, StaffMenuKey[]> = {
  ADMIN: ['workspace', 'pricing', 'business', 'receive', 'market', 'customerService', 'logisticsTracking', 'finance', 'master', 'settings'],
  CUSTOMER_SERVICE: ['workspace', 'business', 'customerService', 'logisticsTracking', 'pricing', 'master'],
  OPERATOR: ['workspace', 'business', 'receive', 'market', 'logisticsTracking', 'pricing', 'master'],
  WAREHOUSE: ['workspace', 'receive', 'logisticsTracking'],
  FINANCE: ['workspace', 'pricing', 'finance', 'master'],
  CUSTOMER: []
};

export function getVisibleStaffMenuKeys(role: StaffRoleKey): StaffMenuKey[] {
  return roleMenuMatrix[role as BuiltinStaffRoleKey] ?? [];
}

export function canAccessStaffMenu(role: StaffRoleKey, menuKey: StaffMenuKey): boolean {
  return getVisibleStaffMenuKeys(role).includes(menuKey);
}

export interface StaffAccountSummary {
  id: string;
  username: string;
  name?: string;
  phone?: string;
  gender?: StaffGender;
  nickname?: string;
  departmentId?: string;
  department?: string;
  site?: string;
  role: StaffAccountRoleKey;
  roleLabel: string;
  enabled: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface StaffAccountCreateInput {
  username: string;
  password?: string;
  name?: string;
  phone?: string;
  gender?: StaffGender;
  nickname?: string;
  departmentId?: string;
  site?: string;
  enabled?: boolean;
  role: StaffAccountRoleKey;
}

export interface StaffAccountUpdateInput {
  username?: string;
  password?: string;
  name?: string;
  phone?: string;
  gender?: StaffGender;
  nickname?: string;
  departmentId?: string;
  site?: string;
  enabled?: boolean;
  role?: StaffAccountRoleKey;
}

export interface StaffAccountQuery {
  keyword?: string;
  departmentId?: string;
  site?: string;
  role?: StaffAccountRoleKey;
  status?: 'ALL' | 'ENABLED' | 'DISABLED';
}

export interface StaffAccountPasswordResetInput {
  userIds: string[];
}

export interface StaffAccountPasswordResetResult {
  id: string;
  username: string;
  temporaryPassword: string;
}

export interface SiteSummary {
  id: string;
  sortOrder: number;
  name: string;
  enabled: boolean;
}

export interface SiteCreateInput {
  name: string;
  sortOrder?: number;
}

export interface SiteUpdateInput extends SiteCreateInput {
  enabled?: boolean;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  enabled: boolean;
}

export interface RoleGroupInput {
  label: string;
  description?: string;
  site?: string;
  sortOrder?: number;
  enabled?: boolean;
  templateRole?: StaffAccountRoleKey;
}

export type ShipmentStatus =
  | 'DRAFT'
  | 'REVIEW_PENDING'
  | 'DECLARED'
  | 'WAITING_RECEIVE'
  | 'WAITING_SORT'
  | 'WAITING_DISPATCH'
  | 'OUTBOUNDED'
  | 'WAITING_DEPARTURE'
  | 'DEPARTED'
  | 'ARRIVED_PORT'
  | 'DELIVERING'
  | 'ARRIVED_PORT'
  | 'DELIVERING'
  | 'WAITING_ONLINE'
  | 'WAITING_SIGNED'
  | 'WAITING_RETURN'
  | 'PROBLEM'
  | 'STUCK'
  | 'SIGNED'
  | 'REVIEW_REJECTED'
  | 'CANCELLED';

export type RiskLevel = 'low' | 'medium' | 'high';
export type FulfillmentAction =
  | 'confirm-declare'
  | 'reject-declare'
  | 'confirm-receive'
  | 'assign-route'
  | 'confirm-dispatch'
  | 'fill-transfer-no'
  | 'add-tracking'
  | 'mark-return'
  | 'create-problem';

export type ShipmentPaymentMethod = '对公' | '对私' | '阿里店铺' | '外汇';

export interface Shipment {
  id: string;
  createdAt: string;
  entryAt?: string;
  dispatchedAt?: string;
  signedAt?: string;
  customerName: string;
  customerId?: string;
  customerCode?: string;
  salesperson?: string;
  customerOrderNo: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  transferNo?: string;
  subOrderNo?: string;
  draftWarehousePackageIds?: string[];
  inboundNo?: string;
  outboundAt?: string;
  handoverNo?: string;
  outboundBy?: string;
  batchDispatchSource?: string;
  productName?: string;
  site?: string;
  declarationRequired?: boolean;
  sensitive?: boolean;
  cargoType?: string;
  volumeCbm?: number;
  actualWeightKg?: number;
  cargoDataSource?: 'AUTO_MATCHED' | 'MANUAL_ADJUSTED';
  chargeWeightOverridden?: boolean;
  settlementMethod?: string;
  tradeTerms?: string;
  fbaInboundNo?: string;
  receiverName?: string;
  receiverCompany?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  receiverState?: string;
  receiverPostalCode?: string;
  fbaWarehouseCode?: string;
  entryBy?: string;
  businessReviewedBy?: string;
  businessReviewedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewRejectedReason?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  deleteType?: 'MANUAL' | 'SYSTEM_TIMEOUT';
  restoredAt?: string;
  restoredBy?: string;
  restoreMode?: 'KEEP_ORIGINAL_TIME' | 'RESET_CREATED_TIME' | 'MANUAL_TIME';
  etaAt?: string;
  etdAt?: string;
  remark?: string;
  businessType: BusinessType;
  packageType: 'DOC' | 'WPX' | 'PAK';
  destinationCountry: string;
  carrier: string;
  packageCount: number;
  weightKg?: number;
  chargeableWeightKg?: number;
  receivableWeightKg: number;
  agentWeightKg: number;
  receivableRmbTotal?: number;
  receivableRmbTotalError?: string;
  latestTracking: string;
  latestTrackingUpdatedAt?: string;
  trackingStaleDays: number;
  isRemoteArea: boolean;
  status: ShipmentStatus;
  channelId?: string;
  channelName: string;
  agentId?: string;
  agentName: string;
  routedAt?: string;
  routeReturnedAt?: string;
  routeAgentChannelName?: string;
  routeChargeWeightKg?: number;
  routeUnitPrice?: number;
  routeOtherFee?: number;
  routeCostTotal?: number;
  routeCurrency?: string;
  shippingMarkRequired?: boolean;
  businessInvoiceName?: string;
  businessInvoiceUrl?: string;
  businessInvoiceUploadedBy?: string;
  businessInvoiceUploadedAt?: string;
  paymentAmountUsd?: number;
  paymentAmountCny?: number;
  paymentMethod?: ShipmentPaymentMethod;
  hasProblemTicket: boolean;
}

export type CustomerServiceDataReviewStatus = 'PENDING' | 'APPROVED';

export interface CustomerServiceDataSnapshot {
  packageCount: number;
  weightKg: number;
  volumeCbm: number;
  chargeWeightKg: number;
}

export interface CustomerServiceDataReviewSummary {
  shipmentId: string;
  business: CustomerServiceDataSnapshot & { status: CustomerServiceDataReviewStatus; reviewedBy?: string; reviewedAt?: string; remark?: string };
  agent: CustomerServiceDataSnapshot & { status: CustomerServiceDataReviewStatus; reviewedBy?: string; reviewedAt?: string; remark?: string };
}

export interface CustomerServiceDataUpdateInput extends CustomerServiceDataSnapshot {
  remark?: string;
  pushToSales?: boolean;
  version?: number;
}

export interface CustomerServiceDataReviewInput {
  remark?: string;
  version?: number;
}

export interface CustomerServiceDataReverseInput {
  reason: string;
  version?: number;
}

export type LineShipmentStatusGroup =
  | 'ALL'
  | 'REVIEW_PENDING'
  | 'REVIEW_REJECTED'
  | 'WAITING_SORT'
  | 'WAITING_DISPATCH'
  | 'OUTBOUNDED'
  | 'DATA_CONFIRM'
  | 'TRANSFER_NO'
  | 'WAITING_DEPARTURE'
  | 'DEPARTED'
  | 'ARRIVED_PORT'
  | 'DELIVERING'
  | 'SIGNED'
  | 'PROBLEM'
  | 'AFTER_SALE';

export type LineShipmentDatePreset = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL';

export interface LineShipmentPoolQuery {
  statusGroup?: LineShipmentStatusGroup;
  keyword?: string;
  datePreset?: LineShipmentDatePreset;
  sortBy?: 'createdAt' | 'status' | 'systemOrderNo' | 'customerName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface LineShipmentPoolMetrics {
  pendingCount: number;
  riskCount: number;
  todayDispatchCount: number;
  estimatedReceivable: number;
  todayCompletionRate: number;
  todayUpdatedCount: number;
}

export interface LineShipmentPackageSummary {
  packageCount: number;
  totalWeightKg: number;
  totalCbm: number;
  domesticTrackingNos: string[];
  combinedOrderNos: string[];
}

export interface LineShipmentPoolRow {
  shipment: Shipment;
  latestTracking?: string;
  receivableAmount?: number;
  hasProblem?: boolean;
  packageSummary?: LineShipmentPackageSummary;
}

export interface LineShipmentPoolResponse {
  metrics: LineShipmentPoolMetrics;
  statusCounts: Record<LineShipmentStatusGroup, number>;
  rows: LineShipmentPoolRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  };
}

interface LineShipmentPoolOptions {
  businessDataApprovedShipmentIds?: string[];
  agentDataApprovedShipmentIds?: string[];
  afterSaleShipmentIds?: string[];
  packageSummariesByShipmentId?: Record<string, LineShipmentPackageSummary>;
}

export interface ShipmentRouteInput {
  channelId?: string;
  agentId?: string;
  agentChannelName?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  otherFee?: number;
  otherFeeRemark?: string;
  currency?: string;
  shippingMarkRequired?: boolean;
  /** false only saves market routing data and keeps the shipment in WAITING_SORT. */
  approve?: boolean;
}

export interface ShipmentDispatchInput {
  transferNo?: string;
  shippingMarkConfirmed?: boolean;
  handoverNo?: string;
  batchDispatchSource?: string;
}

export interface WarehouseHandoverPrintInput {
  shipmentIds: string[];
}

export interface WarehouseHandoverSummary {
  shipmentId: string;
  systemOrderNo: string;
  handoverNo: string;
  agentId: string;
  agentShortName: string;
  agentFullName: string;
  agentChannelName: string;
  packageCount: number;
  printedBy: string;
  firstPrintedAt: string;
  lastPrintedAt: string;
  printCount: number;
}

export interface WarehouseHandoverPrintResponse {
  rows: WarehouseHandoverSummary[];
}

export interface ShipmentInvoiceUploadResponse {
  shipment: Shipment;
  fileName: string;
  url: string;
}

export interface ShipmentRerouteInput {
  reason: string;
}

export interface BulkTrackingImportRow {
  customerOrderNo: string;
  date: string | number;
  description: string;
  location?: string;
  rowNumber?: number;
}

export interface BulkTrackingUpdate {
  shipmentId: string;
  customerOrderNo: string;
  trackingDate: string | number;
  latestTracking: string;
  description?: string;
  location?: string;
  rowNumber?: number;
}

export interface BulkTrackingImportResult {
  updates: BulkTrackingUpdate[];
  unmatchedOrderNos: string[];
  conflictOrderNos?: string[];
  errorRows?: Array<{ rowNumber: number; customerOrderNo?: string; reason: string }>;
  shipmentPreviews?: Array<{
    shipmentId: string;
    systemOrderNo: string;
    matchedOrderNo: string;
    trackingCount: number;
    latestTracking: string;
    latestTrackingDate: string | number;
  }>;
  rawRowCount?: number;
  matchedShipmentCount?: number;
}

export interface ShipmentOperationalUpdateInput {
  latestTracking?: string;
  transferNo?: string;
  subOrderNo?: string;
  trackingWebsite?: string;
  trackingWebsiteVisibleToSales?: boolean;
  channelId?: string;
  customerOrderNo?: string;
  productName?: string;
  destinationCountry?: string;
  packageCount?: number;
  receivableWeightKg?: number;
  agentWeightKg?: number;
  declarationRequired?: boolean;
  sensitive?: boolean;
  cargoType?: string;
  volumeCbm?: number;
  settlementMethod?: string;
  status?: ShipmentStatus;
  etaAt?: string;
  etdAt?: string;
  statusRemark?: string;
}

export interface CustomerServiceTransferFillRow {
  shipmentId: string;
  transferNo: string;
  subOrderNo?: string;
  pushToSales?: boolean;
}

export interface CustomerServiceTransferBatchInput {
  rows: CustomerServiceTransferFillRow[];
}

export interface CustomerServiceTransferBatchResult {
  shipmentId: string;
  systemOrderNo?: string;
  success: boolean;
  shipment?: Shipment;
  reason?: string;
}

export interface CustomerServiceTransferBatchResponse {
  results: CustomerServiceTransferBatchResult[];
}

export interface ShipmentPaymentUpdateInput {
  paymentAmountUsd?: number;
  paymentAmountCny?: number;
  paymentMethod: ShipmentPaymentMethod;
}

export interface BulkTrackingApplyRequest {
  updates: BulkTrackingUpdate[];
  fileName?: string;
  rawRowCount?: number;
  failedRowCount?: number;
  unmatchedOrderNos?: string[];
}

export interface BulkTrackingApplyResponse {
  updated: Shipment[];
  importedCount?: number;
  importedRowCount?: number;
  failedRowCount?: number;
  unmatchedCount?: number;
  affectedShipmentCount?: number;
}

export type AuditLogResult = 'SUCCESS' | 'FAILED';

export interface AuditLogQuery {
  operator?: string;
  module?: string;
  action?: string;
  target?: string;
  result?: AuditLogResult;
  startedAt?: string;
  endedAt?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogSummary {
  id: string;
  actorId: string;
  actorUsername: string;
  action: string;
  actionLabel: string;
  module: string;
  moduleLabel: string;
  target: string;
  result: AuditLogResult;
  resultLabel: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogWarningSummary {
  actorId: string;
  actorUsername: string;
  windowStartedAt: string;
  windowEndedAt: string;
  count: number;
}

export interface AuditLogMetricSummary {
  value: number;
  yesterdayValue: number;
  changePercent: number;
  trend: number[];
}

export interface AuditLogDashboardSummary {
  generatedAt: string;
  metrics: {
    total: AuditLogMetricSummary;
    failed: AuditLogMetricSummary;
    important: AuditLogMetricSummary;
    permissionFinance: AuditLogMetricSummary;
  };
  recentFailedImportant: AuditLogSummary[];
}

export interface AuditLogListResponse {
  rows: AuditLogSummary[];
  suspiciousDeleteWarnings: AuditLogWarningSummary[];
  pagination: { page: number; pageSize: number; totalItems: number };
  dashboard?: AuditLogDashboardSummary;
}

export type CarrierAdapterCode = 'DHL' | 'FEDEX' | 'UPS' | 'USPS' | 'OTHER';
export type ShipmentLabelStatus = 'CREATED' | 'VOIDED';
export type CarrierTaskStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type CarrierTaskType = 'TRACKING_SYNC';

export interface LabelCreateRequest {
  shipmentId: string;
  carrier: CarrierAdapterCode;
  channelName: string;
}

export interface ShipmentLabelSummary {
  id: string;
  shipmentId: string;
  carrier: CarrierAdapterCode;
  channelName: string;
  labelNo: string;
  transferNo: string;
  labelUrl: string;
  status: ShipmentLabelStatus;
  createdAt: string;
  voidedAt?: string;
}

export interface LabelCreateResponse {
  label: ShipmentLabelSummary;
  shipment: Shipment;
}

export interface CarrierTaskSummary {
  id: string;
  shipmentId: string;
  systemOrderNo: string;
  customerName: string;
  type: CarrierTaskType;
  carrier: CarrierAdapterCode;
  transferNo: string;
  status: CarrierTaskStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CarrierTaskRunResponse {
  task: CarrierTaskSummary;
  shipment: Shipment;
}

export interface ChargeableWeightInput {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  divisor?: number;
}

export interface QuoteInput {
  chargeableWeightKg: number;
  baseRatePerKg: number;
  fuelRate: number;
  surcharges: Array<{ name: string; amount: number }>;
}

export interface QuoteResponse {
  freight: number;
  fuel: number;
  surchargeTotal: number;
  total: number;
}

export interface PricingQuoteRequest extends QuoteInput {
  customerId?: string;
  channelId?: string;
  destinationCountry: string;
}

export interface PricingRuleSummary {
  id: string;
  channelId: string;
  channelName: string;
  destinationCountry: string;
  minWeightKg: number;
  maxWeightKg: number;
  ratePerKg: number;
  currency: string;
  enabled: boolean;
}

export interface PricingRuleCreateInput {
  channelId: string;
  destinationCountry: string;
  minWeightKg: number;
  maxWeightKg: number;
  ratePerKg: number;
  currency: string;
}

export interface PricingRuleQuoteRequest {
  channelId: string;
  destinationCountry: string;
  chargeableWeightKg: number;
}

export interface PricingRuleQuoteInput extends PricingRuleQuoteRequest {
  rules: PricingRuleSummary[];
  fuelRates: FuelRateSummary[];
  surcharges: SurchargeSummary[];
  exchangeRates: ExchangeRateSummary[];
}

export interface PricingRuleQuoteResponse extends QuoteResponse {
  rule: PricingRuleSummary;
  currency: 'RMB';
  originalCurrency: string;
  exchangeRate: number;
  appliedFuelRate: number;
  appliedSurcharges: Array<{ name: string; amount: number }>;
}

export type QuoteSourceType = 'local' | 'agentApi';

export * from './pricing-rule-engine.js';

export interface PriceBookRowSummary {
  id: string;
  priceBookId: string;
  agentName: string;
  carrierName?: string;
  sourceSheetName?: string;
  channelName: string;
  businessRouteName?: string;
  realChannelName?: string;
  /** 欧洲线路查询使用的结构化运输方式。仅价格表管理/体检使用。 */
  transportMode?: EuropeTransportMode;
  /** 无法依据工作表、价格组和原始线路归类时的管理员体检原因。 */
  transportClassificationIssue?: string;
  /** 欧洲超大件线路的货物属性；用于避免把电池专线推荐给普货。 */
  cargoType?: EuropeOversizeCargoType;
  warehouseCode?: string;
  destinationCountry: string;
  /** 美国空海运价格行适用的 ZIP 规则（精确、区间、前缀或全国通用）。 */
  postalRule?: string;
  minWeightKg: number;
  maxWeightKg: number;
  costPerKg: number;
  cbmPrice?: number;
  priceTierLabel?: string;
  densityDiscountRules?: Array<{ ratio: number; discount: number; label?: string }>;
  currency: string;
  transitDays?: number;
  transitLabel?: string;
  quoteSourceType?: QuoteSourceType;
  surchargeFee?: number;
  surchargeDetails?: Array<{ name: string; amount: number }>;
  productSurchargeRemark?: string;
  specialRemark?: string;
  productCategory?: string;
  region?: string;
  serviceContent?: string;
  inboundRequirement?: string;
  channelCode?: string;
  lineMarkupPerKg?: number;
  markupSource?: PriceBookRowMarkupSource;
}

export type EuropeTransportMode = 'AIR' | 'SEA' | 'RAIL' | 'SEA_RAIL' | 'UNCLASSIFIED';
/** 欧洲超大件货物属性。普货默认不会命中电池专线。 */
export type EuropeOversizeCargoType = 'GENERAL' | 'BATTERY';

export interface PriceBookSummary {
  id: string;
  fileName: string;
  agentId?: string;
  agentShortName?: string;
  rowCount: number;
  importedAt: string;
  /** 价格表管理员填写的内部自定义备注，不属于渠道要求。 */
  customRemark?: string;
  /** @deprecated 使用 customRemark。保留用于旧客户端兼容。 */
  remark?: string;
  targetModule?: PriceBookImportTargetModule;
  /** Parser/normalizer revision applied to the current active rows. */
  parserRuleVersion?: number;
  /** Automatic background rule synchronization state for the retained workbook. */
  refreshStatus?: 'CURRENT' | 'PENDING' | 'RUNNING' | 'FAILED' | 'UNAVAILABLE';
  lastRuleRefreshAt?: string;
  legacyModuleCounts?: Partial<Record<LegacyPricingModule, number>>;
}

export interface PriceBooksResponse {
  books: PriceBookSummary[];
  rows: PriceBookRowSummary[];
}

export interface PriceBookRowsQuery {
  page?: number;
  pageSize?: number;
  targetModule?: PriceBookImportTargetModule;
  agentName?: string;
  channelName?: string;
  sourceSheetName?: string;
  destinationCountry?: string;
  markupAmount?: string;
  markupSource?: PriceBookRowMarkupSource | 'ALL';
  markupSort?: 'ASC' | 'DESC' | 'NONE';
}

export interface PriceBookRowsResponse {
  rows: PriceBookRowSummary[];
  pagination: { page: number; pageSize: number; totalItems: number };
}

export interface PricingOldOriginalAgentCleanupDetail {
  sourceType: 'PRICE_BOOK_ROW' | 'LEGACY_PRICING_ROW';
  oldAgentName: string;
  newAgentName: string;
  fileName: string;
  priceBookId?: string;
  legacySourceId?: string;
  affectedRows: number;
}

export interface PricingOldOriginalAgentCleanupResponse {
  dryRun: boolean;
  affectedRows: number;
  totalPriceBookRows: number;
  totalLegacyRows: number;
  details: PricingOldOriginalAgentCleanupDetail[];
  executedAt: string;
}

export type PriceBookImportTargetModule = LegacyPricingModule;

export interface PriceBookImportInput {
  fileName: string;
  targetModule: PriceBookImportTargetModule;
  agentId?: string;
  agentShortName?: string;
  rows: Omit<PriceBookRowSummary, 'id' | 'priceBookId'>[];
}

export type PriceBookImportJobStatus = 'PENDING' | 'PARSING' | 'IMPORTING' | 'SUCCESS' | 'PARTIAL_FAILED' | 'FAILED';

export interface PriceBookImportJobSummary {
  id: string;
  fileName: string;
  targetModule?: PriceBookImportTargetModule;
  agentId?: string;
  agentShortName?: string;
  status: PriceBookImportJobStatus;
  processedRows: number;
  totalRows: number;
  failedRows: number;
  message?: string;
  errorSummary?: Array<{ index: number; reason: string }>;
  book?: PriceBookSummary;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PriceBookImportJobResponse {
  job: PriceBookImportJobSummary;
}

export interface PriceBookImportResult {
  job?: PriceBookImportJobSummary;
  book: PriceBookSummary;
  rowCount: number;
  legacyModuleCounts?: Partial<Record<LegacyPricingModule, number>>;
  errorSummary?: Array<{ index: number; reason: string }>;
  rows: PriceBookRowSummary[];
}

export interface PricingSyncHealthRow {
  id: string;
  legacyModule?: LegacyPricingModule | 'unclassified';
  fileName: string;
  agentName: string;
  lineCount: number;
  sheetCount: number;
  countryCount: number;
  markupRule?: AgentMarkupSummary;
  status: 'synced' | 'default' | 'disabled' | 'missing';
  issues?: string[];
}

export interface PricingSyncHealthResponse {
  rows: PricingSyncHealthRow[];
  orphanRules: AgentMarkupSummary[];
  stats: { sources: number; agents: number; lines: number; activeAgents: number; issueCount?: number };
  pagination: { page: number; pageSize: number; totalItems: number };
}

/**
 * Module-level state for rebuilding retained price books after a parser or
 * matcher rule revision is deployed. Counts are price-book based so the UI
 * can show deterministic progress while a large workbook is being parsed.
 */
export interface PricingRuleRefreshModuleProgress {
  module: PriceBookImportTargetModule;
  ruleVersion: number;
  totalBooks: number;
  currentBooks: number;
  pendingBooks: number;
  runningBooks: number;
  failedBooks: number;
  unavailableBooks: number;
  progressPercent: number;
  latestRuleApplied: boolean;
  updatedAt?: string;
}

export interface PricingRuleRefreshProgressResponse {
  generatedAt: string;
  modules: PricingRuleRefreshModuleProgress[];
}

export interface PriceBookRemarkUpdateInput {
  /** 价格表管理员填写的内部自定义备注，不属于渠道要求。 */
  customRemark?: string;
  /** @deprecated 使用 customRemark。保留用于旧客户端兼容。 */
  remark?: string;
}

export interface AgentMarkupSummary {
  id: string;
  legacyModule?: LegacyPricingModule | 'unclassified';
  priceBookId?: string;
  agentName: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  sourcePriceBooks?: Array<{ priceBookId: string; fileName: string; lineCount: number }>;
  activeLineCount?: number;
  retainedOnly?: boolean;
  markupDisplayMode?: AgentMarkupDisplayMode;
  defaultMarkupDisplay?: string;
  markupRange?: string;
  markupBuckets?: AgentMarkupBucket[];
  markupPerKg: number;
  markupType?: AgentMarkupType;
  markupValue?: number;
  markupUnit?: AgentMarkupUnit;
  minChargeableValue?: number;
  maxChargeableValue?: number;
  priority?: number;
  ruleCount?: number;
  hitCount?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  enabled: boolean;
}

export type AgentMarkupType = 'WEIGHT' | 'PER_SHIPMENT' | 'FIXED' | 'PERCENT';
export type AgentMarkupUnit = 'KG' | 'CBM';
export type AgentMarkupStatusFilter = 'ALL' | 'ENABLED' | 'DISABLED';
export type AgentMarkupDisplayMode = 'UNIFORM' | 'MIXED' | 'RETAINED_ONLY';
export type PriceBookRowMarkupSource = 'LINE_CUSTOM' | 'AGENT_DEFAULT' | 'VIRTUAL_DEFAULT';

/** 管理员查价及线路阶梯工作台使用的可解释报价链路；业务员响应不得返回。 */
export interface PricingCalculationBreakdown {
  chargeable: { unit: AgentMarkupUnit; value: number };
  cost: {
    priceBookId: string;
    sourceSheetName?: string;
    weightSegmentLabel: string;
    unitPrice: number;
  };
  markup: {
    source: 'LINE_TIER' | 'AGENT_DEFAULT' | 'VIRTUAL_DEFAULT';
    ruleId?: string;
    rangeLabel?: string;
    type: AgentMarkupType;
    configuredValue: number;
    effectiveUnitMarkup?: number;
    totalMarkup: number;
  };
  sale: { unitPrice: number; totalPrice: number };
}

export interface MarkupRoutePreviewInput {
  priceBookId: string;
  agentName: string;
  channelName: string;
  realChannelName?: string;
  destinationCountry: string;
  markupUnit: AgentMarkupUnit;
  chargeableValue: number;
}

export interface MarkupRoutePreviewResponse {
  route: {
    priceBookId: string;
    agentName: string;
    channelName: string;
    realChannelName: string;
    destinationCountry: string;
    markupUnit: AgentMarkupUnit;
    sourceSheets: string[];
  };
  rows: PriceBookRowSummary[];
  rules: AgentMarkupSummary[];
  selectedCostRowId?: string;
  calculation?: PricingCalculationBreakdown;
}

export interface MarkupRouteTierInput {
  minChargeableValue: number;
  maxChargeableValue?: number;
  markupValue: number;
}

export interface MarkupRouteTierReplaceInput extends MarkupRoutePreviewInput {
  tiers: MarkupRouteTierInput[];
}

export interface AgentMarkupBucket {
  markupPerKg: number;
  lineCount: number;
}

export interface AgentChannelCustomRemarkSummary {
  id: string;
  legacyModule: LegacyPricingModule;
  agentName: string;
  channelName: string;
  realChannelName?: string;
  content: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentChannelCustomRemarkInput {
  legacyModule: LegacyPricingModule;
  agentName: string;
  channelName: string;
  realChannelName?: string;
  content: string;
  enabled?: boolean;
}

export interface AgentMarkupCreateInput {
  legacyModule?: LegacyPricingModule;
  priceBookId?: string;
  agentName: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupPerKg: number;
  markupType?: AgentMarkupType;
  markupValue?: number;
  markupUnit?: AgentMarkupUnit;
  minChargeableValue?: number;
  maxChargeableValue?: number;
  priority?: number;
  enabled?: boolean;
}

export interface AgentMarkupUpdateInput {
  legacyModule?: LegacyPricingModule;
  priceBookId?: string;
  agentName?: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupPerKg?: number;
  markupType?: AgentMarkupType;
  markupValue?: number;
  markupUnit?: AgentMarkupUnit;
  minChargeableValue?: number;
  maxChargeableValue?: number;
  priority?: number;
  enabled?: boolean;
}

export interface AgentMarkupListQuery {
  legacyModule?: LegacyPricingModule | 'unclassified';
  priceBookId?: string;
  agentName?: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  status?: AgentMarkupStatusFilter;
  detail?: boolean;
  includeHits?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AgentMarkupMetrics {
  totalRules: number;
  enabledRules: number;
  disabledRules: number;
  unmatchedQuotes: number;
  latestUpdatedAt?: string;
}

export interface AgentMarkupListResponse {
  metrics: AgentMarkupMetrics;
  rows: AgentMarkupSummary[];
  pagination: { page: number; pageSize: number; totalItems: number };
}

export interface AgentMarkupPreviewResponse {
  rule: AgentMarkupSummary;
  scope: {
    channelLabel: string;
    realChannelLabel: string;
    countryLabel: string;
  };
  stats: {
    priceBookRows: number;
    channels: number;
    countries: number;
  };
  examples: Array<{
    id: string;
    channelName: string;
    realChannelName?: string;
    destinationCountry: string;
    weightSegmentLabel: string;
  }>;
  recentChanges: Array<{ action: string; actor?: string; createdAt: string }>;
}

export interface AgentMarkupExportResponse {
  rows: AgentMarkupSummary[];
  exportedAt: string;
}

export interface AgentMarkupImportResponse {
  successCount: number;
  errorRows: Array<{ index: number; reason: string }>;
  rows: AgentMarkupSummary[];
}

export interface PriceLookupRequest {
  amazonCode?: string;
  productName?: string;
  destinationCountry: string;
  postalCode?: string;
  address?: string;
  packageInfo?: string;
  chargeableWeightKg: number;
  actualWeightKg?: number;
  volumeCbm?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageCount?: number;
  unitActualWeightKg?: number;
  weightBand?: string;
  markupRules?: AgentMarkupSummary[];
}

export interface PriceLookupRecommendation {
  price: Omit<PriceBookRowSummary, 'costPerKg'> & { costPerKg?: number };
  markup?: AgentMarkupSummary;
  /** 仅具备成本与加价拆分权限的内部角色返回。 */
  calculation?: PricingCalculationBreakdown;
  channelName: string;
  carrierName: string;
  agentName: string;
  businessRouteName?: string;
  realChannelName: string;
  isRouteMapped: boolean;
  quoteSourceType: QuoteSourceType;
  weightSegmentLabel: string;
  salesRatePerKg: number;
  freightFee: number;
  surchargeFee: number;
  totalFee: number;
  freightUnitPrice: number;
  totalUnitPrice: number;
  totalCost?: number;
  totalSales: number;
  grossProfit?: number;
  transitLabel: string;
  surchargeDetails: Array<{ name: string; amount: number }>;
  remark?: string;
  productSurchargeRemark?: string;
  specialRemark?: string;
  customRemark?: string;
}

export interface AgentQuoteErrorSummary {
  agentName: string;
  quoteCount: number;
  errorCode: string;
  errorMessage: string;
}

export interface PriceLookupResponse {
  price: PriceLookupRecommendation['price'];
  markup?: AgentMarkupSummary;
  recommendations: PriceLookupRecommendation[];
  cheapestRecommendations: PriceLookupRecommendation[];
  fastestRecommendations: PriceLookupRecommendation[];
  agentErrors: AgentQuoteErrorSummary[];
  amazonCode: string;
  productName: string;
  postalCode: string;
  address: string;
  packageInfo: string;
  channelName: string;
  chargeableWeightKg: number;
  weightSegmentLabel: string;
  salesRatePerKg: number;
  totalCost?: number;
  totalSales: number;
  totalPrice: number;
  grossProfit?: number;
}

export type LegacyPricingModule = 'amazon' | 'inquiry' | 'europeExpress' | 'southAfrica' | 'usaAirSea' | 'canadaAirSea' | 'dubaiAirSea';

export interface DubaiPriceTableRow {
  id: string;
  mode: 'AIR' | 'SEA';
  productCategory?: string;
  region?: string;
  serviceContent?: string;
  priceTierLabel: string;
  businessUnitPrice: number;
  unit: 'RMB/KG' | 'RMB/CBM';
  inboundRequirement?: string;
  channelCode?: string;
  transitLabel?: string;
  channelRequirement?: string;
}

export interface DubaiPriceTableResponse {
  air: DubaiPriceTableRow[];
  sea: DubaiPriceTableRow[];
  generatedAt: string;
}

export type DubaiPriceSheetMode = 'AIR' | 'SEA' | 'UNASSIGNED';
export type DubaiPriceDisplayVersionStatus = 'PROCESSING' | 'READY' | 'FAILED';

export interface DubaiPriceDisplayPageSummary {
  id: string;
  mode: Exclude<DubaiPriceSheetMode, 'UNASSIGNED'>;
  sheetName: string;
  pageNo: number;
  url: string;
}

export interface DubaiPriceDisplayResponse {
  airPages: DubaiPriceDisplayPageSummary[];
  seaPages: DubaiPriceDisplayPageSummary[];
  airUpdatedAt?: string;
  seaUpdatedAt?: string;
  updatedAt?: string;
}

export interface DubaiPriceDisplayVersionSummary {
  id: string;
  priceBookId?: string;
  originalName: string;
  status: DubaiPriceDisplayVersionStatus;
  isActive: boolean;
  isActiveAir: boolean;
  isActiveSea: boolean;
  salesSafe: boolean;
  message?: string;
  unassignedSheets?: string[];
  createdAt: string;
  updatedAt: string;
  pages: Array<{ id: string; mode: DubaiPriceSheetMode; sheetName: string; pageNo: number }>;
}

export interface DubaiPriceDisplayVersionListResponse {
  versions: DubaiPriceDisplayVersionSummary[];
}

export interface DubaiPriceDisplayActivateInput {
  salesSafe: boolean;
}

export interface LegacyPricingSourceSummary {
  id: string;
  module: LegacyPricingModule;
  fileName: string;
  rowCount: number;
  importedAt: string;
  status: 'ok' | 'error';
  message?: string;
}

export interface LegacyPricingMetaResponse {
  modules: Array<{ key: LegacyPricingModule; label: string; rowCount: number; sourceCount: number }>;
  agents: string[];
  origins: string[];
  warehouseCodes: string[];
  tiers: string[];
}

export interface LegacyPricingQuoteRequest {
  module: LegacyPricingModule;
  amazonCode?: string;
  /** 加拿大空海查询：私人地址默认匹配“非亚马逊”价格行，亚马逊仓才使用仓库前三位。 */
  canadaAddressType?: CanadaAddressType;
  tier?: string;
  agentName?: string;
  origin?: string;
  productName?: string;
  destinationCountry?: string;
  postalCode?: string;
  address?: string;
  channel?: string;
  /** 欧洲超大件综合查询的货物属性；未传时不过滤货物属性。 */
  cargoType?: EuropeOversizeCargoType;
  /** 仅用于包税/不包税并存的价格表；未传时保留全部税务口径。 */
  taxInclusion?: 'INCLUDED' | 'EXCLUDED';
  packageInfo?: string;
  actualWeightKg?: number;
  volumeCbm?: number;
  chargeableWeightKg?: number;
  weightBand?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageCount?: number;
  unitActualWeightKg?: number;
  onlyQuotable?: boolean;
}

export interface UsPostalRuleMatch {
  /** 精确邮编 < 最小区间 < 前缀 < 全国通用。 */
  priority: 1 | 2 | 3 | 4;
  /** 同一优先级下用于选择最精确规则的值；越小越优先。 */
  specificity: number;
  matchedLabel: string;
}

interface UsPostalPrefixRange {
  prefixLength: number;
  start: number;
  end: number;
  matchedLabel: string;
}

/** 将 ZIP+4 规范为五位美国邮编；格式不合法时返回 undefined。 */
export function normalizeUsPostalCode(value?: string | null): string | undefined {
  const normalized = String(value ?? '').trim();
  const match = normalized.match(/^(\d{5})(?:-\d{4})?$/);
  return match?.[1];
}

/**
 * 解析美国价格表常见的邮编规则，并返回该规则对指定 ZIP 的命中优先级。
 * 支持：90001、90000-90999、90* / 90xxx / 邮编前缀90，以及全国通用。
 */
export function matchUsPostalRule(rule: string | undefined | null, postalCode: string | undefined | null): UsPostalRuleMatch | undefined {
  const zip = normalizeUsPostalCode(postalCode);
  const source = String(rule ?? '').trim();
  if (!zip || !source) return undefined;
  const normalized = source.replace(/[－—–~至到]/g, '-');
  const zipNumber = Number(zip);
  const candidates: UsPostalRuleMatch[] = [];

  for (const match of normalized.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const isRangeBoundary = normalized[start - 1] === '-' || normalized[end] === '-';
    if (!isRangeBoundary && match[1] === zip) candidates.push({ priority: 1, specificity: 0, matchedLabel: match[0] });
  }
  for (const match of normalized.matchAll(/\b(\d{5})\s*-\s*(\d{5})\b/g)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start <= end && zipNumber >= start && zipNumber <= end) {
      candidates.push({ priority: 2, specificity: end - start, matchedLabel: match[0] });
    }
  }
  for (const match of normalized.matchAll(/(?:邮编前缀\s*[:：]?\s*)?(\d{1,4})(?:\s*(?:\*|x{1,4}|X{1,4}|前缀))/g)) {
    const prefix = match[1];
    if (zip.startsWith(prefix)) candidates.push({ priority: 3, specificity: 5 - prefix.length, matchedLabel: match[0] });
  }
  for (const range of extractUsPostalPrefixRanges(normalized)) {
    const prefix = Number(zip.slice(0, range.prefixLength));
    if (prefix >= range.start && prefix <= range.end) {
      candidates.push({ priority: 3, specificity: 5 - range.prefixLength, matchedLabel: range.matchedLabel });
    }
  }
  if (/(?:全国通用|美国全境|全美通用|全美|nationwide|all\s*(?:us|usa|united\s*states))/i.test(normalized)) {
    candidates.push({ priority: 4, specificity: 0, matchedLabel: '全国通用' });
  }
  return candidates.sort((left, right) => left.priority - right.priority || left.specificity - right.specificity)[0];
}

/**
 * Matches the European postcode expressions used by supplier price tables.
 * European tables normally list two-digit postcode prefixes (for example
 * `20 22 33`), while a small number of routes use a full range such as
 * `10000-50999`. `全境` deliberately has no postcode restriction.
 */
export function matchesEuropeanPostalRule(rule: string | undefined | null, postalCode: string | undefined | null): boolean {
  const source = String(rule ?? '').trim().replace(/[－—–~至到]/g, '-');
  if (!source || /(?:全境|全国通用|不限邮编|全欧)/i.test(source)) return true;
  const digits = String(postalCode ?? '').replace(/\D/g, '');
  // A caller may use a table without postcode input. Do not turn that into a
  // false negative; the UI requires it where the selected route needs it.
  if (!digits) return true;

  const excludedRange = source.match(/(?:非|其他)\s*(\d{4,6})\s*-\s*(\d{4,6})/);
  if (excludedRange) {
    const width = excludedRange[1].length;
    const value = Number(digits.slice(0, width));
    return value < Number(excludedRange[1]) || value > Number(excludedRange[2]);
  }

  const fullRanges = Array.from(source.matchAll(/(?<!\d)(\d{4,6})\s*-\s*(\d{4,6})(?!\d)/g));
  if (fullRanges.length) {
    return fullRanges.some((match) => {
      const width = match[1].length;
      const value = Number(digits.slice(0, width));
      return digits.length >= width && value >= Number(match[1]) && value <= Number(match[2]);
    });
  }

  const prefix = digits.slice(0, 2);
  if (!/^\d{2}$/.test(prefix)) return false;
  const prefixes = Array.from(source.matchAll(/(?<!\d)(\d{2})(?!\d)/g)).map((match) => match[1]);
  return prefixes.length ? prefixes.includes(prefix) : true;
}

/** 供导入体检使用：仅允许可解释的 ZIP 精确值、区间、前缀或全国通用。 */
export function isUsPostalRuleSyntax(rule: string | undefined | null): boolean {
  const value = String(rule ?? '').trim().replace(/[－—–~至到]/g, '-');
  if (!value) return false;
  if (/(?:全国通用|美国全境|全美通用|全美|nationwide|all\s*(?:us|usa|united\s*states))/i.test(value)) return true;
  return usPostalRuleIntervals(value, 0).length > 0;
}

/** 供导入体检使用：检测两个或更多美国 ZIP 规则是否覆盖同一邮编区间。 */
export function hasUsPostalRuleOverlap(rules: Array<string | undefined | null>): boolean {
  const nationwide = /(?:全国通用|美国全境|全美通用|全美|nationwide|all\s*(?:us|usa|united\s*states))/i;
  const scopedRules = rules.filter((rule) => !nationwide.test(String(rule ?? '')));
  if (rules.filter((rule) => nationwide.test(String(rule ?? ''))).length > 1) return true;
  const intervals = scopedRules.flatMap((rule, ruleIndex) => usPostalRuleIntervals(String(rule ?? ''), ruleIndex));
  for (let left = 0; left < intervals.length; left += 1) {
    for (let right = left + 1; right < intervals.length; right += 1) {
      if (intervals[left].ruleIndex !== intervals[right].ruleIndex
        && intervals[left].start <= intervals[right].end
        && intervals[right].start <= intervals[left].end) return true;
    }
  }
  return false;
}

/**
 * Postal regions are intentionally repeated across weight tiers.  They only
 * compete when the same display channel, price group and weight interval each
 * provide overlapping regions.  This keeps a normal 12/45/101KG table from
 * being marked unhealthy merely because every tier serves the same ZIP zone.
 */
export function hasScopedUsPostalRuleOverlap(rows: Array<{
  postalRule?: string | null;
  channelName?: string | null;
  businessRouteName?: string | null;
  realChannelName?: string | null;
  minWeightKg?: number | null;
  maxWeightKg?: number | null;
}>): boolean {
  const scopes = new Map<string, Array<string | undefined | null>>();
  for (const row of rows) {
    const scope = [
      String(row.channelName ?? '').trim(),
      String(row.businessRouteName ?? row.realChannelName ?? '').trim(),
      Number(row.minWeightKg ?? 0),
      Number(row.maxWeightKg ?? 99999)
    ].join('\u0001');
    const rules = scopes.get(scope) ?? [];
    rules.push(row.postalRule);
    scopes.set(scope, rules);
  }
  return Array.from(scopes.values()).some((rules) => hasUsPostalRuleOverlap(rules));
}

function usPostalRuleIntervals(rule: string, ruleIndex: number) {
  const normalized = rule.trim().replace(/[－—–~至到]/g, '-');
  if (!normalized) return [] as Array<{ ruleIndex: number; start: number; end: number }>;
  const intervals: Array<{ ruleIndex: number; start: number; end: number }> = [];
  if (/(?:全国通用|美国全境|全美通用|全美|nationwide|all\s*(?:us|usa|united\s*states))/i.test(normalized)) {
    intervals.push({ ruleIndex, start: 0, end: 99999 });
  }
  for (const match of normalized.matchAll(/\b(\d{5})\s*-\s*(\d{5})\b/g)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start <= end) intervals.push({ ruleIndex, start, end });
  }
  for (const match of normalized.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)) {
    const startAt = match.index ?? 0;
    const endAt = startAt + match[0].length;
    if (normalized[startAt - 1] === '-' || normalized[endAt] === '-') continue;
    const value = Number(match[1]);
    intervals.push({ ruleIndex, start: value, end: value });
  }
  for (const match of normalized.matchAll(/(?:邮编前缀\s*[:：]?\s*)?(\d{1,4})(?:\s*(?:\*|x{1,4}|X{1,4}|前缀))/g)) {
    const prefix = match[1];
    intervals.push({ ruleIndex, start: Number(prefix.padEnd(5, '0')), end: Number(prefix.padEnd(5, '9')) });
  }
  for (const range of extractUsPostalPrefixRanges(normalized)) {
    const padding = 5 - range.prefixLength;
    intervals.push({
      ruleIndex,
      start: range.start * (10 ** padding),
      end: range.end * (10 ** padding) + (10 ** padding - 1)
    });
  }
  return intervals;
}

/**
 * 美国表常把五位 ZIP 的前缀写成“5-7（邮编）”“4、5、6、7邮编”或“96-99 邮编”。
 * 仅在带邮编上下文，或整格就是该表达式时识别，避免把时效“5-7天”当作邮编规则。
 */
function extractUsPostalPrefixRanges(value: string): UsPostalPrefixRange[] {
  const normalized = value.trim().replace(/[－—–~至到]/g, '-');
  const ranges: UsPostalPrefixRange[] = [];
  const expressionPattern = /(?:邮编\s*)?(\d{1,4}(?:\s*[-、]\s*\d{1,4})+(?:\s*[,，/\n]\s*\d{1,4}(?:\s*[-、]\s*\d{1,4})+)*)(?:\s*(?:[（(]\s*邮编(?:开头|段)?\s*[）)]|邮编(?:开头|段)?|开头|段))?/g;

  for (const match of normalized.matchAll(expressionPattern)) {
    const matchedLabel = match[0].trim();
    const hasPostalContext = /邮编|开头|段/.test(matchedLabel) || matchedLabel === normalized;
    if (!hasPostalContext) continue;
    for (const part of match[1].split(/[,，/\n]/).map((item) => item.trim()).filter(Boolean)) {
      const values = part.split(/[-、]/).map((item) => item.trim()).filter(Boolean);
      if (values.length < 2 || values.some((item) => !/^\d{1,4}$/.test(item))) continue;
      if (values.length === 2 && part.includes('-') && !part.includes('、')) {
        const [startText, endText] = values;
        const start = Number(startText);
        const end = Number(endText);
        if (start > end) continue;
        // Supplier shorthand such as 8-96 means 80000-96999. The two
        // endpoints intentionally may have different prefix lengths.
        ranges.push({ prefixLength: Math.max(startText.length, endText.length), start, end, matchedLabel: part });
        continue;
      }
      for (const prefixText of new Set(values)) {
        const prefix = Number(prefixText);
        ranges.push({ prefixLength: prefixText.length, start: prefix, end: prefix, matchedLabel: part });
      }
    }
  }

  const singlePrefixPattern = /(?:邮编\s*)?(\d{1,4})(?:\s*(?:[（(]\s*邮编(?:开头|段)?\s*[）)]|邮编(?:开头|段)?|开头|段))/g;
  for (const match of normalized.matchAll(singlePrefixPattern)) {
    const matchedLabel = match[0].trim();
    const prefix = Number(match[1]);
    ranges.push({ prefixLength: match[1].length, start: prefix, end: prefix, matchedLabel });
  }

  return ranges;
}

export interface LegacyPricingRecommendation {
  id: string;
  module: LegacyPricingModule;
  sourceId?: string;
  sourceFile?: string;
  agentName: string;
  origin?: string;
  channelName: string;
  serviceName?: string;
  transportMode?: EuropeTransportMode;
  cargoType?: EuropeOversizeCargoType;
  warehouseCode?: string;
  destinationCountry?: string;
  postalRule?: string;
  weightSegmentLabel: string;
  quoteMode: 'kg' | 'cbm' | 'tier';
  tierLabel?: string;
  costUnitPrice?: number;
  salesUnitPrice: number;
  costTotal?: number;
  salesTotal: number;
  grossProfit?: number;
  chargeableWeightKg: number;
  volumeCbm?: number;
  densityRatio?: number;
  densityDiscountLabel?: string;
  transitLabel?: string;
  markup?: AgentMarkupSummary;
  /** 仅具备成本与加价拆分权限的内部角色返回。 */
  calculation?: PricingCalculationBreakdown;
  productSurchargeRemark?: string;
  specialRemark?: string;
  customRemark?: string;
  remark?: string;
  raw?: Record<string, unknown>;
}

export interface LegacyPricingQuoteResponse {
  module: LegacyPricingModule;
  query: LegacyPricingQuoteRequest;
  recommendations: LegacyPricingRecommendation[];
  cheapestRecommendations: LegacyPricingRecommendation[];
  fastestRecommendations: LegacyPricingRecommendation[];
  selected?: LegacyPricingRecommendation;
  agentErrors: AgentQuoteErrorSummary[];
  metrics: {
    matchedRows: number;
    agents: number;
    channels: number;
    sources: number;
  };
}

export interface LegacyPricingImportInput {
  module: LegacyPricingModule;
  fileName: string;
  rows: Array<Record<string, unknown>>;
}

export interface LegacyPricingSourcesResponse {
  sources: LegacyPricingSourceSummary[];
}

export interface SouthAfricaRateImageSummary {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface SouthAfricaRateImageListResponse {
  images: SouthAfricaRateImageSummary[];
}

export interface SouthAfricaRateRuleSummary {
  id: string;
  category: string;
  name: string;
  keywords: string[];
  ratePerCbm?: number;
  consult: boolean;
  remark?: string;
  sourceImageId?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SouthAfricaRateRuleInput {
  category: string;
  name: string;
  keywords?: string[];
  ratePerCbm?: number;
  consult?: boolean;
  remark?: string;
  sourceImageId?: string;
  enabled?: boolean;
}

export interface SouthAfricaRateRuleListResponse {
  rules: SouthAfricaRateRuleSummary[];
}

export interface SouthAfricaLookupRequest {
  productName: string;
  volumeCbm: number;
  actualWeightKg?: number;
  category?: string;
  packageInfo?: string;
}

export interface SouthAfricaLookupResult {
  id: string;
  category: string;
  materialName: string;
  matchedKeywords: string[];
  consult: boolean;
  ratePerCbm?: number;
  volumeCbm: number;
  actualWeightKg?: number;
  chargeableCbm: number;
  freightFee?: number;
  riskFee?: number;
  documentFee?: number;
  totalFee?: number;
  formulaText: string;
  remark?: string;
  sourceImage?: SouthAfricaRateImageSummary;
  quoteText: string;
}

export interface SouthAfricaLookupResponse {
  query: SouthAfricaLookupRequest;
  result?: SouthAfricaLookupResult;
  recommendations: SouthAfricaLookupResult[];
  pendingReview?: {
    id: string;
    productName: string;
    volumeCbm: number;
    actualWeightKg?: number;
    packageInfo?: string;
    createdAt: string;
  };
}

export type WarehousePackageStatus = 'PENDING' | 'RECEIVED' | 'CONSOLIDATED' | 'SHIPPED' | 'TALLIED_ARCHIVED';
export type WarehouseConsolidationMode = 'MERGE_ONLY' | 'MERGE_AND_SHIP';
export type WarehouseRoundingRule = 'NONE' | 'HALF_UP' | 'INTEGER_UP';
export type WarehouseTallyTaskStatus = 'PENDING' | 'COMPLETED';
export type WarehouseTallyLabelStatus = 'NOT_GENERATED' | 'GENERATED';
export type WarehouseMeasurementStatus = 'MEASURED' | 'PENDING_REMEASURE';

export interface WarehousePackageSummary {
  id: string;
  customerCode: string;
  customerName?: string;
  site?: string;
  salesperson?: string;
  customerOrderNo: string;
  domesticTrackingNo: string;
  combinedOrderNo: string;
  labelNo?: string;
  sourcePackageId?: string;
  sourcePackageNo?: string;
  archivedByPackageId?: string;
  archivedByPackageNo?: string;
  archivedReason?: string;
  archivedAt?: string;
  tallyTaskId?: string;
  tallyTaskNo?: string;
  /** Only true when a matching warehouse tally task has actually completed. */
  tallyCompleted?: boolean;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  shipmentId?: string;
  receivingChannel: string;
  destinationCountry?: string;
  expectedTotalPackageCount?: number;
  packageIndex?: number;
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  girthCm?: number;
  cbm: number;
  totalCbm?: number;
  volumetricWeightKg: number;
  volumetricWeightKg5000?: number;
  totalVolumetricWeightKg?: number;
  totalVolumetricWeightKg5000?: number;
  chargeableWeightKg: number;
  divisor: number;
  roundingRule: WarehouseRoundingRule;
  scanTime?: string;
  remark?: string;
  manualException?: string;
  scanSource?: string;
  measurementStatus?: WarehouseMeasurementStatus;
  measurementMatchedAt?: string;
  measurementMatchedBy?: string;
  inboundAt?: string;
  receiptSourceId?: string;
  tallyStatus?: string;
  splitStatus?: string;
  consolidationStatus?: string;
  outboundStatus?: string;
  status: WarehousePackageStatus;
  exceptions: string[];
  createdBy?: string;
  createdAt: string;
}

export interface WarehousePackageCreateInput {
  customerCode?: string;
  customerOrderNo?: string;
  combinedOrderNo?: string;
  domesticTrackingNo: string;
  expectedTotalPackageCount: number;
  packageIndex: number;
  packageCount?: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  scanTime?: string;
  remark?: string;
  manualException?: string;
  scanSource?: string;
}

export interface WarehouseManualReceiptCartonSpecInput {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
}

export interface WarehouseManualReceiptCreateInput extends Omit<WarehousePackageCreateInput, 'expectedTotalPackageCount' | 'packageIndex' | 'packageCount' | 'weightKg' | 'lengthCm' | 'widthCm' | 'heightCm'> {
  cartonSpecs: WarehouseManualReceiptCartonSpecInput[];
}

export interface WarehouseManualReceiptCreateResponse {
  packages: WarehousePackageSummary[];
  totalCartonSpecs: number;
  totalPackages: number;
}

export interface WarehouseManualReceiptCustomerOption {
  code: string;
  name: string;
}

export interface WarehousePackageUpdateInput {
  customerCode?: string;
  customerOrderNo?: string;
  domesticTrackingNo?: string;
  combinedOrderNo?: string;
  expectedTotalPackageCount?: number;
  packageIndex?: number;
  packageCount?: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  scanTime?: string;
  remark?: string;
  manualException?: string;
}

export type WarehouseTodayDatePreset = 'TODAY' | 'WEEK' | 'LAST_7_DAYS' | 'MONTH' | 'CUSTOM';

export interface WarehouseTodayQuery {
  datePreset?: WarehouseTodayDatePreset;
  customFrom?: string;
  customTo?: string;
  site?: string;
  customerOrderNo?: string;
  domesticTrackingNo?: string;
  combinedOrderNo?: string;
}

export interface WarehouseTodayTotals {
  receiptTickets: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
  waitingDispatchTickets: number;
  pendingTallyTickets: number;
  exceptionTickets: number;
}

export interface WarehouseTodayResponse {
  totals: WarehouseTodayTotals;
  rows: WarehousePackageSummary[];
}

export interface WarehouseInStockQuery {
  site?: string;
  customerOrderNo?: string;
  domesticTrackingNo?: string;
  combinedOrderNo?: string;
  operationKeyword?: string;
  status?: WarehousePackageStatus;
}

export type WarehouseInStockTotals = WarehouseTodayTotals;

export interface WarehouseInStockResponse {
  totals: WarehouseInStockTotals;
  rows: WarehousePackageSummary[];
}

export interface WarehousePackageSplitInput {
  splitCount?: number;
  pieces?: number[];
  remark?: string;
}

export interface WarehousePackageSplitResponse {
  sourcePackage: WarehousePackageSummary;
  packages: WarehousePackageSummary[];
}

export interface WarehousePackageGroupSummary {
  id: string;
  customerCode: string;
  customerOrderNo: string;
  domesticTrackingNo: string;
  combinedOrderNo: string;
  expectedTotalPackageCount: number;
  arrivedPackageCount: number;
  remainingPackageCount: number;
  totalActualWeightKg: number;
  totalCbm: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  maxVolumetricWeightKg: number;
  totalChargeableWeightKg: number;
  latestScanTime?: string;
}

export interface WarehouseConsolidationSummary {
  id: string;
  consolidationNo: string;
  mode: WarehouseConsolidationMode;
  shipmentId?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  packageIds: string[];
  totalPackages: number;
  totalActualWeightKg: number;
  totalVolumetricWeightKg: number;
  totalChargeableWeightKg: number;
  createdAt: string;
}

export interface WarehouseConsolidationCreateInput {
  packageIds: string[];
  mode: WarehouseConsolidationMode;
  tallyRequirement?: string;
}

export interface WarehouseTallyTaskSummary {
  id: string;
  taskNo: string;
  status: WarehouseTallyTaskStatus;
  packageIds: string[];
  sourcePackageId: string;
  sourceCombinedOrderNo: string;
  customerCode: string;
  customerName?: string;
  salesperson?: string;
  packageCount: number;
  originalWeightKg: number;
  originalLengthCm: number;
  originalWidthCm: number;
  originalHeightCm: number;
  originalVolumetricWeightKg: number;
  originalVolumetricWeightKg5000: number;
  tallyRequirement: string;
  remark?: string;
  createdBy?: string;
  createdAt: string;
  completedPackageCount?: number;
  completedWeightKg?: number;
  completedLengthCm?: number;
  completedWidthCm?: number;
  completedHeightCm?: number;
  completedVolumetricWeightKg?: number;
  completedVolumetricWeightKg5000?: number;
  completedBy?: string;
  completedAt?: string;
  labelStatus: WarehouseTallyLabelStatus;
  labelNo?: string;
  labelQrContent?: string;
  labelGeneratedAt?: string;
  labelGeneratedBy?: string;
  labelPrintedAt?: string;
  labelPrintedBy?: string;
  labelDownloadedAt?: string;
  labelDownloadedBy?: string;
  appliedPackageId?: string;
  appliedPackageNo?: string;
  labelAppliedAt?: string;
  labelAppliedBy?: string;
  outputPackages?: WarehousePackageSummary[];
}

export interface WarehouseTallyTaskListQuery {
  status?: WarehouseTallyTaskStatus;
  customerCode?: string;
  combinedOrderNo?: string;
  completedScope?: 'RECENT' | 'HISTORY' | 'ALL';
  completedFrom?: string;
  completedTo?: string;
}

export interface WarehouseTallyTaskCreateInput {
  packageIds: string[];
  tallyRequirement: string;
  remark?: string;
}

export interface WarehouseTallyTaskUpdateInput {
  tallyRequirement?: string;
  remark?: string;
}

export interface WarehouseTallyTaskCompleteInput {
  packageCount: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  remark?: string;
  /**
   * 任务内每个最终包裹的来源与确认后件重尺。省略时保留兼容旧的单一完成动作。
   */
  results?: WarehouseTallyTaskPackageResultInput[];
}

export interface WarehouseTallyTaskPackageResultInput {
  sourcePackageIds: string[];
  packageCount: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface WarehouseTallyLabelScanInput {
  labelNo: string;
}

export interface WarehouseTallyLabelScanResponse {
  task: WarehouseTallyTaskSummary;
  package: WarehousePackageSummary;
  alreadyApplied: boolean;
}

export interface FeeLineInput {
  name: string;
  amount: number;
}

export interface FeeLineDraft extends FeeLineInput {
  shipmentId: string;
}

export type ShipmentFinanceItemType = 'RECEIVABLE' | 'PAYABLE' | 'BUSINESS_COST';
export type ShipmentFinanceItemStatus = 'PENDING' | 'CONFIRMED' | 'LOCKED' | 'VOIDED';
export type ShipmentFinanceItemSourceType = 'SYSTEM' | 'MANUAL';
export type FinanceCatalogCategory = 'FEE_NAME' | 'SETTLEMENT_METHOD' | 'CARGO_TYPE' | 'PRODUCT_NAME';

export interface FinanceCatalogItemSummary {
  id: string;
  category: FinanceCatalogCategory;
  sortOrder: number;
  name: string;
  currency?: string;
  remark?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceCatalogItemInput {
  category: FinanceCatalogCategory;
  sortOrder?: number;
  name: string;
  currency?: string;
  remark?: string;
  enabled?: boolean;
}

export interface FinanceCatalogListQuery {
  category?: FinanceCatalogCategory;
  keyword?: string;
  enabledOnly?: boolean;
}

export interface FinanceCatalogReorderInput {
  category: FinanceCatalogCategory;
  orderedIds: string[];
}

export interface FinanceCatalogListResponse {
  items: FinanceCatalogItemSummary[];
}

export const defaultFinanceCatalogItems: Array<Omit<FinanceCatalogItemSummary, 'id' | 'createdAt' | 'updatedAt'>> = [
  { category: 'FEE_NAME', sortOrder: 1, name: '运费', remark: '根据结算方式自动匹配', enabled: true },
  { category: 'FEE_NAME', sortOrder: 2, name: '报关费', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 3, name: '纸箱', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 4, name: '胶带', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 5, name: '围膜', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 6, name: '标签', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 7, name: '麻袋', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 8, name: '绑带', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 9, name: 'A4纸', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 10, name: '托盘', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 11, name: '雨布', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 12, name: '临时工', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 13, name: '木工', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 14, name: '临时工', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 15, name: '装柜', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 16, name: '叉车', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 17, name: '送货费销', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 18, name: '其他工具', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 19, name: '基础运费', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 20, name: '客户运费', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 21, name: '业务员成本', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 22, name: '业务成本', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 23, name: 'USD 附加费', currency: 'USD', enabled: true },
  { category: 'FEE_NAME', sortOrder: 24, name: '出货成本', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 25, name: '代理运费', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 1, name: '思远阿里', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 2, name: '科沃尔阿里', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 3, name: '华侨银行', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 4, name: 'SH阿里', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 5, name: 'JYL阿里', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 6, name: '西联', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 7, name: '农村商业银行', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 8, name: '中国银行', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 9, name: '招商银行', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 10, name: '思远微信', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 11, name: '思远支付宝', currency: 'RMB', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 1, name: '普货', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 2, name: '液体', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 3, name: '带电', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 4, name: '仿牌', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 5, name: '带磁', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 6, name: '粉末', enabled: true },
  { category: 'PRODUCT_NAME', sortOrder: 1, name: '服饰', enabled: true },
  { category: 'PRODUCT_NAME', sortOrder: 2, name: '配件', enabled: true }
];

export interface ShipmentFinanceItemCommon {
  type?: ShipmentFinanceItemType;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  matchedReceiptNo?: string;
  reconciliationStatus?: ShipmentFinanceItemStatus;
  receivedAmount?: number;
  receiptStatus?: 'UNPAID' | 'PARTIAL' | 'RECEIVED';
  receiptMatchSource?: 'AUTO' | 'MANUAL';
  receiptMatchHint?: string;
  receivedAt?: string;
  rmbAmount?: number;
  createdAt?: string;
  createdBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  remark?: string;
  locked?: boolean;
  voided?: boolean;
  sourceType?: ShipmentFinanceItemSourceType;
  amountOverridden?: boolean;
}

export interface ReceivableFeeSummary {
  id: string;
  shipmentId: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  customerName: string;
  salesperson?: string;
  name: string;
  amount: number;
  settled: boolean;
  type?: 'RECEIVABLE';
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  matchedReceiptNo?: string;
  rmbAmount?: number;
  reconciliationStatus?: ShipmentFinanceItemStatus;
  receivedAmount?: number;
  receiptStatus?: 'UNPAID' | 'PARTIAL' | 'RECEIVED';
  receiptMatchSource?: 'AUTO' | 'MANUAL';
  receiptMatchHint?: string;
  receivedAt?: string;
  createdAt?: string;
  createdBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  remark?: string;
  locked?: boolean;
  voided?: boolean;
  sourceType?: ShipmentFinanceItemSourceType;
  amountOverridden?: boolean;
}

export interface ReceivableAuditSummary extends ReceivableFeeSummary {
  salesperson?: string;
  customerId?: string;
  customerCode: string;
  customerOrderNo?: string;
  transferNo?: string;
  paymentNo?: string;
  matchedReceiptNo?: string;
  receiptBalance?: number;
  rmbAmount?: number;
  orderRmbTotal?: number;
}

export interface ReceivableAuditListQuery {
  outboundOrderNo?: string;
  systemOrderNo?: string;
  customer?: string;
  customerCode?: string;
  customerName?: string;
  transferNo?: string;
  salesperson?: string;
  feeName?: string;
  createdBy?: string;
  reviewedBy?: string;
  paymentNo?: string;
  reconciliationStatus?: ShipmentFinanceItemStatus | 'ALL';
  status?: ShipmentFinanceItemStatus | 'ALL';
  createdFrom?: string;
  createdTo?: string;
  reviewedFrom?: string;
  reviewedTo?: string;
  remark?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'reviewedAt' | 'amount' | 'rmbAmount' | 'systemOrderNo' | 'customerCode' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface ReceivableAuditListTotals {
  amountByCurrency: Array<{ currency: string; amount: number }>;
  rmbTotal: number;
  pendingCount: number;
  confirmedCount: number;
  voidedCount: number;
}

export interface ReceivableAuditListResponse {
  rows: ReceivableAuditSummary[];
  totals: ReceivableAuditListTotals;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  };
}

export interface ReceivableAuditCreateInput {
  shipmentId?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  customerOrderNo?: string;
  transferNo?: string;
  customerCode?: string;
  name: string;
  amount: number;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  remark?: string;
}

export interface ReceivableAuditUpdateInput {
  name?: string;
  amount?: number;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  remark?: string;
}

export interface ReceivableAuditBatchInput {
  ids: string[];
}

export interface ReceivableAuditBatchResult {
  successCount: number;
  failureCount: number;
  rows: ReceivableAuditSummary[];
  failures: Array<{ id: string; reason: string }>;
}

export interface ReceivableAuditExportRequest {
  ids?: string[];
  query?: ReceivableAuditListQuery;
}

export interface ReceivableAuditExportResponse {
  rows: ReceivableAuditSummary[];
  exportedAt: string;
}

export interface ReceivableReceiptMatchInput {
  ledgerId: string;
  amount?: number;
}

export type FinanceDashboardSectionKey =
  | 'receivables'
  | 'business-costs'
  | 'payables'
  | 'payment-applications'
  | 'paid-verification'
  | 'water-receipt-arrivals'
  | 'water-receipts'
  | 'agent-bill-ai';

export interface FinanceDashboardItem {
  key: string;
  title: string;
  value?: string;
  count?: number;
  amount?: number;
  currency?: string;
  description?: string;
  sectionKey: FinanceDashboardSectionKey;
}

export interface FinanceDashboardResponse {
  kpis: FinanceDashboardItem[];
  todos: FinanceDashboardItem[];
  exceptions: FinanceDashboardItem[];
  quickActions: FinanceDashboardItem[];
}

export type WaterReceiptStatus = 'PENDING' | 'ARRIVED' | 'PARTIAL_MATCHED' | 'MATCHED' | 'ARCHIVED' | 'VOIDED';

export interface WaterReceiptVoucherSummary {
  id: string;
  waterReceiptId: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  uploadedBy?: string;
  createdAt?: string;
}

export interface WaterReceiptMatchSummary {
  id: string;
  waterReceiptId: string;
  receivableFinanceItemId: string;
  shipmentId: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  customerCode: string;
  feeName: string;
  amount: number;
  source?: 'AUTO' | 'MANUAL';
  voided?: boolean;
  voidedAt?: string;
  createdAt?: string;
}

export interface WaterReceiptSummary {
  id: string;
  receiptNo: string;
  site: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  salesperson?: string;
  receiptMethod?: string;
  receiptDate: string;
  currency: string;
  amount: number;
  matchedAmount: number;
  balance: number;
  paymentNo?: string;
  status: WaterReceiptStatus;
  remark?: string;
  arrivedAt?: string;
  arrivedBy?: string;
  archivedAt?: string;
  voidedAt?: string;
  voidedReason?: string;
  accountLedgerId?: string;
  voucher?: WaterReceiptVoucherSummary;
  matches: WaterReceiptMatchSummary[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WaterReceiptListQuery {
  receiptNo?: string;
  site?: string;
  salesperson?: string;
  customerCode?: string;
  receiptMethod?: string;
  paymentNo?: string;
  status?: 'ALL' | WaterReceiptStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  remark?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'receiptDate' | 'amount' | 'balance' | 'receiptNo' | 'customerCode' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface WaterReceiptListResponse {
  rows: WaterReceiptSummary[];
  totals: {
    count: number;
    pendingCount: number;
    arrivedCount: number;
    matchedCount: number;
    archivedCount: number;
    amount: number;
    matchedAmount: number;
    balance: number;
  };
  pagination: { page: number; pageSize: number; totalItems: number };
}

export interface WaterReceiptCreateInput {
  customerId?: string;
  customerCode?: string;
  site?: string;
  receiptMethod: string;
  receiptDate: string;
  currency?: string;
  amount: number;
  paymentNo: string;
  remark?: string;
}

export interface WaterReceiptUpdateInput {
  customerId?: string;
  customerCode?: string;
  site?: string;
  receiptMethod?: string;
  receiptDate?: string;
  currency?: string;
  amount?: number;
  paymentNo: string;
  remark?: string;
  adjustReason?: string;
}

export interface WaterReceiptMarkArrivedInput {
  arrivedAt?: string;
  note?: string;
}

export interface WaterReceiptMatchOrdersInput {
  matches: Array<{ receivableFinanceItemId: string; amount: number }>;
}

export interface WaterReceiptUnmatchInput {
  matchIds: string[];
  reason?: string;
}

export interface WaterReceiptVoucherInput {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
}

export interface WaterReceiptExportRequest {
  ids?: string[];
  query?: WaterReceiptListQuery;
}

export interface WaterReceiptExportResponse {
  rows: WaterReceiptSummary[];
  exportedAt: string;
}

export interface PayableFeeSummary {
  id: string;
  shipmentId: string;
  name: string;
  amount: number;
  settled: boolean;
  salesperson?: string;
  agentName?: string;
  type?: 'PAYABLE';
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  rmbAmount?: number;
  reconciliationStatus?: ShipmentFinanceItemStatus;
  createdAt?: string;
  createdBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  remark?: string;
  locked?: boolean;
  voided?: boolean;
  sourceType?: ShipmentFinanceItemSourceType;
  chargeWeightKg?: number;
  unitPrice?: number;
  amountOverridden?: boolean;
}

export interface PayableAuditSummary extends PayableFeeSummary {
  salesperson?: string;
  customerCode: string;
  customerName: string;
  customerOrderNo?: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  transferNo?: string;
  agentChannel?: string;
  payableTotal: number;
  rmbAmount?: number;
  orderRmbTotal?: number;
  receivableProfit?: number;
  operationProfit?: number;
  canViewSensitivePayable?: boolean;
  canViewProfit?: boolean;
}

export interface PayableAuditListQuery {
  outboundOrderNo?: string;
  systemOrderNo?: string;
  customer?: string;
  customerCode?: string;
  customerName?: string;
  transferNo?: string;
  salesperson?: string;
  agent?: string;
  feeName?: string;
  createdBy?: string;
  reviewedBy?: string;
  paymentNo?: string;
  reconciliationStatus?: ShipmentFinanceItemStatus | 'ALL';
  status?: ShipmentFinanceItemStatus | 'ALL';
  createdFrom?: string;
  createdTo?: string;
  reviewedFrom?: string;
  reviewedTo?: string;
  remark?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'reviewedAt' | 'amount' | 'rmbAmount' | 'systemOrderNo' | 'customerCode' | 'name' | 'receivableProfit' | 'operationProfit';
  sortOrder?: 'asc' | 'desc';
}

export interface PayableAuditListTotals {
  amountByCurrency: Array<{ currency: string; amount: number }>;
  rmbTotal: number;
  pendingCount: number;
  confirmedCount: number;
  voidedCount: number;
  receivableProfitTotal?: number;
  operationProfitTotal?: number;
}

export interface PayableAuditListResponse {
  rows: PayableAuditSummary[];
  totals: PayableAuditListTotals;
  pagination: { page: number; pageSize: number; totalItems: number };
}

export interface PayableAuditCreateInput {
  shipmentId?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  customerOrderNo?: string;
  transferNo?: string;
  customerCode?: string;
  name: string;
  amount?: number;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  remark?: string;
}

export interface PayableAuditShipmentMatchInput {
  shipmentId?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  customerOrderNo?: string;
  transferNo?: string;
  customerCode?: string;
}

export interface PayableAuditShipmentMatchSummary {
  shipmentId: string;
  customerCode: string;
  customerName: string;
  customerOrderNo?: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  transferNo?: string;
  salesperson?: string;
  agentName?: string;
  agentChannel?: string;
}

export interface PayableAuditUpdateInput {
  name?: string;
  amount?: number;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  remark?: string;
}

export interface PayableAuditBatchInput {
  ids: string[];
}

export interface PayableAuditExportRequest {
  ids?: string[];
  query?: PayableAuditListQuery;
}

export interface PayableAuditExportResponse {
  rows: PayableAuditSummary[];
  exportedAt: string;
}

export interface PayableAuditBatchResult {
  successCount: number;
  failureCount: number;
  rows: PayableAuditSummary[];
  failures: Array<{ id: string; reason: string }>;
}

export interface AgentBankAccountSummary {
  id: string;
  agentId?: string;
  agentName: string;
  accountName: string;
  bankName: string;
  bankAccountNo: string;
  currency?: string;
  remark?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentBankAccountInput {
  id?: string;
  agentId?: string;
  agentName: string;
  accountName: string;
  bankName: string;
  bankAccountNo: string;
  currency?: string;
  remark?: string;
  enabled?: boolean;
  saveToAgent?: boolean;
}

export interface PayeeBankAccountSummary {
  id: string;
  agentId?: string;
  agentName: string;
  accountName: string;
  bankName: string;
  bankAccountNo: string;
  currency: 'RMB' | 'USD';
  remark?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayeeBankAccountInput {
  agentId?: string;
  agentName: string;
  accountName: string;
  bankName: string;
  bankAccountNo: string;
  currency: 'RMB' | 'USD';
  remark?: string;
}

export interface PaymentVoucherSummary {
  id: string;
  paymentApplicationId?: string;
  pendingPaymentId?: string;
  voucherType?: 'BILL' | 'PAYMENT_RECEIPT';
  payableFinanceItemId?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  transferNo?: string;
  agentChannel?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  payableAmount?: number;
  paymentApplicationNo?: string;
  paidPaymentId?: string;
  paidAt?: string;
  billNo?: string;
  agentName?: string;
  billDate?: string;
  currency?: 'RMB' | 'USD';
  billAmount?: number;
  status?: 'IMPORTED' | 'MATCHED' | 'DIFFERENCE_PENDING' | 'DIFFERENCE_HANDLED' | 'ARCHIVED';
  differenceType?: string;
  differenceAmount?: number;
  differenceReason?: string;
  differenceStatus?: 'PENDING' | 'HANDLED';
  differenceHandledBy?: string;
  differenceHandledAt?: string;
  extraFeeType?: string;
  extraFeeAmount?: number;
  extraFeeCurrency?: 'RMB' | 'USD';
  extraFeeAgentName?: string;
  extraFeeCustomerCode?: string;
  extraFeeSystemOrderNo?: string;
  extraFeeOccurredAt?: string;
  extraFeeFinanceItemId?: string;
  extraFeeRemark?: string;
  kuayueBillNo?: string;
  kuayueCustomerCode?: string;
  kuayueSystemOrderNo?: string;
  kuayueAmount?: number;
  kuayueCurrency?: 'RMB' | 'USD';
  kuayueBillDate?: string;
  kuayueStatus?: 'REGISTERED' | 'LINKED' | 'ARCHIVED';
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  uploadedBy?: string;
  createdAt?: string;
}

export interface PaymentVoucherInput {
  paymentApplicationId?: string;
  pendingPaymentId?: string;
  voucherType?: 'BILL' | 'PAYMENT_RECEIPT';
  billNo?: string;
  transferNo?: string;
  agentName?: string;
  billDate?: string;
  currency?: 'RMB' | 'USD';
  billAmount?: number;
  status?: 'IMPORTED' | 'MATCHED' | 'DIFFERENCE_PENDING' | 'DIFFERENCE_HANDLED' | 'ARCHIVED';
  differenceType?: string;
  differenceAmount?: number;
  differenceReason?: string;
  differenceStatus?: 'PENDING' | 'HANDLED';
  extraFeeType?: string;
  extraFeeAmount?: number;
  extraFeeCurrency?: 'RMB' | 'USD';
  extraFeeAgentName?: string;
  extraFeeCustomerCode?: string;
  extraFeeSystemOrderNo?: string;
  extraFeeOccurredAt?: string;
  extraFeeFinanceItemId?: string;
  extraFeeRemark?: string;
  kuayueBillNo?: string;
  kuayueCustomerCode?: string;
  kuayueSystemOrderNo?: string;
  kuayueAmount?: number;
  kuayueCurrency?: 'RMB' | 'USD';
  kuayueBillDate?: string;
  kuayueStatus?: 'REGISTERED' | 'LINKED' | 'ARCHIVED';
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
}

export interface PaymentVoucherListQuery {
  billNo?: string;
  agentName?: string;
  currency?: 'ALL' | 'RMB' | 'USD';
  status?: 'ALL' | 'IMPORTED' | 'MATCHED' | 'DIFFERENCE_PENDING' | 'DIFFERENCE_HANDLED' | 'ARCHIVED';
  page?: number;
  pageSize?: number;
}

export interface PaymentVoucherDifferenceInput {
  differenceType?: string;
  differenceAmount?: number;
  differenceReason?: string;
  differenceStatus: 'PENDING' | 'HANDLED';
}

export interface PaymentVoucherArchiveInput {
  archived: boolean;
  reason?: string;
}

export interface PendingPaymentSummary {
  id: string;
  payableFinanceItemId: string;
  paymentApplicationId?: string;
  shipmentId: string;
  date: string;
  agentName?: string;
  salesperson?: string;
  customerCode: string;
  customerName: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  transferNo?: string;
  feeName: string;
  amount: number;
  currency: 'RMB' | 'USD';
  remark?: string;
  status: 'PENDING' | 'READY' | 'APPLIED' | 'INVALIDATED' | 'PAID';
  bankAccount?: PayeeBankAccountSummary;
  vouchers: PaymentVoucherSummary[];
  paymentApplicationNo?: string;
  createdAt?: string;
  appliedAt?: string;
}

export interface PendingPaymentListQuery {
  agent?: string;
  salesperson?: string;
  customerCode?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  feeName?: string;
  currency?: 'ALL' | 'RMB' | 'USD';
  amount?: number;
  remark?: string;
  payeeName?: string;
  bankAccountNo?: string;
  applicationDateFrom?: string;
  applicationDateTo?: string;
  status?: 'ALL' | 'PENDING' | 'READY' | 'APPLIED' | 'INVALIDATED' | 'PAID';
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'agentName' | 'systemOrderNo' | 'amount' | 'currency' | 'customerCode';
  sortOrder?: 'asc' | 'desc';
}

export interface PendingPaymentListResponse {
  rows: PendingPaymentSummary[];
  totals: {
    count: number;
    amountByCurrency: Array<{ currency: 'RMB' | 'USD'; amount: number }>;
  };
  pagination: { page: number; pageSize: number; totalItems: number };
}

export interface PaymentApplicationItemSummary {
  id: string;
  pendingPaymentId: string;
  payableFinanceItemId: string;
  shipmentId: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  customerCode: string;
  feeName: string;
  amount: number;
  currency: 'RMB' | 'USD';
}

export interface PaymentApplicationSummary {
  id: string;
  applicationNo: string;
  agentName: string;
  currency: 'RMB' | 'USD';
  totalAmount: number;
  status: 'WAITING_PAYMENT' | 'CANCELED' | 'PAID';
  bankAccount?: PayeeBankAccountSummary;
  remark?: string;
  payerBankName?: string;
  payerBankAccountName?: string;
  payerBankAccountNo?: string;
  paidAt?: string;
  paidBy?: string;
  paidRemark?: string;
  reversedAt?: string;
  reversedBy?: string;
  reverseReason?: string;
  appliedBy?: string;
  appliedAt?: string;
  canceledAt?: string;
  items: PaymentApplicationItemSummary[];
  vouchers: PaymentVoucherSummary[];
}

export interface PaymentApplicationCreateInput {
  pendingPaymentIds: string[];
  bankAccountId?: string;
  manualBankAccount?: PayeeBankAccountInput;
  saveManualBankAccount?: boolean;
  remark?: string;
  voucher?: PaymentVoucherInput;
}

export interface PaymentApplicationUpdateInput {
  bankAccountId?: string;
  manualBankAccount?: PayeeBankAccountInput;
  saveManualBankAccount?: boolean;
  remark?: string;
  voucher?: PaymentVoucherInput;
}

export interface PaymentApplicationCancelInput {
  reason?: string;
}

export interface PaymentApplicationExportRequest {
  ids?: string[];
  query?: PendingPaymentListQuery;
}

export interface PaymentApplicationExportResponse {
  rows: PendingPaymentSummary[];
  exportedAt: string;
}

export interface PaidPaymentSummary {
  id: string;
  applicationNo: string;
  date: string;
  agentName: string;
  salesperson?: string;
  customerCode?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  feeName?: string;
  currency: 'RMB' | 'USD';
  totalAmount: number;
  remark?: string;
  status: 'WAITING_PAYMENT' | 'PAID' | 'CANCELED';
  billVouchers: PaymentVoucherSummary[];
  waterReceipts: PaymentVoucherSummary[];
  payeeBankAccount?: PayeeBankAccountSummary;
  payerBankName?: string;
  payerBankAccountName?: string;
  payerBankAccountNo?: string;
  paidAt?: string;
  paidBy?: string;
  paidRemark?: string;
  items: PaymentApplicationItemSummary[];
}

export interface PaidPaymentListQuery {
  agent?: string;
  salesperson?: string;
  customerCode?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  feeName?: string;
  currency?: 'ALL' | 'RMB' | 'USD';
  amount?: number;
  remark?: string;
  payeeName?: string;
  bankAccountNo?: string;
  payerBank?: string;
  applicationDateFrom?: string;
  applicationDateTo?: string;
  paidDateFrom?: string;
  paidDateTo?: string;
  status?: 'ALL' | 'WAITING_PAYMENT' | 'PAID' | 'CANCELED';
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'agentName' | 'systemOrderNo' | 'amount' | 'currency' | 'customerCode' | 'paidAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaidPaymentListResponse {
  rows: PaidPaymentSummary[];
  totals: {
    count: number;
    waitingPaymentCount: number;
    paidCount: number;
    amountByCurrency: Array<{ currency: 'RMB' | 'USD'; amount: number }>;
  };
  pagination: { page: number; pageSize: number; totalItems: number };
}

export interface PaymentConfirmPaidInput {
  payerBankName: string;
  payerBankAccountName?: string;
  payerBankAccountNo: string;
  paidAt: string;
  paidRemark?: string;
  waterReceipt?: PaymentVoucherInput;
}

export interface PaidPaymentUpdateInput {
  paidRemark?: string;
  waterReceipt?: PaymentVoucherInput;
}

export interface PaidPaymentReverseInput {
  reason?: string;
}

export interface PaymentWaterReceiptInput extends PaymentVoucherInput {
  paymentApplicationId: string;
}

export type VoucherImageUploadContext =
  | 'PENDING_PAYMENT_BILL'
  | 'PAYMENT_APPLICATION_BILL'
  | 'PAID_PAYMENT_RECEIPT'
  | 'WATER_RECEIPT';

export interface VoucherImageUploadInput {
  context: VoucherImageUploadContext;
  pendingPaymentId?: string;
  paymentApplicationId?: string;
  waterReceiptId?: string;
}

export type VoucherImageUploadResponse = PaymentVoucherSummary | WaterReceiptVoucherSummary;

export interface PaidPaymentExportRequest {
  ids?: string[];
  query?: PaidPaymentListQuery;
}

export interface PaidPaymentExportResponse {
  rows: PaidPaymentSummary[];
  exportedAt: string;
}

export interface BusinessCostFeeSummary {
  id: string;
  shipmentId: string;
  name: string;
  amount: number;
  settled: boolean;
  salesperson?: string;
  agentName?: string;
  type?: 'BUSINESS_COST';
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  rmbAmount?: number;
  businessProfit?: number;
  reconciliationStatus?: ShipmentFinanceItemStatus;
  createdAt?: string;
  createdBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  remark?: string;
  locked?: boolean;
  voided?: boolean;
  sourceType?: ShipmentFinanceItemSourceType;
  chargeWeightKg?: number;
  unitPrice?: number;
  amountOverridden?: boolean;
}

export type ShipmentFinanceProfitKey = 'RECEIVABLE_PAYABLE' | 'RECEIVABLE_BUSINESS' | 'BUSINESS_PAYABLE';

export interface ShipmentFinanceProfitSummary {
  key: ShipmentFinanceProfitKey;
  title: string;
  amount: number;
  currency: 'RMB';
}

export interface BusinessCostAuditSummary extends BusinessCostFeeSummary {
  salesperson?: string;
  customerCode: string;
  customerName: string;
  customerOrderNo?: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  transferNo?: string;
  agentName?: string;
  receivableTotal: number;
  businessCostTotal: number;
  businessProfit?: number;
  rmbAmount?: number;
  orderRmbTotal?: number;
  canViewAgent?: boolean;
  canViewProfit?: boolean;
}

export interface BusinessCostAuditListQuery {
  outboundOrderNo?: string;
  systemOrderNo?: string;
  customer?: string;
  customerCode?: string;
  customerName?: string;
  transferNo?: string;
  salesperson?: string;
  feeName?: string;
  createdBy?: string;
  reviewedBy?: string;
  paymentNo?: string;
  reconciliationStatus?: ShipmentFinanceItemStatus | 'ALL';
  status?: ShipmentFinanceItemStatus | 'ALL';
  createdFrom?: string;
  createdTo?: string;
  reviewedFrom?: string;
  reviewedTo?: string;
  remark?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'reviewedAt' | 'amount' | 'rmbAmount' | 'systemOrderNo' | 'customerCode' | 'name' | 'businessProfit';
  sortOrder?: 'asc' | 'desc';
}

export interface BusinessCostAuditListTotals {
  amountByCurrency: Array<{ currency: string; amount: number }>;
  rmbTotal: number;
  pendingCount: number;
  confirmedCount: number;
  voidedCount: number;
  profitTotal?: number;
}

export interface BusinessCostAuditListResponse {
  rows: BusinessCostAuditSummary[];
  totals: BusinessCostAuditListTotals;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  };
}

export interface BusinessCostAuditCreateInput {
  shipmentId?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  customerOrderNo?: string;
  transferNo?: string;
  customerCode?: string;
  name: string;
  amount?: number;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  agentName?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  remark?: string;
}

export interface BusinessCostAuditUpdateInput {
  name?: string;
  amount?: number;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  agentName?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  remark?: string;
}

export interface BusinessCostAuditBatchInput {
  ids: string[];
}

export interface BusinessCostAuditBatchResult {
  successCount: number;
  failureCount: number;
  rows: BusinessCostAuditSummary[];
  failures: Array<{ id: string; reason: string }>;
}

export interface BusinessCostAuditExportRequest {
  ids?: string[];
  query?: BusinessCostAuditListQuery;
}

export interface BusinessCostAuditExportResponse {
  rows: BusinessCostAuditSummary[];
  exportedAt: string;
}

export interface ShipmentFinanceDetailSummary {
  shipmentId: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  agentName?: string;
  receivables: ReceivableFeeSummary[];
  payables?: PayableFeeSummary[];
  businessCosts?: BusinessCostFeeSummary[];
  receivableTotal: number;
  payableTotal?: number;
  businessCostTotal?: number;
  grossProfit?: number;
  canViewPayables?: boolean;
  profitSections?: ShipmentFinanceProfitSummary[];
  paymentAmountUsd?: number;
  paymentAmountCny?: number;
  paymentMethod?: ShipmentPaymentMethod;
}

export interface ShipmentReviewPackageSummary {
  id: string;
  warehousePackageId?: string;
  customerOrderNo: string;
  domesticTrackingNo?: string;
  packageNo?: string;
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  cbm: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  inboundAt?: string;
  warehouseRemark?: string;
  exceptions: string[];
}

export interface ShipmentReviewEventSummary {
  id: string;
  type: 'STATUS' | 'TRACKING' | 'AUDIT';
  title: string;
  note?: string;
  stage?: string;
  sourceModule?: string;
  action?: string;
  fromStatus?: ShipmentStatus;
  toStatus?: ShipmentStatus;
  createdAt: string;
  operator?: string;
}

export interface ShipmentLogisticsTrackingEventSummary {
  id: string;
  trackingAt: string;
  node: string;
  location?: string;
  carrier?: string;
  transferNo?: string;
  rawContent?: string;
  source: string;
}

export interface ShipmentReviewDetailSummary {
  shipment: Shipment;
  packages: ShipmentReviewPackageSummary[];
  finance: ShipmentFinanceDetailSummary;
  events: ShipmentReviewEventSummary[];
  internalTrackingEvents: ShipmentReviewEventSummary[];
  logisticsTrackingEvents: ShipmentLogisticsTrackingEventSummary[];
  problemTickets: ProblemTicketSummary[];
  files: Array<{ id: string; name: string; type: string; url?: string; createdAt?: string }>;
  approvalWarnings: string[];
  overdue: boolean;
}

/**
 * 待审核详情页允许直接修正的基础资料。
 * 不包含状态、重量费用、代理及审核字段，避免绕过既有审核和财务流程。
 */
export interface ShipmentReviewBasicUpdateInput {
  customerCode: string;
  customerOrderNo: string;
  companyChannelName: string;
  inboundNo?: string;
  productName: string;
  destinationCountry: string;
  declarationRequired: boolean;
  cargoType: string;
  subOrderNo?: string;
  fbaInboundNo?: string;
  settlementMethod: string;
  remark?: string;
  receiverName?: string;
  receiverCompany?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  receiverState?: string;
  receiverPostalCode?: string;
  fbaWarehouseCode?: string;
}

export interface ShipmentReviewRejectInput {
  reason: string;
}

export interface ShipmentReviewDeleteInput {
  reason?: string;
}

export interface ShipmentRestoreInput {
  mode?: 'KEEP_ORIGINAL_TIME' | 'RESET_CREATED_TIME' | 'MANUAL_TIME';
  manualCreatedAt?: string;
  reason?: string;
}

export interface ReceivableAdjustmentInput {
  name: string;
  amount: number;
}

export interface ShipmentFinanceItemCreateInput {
  type: ShipmentFinanceItemType;
  name: string;
  amount: number;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  reconciliationStatus?: ShipmentFinanceItemStatus;
  agentName?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  amountOverridden?: boolean;
  remark?: string;
}

export interface ShipmentFinanceItemUpdateInput {
  name?: string;
  amount?: number;
  currency?: string;
  settlementMethod?: string;
  paymentNo?: string;
  reconciliationStatus?: ShipmentFinanceItemStatus;
  agentName?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  amountOverridden?: boolean;
  remark?: string;
}

export interface OrderEntryShipmentInput {
  customerId?: string;
  customerCode?: string;
  customerOrderNo: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  entryAt?: string;
  outboundAt?: string;
  transferNo?: string;
  subOrderNo?: string;
  inboundNo?: string;
  businessType: BusinessType;
  packageType: 'DOC' | 'WPX' | 'PAK';
  destinationCountry: string;
  receivingChannel?: string;
  channelId?: string;
  agentId?: string;
  declarationRequired: boolean;
  sensitive?: boolean;
  cargoType: string;
  productName: string;
  settlementMethod: string;
  tradeTerms?: string;
  fbaInboundNo?: string;
  receiverName?: string;
  receiverCompany?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  receiverState?: string;
  receiverPostalCode?: string;
  fbaWarehouseCode?: string;
  remark?: string;
  packageCount?: number;
  actualWeightKg?: number;
  volumeCbm?: number;
  chargeableWeightKg?: number;
  cargoDataSource?: 'AUTO_MATCHED' | 'MANUAL_ADJUSTED';
  chargeWeightOverridden?: boolean;
  reviewValidationError?: string;
}

export interface OrderEntryFinanceItemInput extends ShipmentFinanceItemCreateInput {
  type: ShipmentFinanceItemType;
  receiptId?: string;
  receiptMatchAmount?: number;
}

export interface OrderEntryCreateInput {
  shipment: OrderEntryShipmentInput;
  warehousePackageIds: string[];
  receivables: OrderEntryFinanceItemInput[];
  businessCosts: OrderEntryFinanceItemInput[];
  payables?: OrderEntryFinanceItemInput[];
  submitForReview: boolean;
}

export interface OrderEntryDraftUpdateInput extends OrderEntryCreateInput {}

export interface OrderEntryWarehousePackageQuery {
  customerCode?: string;
  domesticTrackingNo?: string;
  packageIds?: string[];
}

export interface OrderEntryDetailSummary {
  shipment: Shipment;
  packages: WarehousePackageSummary[];
  receivables: ReceivableFeeSummary[];
  businessCosts: BusinessCostFeeSummary[];
  payables: PayableFeeSummary[];
  canViewPayables: boolean;
}

export interface CustomerStatementCreateInput {
  customerId: string;
  periodStart: string;
  periodEnd: string;
}

export interface CustomerStatementSummary {
  id?: string;
  customerId: string;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  total: number;
  feeCount: number;
  status: 'DRAFT' | 'CONFIRMED' | 'SETTLED';
  createdAt?: string;
}

export interface CustomerAccountSummary {
  customerId: string;
  customerName: string;
  balance: number;
  currency: string;
}

export interface PaymentCreateInput {
  customerId: string;
  amount: number;
  feeIds?: string[];
  statementId?: string;
  note?: string;
}

export interface PaymentSummary {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  settledAmount: number;
  remainingAmount: number;
  createdAt: string;
}

export interface AccountLedgerSummary {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  balance: number;
  note?: string;
  createdAt: string;
}

export interface PaymentCreateResponse {
  payment: PaymentSummary;
  account: CustomerAccountSummary;
  settledFees: ReceivableFeeSummary[];
  statement?: CustomerStatementSummary;
}

export interface CustomerSummary {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  fullName?: string;
  customerType?: string;
  customerSource?: string;
  salesperson?: string;
  defaultSettlementMethod?: string;
  enabled: boolean;
}

export interface CustomerContactSummary {
  id: string;
  customerId: string;
  customerName: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  fbaWarehouseCode?: string;
  address?: string;
  country?: string;
  state?: string;
  postalCode?: string;
  enabled: boolean;
}

export interface CustomerUserSummary {
  id: string;
  customerId: string;
  customerName: string;
  username: string;
  enabled: boolean;
}

export type AgentIntegrationType = 'MANUAL' | 'API' | 'PLATFORM' | 'OTHER';

export interface AgentSummary {
  id: string;
  code?: string;
  shortName?: string;
  name: string;
  createdAt: string;
  integrationType?: AgentIntegrationType;
  warehouseAddress1?: string;
  warehouseAddress2?: string;
  warehouseAddress3?: string;
  warehouseContact?: string;
  invoiceTemplateName?: string;
  invoiceTemplateUrl?: string;
  trackingWebsite?: string;
  enabled: boolean;
}

export interface AgentDeleteFailure {
  id: string;
  shortName?: string;
  name?: string;
  reasons: string[];
}

export interface AgentDeleteResponse {
  successCount: number;
  deletedAgents: AgentSummary[];
  failures: AgentDeleteFailure[];
  hardDelete: true;
}

export interface CarrierSummary {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ChannelSummary {
  id: string;
  name: string;
  carrierId: string;
  carrierName: string;
  businessType: BusinessType;
  category: string;
  volumeDivisor: number;
  multiPieceWeightRule: string;
  singleWeightRoundingRule: string;
  settlementWeightRule: string;
  settlementWeightRoundingRule: string;
  largeCargoThresholdKg?: number;
  remoteAreaRule: string;
  enabled: boolean;
}

export interface CompanyChannelWeightPackage {
  packageCount: number;
  /** Actual weight of one package. */
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface CompanyChannelCargoData {
  packageCount: number;
  actualWeightKg: number;
  volumeCbm: number;
}

export function calculateCompanyChannelChargeWeight(
  channel: Pick<ChannelSummary, 'volumeDivisor' | 'multiPieceWeightRule' | 'singleWeightRoundingRule' | 'settlementWeightRule' | 'settlementWeightRoundingRule' | 'largeCargoThresholdKg'>,
  packages: CompanyChannelWeightPackage[]
): number {
  const divisor = Math.max(1, Number(channel.volumeDivisor) || 5000);
  const rounding = (weight: number) => {
    if (channel.singleWeightRoundingRule === 'CEIL') return Math.ceil(weight);
    if (channel.singleWeightRoundingRule === 'HALF_BELOW_HALF_UP') return Math.ceil(weight * 2) / 2;
    return weight;
  };
  const rows = packages.map((pkg) => {
    const packageCount = Math.max(1, Number(pkg.packageCount) || 1);
    // Warehouse rows record the actual weight and dimensions of one package;
    // a row's packageCount therefore applies to both actual and volumetric weight.
    const actual = Math.max(0, Number(pkg.weightKg) || 0) * packageCount;
    const volumetric = Math.max(0, (Number(pkg.lengthCm) || 0) * (Number(pkg.widthCm) || 0) * (Number(pkg.heightCm) || 0) * packageCount / divisor);
    const compared = channel.settlementWeightRule === 'ACTUAL_ONLY' ? actual : Math.max(actual, volumetric);
    return { actual, volumetric, compared };
  });
  const actualTotal = rows.reduce((sum, row) => sum + row.actual, 0);
  const volumetricTotal = rows.reduce((sum, row) => sum + row.volumetric, 0);
  let weight: number;
  if (channel.multiPieceWeightRule === 'COMPARE_ROUND_THEN_SUM') {
    weight = rows.reduce((sum, row) => sum + rounding(row.compared), 0);
  } else if (channel.multiPieceWeightRule === 'COMPARE_THEN_SUM') {
    weight = rows.reduce((sum, row) => sum + row.compared, 0);
  } else {
    weight = channel.settlementWeightRule === 'ACTUAL_ONLY' ? actualTotal : Math.max(actualTotal, volumetricTotal);
    if (channel.multiPieceWeightRule === 'SUM_THEN_COMPARE_ROUND') weight = rounding(weight);
  }
  const largeThreshold = Math.max(0, Number(channel.largeCargoThresholdKg) || 21);
  if (channel.settlementWeightRoundingRule === 'LARGE_1_SMALL_0_5') {
    weight = weight >= largeThreshold ? Math.ceil(weight) : Math.ceil(weight * 2) / 2;
  } else if (channel.settlementWeightRoundingRule === 'LARGE_0_1_SMALL_NONE' && weight >= largeThreshold) {
    weight = Math.ceil(weight * 10) / 10;
  } else if (channel.settlementWeightRoundingRule === 'MIN_HALF') {
    weight = Math.max(0.5, weight);
  }
  return Math.round(weight * 100) / 100;
}

/**
 * Manual order-entry cargo is an aggregate record. Its declared CBM is
 * compared as one batch while retaining the selected company-channel rules.
 */
export function calculateCompanyChannelChargeWeightFromCargo(
  channel: Pick<ChannelSummary, 'volumeDivisor' | 'multiPieceWeightRule' | 'singleWeightRoundingRule' | 'settlementWeightRule' | 'settlementWeightRoundingRule' | 'largeCargoThresholdKg'>,
  cargo: CompanyChannelCargoData
): number {
  const volumeCbm = Math.max(0, Number(cargo.volumeCbm) || 0);
  return calculateCompanyChannelChargeWeight(channel, [{
    packageCount: 1,
    weightKg: Math.max(0, Number(cargo.actualWeightKg) || 0),
    // 1 CBM = 1,000,000 cubic centimetres.
    lengthCm: volumeCbm * 1_000_000,
    widthCm: 1,
    heightCm: 1
  }]);
}

export interface AgentChannelSummary {
  id: string;
  agentId: string;
  agentName: string;
  channelName: string;
  enabled: boolean;
}

export interface ChannelCategorySummary {
  id: string;
  name: string;
  enabled: boolean;
}

export interface SurchargeSummary {
  id: string;
  name: string;
  amount: number;
  enabled: boolean;
}

export interface FuelRateSummary {
  id: string;
  channelId: string;
  channelName: string;
  rate: number;
  activeAt: string;
}

export interface ExchangeRateSummary {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  activeAt: string;
  endAt?: string;
  enabled: boolean;
}

export interface MasterDataSnapshot {
  customers: CustomerSummary[];
  contacts: CustomerContactSummary[];
  customerUsers: CustomerUserSummary[];
  agents: AgentSummary[];
  agentChannels: AgentChannelSummary[];
  carriers: CarrierSummary[];
  channelCategories: ChannelCategorySummary[];
  channels: ChannelSummary[];
  surcharges: SurchargeSummary[];
  fuelRates: FuelRateSummary[];
  exchangeRates: ExchangeRateSummary[];
  roles: string[];
}

export interface CustomerCreateInput {
  code: string;
  name: string;
  shortName?: string;
  fullName?: string;
  customerType?: string;
  customerSource?: string;
  salesperson?: string;
  defaultSettlementMethod?: string;
}

export interface CustomerUpdateInput extends CustomerCreateInput {
  enabled?: boolean;
}

export interface CustomerContactCreateInput {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  fbaWarehouseCode?: string;
  address?: string;
  country?: string;
  state?: string;
  postalCode?: string;
}

export interface CustomerContactUpdateInput extends CustomerContactCreateInput {
  enabled?: boolean;
}

export interface CustomerUserCreateInput {
  username: string;
  password: string;
}

export interface AgentCreateInput {
  name: string;
  code?: string;
  shortName?: string;
  integrationType?: AgentIntegrationType;
  warehouseAddress1?: string;
  warehouseAddress2?: string;
  warehouseAddress3?: string;
  warehouseContact?: string;
  invoiceTemplateName?: string;
  invoiceTemplateUrl?: string;
  trackingWebsite?: string;
}

export interface AgentUpdateInput extends AgentCreateInput {
  enabled?: boolean;
}

export interface AgentChannelCreateInput {
  agentId: string;
  channelName: string;
}

export interface AgentChannelUpdateInput extends AgentChannelCreateInput {
  enabled?: boolean;
}

export interface CarrierCreateInput {
  name: string;
}

export interface ChannelCreateInput {
  name: string;
  carrierId: string;
  carrierName?: string;
  businessType?: BusinessType;
  category?: string;
  volumeDivisor?: number;
  multiPieceWeightRule?: string;
  singleWeightRoundingRule?: string;
  settlementWeightRule?: string;
  settlementWeightRoundingRule?: string;
  largeCargoThresholdKg?: number;
  remoteAreaRule?: string;
}

export interface ChannelUpdateInput extends ChannelCreateInput {
  enabled?: boolean;
}

export interface ChannelCategoryCreateInput {
  name: string;
}

export interface ChannelCategoryUpdateInput extends ChannelCategoryCreateInput {
  enabled?: boolean;
}

export interface SurchargeCreateInput {
  name: string;
  amount: number;
}

export interface FuelRateCreateInput {
  channelId: string;
  rate: number;
  activeAt: string;
}

export interface ExchangeRateCreateInput {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  activeAt: string;
  endAt?: string;
}

export interface ExchangeRateUpdateInput {
  baseCurrency?: string;
  quoteCurrency?: string;
  rate?: number;
  activeAt?: string;
  endAt?: string;
  enabled?: boolean;
}

export interface EnabledUpdateInput {
  enabled: boolean;
}

export interface MasterDataSnapshotSummary {
  enabledCustomers: number;
  enabledChannels: number;
  enabledAgents: number;
  enabledCarriers: number;
  enabledSurcharges: number;
  activeExchangeRates: number;
}

export interface StatementSummaryInput {
  customerId: string;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  fees: ReceivableFeeSummary[];
}

export interface PaymentSettlementInput {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  settledAmount: number;
  createdAt: string;
}

export interface ShipmentInsightInput {
  status: ShipmentStatus;
  trackingStaleDays: number;
  isRemoteArea: boolean;
  hasProblemTicket: boolean;
  chargeableWeightKg: number;
  carrier: string;
}

export interface ShipmentInsight {
  riskLevel: RiskLevel;
  tags: string[];
  summary: string;
  suggestedActions: string[];
}

export interface ShipmentImportRow {
  customerOrderNo: string;
  destinationCountry: string;
  weightKg: number;
  channelName: string;
}

export interface ShipmentImportError {
  rowNumber: number;
  field: keyof ShipmentImportRow;
  message: string;
}

export interface ShipmentImportValidationResult {
  validRows: ShipmentImportRow[];
  errors: ShipmentImportError[];
}

export interface ShipmentCreateInput {
  customerId?: string;
  customerOrderNo: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  entryAt?: string;
  transferNo?: string;
  subOrderNo?: string;
  inboundNo?: string;
  warehousePackageIds?: string[];
  draftWarehousePackageIds?: string[];
  bindWarehousePackages?: boolean;
  businessType: BusinessType;
  packageType: 'DOC' | 'WPX' | 'PAK';
  destinationCountry: string;
  packageCount: number;
  receivableWeightKg: number;
  agentWeightKg?: number;
  channelId?: string;
  agentId?: string;
  receivingChannel?: string;
  initialStatus?: ShipmentStatus;
  latestTracking?: string;
  productName?: string;
  declarationRequired?: boolean;
  sensitive?: boolean;
  cargoType?: string;
  volumeCbm?: number;
  actualWeightKg?: number;
  cargoDataSource?: 'AUTO_MATCHED' | 'MANUAL_ADJUSTED';
  chargeWeightOverridden?: boolean;
  reviewValidationError?: string;
  settlementMethod?: string;
  tradeTerms?: string;
  fbaInboundNo?: string;
  receiverName?: string;
  receiverCompany?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  receiverState?: string;
  receiverPostalCode?: string;
  fbaWarehouseCode?: string;
  outboundAt?: string;
  remark?: string;
}

export interface ShipmentImportRequest {
  customerId?: string;
  rows: ShipmentImportRow[];
}

export interface ShipmentImportResponse {
  created: Shipment[];
  errors: ShipmentImportError[];
}

export interface ShipmentActionResponse {
  shipment: Shipment;
  message: string;
}

export interface ShipmentInternalFlowLogItem {
  key: string;
  stage: string;
  happenedAt?: string;
  operator?: string;
  summary: string;
}

export interface ShipmentInternalFlowLogResponse {
  shipmentId: string;
  systemOrderNo: string;
  items: ShipmentInternalFlowLogItem[];
}

export interface NavigationUnreadBadgeItem {
  moduleKey: string;
  sectionKey?: string;
  unreadCount: number;
  displayCount: string;
  latestWatermark?: string;
}

export interface NavigationUnreadBadgesResponse {
  items: NavigationUnreadBadgeItem[];
}

export interface NavigationReadStateInput {
  moduleKey: string;
  sectionKey?: string;
}

export interface TrackingEventInput {
  status: string;
  happenedAt: string;
  visibleToCustomer?: boolean;
  location?: string;
  carrier?: string;
  transferNo?: string;
  rawContent?: string;
  source?: 'CARRIER_API' | 'THIRD_PARTY' | 'MANUAL_IMPORT' | 'MANUAL_ENTRY';
}

export interface ProblemTicketCreateInput {
  reason: string;
  customerVisible?: boolean;
  tags?: string[];
  pushToSales?: boolean;
}

export interface ProblemTicketSummary {
  id: string;
  shipmentId: string;
  systemOrderNo: string;
  customerName: string;
  reason: string;
  status: string;
  customerVisible: boolean;
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
  assistanceReason?: string;
  assistanceRequestedAt?: string;
  tagSnapshot?: string[];
  replies: Array<{ id: string; author: string; message: string; createdAt: string }>;
}

export interface CommonTagSummary {
  id: string;
  name: string;
  scene: 'PROBLEM_TICKET';
  enabled: boolean;
  customerVisibleAllowed: boolean;
  sortOrder: number;
}

export type AutomationPriority = 'urgent' | 'high' | 'normal';

export interface AutomationPlanItem {
  shipmentId: string;
  priority: AutomationPriority;
  title: string;
  actions: string[];
}

export type ProductSurface = '员工端' | '客户端' | 'AI 助手' | '开放集成';
export type ModulePhase = 'phase-one' | 'phase-two';

export interface ProductModule {
  name: string;
  surface: ProductSurface;
  phase: ModulePhase;
  capabilities: string[];
  aiEnhancements: string[];
}

export interface FulfillmentActionContext {
  status: ShipmentStatus;
  hasTransferNo?: boolean;
}

export interface FulfillmentStageSummary {
  reviewing: number;
  declared: number;
  receiving: number;
  sorting: number;
  dispatching: number;
  online: number;
  signing: number;
  exception: number;
}

export interface FulfillmentAdvice {
  priority: AutomationPriority;
  nextAction: string;
  riskReasons: string[];
  customerMessage: string;
}

export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  DRAFT: '待审核',
  REVIEW_PENDING: '待审核',
  DECLARED: '已预报',
  WAITING_RECEIVE: '已入库',
  WAITING_SORT: '待排货',
  WAITING_DISPATCH: '待出库',
  OUTBOUNDED: '已出库',
  WAITING_DEPARTURE: '待离港',
  DEPARTED: '已离港',
  ARRIVED_PORT: '已到港',
  DELIVERING: '已派送',
  WAITING_ONLINE: '待上网',
  WAITING_SIGNED: '待签收',
  WAITING_RETURN: '待退货',
  PROBLEM: '问题件',
  STUCK: '滞留件',
  SIGNED: '已签收',
  REVIEW_REJECTED: '审核不通过',
  CANCELLED: '已取消'
};

export const businessTypeLabels: Record<BusinessType, string> = {
  EXPRESS: '快递',
  SMALL_PACKET: '小包',
  DEDICATED_LINE: '专线'
};

export const productModules: ProductModule[] = [
  {
    name: '我的订单',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['录单', '审核', '排货', '出库', '转单号', '离港', '到港', '派送', '签收', '问题件'],
    aiEnhancements: ['异常优先级排序', '自动生成处理建议', '批量操作风险提示']
  },
  {
    name: '运营工作台',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['业务类型切换', '状态池', '多字段筛选', '批量操作', '轨迹监控'],
    aiEnhancements: ['今日待办摘要', '轨迹超时解释', '客户沟通草稿']
  },
  {
    name: '仓库管理',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['待出库订单', '包裹明细', '理货管理', '面单队列&待仓库出货', '已出库'],
    aiEnhancements: ['重量异常识别', '理货风险提示', '收货资料补全']
  },
  {
    name: '报价查价',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['客户报价', '代理成本价', '分区', '燃油', '附加费', '价格试算'],
    aiEnhancements: ['自然语言查价', '报价差异解释', '推荐最优渠道']
  },
  {
    name: '问题件中心',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['新建问题', '回复查看', '关闭问题', '附件', '客户可见状态'],
    aiEnhancements: ['自动归类问题原因', '生成客户回复', 'SLA 超时提醒']
  },
  {
    name: '财务结算',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['应收费用', '应付费用', '客户对账', '代理对账', '收付款', '核销', '余额流水'],
    aiEnhancements: ['费用差异解释', '欠费风险提示', '对账单摘要']
  },
  {
    name: '统计报表',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['运单报表', '收货统计', '发货统计', '应收应付分析', '利润分析'],
    aiEnhancements: ['经营异常洞察', '利润波动解释']
  },
  {
    name: '基础资料',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['客户', '代理', '承运商', '渠道', '国家地区', '费用名称', '汇率'],
    aiEnhancements: ['资料缺失检查', '渠道配置建议']
  },
  {
    name: '客户门户',
    surface: '客户端',
    phase: 'phase-one',
    capabilities: ['预报运单', '我的运单', '问题件', '价格查询', '费用明细', '对账单', '账户余额'],
    aiEnhancements: ['智能录单', '物流问答', '费用解释']
  },
  {
    name: '系统设置',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['公司资料', '模板', '通知', '轨迹规则', '状态字典', '权限'],
    aiEnhancements: ['配置健康检查', '规则冲突提示']
  },
  {
    name: 'AI 助手',
    surface: 'AI 助手',
    phase: 'phase-one',
    capabilities: ['智能录单', '异常解释', '客户回复', '费用问答', '日报生成'],
    aiEnhancements: ['上下文任务编排', '可审计建议记录']
  },
  {
    name: '开放 API',
    surface: '开放集成',
    phase: 'phase-two',
    capabilities: ['代理 API', '承运商 API', '轨迹抓取', '打印套件', '电子秤', 'PDA', '微信入口'],
    aiEnhancements: ['接口失败诊断', '自动重试建议']
  }
];

const allowedTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  DRAFT: ['REVIEW_PENDING', 'WAITING_SORT', 'REVIEW_REJECTED', 'DECLARED', 'CANCELLED'],
  REVIEW_PENDING: ['WAITING_SORT', 'REVIEW_REJECTED', 'DRAFT', 'CANCELLED'],
  DECLARED: ['WAITING_RECEIVE', 'CANCELLED'],
  WAITING_RECEIVE: ['WAITING_SORT', 'PROBLEM', 'WAITING_RETURN'],
  WAITING_SORT: ['WAITING_DISPATCH'],
  WAITING_DISPATCH: ['OUTBOUNDED'],
  OUTBOUNDED: ['WAITING_DEPARTURE', 'PROBLEM'],
  WAITING_DEPARTURE: ['DEPARTED', 'PROBLEM'],
  DEPARTED: ['ARRIVED_PORT', 'PROBLEM'],
  ARRIVED_PORT: ['DELIVERING', 'SIGNED', 'PROBLEM'],
  DELIVERING: ['SIGNED', 'PROBLEM'],
  WAITING_ONLINE: ['WAITING_SIGNED', 'PROBLEM', 'STUCK', 'WAITING_RETURN'],
  WAITING_SIGNED: ['SIGNED', 'PROBLEM', 'STUCK'],
  WAITING_RETURN: ['CANCELLED'],
  PROBLEM: ['WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'CANCELLED'],
  STUCK: ['WAITING_ONLINE', 'WAITING_SIGNED', 'PROBLEM'],
  SIGNED: [],
  REVIEW_REJECTED: ['DRAFT', 'REVIEW_PENDING', 'WAITING_SORT', 'CANCELLED'],
  CANCELLED: []
};

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function calculateChargeableWeight(input: ChargeableWeightInput) {
  const divisor = input.divisor ?? 5000;
  const volumetricWeightKg = round2((input.lengthCm * input.widthCm * input.heightCm) / divisor);
  const chargeableWeightKg = Math.max(input.actualWeightKg, volumetricWeightKg);

  return {
    actualWeightKg: round2(input.actualWeightKg),
    volumetricWeightKg,
    chargeableWeightKg: round2(chargeableWeightKg)
  };
}

export function calculateQuote(input: QuoteInput): QuoteResponse {
  const freight = round2(input.chargeableWeightKg * input.baseRatePerKg);
  const fuel = round2(freight * input.fuelRate);
  const surchargeTotal = round2(input.surcharges.reduce((sum, item) => sum + item.amount, 0));

  return {
    freight,
    fuel,
    surchargeTotal,
    total: round2(freight + fuel + surchargeTotal)
  };
}

export function quoteWithPricingRules(input: PricingRuleQuoteInput): PricingRuleQuoteResponse {
  const rule = input.rules.find(
    (item) =>
      item.enabled &&
      item.channelId === input.channelId &&
      item.destinationCountry === input.destinationCountry &&
      input.chargeableWeightKg >= item.minWeightKg &&
      input.chargeableWeightKg <= item.maxWeightKg
  );
  if (!rule) {
    throw new Error('无可用报价规则');
  }

  const fuelRate = [...input.fuelRates]
    .filter((item) => item.channelId === input.channelId)
    .sort((left, right) => Date.parse(right.activeAt) - Date.parse(left.activeAt))[0]?.rate ?? 0;
  const appliedSurcharges = input.surcharges
    .filter((item) => item.enabled)
    .map((item) => ({ name: item.name, amount: item.amount }));
  const originalCurrency = rule.currency.trim().toUpperCase();
  const exchangeRate = originalCurrency === 'RMB'
    ? 1
    : [...input.exchangeRates]
      .filter((item) => item.enabled && item.baseCurrency === originalCurrency && item.quoteCurrency === 'RMB' && Date.parse(item.activeAt) <= Date.now() && (!item.endAt || Date.parse(item.endAt) >= Date.now()))
      .sort((left, right) => Date.parse(right.activeAt) - Date.parse(left.activeAt))[0]?.rate;

  if (!exchangeRate) {
    throw new Error('无可用汇率');
  }

  const quote = calculateQuote({
    chargeableWeightKg: input.chargeableWeightKg,
    baseRatePerKg: rule.ratePerKg * exchangeRate,
    fuelRate,
    surcharges: appliedSurcharges
  });

  return {
    ...quote,
    rule,
    currency: 'RMB',
    originalCurrency,
    exchangeRate,
    appliedFuelRate: fuelRate,
    appliedSurcharges
  };
}

export function createFeeLinesFromQuote(
  shipmentId: string,
  quote: QuoteResponse,
  adjustments: FeeLineInput[] = []
): FeeLineDraft[] {
  const lines: FeeLineDraft[] = [
    { shipmentId, name: '基础运费', amount: quote.freight },
    { shipmentId, name: '燃油费', amount: quote.fuel }
  ];

  if (quote.surchargeTotal !== 0) {
    lines.push({ shipmentId, name: '附加费', amount: quote.surchargeTotal });
  }

  for (const adjustment of adjustments) {
    if (adjustment.amount !== 0) {
      lines.push({ shipmentId, name: adjustment.name, amount: round2(adjustment.amount) });
    }
  }

  return lines;
}

export function summarizeStatement(input: StatementSummaryInput): CustomerStatementSummary {
  const unsettledFees = input.fees.filter((fee) => !fee.settled);
  return {
    customerId: input.customerId,
    customerName: input.customerName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    total: round2(unsettledFees.reduce((sum, fee) => sum + fee.amount, 0)),
    feeCount: unsettledFees.length,
    status: 'DRAFT'
  };
}

export function summarizePaymentSettlement(input: PaymentSettlementInput): PaymentSummary {
  return {
    id: input.id,
    customerId: input.customerId,
    customerName: input.customerName,
    amount: round2(input.amount),
    settledAmount: round2(input.settledAmount),
    remainingAmount: round2(input.amount - input.settledAmount),
    createdAt: input.createdAt
  };
}

export function summarizeMasterDataSnapshot(snapshot: MasterDataSnapshot): MasterDataSnapshotSummary {
  return {
    enabledCustomers: snapshot.customers.filter((item) => item.enabled).length,
    enabledChannels: snapshot.channels.filter((item) => item.enabled).length,
    enabledAgents: snapshot.agents.filter((item) => item.enabled).length,
    enabledCarriers: snapshot.carriers.filter((item) => item.enabled).length,
    enabledSurcharges: snapshot.surcharges.filter((item) => item.enabled).length,
    activeExchangeRates: snapshot.exchangeRates.filter((item) => item.enabled).length
  };
}

export function createShipmentInsights(input: ShipmentInsightInput): ShipmentInsight {
  const tags: string[] = [];
  const suggestedActions: string[] = [];
  let score = 0;

  if (input.trackingStaleDays >= 5) {
    score += 3;
    tags.push('轨迹超时');
    suggestedActions.push('优先联系代理确认上网节点');
  } else if (input.trackingStaleDays >= 3) {
    score += 1;
    tags.push('轨迹需关注');
  }

  if (input.isRemoteArea) {
    score += 1;
    tags.push('偏远地区');
    suggestedActions.push('核对偏远费是否已计入报价');
  }

  if (input.hasProblemTicket || input.status === 'PROBLEM') {
    score += 3;
    tags.push('存在问题件');
    suggestedActions.push('查看问题件回复并同步客户');
  }

  if (input.chargeableWeightKg >= 50) {
    score += 1;
    tags.push('大重量');
    suggestedActions.push('复核实重和材积重，避免财务差异');
  }

  const riskLevel: RiskLevel = score >= 5 ? 'high' : score >= 2 ? 'medium' : 'low';
  const summary =
    riskLevel === 'high'
      ? `${input.carrier} 运单存在高风险节点，建议今日优先处理。`
      : riskLevel === 'medium'
        ? `${input.carrier} 运单有可控风险，建议进入跟进队列。`
        : `${input.carrier} 运单暂无明显风险。`;

  return {
    riskLevel,
    tags: tags.length ? tags : ['正常'],
    summary,
    suggestedActions: suggestedActions.length ? suggestedActions : ['保持常规轨迹监控']
  };
}

export function validateShipmentImportRows(rows: ShipmentImportRow[]): ShipmentImportValidationResult {
  const seenOrderNos = new Set<string>();
  const errors: ShipmentImportError[] = [];
  const validRows: ShipmentImportRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const normalizedOrderNo = row.customerOrderNo.trim();
    const rowErrors: ShipmentImportError[] = [];

    if (!normalizedOrderNo) {
      rowErrors.push({ rowNumber, field: 'customerOrderNo', message: '客户单号不能为空' });
    } else if (seenOrderNos.has(normalizedOrderNo)) {
      rowErrors.push({ rowNumber, field: 'customerOrderNo', message: '客户单号重复' });
    }

    if (!row.destinationCountry.trim()) {
      rowErrors.push({ rowNumber, field: 'destinationCountry', message: '目的地国家不能为空' });
    }

    if (!Number.isFinite(row.weightKg) || row.weightKg <= 0) {
      rowErrors.push({ rowNumber, field: 'weightKg', message: '重量必须大于 0' });
    }

    if (!row.channelName.trim()) {
      rowErrors.push({ rowNumber, field: 'channelName', message: '渠道不能为空' });
    }

    if (rowErrors.length === 0) {
      validRows.push({ ...row, customerOrderNo: normalizedOrderNo });
    }

    if (normalizedOrderNo) {
      seenOrderNos.add(normalizedOrderNo);
    }

    errors.push(...rowErrors);
  });

  return { validRows, errors };
}

export function createSystemOrderNo(businessType: BusinessType, date: Date, sequence: number): string {
  const prefixes: Record<BusinessType, string> = {
    EXPRESS: 'GJ',
    SMALL_PACKET: 'XB',
    DEDICATED_LINE: 'ZX'
  };
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const serial = String(sequence).padStart(5, '0');

  return `SY${prefixes[businessType]}${year}${month}${day}${serial}`;
}

export function createMockTransferNo(carrier: CarrierAdapterCode, date: Date, sequence: number): string {
  const prefixes: Record<CarrierAdapterCode, string> = {
    DHL: 'DHL',
    FEDEX: 'FDX',
    UPS: '1Z',
    USPS: 'USPS',
    OTHER: 'SIM'
  };
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const serial = String(sequence).padStart(5, '0');

  return `${prefixes[carrier]}${year}${month}${day}${serial}`;
}

export function createMockTrackingStatus(carrier: CarrierAdapterCode, transferNo: string): string {
  const messages: Record<CarrierAdapterCode, string> = {
    DHL: 'DHL 已揽收',
    FEDEX: 'FEDEX 运输中',
    UPS: 'UPS 运输中',
    USPS: 'USPS 已交邮',
    OTHER: '承运商已接收'
  };
  return `${messages[carrier]} ${transferNo}`;
}

export function createAutomationPlan(shipments: Shipment[]): AutomationPlanItem[] {
  return shipments
    .map((shipment) => {
      const insight = createShipmentInsights({
        status: shipment.status,
        trackingStaleDays: shipment.trackingStaleDays,
        isRemoteArea: shipment.isRemoteArea,
        hasProblemTicket: shipment.hasProblemTicket,
        chargeableWeightKg: shipment.receivableWeightKg,
        carrier: shipment.carrier
      });
      const actions = new Set<string>(insight.suggestedActions);

      if (shipment.hasProblemTicket || shipment.status === 'PROBLEM') {
        actions.add('同步客户异常说明');
      }

      if (Math.abs(shipment.receivableWeightKg - shipment.agentWeightKg) >= 1 || shipment.receivableWeightKg >= 50) {
        actions.add('复核应收/应付费用差异');
      }

      if (!shipment.transferNo && ['WAITING_DISPATCH', 'WAITING_ONLINE', 'WAITING_SIGNED'].includes(shipment.status)) {
        actions.add('补齐转单号后再推进状态');
      }

      const priority: AutomationPriority =
        insight.riskLevel === 'high' ? 'urgent' : insight.riskLevel === 'medium' ? 'high' : 'normal';

      return {
        shipmentId: shipment.id,
        priority,
        title: `${shipment.systemOrderNo} · ${shipment.customerName}`,
        actions: Array.from(actions)
      };
    })
    .sort((a, b) => automationPriorityWeight(b.priority) - automationPriorityWeight(a.priority));
}

export function getAvailableFulfillmentActions(context: FulfillmentActionContext): FulfillmentAction[] {
  const hasTransferNo = context.hasTransferNo ?? true;
  const actionsByStatus: Record<ShipmentStatus, FulfillmentAction[]> = {
    DRAFT: ['confirm-declare', 'reject-declare'],
    REVIEW_PENDING: ['confirm-declare', 'reject-declare'],
    DECLARED: ['confirm-receive'],
    WAITING_RECEIVE: ['create-problem', 'mark-return'],
    WAITING_SORT: ['assign-route'],
    WAITING_DISPATCH: ['confirm-dispatch'],
    OUTBOUNDED: ['fill-transfer-no'],
    WAITING_DEPARTURE: ['add-tracking', 'create-problem'],
    DEPARTED: ['add-tracking'],
    ARRIVED_PORT: ['add-tracking', 'create-problem'],
    DELIVERING: ['add-tracking', 'create-problem'],
    WAITING_ONLINE: ['add-tracking', 'create-problem', 'mark-return'],
    WAITING_SIGNED: ['add-tracking', 'create-problem'],
    WAITING_RETURN: ['add-tracking'],
    PROBLEM: ['add-tracking', 'mark-return'],
    STUCK: ['add-tracking', 'create-problem', 'mark-return'],
    SIGNED: [],
    REVIEW_REJECTED: [],
    CANCELLED: []
  };
  const actions = actionsByStatus[context.status];

  if (!hasTransferNo && context.status === 'OUTBOUNDED') {
    return ['fill-transfer-no', ...actions.filter((action) => action !== 'fill-transfer-no')];
  }

  return actions;
}

export function summarizeFulfillmentStages(shipments: Shipment[], businessType: BusinessType | 'ALL' = 'EXPRESS'): FulfillmentStageSummary {
  const scopedShipments = businessType === 'ALL' ? shipments : shipments.filter((shipment) => shipment.businessType === businessType);

  return {
    reviewing: scopedShipments.filter((shipment) => shipment.status === 'DRAFT').length,
    declared: scopedShipments.filter((shipment) => shipment.status === 'DECLARED').length,
    receiving: 0,
    sorting: scopedShipments.filter((shipment) => shipment.status === 'WAITING_SORT').length,
    dispatching: scopedShipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH').length,
    online: scopedShipments.filter((shipment) => ['OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING'].includes(shipment.status)).length,
    signing: scopedShipments.filter((shipment) => shipment.status === 'SIGNED').length,
    exception: scopedShipments.filter((shipment) => ['REVIEW_REJECTED', 'PROBLEM'].includes(shipment.status)).length
  };
}

export function calculateTransitTimeLabel(shipment: Shipment, now: string | Date = new Date()): string {
  if (!shipment.dispatchedAt) {
    return '未出货';
  }

  const start = new Date(shipment.dispatchedAt).getTime();
  const end = shipment.signedAt ? new Date(shipment.signedAt).getTime() : new Date(now).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return '时效待确认';
  }

  const days = Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
  return shipment.signedAt || shipment.status === 'SIGNED' ? `签收 ${days} 天` : `在途 ${days} 天`;
}

export function createBulkTrackingImportResult(rows: BulkTrackingImportRow[], shipments: Shipment[]): BulkTrackingImportResult {
  const updates: BulkTrackingUpdate[] = [];
  const unmatchedOrderNos: string[] = [];
  const conflictOrderNos: string[] = [];
  const errorRows: Array<{ rowNumber: number; customerOrderNo?: string; reason: string }> = [];
  const latestByShipmentId = new Map<string, BulkTrackingUpdate>();
  const previewMetaByShipmentId = new Map<string, { systemOrderNo: string; matchedOrderNo: string; trackingCount: number }>();
  const addUnique = (list: string[], value: string) => {
    if (!list.includes(value)) list.push(value);
  };

  for (const row of rows) {
    const orderNo = String(row.customerOrderNo ?? '').trim();
    const description = String(row.description ?? '').trim();
    const rowNumber = row.rowNumber ?? rows.indexOf(row) + 2;
    const trackingTime = parseTrackingDateValue(row.date);
    if (!orderNo || !String(row.date ?? '').trim() || !description) {
      errorRows.push({ rowNumber, customerOrderNo: orderNo || undefined, reason: '缺少运单号、轨迹日期时间或轨迹信息' });
      continue;
    }
    if (!trackingTime) {
      errorRows.push({ rowNumber, customerOrderNo: orderNo, reason: '轨迹日期时间无法识别' });
      continue;
    }

    const matchedShipments = shipments.filter((item) =>
      [item.systemOrderNo, item.customerOrderNo, item.transferNo, item.subOrderNo].filter(Boolean).some((value) => String(value).trim() === orderNo)
    );
    if (matchedShipments.length === 0) {
      addUnique(unmatchedOrderNos, orderNo);
      continue;
    }
    if (matchedShipments.length > 1) {
      addUnique(conflictOrderNos, orderNo);
      continue;
    }

    const shipment = matchedShipments[0];
    const update: BulkTrackingUpdate = {
      shipmentId: shipment.id,
      customerOrderNo: orderNo,
      trackingDate: row.date,
      latestTracking: formatImportedTracking(description, row.location),
      description,
      location: row.location,
      rowNumber
    };
    updates.push(update);
    const currentLatest = latestByShipmentId.get(shipment.id);
    if (!currentLatest || compareTrackingDate(update.trackingDate, currentLatest.trackingDate) > 0) {
      latestByShipmentId.set(shipment.id, update);
    }
    const meta = previewMetaByShipmentId.get(shipment.id) ?? { systemOrderNo: shipment.systemOrderNo, matchedOrderNo: orderNo, trackingCount: 0 };
    previewMetaByShipmentId.set(shipment.id, { ...meta, trackingCount: meta.trackingCount + 1 });
  }

  const shipmentPreviews = [...latestByShipmentId.entries()].map(([shipmentId, latest]) => {
    const meta = previewMetaByShipmentId.get(shipmentId);
    return {
      shipmentId,
      systemOrderNo: meta?.systemOrderNo ?? latest.customerOrderNo,
      matchedOrderNo: meta?.matchedOrderNo ?? latest.customerOrderNo,
      trackingCount: meta?.trackingCount ?? 1,
      latestTracking: latest.latestTracking,
      latestTrackingDate: latest.trackingDate
    };
  });

  return {
    updates,
    unmatchedOrderNos,
    conflictOrderNos,
    errorRows,
    shipmentPreviews,
    rawRowCount: rows.length,
    matchedShipmentCount: shipmentPreviews.length
  };
}

function formatImportedTracking(description: string, location?: string): string {
  const cleanDescription = description.trim();
  const cleanLocation = String(location ?? '').trim();
  return cleanLocation ? `${cleanDescription}（${cleanLocation}）` : cleanDescription;
}

function compareTrackingDate(left: string | number, right: string | number): number {
  const leftTime = parseTrackingDateValue(left);
  const rightTime = parseTrackingDateValue(right);
  return leftTime - rightTime;
}

function parseTrackingDateValue(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return 0;
    const excelEpoch = Date.UTC(1899, 11, 30);
    return excelEpoch + value * 24 * 60 * 60 * 1000;
  }

  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/\//g, '-');
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function createFulfillmentAdvice(shipment: Shipment): FulfillmentAdvice {
  const riskReasons: string[] = [];

  if (!shipment.transferNo && shipment.status === 'OUTBOUNDED') {
    riskReasons.push('缺少转单号');
  }

  if (shipment.trackingStaleDays >= 3) {
    riskReasons.push(`轨迹 ${shipment.trackingStaleDays} 天未更新`);
  }

  if (shipment.hasProblemTicket || shipment.status === 'PROBLEM') {
    riskReasons.push('存在问题件');
  }

  if (Math.abs(shipment.receivableWeightKg - shipment.agentWeightKg) >= 1) {
    riskReasons.push('计费重量差异');
  }

  const priority: AutomationPriority =
    riskReasons.length >= 3 || shipment.trackingStaleDays >= 7 ? 'urgent' : riskReasons.length >= 1 ? 'high' : 'normal';
  const nextAction = !shipment.transferNo && shipment.status === 'OUTBOUNDED'
    ? '补齐转单号'
    : shipment.hasProblemTicket || shipment.status === 'PROBLEM'
      ? '处理问题件'
      : shipment.trackingStaleDays >= 3
        ? '跟进轨迹'
        : nextActionFromStatus(shipment.status);

  return {
    priority,
    nextAction,
    riskReasons: riskReasons.length ? riskReasons : ['暂无明显异常'],
    customerMessage:
      priority === 'urgent'
        ? `您好，${shipment.systemOrderNo} 我们已优先跟进，将同步最新处理进展。`
        : `您好，${shipment.systemOrderNo} 当前节点为${shipmentStatusLabels[shipment.status]}，我们会持续跟进。`
  };
}

export function getModuleCoverageSummary() {
  return {
    totalModules: productModules.length,
    surfaces: Array.from(new Set(productModules.map((module) => module.surface))),
    phaseOneModules: productModules.filter((module) => module.phase === 'phase-one').map((module) => module.name),
    phaseTwoModules: productModules.filter((module) => module.phase === 'phase-two').map((module) => module.name)
  };
}

export function summarizeStatusCounts(shipments: Shipment[]) {
  return Object.keys(shipmentStatusLabels).reduce(
    (summary, status) => ({
      ...summary,
      [status]: shipments.filter((shipment) => shipment.status === status).length
    }),
    {} as Record<ShipmentStatus, number>
  );
}

export function summarizeLineShipmentPool(
  shipments: Shipment[],
  query: LineShipmentPoolQuery = {},
  options: LineShipmentPoolOptions = {}
): LineShipmentPoolResponse {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const lastSevenStart = new Date(todayStart);
  lastSevenStart.setDate(lastSevenStart.getDate() - 6);
  const lastThirtyStart = new Date(todayStart);
  lastThirtyStart.setDate(lastThirtyStart.getDate() - 29);
  const statusGroup = query.statusGroup ?? 'ALL';
  const keyword = query.keyword?.trim().toLowerCase() ?? '';
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const businessDataApprovedShipmentIds = new Set(options.businessDataApprovedShipmentIds ?? []);
  const agentDataApprovedShipmentIds = new Set(options.agentDataApprovedShipmentIds ?? []);
  const afterSaleShipmentIds = new Set(options.afterSaleShipmentIds ?? []);

  const dateFiltered = shipments.filter((shipment) => {
    const createdAt = new Date(shipment.createdAt);
    if (query.datePreset === 'TODAY') return createdAt >= todayStart;
    if (query.datePreset === 'LAST_7_DAYS') return createdAt >= lastSevenStart;
    if (query.datePreset === 'LAST_30_DAYS') return createdAt >= lastThirtyStart;
    return true;
  });
  const keywordFiltered = dateFiltered.filter((shipment) => {
    if (!keyword) return true;
    const packageSummary = options.packageSummariesByShipmentId?.[shipment.id];
    return [
      shipment.customerName,
      shipment.customerCode,
      shipment.salesperson,
      shipment.systemOrderNo,
      shipment.customerOrderNo,
      shipment.transferNo,
      shipment.subOrderNo,
      shipment.channelName,
      shipment.agentName,
      shipment.destinationCountry,
      shipment.latestTracking,
      ...(packageSummary?.domesticTrackingNos ?? []),
      ...(packageSummary?.combinedOrderNos ?? [])
    ].some((value) => value?.toLowerCase().includes(keyword));
  });

  const statusCounts = lineShipmentStatusGroups.reduce(
    (summary, group) => ({
      ...summary,
      [group]: group === 'ALL' ? keywordFiltered.length : keywordFiltered.filter((shipment) => lineShipmentBelongsToGroup(shipment, group, businessDataApprovedShipmentIds, agentDataApprovedShipmentIds, afterSaleShipmentIds)).length
    }),
    {} as Record<LineShipmentStatusGroup, number>
  );

  const selectedRows = statusGroup === 'ALL' ? keywordFiltered : keywordFiltered.filter((shipment) => lineShipmentBelongsToGroup(shipment, statusGroup, businessDataApprovedShipmentIds, agentDataApprovedShipmentIds, afterSaleShipmentIds));
  const sortBy = query.sortBy ?? 'createdAt';
  const sortOrder = query.sortOrder ?? 'desc';
  const sortedRows = [...selectedRows].sort((left, right) => {
    const leftValue = String(left[sortBy] ?? '');
    const rightValue = String(right[sortBy] ?? '');
    const direction = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'createdAt') return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * direction;
    return leftValue.localeCompare(rightValue, 'zh-Hans-CN') * direction;
  });
  const todayRows = keywordFiltered.filter((shipment) => new Date(shipment.createdAt) >= todayStart);
  const completedToday = todayRows.filter((shipment) => ['OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'SIGNED'].includes(shipment.status)).length;
  const pageStart = (page - 1) * pageSize;

  return {
    metrics: {
      pendingCount: (statusCounts.REVIEW_PENDING ?? 0) + (statusCounts.WAITING_SORT ?? 0) + (statusCounts.WAITING_DISPATCH ?? 0),
      riskCount: keywordFiltered.filter(lineShipmentHasRisk).length,
      todayDispatchCount: keywordFiltered.filter((shipment) => shipment.status === 'WAITING_DISPATCH').length,
      estimatedReceivable: round2(keywordFiltered.reduce((total, shipment) => total + (shipment.paymentAmountCny ?? 0) + (shipment.paymentAmountUsd ?? 0) * 7, 0)),
      todayCompletionRate: todayRows.length ? Math.round((completedToday / todayRows.length) * 100) : 0,
      todayUpdatedCount: todayRows.length
    },
    statusCounts,
    rows: sortedRows.slice(pageStart, pageStart + pageSize).map((shipment) => ({
      shipment,
      latestTracking: shipment.latestTracking,
      receivableAmount: shipment.paymentAmountCny ?? (shipment.paymentAmountUsd !== undefined ? round2(shipment.paymentAmountUsd * 7) : undefined),
      hasProblem: lineShipmentHasRisk(shipment),
      packageSummary: options.packageSummariesByShipmentId?.[shipment.id]
    })),
    pagination: {
      page,
      pageSize,
      totalItems: selectedRows.length
    }
  };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const lineShipmentStatusGroups: LineShipmentStatusGroup[] = [
  'ALL',
  'REVIEW_PENDING',
  'REVIEW_REJECTED',
  'WAITING_SORT',
  'WAITING_DISPATCH',
  'OUTBOUNDED',
  'DATA_CONFIRM',
  'TRANSFER_NO',
  'WAITING_DEPARTURE',
  'DEPARTED',
  'SIGNED',
  'PROBLEM',
  'AFTER_SALE'
];

function lineShipmentBelongsToGroup(
  shipment: Shipment,
  group: LineShipmentStatusGroup,
  businessDataApprovedShipmentIds: Set<string>,
  agentDataApprovedShipmentIds: Set<string>,
  afterSaleShipmentIds: Set<string>
): boolean {
  if (group === 'ALL') return true;
  if (group === 'REVIEW_PENDING') return shipment.status === 'DRAFT' || shipment.status === 'REVIEW_PENDING';
  if (group === 'OUTBOUNDED') return shipment.status === 'OUTBOUNDED' && !businessDataApprovedShipmentIds.has(shipment.id) && !agentDataApprovedShipmentIds.has(shipment.id);
  if (group === 'DATA_CONFIRM') return shipment.status === 'OUTBOUNDED' && !(businessDataApprovedShipmentIds.has(shipment.id) && agentDataApprovedShipmentIds.has(shipment.id));
  if (group === 'TRANSFER_NO') return shipment.status === 'OUTBOUNDED' && businessDataApprovedShipmentIds.has(shipment.id) && agentDataApprovedShipmentIds.has(shipment.id) && !shipment.transferNo;
  if (group === 'PROBLEM') return lineShipmentIsProblem(shipment);
  if (group === 'AFTER_SALE') return afterSaleShipmentIds.has(shipment.id);
  return shipment.status === group;
}

function lineShipmentIsProblem(shipment: Shipment): boolean {
  return shipment.status === 'PROBLEM' || shipment.hasProblemTicket;
}

function lineShipmentHasRisk(shipment: Shipment): boolean {
  return Boolean(
    lineShipmentIsProblem(shipment)
    || shipment.status === 'STUCK'
    || shipment.trackingStaleDays > 0
    || shipment.reviewRejectedReason
    || (['OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED'].includes(shipment.status) && !shipment.transferNo)
  );
}

function automationPriorityWeight(priority: AutomationPriority): number {
  return priority === 'urgent' ? 3 : priority === 'high' ? 2 : 1;
}

function nextActionFromStatus(status: ShipmentStatus): string {
  const labels: Partial<Record<ShipmentStatus, string>> = {
    DRAFT: '审核订单',
    DECLARED: '确认收货',
    WAITING_RECEIVE: '确认收货',
    WAITING_SORT: '分配渠道',
    WAITING_DISPATCH: '仓库出库',
    OUTBOUNDED: '填写转单号',
    WAITING_DEPARTURE: '填写 ETA/ETD 后确认离港',
    DEPARTED: '跟进到港',
    ARRIVED_PORT: '更新派送或签收',
    DELIVERING: '跟进签收',
    WAITING_ONLINE: '跟进上网',
    WAITING_SIGNED: '跟进签收',
    WAITING_RETURN: '处理退货',
    STUCK: '处理滞留',
    SIGNED: '归档',
    REVIEW_REJECTED: '修改后重新审核',
    CANCELLED: '无需处理'
  };

  return labels[status] ?? '处理异常';
}

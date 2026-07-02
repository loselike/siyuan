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
  site?: string;
  role: StaffAccountRoleKey;
  roleLabel: string;
  enabled: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface StaffAccountCreateInput {
  username: string;
  password?: string;
  name?: string;
  phone?: string;
  gender?: StaffGender;
  nickname?: string;
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
  site?: string;
  enabled?: boolean;
  role?: StaffAccountRoleKey;
}

export interface StaffAccountQuery {
  keyword?: string;
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
  customerCode?: string;
  salesperson?: string;
  customerOrderNo: string;
  systemOrderNo: string;
  transferNo?: string;
  subOrderNo?: string;
  draftWarehousePackageIds?: string[];
  inboundNo?: string;
  outboundAt?: string;
  productName?: string;
  site?: string;
  declarationRequired?: boolean;
  sensitive?: boolean;
  cargoType?: string;
  volumeCbm?: number;
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
  receivableWeightKg: number;
  agentWeightKg: number;
  latestTracking: string;
  trackingStaleDays: number;
  isRemoteArea: boolean;
  status: ShipmentStatus;
  channelName: string;
  agentName: string;
  routedAt?: string;
  routeReturnedAt?: string;
  routeAgentChannelName?: string;
  routeChargeWeightKg?: number;
  routeUnitPrice?: number;
  routeOtherFee?: number;
  routeCostTotal?: number;
  routeCurrency?: string;
  paymentAmountUsd?: number;
  paymentAmountCny?: number;
  paymentMethod?: ShipmentPaymentMethod;
  hasProblemTicket: boolean;
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
}

export interface ShipmentRerouteInput {
  reason: string;
}

export interface BulkTrackingImportRow {
  customerOrderNo: string;
  date: string | number;
  description: string;
  location?: string;
}

export interface BulkTrackingUpdate {
  shipmentId: string;
  customerOrderNo: string;
  trackingDate: string | number;
  latestTracking: string;
}

export interface BulkTrackingImportResult {
  updates: BulkTrackingUpdate[];
  unmatchedOrderNos: string[];
}

export interface ShipmentOperationalUpdateInput {
  latestTracking?: string;
  transferNo?: string;
  subOrderNo?: string;
  trackingWebsite?: string;
  trackingWebsiteVisibleToSales?: boolean;
  status?: ShipmentStatus;
  etaAt?: string;
  etdAt?: string;
}

export interface ShipmentPaymentUpdateInput {
  paymentAmountUsd?: number;
  paymentAmountCny?: number;
  paymentMethod: ShipmentPaymentMethod;
}

export interface BulkTrackingApplyRequest {
  updates: BulkTrackingUpdate[];
}

export interface BulkTrackingApplyResponse {
  updated: Shipment[];
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
  createdAt: string;
}

export interface AuditLogWarningSummary {
  actorId: string;
  actorUsername: string;
  windowStartedAt: string;
  windowEndedAt: string;
  count: number;
}

export interface AuditLogListResponse {
  rows: AuditLogSummary[];
  suspiciousDeleteWarnings: AuditLogWarningSummary[];
  pagination: { page: number; pageSize: number; totalItems: number };
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

export interface PriceBookRowSummary {
  id: string;
  priceBookId: string;
  agentName: string;
  carrierName?: string;
  sourceSheetName?: string;
  channelName: string;
  businessRouteName?: string;
  realChannelName?: string;
  warehouseCode?: string;
  destinationCountry: string;
  minWeightKg: number;
  maxWeightKg: number;
  costPerKg: number;
  currency: string;
  transitDays?: number;
  transitLabel?: string;
  quoteSourceType?: QuoteSourceType;
  surchargeFee?: number;
  surchargeDetails?: Array<{ name: string; amount: number }>;
  productSurchargeRemark?: string;
  specialRemark?: string;
}

export interface PriceBookSummary {
  id: string;
  fileName: string;
  rowCount: number;
  importedAt: string;
  remark?: string;
}

export interface PriceBooksResponse {
  books: PriceBookSummary[];
  rows: PriceBookRowSummary[];
}

export interface PriceBookImportInput {
  fileName: string;
  rows: Omit<PriceBookRowSummary, 'id' | 'priceBookId'>[];
}

export interface PriceBookRemarkUpdateInput {
  remark?: string;
}

export interface AgentMarkupSummary {
  id: string;
  agentName: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupPerKg: number;
  enabled: boolean;
}

export interface AgentMarkupCreateInput {
  agentName: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupPerKg: number;
  enabled?: boolean;
}

export interface AgentMarkupUpdateInput {
  agentName?: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupPerKg?: number;
  enabled?: boolean;
}

export interface PriceLookupRequest {
  amazonCode?: string;
  productName?: string;
  destinationCountry: string;
  postalCode?: string;
  address?: string;
  packageInfo?: string;
  chargeableWeightKg: number;
  markupRules?: AgentMarkupSummary[];
}

export interface PriceLookupRecommendation {
  price: Omit<PriceBookRowSummary, 'costPerKg'> & { costPerKg?: number };
  markup?: AgentMarkupSummary;
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

export type WarehousePackageStatus = 'PENDING' | 'RECEIVED' | 'CONSOLIDATED' | 'SHIPPED';
export type WarehouseConsolidationMode = 'MERGE_ONLY' | 'MERGE_AND_SHIP';
export type WarehouseRoundingRule = 'NONE' | 'HALF_UP' | 'INTEGER_UP';
export type WarehouseTallyTaskStatus = 'PENDING' | 'COMPLETED';
export type WarehouseTallyLabelStatus = 'NOT_GENERATED' | 'GENERATED';

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

export interface WarehousePackageUpdateInput {
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
}

export interface WarehouseTallyTaskListQuery {
  status?: WarehouseTallyTaskStatus;
  customerCode?: string;
  combinedOrderNo?: string;
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
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  remark?: string;
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
  systemOrderNo: string;
  customerName: string;
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
  systemOrderNo: string;
  customerCode: string;
  feeName: string;
  amount: number;
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
  receiptMethod?: string;
  receiptDate: string;
  currency?: string;
  amount: number;
  paymentNo?: string;
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
  paymentNo?: string;
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
  agentId?: string;
  agentName: string;
  accountName: string;
  bankName: string;
  bankAccountNo: string;
  currency?: string;
  remark?: string;
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
  fromStatus?: ShipmentStatus;
  toStatus?: ShipmentStatus;
  createdAt: string;
  operator?: string;
}

export interface ShipmentReviewDetailSummary {
  shipment: Shipment;
  packages: ShipmentReviewPackageSummary[];
  finance: ShipmentFinanceDetailSummary;
  events: ShipmentReviewEventSummary[];
  trackingEvents: ShipmentReviewEventSummary[];
  problemTickets: ProblemTicketSummary[];
  files: Array<{ id: string; name: string; type: string; url?: string; createdAt?: string }>;
  approvalWarnings: string[];
  overdue: boolean;
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
  integrationType?: AgentIntegrationType;
  warehouseAddress1?: string;
  warehouseAddress2?: string;
  warehouseAddress3?: string;
  warehouseContact?: string;
  invoiceTemplateName?: string;
  invoiceTemplateUrl?: string;
  enabled: boolean;
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
  receivingChannel?: string;
  initialStatus?: ShipmentStatus;
  latestTracking?: string;
  productName?: string;
  declarationRequired?: boolean;
  sensitive?: boolean;
  cargoType?: string;
  volumeCbm?: number;
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

export interface TrackingEventInput {
  status: string;
  happenedAt: string;
  visibleToCustomer?: boolean;
}

export interface ProblemTicketCreateInput {
  reason: string;
  customerVisible?: boolean;
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
  replies: Array<{ id: string; author: string; message: string; createdAt: string }>;
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
    capabilities: ['待出库订单', '包裹明细', '理货管理', '面单队列&待仓库出货', '收货交接单'],
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
  const latestRowsByOrderNo = new Map<string, BulkTrackingImportRow>();

  for (const row of rows) {
    const orderNo = String(row.customerOrderNo ?? '').trim();
    const description = String(row.description ?? '').trim();
    if (!orderNo || !description) {
      continue;
    }

    const current = latestRowsByOrderNo.get(orderNo);
    if (!current || compareTrackingDate(row.date, current.date) > 0) {
      latestRowsByOrderNo.set(orderNo, { ...row, customerOrderNo: orderNo, description });
    }
  }

  const updates: BulkTrackingUpdate[] = [];
  const unmatchedOrderNos: string[] = [];

  for (const [orderNo, row] of latestRowsByOrderNo) {
    const shipment = shipments.find((item) =>
      [item.customerOrderNo, item.systemOrderNo, item.transferNo].filter(Boolean).some((value) => String(value).trim() === orderNo)
    );

    if (!shipment) {
      unmatchedOrderNos.push(orderNo);
      continue;
    }

    updates.push({
      shipmentId: shipment.id,
      customerOrderNo: orderNo,
      trackingDate: row.date,
      latestTracking: formatImportedTracking(row.description, row.location)
    });
  }

  return { updates, unmatchedOrderNos };
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
    return value;
  }

  const trimmed = value.trim();
  const normalized = trimmed.replace(/\./g, '-').replace(/\//g, '-');
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

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

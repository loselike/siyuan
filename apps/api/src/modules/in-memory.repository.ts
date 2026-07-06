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
  summarizeLineShipmentPool,
  summarizeStatusCounts,
  validateShipmentImportRows,
  type AccountLedgerSummary,
  type AgentMarkupCreateInput,
  type AgentMarkupExportResponse,
  type AgentMarkupImportResponse,
  type AgentMarkupListQuery,
  type AgentMarkupListResponse,
  type AgentMarkupPreviewResponse,
  type AgentMarkupSummary,
  type AgentMarkupUpdateInput,
  type AgentChannelCreateInput,
  type AgentChannelSummary,
  type AgentChannelUpdateInput,
  type AgentCreateInput,
  type AgentSummary,
  type AgentUpdateInput,
  type AuditLogListResponse,
  type AuditLogQuery,
  type AuditLogResult,
  type AuditLogSummary,
  type CarrierTaskRunResponse,
  type CarrierTaskSummary,
  type CarrierTaskStatus,
  type CarrierAdapterCode,
  type CarrierCreateInput,
  type CarrierSummary,
  type ChannelCreateInput,
  type ChannelCategoryCreateInput,
  type ChannelCategorySummary,
  type ChannelCategoryUpdateInput,
  type ChannelSummary,
  type ChannelUpdateInput,
  type CustomerAccountSummary,
  type CustomerContactCreateInput,
  type CustomerContactSummary,
  type CustomerContactUpdateInput,
  type CustomerCreateInput,
  type CustomerStatementCreateInput,
  type CustomerStatementSummary,
  type CustomerSummary,
  type CustomerUpdateInput,
  type CustomerUserCreateInput,
  type CustomerUserSummary,
  type EnabledUpdateInput,
  type ExchangeRateCreateInput,
  type ExchangeRateUpdateInput,
  type ExchangeRateSummary,
  type FinanceDashboardItem,
  type FinanceDashboardResponse,
  type FuelRateCreateInput,
  type FuelRateSummary,
  type LabelCreateResponse,
  type MasterDataSnapshot,
  type OrderEntryCreateInput,
  type OrderEntryDetailSummary,
  type OrderEntryDraftUpdateInput,
  type OrderEntryFinanceItemInput,
  type PaymentCreateInput,
  type PaymentCreateResponse,
  type PaymentSummary,
  type PaymentApplicationCancelInput,
  type PaymentApplicationCreateInput,
  type PaymentApplicationExportRequest,
  type PaymentApplicationExportResponse,
  type PaymentApplicationItemSummary,
  type PaymentApplicationSummary,
  type PaymentApplicationUpdateInput,
  type PaymentVoucherArchiveInput,
  type PaymentVoucherDifferenceInput,
  type PaymentVoucherInput,
  type PaymentVoucherListQuery,
  type PaymentVoucherSummary,
  type PaidPaymentExportRequest,
  type PaidPaymentExportResponse,
  type PaidPaymentListQuery,
  type PaidPaymentListResponse,
  type PaidPaymentReverseInput,
  type PaidPaymentSummary,
  type PaidPaymentUpdateInput,
  type PaymentConfirmPaidInput,
  type PaymentWaterReceiptInput,
  type PriceBookImportInput,
  type PriceBookRemarkUpdateInput,
  type PriceBooksResponse,
  type PriceBookRowSummary,
  type PriceBookSummary,
  type LegacyPricingImportInput,
  type LegacyPricingMetaResponse,
  type LegacyPricingModule,
  type LegacyPricingQuoteRequest,
  type LegacyPricingQuoteResponse,
  type LegacyPricingRecommendation,
  type LegacyPricingSourceSummary,
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
  type AgentBankAccountInput,
  type AgentBankAccountSummary,
  type PayableAuditBatchInput,
  type PayableAuditBatchResult,
  type PayableAuditCreateInput,
  type PayableAuditExportRequest,
  type PayableAuditExportResponse,
  type PayableAuditListQuery,
  type PayableAuditListResponse,
  type PayableAuditSummary,
  type PayableAuditShipmentMatchInput,
  type PayableAuditShipmentMatchSummary,
  type PayableAuditUpdateInput,
  type PayableFeeSummary,
  type PayeeBankAccountInput,
  type PayeeBankAccountSummary,
  type PendingPaymentListQuery,
  type PendingPaymentListResponse,
  type PendingPaymentSummary,
  type ReceivableAdjustmentInput,
  type ReceivableAuditBatchInput,
  type ReceivableAuditBatchResult,
  type ReceivableAuditCreateInput,
  type ReceivableAuditExportRequest,
  type ReceivableAuditExportResponse,
  type ReceivableAuditListQuery,
  type ReceivableAuditListResponse,
  type ReceivableReceiptMatchInput,
  type ReceivableAuditSummary,
  type ReceivableAuditUpdateInput,
  type ReceivableFeeSummary,
  type RoleGroupInput,
  type BusinessCostAuditBatchInput,
  type BusinessCostAuditBatchResult,
  type BusinessCostAuditCreateInput,
  type BusinessCostAuditExportRequest,
  type BusinessCostAuditExportResponse,
  type BusinessCostAuditListQuery,
  type BusinessCostAuditListResponse,
  type BusinessCostAuditSummary,
  type BusinessCostAuditUpdateInput,
  type SurchargeCreateInput,
  type SurchargeSummary,
  type SiteCreateInput,
  type SiteSummary,
  type SiteUpdateInput,
  type ShipmentFinanceItemCreateInput,
  type ShipmentFinanceItemStatus,
  type ShipmentFinanceItemType,
  type ShipmentFinanceItemUpdateInput,
  shipmentStatusLabels,
  type BulkTrackingApplyRequest,
  type BulkTrackingApplyResponse,
  type BusinessCostFeeSummary,
  type StaffAccountCreateInput,
  type StaffAccountPasswordResetInput,
  type StaffAccountPasswordResetResult,
  type StaffAccountQuery,
  type StaffGender,
  type StaffAccountRoleKey,
  type StaffAccountSummary,
  type StaffAccountUpdateInput,
  type Shipment,
  type ShipmentCreateInput,
  type ShipmentImportRequest,
  type ShipmentImportResponse,
  type LineShipmentPoolQuery,
  type LineShipmentPoolResponse,
  type ShipmentFinanceDetailSummary,
  type ShipmentLabelSummary,
  type ShipmentOperationalUpdateInput,
  type ShipmentPaymentUpdateInput,
  type ShipmentDispatchInput,
  type ShipmentRerouteInput,
  type ShipmentRouteInput,
  type ShipmentRestoreInput,
  type ShipmentReviewDeleteInput,
  type ShipmentReviewDetailSummary,
  type ShipmentReviewEventSummary,
  type ShipmentReviewPackageSummary,
  type ShipmentReviewRejectInput,
  type ShipmentStatus,
  type TrackingEventInput,
  type WarehouseConsolidationCreateInput,
  type WarehouseConsolidationSummary,
  type WarehouseInStockQuery,
  type WarehouseInStockResponse,
  type WarehousePackageCreateInput,
  type WarehousePackageGroupSummary,
  type WarehousePackageSplitInput,
  type WarehousePackageSplitResponse,
  type WarehousePackageSummary,
  type WarehousePackageUpdateInput,
  type WarehouseTallyLabelScanInput,
  type WarehouseTallyLabelScanResponse,
  type WarehouseTallyTaskCompleteInput,
  type WarehouseTallyTaskCreateInput,
  type WarehouseTallyTaskListQuery,
  type WarehouseTallyTaskSummary,
  type WarehouseTallyTaskUpdateInput,
  type WarehouseTodayQuery,
  type WarehouseTodayResponse,
  type WaterReceiptCreateInput,
  type WaterReceiptExportRequest,
  type WaterReceiptExportResponse,
  type WaterReceiptListQuery,
  type WaterReceiptListResponse,
  type WaterReceiptMarkArrivedInput,
  type WaterReceiptMatchOrdersInput,
  type WaterReceiptMatchSummary,
  type WaterReceiptSummary,
  type WaterReceiptUnmatchInput,
  type WaterReceiptUpdateInput,
  type WaterReceiptVoucherInput,
  type WaterReceiptVoucherSummary
} from '@siyuan/shared';
import { getPasswordStrengthError, hashPassword } from './password.js';
import {
  allPermissions,
  buildRolePermissionRow,
  defaultPermissionsForRole,
  defaultRoleGroups,
  getRoleMetadata,
  isBuiltinRoleKey,
  normalizeRolePermissions,
  permissionDefinitions,
  roleMetadata,
  rolePermissions,
  type PermissionKey,
  type Principal,
  type RoleKey,
  type RolePermissionRow
} from './rbac.js';

interface Account extends Principal {
  passwordHash: string;
  name?: string;
  phone?: string;
  gender?: StaffGender;
  nickname?: string;
  site?: string;
  enabled?: boolean;
  mustChangePassword?: boolean;
}

type ReviewRestoreInputWithManual = ShipmentRestoreInput & {
  mode?: ShipmentRestoreInput['mode'] | 'MANUAL_TIME';
  manualCreatedAt?: string;
};

const staffGenderValues: StaffGender[] = ['UNKNOWN', 'MALE', 'FEMALE', 'OTHER'];

interface MemoryStaffProfileInput {
  name?: string;
  phone?: string;
  gender?: string;
  nickname?: string;
  site?: string;
}

interface MemoryRoleMeta {
  label: string;
  description?: string;
  site?: string;
  sortOrder: number;
  enabled: boolean;
  systemBuiltin: boolean;
}

interface Ticket extends ProblemTicketSummary {
  shipmentCustomerId: string;
}

interface StoredReceivableFee extends ReceivableFeeSummary {
  customerId: string;
  customerCode?: string;
  customerOrderNo?: string;
  transferNo?: string;
  salesperson?: string;
  paymentNo?: string;
  createdAt: string;
  voidedAt?: string;
}

function inferInMemoryAuditModule(action: string): { module: string; moduleLabel: string } {
  if (action.includes('轨迹')) return { module: 'tracking', moduleLabel: '轨迹监控' };
  if (action.includes('运单') || action.includes('收款')) return { module: 'shipment', moduleLabel: '我的订单' };
  const module = action.split('.')[0] || 'system';
  const labels: Record<string, string> = {
    auth: '认证登录',
    system: '系统设置',
    master_data: '基础资料',
    pricing: '报价查价',
    warehouse: '仓库管理',
    finance: '财务结算',
    shipment: '我的订单',
    problem: '问题件',
    security: '权限安全',
    demo: '演示数据'
  };
  return { module, moduleLabel: labels[module] ?? module };
}

function inferInMemoryAuditResult(action: string): AuditLogResult {
  return /(fail|failed|error|denied|reject|失败|错误|拒绝|不通过)/i.test(action) ? 'FAILED' : 'SUCCESS';
}

function formatInMemoryAuditActionLabel(action: string): string {
  const actionLabels: Record<string, string> = {
    'auth.login.success': '登录成功',
    'auth.login.failed': '登录失败',
    'security.permission.denied': '权限拒绝',
    'auth.password.change': '修改登录密码',
    'system.staff.create': '新建员工账号',
    'system.staff.password_reset': '重置员工密码',
    'system.role_permissions.update': '修改角色权限',
    'shipment.create': '新建运单',
    'shipment.update': '修改运单资料',
    'shipment.delete': '删除运单',
    'shipment.payment.update': '登记收款信息',
    'shipment.operational.update': '更新运单状态/轨迹',
    'customer_service.status.update': '客服状态更新',
    'customer_service.eta.update': '客服ETA更新',
    'customer_service.issue.attach': '客服挂载问题件',
    'customer_service.issue.update': '客服更新问题件',
    'customer_service.issue.close': '客服关闭问题件',
    'customer_service.signature.confirm': '业务员确认签收',
    'customer_service.business_data.approved': '业务数据审核通过',
    'customer_service.agent_data.approved': '代理数据审核通过',
    'workflow.guard_denied': '流程闸口拒绝',
    'shipment.sign': '确认签收',
    'shipment.route': '排货',
    'shipment.dispatch': '仓库出库',
    'shipment.label.create': '生成面单',
    'problem.ticket.create': '创建问题件',
    'problem.ticket.reply': '回复问题件',
    'problem.ticket.close': '关闭问题件',
    'warehouse.package.create': '新增入库包裹',
    'warehouse.package.remark.update': '修改包裹备注',
    'warehouse.package.split': '理货拆分包裹',
    'warehouse.in_stock.view': '查看在仓数据',
    'warehouse.tally.start': '发起理货',
    'warehouse.consolidation.create': '理货合并包裹',
    'warehouse.consolidation.create_shipment': '理货创建出货单',
    'finance.receivable.audit': '应收费用审核',
    'finance.receivable.reverse_audit': '应收费用反审核',
    'finance.receivable.delete': '删除应收费用',
    'finance.business_cost.audit': '业务成本审核',
    'finance.business_cost.reverse_audit': '业务成本反审核',
    'finance.business_cost.delete': '删除业务成本',
    'finance.payable.audit': '应付费用审核',
    'finance.payable.reverse_audit': '应付费用反审核',
    'finance.payable.delete': '删除应付费用',
    'pricing.book.import': '导入价格表',
    'pricing.book.delete': '删除价格表',
    'pricing.markup_rule.create': '新增加价规则',
    'pricing.markup_rule.update': '修改加价规则',
    'pricing.markup_rule.delete': '删除加价规则',
    'demo.shipment.upsert': '演示数据写入：运单',
    'demo.warehouse.package.upsert': '演示数据写入：仓库包裹',
    'demo.warehouse.consolidation.upsert': '演示数据写入：理货记录',
    'demo.finance.receivable.upsert': '演示数据写入：应收费用',
    'demo.finance.business_cost.upsert': '演示数据写入：业务成本'
  };
  if (actionLabels[action]) return actionLabels[action];
  if (action.includes('reverse_audit')) return '反审核';
  if (action.includes('audit')) return '审核';
  if (/delete|void/.test(action)) return '删除/作废';
  if (action.includes('create_shipment')) return '创建出货单';
  if (action.includes('upsert')) return '写入或更新数据';
  if (action.includes('create')) return '新增';
  if (action.includes('update')) return '修改';
  if (action.includes('unlock')) return '解锁';
  if (action.includes('lock')) return '锁定';
  if (action.includes('split')) return '拆分';
  if (action.includes('import')) return '导入';
  if (action.includes('request.export')) return '导出操作';
  if (action.includes('request.write')) return '重要操作';
  return action;
}

function isImportantAudit(row: AuditLogSummary) {
  return row.result === 'FAILED'
    || /(delete|void|purge|clear|删除|作废|清除)/i.test(row.action)
    || /(audit|review|审核|反审核)/i.test(row.action)
    || /(permission|role|权限)/i.test(row.action)
    || /(finance|payment|voucher|receipt|payable|receivable|财务|付款|水单|应收|应付)/i.test(row.action)
    || /(import|export|导入|导出)/i.test(row.action);
}

function isPermissionFinanceAudit(row: AuditLogSummary) {
  return /(permission|role|finance|payment|voucher|receipt|payable|receivable|权限|角色|财务|付款|水单|应收|应付)/i.test(row.action);
}

function beijingDayStartUtc(date: Date) {
  const beijingTime = date.getTime() + 8 * 60 * 60 * 1000;
  const beijingDate = new Date(beijingTime);
  return Date.UTC(beijingDate.getUTCFullYear(), beijingDate.getUTCMonth(), beijingDate.getUTCDate()) - 8 * 60 * 60 * 1000;
}

function buildAuditDashboard(rows: AuditLogSummary[], now = new Date()): NonNullable<AuditLogListResponse['dashboard']> {
  const todayStart = beijingDayStartUtc(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const metricRows = rows.filter((row) => new Date(row.createdAt).getTime() >= todayStart - 13 * dayMs);
  const metric = (predicate: (row: AuditLogSummary) => boolean) => {
    const trend = Array.from({ length: 14 }, (_, index) => {
      const start = todayStart - (13 - index) * dayMs;
      const end = start + dayMs;
      return metricRows.filter((row) => {
        const time = new Date(row.createdAt).getTime();
        return time >= start && time < end && predicate(row);
      }).length;
    });
    const value = trend[13] ?? 0;
    const yesterdayValue = trend[12] ?? 0;
    return {
      value,
      yesterdayValue,
      changePercent: yesterdayValue ? Math.round(((value - yesterdayValue) / yesterdayValue) * 1000) / 10 : value ? 100 : 0,
      trend
    };
  };
  return {
    generatedAt: now.toISOString(),
    metrics: {
      total: metric(() => true),
      failed: metric((row) => row.result === 'FAILED'),
      important: metric(isImportantAudit),
      permissionFinance: metric(isPermissionFinanceAudit)
    },
    recentFailedImportant: rows.filter((row) => row.result === 'FAILED' && isImportantAudit(row)).slice(0, 10)
  };
}

function auditModuleFromMemoryPath(path: string) {
  const pathname = path.split('?')[0] ?? '';
  if (pathname.startsWith('/api/finance') || pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/api/warehouse') || pathname.startsWith('/warehouse')) return 'warehouse';
  if (pathname.startsWith('/api/pricing') || pathname.startsWith('/pricing')) return 'pricing';
  if (pathname.startsWith('/api/master-data') || pathname.startsWith('/master-data')) return 'master_data';
  if (pathname.startsWith('/api/shipments') || pathname.startsWith('/shipments')) return 'shipment';
  if (pathname.startsWith('/api/tracking') || pathname.startsWith('/tracking')) return 'tracking';
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/auth')) return 'auth';
  return 'system';
}

function auditKindFromMemoryRequest(method: string, path: string) {
  if (/(?:^|\/)import(?:\/|$|\?)/i.test(path)) return 'import';
  if (/(?:^|\/)export(?:\/|$|\?)/i.test(path)) return 'export';
  return method.toUpperCase() === 'DELETE' ? 'delete' : 'write';
}

interface StoredShipmentFinanceItem {
  id: string;
  shipmentId: string;
  type: ShipmentFinanceItemType;
  name: string;
  amount: number;
  currency: string;
  settlementMethod?: string;
  paymentNo?: string;
  reconciliationStatus: ShipmentFinanceItemStatus;
  receivedAmount?: number;
  receiptStatus?: 'UNPAID' | 'PARTIAL' | 'RECEIVED';
  receivedAt?: string;
  agentName?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  amountOverridden?: boolean;
  remark?: string;
  locked: boolean;
  voided: boolean;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  voidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredAgentBankAccount extends AgentBankAccountSummary {}

interface StoredPayablePaymentApplication {
  id: string;
  payableFinanceItemId: string;
  shipmentId: string;
  agentBankAccountId?: string;
  payeeBankAccountId?: string;
  amount: number;
  currency: string;
  paymentNo?: string;
  status: 'PENDING' | 'READY' | 'APPLIED' | 'INVALIDATED' | 'PAID';
  applicationStatus?: 'PENDING' | 'APPLIED' | 'INVALIDATED' | 'PAID';
  remark?: string;
  appliedAt?: string;
  invalidatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredPayeeBankAccount extends PayeeBankAccountSummary {}

interface StoredPaymentVoucher extends PaymentVoucherSummary {}

interface StoredPaymentApplication extends Omit<PaymentApplicationSummary, 'items' | 'vouchers' | 'bankAccount'> {
  payeeBankAccountId?: string;
  cancelReason?: string;
}

interface StoredPaymentApplicationItem extends PaymentApplicationItemSummary {
  paymentApplicationId: string;
}

interface StoredLabel extends ShipmentLabelSummary {}

interface StoredCarrierTask extends CarrierTaskSummary {}

interface StoredCustomerAccount extends CustomerAccountSummary {}

interface StoredAccountLedger extends AccountLedgerSummary {}

interface StoredWaterReceipt extends Omit<WaterReceiptSummary, 'matches' | 'voucher'> {
  voucher?: WaterReceiptVoucherSummary;
  matches: WaterReceiptMatchSummary[];
}

const DEFAULT_RECEIVABLE_SETTLEMENT_METHOD = '自动匹配';

interface StoredPayment extends PaymentSummary {}

interface StoredCustomer extends CustomerSummary {}

interface StoredLoginLog {
  id: string;
  userId: string;
  username: string;
  ip: string;
  region: string;
  userAgent?: string;
  createdAt: string;
}

interface StoredCustomerContact extends CustomerContactSummary {}

interface StoredCustomerUser extends CustomerUserSummary {}

interface StoredAgent extends AgentSummary {}

interface StoredCarrier extends CarrierSummary {}

interface StoredChannelCategory extends ChannelCategorySummary {}

interface StoredSite extends SiteSummary {}

interface StoredChannel extends ChannelSummary {
  carrier: string;
}

const defaultCompanyChannelRules = {
  businessType: 'EXPRESS' as const,
  category: 'DHL',
  volumeDivisor: 5000,
  multiPieceWeightRule: 'SUM_THEN_COMPARE',
  singleWeightRoundingRule: 'ACTUAL',
  settlementWeightRule: 'MAX_ACTUAL_VOLUME',
  settlementWeightRoundingRule: 'NONE',
  remoteAreaRule: 'NONE'
};

interface StoredSurcharge extends SurchargeSummary {}

interface StoredFuelRate extends FuelRateSummary {}

interface StoredExchangeRate extends ExchangeRateSummary {}

interface StoredPricingRule extends PricingRuleSummary {}

interface StoredPriceBook extends PriceBookSummary {
  deleted?: boolean;
}

interface StoredPriceBookRow extends PriceBookRowSummary {}

const defaultAgentMarkupRules: AgentMarkupSummary[] = [
  { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, markupType: 'WEIGHT' as const, markupValue: 0.5, priority: 100, enabled: true },
  { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, markupType: 'WEIGHT' as const, markupValue: 1, priority: 100, enabled: true }
];

const seedAgentQuoteErrors = [
  { agentName: 'BSD', quoteCount: 0, errorCode: 'TOKEN_INVALID', errorMessage: 'Token不正确' }
];

const warehouseMockPackages: Array<Omit<WarehousePackageSummary, 'status' | 'createdAt' | 'chargeableWeightKg' | 'roundingRule' | 'divisor' | 'exceptions'>> = [
  { id: 'wh-1399-1', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, scanTime: '2026-06-08T10:07:28.000+08:00', remark: '木架，外箱轻微磨损' },
  { id: 'wh-1399-2', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 13.9, lengthCm: 130, widthCm: 46, heightCm: 51, cbm: 0.30498, volumetricWeightKg: 50.83, scanTime: '2026-06-08T10:08:08.000+08:00' },
  { id: 'wh-1399-3', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 129, widthCm: 46, heightCm: 51, cbm: 0.302634, volumetricWeightKg: 50.44, scanTime: '2026-06-08T10:08:48.000+08:00' },
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
    CUSTOMER: [...rolePermissions.CUSTOMER],
    ...Object.fromEntries(defaultRoleGroups.map((group) => [group.key, group.key === 'UG_MARKET'
      ? [...new Set([...rolePermissions[group.templateRole], 'pricing:manage' as PermissionKey])]
      : [...rolePermissions[group.templateRole]]
    ]))
  };
  private readonly roleMeta: Record<RoleKey, MemoryRoleMeta> = {
    ADMIN: { label: roleMetadata.ADMIN.label, description: '系统管理员', sortOrder: 0, enabled: true, systemBuiltin: false },
    CUSTOMER_SERVICE: { label: roleMetadata.CUSTOMER_SERVICE.label, sortOrder: 103, enabled: true, systemBuiltin: true },
    OPERATOR: { label: roleMetadata.OPERATOR.label, sortOrder: 104, enabled: true, systemBuiltin: true },
    WAREHOUSE: { label: roleMetadata.WAREHOUSE.label, sortOrder: 102, enabled: true, systemBuiltin: true },
    FINANCE: { label: roleMetadata.FINANCE.label, sortOrder: 105, enabled: true, systemBuiltin: true },
    CUSTOMER: { label: roleMetadata.CUSTOMER.label, sortOrder: 106, enabled: true, systemBuiltin: true },
    ...Object.fromEntries(defaultRoleGroups.map((group) => [group.key, { label: group.label, description: group.description, site: group.site, sortOrder: group.sortOrder, enabled: true, systemBuiltin: false }]))
  };
  private readonly accounts: Account[] = [
    { id: 'u-admin', username: 'admin', passwordHash: hashPassword('admin123'), role: 'ADMIN' },
    { id: 'u-cs', username: 'service', passwordHash: hashPassword('service123'), role: 'UG_CUSTOMER_SERVICE' },
    { id: 'u-op', username: 'operator', passwordHash: hashPassword('operator123'), role: 'UG_BUSINESS' },
    { id: 'u-market', username: 'market', passwordHash: hashPassword('market123'), role: 'UG_MARKET' },
    { id: 'u-warehouse', username: 'warehouse', passwordHash: hashPassword('warehouse123'), role: 'UG_WAREHOUSE_RECEIVE' },
    { id: 'u-finance', username: 'finance', passwordHash: hashPassword('finance123'), role: 'UG_FINANCE' },
    { id: 'u-r-admin', username: 'R-admin', passwordHash: hashPassword('R-admin@123'), role: 'ADMIN', name: 'R-admin' },
    { id: 'u-r-sales', username: 'R-sales', passwordHash: hashPassword('R-sales@123'), role: 'UG_BUSINESS', name: 'R-sales', site: '深圳站' },
    { id: 'u-r-market', username: 'R-market', passwordHash: hashPassword('R-market@123'), role: 'UG_BUSINESS', name: 'R-market' },
    { id: 'u-r-warehouse', username: 'R-warehouse', passwordHash: hashPassword('R-warehouse@123'), role: 'UG_WAREHOUSE_RECEIVE', name: 'R-warehouse', site: '深圳站' },
    { id: 'u-r-service', username: 'R-service', passwordHash: hashPassword('R-service@123'), role: 'UG_CUSTOMER_SERVICE', name: 'R-service' },
    { id: 'u-r-finance', username: 'R-finance', passwordHash: hashPassword('R-finance@123'), role: 'UG_FINANCE', name: 'R-finance' },
    { id: 'u-customer', username: 'customer', passwordHash: hashPassword('customer123'), role: 'CUSTOMER', customerId: 'c-9409' }
  ];

  readonly customers: StoredCustomer[] = [
    { id: 'c-9409', code: '9409', name: 'Daloday', shortName: 'Daloday', fullName: 'Daloday Inc.', customerType: '直客', salesperson: 'operator', defaultSettlementMethod: 'RMB月结', enabled: true },
    { id: 'c-1344', code: '1344', name: 'TILL', shortName: 'TILL', fullName: 'TILL Trading LLC', customerType: '直客', salesperson: 'jylannie', enabled: true },
    { id: 'c-9509', code: '9509', name: 'Cam&Clae', shortName: 'Cam&Clae', fullName: 'Cam&Clae Co., Ltd.', customerType: '直客', salesperson: '陈冰心', enabled: true }
  ];

  readonly customerContacts: StoredCustomerContact[] = [
    { id: 'cc-9409-main', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Daloday 联系人', company: 'Daloday Inc.', phone: '13800000001', email: 'daloday@example.com', address: '9409 Sample Street', country: 'US', state: 'CA', postalCode: '90001', enabled: true },
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

  readonly channelCategories: StoredChannelCategory[] = [
    { id: 'cc-ups', name: 'UPS', enabled: true },
    { id: 'cc-dhl', name: 'DHL', enabled: true },
    { id: 'cc-fedex', name: 'FEDEX', enabled: true },
    { id: 'cc-ems', name: 'EMS', enabled: true },
    { id: 'cc-dpd', name: 'DPD', enabled: true },
    { id: 'cc-truck', name: '卡车', enabled: true }
  ];

  readonly sites: StoredSite[] = [
    { id: 'site-sz-siyuan', sortOrder: 1, name: '深圳站', enabled: true },
    { id: 'site-shenzhen-siyuan', sortOrder: 2, name: '深圳思远', enabled: true },
    { id: 'site-shenzhen-siyuan-wuhan', sortOrder: 3, name: '深圳思远武汉', enabled: true },
    { id: 'site-zhangzhou-sihua', sortOrder: 4, name: '漳州思华', enabled: true },
    { id: 'site-wuhan-jiuyulian', sortOrder: 5, name: '武汉九域联', enabled: true }
  ];

  readonly channels: StoredChannel[] = [
    { id: 'ch-9409-ups-exp', name: 'COCH-US-UPS-EXP', carrierId: 'cr-ups', carrierName: 'UPS', carrier: 'UPS', ...defaultCompanyChannelRules, category: 'UPS', volumeDivisor: 6000, enabled: true },
    { id: 'ch-dhl-hk', name: 'DHL HK', carrierId: 'cr-dhl', carrierName: 'DHL', carrier: 'DHL', ...defaultCompanyChannelRules, category: 'DHL', enabled: true },
    { id: 'ch-fedex-au', name: 'FEDEX AU 促销', carrierId: 'cr-fedex', carrierName: 'FEDEX', carrier: 'FEDEX', ...defaultCompanyChannelRules, category: 'FEDEX', enabled: true },
    { id: 'ch-ups-ca', name: 'UPS 加美线', carrierId: 'cr-ups', carrierName: 'UPS', carrier: 'UPS', ...defaultCompanyChannelRules, category: 'UPS', enabled: true },
    { id: 'ch-usps', name: 'USPS 小包线', carrierId: 'cr-usps', carrierName: 'USPS', carrier: 'USPS', ...defaultCompanyChannelRules, category: 'USPS', enabled: true },
    { id: 'ch-europe-truck', name: '欧洲卡航', carrierId: 'cr-line', carrierName: '专线承运商', carrier: '专线承运商', ...defaultCompanyChannelRules, businessType: 'DEDICATED_LINE', category: '卡车', volumeDivisor: 6000, enabled: true }
  ];

  readonly agents: StoredAgent[] = [
    { id: 'a-9409-ups', code: 'AG-9409-UPS', shortName: 'AG-9409-UPS', name: 'AG-9409-UPS', integrationType: 'MANUAL', warehouseAddress1: '深圳站', warehouseContact: 'AG-9409-UPS', enabled: true },
    { id: 'a-yuhuan', code: 'YH', shortName: '宇环', name: '深圳宇环', integrationType: 'MANUAL', warehouseAddress1: '深圳市宝安区宇环仓一', warehouseContact: '宇环仓库', enabled: true },
    { id: 'a-far-east', code: 'YD', shortName: '远东', name: '深圳远东', integrationType: 'MANUAL', warehouseAddress1: '深圳市龙岗区远东仓一', warehouseContact: '远东仓库', enabled: true },
    { id: 'a-canada', code: 'JMDL', shortName: '加美代理', name: '深圳加美代理', integrationType: 'API', warehouseAddress1: '深圳市加美仓', warehouseContact: '加美仓库', enabled: true },
    { id: 'a-lanmate', code: 'LMT', shortName: '蓝玛特', name: '蓝玛特', integrationType: 'PLATFORM', warehouseAddress1: '蓝玛特仓库', warehouseContact: '蓝玛特仓库', enabled: true },
    { id: 'a-europe', code: 'OZDL', shortName: '欧洲代理', name: '欧洲代理', integrationType: 'MANUAL', warehouseAddress1: '欧洲代理仓库', warehouseContact: '欧洲仓库', enabled: true }
  ];

  readonly agentChannels: AgentChannelSummary[] = [
    { id: 'ach-9409-ups-exp', agentId: 'a-9409-ups', agentName: 'AG-9409-UPS', channelName: 'AGCH-UPS-EXP', enabled: true },
    { id: 'ach-yuhuan-dhl', agentId: 'a-yuhuan', agentName: '宇环', channelName: '宇环 DHL', enabled: true },
    { id: 'ach-far-east-fedex', agentId: 'a-far-east', agentName: '远东', channelName: '远东 FEDEX', enabled: true }
  ];

  readonly surcharges: StoredSurcharge[] = [
    { id: 'sc-remote', name: '偏远附加费', amount: 50, enabled: true }
  ];

  readonly fuelRates: StoredFuelRate[] = [
    { id: 'fr-dhl-hk', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.15, activeAt: '2026-06-06T00:00:00.000Z' }
  ];

  readonly exchangeRates: StoredExchangeRate[] = [
    { id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'RMB', rate: 7.245, activeAt: '2026-06-06T00:00:00.000Z', endAt: '2026-12-31T23:59:59.000Z', enabled: true }
  ];

  readonly pricingRules: StoredPricingRule[] = [
    { id: 'pr-dhl-us-0-5', channelId: 'ch-dhl-hk', channelName: 'DHL HK', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 10, currency: 'USD', enabled: true },
    { id: 'pr-dhl-us-5-20', channelId: 'ch-dhl-hk', channelName: 'DHL HK', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 9.5, currency: 'USD', enabled: true },
    { id: 'pr-fedex-us-0-5', channelId: 'ch-fedex-au', channelName: 'FEDEX AU 促销', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 68, currency: 'RMB', enabled: true },
    { id: 'pr-line-us-5-20', channelId: 'ch-europe-truck', channelName: '欧洲卡航', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 42, currency: 'RMB', enabled: true }
  ];

  readonly priceBooks: StoredPriceBook[] = [];
  readonly priceBookRows: StoredPriceBookRow[] = [];
  readonly legacyPricingSources: LegacyPricingSourceSummary[] = [];
  readonly legacyPricingRows: LegacyPricingRecommendation[] = [];
  readonly agentMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules.map((rule) => ({ ...rule }));
  readonly auditLogs: AuditLogSummary[] = [];
  readonly warehousePackages: WarehousePackageSummary[] = warehouseMockPackages.map((pkg) => normalizeWarehousePackage(pkg));
  readonly warehouseConsolidations: WarehouseConsolidationSummary[] = [];
  readonly warehouseTallyTasks: WarehouseTallyTaskSummary[] = [];

  private readonly shipments: Array<Shipment & { customerId: string; channelId?: string; agentId?: string }> = [
    this.seedShipment('s-seed-1', 'c-9409', 'DAL-0605-AU', 'SYGJ06059409051', 'WAITING_SORT', 'FEDEX AU 促销', '远东'),
    this.seedShipment('s-seed-2', 'c-1344', 'TILL-0529', 'SYGJ05291344165', 'WAITING_DEPARTURE', 'DHL HK', '宇环', {
      transferNo: '9064656160',
      dispatchedAt: '2026-06-02T10:00:00.000Z',
      trackingStaleDays: 9,
      hasProblemTicket: true
    }),
    this.seedShipment('s-seed-3', 'c-9409', 'RCV-0606', 'SYGJ06061230001', 'WAITING_SORT', 'DHL HK', '宇环'),
    this.seedShipment('s-seed-4', 'c-9509', 'DSP-0606', 'SYGJ06061230002', 'WAITING_DISPATCH', 'UPS 加美线', '加美代理'),
    this.seedShipment('s-seed-5', 'c-9409', 'SP-US-0606', 'SYXB0606US001', 'DRAFT', 'USPS 小包线', '蓝玛特', {
      businessType: 'SMALL_PACKET',
      packageType: 'PAK'
    }),
    this.seedShipment('s-seed-6', 'c-1344', 'FBA-UK-0606', 'SYZX0606UK001', 'PROBLEM', '欧洲卡航', '欧洲代理', {
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
      currency: 'RMB',
      reconciliationStatus: 'PENDING',
      customerCode: '9409',
      customerOrderNo: '9409-1',
      transferNo: 'DHL26060600001',
      salesperson: 'Rachel',
      sourceType: 'SYSTEM',
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
      currency: 'RMB',
      reconciliationStatus: 'PENDING',
      customerCode: '1344',
      customerOrderNo: '1344-1',
      transferNo: 'UPS26060600002',
      salesperson: 'Rachel',
      sourceType: 'SYSTEM',
      createdAt: '2026-06-06T10:00:00.000Z'
    }
  ];

  private readonly payableFees: Array<{ id: string; shipmentId: string; name: string; amount: number; settled: boolean }> = [];
  private readonly shipmentFinanceItems: StoredShipmentFinanceItem[] = [];
  private readonly agentBankAccounts: StoredAgentBankAccount[] = [];
  private readonly payablePaymentApplications: StoredPayablePaymentApplication[] = [];
  private readonly payeeBankAccounts: StoredPayeeBankAccount[] = [];
  private readonly paymentApplications: StoredPaymentApplication[] = [];
  private readonly paymentApplicationItems: StoredPaymentApplicationItem[] = [];
  private readonly paymentVouchers: StoredPaymentVoucher[] = [];
  private readonly customerStatements: CustomerStatementSummary[] = [];
  private readonly customerAccounts: StoredCustomerAccount[] = [
    { customerId: 'c-9409', customerName: '9409-Daloday', balance: 10000, currency: 'RMB' },
    { customerId: 'c-1344', customerName: '1344-TILL', balance: 8000, currency: 'RMB' },
    { customerId: 'c-9509', customerName: '9509-Cam&Clae', balance: 0, currency: 'RMB' }
  ];
  private readonly payments: StoredPayment[] = [];
  private readonly loginLogs: StoredLoginLog[] = [];
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
  private readonly waterReceipts: StoredWaterReceipt[] = [
    {
      id: 'wr-al-seed-9409',
      receiptNo: 'SD20260601001',
      site: '思远收款',
      customerId: 'c-9409',
      customerCode: '9409',
      customerName: '9409-Daloday',
      salesperson: 'Rachel',
      receiptMethod: '期初余额',
      receiptDate: '2026-06-01T10:00:00.000Z',
      currency: 'RMB',
      amount: 10000,
      matchedAmount: 0,
      balance: 10000,
      paymentNo: 'al-seed-9409',
      status: 'ARRIVED',
      accountLedgerId: 'al-seed-9409',
      matches: [],
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z'
    },
    {
      id: 'wr-al-seed-1344',
      receiptNo: 'SD20260601002',
      site: '思远收款',
      customerId: 'c-1344',
      customerCode: '1344',
      customerName: '1344-TILL',
      salesperson: 'Leo',
      receiptMethod: '期初余额',
      receiptDate: '2026-06-01T10:00:00.000Z',
      currency: 'RMB',
      amount: 8000,
      matchedAmount: 0,
      balance: 8000,
      paymentNo: 'al-seed-1344',
      status: 'ARRIVED',
      accountLedgerId: 'al-seed-1344',
      matches: [],
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z'
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
    return {
      id: account.id,
      username: account.username,
      role: account.role,
      customerId: account.customerId,
      ...pickMemoryStaffProfile(account),
      mustChangePassword: account.mustChangePassword === true
    };
  }

  async recordLoginLog(principal: Principal, input: { ip: string; userAgent?: string }) {
    this.loginLogs.unshift({
      id: `login-log-${Date.now()}-${this.loginLogs.length}`,
      userId: principal.id,
      username: principal.username,
      ip: input.ip,
      region: inferMemoryIpRegion(input.ip),
      userAgent: input.userAgent,
      createdAt: new Date().toISOString()
    });
    this.audit('auth.login.success', `user:${principal.id}`, principal, null, {
      username: principal.username,
      ip: input.ip,
      region: inferMemoryIpRegion(input.ip),
      userAgent: input.userAgent
    });
  }

  async recordLoginFailure(input: { username?: string; ip: string; userAgent?: string }) {
    const username = input.username?.trim() || '未填写';
    const account = this.accounts.find((item) => item.username === username);
    this.audit('auth.login.failed', `login:${username}`, {
      id: account?.id ?? 'anonymous',
      username: account?.username ?? 'anonymous',
      role: account?.role ?? 'CUSTOMER'
    }, null, {
      username,
      ip: input.ip,
      region: inferMemoryIpRegion(input.ip),
      userAgent: input.userAgent
    });
  }

  async getLoginLogs(principal: Principal) {
    return this.loginLogs
      .filter((row) => row.userId === principal.id)
      .slice(0, 50)
      .map((row) => ({
        id: row.id,
        username: row.username,
        ip: row.ip,
        region: row.region,
        userAgent: row.userAgent,
        createdAt: row.createdAt
      }));
  }

  async getProfile(principal: Principal): Promise<Principal> {
    const account = this.accounts.find((item) => item.id === principal.id);
    if (!account) {
      throw new NotFoundException('账号不存在或已停用');
    }
    return {
      id: account.id,
      username: account.username,
      role: account.role,
      customerId: account.customerId,
      ...pickMemoryStaffProfile(account),
      mustChangePassword: account.mustChangePassword === true
    };
  }

  async updateProfile(principal: Principal, input: MemoryStaffProfileInput): Promise<Principal> {
    const account = this.accounts.find((item) => item.id === principal.id);
    if (!account) {
      throw new NotFoundException('账号不存在或已停用');
    }
    const before = pickMemoryStaffProfile(account);
    updateMemoryStaffProfile(account, input);
    this.audit('auth.profile.update', `user:${principal.id}`, principal, before, pickMemoryStaffProfile(account));
    return this.getProfile(principal);
  }

  async changePassword(principal: Principal, input: { currentPassword?: string; newPassword?: string }) {
    const currentPassword = input.currentPassword ?? '';
    const newPassword = input.newPassword ?? '';
    const strengthError = getPasswordStrengthError(newPassword);
    if (strengthError) {
      throw new BadRequestException(strengthError);
    }
    const account = this.accounts.find((item) => item.id === principal.id);
    if (!account || account.passwordHash !== hashPassword(currentPassword)) {
      throw new ForbiddenException('当前密码不正确');
    }
    account.passwordHash = hashPassword(newPassword);
    account.mustChangePassword = false;
    this.audit('auth.password.change', `user:${principal.id}`, principal, null, { username: principal.username });
    return { ok: true };
  }

  async getShipments(principal: Principal): Promise<Shipment[]> {
    return this.visibleShipments(principal).map((shipment) => this.maskShipmentListFields(principal, this.withSalespersonSite(shipment)));
  }

  async getShipmentStatusCounts(principal: Principal) {
    return summarizeStatusCounts(await this.getShipments(principal));
  }

  async getLineShipmentPool(principal: Principal, query: LineShipmentPoolQuery = {}): Promise<LineShipmentPoolResponse> {
    const allRows = (await this.getShipments(principal)).filter((shipment) => shipment.businessType === 'DEDICATED_LINE');
    const shipmentIds = new Set(allRows.map((shipment) => shipment.id));
    const businessDataApprovedShipmentIds = this.auditLogs
      .filter((row) => row.action === 'customer_service.business_data.approved' && shipmentIds.has(row.target))
      .map((row) => row.target);
    const afterSaleShipmentIds = this.auditLogs
      .filter((row) => {
        if (row.action !== 'customer_service.issue.attach') return false;
        const after = row.after as Record<string, unknown> | null;
        return typeof after?.shipmentId === 'string' && shipmentIds.has(after.shipmentId) && after.originalStatusPool === 'SIGNED';
      })
      .map((row) => (row.after as Record<string, string>).shipmentId);
    return summarizeLineShipmentPool(allRows, query, { businessDataApprovedShipmentIds, afterSaleShipmentIds });
  }

  async getMasterData(): Promise<MasterDataSnapshot> {
    return {
      customers: this.customers.map((customer) => ({ ...customer })),
      contacts: this.customerContacts.map((contact) => ({ ...contact })),
      customerUsers: this.customerUsers.map((user) => ({ ...user })),
      agents: this.agents.map((agent) => ({ ...agent })),
      agentChannels: this.agentChannels.map((channel) => ({ ...channel })),
      carriers: this.carriers.map((carrier) => ({ ...carrier })),
      channelCategories: this.channelCategories.map((category) => ({ ...category })),
      channels: this.channels.map((channel) => this.channelSummary(channel)),
      surcharges: this.surcharges.map((surcharge) => ({ ...surcharge })),
      fuelRates: this.fuelRates.map((fuelRate) => ({ ...fuelRate })),
      exchangeRates: this.exchangeRates.map((exchangeRate) => ({ ...exchangeRate })),
      roles: this.getRoles()
    };
  }

  async createCustomer(principal: Principal, input: CustomerCreateInput): Promise<CustomerSummary> {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    if (this.customers.some((customer) => customer.code === input.code.trim())) {
      throw new BadRequestException('客户代码已存在');
    }
    const salesScope = this.operatorCustomerScope(principal);
    const salesperson = salesScope ? principal.username : input.salesperson?.trim() || principal.username;
    const customer = {
      id: `c-${input.code.trim()}`,
      code: input.code.trim(),
      name: input.name.trim(),
      shortName: input.shortName?.trim() || input.name.trim(),
      fullName: input.fullName?.trim() || `${input.name.trim()} Co., Ltd.`,
      customerType: input.customerType?.trim() || '直客',
      customerSource: input.customerSource?.trim() || undefined,
      salesperson,
      defaultSettlementMethod: input.defaultSettlementMethod?.trim() || undefined,
      enabled: true
    };
    this.customers.push(customer);
    this.customerAccounts.push({ customerId: customer.id, customerName: this.customerDisplayName(customer), balance: 0, currency: 'RMB' });
    this.audit('master_data.customer.create', customer.id, principal, null, customer);
    return { ...customer };
  }

  async updateCustomer(principal: Principal, id: string, input: CustomerUpdateInput): Promise<CustomerSummary> {
    const customer = this.findCustomer(id);
    const before = { ...customer };
    this.ensureCustomerMasterAccess(principal, customer);
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    const nextCode = input.code.trim();
    if (this.customers.some((item) => item.id !== id && item.code === nextCode)) {
      throw new BadRequestException('客户代码已存在');
    }
    customer.code = nextCode;
    const salesScope = this.operatorCustomerScope(principal);
    customer.name = input.name.trim();
    customer.shortName = input.shortName?.trim() || customer.name;
    customer.fullName = input.fullName?.trim() || `${customer.name} Co., Ltd.`;
    customer.customerType = input.customerType?.trim() || '直客';
    customer.customerSource = input.customerSource?.trim() || undefined;
    customer.salesperson = salesScope ? customer.salesperson : input.salesperson?.trim() || customer.salesperson || principal.username;
    customer.defaultSettlementMethod = input.defaultSettlementMethod?.trim() || undefined;
    if (typeof input.enabled === 'boolean') {
      customer.enabled = input.enabled;
    }
    this.audit('master_data.customer.update', id, principal, before, customer);
    return { ...customer };
  }

  async createCustomerContact(principal: Principal, customerId: string, input: CustomerContactCreateInput): Promise<CustomerContactSummary> {
    const customer = this.findCustomer(customerId);
    this.ensureCustomerMasterAccess(principal, customer);
    if (!input.name?.trim()) {
      throw new BadRequestException('联系人名称不能为空');
    }
    if (this.customerContacts.filter((contact) => contact.customerId === customer.id && contact.enabled).length >= 4) {
      throw new BadRequestException('每个客户最多维护四组收货人');
    }
    const contact = {
      id: `cc-${customer.id}-${this.customerContacts.length + 1}`,
      customerId: customer.id,
      customerName: this.customerDisplayName(customer),
      name: input.name.trim(),
      company: input.company?.trim() || undefined,
      phone: input.phone?.trim(),
      email: input.email?.trim(),
      fbaWarehouseCode: input.fbaWarehouseCode?.trim() || undefined,
      address: input.address?.trim() || undefined,
      country: input.country?.trim() || undefined,
      state: input.state?.trim() || undefined,
      postalCode: input.postalCode?.trim() || undefined,
      enabled: true
    };
    this.customerContacts.push(contact);
    this.audit('master_data.customer_contact.create', contact.id, principal, null, contact);
    return { ...contact };
  }

  async updateCustomerContact(principal: Principal, customerId: string, contactId: string, input: CustomerContactUpdateInput): Promise<CustomerContactSummary> {
    const customer = this.findCustomer(customerId);
    this.ensureCustomerMasterAccess(principal, customer);
    const contact = this.customerContacts.find((item) => item.id === contactId && item.customerId === customer.id);
    if (!contact) throw new BadRequestException('收货人不存在');
    if (!input.name?.trim()) throw new BadRequestException('联系人名称不能为空');
    const before = { ...contact };
    contact.name = input.name.trim();
    contact.company = input.company?.trim() || undefined;
    contact.phone = input.phone?.trim() || undefined;
    contact.email = input.email?.trim() || undefined;
    contact.fbaWarehouseCode = input.fbaWarehouseCode?.trim() || undefined;
    contact.address = input.address?.trim() || undefined;
    contact.country = input.country?.trim() || undefined;
    contact.state = input.state?.trim() || undefined;
    contact.postalCode = input.postalCode?.trim() || undefined;
    if (typeof input.enabled === 'boolean') contact.enabled = input.enabled;
    this.audit('master_data.customer_contact.update', contact.id, principal, before, contact);
    return { ...contact };
  }

  async createCustomerUser(principal: Principal, customerId: string, input: CustomerUserCreateInput): Promise<CustomerUserSummary> {
    const customer = this.findCustomer(customerId);
    this.ensureCustomerMasterAccess(principal, customer);
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
    this.audit('master_data.customer_user.create', summary.id, principal, null, summary);
    return { ...summary };
  }

  async updateCustomerEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<CustomerSummary> {
    const customer = this.findCustomer(id);
    const before = { ...customer };
    this.ensureCustomerMasterAccess(principal, customer);
    customer.enabled = input.enabled === true;
    this.audit('master_data.customer.update', id, principal, before, customer);
    return { ...customer };
  }

  async deleteCustomer(principal: Principal, id: string): Promise<CustomerSummary> {
    const customer = this.findCustomer(id);
    const before = { ...customer };
    this.ensureCustomerMasterAccess(principal, customer);
    const hasBusinessData = this.shipments.some((shipment) => shipment.customerId === id)
      || this.waterReceipts.some((receipt) => receipt.customerId === id)
      || this.customerStatements.some((statement) => statement.customerId === id)
      || this.customerUsers.some((user) => user.customerId === id)
      || this.customerAccounts.some((account) => account.customerId === id && Number(account.balance) !== 0);
    if (hasBusinessData) {
      throw new BadRequestException('该客户存在运单、财务记录、客户账号或账户余额，不能删除，请使用停用');
    }
    this.customerContacts.splice(0, this.customerContacts.length, ...this.customerContacts.filter((contact) => contact.customerId !== id));
    this.customerAccounts.splice(0, this.customerAccounts.length, ...this.customerAccounts.filter((account) => account.customerId !== id));
    this.customers.splice(this.customers.findIndex((item) => item.id === id), 1);
    this.audit('master_data.customer.delete', id, principal, before, null);
    return before;
  }

  async createAgent(principal: Principal, input: AgentCreateInput): Promise<AgentSummary> {
    if (!input.name?.trim()) {
      throw new BadRequestException('代理名称不能为空');
    }
    const agent = {
      id: `a-${this.slug(input.name)}`,
      code: input.code?.trim() || input.name.trim().toUpperCase().slice(0, 6),
      shortName: input.shortName?.trim() || input.name.trim(),
      name: input.name.trim(),
      integrationType: input.integrationType ?? 'MANUAL',
      warehouseAddress1: input.warehouseAddress1?.trim() || undefined,
      warehouseAddress2: input.warehouseAddress2?.trim() || undefined,
      warehouseAddress3: input.warehouseAddress3?.trim() || undefined,
      warehouseContact: input.warehouseContact?.trim() || undefined,
      invoiceTemplateName: input.invoiceTemplateName?.trim() || undefined,
      invoiceTemplateUrl: input.invoiceTemplateUrl?.trim() || undefined,
      enabled: true
    };
    this.agents.push(agent);
    this.audit('master_data.agent.create', agent.id, principal, null, agent);
    return { ...agent };
  }

  async updateAgent(principal: Principal, id: string, input: AgentUpdateInput): Promise<AgentSummary> {
    const agent = this.findEnabledEntity(this.agents, id, '代理不存在');
    const before = { ...agent };
    if (!input.name?.trim()) {
      throw new BadRequestException('代理名称不能为空');
    }
    agent.code = input.code?.trim() || agent.code;
    agent.shortName = input.shortName?.trim() || input.name.trim();
    agent.name = input.name.trim();
    agent.integrationType = input.integrationType ?? agent.integrationType ?? 'MANUAL';
    agent.warehouseAddress1 = input.warehouseAddress1?.trim() || undefined;
    agent.warehouseAddress2 = input.warehouseAddress2?.trim() || undefined;
    agent.warehouseAddress3 = input.warehouseAddress3?.trim() || undefined;
    agent.warehouseContact = input.warehouseContact?.trim() || undefined;
    agent.invoiceTemplateName = input.invoiceTemplateName?.trim() || undefined;
    agent.invoiceTemplateUrl = input.invoiceTemplateUrl?.trim() || undefined;
    if (typeof input.enabled === 'boolean') {
      agent.enabled = input.enabled;
    }
    this.audit('master_data.agent.update', id, principal, before, agent);
    return { ...agent };
  }

  async updateAgentEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<AgentSummary> {
    const agent = this.findEnabledEntity(this.agents, id, '代理不存在');
    const before = { ...agent };
    agent.enabled = input.enabled === true;
    this.audit('master_data.agent.update', id, principal, before, agent);
    return { ...agent };
  }

  async createAgentChannel(principal: Principal, input: AgentChannelCreateInput): Promise<AgentChannelSummary> {
    if (!(await this.hasPermission(principal.role, 'master-data:agents:write'))) {
      throw new ForbiddenException('没有代理资料维护权限');
    }
    const agent = this.findEnabledEntity(this.agents, input.agentId, '代理不存在');
    if (!input.channelName?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    const channel = {
      id: `ach-${this.slug(`${agent.id}-${input.channelName}`)}`,
      agentId: agent.id,
      agentName: agent.shortName ?? agent.name,
      channelName: input.channelName.trim(),
      enabled: true
    };
    this.agentChannels.push(channel);
    this.audit('master_data.agent_channel.create', channel.id, principal, null, channel);
    return { ...channel };
  }

  async updateAgentChannel(principal: Principal, id: string, input: AgentChannelUpdateInput): Promise<AgentChannelSummary> {
    const channel = this.findEnabledEntity(this.agentChannels, id, '代理渠道不存在');
    const agent = this.findEnabledEntity(this.agents, input.agentId, '代理不存在');
    const before = { ...channel };
    if (!input.channelName?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    channel.agentId = agent.id;
    channel.agentName = agent.shortName ?? agent.name;
    channel.channelName = input.channelName.trim();
    if (typeof input.enabled === 'boolean') {
      channel.enabled = input.enabled;
    }
    this.audit('master_data.agent_channel.update', id, principal, before, channel);
    return { ...channel };
  }

  async updateAgentChannelEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<AgentChannelSummary> {
    const channel = this.findEnabledEntity(this.agentChannels, id, '代理渠道不存在');
    const before = { ...channel };
    channel.enabled = input.enabled === true;
    this.audit('master_data.agent_channel.update', id, principal, before, channel);
    return { ...channel };
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

  async createChannel(principal: Principal, input: ChannelCreateInput): Promise<ChannelSummary> {
    const carrierName = input.carrierName?.trim();
    const carrier = input.carrierId
      ? this.findEnabledEntity(this.carriers, input.carrierId, '承运商不存在')
      : carrierName
        ? this.carriers.find((item) => item.name === carrierName) ?? { id: `cr-${this.slug(carrierName)}`, name: carrierName, enabled: true }
        : undefined;
    if (!carrier) {
      throw new BadRequestException('承运商不存在');
    }
    if (!this.carriers.some((item) => item.id === carrier.id)) {
      this.carriers.push(carrier);
    }
    if (!input.name?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    const channel = {
      id: `ch-${this.slug(input.name)}`,
      name: input.name.trim(),
      carrierId: carrier.id,
      carrierName: carrier.name,
      carrier: carrier.name,
      businessType: input.businessType ?? 'EXPRESS',
      category: input.category?.trim() || carrier.name,
      volumeDivisor: input.volumeDivisor ?? 5000,
      multiPieceWeightRule: input.multiPieceWeightRule?.trim() || 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: input.singleWeightRoundingRule?.trim() || 'ACTUAL',
      settlementWeightRule: input.settlementWeightRule?.trim() || 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: input.settlementWeightRoundingRule?.trim() || 'NONE',
      largeCargoThresholdKg: input.largeCargoThresholdKg,
      remoteAreaRule: input.remoteAreaRule?.trim() || 'NONE',
      enabled: true
    };
    this.channels.push(channel);
    const summary = this.channelSummary(channel);
    this.audit('master_data.channel.create', channel.id, principal, null, summary);
    return summary;
  }

  async updateChannel(principal: Principal, id: string, input: ChannelUpdateInput): Promise<ChannelSummary> {
    const channel = this.findEnabledEntity(this.channels, id, '渠道不存在');
    const carrier = this.findEnabledEntity(this.carriers, input.carrierId, '承运商不存在');
    const before = this.channelSummary(channel);
    if (!input.name?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    Object.assign(channel, {
      name: input.name.trim(),
      carrierId: carrier.id,
      carrierName: carrier.name,
      carrier: carrier.name,
      businessType: input.businessType ?? 'EXPRESS',
      category: input.category?.trim() || carrier.name,
      volumeDivisor: input.volumeDivisor ?? 5000,
      multiPieceWeightRule: input.multiPieceWeightRule?.trim() || 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: input.singleWeightRoundingRule?.trim() || 'ACTUAL',
      settlementWeightRule: input.settlementWeightRule?.trim() || 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: input.settlementWeightRoundingRule?.trim() || 'NONE',
      largeCargoThresholdKg: input.largeCargoThresholdKg,
      remoteAreaRule: input.remoteAreaRule?.trim() || 'NONE',
      enabled: input.enabled ?? channel.enabled
    });
    const summary = this.channelSummary(channel);
    this.audit('master_data.channel.update', id, principal, before, summary);
    return summary;
  }

  async updateChannelEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<ChannelSummary> {
    const channel = this.findEnabledEntity(this.channels, id, '渠道不存在');
    const before = this.channelSummary(channel);
    channel.enabled = input.enabled === true;
    const summary = this.channelSummary(channel);
    this.audit('master_data.channel.update', id, principal, before, summary);
    return summary;
  }

  async createChannelCategory(principal: Principal, input: ChannelCategoryCreateInput): Promise<ChannelCategorySummary> {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('类别名称不能为空');
    }
    if (this.channelCategories.some((category) => category.name === name)) {
      throw new BadRequestException('类别名称已存在');
    }
    const category = { id: `cc-${this.slug(name)}`, name, enabled: true };
    this.channelCategories.push(category);
    this.audit('master_data.channel_category.create', category.id, principal, null, category);
    return { ...category };
  }

  async updateChannelCategory(principal: Principal, id: string, input: ChannelCategoryUpdateInput): Promise<ChannelCategorySummary> {
    const category = this.findEnabledEntity(this.channelCategories, id, '类别不存在');
    const before = { ...category };
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('类别名称不能为空');
    }
    if (this.channelCategories.some((item) => item.id !== id && item.name === name)) {
      throw new BadRequestException('类别名称已存在');
    }
    category.name = name;
    category.enabled = input.enabled ?? category.enabled;
    this.audit('master_data.channel_category.update', id, principal, before, category);
    return { ...category };
  }

  async updateChannelCategoryEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<ChannelCategorySummary> {
    const category = this.findEnabledEntity(this.channelCategories, id, '类别不存在');
    const before = { ...category };
    category.enabled = input.enabled === true;
    this.audit('master_data.channel_category.update', id, principal, before, category);
    return { ...category };
  }

  async createSurcharge(principal: Principal, input: SurchargeCreateInput): Promise<SurchargeSummary> {
    if (!input.name?.trim() || input.amount <= 0) {
      throw new BadRequestException('附加费名称和金额无效');
    }
    const surcharge = { id: `sc-${this.slug(input.name)}`, name: input.name.trim(), amount: roundMoney(input.amount), enabled: true };
    this.surcharges.push(surcharge);
    this.audit('master_data.surcharge.create', surcharge.id, principal, null, surcharge);
    return { ...surcharge };
  }

  async updateSurchargeEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<SurchargeSummary> {
    const surcharge = this.findEnabledEntity(this.surcharges, id, '附加费不存在');
    const before = { ...surcharge };
    surcharge.enabled = input.enabled === true;
    this.audit('master_data.surcharge.update', id, principal, before, surcharge);
    return { ...surcharge };
  }

  async createFuelRate(principal: Principal, input: FuelRateCreateInput): Promise<FuelRateSummary> {
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
    this.audit('master_data.fuel_rate.create', fuelRate.id, principal, null, fuelRate);
    return { ...fuelRate };
  }

  async createExchangeRate(principal: Principal, input: ExchangeRateCreateInput): Promise<ExchangeRateSummary> {
    const activeAt = new Date(input.activeAt);
    const endAt = input.endAt ? new Date(input.endAt) : undefined;
    if (!input.baseCurrency?.trim() || !input.quoteCurrency?.trim() || input.rate <= 0 || !endAt || Number.isNaN(activeAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt < activeAt) {
      throw new BadRequestException('汇率信息无效');
    }
    const exchangeRate = {
      id: `er-${input.baseCurrency.toLowerCase()}-${input.quoteCurrency.toLowerCase()}-${this.exchangeRates.length + 1}`,
      baseCurrency: input.baseCurrency.trim().toUpperCase(),
      quoteCurrency: input.quoteCurrency.trim().toUpperCase(),
      rate: roundMoney(input.rate),
      activeAt: activeAt.toISOString(),
      endAt: endAt?.toISOString(),
      enabled: true
    };
    this.exchangeRates.push(exchangeRate);
    this.audit('master_data.exchange_rate.create', exchangeRate.id, principal, null, exchangeRate);
    return { ...exchangeRate };
  }

  async updateExchangeRate(principal: Principal, id: string, input: ExchangeRateUpdateInput): Promise<ExchangeRateSummary> {
    const exchangeRate = this.exchangeRates.find((row) => row.id === id);
    if (!exchangeRate) throw new BadRequestException('汇率不存在');
    const before = { ...exchangeRate };
    const nextActiveAt = input.activeAt !== undefined ? new Date(input.activeAt) : new Date(exchangeRate.activeAt);
    const nextEndAt = input.endAt !== undefined ? new Date(input.endAt) : exchangeRate.endAt ? new Date(exchangeRate.endAt) : undefined;
    if ((input.rate !== undefined && input.rate <= 0) || Number.isNaN(nextActiveAt.getTime()) || (nextEndAt && (Number.isNaN(nextEndAt.getTime()) || nextEndAt < nextActiveAt))) {
      throw new BadRequestException('汇率信息无效');
    }
    if (input.baseCurrency !== undefined) exchangeRate.baseCurrency = input.baseCurrency.trim().toUpperCase();
    if (input.quoteCurrency !== undefined) exchangeRate.quoteCurrency = input.quoteCurrency.trim().toUpperCase();
    if (input.rate !== undefined) exchangeRate.rate = roundMoney(input.rate);
    if (input.activeAt !== undefined) exchangeRate.activeAt = nextActiveAt.toISOString();
    if (input.endAt !== undefined) exchangeRate.endAt = nextEndAt?.toISOString();
    if (input.enabled !== undefined) exchangeRate.enabled = input.enabled === true;
    this.audit('master_data.exchange_rate.update', id, principal, before, exchangeRate);
    return { ...exchangeRate };
  }

  async hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean> {
    return role === 'ADMIN' || (this.rolePermissionMatrix[role] ?? []).includes(permission);
  }

  async getPermissionsForRole(role: RoleKey): Promise<PermissionKey[]> {
    return role === 'ADMIN' ? allPermissions() : [...(this.rolePermissionMatrix[role] ?? [])];
  }

  async getRolePermissionMatrix(): Promise<{ availablePermissions: typeof permissionDefinitions; roles: RolePermissionRow[] }> {
    return {
      availablePermissions: permissionDefinitions,
      roles: this.getRoles().map((role) => this.buildMemoryRoleRow(role))
    };
  }

  async getStaffAccounts(principal: Principal, query: StaffAccountQuery = {}): Promise<StaffAccountSummary[]> {
    this.ensureAdmin(principal, '只有管理员可以查看员工账号');
    const lastLoginByUserId = new Map<string, string>();
    for (const login of this.loginLogs) {
      if (!lastLoginByUserId.has(login.userId)) {
        lastLoginByUserId.set(login.userId, login.createdAt);
      }
    }
    return this.accounts
      .filter((account) => account.role !== 'CUSTOMER')
      .filter((account) => matchMemoryStaffAccount(account, query, this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label))
      .map((account) => ({
        id: account.id,
        username: account.username,
        ...pickMemoryStaffProfile(account),
        role: account.role as StaffAccountRoleKey,
        roleLabel: this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label,
        enabled: account.enabled !== false,
        mustChangePassword: account.mustChangePassword === true,
        lastLoginAt: lastLoginByUserId.get(account.id),
        createdAt: new Date().toISOString()
      }));
  }

  async getSites(principal: Principal): Promise<SiteSummary[]> {
    this.ensureAdmin(principal, '只有管理员可以查看站点');
    return [...this.sites].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)).map((site) => ({ ...site }));
  }

  async createSite(principal: Principal, input: SiteCreateInput): Promise<SiteSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护站点');
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('站点名称不能为空');
    if (this.sites.some((site) => site.name === name)) throw new BadRequestException('站点名称已存在');
    const site = { id: `site-${this.slug(name)}`, sortOrder: input.sortOrder ?? Math.max(0, ...this.sites.map((item) => item.sortOrder)) + 1, name, enabled: true };
    this.sites.push(site);
    this.audit('system.site.create', `site:${site.id}`, principal, null, site);
    return { ...site };
  }

  async updateSite(principal: Principal, id: string, input: SiteUpdateInput): Promise<SiteSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护站点');
    const site = this.sites.find((item) => item.id === id);
    if (!site) throw new NotFoundException('站点不存在');
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('站点名称不能为空');
    if (this.sites.some((item) => item.id !== id && item.name === name)) throw new BadRequestException('站点名称已存在');
    const before = { ...site };
    site.name = name;
    site.sortOrder = input.sortOrder ?? site.sortOrder;
    site.enabled = input.enabled ?? site.enabled;
    this.audit('system.site.update', `site:${id}`, principal, before, site);
    return { ...site };
  }

  async updateSiteEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<SiteSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护站点');
    const site = this.sites.find((item) => item.id === id);
    if (!site) throw new NotFoundException('站点不存在');
    const before = { ...site };
    site.enabled = input.enabled === true;
    this.audit('system.site.enabled', `site:${id}`, principal, before, site);
    return { ...site };
  }

  async createStaffAccount(principal: Principal, input: StaffAccountCreateInput): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以新建员工账号');
    const username = input.username?.trim();
    if (!username || !/^[a-zA-Z0-9_.-]{5,32}$/.test(username) || !/[a-zA-Z]/.test(username)) {
      throw new BadRequestException('账号需为 5-32 位，并至少包含一个英文字母，可包含数字、点、下划线或短横线');
    }
    if (this.roleMeta[input.role]?.enabled !== true || this.roleMeta[input.role]?.systemBuiltin === true) {
      throw new BadRequestException('员工角色不正确');
    }
    if (this.accounts.some((account) => account.username === username)) {
      throw new BadRequestException('账号已存在');
    }
    const initialPassword = input.password?.trim() || `${username}@123`;
    const strengthError = getPasswordStrengthError(initialPassword);
    if (strengthError) {
      throw new BadRequestException(strengthError);
    }
    const account: Account = {
      id: `u-${username.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
      username,
      passwordHash: hashPassword(initialPassword),
      role: input.role,
      ...normalizeMemoryStaffProfile(input),
      enabled: input.enabled !== false,
      mustChangePassword: true
    };
    this.accounts.push(account);
    this.audit('system.staff.create', `user:${account.id}`, principal, null, {
      username: account.username,
      role: account.role,
      enabled: account.enabled !== false,
      ...pickMemoryStaffProfile(account),
      mustChangePassword: true
    });
    return {
      id: account.id,
      username: account.username,
      ...pickMemoryStaffProfile(account),
      role: account.role as StaffAccountRoleKey,
      roleLabel: this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label,
      enabled: account.enabled !== false,
      mustChangePassword: true,
      createdAt: new Date().toISOString()
    };
  }

  async updateStaffAccount(principal: Principal, id: string, input: StaffAccountUpdateInput): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护员工账号');
    const account = this.accounts.find((item) => item.id === id && item.role !== 'CUSTOMER');
    if (!account) throw new NotFoundException('员工账号不存在');
    const username = input.username?.trim();
    if (username && (!/^[a-zA-Z0-9_.-]{5,32}$/.test(username) || !/[a-zA-Z]/.test(username))) {
      throw new BadRequestException('账号需为 5-32 位，并至少包含一个英文字母，可包含数字、点、下划线或短横线');
    }
    if (username && this.accounts.some((item) => item.id !== id && item.username === username)) {
      throw new BadRequestException('账号已存在');
    }
    if (input.role !== undefined && (this.roleMeta[input.role]?.enabled !== true || this.roleMeta[input.role]?.systemBuiltin === true)) {
      throw new BadRequestException('员工角色不正确');
    }
    if (id === principal.id && (input.enabled === false || (input.role !== undefined && input.role !== account.role))) {
      throw new BadRequestException('不能停用当前登录账号或修改自己的用户组');
    }
    const password = input.password?.trim();
    if (password) {
      const strengthError = getPasswordStrengthError(password);
      if (strengthError) throw new BadRequestException(strengthError);
    }
    const before = { username: account.username, role: account.role, enabled: account.enabled !== false, ...pickMemoryStaffProfile(account) };
    if (username) account.username = username;
    if (input.role !== undefined) account.role = input.role;
    if (password) {
      account.passwordHash = hashPassword(password);
      account.mustChangePassword = true;
    }
    Object.assign(account, normalizeMemoryStaffProfile(input));
    if (input.enabled !== undefined) account.enabled = input.enabled === true;
    this.audit('system.staff.update', `user:${account.id}`, principal, before, { username: account.username, role: account.role, enabled: account.enabled !== false, ...pickMemoryStaffProfile(account) });
    return {
      id: account.id,
      username: account.username,
      ...pickMemoryStaffProfile(account),
      role: account.role as StaffAccountRoleKey,
      roleLabel: this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label,
      enabled: account.enabled !== false,
      mustChangePassword: account.mustChangePassword === true,
      createdAt: new Date().toISOString()
    };
  }

  async updateStaffAccountEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以启停员工账号');
    if (id === principal.id && input.enabled !== true) throw new BadRequestException('不能停用当前登录账号');
    const account = this.accounts.find((item) => item.id === id && item.role !== 'CUSTOMER');
    if (!account) throw new NotFoundException('员工账号不存在');
    const before = { username: account.username, role: account.role, enabled: account.enabled !== false, ...pickMemoryStaffProfile(account) };
    account.enabled = input.enabled === true;
    this.audit('system.staff.enabled', `user:${account.id}`, principal, before, { username: account.username, role: account.role, enabled: account.enabled !== false, ...pickMemoryStaffProfile(account) });
    return {
      id: account.id,
      username: account.username,
      ...pickMemoryStaffProfile(account),
      role: account.role as StaffAccountRoleKey,
      roleLabel: this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label,
      enabled: account.enabled !== false,
      mustChangePassword: account.mustChangePassword === true,
      lastLoginAt: this.loginLogs.find((login) => login.userId === account.id)?.createdAt,
      createdAt: new Date().toISOString()
    };
  }

  async deleteStaffAccount(principal: Principal, id: string): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以删除员工账号');
    if (id === principal.id) throw new BadRequestException('不能删除当前登录账号');
    const account = this.accounts.find((item) => item.id === id && item.role !== 'CUSTOMER');
    if (!account) throw new NotFoundException('员工账号不存在');
    const before = { username: account.username, role: account.role, enabled: account.enabled !== false, ...pickMemoryStaffProfile(account) };
    account.enabled = false;
    this.audit('system.staff.delete', `user:${account.id}`, principal, before, { username: account.username, role: account.role, enabled: false, ...pickMemoryStaffProfile(account) });
    return {
      id: account.id,
      username: account.username,
      ...pickMemoryStaffProfile(account),
      role: account.role as StaffAccountRoleKey,
      roleLabel: this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label,
      enabled: false,
      mustChangePassword: account.mustChangePassword === true,
      createdAt: new Date().toISOString()
    };
  }

  async resetStaffAccountPasswords(principal: Principal, input: StaffAccountPasswordResetInput): Promise<StaffAccountPasswordResetResult[]> {
    this.ensureAdmin(principal, '只有管理员可以重置员工密码');
    const userIds = [...new Set(input.userIds ?? [])].filter(Boolean);
    if (!userIds.length) {
      throw new BadRequestException('请选择要重置密码的员工账号');
    }
    const accounts = userIds.map((id) => this.accounts.find((account) => account.id === id && account.role !== 'CUSTOMER'));
    if (accounts.some((account) => !account)) {
      throw new NotFoundException('部分员工账号不存在或不是员工账号');
    }
    const results = (accounts as Account[]).map((account) => {
      const temporaryPassword = `${account.username}@123`;
      account.passwordHash = hashPassword(temporaryPassword);
      account.mustChangePassword = true;
      return { id: account.id, username: account.username, temporaryPassword };
    });
    this.audit(
      'system.staff.password_reset',
      `users:${results.map((item) => item.id).join(',')}`,
      principal,
      results.map((item) => ({ id: item.id, username: item.username })),
      results.map((item) => ({ id: item.id, username: item.username, passwordRule: 'username@123', mustChangePassword: true }))
    );
    return results;
  }

  async updateStaffAccountSite(principal: Principal, id: string, input: { site?: string }): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护员工站点');
    const account = this.accounts.find((item) => item.id === id && item.role !== 'CUSTOMER');
    if (!account) {
      throw new NotFoundException('员工账号不存在');
    }
    const before = { site: account.site ?? null };
    account.site = input.site?.trim() || undefined;
    this.audit('system.staff.site.update', `user:${id}`, principal, before, { site: account.site ?? null });
    return {
      id: account.id,
      username: account.username,
      ...pickMemoryStaffProfile(account),
      role: account.role as StaffAccountRoleKey,
      roleLabel: this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label,
      enabled: true,
      mustChangePassword: account.mustChangePassword === true,
      createdAt: new Date().toISOString()
    };
  }

  async createRoleGroup(principal: Principal, input: RoleGroupInput): Promise<RolePermissionRow> {
    this.ensureAdmin(principal, '只有管理员可以维护用户组');
    const label = input.label?.trim();
    if (!label) throw new BadRequestException('用户组名称不能为空');
    if (Object.values(this.roleMeta).some((meta) => meta.label === label)) throw new BadRequestException('用户组名称已存在');
    const role = `UG_${Buffer.from(label).toString('hex').slice(0, 24).toUpperCase()}`;
    const templateRole = input.templateRole && this.rolePermissionMatrix[input.templateRole] ? input.templateRole : 'OPERATOR';
    this.rolePermissionMatrix[role] = [...(this.rolePermissionMatrix[templateRole] ?? [])];
    this.roleMeta[role] = {
      label,
      description: input.description?.trim() || undefined,
      site: input.site?.trim() || undefined,
      sortOrder: Number(input.sortOrder) || Math.max(0, ...Object.values(this.roleMeta).filter((item) => !item.systemBuiltin).map((item) => item.sortOrder)) + 1,
      enabled: input.enabled !== false,
      systemBuiltin: false
    };
    const after = this.buildMemoryRoleRow(role);
    this.audit('system.role.create', `role:${role}`, principal, null, after);
    return after;
  }

  async updateRoleGroup(principal: Principal, role: RoleKey, input: RoleGroupInput): Promise<RolePermissionRow> {
    this.ensureAdmin(principal, '只有管理员可以维护用户组');
    const meta = this.roleMeta[role];
    if (!meta) throw new NotFoundException('用户组不存在');
    if (meta.systemBuiltin || role === 'ADMIN') throw new BadRequestException('内置角色不能在用户组中修改');
    const label = input.label?.trim();
    if (!label) throw new BadRequestException('用户组名称不能为空');
    if (Object.entries(this.roleMeta).some(([key, item]) => key !== role && item.label === label)) throw new BadRequestException('用户组名称已存在');
    const before = this.buildMemoryRoleRow(role);
    this.roleMeta[role] = {
      ...meta,
      label,
      description: input.description?.trim() || undefined,
      site: input.site?.trim() || undefined,
      sortOrder: Number(input.sortOrder) || meta.sortOrder,
      enabled: input.enabled !== false
    };
    const after = this.buildMemoryRoleRow(role);
    this.audit('system.role.update', `role:${role}`, principal, before, after);
    return after;
  }

  async updateRoleGroupEnabled(principal: Principal, role: RoleKey, input: EnabledUpdateInput): Promise<RolePermissionRow> {
    this.ensureAdmin(principal, '只有管理员可以维护用户组');
    const meta = this.roleMeta[role];
    if (!meta) throw new NotFoundException('用户组不存在');
    if (meta.systemBuiltin || role === 'ADMIN') throw new BadRequestException('内置角色不能停用');
    const before = this.buildMemoryRoleRow(role);
    meta.enabled = input.enabled === true;
    const after = this.buildMemoryRoleRow(role);
    this.audit('system.role.enabled', `role:${role}`, principal, before, after);
    return after;
  }

  async updateRolePermissions(principal: Principal, role: RoleKey, permissions: PermissionKey[]): Promise<RolePermissionRow> {
    if (!this.roleMeta[role] && !isBuiltinRoleKey(role)) {
      throw new NotFoundException('用户组不存在');
    }
    const before = [...(this.rolePermissionMatrix[role] ?? [])];
    this.rolePermissionMatrix[role] = normalizeRolePermissions(role, permissions);
    this.audit('system.role_permissions.update', `role:${role}`, principal, before, this.rolePermissionMatrix[role]);
    return this.buildMemoryRoleRow(role);
  }

  async getAuditLogs(principal: Principal, query: AuditLogQuery = {}): Promise<AuditLogListResponse> {
    this.ensureAdmin(principal, '只有管理员可以查看高危操作审计');
    const operator = query.operator?.trim().toLowerCase();
    const target = query.target?.trim().toLowerCase();
    const filtered = this.auditLogs
      .filter((row) => (operator ? row.actorId.toLowerCase().includes(operator) || row.actorUsername.toLowerCase().includes(operator) : true))
      .filter((row) => (query.module ? row.module === query.module : true))
      .filter((row) => (query.action?.trim() ? row.action.toLowerCase().includes(query.action.trim().toLowerCase()) : true))
      .filter((row) => (target ? row.target.toLowerCase().includes(target) : true))
      .filter((row) => (query.result ? row.result === query.result : true))
      .filter((row) => (query.startedAt ? new Date(row.createdAt).getTime() >= new Date(query.startedAt).getTime() : true))
      .filter((row) => (query.endedAt ? new Date(row.createdAt).getTime() <= new Date(query.endedAt).getTime() : true));
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(query.pageSize ?? 500) || 500));
    const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
    const suspiciousDeleteWarnings: AuditLogListResponse['suspiciousDeleteWarnings'] = [];
    rows
      .filter((row) => /(delete|void|删除|作废)/i.test(row.action))
      .forEach((row, _index, deleteRows) => {
        if (suspiciousDeleteWarnings.some((warning) => warning.actorId === row.actorId)) {
          return;
        }
        const startedAt = new Date(row.createdAt).getTime();
        const windowRows = deleteRows.filter((item) => item.actorId === row.actorId && new Date(item.createdAt).getTime() - startedAt <= 10 * 60 * 1000);
        if (windowRows.length >= 5) {
          suspiciousDeleteWarnings.push({
            actorId: row.actorId,
            actorUsername: row.actorUsername,
            windowStartedAt: windowRows[0].createdAt,
            windowEndedAt: windowRows[windowRows.length - 1].createdAt,
            count: windowRows.length
          });
        }
      });
    return { rows, suspiciousDeleteWarnings, pagination: { page, pageSize, totalItems: filtered.length }, dashboard: buildAuditDashboard(this.auditLogs) };
  }

  async recordPermissionDenied(principal: Principal, input: { permissions: string[]; method?: string; path?: string }) {
    this.audit('security.permission.denied', `${input.method ?? 'UNKNOWN'} ${input.path ?? ''}`.trim(), principal, null, {
      role: principal.role,
      username: principal.username,
      permissions: input.permissions
    });
  }

  async recordHttpAudit(
    principal: Principal,
    input: { method: string; path: string; result: 'SUCCESS' | 'FAILED'; durationMs: number; errorMessage?: string }
  ) {
    this.audit(
      `${auditModuleFromMemoryPath(input.path)}.request.${auditKindFromMemoryRequest(input.method, input.path)}${input.result === 'FAILED' ? '.failed' : ''}`,
      `${input.method.toUpperCase()} ${input.path}`.trim(),
      principal,
      null,
      { status: input.result, durationMs: input.durationMs, errorMessage: input.errorMessage }
    );
  }

  quote(input: PricingQuoteRequest) {
    return calculateQuote(input);
  }

  async lookupPrice(principal: Principal, input: PriceLookupRequest): Promise<PriceLookupResponse> {
    this.ensureStaffPricingAccess(principal);
    return createBackendPriceLookup(principal, input, this.priceBookRows, this.priceBooks, this.agentMarkupRules);
  }

  async getLegacyPricingMeta(principal: Principal): Promise<LegacyPricingMetaResponse> {
    this.ensureStaffPricingAccess(principal);
    const rows = this.priceBookRows;
    return {
      modules: [
        { key: 'amazon', label: '亚马逊查询', rowCount: rows.filter((row) => row.warehouseCode).length, sourceCount: this.priceBooks.length },
        { key: 'inquiry', label: '欧洲海运超大件查询', rowCount: rows.length, sourceCount: this.priceBooks.length },
        { key: 'europeExpress', label: '欧洲空海运铁路快递查询', rowCount: rows.length, sourceCount: this.priceBooks.length },
        { key: 'southAfrica', label: '南非专线查询', rowCount: rows.filter((row) => /南非/.test(row.destinationCountry)).length, sourceCount: this.priceBooks.length }
      ],
      agents: uniqueStrings(rows.map((row) => row.agentName)),
      origins: uniqueStrings(rows.map((row) => row.sourceSheetName)),
      warehouseCodes: uniqueStrings(rows.map((row) => row.warehouseCode)),
      tiers: ['12KG+', '51KG+', '100KG+', '按方包税', '按方不包税', '按方未标注']
    };
  }

  async quoteLegacyPricing(principal: Principal, input: LegacyPricingQuoteRequest): Promise<LegacyPricingQuoteResponse> {
    this.ensureStaffPricingAccess(principal);
    const moduleRows = dedupeInMemoryLegacyRows(
      this.priceBookRows.filter((row) => inferInMemoryLegacyModule(row) === input.module)
    );
    const lookup = createBackendPriceLookup(principal, {
      amazonCode: input.amazonCode,
      productName: input.productName,
      destinationCountry: input.destinationCountry || (input.module === 'southAfrica' ? '南非' : '美国'),
      postalCode: input.postalCode,
      address: input.address,
      packageInfo: input.packageInfo,
      chargeableWeightKg: input.chargeableWeightKg ?? 0,
      actualWeightKg: input.actualWeightKg,
      volumeCbm: input.volumeCbm,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      packageCount: input.packageCount,
      unitActualWeightKg: input.unitActualWeightKg
    }, moduleRows, this.priceBooks, this.agentMarkupRules);
    const recommendations = lookup.recommendations.map((item): LegacyPricingRecommendation => ({
      id: item.price.id,
      module: input.module,
      sourceId: item.price.priceBookId,
      agentName: item.agentName,
      origin: item.price.sourceSheetName,
      channelName: item.channelName,
      serviceName: item.businessRouteName,
      warehouseCode: item.price.warehouseCode,
      destinationCountry: item.price.destinationCountry,
      weightSegmentLabel: item.weightSegmentLabel,
      quoteMode: 'kg',
      costUnitPrice: item.price.costPerKg ?? item.salesRatePerKg,
      salesUnitPrice: item.salesRatePerKg,
      costTotal: item.totalCost ?? item.totalSales,
      salesTotal: item.totalSales,
      grossProfit: item.grossProfit,
      chargeableWeightKg: lookup.chargeableWeightKg,
      transitLabel: item.transitLabel,
      markup: item.markup,
      productSurchargeRemark: item.productSurchargeRemark,
      specialRemark: item.specialRemark,
      remark: item.remark
    }));
    return {
      module: input.module,
      query: input,
      recommendations,
      cheapestRecommendations: recommendations.slice(0, 3),
      fastestRecommendations: lookup.fastestRecommendations.map((item) => recommendations.find((row) => row.id === item.price.id)).filter((row): row is LegacyPricingRecommendation => Boolean(row)),
      selected: recommendations[0],
      agentErrors: lookup.agentErrors,
      metrics: {
        matchedRows: recommendations.length,
        agents: new Set(recommendations.map((row) => row.agentName)).size,
        channels: new Set(recommendations.map((row) => row.channelName)).size,
        sources: new Set(recommendations.map((row) => row.sourceId).filter(Boolean)).size
      }
    };
  }

  async getLegacyPricingSources(principal: Principal, module?: LegacyPricingModule) {
    this.ensureAdmin(principal, '只有管理员可以查看亮崽报价源');
    const sources = this.legacyPricingSources.filter((source) => !module || source.module === module);
    return { sources };
  }

  async importLegacyPricingSource(principal: Principal, input: LegacyPricingImportInput) {
    this.ensureAdmin(principal, '只有管理员可以导入亮崽报价副本');
    if (!input.module || !input.fileName?.trim() || !Array.isArray(input.rows) || input.rows.length === 0) {
      throw new BadRequestException('亮崽报价源、文件名和报价行不能为空');
    }
    const source: LegacyPricingSourceSummary = {
      id: `legacy-${Date.now()}-${this.legacyPricingSources.length + 1}`,
      module: input.module,
      fileName: input.fileName.trim(),
      rowCount: input.rows.length,
      importedAt: new Date().toISOString(),
      status: 'ok'
    };
    this.legacyPricingSources.unshift(source);
    this.audit('pricing.legacy.source.import', source.id, principal, null, source);
    return { source, rowCount: input.rows.length };
  }

  async deleteLegacyPricingSource(principal: Principal, id: string) {
    this.ensureAdmin(principal, '只有管理员可以删除亮崽报价副本');
    const index = this.legacyPricingSources.findIndex((source) => source.id === id);
    if (index === -1) throw new NotFoundException('亮崽报价源不存在');
    const [source] = this.legacyPricingSources.splice(index, 1);
    this.audit('pricing.legacy.source.delete', id, principal, source, { deletedAt: new Date().toISOString() });
    return source;
  }

  async rebuildLegacyPricing(principal: Principal, module?: LegacyPricingModule) {
    this.ensureAdmin(principal, '只有管理员可以重建亮崽报价副本');
    const rowCount = this.priceBookRows.filter((row) => !module || module !== 'amazon' || row.warehouseCode).length;
    this.audit('pricing.legacy.rebuild', module ?? 'all', principal, null, { rowCount });
    return { module: module ?? 'all', rowCount, rebuiltAt: new Date().toISOString() };
  }

  async getLegacyPricingHealth(principal: Principal, module?: LegacyPricingModule) {
    this.ensureAdmin(principal, '只有管理员可以查看亮崽报价体检');
    const rowCount = this.priceBookRows.filter((row) => !module || module !== 'amazon' || row.warehouseCode).length;
    return { module: module ?? 'all', rowCount, issues: rowCount ? [] : [{ severity: 'warn', message: '暂无亮崽兼容报价副本' }] };
  }

  async getAgentMarkupRules(principal: Principal, query: AgentMarkupListQuery = {}): Promise<AgentMarkupListResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看代理加价规则');
    return buildAgentMarkupListResponse(this.agentMarkupRules, this.priceBookRows, query);
  }

  async previewAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupPreviewResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看规则命中线路');
    const rule = this.agentMarkupRules.find((item) => item.id === id && !item.deletedAt);
    if (!rule) {
      throw new NotFoundException('代理加价规则不存在');
    }
    return buildAgentMarkupPreview(rule, this.priceBookRows, this.auditLogs.filter((log) => log.target === id));
  }

  async exportAgentMarkupRules(principal: Principal, query: AgentMarkupListQuery = {}): Promise<AgentMarkupExportResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导出代理加价规则');
    const response = buildAgentMarkupListResponse(this.agentMarkupRules, this.priceBookRows, { ...query, page: 1, pageSize: -1 });
    this.audit('pricing.markup.export', 'agent-markup-rules', principal, null, { count: response.rows.length });
    return { rows: response.rows, exportedAt: new Date().toISOString() };
  }

  async importAgentMarkupRules(principal: Principal, input: { rows?: AgentMarkupCreateInput[] }): Promise<AgentMarkupImportResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导入代理加价规则');
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const created: AgentMarkupSummary[] = [];
    const errorRows: AgentMarkupImportResponse['errorRows'] = [];
    for (const [index, row] of rows.entries()) {
      try {
        created.push(await this.createAgentMarkupRule(principal, row));
      } catch (error) {
        errorRows.push({ index: index + 1, reason: error instanceof Error ? error.message : '规则格式错误' });
      }
    }
    this.audit('pricing.markup.import', 'agent-markup-rules', principal, null, { successCount: created.length, errorRows });
    return { successCount: created.length, errorRows, rows: created };
  }

  async createAgentMarkupRule(principal: Principal, input: AgentMarkupCreateInput): Promise<AgentMarkupSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以新增代理加价规则');
    const normalized = normalizeAgentMarkupInput(input);
    validateAgentMarkupRule(normalized, this.priceBookRows, this.agentMarkupRules);
    const markupValue = normalized.markupValue ?? normalized.markupPerKg;
    if (!input.agentName?.trim() || !Number.isFinite(markupValue) || markupValue < 0) {
      throw new BadRequestException('代理名称和加价金额不能为空');
    }
    const rule: AgentMarkupSummary = {
      ...normalized,
      id: `markup-${this.agentMarkupRules.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.agentMarkupRules.unshift(rule);
    this.audit('pricing.markup.create', rule.id, principal, null, rule);
    return { ...rule };
  }

  async updateAgentMarkupRule(principal: Principal, id: string, input: AgentMarkupUpdateInput): Promise<AgentMarkupSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以修改代理加价规则');
    const rule = this.agentMarkupRules.find((item) => item.id === id);
    if (!rule) {
      throw new NotFoundException('代理加价规则不存在');
    }
    const before = { ...rule };
    const normalized = normalizeAgentMarkupInput({ ...rule, ...input });
    validateAgentMarkupRule(normalized, this.priceBookRows, this.agentMarkupRules, id);
    if (input.agentName !== undefined) {
      rule.agentName = normalized.agentName;
    }
    if (input.channelName !== undefined) {
      rule.channelName = normalized.channelName;
    }
    if (input.realChannelName !== undefined) {
      rule.realChannelName = normalized.realChannelName;
    }
    if (input.destinationCountry !== undefined) {
      rule.destinationCountry = normalized.destinationCountry;
    }
    if (input.markupPerKg !== undefined || input.markupValue !== undefined || input.markupType !== undefined) {
      rule.markupType = normalized.markupType;
      rule.markupValue = normalized.markupValue;
      rule.markupPerKg = normalized.markupPerKg;
    }
    if (input.priority !== undefined) {
      rule.priority = normalized.priority;
    }
    if (input.enabled !== undefined) {
      rule.enabled = input.enabled;
    }
    rule.updatedAt = new Date().toISOString();
    this.audit('pricing.markup.update', id, principal, before, rule);
    return { ...rule };
  }

  async deleteAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以删除代理加价规则');
    const index = this.agentMarkupRules.findIndex((item) => item.id === id && !item.deletedAt);
    if (index === -1) {
      throw new NotFoundException('代理加价规则不存在');
    }
    const rule = this.agentMarkupRules[index];
    const before = { ...rule };
    rule.enabled = false;
    rule.deletedAt = new Date().toISOString();
    rule.updatedAt = rule.deletedAt;
    this.audit('pricing.markup_rule.delete', id, principal, before, rule);
    return { ...rule };
  }

  async getPriceBooks(principal: Principal): Promise<PriceBooksResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表明细');
    const activeBooks = this.priceBooks.filter((book) => !book.deleted);
    const activeBookIds = new Set(activeBooks.map((book) => book.id));
    return {
      books: activeBooks.map((book) => this.toPriceBookSummary(book)),
      rows: this.priceBookRows.filter((row) => activeBookIds.has(row.priceBookId)).map((row) => ({ ...row }))
    };
  }

  async importPriceBook(principal: Principal, input: PriceBookImportInput): Promise<{ book: PriceBookSummary; rows: PriceBookRowSummary[] }> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导入价格表');
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
    const legacyModuleCounts = buildInMemoryLegacyModuleCounts(rows);
    this.priceBooks.unshift(book);
    this.priceBookRows.unshift(...rows);
    this.audit('pricing.price_book.import', book.id, principal, null, { book, rowCount: rows.length, legacyModuleCounts });
    return { book: { ...book, legacyModuleCounts }, rows: rows.map((row) => ({ ...row })) };
  }

  async updatePriceBookRemark(principal: Principal, id: string, input: PriceBookRemarkUpdateInput): Promise<PriceBookSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护价格表备注');
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
    this.ensurePricingManager(principal, '只有管理员或市场可以删除价格表');
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
      currency: input.currency.trim().toUpperCase() || 'RMB',
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

  async getWarehouseTodayReceipts(principal: Principal, query: WarehouseTodayQuery): Promise<WarehouseTodayResponse> {
    if (!(await this.hasPermission(principal.role, 'warehouse:read'))) {
      throw new ForbiddenException('当前角色不能查看今日收货');
    }
    const { start, end } = resolveMemoryWarehouseTodayRange(query);
    const scope = this.operatorCustomerScope(principal);
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const rows = this.warehousePackages.filter((pkg) => {
      const scanTime = pkg.scanTime ? new Date(pkg.scanTime) : new Date(pkg.createdAt);
      return scanTime >= start
        && scanTime < end
        && (!query.site?.trim() || scope || pkg.site === query.site.trim())
        && keyword(pkg.customerOrderNo, query.customerOrderNo)
        && keyword(pkg.domesticTrackingNo, query.domesticTrackingNo)
        && keyword(pkg.combinedOrderNo, query.combinedOrderNo)
        && (!scope || scope.includes(pkg.salesperson ?? ''));
    });
    const grouped = new Map<string, WarehousePackageSummary[]>();
    rows.forEach((row) => {
      grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]);
    });
    const waitingDispatchTickets = this.shipments.filter((shipment) =>
      shipment.status === 'WAITING_DISPATCH' && (!scope || scope.includes(shipment.salesperson ?? ''))
    ).length;
    const visibleRows = scope
      ? rows.map(({ site: _site, ...row }) => row)
      : rows;
    const response = {
      totals: {
        receiptTickets: grouped.size,
        totalPackages: rows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: roundMoney(rows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0)),
        totalCbm: roundMoney(rows.reduce((sum, row) => sum + row.cbm, 0)),
        waitingDispatchTickets,
        pendingTallyTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length,
        exceptionTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length
      },
      rows: visibleRows.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }))
    };
    this.audit('warehouse.today_receipts.view', 'warehouse:today-receipts', principal, null, { query, rowCount: response.rows.length });
    return response;
  }

  async getWarehouseInStock(principal: Principal, query: WarehouseInStockQuery): Promise<WarehouseInStockResponse> {
    if (!(await this.hasPermission(principal.role, 'warehouse:read'))) {
      throw new ForbiddenException('当前角色不能查看在仓数据');
    }
    const scope = this.operatorCustomerScope(principal);
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const operationIds = query.operationKeyword?.trim()
      ? new Set(this.auditLogs
        .filter((row) => row.action.startsWith('warehouse.')
          && `${row.action} ${row.target} ${JSON.stringify(row.before ?? '')} ${JSON.stringify(row.after ?? '')}`.toLowerCase().includes(query.operationKeyword!.trim().toLowerCase()))
        .map((row) => row.target))
      : null;
    const rows = this.warehousePackages.filter((pkg) =>
      !['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'].includes(pkg.status)
      && (!query.site?.trim() || scope || pkg.site === query.site.trim())
      && keyword(pkg.customerOrderNo, query.customerOrderNo)
      && keyword(pkg.domesticTrackingNo, query.domesticTrackingNo)
      && keyword(pkg.combinedOrderNo, query.combinedOrderNo)
      && (!operationIds || operationIds.has(pkg.id))
      && (!scope || scope.includes(pkg.salesperson ?? ''))
    );
    const grouped = new Map<string, WarehousePackageSummary[]>();
    rows.forEach((row) => {
      grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]);
    });
    const waitingDispatchTickets = this.shipments.filter((shipment) =>
      shipment.status === 'WAITING_DISPATCH' && (!scope || scope.includes(shipment.salesperson ?? ''))
    ).length;
    const visibleRows = scope
      ? rows.map(({ site: _site, ...row }) => row)
      : rows;
    const response = {
      totals: {
        receiptTickets: grouped.size,
        totalPackages: rows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: roundMoney(rows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0)),
        totalCbm: roundMoney(rows.reduce((sum, row) => sum + row.cbm, 0)),
        waitingDispatchTickets,
        pendingTallyTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length,
        exceptionTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length
      },
      rows: visibleRows.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }))
    };
    this.audit('warehouse.in_stock.view', 'warehouse:in-stock', principal, null, { query, rowCount: response.rows.length });
    return response;
  }

  async getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]> {
    return summarizeWarehousePackageGroups(await this.getWarehousePackages(principal));
  }

  async createWarehousePackage(principal: Principal, input: WarehousePackageCreateInput): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const pkg = buildWarehousePackageSummary(`wh-${Date.now()}-${this.warehousePackages.length + 1}`, input);
    Object.assign(pkg, this.resolveWarehousePackageOwner(pkg.customerCode));
    pkg.createdBy = principal.username;
    this.warehousePackages.unshift(pkg);
    this.audit('warehouse.package.create', pkg.id, principal, null, pkg);
    return { ...pkg, exceptions: [...pkg.exceptions] };
  }

  async splitWarehousePackage(principal: Principal, id: string, input: WarehousePackageSplitInput): Promise<WarehousePackageSplitResponse> {
    this.ensureWarehouseAccess(principal);
    const sourceIndex = this.warehousePackages.findIndex((pkg) => pkg.id === id);
    if (sourceIndex < 0) {
      throw new NotFoundException('仓库包裹不存在');
    }
    const pieces = Array.isArray(input.pieces)
      ? input.pieces.map((piece) => Math.floor(Number(piece))).filter((piece) => Number.isFinite(piece) && piece > 0)
      : [];
    const splitCount = pieces.length || Math.floor(Number(input.splitCount));
    if (!Number.isFinite(splitCount) || splitCount < 2) {
      throw new BadRequestException('拆分箱数至少为 2');
    }
    const splitPieces = pieces.length ? pieces : Array.from({ length: splitCount }, () => 1);
    const source = { ...this.warehousePackages[sourceIndex], status: 'CONSOLIDATED' as const };
    const pieceTotal = splitPieces.reduce((sum, piece) => sum + piece, 0);
    if (pieces.length && pieceTotal !== source.packageCount) {
      throw new BadRequestException('拆分件数合计必须等于原包裹件数');
    }
    this.warehousePackages[sourceIndex] = source;
    const rootCombinedOrderNo = source.sourcePackageNo || source.combinedOrderNo;
    let nextSplitNo = nextWarehouseSplitSequence(rootCombinedOrderNo, this.warehousePackages.map((pkg) => pkg.combinedOrderNo));
    const created = splitPieces.map((pieceCount, index) => {
      const ratio = pieceCount / pieceTotal;
      const splitNo = nextSplitNo++;
      const child: WarehousePackageSummary = {
        ...source,
        id: `wh-split-${Date.now()}-${index + 1}`,
        combinedOrderNo: `${rootCombinedOrderNo}-${splitNo}`,
        labelNo: createWarehouseInboundLabelNo(source.customerCode, source.domesticTrackingNo, splitNo, splitCount),
        sourcePackageId: source.id,
        sourcePackageNo: rootCombinedOrderNo,
        expectedTotalPackageCount: splitCount,
        packageIndex: index + 1,
        packageCount: pieces.length ? pieceCount : 1,
        weightKg: roundMoney(source.weightKg * ratio),
        cbm: roundMoney(source.cbm * ratio),
        volumetricWeightKg: roundMoney(source.volumetricWeightKg * ratio),
        volumetricWeightKg5000: roundMoney((source.lengthCm * source.widthCm * source.heightCm * (pieces.length ? pieceCount : 1)) / 5000),
        chargeableWeightKg: roundMoney(source.chargeableWeightKg * ratio),
        remark: input.remark?.trim() || source.remark,
        receiptSourceId: source.receiptSourceId ?? source.id,
        tallyStatus: '待理货',
        splitStatus: '拆票子票',
        consolidationStatus: '未合票',
        outboundStatus: '未出库',
        status: 'RECEIVED',
        exceptions: [],
        createdBy: principal.username,
        createdAt: new Date().toISOString()
      };
      return child;
    });
    this.warehousePackages.unshift(...created);
    this.audit('warehouse.package.split', id, principal, { source }, {
      sourcePackageId: source.id,
      sourcePackageNo: source.combinedOrderNo,
      splitCount,
      pieces: pieces.length ? pieces : undefined,
      before: warehousePackageSplitTotals([source]),
      after: warehousePackageSplitTotals(created),
      children: created.map((pkg) => ({
        id: pkg.id,
        combinedOrderNo: pkg.combinedOrderNo,
        sourcePackageId: pkg.sourcePackageId,
        packageCount: pkg.packageCount,
        weightKg: pkg.weightKg,
        cbm: pkg.cbm,
        volumetricWeightKg: pkg.volumetricWeightKg,
        volumetricWeightKg5000: pkg.volumetricWeightKg5000
      })),
      packageIds: created.map((pkg) => pkg.id)
    });
    return {
      sourcePackage: { ...source, exceptions: [...source.exceptions] },
      packages: created.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }))
    };
  }

  async updateWarehousePackageRemark(principal: Principal, id: string, input: { remark?: string }): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const index = this.warehousePackages.findIndex((pkg) => pkg.id === id);
    if (index < 0) {
      throw new NotFoundException('仓库包裹不存在');
    }
    const before = this.warehousePackages[index];
    const updated: WarehousePackageSummary = {
      ...before,
      remark: input.remark?.trim() || undefined
    };
    this.warehousePackages[index] = updated;
    this.audit('warehouse.package.remark.update', id, principal, { remark: before.remark }, { remark: updated.remark });
    return { ...updated, exceptions: [...updated.exceptions] };
  }

  async updateWarehousePackage(principal: Principal, id: string, input: WarehousePackageUpdateInput): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const index = this.warehousePackages.findIndex((pkg) => pkg.id === id);
    if (index < 0) {
      throw new NotFoundException('仓库包裹不存在');
    }
    const before = this.warehousePackages[index];
    const packageCount = input.packageCount === undefined ? before.packageCount : Math.max(1, Math.floor(Number(input.packageCount) || 1));
    const weightKg = input.weightKg === undefined ? before.weightKg : roundMoney(Number(input.weightKg) || 0);
    const lengthCm = input.lengthCm === undefined ? before.lengthCm : roundMoney(Number(input.lengthCm) || 0);
    const widthCm = input.widthCm === undefined ? before.widthCm : roundMoney(Number(input.widthCm) || 0);
    const heightCm = input.heightCm === undefined ? before.heightCm : roundMoney(Number(input.heightCm) || 0);
    const cbm = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 1000000);
    const volumetricWeightKg = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 6000);
    const volumetricWeightKg5000 = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 5000);
    const updated: WarehousePackageSummary = {
      ...before,
      packageCount,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      girthCm: calculateMemoryWarehouseGirth(lengthCm, widthCm, heightCm),
      cbm,
      totalCbm: cbm,
      volumetricWeightKg,
      volumetricWeightKg5000,
      totalVolumetricWeightKg: volumetricWeightKg,
      totalVolumetricWeightKg5000: volumetricWeightKg5000,
      chargeableWeightKg: roundMoney(Math.max(weightKg, volumetricWeightKg)),
      scanTime: input.scanTime ?? before.scanTime,
      remark: input.remark === undefined ? before.remark : input.remark.trim() || undefined,
      manualException: input.manualException === undefined ? before.manualException : input.manualException.trim() || undefined
    };
    this.warehousePackages[index] = updated;
    this.audit('warehouse.package.update', id, principal, {
      packageCount: before.packageCount,
      weightKg: before.weightKg,
      lengthCm: before.lengthCm,
      widthCm: before.widthCm,
      heightCm: before.heightCm,
      scanTime: before.scanTime,
      remark: before.remark,
      manualException: before.manualException
    }, {
      packageCount: updated.packageCount,
      weightKg: updated.weightKg,
      lengthCm: updated.lengthCm,
      widthCm: updated.widthCm,
      heightCm: updated.heightCm,
      scanTime: updated.scanTime,
      remark: updated.remark,
      manualException: updated.manualException
    });
    return { ...updated, exceptions: [...updated.exceptions] };
  }

  async updateWarehousePackageException(principal: Principal, id: string, input: { manualException?: string }): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const index = this.warehousePackages.findIndex((pkg) => pkg.id === id);
    if (index < 0) {
      throw new NotFoundException('仓库包裹不存在');
    }
    const before = this.warehousePackages[index];
    const updated: WarehousePackageSummary = {
      ...before,
      manualException: input.manualException?.trim() || undefined
    };
    this.warehousePackages[index] = updated;
    this.audit('warehouse.package.exception.update', id, principal, { manualException: before.manualException }, { manualException: updated.manualException });
    return { ...updated, exceptions: [...updated.exceptions] };
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
      totalActualWeightKg: roundMoney(selected.reduce((total, pkg) => total + warehousePackageActualWeightTotal(pkg), 0)),
      totalVolumetricWeightKg: roundMoney(selected.reduce((total, pkg) => total + pkg.volumetricWeightKg, 0)),
      totalChargeableWeightKg: roundMoney(selected.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0)),
      createdAt: new Date().toISOString()
    };
    this.warehouseConsolidations.unshift(consolidation);
    selected.forEach((pkg) => {
      pkg.status = 'CONSOLIDATED';
    });
    this.audit('warehouse.consolidation.create', consolidation.id, principal, null, {
      ...consolidation,
      customerCode: selected[0]?.customerCode,
      sourcePackages: selected.map((pkg) => ({
        id: pkg.id,
        combinedOrderNo: pkg.combinedOrderNo,
        sourcePackageId: pkg.sourcePackageId,
        packageCount: pkg.packageCount,
        weightKg: pkg.weightKg,
        cbm: pkg.cbm
      })),
      tallyRequirement: input.tallyRequirement?.trim() || undefined
    });
    this.audit('warehouse.tally.start', consolidation.id, principal, null, {
      consolidationNo,
      mode: input.mode,
      packageIds: input.packageIds,
      tallyRequirement: input.tallyRequirement?.trim() || undefined
    });
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
    packages.forEach((pkg) => {
      pkg.shipmentId = shipment.id;
      pkg.systemOrderNo = shipment.systemOrderNo;
    });
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

  async getWarehouseTallyTasks(principal: Principal, query: WarehouseTallyTaskListQuery = {}): Promise<WarehouseTallyTaskSummary[]> {
    if (!(await this.hasPermission(principal.role, 'warehouse:read'))) {
      throw new ForbiddenException('当前角色不能查看理货任务');
    }
    const scope = this.operatorCustomerScope(principal);
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    return this.warehouseTallyTasks
      .filter((task) =>
        (!query.status || task.status === query.status)
        && keyword(task.customerCode, query.customerCode)
        && keyword(task.sourceCombinedOrderNo, query.combinedOrderNo)
        && matchesMemoryWarehouseTallyScope(task, query)
        && (!scope || scope.includes(task.salesperson ?? ''))
      )
      .map(cloneWarehouseTallyTask);
  }

  async createWarehouseTallyTask(principal: Principal, input: WarehouseTallyTaskCreateInput): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const packageIds = Array.from(new Set((input.packageIds ?? []).map((id) => id.trim()).filter(Boolean)));
    if (!packageIds.length) {
      throw new BadRequestException('请先选择在仓包裹');
    }
    const tallyRequirement = input.tallyRequirement?.trim();
    if (!tallyRequirement) {
      throw new BadRequestException('请填写理货需求');
    }
    const selected = packageIds.map((id) => this.warehousePackages.find((pkg) => pkg.id === id));
    if (selected.some((pkg) => !pkg || ['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'].includes(pkg.status))) {
      throw new BadRequestException('部分包裹不存在、已合票或已出库，不能发起理货');
    }
    const packages = selected as WarehousePackageSummary[];
    const first = packages[0];
    const task: WarehouseTallyTaskSummary = {
      id: `wht-${this.warehouseTallyTasks.length + 1}`,
      taskNo: this.nextWarehouseTallyTaskNo(first.combinedOrderNo),
      status: 'PENDING',
      packageIds,
      sourcePackageId: first.id,
      sourceCombinedOrderNo: first.combinedOrderNo,
      customerCode: first.customerCode,
      customerName: first.customerName,
      salesperson: first.salesperson,
      packageCount: packages.reduce((sum, pkg) => sum + pkg.packageCount, 0),
      originalWeightKg: roundMoney(packages.reduce((sum, pkg) => sum + pkg.weightKg * pkg.packageCount, 0)),
      originalLengthCm: first.lengthCm,
      originalWidthCm: first.widthCm,
      originalHeightCm: first.heightCm,
      originalVolumetricWeightKg: roundMoney(packages.reduce((sum, pkg) => sum + (pkg.totalVolumetricWeightKg ?? pkg.volumetricWeightKg), 0)),
      originalVolumetricWeightKg5000: roundMoney(packages.reduce((sum, pkg) => sum + (pkg.totalVolumetricWeightKg5000 ?? pkg.volumetricWeightKg5000 ?? 0), 0)),
      tallyRequirement,
      remark: input.remark?.trim() || undefined,
      createdBy: principal.username,
      createdAt: new Date().toISOString(),
      labelStatus: 'NOT_GENERATED'
    };
    this.warehouseTallyTasks.unshift(task);
    this.audit('warehouse.tally.create', task.id, principal, null, task);
    return cloneWarehouseTallyTask(task);
  }

  async updateWarehouseTallyTask(principal: Principal, id: string, input: WarehouseTallyTaskUpdateInput): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const index = this.warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) {
      throw new NotFoundException('理货任务不存在');
    }
    const before = this.warehouseTallyTasks[index];
    if (before.status !== 'PENDING') {
      throw new BadRequestException('已完成理货不能修改需求');
    }
    const updated: WarehouseTallyTaskSummary = {
      ...before,
      tallyRequirement: input.tallyRequirement === undefined ? before.tallyRequirement : input.tallyRequirement.trim(),
      remark: input.remark === undefined ? before.remark : input.remark.trim() || undefined
    };
    this.warehouseTallyTasks[index] = updated;
    this.audit('warehouse.tally.update', id, principal, before, updated);
    return cloneWarehouseTallyTask(updated);
  }

  async completeWarehouseTallyTask(principal: Principal, id: string, input: WarehouseTallyTaskCompleteInput): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const index = this.warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) {
      throw new NotFoundException('理货任务不存在');
    }
    const before = this.warehouseTallyTasks[index];
    if (before.status !== 'PENDING') {
      throw new BadRequestException('理货任务已完成');
    }
    const packageCount = Math.max(1, Math.floor(Number(input.packageCount) || 1));
    const weightKg = roundMoney(Number(input.weightKg) || 0);
    const lengthCm = roundMoney(Number(input.lengthCm) || 0);
    const widthCm = roundMoney(Number(input.widthCm) || 0);
    const heightCm = roundMoney(Number(input.heightCm) || 0);
    const updated: WarehouseTallyTaskSummary = {
      ...before,
      status: 'COMPLETED',
      completedPackageCount: packageCount,
      completedWeightKg: weightKg,
      completedLengthCm: lengthCm,
      completedWidthCm: widthCm,
      completedHeightCm: heightCm,
      completedVolumetricWeightKg: roundMoney((lengthCm * widthCm * heightCm * packageCount) / 6000),
      completedVolumetricWeightKg5000: roundMoney((lengthCm * widthCm * heightCm * packageCount) / 5000),
      completedBy: principal.username,
      completedAt: new Date().toISOString(),
      remark: input.remark?.trim() || before.remark
    };
    this.warehouseTallyTasks[index] = updated;
    this.audit('warehouse.tally.complete', id, principal, before, updated);
    return cloneWarehouseTallyTask(updated);
  }

  async generateWarehouseTallyTaskLabel(principal: Principal, id: string): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const index = this.warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) {
      throw new NotFoundException('理货任务不存在');
    }
    const before = this.warehouseTallyTasks[index];
    if (before.status !== 'COMPLETED') {
      throw new BadRequestException('请先完成理货再生成标签');
    }
    const labelNo = before.labelNo ?? `${before.taskNo}-LBL`;
    const labelQrContent = buildWarehouseTallyLabelQrContent(before, labelNo);
    const updated: WarehouseTallyTaskSummary = {
      ...before,
      labelStatus: 'GENERATED',
      labelNo,
      labelQrContent,
      labelGeneratedAt: new Date().toISOString(),
      labelGeneratedBy: principal.username
    };
    this.warehouseTallyTasks[index] = updated;
    this.audit(before.labelNo ? 'warehouse.tally.label.reprint' : 'warehouse.tally.label.generate', labelNo, principal, before, updated);
    return cloneWarehouseTallyTask(updated);
  }

  async printWarehouseTallyTaskLabel(principal: Principal, id: string): Promise<WarehouseTallyTaskSummary> {
    return this.markWarehouseTallyTaskLabelOutput(principal, id, 'print');
  }

  async downloadWarehouseTallyTaskLabel(principal: Principal, id: string): Promise<WarehouseTallyTaskSummary> {
    return this.markWarehouseTallyTaskLabelOutput(principal, id, 'download');
  }

  async applyWarehouseTallyTaskLabel(principal: Principal, input: WarehouseTallyLabelScanInput): Promise<WarehouseTallyLabelScanResponse> {
    this.ensureWarehouseAccess(principal);
    const labelNo = input.labelNo?.trim();
    if (!labelNo) {
      throw new BadRequestException('请扫描或填写理货标签号');
    }
    const taskIndex = this.warehouseTallyTasks.findIndex((task) => task.labelNo === labelNo);
    if (taskIndex < 0) {
      throw new NotFoundException('理货标签不存在');
    }
    const beforeTask = this.warehouseTallyTasks[taskIndex];
    if (beforeTask.status !== 'COMPLETED' || beforeTask.labelStatus !== 'GENERATED') {
      throw new BadRequestException('请先完成理货并生成标签');
    }
    if (beforeTask.appliedPackageId) {
      const applied = this.warehousePackages.find((pkg) => pkg.id === beforeTask.appliedPackageId);
      if (applied) {
        return { task: cloneWarehouseTallyTask(beforeTask), package: { ...applied, exceptions: [...applied.exceptions] }, alreadyApplied: true };
      }
    }
    const sourcePackages = this.warehousePackages.filter((pkg) =>
      (beforeTask.packageIds.length ? beforeTask.packageIds : [beforeTask.sourcePackageId]).includes(pkg.id)
    );
    const source = sourcePackages.find((pkg) => pkg.id === beforeTask.sourcePackageId) ?? sourcePackages[0];
    if (!source) {
      throw new BadRequestException('理货来源包裹不存在');
    }
    const now = new Date().toISOString();
    const completedPackageCount = Math.max(1, beforeTask.completedPackageCount ?? beforeTask.packageCount);
    const completedWeightKg = beforeTask.completedWeightKg ?? beforeTask.originalWeightKg;
    const lengthCm = beforeTask.completedLengthCm ?? beforeTask.originalLengthCm;
    const widthCm = beforeTask.completedWidthCm ?? beforeTask.originalWidthCm;
    const heightCm = beforeTask.completedHeightCm ?? beforeTask.originalHeightCm;
    const singleWeightKg = roundWarehouseMeasure(completedWeightKg / completedPackageCount);
    const singleCbm = roundWarehouseMeasure((lengthCm * widthCm * heightCm) / 1000000);
    const singleVolumetricWeightKg = roundWarehouseMeasure((lengthCm * widthCm * heightCm) / 6000);
    const newPackage: WarehousePackageSummary = {
      ...source,
      id: `wh-tally-${Date.now()}-${this.warehousePackages.length + 1}`,
      labelNo: beforeTask.labelNo,
      sourcePackageId: source.id,
      sourcePackageNo: source.combinedOrderNo,
      tallyTaskId: beforeTask.id,
      tallyTaskNo: beforeTask.taskNo,
      receivingChannel: '理货后标签扫描',
      expectedTotalPackageCount: completedPackageCount,
      packageIndex: 1,
      packageCount: completedPackageCount,
      weightKg: singleWeightKg,
      lengthCm,
      widthCm,
      heightCm,
      girthCm: calculateMemoryWarehouseGirth(lengthCm, widthCm, heightCm),
      cbm: singleCbm,
      totalCbm: roundWarehouseMeasure(singleCbm * completedPackageCount),
      volumetricWeightKg: singleVolumetricWeightKg,
      volumetricWeightKg5000: roundWarehouseMeasure((lengthCm * widthCm * heightCm) / 5000),
      totalVolumetricWeightKg: roundWarehouseMeasure(singleVolumetricWeightKg * completedPackageCount),
      totalVolumetricWeightKg5000: roundWarehouseMeasure((lengthCm * widthCm * heightCm * completedPackageCount) / 5000),
      chargeableWeightKg: roundWarehouseMeasure(Math.max(singleWeightKg, singleVolumetricWeightKg)),
      scanTime: now,
      inboundAt: now,
      receiptSourceId: source.receiptSourceId ?? source.id,
      remark: beforeTask.remark ?? source.remark,
      scanSource: '理货后标签扫描',
      tallyStatus: '已理货',
      splitStatus: source.sourcePackageId ? '拆票子票' : '原始票',
      consolidationStatus: '未合票',
      outboundStatus: '未出库',
      status: 'RECEIVED',
      createdBy: principal.username,
      createdAt: now,
      exceptions: [...source.exceptions]
    };
    this.warehousePackages.unshift(newPackage);
    const archivedIds = new Set(sourcePackages.map((pkg) => pkg.id));
    this.warehousePackages.forEach((pkg, index) => {
      if (archivedIds.has(pkg.id)) {
        this.warehousePackages[index] = {
          ...pkg,
          status: 'TALLIED_ARCHIVED',
          archivedByPackageId: newPackage.id,
          archivedByPackageNo: newPackage.combinedOrderNo,
          archivedReason: '理货后标签扫描覆盖',
          archivedAt: now
        };
      }
    });
    const updatedTask: WarehouseTallyTaskSummary = {
      ...beforeTask,
      appliedPackageId: newPackage.id,
      appliedPackageNo: newPackage.combinedOrderNo,
      labelAppliedAt: now,
      labelAppliedBy: principal.username
    };
    this.warehouseTallyTasks[taskIndex] = updatedTask;
    this.audit('warehouse.tally.label.apply', labelNo, principal, {
      task: beforeTask,
      sourcePackages
    }, {
      task: updatedTask,
      package: newPackage,
      archivedPackageIds: Array.from(archivedIds)
    });
    return { task: cloneWarehouseTallyTask(updatedTask), package: { ...newPackage, exceptions: [...newPackage.exceptions] }, alreadyApplied: false };
  }

  private markWarehouseTallyTaskLabelOutput(principal: Principal, id: string, action: 'print' | 'download'): WarehouseTallyTaskSummary {
    this.ensureWarehouseAccess(principal);
    const index = this.warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) {
      throw new NotFoundException('理货任务不存在');
    }
    const before = this.warehouseTallyTasks[index];
    if (!before.labelNo || !before.labelQrContent || before.labelStatus !== 'GENERATED') {
      throw new BadRequestException('请先生成理货标签');
    }
    const now = new Date().toISOString();
    const updated: WarehouseTallyTaskSummary = action === 'print'
      ? { ...before, labelPrintedAt: now, labelPrintedBy: principal.username }
      : { ...before, labelDownloadedAt: now, labelDownloadedBy: principal.username };
    this.warehouseTallyTasks[index] = updated;
    this.audit(`warehouse.tally.label.${action}`, before.labelNo, principal, before, updated);
    return cloneWarehouseTallyTask(updated);
  }

  async getReceivables(principal: Principal): Promise<ReceivableFeeSummary[]> {
    return (await this.getReceivableAudits(principal)).rows;
  }

  async getReceivableAudits(principal: Principal, query: ReceivableAuditListQuery = {}): Promise<ReceivableAuditListResponse> {
    const systemRows = this.receivableFees
      .filter((fee) => principal.role !== 'CUSTOMER' || fee.customerId === principal.customerId)
      .map((fee) => this.toReceivableAuditSummary(fee));
    const manualRows = this.shipmentFinanceItems
      .filter((item) => item.type === 'RECEIVABLE')
      .map((item) => {
        const shipment = this.shipments.find((row) => row.id === item.shipmentId);
        return shipment ? this.toManualReceivableAuditSummary(item, shipment) : undefined;
      })
      .filter((row): row is ReceivableAuditSummary => Boolean(row))
      .filter((row) => principal.role !== 'CUSTOMER' || this.shipments.find((shipment) => shipment.id === row.shipmentId)?.customerId === principal.customerId);
    return this.buildReceivableAuditListResponse([...systemRows, ...manualRows], query);
  }

  async createReceivableAudit(principal: Principal, input: ReceivableAuditCreateInput): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const shipment = this.findShipmentForReceivableAudit(input);
    const item = await this.createShipmentFinanceItem(principal, shipment.id, {
      type: 'RECEIVABLE',
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      settlementMethod: input.settlementMethod ?? this.resolveReceivableSettlementMethod(shipment),
      paymentNo: input.paymentNo,
      remark: input.remark
    });
    const created = this.findReceivableFinanceItemById(item.id);
    return this.toManualReceivableAuditSummary(created, shipment);
  }

  async updateReceivableAudit(principal: Principal, id: string, input: ReceivableAuditUpdateInput): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const systemFee = this.receivableFees.find((fee) => fee.id === id);
    if (systemFee) {
      this.ensureReceivableAuditEditable(systemFee);
      const before = { ...systemFee };
      Object.assign(systemFee, {
        name: input.name ?? systemFee.name,
        amount: input.amount ?? systemFee.amount,
        currency: input.currency ?? systemFee.currency,
        settlementMethod: input.settlementMethod ?? systemFee.settlementMethod,
        paymentNo: input.paymentNo ?? systemFee.paymentNo,
        remark: input.remark ?? systemFee.remark
      });
      this.audit('finance.receivable.update', id, principal, before, systemFee);
      return this.toReceivableAuditSummary(systemFee);
    }
    const item = this.findReceivableFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    this.ensureReceivableAuditEditable(item);
    const before = { ...item };
    Object.assign(item, {
      name: input.name ?? item.name,
      amount: input.amount ?? item.amount,
      currency: input.currency ?? item.currency,
      settlementMethod: input.settlementMethod ?? item.settlementMethod ?? this.resolveReceivableSettlementMethod(shipment),
      paymentNo: input.paymentNo ?? item.paymentNo,
      remark: input.remark ?? item.remark,
      updatedAt: new Date().toISOString()
    });
    this.audit('finance.receivable.update', id, principal, before, item);
    return this.toManualReceivableAuditSummary(item, shipment);
  }

  async auditReceivableAudit(principal: Principal, id: string): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const systemFee = this.receivableFees.find((fee) => fee.id === id);
    const reviewedAt = new Date().toISOString();
    if (systemFee) {
      if (systemFee.voided) {
        throw new BadRequestException('已作废应收不能审核');
      }
      if ((systemFee.reconciliationStatus ?? 'PENDING') !== 'PENDING') {
        throw new BadRequestException('只有待审核应收可以审核');
      }
      const before = { ...systemFee };
      systemFee.reconciliationStatus = 'CONFIRMED';
      systemFee.reviewedBy = principal.username;
      systemFee.reviewedAt = reviewedAt;
      this.audit('finance.receivable.audit', id, principal, before, this.toReceivableReviewAuditSnapshot(systemFee, principal, before.reconciliationStatus, 'CONFIRMED', 'audit'));
      return this.toReceivableAuditSummary(systemFee);
    }
    const item = this.findReceivableFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    if (item.voided) {
      throw new BadRequestException('已作废应收不能审核');
    }
    if ((item.reconciliationStatus ?? 'PENDING') !== 'PENDING') {
      throw new BadRequestException('只有待审核应收可以审核');
    }
    const before = { ...item };
    item.locked = true;
    item.reconciliationStatus = 'CONFIRMED';
    item.reviewedBy = principal.username;
    item.reviewedAt = reviewedAt;
    item.updatedAt = reviewedAt;
    this.audit('finance.receivable.audit', id, principal, before, this.toReceivableReviewAuditSnapshot(item, principal, before.reconciliationStatus, 'CONFIRMED', 'audit'));
    return this.toManualReceivableAuditSummary(item, shipment);
  }

  async reverseAuditReceivableAudit(principal: Principal, id: string): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const systemFee = this.receivableFees.find((fee) => fee.id === id);
    if (systemFee) {
      if ((systemFee.reconciliationStatus ?? 'PENDING') !== 'CONFIRMED') {
        throw new BadRequestException('只有已审核应收可以反审核');
      }
      const before = { ...systemFee };
      systemFee.reconciliationStatus = 'PENDING';
      systemFee.reviewedBy = undefined;
      systemFee.reviewedAt = undefined;
      this.audit('finance.receivable.reverse_audit', id, principal, before, this.toReceivableReviewAuditSnapshot(systemFee, principal, before.reconciliationStatus, 'PENDING', 'reverse'));
      return this.toReceivableAuditSummary(systemFee);
    }
    const item = this.findReceivableFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    if ((item.reconciliationStatus ?? 'PENDING') !== 'CONFIRMED') {
      throw new BadRequestException('只有已审核应收可以反审核');
    }
    if ((item.receivedAmount ?? 0) > 0 || (item.receiptStatus && item.receiptStatus !== 'UNPAID') || this.waterReceipts.some((receipt) => receipt.matches.some((match) => match.receivableFinanceItemId === id && !match.voided))) {
      throw new BadRequestException('该应收已匹配水单，请先在收款管理撤销匹配后再反审核');
    }
    const before = { ...item };
    item.locked = false;
    item.reconciliationStatus = 'PENDING';
    item.reviewedBy = undefined;
    item.reviewedAt = undefined;
    item.updatedAt = new Date().toISOString();
    this.audit('finance.receivable.reverse_audit', id, principal, before, this.toReceivableReviewAuditSnapshot(item, principal, before.reconciliationStatus, 'PENDING', 'reverse'));
    return this.toManualReceivableAuditSummary(item, shipment);
  }

  async deleteReceivableAudit(principal: Principal, id: string): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const systemFee = this.receivableFees.find((fee) => fee.id === id);
    if (systemFee) {
      this.ensureReceivableAuditEditable(systemFee);
      const before = { ...systemFee };
      systemFee.voided = true;
      systemFee.reconciliationStatus = 'VOIDED';
      systemFee.voidedAt = new Date().toISOString();
      this.audit('finance.receivable.void', id, principal, before, systemFee);
      return this.toReceivableAuditSummary(systemFee);
    }
    const item = this.findReceivableFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    this.ensureReceivableAuditEditable(item);
    const before = { ...item };
    item.voided = true;
    item.reconciliationStatus = 'VOIDED';
    item.voidedAt = new Date().toISOString();
    item.updatedAt = item.voidedAt;
    this.audit('finance.receivable.void', id, principal, before, item);
    return this.toManualReceivableAuditSummary(item, shipment);
  }

  async batchAuditReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    const result = await this.runReceivableBatch(input.ids, (id) => this.auditReceivableAudit(principal, id));
    this.audit('finance.receivable.batch_audit', input.ids.join(','), principal, null, result);
    return result;
  }

  async batchReverseAuditReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    const result = await this.runReceivableBatch(input.ids, (id) => this.reverseAuditReceivableAudit(principal, id));
    this.audit('finance.receivable.batch_reverse_audit', input.ids.join(','), principal, null, result);
    return result;
  }

  async batchVoidReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    const result = await this.runReceivableBatch(input.ids, (id) => this.deleteReceivableAudit(principal, id));
    this.audit('finance.receivable.batch_void', input.ids.join(','), principal, null, result);
    return result;
  }

  async matchReceivableReceipt(principal: Principal, id: string, input: ReceivableReceiptMatchInput): Promise<ReceivableAuditSummary> {
    const item = this.findReceivableFinanceItemById(id);
    const receipt = this.waterReceipts.find((row) => row.id === input.ledgerId || row.receiptNo === input.ledgerId || row.accountLedgerId === input.ledgerId);
    if (!receipt) throw new BadRequestException('水单不存在');
    await this.matchWaterReceiptOrders(principal, receipt.id, { matches: [{ receivableFinanceItemId: item.id, amount: Number(input.amount ?? item.amount) }] });
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) throw new NotFoundException('运单不存在');
    return this.decorateReceivableRows([this.toManualReceivableAuditSummary(item, shipment)])[0];
  }

  async getWaterReceipts(principal: Principal, query: WaterReceiptListQuery = {}): Promise<WaterReceiptListResponse> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
    const canViewAll = await this.hasPermission(principal.role, 'finance:water-receipt:view-all');
    const rows = this.waterReceipts.filter((row) => {
      if (!(canViewAll || principal.role === 'ADMIN' || ['FINANCE', 'UG_FINANCE'].includes(principal.role)) && row.salesperson !== principal.username) return false;
      if (query.status && query.status !== 'ALL') return row.status === query.status;
      return query.includeArchived || !['ARCHIVED', 'VOIDED'].includes(row.status);
    });
    return this.buildWaterReceiptListResponse(rows, query);
  }

  async createWaterReceipt(principal: Principal, input: WaterReceiptCreateInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:manage');
    const customer = this.findCustomerForWaterReceipt(input.customerId, input.customerCode);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('水单金额必须大于 0');
    const now = new Date().toISOString();
    const receiptDate = input.receiptDate ? new Date(input.receiptDate).toISOString() : now;
    const row: StoredWaterReceipt = {
      id: `wr-${this.waterReceipts.length + 1}`,
      receiptNo: this.nextMemoryWaterReceiptNo(receiptDate),
      site: input.site?.trim() || '思远收款',
      customerId: customer?.id,
      customerCode: customer?.code ?? input.customerCode,
      customerName: customer ? `${customer.code}-${customer.name}` : undefined,
      salesperson: customer?.salesperson,
      receiptMethod: input.receiptMethod ?? '账户收款',
      receiptDate,
      currency: input.currency ?? 'RMB',
      amount,
      matchedAmount: 0,
      balance: amount,
      paymentNo: input.paymentNo,
      status: 'PENDING',
      remark: input.remark,
      matches: [],
      createdAt: now,
      updatedAt: now
    };
    this.waterReceipts.unshift(row);
    this.audit('finance.water_receipt.create', row.id, principal, null, row);
    return row;
  }

  async updateWaterReceipt(principal: Principal, id: string, input: WaterReceiptUpdateInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:manage');
    const row = this.findWaterReceiptById(id);
    const before = { ...row };
    if (row.status !== 'PENDING' && input.amount !== undefined) {
      await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:adjust');
      if (!input.adjustReason?.trim()) throw new BadRequestException('修改已到账金额必须填写原因');
    }
    if (row.status !== 'PENDING' && (input.customerId || input.customerCode || input.receiptMethod || input.receiptDate || input.currency)) {
      throw new BadRequestException('已到账水单只能调整金额、付款编号或备注');
    }
    const customer = input.customerId || input.customerCode ? this.findCustomerForWaterReceipt(input.customerId, input.customerCode) : undefined;
    if (customer) {
      row.customerId = customer.id;
      row.customerCode = customer.code;
      row.customerName = `${customer.code}-${customer.name}`;
      row.salesperson = customer.salesperson;
    }
    if (input.amount !== undefined) {
      const amount = Number(input.amount);
      if (amount < row.matchedAmount) throw new BadRequestException('水单金额不能小于已匹配金额');
      row.amount = amount;
      row.balance = roundMoney(amount - row.matchedAmount);
    }
    if (input.site !== undefined) row.site = input.site || '思远收款';
    if (input.receiptMethod !== undefined) row.receiptMethod = input.receiptMethod;
    if (input.currency !== undefined) row.currency = input.currency;
    if (input.receiptDate) row.receiptDate = new Date(input.receiptDate).toISOString();
    if (input.paymentNo !== undefined) row.paymentNo = input.paymentNo;
    if (input.remark !== undefined) row.remark = input.remark;
    row.updatedAt = new Date().toISOString();
    this.audit('finance.water_receipt.update', row.id, principal, before, row);
    return row;
  }

  async markWaterReceiptArrived(principal: Principal, id: string, input: WaterReceiptMarkArrivedInput = {}): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:arrive');
    const row = this.findWaterReceiptById(id);
    if (row.status !== 'PENDING') throw new BadRequestException('只有未到账水单可以标记到账');
    if (!row.customerId) throw new BadRequestException('标记到账前必须选择客户编号');
    const before = { ...row };
    const account = this.customerAccounts.find((item) => item.customerId === row.customerId && item.currency === row.currency);
    const accountBalanceBefore = account?.balance ?? 0;
    const accountBalanceAfter = roundMoney(accountBalanceBefore + row.amount);
    if (account) account.balance = accountBalanceAfter;
    else this.customerAccounts.push({ customerId: row.customerId, customerName: row.customerName ?? row.customerId, balance: accountBalanceAfter, currency: row.currency });
    const ledger: StoredAccountLedger = { id: `al-wr-${this.accountLedger.length + 1}`, customerId: row.customerId, customerName: row.customerName ?? row.customerId, amount: row.amount, balance: row.balance, note: row.paymentNo ?? row.receiptMethod, createdAt: new Date().toISOString() };
    this.accountLedger.unshift(ledger);
    row.accountLedgerId = ledger.id;
    row.status = 'ARRIVED';
    row.arrivedAt = input.arrivedAt ?? new Date().toISOString();
    row.arrivedBy = principal.username;
    row.remark = input.note ?? row.remark;
    this.audit('finance.water_receipt.arrive', row.id, principal, before, {
      ...row,
      arrivedAmount: row.amount,
      accountBalanceBefore,
      accountBalanceAfter,
      customerAccountBalance: accountBalanceAfter
    });
    this.audit('notification.wecom.water_receipt_arrived.pending', row.id, principal, null, { customerCode: row.customerCode, amount: row.amount, balance: row.balance });
    return row;
  }

  async getWaterReceiptMatchableReceivables(principal: Principal, id: string): Promise<ReceivableAuditSummary[]> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
    const receipt = this.findWaterReceiptById(id);
    if (!receipt.customerId) return [];
    const rows = this.shipmentFinanceItems
      .filter((item) => item.type === 'RECEIVABLE' && !item.voided && item.reconciliationStatus === 'CONFIRMED' && (item.receiptStatus ?? 'UNPAID') !== 'RECEIVED')
      .map((item) => ({ item, shipment: this.shipments.find((shipment) => shipment.id === item.shipmentId) }))
      .filter((row): row is { item: StoredShipmentFinanceItem; shipment: Shipment & { customerId: string } } => {
        const shipment = row.shipment;
        if (!shipment) return false;
        return shipment.customerId === receipt.customerId;
      })
      .filter((row) => (row.item.receivedAmount ?? 0) < row.item.amount)
      .map((row) => this.toManualReceivableAuditSummary(row.item, row.shipment));
    return this.decorateReceivableRows(rows);
  }

  async matchWaterReceiptOrders(principal: Principal, id: string, input: WaterReceiptMatchOrdersInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:match');
    const receipt = this.findWaterReceiptById(id);
    if (!['ARRIVED', 'PARTIAL_MATCHED', 'MATCHED'].includes(receipt.status)) throw new BadRequestException('只有已到账水单可以匹配订单');
    const total = roundMoney((input.matches ?? []).reduce((sum, item) => sum + Number(item.amount), 0));
    if (total <= 0 || total > receipt.balance) throw new BadRequestException('匹配金额不能超过水单余额');
    const before = { ...receipt, matches: [...receipt.matches] };
    const matchedAt = new Date().toISOString();
    const account = this.customerAccounts.find((row) => row.customerId === receipt.customerId && row.currency === receipt.currency);
    const accountBalanceBefore = account?.balance ?? 0;
    for (const match of input.matches) {
      const item = this.findReceivableFinanceItemById(match.receivableFinanceItemId);
      const shipment = this.shipments.find((row) => row.id === item.shipmentId);
      if (!shipment || shipment.customerId !== receipt.customerId) throw new BadRequestException('只能匹配同客户编号下的应收');
      if (item.reconciliationStatus !== 'CONFIRMED' || item.voided) throw new BadRequestException('只能匹配已审核且未作废的应收');
      if ((item.currency ?? 'RMB') !== (receipt.currency ?? 'RMB')) throw new BadRequestException('水单币种与应收币种不一致');
      const amount = Number(match.amount);
      const unpaid = roundMoney(item.amount - (item.receivedAmount ?? 0));
      if (amount <= 0 || amount > unpaid) throw new BadRequestException('匹配金额不能超过订单未收金额');
      item.receivedAmount = roundMoney((item.receivedAmount ?? 0) + amount);
      item.receiptStatus = item.receivedAmount >= item.amount ? 'RECEIVED' : 'PARTIAL';
      item.receivedAt = item.receiptStatus === 'RECEIVED' ? new Date().toISOString() : item.receivedAt;
      item.paymentNo = receipt.receiptNo;
      receipt.matches.push({ id: `wrm-${receipt.matches.length + 1}`, waterReceiptId: receipt.id, receivableFinanceItemId: item.id, shipmentId: item.shipmentId, systemOrderNo: shipment.systemOrderNo, customerCode: receipt.customerCode ?? '', feeName: item.name, amount, createdAt: matchedAt });
    }
    receipt.matchedAmount = roundMoney(receipt.matchedAmount + total);
    receipt.balance = roundMoney(receipt.amount - receipt.matchedAmount);
    receipt.status = receipt.balance <= 0 ? 'ARCHIVED' : 'PARTIAL_MATCHED';
    if (receipt.status === 'ARCHIVED') receipt.archivedAt = new Date().toISOString();
    if (account) account.balance = roundMoney(account.balance - total);
    const accountBalanceAfter = account?.balance ?? 0;
    if (receipt.accountLedgerId) {
      const ledger = this.accountLedger.find((row) => row.id === receipt.accountLedgerId);
      if (ledger) ledger.balance = receipt.balance;
    }
    this.audit('finance.water_receipt.match', receipt.id, principal, before, {
      ...receipt,
      matchedBy: principal.username,
      matchedAt,
      matchedAmountDelta: total,
      receiptBalanceBefore: before.balance,
      receiptBalanceAfter: receipt.balance,
      accountBalanceBefore,
      accountBalanceAfter,
      customerAccountBalance: accountBalanceAfter
    });
    return receipt;
  }

  async unmatchWaterReceipt(principal: Principal, id: string, input: WaterReceiptUnmatchInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:match');
    const receipt = this.findWaterReceiptById(id);
    const matches = receipt.matches.filter((match) => input.matchIds.includes(match.id) && !match.voided);
    if (!matches.length) throw new BadRequestException('没有可撤销的匹配记录');
    const before = { ...receipt, matches: [...receipt.matches] };
    const amount = roundMoney(matches.reduce((sum, match) => sum + match.amount, 0));
    matches.forEach((match) => {
      match.voided = true;
      match.voidedAt = new Date().toISOString();
      const item = this.shipmentFinanceItems.find((row) => row.id === match.receivableFinanceItemId);
      if (item) {
        item.receivedAmount = Math.max(0, roundMoney((item.receivedAmount ?? 0) - match.amount));
        item.receiptStatus = item.receivedAmount <= 0 ? 'UNPAID' : 'PARTIAL';
      }
    });
    receipt.matchedAmount = Math.max(0, roundMoney(receipt.matchedAmount - amount));
    receipt.balance = roundMoney(receipt.amount - receipt.matchedAmount);
    receipt.status = receipt.matchedAmount <= 0 ? 'ARRIVED' : 'PARTIAL_MATCHED';
    receipt.archivedAt = undefined;
    const account = this.customerAccounts.find((row) => row.customerId === receipt.customerId && row.currency === receipt.currency);
    if (account) account.balance = roundMoney(account.balance + amount);
    if (receipt.accountLedgerId) {
      const ledger = this.accountLedger.find((row) => row.id === receipt.accountLedgerId);
      if (ledger) ledger.balance = receipt.balance;
    }
    this.audit('finance.water_receipt.unmatch', receipt.id, principal, before, receipt);
    return receipt;
  }

  async archiveWaterReceipt(principal: Principal, id: string): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:archive');
    const row = this.findWaterReceiptById(id);
    if (row.balance > 0) throw new BadRequestException('水单余额为 0 后才能归档');
    row.status = 'ARCHIVED';
    row.archivedAt = new Date().toISOString();
    this.audit('finance.water_receipt.archive', row.id, principal, null, row);
    return row;
  }

  async voidWaterReceipt(principal: Principal, id: string, input: { reason?: string } = {}): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:void');
    const row = this.findWaterReceiptById(id);
    if (row.matchedAmount > 0) throw new BadRequestException('已匹配水单需先撤销匹配后作废');
    row.status = 'VOIDED';
    row.voidedAt = new Date().toISOString();
    row.voidedReason = input.reason;
    this.audit('finance.water_receipt.void', row.id, principal, null, row);
    return row;
  }

  async uploadWaterReceiptVoucher(principal: Principal, id: string, input: WaterReceiptVoucherInput): Promise<WaterReceiptVoucherSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:voucher');
    const row = this.findWaterReceiptById(id);
    const voucher: WaterReceiptVoucherSummary = { id: `wrv-${this.waterReceipts.length + 1}`, waterReceiptId: row.id, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, url: input.url, uploadedBy: principal.username, createdAt: new Date().toISOString() };
    row.voucher = voucher;
    this.audit('finance.water_receipt.voucher', row.id, principal, null, voucher);
    return voucher;
  }

  async exportWaterReceipts(principal: Principal, input: WaterReceiptExportRequest): Promise<WaterReceiptExportResponse> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:export');
    const response = await this.getWaterReceipts(principal, { ...(input.query ?? {}), page: 1, pageSize: -1, includeArchived: true });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    this.audit('finance.water_receipt.export', input.ids?.join(',') ?? 'filtered', principal, null, { count: rows.length });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async exportReceivableAudits(principal: Principal, input: ReceivableAuditExportRequest): Promise<ReceivableAuditExportResponse> {
    const response = await this.getReceivableAudits(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    this.audit('finance.receivable.export', input.ids?.join(',') ?? 'filtered', principal, null, { count: rows.length });
    return {
      rows,
      exportedAt: new Date().toISOString()
    };
  }

  async getBusinessCostAudits(principal: Principal, query: BusinessCostAuditListQuery = {}): Promise<BusinessCostAuditListResponse> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:read');
    const canViewAll = await this.hasPermission(principal.role, 'finance:business-cost:view-all');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const rows = this.shipmentFinanceItems
      .filter((item) => item.type === 'BUSINESS_COST')
      .map((item) => {
        const shipment = this.shipments.find((row) => row.id === item.shipmentId);
        return shipment && shipment.businessReviewedAt && this.canAccessBusinessCostShipment(principal, shipment, canViewAll)
          ? this.toBusinessCostAuditSummary(item, shipment, { canViewAgent, canViewProfit })
          : undefined;
      })
      .filter((row): row is BusinessCostAuditSummary => Boolean(row));
    return this.buildBusinessCostAuditListResponse(rows, query);
  }

  async createBusinessCostAudit(principal: Principal, input: BusinessCostAuditCreateInput): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:manage');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const shipment = this.findShipmentForBusinessCostAudit(input);
    if (!this.canAccessBusinessCostShipment(principal, shipment, await this.hasPermission(principal.role, 'finance:business-cost:view-all'))) {
      throw new ForbiddenException('不能维护其他业务员的业务成本');
    }
    const amount = this.calculateBusinessCostAmount(input.chargeWeightKg, input.unitPrice, input.amount);
    const item = await this.createShipmentFinanceItem(principal, shipment.id, {
      type: 'BUSINESS_COST',
      name: input.name,
      amount,
      currency: input.currency ?? 'RMB',
      settlementMethod: input.settlementMethod,
      paymentNo: input.paymentNo,
      agentName: shipment.agentName,
      chargeWeightKg: input.chargeWeightKg,
      unitPrice: input.unitPrice,
      remark: input.remark
    });
    const created = this.findBusinessCostFinanceItemById(item.id);
    this.audit('finance.business_cost.create', created.id, principal, null, created);
    return this.toBusinessCostAuditSummary(created, shipment, { canViewAgent, canViewProfit });
  }

  async updateBusinessCostAudit(principal: Principal, id: string, input: BusinessCostAuditUpdateInput): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:manage');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const item = this.findBusinessCostFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    if (!this.canAccessBusinessCostShipment(principal, shipment, await this.hasPermission(principal.role, 'finance:business-cost:view-all'))) {
      throw new ForbiddenException('不能维护其他业务员的业务成本');
    }
    this.ensureBusinessCostAuditEditable(item);
    const before = { ...item };
    const nextChargeWeight = input.chargeWeightKg ?? item.chargeWeightKg;
    const nextUnitPrice = input.unitPrice ?? item.unitPrice;
    const amount = this.calculateBusinessCostAmount(nextChargeWeight, nextUnitPrice, input.amount ?? item.amount);
    Object.assign(item, {
      name: input.name ?? item.name,
      amount,
      currency: input.currency ?? item.currency,
      settlementMethod: input.settlementMethod ?? item.settlementMethod,
      paymentNo: input.paymentNo ?? item.paymentNo,
      agentName: item.agentName ?? shipment.agentName,
      chargeWeightKg: input.chargeWeightKg ?? item.chargeWeightKg,
      unitPrice: input.unitPrice ?? item.unitPrice,
      remark: input.remark ?? item.remark,
      updatedAt: new Date().toISOString()
    });
    this.audit('finance.business_cost.update', id, principal, before, item);
    return this.toBusinessCostAuditSummary(item, shipment, { canViewAgent, canViewProfit });
  }

  async auditBusinessCostAudit(principal: Principal, id: string): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:audit');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const item = this.findBusinessCostFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    if (item.voided) {
      throw new BadRequestException('已作废业务成本不能审核');
    }
    if (item.reconciliationStatus !== 'PENDING') {
      throw new BadRequestException('只有待审核业务成本可以审核');
    }
    const now = new Date().toISOString();
    const before = { ...item };
    item.locked = true;
    item.reconciliationStatus = 'CONFIRMED';
    item.reviewedBy = principal.username;
    item.reviewedAt = now;
    item.updatedAt = now;
    this.audit('finance.business_cost.audit', id, principal, before, this.toBusinessCostReviewAuditSnapshot(item, shipment, principal, before.reconciliationStatus, 'CONFIRMED', 'audit'));
    return this.toBusinessCostAuditSummary(item, shipment, { canViewAgent, canViewProfit });
  }

  async reverseAuditBusinessCostAudit(principal: Principal, id: string): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:reverse');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const item = this.findBusinessCostFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    if (item.reconciliationStatus !== 'CONFIRMED') {
      throw new BadRequestException('只有已审核业务成本可以反审核');
    }
    const before = { ...item };
    item.locked = false;
    item.reconciliationStatus = 'PENDING';
    item.reviewedBy = undefined;
    item.reviewedAt = undefined;
    item.updatedAt = new Date().toISOString();
    this.audit('finance.business_cost.reverse_audit', id, principal, before, this.toBusinessCostReviewAuditSnapshot(item, shipment, principal, before.reconciliationStatus, 'PENDING', 'reverse'));
    return this.toBusinessCostAuditSummary(item, shipment, { canViewAgent, canViewProfit });
  }

  async deleteBusinessCostAudit(principal: Principal, id: string): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:void');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const item = this.findBusinessCostFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    this.ensureBusinessCostAuditEditable(item);
    const before = { ...item };
    item.voided = true;
    item.reconciliationStatus = 'VOIDED';
    item.voidedAt = new Date().toISOString();
    item.updatedAt = item.voidedAt;
    this.audit('finance.business_cost.void', id, principal, before, item);
    return this.toBusinessCostAuditSummary(item, shipment, { canViewAgent, canViewProfit });
  }

  async batchAuditBusinessCostAudits(principal: Principal, input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    const result = await this.runBusinessCostBatch(input.ids, (id) => this.auditBusinessCostAudit(principal, id));
    this.audit('finance.business_cost.batch_audit', input.ids.join(','), principal, null, result);
    return result;
  }

  async batchReverseAuditBusinessCostAudits(principal: Principal, input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    const result = await this.runBusinessCostBatch(input.ids, (id) => this.reverseAuditBusinessCostAudit(principal, id));
    this.audit('finance.business_cost.batch_reverse_audit', input.ids.join(','), principal, null, result);
    return result;
  }

  async batchVoidBusinessCostAudits(principal: Principal, input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    const result = await this.runBusinessCostBatch(input.ids, (id) => this.deleteBusinessCostAudit(principal, id));
    this.audit('finance.business_cost.batch_void', input.ids.join(','), principal, null, result);
    return result;
  }

  async exportBusinessCostAudits(principal: Principal, input: BusinessCostAuditExportRequest): Promise<BusinessCostAuditExportResponse> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:export');
    const response = await this.getBusinessCostAudits(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    this.audit('finance.business_cost.export', input.ids?.join(',') ?? 'filtered', principal, null, { count: rows.length });
    return {
      rows,
      exportedAt: new Date().toISOString()
    };
  }

  async getPayableAudits(principal: Principal, query: PayableAuditListQuery = {}): Promise<PayableAuditListResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:read');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const rows = this.shipmentFinanceItems
      .filter((item) => item.type === 'PAYABLE')
      .filter((item) => this.canExposePayableToFinance(item))
      .map((item) => {
        const shipment = this.shipments.find((row) => row.id === item.shipmentId);
        return shipment ? this.toPayableAuditSummary(item, shipment, { canViewSensitivePayable, canViewProfit }) : undefined;
      })
      .filter((row): row is PayableAuditSummary => Boolean(row));
    return this.buildPayableAuditListResponse(rows, query);
  }

  async getFinanceDashboard(principal: Principal): Promise<FinanceDashboardResponse> {
    const kpis: FinanceDashboardItem[] = [];
    const todos: FinanceDashboardItem[] = [];
    const exceptions: FinanceDashboardItem[] = [];
    const quickActions: FinanceDashboardItem[] = [];
    const can = (permission: PermissionKey) => this.hasPermission(principal.role, permission);
    const sum = (rows: Array<{ amount?: number; rmbAmount?: number }>) => rows.reduce((total, row) => total + Number(row.rmbAmount ?? row.amount ?? 0), 0);
    const addQuick = (sectionKey: FinanceDashboardItem['sectionKey'], title: string, description: string) => quickActions.push({ key: `quick-${sectionKey}`, title, description, sectionKey });

    if (await can('finance:read')) {
      const receivables = await this.getReceivableAudits(principal, { page: 1, pageSize: -1 });
      const pending = receivables.rows.filter((row) => !row.voided && row.reconciliationStatus !== 'CONFIRMED');
      const unpaid = receivables.rows.filter((row) => !row.voided && row.reconciliationStatus === 'CONFIRMED' && row.receiptStatus !== 'RECEIVED');
      const statements = await this.getCustomerStatements(principal);
      const accounts = await this.getCustomerAccounts(principal);
      kpis.push({ key: 'pending-receivable', title: '待审应收', count: pending.length, amount: sum(pending), currency: 'RMB', sectionKey: 'receivables' });
      kpis.push({ key: 'customer-balance', title: '客户账户余额', count: accounts.length, amount: accounts.reduce((total, row) => total + Number(row.balance ?? 0), 0), currency: 'RMB', sectionKey: 'receivables' });
      if (pending.length) todos.push({ key: 'todo-receivable', title: '应收审核', count: pending.length, amount: sum(pending), currency: 'RMB', sectionKey: 'receivables' });
      if (unpaid.length) exceptions.push({ key: 'exception-receivable-unpaid', title: '已审核应收未收齐', count: unpaid.length, amount: sum(unpaid), currency: 'RMB', description: '已审核但未完成水单匹配', sectionKey: 'receivables' });
      if (statements.length) todos.push({ key: 'todo-statement', title: '客户账单待确认', count: statements.length, sectionKey: 'receivables' });
      addQuick('receivables', '应收审核', '审核客户应收和水单匹配状态');
    }

    if (await can('finance:business-cost:read')) {
      const response = await this.getBusinessCostAudits(principal, { page: 1, pageSize: -1 });
      const pending = response.rows.filter((row) => !row.voided && row.reconciliationStatus !== 'CONFIRMED');
      kpis.push({ key: 'pending-business-cost', title: '待审业务成本', count: pending.length, amount: sum(pending), currency: 'RMB', sectionKey: 'business-costs' });
      if (pending.length) todos.push({ key: 'todo-business-cost', title: '业务成本审核', count: pending.length, amount: sum(pending), currency: 'RMB', sectionKey: 'business-costs' });
      addQuick('business-costs', '业务成本审核', '审核业务员成本');
    }

    if (await can('finance:payable:read')) {
      const response = await this.getPayableAudits(principal, { page: 1, pageSize: -1 });
      const pending = response.rows.filter((row) => !row.voided && row.reconciliationStatus !== 'CONFIRMED');
      const vouchers = await this.getPaymentVouchers(principal, { status: 'DIFFERENCE_PENDING', page: 1, pageSize: 1000 });
      kpis.push({ key: 'pending-payable', title: '待审应付', count: pending.length, amount: sum(pending), currency: 'RMB', sectionKey: 'payables' });
      kpis.push({ key: 'agent-bill-difference', title: '代理账单差异', count: vouchers.length, sectionKey: 'agent-bill-ai' });
      if (pending.length) todos.push({ key: 'todo-payable', title: '市场应付审核', count: pending.length, amount: sum(pending), currency: 'RMB', sectionKey: 'payables' });
      if (vouchers.length) {
        todos.push({ key: 'todo-agent-bill', title: '代理账单差异处理', count: vouchers.length, sectionKey: 'agent-bill-ai' });
        exceptions.push({ key: 'exception-agent-bill', title: '代理账单差异待处理', count: vouchers.length, sectionKey: 'agent-bill-ai' });
      }
      addQuick('payables', '市场应付审核', '审核市场排货后的代理应付费用');
      addQuick('agent-bill-ai', '代理账单', '核对代理账单和处理差异');
    }

    if (await can('finance:payable:payment')) {
      const response = await this.getPendingPayments(principal, { status: 'ALL', currency: 'ALL', page: 1, pageSize: -1 });
      const pending = response.rows.filter((row) => row.status === 'PENDING' || row.status === 'READY');
      const missingVoucher = response.rows.filter((row) => row.status === 'APPLIED' && !row.vouchers.length);
      kpis.push({ key: 'pending-payment', title: '待付款', count: pending.length, amount: sum(pending), currency: 'RMB', sectionKey: 'payment-applications' });
      if (pending.length) todos.push({ key: 'todo-payment-application', title: '付款申请', count: pending.length, amount: sum(pending), currency: 'RMB', sectionKey: 'payment-applications' });
      if (missingVoucher.length) exceptions.push({ key: 'exception-payment-voucher', title: '付款申请缺付款凭证', count: missingVoucher.length, sectionKey: 'payment-applications' });
      addQuick('payment-applications', '待付款', '维护付款申请');
    }

    if (await can('finance:payable:paid-read')) {
      const response = await this.getPaidPayments(principal, { status: 'WAITING_PAYMENT', currency: 'ALL', page: 1, pageSize: -1 });
      kpis.push({ key: 'waiting-paid-confirm', title: '待支付', count: response.rows.length, amount: response.rows.reduce((total, row) => total + Number(row.totalAmount ?? 0), 0), currency: 'RMB', sectionKey: 'paid-verification' });
      if (response.rows.length) todos.push({ key: 'todo-paid-confirm', title: '确认支付', count: response.rows.length, sectionKey: 'paid-verification' });
      addQuick('paid-verification', '待支付/已支付', '确认支付和补充凭证');
    }

    if (await can('finance:water-receipt:read')) {
      const response = await this.getWaterReceipts(principal, { status: 'ALL', page: 1, pageSize: -1 });
      const matchable = response.rows.filter((row) => ['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status) && row.balance > 0);
      kpis.push({ key: 'water-receipt-match', title: '待匹配水单', count: matchable.length, amount: matchable.reduce((total, row) => total + row.balance, 0), currency: 'RMB', sectionKey: 'water-receipts' });
      if (matchable.length) {
        todos.push({ key: 'todo-water-receipt', title: '水单匹配', count: matchable.length, sectionKey: 'water-receipts' });
        exceptions.push({ key: 'exception-water-balance', title: '到账水单有余额', count: matchable.length, description: '已到账但仍有未匹配余额', sectionKey: 'water-receipts' });
      }
      addQuick('water-receipts', '水单匹配', '处理到账与应收匹配');
    }

    return { kpis, todos, exceptions, quickActions };
  }

  async createPayableAudit(principal: Principal, input: PayableAuditCreateInput): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:manage');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const shipment = this.findShipmentForBusinessCostAudit(input);
    const amount = this.calculatePayableAmount(input.chargeWeightKg, input.unitPrice, input.amount);
    const item = await this.createShipmentFinanceItem(principal, shipment.id, {
      type: 'PAYABLE',
      name: input.name,
      amount,
      currency: input.currency ?? 'RMB',
      settlementMethod: input.settlementMethod,
      paymentNo: input.paymentNo,
      agentName: shipment.agentName,
      chargeWeightKg: input.chargeWeightKg,
      unitPrice: input.unitPrice,
      amountOverridden: input.chargeWeightKg === undefined || input.unitPrice === undefined,
      remark: input.remark
    });
    const created = this.findPayableFinanceItemById(item.id);
    this.audit('finance.payable.create', created.id, principal, null, created);
    return this.toPayableAuditSummary(created, shipment, { canViewSensitivePayable, canViewProfit });
  }

  async matchPayableAuditShipment(principal: Principal, input: PayableAuditShipmentMatchInput): Promise<PayableAuditShipmentMatchSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:manage');
    const shipment = this.findShipmentForBusinessCostAudit(input);
    return this.toPayableAuditShipmentMatchSummary(shipment);
  }

  async updatePayableAudit(principal: Principal, id: string, input: PayableAuditUpdateInput): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:manage');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const item = this.findPayableFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) throw new NotFoundException('运单不存在');
    this.ensurePayableAuditEditable(item);
    const before = { ...item };
    const nextChargeWeight = input.chargeWeightKg ?? item.chargeWeightKg;
    const nextUnitPrice = input.unitPrice ?? item.unitPrice;
    const amount = this.calculatePayableAmount(nextChargeWeight, nextUnitPrice, input.amount ?? item.amount);
    Object.assign(item, {
      name: input.name ?? item.name,
      amount,
      currency: input.currency ?? item.currency,
      settlementMethod: input.settlementMethod ?? item.settlementMethod,
      paymentNo: input.paymentNo ?? item.paymentNo,
      agentName: item.agentName ?? shipment.agentName,
      chargeWeightKg: input.chargeWeightKg ?? item.chargeWeightKg,
      unitPrice: input.unitPrice ?? item.unitPrice,
      amountOverridden: nextChargeWeight === undefined || nextUnitPrice === undefined,
      remark: input.remark ?? item.remark,
      updatedAt: new Date().toISOString()
    });
    this.audit('finance.payable.update', id, principal, before, item);
    return this.toPayableAuditSummary(item, shipment, { canViewSensitivePayable, canViewProfit });
  }

  async auditPayableAudit(principal: Principal, id: string): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:audit');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const item = this.findPayableFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) throw new NotFoundException('运单不存在');
    this.ensurePayableReadyForFinance(item);
    if (item.voided) throw new BadRequestException('已作废应付费用不能审核');
    if (item.reconciliationStatus !== 'PENDING') throw new BadRequestException('只有待审核应付费用可以审核');
    const before = { ...item };
    const now = new Date().toISOString();
    item.locked = true;
    item.reconciliationStatus = 'CONFIRMED';
    item.reviewedBy = principal.username;
    item.reviewedAt = now;
    item.updatedAt = now;
    const application = this.upsertPayablePaymentApplication(item);
    this.audit('finance.payable.audit', id, principal, before, this.toPayableReviewAuditSnapshot(item, shipment, principal, before.reconciliationStatus, 'CONFIRMED', 'audit', application));
    return this.toPayableAuditSummary(item, shipment, { canViewSensitivePayable, canViewProfit });
  }

  async reverseAuditPayableAudit(principal: Principal, id: string): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:reverse');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const item = this.findPayableFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) throw new NotFoundException('运单不存在');
    if (item.reconciliationStatus !== 'CONFIRMED') throw new BadRequestException('只有已审核应付费用可以反审核');
    const activePaymentItem = this.paymentApplicationItems.find((row) => row.payableFinanceItemId === id && ['WAITING_PAYMENT', 'PAID'].includes(this.findPaymentApplicationById(row.paymentApplicationId).status));
    if (activePaymentItem) {
      const paymentApplication = this.findPaymentApplicationById(activePaymentItem.paymentApplicationId);
      if (paymentApplication.status === 'PAID') throw new BadRequestException('该应付已支付，请先在待支付/已支付模块反核销');
      if (paymentApplication.status === 'WAITING_PAYMENT') await this.cancelPaymentApplication(principal, paymentApplication.id, { reason: '应付反审核自动撤回待支付申请' });
    }
    const before = { ...item };
    item.locked = false;
    item.reconciliationStatus = 'PENDING';
    item.reviewedBy = undefined;
    item.reviewedAt = undefined;
    item.updatedAt = new Date().toISOString();
    const invalidatedAt = new Date().toISOString();
    this.payablePaymentApplications
      .filter((row) => row.payableFinanceItemId === id && row.status !== 'PAID')
      .forEach((row) => {
        row.status = 'INVALIDATED';
        row.applicationStatus = 'INVALIDATED';
        row.invalidatedAt = invalidatedAt;
        row.updatedAt = row.invalidatedAt;
      });
    const invalidatedApplication = this.payablePaymentApplications.find((row) => row.payableFinanceItemId === id && row.invalidatedAt === invalidatedAt);
    this.audit('finance.payable.reverse_audit', id, principal, before, this.toPayableReviewAuditSnapshot(item, shipment, principal, before.reconciliationStatus, 'PENDING', 'reverse', invalidatedApplication));
    return this.toPayableAuditSummary(item, shipment, { canViewSensitivePayable, canViewProfit });
  }

  async deletePayableAudit(principal: Principal, id: string): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:void');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const item = this.findPayableFinanceItemById(id);
    const shipment = this.shipments.find((row) => row.id === item.shipmentId);
    if (!shipment) throw new NotFoundException('运单不存在');
    this.ensurePayableAuditEditable(item);
    const before = { ...item };
    item.voided = true;
    item.reconciliationStatus = 'VOIDED';
    item.voidedAt = new Date().toISOString();
    item.updatedAt = item.voidedAt;
    this.audit('finance.payable.void', id, principal, before, item);
    return this.toPayableAuditSummary(item, shipment, { canViewSensitivePayable, canViewProfit });
  }

  async batchAuditPayableAudits(principal: Principal, input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    const result = await this.runPayableBatch(input.ids, (id) => this.auditPayableAudit(principal, id));
    this.audit('finance.payable.batch_audit', input.ids.join(','), principal, null, result);
    return result;
  }

  async batchReverseAuditPayableAudits(principal: Principal, input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    const result = await this.runPayableBatch(input.ids, (id) => this.reverseAuditPayableAudit(principal, id));
    this.audit('finance.payable.batch_reverse_audit', input.ids.join(','), principal, null, result);
    return result;
  }

  async batchVoidPayableAudits(principal: Principal, input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    const result = await this.runPayableBatch(input.ids, (id) => this.deletePayableAudit(principal, id));
    this.audit('finance.payable.batch_void', input.ids.join(','), principal, null, result);
    return result;
  }

  async exportPayableAudits(principal: Principal, input: PayableAuditExportRequest): Promise<PayableAuditExportResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:export');
    const response = await this.getPayableAudits(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    this.audit('finance.payable.export', input.ids?.join(',') ?? 'filtered', principal, null, { count: rows.length });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async getPendingPayments(principal: Principal, query: PendingPaymentListQuery = {}): Promise<PendingPaymentListResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:payment');
    const rows = this.payablePaymentApplications
      .filter((row) => this.canExposePendingPaymentToFinance(row))
      .map((row) => this.toPendingPaymentSummary(row));
    return this.buildPendingPaymentListResponse(rows, query);
  }

  async getPayeeBankAccounts(principal: Principal, query: { agentName?: string; agentId?: string; currency?: 'RMB' | 'USD' } = {}): Promise<PayeeBankAccountSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    return this.payeeBankAccounts.filter((row) => row.enabled
      && (!query.agentId || row.agentId === query.agentId)
      && (!query.currency || row.currency === query.currency)
      && (!query.agentName || row.agentName.toLowerCase().includes(query.agentName.toLowerCase())));
  }

  async upsertPayeeBankAccount(principal: Principal, input: PayeeBankAccountInput): Promise<PayeeBankAccountSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    if (!input.agentName?.trim() || !input.accountName?.trim() || !input.bankName?.trim() || !input.bankAccountNo?.trim()) {
      throw new BadRequestException('收款方、户名、银行和账号不能为空');
    }
    const currency = this.normalizePaymentCurrency(input.currency);
    const now = new Date().toISOString();
    const row: StoredPayeeBankAccount = {
      id: `payee-bank-${this.payeeBankAccounts.length + 1}`,
      agentId: input.agentId,
      agentName: input.agentName.trim(),
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      bankAccountNo: input.bankAccountNo.trim(),
      currency,
      remark: input.remark,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
    this.payeeBankAccounts.push(row);
    this.audit('finance.payment.bank.save', row.id, principal, null, row);
    return row;
  }

  private async createTransientPayeeBankAccount(principal: Principal, input: PayeeBankAccountInput): Promise<PayeeBankAccountSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    if (!input.agentName?.trim() || !input.accountName?.trim() || !input.bankName?.trim() || !input.bankAccountNo?.trim()) {
      throw new BadRequestException('收款方、户名、银行和账号不能为空');
    }
    const currency = this.normalizePaymentCurrency(input.currency);
    const now = new Date().toISOString();
    const row: StoredPayeeBankAccount = {
      id: `payee-bank-${this.payeeBankAccounts.length + 1}`,
      agentId: input.agentId,
      agentName: input.agentName.trim(),
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      bankAccountNo: input.bankAccountNo.trim(),
      currency,
      remark: input.remark,
      enabled: false,
      createdAt: now,
      updatedAt: now
    };
    this.payeeBankAccounts.push(row);
    this.audit('finance.payment.bank.use_once', row.id, principal, null, row);
    return row;
  }

  async createPaymentApplications(principal: Principal, input: PaymentApplicationCreateInput): Promise<PaymentApplicationSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:payment');
    const ids = Array.from(new Set(input.pendingPaymentIds ?? []));
    if (!ids.length) throw new BadRequestException('请选择待付款记录');
    const rows = ids.map((id) => this.findPayablePaymentApplicationById(id));
    let selectedBank: StoredPayeeBankAccount | undefined;
    if (input.bankAccountId) {
      selectedBank = this.payeeBankAccounts.find((row) => row.id === input.bankAccountId);
      if (!selectedBank) throw new BadRequestException('收款银行不存在');
    } else if (input.manualBankAccount) {
      selectedBank = input.saveManualBankAccount === false
        ? await this.createTransientPayeeBankAccount(principal, input.manualBankAccount) as StoredPayeeBankAccount
        : await this.upsertPayeeBankAccount(principal, input.manualBankAccount) as StoredPayeeBankAccount;
    }
    const groups = new Map<string, StoredPayablePaymentApplication[]>();
    for (const row of rows) {
      this.ensurePendingPaymentReadyForFinance(row);
      const summary = this.toPendingPaymentSummary(row);
      if (summary.status === 'INVALIDATED' || summary.status === 'PAID') throw new BadRequestException('已失效或已支付记录不能提交付款申请');
      if (summary.status === 'APPLIED') throw new BadRequestException('已申请付款记录不能重复提交');
      const bank = selectedBank ?? (row.payeeBankAccountId ? this.payeeBankAccounts.find((item) => item.id === row.payeeBankAccountId) : undefined);
      this.assertPayeeBankMatchesPending(bank, [summary]);
      const key = `${summary.agentName ?? '未指定代理'}|${bank?.bankAccountNo ?? 'NO_BANK'}|${summary.currency}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    const created: PaymentApplicationSummary[] = [];
    for (const groupRows of groups.values()) {
      const first = this.toPendingPaymentSummary(groupRows[0]);
      const bank = selectedBank ?? (groupRows[0].payeeBankAccountId ? this.payeeBankAccounts.find((item) => item.id === groupRows[0].payeeBankAccountId) : undefined);
      const now = new Date().toISOString();
      const app: StoredPaymentApplication = {
        id: `payment-app-${this.paymentApplications.length + 1}`,
        applicationNo: this.nextMemoryPaymentApplicationNo(),
        agentName: first.agentName ?? '未指定代理',
        currency: first.currency,
        totalAmount: Number(groupRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2)),
        status: 'WAITING_PAYMENT',
        payeeBankAccountId: bank?.id,
        remark: input.remark,
        appliedBy: principal.username,
        appliedAt: now
      };
      this.paymentApplications.push(app);
      groupRows.forEach((row) => {
        row.status = 'APPLIED';
        row.applicationStatus = 'APPLIED';
        row.payeeBankAccountId = bank?.id;
        row.appliedAt = now;
        row.remark = input.remark ?? row.remark;
        this.paymentApplicationItems.push({
          id: `payment-app-item-${this.paymentApplicationItems.length + 1}`,
          paymentApplicationId: app.id,
          pendingPaymentId: row.id,
          payableFinanceItemId: row.payableFinanceItemId,
          shipmentId: row.shipmentId,
          systemOrderNo: this.toPendingPaymentSummary(row).systemOrderNo,
          customerCode: this.toPendingPaymentSummary(row).customerCode,
          feeName: this.toPendingPaymentSummary(row).feeName,
          amount: row.amount,
          currency: this.normalizePaymentCurrency(row.currency)
        });
      });
      if (input.voucher?.fileName) {
        this.paymentVouchers.push({
          id: `payment-voucher-${this.paymentVouchers.length + 1}`,
          paymentApplicationId: app.id,
          voucherType: input.voucher.voucherType ?? 'BILL',
          fileName: input.voucher.fileName.trim(),
          mimeType: input.voucher.mimeType,
          sizeBytes: input.voucher.sizeBytes,
          url: input.voucher.url,
          uploadedBy: principal.username,
          createdAt: now
        });
      }
      const summary = this.toPaymentApplicationSummary(app);
      this.audit('finance.payment_application.create', app.id, principal, null, this.toPaymentApplicationAuditSnapshot(summary));
      created.push(summary);
    }
    return created;
  }

  async updatePaymentApplication(principal: Principal, id: string, input: PaymentApplicationUpdateInput): Promise<PaymentApplicationSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:payment');
    const app = this.findPaymentApplicationById(id);
    if (app.status !== 'WAITING_PAYMENT') throw new BadRequestException('只有待支付申请可以修改');
    const before = { ...app };
    let selectedBank: StoredPayeeBankAccount | undefined;
    if (input.bankAccountId) {
      selectedBank = this.payeeBankAccounts.find((row) => row.id === input.bankAccountId);
      if (!selectedBank) throw new BadRequestException('收款银行不存在');
      app.payeeBankAccountId = input.bankAccountId;
    }
    if (!input.bankAccountId && input.manualBankAccount) {
      const bank = input.saveManualBankAccount === false
        ? await this.createTransientPayeeBankAccount(principal, input.manualBankAccount)
        : await this.upsertPayeeBankAccount(principal, input.manualBankAccount);
      app.payeeBankAccountId = bank.id;
      selectedBank = bank as StoredPayeeBankAccount;
    }
    if (!selectedBank && app.payeeBankAccountId) selectedBank = this.payeeBankAccounts.find((bank) => bank.id === app.payeeBankAccountId);
    const pendingRows = this.paymentApplicationItems
      .filter((item) => item.paymentApplicationId === id)
      .map((item) => this.toPendingPaymentSummary(this.findPayablePaymentApplicationById(item.pendingPaymentId)));
    this.assertPayeeBankMatchesPending(selectedBank, pendingRows);
    app.remark = input.remark ?? app.remark;
    if (input.voucher?.fileName) {
      this.paymentVouchers.push({
        id: `payment-voucher-${this.paymentVouchers.length + 1}`,
        paymentApplicationId: app.id,
        voucherType: input.voucher.voucherType ?? 'BILL',
        fileName: input.voucher.fileName.trim(),
        mimeType: input.voucher.mimeType,
        sizeBytes: input.voucher.sizeBytes,
        url: input.voucher.url,
        uploadedBy: principal.username,
        createdAt: new Date().toISOString()
      });
    }
    this.audit('finance.payment_application.update', id, principal, before, this.toPaymentApplicationAuditSnapshot(this.toPaymentApplicationSummary(app)));
    return this.toPaymentApplicationSummary(app);
  }

  async cancelPaymentApplication(principal: Principal, id: string, input: PaymentApplicationCancelInput = {}): Promise<PaymentApplicationSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:payment');
    const app = this.findPaymentApplicationById(id);
    if (app.status !== 'WAITING_PAYMENT') throw new BadRequestException('只有待支付申请可以撤回');
    const before = { ...app };
    app.status = 'CANCELED';
    app.canceledAt = new Date().toISOString();
    app.cancelReason = input.reason;
    this.paymentApplicationItems
      .filter((item) => item.paymentApplicationId === id)
      .forEach((item) => {
        const pending = this.findPayablePaymentApplicationById(item.pendingPaymentId);
        pending.status = 'READY';
        pending.applicationStatus = 'PENDING';
        pending.appliedAt = undefined;
      });
    const after = this.toPaymentApplicationAuditSnapshot(this.toPaymentApplicationSummary(app), before.status, 'CANCELED', principal.username);
    this.paymentApplicationItems.splice(0, this.paymentApplicationItems.length, ...this.paymentApplicationItems.filter((item) => item.paymentApplicationId !== id));
    this.audit('finance.payment_application.cancel', id, principal, before, after);
    return this.toPaymentApplicationSummary(app);
  }

  async exportPaymentApplications(principal: Principal, input: PaymentApplicationExportRequest): Promise<PaymentApplicationExportResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:export');
    const response = await this.getPendingPayments(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    this.audit('finance.payment_application.export', input.ids?.join(',') ?? 'filtered', principal, null, { count: rows.length });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async addPaymentVoucher(principal: Principal, input: PaymentVoucherInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:attachment');
    if (!input.fileName?.trim()) throw new BadRequestException('凭证文件名不能为空');
    if (!input.paymentApplicationId && !input.pendingPaymentId) throw new BadRequestException('凭证必须关联待付款或付款申请');
    if (input.billAmount !== undefined && input.billAmount < 0) throw new BadRequestException('账单金额不能小于 0');
    if (input.extraFeeAmount !== undefined && input.extraFeeAmount < 0) throw new BadRequestException('杂费金额不能小于 0');
    if (input.kuayueAmount !== undefined && input.kuayueAmount < 0) throw new BadRequestException('跨越账单金额不能小于 0');
    if (input.billDate && Number.isNaN(Date.parse(input.billDate))) throw new BadRequestException('账单日期无效');
    if (input.extraFeeOccurredAt && Number.isNaN(Date.parse(input.extraFeeOccurredAt))) throw new BadRequestException('杂费发生日期无效');
    if (input.kuayueBillDate && Number.isNaN(Date.parse(input.kuayueBillDate))) throw new BadRequestException('跨越账单日期无效');
    const voucher: StoredPaymentVoucher = {
      id: `payment-voucher-${this.paymentVouchers.length + 1}`,
      paymentApplicationId: input.paymentApplicationId,
      pendingPaymentId: input.pendingPaymentId,
      voucherType: input.voucherType ?? 'BILL',
      billNo: input.billNo?.trim() || undefined,
      transferNo: input.transferNo?.trim() || undefined,
      agentName: input.agentName?.trim() || undefined,
      billDate: input.billDate,
      currency: input.currency,
      billAmount: input.billAmount,
      status: input.status ?? 'IMPORTED',
      differenceType: input.differenceType?.trim() || undefined,
      differenceAmount: input.differenceAmount,
      differenceReason: input.differenceReason?.trim() || undefined,
      differenceStatus: input.differenceStatus,
      extraFeeType: input.extraFeeType?.trim() || undefined,
      extraFeeAmount: input.extraFeeAmount,
      extraFeeCurrency: input.extraFeeCurrency,
      extraFeeAgentName: input.extraFeeAgentName?.trim() || undefined,
      extraFeeCustomerCode: input.extraFeeCustomerCode?.trim() || undefined,
      extraFeeSystemOrderNo: input.extraFeeSystemOrderNo?.trim() || undefined,
      extraFeeOccurredAt: input.extraFeeOccurredAt,
      extraFeeFinanceItemId: input.extraFeeFinanceItemId?.trim() || undefined,
      extraFeeRemark: input.extraFeeRemark?.trim() || undefined,
      kuayueBillNo: input.kuayueBillNo?.trim() || undefined,
      kuayueCustomerCode: input.kuayueCustomerCode?.trim() || undefined,
      kuayueSystemOrderNo: input.kuayueSystemOrderNo?.trim() || undefined,
      kuayueAmount: input.kuayueAmount,
      kuayueCurrency: input.kuayueCurrency,
      kuayueBillDate: input.kuayueBillDate,
      kuayueStatus: input.kuayueStatus,
      fileName: input.fileName.trim(),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      url: input.url,
      uploadedBy: principal.username,
      createdAt: new Date().toISOString()
    };
    this.paymentVouchers.push(voucher);
    const summary = this.toPaymentVoucherSummary(voucher);
    this.audit('finance.payment_voucher.add', voucher.id, principal, null, summary);
    if (summary.extraFeeType) this.audit('finance.payment_voucher.extra_fee.add', voucher.id, principal, null, summary);
    if (summary.kuayueBillNo) this.audit('finance.payment_voucher.kuayue.add', voucher.id, principal, null, summary);
    return summary;
  }

  async getPaymentVouchers(principal: Principal, query: PaymentVoucherListQuery = {}): Promise<PaymentVoucherSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:read');
    const billNo = query.billNo?.trim().toLowerCase();
    const agentName = query.agentName?.trim().toLowerCase();
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Number(query.pageSize ?? 50));
    return this.paymentVouchers
      .filter((row) => row.voucherType === 'BILL')
      .filter((row) => (billNo ? (row.billNo ?? '').toLowerCase().includes(billNo) : true))
      .filter((row) => (agentName ? (row.agentName ?? '').toLowerCase().includes(agentName) : true))
      .filter((row) => (query.currency && query.currency !== 'ALL' ? row.currency === query.currency : true))
      .filter((row) => (query.status && query.status !== 'ALL' ? (row.status ?? 'IMPORTED') === query.status : true))
      .slice((page - 1) * pageSize, page * pageSize)
      .map((row) => this.toPaymentVoucherSummary(row));
  }

  async updatePaymentVoucherDifference(principal: Principal, id: string, input: PaymentVoucherDifferenceInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:attachment');
    const row = this.paymentVouchers.find((item) => item.id === id && item.voucherType === 'BILL');
    if (!row) throw new NotFoundException('代理账单不存在');
    if (input.differenceAmount !== undefined && input.differenceAmount < 0) throw new BadRequestException('差异金额不能小于 0');
    const before = this.toPaymentVoucherSummary(row);
    const handled = input.differenceStatus === 'HANDLED';
    row.differenceType = input.differenceType?.trim() || row.differenceType;
    row.differenceAmount = input.differenceAmount ?? row.differenceAmount;
    row.differenceReason = input.differenceReason?.trim() || row.differenceReason;
    row.differenceStatus = input.differenceStatus;
    row.status = handled ? 'DIFFERENCE_HANDLED' : 'DIFFERENCE_PENDING';
    row.differenceHandledBy = handled ? principal.username : undefined;
    row.differenceHandledAt = handled ? new Date().toISOString() : undefined;
    const after = this.toPaymentVoucherSummary(row);
    this.audit(handled ? 'finance.payment_voucher.difference.handle' : 'finance.payment_voucher.difference.mark', row.id, principal, before, after);
    return after;
  }

  async updatePaymentVoucherArchive(principal: Principal, id: string, input: PaymentVoucherArchiveInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:attachment');
    const row = this.paymentVouchers.find((item) => item.id === id && item.voucherType === 'BILL');
    if (!row) throw new NotFoundException('代理账单不存在');
    const before = this.toPaymentVoucherSummary(row);
    row.status = input.archived ? 'ARCHIVED' : 'MATCHED';
    const after = { ...this.toPaymentVoucherSummary(row), archiveReason: input.reason?.trim() || undefined };
    this.audit(input.archived ? 'finance.payment_voucher.archive' : 'finance.payment_voucher.unarchive', row.id, principal, before, after);
    return this.toPaymentVoucherSummary(row);
  }

  async getPaidPayments(principal: Principal, query: PaidPaymentListQuery = {}): Promise<PaidPaymentListResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-read');
    const canViewBank = await this.hasPermission(principal.role, 'finance:payable:paid-bank-view');
    const rows = this.paymentApplications
      .filter((app) => (query.status && query.status !== 'ALL' ? app.status === query.status : app.status === 'WAITING_PAYMENT' || app.status === 'PAID'))
      .map((app) => this.toPaidPaymentSummary(app, canViewBank));
    return this.buildPaidPaymentListResponse(rows, query);
  }

  async confirmPaymentApplicationPaid(principal: Principal, id: string, input: PaymentConfirmPaidInput): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-confirm');
    if (!input.payerBankName?.trim()) throw new BadRequestException('付款方银行不能为空');
    if (!input.payerBankAccountNo?.trim()) throw new BadRequestException('付款方账号不能为空');
    if (!input.paidAt) throw new BadRequestException('付款日期不能为空');
    const app = this.findPaymentApplicationById(id);
    if (app.status !== 'WAITING_PAYMENT') throw new BadRequestException('只有待支付申请可以确认付款');
    const before = { ...app };
    app.status = 'PAID';
    app.payerBankName = input.payerBankName.trim();
    app.payerBankAccountName = input.payerBankAccountName?.trim();
    app.payerBankAccountNo = input.payerBankAccountNo?.trim();
    app.paidAt = input.paidAt;
    app.paidBy = principal.username;
    app.paidRemark = input.paidRemark;
    this.paymentApplicationItems.filter((item) => item.paymentApplicationId === id).forEach((item) => {
      const pending = this.findPayablePaymentApplicationById(item.pendingPaymentId);
      pending.status = 'PAID';
      pending.applicationStatus = 'PAID';
      pending.paymentNo = app.applicationNo;
      const payable = this.shipmentFinanceItems.find((financeItem: StoredShipmentFinanceItem) => financeItem.id === item.payableFinanceItemId);
      if (payable) {
        payable.locked = true;
        payable.paymentNo = app.applicationNo;
      }
    });
    let waterReceiptVoucher: StoredPaymentVoucher | undefined;
    if (input.waterReceipt?.fileName) {
      waterReceiptVoucher = {
        id: `payment-voucher-${this.paymentVouchers.length + 1}`,
        paymentApplicationId: app.id,
        voucherType: 'PAYMENT_RECEIPT',
        fileName: input.waterReceipt.fileName.trim(),
        mimeType: input.waterReceipt.mimeType,
        sizeBytes: input.waterReceipt.sizeBytes,
        url: input.waterReceipt.url,
        uploadedBy: principal.username,
        createdAt: new Date().toISOString()
      } satisfies StoredPaymentVoucher;
      this.paymentVouchers.push(waterReceiptVoucher);
    }
    const summary = this.toPaidPaymentSummary(app, true);
    if (waterReceiptVoucher) this.audit('finance.paid_payment.water_receipt.add', waterReceiptVoucher.id, principal, null, this.toPaidPaymentVoucherAuditSnapshot(waterReceiptVoucher, summary));
    this.audit('finance.paid_payment.confirm', id, principal, before, this.toPaidPaymentAuditSnapshot(summary, before.status, app.status));
    return this.toPaidPaymentSummary(app, await this.hasPermission(principal.role, 'finance:payable:paid-bank-view'));
  }

  async updatePaidPayment(principal: Principal, id: string, input: PaidPaymentUpdateInput): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-confirm');
    const app = this.findPaymentApplicationById(id);
    if (app.status !== 'PAID') throw new BadRequestException('只有已支付记录可以补充信息');
    const before = { ...app };
    app.paidRemark = input.paidRemark ?? app.paidRemark;
    let waterReceiptVoucher: StoredPaymentVoucher | undefined;
    if (input.waterReceipt?.fileName) {
      waterReceiptVoucher = {
        id: `payment-voucher-${this.paymentVouchers.length + 1}`,
        paymentApplicationId: app.id,
        voucherType: 'PAYMENT_RECEIPT',
        fileName: input.waterReceipt.fileName.trim(),
        mimeType: input.waterReceipt.mimeType,
        sizeBytes: input.waterReceipt.sizeBytes,
        url: input.waterReceipt.url,
        uploadedBy: principal.username,
        createdAt: new Date().toISOString()
      };
      this.paymentVouchers.push(waterReceiptVoucher);
    }
    const summary = this.toPaidPaymentSummary(app, true);
    this.audit('finance.paid_payment.update', id, principal, before, this.toPaidPaymentAuditSnapshot(summary, before.status, app.status));
    if (waterReceiptVoucher) this.audit('finance.paid_payment.water_receipt.add', waterReceiptVoucher.id, principal, null, this.toPaidPaymentVoucherAuditSnapshot(waterReceiptVoucher, summary));
    return this.toPaidPaymentSummary(app, await this.hasPermission(principal.role, 'finance:payable:paid-bank-view'));
  }

  async reversePaidPayment(principal: Principal, id: string, input: PaidPaymentReverseInput = {}): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-reverse');
    const app = this.findPaymentApplicationById(id);
    if (app.status !== 'PAID') throw new BadRequestException('只有已支付记录可以反核销');
    const before = { ...app };
    app.status = 'WAITING_PAYMENT';
    app.reversedAt = new Date().toISOString();
    app.reversedBy = principal.username;
    app.reverseReason = input.reason;
    app.paidAt = undefined;
    app.paidBy = undefined;
    app.paidRemark = undefined;
    app.payerBankName = undefined;
    app.payerBankAccountName = undefined;
    app.payerBankAccountNo = undefined;
    this.paymentApplicationItems.filter((item) => item.paymentApplicationId === id).forEach((item) => {
      const pending = this.findPayablePaymentApplicationById(item.pendingPaymentId);
      pending.status = 'APPLIED';
      pending.applicationStatus = 'APPLIED';
      pending.paymentNo = undefined;
      const payable = this.shipmentFinanceItems.find((financeItem: StoredShipmentFinanceItem) => financeItem.id === item.payableFinanceItemId);
      if (payable) payable.paymentNo = undefined;
    });
    this.audit('finance.paid_payment.reverse', id, principal, before, this.toPaidPaymentAuditSnapshot(this.toPaidPaymentSummary(app, true), before.status, app.status, app.reversedBy, app.reversedAt));
    return this.toPaidPaymentSummary(app, await this.hasPermission(principal.role, 'finance:payable:paid-bank-view'));
  }

  async exportPaidPayments(principal: Principal, input: PaidPaymentExportRequest): Promise<PaidPaymentExportResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-export');
    const response = await this.getPaidPayments(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    this.audit('finance.paid_payment.export', input.ids?.join(',') ?? 'filtered', principal, null, { count: rows.length });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async addPaymentWaterReceipt(principal: Principal, input: PaymentWaterReceiptInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-voucher');
    const app = this.findPaymentApplicationById(input.paymentApplicationId);
    if (app.status !== 'PAID') throw new BadRequestException('只有已支付记录可以上传水单');
    const voucher: StoredPaymentVoucher = {
      id: `payment-voucher-${this.paymentVouchers.length + 1}`,
      paymentApplicationId: input.paymentApplicationId,
      voucherType: 'PAYMENT_RECEIPT',
      fileName: input.fileName.trim(),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      url: input.url,
      uploadedBy: principal.username,
      createdAt: new Date().toISOString()
    };
    this.paymentVouchers.push(voucher);
    this.audit('finance.paid_payment.water_receipt.add', voucher.id, principal, null, this.toPaidPaymentVoucherAuditSnapshot(voucher, this.toPaidPaymentSummary(app, true)));
    return voucher;
  }

  async getAgentBankAccounts(principal: Principal, query: { agentName?: string; agentId?: string } = {}): Promise<AgentBankAccountSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    return this.agentBankAccounts.filter((row) => row.enabled
      && (!query.agentId || row.agentId === query.agentId)
      && (!query.agentName || row.agentName.toLowerCase().includes(query.agentName.toLowerCase())));
  }

  private assertPayeeBankMatchesPending(bank: StoredPayeeBankAccount | undefined, rows: PendingPaymentSummary[]) {
    if (!bank) return;
    for (const row of rows) {
      if (bank.currency !== row.currency) throw new BadRequestException('收款银行币种必须与待付款币种一致');
      if (!row.agentName) {
        if (bank.enabled !== false) throw new BadRequestException('待付款代理缺失，不能选择收款银行');
        continue;
      }
      if (!this.samePayeeAgent(bank.agentName, row.agentName)) throw new BadRequestException('收款银行代理必须与待付款代理一致');
    }
  }

  private samePayeeAgent(left: string, right: string) {
    const a = left.trim().toLowerCase();
    const b = right.trim().toLowerCase();
    return a === b || a.includes(b) || b.includes(a);
  }

  async upsertAgentBankAccount(principal: Principal, input: AgentBankAccountInput): Promise<AgentBankAccountSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    if (!input.agentName?.trim() || !input.accountName?.trim() || !input.bankName?.trim() || !input.bankAccountNo?.trim()) {
      throw new BadRequestException('代理、户名、银行和账号不能为空');
    }
    const now = new Date().toISOString();
    const row: StoredAgentBankAccount = {
      id: `bank-${this.agentBankAccounts.length + 1}`,
      agentId: input.agentId,
      agentName: input.agentName.trim(),
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      bankAccountNo: input.bankAccountNo.trim(),
      currency: input.currency ?? 'RMB',
      remark: input.remark,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
    this.agentBankAccounts.push(row);
    this.audit('finance.payable.bank.save', row.id, principal, null, row);
    return row;
  }

  async getLegacyReceivables(principal: Principal): Promise<ReceivableFeeSummary[]> {
    return this.receivableFees
      .filter((fee) => principal.role !== 'CUSTOMER' || fee.customerId === principal.customerId)
      .map((fee) => this.toReceivableSummary(fee));
  }

  async getShipmentFinanceDetail(principal: Principal, shipmentId: string): Promise<ShipmentFinanceDetailSummary> {
    const canViewFinanceDetail = ['ADMIN', 'FINANCE', 'UG_FINANCE', 'OPERATOR', 'UG_BUSINESS', 'UG_MARKET', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role);
    if (!canViewFinanceDetail) {
      await this.recordPermissionDenied(principal, { permissions: ['finance:order-fee:payable:view'], method: 'GET', path: `/api/shipments/${shipmentId}/finance-detail` });
      throw new ForbiddenException('当前角色不能查看单票费用明细');
    }

    const shipment = this.visibleReviewShipment(principal, shipmentId);
    const receivables = this.receivableFees
      .filter((fee) => fee.shipmentId === shipment.id)
      .map((fee) => this.toReceivableSummary(fee));
    const payables: PayableFeeSummary[] = this.payableFees
      .filter((fee) => fee.shipmentId === shipment.id)
      .map((fee) => ({
        id: fee.id,
        shipmentId: fee.shipmentId,
        name: fee.name,
        amount: fee.amount,
        settled: fee.settled,
        agentName: shipment.agentName
      }));
    const businessCosts: BusinessCostFeeSummary[] = this.payableFees
      .filter((fee) => fee.shipmentId === shipment.id)
      .map((fee) => ({
        id: fee.id,
        shipmentId: fee.shipmentId,
        name: fee.name === '代理运费' ? '运费成本' : fee.name,
        amount: fee.amount,
        settled: fee.settled
      }));
    const manualItems = this.shipmentFinanceItems.filter((item) => item.shipmentId === shipment.id && !item.voided);
    receivables.push(...manualItems
      .filter((item) => item.type === 'RECEIVABLE')
      .map((item) => this.toReceivableFinanceSummary(item, shipment)));
    payables.push(...manualItems
      .filter((item) => item.type === 'PAYABLE')
      .map((item) => this.toPayableFinanceSummary(item, shipment)));
    businessCosts.push(...manualItems
      .filter((item) => item.type === 'BUSINESS_COST')
      .map((item) => this.toBusinessCostFinanceSummary(item, shipment)));

    const usdRate = this.getShipmentFinanceDetailUsdToRmbRate([...receivables, ...payables, ...businessCosts]);
    receivables.forEach((row) => {
      row.rmbAmount = this.toShipmentFinanceDetailRmbAmount(row.amount, row.currency ?? 'RMB', usdRate);
      row.matchedReceiptNo = row.paymentNo;
    });
    payables.forEach((row) => {
      row.rmbAmount = this.toShipmentFinanceDetailRmbAmount(row.amount, row.currency ?? 'RMB', usdRate);
    });
    businessCosts.forEach((row) => {
      row.rmbAmount = this.toShipmentFinanceDetailRmbAmount(row.amount, row.currency ?? 'RMB', usdRate);
    });

    const salesScope = this.operatorCustomerScope(principal);
    const canViewOwnOrderPayables = Boolean(salesScope && shipment.salesperson && salesScope.includes(shipment.salesperson));
    const canViewInternalPayables = await this.hasAnyPermission(principal.role, ['finance:order-fee:payable:view', 'finance:payable:view-sensitive']);
    const canViewPayables = canViewOwnOrderPayables || canViewInternalPayables;
    const canViewReceivablePayableProfit = await this.hasAnyPermission(principal.role, ['finance:order-fee:profit:receivable-payable', 'finance:payable:view-profit']);
    const canViewReceivableBusinessProfit = await this.hasAnyPermission(principal.role, ['finance:order-fee:profit:receivable-business', 'finance:business-cost:view-profit']);
    const canViewBusinessPayableProfit = await this.hasAnyPermission(principal.role, ['finance:order-fee:profit:business-payable', 'finance:payable:view-profit']);
    const canViewBusinessCostAgent = await this.hasAnyPermission(principal.role, ['finance:business-cost:view-agent', 'finance:order-fee:payable:view', 'finance:payable:view-sensitive']);
    const visiblePayables = canViewPayables
      ? (canViewInternalPayables ? payables : payables.map((row) => ({ ...row, agentName: undefined, paymentNo: undefined })))
      : [];
    const receivableTotal = roundMoney(receivables.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0));
    const payableTotal = roundMoney(payables.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0));
    const visiblePayableTotal = roundMoney(visiblePayables.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0));
    const businessCostTotal = roundMoney(businessCosts.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0));
    const businessProfit = roundMoney(receivableTotal - businessCostTotal);
    businessCosts.forEach((row) => {
      row.businessProfit = canViewReceivableBusinessProfit ? businessProfit : undefined;
      if (!canViewBusinessCostAgent) {
        row.agentName = undefined;
      }
    });
    const hasPayables = payables.length > 0;
    const profitSections = [
      ...(canViewReceivablePayableProfit
        ? [{ key: 'RECEIVABLE_PAYABLE' as const, title: '应收与应付利润', amount: Number((receivableTotal - payableTotal).toFixed(2)), currency: 'RMB' as const }]
        : []),
      ...(canViewReceivableBusinessProfit
        ? [{ key: 'RECEIVABLE_BUSINESS' as const, title: '应收与业务利润', amount: Number((receivableTotal - businessCostTotal).toFixed(2)), currency: 'RMB' as const }]
        : []),
      ...(canViewBusinessPayableProfit
        ? [{ key: 'BUSINESS_PAYABLE' as const, title: '业务与应付利润', amount: Number((businessCostTotal - payableTotal).toFixed(2)), currency: 'RMB' as const }]
        : [])
    ];

    return {
      shipmentId: shipment.id,
      systemOrderNo: shipment.systemOrderNo,
      receivables,
      businessCosts,
      receivableTotal,
      businessCostTotal: businessCostTotal || (hasPayables ? payableTotal : undefined),
      ...(canViewPayables
        ? {
            ...(canViewInternalPayables ? { agentName: shipment.agentName } : {}),
            payables: visiblePayables,
            payableTotal: visiblePayableTotal,
            canViewPayables: true
          }
        : {}),
      ...(canViewReceivablePayableProfit && hasPayables
        ? { grossProfit: receivableTotal - payableTotal }
        : {}),
      ...(profitSections.length ? { profitSections } : {}),
      paymentAmountUsd: shipment.paymentAmountUsd,
      paymentAmountCny: shipment.paymentAmountCny,
      paymentMethod: shipment.paymentMethod
    };
  }

  async getReviewPendingShipments(principal: Principal): Promise<Shipment[]> {
    await this.cleanupOverdueReviewShipments(principal);
    return this.visibleReviewShipments(principal)
      .filter((shipment) => shipment.status === 'DRAFT' || shipment.status === 'REVIEW_PENDING')
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  async getReviewDeletedShipments(principal: Principal): Promise<Shipment[]> {
    await this.cleanupOverdueReviewShipments(principal);
    return this.shipments
      .filter((shipment) => this.deletedShipmentIds.has(shipment.id))
      .filter((shipment) => shipment.status === 'DRAFT' || shipment.status === 'REVIEW_PENDING' || shipment.status === 'REVIEW_REJECTED')
      .filter((shipment) => {
        if (principal.role === 'CUSTOMER') return shipment.customerId === principal.customerId;
        const scope = this.operatorCustomerScope(principal);
        if (scope) {
          return this.isShipmentInSalesScope(shipment, scope);
        }
        return true;
      })
      .sort((left, right) => new Date(right.deletedAt ?? right.createdAt).getTime() - new Date(left.deletedAt ?? left.createdAt).getTime());
  }

  async getShipmentReviewDetail(principal: Principal, shipmentId: string): Promise<ShipmentReviewDetailSummary> {
    const shipment = this.shipments.find((item) => item.id === shipmentId);
    if (!shipment || (!this.visibleReviewShipments(principal).some((item) => item.id === shipmentId) && !this.deletedShipmentIds.has(shipmentId))) {
      throw new NotFoundException('运单不存在');
    }
    if (this.deletedShipmentIds.has(shipmentId) && !(await this.hasPermission(principal.role, 'orders:review:restore'))) {
      throw new NotFoundException('运单不存在');
    }
    return this.buildShipmentReviewDetail(principal, shipment);
  }

  async approveShipmentReview(principal: Principal, shipmentId: string, options: { businessReview?: boolean } = {}): Promise<ShipmentReviewDetailSummary> {
    if (principal.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能审核运单');
    }
    const shipment = this.visibleReviewShipment(principal, shipmentId);
    if (shipment.status !== 'DRAFT' && shipment.status !== 'REVIEW_PENDING') {
      throw new BadRequestException('只有待审核运单可以审核通过');
    }
    const detail = await this.buildShipmentReviewDetail(principal, shipment);
    if (detail.approvalWarnings.length) {
      throw new BadRequestException(`审核资料未完整：${detail.approvalWarnings.join('；')}`);
    }
    const before = { ...shipment };
    const statusFrom = before.status;
    const canBusinessReview = Boolean(this.operatorCustomerScope(principal)) || (principal.role === 'ADMIN' && options.businessReview === true);
    if (canBusinessReview) {
      if (shipment.businessReviewedAt) {
        throw new BadRequestException('该订单已完成业务员自审，已进入待排货与业务成本审核');
      }
      shipment.status = 'WAITING_SORT';
      shipment.businessReviewedBy = principal.username;
      shipment.businessReviewedAt = new Date().toISOString();
      shipment.reviewRejectedReason = undefined;
      shipment.latestTracking = '业务员自审通过，进入待排货';
      this.audit('shipment.review.business_approve', shipment.id, principal, before, {
        ...shipment,
        reviewStatus: 'BUSINESS_APPROVED',
        statusFrom,
        statusTo: shipment.status,
        businessReviewer: principal.username,
        businessReviewedBy: shipment.businessReviewedBy,
        businessReviewedAt: shipment.businessReviewedAt,
        receivableTotal: detail.finance.receivableTotal,
        businessCostTotal: detail.finance.businessCostTotal ?? 0,
        payableTotal: detail.finance.payableTotal,
        approvalWarnings: detail.approvalWarnings
      });
      return this.buildShipmentReviewDetail(principal, shipment);
    }
    if (isFinalReviewRole(principal.role)) {
      throw new ForbiddenException('待审核运单不再支持财务终审，请在业务成本审核处理');
    }
    throw new ForbiddenException('当前角色不能终审运单');
  }

  async rejectShipmentReview(principal: Principal, shipmentId: string, input: ShipmentReviewRejectInput): Promise<ShipmentReviewDetailSummary> {
    if (principal.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能驳回运单');
    }
    if (!isFinalReviewRole(principal.role)) {
      throw new ForbiddenException('当前角色不能终审运单');
    }
    const reason = input.reason?.trim();
    if (!reason) {
      throw new BadRequestException('驳回必须填写原因');
    }
    const shipment = this.visibleReviewShipment(principal, shipmentId);
    if (shipment.status !== 'DRAFT' && shipment.status !== 'REVIEW_PENDING') {
      throw new BadRequestException('只有待审核运单可以驳回');
    }
    const detail = await this.buildShipmentReviewDetail(principal, shipment);
    const before = { ...shipment };
    const reviewedAt = new Date().toISOString();
    shipment.status = 'REVIEW_REJECTED';
    shipment.reviewedBy = principal.username;
    shipment.reviewedAt = reviewedAt;
    shipment.reviewRejectedReason = reason;
    shipment.latestTracking = `审核驳回：${reason}`;
    this.audit('shipment.review.reject', shipment.id, principal, before, {
      ...shipment,
      reviewStatus: 'REJECTED',
      statusFrom: before.status,
      statusTo: shipment.status,
      reviewer: principal.username,
      reviewedBy: shipment.reviewedBy,
      reviewedAt: shipment.reviewedAt,
      rejectReason: reason,
      receivableTotal: detail.finance.receivableTotal,
      businessCostTotal: detail.finance.businessCostTotal ?? 0,
      payableTotal: detail.finance.payableTotal,
      approvalWarnings: detail.approvalWarnings
    });
    return this.buildShipmentReviewDetail(principal, shipment);
  }

  async deleteShipmentReview(principal: Principal, shipmentId: string, input: ShipmentReviewDeleteInput = {}): Promise<ShipmentReviewDetailSummary> {
    if (principal.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    const shipment = this.shipments.find((item) => item.id === shipmentId && !this.deletedShipmentIds.has(item.id));
    if (!shipment || !this.canAccessShipment(principal, shipment)) {
      throw new NotFoundException('运单不存在');
    }
    const detailBeforeDelete = await this.buildShipmentReviewDetail(principal, shipment);
    const before = { ...shipment };
    shipment.deletedAt = new Date().toISOString();
    shipment.deletedBy = principal.username;
    shipment.deletedReason = input.reason?.trim() || '审核台人工删除';
    shipment.deleteType = 'MANUAL';
    this.deletedShipmentIds.add(shipment.id);
    this.audit('shipment.review.delete', shipment.id, principal, before, {
      ...shipment,
      reviewStatus: 'DELETED',
      statusFrom: before.status,
      statusTo: shipment.status,
      reviewer: principal.username,
      deleteReason: shipment.deletedReason,
      receivableTotal: detailBeforeDelete.finance.receivableTotal,
      businessCostTotal: detailBeforeDelete.finance.businessCostTotal ?? 0,
      payableTotal: detailBeforeDelete.finance.payableTotal
    });
    return { ...detailBeforeDelete, shipment };
  }

  async restoreShipment(principal: Principal, shipmentId: string, input: ReviewRestoreInputWithManual = {}): Promise<ShipmentReviewDetailSummary> {
    if (!(await this.hasPermission(principal.role, 'orders:review:restore'))) {
      throw new ForbiddenException('当前角色不能恢复运单');
    }
    const shipment = this.shipments.find((item) => item.id === shipmentId);
    if (!shipment || !shipment.deletedAt) {
      throw new NotFoundException('运单不存在');
    }
    const restoreMode = input.mode ?? 'KEEP_ORIGINAL_TIME';
    const manualCreatedAt = input.manualCreatedAt ? new Date(input.manualCreatedAt) : null;
    if (restoreMode === 'MANUAL_TIME' && (!manualCreatedAt || Number.isNaN(manualCreatedAt.getTime()))) {
      throw new BadRequestException('手动恢复时间不合法');
    }
    const before = { ...shipment };
    this.deletedShipmentIds.delete(shipment.id);
    shipment.deletedAt = undefined;
    shipment.deletedBy = undefined;
    shipment.deletedReason = undefined;
    shipment.deleteType = undefined;
    shipment.restoredAt = new Date().toISOString();
    shipment.restoredBy = principal.username;
    shipment.restoreMode = restoreMode;
    if (shipment.restoreMode === 'RESET_CREATED_TIME') {
      shipment.createdAt = new Date().toISOString();
    }
    if (shipment.restoreMode === 'MANUAL_TIME' && manualCreatedAt) {
      shipment.createdAt = manualCreatedAt.toISOString();
    }
    this.audit('shipment.restore', shipment.id, principal, before, {
      ...shipment,
      reviewStatus: 'RESTORED',
      statusFrom: before.status,
      statusTo: shipment.status,
      reviewer: principal.username,
      restoreReason: input.reason?.trim() || restoreMode
    });
    return this.buildShipmentReviewDetail(principal, shipment);
  }

  async permanentlyDeleteShipmentReview(principal: Principal, shipmentId: string): Promise<{ id: string; deleted: true }> {
    if (!(await this.hasPermission(principal.role, 'orders:review:purge'))) {
      throw new ForbiddenException('当前角色不能彻底删除待审核订单');
    }
    const index = this.shipments.findIndex((shipment) => shipment.id === shipmentId);
    const shipment = index >= 0 ? this.shipments[index] : undefined;
    if (!shipment || !this.deletedShipmentIds.has(shipmentId)) {
      throw new NotFoundException('运单不存在');
    }
    if (shipment.status !== 'DRAFT' && shipment.status !== 'REVIEW_PENDING' && shipment.status !== 'REVIEW_REJECTED') {
      throw new BadRequestException('已进入后续流转的订单不能在待审核模块彻底删除');
    }
    const before = { ...shipment };
    this.shipments.splice(index, 1);
    this.deletedShipmentIds.delete(shipmentId);
    this.audit('shipment.review.purge', shipmentId, principal, before, { deleted: true });
    return { id: shipmentId, deleted: true };
  }

  private async buildShipmentReviewDetail(principal: Principal, shipment: Shipment): Promise<ShipmentReviewDetailSummary> {
    const packageIds = new Set(shipment.draftWarehousePackageIds ?? []);
    const packages = this.warehousePackages
      .filter((pkg) => pkg.shipmentId === shipment.id || packageIds.has(pkg.id))
      .map((pkg): ShipmentReviewPackageSummary => ({
        id: pkg.id,
        warehousePackageId: pkg.id,
        customerOrderNo: pkg.customerOrderNo,
        domesticTrackingNo: pkg.domesticTrackingNo,
        packageNo: pkg.labelNo ?? pkg.sourcePackageNo ?? pkg.combinedOrderNo,
        packageCount: pkg.packageCount,
        weightKg: pkg.weightKg,
        lengthCm: pkg.lengthCm,
        widthCm: pkg.widthCm,
        heightCm: pkg.heightCm,
        cbm: pkg.cbm,
        volumetricWeightKg: pkg.volumetricWeightKg,
        chargeableWeightKg: pkg.chargeableWeightKg,
        inboundAt: pkg.scanTime,
        warehouseRemark: pkg.remark,
        exceptions: pkg.exceptions
      }));
    const fallbackPackages = packages.length ? packages : [{
      id: `${shipment.id}-package`,
      customerOrderNo: shipment.customerOrderNo,
      packageCount: shipment.packageCount,
      weightKg: shipment.receivableWeightKg,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
      cbm: shipment.volumeCbm ?? 0,
      volumetricWeightKg: shipment.agentWeightKg,
      chargeableWeightKg: shipment.receivableWeightKg,
      exceptions: []
    }];
    const finance = await this.getShipmentFinanceDetail(principal, shipment.id);
    const events: ShipmentReviewEventSummary[] = this.auditLogs
      .filter((log) => log.target === shipment.id)
      .map((log) => ({
        id: log.id,
        type: 'AUDIT',
        title: log.actionLabel,
        note: log.action,
        createdAt: log.createdAt,
        operator: log.actorUsername
      }));
    return {
      shipment,
      packages: fallbackPackages,
      finance,
      events,
      trackingEvents: [{
        id: `${shipment.id}-latest`,
        type: 'TRACKING',
        title: shipment.latestTracking,
        toStatus: shipment.status,
        createdAt: shipment.createdAt
      }],
      problemTickets: [],
      files: [],
      approvalWarnings: this.getShipmentReviewApprovalWarnings(shipment, fallbackPackages, finance),
      overdue: Date.now() - new Date(shipment.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000
    };
  }

  private getShipmentReviewApprovalWarnings(
    shipment: Shipment,
    packages: ShipmentReviewPackageSummary[],
    finance: ShipmentFinanceDetailSummary
  ): string[] {
    const warnings: string[] = [];
    if (!shipment.customerCode && !shipment.customerName) warnings.push('客户编号缺失');
    if (!shipment.productName) warnings.push('产品名称缺失');
    if (!shipment.destinationCountry) warnings.push('目的地缺失');
    if (!shipment.channelName && !shipment.carrier) warnings.push('渠道缺失');
    if (!shipment.packageCount || shipment.packageCount <= 0) warnings.push('件数缺失');
    if (!shipment.receivableWeightKg || shipment.receivableWeightKg <= 0) warnings.push('计费重缺失');
    if (!packages.length) warnings.push('单件明细缺失');
    if (!finance.receivables.length || finance.receivableTotal <= 0) warnings.push('应收费用缺失');
    if (!finance.businessCosts?.length || (finance.businessCostTotal ?? 0) <= 0) warnings.push('业务成本缺失');
    return warnings;
  }

  async createShipmentFinanceItem(principal: Principal, shipmentId: string, input: ShipmentFinanceItemCreateInput) {
    await this.ensureFinanceItemManageAccess(principal, input.type);
    const shipment = this.visibleShipment(principal, shipmentId);
    this.ensureBusinessCostEditableAfterDispatch(principal, input.type, shipment);
    const amount = this.resolveShipmentFinanceItemAmount(input.type, input);
    const now = new Date().toISOString();
    const item: StoredShipmentFinanceItem = {
      id: `sfi-${this.shipmentFinanceItems.length + 1}`,
      shipmentId: shipment.id,
      type: input.type,
      name: input.name,
      amount,
      currency: input.currency ?? 'RMB',
      settlementMethod: input.settlementMethod ?? (input.type === 'RECEIVABLE' ? this.resolveReceivableSettlementMethod(shipment) : undefined),
      paymentNo: input.paymentNo,
      reconciliationStatus: input.reconciliationStatus ?? 'PENDING',
      agentName: input.type === 'PAYABLE' || input.type === 'BUSINESS_COST' ? (input.agentName ?? shipment.agentName) : undefined,
      chargeWeightKg: input.chargeWeightKg,
      unitPrice: input.unitPrice,
      amountOverridden: this.isFinanceAmountOverridden({ ...input, amount }),
      remark: input.remark,
      locked: false,
      voided: false,
      createdBy: principal.username,
      createdAt: now,
      updatedAt: now
    };
    this.shipmentFinanceItems.push(item);
    this.audit('shipment.finance_item.create', item.id, principal, null, item);
    this.auditBusinessCostChangeNotification(principal, input.type, shipment, null, item);
    return this.toFinanceItemSummary(item, shipment);
  }

  async getOrderEntryWarehousePackages(principal: Principal, query: { customerCode?: string; domesticTrackingNo?: string }): Promise<WarehousePackageSummary[]> {
    this.ensureOrderEntryAccess(principal);
    const customerCode = query.customerCode?.trim();
    if (!customerCode) {
      return [];
    }
    const customer = this.findCustomerByCode(customerCode);
    if (!customer) {
      return [];
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope && (!customer.salesperson || !scope.includes(customer.salesperson))) {
      return [];
    }
    const draftOccupiedPackageIds = new Set(
      this.shipments
        .filter((shipment) => !shipment.deletedAt)
        .flatMap((shipment) => shipment.draftWarehousePackageIds ?? [])
    );
    const domesticTrackingNo = query.domesticTrackingNo?.trim().toLowerCase();
    return this.warehousePackages
      .filter((pkg) =>
        pkg.customerCode === customer.code
        && !pkg.shipmentId
        && !pkg.systemOrderNo
        && !['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'].includes(pkg.status)
        && !draftOccupiedPackageIds.has(pkg.id)
        && (!domesticTrackingNo || (pkg.domesticTrackingNo ?? '').toLowerCase().includes(domesticTrackingNo))
      )
      .sort((left, right) => {
        const leftTime = new Date(left.scanTime ?? 0).getTime();
        const rightTime = new Date(right.scanTime ?? 0).getTime();
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        return right.id.localeCompare(left.id, 'zh-CN');
      });
  }

  async createOrderEntry(principal: Principal, input: OrderEntryCreateInput): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    if (input.shipment.transferNo?.trim()) {
      throw new BadRequestException('录单阶段不能填写转单号，请在出库后完成双审核再填写');
    }
    this.validateOrderEntryInput(principal, input);
    const packages = this.getOrderEntryPackages(input.warehousePackageIds);
    const totals = this.calculateOrderEntryPackageTotals(packages);
    const channelId = input.shipment.channelId || this.channels.find((channel) => channel.name === input.shipment.receivingChannel)?.id;
    const shipment = await this.createShipment(principal, {
      customerId: input.shipment.customerId ?? this.findCustomerByCode(input.shipment.customerCode)?.id,
	      customerOrderNo: input.shipment.customerOrderNo,
	      systemOrderNo: input.shipment.systemOrderNo,
	      entryAt: input.shipment.entryAt,
      subOrderNo: input.shipment.subOrderNo,
      inboundNo: input.shipment.inboundNo,
      warehousePackageIds: input.submitForReview ? input.warehousePackageIds : undefined,
      draftWarehousePackageIds: input.submitForReview ? undefined : input.warehousePackageIds,
      bindWarehousePackages: input.submitForReview,
      businessType: input.shipment.businessType,
      packageType: input.shipment.packageType,
      destinationCountry: input.shipment.destinationCountry,
      packageCount: totals.packageCount,
      receivableWeightKg: totals.chargeWeightKg,
      agentWeightKg: totals.chargeWeightKg,
      channelId,
      receivingChannel: input.shipment.receivingChannel,
      initialStatus: input.submitForReview ? 'REVIEW_PENDING' : 'DRAFT',
      latestTracking: input.submitForReview ? '财务录单创建，待审核' : '财务录单保存草稿',
      productName: input.shipment.productName,
      declarationRequired: input.shipment.declarationRequired,
      sensitive: input.shipment.sensitive,
      cargoType: input.shipment.cargoType,
      volumeCbm: totals.cbm,
      settlementMethod: input.shipment.settlementMethod,
      tradeTerms: input.shipment.tradeTerms,
      fbaInboundNo: input.shipment.fbaInboundNo,
      receiverName: input.shipment.receiverName,
      receiverCompany: input.shipment.receiverCompany,
      receiverPhone: input.shipment.receiverPhone,
      receiverAddress: input.shipment.receiverAddress,
      receiverCountry: input.shipment.receiverCountry,
      receiverState: input.shipment.receiverState,
      receiverPostalCode: input.shipment.receiverPostalCode,
      fbaWarehouseCode: input.shipment.fbaWarehouseCode,
      remark: input.shipment.remark
    });
    shipment.salesperson = principal.username;
	    const createdItems = this.replaceOrderEntryFinanceItems(principal, shipment.id, input);
	    if (input.submitForReview) this.applyOrderEntryReceiptMatches(principal, input, createdItems);
    this.audit(input.submitForReview ? 'shipment.order_entry.submit' : 'shipment.order_entry.draft', shipment.id, principal, null, {
      warehousePackageIds: input.warehousePackageIds,
      combinedOrderNos: packages.map((pkg) => pkg.combinedOrderNo),
      customerCode: shipment.customerCode,
      packageCount: totals.packageCount,
      weightKg: totals.weightKg,
      volumeCbm: totals.cbm,
      chargeWeightKg: totals.chargeWeightKg,
      destinationCountry: shipment.destinationCountry,
      receiverName: shipment.receiverName,
      salesperson: principal.username,
      businessChannel: input.shipment.receivingChannel || shipment.channelName,
      cargoSummary: {
        cargoType: shipment.cargoType,
        productName: shipment.productName,
        remark: shipment.remark
      },
      entryBy: principal.username,
      entryAt: shipment.entryAt,
      financeItemCount: this.shipmentFinanceItems.filter((item) => item.shipmentId === shipment.id && !item.voided).length
    });
    return this.getOrderEntryDetail(principal, shipment.id);
  }

  async getOrderEntryDetail(principal: Principal, shipmentId: string): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    const shipment = this.getShipmentById(shipmentId);
    const packageIds = new Set(shipment.draftWarehousePackageIds ?? []);
    const packages = this.warehousePackages.filter((pkg) => pkg.shipmentId === shipment.id || packageIds.has(pkg.id));
    const items = this.shipmentFinanceItems.filter((item) => item.shipmentId === shipment.id && !item.voided);
    const canViewPayables = this.canViewOrderEntryPayables(principal);
    const canViewSensitivePayables = this.canUseSensitiveOrderEntryPayables(principal);
    return {
      shipment,
      packages,
      receivables: items.filter((item) => item.type === 'RECEIVABLE').map((item) => this.toReceivableFinanceSummary(item, shipment)),
      businessCosts: items.filter((item) => item.type === 'BUSINESS_COST').map((item) => this.toBusinessCostFinanceSummary(item, shipment)),
      payables: canViewPayables
        ? items.filter((item) => item.type === 'PAYABLE').map((item) => {
          const row = this.toPayableFinanceSummary(item, shipment);
          return canViewSensitivePayables ? row : { ...row, agentName: undefined, paymentNo: undefined };
        })
        : [],
      canViewPayables
    };
  }

  async updateOrderEntryDraft(principal: Principal, shipmentId: string, input: OrderEntryDraftUpdateInput): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    if (input.shipment.transferNo?.trim()) {
      throw new BadRequestException('录单阶段不能填写转单号，请在出库后完成双审核再填写');
    }
    const shipment = this.getShipmentById(shipmentId);
    if (!['DRAFT', 'REVIEW_REJECTED'].includes(shipment.status)) {
      throw new BadRequestException('只有草稿或退回修改的录单可以继续编辑');
    }
    this.validateOrderEntryInput(principal, input);
    const packages = this.getOrderEntryPackages(input.warehousePackageIds, shipment.id);
    const totals = this.calculateOrderEntryPackageTotals(packages);
    const customer = this.findCustomerByCode(input.shipment.customerCode) ?? this.customers.find((item) => item.id === input.shipment.customerId);
    if (!customer) {
      throw new BadRequestException('客户不存在，请先维护客户资料');
    }
    const nextSystemOrderNo = input.shipment.systemOrderNo?.trim() || shipment.systemOrderNo;
    if (this.shipments.some((item) => item.id !== shipment.id && item.systemOrderNo === nextSystemOrderNo)) {
      throw new BadRequestException(`运单号 ${nextSystemOrderNo} 已存在，请更换后再提交`);
    }
    const channel = this.channels.find((item) => item.id === input.shipment.channelId) ?? this.channels.find((item) => item.name === input.shipment.receivingChannel);
    Object.assign(shipment, {
      customerId: customer.id,
      customerName: `${customer.code}-${customer.name}`,
	      customerCode: customer.code,
	      salesperson: principal.username,
      entryBy: principal.username,
	      customerOrderNo: input.shipment.customerOrderNo.trim(),
	      systemOrderNo: nextSystemOrderNo,
	      entryAt: input.shipment.entryAt && this.canEditOrderEntryEntryAt(principal) ? new Date(input.shipment.entryAt).toISOString() : shipment.entryAt,
      subOrderNo: input.shipment.subOrderNo?.trim() || undefined,
      inboundNo: input.shipment.inboundNo?.trim() || undefined,
      draftWarehousePackageIds: input.submitForReview ? [] : input.warehousePackageIds,
      productName: input.shipment.productName.trim(),
      declarationRequired: input.shipment.declarationRequired,
      sensitive: input.shipment.sensitive ?? false,
      cargoType: input.shipment.cargoType.trim(),
      volumeCbm: totals.cbm,
      settlementMethod: input.shipment.settlementMethod.trim(),
      tradeTerms: input.shipment.tradeTerms?.trim() || undefined,
      fbaInboundNo: input.shipment.fbaInboundNo?.trim() || undefined,
      receiverName: input.shipment.receiverName?.trim() || undefined,
      receiverCompany: input.shipment.receiverCompany?.trim() || undefined,
      receiverPhone: input.shipment.receiverPhone?.trim() || undefined,
      receiverAddress: input.shipment.receiverAddress?.trim() || undefined,
      receiverCountry: input.shipment.receiverCountry?.trim() || undefined,
      receiverState: input.shipment.receiverState?.trim() || undefined,
      receiverPostalCode: input.shipment.receiverPostalCode?.trim() || undefined,
      fbaWarehouseCode: input.shipment.fbaWarehouseCode?.trim() || undefined,
      remark: input.shipment.remark?.trim() || undefined,
      destinationCountry: input.shipment.destinationCountry.trim(),
      packageType: input.shipment.packageType,
      packageCount: totals.packageCount,
      receivableWeightKg: totals.chargeWeightKg,
      agentWeightKg: totals.chargeWeightKg,
      ...(channel ? { channelId: channel.id, channelName: channel.name, carrier: input.shipment.receivingChannel?.trim() || channel.carrier } : {}),
      status: input.submitForReview ? 'REVIEW_PENDING' : 'DRAFT',
      latestTracking: input.submitForReview ? '财务录单提交审核' : '财务录单草稿已更新'
    });
    if (input.submitForReview) {
      packages.forEach((pkg) => {
        pkg.shipmentId = shipment.id;
        pkg.systemOrderNo = shipment.systemOrderNo;
      });
    }
    this.shipmentFinanceItems
      .filter((item) => item.shipmentId === shipment.id && !item.locked && item.reconciliationStatus !== 'CONFIRMED' && item.reconciliationStatus !== 'LOCKED')
      .forEach((item) => {
        item.voided = true;
        item.reconciliationStatus = 'VOIDED';
        item.voidedAt = new Date().toISOString();
      });
	    const createdItems = this.replaceOrderEntryFinanceItems(principal, shipment.id, input);
	    if (input.submitForReview) this.applyOrderEntryReceiptMatches(principal, input, createdItems);
    this.audit(input.submitForReview ? 'shipment.order_entry.draft_submit' : 'shipment.order_entry.draft_update', shipment.id, principal, null, shipment);
    return this.getOrderEntryDetail(principal, shipment.id);
  }

  async updateShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string, input: ShipmentFinanceItemUpdateInput) {
    const shipment = this.visibleShipment(principal, shipmentId);
    const item = this.findEditableFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, item.type);
    this.ensureBusinessCostEditableAfterDispatch(principal, item.type, shipment);
    const before = { ...item };
    const amount = this.resolveShipmentFinanceItemAmount(item.type, input, item);
    Object.assign(item, {
      name: input.name ?? item.name,
      amount,
      currency: input.currency ?? item.currency,
      settlementMethod: input.settlementMethod ?? item.settlementMethod ?? (item.type === 'RECEIVABLE' ? this.resolveReceivableSettlementMethod(shipment) : undefined),
      paymentNo: input.paymentNo ?? item.paymentNo,
      reconciliationStatus: input.reconciliationStatus ?? item.reconciliationStatus,
      agentName: item.type === 'PAYABLE' || item.type === 'BUSINESS_COST' ? (input.agentName ?? item.agentName ?? shipment.agentName) : undefined,
      chargeWeightKg: input.chargeWeightKg ?? item.chargeWeightKg,
      unitPrice: input.unitPrice ?? item.unitPrice,
      amountOverridden: this.isFinanceAmountOverridden({ ...item, ...input, amount }),
      remark: input.remark ?? item.remark,
      updatedAt: new Date().toISOString()
    });
    this.audit('shipment.finance_item.update', item.id, principal, before, item);
    this.auditBusinessCostChangeNotification(principal, item.type, shipment, before, item);
    return this.toFinanceItemSummary(item, shipment);
  }

  async deleteShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = this.visibleShipment(principal, shipmentId);
    const item = this.findEditableFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, item.type);
    this.ensureBusinessCostEditableAfterDispatch(principal, item.type, shipment);
    const before = { ...item };
    item.voided = true;
    item.reconciliationStatus = 'VOIDED';
    item.voidedAt = new Date().toISOString();
    item.updatedAt = item.voidedAt;
    this.audit('shipment.finance_item.void', item.id, principal, before, item);
    this.auditBusinessCostChangeNotification(principal, item.type, shipment, before, item);
    return this.toFinanceItemSummary(item, shipment);
  }

  async lockShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = this.visibleShipment(principal, shipmentId);
    const item = this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, item.type);
    if (item.voided) {
      throw new BadRequestException('已作废费用不能锁定');
    }
    const before = { ...item };
    item.locked = true;
    item.reconciliationStatus = 'LOCKED';
    item.updatedAt = new Date().toISOString();
    this.audit('shipment.finance_item.lock', item.id, principal, before, item);
    return this.toFinanceItemSummary(item, shipment);
  }

  async unlockShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = this.visibleShipment(principal, shipmentId);
    const item = this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, item.type);
    if (item.voided) {
      throw new BadRequestException('已作废费用不能解锁');
    }
    const before = { ...item };
    item.locked = false;
    item.reconciliationStatus = 'PENDING';
    item.updatedAt = new Date().toISOString();
    this.audit('shipment.finance_item.unlock', item.id, principal, before, item);
    return this.toFinanceItemSummary(item, shipment);
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
      customerId: `c-${shipment.customerName.split('-')[0]}`,
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
      customerId: `c-${shipment.customerName.split('-')[0]}`,
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
    const selectedSystemFees = this.receivableFees.filter((fee) => feeIds.includes(fee.id));
    const selectedManualFees = this.shipmentFinanceItems
      .filter((fee) => fee.type === 'RECEIVABLE' && feeIds.includes(fee.id))
      .map((fee) => {
        const shipment = this.shipments.find((item) => item.id === fee.shipmentId);
        return shipment ? { fee, shipment } : undefined;
      })
      .filter((row): row is { fee: StoredShipmentFinanceItem; shipment: Shipment & { customerId: string } } => Boolean(row));
    if (selectedSystemFees.length + selectedManualFees.length !== feeIds.length) {
      throw new BadRequestException('应收费用不存在');
    }
    if (selectedSystemFees.some((fee) => fee.customerId !== input.customerId) || selectedManualFees.some((row) => row.shipment.customerId !== input.customerId)) {
      throw new BadRequestException('应收费用不属于该客户');
    }
    if (selectedSystemFees.some((fee) => fee.settled) || selectedManualFees.some((row) => row.fee.reconciliationStatus === 'CONFIRMED' || row.fee.reconciliationStatus === 'LOCKED')) {
      throw new BadRequestException('应收费用已核销');
    }
    const settledAmount = roundMoney(
      selectedSystemFees.reduce((sum, fee) => sum + fee.amount, 0) + selectedManualFees.reduce((sum, row) => sum + row.fee.amount, 0)
    );
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
      selectedSystemFees.forEach((fee) => {
        fee.settled = true;
      });
      selectedManualFees.forEach((row) => {
        row.fee.reconciliationStatus = 'CONFIRMED';
        row.fee.locked = true;
        row.fee.reviewedBy = 'system';
        row.fee.reviewedAt = now;
        row.fee.updatedAt = now;
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
      settledFees: [
        ...selectedSystemFees.map((fee) => this.toReceivableSummary(fee)),
        ...selectedManualFees.map((row) => this.toReceivableFinanceSummary(row.fee, row.shipment))
      ],
      statement
    };
  }

  async createShipment(principal: Principal, input: ShipmentCreateInput): Promise<Shipment> {
    const customerId = principal.role === 'CUSTOMER' ? principal.customerId : input.customerId;
    if (!customerId) {
      throw new BadRequestException('缺少客户');
    }
    if (input.transferNo?.trim()) {
      throw new BadRequestException('新建运单不能填写转单号，请在出库后完成双审核再填写');
    }
    if (principal.role === 'CUSTOMER' && input.customerId && input.customerId !== principal.customerId) {
      throw new ForbiddenException('客户不能为其他客户创建预报');
    }
    const customer = this.customers.find((item) => item.id === customerId);
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope && (!customer.salesperson || !scope.includes(customer.salesperson))) {
      throw new ForbiddenException('业务员只能操作自己名下客户');
    }
    const channel = this.channels.find((item) => item.id === input.channelId) ?? this.channels[0];
    const receivingChannel = input.receivingChannel?.trim();
    const initialStatus = principal.role === 'CUSTOMER' ? 'DRAFT' : input.initialStatus ?? 'DRAFT';
    if (!['DRAFT', 'REVIEW_PENDING', 'DECLARED'].includes(initialStatus)) {
      throw new BadRequestException('新建运单不能直接进入该状态，请按审核、排货、出库流程操作');
    }
    const latestTracking = input.latestTracking?.trim() || (initialStatus === 'DRAFT' || initialStatus === 'REVIEW_PENDING' ? '新建出货订单，待审核' : '客户已预报');
    this.sequence += 1;
    const shipment: Shipment & { customerId: string; channelId?: string; agentId?: string } = {
      id: `s-created-${this.sequence}`,
      customerId,
      channelId: channel.id,
      createdAt: new Date().toISOString(),
      entryAt: input.entryAt ? new Date(input.entryAt).toISOString() : new Date().toISOString(),
      customerName: `${customer.code}-${customer.name}`,
      customerCode: customer.code,
      salesperson: customer.salesperson,
      customerOrderNo: input.customerOrderNo.trim(),
      systemOrderNo: principal.role === 'CUSTOMER' ? createSystemOrderNo(input.businessType, new Date(), this.sequence) : input.systemOrderNo?.trim() || createSystemOrderNo(input.businessType, new Date(), this.sequence),
      subOrderNo: input.subOrderNo?.trim() || undefined,
      inboundNo: input.inboundNo?.trim() || undefined,
      draftWarehousePackageIds: [],
      outboundAt: input.outboundAt,
      productName: input.productName?.trim() || undefined,
      declarationRequired: input.declarationRequired ?? false,
      sensitive: input.sensitive ?? false,
      cargoType: input.cargoType?.trim() || undefined,
      volumeCbm: input.volumeCbm,
      settlementMethod: input.settlementMethod?.trim() || undefined,
      tradeTerms: input.tradeTerms?.trim() || undefined,
      fbaInboundNo: input.fbaInboundNo?.trim() || undefined,
      receiverName: input.receiverName?.trim() || undefined,
      receiverCompany: input.receiverCompany?.trim() || undefined,
      receiverPhone: input.receiverPhone?.trim() || undefined,
      receiverAddress: input.receiverAddress?.trim() || undefined,
      receiverCountry: input.receiverCountry?.trim() || undefined,
      receiverState: input.receiverState?.trim() || undefined,
      receiverPostalCode: input.receiverPostalCode?.trim() || undefined,
      fbaWarehouseCode: input.fbaWarehouseCode?.trim() || undefined,
      remark: input.remark?.trim() || undefined,
      entryBy: principal.username,
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
    if (this.shipments.some((item) => item.systemOrderNo === shipment.systemOrderNo)) {
      throw new BadRequestException(`运单号 ${shipment.systemOrderNo} 已存在，请更换后再提交`);
    }
    const requestedWarehousePackageIds = Array.from(
      new Set([...(input.warehousePackageIds ?? []), ...(input.draftWarehousePackageIds ?? [])].map((id) => id.trim()).filter(Boolean))
    );
    const shouldBindWarehousePackages = input.bindWarehousePackages ?? Boolean((input.warehousePackageIds ?? []).length);
    if (requestedWarehousePackageIds.length) {
      const packages = requestedWarehousePackageIds.map((id) => this.warehousePackages.find((pkg) => pkg.id === id));
      if (packages.some((pkg) => !pkg)) {
        throw new BadRequestException('部分仓库包裹不存在');
      }
      if (shouldBindWarehousePackages && packages.some((pkg) => pkg?.shipmentId || pkg?.systemOrderNo)) {
        throw new BadRequestException('选中的仓库包裹已绑定运单，请重新选择待录单包裹');
      }
      if (shouldBindWarehousePackages) {
        packages.forEach((pkg) => {
          if (pkg) {
            pkg.shipmentId = shipment.id;
            pkg.systemOrderNo = shipment.systemOrderNo;
          }
        });
        this.audit('shipment.warehouse_packages.bind', shipment.id, principal, null, {
          warehousePackageIds: requestedWarehousePackageIds,
          systemOrderNo: shipment.systemOrderNo
        });
      } else {
        shipment.draftWarehousePackageIds = requestedWarehousePackageIds;
        this.audit('shipment.warehouse_packages.snapshot', shipment.id, principal, null, {
          draftWarehousePackageIds: requestedWarehousePackageIds,
          systemOrderNo: shipment.systemOrderNo
        });
      }
    }
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
    if (shipment.status === 'DECLARED') {
      const before = { status: shipment.status };
      shipment.status = 'WAITING_RECEIVE';
      shipment.latestTracking = '已收货';
      this.audit('shipment.receive', shipment.id, principal, before, { status: shipment.status });
      return shipment;
    }
    throw new BadRequestException('当前状态不允许确认收货');
  }

  async routeShipment(principal: Principal, shipmentId: string, body: ShipmentRouteInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!body.channelId) {
      throw new BadRequestException('缺少渠道');
    }
    if (!body.agentId) {
      throw new BadRequestException('请选择代理');
    }
    const chargeWeightKg = Number(body.chargeWeightKg);
    const unitPrice = Number(body.unitPrice);
    const otherFee = Number(body.otherFee ?? 0);
    const otherFeeRemark = body.otherFeeRemark?.trim();
    const manualAgentChannelName = body.agentChannelName?.trim();
    if (!Number.isFinite(chargeWeightKg) || chargeWeightKg <= 0) {
      throw new BadRequestException('请填写市场计费重');
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new BadRequestException('请填写市场成本单价');
    }
    if (!Number.isFinite(otherFee) || otherFee < 0) {
      throw new BadRequestException('其他费用不能小于 0');
    }
    if (otherFee > 0 && !otherFeeRemark) {
      throw new BadRequestException('请填写其他费用包含内容');
    }
    if (!manualAgentChannelName) {
      throw new BadRequestException('请输入代理渠道');
    }
    if (!canTransitionShipment(shipment.status, 'WAITING_DISPATCH')) {
      throw new BadRequestException('当前状态不允许排货');
    }
    const before = { status: shipment.status, channelId: shipment.channelId, agentId: shipment.agentId };
    const channel = this.findEnabledEntity(this.channels, body.channelId, '渠道不存在');
    const agent = this.findEnabledEntity(this.agents, body.agentId, '代理不存在');
    const agentChannel = agent
      ? this.agentChannels.find((item) => item.agentId === agent.id && item.enabled) ?? this.agentChannels.find((item) => item.agentId === agent.id)
      : undefined;
    const payableTotal = roundMoney(chargeWeightKg * unitPrice + otherFee);
    const routedAt = new Date().toISOString();
    this.shipmentFinanceItems.forEach((item) => {
      if (item.shipmentId === shipment.id && item.type === 'PAYABLE' && item.name === '代理成本' && !item.locked) {
        item.voided = true;
        item.voidedAt = routedAt;
        item.updatedAt = routedAt;
      }
    });
    this.shipmentFinanceItems.push({
      id: `sfi-route-${this.shipmentFinanceItems.length + 1}`,
      shipmentId: shipment.id,
      type: 'PAYABLE',
      name: '代理成本',
      amount: payableTotal,
      currency: body.currency ?? 'RMB',
      reconciliationStatus: 'PENDING',
      agentName: agent.name,
      chargeWeightKg,
      unitPrice,
      amountOverridden: false,
      remark: `市场排货渠道：${manualAgentChannelName}${otherFee > 0 ? `；其他费用：${otherFee}${otherFeeRemark ? `；其他费用备注：${otherFeeRemark}` : ''}` : ''}`,
      locked: false,
      voided: false,
      createdBy: principal.username,
      createdAt: routedAt,
      updatedAt: routedAt
    });
    shipment.status = 'WAITING_DISPATCH';
    shipment.channelId = channel.id;
    shipment.channelName = channel.name;
    shipment.carrier = channel.carrier;
    shipment.agentId = agent?.id;
    shipment.agentName = agent?.name ?? shipment.agentName;
    shipment.routedAt = routedAt;
    shipment.routeAgentChannelName = manualAgentChannelName;
    shipment.routeChargeWeightKg = chargeWeightKg;
    shipment.routeUnitPrice = unitPrice;
    shipment.routeOtherFee = otherFee;
    shipment.routeCostTotal = payableTotal;
    shipment.routeCurrency = body.currency ?? 'RMB';
    shipment.shippingMarkRequired = body.shippingMarkRequired === true;
    this.audit('shipment.route', shipment.id, principal, before, {
      status: shipment.status,
      routeStatus: 'WAITING_DISPATCH',
      statusFrom: before.status,
      statusTo: shipment.status,
      companyChannelId: channel.id,
      companyChannelName: channel.name,
      agentId: agent?.id,
      realAgentName: agent?.name,
      agentChannelId: agentChannel?.id,
      agentChannelName: manualAgentChannelName,
      chargeWeightKg,
      unitPrice,
      otherFee,
      otherFeeRemark,
      currency: body.currency ?? 'RMB',
      payableTotal,
      routedBy: principal.username,
      routedAt,
      shippingMarkRequired: shipment.shippingMarkRequired
    });
    this.promoteAgentChannelAfterRepeatedUse(principal, agent, manualAgentChannelName);
    return shipment;
  }

  private promoteAgentChannelAfterRepeatedUse(principal: Principal, agent: AgentSummary, channelName: string) {
    const existing = this.agentChannels.find((item) => item.agentId === agent.id && item.channelName === channelName);
    if (existing) {
      if (!existing.enabled) existing.enabled = true;
      return;
    }
    const usageCount = this.shipmentFinanceItems.filter((item) =>
      item.type === 'PAYABLE'
      && item.name === '代理成本'
      && item.agentName === agent.name
      && item.remark?.startsWith(`市场排货渠道：${channelName}`)
    ).length;
    if (usageCount < 10) return;
    const channel = {
      id: `ach-${this.slug(`${agent.id}-${channelName}`)}`,
      agentId: agent.id,
      agentName: agent.shortName ?? agent.name,
      channelName,
      enabled: true
    };
    this.agentChannels.push(channel);
    this.audit('master_data.agent_channel.create', channel.id, principal, null, channel);
  }

  async dispatchShipment(principal: Principal, shipmentId: string, body: ShipmentDispatchInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const transferNo = body.transferNo ?? shipment.transferNo;
    if (transferNo && this.labels.some((label) => label.shipmentId === shipment.id && label.transferNo === transferNo && label.status === 'VOIDED')) {
      throw new BadRequestException('已作废面单不能出库');
    }
    if (!canTransitionShipment(shipment.status, 'OUTBOUNDED')) {
      throw new BadRequestException('当前状态不允许出库');
    }
    const routeLog = this.auditLogs.find((row) => row.action === 'shipment.route' && row.target === shipment.id);
    if (!routeLog) {
      throw new BadRequestException('运单排货后才能出库');
    }
    const routed = routeLog.after as { agentId?: string; agentChannelName?: string; payableTotal?: number } | undefined;
    if (!shipment.agentId || !shipment.channelId || !routed?.agentChannelName || !routed.payableTotal || routed.payableTotal <= 0) {
      throw new BadRequestException('请先完成代理、渠道和市场成本排货');
    }
    if (shipment.shippingMarkRequired && body.shippingMarkConfirmed !== true) {
      throw new BadRequestException('该票需要贴麦头，请确认已贴麦头后再出库');
    }
    if (transferNo && transferNo !== shipment.transferNo) {
      await this.ensureTransferDataApproved(principal, shipment.id);
    }
    const before = { status: shipment.status, transferNo: shipment.transferNo, outboundAt: shipment.outboundAt };
    const warehousePackages = this.warehousePackages.filter((pkg) => pkg.shipmentId === shipment.id);
    const warehousePackageStatuses = warehousePackages.map((pkg) => ({ id: pkg.id, from: pkg.status, to: 'SHIPPED' }));
    const handoverNo = `HD-${shipment.systemOrderNo}`;
    shipment.transferNo = transferNo ?? undefined;
    shipment.status = 'OUTBOUNDED';
    shipment.latestTracking = '仓库已出库，等待客服补齐转单号';
    shipment.dispatchedAt = new Date().toISOString();
    shipment.outboundAt = shipment.dispatchedAt;
    warehousePackages.forEach((pkg) => {
      pkg.status = 'SHIPPED';
    });
    if (transferNo) {
      this.ensureCarrierTask(shipment, transferNo);
    }
    this.audit('shipment.dispatch', shipment.id, principal, before, {
      status: shipment.status,
      statusFrom: before.status,
      statusTo: shipment.status,
      transferNo: shipment.transferNo,
      outboundAt: shipment.outboundAt,
      outboundOrderNo: shipment.systemOrderNo,
      handoverNo,
      agentName: shipment.agentName,
      agentChannelName: (routeLog.after as { agentChannelName?: string } | undefined)?.agentChannelName,
      channelName: shipment.channelName || shipment.carrier,
      packageCount: shipment.packageCount,
      chargeableWeightKg: shipment.receivableWeightKg,
      waitingDispatchAt: (routeLog.after as { routedAt?: string } | undefined)?.routedAt ?? routeLog.createdAt,
      outboundBy: principal.username,
      customerServiceReceiveStatus: 'PENDING_CONFIRMATION',
      archiveStatus: '已出库归档',
      warehousePackageIds: warehousePackages.map((pkg) => pkg.id),
      warehousePackageStatuses,
      warehousePackageStatusTo: warehousePackages.length ? 'SHIPPED' : undefined,
      shippingMarkRequired: shipment.shippingMarkRequired === true,
      shippingMarkConfirmed: body.shippingMarkConfirmed === true
    });
    return shipment;
  }

  async rerouteShipment(principal: Principal, shipmentId: string, body: ShipmentRerouteInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(shipment.status)) {
      throw new BadRequestException('只有已出库或待离港订单可以退回重排');
    }
    const reason = body.reason?.trim();
    if (!reason) {
      throw new BadRequestException('请填写退回原因');
    }
    const before = {
      status: shipment.status,
      channelId: shipment.channelId,
      channelName: shipment.channelName,
      agentId: shipment.agentId,
      agentName: shipment.agentName
    };
    const now = new Date().toISOString();
    shipment.status = 'WAITING_SORT';
    shipment.latestTracking = '代理退回，等待市场重新排货';
    shipment.routeReturnedAt = now;
    this.audit('shipment.reroute_return', shipment.id, principal, before, {
      status: shipment.status,
      statusFrom: before.status,
      statusTo: shipment.status,
      reason,
      returnedBy: principal.username,
      returnedAt: now
    });
    return shipment;
  }

  async approveShipmentBusinessData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以审核业务数据');
    }
    if (!['WAITING_DISPATCH', 'OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'].includes(shipment.status)) {
      throw new BadRequestException('排货后才能审核业务数据');
    }
    const reviewedAt = new Date().toISOString();
    const differenceFeedback = body.remark?.trim() || undefined;
    this.audit(
      'customer_service.business_data.approved',
      shipment.id,
      principal,
      {
        status: shipment.status,
        businessDataReviewStatus: 'PENDING'
      },
      {
        status: shipment.status,
        statusFrom: shipment.status,
        statusTo: shipment.status,
        businessDataReviewStatus: 'APPROVED',
        reviewer: principal.username,
        reviewedBy: principal.username,
        reviewedAt,
        differenceFeedback,
        remark: differenceFeedback,
        customerCode: shipment.customerCode,
        systemOrderNo: shipment.systemOrderNo,
        destinationCountry: shipment.destinationCountry,
        packageCount: shipment.packageCount,
        chargeableWeightKg: shipment.receivableWeightKg,
        declarationRequired: shipment.declarationRequired,
        sensitive: shipment.sensitive,
        customerServiceReceiveStatus: 'BUSINESS_DATA_APPROVED'
      }
    );
    return shipment;
  }

  async approveShipmentAgentData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以审核代理数据');
    }
    if (!['WAITING_DISPATCH', 'OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'].includes(shipment.status)) {
      throw new BadRequestException('排货后才能审核代理数据');
    }
    const reviewedAt = new Date().toISOString();
    const differenceFeedback = body.remark?.trim() || undefined;
    this.audit(
      'customer_service.agent_data.approved',
      shipment.id,
      principal,
      {
        status: shipment.status,
        agentId: shipment.agentId,
        channelId: shipment.channelId,
        agentDataReviewStatus: 'PENDING'
      },
      {
        status: shipment.status,
        statusFrom: shipment.status,
        statusTo: shipment.status,
        agentDataReviewStatus: 'APPROVED',
        agentId: shipment.agentId,
        agentName: shipment.agentName,
        channelId: shipment.channelId,
        agentChannelName: shipment.channelName || shipment.carrier,
        agentChargeWeightKg: shipment.agentWeightKg,
        reviewer: principal.username,
        reviewedBy: principal.username,
        reviewedAt,
        differenceFeedback,
        remark: differenceFeedback,
        customerCode: shipment.customerCode,
        systemOrderNo: shipment.systemOrderNo,
        customerServiceReceiveStatus: 'AGENT_DATA_APPROVED'
      }
    );
    return shipment;
  }

  async updateShipmentOperational(principal: Principal, shipmentId: string, input: ShipmentOperationalUpdateInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const before = { ...shipment };
    const transferNo = input.transferNo !== undefined ? input.transferNo.trim() || undefined : shipment.transferNo;
    const subOrderNo = input.subOrderNo !== undefined ? input.subOrderNo.trim() || undefined : shipment.subOrderNo;
    const channel = input.channelId ? this.findEnabledEntity(this.channels, input.channelId, '渠道不存在') : undefined;
    let nextStatus = input.status ?? shipment.status;
    if (transferNo && transferNo !== shipment.transferNo) {
      if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
        throw new ForbiddenException('只有客服或管理员可以填写转单号');
      }
      await this.ensureTransferDataApproved(principal, shipment.id);
    }
    if (!(nextStatus in shipmentStatusLabels)) {
      throw new BadRequestException('运单状态无效');
    }
    if (shipment.status !== nextStatus && !canTransitionShipment(shipment.status, nextStatus)) {
      throw new BadRequestException('当前状态不允许流转到目标状态');
    }
    if (shipment.status !== nextStatus && nextStatus === 'WAITING_SORT') {
      throw new BadRequestException('请通过待审核通过进入待排货');
    }
    if (shipment.status !== nextStatus && nextStatus === 'OUTBOUNDED') {
      throw new BadRequestException('请通过仓库出库进入已出库');
    }
    if (nextStatus === 'SIGNED' && !transferNo) {
      throw new BadRequestException('签收前必须填写转单号');
    }
    if (shipment.status !== 'SIGNED' && nextStatus === 'SIGNED') {
      if (principal.role !== 'ADMIN' && (!shipment.salesperson || shipment.salesperson !== principal.username)) {
        await this.recordPermissionDenied(principal, { permissions: ['customer_service:signature:confirm'], method: 'PATCH', path: `/api/shipments/${shipmentId}/operational` });
        throw new ForbiddenException('只能由订单归属业务员确认签收');
      }
    }
    if (nextStatus === 'DEPARTED' && !(input.etaAt ?? shipment.etaAt) || nextStatus === 'DEPARTED' && !(input.etdAt ?? shipment.etdAt)) {
      throw new BadRequestException('确认离港前必须填写 ETA 和 ETD');
    }
    const latestTracking = input.latestTracking?.trim();
    if (input.latestTracking !== undefined && !latestTracking) {
      throw new BadRequestException('最新轨迹不能为空');
    }
    if (latestTracking !== undefined) {
      shipment.latestTracking = latestTracking;
      shipment.trackingStaleDays = 0;
    }
    shipment.transferNo = transferNo;
    shipment.subOrderNo = subOrderNo;
    if (channel) {
      shipment.channelId = channel.id;
      shipment.channelName = channel.name;
      shipment.carrier = channel.carrierName || channel.carrier;
    }
    shipment.customerOrderNo = input.customerOrderNo?.trim() || shipment.customerOrderNo;
    shipment.productName = input.productName?.trim() || shipment.productName;
    shipment.destinationCountry = input.destinationCountry?.trim() || shipment.destinationCountry;
    shipment.cargoType = input.cargoType?.trim() || shipment.cargoType;
    shipment.settlementMethod = input.settlementMethod?.trim() || shipment.settlementMethod;
    shipment.packageCount = input.packageCount ?? shipment.packageCount;
    shipment.receivableWeightKg = input.receivableWeightKg ?? shipment.receivableWeightKg;
    shipment.agentWeightKg = input.agentWeightKg ?? input.receivableWeightKg ?? shipment.agentWeightKg;
    shipment.volumeCbm = input.volumeCbm ?? shipment.volumeCbm;
    shipment.declarationRequired = input.declarationRequired ?? shipment.declarationRequired;
    shipment.sensitive = input.sensitive ?? shipment.sensitive;
    shipment.etaAt = input.etaAt ?? shipment.etaAt;
    shipment.etdAt = input.etdAt ?? shipment.etdAt;
    shipment.status = nextStatus;
    if (shipment.status === 'WAITING_DEPARTURE' && shipment.transferNo) {
      this.ensureCarrierTask(shipment, shipment.transferNo);
    }
    const transferNoChanged = before.transferNo !== shipment.transferNo;
    const label = shipment.transferNo ? this.labels.find((item) => item.shipmentId === shipment.id && item.transferNo === shipment.transferNo && item.status === 'CREATED') : undefined;
    const trackingWebsite = input.trackingWebsite?.trim() || (shipment.transferNo ? this.trackingWebsiteForCarrier(shipment.carrier, shipment.transferNo) : undefined);
    const trackingWebsiteTouched = input.trackingWebsite !== undefined || input.trackingWebsiteVisibleToSales !== undefined;
    this.audit('shipment.operational.update', shipment.id, principal, before, {
      ...shipment,
      ...(trackingWebsiteTouched
        ? {
            trackingWebsite,
            trackingWebsiteVisibleToSales: input.trackingWebsiteVisibleToSales ?? false
          }
        : {}),
      ...(transferNoChanged
        ? {
            transferNoFrom: before.transferNo,
            transferNoTo: shipment.transferNo,
            transferNoFilledBy: principal.username,
            transferNoFilledAt: new Date().toISOString(),
            labelUrl: label?.labelUrl
          }
        : {})
    });
    if (before.status !== shipment.status) {
      const statusAt = new Date().toISOString();
      const statusEnteredAt = this.shipmentStatusEnteredAt(shipment, before.status);
      this.audit(
        'customer_service.status.update',
        shipment.id,
        principal,
        { status: before.status, statusAt: statusEnteredAt },
        {
          status: shipment.status,
          statusFrom: before.status,
          statusTo: shipment.status,
          statusAt,
          dwellHours: this.dwellHours(statusEnteredAt, statusAt),
          latestTracking: shipment.latestTracking,
          etaAt: shipment.etaAt,
          etdAt: shipment.etdAt,
          changedBy: principal.username
        }
      );
    }
    if (before.etaAt !== shipment.etaAt || before.etdAt !== shipment.etdAt) {
      this.audit(
        'customer_service.eta.update',
        shipment.id,
        principal,
        { etaAt: before.etaAt, etdAt: before.etdAt },
        { etaAt: shipment.etaAt, etdAt: shipment.etdAt, status: shipment.status }
      );
    }
    if (before.status !== 'SIGNED' && shipment.status === 'SIGNED') {
      const signedAt = new Date().toISOString();
      shipment.signedAt = signedAt;
      this.audit('shipment.sign', shipment.id, principal, before, shipment);
      this.audit(
        'customer_service.signature.confirm',
        shipment.id,
        principal,
        { status: before.status },
        {
          status: shipment.status,
          statusFrom: before.status,
          statusTo: shipment.status,
          signedBy: principal.username,
          signatureConfirmedBy: principal.username,
          signedAt,
          signatureConfirmedAt: signedAt,
          transferNo: shipment.transferNo
        }
      );
    }
    return shipment;
  }

  async registerShipmentPayment(principal: Principal, shipmentId: string, input: ShipmentPaymentUpdateInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const hasUsd = input.paymentAmountUsd !== undefined && input.paymentAmountUsd !== null;
    const hasCny = input.paymentAmountCny !== undefined && input.paymentAmountCny !== null;
    if (!hasUsd && !hasCny) {
      throw new BadRequestException('USD 或 RMB 至少填写一个');
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
    await this.ensureTransferDataApproved(principal, shipment.id);
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
    const before = { status: shipment.status, transferNo: shipment.transferNo };
    shipment.transferNo = transferNo;
    shipment.latestTracking = '已生成面单';
    shipment.trackingStaleDays = 0;
    this.audit('shipment.label.create', shipment.id, principal, before, {
      labelId: label.id,
      labelNo,
      labelUrl: label.labelUrl,
      transferNo,
      transferNoFilledBy: principal.username,
      transferNoFilledAt: now.toISOString(),
      trackingWebsite: this.trackingWebsiteForCarrier(shipment.carrier, transferNo),
      trackingWebsiteVisibleToSales: false,
      status: shipment.status
    });
    return { label, shipment };
  }

  async uploadShipmentLabel(
    principal: Principal,
    shipmentId: string,
    input: { fileName: string; mimeType: string; sizeBytes: number; url: string; transferNo?: string }
  ): Promise<LabelCreateResponse> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以上传面单');
    }
    if (!['OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'].includes(shipment.status)) {
      throw new BadRequestException('当前状态不允许上传面单');
    }
    const transferNo = input.transferNo?.trim() || shipment.transferNo;
    if (!transferNo) {
      throw new BadRequestException('上传面单前必须填写转单号');
    }
    const now = new Date();
    const sequence = this.labels.length + 1;
    const labelNo = `UPL${this.formatDate(now)}${String(sequence).padStart(5, '0')}`;
    const label: StoredLabel = {
      id: `lbl-${sequence}`,
      shipmentId: shipment.id,
      carrier: this.toCarrierAdapterCode(shipment.carrier),
      channelName: shipment.channelName,
      labelNo,
      transferNo,
      labelUrl: input.url,
      status: 'CREATED',
      createdAt: now.toISOString()
    };
    this.labels.unshift(label);
    const before = { transferNo: shipment.transferNo };
    shipment.transferNo = transferNo;
    shipment.latestTracking = '已上传面单';
    shipment.trackingStaleDays = 0;
    this.audit('shipment.label.upload', shipment.id, principal, before, {
      labelId: label.id,
      labelNo,
      labelUrl: label.labelUrl,
      transferNo,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedBy: principal.username,
      uploadedAt: now.toISOString()
    });
    return { label, shipment };
  }

  async uploadShipmentBusinessInvoice(
    principal: Principal,
    shipmentId: string,
    input: { fileName: string; mimeType: string; sizeBytes: number; url: string }
  ) {
    const shipment = this.visibleShipment(principal, shipmentId);
    const agent = this.agents.find((item) => item.id === shipment.agentId || item.name === shipment.agentName);
    if (!agent) {
      throw new BadRequestException('运单未选择代理，不能上传发票');
    }
    if (!agent.invoiceTemplateUrl) {
      throw new BadRequestException('代理未维护发票模板');
    }
    const now = new Date().toISOString();
    const before = {
      businessInvoiceName: shipment.businessInvoiceName,
      businessInvoiceUrl: shipment.businessInvoiceUrl
    };
    shipment.businessInvoiceName = input.fileName;
    shipment.businessInvoiceUrl = input.url;
    shipment.businessInvoiceUploadedBy = principal.username;
    shipment.businessInvoiceUploadedAt = now;
    this.audit('shipment.business_invoice.upload', shipment.id, principal, before, {
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      url: input.url,
      agentId: agent.id,
      agentName: agent.name,
      templateName: agent.invoiceTemplateName,
      uploadedBy: principal.username,
      uploadedAt: now
    });
    return { shipment, fileName: input.fileName, url: input.url };
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
    this.tickets.unshift(ticket);
    this.audit('problem.ticket.create', ticket.id, principal, null, { shipmentId: shipment.id, status: ticket.status, customerVisible: ticket.customerVisible });
    this.audit('customer_service.issue.attach', ticket.id, principal, null, {
      shipmentId: shipment.id,
      originalStatus: shipment.status,
      originalStatusPool: shipment.status,
      issueId: ticket.id,
      issueType: ticket.reason,
      customerVisible: ticket.customerVisible,
      handledBy: principal.username,
      attachedAt: ticket.createdAt
    });
    return this.toTicketSummary(ticket);
  }

  async replyProblemTicket(principal: Principal, ticketId: string, message: string): Promise<ProblemTicketSummary> {
    const ticket = this.visibleTicket(principal, ticketId);
    ticket.replies.push({ id: `ptr-${ticket.replies.length + 1}`, author: principal.username, message, createdAt: new Date().toISOString() });
    this.audit('problem.ticket.reply', ticket.id, principal, null, { message });
    this.audit('customer_service.issue.update', ticket.id, principal, null, {
      issueId: ticket.id,
      shipmentId: ticket.shipmentId,
      status: ticket.status,
      originalStatusPool: this.shipments.find((item) => item.id === ticket.shipmentId)?.status,
      handledBy: principal.username,
      message
    });
    return this.toTicketSummary(ticket);
  }

  async closeProblemTicket(principal: Principal, ticketId: string): Promise<ProblemTicketSummary> {
    const ticket = this.visibleTicket(principal, ticketId);
    const before = { status: ticket.status };
    ticket.status = 'CLOSED';
    ticket.closedAt = new Date().toISOString();
    const shipment = this.shipments.find((item) => item.id === ticket.shipmentId);
    if (shipment) {
      shipment.hasProblemTicket = this.tickets.some((item) => item.shipmentId === shipment.id && item.status !== 'CLOSED');
    }
    this.audit('problem.ticket.close', ticket.id, principal, before, { status: ticket.status });
    this.audit('customer_service.issue.close', ticket.id, principal, before, {
      issueId: ticket.id,
      shipmentId: ticket.shipmentId,
      status: ticket.status,
      originalStatusPool: shipment?.status,
      handledBy: principal.username,
      closedAt: ticket.closedAt
    });
    return this.toTicketSummary(ticket);
  }

  getRoles(): RoleKey[] {
    return Object.keys(this.roleMeta).sort((left, right) => (this.roleMeta[left].sortOrder - this.roleMeta[right].sortOrder) || this.roleMeta[left].label.localeCompare(this.roleMeta[right].label));
  }

  private buildMemoryRoleRow(role: RoleKey): RolePermissionRow {
    const meta = this.roleMeta[role];
    return buildRolePermissionRow(role, this.rolePermissionMatrix[role] ?? defaultPermissionsForRole(role), {
      label: meta?.label ?? getRoleMetadata(role).label,
      description: meta?.description,
      site: meta?.site,
      sortOrder: meta?.sortOrder ?? 0,
      enabled: meta?.enabled ?? true,
      systemBuiltin: meta?.systemBuiltin ?? isBuiltinRoleKey(role)
    });
  }

  private async hasAnyPermission(role: RoleKey, permissions: PermissionKey[]) {
    for (const permission of permissions) {
      if (await this.hasPermission(role, permission)) return true;
    }
    return false;
  }

  private async ensureTransferDataApproved(principal: Principal, shipmentId: string) {
    const approved = new Set(
      this.auditLogs
        .filter((row) => row.target === shipmentId)
        .map((row) => row.action)
    );
    const missing = approved.has('customer_service.business_data.approved') ? [] : ['business_data'];
    if (missing.length === 0) return;
    this.audit('workflow.guard_denied', shipmentId, principal, null, { guard: 'transferNo.requires_data_approval', missing });
    throw new BadRequestException('业务数据确认后才能填写转单号');
  }

  private async ensureFinanceItemManageAccess(principal: Principal, type?: ShipmentFinanceItemType) {
    if (principal.role === 'ADMIN') return;
    if (!type && await this.hasPermission(principal.role, 'finance:settle')) return;
    if (type === 'PAYABLE' && await this.hasAnyPermission(principal.role, ['finance:order-fee:payable:manage', 'finance:payable:manage'])) return;
    if (type === 'BUSINESS_COST' && await this.hasPermission(principal.role, 'finance:business-cost:manage')) return;
    if (type === 'RECEIVABLE' && await this.hasPermission(principal.role, 'finance:settle')) return;
    throw new ForbiddenException('当前角色不能维护该类单票费用');
  }

  private isAfterRouteDispatch(status?: string): boolean {
    return [
      'WAITING_DISPATCH',
      'OUTBOUNDED',
      'WAITING_DEPARTURE',
      'DEPARTED',
      'ARRIVED_PORT',
      'DELIVERING',
      'WAITING_ONLINE',
      'WAITING_SIGNED',
      'WAITING_RETURN',
      'PROBLEM',
      'STUCK',
      'SIGNED'
    ].includes(status ?? '');
  }

  private ensureBusinessCostEditableAfterDispatch(principal: Principal, type: ShipmentFinanceItemType | undefined, shipment: Shipment) {
    if (type !== 'BUSINESS_COST' || !this.isAfterRouteDispatch(shipment.status)) return;
    if (this.operatorCustomerScope(principal)) {
      throw new ForbiddenException('排货后业务员不能修改业务成本，请联系客服或财务处理');
    }
  }

  private auditBusinessCostChangeNotification(
    principal: Principal,
    type: ShipmentFinanceItemType | undefined,
    shipment: Shipment,
    before: unknown,
    after: unknown
  ) {
    if (type !== 'BUSINESS_COST' || !this.isAfterRouteDispatch(shipment.status)) return;
    if (!['CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE', 'FINANCE', 'UG_FINANCE', 'ADMIN'].includes(principal.role)) return;
    this.audit('notification.wecom.business_cost_changed.pending', shipment.id, principal, before, {
      shipmentId: shipment.id,
      systemOrderNo: shipment.systemOrderNo,
      status: shipment.status,
      fee: after,
      operator: principal.username
    });
  }

  private isFinanceAmountOverridden(input: { amount?: unknown; chargeWeightKg?: unknown; unitPrice?: unknown }) {
    const amount = Number(input.amount ?? 0);
    const chargeWeightKg = Number(input.chargeWeightKg ?? 0);
    const unitPrice = Number(input.unitPrice ?? 0);
    if (!Number.isFinite(amount) || !Number.isFinite(chargeWeightKg) || !Number.isFinite(unitPrice)) return false;
    if (chargeWeightKg <= 0 || unitPrice <= 0) return false;
    return Math.abs(amount - chargeWeightKg * unitPrice) > 0.01;
  }

  private ensureOrderEntryAccess(principal: Principal) {
    if (!['ADMIN', 'FINANCE', 'UG_FINANCE', 'OPERATOR', 'UG_BUSINESS', 'UG_MARKET', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('当前角色不能使用内部录单');
    }
  }

  private canViewOrderEntryPayables(principal: Principal) {
    return ['ADMIN', 'FINANCE', 'UG_FINANCE', 'OPERATOR', 'UG_BUSINESS', 'UG_MARKET', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role);
  }

  private canUseSensitiveOrderEntryPayables(principal: Principal) {
    return ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(principal.role);
  }

  private canEditOrderEntryEntryAt(principal: Principal) {
    return principal.role === 'ADMIN' || ['FINANCE', 'UG_FINANCE'].includes(principal.role);
  }

  private findCustomerByCode(code?: string) {
    const normalized = code?.trim();
    if (!normalized) return undefined;
    return this.customers.find((customer) => customer.code === normalized);
  }

  private getOrderEntryPackages(packageIds: string[], currentShipmentId?: string) {
    const ids = Array.from(new Set((packageIds ?? []).map((id) => id.trim()).filter(Boolean)));
    const packages = ids.map((id) => this.warehousePackages.find((pkg) => pkg.id === id));
    if (packages.some((pkg) => !pkg)) {
      throw new BadRequestException('部分仓库包裹不存在');
    }
    if (packages.some((pkg) => pkg && (pkg.shipmentId || pkg.systemOrderNo) && pkg.shipmentId !== currentShipmentId)) {
      throw new BadRequestException('选中的仓库包裹已绑定运单，请重新选择待录单包裹');
    }
    return packages.filter((pkg): pkg is WarehousePackageSummary => Boolean(pkg));
  }

  private calculateOrderEntryPackageTotals(packages: WarehousePackageSummary[]) {
    const summary = packages.reduce(
      (total, pkg) => ({
        packageCount: total.packageCount + pkg.packageCount,
        weightKg: total.weightKg + pkg.weightKg,
        cbm: total.cbm + pkg.cbm,
        chargeWeightKg: total.chargeWeightKg + pkg.chargeableWeightKg
      }),
      { packageCount: 0, weightKg: 0, cbm: 0, chargeWeightKg: 0 }
    );
    return {
      packageCount: summary.packageCount || packages.length,
      weightKg: Number(summary.weightKg.toFixed(2)),
      cbm: Number(summary.cbm.toFixed(6)),
      chargeWeightKg: Number((summary.chargeWeightKg || summary.weightKg).toFixed(2))
    };
  }

  private normalizeOrderEntryFinanceItems(type: ShipmentFinanceItemType, rows: OrderEntryFinanceItemInput[] = []) {
    return rows
      .map((row) => {
        const chargeWeightKg = Number(row.chargeWeightKg ?? 0);
        const unitPrice = Number(row.unitPrice ?? 0);
        const calculated = chargeWeightKg > 0 && unitPrice > 0 ? roundMoney(chargeWeightKg * unitPrice) : undefined;
        return {
          ...row,
          type,
          name: row.name?.trim() ?? '',
          amount: calculated ?? Number(row.amount ?? 0),
          currency: row.currency ?? 'RMB',
          reconciliationStatus: 'PENDING' as ShipmentFinanceItemStatus,
          amountOverridden: calculated === undefined ? row.amountOverridden : false
        };
      })
      .filter((row) => row.name && Number.isFinite(row.amount) && row.amount > 0);
  }

  private validateOrderEntryInput(principal: Principal, input: OrderEntryCreateInput) {
    const customer = input.shipment.customerId ? this.customers.find((item) => item.id === input.shipment.customerId) : this.findCustomerByCode(input.shipment.customerCode);
    if (!customer) {
      throw new BadRequestException('客户不存在，请先维护客户资料');
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope && (!customer.salesperson || !scope.includes(customer.salesperson))) {
      throw new ForbiddenException('业务员只能录入自己名下客户');
    }
    const receivables = this.normalizeOrderEntryFinanceItems('RECEIVABLE', input.receivables);
    const businessCosts = this.normalizeOrderEntryFinanceItems('BUSINESS_COST', input.businessCosts);
    const rawPayables = input.payables ?? [];
    if (!this.canUseSensitiveOrderEntryPayables(principal) && rawPayables.some((row) => row.agentName?.trim() || row.paymentNo?.trim())) {
      throw new ForbiddenException('当前角色不能录入代理或付款敏感信息');
    }
    const payables = this.normalizeOrderEntryFinanceItems('PAYABLE', rawPayables);
    if (!this.canViewOrderEntryPayables(principal) && payables.length) {
      throw new ForbiddenException('当前角色不能录入应付费用');
    }
    if (!input.submitForReview) return;
    if (!input.shipment.customerOrderNo?.trim()) throw new BadRequestException('提交审核前必须填写客户单号');
    if (!input.shipment.systemOrderNo?.trim()) throw new BadRequestException('提交审核前必须填写运单号');
    if (!input.shipment.destinationCountry?.trim()) throw new BadRequestException('提交审核前必须填写目的地');
    if (input.shipment.declarationRequired === undefined || input.shipment.declarationRequired === null) throw new BadRequestException('提交审核前必须选择是否报关');
    if (!input.shipment.cargoType?.trim()) throw new BadRequestException('提交审核前必须填写货物属性');
    if (!input.shipment.productName?.trim()) throw new BadRequestException('提交审核前必须填写品名');
    if (!input.shipment.settlementMethod?.trim()) throw new BadRequestException('提交审核前必须填写结算方式');
    if (!input.warehousePackageIds?.length) throw new BadRequestException('提交审核前必须选择至少一条仓库货物');
    const totals = this.calculateOrderEntryPackageTotals(this.getOrderEntryPackages(input.warehousePackageIds));
    if (totals.chargeWeightKg <= 0) throw new BadRequestException('提交审核前必须有计费重');
    if (!receivables.length) throw new BadRequestException('提交审核前必须录入至少一条应收费用');
    if (!businessCosts.length) throw new BadRequestException('提交审核前必须录入至少一条业务成本');
  }

  private replaceOrderEntryFinanceItems(principal: Principal, shipmentId: string, input: OrderEntryCreateInput) {
    const rows = [
      ...this.normalizeOrderEntryFinanceItems('RECEIVABLE', input.receivables),
      ...this.normalizeOrderEntryFinanceItems('BUSINESS_COST', input.businessCosts),
      ...(this.canViewOrderEntryPayables(principal) ? this.normalizeOrderEntryFinanceItems('PAYABLE', input.payables ?? []) : [])
    ];
    const created: StoredShipmentFinanceItem[] = [];
    rows.forEach((row) => {
      const item: StoredShipmentFinanceItem = {
        id: `fi-${Date.now()}-${this.shipmentFinanceItems.length + 1}`,
        shipmentId,
        type: row.type,
        name: row.name,
        amount: row.amount,
        currency: row.currency ?? 'RMB',
        settlementMethod: row.settlementMethod,
        paymentNo: row.paymentNo,
        reconciliationStatus: 'PENDING',
        agentName: row.type === 'RECEIVABLE' ? undefined : row.agentName,
        chargeWeightKg: row.chargeWeightKg,
        unitPrice: row.unitPrice,
        amountOverridden: row.amountOverridden ?? this.isFinanceAmountOverridden(row),
        remark: row.remark,
        locked: false,
        voided: false,
        createdBy: principal.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.shipmentFinanceItems.unshift(item);
      created.push(item);
    });
    return created;
  }

  private applyOrderEntryReceiptMatches(principal: Principal, input: OrderEntryCreateInput, createdItems: StoredShipmentFinanceItem[]) {
    const customer = input.shipment.customerId ? this.customers.find((item) => item.id === input.shipment.customerId) : this.findCustomerByCode(input.shipment.customerCode);
    if (!customer) return;
    const rows = [
      ...this.normalizeOrderEntryFinanceItems('RECEIVABLE', input.receivables),
      ...this.normalizeOrderEntryFinanceItems('BUSINESS_COST', input.businessCosts),
      ...(this.canViewOrderEntryPayables(principal) ? this.normalizeOrderEntryFinanceItems('PAYABLE', input.payables ?? []) : [])
    ];
    rows.forEach((row, index) => {
      const item = createdItems[index];
      if (row.type !== 'RECEIVABLE' || !row.receiptId || !item) return;
      const receipt = this.findWaterReceiptById(row.receiptId);
      if (receipt.customerId !== customer.id) throw new BadRequestException('只能匹配同客户编号下的水单');
      if (!['ARRIVED', 'PARTIAL_MATCHED'].includes(receipt.status)) throw new BadRequestException('只能匹配已到账且未归档的水单');
      if ((item.currency ?? 'RMB') !== (receipt.currency ?? 'RMB')) throw new BadRequestException('水单币种与应收币种不一致');
      const amount = roundMoney(Math.min(Number(row.receiptMatchAmount ?? item.amount), item.amount));
      if (amount <= 0 || amount > receipt.balance) throw new BadRequestException('匹配金额不能超过水单余额');
      item.receivedAmount = amount;
      item.receiptStatus = amount >= item.amount ? 'RECEIVED' : 'PARTIAL';
      item.receivedAt = item.receiptStatus === 'RECEIVED' ? new Date().toISOString() : undefined;
      item.paymentNo = receipt.receiptNo;
      receipt.matches.push({ id: `wrm-${receipt.matches.length + 1}`, waterReceiptId: receipt.id, receivableFinanceItemId: item.id, shipmentId: item.shipmentId, systemOrderNo: input.shipment.systemOrderNo ?? '', customerCode: receipt.customerCode ?? '', feeName: item.name, amount, createdAt: new Date().toISOString() });
      receipt.matchedAmount = roundMoney(receipt.matchedAmount + amount);
      receipt.balance = roundMoney(receipt.amount - receipt.matchedAmount);
      receipt.status = receipt.balance <= 0 ? 'ARCHIVED' : 'PARTIAL_MATCHED';
      const account = this.customerAccounts.find((entry) => entry.customerId === receipt.customerId && entry.currency === receipt.currency);
      if (account) account.balance = roundMoney(account.balance - amount);
      if (receipt.accountLedgerId) {
        const ledger = this.accountLedger.find((entry) => entry.id === receipt.accountLedgerId);
        if (ledger) ledger.balance = receipt.balance;
      }
      this.audit('shipment.order_entry.receipt_match', receipt.id, principal, null, { receivableFinanceItemId: item.id, amount, receiptNo: receipt.receiptNo });
    });
  }

  private findFinanceItem(shipmentId: string, feeId: string) {
    const item = this.shipmentFinanceItems.find((entry) => entry.shipmentId === shipmentId && entry.id === feeId);
    if (!item) {
      throw new NotFoundException('费用项目不存在');
    }
    return item;
  }

  private findEditableFinanceItem(shipmentId: string, feeId: string) {
    const item = this.findFinanceItem(shipmentId, feeId);
    if (item.voided) {
      throw new BadRequestException('已作废费用不能继续操作');
    }
    if (item.locked) {
      throw new BadRequestException('费用已锁定，请先解锁');
    }
    return item;
  }

  private toFinanceItemSummary(item: StoredShipmentFinanceItem, shipment: Shipment) {
    if (item.type === 'RECEIVABLE') {
      return this.toReceivableFinanceSummary(item, shipment);
    }
    if (item.type === 'PAYABLE') {
      return this.toPayableFinanceSummary(item, shipment);
    }
    return this.toBusinessCostFinanceSummary(item, shipment);
  }

  private buildReceivableAuditListResponse(rows: ReceivableAuditSummary[], query: ReceivableAuditListQuery): ReceivableAuditListResponse {
    const status = query.reconciliationStatus ?? query.status ?? 'ALL';
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const inRange = (value: string | undefined, from?: string, to?: string) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
    const filtered = rows.filter((row) => {
      const customerNeedle = query.customer?.trim();
      const customerMatches = !customerNeedle || [row.customerCode, row.customerName, row.customerOrderNo].some((value) => keyword(value, customerNeedle));
      const statusMatches = status === 'ALL' ? !row.voided : row.reconciliationStatus === status;
      return statusMatches
        && customerMatches
        && keyword(row.systemOrderNo, query.systemOrderNo)
        && keyword(row.customerCode, query.customerCode)
        && keyword(row.customerName, query.customerName)
        && keyword(row.transferNo, query.transferNo)
        && keyword(row.salesperson, query.salesperson)
        && keyword(row.name, query.feeName)
        && keyword(row.createdBy, query.createdBy)
        && keyword(row.reviewedBy, query.reviewedBy)
        && keyword(row.paymentNo, query.paymentNo)
        && keyword(row.remark, query.remark)
        && inRange(row.createdAt, query.createdFrom, query.createdTo)
        && inRange(row.reviewedAt, query.reviewedFrom, query.reviewedTo);
    });
    const decorated = this.decorateReceivableRows(filtered);
    const activeRows = decorated.filter((row) => !row.voided);
    const amountByCurrency = Array.from(
      activeRows.reduce((map, row) => {
        const currency = row.currency ?? 'RMB';
        map.set(currency, roundMoney((map.get(currency) ?? 0) + row.amount));
        return map;
      }, new Map<string, number>())
    ).map(([currency, amount]) => ({ currency, amount }));
    const sorted = [...decorated].sort((left, right) => this.compareReceivableRows(left, right, query.sortBy, query.sortOrder));
    const { page, pageSize, rows: pagedRows } = this.paginateRows(sorted, query);
    return {
      rows: pagedRows,
      totals: {
        amountByCurrency,
        rmbTotal: roundMoney(activeRows.reduce((sum, row) => sum + (row.rmbAmount ?? 0), 0)),
        pendingCount: activeRows.filter((row) => row.reconciliationStatus !== 'CONFIRMED').length,
        confirmedCount: activeRows.filter((row) => row.reconciliationStatus === 'CONFIRMED').length,
        voidedCount: decorated.filter((row) => row.voided).length
      },
      pagination: {
        page,
        pageSize,
        totalItems: sorted.length
      }
    };
  }

  private paginateRows<T>(rows: T[], query: { page?: number; pageSize?: number } = {}, defaultPageSize = 10) {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const rawPageSize = Number(query.pageSize ?? defaultPageSize);
    if (rawPageSize <= 0) {
      return { page, pageSize: Math.max(1, rows.length), rows };
    }
    const pageSize = Math.min(10000, Math.max(1, rawPageSize || defaultPageSize));
    return { page, pageSize, rows: rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize) };
  }

  private decorateReceivableRows(rows: ReceivableAuditSummary[]): ReceivableAuditSummary[] {
    const usdRate = this.getUsdToRmbRate(rows);
    const decorated = rows.map((row) => {
      const currency = row.currency ?? 'RMB';
      const ledger = row.paymentNo ? this.accountLedger.find((entry) => entry.id === row.paymentNo) : undefined;
      const receipt = row.paymentNo ? this.waterReceipts.find((entry) => entry.id === row.paymentNo || entry.receiptNo === row.paymentNo || entry.accountLedgerId === row.paymentNo) : undefined;
      return {
        ...row,
        currency,
        rmbAmount: this.toReceivableRmbAmount(row.amount, currency, usdRate),
        matchedReceiptNo: row.paymentNo,
        receiptBalance: receipt?.balance ?? ledger?.balance
      };
    });
    const orderTotals = decorated.reduce((map, row) => {
      if (row.voided) return map;
      map.set(row.systemOrderNo, roundMoney((map.get(row.systemOrderNo) ?? 0) + (row.rmbAmount ?? 0)));
      return map;
    }, new Map<string, number>());
    return decorated.map((row) => ({ ...row, orderRmbTotal: orderTotals.get(row.systemOrderNo) ?? 0 }));
  }

  private getUsdToRmbRate(rows: ReceivableAuditSummary[]) {
    if (!rows.some((row) => (row.currency ?? 'RMB').toUpperCase() === 'USD')) return 1;
    const now = Date.now();
    const rate = this.exchangeRates
      .filter((row) => row.baseCurrency === 'USD' && row.quoteCurrency === 'RMB' && row.enabled && Date.parse(row.activeAt) <= now && (!row.endAt || Date.parse(row.endAt) >= now))
      .sort((left, right) => new Date(right.activeAt).getTime() - new Date(left.activeAt).getTime())[0];
    if (!rate) {
      throw new BadRequestException('缺少 USD 到 RMB 的系统汇率，无法计算应收合计');
    }
    return rate.rate;
  }

  private toReceivableRmbAmount(amount: number, currency: string, usdRate: number) {
    const normalized = currency.toUpperCase() === 'CNY' ? 'RMB' : currency.toUpperCase();
    if (normalized === 'RMB') return roundMoney(amount);
    if (normalized === 'USD') return roundMoney(amount * usdRate);
    throw new BadRequestException(`暂不支持 ${currency} 应收折算 RMB`);
  }

  private resolveShipmentFinanceItemAmount(type: ShipmentFinanceItemType, input: ShipmentFinanceItemCreateInput | ShipmentFinanceItemUpdateInput, current?: StoredShipmentFinanceItem) {
    const chargeWeightKg = input.chargeWeightKg ?? current?.chargeWeightKg;
    const unitPrice = input.unitPrice ?? current?.unitPrice;
    if ((type === 'BUSINESS_COST' || type === 'PAYABLE') && chargeWeightKg !== undefined && unitPrice !== undefined) {
      return roundMoney(Number(chargeWeightKg) * Number(unitPrice));
    }
    return Number(input.amount ?? current?.amount ?? 0);
  }

  private getShipmentFinanceDetailUsdToRmbRate(rows: Array<{ currency?: string }>) {
    if (!rows.some((row) => (row.currency ?? 'RMB').toUpperCase() === 'USD')) return 1;
    const now = Date.now();
    const rate = this.exchangeRates
      .filter((row) => row.baseCurrency === 'USD' && row.quoteCurrency === 'RMB' && row.enabled && Date.parse(row.activeAt) <= now && (!row.endAt || Date.parse(row.endAt) >= now))
      .sort((left, right) => new Date(right.activeAt).getTime() - new Date(left.activeAt).getTime())[0];
    if (!rate) throw new BadRequestException('缺少 USD 到 RMB 的系统汇率，无法计算单票费用合计');
    return rate.rate;
  }

  private toShipmentFinanceDetailRmbAmount(amount: number, currency: string, usdRate: number) {
    const normalized = currency.toUpperCase() === 'CNY' ? 'RMB' : currency.toUpperCase();
    if (normalized === 'RMB') return roundMoney(amount);
    if (normalized === 'USD') return roundMoney(amount * usdRate);
    throw new BadRequestException(`暂不支持 ${currency} 单票费用折算 RMB`);
  }

  private compareReceivableRows(left: ReceivableAuditSummary, right: ReceivableAuditSummary, sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    const direction = sortOrder === 'asc' ? 1 : -1;
    const valueOf = (row: ReceivableAuditSummary) => {
      if (sortBy === 'amount') return row.amount;
      if (sortBy === 'rmbAmount') return row.rmbAmount ?? 0;
      if (sortBy === 'reviewedAt') return row.reviewedAt ? new Date(row.reviewedAt).getTime() : 0;
      if (sortBy === 'systemOrderNo') return row.systemOrderNo;
      if (sortBy === 'customerCode') return row.customerCode;
      if (sortBy === 'name') return row.name;
      return row.createdAt ? new Date(row.createdAt).getTime() : 0;
    };
    const leftValue = valueOf(left);
    const rightValue = valueOf(right);
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue), 'zh-Hans-CN') * direction;
  }

  private async runReceivableBatch(ids: string[], action: (id: string) => Promise<ReceivableAuditSummary>): Promise<ReceivableAuditBatchResult> {
    const rows: ReceivableAuditSummary[] = [];
    const failures: Array<{ id: string; reason: string }> = [];
    for (const id of ids) {
      try {
        rows.push(await action(id));
      } catch (error) {
        failures.push({ id, reason: error instanceof Error ? error.message : '处理失败' });
      }
    }
    return {
      successCount: rows.length,
      failureCount: failures.length,
      rows,
      failures
    };
  }

  private toReceivableFinanceSummary(item: StoredShipmentFinanceItem, shipment: Shipment): ReceivableFeeSummary {
    const createdAt = this.resolveReceivableCreatedAt(item.createdAt, shipment.businessReviewedAt);
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      systemOrderNo: shipment.systemOrderNo,
      customerName: shipment.customerName,
      salesperson: shipment.salesperson,
      name: item.name,
      amount: item.amount,
      settled: item.reconciliationStatus === 'CONFIRMED' || item.reconciliationStatus === 'LOCKED',
      type: 'RECEIVABLE',
      currency: item.currency,
      settlementMethod: this.resolveReceivableSettlementMethod({ ...shipment, settlementMethod: item.settlementMethod }),
      paymentNo: item.paymentNo,
      matchedReceiptNo: item.paymentNo,
      reconciliationStatus: item.reconciliationStatus,
      receivedAmount: item.receivedAmount ?? 0,
      receiptStatus: item.receiptStatus ?? 'UNPAID',
      receivedAt: item.receivedAt,
      createdAt,
      createdBy: item.createdBy,
      reviewedAt: item.reviewedAt,
      reviewedBy: item.reviewedBy,
      remark: item.remark,
      locked: item.locked,
      voided: item.voided,
      sourceType: 'MANUAL',
      amountOverridden: item.amountOverridden ?? false
    };
  }

  private toReceivableAuditSummary(fee: StoredReceivableFee): ReceivableAuditSummary {
    const shipment = this.shipments.find((row) => row.id === fee.shipmentId);
    const createdAt = this.resolveReceivableCreatedAt(fee.createdAt, shipment?.businessReviewedAt);
    return {
      ...this.toReceivableSummary(fee),
      customerId: fee.customerId,
      customerCode: fee.customerCode ?? fee.customerName.split('-')[0],
      customerOrderNo: fee.customerOrderNo ?? shipment?.customerOrderNo,
      transferNo: fee.transferNo ?? shipment?.transferNo,
      salesperson: fee.salesperson ?? shipment?.salesperson,
      paymentNo: fee.paymentNo,
      currency: fee.currency ?? 'RMB',
      settlementMethod: this.resolveReceivableSettlementMethod({ ...shipment, settlementMethod: fee.settlementMethod }),
      reconciliationStatus: fee.reconciliationStatus ?? 'PENDING',
      createdAt,
      createdBy: fee.createdBy,
      reviewedAt: fee.reviewedAt,
      reviewedBy: fee.reviewedBy,
      remark: fee.remark,
      locked: fee.reconciliationStatus === 'CONFIRMED',
      voided: fee.voided,
      sourceType: 'SYSTEM'
    };
  }

  private resolveReceivableCreatedAt(createdAt: string | undefined, businessReviewedAt: string | undefined) {
    if (createdAt && businessReviewedAt) {
      const createdTime = new Date(createdAt).getTime();
      const reviewedTime = new Date(businessReviewedAt).getTime();
      if (!Number.isNaN(createdTime) && !Number.isNaN(reviewedTime) && createdTime <= reviewedTime) {
        return businessReviewedAt;
      }
    }
    return createdAt;
  }

  private toManualReceivableAuditSummary(item: StoredShipmentFinanceItem, shipment: Shipment): ReceivableAuditSummary {
    return {
      ...this.toReceivableFinanceSummary(item, shipment),
      customerId: `c-${shipment.customerName.split('-')[0]}`,
      customerCode: shipment.customerName.split('-')[0],
      customerOrderNo: shipment.customerOrderNo,
      transferNo: shipment.transferNo,
      salesperson: shipment.salesperson,
      reconciliationStatus: item.reconciliationStatus,
      paymentNo: item.paymentNo,
      sourceType: 'MANUAL'
    };
  }

  private toReceivableReviewAuditSnapshot(
    row: StoredReceivableFee | StoredShipmentFinanceItem,
    principal: Principal,
    statusFrom: string | undefined,
    statusTo: string,
    action: 'audit' | 'reverse'
  ) {
    const shipment = 'shipmentId' in row ? this.shipments.find((item) => item.id === row.shipmentId) : undefined;
    const customer = shipment ? this.customers.find((item) => item.id === shipment.customerId) : undefined;
    const receivedAmount = Number((row as { receivedAmount?: number }).receivedAmount ?? 0);
    const paymentNo = (row as { paymentNo?: string }).paymentNo;
    const receiptStatus = (row as { receiptStatus?: string }).receiptStatus ?? 'UNPAID';
    return {
      id: row.id,
      shipmentId: (row as { shipmentId?: string }).shipmentId,
      systemOrderNo: shipment?.systemOrderNo,
      customerCode: customer?.code,
      name: row.name,
      amount: Number(row.amount),
      currency: row.currency ?? 'RMB',
      paymentNo,
      matchedReceiptNo: paymentNo,
      receivedAmount,
      receiptStatus,
      waterReceiptMatched: receivedAmount > 0 || receiptStatus !== 'UNPAID',
      statusFrom: statusFrom ?? 'PENDING',
      statusTo,
      reviewStatus: statusTo,
      reviewedBy: (row as { reviewedBy?: string }).reviewedBy ?? (action === 'audit' ? principal.username : undefined),
      reviewedAt: (row as { reviewedAt?: string }).reviewedAt,
      reversedBy: action === 'reverse' ? principal.username : undefined,
      reversedAt: action === 'reverse' ? new Date().toISOString() : undefined,
      locked: (row as { locked?: boolean }).locked ?? statusTo === 'CONFIRMED'
    };
  }

  private resolveReceivableSettlementMethod(row: any): string {
    const direct = row?.settlementMethod?.trim?.() || row?.settlementMethod;
    if (direct) return direct;
    const customerDefault = row?.customer?.defaultSettlementMethod?.trim?.() || row?.defaultSettlementMethod?.trim?.();
    if (customerDefault) return customerDefault;
    return DEFAULT_RECEIVABLE_SETTLEMENT_METHOD;
  }

  private ensureReceivableAuditEditable(row: { voided?: boolean; locked?: boolean; reconciliationStatus?: ShipmentFinanceItemStatus }) {
    if (row.voided) {
      throw new BadRequestException('应收费用已作废');
    }
    if (row.locked || row.reconciliationStatus === 'CONFIRMED' || row.reconciliationStatus === 'LOCKED') {
      throw new BadRequestException('应收费用已审核，请先反审核');
    }
  }

  private findReceivableFinanceItemById(id: string) {
    const item = this.shipmentFinanceItems.find((row) => row.id === id && row.type === 'RECEIVABLE');
    if (!item) {
      throw new NotFoundException('应收费用不存在');
    }
    return item;
  }

  private findShipmentForReceivableAudit(input: ReceivableAuditCreateInput) {
    const shipment = this.shipments.find((row) => {
      if (input.shipmentId && row.id !== input.shipmentId) return false;
      if (input.systemOrderNo && row.systemOrderNo !== input.systemOrderNo) return false;
      if (input.customerOrderNo && row.customerOrderNo !== input.customerOrderNo) return false;
      if (input.transferNo && row.transferNo !== input.transferNo) return false;
      if (input.customerCode && row.customerName.split('-')[0] !== input.customerCode) return false;
      return Boolean(input.shipmentId || input.systemOrderNo || input.customerOrderNo || input.transferNo || input.customerCode);
    });
    if (!shipment) {
      throw new NotFoundException('未匹配到运单，请检查运单号、转单号或客户编号');
    }
    return shipment;
  }

  private findShipmentForBusinessCostAudit(input: {
    shipmentId?: string;
    systemOrderNo?: string;
    customerOrderNo?: string;
    transferNo?: string;
    customerCode?: string;
  }) {
    const shipment = this.shipments.find((row) => {
      if (input.shipmentId && row.id !== input.shipmentId) return false;
      if (input.systemOrderNo && row.systemOrderNo !== input.systemOrderNo) return false;
      if (input.customerOrderNo && row.customerOrderNo !== input.customerOrderNo) return false;
      if (input.transferNo && row.transferNo !== input.transferNo) return false;
      if (input.customerCode && row.customerName.split('-')[0] !== input.customerCode) return false;
      return Boolean(input.shipmentId || input.systemOrderNo || input.customerOrderNo || input.transferNo || input.customerCode);
    });
    if (!shipment) {
      throw new NotFoundException('未匹配到运单，请检查运单号、转单号或客户编号');
    }
    return shipment;
  }

  private async ensureBusinessCostPermission(principal: Principal, permission: PermissionKey) {
    if (!(await this.hasPermission(principal.role, permission))) {
      throw new ForbiddenException('没有业务员成本权限');
    }
  }

  private async ensurePayablePermission(principal: Principal, permission: PermissionKey) {
    if (!(await this.hasPermission(principal.role, permission))) {
      throw new ForbiddenException('没有市场应付审核权限');
    }
  }

  private async ensureWaterReceiptPermission(principal: Principal, permission: PermissionKey) {
    if (!(await this.hasPermission(principal.role, permission))) {
      throw new ForbiddenException('当前角色没有水单权限');
    }
  }

  private findCustomerForWaterReceipt(customerId?: string, customerCode?: string) {
    if (!customerId && !customerCode) return undefined;
    const customer = this.customers.find((row) => (customerId ? row.id === customerId : true) && (customerCode ? row.code === customerCode : true));
    if (!customer) throw new BadRequestException('客户不存在');
    return customer;
  }

  private nextMemoryWaterReceiptNo(receiptDate: string) {
    const ymd = receiptDate.slice(0, 10).replaceAll('-', '');
    const prefix = `SD${ymd}`;
    const count = this.waterReceipts.filter((row) => row.receiptNo.startsWith(prefix)).length;
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  private findWaterReceiptById(id: string) {
    const row = this.waterReceipts.find((item) => item.id === id || item.receiptNo === id);
    if (!row) throw new NotFoundException('水单不存在');
    return row;
  }

  private buildWaterReceiptListResponse(rows: WaterReceiptSummary[], query: WaterReceiptListQuery = {}): WaterReceiptListResponse {
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const filtered = rows.filter((row) => {
      const status = query.status ?? 'ALL';
      return (status === 'ALL' || row.status === status)
        && keyword(row.receiptNo, query.receiptNo)
        && keyword(row.site, query.site)
        && keyword(row.salesperson, query.salesperson)
        && keyword(row.customerCode, query.customerCode)
        && keyword(row.receiptMethod, query.receiptMethod)
        && keyword(row.paymentNo, query.paymentNo)
        && keyword(row.remark, query.remark)
        && (query.minAmount === undefined || row.amount >= Number(query.minAmount))
        && (query.maxAmount === undefined || row.amount <= Number(query.maxAmount));
    });
    const totals = filtered.reduce((acc, row) => {
      acc.amount = roundMoney(acc.amount + row.amount);
      acc.matchedAmount = roundMoney(acc.matchedAmount + row.matchedAmount);
      acc.balance = roundMoney(acc.balance + row.balance);
      if (row.status === 'PENDING') acc.pendingCount += 1;
      if (row.status === 'ARRIVED' || row.status === 'PARTIAL_MATCHED') acc.arrivedCount += 1;
      if (row.status === 'MATCHED') acc.matchedCount += 1;
      if (row.status === 'ARCHIVED') acc.archivedCount += 1;
      return acc;
    }, { count: filtered.length, pendingCount: 0, arrivedCount: 0, matchedCount: 0, archivedCount: 0, amount: 0, matchedAmount: 0, balance: 0 });
    const { page, pageSize, rows: pagedRows } = this.paginateRows(filtered, query);
    return { rows: pagedRows, totals, pagination: { page, pageSize, totalItems: filtered.length } };
  }

  private canAccessBusinessCostShipment(principal: Principal, shipment: Shipment, canViewAll: boolean) {
    const scope = this.operatorCustomerScope(principal);
    if (canViewAll || !scope) return true;
    return Boolean(shipment.salesperson && scope.includes(shipment.salesperson));
  }

  private buildBusinessCostAuditListResponse(rows: BusinessCostAuditSummary[], query: BusinessCostAuditListQuery): BusinessCostAuditListResponse {
    const status = query.reconciliationStatus ?? query.status ?? 'ALL';
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const inRange = (value: string | undefined, from?: string, to?: string) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
    const filtered = rows.filter((row) => {
      const customerNeedle = query.customer?.trim();
      const customerMatches = !customerNeedle || [row.customerCode, row.customerName, row.customerOrderNo].some((value) => keyword(value, customerNeedle));
      const statusMatches = status === 'ALL' ? !row.voided : row.reconciliationStatus === status;
      return statusMatches
        && customerMatches
        && keyword(row.systemOrderNo, query.systemOrderNo)
        && keyword(row.customerCode, query.customerCode)
        && keyword(row.customerName, query.customerName)
        && keyword(row.transferNo, query.transferNo)
        && keyword(row.salesperson, query.salesperson)
        && keyword(row.name, query.feeName)
        && keyword(row.createdBy, query.createdBy)
        && keyword(row.reviewedBy, query.reviewedBy)
        && keyword(row.paymentNo, query.paymentNo)
        && keyword(row.remark, query.remark)
        && inRange(row.createdAt, query.createdFrom, query.createdTo)
        && inRange(row.reviewedAt, query.reviewedFrom, query.reviewedTo);
    });
    const decorated = this.decorateBusinessCostRows(filtered);
    const activeRows = decorated.filter((row) => !row.voided);
    const amountByCurrency = Array.from(
      activeRows.reduce((map, row) => {
        const currency = row.currency ?? 'RMB';
        map.set(currency, roundMoney((map.get(currency) ?? 0) + row.amount));
        return map;
      }, new Map<string, number>())
    ).map(([currency, amount]) => ({ currency, amount }));
    const sorted = [...decorated].sort((left, right) => this.compareBusinessCostRows(left, right, query.sortBy, query.sortOrder));
    const { page, pageSize, rows: pagedRows } = this.paginateRows(sorted, query);
    return {
      rows: pagedRows,
      totals: {
        amountByCurrency,
        rmbTotal: roundMoney(activeRows.reduce((sum, row) => sum + (row.rmbAmount ?? 0), 0)),
        pendingCount: activeRows.filter((row) => row.reconciliationStatus !== 'CONFIRMED').length,
        confirmedCount: activeRows.filter((row) => row.reconciliationStatus === 'CONFIRMED').length,
        voidedCount: decorated.filter((row) => row.voided).length,
        profitTotal: activeRows.some((row) => row.canViewProfit)
          ? roundMoney(activeRows.reduce((sum, row) => sum + (row.businessProfit ?? 0), 0))
          : undefined
      },
      pagination: { page, pageSize, totalItems: sorted.length }
    };
  }

  private decorateBusinessCostRows(rows: BusinessCostAuditSummary[]): BusinessCostAuditSummary[] {
    const usdRate = this.getBusinessCostUsdToRmbRate(rows);
    const decorated = rows.map((row) => {
      const currency = row.currency ?? 'RMB';
      return {
        ...row,
        currency,
        rmbAmount: this.toBusinessCostRmbAmount(row.amount, currency, usdRate)
      };
    });
    const orderTotals = decorated.reduce((map, row) => {
      if (row.voided) return map;
      map.set(row.systemOrderNo, roundMoney((map.get(row.systemOrderNo) ?? 0) + (row.rmbAmount ?? 0)));
      return map;
    }, new Map<string, number>());
    return decorated.map((row) => ({ ...row, orderRmbTotal: orderTotals.get(row.systemOrderNo) ?? 0 }));
  }

  private getBusinessCostUsdToRmbRate(rows: BusinessCostAuditSummary[]) {
    if (!rows.some((row) => (row.currency ?? 'RMB').toUpperCase() === 'USD')) return 1;
    const now = Date.now();
    const rate = this.exchangeRates
      .filter((row) => row.baseCurrency === 'USD' && row.quoteCurrency === 'RMB' && row.enabled && Date.parse(row.activeAt) <= now && (!row.endAt || Date.parse(row.endAt) >= now))
      .sort((left, right) => new Date(right.activeAt).getTime() - new Date(left.activeAt).getTime())[0];
    if (!rate) {
      throw new BadRequestException('缺少 USD 到 RMB 的系统汇率，无法计算业务成本合计');
    }
    return rate.rate;
  }

  private toBusinessCostRmbAmount(amount: number, currency: string, usdRate: number) {
    const normalized = currency.toUpperCase() === 'CNY' ? 'RMB' : currency.toUpperCase();
    if (normalized === 'RMB') return roundMoney(amount);
    if (normalized === 'USD') return roundMoney(amount * usdRate);
    throw new BadRequestException(`暂不支持 ${currency} 业务成本折算 RMB`);
  }

  private compareBusinessCostRows(left: BusinessCostAuditSummary, right: BusinessCostAuditSummary, sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    const direction = sortOrder === 'asc' ? 1 : -1;
    const valueOf = (row: BusinessCostAuditSummary) => {
      if (sortBy === 'amount') return row.amount;
      if (sortBy === 'rmbAmount') return row.rmbAmount ?? 0;
      if (sortBy === 'reviewedAt') return row.reviewedAt ? new Date(row.reviewedAt).getTime() : 0;
      if (sortBy === 'systemOrderNo') return row.systemOrderNo;
      if (sortBy === 'customerCode') return row.customerCode;
      if (sortBy === 'name') return row.name;
      if (sortBy === 'businessProfit') return row.businessProfit ?? 0;
      return row.createdAt ? new Date(row.createdAt).getTime() : 0;
    };
    const leftValue = valueOf(left);
    const rightValue = valueOf(right);
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue), 'zh-Hans-CN') * direction;
  }

  private async runBusinessCostBatch(ids: string[], action: (id: string) => Promise<BusinessCostAuditSummary>): Promise<BusinessCostAuditBatchResult> {
    const rows: BusinessCostAuditSummary[] = [];
    const failures: Array<{ id: string; reason: string }> = [];
    for (const id of ids) {
      try {
        rows.push(await action(id));
      } catch (error) {
        failures.push({ id, reason: error instanceof Error ? error.message : '处理失败' });
      }
    }
    return { successCount: rows.length, failureCount: failures.length, rows, failures };
  }

  private buildPayableAuditListResponse(rows: PayableAuditSummary[], query: PayableAuditListQuery): PayableAuditListResponse {
    const status = query.reconciliationStatus ?? query.status ?? 'ALL';
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const inRange = (value: string | undefined, from?: string, to?: string) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
    const filtered = rows.filter((row) => {
      const customerNeedle = query.customer?.trim();
      const customerMatches = !customerNeedle || [row.customerCode, row.customerName, row.customerOrderNo].some((value) => keyword(value, customerNeedle));
      return (status === 'ALL' ? !row.voided : row.reconciliationStatus === status)
        && customerMatches
        && keyword(row.systemOrderNo, query.systemOrderNo)
        && keyword(row.customerCode, query.customerCode)
        && keyword(row.customerName, query.customerName)
        && keyword(row.transferNo, query.transferNo)
        && keyword(row.salesperson, query.salesperson)
        && keyword(row.agentName, query.agent)
        && keyword(row.name, query.feeName)
        && keyword(row.createdBy, query.createdBy)
        && keyword(row.reviewedBy, query.reviewedBy)
        && keyword(row.paymentNo, query.paymentNo)
        && keyword(row.remark, query.remark)
        && inRange(row.createdAt, query.createdFrom, query.createdTo)
        && inRange(row.reviewedAt, query.reviewedFrom, query.reviewedTo);
    });
    const decorated = this.decoratePayableRows(filtered);
    const activeRows = decorated.filter((row) => !row.voided);
    const sorted = [...decorated].sort((left, right) => this.comparePayableRows(left, right, query.sortBy, query.sortOrder));
    const { page, pageSize, rows: pagedRows } = this.paginateRows(sorted, query);
    const amountByCurrency = Array.from(activeRows.reduce((map, row) => {
      const currency = row.currency ?? 'RMB';
      map.set(currency, roundMoney((map.get(currency) ?? 0) + row.amount));
      return map;
    }, new Map<string, number>())).map(([currency, amount]) => ({ currency, amount }));
    return {
      rows: pagedRows,
      totals: {
        amountByCurrency,
        rmbTotal: roundMoney(activeRows.reduce((sum, row) => sum + (row.rmbAmount ?? 0), 0)),
        pendingCount: activeRows.filter((row) => row.reconciliationStatus !== 'CONFIRMED').length,
        confirmedCount: activeRows.filter((row) => row.reconciliationStatus === 'CONFIRMED').length,
        voidedCount: filtered.filter((row) => row.voided).length,
        receivableProfitTotal: activeRows.some((row) => row.canViewProfit) ? roundMoney(activeRows.reduce((sum, row) => sum + (row.receivableProfit ?? 0), 0)) : undefined,
        operationProfitTotal: activeRows.some((row) => row.canViewProfit) ? roundMoney(activeRows.reduce((sum, row) => sum + (row.operationProfit ?? 0), 0)) : undefined
      },
      pagination: { page, pageSize, totalItems: sorted.length }
    };
  }

  private decoratePayableRows(rows: PayableAuditSummary[]) {
    const decorated = rows.map((row) => ({ ...row, rmbAmount: roundMoney(row.amount) }));
    const orderTotals = decorated.reduce((map, row) => {
      if (row.voided) return map;
      map.set(row.systemOrderNo, roundMoney((map.get(row.systemOrderNo) ?? 0) + (row.rmbAmount ?? 0)));
      return map;
    }, new Map<string, number>());
    return decorated.map((row) => ({ ...row, orderRmbTotal: orderTotals.get(row.systemOrderNo) ?? 0 }));
  }

  private comparePayableRows(left: PayableAuditSummary, right: PayableAuditSummary, sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    const direction = sortOrder === 'asc' ? 1 : -1;
    const valueOf = (row: PayableAuditSummary) => {
      if (sortBy === 'amount') return row.amount;
      if (sortBy === 'rmbAmount') return row.rmbAmount ?? 0;
      if (sortBy === 'reviewedAt') return row.reviewedAt ? new Date(row.reviewedAt).getTime() : 0;
      if (sortBy === 'systemOrderNo') return row.systemOrderNo;
      if (sortBy === 'customerCode') return row.customerCode;
      if (sortBy === 'name') return row.name;
      if (sortBy === 'receivableProfit') return row.receivableProfit ?? 0;
      if (sortBy === 'operationProfit') return row.operationProfit ?? 0;
      return row.createdAt ? new Date(row.createdAt).getTime() : 0;
    };
    const leftValue = valueOf(left);
    const rightValue = valueOf(right);
    if (typeof leftValue === 'number' && typeof rightValue === 'number') return (leftValue - rightValue) * direction;
    return String(leftValue).localeCompare(String(rightValue), 'zh-Hans-CN') * direction;
  }

  private normalizePaymentCurrency(value?: string): 'RMB' | 'USD' {
    const currency = (value ?? 'RMB').toUpperCase();
    if (currency === 'RMB' || currency === 'USD') return currency;
    throw new BadRequestException('待付款第一版仅支持 RMB / USD');
  }

  private toPendingPaymentSummary(row: StoredPayablePaymentApplication): PendingPaymentSummary {
    const payable = this.findPayableFinanceItemById(row.payableFinanceItemId);
    const shipment = this.shipments.find((item) => item.id === row.shipmentId);
    if (!shipment) throw new NotFoundException('运单不存在');
    const bankAccount = row.payeeBankAccountId ? this.payeeBankAccounts.find((item) => item.id === row.payeeBankAccountId) : undefined;
    const item = this.paymentApplicationItems.find((entry) => entry.pendingPaymentId === row.id);
    const app = item ? this.paymentApplications.find((entry) => entry.id === item.paymentApplicationId) : undefined;
    const status = row.applicationStatus === 'APPLIED' || app?.status === 'WAITING_PAYMENT' ? 'APPLIED' : row.status;
    return {
      id: row.id,
      payableFinanceItemId: row.payableFinanceItemId,
      paymentApplicationId: app?.id,
      shipmentId: row.shipmentId,
      date: row.appliedAt ?? row.createdAt,
      agentName: payable.agentName ?? shipment.agentName,
      salesperson: shipment.salesperson,
      customerCode: shipment.customerName.split('-')[0],
      customerName: shipment.customerName,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo,
      feeName: payable.name,
      amount: row.amount,
      currency: this.normalizePaymentCurrency(row.currency),
      remark: row.remark,
      status,
      bankAccount,
      vouchers: this.paymentVouchers.filter((voucher) => voucher.pendingPaymentId === row.id),
      paymentApplicationNo: app?.applicationNo,
      createdAt: row.createdAt,
      appliedAt: row.appliedAt
    };
  }

  private buildPendingPaymentListResponse(rows: PendingPaymentSummary[], query: PendingPaymentListQuery): PendingPaymentListResponse {
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const dateInRange = (value: string | undefined, from?: string, to?: string) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
    const filtered = rows.filter((row) => {
      const status = query.status ?? 'ALL';
      return (status === 'ALL' || row.status === status)
        && (!query.currency || query.currency === 'ALL' || row.currency === query.currency)
        && keyword(row.agentName, query.agent)
        && keyword(row.salesperson, query.salesperson)
        && keyword(row.customerCode, query.customerCode)
        && keyword(row.systemOrderNo, query.systemOrderNo)
        && keyword(row.feeName, query.feeName)
        && keyword(row.remark, query.remark)
        && keyword(row.bankAccount?.accountName, query.payeeName)
        && keyword(row.bankAccount?.bankAccountNo, query.bankAccountNo)
        && (query.amount === undefined || row.amount === Number(query.amount))
        && dateInRange(row.appliedAt ?? row.createdAt, query.applicationDateFrom, query.applicationDateTo);
    });
    const sortBy = query.sortBy ?? 'date';
    const sortOrder = query.sortOrder ?? 'desc';
    filtered.sort((left, right) => {
      const valueOf = (row: PendingPaymentSummary) => sortBy === 'amount' ? row.amount : String(row[sortBy] ?? '');
      const leftValue = valueOf(left);
      const rightValue = valueOf(right);
      const result = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), 'zh-Hans-CN');
      return sortOrder === 'asc' ? result : -result;
    });
    const amountByCurrency = filtered.reduce((list, row) => {
      const bucket = list.find((item) => item.currency === row.currency);
      if (bucket) bucket.amount = roundMoney(bucket.amount + row.amount);
      else list.push({ currency: row.currency, amount: row.amount });
      return list;
    }, [] as Array<{ currency: 'RMB' | 'USD'; amount: number }>);
    const { page, pageSize, rows: pagedRows } = this.paginateRows(filtered, query);
    return {
      rows: pagedRows,
      totals: { count: filtered.length, amountByCurrency },
      pagination: { page, pageSize, totalItems: filtered.length }
    };
  }

  private nextMemoryPaymentApplicationNo() {
    const prefix = `FKSQ${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
    const count = this.paymentApplications.filter((item) => item.applicationNo.startsWith(prefix)).length;
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private toPaymentVoucherSummary(row: StoredPaymentVoucher): PaymentVoucherSummary {
    const pending = row.pendingPaymentId ? this.payablePaymentApplications.find((item) => item.id === row.pendingPaymentId) : undefined;
    const item = pending ? this.shipmentFinanceItems.find((financeItem) => financeItem.id === pending.payableFinanceItemId) : undefined;
    const shipment = pending ? this.shipments.find((shipmentRow) => shipmentRow.id === pending.shipmentId) : undefined;
    const applicationItem = pending ? this.paymentApplicationItems.find((entry) => entry.pendingPaymentId === pending.id) : undefined;
    const application = row.paymentApplicationId
      ? this.paymentApplications.find((entry) => entry.id === row.paymentApplicationId)
      : applicationItem ? this.paymentApplications.find((entry) => entry.id === applicationItem.paymentApplicationId) : undefined;
    return {
      ...row,
      payableFinanceItemId: pending?.payableFinanceItemId,
      systemOrderNo: shipment?.systemOrderNo,
        transferNo: row.transferNo ?? shipment?.transferNo,
      agentChannel: shipment?.channelName,
      chargeWeightKg: item?.chargeWeightKg,
      unitPrice: item?.unitPrice,
      payableAmount: pending?.amount ?? item?.amount,
      paymentApplicationId: row.paymentApplicationId ?? application?.id,
      paymentApplicationNo: application?.applicationNo,
      paidPaymentId: application?.status === 'PAID' ? application.id : undefined,
      paidAt: application?.status === 'PAID' ? application.paidAt : undefined
    };
  }

  private findPaymentApplicationById(id: string) {
    const row = this.paymentApplications.find((item) => item.id === id);
    if (!row) throw new NotFoundException('付款申请不存在');
    return row;
  }

  private toPaymentApplicationSummary(row: StoredPaymentApplication): PaymentApplicationSummary {
    const items = this.paymentApplicationItems.filter((item) => item.paymentApplicationId === row.id);
    return {
      id: row.id,
      applicationNo: row.applicationNo,
      agentName: row.agentName,
      currency: row.currency,
      totalAmount: row.totalAmount,
      status: row.status,
      bankAccount: row.payeeBankAccountId ? this.payeeBankAccounts.find((bank) => bank.id === row.payeeBankAccountId) : undefined,
      remark: row.remark,
      payerBankName: row.payerBankName,
      payerBankAccountName: row.payerBankAccountName,
      payerBankAccountNo: row.payerBankAccountNo,
      paidAt: row.paidAt,
      paidBy: row.paidBy,
      paidRemark: row.paidRemark,
      reversedAt: row.reversedAt,
      reversedBy: row.reversedBy,
      reverseReason: row.reverseReason,
      appliedBy: row.appliedBy,
      appliedAt: row.appliedAt,
      canceledAt: row.canceledAt,
      items,
      vouchers: this.paymentApplicationVouchers(row, items)
    };
  }

  private toPaymentApplicationAuditSnapshot(row: PaymentApplicationSummary, statusFrom?: string, statusTo = row.status, canceledBy?: string) {
    return {
      paymentApplicationId: row.id,
      paymentApplicationNo: row.applicationNo,
      agentName: row.agentName,
      bankAccountId: row.bankAccount?.id,
      accountName: row.bankAccount?.accountName,
      bankName: row.bankAccount?.bankName,
      bankAccountNo: row.bankAccount?.bankAccountNo,
      currency: row.currency,
      totalAmount: row.totalAmount,
      payableFinanceItemIds: row.items.map((item) => item.payableFinanceItemId),
      pendingPaymentIds: row.items.map((item) => item.pendingPaymentId),
      systemOrderNos: row.items.map((item) => item.systemOrderNo),
      customerCodes: row.items.map((item) => item.customerCode),
      itemCount: row.items.length,
      appliedBy: row.appliedBy,
      appliedAt: row.appliedAt,
      statusFrom,
      statusTo,
      status: row.status,
      canceledBy,
      canceledAt: row.canceledAt,
      voucherFileNames: row.vouchers.map((item) => item.fileName)
    };
  }

  private paymentApplicationVouchers(row: StoredPaymentApplication, items = this.paymentApplicationItems.filter((item) => item.paymentApplicationId === row.id)): StoredPaymentVoucher[] {
    const pendingIds = new Set(items.map((item) => item.pendingPaymentId));
    const vouchers = [
      ...this.paymentVouchers.filter((voucher) => pendingIds.has(voucher.pendingPaymentId ?? '') && voucher.voucherType !== 'PAYMENT_RECEIPT'),
      ...this.paymentVouchers.filter((voucher) => voucher.paymentApplicationId === row.id)
    ];
    return Array.from(new Map(vouchers.map((item) => [item.id, item])).values());
  }

  private toPaidPaymentSummary(row: StoredPaymentApplication, canViewBank = true): PaidPaymentSummary {
    const payment = this.toPaymentApplicationSummary(row);
    const first = payment.items[0];
    const vouchers = payment.vouchers;
    const bankAccount = payment.bankAccount ? { ...payment.bankAccount, bankAccountNo: this.maskBankAccountNo(payment.bankAccount.bankAccountNo, canViewBank) ?? payment.bankAccount.bankAccountNo } : undefined;
    return {
      id: row.id,
      applicationNo: row.applicationNo,
      date: row.paidAt ?? row.appliedAt ?? new Date().toISOString(),
      agentName: row.agentName,
      salesperson: this.shipments.find((shipment) => shipment.id === first?.shipmentId)?.salesperson,
      customerCode: first?.customerCode,
      systemOrderNo: payment.items.length === 1 ? first?.systemOrderNo : `${first?.systemOrderNo ?? '-'} 等${payment.items.length}票`,
      feeName: payment.items.length === 1 ? first?.feeName : `${first?.feeName ?? '应付费用'} 等${payment.items.length}项`,
      currency: row.currency,
      totalAmount: row.totalAmount,
      remark: row.remark ?? row.paidRemark,
      status: row.status,
      billVouchers: vouchers.filter((voucher) => voucher.voucherType !== 'PAYMENT_RECEIPT'),
      waterReceipts: vouchers.filter((voucher) => voucher.voucherType === 'PAYMENT_RECEIPT'),
      payeeBankAccount: bankAccount,
      payerBankName: row.payerBankName,
      payerBankAccountName: row.payerBankAccountName,
      payerBankAccountNo: this.maskBankAccountNo(row.payerBankAccountNo, canViewBank),
      paidAt: row.paidAt,
      paidBy: row.paidBy,
      paidRemark: row.paidRemark,
      items: payment.items
    };
  }

  private toPaidPaymentAuditSnapshot(row: PaidPaymentSummary, statusFrom?: string, statusTo = row.status, reversedBy?: string, reversedAt?: string) {
    const waterReceiptFileNames = row.waterReceipts.map((item) => item.fileName);
    const billVoucherFileNames = row.billVouchers.map((item) => item.fileName);
    return {
      paymentApplicationId: row.id,
      paymentApplicationNo: row.applicationNo,
      paymentObject: row.agentName,
      agentName: row.agentName,
      accountName: row.payeeBankAccount?.accountName,
      bankName: row.payeeBankAccount?.bankName,
      payeeBankAccountNo: row.payeeBankAccount?.bankAccountNo,
      payerBankName: row.payerBankName,
      payerBankAccountName: row.payerBankAccountName,
      payerBankAccountNo: row.payerBankAccountNo,
      currency: row.currency,
      paymentAmount: row.totalAmount,
      totalAmount: row.totalAmount,
      payableFinanceItemIds: row.items.map((item) => item.payableFinanceItemId),
      pendingPaymentIds: row.items.map((item) => item.pendingPaymentId),
      systemOrderNos: row.items.map((item) => item.systemOrderNo),
      customerCodes: row.items.map((item) => item.customerCode),
      paidAt: row.paidAt,
      paidBy: row.paidBy,
      paidRemark: row.paidRemark,
      statusFrom,
      statusTo,
      status: row.status,
      writeOffStatus: row.status === 'PAID' ? 'WRITTEN_OFF' : 'PENDING',
      archiveStatus: row.status === 'PAID' ? 'ARCHIVED' : 'OPEN',
      archivedAt: row.status === 'PAID' ? row.paidAt : undefined,
      waterReceiptFileNames,
      billVoucherFileNames,
      voucherFileNames: [...billVoucherFileNames, ...waterReceiptFileNames],
      reversedBy,
      reversedAt
    };
  }

  private toPaidPaymentVoucherAuditSnapshot(voucher: PaymentVoucherSummary, payment?: PaidPaymentSummary) {
    return {
      voucherId: voucher.id,
      paymentApplicationId: voucher.paymentApplicationId,
      paymentApplicationNo: payment?.applicationNo,
      voucherType: voucher.voucherType ?? 'PAYMENT_RECEIPT',
      fileName: voucher.fileName,
      url: voucher.url,
      uploadedBy: voucher.uploadedBy,
      uploadedAt: voucher.createdAt,
      paymentObject: payment?.agentName,
      paymentAmount: payment?.totalAmount,
      currency: payment?.currency,
      status: payment?.status,
      archivedAt: payment?.status === 'PAID' ? payment.paidAt : undefined
    };
  }

  private maskBankAccountNo(accountNo: string | undefined, canView: boolean) {
    if (!accountNo || canView) return accountNo;
    return accountNo.length <= 4 ? '****' : `${'*'.repeat(Math.max(4, accountNo.length - 4))}${accountNo.slice(-4)}`;
  }

  private buildPaidPaymentListResponse(rows: PaidPaymentSummary[], query: PaidPaymentListQuery = {}): PaidPaymentListResponse {
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const filtered = rows.filter((row) => {
      const status = query.status ?? 'ALL';
      return (status === 'ALL' || row.status === status)
        && (!query.currency || query.currency === 'ALL' || row.currency === query.currency)
        && keyword(row.agentName, query.agent)
        && keyword(row.salesperson, query.salesperson)
        && keyword(row.customerCode, query.customerCode)
        && keyword(row.systemOrderNo, query.systemOrderNo)
        && keyword(row.feeName, query.feeName)
        && keyword(row.remark, query.remark)
        && keyword(row.payeeBankAccount?.accountName, query.payeeName)
        && keyword(row.payeeBankAccount?.bankAccountNo, query.bankAccountNo)
        && keyword(row.payerBankName, query.payerBank)
        && (query.amount === undefined || row.totalAmount === Number(query.amount));
    });
    const totals = filtered.reduce((acc, row) => {
      if (row.status === 'WAITING_PAYMENT') acc.waitingPaymentCount += 1;
      if (row.status === 'PAID') acc.paidCount += 1;
      const bucket = acc.amountByCurrency.find((item) => item.currency === row.currency);
      if (bucket) bucket.amount = Number((bucket.amount + row.totalAmount).toFixed(2));
      else acc.amountByCurrency.push({ currency: row.currency, amount: row.totalAmount });
      return acc;
    }, { count: filtered.length, waitingPaymentCount: 0, paidCount: 0, amountByCurrency: [] as Array<{ currency: 'RMB' | 'USD'; amount: number }> });
    const { page, pageSize, rows: pagedRows } = this.paginateRows(filtered, query);
    return { rows: pagedRows, totals, pagination: { page, pageSize, totalItems: filtered.length } };
  }

  private async runPayableBatch(ids: string[], action: (id: string) => Promise<PayableAuditSummary>): Promise<PayableAuditBatchResult> {
    const rows: PayableAuditSummary[] = [];
    const failures: Array<{ id: string; reason: string }> = [];
    for (const id of ids) {
      try {
        rows.push(await action(id));
      } catch (error) {
        failures.push({ id, reason: error instanceof Error ? error.message : '处理失败' });
      }
    }
    return { successCount: rows.length, failureCount: failures.length, rows, failures };
  }

  private calculatePayableAmount(chargeWeightKg?: number, unitPrice?: number, fallback = 0) {
    if (typeof chargeWeightKg === 'number' && typeof unitPrice === 'number') return roundMoney(chargeWeightKg * unitPrice);
    return fallback;
  }

  private isRouteAgentPayable(item: StoredShipmentFinanceItem) {
    const hasRouteCostShape = item.type === 'PAYABLE'
      && item.name === '代理成本'
      && item.amountOverridden === false
      && item.chargeWeightKg !== undefined
      && item.unitPrice !== undefined;
    return hasRouteCostShape && this.auditLogs.some((row) => row.action === 'shipment.route' && row.target === item.shipmentId && this.routeLogMatchesPayable(row.after, item));
  }

  private routeLogMatchesPayable(after: unknown, item: StoredShipmentFinanceItem) {
    const row = after as { payableTotal?: number; chargeWeightKg?: number; unitPrice?: number } | undefined;
    if (!row) return false;
    return Math.abs(Number(row.payableTotal) - Number(item.amount)) < 0.01
      && Math.abs(Number(row.chargeWeightKg) - Number(item.chargeWeightKg)) < 0.01
      && Math.abs(Number(row.unitPrice) - Number(item.unitPrice)) < 0.01;
  }

  private hasBusinessDataApproval(shipmentId: string) {
    return this.auditLogs.some((row) => row.action === 'customer_service.business_data.approved' && row.target === shipmentId);
  }

  private isBusinessEnteredPayable(item: StoredShipmentFinanceItem) {
    const creator = item.createdBy ? this.accounts.find((account) => account.username === item.createdBy) : undefined;
    return item.type === 'PAYABLE' && Boolean(creator && isSalesScopedRole(creator.role));
  }

  private canExposePayableToFinance(item: StoredShipmentFinanceItem) {
    return this.isRouteAgentPayable(item) || !this.isBusinessEnteredPayable(item) || this.hasBusinessDataApproval(item.shipmentId);
  }

  private ensurePayableReadyForFinance(item: StoredShipmentFinanceItem) {
    if (!this.canExposePayableToFinance(item)) throw new BadRequestException('客服确认数据后才能审核该应付费用');
  }

  private canExposePendingPaymentToFinance(row: StoredPayablePaymentApplication) {
    const payable = this.shipmentFinanceItems.find((item) => item.id === row.payableFinanceItemId);
    return !payable || this.canExposePayableToFinance(payable);
  }

  private ensurePendingPaymentReadyForFinance(row: StoredPayablePaymentApplication) {
    if (!this.canExposePendingPaymentToFinance(row)) throw new BadRequestException('客服确认数据后才能申请付款');
  }

  private upsertPayablePaymentApplication(item: StoredShipmentFinanceItem) {
    const now = new Date().toISOString();
    let row = this.payablePaymentApplications.find((entry) => entry.payableFinanceItemId === item.id);
    if (!row) {
      row = {
        id: `ppa-${this.payablePaymentApplications.length + 1}`,
        payableFinanceItemId: item.id,
        shipmentId: item.shipmentId,
        amount: item.amount,
        currency: item.currency,
        paymentNo: item.paymentNo,
        status: 'PENDING',
        applicationStatus: 'PENDING',
        remark: item.remark,
        createdAt: now,
        updatedAt: now
      };
      this.payablePaymentApplications.push(row);
    } else {
      row.amount = item.amount;
      row.currency = item.currency;
      row.paymentNo = item.paymentNo;
      row.status = 'PENDING';
      row.applicationStatus = 'PENDING';
      row.invalidatedAt = undefined;
      row.appliedAt = undefined;
      row.remark = item.remark;
      row.updatedAt = now;
    }
    return row;
  }

  private findPayableFinanceItemById(id: string) {
    const item = this.shipmentFinanceItems.find((row) => row.id === id && row.type === 'PAYABLE');
    if (!item) throw new NotFoundException('应付费用不存在');
    return item;
  }

  private findPayablePaymentApplicationById(id: string) {
    const row = this.payablePaymentApplications.find((item) => item.id === id);
    if (!row) throw new NotFoundException('待付款记录不存在');
    return row;
  }

  private findBusinessCostFinanceItemById(id: string) {
    const item = this.shipmentFinanceItems.find((row) => row.id === id && row.type === 'BUSINESS_COST');
    if (!item) {
      throw new NotFoundException('业务成本不存在');
    }
    return item;
  }

  private ensureBusinessCostAuditEditable(row: { voided?: boolean; locked?: boolean; reconciliationStatus?: ShipmentFinanceItemStatus }) {
    if (row.voided) {
      throw new BadRequestException('业务成本已作废');
    }
    if (row.locked || row.reconciliationStatus === 'CONFIRMED' || row.reconciliationStatus === 'LOCKED') {
      throw new BadRequestException('业务成本已审核，请先反审核');
    }
  }

  private ensurePayableAuditEditable(row: { voided?: boolean; locked?: boolean; reconciliationStatus?: ShipmentFinanceItemStatus }) {
    if (row.voided) {
      throw new BadRequestException('应付费用已作废');
    }
    if (row.locked || row.reconciliationStatus === 'CONFIRMED' || row.reconciliationStatus === 'LOCKED') {
      throw new BadRequestException('应付费用已审核，请先反审核');
    }
  }

  private calculateBusinessCostAmount(chargeWeightKg?: number, unitPrice?: number, fallback = 0) {
    if (typeof chargeWeightKg === 'number' && typeof unitPrice === 'number') {
      return Number((chargeWeightKg * unitPrice).toFixed(2));
    }
    return fallback;
  }

  private toBusinessCostAuditSummary(item: StoredShipmentFinanceItem, shipment: Shipment, visibility: { canViewAgent: boolean; canViewProfit: boolean } = { canViewAgent: true, canViewProfit: true }): BusinessCostAuditSummary {
    const receivableTotal = [
      ...this.receivableFees.filter((fee) => fee.shipmentId === shipment.id && !fee.voided).map((fee) => fee.amount),
      ...this.shipmentFinanceItems
        .filter((entry) => entry.shipmentId === shipment.id && entry.type === 'RECEIVABLE' && !entry.voided)
        .map((entry) => entry.amount)
    ].reduce((sum, amount) => sum + amount, 0);
    const businessCostTotal = this.shipmentFinanceItems
      .filter((entry) => entry.shipmentId === shipment.id && entry.type === 'BUSINESS_COST' && !entry.voided)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const customerCode = shipment.customerName.split('-')[0];

    return {
      ...this.toBusinessCostFinanceSummary(item, shipment),
      salesperson: shipment.salesperson,
      customerCode,
      customerName: shipment.customerName,
      customerOrderNo: shipment.customerOrderNo,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo,
      agentName: visibility.canViewAgent ? item.agentName ?? shipment.agentName : undefined,
      receivableTotal,
      businessCostTotal,
      businessProfit: visibility.canViewProfit ? Number((receivableTotal - businessCostTotal).toFixed(2)) : undefined,
      canViewAgent: visibility.canViewAgent,
      canViewProfit: visibility.canViewProfit
    };
  }

  private toBusinessCostReviewAuditSnapshot(
    item: StoredShipmentFinanceItem,
    shipment: Shipment,
    principal: Principal,
    statusFrom: string | undefined,
    statusTo: string,
    action: 'audit' | 'reverse'
  ) {
    const fee = this.toBusinessCostFinanceSummary(item, shipment);
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      systemOrderNo: shipment.systemOrderNo,
      customerCode: shipment.customerName.split('-')[0],
      salesperson: shipment.salesperson,
      name: item.name,
      chargeWeightKg: fee.chargeWeightKg,
      unitPrice: fee.unitPrice,
      amount: fee.amount,
      currency: fee.currency ?? 'RMB',
      statusFrom: statusFrom ?? 'PENDING',
      statusTo,
      reviewStatus: statusTo,
      reviewedBy: item.reviewedBy ?? (action === 'audit' ? principal.username : undefined),
      reviewedAt: item.reviewedAt,
      reversedBy: action === 'reverse' ? principal.username : undefined,
      reversedAt: action === 'reverse' ? new Date().toISOString() : undefined,
      locked: item.locked
    };
  }

  private toPayableAuditSummary(item: StoredShipmentFinanceItem, shipment: Shipment, visibility: { canViewSensitivePayable: boolean; canViewProfit: boolean } = { canViewSensitivePayable: true, canViewProfit: true }): PayableAuditSummary {
    const receivableTotal = [
      ...this.receivableFees.filter((fee) => fee.shipmentId === shipment.id && !fee.voided).map((fee) => fee.amount),
      ...this.shipmentFinanceItems
        .filter((entry) => entry.shipmentId === shipment.id && entry.type === 'RECEIVABLE' && !entry.voided)
        .map((entry) => entry.amount)
    ].reduce((sum, amount) => sum + amount, 0);
    const businessCostTotal = this.shipmentFinanceItems
      .filter((entry) => entry.shipmentId === shipment.id && entry.type === 'BUSINESS_COST' && !entry.voided)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const payableTotal = this.shipmentFinanceItems
      .filter((entry) => entry.shipmentId === shipment.id && entry.type === 'PAYABLE' && !entry.voided)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const customerCode = shipment.customerName.split('-')[0];
    const base = this.toPayableFinanceSummary(item, shipment);
    return {
      ...base,
      amount: visibility.canViewSensitivePayable ? base.amount : 0,
      agentName: visibility.canViewSensitivePayable ? item.agentName ?? shipment.agentName : undefined,
      salesperson: shipment.salesperson,
      customerCode,
      customerName: shipment.customerName,
      customerOrderNo: shipment.customerOrderNo,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo,
      agentChannel: shipment.channelName,
      payableTotal: visibility.canViewSensitivePayable ? roundMoney(payableTotal) : 0,
      receivableProfit: visibility.canViewProfit ? roundMoney(receivableTotal - payableTotal) : undefined,
      operationProfit: visibility.canViewProfit ? roundMoney(businessCostTotal - payableTotal) : undefined,
      canViewSensitivePayable: visibility.canViewSensitivePayable,
      canViewProfit: visibility.canViewProfit
    };
  }

  private toPayableReviewAuditSnapshot(
    item: StoredShipmentFinanceItem,
    shipment: Shipment,
    principal: Principal,
    statusFrom: string | undefined,
    statusTo: string,
    action: 'audit' | 'reverse',
    application?: StoredPayablePaymentApplication
  ) {
    const fee = this.toPayableFinanceSummary(item, shipment);
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      systemOrderNo: shipment.systemOrderNo,
      customerCode: shipment.customerName.split('-')[0],
      realAgentName: fee.agentName,
      agentName: fee.agentName,
      agentChannel: shipment.channelName,
      channelName: shipment.channelName,
      chargeWeightKg: fee.chargeWeightKg,
      unitPrice: fee.unitPrice,
      amount: fee.amount,
      currency: fee.currency ?? 'RMB',
      routingSource: shipment.agentName || shipment.channelName ? 'ROUTING' : 'MANUAL',
      supplierBillNo: item.paymentNo,
      paymentNo: item.paymentNo,
      pendingPaymentId: application?.id,
      pendingPaymentStatus: application?.status,
      statusFrom: statusFrom ?? 'PENDING',
      statusTo,
      reviewStatus: statusTo,
      reviewedBy: item.reviewedBy ?? (action === 'audit' ? principal.username : undefined),
      reviewedAt: item.reviewedAt,
      reversedBy: action === 'reverse' ? principal.username : undefined,
      reversedAt: action === 'reverse' ? new Date().toISOString() : undefined,
      locked: item.locked
    };
  }

  private toPayableAuditShipmentMatchSummary(shipment: Shipment): PayableAuditShipmentMatchSummary {
    const customerCode = shipment.customerName.split('-')[0];
    return {
      shipmentId: shipment.id,
      customerCode,
      customerName: shipment.customerName,
      customerOrderNo: shipment.customerOrderNo,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo,
      salesperson: shipment.salesperson,
      agentName: shipment.agentName,
      agentChannel: shipment.channelName
    };
  }

  private toPayableFinanceSummary(item: StoredShipmentFinanceItem, shipment: Shipment): PayableFeeSummary {
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      name: item.name,
      amount: item.amount,
      settled: item.reconciliationStatus === 'CONFIRMED' || item.reconciliationStatus === 'LOCKED',
      salesperson: shipment?.salesperson,
      agentName: item.agentName ?? shipment.agentName,
      type: 'PAYABLE',
      currency: item.currency,
      settlementMethod: item.settlementMethod,
      reconciliationStatus: item.reconciliationStatus,
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      reviewedAt: item.reviewedAt,
      reviewedBy: item.reviewedBy,
      remark: item.remark,
      locked: item.locked,
      voided: item.voided,
      sourceType: 'MANUAL',
      chargeWeightKg: item.chargeWeightKg,
      unitPrice: item.unitPrice,
      amountOverridden: item.amountOverridden ?? false
    };
  }

  private toBusinessCostFinanceSummary(item: StoredShipmentFinanceItem, shipment?: Shipment): BusinessCostFeeSummary {
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      name: item.name,
      amount: item.amount,
      settled: item.reconciliationStatus === 'CONFIRMED' || item.reconciliationStatus === 'LOCKED',
      salesperson: shipment?.salesperson,
      agentName: item.agentName ?? shipment?.agentName,
      type: 'BUSINESS_COST',
      currency: item.currency,
      settlementMethod: item.settlementMethod,
      reconciliationStatus: item.reconciliationStatus,
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      reviewedAt: item.reviewedAt,
      reviewedBy: item.reviewedBy,
      remark: item.remark,
      locked: item.locked,
      voided: item.voided,
      sourceType: 'MANUAL',
      chargeWeightKg: item.chargeWeightKg,
      unitPrice: item.unitPrice,
      amountOverridden: item.amountOverridden ?? false
    };
  }

  private audit(action: string, target: string, principal: Principal, before: unknown, after: unknown) {
    const auditModule = inferInMemoryAuditModule(action);
    const result = inferInMemoryAuditResult(action);
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${this.auditLogs.length + 1}`,
      actorId: principal.id,
      actorUsername: principal.username,
      action,
      actionLabel: formatInMemoryAuditActionLabel(action),
      module: auditModule.module,
      moduleLabel: auditModule.moduleLabel,
      target,
      result,
      resultLabel: result === 'SUCCESS' ? '成功' : '失败',
      before: this.cloneAuditValue(before),
      after: this.cloneAuditValue(after),
      createdAt: new Date().toISOString()
    });
  }

  private cloneAuditValue(value: unknown) {
    return value == null ? undefined : JSON.parse(JSON.stringify(value));
  }

  private visibleShipments(principal: Principal) {
    const activeShipments = this.shipments.filter((shipment) => !this.deletedShipmentIds.has(shipment.id));
    if (principal.role === 'CUSTOMER') {
      return activeShipments.filter((shipment) => shipment.customerId === principal.customerId);
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope) {
      return activeShipments.filter((shipment) => {
        const customer = this.customers.find((item) => item.id === shipment.customerId);
        return customer?.salesperson ? scope.includes(customer.salesperson) : false;
      });
    }
    return activeShipments;
  }

  private visibleReviewShipments(principal: Principal) {
    const activeShipments = this.shipments.filter((shipment) => !this.deletedShipmentIds.has(shipment.id));
    if (principal.role === 'CUSTOMER') {
      return activeShipments.filter((shipment) => shipment.customerId === principal.customerId);
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope) {
      return activeShipments.filter((shipment) => this.isShipmentInSalesScope(shipment, scope));
    }
    return activeShipments;
  }

  private isShipmentInSalesScope(shipment: Shipment & { customerId?: string }, scope: string[]) {
    if (shipment.entryBy && scope.includes(shipment.entryBy)) return true;
    if (shipment.salesperson && scope.includes(shipment.salesperson)) return true;
    const customer = this.customers.find((item) => item.id === shipment.customerId);
    return Boolean(customer?.salesperson && scope.includes(customer.salesperson));
  }

  private isShipmentSubmittedBySalesScopedUser(shipment: Shipment) {
    const user = shipment.entryBy ? this.accounts.find((account) => account.username === shipment.entryBy) : undefined;
    return Boolean(user?.role && isSalesScopedRole(user.role));
  }

  private withSalespersonSite(shipment: Shipment): Shipment {
    const account = shipment.salesperson ? this.accounts.find((item) => item.username === shipment.salesperson) : undefined;
    return account?.site ? { ...shipment, site: account.site } : shipment;
  }

  private maskShipmentListFields(principal: Principal, shipment: Shipment): Shipment {
    const { paymentAmountUsd, paymentAmountCny, paymentMethod, ...visible } = shipment;
    if (this.operatorCustomerScope(principal)) return { ...visible, agentName: '', channelName: '' };
    if (!['WAREHOUSE', 'CUSTOMER_SERVICE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) return shipment;
    const safeVisible = { ...visible };
    delete safeVisible.routeChargeWeightKg;
    delete safeVisible.routeUnitPrice;
    delete safeVisible.routeOtherFee;
    delete safeVisible.routeCostTotal;
    delete safeVisible.routeCurrency;
    return safeVisible;
  }

  private canAccessShipment(principal: Principal, shipment: Shipment & { customerId?: string }) {
    if (principal.role === 'CUSTOMER') {
      return shipment.customerId === principal.customerId;
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope) {
      const customer = this.customers.find((item) => item.id === shipment.customerId);
      return customer?.salesperson ? scope.includes(customer.salesperson) : false;
    }
    return true;
  }

  private async cleanupOverdueReviewShipments(principal: Principal) {
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    for (const shipment of this.visibleReviewShipments(principal)) {
      const createdAt = new Date(shipment.createdAt).getTime();
      if (
        (shipment.status === 'DRAFT' || shipment.status === 'REVIEW_PENDING')
        && Number.isFinite(createdAt)
        && createdAt < cutoff
      ) {
        const before = { ...shipment };
        shipment.deletedAt = new Date().toISOString();
        shipment.deletedBy = 'system';
        shipment.deletedReason = '超过 3 天未审核自动删除';
        shipment.deleteType = 'SYSTEM_TIMEOUT';
        this.deletedShipmentIds.add(shipment.id);
        this.audit('shipment.review.timeout_delete', shipment.id, principal, before, shipment);
      }
    }
  }

  private operatorCustomerScope(principal: Principal) {
    if (!isSalesScopedRole(principal.role)) {
      return undefined;
    }
    return Array.from(new Set([principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value))));
  }

  private ensureCustomerMasterAccess(principal: Principal, customer: CustomerSummary) {
    const scope = this.operatorCustomerScope(principal);
    if (scope && (!customer.salesperson || !scope.includes(customer.salesperson))) {
      throw new ForbiddenException('业务员只能操作自己名下客户');
    }
  }

  private resolveWarehousePackageOwner(customerCode: string) {
    const customer = this.customers.find((item) => item.code === customerCode);
    const salesperson = customer?.salesperson;
    const account = salesperson ? this.accounts.find((item) => item.username === salesperson) : undefined;
    return {
      customerName: customer ? this.customerDisplayName(customer) : undefined,
      salesperson,
      site: account?.site
    };
  }

  private visibleShipment(principal: Principal, shipmentId: string) {
    const shipment = this.visibleShipments(principal).find((item) => item.id === shipmentId);
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    return shipment;
  }

  private visibleReviewShipment(principal: Principal, shipmentId: string) {
    const shipment = this.visibleReviewShipments(principal).find((item) => item.id === shipmentId);
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
      settled: fee.settled,
      type: 'RECEIVABLE',
      currency: fee.currency,
      settlementMethod: this.resolveReceivableSettlementMethod({ settlementMethod: fee.settlementMethod }),
      paymentNo: fee.paymentNo,
      reconciliationStatus: fee.reconciliationStatus,
      createdAt: fee.createdAt,
      createdBy: fee.createdBy,
      reviewedAt: fee.reviewedAt,
      reviewedBy: fee.reviewedBy,
      remark: fee.remark,
      locked: fee.reconciliationStatus === 'CONFIRMED',
      voided: fee.voided,
      sourceType: fee.sourceType
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

  private trackingWebsiteForCarrier(carrier: string, transferNo: string) {
    const encoded = encodeURIComponent(transferNo);
    const code = this.toCarrierAdapterCode(carrier);
    if (code === 'UPS') return `https://www.ups.com/track?tracknum=${encoded}`;
    if (code === 'DHL') return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encoded}`;
    if (code === 'FEDEX') return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
    if (code === 'USPS') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
    return undefined;
  }

  private shipmentStatusEnteredAt(shipment: Shipment, status: string) {
    const row = [...this.auditLogs].reverse().find((item) => {
      const after = item.after as { status?: string; statusTo?: string } | undefined;
      return item.target === shipment.id && (after?.status === status || after?.statusTo === status);
    });
    return row?.createdAt ?? shipment.outboundAt ?? shipment.reviewedAt ?? shipment.createdAt;
  }

  private dwellHours(from?: string, to = new Date().toISOString()) {
    const start = from ? new Date(from).getTime() : NaN;
    const end = new Date(to).getTime();
    return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round(((end - start) / 3600000) * 100) / 100) : 0;
  }

  private findCustomer(id: string): StoredCustomer {
    const customer = this.customers.find((item) => item.id === id);
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    return customer;
  }

  private getShipmentById(id: string): Shipment & { customerId?: string } {
    const shipment = this.shipments.find((item) => item.id === id) as (Shipment & { customerId?: string }) | undefined;
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    return shipment;
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

  private ensurePricingManager(principal: Principal, message = '只有管理员或市场可以操作') {
    if (!['ADMIN', 'UG_MARKET'].includes(principal.role)) {
      throw new ForbiddenException(message);
    }
  }

  private ensureWarehouseAccess(principal: Principal) {
    if (!['ADMIN', 'WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role)) {
      throw new ForbiddenException('没有仓库管理权限');
    }
  }

  private normalizePriceBookRow(priceBookId: string, row: PriceBookImportInput['rows'][number], index: number): StoredPriceBookRow {
    if (!row.agentName?.trim() || !row.channelName?.trim() || !row.destinationCountry?.trim() || !Number.isFinite(row.minWeightKg) || !Number.isFinite(row.maxWeightKg) || !Number.isFinite(row.costPerKg) || row.maxWeightKg <= row.minWeightKg || row.costPerKg <= 0) {
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
      currency: row.currency?.trim().toUpperCase() || 'RMB',
      transitDays: row.transitDays,
      transitLabel: row.transitLabel?.trim() || undefined,
      quoteSourceType: row.quoteSourceType ?? 'local',
      surchargeFee: typeof row.surchargeFee === 'number' ? roundMoney(row.surchargeFee) : undefined,
      surchargeDetails: row.surchargeDetails ?? [],
      productSurchargeRemark: row.productSurchargeRemark?.trim() || undefined,
      specialRemark: row.specialRemark?.trim() || undefined
    };
  }

  private toPriceBookSummary(book: StoredPriceBook): PriceBookSummary {
    return {
      id: book.id,
      fileName: book.fileName,
      rowCount: book.rowCount,
      importedAt: book.importedAt,
      remark: book.remark,
      legacyModuleCounts: buildInMemoryLegacyModuleCounts(this.priceBookRows.filter((row) => row.priceBookId === book.id))
    };
  }

  private channelSummary(channel: ChannelSummary & { carrier?: string }): ChannelSummary {
    return {
      id: channel.id,
      name: channel.name,
      carrierId: channel.carrierId,
      carrierName: channel.carrierName,
      businessType: channel.businessType ?? 'EXPRESS',
      category: channel.category ?? channel.carrierName,
      volumeDivisor: channel.volumeDivisor ?? 5000,
      multiPieceWeightRule: channel.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: channel.singleWeightRoundingRule ?? 'ACTUAL',
      settlementWeightRule: channel.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: channel.settlementWeightRoundingRule ?? 'NONE',
      largeCargoThresholdKg: channel.largeCargoThresholdKg,
      remoteAreaRule: channel.remoteAreaRule ?? 'NONE',
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

  private nextWarehouseTallyTaskNo(combinedOrderNo: string): string {
    const count = this.warehouseTallyTasks.filter((item) => item.taskNo.startsWith(`${combinedOrderNo}-TL`)).length + 1;
    return `${combinedOrderNo}-TL${String(count).padStart(3, '0')}`;
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
      salesperson: customer.salesperson,
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

function buildWarehousePackageSummary(id: string, input: WarehousePackageCreateInput): WarehousePackageSummary {
  const parsedCombinedOrderNo = parseMemoryWarehouseCombinedOrderNo(input.combinedOrderNo);
  const customerOrderNo = input.customerOrderNo?.trim() || parsedCombinedOrderNo.customerOrderNo;
  const customerCode = input.customerCode?.trim() || customerOrderNo;
  const domesticTrackingNo = input.domesticTrackingNo?.trim() || parsedCombinedOrderNo.domesticTrackingNo;
  if (!customerCode) {
    throw new BadRequestException('请填写客户编号');
  }
  if (customerCode.length > 8) {
    throw new BadRequestException('客户编号最长 8 位');
  }
  if (!domesticTrackingNo) {
    throw new BadRequestException('请填写快递单号');
  }
  if (domesticTrackingNo.length > 64) {
    throw new BadRequestException('快递单号最长 64 位');
  }
  const expectedTotalPackageCount = Math.max(1, Math.floor(Number(input.expectedTotalPackageCount) || 1));
  const packageIndex = Math.min(expectedTotalPackageCount, Math.max(1, Math.floor(Number(input.packageIndex) || 1)));
  const packageCount = Math.max(1, Math.floor(Number(input.packageCount) || 1));
  const weightKg = roundMoney(Number(input.weightKg) || 0);
  const lengthCm = roundMoney(Number(input.lengthCm) || 0);
  const widthCm = roundMoney(Number(input.widthCm) || 0);
  const heightCm = roundMoney(Number(input.heightCm) || 0);
  const cbm = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 1000000);
  const volumetricWeightKg = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 6000);
  const volumetricWeightKg5000 = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 5000);
  const girthCm = calculateMemoryWarehouseGirth(lengthCm, widthCm, heightCm);
  const combinedOrderNo = `${customerOrderNo}-${domesticTrackingNo}`;
  const scanTime = input.scanTime ?? new Date().toISOString();
  return {
    id,
    customerCode,
    customerOrderNo,
    domesticTrackingNo,
    combinedOrderNo,
    labelNo: createWarehouseInboundLabelNo(customerCode, domesticTrackingNo, packageIndex, expectedTotalPackageCount),
    receivingChannel: '外部标签识别',
    destinationCountry: undefined,
    expectedTotalPackageCount,
    packageIndex,
    packageCount,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    girthCm,
    cbm,
    totalCbm: cbm,
    volumetricWeightKg,
    volumetricWeightKg5000,
    totalVolumetricWeightKg: volumetricWeightKg,
    totalVolumetricWeightKg5000: volumetricWeightKg5000,
    chargeableWeightKg: roundMoney(Math.max(weightKg, volumetricWeightKg)),
    divisor: 6000,
    roundingRule: 'NONE',
    scanTime,
    remark: input.remark?.trim() || undefined,
    manualException: input.manualException?.trim() || undefined,
    scanSource: input.scanSource?.trim() || undefined,
    inboundAt: scanTime,
    receiptSourceId: id,
    tallyStatus: '待理货',
    splitStatus: '原始票',
    consolidationStatus: '未合票',
    outboundStatus: '未出库',
    status: 'RECEIVED',
    exceptions: packageIndex < expectedTotalPackageCount ? ['部分到仓'] : [],
    createdAt: scanTime
  };
}

function parseMemoryWarehouseCombinedOrderNo(value?: string) {
  const normalized = value?.trim() ?? '';
  const separatorIndex = normalized.search(/[-－—–]/);
  if (separatorIndex <= 0) {
    return { customerOrderNo: normalized, domesticTrackingNo: '' };
  }
  return {
    customerOrderNo: normalized.slice(0, separatorIndex).trim(),
    domesticTrackingNo: normalized.slice(separatorIndex + 1).trim()
  };
}

function resolveMemoryWarehouseTodayRange(query: WarehouseTodayQuery) {
  const now = new Date();
  const preset = query.datePreset ?? 'TODAY';
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let start = startOfDay(now);
  let end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (preset === 'WEEK') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (preset === 'LAST_7_DAYS') {
    start.setDate(start.getDate() - 6);
    end = new Date(startOfDay(now));
    end.setDate(end.getDate() + 1);
  } else if (preset === 'MONTH') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (preset === 'CUSTOM') {
    start = query.customFrom ? new Date(`${query.customFrom}T00:00:00`) : start;
    end = query.customTo ? new Date(`${query.customTo}T00:00:00`) : end;
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

function createWarehouseInboundLabelNo(customerCode: string, domesticTrackingNo: string, packageIndex: number, totalPackages: number): string {
  return `${customerCode}-${domesticTrackingNo}-${packageIndex}/${totalPackages}`;
}

function normalizeWarehousePackage(pkg: Omit<WarehousePackageSummary, 'status' | 'createdAt' | 'chargeableWeightKg' | 'roundingRule' | 'divisor' | 'exceptions'>): WarehousePackageSummary {
  const totalVolumetricWeightKg5000 = pkg.volumetricWeightKg5000 ?? roundMoney((pkg.lengthCm * pkg.widthCm * pkg.heightCm * pkg.packageCount) / 5000);
  return {
    ...pkg,
    labelNo: pkg.labelNo ?? createWarehouseInboundLabelNo(pkg.customerCode, pkg.domesticTrackingNo, pkg.packageIndex ?? 1, pkg.expectedTotalPackageCount ?? pkg.packageCount),
    girthCm: pkg.girthCm ?? calculateMemoryWarehouseGirth(pkg.lengthCm, pkg.widthCm, pkg.heightCm),
    totalCbm: pkg.totalCbm ?? pkg.cbm,
    volumetricWeightKg5000: totalVolumetricWeightKg5000,
    totalVolumetricWeightKg: pkg.totalVolumetricWeightKg ?? pkg.volumetricWeightKg,
    totalVolumetricWeightKg5000: pkg.totalVolumetricWeightKg5000 ?? totalVolumetricWeightKg5000,
    chargeableWeightKg: roundMoney(Math.max(pkg.weightKg, pkg.volumetricWeightKg)),
    divisor: 6000,
    roundingRule: 'NONE',
    status: 'RECEIVED',
    exceptions: pkg.expectedTotalPackageCount ? ['部分到仓'] : [],
    inboundAt: pkg.inboundAt ?? pkg.scanTime,
    receiptSourceId: pkg.receiptSourceId ?? pkg.id,
    tallyStatus: pkg.tallyStatus ?? '待理货',
    splitStatus: pkg.splitStatus ?? (pkg.sourcePackageId ? '拆票子票' : '原始票'),
    consolidationStatus: pkg.consolidationStatus ?? '未合票',
    outboundStatus: pkg.outboundStatus ?? '未出库',
    createdAt: pkg.scanTime ?? new Date().toISOString()
  };
}

function cloneWarehouseTallyTask(task: WarehouseTallyTaskSummary): WarehouseTallyTaskSummary {
  return {
    ...task,
    packageIds: [...task.packageIds]
  };
}

function matchesMemoryWarehouseTallyScope(task: WarehouseTallyTaskSummary, query: WarehouseTallyTaskListQuery) {
  if (!query.completedScope && !query.completedFrom && !query.completedTo) return true;
  if (task.status !== 'COMPLETED' || !task.completedAt) return false;
  const completedAt = new Date(task.completedAt);
  if (query.completedScope === 'RECENT' && completedAt < resolveMemoryWarehouseTallyRecentCutoff()) return false;
  if (query.completedScope === 'HISTORY' && completedAt >= resolveMemoryWarehouseTallyRecentCutoff()) return false;
  if (query.completedFrom && completedAt < new Date(query.completedFrom)) return false;
  if (query.completedTo && completedAt >= new Date(query.completedTo)) return false;
  return true;
}

function resolveMemoryWarehouseTallyRecentCutoff() {
  const now = new Date();
  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return new Date(Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth() - 1, beijingNow.getUTCDate(), -8, 0, 0, 0));
}

function roundWarehouseMeasure(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function warehousePackageActualWeightTotal(pkg: Pick<WarehousePackageSummary, 'sourcePackageId' | 'weightKg' | 'packageCount'>): number {
  return pkg.sourcePackageId ? pkg.weightKg : pkg.weightKg * pkg.packageCount;
}

function warehousePackageSplitTotals(packages: WarehousePackageSummary[]) {
  return {
    packageCount: packages.reduce((sum, pkg) => sum + pkg.packageCount, 0),
    weightKg: roundMoney(packages.reduce((sum, pkg) => sum + warehousePackageActualWeightTotal(pkg), 0)),
    cbm: roundMoney(packages.reduce((sum, pkg) => sum + pkg.cbm, 0)),
    volumetricWeightKg: roundMoney(packages.reduce((sum, pkg) => sum + pkg.volumetricWeightKg, 0)),
    volumetricWeightKg5000: roundMoney(packages.reduce((sum, pkg) => sum + (pkg.volumetricWeightKg5000 ?? 0), 0))
  };
}

function buildWarehouseTallyLabelQrContent(task: WarehouseTallyTaskSummary, labelNo: string): string {
  return JSON.stringify({
    type: 'WAREHOUSE_TALLY_LABEL',
    labelNo,
    taskNo: task.taskNo,
    customerCode: task.customerCode,
    date: (task.completedAt ?? new Date().toISOString()).slice(0, 10),
    packageCount: task.completedPackageCount ?? task.packageCount,
    sourcePackageId: task.sourcePackageId,
    sourceCombinedOrderNo: task.sourceCombinedOrderNo
  });
}

function calculateMemoryWarehouseGirth(lengthCm: number, widthCm: number, heightCm: number): number {
  const sides = [lengthCm, widthCm, heightCm].sort((left, right) => right - left);
  return roundMoney((sides[0] ?? 0) + 2 * ((sides[1] ?? 0) + (sides[2] ?? 0)));
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
  const chargeableWeightKg = calculateLookupChargeableWeight(input);
  const warehouseProfile = createWarehouseLookupProfile(input);
  if ((!destinationCountry && !warehouseProfile.code) || !Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) {
    throw new BadRequestException('目的地和计费重不能为空');
  }

  const priceBookRemarkMap = new Map(priceBooks.filter((book) => !book.deleted).map((book) => [book.id, book.remark?.trim() || undefined]));
  const markupRules = (persistedMarkupRules.length ? persistedMarkupRules : defaultAgentMarkupRules).filter((rule) => !('deletedAt' in rule) || !rule.deletedAt);
  const matchedPrices = selectPriceRowsForLookup(priceRows, warehouseProfile, destinationCountry, chargeableWeightKg);
  if (!matchedPrices.length) {
    throw new BadRequestException('没有匹配的代理成本价');
  }

  const canViewInternalPricing = canViewPricingInternalRoute(principal.role);
  const recommendations = matchedPrices
    .map<PriceLookupRecommendation | null>((price) => {
      const markup = findBestMarkupRule(markupRules, price);
      if (!markup) {
        return null;
      }

      const quoteTotals = applyAgentMarkup(price.costPerKg, chargeableWeightKg, markup);
      const salesRatePerKg = quoteTotals.salesRatePerKg;
      const totalCost = roundMoney(price.costPerKg * chargeableWeightKg);
      const totalSales = quoteTotals.totalSales;
      const surchargeFee = roundMoney(price.surchargeFee ?? 0);
      const realChannelName = price.realChannelName?.trim() || price.channelName.trim();
      const businessRouteName = price.businessRouteName?.trim() || undefined;
      const publicCode = publicPricingRouteCode(price.channelName, realChannelName, businessRouteName, price.agentName);
      const visiblePrice = canViewInternalPricing ? { ...price } : omitInternalPriceFields(maskPriceRouteForBusiness(price, publicCode));
      return {
        price: visiblePrice,
        ...(canViewInternalPricing ? { markup } : {}),
        channelName: canViewInternalPricing ? price.channelName : publicCode,
        carrierName: price.carrierName?.trim() || inferBackendPriceCarrierName(price),
        agentName: canViewInternalPricing ? price.agentName : publicCode,
        realChannelName: canViewInternalPricing ? realChannelName : publicCode,
        isRouteMapped: Boolean(businessRouteName),
        quoteSourceType: price.quoteSourceType ?? 'local',
        weightSegmentLabel: `${price.minWeightKg}-${price.maxWeightKg}kg`,
        salesRatePerKg,
        freightFee: totalSales,
        surchargeFee,
        totalFee: roundMoney(totalSales + surchargeFee),
        freightUnitPrice: salesRatePerKg,
        totalUnitPrice: roundMoney((totalSales + surchargeFee) / chargeableWeightKg),
        ...(canViewInternalPricing ? { totalCost, grossProfit: roundMoney(totalSales - totalCost) } : {}),
        totalSales,
        transitLabel: price.transitLabel ?? '时效待确认',
        surchargeDetails: price.surchargeDetails ?? [],
        ...(price.productSurchargeRemark ? { productSurchargeRemark: price.productSurchargeRemark } : {}),
        ...(price.specialRemark ? { specialRemark: price.specialRemark } : {}),
        ...(businessRouteName ? { businessRouteName: canViewInternalPricing ? businessRouteName : publicCode } : {}),
        ...(price.priceBookId && priceBookRemarkMap.get(price.priceBookId) ? { remark: priceBookRemarkMap.get(price.priceBookId) } : {})
      };
    })
    .filter((recommendation): recommendation is PriceLookupRecommendation => Boolean(recommendation));

  if (!recommendations.length) {
    throw new BadRequestException('没有启用的代理加价规则');
  }

  const cheapestRecommendations = [...recommendations].sort((left, right) => left.totalSales - right.totalSales || left.salesRatePerKg - right.salesRatePerKg).slice(0, 3);
  const fastestRecommendations = recommendations
    .filter((item) => Number.isFinite(matchedTransitDays(item)))
    .sort((left, right) => (matchedTransitDays(left) - matchedTransitDays(right)) || left.totalSales - right.totalSales)
    .slice(0, 3);
  const bestRecommendation = cheapestRecommendations[0];
  if (!bestRecommendation) {
    throw new BadRequestException('没有可用报价');
  }

  return {
    price: bestRecommendation.price,
    ...(canViewInternalPricing && bestRecommendation.markup ? { markup: bestRecommendation.markup } : {}),
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
    ...(canViewInternalPricing ? { totalCost: bestRecommendation.totalCost, grossProfit: bestRecommendation.grossProfit } : {}),
    totalSales: bestRecommendation.totalSales,
    totalPrice: bestRecommendation.totalSales
  };
}

function omitInternalPriceFields(price: PriceBookRowSummary): PriceLookupRecommendation['price'] {
  return { ...price, costPerKg: undefined };
}

function canViewPricingInternalRoute(role: string): boolean {
  return role === 'ADMIN' || role === 'UG_MARKET';
}

function publicPricingRouteCode(...values: Array<string | undefined>): string {
  for (const value of values) {
    const match = value?.trim().match(/[A-Za-z]{2,}(?:[-_][A-Za-z0-9]+)?|[A-Za-z]{2,}[A-Za-z0-9]*/);
    if (match) return match[0].split(/[-_]/)[0].toUpperCase();
  }
  return '推荐线路';
}

function maskPriceRouteForBusiness(price: PriceBookRowSummary, publicCode: string): PriceBookRowSummary {
  return {
    ...price,
    agentName: publicCode,
    channelName: publicCode,
    realChannelName: publicCode,
    businessRouteName: publicCode,
    sourceSheetName: undefined
  };
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

function calculateLookupChargeableWeight(input: PriceLookupRequest) {
  const manualWeightValue = Number(input.chargeableWeightKg);
  const manualWeight = Number.isFinite(manualWeightValue) ? manualWeightValue : 0;
  const packageCount = Number(input.packageCount ?? 1);
  const safePackageCount = Number.isFinite(packageCount) && packageCount > 0 ? packageCount : 1;
  const volumeWeight = Number(input.volumeCbm ?? 0) > 0 ? Number(input.volumeCbm) * 167 : 0;
  const actualWeight = Number(input.actualWeightKg ?? 0) > 0
    ? Number(input.actualWeightKg)
    : (Number(input.unitActualWeightKg ?? 0) > 0 ? Number(input.unitActualWeightKg) * safePackageCount : 0);
  const dimensionWeight =
    Number(input.lengthCm ?? 0) > 0 && Number(input.widthCm ?? 0) > 0 && Number(input.heightCm ?? 0) > 0
      ? (Number(input.lengthCm) * Number(input.widthCm) * Number(input.heightCm) * safePackageCount) / 6000
      : 0;
  return roundMoney(Math.max(manualWeight, volumeWeight, actualWeight, dimensionWeight));
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
  destinationCountry: string | undefined,
  chargeableWeightKg: number
) {
  const candidates = priceRows
    .map((row) => ({ row, rank: getWarehouseMatchRank(row, warehouseProfile) }))
    .filter(
      (candidate): candidate is { row: PriceBookRowSummary; rank: number } =>
        candidate.rank !== undefined &&
        (destinationCountry ? candidate.row.destinationCountry === destinationCountry : candidate.rank < 3) &&
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

function normalizeAgentMarkupInput(input: AgentMarkupCreateInput | AgentMarkupUpdateInput | AgentMarkupSummary): AgentMarkupSummary {
  const markupType = input.markupType ?? 'WEIGHT';
  const rawValue = input.markupValue ?? input.markupPerKg ?? 0;
  const markupValue = roundMoney(Number(rawValue));
  return {
    id: 'id' in input ? input.id : '',
    agentName: input.agentName?.trim() ?? '',
    channelName: input.channelName?.trim() || undefined,
    realChannelName: input.realChannelName?.trim() || undefined,
    destinationCountry: input.destinationCountry?.trim() || undefined,
    markupType,
    markupValue,
    markupPerKg: markupType === 'WEIGHT' ? markupValue : roundMoney(Number(input.markupPerKg ?? 0)),
    priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : 100,
    enabled: input.enabled !== false,
    createdAt: 'createdAt' in input ? input.createdAt : undefined,
    updatedAt: 'updatedAt' in input ? input.updatedAt : undefined,
    deletedAt: 'deletedAt' in input ? input.deletedAt : undefined
  };
}

function validateAgentMarkupRule(rule: AgentMarkupSummary, priceRows: PriceBookRowSummary[], rules: AgentMarkupSummary[], currentId?: string) {
  if (!rule.agentName) throw new BadRequestException('代理名称不能为空');
  if (!Number.isFinite(rule.markupValue ?? rule.markupPerKg) || (rule.markupValue ?? rule.markupPerKg) < 0) throw new BadRequestException('加价值不能为空');
  if (!['WEIGHT', 'PER_SHIPMENT', 'FIXED', 'PERCENT'].includes(rule.markupType ?? 'WEIGHT')) throw new BadRequestException('加价方式不正确');
  const conflict = rules.find((item) =>
    item.id !== currentId &&
    !item.deletedAt &&
    item.agentName === rule.agentName &&
    (item.channelName ?? '') === (rule.channelName ?? '') &&
    (item.realChannelName ?? '') === (rule.realChannelName ?? '') &&
    (item.destinationCountry ?? '') === (rule.destinationCountry ?? '') &&
    (item.priority ?? 100) === (rule.priority ?? 100)
  );
  if (conflict) throw new BadRequestException('优先级冲突，请调整规则优先级');
}

function buildAgentMarkupListResponse(rules: AgentMarkupSummary[], priceRows: PriceBookRowSummary[], query: AgentMarkupListQuery): AgentMarkupListResponse {
  const activeRows = rules.filter((rule) => !rule.deletedAt);
  const enriched = activeRows.map((rule) => ({ ...rule, hitCount: countAgentMarkupHits(rule, priceRows) }));
  const filtered = enriched
    .filter((rule) => textMatch(rule.agentName, query.agentName))
    .filter((rule) => textMatch(rule.channelName ?? '', query.channelName))
    .filter((rule) => textMatch(rule.realChannelName ?? '', query.realChannelName))
    .filter((rule) => textMatch(rule.destinationCountry ?? '', query.destinationCountry))
    .filter((rule) => query.status === 'ENABLED' ? rule.enabled : query.status === 'DISABLED' ? !rule.enabled : true)
    .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100) || safeTime(right.updatedAt) - safeTime(left.updatedAt));
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Number(query.pageSize ?? 20);
  const grouped = query.detail ? filtered : groupAgentMarkupRows(filtered, priceRows);
  const rows = pageSize < 0 ? grouped : grouped.slice((page - 1) * pageSize, page * pageSize);
  const matchedRows = new Set(enriched.flatMap((rule) => matchingPriceRowsForRule(rule, priceRows).map((row) => row.id)));
  return {
    metrics: {
      totalRules: activeRows.length,
      enabledRules: activeRows.filter((rule) => rule.enabled).length,
      disabledRules: activeRows.filter((rule) => !rule.enabled).length,
      unmatchedQuotes: priceRows.filter((row) => !matchedRows.has(row.id)).length,
      latestUpdatedAt: activeRows.map((rule) => rule.updatedAt).filter(Boolean).sort().at(-1)
    },
    rows,
    pagination: { page, pageSize: pageSize < 0 ? grouped.length : pageSize, totalItems: grouped.length }
  };
}

function groupAgentMarkupRows(rules: AgentMarkupSummary[], priceRows: PriceBookRowSummary[]) {
  const groups = new Map<string, AgentMarkupSummary[]>();
  for (const rule of rules) {
    const list = groups.get(rule.agentName) ?? [];
    list.push(rule);
    groups.set(rule.agentName, list);
  }
  return [...groups.entries()].map(([agentName, rows]) => {
    const sorted = [...rows].sort((left, right) => markupScopeRank(left) - markupScopeRank(right) || (left.priority ?? 100) - (right.priority ?? 100) || safeTime(right.updatedAt) - safeTime(left.updatedAt));
    const primary = sorted[0];
    const hitIds = new Set(rows.flatMap((rule) => matchingPriceRowsForRule(rule, priceRows).map((row) => row.id)));
    const latestUpdatedAt = rows.map((rule) => rule.updatedAt).filter(Boolean).sort().at(-1);
    return {
      ...primary,
      id: `agent:${agentName}`,
      agentName,
      channelName: undefined,
      realChannelName: undefined,
      destinationCountry: undefined,
      enabled: rows.some((rule) => rule.enabled),
      ruleCount: rows.length,
      hitCount: hitIds.size,
      updatedAt: latestUpdatedAt ?? primary.updatedAt
    };
  });
}

function markupScopeRank(rule: AgentMarkupSummary) {
  return [rule.channelName, rule.realChannelName, rule.destinationCountry].filter(Boolean).length;
}

function buildAgentMarkupPreview(rule: AgentMarkupSummary, priceRows: PriceBookRowSummary[], logs: Array<{ action: string; createdAt?: string; actor?: { username?: string } }>): AgentMarkupPreviewResponse {
  const rows = matchingPriceRowsForRule(rule, priceRows);
  const channels = new Set(rows.map((row) => row.channelName));
  const countries = new Set(rows.map((row) => row.destinationCountry));
  return {
    rule: { ...rule, hitCount: rows.length },
    scope: {
      channelLabel: rule.channelName ?? '全部渠道',
      realChannelLabel: rule.realChannelName ?? '全部线路',
      countryLabel: rule.destinationCountry ?? '全部国家'
    },
    stats: { priceBookRows: rows.length, channels: channels.size, countries: countries.size },
    examples: rows.slice(0, 8).map((row) => ({
      id: row.id,
      channelName: row.channelName,
      realChannelName: row.realChannelName,
      destinationCountry: row.destinationCountry,
      weightSegmentLabel: `${row.minWeightKg}-${row.maxWeightKg}kg`
    })),
    recentChanges: logs.slice(0, 5).map((log) => ({ action: log.action, actor: log.actor?.username, createdAt: log.createdAt ?? new Date().toISOString() }))
  };
}

function matchingPriceRowsForRule(rule: AgentMarkupSummary, priceRows: PriceBookRowSummary[]) {
  return priceRows.filter((row) =>
    row.agentName === rule.agentName &&
    (!rule.channelName || row.channelName === rule.channelName) &&
    (!rule.realChannelName || (row.realChannelName ?? row.channelName) === rule.realChannelName) &&
    (!rule.destinationCountry || row.destinationCountry === rule.destinationCountry)
  );
}

function countAgentMarkupHits(rule: AgentMarkupSummary, priceRows: PriceBookRowSummary[]) {
  return matchingPriceRowsForRule(rule, priceRows).length;
}

function textMatch(value: string, keyword?: string) {
  return !keyword?.trim() || value.toLowerCase().includes(keyword.trim().toLowerCase());
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function safeTime(value?: string) {
  const time = Date.parse(value ?? '');
  return Number.isFinite(time) ? time : 0;
}

function applyAgentMarkup(costPerKg: number, chargeableWeightKg: number, rule: AgentMarkupSummary) {
  const type = rule.markupType ?? 'WEIGHT';
  const value = Number(rule.markupValue ?? rule.markupPerKg ?? 0);
  const totalCost = roundMoney(costPerKg * chargeableWeightKg);
  if (type === 'PERCENT') {
    const totalSales = roundMoney(totalCost * (1 + value / 100));
    return { totalSales, salesRatePerKg: roundMoney(totalSales / chargeableWeightKg) };
  }
  if (type === 'PER_SHIPMENT' || type === 'FIXED') {
    const totalSales = roundMoney(totalCost + value);
    return { totalSales, salesRatePerKg: roundMoney(totalSales / chargeableWeightKg) };
  }
  const salesRatePerKg = roundMoney(costPerKg + value);
  return { totalSales: roundMoney(salesRatePerKg * chargeableWeightKg), salesRatePerKg };
}

function findBestMarkupRule(markupRules: AgentMarkupSummary[], price: PriceBookRowSummary): AgentMarkupSummary | undefined {
  const destination = price.destinationCountry.trim();
  const channel = price.channelName.trim();
  const realChannel = price.realChannelName?.trim() || price.channelName.trim();
  return [...markupRules]
    .filter((rule) => rule.enabled && !rule.deletedAt && rule.agentName === price.agentName)
    .filter((rule) => {
      const channelMatches = !rule.channelName || rule.channelName === channel;
      const realChannelMatches = !rule.realChannelName || rule.realChannelName === realChannel;
      const countryMatches = !rule.destinationCountry || rule.destinationCountry === destination;
      return channelMatches && realChannelMatches && countryMatches;
    })
    .sort((left, right) =>
      (left.priority ?? 100) - (right.priority ?? 100)
      || markupSpecificity(right, channel, realChannel, destination) - markupSpecificity(left, channel, realChannel, destination)
      || safeTime(right.updatedAt) - safeTime(left.updatedAt)
    )[0];
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

function normalizeMemoryStaffProfile(input: MemoryStaffProfileInput) {
  const gender = staffGenderValues.includes(input.gender as StaffGender) ? (input.gender as StaffGender) : 'UNKNOWN';
  return {
    name: normalizeMemoryOptionalText(input.name, 40),
    phone: normalizeMemoryOptionalText(input.phone, 30),
    gender,
    nickname: normalizeMemoryOptionalText(input.nickname, 40),
    site: normalizeMemoryOptionalText(input.site, 40)
  };
}

function updateMemoryStaffProfile(account: Account, input: MemoryStaffProfileInput | StaffAccountUpdateInput) {
  if (input.name !== undefined) account.name = normalizeMemoryOptionalText(input.name, 40);
  if (input.phone !== undefined) account.phone = normalizeMemoryOptionalText(input.phone, 30);
  if (input.gender !== undefined) account.gender = staffGenderValues.includes(input.gender as StaffGender) ? (input.gender as StaffGender) : 'UNKNOWN';
  if (input.nickname !== undefined) account.nickname = normalizeMemoryOptionalText(input.nickname, 40);
  if (input.site !== undefined) account.site = normalizeMemoryOptionalText(input.site, 40);
}

function normalizeMemoryOptionalText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function nextWarehouseSplitSequence(rootCombinedOrderNo: string, combinedOrderNos: string[]) {
  const prefix = `${rootCombinedOrderNo}-`;
  return combinedOrderNos.reduce((max, combinedOrderNo) => {
    if (!combinedOrderNo.startsWith(prefix)) return max;
    const suffix = Number(combinedOrderNo.slice(prefix.length));
    return Number.isInteger(suffix) && suffix > max ? suffix : max;
  }, 0) + 1;
}

function pickMemoryStaffProfile(account: Account) {
  return {
    name: account.name,
    phone: account.phone,
    gender: account.gender ?? 'UNKNOWN',
    nickname: account.nickname,
    site: account.site
  };
}

function matchMemoryStaffAccount(account: Account, query: StaffAccountQuery, roleLabel: string) {
  const keyword = query.keyword?.trim().toLowerCase();
  const enabled = account.enabled !== false;
  return (!keyword || [account.username, account.name, account.nickname, account.phone, roleLabel].some((value) => value?.toLowerCase().includes(keyword)))
    && (!query.site?.trim() || account.site === query.site.trim())
    && (!query.role?.trim() || account.role === query.role.trim())
    && (!query.status || query.status === 'ALL' || (query.status === 'ENABLED' ? enabled : !enabled));
}

function isSalesScopedRole(role: string): boolean {
  return [
    'OPERATOR',
    'UG_MARKET',
    'UG_BUSINESS',
    'UG_SZ_WUHAN',
    'UG_ZZ_SIHUA',
    'UG_WH_JIUYULIAN',
    'UG_BUSINESS_MANAGER',
    'UG_BUSINESS_SUPERVISOR'
  ].includes(role);
}

function isFinalReviewRole(role: string): boolean {
  return role === 'FINANCE' || role === 'UG_FINANCE';
}

function inferMemoryIpRegion(ip: string): string {
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.')) {
    return '本机';
  }
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) {
    return '内网';
  }
  return '公网 IP，地区待解析';
}

function buildInMemoryLegacyModuleCounts(rows: PriceBookRowSummary[]) {
  const counts: Partial<Record<LegacyPricingModule, number>> = {};
  for (const row of rows) {
    const module = inferInMemoryLegacyModule(row);
    counts[module] = (counts[module] ?? 0) + 1;
  }
  return counts;
}

function inferInMemoryLegacyModule(row: PriceBookRowSummary): LegacyPricingModule {
  const source = `${row.sourceSheetName ?? ''} ${row.channelName ?? ''} ${row.realChannelName ?? ''} ${row.businessRouteName ?? ''} ${row.destinationCountry ?? ''}`.toLowerCase();
  if (row.warehouseCode?.trim() || /仓库|fba|amazon|亚马逊/.test(source)) return 'amazon';
  if (/南非|south africa|south-africa/.test(source)) return 'southAfrica';
  if (!/超大件|大件/.test(source) && /空海运|铁路|快递|空运|空派|express|rail|air|fedex|dhl|ups/.test(source)) return 'europeExpress';
  if (/超大件|海运|海卡|卡派|卡车|truck|oversize|大件/.test(source)) return 'inquiry';
  return 'europeExpress';
}

function dedupeInMemoryLegacyRows(rows: PriceBookRowSummary[]) {
  const result = new Map<string, PriceBookRowSummary>();
  for (const row of rows) {
    const key = [row.agentName, row.channelName, row.realChannelName ?? '', row.warehouseCode ?? '', row.destinationCountry, row.minWeightKg, row.maxWeightKg].join('|');
    if (!result.has(key)) result.set(key, row);
  }
  return [...result.values()];
}

import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  canTransitionShipment,
  calculateCompanyChannelChargeWeight,
  calculateCompanyChannelChargeWeightFromCargo,
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
  matchUsPostalRule,
  matchesEuropeanPostalRule,
  isUsPostalRuleSyntax,
  hasScopedUsPostalRuleOverlap,
  normalizeUsPostalCode,
  canadaAddressTypeMatchesWarehouseCode,
  sanitizePricingChannelRequirement,
  sanitizePricingTransitLabel,
  isCanadaAddressScopeWarehouseCode,
  normalizeCanadaAddressType,
  normalizeCanadaAmazonWarehousePrefix,
  isInvalidWarehouseCodeRule,
  parseWarehouseCodeRules,
  validateShipmentImportRows,
  type AccountLedgerSummary,
  type AgentMarkupCreateInput,
  type AgentMarkupUnit,
  type AgentMarkupExportResponse,
  type AgentMarkupImportResponse,
  type AgentMarkupListQuery,
  type AgentMarkupListResponse,
  type AgentMarkupPreviewResponse,
  type AgentMarkupSummary,
  type AgentMarkupUpdateInput,
  type MarkupRoutePreviewInput,
  type MarkupRoutePreviewResponse,
  type MarkupRouteTierReplaceInput,
  type PricingCalculationBreakdown,
  type AgentChannelCustomRemarkInput,
  type AgentChannelCustomRemarkSummary,
  type AgentChannelCreateInput,
  type AgentChannelSummary,
  type AgentChannelUpdateInput,
  type AgentCreateInput,
  type AgentDeleteResponse,
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
  type OrderEntryWarehousePackageQuery,
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
  type PriceBookImportJobResponse,
  type PriceBookImportJobSummary,
  type PriceBookImportResult,
  type PriceBookImportTargetModule,
  type PriceBookRemarkUpdateInput,
  type PriceBookRowsQuery,
  type PriceBookRowsResponse,
  type PriceBooksResponse,
  type PriceBookRowSummary,
  type PriceBookSummary,
  type DubaiPriceDisplayActivateInput,
  type DubaiPriceDisplayResponse,
  type DubaiPriceDisplayVersionListResponse,
  type DubaiPriceTableResponse,
  type DubaiPriceTableRow,
  type PricingOldOriginalAgentCleanupResponse,
  type LegacyPricingImportInput,
  type LegacyPricingMetaResponse,
  type LegacyPricingModule,
  type LegacyPricingQuoteRequest,
  type LegacyPricingQuoteResponse,
  type LegacyPricingRecommendation,
  type LegacyPricingSourceSummary,
  type SouthAfricaLookupRequest,
  type SouthAfricaLookupResult,
  type SouthAfricaLookupResponse,
  type SouthAfricaRateImageListResponse,
  type SouthAfricaRateImageSummary,
  type SouthAfricaRateRuleInput,
  type SouthAfricaRateRuleListResponse,
  type SouthAfricaRateRuleSummary,
  type PriceLookupRequest,
  type PriceLookupResponse,
  type PriceLookupRecommendation,
  type PricingSyncHealthResponse,
  type PricingRuleRefreshProgressResponse,
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
  type ShipmentInternalFlowLogResponse,
  type LineShipmentPackageSummary,
  type LineShipmentPoolResponse,
  type ShipmentFinanceDetailSummary,
  type ShipmentLabelSummary,
  type ShipmentOperationalUpdateInput,
  type CustomerServiceTransferBatchInput,
  type CustomerServiceTransferBatchResponse,
  type ShipmentPaymentUpdateInput,
  type ShipmentDispatchInput,
  type WarehouseHandoverPrintInput,
  type WarehouseHandoverPrintResponse,
  type WarehouseHandoverSummary,
  type ShipmentRerouteInput,
  type ShipmentRouteInput,
  type ShipmentRestoreInput,
  type ShipmentReviewBasicUpdateInput,
  type ShipmentReviewDeleteInput,
  type ShipmentReviewDetailSummary,
  type ShipmentReviewEventSummary,
  type ShipmentLogisticsTrackingEventSummary,
  type ShipmentReviewPackageSummary,
  type ShipmentReviewRejectInput,
  type BusinessType,
  type ShipmentStatus,
  type TrackingEventInput,
  type WarehouseConsolidationCreateInput,
  type WarehouseConsolidationSummary,
  type WarehouseInStockQuery,
  type WarehouseInStockResponse,
  type WarehouseManualReceiptCreateInput,
  type WarehouseManualReceiptCreateResponse,
  type WarehousePackageCreateInput,
  type WarehousePackageGroupSummary,
  type WarehousePackageSplitInput,
  type WarehousePackageSplitResponse,
  type WarehousePackageSummary,
  type WarehousePackageUpdateInput,
  type WarehouseTallyLabelScanInput,
  type WarehouseTallyLabelScanResponse,
  type WarehouseTallyTaskCompleteInput,
  type WarehouseTallyTaskPackageResultInput,
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
import { PRICING_PARSER_RULE_VERSIONS, inferEuropeOversizeCargoType, inferEuropeTransportMode, inspectDubaiWorkbookSheets, inspectEuropeOversizeWorkbookSheets, normalizeEuropeTransportModeFilter, normalizePricingImportRowForModule, parsePriceWorkbookBuffer, pricingParserRuleVersion, summarizeEuropeTransportImportHealth } from './pricing-excel.js';
import { amazonWeightBandMinimum, calculateLookupChargeableWeight, createWarehouseLookupProfile, inferAmazonWeightBandFromMin, normalizeAmazonCbmTier, normalizeAmazonOriginWarehouseName, normalizeAmazonWeightBand, selectPriceRowsForLookup, uniqueAmazonOriginWarehouseNames, withOpenEndedHighestPriceTiers } from './pricing/amazon-pricing.shared.js';
import { buildLineagePriceBookMetrics, LineageWatcher } from './lineage-watcher.js';
import { buildLineShipmentPackageSummaries } from './line-shipment-packages.js';
import { getPasswordStrengthError, hashPassword } from './password.js';
import { nextWarehouseRetallyTaskNo, nextWarehouseTallyTaskNo } from './warehouse-tally-task-number.js';
import { createWarehouseTallyPackageLabelNo } from './warehouse-tally-label.js';
import { canUpdateUnenteredWarehousePackage } from './warehouse-package-editability.js';
import {
  buildWarehouseManualReceiptPackageInputs,
  buildWarehouseTallyLabelQrContent,
  createWarehouseInboundLabelNo,
  nextWarehouseSplitSequence,
  normalizeOrderEntryPackageIds,
  parseWarehouseCombinedOrderNo,
  resolveWarehouseTodayRange,
  warehousePackageActualWeightTotal,
  warehousePackageSplitTotals
} from './warehouse/warehouse-domain.shared.js';
import { resolveWarehouseTallyRecentCutoff } from './warehouse/warehouse-query.shared.js';
import {
  allPermissions,
  buildRolePermissionRow,
  defaultPermissionsForRole,
  defaultRoleGroups,
  getPermissionDefinitions,
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
  departmentId?: string;
  site?: string;
  enabled?: boolean;
  mustChangePassword?: boolean;
}

type ReviewRestoreInputWithManual = ShipmentRestoreInput & {
  mode?: ShipmentRestoreInput['mode'] | 'MANUAL_TIME';
  manualCreatedAt?: string;
};

const staffGenderValues: StaffGender[] = ['UNKNOWN', 'MALE', 'FEMALE', 'OTHER'];
const warehouseNavigationViewPermissions: PermissionKey[] = [
  'warehouse:today-receipt:view',
  'warehouse:in-stock:view',
  'warehouse:tally-pending:view',
  'warehouse:tally-completed:view',
  'warehouse:dispatch-pending:view',
  'warehouse:outbounded:view'
];

interface MemoryStaffProfileInput {
  name?: string;
  phone?: string;
  gender?: string;
  nickname?: string;
  departmentId?: string;
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

function customerServiceStatusLineageKey(status: string) {
  const keys: Record<string, string> = {
    DEPARTED: 'customer_service.departure.confirm',
    ARRIVED_PORT: 'customer_service.arrived_port.confirm',
    DELIVERING: 'customer_service.delivering.confirm',
    SIGNED: 'customer_service.signed.confirm'
  };
  return keys[status];
}

function readInMemoryAuditIpAddress(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const ipAddress = (value as { ipAddress?: unknown }).ipAddress;
  return typeof ipAddress === 'string' && ipAddress.trim() ? ipAddress.trim() : undefined;
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
    'shipment.route.delete': '删除待排货',
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
    'finance.payment_application.create': '生成付款申请',
    'finance.payment_application.cancel': '撤回付款申请',
    'finance.payment_application.export': '导出付款申请单',
    'finance.payment.bank.select': '选择收款银行',
    'finance.payment.bank.save': '保存收款银行',
    'finance.payment.bank.use_once': '本次使用收款银行',
    'finance.payment_voucher.add': '上传供应商账单截图',
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

function isAccountEventForPrincipal(row: AuditLogSummary, principal: Principal) {
  if (row.action.startsWith('auth.login.')) return false;
  if (['auth.profile.update', 'auth.password.change'].includes(row.action)) {
    return row.actorId === principal.id && row.target === `user:${principal.id}`;
  }
  if (!row.action.startsWith('system.staff.')) return false;
  if (row.target.includes(principal.id)) return true;
  return auditValueMentionsPrincipal(row.before, principal) || auditValueMentionsPrincipal(row.after, principal);
}

function auditValueMentionsPrincipal(value: unknown, principal: Principal) {
  if (value == null) return false;
  try {
    const serialized = JSON.stringify(value);
    return serialized.includes(principal.id) || serialized.includes(principal.username);
  } catch {
    return false;
  }
}

function auditModuleFromMemoryPath(path: string) {
  const pathname = path.split('?')[0] ?? '';
  if (pathname.startsWith('/api/finance') || pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/api/integrations/mojia') || pathname.startsWith('/integrations/mojia')) return 'warehouse';
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
  receiptMatchSource?: 'AUTO' | 'MANUAL';
  receiptMatchHint?: string;
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
  targetModule?: PriceBookImportTargetModule;
}

interface StoredPriceBookRow extends PriceBookRowSummary {}

interface StoredPriceBookImportJob extends PriceBookImportJobSummary {
  filePath?: string;
  sourceBuffer?: Buffer;
  targetModule: PriceBookImportTargetModule;
}

interface StoredDubaiPriceDisplayVersion {
  id: string;
  priceBookId?: string;
  originalName: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  isActive: boolean;
  isActiveAir: boolean;
  isActiveSea: boolean;
  salesSafe: boolean;
  message?: string;
  unassignedSheets?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  pages: Array<{ id: string; mode: 'AIR' | 'SEA' | 'UNASSIGNED'; sheetName: string; pageNo: number; fileName: string; sizeBytes: number }>;
}

const defaultAgentMarkupRules: AgentMarkupSummary[] = [
  { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, markupType: 'WEIGHT' as const, markupValue: 0.5, priority: 100, enabled: true },
  { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, markupType: 'WEIGHT' as const, markupValue: 1, priority: 100, enabled: true }
];

const seedAgentQuoteErrors = [
  { agentName: 'BSD', quoteCount: 0, errorCode: 'TOKEN_INVALID', errorMessage: 'Token不正确' }
];

const PRICING_LOOKUP_RESPONSE_LIMIT = 100;
const PRICE_BOOK_JSON_IMPORT_ROW_LIMIT = 2000;
const AGENT_MARKUP_EXPORT_ROW_LIMIT = 2000;

const warehouseMockPackages: Array<Omit<WarehousePackageSummary, 'status' | 'createdAt' | 'chargeableWeightKg' | 'roundingRule' | 'divisor' | 'exceptions'>> = [
  { id: 'wh-1399-1', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, scanTime: '2026-06-08T10:07:28.000+08:00', remark: '木架，外箱轻微磨损' },
  { id: 'wh-1399-2', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 13.9, lengthCm: 130, widthCm: 46, heightCm: 51, cbm: 0.30498, volumetricWeightKg: 50.83, scanTime: '2026-06-08T10:08:08.000+08:00' },
  { id: 'wh-1399-3', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 129, widthCm: 46, heightCm: 51, cbm: 0.302634, volumetricWeightKg: 50.44, scanTime: '2026-06-08T10:08:48.000+08:00' },
  { id: 'wh-p710-1', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', combinedOrderNo: 'P710-999056444656', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 8.6, lengthCm: 90, widthCm: 40, heightCm: 42, cbm: 0.1512, volumetricWeightKg: 25.2, scanTime: '2026-06-09T09:15:03.000+08:00' },
  { id: 'wh-p710-2', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444657', combinedOrderNo: 'P710-999056444657', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 9.1, lengthCm: 92, widthCm: 41, heightCm: 40, cbm: 0.15088, volumetricWeightKg: 25.15, scanTime: '2026-06-09T09:18:22.000+08:00' },
  { id: 'wh-p710-3', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444658', combinedOrderNo: 'P710-999056444658', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 8.9, lengthCm: 91, widthCm: 39, heightCm: 41, cbm: 0.145509, volumetricWeightKg: 24.25, scanTime: '2026-06-09T09:21:09.000+08:00' }
];

@Injectable()
export class InMemoryRepository {
  constructor(@Optional() @Inject(LineageWatcher) private readonly lineage?: LineageWatcher) {}

  private sequence = 20;
  private readonly deletedShipmentIds = new Set<string>();
  private readonly rolePermissionMatrix: Record<RoleKey, PermissionKey[]> = {
    ADMIN: [...rolePermissions.ADMIN],
    CUSTOMER_SERVICE: [...rolePermissions.CUSTOMER_SERVICE],
    OPERATOR: [...rolePermissions.OPERATOR],
    WAREHOUSE: [...rolePermissions.WAREHOUSE],
    FINANCE: [...rolePermissions.FINANCE],
    CUSTOMER: [...rolePermissions.CUSTOMER],
    ...Object.fromEntries(defaultRoleGroups.map((group) => [group.key, defaultPermissionsForRole(group.key)]))
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
    { id: 'u-admin', username: 'admin', passwordHash: hashPassword('admin123'), role: 'ADMIN', departmentId: 'department-system' },
    { id: 'u-cs', username: 'service', passwordHash: hashPassword('service123'), role: 'UG_CUSTOMER_SERVICE', departmentId: 'department-customer-service' },
    { id: 'u-op', username: 'operator', passwordHash: hashPassword('operator123'), role: 'UG_BUSINESS', departmentId: 'department-business' },
    { id: 'u-market', username: 'market', passwordHash: hashPassword('market123'), role: 'UG_MARKET', departmentId: 'department-market' },
    { id: 'u-warehouse', username: 'warehouse', passwordHash: hashPassword('warehouse123'), role: 'WAREHOUSE', departmentId: 'department-warehouse' },
    { id: 'u-finance', username: 'finance', passwordHash: hashPassword('finance123'), role: 'UG_FINANCE', departmentId: 'department-finance' },
    { id: 'u-r-admin', username: 'R-admin', passwordHash: hashPassword('R-admin@123'), role: 'ADMIN', name: 'R-admin', departmentId: 'department-system' },
    { id: 'u-r-sales', username: 'R-sales', passwordHash: hashPassword('R-sales@123'), role: 'UG_BUSINESS', name: 'R-sales', site: '深圳站', departmentId: 'department-business' },
    { id: 'u-r-market', username: 'R-market', passwordHash: hashPassword('R-market@123'), role: 'UG_BUSINESS', name: 'R-market', departmentId: 'department-market' },
    { id: 'u-r-warehouse', username: 'R-warehouse', passwordHash: hashPassword('R-warehouse@123'), role: 'WAREHOUSE', name: 'R-warehouse', site: '深圳站', departmentId: 'department-warehouse' },
    { id: 'u-r-service', username: 'R-service', passwordHash: hashPassword('R-service@123'), role: 'UG_CUSTOMER_SERVICE', name: 'R-service', departmentId: 'department-customer-service' },
    { id: 'u-r-finance', username: 'R-finance', passwordHash: hashPassword('R-finance@123'), role: 'UG_FINANCE', name: 'R-finance', departmentId: 'department-finance' },
    { id: 'u-customer', username: 'customer', passwordHash: hashPassword('customer123'), role: 'CUSTOMER', customerId: 'c-9409' }
  ];

  private readonly departments = [
    { id: 'department-business', name: '业务部', enabled: true },
    { id: 'department-market', name: '市场部', enabled: true },
    { id: 'department-warehouse', name: '仓储部', enabled: true },
    { id: 'department-customer-service', name: '客服部', enabled: true },
    { id: 'department-finance', name: '财务部', enabled: true },
    { id: 'department-system', name: '系统管理部', enabled: true }
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
    { id: 'a-9409-ups', code: 'AG-9409-UPS', shortName: 'AG-9409-UPS', name: 'AG-9409-UPS', createdAt: '2026-06-01T09:00:00.000Z', integrationType: 'MANUAL', warehouseAddress1: '深圳站', warehouseContact: 'AG-9409-UPS', enabled: true },
    { id: 'a-yuhuan', code: 'YH', shortName: '宇环', name: '深圳宇环', createdAt: '2026-06-02T09:00:00.000Z', integrationType: 'MANUAL', warehouseAddress1: '深圳市宝安区宇环仓一', warehouseContact: '宇环仓库', enabled: true },
    { id: 'a-far-east', code: 'YD', shortName: '远东', name: '深圳远东', createdAt: '2026-06-03T09:00:00.000Z', integrationType: 'MANUAL', warehouseAddress1: '深圳市龙岗区远东仓一', warehouseContact: '远东仓库', enabled: true },
    { id: 'a-yiyang', code: 'YY', shortName: '亿阳国际', name: '亿阳国际', createdAt: '2026-06-04T09:00:00.000Z', integrationType: 'MANUAL', enabled: true },
    { id: 'a-topda', code: 'TPD', shortName: '拓普达', name: '拓普达', createdAt: '2026-06-05T09:00:00.000Z', integrationType: 'MANUAL', enabled: true },
    { id: 'a-zhenyun', code: 'ZY', shortName: '振韵', name: '深圳振韵国际', createdAt: '2026-06-06T09:00:00.000Z', integrationType: 'MANUAL', enabled: true },
    { id: 'a-chihan', code: 'CH', shortName: '驰汉', name: '驰汉', createdAt: '2026-06-07T09:00:00.000Z', integrationType: 'MANUAL', enabled: true },
    { id: 'a-canada', code: 'JMDL', shortName: '加美代理', name: '深圳加美代理', createdAt: '2026-06-08T09:00:00.000Z', integrationType: 'API', warehouseAddress1: '深圳市加美仓', warehouseContact: '加美仓库', enabled: true },
    { id: 'a-lanmate', code: 'LMT', shortName: '蓝玛特', name: '蓝玛特', createdAt: '2026-06-09T09:00:00.000Z', integrationType: 'PLATFORM', warehouseAddress1: '蓝玛特仓库', warehouseContact: '蓝玛特仓库', enabled: true },
    { id: 'a-europe', code: 'OZDL', shortName: '欧洲代理', name: '欧洲代理', createdAt: '2026-06-10T09:00:00.000Z', integrationType: 'MANUAL', warehouseAddress1: '欧洲代理仓库', warehouseContact: '欧洲仓库', enabled: true },
    ...['a代理', '亮崽统一代理', '保留规则代理', '原始欧洲快递代理', '天图7.2', '性能代理', '批量冲突代理', '无时效代理', '权限测试代理', '混合加价代理', '自动同步代理', '英文代理', '虚拟删除代理', '虚拟默认加价删除测试', '规则保留代理', '越权代理', '重量段代理', '大表代理', 'JSON大表代理'].map((name, index) => ({
      id: `a-test-${index + 1}`,
      code: `TEST${index + 1}`,
      shortName: name,
      name,
      createdAt: '2026-06-11T09:00:00.000Z',
      integrationType: 'MANUAL' as const,
      enabled: true
    }))
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
  readonly priceBookImportJobs: StoredPriceBookImportJob[] = [];
  readonly dubaiPriceDisplayVersions: StoredDubaiPriceDisplayVersion[] = [];
  readonly legacyPricingSources: LegacyPricingSourceSummary[] = [];
  readonly legacyPricingRows: LegacyPricingRecommendation[] = [];
  readonly agentMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules.map((rule) => ({ ...rule }));
  readonly agentChannelCustomRemarks: AgentChannelCustomRemarkSummary[] = [];
  readonly southAfricaRateImages: SouthAfricaRateImageSummary[] = [];
  readonly southAfricaRateRules: SouthAfricaRateRuleSummary[] = defaultSouthAfricaRateRules();
  readonly southAfricaPendingReviews: NonNullable<SouthAfricaLookupResponse['pendingReview']>[] = [];
  readonly auditLogs: AuditLogSummary[] = [];
  private readonly navigationReadStates = new Map<string, { watermark: string; readAt: string }>();
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

  async getAccountEvents(principal: Principal): Promise<AuditLogSummary[]> {
    return this.auditLogs
      .filter((row) => isAccountEventForPrincipal(row, principal))
      .slice(0, 20)
      .map((row) => ({ ...row, before: this.cloneAuditValue(row.before), after: this.cloneAuditValue(row.after) }));
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

  async getShipments(principal: Principal, options: { exposeWarehouseRouting?: boolean } = {}): Promise<Shipment[]> {
    const canViewMarketAgent = await this.hasAnyPermission(principal.role, [
      'market:pending-routing:agent-channel-view',
      'market:routed:agent-channel-view'
    ]);
    const canViewMarketCosts = await this.hasAnyPermission(principal.role, [
      'market:pending-routing:cost-field-view',
      'market:routed:agent-cost-view',
      'market:routed:cost-total-view',
      'market:weekly-routing:cost-view'
    ]);
    return this.visibleShipments(principal).map((shipment) => this.maskShipmentListFields(
      principal,
      this.withSalespersonSite(this.withWarehouseDispatchArchiveFields(shipment)),
      { canViewMarketAgent, canViewMarketCosts, exposeWarehouseRouting: options.exposeWarehouseRouting ?? false }
    ));
  }

  async getWarehouseDispatchShipments(principal: Principal): Promise<Shipment[]> {
    const [canViewPending, canViewOutbounded] = await Promise.all([
      this.hasPermission(principal.role, 'warehouse:dispatch-pending:view'),
      this.hasPermission(principal.role, 'warehouse:outbounded:view')
    ]);
    const visibleStatuses = new Set<Shipment['status']>([
      ...(canViewPending ? ['WAITING_DISPATCH' as const] : []),
      ...(canViewOutbounded ? ['OUTBOUNDED' as const] : [])
    ]);
    return (await this.getShipments(principal, { exposeWarehouseRouting: true }))
      .filter((shipment) => visibleStatuses.has(shipment.status));
  }

  async getShipmentStatusCounts(principal: Principal) {
    return summarizeStatusCounts(await this.getShipments(principal));
  }

  async getNavigationUnreadBadges(principal: Principal) {
    const shipments = await this.getShipments(principal);
    const auditWatermarks = new Map<string, string>();
    this.auditLogs.forEach((row) => {
      const current = auditWatermarks.get(row.target);
      if (!current || row.createdAt > current) auditWatermarks.set(row.target, row.createdAt);
    });
    const shipmentRows = (statuses: ShipmentStatus[], businessType?: BusinessType) => shipments
      .filter((row) => statuses.includes(row.status) && (!businessType || row.businessType === businessType))
      .map((row) => ({ id: row.id, watermark: auditWatermarks.get(row.id) ?? row.createdAt }));
    const ticketRows = this.tickets
      .filter((ticket) => principal.role !== 'CUSTOMER' || (ticket.customerVisible && ticket.shipmentCustomerId === principal.customerId))
      .filter((ticket) => ticket.status !== 'CLOSED')
      .map((ticket) => ({ id: ticket.id, watermark: [ticket.createdAt, ticket.closedAt, ...ticket.replies.map((reply) => reply.createdAt)].filter(Boolean).sort().at(-1) ?? ticket.createdAt }));
    const packageRows = this.warehousePackages.map((row) => ({ id: row.id, watermark: (row as { updatedAt?: string }).updatedAt ?? row.createdAt }));
    const read = (moduleKey: string, sectionKey: string, rows: Array<{ id: string; watermark: string }>) => {
      const state = this.navigationReadStates.get(`${principal.id}:${moduleKey}:${sectionKey}`);
      const unread = state ? rows.filter((row) => row.watermark > state.watermark) : rows;
      const latestWatermark = rows.map((row) => row.watermark).sort().at(-1);
      return { moduleKey, sectionKey, unreadCount: new Set(unread.map((row) => row.id)).size, displayCount: unread.length > 999 ? '999+' : String(unread.length), latestWatermark };
    };
    const items = [
      read('customerService', 'pending-routing', shipmentRows(['WAITING_SORT'])),
      read('customerService', 'waitingDeparture', shipmentRows(['WAITING_DEPARTURE'])),
      read('customerService', 'departed', shipmentRows(['DEPARTED'])),
      read('customerService', 'problems', ticketRows),
      read('receive', 'consolidation', packageRows.filter((row) => ['RECEIVED', 'IN_STOCK'].includes((this.warehousePackages.find((pkg) => pkg.id === row.id)?.status ?? '')))),
      read('receive', 'packages', packageRows),
      read('receive', 'queue', shipmentRows(['WAITING_DISPATCH'])),
      read('workspace', 'shipmentPool', shipmentRows([], 'DEDICATED_LINE')),
      read('business', 'order-entry-drafts', shipmentRows(['DRAFT', 'REVIEW_REJECTED'])),
      read('business', 'pending-review', shipmentRows(['REVIEW_PENDING'])),
      read('business', 'order-management', shipmentRows([
        'DRAFT',
        'REVIEW_PENDING',
        'REVIEW_REJECTED',
        'WAITING_RECEIVE',
        'WAITING_SORT',
        'WAITING_DISPATCH',
        'OUTBOUNDED',
        'WAITING_DEPARTURE',
        'DEPARTED',
        'ARRIVED_PORT',
        'DELIVERING',
        'SIGNED'
      ])),
      read('market', 'pending-routing', shipmentRows(['WAITING_SORT'])),
      read('market', 'routed', shipmentRows(['WAITING_DISPATCH'])),
      read('finance', 'receivables', this.auditLogs.filter((row) => row.action.startsWith('finance.receivable')).map((row) => ({ id: row.target, watermark: row.createdAt }))),
      read('finance', 'payment-applications', this.auditLogs.filter((row) => row.action.startsWith('finance.payment_application')).map((row) => ({ id: row.target, watermark: row.createdAt })))
    ];
    const visible = new Set<string>();
    if (await this.hasPermission(principal.role, 'operations:line-shipment:view')) visible.add('workspace');
    if (await this.hasAnyPermission(principal.role, warehouseNavigationViewPermissions)) visible.add('receive');
    if (await this.hasAnyPermission(principal.role, ['business:dashboard:view', 'business:order-entry:view', 'business:review:list', 'business:shipment:list', 'business:order-ai:view'])) visible.add('business');
    if (await this.hasAnyPermission(principal.role, ['market:dashboard:view', 'market:pending-routing:view', 'market:routed:view', 'market:weekly-routing:view'])) visible.add('market');
    if (await this.hasAnyPermission(principal.role, ['customer-service:dashboard:view', 'customer-service:data-confirm:view', 'customer-service:transfer:view', 'customer-service:pending-routing:view', 'customer-service:waiting-departure:view', 'customer-service:departed:view', 'customer-service:arrived-port:view', 'customer-service:delivering:view', 'customer-service:signed:view', 'customer-service:problem:view'])) visible.add('customerService');
    if (await this.hasPermission(principal.role, 'finance:dashboard:view')) visible.add('finance');
    const scoped = items.filter((item) => visible.has(item.moduleKey));
    const parentItems = [...new Set(scoped.map((item) => item.moduleKey))].map((moduleKey) => {
      const children = scoped.filter((item) => item.moduleKey === moduleKey);
      const unreadCount = children.reduce((total, item) => total + item.unreadCount, 0);
      return { moduleKey, unreadCount, displayCount: unreadCount > 999 ? '999+' : String(unreadCount) };
    });
    return { items: [...scoped, ...parentItems] };
  }

  async markNavigationRead(principal: Principal, input: { moduleKey: string; sectionKey?: string }) {
    const moduleKey = input.moduleKey.trim();
    const sectionKey = input.sectionKey?.trim() ?? '';
    if (!moduleKey) throw new BadRequestException('模块标识不能为空');
    const now = new Date().toISOString();
    this.navigationReadStates.set(`${principal.id}:${moduleKey}:${sectionKey}`, { watermark: now, readAt: now });
    return { ok: true, moduleKey, sectionKey: sectionKey || undefined, readAt: now, watermark: now };
  }

  async customerServiceTransferShipments(principal: Principal): Promise<Shipment[]> {
    if (!await this.hasPermission(principal.role, 'customer-service:transfer:view')) throw new ForbiddenException('无权查看转单号');
    const canViewAll = await this.hasPermission(principal.role, 'customer-service:transfer:view-all');
    const rows = (await this.getShipments(principal))
      .filter((shipment) => shipment.status === 'OUTBOUNDED' && !shipment.transferNo)
      .filter((shipment) => this.isCustomerServiceDataApproved(shipment.id, 'business') && this.isCustomerServiceDataApproved(shipment.id, 'agent'))
      .filter((shipment) => canViewAll || shipment.salesperson === principal.username);
    const can = (permission: PermissionKey) => this.hasPermission(principal.role, permission);
    return Promise.all(rows.map(async (shipment) => {
      const row = { ...shipment } as Record<string, unknown>;
      if (!await can('customer-service:transfer:view-outbound-time')) delete row.outboundAt;
      if (!await can('customer-service:transfer:view-agent')) {
        delete row.agentName;
        delete row.channelName;
        delete row.routeAgentChannelName;
      }
      if (!await can('customer-service:transfer:view-agent-data')) delete row.agentWeightKg;
      if (!await can('customer-service:transfer:view-sensitive')) {
        delete row.declarationRequired;
        delete row.sensitive;
      }
      return row as unknown as Shipment;
    }));
  }

  async fillCustomerServiceTransferShipments(principal: Principal, input: CustomerServiceTransferBatchInput): Promise<CustomerServiceTransferBatchResponse> {
    if (!await this.hasPermission(principal.role, 'customer-service:transfer:write')) throw new ForbiddenException('无权填写转单号');
    const rows = input.rows ?? [];
    if (!rows.length) throw new BadRequestException('请至少选择一票订单');
    if (rows.length > 1 && !await this.hasPermission(principal.role, 'customer-service:transfer:batch-write')) throw new ForbiddenException('无权批量填写转单号');
    const duplicate = rows.map((row) => row.transferNo.trim()).find((value, index, all) => value && all.indexOf(value) !== index);
    if (duplicate) throw new BadRequestException(`同一批次转单号重复：${duplicate}`);
    const results = [];
    for (const row of rows) {
      try {
        const transferNo = row.transferNo?.trim();
        if (!transferNo) throw new BadRequestException('转单号不能为空');
        const updated = await this.updateShipmentOperational(principal, row.shipmentId, {
          transferNo,
          subOrderNo: row.subOrderNo?.trim() || undefined,
          status: 'WAITING_DEPARTURE',
          latestTracking: '已填写转单号，待离港'
        });
        this.audit('customer_service.transfer.fill', updated.id, principal, null, { transferNo, subOrderNo: row.subOrderNo?.trim(), pushToSales: row.pushToSales === true, pushStatus: row.pushToSales ? 'PENDING' : undefined });
        results.push({ shipmentId: row.shipmentId, systemOrderNo: updated.systemOrderNo, success: true, shipment: updated });
      } catch (error) {
        this.audit('customer_service.transfer.fill_failed', row.shipmentId, principal, null, { reason: error instanceof Error ? error.message : '填写失败' });
        results.push({ shipmentId: row.shipmentId, success: false, reason: error instanceof Error ? error.message : '填写失败' });
      }
    }
    return { results };
  }

  async getLineShipmentPool(principal: Principal, query: LineShipmentPoolQuery = {}): Promise<LineShipmentPoolResponse> {
    const allRows = (await this.getShipments(principal)).filter((shipment) => shipment.businessType === 'DEDICATED_LINE');
    const packageBindings = this.auditLogs
      .filter((log) => log.action === 'shipment.warehouse_packages.bind')
      .map((log) => ({
        shipmentId: log.target,
        packageIds: ((log.after as { warehousePackageIds?: string[] } | null)?.warehousePackageIds ?? [])
      }));
    const packageSummariesByShipmentId = buildLineShipmentPackageSummaries(allRows, this.warehousePackages, packageBindings);
    const shipmentIds = new Set(allRows.map((shipment) => shipment.id));
    const businessDataApprovedShipmentIds = this.auditLogs
      .filter((row) => row.action === 'customer_service.business_data.approved' && shipmentIds.has(row.target))
      .map((row) => row.target);
    const agentDataApprovedShipmentIds = this.auditLogs
      .filter((row) => row.action === 'customer_service.agent_data.approved' && shipmentIds.has(row.target))
      .map((row) => row.target);
    const afterSaleShipmentIds = this.auditLogs
      .filter((row) => {
        if (row.action !== 'customer_service.issue.attach') return false;
        const after = row.after as Record<string, unknown> | null;
        return typeof after?.shipmentId === 'string' && shipmentIds.has(after.shipmentId) && after.originalStatusPool === 'SIGNED';
      })
      .map((row) => (row.after as Record<string, string>).shipmentId);
    const response = summarizeLineShipmentPool(allRows, query, { businessDataApprovedShipmentIds, agentDataApprovedShipmentIds, afterSaleShipmentIds, packageSummariesByShipmentId });
    const canViewSensitive = await this.hasPermission(principal.role, 'operations:line-shipment:process')
      || await this.hasPermission(principal.role, 'operations:product-map:cost-sensitive-view');
    if (canViewSensitive) return response;
    return {
      ...response,
      metrics: { ...response.metrics, estimatedReceivable: 0 },
      rows: response.rows.map((row) => ({
        ...row,
        receivableAmount: undefined,
        shipment: { ...row.shipment, remark: undefined, agentName: '', agentChannelName: '' }
      }))
    };
  }

  async getShipmentInternalFlowLog(principal: Principal, shipmentId: string): Promise<ShipmentInternalFlowLogResponse> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const packageIds = new Set([
      ...(shipment.draftWarehousePackageIds ?? []),
      ...this.warehousePackages
        .filter((pkg) => pkg.shipmentId === shipment.id || pkg.systemOrderNo === shipment.systemOrderNo)
        .map((pkg) => pkg.id)
    ]);
    const financeItemIds = new Set(this.shipmentFinanceItems.filter((item) => item.shipmentId === shipment.id).map((item) => item.id));
    const problemTicketIds = new Set(this.tickets.filter((ticket) => ticket.shipmentId === shipment.id).map((ticket) => ticket.id));
    const traceTargetIds = new Set([shipment.id, ...packageIds, ...financeItemIds, ...problemTicketIds]);
    const actions = this.auditLogs.filter((row) => traceTargetIds.has(row.target));
    const items = [{ key: 'created', stage: '业务录单', happenedAt: shipment.createdAt, operator: shipment.entryBy ?? '系统', summary: '运单已创建' }, ...actions.map((row) => ({ key: row.id, stage: internalFlowStage(row.action, row.after), happenedAt: row.createdAt, operator: row.actorUsername, summary: internalFlowSummary(row.action, row.after) }))]
      .filter((item) => item.stage)
      .sort((a, b) => (a.happenedAt ?? '').localeCompare(b.happenedAt ?? ''));
    return { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, items };
  }

  async getMasterData(): Promise<MasterDataSnapshot> {
    return {
      customers: this.customers.map((customer) => ({ ...customer })),
      contacts: this.customerContacts.map((contact) => ({ ...contact })),
      customerUsers: this.customerUsers.map((user) => ({ ...user })),
      agents: this.agents
        .map((agent) => ({ ...agent }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.name.localeCompare(b.name, 'zh-CN')),
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

  async getPricingAgentNames(): Promise<string[]> {
    return Array.from(new Set(this.agents.flatMap((agent) => [agent.name, agent.shortName, agent.code])
      .map((name) => String(name ?? '').trim())
      .filter((name) => name.length >= 2)));
  }

  async createCustomer(principal: Principal, input: CustomerCreateInput): Promise<CustomerSummary> {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    if (this.customers.some((customer) => customer.code === input.code.trim())) {
      throw new BadRequestException('客户代码已存在');
    }
    const salesperson = this.resolveCustomerSalespersonAssignment(principal, input.salesperson);
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
    const matchedPackages = this.warehousePackages.filter((pkg) =>
      pkg.customerCode === customer.code
      && !pkg.salesperson
      && !pkg.shipmentId
    );
    const owner = this.resolveWarehousePackageOwner(customer.code);
    matchedPackages.forEach((pkg) => Object.assign(pkg, owner));
    this.audit('master_data.customer.create', customer.id, principal, null, customer);
    if (matchedPackages.length) {
      this.audit('master_data.customer.match_pending_packages', customer.id, principal, null, {
        customerCode: customer.code,
        customerName: owner.customerName,
        salesperson: owner.salesperson,
        packageIds: matchedPackages.map((pkg) => pkg.id),
        matchedPackageCount: matchedPackages.length
      });
    }
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
    const salesperson = this.resolveCustomerSalespersonAssignment(principal, input.salesperson, customer.salesperson);
    customer.name = input.name.trim();
    customer.shortName = input.shortName?.trim() || customer.name;
    customer.fullName = input.fullName?.trim() || `${customer.name} Co., Ltd.`;
    customer.customerType = input.customerType?.trim() || '直客';
    customer.customerSource = input.customerSource?.trim() || undefined;
    customer.salesperson = salesperson;
    customer.defaultSettlementMethod = input.defaultSettlementMethod?.trim() || undefined;
    if (typeof input.enabled === 'boolean') {
      customer.enabled = input.enabled;
    }
    const affectedShipmentCount = this.shipments.filter((shipment) => shipment.customerId === customer.id).length;
    const affectedPackageCount = this.warehousePackages.filter((pkg) => pkg.customerCode === before.code || pkg.customerCode === customer.code).length;
    const affectedWaterReceiptCount = this.waterReceipts.filter((receipt) => receipt.customerId === customer.id).length;
    this.shipments.filter((shipment) => shipment.customerId === customer.id).forEach((shipment) => { shipment.salesperson = salesperson; });
    this.warehousePackages
      .filter((pkg) => pkg.customerCode === before.code || pkg.customerCode === customer.code)
      .forEach((pkg) => { pkg.salesperson = salesperson; });
    this.waterReceipts.filter((receipt) => receipt.customerId === customer.id).forEach((receipt) => { receipt.salesperson = salesperson; });
    this.audit('master_data.customer.update', id, principal, before, customer);
    if (before.salesperson !== salesperson) {
      this.audit('master_data.customer.assign_salesperson', id, principal, {
        customerId: customer.id,
        customerCode: before.code,
        customerName: before.name,
        salesperson: before.salesperson
      }, {
        customerId: customer.id,
        customerCode: customer.code,
        customerName: customer.name,
        salesperson,
        affectedShipmentCount,
        affectedPackageCount,
        affectedWaterReceiptCount
      });
    }
    return { ...customer };
  }

  async createCustomerContact(principal: Principal, customerId: string, input: CustomerContactCreateInput): Promise<CustomerContactSummary> {
    const customer = this.findCustomer(customerId);
    this.ensureCustomerMasterAccess(principal, customer);
    if (!input.name?.trim()) {
      throw new BadRequestException('联系人名称不能为空');
    }
    const duplicate = this.customerContacts.some((contact) => contact.customerId === customer.id
      && contact.enabled
      && contact.name.trim() === input.name.trim()
      && (contact.company?.trim() ?? '') === (input.company?.trim() ?? '')
      && (contact.phone?.trim() ?? '') === (input.phone?.trim() ?? '')
      && (contact.fbaWarehouseCode?.trim() ?? '') === (input.fbaWarehouseCode?.trim() ?? '')
      && (contact.address?.trim() ?? '') === (input.address?.trim() ?? '')
      && (contact.country?.trim() ?? '') === (input.country?.trim() ?? '')
      && (contact.state?.trim() ?? '') === (input.state?.trim() ?? '')
      && (contact.postalCode?.trim() ?? '') === (input.postalCode?.trim() ?? ''));
    if (duplicate) {
      throw new BadRequestException('相同收货人地址已存在');
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
    const shortName = input.shortName?.trim() || input.name.trim();
    const normalizedShortName = shortName.toLowerCase();
    if (this.agents.some((item) => (item.shortName ?? item.name).trim().toLowerCase() === normalizedShortName)) {
      throw new BadRequestException(`代理简称“${shortName}”已存在，不允许重复录入`);
    }
    const settlementCycle = normalizeAgentSettlementCycle(input.settlementCycle);
    if (input.settlementCycle !== undefined && !settlementCycle) {
      throw new BadRequestException('代理账期仅支持周结、月结或单票结算');
    }
    const agent = {
      id: `a-${this.slug(input.name)}`,
      code: input.code?.trim() || input.name.trim().toUpperCase().slice(0, 6),
      shortName,
      name: input.name.trim(),
      createdAt: new Date().toISOString(),
      integrationType: input.integrationType ?? 'MANUAL',
      settlementCycle,
      warehouseAddress1: input.warehouseAddress1?.trim() || undefined,
      warehouseAddress2: input.warehouseAddress2?.trim() || undefined,
      warehouseAddress3: input.warehouseAddress3?.trim() || undefined,
      warehouseContact: input.warehouseContact?.trim() || undefined,
      invoiceTemplateName: input.invoiceTemplateName?.trim() || undefined,
      invoiceTemplateUrl: input.invoiceTemplateUrl?.trim() || undefined,
      trackingWebsite: input.trackingWebsite?.trim() || undefined,
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
    const shortName = input.shortName?.trim() || input.name.trim();
    const normalizedShortName = shortName.toLowerCase();
    const currentNormalizedShortName = (agent.shortName ?? agent.name).trim().toLowerCase();
    if (normalizedShortName !== currentNormalizedShortName
      && this.agents.some((item) => item.id !== id && (item.shortName ?? item.name).trim().toLowerCase() === normalizedShortName)) {
      throw new BadRequestException(`代理简称“${shortName}”已存在，不允许重复录入`);
    }
    const settlementCycle = normalizeAgentSettlementCycle(input.settlementCycle);
    if (input.settlementCycle !== undefined && !settlementCycle) {
      throw new BadRequestException('代理账期仅支持周结、月结或单票结算');
    }
    agent.code = input.code?.trim() || agent.code;
    agent.shortName = shortName;
    agent.name = input.name.trim();
    agent.integrationType = input.integrationType ?? agent.integrationType ?? 'MANUAL';
    agent.settlementCycle = settlementCycle;
    agent.warehouseAddress1 = input.warehouseAddress1?.trim() || undefined;
    agent.warehouseAddress2 = input.warehouseAddress2?.trim() || undefined;
    agent.warehouseAddress3 = input.warehouseAddress3?.trim() || undefined;
    agent.warehouseContact = input.warehouseContact?.trim() || undefined;
    agent.invoiceTemplateName = input.invoiceTemplateName?.trim() || undefined;
    agent.invoiceTemplateUrl = input.invoiceTemplateUrl?.trim() || undefined;
    agent.trackingWebsite = input.trackingWebsite?.trim() || undefined;
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

  async deleteAgents(principal: Principal, ids: string[]): Promise<AgentDeleteResponse> {
    const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (!uniqueIds.length) {
      throw new BadRequestException('请选择代理资料');
    }
    const agents = uniqueIds.map((id) => this.findEnabledEntity(this.agents, id, '代理不存在'));
    const referenceResults = agents.map((agent) => ({ agent, reasons: this.agentDeleteReferenceReasons(agent) }));
    const failures = referenceResults
      .filter((item) => item.reasons.length > 0)
      .map(({ agent, reasons }) => ({ id: agent.id, shortName: agent.shortName, name: agent.name, reasons }));
    if (failures.length) {
      const failureText = failures
        .map((failure) => `${failure.shortName ?? failure.name ?? failure.id}（${failure.reasons.join('、')}）`)
        .join('；');
      throw new BadRequestException(`代理资料存在业务引用，不能删除：${failureText}`);
    }
    const deletedAgents = referenceResults.filter((item) => item.reasons.length === 0).map(({ agent }) => ({ ...agent }));
    const deletedAt = new Date().toISOString();
    const deletedIds = new Set(deletedAgents.map((agent) => agent.id));
    const deletedNames = deletedAgents.flatMap((agent) => this.agentIdentityValues(agent));
    const conflictingNames = new Set(
      this.agents
        .filter((agent) => !deletedIds.has(agent.id))
        .flatMap((agent) => this.agentIdentityValues(agent))
    );
    const safeDeletedNames = new Set(deletedNames.filter((name) => !conflictingNames.has(name)));
    this.agentChannels.splice(0, this.agentChannels.length, ...this.agentChannels.filter((channel) => !deletedIds.has(channel.agentId)));
    this.agentBankAccounts.splice(0, this.agentBankAccounts.length, ...this.agentBankAccounts.filter((bank) => !this.agentBankMatches(bank, deletedIds, safeDeletedNames)));
    this.payeeBankAccounts.splice(0, this.payeeBankAccounts.length, ...this.payeeBankAccounts.filter((bank) => !this.agentBankMatches(bank, deletedIds, safeDeletedNames)));
    this.agents.splice(0, this.agents.length, ...this.agents.filter((agent) => !deletedIds.has(agent.id)));
    this.audit('master_data.agent.delete', 'master-data/agents', principal, { agents: deletedAgents }, {
      deletedCount: deletedAgents.length,
      agentIds: deletedAgents.map((agent) => agent.id),
      agentShortNames: deletedAgents.map((agent) => agent.shortName ?? agent.name),
      hardDelete: true,
      deletedAt
    });
    return { successCount: deletedAgents.length, deletedAgents, failures, hardDelete: true };
  }

  async createAgentChannel(principal: Principal, input: AgentChannelCreateInput): Promise<AgentChannelSummary> {
    if (!(await this.hasPermission(principal.role, 'master-data:agent-channels:create'))) {
      throw new ForbiddenException('没有新增代理渠道权限');
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

  async deleteAgentChannel(principal: Principal, id: string): Promise<AgentChannelSummary> {
    const channel = this.findEnabledEntity(this.agentChannels, id, '代理渠道不存在');
    const before = { ...channel };
    this.agentChannels.splice(this.agentChannels.findIndex((item) => item.id === id), 1);
    this.audit('master_data.agent_channel.delete', id, principal, before, null);
    return before;
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

  async deleteChannel(principal: Principal, id: string): Promise<ChannelSummary> {
    const channel = this.findEnabledEntity(this.channels, id, '渠道不存在');
    const before = this.channelSummary(channel);
    const reasons = [
      this.shipments.some((shipment) => shipment.channelId === id) ? '运单引用' : '',
      this.pricingRules.some((rule) => rule.channelId === id) ? '报价规则引用' : '',
      this.fuelRates.some((rate) => rate.channelId === id) ? '燃油费率引用' : ''
    ].filter(Boolean);
    if (reasons.length) {
      throw new BadRequestException(`该公司渠道存在${reasons.join('、')}，不能删除`);
    }
    this.channels.splice(this.channels.findIndex((item) => item.id === id), 1);
    this.audit('master_data.channel.delete', id, principal, before, null);
    return before;
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

  async deleteChannelCategory(principal: Principal, id: string): Promise<ChannelCategorySummary> {
    const category = this.findEnabledEntity(this.channelCategories, id, '类别不存在');
    const before = { ...category };
    if (this.channels.some((channel) => channel.category === category.name)) {
      throw new BadRequestException('该渠道类别已被公司渠道引用，不能删除');
    }
    this.channelCategories.splice(this.channelCategories.findIndex((item) => item.id === id), 1);
    this.audit('master_data.channel_category.delete', id, principal, before, null);
    return before;
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
      availablePermissions: getPermissionDefinitions(),
      roles: this.getRoles().map((role) => this.buildMemoryRoleRow(role))
    };
  }

  private departmentName(departmentId?: string): string | undefined {
    return this.departments.find((department) => department.id === departmentId)?.name;
  }

  private pickMemoryStaffProfile(account: Account) {
    return {
      ...pickMemoryStaffProfile(account),
      departmentId: account.departmentId,
      department: this.departmentName(account.departmentId)
    };
  }

  private resolveMemoryStaffDepartmentId(departmentId?: string, currentDepartmentId?: string): string | undefined {
    const normalizedDepartmentId = departmentId?.trim();
    if (!normalizedDepartmentId) return undefined;
    const department = this.departments.find((item) => item.id === normalizedDepartmentId);
    if (!department) throw new BadRequestException('所属部门不存在');
    if (!department.enabled && department.id !== currentDepartmentId) {
      throw new BadRequestException('所属部门已停用，请选择启用部门');
    }
    return department.id;
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
      .filter((account) => matchMemoryStaffAccount(account, query, this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label, this.departmentName(account.departmentId)))
      .map((account) => ({
        id: account.id,
        username: account.username,
        ...this.pickMemoryStaffProfile(account),
        role: account.role as StaffAccountRoleKey,
        roleLabel: this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label,
        enabled: account.enabled !== false,
        mustChangePassword: account.mustChangePassword === true,
        lastLoginAt: lastLoginByUserId.get(account.id),
        createdAt: new Date().toISOString()
      }));
  }

  async getDepartments(principal: Principal) {
    this.ensureAdmin(principal, '只有管理员可以查看部门');
    return [...this.departments]
      .sort((left, right) => Number(right.enabled) - Number(left.enabled) || left.name.localeCompare(right.name))
      .map((department) => ({ ...department }));
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
    const departmentId = this.resolveMemoryStaffDepartmentId(input.departmentId);
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
      departmentId,
      enabled: input.enabled !== false,
      mustChangePassword: true
    };
    this.accounts.push(account);
    this.audit('system.staff.create', `user:${account.id}`, principal, null, {
      username: account.username,
      role: account.role,
      enabled: account.enabled !== false,
      ...this.pickMemoryStaffProfile(account),
      mustChangePassword: true
    });
    return {
      id: account.id,
      username: account.username,
      ...this.pickMemoryStaffProfile(account),
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
    const before = { username: account.username, role: account.role, enabled: account.enabled !== false, ...this.pickMemoryStaffProfile(account) };
    if (username) account.username = username;
    if (input.role !== undefined) account.role = input.role;
    if (password) {
      account.passwordHash = hashPassword(password);
      account.mustChangePassword = true;
    }
    if (input.departmentId !== undefined) {
      account.departmentId = this.resolveMemoryStaffDepartmentId(input.departmentId, account.departmentId);
    }
    Object.assign(account, normalizeMemoryStaffProfile(input));
    if (input.enabled !== undefined) account.enabled = input.enabled === true;
    const after = { username: account.username, role: account.role, enabled: account.enabled !== false, ...this.pickMemoryStaffProfile(account) };
    this.audit('system.staff.update', `user:${account.id}`, principal, before, after);
    if (before.departmentId !== after.departmentId) {
      this.audit('system.staff.department.update', `user:${account.id}`, principal, { departmentId: before.departmentId ?? null, department: before.department ?? '未分配部门' }, { departmentId: after.departmentId ?? null, department: after.department ?? '未分配部门' });
    }
    return {
      id: account.id,
      username: account.username,
      ...this.pickMemoryStaffProfile(account),
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
    const before = { username: account.username, role: account.role, enabled: account.enabled !== false, ...this.pickMemoryStaffProfile(account) };
    account.enabled = input.enabled === true;
    this.audit('system.staff.enabled', `user:${account.id}`, principal, before, { username: account.username, role: account.role, enabled: account.enabled !== false, ...this.pickMemoryStaffProfile(account) });
    return {
      id: account.id,
      username: account.username,
      ...this.pickMemoryStaffProfile(account),
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
    if (this.loginLogs.some((log) => log.userId === id)) {
      throw new BadRequestException('该员工账号存在登录记录，不能删除，请使用停用');
    }
    const before = { username: account.username, role: account.role, enabled: account.enabled !== false, ...this.pickMemoryStaffProfile(account) };
    this.accounts.splice(this.accounts.findIndex((item) => item.id === id), 1);
    this.audit('system.staff.delete', `user:${account.id}`, principal, before, { hardDelete: true });
    return {
      id: account.id,
      username: account.username,
      ...this.pickMemoryStaffProfile(account),
      role: account.role as StaffAccountRoleKey,
      roleLabel: this.roleMeta[account.role]?.label ?? getRoleMetadata(account.role).label,
      enabled: account.enabled !== false,
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
      ...this.pickMemoryStaffProfile(account),
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

  async getLineageTrace(principal: Principal, resultType: string, businessId: string) {
    this.ensureAdmin(principal, '只有管理员可以查看数据血缘链路');
    return this.lineage?.traceResult(resultType, businessId) ?? { resultType, businessId, root: null };
  }

  async getShipmentLineageTrace(principal: Principal, shipmentId: string) {
    this.ensureAdmin(principal, '只有管理员可以查看数据血缘链路');
    return this.lineage?.traceShipment(shipmentId) ?? { resultType: 'shipment', businessId: shipmentId, roots: [] };
  }

  async getLineageSourceTrace(principal: Principal, nodeType: string, id: string) {
    this.ensureAdmin(principal, '只有管理员可以查看数据血缘链路');
    return this.lineage?.traceSourceRef(nodeType, id) ?? { nodeType, id, roots: [] };
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
    input: { method: string; path: string; result: 'SUCCESS' | 'FAILED'; durationMs: number; errorMessage?: string; ipAddress?: string; userAgent?: string }
  ) {
    this.audit(
      `${auditModuleFromMemoryPath(input.path)}.request.${auditKindFromMemoryRequest(input.method, input.path)}${input.result === 'FAILED' ? '.failed' : ''}`,
      `${input.method.toUpperCase()} ${input.path}`.trim(),
      principal,
      null,
      {
        status: input.result,
        durationMs: input.durationMs,
        ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent.slice(0, 300) } : {})
      }
    );
  }

  quote(input: PricingQuoteRequest) {
    return calculateQuote(input);
  }

  async lookupPrice(principal: Principal, input: PriceLookupRequest): Promise<PriceLookupResponse> {
    this.ensureStaffPricingAccess(principal);
    const priceRows = this.activePriceBookRows();
    const response = createBackendPriceLookup(principal, input, priceRows, this.priceBooks, this.agentMarkupRules);
    const selectedRecommendation = response.cheapestRecommendations[0] ?? response.recommendations[0];
    const businessId = selectedRecommendation?.price.id ?? `price-lookup:${Date.now()}`;
    void this.lineage?.recordMainFlowResult('pricing', 'price_lookup', 'price_lookup', businessId, {
      query: input,
      selected: selectedRecommendation,
      recommendationCount: response.recommendations.length
    }, response.recommendations.map((item) => ({ nodeType: 'price_book_row', id: item.price.id })), {
      recommendationCount: response.recommendations.length,
      selectedPriceRowId: selectedRecommendation?.price.id
    }, 'pricing.lookup.quote');
    return response;
  }

  async getLegacyPricingMeta(principal: Principal): Promise<LegacyPricingMetaResponse> {
    this.ensureStaffPricingAccess(principal);
    const canViewInternalSource = await this.hasPermission(principal.role, 'pricing:lookup:internal-source-view');
    const rows = this.activePriceBookRows();
    const activeBooks = this.priceBooks.filter((book) => !book.deleted);
    const targetModuleByBookId = new Map(activeBooks.map((book) => [book.id, book.targetModule]));
    const rowsByModule = (module: LegacyPricingModule) => rows.filter((row) => (targetModuleByBookId.get(row.priceBookId) ?? inferInMemoryLegacyModule(row)) === module);
    const booksByModule = (module: LegacyPricingModule) => activeBooks.filter((book) => (book.targetModule ?? primaryLegacyModuleFromCounts(book.legacyModuleCounts)) === module);
    const amazonRows = rowsByModule('amazon');
    return {
      modules: [
        { key: 'amazon', label: '亚马逊查询', rowCount: amazonRows.length, sourceCount: booksByModule('amazon').length },
        { key: 'inquiry', label: '欧洲超大件综合查询', rowCount: rowsByModule('inquiry').length, sourceCount: booksByModule('inquiry').length },
        { key: 'europeExpress', label: '欧洲空海运铁路快递查询', rowCount: rowsByModule('europeExpress').length, sourceCount: booksByModule('europeExpress').length },
        { key: 'southAfrica', label: '南非专线查询', rowCount: rowsByModule('southAfrica').length, sourceCount: booksByModule('southAfrica').length },
        { key: 'usaAirSea', label: '美国空海运查询', rowCount: rowsByModule('usaAirSea').length, sourceCount: booksByModule('usaAirSea').length },
        { key: 'canadaAirSea', label: '加拿大空海查询', rowCount: rowsByModule('canadaAirSea').length, sourceCount: booksByModule('canadaAirSea').length },
        { key: 'dubaiAirSea', label: '迪拜空海运查询', rowCount: rowsByModule('dubaiAirSea').length, sourceCount: booksByModule('dubaiAirSea').length }
      ],
      agents: canViewInternalSource ? uniqueStrings(rows.map((row) => row.agentName)) : [],
      origins: uniqueAmazonOriginWarehouseNames(amazonRows.map((row) => row.sourceSheetName)),
      warehouseCodes: uniqueStrings(rows.map((row) => row.warehouseCode)),
      tiers: uniqueAmazonWeightBandsFromPriceRows(amazonRows)
    };
  }

  async getDubaiPriceTable(principal: Principal): Promise<DubaiPriceTableResponse> {
    this.ensureStaffPricingAccess(principal);
    const rows = this.activePriceBookRowsForMarkupModule('dubaiAirSea');
    const scopedRules = filterAgentMarkupRulesByModule(this.agentMarkupRules, 'dubaiAirSea', rows);
    const markupRules = buildSyncedAgentMarkupRules(
      scopedRules,
      this.activePriceBookAgentSources().filter((source) => source.legacyModule === 'dubaiAirSea')
    ).filter((rule) => rule.enabled && !rule.deletedAt);
    return buildDubaiPriceTableResponse(rows, markupRules);
  }

  async getDubaiPriceDisplay(principal: Principal): Promise<DubaiPriceDisplayResponse> {
    this.ensureStaffPricingAccess(principal);
    const activeDubaiBookIds = new Set(this.priceBooks
      .filter((book) => !book.deleted && book.targetModule === 'dubaiAirSea')
      .map((book) => book.id));
    const isEligibleDisplayVersion = (item: StoredDubaiPriceDisplayVersion) => Boolean(item.priceBookId && activeDubaiBookIds.has(item.priceBookId));
    const airVersion = this.dubaiPriceDisplayVersions.find((item) => isEligibleDisplayVersion(item) && item.isActiveAir && item.status === 'READY' && item.salesSafe);
    const seaVersion = this.dubaiPriceDisplayVersions.find((item) => isEligibleDisplayVersion(item) && item.isActiveSea && item.status === 'READY' && item.salesSafe);
    const pagesFor = (version: StoredDubaiPriceDisplayVersion | undefined, mode: 'AIR' | 'SEA') => (version?.pages ?? [])
      .filter((page): page is typeof page & { mode: 'AIR' | 'SEA' } => page.mode === mode)
      .map((page) => ({ id: page.id, mode: page.mode, sheetName: page.sheetName, pageNo: page.pageNo, url: `/api/uploads/pricing-dubai/${version!.id}/${page.fileName}?v=${encodeURIComponent(version!.updatedAt)}` }));
    return {
      airPages: pagesFor(airVersion, 'AIR'),
      seaPages: pagesFor(seaVersion, 'SEA'),
      airUpdatedAt: airVersion?.updatedAt,
      seaUpdatedAt: seaVersion?.updatedAt,
      updatedAt: [airVersion?.updatedAt, seaVersion?.updatedAt].filter(Boolean).sort().at(-1)
    };
  }

  async getDubaiPriceDisplayVersions(principal: Principal): Promise<DubaiPriceDisplayVersionListResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以管理迪拜价格表展示版本');
    return {
      versions: this.dubaiPriceDisplayVersions.map((version) => ({
        id: version.id,
        priceBookId: version.priceBookId,
        originalName: version.originalName,
        status: version.status,
        isActive: version.isActive,
        isActiveAir: version.isActiveAir,
        isActiveSea: version.isActiveSea,
        salesSafe: version.salesSafe,
        message: version.message,
        unassignedSheets: version.unassignedSheets,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        pages: version.pages.map(({ fileName: _fileName, sizeBytes: _sizeBytes, ...page }) => page)
      }))
    };
  }

  async activateDubaiPriceDisplayVersion(principal: Principal, id: string, input: DubaiPriceDisplayActivateInput) {
    this.ensurePricingManager(principal, '只有管理员或市场可以发布迪拜价格表');
    const version = this.dubaiPriceDisplayVersions.find((item) => item.id === id);
    if (!version) throw new NotFoundException('迪拜价格表展示版本不存在');
    if (version.status !== 'READY' || !version.pages.some((page) => page.mode === 'AIR' || page.mode === 'SEA')) throw new BadRequestException('价格表图片尚未转换完成，不能发布');
    if (!input?.salesSafe) throw new BadRequestException('请确认原表不含成本、毛利或内部价后再发布');
    this.activateDubaiDisplayModes(version, new Set(version.pages.map((page) => page.mode).filter((mode): mode is 'AIR' | 'SEA' => mode === 'AIR' || mode === 'SEA')), 'manual');
    version.salesSafe = true;
    version.updatedAt = new Date().toISOString();
    this.audit('pricing.dubai.display.publish', id, principal, null, { salesSafe: true, pageCount: version.pages.length });
    return this.getDubaiPriceDisplayVersions(principal);
  }

  async retryDubaiPriceDisplayVersion(principal: Principal, id: string) {
    this.ensurePricingManager(principal, '只有管理员或市场可以重新生成迪拜价格表图片');
    const version = this.dubaiPriceDisplayVersions.find((item) => item.id === id);
    if (!version) throw new NotFoundException('迪拜价格表展示版本不存在');
    const job = this.priceBookImportJobs.find((item) => item.book?.id === version.priceBookId && item.sourceBuffer);
    if (!job?.sourceBuffer) throw new BadRequestException('原始价格表文件不可用，无法重新生成图片');
    version.status = 'PROCESSING';
    version.message = '正在重新生成空运、海运工作表图片';
    version.updatedAt = new Date().toISOString();
    try {
      const inspectedSheets = inspectDubaiWorkbookSheets(job.sourceBuffer);
      const supportedSheets = inspectedSheets.filter((sheet): sheet is typeof sheet & { mode: 'AIR' | 'SEA' } => sheet.mode === 'AIR' || sheet.mode === 'SEA');
      if (!supportedSheets.length) throw new BadRequestException('未识别到名称包含空运或海运的工作表');
      version.pages = supportedSheets.map((sheet, index) => ({ id: `dubai-page-${Date.now()}-${index + 1}`, mode: sheet.mode, sheetName: sheet.sheetName, pageNo: 1, fileName: `${sheet.mode.toLowerCase()}-${index + 1}.png`, sizeBytes: 0 }));
      version.status = 'READY';
      version.salesSafe = true;
      version.message = `重新转换完成：${version.pages.length} 页，已自动更新当前展示`;
      version.updatedAt = new Date().toISOString();
      this.activateDubaiDisplayModes(version, new Set(version.pages.map((page) => page.mode).filter((mode): mode is 'AIR' | 'SEA' => mode === 'AIR' || mode === 'SEA')), 'automatic');
      this.audit('pricing.dubai.display.retry', id, principal, null, { priceBookId: version.priceBookId, pageCount: version.pages.length });
    } catch (error) {
      version.status = 'FAILED';
      version.message = error instanceof Error ? error.message : '重新生成图片失败';
      version.updatedAt = new Date().toISOString();
      this.audit('pricing.dubai.display.retry_failed', id, principal, null, { message: version.message });
    }
    return this.getDubaiPriceDisplayVersions(principal);
  }

  private activateDubaiDisplayModes(version: StoredDubaiPriceDisplayVersion, modes: Set<'AIR' | 'SEA'>, source: 'automatic' | 'manual' = 'automatic') {
    const isNewerThanActive = (mode: 'AIR' | 'SEA') => {
      if (source === 'manual') return true;
      const activeVersion = this.dubaiPriceDisplayVersions.find((item) => item.id !== version.id
        && item.status === 'READY'
        && item.salesSafe
        && (mode === 'AIR' ? item.isActiveAir : item.isActiveSea));
      return !activeVersion || Date.parse(version.createdAt) > Date.parse(activeVersion.createdAt);
    };
    const activateAir = modes.has('AIR') && isNewerThanActive('AIR');
    const activateSea = modes.has('SEA') && isNewerThanActive('SEA');
    if (activateAir) this.dubaiPriceDisplayVersions.forEach((item) => { item.isActiveAir = false; });
    if (activateSea) this.dubaiPriceDisplayVersions.forEach((item) => { item.isActiveSea = false; });
    version.isActiveAir = activateAir;
    version.isActiveSea = activateSea;
    version.isActive = version.isActiveAir || version.isActiveSea;
    this.dubaiPriceDisplayVersions.forEach((item) => {
      if (item !== version && !item.isActiveAir && !item.isActiveSea) item.isActive = false;
    });
  }

  async getSouthAfricaRateImages(principal: Principal): Promise<SouthAfricaRateImageListResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看南非图片价格表');
    return { images: this.southAfricaRateImages.map((image) => ({ ...image })) };
  }

  async createSouthAfricaRateImage(principal: Principal, input: Omit<SouthAfricaRateImageSummary, 'id' | 'createdAt' | 'uploadedBy'>): Promise<SouthAfricaRateImageSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以上传南非图片价格表');
    const now = new Date().toISOString();
    const image: SouthAfricaRateImageSummary = {
      ...input,
      id: `sa-img-${Date.now()}-${this.southAfricaRateImages.length + 1}`,
      uploadedBy: principal.username,
      createdAt: now
    };
    this.southAfricaRateImages.unshift(image);
    this.audit('pricing.south_africa.image.upload', image.id, principal, null, image);
    return { ...image };
  }

  async getSouthAfricaRateRules(principal: Principal): Promise<SouthAfricaRateRuleListResponse> {
    this.ensureStaffPricingAccess(principal);
    return { rules: this.southAfricaRateRules.map((rule) => ({ ...rule, keywords: [...rule.keywords] })) };
  }

  async createSouthAfricaRateRule(principal: Principal, input: SouthAfricaRateRuleInput): Promise<SouthAfricaRateRuleSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护南非价格规则');
    const now = new Date().toISOString();
    const rule = normalizeSouthAfricaRateRule(input, {
      id: `sa-rule-${Date.now()}-${this.southAfricaRateRules.length + 1}`,
      createdAt: now,
      updatedAt: now
    });
    this.southAfricaRateRules.unshift(rule);
    this.audit('pricing.south_africa.rule.create', rule.id, principal, null, rule);
    void this.lineage?.recordEvent('pricing.south_africa.rule_change', {
      businessId: rule.id,
      actorUsername: principal.username,
      payload: { action: 'create', rule },
      metrics: { enabled: rule.enabled ? 1 : 0, keywordCount: rule.keywords.length }
    });
    return { ...rule, keywords: [...rule.keywords] };
  }

  async updateSouthAfricaRateRule(principal: Principal, id: string, input: SouthAfricaRateRuleInput): Promise<SouthAfricaRateRuleSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护南非价格规则');
    const index = this.southAfricaRateRules.findIndex((rule) => rule.id === id);
    if (index === -1) throw new NotFoundException('南非价格规则不存在');
    const before = this.southAfricaRateRules[index];
    const updated = normalizeSouthAfricaRateRule(input, {
      id,
      createdAt: before.createdAt,
      updatedAt: new Date().toISOString()
    });
    this.southAfricaRateRules[index] = updated;
    this.audit('pricing.south_africa.rule.update', id, principal, before, updated);
    void this.lineage?.recordEvent('pricing.south_africa.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'update', before, after: updated },
      sourceRefs: [{ nodeType: 'south_africa_rate_rule', id }],
      metrics: { enabled: updated.enabled ? 1 : 0, keywordCount: updated.keywords.length }
    });
    return { ...updated, keywords: [...updated.keywords] };
  }

  async updateSouthAfricaRateRuleEnabled(principal: Principal, id: string, input: { enabled?: boolean }): Promise<SouthAfricaRateRuleSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护南非价格规则');
    const rule = this.southAfricaRateRules.find((item) => item.id === id);
    if (!rule) throw new NotFoundException('南非价格规则不存在');
    const before = { ...rule };
    rule.enabled = input.enabled !== false;
    rule.updatedAt = new Date().toISOString();
    this.audit('pricing.south_africa.rule.enabled', id, principal, before, rule);
    void this.lineage?.recordEvent('pricing.south_africa.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'enabled', before, after: rule },
      sourceRefs: [{ nodeType: 'south_africa_rate_rule', id }],
      metrics: { enabled: rule.enabled ? 1 : 0, keywordCount: rule.keywords.length }
    });
    return { ...rule, keywords: [...rule.keywords] };
  }

  async deleteSouthAfricaRateRule(principal: Principal, id: string): Promise<SouthAfricaRateRuleSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护南非价格规则');
    const index = this.southAfricaRateRules.findIndex((rule) => rule.id === id);
    if (index === -1) throw new NotFoundException('南非价格规则不存在');
    const [rule] = this.southAfricaRateRules.splice(index, 1);
    this.audit('pricing.south_africa.rule.delete', id, principal, rule, { hardDelete: true });
    void this.lineage?.recordEvent('pricing.south_africa.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'delete', before: rule, hardDelete: true },
      sourceRefs: [{ nodeType: 'south_africa_rate_rule', id }],
      metrics: { deleted: 1, keywordCount: rule.keywords.length }
    });
    return { ...rule, keywords: [...rule.keywords] };
  }

  async lookupSouthAfricaPricing(principal: Principal, input: SouthAfricaLookupRequest): Promise<SouthAfricaLookupResponse> {
    this.ensureStaffPricingAccess(principal);
    const response = createSouthAfricaLookupResponse(
      input,
      this.southAfricaRateRules.filter((rule) => rule.enabled),
      this.southAfricaRateImages
    );
    if (!response.result) {
      const pendingReview = {
        id: `sa-review-${Date.now()}-${this.southAfricaPendingReviews.length + 1}`,
        productName: response.query.productName,
        volumeCbm: Number(response.query.volumeCbm),
        actualWeightKg: response.query.actualWeightKg,
        packageInfo: response.query.packageInfo,
        createdAt: new Date().toISOString()
      };
      this.southAfricaPendingReviews.unshift(pendingReview);
      response.pendingReview = pendingReview;
      this.audit('pricing.south_africa.lookup.pending_review', pendingReview.id, principal, null, pendingReview);
    }
    this.audit('pricing.south_africa.lookup', response.result?.id ?? 'south-africa-lookup', principal, null, {
      query: response.query,
      matched: Boolean(response.result),
      ruleId: response.result?.id
    });
    return response;
  }

  async quoteLegacyPricing(principal: Principal, input: LegacyPricingQuoteRequest): Promise<LegacyPricingQuoteResponse> {
    this.ensureStaffPricingAccess(principal);
    const pricingVisibility = await this.getPricingFieldVisibility(principal);
    const chargeableWeightKg = calculateLookupChargeableWeight({
      chargeableWeightKg: input.chargeableWeightKg ?? 0,
      actualWeightKg: input.actualWeightKg,
      volumeCbm: input.volumeCbm,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      packageCount: input.packageCount,
      unitActualWeightKg: input.unitActualWeightKg,
      destinationCountry: input.destinationCountry ?? ''
    });
    let normalizedInput: LegacyPricingQuoteRequest = input.module === 'amazon'
      ? { ...input, tier: normalizeAmazonWeightBand(input.weightBand ?? input.tier), weightBand: normalizeAmazonWeightBand(input.weightBand ?? input.tier) }
      : input;
    if (normalizedInput.module === 'canadaAirSea') {
      const canadaAddressType = normalizeCanadaAddressType(normalizedInput.canadaAddressType);
      const amazonCode = canadaAddressType === 'AMAZON'
        ? normalizeCanadaAmazonWarehousePrefix(normalizedInput.amazonCode)
        : undefined;
      if (canadaAddressType === 'AMAZON' && !amazonCode) {
        throw new BadRequestException('亚马逊仓请填写三位仓库代码，例如 YVR');
      }
      normalizedInput = {
        ...normalizedInput,
        destinationCountry: '加拿大',
        canadaAddressType,
        amazonCode
      };
    }
    if ((normalizedInput.module === 'inquiry' || normalizedInput.module === 'europeExpress') && normalizedInput.channel?.trim() && !normalizeEuropeTransportModeFilter(normalizedInput.channel)) {
      throw new BadRequestException('欧洲查询仅支持空运、海运、铁路、铁海联运或全部渠道筛选');
    }
    const cargoProfile = createLargeCargoProfile(normalizedInput);
    const targetModuleByBookId = new Map(this.priceBooks.filter((book) => !book.deleted).map((book) => [book.id, book.targetModule]));
    const moduleRows = filterPriceRowsByCargoProfile(dedupeInMemoryLegacyRows(
      this.activePriceBookRows().filter((row) => (targetModuleByBookId.get(row.priceBookId) ?? inferInMemoryLegacyModule(row)) === normalizedInput.module)
    )
      .filter((row) => normalizedInput.module !== 'amazon' || priceRowAmazonOriginMatches(row, normalizedInput.origin))
      .filter((row) => normalizedInput.module !== 'inquiry' || inMemoryInquiryTransportMatches(row, normalizedInput.channel))
      .filter((row) => normalizedInput.module !== 'inquiry' || inMemoryInquiryCargoMatches(row, normalizedInput))
      .filter((row) => normalizedInput.module !== 'europeExpress' || inMemoryEuropeTransportMatches(row, normalizedInput.channel))
      .filter((row) => priceRowTaxInclusionMatches(row, normalizedInput.taxInclusion))
      .filter((row) => normalizedInput.module !== 'canadaAirSea' || canadaAddressTypeMatchesWarehouseCode(row.warehouseCode, normalizedInput.canadaAddressType, normalizedInput.amazonCode))
      .filter((row) => !isAirSeaPricingModule(normalizedInput.module) || legacyPriceRowChannelMatches(row, normalizedInput.channel)), normalizedInput.module, cargoProfile);
    const postalScopedRows = normalizedInput.module === 'usaAirSea'
      ? selectInMemoryUsPostalPriceRows(moduleRows, normalizedInput.postalCode)
      : normalizedInput.module === 'inquiry' || normalizedInput.module === 'europeExpress'
        ? moduleRows.filter((row) => matchesEuropeanPostalRule(row.postalRule, normalizedInput.postalCode))
        : moduleRows;
    // The request's dropdown value is a UI hint, not a filter for source KG
    // tiers. Match by actual chargeable weight first, then report the exact
    // tier from the selected source row below.
    const moduleMarkupRules = filterAgentMarkupRulesByModule(this.agentMarkupRules, normalizedInput.module, postalScopedRows);
    if (normalizedInput.module === 'europeExpress' && chargeableWeightKg <= 0) {
      return redactLegacyPricingResponse(createInMemoryEuropeExpressUnitQuote(principal, normalizedInput, moduleRows, this.priceBooks, moduleMarkupRules), pricingVisibility);
    }
    const lookupDestinationCountry = normalizedInput.destinationCountry || defaultLegacyModuleDestination(normalizedInput.module);
    const lookup = createBackendPriceLookup(principal, {
      amazonCode: normalizedInput.amazonCode,
      productName: normalizedInput.productName,
      destinationCountry: lookupDestinationCountry ?? '',
      postalCode: normalizedInput.postalCode,
      address: normalizedInput.address,
      packageInfo: normalizedInput.packageInfo,
      chargeableWeightKg,
      actualWeightKg: normalizedInput.actualWeightKg,
      volumeCbm: normalizedInput.volumeCbm,
      lengthCm: normalizedInput.lengthCm,
      widthCm: normalizedInput.widthCm,
      heightCm: normalizedInput.heightCm,
      packageCount: normalizedInput.packageCount,
      unitActualWeightKg: normalizedInput.unitActualWeightKg,
      weightBand: normalizedInput.module === 'amazon' ? normalizeAmazonWeightBand(normalizedInput.weightBand ?? normalizedInput.tier) : undefined
    }, postalScopedRows, this.priceBooks, moduleMarkupRules);
    const sourceRowById = new Map(postalScopedRows.map((row) => [row.id, row]));
    const recommendations = lookup.recommendations.map((item): LegacyPricingRecommendation => {
      const displayRow = normalizePricingImportRowForModule({
        channelName: item.price.channelName,
        realChannelName: item.price.realChannelName,
        businessRouteName: item.price.businessRouteName,
        sourceSheetName: item.price.sourceSheetName,
        transitLabel: item.transitLabel,
        specialRemark: item.specialRemark,
        productSurchargeRemark: item.productSurchargeRemark
      }, normalizedInput.module);
      return {
      id: item.price.id,
      module: normalizedInput.module,
      ...(canViewPricingInternalRoute(principal.role) ? { sourceId: item.price.priceBookId } : {}),
      agentName: item.agentName,
      origin: item.price.sourceSheetName,
      channelName: canViewPricingInternalRoute(principal.role) ? displayRow.channelName : item.channelName,
      serviceName: item.businessRouteName,
      ...(normalizedInput.module === 'inquiry' ? {
        transportMode: isEuropeTransportMode(item.price.transportMode) ? item.price.transportMode : inferEuropeTransportMode(item.price),
        cargoType: item.price.cargoType ?? inferEuropeOversizeCargoType(item.price)
      } : {}),
      warehouseCode: item.price.warehouseCode,
      destinationCountry: item.price.destinationCountry,
      postalRule: normalizedInput.module === 'usaAirSea' || normalizedInput.module === 'inquiry' || normalizedInput.module === 'europeExpress'
        ? sourceRowById.get(item.price.id)?.postalRule
        : undefined,
      weightSegmentLabel: item.weightSegmentLabel,
      quoteMode: item.price.cbmPrice ? 'cbm' : 'kg',
      ...(canViewPricingInternalRoute(principal.role) ? { costUnitPrice: item.price.costPerKg ?? item.salesRatePerKg } : {}),
      salesUnitPrice: item.salesRatePerKg,
      ...(canViewPricingInternalRoute(principal.role) ? { costTotal: item.totalCost ?? item.totalSales } : {}),
      salesTotal: item.totalSales,
      grossProfit: item.grossProfit,
      chargeableWeightKg: lookup.chargeableWeightKg,
      volumeCbm: item.price.cbmPrice ? normalizedInput.volumeCbm : undefined,
      transitLabel: sanitizePricingTransitLabel(displayRow.transitLabel) ?? '时效待确认',
      markup: item.markup,
      productSurchargeRemark: item.productSurchargeRemark,
      specialRemark: item.specialRemark,
      remark: item.remark,
      ...(item.customRemark ? { customRemark: item.customRemark } : {})
      };
    });
    const selectedAmazonWeightBand = normalizedInput.module === 'amazon'
      ? normalizeAmazonWeightBand(recommendations[0]?.weightSegmentLabel)
      : undefined;
    if (selectedAmazonWeightBand) {
      normalizedInput = { ...normalizedInput, tier: selectedAmazonWeightBand, weightBand: selectedAmazonWeightBand };
    }
    const response: LegacyPricingQuoteResponse = {
      module: normalizedInput.module,
      query: normalizedInput,
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
    const businessId = response.selected?.id ?? `legacy-price-lookup:${Date.now()}`;
    void this.lineage?.recordMainFlowResult('pricing', 'legacy_price_lookup', 'legacy_price_lookup', businessId, {
      query: normalizedInput,
      selected: response.selected,
      recommendationCount: response.recommendations.length
    }, response.recommendations.map((item) => ({ nodeType: 'legacy_or_price_row', id: item.id })), {
      module: normalizedInput.module,
      recommendationCount: response.recommendations.length
    }, 'pricing.lookup.legacy_quote');
    return redactLegacyPricingResponse(response, pricingVisibility);
  }

  private async getPricingFieldVisibility(principal: Principal): Promise<PricingFieldVisibility> {
    const can = (permission: PermissionKey) => this.hasPermission(principal.role, permission);
    const [internalSource, cost, grossProfit, markupBreakdown, postalRule] = await Promise.all([
      can('pricing:lookup:internal-source-view'),
      can('pricing:lookup:cost-view'),
      can('pricing:lookup:gross-profit-view'),
      can('pricing:lookup:markup-breakdown-view'),
      can('pricing:lookup:postal-rule-view')
    ]);
    const canViewInternal = canViewPricingInternalRoute(principal.role);
    return {
      internalSource: canViewInternal && internalSource,
      cost: canViewInternal && cost,
      grossProfit: canViewInternal && grossProfit,
      markupBreakdown: canViewInternal && markupBreakdown,
      postalRule
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
    const rowCount = this.activePriceBookRows().filter((row) => !module || module !== 'amazon' || row.warehouseCode).length;
    this.audit('pricing.legacy.rebuild', module ?? 'all', principal, null, { rowCount });
    return { module: module ?? 'all', rowCount, rebuiltAt: new Date().toISOString() };
  }

  async getLegacyPricingHealth(principal: Principal, module?: LegacyPricingModule) {
    this.ensureAdmin(principal, '只有管理员可以查看亮崽报价体检');
    const rowCount = this.activePriceBookRows().filter((row) => !module || module !== 'amazon' || row.warehouseCode).length;
    return { module: module ?? 'all', rowCount, issues: rowCount ? [] : [{ severity: 'warn', message: '暂无亮崽兼容报价副本' }] };
  }

  async getAgentMarkupRules(principal: Principal, query: AgentMarkupListQuery = {}): Promise<AgentMarkupListResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看代理加价规则');
    const legacyModule = normalizeAgentMarkupModuleQuery(query.legacyModule);
    const priceRows = this.activePriceBookRowsForMarkupModule(legacyModule);
    const sources = this.activePriceBookAgentSources().filter((source) => !legacyModule || (legacyModule === 'unclassified' ? !source.legacyModule : source.legacyModule === legacyModule));
    const rules = filterAgentMarkupRulesByModule(this.agentMarkupRules, legacyModule, priceRows);
    return buildAgentMarkupListResponse(buildSyncedAgentMarkupRules(rules, sources), priceRows, query);
  }

  async previewAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupPreviewResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看规则命中线路');
    const rule = this.agentMarkupRules.find((item) => item.id === id && !item.deletedAt);
    if (!rule) {
      throw new NotFoundException('代理加价规则不存在');
    }
    return buildAgentMarkupPreview(rule, this.activePriceBookRows(), this.auditLogs.filter((log) => log.target === id));
  }

  async previewMarkupRoute(principal: Principal, input: MarkupRoutePreviewInput): Promise<MarkupRoutePreviewResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看线路阶梯加价');
    const route = normalizeMarkupRoutePreviewInput(input);
    const book = this.priceBooks.find((item) => item.id === route.priceBookId && !item.deleted);
    if (!book) throw new NotFoundException('价格表不存在或已删除');
    if (book.agentShortName?.trim() && book.agentShortName.trim() !== route.agentName) throw new BadRequestException('代理与价格表绑定不一致');
    const rows = this.activePriceBookRows().filter((row) => markupRouteRowMatches(row, route));
    if (!rows.length) throw new NotFoundException('当前价格表未找到该真实线路');
    return buildMarkupRoutePreview(route, rows, this.agentMarkupRules.filter((rule) => !rule.deletedAt && rule.enabled));
  }

  async replaceMarkupRouteTiers(principal: Principal, input: MarkupRouteTierReplaceInput): Promise<MarkupRoutePreviewResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护线路阶梯加价');
    const route = normalizeMarkupRoutePreviewInput(input);
    const tiers = normalizeMarkupRouteTiers(input.tiers, route.markupUnit);
    const book = this.priceBooks.find((item) => item.id === route.priceBookId && !item.deleted);
    if (!book) throw new NotFoundException('价格表不存在或已删除');
    if (book.agentShortName?.trim() && book.agentShortName.trim() !== route.agentName) throw new BadRequestException('代理与价格表绑定不一致');
    const rows = this.activePriceBookRows().filter((row) => markupRouteRowMatches(row, route));
    if (!rows.length) throw new NotFoundException('当前价格表未找到该真实线路');
    removeMatching(this.agentMarkupRules, (rule) => !rule.deletedAt && rule.priceBookId === route.priceBookId && rule.agentName === route.agentName
      && rule.channelName === route.channelName && (rule.realChannelName ?? rule.channelName) === route.realChannelName
      && rule.destinationCountry === route.destinationCountry && rule.markupUnit === route.markupUnit);
    const now = new Date().toISOString();
    [...tiers].reverse().forEach((tier) => this.agentMarkupRules.unshift({
      id: `markup-${this.agentMarkupRules.length + 1}`,
      legacyModule: book.targetModule ?? primaryLegacyModuleFromCounts(book.legacyModuleCounts),
      priceBookId: route.priceBookId,
      agentName: route.agentName,
      channelName: route.channelName,
      realChannelName: route.realChannelName === route.channelName ? undefined : route.realChannelName,
      destinationCountry: route.destinationCountry,
      markupPerKg: tier.markupValue,
      markupType: 'WEIGHT',
      markupValue: tier.markupValue,
      markupUnit: route.markupUnit,
      minChargeableValue: tier.minChargeableValue,
      maxChargeableValue: tier.maxChargeableValue,
      priority: 10,
      enabled: true,
      createdAt: now,
      updatedAt: now
    }));
    this.audit('pricing.markup.route_tiers.replace', route.priceBookId, principal, null, { route, tiers });
    return this.previewMarkupRoute(principal, route);
  }

  async migrateLegacyMarkupRouteScopes(principal: Principal): Promise<{ migratedCount: number; archivedCount: number; skippedCount: number }> {
    this.ensurePricingManager(principal, '只有管理员或市场可以迁移线路阶梯加价');
    const legacyTiers = this.agentMarkupRules.filter((rule) => !rule.deletedAt && rule.enabled && rule.markupUnit && !rule.priceBookId);
    let migratedCount = 0;
    let archivedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();
    for (const rule of legacyTiers) {
      const scopes = uniqueMarkupRouteScopes(this.activePriceBookRows().filter((row) => (this.priceBooks.find((book) => book.id === row.priceBookId && !book.deleted)?.agentShortName || row.agentName) === rule.agentName
        && (!rule.legacyModule || this.priceBooks.find((book) => book.id === row.priceBookId)?.targetModule === rule.legacyModule)
        && row.channelName === rule.channelName
        && (!rule.realChannelName || (row.realChannelName?.trim() || row.channelName) === rule.realChannelName)
        && (!rule.destinationCountry || row.destinationCountry === rule.destinationCountry)
        && markupUnitForRow(row) === rule.markupUnit));
      for (const scope of scopes) {
        const duplicate = this.agentMarkupRules.some((item) => !item.deletedAt && item.priceBookId === scope.priceBookId && item.agentName === rule.agentName
          && item.channelName === scope.channelName && (item.realChannelName ?? item.channelName) === scope.realChannelName
          && item.destinationCountry === scope.destinationCountry && item.markupUnit === rule.markupUnit
          && item.minChargeableValue === rule.minChargeableValue && item.maxChargeableValue === rule.maxChargeableValue);
        if (duplicate) {
          skippedCount += 1;
          continue;
        }
        this.agentMarkupRules.unshift({
          ...rule,
          id: `markup-${this.agentMarkupRules.length + 1}`,
          priceBookId: scope.priceBookId,
          realChannelName: scope.realChannelName === scope.channelName ? undefined : scope.realChannelName,
          destinationCountry: scope.destinationCountry,
          createdAt: now,
          updatedAt: now
        });
        migratedCount += 1;
      }
      rule.deletedAt = now;
      archivedCount += 1;
    }
    if (legacyTiers.length) this.audit('pricing.markup.tier_scope_migration', 'agent-markup-rules', principal, null, { migratedCount, archivedCount, skippedCount, legacyRuleIds: legacyTiers.map((rule) => rule.id) });
    return { migratedCount, archivedCount, skippedCount };
  }

  async exportAgentMarkupRules(principal: Principal, query: AgentMarkupListQuery = {}): Promise<AgentMarkupExportResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导出代理加价规则');
    const legacyModule = normalizeAgentMarkupModuleQuery(query.legacyModule);
    const priceRows = this.activePriceBookRowsForMarkupModule(legacyModule);
    const rules = filterAgentMarkupRulesByModule(this.agentMarkupRules, legacyModule, priceRows);
    const response = buildAgentMarkupListResponse(rules, priceRows, { ...query, page: 1, pageSize: AGENT_MARKUP_EXPORT_ROW_LIMIT });
    if (response.pagination.totalItems > AGENT_MARKUP_EXPORT_ROW_LIMIT) {
      throw new BadRequestException(`导出规则超过 ${AGENT_MARKUP_EXPORT_ROW_LIMIT} 条，请先筛选后再导出`);
    }
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

  async batchUpsertAgentMarkupRules(principal: Principal, input: { rows?: AgentMarkupCreateInput[] }): Promise<AgentMarkupImportResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以批量维护代理加价规则');
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const upserted: AgentMarkupSummary[] = [];
    const errorRows: AgentMarkupImportResponse['errorRows'] = [];
    const priceRows = this.activePriceBookRows();

    for (const [index, row] of rows.entries()) {
      try {
        const normalized = normalizeAgentMarkupInput(row);
        if (!normalized.legacyModule && normalized.priceBookId) {
          const book = this.priceBooks.find((item) => item.id === normalized.priceBookId);
          normalized.legacyModule = book?.targetModule ?? primaryLegacyModuleFromCounts(book?.legacyModuleCounts);
        }
        const existingRules = findAgentMarkupRulesByScope(this.agentMarkupRules, normalized);
        const existingRuleIds = new Set(existingRules.map((rule) => rule.id));
        validateAgentMarkupRule(normalized, priceRows, this.agentMarkupRules.filter((rule) => !existingRuleIds.has(rule.id)));
        const markupValue = normalized.markupValue ?? normalized.markupPerKg;
        if (!normalized.agentName || !Number.isFinite(markupValue) || markupValue < 0) {
          throw new BadRequestException('代理名称和加价金额不能为空');
        }
        if (existingRules.length) {
          existingRules.forEach((existing) => Object.assign(existing, {
            priceBookId: normalized.priceBookId,
            legacyModule: normalized.legacyModule,
            agentName: normalized.agentName,
            channelName: normalized.channelName,
            realChannelName: normalized.realChannelName,
            destinationCountry: normalized.destinationCountry,
            markupPerKg: normalized.markupPerKg,
            markupType: normalized.markupType,
            markupValue: normalized.markupValue,
            markupUnit: normalized.markupUnit,
            minChargeableValue: normalized.minChargeableValue,
            maxChargeableValue: normalized.maxChargeableValue,
            priority: normalized.priority,
            enabled: normalized.enabled,
            updatedAt: new Date().toISOString()
          }));
          upserted.push({ ...existingRules[0] });
        } else {
          const rule: AgentMarkupSummary = {
            ...normalized,
            id: `markup-${this.agentMarkupRules.length + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          this.agentMarkupRules.unshift(rule);
          upserted.push({ ...rule });
        }
      } catch (error) {
        errorRows.push({ index: index + 1, reason: error instanceof Error ? error.message : '规则格式错误' });
      }
    }

    this.audit('pricing.markup.batch_upsert', 'agent-markup-rules', principal, null, { successCount: upserted.length, errorRows });
    void this.lineage?.recordEvent('pricing.markup.batch_change', {
      businessId: `agent-markup-batch:${Date.now()}`,
      actorUsername: principal.username,
      payload: { action: 'batch_upsert', inputCount: rows.length, successCount: upserted.length, errorRows },
      sourceRefs: upserted.map((rule) => ({ nodeType: 'agent_markup_rule', id: rule.id })),
      metrics: { inputRows: rows.length, successCount: upserted.length, errorCount: errorRows.length }
    });
    return { successCount: upserted.length, errorRows, rows: upserted };
  }

  async batchUpdateAgentMarkupRules(principal: Principal, input: { ids?: string[]; agentNames?: string[]; scopes?: AgentMarkupBatchScopeInput[]; enabled?: boolean }): Promise<{ successCount: number; rows: AgentMarkupSummary[] }> {
    this.ensurePricingManager(principal, '只有管理员或市场可以批量修改代理加价规则');
    if (typeof input.enabled !== 'boolean') {
      throw new BadRequestException('启停状态不能为空');
    }
    assertAgentMarkupBatchScope(input);
    const rows = this.agentMarkupRules.filter((rule) => matchesAgentMarkupBatchScope(rule, input));
    rows.forEach((rule) => {
      rule.enabled = input.enabled!;
      rule.updatedAt = new Date().toISOString();
    });
    const changedRows = [...rows];
    if (normalizeAgentMarkupBatchScopes(input).length) {
      const now = new Date().toISOString();
      for (const scope of normalizeAgentMarkupBatchScopes(input)) {
        if (rows.some((rule) => agentMarkupScopeKey(rule) === agentMarkupScopeKey(scope)) || this.agentMarkupRules.some((rule) => agentMarkupScopeKey(rule) === agentMarkupScopeKey(scope) && isAgentLevelMarkupRuleScope(rule))) {
          continue;
        }
        const rule: AgentMarkupSummary = { ...createDefaultAgentMarkupRule(scope.agentName, scope.priceBookId, scope.legacyModule), id: `markup-${this.agentMarkupRules.length + 1}`, enabled: input.enabled, createdAt: now, updatedAt: now };
        this.agentMarkupRules.unshift(rule);
        changedRows.push(rule);
      }
    }
    this.audit('pricing.markup.batch_status', 'agent-markup-rules', principal, null, { successCount: changedRows.length, enabled: input.enabled, ids: changedRows.map((rule) => rule.id), agentNames: normalizeStringList(input.agentNames), scopes: normalizeAgentMarkupBatchScopes(input) });
    void this.lineage?.recordEvent('pricing.markup.batch_change', {
      businessId: `agent-markup-batch:${Date.now()}`,
      actorUsername: principal.username,
      payload: { action: 'batch_status', enabled: input.enabled, ids: changedRows.map((rule) => rule.id), agentNames: normalizeStringList(input.agentNames), scopes: normalizeAgentMarkupBatchScopes(input) },
      sourceRefs: changedRows.map((rule) => ({ nodeType: 'agent_markup_rule', id: rule.id })),
      metrics: { successCount: changedRows.length, enabled: input.enabled ? 1 : 0 }
    });
    return { successCount: changedRows.length, rows: changedRows.map((rule) => ({ ...rule })) };
  }

  async batchDeleteAgentMarkupRules(principal: Principal, input: { ids?: string[]; agentNames?: string[]; scopes?: AgentMarkupBatchScopeInput[] }): Promise<{ successCount: number; rows: AgentMarkupSummary[] }> {
    this.ensurePricingManager(principal, '只有管理员或市场可以批量删除代理加价规则');
    assertAgentMarkupBatchScope(input);
    const deletedRows = this.agentMarkupRules.filter((rule) => matchesAgentMarkupBatchScope(rule, input)).map((rule) => ({ ...rule }));
    removeMatching(this.agentMarkupRules, (rule) => matchesAgentMarkupBatchScope(rule, input));
    this.audit('pricing.markup.batch_delete', 'agent-markup-rules', principal, { rows: deletedRows }, { successCount: deletedRows.length, ids: deletedRows.map((rule) => rule.id), hardDelete: true, agentNames: normalizeStringList(input.agentNames), scopes: normalizeAgentMarkupBatchScopes(input) });
    void this.lineage?.recordEvent('pricing.markup.batch_change', {
      businessId: `agent-markup-batch:${Date.now()}`,
      actorUsername: principal.username,
      payload: { action: 'batch_delete', ids: deletedRows.map((rule) => rule.id), hardDelete: true, agentNames: normalizeStringList(input.agentNames), scopes: normalizeAgentMarkupBatchScopes(input) },
      sourceRefs: deletedRows.map((rule) => ({ nodeType: 'agent_markup_rule', id: rule.id })),
      metrics: { successCount: deletedRows.length, deletedCount: deletedRows.length }
    });
    return { successCount: deletedRows.length, rows: deletedRows };
  }

  async createAgentMarkupRule(principal: Principal, input: AgentMarkupCreateInput): Promise<AgentMarkupSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以新增代理加价规则');
    const normalized = normalizeAgentMarkupInput(input);
    if (!normalized.legacyModule && normalized.priceBookId) {
      const book = this.priceBooks.find((item) => item.id === normalized.priceBookId);
      normalized.legacyModule = book?.targetModule ?? primaryLegacyModuleFromCounts(book?.legacyModuleCounts);
    }
    validateAgentMarkupRule(normalized, this.activePriceBookRows(), this.agentMarkupRules);
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
    void this.lineage?.recordEvent('pricing.markup.rule_change', {
      businessId: rule.id,
      actorUsername: principal.username,
      payload: { action: 'create', rule },
      metrics: { enabled: rule.enabled ? 1 : 0, markupValue: Number(rule.markupValue ?? rule.markupPerKg ?? 0) }
    });
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
    if (!normalized.legacyModule && normalized.priceBookId) {
      const book = this.priceBooks.find((item) => item.id === normalized.priceBookId);
      normalized.legacyModule = book?.targetModule ?? primaryLegacyModuleFromCounts(book?.legacyModuleCounts);
    }
    validateAgentMarkupRule(normalized, this.activePriceBookRows(), this.agentMarkupRules, id);
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
    if (input.markupUnit !== undefined || input.minChargeableValue !== undefined || input.maxChargeableValue !== undefined) {
      rule.markupUnit = normalized.markupUnit;
      rule.minChargeableValue = normalized.minChargeableValue;
      rule.maxChargeableValue = normalized.maxChargeableValue;
    }
    if (input.priority !== undefined) {
      rule.priority = normalized.priority;
    }
    if (input.enabled !== undefined) {
      rule.enabled = input.enabled;
    }
    rule.updatedAt = new Date().toISOString();
    this.audit('pricing.markup.update', id, principal, before, rule);
    void this.lineage?.recordEvent('pricing.markup.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'update', before, after: rule },
      sourceRefs: [{ nodeType: 'agent_markup_rule', id }],
      metrics: { enabled: rule.enabled ? 1 : 0, markupValue: Number(rule.markupValue ?? rule.markupPerKg ?? 0) }
    });
    return { ...rule };
  }

  async deleteAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以删除代理加价规则');
    const index = this.agentMarkupRules.findIndex((item) => item.id === id && !item.deletedAt);
    if (index === -1) {
      throw new NotFoundException('代理加价规则不存在');
    }
    const [rule] = this.agentMarkupRules.splice(index, 1);
    const before = { ...rule };
    this.audit('pricing.markup_rule.delete', id, principal, before, { hardDelete: true });
    void this.lineage?.recordEvent('pricing.markup.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'delete', before, hardDelete: true },
      sourceRefs: [{ nodeType: 'agent_markup_rule', id }],
      metrics: { deleted: 1 }
    });
    return before;
  }

  async getAgentChannelCustomRemarks(principal: Principal, legacyModule: LegacyPricingModule): Promise<AgentChannelCustomRemarkSummary[]> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看代理渠道自定义备注');
    return this.agentChannelCustomRemarks
      .filter((remark) => remark.legacyModule === legacyModule)
      .sort((left, right) => left.agentName.localeCompare(right.agentName, 'zh-CN') || left.channelName.localeCompare(right.channelName, 'zh-CN'))
      .map((remark) => ({ ...remark }));
  }

  async upsertAgentChannelCustomRemark(principal: Principal, input: AgentChannelCustomRemarkInput): Promise<AgentChannelCustomRemarkSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护代理渠道自定义备注');
    const normalized = normalizeAgentChannelCustomRemarkInput(input);
    const moduleRows = this.activePriceBookRows().filter((row) => {
      const book = this.priceBooks.find((item) => item.id === row.priceBookId);
      return (book?.targetModule ?? inferInMemoryLegacyModule(row)) === normalized.legacyModule;
    });
    validateAgentChannelCustomRemarkScope(
      normalized,
      moduleRows,
      new Map(this.priceBooks.map((book) => [book.id, book.agentShortName?.trim()]))
    );
    const existing = this.agentChannelCustomRemarks.find((remark) => remark.legacyModule === normalized.legacyModule && remark.agentName === normalized.agentName && remark.channelName === normalized.channelName);
    const before = existing ? { ...existing } : null;
    const now = new Date().toISOString();
    const saved: AgentChannelCustomRemarkSummary = existing
      ? Object.assign(existing, { ...normalized, updatedAt: now })
      : { ...normalized, id: `channel-remark-${this.agentChannelCustomRemarks.length + 1}`, createdAt: now, updatedAt: now };
    if (!existing) this.agentChannelCustomRemarks.unshift(saved);
    this.audit(before ? 'pricing.channel_remark.update' : 'pricing.channel_remark.create', saved.id, principal, before, saved);
    return { ...saved };
  }

  async updateAgentChannelCustomRemarkEnabled(principal: Principal, id: string, enabled: boolean): Promise<AgentChannelCustomRemarkSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护代理渠道自定义备注');
    const remark = this.agentChannelCustomRemarks.find((item) => item.id === id);
    if (!remark) throw new NotFoundException('代理渠道自定义备注不存在');
    const before = { ...remark };
    remark.enabled = enabled;
    remark.updatedAt = new Date().toISOString();
    this.audit('pricing.channel_remark.enabled', id, principal, before, remark);
    return { ...remark };
  }

  async getPriceBooks(principal: Principal, includeRows = false, targetModule?: PriceBookImportTargetModule): Promise<PriceBooksResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表明细');
    void includeRows;
    const activeBooks = this.priceBooks
      .filter((book) => !book.deleted)
      .filter((book) => !targetModule || (book.targetModule ?? primaryLegacyModuleFromCounts(book.legacyModuleCounts)) === targetModule);
    return {
      books: activeBooks.map((book) => this.toPriceBookSummary(book)),
      rows: []
    };
  }

  async downloadPriceBook(principal: Principal, id: string): Promise<{ fileName: string; buffer: Buffer }> {
    this.ensurePricingManager(principal, '只有管理员或市场可以下载价格表');
    const book = this.priceBooks.find((item) => item.id === id && !item.deleted);
    if (!book) throw new NotFoundException('价格表不存在');
    const importJob = this.priceBookImportJobs.find((item) => item.book?.id === id && item.sourceBuffer);
    if (!importJob?.sourceBuffer) throw new BadRequestException('原始价格表文件不可用，无法下载');
    const buffer = Buffer.from(importJob.sourceBuffer);
    this.audit('pricing.price_book.download', id, principal, null, { fileName: book.fileName, sizeBytes: buffer.length });
    return { fileName: book.fileName, buffer };
  }

  async getPriceBookRuleRefreshProgress(principal: Principal): Promise<PricingRuleRefreshProgressResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表规则同步进度');
    const modules = Object.keys(PRICING_PARSER_RULE_VERSIONS) as PriceBookImportTargetModule[];
    return {
      generatedAt: new Date().toISOString(),
      modules: modules.map((module) => {
        const ruleVersion = pricingParserRuleVersion(module);
        const scoped = this.priceBooks.filter((book) => !book.deleted && book.targetModule === module);
        const byStatus = (status: string) => scoped.filter((book) => String(book.refreshStatus ?? 'CURRENT') === status).length;
        const currentBooks = scoped.filter((book) => Number(book.parserRuleVersion ?? 0) >= ruleVersion && String(book.refreshStatus ?? 'CURRENT') === 'CURRENT').length;
        const totalBooks = scoped.length;
        const updatedAt = scoped.map((book) => book.lastRuleRefreshAt).filter(Boolean).sort().at(-1);
        const failedBooks = byStatus('FAILED');
        const unavailableBooks = byStatus('UNAVAILABLE');
        return {
          module,
          ruleVersion,
          totalBooks,
          currentBooks,
          pendingBooks: byStatus('PENDING'),
          runningBooks: byStatus('RUNNING'),
          failedBooks,
          unavailableBooks,
          progressPercent: totalBooks === 0 ? 100 : Math.round((currentBooks / totalBooks) * 100),
          latestRuleApplied: currentBooks === totalBooks && failedBooks === 0 && unavailableBooks === 0,
          ...(updatedAt ? { updatedAt } : {})
        };
      })
    };
  }

  async getPriceBookRows(principal: Principal, priceBookId?: string, query: PriceBookRowsQuery = {}): Promise<PriceBookRowsResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表线路');
    const pricingVisibility = await this.getPricingFieldVisibility(principal);
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 100)));
    const agentName = query.agentName?.trim();
    if (!priceBookId && !agentName) {
      throw new BadRequestException('查看线路必须选择价格表或代理，避免全量扫描价格行');
    }
    const activeBookIds = new Set(this.priceBooks.filter((book) => !book.deleted).map((book) => book.id));
    const activeBookById = new Map(this.priceBooks.filter((book) => !book.deleted).map((book) => [book.id, book]));
    const filtered = this.priceBookRows
      .filter((row) => activeBookIds.has(row.priceBookId))
      .filter((row) => !query.targetModule || (activeBookById.get(row.priceBookId)?.targetModule ?? primaryLegacyModuleFromCounts(activeBookById.get(row.priceBookId)?.legacyModuleCounts)) === query.targetModule)
      .filter((row) => !priceBookId || row.priceBookId === priceBookId)
      .filter((row) => priceBookId ? textMatch(row.agentName, agentName) : textMatch(activeBookById.get(row.priceBookId)?.agentShortName ?? row.agentName, agentName))
      .filter((row) => textMatch(row.channelName, query.channelName))
      .filter((row) => textMatch(row.sourceSheetName ?? '', query.sourceSheetName))
      .filter((row) => textMatch(row.destinationCountry, query.destinationCountry))
      .sort((left, right) =>
        left.agentName.localeCompare(right.agentName, 'zh-CN') ||
        (left.sourceSheetName ?? '').localeCompare(right.sourceSheetName ?? '', 'zh-CN') ||
        left.channelName.localeCompare(right.channelName, 'zh-CN') ||
        left.destinationCountry.localeCompare(right.destinationCountry, 'zh-CN') ||
        left.minWeightKg - right.minWeightKg
      );
    const rowModules = Array.from(new Set(filtered.map((row) => activeBookById.get(row.priceBookId)?.targetModule ?? primaryLegacyModuleFromCounts(activeBookById.get(row.priceBookId)?.legacyModuleCounts)).filter(Boolean))) as LegacyPricingModule[];
    const markupSources = this.activePriceBookAgentSources().filter((source) => !rowModules.length || (rowModules.length === 1 && source.legacyModule === rowModules[0]));
    const filteredBookIds = new Set(filtered.map((row) => row.priceBookId));
    const markupRules = buildSyncedAgentMarkupRules(this.agentMarkupRules.filter((rule) =>
      !rule.priceBookId
        ? (rowModules.length === 1 ? rule.legacyModule === rowModules[0] : true)
        : filteredBookIds.has(rule.priceBookId)
    ), markupSources);
    const enrichedRows = filtered.map((row) => {
      const book = activeBookById.get(row.priceBookId);
      const ownerAgentName = book?.agentShortName || agentName || row.agentName;
      return enrichPriceBookRowMarkup({ ...row, agentName: cleanOldOriginalAgentNameForDisplay(book?.fileName, row.agentName) }, markupRules, ownerAgentName);
    });
    const controlledRows = applyPriceBookRowMarkupControls(enrichedRows, query);
    const pageRows = controlledRows.slice((page - 1) * pageSize, page * pageSize);
    const response = {
      rows: redactPriceBookRows(pageRows, pricingVisibility),
      pagination: { page, pageSize, totalItems: controlledRows.length }
    };
    void this.lineage?.recordEvent('pricing.lookup.routes_view', {
      businessId: priceBookId ?? agentName ?? 'pricing-routes',
      actorUsername: principal.username,
      payload: { priceBookId, query, page, pageSize },
      sourceRefs: pageRows.map((row) => ({ nodeType: 'price_book_row', id: row.id })),
      metrics: { totalItems: controlledRows.length, returnedRows: pageRows.length }
    });
    return response;
  }

  async getPricingSyncHealth(principal: Principal, query: { page?: number; pageSize?: number; legacyModule?: LegacyPricingModule | 'unclassified' } = {}): Promise<PricingSyncHealthResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表同步体检');
    const legacyModule = normalizeAgentMarkupModuleQuery(query.legacyModule);
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 50)));
    const activeBooks = this.priceBooks.filter((book) => !book.deleted);
    const fileByBookId = new Map(activeBooks.map((book) => [book.id, book.fileName]));
    const bookById = new Map(activeBooks.map((book) => [book.id, book]));
    const moduleByBookId = new Map(activeBooks.map((book) => [book.id, book.targetModule ?? primaryLegacyModuleFromCounts(book.legacyModuleCounts)]));
    const issuesByBookId = new Map<string, string[]>();
    activeBooks.forEach((book) => {
      const modules = Object.entries(book.legacyModuleCounts ?? {})
        .filter((entry): entry is [LegacyPricingModule, number] => Number(entry[1] ?? 0) > 0)
        .map(([module]) => module);
      if (book.targetModule) modules.push(book.targetModule);
      const uniqueModules = Array.from(new Set(modules));
      const issues: string[] = [];
      if (!moduleByBookId.get(book.id)) issues.push('价格表模块为空');
      if (uniqueModules.length > 1) issues.push('同一价格表混入多个模块');
      if (moduleByBookId.get(book.id) === 'usaAirSea') {
        issues.push(...getUsPostalRuleHealthIssues(this.priceBookRows.filter((row) => row.priceBookId === book.id)));
      }
      issues.push(...getWarehouseCodeRuleHealthIssues(this.priceBookRows.filter((row) => row.priceBookId === book.id).map((row) => row.warehouseCode)));
      issuesByBookId.set(book.id, issues);
    });
    const agentRuleByScope = new Map(this.agentMarkupRules.filter(isAgentLevelMarkupRuleForHealth).map((rule) => [agentMarkupScopeKey(rule), rule]));
    const grouped = new Map<string, PricingSyncHealthResponse['rows'][number] & { sheets: Set<string>; countries: Set<string> }>();
    this.activePriceBookRows().forEach((row) => {
      const rowModule = moduleByBookId.get(row.priceBookId);
      if (legacyModule === 'unclassified' || (legacyModule && rowModule !== legacyModule)) {
        return;
      }
      const fileName = fileByBookId.get(row.priceBookId) ?? '-';
      const agentName = bookById.get(row.priceBookId)?.agentShortName ?? row.agentName;
      const key = agentMarkupScopeKey({ priceBookId: row.priceBookId, agentName, legacyModule: rowModule });
      const current = grouped.get(key) ?? {
        id: key,
        fileName,
        agentName,
        legacyModule: rowModule,
        lineCount: 0,
        sheetCount: 0,
        countryCount: 0,
        markupRule: agentRuleByScope.get(key) ?? createDefaultAgentMarkupRule(agentName, row.priceBookId, rowModule),
        status: 'default' as const,
        issues: [...(issuesByBookId.get(row.priceBookId) ?? []), ...(rowModule ? [] : ['价格行模块为空'])],
        sheets: new Set<string>(),
        countries: new Set<string>()
      };
      current.lineCount += 1;
      if (row.sourceSheetName?.trim()) current.sheets.add(row.sourceSheetName.trim());
      if (row.destinationCountry?.trim()) current.countries.add(row.destinationCountry.trim());
      grouped.set(key, current);
    });
    const rows = Array.from(grouped.values()).map((row) => {
      const rule = agentRuleByScope.get(row.id);
      return {
        id: row.id,
        fileName: row.fileName,
        agentName: row.agentName,
        lineCount: row.lineCount,
        sheetCount: row.sheets.size,
        countryCount: row.countries.size,
        markupRule: row.markupRule,
        status: !rule ? 'default' as const : !rule.enabled ? 'disabled' as const : rule.id.startsWith('price-agent:') || !rule.updatedAt ? 'default' as const : 'synced' as const,
        issues: Array.from(new Set(row.issues))
      };
    }).sort((left, right) => left.fileName.localeCompare(right.fileName, 'zh-CN') || left.agentName.localeCompare(right.agentName, 'zh-CN'));
    const activeScopes = new Set(rows.map((row) => row.id));
    const activeAgents = new Set(rows.map((row) => row.agentName));
    const orphanRules = filterAgentMarkupRulesByModule(this.agentMarkupRules, legacyModule, this.activePriceBookRowsForMarkupModule(legacyModule))
      .filter((rule) => isAgentLevelMarkupRuleForHealth(rule) && !activeScopes.has(agentMarkupScopeKey(rule))).map((rule) => ({ ...rule }));
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      orphanRules,
      stats: {
        sources: new Set(rows.map((row) => row.fileName)).size,
        agents: activeAgents.size,
        lines: rows.reduce((sum, row) => sum + row.lineCount, 0),
        activeAgents: rows.filter((row) => row.markupRule?.enabled).length,
        issueCount: rows.reduce((sum, row) => sum + (row.issues?.length ?? 0), 0)
      },
      pagination: { page, pageSize, totalItems: rows.length }
    };
  }

  async cleanupOldOriginalAgentData(principal: Principal, input: { dryRun?: boolean } = {}): Promise<PricingOldOriginalAgentCleanupResponse> {
    const dryRun = input.dryRun !== false;
    if (dryRun) {
      this.ensurePricingManager(principal, '只有管理员或市场可以预览旧原始代理清理');
    } else {
      this.ensureAdmin(principal, '只有管理员可以执行旧原始代理清理');
    }
    const bookById = new Map(this.priceBooks.map((book) => [book.id, book]));
    const detailMap = new Map<string, PricingOldOriginalAgentCleanupResponse['details'][number]>();
    for (const row of this.priceBookRows) {
      const book = bookById.get(row.priceBookId);
      const newAgentName = getOldOriginalAgentCleanupTarget(book?.fileName, row.agentName);
      if (!book || !newAgentName) continue;
      const key = ['PRICE_BOOK_ROW', row.agentName, newAgentName, book.fileName, book.id].join('\u0001');
      const detail = detailMap.get(key) ?? {
        sourceType: 'PRICE_BOOK_ROW' as const,
        oldAgentName: row.agentName,
        newAgentName,
        fileName: book.fileName,
        priceBookId: book.id,
        affectedRows: 0
      };
      detail.affectedRows += 1;
      detailMap.set(key, detail);
      if (!dryRun) {
        row.agentName = newAgentName;
      }
    }
    const details = [...detailMap.values()].sort((left, right) => left.fileName.localeCompare(right.fileName, 'zh-CN') || left.oldAgentName.localeCompare(right.oldAgentName, 'zh-CN'));
    const totalPriceBookRows = details.filter((detail) => detail.sourceType === 'PRICE_BOOK_ROW').reduce((sum, detail) => sum + detail.affectedRows, 0);
    const response: PricingOldOriginalAgentCleanupResponse = {
      dryRun,
      affectedRows: totalPriceBookRows,
      totalPriceBookRows,
      totalLegacyRows: 0,
      details,
      executedAt: new Date().toISOString()
    };
    if (!dryRun) {
      this.audit('pricing.price_book.original_agent.cleanup', 'pricing-old-original-agents', principal, null, response);
    }
    return response;
  }

  private resolveEnabledPriceBookAgent(input: { agentId?: string; agentShortName?: string }) {
    const agentId = input.agentId?.trim();
    const agentShortName = input.agentShortName?.trim();
    const agent = this.agents.find((item) =>
      item.enabled &&
      ((agentId && item.id === agentId) || (agentShortName && (item.shortName ?? item.name) === agentShortName))
    );
    if (!agent) {
      throw new BadRequestException('请选择所属代理');
    }
    return { id: agent.id, shortName: agent.shortName ?? agent.name };
  }

  async importPriceBook(principal: Principal, input: PriceBookImportInput, options: { returnRows?: boolean; allowLargeImportJob?: boolean } = {}): Promise<PriceBookImportResult> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导入价格表');
    const targetModule = normalizePriceBookImportTargetModule(input.targetModule);
    const boundAgent = this.resolveEnabledPriceBookAgent(input);
    if (!input.fileName?.trim()) {
      throw new BadRequestException('价格表名称不能为空');
    }
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      throw new BadRequestException('价格表没有可导入的报价行');
    }
    if (!options.allowLargeImportJob && input.rows.length > PRICE_BOOK_JSON_IMPORT_ROW_LIMIT) {
      throw new BadRequestException(`价格表行数超过 ${PRICE_BOOK_JSON_IMPORT_ROW_LIMIT} 行，请使用文件导入任务上传`);
    }
    const replacedBooks = this.priceBooks.filter((item) =>
      !item.deleted &&
      item.fileName === input.fileName.trim() &&
      item.agentId === boundAgent.id &&
      item.targetModule === targetModule
    );

    const book: StoredPriceBook = {
      id: `pb-${Date.now()}-${this.priceBooks.length + 1}`,
      fileName: input.fileName.trim(),
      agentId: boundAgent.id,
      agentShortName: boundAgent.shortName,
      rowCount: input.rows.length,
      importedAt: new Date().toISOString(),
      targetModule,
      parserRuleVersion: pricingParserRuleVersion(targetModule),
      refreshStatus: 'CURRENT',
      lastRuleRefreshAt: new Date().toISOString()
    };
    const rows = input.rows.map((row, index): StoredPriceBookRow => this.normalizePriceBookRow(
      book.id,
      { ...normalizePricingImportRowForModule({ ...row, agentName: boundAgent.shortName }, targetModule), agentName: boundAgent.shortName },
      index
    ));
    const legacyModuleCounts = buildSingleLegacyModuleCounts(targetModule, rows.length);
    this.priceBooks.unshift(book);
    this.priceBookRows.unshift(...rows);
    replacedBooks.forEach((item) => { item.deleted = true; });
    const replacedPriceBookIds = replacedBooks.map((item) => item.id);
    this.audit('pricing.price_book.import', book.id, principal, null, { book, rowCount: rows.length, targetModule, agentId: boundAgent.id, agentShortName: boundAgent.shortName, legacyModuleCounts, replacedPriceBookIds });
    const result = { book: { ...book, legacyModuleCounts }, rowCount: rows.length, legacyModuleCounts, rows: options.returnRows === true ? rows.map((row) => ({ ...row })) : [] };
    void this.lineage?.recordPriceBookImport({
      principalUsername: principal.username,
      fileName: book.fileName,
      priceBookId: book.id,
      rows: rows.map((row) => ({ ...row })),
      result: { book: result.book, rowCount: result.rowCount, legacyModuleCounts, replacedPriceBookIds },
      metrics: buildLineagePriceBookMetrics(rows)
    });
    return result;
  }

  async createPriceBookImportJob(principal: Principal, input: { fileName: string; targetModule?: PriceBookImportTargetModule; agentId?: string; agentShortName?: string; buffer: Buffer; filePath?: string }): Promise<PriceBookImportJobResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导入价格表');
    const targetModule = normalizePriceBookImportTargetModule(input.targetModule);
    const boundAgent = targetModule === 'dubaiAirSea' && !input.agentId?.trim() && !input.agentShortName?.trim()
      ? undefined
      : this.resolveEnabledPriceBookAgent(input);
    if (!input.fileName?.trim()) {
      throw new BadRequestException('价格表名称不能为空');
    }
    const now = new Date().toISOString();
    const job: StoredPriceBookImportJob = {
      id: `pb-job-${Date.now()}-${this.priceBookImportJobs.length + 1}`,
      fileName: input.fileName.trim(),
      agentId: boundAgent?.id,
      agentShortName: boundAgent?.shortName,
      status: 'PENDING',
      processedRows: 0,
      totalRows: 0,
      failedRows: 0,
      message: '等待导入',
      filePath: input.filePath,
      sourceBuffer: input.buffer,
      targetModule,
      createdAt: now,
      updatedAt: now
    };
    this.priceBookImportJobs.unshift(job);
    this.audit('pricing.price_book.import_job.create', job.id, principal, null, { fileName: job.fileName, targetModule, agentId: boundAgent?.id, agentShortName: boundAgent?.shortName });
    void this.lineage?.recordEvent('pricing.price_books.raw_file', {
      businessId: job.id,
      actorUsername: principal.username,
      rawPayload: { fileName: job.fileName, filePath: input.filePath, sizeBytes: input.buffer.length, targetModule, agentId: boundAgent?.id, agentShortName: boundAgent?.shortName },
      metrics: { sizeBytes: input.buffer.length }
    });
    setTimeout(() => {
      void this.processPriceBookImportJob(principal, job.id, input.buffer);
    }, 0);
    const { filePath: _filePath, ...summary } = job;
    return { job: summary };
  }

  async getPriceBookImportJob(principal: Principal, id: string): Promise<PriceBookImportJobResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表导入任务');
    const job = this.priceBookImportJobs.find((item) => item.id === id);
    if (!job) {
      throw new NotFoundException('价格表导入任务不存在');
    }
    const { filePath: _filePath, ...summary } = job;
    return { job: summary };
  }

  private async processPriceBookImportJob(principal: Principal, id: string, buffer: Buffer) {
    const job = this.priceBookImportJobs.find((item) => item.id === id);
    if (!job) return;
    try {
      job.status = 'PARSING';
      job.message = '正在解析价格表';
      job.updatedAt = new Date().toISOString();
      if (job.targetModule === 'dubaiAirSea') {
        const inspectedSheets = inspectDubaiWorkbookSheets(buffer);
        const supportedSheets = inspectedSheets.filter((sheet): sheet is typeof sheet & { mode: 'AIR' | 'SEA' } => sheet.mode === 'AIR' || sheet.mode === 'SEA');
        if (!supportedSheets.length) throw new BadRequestException('未识别到名称包含空运或海运的工作表');
        const now = new Date().toISOString();
        const book: StoredPriceBook = {
          id: `pb-dubai-${Date.now()}-${this.priceBooks.length + 1}`,
          fileName: job.fileName,
          agentId: job.agentId,
          agentShortName: job.agentShortName,
          targetModule: 'dubaiAirSea',
          rowCount: 0,
          importedAt: now,
          parserRuleVersion: pricingParserRuleVersion('dubaiAirSea'),
          refreshStatus: 'CURRENT',
          lastRuleRefreshAt: now
        };
        const version: StoredDubaiPriceDisplayVersion = {
          id: `dubai-display-${Date.now()}-${this.dubaiPriceDisplayVersions.length + 1}`,
          priceBookId: book.id,
          originalName: job.fileName,
          status: 'READY',
          isActive: false,
          isActiveAir: false,
          isActiveSea: false,
          salesSafe: true,
          message: `转换完成：${supportedSheets.length} 个工作表，已自动更新当前展示`,
          unassignedSheets: inspectedSheets.filter((sheet) => sheet.mode === 'UNASSIGNED').map((sheet) => sheet.sheetName),
          createdBy: principal.username,
          createdAt: now,
          updatedAt: now,
          pages: supportedSheets.map((sheet, index) => ({ id: `dubai-page-${Date.now()}-${index + 1}`, mode: sheet.mode, sheetName: sheet.sheetName, pageNo: 1, fileName: `${sheet.mode.toLowerCase()}-${index + 1}.png`, sizeBytes: 0 }))
        };
        this.priceBooks.unshift(book);
        this.dubaiPriceDisplayVersions.unshift(version);
        this.activateDubaiDisplayModes(version, new Set(version.pages.map((page) => page.mode).filter((mode): mode is 'AIR' | 'SEA' => mode === 'AIR' || mode === 'SEA')), 'automatic');
        job.status = 'SUCCESS';
        job.processedRows = version.pages.length;
        job.totalRows = version.pages.length;
        job.failedRows = 0;
        job.message = version.message;
        job.book = { ...book };
        job.completedAt = now;
        job.updatedAt = now;
        this.audit('pricing.dubai.display.convert', version.id, principal, null, { priceBookId: book.id, pageCount: version.pages.length, unassignedSheets: inspectedSheets.filter((sheet) => sheet.mode === 'UNASSIGNED').map((sheet) => sheet.sheetName) });
        this.audit('pricing.dubai.display.auto_activate', version.id, principal, null, { priceBookId: book.id, air: version.isActiveAir, sea: version.isActiveSea });
        return;
      }
      const rows = await parsePriceWorkbookBuffer(buffer, job.fileName, job.targetModule, job.agentShortName);
      const transportHealth = job.targetModule === 'europeExpress' ? summarizeEuropeTransportImportHealth(rows) : undefined;
      const oversizeSheetHealth = job.targetModule === 'inquiry' ? inspectEuropeOversizeWorkbookSheets(buffer, rows) : undefined;
      job.status = 'IMPORTING';
      job.totalRows = rows.length;
      job.message = `正在导入 ${rows.length} 行`;
      job.updatedAt = new Date().toISOString();
      const result = await this.importPriceBook(principal, { fileName: job.fileName, targetModule: job.targetModule, agentId: job.agentId, agentShortName: job.agentShortName, rows }, { returnRows: false, allowLargeImportJob: true });
      job.status = 'SUCCESS';
      job.processedRows = result.rowCount;
      job.totalRows = result.rowCount;
      job.failedRows = 0;
      job.message = `导入完成：${result.rowCount} 行${transportHealth ? `；空运 ${transportHealth.counts.AIR}、海运 ${transportHealth.counts.SEA}、铁路 ${transportHealth.counts.RAIL}、铁海联运 ${transportHealth.counts.SEA_RAIL}、待归类 ${transportHealth.counts.UNCLASSIFIED}` : ''}${oversizeSheetHealth ? `；工作表：${oversizeSheetHealth.sheets.map((sheet) => `${sheet.sheetName} ${sheet.importedRows} 行`).join('、') || '未发现欧洲超大件价格工作表'}` : ''}`;
      job.errorSummary = transportHealth?.errorSummary ?? oversizeSheetHealth?.errorSummary;
      job.book = result.book;
      job.completedAt = new Date().toISOString();
      job.updatedAt = job.completedAt;
      this.audit('pricing.price_book.import_job.complete', id, principal, null, { fileName: job.fileName, priceBookId: result.book.id, rowCount: result.rowCount, targetModule: job.targetModule, agentId: job.agentId, agentShortName: job.agentShortName, legacyModuleCounts: result.legacyModuleCounts, transportHealth, oversizeSheetHealth });
    } catch (error) {
      job.status = 'FAILED';
      job.failedRows = 1;
      job.message = error instanceof Error ? error.message : '价格表导入失败';
      job.completedAt = new Date().toISOString();
      job.updatedAt = job.completedAt;
      this.audit('pricing.price_book.import_job.failed', id, principal, null, { fileName: job.fileName, message: job.message });
    }
  }

  async updatePriceBookRemark(principal: Principal, id: string, input: PriceBookRemarkUpdateInput): Promise<PriceBookSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护价格表备注');
    const book = this.priceBooks.find((item) => item.id === id && !item.deleted);
    if (!book) {
      throw new NotFoundException('价格表不存在');
    }
    const before = { ...book };
    book.remark = input.customRemark?.trim() || input.remark?.trim() || undefined;
    this.audit('pricing.price_book.remark.update', id, principal, before, book);
    void this.lineage?.recordEvent('pricing.price_books.remark_update', {
      businessId: id,
      actorUsername: principal.username,
      payload: { before: { remark: before.remark }, after: { remark: book.remark }, fileName: book.fileName },
      sourceRefs: [{ nodeType: 'price_book', id }],
      metrics: { remarkLength: book.remark?.length ?? 0 }
    });
    return this.toPriceBookSummary(book);
  }

  async deletePriceBook(principal: Principal, id: string): Promise<PriceBookSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以删除价格表');
    const book = this.priceBooks.find((item) => item.id === id && !item.deleted);
    if (!book) {
      throw new NotFoundException('价格表不存在');
    }
    const before = { ...book };
    const hardDeletedBook = { ...book, deleted: true };
    // In-memory legacy sources are standalone compatibility fixtures and have
    // no priceBookId link. A same-named price book must not delete them.
    const legacySourceIds = new Set<string>();
    const priceRowsDeleted = this.priceBookRows.filter((row) => row.priceBookId === book.id).length;
    const legacyRowsDeleted = this.legacyPricingRows.filter((row) => Boolean(row.sourceId && legacySourceIds.has(row.sourceId))).length;
    const legacySourcesDeleted = legacySourceIds.size;
    const dubaiDisplayVersionsDeleted = this.dubaiPriceDisplayVersions.filter((version) => version.priceBookId === book.id).length;
    const markupRulesDeleted = this.agentMarkupRules.filter((rule) => rule.priceBookId === book.id).length;
    removeMatching(this.priceBookRows, (row) => row.priceBookId === book.id);
    removeMatching(this.legacyPricingRows, (row) => Boolean(row.sourceId && legacySourceIds.has(row.sourceId)));
    removeMatching(this.legacyPricingSources, (source) => Boolean(source.id && legacySourceIds.has(source.id)));
    removeMatching(this.dubaiPriceDisplayVersions, (version) => version.priceBookId === book.id);
    removeMatching(this.agentMarkupRules, (rule) => rule.priceBookId === book.id);
    removeMatching(this.priceBooks, (item) => item.id === book.id);
    this.audit('pricing.price_book.delete', id, principal, before, {
      ...hardDeletedBook,
      hardDelete: true,
      priceRowsDeleted,
      legacyRowsDeleted,
      markupRulesDeleted,
      legacySourcesDeleted,
      dubaiDisplayVersionsDeleted
    });
    void this.lineage?.recordEvent('pricing.price_books.delete', {
      businessId: id,
      actorUsername: principal.username,
      payload: { fileName: book.fileName, hardDelete: true, priceRowsDeleted, legacyRowsDeleted, legacySourcesDeleted, dubaiDisplayVersionsDeleted },
      sourceRefs: [{ nodeType: 'price_book', id }],
      metrics: { priceRowsDeleted, legacyRowsDeleted, legacySourcesDeleted, dubaiDisplayVersionsDeleted }
    });
    return this.toPriceBookSummary(hardDeletedBook);
  }

  private activePriceBookRows(): StoredPriceBookRow[] {
    const activeBookIds = new Set(this.priceBooks.filter((book) => !book.deleted).map((book) => book.id));
    return this.priceBookRows.filter((row) => activeBookIds.has(row.priceBookId));
  }

  private activePriceBookRowsForMarkupModule(module?: LegacyPricingModule | 'unclassified'): StoredPriceBookRow[] {
    const activeBooks = this.priceBooks.filter((book) => !book.deleted);
    const bookModuleById = new Map(activeBooks.map((book) => [book.id, book.targetModule ?? primaryLegacyModuleFromCounts(book.legacyModuleCounts)]));
    if (!module) {
      return this.activePriceBookRows();
    }
    if (module === 'unclassified') {
      return [];
    }
    return this.activePriceBookRows().filter((row) => (bookModuleById.get(row.priceBookId) ?? inferInMemoryLegacyModule(row)) === module);
  }

  private activePriceBookAgentSources(): ActivePriceBookAgentSource[] {
    const bookById = new Map(this.priceBooks.filter((book) => !book.deleted).map((book) => [book.id, book]));
    const grouped = new Map<string, ActivePriceBookAgentSource>();
    for (const row of this.activePriceBookRows()) {
      const book = bookById.get(row.priceBookId);
      if (!book) {
        continue;
      }
      const agentName = book.agentShortName ?? row.agentName;
      const legacyModule = book.targetModule ?? primaryLegacyModuleFromCounts(book.legacyModuleCounts);
      const key = agentMarkupScopeKey({ agentName, priceBookId: row.priceBookId, legacyModule });
      const current = grouped.get(key) ?? { agentName, priceBookId: row.priceBookId, fileName: book.fileName, lineCount: 0, legacyModule };
      current.lineCount += 1;
      grouped.set(key, current);
    }
    return [...grouped.values()];
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
    return this.withConfirmedWarehouseTally(this.warehousePackages);
  }

  private withConfirmedWarehouseTally(packages: WarehousePackageSummary[]): WarehousePackageSummary[] {
    const completedTaskByPackageId = new Map<string, WarehouseTallyTaskSummary>();
    const pendingTaskByPackageId = new Map<string, WarehouseTallyTaskSummary>();
    this.warehouseTallyTasks
      .filter((task) => task.status === 'COMPLETED')
      .forEach((task) => {
        [...task.packageIds, task.appliedPackageId].filter(Boolean).forEach((packageId) => {
          completedTaskByPackageId.set(packageId!, task);
        });
      });
    this.warehouseTallyTasks
      .filter((task) => task.status === 'PENDING')
      .forEach((task) => {
        task.packageIds.forEach((packageId) => pendingTaskByPackageId.set(packageId, task));
      });
    return packages.map((pkg) => {
      const pendingTask = pendingTaskByPackageId.get(pkg.id);
      if (pendingTask) {
        return { ...pkg, exceptions: [...pkg.exceptions], tallyTaskId: pendingTask.id, tallyTaskNo: pendingTask.taskNo, tallyCompleted: false, tallyStatus: '理货中' };
      }
      const task = completedTaskByPackageId.get(pkg.id)
        ?? (pkg.tallyTaskId && pkg.tallyTaskNo
          ? this.warehouseTallyTasks.find((item) => item.id === pkg.tallyTaskId && item.taskNo === pkg.tallyTaskNo && item.status === 'COMPLETED')
          : undefined);
      return task
        ? { ...pkg, exceptions: [...pkg.exceptions], tallyTaskId: task.id, tallyTaskNo: task.taskNo, tallyCompleted: true, tallyStatus: '已理货' }
        : { ...pkg, exceptions: [...pkg.exceptions], tallyTaskId: undefined, tallyTaskNo: undefined, tallyCompleted: false, tallyStatus: '待理货' };
    });
  }

  async getWarehouseTodayReceipts(principal: Principal, query: WarehouseTodayQuery): Promise<WarehouseTodayResponse> {
    if (!(await this.hasPermission(principal.role, 'warehouse:today-receipt:view'))) {
      throw new ForbiddenException('当前角色不能查看今日收货');
    }
    const { start, end } = resolveWarehouseTodayRange(query);
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
    const completedTaskByPackageId = new Map<string, WarehouseTallyTaskSummary>();
    this.warehouseTallyTasks
      .filter((task) => task.status === 'COMPLETED')
      .forEach((task) => {
        [...task.packageIds, task.appliedPackageId].filter(Boolean).forEach((packageId) => {
          completedTaskByPackageId.set(packageId!, task);
        });
      });
    const confirmedRows = rows.map((pkg) => {
      const task = completedTaskByPackageId.get(pkg.id);
      return task
        ? { ...pkg, tallyTaskId: task.id, tallyTaskNo: task.taskNo, tallyCompleted: true, tallyStatus: '已理货' }
        : { ...pkg, tallyTaskId: undefined, tallyTaskNo: undefined, tallyCompleted: false, tallyStatus: '待理货' };
    });
    const grouped = new Map<string, WarehousePackageSummary[]>();
    confirmedRows.forEach((row) => {
      grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]);
    });
    const waitingDispatchTickets = this.shipments.filter((shipment) =>
      shipment.status === 'WAITING_DISPATCH' && (!scope || scope.includes(shipment.salesperson ?? ''))
    ).length;
    const visibleRows = scope
      ? confirmedRows.map(({ site: _site, ...row }) => row)
      : confirmedRows;
    const response = {
      totals: {
        receiptTickets: grouped.size,
        totalPackages: confirmedRows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: roundMoney(confirmedRows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0)),
        totalCbm: roundMoney(confirmedRows.reduce((sum, row) => sum + row.cbm, 0)),
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
    if (!(await this.hasPermission(principal.role, 'warehouse:in-stock:view'))) {
      throw new ForbiddenException('当前角色不能查看在仓数据');
    }
    const scope = this.operatorCustomerScope(principal);
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const archivedOnly = query.status === 'TALLIED_ARCHIVED';
    const archivedCutoff = resolveWarehouseTallyRecentCutoff();
    const operationIds = query.operationKeyword?.trim()
      ? new Set(this.auditLogs
        .filter((row) => row.action.startsWith('warehouse.')
          && `${row.action} ${row.target} ${JSON.stringify(row.before ?? '')} ${JSON.stringify(row.after ?? '')}`.toLowerCase().includes(query.operationKeyword!.trim().toLowerCase()))
        .map((row) => row.target))
      : null;
    const rows = this.warehousePackages.filter((pkg) =>
      (archivedOnly
        ? pkg.status === 'TALLIED_ARCHIVED' && Boolean(pkg.archivedAt) && new Date(pkg.archivedAt!) >= archivedCutoff
        : !['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'].includes(pkg.status))
      && (!query.site?.trim() || scope || pkg.site === query.site.trim())
      && keyword(pkg.customerOrderNo, query.customerOrderNo)
      && keyword(pkg.domesticTrackingNo, query.domesticTrackingNo)
      && keyword(pkg.combinedOrderNo, query.combinedOrderNo)
      && (!operationIds || operationIds.has(pkg.id))
      && (!scope || scope.includes(pkg.salesperson ?? ''))
    );
    const confirmedRows = this.withConfirmedWarehouseTally(rows);
    const grouped = new Map<string, WarehousePackageSummary[]>();
    confirmedRows.forEach((row) => {
      grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]);
    });
    const waitingDispatchTickets = this.shipments.filter((shipment) =>
      shipment.status === 'WAITING_DISPATCH' && (!scope || scope.includes(shipment.salesperson ?? ''))
    ).length;
    const visibleRows = scope
      ? confirmedRows.map(({ site: _site, ...row }) => row)
      : confirmedRows;
    const response = {
      totals: {
        receiptTickets: grouped.size,
        totalPackages: confirmedRows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: roundMoney(confirmedRows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0)),
        totalCbm: roundMoney(confirmedRows.reduce((sum, row) => sum + row.cbm, 0)),
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

  async getWarehouseManualReceiptCustomers(principal: Principal) {
    this.ensureWarehouseAccess(principal);
    return this.customers
      .filter((customer) => customer.enabled)
      .map((customer) => ({ code: customer.code, name: customer.name }))
      .sort((left, right) => left.code.localeCompare(right.code, 'zh-CN'));
  }

  async assertWarehouseManualReceiptCustomer(principal: Principal, customerCode?: string) {
    this.ensureWarehouseAccess(principal);
    const normalizedCode = customerCode?.trim() ?? '';
    if (!normalizedCode) {
      throw new BadRequestException('请填写客户编号');
    }
    if (normalizedCode.length > 8) {
      throw new BadRequestException('客户编号最长 8 位');
    }
    const customer = this.customers.find((item) => item.code === normalizedCode);
    if (customer && !customer.enabled) {
      throw new BadRequestException('客户已停用，不能收货');
    }
  }

  async createWarehousePackage(principal: Principal, input: WarehousePackageCreateInput): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const pkg = buildWarehousePackageSummary(`wh-${Date.now()}-${this.warehousePackages.length + 1}`, input);
    Object.assign(pkg, this.resolveWarehousePackageOwner(pkg.customerCode));
    pkg.createdBy = principal.username;
    this.warehousePackages.unshift(pkg);
    this.audit('warehouse.package.create', pkg.id, principal, null, pkg);
    void this.lineage?.recordEvent('warehouse.today.receive', {
      actorUsername: principal.username,
      businessId: pkg.id,
      payload: { package: pkg, input, source: 'manual_scan' },
      metrics: {
        packageCount: pkg.packageCount,
        weightKg: pkg.weightKg,
        volumeCbm: pkg.cbm,
        chargeableWeightKg: pkg.chargeableWeightKg
      }
    });
    return { ...pkg, exceptions: [...pkg.exceptions] };
  }

  async createWarehouseManualReceipt(principal: Principal, input: WarehouseManualReceiptCreateInput): Promise<WarehouseManualReceiptCreateResponse> {
    this.ensureWarehouseAccess(principal);
    const packageInputs = buildWarehouseManualReceiptPackageInputs(input);
    const firstPackageInput = packageInputs[0]!;
    const duplicate = this.warehousePackages.find((pkg) =>
      pkg.combinedOrderNo === firstPackageInput.combinedOrderNo
      && !['TALLIED_ARCHIVED'].includes(pkg.status)
    );
    if (duplicate) {
      throw new BadRequestException(`快递单号 ${duplicate.domesticTrackingNo} 已入仓，请勿重复添加`);
    }
    const owner = this.resolveWarehousePackageOwner(firstPackageInput.customerCode ?? '');
    const created = packageInputs.map((packageInput, index) => {
      const pkg = buildWarehousePackageSummary(`wh-${Date.now()}-${this.warehousePackages.length + index + 1}`, packageInput);
      Object.assign(pkg, owner);
      pkg.createdBy = principal.username;
      pkg.exceptions = [];
      return pkg;
    });
    this.warehousePackages.unshift(...created);
    this.audit('warehouse.package.manual_batch_create', created[0].combinedOrderNo, principal, null, {
      combinedOrderNo: created[0].combinedOrderNo,
      cartonSpecCount: created.length,
      totalPackageCount: created.reduce((sum, pkg) => sum + pkg.packageCount, 0),
      packages: created
    });
    created.forEach((pkg, index) => {
      this.audit('warehouse.package.create', pkg.id, principal, null, pkg);
      void this.lineage?.recordEvent('warehouse.today.receive', {
        actorUsername: principal.username,
        businessId: pkg.id,
        payload: { package: pkg, input: packageInputs[index], source: 'manual_multi_carton_receipt' },
        metrics: {
          packageCount: pkg.packageCount,
          weightKg: pkg.weightKg,
          volumeCbm: pkg.cbm,
          chargeableWeightKg: pkg.chargeableWeightKg
        }
      });
    });
    return {
      packages: created.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] })),
      totalCartonSpecs: created.length,
      totalPackages: created.reduce((sum, pkg) => sum + pkg.packageCount, 0)
    };
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
    void this.lineage?.recordEvent('warehouse.packages.split', {
      actorUsername: principal.username,
      businessId: id,
      payload: {
        sourcePackageId: source.id,
        sourcePackageNo: source.combinedOrderNo,
        splitCount,
        pieces: pieces.length ? pieces : undefined,
        packageIds: created.map((pkg) => pkg.id),
        children: created.map((pkg) => ({
          id: pkg.id,
          combinedOrderNo: pkg.combinedOrderNo,
          packageCount: pkg.packageCount,
          weightKg: pkg.weightKg,
          cbm: pkg.cbm,
          chargeableWeightKg: pkg.chargeableWeightKg
        }))
      },
      sourceRefs: [{ nodeType: 'warehouse_package', id: source.id }],
      metrics: {
        splitCount,
        sourcePackageCount: source.packageCount,
        childPackageCount: created.reduce((sum, pkg) => sum + pkg.packageCount, 0),
        childWeightKg: roundMoney(created.reduce((sum, pkg) => sum + pkg.weightKg * pkg.packageCount, 0)),
        childVolumeCbm: roundMoney(created.reduce((sum, pkg) => sum + pkg.cbm, 0))
      }
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
    void this.lineage?.recordEvent('warehouse.packages.update', {
      actorUsername: principal.username,
      businessId: id,
      payload: { action: 'remark_update', packageId: id, before: { remark: before.remark }, after: { remark: updated.remark } },
      sourceRefs: [{ nodeType: 'warehouse_package', id }],
      metrics: { changedFields: before.remark === updated.remark ? 0 : 1 }
    });
    return { ...updated, exceptions: [...updated.exceptions] };
  }

  async updateWarehousePackage(principal: Principal, id: string, input: WarehousePackageUpdateInput): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const index = this.warehousePackages.findIndex((pkg) => pkg.id === id);
    if (index < 0) {
      throw new NotFoundException('仓库包裹不存在');
    }
    const before = this.warehousePackages[index];
    if (!canUpdateUnenteredWarehousePackage(before.status, before.shipmentId)) {
      if (before.shipmentId) {
        throw new BadRequestException('包裹已绑定正式运单，不能直接修改');
      }
      throw new BadRequestException('已合票、已出库或已归档的包裹不能直接修改');
    }
    const parsedCombined = parseWarehouseCombinedOrderNo(input.combinedOrderNo);
    const customerCode = (input.customerCode?.trim() || input.customerOrderNo?.trim() || parsedCombined.customerOrderNo || before.customerCode).trim();
    const customerOrderNo = (input.customerOrderNo?.trim() || input.customerCode?.trim() || parsedCombined.customerOrderNo || before.customerOrderNo).trim();
    const domesticTrackingNo = (input.domesticTrackingNo?.trim() || parsedCombined.domesticTrackingNo || before.domesticTrackingNo).trim();
    if (!customerCode) {
      throw new BadRequestException('请填写客户编号');
    }
    if (customerCode.length > 8) {
      throw new BadRequestException('客户编号最长 8 位');
    }
    if (!customerOrderNo) {
      throw new BadRequestException('请填写客户编号');
    }
    if (!domesticTrackingNo) {
      throw new BadRequestException('请填写快递单号');
    }
    if (domesticTrackingNo.length > 64) {
      throw new BadRequestException('快递单号最长 64 位');
    }
    const expectedTotalPackageCount = input.expectedTotalPackageCount === undefined
      ? before.expectedTotalPackageCount
      : Math.max(1, Math.floor(Number(input.expectedTotalPackageCount) || 1));
    const packageIndex = input.packageIndex === undefined
      ? before.packageIndex
      : Math.min(expectedTotalPackageCount ?? Math.max(1, Math.floor(Number(input.packageIndex) || 1)), Math.max(1, Math.floor(Number(input.packageIndex) || 1)));
    const identityChanged = customerOrderNo !== before.customerOrderNo
      || domesticTrackingNo !== before.domesticTrackingNo
      || (packageIndex ?? 1) !== (before.packageIndex ?? 1);
    if (identityChanged) {
      const duplicate = this.warehousePackages.find((pkg) =>
        pkg.id !== id
        && pkg.customerOrderNo === customerOrderNo
        && pkg.domesticTrackingNo === domesticTrackingNo
        && (pkg.packageIndex ?? 1) === (packageIndex ?? 1)
      );
      if (duplicate) {
        throw new BadRequestException(`客户编号 ${customerOrderNo} 与快递单号 ${domesticTrackingNo} 的第 ${packageIndex ?? 1} 件已存在`);
      }
    }
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
      customerCode,
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
      labelNo: before.tallyTaskId
        ? before.labelNo
        : createWarehouseInboundLabelNo(customerCode, domesticTrackingNo, packageIndex ?? 1, expectedTotalPackageCount ?? packageCount),
      expectedTotalPackageCount,
      packageIndex,
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
    Object.assign(updated, this.resolveWarehousePackageOwner(customerCode));
    this.warehousePackages[index] = updated;
    this.audit('warehouse.package.update', id, principal, {
      customerCode: before.customerCode,
      customerOrderNo: before.customerOrderNo,
      domesticTrackingNo: before.domesticTrackingNo,
      combinedOrderNo: before.combinedOrderNo,
      labelNo: before.labelNo,
      expectedTotalPackageCount: before.expectedTotalPackageCount,
      packageIndex: before.packageIndex,
      packageCount: before.packageCount,
      weightKg: before.weightKg,
      lengthCm: before.lengthCm,
      widthCm: before.widthCm,
      heightCm: before.heightCm,
      scanTime: before.scanTime,
      remark: before.remark,
      manualException: before.manualException
    }, {
      customerCode: updated.customerCode,
      customerOrderNo: updated.customerOrderNo,
      domesticTrackingNo: updated.domesticTrackingNo,
      combinedOrderNo: updated.combinedOrderNo,
      labelNo: updated.labelNo,
      expectedTotalPackageCount: updated.expectedTotalPackageCount,
      packageIndex: updated.packageIndex,
      packageCount: updated.packageCount,
      weightKg: updated.weightKg,
      lengthCm: updated.lengthCm,
      widthCm: updated.widthCm,
      heightCm: updated.heightCm,
      scanTime: updated.scanTime,
      remark: updated.remark,
      manualException: updated.manualException
    });
    void this.lineage?.recordEvent('warehouse.packages.update', {
      actorUsername: principal.username,
      businessId: id,
      payload: {
        action: 'package_update',
        packageId: id,
        before: {
          customerCode: before.customerCode,
          customerOrderNo: before.customerOrderNo,
          domesticTrackingNo: before.domesticTrackingNo,
          combinedOrderNo: before.combinedOrderNo,
          packageCount: before.packageCount,
          weightKg: before.weightKg,
          lengthCm: before.lengthCm,
          widthCm: before.widthCm,
          heightCm: before.heightCm,
          scanTime: before.scanTime,
          remark: before.remark,
          manualException: before.manualException
        },
        after: {
          customerCode: updated.customerCode,
          customerOrderNo: updated.customerOrderNo,
          domesticTrackingNo: updated.domesticTrackingNo,
          combinedOrderNo: updated.combinedOrderNo,
          packageCount: updated.packageCount,
          weightKg: updated.weightKg,
          lengthCm: updated.lengthCm,
          widthCm: updated.widthCm,
          heightCm: updated.heightCm,
          scanTime: updated.scanTime,
          remark: updated.remark,
          manualException: updated.manualException
        }
      },
      sourceRefs: [{ nodeType: 'warehouse_package', id }],
      metrics: {
        packageCount: updated.packageCount,
        weightKg: updated.weightKg,
        volumeCbm: updated.cbm,
        chargeableWeightKg: updated.chargeableWeightKg,
        identityChanged: identityChanged ? 1 : 0
      }
    });
    const hasMeasurementChange = input.weightKg !== undefined || input.lengthCm !== undefined || input.widthCm !== undefined || input.heightCm !== undefined;
    if (before.measurementStatus === 'PENDING_REMEASURE' && before.labelNo && hasMeasurementChange && weightKg > 0 && lengthCm > 0 && widthCm > 0 && heightCm > 0) {
      const applied = await this.applyWarehouseTallyMeasurementByBarcode(principal, {
        barcode: before.labelNo,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        measuredAt: input.scanTime,
        deviceNo: '人工录入'
      });
      if (applied) return applied.package;
    }
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
    void this.lineage?.recordEvent('warehouse.packages.update', {
      actorUsername: principal.username,
      businessId: id,
      payload: { action: 'exception_update', packageId: id, before: { manualException: before.manualException }, after: { manualException: updated.manualException } },
      sourceRefs: [{ nodeType: 'warehouse_package', id }],
      metrics: { changedFields: before.manualException === updated.manualException ? 0 : 1 }
    });
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
    if (selected.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      throw new BadRequestException('理货后包裹待重新过机，完成测量后才能合票或出货');
    }
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
    if (!(await this.hasAnyPermission(principal.role, ['warehouse:tally-pending:view', 'warehouse:tally-completed:view']))) {
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
      .map((task) => {
        const sourceIds = new Set(task.packageIds);
        const outputs = task.status === 'COMPLETED'
          ? this.warehousePackages
            .filter((pkg) => pkg.tallyTaskId === task.id && !sourceIds.has(pkg.id))
            .sort((left, right) => (left.packageIndex ?? 0) - (right.packageIndex ?? 0))
          : [];
        return {
          ...cloneWarehouseTallyTask(task),
          outputPackages: outputs.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }))
        };
      });
  }

  async getWarehouseTallyTaskHistoryChain(principal: Principal, packageId: string): Promise<WarehouseTallyTaskSummary[]> {
    if (!(await this.hasAnyPermission(principal.role, ['warehouse:tally-completed:view']))) {
      throw new ForbiddenException('当前角色不能查看理货历史');
    }
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new BadRequestException('缺少仓库包裹编号');
    }
    const scope = this.operatorCustomerScope(principal);
    const visitedTaskIds = new Set<string>();
    const chain: WarehouseTallyTaskSummary[] = [];
    let currentPackageId: string | undefined = normalizedPackageId;

    while (currentPackageId && chain.length < 20) {
      const lookupPackageId: string = currentPackageId;
      const currentPackage: WarehousePackageSummary | undefined = this.warehousePackages.find((pkg) => pkg.id === lookupPackageId);
      const task: WarehouseTallyTaskSummary | undefined = this.warehouseTallyTasks
        .filter((item) => item.status === 'COMPLETED' && !visitedTaskIds.has(item.id) && (!scope || scope.includes(item.salesperson ?? '')))
        .filter((item) => item.id === currentPackage?.tallyTaskId
          || item.taskNo === currentPackage?.tallyTaskNo
          || item.appliedPackageId === lookupPackageId
          || item.sourcePackageId === lookupPackageId
          || item.packageIds.includes(lookupPackageId))
        .sort((left, right) => new Date(right.completedAt ?? right.createdAt).getTime() - new Date(left.completedAt ?? left.createdAt).getTime())[0];
      if (!task) break;
      visitedTaskIds.add(task.id);
      chain.push(cloneWarehouseTallyTask(task));
      currentPackageId = task.sourcePackageId;
    }

    return chain.reverse();
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
    if (packages.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      throw new BadRequestException('理货后包裹待重新过机，完成测量后才能再次理货');
    }
    if (new Set(packages.map((pkg) => pkg.customerCode)).size !== 1) {
      throw new BadRequestException('一次理货任务只能选择同一客户的包裹');
    }
    const existingTask = this.warehouseTallyTasks.find((task) => task.status === 'PENDING' && task.packageIds.some((packageId) => packageIds.includes(packageId)));
    if (existingTask) {
      throw new BadRequestException('包裹已有未完成理货任务');
    }
    const retallyPackages = packages.filter((pkg) => pkg.tallyTaskId || pkg.tallyTaskNo || pkg.tallyStatus === '已理货');
    if (retallyPackages.length && (packages.length !== 1 || retallyPackages.length !== 1)) {
      throw new BadRequestException('二次理货一次只能选择一个已完成理货的包裹');
    }
    const first = packages[0];
    const previousTask = first.tallyTaskId
      ? this.warehouseTallyTasks.find((task) => task.id === first.tallyTaskId)
      : this.warehouseTallyTasks.find((task) => task.taskNo === first.tallyTaskNo);
    const task: WarehouseTallyTaskSummary = {
      id: `wht-${this.warehouseTallyTasks.length + 1}`,
      taskNo: previousTask
        ? nextWarehouseRetallyTaskNo(previousTask.taskNo, this.warehouseTallyTasks.map((task) => task.taskNo))
        : this.nextWarehouseTallyTaskNo(first.customerCode),
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
    void this.lineage?.recordEvent('warehouse.tally.create', {
      actorUsername: principal.username,
      businessId: task.id,
      payload: task,
      sourceRefs: packageIds.map((id) => ({ nodeType: 'warehouse_package', id })),
      metrics: {
        packageCount: task.packageCount,
        originalWeightKg: task.originalWeightKg,
        originalVolumetricWeightKg: task.originalVolumetricWeightKg,
        sourcePackageCount: packageIds.length
      }
    });
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
    if (input.results?.length) {
      return this.completeWarehouseTallyTaskWithResults(principal, index, before, input);
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
    this.warehousePackages.forEach((pkg, packageIndex) => {
      if (before.packageIds.includes(pkg.id)) {
        this.warehousePackages[packageIndex] = {
          ...pkg,
          tallyTaskId: pkg.tallyTaskId ?? updated.id,
          tallyTaskNo: pkg.tallyTaskNo ?? updated.taskNo,
          tallyStatus: '已理货'
        };
      }
    });
    this.audit('warehouse.tally.complete', id, principal, before, updated);
    void this.lineage?.recordEvent('warehouse.tally.complete', {
      actorUsername: principal.username,
      businessId: id,
      payload: {
        taskId: id,
        taskNo: updated.taskNo,
        statusFrom: before.status,
        statusTo: updated.status,
        packageIds: before.packageIds,
        completedBy: updated.completedBy,
        completedAt: updated.completedAt
      },
      sourceRefs: [
        { nodeType: 'warehouse_tally_task', id },
        ...before.packageIds.map((packageId) => ({ nodeType: 'warehouse_package', id: packageId }))
      ],
      metrics: {
        packageCount: updated.completedPackageCount ?? updated.packageCount,
        completedWeightKg: updated.completedWeightKg,
        completedVolumetricWeightKg: updated.completedVolumetricWeightKg,
        completedVolumetricWeightKg5000: updated.completedVolumetricWeightKg5000
      }
    });
    return cloneWarehouseTallyTask(updated);
  }

  private completeWarehouseTallyTaskWithResults(
    principal: Principal,
    taskIndex: number,
    task: WarehouseTallyTaskSummary,
    input: WarehouseTallyTaskCompleteInput
  ): WarehouseTallyTaskSummary {
    const sourceById = new Map(task.packageIds.map((packageId) => [packageId, this.warehousePackages.find((pkg) => pkg.id === packageId)]));
    if (Array.from(sourceById.values()).some((pkg) => !pkg || pkg.status !== 'RECEIVED')) {
      throw new BadRequestException('理货任务中的原始包裹不存在或已不可处理');
    }
    const results = input.results ?? [];
    const sourceUsage = new Map<string, WarehouseTallyTaskPackageResultInput[]>();
    results.forEach((result) => {
      const ids = Array.from(new Set(result.sourcePackageIds ?? [])).filter(Boolean);
      if (!ids.length || ids.some((sourceId) => !sourceById.has(sourceId))) {
        throw new BadRequestException('最终包裹只能引用当前理货任务的原始包裹');
      }
      ids.forEach((sourceId) => sourceUsage.set(sourceId, [...(sourceUsage.get(sourceId) ?? []), result]));
    });
    if (task.packageIds.some((sourceId) => !sourceUsage.has(sourceId))) {
      throw new BadRequestException('每个原始包裹都必须有最终处理结果');
    }
    for (const sourceId of task.packageIds) {
      const source = sourceById.get(sourceId)!;
      const sourceResults = sourceUsage.get(sourceId)!;
      if (sourceResults.some((result) => result.sourcePackageIds.length > 1) && sourceResults.length > 1) {
        throw new BadRequestException('参与合并的包裹不能同时保留或拆分');
      }
      if (sourceResults.length > 1) {
        const pieces = sourceResults.reduce((sum, result) => sum + Math.floor(Number(result.packageCount) || 0), 0);
        if (pieces !== source.packageCount) {
          throw new BadRequestException(`拆票件数合计必须等于原包裹件数：${source.combinedOrderNo}`);
        }
      }
    }
    const mergedSources = results.filter((result) => result.sourcePackageIds.length > 1).flatMap((result) => result.sourcePackageIds);
    const recordedOrders = new Set(mergedSources.map((sourceId) => sourceById.get(sourceId)!.systemOrderNo).filter(Boolean));
    if (recordedOrders.size > 1) {
      throw new BadRequestException('不同已录单运单的包裹不能合并');
    }
    const existingNos = this.warehousePackages.map((pkg) => pkg.combinedOrderNo);
    const nextSplitByRoot = new Map<string, number>();
    const totalOutputs = results.length;
    const outputs: WarehousePackageSummary[] = results.map((result, resultIndex) => {
      const sourceIds = Array.from(new Set(result.sourcePackageIds));
      const sources = sourceIds.map((sourceId) => sourceById.get(sourceId)!);
      const first = sources[0];
      const outputCount = Math.max(1, Math.floor(Number(result.packageCount) || 1));
      const lengthCm = 0;
      const widthCm = 0;
      const heightCm = 0;
      const isSplit = (sourceUsage.get(first.id)?.length ?? 0) > 1;
      const isMerged = sourceIds.length > 1;
      const root = first.sourcePackageNo || first.combinedOrderNo;
      let combinedOrderNo = first.combinedOrderNo;
      if (isSplit) {
        const next = nextSplitByRoot.get(root) ?? nextWarehouseSplitSequence(root, existingNos);
        combinedOrderNo = `${root}-${next}`;
        nextSplitByRoot.set(root, next + 1);
        existingNos.push(combinedOrderNo);
      } else if (isMerged) {
        combinedOrderNo = `${first.combinedOrderNo}-LH`;
      }
      const packageIndex = resultIndex + 1;
      return {
        ...first,
        id: `wh-tally-${task.id}-${resultIndex + 1}`,
        combinedOrderNo,
        labelNo: createWarehouseTallyPackageLabelNo(task.taskNo, packageIndex, totalOutputs),
        sourcePackageId: first.id,
        sourcePackageNo: root,
        tallyTaskId: task.id,
        tallyTaskNo: task.taskNo,
        tallyCompleted: true,
        tallyStatus: '已理货',
        splitStatus: isSplit ? '拆票子票' : '原始票',
        consolidationStatus: isMerged ? '已合票' : '未合票',
        expectedTotalPackageCount: totalOutputs,
        packageIndex,
        packageCount: outputCount,
        weightKg: 0,
        lengthCm,
        widthCm,
        heightCm,
        cbm: 0,
        totalCbm: 0,
        volumetricWeightKg: 0,
        volumetricWeightKg5000: 0,
        totalVolumetricWeightKg: 0,
        totalVolumetricWeightKg5000: 0,
        chargeableWeightKg: 0,
        scanTime: undefined,
        scanSource: '理货待重新过机',
        measurementStatus: 'PENDING_REMEASURE',
        status: 'RECEIVED',
        receiptSourceId: first.receiptSourceId ?? first.id,
        createdBy: principal.username,
        createdAt: new Date().toISOString(),
        exceptions: [...first.exceptions]
      };
    });
    const now = new Date().toISOString();
    const updated: WarehouseTallyTaskSummary = {
      ...task,
      status: 'COMPLETED',
      completedPackageCount: outputs.reduce((sum, pkg) => sum + pkg.packageCount, 0),
      completedWeightKg: undefined,
      completedLengthCm: undefined,
      completedWidthCm: undefined,
      completedHeightCm: undefined,
      completedVolumetricWeightKg: undefined,
      completedVolumetricWeightKg5000: undefined,
      completedBy: principal.username,
      completedAt: now,
      remark: input.remark?.trim() || task.remark,
      labelStatus: 'GENERATED',
      labelNo: task.taskNo,
      labelQrContent: undefined,
      labelGeneratedAt: now,
      labelGeneratedBy: principal.username,
      appliedPackageId: undefined,
      appliedPackageNo: undefined,
      labelAppliedAt: undefined,
      labelAppliedBy: undefined
    };
    this.warehousePackages.forEach((pkg, packageIndex) => {
      if (task.packageIds.includes(pkg.id)) {
        this.warehousePackages[packageIndex] = {
          ...pkg,
          status: 'TALLIED_ARCHIVED',
          archivedByPackageId: outputs[0].id,
          archivedByPackageNo: outputs[0].combinedOrderNo,
          archivedReason: '理货完成',
          archivedAt: now,
          tallyTaskId: pkg.tallyTaskId ?? task.id,
          tallyTaskNo: pkg.tallyTaskNo ?? task.taskNo,
          tallyStatus: '已理货'
        };
      }
    });
    this.warehousePackages.unshift(...outputs);
    this.warehouseTallyTasks[taskIndex] = updated;
    this.audit('warehouse.tally.process', task.id, principal, task, { task: updated, results: outputs.map((pkg) => ({ id: pkg.id, combinedOrderNo: pkg.combinedOrderNo, sourcePackageId: pkg.sourcePackageId, packageCount: pkg.packageCount })) });
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
    const labelNo = before.taskNo;
    const labelQrContent = buildWarehouseTallyLabelQrContent(before, labelNo);
    const outputRows = await this.getWarehouseTallyTaskOutputPackages(principal, id);
    outputRows.forEach((output, outputIndex) => {
      const packageIndex = this.warehousePackages.findIndex((pkg) => pkg.id === output.id);
      if (packageIndex >= 0) {
        this.warehousePackages[packageIndex] = {
          ...this.warehousePackages[packageIndex],
          labelNo: createWarehouseTallyPackageLabelNo(before.taskNo, outputIndex + 1, outputRows.length)
        };
      }
    });
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
    void this.lineage?.recordEvent('warehouse.queue.label', {
      actorUsername: principal.username,
      businessId: labelNo,
      payload: {
        action: before.labelNo ? 'tally_label_reprint' : 'tally_label_generate',
        taskId: id,
        taskNo: updated.taskNo,
        labelNo,
        labelGeneratedAt: updated.labelGeneratedAt,
        labelGeneratedBy: updated.labelGeneratedBy
      },
      sourceRefs: [{ nodeType: 'warehouse_tally_task', id }],
      metrics: { labelCount: 1 }
    });
    return cloneWarehouseTallyTask(updated);
  }

  async getWarehouseTallyTaskOutputPackages(principal: Principal, id: string): Promise<WarehousePackageSummary[]> {
    if (!(await this.hasAnyPermission(principal.role, ['warehouse:tally-completed:view']))) {
      throw new ForbiddenException('当前角色不能查看理货结果包裹');
    }
    const task = this.warehouseTallyTasks.find((item) => item.id === id);
    if (!task) throw new NotFoundException('理货任务不存在');
    const sourceIds = new Set(task.packageIds);
    const outputs = this.warehousePackages
      .filter((pkg) => pkg.tallyTaskId === id && !sourceIds.has(pkg.id))
      .sort((left, right) => (left.packageIndex ?? 0) - (right.packageIndex ?? 0));
    const rows = outputs.length ? outputs : this.warehousePackages.filter((pkg) => sourceIds.has(pkg.id));
    return rows.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }));
  }

  async applyWarehouseTallyMeasurementByBarcode(
    principal: Principal,
    input: { barcode: string; weightKg: number; lengthCm: number; widthCm: number; heightCm: number; measuredAt?: string; deviceNo?: string }
  ): Promise<{ package: WarehousePackageSummary; alreadyApplied: boolean } | undefined> {
    const packageIndex = this.warehousePackages.findIndex((pkg) => pkg.labelNo === input.barcode.trim() && pkg.tallyTaskId && pkg.status !== 'TALLIED_ARCHIVED');
    if (packageIndex < 0) return undefined;
    const existing = this.warehousePackages[packageIndex];
    const sameMeasurement = Math.abs(existing.weightKg - input.weightKg) < 0.000001
      && Math.abs(existing.lengthCm - input.lengthCm) < 0.000001
      && Math.abs(existing.widthCm - input.widthCm) < 0.000001
      && Math.abs(existing.heightCm - input.heightCm) < 0.000001;
    if (existing.measurementStatus === 'MEASURED') {
      if (sameMeasurement) return { package: { ...existing, exceptions: [...existing.exceptions] }, alreadyApplied: true };
      throw new BadRequestException('理货标签已完成过机且本次数据不同，请转人工确认');
    }
    const measuredAt = input.measuredAt ?? new Date().toISOString();
    const manualMeasurement = input.deviceNo === '人工录入';
    const cbm = roundMoney((input.lengthCm * input.widthCm * input.heightCm * existing.packageCount) / 1000000);
    const volumetricWeightKg = roundMoney((input.lengthCm * input.widthCm * input.heightCm * existing.packageCount) / 6000);
    const updated: WarehousePackageSummary = {
      ...existing,
      weightKg: input.weightKg,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      cbm,
      totalCbm: cbm,
      volumetricWeightKg,
      totalVolumetricWeightKg: volumetricWeightKg,
      volumetricWeightKg5000: roundMoney((input.lengthCm * input.widthCm * input.heightCm * existing.packageCount) / 5000),
      chargeableWeightKg: roundMoney(Math.max(input.weightKg, volumetricWeightKg)),
      scanTime: measuredAt,
      scanSource: manualMeasurement ? '人工录入-理货复测' : '墨家设备-理货复测',
      measurementStatus: 'MEASURED',
      measurementMatchedAt: measuredAt,
      measurementMatchedBy: manualMeasurement ? principal.username : input.deviceNo ? `墨家设备:${input.deviceNo}` : principal.username
    };
    this.warehousePackages[packageIndex] = updated;
    const taskIndex = this.warehouseTallyTasks.findIndex((task) => task.id === existing.tallyTaskId);
    if (taskIndex >= 0) {
      const task = this.warehouseTallyTasks[taskIndex];
      const sourceIds = new Set(task.packageIds);
      const outputs = this.warehousePackages.filter((pkg) => pkg.tallyTaskId === task.id && !sourceIds.has(pkg.id));
      if (outputs.length && outputs.every((pkg) => pkg.measurementStatus === 'MEASURED')) {
        const first = outputs[0];
        this.warehouseTallyTasks[taskIndex] = {
          ...task,
          completedWeightKg: roundMoney(outputs.reduce((sum, pkg) => sum + pkg.weightKg, 0)),
          completedLengthCm: first.lengthCm,
          completedWidthCm: first.widthCm,
          completedHeightCm: first.heightCm,
          completedVolumetricWeightKg: roundMoney(outputs.reduce((sum, pkg) => sum + pkg.volumetricWeightKg, 0)),
          completedVolumetricWeightKg5000: roundMoney(outputs.reduce((sum, pkg) => sum + (pkg.volumetricWeightKg5000 ?? 0), 0)),
          appliedPackageId: first.id,
          appliedPackageNo: first.combinedOrderNo,
          labelAppliedAt: measuredAt,
          labelAppliedBy: principal.username
        };
      }
    }
    this.audit('warehouse.tally.measurement.apply', existing.id, principal, existing, updated);
    return { package: { ...updated, exceptions: [...updated.exceptions] }, alreadyApplied: false };
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
    const matchedPackage = this.warehousePackages.find((pkg) =>
      pkg.labelNo === labelNo && pkg.tallyTaskId && pkg.status !== 'TALLIED_ARCHIVED'
    );
    if (!matchedPackage) {
      throw new NotFoundException('理货标签不存在');
    }
    const taskIndex = this.warehouseTallyTasks.findIndex((task) => task.id === matchedPackage.tallyTaskId);
    if (taskIndex < 0) {
      throw new NotFoundException('理货标签不存在');
    }
    const beforeTask = this.warehouseTallyTasks[taskIndex];
    if (beforeTask.status !== 'COMPLETED' || beforeTask.labelStatus !== 'GENERATED') {
      throw new BadRequestException('请先完成理货并生成标签');
    }
    if (matchedPackage.measurementStatus === 'PENDING_REMEASURE') {
      throw new BadRequestException('该理货标签待重新过机，请通过设备回传或人工录入测量数据');
    }
    return {
      task: cloneWarehouseTallyTask(beforeTask),
      package: { ...matchedPackage, exceptions: [...matchedPackage.exceptions] },
      alreadyApplied: true
    };
  }

  private markWarehouseTallyTaskLabelOutput(principal: Principal, id: string, action: 'print' | 'download'): WarehouseTallyTaskSummary {
    this.ensureWarehouseAccess(principal);
    const index = this.warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) {
      throw new NotFoundException('理货任务不存在');
    }
    const before = this.warehouseTallyTasks[index];
    if (!before.labelNo || before.labelStatus !== 'GENERATED') {
      throw new BadRequestException('请先生成理货标签');
    }
    const now = new Date().toISOString();
    const updated: WarehouseTallyTaskSummary = action === 'print'
      ? { ...before, labelPrintedAt: now, labelPrintedBy: principal.username }
      : { ...before, labelDownloadedAt: now, labelDownloadedBy: principal.username };
    this.warehouseTallyTasks[index] = updated;
    this.audit(`warehouse.tally.label.${action}`, before.labelNo, principal, before, updated);
    void this.lineage?.recordEvent('warehouse.queue.label', {
      actorUsername: principal.username,
      businessId: before.labelNo,
      payload: {
        action: `tally_label_${action}`,
        taskId: id,
        taskNo: updated.taskNo,
        labelNo: before.labelNo,
        labelPrintedAt: updated.labelPrintedAt,
        labelDownloadedAt: updated.labelDownloadedAt
      },
      sourceRefs: [{ nodeType: 'warehouse_tally_task', id }],
      metrics: { labelCount: 1 }
    });
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
      void this.lineage?.recordEvent('finance.receivables.audit', {
        actorUsername: principal.username,
        businessId: systemFee.id,
        payload: {
          action: 'audit',
          financeItemId: systemFee.id,
          shipmentId: systemFee.shipmentId,
          feeName: systemFee.name,
          amount: systemFee.amount,
          currency: systemFee.currency ?? 'RMB',
          statusFrom: before.reconciliationStatus ?? 'PENDING',
          statusTo: 'CONFIRMED',
          reviewedBy: principal.username,
          reviewedAt
        },
        sourceRefs: [{ nodeType: 'shipment', id: systemFee.shipmentId }],
        metrics: { amount: systemFee.amount, statusTo: 'CONFIRMED' }
      });
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
    void this.lineage?.recordEvent('finance.receivables.audit', {
      actorUsername: principal.username,
      businessId: item.id,
      payload: {
        action: 'audit',
        financeItemId: item.id,
        shipmentId: item.shipmentId,
        feeName: item.name,
        amount: item.amount,
        currency: item.currency,
        statusFrom: before.reconciliationStatus,
        statusTo: 'CONFIRMED',
        reviewedBy: principal.username,
        reviewedAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: item.shipmentId }],
      metrics: { amount: item.amount, statusTo: 'CONFIRMED' }
    });
    return this.toManualReceivableAuditSummary(item, shipment);
  }

  async reverseAuditReceivableAudit(principal: Principal, id: string): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const systemFee = this.receivableFees.find((fee) => fee.id === id);
    if (systemFee) {
      if ((systemFee.reconciliationStatus ?? 'PENDING') !== 'CONFIRMED') {
        throw new BadRequestException('只有已审核应收可以反审核');
      }
      if ((systemFee.receivedAmount ?? 0) > 0 || (systemFee.receiptStatus && systemFee.receiptStatus !== 'UNPAID') || this.waterReceipts.some((receipt) => receipt.matches.some((match) => match.receivableFinanceItemId === id && !match.voided))) {
        throw new BadRequestException('该应收已匹配水单，请先在水单匹配撤销匹配后再反审核');
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
      throw new BadRequestException('该应收已匹配水单，请先在水单匹配撤销匹配后再反审核');
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
    const receipt = this.waterReceipts.find((row) => row.id === input.ledgerId || row.receiptNo === input.ledgerId || row.accountLedgerId === input.ledgerId);
    if (!receipt) throw new BadRequestException('水单不存在');
    const systemFee = this.receivableFees.find((fee) => fee.id === id);
    const manualItem = systemFee ? undefined : this.findReceivableFinanceItemById(id);
    const amount = Number(input.amount ?? systemFee?.amount ?? manualItem?.amount);
    await this.matchWaterReceiptOrders(principal, receipt.id, { matches: [{ receivableFinanceItemId: id, amount }] });
    if (systemFee) return this.decorateReceivableRows([this.toReceivableAuditSummary(systemFee)])[0];
    const shipment = this.shipments.find((row) => row.id === manualItem?.shipmentId);
    if (!shipment || !manualItem) throw new NotFoundException('运单不存在');
    return this.decorateReceivableRows([this.toManualReceivableAuditSummary(manualItem, shipment)])[0];
  }

  async getWaterReceipts(principal: Principal, query: WaterReceiptListQuery = {}): Promise<WaterReceiptListResponse> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
    const canViewAll = await this.hasPermission(principal.role, 'finance:water-receipt:view-all');
    const canViewVoucher = await this.hasPermission(principal.role, 'finance:water-receipt:voucher');
    const salesScope = this.operatorCustomerScope(principal);
    const rows = this.waterReceipts.filter((row) => {
      if (!(canViewAll || principal.role === 'ADMIN' || ['FINANCE', 'UG_FINANCE'].includes(principal.role)) && (!salesScope || !row.salesperson || !salesScope.includes(row.salesperson))) return false;
      if (query.status && query.status !== 'ALL') {
        return query.status === 'ARRIVED'
          ? ['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status)
          : row.status === query.status;
      }
      return query.includeArchived || !['ARCHIVED', 'VOIDED'].includes(row.status);
    }).map((row) => this.redactWaterReceiptVoucher(row, canViewVoucher || Boolean(salesScope)));
    return this.buildWaterReceiptListResponse(rows, query);
  }

  async createWaterReceipt(principal: Principal, input: WaterReceiptCreateInput): Promise<WaterReceiptSummary> {
    const customer = this.findCustomerForWaterReceipt(input.customerId, input.customerCode);
    const canManage = await this.hasPermission(principal.role, 'finance:water-receipt:manage');
    if (!canManage) {
      await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
      const scope = this.operatorCustomerScope(principal);
      if (!scope || !customer?.salesperson || !scope.includes(customer.salesperson)) throw new ForbiddenException('只能为本人客户新增水单');
    }
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('水单金额必须大于 0');
    const paymentNo = this.requireUniqueWaterReceiptPaymentNo(input.paymentNo);
    const now = new Date().toISOString();
    const receiptDateValue = input.receiptDate ? new Date(input.receiptDate) : new Date();
    if (Number.isNaN(receiptDateValue.getTime())) throw new BadRequestException('到账日期无效');
    const receiptDate = receiptDateValue.toISOString();
    const row: StoredWaterReceipt = {
      id: `wr-${this.waterReceipts.length + 1}`,
      receiptNo: this.nextMemoryWaterReceiptNo(),
      site: input.site?.trim() || '思远收款',
      customerId: customer?.id,
      customerCode: customer?.code ?? input.customerCode,
      customerName: customer ? `${customer.code}-${customer.name}` : undefined,
      salesperson: customer?.salesperson,
      receiptMethod: input.receiptMethod.trim(),
      receiptDate,
      currency: input.currency ?? 'RMB',
      amount,
      matchedAmount: 0,
      balance: amount,
      paymentNo,
      status: 'PENDING',
      remark: input.remark,
      matches: [],
      createdAt: now,
      updatedAt: now
    };
    this.waterReceipts.unshift(row);
    this.audit('finance.water_receipt.create', row.id, principal, null, row);
    void this.lineage?.recordEvent('finance.water_receipts.create', {
      actorUsername: principal.username,
      businessId: row.id,
      payload: {
        receiptId: row.id,
        receiptNo: row.receiptNo,
        customerId: row.customerId,
        customerCode: row.customerCode,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        receiptDate: row.receiptDate
      },
      sourceRefs: row.customerId ? [{ nodeType: 'customer', id: row.customerId }] : [],
      metrics: { amount: row.amount, matchedAmount: row.matchedAmount, balance: row.balance }
    });
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
    row.paymentNo = this.requireUniqueWaterReceiptPaymentNo(input.paymentNo, row.id);
    if (input.remark !== undefined) row.remark = input.remark;
    row.updatedAt = new Date().toISOString();
    this.audit('finance.water_receipt.update', row.id, principal, before, row);
    this.autoMatchUnmatchedReceivables(principal);
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
      receiptNo: row.receiptNo,
      paymentNo: row.paymentNo,
      customerCode: row.customerCode,
      currency: row.currency,
      statusBefore: before.status,
      statusAfter: row.status,
      operatedBy: principal.username,
      operatedAt: row.arrivedAt,
      arrivedAmount: row.amount,
      accountBalanceBefore,
      accountBalanceAfter,
      customerAccountBalance: accountBalanceAfter
    });
    this.audit('notification.wecom.water_receipt_arrived.pending', row.id, principal, null, { customerCode: row.customerCode, amount: row.amount, balance: row.balance });
    void this.lineage?.recordEvent('finance.water_receipt_arrivals.arrive', {
      actorUsername: principal.username,
      businessId: row.id,
      payload: {
        receiptId: row.id,
        receiptNo: row.receiptNo,
        accountLedgerId: row.accountLedgerId,
        customerId: row.customerId,
        customerCode: row.customerCode,
        amount: row.amount,
        currency: row.currency,
        statusFrom: before.status,
        statusTo: row.status,
        arrivedBy: principal.username,
        arrivedAt: row.arrivedAt
      },
      sourceRefs: [
        { nodeType: 'water_receipt', id: row.id },
        ...(row.customerId ? [{ nodeType: 'customer', id: row.customerId }] : []),
        ...(row.accountLedgerId ? [{ nodeType: 'account_ledger', id: row.accountLedgerId }] : [])
      ],
      metrics: { arrivedAmount: row.amount, accountBalanceBefore, accountBalanceAfter, receiptBalance: row.balance }
    });
    this.autoMatchUnmatchedReceivables(principal);
    return row;
  }

  async getWaterReceiptMatchableReceivables(principal: Principal, id: string): Promise<ReceivableAuditSummary[]> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
    const receipt = this.findWaterReceiptById(id);
    if (!receipt.customerId) return [];
    const rows = this.shipmentFinanceItems
      .filter((item) => item.type === 'RECEIVABLE' && !item.voided && (item.receiptStatus ?? 'UNPAID') !== 'RECEIVED')
      .map((item) => ({ item, shipment: this.shipments.find((shipment) => shipment.id === item.shipmentId) }))
      .filter((row): row is { item: StoredShipmentFinanceItem; shipment: Shipment & { customerId: string } } => {
        const shipment = row.shipment;
        if (!shipment) return false;
        return shipment.customerId === receipt.customerId;
      })
      .filter((row) => (row.item.receivedAmount ?? 0) < row.item.amount)
      .map((row) => this.toManualReceivableAuditSummary(row.item, row.shipment));
    const systemRows = this.receivableFees
      .filter((fee) => !fee.voided && fee.reconciliationStatus === 'CONFIRMED' && (fee.receiptStatus ?? 'UNPAID') !== 'RECEIVED')
      .filter((fee) => fee.customerId === receipt.customerId && (fee.currency ?? 'RMB') === (receipt.currency ?? 'RMB'))
      .filter((fee) => (fee.receivedAmount ?? 0) < fee.amount)
      .map((fee) => this.toReceivableAuditSummary(fee));
    return this.decorateReceivableRows([...systemRows, ...rows]);
  }

  async matchWaterReceiptOrders(principal: Principal, id: string, input: WaterReceiptMatchOrdersInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:match');
    const receipt = this.findWaterReceiptById(id);
    if (!['ARRIVED', 'PARTIAL_MATCHED'].includes(receipt.status)) throw new BadRequestException('水单未到账，不能匹配订单');
    const total = roundMoney((input.matches ?? []).reduce((sum, item) => sum + Number(item.amount), 0));
    if (total <= 0 || total > receipt.balance) throw new BadRequestException('匹配金额不能超过水单余额');
    const before = { ...receipt, matches: [...receipt.matches] };
    const matchedAt = new Date().toISOString();
    const account = this.customerAccounts.find((row) => row.customerId === receipt.customerId && row.currency === receipt.currency);
    const accountBalanceBefore = account?.balance ?? 0;
    for (const match of input.matches) {
      const systemFee = this.receivableFees.find((fee) => fee.id === match.receivableFinanceItemId);
      const item = systemFee ? undefined : this.findReceivableFinanceItemById(match.receivableFinanceItemId);
      const shipment = this.shipments.find((row) => row.id === (systemFee?.shipmentId ?? item?.shipmentId));
      if (!shipment || (systemFee?.customerId ?? shipment.customerId) !== receipt.customerId) throw new BadRequestException('只能匹配同客户编号下的应收');
      const receivable = systemFee ?? item;
      if (!receivable) throw new BadRequestException('应收费用不存在');
      if (receivable.voided) throw new BadRequestException('不能匹配已作废的应收');
      if ((receivable.currency ?? 'RMB') !== (receipt.currency ?? 'RMB')) throw new BadRequestException('水单币种与应收币种不一致');
      const amount = Number(match.amount);
      const unpaid = roundMoney(receivable.amount - (receivable.receivedAmount ?? 0));
      if (amount <= 0 || amount > unpaid) throw new BadRequestException('匹配金额不能超过订单未收金额');
      receivable.receivedAmount = roundMoney((receivable.receivedAmount ?? 0) + amount);
      receivable.receiptStatus = receivable.receivedAmount >= receivable.amount ? 'RECEIVED' : 'PARTIAL';
      receivable.receivedAt = receivable.receiptStatus === 'RECEIVED' ? new Date().toISOString() : receivable.receivedAt;
      receivable.paymentNo = receipt.receiptNo;
      receipt.matches.push({ id: `wrm-${receipt.matches.length + 1}`, waterReceiptId: receipt.id, receivableFinanceItemId: receivable.id, shipmentId: receivable.shipmentId, systemOrderNo: shipment.systemOrderNo, customerCode: receipt.customerCode ?? '', feeName: receivable.name, amount, source: 'MANUAL', createdAt: matchedAt });
      if (item) {
        item.receiptMatchSource = 'MANUAL';
        item.receiptMatchHint = undefined;
      }
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
      receiptNo: receipt.receiptNo,
      paymentNo: receipt.paymentNo,
      customerCode: receipt.customerCode,
      matchedOrderNos: receipt.matches.slice(-input.matches.length).map((match) => match.systemOrderNo),
      matchedAmountDelta: total,
      receiptBalanceBefore: before.balance,
      receiptBalanceAfter: receipt.balance,
      accountBalanceBefore,
      accountBalanceAfter,
      customerAccountBalance: accountBalanceAfter
    });
    if (receipt.status === 'ARCHIVED') {
      this.audit('finance.water_receipt.archive', receipt.id, principal, before, {
        ...receipt,
        archiveReason: '余额为 0 且关联应收已完成财务审核',
        archivedBy: principal.username
      });
    }
    const newMatches = receipt.matches.slice(-input.matches.length);
    for (const match of newMatches) {
      void this.lineage?.recordEvent('finance.water_receipts.match', {
        actorUsername: principal.username,
        businessId: match.shipmentId,
        payload: {
          matchId: match.id,
          receiptId: receipt.id,
          receiptNo: receipt.receiptNo,
          receivableFinanceItemId: match.receivableFinanceItemId,
          shipmentId: match.shipmentId,
          systemOrderNo: match.systemOrderNo,
          amount: match.amount,
          currency: receipt.currency,
          matchedAt,
          receiptStatus: receipt.status,
          receiptBalanceBefore: before.balance,
          receiptBalanceAfter: receipt.balance
        },
        sourceRefs: [
          { nodeType: 'water_receipt', id: receipt.id },
          { nodeType: 'shipment', id: match.shipmentId },
          { nodeType: 'receivable_finance_item', id: match.receivableFinanceItemId }
        ],
        metrics: {
          matchedAmountDelta: match.amount,
          receiptBalanceBefore: before.balance,
          receiptBalanceAfter: receipt.balance,
          accountBalanceBefore,
          accountBalanceAfter
        }
      });
    }
    this.autoMatchUnmatchedReceivables(principal);
    return receipt;
  }

  private autoMatchUnmatchedReceivables(principal: Principal) {
    const receipts = this.waterReceipts.filter((receipt) => receipt.customerId && receipt.balance > 0 && ['ARRIVED', 'PARTIAL_MATCHED'].includes(receipt.status));
    const items = this.shipmentFinanceItems.filter((item) => item.type === 'RECEIVABLE' && !item.voided && (item.receivedAmount ?? 0) <= 0 && (item.receiptStatus ?? 'UNPAID') === 'UNPAID');
    const candidates = items.map((item) => {
      const shipment = this.shipments.find((row) => row.id === item.shipmentId);
      const rows = shipment
        ? receipts.filter((receipt) => receipt.customerId === shipment.customerId && (receipt.currency ?? 'RMB') === (item.currency ?? 'RMB') && receipt.balance >= item.amount)
        : [];
      return { item, shipment, rows };
    });
    const receiptCandidateCounts = new Map<string, number>();
    candidates.forEach(({ rows }) => rows.forEach((receipt) => receiptCandidateCounts.set(receipt.id, (receiptCandidateCounts.get(receipt.id) ?? 0) + 1)));
    for (const { item, shipment, rows } of candidates) {
      if (!shipment) continue;
      const sameCustomerCurrency = receipts.filter((receipt) => receipt.customerId === shipment.customerId && (receipt.currency ?? 'RMB') === (item.currency ?? 'RMB'));
      if (!rows.length) {
        item.receiptMatchHint = sameCustomerCurrency.length ? '水单余额不足' : undefined;
        continue;
      }
      if (rows.length > 1 || receiptCandidateCounts.get(rows[0].id)! > 1) {
        item.receiptMatchHint = '存在多个候选水单，请手动选择';
        continue;
      }
      const receipt = rows[0];
      const amount = roundMoney(item.amount);
      const account = this.customerAccounts.find((row) => row.customerId === receipt.customerId && row.currency === receipt.currency);
      item.receivedAmount = amount;
      item.receiptStatus = 'RECEIVED';
      item.receivedAt = new Date().toISOString();
      item.paymentNo = receipt.receiptNo;
      item.receiptMatchSource = 'AUTO';
      item.receiptMatchHint = undefined;
      receipt.matches.push({
        id: `wrm-${receipt.matches.length + 1}`,
        waterReceiptId: receipt.id,
        receivableFinanceItemId: item.id,
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerCode: receipt.customerCode ?? '',
        feeName: item.name,
        amount,
        source: 'AUTO',
        createdAt: item.receivedAt
      });
      receipt.matchedAmount = roundMoney(receipt.matchedAmount + amount);
      receipt.balance = roundMoney(receipt.amount - receipt.matchedAmount);
      receipt.status = receipt.balance <= 0 ? 'ARCHIVED' : 'PARTIAL_MATCHED';
      if (receipt.status === 'ARCHIVED') receipt.archivedAt = item.receivedAt;
      if (account) account.balance = roundMoney(account.balance - amount);
      if (receipt.accountLedgerId) {
        const ledger = this.accountLedger.find((row) => row.id === receipt.accountLedgerId);
        if (ledger) ledger.balance = receipt.balance;
      }
      this.audit('finance.water_receipt.auto_match', receipt.id, principal, null, {
        receiptNo: receipt.receiptNo,
        receivableFinanceItemId: item.id,
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        amount,
        source: 'AUTO',
        message: '上传或更新水单后自动匹配到订单'
      });
    }
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
      const systemFee = item ? undefined : this.receivableFees.find((row) => row.id === match.receivableFinanceItemId);
      const receivable = item ?? systemFee;
      if (receivable) {
        receivable.receivedAmount = Math.max(0, roundMoney((receivable.receivedAmount ?? 0) - match.amount));
        receivable.receiptStatus = receivable.receivedAmount <= 0 ? 'UNPAID' : 'PARTIAL';
        if (receivable.receivedAmount <= 0) {
          receivable.paymentNo = undefined;
          receivable.receivedAt = undefined;
          if (item) {
            item.receiptMatchSource = undefined;
            item.receiptMatchHint = undefined;
          }
        }
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
    this.autoMatchUnmatchedReceivables(principal);
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
    const row = this.findWaterReceiptById(id);
    await this.ensureWaterReceiptVoucherAccess(principal, row);
    const before = row.voucher ? { ...row.voucher } : undefined;
    const voucher: WaterReceiptVoucherSummary = { id: before?.id ?? `wrv-${this.waterReceipts.length + 1}`, waterReceiptId: row.id, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, url: input.url, uploadedBy: principal.username, createdAt: new Date().toISOString() };
    row.voucher = voucher;
    this.audit('finance.water_receipt.voucher', row.id, principal, before ? this.toWaterReceiptVoucherAuditSnapshot(row, before) : null, this.toWaterReceiptVoucherAuditSnapshot(row, voucher, before));
    return voucher;
  }

  async deleteWaterReceiptVoucher(principal: Principal, id: string): Promise<{ deleted: true }> {
    const row = this.findWaterReceiptById(id);
    await this.ensureWaterReceiptVoucherAccess(principal, row);
    if (!row.voucher) throw new NotFoundException('水单凭证不存在');
    const before = { ...row.voucher };
    row.voucher = undefined;
    this.audit('finance.water_receipt.voucher.delete', row.id, principal, this.toWaterReceiptVoucherAuditSnapshot(row, before), null);
    return { deleted: true };
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
    void this.lineage?.recordEvent('finance.business_costs.audit', {
      actorUsername: principal.username,
      businessId: item.id,
      payload: {
        action: 'audit',
        financeItemId: item.id,
        shipmentId: item.shipmentId,
        feeName: item.name,
        amount: item.amount,
        currency: item.currency,
        statusFrom: before.reconciliationStatus,
        statusTo: 'CONFIRMED',
        reviewedBy: principal.username,
        reviewedAt: now
      },
      sourceRefs: [{ nodeType: 'shipment', id: item.shipmentId }],
      metrics: { amount: item.amount, statusTo: 'CONFIRMED' }
    });
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

    if (await can('finance:dashboard:view')) {
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

    if (await can('finance:paid-payment:read')) {
      const response = await this.getPaidPayments(principal, { status: 'WAITING_PAYMENT', currency: 'ALL', page: 1, pageSize: -1 });
      kpis.push({ key: 'waiting-paid-confirm', title: '待支付', count: response.rows.length, amount: response.rows.reduce((total, row) => total + Number(row.totalAmount ?? 0), 0), currency: 'RMB', sectionKey: 'paid-verification' });
      if (response.rows.length) todos.push({ key: 'todo-paid-confirm', title: '确认支付', count: response.rows.length, sectionKey: 'paid-verification' });
      addQuick('paid-verification', '已付款', '确认支付和补充凭证');
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
    void this.lineage?.recordEvent('finance.payables.audit', {
      actorUsername: principal.username,
      businessId: item.id,
      payload: {
        action: 'audit',
        financeItemId: item.id,
        shipmentId: item.shipmentId,
        pendingPaymentId: application.id,
        feeName: item.name,
        amount: item.amount,
        currency: item.currency,
        statusFrom: before.reconciliationStatus,
        statusTo: 'CONFIRMED',
        reviewedBy: principal.username,
        reviewedAt: now
      },
      sourceRefs: [
        { nodeType: 'shipment', id: item.shipmentId },
        { nodeType: 'pending_payment', id: application.id }
      ],
      metrics: { amount: item.amount, statusTo: 'CONFIRMED' }
    });
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
      if (paymentApplication.status === 'PAID') throw new BadRequestException('该应付已支付，请先在已付款模块反核销');
      if (paymentApplication.status === 'WAITING_PAYMENT') throw new BadRequestException('该应付已进入付款申请，请先撤回付款申请');
    }
    const pendingPaymentIds = this.payablePaymentApplications
      .filter((row) => row.payableFinanceItemId === id)
      .map((row) => row.id);
    const billVoucher = this.paymentVouchers.find((row) =>
      row.voucherType !== 'PAYMENT_RECEIPT'
      && (row.payableFinanceItemId === id || pendingPaymentIds.includes(row.pendingPaymentId ?? ''))
    );
    if (billVoucher) {
      throw new BadRequestException('该应付已生成付款凭证，请先处理凭证后再反审核');
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
    const pendingPaymentIds = this.payablePaymentApplications
      .filter((row) => row.payableFinanceItemId === id)
      .map((row) => row.id);
    const isReferenced = pendingPaymentIds.length > 0
      || this.paymentApplicationItems.some((row) => row.payableFinanceItemId === id)
      || this.paymentVouchers.some((row) => row.payableFinanceItemId === id || pendingPaymentIds.includes(row.pendingPaymentId ?? ''));
    if (isReferenced) {
      throw new BadRequestException('该应付已被付款申请、付款记录或凭证引用，不能删除');
    }
    const index = this.shipmentFinanceItems.findIndex((row) => row.id === id);
    this.shipmentFinanceItems.splice(index, 1);
    this.audit('finance.payable.delete', id, principal, before, { hardDelete: true });
    return this.toPayableAuditSummary(before, shipment, { canViewSensitivePayable, canViewProfit });
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
    this.audit('finance.payable.batch_delete', input.ids.join(','), principal, null, result);
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
    this.audit('finance.payment.bank.save', row.id, principal, null, { ...row, bankAccountNo: this.maskBankAccountNo(row.bankAccountNo, false) });
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
    this.audit('finance.payment.bank.use_once', row.id, principal, null, { ...row, bankAccountNo: this.maskBankAccountNo(row.bankAccountNo, false) });
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
      if (!bank) throw new BadRequestException('请先补齐收款银行信息');
      this.assertPayeeBankMatchesPending(bank, [summary]);
      const payeeName = summary.agentName?.trim() || bank.agentName || '未指定代理';
      const key = `${payeeName}|${bank.bankAccountNo}|${summary.currency}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    if (groups.size > 1) {
      throw new BadRequestException('当前选择跨收款方、银行账号或币种，请分组提交');
    }
    for (const groupRows of groups.values()) {
      const hasApplicationVoucher = Boolean(input.voucher?.fileName?.trim());
      const missingVoucher = groupRows.find((row) => !this.paymentVouchers.some((voucher) => voucher.pendingPaymentId === row.id && voucher.voucherType !== 'PAYMENT_RECEIPT'));
      if (!hasApplicationVoucher && missingVoucher) {
        throw new BadRequestException('请上传供应商账单截图');
      }
    }
    if (input.bankAccountId && selectedBank) {
      this.audit('finance.payment.bank.select', selectedBank.id, principal, null, {
        bankAccountId: selectedBank.id,
        agentName: selectedBank.agentName,
        accountName: selectedBank.accountName,
        bankName: selectedBank.bankName,
        bankAccountNo: this.maskBankAccountNo(selectedBank.bankAccountNo, false),
        currency: selectedBank.currency,
        pendingPaymentIds: ids
      });
    }
    const created: PaymentApplicationSummary[] = [];
    for (const groupRows of groups.values()) {
      const first = this.toPendingPaymentSummary(groupRows[0]);
      const bank = selectedBank ?? (groupRows[0].payeeBankAccountId ? this.payeeBankAccounts.find((item) => item.id === groupRows[0].payeeBankAccountId) : undefined);
      const payeeName = first.agentName?.trim() || bank?.agentName || '未指定代理';
      const now = new Date().toISOString();
      const app: StoredPaymentApplication = {
        id: `payment-app-${this.paymentApplications.length + 1}`,
        applicationNo: this.nextMemoryPaymentApplicationNo(),
        agentName: payeeName,
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
        const pendingSummary = this.toPendingPaymentSummary(row);
        this.paymentApplicationItems.push({
          id: `payment-app-item-${this.paymentApplicationItems.length + 1}`,
          paymentApplicationId: app.id,
          pendingPaymentId: row.id,
          payableFinanceItemId: row.payableFinanceItemId,
          shipmentId: row.shipmentId,
          outboundOrderNo: pendingSummary.systemOrderNo,
          systemOrderNo: pendingSummary.systemOrderNo,
          customerCode: pendingSummary.customerCode,
          feeName: pendingSummary.feeName,
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
      void this.lineage?.recordEvent('finance.payment_applications.create', {
        actorUsername: principal.username,
        businessId: app.id,
        payload: {
          paymentApplicationId: app.id,
          applicationNo: app.applicationNo,
          agentName: app.agentName,
          currency: app.currency,
          totalAmount: app.totalAmount,
          status: app.status,
          appliedBy: principal.username,
          appliedAt: app.appliedAt,
          itemCount: summary.items.length,
          items: summary.items.map((item) => ({
            pendingPaymentId: item.pendingPaymentId,
            payableFinanceItemId: item.payableFinanceItemId,
            shipmentId: item.shipmentId,
            amount: item.amount,
            currency: item.currency
          }))
        },
        sourceRefs: [
          ...summary.items.map((item) => ({ nodeType: 'pending_payment', id: item.pendingPaymentId })),
          ...summary.items.map((item) => ({ nodeType: 'payable_finance_item', id: item.payableFinanceItemId })),
          ...summary.items.map((item) => ({ nodeType: 'shipment', id: item.shipmentId }))
        ],
        metrics: { totalAmount: app.totalAmount, itemCount: summary.items.length, currency: app.currency }
      });
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
    if (input.pendingPaymentId) {
      const pending = this.payablePaymentApplications.find((row) => row.id === input.pendingPaymentId);
      if (pending?.payeeBankAccountId && pending.status === 'PENDING') {
        pending.status = 'READY';
      }
    }
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
    await this.ensurePayablePermission(principal, 'finance:paid-payment:read');
    const canViewBank = await this.hasPermission(principal.role, 'finance:paid-payment:bank-view');
    const rows = this.paymentApplications
      .filter((app) => (query.status && query.status !== 'ALL' ? app.status === query.status : app.status === 'WAITING_PAYMENT' || app.status === 'PAID'))
      .map((app) => this.toPaidPaymentSummary(app, canViewBank));
    return this.buildPaidPaymentListResponse(rows, query);
  }

  async confirmPaymentApplicationPaid(principal: Principal, id: string, input: PaymentConfirmPaidInput): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:confirm');
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
    void this.lineage?.recordEvent('finance.paid_verification.confirm', {
      actorUsername: principal.username,
      businessId: app.id,
      payload: {
        paymentApplicationId: app.id,
        applicationNo: app.applicationNo,
        totalAmount: summary.totalAmount,
        currency: summary.currency,
        statusFrom: before.status,
        statusTo: app.status,
        paidBy: principal.username,
        paidAt: app.paidAt,
        itemCount: summary.items.length,
        items: summary.items.map((item) => ({
          pendingPaymentId: item.pendingPaymentId,
          payableFinanceItemId: item.payableFinanceItemId,
          shipmentId: item.shipmentId,
          amount: item.amount,
          currency: item.currency
        })),
        waterReceiptVoucherId: waterReceiptVoucher?.id
      },
      sourceRefs: [
        { nodeType: 'payment_application', id: app.id },
        ...summary.items.map((item) => ({ nodeType: 'pending_payment', id: item.pendingPaymentId })),
        ...summary.items.map((item) => ({ nodeType: 'payable_finance_item', id: item.payableFinanceItemId })),
        ...summary.items.map((item) => ({ nodeType: 'shipment', id: item.shipmentId })),
        ...(waterReceiptVoucher ? [{ nodeType: 'payment_voucher', id: waterReceiptVoucher.id }] : [])
      ],
      metrics: { totalAmount: summary.totalAmount, itemCount: summary.items.length, currency: summary.currency }
    });
    return this.toPaidPaymentSummary(app, await this.hasPermission(principal.role, 'finance:paid-payment:bank-view'));
  }

  async updatePaidPayment(principal: Principal, id: string, input: PaidPaymentUpdateInput): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:confirm');
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
    return this.toPaidPaymentSummary(app, await this.hasPermission(principal.role, 'finance:paid-payment:bank-view'));
  }

  async reversePaidPayment(principal: Principal, id: string, input: PaidPaymentReverseInput = {}): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:reverse');
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
    return this.toPaidPaymentSummary(app, await this.hasPermission(principal.role, 'finance:paid-payment:bank-view'));
  }

  async exportPaidPayments(principal: Principal, input: PaidPaymentExportRequest): Promise<PaidPaymentExportResponse> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:export');
    const response = await this.getPaidPayments(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    this.audit('finance.paid_payment.export', input.ids?.join(',') ?? 'filtered', principal, null, { count: rows.length });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async addPaymentWaterReceipt(principal: Principal, input: PaymentWaterReceiptInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:voucher-upload');
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

  async getAgentBankAccounts(principal: Principal, query: { agentName?: string; agentId?: string; includeDisabled?: boolean | string } = {}): Promise<AgentBankAccountSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    const includeDisabled = query.includeDisabled === true || query.includeDisabled === 'true';
    return this.agentBankAccounts.filter((row) => (includeDisabled || row.enabled)
      && (!query.agentId || row.agentId === query.agentId)
      && (!query.agentName || row.agentName.toLowerCase().includes(query.agentName.toLowerCase())));
  }

  private assertPayeeBankMatchesPending(bank: StoredPayeeBankAccount | undefined, rows: PendingPaymentSummary[]) {
    if (!bank) return;
    for (const row of rows) {
      if (bank.currency !== row.currency) throw new BadRequestException('收款银行币种必须与待付款币种一致');
      if (!row.agentName) {
        continue;
      }
      if (!this.samePayeeAgent(bank.agentName, row.agentName)) throw new BadRequestException('收款银行代理必须与待付款代理一致');
    }
  }

  private samePayeeAgent(left: string, right: string) {
    const normalize = (value: string) => value
      .trim()
      .toLowerCase()
      .replace(/(有限公司|有限责任公司|国际货运|货运代理|供应链|物流|代理|公司)/g, '');
    const a = normalize(left);
    const b = normalize(right);
    if (!a || !b) return false;
    return a === b || (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a)));
  }

  async upsertAgentBankAccount(principal: Principal, input: AgentBankAccountInput): Promise<AgentBankAccountSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    if (!input.agentName?.trim() || !input.accountName?.trim() || !input.bankName?.trim() || !input.bankAccountNo?.trim()) {
      throw new BadRequestException('代理、户名、银行和账号不能为空');
    }
    const now = new Date().toISOString();
    const previous = input.id ? this.agentBankAccounts.find((item) => item.id === input.id) : undefined;
    const before = previous ? { ...previous } : null;
    const row: StoredAgentBankAccount = previous ?? {
      id: `bank-${this.agentBankAccounts.length + 1}`,
      agentId: input.agentId,
      agentName: input.agentName.trim(),
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      bankAccountNo: input.bankAccountNo.trim(),
      currency: input.currency ?? 'RMB',
      remark: input.remark,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now
    };
    if (previous) {
      previous.agentId = input.agentId;
      previous.agentName = input.agentName.trim();
      previous.accountName = input.accountName.trim();
      previous.bankName = input.bankName.trim();
      previous.bankAccountNo = input.bankAccountNo.trim();
      previous.currency = input.currency ?? 'RMB';
      previous.remark = input.remark;
      previous.enabled = input.enabled ?? true;
      previous.updatedAt = now;
    } else {
      this.agentBankAccounts.push(row);
    }
    const payee = this.payeeBankAccounts.find((item) =>
      (row.agentId && item.agentId === row.agentId && item.bankAccountNo === row.bankAccountNo)
      || (this.samePayeeAgent(item.agentName, row.agentName) && item.bankAccountNo === row.bankAccountNo)
    );
    if (payee) {
      payee.agentId = row.agentId;
      payee.agentName = row.agentName;
      payee.accountName = row.accountName;
      payee.bankName = row.bankName;
      payee.bankAccountNo = row.bankAccountNo;
      payee.currency = row.currency === 'USD' ? 'USD' : 'RMB';
      payee.remark = row.remark;
      payee.enabled = row.enabled;
      payee.updatedAt = now;
    } else {
      this.payeeBankAccounts.push({
        id: `payee-bank-${this.payeeBankAccounts.length + 1}`,
        agentId: row.agentId,
        agentName: row.agentName,
        accountName: row.accountName,
        bankName: row.bankName,
        bankAccountNo: row.bankAccountNo,
        currency: row.currency === 'USD' ? 'USD' : 'RMB',
        remark: row.remark,
        enabled: row.enabled,
        createdAt: now,
        updatedAt: now
      });
    }
    this.audit('finance.payable.bank.save', row.id, principal, before ? { ...before, bankAccountNo: this.maskBankAccountNo(before.bankAccountNo, false) } : null, { ...row, bankAccountNo: this.maskBankAccountNo(row.bankAccountNo, false) });
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

    const canViewInternalPayables = await this.hasAnyPermission(principal.role, ['finance:order-fee:payable:view', 'finance:payable:view-sensitive', 'business:shipment:payable-view']);
    const canViewPayables = canViewInternalPayables;
    const canViewReceivablePayableProfit = await this.hasAnyPermission(principal.role, ['finance:order-fee:profit:receivable-payable', 'finance:payable:view-profit', 'business:shipment:profit-view']);
    const canViewReceivableBusinessProfit = await this.hasAnyPermission(principal.role, ['finance:order-fee:profit:receivable-business', 'finance:business-cost:view-profit', 'business:order-fee:profit-view', 'business:shipment:profit-view']);
    const canViewBusinessPayableProfit = await this.hasAnyPermission(principal.role, ['finance:order-fee:profit:business-payable', 'finance:payable:view-profit', 'business:shipment:profit-view']);
    const canViewBusinessCostAgent = await this.hasAnyPermission(principal.role, ['finance:business-cost:view-agent', 'finance:order-fee:payable:view', 'finance:payable:view-sensitive']);
    const visiblePayables = canViewPayables
      ? payables
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
      .filter((shipment) => shipment.status === 'REVIEW_PENDING')
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .map((shipment) => this.redactOrderEntrySensitiveShipment(principal, this.decorateReviewPendingListShipment(shipment)));
  }

  async getOrderEntryDrafts(principal: Principal): Promise<Shipment[]> {
    this.ensureOrderEntryAccess(principal);
    await this.cleanupOverdueReviewShipments(principal);
    return this.visibleReviewShipments(principal)
      .filter((shipment) => shipment.status === 'DRAFT' || shipment.status === 'REVIEW_REJECTED')
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map((shipment) => this.redactOrderEntrySensitiveShipment(principal, this.decorateReviewPendingListShipment(shipment)));
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
    if (this.deletedShipmentIds.has(shipmentId) && !(await this.hasPermission(principal.role, 'business:review:restore'))) {
      throw new NotFoundException('运单不存在');
    }
    return this.buildShipmentReviewDetail(principal, shipment);
  }

  async updateShipmentReviewBasic(principal: Principal, shipmentId: string, input: ShipmentReviewBasicUpdateInput): Promise<ShipmentReviewDetailSummary> {
    const shipment = this.visibleReviewShipment(principal, shipmentId);
    if (!['DRAFT', 'REVIEW_PENDING', 'REVIEW_REJECTED'].includes(shipment.status)) {
      throw new BadRequestException('订单已进入后续流程，不能再直接修改待审核资料');
    }
    const customerCode = input.customerCode?.trim();
    const customerOrderNo = input.customerOrderNo?.trim();
    const companyChannelName = input.companyChannelName?.trim();
    const productName = input.productName?.trim();
    const destinationCountry = input.destinationCountry?.trim();
    const cargoType = input.cargoType?.trim();
    const settlementMethod = input.settlementMethod?.trim();
    if (!customerCode || !customerOrderNo || !companyChannelName || !productName || !destinationCountry || !cargoType || !settlementMethod || typeof input.declarationRequired !== 'boolean') {
      throw new BadRequestException('请补齐客户、客户单号、公司渠道、品名、目的地、报关、货物类型和结算方式');
    }
    const customer = this.findCustomerByCode(customerCode);
    if (!customer || !customer.enabled) {
      throw new BadRequestException('客户不存在或已停用，请先维护客户资料');
    }
    this.ensureCustomerMasterAccess(principal, customer);
    const channel = this.channels.find((item) => item.name === companyChannelName && item.enabled);
    if (!channel) {
      throw new BadRequestException('公司渠道不存在或已停用，请从基础资料库重新选择');
    }
    const optional = (value?: string) => value?.trim() || undefined;
    const before = { ...shipment };
    Object.assign(shipment, {
      customerId: customer.id,
      customerCode: customer.code,
      customerName: this.customerDisplayName(customer),
      salesperson: customer.salesperson,
      channelId: channel.id,
      channelName: channel.name,
      carrier: channel.carrier,
      customerOrderNo,
      inboundNo: optional(input.inboundNo),
      productName,
      destinationCountry,
      declarationRequired: input.declarationRequired,
      cargoType,
      subOrderNo: optional(input.subOrderNo),
      fbaInboundNo: optional(input.fbaInboundNo),
      settlementMethod,
      remark: optional(input.remark),
      receiverName: optional(input.receiverName),
      receiverCompany: optional(input.receiverCompany),
      receiverPhone: optional(input.receiverPhone),
      receiverAddress: optional(input.receiverAddress),
      receiverCountry: optional(input.receiverCountry),
      receiverState: optional(input.receiverState),
      receiverPostalCode: optional(input.receiverPostalCode),
      fbaWarehouseCode: optional(input.fbaWarehouseCode),
      latestTracking: '待审核资料已修改'
    });
    this.audit('shipment.review.basic_update', shipment.id, principal, before, {
      ...shipment,
      updateScope: 'REVIEW_BASIC',
      companyChannelName: channel.name,
      updatedBy: principal.username
    });
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
    const canBusinessReview = await this.hasPermission(principal.role, 'business:review:approve')
      && (principal.role !== 'ADMIN' || options.businessReview === true);
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
      void this.lineage?.recordEvent('orders.review.approve', {
        actorUsername: principal.username,
        businessId: shipment.id,
        payload: {
          shipmentId: shipment.id,
          systemOrderNo: shipment.systemOrderNo,
          customerOrderNo: shipment.customerOrderNo,
          reviewStatus: 'BUSINESS_APPROVED',
          statusFrom,
          statusTo: shipment.status,
          reviewedBy: shipment.businessReviewedBy,
          reviewedAt: shipment.businessReviewedAt
        },
        sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
        metrics: {
          receivableTotal: detail.finance.receivableTotal,
          businessCostTotal: detail.finance.businessCostTotal ?? 0,
          payableTotal: detail.finance.payableTotal,
          approvalWarningCount: detail.approvalWarnings.length
        }
      });
      this.autoMatchUnmatchedReceivables(principal);
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
    if (!await this.hasPermission(principal.role, 'business:review:reject')) {
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
    void this.lineage?.recordEvent('orders.review.reject', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        reviewStatus: 'REJECTED',
        statusFrom: before.status,
        statusTo: shipment.status,
        rejectReason: reason,
        reviewedBy: shipment.reviewedBy,
        reviewedAt: shipment.reviewedAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: {
        receivableTotal: detail.finance.receivableTotal,
        businessCostTotal: detail.finance.businessCostTotal ?? 0,
        payableTotal: detail.finance.payableTotal,
        approvalWarningCount: detail.approvalWarnings.length
      }
    });
    return this.buildShipmentReviewDetail(principal, shipment);
  }

  async reverseShipmentReview(principal: Principal, shipmentId: string, input: { reason?: string } = {}): Promise<ShipmentReviewDetailSummary> {
    const shipment = this.shipments.find((item) => item.id === shipmentId && !this.deletedShipmentIds.has(item.id));
    const scope = this.operatorCustomerScope(principal);
    const isOwner = Boolean(scope && (scope.includes(shipment?.salesperson ?? '') || scope.includes(this.findCustomerByCode(shipment?.customerCode ?? '')?.salesperson ?? '')));
    if (!shipment || !(principal.role === 'ADMIN' || isOwner || await this.hasPermission(principal.role, 'business:review:reverse'))) throw new NotFoundException('运单不存在');
    if (shipment.status !== 'WAITING_SORT') throw new BadRequestException(`订单已进入${shipmentStatusLabels[shipment.status]}，不能反审核`);
    const financeItems = this.shipmentFinanceItems.filter((item) => item.shipmentId === shipment.id && !item.voided);
    if (financeItems.some((item) => item.reconciliationStatus === 'CONFIRMED' || item.locked || (item.receivedAmount ?? 0) > 0)) throw new BadRequestException('订单已进入财务审核或已匹配收款，不能反审核');
    const before = { ...shipment };
    const releasedPayables = financeItems.filter((item) => item.type === 'PAYABLE' && item.name === '代理成本' && !item.locked);
    releasedPayables.forEach((item) => { item.voided = true; item.reconciliationStatus = 'VOIDED'; item.voidedAt = new Date().toISOString(); });
    shipment.status = 'REVIEW_PENDING';
    shipment.businessReviewedBy = undefined;
    shipment.businessReviewedAt = undefined;
    shipment.channelId = undefined;
    shipment.agentId = undefined;
    shipment.shippingMarkRequired = false;
    shipment.latestTracking = '反审核后回到待审核';
    this.audit('shipment.review.reverse', shipment.id, principal, before, { ...shipment, statusFrom: before.status, statusTo: shipment.status, reason: input.reason?.trim(), releasedRoutePayableCount: releasedPayables.length });
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
    void this.lineage?.recordEvent('orders.management.delete_restore', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        action: 'review_delete',
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        status: shipment.status,
        deleteReason: shipment.deletedReason,
        deletedBy: shipment.deletedBy,
        deletedAt: shipment.deletedAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: {
        receivableTotal: detailBeforeDelete.finance.receivableTotal,
        businessCostTotal: detailBeforeDelete.finance.businessCostTotal ?? 0,
        payableTotal: detailBeforeDelete.finance.payableTotal
      }
    });
    return { ...detailBeforeDelete, shipment };
  }

  async restoreShipment(principal: Principal, shipmentId: string, input: ReviewRestoreInputWithManual = {}): Promise<ShipmentReviewDetailSummary> {
    if (!(await this.hasPermission(principal.role, 'business:review:restore'))) {
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
    void this.lineage?.recordEvent('orders.management.delete_restore', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        action: 'restore',
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        status: shipment.status,
        restoreMode,
        restoreReason: input.reason?.trim() || restoreMode,
        restoredBy: shipment.restoredBy,
        restoredAt: shipment.restoredAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { statusChanged: before.status !== shipment.status ? 1 : 0 }
    });
    return this.buildShipmentReviewDetail(principal, shipment);
  }

  async permanentlyDeleteShipmentReview(principal: Principal, shipmentId: string): Promise<{ id: string; deleted: true }> {
    if (!(await this.hasPermission(principal.role, 'business:review:purge'))) {
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
    void this.lineage?.recordEvent('orders.management.delete_restore', {
      actorUsername: principal.username,
      businessId: shipmentId,
      payload: {
        action: 'purge',
        shipmentId,
        systemOrderNo: before.systemOrderNo,
        customerOrderNo: before.customerOrderNo,
        status: before.status,
        deleted: true
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipmentId }],
      metrics: { purged: 1 }
    });
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
    const canViewFinanceDetail = ['ADMIN', 'FINANCE', 'UG_FINANCE', 'OPERATOR', 'UG_BUSINESS', 'UG_MARKET', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role);
    const finance = canViewFinanceDetail
      ? await this.getShipmentFinanceDetail(principal, shipment.id)
      : { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, receivables: [], businessCosts: [], receivableTotal: 0 };
    const events: ShipmentReviewEventSummary[] = this.auditLogs
      .filter((log) => log.target === shipment.id)
      .filter((log) => canViewFinanceDetail || !/finance|payment|payable|cost/i.test(log.action))
      .map((log) => ({
        id: log.id,
        type: 'AUDIT',
        title: log.actionLabel,
        note: log.action,
        stage: shipmentStatusLabels[shipment.status],
        sourceModule: memoryInternalTrackingSourceModule(log.action),
        action: log.actionLabel,
        createdAt: log.createdAt,
        operator: log.actorUsername
      }));
    const logisticsTrackingEvents: ShipmentLogisticsTrackingEventSummary[] = isMemoryInternalTrackingStatus(shipment.latestTracking)
      ? []
      : shipment.latestTracking
        ? [{
            id: `${shipment.id}-latest`,
            trackingAt: shipment.latestTrackingUpdatedAt ?? shipment.createdAt,
            node: shipment.latestTracking,
            carrier: shipment.carrier || undefined,
            transferNo: shipment.transferNo,
            rawContent: shipment.latestTracking,
            source: '外部物流数据'
          }]
        : [];
    return {
      shipment: this.redactOrderEntrySensitiveShipment(principal, shipment),
      packages: fallbackPackages,
      finance,
      events,
      internalTrackingEvents: events,
      logisticsTrackingEvents,
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

  private decorateReviewPendingListShipment(shipment: Shipment): Shipment {
    const packageIds = new Set(shipment.draftWarehousePackageIds ?? []);
    const packages = this.warehousePackages.filter((pkg) => pkg.shipmentId === shipment.id || packageIds.has(pkg.id));
    const receivables = [
      ...this.receivableFees
        .filter((fee) => fee.shipmentId === shipment.id && !fee.voided)
        .map((fee) => ({ amount: fee.amount, currency: fee.currency ?? 'RMB' })),
      ...this.shipmentFinanceItems
        .filter((item) => item.shipmentId === shipment.id && item.type === 'RECEIVABLE' && !item.voided)
        .map((item) => ({ amount: item.amount, currency: item.currency ?? 'RMB' }))
    ];
    const keepManualCargo = shipment.cargoDataSource === 'MANUAL_ADJUSTED';
    const packageWeightKg = !keepManualCargo && packages.length ? roundMoney(packages.reduce((sum, pkg) => sum + pkg.weightKg * pkg.packageCount, 0)) : undefined;
    const packageCbm = !keepManualCargo && packages.length ? roundMoney(packages.reduce((sum, pkg) => sum + pkg.cbm, 0)) : undefined;
    const packageChargeableWeightKg = !keepManualCargo && packages.length ? roundMoney(packages.reduce((sum, pkg) => sum + (pkg.chargeableWeightKg || pkg.weightKg), 0)) : undefined;
    try {
      return {
        ...shipment,
        weightKg: packageWeightKg ?? shipment.weightKg ?? shipment.receivableWeightKg,
        volumeCbm: packageCbm ?? shipment.volumeCbm,
        chargeableWeightKg: packageChargeableWeightKg ?? shipment.chargeableWeightKg ?? shipment.receivableWeightKg ?? shipment.agentWeightKg,
        receivableRmbTotal: this.calculateReviewPendingReceivableRmbTotal(receivables),
        receivableRmbTotalError: undefined
      };
    } catch (error) {
      return {
        ...shipment,
        weightKg: packageWeightKg ?? shipment.weightKg ?? shipment.receivableWeightKg,
        volumeCbm: packageCbm ?? shipment.volumeCbm,
        chargeableWeightKg: packageChargeableWeightKg ?? shipment.chargeableWeightKg ?? shipment.receivableWeightKg ?? shipment.agentWeightKg,
        receivableRmbTotal: undefined,
        receivableRmbTotalError: error instanceof Error ? error.message : '应收汇率异常'
      };
    }
  }

  async createShipmentFinanceItem(principal: Principal, shipmentId: string, input: ShipmentFinanceItemCreateInput) {
    const shipment = this.visibleShipment(principal, shipmentId);
    await this.ensureFinanceItemManageAccess(principal, input.type, shipment);
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

  async getOrderEntryWarehousePackages(principal: Principal, query: OrderEntryWarehousePackageQuery): Promise<WarehousePackageSummary[]> {
    this.ensureOrderEntryAccess(principal);
    const packageIds = normalizeOrderEntryPackageIds(query.packageIds);
    const customerCode = query.customerCode?.trim();
    if (!customerCode && !packageIds.length) {
      return [];
    }
    const scope = this.operatorCustomerScope(principal);
    const customer = customerCode ? this.findCustomerByCode(customerCode) : undefined;
    if (customerCode && !customer) {
      return [];
    }
    const draftOccupiedPackageIds = new Set(
      this.shipments
        .filter((shipment) => !shipment.deletedAt)
        .flatMap((shipment) => shipment.draftWarehousePackageIds ?? [])
    );
    const domesticTrackingNo = query.domesticTrackingNo?.trim().toLowerCase();
    const rows = this.warehousePackages
      .filter((pkg) => {
        const packageCustomer = this.findCustomerByCode(pkg.customerCode);
        return (!customer || pkg.customerCode === customer.code)
        && (!packageIds.length || packageIds.includes(pkg.id))
        && (!scope || (packageCustomer?.salesperson && scope.includes(packageCustomer.salesperson)))
        && !pkg.shipmentId
        && !pkg.systemOrderNo
        && pkg.measurementStatus !== 'PENDING_REMEASURE'
        && !['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'].includes(pkg.status)
        && !draftOccupiedPackageIds.has(pkg.id)
        && (!domesticTrackingNo || (pkg.domesticTrackingNo ?? '').toLowerCase().includes(domesticTrackingNo));
      })
      .sort((left, right) => {
        const leftTime = new Date(left.scanTime ?? 0).getTime();
        const rightTime = new Date(right.scanTime ?? 0).getTime();
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        return right.id.localeCompare(left.id, 'zh-CN');
      });
    return this.withConfirmedWarehouseTally(rows);
  }

  async createOrderEntry(principal: Principal, input: OrderEntryCreateInput): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    if (input.shipment.transferNo?.trim()) {
      throw new BadRequestException('录单阶段不能填写转单号，请在出库后完成双审核再填写');
    }
    try {
      this.validateOrderEntryInput(principal, input);
    } catch (error) {
      if (error instanceof BadRequestException && String(error.message).includes('待重新过机')) throw error;
      if (input.submitForReview && error instanceof BadRequestException) {
        return this.createOrderEntry(principal, { ...input, shipment: { ...input.shipment, reviewValidationError: error.message }, submitForReview: false });
      }
      throw error;
    }
    const packages = this.getOrderEntryPackages(input.warehousePackageIds);
    const channel = this.resolveOrderEntryCompanyChannel(input, input.submitForReview);
    const totals = this.calculateOrderEntryCargoTotals(packages, channel, input.shipment);
    const channelId = channel?.id;
    const shipment = await this.createShipment(principal, {
      customerId: input.shipment.customerId ?? this.findCustomerByCode(input.shipment.customerCode)?.id,
	      customerOrderNo: input.shipment.customerOrderNo,
	      outboundOrderNo: input.shipment.outboundOrderNo,
	      systemOrderNo: input.shipment.outboundOrderNo?.trim() || input.shipment.systemOrderNo,
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
      receivingChannel: channel?.name ?? input.shipment.receivingChannel,
      initialStatus: input.submitForReview ? 'REVIEW_PENDING' : 'DRAFT',
      latestTracking: input.submitForReview ? '财务录单创建，待审核' : '财务录单保存草稿',
      reviewValidationError: input.shipment.reviewValidationError,
      productName: input.shipment.productName,
      declarationRequired: input.shipment.declarationRequired,
      sensitive: input.shipment.sensitive,
      cargoType: input.shipment.cargoType,
      volumeCbm: totals.cbm,
      actualWeightKg: totals.weightKg,
      cargoDataSource: input.shipment.cargoDataSource ?? 'AUTO_MATCHED',
      chargeWeightOverridden: input.shipment.chargeWeightOverridden ?? false,
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
    shipment.salesperson = this.findCustomerByCode(input.shipment.customerCode)?.salesperson ?? principal.username;
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
      salesperson: shipment.salesperson,
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
    void this.lineage?.recordEvent(input.submitForReview ? 'orders.entry.submit' : 'orders.entry.draft', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
      shipmentId: shipment.id,
      systemOrderNo: shipment.systemOrderNo,
      customerOrderNo: shipment.customerOrderNo,
        status: shipment.status,
      warehousePackageIds: input.warehousePackageIds,
      financeItems: createdItems.map((item) => ({ id: item.id, type: item.type, amount: item.amount, currency: item.currency }))
      },
      sourceRefs: [
        ...(input.warehousePackageIds ?? []).map((id) => ({ nodeType: 'warehouse_package', id })),
        ...createdItems.map((item) => ({ nodeType: 'finance_item', id: item.id }))
      ],
      metrics: {
      packageCount: totals.packageCount,
      weightKg: totals.weightKg,
      volumeCbm: totals.cbm,
      financeItemCount: createdItems.length
      }
    });
    return this.getOrderEntryDetail(principal, shipment.id);
  }

  async getOrderEntryDetail(principal: Principal, shipmentId: string): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    const shipment = this.getShipmentById(shipmentId);
    if (!this.visibleReviewShipments(principal).some((item) => item.id === shipment.id)) {
      throw new NotFoundException('录单不存在');
    }
    const packageIds = new Set(shipment.draftWarehousePackageIds ?? []);
    const packages = this.warehousePackages.filter((pkg) => pkg.shipmentId === shipment.id || packageIds.has(pkg.id));
    const items = this.shipmentFinanceItems.filter((item) => item.shipmentId === shipment.id && !item.voided);
    const canViewPayables = this.canViewOrderEntryPayables(principal);
    const canViewSensitivePayables = this.canUseSensitiveOrderEntryPayables(principal);
    const visibleShipment = this.redactOrderEntrySensitiveShipment(principal, shipment);
    return {
      shipment: visibleShipment,
      packages,
      receivables: items.filter((item) => item.type === 'RECEIVABLE').map((item) => this.toReceivableFinanceSummary(item, shipment)),
      businessCosts: items
        .filter((item) => item.type === 'BUSINESS_COST')
        .map((item) => this.toBusinessCostFinanceSummary(item, shipment))
        .map((item) => canViewSensitivePayables ? item : { ...item, agentName: undefined }),
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
    if (!this.visibleReviewShipments(principal).some((item) => item.id === shipment.id)) {
      throw new NotFoundException('录单草稿不存在');
    }
    if (!['DRAFT', 'REVIEW_REJECTED'].includes(shipment.status)) {
      throw new BadRequestException('只有草稿或退回修改的录单可以继续编辑');
    }
    try {
      this.validateOrderEntryInput(principal, input);
    } catch (error) {
      if (error instanceof BadRequestException && String(error.message).includes('待重新过机')) throw error;
      if (input.submitForReview && error instanceof BadRequestException) {
        return this.updateOrderEntryDraft(principal, shipmentId, { ...input, shipment: { ...input.shipment, reviewValidationError: error.message }, submitForReview: false });
      }
      throw error;
    }
    const packages = this.getOrderEntryPackages(input.warehousePackageIds, shipment.id);
    const channel = this.resolveOrderEntryCompanyChannel(input, input.submitForReview);
    const totals = this.calculateOrderEntryCargoTotals(packages, channel, input.shipment);
    const customer = this.findCustomerByCode(input.shipment.customerCode) ?? this.customers.find((item) => item.id === input.shipment.customerId);
    if (!customer) {
      throw new BadRequestException('客户不存在，请先维护客户资料');
    }
    const nextSystemOrderNo = input.shipment.outboundOrderNo?.trim() || input.shipment.systemOrderNo?.trim() || shipment.systemOrderNo;
    if (this.shipments.some((item) => item.id !== shipment.id && item.systemOrderNo === nextSystemOrderNo)) {
      throw new BadRequestException(`出货单号 ${nextSystemOrderNo} 已存在，请更换后再提交`);
    }
    const before = { ...shipment };
    Object.assign(shipment, {
      customerId: customer.id,
      customerName: `${customer.code}-${customer.name}`,
	      customerCode: customer.code,
	      salesperson: customer.salesperson ?? principal.username,
      entryBy: principal.username,
	      customerOrderNo: input.shipment.customerOrderNo.trim(),
	      systemOrderNo: nextSystemOrderNo,
	      outboundOrderNo: nextSystemOrderNo,
	      entryAt: input.shipment.entryAt && this.canEditOrderEntryEntryAt(principal) ? new Date(input.shipment.entryAt).toISOString() : shipment.entryAt,
      subOrderNo: input.shipment.subOrderNo?.trim() || undefined,
      inboundNo: input.shipment.inboundNo?.trim() || undefined,
      draftWarehousePackageIds: input.submitForReview ? [] : input.warehousePackageIds,
      productName: input.shipment.productName.trim(),
      declarationRequired: input.shipment.declarationRequired,
      sensitive: input.shipment.sensitive ?? false,
      cargoType: input.shipment.cargoType.trim(),
      volumeCbm: totals.cbm,
      actualWeightKg: totals.weightKg,
      weightKg: totals.weightKg,
      cargoDataSource: input.shipment.cargoDataSource ?? 'AUTO_MATCHED',
      chargeWeightOverridden: input.shipment.chargeWeightOverridden ?? false,
      reviewRejectedReason: input.submitForReview ? undefined : input.shipment.reviewValidationError ?? shipment.reviewRejectedReason,
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
    void this.lineage?.recordEvent(input.submitForReview ? 'orders.entry.submit' : 'orders.entry.draft', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        statusFrom: before.status,
        statusTo: shipment.status,
        warehousePackageIds: input.warehousePackageIds,
        financeItems: createdItems.map((item) => ({ id: item.id, type: item.type, amount: item.amount, currency: item.currency }))
      },
      sourceRefs: [
        { nodeType: 'shipment_draft', id: shipment.id },
        ...input.warehousePackageIds.map((id) => ({ nodeType: 'warehouse_package', id })),
        ...createdItems.map((item) => ({ nodeType: 'finance_item', id: item.id }))
      ],
      metrics: {
        packageCount: totals.packageCount,
        weightKg: totals.weightKg,
        volumeCbm: totals.cbm,
        financeItemCount: createdItems.length
      }
    });
    return this.getOrderEntryDetail(principal, shipment.id);
  }

  async deleteOrderEntryDraft(principal: Principal, shipmentId: string, input: ShipmentReviewDeleteInput = {}): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    const shipment = this.getShipmentById(shipmentId);
    if (!this.visibleReviewShipments(principal).some((item) => item.id === shipment.id)) {
      throw new NotFoundException('录单草稿不存在');
    }
    if (!['DRAFT', 'REVIEW_REJECTED'].includes(shipment.status)) {
      throw new BadRequestException('只有草稿或退回修改的录单可以删除');
    }
    const detailBeforeDelete = await this.getOrderEntryDetail(principal, shipment.id);
    const before = { ...shipment };
    const reason = input.reason?.trim() || '录单草稿箱删除';
    const financeItemIds = new Set(this.shipmentFinanceItems.filter((item) => item.shipmentId === shipment.id).map((item) => item.id));
    if (this.payablePaymentApplications.some((item) => item.shipmentId === shipment.id)
      || this.paymentApplicationItems.some((item) => item.shipmentId === shipment.id)
      || this.waterReceipts.some((receipt) => receipt.matches.some((match) => match.shipmentId === shipment.id || financeItemIds.has(match.receivableFinanceItemId)))
      || this.labels.some((label) => label.shipmentId === shipment.id)
      || this.carrierTasks.some((task) => task.shipmentId === shipment.id)
      || this.tickets.some((ticket) => ticket.shipmentId === shipment.id)) {
      throw new BadRequestException('该草稿已被付款、水单、面单、承运任务或问题件引用，不能删除');
    }
    this.shipmentFinanceItems
      .filter((item) => item.shipmentId === shipment.id)
      .map((item) => item.id)
      .forEach((id) => this.shipmentFinanceItems.splice(this.shipmentFinanceItems.findIndex((item) => item.id === id), 1));
    this.receivableFees
      .filter((item) => item.shipmentId === shipment.id)
      .map((item) => item.id)
      .forEach((id) => this.receivableFees.splice(this.receivableFees.findIndex((item) => item.id === id), 1));
    this.payableFees
      .filter((item) => item.shipmentId === shipment.id)
      .map((item) => item.id)
      .forEach((id) => this.payableFees.splice(this.payableFees.findIndex((item) => item.id === id), 1));
    this.warehousePackages
      .filter((item) => item.shipmentId === shipment.id)
      .forEach((item) => {
        item.shipmentId = undefined;
        item.systemOrderNo = undefined;
      });
    this.shipments.splice(this.shipments.findIndex((item) => item.id === shipment.id), 1);
    this.deletedShipmentIds.delete(shipment.id);
    this.audit('shipment.order_entry.draft_delete', shipment.id, principal, before, {
      draftWarehousePackageIds: before.draftWarehousePackageIds ?? [],
      deleteReason: reason,
      hardDelete: true
    });
    void this.lineage?.recordEvent('orders.entry.draft_delete', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        status: shipment.status,
        draftWarehousePackageIds: before.draftWarehousePackageIds ?? [],
        deleteReason: reason,
        hardDelete: true
      },
      sourceRefs: [{ nodeType: 'shipment_draft', id: shipment.id }],
      metrics: { draftWarehousePackageCount: (before.draftWarehousePackageIds ?? []).length }
    });
    return { ...detailBeforeDelete, shipment: before };
  }

  async updateShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string, input: ShipmentFinanceItemUpdateInput) {
    const shipment = this.visibleShipment(principal, shipmentId);
    const item = this.findEditableFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, item.type, shipment);
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
    await this.ensureFinanceItemManageAccess(principal, item.type, shipment);
    this.ensureBusinessCostEditableAfterDispatch(principal, item.type, shipment);
    const before = { ...item };
    const pendingPaymentIds = this.payablePaymentApplications
      .filter((row) => row.payableFinanceItemId === item.id)
      .map((row) => row.id);
    const payableReferenced = pendingPaymentIds.length > 0
      || this.paymentApplicationItems.some((row) => row.payableFinanceItemId === item.id)
      || this.paymentVouchers.some((row) => row.payableFinanceItemId === item.id || pendingPaymentIds.includes(row.pendingPaymentId ?? ''));
    const receivableReferenced = this.waterReceipts.some((receipt) => receipt.matches.some((match) => match.receivableFinanceItemId === item.id));
    if (payableReferenced) {
      throw new BadRequestException('该费用已被付款申请、付款记录或凭证引用，不能删除');
    }
    if (receivableReferenced) {
      throw new BadRequestException('该费用已被水单匹配引用，不能删除');
    }
    const index = this.shipmentFinanceItems.findIndex((row) => row.id === item.id);
    this.shipmentFinanceItems.splice(index, 1);
    this.audit('shipment.finance_item.delete', item.id, principal, before, { hardDelete: true });
    this.auditBusinessCostChangeNotification(principal, item.type, shipment, before, { ...before, hardDelete: true });
    return this.toFinanceItemSummary(before, shipment);
  }

  async lockShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = this.visibleShipment(principal, shipmentId);
    const item = this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, item.type, shipment);
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
    await this.ensureFinanceItemManageAccess(principal, item.type, shipment);
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
    const agent = input.agentId ? this.agents.find((item) => item.id === input.agentId) : undefined;
    const receivingChannel = input.receivingChannel?.trim();
    const initialStatus = principal.role === 'CUSTOMER' ? 'DRAFT' : input.initialStatus ?? 'DRAFT';
    if (!['DRAFT', 'REVIEW_PENDING', 'DECLARED'].includes(initialStatus)) {
      throw new BadRequestException('新建运单不能直接进入该状态，请按审核、排货、出库流程操作');
    }
    const latestTracking = input.latestTracking?.trim() || (initialStatus === 'DRAFT' || initialStatus === 'REVIEW_PENDING' ? '新建出货订单，待审核' : '客户已预报');
    this.sequence += 1;
    const systemOrderNo = principal.role === 'CUSTOMER'
      ? createSystemOrderNo(input.businessType, new Date(), this.sequence)
      : input.outboundOrderNo?.trim() || input.systemOrderNo?.trim() || createSystemOrderNo(input.businessType, new Date(), this.sequence);
    const shipment: Shipment & { customerId: string; channelId?: string; agentId?: string } = {
      id: `s-created-${this.sequence}`,
      customerId,
      channelId: channel.id,
      agentId: agent?.id ?? input.agentId,
      createdAt: new Date().toISOString(),
      entryAt: input.entryAt ? new Date(input.entryAt).toISOString() : new Date().toISOString(),
      customerName: `${customer.code}-${customer.name}`,
      customerCode: customer.code,
      salesperson: customer.salesperson,
      customerOrderNo: input.customerOrderNo.trim(),
      outboundOrderNo: systemOrderNo,
      systemOrderNo,
      subOrderNo: input.subOrderNo?.trim() || undefined,
      inboundNo: input.inboundNo?.trim() || undefined,
      draftWarehousePackageIds: [],
      outboundAt: input.outboundAt,
      productName: input.productName?.trim() || undefined,
      declarationRequired: input.declarationRequired ?? false,
      sensitive: input.sensitive ?? false,
      cargoType: input.cargoType?.trim() || undefined,
      volumeCbm: input.volumeCbm,
      actualWeightKg: input.actualWeightKg,
      weightKg: input.actualWeightKg,
      cargoDataSource: input.cargoDataSource ?? 'AUTO_MATCHED',
      chargeWeightOverridden: input.chargeWeightOverridden ?? false,
      reviewRejectedReason: input.reviewValidationError,
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
      chargeableWeightKg: input.receivableWeightKg,
      latestTracking,
      trackingStaleDays: 0,
      isRemoteArea: false,
      status: initialStatus,
      channelName: channel.name,
      agentName: agent?.shortName ?? agent?.name ?? '',
      hasProblemTicket: false
    };
    if (this.shipments.some((item) => item.systemOrderNo === shipment.systemOrderNo)) {
      throw new BadRequestException(`出货单号 ${shipment.systemOrderNo} 已存在，请更换后再提交`);
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
      if (packages.some((pkg) => pkg?.measurementStatus === 'PENDING_REMEASURE')) {
        throw new BadRequestException('理货后包裹待重新过机，完成测量后才能录单');
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
    const shouldApprove = body.approve !== false;
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
    if (shouldApprove && !shipment.destinationCountry?.trim()) {
      throw new BadRequestException('排货前必须填写国家');
    }
    if (shouldApprove && shipment.status !== 'WAITING_SORT') {
      throw new BadRequestException('当前状态不允许排货');
    }
    if (!shouldApprove && shipment.status !== 'WAITING_SORT') {
      throw new BadRequestException('只有待排货运单可以修改排货信息');
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
    const routePayable = {
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
    } satisfies StoredShipmentFinanceItem;
    this.shipmentFinanceItems.push(routePayable);
    if (shouldApprove) shipment.status = 'WAITING_DISPATCH';
    shipment.channelId = channel.id;
    shipment.channelName = channel.name;
    shipment.carrier = channel.carrier;
    shipment.agentId = agent?.id;
    shipment.agentName = agent?.name ?? shipment.agentName;
    if (shouldApprove) shipment.routedAt = routedAt;
    shipment.routeAgentChannelName = manualAgentChannelName;
    shipment.routeChargeWeightKg = chargeWeightKg;
    shipment.routeUnitPrice = unitPrice;
    shipment.routeOtherFee = otherFee;
    shipment.routeCostTotal = payableTotal;
    shipment.routeCurrency = body.currency ?? 'RMB';
    shipment.shippingMarkRequired = body.shippingMarkRequired === true;
    this.audit(shouldApprove ? 'shipment.route' : 'shipment.route.update', shipment.id, principal, before, {
      status: shipment.status,
      routeStatus: shipment.status,
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
    if (shouldApprove) void this.lineage?.recordEvent('market.pending_routing.route', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        statusFrom: before.status,
        statusTo: shipment.status,
        companyChannelId: channel.id,
        companyChannelName: channel.name,
        agentId: agent.id,
        agentName: agent.name,
        agentChannelId: agentChannel?.id,
        agentChannelName: manualAgentChannelName,
        payableFinanceItemId: routePayable.id,
        chargeWeightKg,
        unitPrice,
        otherFee,
        otherFeeRemark,
        currency: body.currency ?? 'RMB',
        payableTotal,
        shippingMarkRequired: shipment.shippingMarkRequired,
        routedBy: principal.username,
        routedAt
      },
      sourceRefs: [
        { nodeType: 'shipment', id: shipment.id },
        { nodeType: 'company_channel', id: channel.id },
        { nodeType: 'agent', id: agent.id },
        ...(agentChannel?.id ? [{ nodeType: 'agent_channel', id: agentChannel.id }] : []),
        { nodeType: 'payable_finance_item', id: routePayable.id }
      ],
      metrics: {
        chargeWeightKg,
        unitPrice,
        otherFee,
        payableTotal,
        shippingMarkRequired: shipment.shippingMarkRequired === true
      }
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
    const handover = this.latestWarehouseHandover(shipment.id);
    if (!handover || handover.agentId !== shipment.agentId) {
      this.audit('shipment.dispatch.blocked', shipment.id, principal, null, { reason: '请先打印代理交接单', agentId: shipment.agentId });
      throw new BadRequestException('请先打印代理交接单');
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
    const handoverNo = handover.handoverNo;
    shipment.transferNo = transferNo ?? undefined;
    shipment.status = 'OUTBOUNDED';
    shipment.latestTracking = '仓库已出库，等待客服补齐转单号';
    shipment.dispatchedAt = new Date().toISOString();
    shipment.outboundAt = shipment.dispatchedAt;
    shipment.handoverNo = handoverNo;
    shipment.outboundBy = principal.username;
    shipment.batchDispatchSource = body.batchDispatchSource;
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
      batchDispatchSource: body.batchDispatchSource,
      customerServiceReceiveStatus: 'PENDING_CONFIRMATION',
      archiveStatus: '已出库归档',
      warehousePackageIds: warehousePackages.map((pkg) => pkg.id),
      warehousePackageStatuses,
      warehousePackageStatusTo: warehousePackages.length ? 'SHIPPED' : undefined,
      shippingMarkRequired: shipment.shippingMarkRequired === true,
      shippingMarkConfirmed: body.shippingMarkConfirmed === true
    });
    void this.lineage?.recordEvent('warehouse.queue.dispatch', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        handoverNo,
        transferNo: shipment.transferNo,
        statusFrom: before.status,
        statusTo: shipment.status,
        warehousePackageIds: warehousePackages.map((pkg) => pkg.id),
        shippingMarkConfirmed: body.shippingMarkConfirmed === true,
        outboundBy: principal.username,
        outboundAt: shipment.outboundAt
      },
      sourceRefs: [
        { nodeType: 'shipment', id: shipment.id },
        ...warehousePackages.map((pkg) => ({ nodeType: 'warehouse_package', id: pkg.id }))
      ],
      metrics: {
        packageCount: shipment.packageCount,
        chargeableWeightKg: shipment.receivableWeightKg,
        warehousePackageCount: warehousePackages.length
      }
    });
    return shipment;
  }

  async printWarehouseHandover(principal: Principal, input: WarehouseHandoverPrintInput): Promise<WarehouseHandoverPrintResponse> {
    const ids = Array.from(new Set(input.shipmentIds ?? [])).filter((id): id is string => typeof id === 'string' && Boolean(id));
    if (!ids.length) throw new BadRequestException('请先选择待出库订单');
    const rows = ids.map((id) => this.visibleShipment(principal, id));
    const invalid = rows.find((shipment) => shipment.status !== 'WAITING_DISPATCH' || !shipment.agentId || !this.agents.some((agent) => agent.id === shipment.agentId && agent.enabled));
    if (invalid) throw new BadRequestException('代理资料未匹配，请返回待排货重新选择有效代理');
    const now = new Date().toISOString();
    return { rows: rows.map((shipment, index) => {
      const agent = this.agents.find((item) => item.id === shipment.agentId)!;
      const previous = this.latestWarehouseHandover(shipment.id);
      const handoverNo = previous?.handoverNo ?? `HD-${now.slice(0, 10).replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`;
      const summary: WarehouseHandoverSummary = {
        shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, handoverNo, agentId: agent.id,
        agentShortName: agent.shortName || agent.name, agentFullName: agent.name,
        agentChannelName: shipment.routeAgentChannelName || shipment.channelName || '-', packageCount: shipment.packageCount,
        printedBy: previous?.printedBy ?? principal.username, firstPrintedAt: previous?.firstPrintedAt ?? now,
        lastPrintedAt: now, printCount: (previous?.printCount ?? 0) + 1
      };
      this.audit('warehouse.handover.print', shipment.id, principal, previous, summary);
      return summary;
    }) };
  }

  async getWarehouseHandover(principal: Principal, shipmentId: string): Promise<WarehouseHandoverSummary> {
    this.visibleShipment(principal, shipmentId);
    const summary = this.latestWarehouseHandover(shipmentId);
    if (!summary) throw new NotFoundException('尚未打印代理交接单');
    return summary;
  }

  private latestWarehouseHandover(shipmentId: string): WarehouseHandoverSummary | undefined {
    const row = [...this.auditLogs].reverse().find((item) => item.action === 'warehouse.handover.print' && item.target === shipmentId);
    return row?.after as WarehouseHandoverSummary | undefined;
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
    void this.lineage?.recordEvent('market.routed.reroute', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        statusFrom: before.status,
        statusTo: shipment.status,
        reason,
        returnedBy: principal.username,
        returnedAt: now,
        previousChannelId: before.channelId,
        previousChannelName: before.channelName,
        previousAgentId: before.agentId,
        previousAgentName: before.agentName
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { statusFrom: before.status, statusTo: shipment.status }
    });
    return shipment;
  }

  async deletePendingRoutingShipment(principal: Principal, shipmentId: string, input: ShipmentReviewDeleteInput = {}): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const reason = input.reason?.trim();
    if (!reason) {
      throw new BadRequestException('请填写删除原因');
    }
    if (shipment.status !== 'WAITING_SORT') {
      throw new BadRequestException('只有待排货运单可以删除');
    }
    const now = new Date().toISOString();
    const before = { ...shipment };
    shipment.deletedAt = now;
    shipment.deletedBy = principal.username;
    shipment.deletedReason = reason;
    shipment.deleteType = 'MANUAL';
    this.deletedShipmentIds.add(shipment.id);
    this.audit('shipment.route.delete', shipment.id, principal, before, {
      ...shipment,
      statusBefore: before.status,
      deleteReason: reason,
      deletedBy: principal.username,
      deletedAt: now
    });
    void this.lineage?.recordEvent('market.pending_routing.delete', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        statusBefore: before.status,
        deleteReason: reason,
        deletedBy: principal.username,
        deletedAt: now
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { statusBefore: before.status, deleteType: 'MANUAL' }
    });
    return shipment;
  }

  async approveShipmentBusinessData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以审核业务数据');
    }
    if (shipment.status !== 'OUTBOUNDED') {
      throw new BadRequestException('排货后才能审核业务数据');
    }
    if (this.isCustomerServiceDataApproved(shipmentId, 'business')) throw new BadRequestException('业务数据已审核，请先反审核');
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
    void this.lineage?.recordEvent('customer_service.data_confirm.approve', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        reviewType: 'BUSINESS_DATA',
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        statusFrom: shipment.status,
        statusTo: shipment.status,
        reviewStatus: 'APPROVED',
        reviewedBy: principal.username,
        reviewedAt,
        differenceFeedback,
        customerCode: shipment.customerCode,
        destinationCountry: shipment.destinationCountry,
        packageCount: shipment.packageCount,
        chargeableWeightKg: shipment.receivableWeightKg,
        declarationRequired: shipment.declarationRequired,
        sensitive: shipment.sensitive
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: {
        packageCount: shipment.packageCount,
        chargeableWeightKg: shipment.receivableWeightKg,
        declarationRequired: shipment.declarationRequired ? 1 : 0,
        sensitive: shipment.sensitive ? 1 : 0
      }
    });
    return shipment;
  }

  async approveShipmentAgentData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以审核代理数据');
    }
    if (shipment.status !== 'OUTBOUNDED') {
      throw new BadRequestException('排货后才能审核代理数据');
    }
    if (this.isCustomerServiceDataApproved(shipmentId, 'agent')) throw new BadRequestException('代理数据已审核，请先反审核');
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
    void this.lineage?.recordEvent('customer_service.data_confirm.approve', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        reviewType: 'AGENT_DATA',
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        statusFrom: shipment.status,
        statusTo: shipment.status,
        reviewStatus: 'APPROVED',
        agentId: shipment.agentId,
        agentName: shipment.agentName,
        channelId: shipment.channelId,
        agentChannelName: shipment.channelName || shipment.carrier,
        agentChargeWeightKg: shipment.agentWeightKg,
        reviewedBy: principal.username,
        reviewedAt,
        differenceFeedback,
        customerCode: shipment.customerCode
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: {
        agentChargeWeightKg: shipment.agentWeightKg,
        hasAgent: shipment.agentId ? 1 : 0,
        hasChannel: shipment.channelId ? 1 : 0
      }
    });
    return shipment;
  }

  async updateShipmentBusinessData(principal: Principal, shipmentId: string, body: { packageCount: number; weightKg: number; volumeCbm: number; chargeWeightKg: number; remark?: string; pushToSales?: boolean }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    this.ensureCustomerServiceDataEditable(principal, shipment, 'business');
    this.validateCustomerServiceData(body);
    const before = { ...shipment };
    shipment.packageCount = Math.floor(body.packageCount);
    shipment.actualWeightKg = body.weightKg;
    shipment.volumeCbm = body.volumeCbm;
    shipment.receivableWeightKg = body.chargeWeightKg;
    shipment.chargeableWeightKg = body.chargeWeightKg;
    this.syncCustomerServiceCostWeight(shipment.id, 'BUSINESS_COST', body.chargeWeightKg);
    this.audit('customer_service.business_data.updated', shipment.id, principal, before, { ...shipment, reviewStatus: 'PENDING', snapshot: body, remark: body.remark?.trim(), pushTaskStatus: body.pushToSales ? 'PENDING' : undefined });
    if (body.pushToSales) this.audit('customer_service.business_data.push_pending', shipment.id, principal, null, { customerCode: shipment.customerCode, systemOrderNo: shipment.systemOrderNo, channelName: shipment.channelName, snapshot: body, remark: body.remark?.trim(), status: 'PENDING' });
    return shipment;
  }

  async updateShipmentAgentData(principal: Principal, shipmentId: string, body: { packageCount: number; weightKg: number; volumeCbm: number; chargeWeightKg: number; remark?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    this.ensureCustomerServiceDataEditable(principal, shipment, 'agent');
    this.validateCustomerServiceData(body);
    const before = { ...shipment };
    shipment.agentWeightKg = body.chargeWeightKg;
    this.syncCustomerServiceCostWeight(shipment.id, 'PAYABLE', body.chargeWeightKg);
    this.audit('customer_service.agent_data.updated', shipment.id, principal, before, { ...shipment, reviewStatus: 'PENDING', snapshot: body, remark: body.remark?.trim() });
    return shipment;
  }

  async reverseShipmentBusinessData(principal: Principal, shipmentId: string, body: { reason?: string }): Promise<Shipment> {
    return this.reverseCustomerServiceData(principal, shipmentId, 'business', body.reason);
  }

  async reverseShipmentAgentData(principal: Principal, shipmentId: string, body: { reason?: string }): Promise<Shipment> {
    return this.reverseCustomerServiceData(principal, shipmentId, 'agent', body.reason);
  }

  async approveShipmentAllData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    this.ensureCustomerServiceDataEditable(principal, shipment, 'business');
    this.ensureCustomerServiceDataEditable(principal, shipment, 'agent');
    await this.approveShipmentBusinessData(principal, shipmentId, body);
    return this.approveShipmentAgentData(principal, shipmentId, body);
  }

  async reverseShipmentAllData(principal: Principal, shipmentId: string, body: { reason?: string }): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!this.isCustomerServiceDataApproved(shipmentId, 'business') || !this.isCustomerServiceDataApproved(shipmentId, 'agent')) throw new BadRequestException('仅两组数据均已审核时可全部反审核');
    await this.reverseCustomerServiceData(principal, shipmentId, 'business', body.reason);
    return this.reverseCustomerServiceData(principal, shipmentId, 'agent', body.reason);
  }

  async updateShipmentOperational(principal: Principal, shipmentId: string, input: ShipmentOperationalUpdateInput): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    const before = { ...shipment };
    const transferNo = input.transferNo !== undefined ? input.transferNo.trim() || undefined : shipment.transferNo;
    const subOrderNo = input.subOrderNo !== undefined ? input.subOrderNo.trim() || undefined : shipment.subOrderNo;
    const channel = input.channelId ? this.findEnabledEntity(this.channels, input.channelId, '渠道不存在') : undefined;
    let nextStatus = input.status ?? shipment.status;
    if (shipment.status === 'OUTBOUNDED' && nextStatus === 'WAITING_DEPARTURE') {
      await this.ensureTransferDataApproved(principal, shipment.id);
    }
    if (transferNo && transferNo !== shipment.transferNo) {
      if (!(await this.hasPermission(principal.role, 'customer-service:transfer:write'))) {
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
    if (shipment.status !== 'SIGNED' && nextStatus === 'SIGNED' && !(await this.hasAnyPermission(principal.role, ['customer-service:delivering:confirm-signed', 'customer-service:signed:confirm']))) {
      await this.recordPermissionDenied(principal, { permissions: ['customer-service:delivering:confirm-signed', 'customer-service:signed:confirm'], method: 'PATCH', path: `/api/shipments/${shipmentId}/operational` });
      throw new ForbiddenException('没有确认签收权限');
    }
    if (shipment.status !== nextStatus && nextStatus === 'DEPARTED') {
      if (!(await this.hasPermission(principal.role, 'customer-service:waiting-departure:confirm-departure'))) {
        await this.recordPermissionDenied(principal, { permissions: ['customer-service:waiting-departure:confirm-departure'], method: 'PATCH', path: `/api/shipments/${shipmentId}/operational` });
        throw new ForbiddenException('没有确认离港权限');
      }
      if (shipment.status !== 'WAITING_DEPARTURE') {
        throw new BadRequestException('只有待离港运单可以确认离港');
      }
    }
    if (shipment.status === nextStatus && input.status === 'DEPARTED') {
      throw new BadRequestException('运单已离港，不能重复确认离港');
    }
    if (nextStatus === 'DEPARTED' && !(input.etaAt ?? shipment.etaAt) || nextStatus === 'DEPARTED' && !(input.etdAt ?? shipment.etdAt)) {
      throw new BadRequestException('确认离港前必须填写 ETA 和 ETD');
    }
    const latestTracking = input.latestTracking?.trim();
    if (input.latestTracking !== undefined && !latestTracking) {
      throw new BadRequestException('最新轨迹不能为空');
    }
    const statusRemark = input.statusRemark?.trim();
    if (shipment.status !== nextStatus && nextStatus === 'DEPARTED' && !statusRemark) {
      throw new BadRequestException('确认离港请填写离港批注');
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
      ...(statusRemark ? { statusRemark, remark: statusRemark, comment: statusRemark } : {}),
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
    if (before.status !== shipment.status || (shipment.status === 'SIGNED' && input.status === 'SIGNED')) {
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
          changedBy: principal.username,
          ...(statusRemark ? { statusRemark, remark: statusRemark, comment: statusRemark } : {})
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
          transferNo: shipment.transferNo,
          ...(statusRemark ? { statusRemark, remark: statusRemark, comment: statusRemark } : {})
        }
      );
    }
    void this.lineage?.recordEvent('orders.management.update', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        statusFrom: before.status,
        statusTo: shipment.status,
        transferNoFrom: before.transferNo,
        transferNoTo: shipment.transferNo,
        channelIdFrom: before.channelId,
        channelIdTo: shipment.channelId,
        etaAt: shipment.etaAt,
        etdAt: shipment.etdAt,
        latestTracking: shipment.latestTracking,
        statusRemark
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: {
        statusChanged: before.status !== shipment.status ? 1 : 0,
        transferNoChanged: before.transferNo !== shipment.transferNo ? 1 : 0,
        etaChanged: before.etaAt !== shipment.etaAt ? 1 : 0,
        etdChanged: before.etdAt !== shipment.etdAt ? 1 : 0
      }
    });
    if (transferNoChanged) {
      void this.lineage?.recordEvent('customer_service.transfer.update', {
        actorUsername: principal.username,
        businessId: shipment.id,
        payload: {
          shipmentId: shipment.id,
          systemOrderNo: shipment.systemOrderNo,
          customerOrderNo: shipment.customerOrderNo,
          status: shipment.status,
          transferNoFrom: before.transferNo,
          transferNoTo: shipment.transferNo,
          subOrderNoFrom: before.subOrderNo,
          subOrderNoTo: shipment.subOrderNo,
          trackingWebsite,
          trackingWebsiteVisibleToSales: trackingWebsiteTouched ? input.trackingWebsiteVisibleToSales ?? false : undefined,
          transferNoFilledBy: principal.username,
          transferNoFilledAt: new Date().toISOString(),
          labelId: label?.id,
          labelUrl: label?.labelUrl
        },
        sourceRefs: [
          { nodeType: 'shipment', id: shipment.id },
          ...(label ? [{ nodeType: 'warehouse_label', id: label.id }] : [])
        ],
        metrics: { transferNoChanged: 1, hasLabel: label ? 1 : 0 }
      });
    }
    if (before.etaAt !== shipment.etaAt || before.etdAt !== shipment.etdAt) {
      void this.lineage?.recordEvent('customer_service.departed.update', {
        actorUsername: principal.username,
        businessId: shipment.id,
        payload: {
          shipmentId: shipment.id,
          systemOrderNo: shipment.systemOrderNo,
          customerOrderNo: shipment.customerOrderNo,
          status: shipment.status,
          etaFrom: before.etaAt,
          etaTo: shipment.etaAt,
          etdFrom: before.etdAt,
          etdTo: shipment.etdAt,
          latestTracking: shipment.latestTracking,
          updatedBy: principal.username
        },
        sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
        metrics: {
          etaChanged: before.etaAt !== shipment.etaAt ? 1 : 0,
          etdChanged: before.etdAt !== shipment.etdAt ? 1 : 0
        }
      });
    }
    if (before.status !== shipment.status || (shipment.status === 'SIGNED' && input.status === 'SIGNED')) {
      const statusEventKey = customerServiceStatusLineageKey(shipment.status);
      if (statusEventKey) {
        void this.lineage?.recordEvent(statusEventKey, {
          actorUsername: principal.username,
          businessId: shipment.id,
          payload: {
            shipmentId: shipment.id,
            systemOrderNo: shipment.systemOrderNo,
            customerOrderNo: shipment.customerOrderNo,
            statusFrom: before.status,
            statusTo: shipment.status,
            latestTracking: shipment.latestTracking,
            etaAt: shipment.etaAt,
            etdAt: shipment.etdAt,
            transferNo: shipment.transferNo,
            statusRemark,
            changedBy: principal.username
          },
          sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
          metrics: { statusChanged: before.status !== shipment.status ? 1 : 0 }
        });
      }
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
    const latestByShipmentId = new Map<string, { shipment: Shipment; latestTracking: string; trackingDate: Date }>();
    for (const item of request.updates) {
      const shipment = this.visibleShipment(principal, item.shipmentId);
      if (!item.latestTracking?.trim()) {
        throw new BadRequestException('最新轨迹不能为空');
      }
      const trackingDate = parseMemoryTrackingDate(item.trackingDate);
      const current = latestByShipmentId.get(shipment.id);
      if (!current || trackingDate.getTime() >= current.trackingDate.getTime()) {
        latestByShipmentId.set(shipment.id, { shipment, latestTracking: item.latestTracking.trim(), trackingDate });
      }
    }
    const updated: Shipment[] = [];
    for (const { shipment, latestTracking, trackingDate } of latestByShipmentId.values()) {
      shipment.latestTracking = latestTracking;
      shipment.latestTrackingUpdatedAt = trackingDate.toISOString();
      shipment.trackingStaleDays = 0;
      updated.push(shipment);
    }
    const after = {
      fileName: request.fileName,
      rawRowCount: request.rawRowCount ?? request.updates.length,
      successCount: updated.length,
      successRowCount: request.updates.length,
      failedRowCount: request.failedRowCount ?? 0,
      unmatchedCount: request.unmatchedOrderNos?.length ?? 0,
      affectedShipmentCount: updated.length
    };
    this.audit('tracking.manual_import', 'shipments/tracking-events/import', principal, null, after);
    void (async () => {
      const importBusinessId = request.fileName?.trim() || `tracking-import-${Date.now()}`;
      const rawId = await this.lineage?.recordEvent('tracking.manual_import.raw_file', {
        actorUsername: principal.username,
        businessId: importBusinessId,
        rawPayload: {
          fileName: request.fileName,
          rawRowCount: request.rawRowCount ?? request.updates.length,
          failedRowCount: request.failedRowCount ?? 0,
          unmatchedOrderNos: request.unmatchedOrderNos ?? [],
          updates: request.updates
        },
        metrics: {
          rawRowCount: request.rawRowCount ?? request.updates.length,
          updateRowCount: request.updates.length,
          failedRowCount: request.failedRowCount ?? 0,
          unmatchedCount: request.unmatchedOrderNos?.length ?? 0
        }
      });
      const sourceRefs = [
        ...(rawId ? [{ nodeType: 'raw_record', id: String(rawId) }] : []),
        ...updated.map((shipment) => ({ nodeType: 'shipment', id: shipment.id }))
      ];
      await this.lineage?.recordEvent('tracking.manual_import.complete', {
        actorUsername: principal.username,
        businessId: importBusinessId,
        payload: {
          ...after,
          shipmentIds: updated.map((shipment) => shipment.id),
          systemOrderNos: updated.map((shipment) => shipment.systemOrderNo)
        },
        sourceRefs,
        metrics: after
      });
      await Promise.all(updated.map((shipment) => this.lineage?.recordEvent('tracking.latest.add_event', {
        actorUsername: principal.username,
        businessId: `${shipment.id}:${shipment.latestTrackingUpdatedAt ?? importBusinessId}`,
        payload: {
          source: 'manual_import',
          shipmentId: shipment.id,
          systemOrderNo: shipment.systemOrderNo,
          status: shipment.latestTracking,
          happenedAt: shipment.latestTrackingUpdatedAt,
          trackingStaleDays: shipment.trackingStaleDays
        },
        sourceRefs: [{ nodeType: 'shipment', id: shipment.id }, ...(rawId ? [{ nodeType: 'raw_record', id: String(rawId) }] : [])],
        metrics: { trackingStaleDays: shipment.trackingStaleDays }
      })));
    })();
    return {
      updated,
      importedCount: updated.length,
      importedRowCount: request.updates.length,
      failedRowCount: after.failedRowCount,
      unmatchedCount: after.unmatchedCount,
      affectedShipmentCount: updated.length
    };
  }

  async deleteShipment(principal: Principal, shipmentId: string): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    this.deletedShipmentIds.add(shipment.id);
    void this.lineage?.recordEvent('orders.management.delete_restore', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        action: 'delete',
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        status: shipment.status
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { deleted: 1 }
    });
    return shipment;
  }

  async getCarrierTasks(principal: Principal): Promise<CarrierTaskSummary[]> {
    const canViewErrors = await this.hasPermission(principal.role, 'tracking:carrier-task:error-view');
    return this.carrierTasks
      .filter((task) => {
        const shipment = this.shipments.find((item) => item.id === task.shipmentId);
        return Boolean(shipment && this.canAccessShipment(principal, shipment));
      })
      .map((task) => canViewErrors ? { ...task } : { ...task, lastError: undefined });
  }

  async runCarrierTask(principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    return this.executeCarrierTask(taskId, body.fail === true, principal, 'run');
  }

  async retryCarrierTask(principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    const task = this.carrierTask(taskId);
    if (task.status !== 'FAILED') {
      throw new BadRequestException('只有失败任务可以重试');
    }
    task.status = 'PENDING';
    task.lastError = undefined;
    task.updatedAt = new Date().toISOString();
    return this.executeCarrierTask(taskId, body.fail === true, principal, 'retry');
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
    void this.lineage?.recordEvent('warehouse.queue.label', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        action: 'shipment_label_create',
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        labelId: label.id,
        labelNo,
        labelUrl: label.labelUrl,
        transferNo
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { labelCount: 1 }
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
    void this.lineage?.recordEvent('warehouse.queue.label', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        action: 'shipment_label_upload',
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        labelId: label.id,
        labelNo,
        labelUrl: label.labelUrl,
        transferNo,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { labelCount: 1, sizeBytes: input.sizeBytes }
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
    shipment.latestTrackingUpdatedAt = new Date(input.happenedAt).toISOString();
    shipment.trackingStaleDays = 0;
    void this.lineage?.recordEvent('tracking.latest.add_event', {
      actorUsername: principal.username,
      businessId: `${shipment.id}:${shipment.latestTrackingUpdatedAt}`,
      payload: {
        source: 'manual_add',
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        status: shipment.latestTracking,
        happenedAt: shipment.latestTrackingUpdatedAt,
        trackingStaleDays: shipment.trackingStaleDays
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { trackingStaleDays: shipment.trackingStaleDays }
    });
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
      tagSnapshot: input.tags?.map((tag) => tag.trim()).filter(Boolean),
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
    void this.lineage?.recordEvent('customer_service.problems.change', {
      actorUsername: principal.username,
      businessId: ticket.id,
      payload: {
        action: 'create',
        issueId: ticket.id,
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        customerOrderNo: shipment.customerOrderNo,
        originalStatus: shipment.status,
        issueType: ticket.reason,
        customerVisible: ticket.customerVisible,
        status: ticket.status,
        handledBy: principal.username,
        attachedAt: ticket.createdAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { customerVisible: ticket.customerVisible ? 1 : 0, replyCount: 0 }
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
    void this.lineage?.recordEvent('customer_service.problems.change', {
      actorUsername: principal.username,
      businessId: ticket.id,
      payload: {
        action: 'reply',
        issueId: ticket.id,
        shipmentId: ticket.shipmentId,
        systemOrderNo: ticket.systemOrderNo,
        status: ticket.status,
        handledBy: principal.username,
        message
      },
      sourceRefs: [{ nodeType: 'shipment', id: ticket.shipmentId }],
      metrics: { replyCount: ticket.replies.length }
    });
    return this.toTicketSummary(ticket);
  }

  async closeProblemTicket(principal: Principal, ticketId: string, reason?: string): Promise<ProblemTicketSummary> {
    const ticket = this.visibleTicket(principal, ticketId);
    const before = { status: ticket.status };
    ticket.status = 'CLOSED';
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = principal.username;
    ticket.closeReason = reason?.trim() || '已解决';
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
    void this.lineage?.recordEvent('customer_service.problems.change', {
      actorUsername: principal.username,
      businessId: ticket.id,
      payload: {
        action: 'close',
        issueId: ticket.id,
        shipmentId: ticket.shipmentId,
        systemOrderNo: ticket.systemOrderNo,
        statusFrom: before.status,
        statusTo: ticket.status,
        originalStatusPool: shipment?.status,
        handledBy: principal.username,
        closedAt: ticket.closedAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: ticket.shipmentId }],
      metrics: { closed: 1, remainingOpenTickets: shipment?.hasProblemTicket ? 1 : 0 }
    });
    return this.toTicketSummary(ticket);
  }

  async assistProblemTicket(principal: Principal, ticketId: string, reason: string): Promise<ProblemTicketSummary> {
    const ticket = this.visibleTicket(principal, ticketId);
    if (ticket.status === 'CLOSED') throw new BadRequestException('已关闭问题件不能请求协助');
    const trimmed = reason.trim();
    if (!trimmed) throw new BadRequestException('请填写协助说明');
    const before = { status: ticket.status };
    ticket.status = 'ASSISTANCE_REQUIRED';
    (ticket as any).assistanceReason = trimmed;
    (ticket as any).assistanceRequestedAt = new Date().toISOString();
    this.audit('problem.ticket.assist', ticket.id, principal, before, { status: ticket.status, assistanceReason: trimmed });
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
    const missing = (['business', 'agent'] as const).filter((kind) => !this.isCustomerServiceDataApproved(shipmentId, kind)).map((kind) => `${kind}_data`);
    if (missing.length === 0) return;
    this.audit('workflow.guard_denied', shipmentId, principal, null, { guard: 'transferNo.requires_data_approval', missing });
    throw new BadRequestException('业务数据和代理数据均确认后才能填写转单号');
  }

  private ensureCustomerServiceDataEditable(principal: Principal, shipment: Shipment, kind: 'business' | 'agent') {
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) throw new ForbiddenException('只有客服或管理员可以维护数据确认');
    if (shipment.status !== 'OUTBOUNDED') throw new BadRequestException('订单已进入后续流程，不能修改数据确认');
    if (this.isCustomerServiceDataApproved(shipment.id, kind)) throw new BadRequestException(`${kind === 'business' ? '业务' : '代理'}数据已审核，请先反审核`);
  }

  private validateCustomerServiceData(body: { packageCount: number; weightKg: number; volumeCbm: number; chargeWeightKg: number }) {
    if (!Number.isInteger(Number(body.packageCount)) || Number(body.packageCount) <= 0 || ![body.weightKg, body.volumeCbm, body.chargeWeightKg].every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) {
      throw new BadRequestException('件数、总量、体积和计费重必须为大于 0 的有效值');
    }
  }

  private syncCustomerServiceCostWeight(shipmentId: string, type: 'BUSINESS_COST' | 'PAYABLE', chargeWeightKg: number) {
    const rows = this.shipmentFinanceItems.filter((item) => item.shipmentId === shipmentId && item.type === type && !item.voided);
    if (rows.some((item) => item.locked || item.reconciliationStatus === 'CONFIRMED')) throw new BadRequestException(`${type === 'BUSINESS_COST' ? '业务成本' : '应付成本'}已锁定，不能修改计费重`);
    rows.forEach((item) => {
      item.chargeWeightKg = chargeWeightKg;
      if (item.unitPrice && !item.amountOverridden) item.amount = roundMoney(chargeWeightKg * item.unitPrice);
      item.updatedAt = new Date().toISOString();
    });
  }

  private isCustomerServiceDataApproved(shipmentId: string, kind: 'business' | 'agent') {
    const prefix = `customer_service.${kind}_data.`;
    const latest = this.auditLogs.filter((row) => row.target === shipmentId && (row.action === `${prefix}approved` || row.action === `${prefix}reversed`)).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
    return latest?.action === `${prefix}approved`;
  }

  private async reverseCustomerServiceData(principal: Principal, shipmentId: string, kind: 'business' | 'agent', reason?: string): Promise<Shipment> {
    const shipment = this.visibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) throw new ForbiddenException('只有客服或管理员可以反审核数据确认');
    if (!reason?.trim()) throw new BadRequestException('反审核必须填写原因');
    if (shipment.status !== 'OUTBOUNDED' || shipment.transferNo) throw new BadRequestException('订单已进入后续流程，不能反审核');
    if (!this.isCustomerServiceDataApproved(shipmentId, kind)) throw new BadRequestException(`${kind === 'business' ? '业务' : '代理'}数据尚未审核`);
    this.audit(`customer_service.${kind}_data.reversed`, shipmentId, principal, null, { status: shipment.status, reason: reason.trim(), reviewedBy: principal.username, reviewedAt: new Date().toISOString() });
    return shipment;
  }

  private async ensureFinanceItemManageAccess(principal: Principal, type?: ShipmentFinanceItemType, shipment?: Shipment) {
    if (principal.role === 'ADMIN') return;
    if (shipment?.status === 'WAITING_SORT'
      && ['PAYABLE', 'BUSINESS_COST'].includes(type ?? '')
      && await this.hasPermission(principal.role, 'market:pending-routing:update')) return;
    if (!type && await this.hasPermission(principal.role, 'finance:receivable:update')) return;
    if (type === 'PAYABLE' && await this.hasAnyPermission(principal.role, ['finance:order-fee:payable:manage', 'finance:payable:manage'])) return;
    if (type === 'BUSINESS_COST' && await this.hasPermission(principal.role, 'finance:business-cost:manage')) return;
    if (type === 'RECEIVABLE' && await this.hasPermission(principal.role, 'finance:receivable:update')) return;
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
    return ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(principal.role);
  }

  private canUseSensitiveOrderEntryPayables(principal: Principal) {
    return ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(principal.role);
  }

  private redactOrderEntrySensitiveShipment(principal: Principal, shipment: Shipment): Shipment {
    if (this.canUseSensitiveOrderEntryPayables(principal)) return shipment;
    const visibleShipment = { ...shipment } as Shipment;
    delete (visibleShipment as any).agentId;
    delete (visibleShipment as any).agentName;
    delete (visibleShipment as any).paymentAmountUsd;
    delete (visibleShipment as any).paymentAmountCny;
    delete (visibleShipment as any).paymentMethod;
    return visibleShipment;
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
    if (packages.some((pkg) => pkg?.measurementStatus === 'PENDING_REMEASURE')) {
      throw new BadRequestException('理货后包裹待重新过机，完成测量后才能录单');
    }
    if (packages.some((pkg) => pkg && (pkg.shipmentId || pkg.systemOrderNo) && pkg.shipmentId !== currentShipmentId)) {
      throw new BadRequestException('选中的仓库包裹已绑定运单，请重新选择待录单包裹');
    }
    return packages.filter((pkg): pkg is WarehousePackageSummary => Boolean(pkg));
  }

  private calculateOrderEntryPackageTotals(packages: WarehousePackageSummary[], channel?: ChannelSummary) {
    const summary = packages.reduce(
      (total, pkg) => {
        const packageCount = Math.max(1, Number(pkg.packageCount) || 1);
        return {
          packageCount: total.packageCount + packageCount,
          // 仓库记录为单件实重；方数已经是该记录全部件数的总方数。
          weightKg: total.weightKg + Math.max(0, Number(pkg.weightKg) || 0) * packageCount,
          cbm: total.cbm + Math.max(0, Number(pkg.totalCbm ?? pkg.cbm) || 0),
          chargeWeightKg: total.chargeWeightKg + pkg.chargeableWeightKg
        };
      },
      { packageCount: 0, weightKg: 0, cbm: 0, chargeWeightKg: 0 }
    );
    return {
      packageCount: summary.packageCount || packages.length,
      weightKg: Number(summary.weightKg.toFixed(2)),
      cbm: Number(summary.cbm.toFixed(6)),
      chargeWeightKg: channel
        ? calculateCompanyChannelChargeWeight(channel, packages)
        : Number((summary.chargeWeightKg || summary.weightKg).toFixed(2))
    };
  }

  private calculateOrderEntryCargoTotals(
    packages: WarehousePackageSummary[],
    channel: ChannelSummary | undefined,
    shipment: OrderEntryCreateInput['shipment']
  ) {
    const automatic = this.calculateOrderEntryPackageTotals(packages, channel);
    const isWarehouseAutoMatched = packages.length > 0 && shipment.cargoDataSource === 'AUTO_MATCHED';
    const hasManualCargo = shipment.cargoDataSource === 'MANUAL_ADJUSTED'
      || (!isWarehouseAutoMatched && (
        shipment.packageCount !== undefined
        || shipment.actualWeightKg !== undefined
        || shipment.volumeCbm !== undefined
        || shipment.chargeableWeightKg !== undefined
      ));
    if (!hasManualCargo) return automatic;
    const packageCount = Math.max(0, Number(shipment.packageCount ?? automatic.packageCount));
    const weightKg = Math.max(0, Number(shipment.actualWeightKg ?? automatic.weightKg));
    const cbm = Math.max(0, Number(shipment.volumeCbm ?? automatic.cbm));
    const calculated = channel
      ? calculateCompanyChannelChargeWeightFromCargo(channel, { packageCount, actualWeightKg: weightKg, volumeCbm: cbm })
      : Math.max(weightKg, cbm * 200);
    return {
      packageCount,
      weightKg: Number(weightKg.toFixed(2)),
      cbm: Number(cbm.toFixed(6)),
      chargeWeightKg: Number((shipment.chargeWeightOverridden ? Number(shipment.chargeableWeightKg ?? 0) : calculated).toFixed(2))
    };
  }

  private resolveOrderEntryCompanyChannel(input: OrderEntryCreateInput, required = false) {
    const requested = input.shipment.channelId?.trim() || input.shipment.receivingChannel?.trim();
    const channel = input.shipment.channelId?.trim()
      ? this.channels.find((item) => item.id === input.shipment.channelId?.trim())
      : this.channels.find((item) => item.name === input.shipment.receivingChannel?.trim());
    if (requested && !channel) throw new BadRequestException('公司渠道不存在，请从基础资料库重新选择');
    if (channel && !channel.enabled && required) throw new BadRequestException('所选公司渠道已停用，请重新选择启用渠道');
    if (required && !channel) throw new BadRequestException('提交审核前必须选择公司渠道');
    return channel;
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

  async ensureOrderEntryInputAccess(principal: Principal, input: OrderEntryCreateInput, currentShipmentId?: string) {
    this.ensureOrderEntryAccess(principal);
    if (currentShipmentId) {
      const shipment = this.getShipmentById(currentShipmentId);
      if (!this.visibleReviewShipments(principal).some((item) => item.id === shipment.id)) {
        throw new NotFoundException('录单草稿不存在');
      }
      if (!['DRAFT', 'REVIEW_REJECTED'].includes(shipment.status)) {
        throw new BadRequestException('只有草稿或退回修改的录单可以继续编辑');
      }
    }
    const customer = input.shipment.customerId ? this.customers.find((item) => item.id === input.shipment.customerId) : this.findCustomerByCode(input.shipment.customerCode);
    if (!customer) {
      throw new BadRequestException('客户不存在，请先维护客户资料');
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope && (!customer.salesperson || !scope.includes(customer.salesperson))) {
      throw new ForbiddenException('业务员只能录入自己名下客户');
    }
    const rawPayables = input.payables ?? [];
    if (!this.canUseSensitiveOrderEntryPayables(principal) && (
      input.shipment.agentId?.trim()
      || rawPayables.some((row) => row.agentName?.trim() || row.paymentNo?.trim())
      || this.normalizeOrderEntryFinanceItems('BUSINESS_COST', input.businessCosts).some((row) => row.agentName?.trim())
    )) {
      throw new ForbiddenException('当前角色不能录入代理或付款敏感信息');
    }
    const payables = this.normalizeOrderEntryFinanceItems('PAYABLE', rawPayables);
    if (!this.canViewOrderEntryPayables(principal) && payables.length) {
      throw new ForbiddenException('当前角色不能录入应付费用');
    }
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
    if (!this.canUseSensitiveOrderEntryPayables(principal) && (
      input.shipment.agentId?.trim()
      || rawPayables.some((row) => row.agentName?.trim() || row.paymentNo?.trim())
      || businessCosts.some((row) => row.agentName?.trim())
    )) {
      throw new ForbiddenException('当前角色不能录入代理或付款敏感信息');
    }
    const payables = this.normalizeOrderEntryFinanceItems('PAYABLE', rawPayables);
    if (!this.canViewOrderEntryPayables(principal) && payables.length) {
      throw new ForbiddenException('当前角色不能录入应付费用');
    }
    const channel = this.resolveOrderEntryCompanyChannel(input, input.submitForReview);
    if (!input.submitForReview) return;
    if (!input.shipment.customerOrderNo?.trim()) throw new BadRequestException('提交审核前必须填写客户单号');
    if (!(input.shipment.outboundOrderNo?.trim() || input.shipment.systemOrderNo?.trim())) throw new BadRequestException('提交审核前必须填写出货单号');
    if (!input.shipment.destinationCountry?.trim()) throw new BadRequestException('提交审核前必须填写目的地');
    if (input.shipment.declarationRequired === undefined || input.shipment.declarationRequired === null) throw new BadRequestException('提交审核前必须选择是否报关');
    if (!input.shipment.cargoType?.trim()) throw new BadRequestException('提交审核前必须填写货物属性');
    if (!input.shipment.productName?.trim()) throw new BadRequestException('提交审核前必须填写品名');
    if (!input.shipment.settlementMethod?.trim()) throw new BadRequestException('提交审核前必须填写结算方式');
    const hasManualCargo = input.shipment.cargoDataSource === 'MANUAL_ADJUSTED'
      || input.shipment.packageCount !== undefined
      || input.shipment.actualWeightKg !== undefined
      || input.shipment.volumeCbm !== undefined
      || input.shipment.chargeableWeightKg !== undefined;
    if (!input.warehousePackageIds?.length && !hasManualCargo) throw new BadRequestException('提交审核前请匹配仓库货物或填写货物数据');
    const totals = this.calculateOrderEntryCargoTotals(this.getOrderEntryPackages(input.warehousePackageIds), channel, input.shipment);
    if (totals.chargeWeightKg <= 0) throw new BadRequestException('提交审核前必须有计费重');
    this.getShipmentFinanceDetailUsdToRmbRate([...receivables, ...businessCosts, ...payables]);
    if (!receivables.length) throw new BadRequestException('提交审核前必须录入至少一条应收费用');
    if (!businessCosts.length) throw new BadRequestException('提交审核前必须录入至少一条业务成本');
  }

  private replaceOrderEntryFinanceItems(principal: Principal, shipmentId: string, input: OrderEntryCreateInput) {
    const channel = this.resolveOrderEntryCompanyChannel(input, false);
    const chargeWeightKg = channel
      ? this.calculateOrderEntryCargoTotals(this.getOrderEntryPackages(input.warehousePackageIds, shipmentId), channel, input.shipment).chargeWeightKg
      : undefined;
    const rows = [
      ...this.normalizeOrderEntryFinanceItems('RECEIVABLE', input.receivables),
      ...this.normalizeOrderEntryFinanceItems('BUSINESS_COST', input.businessCosts),
      ...(this.canViewOrderEntryPayables(principal) ? this.normalizeOrderEntryFinanceItems('PAYABLE', input.payables ?? []) : [])
    ].map((row) => {
      const unitPrice = Number(row.unitPrice ?? 0);
      return chargeWeightKg
        ? { ...row, chargeWeightKg, ...(unitPrice > 0 && !row.amountOverridden ? { amount: roundMoney(chargeWeightKg * unitPrice), amountOverridden: false } : {}) }
        : row;
    });
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
      item.receiptMatchSource = 'MANUAL';
      item.receiptMatchHint = undefined;
      receipt.matches.push({ id: `wrm-${receipt.matches.length + 1}`, waterReceiptId: receipt.id, receivableFinanceItemId: item.id, shipmentId: item.shipmentId, systemOrderNo: input.shipment.outboundOrderNo?.trim() || input.shipment.systemOrderNo || '', customerCode: receipt.customerCode ?? '', feeName: item.name, amount, source: 'MANUAL', createdAt: new Date().toISOString() });
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
    const systemOrderNoNeedle = query.outboundOrderNo ?? query.systemOrderNo;
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
        && keyword(row.systemOrderNo, systemOrderNoNeedle)
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

  private calculateReviewPendingReceivableRmbTotal(rows: Array<{ amount: number; currency?: string }>) {
    const usdRate = this.getShipmentFinanceDetailUsdToRmbRate(rows);
    return roundMoney(rows.reduce((sum, row) => sum + this.toShipmentFinanceDetailRmbAmount(row.amount, row.currency ?? 'RMB', usdRate), 0));
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
      outboundOrderNo: shipment.systemOrderNo,
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
      receiptMatchSource: item.receiptMatchSource,
      receiptMatchHint: item.receiptMatchHint,
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
    const systemOrderNo = input.outboundOrderNo?.trim() || input.systemOrderNo?.trim();
    const shipment = this.shipments.find((row) => {
      if (input.shipmentId && row.id !== input.shipmentId) return false;
      if (systemOrderNo && row.systemOrderNo !== systemOrderNo) return false;
      if (input.customerOrderNo && row.customerOrderNo !== input.customerOrderNo) return false;
      if (input.transferNo && row.transferNo !== input.transferNo) return false;
      if (input.customerCode && row.customerName.split('-')[0] !== input.customerCode) return false;
      return Boolean(input.shipmentId || systemOrderNo || input.customerOrderNo || input.transferNo || input.customerCode);
    });
    if (!shipment) {
      throw new NotFoundException('未匹配到出货单号，请检查出货单号、转单号或客户编号');
    }
    return shipment;
  }

  private findShipmentForBusinessCostAudit(input: {
    shipmentId?: string;
    outboundOrderNo?: string;
    systemOrderNo?: string;
    customerOrderNo?: string;
    transferNo?: string;
    customerCode?: string;
  }) {
    const systemOrderNo = input.outboundOrderNo?.trim() || input.systemOrderNo?.trim();
    const shipment = this.shipments.find((row) => {
      if (input.shipmentId && row.id !== input.shipmentId) return false;
      if (systemOrderNo && row.systemOrderNo !== systemOrderNo) return false;
      if (input.customerOrderNo && row.customerOrderNo !== input.customerOrderNo) return false;
      if (input.transferNo && row.transferNo !== input.transferNo) return false;
      if (input.customerCode && row.customerName.split('-')[0] !== input.customerCode) return false;
      return Boolean(input.shipmentId || systemOrderNo || input.customerOrderNo || input.transferNo || input.customerCode);
    });
    if (!shipment) {
      throw new NotFoundException('未匹配到出货单号，请检查出货单号、转单号或客户编号');
    }
    return shipment;
  }

  private async ensureBusinessCostPermission(principal: Principal, permission: PermissionKey) {
    if (!(await this.hasPermission(principal.role, permission))) {
      throw new ForbiddenException('没有业务员成本权限');
    }
  }

  private async ensurePayablePermission(principal: Principal, permission: PermissionKey) {
    const mapped = ({
      'finance:payable:payment': 'finance:pending-payment:read',
      'finance:payable:attachment': 'finance:agent-bill:import',
      'finance:payable:paid-read': 'finance:paid-payment:read',
      'finance:payable:paid-confirm': 'finance:paid-payment:confirm',
      'finance:payable:paid-reverse': 'finance:paid-payment:reverse',
      'finance:payable:paid-export': 'finance:paid-payment:export',
      'finance:payable:paid-voucher': 'finance:paid-payment:voucher-upload'
    } as Partial<Record<PermissionKey, PermissionKey>>)[permission];
    if (!(await this.hasPermission(principal.role, permission)) && !(mapped && await this.hasPermission(principal.role, mapped))) {
      throw new ForbiddenException('没有市场应付审核权限');
    }
  }

  private async ensureWaterReceiptPermission(principal: Principal, permission: PermissionKey) {
    const mapped = ({
      'finance:water-receipt:manage': 'finance:water-receipt:update',
      'finance:water-receipt:match': 'finance:water-match:create',
      'finance:water-receipt:voucher': 'finance:water-receipt:voucher-upload'
    } as Partial<Record<PermissionKey, PermissionKey>>)[permission];
    if (!(await this.hasPermission(principal.role, permission)) && !(mapped && await this.hasPermission(principal.role, mapped))) {
      throw new ForbiddenException('当前角色没有水单权限');
    }
  }

  private async ensureWaterReceiptVoucherAccess(principal: Principal, row: Pick<WaterReceiptSummary, 'salesperson'>) {
    if (await this.hasPermission(principal.role, 'finance:water-receipt:voucher')) return;
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
    const scope = this.operatorCustomerScope(principal);
    if (!scope || !row.salesperson || !scope.includes(row.salesperson)) {
      throw new ForbiddenException('只能维护本人客户的水单凭证');
    }
  }

  private findCustomerForWaterReceipt(customerId?: string, customerCode?: string) {
    if (!customerId && !customerCode) return undefined;
    const customer = this.customers.find((row) => (customerId ? row.id === customerId : true) && (customerCode ? row.code === customerCode : true));
    if (!customer) throw new BadRequestException('客户不存在');
    return customer;
  }

  private nextMemoryWaterReceiptNo(now = new Date()) {
    const ymd = this.waterReceiptDateKey(now);
    const prefix = `SD${ymd}`;
    const pattern = new RegExp(`^${prefix}(\\d{3})$`);
    const maxSeq = this.waterReceipts.reduce((max, row) => {
      const seq = row.receiptNo.match(pattern)?.[1];
      return seq ? Math.max(max, Number(seq)) : max;
    }, 0);
    if (maxSeq >= 999) throw new BadRequestException('水单编号生成失败，请重试');
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  }

  private waterReceiptDateKey(date: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date).replaceAll('-', '');
  }

  private findWaterReceiptById(id: string) {
    const row = this.waterReceipts.find((item) => item.id === id || item.receiptNo === id);
    if (!row) throw new NotFoundException('水单不存在');
    return row;
  }

  private requireUniqueWaterReceiptPaymentNo(value: string | undefined, currentId?: string) {
    const paymentNo = sanitizeManualPaymentNo(value);
    if (!paymentNo) throw new BadRequestException('付款编号不能为空');
    const duplicate = this.waterReceipts.find((row) => row.id !== currentId && sanitizeManualPaymentNo(row.paymentNo) === paymentNo);
    if (duplicate) throw new BadRequestException('付款编号已存在，不能重复录入');
    return paymentNo;
  }

  private redactWaterReceiptVoucher(row: WaterReceiptSummary, canViewVoucher: boolean): WaterReceiptSummary {
    if (canViewVoucher || !row.voucher) return row;
    return { ...row, voucher: undefined };
  }

  private toWaterReceiptVoucherAuditSnapshot(row: WaterReceiptSummary, voucher: WaterReceiptVoucherSummary, before?: WaterReceiptVoucherSummary) {
    return {
      waterReceiptId: row.id,
      receiptNo: row.receiptNo,
      voucherId: voucher.id,
      fileName: voucher.fileName,
      sizeBytes: voucher.sizeBytes,
      mimeType: voucher.mimeType,
      uploadedBy: voucher.uploadedBy,
      uploadedAt: voucher.createdAt,
      previousVoucherId: before?.id,
      previousFileName: before?.fileName
    };
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
    const systemOrderNoNeedle = query.outboundOrderNo ?? query.systemOrderNo;
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
        && keyword(row.systemOrderNo, systemOrderNoNeedle)
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
    const systemOrderNoNeedle = query.outboundOrderNo ?? query.systemOrderNo;
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
        && keyword(row.systemOrderNo, systemOrderNoNeedle)
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
      outboundOrderNo: shipment.systemOrderNo,
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
    const systemOrderNoNeedle = query.outboundOrderNo ?? query.systemOrderNo;
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
        && keyword(row.systemOrderNo, systemOrderNoNeedle)
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
      outboundOrderNo: shipment?.systemOrderNo,
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
      bankAccountNo: this.maskBankAccountNo(row.bankAccount?.bankAccountNo, false),
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
      outboundOrderNo: payment.items.length === 1 ? first?.systemOrderNo : `${first?.systemOrderNo ?? '-'} 等${payment.items.length}票`,
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
      payeeBankAccountNo: this.maskBankAccountNo(row.payeeBankAccount?.bankAccountNo, false),
      payerBankName: row.payerBankName,
      payerBankAccountName: row.payerBankAccountName,
      payerBankAccountNo: this.maskBankAccountNo(row.payerBankAccountNo, false),
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
    const systemOrderNoNeedle = query.outboundOrderNo ?? query.systemOrderNo;
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
        && keyword(row.systemOrderNo, systemOrderNoNeedle)
        && keyword(row.feeName, query.feeName)
        && keyword(row.remark, query.remark)
        && keyword(row.payeeBankAccount?.accountName, query.payeeName)
        && keyword(row.payeeBankAccount?.bankAccountNo, query.bankAccountNo)
        && keyword(row.payerBankName, query.payerBank)
        && (query.amount === undefined || row.totalAmount === Number(query.amount))
        && dateInRange(row.date, query.applicationDateFrom, query.applicationDateTo)
        && dateInRange(row.paidAt, query.paidDateFrom, query.paidDateTo);
    });
    const sortBy = query.sortBy ?? 'date';
    const sortOrder = query.sortOrder ?? 'desc';
    filtered.sort((left, right) => {
      const valueOf = (row: PaidPaymentSummary) => {
        if (sortBy === 'amount') return row.totalAmount;
        if (sortBy === 'currency') return row.currency;
        if (sortBy === 'agentName') return row.agentName;
        if (sortBy === 'systemOrderNo') return row.systemOrderNo ?? '';
        if (sortBy === 'customerCode') return row.customerCode ?? '';
        if (sortBy === 'paidAt') return row.paidAt ?? '';
        return row.date;
      };
      const result = valueOf(left) > valueOf(right) ? 1 : valueOf(left) < valueOf(right) ? -1 : 0;
      return sortOrder === 'asc' ? result : -result;
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
      outboundOrderNo: shipment.systemOrderNo,
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
      outboundOrderNo: shipment.systemOrderNo,
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
      outboundOrderNo: shipment.systemOrderNo,
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
      ipAddress: readInMemoryAuditIpAddress(after),
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
      return activeShipments.filter((shipment) => this.isShipmentInSalesScope(shipment, scope));
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

  private withWarehouseDispatchArchiveFields(shipment: Shipment): Shipment {
    const dispatchLog = [...this.auditLogs]
      .reverse()
      .find((row) => row.action === 'shipment.dispatch' && row.target === shipment.id);
    if (!dispatchLog) {
      return shipment;
    }
    const after = dispatchLog.after as {
      handoverNo?: string;
      outboundBy?: string;
      batchDispatchSource?: string;
      outboundAt?: string;
    } | undefined;
    return {
      ...shipment,
      handoverNo: after?.handoverNo ?? shipment.handoverNo,
      outboundBy: after?.outboundBy ?? shipment.outboundBy,
      batchDispatchSource: after?.batchDispatchSource ?? shipment.batchDispatchSource,
      outboundAt: shipment.outboundAt ?? after?.outboundAt
    };
  }

  private maskShipmentListFields(principal: Principal, shipment: Shipment, marketVisibility = { canViewMarketAgent: false, canViewMarketCosts: false, exposeWarehouseRouting: false }): Shipment {
    const { paymentAmountUsd, paymentAmountCny, paymentMethod, ...visible } = shipment;
    const safeVisible = { ...visible };
    if (this.operatorCustomerScope(principal) && principal.role !== 'UG_MARKET') {
      safeVisible.agentName = '';
      safeVisible.channelName = '';
      safeVisible.routeAgentChannelName = '';
    }
    if (!marketVisibility.canViewMarketAgent && !marketVisibility.exposeWarehouseRouting) {
      safeVisible.agentName = '';
      safeVisible.routeAgentChannelName = '';
    }
    if (!marketVisibility.canViewMarketCosts) {
      delete safeVisible.routeChargeWeightKg;
      delete safeVisible.routeUnitPrice;
      delete safeVisible.routeOtherFee;
      delete safeVisible.routeCostTotal;
      delete safeVisible.routeCurrency;
    }
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
    if (principal.role === 'UG_MARKET' || !isSalesScopedRole(principal.role)) {
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

  private resolveCustomerSalespersonAssignment(principal: Principal, requested: string | undefined, current?: string) {
    const scope = this.operatorCustomerScope(principal);
    if (scope) return principal.username;
    if (requested === undefined) return current;
    const username = requested.trim();
    if (!username) return undefined;
    const account = this.accounts.find((item) => item.username === username);
    if (!account || account.enabled === false || !isSalesScopedRole(account.role)) {
      throw new BadRequestException('业务员归属必须选择启用状态的业务员账号');
    }
    return account.username;
  }

  private resolveWarehousePackageOwner(customerCode: string) {
    const customer = this.customers.find((item) => item.code === customerCode && item.enabled);
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

  private executeCarrierTask(taskId: string, fail: boolean, principal: Principal, action: 'run' | 'retry'): CarrierTaskRunResponse {
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
      void this.lineage?.recordEvent('tracking.tasks.run', {
        actorUsername: principal.username,
        businessId: task.id,
        payload: {
          action,
          taskId: task.id,
          shipmentId: shipment.id,
          systemOrderNo: shipment.systemOrderNo,
          carrier: task.carrier,
          transferNo: task.transferNo,
          statusTo: task.status,
          attempts: task.attempts,
          lastError: task.lastError,
          operatedAt: now
        },
        sourceRefs: [{ nodeType: 'shipment', id: shipment.id }, { nodeType: 'carrier_tracking_task', id: task.id }],
        metrics: { attempts: task.attempts, failed: 1, success: 0 }
      });
      return { task, shipment };
    }

    const trackingStatus = createMockTrackingStatus(task.carrier, task.transferNo);
    task.status = 'SUCCESS';
    task.lastError = undefined;
    task.completedAt = now;
    shipment.latestTracking = trackingStatus;
    shipment.trackingStaleDays = 0;
    void this.lineage?.recordEvent('tracking.tasks.run', {
      actorUsername: principal.username,
      businessId: task.id,
      payload: {
        action,
        taskId: task.id,
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        carrier: task.carrier,
        transferNo: task.transferNo,
        statusTo: task.status,
        attempts: task.attempts,
        completedAt: task.completedAt,
        trackingStatus
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }, { nodeType: 'carrier_tracking_task', id: task.id }],
      metrics: { attempts: task.attempts, failed: 0, success: 1 }
    });
    void this.lineage?.recordEvent('tracking.latest.add_event', {
      actorUsername: principal.username,
      businessId: `${shipment.id}:${now}`,
      payload: {
        source: 'carrier_task',
        taskId: task.id,
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        carrier: task.carrier,
        transferNo: task.transferNo,
        status: trackingStatus,
        happenedAt: now,
        trackingStaleDays: shipment.trackingStaleDays
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }, { nodeType: 'carrier_tracking_task', id: task.id }],
      metrics: { trackingStaleDays: shipment.trackingStaleDays }
    });
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
      outboundOrderNo: fee.systemOrderNo,
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
      receivedAmount: fee.receivedAmount ?? 0,
      receiptStatus: fee.receiptStatus ?? 'UNPAID',
      receivedAt: fee.receivedAt,
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

  private agentIdentityValues(agent: Pick<AgentSummary, 'id' | 'name' | 'shortName' | 'code'>) {
    return Array.from(new Set([agent.id, agent.name, agent.shortName, agent.code].map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
  }

  private agentBankMatches(bank: { agentId?: string; agentName?: string }, ids: Set<string>, names: Set<string>) {
    return Boolean((bank.agentId && ids.has(bank.agentId)) || (bank.agentName && names.has(bank.agentName)));
  }

  private agentDeleteReferenceReasons(agent: AgentSummary): string[] {
    const names = new Set(this.agentIdentityValues(agent));
    const bankIds = new Set([
      ...this.agentBankAccounts.filter((bank) => this.agentBankMatches(bank, new Set([agent.id]), names)).map((bank) => bank.id),
      ...this.payeeBankAccounts.filter((bank) => this.agentBankMatches(bank, new Set([agent.id]), names)).map((bank) => bank.id)
    ]);
    const reasons: string[] = [];
    if (this.shipments.some((shipment) => shipment.agentId === agent.id || names.has(shipment.agentName))) reasons.push('运单引用');
    if (this.priceBooks.some((book) => !book.deleted && (book.agentId === agent.id || (!book.agentId && book.agentShortName && names.has(book.agentShortName))))) reasons.push('价格表引用');
    if (this.priceBookImportJobs.some((job) => ['PENDING', 'IMPORTING'].includes(job.status)
      && (job.agentId === agent.id || (!job.agentId && job.agentShortName && names.has(job.agentShortName))))) {
      reasons.push('进行中的价格表导入任务引用');
    }
    if (this.shipmentFinanceItems.some((item) => item.agentName && names.has(item.agentName))) reasons.push('应付/业务成本引用');
    if (this.payablePaymentApplications.some((item) => (item.agentBankAccountId && bankIds.has(item.agentBankAccountId)) || (item.payeeBankAccountId && bankIds.has(item.payeeBankAccountId)))) reasons.push('待付款记录引用');
    if (this.paymentApplications.some((item) => names.has(item.agentName) || (item.payeeBankAccountId && bankIds.has(item.payeeBankAccountId)))) reasons.push('付款申请引用');
    if (this.paymentVouchers.some((item) => (item.agentName && names.has(item.agentName)) || (item.extraFeeAgentName && names.has(item.extraFeeAgentName)))) reasons.push('付款水单引用');
    return reasons;
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
    // Controller-level fine-grained permissions decide the concrete pricing
    // action. Keep this repository guard only as the customer boundary so a
    // custom role granted one specific pricing action is not rejected because
    // it is not the historical UG_MARKET role.
    this.ensureStaffPricingAccess(principal);
    void message;
  }

  private ensureWarehouseAccess(principal: Principal) {
    if (!['ADMIN', 'WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role)) {
      throw new ForbiddenException('没有仓库管理权限');
    }
  }

  private normalizePriceBookRow(priceBookId: string, row: PriceBookImportInput['rows'][number], index: number): StoredPriceBookRow {
    const hasKgPrice = Number.isFinite(row.costPerKg) && Number(row.costPerKg) > 0;
    const hasCbmPrice = Number.isFinite(row.cbmPrice) && Number(row.cbmPrice) > 0;
    if (!row.agentName?.trim() || !row.channelName?.trim() || !row.destinationCountry?.trim() || !Number.isFinite(row.minWeightKg) || !Number.isFinite(row.maxWeightKg) || row.maxWeightKg <= row.minWeightKg || (!hasKgPrice && !hasCbmPrice)) {
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
      transportMode: row.transportMode,
      cargoType: row.cargoType,
      warehouseCode: row.warehouseCode?.trim() || undefined,
      destinationCountry: row.destinationCountry.trim(),
      postalRule: row.postalRule?.trim() || undefined,
      minWeightKg: roundPricingWeightBoundary(row.minWeightKg),
      maxWeightKg: roundPricingWeightBoundary(row.maxWeightKg),
      costPerKg: hasKgPrice ? roundMoney(row.costPerKg) : roundMoney(Number(row.cbmPrice)),
      cbmPrice: hasCbmPrice ? roundMoney(Number(row.cbmPrice)) : undefined,
      priceTierLabel: row.priceTierLabel?.trim() || undefined,
      densityDiscountRules: row.densityDiscountRules,
      currency: row.currency?.trim().toUpperCase() || 'RMB',
      transitDays: row.transitDays,
      transitLabel: sanitizePricingTransitLabel(row.transitLabel) ?? undefined,
      quoteSourceType: row.quoteSourceType ?? 'local',
      surchargeFee: typeof row.surchargeFee === 'number' ? roundMoney(row.surchargeFee) : undefined,
      surchargeDetails: row.surchargeDetails ?? [],
      productSurchargeRemark: row.productSurchargeRemark?.trim() || undefined,
      specialRemark: row.specialRemark?.trim() || undefined,
      productCategory: row.productCategory?.trim() || undefined,
      region: row.region?.trim() || undefined,
      serviceContent: row.serviceContent?.trim() || undefined,
      inboundRequirement: row.inboundRequirement?.trim() || undefined,
      channelCode: row.channelCode?.trim() || undefined
    };
  }

  private toPriceBookSummary(book: StoredPriceBook): PriceBookSummary {
    const rows = this.priceBookRows.filter((row) => row.priceBookId === book.id);
    return {
      id: book.id,
      fileName: book.fileName,
      agentId: book.agentId,
      agentShortName: book.agentShortName,
      rowCount: book.rowCount,
      importedAt: book.importedAt,
      customRemark: book.remark,
      remark: book.remark,
      targetModule: book.targetModule,
      parserRuleVersion: book.parserRuleVersion,
      refreshStatus: book.refreshStatus,
      lastRuleRefreshAt: book.lastRuleRefreshAt,
      legacyModuleCounts: book.targetModule ? buildSingleLegacyModuleCounts(book.targetModule, rows.length) : buildInMemoryLegacyModuleCounts(rows)
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

  private nextWarehouseTallyTaskNo(customerCode: string): string {
    return nextWarehouseTallyTaskNo(customerCode, this.warehouseTallyTasks.map((task) => task.taskNo));
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

function sanitizeManualPaymentNo(value?: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  const cleaned = String(value).replace(/[\u0000-\u001f\u007f\u200b-\u200d\ufeff<>]/g, '').trim();
  if (!cleaned) return undefined;
  if (cleaned.length > 80) throw new BadRequestException('付款编号不能超过 80 个字符');
  return cleaned;
}

function buildWarehousePackageSummary(id: string, input: WarehousePackageCreateInput): WarehousePackageSummary {
  const parsedCombinedOrderNo = parseWarehouseCombinedOrderNo(input.combinedOrderNo);
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
    measurementStatus: 'MEASURED',
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
    packageIds: [...task.packageIds],
    outputPackages: task.outputPackages?.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }))
  };
}

function matchesMemoryWarehouseTallyScope(task: WarehouseTallyTaskSummary, query: WarehouseTallyTaskListQuery) {
  if (!query.completedScope && !query.completedFrom && !query.completedTo) return true;
  if (task.status !== 'COMPLETED' || !task.completedAt) return false;
  const completedAt = new Date(task.completedAt);
  if (query.completedScope === 'RECENT' && completedAt < resolveWarehouseTallyRecentCutoff()) return false;
  if (query.completedScope === 'HISTORY' && completedAt >= resolveWarehouseTallyRecentCutoff()) return false;
  if (query.completedFrom && completedAt < new Date(query.completedFrom)) return false;
  if (query.completedTo && completedAt >= new Date(query.completedTo)) return false;
  return true;
}

function roundPricingWeightBoundary(value: number) {
  return Math.round(value * 1000) / 1000;
}

function calculateMemoryWarehouseGirth(lengthCm: number, widthCm: number, heightCm: number): number {
  const sides = [lengthCm, widthCm, heightCm].sort((left, right) => right - left);
  return roundMoney((sides[0] ?? 0) + 2 * ((sides[1] ?? 0) + (sides[2] ?? 0)));
}

function summarizeWarehousePackageGroups(packages: WarehousePackageSummary[]): WarehousePackageGroupSummary[] {
  const groups = new Map<string, WarehousePackageSummary[]>();
  for (const pkg of packages) {
    const key = `${pkg.customerOrderNo}__${pkg.domesticTrackingNo}`;
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
  priceBooks: Array<Pick<PriceBookSummary, 'id' | 'fileName' | 'remark' | 'agentShortName'> & { deleted?: boolean }>,
  persistedMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules
): PriceLookupResponse {
  const destinationCountry = input.destinationCountry?.trim();
  const chargeableWeightKg = calculateLookupChargeableWeight(input);
  const warehouseProfile = createWarehouseLookupProfile(input);
  const effectivePriceRows = withOpenEndedHighestPriceTiers(priceRows);
  if ((!destinationCountry && !warehouseProfile.code) || !Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) {
    throw new BadRequestException('目的地和计费重不能为空');
  }

  const priceBookRemarkMap = new Map(priceBooks.filter((book) => !book.deleted).map((book) => [book.id, book.remark?.trim() || undefined]));
  const priceBookFileNameMap = new Map(priceBooks.filter((book) => !book.deleted).map((book) => [book.id, book.fileName]));
  const priceBookAgentNameMap = new Map(priceBooks.filter((book) => !book.deleted).map((book) => [book.id, book.agentShortName?.trim() || undefined]));
  const markupRules = buildSyncedAgentMarkupRules(persistedMarkupRules, buildPriceBookAgentSourcesFromRows(effectivePriceRows, priceBookFileNameMap, priceBookAgentNameMap)).filter((rule) => !('deletedAt' in rule) || !rule.deletedAt);
  const markupRuleIndex = buildMarkupRuleIndex(markupRules);
  const matchedPrices = selectPriceRowsForLookup(effectivePriceRows, warehouseProfile, destinationCountry, chargeableWeightKg, input.weightBand, input.volumeCbm);
  if (!matchedPrices.length) {
    throw new BadRequestException('没有匹配的代理成本价');
  }

  const canViewInternalPricing = canViewPricingInternalRoute(principal.role);
  const recommendations = matchedPrices
    .map<PriceLookupRecommendation | null>((price) => {
      const priceBookAgentName = priceBookAgentNameMap.get(price.priceBookId) ?? price.agentName;
      const markupCandidates = [
        ...(markupRuleIndex.get(markupRuleIndexKey(priceBookAgentName, price.priceBookId)) ?? []),
        ...(markupRuleIndex.get(markupRuleIndexKey(priceBookAgentName)) ?? [])
      ];
      const cbmPrice = Number(price.cbmPrice ?? 0);
      const volumeCbm = Number(input.volumeCbm ?? 0);
      const quoteMode = cbmPrice > 0 && volumeCbm > 0 && (!input.weightBand || normalizeAmazonCbmTier(input.weightBand)) ? 'cbm' : 'kg';
      const costUnitPrice = quoteMode === 'cbm' ? cbmPrice : price.costPerKg;
      const costQuantity = quoteMode === 'cbm' ? volumeCbm : chargeableWeightKg;
      const markup = findBestMarkupRule(markupCandidates, price, priceBookAgentName, { unit: quoteMode === 'cbm' ? 'CBM' : 'KG', value: costQuantity });
      if (!markup) return null;
      const quoteTotals = applyAgentMarkup(costUnitPrice, costQuantity, markup);
      const salesRatePerKg = quoteTotals.salesRatePerKg;
      const totalCost = roundMoney(costUnitPrice * costQuantity);
      const totalSales = quoteTotals.totalSales;
      const surchargeFee = roundMoney(price.surchargeFee ?? 0);
      const realChannelName = price.realChannelName?.trim() || price.channelName.trim();
      const businessRouteName = price.businessRouteName?.trim() || undefined;
      const publicCode = publicPricingRouteCode(price.channelName, realChannelName, businessRouteName);
      const requirementAgentNames = [priceBookAgentName, price.agentName];
      const productSurchargeRemark = sanitizePricingChannelRequirement(price.productSurchargeRemark, requirementAgentNames);
      const specialRemark = sanitizePricingChannelRequirement(price.specialRemark, requirementAgentNames);
      const visiblePriceRow = { ...price, productSurchargeRemark, specialRemark };
      const visiblePrice = canViewInternalPricing ? visiblePriceRow : omitInternalPriceFields(maskPriceRouteForBusiness(visiblePriceRow, publicCode));
      const customRemark = price.priceBookId
        ? priceBookRemarkMap.get(price.priceBookId)?.trim() || undefined
        : undefined;
      return {
        price: visiblePrice,
        ...(canViewInternalPricing ? { markup, calculation: buildPricingCalculationBreakdown(price, markup, quoteMode === 'cbm' ? 'CBM' : 'KG', costQuantity, costUnitPrice, quoteTotals) } : {}),
        channelName: canViewInternalPricing ? price.channelName : publicCode,
        carrierName: price.carrierName?.trim() || inferBackendPriceCarrierName(price),
        agentName: canViewInternalPricing ? priceBookAgentName : publicCode,
        realChannelName: canViewInternalPricing ? realChannelName : publicCode,
        isRouteMapped: Boolean(businessRouteName),
        quoteSourceType: price.quoteSourceType ?? 'local',
        weightSegmentLabel: normalizeAmazonCbmTier(input.weightBand)
          ?? (input.amazonCode ? normalizeAmazonWeightBand(price.priceTierLabel) ?? inferAmazonWeightBandFromMin(price.minWeightKg) ?? normalizeAmazonWeightBand(input.weightBand) : undefined)
          ?? price.priceTierLabel
          ?? `${price.minWeightKg}-${price.maxWeightKg}kg`,
        salesRatePerKg,
        freightFee: totalSales,
        surchargeFee,
        totalFee: roundMoney(totalSales + surchargeFee),
        freightUnitPrice: salesRatePerKg,
        totalUnitPrice: roundMoney((totalSales + surchargeFee) / chargeableWeightKg),
        ...(canViewInternalPricing ? { totalCost, grossProfit: roundMoney(totalSales - totalCost) } : {}),
        totalSales,
        transitLabel: sanitizePricingTransitLabel(price.transitLabel) ?? '时效待确认',
        surchargeDetails: price.surchargeDetails ?? [],
        ...(productSurchargeRemark ? { productSurchargeRemark } : {}),
        ...(specialRemark ? { specialRemark } : {}),
        ...(businessRouteName ? { businessRouteName: canViewInternalPricing ? businessRouteName : publicCode } : {}),
        ...(customRemark ? { customRemark } : {})
      };
    })
    .filter((recommendation): recommendation is PriceLookupRecommendation => Boolean(recommendation));

  if (!recommendations.length) {
    throw new BadRequestException('没有启用的代理加价规则');
  }

  const responseRecommendations = recommendations.slice(0, PRICING_LOOKUP_RESPONSE_LIMIT);
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
    recommendations: responseRecommendations,
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
  return {
    ...price,
    priceBookId: '',
    costPerKg: undefined,
    sourceSheetName: undefined,
    lineMarkupPerKg: undefined,
    markupSource: undefined
  };
}

interface PricingFieldVisibility {
  internalSource: boolean;
  cost: boolean;
  grossProfit: boolean;
  markupBreakdown: boolean;
  postalRule: boolean;
}

function redactLegacyPricingResponse(response: LegacyPricingQuoteResponse, visibility: PricingFieldVisibility): LegacyPricingQuoteResponse {
  const redact = (item: LegacyPricingRecommendation): LegacyPricingRecommendation => {
    const { sourceId, sourceFile, origin, raw, costUnitPrice, costTotal, grossProfit, markup, calculation, postalRule, ...safe } = item;
    return {
      ...safe,
      ...(visibility.internalSource ? { sourceId, sourceFile, origin, raw } : {}),
      ...(visibility.cost ? { costUnitPrice, costTotal } : {}),
      ...(visibility.grossProfit ? { grossProfit } : {}),
      ...(visibility.markupBreakdown ? { markup } : {}),
      ...(visibility.cost && visibility.markupBreakdown ? { calculation } : {}),
      ...(visibility.postalRule ? { postalRule } : {})
    };
  };
  const recommendations = response.recommendations.map(redact);
  const byId = new Map(recommendations.map((item) => [item.id, item]));
  return {
    ...response,
    recommendations,
    cheapestRecommendations: response.cheapestRecommendations.map((item) => byId.get(item.id) ?? redact(item)),
    fastestRecommendations: response.fastestRecommendations.map((item) => byId.get(item.id) ?? redact(item)),
    selected: response.selected ? byId.get(response.selected.id) ?? redact(response.selected) : undefined,
    metrics: {
      ...response.metrics,
      sources: visibility.internalSource ? response.metrics.sources : 0
    }
  };
}

function redactPriceBookRows(rows: PriceBookRowSummary[], visibility: PricingFieldVisibility): PriceBookRowSummary[] {
  return rows.map((row) => {
    const { agentName, sourceSheetName, realChannelName, businessRouteName, priceBookId, costPerKg, cbmPrice, surchargeFee, surchargeDetails, postalRule, lineMarkupPerKg, markupSource, ...safe } = row;
    return {
      ...safe,
      ...(visibility.internalSource ? { agentName, sourceSheetName, realChannelName, businessRouteName, priceBookId } : {}),
      ...(visibility.cost ? { costPerKg, cbmPrice, surchargeFee, surchargeDetails } : {}),
      ...(visibility.postalRule ? { postalRule } : {}),
      ...(visibility.markupBreakdown ? { lineMarkupPerKg, markupSource } : {})
    } as PriceBookRowSummary;
  });
}

function canViewPricingInternalRoute(role: string): boolean {
  return role === 'ADMIN' || role === 'UG_MARKET';
}

function publicPricingRouteCode(...values: Array<string | undefined>): string {
  for (const value of values) {
    const displayName = extractChinesePricingRouteName(value);
    if (displayName) return displayName;
  }
  return '可报价线路';
}

type LegacyCargoProfileInput = Pick<LegacyPricingQuoteRequest, 'productName' | 'packageInfo' | 'lengthCm' | 'widthCm' | 'heightCm' | 'packageCount' | 'volumeCbm' | 'unitActualWeightKg' | 'actualWeightKg' | 'chargeableWeightKg'>;

type LargeCargoProfile = {
  isLargeCargo: boolean;
  reasons: string[];
};

function numericInput(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function createLargeCargoProfile(input: LegacyCargoProfileInput): LargeCargoProfile {
  const reasons: string[] = [];
  const lengthCm = numericInput(input.lengthCm);
  const widthCm = numericInput(input.widthCm);
  const heightCm = numericInput(input.heightCm);
  if (lengthCm > 180) reasons.push(`长度 ${roundMoney(lengthCm)}cm 超过 180cm`);
  if (widthCm > 80) reasons.push(`宽度 ${roundMoney(widthCm)}cm 超过 80cm`);
  if (heightCm > 80) reasons.push(`高度 ${roundMoney(heightCm)}cm 超过 80cm`);
  if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
    const singleVolumeCbm = (lengthCm * widthCm * heightCm) / 1_000_000;
    if (singleVolumeCbm > 0.15) {
      reasons.push(`单件体积 ${singleVolumeCbm.toFixed(3)}CBM 超过 0.15CBM`);
    }
  }
  const cargoText = `${input.productName ?? ''} ${input.packageInfo ?? ''}`;
  if (/大件|超大件|家具|桌|椅|沙发|床|木箱|木架|托盘|卡板|打托/i.test(cargoText)) {
    reasons.push('品名/包装包含大件关键词');
  }
  return { isLargeCargo: reasons.length > 0, reasons };
}

function largeCargoRedirectMessage(profile: LargeCargoProfile): string {
  return `${profile.reasons.join('、') || '当前货物属于大件/超大件'}，应走欧洲超大件综合查询`;
}

function priceRowCargoCapabilityText(row: PriceBookRowSummary): string {
  const extra = row as PriceBookRowSummary & { remark?: string; raw?: unknown };
  return [
    row.channelName,
    row.realChannelName,
    row.businessRouteName,
    row.sourceSheetName,
    extra.remark,
    row.productSurchargeRemark,
    row.specialRemark,
    JSON.stringify(extra.raw ?? {})
  ].filter(Boolean).join(' ');
}

function priceRowSupportsLargeCargo(row: PriceBookRowSummary): boolean {
  const routeText = [
    row.channelName,
    row.realChannelName,
    row.businessRouteName,
    row.sourceSheetName
  ].filter(Boolean).join(' ');
  const positive = /卡派|卡航|卡车|海卡|超大件|大件|托盘|卡板|打托|木箱|木架|尾板|truck|oversize/i;
  if (positive.test(routeText)) return true;
  const fullText = priceRowCargoCapabilityText(row);
  if (/(不收|不接|不接受|不可接|拒收|不承接).{0,12}(超大件|大件|托盘|卡板|打托|木箱|木架)/.test(fullText)) {
    return false;
  }
  return positive.test(fullText);
}

function filterPriceRowsByCargoProfile(rows: PriceBookRowSummary[], module: LegacyPricingModule, profile: LargeCargoProfile): PriceBookRowSummary[] {
  if (module === 'southAfrica') return rows;
  if (module === 'europeExpress') {
    const chihanTruckRows = rows.filter(isChihanEuropeTruckRow);
    if (profile.isLargeCargo) {
      if (chihanTruckRows.length) return chihanTruckRows;
      throw new BadRequestException(largeCargoRedirectMessage(profile));
    }
    return rows.filter((row) => !priceRowSupportsLargeCargo(row) || isChihanEuropeTruckRow(row));
  }
  if ((module === 'inquiry' || module === 'amazon') && profile.isLargeCargo) {
    return rows.filter((row) => priceRowSupportsLargeCargo(row));
  }
  return rows;
}

function isChihanEuropeTruckRow(row: Pick<PriceBookRowSummary, 'agentName' | 'channelName' | 'realChannelName' | 'businessRouteName' | 'sourceSheetName'>) {
  const routeText = [row.channelName, row.realChannelName, row.businessRouteName, row.sourceSheetName].filter(Boolean).join(' ');
  return /驰汉|CCH/i.test(row.agentName) && /卡车.*海运双清/.test(routeText);
}

function priceRowTaxInclusionMatches(row: Pick<PriceBookRowSummary, 'channelName' | 'realChannelName' | 'businessRouteName'>, taxInclusion?: 'INCLUDED' | 'EXCLUDED') {
  if (!taxInclusion) return true;
  const routeText = [row.channelName, row.realChannelName, row.businessRouteName].filter(Boolean).join(' ');
  if (taxInclusion === 'INCLUDED') return /(?:包税|含税)/.test(routeText) && !/(?:不包税|不含税|未包税)/.test(routeText);
  return /(?:不包税|不含税|未包税)/.test(routeText);
}

function extractChinesePricingRouteName(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  const cleaned = text
    .replace(/[A-Za-z0-9_]+/g, '')
    .replace(/[－–—]/g, '-')
    .replace(/[^\u3400-\u9FFF\s\-、，,（）()]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[-\s,，、]+|[-\s,，、]+$/g, '')
    .trim();
  return /[\u3400-\u9FFF]/.test(cleaned) ? cleaned : undefined;
}

function createInMemoryEuropeExpressUnitQuote(
  principal: Principal,
  input: LegacyPricingQuoteRequest,
  priceRows: PriceBookRowSummary[],
  priceBooks: Array<Pick<PriceBookSummary, 'id' | 'fileName' | 'remark' | 'agentShortName'> & { deleted?: boolean }>,
  persistedMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules
): LegacyPricingQuoteResponse {
  const destinationCountry = input.destinationCountry?.trim();
  const activeBooks = priceBooks.filter((book) => !book.deleted);
  const priceBookRemarkMap = new Map(activeBooks.map((book) => [book.id, book.remark?.trim() || undefined]));
  const priceBookFileNameMap = new Map(activeBooks.map((book) => [book.id, book.fileName]));
  const priceBookAgentNameMap = new Map(activeBooks.map((book) => [book.id, book.agentShortName?.trim() || undefined]));
  const markupRules = buildSyncedAgentMarkupRules(
    persistedMarkupRules,
    buildPriceBookAgentSourcesFromRows(priceRows, priceBookFileNameMap, priceBookAgentNameMap)
  ).filter((rule) => !rule.deletedAt && rule.enabled);
  const markupRuleIndex = buildMarkupRuleIndex(markupRules);
  const canViewInternalPricing = canViewPricingInternalRoute(principal.role);
  const recommendations = priceRows
    .filter((row) => !input.agentName || row.agentName === input.agentName)
    .filter((row) => !destinationCountry || row.destinationCountry === destinationCountry)
    .filter((row) => inMemoryEuropeTransportMatches(row, input.channel))
    .filter((row) => priceRowTaxInclusionMatches(row, input.taxInclusion))
    .filter((row) => Number(row.cbmPrice ?? 0) <= 0)
    .filter((row) => Number.isFinite(row.costPerKg) && row.costPerKg > 0)
    .map((row): LegacyPricingRecommendation | null => {
      const priceBookAgentName = priceBookAgentNameMap.get(row.priceBookId) ?? row.agentName;
      const markupCandidates = [
        ...(markupRuleIndex.get(markupRuleIndexKey(priceBookAgentName, row.priceBookId)) ?? []),
        ...(markupRuleIndex.get(markupRuleIndexKey(priceBookAgentName)) ?? [])
      ];
      const markup = findBestMarkupRule(markupCandidates, row, priceBookAgentName);
      if (!markup) return null;
      const markupResult = applyAgentMarkup(row.costPerKg, 1, markup);
      const displayRow = normalizePricingImportRowForModule({
        channelName: row.channelName,
        realChannelName: row.realChannelName,
        businessRouteName: row.businessRouteName,
        sourceSheetName: row.sourceSheetName,
        transitLabel: row.transitLabel,
        specialRemark: row.specialRemark,
        productSurchargeRemark: row.productSurchargeRemark
      }, 'europeExpress');
      const realChannelName = displayRow.realChannelName?.trim() || displayRow.channelName;
      const publicCode = publicPricingRouteCode(displayRow.channelName, realChannelName, row.businessRouteName);
      const requirementAgentNames = [priceBookAgentName, row.agentName];
      const productSurchargeRemark = sanitizePricingChannelRequirement(row.productSurchargeRemark, requirementAgentNames);
      const specialRemark = sanitizePricingChannelRequirement(row.specialRemark, requirementAgentNames);
      const customRemark = row.priceBookId
        ? priceBookRemarkMap.get(row.priceBookId)?.trim() || undefined
        : undefined;
      return {
        id: row.id,
        module: 'europeExpress',
        ...(canViewInternalPricing ? { sourceId: row.priceBookId } : {}),
        agentName: canViewInternalPricing ? priceBookAgentName : publicCode,
        origin: canViewInternalPricing ? row.sourceSheetName : undefined,
        channelName: canViewInternalPricing ? displayRow.channelName : publicCode,
        serviceName: canViewInternalPricing ? row.businessRouteName : publicCode,
        destinationCountry: row.destinationCountry,
        weightSegmentLabel: `${row.minWeightKg}-${row.maxWeightKg}kg`,
        quoteMode: 'kg',
        ...(canViewInternalPricing ? { costUnitPrice: row.costPerKg } : {}),
        salesUnitPrice: markupResult.salesRatePerKg,
        ...(canViewInternalPricing ? { costTotal: row.costPerKg } : {}),
        salesTotal: markupResult.totalSales,
        ...(canViewInternalPricing ? { grossProfit: roundMoney(markupResult.totalSales - row.costPerKg), markup, calculation: buildPricingCalculationBreakdown(row, markup, 'KG', 1, row.costPerKg, markupResult) } : {}),
        chargeableWeightKg: 0,
        transitLabel: sanitizePricingTransitLabel(displayRow.transitLabel) ?? '时效待确认',
        productSurchargeRemark,
        specialRemark,
        ...(customRemark ? { customRemark } : {})
      };
    })
    .filter((row): row is LegacyPricingRecommendation => Boolean(row))
    .sort((left, right) => left.salesUnitPrice - right.salesUnitPrice || left.salesTotal - right.salesTotal);
  const responseRecommendations = recommendations.slice(0, PRICING_LOOKUP_RESPONSE_LIMIT);
  return {
    module: 'europeExpress',
    query: input,
    recommendations: responseRecommendations,
    cheapestRecommendations: recommendations.slice(0, 3),
    fastestRecommendations: recommendations.filter((item) => /\d/.test(item.transitLabel ?? '')).slice(0, 3),
    selected: recommendations[0],
    agentErrors: [],
    metrics: {
      matchedRows: recommendations.length,
      agents: new Set(recommendations.map((row) => row.agentName)).size,
      channels: new Set(recommendations.map((row) => row.channelName)).size,
      sources: new Set(recommendations.map((row) => row.sourceId).filter(Boolean)).size
    }
  };
}

function inMemoryEuropeTransportMatches(row: PriceBookRowSummary, channel?: string) {
  const mode = inferEuropeTransportMode(row);
  if (mode === 'UNCLASSIFIED') return false;
  const requested = normalizeEuropeTransportModeFilter(channel);
  return !requested || mode === requested;
}

function inMemoryInquiryTransportMatches(row: PriceBookRowSummary, channel?: string) {
  const mode = isEuropeTransportMode(row.transportMode) ? row.transportMode : inferEuropeTransportMode(row);
  const requested = normalizeEuropeTransportModeFilter(channel);
  return mode !== 'UNCLASSIFIED' && (!requested || mode === requested);
}

function inMemoryInquiryCargoMatches(row: PriceBookRowSummary, input: Pick<LegacyPricingQuoteRequest, 'cargoType' | 'productName' | 'packageInfo'>) {
  const cargoType = row.cargoType ?? inferEuropeOversizeCargoType(row);
  const requested = input.cargoType === 'BATTERY'
    ? 'BATTERY'
    : input.cargoType === 'GENERAL'
      ? 'GENERAL'
      : undefined;
  return !requested || cargoType === requested;
}

function isEuropeTransportMode(value: unknown): value is 'AIR' | 'SEA' | 'RAIL' | 'SEA_RAIL' {
  return value === 'AIR' || value === 'SEA' || value === 'RAIL' || value === 'SEA_RAIL';
}

function selectInMemoryUsPostalPriceRows(rows: PriceBookRowSummary[], postalCode?: string) {
  const zip = normalizeUsPostalCode(postalCode);
  if (!zip) {
    throw new BadRequestException('美国邮编格式错误，请输入五位 ZIP Code 或 ZIP+4');
  }
  const rowsWithPostalRule = rows.filter((row) => Boolean(row.postalRule?.trim()));
  if (!rowsWithPostalRule.length) {
    throw new BadRequestException('当前美国价格表未解析邮编分区，无法按邮编报价，请重新导入含邮编段的价格表');
  }
  const matches = rowsWithPostalRule
    .map((row) => ({ row, match: matchUsPostalRule(row.postalRule, zip) }))
    .filter((item): item is { row: PriceBookRowSummary; match: NonNullable<ReturnType<typeof matchUsPostalRule>> } => Boolean(item.match));
  if (!matches.length) {
    throw new BadRequestException('当前美国价格表未覆盖该邮编的派送报价');
  }
  // A ZIP may validly match several agents and channels. Postal-rule
  // specificity only explains the matched range; it must never discard a
  // different matching price line.
  return matches.map((item) => ({ ...item.row, postalRule: item.match.matchedLabel }));
}

function getUsPostalRuleHealthIssues(rows: Array<Pick<PriceBookRowSummary, 'postalRule' | 'channelName' | 'businessRouteName' | 'realChannelName' | 'minWeightKg' | 'maxWeightKg'>>) {
  const issues: string[] = [];
  const postalRules = rows.map((row) => row.postalRule);
  const normalized = postalRules.map((rule) => String(rule ?? '').trim()).filter(Boolean);
  if (postalRules.some((rule) => !String(rule ?? '').trim())) issues.push('美国价格行未配置邮编范围');
  if (normalized.some((rule) => !isUsPostalRuleSyntax(rule))) issues.push('美国价格行邮编规则格式无法解析');
  if (hasScopedUsPostalRuleOverlap(rows)) issues.push('同一渠道、价格组和重量段存在邮编区间重叠');
  return issues;
}

function getWarehouseCodeRuleHealthIssues(warehouseCodes: Array<string | undefined | null>) {
  const invalidSegments = warehouseCodes.flatMap((code) =>
    isCanadaAddressScopeWarehouseCode(code)
      ? []
      : isInvalidWarehouseCodeRule(code)
      ? [String(code).replace(/^__INVALID_WAREHOUSE_RULE__:/, '')]
      : parseWarehouseCodeRules(code).invalidSegments
  );
  return Array.from(new Set(invalidSegments.map((segment) => `仓库编码规则无效：${segment}，需修正或重新导入`)));
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

function uniqueAmazonWeightBandsFromPriceRows(rows: Array<Pick<PriceBookRowSummary, 'priceTierLabel' | 'minWeightKg' | 'cbmPrice'>>) {
  return Array.from(new Set(rows
    .filter((row) => !normalizeAmazonCbmTier(row.priceTierLabel) && Number(row.cbmPrice ?? 0) <= 0)
    .map((row) => row.priceTierLabel?.trim() || inferAmazonWeightBandFromMin(row.minWeightKg))
    .filter((label): label is string => Boolean(label))))
    .sort((left, right) => (amazonWeightBandMinimum(left) ?? 0) - (amazonWeightBandMinimum(right) ?? 0));
}

function normalizeAgentMarkupInput(input: AgentMarkupCreateInput | AgentMarkupUpdateInput | AgentMarkupSummary): AgentMarkupSummary {
  const markupType = input.markupType ?? 'WEIGHT';
  const rawValue = input.markupValue ?? input.markupPerKg ?? 0;
  const markupValue = roundMoney(Number(rawValue));
  return {
    id: 'id' in input ? input.id : '',
    legacyModule: normalizeAgentMarkupLegacyModule(input.legacyModule),
    priceBookId: input.priceBookId?.trim() || undefined,
    agentName: input.agentName?.trim() ?? '',
    channelName: input.channelName?.trim() || undefined,
    realChannelName: input.realChannelName?.trim() || undefined,
    destinationCountry: input.destinationCountry?.trim() || undefined,
    markupType,
    markupValue,
    markupPerKg: markupType === 'WEIGHT' ? markupValue : roundMoney(Number(input.markupPerKg ?? 0)),
    markupUnit: input.markupUnit,
    minChargeableValue: input.minChargeableValue === undefined ? undefined : roundMoney(Number(input.minChargeableValue)),
    maxChargeableValue: input.maxChargeableValue === undefined ? undefined : roundMoney(Number(input.maxChargeableValue)),
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
  if (rule.markupUnit) {
    if (!rule.priceBookId || !rule.channelName || !rule.destinationCountry || rule.markupType !== 'WEIGHT') throw new BadRequestException('渠道阶梯加价必须绑定价格表、真实渠道、目的地并按单位加价');
    if (!Number.isFinite(rule.minChargeableValue) || Number(rule.minChargeableValue) < 0) throw new BadRequestException('请填写有效的阶梯下限');
    if (rule.maxChargeableValue !== undefined && (!Number.isFinite(rule.maxChargeableValue) || Number(rule.maxChargeableValue) <= Number(rule.minChargeableValue))) throw new BadRequestException('阶梯上限必须大于下限');
    const matchingChannels = priceRows.filter((row) =>
      row.channelName === rule.channelName && row.priceBookId === rule.priceBookId
      && (!rule.realChannelName || (row.realChannelName?.trim() || row.channelName) === rule.realChannelName)
      && row.destinationCountry === rule.destinationCountry
    );
    if (!matchingChannels.length) throw new BadRequestException('请选择当前模块该代理已导入的真实渠道');
    const hasExpectedUnit = matchingChannels.some((row) => rule.markupUnit === 'CBM' ? Number(row.cbmPrice ?? 0) > 0 : Number(row.cbmPrice ?? 0) <= 0);
    if (!hasExpectedUnit) throw new BadRequestException(`该渠道没有可用的 ${rule.markupUnit} 报价，不能建立阶梯加价`);
    const conflict = rules.find((item) => item.id !== currentId && !item.deletedAt && item.enabled && item.markupUnit === rule.markupUnit &&
      (item.legacyModule ?? '') === (rule.legacyModule ?? '') && (item.priceBookId ?? '') === (rule.priceBookId ?? '') && item.agentName === rule.agentName && (item.channelName ?? '') === (rule.channelName ?? '') &&
      (item.realChannelName ?? item.channelName ?? '') === (rule.realChannelName ?? rule.channelName ?? '') && (item.destinationCountry ?? '') === (rule.destinationCountry ?? '') &&
      chargeableRangesOverlap(rule.minChargeableValue, rule.maxChargeableValue, item.minChargeableValue, item.maxChargeableValue));
    if (conflict) throw new BadRequestException(`阶梯区间冲突：${formatChargeableRange(conflict.minChargeableValue, conflict.maxChargeableValue, conflict.markupUnit)}`);
    return;
  }
  const conflict = rules.find((item) =>
    item.id !== currentId &&
    !item.deletedAt &&
    (item.legacyModule ?? '') === (rule.legacyModule ?? '') &&
    (item.priceBookId ?? '') === (rule.priceBookId ?? '') &&
    item.agentName === rule.agentName &&
    (item.channelName ?? '') === (rule.channelName ?? '') &&
    (item.realChannelName ?? '') === (rule.realChannelName ?? '') &&
    (item.destinationCountry ?? '') === (rule.destinationCountry ?? '') &&
    (item.priority ?? 100) === (rule.priority ?? 100)
  );
  if (conflict) throw new BadRequestException('优先级冲突，请调整规则优先级');
}

function chargeableRangesOverlap(leftMin: number | undefined, leftMax: number | undefined, rightMin: number | undefined, rightMax: number | undefined) {
  const startLeft = Number(leftMin ?? 0);
  const startRight = Number(rightMin ?? 0);
  const endLeft = leftMax === undefined ? Number.POSITIVE_INFINITY : Number(leftMax);
  const endRight = rightMax === undefined ? Number.POSITIVE_INFINITY : Number(rightMax);
  return startLeft < endRight && startRight < endLeft;
}

function formatChargeableRange(minimum?: number, maximum?: number, unit?: string) {
  const suffix = unit === 'CBM' ? 'CBM' : 'KG';
  return maximum === undefined ? `${minimum ?? 0}${suffix}+` : `${minimum ?? 0}${suffix}-${maximum}${suffix}`;
}

function findAgentMarkupRulesByScope(rules: AgentMarkupSummary[], rule: AgentMarkupSummary) {
  return rules.filter((item) =>
    !item.deletedAt &&
    (item.legacyModule ?? '') === (rule.legacyModule ?? '') &&
    (item.priceBookId ?? '') === (rule.priceBookId ?? '') &&
    item.agentName === rule.agentName &&
    (item.channelName ?? '') === (rule.channelName ?? '') &&
    (item.realChannelName ?? '') === (rule.realChannelName ?? '') &&
    (item.destinationCountry ?? '') === (rule.destinationCountry ?? '') &&
    (rule.markupUnit
      ? item.markupUnit === rule.markupUnit &&
        item.minChargeableValue === rule.minChargeableValue &&
        item.maxChargeableValue === rule.maxChargeableValue
      : (item.priority ?? 100) === (rule.priority ?? 100))
  );
}

interface ActivePriceBookAgentSource {
  agentName: string;
  priceBookId: string;
  fileName: string;
  lineCount: number;
  legacyModule?: LegacyPricingModule;
}

function buildSyncedAgentMarkupRules(rules: AgentMarkupSummary[], agentSources: Array<string | ActivePriceBookAgentSource>) {
  const next = [...rules];
  const sources = normalizeAgentSources(agentSources);
  const sourcesByScope = groupAgentSourcesByScope(sources);
  const scopedRules = new Map<string, AgentMarkupSummary>(
    rules
      .filter((rule) => !rule.deletedAt || isAgentLevelMarkupRuleScope(rule))
      .map((rule) => [agentMarkupScopeKey(rule), rule])
  );
  const agentLevelFallbackRules = new Map<string, AgentMarkupSummary>(
    rules
      .filter((rule) => !rule.deletedAt && !rule.priceBookId && isAgentLevelMarkupRuleScope(rule))
      .map((rule) => [agentMarkupScopeKey({ agentName: rule.agentName, legacyModule: rule.legacyModule }), rule])
  );
  const deletedAgentLevelRules = new Set(
    rules
      .filter((rule) => rule.deletedAt && !rule.priceBookId && isAgentLevelMarkupRuleScope(rule))
      .map((rule) => agentMarkupScopeKey({ agentName: rule.agentName, legacyModule: rule.legacyModule }))
  );
  for (const source of sources) {
    const key = agentMarkupScopeKey(source);
    const agentFallbackKey = agentMarkupScopeKey({ agentName: source.agentName, legacyModule: source.legacyModule });
    if (!source.agentName || deletedAgentLevelRules.has(agentFallbackKey) || deletedAgentLevelRules.has(agentMarkupScopeKey({ agentName: source.agentName })) || scopedRules.has(key)) {
      continue;
    }
    const fallback = agentLevelFallbackRules.get(agentFallbackKey);
    next.push({
      id: `price-agent:${source.priceBookId}:${source.agentName}`,
      legacyModule: source.legacyModule,
      priceBookId: source.priceBookId,
      agentName: source.agentName,
      markupPerKg: fallback?.markupPerKg ?? 0.5,
      markupType: fallback?.markupType ?? 'WEIGHT',
      markupValue: fallback?.markupValue ?? fallback?.markupPerKg ?? 0.5,
      priority: fallback?.priority ?? 100,
      enabled: fallback?.enabled ?? true
    });
    scopedRules.set(key, next[next.length - 1]);
  }
  return next.map((rule) => {
    const sourcePriceBooks = sourcesByScope.get(agentMarkupScopeKey(rule)) ?? [];
    const activeLineCount = sourcePriceBooks.reduce((sum, source) => sum + source.lineCount, 0);
    return {
      ...rule,
      sourcePriceBooks,
      activeLineCount,
      retainedOnly: activeLineCount === 0 && isAgentLevelMarkupRuleScope(rule)
    };
  });
}

function normalizeAgentSources(agentSources: Array<string | ActivePriceBookAgentSource>): ActivePriceBookAgentSource[] {
  return agentSources
    .map((source) => typeof source === 'string'
      ? { agentName: source, priceBookId: '', fileName: '', lineCount: 0 }
      : source)
    .filter((source) => source.agentName?.trim())
    .map((source) => ({ ...source, agentName: source.agentName.trim(), priceBookId: source.priceBookId?.trim() ?? '', fileName: source.fileName?.trim() ?? '', legacyModule: normalizeAgentMarkupLegacyModule(source.legacyModule) }));
}

function groupAgentSourcesByScope(sources: ActivePriceBookAgentSource[]) {
  const grouped = new Map<string, ActivePriceBookAgentSource[]>();
  for (const source of sources) {
    const key = agentMarkupScopeKey(source);
    const list = grouped.get(key) ?? [];
    const existing = list.find((item) => item.priceBookId === source.priceBookId && item.fileName === source.fileName);
    if (existing) {
      existing.lineCount += source.lineCount;
    } else {
      list.push({ ...source });
    }
    grouped.set(key, list);
  }
  for (const list of grouped.values()) {
    list.sort((left, right) => left.fileName.localeCompare(right.fileName, 'zh-CN') || left.priceBookId.localeCompare(right.priceBookId));
  }
  return grouped;
}

function isAgentLevelMarkupRuleForHealth(rule: AgentMarkupSummary) {
  return !rule.deletedAt && isAgentLevelMarkupRuleScope(rule);
}

function isAgentLevelMarkupRuleScope(rule: AgentMarkupSummary) {
  return !rule.channelName && !rule.realChannelName && !rule.destinationCountry;
}

function createDefaultAgentMarkupRule(agentName: string, priceBookId?: string, legacyModule?: LegacyPricingModule): AgentMarkupSummary {
  return {
    id: priceBookId ? `price-agent:${priceBookId}:${agentName}` : `price-agent:${agentName}`,
    legacyModule,
    priceBookId,
    agentName,
    markupPerKg: 0.5,
    markupType: 'WEIGHT',
    markupValue: 0.5,
    priority: 100,
    enabled: true
  };
}

function agentMarkupScopeKey(scope: Pick<AgentMarkupSummary, 'agentName' | 'priceBookId' | 'legacyModule'> | ActivePriceBookAgentSource | { agentName: string; priceBookId?: string; legacyModule?: LegacyPricingModule }) {
  return `${scope.legacyModule ?? ''}\u0001${scope.priceBookId ?? ''}\u0001${scope.agentName}`;
}

function derivePriceBookAgentName(fileName?: string) {
  const baseName = String(fileName ?? '')
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/^\s*\d+(?:\.\d+)*(?:[-_－—–\s]+)?/, '')
    .replace(/^[-_－—–\s]+/, '')
    .trim();
  return baseName || String(fileName ?? '').trim() || '未知代理';
}

function getOldOriginalAgentCleanupTarget(fileName: string | undefined, agentName: string | undefined) {
  const ownerAgentName = derivePriceBookAgentName(fileName);
  const originalAgentName = String(agentName ?? '').trim();
  if (originalAgentName === '亿阳国际' && ownerAgentName === '拓普达') return ownerAgentName;
  if (originalAgentName === '深圳振韵国际' && ownerAgentName === '振韵') return ownerAgentName;
  return undefined;
}

function cleanOldOriginalAgentNameForDisplay(fileName: string | undefined, agentName: string) {
  return getOldOriginalAgentCleanupTarget(fileName, agentName) ?? agentName;
}

function normalizeStringList(value?: string[]) {
  return Array.from(new Set((Array.isArray(value) ? value : []).map((item) => String(item ?? '').trim()).filter(Boolean)));
}

interface AgentMarkupBatchScopeInput {
  agentName?: string;
  priceBookId?: string;
  legacyModule?: LegacyPricingModule;
}

function assertAgentMarkupBatchScope(input: { ids?: string[]; agentNames?: string[]; scopes?: AgentMarkupBatchScopeInput[] }) {
  if (!normalizeStringList(input.ids).length && !normalizeStringList(input.agentNames).length && !normalizeAgentMarkupBatchScopes(input).length) {
    throw new BadRequestException('请选择要操作的加价规则');
  }
}

function matchesAgentMarkupBatchScope(rule: AgentMarkupSummary, input: { ids?: string[]; agentNames?: string[]; scopes?: AgentMarkupBatchScopeInput[] }) {
  if (rule.deletedAt) {
    return false;
  }
  const ids = normalizeStringList(input.ids);
  const agentNames = normalizeStringList(input.agentNames);
  const scopes = normalizeAgentMarkupBatchScopes(input);
  return ids.includes(rule.id)
    || agentNames.includes(rule.agentName)
    || scopes.some((scope) => agentMarkupScopeKey(scope) === agentMarkupScopeKey(rule));
}

function normalizeAgentMarkupBatchScopes(input: { agentNames?: string[]; scopes?: AgentMarkupBatchScopeInput[] }) {
  const scoped = Array.isArray(input.scopes) ? input.scopes : [];
  const fromScopes = scoped
    .map((scope) => ({
      agentName: String(scope.agentName ?? '').trim(),
      priceBookId: String(scope.priceBookId ?? '').trim() || undefined,
      legacyModule: normalizeAgentMarkupLegacyModule(scope.legacyModule)
    }))
    .filter((scope) => scope.agentName);
  const fromAgentNames = normalizeStringList(input.agentNames).map((agentName) => ({ agentName, priceBookId: undefined }));
  const unique = new Map<string, { agentName: string; priceBookId?: string; legacyModule?: LegacyPricingModule }>();
  [...fromAgentNames, ...fromScopes].forEach((scope) => unique.set(agentMarkupScopeKey(scope), scope));
  return [...unique.values()];
}

function normalizeAgentMarkupLegacyModule(value: unknown): LegacyPricingModule | undefined {
  return isLegacyPricingModule(value)
    ? value
    : undefined;
}

function normalizeAgentMarkupModuleQuery(value: unknown): LegacyPricingModule | 'unclassified' | undefined {
  if (value === 'unclassified') return 'unclassified';
  return normalizeAgentMarkupLegacyModule(value);
}

function filterAgentMarkupRulesByModule(rules: AgentMarkupSummary[], module: LegacyPricingModule | 'unclassified' | undefined, priceRows: PriceBookRowSummary[]) {
  if (!module) {
    return rules;
  }
  const priceBookIds = new Set(priceRows.map((row) => row.priceBookId).filter(Boolean));
  return rules.filter((rule) => {
    const explicitModule = normalizeAgentMarkupLegacyModule(rule.legacyModule);
    if (module === 'unclassified') {
      return !explicitModule && !rule.priceBookId;
    }
    if (explicitModule) {
      return explicitModule === module;
    }
    return Boolean(rule.priceBookId && priceBookIds.has(rule.priceBookId));
  });
}

function buildAgentMarkupListResponse(rules: AgentMarkupSummary[], priceRows: PriceBookRowSummary[], query: AgentMarkupListQuery): AgentMarkupListResponse {
  const includeHits = shouldIncludeAgentMarkupHits(query);
  const activeRows = rules.filter((rule) => !rule.deletedAt);
  const enriched = includeHits ? activeRows.map((rule) => ({ ...rule, hitCount: countAgentMarkupHits(rule, priceRows) })) : activeRows;
  const filtered = enriched
    .filter((rule) => textMatch(rule.priceBookId ?? '', query.priceBookId))
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
  const matchedRows = includeHits ? new Set(enriched.flatMap((rule) => matchingPriceRowsForRule(rule, priceRows).map((row) => row.id))) : new Set<string>();
  return {
    metrics: {
      totalRules: activeRows.length,
      enabledRules: activeRows.filter((rule) => rule.enabled).length,
      disabledRules: activeRows.filter((rule) => !rule.enabled).length,
      unmatchedQuotes: includeHits ? priceRows.filter((row) => !matchedRows.has(row.id)).length : 0,
      latestUpdatedAt: activeRows.map((rule) => rule.updatedAt).filter(Boolean).sort().at(-1)
    },
    rows,
    pagination: { page, pageSize: pageSize < 0 ? grouped.length : pageSize, totalItems: grouped.length }
  };
}

function shouldIncludeAgentMarkupHits(query: AgentMarkupListQuery) {
  return query.includeHits !== false && String(query.includeHits ?? 'true') !== 'false';
}

function groupAgentMarkupRows(rules: AgentMarkupSummary[], priceRows: PriceBookRowSummary[]) {
  const groups = new Map<string, AgentMarkupSummary[]>();
  for (const rule of rules) {
    const key = agentMarkupScopeKey(rule);
    const list = groups.get(key) ?? [];
    list.push(rule);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([, rows]) => {
    const sorted = [...rows].sort((left, right) => markupScopeRank(left) - markupScopeRank(right) || (left.priority ?? 100) - (right.priority ?? 100) || safeTime(right.updatedAt) - safeTime(left.updatedAt));
    const primary = sorted[0];
    const hitIds = new Set(rows.flatMap((rule) => matchingPriceRowsForRule(rule, priceRows).map((row) => row.id)));
    const latestUpdatedAt = rows.map((rule) => rule.updatedAt).filter(Boolean).sort().at(-1);
    const display = buildAgentMarkupDisplay(primary, rules, priceRows);
    return {
      ...primary,
      id: primary.priceBookId ? `agent:${primary.priceBookId}:${primary.agentName}` : `agent:${primary.agentName}`,
      agentName: primary.agentName,
      channelName: undefined,
      realChannelName: undefined,
      destinationCountry: undefined,
      enabled: rows.some((rule) => rule.enabled),
      ruleCount: rows.length,
      hitCount: hitIds.size,
      ...display,
      updatedAt: latestUpdatedAt ?? primary.updatedAt
    };
  });
}

function buildAgentMarkupDisplay(primary: AgentMarkupSummary, rules: AgentMarkupSummary[], priceRows: PriceBookRowSummary[]) {
  const scopeRows = priceRows.filter((row) => primary.priceBookId ? row.priceBookId === primary.priceBookId : row.agentName === primary.agentName);
  if (scopeRows.length === 0) {
    return {
      markupDisplayMode: 'RETAINED_ONLY' as const,
      defaultMarkupDisplay: '仅保留规则',
      markupRange: undefined,
      markupBuckets: []
    };
  }
  const buckets = new Map<number, number>();
  for (const row of scopeRows) {
    const resolved = resolvePriceBookRowMarkup(row, rules, primary.agentName);
    const value = roundMoney(Number(resolved.lineMarkupPerKg ?? 0.5));
    buckets.set(value, (buckets.get(value) ?? 0) + 1);
  }
  const markupBuckets = [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([markupPerKg, lineCount]) => ({ markupPerKg, lineCount }));
  if (markupBuckets.length <= 1) {
    const value = markupBuckets[0]?.markupPerKg ?? primary.markupPerKg;
    return {
      markupDisplayMode: 'UNIFORM' as const,
      defaultMarkupDisplay: formatMarkupPerKg(value),
      markupRange: formatMarkupPerKg(value),
      markupBuckets
    };
  }
  const min = markupBuckets[0].markupPerKg;
  const max = markupBuckets[markupBuckets.length - 1].markupPerKg;
  return {
    markupDisplayMode: 'MIXED' as const,
    defaultMarkupDisplay: '混合加价',
    markupRange: `+¥${formatMarkupNumber(min)}-${formatMarkupNumber(max)}/kg`,
    markupBuckets
  };
}

function enrichPriceBookRowMarkup(row: PriceBookRowSummary, markupRules: AgentMarkupSummary[], ownerAgentName: string): PriceBookRowSummary {
  return { ...row, ...resolvePriceBookRowMarkup(row, markupRules, ownerAgentName) };
}

function resolvePriceBookRowMarkup(row: PriceBookRowSummary, markupRules: AgentMarkupSummary[], ownerAgentName: string): Pick<PriceBookRowSummary, 'lineMarkupPerKg' | 'markupSource'> {
  const rule = findBestPriceBookRouteMarkupRule(markupRules, row)
    ?? findBestMarkupRule(markupRules, row, ownerAgentName)
    ?? (row.agentName !== ownerAgentName ? findBestMarkupRule(markupRules, row, row.agentName) : undefined)
  const lineMarkupPerKg = rule?.markupValue ?? rule?.markupPerKg ?? 0.5;
  if (!rule || rule.id.startsWith('price-agent:')) {
    return { lineMarkupPerKg, markupSource: 'VIRTUAL_DEFAULT' };
  }
  if (rule.channelName || rule.realChannelName || rule.destinationCountry) {
    return { lineMarkupPerKg, markupSource: 'LINE_CUSTOM' };
  }
  return { lineMarkupPerKg, markupSource: 'AGENT_DEFAULT' };
}

function buildDubaiPriceTableResponse(rows: PriceBookRowSummary[], markupRules: AgentMarkupSummary[]): DubaiPriceTableResponse {
  const tableRows = rows
    .filter((row) => Number(row.costPerKg ?? row.cbmPrice ?? 0) > 0)
    .map((row): DubaiPriceTableRow => {
      const mode = inferDubaiPriceMode(row);
      const baseUnitPrice = mode === 'SEA' ? Number(row.cbmPrice ?? row.costPerKg) : Number(row.costPerKg);
      const markup = Number(resolvePriceBookRowMarkup(row, markupRules, row.agentName).lineMarkupPerKg ?? 0.5);
      const channelRequirement = uniqueDubaiText([row.productSurchargeRemark, row.specialRemark]);
      return {
        id: row.id,
        mode,
        productCategory: mode === 'AIR' ? row.productCategory ?? row.realChannelName ?? row.channelName : undefined,
        region: mode === 'AIR' ? row.region ?? row.destinationCountry : undefined,
        serviceContent: mode === 'SEA' ? row.serviceContent ?? row.realChannelName ?? row.channelName : undefined,
        priceTierLabel: formatDubaiPriceTier(row, mode),
        businessUnitPrice: roundMoney(baseUnitPrice + markup),
        unit: mode === 'SEA' ? 'RMB/CBM' : 'RMB/KG',
        inboundRequirement: row.inboundRequirement,
        channelCode: row.channelCode,
        transitLabel: sanitizePricingTransitLabel(row.transitLabel),
        channelRequirement
      };
    })
    .sort((left, right) =>
      left.mode.localeCompare(right.mode)
      || (left.productCategory ?? left.serviceContent ?? '').localeCompare(right.productCategory ?? right.serviceContent ?? '', 'zh-CN')
      || (left.region ?? '').localeCompare(right.region ?? '', 'zh-CN')
      || left.priceTierLabel.localeCompare(right.priceTierLabel, 'zh-CN')
    );
  return {
    air: tableRows.filter((row) => row.mode === 'AIR'),
    sea: tableRows.filter((row) => row.mode === 'SEA'),
    generatedAt: new Date().toISOString()
  };
}

function inferDubaiPriceMode(row: PriceBookRowSummary): DubaiPriceTableRow['mode'] {
  if (Number(row.cbmPrice ?? 0) > 0 || /CBM|方/.test(row.priceTierLabel ?? '')) return 'SEA';
  const text = [
    row.channelCode,
    row.sourceSheetName,
    row.channelName,
    row.realChannelName,
    row.businessRouteName,
    row.serviceContent,
    row.productCategory
  ].filter(Boolean).join(' ');
  if (/AH\s*海运|海运|海派|SEA/i.test(text)) return 'SEA';
  return 'AIR';
}

function formatDubaiPriceTier(row: PriceBookRowSummary, mode: DubaiPriceTableRow['mode']) {
  if (mode === 'SEA') {
    return row.priceTierLabel && !/KG/i.test(row.priceTierLabel) ? row.priceTierLabel : '按方';
  }
  if (row.priceTierLabel) return row.priceTierLabel;
  if (row.maxWeightKg >= 99999) return `${row.minWeightKg}KG+`;
  return `${row.minWeightKg}-${row.maxWeightKg}KG`;
}

function uniqueDubaiText(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const parts = values
    .flatMap((value) => String(value ?? '').split('\n'))
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  return parts.length ? parts.join('\n') : undefined;
}

function findBestPriceBookRouteMarkupRule(markupRules: AgentMarkupSummary[], row: PriceBookRowSummary): AgentMarkupSummary | undefined {
  const destination = row.destinationCountry.trim();
  const channel = row.channelName.trim();
  const realChannel = row.realChannelName?.trim() || channel;
  return [...markupRules]
    .filter((rule) => rule.enabled && !rule.deletedAt && rule.priceBookId === row.priceBookId && Boolean(rule.channelName || rule.realChannelName || rule.destinationCountry))
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

function formatMarkupNumber(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function formatMarkupPerKg(value: number) {
  return `+¥${formatMarkupNumber(value)}/kg`;
}

function applyPriceBookRowMarkupControls(rows: PriceBookRowSummary[], query: PriceBookRowsQuery) {
  const amount = String(query.markupAmount ?? 'ALL').trim();
  const source = String(query.markupSource ?? 'ALL').trim();
  const sort = String(query.markupSort ?? 'NONE').trim();
  let next = rows.filter((row) => {
    const rowMarkup = roundMoney(Number(row.lineMarkupPerKg ?? 0.5));
    if (source !== 'ALL' && row.markupSource !== source) {
      return false;
    }
    if (!amount || amount === 'ALL') {
      return true;
    }
    if (amount === 'DEFAULT') {
      return row.markupSource === 'AGENT_DEFAULT' || row.markupSource === 'VIRTUAL_DEFAULT';
    }
    if (amount === 'OTHER_CUSTOM') {
      return row.markupSource === 'LINE_CUSTOM';
    }
    const expected = Number(amount);
    return Number.isFinite(expected) && rowMarkup === roundMoney(expected);
  });
  if (sort === 'ASC' || sort === 'DESC') {
    const factor = sort === 'ASC' ? 1 : -1;
    next = [...next].sort((left, right) =>
      factor * (roundMoney(Number(left.lineMarkupPerKg ?? 0.5)) - roundMoney(Number(right.lineMarkupPerKg ?? 0.5))) ||
      left.channelName.localeCompare(right.channelName, 'zh-CN') ||
      left.destinationCountry.localeCompare(right.destinationCountry, 'zh-CN') ||
      left.minWeightKg - right.minWeightKg
    );
  }
  return next;
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
    (rule.priceBookId ? row.priceBookId === rule.priceBookId : row.agentName === rule.agentName) &&
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

function findBestMarkupRule(markupRules: AgentMarkupSummary[], price: PriceBookRowSummary, ownerAgentName = price.agentName, chargeable?: { unit: 'KG' | 'CBM'; value: number }): AgentMarkupSummary | undefined {
  const destination = price.destinationCountry.trim();
  const channel = price.channelName.trim();
  const realChannel = price.realChannelName?.trim() || price.channelName.trim();
  const candidates = [...markupRules]
    .filter((rule) => rule.enabled && !rule.deletedAt && rule.agentName === ownerAgentName && (!rule.priceBookId || rule.priceBookId === price.priceBookId))
    .filter((rule) => {
      const channelMatches = !rule.channelName || rule.channelName === channel;
      const realChannelMatches = !rule.realChannelName || rule.realChannelName === realChannel;
      const countryMatches = !rule.destinationCountry || rule.destinationCountry === destination;
      return channelMatches && realChannelMatches && countryMatches;
    });
  const matchedTiers = chargeable
    ? candidates.filter((rule) => rule.markupUnit === chargeable.unit && rule.minChargeableValue !== undefined && chargeable.value >= rule.minChargeableValue && (rule.maxChargeableValue === undefined || chargeable.value < rule.maxChargeableValue))
    : [];
  const eligible = matchedTiers.length ? matchedTiers : candidates.filter((rule) => !rule.markupUnit);
  return eligible
    .sort((left, right) =>
      (Boolean(right.priceBookId) ? 1 : 0) - (Boolean(left.priceBookId) ? 1 : 0)
      || (left.priority ?? 100) - (right.priority ?? 100)
      || markupSpecificity(right, channel, realChannel, destination) - markupSpecificity(left, channel, realChannel, destination)
      || safeTime(right.updatedAt) - safeTime(left.updatedAt)
    )[0];
}

function normalizeMarkupRoutePreviewInput(input: MarkupRoutePreviewInput): MarkupRoutePreviewInput & { realChannelName: string } {
  const priceBookId = input.priceBookId?.trim();
  const agentName = input.agentName?.trim();
  const channelName = input.channelName?.trim();
  const realChannelName = input.realChannelName?.trim() || channelName;
  const destinationCountry = input.destinationCountry?.trim();
  const chargeableValue = Number(input.chargeableValue);
  if (!priceBookId || !agentName || !channelName || !realChannelName || !destinationCountry) throw new BadRequestException('请完整选择价格表、代理、真实线路和目的地');
  if (!['KG', 'CBM'].includes(input.markupUnit)) throw new BadRequestException('计费单位必须为 KG 或 CBM');
  if (!Number.isFinite(chargeableValue) || chargeableValue < 0) throw new BadRequestException('计费重量必须为非负数');
  return { priceBookId, agentName, channelName, realChannelName, destinationCountry, markupUnit: input.markupUnit, chargeableValue };
}

function markupUnitForRow(row: PriceBookRowSummary): AgentMarkupUnit {
  return Number(row.cbmPrice ?? 0) > 0 ? 'CBM' : 'KG';
}

function markupRouteRowMatches(row: PriceBookRowSummary, route: MarkupRoutePreviewInput & { realChannelName: string }) {
  return row.priceBookId === route.priceBookId
    && row.channelName === route.channelName
    && (row.realChannelName?.trim() || row.channelName) === route.realChannelName
    && row.destinationCountry === route.destinationCountry
    && markupUnitForRow(row) === route.markupUnit;
}

function uniqueMarkupRouteScopes(rows: PriceBookRowSummary[]) {
  const scopes = new Map<string, { priceBookId: string; channelName: string; realChannelName: string; destinationCountry: string }>();
  for (const row of rows) {
    const realChannelName = row.realChannelName?.trim() || row.channelName;
    const scope = { priceBookId: row.priceBookId, channelName: row.channelName, realChannelName, destinationCountry: row.destinationCountry };
    scopes.set(`${scope.priceBookId}\u0001${scope.channelName}\u0001${scope.realChannelName}\u0001${scope.destinationCountry}`, scope);
  }
  return [...scopes.values()];
}

function normalizeMarkupRouteTiers(input: MarkupRouteTierReplaceInput['tiers'], unit: AgentMarkupUnit) {
  if (!Array.isArray(input)) throw new BadRequestException('阶梯加价格式不正确');
  const tiers = input.map((tier) => ({
    minChargeableValue: roundMoney(Number(tier.minChargeableValue)),
    ...(tier.maxChargeableValue === undefined || tier.maxChargeableValue === null ? {} : { maxChargeableValue: roundMoney(Number(tier.maxChargeableValue)) }),
    markupValue: roundMoney(Number(tier.markupValue))
  })).sort((left, right) => left.minChargeableValue - right.minChargeableValue);
  for (const [index, tier] of tiers.entries()) {
    if (!Number.isFinite(tier.minChargeableValue) || tier.minChargeableValue < 0 || !Number.isFinite(tier.markupValue) || tier.markupValue < 0) throw new BadRequestException('请填写有效的阶梯下限和加价值');
    if (tier.maxChargeableValue !== undefined && (!Number.isFinite(tier.maxChargeableValue) || tier.maxChargeableValue <= tier.minChargeableValue)) throw new BadRequestException('阶梯上限必须大于下限');
    if (index > 0) {
      const previous = tiers[index - 1];
      if (previous.maxChargeableValue === undefined || tier.minChargeableValue < previous.maxChargeableValue) throw new BadRequestException(`阶梯区间冲突：${formatChargeableRange(previous.minChargeableValue, previous.maxChargeableValue, unit)}`);
    }
  }
  return tiers;
}

function buildMarkupRoutePreview(
  route: MarkupRoutePreviewInput & { realChannelName: string },
  routeRows: PriceBookRowSummary[],
  rules: AgentMarkupSummary[]
): MarkupRoutePreviewResponse {
  const selected = [...routeRows]
    .filter((row) => Number(row.minWeightKg ?? 0) <= route.chargeableValue && route.chargeableValue < (Number(row.maxWeightKg ?? 0) > Number(row.minWeightKg ?? 0) ? Number(row.maxWeightKg) : Number.POSITIVE_INFINITY))
    .sort((left, right) => Number(right.minWeightKg) - Number(left.minWeightKg) || Number(left.maxWeightKg) - Number(right.maxWeightKg))[0];
  const fallback = createDefaultAgentMarkupRule(route.agentName, route.priceBookId);
  const markup = selected
    ? findBestMarkupRule(rules, selected, route.agentName, { unit: route.markupUnit, value: route.chargeableValue }) ?? fallback
    : undefined;
  let calculation: PricingCalculationBreakdown | undefined;
  if (selected && markup) {
    const costUnitPrice = route.markupUnit === 'CBM' ? Number(selected.cbmPrice ?? 0) : Number(selected.costPerKg);
    const totals = applyAgentMarkup(costUnitPrice, route.chargeableValue, markup);
    calculation = buildPricingCalculationBreakdown(selected, markup, route.markupUnit, route.chargeableValue, costUnitPrice, totals);
  }
  return {
    route: { priceBookId: route.priceBookId, agentName: route.agentName, channelName: route.channelName, realChannelName: route.realChannelName, destinationCountry: route.destinationCountry, markupUnit: route.markupUnit, sourceSheets: Array.from(new Set(routeRows.map((row) => row.sourceSheetName).filter((value): value is string => Boolean(value)))) },
    rows: routeRows,
    rules: rules.filter((rule) => rule.priceBookId === route.priceBookId && rule.agentName === route.agentName && rule.channelName === route.channelName && (rule.realChannelName ?? rule.channelName) === route.realChannelName && rule.destinationCountry === route.destinationCountry && rule.markupUnit === route.markupUnit),
    ...(selected ? { selectedCostRowId: selected.id } : {}),
    ...(calculation ? { calculation } : {})
  };
}

function buildPricingCalculationBreakdown(
  row: PriceBookRowSummary,
  markup: AgentMarkupSummary,
  unit: AgentMarkupUnit,
  chargeableValue: number,
  costUnitPrice: number,
  totals: { totalSales: number; salesRatePerKg: number }
): PricingCalculationBreakdown {
  const totalCost = roundMoney(costUnitPrice * chargeableValue);
  const isTier = Boolean(markup.markupUnit && markup.minChargeableValue !== undefined);
  return {
    chargeable: { unit, value: chargeableValue },
    cost: { priceBookId: row.priceBookId, sourceSheetName: row.sourceSheetName, weightSegmentLabel: row.priceTierLabel ?? `${row.minWeightKg}-${row.maxWeightKg}${unit}`, unitPrice: costUnitPrice },
    markup: {
      source: isTier ? 'LINE_TIER' : markup.id.startsWith('price-agent:') ? 'VIRTUAL_DEFAULT' : 'AGENT_DEFAULT',
      ...(markup.id.startsWith('price-agent:') ? {} : { ruleId: markup.id }),
      ...(isTier ? { rangeLabel: formatChargeableRange(markup.minChargeableValue, markup.maxChargeableValue, unit) } : {}),
      type: markup.markupType ?? 'WEIGHT',
      configuredValue: Number(markup.markupValue ?? markup.markupPerKg ?? 0),
      ...(markup.markupType === 'WEIGHT' || !markup.markupType ? { effectiveUnitMarkup: roundMoney(totals.salesRatePerKg - costUnitPrice) } : {}),
      totalMarkup: roundMoney(totals.totalSales - totalCost)
    },
    sale: { unitPrice: totals.salesRatePerKg, totalPrice: totals.totalSales }
  };
}

function normalizeAgentChannelCustomRemarkInput(input: AgentChannelCustomRemarkInput): AgentChannelCustomRemarkInput & { enabled: boolean } {
  const content = input.content?.trim().replace(/\r\n/g, '\n');
  if (!input.legacyModule || input.legacyModule === 'dubaiAirSea') throw new BadRequestException('迪拜图片展示模块不支持渠道自定义备注');
  if (!input.agentName?.trim() || !input.channelName?.trim()) throw new BadRequestException('代理和真实渠道不能为空');
  if (!content) throw new BadRequestException('自定义备注不能为空');
  if (content.length > 500) throw new BadRequestException('自定义备注不能超过 500 个字符');
  if (/[<>]/.test(content)) throw new BadRequestException('自定义备注仅支持纯文本，不支持 HTML');
  return {
    legacyModule: input.legacyModule,
    agentName: input.agentName.trim(),
    channelName: input.channelName.trim(),
    realChannelName: input.realChannelName?.trim() || undefined,
    content,
    enabled: input.enabled !== false
  };
}

function validateAgentChannelCustomRemarkScope(
  input: AgentChannelCustomRemarkInput,
  priceRows: PriceBookRowSummary[],
  agentNameByPriceBookId = new Map<string, string | undefined>()
) {
  const exists = priceRows.some((row) => (agentNameByPriceBookId.get(row.priceBookId) ?? row.agentName).trim() === input.agentName.trim()
    && row.channelName.trim() === input.channelName.trim());
  if (!exists) throw new BadRequestException('渠道必须来自当前模块该代理已导入的真实价格表');
}

function buildMarkupRuleIndex(markupRules: AgentMarkupSummary[]): Map<string, AgentMarkupSummary[]> {
  const index = new Map<string, AgentMarkupSummary[]>();
  for (const rule of markupRules) {
    if (!rule.enabled || rule.deletedAt) continue;
    const key = markupRuleIndexKey(rule.agentName, rule.priceBookId);
    const rows = index.get(key) ?? [];
    rows.push(rule);
    index.set(key, rows);
  }
  return index;
}

function markupRuleIndexKey(agentName: string, priceBookId?: string) {
  return `${priceBookId ?? ''}\u0001${agentName}`;
}

const SOUTH_AFRICA_DEFAULT_REMARK = '无牌无侵权；约翰内斯堡自提、低消0.5CBM  报关件需要单询';

function defaultSouthAfricaRateRules(): SouthAfricaRateRuleSummary[] {
  const now = '2026-07-08T00:00:00.000Z';
  return [
    normalizeSouthAfricaRateRule({ category: '普货类', name: '普货/无牌无侵权', keywords: ['包包', '帽子', '玩具', '文具', '五金', '家具', '厨房用品', '普通产品'], ratePerCbm: 1650, remark: '不带电、不带磁、不带液体、不带品牌侵权' }, { id: 'sa-rule-general', createdAt: now, updatedAt: now }),
    normalizeSouthAfricaRateRule({ category: '汽配类', name: '汽车配件', keywords: ['汽配', '保险杠', '包围', '车饰品', '车牌框'], ratePerCbm: 2300 }, { id: 'sa-rule-auto-parts', createdAt: now, updatedAt: now }),
    normalizeSouthAfricaRateRule({ category: '内电类', name: '带内置电池产品', keywords: ['蓝牙耳机', '蓝牙音箱', '内置电池', '电池产品', '小家电'], ratePerCbm: 2600 }, { id: 'sa-rule-battery-built-in', createdAt: now, updatedAt: now }),
    normalizeSouthAfricaRateRule({ category: '化妆品类', name: '化妆品类', keywords: ['化妆品', '洗发水', '沐浴露', '面膜'], ratePerCbm: 3500, remark: SOUTH_AFRICA_DEFAULT_REMARK }, { id: 'sa-rule-cosmetic', createdAt: now, updatedAt: now }),
    normalizeSouthAfricaRateRule({ category: '敏感类', name: '纯电/液体/食品需单询', keywords: ['纯电', '液体', '食品', '调料', '粉末', '药品'], consult: true, remark: '需单独咨询后报价' }, { id: 'sa-rule-consult', createdAt: now, updatedAt: now })
  ];
}

function normalizeSouthAfricaRateRule(input: SouthAfricaRateRuleInput, meta: { id: string; createdAt: string; updatedAt: string }): SouthAfricaRateRuleSummary {
  const category = input.category?.trim();
  const name = input.name?.trim();
  if (!category || !name) throw new BadRequestException('物料分类和名称不能为空');
  const keywords = uniqueStrings([...normalizeSouthAfricaKeywords(input.keywords), category, name]);
  const consult = input.consult === true;
  const ratePerCbm = Number(input.ratePerCbm ?? 0);
  if (!consult && (!Number.isFinite(ratePerCbm) || ratePerCbm <= 0)) throw new BadRequestException('固定报价规则必须填写有效运费/CBM');
  return {
    id: meta.id,
    category,
    name,
    keywords,
    ratePerCbm: consult ? undefined : roundMoney(ratePerCbm),
    consult,
    remark: input.remark?.trim() || undefined,
    sourceImageId: input.sourceImageId?.trim() || undefined,
    enabled: input.enabled !== false,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt
  };
}

function normalizeSouthAfricaKeywords(values?: string[]) {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => String(value ?? '').split(/[,，、\s]+/)).map((value) => value.trim()).filter(Boolean);
}

function createSouthAfricaLookupResponse(
  input: SouthAfricaLookupRequest,
  rules: SouthAfricaRateRuleSummary[],
  images: SouthAfricaRateImageSummary[]
): SouthAfricaLookupResponse {
  const productName = input.productName?.trim();
  const volumeCbm = Number(input.volumeCbm);
  if (!productName) throw new BadRequestException('请先填写品名');
  if (!Number.isFinite(volumeCbm) || volumeCbm <= 0) throw new BadRequestException('请填写有效方数');
  const query: SouthAfricaLookupRequest = {
    productName,
    volumeCbm,
    ...(input.category?.trim() ? { category: input.category.trim() } : {})
  };
  const haystack = `${productName} ${query.category ?? ''}`.toLowerCase();
  const scored = rules
    .map((rule) => {
      const matchedKeywords = rule.keywords.filter((keyword: string) => keyword && haystack.includes(keyword.toLowerCase()));
      const categoryMatched = query.category && rule.category === query.category ? 10000 : 0;
      const longestKeywordLength = matchedKeywords.reduce((length, keyword) => Math.max(length, keyword.length), 0);
      const exactKeywordBonus = matchedKeywords.some((keyword) => keyword === productName) ? 100 : 0;
      return { rule, matchedKeywords, score: exactKeywordBonus + categoryMatched + matchedKeywords.length * 10 + longestKeywordLength };
    })
    .filter((item) => item.score > 0 || Boolean(query.category && item.rule.category === query.category))
    .sort((left, right) => right.score - left.score || left.rule.category.localeCompare(right.rule.category, 'zh-CN'));
  const recommendations = scored.slice(0, 5).map((item) => buildSouthAfricaLookupResult(item.rule, item.matchedKeywords, query, images));
  return { query, result: recommendations[0], recommendations };
}

function buildSouthAfricaLookupResult(rule: SouthAfricaRateRuleSummary, matchedKeywords: string[], query: SouthAfricaLookupRequest, images: SouthAfricaRateImageSummary[]): SouthAfricaLookupResult {
  const volumeCbm = Number(query.volumeCbm);
  const chargeableCbm = Math.ceil(Math.max(0.5, volumeCbm) * 1000) / 1000;
  const sourceImage = rule.sourceImageId ? images.find((image) => image.id === rule.sourceImageId) : undefined;
  if (rule.consult) {
    return {
      id: rule.id,
      category: rule.category,
      materialName: rule.name,
      matchedKeywords,
      consult: true,
      volumeCbm,
      chargeableCbm,
      formulaText: '该物料需单询，不输出固定总价',
      remark: rule.remark,
      sourceImage,
      quoteText: `南非专线报价：${query.productName} 属于 ${rule.category}/${rule.name}，需单独咨询；参考计费方 ${chargeableCbm.toFixed(3)} CBM。`
    };
  }
  const freightFee = roundMoney(chargeableCbm * Number(rule.ratePerCbm ?? 0));
  const remark = rule.remark || SOUTH_AFRICA_DEFAULT_REMARK;
  const quoteText = [
    `南非SA海运DDP专线：${query.productName}`,
    `分类：${rule.category}/${rule.name}`,
    `计费方：${chargeableCbm.toFixed(3)}CBM`,
    `运费：${formatSouthAfricaRmb(rule.ratePerCbm ?? 0)}/CBM，运费 ${formatSouthAfricaRmb(freightFee)}`,
    `备注：${remark}`
  ].join('\n');
  return {
    id: rule.id,
    category: rule.category,
    materialName: rule.name,
    matchedKeywords,
    consult: false,
    ratePerCbm: rule.ratePerCbm,
    volumeCbm,
    chargeableCbm,
    freightFee,
    totalFee: freightFee,
    formulaText: `max(0.5, ${volumeCbm}) = ${chargeableCbm.toFixed(3)} CBM`,
    remark,
    sourceImage,
    quoteText
  };
}

function formatSouthAfricaRmb(value: number) {
  return `¥${roundMoney(value).toFixed(2)}`;
}

function buildPriceBookAgentSourcesFromRows(priceRows: PriceBookRowSummary[], fileNameByBookId: Map<string, string>, agentNameByBookId: Map<string, string | undefined> = new Map()): ActivePriceBookAgentSource[] {
  const grouped = new Map<string, ActivePriceBookAgentSource>();
  for (const row of priceRows) {
    const fileName = fileNameByBookId.get(row.priceBookId) ?? '';
    const agentName = agentNameByBookId.get(row.priceBookId) ?? row.agentName;
    const source: ActivePriceBookAgentSource = { priceBookId: fileName ? row.priceBookId : '', fileName, agentName, lineCount: 0 };
    const key = agentMarkupScopeKey(source);
    const current = grouped.get(key) ?? source;
    current.lineCount += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()];
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

function pickMemoryStaffProfile(account: Account) {
  return {
    name: account.name,
    phone: account.phone,
    gender: account.gender ?? 'UNKNOWN',
    nickname: account.nickname,
    site: account.site
  };
}

function matchMemoryStaffAccount(account: Account, query: StaffAccountQuery, roleLabel: string, departmentName?: string) {
  const keyword = query.keyword?.trim().toLowerCase();
  const enabled = account.enabled !== false;
  return (!keyword || [account.username, account.name, account.nickname, account.phone, departmentName, roleLabel].some((value) => value?.toLowerCase().includes(keyword)))
    && (!query.departmentId?.trim() || account.departmentId === query.departmentId.trim())
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

function parseMemoryTrackingDate(value: string | number): Date {
  if (typeof value === 'number') {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(date.getTime())) return date;
  } else {
    const normalized = value.trim().replace(/\//g, '-');
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) return date;
  }
  throw new BadRequestException('轨迹日期时间无法识别');
}

function buildInMemoryLegacyModuleCounts(rows: PriceBookRowSummary[]) {
  const counts: Partial<Record<LegacyPricingModule, number>> = {};
  for (const row of rows) {
    const module = inferInMemoryLegacyModule(row);
    counts[module] = (counts[module] ?? 0) + 1;
  }
  return counts;
}

function normalizePriceBookImportTargetModule(value: unknown): PriceBookImportTargetModule {
  if (isLegacyPricingModule(value)) {
    return value;
  }
  throw new BadRequestException('请选择本次导入适用的查价模块');
}

function buildSingleLegacyModuleCounts(module: PriceBookImportTargetModule, rowCount: number) {
  return { [module]: rowCount } as Partial<Record<LegacyPricingModule, number>>;
}

function primaryLegacyModuleFromCounts(counts?: Partial<Record<LegacyPricingModule, number>>): LegacyPricingModule | undefined {
  return Object.entries(counts ?? {})
    .filter((entry): entry is [LegacyPricingModule, number] => Number(entry[1] ?? 0) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))[0]?.[0];
}

function inferInMemoryLegacyModule(row: PriceBookRowSummary): LegacyPricingModule {
  const source = `${row.sourceSheetName ?? ''} ${row.channelName ?? ''} ${row.realChannelName ?? ''} ${row.businessRouteName ?? ''} ${row.destinationCountry ?? ''}`.toLowerCase();
  if (row.warehouseCode?.trim() || /仓库|fba|amazon|亚马逊/.test(source)) return 'amazon';
  if (/南非|south africa|south-africa/.test(source)) return 'southAfrica';
  if (/迪拜|dubai|dxb/.test(source)) return 'dubaiAirSea';
  if (/加拿大|canada|canadian/.test(source)) return 'canadaAirSea';
  if (/美国|美线|usa|united states/.test(source) && /空海运|空运|海运|空派|海派|air|sea|ocean/.test(source)) return 'usaAirSea';
  if (!/超大件|大件/.test(source) && /空海运|铁路|快递|空运|空派|express|rail|air|fedex|dhl|ups/.test(source)) return 'europeExpress';
  if (/超大件|海运|海卡|卡派|卡车|truck|oversize|大件/.test(source)) return 'inquiry';
  return 'europeExpress';
}

function isLegacyPricingModule(value: unknown): value is LegacyPricingModule {
  return value === 'amazon'
    || value === 'inquiry'
    || value === 'europeExpress'
    || value === 'southAfrica'
    || value === 'usaAirSea'
    || value === 'canadaAirSea'
    || value === 'dubaiAirSea';
}

function isAirSeaPricingModule(module: LegacyPricingModule) {
  return module === 'usaAirSea' || module === 'canadaAirSea' || module === 'dubaiAirSea';
}

function defaultLegacyModuleDestination(module: LegacyPricingModule): string | undefined {
  // The selected query module is the price-pool boundary. Amazon books can
  // legitimately contain non-US warehouse routes, so an omitted country must
  // not silently exclude them with a module-derived US filter.
  if (module === 'amazon') return undefined;
  if (module === 'southAfrica') return '南非';
  if (module === 'canadaAirSea') return '加拿大';
  if (module === 'dubaiAirSea') return '迪拜';
  return '美国';
}

function legacyPriceRowChannelMatches(row: PriceBookRowSummary, channel?: string) {
  const query = channel?.trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    row.channelName,
    row.realChannelName,
    row.businessRouteName,
    row.sourceSheetName,
    row.productSurchargeRemark,
    row.specialRemark
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function priceRowAmazonOriginMatches(row: PriceBookRowSummary, origin?: string) {
  const normalized = normalizeAmazonOriginWarehouseName(origin);
  if (!normalized) return true;
  return normalizeAmazonOriginWarehouseName(row.sourceSheetName) === normalized;
}

function dedupeInMemoryLegacyRows(rows: PriceBookRowSummary[]) {
  const result = new Map<string, PriceBookRowSummary>();
  for (const row of rows) {
    const key = [row.agentName, row.channelName, row.realChannelName ?? '', row.warehouseCode ?? '', row.destinationCountry, row.postalRule ?? '', row.minWeightKg, row.maxWeightKg].join('|');
    if (!result.has(key)) result.set(key, row);
  }
  return [...result.values()];
}

function removeMatching<T>(rows: T[], predicate: (row: T) => boolean) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (predicate(rows[index])) {
      rows.splice(index, 1);
    }
  }
}

function isMemoryInternalTrackingStatus(value?: string): boolean {
  return /^(录单|财务录单|业务员自审|审核驳回|创建出货订单|创建预报|已生成面单|面单已作废|人工修改运单|代理退回|批量添加轨迹|已出库|待出库|待排货|已入库)/.test(value ?? '');
}

function memoryInternalTrackingSourceModule(action: string): string {
  if (/warehouse|tally|dispatch|label/.test(action)) return '仓库管理';
  if (/route|routing/.test(action)) return '待排货';
  if (/finance|payment|payable|cost/.test(action)) return '财务管理';
  return '业务管理';
}

function normalizeAgentSettlementCycle(value: unknown): 'WEEKLY' | 'MONTHLY' | 'PER_SHIPMENT' | undefined {
  return value === 'WEEKLY' || value === 'MONTHLY' || value === 'PER_SHIPMENT' ? value : undefined;
}

function internalFlowStage(action: string, after?: unknown) {
  const value = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  const status = typeof value.statusTo === 'string' ? value.statusTo : typeof value.status === 'string' ? value.status : undefined;
  if (action === 'shipment.operational.update') {
    if (status === 'WAITING_DEPARTURE') return '待离港';
    if (status === 'DEPARTED') return '已离港';
    if (status === 'ARRIVED_PORT') return '已到港';
    if (status === 'DELIVERING') return '已派送';
    if (status === 'SIGNED') return '已签收归档';
    if (value.transferNoTo || value.transferNoFilledAt) return '转单号';
  }
  if (action.includes('customer_service.agent_data') || action.includes('customer_service.business_data')) return '客服数据确认';
  if (action.includes('problem.ticket') || action.includes('customer_service.issue')) return '问题件';
  if (action.includes('finance') || action.includes('payment') || action.includes('shipment.finance_item')) return '财务费用';
  if (action.includes('handover')) return '代理交接单';
  if (action.includes('dispatch')) return '仓库出库';
  if (action.includes('route')) return '市场排货';
  if (action.includes('review')) return '审核';
  if (action.includes('warehouse') || action.includes('receive')) return '仓库入库';
  if (action.includes('order_entry') || action.includes('shipment.create')) return '业务录单';
  return '';
}
function internalFlowSummary(action: string, after: unknown) {
  const value = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  const status = typeof value.statusTo === 'string' ? value.statusTo : typeof value.status === 'string' ? value.status : undefined;
  if (action === 'shipment.operational.update') {
    if (status === 'WAITING_DEPARTURE') return '已填写转单号，进入待离港';
    if (status === 'DEPARTED') return '已确认离港';
    if (status === 'ARRIVED_PORT') return '已确认到港';
    if (status === 'DELIVERING') return '已进入派送';
    if (status === 'SIGNED') return '已签收，进入归档视角';
    if (value.transferNoTo || value.transferNoFilledAt) return '已维护转单号';
  }
  if (action === 'warehouse.handover.print') return `已打印代理交接单${value.handoverNo ? `：${value.handoverNo}` : ''}`;
  if (action.startsWith('problem.ticket') || action.startsWith('customer_service.issue')) return '已记录问题件处理过程';
  if (action.includes('finance') || action.includes('payment') || action.includes('shipment.finance_item')) return '已记录关联财务费用操作';
  if (action === 'shipment.review.business_approve') return '业务自审通过，运单进入待排货';
  if (action.includes('review') && action.includes('approve')) return '审核通过，运单进入下一处理节点';
  if (action === 'shipment.route') return `已完成市场排货${value.agentName ? `：${value.agentName}` : ''}${value.agentChannelName ? ` / ${value.agentChannelName}` : ''}`;
  if (action === 'shipment.dispatch') return `仓库已出库${value.handoverNo ? `，交接单号：${value.handoverNo}` : ''}`;
  if (action.includes('warehouse') || action.includes('receive')) return '仓库已完成入库/收货操作';
  return '已记录内部操作';
}

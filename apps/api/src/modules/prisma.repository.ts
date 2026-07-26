import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Permission as PrismaPermission, Role as PrismaRole, Shipment as PrismaShipment } from '@prisma/client';
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
  matchWarehouseCodeRule,
  parseWarehouseCodeRules,
  warehouseCodePrefixCandidates,
  validateShipmentImportRows,
  type AccountLedgerSummary,
  type AgentCreateInput,
  type AgentDeleteResponse,
  type AgentChannelCreateInput,
  type AgentChannelSummary,
  type AgentChannelUpdateInput,
  type AgentBankAccountInput,
  type AgentBankAccountSummary,
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
  type AgentSummary,
  type AgentUpdateInput,
  type AuditLogListResponse,
  type AuditLogQuery,
  type AuditLogResult,
  type AuditLogSummary,
  type BusinessCostAuditBatchInput,
  type BusinessCostAuditBatchResult,
  type BusinessCostAuditCreateInput,
  type BusinessCostAuditExportRequest,
  type BusinessCostAuditExportResponse,
  type BusinessCostAuditListQuery,
  type BusinessCostAuditListResponse,
  type BusinessCostAuditSummary,
  type BusinessCostAuditUpdateInput,
  type BusinessType,
  type CarrierAdapterCode,
  type CarrierCreateInput,
  type CarrierSummary,
  type CarrierTaskRunResponse,
  type CarrierTaskSummary,
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
  type PaymentApplicationCancelInput,
  type PaymentApplicationCreateInput,
  type PaymentApplicationExportRequest,
  type PaymentApplicationExportResponse,
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
  type SurchargeCreateInput,
  type SurchargeSummary,
  type SiteCreateInput,
  type SiteSummary,
  type SiteUpdateInput,
  type StaffAccountCreateInput,
  type StaffAccountPasswordResetInput,
  type StaffAccountPasswordResetResult,
  type StaffAccountQuery,
  type StaffAccountRoleKey,
  type StaffAccountSummary,
  type StaffAccountUpdateInput,
  type ShipmentFinanceItemCreateInput,
  type ShipmentFinanceItemType,
  type ShipmentFinanceItemUpdateInput,
  shipmentStatusLabels,
  type BulkTrackingApplyRequest,
  type BulkTrackingApplyResponse,
  type Shipment,
  type ShipmentCreateInput,
  type ShipmentFinanceItemStatus,
  type ShipmentFinanceDetailSummary,
  type ShipmentImportRequest,
  type ShipmentImportResponse,
  type LineShipmentPoolQuery,
  type ShipmentInternalFlowLogResponse,
  type LineShipmentPackageSummary,
  type LineShipmentPoolResponse,
  type ShipmentLabelSummary,
  type ShipmentOperationalUpdateInput,
  type CustomerServiceTransferBatchInput,
  type CustomerServiceTransferBatchResponse,
  type ShipmentPaymentUpdateInput,
  type ShipmentPaymentMethod,
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
  type ShipmentStatus,
  type TrackingEventInput,
  type WarehouseConsolidationCreateInput,
  type WarehouseConsolidationSummary,
  type WarehouseInStockQuery,
  type WarehouseInStockResponse,
  type WarehouseManualReceiptCreateInput,
  type WarehouseManualReceiptCreateResponse,
  type WarehousePackageCreateInput,
  type WarehousePackageSplitInput,
  type WarehousePackageSplitResponse,
  type WarehousePackageStatus,
  type WarehousePackageSummary,
  type WarehousePackageUpdateInput,
  type WarehouseTallyLabelScanInput,
  type WarehouseTallyLabelScanResponse,
  type WarehouseTallyTaskCompleteInput,
  type WarehouseTallyTaskPackageResultInput,
  type WarehouseTallyTaskCreateInput,
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
  type WaterReceiptSummary,
  type WaterReceiptUnmatchInput,
  type WaterReceiptUpdateInput,
  type WaterReceiptVoucherInput,
  type WaterReceiptVoucherSummary
} from '@siyuan/shared';
import { getPasswordStrengthError, hashPassword } from './password.js';
import { PRICING_PARSER_RULE_VERSIONS, inferEuropeOversizeCargoType, inferEuropeTransportMode, inspectEuropeOversizeWorkbookSheets, normalizeEuropeTransportModeFilter, normalizePricingImportRowForModule, parsePriceWorkbookBuffer, pricingParserRuleVersion, summarizeEuropeTransportImportHealth } from './pricing-excel.js';
import { renderDubaiWorkbookSheets } from './dubai-price-sheet-renderer.js';
import { buildLineagePriceBookMetrics, LineageWatcher } from './lineage-watcher.js';
import { buildLineShipmentPackageSummaries } from './line-shipment-packages.js';
import { PrismaService } from './prisma.service.js';
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
import {
  loadWarehouseTallyTaskOutputPackages,
  mapWarehousePackage,
  mapWarehousePackagesWithConfirmedTally,
  mapWarehouseTallyTask,
  resolveWarehouseTallyRecentCutoff
} from './warehouse/warehouse-query.shared.js';
import {
  allPermissions,
  buildRolePermissionRow,
  defaultPermissionsForRole,
  getPermissionDefinitions,
  getRoleMetadata,
  isBuiltinRoleKey,
  normalizeRolePermissions,
  permissionDefinitions,
  roleMetadata,
  type PermissionKey,
  type Principal,
  type RoleKey,
  type RolePermissionRow
} from './rbac.js';

type ShipmentWithRelations = PrismaShipment & {
  customer: { id: string; code: string; name: string; salesperson: string | null };
  channel: ({ name: string; carrier: { name: string } } | null);
  agent: ({ name: string } | null);
  problemTickets: Array<{ id: string; status: string }>;
  financeItems?: Array<{ type: string; name: string; amount: unknown; currency?: string | null; chargeWeightKg?: unknown; unitPrice?: unknown; remark?: string | null; voided?: boolean; createdAt?: Date | string }>;
};

type ReviewRestoreInputWithManual = ShipmentRestoreInput & {
  mode?: ShipmentRestoreInput['mode'] | 'MANUAL_TIME';
  manualCreatedAt?: string;
};

const staffGenderValues = ['UNKNOWN', 'MALE', 'FEMALE', 'OTHER'] as const;
const warehouseNavigationViewPermissions: PermissionKey[] = [
  'warehouse:today-receipt:view',
  'warehouse:in-stock:view',
  'warehouse:tally-pending:view',
  'warehouse:tally-completed:view',
  'warehouse:dispatch-pending:view',
  'warehouse:outbounded:view'
];

type StaffProfileInput = {
  name?: string;
  phone?: string;
  gender?: string;
  nickname?: string;
  site?: string;
};

const defaultAgentMarkupRules: AgentMarkupSummary[] = [
  { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, markupType: 'WEIGHT' as const, markupValue: 0.5, priority: 100, enabled: true },
  { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, markupType: 'WEIGHT' as const, markupValue: 1, priority: 100, enabled: true }
];

const seedAgentQuoteErrors = [
  { agentName: 'BSD', quoteCount: 0, errorCode: 'TOKEN_INVALID', errorMessage: 'Token不正确' }
];

const PRICING_LOOKUP_ROW_LIMIT = 5000;
const PRICING_LOOKUP_RESPONSE_LIMIT = 100;
const PRICING_LOOKUP_TIMING_WARN_MS = 500;
const PRICE_BOOK_JSON_IMPORT_ROW_LIMIT = 2000;
const PRICE_BOOK_IMPORT_BATCH_SIZE = 1000;
const AGENT_MARKUP_EXPORT_ROW_LIMIT = 2000;

const DEFAULT_RECEIVABLE_SETTLEMENT_METHOD = '自动匹配';
const auditModuleLabels: Record<string, string> = {
  auth: '认证登录',
  system: '系统设置',
  master_data: '基础资料',
  pricing: '报价查价',
  warehouse: '仓库管理',
  finance: '财务结算',
  shipment: '我的订单',
  tracking: '轨迹监控',
  problem: '问题件',
  security: '权限安全',
  demo: '演示数据'
};

function inferAuditModule(action: string): { module: string; moduleLabel: string } {
  if (action.includes('轨迹')) {
    return { module: 'tracking', moduleLabel: auditModuleLabels.tracking };
  }
  if (action.includes('运单') || action.includes('收款')) {
    return { module: 'shipment', moduleLabel: auditModuleLabels.shipment };
  }
  const module = action.split('.')[0] || 'system';
  return { module, moduleLabel: auditModuleLabels[module] ?? module };
}

function inferAuditResult(action: string): AuditLogResult {
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

function formatAuditActionLabel(action: string): string {
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
  if (/reverse_audit/.test(action)) return '反审核';
  if (/audit/.test(action)) return '审核';
  if (/(delete|void)/.test(action)) return '删除/作废';
  if (/create_shipment/.test(action)) return '创建出货单';
  if (/upsert/.test(action)) return '写入或更新数据';
  if (/create/.test(action)) return '新增';
  if (/update/.test(action)) return '修改';
  if (/unlock/.test(action)) return '解锁';
  if (/lock/.test(action)) return '锁定';
  if (/split/.test(action)) return '拆分';
  if (/import/.test(action)) return '导入';
  if (/request\.import/.test(action)) return '导入操作';
  if (/request\.export/.test(action)) return '导出操作';
  if (/request\.write/.test(action)) return '重要操作';
  if (/change/.test(action)) return '修改';
  return action;
}

function toAuditSummary(
  row: { id: string; actorId: string; action: string; target: string; before: unknown; after: unknown; createdAt: Date },
  usernameById: Map<string, string>
): AuditLogSummary {
  const module = inferAuditModule(row.action);
  const result = inferAuditResult(row.action);
  return {
    id: row.id,
    actorId: row.actorId,
    actorUsername: usernameById.get(row.actorId) ?? row.actorId,
    action: row.action,
    actionLabel: formatAuditActionLabel(row.action),
    module: module.module,
    moduleLabel: module.moduleLabel,
    target: row.target,
    result,
    resultLabel: result === 'SUCCESS' ? '成功' : '失败',
    before: row.before ?? undefined,
    after: row.after ?? undefined,
    ipAddress: readAuditIpAddress(row.after),
    createdAt: row.createdAt.toISOString()
  };
}

function readAuditIpAddress(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const ipAddress = (value as { ipAddress?: unknown }).ipAddress;
  return typeof ipAddress === 'string' && ipAddress.trim() ? ipAddress.trim() : undefined;
}

const accountSelfAuditActions = ['auth.profile.update', 'auth.password.change'];

function isAccountStaffAuditAction(action: string) {
  return action.startsWith('system.staff.');
}

function auditModuleFromPath(path: string) {
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

function auditKindFromRequest(method: string, path: string) {
  if (/(?:^|\/)import(?:\/|$|\?)/i.test(path)) return 'import';
  if (/(?:^|\/)export(?:\/|$|\?)/i.test(path)) return 'export';
  return method.toUpperCase() === 'DELETE' ? 'delete' : 'write';
}

function buildAuditDeleteWarnings(rows: AuditLogSummary[]): AuditLogListResponse['suspiciousDeleteWarnings'] {
  const deleteRows = rows
    .filter((row) => /(delete|void|删除|作废)/i.test(row.action))
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const warnings: AuditLogListResponse['suspiciousDeleteWarnings'] = [];
  const rowsByActor = new Map<string, AuditLogSummary[]>();
  deleteRows.forEach((row) => rowsByActor.set(row.actorId, [...(rowsByActor.get(row.actorId) ?? []), row]));

  rowsByActor.forEach((actorRows, actorId) => {
    for (let start = 0; start < actorRows.length; start += 1) {
      const startedAt = new Date(actorRows[start].createdAt).getTime();
      const windowRows = actorRows.filter((row) => {
        const time = new Date(row.createdAt).getTime();
        return time >= startedAt && time - startedAt <= 10 * 60 * 1000;
      });
      if (windowRows.length >= 5) {
        warnings.push({
          actorId,
          actorUsername: actorRows[start].actorUsername,
          windowStartedAt: windowRows[0].createdAt,
          windowEndedAt: windowRows[windowRows.length - 1].createdAt,
          count: windowRows.length
        });
        break;
      }
    }
  });
  return warnings;
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

@Injectable()
export class PrismaRepository implements OnModuleInit {
  private priceBookRefreshWorkerRunning = false;
  private priceBookRefreshWorkerTimer?: ReturnType<typeof setTimeout>;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(LineageWatcher) private readonly lineage?: LineageWatcher
  ) {}

  onModuleInit() {
    // Do not parse workbooks on the request path. A deployment that bumps one
    // module rule version merely wakes this single-worker queue; active rows
    // continue serving until an individual book switches atomically.
    this.schedulePriceBookRuleRefresh(1_000);
  }

  private schedulePriceBookRuleRefresh(delayMs = 250) {
    if (this.priceBookRefreshWorkerTimer) return;
    this.priceBookRefreshWorkerTimer = setTimeout(() => {
      this.priceBookRefreshWorkerTimer = undefined;
      void this.runPriceBookRuleRefreshWorker();
    }, delayMs);
  }

  async findAccount(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, enabled: true },
      include: { role: true }
    });

    if (!user || user.passwordHash !== hashPassword(password)) {
      return undefined;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role.name as RoleKey,
      customerId: user.customerId ?? undefined,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
      gender: user.gender ?? undefined,
      nickname: user.nickname ?? undefined,
      mustChangePassword: user.mustChangePassword
    };
  }

  async getProfile(principal: Principal): Promise<Principal> {
    const user = await this.prisma.user.findUnique({
      where: { id: principal.id },
      include: { role: true }
    });
    if (!user || !user.enabled) {
      throw new NotFoundException('账号不存在或已停用');
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role.name as RoleKey,
      customerId: user.customerId ?? undefined,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
      gender: user.gender ?? undefined,
      nickname: user.nickname ?? undefined,
      mustChangePassword: user.mustChangePassword
    };
  }

  async updateProfile(principal: Principal, input: StaffProfileInput): Promise<Principal> {
    const before = await this.prisma.user.findUnique({ where: { id: principal.id } });
    if (!before || !before.enabled) {
      throw new NotFoundException('账号不存在或已停用');
    }
    const profile = normalizeStaffProfile(input);
    const user = await this.prisma.user.update({
      where: { id: principal.id },
      data: profile,
      include: { role: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'auth.profile.update',
        target: `user:${principal.id}`,
        before: pickStaffProfile(before),
        after: pickStaffProfile(user)
      }
    });
    return {
      id: user.id,
      username: user.username,
      role: user.role.name as RoleKey,
      customerId: user.customerId ?? undefined,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
      gender: user.gender ?? undefined,
      nickname: user.nickname ?? undefined,
      mustChangePassword: user.mustChangePassword
    };
  }

  async recordLoginLog(principal: Principal, input: { ip: string; userAgent?: string }) {
    await (this.prisma as any).loginLog.create({
      data: {
        userId: principal.id,
        username: principal.username,
        ip: input.ip,
        region: inferIpRegion(input.ip),
        userAgent: input.userAgent ?? null
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'auth.login.success',
        target: `user:${principal.id}`,
        after: { username: principal.username, ip: input.ip, region: inferIpRegion(input.ip), userAgent: input.userAgent ?? null }
      }
    });
  }

  async recordLoginFailure(input: { username?: string; ip: string; userAgent?: string }) {
    const username = input.username?.trim() || '未填写';
    const user = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    await this.prisma.auditLog.create({
      data: {
        actorId: user?.id ?? 'anonymous',
        action: 'auth.login.failed',
        target: `login:${username}`,
        after: { username, ip: input.ip, region: inferIpRegion(input.ip), userAgent: input.userAgent ?? null }
      }
    });
  }

  async getLoginLogs(principal: Principal) {
    const rows = await (this.prisma as any).loginLog.findMany({
      where: { userId: principal.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      ip: row.ip,
      region: row.region,
      userAgent: row.userAgent ?? undefined,
      createdAt: row.createdAt.toISOString()
    }));
  }

  async getAccountEvents(principal: Principal): Promise<AuditLogSummary[]> {
    const userTarget = `user:${principal.id}`;
    const rows = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { actorId: principal.id, target: userTarget, action: { in: accountSelfAuditActions } },
          { target: { contains: principal.id }, action: { startsWith: 'system.staff.' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const actorIds = [...new Set(rows.map((row) => row.actorId))];
    const users = actorIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true } })
      : [];
    const usernameById = new Map(users.map((user) => [user.id, user.username]));
    return rows.filter((row) => !row.action.startsWith('auth.login.') && (accountSelfAuditActions.includes(row.action) || isAccountStaffAuditAction(row.action))).map((row) => toAuditSummary(row, usernameById));
  }

  async changePassword(principal: Principal, input: { currentPassword?: string; newPassword?: string }) {
    const currentPassword = input.currentPassword ?? '';
    const newPassword = input.newPassword ?? '';
    const strengthError = getPasswordStrengthError(newPassword);
    if (strengthError) {
      throw new BadRequestException(strengthError);
    }

    const user = await this.prisma.user.findUnique({ where: { id: principal.id } });
    if (!user || user.passwordHash !== hashPassword(currentPassword)) {
      throw new ForbiddenException('当前密码不正确');
    }

    await this.prisma.user.update({
      where: { id: principal.id },
      data: { passwordHash: hashPassword(newPassword), mustChangePassword: false }
    });
    await (this.prisma as any).auditLog.create({
      data: {
        actorId: principal.id,
        action: 'auth.password.change',
        target: `user:${principal.id}`,
        before: null,
        after: { username: principal.username }
      }
    });
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
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const rows = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope
          ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
          : {})
      },
      include: shipmentIncludes,
      orderBy: { createdAt: 'desc' }
    });

    const salespeople = [...new Set(rows.map((row) => row.customer.salesperson).filter(Boolean) as string[])];
    const salespersonSites = new Map(
      (await this.prisma.user.findMany({
        where: { username: { in: salespeople } },
        select: { username: true, site: true }
      })).map((user) => [user.username, user.site ?? undefined])
    );

    const dispatchLogs = rows.length
      ? await this.prisma.auditLog.findMany({
          where: { action: 'shipment.dispatch', target: { in: rows.map((row) => row.id) } },
          orderBy: { createdAt: 'desc' },
          select: { target: true, after: true }
        })
      : [];
    const latestDispatchByShipmentId = new Map<string, ShipmentDispatchArchiveFields>();
    dispatchLogs.forEach((row) => {
      if (!latestDispatchByShipmentId.has(row.target)) {
        latestDispatchByShipmentId.set(row.target, normalizeShipmentDispatchArchive(row.after));
      }
    });

    return rows.map((row) => this.maskShipmentListFields(principal, {
      ...applyShipmentDispatchArchiveFields(mapShipment(row), latestDispatchByShipmentId.get(row.id)),
      site: row.customer.salesperson ? salespersonSites.get(row.customer.salesperson) : undefined
    }, { canViewMarketAgent, canViewMarketCosts, exposeWarehouseRouting: options.exposeWarehouseRouting ?? false }));
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
    const shipmentIds = shipments.map((row) => row.id);
    const auditRows = shipmentIds.length
      ? await this.prisma.auditLog.findMany({ where: { target: { in: shipmentIds } }, select: { target: true, createdAt: true, action: true } })
      : [];
    const canReadFinance = await this.hasPermission(principal.role, 'finance:dashboard:view');
    const financeAuditRows = canReadFinance
      ? await this.prisma.auditLog.findMany({ where: { action: { startsWith: 'finance.' } }, select: { target: true, createdAt: true, action: true } })
      : [];
    const auditWatermarks = new Map<string, string>();
    auditRows.forEach((row) => {
      const value = row.createdAt.toISOString();
      const current = auditWatermarks.get(row.target);
      if (!current || value > current) auditWatermarks.set(row.target, value);
    });
    const readStates = await this.prisma.userModuleReadState.findMany({ where: { userId: principal.id } });
    const stateByKey = new Map(readStates.map((state) => [`${state.moduleKey}:${state.sectionKey}`, state.watermark.toISOString()]));
    const shipmentRows = (statuses: ShipmentStatus[], businessType?: BusinessType) => shipments
      .filter((row) => (statuses.length === 0 || statuses.includes(row.status)) && (!businessType || row.businessType === businessType))
      .map((row) => ({ id: row.id, watermark: auditWatermarks.get(row.id) ?? row.createdAt }));
    const ticketRows = await this.prisma.problemTicket.findMany({
      where: { status: { not: 'CLOSED' }, ...(principal.role === 'CUSTOMER' ? { customerVisible: true, shipment: { customerId: principal.customerId } } : { shipment: { id: { in: shipmentIds } } }) },
      include: { replies: { select: { createdAt: true } } }
    });
    const salesScope = this.operatorCustomerScope(principal);
    const warehouseRows = await this.prisma.warehousePackage.findMany({
      where: {
        status: { notIn: ['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'] },
        ...(salesScope ? { salesperson: { in: salesScope } } : {})
      },
      select: { id: true, status: true, updatedAt: true }
    });
    const read = (moduleKey: string, sectionKey: string, rows: Array<{ id: string; watermark: string }>) => {
      const watermark = stateByKey.get(`${moduleKey}:${sectionKey}`);
      const unread = watermark ? rows.filter((row) => row.watermark > watermark) : rows;
      const unreadCount = new Set(unread.map((row) => row.id)).size;
      return { moduleKey, sectionKey, unreadCount, displayCount: unreadCount > 999 ? '999+' : String(unreadCount), latestWatermark: rows.map((row) => row.watermark).sort().at(-1) };
    };
    const ticketBadges = ticketRows.map((ticket) => ({
      id: ticket.id,
      watermark: [ticket.createdAt.toISOString(), ticket.closedAt?.toISOString(), ...ticket.replies.map((reply) => reply.createdAt.toISOString())].filter(Boolean).sort().at(-1) ?? ticket.createdAt.toISOString()
    }));
    const items = [
      read('customerService', 'pending-routing', shipmentRows(['WAITING_SORT'])),
      read('customerService', 'waitingDeparture', shipmentRows(['WAITING_DEPARTURE'])),
      read('customerService', 'departed', shipmentRows(['DEPARTED'])),
      read('customerService', 'problems', ticketBadges),
      read('receive', 'consolidation', warehouseRows.filter((row) => ['RECEIVED', 'IN_STOCK'].includes(row.status)).map((row) => ({ id: row.id, watermark: row.updatedAt.toISOString() }))),
      read('receive', 'packages', warehouseRows.map((row) => ({ id: row.id, watermark: row.updatedAt.toISOString() }))),
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
      read('finance', 'receivables', financeAuditRows.filter((row) => row.action.startsWith('finance.receivable')).map((row) => ({ id: row.target, watermark: row.createdAt.toISOString() }))),
      read('finance', 'payment-applications', financeAuditRows.filter((row) => row.action.startsWith('finance.payment_application')).map((row) => ({ id: row.target, watermark: row.createdAt.toISOString() })))
    ];
    const visible = new Set<string>();
    if (await this.hasPermission(principal.role, 'operations:line-shipment:view')) visible.add('workspace');
    if (await this.hasAnyPermission(principal.role, warehouseNavigationViewPermissions)) visible.add('receive');
    if (await this.hasAnyPermission(principal.role, ['business:dashboard:view', 'business:order-entry:view', 'business:review:list', 'business:shipment:list', 'business:order-ai:view'])) visible.add('business');
    if (await this.hasAnyPermission(principal.role, ['market:dashboard:view', 'market:pending-routing:view', 'market:routed:view', 'market:weekly-routing:view'])) visible.add('market');
    if (await this.hasAnyPermission(principal.role, ['customer-service:dashboard:view', 'customer-service:data-confirm:view', 'customer-service:transfer:view', 'customer-service:pending-routing:view', 'customer-service:waiting-departure:view', 'customer-service:departed:view', 'customer-service:arrived-port:view', 'customer-service:delivering:view', 'customer-service:signed:view', 'customer-service:problem:view'])) visible.add('customerService');
    if (canReadFinance) visible.add('finance');
    const scoped = items.filter((item) => visible.has(item.moduleKey));
    const parentItems = [...new Set(scoped.map((item) => item.moduleKey))].map((moduleKey) => {
      const unreadCount = scoped.filter((item) => item.moduleKey === moduleKey).reduce((total, item) => total + item.unreadCount, 0);
      return { moduleKey, unreadCount, displayCount: unreadCount > 999 ? '999+' : String(unreadCount) };
    });
    return { items: [...scoped, ...parentItems] };
  }

  async markNavigationRead(principal: Principal, input: { moduleKey: string; sectionKey?: string }) {
    const moduleKey = input.moduleKey.trim();
    const sectionKey = input.sectionKey?.trim() ?? '';
    if (!moduleKey) throw new BadRequestException('模块标识不能为空');
    const now = new Date();
    await this.prisma.userModuleReadState.upsert({
      where: { userId_moduleKey_sectionKey: { userId: principal.id, moduleKey, sectionKey } },
      create: { userId: principal.id, moduleKey, sectionKey, readAt: now, watermark: now },
      update: { readAt: now, watermark: now }
    });
    return { ok: true, moduleKey, sectionKey: sectionKey || undefined, readAt: now.toISOString(), watermark: now.toISOString() };
  }

  async customerServiceTransferShipments(principal: Principal): Promise<Shipment[]> {
    if (!await this.hasPermission(principal.role, 'customer-service:transfer:view')) throw new ForbiddenException('无权查看转单号');
    const canViewAll = await this.hasPermission(principal.role, 'customer-service:transfer:view-all');
    const rows = (await this.getShipments(principal))
      .filter((shipment) => shipment.status === 'OUTBOUNDED' && !shipment.transferNo)
      .filter((shipment) => canViewAll || shipment.salesperson === principal.username);
    const approvalRows = await this.prisma.auditLog.findMany({ where: { action: { in: ['customer_service.business_data.approved', 'customer_service.agent_data.approved'] }, target: { in: rows.map((row) => row.id) } }, select: { action: true, target: true } });
    const approved = new Map<string, Set<string>>();
    approvalRows.forEach((row) => approved.set(row.target, new Set([...(approved.get(row.target) ?? []), row.action])));
    const permissions = new Set(await Promise.all(['customer-service:transfer:view-outbound-time', 'customer-service:transfer:view-agent', 'customer-service:transfer:view-agent-data', 'customer-service:transfer:view-sensitive'].map(async (key) => (await this.hasPermission(principal.role, key as PermissionKey)) ? key : '')));
    return rows.filter((row) => {
      const values = approved.get(row.id);
      return values?.has('customer_service.business_data.approved') && values?.has('customer_service.agent_data.approved');
    }).map((shipment) => {
      const row = { ...shipment } as Record<string, unknown>;
      if (!permissions.has('customer-service:transfer:view-outbound-time')) delete row.outboundAt;
      if (!permissions.has('customer-service:transfer:view-agent')) { delete row.agentName; delete row.channelName; delete row.routeAgentChannelName; }
      if (!permissions.has('customer-service:transfer:view-agent-data')) delete row.agentWeightKg;
      if (!permissions.has('customer-service:transfer:view-sensitive')) { delete row.declarationRequired; delete row.sensitive; }
      return row as unknown as Shipment;
    });
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
        const updated = await this.updateShipmentOperational(principal, row.shipmentId, { transferNo, subOrderNo: row.subOrderNo?.trim() || undefined, status: 'WAITING_DEPARTURE', latestTracking: '已填写转单号，待离港' });
        await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'customer_service.transfer.fill', target: updated.id, after: { transferNo, subOrderNo: row.subOrderNo?.trim(), pushToSales: row.pushToSales === true, pushStatus: row.pushToSales ? 'PENDING' : undefined } } });
        results.push({ shipmentId: row.shipmentId, systemOrderNo: updated.systemOrderNo, success: true, shipment: updated });
      } catch (error) {
        await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'customer_service.transfer.fill_failed', target: row.shipmentId, after: { reason: error instanceof Error ? error.message : '填写失败' } } });
        results.push({ shipmentId: row.shipmentId, success: false, reason: error instanceof Error ? error.message : '填写失败' });
      }
    }
    return { results };
  }

  async getLineShipmentPool(principal: Principal, query: LineShipmentPoolQuery = {}): Promise<LineShipmentPoolResponse> {
    const allRows = (await this.getShipments(principal)).filter((shipment) => shipment.businessType === 'DEDICATED_LINE');
    const packageSummariesByShipmentId = await this.buildLineShipmentPackageSummaries(allRows);
    const shipmentIds = allRows.map((shipment) => shipment.id);
    const businessDataApprovedShipmentIds = shipmentIds.length
      ? (await this.prisma.auditLog.findMany({
          where: { action: 'customer_service.business_data.approved', target: { in: shipmentIds } },
          select: { target: true }
        })).map((row) => row.target)
      : [];
    const agentDataApprovedShipmentIds = shipmentIds.length
      ? (await this.prisma.auditLog.findMany({ where: { action: 'customer_service.agent_data.approved', target: { in: shipmentIds } }, select: { target: true } })).map((row) => row.target)
      : [];
    const afterSaleShipmentIds = shipmentIds.length
      ? (await this.prisma.auditLog.findMany({
          where: { action: 'customer_service.issue.attach' as any },
          select: { after: true }
        }))
          .flatMap((row) => {
            const after = row.after as Record<string, unknown> | null;
            return after?.originalStatusPool === 'SIGNED' && typeof after.shipmentId === 'string' && shipmentIds.includes(after.shipmentId)
              ? [after.shipmentId]
              : [];
          })
      : [];
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
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const [warehousePackages, financeItems, problemTickets] = await Promise.all([
      (this.prisma as any).warehousePackage.findMany({
        where: {
          OR: [
            { shipmentId: shipment.id },
            { systemOrderNo: shipment.systemOrderNo },
            ...(shipment.draftWarehousePackageIds?.length ? [{ id: { in: shipment.draftWarehousePackageIds } }] : [])
          ]
        },
        select: { id: true }
      }),
      (this.prisma as any).shipmentFinanceItem.findMany({ where: { shipmentId: shipment.id }, select: { id: true } }),
      this.prisma.problemTicket.findMany({ where: { shipmentId: shipment.id }, select: { id: true } })
    ]);
    const traceTargetIds = [
      shipment.id,
      ...warehousePackages.map((row: { id: string }) => row.id),
      ...financeItems.map((row: { id: string }) => row.id),
      ...problemTickets.map((row) => row.id)
    ];
    const rows = await this.prisma.auditLog.findMany({ where: { target: { in: traceTargetIds } }, orderBy: { createdAt: 'asc' } });
    const actorIds = [...new Set(rows.map((row) => row.actorId))];
    const users = actorIds.length ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true, name: true, nickname: true } }) : [];
    const actorById = new Map(users.map((user) => [user.id, user.name || user.nickname || user.username]));
    const items = [{ key: 'created', stage: '业务录单', happenedAt: shipment.createdAt.toISOString(), operator: shipment.entryBy ?? '系统', summary: '运单已创建' }, ...rows.map((row) => ({ key: row.id, stage: internalFlowStage(row.action, row.after), happenedAt: row.createdAt.toISOString(), operator: actorById.get(row.actorId) ?? '系统', summary: internalFlowSummary(row.action, row.after) }))].filter((item) => item.stage);
    return { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, items };
  }

  private async buildLineShipmentPackageSummaries(shipments: Shipment[]): Promise<Record<string, LineShipmentPackageSummary>> {
    if (!shipments.length) return {};
    const shipmentIds = shipments.map((shipment) => shipment.id);
    const systemOrderNos = shipments.map((shipment) => shipment.systemOrderNo);
    const draftPackageIds = Array.from(new Set(shipments.flatMap((shipment) => shipment.draftWarehousePackageIds ?? []).filter(Boolean)));
    const initialPackages = await (this.prisma as any).warehousePackage.findMany({
      where: {
        OR: [
          { shipmentId: { in: shipmentIds } },
          { systemOrderNo: { in: systemOrderNos } },
          { id: { in: draftPackageIds } }
        ]
      }
    });
    const initialRows = initialPackages.map(mapWarehousePackage) as WarehousePackageSummary[];
    const initialIds = initialRows.map((pkg) => pkg.id);
    const relationIds = Array.from(new Set(initialRows.flatMap((pkg) => [pkg.sourcePackageId, pkg.archivedByPackageId]).filter(Boolean)));
    const tallyTaskIds = Array.from(new Set(initialRows.map((pkg) => pkg.tallyTaskId).filter(Boolean)));
    const relatedPackages = initialIds.length
      ? await (this.prisma as any).warehousePackage.findMany({
          where: {
            OR: [
              { id: { in: relationIds } },
              { sourcePackageId: { in: initialIds } },
              { archivedByPackageId: { in: initialIds } },
              { tallyTaskId: { in: tallyTaskIds } }
            ]
          }
        })
      : [];
    const packagesById = new Map<string, WarehousePackageSummary>();
    [...initialPackages, ...relatedPackages]
      .map(mapWarehousePackage)
      .forEach((pkg: WarehousePackageSummary) => packagesById.set(pkg.id, pkg));
    return buildLineShipmentPackageSummaries(shipments, Array.from(packagesById.values()));
  }

  async getMasterData(): Promise<MasterDataSnapshot> {
    const [customers, contacts, customerUsers, carriers, channels, channelCategories, roles, agents, agentChannels, surcharges, fuelRates, exchangeRates] = await Promise.all([
      this.prisma.customer.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.customerContact.findMany({ include: { customer: true }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { customerId: { not: null }, role: { name: 'CUSTOMER' } }, include: { customer: true }, orderBy: { username: 'asc' } }),
      this.prisma.carrier.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.channel.findMany({ include: { carrier: true }, orderBy: { name: 'asc' } }),
      this.prisma.channelCategory.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.role.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.agent.findMany({ orderBy: [{ createdAt: 'desc' } as any, { name: 'asc' }] }),
      this.prisma.agentChannel.findMany({ include: { agent: true }, orderBy: [{ agent: { name: 'asc' } }, { channelName: 'asc' }] }),
      this.prisma.surcharge.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.fuelRate.findMany({ orderBy: { activeAt: 'desc' } }),
      (this.prisma as any).exchangeRate.findMany({ orderBy: { activeAt: 'desc' } })
    ]);
    const channelMap = new Map(channels.map((channel) => [channel.id, channel.name]));

    return {
      customers: customers.map((customer) => ({
        id: customer.id,
        code: customer.code,
        name: customer.name,
        shortName: customer.name,
        fullName: `${customer.name} Co., Ltd.`,
        customerType: '直客',
        customerSource: (customer as any).customerSource ?? undefined,
        salesperson: customer.salesperson ?? '',
        defaultSettlementMethod: (customer as any).defaultSettlementMethod ?? undefined,
        enabled: customer.enabled
      })),
      contacts: contacts.map((contact) => ({
        id: contact.id,
        customerId: contact.customerId,
        customerName: `${contact.customer.code}-${contact.customer.name}`,
        name: contact.name,
        company: contact.company ?? undefined,
        phone: contact.phone ?? undefined,
        email: contact.email ?? undefined,
        fbaWarehouseCode: contact.fbaWarehouseCode ?? undefined,
        address: contact.address ?? undefined,
        country: contact.country ?? undefined,
        state: contact.state ?? undefined,
        postalCode: contact.postalCode ?? undefined,
        enabled: contact.enabled
      })),
      customerUsers: customerUsers.map((user) => ({
        id: user.id,
        customerId: user.customerId!,
        customerName: user.customer ? `${user.customer.code}-${user.customer.name}` : user.customerId!,
        username: user.username,
        enabled: user.enabled
      })),
      carriers: carriers.map((carrier) => ({
        id: carrier.id,
        name: carrier.name,
        enabled: carrier.enabled
      })),
      channelCategories: channelCategories.map((category) => mapChannelCategory(category)),
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        carrierId: channel.carrierId,
        carrierName: channel.carrier.name,
        businessType: (channel.businessType ?? 'EXPRESS') as BusinessType,
        category: channel.category ?? channel.carrier.name,
        volumeDivisor: channel.volumeDivisor,
        multiPieceWeightRule: channel.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
        singleWeightRoundingRule: channel.singleWeightRoundingRule ?? channel.roundingRule ?? 'ACTUAL',
        settlementWeightRule: channel.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
        settlementWeightRoundingRule: channel.settlementWeightRoundingRule ?? channel.roundingRule ?? 'NONE',
        largeCargoThresholdKg: channel.largeCargoThresholdKg === null ? undefined : Number(channel.largeCargoThresholdKg),
        remoteAreaRule: channel.remoteAreaRule ?? 'NONE',
        enabled: channel.enabled
      })),
      agents: agents.map((agent) => ({
        id: agent.id,
        code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
        shortName: agent.shortName ?? agent.name,
        name: agent.name,
        createdAt: ((agent as any).createdAt instanceof Date ? (agent as any).createdAt : new Date()).toISOString(),
        integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
        settlementCycle: normalizeAgentSettlementCycle(agent.settlementCycle),
        warehouseAddress1: agent.warehouseAddress1 ?? undefined,
        warehouseAddress2: agent.warehouseAddress2 ?? undefined,
        warehouseAddress3: agent.warehouseAddress3 ?? undefined,
        warehouseContact: agent.warehouseContact ?? undefined,
        invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
        invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
        trackingWebsite: (agent as any).trackingWebsite ?? undefined,
        enabled: agent.enabled
      })),
      agentChannels: agentChannels.map((channel) => mapAgentChannel(channel)),
      surcharges: surcharges.map((surcharge) => ({
        id: surcharge.id,
        name: surcharge.name,
        amount: Number(surcharge.amount),
        enabled: surcharge.enabled
      })),
      fuelRates: fuelRates.map((fuelRate) => ({
        id: fuelRate.id,
        channelId: fuelRate.channelId,
        channelName: channelMap.get(fuelRate.channelId) ?? fuelRate.channelId,
        rate: Number(fuelRate.rate),
        activeAt: fuelRate.activeAt.toISOString()
      })),
      exchangeRates: exchangeRates.map((exchangeRate: any) => ({
        id: exchangeRate.id,
        baseCurrency: exchangeRate.baseCurrency,
        quoteCurrency: exchangeRate.quoteCurrency,
        rate: Number(exchangeRate.rate),
        activeAt: exchangeRate.activeAt.toISOString(),
        endAt: exchangeRate.endAt?.toISOString(),
        enabled: exchangeRate.enabled
      })),
      roles: roles.map((role) => role.name)
    };
  }

  async getPricingAgentNames(): Promise<string[]> {
    const agents = await this.prisma.agent.findMany({ select: { name: true, shortName: true, code: true } });
    return Array.from(new Set(agents.flatMap((agent) => [agent.name, agent.shortName, agent.code])
      .map((name) => String(name ?? '').trim())
      .filter((name) => name.length >= 2)));
  }

  async createCustomer(principal: Principal, input: CustomerCreateInput): Promise<CustomerSummary> {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    const code = input.code.trim();
    const existing = await this.prisma.customer.findFirst({ where: { code } });
    if (existing) {
      throw new BadRequestException('客户代码已存在');
    }
    const salesperson = await this.resolveCustomerSalespersonAssignment(principal, input.salesperson);
    const { customer, summary } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          id: `c-${code}`,
          code,
          name: input.name.trim(),
          customerSource: input.customerSource?.trim() || null,
          salesperson: salesperson ?? null,
          defaultSettlementMethod: input.defaultSettlementMethod?.trim() || null
        }
      });
      await tx.customerAccount.create({
        data: { id: `ca-${created.code}-cny`, customerId: created.id, balance: 0, currency: 'RMB' }
      });
      const site = salesperson
        ? (await tx.user.findUnique({ where: { username: salesperson }, select: { site: true } }))?.site?.trim() || null
        : null;
      const pendingPackages = await (tx as any).warehousePackage.findMany({
        where: { customerCode: code, salesperson: null, shipmentId: null },
        select: { id: true }
      });
      if (pendingPackages.length) {
        await (tx as any).warehousePackage.updateMany({
          where: { id: { in: pendingPackages.map((pkg: { id: string }) => pkg.id) } },
          data: { customerName: `${created.code}-${created.name}`, salesperson: salesperson ?? null, site }
        });
      }
      const createdSummary = {
        id: created.id,
        code: created.code,
        name: created.name,
        shortName: input.shortName?.trim() || created.name,
        fullName: input.fullName?.trim() || `${created.name} Co., Ltd.`,
        customerType: input.customerType?.trim() || '直客',
        customerSource: input.customerSource?.trim() || undefined,
        salesperson: created.salesperson ?? '',
        defaultSettlementMethod: input.defaultSettlementMethod?.trim() || undefined,
        enabled: created.enabled
      };
      await tx.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer.create', target: created.id, after: JSON.parse(JSON.stringify(createdSummary)) } });
      if (pendingPackages.length) {
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'master_data.customer.match_pending_packages',
            target: created.id,
            after: toAuditJson({
              customerCode: created.code,
              customerName: `${created.code}-${created.name}`,
              salesperson: created.salesperson ?? null,
              packageIds: pendingPackages.map((pkg: { id: string }) => pkg.id),
              matchedPackageCount: pendingPackages.length
            })
          }
        });
      }
      return { customer: created, summary: createdSummary };
    });
    return summary;
  }

  async updateCustomer(principal: Principal, id: string, input: CustomerUpdateInput): Promise<CustomerSummary> {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    const code = input.code.trim();
    const duplicate = await this.prisma.customer.findFirst({ where: { code, NOT: { id } } });
    if (duplicate) {
      throw new BadRequestException('客户代码已存在');
    }
    const before = await this.prisma.customer.findUnique({ where: { id } });
    this.ensureCustomerMasterAccess(principal, before);
    const salesperson = await this.resolveCustomerSalespersonAssignment(principal, input.salesperson, before?.salesperson ?? undefined);
    const assignmentChanged = before?.salesperson !== (salesperson ?? null);
    const { customer, affectedShipmentCount, affectedPackageCount, affectedWaterReceiptCount } = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: {
          code,
          name: input.name.trim(),
          customerSource: input.customerSource?.trim() || null,
          salesperson: salesperson ?? null,
          defaultSettlementMethod: input.defaultSettlementMethod?.trim() || null,
          enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
        }
      });
      const affectedShipmentCount = assignmentChanged ? await tx.shipment.count({ where: { customerId: id } }) : 0;
      const packageCustomerCodes = Array.from(new Set([before?.code, code].filter(Boolean))) as string[];
      const affectedPackageCount = assignmentChanged
        ? (await tx.warehousePackage.updateMany({ where: { customerCode: { in: packageCustomerCodes } }, data: { salesperson: salesperson ?? null } })).count
        : 0;
      const affectedWaterReceiptCount = assignmentChanged
        ? (await (tx as any).waterReceipt.updateMany({ where: { customerId: id }, data: { salesperson: salesperson ?? null } })).count
        : 0;
      const summary = {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        shortName: input.shortName?.trim() || updated.name,
        fullName: input.fullName?.trim() || `${updated.name} Co., Ltd.`,
        customerType: input.customerType?.trim() || '直客',
        customerSource: input.customerSource?.trim() || undefined,
        salesperson: updated.salesperson ?? '',
        defaultSettlementMethod: input.defaultSettlementMethod?.trim() || undefined,
        enabled: updated.enabled
      };
      await tx.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer.update', target: id, before: before ? JSON.parse(JSON.stringify(before)) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
      if (assignmentChanged) {
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'master_data.customer.assign_salesperson',
            target: id,
            before: { customerId: before?.id, customerCode: before?.code, customerName: before?.name, salesperson: before?.salesperson },
            after: { customerId: updated.id, customerCode: updated.code, customerName: updated.name, salesperson: updated.salesperson, affectedShipmentCount, affectedPackageCount, affectedWaterReceiptCount }
          }
        });
      }
      return { customer: updated, affectedShipmentCount, affectedPackageCount, affectedWaterReceiptCount };
    });
    const summary = {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      shortName: input.shortName?.trim() || customer.name,
      fullName: input.fullName?.trim() || `${customer.name} Co., Ltd.`,
      customerType: input.customerType?.trim() || '直客',
      customerSource: input.customerSource?.trim() || undefined,
      salesperson: customer.salesperson ?? '',
      defaultSettlementMethod: input.defaultSettlementMethod?.trim() || undefined,
      enabled: customer.enabled
    };
    return summary;
  }

  async createCustomerContact(principal: Principal, customerId: string, input: CustomerContactCreateInput): Promise<CustomerContactSummary> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    this.ensureCustomerMasterAccess(principal, customer);
    if (!input.name?.trim()) {
      throw new BadRequestException('联系人名称不能为空');
    }
    const duplicate = await this.prisma.customerContact.findFirst({
      where: {
        customerId,
        enabled: true,
        name: input.name.trim(),
        company: input.company?.trim() || null,
        phone: input.phone?.trim() || null,
        fbaWarehouseCode: input.fbaWarehouseCode?.trim() || null,
        address: input.address?.trim() || null,
        country: input.country?.trim() || null,
        state: input.state?.trim() || null,
        postalCode: input.postalCode?.trim() || null
      }
    });
    if (duplicate) {
      throw new BadRequestException('相同收货人地址已存在');
    }
    const contact = await this.prisma.customerContact.create({
      data: {
        customerId,
        name: input.name.trim(),
        company: input.company?.trim() || null,
        phone: input.phone?.trim(),
        email: input.email?.trim(),
        fbaWarehouseCode: input.fbaWarehouseCode?.trim() || null,
        address: input.address?.trim() || null,
        country: input.country?.trim() || null,
        state: input.state?.trim() || null,
        postalCode: input.postalCode?.trim() || null
      }
    });
    const summary = {
      id: contact.id,
      customerId,
      customerName: `${customer.code}-${customer.name}`,
      name: contact.name,
      company: contact.company ?? undefined,
      phone: contact.phone ?? undefined,
      email: contact.email ?? undefined,
      fbaWarehouseCode: contact.fbaWarehouseCode ?? undefined,
      address: contact.address ?? undefined,
      country: contact.country ?? undefined,
      state: contact.state ?? undefined,
      postalCode: contact.postalCode ?? undefined,
      enabled: contact.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer_contact.create', target: contact.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateCustomerContact(principal: Principal, customerId: string, contactId: string, input: CustomerContactUpdateInput): Promise<CustomerContactSummary> {
    const before = await this.prisma.customerContact.findFirst({ where: { id: contactId, customerId }, include: { customer: true } });
    if (!before) {
      throw new BadRequestException('收货人不存在');
    }
    this.ensureCustomerMasterAccess(principal, before.customer);
    if (!input.name?.trim()) {
      throw new BadRequestException('联系人名称不能为空');
    }
    const contact = await this.prisma.customerContact.update({
      where: { id: contactId },
      data: {
        name: input.name.trim(),
        company: input.company?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        fbaWarehouseCode: input.fbaWarehouseCode?.trim() || null,
        address: input.address?.trim() || null,
        country: input.country?.trim() || null,
        state: input.state?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : before.enabled
      },
      include: { customer: true }
    });
    const summary = {
      id: contact.id,
      customerId,
      customerName: `${contact.customer.code}-${contact.customer.name}`,
      name: contact.name,
      company: contact.company ?? undefined,
      phone: contact.phone ?? undefined,
      email: contact.email ?? undefined,
      fbaWarehouseCode: contact.fbaWarehouseCode ?? undefined,
      address: contact.address ?? undefined,
      country: contact.country ?? undefined,
      state: contact.state ?? undefined,
      postalCode: contact.postalCode ?? undefined,
      enabled: contact.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer_contact.update', target: contact.id, before: JSON.parse(JSON.stringify(before)), after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async createCustomerUser(principal: Principal, customerId: string, input: CustomerUserCreateInput): Promise<CustomerUserSummary> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    this.ensureCustomerMasterAccess(principal, customer);
    if (!input.username?.trim() || !input.password?.trim()) {
      throw new BadRequestException('账号和密码不能为空');
    }
    const role = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!role) {
      throw new BadRequestException('客户角色不存在');
    }
    const user = await this.prisma.user.create({
      data: {
        id: `u-${input.username.trim()}`,
        username: input.username.trim(),
        passwordHash: hashPassword(input.password),
        roleId: role.id,
        customerId
      }
    });
    const summary = {
      id: user.id,
      customerId,
      customerName: `${customer.code}-${customer.name}`,
      username: user.username,
      enabled: user.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer_user.create', target: user.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateCustomerEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<CustomerSummary> {
    const before = await this.prisma.customer.findUnique({ where: { id } });
    this.ensureCustomerMasterAccess(principal, before);
    const customer = await this.prisma.customer.update({ where: { id }, data: { enabled: input.enabled === true } });
    const summary = {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      shortName: customer.name,
      fullName: `${customer.name} Co., Ltd.`,
      customerType: '直客',
      customerSource: customer.customerSource ?? undefined,
      salesperson: customer.salesperson ?? '',
      defaultSettlementMethod: customer.defaultSettlementMethod ?? undefined,
      enabled: customer.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer.update', target: id, before: before ? JSON.parse(JSON.stringify(before)) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async deleteCustomer(principal: Principal, id: string): Promise<CustomerSummary> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    this.ensureCustomerMasterAccess(principal, customer);
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const [shipmentCount, receiptCount, statementCount, userCount, nonZeroAccountCount] = await Promise.all([
      this.prisma.shipment.count({ where: { customerId: id } }),
      this.prisma.waterReceipt.count({ where: { customerId: id } }),
      this.prisma.customerStatement.count({ where: { customerId: id } }),
      this.prisma.user.count({ where: { customerId: id } }),
      this.prisma.customerAccount.count({ where: { customerId: id, NOT: { balance: 0 } } })
    ]);
    if (shipmentCount || receiptCount || statementCount || userCount || nonZeroAccountCount) {
      throw new BadRequestException('该客户存在运单、财务记录、客户账号或账户余额，不能删除，请使用停用');
    }
    const summary = {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      shortName: customer.name,
      fullName: `${customer.name} Co., Ltd.`,
      customerType: '直客',
      customerSource: customer.customerSource ?? undefined,
      salesperson: customer.salesperson ?? '',
      defaultSettlementMethod: customer.defaultSettlementMethod ?? undefined,
      enabled: customer.enabled
    };
    await this.prisma.$transaction([
      this.prisma.customerContact.deleteMany({ where: { customerId: id } }),
      this.prisma.customerAccount.deleteMany({ where: { customerId: id } }),
      this.prisma.customer.delete({ where: { id } }),
      this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer.delete', target: id, before: JSON.parse(JSON.stringify(summary)) } })
    ]);
    return summary;
  }

  async createAgent(principal: Principal, input: AgentCreateInput): Promise<AgentSummary> {
    if (!input.name?.trim()) {
      throw new BadRequestException('代理详细公司名不能为空');
    }
    const shortName = input.shortName?.trim() || input.name.trim();
    const settlementCycle = normalizeAgentSettlementCycle(input.settlementCycle);
    if (input.settlementCycle !== undefined && !settlementCycle) {
      throw new BadRequestException('代理账期仅支持周结、月结或单票结算');
    }
    const normalizedShortName = shortName.toLowerCase();
    const existingAgents = await this.prisma.agent.findMany({ select: { name: true, shortName: true } });
    if (existingAgents.some((item) => (item.shortName ?? item.name).trim().toLowerCase() === normalizedShortName)) {
      throw new BadRequestException(`代理简称“${shortName}”已存在，不允许重复录入`);
    }
    const agent = await this.prisma.agent.create({
      data: {
        id: `a-${slug(input.name)}`,
        name: input.name.trim(),
        code: input.code?.trim() || input.name.trim().toUpperCase().slice(0, 6),
        shortName,
        integrationType: input.integrationType ?? 'MANUAL',
        settlementCycle: settlementCycle ?? null,
        warehouseAddress1: input.warehouseAddress1?.trim() || null,
        warehouseAddress2: input.warehouseAddress2?.trim() || null,
        warehouseAddress3: input.warehouseAddress3?.trim() || null,
        warehouseContact: input.warehouseContact?.trim() || null,
        invoiceTemplateName: input.invoiceTemplateName?.trim() || null,
        invoiceTemplateUrl: input.invoiceTemplateUrl?.trim() || null,
        trackingWebsite: input.trackingWebsite?.trim() || null
      } as any
    });
    const summary = {
      id: agent.id,
      code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
      shortName: agent.shortName ?? agent.name,
      name: agent.name,
      createdAt: ((agent as any).createdAt instanceof Date ? (agent as any).createdAt : new Date()).toISOString(),
      integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
      settlementCycle: normalizeAgentSettlementCycle((agent as any).settlementCycle),
      warehouseAddress1: agent.warehouseAddress1 ?? undefined,
      warehouseAddress2: agent.warehouseAddress2 ?? undefined,
      warehouseAddress3: agent.warehouseAddress3 ?? undefined,
      warehouseContact: agent.warehouseContact ?? undefined,
      invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
      invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
      trackingWebsite: (agent as any).trackingWebsite ?? undefined,
      enabled: agent.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.agent.create', target: agent.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateAgent(principal: Principal, id: string, input: AgentUpdateInput): Promise<AgentSummary> {
    if (!input.name?.trim()) {
      throw new BadRequestException('代理详细公司名不能为空');
    }
    const before = await this.prisma.agent.findUnique({ where: { id } });
    const shortName = input.shortName?.trim() || input.name.trim();
    const settlementCycle = normalizeAgentSettlementCycle(input.settlementCycle);
    if (input.settlementCycle !== undefined && !settlementCycle) {
      throw new BadRequestException('代理账期仅支持周结、月结或单票结算');
    }
    const normalizedShortName = shortName.toLowerCase();
    const currentNormalizedShortName = (before?.shortName ?? before?.name ?? '').trim().toLowerCase();
    if (normalizedShortName !== currentNormalizedShortName) {
      const existingAgents = await this.prisma.agent.findMany({
        where: { id: { not: id } },
        select: { name: true, shortName: true }
      });
      if (existingAgents.some((item) => (item.shortName ?? item.name).trim().toLowerCase() === normalizedShortName)) {
        throw new BadRequestException(`代理简称“${shortName}”已存在，不允许重复录入`);
      }
    }
    const agent = await this.prisma.agent.update({
      where: { id },
      data: {
        name: input.name.trim(),
        code: input.code?.trim() || undefined,
        shortName,
        integrationType: input.integrationType ?? undefined,
        settlementCycle: settlementCycle ?? null,
        warehouseAddress1: input.warehouseAddress1?.trim() || null,
        warehouseAddress2: input.warehouseAddress2?.trim() || null,
        warehouseAddress3: input.warehouseAddress3?.trim() || null,
        warehouseContact: input.warehouseContact?.trim() || null,
        invoiceTemplateName: input.invoiceTemplateName?.trim() || null,
        invoiceTemplateUrl: input.invoiceTemplateUrl?.trim() || null,
        trackingWebsite: input.trackingWebsite?.trim() || null,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
      } as any
    });
    const summary = {
      id: agent.id,
      code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
      shortName: agent.shortName ?? agent.name,
      name: agent.name,
      createdAt: ((agent as any).createdAt instanceof Date ? (agent as any).createdAt : new Date()).toISOString(),
      integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
      settlementCycle: normalizeAgentSettlementCycle((agent as any).settlementCycle),
      warehouseAddress1: agent.warehouseAddress1 ?? undefined,
      warehouseAddress2: agent.warehouseAddress2 ?? undefined,
      warehouseAddress3: agent.warehouseAddress3 ?? undefined,
      warehouseContact: agent.warehouseContact ?? undefined,
      invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
      invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
      trackingWebsite: (agent as any).trackingWebsite ?? undefined,
      enabled: agent.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.agent.update', target: id, before: before ? JSON.parse(JSON.stringify(before)) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateAgentEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<AgentSummary> {
    const before = await this.prisma.agent.findUnique({ where: { id } });
    const agent = await this.prisma.agent.update({ where: { id }, data: { enabled: input.enabled === true } });
    const summary = {
      id: agent.id,
      code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
      shortName: agent.shortName ?? agent.name,
      name: agent.name,
      createdAt: ((agent as any).createdAt instanceof Date ? (agent as any).createdAt : new Date()).toISOString(),
      integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
      settlementCycle: normalizeAgentSettlementCycle((agent as any).settlementCycle),
      warehouseAddress1: agent.warehouseAddress1 ?? undefined,
      warehouseAddress2: agent.warehouseAddress2 ?? undefined,
      warehouseAddress3: agent.warehouseAddress3 ?? undefined,
      warehouseContact: agent.warehouseContact ?? undefined,
      invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
      invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
      trackingWebsite: (agent as any).trackingWebsite ?? undefined,
      enabled: agent.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.agent.update', target: id, before: before ? JSON.parse(JSON.stringify(before)) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async deleteAgents(principal: Principal, ids: string[]): Promise<AgentDeleteResponse> {
    const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (!uniqueIds.length) {
      throw new BadRequestException('请选择代理资料');
    }
    const rows = await this.prisma.agent.findMany({ where: { id: { in: uniqueIds } } });
    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException('代理不存在');
    }
    const summaries = rows.map((agent) => ({
      id: agent.id,
      code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
      shortName: agent.shortName ?? agent.name,
      name: agent.name,
      createdAt: ((agent as any).createdAt instanceof Date ? (agent as any).createdAt : new Date()).toISOString(),
      integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
      settlementCycle: normalizeAgentSettlementCycle((agent as any).settlementCycle),
      warehouseAddress1: agent.warehouseAddress1 ?? undefined,
      warehouseAddress2: agent.warehouseAddress2 ?? undefined,
      warehouseAddress3: agent.warehouseAddress3 ?? undefined,
      warehouseContact: agent.warehouseContact ?? undefined,
      invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
      invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
      trackingWebsite: (agent as any).trackingWebsite ?? undefined,
      enabled: agent.enabled
    }));
    const identityValues = (agent: Pick<AgentSummary, 'id' | 'name' | 'shortName' | 'code'>) =>
      Array.from(new Set([agent.id, agent.name, agent.shortName, agent.code].map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
    const referenceResults = await Promise.all(summaries.map(async (agent) => {
      const names = identityValues(agent);
      const [agentBanks, payeeBanks] = await Promise.all([
        (this.prisma as any).agentBankAccount.findMany({ where: { OR: [{ agentId: agent.id }, { agentName: { in: names } }] }, select: { id: true } }),
        (this.prisma as any).payeeBankAccount.findMany({ where: { OR: [{ agentId: agent.id }, { agentName: { in: names } }] }, select: { id: true } })
      ]);
      const bankIds = [...agentBanks, ...payeeBanks].map((bank) => bank.id);
      const [
        shipmentCount,
        priceBookCount,
        priceBookImportJobCount,
        financeItemCount,
        pendingPaymentCount,
        paymentApplicationCount,
        paymentVoucherCount,
        agentStatementCount,
        paymentCount
      ] = await Promise.all([
        this.prisma.shipment.count({ where: { agentId: agent.id } }),
        (this.prisma as any).priceBook.count({ where: { deletedAt: null, OR: [{ agentId: agent.id }, { AND: [{ agentId: null }, { agentShortName: { in: names } }] }] } }),
        (this.prisma as any).priceBookImportJob.count({
          where: {
            status: { in: ['PENDING', 'IMPORTING'] },
            OR: [{ agentId: agent.id }, { AND: [{ agentId: null }, { agentShortName: { in: names } }] }]
          }
        }),
        (this.prisma as any).shipmentFinanceItem.count({ where: { agentName: { in: names } } }),
        (this.prisma as any).payablePaymentApplication.count({ where: { OR: [{ agentBankAccountId: { in: bankIds } }, { payeeBankAccountId: { in: bankIds } }] } }),
        (this.prisma as any).paymentApplication.count({ where: { OR: [{ agentName: { in: names } }, { payeeBankAccountId: { in: bankIds } }] } }),
        (this.prisma as any).paymentVoucher.count({ where: { OR: [{ agentName: { in: names } }, { extraFeeAgentName: { in: names } }] } }),
        (this.prisma as any).agentStatement.count({ where: { agentId: agent.id } }),
        (this.prisma as any).payment.count({ where: { partyType: 'AGENT', partyId: { in: [agent.id, ...names] } } })
      ]);
      const reasonEntries: Array<[string, number]> = [
        ['运单引用', shipmentCount],
        ['价格表引用', priceBookCount],
        ['进行中的价格表导入任务引用', priceBookImportJobCount],
        ['应付/业务成本引用', financeItemCount],
        ['待付款记录引用', pendingPaymentCount],
        ['付款申请引用', paymentApplicationCount],
        ['付款水单引用', paymentVoucherCount],
        ['代理账单引用', agentStatementCount],
        ['付款记录引用', paymentCount]
      ];
      return { agent, reasons: reasonEntries.filter(([, count]) => count > 0).map(([reason]) => reason) };
    }));
    const failures = referenceResults
      .filter((item) => item.reasons.length > 0)
      .map(({ agent, reasons }) => ({ id: agent.id, shortName: agent.shortName, name: agent.name, reasons }));
    if (failures.length) {
      const failureText = failures
        .map((failure) => `${failure.shortName ?? failure.name ?? failure.id}（${failure.reasons.join('、')}）`)
        .join('；');
      throw new BadRequestException(`代理资料存在业务引用，不能删除：${failureText}`);
    }
    const deletedAgents = referenceResults.filter((item) => item.reasons.length === 0).map((item) => item.agent);
    const agentIds = deletedAgents.map((agent) => agent.id);
    const agentNames = Array.from(new Set(deletedAgents.flatMap(identityValues)));
    const conflictingAgents = await this.prisma.agent.findMany({
      where: {
        id: { notIn: agentIds },
        OR: [{ id: { in: agentNames } }, { name: { in: agentNames } }, { shortName: { in: agentNames } }, { code: { in: agentNames } }]
      }
    });
    const conflictingNames = new Set(conflictingAgents.flatMap((agent) => identityValues({
      id: agent.id,
      code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
      shortName: agent.shortName ?? agent.name,
      name: agent.name
    })));
    const safeAgentNames = agentNames.filter((name) => !conflictingNames.has(name));
    const deletedAt = new Date().toISOString();
    await this.prisma.$transaction([
      (this.prisma as any).agentChannel.deleteMany({ where: { agentId: { in: agentIds } } }),
      (this.prisma as any).agentBankAccount.deleteMany({ where: { OR: [{ agentId: { in: agentIds } }, ...(safeAgentNames.length ? [{ agentName: { in: safeAgentNames } }] : [])] } }),
      (this.prisma as any).payeeBankAccount.deleteMany({ where: { OR: [{ agentId: { in: agentIds } }, ...(safeAgentNames.length ? [{ agentName: { in: safeAgentNames } }] : [])] } }),
      this.prisma.agent.deleteMany({ where: { id: { in: agentIds } } }),
      this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'master_data.agent.delete',
          target: 'master-data/agents',
          before: JSON.parse(JSON.stringify({ agents: deletedAgents, failures })),
          after: JSON.parse(JSON.stringify({
            deletedCount: deletedAgents.length,
            agentIds,
            agentShortNames: deletedAgents.map((agent) => agent.shortName ?? agent.name),
            hardDelete: true,
            deletedAt
          }))
        }
      })
    ]);
    return { successCount: deletedAgents.length, deletedAgents, failures, hardDelete: true };
  }

  async createAgentChannel(principal: Principal, input: AgentChannelCreateInput): Promise<AgentChannelSummary> {
    if (!(await this.hasPermission(principal.role, 'master-data:agent-channels:create'))) {
      throw new ForbiddenException('没有新增代理渠道权限');
    }
    if (!input.channelName?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    const agent = await this.prisma.agent.findUnique({ where: { id: input.agentId } });
    if (!agent) {
      throw new BadRequestException('代理不存在');
    }
    const channel = await this.prisma.agentChannel.create({
      data: {
        id: `ach-${slug(`${agent.id}-${input.channelName}`)}`,
        agentId: agent.id,
        channelName: input.channelName.trim()
      },
      include: { agent: true }
    });
    const summary = mapAgentChannel(channel);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.agent_channel.create', target: channel.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateAgentChannel(principal: Principal, id: string, input: AgentChannelUpdateInput): Promise<AgentChannelSummary> {
    if (!input.channelName?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    const agent = await this.prisma.agent.findUnique({ where: { id: input.agentId } });
    if (!agent) {
      throw new BadRequestException('代理不存在');
    }
    const before = await this.prisma.agentChannel.findUnique({ where: { id }, include: { agent: true } });
    const channel = await this.prisma.agentChannel.update({
      where: { id },
      data: {
        agentId: agent.id,
        channelName: input.channelName.trim(),
        enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
      },
      include: { agent: true }
    });
    const summary = mapAgentChannel(channel);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.agent_channel.update', target: id, before: before ? JSON.parse(JSON.stringify(mapAgentChannel(before))) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateAgentChannelEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<AgentChannelSummary> {
    const before = await this.prisma.agentChannel.findUnique({ where: { id }, include: { agent: true } });
    const channel = await this.prisma.agentChannel.update({
      where: { id },
      data: { enabled: input.enabled === true },
      include: { agent: true }
    });
    const summary = mapAgentChannel(channel);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.agent_channel.update', target: id, before: before ? JSON.parse(JSON.stringify(mapAgentChannel(before))) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async deleteAgentChannel(principal: Principal, id: string): Promise<AgentChannelSummary> {
    const before = await this.prisma.agentChannel.findUnique({ where: { id }, include: { agent: true } });
    if (!before) {
      throw new BadRequestException('代理渠道不存在');
    }
    const summary = mapAgentChannel(before);
    await this.prisma.$transaction([
      this.prisma.agentChannel.delete({ where: { id } }),
      this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.agent_channel.delete', target: id, before: JSON.parse(JSON.stringify(summary)) } })
    ]);
    return summary;
  }

  async createCarrier(_principal: Principal, input: CarrierCreateInput): Promise<CarrierSummary> {
    const carrier = await this.prisma.carrier.create({ data: { id: `cr-${slug(input.name)}`, name: input.name.trim() } });
    return { id: carrier.id, name: carrier.name, enabled: carrier.enabled };
  }

  async updateCarrierEnabled(_principal: Principal, id: string, input: EnabledUpdateInput): Promise<CarrierSummary> {
    const carrier = await this.prisma.carrier.update({ where: { id }, data: { enabled: input.enabled === true } });
    return { id: carrier.id, name: carrier.name, enabled: carrier.enabled };
  }

  async createChannel(principal: Principal, input: ChannelCreateInput): Promise<ChannelSummary> {
    const carrierName = input.carrierName?.trim();
    const carrier = input.carrierId
      ? await this.prisma.carrier.findUnique({ where: { id: input.carrierId } })
      : carrierName
        ? (await this.prisma.carrier.findFirst({ where: { name: carrierName } })) ?? await this.prisma.carrier.create({ data: { id: `cr-${slug(carrierName)}`, name: carrierName } })
        : null;
    if (!carrier) {
      throw new BadRequestException('承运商不存在');
    }
    if (!input.name?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    const channel = await this.prisma.channel.create({
      data: {
        id: `ch-${slug(input.name)}`,
        name: input.name.trim(),
        carrierId: carrier.id,
        businessType: input.businessType ?? 'EXPRESS',
        category: input.category?.trim() || carrier.name,
        volumeDivisor: input.volumeDivisor ?? 5000,
        multiPieceWeightRule: input.multiPieceWeightRule?.trim() || 'SUM_THEN_COMPARE',
        singleWeightRoundingRule: input.singleWeightRoundingRule?.trim() || 'ACTUAL',
        settlementWeightRule: input.settlementWeightRule?.trim() || 'MAX_ACTUAL_VOLUME',
        settlementWeightRoundingRule: input.settlementWeightRoundingRule?.trim() || 'NONE',
        largeCargoThresholdKg: input.largeCargoThresholdKg,
        remoteAreaRule: input.remoteAreaRule?.trim() || 'NONE'
      },
      include: { carrier: true }
    });
    const summary = mapChannel(channel);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.channel.create', target: channel.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateChannel(principal: Principal, id: string, input: ChannelUpdateInput): Promise<ChannelSummary> {
    const carrier = await this.prisma.carrier.findUnique({ where: { id: input.carrierId } });
    if (!carrier) {
      throw new BadRequestException('承运商不存在');
    }
    if (!input.name?.trim()) {
      throw new BadRequestException('渠道名称不能为空');
    }
    const before = await this.prisma.channel.findUnique({ where: { id }, include: { carrier: true } });
    const channel = await this.prisma.channel.update({
      where: { id },
      data: {
        name: input.name.trim(),
        carrierId: carrier.id,
        businessType: input.businessType ?? 'EXPRESS',
        category: input.category?.trim() || carrier.name,
        volumeDivisor: input.volumeDivisor ?? 5000,
        multiPieceWeightRule: input.multiPieceWeightRule?.trim() || 'SUM_THEN_COMPARE',
        singleWeightRoundingRule: input.singleWeightRoundingRule?.trim() || 'ACTUAL',
        settlementWeightRule: input.settlementWeightRule?.trim() || 'MAX_ACTUAL_VOLUME',
        settlementWeightRoundingRule: input.settlementWeightRoundingRule?.trim() || 'NONE',
        largeCargoThresholdKg: input.largeCargoThresholdKg,
        remoteAreaRule: input.remoteAreaRule?.trim() || 'NONE',
        ...(input.enabled !== undefined ? { enabled: input.enabled === true } : {})
      },
      include: { carrier: true }
    });
    const summary = mapChannel(channel);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.channel.update', target: id, before: before ? JSON.parse(JSON.stringify(mapChannel(before))) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateChannelEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<ChannelSummary> {
    const before = await this.prisma.channel.findUnique({ where: { id }, include: { carrier: true } });
    const channel = await this.prisma.channel.update({ where: { id }, data: { enabled: input.enabled === true }, include: { carrier: true } });
    const summary = mapChannel(channel);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.channel.update', target: id, before: before ? JSON.parse(JSON.stringify(mapChannel(before))) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async deleteChannel(principal: Principal, id: string): Promise<ChannelSummary> {
    const before = await this.prisma.channel.findUnique({ where: { id }, include: { carrier: true } });
    if (!before) {
      throw new BadRequestException('渠道不存在');
    }
    const [shipmentCount, pricingRuleCount, fuelRateCount] = await Promise.all([
      this.prisma.shipment.count({ where: { channelId: id } }),
      this.prisma.pricingRule.count({ where: { channelId: id } }),
      this.prisma.fuelRate.count({ where: { channelId: id } })
    ]);
    const reasons = [
      shipmentCount ? '运单引用' : '',
      pricingRuleCount ? '报价规则引用' : '',
      fuelRateCount ? '燃油费率引用' : ''
    ].filter(Boolean);
    if (reasons.length) {
      throw new BadRequestException(`该公司渠道存在${reasons.join('、')}，不能删除`);
    }
    const summary = mapChannel(before);
    await this.prisma.$transaction([
      this.prisma.channel.delete({ where: { id } }),
      this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.channel.delete', target: id, before: JSON.parse(JSON.stringify(summary)) } })
    ]);
    return summary;
  }

  async createChannelCategory(principal: Principal, input: ChannelCategoryCreateInput): Promise<ChannelCategorySummary> {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('类别名称不能为空');
    }
    const existing = await this.prisma.channelCategory.findUnique({ where: { name } });
    if (existing) {
      throw new BadRequestException('类别名称已存在');
    }
    const category = await this.prisma.channelCategory.create({ data: { id: `cc-${slug(name)}`, name } });
    const summary = mapChannelCategory(category);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.channel_category.create', target: category.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateChannelCategory(principal: Principal, id: string, input: ChannelCategoryUpdateInput): Promise<ChannelCategorySummary> {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('类别名称不能为空');
    }
    const existing = await this.prisma.channelCategory.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      throw new BadRequestException('类别名称已存在');
    }
    const before = await this.prisma.channelCategory.findUnique({ where: { id } });
    const category = await this.prisma.channelCategory.update({
      where: { id },
      data: {
        name,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
      }
    });
    const summary = mapChannelCategory(category);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.channel_category.update', target: id, before: before ? JSON.parse(JSON.stringify(mapChannelCategory(before))) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateChannelCategoryEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<ChannelCategorySummary> {
    const before = await this.prisma.channelCategory.findUnique({ where: { id } });
    const category = await this.prisma.channelCategory.update({ where: { id }, data: { enabled: input.enabled === true } });
    const summary = mapChannelCategory(category);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.channel_category.update', target: id, before: before ? JSON.parse(JSON.stringify(mapChannelCategory(before))) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async deleteChannelCategory(principal: Principal, id: string): Promise<ChannelCategorySummary> {
    const before = await this.prisma.channelCategory.findUnique({ where: { id } });
    if (!before) {
      throw new BadRequestException('类别不存在');
    }
    const channelCount = await this.prisma.channel.count({ where: { category: before.name } });
    if (channelCount) {
      throw new BadRequestException('该渠道类别已被公司渠道引用，不能删除');
    }
    const summary = mapChannelCategory(before);
    await this.prisma.$transaction([
      this.prisma.channelCategory.delete({ where: { id } }),
      this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.channel_category.delete', target: id, before: JSON.parse(JSON.stringify(summary)) } })
    ]);
    return summary;
  }

  async createSurcharge(principal: Principal, input: SurchargeCreateInput): Promise<SurchargeSummary> {
    const surcharge = await this.prisma.surcharge.create({ data: { id: `sc-${slug(input.name)}`, name: input.name.trim(), amount: input.amount } });
    const summary = { id: surcharge.id, name: surcharge.name, amount: Number(surcharge.amount), enabled: surcharge.enabled };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.surcharge.create', target: surcharge.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateSurchargeEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<SurchargeSummary> {
    const before = await this.prisma.surcharge.findUnique({ where: { id } });
    const surcharge = await this.prisma.surcharge.update({ where: { id }, data: { enabled: input.enabled === true } });
    const summary = { id: surcharge.id, name: surcharge.name, amount: Number(surcharge.amount), enabled: surcharge.enabled };
    const beforeSummary = before ? { id: before.id, name: before.name, amount: Number(before.amount), enabled: before.enabled } : undefined;
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.surcharge.update', target: id, before: beforeSummary ? JSON.parse(JSON.stringify(beforeSummary)) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async createFuelRate(principal: Principal, input: FuelRateCreateInput): Promise<FuelRateSummary> {
    const channel = await this.prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) {
      throw new BadRequestException('渠道不存在');
    }
    const fuelRate = await this.prisma.fuelRate.create({
      data: { id: `fr-${Date.now()}`, channelId: channel.id, rate: input.rate, activeAt: new Date(input.activeAt) }
    });
    const summary = { id: fuelRate.id, channelId: channel.id, channelName: channel.name, rate: Number(fuelRate.rate), activeAt: fuelRate.activeAt.toISOString() };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.fuel_rate.create', target: fuelRate.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async createExchangeRate(principal: Principal, input: ExchangeRateCreateInput): Promise<ExchangeRateSummary> {
    const activeAt = new Date(input.activeAt);
    const endAt = input.endAt ? new Date(input.endAt) : undefined;
    if (!input.baseCurrency?.trim() || !input.quoteCurrency?.trim() || input.rate <= 0 || !endAt || Number.isNaN(activeAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt < activeAt) {
      throw new BadRequestException('汇率信息无效');
    }
    const exchangeRate = await (this.prisma as any).exchangeRate.create({
      data: {
        id: `er-${input.baseCurrency.toLowerCase()}-${input.quoteCurrency.toLowerCase()}-${Date.now()}`,
        baseCurrency: input.baseCurrency.trim().toUpperCase(),
        quoteCurrency: input.quoteCurrency.trim().toUpperCase(),
        rate: input.rate,
        activeAt,
        endAt,
        enabled: true
      }
    });
    const summary = {
      id: exchangeRate.id,
      baseCurrency: exchangeRate.baseCurrency,
      quoteCurrency: exchangeRate.quoteCurrency,
      rate: Number(exchangeRate.rate),
      activeAt: exchangeRate.activeAt.toISOString(),
      endAt: exchangeRate.endAt?.toISOString(),
      enabled: exchangeRate.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.exchange_rate.create', target: exchangeRate.id, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async updateExchangeRate(principal: Principal, id: string, input: ExchangeRateUpdateInput): Promise<ExchangeRateSummary> {
    const before = await (this.prisma as any).exchangeRate.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('汇率不存在');
    const data: Record<string, unknown> = {};
    const nextActiveAt = input.activeAt !== undefined ? new Date(input.activeAt) : before.activeAt;
    const nextEndAt = input.endAt !== undefined ? new Date(input.endAt) : before.endAt;
    if ((input.rate !== undefined && input.rate <= 0) || Number.isNaN(nextActiveAt.getTime()) || (nextEndAt && (Number.isNaN(nextEndAt.getTime()) || nextEndAt < nextActiveAt))) {
      throw new BadRequestException('汇率信息无效');
    }
    if (input.baseCurrency !== undefined) data.baseCurrency = input.baseCurrency.trim().toUpperCase();
    if (input.quoteCurrency !== undefined) data.quoteCurrency = input.quoteCurrency.trim().toUpperCase();
    if (input.rate !== undefined) data.rate = input.rate;
    if (input.activeAt !== undefined) data.activeAt = nextActiveAt;
    if (input.endAt !== undefined) data.endAt = nextEndAt;
    if (input.enabled !== undefined) data.enabled = input.enabled === true;
    const exchangeRate = await (this.prisma as any).exchangeRate.update({ where: { id }, data });
    const summary = {
      id: exchangeRate.id,
      baseCurrency: exchangeRate.baseCurrency,
      quoteCurrency: exchangeRate.quoteCurrency,
      rate: Number(exchangeRate.rate),
      activeAt: exchangeRate.activeAt.toISOString(),
      endAt: exchangeRate.endAt?.toISOString(),
      enabled: exchangeRate.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.exchange_rate.update', target: id, before: JSON.parse(JSON.stringify(before)), after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean> {
    if (role === 'ADMIN') {
      return true;
    }
    const row = await this.prisma.role.findUnique({
      where: { name: role },
      include: { permissions: true }
    });
    const permissions = resolveStoredRolePermissions(role, row?.permissions.map((item) => item.code as PermissionKey));
    return permissions.includes(permission);
  }

  async getPermissionsForRole(role: RoleKey): Promise<PermissionKey[]> {
    if (role === 'ADMIN') {
      return allPermissions();
    }
    const row = await this.prisma.role.findUnique({
      where: { name: role },
      include: { permissions: true }
    });
    return resolveStoredRolePermissions(role, row?.permissions.map((item) => item.code as PermissionKey));
  }

  async getRolePermissionMatrix(): Promise<{ availablePermissions: typeof permissionDefinitions; roles: RolePermissionRow[] }> {
    const rows = await this.prisma.role.findMany({ include: { permissions: true } });
    const rowNames = new Set(rows.map((row) => row.name));
    const persistedRows = rows.map(mapRoleRow);
    const missingBuiltins = (Object.keys(roleMetadata) as RoleKey[])
      .filter((role) => !rowNames.has(role))
      .map((role) => buildRolePermissionRow(role, defaultPermissionsForRole(role), { enabled: true, systemBuiltin: true }));
    return {
      availablePermissions: getPermissionDefinitions(),
      roles: [...missingBuiltins, ...persistedRows].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.label.localeCompare(right.label))
    };
  }

  private async resolveStaffDepartmentId(departmentId?: string, currentDepartmentId?: string | null): Promise<string | null> {
    const normalizedDepartmentId = departmentId?.trim();
    if (!normalizedDepartmentId) return null;
    const department = await this.prisma.department.findUnique({ where: { id: normalizedDepartmentId } });
    if (!department) {
      throw new BadRequestException('所属部门不存在');
    }
    if (!department.enabled && department.id !== currentDepartmentId) {
      throw new BadRequestException('所属部门已停用，请选择启用部门');
    }
    return department.id;
  }

  async getStaffAccounts(principal: Principal, query: StaffAccountQuery = {}): Promise<StaffAccountSummary[]> {
    this.ensureAdmin(principal, '只有管理员可以查看员工账号');
    const keyword = query.keyword?.trim();
    const roleName = query.role?.trim();
    if (roleName === 'CUSTOMER') {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: {
        role: { name: roleName || { not: 'CUSTOMER' } },
        ...(query.departmentId?.trim() ? { departmentId: query.departmentId.trim() } : {}),
        ...(query.site?.trim() ? { site: query.site.trim() } : {}),
        ...(query.status && query.status !== 'ALL' ? { enabled: query.status === 'ENABLED' } : {}),
        ...(keyword
          ? {
              OR: [
                { username: { contains: keyword } },
                { name: { contains: keyword } },
                { nickname: { contains: keyword } },
                { phone: { contains: keyword } },
                { department: { name: { contains: keyword } } },
                { role: { label: { contains: keyword } } }
              ]
            }
          : {})
      },
      include: { role: true, department: true },
      orderBy: { createdAt: 'asc' }
    });
    const userIds = users.map((user) => user.id);
    const loginRows = userIds.length
      ? await (this.prisma as any).loginLog.findMany({
          where: { userId: { in: userIds } },
          orderBy: { createdAt: 'desc' },
          select: { userId: true, createdAt: true }
        })
      : [];
    const lastLoginByUserId = new Map<string, string>();
    for (const login of loginRows as Array<{ userId: string; createdAt: Date }>) {
      if (!lastLoginByUserId.has(login.userId)) {
        lastLoginByUserId.set(login.userId, login.createdAt.toISOString());
      }
    }
    return users.map((user) => ({
      ...mapStaffAccount(user),
      lastLoginAt: lastLoginByUserId.get(user.id),
    }));
  }

  async createSite(principal: Principal, input: SiteCreateInput): Promise<SiteSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护站点');
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('站点名称不能为空');
    }
    const existing = await this.prisma.site.findUnique({ where: { name } });
    if (existing) {
      throw new BadRequestException('站点名称已存在');
    }
    const last = await this.prisma.site.findFirst({ orderBy: { sortOrder: 'desc' } });
    const site = await this.prisma.site.create({
      data: {
        id: `site-${slug(name)}`,
        name,
        sortOrder: input.sortOrder ?? ((last?.sortOrder ?? 0) + 1)
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'system.site.create', target: `site:${site.id}`, after: JSON.parse(JSON.stringify(mapSite(site))) }
    });
    return mapSite(site);
  }

  async updateSite(principal: Principal, id: string, input: SiteUpdateInput): Promise<SiteSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护站点');
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('站点名称不能为空');
    }
    const existing = await this.prisma.site.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      throw new BadRequestException('站点名称已存在');
    }
    const before = await this.prisma.site.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException('站点不存在');
    }
    const site = await this.prisma.site.update({
      where: { id },
      data: {
        name,
        sortOrder: input.sortOrder ?? before.sortOrder,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'system.site.update', target: `site:${id}`, before: JSON.parse(JSON.stringify(mapSite(before))), after: JSON.parse(JSON.stringify(mapSite(site))) }
    });
    return mapSite(site);
  }

  async updateSiteEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<SiteSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护站点');
    const before = await this.prisma.site.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException('站点不存在');
    }
    const site = await this.prisma.site.update({ where: { id }, data: { enabled: input.enabled === true } });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'system.site.enabled', target: `site:${id}`, before: JSON.parse(JSON.stringify(mapSite(before))), after: JSON.parse(JSON.stringify(mapSite(site))) }
    });
    return mapSite(site);
  }

  async createStaffAccount(principal: Principal, input: StaffAccountCreateInput): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以新建员工账号');
    const username = input.username?.trim();
    if (!username || !/^[a-zA-Z0-9_.-]{5,32}$/.test(username) || !/[a-zA-Z]/.test(username)) {
      throw new BadRequestException('账号需为 5-32 位，并至少包含一个英文字母，可包含数字、点、下划线或短横线');
    }
    if (!isStaffRoleName(input.role)) {
      throw new BadRequestException('员工角色不正确');
    }
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new BadRequestException('账号已存在');
    }
    const initialPassword = input.password?.trim() || `${username}@123`;
    const strengthError = getPasswordStrengthError(initialPassword);
    if (strengthError) {
      throw new BadRequestException(strengthError);
    }
    const selectedRole = await this.prisma.role.findUnique({ where: { name: input.role }, include: { permissions: true } });
    if (!selectedRole || selectedRole.enabled !== true || selectedRole.systemBuiltin === true) {
      throw new BadRequestException('员工角色不正确');
    }
    const departmentId = await this.resolveStaffDepartmentId(input.departmentId);
    const permissions = resolveStoredRolePermissions(input.role, selectedRole.permissions.map((item) => item.code as PermissionKey));
    for (const permission of permissions) {
      await this.prisma.permission.upsert({
        where: { code: permission },
        create: { code: permission },
        update: {}
      });
    }
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(initialPassword),
        ...normalizeStaffProfile(input),
        mustChangePassword: true,
        roleId: selectedRole.id,
        departmentId,
        enabled: input.enabled !== false
      },
      include: { role: true, department: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.create',
        target: `user:${user.id}`,
        after: { username: user.username, role: user.role.name, enabled: user.enabled, ...pickStaffProfile(user), mustChangePassword: user.mustChangePassword }
      }
    });
    return mapStaffAccount(user);
  }

  async updateStaffAccount(principal: Principal, id: string, input: StaffAccountUpdateInput): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护员工账号');
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true, department: true } });
    if (!existing || !isStaffRoleName(existing.role.name)) {
      throw new NotFoundException('员工账号不存在');
    }
    const username = input.username?.trim();
    if (username && (!/^[a-zA-Z0-9_.-]{5,32}$/.test(username) || !/[a-zA-Z]/.test(username))) {
      throw new BadRequestException('账号需为 5-32 位，并至少包含一个英文字母，可包含数字、点、下划线或短横线');
    }
    if (username) {
      const duplicated = await this.prisma.user.findUnique({ where: { username } });
      if (duplicated && duplicated.id !== id) {
        throw new BadRequestException('账号已存在');
      }
    }
    let roleId: string | undefined;
    if (input.role !== undefined) {
      const selectedRole = await this.prisma.role.findUnique({ where: { name: input.role } });
      if (!selectedRole || selectedRole.enabled !== true || selectedRole.systemBuiltin === true || !isStaffRoleName(selectedRole.name)) {
        throw new BadRequestException('员工角色不正确');
      }
      roleId = selectedRole.id;
    }
    if (id === principal.id && (input.enabled === false || (input.role !== undefined && input.role !== existing.role.name))) {
      throw new BadRequestException('不能停用当前登录账号或修改自己的用户组');
    }
    const password = input.password?.trim();
    if (password) {
      const strengthError = getPasswordStrengthError(password);
      if (strengthError) throw new BadRequestException(strengthError);
    }
    const departmentId = input.departmentId !== undefined
      ? await this.resolveStaffDepartmentId(input.departmentId, existing.departmentId)
      : undefined;
    const data: Record<string, unknown> = {
      ...(username ? { username } : {}),
      ...normalizeStaffProfileUpdate(input),
      ...(roleId ? { roleId } : {}),
      ...(departmentId !== undefined ? { departmentId } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled === true } : {}),
      ...(password ? { passwordHash: hashPassword(password), mustChangePassword: true } : {})
    };
    const user = await this.prisma.user.update({ where: { id }, data, include: { role: true, department: true } });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.update',
        target: `user:${id}`,
        before: { username: existing.username, role: existing.role.name, enabled: existing.enabled, ...pickStaffProfile(existing) },
        after: { username: user.username, role: user.role.name, enabled: user.enabled, ...pickStaffProfile(user), passwordChanged: Boolean(password) }
      }
    });
    if (existing.departmentId !== user.departmentId) {
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'system.staff.department.update',
          target: `user:${id}`,
          before: { departmentId: existing.departmentId ?? null, department: existing.department?.name ?? '未分配部门' },
          after: { departmentId: user.departmentId ?? null, department: user.department?.name ?? '未分配部门' }
        }
      });
    }
    return mapStaffAccount(user);
  }

  async updateStaffAccountEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以启停员工账号');
    if (id === principal.id && input.enabled !== true) {
      throw new BadRequestException('不能停用当前登录账号');
    }
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true, department: true } });
    if (!existing || !isStaffRoleName(existing.role.name)) {
      throw new NotFoundException('员工账号不存在');
    }
    const user = await this.prisma.user.update({ where: { id }, data: { enabled: input.enabled === true }, include: { role: true, department: true } });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.enabled',
        target: `user:${id}`,
        before: { username: existing.username, role: existing.role.name, enabled: existing.enabled, ...pickStaffProfile(existing) },
        after: { username: user.username, role: user.role.name, enabled: user.enabled, ...pickStaffProfile(user) }
      }
    });
    return mapStaffAccount(user);
  }

  async deleteStaffAccount(principal: Principal, id: string): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以删除员工账号');
    if (id === principal.id) {
      throw new BadRequestException('不能删除当前登录账号');
    }
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true, department: true } });
    if (!existing || !isStaffRoleName(existing.role.name)) {
      throw new NotFoundException('员工账号不存在');
    }
    const loginLogCount = await this.prisma.loginLog.count({ where: { userId: id } });
    if (loginLogCount > 0) {
      throw new BadRequestException('该员工账号存在登录记录，不能删除，请使用停用');
    }
    await this.prisma.user.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.delete',
        target: `user:${id}`,
        before: { username: existing.username, role: existing.role.name, enabled: existing.enabled, ...pickStaffProfile(existing) },
        after: { hardDelete: true }
      }
    });
    return mapStaffAccount(existing);
  }

  async resetStaffAccountPasswords(principal: Principal, input: StaffAccountPasswordResetInput): Promise<StaffAccountPasswordResetResult[]> {
    this.ensureAdmin(principal, '只有管理员可以重置员工密码');
    const userIds = [...new Set(input.userIds ?? [])].filter(Boolean);
    if (!userIds.length) {
      throw new BadRequestException('请选择要重置密码的员工账号');
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, role: { name: { not: 'CUSTOMER' } } },
      include: { role: true }
    });
    if (users.length !== userIds.length) {
      throw new NotFoundException('部分员工账号不存在或不是员工账号');
    }
    const results: StaffAccountPasswordResetResult[] = [];
    for (const user of users) {
      const temporaryPassword = `${user.username}@123`;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(temporaryPassword), mustChangePassword: true }
      });
      results.push({ id: user.id, username: user.username, temporaryPassword });
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.password_reset',
        target: `users:${users.map((user) => user.id).join(',')}`,
        before: users.map((user) => ({ id: user.id, username: user.username })),
        after: users.map((user) => ({ id: user.id, username: user.username, passwordRule: 'username@123' }))
      }
    });
    return results;
  }

  async updateStaffAccountSite(principal: Principal, id: string, input: { site?: string }): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护员工站点');
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true, department: true } });
    if (!existing || !isStaffRoleName(existing.role.name)) {
      throw new NotFoundException('员工账号不存在');
    }
    const site = normalizeOptionalText(input.site, 40);
    const user = await this.prisma.user.update({
      where: { id },
      data: { site },
      include: { role: true, department: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.site.update',
        target: `user:${id}`,
        before: { site: existing.site ?? null },
        after: { site }
      }
    });
    return mapStaffAccount(user);
  }

  async createRoleGroup(principal: Principal, input: RoleGroupInput): Promise<RolePermissionRow> {
    this.ensureAdmin(principal, '只有管理员可以维护用户组');
    const last = await this.prisma.role.findFirst({ where: { systemBuiltin: false }, orderBy: { sortOrder: 'desc' } });
    const normalized = normalizeRoleGroupInput(input, (last?.sortOrder ?? 0) + 1);
    const code = createRoleGroupCode(normalized.label);
    const existing = await this.prisma.role.findFirst({ where: { OR: [{ name: code }, { label: normalized.label }] } });
    if (existing) {
      throw new BadRequestException('用户组名称已存在');
    }
    const template = await this.prisma.role.findUnique({ where: { name: normalized.templateRole }, include: { permissions: true } });
    const permissions = resolveStoredRolePermissions(normalized.templateRole, template?.permissions.map((item) => item.code as PermissionKey));
    for (const permission of permissions) {
      await this.prisma.permission.upsert({ where: { code: permission }, create: { code: permission }, update: {} });
    }
    const role = await this.prisma.role.create({
      data: {
        id: `r-${code.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
        name: code,
        label: normalized.label,
        description: normalized.description,
        site: normalized.site,
        sortOrder: normalized.sortOrder,
        enabled: normalized.enabled,
        systemBuiltin: false,
        permissions: { connect: permissions.map((permission) => ({ code: permission })) }
      },
      include: { permissions: true }
    });
    const after = mapRoleRow(role);
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'system.role.create', target: `role:${role.name}`, after: JSON.parse(JSON.stringify(after)) }
    });
    return after;
  }

  async updateRoleGroup(principal: Principal, role: RoleKey, input: RoleGroupInput): Promise<RolePermissionRow> {
    this.ensureAdmin(principal, '只有管理员可以维护用户组');
    const before = await this.prisma.role.findUnique({ where: { name: role }, include: { permissions: true } });
    if (!before) {
      throw new NotFoundException('用户组不存在');
    }
    if (before.systemBuiltin || role === 'ADMIN') {
      throw new BadRequestException('内置角色不能在用户组中修改');
    }
    const normalized = normalizeRoleGroupInput(input, before.sortOrder);
    const duplicated = await this.prisma.role.findFirst({ where: { label: normalized.label, name: { not: role } } });
    if (duplicated) {
      throw new BadRequestException('用户组名称已存在');
    }
    const updated = await this.prisma.role.update({
      where: { name: role },
      data: {
        label: normalized.label,
        description: normalized.description,
        site: normalized.site,
        sortOrder: normalized.sortOrder,
        enabled: normalized.enabled
      },
      include: { permissions: true }
    });
    const beforeRow = mapRoleRow(before);
    const after = mapRoleRow(updated);
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'system.role.update', target: `role:${role}`, before: JSON.parse(JSON.stringify(beforeRow)), after: JSON.parse(JSON.stringify(after)) }
    });
    return after;
  }

  async updateRoleGroupEnabled(principal: Principal, role: RoleKey, input: EnabledUpdateInput): Promise<RolePermissionRow> {
    this.ensureAdmin(principal, '只有管理员可以维护用户组');
    const before = await this.prisma.role.findUnique({ where: { name: role }, include: { permissions: true } });
    if (!before) {
      throw new NotFoundException('用户组不存在');
    }
    if (before.systemBuiltin || role === 'ADMIN') {
      throw new BadRequestException('内置角色不能停用');
    }
    const updated = await this.prisma.role.update({
      where: { name: role },
      data: { enabled: input.enabled === true },
      include: { permissions: true }
    });
    const beforeRow = mapRoleRow(before);
    const after = mapRoleRow(updated);
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'system.role.enabled', target: `role:${role}`, before: JSON.parse(JSON.stringify(beforeRow)), after: JSON.parse(JSON.stringify(after)) }
    });
    return after;
  }

  async updateRolePermissions(principal: Principal, role: RoleKey, permissions: PermissionKey[]): Promise<RolePermissionRow> {
    const normalized = normalizeRolePermissions(role, permissions);
    const before = (await this.getRolePermissionMatrix()).roles.find((item) => item.key === role)?.permissions ?? [];
    for (const permission of normalized) {
      await this.prisma.permission.upsert({
        where: { code: permission },
        create: { code: permission },
        update: {}
      });
    }
    const existing = await this.prisma.role.findUnique({ where: { name: role } });
    if (!existing && !isBuiltinRoleKey(role)) {
      throw new NotFoundException('用户组不存在');
    }
    const updated = await this.prisma.role.upsert({
      where: { name: role },
      create: {
        id: `r-${String(role).toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
        name: role,
        label: getRoleMetadata(role).label,
        sortOrder: getRoleMetadata(role).sortOrder ?? 0,
        enabled: true,
        systemBuiltin: isBuiltinRoleKey(role),
        permissions: { connect: normalized.map((code) => ({ code })) }
      },
      update: { permissions: { set: normalized.map((code) => ({ code })) } },
      include: { permissions: true }
    });
    const after = updated.permissions.map((item) => item.code as PermissionKey);
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.role_permissions.update',
        target: `role:${role}`,
        before,
        after
      }
    });
    return mapRoleRow(updated);
  }

  async getAuditLogs(principal: Principal, query: AuditLogQuery = {}): Promise<AuditLogListResponse> {
    this.ensureAdmin(principal, '只有管理员可以查看高危操作审计');
    const operator = query.operator?.trim();
    let actorIds: string[] | undefined;
    if (operator) {
      const users = await this.prisma.user.findMany({
        where: { OR: [{ id: operator }, { username: { contains: operator, mode: 'insensitive' } }] },
        select: { id: true }
      });
      actorIds = [...new Set([...users.map((user) => user.id), operator])];
    }

    const where = {
      ...(actorIds ? { actorId: { in: actorIds } } : {}),
      ...(query.action?.trim() ? { action: { contains: query.action.trim(), mode: 'insensitive' as const } } : {}),
      ...(query.target?.trim() ? { target: { contains: query.target.trim(), mode: 'insensitive' as const } } : {}),
      ...(query.startedAt || query.endedAt
        ? {
            createdAt: {
              ...(query.startedAt ? { gte: new Date(query.startedAt) } : {}),
              ...(query.endedAt ? { lte: new Date(query.endedAt) } : {})
            }
          }
        : {})
    };
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(query.pageSize ?? 500) || 500));
    const needsDerivedFilter = Boolean(query.module?.trim() || query.result?.trim());
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(needsDerivedFilter ? {} : { skip: (page - 1) * pageSize, take: pageSize })
    });
    const now = new Date();
    const dashboardStartedAt = new Date(beijingDayStartUtc(now) - 13 * 24 * 60 * 60 * 1000);
    const [dashboardTrendRows, dashboardRecentRows] = await Promise.all([
      this.prisma.auditLog.findMany({ where: { createdAt: { gte: dashboardStartedAt } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
    ]);
    const dashboardRawRows = [...new Map([...dashboardRecentRows, ...dashboardTrendRows].map((row) => [row.id, row])).values()];

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set([...rows, ...dashboardRawRows].map((row) => row.actorId))] } },
      select: { id: true, username: true }
    });
    const usernameById = new Map(users.map((user) => [user.id, user.username]));
    const moduleFilter = query.module?.trim();
    const resultFilter = query.result?.trim() as AuditLogResult | undefined;
    const summaries = rows
      .map((row) => toAuditSummary(row, usernameById))
      .filter((row) => (moduleFilter ? row.module === moduleFilter : true))
      .filter((row) => (resultFilter ? row.result === resultFilter : true));
    const totalItems = needsDerivedFilter ? summaries.length : await this.prisma.auditLog.count({ where });
    const pagedRows = needsDerivedFilter ? summaries.slice((page - 1) * pageSize, page * pageSize) : summaries;
    const dashboardRows = dashboardRawRows.map((row) => toAuditSummary(row, usernameById));

    return {
      rows: pagedRows,
      suspiciousDeleteWarnings: buildAuditDeleteWarnings(pagedRows),
      pagination: { page, pageSize, totalItems },
      dashboard: buildAuditDashboard(dashboardRows, now)
    };
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
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'security.permission.denied',
        target: `${input.method ?? 'UNKNOWN'} ${input.path ?? ''}`.trim(),
        after: {
          role: principal.role,
          username: principal.username,
          permissions: input.permissions
        }
      }
    });
  }

  async recordHttpAudit(
    principal: Principal,
    input: { method: string; path: string; result: 'SUCCESS' | 'FAILED'; durationMs: number; errorMessage?: string; ipAddress?: string; userAgent?: string }
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: `${auditModuleFromPath(input.path)}.request.${auditKindFromRequest(input.method, input.path)}${input.result === 'FAILED' ? '.failed' : ''}`,
        target: `${input.method.toUpperCase()} ${input.path}`.trim(),
        after: {
          status: input.result,
          durationMs: input.durationMs,
          ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
          ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
          ...(input.userAgent ? { userAgent: input.userAgent.slice(0, 300) } : {})
        }
      }
    });
  }

  quote(input: PricingQuoteRequest) {
    return calculateQuote(input);
  }

  async lookupPrice(principal: Principal, input: PriceLookupRequest): Promise<PriceLookupResponse> {
    this.ensureStaffPricingAccess(principal);
    const startedAt = Date.now();
    const [priceScope, markupRules] = await Promise.all([
      this.loadPriceRowsForLookup(input),
      this.loadAgentMarkupRules()
    ]);
    const response = createBackendPriceLookup(principal, input, priceScope.rows, priceScope.books, markupRules);
    logPricingLookupTiming('pricing.lookup.total', startedAt, {
      rows: priceScope.rows.length,
      recommendations: response.recommendations.length
    });
    const selectedRecommendation = response.cheapestRecommendations[0] ?? response.recommendations[0];
    const businessId = selectedRecommendation?.price.id ?? `price-lookup:${Date.now()}`;
    void this.lineage?.recordMainFlowResult('pricing', 'price_lookup', 'price_lookup', businessId, {
      query: input,
      selected: selectedRecommendation,
      recommendationCount: response.recommendations.length
    }, response.recommendations.map((item) => ({ nodeType: 'price_book_row', id: item.price.id })), {
      candidateRows: priceScope.rows.length,
      recommendationCount: response.recommendations.length,
      selectedPriceRowId: selectedRecommendation?.price.id
    }, 'pricing.lookup.quote');
    return response;
  }

  async getLegacyPricingMeta(principal: Principal): Promise<LegacyPricingMetaResponse> {
    this.ensureStaffPricingAccess(principal);
    const canViewInternalSource = await this.hasPermission(principal.role, 'pricing:lookup:internal-source-view');
    const rows = await this.loadQuoteEligibleLegacyPricingRows();
    return buildLegacyPricingMeta(rows, canViewInternalSource);
  }

  async getDubaiPriceTable(principal: Principal): Promise<DubaiPriceTableResponse> {
    this.ensureStaffPricingAccess(principal);
    const [legacyRows, persistedMarkupRules, activeBooks] = await Promise.all([
      this.loadQuoteEligibleLegacyPricingRows('dubaiAirSea'),
      this.loadAgentMarkupRules(),
      (this.prisma as any).priceBook.findMany({
        where: { deletedAt: null },
        select: { id: true, fileName: true, agentShortName: true }
      })
    ]);
    const rows = legacyRows.map((row) => legacyRowToPriceBookRow(row, row.costPerKg ?? row.cbmPrice ?? 0, row.maxWeightKg ?? row.minWeightKg ?? 1));
    const scopedRules = filterAgentMarkupRulesByModule(persistedMarkupRules, 'dubaiAirSea', rows);
    const markupRules = buildSyncedAgentMarkupRules(
      scopedRules,
      buildLegacyAgentSourcesFromRows(legacyRows, activeBooks, 'dubaiAirSea')
    ).filter((rule) => rule.enabled && !rule.deletedAt);
    return buildDubaiPriceTableResponse(rows, markupRules);
  }

  async getDubaiPriceDisplay(principal: Principal): Promise<DubaiPriceDisplayResponse> {
    this.ensureStaffPricingAccess(principal);
    const activeDubaiBooks = await (this.prisma as any).priceBook.findMany({
      where: { deletedAt: null, targetModule: 'dubaiAirSea' },
      select: { id: true }
    });
    const activeDubaiBookIds = activeDubaiBooks.map((book: { id: string }) => book.id);
    if (!activeDubaiBookIds.length) {
      return { airPages: [], seaPages: [] };
    }
    const [airVersion, seaVersion] = await Promise.all(['isActiveAir', 'isActiveSea'].map((activeField) => (this.prisma as any).dubaiPriceDisplayVersion.findFirst({
      where: { [activeField]: true, status: 'READY', salesSafe: true, priceBookId: { in: activeDubaiBookIds } },
      include: { pages: { orderBy: [{ sheetName: 'asc' }, { pageNo: 'asc' }] } },
      orderBy: { updatedAt: 'desc' }
    })));
    const pagesFor = (version: any, mode: 'AIR' | 'SEA') => (version?.pages ?? [])
      .filter((page: any) => page.mode === mode)
      .map((page: any) => ({
        id: page.id,
        mode: page.mode as 'AIR' | 'SEA',
        sheetName: page.sheetName,
        pageNo: page.pageNo,
        url: `/api/uploads/pricing-dubai/${version.id}/${page.fileName}?v=${encodeURIComponent(version.updatedAt.toISOString())}`
      }));
    return {
      airPages: pagesFor(airVersion, 'AIR'),
      seaPages: pagesFor(seaVersion, 'SEA'),
      airUpdatedAt: airVersion?.updatedAt.toISOString(),
      seaUpdatedAt: seaVersion?.updatedAt.toISOString(),
      updatedAt: [airVersion?.updatedAt, seaVersion?.updatedAt].filter(Boolean).sort((left: Date, right: Date) => left.getTime() - right.getTime()).at(-1)?.toISOString()
    };
  }

  async getDubaiPriceDisplayVersions(principal: Principal): Promise<DubaiPriceDisplayVersionListResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以管理迪拜价格表展示版本');
    const versions = await (this.prisma as any).dubaiPriceDisplayVersion.findMany({
      include: { pages: { orderBy: [{ mode: 'asc' }, { sheetName: 'asc' }, { pageNo: 'asc' }] } },
      orderBy: { createdAt: 'desc' }
    });
    return { versions: versions.map((version: any) => mapDubaiPriceDisplayVersion(version)) };
  }

  async activateDubaiPriceDisplayVersion(principal: Principal, id: string, input: DubaiPriceDisplayActivateInput) {
    this.ensurePricingManager(principal, '只有管理员或市场可以发布迪拜价格表');
    const version = await (this.prisma as any).dubaiPriceDisplayVersion.findFirst({ where: { id }, include: { pages: true } });
    if (!version) throw new NotFoundException('迪拜价格表展示版本不存在');
    if (version.status !== 'READY' || !version.pages.some((page: any) => page.mode === 'AIR' || page.mode === 'SEA')) {
      throw new BadRequestException('价格表图片尚未转换完成，不能发布');
    }
    if (!input?.salesSafe) throw new BadRequestException('请确认原表不含成本、毛利或内部价后再发布');
    await this.activateDubaiDisplayModes(version, new Set(version.pages.map((page: any) => page.mode).filter((mode: string): mode is 'AIR' | 'SEA' => mode === 'AIR' || mode === 'SEA')), true, 'manual');
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.dubai.display.publish', target: id, after: { salesSafe: true, pageCount: version.pages.length } }
    });
    return this.getDubaiPriceDisplayVersions(principal);
  }

  async retryDubaiPriceDisplayVersion(principal: Principal, id: string) {
    this.ensurePricingManager(principal, '只有管理员或市场可以重新生成迪拜价格表图片');
    const version = await (this.prisma as any).dubaiPriceDisplayVersion.findFirst({ where: { id } });
    if (!version) throw new NotFoundException('迪拜价格表展示版本不存在');
    const job = version.priceBookId
      ? await (this.prisma as any).priceBookImportJob.findFirst({ where: { priceBookId: version.priceBookId, filePath: { not: null } }, orderBy: { createdAt: 'desc' } })
      : null;
    if (!job?.filePath) throw new BadRequestException('原始价格表文件不可用，无法重新生成图片');
    await (this.prisma as any).dubaiPriceDisplayVersion.update({ where: { id }, data: { status: 'PROCESSING', message: '正在重新生成空运、海运工作表图片' } });
    try {
      const rendered = await renderDubaiWorkbookSheets({ buffer: await readFile(job.filePath), versionId: id, fileName: version.originalName });
      if (!rendered.pages.length) throw new BadRequestException('未识别到名称包含空运或海运的工作表');
      await (this.prisma as any).$transaction(async (tx: any) => {
        await tx.dubaiPriceDisplayPage.deleteMany({ where: { versionId: id } });
        await tx.dubaiPriceDisplayPage.createMany({ data: rendered.pages.map((page) => ({ ...page, id: randomUUID(), versionId: id, mimeType: 'image/png' })) });
        await tx.dubaiPriceDisplayVersion.update({ where: { id }, data: { status: 'READY', salesSafe: true, message: `重新转换完成：${rendered.pages.length} 页，已自动更新当前展示`, unassignedSheets: rendered.unassignedSheets } });
      });
      const refreshed = await (this.prisma as any).dubaiPriceDisplayVersion.findFirst({ where: { id }, include: { pages: true } });
      await this.activateDubaiDisplayModes(refreshed, new Set(rendered.pages.map((page) => page.mode)), true, 'automatic');
      await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.dubai.display.retry', target: id, after: { priceBookId: version.priceBookId, pageCount: rendered.pages.length } } });
    } catch (error) {
      const message = error instanceof Error ? error.message : '重新生成图片失败';
      await (this.prisma as any).dubaiPriceDisplayVersion.update({ where: { id }, data: { status: 'FAILED', message } }).catch(() => undefined);
      await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.dubai.display.retry_failed', target: id, after: { message } } }).catch(() => undefined);
    }
    return this.getDubaiPriceDisplayVersions(principal);
  }

  private async activateDubaiDisplayModes(version: any, modes: Set<'AIR' | 'SEA'>, salesSafe: boolean, source: 'automatic' | 'manual' = 'automatic') {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await (this.prisma as any).$transaction(async (tx: any) => {
          const [activeAirVersion, activeSeaVersion] = await Promise.all([
            tx.dubaiPriceDisplayVersion.findFirst({ where: { id: { not: version.id }, isActiveAir: true, status: 'READY', salesSafe: true }, orderBy: { createdAt: 'desc' } }),
            tx.dubaiPriceDisplayVersion.findFirst({ where: { id: { not: version.id }, isActiveSea: true, status: 'READY', salesSafe: true }, orderBy: { createdAt: 'desc' } })
          ]);
          const activateAir = modes.has('AIR') && (source === 'manual' || !activeAirVersion || version.createdAt > activeAirVersion.createdAt);
          const activateSea = modes.has('SEA') && (source === 'manual' || !activeSeaVersion || version.createdAt > activeSeaVersion.createdAt);
          if (activateAir) await tx.dubaiPriceDisplayVersion.updateMany({ where: { isActiveAir: true }, data: { isActiveAir: false } });
          if (activateSea) await tx.dubaiPriceDisplayVersion.updateMany({ where: { isActiveSea: true }, data: { isActiveSea: false } });
          await tx.dubaiPriceDisplayVersion.update({ where: { id: version.id }, data: { isActive: activateAir || activateSea, isActiveAir: activateAir, isActiveSea: activateSea, salesSafe } });
          await tx.dubaiPriceDisplayVersion.updateMany({ where: { isActive: true, isActiveAir: false, isActiveSea: false }, data: { isActive: false } });
        }, { isolationLevel: 'Serializable' });
        return;
      } catch (error: any) {
        if (error?.code !== 'P2034' || attempt === 2) throw error;
      }
    }
  }

  async getSouthAfricaRateImages(principal: Principal): Promise<SouthAfricaRateImageListResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看南非图片价格表');
    const rows = await (this.prisma as any).southAfricaRateImage.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return { images: rows.map(mapSouthAfricaRateImage) };
  }

  async createSouthAfricaRateImage(principal: Principal, input: Omit<SouthAfricaRateImageSummary, 'id' | 'createdAt' | 'uploadedBy'>): Promise<SouthAfricaRateImageSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以上传南非图片价格表');
    const row = await (this.prisma as any).southAfricaRateImage.create({
      data: {
        fileName: input.fileName,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        url: input.url,
        storagePath: input.url,
        uploadedBy: principal.username
      }
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.south_africa.image.upload', target: row.id, after: row } });
    return mapSouthAfricaRateImage(row);
  }

  async getSouthAfricaRateRules(principal: Principal): Promise<SouthAfricaRateRuleListResponse> {
    this.ensureStaffPricingAccess(principal);
    const rows = await (this.prisma as any).southAfricaRateRule.findMany({ where: { deletedAt: null }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    return { rules: rows.map(mapSouthAfricaRateRule) };
  }

  async createSouthAfricaRateRule(principal: Principal, input: SouthAfricaRateRuleInput): Promise<SouthAfricaRateRuleSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护南非价格规则');
    const normalized = normalizeSouthAfricaRateRule(input);
    const row = await (this.prisma as any).southAfricaRateRule.create({
      data: {
        category: normalized.category,
        name: normalized.name,
        keywords: normalized.keywords,
        ratePerCbm: normalized.ratePerCbm ?? null,
        consult: normalized.consult,
        remark: normalized.remark,
        sourceImageId: normalized.sourceImageId,
        enabled: normalized.enabled,
        createdBy: principal.username,
        updatedBy: principal.username
      }
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.south_africa.rule.create', target: row.id, after: row } });
    const summary = mapSouthAfricaRateRule(row);
    void this.lineage?.recordEvent('pricing.south_africa.rule_change', {
      businessId: summary.id,
      actorUsername: principal.username,
      payload: { action: 'create', rule: summary },
      metrics: { enabled: summary.enabled ? 1 : 0, keywordCount: summary.keywords.length }
    });
    return summary;
  }

  async updateSouthAfricaRateRule(principal: Principal, id: string, input: SouthAfricaRateRuleInput): Promise<SouthAfricaRateRuleSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护南非价格规则');
    const before = await (this.prisma as any).southAfricaRateRule.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('南非价格规则不存在');
    const normalized = normalizeSouthAfricaRateRule(input);
    const row = await (this.prisma as any).southAfricaRateRule.update({
      where: { id },
      data: {
        category: normalized.category,
        name: normalized.name,
        keywords: normalized.keywords,
        ratePerCbm: normalized.ratePerCbm ?? null,
        consult: normalized.consult,
        remark: normalized.remark,
        sourceImageId: normalized.sourceImageId,
        enabled: normalized.enabled,
        updatedBy: principal.username
      }
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.south_africa.rule.update', target: id, before, after: row } });
    const summary = mapSouthAfricaRateRule(row);
    void this.lineage?.recordEvent('pricing.south_africa.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'update', before: mapSouthAfricaRateRule(before), after: summary },
      sourceRefs: [{ nodeType: 'south_africa_rate_rule', id }],
      metrics: { enabled: summary.enabled ? 1 : 0, keywordCount: summary.keywords.length }
    });
    return summary;
  }

  async updateSouthAfricaRateRuleEnabled(principal: Principal, id: string, input: { enabled?: boolean }): Promise<SouthAfricaRateRuleSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护南非价格规则');
    const before = await (this.prisma as any).southAfricaRateRule.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('南非价格规则不存在');
    const row = await (this.prisma as any).southAfricaRateRule.update({ where: { id }, data: { enabled: input.enabled !== false, updatedBy: principal.username } });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.south_africa.rule.enabled', target: id, before, after: row } });
    const summary = mapSouthAfricaRateRule(row);
    void this.lineage?.recordEvent('pricing.south_africa.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'enabled', before: mapSouthAfricaRateRule(before), after: summary },
      sourceRefs: [{ nodeType: 'south_africa_rate_rule', id }],
      metrics: { enabled: summary.enabled ? 1 : 0, keywordCount: summary.keywords.length }
    });
    return summary;
  }

  async deleteSouthAfricaRateRule(principal: Principal, id: string): Promise<SouthAfricaRateRuleSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护南非价格规则');
    const before = await (this.prisma as any).southAfricaRateRule.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('南非价格规则不存在');
    await (this.prisma as any).southAfricaRateRule.delete({ where: { id } });
    const summary = mapSouthAfricaRateRule(before);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.south_africa.rule.delete', target: id, before, after: { hardDelete: true } } });
    void this.lineage?.recordEvent('pricing.south_africa.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'delete', before: summary, hardDelete: true },
      sourceRefs: [{ nodeType: 'south_africa_rate_rule', id }],
      metrics: { deleted: 1, keywordCount: summary.keywords.length }
    });
    return summary;
  }

  async lookupSouthAfricaPricing(principal: Principal, input: SouthAfricaLookupRequest): Promise<SouthAfricaLookupResponse> {
    this.ensureStaffPricingAccess(principal);
    const [ruleRows, imageRows] = await Promise.all([
      (this.prisma as any).southAfricaRateRule.findMany({ where: { enabled: true, deletedAt: null }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
      (this.prisma as any).southAfricaRateImage.findMany({ where: { deletedAt: null } })
    ]);
    const response = createSouthAfricaLookupResponse(input, ruleRows.map(mapSouthAfricaRateRule), imageRows.map(mapSouthAfricaRateImage));
    if (!response.result) {
      const pending = await (this.prisma as any).southAfricaLookupPendingReview.create({
        data: {
          productName: response.query.productName,
          volumeCbm: response.query.volumeCbm,
          actualWeightKg: response.query.actualWeightKg,
          packageInfo: response.query.packageInfo,
          createdBy: principal.username
        }
      });
      response.pendingReview = {
        id: pending.id,
        productName: pending.productName,
        volumeCbm: Number(pending.volumeCbm),
        actualWeightKg: pending.actualWeightKg === null ? undefined : Number(pending.actualWeightKg),
        packageInfo: pending.packageInfo ?? undefined,
        createdAt: pending.createdAt.toISOString()
      };
      await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.south_africa.lookup.pending_review', target: pending.id, after: response.pendingReview } });
    }
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.south_africa.lookup', target: response.result?.id ?? 'south-africa-lookup', after: { query: { ...response.query }, matched: Boolean(response.result) } } });
    return response;
  }

  async quoteLegacyPricing(principal: Principal, input: LegacyPricingQuoteRequest): Promise<LegacyPricingQuoteResponse> {
    this.ensureStaffPricingAccess(principal);
    const pricingVisibility = await this.getPricingFieldVisibility(principal);
    const startedAt = Date.now();
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
    const lookupDestinationCountry = normalizedInput.destinationCountry || defaultLegacyModuleDestination(normalizedInput.module);
    const [rows, fallbackPriceScope, markupRules] = await Promise.all([
      this.loadLegacyPricingRowsForQuote(normalizedInput, chargeableWeightKg),
      this.loadPriceRowsForLookup({
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
      }, normalizedInput.module),
      this.loadAgentMarkupRules()
    ]);
    // PriceBook.targetModule is authoritative. Do not infer a fallback row's
    // module from route wording, otherwise a Canada route imported into the
    // Amazon pool is incorrectly removed before matching.
    const quoteRows = rows.length
      ? rows
      : fallbackPriceScope.rows.map((row) => priceBookRowToLegacyPricingRow(row, normalizedInput.module));
    // Source tiers can vary by workbook (for example 21KG+). Do not infer a
    // global bucket before warehouse/destination matching; the selected row
    // below is the only authoritative tier for the current quote.
    const activeBooks = await (this.prisma as any).priceBook.findMany({ where: { deletedAt: null }, select: { id: true, fileName: true, remark: true, agentShortName: true } });
    const activeBookLookup = new Map<string, { id: string; fileName: string; agentShortName?: string; remark?: string }>();
    for (const book of activeBooks) {
      const summary = { id: book.id, fileName: book.fileName, agentShortName: book.agentShortName?.trim() || undefined, remark: book.remark?.trim() || undefined };
      activeBookLookup.set(book.fileName, summary);
      activeBookLookup.set(book.id, summary);
    }
    const quotePriceRows = quoteRows.map((row) => legacyRowToPriceBookRow(row, row.costPerKg ?? row.cbmPrice ?? 0, row.maxWeightKg ?? row.minWeightKg ?? 1));
    const moduleMarkupRules = filterAgentMarkupRulesByModule(markupRules, normalizedInput.module, quotePriceRows);
    const response = createLegacyPricingQuote(
      principal,
      normalizedInput,
      quoteRows,
      buildSyncedAgentMarkupRules(moduleMarkupRules, buildLegacyAgentSourcesFromRows(quoteRows, activeBooks, normalizedInput.module)),
      activeBookLookup
    );
    const selectedAmazonWeightBand = normalizedInput.module === 'amazon'
      ? normalizeAmazonWeightBand(response.selected?.weightSegmentLabel)
      : undefined;
    if (selectedAmazonWeightBand) {
      normalizedInput = { ...normalizedInput, tier: selectedAmazonWeightBand, weightBand: selectedAmazonWeightBand };
      response.query = normalizedInput;
    }
    logPricingLookupTiming('pricing.legacy.lookup.total', startedAt, {
      module: normalizedInput.module,
      legacyRows: rows.length,
      fallbackRows: fallbackPriceScope.rows.length,
      recommendations: response.recommendations.length,
      matchedRows: response.metrics.matchedRows
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.legacy.quote',
        target: normalizedInput.module,
        after: { module: normalizedInput.module, weightBand: normalizedInput.weightBand, matchedRows: response.metrics.matchedRows, selected: response.selected?.id }
      }
    });
    const businessId = response.selected?.id ?? `legacy-price-lookup:${Date.now()}`;
    void this.lineage?.recordMainFlowResult('pricing', 'legacy_price_lookup', 'legacy_price_lookup', businessId, {
      query: normalizedInput,
      selected: response.selected,
      recommendationCount: response.recommendations.length
    }, response.recommendations.map((item) => ({ nodeType: 'legacy_pricing_row', id: item.id })), {
      module: normalizedInput.module,
      legacyRows: rows.length,
      fallbackRows: fallbackPriceScope.rows.length,
      matchedRows: response.metrics.matchedRows,
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
    const sources = await (this.prisma as any).legacyPricingSource.findMany({
      where: { deletedAt: null, ...(module ? { module } : {}) },
      orderBy: { importedAt: 'desc' }
    });
    return { sources: sources.map(mapLegacyPricingSource) };
  }

  async importLegacyPricingSource(principal: Principal, input: LegacyPricingImportInput) {
    this.ensureAdmin(principal, '只有管理员可以导入亮崽报价副本');
    if (!input.module || !input.fileName?.trim() || !Array.isArray(input.rows) || input.rows.length === 0) {
      throw new BadRequestException('亮崽报价源、文件名和报价行不能为空');
    }
    await (this.prisma as any).legacyPricingSource.updateMany({
      where: { module: input.module, fileName: input.fileName.trim(), deletedAt: null },
      data: { deletedAt: new Date() }
    });
    const normalizedRows = input.rows.map((row) => normalizeLegacyRawRow(input.module, input.fileName, row));
    const created = await (this.prisma as any).legacyPricingSource.create({
      data: {
        module: input.module,
        fileName: input.fileName.trim(),
        rowCount: normalizedRows.length,
        rows: { create: normalizedRows.map((row) => legacyPricingRowCreateData(input.module, row)) }
      },
      include: { rows: true }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.legacy.source.import', target: created.id, after: { module: input.module, fileName: created.fileName, rowCount: created.rowCount } }
    });
    return { source: mapLegacyPricingSource(created), rowCount: created.rows.length };
  }

  async deleteLegacyPricingSource(principal: Principal, id: string) {
    this.ensureAdmin(principal, '只有管理员可以删除亮崽报价副本');
    const current = await (this.prisma as any).legacyPricingSource.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      throw new NotFoundException('亮崽报价源不存在');
    }
    const deleted = await (this.prisma as any).legacyPricingSource.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.legacy.source.delete', target: id, before: { ...mapLegacyPricingSource(current) }, after: { deletedAt: deleted.deletedAt } }
    });
    return mapLegacyPricingSource(deleted);
  }

  async rebuildLegacyPricing(principal: Principal, module?: LegacyPricingModule) {
    this.ensureAdmin(principal, '只有管理员可以重建亮崽报价副本');
    const rows = await this.loadLegacyPricingRows(module);
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.legacy.rebuild', target: module ?? 'all', after: { rowCount: rows.length } }
    });
    return { module: module ?? 'all', rowCount: rows.length, rebuiltAt: new Date().toISOString() };
  }

  async getLegacyPricingHealth(principal: Principal, module?: LegacyPricingModule) {
    this.ensureAdmin(principal, '只有管理员可以查看亮崽报价体检');
    const sources = await (this.prisma as any).legacyPricingSource.findMany({
      where: { deletedAt: null, ...(module ? { module } : {}) },
      include: {
        rows: { select: { id: true } },
        priceBook: { select: { id: true, deletedAt: true, targetModule: true } }
      }
    });
    const isQuoteEligible = (source: any) => source.priceBook
      && !source.priceBook.deletedAt
      && normalizeAgentMarkupLegacyModule(source.priceBook.targetModule) === source.module;
    const eligibleSourceIds = new Set(sources.filter(isQuoteEligible).map((source: any) => source.id));
    const rows = (await this.loadLegacyPricingRows(module)).filter((row) => eligibleSourceIds.has(row.sourceId ?? ''));
    const missingAgent = rows.filter((row) => !row.agentName).length;
    const missingChannel = rows.filter((row) => !row.channelName).length;
    const missingCost = rows.filter((row) => !Number.isFinite(row.costPerKg ?? row.cbmPrice ?? 0)).length;
    const unboundSources = sources.filter((source: any) => !source.priceBook);
    const inactiveBookSources = sources.filter((source: any) => source.priceBook?.deletedAt);
    const moduleMismatchSources = sources.filter((source: any) => source.priceBook && !source.priceBook.deletedAt && normalizeAgentMarkupLegacyModule(source.priceBook.targetModule) !== source.module);
    const sourceRows = (items: any[]) => items.reduce((total, source) => total + source.rows.length, 0);
    return {
      module: module ?? 'all',
      rowCount: rows.length,
      issues: [
        ...(unboundSources.length ? [{ severity: 'warn', message: `${unboundSources.length} 个未绑定价格表的历史报价源（${sourceRows(unboundSources)} 行）已隔离，不参与查价` }] : []),
        ...(inactiveBookSources.length ? [{ severity: 'warn', message: `${inactiveBookSources.length} 个已失效价格表的历史报价源（${sourceRows(inactiveBookSources)} 行）已隔离，不参与查价` }] : []),
        ...(moduleMismatchSources.length ? [{ severity: 'error', message: `${moduleMismatchSources.length} 个模块不一致的历史报价源（${sourceRows(moduleMismatchSources)} 行）已隔离，不参与查价` }] : []),
        ...(missingAgent ? [{ severity: 'error', message: `${missingAgent} 行缺少代理` }] : []),
        ...(missingChannel ? [{ severity: 'error', message: `${missingChannel} 行缺少渠道` }] : []),
        ...(missingCost ? [{ severity: 'warn', message: `${missingCost} 行缺少可用价格` }] : [])
      ]
    };
  }

  private async loadLegacyPricingRows(module?: LegacyPricingModule): Promise<LegacyPricingRowInternal[]> {
    const sources = await (this.prisma as any).legacyPricingSource.findMany({
      where: { deletedAt: null, ...(module ? { module } : {}) },
      include: { rows: true }
    });
    return sources.flatMap((source: any) => source.rows.map((row: any) => mapLegacyPricingRow(row, source)));
  }

  /**
   * 只有明确绑定到当前有效价格表、且模块一致的兼容行，才允许作为
   * 查价候选或展示元数据。历史文件名相同不能再被当成有效关联。
   */
  private async loadQuoteEligibleLegacyPricingRows(module?: LegacyPricingModule): Promise<LegacyPricingRowInternal[]> {
    const sources = await (this.prisma as any).legacyPricingSource.findMany({
      where: { deletedAt: null, ...(module ? { module } : {}) },
      include: {
        rows: true,
        priceBook: { select: { id: true, deletedAt: true, targetModule: true } }
      }
    });
    return sources
      .filter((source: any) => source.priceBook
        && !source.priceBook.deletedAt
        && normalizeAgentMarkupLegacyModule(source.priceBook.targetModule) === source.module)
      .flatMap((source: any) => source.rows.map((row: any) => mapLegacyPricingRow(row, source)));
  }

  private async loadPriceRowsForLookup(input: PriceLookupRequest, legacyModule?: LegacyPricingModule): Promise<{ rows: PriceBookRowSummary[]; books: PriceBookSummary[] }> {
    const startedAt = Date.now();
    const destinationCountry = input.destinationCountry?.trim();
    const chargeableWeightKg = calculateLookupChargeableWeight(input);
    const warehouseProfile = createWarehouseLookupProfile(input);
    const rowWhere: Record<string, unknown> = {
      priceBook: { deletedAt: null, ...(legacyModule ? { targetModule: legacyModule } : {}) },
      ...(destinationCountry ? { destinationCountry } : {}),
      ...(Number.isFinite(chargeableWeightKg) && chargeableWeightKg > 0 ? { minWeightKg: { lte: chargeableWeightKg } } : {})
    };
    const warehouseOr = buildPriceRowWarehouseWhere(warehouseProfile);
    if (warehouseOr.length) {
      rowWhere.OR = warehouseOr;
    }
    const rows = await (this.prisma as any).priceBookRow.findMany({
      where: rowWhere,
      include: { priceBook: true },
      orderBy: [{ priceBook: { importedAt: 'desc' } }, { agentName: 'asc' }, { minWeightKg: 'asc' }],
      take: PRICING_LOOKUP_ROW_LIMIT
    });
    const bookMap = new Map<string, PriceBookSummary>();
    for (const row of rows) {
      if (row.priceBook && !bookMap.has(row.priceBook.id)) {
        bookMap.set(row.priceBook.id, mapPriceBook(row.priceBook));
      }
    }
    const mappedRows = rows.map(mapPriceBookRow);
    logPricingLookupTiming('pricing.lookup.priceRows.db', startedAt, {
      rows: mappedRows.length,
      destinationCountry,
      hasWarehouse: Boolean(warehouseProfile.code)
    });
    return { rows: mappedRows, books: [...bookMap.values()] };
  }

  private async loadLegacyPricingRowsForQuote(input: LegacyPricingQuoteRequest, chargeableWeightKg: number): Promise<LegacyPricingRowInternal[]> {
    const startedAt = Date.now();
    const sourceIds = await this.loadLegacyPricingSourceIdsForQuote(input.module);
    if (!sourceIds.length) {
      return [];
    }
    const destination = input.destinationCountry?.trim();
    const destinationAliases = destination ? legacyCountryQueryValues(destination) : [];
    const where: Record<string, unknown> = {
      module: input.module,
      sourceId: { in: sourceIds },
      ...(input.agentName?.trim() ? { agentName: input.agentName.trim() } : {})
    };
    const andFilters: Record<string, unknown>[] = [];
    if (input.amazonCode?.trim()) {
      const amazonCode = normalizeWarehouseCode(input.amazonCode);
      const warehouseRules = Array.from(new Set([amazonCode, ...warehouseCodePrefixCandidates(amazonCode)])).filter(Boolean);
      andFilters.push({
        OR: [
          ...warehouseRules.map((warehouseCode) => ({ warehouseCode: { equals: warehouseCode, mode: 'insensitive' } }))
        ]
      });
    }
    if (destinationAliases.length) {
      andFilters.push({
        OR: [
          { destinationCountry: null },
          ...destinationAliases.map((value) => ({ destinationCountry: { contains: value, mode: 'insensitive' } }))
        ]
      });
    }
    if (Number.isFinite(chargeableWeightKg) && chargeableWeightKg > 0) {
      andFilters.push({
        OR: [
          { minWeightKg: { lte: chargeableWeightKg }, costPerKg: { not: null } },
          ...(Number(input.volumeCbm ?? 0) > 0 ? [{ cbmPrice: { not: null } }] : [])
        ]
      });
    }
    // Inquiry now has structured transport modes persisted in legacy raw data.
    // Filter it in memory after loading instead of relying on a text fragment
    // such as “铁海联运” appearing verbatim in every source sheet.
    if (input.channel?.trim() && input.module !== 'inquiry') {
      const channel = input.channel.trim();
      andFilters.push({
        OR: [
          { channelName: { contains: channel, mode: 'insensitive' } },
          { serviceName: { contains: channel, mode: 'insensitive' } },
          { origin: { contains: channel, mode: 'insensitive' } },
          { remark: { contains: channel, mode: 'insensitive' } }
        ]
      });
    }
    if (andFilters.length) {
      where.AND = andFilters;
    }
    const rows = await (this.prisma as any).legacyPricingRow.findMany({
      where,
      include: { source: true },
      orderBy: [{ agentName: 'asc' }, { minWeightKg: 'asc' }],
      take: PRICING_LOOKUP_ROW_LIMIT
    });
    const mappedRows = rows.map((row: any) => mapLegacyPricingRow(row, row.source));
    logPricingLookupTiming('pricing.legacy.rows.db', startedAt, {
      module: input.module,
      sourceCount: sourceIds.length,
      rows: mappedRows.length,
      destination,
      hasChannel: Boolean(input.channel?.trim())
    });
    return mappedRows;
  }

  private async loadLegacyPricingSourceIdsForQuote(module: LegacyPricingModule): Promise<string[]> {
    const [activeBooks, moduleSources] = await Promise.all([
      (this.prisma as any).priceBook.findMany({
        where: { deletedAt: null },
        select: { id: true, fileName: true, targetModule: true }
      }),
      (this.prisma as any).legacyPricingSource.findMany({
        where: { deletedAt: null, module },
        select: { id: true, priceBookId: true, fileName: true }
      })
    ]);
    const activeBookById = new Map<string, { targetModule?: string | null }>(activeBooks.map((book: any) => [book.id, book]));
    const scopedSources = moduleSources.filter((source: { priceBookId?: string | null }) => {
      const book = source.priceBookId ? activeBookById.get(source.priceBookId) : undefined;
      return Boolean(book && normalizeAgentMarkupLegacyModule(book.targetModule) === module);
    });
    return scopedSources.map((source: { id: string }) => source.id);
  }

  async getAgentMarkupRules(principal: Principal, query: AgentMarkupListQuery = {}): Promise<AgentMarkupListResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看代理加价规则');
    const legacyModule = normalizeAgentMarkupModuleQuery(query.legacyModule);
    const [rules, agentSources] = await Promise.all([
      this.loadAgentMarkupRules(true),
      this.loadActivePriceBookAgentSources(legacyModule)
    ]);
    const shouldLoadPriceRows = shouldIncludeAgentMarkupHits(query) || !query.detail;
    const scopedPriceRows = shouldLoadPriceRows
      ? await this.loadPriceBookRowsForMarkupValidation(legacyModule, agentSources)
      : [];
    const scopedSources = filterAgentMarkupSourcesByModule(agentSources, legacyModule);
    const scopedRules = filterAgentMarkupRulesByModuleSources(rules, legacyModule, scopedSources);
    return buildAgentMarkupListResponse(
      buildSyncedAgentMarkupRules(scopedRules, scopedSources),
      scopedPriceRows,
      query
    );
  }

  async previewAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupPreviewResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看规则命中线路');
    const [current, books, logs] = await Promise.all([
      (this.prisma as any).agentMarkupRule.findFirst({ where: { id, deletedAt: null } }),
      this.loadPriceBookRowsForMarkupValidation(),
      this.prisma.auditLog.findMany({ where: { target: id }, orderBy: { createdAt: 'desc' }, take: 5 })
    ]);
    if (!current) {
      throw new NotFoundException('代理加价规则不存在');
    }
    return buildAgentMarkupPreview(mapAgentMarkupRule(current), books, logs);
  }

  async previewMarkupRoute(principal: Principal, input: MarkupRoutePreviewInput): Promise<MarkupRoutePreviewResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看线路阶梯加价');
    const route = normalizeMarkupRoutePreviewInput(input);
    const [book, rows, rules] = await Promise.all([
      (this.prisma as any).priceBook.findFirst({ where: { id: route.priceBookId, deletedAt: null }, select: { id: true, targetModule: true, agentShortName: true } }),
      this.loadPriceBookRowsForMarkupValidation(),
      this.loadAgentMarkupRules(true)
    ]);
    if (!book) throw new NotFoundException('价格表不存在或已删除');
    if (book.agentShortName?.trim() && book.agentShortName.trim() !== route.agentName) throw new BadRequestException('代理与价格表绑定不一致');
    const routeRows = rows.filter((row) => markupRouteRowMatches(row, route));
    if (!routeRows.length) throw new NotFoundException('当前价格表未找到该真实线路');
    const scopedRules = rules.filter((rule) => !rule.deletedAt && rule.enabled && rule.agentName === route.agentName && (!rule.legacyModule || rule.legacyModule === book.targetModule));
    return buildMarkupRoutePreview(route, routeRows, scopedRules);
  }

  async replaceMarkupRouteTiers(principal: Principal, input: MarkupRouteTierReplaceInput): Promise<MarkupRoutePreviewResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护线路阶梯加价');
    const route = normalizeMarkupRoutePreviewInput(input);
    const tiers = normalizeMarkupRouteTiers(input.tiers, route.markupUnit);
    const [book, rows] = await Promise.all([
      (this.prisma as any).priceBook.findFirst({ where: { id: route.priceBookId, deletedAt: null }, select: { id: true, targetModule: true, agentShortName: true } }),
      this.loadPriceBookRowsForMarkupValidation()
    ]);
    if (!book) throw new NotFoundException('价格表不存在或已删除');
    if (book.agentShortName?.trim() && book.agentShortName.trim() !== route.agentName) throw new BadRequestException('代理与价格表绑定不一致');
    const routeRows = rows.filter((row) => markupRouteRowMatches(row, route));
    if (!routeRows.length) throw new NotFoundException('当前价格表未找到该真实线路');
    await this.prisma.$transaction(async (tx: any) => {
      await tx.agentMarkupRule.deleteMany({ where: {
        deletedAt: null,
        priceBookId: route.priceBookId,
        agentName: route.agentName,
        channelName: route.channelName,
        realChannelName: route.realChannelName === route.channelName ? null : route.realChannelName,
        destinationCountry: route.destinationCountry,
        markupUnit: route.markupUnit
      } });
      if (tiers.length) {
        await tx.agentMarkupRule.createMany({ data: tiers.map((tier) => ({
          priceBookId: route.priceBookId,
          legacyModule: normalizeAgentMarkupLegacyModule(book.targetModule) ?? null,
          agentName: route.agentName,
          channelName: route.channelName,
          realChannelName: route.realChannelName === route.channelName ? null : route.realChannelName,
          destinationCountry: route.destinationCountry,
          markupPerKg: tier.markupValue,
          markupType: 'WEIGHT',
          markupValue: tier.markupValue,
          markupUnit: route.markupUnit,
          minChargeableValue: tier.minChargeableValue,
          maxChargeableValue: tier.maxChargeableValue ?? null,
          priority: 10,
          enabled: true
        })) });
      }
    });
    await this.prisma.auditLog.create({ data: {
      actorId: principal.id,
      action: 'pricing.markup.route_tiers.replace',
      target: route.priceBookId,
      after: JSON.parse(JSON.stringify({ route, tiers }))
    } });
    return this.previewMarkupRoute(principal, route);
  }

  async migrateLegacyMarkupRouteScopes(principal: Principal): Promise<{ migratedCount: number; archivedCount: number; skippedCount: number }> {
    this.ensurePricingManager(principal, '只有管理员或市场可以迁移线路阶梯加价');
    const [rules, rows, books] = await Promise.all([
      this.loadAgentMarkupRules(true),
      this.loadPriceBookRowsForMarkupValidation(),
      (this.prisma as any).priceBook.findMany({ where: { deletedAt: null }, select: { id: true, targetModule: true, agentShortName: true } })
    ]);
    const moduleByBookId = new Map<string, LegacyPricingModule | undefined>(books.map((book: any) => [book.id, normalizeAgentMarkupLegacyModule(book.targetModule)]));
    const agentByBookId = new Map<string, string | undefined>(books.map((book: any) => [book.id, book.agentShortName?.trim() || rows.find((row) => row.priceBookId === book.id)?.agentName]));
    const legacyTiers = rules.filter((rule) => !rule.deletedAt && rule.enabled && rule.markupUnit && !rule.priceBookId);
    let migratedCount = 0;
    let archivedCount = 0;
    let skippedCount = 0;
    const now = new Date();
    await this.prisma.$transaction(async (tx: any) => {
      for (const rule of legacyTiers) {
        const scopes = uniqueMarkupRouteScopes(rows
          .filter((row) => (!rule.legacyModule || moduleByBookId.get(row.priceBookId) === rule.legacyModule)
            && agentByBookId.get(row.priceBookId) === rule.agentName
            && row.channelName === rule.channelName
            && (!rule.realChannelName || (row.realChannelName?.trim() || row.channelName) === rule.realChannelName)
            && (!rule.destinationCountry || row.destinationCountry === rule.destinationCountry)
            && markupUnitForRow(row) === rule.markupUnit));
        for (const scope of scopes) {
          const duplicate = await tx.agentMarkupRule.findFirst({ where: {
            deletedAt: null,
            priceBookId: scope.priceBookId,
            agentName: rule.agentName,
            channelName: scope.channelName,
            realChannelName: scope.realChannelName === scope.channelName ? null : scope.realChannelName,
            destinationCountry: scope.destinationCountry,
            markupUnit: rule.markupUnit,
            minChargeableValue: rule.minChargeableValue ?? null,
            maxChargeableValue: rule.maxChargeableValue ?? null
          } });
          if (duplicate) {
            skippedCount += 1;
            continue;
          }
          await tx.agentMarkupRule.create({ data: {
            priceBookId: scope.priceBookId,
            legacyModule: rule.legacyModule ?? moduleByBookId.get(scope.priceBookId) ?? null,
            agentName: rule.agentName,
            channelName: scope.channelName,
            realChannelName: scope.realChannelName === scope.channelName ? null : scope.realChannelName,
            destinationCountry: scope.destinationCountry,
            markupPerKg: rule.markupPerKg,
            markupType: rule.markupType ?? 'WEIGHT',
            markupValue: rule.markupValue ?? rule.markupPerKg,
            markupUnit: rule.markupUnit,
            minChargeableValue: rule.minChargeableValue,
            maxChargeableValue: rule.maxChargeableValue,
            priority: rule.priority ?? 10,
            enabled: true
          } });
          migratedCount += 1;
        }
        await tx.agentMarkupRule.update({ where: { id: rule.id }, data: { deletedAt: now } });
        archivedCount += 1;
      }
    });
    if (legacyTiers.length) {
      await this.prisma.auditLog.create({ data: {
        actorId: principal.id,
        action: 'pricing.markup.tier_scope_migration',
        target: 'agent-markup-rules',
        after: { migratedCount, archivedCount, skippedCount, legacyRuleIds: legacyTiers.map((rule) => rule.id) }
      } });
    }
    return { migratedCount, archivedCount, skippedCount };
  }

  async exportAgentMarkupRules(principal: Principal, query: AgentMarkupListQuery = {}): Promise<AgentMarkupExportResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导出代理加价规则');
    const response = await this.getAgentMarkupRules(principal, { ...query, page: 1, pageSize: AGENT_MARKUP_EXPORT_ROW_LIMIT });
    if (response.pagination.totalItems > AGENT_MARKUP_EXPORT_ROW_LIMIT) {
      throw new BadRequestException(`导出规则超过 ${AGENT_MARKUP_EXPORT_ROW_LIMIT} 条，请先筛选后再导出`);
    }
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.export', target: 'agent-markup-rules', after: { count: response.rows.length } }
    });
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
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.import', target: 'agent-markup-rules', after: { successCount: created.length, errorRows } }
    });
    return { successCount: created.length, errorRows, rows: created };
  }

  async batchUpsertAgentMarkupRules(principal: Principal, input: { rows?: AgentMarkupCreateInput[] }): Promise<AgentMarkupImportResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以批量维护代理加价规则');
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const [priceRows, workingRules, agentSources] = await Promise.all([
      this.loadPriceBookRowsForMarkupValidation(),
      this.loadAgentMarkupRules(true),
      this.loadActivePriceBookAgentSources()
    ]);
    const upserted: AgentMarkupSummary[] = [];
    const errorRows: AgentMarkupImportResponse['errorRows'] = [];

    for (const [index, row] of rows.entries()) {
      try {
        const normalized = normalizeAgentMarkupInput(row);
        if (!normalized.legacyModule && normalized.priceBookId) {
          normalized.legacyModule = agentSources.find((source) => source.priceBookId === normalized.priceBookId)?.legacyModule;
        }
        const existingRules = findAgentMarkupRulesByScope(workingRules, normalized);
        const existingRuleIds = new Set(existingRules.map((rule) => rule.id));
        validateAgentMarkupRule(normalized, priceRows, workingRules.filter((rule) => !existingRuleIds.has(rule.id)));
        const markupValue = normalized.markupValue ?? normalized.markupPerKg;
        if (!normalized.agentName || !Number.isFinite(markupValue) || markupValue < 0) {
          throw new BadRequestException('代理名称和加价金额不能为空');
        }
        const data = {
          priceBookId: normalized.priceBookId ?? null,
          legacyModule: normalized.legacyModule ?? null,
          agentName: normalized.agentName,
          channelName: normalized.channelName ?? null,
          realChannelName: normalized.realChannelName ?? null,
          destinationCountry: normalized.destinationCountry ?? null,
          markupPerKg: normalized.markupPerKg,
          markupType: normalized.markupType,
          markupValue: normalized.markupValue,
          markupUnit: normalized.markupUnit ?? null,
          minChargeableValue: normalized.minChargeableValue ?? null,
          maxChargeableValue: normalized.maxChargeableValue ?? null,
          priority: normalized.priority,
          enabled: normalized.enabled
        };
        const savedRows = existingRules.length
          ? await Promise.all(existingRules.map((existing) => (this.prisma as any).agentMarkupRule.update({ where: { id: existing.id }, data })))
          : [await (this.prisma as any).agentMarkupRule.create({ data })];
        const summaries = savedRows.map(mapAgentMarkupRule);
        for (const summary of summaries) {
          const currentIndex = workingRules.findIndex((item) => item.id === summary.id);
          if (currentIndex >= 0) {
            workingRules[currentIndex] = summary;
          } else {
            workingRules.unshift(summary);
          }
        }
        if (summaries.length) {
          upserted.push(summaries[0]);
        } else {
          throw new BadRequestException('规则保存失败');
        }
      } catch (error) {
        errorRows.push({ index: index + 1, reason: error instanceof Error ? error.message : '规则格式错误' });
      }
    }

    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.batch_upsert', target: 'agent-markup-rules', after: { successCount: upserted.length, errorRows } }
    });
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
    const where = buildAgentMarkupBatchWhere(input);
    const before = await (this.prisma as any).agentMarkupRule.findMany({ where });
    const ids = before.map((row: any) => row.id);
    if (ids.length) {
      await (this.prisma as any).agentMarkupRule.updateMany({ where: { id: { in: ids } }, data: { enabled: input.enabled } });
    }
    const createdIds: string[] = [];
    for (const scope of normalizeAgentMarkupBatchScopes(input)) {
      const agentName = scope.agentName;
      const hasAnyRuleForAgent = before.some((row: any) => row.agentName === agentName && (row.priceBookId ?? null) === (scope.priceBookId ?? null) && (row.legacyModule ?? null) === (scope.legacyModule ?? null))
        || await (this.prisma as any).agentMarkupRule.findFirst({ where: { agentName, priceBookId: scope.priceBookId ?? null, legacyModule: scope.legacyModule ?? null, channelName: null, realChannelName: null, destinationCountry: null } });
      if (hasAnyRuleForAgent) {
        continue;
      }
      const row = await (this.prisma as any).agentMarkupRule.create({
        data: {
          priceBookId: scope.priceBookId ?? null,
          legacyModule: scope.legacyModule ?? null,
          agentName,
          markupPerKg: 0.5,
          markupType: 'WEIGHT',
          markupValue: 0.5,
          priority: 100,
          enabled: input.enabled
        }
      });
      createdIds.push(row.id);
    }
    const changedIds = [...ids, ...createdIds];
    const rows = changedIds.length
      ? await (this.prisma as any).agentMarkupRule.findMany({ where: { id: { in: changedIds } }, orderBy: [{ agentName: 'asc' }, { priority: 'asc' }] })
      : [];
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.batch_status', target: 'agent-markup-rules', after: { successCount: rows.length, enabled: input.enabled, ids: changedIds, agentNames: normalizeStringList(input.agentNames), scopes: normalizeAgentMarkupBatchScopes(input) } }
    });
    const summaries: AgentMarkupSummary[] = rows.map(mapAgentMarkupRule);
    void this.lineage?.recordEvent('pricing.markup.batch_change', {
      businessId: `agent-markup-batch:${Date.now()}`,
      actorUsername: principal.username,
      payload: { action: 'batch_status', enabled: input.enabled, ids: changedIds, agentNames: normalizeStringList(input.agentNames), scopes: normalizeAgentMarkupBatchScopes(input) },
      sourceRefs: summaries.map((rule) => ({ nodeType: 'agent_markup_rule', id: rule.id })),
      metrics: { successCount: summaries.length, enabled: input.enabled ? 1 : 0 }
    });
    return { successCount: rows.length, rows: summaries };
  }

  async batchDeleteAgentMarkupRules(principal: Principal, input: { ids?: string[]; agentNames?: string[]; scopes?: AgentMarkupBatchScopeInput[] }): Promise<{ successCount: number; rows: AgentMarkupSummary[] }> {
    this.ensurePricingManager(principal, '只有管理员或市场可以批量删除代理加价规则');
    const where = buildAgentMarkupBatchWhere(input);
    const before = await (this.prisma as any).agentMarkupRule.findMany({ where });
    const ids = before.map((row: any) => row.id);
    if (ids.length) {
      await (this.prisma as any).agentMarkupRule.deleteMany({ where: { id: { in: ids } } });
    }
    const changedIds = ids;
    const rows = before;
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.batch_delete', target: 'agent-markup-rules', before: JSON.parse(JSON.stringify(before.map(mapAgentMarkupRule))), after: { successCount: rows.length, ids: changedIds, hardDelete: true, agentNames: normalizeStringList(input.agentNames), scopes: normalizeAgentMarkupBatchScopes(input) } }
    });
    const summaries: AgentMarkupSummary[] = rows.map(mapAgentMarkupRule);
    void this.lineage?.recordEvent('pricing.markup.batch_change', {
      businessId: `agent-markup-batch:${Date.now()}`,
      actorUsername: principal.username,
      payload: { action: 'batch_delete', ids: changedIds, hardDelete: true, agentNames: normalizeStringList(input.agentNames), scopes: normalizeAgentMarkupBatchScopes(input) },
      sourceRefs: summaries.map((rule) => ({ nodeType: 'agent_markup_rule', id: rule.id })),
      metrics: { successCount: summaries.length, deletedCount: summaries.length }
    });
    return { successCount: rows.length, rows: summaries };
  }

  async createAgentMarkupRule(principal: Principal, input: AgentMarkupCreateInput): Promise<AgentMarkupSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以新增代理加价规则');
    const normalized = normalizeAgentMarkupInput(input);
    const [priceRows, currentRules, agentSources] = await Promise.all([
      this.loadPriceBookRowsForMarkupValidation(),
      this.loadAgentMarkupRules(true),
      this.loadActivePriceBookAgentSources()
    ]);
    if (!normalized.legacyModule && normalized.priceBookId) {
      normalized.legacyModule = agentSources.find((source) => source.priceBookId === normalized.priceBookId)?.legacyModule;
    }
    validateAgentMarkupRule(normalized, priceRows, currentRules);
    const markupValue = normalized.markupValue ?? normalized.markupPerKg;
    if (!input.agentName?.trim() || !Number.isFinite(markupValue) || markupValue < 0) {
      throw new BadRequestException('代理名称和加价金额不能为空');
    }
    const row = await (this.prisma as any).agentMarkupRule.create({
      data: {
        priceBookId: normalized.priceBookId ?? null,
        legacyModule: normalized.legacyModule ?? null,
        agentName: normalized.agentName,
        channelName: normalized.channelName ?? null,
        realChannelName: normalized.realChannelName ?? null,
        destinationCountry: normalized.destinationCountry ?? null,
        markupPerKg: normalized.markupPerKg,
        markupType: normalized.markupType,
        markupValue: normalized.markupValue,
        markupUnit: normalized.markupUnit ?? null,
        minChargeableValue: normalized.minChargeableValue ?? null,
        maxChargeableValue: normalized.maxChargeableValue ?? null,
        priority: normalized.priority,
        enabled: normalized.enabled
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.create', target: row.id, after: JSON.parse(JSON.stringify(mapAgentMarkupRule(row))) }
    });
    const summary = mapAgentMarkupRule(row);
    void this.lineage?.recordEvent('pricing.markup.rule_change', {
      businessId: summary.id,
      actorUsername: principal.username,
      payload: { action: 'create', rule: summary },
      metrics: { enabled: summary.enabled ? 1 : 0, markupValue: Number(summary.markupValue ?? summary.markupPerKg ?? 0) }
    });
    return summary;
  }

  async updateAgentMarkupRule(principal: Principal, id: string, input: AgentMarkupUpdateInput): Promise<AgentMarkupSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以修改代理加价规则');
    const current = await (this.prisma as any).agentMarkupRule.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      throw new NotFoundException('代理加价规则不存在');
    }
    const normalized = normalizeAgentMarkupInput({ ...mapAgentMarkupRule(current), ...input });
    const [priceRows, currentRules, agentSources] = await Promise.all([
      this.loadPriceBookRowsForMarkupValidation(),
      this.loadAgentMarkupRules(true),
      this.loadActivePriceBookAgentSources()
    ]);
    if (!normalized.legacyModule && normalized.priceBookId) {
      normalized.legacyModule = agentSources.find((source) => source.priceBookId === normalized.priceBookId)?.legacyModule;
    }
    validateAgentMarkupRule(normalized, priceRows, currentRules, id);
    const row = await (this.prisma as any).agentMarkupRule.update({
      where: { id },
      data: {
        ...(input.priceBookId !== undefined ? { priceBookId: normalized.priceBookId ?? null } : {}),
        ...(input.legacyModule !== undefined ? { legacyModule: normalized.legacyModule ?? null } : {}),
        ...(input.agentName !== undefined ? { agentName: normalized.agentName } : {}),
        ...(input.channelName !== undefined ? { channelName: normalized.channelName ?? null } : {}),
        ...(input.realChannelName !== undefined ? { realChannelName: normalized.realChannelName ?? null } : {}),
        ...(input.destinationCountry !== undefined ? { destinationCountry: normalized.destinationCountry ?? null } : {}),
        ...(input.markupUnit !== undefined ? { markupUnit: normalized.markupUnit ?? null } : {}),
        ...(input.minChargeableValue !== undefined ? { minChargeableValue: normalized.minChargeableValue ?? null } : {}),
        ...(input.maxChargeableValue !== undefined ? { maxChargeableValue: normalized.maxChargeableValue ?? null } : {}),
        ...(input.markupPerKg !== undefined || input.markupValue !== undefined || input.markupType !== undefined ? { markupPerKg: normalized.markupPerKg, markupType: normalized.markupType, markupValue: normalized.markupValue } : {}),
        ...(input.priority !== undefined ? { priority: normalized.priority } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {})
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.update', target: id, before: JSON.parse(JSON.stringify(mapAgentMarkupRule(current))), after: JSON.parse(JSON.stringify(mapAgentMarkupRule(row))) }
    });
    const summary = mapAgentMarkupRule(row);
    void this.lineage?.recordEvent('pricing.markup.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'update', before: mapAgentMarkupRule(current), after: summary },
      sourceRefs: [{ nodeType: 'agent_markup_rule', id }],
      metrics: { enabled: summary.enabled ? 1 : 0, markupValue: Number(summary.markupValue ?? summary.markupPerKg ?? 0) }
    });
    return summary;
  }

  async deleteAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以删除代理加价规则');
    const current = await (this.prisma as any).agentMarkupRule.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      throw new NotFoundException('代理加价规则不存在');
    }
    await (this.prisma as any).agentMarkupRule.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup_rule.delete', target: id, before: JSON.parse(JSON.stringify(mapAgentMarkupRule(current))), after: { hardDelete: true } }
    });
    const summary = mapAgentMarkupRule(current);
    void this.lineage?.recordEvent('pricing.markup.rule_change', {
      businessId: id,
      actorUsername: principal.username,
      payload: { action: 'delete', before: summary, hardDelete: true },
      sourceRefs: [{ nodeType: 'agent_markup_rule', id }],
      metrics: { deleted: 1 }
    });
    return summary;
  }

  async getAgentChannelCustomRemarks(principal: Principal, legacyModule: LegacyPricingModule): Promise<AgentChannelCustomRemarkSummary[]> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看代理渠道自定义备注');
    const rows = await (this.prisma as any).agentChannelCustomRemark.findMany({
      where: { legacyModule },
      orderBy: [{ agentName: 'asc' }, { channelName: 'asc' }]
    });
    return rows.map(mapAgentChannelCustomRemark);
  }

  async upsertAgentChannelCustomRemark(principal: Principal, input: AgentChannelCustomRemarkInput): Promise<AgentChannelCustomRemarkSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护代理渠道自定义备注');
    const normalized = normalizeAgentChannelCustomRemarkInput(input);
    const [priceRows, books] = await Promise.all([
      this.loadPriceBookRowsForMarkupValidation(),
      (this.prisma as any).priceBook.findMany({ where: { deletedAt: null }, select: { id: true, targetModule: true, agentShortName: true } })
    ]);
    const scopedBookIds = new Set(books.filter((book: any) => book.targetModule === normalized.legacyModule).map((book: any) => book.id));
    validateAgentChannelCustomRemarkScope(
      normalized,
      priceRows.filter((row) => scopedBookIds.has(row.priceBookId)),
      new Map(books.map((book: any) => [book.id, book.agentShortName?.trim()]))
    );
    const before = await (this.prisma as any).agentChannelCustomRemark.findUnique({
      where: { legacyModule_agentName_channelName: { legacyModule: normalized.legacyModule, agentName: normalized.agentName, channelName: normalized.channelName } }
    });
    const row = await (this.prisma as any).agentChannelCustomRemark.upsert({
      where: { legacyModule_agentName_channelName: { legacyModule: normalized.legacyModule, agentName: normalized.agentName, channelName: normalized.channelName } },
      create: normalized,
      update: normalized
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: before ? 'pricing.channel_remark.update' : 'pricing.channel_remark.create', target: row.id, before: before ? JSON.parse(JSON.stringify(mapAgentChannelCustomRemark(before))) : undefined, after: JSON.parse(JSON.stringify(mapAgentChannelCustomRemark(row))) }
    });
    return mapAgentChannelCustomRemark(row);
  }

  async updateAgentChannelCustomRemarkEnabled(principal: Principal, id: string, enabled: boolean): Promise<AgentChannelCustomRemarkSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护代理渠道自定义备注');
    const before = await (this.prisma as any).agentChannelCustomRemark.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('代理渠道自定义备注不存在');
    const row = await (this.prisma as any).agentChannelCustomRemark.update({ where: { id }, data: { enabled } });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'pricing.channel_remark.enabled', target: id, before: JSON.parse(JSON.stringify(mapAgentChannelCustomRemark(before))), after: JSON.parse(JSON.stringify(mapAgentChannelCustomRemark(row))) } });
    return mapAgentChannelCustomRemark(row);
  }

  async getPriceBooks(principal: Principal, includeRows = false, targetModule?: PriceBookImportTargetModule): Promise<PriceBooksResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表明细');
    // Covers hot-reload/dev and a worker that was paused during startup. It is
    // only a cheap queue scan; workbook parsing still happens in the worker.
    this.schedulePriceBookRuleRefresh();
    void includeRows;
    const books = await (this.prisma as any).priceBook.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { rows: true } } },
      orderBy: { importedAt: 'desc' }
    });
    const activeBookIds = books.map((book: any) => book.id);
    const [legacySources, importJobs] = await Promise.all([
      activeBookIds.length
        ? (this.prisma as any).legacyPricingSource.findMany({ where: { deletedAt: null, priceBookId: { in: activeBookIds } } })
        : Promise.resolve([]),
      (this.prisma as any).priceBookImportJob.findMany({
        where: { priceBookId: { not: null }, status: { in: ['SUCCESS', 'PARTIAL_FAILED'] } },
        orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }]
      })
    ]);
    const legacyCountsByBookId = new Map<string, Partial<Record<LegacyPricingModule, number>>>();
    legacySources.forEach((source: any) => {
      if (!source.priceBookId) return;
      const module = normalizeAgentMarkupLegacyModule(source.module);
      if (!module) return;
      const counts = legacyCountsByBookId.get(source.priceBookId) ?? {};
      counts[module] = (counts[module] ?? 0) + Number(source.rowCount ?? 0);
      legacyCountsByBookId.set(source.priceBookId, counts);
    });
    const importRowsByBookId = new Map<string, number>();
    importJobs.forEach((job: any) => {
      if (!job.priceBookId || importRowsByBookId.has(job.priceBookId)) return;
      importRowsByBookId.set(job.priceBookId, Math.max(Number(job.totalRows ?? 0), Number(job.processedRows ?? 0)));
    });

    const summaries = books.map((book: any) => mapPriceBook(book, legacyCountsByBookId.get(book.id), importRowsByBookId.get(book.id)));
    return {
      books: targetModule
        ? summaries.filter((book: PriceBookSummary) => (book as PriceBookSummary & { targetModule?: PriceBookImportTargetModule }).targetModule === targetModule || (Object.keys(book.legacyModuleCounts ?? {}).length === 1 && book.legacyModuleCounts?.[targetModule]))
        : summaries,
      rows: []
    };
  }

  async downloadPriceBook(principal: Principal, id: string): Promise<{ fileName: string; buffer: Buffer }> {
    this.ensurePricingManager(principal, '只有管理员或市场可以下载价格表');
    const book = await (this.prisma as any).priceBook.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, fileName: true }
    });
    if (!book) throw new NotFoundException('价格表不存在');
    const importJob = await (this.prisma as any).priceBookImportJob.findFirst({
      where: { priceBookId: book.id, kind: 'IMPORT', filePath: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { filePath: true }
    });
    if (!importJob?.filePath) throw new BadRequestException('原始价格表文件不可用，无法下载');
    let buffer: Buffer;
    try {
      buffer = await readFile(importJob.filePath);
    } catch {
      throw new BadRequestException('原始价格表文件不可用，无法下载');
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.download',
        target: id,
        after: { fileName: book.fileName, sizeBytes: buffer.length }
      }
    });
    return { fileName: book.fileName, buffer };
  }

  async getPriceBookRuleRefreshProgress(principal: Principal): Promise<PricingRuleRefreshProgressResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表规则同步进度');
    this.schedulePriceBookRuleRefresh();
    const books = await (this.prisma as any).priceBook.findMany({
      where: { deletedAt: null, targetModule: { not: null } },
      select: {
        targetModule: true,
        parserRuleVersion: true,
        refreshStatus: true,
        lastRuleRefreshAt: true
      }
    });
    const modules = Object.keys(PRICING_PARSER_RULE_VERSIONS) as PriceBookImportTargetModule[];
    return {
      generatedAt: new Date().toISOString(),
      modules: modules.map((module) => {
        const ruleVersion = pricingParserRuleVersion(module);
        const scoped = books.filter((book: any) => book.targetModule === module);
        const byStatus = (status: string) => scoped.filter((book: any) => String(book.refreshStatus ?? 'CURRENT') === status).length;
        const currentBooks = scoped.filter((book: any) => Number(book.parserRuleVersion ?? 0) >= ruleVersion && String(book.refreshStatus ?? 'CURRENT') === 'CURRENT').length;
        const totalBooks = scoped.length;
        const refreshedAt = scoped
          .map((book: any) => book.lastRuleRefreshAt ? new Date(book.lastRuleRefreshAt).getTime() : 0)
          .reduce((latest: number, value: number) => Math.max(latest, value), 0);
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
          ...(refreshedAt ? { updatedAt: new Date(refreshedAt).toISOString() } : {})
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
    const targetModule = query.targetModule && isLegacyPricingModule(query.targetModule) ? query.targetModule : undefined;
    if (query.targetModule && !targetModule) {
      throw new BadRequestException('查价模块无效');
    }
    if (!priceBookId && !agentName) {
      throw new BadRequestException('查看线路必须选择价格表或代理，避免全量扫描价格行');
    }
    const agentMatchedBookIds = !priceBookId && agentName
      ? (await (this.prisma as any).priceBook.findMany({
          where: { deletedAt: null, ...(targetModule ? { targetModule } : {}) },
          select: { id: true, agentShortName: true }
        }))
        .filter((book: any) => textMatch(book.agentShortName ?? '', agentName))
        .map((book: any) => book.id)
      : [];
    const where = {
      ...(priceBookId ? { priceBookId } : {}),
      ...(!priceBookId && agentName ? { priceBookId: { in: agentMatchedBookIds } } : {}),
      priceBook: { deletedAt: null, ...(targetModule ? { targetModule } : {}) },
      ...(agentName && priceBookId ? { agentName: { contains: agentName, mode: 'insensitive' } } : {}),
      ...(query.channelName?.trim() ? { channelName: { contains: query.channelName.trim(), mode: 'insensitive' } } : {}),
      ...(query.sourceSheetName?.trim() ? { sourceSheetName: { contains: query.sourceSheetName.trim(), mode: 'insensitive' } } : {}),
      ...(query.destinationCountry?.trim() ? { destinationCountry: { contains: query.destinationCountry.trim(), mode: 'insensitive' } } : {})
    };
    const orderBy = [{ agentName: 'asc' }, { sourceSheetName: 'asc' }, { channelName: 'asc' }, { destinationCountry: 'asc' }, { minWeightKg: 'asc' }];
    const needsMarkupPostFilter = hasPriceBookRowMarkupControls(query);
    const [totalItems, rows] = needsMarkupPostFilter
      ? await Promise.all([
          (this.prisma as any).priceBookRow.count({ where }),
          (this.prisma as any).priceBookRow.findMany({
            where,
            orderBy,
            take: 10000
          })
        ])
      : await Promise.all([
          (this.prisma as any).priceBookRow.count({ where }),
          (this.prisma as any).priceBookRow.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize
          })
        ]);
    if (totalItems > 0) {
      const mappedRows: PriceBookRowSummary[] = rows.map(mapPriceBookRow);
      const [books, rules, agentSources] = await Promise.all([
        (this.prisma as any).priceBook.findMany({
          where: { id: { in: Array.from(new Set(mappedRows.map((row) => row.priceBookId))) } },
          select: { id: true, fileName: true, agentShortName: true }
        }),
        this.loadAgentMarkupRules(true),
        this.loadActivePriceBookAgentSources()
      ]);
      const bookById = new Map<string, { id: string; fileName: string; agentShortName?: string }>(books.map((book: any) => [book.id, { id: book.id, fileName: book.fileName, agentShortName: book.agentShortName ?? undefined }]));
      const rowBookIds = new Set(mappedRows.map((row) => row.priceBookId).filter(Boolean));
      const scopedAgentSources = agentSources.filter((source) => !rowBookIds.size || rowBookIds.has(source.priceBookId));
      const rowModules = Array.from(new Set(scopedAgentSources.map((source) => source.legacyModule).filter(Boolean))) as LegacyPricingModule[];
      const markupRules = buildSyncedAgentMarkupRules(rules.filter((rule) =>
        !rule.priceBookId
          ? (rowModules.length === 1 ? rule.legacyModule === rowModules[0] : true)
          : rowBookIds.has(rule.priceBookId)
      ), scopedAgentSources);
      const enrichedRows = mappedRows.map((row) => {
          const book = bookById.get(row.priceBookId);
          return enrichPriceBookRowMarkup({ ...row, agentName: cleanOldOriginalAgentNameForDisplay(book?.fileName, row.agentName) }, markupRules, book?.agentShortName || agentName || row.agentName);
        });
      if (needsMarkupPostFilter) {
        const filteredRows = applyPriceBookRowMarkupControls(enrichedRows, query);
        const response = {
          rows: redactPriceBookRows(filteredRows.slice((page - 1) * pageSize, page * pageSize), pricingVisibility),
          pagination: { page, pageSize, totalItems: filteredRows.length }
        };
        void this.lineage?.recordEvent('pricing.lookup.routes_view', {
          businessId: priceBookId ?? agentName ?? 'pricing-routes',
          actorUsername: principal.username,
          payload: { priceBookId, query, page, pageSize, fallback: false, markupPostFilter: true },
          sourceRefs: response.rows.map((row) => ({ nodeType: 'price_book_row', id: row.id })),
          metrics: { totalItems: response.pagination.totalItems, returnedRows: response.rows.length, fallback: 0 }
        });
        return response;
      }
      const response = {
        rows: redactPriceBookRows(enrichedRows, pricingVisibility),
        pagination: { page, pageSize, totalItems }
      };
      void this.lineage?.recordEvent('pricing.lookup.routes_view', {
        businessId: priceBookId ?? agentName ?? 'pricing-routes',
        actorUsername: principal.username,
        payload: { priceBookId, query, page, pageSize, fallback: false },
        sourceRefs: response.rows.map((row) => ({ nodeType: 'price_book_row', id: row.id })),
        metrics: { totalItems: response.pagination.totalItems, returnedRows: response.rows.length, fallback: 0 }
      });
      return response;
    }
    const response = await this.getLegacyFallbackPriceBookRows(priceBookId, query, page, pageSize);
    void this.lineage?.recordEvent('pricing.lookup.routes_view', {
      businessId: priceBookId ?? agentName ?? 'pricing-routes',
      actorUsername: principal.username,
      payload: { priceBookId, query, page, pageSize, fallback: true },
      sourceRefs: response.rows.map((row) => ({ nodeType: 'legacy_or_price_row', id: row.id })),
      metrics: { totalItems: response.pagination.totalItems, returnedRows: response.rows.length, fallback: 1 }
    });
    return redactPriceBookRowsResponse(response, pricingVisibility);
  }

  private async getLegacyFallbackPriceBookRows(priceBookId: string | undefined, query: PriceBookRowsQuery, page: number, pageSize: number): Promise<PriceBookRowsResponse> {
    const activeBooks = await (this.prisma as any).priceBook.findMany({
      where: { deletedAt: null, ...(priceBookId ? { id: priceBookId } : {}) },
      select: { id: true, fileName: true, agentShortName: true }
    });
    const agentName = query.agentName?.trim();
    const scopedBooks = !priceBookId && agentName
      ? activeBooks.filter((book: any) => textMatch(book.agentShortName ?? '', agentName))
      : activeBooks;
    const activeFiles = scopedBooks.map((book: any) => book.fileName);
    if (!activeFiles.length) return { rows: [], pagination: { page, pageSize, totalItems: 0 } };
    const legacySources = await (this.prisma as any).legacyPricingSource.findMany({
      where: {
        deletedAt: null,
        AND: [
          { fileName: { in: activeFiles } },
          ...(query.sourceSheetName?.trim() ? [{ fileName: { contains: query.sourceSheetName.trim(), mode: 'insensitive' } }] : [])
        ]
      },
      select: { id: true, fileName: true }
    });
    const legacySourceIds = legacySources.map((source: any) => source.id);
    if (!legacySourceIds.length) return { rows: [], pagination: { page, pageSize, totalItems: 0 } };
    const sourceById = new Map<string, any>(legacySources.map((source: any) => [source.id, source]));
    const legacyWhere = {
      sourceId: { in: legacySourceIds },
      ...(query.agentName?.trim() && priceBookId ? { agentName: { contains: query.agentName.trim(), mode: 'insensitive' } } : {}),
      ...(query.channelName?.trim() ? { channelName: { contains: query.channelName.trim(), mode: 'insensitive' } } : {}),
      ...(query.destinationCountry?.trim() ? { destinationCountry: { contains: query.destinationCountry.trim(), mode: 'insensitive' } } : {})
    };
    const needsMarkupPostFilter = hasPriceBookRowMarkupControls(query);
    const [totalItems, rows] = needsMarkupPostFilter
      ? await Promise.all([
          (this.prisma as any).legacyPricingRow.count({ where: legacyWhere }),
          (this.prisma as any).legacyPricingRow.findMany({
            where: legacyWhere,
            orderBy: [{ agentName: 'asc' }, { channelName: 'asc' }, { destinationCountry: 'asc' }, { minWeightKg: 'asc' }],
            take: 10000
          })
        ])
      : await Promise.all([
          (this.prisma as any).legacyPricingRow.count({ where: legacyWhere }),
          (this.prisma as any).legacyPricingRow.findMany({
            where: legacyWhere,
            orderBy: [{ agentName: 'asc' }, { channelName: 'asc' }, { destinationCountry: 'asc' }, { minWeightKg: 'asc' }],
            skip: (page - 1) * pageSize,
            take: pageSize
          })
        ]);
    const mappedRows: PriceBookRowSummary[] = rows.map((row: any) => {
      const legacyRow = mapLegacyPricingRow(row, sourceById.get(row.sourceId));
      return legacyRowToPriceBookRow(legacyRow, legacyRow.costPerKg ?? legacyRow.cbmPrice ?? 0, legacyRow.maxWeightKg ?? legacyRow.minWeightKg ?? 1);
    });
    const [rules, agentSources] = await Promise.all([
      this.loadAgentMarkupRules(true),
      this.loadActivePriceBookAgentSources()
    ]);
    const activeBookByFile = new Map<string, any>(scopedBooks.map((book: any) => [book.fileName, book]));
    const rowBookIds = new Set(mappedRows.map((row) => row.priceBookId).filter(Boolean));
    const scopedAgentSources = agentSources.filter((source) => !rowBookIds.size || rowBookIds.has(source.priceBookId));
    const rowModules = Array.from(new Set(scopedAgentSources.map((source) => source.legacyModule).filter(Boolean))) as LegacyPricingModule[];
    const markupRules = buildSyncedAgentMarkupRules(rules.filter((rule) =>
      !rule.priceBookId
        ? (rowModules.length === 1 ? rule.legacyModule === rowModules[0] : true)
        : rowBookIds.has(rule.priceBookId)
    ), scopedAgentSources);
    const enrichedRows = mappedRows.map((row) => {
        const source = sourceById.get(row.priceBookId);
        const book = activeBookByFile.get(source?.fileName);
        return enrichPriceBookRowMarkup({ ...row, agentName: cleanOldOriginalAgentNameForDisplay(book?.fileName, row.agentName) }, markupRules, book?.agentShortName || agentName || row.agentName);
      });
    if (needsMarkupPostFilter) {
      const filteredRows = applyPriceBookRowMarkupControls(enrichedRows, query);
      return {
        rows: filteredRows.slice((page - 1) * pageSize, page * pageSize),
        pagination: { page, pageSize, totalItems: filteredRows.length }
      };
    }
    return {
      rows: enrichedRows,
      pagination: { page, pageSize, totalItems }
    };
  }

  async getPricingSyncHealth(principal: Principal, query: { page?: number; pageSize?: number; legacyModule?: LegacyPricingModule | 'unclassified' } = {}): Promise<PricingSyncHealthResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表同步体检');
    const legacyModule = normalizeAgentMarkupModuleQuery(query.legacyModule);
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 50)));
    const [books, rules, agentSources] = await Promise.all([
      (this.prisma as any).priceBook.findMany({ where: { deletedAt: null }, select: { id: true, fileName: true, agentShortName: true } }),
      this.loadAgentMarkupRules(true),
      this.loadActivePriceBookAgentSources()
    ]);
    const activeBookIds = books.map((book: any) => book.id);
    const moduleSources = activeBookIds.length
      ? await (this.prisma as any).legacyPricingSource.findMany({
          where: { deletedAt: null, priceBookId: { in: activeBookIds } },
          select: { priceBookId: true, module: true, rowCount: true }
        })
      : [];
    const modulesByBookId = new Map<string, Set<LegacyPricingModule>>();
    moduleSources.forEach((source: any) => {
      const module = normalizeAgentMarkupLegacyModule(source.module);
      const priceBookId = String(source.priceBookId ?? '').trim();
      if (!module || !priceBookId) return;
      const modules = modulesByBookId.get(priceBookId) ?? new Set<LegacyPricingModule>();
      modules.add(module);
      modulesByBookId.set(priceBookId, modules);
    });
    const usaBookIds = books
      .filter((book: any) => modulesByBookId.get(book.id)?.has('usaAirSea'))
      .map((book: any) => book.id);
    const priceBookRuleRows = books.length
      ? await (this.prisma as any).priceBookRow.findMany({
          where: { priceBookId: { in: books.map((book: any) => book.id) } },
          select: { priceBookId: true, postalRule: true, warehouseCode: true, channelName: true, businessRouteName: true, realChannelName: true, minWeightKg: true, maxWeightKg: true }
        })
      : [];
    const usaPostalIssuesByBookId = new Map<string, string[]>();
    usaBookIds.forEach((bookId: string) => {
      usaPostalIssuesByBookId.set(bookId, getUsPostalRuleHealthIssues(
        priceBookRuleRows.filter((row: any) => row.priceBookId === bookId)
      ));
    });
    const issuesByBookId = new Map<string, string[]>();
    books.forEach((book: any) => {
      const modules = modulesByBookId.get(book.id) ?? new Set<LegacyPricingModule>();
      const issues: string[] = [];
      if (!modules.size) issues.push('价格表模块为空');
      if (modules.size > 1) issues.push('同一价格表混入多个模块');
      issues.push(...(usaPostalIssuesByBookId.get(book.id) ?? []));
      issues.push(...getWarehouseCodeRuleHealthIssues(priceBookRuleRows.filter((row: any) => row.priceBookId === book.id).map((row: any) => row.warehouseCode)));
      issuesByBookId.set(book.id, issues);
    });
    const scopedAgentSources = filterAgentMarkupSourcesByModule(agentSources, legacyModule);
    const scopedPriceBookIds = new Set(scopedAgentSources.map((source) => source.priceBookId).filter(Boolean));
    const bookById = new Map<string, { id: string; fileName: string; agentShortName?: string; legacyModule?: LegacyPricingModule }>(books.map((book: any) => {
      const source = agentSources.find((item) => item.priceBookId === book.id);
      return [book.id, { id: book.id, fileName: book.fileName, agentShortName: book.agentShortName ?? undefined, legacyModule: source?.legacyModule }];
    }));
    const bookIds = books.map((book: any) => book.id).filter((id: string) => !legacyModule || scopedPriceBookIds.has(id));
    const [sheetGroups, countryGroups] = bookIds.length
      ? await Promise.all([
          (this.prisma as any).priceBookRow.groupBy({ by: ['priceBookId', 'sourceSheetName'], where: { priceBookId: { in: bookIds } } }),
          (this.prisma as any).priceBookRow.groupBy({ by: ['priceBookId', 'destinationCountry'], where: { priceBookId: { in: bookIds } } })
        ])
      : [[], []];
    const sheetCounts = new Map<string, number>();
    sheetGroups.forEach((row: any) => {
      const book = bookById.get(row.priceBookId);
      const key = agentMarkupScopeKey({ priceBookId: row.priceBookId, agentName: book?.agentShortName ?? '', legacyModule: book?.legacyModule });
      sheetCounts.set(key, (sheetCounts.get(key) ?? 0) + (row.sourceSheetName ? 1 : 0));
    });
    const countryCounts = new Map<string, number>();
    countryGroups.forEach((row: any) => {
      const book = bookById.get(row.priceBookId);
      const key = agentMarkupScopeKey({ priceBookId: row.priceBookId, agentName: book?.agentShortName ?? '', legacyModule: book?.legacyModule });
      countryCounts.set(key, (countryCounts.get(key) ?? 0) + (row.destinationCountry ? 1 : 0));
    });
    const agentRuleByScope = new Map(rules.filter(isAgentLevelMarkupRuleForHealth).map((rule) => [agentMarkupScopeKey(rule), rule]));
    const scopedRules = filterAgentMarkupRulesByModule(rules, legacyModule, []);
    const allRows: PricingSyncHealthResponse['rows'] = scopedAgentSources.map((source) => {
      const book = bookById.get(source.priceBookId);
      const rule = agentRuleByScope.get(agentMarkupScopeKey(source));
      const status: PricingSyncHealthResponse['rows'][number]['status'] = !rule
        ? 'default'
        : !rule.enabled
          ? 'disabled'
          : rule.id.startsWith('price-agent:') || !rule.updatedAt
            ? 'default'
            : 'synced';
      const key = agentMarkupScopeKey(source);
      return {
        id: key,
        fileName: book?.fileName ?? source.fileName,
        agentName: source.agentName,
        legacyModule: source.legacyModule,
        lineCount: source.lineCount,
        sheetCount: sheetCounts.get(key) ?? 0,
        countryCount: countryCounts.get(key) ?? 0,
        markupRule: rule ?? createDefaultAgentMarkupRule(source.agentName, source.priceBookId, source.legacyModule),
        status,
        issues: Array.from(new Set([...(issuesByBookId.get(source.priceBookId) ?? []), ...(source.legacyModule ? [] : ['价格行模块为空'])]))
      };
    }).sort((left: PricingSyncHealthResponse['rows'][number], right: PricingSyncHealthResponse['rows'][number]) => left.fileName.localeCompare(right.fileName, 'zh-CN') || left.agentName.localeCompare(right.agentName, 'zh-CN'));
    const activeScopes = new Set(scopedAgentSources.map(agentMarkupScopeKey));
    const activeAgents = new Set(allRows.map((row) => row.agentName));
    const orphanRules = scopedRules.filter((rule) => isAgentLevelMarkupRuleForHealth(rule) && !activeScopes.has(agentMarkupScopeKey(rule)));
    const pageRows = allRows.slice((page - 1) * pageSize, page * pageSize);
    return {
      rows: pageRows,
      orphanRules,
      stats: {
        sources: new Set(allRows.map((row) => row.fileName)).size,
        agents: activeAgents.size,
        lines: allRows.reduce((sum, row) => sum + row.lineCount, 0),
        activeAgents: allRows.filter((row) => row.markupRule?.enabled).length,
        issueCount: allRows.reduce((sum, row) => sum + (row.issues?.length ?? 0), 0)
      },
      pagination: { page, pageSize, totalItems: allRows.length }
    };
  }

  async cleanupOldOriginalAgentData(principal: Principal, input: { dryRun?: boolean } = {}): Promise<PricingOldOriginalAgentCleanupResponse> {
    const dryRun = input.dryRun !== false;
    if (dryRun) {
      this.ensurePricingManager(principal, '只有管理员或市场可以预览旧原始代理清理');
    } else {
      this.ensureAdmin(principal, '只有管理员可以执行旧原始代理清理');
    }
    const [books, legacySources] = await Promise.all([
      (this.prisma as any).priceBook.findMany({ select: { id: true, fileName: true } }),
      (this.prisma as any).legacyPricingSource.findMany({ select: { id: true, fileName: true } })
    ]);
    const details: PricingOldOriginalAgentCleanupResponse['details'] = [];
    for (const book of books) {
      for (const oldAgentName of OLD_ORIGINAL_AGENT_NAMES) {
        const newAgentName = getOldOriginalAgentCleanupTarget(book.fileName, oldAgentName);
        if (!newAgentName) continue;
        const affectedRows = await (this.prisma as any).priceBookRow.count({ where: { priceBookId: book.id, agentName: oldAgentName } });
        if (!affectedRows) continue;
        details.push({
          sourceType: 'PRICE_BOOK_ROW',
          oldAgentName,
          newAgentName,
          fileName: book.fileName,
          priceBookId: book.id,
          affectedRows
        });
      }
    }
    for (const source of legacySources) {
      for (const oldAgentName of OLD_ORIGINAL_AGENT_NAMES) {
        const newAgentName = getOldOriginalAgentCleanupTarget(source.fileName, oldAgentName);
        if (!newAgentName) continue;
        const affectedRows = await (this.prisma as any).legacyPricingRow.count({ where: { sourceId: source.id, agentName: oldAgentName } });
        if (!affectedRows) continue;
        details.push({
          sourceType: 'LEGACY_PRICING_ROW',
          oldAgentName,
          newAgentName,
          fileName: source.fileName,
          legacySourceId: source.id,
          affectedRows
        });
      }
    }
    details.sort((left, right) => left.fileName.localeCompare(right.fileName, 'zh-CN') || left.sourceType.localeCompare(right.sourceType) || left.oldAgentName.localeCompare(right.oldAgentName, 'zh-CN'));
    const totalPriceBookRows = details.filter((detail) => detail.sourceType === 'PRICE_BOOK_ROW').reduce((sum, detail) => sum + detail.affectedRows, 0);
    const totalLegacyRows = details.filter((detail) => detail.sourceType === 'LEGACY_PRICING_ROW').reduce((sum, detail) => sum + detail.affectedRows, 0);
    const response: PricingOldOriginalAgentCleanupResponse = {
      dryRun,
      affectedRows: totalPriceBookRows + totalLegacyRows,
      totalPriceBookRows,
      totalLegacyRows,
      details,
      executedAt: new Date().toISOString()
    };
    if (!dryRun && response.affectedRows > 0) {
      await this.prisma.$transaction([
        ...details
          .filter((detail) => detail.sourceType === 'PRICE_BOOK_ROW' && detail.priceBookId)
          .map((detail) => (this.prisma as any).priceBookRow.updateMany({
            where: { priceBookId: detail.priceBookId, agentName: detail.oldAgentName },
            data: { agentName: detail.newAgentName }
          })),
        ...details
          .filter((detail) => detail.sourceType === 'LEGACY_PRICING_ROW' && detail.legacySourceId)
          .map((detail) => (this.prisma as any).legacyPricingRow.updateMany({
            where: { sourceId: detail.legacySourceId, agentName: detail.oldAgentName },
            data: { agentName: detail.newAgentName }
          })),
        this.prisma.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'pricing.price_book.original_agent.cleanup',
            target: 'pricing-old-original-agents',
            after: JSON.parse(JSON.stringify(response))
          }
        })
      ]);
    } else if (!dryRun) {
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'pricing.price_book.original_agent.cleanup',
          target: 'pricing-old-original-agents',
          after: JSON.parse(JSON.stringify(response))
        }
      });
    }
    return response;
  }

  async importPriceBook(principal: Principal, input: PriceBookImportInput, options: { returnRows?: boolean } = {}): Promise<PriceBookImportResult> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导入价格表');
    const targetModule = normalizePriceBookImportTargetModule(input.targetModule);
    const boundAgent = await this.resolveEnabledPriceBookAgent(input);
    if (!input.fileName?.trim()) {
      throw new BadRequestException('价格表名称不能为空');
    }
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      throw new BadRequestException('价格表没有可导入的报价行');
    }
    if (input.rows.length > PRICE_BOOK_JSON_IMPORT_ROW_LIMIT) {
      throw new BadRequestException(`价格表行数超过 ${PRICE_BOOK_JSON_IMPORT_ROW_LIMIT} 行，请使用文件导入任务上传`);
    }
    return this.persistPriceBookRows(principal, input.fileName, targetModule, boundAgent, input.rows, { returnRows: options.returnRows === true });
  }

  async createPriceBookImportJob(principal: Principal, input: { fileName: string; targetModule?: PriceBookImportTargetModule; agentId?: string; agentShortName?: string; buffer: Buffer; filePath?: string }): Promise<PriceBookImportJobResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以导入价格表');
    const targetModule = normalizePriceBookImportTargetModule(input.targetModule);
    // 迪拜模块只发布原表图片，不参与代理成本和加价，允许不绑定代理。
    const boundAgent = targetModule === 'dubaiAirSea' && !input.agentId?.trim() && !input.agentShortName?.trim()
      ? undefined
      : await this.resolveEnabledPriceBookAgent(input);
    if (!input.fileName?.trim()) throw new BadRequestException('价格表名称不能为空');
    const job = await (this.prisma as any).priceBookImportJob.create({
      data: {
        id: randomUUID(),
        fileName: input.fileName.trim(),
        filePath: input.filePath,
        targetModule,
        kind: 'IMPORT',
        parserRuleVersion: pricingParserRuleVersion(targetModule),
        agentId: boundAgent?.id,
        agentShortName: boundAgent?.shortName,
        status: 'PENDING',
        createdBy: principal.username
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.import_job.create',
        target: job.id,
        after: { fileName: job.fileName, filePath: job.filePath ?? undefined, targetModule, agentId: boundAgent?.id, agentShortName: boundAgent?.shortName }
      }
    });
    void this.lineage?.recordEvent('pricing.price_books.raw_file', {
      businessId: job.id,
      actorUsername: principal.username,
      rawPayload: { fileName: job.fileName, filePath: input.filePath, sizeBytes: input.buffer.length, targetModule, agentId: boundAgent?.id, agentShortName: boundAgent?.shortName },
      metrics: { sizeBytes: input.buffer.length }
    });
    setTimeout(() => {
      void this.processPriceBookImportJob(principal, job.id, targetModule, input.buffer).catch(() => undefined);
    }, 0);
    return { job: { ...mapPriceBookImportJob(job), targetModule, agentId: boundAgent?.id, agentShortName: boundAgent?.shortName } };
  }

  private async resolveEnabledPriceBookAgent(input: { agentId?: string; agentShortName?: string }): Promise<{ id: string; shortName: string }> {
    const agentId = input.agentId?.trim();
    const agentShortName = input.agentShortName?.trim();
    const where = agentId
      ? { id: agentId, enabled: true }
      : agentShortName
        ? { enabled: true, OR: [{ shortName: agentShortName }, { name: agentShortName }] }
        : null;
    if (!where) {
      throw new BadRequestException('请选择所属代理');
    }
    const agent = await (this.prisma as any).agent.findFirst({ where });
    if (!agent) {
      throw new BadRequestException('请选择所属代理');
    }
    return { id: agent.id, shortName: agent.shortName?.trim() || agent.name };
  }

  async getPriceBookImportJob(principal: Principal, id: string): Promise<PriceBookImportJobResponse> {
    this.ensurePricingManager(principal, '只有管理员或市场可以查看价格表导入任务');
    const job = await (this.prisma as any).priceBookImportJob.findFirst({ where: { id } });
    if (!job) throw new NotFoundException('价格表导入任务不存在');
    const book = job.priceBookId
      ? await (this.prisma as any).priceBook.findFirst({ where: { id: job.priceBookId } })
      : null;
    const legacySources = book
      ? await (this.prisma as any).legacyPricingSource.findMany({ where: { priceBookId: book.id, deletedAt: null } })
      : [];
    const legacyCounts = book
      ? Object.fromEntries(legacySources.map((source: any) => [source.module, source.rowCount])) as Partial<Record<LegacyPricingModule, number>>
      : undefined;
    return { job: mapPriceBookImportJob(job, book ? mapPriceBook(book, legacyCounts) : undefined) };
  }

  private async processPriceBookImportJob(principal: Principal, jobId: string, targetModule: PriceBookImportTargetModule, buffer: Buffer) {
    try {
      await (this.prisma as any).priceBookImportJob.update({ where: { id: jobId }, data: { status: 'PARSING', message: '正在解析价格表' } });
      const job = await (this.prisma as any).priceBookImportJob.findUnique({ where: { id: jobId } });
      const fileName = job?.fileName ?? '价格表.xlsx';
      if (targetModule === 'dubaiAirSea') {
        await this.processDubaiPriceBookImportJob(principal, jobId, job, buffer);
        return;
      }
      const parsedRows = await parsePriceWorkbookBuffer(buffer, fileName, targetModule, job?.agentShortName ?? undefined);
      const transportHealth = targetModule === 'europeExpress' ? summarizeEuropeTransportImportHealth(parsedRows) : undefined;
      const oversizeSheetHealth = targetModule === 'inquiry' ? inspectEuropeOversizeWorkbookSheets(buffer, parsedRows) : undefined;
      await (this.prisma as any).priceBookImportJob.update({ where: { id: jobId }, data: { status: 'IMPORTING', totalRows: parsedRows.length, message: `正在导入 ${parsedRows.length} 行` } });
      const boundAgent = { id: job?.agentId, shortName: job?.agentShortName };
      if (!boundAgent.id || !boundAgent.shortName) {
        throw new BadRequestException('请选择所属代理');
      }
      const result = await this.persistPriceBookRows(principal, fileName, targetModule, boundAgent, parsedRows, {
        returnRows: false,
        jobId,
        onProgress: async (processedRows) => {
          await (this.prisma as any).priceBookImportJob.update({ where: { id: jobId }, data: { processedRows, message: `已导入 ${processedRows} / ${parsedRows.length} 行` } });
        }
      });
      await (this.prisma as any).priceBookImportJob.update({
        where: { id: jobId },
        data: {
          status: 'SUCCESS',
          priceBookId: result.book.id,
          processedRows: result.rowCount,
          totalRows: result.rowCount,
          failedRows: 0,
          message: `导入完成：${result.rowCount} 行${transportHealth ? `；空运 ${transportHealth.counts.AIR}、海运 ${transportHealth.counts.SEA}、铁路 ${transportHealth.counts.RAIL}、铁海联运 ${transportHealth.counts.SEA_RAIL}、待归类 ${transportHealth.counts.UNCLASSIFIED}` : ''}${oversizeSheetHealth ? `；工作表：${oversizeSheetHealth.sheets.map((sheet) => `${sheet.sheetName} ${sheet.importedRows} 行`).join('、') || '未发现欧洲超大件价格工作表'}` : ''}`,
          errorSummary: transportHealth?.errorSummary ?? oversizeSheetHealth?.errorSummary ?? [],
          completedAt: new Date()
        }
      });
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'pricing.price_book.import_job.complete',
          target: jobId,
          after: { fileName, priceBookId: result.book.id, rowCount: result.rowCount, targetModule, agentId: boundAgent.id, agentShortName: boundAgent.shortName, legacyModuleCounts: result.legacyModuleCounts, transportHealth, oversizeSheetHealth }
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '价格表导入失败';
      await (this.prisma as any).priceBookImportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          message,
          failedRows: 1,
          completedAt: new Date()
        }
      }).catch(() => undefined);
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'pricing.price_book.import_job.failed',
          target: jobId,
          after: { message }
        }
      }).catch(() => undefined);
    }
  }

  /**
   * Refreshes exactly one retained workbook per turn. This intentionally keeps
   * CPU-heavy xls parsing out of requests and makes the worker globally serial
   * even when several API pods receive traffic at the same time.
   */
  private async runPriceBookRuleRefreshWorker() {
    if (this.priceBookRefreshWorkerRunning) return;
    this.priceBookRefreshWorkerRunning = true;
    try {
      await this.recoverStalledPriceBookRefreshJobs();
      await this.enqueueStalePriceBookRefreshJobs();
      const job = await (this.prisma as any).priceBookImportJob.findFirst({
        where: { kind: 'RULE_REFRESH', status: 'PENDING' },
        orderBy: { createdAt: 'asc' }
      });
      if (!job) return;
      const claimed = await (this.prisma as any).priceBookImportJob.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: { status: 'PARSING', message: '正在按最新规则重建原始价格表' }
      });
      if (!claimed.count) return;
      await this.processPriceBookRuleRefreshJob(job.id);
    } finally {
      this.priceBookRefreshWorkerRunning = false;
      // A short pause keeps a large historical backlog from monopolising the
      // event loop or database. One process advances one price book at a time.
      const pending = await (this.prisma as any).priceBookImportJob.count({ where: { kind: 'RULE_REFRESH', status: 'PENDING' } }).catch(() => 0);
      if (pending > 0) this.schedulePriceBookRuleRefresh(400);
    }
  }

  private async recoverStalledPriceBookRefreshJobs() {
    // A process can be restarted while parsing a workbook. Only reclaim jobs
    // that have been untouched for ten minutes, which is far beyond the
    // normal 30MB parsing window and avoids racing a healthy API instance.
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    await (this.prisma as any).priceBookImportJob.updateMany({
      where: { kind: 'RULE_REFRESH', status: { in: ['PARSING', 'IMPORTING'] }, updatedAt: { lt: cutoff } },
      data: { status: 'PENDING', message: '检测到中断的规则同步，等待恢复' }
    });
  }

  private async enqueueStalePriceBookRefreshJobs() {
    const books = await (this.prisma as any).priceBook.findMany({
      where: { deletedAt: null, targetModule: { not: null } },
      select: { id: true, fileName: true, targetModule: true, parserRuleVersion: true, refreshStatus: true }
    });
    for (const book of books) {
      const targetModule = String(book.targetModule ?? '') as PriceBookImportTargetModule;
      const targetVersion = pricingParserRuleVersion(targetModule);
      if (!Number.isFinite(targetVersion) || targetVersion <= 0) continue;
      // Dubai currently publishes rendered original sheets rather than a
      // structured quote row pool. Its own display-version retry pipeline
      // handles rendering; never run the generic row parser against it.
      if (targetModule === 'dubaiAirSea') {
        if (Number(book.parserRuleVersion ?? 0) < targetVersion || book.refreshStatus !== 'CURRENT') {
          await (this.prisma as any).priceBook.update({
            where: { id: book.id },
            data: { parserRuleVersion: targetVersion, refreshStatus: 'CURRENT', lastRuleRefreshAt: new Date() }
          });
        }
        continue;
      }
      if (Number(book.parserRuleVersion ?? 0) >= targetVersion) {
        if (book.refreshStatus !== 'CURRENT') {
          await (this.prisma as any).priceBook.update({ where: { id: book.id }, data: { refreshStatus: 'CURRENT' } });
        }
        continue;
      }
      const existing = await (this.prisma as any).priceBookImportJob.findFirst({
        where: {
          kind: 'RULE_REFRESH',
          priceBookId: book.id,
          parserRuleVersion: targetVersion,
          // A failed version stays visible for diagnosis and is not retried in
          // a tight loop. Bumping the module revision creates one new attempt.
          status: { in: ['PENDING', 'PARSING', 'IMPORTING', 'FAILED'] }
        },
        select: { id: true }
      });
      if (existing) continue;
      const original = await (this.prisma as any).priceBookImportJob.findFirst({
        where: {
          priceBookId: book.id,
          filePath: { not: null },
          kind: 'IMPORT'
        },
        orderBy: { createdAt: 'asc' },
        select: { filePath: true, agentId: true, agentShortName: true }
      });
      if (!original?.filePath) {
        await (this.prisma as any).priceBook.update({ where: { id: book.id }, data: { refreshStatus: 'UNAVAILABLE' } });
        continue;
      }
      try {
        await (this.prisma as any).priceBookImportJob.create({
          data: {
            id: randomUUID(),
            fileName: book.fileName,
            filePath: original.filePath,
            priceBookId: book.id,
            targetModule,
            kind: 'RULE_REFRESH',
            parserRuleVersion: targetVersion,
            dedupeKey: `rule-refresh:${book.id}:${targetVersion}`,
            agentId: original.agentId,
            agentShortName: original.agentShortName,
            status: 'PENDING',
            message: `等待同步第 ${targetVersion} 版匹配规则`,
            createdBy: 'system:pricing-rule-refresh'
          }
        });
        await (this.prisma as any).priceBook.update({ where: { id: book.id }, data: { refreshStatus: 'PENDING' } });
        await this.prisma.auditLog.create({
          data: {
            actorId: 'system',
            action: 'pricing.price_book.rule_refresh.queued',
            target: book.id,
            after: { targetModule, parserRuleVersion: targetVersion, reason: 'parser_rule_version_changed' }
          }
        });
      } catch (error) {
        // Multiple API instances can notice the same stale book. The unique
        // key lets the first instance own the work; the others simply move on.
        if ((error as { code?: string })?.code !== 'P2002') throw error;
      }
    }
  }

  private async processPriceBookRuleRefreshJob(jobId: string) {
    const job = await (this.prisma as any).priceBookImportJob.findUnique({ where: { id: jobId } });
    if (!job?.priceBookId || !job.filePath || !job.targetModule) return;
    const targetModule = String(job.targetModule) as PriceBookImportTargetModule;
    const targetVersion = pricingParserRuleVersion(targetModule);
    const systemPrincipal: Principal = { id: 'system', username: 'system:pricing-rule-refresh', role: 'ADMIN' };
    try {
      await (this.prisma as any).priceBook.update({ where: { id: job.priceBookId }, data: { refreshStatus: 'RUNNING' } });
      const buffer = await readFile(job.filePath);
      const parsedRows = await parsePriceWorkbookBuffer(buffer, job.fileName, targetModule, job.agentShortName ?? undefined);
      await (this.prisma as any).priceBookImportJob.update({ where: { id: jobId }, data: { status: 'IMPORTING', totalRows: parsedRows.length, message: `正在原子替换 ${parsedRows.length} 行价格规则` } });
      const result = await this.replacePriceBookRowsFromRuleRefresh(systemPrincipal, job.priceBookId, targetModule, targetVersion, parsedRows);
      await (this.prisma as any).priceBookImportJob.update({
        where: { id: jobId },
        data: { status: 'SUCCESS', processedRows: result.rowCount, totalRows: result.rowCount, failedRows: 0, message: `规则同步完成：${result.rowCount} 行`, completedAt: new Date() }
      });
      await this.prisma.auditLog.create({
        data: { actorId: systemPrincipal.id, action: 'pricing.price_book.rule_refresh.complete', target: job.priceBookId, after: { jobId, targetModule, parserRuleVersion: targetVersion, rowCount: result.rowCount } }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '价格表规则同步失败';
      await (this.prisma as any).priceBookImportJob.update({ where: { id: jobId }, data: { status: 'FAILED', failedRows: 1, message, completedAt: new Date() } }).catch(() => undefined);
      await (this.prisma as any).priceBook.update({ where: { id: job.priceBookId }, data: { refreshStatus: 'FAILED' } }).catch(() => undefined);
      await this.prisma.auditLog.create({ data: { actorId: systemPrincipal.id, action: 'pricing.price_book.rule_refresh.failed', target: job.priceBookId, after: { jobId, targetModule, parserRuleVersion: targetVersion, message } } }).catch(() => undefined);
    }
  }

  private async replacePriceBookRowsFromRuleRefresh(
    principal: Principal,
    priceBookId: string,
    targetModule: PriceBookImportTargetModule,
    parserRuleVersion: number,
    inputRows: PriceBookImportInput['rows']
  ): Promise<{ rowCount: number }> {
    const book = await (this.prisma as any).priceBook.findFirst({ where: { id: priceBookId, deletedAt: null } });
    if (!book) throw new NotFoundException('价格表不存在或已删除');
    const boundAgent = { id: book.agentId, shortName: book.agentShortName };
    if (!boundAgent.id || !boundAgent.shortName) throw new BadRequestException('价格表未绑定有效代理，无法自动同步');
    inputRows.forEach((row, index) => {
      const hasKgPrice = Number.isFinite(row.costPerKg) && Number(row.costPerKg) > 0;
      const hasCbmPrice = Number.isFinite(row.cbmPrice) && Number(row.cbmPrice) > 0;
      if (!row.channelName?.trim() || !row.destinationCountry?.trim() || !Number.isFinite(row.minWeightKg) || !Number.isFinite(row.maxWeightKg) || row.maxWeightKg <= row.minWeightKg || (!hasKgPrice && !hasCbmPrice)) {
        throw new BadRequestException(`第 ${index + 1} 行报价数据不完整`);
      }
    });
    const normalizedRows: PriceBookRowSummary[] = inputRows.map((rawRow) => {
      const row = normalizePricingImportRowForModule(rawRow, targetModule);
      return {
        ...row,
        id: randomUUID(),
        priceBookId,
        agentName: boundAgent.shortName,
        realChannelName: row.realChannelName?.trim() || row.channelName.trim(),
        transitLabel: sanitizePricingTransitLabel(row.transitLabel) ?? undefined
      };
    });
    const priceRows = normalizedRows.filter((row) => !isCbmPriceBookImportRow(row)).map((row) => ({
      id: row.id,
      priceBookId,
      agentName: boundAgent.shortName,
      carrierName: row.carrierName?.trim() || null,
      sourceSheetName: row.sourceSheetName?.trim() || null,
      channelName: row.channelName.trim(),
      businessRouteName: row.businessRouteName?.trim() || null,
      realChannelName: row.realChannelName?.trim() || row.channelName.trim(),
      warehouseCode: row.warehouseCode?.trim() || null,
      destinationCountry: row.destinationCountry.trim(),
      postalRule: row.postalRule?.trim() || null,
      minWeightKg: row.minWeightKg,
      maxWeightKg: row.maxWeightKg,
      costPerKg: Number.isFinite(row.costPerKg) && Number(row.costPerKg) > 0 ? row.costPerKg : Number(row.cbmPrice),
      currency: row.currency?.trim().toUpperCase() || 'RMB',
      transitDays: row.transitDays ?? null,
      transitLabel: row.transitLabel ?? null,
      quoteSourceType: row.quoteSourceType ?? 'local',
      surchargeFee: row.surchargeFee ?? null,
      surchargeDetails: row.surchargeDetails ?? [],
      productSurchargeRemark: row.productSurchargeRemark?.trim() || null,
      specialRemark: row.specialRemark?.trim() || null
    }));
    const legacyRowsByModule = groupLegacyRowsByModule(normalizedRows, book.fileName, targetModule);
    await this.prisma.$transaction(async (tx: any) => {
      let oldSources = await tx.legacyPricingSource.findMany({ where: { priceBookId, deletedAt: null }, select: { id: true } });
      // Early imports did not persist priceBookId on their legacy source. A
      // single active source with the same file name is unambiguous, so link
      // it as part of this transaction and let the normal atomic replacement
      // proceed. Multiple same-name sources remain deliberately blocked.
      if (!oldSources.length) {
        const unlinkedSources = await tx.legacyPricingSource.findMany({
          where: { fileName: book.fileName, deletedAt: null, priceBookId: null },
          select: { id: true }
        });
        if (unlinkedSources.length > 1) {
          throw new BadRequestException('历史报价副本未能唯一关联当前价格表，已保留旧版本，需管理员确认来源');
        }
        if (unlinkedSources.length === 1) {
          await tx.legacyPricingSource.update({
            where: { id: unlinkedSources[0].id },
            data: { priceBookId }
          });
          oldSources = unlinkedSources;
        }
      }
      if (oldSources.length) {
        const ids = oldSources.map((source: { id: string }) => source.id);
        await tx.legacyPricingRow.deleteMany({ where: { sourceId: { in: ids } } });
        await tx.legacyPricingSource.deleteMany({ where: { id: { in: ids } } });
      }
      await tx.priceBookRow.deleteMany({ where: { priceBookId } });
      if (priceRows.length) await tx.priceBookRow.createMany({ data: priceRows });
      for (const [module, moduleRows] of legacyRowsByModule.entries()) {
        const sourceId = randomUUID();
        await tx.legacyPricingSource.create({ data: { id: sourceId, priceBookId, module, fileName: book.fileName, rowCount: moduleRows.length, importedAt: new Date() } });
        const sourceRows = moduleRows.map((row) => ({ ...legacyPricingRowCreateData(module, row), sourceId }));
        if (sourceRows.length) await tx.legacyPricingRow.createMany({ data: sourceRows });
      }
      await tx.priceBook.update({ where: { id: priceBookId }, data: { parserRuleVersion, refreshStatus: 'CURRENT', lastRuleRefreshAt: new Date() } });
    // Parsing happens before this transaction. Keep the replacement atomic,
    // but allow a busy production database enough time to delete and rebuild
    // a retained workbook instead of leaving a valid refresh permanently
    // failed at Prisma's 20-second default.
    }, { maxWait: 15_000, timeout: 180_000 });
    void this.lineage?.recordPriceBookImport({
      principalUsername: principal.username,
      fileName: book.fileName,
      priceBookId,
      rows: normalizedRows.map((row) => ({ ...row })),
      result: { ruleRefresh: true, targetModule, parserRuleVersion, rowCount: inputRows.length },
      metrics: buildLineagePriceBookMetrics(priceRows)
    });
    return { rowCount: inputRows.length };
  }

  private async processDubaiPriceBookImportJob(principal: Principal, jobId: string, job: any, buffer: Buffer) {
    const fileName = job?.fileName ?? '迪拜价格表.xlsx';
    const priceBook = await (this.prisma as any).priceBook.create({
      data: {
        fileName,
        agentId: job?.agentId,
        agentShortName: job?.agentShortName,
        targetModule: 'dubaiAirSea',
        parserRuleVersion: pricingParserRuleVersion('dubaiAirSea'),
        refreshStatus: 'CURRENT',
        lastRuleRefreshAt: new Date()
      }
    });
    const version = await (this.prisma as any).dubaiPriceDisplayVersion.create({
      data: { priceBookId: priceBook.id, originalName: fileName, status: 'PROCESSING', createdBy: principal.username }
    });
    try {
      await (this.prisma as any).priceBookImportJob.update({
        where: { id: jobId }, data: { status: 'IMPORTING', priceBookId: priceBook.id, message: '正在将空运、海运工作表转换为图片' }
      });
      const rendered = await renderDubaiWorkbookSheets({ buffer, versionId: version.id, fileName });
      if (!rendered.pages.length) throw new BadRequestException('未识别到名称包含空运或海运的工作表');
      await (this.prisma as any).dubaiPriceDisplayPage.createMany({
        data: rendered.pages.map((page) => ({ ...page, id: randomUUID(), versionId: version.id, mimeType: 'image/png' }))
      });
      const message = rendered.unassignedSheets.length
        ? `转换完成：${rendered.pages.length} 页；待确认归属：${rendered.unassignedSheets.join('、')}；已自动更新当前展示`
        : `转换完成：${rendered.pages.length} 页，已自动更新当前展示`;
      await (this.prisma as any).dubaiPriceDisplayVersion.update({ where: { id: version.id }, data: { status: 'READY', salesSafe: true, message, unassignedSheets: rendered.unassignedSheets } });
      await this.activateDubaiDisplayModes(version, new Set(rendered.pages.map((page) => page.mode)), true, 'automatic');
      await (this.prisma as any).priceBookImportJob.update({
        where: { id: jobId },
        data: { status: 'SUCCESS', processedRows: rendered.pages.length, totalRows: rendered.pages.length, failedRows: 0, message, errorSummary: [], completedAt: new Date() }
      });
      await this.prisma.auditLog.create({
        data: { actorId: principal.id, action: 'pricing.dubai.display.convert', target: version.id, after: { priceBookId: priceBook.id, pageCount: rendered.pages.length, unassignedSheets: rendered.unassignedSheets } }
      });
      await this.prisma.auditLog.create({
        data: { actorId: principal.id, action: 'pricing.dubai.display.auto_activate', target: version.id, after: { priceBookId: priceBook.id, air: rendered.pages.some((page) => page.mode === 'AIR'), sea: rendered.pages.some((page) => page.mode === 'SEA') } }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '迪拜价格表图片转换失败';
      await (this.prisma as any).dubaiPriceDisplayVersion.update({ where: { id: version.id }, data: { status: 'FAILED', message } }).catch(() => undefined);
      throw error;
    }
  }

  private async persistPriceBookRows(
    principal: Principal,
    fileName: string,
    targetModule: PriceBookImportTargetModule,
    boundAgent: { id: string; shortName: string },
    inputRows: PriceBookImportInput['rows'],
    options: { returnRows?: boolean; jobId?: string; onProgress?: (processedRows: number) => Promise<void> } = {}
  ): Promise<PriceBookImportResult> {
    inputRows.forEach((row, index) => {
      const hasKgPrice = Number.isFinite(row.costPerKg) && Number(row.costPerKg) > 0;
      const hasCbmPrice = Number.isFinite(row.cbmPrice) && Number(row.cbmPrice) > 0;
      if (!row.agentName?.trim() || !row.channelName?.trim() || !row.destinationCountry?.trim() || !Number.isFinite(row.minWeightKg) || !Number.isFinite(row.maxWeightKg) || row.maxWeightKg <= row.minWeightKg || (!hasKgPrice && !hasCbmPrice)) {
        throw new BadRequestException(`第 ${index + 1} 行报价数据不完整`);
      }
    });

    // A same-named workbook may legitimately be imported into more than one
    // lookup module. Only a prior version in the exact agent + module pool is
    // eligible for replacement; fileName alone is never a replacement key.
    const replacedBooks = await (this.prisma as any).priceBook.findMany({
      where: {
        fileName: fileName.trim(),
        agentId: boundAgent.id,
        targetModule,
        deletedAt: null
      },
      select: { id: true }
    });
    const replacedPriceBookIds = replacedBooks.map((book: { id: string }) => book.id);

    const bookId = randomUUID();
    const parserRuleVersion = pricingParserRuleVersion(targetModule);
    const created = {
      id: bookId,
      fileName: fileName.trim(),
      agentId: boundAgent.id,
      agentShortName: boundAgent.shortName,
      importedAt: new Date(),
      deletedAt: null,
      remark: null,
      parserRuleVersion,
      refreshStatus: 'CURRENT' as const,
      lastRuleRefreshAt: new Date()
    };
    const normalizedRows: PriceBookRowSummary[] = inputRows.map((rawRow) => {
      const row = normalizePricingImportRowForModule(rawRow, targetModule);
      return {
      id: randomUUID(),
      priceBookId: bookId,
      agentName: boundAgent.shortName,
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
      minWeightKg: row.minWeightKg,
      maxWeightKg: row.maxWeightKg,
      costPerKg: Number.isFinite(row.costPerKg) && Number(row.costPerKg) > 0 ? row.costPerKg : Number(row.cbmPrice),
      cbmPrice: row.cbmPrice,
      priceTierLabel: row.priceTierLabel,
      densityDiscountRules: row.densityDiscountRules,
      currency: row.currency?.trim().toUpperCase() || 'RMB',
      transitDays: row.transitDays ?? undefined,
      transitLabel: sanitizePricingTransitLabel(row.transitLabel) ?? undefined,
      quoteSourceType: row.quoteSourceType ?? 'local',
      surchargeFee: row.surchargeFee ?? undefined,
      surchargeDetails: row.surchargeDetails ?? [],
      productSurchargeRemark: row.productSurchargeRemark?.trim() || undefined,
      specialRemark: row.specialRemark?.trim() || undefined,
      productCategory: row.productCategory?.trim() || undefined,
      region: row.region?.trim() || undefined,
      serviceContent: row.serviceContent?.trim() || undefined,
      inboundRequirement: row.inboundRequirement?.trim() || undefined,
      channelCode: row.channelCode?.trim() || undefined
      };
    });
    const rows = normalizedRows.filter((row) => !isCbmPriceBookImportRow(row)).map((row) => ({
      id: row.id,
      priceBookId: row.priceBookId,
      agentName: row.agentName,
      carrierName: row.carrierName ?? null,
      sourceSheetName: row.sourceSheetName ?? null,
      channelName: row.channelName,
      businessRouteName: row.businessRouteName ?? null,
      realChannelName: row.realChannelName ?? row.channelName,
      warehouseCode: row.warehouseCode ?? null,
      destinationCountry: row.destinationCountry,
      postalRule: row.postalRule ?? null,
      minWeightKg: row.minWeightKg,
      maxWeightKg: row.maxWeightKg,
      costPerKg: row.costPerKg,
      currency: row.currency,
      transitDays: row.transitDays ?? null,
      transitLabel: row.transitLabel ?? null,
      quoteSourceType: row.quoteSourceType ?? 'local',
      surchargeFee: row.surchargeFee ?? null,
      surchargeDetails: row.surchargeDetails ?? [],
      productSurchargeRemark: row.productSurchargeRemark ?? null,
      specialRemark: row.specialRemark ?? null
    }));

    await (this.prisma as any).priceBook.create({ data: {
      id: bookId,
      fileName: created.fileName,
      agentId: boundAgent.id,
      agentShortName: boundAgent.shortName,
      targetModule,
      parserRuleVersion,
      refreshStatus: 'CURRENT',
      lastRuleRefreshAt: created.lastRuleRefreshAt,
      importedAt: created.importedAt
    } });
    let processedRows = 0;
    for (let index = 0; index < rows.length; index += PRICE_BOOK_IMPORT_BATCH_SIZE) {
      await (this.prisma as any).priceBookRow.createMany({ data: rows.slice(index, index + PRICE_BOOK_IMPORT_BATCH_SIZE) });
      processedRows = Math.min(rows.length, index + PRICE_BOOK_IMPORT_BATCH_SIZE);
      if (options.onProgress) await options.onProgress(processedRows);
    }

    const legacyRowsByModule = groupLegacyRowsByModule(normalizedRows, fileName.trim(), targetModule);
    const legacySources = Array.from(legacyRowsByModule.entries()).map(([module, moduleRows]) => ({
      id: randomUUID(),
      module,
      fileName: fileName.trim(),
      rowCount: moduleRows.length,
      importedAt: created.importedAt,
      rows: moduleRows
    }));
    for (const source of legacySources) {
      const sourceRows = source.rows.map((row) => ({ ...legacyPricingRowCreateData(source.module, row), sourceId: source.id }));
      await (this.prisma as any).legacyPricingSource.create({
        data: {
          id: source.id,
          priceBookId: bookId,
          module: source.module,
          fileName: source.fileName,
          rowCount: source.rowCount,
          importedAt: source.importedAt
        }
      });
      for (let index = 0; index < sourceRows.length; index += PRICE_BOOK_IMPORT_BATCH_SIZE) {
        await (this.prisma as any).legacyPricingRow.createMany({ data: sourceRows.slice(index, index + PRICE_BOOK_IMPORT_BATCH_SIZE) });
      }
    }
    if (replacedPriceBookIds.length) {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.legacyPricingSource.updateMany({
          where: { priceBookId: { in: replacedPriceBookIds }, deletedAt: null },
          data: { deletedAt: created.importedAt }
        });
        await tx.priceBook.updateMany({
          where: { id: { in: replacedPriceBookIds }, deletedAt: null },
          data: { deletedAt: created.importedAt }
        });
      });
    }
    const createdBook = { ...created, rows };
    const legacyModuleCounts = Object.fromEntries(legacySources.map((source) => [source.module, source.rowCount])) as Partial<Record<LegacyPricingModule, number>>;
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.import',
        target: created.id,
        after: { fileName: created.fileName, rowCount: inputRows.length, persistedPriceRows: rows.length, targetModule, agentId: boundAgent.id, agentShortName: boundAgent.shortName, legacyModuleCounts, replacedPriceBookIds, jobId: options.jobId }
      }
    });
    const book = mapPriceBook(createdBook, legacyModuleCounts);
    void this.lineage?.recordPriceBookImport({
      principalUsername: principal.username,
      fileName: created.fileName,
      priceBookId: created.id,
      rows: normalizedRows.map((row) => ({ ...row })),
      result: { book, rowCount: inputRows.length, legacyModuleCounts, replacedPriceBookIds, jobId: options.jobId },
      metrics: buildLineagePriceBookMetrics(rows)
    });
    return { book, rowCount: inputRows.length, legacyModuleCounts, rows: options.returnRows ? rows.map(mapPriceBookRow) : [] };
  }

  async updatePriceBookRemark(principal: Principal, id: string, input: PriceBookRemarkUpdateInput): Promise<PriceBookSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以维护价格表备注');
    const current = await (this.prisma as any).priceBook.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      throw new NotFoundException('价格表不存在');
    }
    const updated = await (this.prisma as any).priceBook.update({
      where: { id },
      data: { remark: input.customRemark?.trim() || input.remark?.trim() || null },
      include: { rows: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.remark.update',
        target: id,
        before: { remark: current.remark },
        after: { remark: updated.remark }
      }
    });
    void this.lineage?.recordEvent('pricing.price_books.remark_update', {
      businessId: id,
      actorUsername: principal.username,
      payload: { before: { remark: current.remark }, after: { remark: updated.remark }, fileName: updated.fileName },
      sourceRefs: [{ nodeType: 'price_book', id }],
      metrics: { remarkLength: updated.remark?.length ?? 0 }
    });
    return mapPriceBook(updated);
  }

  async deletePriceBook(principal: Principal, id: string): Promise<PriceBookSummary> {
    this.ensurePricingManager(principal, '只有管理员或市场可以删除价格表');
    const current = await (this.prisma as any).priceBook.findFirst({ where: { id, deletedAt: null }, include: { rows: true } });
    if (!current) {
      throw new NotFoundException('价格表不存在');
    }
    const legacySources = await (this.prisma as any).legacyPricingSource.findMany({
      where: { priceBookId: current.id, deletedAt: null },
      select: { id: true }
    });
    const legacySourceIds = legacySources.map((source: any) => source.id);
    const deletedAt = new Date();
    const hardDeleteStats = await this.prisma.$transaction(async (tx: any) => {
      const priceRows = await tx.priceBookRow.deleteMany({ where: { priceBookId: current.id } });
      const legacyRows = legacySourceIds.length
        ? await tx.legacyPricingRow.deleteMany({ where: { sourceId: { in: legacySourceIds } } })
        : { count: 0 };
      const legacySourceRows = legacySourceIds.length
        ? await tx.legacyPricingSource.deleteMany({ where: { id: { in: legacySourceIds } } })
        : { count: 0 };
      const dubaiDisplayVersions = await tx.dubaiPriceDisplayVersion.deleteMany({ where: { priceBookId: current.id } });
      const markupRules = await tx.agentMarkupRule.deleteMany({ where: { priceBookId: current.id } });
      await tx.priceBook.delete({ where: { id: current.id } });
      return {
        priceRowsDeleted: priceRows.count,
        legacyRowsDeleted: legacyRows.count,
        legacySourcesDeleted: legacySourceRows.count,
        dubaiDisplayVersionsDeleted: dubaiDisplayVersions.count,
        markupRulesDeleted: markupRules.count
      };
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.delete',
        target: id,
        before: { fileName: current.fileName, rowCount: current.rows.length },
        after: { deletedAt, hardDelete: true, ...hardDeleteStats }
      }
    });
    void this.lineage?.recordEvent('pricing.price_books.delete', {
      businessId: id,
      actorUsername: principal.username,
      payload: { fileName: current.fileName, hardDelete: true, ...hardDeleteStats },
      sourceRefs: [{ nodeType: 'price_book', id }],
      metrics: hardDeleteStats
    });
    return mapPriceBook({ ...current, rows: [], deletedAt });
  }

  async getPricingRules(principal: Principal): Promise<PricingRuleSummary[]> {
    this.ensureStaffPricingAccess(principal);
    const rows = await (this.prisma as any).pricingRule.findMany({ include: { channel: true }, orderBy: [{ channelId: 'asc' }, { minWeightKg: 'asc' }] });
    return rows.map(mapPricingRule);
  }

  async createPricingRule(principal: Principal, input: PricingRuleCreateInput): Promise<PricingRuleSummary> {
    this.ensureStaffPricingAccess(principal);
    if (!input.channelId?.trim() || !input.destinationCountry?.trim() || input.minWeightKg < 0 || input.maxWeightKg <= input.minWeightKg || input.ratePerKg <= 0) {
      throw new BadRequestException('报价规则参数不完整');
    }
    const channel = await this.prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel || !channel.enabled) {
      throw new BadRequestException('渠道不存在或已停用');
    }
    const row = await (this.prisma as any).pricingRule.create({
      data: {
        id: `pr-${slug(channel.name)}-${Date.now()}`,
        channelId: channel.id,
        destinationCountry: input.destinationCountry.trim(),
        minWeightKg: input.minWeightKg,
        maxWeightKg: input.maxWeightKg,
        ratePerKg: input.ratePerKg,
        currency: input.currency.trim().toUpperCase() || 'RMB',
        enabled: true
      },
      include: { channel: true }
    });
    return mapPricingRule(row);
  }

  async updatePricingRuleEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<PricingRuleSummary> {
    this.ensureStaffPricingAccess(principal);
    const row = await (this.prisma as any).pricingRule.update({
      where: { id },
      data: { enabled: input.enabled === true },
      include: { channel: true }
    });
    return mapPricingRule(row);
  }

  async quotePricingRule(principal: Principal, input: PricingRuleQuoteRequest): Promise<PricingRuleQuoteResponse> {
    this.ensureStaffPricingAccess(principal);
    return this.quoteFromRules(input);
  }

  async getWarehouseTodayReceipts(principal: Principal, query: WarehouseTodayQuery): Promise<WarehouseTodayResponse> {
    if (!(await this.hasPermission(principal.role, 'warehouse:today-receipt:view'))) {
      throw new ForbiddenException('当前角色不能查看今日收货');
    }
    const salesScope = this.operatorCustomerScope(principal);
    const { start, end } = resolveWarehouseTodayRange(query);
    const where: any = {
      scanTime: { gte: start, lt: end }
    };
    if (query.site?.trim() && !salesScope) {
      where.site = query.site.trim();
    }
    if (query.customerOrderNo?.trim()) {
      where.customerOrderNo = { contains: query.customerOrderNo.trim(), mode: 'insensitive' };
    }
    if (query.domesticTrackingNo?.trim()) {
      where.domesticTrackingNo = { contains: query.domesticTrackingNo.trim(), mode: 'insensitive' };
    }
    if (query.combinedOrderNo?.trim()) {
      where.combinedOrderNo = { contains: query.combinedOrderNo.trim(), mode: 'insensitive' };
    }
    if (salesScope) {
      where.salesperson = { in: salesScope };
    }
    const rows = await (this.prisma as any).warehousePackage.findMany({
      where,
      orderBy: [{ scanTime: 'desc' }, { createdAt: 'desc' }]
    });
    const rowIds = rows.map((row: any) => row.id);
    const completedTallyTasks = rowIds.length
      ? await (this.prisma as any).warehouseTallyTask.findMany({
        where: {
          status: 'COMPLETED',
          OR: [
            { packageIds: { hasSome: rowIds } },
            { appliedPackageId: { in: rowIds } }
          ]
        },
        select: { id: true, taskNo: true, packageIds: true, appliedPackageId: true }
      })
      : [];
    const completedTaskByPackageId = new Map<string, { id: string; taskNo: string }>();
    completedTallyTasks.forEach((task: any) => {
      [...task.packageIds, task.appliedPackageId].filter(Boolean).forEach((packageId: string) => {
        completedTaskByPackageId.set(packageId, { id: task.id, taskNo: task.taskNo });
      });
    });
    const summaries: WarehousePackageSummary[] = rows.map((row: any) => {
      const task = completedTaskByPackageId.get(row.id);
      const summary = mapWarehousePackage(row);
      return task
        ? { ...summary, tallyTaskId: task.id, tallyTaskNo: task.taskNo, tallyCompleted: true, tallyStatus: '已理货' }
        : { ...summary, tallyTaskId: undefined, tallyTaskNo: undefined, tallyCompleted: false, tallyStatus: '待理货' };
    });
    const visibleRows = salesScope
      ? summaries.map(({ site: _site, ...row }) => row)
      : summaries;
    const grouped = new Map<string, WarehousePackageSummary[]>();
    summaries.forEach((row) => {
      const key = row.combinedOrderNo || `${row.customerOrderNo}-${row.domesticTrackingNo}`;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });
    const waitingDispatchTickets = await this.prisma.shipment.count({
      where: {
        status: 'WAITING_DISPATCH',
        ...(salesScope ? { customer: { salesperson: { in: salesScope } } } : {})
      }
    });
    const pendingTallyTickets = Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length;
    const exceptionTickets = Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length;
    const response = {
      totals: {
        receiptTickets: grouped.size,
        totalPackages: summaries.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: roundMoney(summaries.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0)),
        totalCbm: roundMoney(summaries.reduce((sum, row) => sum + row.cbm, 0)),
        waitingDispatchTickets,
        pendingTallyTickets,
        exceptionTickets
      },
      rows: visibleRows
    };
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.today_receipts.view',
        target: 'warehouse:today-receipts',
        after: toAuditJson({ query, rowCount: visibleRows.length })
      }
    });
    return response;
  }

  async getWarehouseInStock(principal: Principal, query: WarehouseInStockQuery): Promise<WarehouseInStockResponse> {
    if (!(await this.hasPermission(principal.role, 'warehouse:in-stock:view'))) {
      throw new ForbiddenException('当前角色不能查看在仓数据');
    }
    const salesScope = this.operatorCustomerScope(principal);
    const archivedOnly = query.status === 'TALLIED_ARCHIVED';
    const where: any = archivedOnly
      ? { status: 'TALLIED_ARCHIVED', archivedAt: { gte: resolveWarehouseTallyRecentCutoff() } }
      : { status: { notIn: ['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'] } };
    if (query.site?.trim() && !salesScope) {
      where.site = query.site.trim();
    }
    if (query.customerOrderNo?.trim()) {
      where.customerOrderNo = { contains: query.customerOrderNo.trim(), mode: 'insensitive' };
    }
    if (query.domesticTrackingNo?.trim()) {
      where.domesticTrackingNo = { contains: query.domesticTrackingNo.trim(), mode: 'insensitive' };
    }
    if (query.combinedOrderNo?.trim()) {
      where.combinedOrderNo = { contains: query.combinedOrderNo.trim(), mode: 'insensitive' };
    }
    if (salesScope) {
      where.salesperson = { in: salesScope };
    }
    if (query.operationKeyword?.trim()) {
      const keyword = query.operationKeyword.trim();
      const logs = await (this.prisma as any).auditLog.findMany({
        where: {
          action: { startsWith: 'warehouse.' }
        },
        select: { target: true, action: true, before: true, after: true },
        take: 500
      });
      const normalizedKeyword = keyword.toLowerCase();
      const ids = Array.from(new Set(logs
        .filter((row: any) => `${row.action} ${row.target} ${JSON.stringify(row.before ?? '')} ${JSON.stringify(row.after ?? '')}`.toLowerCase().includes(normalizedKeyword))
        .map((row: any) => row.target)
        .filter(Boolean)));
      where.id = ids.length ? { in: ids } : { in: ['__none__'] };
    }
    const rows = await (this.prisma as any).warehousePackage.findMany({
      where,
      orderBy: [{ scanTime: 'desc' }, { createdAt: 'desc' }]
    });
    const summaries = await mapWarehousePackagesWithConfirmedTally(this.prisma, rows);
    const visibleRows = salesScope
      ? summaries.map(({ site: _site, ...row }) => row)
      : summaries;
    const grouped = new Map<string, WarehousePackageSummary[]>();
    summaries.forEach((row) => {
      const key = row.combinedOrderNo || `${row.customerOrderNo}-${row.domesticTrackingNo}`;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });
    const waitingDispatchTickets = await this.prisma.shipment.count({
      where: {
        status: 'WAITING_DISPATCH',
        ...(salesScope ? { customer: { salesperson: { in: salesScope } } } : {})
      }
    });
    const response = {
      totals: {
        receiptTickets: grouped.size,
        totalPackages: summaries.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: roundMoney(summaries.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0)),
        totalCbm: roundMoney(summaries.reduce((sum, row) => sum + row.cbm, 0)),
        waitingDispatchTickets,
        pendingTallyTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length,
        exceptionTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length
      },
      rows: visibleRows
    };
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.in_stock.view',
        target: 'warehouse:in-stock',
        after: toAuditJson({ query, rowCount: visibleRows.length })
      }
    });
    return response;
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
    const customer = await this.prisma.customer.findFirst({ where: { code: normalizedCode }, select: { enabled: true } });
    if (customer && !customer.enabled) {
      throw new BadRequestException('客户已停用，不能收货');
    }
  }

  async createWarehousePackage(principal: Principal, input: WarehousePackageCreateInput): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const data = buildWarehousePackageData(input);
    const owner = await this.resolveWarehousePackageOwner(data.customerCode);
    const created = await (this.prisma as any).warehousePackage.create({
      data: {
        ...data,
        customerName: owner.customerName,
        salesperson: owner.salesperson,
        site: owner.site,
        createdBy: principal.username
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'warehouse.package.create', target: created.id, after: toAuditJson(mapWarehousePackage(created)) }
    });
    const summary = mapWarehousePackage(created);
    void this.lineage?.recordEvent('warehouse.today.receive', {
      actorUsername: principal.username,
      businessId: created.id,
      payload: { package: summary, input, source: 'manual_scan' },
      metrics: {
        packageCount: summary.packageCount,
        weightKg: summary.weightKg,
        volumeCbm: summary.cbm,
        chargeableWeightKg: summary.chargeableWeightKg
      }
    });
    return summary;
  }

  async createWarehouseManualReceipt(principal: Principal, input: WarehouseManualReceiptCreateInput): Promise<WarehouseManualReceiptCreateResponse> {
    this.ensureWarehouseAccess(principal);
    const packageInputs = buildWarehouseManualReceiptPackageInputs(input);
    const packageData = packageInputs.map(buildWarehousePackageData).map((data) => ({ ...data, exceptions: [] }));
    const firstPackageData = packageData[0]!;
    const duplicate = await (this.prisma as any).warehousePackage.findFirst({
      where: {
        combinedOrderNo: firstPackageData.combinedOrderNo,
        status: { not: 'TALLIED_ARCHIVED' }
      },
      select: { domesticTrackingNo: true }
    });
    if (duplicate) {
      throw new BadRequestException(`快递单号 ${duplicate.domesticTrackingNo} 已入仓，请勿重复添加`);
    }
    const owner = await this.resolveWarehousePackageOwner(firstPackageData.customerCode);
    const created = await (this.prisma as any).$transaction(async (tx: any) => {
      const rows = [];
      for (const data of packageData) {
        rows.push(await tx.warehousePackage.create({
          data: {
            ...data,
            customerName: owner.customerName,
            salesperson: owner.salesperson,
            site: owner.site,
            createdBy: principal.username
          }
        }));
      }
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'warehouse.package.manual_batch_create',
          target: firstPackageData.combinedOrderNo,
          after: toAuditJson({
            combinedOrderNo: firstPackageData.combinedOrderNo,
            cartonSpecCount: rows.length,
            totalPackageCount: rows.reduce((sum: number, row: any) => sum + Number(row.packageCount ?? 0), 0),
            packageIds: rows.map((row: any) => row.id)
          })
        }
      });
      for (const row of rows) {
        await tx.auditLog.create({
          data: { actorId: principal.id, action: 'warehouse.package.create', target: row.id, after: toAuditJson(mapWarehousePackage(row)) }
        });
      }
      return rows;
    });
    const summaries: WarehousePackageSummary[] = created.map(mapWarehousePackage);
    summaries.forEach((summary: WarehousePackageSummary, index: number) => {
      void this.lineage?.recordEvent('warehouse.today.receive', {
        actorUsername: principal.username,
        businessId: summary.id,
        payload: { package: summary, input: packageInputs[index], source: 'manual_multi_carton_receipt' },
        metrics: {
          packageCount: summary.packageCount,
          weightKg: summary.weightKg,
          volumeCbm: summary.cbm,
          chargeableWeightKg: summary.chargeableWeightKg
        }
      });
    });
    return {
      packages: summaries,
      totalCartonSpecs: summaries.length,
      totalPackages: summaries.reduce((sum: number, pkg: WarehousePackageSummary) => sum + pkg.packageCount, 0)
    };
  }

  async splitWarehousePackage(principal: Principal, id: string, input: WarehousePackageSplitInput): Promise<WarehousePackageSplitResponse> {
    this.ensureWarehouseAccess(principal);
    const source = await (this.prisma as any).warehousePackage.findUnique({ where: { id } });
    if (!source) {
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
    const pieceTotal = splitPieces.reduce((sum, piece) => sum + piece, 0);
    if (pieces.length && pieceTotal !== Number(source.packageCount)) {
      throw new BadRequestException('拆分件数合计必须等于原包裹件数');
    }
    const updatedSource = await (this.prisma as any).warehousePackage.update({
      where: { id },
      data: { status: 'CONSOLIDATED' }
    });
    const sourceSummary = mapWarehousePackage(updatedSource);
    const rootCombinedOrderNo = source.sourcePackageNo || source.combinedOrderNo;
    const existingSplitRows = await (this.prisma as any).warehousePackage.findMany({
      where: {
        OR: [
          { sourcePackageNo: rootCombinedOrderNo },
          { combinedOrderNo: { startsWith: `${rootCombinedOrderNo}-` } }
        ]
      },
      select: { combinedOrderNo: true }
    });
    let nextSplitNo = nextWarehouseSplitSequence(rootCombinedOrderNo, existingSplitRows.map((row: any) => row.combinedOrderNo));
    const childData = splitPieces.map((pieceCount, index) => {
      const ratio = pieceCount / pieceTotal;
      const splitNo = nextSplitNo++;
      return {
        customerCode: source.customerCode,
        customerName: source.customerName,
        site: source.site,
        salesperson: source.salesperson,
        customerOrderNo: source.customerOrderNo,
        domesticTrackingNo: source.domesticTrackingNo,
        combinedOrderNo: `${rootCombinedOrderNo}-${splitNo}`,
        labelNo: createWarehouseInboundLabelNo(source.customerCode, source.domesticTrackingNo, splitNo, splitCount),
        sourcePackageId: source.id,
        sourcePackageNo: rootCombinedOrderNo,
        systemOrderNo: source.systemOrderNo,
        shipmentId: source.shipmentId,
        receivingChannel: '理货拆分',
        destinationCountry: source.destinationCountry,
        expectedTotalPackageCount: splitCount,
        packageIndex: index + 1,
        packageCount: pieces.length ? pieceCount : 1,
        weightKg: roundMoney(Number(source.weightKg) * ratio),
        lengthCm: source.lengthCm,
        widthCm: source.widthCm,
        heightCm: source.heightCm,
        cbm: roundMoney(Number(source.cbm) * ratio),
        volumetricWeightKg: roundMoney(Number(source.volumetricWeightKg) * ratio),
        chargeableWeightKg: roundMoney(Number(source.chargeableWeightKg) * ratio),
        divisor: 6000,
        roundingRule: 'NONE',
        scanTime: source.scanTime,
        remark: input.remark?.trim() || source.remark,
        createdBy: principal.username,
        status: 'RECEIVED',
        exceptions: []
      };
    });
    await (this.prisma as any).warehousePackage.createMany({ data: childData });
    const created = await (this.prisma as any).warehousePackage.findMany({
      where: { sourcePackageId: source.id },
      orderBy: { packageIndex: 'asc' }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.package.split',
        target: id,
        before: toAuditJson(mapWarehousePackage(source)),
        after: toAuditJson({
          sourcePackageId: source.id,
          sourcePackageNo: source.combinedOrderNo,
          splitCount,
          pieces: pieces.length ? pieces : undefined,
          before: warehousePackageSplitTotals([mapWarehousePackage(source)]),
          after: warehousePackageSplitTotals(created.map(mapWarehousePackage)),
          children: created.map((pkg: any) => {
            const summary = mapWarehousePackage(pkg);
            return {
              id: summary.id,
              combinedOrderNo: summary.combinedOrderNo,
              sourcePackageId: summary.sourcePackageId,
              packageCount: summary.packageCount,
              weightKg: summary.weightKg,
              cbm: summary.cbm,
              volumetricWeightKg: summary.volumetricWeightKg,
              volumetricWeightKg5000: summary.volumetricWeightKg5000
            };
          }),
          packageIds: created.map((pkg: any) => pkg.id)
        })
      }
    });
    const createdSummaries: WarehousePackageSummary[] = created.map(mapWarehousePackage);
    void this.lineage?.recordEvent('warehouse.packages.split', {
      actorUsername: principal.username,
      businessId: id,
      payload: {
        sourcePackageId: source.id,
        sourcePackageNo: source.combinedOrderNo,
        splitCount,
        pieces: pieces.length ? pieces : undefined,
        packageIds: createdSummaries.map((pkg) => pkg.id),
        children: createdSummaries.map((pkg) => ({
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
        sourcePackageCount: Number(source.packageCount),
        childPackageCount: createdSummaries.reduce((sum, pkg) => sum + pkg.packageCount, 0),
        childWeightKg: roundMoney(createdSummaries.reduce((sum, pkg) => sum + pkg.weightKg * pkg.packageCount, 0)),
        childVolumeCbm: roundMoney(createdSummaries.reduce((sum, pkg) => sum + pkg.cbm, 0))
      }
    });
    return {
      sourcePackage: sourceSummary,
      packages: createdSummaries
    };
  }

  async updateWarehousePackageRemark(principal: Principal, id: string, input: { remark?: string }): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehousePackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('仓库包裹不存在');
    }
    const remark = input.remark?.trim() || null;
    const updated = await (this.prisma as any).warehousePackage.update({
      where: { id },
      data: { remark }
    });
    await (this.prisma as any).auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.package.remark.update',
        target: id,
        before: { remark: existing.remark ?? null },
        after: { remark }
      }
    });
    void this.lineage?.recordEvent('warehouse.packages.update', {
      actorUsername: principal.username,
      businessId: id,
      payload: { action: 'remark_update', packageId: id, before: { remark: existing.remark ?? null }, after: { remark } },
      sourceRefs: [{ nodeType: 'warehouse_package', id }],
      metrics: { changedFields: (existing.remark ?? null) === remark ? 0 : 1 }
    });
    return mapWarehousePackage(updated);
  }

  async updateWarehousePackage(principal: Principal, id: string, input: WarehousePackageUpdateInput): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehousePackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('仓库包裹不存在');
    }
    if (!canUpdateUnenteredWarehousePackage(existing.status as WarehousePackageStatus, existing.shipmentId)) {
      if (existing.shipmentId) {
        throw new BadRequestException('包裹已绑定正式运单，不能直接修改');
      }
      throw new BadRequestException('已合票、已出库或已归档的包裹不能直接修改');
    }
    const parsedCombined = parseWarehouseCombinedOrderNo(input.combinedOrderNo);
    const customerCode = (input.customerCode?.trim() || input.customerOrderNo?.trim() || parsedCombined.customerOrderNo || existing.customerCode).trim();
    const customerOrderNo = (input.customerOrderNo?.trim() || input.customerCode?.trim() || parsedCombined.customerOrderNo || existing.customerOrderNo).trim();
    const domesticTrackingNo = (input.domesticTrackingNo?.trim() || parsedCombined.domesticTrackingNo || existing.domesticTrackingNo).trim();
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
      ? existing.expectedTotalPackageCount
      : Math.max(1, Math.floor(Number(input.expectedTotalPackageCount) || 1));
    const packageIndex = input.packageIndex === undefined
      ? existing.packageIndex
      : Math.min(expectedTotalPackageCount ?? Math.max(1, Math.floor(Number(input.packageIndex) || 1)), Math.max(1, Math.floor(Number(input.packageIndex) || 1)));
    const identityChanged = customerOrderNo !== existing.customerOrderNo
      || domesticTrackingNo !== existing.domesticTrackingNo
      || (packageIndex ?? 1) !== (existing.packageIndex ?? 1);
    if (identityChanged) {
      const duplicateRows = await (this.prisma as any).warehousePackage.findMany({
        where: {
          id: { not: id },
          customerOrderNo,
          domesticTrackingNo
        },
        select: { id: true, packageIndex: true }
      });
      const duplicate = duplicateRows.find((row: any) => (row.packageIndex ?? 1) === (packageIndex ?? 1));
      if (duplicate) {
        throw new BadRequestException(`客户编号 ${customerOrderNo} 与快递单号 ${domesticTrackingNo} 的第 ${packageIndex ?? 1} 件已存在`);
      }
    }
    const packageCount = input.packageCount === undefined ? Number(existing.packageCount) : Math.max(1, Math.floor(Number(input.packageCount) || 1));
    const weightKg = input.weightKg === undefined ? Number(existing.weightKg) : roundMoney(Number(input.weightKg) || 0);
    const lengthCm = input.lengthCm === undefined ? Number(existing.lengthCm) : roundMoney(Number(input.lengthCm) || 0);
    const widthCm = input.widthCm === undefined ? Number(existing.widthCm) : roundMoney(Number(input.widthCm) || 0);
    const heightCm = input.heightCm === undefined ? Number(existing.heightCm) : roundMoney(Number(input.heightCm) || 0);
    const cbm = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 1000000);
    const volumetricWeightKg = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 6000);
    const scanTime = input.scanTime !== undefined
      ? input.scanTime
        ? new Date(input.scanTime)
        : null
      : undefined;
    if (scanTime instanceof Date && Number.isNaN(scanTime.getTime())) {
      throw new BadRequestException('扫描时间无法识别');
    }
    const owner = await this.resolveWarehousePackageOwner(customerCode);
    const updated = await (this.prisma as any).warehousePackage.update({
      where: { id },
      data: {
        customerCode,
        customerOrderNo,
        domesticTrackingNo,
        combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
        labelNo: existing.tallyTaskId
          ? existing.labelNo
          : createWarehouseInboundLabelNo(customerCode, domesticTrackingNo, packageIndex ?? 1, expectedTotalPackageCount ?? packageCount),
        customerName: owner.customerName,
        salesperson: owner.salesperson,
        site: owner.site,
        expectedTotalPackageCount,
        packageIndex,
        packageCount,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        cbm,
        volumetricWeightKg,
        chargeableWeightKg: roundMoney(Math.max(weightKg, volumetricWeightKg)),
        ...(input.scanTime !== undefined ? { scanTime } : {}),
        ...(input.remark !== undefined ? { remark: input.remark.trim() || null } : {}),
        ...(input.manualException !== undefined ? { manualException: input.manualException.trim() || null } : {})
      }
    });
    await (this.prisma as any).auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.package.update',
        target: id,
        before: toAuditJson({
          customerCode: existing.customerCode,
          customerOrderNo: existing.customerOrderNo,
          domesticTrackingNo: existing.domesticTrackingNo,
          combinedOrderNo: existing.combinedOrderNo,
          labelNo: existing.labelNo ?? null,
          expectedTotalPackageCount: existing.expectedTotalPackageCount ?? null,
          packageIndex: existing.packageIndex ?? null,
          packageCount: Number(existing.packageCount),
          weightKg: Number(existing.weightKg),
          lengthCm: Number(existing.lengthCm),
          widthCm: Number(existing.widthCm),
          heightCm: Number(existing.heightCm),
          scanTime: existing.scanTime?.toISOString?.() ?? existing.scanTime,
          remark: existing.remark ?? null,
          manualException: existing.manualException ?? null
        }),
        after: toAuditJson({
          customerCode: updated.customerCode,
          customerOrderNo: updated.customerOrderNo,
          domesticTrackingNo: updated.domesticTrackingNo,
          combinedOrderNo: updated.combinedOrderNo,
          labelNo: updated.labelNo ?? null,
          expectedTotalPackageCount: updated.expectedTotalPackageCount ?? null,
          packageIndex: updated.packageIndex ?? null,
          packageCount,
          weightKg,
          lengthCm,
          widthCm,
          heightCm,
          scanTime: updated.scanTime?.toISOString?.() ?? updated.scanTime,
          remark: updated.remark ?? null,
          manualException: updated.manualException ?? null
        })
      }
    });
    const updatedSummary = mapWarehousePackage(updated);
    void this.lineage?.recordEvent('warehouse.packages.update', {
      actorUsername: principal.username,
      businessId: id,
      payload: {
        action: 'package_update',
        packageId: id,
        before: {
          customerCode: existing.customerCode,
          customerOrderNo: existing.customerOrderNo,
          domesticTrackingNo: existing.domesticTrackingNo,
          combinedOrderNo: existing.combinedOrderNo,
          packageCount: Number(existing.packageCount),
          weightKg: Number(existing.weightKg),
          lengthCm: Number(existing.lengthCm),
          widthCm: Number(existing.widthCm),
          heightCm: Number(existing.heightCm),
          scanTime: existing.scanTime?.toISOString?.() ?? existing.scanTime,
          remark: existing.remark ?? null,
          manualException: existing.manualException ?? null
        },
        after: {
          customerCode: updated.customerCode,
          customerOrderNo: updated.customerOrderNo,
          domesticTrackingNo: updated.domesticTrackingNo,
          combinedOrderNo: updated.combinedOrderNo,
          packageCount,
          weightKg,
          lengthCm,
          widthCm,
          heightCm,
          scanTime: updated.scanTime?.toISOString?.() ?? updated.scanTime,
          remark: updated.remark ?? null,
          manualException: updated.manualException ?? null
        }
      },
      sourceRefs: [{ nodeType: 'warehouse_package', id }],
      metrics: {
        packageCount: updatedSummary.packageCount,
        weightKg: updatedSummary.weightKg,
        volumeCbm: updatedSummary.cbm,
        chargeableWeightKg: updatedSummary.chargeableWeightKg,
        identityChanged: identityChanged ? 1 : 0
      }
    });
    const hasMeasurementChange = input.weightKg !== undefined || input.lengthCm !== undefined || input.widthCm !== undefined || input.heightCm !== undefined;
    if (existing.measurementStatus === 'PENDING_REMEASURE' && existing.labelNo && hasMeasurementChange && weightKg > 0 && lengthCm > 0 && widthCm > 0 && heightCm > 0) {
      const applied = await this.applyWarehouseTallyMeasurementByBarcode(principal, {
        barcode: existing.labelNo,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        measuredAt: input.scanTime ?? undefined,
        deviceNo: '人工录入'
      });
      if (applied) return applied.package;
    }
    return updatedSummary;
  }

  async updateWarehousePackageException(principal: Principal, id: string, input: { manualException?: string }): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehousePackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('仓库包裹不存在');
    }
    const manualException = input.manualException?.trim() || null;
    const updated = await (this.prisma as any).warehousePackage.update({
      where: { id },
      data: { manualException }
    });
    await (this.prisma as any).auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.package.exception.update',
        target: id,
        before: { manualException: existing.manualException ?? null },
        after: { manualException }
      }
    });
    void this.lineage?.recordEvent('warehouse.packages.update', {
      actorUsername: principal.username,
      businessId: id,
      payload: { action: 'exception_update', packageId: id, before: { manualException: existing.manualException ?? null }, after: { manualException } },
      sourceRefs: [{ nodeType: 'warehouse_package', id }],
      metrics: { changedFields: (existing.manualException ?? null) === manualException ? 0 : 1 }
    });
    return mapWarehousePackage(updated);
  }

  async createWarehouseConsolidation(principal: Principal, input: WarehouseConsolidationCreateInput): Promise<WarehouseConsolidationSummary> {
    this.ensureWarehouseAccess(principal);
    if (!Array.isArray(input.packageIds) || input.packageIds.length === 0) {
      throw new BadRequestException('请先选择要合并的包裹');
    }
    const packages = await (this.prisma as any).warehousePackage.findMany({ where: { id: { in: input.packageIds }, status: { not: 'CONSOLIDATED' } } });
    if (packages.length !== input.packageIds.length) {
      throw new BadRequestException('部分包裹不存在或已合并');
    }
    const summaries: WarehousePackageSummary[] = packages.map(mapWarehousePackage);
    if (summaries.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      throw new BadRequestException('理货后包裹待重新过机，完成测量后才能合票或出货');
    }
    if (new Set(summaries.map((pkg) => pkg.customerCode)).size !== 1) {
      throw new BadRequestException('一次理货任务只能选择同一客户的包裹');
    }
    const consolidationNo = await this.nextWarehouseConsolidationNo(summaries, input.mode);
    const created = await (this.prisma as any).warehouseConsolidation.create({
      data: {
        consolidationNo,
        mode: input.mode,
        totalPackages: summaries.reduce((total, pkg) => total + pkg.packageCount, 0),
        totalActualWeightKg: summaries.reduce((total, pkg) => total + warehousePackageActualWeightTotal(pkg), 0),
        totalVolumetricWeightKg: summaries.reduce((total, pkg) => total + pkg.volumetricWeightKg, 0),
        totalChargeableWeightKg: summaries.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0),
        items: { create: summaries.map((pkg) => ({ packageId: pkg.id })) }
      },
      include: { items: true }
    });
    await (this.prisma as any).warehousePackage.updateMany({ where: { id: { in: input.packageIds } }, data: { status: 'CONSOLIDATED' } });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.consolidation.create',
        target: created.id,
        after: {
          consolidationNo,
          mode: input.mode,
          customerCode: summaries[0]?.customerCode,
          packageIds: input.packageIds,
          sourcePackages: summaries.map((pkg) => ({
            id: pkg.id,
            combinedOrderNo: pkg.combinedOrderNo,
            sourcePackageId: pkg.sourcePackageId,
            packageCount: pkg.packageCount,
            weightKg: pkg.weightKg,
            cbm: pkg.cbm
          })),
          totalPackages: summaries.reduce((total, pkg) => total + pkg.packageCount, 0),
          totalActualWeightKg: roundMoney(summaries.reduce((total, pkg) => total + warehousePackageActualWeightTotal(pkg), 0)),
          totalVolumetricWeightKg: roundMoney(summaries.reduce((total, pkg) => total + pkg.volumetricWeightKg, 0)),
          totalChargeableWeightKg: roundMoney(summaries.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0)),
          tallyRequirement: input.tallyRequirement?.trim() || undefined
        }
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.tally.start',
        target: created.id,
        after: toAuditJson({
          consolidationNo,
          mode: input.mode,
          packageIds: input.packageIds,
          tallyRequirement: input.tallyRequirement?.trim() || undefined
        })
      }
    });
    if (input.mode === 'MERGE_AND_SHIP') {
      return this.createShipmentFromWarehouseConsolidation(principal, created.id);
    }
    return mapWarehouseConsolidation(created, input.packageIds);
  }

  async createShipmentFromWarehouseConsolidation(principal: Principal, id: string): Promise<WarehouseConsolidationSummary> {
    this.ensureWarehouseAccess(principal);
    const consolidation = await (this.prisma as any).warehouseConsolidation.findUnique({
      where: { id },
      include: { items: { include: { package: true } } }
    });
    if (!consolidation) {
      throw new NotFoundException('合并批次不存在');
    }
    if (consolidation.shipmentId) {
      return mapWarehouseConsolidation(consolidation, consolidation.items.map((item: any) => item.packageId));
    }
    const packages = consolidation.items.map((item: any) => mapWarehousePackage(item.package));
    const first = packages[0];
    const customer = await this.prisma.customer.findFirst({ where: { code: first.customerCode } }) ?? await this.prisma.customer.findFirst({ orderBy: { code: 'asc' } });
    if (!customer) {
      throw new BadRequestException('缺少客户资料，无法创建出货订单');
    }
    const systemOrderNo = consolidation.consolidationNo;
    const shipment = await this.createShipment(principal, {
      customerId: customer.id,
      customerOrderNo: first.customerOrderNo,
      systemOrderNo,
      businessType: 'DEDICATED_LINE',
      packageType: 'WPX',
      destinationCountry: first.destinationCountry || '美国',
      packageCount: Number(consolidation.totalPackages),
      receivableWeightKg: Number(consolidation.totalChargeableWeightKg),
      agentWeightKg: Number(consolidation.totalChargeableWeightKg),
      initialStatus: 'DRAFT',
      latestTracking: '合并包裹创建出货订单，待审核'
    });
    const updated = await (this.prisma as any).warehouseConsolidation.update({
      where: { id },
      data: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo },
      include: { items: true }
    });
    await (this.prisma as any).warehousePackage.updateMany({
      where: { id: { in: consolidation.items.map((item: any) => item.packageId) } },
      data: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'warehouse.consolidation.create_shipment', target: id, after: { shipmentId: shipment.id, systemOrderNo } }
    });
    return mapWarehouseConsolidation(updated, updated.items.map((item: any) => item.packageId));
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
    const packages = await (this.prisma as any).warehousePackage.findMany({
      where: { id: { in: packageIds }, status: { notIn: ['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'] } },
      orderBy: [{ createdAt: 'asc' }]
    });
    if (packages.length !== packageIds.length) {
      throw new BadRequestException('部分包裹不存在、已合票或已出库，不能发起理货');
    }
    const summaries: WarehousePackageSummary[] = packages.map(mapWarehousePackage);
    if (summaries.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      throw new BadRequestException('理货后包裹待重新过机，完成测量后才能再次理货');
    }
    const existingTask = await (this.prisma as any).warehouseTallyTask.findFirst({
      where: { status: 'PENDING', packageIds: { hasSome: packageIds } }
    });
    if (existingTask) {
      throw new BadRequestException('包裹已有未完成理货任务');
    }
    const retallyPackages = summaries.filter((pkg) => pkg.tallyTaskId || pkg.tallyTaskNo || pkg.tallyStatus === '已理货');
    if (retallyPackages.length && (summaries.length !== 1 || retallyPackages.length !== 1)) {
      throw new BadRequestException('二次理货一次只能选择一个已完成理货的包裹');
    }
    const first = summaries[0];
    const previousTask = first.tallyTaskId
      ? await (this.prisma as any).warehouseTallyTask.findUnique({ where: { id: first.tallyTaskId } })
      : first.tallyTaskNo
        ? await (this.prisma as any).warehouseTallyTask.findUnique({ where: { taskNo: first.tallyTaskNo } })
        : null;
    const totalPackageCount = summaries.reduce((sum, pkg) => sum + pkg.packageCount, 0);
    const totalWeightKg = roundMoney(summaries.reduce((sum, pkg) => sum + pkg.weightKg * pkg.packageCount, 0));
    const totalVolumetricWeightKg = roundMoney(summaries.reduce((sum, pkg) => sum + (pkg.totalVolumetricWeightKg ?? pkg.volumetricWeightKg), 0));
    const totalVolumetricWeightKg5000 = roundMoney(summaries.reduce((sum, pkg) => sum + (pkg.totalVolumetricWeightKg5000 ?? pkg.volumetricWeightKg5000 ?? 0), 0));
    let created: any;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const taskNo = previousTask
        ? await this.nextWarehouseRetallyTaskNo(previousTask.taskNo)
        : await this.nextWarehouseTallyTaskNo(first.customerCode);
      try {
        created = await (this.prisma as any).warehouseTallyTask.create({
          data: {
            taskNo,
            packageIds,
            sourcePackageId: first.id,
            sourceCombinedOrderNo: first.combinedOrderNo,
            customerCode: first.customerCode,
            customerName: first.customerName,
            salesperson: first.salesperson,
            packageCount: totalPackageCount,
            originalWeightKg: totalWeightKg,
            originalLengthCm: first.lengthCm,
            originalWidthCm: first.widthCm,
            originalHeightCm: first.heightCm,
            originalVolumetricWeightKg: totalVolumetricWeightKg,
            originalVolumetricWeightKg5000: totalVolumetricWeightKg5000,
            tallyRequirement,
            remark: input.remark?.trim() || null,
            createdBy: principal.username
          }
        });
        break;
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002' || attempt === 4) {
          throw error;
        }
        const competingTask = await (this.prisma as any).warehouseTallyTask.findFirst({
          where: { status: 'PENDING', packageIds: { hasSome: packageIds } }
        });
        if (competingTask) {
          throw new BadRequestException('包裹已有未完成理货任务');
        }
      }
    }
    const summary = mapWarehouseTallyTask(created);
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'warehouse.tally.create', target: created.id, after: toAuditJson(summary) }
    });
    void this.lineage?.recordEvent('warehouse.tally.create', {
      actorUsername: principal.username,
      businessId: created.id,
      payload: summary,
      sourceRefs: packageIds.map((id) => ({ nodeType: 'warehouse_package', id })),
      metrics: {
        packageCount: summary.packageCount,
        originalWeightKg: summary.originalWeightKg,
        originalVolumetricWeightKg: summary.originalVolumetricWeightKg,
        sourcePackageCount: packageIds.length
      }
    });
    return summary;
  }

  async updateWarehouseTallyTask(principal: Principal, id: string, input: WarehouseTallyTaskUpdateInput): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehouseTallyTask.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('理货任务不存在');
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('已完成理货不能修改需求');
    }
    const updated = await (this.prisma as any).warehouseTallyTask.update({
      where: { id },
      data: {
        ...(input.tallyRequirement !== undefined ? { tallyRequirement: input.tallyRequirement.trim() } : {}),
        ...(input.remark !== undefined ? { remark: input.remark.trim() || null } : {})
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.tally.update',
        target: id,
        before: toAuditJson(mapWarehouseTallyTask(existing)),
        after: toAuditJson(mapWarehouseTallyTask(updated))
      }
    });
    const updatedSummary = mapWarehouseTallyTask(updated);
    void this.lineage?.recordEvent('warehouse.tally.complete', {
      actorUsername: principal.username,
      businessId: id,
      payload: {
        taskId: id,
        taskNo: updatedSummary.taskNo,
        statusFrom: existing.status,
        statusTo: updatedSummary.status,
        packageIds: existing.packageIds,
        completedBy: updatedSummary.completedBy,
        completedAt: updatedSummary.completedAt
      },
      sourceRefs: [
        { nodeType: 'warehouse_tally_task', id },
        ...existing.packageIds.map((packageId: string) => ({ nodeType: 'warehouse_package', id: packageId }))
      ],
      metrics: {
        packageCount: updatedSummary.completedPackageCount ?? updatedSummary.packageCount,
        completedWeightKg: updatedSummary.completedWeightKg,
        completedVolumetricWeightKg: updatedSummary.completedVolumetricWeightKg,
        completedVolumetricWeightKg5000: updatedSummary.completedVolumetricWeightKg5000
      }
    });
    return updatedSummary;
  }

  async completeWarehouseTallyTask(principal: Principal, id: string, input: WarehouseTallyTaskCompleteInput): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehouseTallyTask.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('理货任务不存在');
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('理货任务已完成');
    }
    if (input.results?.length) {
      return this.completeWarehouseTallyTaskWithResults(principal, existing, input);
    }
    const packageCount = Math.max(1, Math.floor(Number(input.packageCount) || 1));
    const weightKg = roundMoney(Number(input.weightKg) || 0);
    const lengthCm = roundMoney(Number(input.lengthCm) || 0);
    const widthCm = roundMoney(Number(input.widthCm) || 0);
    const heightCm = roundMoney(Number(input.heightCm) || 0);
    const completedVolumetricWeightKg = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 6000);
    const completedVolumetricWeightKg5000 = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 5000);
    const updated = await (this.prisma as any).warehouseTallyTask.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedPackageCount: packageCount,
        completedWeightKg: weightKg,
        completedLengthCm: lengthCm,
        completedWidthCm: widthCm,
        completedHeightCm: heightCm,
        completedVolumetricWeightKg,
        completedVolumetricWeightKg5000,
        completedBy: principal.username,
        completedAt: new Date(),
        ...(input.remark !== undefined ? { remark: input.remark.trim() || existing.remark } : {})
      }
    });
    await (this.prisma as any).warehousePackage.updateMany({
      where: { id: { in: existing.packageIds }, tallyTaskId: null, status: { notIn: ['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'] } },
      data: {
        tallyTaskId: updated.id,
        tallyTaskNo: updated.taskNo
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.tally.complete',
        target: id,
        before: toAuditJson(mapWarehouseTallyTask(existing)),
        after: toAuditJson(mapWarehouseTallyTask(updated))
      }
    });
    const updatedSummary = mapWarehouseTallyTask(updated);
    void this.lineage?.recordEvent('warehouse.tally.complete', {
      actorUsername: principal.username,
      businessId: id,
      payload: {
        taskId: id,
        taskNo: updatedSummary.taskNo,
        statusFrom: existing.status,
        statusTo: updatedSummary.status,
        packageIds: existing.packageIds,
        completedBy: updatedSummary.completedBy,
        completedAt: updatedSummary.completedAt
      },
      sourceRefs: [
        { nodeType: 'warehouse_tally_task', id },
        ...existing.packageIds.map((packageId: string) => ({ nodeType: 'warehouse_package', id: packageId }))
      ],
      metrics: {
        packageCount: updatedSummary.completedPackageCount ?? updatedSummary.packageCount,
        completedWeightKg: updatedSummary.completedWeightKg,
        completedVolumetricWeightKg: updatedSummary.completedVolumetricWeightKg,
        completedVolumetricWeightKg5000: updatedSummary.completedVolumetricWeightKg5000
      }
    });
    return updatedSummary;
  }

  private async completeWarehouseTallyTaskWithResults(principal: Principal, existing: any, input: WarehouseTallyTaskCompleteInput): Promise<WarehouseTallyTaskSummary> {
    const task = mapWarehouseTallyTask(existing);
    const sourceRows = await (this.prisma as any).warehousePackage.findMany({ where: { id: { in: task.packageIds } }, orderBy: { createdAt: 'asc' } });
    if (sourceRows.length !== task.packageIds.length || sourceRows.some((row: any) => row.status !== 'RECEIVED')) {
      throw new BadRequestException('理货任务中的原始包裹不存在或已不可处理');
    }
    const sourceById = new Map<string, any>(sourceRows.map((row: any) => [row.id, row]));
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
      const usages = sourceUsage.get(sourceId)!;
      if (usages.some((result) => result.sourcePackageIds.length > 1) && usages.length > 1) {
        throw new BadRequestException('参与合并的包裹不能同时保留或拆分');
      }
      if (usages.length > 1 && usages.reduce((sum, result) => sum + Math.floor(Number(result.packageCount) || 0), 0) !== Number(source.packageCount)) {
        throw new BadRequestException(`拆票件数合计必须等于原包裹件数：${source.combinedOrderNo}`);
      }
    }
    const mergedSourceIds = results.filter((result) => result.sourcePackageIds.length > 1).flatMap((result) => result.sourcePackageIds);
    if (new Set(mergedSourceIds.map((sourceId) => sourceById.get(sourceId)!.systemOrderNo).filter(Boolean)).size > 1) {
      throw new BadRequestException('不同已录单运单的包裹不能合并');
    }
    const allRoots = Array.from(new Set(results.map((result) => {
      const source = sourceById.get(result.sourcePackageIds[0])!;
      return source.sourcePackageNo || source.combinedOrderNo;
    })));
    const existingSplitRows = await (this.prisma as any).warehousePackage.findMany({
      where: { OR: allRoots.flatMap((root) => [{ sourcePackageNo: root }, { combinedOrderNo: { startsWith: `${root}-` } }]) },
      select: { combinedOrderNo: true }
    });
    const existingNos = existingSplitRows.map((row: any) => row.combinedOrderNo);
    const nextSplitByRoot = new Map<string, number>();
    const now = new Date();
    const completed = await this.prisma.$transaction(async (tx) => {
      const claim = await (tx as any).warehouseTallyTask.updateMany({
        where: { id: task.id, status: 'PENDING' },
        data: { status: 'PROCESSING' }
      });
      if (claim.count !== 1) {
        throw new BadRequestException('理货任务已被处理，请刷新后查看结果');
      }
      const totalOutputs = results.length;
      const outputData = results.map((result, resultIndex) => {
        const sourceIds = Array.from(new Set(result.sourcePackageIds));
        const first = sourceById.get(sourceIds[0])!;
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
        const labelNo = createWarehouseTallyPackageLabelNo(task.taskNo, packageIndex, totalOutputs);
        return {
          customerCode: first.customerCode,
          customerName: first.customerName,
          site: first.site,
          salesperson: first.salesperson,
          customerOrderNo: first.customerOrderNo,
          domesticTrackingNo: first.domesticTrackingNo,
          combinedOrderNo,
          labelNo,
          sourcePackageId: first.id,
          sourcePackageNo: root,
          tallyTaskId: task.id,
          tallyTaskNo: task.taskNo,
          systemOrderNo: first.systemOrderNo,
          shipmentId: first.shipmentId,
          receivingChannel: '理货完成',
          destinationCountry: first.destinationCountry,
          expectedTotalPackageCount: totalOutputs,
          packageIndex,
          packageCount: outputCount,
          weightKg: 0,
          lengthCm,
          widthCm,
          heightCm,
          cbm: 0,
          volumetricWeightKg: 0,
          chargeableWeightKg: 0,
          divisor: 6000,
          roundingRule: first.roundingRule ?? 'NONE',
          scanTime: null,
          remark: input.remark?.trim() || task.remark || first.remark,
          manualException: first.manualException,
          scanSource: '理货待重新过机',
          measurementStatus: 'PENDING_REMEASURE',
          status: 'RECEIVED',
          exceptions: first.exceptions ?? [],
          createdBy: principal.username
        };
      });
      await (tx as any).warehousePackage.createMany({ data: outputData });
      const createdRows = await (tx as any).warehousePackage.findMany({
        where: { tallyTaskId: task.id, createdBy: principal.username, createdAt: { gte: now } },
        orderBy: { createdAt: 'asc' }
      });
      const firstOutput = createdRows[0];
      await (tx as any).warehousePackage.updateMany({
        where: { id: { in: task.packageIds } },
        data: { status: 'TALLIED_ARCHIVED', archivedByPackageId: firstOutput.id, archivedByPackageNo: firstOutput.combinedOrderNo, archivedReason: '理货完成', archivedAt: now }
      });
      await (tx as any).warehousePackage.updateMany({
        where: { id: { in: task.packageIds }, tallyTaskId: null },
        data: { tallyTaskId: task.id, tallyTaskNo: task.taskNo }
      });
      const updated = await (tx as any).warehouseTallyTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedPackageCount: createdRows.reduce((sum: number, row: any) => sum + Number(row.packageCount), 0),
          completedWeightKg: null,
          completedLengthCm: null,
          completedWidthCm: null,
          completedHeightCm: null,
          completedVolumetricWeightKg: null,
          completedVolumetricWeightKg5000: null,
          completedBy: principal.username,
          completedAt: now,
          remark: input.remark?.trim() || task.remark,
          labelStatus: 'GENERATED',
          labelNo: task.taskNo,
          labelQrContent: null,
          labelGeneratedAt: now,
          labelGeneratedBy: principal.username,
          appliedPackageId: null,
          appliedPackageNo: null,
          labelAppliedAt: null,
          labelAppliedBy: null
        }
      });
      return { updated, createdRows };
    });
    const summary = mapWarehouseTallyTask(completed.updated);
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'warehouse.tally.process', target: task.id, before: toAuditJson(task), after: toAuditJson({ task: summary, resultPackageIds: completed.createdRows.map((row: any) => row.id) }) }
    });
    return summary;
  }

  async generateWarehouseTallyTaskLabel(principal: Principal, id: string): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehouseTallyTask.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('理货任务不存在');
    }
    const before = mapWarehouseTallyTask(existing);
    if (before.status !== 'COMPLETED') {
      throw new BadRequestException('请先完成理货再生成标签');
    }
    const labelNo = before.taskNo;
    const labelQrContent = buildWarehouseTallyLabelQrContent(before, labelNo);
    if (!(await this.hasAnyPermission(principal.role, ['warehouse:tally-completed:view']))) {
      throw new ForbiddenException('当前角色不能查看理货结果包裹');
    }
    const outputRows = await loadWarehouseTallyTaskOutputPackages(this.prisma, id);
    await Promise.all(outputRows.map((pkg, index) => (this.prisma as any).warehousePackage.update({
      where: { id: pkg.id },
      data: { labelNo: createWarehouseTallyPackageLabelNo(before.taskNo, index + 1, outputRows.length) }
    })));
    const updated = await (this.prisma as any).warehouseTallyTask.update({
      where: { id },
      data: {
        labelStatus: 'GENERATED',
        labelNo,
        labelQrContent,
        labelGeneratedAt: new Date(),
        labelGeneratedBy: principal.username
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: before.labelNo ? 'warehouse.tally.label.reprint' : 'warehouse.tally.label.generate',
        target: labelNo,
        before: toAuditJson(before),
        after: toAuditJson(mapWarehouseTallyTask(updated))
      }
    });
    const updatedSummary = mapWarehouseTallyTask(updated);
    void this.lineage?.recordEvent('warehouse.queue.label', {
      actorUsername: principal.username,
      businessId: labelNo,
      payload: {
        action: before.labelNo ? 'tally_label_reprint' : 'tally_label_generate',
        taskId: id,
        taskNo: updatedSummary.taskNo,
        labelNo,
        labelGeneratedAt: updatedSummary.labelGeneratedAt,
        labelGeneratedBy: updatedSummary.labelGeneratedBy
      },
      sourceRefs: [{ nodeType: 'warehouse_tally_task', id }],
      metrics: { labelCount: 1 }
    });
    return updatedSummary;
  }

  async applyWarehouseTallyMeasurementByBarcode(
    principal: Principal,
    input: { barcode: string; weightKg: number; lengthCm: number; widthCm: number; heightCm: number; measuredAt?: string; deviceNo?: string }
  ): Promise<{ package: WarehousePackageSummary; alreadyApplied: boolean } | undefined> {
    const labelNo = input.barcode.trim();
    const existing = await (this.prisma as any).warehousePackage.findFirst({
      where: { labelNo, tallyTaskId: { not: null }, status: { not: 'TALLIED_ARCHIVED' } },
      orderBy: { createdAt: 'desc' }
    });
    if (!existing) return undefined;
    const sameMeasurement = ['weightKg', 'lengthCm', 'widthCm', 'heightCm'].every((key) =>
      Math.abs(Number(existing[key]) - Number(input[key as keyof typeof input])) < 0.000001
    );
    if (existing.measurementStatus === 'MEASURED') {
      if (sameMeasurement) return { package: mapWarehousePackage(existing), alreadyApplied: true };
      throw new BadRequestException('理货标签已完成过机且本次数据不同，请转人工确认');
    }
    const measuredAt = input.measuredAt ? new Date(input.measuredAt) : new Date();
    const manualMeasurement = input.deviceNo === '人工录入';
    const cbm = roundMoney((input.lengthCm * input.widthCm * input.heightCm * Number(existing.packageCount)) / 1000000);
    const volumetricWeightKg = roundMoney((input.lengthCm * input.widthCm * input.heightCm * Number(existing.packageCount)) / 6000);
    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const claimed = await (tx as any).warehousePackage.updateMany({
        where: { id: existing.id, measurementStatus: 'PENDING_REMEASURE' },
        data: {
          weightKg: input.weightKg,
          lengthCm: input.lengthCm,
          widthCm: input.widthCm,
          heightCm: input.heightCm,
          cbm,
          volumetricWeightKg,
          chargeableWeightKg: roundMoney(Math.max(input.weightKg, volumetricWeightKg)),
          scanTime: measuredAt,
          scanSource: manualMeasurement ? '人工录入-理货复测' : '墨家设备-理货复测',
          measurementStatus: 'MEASURED',
          measurementMatchedAt: measuredAt,
          measurementMatchedBy: manualMeasurement ? principal.username : input.deviceNo ? `墨家设备:${input.deviceNo}` : principal.username
        }
      });
      if (claimed.count !== 1) {
        const current = await (tx as any).warehousePackage.findUnique({ where: { id: existing.id } });
        const currentMatches = current && ['weightKg', 'lengthCm', 'widthCm', 'heightCm'].every((key) =>
          Math.abs(Number(current[key]) - Number(input[key as keyof typeof input])) < 0.000001
        );
        if (current?.measurementStatus === 'MEASURED' && currentMatches) {
          return { pkg: current, alreadyApplied: true };
        }
        throw new BadRequestException('理货标签已完成过机且本次数据不同，请转人工确认');
      }
      const pkg = await (tx as any).warehousePackage.findUnique({ where: { id: existing.id } });
      const task = await (tx as any).warehouseTallyTask.findUnique({ where: { id: existing.tallyTaskId } });
      const outputs = await (tx as any).warehousePackage.findMany({
        where: { tallyTaskId: existing.tallyTaskId, id: { notIn: task.packageIds } },
        orderBy: [{ packageIndex: 'asc' }, { createdAt: 'asc' }]
      });
      if (outputs.length && outputs.every((row: any) => row.measurementStatus === 'MEASURED')) {
        const first = outputs[0];
        await (tx as any).warehouseTallyTask.update({
          where: { id: task.id },
          data: {
            completedWeightKg: roundMoney(outputs.reduce((sum: number, row: any) => sum + Number(row.weightKg), 0)),
            completedLengthCm: Number(first.lengthCm),
            completedWidthCm: Number(first.widthCm),
            completedHeightCm: Number(first.heightCm),
            completedVolumetricWeightKg: roundMoney(outputs.reduce((sum: number, row: any) => sum + Number(row.volumetricWeightKg), 0)),
            completedVolumetricWeightKg5000: roundMoney(outputs.reduce((sum: number, row: any) => sum + (Number(row.lengthCm) * Number(row.widthCm) * Number(row.heightCm) * Number(row.packageCount)) / 5000, 0)),
            appliedPackageId: first.id,
            appliedPackageNo: first.combinedOrderNo,
            labelAppliedAt: measuredAt,
            labelAppliedBy: principal.username
          }
        });
      }
      return { pkg, alreadyApplied: false };
    });
    if (transactionResult.alreadyApplied) {
      return { package: mapWarehousePackage(transactionResult.pkg), alreadyApplied: true };
    }
    const updated = transactionResult.pkg;
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.tally.measurement.apply',
        target: existing.id,
        before: toAuditJson(mapWarehousePackage(existing)),
        after: toAuditJson(mapWarehousePackage(updated))
      }
    });
    return { package: mapWarehousePackage(updated), alreadyApplied: false };
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
    const packageRow = await (this.prisma as any).warehousePackage.findFirst({
      where: { labelNo, tallyTaskId: { not: null }, status: { not: 'TALLIED_ARCHIVED' } },
      orderBy: { createdAt: 'desc' }
    });
    if (!packageRow) {
      throw new NotFoundException('理货标签不存在');
    }
    const existing = await (this.prisma as any).warehouseTallyTask.findUnique({ where: { id: packageRow.tallyTaskId } });
    if (!existing) throw new NotFoundException('理货任务不存在');
    const beforeTask = mapWarehouseTallyTask(existing);
    if (beforeTask.status !== 'COMPLETED' || beforeTask.labelStatus !== 'GENERATED') {
      throw new BadRequestException('请先完成理货并生成标签');
    }
    if (packageRow.measurementStatus === 'PENDING_REMEASURE') {
      throw new BadRequestException('该理货标签待重新过机，请通过设备回传或人工录入测量数据');
    }
    return { task: beforeTask, package: mapWarehousePackage(packageRow), alreadyApplied: true };
  }

  private async markWarehouseTallyTaskLabelOutput(principal: Principal, id: string, action: 'print' | 'download'): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehouseTallyTask.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('理货任务不存在');
    }
    const before = mapWarehouseTallyTask(existing);
    if (!before.labelNo || before.labelStatus !== 'GENERATED') {
      throw new BadRequestException('请先生成理货标签');
    }
    const updated = await (this.prisma as any).warehouseTallyTask.update({
      where: { id },
      data: action === 'print'
        ? { labelPrintedAt: new Date(), labelPrintedBy: principal.username }
        : { labelDownloadedAt: new Date(), labelDownloadedBy: principal.username }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: `warehouse.tally.label.${action}`,
        target: before.labelNo,
        before: toAuditJson(before),
        after: toAuditJson(mapWarehouseTallyTask(updated))
      }
    });
    const updatedSummary = mapWarehouseTallyTask(updated);
    void this.lineage?.recordEvent('warehouse.queue.label', {
      actorUsername: principal.username,
      businessId: before.labelNo,
      payload: {
        action: `tally_label_${action}`,
        taskId: id,
        taskNo: updatedSummary.taskNo,
        labelNo: before.labelNo,
        labelPrintedAt: updatedSummary.labelPrintedAt,
        labelDownloadedAt: updatedSummary.labelDownloadedAt
      },
      sourceRefs: [{ nodeType: 'warehouse_tally_task', id }],
      metrics: { labelCount: 1 }
    });
    return updatedSummary;
  }

  async getReceivables(principal: Principal): Promise<ReceivableFeeSummary[]> {
    return (await this.getReceivableAudits(principal)).rows;
  }

  async getReceivableAudits(principal: Principal, query: ReceivableAuditListQuery = {}): Promise<ReceivableAuditListResponse> {
    const rows = await this.prisma.receivableFee.findMany({
      where: {
        ...(principal.role === 'CUSTOMER' ? { shipment: { customerId: principal.customerId } } : {})
      } as any,
      include: { shipment: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' } as any
    });
    const manualRows = await (this.prisma as any).shipmentFinanceItem.findMany({
      where: {
        type: 'RECEIVABLE',
        ...(principal.role === 'CUSTOMER' ? { shipment: { customerId: principal.customerId } } : {})
      },
      include: { shipment: { include: { customer: true, agent: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const summaries = [
      ...rows.map((row: any) => this.toReceivableAuditSummary(row, 'SYSTEM')),
      ...manualRows.map((row: any) => this.toManualReceivableAuditSummary(row))
    ];
    return this.buildReceivableAuditListResponse(summaries, query);
  }

  async createReceivableAudit(principal: Principal, input: ReceivableAuditCreateInput): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const shipment = await this.findShipmentForReceivableAudit(principal, input);
    const item = await (this.prisma as any).shipmentFinanceItem.create({
      data: {
        shipmentId: shipment.id,
        type: 'RECEIVABLE',
        name: input.name,
        amount: input.amount,
        currency: input.currency ?? 'RMB',
        settlementMethod: input.settlementMethod ?? this.resolveReceivableSettlementMethod(shipment),
        paymentNo: input.paymentNo,
        reconciliationStatus: 'PENDING',
        remark: input.remark,
        createdBy: principal.username
      },
      include: { shipment: { include: { customer: true, agent: true } } }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.create', target: item.id, before: undefined, after: item }
    });
    return this.toManualReceivableAuditSummary(item);
  }

  async updateReceivableAudit(principal: Principal, id: string, input: ReceivableAuditUpdateInput): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const systemFee = await (this.prisma as any).receivableFee.findUnique({ where: { id }, include: { shipment: { include: { customer: true } } } });
    if (systemFee) {
      this.ensureReceivableAuditEditable(systemFee);
      const updated = await (this.prisma as any).receivableFee.update({
        where: { id },
        data: {
          name: input.name ?? systemFee.name,
          amount: input.amount ?? systemFee.amount,
          currency: input.currency ?? systemFee.currency,
          settlementMethod: input.settlementMethod ?? systemFee.settlementMethod,
          paymentNo: input.paymentNo ?? systemFee.paymentNo,
          remark: input.remark ?? systemFee.remark
        },
        include: { shipment: { include: { customer: true } } }
      });
      await this.prisma.auditLog.create({
        data: { actorId: principal.id, action: 'finance.receivable.update', target: id, before: systemFee, after: updated }
      });
      return this.toReceivableAuditSummary(updated, 'SYSTEM');
    }
    const current = await this.findReceivableFinanceItemById(id);
    this.ensureReceivableAuditEditable(current);
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        amount: input.amount ?? current.amount,
        currency: input.currency ?? current.currency,
        settlementMethod: input.settlementMethod ?? current.settlementMethod ?? this.resolveReceivableSettlementMethod(current.shipment),
        paymentNo: input.paymentNo ?? current.paymentNo,
        remark: input.remark ?? current.remark
      },
      include: { shipment: { include: { customer: true, agent: true } } }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.update', target: id, before: current, after: updated }
    });
    return this.toManualReceivableAuditSummary(updated);
  }

  async auditReceivableAudit(principal: Principal, id: string): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const reviewedAt = new Date();
    const systemFee = await (this.prisma as any).receivableFee.findUnique({ where: { id }, include: { shipment: { include: { customer: true } } } });
    if (systemFee) {
      if (systemFee.voided) {
        throw new BadRequestException('已作废应收不能审核');
      }
      if ((systemFee.reconciliationStatus ?? 'PENDING') !== 'PENDING') {
        throw new BadRequestException('只有待审核应收可以审核');
      }
      const updated = await (this.prisma as any).receivableFee.update({
        where: { id },
        data: { reconciliationStatus: 'CONFIRMED', reviewedBy: principal.username, reviewedAt },
        include: { shipment: { include: { customer: true } } }
      });
      await this.prisma.auditLog.create({
        data: { actorId: principal.id, action: 'finance.receivable.audit', target: id, before: systemFee, after: toAuditJson(this.toReceivableReviewAuditSnapshot(updated, principal, systemFee.reconciliationStatus, 'CONFIRMED', 'audit')) }
      });
      void this.lineage?.recordEvent('finance.receivables.audit', {
        actorUsername: principal.username,
        businessId: updated.id,
        payload: {
          action: 'audit',
          financeItemId: updated.id,
          shipmentId: updated.shipmentId,
          feeName: updated.name,
          amount: Number(updated.amount),
          currency: updated.currency ?? 'RMB',
          statusFrom: systemFee.reconciliationStatus ?? 'PENDING',
          statusTo: 'CONFIRMED',
          reviewedBy: principal.username,
          reviewedAt: reviewedAt.toISOString()
        },
        sourceRefs: [{ nodeType: 'shipment', id: updated.shipmentId }],
        metrics: { amount: Number(updated.amount), statusTo: 'CONFIRMED' }
      });
      return this.toReceivableAuditSummary(updated, 'SYSTEM');
    }
    const current = await this.findReceivableFinanceItemById(id);
    if (current.voided) {
      throw new BadRequestException('已作废应收不能审核');
    }
    if ((current.reconciliationStatus ?? 'PENDING') !== 'PENDING') {
      throw new BadRequestException('只有待审核应收可以审核');
    }
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { locked: true, reconciliationStatus: 'CONFIRMED', reviewedBy: principal.username, reviewedAt },
      include: { shipment: { include: { customer: true, agent: true } } }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.audit', target: id, before: current, after: toAuditJson(this.toReceivableReviewAuditSnapshot(updated, principal, current.reconciliationStatus, 'CONFIRMED', 'audit')) }
    });
    void this.lineage?.recordEvent('finance.receivables.audit', {
      actorUsername: principal.username,
      businessId: updated.id,
      payload: {
        action: 'audit',
        financeItemId: updated.id,
        shipmentId: updated.shipmentId,
        feeName: updated.name,
        amount: Number(updated.amount),
        currency: updated.currency ?? 'RMB',
        statusFrom: current.reconciliationStatus ?? 'PENDING',
        statusTo: 'CONFIRMED',
        reviewedBy: principal.username,
        reviewedAt: reviewedAt.toISOString()
      },
      sourceRefs: [{ nodeType: 'shipment', id: updated.shipmentId }],
      metrics: { amount: Number(updated.amount), statusTo: 'CONFIRMED' }
    });
    return this.toManualReceivableAuditSummary(updated);
  }

  async reverseAuditReceivableAudit(principal: Principal, id: string): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const systemFee = await (this.prisma as any).receivableFee.findUnique({ where: { id }, include: { shipment: { include: { customer: true } } } });
    if (systemFee) {
      if ((systemFee.reconciliationStatus ?? 'PENDING') !== 'CONFIRMED') {
        throw new BadRequestException('只有已审核应收可以反审核');
      }
      const updated = await (this.prisma as any).receivableFee.update({
        where: { id },
        data: { reconciliationStatus: 'PENDING', reviewedBy: null, reviewedAt: null },
        include: { shipment: { include: { customer: true } } }
      });
      await this.prisma.auditLog.create({
        data: { actorId: principal.id, action: 'finance.receivable.reverse_audit', target: id, before: systemFee, after: toAuditJson(this.toReceivableReviewAuditSnapshot(updated, principal, systemFee.reconciliationStatus, 'PENDING', 'reverse')) }
      });
      return this.toReceivableAuditSummary(updated, 'SYSTEM');
    }
    const current = await this.findReceivableFinanceItemById(id);
    if ((current.reconciliationStatus ?? 'PENDING') !== 'CONFIRMED') {
      throw new BadRequestException('只有已审核应收可以反审核');
    }
    await this.ensureReceivableNotSettledForReverseAudit(current.id);
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { locked: false, reconciliationStatus: 'PENDING', reviewedBy: null, reviewedAt: null },
      include: { shipment: { include: { customer: true, agent: true } } }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.reverse_audit', target: id, before: current, after: toAuditJson(this.toReceivableReviewAuditSnapshot(updated, principal, current.reconciliationStatus, 'PENDING', 'reverse')) }
    });
    return this.toManualReceivableAuditSummary(updated);
  }

  async deleteReceivableAudit(principal: Principal, id: string): Promise<ReceivableAuditSummary> {
    await this.ensureFinanceItemManageAccess(principal);
    const systemFee = await (this.prisma as any).receivableFee.findUnique({ where: { id }, include: { shipment: { include: { customer: true } } } });
    if (systemFee) {
      this.ensureReceivableAuditEditable(systemFee);
      const updated = await (this.prisma as any).receivableFee.update({
        where: { id },
        data: { voided: true, reconciliationStatus: 'VOIDED', voidedAt: new Date() },
        include: { shipment: { include: { customer: true } } }
      });
      await this.prisma.auditLog.create({
        data: { actorId: principal.id, action: 'finance.receivable.void', target: id, before: systemFee, after: updated }
      });
      return this.toReceivableAuditSummary(updated, 'SYSTEM');
    }
    const current = await this.findReceivableFinanceItemById(id);
    this.ensureReceivableAuditEditable(current);
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { voided: true, reconciliationStatus: 'VOIDED', voidedAt: new Date() },
      include: { shipment: { include: { customer: true, agent: true } } }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.void', target: id, before: current, after: updated }
    });
    return this.toManualReceivableAuditSummary(updated);
  }

  async batchAuditReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    const result = await this.runReceivableBatch(input.ids, (id) => this.auditReceivableAudit(principal, id));
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.batch_audit', target: input.ids.join(','), after: result as any }
    });
    return result;
  }

  async batchReverseAuditReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    const result = await this.runReceivableBatch(input.ids, (id) => this.reverseAuditReceivableAudit(principal, id));
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.batch_reverse_audit', target: input.ids.join(','), after: result as any }
    });
    return result;
  }

  async batchVoidReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput): Promise<ReceivableAuditBatchResult> {
    const result = await this.runReceivableBatch(input.ids, (id) => this.deleteReceivableAudit(principal, id));
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.batch_void', target: input.ids.join(','), after: result as any }
    });
    return result;
  }

  async matchReceivableReceipt(principal: Principal, id: string, input: ReceivableReceiptMatchInput): Promise<ReceivableAuditSummary> {
    const item = await this.findReceivableFinanceItemById(id);
    const existingReceipt = await (this.prisma as any).waterReceipt.findFirst({
      where: { OR: [{ id: input.ledgerId }, { receiptNo: input.ledgerId }, { accountLedgerId: input.ledgerId }] },
      include: this.waterReceiptInclude()
    });
    if (existingReceipt) {
      await this.matchWaterReceiptOrders(principal, existingReceipt.id, {
        matches: [{ receivableFinanceItemId: item.id, amount: Number(input.amount ?? item.amount) }]
      });
      const updated = await this.findReceivableFinanceItemById(id);
      return (await this.decorateReceivableRows([this.toManualReceivableAuditSummary(updated)]))[0];
    }
    const ledger = await this.prisma.accountLedger.findFirst({
      where: { id: input.ledgerId, partyType: 'CUSTOMER' }
    });
    if (!ledger) {
      throw new BadRequestException('水单不存在');
    }
    const receipt = await this.findOrCreateWaterReceiptFromLedger(ledger);
    await this.matchWaterReceiptOrders(principal, receipt.id, {
      matches: [{ receivableFinanceItemId: item.id, amount: Number(input.amount ?? item.amount) }]
    });
    const updated = await this.findReceivableFinanceItemById(id);
    return (await this.decorateReceivableRows([this.toManualReceivableAuditSummary(updated)]))[0];
  }

  async getWaterReceipts(principal: Principal, query: WaterReceiptListQuery = {}): Promise<WaterReceiptListResponse> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
    const canViewAll = await this.hasPermission(principal.role, 'finance:water-receipt:view-all');
    const canViewVoucher = await this.hasPermission(principal.role, 'finance:water-receipt:voucher');
    const salesScope = this.operatorCustomerScope(principal);
    const rows = await (this.prisma as any).waterReceipt.findMany({
      where: {
        ...(canViewAll || principal.role === 'ADMIN' || ['FINANCE', 'UG_FINANCE'].includes(principal.role) ? {} : { salesperson: { in: salesScope ?? [] } }),
        ...(query.status && query.status !== 'ALL'
          ? { status: query.status === 'ARRIVED' ? { in: ['ARRIVED', 'PARTIAL_MATCHED'] } : query.status }
          : query.includeArchived ? {} : { status: { notIn: ['ARCHIVED', 'VOIDED'] } })
      },
      include: this.waterReceiptInclude(),
      orderBy: { receiptDate: 'desc' }
    });
    return this.buildWaterReceiptListResponse(rows.map((row: any) => this.redactWaterReceiptVoucher(this.toWaterReceiptSummary(row), canViewVoucher || Boolean(salesScope))), query);
  }

  async createWaterReceipt(principal: Principal, input: WaterReceiptCreateInput): Promise<WaterReceiptSummary> {
    const customer = await this.findCustomerForWaterReceipt(input.customerId, input.customerCode);
    const canManage = await this.hasPermission(principal.role, 'finance:water-receipt:manage');
    if (!canManage) {
      await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
      const scope = this.operatorCustomerScope(principal);
      if (!scope || !customer?.salesperson || !scope.includes(customer.salesperson)) throw new ForbiddenException('只能为本人客户新增水单');
    }
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('水单金额必须大于 0');
    const paymentNo = await this.requireUniqueWaterReceiptPaymentNo(input.paymentNo);
    const receiptDate = new Date(input.receiptDate);
    if (Number.isNaN(receiptDate.getTime())) throw new BadRequestException('到账日期无效');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const receiptNo = await this.nextWaterReceiptNo();
      try {
        const created = await (this.prisma as any).waterReceipt.create({
          data: {
            receiptNo,
            site: input.site?.trim() || '思远收款',
            customerId: customer?.id,
            customerCode: customer?.code ?? input.customerCode,
            customerName: customer ? `${customer.code}-${customer.name}` : undefined,
            salesperson: customer?.salesperson,
            receiptMethod: input.receiptMethod.trim(),
            receiptDate,
            currency: input.currency ?? 'RMB',
            amount,
            balance: amount,
            paymentNo,
            remark: input.remark,
            status: 'PENDING'
          },
          include: this.waterReceiptInclude()
        });
        await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.create', target: created.id, after: created } });
        const summary = this.toWaterReceiptSummary(created);
        void this.lineage?.recordEvent('finance.water_receipts.create', {
          actorUsername: principal.username,
          businessId: summary.id,
          payload: {
            receiptId: summary.id,
            receiptNo: summary.receiptNo,
            customerId: summary.customerId,
            customerCode: summary.customerCode,
            amount: summary.amount,
            currency: summary.currency,
            status: summary.status,
            receiptDate: summary.receiptDate
          },
          sourceRefs: summary.customerId ? [{ nodeType: 'customer', id: summary.customerId }] : [],
          metrics: { amount: summary.amount, matchedAmount: summary.matchedAmount, balance: summary.balance }
        });
        return summary;
      } catch (error) {
        if (this.isPrismaUniqueConstraintError(error)) continue;
        throw error;
      }
    }
    throw new BadRequestException('水单编号生成失败，请重试');
  }

  async updateWaterReceipt(principal: Principal, id: string, input: WaterReceiptUpdateInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:manage');
    const current = await this.findWaterReceiptById(id);
    const isArrived = current.status !== 'PENDING';
    if (isArrived && input.amount !== undefined) {
      await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:adjust');
      if (!input.adjustReason?.trim()) throw new BadRequestException('修改已到账金额必须填写原因');
    }
    if (isArrived && (input.customerId || input.customerCode || input.receiptMethod || input.receiptDate || input.currency)) {
      throw new BadRequestException('已到账水单只能调整金额、付款编号或备注');
    }
    const customer = input.customerId || input.customerCode ? await this.findCustomerForWaterReceipt(input.customerId, input.customerCode) : undefined;
    const nextAmount = input.amount === undefined ? Number(current.amount) : Number(input.amount);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) throw new BadRequestException('水单金额必须大于 0');
    const matchedAmount = Number(current.matchedAmount ?? 0);
    if (nextAmount < matchedAmount) throw new BadRequestException('水单金额不能小于已匹配金额');
    const paymentNo = await this.requireUniqueWaterReceiptPaymentNo(input.paymentNo, id);
    const updated = await (this.prisma as any).waterReceipt.update({
      where: { id },
      data: {
        ...(customer ? { customerId: customer.id, customerCode: customer.code, customerName: `${customer.code}-${customer.name}`, salesperson: customer.salesperson } : {}),
        ...(input.site !== undefined ? { site: input.site?.trim() || '思远收款' } : {}),
        ...(input.receiptMethod !== undefined ? { receiptMethod: input.receiptMethod } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.receiptDate ? { receiptDate: new Date(input.receiptDate) } : {}),
        ...(input.amount !== undefined ? { amount: nextAmount, balance: roundMoney(nextAmount - matchedAmount), adjustReason: input.adjustReason } : {}),
        paymentNo,
        ...(input.remark !== undefined ? { remark: input.remark } : {})
      },
      include: this.waterReceiptInclude()
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.update', target: id, before: current, after: updated } });
    const summary = this.toWaterReceiptSummary(updated);
    if (['ARRIVED', 'PARTIAL_MATCHED'].includes(summary.status)) {
      await this.autoMatchUnmatchedReceivables(principal);
      return this.toWaterReceiptSummary(await this.findWaterReceiptById(id));
    }
    return summary;
  }

  async markWaterReceiptArrived(principal: Principal, id: string, input: WaterReceiptMarkArrivedInput = {}): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:arrive');
    const current = await this.findWaterReceiptById(id);
    if (current.status !== 'PENDING') throw new BadRequestException('只有未到账水单可以标记到账');
    if (!current.customerId) throw new BadRequestException('标记到账前必须选择客户编号');
    const arrivedAt = input.arrivedAt ? new Date(input.arrivedAt) : new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const account = await tx.customerAccount.findFirst({ where: { customerId: current.customerId, currency: current.currency ?? 'RMB' } });
      const accountBalanceBefore = Number(account?.balance ?? 0);
      const nextBalance = roundMoney(accountBalanceBefore + Number(current.amount));
      if (account) await tx.customerAccount.update({ where: { id: account.id }, data: { balance: nextBalance } });
      else await tx.customerAccount.create({ data: { customerId: current.customerId, currency: current.currency ?? 'RMB', balance: Number(current.amount) } });
      const ledger = await tx.accountLedger.create({
        data: { partyType: 'CUSTOMER', partyId: current.customerId, amount: current.amount, balance: current.balance, note: current.paymentNo ?? current.receiptMethod ?? '水单到账' }
      });
      const row = await (tx as any).waterReceipt.update({
        where: { id },
        data: { status: 'ARRIVED', arrivedAt, arrivedBy: principal.username, accountLedgerId: ledger.id, remark: input.note ?? current.remark },
        include: this.waterReceiptInclude()
      });
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'finance.water_receipt.arrive',
          target: id,
          before: current,
          after: {
            row,
            receiptNo: current.receiptNo,
            paymentNo: current.paymentNo,
            customerCode: current.customerCode,
            amount: Number(current.amount),
            currency: current.currency ?? 'RMB',
            statusBefore: current.status,
            statusAfter: row.status,
            operatedBy: principal.username,
            operatedAt: arrivedAt.toISOString(),
            notify: true,
            arrivedAmount: Number(current.amount),
            accountBalanceBefore,
            accountBalanceAfter: nextBalance,
            customerAccountBalance: nextBalance,
            arrivedBy: principal.username,
            arrivedAt: arrivedAt.toISOString()
          } as any
        }
      });
      await tx.auditLog.create({ data: { actorId: principal.id, action: 'notification.wecom.water_receipt_arrived.pending', target: id, after: { customerCode: current.customerCode, amount: Number(current.amount), balance: Number(current.balance), receiptDate: current.receiptDate } as any } });
      return row;
    });
    const summary = this.toWaterReceiptSummary(updated);
    void this.lineage?.recordEvent('finance.water_receipt_arrivals.arrive', {
      actorUsername: principal.username,
      businessId: summary.id,
      payload: {
        receiptId: summary.id,
        receiptNo: summary.receiptNo,
        accountLedgerId: summary.accountLedgerId,
        customerId: summary.customerId,
        customerCode: summary.customerCode,
        amount: summary.amount,
        currency: summary.currency,
        statusFrom: current.status,
        statusTo: summary.status,
        arrivedBy: principal.username,
        arrivedAt: summary.arrivedAt
      },
      sourceRefs: [
        { nodeType: 'water_receipt', id: summary.id },
        ...(summary.customerId ? [{ nodeType: 'customer', id: summary.customerId }] : []),
        ...(summary.accountLedgerId ? [{ nodeType: 'account_ledger', id: summary.accountLedgerId }] : [])
      ],
      metrics: { arrivedAmount: summary.amount, receiptBalance: summary.balance }
    });
    await this.autoMatchUnmatchedReceivables(principal);
    return this.toWaterReceiptSummary(await this.findWaterReceiptById(id));
  }

  async getWaterReceiptMatchableReceivables(principal: Principal, id: string): Promise<ReceivableAuditSummary[]> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
    const receipt = await this.findWaterReceiptById(id);
    if (!receipt.customerId) return [];
    const rows = await (this.prisma as any).shipmentFinanceItem.findMany({
      where: {
        type: 'RECEIVABLE',
        voided: false,
        shipment: { customerId: receipt.customerId },
        receiptStatus: { not: 'RECEIVED' }
      },
      include: { shipment: { include: { customer: true, agent: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return this.decorateReceivableRows(rows.filter((row: any) => Number(row.receivedAmount ?? 0) < Number(row.amount)).map((row: any) => this.toManualReceivableAuditSummary(row)));
  }

  async matchWaterReceiptOrders(principal: Principal, id: string, input: WaterReceiptMatchOrdersInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:match');
    const receipt = await this.findWaterReceiptById(id);
    if (!['ARRIVED', 'PARTIAL_MATCHED'].includes(receipt.status)) throw new BadRequestException('水单未到账，不能匹配订单');
    if (!receipt.customerId) throw new BadRequestException('水单缺少客户编号');
    const matches = input.matches ?? [];
    if (!matches.length) throw new BadRequestException('请选择要匹配的应收费用');
    const totalMatch = roundMoney(matches.reduce((sum, row) => sum + Number(row.amount), 0));
    if (totalMatch <= 0) throw new BadRequestException('匹配金额必须大于 0');
    if (totalMatch > Number(receipt.balance)) throw new BadRequestException('匹配金额不能超过水单余额');
    const financeItems = await (this.prisma as any).shipmentFinanceItem.findMany({
      where: { id: { in: matches.map((row) => row.receivableFinanceItemId) }, type: 'RECEIVABLE' },
      include: { shipment: { include: { customer: true, agent: true } } }
    });
    const itemMap = new Map<string, any>(financeItems.map((item: any) => [item.id, item]));
    for (const match of matches) {
      const item = itemMap.get(match.receivableFinanceItemId);
      if (!item) throw new BadRequestException('应收费用不存在');
      if (item.shipment.customerId !== receipt.customerId) throw new BadRequestException('只能匹配同客户编号下的应收');
      if (item.voided) throw new BadRequestException('不能匹配已作废的应收');
      if ((item.currency ?? 'RMB') !== (receipt.currency ?? 'RMB')) throw new BadRequestException('水单币种与应收币种不一致');
      const amount = Number(match.amount);
      const unpaid = roundMoney(Number(item.amount) - Number(item.receivedAmount ?? 0));
      if (!Number.isFinite(amount) || amount <= 0 || amount > unpaid) throw new BadRequestException('匹配金额不能超过订单未收金额');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const matchedAt = new Date();
      const account = await tx.customerAccount.findFirst({ where: { customerId: receipt.customerId, currency: receipt.currency ?? 'RMB' } });
      const accountBalanceBefore = Number(account?.balance ?? 0);
      for (const match of matches) {
        const item = itemMap.get(match.receivableFinanceItemId);
        const amount = Number(match.amount);
        const nextReceived = roundMoney(Number(item.receivedAmount ?? 0) + amount);
        await (tx as any).waterReceiptMatch.create({ data: { waterReceiptId: id, receivableFinanceItemId: item.id, shipmentId: item.shipmentId, amount, source: 'MANUAL', createdAt: matchedAt } });
        await (tx as any).shipmentFinanceItem.update({
          where: { id: item.id },
          data: {
            receivedAmount: nextReceived,
            receiptStatus: nextReceived >= Number(item.amount) ? 'RECEIVED' : 'PARTIAL',
            receivedAt: nextReceived >= Number(item.amount) ? new Date() : item.receivedAt,
            paymentNo: receipt.receiptNo,
            receiptMatchSource: 'MANUAL',
            receiptMatchHint: null
          }
        });
      }
      const nextMatched = roundMoney(Number(receipt.matchedAmount) + totalMatch);
      const nextBalance = roundMoney(Number(receipt.amount) - nextMatched);
      const nextStatus = nextBalance <= 0 ? 'ARCHIVED' : 'PARTIAL_MATCHED';
      if (account) {
        await tx.customerAccount.update({ where: { id: account.id }, data: { balance: roundMoney(Number(account.balance) - totalMatch) } });
      }
      const accountBalanceAfter = account ? roundMoney(accountBalanceBefore - totalMatch) : accountBalanceBefore;
      const row = await (tx as any).waterReceipt.update({
        where: { id },
        data: { matchedAmount: nextMatched, balance: nextBalance, status: nextStatus, archivedAt: nextStatus === 'ARCHIVED' ? new Date() : receipt.archivedAt },
        include: this.waterReceiptInclude()
      });
      if (receipt.accountLedgerId) await tx.accountLedger.update({ where: { id: receipt.accountLedgerId }, data: { balance: nextBalance } });
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'finance.water_receipt.match',
          target: id,
          before: receipt,
          after: {
            row,
            matchedBy: principal.username,
            matchedAt: matchedAt.toISOString(),
            receiptNo: receipt.receiptNo,
            paymentNo: receipt.paymentNo,
            customerCode: receipt.customerCode,
            matchedOrderNos: matches.map((match) => itemMap.get(match.receivableFinanceItemId)?.shipment?.systemOrderNo).filter(Boolean),
            matchedAmountDelta: totalMatch,
            receiptBalanceBefore: Number(receipt.balance),
            receiptBalanceAfter: nextBalance,
            accountBalanceBefore,
            accountBalanceAfter,
            customerAccountBalance: accountBalanceAfter
          } as any
        }
      });
      if (nextStatus === 'ARCHIVED') {
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'finance.water_receipt.archive',
            target: id,
            before: receipt,
            after: {
              row,
              receiptNo: receipt.receiptNo,
              paymentNo: receipt.paymentNo,
              customerCode: receipt.customerCode,
              archiveReason: '余额为 0 且关联应收已完成财务审核',
              archivedBy: principal.username,
              archivedAt: row.archivedAt
            } as any
          }
        });
      }
      return row;
    });
    const summary = this.toWaterReceiptSummary(updated);
    for (const match of matches) {
      const item = itemMap.get(match.receivableFinanceItemId);
      if (!item?.shipmentId) continue;
      void this.lineage?.recordEvent('finance.water_receipts.match', {
        actorUsername: principal.username,
        businessId: item.shipmentId,
        payload: {
          receiptId: id,
          receiptNo: receipt.receiptNo,
          receivableFinanceItemId: match.receivableFinanceItemId,
          shipmentId: item.shipmentId,
          systemOrderNo: item.shipment?.systemOrderNo,
          amount: Number(match.amount),
          currency: receipt.currency ?? 'RMB',
          matchedAmountDelta: totalMatch,
          receiptStatus: summary.status,
          receiptBalanceBefore: Number(receipt.balance),
          receiptBalanceAfter: summary.balance
        },
        sourceRefs: [
          { nodeType: 'water_receipt', id },
          { nodeType: 'receivable_finance_item', id: match.receivableFinanceItemId },
          { nodeType: 'shipment', id: item.shipmentId }
        ],
        metrics: {
          matchedAmountDelta: Number(match.amount),
          receiptBalanceBefore: Number(receipt.balance),
          receiptBalanceAfter: summary.balance
        }
      });
    }
    return summary;
  }

  async unmatchWaterReceipt(principal: Principal, id: string, input: WaterReceiptUnmatchInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:match');
    const receipt = await this.findWaterReceiptById(id);
    const matches = await (this.prisma as any).waterReceiptMatch.findMany({ where: { id: { in: input.matchIds ?? [] }, waterReceiptId: id, voided: false }, include: { receivableFinanceItem: true } });
    if (!matches.length) throw new BadRequestException('没有可撤销的匹配记录');
    const amount = roundMoney(matches.reduce((sum: number, row: any) => sum + Number(row.amount), 0));
    const updated = await this.prisma.$transaction(async (tx) => {
      for (const match of matches) {
        const item = match.receivableFinanceItem;
        const nextReceived = Math.max(0, roundMoney(Number(item.receivedAmount ?? 0) - Number(match.amount)));
        await (tx as any).waterReceiptMatch.update({ where: { id: match.id }, data: { voided: true, voidedAt: new Date(), voidedBy: principal.username, voidReason: input.reason } });
        await (tx as any).shipmentFinanceItem.update({
          where: { id: item.id },
          data: { receivedAmount: nextReceived, receiptStatus: nextReceived <= 0 ? 'UNPAID' : 'PARTIAL', receivedAt: nextReceived <= 0 ? null : item.receivedAt, ...(nextReceived <= 0 ? { paymentNo: null, receiptMatchSource: null, receiptMatchHint: null } : {}) }
        });
      }
      const nextMatched = Math.max(0, roundMoney(Number(receipt.matchedAmount) - amount));
      const nextBalance = roundMoney(Number(receipt.amount) - nextMatched);
      const account = await tx.customerAccount.findFirst({ where: { customerId: receipt.customerId, currency: receipt.currency ?? 'RMB' } });
      if (account) {
        await tx.customerAccount.update({ where: { id: account.id }, data: { balance: roundMoney(Number(account.balance) + amount) } });
      }
      const row = await (tx as any).waterReceipt.update({
        where: { id },
        data: { matchedAmount: nextMatched, balance: nextBalance, status: nextMatched <= 0 ? 'ARRIVED' : 'PARTIAL_MATCHED', archivedAt: null },
        include: this.waterReceiptInclude()
      });
      if (receipt.accountLedgerId) await tx.accountLedger.update({ where: { id: receipt.accountLedgerId }, data: { balance: nextBalance } });
      await tx.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.unmatch', target: id, before: receipt, after: row } });
      return row;
    });
    await this.autoMatchUnmatchedReceivables(principal);
    return this.toWaterReceiptSummary(await this.findWaterReceiptById(id));
  }

  private async autoMatchUnmatchedReceivables(principal: Principal) {
    const [receipts, items] = await Promise.all([
      (this.prisma as any).waterReceipt.findMany({ where: { customerId: { not: null }, balance: { gt: 0 }, status: { in: ['ARRIVED', 'PARTIAL_MATCHED'] } } }),
      (this.prisma as any).shipmentFinanceItem.findMany({
        where: { type: 'RECEIVABLE', voided: false, receiptStatus: 'UNPAID', receivedAmount: { lte: 0 } },
        include: { shipment: { include: { customer: true } } }
      })
    ]);
    const candidates = items.map((item: any) => ({
      item,
      rows: receipts.filter((receipt: any) => receipt.customerId === item.shipment.customerId && (receipt.currency ?? 'RMB') === (item.currency ?? 'RMB') && Number(receipt.balance) >= Number(item.amount))
    }));
    const receiptCandidateCounts = new Map<string, number>();
    candidates.forEach(({ rows }: { rows: any[] }) => rows.forEach((receipt: any) => receiptCandidateCounts.set(receipt.id, (receiptCandidateCounts.get(receipt.id) ?? 0) + 1)));
    for (const { item, rows } of candidates) {
      const sameCustomerCurrency = receipts.filter((receipt: any) => receipt.customerId === item.shipment.customerId && (receipt.currency ?? 'RMB') === (item.currency ?? 'RMB'));
      if (!rows.length) {
        if (sameCustomerCurrency.length) await (this.prisma as any).shipmentFinanceItem.update({ where: { id: item.id }, data: { receiptMatchHint: '水单余额不足' } });
        continue;
      }
      if (rows.length > 1 || (receiptCandidateCounts.get(rows[0].id) ?? 0) > 1) {
        await (this.prisma as any).shipmentFinanceItem.update({ where: { id: item.id }, data: { receiptMatchHint: '存在多个候选水单，请手动选择' } });
        continue;
      }
      const receipt = rows[0];
      const amount = roundMoney(Number(item.amount));
      await this.prisma.$transaction(async (tx) => {
        const [currentItem, currentReceipt] = await Promise.all([
          (tx as any).shipmentFinanceItem.findUnique({ where: { id: item.id } }),
          (tx as any).waterReceipt.findUnique({ where: { id: receipt.id } })
        ]);
        if (!currentItem || !currentReceipt || currentItem.voided || currentItem.receiptStatus !== 'UNPAID' || Number(currentItem.receivedAmount ?? 0) > 0 || !['ARRIVED', 'PARTIAL_MATCHED'].includes(currentReceipt.status) || Number(currentReceipt.balance) < amount) return;
        await (tx as any).waterReceiptMatch.create({ data: { waterReceiptId: currentReceipt.id, receivableFinanceItemId: currentItem.id, shipmentId: currentItem.shipmentId, amount, source: 'AUTO' } });
        await (tx as any).shipmentFinanceItem.update({ where: { id: currentItem.id }, data: { receivedAmount: amount, receiptStatus: 'RECEIVED', receivedAt: new Date(), paymentNo: currentReceipt.receiptNo, receiptMatchSource: 'AUTO', receiptMatchHint: null } });
        const nextMatched = roundMoney(Number(currentReceipt.matchedAmount) + amount);
        const nextBalance = roundMoney(Number(currentReceipt.amount) - nextMatched);
        const nextStatus = nextBalance <= 0 ? 'ARCHIVED' : 'PARTIAL_MATCHED';
        await (tx as any).waterReceipt.update({ where: { id: currentReceipt.id }, data: { matchedAmount: nextMatched, balance: nextBalance, status: nextStatus, archivedAt: nextStatus === 'ARCHIVED' ? new Date() : currentReceipt.archivedAt } });
        const account = await tx.customerAccount.findFirst({ where: { customerId: currentReceipt.customerId, currency: currentReceipt.currency ?? 'RMB' } });
        if (account) await tx.customerAccount.update({ where: { id: account.id }, data: { balance: roundMoney(Number(account.balance) - amount) } });
        if (currentReceipt.accountLedgerId) await tx.accountLedger.update({ where: { id: currentReceipt.accountLedgerId }, data: { balance: nextBalance } });
        await tx.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.auto_match', target: currentReceipt.id, after: toAuditJson({ receiptNo: currentReceipt.receiptNo, receivableFinanceItemId: currentItem.id, shipmentId: currentItem.shipmentId, amount, source: 'AUTO', message: '上传或更新水单后自动匹配到订单' }) } });
      });
    }
  }

  async archiveWaterReceipt(principal: Principal, id: string): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:archive');
    const current = await this.findWaterReceiptById(id);
    if (Number(current.balance) > 0) throw new BadRequestException('水单余额为 0 后才能归档');
    const updated = await (this.prisma as any).waterReceipt.update({ where: { id }, data: { status: 'ARCHIVED', archivedAt: new Date(), archivedBy: principal.username }, include: this.waterReceiptInclude() });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.archive', target: id, before: current, after: updated } });
    return this.toWaterReceiptSummary(updated);
  }

  async voidWaterReceipt(principal: Principal, id: string, input: { reason?: string } = {}): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:void');
    const current = await this.findWaterReceiptById(id);
    if (Number(current.matchedAmount) > 0) throw new BadRequestException('已匹配水单需先撤销匹配后作废');
    const updated = await (this.prisma as any).waterReceipt.update({ where: { id }, data: { status: 'VOIDED', voidedAt: new Date(), voidedBy: principal.username, voidedReason: input.reason }, include: this.waterReceiptInclude() });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.void', target: id, before: current, after: updated } });
    return this.toWaterReceiptSummary(updated);
  }

  async uploadWaterReceiptVoucher(principal: Principal, id: string, input: WaterReceiptVoucherInput): Promise<WaterReceiptVoucherSummary> {
    if (!input.fileName?.trim()) throw new BadRequestException('水单凭证文件名不能为空');
    const receipt = await this.findWaterReceiptById(id);
    await this.ensureWaterReceiptVoucherAccess(principal, receipt);
    const beforeVoucher = receipt.voucher ? this.toWaterReceiptVoucherSummary(receipt.voucher) : undefined;
    const row = await (this.prisma as any).waterReceiptVoucher.upsert({
      where: { waterReceiptId: id },
      update: { fileName: input.fileName.trim(), mimeType: input.mimeType, sizeBytes: input.sizeBytes, url: input.url, uploadedBy: principal.username },
      create: { waterReceiptId: id, fileName: input.fileName.trim(), mimeType: input.mimeType, sizeBytes: input.sizeBytes, url: input.url, uploadedBy: principal.username }
    });
    const summary = this.toWaterReceiptVoucherSummary(row);
    const receiptSummary = this.toWaterReceiptSummary(receipt);
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'finance.water_receipt.voucher',
        target: id,
        before: beforeVoucher ? toAuditJson(this.toWaterReceiptVoucherAuditSnapshot(receiptSummary, beforeVoucher)) : undefined,
        after: toAuditJson(this.toWaterReceiptVoucherAuditSnapshot(receiptSummary, summary, beforeVoucher))
      }
    });
    return summary;
  }

  async deleteWaterReceiptVoucher(principal: Principal, id: string): Promise<{ deleted: true }> {
    const receipt = await this.findWaterReceiptById(id);
    await this.ensureWaterReceiptVoucherAccess(principal, receipt);
    const beforeVoucher = receipt.voucher ? this.toWaterReceiptVoucherSummary(receipt.voucher) : undefined;
    if (!beforeVoucher) throw new NotFoundException('水单凭证不存在');
    await (this.prisma as any).waterReceiptVoucher.delete({ where: { waterReceiptId: id } });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'finance.water_receipt.voucher.delete',
        target: id,
        before: toAuditJson(this.toWaterReceiptVoucherAuditSnapshot(this.toWaterReceiptSummary(receipt), beforeVoucher))
      }
    });
    return { deleted: true };
  }

  async exportWaterReceipts(principal: Principal, input: WaterReceiptExportRequest): Promise<WaterReceiptExportResponse> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:export');
    const response = await this.getWaterReceipts(principal, { ...(input.query ?? {}), page: 1, pageSize: -1, includeArchived: true });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.export', target: input.ids?.join(',') ?? 'query', after: { count: rows.length, query: input.query } as any } });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async exportReceivableAudits(principal: Principal, input: ReceivableAuditExportRequest): Promise<ReceivableAuditExportResponse> {
    const response = await this.getReceivableAudits(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.receivable.export', target: input.ids?.join(',') ?? 'filtered', after: { count: rows.length } as any }
    });
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
    const rows = await (this.prisma as any).shipmentFinanceItem.findMany({
      where: { type: 'BUSINESS_COST' },
      include: {
        shipment: {
          include: {
            customer: true,
            agent: true,
            receivableFees: true,
            financeItems: { where: { voided: false } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const scoped = rows
      .filter((row: any) => Boolean(row.shipment?.businessReviewedAt))
      .filter((row: any) => this.canAccessBusinessCostRow(principal, row, canViewAll))
      .map((row: any) => this.toBusinessCostAuditSummary(row, { canViewAgent, canViewProfit }));
    return this.buildBusinessCostAuditListResponse(scoped, query);
  }

  async createBusinessCostAudit(principal: Principal, input: BusinessCostAuditCreateInput): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:manage');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const shipment = await this.findShipmentForFinanceAudit(principal, input);
    if (!this.canAccessBusinessCostShipment(principal, shipment)) {
      throw new ForbiddenException('不能维护其他业务员的业务成本');
    }
    const amount = this.calculateBusinessCostAmount(input.chargeWeightKg, input.unitPrice, input.amount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('业务成本金额必须大于等于 0');
    }
    const item = await (this.prisma as any).shipmentFinanceItem.create({
      data: {
        shipmentId: shipment.id,
        type: 'BUSINESS_COST',
        name: input.name,
        amount,
        currency: input.currency ?? 'RMB',
        settlementMethod: input.settlementMethod,
        paymentNo: input.paymentNo,
        reconciliationStatus: 'PENDING',
        agentName: shipment.agent?.name ?? undefined,
        chargeWeightKg: input.chargeWeightKg,
        unitPrice: input.unitPrice,
        remark: input.remark,
        createdBy: principal.username
      },
      include: this.businessCostAuditInclude()
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.create', target: item.id, before: undefined, after: item }
    });
    return this.toBusinessCostAuditSummary(item, { canViewAgent, canViewProfit });
  }

  async updateBusinessCostAudit(principal: Principal, id: string, input: BusinessCostAuditUpdateInput): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:manage');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const current = await this.findBusinessCostFinanceItemById(id);
    if (!this.canAccessBusinessCostRow(principal, current, await this.hasPermission(principal.role, 'finance:business-cost:view-all'))) {
      throw new ForbiddenException('不能维护其他业务员的业务成本');
    }
    this.ensureBusinessCostAuditEditable(current);
    const nextChargeWeight = input.chargeWeightKg ?? (current.chargeWeightKg === null ? undefined : Number(current.chargeWeightKg));
    const nextUnitPrice = input.unitPrice ?? (current.unitPrice === null ? undefined : Number(current.unitPrice));
    const amount = this.calculateBusinessCostAmount(nextChargeWeight, nextUnitPrice, input.amount ?? Number(current.amount));
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        amount,
        currency: input.currency ?? current.currency,
        settlementMethod: input.settlementMethod ?? current.settlementMethod,
        paymentNo: input.paymentNo ?? current.paymentNo,
        agentName: current.agentName ?? current.shipment?.agent?.name,
        chargeWeightKg: input.chargeWeightKg ?? current.chargeWeightKg,
        unitPrice: input.unitPrice ?? current.unitPrice,
        remark: input.remark ?? current.remark
      },
      include: this.businessCostAuditInclude()
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.update', target: id, before: current, after: updated }
    });
    return this.toBusinessCostAuditSummary(updated, { canViewAgent, canViewProfit });
  }

  async auditBusinessCostAudit(principal: Principal, id: string): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:audit');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const current = await this.findBusinessCostFinanceItemById(id);
    if (current.voided) {
      throw new BadRequestException('已作废业务成本不能审核');
    }
    if (current.reconciliationStatus !== 'PENDING') {
      throw new BadRequestException('只有待审核业务成本可以审核');
    }
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { locked: true, reconciliationStatus: 'CONFIRMED', reviewedBy: principal.username, reviewedAt: new Date() },
      include: this.businessCostAuditInclude()
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.audit', target: id, before: current, after: toAuditJson(this.toBusinessCostReviewAuditSnapshot(updated, principal, current.reconciliationStatus, 'CONFIRMED', 'audit')) }
    });
    void this.lineage?.recordEvent('finance.business_costs.audit', {
      actorUsername: principal.username,
      businessId: updated.id,
      payload: {
        action: 'audit',
        financeItemId: updated.id,
        shipmentId: updated.shipmentId,
        feeName: updated.name,
        amount: Number(updated.amount),
        currency: updated.currency ?? 'RMB',
        statusFrom: current.reconciliationStatus,
        statusTo: 'CONFIRMED',
        reviewedBy: principal.username,
        reviewedAt: updated.reviewedAt?.toISOString?.() ?? updated.reviewedAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: updated.shipmentId }],
      metrics: { amount: Number(updated.amount), statusTo: 'CONFIRMED' }
    });
    return this.toBusinessCostAuditSummary(updated, { canViewAgent, canViewProfit });
  }

  async reverseAuditBusinessCostAudit(principal: Principal, id: string): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:reverse');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const current = await this.findBusinessCostFinanceItemById(id);
    if (current.reconciliationStatus !== 'CONFIRMED') {
      throw new BadRequestException('只有已审核业务成本可以反审核');
    }
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { locked: false, reconciliationStatus: 'PENDING', reviewedBy: null, reviewedAt: null },
      include: this.businessCostAuditInclude()
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.reverse_audit', target: id, before: current, after: toAuditJson(this.toBusinessCostReviewAuditSnapshot(updated, principal, current.reconciliationStatus, 'PENDING', 'reverse')) }
    });
    return this.toBusinessCostAuditSummary(updated, { canViewAgent, canViewProfit });
  }

  async deleteBusinessCostAudit(principal: Principal, id: string): Promise<BusinessCostAuditSummary> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:void');
    const canViewAgent = await this.hasPermission(principal.role, 'finance:business-cost:view-agent');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:business-cost:view-profit');
    const current = await this.findBusinessCostFinanceItemById(id);
    this.ensureBusinessCostAuditEditable(current);
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { voided: true, reconciliationStatus: 'VOIDED', voidedAt: new Date() },
      include: this.businessCostAuditInclude()
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.void', target: id, before: current, after: updated }
    });
    return this.toBusinessCostAuditSummary(updated, { canViewAgent, canViewProfit });
  }

  async batchAuditBusinessCostAudits(principal: Principal, input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    const result = await this.runBusinessCostBatch(input.ids, (id) => this.auditBusinessCostAudit(principal, id));
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.batch_audit', target: input.ids.join(','), after: result as any }
    });
    return result;
  }

  async batchReverseAuditBusinessCostAudits(principal: Principal, input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    const result = await this.runBusinessCostBatch(input.ids, (id) => this.reverseAuditBusinessCostAudit(principal, id));
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.batch_reverse_audit', target: input.ids.join(','), after: result as any }
    });
    return result;
  }

  async batchVoidBusinessCostAudits(principal: Principal, input: BusinessCostAuditBatchInput): Promise<BusinessCostAuditBatchResult> {
    const result = await this.runBusinessCostBatch(input.ids, (id) => this.deleteBusinessCostAudit(principal, id));
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.batch_void', target: input.ids.join(','), after: result as any }
    });
    return result;
  }

  async exportBusinessCostAudits(principal: Principal, input: BusinessCostAuditExportRequest): Promise<BusinessCostAuditExportResponse> {
    await this.ensureBusinessCostPermission(principal, 'finance:business-cost:export');
    const response = await this.getBusinessCostAudits(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.business_cost.export', target: input.ids?.join(',') ?? 'filtered', after: { count: rows.length } as any }
    });
    return {
      rows,
      exportedAt: new Date().toISOString()
    };
  }

  async getPayableAudits(principal: Principal, query: PayableAuditListQuery = {}): Promise<PayableAuditListResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:read');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const rows = await (this.prisma as any).shipmentFinanceItem.findMany({
      where: { type: 'PAYABLE' },
      include: this.payableAuditInclude(),
      orderBy: { createdAt: 'desc' }
    });
    const visibleRows = [];
    for (const row of rows) {
      if (await this.canExposePayableToFinance(row)) visibleRows.push(row);
    }
    const scoped = visibleRows.map((row: any) => this.toPayableAuditSummary(row, { canViewSensitivePayable, canViewProfit }));
    return this.buildPayableAuditListResponse(scoped, query);
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
    const shipment = await this.findShipmentForFinanceAudit(principal, input);
    const amount = this.calculatePayableAmount(input.chargeWeightKg, input.unitPrice, input.amount ?? 0);
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) {
      throw new BadRequestException('应付金额必须大于等于 0');
    }
    const item = await (this.prisma as any).shipmentFinanceItem.create({
      data: {
        shipmentId: shipment.id,
        type: 'PAYABLE',
        name: input.name,
        amount,
        currency: input.currency ?? 'RMB',
        settlementMethod: input.settlementMethod,
        paymentNo: input.paymentNo,
        reconciliationStatus: 'PENDING',
        agentName: shipment.agent?.name ?? undefined,
        chargeWeightKg: input.chargeWeightKg,
        unitPrice: input.unitPrice,
        amountOverridden: input.chargeWeightKg === undefined || input.unitPrice === undefined,
        remark: input.remark,
        createdBy: principal.username
      },
      include: this.payableAuditInclude()
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.payable.create', target: item.id, before: undefined, after: item }
    });
    return this.toPayableAuditSummary(item, { canViewSensitivePayable, canViewProfit });
  }

  async matchPayableAuditShipment(principal: Principal, input: PayableAuditShipmentMatchInput): Promise<PayableAuditShipmentMatchSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:manage');
    const shipment = await this.findShipmentForFinanceAudit(principal, input);
    return this.toPayableAuditShipmentMatchSummary(shipment);
  }

  async updatePayableAudit(principal: Principal, id: string, input: PayableAuditUpdateInput): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:manage');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const current = await this.findPayableFinanceItemById(id);
    this.ensurePayableAuditEditable(current);
    const nextChargeWeight = input.chargeWeightKg ?? (current.chargeWeightKg === null ? undefined : Number(current.chargeWeightKg));
    const nextUnitPrice = input.unitPrice ?? (current.unitPrice === null ? undefined : Number(current.unitPrice));
    const amount = this.calculatePayableAmount(nextChargeWeight, nextUnitPrice, input.amount ?? Number(current.amount));
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) {
      throw new BadRequestException('应付金额必须大于等于 0');
    }
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        amount,
        currency: input.currency ?? current.currency,
        settlementMethod: input.settlementMethod ?? current.settlementMethod,
        paymentNo: input.paymentNo ?? current.paymentNo,
        agentName: current.agentName ?? current.shipment.agent?.name ?? undefined,
        chargeWeightKg: input.chargeWeightKg ?? current.chargeWeightKg,
        unitPrice: input.unitPrice ?? current.unitPrice,
        amountOverridden: nextChargeWeight === undefined || nextUnitPrice === undefined,
        remark: input.remark ?? current.remark
      },
      include: this.payableAuditInclude()
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.payable.update', target: id, before: current, after: updated }
    });
    return this.toPayableAuditSummary(updated, { canViewSensitivePayable, canViewProfit });
  }

  async auditPayableAudit(principal: Principal, id: string): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:audit');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const current = await this.findPayableFinanceItemById(id);
    await this.ensurePayableReadyForFinance(current);
    if (current.voided) {
      throw new BadRequestException('已作废应付费用不能审核');
    }
    if (current.reconciliationStatus !== 'PENDING') {
      throw new BadRequestException('只有待审核应付费用可以审核');
    }
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { locked: true, reconciliationStatus: 'CONFIRMED', reviewedBy: principal.username, reviewedAt: new Date() },
      include: this.payableAuditInclude()
    });
    const application = await this.upsertPayablePaymentApplication(updated);
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.payable.audit', target: id, before: current, after: toAuditJson(this.toPayableReviewAuditSnapshot(updated, principal, current.reconciliationStatus, 'CONFIRMED', 'audit', application)) }
    });
    void this.lineage?.recordEvent('finance.payables.audit', {
      actorUsername: principal.username,
      businessId: updated.id,
      payload: {
        action: 'audit',
        financeItemId: updated.id,
        shipmentId: updated.shipmentId,
        pendingPaymentId: application.id,
        feeName: updated.name,
        amount: Number(updated.amount),
        currency: updated.currency ?? 'RMB',
        statusFrom: current.reconciliationStatus,
        statusTo: 'CONFIRMED',
        reviewedBy: principal.username,
        reviewedAt: updated.reviewedAt?.toISOString?.() ?? updated.reviewedAt
      },
      sourceRefs: [
        { nodeType: 'shipment', id: updated.shipmentId },
        { nodeType: 'pending_payment', id: application.id }
      ],
      metrics: { amount: Number(updated.amount), statusTo: 'CONFIRMED' }
    });
    return this.toPayableAuditSummary(updated, { canViewSensitivePayable, canViewProfit });
  }

  async reverseAuditPayableAudit(principal: Principal, id: string): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:reverse');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const current = await this.findPayableFinanceItemById(id);
    if (current.reconciliationStatus !== 'CONFIRMED') {
      throw new BadRequestException('只有已审核应付费用可以反审核');
    }
    const activePaymentItem = await (this.prisma as any).paymentApplicationItem.findFirst({
      where: {
        payableFinanceItemId: id,
        paymentApplication: { status: { in: ['WAITING_PAYMENT', 'PAID'] } }
      },
      include: { paymentApplication: true }
    });
    if (activePaymentItem?.paymentApplication?.status === 'PAID') {
      throw new BadRequestException('该应付已支付，请先在已付款模块反核销');
    }
    if (activePaymentItem?.paymentApplication?.status === 'WAITING_PAYMENT') {
      throw new BadRequestException('该应付已进入付款申请，请先撤回付款申请');
    }
    const pendingPaymentRows = await (this.prisma as any).payablePaymentApplication.findMany({
      where: { payableFinanceItemId: id },
      select: { id: true }
    });
    const pendingPaymentIds = pendingPaymentRows.map((row: { id: string }) => row.id);
    const billVoucher = await (this.prisma as any).paymentVoucher.findFirst({
      where: {
        voucherType: { not: 'PAYMENT_RECEIPT' },
        OR: [
          { payableFinanceItemId: id },
          ...(pendingPaymentIds.length ? [{ pendingPaymentId: { in: pendingPaymentIds } }] : [])
        ]
      }
    });
    if (billVoucher) {
      throw new BadRequestException('该应付已生成付款凭证，请先处理凭证后再反审核');
    }
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { locked: false, reconciliationStatus: 'PENDING', reviewedBy: null, reviewedAt: null },
      include: this.payableAuditInclude()
    });
    await (this.prisma as any).payablePaymentApplication.updateMany({
      where: { payableFinanceItemId: id, status: { not: 'PAID' } },
      data: { status: 'INVALIDATED', applicationStatus: 'INVALIDATED', invalidatedAt: new Date() }
    });
    const invalidatedApplication = await (this.prisma as any).payablePaymentApplication.findFirst({
      where: { payableFinanceItemId: id, status: 'INVALIDATED' },
      orderBy: { updatedAt: 'desc' }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.payable.reverse_audit', target: id, before: current, after: toAuditJson(this.toPayableReviewAuditSnapshot(updated, principal, current.reconciliationStatus, 'PENDING', 'reverse', invalidatedApplication)) }
    });
    return this.toPayableAuditSummary(updated, { canViewSensitivePayable, canViewProfit });
  }

  async deletePayableAudit(principal: Principal, id: string): Promise<PayableAuditSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:void');
    const canViewSensitivePayable = await this.hasPermission(principal.role, 'finance:payable:view-sensitive');
    const canViewProfit = await this.hasPermission(principal.role, 'finance:payable:view-profit');
    const current = await this.findPayableFinanceItemById(id);
    this.ensurePayableAuditEditable(current);
    const [pendingPaymentCount, paymentItemCount] = await Promise.all([
      (this.prisma as any).payablePaymentApplication.count({ where: { payableFinanceItemId: id } }),
      (this.prisma as any).paymentApplicationItem.count({ where: { payableFinanceItemId: id } })
    ]);
    const billVoucher = await (this.prisma as any).paymentVoucher.findFirst({
      where: {
        voucherType: { not: 'PAYMENT_RECEIPT' },
        OR: [
          { payableFinanceItemId: id },
          ...(pendingPaymentCount ? [{ pendingPaymentId: { in: (await (this.prisma as any).payablePaymentApplication.findMany({ where: { payableFinanceItemId: id }, select: { id: true } })).map((row: { id: string }) => row.id) } }] : [])
        ]
      },
      select: { id: true }
    });
    if (pendingPaymentCount || paymentItemCount || billVoucher) {
      throw new BadRequestException('该应付已被付款申请、付款记录或凭证引用，不能删除');
    }
    await (this.prisma as any).shipmentFinanceItem.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.payable.delete', target: id, before: current, after: { hardDelete: true } }
    });
    return this.toPayableAuditSummary(current, { canViewSensitivePayable, canViewProfit });
  }

  async batchAuditPayableAudits(principal: Principal, input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    await this.ensurePayablePermission(principal, 'finance:payable:audit');
    const result = await this.runPayableBatch(input.ids ?? [], (id) => this.auditPayableAudit(principal, id));
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payable.batch_audit', target: `payables:${(input.ids ?? []).join(',')}`, after: JSON.parse(JSON.stringify(result)) } });
    return result;
  }

  async batchReverseAuditPayableAudits(principal: Principal, input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    await this.ensurePayablePermission(principal, 'finance:payable:reverse');
    const result = await this.runPayableBatch(input.ids ?? [], (id) => this.reverseAuditPayableAudit(principal, id));
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payable.batch_reverse_audit', target: `payables:${(input.ids ?? []).join(',')}`, after: JSON.parse(JSON.stringify(result)) } });
    return result;
  }

  async batchVoidPayableAudits(principal: Principal, input: PayableAuditBatchInput): Promise<PayableAuditBatchResult> {
    await this.ensurePayablePermission(principal, 'finance:payable:void');
    const result = await this.runPayableBatch(input.ids ?? [], (id) => this.deletePayableAudit(principal, id));
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payable.batch_delete', target: `payables:${(input.ids ?? []).join(',')}`, after: JSON.parse(JSON.stringify(result)) } });
    return result;
  }

  async exportPayableAudits(principal: Principal, input: PayableAuditExportRequest): Promise<PayableAuditExportResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:export');
    const response = await this.getPayableAudits(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.payable.export', target: `payables:${input.ids?.join(',') ?? 'query'}`, after: JSON.parse(JSON.stringify({ count: rows.length, query: input.query })) }
    });
    return {
      rows,
      exportedAt: new Date().toISOString()
    };
  }

  async getPendingPayments(principal: Principal, query: PendingPaymentListQuery = {}): Promise<PendingPaymentListResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:payment');
    const rows = await (this.prisma as any).payablePaymentApplication.findMany({
      include: this.payablePaymentApplicationInclude(),
      orderBy: { createdAt: 'desc' }
    });
    const visibleRows = [];
    for (const row of rows) {
      if (await this.canExposePendingPaymentToFinance(row)) visibleRows.push(row);
    }
    const vouchers = await (this.prisma as any).paymentVoucher.findMany({
      where: { pendingPaymentId: { in: visibleRows.map((row: any) => row.id) } },
      orderBy: { createdAt: 'desc' }
    });
    const mapped = visibleRows.map((row: any) => this.toPendingPaymentSummary(row, vouchers.filter((item: any) => item.pendingPaymentId === row.id)));
    return this.buildPendingPaymentListResponse(mapped, query);
  }

  async getPayeeBankAccounts(principal: Principal, query: { agentName?: string; agentId?: string; currency?: 'RMB' | 'USD' } = {}): Promise<PayeeBankAccountSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    const rows = await (this.prisma as any).payeeBankAccount.findMany({
      where: {
        enabled: true,
        ...(query.agentId ? { agentId: query.agentId } : {}),
        ...(query.agentName ? { agentName: { contains: query.agentName, mode: 'insensitive' } } : {}),
        ...(query.currency ? { currency: query.currency } : {})
      },
      orderBy: { updatedAt: 'desc' }
    });
    return rows.map((row: any) => this.toPayeeBankAccountSummary(row));
  }

  async upsertPayeeBankAccount(principal: Principal, input: PayeeBankAccountInput): Promise<PayeeBankAccountSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    const currency = this.normalizePaymentCurrency(input.currency);
    const data = {
      agentId: input.agentId,
      agentName: input.agentName.trim(),
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      bankAccountNo: input.bankAccountNo.trim(),
      currency,
      remark: input.remark,
      enabled: true
    };
    if (!data.agentName || !data.accountName || !data.bankName || !data.bankAccountNo) {
      throw new BadRequestException('收款方、户名、银行和账号不能为空');
    }
    const created = await (this.prisma as any).payeeBankAccount.create({ data });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment.bank.save', target: created.id, after: toAuditJson({ ...created, bankAccountNo: this.maskBankAccountNo(created.bankAccountNo, false) }) } });
    return this.toPayeeBankAccountSummary(created);
  }

  private async createTransientPayeeBankAccount(principal: Principal, input: PayeeBankAccountInput): Promise<PayeeBankAccountSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    const currency = this.normalizePaymentCurrency(input.currency);
    const data = {
      agentId: input.agentId,
      agentName: input.agentName.trim(),
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      bankAccountNo: input.bankAccountNo.trim(),
      currency,
      remark: input.remark,
      enabled: false
    };
    if (!data.agentName || !data.accountName || !data.bankName || !data.bankAccountNo) {
      throw new BadRequestException('收款方、户名、银行和账号不能为空');
    }
    const created = await (this.prisma as any).payeeBankAccount.create({ data });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment.bank.use_once', target: created.id, after: toAuditJson({ ...created, bankAccountNo: this.maskBankAccountNo(created.bankAccountNo, false) }) } });
    return this.toPayeeBankAccountSummary(created);
  }

  async createPaymentApplications(principal: Principal, input: PaymentApplicationCreateInput): Promise<PaymentApplicationSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:payment');
    const ids = Array.from(new Set(input.pendingPaymentIds ?? []));
    if (!ids.length) throw new BadRequestException('请选择待付款记录');
    const pendingRows = await (this.prisma as any).payablePaymentApplication.findMany({
      where: { id: { in: ids } },
      include: this.payablePaymentApplicationInclude()
    });
    if (pendingRows.length !== ids.length) throw new BadRequestException('部分待付款记录不存在');
    let selectedBank: any | undefined;
    if (input.bankAccountId) {
      selectedBank = await (this.prisma as any).payeeBankAccount.findUnique({ where: { id: input.bankAccountId } });
      if (!selectedBank) throw new BadRequestException('收款银行不存在');
    } else if (input.manualBankAccount) {
      selectedBank = input.saveManualBankAccount === false
        ? await this.createTransientPayeeBankAccount(principal, input.manualBankAccount)
        : await this.upsertPayeeBankAccount(principal, input.manualBankAccount);
    }
    const groups = new Map<string, any[]>();
    for (const row of pendingRows) {
      await this.ensurePendingPaymentReadyForFinance(row);
      const summary = this.toPendingPaymentSummary(row);
      if (summary.status === 'INVALIDATED' || summary.status === 'PAID') throw new BadRequestException('已失效或已支付记录不能提交付款申请');
      if (summary.status === 'APPLIED') throw new BadRequestException('已申请付款记录不能重复提交');
      const bank = selectedBank ?? row.payeeBankAccount;
      if (!bank) throw new BadRequestException('请先补齐收款银行信息');
      this.assertPayeeBankMatchesPending(bank, [summary]);
      const bankSummary = this.toPayeeBankAccountSummary(bank);
      const payeeName = summary.agentName?.trim() || bankSummary.agentName || '未指定代理';
      const key = `${payeeName}|${bankSummary.bankAccountNo}|${summary.currency}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    if (groups.size > 1) {
      throw new BadRequestException('当前选择跨收款方、银行账号或币种，请分组提交');
    }
    for (const rows of groups.values()) {
      const hasApplicationVoucher = Boolean(input.voucher?.fileName?.trim());
      const pendingVoucherCount = hasApplicationVoucher ? rows.length : await (this.prisma as any).paymentVoucher.count({
        where: {
          pendingPaymentId: { in: rows.map((row: any) => row.id) },
          voucherType: { not: 'PAYMENT_RECEIPT' }
        }
      });
      if (pendingVoucherCount < rows.length) {
        throw new BadRequestException('请上传供应商账单截图');
      }
    }
    if (input.bankAccountId && selectedBank) {
      const bankSummary = this.toPayeeBankAccountSummary(selectedBank);
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'finance.payment.bank.select',
          target: bankSummary.id,
          after: toAuditJson({
            bankAccountId: bankSummary.id,
            agentName: bankSummary.agentName,
            accountName: bankSummary.accountName,
            bankName: bankSummary.bankName,
            bankAccountNo: this.maskBankAccountNo(bankSummary.bankAccountNo, false),
            currency: bankSummary.currency,
            pendingPaymentIds: ids
          })
        }
      });
    }
    const created: PaymentApplicationSummary[] = [];
    for (const rows of groups.values()) {
      const first = this.toPendingPaymentSummary(rows[0]);
      const bank = selectedBank ?? rows[0].payeeBankAccount;
      const bankSummary = bank ? this.toPayeeBankAccountSummary(bank) : undefined;
      const payeeName = first.agentName?.trim() || bankSummary?.agentName || '未指定代理';
      const totalAmount = rows.reduce((sum: number, row: any) => sum + Number(row.amount), 0);
      const applicationNo = await this.nextPaymentApplicationNo();
      const application = await (this.prisma as any).paymentApplication.create({
        data: {
          applicationNo,
          agentName: payeeName,
          currency: first.currency,
          totalAmount,
          status: 'WAITING_PAYMENT',
          payeeBankAccountId: bank?.id,
          remark: input.remark,
          appliedBy: principal.username,
          items: {
            create: rows.map((row: any) => ({
              payablePaymentApplicationId: row.id,
              payableFinanceItemId: row.payableFinanceItemId,
              shipmentId: row.shipmentId,
              amount: row.amount,
              currency: row.currency ?? 'RMB'
            }))
          },
          ...(input.voucher?.fileName ? {
            vouchers: {
              create: [{
                voucherType: input.voucher.voucherType ?? 'BILL',
                fileName: input.voucher.fileName.trim(),
                mimeType: input.voucher.mimeType,
                sizeBytes: input.voucher.sizeBytes,
                url: input.voucher.url,
                uploadedBy: principal.username
              }]
            }
          } : {})
        },
        include: this.paymentApplicationInclude()
      });
      await (this.prisma as any).payablePaymentApplication.updateMany({
        where: { id: { in: rows.map((row: any) => row.id) } },
        data: {
          status: 'APPLIED',
          applicationStatus: 'APPLIED',
          payeeBankAccountId: bank?.id,
          appliedAt: application.appliedAt,
          remark: input.remark
        }
      });
      const [enriched] = await this.withPendingBillVouchers([application]);
      const summary = this.toPaymentApplicationSummary(enriched);
      await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment_application.create', target: application.id, after: toAuditJson(this.toPaymentApplicationAuditSnapshot(summary)) } });
      void this.lineage?.recordEvent('finance.payment_applications.create', {
        actorUsername: principal.username,
        businessId: summary.id,
        payload: {
          paymentApplicationId: summary.id,
          applicationNo: summary.applicationNo,
          agentName: summary.agentName,
          currency: summary.currency,
          totalAmount: summary.totalAmount,
          status: summary.status,
          appliedBy: summary.appliedBy,
          appliedAt: summary.appliedAt,
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
        metrics: { totalAmount: summary.totalAmount, itemCount: summary.items.length, currency: summary.currency }
      });
      created.push(summary);
    }
    return created;
  }

  async updatePaymentApplication(principal: Principal, id: string, input: PaymentApplicationUpdateInput): Promise<PaymentApplicationSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:payment');
    const current = await this.findPaymentApplicationById(id);
    if (current.status !== 'WAITING_PAYMENT') throw new BadRequestException('只有待支付申请可以修改');
    let bankAccountId = input.bankAccountId ?? current.payeeBankAccountId;
    let selectedBank: PayeeBankAccountSummary | undefined;
    if (input.bankAccountId) {
      selectedBank = await (this.prisma as any).payeeBankAccount.findUnique({ where: { id: input.bankAccountId } });
      if (!selectedBank) throw new BadRequestException('收款银行不存在');
    } else if (input.manualBankAccount) {
      const saved = input.saveManualBankAccount === false
        ? await this.createTransientPayeeBankAccount(principal, input.manualBankAccount)
        : await this.upsertPayeeBankAccount(principal, input.manualBankAccount);
      bankAccountId = saved.id;
      selectedBank = saved;
    } else if (bankAccountId) {
      selectedBank = current.bankAccount ? this.toPayeeBankAccountSummary(current.bankAccount) : undefined;
    }
    this.assertPayeeBankMatchesPending(selectedBank, (current.items ?? []).map((item: any) => this.toPendingPaymentSummary(item.payablePaymentApplication)));
    const updated = await (this.prisma as any).paymentApplication.update({
      where: { id },
      data: {
        payeeBankAccountId: bankAccountId,
        remark: input.remark ?? current.remark,
        ...(input.voucher?.fileName ? {
          vouchers: {
            create: [{
              voucherType: input.voucher.voucherType ?? 'BILL',
              fileName: input.voucher.fileName.trim(),
              mimeType: input.voucher.mimeType,
              sizeBytes: input.voucher.sizeBytes,
              url: input.voucher.url,
              uploadedBy: principal.username
            }]
          }
        } : {})
      },
      include: this.paymentApplicationInclude()
    });
    const [enriched] = await this.withPendingBillVouchers([updated]);
    const summary = this.toPaymentApplicationSummary(enriched);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment_application.update', target: id, before: current, after: toAuditJson(this.toPaymentApplicationAuditSnapshot(summary)) } });
    return summary;
  }

  async cancelPaymentApplication(principal: Principal, id: string, input: PaymentApplicationCancelInput = {}): Promise<PaymentApplicationSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:payment');
    const current = await this.findPaymentApplicationById(id);
    if (current.status !== 'WAITING_PAYMENT') throw new BadRequestException('只有待支付申请可以撤回');
    const canceled = await (this.prisma as any).paymentApplication.update({
      where: { id },
      data: { status: 'CANCELED', canceledAt: new Date(), cancelReason: input.reason },
      include: this.paymentApplicationInclude()
    });
    await (this.prisma as any).payablePaymentApplication.updateMany({
      where: { paymentApplicationItem: { paymentApplicationId: id } },
      data: { status: 'READY', applicationStatus: 'PENDING', appliedAt: null }
    });
    const [enriched] = await this.withPendingBillVouchers([canceled]);
    const summary = this.toPaymentApplicationSummary(enriched);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment_application.cancel', target: id, before: current, after: toAuditJson(this.toPaymentApplicationAuditSnapshot(summary, current.status, 'CANCELED', principal.username)) } });
    await (this.prisma as any).paymentApplicationItem.deleteMany({ where: { paymentApplicationId: id } });
    return summary;
  }

  async exportPaymentApplications(principal: Principal, input: PaymentApplicationExportRequest): Promise<PaymentApplicationExportResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:export');
    const response = await this.getPendingPayments(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const rows = input.ids?.length ? response.rows.filter((row) => input.ids?.includes(row.id)) : response.rows;
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment_application.export', target: input.ids?.join(',') ?? 'query', after: JSON.parse(JSON.stringify({ count: rows.length, query: input.query })) } });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async addPaymentVoucher(principal: Principal, input: PaymentVoucherInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:attachment');
    if (!input.fileName?.trim()) throw new BadRequestException('凭证文件名不能为空');
    if (!input.paymentApplicationId && !input.pendingPaymentId) throw new BadRequestException('凭证必须关联待付款或付款申请');
    if (input.billAmount !== undefined && input.billAmount < 0) throw new BadRequestException('账单金额不能小于 0');
    if (input.extraFeeAmount !== undefined && input.extraFeeAmount < 0) throw new BadRequestException('杂费金额不能小于 0');
    if (input.kuayueAmount !== undefined && input.kuayueAmount < 0) throw new BadRequestException('跨越账单金额不能小于 0');
    const billDate = input.billDate ? new Date(input.billDate) : undefined;
    if (billDate && Number.isNaN(billDate.getTime())) throw new BadRequestException('账单日期无效');
    const extraFeeOccurredAt = input.extraFeeOccurredAt ? new Date(input.extraFeeOccurredAt) : undefined;
    if (extraFeeOccurredAt && Number.isNaN(extraFeeOccurredAt.getTime())) throw new BadRequestException('杂费发生日期无效');
    const kuayueBillDate = input.kuayueBillDate ? new Date(input.kuayueBillDate) : undefined;
    if (kuayueBillDate && Number.isNaN(kuayueBillDate.getTime())) throw new BadRequestException('跨越账单日期无效');
    const created = await (this.prisma as any).paymentVoucher.create({
      data: {
        paymentApplicationId: input.paymentApplicationId,
        pendingPaymentId: input.pendingPaymentId,
        voucherType: input.voucherType ?? 'BILL',
        billNo: input.billNo?.trim() || undefined,
        transferNo: input.transferNo?.trim() || undefined,
        agentName: input.agentName?.trim() || undefined,
        billDate,
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
        extraFeeOccurredAt,
        extraFeeFinanceItemId: input.extraFeeFinanceItemId?.trim() || undefined,
        extraFeeRemark: input.extraFeeRemark?.trim() || undefined,
        kuayueBillNo: input.kuayueBillNo?.trim() || undefined,
        kuayueCustomerCode: input.kuayueCustomerCode?.trim() || undefined,
        kuayueSystemOrderNo: input.kuayueSystemOrderNo?.trim() || undefined,
        kuayueAmount: input.kuayueAmount,
        kuayueCurrency: input.kuayueCurrency,
        kuayueBillDate,
        kuayueStatus: input.kuayueStatus,
        fileName: input.fileName.trim(),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        url: input.url,
        uploadedBy: principal.username
      }
    });
    const pending = input.pendingPaymentId
      ? await (this.prisma as any).payablePaymentApplication.findUnique({ where: { id: input.pendingPaymentId }, include: this.payablePaymentApplicationInclude() })
      : undefined;
    if (input.pendingPaymentId) {
      await (this.prisma as any).payablePaymentApplication.updateMany({
        where: { id: input.pendingPaymentId, payeeBankAccountId: { not: null }, status: 'PENDING' },
        data: { status: 'READY' }
      });
    }
    const application = input.paymentApplicationId
      ? await (this.prisma as any).paymentApplication.findUnique({ where: { id: input.paymentApplicationId }, include: this.paymentApplicationInclude() })
      : undefined;
    const summary = this.toPaymentVoucherSummary(created, pending, application);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment_voucher.add', target: created.id, after: toAuditJson(summary) } });
    if (summary.extraFeeType) await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment_voucher.extra_fee.add', target: created.id, after: toAuditJson(summary) } });
    if (summary.kuayueBillNo) await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment_voucher.kuayue.add', target: created.id, after: toAuditJson(summary) } });
    return summary;
  }

  async getPaymentVouchers(principal: Principal, query: PaymentVoucherListQuery = {}): Promise<PaymentVoucherSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:read');
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Number(query.pageSize ?? 50));
    const rows = await (this.prisma as any).paymentVoucher.findMany({
      where: {
        voucherType: 'BILL',
        ...(query.billNo?.trim() ? { billNo: { contains: query.billNo.trim(), mode: 'insensitive' } } : {}),
        ...(query.agentName?.trim() ? { agentName: { contains: query.agentName.trim(), mode: 'insensitive' } } : {}),
        ...(query.currency && query.currency !== 'ALL' ? { currency: query.currency } : {}),
        ...(query.status && query.status !== 'ALL' ? { status: query.status } : {})
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
    const pendingIds = rows.map((row: any) => row.pendingPaymentId).filter(Boolean);
    const applicationIds = rows.map((row: any) => row.paymentApplicationId).filter(Boolean);
    const pendingRows = pendingIds.length
      ? await (this.prisma as any).payablePaymentApplication.findMany({
        where: { id: { in: pendingIds } },
        include: this.payablePaymentApplicationInclude()
      })
      : [];
    const applications = applicationIds.length
      ? await (this.prisma as any).paymentApplication.findMany({
        where: { id: { in: applicationIds } },
        include: this.paymentApplicationInclude()
      })
      : [];
    const pendingById = new Map(pendingRows.map((row: any) => [row.id, row]));
    const applicationById = new Map(applications.map((row: any) => [row.id, row]));
    return rows.map((row: any) => this.toPaymentVoucherSummary(row, pendingById.get(row.pendingPaymentId), applicationById.get(row.paymentApplicationId)));
  }

  async updatePaymentVoucherDifference(principal: Principal, id: string, input: PaymentVoucherDifferenceInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:attachment');
    if (input.differenceAmount !== undefined && input.differenceAmount < 0) throw new BadRequestException('差异金额不能小于 0');
    const current = await (this.prisma as any).paymentVoucher.findFirst({ where: { id, voucherType: 'BILL' } });
    if (!current) throw new NotFoundException('代理账单不存在');
    const handled = input.differenceStatus === 'HANDLED';
    const updated = await (this.prisma as any).paymentVoucher.update({
      where: { id },
      data: {
        differenceType: input.differenceType?.trim() || current.differenceType,
        differenceAmount: input.differenceAmount ?? current.differenceAmount,
        differenceReason: input.differenceReason?.trim() || current.differenceReason,
        differenceStatus: input.differenceStatus,
        status: handled ? 'DIFFERENCE_HANDLED' : 'DIFFERENCE_PENDING',
        differenceHandledBy: handled ? principal.username : null,
        differenceHandledAt: handled ? new Date() : null
      }
    });
    const before = this.toPaymentVoucherSummary(current);
    const after = this.toPaymentVoucherSummary(updated);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: handled ? 'finance.payment_voucher.difference.handle' : 'finance.payment_voucher.difference.mark', target: id, before: toAuditJson(before), after: toAuditJson(after) } });
    return after;
  }

  async updatePaymentVoucherArchive(principal: Principal, id: string, input: PaymentVoucherArchiveInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:attachment');
    const current = await (this.prisma as any).paymentVoucher.findFirst({ where: { id, voucherType: 'BILL' } });
    if (!current) throw new NotFoundException('代理账单不存在');
    const updated = await (this.prisma as any).paymentVoucher.update({
      where: { id },
      data: { status: input.archived ? 'ARCHIVED' : 'MATCHED' }
    });
    const before = this.toPaymentVoucherSummary(current);
    const after = { ...this.toPaymentVoucherSummary(updated), archiveReason: input.reason?.trim() || undefined };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: input.archived ? 'finance.payment_voucher.archive' : 'finance.payment_voucher.unarchive', target: id, before: toAuditJson(before), after: toAuditJson(after) } });
    return this.toPaymentVoucherSummary(updated);
  }

  async getPaidPayments(principal: Principal, query: PaidPaymentListQuery = {}): Promise<PaidPaymentListResponse> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:read');
    const canViewBank = await this.hasPermission(principal.role, 'finance:paid-payment:bank-view');
    const applications = await (this.prisma as any).paymentApplication.findMany({
      where: { status: query.status && query.status !== 'ALL' ? query.status : { in: ['WAITING_PAYMENT', 'PAID'] } },
      include: this.paymentApplicationInclude(),
      orderBy: [{ paidAt: 'desc' }, { appliedAt: 'desc' }]
    });
    const enriched = await this.withPendingBillVouchers(applications);
    const rows = enriched.map((row: any) => this.toPaidPaymentSummary(row, canViewBank));
    return this.buildPaidPaymentListResponse(rows, query);
  }

  async confirmPaymentApplicationPaid(principal: Principal, id: string, input: PaymentConfirmPaidInput): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:confirm');
    if (!input.payerBankName?.trim()) throw new BadRequestException('付款方银行不能为空');
    if (!input.payerBankAccountNo?.trim()) throw new BadRequestException('付款方账号不能为空');
    if (!input.paidAt) throw new BadRequestException('付款日期不能为空');
    const current = await this.findPaymentApplicationById(id);
    if (current.status !== 'WAITING_PAYMENT') throw new BadRequestException('只有待支付申请可以确认付款');
    const updated = await (this.prisma as any).paymentApplication.update({
      where: { id },
      data: {
        status: 'PAID',
        payerBankName: input.payerBankName.trim(),
        payerBankAccountName: input.payerBankAccountName?.trim(),
        payerBankAccountNo: input.payerBankAccountNo?.trim(),
        paidAt: new Date(input.paidAt),
        paidBy: principal.username,
        paidRemark: input.paidRemark,
        ...(input.waterReceipt?.fileName ? {
          vouchers: {
            create: [{
              voucherType: 'PAYMENT_RECEIPT',
              fileName: input.waterReceipt.fileName.trim(),
              mimeType: input.waterReceipt.mimeType,
              sizeBytes: input.waterReceipt.sizeBytes,
              url: input.waterReceipt.url,
              uploadedBy: principal.username
            }]
          }
        } : {})
      },
      include: this.paymentApplicationInclude()
    });
    const createdWaterReceipt = input.waterReceipt?.fileName
      ? [...(updated.vouchers ?? [])]
        .filter((voucher: any) => voucher.voucherType === 'PAYMENT_RECEIPT' && voucher.fileName === input.waterReceipt?.fileName?.trim())
        .sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
      : undefined;
    const pendingIds = (current.items ?? []).map((item: any) => item.payablePaymentApplicationId);
    const payableIds = (current.items ?? []).map((item: any) => item.payableFinanceItemId);
    await (this.prisma as any).payablePaymentApplication.updateMany({
      where: { id: { in: pendingIds } },
      data: { status: 'PAID', applicationStatus: 'PAID', paymentNo: current.applicationNo }
    });
    await (this.prisma as any).shipmentFinanceItem.updateMany({
      where: { id: { in: payableIds }, type: 'PAYABLE' },
      data: { locked: true, paymentNo: current.applicationNo }
    });
    const [enriched] = await this.withPendingBillVouchers([updated]);
    const summary = this.toPaidPaymentSummary(enriched, true);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.paid_payment.confirm', target: id, before: current, after: toAuditJson(this.toPaidPaymentAuditSnapshot(summary, current.status, 'PAID')) } });
    if (createdWaterReceipt) await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.paid_payment.water_receipt.add', target: createdWaterReceipt.id, after: toAuditJson(this.toPaidPaymentVoucherAuditSnapshot(this.toPaymentVoucherSummary(createdWaterReceipt), summary)) } });
    void this.lineage?.recordEvent('finance.paid_verification.confirm', {
      actorUsername: principal.username,
      businessId: summary.id,
      payload: {
        paymentApplicationId: summary.id,
        applicationNo: summary.applicationNo,
        totalAmount: summary.totalAmount,
        currency: summary.currency,
        statusFrom: current.status,
        statusTo: 'PAID',
        paidBy: principal.username,
        paidAt: summary.paidAt,
        itemCount: summary.items.length,
        items: summary.items.map((item) => ({
          pendingPaymentId: item.pendingPaymentId,
          payableFinanceItemId: item.payableFinanceItemId,
          shipmentId: item.shipmentId,
          amount: item.amount,
          currency: item.currency
        })),
        waterReceiptVoucherId: createdWaterReceipt?.id
      },
      sourceRefs: [
        { nodeType: 'payment_application', id: summary.id },
        ...summary.items.map((item) => ({ nodeType: 'pending_payment', id: item.pendingPaymentId })),
        ...summary.items.map((item) => ({ nodeType: 'payable_finance_item', id: item.payableFinanceItemId })),
        ...summary.items.map((item) => ({ nodeType: 'shipment', id: item.shipmentId })),
        ...(createdWaterReceipt ? [{ nodeType: 'payment_voucher', id: createdWaterReceipt.id }] : [])
      ],
      metrics: { totalAmount: summary.totalAmount, itemCount: summary.items.length, currency: summary.currency }
    });
    return this.toPaidPaymentSummary(enriched, await this.hasPermission(principal.role, 'finance:paid-payment:bank-view'));
  }

  async updatePaidPayment(principal: Principal, id: string, input: PaidPaymentUpdateInput): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:confirm');
    const current = await this.findPaymentApplicationById(id);
    if (current.status !== 'PAID') throw new BadRequestException('只有已支付记录可以补充信息');
    const updated = await (this.prisma as any).paymentApplication.update({
      where: { id },
      data: {
        paidRemark: input.paidRemark ?? current.paidRemark,
        ...(input.waterReceipt?.fileName ? {
          vouchers: {
            create: [{
              voucherType: 'PAYMENT_RECEIPT',
              fileName: input.waterReceipt.fileName.trim(),
              mimeType: input.waterReceipt.mimeType,
              sizeBytes: input.waterReceipt.sizeBytes,
              url: input.waterReceipt.url,
              uploadedBy: principal.username
            }]
          }
        } : {})
      },
      include: this.paymentApplicationInclude()
    });
    const createdWaterReceipt = input.waterReceipt?.fileName
      ? [...(updated.vouchers ?? [])]
        .filter((voucher: any) => voucher.voucherType === 'PAYMENT_RECEIPT' && voucher.fileName === input.waterReceipt?.fileName?.trim())
        .sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
      : undefined;
    const [enriched] = await this.withPendingBillVouchers([updated]);
    const summary = this.toPaidPaymentSummary(enriched, true);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.paid_payment.update', target: id, before: current, after: toAuditJson(this.toPaidPaymentAuditSnapshot(summary, current.status, updated.status)) } });
    if (createdWaterReceipt) await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.paid_payment.water_receipt.add', target: createdWaterReceipt.id, after: toAuditJson(this.toPaidPaymentVoucherAuditSnapshot(this.toPaymentVoucherSummary(createdWaterReceipt), summary)) } });
    return this.toPaidPaymentSummary(enriched, await this.hasPermission(principal.role, 'finance:paid-payment:bank-view'));
  }

  async reversePaidPayment(principal: Principal, id: string, input: PaidPaymentReverseInput = {}): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:reverse');
    const current = await this.findPaymentApplicationById(id);
    if (current.status !== 'PAID') throw new BadRequestException('只有已支付记录可以反核销');
    const updated = await (this.prisma as any).paymentApplication.update({
      where: { id },
      data: {
        status: 'WAITING_PAYMENT',
        reversedAt: new Date(),
        reversedBy: principal.username,
        reverseReason: input.reason,
        paidAt: null,
        paidBy: null,
        paidRemark: null,
        payerBankName: null,
        payerBankAccountName: null,
        payerBankAccountNo: null
      },
      include: this.paymentApplicationInclude()
    });
    const pendingIds = (current.items ?? []).map((item: any) => item.payablePaymentApplicationId);
    const payableIds = (current.items ?? []).map((item: any) => item.payableFinanceItemId);
    await (this.prisma as any).payablePaymentApplication.updateMany({
      where: { id: { in: pendingIds } },
      data: { status: 'APPLIED', applicationStatus: 'APPLIED', paymentNo: null }
    });
    await (this.prisma as any).shipmentFinanceItem.updateMany({
      where: { id: { in: payableIds }, type: 'PAYABLE' },
      data: { paymentNo: null }
    });
    const [enriched] = await this.withPendingBillVouchers([updated]);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.paid_payment.reverse', target: id, before: current, after: toAuditJson(this.toPaidPaymentAuditSnapshot(this.toPaidPaymentSummary(enriched, true), current.status, 'WAITING_PAYMENT', principal.username, updated.reversedAt?.toISOString?.() ?? updated.reversedAt)) } });
    return this.toPaidPaymentSummary(enriched, await this.hasPermission(principal.role, 'finance:paid-payment:bank-view'));
  }

  async exportPaidPayments(principal: Principal, input: PaidPaymentExportRequest): Promise<PaidPaymentExportResponse> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:export');
    const response = await this.getPaidPayments(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const allRows = response.rows;
    const rows = input.ids?.length ? allRows.filter((row) => input.ids?.includes(row.id)) : allRows;
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.paid_payment.export', target: input.ids?.join(',') ?? 'query', after: JSON.parse(JSON.stringify({ count: rows.length, query: input.query })) } });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async addPaymentWaterReceipt(principal: Principal, input: PaymentWaterReceiptInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:paid-payment:voucher-upload');
    if (!input.fileName?.trim()) throw new BadRequestException('水单文件名不能为空');
    const application = await this.findPaymentApplicationById(input.paymentApplicationId);
    if (application.status !== 'PAID') throw new BadRequestException('只有已支付记录可以上传水单');
    const created = await (this.prisma as any).paymentVoucher.create({
      data: {
        paymentApplicationId: input.paymentApplicationId,
        voucherType: 'PAYMENT_RECEIPT',
        fileName: input.fileName.trim(),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        url: input.url,
        uploadedBy: principal.username
      }
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.paid_payment.water_receipt.add', target: created.id, after: toAuditJson(this.toPaidPaymentVoucherAuditSnapshot(this.toPaymentVoucherSummary(created), this.toPaidPaymentSummary(application, true))) } });
    return this.toPaymentVoucherSummary(created);
  }

  async getAgentBankAccounts(principal: Principal, query: { agentName?: string; agentId?: string; includeDisabled?: boolean | string } = {}): Promise<AgentBankAccountSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    const includeDisabled = query.includeDisabled === true || query.includeDisabled === 'true';
    const rows = await (this.prisma as any).agentBankAccount.findMany({
      where: {
        ...(includeDisabled ? {} : { enabled: true }),
        ...(query.agentId ? { agentId: query.agentId } : {}),
        ...(query.agentName ? { agentName: { contains: query.agentName, mode: 'insensitive' } } : {})
      },
      orderBy: { updatedAt: 'desc' }
    });
    return rows.map((row: any) => this.toAgentBankAccountSummary(row));
  }

  async upsertAgentBankAccount(principal: Principal, input: AgentBankAccountInput): Promise<AgentBankAccountSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    const data = {
      agentId: input.agentId,
      agentName: input.agentName.trim(),
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      bankAccountNo: input.bankAccountNo.trim(),
      currency: input.currency ?? 'RMB',
      remark: input.remark,
      enabled: input.enabled ?? true
    };
    if (!data.agentName || !data.accountName || !data.bankName || !data.bankAccountNo) {
      throw new BadRequestException('代理、户名、银行和账号不能为空');
    }
    const before = input.id ? await (this.prisma as any).agentBankAccount.findUnique({ where: { id: input.id } }) : null;
    const saved = input.id
      ? await (this.prisma as any).agentBankAccount.update({ where: { id: input.id }, data })
      : await (this.prisma as any).agentBankAccount.create({ data });
    const payee = await (this.prisma as any).payeeBankAccount.findFirst({
      where: {
        OR: [
          ...(saved.agentId ? [{ agentId: saved.agentId, bankAccountNo: saved.bankAccountNo }] : []),
          { agentName: { contains: saved.agentName, mode: 'insensitive' }, bankAccountNo: saved.bankAccountNo }
        ]
      }
    });
    const payeeData = {
      agentId: saved.agentId,
      agentName: saved.agentName,
      accountName: saved.accountName,
      bankName: saved.bankName,
      bankAccountNo: saved.bankAccountNo,
      currency: saved.currency === 'USD' ? 'USD' : 'RMB',
      remark: saved.remark,
      enabled: saved.enabled
    };
    if (payee) {
      await (this.prisma as any).payeeBankAccount.update({ where: { id: payee.id }, data: payeeData });
    } else {
      await (this.prisma as any).payeeBankAccount.create({ data: payeeData });
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'finance.payable.bank.save',
        target: saved.id,
        before: before ? toAuditJson({ ...before, bankAccountNo: this.maskBankAccountNo(before.bankAccountNo, false) }) : undefined,
        after: toAuditJson({ ...saved, bankAccountNo: this.maskBankAccountNo(saved.bankAccountNo, false) })
      }
    });
    return this.toAgentBankAccountSummary(saved);
  }

  async getShipmentFinanceDetail(principal: Principal, shipmentId: string, options: { includeDeleted?: boolean } = {}): Promise<ShipmentFinanceDetailSummary> {
    const canViewFinanceDetail = ['ADMIN', 'FINANCE', 'UG_FINANCE', 'OPERATOR', 'UG_BUSINESS', 'UG_MARKET', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role);
    if (!canViewFinanceDetail) {
      await this.recordPermissionDenied(principal, { permissions: ['finance:order-fee:payable:view'], method: 'GET', path: `/api/shipments/${shipmentId}/finance-detail` });
      throw new ForbiddenException('当前角色不能查看单票费用明细');
    }

    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
      },
      include: {
        customer: true,
        agent: true,
        receivableFees: { orderBy: { id: 'asc' } },
        payableFees: { orderBy: { id: 'asc' } },
        financeItems: { where: { voided: false }, orderBy: { createdAt: 'asc' } }
      }
    });
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }

    const customerName = `${shipment.customer.code}-${shipment.customer.name}`;
    const agentName = shipment.agent?.name ?? undefined;
    const receivables: ReceivableFeeSummary[] = shipment.receivableFees.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: shipment.systemOrderNo,
      customerName,
      name: row.name,
      amount: Number(row.amount),
      settled: row.settled,
      type: 'RECEIVABLE',
      currency: (row as any).currency ?? 'RMB',
      settlementMethod: this.resolveReceivableSettlementMethod({ ...shipment, settlementMethod: (row as any).settlementMethod }),
      paymentNo: (row as any).paymentNo ?? undefined,
      reconciliationStatus: ((row as any).reconciliationStatus ?? 'PENDING') as any,
      createdAt: (row as any).createdAt?.toISOString?.() ?? (row as any).createdAt ?? undefined,
      createdBy: (row as any).createdBy ?? undefined,
      reviewedAt: (row as any).reviewedAt?.toISOString?.() ?? (row as any).reviewedAt ?? undefined,
      reviewedBy: (row as any).reviewedBy ?? undefined,
      remark: (row as any).remark ?? undefined,
      locked: (row as any).reconciliationStatus === 'CONFIRMED',
      voided: (row as any).voided ?? false,
      sourceType: 'SYSTEM'
    }));
    const payables: PayableFeeSummary[] = shipment.payableFees.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      name: row.name,
      amount: Number(row.amount),
      settled: row.settled,
      agentName,
      type: 'PAYABLE',
      currency: 'RMB',
      reconciliationStatus: row.settled ? 'CONFIRMED' : 'PENDING',
      sourceType: 'SYSTEM'
    }));
    const businessCosts: NonNullable<ShipmentFinanceDetailSummary['businessCosts']> = shipment.payableFees.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      name: row.name === '代理运费' ? '运费成本' : row.name,
      amount: Number(row.amount),
      settled: row.settled,
      type: 'BUSINESS_COST' as const,
      currency: 'RMB',
      reconciliationStatus: row.settled ? 'CONFIRMED' as const : 'PENDING' as const,
      sourceType: 'SYSTEM' as const
    }));
    const manualItems = ((shipment as any).financeItems ?? []) as any[];
    receivables.push(...manualItems
      .filter((row) => row.type === 'RECEIVABLE')
      .map((row) => this.toReceivableFinanceSummary(row, shipment, customerName)));
    payables.push(...manualItems
      .filter((row) => row.type === 'PAYABLE')
      .map((row) => this.toPayableFinanceSummary(row, shipment)));
    businessCosts.push(...manualItems
      .filter((row) => row.type === 'BUSINESS_COST')
      .map((row) => this.toBusinessCostFinanceSummary(row, shipment)));
    const usdRate = await this.getShipmentFinanceDetailUsdToRmbRate([...receivables, ...payables, ...businessCosts]);
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
            ...(canViewInternalPayables ? { agentName } : {}),
            payables: visiblePayables,
            payableTotal: visiblePayableTotal,
            canViewPayables: true
          }
        : {}),
      ...(canViewReceivablePayableProfit && hasPayables
        ? { grossProfit: receivableTotal - payableTotal }
        : {}),
      ...(profitSections.length ? { profitSections } : {}),
      paymentAmountUsd: shipment.paymentAmountUsd === null ? undefined : Number(shipment.paymentAmountUsd),
      paymentAmountCny: shipment.paymentAmountCny === null ? undefined : Number(shipment.paymentAmountCny),
      paymentMethod: shipment.paymentMethod === null ? undefined : shipment.paymentMethod as ShipmentPaymentMethod
    };
  }

  async getReviewPendingShipments(principal: Principal): Promise<Shipment[]> {
    await this.cleanupOverdueReviewShipments(principal);
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const scopedOwnerWhere = operatorCustomerScope
      ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
      : {};
    const rows = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        status: 'REVIEW_PENDING',
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      } as any,
      include: shipmentIncludes,
      orderBy: { createdAt: 'asc' }
    });
    return (await this.decorateReviewPendingListShipments(rows)).map((shipment) => this.redactOrderEntrySensitiveShipment(principal, shipment));
  }

  async getOrderEntryDrafts(principal: Principal): Promise<Shipment[]> {
    this.ensureOrderEntryAccess(principal);
    await this.cleanupOverdueReviewShipments(principal);
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const scopedOwnerWhere = operatorCustomerScope
      ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
      : {};
    const rows = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        status: { in: ['DRAFT', 'REVIEW_REJECTED'] as ShipmentStatus[] },
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      } as any,
      include: shipmentIncludes,
      orderBy: { createdAt: 'desc' }
    });
    return (await this.decorateReviewPendingListShipments(rows)).map((shipment) => this.redactOrderEntrySensitiveShipment(principal, shipment));
  }

  private async decorateReviewPendingListShipments(rows: any[]): Promise<Shipment[]> {
    if (!rows.length) {
      return [];
    }
    const shipmentIds = rows.map((row) => row.id);
    const draftPackageOwner = new Map<string, string>();
    rows.forEach((row) => {
      (row.draftWarehousePackageIds ?? []).forEach((id: string) => draftPackageOwner.set(id, row.id));
    });
    const draftPackageIds = Array.from(draftPackageOwner.keys());
    const [warehousePackages, legacyReceivables] = await Promise.all([
      (this.prisma as any).warehousePackage.findMany({
        where: {
          OR: [
            { shipmentId: { in: shipmentIds } },
            ...(draftPackageIds.length ? [{ id: { in: draftPackageIds } }] : [])
          ]
        }
      }),
      (this.prisma as any).receivableFee.findMany({
        where: {
          shipmentId: { in: shipmentIds },
          voided: false
        }
      })
    ]);
    const packagesByShipmentId = new Map<string, any[]>();
    const addPackage = (shipmentId: string | undefined, pkg: any) => {
      if (!shipmentId) return;
      const current = packagesByShipmentId.get(shipmentId) ?? [];
      if (!current.some((item) => item.id === pkg.id)) {
        current.push(pkg);
      }
      packagesByShipmentId.set(shipmentId, current);
    };
    warehousePackages.forEach((pkg: any) => {
      addPackage(pkg.shipmentId, pkg);
      addPackage(draftPackageOwner.get(pkg.id), pkg);
    });
    const legacyReceivablesByShipmentId = new Map<string, any[]>();
    legacyReceivables.forEach((row: any) => {
      const current = legacyReceivablesByShipmentId.get(row.shipmentId) ?? [];
      current.push(row);
      legacyReceivablesByShipmentId.set(row.shipmentId, current);
    });
    const allReceivables = rows.flatMap((row) => [
      ...(legacyReceivablesByShipmentId.get(row.id) ?? []),
      ...((row.financeItems ?? []).filter((item: any) => item.type === 'RECEIVABLE' && !item.voided))
    ]);
    let usdRate = 1;
    let usdRateError: string | undefined;
    try {
      usdRate = await this.getShipmentFinanceDetailUsdToRmbRate(allReceivables);
    } catch (error) {
      usdRateError = error instanceof Error ? error.message : '应收汇率异常';
    }
    return rows.map((row) => {
      const shipment = mapShipment(row);
      const packages = packagesByShipmentId.get(row.id) ?? [];
      const receivables = [
        ...(legacyReceivablesByShipmentId.get(row.id) ?? []),
        ...((row.financeItems ?? []).filter((item: any) => item.type === 'RECEIVABLE' && !item.voided))
      ];
      const keepManualCargo = shipment.cargoDataSource === 'MANUAL_ADJUSTED';
      const weightKg = !keepManualCargo && packages.length ? roundMoney(packages.reduce((sum, pkg) => sum + Number(pkg.weightKg) * Number(pkg.packageCount ?? 1), 0)) : undefined;
      const volumeCbm = !keepManualCargo && packages.length ? roundMoney(packages.reduce((sum, pkg) => sum + Number(pkg.cbm ?? 0), 0)) : undefined;
      const chargeableWeightKg = !keepManualCargo && packages.length ? roundMoney(packages.reduce((sum, pkg) => sum + Number(pkg.chargeableWeightKg ?? pkg.weightKg ?? 0), 0)) : undefined;
      try {
        if (usdRateError && receivables.some((item) => (item.currency ?? 'RMB').toUpperCase() === 'USD')) {
          throw new Error(usdRateError);
        }
        return {
          ...shipment,
          weightKg: weightKg ?? shipment.weightKg ?? shipment.receivableWeightKg,
          volumeCbm: volumeCbm ?? shipment.volumeCbm,
          chargeableWeightKg: chargeableWeightKg ?? shipment.chargeableWeightKg ?? shipment.receivableWeightKg ?? shipment.agentWeightKg,
          receivableRmbTotal: roundMoney(receivables.reduce((sum, item) => sum + this.toShipmentFinanceDetailRmbAmount(Number(item.amount), item.currency ?? 'RMB', usdRate), 0)),
          receivableRmbTotalError: undefined
        };
      } catch (error) {
        return {
          ...shipment,
          weightKg: weightKg ?? shipment.weightKg ?? shipment.receivableWeightKg,
          volumeCbm: volumeCbm ?? shipment.volumeCbm,
          chargeableWeightKg: chargeableWeightKg ?? shipment.chargeableWeightKg ?? shipment.receivableWeightKg ?? shipment.agentWeightKg,
          receivableRmbTotal: undefined,
          receivableRmbTotalError: error instanceof Error ? error.message : '应收汇率异常'
        };
      }
    });
  }

  async getReviewDeletedShipments(principal: Principal): Promise<Shipment[]> {
    await this.cleanupOverdueReviewShipments(principal);
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const scopedOwnerWhere = operatorCustomerScope
      ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
      : {};
    const rows = await this.prisma.shipment.findMany({
      where: {
        deletedAt: { not: null },
        status: { in: ['DRAFT', 'REVIEW_PENDING', 'REVIEW_REJECTED'] as ShipmentStatus[] },
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      } as any,
      include: shipmentIncludes,
      orderBy: [{ deletedAt: 'desc' }, { createdAt: 'asc' }]
    });
    return rows.map(mapShipment);
  }

  async getShipmentReviewDetail(principal: Principal, shipmentId: string): Promise<ShipmentReviewDetailSummary> {
    const shipment = await this.getReviewVisibleShipment(principal, shipmentId, true);
    if (shipment.deletedAt && !(await this.hasPermission(principal.role, 'business:review:restore'))) {
      throw new NotFoundException('运单不存在');
    }
    return this.buildShipmentReviewDetail(principal, shipment);
  }

  async updateShipmentReviewBasic(principal: Principal, shipmentId: string, input: ShipmentReviewBasicUpdateInput): Promise<ShipmentReviewDetailSummary> {
    const shipment = await this.getReviewVisibleShipment(principal, shipmentId, false);
    if (!['DRAFT', 'REVIEW_PENDING', 'REVIEW_REJECTED'].includes(shipment.status as ShipmentStatus)) {
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
    const customer = await this.resolveOrderEntryCustomer(principal, undefined, customerCode);
    const channel = await this.prisma.channel.findFirst({ where: { name: companyChannelName, enabled: true } });
    if (!channel) {
      throw new BadRequestException('公司渠道不存在或已停用，请从基础资料库重新选择');
    }
    const optional = (value?: string) => value?.trim() || null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          customerId: customer.id,
          channelId: channel.id,
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
        },
        include: shipmentIncludes
      });
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'shipment.review.basic_update',
          target: shipment.id,
          before: toAuditJson(mapShipment(shipment)),
          after: toAuditJson({
            ...mapShipment(next),
            updateScope: 'REVIEW_BASIC',
            companyChannelName: channel.name,
            updatedBy: principal.username
          })
        }
      });
      return next;
    });
    return this.buildShipmentReviewDetail(principal, updated);
  }

  async approveShipmentReview(principal: Principal, shipmentId: string, options: { businessReview?: boolean } = {}): Promise<ShipmentReviewDetailSummary> {
    if (principal.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能审核运单');
    }
    const shipment = await this.getReviewVisibleShipment(principal, shipmentId, false);
    if (!this.isReviewPendingStatus(shipment.status as ShipmentStatus)) {
      throw new BadRequestException('只有待审核运单可以审核通过');
    }
    const detail = await this.buildShipmentReviewDetail(principal, shipment);
    if (detail.approvalWarnings.length > 0) {
      throw new BadRequestException(`审核资料未完整：${detail.approvalWarnings.join('；')}`);
    }
    const canBusinessReview = await this.hasPermission(principal.role, 'business:review:approve')
      && (principal.role !== 'ADMIN' || options.businessReview === true);
    if (canBusinessReview) {
      if ((shipment as any).businessReviewedAt) {
        throw new BadRequestException('该订单已完成业务员自审，已进入待排货与业务成本审核');
      }
      const updated = await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'WAITING_SORT',
          businessReviewedBy: principal.username,
          businessReviewedAt: new Date(),
          reviewRejectedReason: null,
          trackingStaleDays: shipment.trackingStaleDays
        } as any,
        include: shipmentIncludes
      });
      await this.createEvent(shipment.id, shipment.status as ShipmentStatus, 'WAITING_SORT', `业务员自审通过并进入待排货：${principal.username}`);
      const mappedUpdated = mapShipment(updated);
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'shipment.review.business_approve',
          target: shipment.id,
          before: toAuditJson(mapShipment(shipment)),
          after: toAuditJson({
            ...mappedUpdated,
            reviewStatus: 'BUSINESS_APPROVED',
            statusFrom: shipment.status,
            statusTo: mappedUpdated.status,
            businessReviewer: principal.username,
            businessReviewedBy: mappedUpdated.businessReviewedBy,
            businessReviewedAt: mappedUpdated.businessReviewedAt,
            receivableTotal: detail.finance.receivableTotal,
            businessCostTotal: detail.finance.businessCostTotal ?? 0,
            payableTotal: detail.finance.payableTotal,
            approvalWarnings: detail.approvalWarnings
          })
        }
      });
      void this.lineage?.recordEvent('orders.review.approve', {
        actorUsername: principal.username,
        businessId: shipment.id,
        payload: {
          shipmentId: shipment.id,
          systemOrderNo: mappedUpdated.systemOrderNo,
          customerOrderNo: mappedUpdated.customerOrderNo,
          reviewStatus: 'BUSINESS_APPROVED',
          statusFrom: shipment.status,
          statusTo: mappedUpdated.status,
          reviewedBy: mappedUpdated.businessReviewedBy,
          reviewedAt: mappedUpdated.businessReviewedAt
        },
        sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
        metrics: {
          receivableTotal: detail.finance.receivableTotal,
          businessCostTotal: detail.finance.businessCostTotal ?? 0,
          payableTotal: detail.finance.payableTotal,
          approvalWarningCount: detail.approvalWarnings.length
        }
      });
      await this.autoMatchUnmatchedReceivables(principal);
      return this.buildShipmentReviewDetail(principal, updated);
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
    const shipment = await this.getReviewVisibleShipment(principal, shipmentId, false);
    if (!this.isReviewPendingStatus(shipment.status as ShipmentStatus)) {
      throw new BadRequestException('只有待审核运单可以驳回');
    }
    const detail = await this.buildShipmentReviewDetail(principal, shipment);
    const reviewedAt = new Date();
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'REVIEW_REJECTED',
        reviewedBy: principal.username,
        reviewedAt,
        reviewRejectedReason: reason,
        trackingStaleDays: shipment.trackingStaleDays
      },
      include: shipmentIncludes
    });
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, 'REVIEW_REJECTED', `审核驳回：${reason}`);
    const mappedUpdated = mapShipment(updated);
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.review.reject',
        target: shipment.id,
        before: toAuditJson(mapShipment(shipment)),
        after: toAuditJson({
          ...mappedUpdated,
          reviewStatus: 'REJECTED',
          statusFrom: shipment.status,
          statusTo: mappedUpdated.status,
          reviewer: principal.username,
          reviewedBy: mappedUpdated.reviewedBy,
          reviewedAt: mappedUpdated.reviewedAt,
          rejectReason: reason,
          receivableTotal: detail.finance.receivableTotal,
          businessCostTotal: detail.finance.businessCostTotal ?? 0,
          payableTotal: detail.finance.payableTotal,
          approvalWarnings: detail.approvalWarnings
        })
      }
    });
    void this.lineage?.recordEvent('orders.review.reject', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: mappedUpdated.systemOrderNo,
        customerOrderNo: mappedUpdated.customerOrderNo,
        reviewStatus: 'REJECTED',
        statusFrom: shipment.status,
        statusTo: mappedUpdated.status,
        rejectReason: reason,
        reviewedBy: mappedUpdated.reviewedBy,
        reviewedAt: mappedUpdated.reviewedAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: {
        receivableTotal: detail.finance.receivableTotal,
        businessCostTotal: detail.finance.businessCostTotal ?? 0,
        payableTotal: detail.finance.payableTotal,
        approvalWarningCount: detail.approvalWarnings.length
      }
    });
    return this.buildShipmentReviewDetail(principal, updated);
  }

  async reverseShipmentReview(principal: Principal, shipmentId: string, input: { reason?: string } = {}): Promise<ShipmentReviewDetailSummary> {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId }, include: shipmentIncludes });
    const scope = this.operatorCustomerScope(principal);
    const isOwner = Boolean(scope && [(shipment as any)?.entryBy, (shipment as any)?.salesperson, shipment?.customer?.salesperson].some((owner) => Boolean(owner && scope.includes(owner))));
    if (!shipment || shipment.deletedAt || !(principal.role === 'ADMIN' || isOwner || await this.hasPermission(principal.role, 'business:review:reverse'))) throw new NotFoundException('运单不存在');
    if (shipment.status !== 'WAITING_SORT') throw new BadRequestException(`订单已进入${shipmentStatusLabels[shipment.status as ShipmentStatus]}，不能反审核`);
    const financeItems = await (this.prisma as any).shipmentFinanceItem.findMany({ where: { shipmentId, voided: false } });
    if (financeItems.some((item: any) => item.reconciliationStatus === 'CONFIRMED' || item.locked || Number(item.receivedAmount ?? 0) > 0)) throw new BadRequestException('订单已进入财务审核或已匹配收款，不能反审核');
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await (tx as any).shipmentFinanceItem.updateMany({ where: { shipmentId, type: 'PAYABLE', name: '代理成本', voided: false, locked: false }, data: { voided: true, reconciliationStatus: 'VOIDED', voidedAt: now } });
      return tx.shipment.update({ where: { id: shipmentId }, data: { status: 'REVIEW_PENDING', businessReviewedBy: null, businessReviewedAt: null, channelId: null, agentId: null, shippingMarkRequired: false, latestTracking: '反审核后回到待审核' }, include: shipmentIncludes });
    });
    await this.createEvent(shipmentId, 'WAITING_SORT', 'REVIEW_PENDING', `反审核${input.reason?.trim() ? `：${input.reason.trim()}` : ''}`);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'shipment.review.reverse', target: shipmentId, before: toAuditJson(mapShipment(shipment)), after: toAuditJson({ ...mapShipment(updated), statusFrom: 'WAITING_SORT', statusTo: 'REVIEW_PENDING', reason: input.reason?.trim(), releasedRoutePayableCount: financeItems.filter((item: any) => item.type === 'PAYABLE' && item.name === '代理成本' && !item.locked).length }) } });
    return this.buildShipmentReviewDetail(principal, updated);
  }

  async deleteShipmentReview(principal: Principal, shipmentId: string, input: ShipmentReviewDeleteInput = {}): Promise<ShipmentReviewDetailSummary> {
    if (principal.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: shipmentIncludes
    });
    if (
      !shipment
      || shipment.deletedAt
      || (operatorCustomerScope && ![(shipment as any).entryBy, shipment.customer.salesperson].some((owner) => Boolean(owner && operatorCustomerScope.includes(owner))))
    ) {
      throw new NotFoundException('运单不存在');
    }
    if (!this.isReviewPendingStatus(shipment.status as ShipmentStatus) && shipment.status !== 'REVIEW_REJECTED') {
      throw new BadRequestException('只有待审核或审核不通过运单可以从审核台删除');
    }
    const reason = input.reason?.trim() || '审核台人工删除';
    const detailBeforeDelete = await this.buildShipmentReviewDetail(principal, shipment);
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `审核台删除：${reason}`);
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        deletedAt: new Date(),
        deletedBy: principal.username,
        deletedReason: reason,
        deleteType: 'MANUAL'
      },
      include: shipmentIncludes
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.review.delete',
        target: shipment.id,
        before: toAuditJson(mapShipment(shipment)),
        after: toAuditJson({
          ...mapShipment(updated),
          reviewStatus: 'DELETED',
          statusFrom: shipment.status,
          statusTo: updated.status,
          reviewer: principal.username,
          deleteReason: reason,
          receivableTotal: detailBeforeDelete.finance.receivableTotal,
          businessCostTotal: detailBeforeDelete.finance.businessCostTotal ?? 0,
          payableTotal: detailBeforeDelete.finance.payableTotal
        })
      }
    });
    const mappedUpdated = mapShipment(updated);
    void this.lineage?.recordEvent('orders.management.delete_restore', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        action: 'review_delete',
        shipmentId: shipment.id,
        systemOrderNo: mappedUpdated.systemOrderNo,
        customerOrderNo: mappedUpdated.customerOrderNo,
        status: mappedUpdated.status,
        deleteReason: reason,
        deletedBy: mappedUpdated.deletedBy,
        deletedAt: mappedUpdated.deletedAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: {
        receivableTotal: detailBeforeDelete.finance.receivableTotal,
        businessCostTotal: detailBeforeDelete.finance.businessCostTotal ?? 0,
        payableTotal: detailBeforeDelete.finance.payableTotal
      }
    });
    return { ...detailBeforeDelete, shipment: mapShipment(updated) };
  }

  async restoreShipment(principal: Principal, shipmentId: string, input: ReviewRestoreInputWithManual = {}): Promise<ShipmentReviewDetailSummary> {
    if (!(await this.hasPermission(principal.role, 'business:review:restore'))) {
      throw new ForbiddenException('当前角色不能恢复运单');
    }
    const shipment = await this.getReviewVisibleShipment(principal, shipmentId, true);
    if (!shipment.deletedAt) {
      throw new BadRequestException('运单未删除，无需恢复');
    }
    const restoreMode = input.mode ?? 'KEEP_ORIGINAL_TIME';
    const manualCreatedAt = input.manualCreatedAt ? new Date(input.manualCreatedAt) : null;
    if (restoreMode === 'MANUAL_TIME' && (!manualCreatedAt || Number.isNaN(manualCreatedAt.getTime()))) {
      throw new BadRequestException('手动恢复时间不合法');
    }
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        deleteType: null,
        restoredAt: new Date(),
        restoredBy: principal.username,
        restoreMode,
        ...(restoreMode === 'RESET_CREATED_TIME' ? { createdAt: new Date() } : {}),
        ...(restoreMode === 'MANUAL_TIME' && manualCreatedAt ? { createdAt: manualCreatedAt } : {})
      },
      include: shipmentIncludes
    });
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `恢复删除运单：${input.reason?.trim() || restoreMode}`);
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.restore',
        target: shipment.id,
        before: toAuditJson(mapShipment(shipment)),
        after: toAuditJson({
          ...mapShipment(updated),
          reviewStatus: 'RESTORED',
          statusFrom: shipment.status,
          statusTo: updated.status,
          reviewer: principal.username,
          restoreReason: input.reason?.trim() || restoreMode
        })
      }
    });
    const mappedUpdated = mapShipment(updated);
    void this.lineage?.recordEvent('orders.management.delete_restore', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        action: 'restore',
        shipmentId: shipment.id,
        systemOrderNo: mappedUpdated.systemOrderNo,
        customerOrderNo: mappedUpdated.customerOrderNo,
        status: mappedUpdated.status,
        restoreMode,
        restoreReason: input.reason?.trim() || restoreMode,
        restoredBy: mappedUpdated.restoredBy,
        restoredAt: mappedUpdated.restoredAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { statusChanged: shipment.status !== updated.status ? 1 : 0 }
    });
    return this.buildShipmentReviewDetail(principal, updated);
  }

  async permanentlyDeleteShipmentReview(principal: Principal, shipmentId: string): Promise<{ id: string; deleted: true }> {
    if (!(await this.hasPermission(principal.role, 'business:review:purge'))) {
      throw new ForbiddenException('当前角色不能彻底删除待审核订单');
    }
    const shipment = await this.getReviewVisibleShipment(principal, shipmentId, true);
    if (!shipment.deletedAt) {
      throw new BadRequestException('只有已删除订单可以彻底删除');
    }
    if (!['DRAFT', 'REVIEW_PENDING', 'REVIEW_REJECTED'].includes(shipment.status as ShipmentStatus)) {
      throw new BadRequestException('已进入后续流转的订单不能在待审核模块彻底删除');
    }
    const before = mapShipment(shipment);

    await this.prisma.$transaction(async (tx) => {
      const pendingPaymentRows = await tx.payablePaymentApplication.findMany({
        where: { shipmentId },
        select: { id: true }
      });
      const pendingPaymentIds = pendingPaymentRows.map((row) => row.id);
      if (pendingPaymentIds.length) {
        await tx.payableBillAttachment.deleteMany({ where: { payablePaymentApplicationId: { in: pendingPaymentIds } } });
      }
      const problemTickets = await tx.problemTicket.findMany({ where: { shipmentId }, select: { id: true } });
      const problemTicketIds = problemTickets.map((ticket) => ticket.id);
      if (problemTicketIds.length) {
        await tx.problemReply.deleteMany({ where: { ticketId: { in: problemTicketIds } } });
      }
      await tx.paymentApplicationItem.deleteMany({ where: { shipmentId } });
      await tx.payablePaymentApplication.deleteMany({ where: { shipmentId } });
      await tx.waterReceiptMatch.deleteMany({ where: { shipmentId } });
      await tx.problemTicket.deleteMany({ where: { shipmentId } });
      await tx.trackingEvent.deleteMany({ where: { shipmentId } });
      await tx.shipmentEvent.deleteMany({ where: { shipmentId } });
      await tx.shipmentLabel.deleteMany({ where: { shipmentId } });
      await tx.carrierTask.deleteMany({ where: { shipmentId } });
      await tx.shipmentPackage.deleteMany({ where: { shipmentId } });
      await tx.receivableFee.deleteMany({ where: { shipmentId } });
      await tx.payableFee.deleteMany({ where: { shipmentId } });
      await tx.shipmentFinanceItem.deleteMany({ where: { shipmentId } });
      await tx.warehousePackage.updateMany({
        where: { shipmentId },
        data: { shipmentId: null, systemOrderNo: null }
      });
      await tx.shipment.delete({ where: { id: shipmentId } });
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'shipment.review.purge',
          target: shipmentId,
          before: toAuditJson(before),
          after: toAuditJson({ deleted: true })
        }
      });
    });

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

  async createShipmentFinanceItem(principal: Principal, shipmentId: string, input: ShipmentFinanceItemCreateInput) {
    this.validateFinanceItemInput(input.type, input);
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.ensureFinanceItemManageAccess(principal, input.type, shipment);
    this.ensureBusinessCostEditableAfterDispatch(principal, input.type, shipment);
    const amount = this.resolveShipmentFinanceItemAmount(input.type, input);
    const item = await (this.prisma as any).shipmentFinanceItem.create({
      data: {
        shipmentId: shipment.id,
        type: input.type,
        name: input.name,
        amount,
        currency: input.currency ?? 'RMB',
        settlementMethod: input.settlementMethod ?? (input.type === 'RECEIVABLE' ? this.resolveReceivableSettlementMethod(shipment) : undefined),
        paymentNo: input.paymentNo,
        reconciliationStatus: input.reconciliationStatus ?? 'PENDING',
        agentName: input.type === 'PAYABLE' || input.type === 'BUSINESS_COST' ? (input.agentName ?? shipment.agent?.name ?? undefined) : undefined,
        chargeWeightKg: input.chargeWeightKg,
        unitPrice: input.unitPrice,
        amountOverridden: this.isFinanceAmountOverridden({ ...input, amount }),
        remark: input.remark,
        createdBy: principal.username
      }
    });
    await (this.prisma as any).auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.finance_item.create',
        target: item.id,
        before: null,
        after: item
      }
    });
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `财务费用新增：${input.type} / ${input.name}`);
    await this.createBusinessCostChangeNotificationAudit(principal, input.type, shipment, null, item);
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
    const customer = customerCode ? await this.prisma.customer.findFirst({
      where: {
        code: customerCode,
        ...(scope ? { salesperson: { in: scope } } : {})
      },
      select: { code: true }
    }) : undefined;
    if (customerCode && !customer) {
      return [];
    }
    const draftShipments = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        ...(customer ? { customer: { code: customer.code } } : {})
      },
      select: { draftWarehousePackageIds: true }
    });
    const draftOccupiedPackageIds = Array.from(new Set(draftShipments.flatMap((shipment) => shipment.draftWarehousePackageIds ?? []).filter(Boolean)));
    const where: any = {
      shipmentId: null,
      systemOrderNo: null,
      measurementStatus: { not: 'PENDING_REMEASURE' },
      status: { notIn: ['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'] }
    };
    if (customer) {
      where.customerCode = customer.code;
    }
    if (packageIds.length) {
      where.id = { in: packageIds };
    }
    if (draftOccupiedPackageIds.length) {
      where.id = packageIds.length
        ? { in: packageIds.filter((id) => !draftOccupiedPackageIds.includes(id)) }
        : { notIn: draftOccupiedPackageIds };
    }
    if (query.domesticTrackingNo?.trim()) {
      where.domesticTrackingNo = { contains: query.domesticTrackingNo.trim(), mode: 'insensitive' };
    }
    if (scope && !customer) {
      const customers = await this.prisma.customer.findMany({
        where: { salesperson: { in: scope } },
        select: { code: true }
      });
      where.customerCode = { in: customers.map((item) => item.code) };
    }
    const rows = await (this.prisma as any).warehousePackage.findMany({
      where,
      orderBy: [{ scanTime: 'desc' }, { createdAt: 'desc' }]
    });
    return mapWarehousePackagesWithConfirmedTally(this.prisma, rows);
  }

  async createOrderEntry(principal: Principal, input: OrderEntryCreateInput): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    if (input.shipment.transferNo?.trim()) {
      throw new BadRequestException('录单阶段不能填写转单号，请在出库后完成双审核再填写');
    }
    let normalized: Awaited<ReturnType<PrismaRepository['prepareOrderEntryInput']>>;
    try {
      normalized = await this.prepareOrderEntryInput(principal, input);
    } catch (error) {
      if (error instanceof BadRequestException && String(error.message).includes('待重新过机')) throw error;
      if (input.submitForReview && error instanceof BadRequestException) {
        return this.createOrderEntry(principal, { ...input, shipment: { ...input.shipment, reviewValidationError: error.message }, submitForReview: false });
      }
      throw error;
    }
    const now = new Date();
    const entryAt = this.resolveOrderEntryEntryAt(principal, normalized.shipment.entryAt, now);
    const status = input.submitForReview ? 'REVIEW_PENDING' : 'DRAFT';
    const latestTracking = input.submitForReview ? '财务录单创建，待审核' : '财务录单保存草稿';
    const systemOrderNo = normalized.shipment.outboundOrderNo?.trim() || normalized.shipment.systemOrderNo?.trim() || (await this.nextSystemOrderNo(normalized.shipment.businessType, now));
    if (await this.prisma.shipment.findUnique({ where: { systemOrderNo } })) {
      throw new BadRequestException(`出货单号 ${systemOrderNo} 已存在，请更换后再提交`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          customerId: normalized.customer.id,
          channelId: normalized.shipment.channelId,
          agentId: normalized.shipment.agentId,
          customerOrderNo: normalized.shipment.customerOrderNo.trim(),
          systemOrderNo,
          subOrderNo: normalized.shipment.subOrderNo?.trim() || undefined,
          inboundNo: normalized.shipment.inboundNo?.trim() || undefined,
          productName: normalized.shipment.productName.trim(),
          declarationRequired: normalized.shipment.declarationRequired,
          sensitive: normalized.shipment.sensitive ?? false,
          cargoType: normalized.shipment.cargoType.trim(),
          volumeCbm: normalized.totals.cbm,
          actualWeightKg: normalized.totals.weightKg,
          cargoDataSource: normalized.shipment.cargoDataSource ?? 'AUTO_MATCHED',
          chargeWeightOverridden: normalized.shipment.chargeWeightOverridden ?? false,
          settlementMethod: normalized.shipment.settlementMethod.trim(),
          tradeTerms: normalized.shipment.tradeTerms?.trim() || undefined,
          fbaInboundNo: normalized.shipment.fbaInboundNo?.trim() || undefined,
          receiverName: normalized.shipment.receiverName?.trim() || undefined,
          receiverCompany: normalized.shipment.receiverCompany?.trim() || undefined,
          receiverPhone: normalized.shipment.receiverPhone?.trim() || undefined,
          receiverAddress: normalized.shipment.receiverAddress?.trim() || undefined,
          receiverCountry: normalized.shipment.receiverCountry?.trim() || undefined,
          receiverState: normalized.shipment.receiverState?.trim() || undefined,
          receiverPostalCode: normalized.shipment.receiverPostalCode?.trim() || undefined,
          fbaWarehouseCode: normalized.shipment.fbaWarehouseCode?.trim() || undefined,
          entryBy: principal.username,
          entryAt,
          businessType: normalized.shipment.businessType,
          status,
          destinationCountry: normalized.shipment.destinationCountry.trim(),
          packageType: normalized.shipment.packageType,
          packageCount: normalized.totals.packageCount,
          receivableWeightKg: normalized.totals.chargeWeightKg,
          agentWeightKg: normalized.totals.chargeWeightKg,
          latestTracking: '',
          trackingStaleDays: 0,
          isRemoteArea: false,
          draftWarehousePackageIds: input.submitForReview ? [] : normalized.packageIds,
          reviewRejectedReason: normalized.shipment.reviewValidationError ?? undefined,
          remark: normalized.shipment.remark?.trim() || undefined,
          createdAt: now,
          packages: {
            create: {
              lengthCm: 0,
              widthCm: 0,
              heightCm: 0,
              actualKg: normalized.totals.weightKg,
              volumeKg: normalized.totals.chargeWeightKg
            }
          },
          events: { create: { toStatus: status, note: input.submitForReview ? '录单提交审核' : '录单保存草稿' } }
        },
        include: shipmentIncludes
      });

      if (input.submitForReview) {
        await tx.warehousePackage.updateMany({
          where: { id: { in: normalized.packageIds } },
          data: { shipmentId: shipment.id, systemOrderNo }
        });
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'shipment.order_entry.submit',
            target: `shipment:${shipment.id}`,
            after: toAuditJson({
              systemOrderNo,
              warehousePackageIds: normalized.packageIds,
              combinedOrderNos: normalized.warehousePackages.map((pkg: WarehousePackageSummary) => pkg.combinedOrderNo),
              customerCode: normalized.customer.code,
              packageCount: normalized.totals.packageCount,
              weightKg: normalized.totals.weightKg,
              volumeCbm: normalized.totals.cbm,
              chargeWeightKg: normalized.totals.chargeWeightKg,
              destinationCountry: normalized.shipment.destinationCountry,
              receiverName: normalized.shipment.receiverName?.trim() || undefined,
              salesperson: principal.username,
              businessChannel: normalized.shipment.receivingChannel?.trim() || normalized.shipment.channelId,
              cargoSummary: {
                cargoType: normalized.shipment.cargoType,
                productName: normalized.shipment.productName,
                remark: normalized.shipment.remark
              },
              entryBy: principal.username,
              entryAt,
              financeItemCount: normalized.financeItems.length
            })
          }
        });
      } else {
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'shipment.order_entry.draft',
            target: `shipment:${shipment.id}`,
            after: toAuditJson({
              systemOrderNo,
              draftWarehousePackageIds: normalized.packageIds,
              combinedOrderNos: normalized.warehousePackages.map((pkg: WarehousePackageSummary) => pkg.combinedOrderNo),
              customerCode: normalized.customer.code,
              packageCount: normalized.totals.packageCount,
              weightKg: normalized.totals.weightKg,
              volumeCbm: normalized.totals.cbm,
              chargeWeightKg: normalized.totals.chargeWeightKg,
              destinationCountry: normalized.shipment.destinationCountry,
              receiverName: normalized.shipment.receiverName?.trim() || undefined,
              salesperson: principal.username,
              businessChannel: normalized.shipment.receivingChannel?.trim() || normalized.shipment.channelId,
              cargoSummary: {
                cargoType: normalized.shipment.cargoType,
                productName: normalized.shipment.productName,
                remark: normalized.shipment.remark
              },
              entryBy: principal.username,
              entryAt,
              financeItemCount: normalized.financeItems.length
            })
          }
        });
      }

      const createdItems = await this.createOrderEntryFinanceItems(tx, principal, shipment.id, normalized.financeItems);
      if (input.submitForReview) {
        await this.applyOrderEntryReceiptMatches(tx, principal, normalized.customer.id, normalized.financeItems, createdItems);
      }
      return shipment;
    });

    void this.lineage?.recordEvent(input.submitForReview ? 'orders.entry.submit' : 'orders.entry.draft', {
      actorUsername: principal.username,
      businessId: created.id,
      payload: {
        shipmentId: created.id,
        systemOrderNo: created.systemOrderNo,
        customerOrderNo: created.customerOrderNo,
        status: created.status,
        warehousePackageIds: normalized.packageIds,
        financeItems: normalized.financeItems.map((item) => ({ type: item.type, name: item.name, amount: item.amount, currency: item.currency }))
      },
      sourceRefs: normalized.packageIds.map((id) => ({ nodeType: 'warehouse_package', id })),
      metrics: {
        packageCount: normalized.totals.packageCount,
        weightKg: normalized.totals.weightKg,
        volumeCbm: normalized.totals.cbm,
        financeItemCount: normalized.financeItems.length
      }
    });
    return this.getOrderEntryDetail(principal, created.id);
  }

  async getOrderEntryDetail(principal: Principal, shipmentId: string): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const scopedOwnerWhere = operatorCustomerScope
      ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
      : {};
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      },
      include: { ...shipmentIncludes, financeItems: { where: { voided: false }, orderBy: { createdAt: 'asc' } } }
    });
    if (!shipment) {
      throw new NotFoundException('录单不存在');
    }
    const mappedShipment = mapShipment(shipment);
    const packageIds = (shipment.draftWarehousePackageIds ?? []).filter(Boolean);
    const packages = await (this.prisma as any).warehousePackage.findMany({
      where: {
        OR: [
          { shipmentId: shipment.id },
          ...(packageIds.length ? [{ id: { in: packageIds } }] : [])
        ]
      },
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    const financeItems = ((shipment as any).financeItems ?? []) as any[];
    const canViewPayables = this.canViewOrderEntryPayables(principal);
    const canViewSensitivePayables = this.canUseSensitiveOrderEntryPayables(principal);
    const visibleShipment = this.redactOrderEntrySensitiveShipment(principal, mappedShipment);
    return {
      shipment: visibleShipment,
      packages: packages.map(mapWarehousePackage),
      receivables: financeItems
        .filter((item) => item.type === 'RECEIVABLE')
        .map((item) => this.toReceivableFinanceSummary(item, shipment, mappedShipment.customerName)),
      businessCosts: financeItems
        .filter((item) => item.type === 'BUSINESS_COST')
        .map((item) => this.toBusinessCostFinanceSummary(item, shipment))
        .map((item) => canViewSensitivePayables ? item : { ...item, agentName: undefined }),
      payables: canViewPayables
        ? financeItems.filter((item) => item.type === 'PAYABLE').map((item) => {
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
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const scopedOwnerWhere = operatorCustomerScope
      ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
      : {};
    const current = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      } as any,
      include: { ...shipmentIncludes, financeItems: { where: { voided: false } } }
    });
    if (!current) {
      throw new NotFoundException('录单草稿不存在');
    }
    if (!['DRAFT', 'REVIEW_REJECTED'].includes(current.status)) {
      throw new BadRequestException('只有草稿或退回修改的录单可以继续编辑');
    }
    let normalized: Awaited<ReturnType<PrismaRepository['prepareOrderEntryInput']>>;
    try {
      normalized = await this.prepareOrderEntryInput(principal, input, current.id);
    } catch (error) {
      if (error instanceof BadRequestException && String(error.message).includes('待重新过机')) throw error;
      if (input.submitForReview && error instanceof BadRequestException) {
        return this.updateOrderEntryDraft(principal, shipmentId, { ...input, shipment: { ...input.shipment, reviewValidationError: error.message }, submitForReview: false });
      }
      throw error;
    }
    const now = new Date();
    const entryAt = this.resolveOrderEntryEntryAt(principal, normalized.shipment.entryAt, current.entryAt ?? current.createdAt ?? now);
    const nextStatus = input.submitForReview ? 'REVIEW_PENDING' : 'DRAFT';
    const latestTracking = input.submitForReview ? '财务录单提交审核' : '财务录单草稿已更新';
    const nextSystemOrderNo = normalized.shipment.outboundOrderNo?.trim() || normalized.shipment.systemOrderNo?.trim() || current.systemOrderNo;
    const duplicated = await this.prisma.shipment.findUnique({ where: { systemOrderNo: nextSystemOrderNo } });
    if (duplicated && duplicated.id !== current.id) {
      throw new BadRequestException(`出货单号 ${nextSystemOrderNo} 已存在，请更换后再提交`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: current.id },
        data: {
          customerId: normalized.customer.id,
          channelId: normalized.shipment.channelId,
          agentId: normalized.shipment.agentId,
          customerOrderNo: normalized.shipment.customerOrderNo.trim(),
          systemOrderNo: nextSystemOrderNo,
          subOrderNo: normalized.shipment.subOrderNo?.trim() || null,
          inboundNo: normalized.shipment.inboundNo?.trim() || null,
          productName: normalized.shipment.productName.trim(),
          declarationRequired: normalized.shipment.declarationRequired,
          sensitive: normalized.shipment.sensitive ?? false,
          cargoType: normalized.shipment.cargoType.trim(),
          volumeCbm: normalized.totals.cbm,
          actualWeightKg: normalized.totals.weightKg,
          cargoDataSource: normalized.shipment.cargoDataSource ?? 'AUTO_MATCHED',
          chargeWeightOverridden: normalized.shipment.chargeWeightOverridden ?? false,
          settlementMethod: normalized.shipment.settlementMethod.trim(),
          tradeTerms: normalized.shipment.tradeTerms?.trim() || null,
          fbaInboundNo: normalized.shipment.fbaInboundNo?.trim() || null,
          receiverName: normalized.shipment.receiverName?.trim() || null,
          receiverCompany: normalized.shipment.receiverCompany?.trim() || null,
          receiverPhone: normalized.shipment.receiverPhone?.trim() || null,
          receiverAddress: normalized.shipment.receiverAddress?.trim() || null,
          receiverCountry: normalized.shipment.receiverCountry?.trim() || null,
          receiverState: normalized.shipment.receiverState?.trim() || null,
          receiverPostalCode: normalized.shipment.receiverPostalCode?.trim() || null,
          fbaWarehouseCode: normalized.shipment.fbaWarehouseCode?.trim() || null,
          entryBy: principal.username,
          entryAt,
          businessType: normalized.shipment.businessType,
          status: nextStatus,
          destinationCountry: normalized.shipment.destinationCountry.trim(),
          packageType: normalized.shipment.packageType,
          packageCount: normalized.totals.packageCount,
          receivableWeightKg: normalized.totals.chargeWeightKg,
          agentWeightKg: normalized.totals.chargeWeightKg,
          latestTracking: '',
          draftWarehousePackageIds: input.submitForReview ? [] : normalized.packageIds,
          reviewRejectedReason: input.submitForReview ? null : normalized.shipment.reviewValidationError ?? current.reviewRejectedReason,
          remark: normalized.shipment.remark?.trim() || null
        }
      });

      await tx.shipmentFinanceItem.updateMany({
        where: {
          shipmentId: current.id,
          voided: false,
          locked: false,
          reconciliationStatus: { notIn: ['CONFIRMED', 'LOCKED'] }
        },
        data: { voided: true, reconciliationStatus: 'VOIDED', voidedAt: now }
      });
      const createdItems = await this.createOrderEntryFinanceItems(tx, principal, current.id, normalized.financeItems);
      if (input.submitForReview) {
        await this.applyOrderEntryReceiptMatches(tx, principal, normalized.customer.id, normalized.financeItems, createdItems);
      }

      if (input.submitForReview) {
        await tx.warehousePackage.updateMany({
          where: { id: { in: normalized.packageIds } },
          data: { shipmentId: current.id, systemOrderNo: nextSystemOrderNo }
        });
      }
      await tx.shipmentEvent.create({
        data: { shipmentId: current.id, fromStatus: current.status, toStatus: nextStatus, note: input.submitForReview ? '录单草稿提交审核' : '录单草稿更新' }
      });
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: input.submitForReview ? 'shipment.order_entry.draft_submit' : 'shipment.order_entry.draft_update',
          target: `shipment:${current.id}`,
          before: toAuditJson(mapShipment(current)),
          after: toAuditJson({ warehousePackageIds: normalized.packageIds, salesperson: principal.username, entryBy: principal.username, financeItemCount: normalized.financeItems.length })
        }
      });
    });

    void this.lineage?.recordEvent(input.submitForReview ? 'orders.entry.submit' : 'orders.entry.draft', {
      actorUsername: principal.username,
      businessId: current.id,
      payload: {
        shipmentId: current.id,
        systemOrderNo: nextSystemOrderNo,
        customerOrderNo: normalized.shipment.customerOrderNo.trim(),
        statusFrom: current.status,
        statusTo: nextStatus,
        warehousePackageIds: normalized.packageIds,
        financeItems: normalized.financeItems.map((item) => ({ type: item.type, name: item.name, amount: item.amount, currency: item.currency }))
      },
      sourceRefs: [
        { nodeType: 'shipment_draft', id: current.id },
        ...normalized.packageIds.map((id) => ({ nodeType: 'warehouse_package', id }))
      ],
      metrics: {
        packageCount: normalized.totals.packageCount,
        weightKg: normalized.totals.weightKg,
        volumeCbm: normalized.totals.cbm,
        financeItemCount: normalized.financeItems.length
      }
    });

    return this.getOrderEntryDetail(principal, current.id);
  }

  async deleteOrderEntryDraft(principal: Principal, shipmentId: string, input: ShipmentReviewDeleteInput = {}): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const scopedOwnerWhere = operatorCustomerScope
      ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
      : {};
    const current = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      } as any,
      include: { ...shipmentIncludes, financeItems: { where: { voided: false } } }
    });
    if (!current) {
      throw new NotFoundException('录单草稿不存在');
    }
    if (!['DRAFT', 'REVIEW_REJECTED'].includes(current.status)) {
      throw new BadRequestException('只有草稿或退回修改的录单可以删除');
    }
    const reason = input.reason?.trim() || '录单草稿箱删除';
    const detailBeforeDelete = await this.getOrderEntryDetail(principal, current.id);
    const [pendingPaymentCount, paymentItemCount, waterReceiptMatchCount, problemTicketCount, trackingEventCount, labelCount, carrierTaskCount] = await Promise.all([
      this.prisma.payablePaymentApplication.count({ where: { shipmentId: current.id } }),
      this.prisma.paymentApplicationItem.count({ where: { shipmentId: current.id } }),
      this.prisma.waterReceiptMatch.count({ where: { shipmentId: current.id } }),
      this.prisma.problemTicket.count({ where: { shipmentId: current.id } }),
      this.prisma.trackingEvent.count({ where: { shipmentId: current.id } }),
      this.prisma.shipmentLabel.count({ where: { shipmentId: current.id } }),
      this.prisma.carrierTask.count({ where: { shipmentId: current.id } })
    ]);
    if (pendingPaymentCount || paymentItemCount || waterReceiptMatchCount || problemTicketCount || trackingEventCount || labelCount || carrierTaskCount) {
      throw new BadRequestException('该草稿已被付款、水单、轨迹、面单、承运任务或问题件引用，不能删除');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.shipmentPackage.deleteMany({ where: { shipmentId: current.id } });
      await tx.receivableFee.deleteMany({ where: { shipmentId: current.id } });
      await tx.payableFee.deleteMany({ where: { shipmentId: current.id } });
      await tx.shipmentFinanceItem.deleteMany({ where: { shipmentId: current.id } });
      await tx.shipmentEvent.deleteMany({ where: { shipmentId: current.id } });
      await tx.warehousePackage.updateMany({
        where: { shipmentId: current.id },
        data: { shipmentId: null, systemOrderNo: null }
      });
      await tx.shipment.delete({ where: { id: current.id } });
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'shipment.order_entry.draft_delete',
          target: `shipment:${current.id}`,
          before: toAuditJson(mapShipment(current)),
          after: toAuditJson({
            draftWarehousePackageIds: current.draftWarehousePackageIds ?? [],
            deleteReason: reason,
            hardDelete: true
          })
        }
      });
    });
    void this.lineage?.recordEvent('orders.entry.draft_delete', {
      actorUsername: principal.username,
      businessId: current.id,
      payload: {
        shipmentId: current.id,
        systemOrderNo: current.systemOrderNo,
        customerOrderNo: current.customerOrderNo,
        status: current.status,
        draftWarehousePackageIds: current.draftWarehousePackageIds ?? [],
        deleteReason: reason,
        hardDelete: true
      },
      sourceRefs: [{ nodeType: 'shipment_draft', id: current.id }],
      metrics: { draftWarehousePackageCount: (current.draftWarehousePackageIds ?? []).length }
    });
    return { ...detailBeforeDelete, shipment: mapShipment(current) };
  }

  async updateShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string, input: ShipmentFinanceItemUpdateInput) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const current = await this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, current.type, shipment);
    if (current.voided) {
      throw new BadRequestException('已作废费用不能继续操作');
    }
    if (current.locked) {
      throw new BadRequestException('费用已锁定，请先解锁');
    }
    this.ensureBusinessCostEditableAfterDispatch(principal, current.type, shipment);
    this.validateFinanceItemInput(current.type, { ...current, ...input });
    const amount = this.resolveShipmentFinanceItemAmount(current.type, input, current);
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id: current.id },
      data: {
        name: input.name ?? current.name,
        amount,
        currency: input.currency ?? current.currency,
        settlementMethod: input.settlementMethod ?? current.settlementMethod ?? (current.type === 'RECEIVABLE' ? this.resolveReceivableSettlementMethod(shipment) : undefined),
        paymentNo: input.paymentNo ?? current.paymentNo,
        reconciliationStatus: input.reconciliationStatus ?? current.reconciliationStatus,
        agentName: current.type === 'PAYABLE' || current.type === 'BUSINESS_COST' ? (input.agentName ?? current.agentName ?? shipment.agent?.name ?? undefined) : undefined,
        chargeWeightKg: input.chargeWeightKg ?? current.chargeWeightKg,
        unitPrice: input.unitPrice ?? current.unitPrice,
        amountOverridden: this.isFinanceAmountOverridden({ ...current, ...input, amount }),
        remark: input.remark ?? current.remark
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.finance_item.update',
        target: updated.id,
        before: current,
        after: updated
      }
    });
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `财务费用修改：${current.type} / ${updated.name}`);
    await this.createBusinessCostChangeNotificationAudit(principal, current.type, shipment, current, updated);
    return this.toFinanceItemSummary(updated, shipment);
  }

  async deleteShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const current = await this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, current.type, shipment);
    if (current.voided) {
      throw new BadRequestException('费用已作废');
    }
    if (current.locked) {
      throw new BadRequestException('费用已锁定，请先解锁');
    }
    this.ensureBusinessCostEditableAfterDispatch(principal, current.type, shipment);
    const [pendingPaymentCount, paymentItemCount, waterReceiptMatchCount] = await Promise.all([
      current.type === 'PAYABLE'
        ? (this.prisma as any).payablePaymentApplication.count({ where: { payableFinanceItemId: current.id } })
        : Promise.resolve(0),
      current.type === 'PAYABLE'
        ? (this.prisma as any).paymentApplicationItem.count({ where: { payableFinanceItemId: current.id } })
        : Promise.resolve(0),
      current.type === 'RECEIVABLE'
        ? (this.prisma as any).waterReceiptMatch.count({ where: { receivableFinanceItemId: current.id } })
        : Promise.resolve(0)
    ]);
    const pendingPaymentIds = pendingPaymentCount
      ? (await (this.prisma as any).payablePaymentApplication.findMany({ where: { payableFinanceItemId: current.id }, select: { id: true } })).map((row: { id: string }) => row.id)
      : [];
    const billVoucher = current.type === 'PAYABLE'
      ? await (this.prisma as any).paymentVoucher.findFirst({
        where: {
          voucherType: { not: 'PAYMENT_RECEIPT' },
          OR: [{ payableFinanceItemId: current.id }, ...(pendingPaymentIds.length ? [{ pendingPaymentId: { in: pendingPaymentIds } }] : [])]
        },
        select: { id: true }
      })
      : undefined;
    if (pendingPaymentCount || paymentItemCount || billVoucher) {
      throw new BadRequestException('该费用已被付款申请、付款记录或凭证引用，不能删除');
    }
    if (waterReceiptMatchCount) {
      throw new BadRequestException('该费用已被水单匹配引用，不能删除');
    }
    await (this.prisma as any).shipmentFinanceItem.delete({ where: { id: current.id } });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.finance_item.delete',
        target: current.id,
        before: current,
        after: { hardDelete: true }
      }
    });
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `财务费用删除：${current.type} / ${current.name}`);
    await this.createBusinessCostChangeNotificationAudit(principal, current.type, shipment, current, { ...current, hardDelete: true });
    return this.toFinanceItemSummary(current, shipment);
  }

  async lockShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const current = await this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, current.type, shipment);
    if (current.voided) {
      throw new BadRequestException('已作废费用不能锁定');
    }
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id: current.id },
      data: { locked: true, reconciliationStatus: 'LOCKED' }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.finance_item.lock',
        target: updated.id,
        before: current,
        after: updated
      }
    });
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `财务费用锁定：${current.type} / ${current.name}`);
    return this.toFinanceItemSummary(updated, shipment);
  }

  async unlockShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const current = await this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, current.type, shipment);
    if (current.voided) {
      throw new BadRequestException('已作废费用不能解锁');
    }
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id: current.id },
      data: { locked: false, reconciliationStatus: 'PENDING' }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.finance_item.unlock',
        target: updated.id,
        before: current,
        after: updated
      }
    });
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `财务费用解锁：${current.type} / ${current.name}`);
    return this.toFinanceItemSummary(updated, shipment);
  }

  async generateShipmentFees(
    principal: Principal,
    shipmentId: string,
    input: { baseRatePerKg?: number; payableRatePerKg?: number; fuelRate?: number; surcharges?: Array<{ name: string; amount: number }>; pricingRuleId?: string; channelId?: string; destinationCountry?: string }
  ) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.prisma.receivableFee.deleteMany({ where: { shipmentId: shipment.id, settled: false } });
    await this.prisma.payableFee.deleteMany({ where: { shipmentId: shipment.id, settled: false } });

    const receivableQuote = input.baseRatePerKg && input.fuelRate !== undefined
      ? calculateQuote({
        chargeableWeightKg: Number(shipment.receivableWeightKg),
        baseRatePerKg: input.baseRatePerKg,
        fuelRate: input.fuelRate,
        surcharges: input.surcharges ?? []
      })
      : await this.quoteFromRules({
        channelId: input.channelId ?? shipment.channelId ?? '',
        destinationCountry: input.destinationCountry ?? shipment.destinationCountry,
        chargeableWeightKg: Number(shipment.receivableWeightKg)
      });
    const payableQuote = calculateQuote({
      chargeableWeightKg: Number(shipment.agentWeightKg),
      baseRatePerKg: input.payableRatePerKg ?? 0,
      fuelRate: input.fuelRate ?? 0,
      surcharges: []
    });

    await this.prisma.receivableFee.createMany({
      data: createFeeLinesFromQuote(shipment.id, receivableQuote).map((line) => ({
        shipmentId: line.shipmentId,
        name: line.name,
        amount: line.amount
      }))
    });
    await this.prisma.payableFee.createMany({
      data: createFeeLinesFromQuote(shipment.id, payableQuote).map((line) => ({
        shipmentId: line.shipmentId,
        name: line.name,
        amount: line.amount
      }))
    });

    const [receivables, payables] = await Promise.all([
      this.prisma.receivableFee.findMany({
        where: { shipmentId: shipment.id },
        include: { shipment: { include: { customer: true } } },
        orderBy: { id: 'asc' }
      }),
      this.prisma.payableFee.findMany({ where: { shipmentId: shipment.id }, orderBy: { id: 'asc' } })
    ]);

    return {
      receivables: receivables.map((row) => ({
        id: row.id,
        shipmentId: row.shipmentId,
        systemOrderNo: row.shipment.systemOrderNo,
        customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
        name: row.name,
        amount: Number(row.amount),
        settled: row.settled
      })),
      payables: payables.map((row) => ({
        id: row.id,
        shipmentId: row.shipmentId,
        name: row.name,
        amount: Number(row.amount),
        settled: row.settled
      })),
      receivableTotal: receivableQuote.total,
      payableTotal: payableQuote.total
    };
  }

  async addReceivableAdjustment(principal: Principal, shipmentId: string, input: ReceivableAdjustmentInput): Promise<ReceivableFeeSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const fee = await (this.prisma as any).receivableFee.create({
      data: {
        shipmentId: shipment.id,
        name: input.name,
        amount: input.amount,
        currency: 'RMB',
        reconciliationStatus: 'PENDING',
        createdBy: principal.username
      },
      include: { shipment: { include: { customer: true } } }
    });

    return this.toReceivableAuditSummary(fee as any, 'SYSTEM');
  }

  async getCustomerStatements(principal: Principal): Promise<CustomerStatementSummary[]> {
    const rows = await this.prisma.customerStatement.findMany({
      where: principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: rows.map((row) => row.customerId) } }
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    return rows.map((row) => {
      const customer = customerMap.get(row.customerId);
      return {
        id: row.id,
        customerId: row.customerId,
        customerName: customer ? `${customer.code}-${customer.name}` : row.customerId,
        periodStart: row.createdAt.toISOString().slice(0, 10),
        periodEnd: row.createdAt.toISOString().slice(0, 10),
        total: Number(row.total),
        feeCount: 0,
        status: row.status as CustomerStatementSummary['status'],
        createdAt: row.createdAt.toISOString()
      };
    });
  }

  async createCustomerStatement(_principal: Principal, input: CustomerStatementCreateInput): Promise<CustomerStatementSummary> {
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const fees = await this.prisma.receivableFee.findMany({
      where: {
        settled: false,
        shipment: {
          customerId: input.customerId,
          createdAt: {
            gte: new Date(`${input.periodStart}T00:00:00.000Z`),
            lte: new Date(`${input.periodEnd}T23:59:59.999Z`)
          }
        }
      },
      include: { shipment: { include: { customer: true } } }
    });
    const draft = summarizeStatement({
      customerId: customer.id,
      customerName: `${customer.code}-${customer.name}`,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      fees: fees.map((fee) => ({
        id: fee.id,
        shipmentId: fee.shipmentId,
        systemOrderNo: fee.shipment.systemOrderNo,
        customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
        name: fee.name,
        amount: Number(fee.amount),
        settled: fee.settled
      }))
    });
    const created = await this.prisma.customerStatement.create({
      data: {
        customerId: customer.id,
        total: draft.total,
        status: draft.status
      }
    });

    return { ...draft, id: created.id, createdAt: created.createdAt.toISOString() };
  }

  async getCustomerAccounts(principal: Principal): Promise<CustomerAccountSummary[]> {
    const rows = await this.prisma.customerAccount.findMany({
      where: principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : undefined,
      include: { customer: true },
      orderBy: { customerId: 'asc' }
    });

    return rows.map((row) => ({
      customerId: row.customerId,
      customerName: `${row.customer.code}-${row.customer.name}`,
      balance: Number(row.balance),
      currency: row.currency
    }));
  }

  async getAccountLedger(principal: Principal): Promise<AccountLedgerSummary[]> {
    const rows = await this.prisma.accountLedger.findMany({
      where: {
        partyType: 'CUSTOMER',
        ...(principal.role === 'CUSTOMER' ? { partyId: principal.customerId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: rows.map((row) => row.partyId) } }
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    return rows.map((row) => {
      const customer = customerMap.get(row.partyId);
      return {
        id: row.id,
        customerId: row.partyId,
        customerName: customer ? `${customer.code}-${customer.name}` : row.partyId,
        amount: Number(row.amount),
        balance: Number(row.balance),
        note: row.note ?? undefined,
        createdAt: row.createdAt.toISOString()
      };
    });
  }

  async createPayment(_principal: Principal, input: PaymentCreateInput): Promise<PaymentCreateResponse> {
    if (input.amount <= 0) {
      throw new BadRequestException('收款金额必须大于 0');
    }
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const account = await this.prisma.customerAccount.upsert({
      where: { id: `ca-${customer.code}-cny` },
      update: {},
      create: { id: `ca-${customer.code}-cny`, customerId: customer.id, balance: 0, currency: 'RMB' },
      include: { customer: true }
    });
    const feeIds = input.feeIds ?? [];
    const fees = await this.prisma.receivableFee.findMany({
      where: { id: { in: feeIds } },
      include: { shipment: { include: { customer: true } } }
    });
    const systemFeeIds = new Set(fees.map((fee) => fee.id));
    const manualFeeIds = feeIds.filter((id) => !systemFeeIds.has(id));
    const manualFees = await (this.prisma as any).shipmentFinanceItem.findMany({
      where: { id: { in: manualFeeIds }, type: 'RECEIVABLE', voided: false },
      include: { shipment: { include: { customer: true } } }
    });
    if (fees.length + manualFees.length !== feeIds.length) {
      throw new BadRequestException('应收费用不存在');
    }
    if (fees.some((fee) => fee.shipment.customerId !== input.customerId) || manualFees.some((fee: any) => fee.shipment.customerId !== input.customerId)) {
      throw new BadRequestException('应收费用不属于该客户');
    }
    if (fees.some((fee) => fee.settled) || manualFees.some((fee: any) => fee.reconciliationStatus === 'CONFIRMED' || fee.reconciliationStatus === 'LOCKED')) {
      throw new BadRequestException('应收费用已核销');
    }
    const settledAmount = roundMoney(
      fees.reduce((sum, fee) => sum + Number(fee.amount), 0) + manualFees.reduce((sum: number, fee: any) => sum + Number(fee.amount), 0)
    );
    if (input.amount < settledAmount) {
      throw new BadRequestException('收款金额不足以核销选中费用');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          partyType: 'CUSTOMER',
          partyId: input.customerId,
          amount: input.amount
        }
      });
      const afterReceiptBalance = roundMoney(Number(account.balance) + input.amount);
      await tx.customerAccount.update({
        where: { id: account.id },
        data: { balance: afterReceiptBalance }
      });
      await tx.accountLedger.create({
        data: {
          partyType: 'CUSTOMER',
          partyId: input.customerId,
          amount: input.amount,
          balance: afterReceiptBalance,
          note: input.note?.trim() || '收款登记'
        }
      });

      let finalBalance = afterReceiptBalance;
      if (settledAmount > 0) {
        finalBalance = roundMoney(afterReceiptBalance - settledAmount);
        await tx.receivableFee.updateMany({ where: { id: { in: fees.map((fee) => fee.id) } }, data: { settled: true } });
        if (manualFees.length > 0) {
          await (tx as any).shipmentFinanceItem.updateMany({
            where: { id: { in: manualFees.map((fee: any) => fee.id) } },
            data: { reconciliationStatus: 'CONFIRMED', locked: true, reviewedBy: 'system', reviewedAt: new Date() }
          });
        }
        await tx.customerAccount.update({
          where: { id: account.id },
          data: { balance: finalBalance }
        });
        await tx.accountLedger.create({
          data: {
            partyType: 'CUSTOMER',
            partyId: input.customerId,
            amount: -settledAmount,
            balance: finalBalance,
            note: '核销应收费用'
          }
        });
        await tx.settlement.createMany({
          data: [
            ...fees.map((fee) => ({
              paymentId: payment.id,
              feeId: fee.id,
              amount: Number(fee.amount)
            })),
            ...manualFees.map((fee: any) => ({
              paymentId: payment.id,
              feeId: fee.id,
              amount: Number(fee.amount)
            }))
          ]
        });
      }

      let statement: CustomerStatementSummary | undefined;
      if (input.statementId) {
        const updated = await tx.customerStatement.updateMany({
          where: { id: input.statementId, customerId: input.customerId },
          data: { status: 'SETTLED' }
        });
        if (updated.count > 0) {
          const row = await tx.customerStatement.findUnique({ where: { id: input.statementId } });
          if (row) {
            statement = {
              id: row.id,
              customerId: row.customerId,
              customerName: `${customer.code}-${customer.name}`,
              periodStart: row.createdAt.toISOString().slice(0, 10),
              periodEnd: row.createdAt.toISOString().slice(0, 10),
              total: Number(row.total),
              feeCount: 0,
              status: row.status as CustomerStatementSummary['status'],
              createdAt: row.createdAt.toISOString()
            };
          }
        }
      }

      return {
        payment,
        accountBalance: finalBalance,
        statement
      };
    });

    const paymentSummary = summarizePaymentSettlement({
      id: result.payment.id,
      customerId: customer.id,
      customerName: `${customer.code}-${customer.name}`,
      amount: Number(result.payment.amount),
      settledAmount,
      createdAt: result.payment.createdAt.toISOString()
    });

    return {
      payment: paymentSummary,
      account: {
        customerId: customer.id,
        customerName: `${customer.code}-${customer.name}`,
        balance: result.accountBalance,
        currency: account.currency
      },
      settledFees: [
        ...fees.map((fee) => ({
          id: fee.id,
          shipmentId: fee.shipmentId,
          systemOrderNo: fee.shipment.systemOrderNo,
          customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
          name: fee.name,
          amount: Number(fee.amount),
          settled: true
        })),
        ...manualFees.map((fee: any) => ({
          id: fee.id,
          shipmentId: fee.shipmentId,
          systemOrderNo: fee.shipment.systemOrderNo,
          customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
          name: fee.name,
          amount: Number(fee.amount),
          settled: true
        }))
      ],
      statement: result.statement
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

    const scope = this.operatorCustomerScope(principal);
    if (scope) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { salesperson: true } });
      if (!customer || !customer.salesperson || !scope.includes(customer.salesperson)) {
        throw new ForbiddenException('业务员只能操作自己名下客户');
      }
    }

    const now = new Date();
    const initialStatus: ShipmentStatus = principal.role === 'CUSTOMER' ? 'DRAFT' : input.initialStatus ?? 'DRAFT';
    if (!['DRAFT', 'REVIEW_PENDING', 'DECLARED'].includes(initialStatus)) {
      throw new BadRequestException('新建运单不能直接进入该状态，请按审核、排货、出库流程操作');
    }
    const latestTracking = input.latestTracking?.trim() || (this.isReviewPendingStatus(initialStatus) ? '新建出货订单，待审核' : '客户已预报');
    const systemOrderNo =
      principal.role === 'CUSTOMER'
        ? await this.nextSystemOrderNo(input.businessType, now)
        : input.outboundOrderNo?.trim() || input.systemOrderNo?.trim() || (await this.nextSystemOrderNo(input.businessType, now));
    const requestedWarehousePackageIds = Array.from(
      new Set([...(input.warehousePackageIds ?? []), ...(input.draftWarehousePackageIds ?? [])].map((id) => id.trim()).filter(Boolean))
    );
    const shouldBindWarehousePackages = input.bindWarehousePackages ?? Boolean((input.warehousePackageIds ?? []).length);
    const warehousePackageIdsToBind = shouldBindWarehousePackages ? requestedWarehousePackageIds : [];
    const draftWarehousePackageIds = shouldBindWarehousePackages ? [] : requestedWarehousePackageIds;
    if (requestedWarehousePackageIds.length) {
      const packages = await this.prisma.warehousePackage.findMany({
        where: { id: { in: requestedWarehousePackageIds } },
        select: { id: true, shipmentId: true, systemOrderNo: true, measurementStatus: true }
      });
      if (packages.length !== requestedWarehousePackageIds.length) {
        throw new BadRequestException('部分仓库包裹不存在');
      }
      const boundPackage = shouldBindWarehousePackages ? packages.find((pkg) => pkg.shipmentId || pkg.systemOrderNo) : undefined;
      if (boundPackage) {
        throw new BadRequestException('选中的仓库包裹已绑定运单，请重新选择待录单包裹');
      }
      if (packages.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
        throw new BadRequestException('理货后包裹待重新过机，完成测量后才能录单');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          customerId,
          channelId: input.channelId,
          agentId: input.agentId,
          customerOrderNo: input.customerOrderNo.trim(),
          systemOrderNo,
          subOrderNo: input.subOrderNo?.trim() || undefined,
          inboundNo: input.inboundNo?.trim() || undefined,
          productName: input.productName?.trim() || undefined,
          declarationRequired: input.declarationRequired ?? false,
          sensitive: input.sensitive ?? false,
          cargoType: input.cargoType?.trim() || undefined,
          volumeCbm: input.volumeCbm ?? undefined,
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
          outboundAt: input.outboundAt ? new Date(input.outboundAt) : undefined,
          remark: input.remark?.trim() || undefined,
          entryBy: principal.username,
          businessType: input.businessType,
          status: initialStatus,
          destinationCountry: input.destinationCountry.trim(),
          packageType: input.packageType,
          packageCount: input.packageCount,
          receivableWeightKg: input.receivableWeightKg,
          agentWeightKg: input.agentWeightKg ?? input.receivableWeightKg,
          latestTracking: '',
          trackingStaleDays: 0,
          isRemoteArea: false,
          draftWarehousePackageIds,
          createdAt: now,
          packages: {
            create: {
              lengthCm: 0,
              widthCm: 0,
              heightCm: 0,
              actualKg: input.receivableWeightKg,
              volumeKg: input.receivableWeightKg
            }
          },
          events: { create: { toStatus: initialStatus, note: this.isReviewPendingStatus(initialStatus) ? '创建出货订单' : '创建预报' } }
        },
        include: shipmentIncludes
      });

      if (warehousePackageIdsToBind.length) {
        await tx.warehousePackage.updateMany({
          where: { id: { in: warehousePackageIdsToBind } },
          data: { shipmentId: shipment.id, systemOrderNo }
        });
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'shipment.warehouse_packages.bind',
            target: `shipment:${shipment.id}`,
            after: { warehousePackageIds: warehousePackageIdsToBind, systemOrderNo }
          }
        });
      } else if (draftWarehousePackageIds.length) {
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'shipment.warehouse_packages.snapshot',
            target: `shipment:${shipment.id}`,
            after: { draftWarehousePackageIds, systemOrderNo }
          }
        });
      }

      return shipment;
    });

    return mapShipment(created);
  }

  async importShipments(principal: Principal, request: ShipmentImportRequest): Promise<ShipmentImportResponse> {
    const validation = validateShipmentImportRows(request.rows);
    const created: Shipment[] = [];
    const customerId = principal.role === 'CUSTOMER' ? principal.customerId : request.customerId;

    if (!customerId) {
      throw new BadRequestException('缺少客户');
    }

    for (const row of validation.validRows) {
      const channel = await this.prisma.channel.findFirst({
        where: { name: { contains: row.channelName } }
      });
      created.push(
        await this.createShipment(principal, {
          customerId,
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
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (shipment.status === 'DECLARED') {
      if (!canTransitionShipment('DECLARED', 'WAITING_RECEIVE')) {
        throw new BadRequestException('当前状态不允许确认收货');
      }
      const updated = await this.updateShipmentStatus(shipment.id, 'DECLARED', 'WAITING_RECEIVE', '确认收货');
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'shipment.receive',
          target: shipment.id,
          before: { status: shipment.status },
          after: { status: updated.status }
        }
      });
      return updated;
    }

    throw new BadRequestException('当前状态不允许确认收货');
  }

  async routeShipment(principal: Principal, shipmentId: string, body: ShipmentRouteInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
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
    const channel = await this.prisma.channel.findUnique({ where: { id: body.channelId } });
    if (!channel || !channel.enabled) {
      throw new BadRequestException('渠道不存在');
    }
    const agent = await this.prisma.agent.findUnique({ where: { id: body.agentId } });
    if (!agent || !agent.enabled) {
      throw new BadRequestException('代理不存在');
    }
    const agentChannel = agent
      ? await this.prisma.agentChannel.findFirst({ where: { agentId: agent.id, enabled: true } })
        ?? await this.prisma.agentChannel.findFirst({ where: { agentId: agent.id } })
      : null;
    const payableTotal = roundMoney(chargeWeightKg * unitPrice + otherFee);
    const routedAt = new Date().toISOString();

    let routePayable: any;
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).shipmentFinanceItem.updateMany({
        where: { shipmentId: shipment.id, type: 'PAYABLE', name: '代理成本', voided: false, locked: false },
        data: { voided: true, voidedAt: new Date(routedAt) }
      });
      routePayable = await (tx as any).shipmentFinanceItem.create({
        data: {
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
          remark: formatRoutePayableRemark(manualAgentChannelName, otherFee, otherFeeRemark),
          createdBy: principal.username
        }
      });
      await (tx as any).shipment.update({
        where: { id: shipment.id },
        data: { channelId: channel.id, agentId: agent.id, shippingMarkRequired: body.shippingMarkRequired === true }
      });
      const existingAgentChannel = await (tx as any).agentChannel.findFirst({
        where: { agentId: agent.id, channelName: manualAgentChannelName }
      });
      if (existingAgentChannel) {
        if (!existingAgentChannel.enabled) {
          await (tx as any).agentChannel.update({ where: { id: existingAgentChannel.id }, data: { enabled: true } });
        }
      } else {
        const routeCosts = await (tx as any).shipmentFinanceItem.findMany({
          where: {
            type: 'PAYABLE',
            name: '代理成本',
            voided: false,
            shipment: { agentId: agent.id }
          },
          select: { remark: true }
        });
        const usageCount = routeCosts.filter((item: { remark?: string | null }) => parseRoutePayableRemark(item.remark).agentChannelName === manualAgentChannelName).length;
        if (usageCount >= 10) {
          await (tx as any).agentChannel.create({
            data: {
              id: `ach-${slug(`${agent.id}-${manualAgentChannelName}`)}`,
              agentId: agent.id,
              channelName: manualAgentChannelName
            }
          });
        }
      }
    });

    const updated = shouldApprove
      ? await this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'WAITING_DISPATCH', '排货')
      : mapShipment(await this.getVisibleShipment(principal, shipment.id));
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: shouldApprove ? 'shipment.route' : 'shipment.route.update',
        target: shipment.id,
        before: {
          status: shipment.status,
          channelId: shipment.channelId,
          agentId: shipment.agentId
        },
        after: {
          status: updated.status,
          routeStatus: updated.status,
          statusFrom: shipment.status,
          statusTo: updated.status,
          companyChannelId: channel.id,
          companyChannelName: channel.name,
          agentId: agent.id,
          realAgentName: agent.name,
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
          shippingMarkRequired: body.shippingMarkRequired === true
        }
      }
    });
    if (shouldApprove) void this.lineage?.recordEvent('market.pending_routing.route', {
      actorUsername: principal.username,
      businessId: updated.id,
      payload: {
        shipmentId: updated.id,
        systemOrderNo: updated.systemOrderNo,
        statusFrom: shipment.status,
        statusTo: updated.status,
        companyChannelId: channel.id,
        companyChannelName: channel.name,
        agentId: agent.id,
        agentName: agent.name,
        agentChannelId: agentChannel?.id,
        agentChannelName: manualAgentChannelName,
        payableFinanceItemId: routePayable?.id,
        chargeWeightKg,
        unitPrice,
        otherFee,
        otherFeeRemark,
        currency: body.currency ?? 'RMB',
        payableTotal,
        shippingMarkRequired: body.shippingMarkRequired === true,
        routedBy: principal.username,
        routedAt
      },
      sourceRefs: [
        { nodeType: 'shipment', id: updated.id },
        { nodeType: 'company_channel', id: channel.id },
        { nodeType: 'agent', id: agent.id },
        ...(agentChannel?.id ? [{ nodeType: 'agent_channel', id: agentChannel.id }] : []),
        ...(routePayable?.id ? [{ nodeType: 'payable_finance_item', id: routePayable.id }] : [])
      ],
      metrics: {
        chargeWeightKg,
        unitPrice,
        otherFee,
        payableTotal,
        shippingMarkRequired: body.shippingMarkRequired === true
      }
    });
    return updated;
  }

  async dispatchShipment(principal: Principal, shipmentId: string, body: ShipmentDispatchInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const transferNo = body.transferNo ?? shipment.transferNo;
    if (transferNo) {
      const voidedLabel = await this.prisma.shipmentLabel.findFirst({
        where: { shipmentId: shipment.id, transferNo, status: 'VOIDED' }
      });
      if (voidedLabel) {
        throw new BadRequestException('已作废面单不能出库');
      }
    }
    if (!canTransitionShipment(shipment.status as ShipmentStatus, 'OUTBOUNDED')) {
      throw new BadRequestException('当前状态不允许出库');
    }
    const routeLog = await this.prisma.auditLog.findFirst({
      where: { action: 'shipment.route', target: shipment.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, after: true, createdAt: true }
    });
    if (!routeLog) {
      throw new BadRequestException('运单排货后才能出库');
    }
    const routed = routeLog.after as { agentId?: string; agentChannelName?: string; payableTotal?: number } | null | undefined;
    if (!shipment.agentId || !shipment.channelId || !routed?.agentChannelName || !routed.payableTotal || routed.payableTotal <= 0) {
      throw new BadRequestException('请先完成代理、渠道和市场成本排货');
    }
    const handover = await this.latestWarehouseHandover(shipment.id);
    if (!handover || handover.agentId !== shipment.agentId) {
      await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'shipment.dispatch.blocked', target: shipment.id, after: { reason: '请先打印代理交接单', agentId: shipment.agentId } } });
      throw new BadRequestException('请先打印代理交接单');
    }
    if ((shipment as any).shippingMarkRequired && body.shippingMarkConfirmed !== true) {
      throw new BadRequestException('该票需要贴麦头，请确认已贴麦头后再出库');
    }
    if (transferNo && transferNo !== shipment.transferNo) {
      await this.ensureTransferDataApproved(principal, shipment.id);
    }
    const warehousePackages = await (this.prisma as any).warehousePackage.findMany({
      where: { shipmentId: shipment.id },
      select: { id: true, status: true }
    });
    const warehousePackageIds: string[] = warehousePackages.map((pkg: any) => String(pkg.id));
    const handoverNo = handover.handoverNo;
    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { transferNo: transferNo ?? null, outboundAt: new Date(), latestTracking: '仓库已出库，等待客服补齐转单号', trackingStaleDays: 0 }
    });
    const updated = await this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'OUTBOUNDED', '仓库出库');
    if (warehousePackageIds.length) {
      await (this.prisma as any).warehousePackage.updateMany({
        where: { id: { in: warehousePackageIds } },
        data: { status: 'SHIPPED' }
      });
    }
    if (updated.transferNo) {
      await this.ensureCarrierTask(updated.id, updated.carrier, updated.transferNo);
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.dispatch',
        target: shipment.id,
        before: {
          status: shipment.status,
          transferNo: shipment.transferNo,
          outboundAt: shipment.outboundAt
        },
        after: {
          status: updated.status,
          statusFrom: shipment.status,
          statusTo: updated.status,
          transferNo: updated.transferNo,
          outboundAt: updated.outboundAt,
          outboundOrderNo: updated.systemOrderNo,
          handoverNo,
          agentName: updated.agentName,
          agentChannelName: (routeLog.after as { agentChannelName?: string } | null | undefined)?.agentChannelName,
          channelName: updated.channelName || updated.carrier,
          packageCount: updated.packageCount,
          chargeableWeightKg: updated.receivableWeightKg,
          waitingDispatchAt: (routeLog.after as { routedAt?: string } | null | undefined)?.routedAt ?? routeLog.createdAt.toISOString(),
          outboundBy: principal.username,
          batchDispatchSource: body.batchDispatchSource,
          customerServiceReceiveStatus: 'PENDING_CONFIRMATION',
          archiveStatus: '已出库归档',
          warehousePackageIds,
          warehousePackageStatuses: warehousePackages.map((pkg: any) => ({ id: pkg.id, from: pkg.status, to: 'SHIPPED' })),
          warehousePackageStatusTo: warehousePackageIds.length ? 'SHIPPED' : undefined,
          shippingMarkRequired: (shipment as any).shippingMarkRequired === true,
          shippingMarkConfirmed: body.shippingMarkConfirmed === true
        }
      }
    });
    const result = {
      ...updated,
      handoverNo,
      outboundBy: principal.username,
      batchDispatchSource: body.batchDispatchSource
    };
    void this.lineage?.recordEvent('warehouse.queue.dispatch', {
      actorUsername: principal.username,
      businessId: updated.id,
      payload: {
        shipmentId: updated.id,
        systemOrderNo: updated.systemOrderNo,
        handoverNo,
        transferNo: updated.transferNo,
        statusFrom: shipment.status,
        statusTo: updated.status,
        warehousePackageIds,
        shippingMarkConfirmed: body.shippingMarkConfirmed === true,
        outboundBy: principal.username,
        outboundAt: updated.outboundAt
      },
      sourceRefs: [
        { nodeType: 'shipment', id: updated.id },
        ...warehousePackageIds.map((id) => ({ nodeType: 'warehouse_package', id }))
      ],
      metrics: {
        packageCount: updated.packageCount,
        chargeableWeightKg: updated.receivableWeightKg,
        warehousePackageCount: warehousePackageIds.length
      }
    });
    return result;
  }

  async printWarehouseHandover(principal: Principal, input: WarehouseHandoverPrintInput): Promise<WarehouseHandoverPrintResponse> {
    const ids = Array.from(new Set(input.shipmentIds ?? [])).filter((id): id is string => typeof id === 'string' && Boolean(id));
    if (!ids.length) throw new BadRequestException('请先选择待出库订单');
    const rows = await Promise.all(ids.map((id) => this.getVisibleShipment(principal, id)));
    const invalid = rows.find((shipment) => shipment.status !== 'WAITING_DISPATCH' || !shipment.agentId || !shipment.agent?.enabled);
    if (invalid) throw new BadRequestException('代理资料未匹配，请返回待排货重新选择有效代理');
    const now = new Date().toISOString();
    const summaries = await Promise.all(rows.map(async (shipment, index) => {
      const previous = await this.latestWarehouseHandover(shipment.id);
      const agent = shipment.agent!;
      const summary: WarehouseHandoverSummary = {
        shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo,
        handoverNo: previous?.handoverNo ?? `HD-${now.slice(0, 10).replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`,
        agentId: agent.id, agentShortName: agent.shortName || agent.name, agentFullName: agent.name,
        agentChannelName: parseRoutePayableRemark((shipment.financeItems ?? []).find((item: any) => item.name === '代理成本')?.remark).agentChannelName ?? shipment.channel?.name ?? '-',
        packageCount: shipment.packageCount, printedBy: previous?.printedBy ?? principal.username,
        firstPrintedAt: previous?.firstPrintedAt ?? now, lastPrintedAt: now, printCount: (previous?.printCount ?? 0) + 1
      };
      await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'warehouse.handover.print', target: shipment.id, before: previous as any, after: summary as any } });
      return summary;
    }));
    return { rows: summaries };
  }

  async getWarehouseHandover(principal: Principal, shipmentId: string): Promise<WarehouseHandoverSummary> {
    await this.getVisibleShipment(principal, shipmentId);
    const summary = await this.latestWarehouseHandover(shipmentId);
    if (!summary) throw new NotFoundException('尚未打印代理交接单');
    return summary;
  }

  private async latestWarehouseHandover(shipmentId: string): Promise<WarehouseHandoverSummary | undefined> {
    const row = await this.prisma.auditLog.findFirst({ where: { action: 'warehouse.handover.print', target: shipmentId }, orderBy: { createdAt: 'desc' }, select: { after: true } });
    return row?.after as unknown as WarehouseHandoverSummary | undefined;
  }

  async rerouteShipment(principal: Principal, shipmentId: string, body: ShipmentRerouteInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
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
      channelName: shipment.channel?.name,
      agentId: shipment.agentId,
      agentName: shipment.agent?.name
    };
    const returnedAt = new Date().toISOString();
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, 'WAITING_SORT', `代理退回重排：${reason}`);
    const updatedRow = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'WAITING_SORT',
        latestTracking: '代理退回，等待市场重新排货',
        trackingStaleDays: 0
      },
      include: shipmentIncludes
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.reroute_return',
        target: shipment.id,
        before,
        after: {
          status: 'WAITING_SORT',
          statusFrom: shipment.status,
          statusTo: 'WAITING_SORT',
          reason,
          returnedBy: principal.username,
          returnedAt
        }
      }
    });
    void this.lineage?.recordEvent('market.routed.reroute', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        statusFrom: shipment.status,
        statusTo: 'WAITING_SORT',
        reason,
        returnedBy: principal.username,
        returnedAt,
        previousChannelId: before.channelId,
        previousChannelName: before.channelName,
        previousAgentId: before.agentId,
        previousAgentName: before.agentName
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { statusFrom: shipment.status, statusTo: 'WAITING_SORT' }
    });
    return { ...mapShipment(updatedRow), routeReturnedAt: returnedAt };
  }

  async deletePendingRoutingShipment(principal: Principal, shipmentId: string, input: ShipmentReviewDeleteInput = {}): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const reason = input.reason?.trim();
    if (!reason) {
      throw new BadRequestException('请填写删除原因');
    }
    if (shipment.deletedAt) {
      throw new NotFoundException('运单不存在');
    }
    if (shipment.status !== 'WAITING_SORT') {
      throw new BadRequestException('只有待排货运单可以删除');
    }
    const deletedAt = new Date();
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `删除待排货：${reason}`);
    const deleted = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        deletedAt,
        deletedBy: principal.username,
        deletedReason: reason,
        deleteType: 'MANUAL'
      },
      include: shipmentIncludes
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.route.delete',
        target: shipment.id,
        before: toAuditJson(mapShipment(shipment)),
        after: toAuditJson({
          ...mapShipment(deleted),
          statusBefore: shipment.status,
          deleteReason: reason,
          deletedBy: principal.username,
          deletedAt: deletedAt.toISOString()
        })
      }
    });
    void this.lineage?.recordEvent('market.pending_routing.delete', {
      actorUsername: principal.username,
      businessId: shipment.id,
      payload: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        statusBefore: shipment.status,
        deleteReason: reason,
        deletedBy: principal.username,
        deletedAt: deletedAt.toISOString()
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { statusBefore: shipment.status, deleteType: 'MANUAL' }
    });
    return mapShipment(deleted);
  }

  async approveShipmentBusinessData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以审核业务数据');
    }
    if (shipment.status !== 'OUTBOUNDED') {
      throw new BadRequestException('排货后才能审核业务数据');
    }
    if (await this.isCustomerServiceDataApproved(shipmentId, 'business')) throw new BadRequestException('业务数据已审核，请先反审核');
    const mapped = mapShipment(shipment);
    const reviewedAt = new Date().toISOString();
    const differenceFeedback = body.remark?.trim() || undefined;
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'customer_service.business_data.approved',
        target: shipment.id,
        before: toAuditJson({
          status: shipment.status,
          businessDataReviewStatus: 'PENDING'
        }),
        after: toAuditJson({
          status: shipment.status,
          statusFrom: shipment.status,
          statusTo: shipment.status,
          businessDataReviewStatus: 'APPROVED',
          reviewer: principal.username,
          reviewedBy: principal.username,
          reviewedAt,
          differenceFeedback,
          remark: differenceFeedback,
          customerCode: mapped.customerCode,
          systemOrderNo: mapped.systemOrderNo,
          destinationCountry: mapped.destinationCountry,
          packageCount: mapped.packageCount,
          chargeableWeightKg: mapped.receivableWeightKg,
          declarationRequired: mapped.declarationRequired,
          sensitive: mapped.sensitive,
          customerServiceReceiveStatus: 'BUSINESS_DATA_APPROVED'
        })
      }
    });
    void this.lineage?.recordEvent('customer_service.data_confirm.approve', {
      actorUsername: principal.username,
      businessId: mapped.id,
      payload: {
        reviewType: 'BUSINESS_DATA',
        shipmentId: mapped.id,
        systemOrderNo: mapped.systemOrderNo,
        customerOrderNo: mapped.customerOrderNo,
        statusFrom: mapped.status,
        statusTo: mapped.status,
        reviewStatus: 'APPROVED',
        reviewedBy: principal.username,
        reviewedAt,
        differenceFeedback,
        customerCode: mapped.customerCode,
        destinationCountry: mapped.destinationCountry,
        packageCount: mapped.packageCount,
        chargeableWeightKg: mapped.receivableWeightKg,
        declarationRequired: mapped.declarationRequired,
        sensitive: mapped.sensitive
      },
      sourceRefs: [{ nodeType: 'shipment', id: mapped.id }],
      metrics: {
        packageCount: mapped.packageCount,
        chargeableWeightKg: mapped.receivableWeightKg,
        declarationRequired: mapped.declarationRequired ? 1 : 0,
        sensitive: mapped.sensitive ? 1 : 0
      }
    });
    return mapped;
  }

  async approveShipmentAgentData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以审核代理数据');
    }
    if (shipment.status !== 'OUTBOUNDED') {
      throw new BadRequestException('排货后才能审核代理数据');
    }
    if (await this.isCustomerServiceDataApproved(shipmentId, 'agent')) throw new BadRequestException('代理数据已审核，请先反审核');
    const mapped = mapShipment(shipment);
    const reviewedAt = new Date().toISOString();
    const differenceFeedback = body.remark?.trim() || undefined;
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'customer_service.agent_data.approved',
        target: shipment.id,
        before: toAuditJson({
          status: shipment.status,
          agentId: shipment.agentId,
          channelId: shipment.channelId,
          agentDataReviewStatus: 'PENDING'
        }),
        after: toAuditJson({
          status: shipment.status,
          statusFrom: shipment.status,
          statusTo: shipment.status,
          agentDataReviewStatus: 'APPROVED',
          agentId: shipment.agentId,
          agentName: mapped.agentName,
          channelId: shipment.channelId,
          agentChannelName: mapped.channelName || mapped.carrier,
          agentChargeWeightKg: mapped.agentWeightKg,
          reviewer: principal.username,
          reviewedBy: principal.username,
          reviewedAt,
          differenceFeedback,
          remark: differenceFeedback,
          customerCode: mapped.customerCode,
          systemOrderNo: mapped.systemOrderNo,
          customerServiceReceiveStatus: 'AGENT_DATA_APPROVED'
        })
      }
    });
    void this.lineage?.recordEvent('customer_service.data_confirm.approve', {
      actorUsername: principal.username,
      businessId: mapped.id,
      payload: {
        reviewType: 'AGENT_DATA',
        shipmentId: mapped.id,
        systemOrderNo: mapped.systemOrderNo,
        customerOrderNo: mapped.customerOrderNo,
        statusFrom: mapped.status,
        statusTo: mapped.status,
        reviewStatus: 'APPROVED',
        agentId: shipment.agentId,
        agentName: mapped.agentName,
        channelId: shipment.channelId,
        agentChannelName: mapped.channelName || mapped.carrier,
        agentChargeWeightKg: mapped.agentWeightKg,
        reviewedBy: principal.username,
        reviewedAt,
        differenceFeedback,
        customerCode: mapped.customerCode
      },
      sourceRefs: [{ nodeType: 'shipment', id: mapped.id }],
      metrics: {
        agentChargeWeightKg: mapped.agentWeightKg,
        hasAgent: shipment.agentId ? 1 : 0,
        hasChannel: shipment.channelId ? 1 : 0
      }
    });
    return mapped;
  }

  async updateShipmentBusinessData(principal: Principal, shipmentId: string, body: { packageCount: number; weightKg: number; volumeCbm: number; chargeWeightKg: number; remark?: string; pushToSales?: boolean }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.ensureCustomerServiceDataEditable(principal, shipment, 'business');
    this.validateCustomerServiceData(body);
    const updated = await this.prisma.$transaction(async (tx) => {
      const costs = await (tx as any).shipmentFinanceItem.findMany({ where: { shipmentId, type: 'BUSINESS_COST', voided: false } });
      if (costs.some((item: any) => item.locked || item.reconciliationStatus === 'CONFIRMED')) throw new BadRequestException('业务成本已锁定，不能修改计费重');
      await Promise.all(costs.map((item: any) => (tx as any).shipmentFinanceItem.update({ where: { id: item.id }, data: { chargeWeightKg: body.chargeWeightKg, ...(item.unitPrice && !item.amountOverridden ? { amount: roundMoney(Number(body.chargeWeightKg) * Number(item.unitPrice)) } : {}) } })));
      return tx.shipment.update({ where: { id: shipmentId }, data: { packageCount: Math.floor(body.packageCount), actualWeightKg: body.weightKg, volumeCbm: body.volumeCbm, receivableWeightKg: body.chargeWeightKg }, include: shipmentIncludes });
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'customer_service.business_data.updated', target: shipmentId, before: toAuditJson(mapShipment(shipment)), after: toAuditJson({ ...mapShipment(updated), reviewStatus: 'PENDING', snapshot: body, remark: body.remark?.trim(), pushTaskStatus: body.pushToSales ? 'PENDING' : undefined }) } });
    if (body.pushToSales) await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'customer_service.business_data.push_pending', target: shipmentId, after: toAuditJson({ customerCode: mapShipment(updated).customerCode, systemOrderNo: mapShipment(updated).systemOrderNo, channelName: mapShipment(updated).channelName, snapshot: body, remark: body.remark?.trim(), status: 'PENDING' }) } });
    return mapShipment(updated);
  }

  async updateShipmentAgentData(principal: Principal, shipmentId: string, body: { packageCount: number; weightKg: number; volumeCbm: number; chargeWeightKg: number; remark?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.ensureCustomerServiceDataEditable(principal, shipment, 'agent');
    this.validateCustomerServiceData(body);
    const updated = await this.prisma.$transaction(async (tx) => {
      const costs = await (tx as any).shipmentFinanceItem.findMany({ where: { shipmentId, type: 'PAYABLE', voided: false } });
      if (costs.some((item: any) => item.locked || item.reconciliationStatus === 'CONFIRMED')) throw new BadRequestException('应付成本已锁定，不能修改计费重');
      await Promise.all(costs.map((item: any) => (tx as any).shipmentFinanceItem.update({ where: { id: item.id }, data: { chargeWeightKg: body.chargeWeightKg, ...(item.unitPrice && !item.amountOverridden ? { amount: roundMoney(Number(body.chargeWeightKg) * Number(item.unitPrice)) } : {}) } })));
      return tx.shipment.update({ where: { id: shipmentId }, data: { agentWeightKg: body.chargeWeightKg }, include: shipmentIncludes });
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'customer_service.agent_data.updated', target: shipmentId, before: toAuditJson(mapShipment(shipment)), after: toAuditJson({ ...mapShipment(updated), reviewStatus: 'PENDING', snapshot: body, remark: body.remark?.trim() }) } });
    return mapShipment(updated);
  }

  async reverseShipmentBusinessData(principal: Principal, shipmentId: string, body: { reason?: string }): Promise<Shipment> {
    return this.reverseCustomerServiceData(principal, shipmentId, 'business', body.reason);
  }

  async reverseShipmentAgentData(principal: Principal, shipmentId: string, body: { reason?: string }): Promise<Shipment> {
    return this.reverseCustomerServiceData(principal, shipmentId, 'agent', body.reason);
  }

  async approveShipmentAllData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.ensureCustomerServiceDataEditable(principal, shipment, 'business');
    await this.ensureCustomerServiceDataEditable(principal, shipment, 'agent');
    await this.approveShipmentBusinessData(principal, shipmentId, body);
    return this.approveShipmentAgentData(principal, shipmentId, body);
  }

  async reverseShipmentAllData(principal: Principal, shipmentId: string, body: { reason?: string }): Promise<Shipment> {
    if (!await this.isCustomerServiceDataApproved(shipmentId, 'business') || !await this.isCustomerServiceDataApproved(shipmentId, 'agent')) throw new BadRequestException('仅两组数据均已审核时可全部反审核');
    await this.reverseCustomerServiceData(principal, shipmentId, 'business', body.reason);
    return this.reverseCustomerServiceData(principal, shipmentId, 'agent', body.reason);
  }

  async updateShipmentOperational(principal: Principal, shipmentId: string, input: ShipmentOperationalUpdateInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const latestTracking = input.latestTracking?.trim();
    const transferNo = input.transferNo !== undefined ? input.transferNo.trim() || null : shipment.transferNo ?? null;
    const subOrderNo = input.subOrderNo !== undefined ? input.subOrderNo.trim() || null : shipment.subOrderNo ?? null;
    const etaAt = input.etaAt ? this.parseTrackingDate(input.etaAt) : null;
    const etdAt = input.etdAt ? this.parseTrackingDate(input.etdAt) : null;
    const channel = input.channelId
      ? await this.prisma.channel.findFirst({ where: { id: input.channelId, enabled: true } })
      : null;
    if (input.channelId && !channel) {
      throw new BadRequestException('渠道不存在');
    }
    const currentStatus = shipment.status as ShipmentStatus;
    let nextStatus = input.status ?? currentStatus;
    if (currentStatus === 'OUTBOUNDED' && nextStatus === 'WAITING_DEPARTURE') {
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
    if (!latestTracking && input.latestTracking !== undefined) {
      throw new BadRequestException('最新轨迹不能为空');
    }
    if (shipment.status !== nextStatus && !canTransitionShipment(currentStatus, nextStatus)) {
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
    if (currentStatus !== 'SIGNED' && nextStatus === 'SIGNED' && !(await this.hasAnyPermission(principal.role, ['customer-service:delivering:confirm-signed', 'customer-service:signed:confirm']))) {
      await this.recordPermissionDenied(principal, { permissions: ['customer-service:delivering:confirm-signed', 'customer-service:signed:confirm'], method: 'PATCH', path: `/api/shipments/${shipmentId}/operational` });
      throw new ForbiddenException('没有确认签收权限');
    }
    if (currentStatus !== nextStatus && nextStatus === 'DEPARTED') {
      if (!(await this.hasPermission(principal.role, 'customer-service:waiting-departure:confirm-departure'))) {
        await this.recordPermissionDenied(principal, { permissions: ['customer-service:waiting-departure:confirm-departure'], method: 'PATCH', path: `/api/shipments/${shipmentId}/operational` });
        throw new ForbiddenException('没有确认离港权限');
      }
      if (currentStatus !== 'WAITING_DEPARTURE') {
        throw new BadRequestException('只有待离港运单可以确认离港');
      }
    }
    if (currentStatus === nextStatus && input.status === 'DEPARTED') {
      throw new BadRequestException('运单已离港，不能重复确认离港');
    }
    if (nextStatus === 'DEPARTED' && (!(etaAt ?? shipment.etaAt) || !(etdAt ?? shipment.etdAt))) {
      throw new BadRequestException('确认离港前必须填写 ETA 和 ETD');
    }
    const statusRemark = input.statusRemark?.trim();
    if (currentStatus !== nextStatus && nextStatus === 'DEPARTED' && !statusRemark) {
      throw new BadRequestException('确认离港请填写离港批注');
    }

    const notes: string[] = [];
    if (shipment.transferNo !== transferNo) {
      notes.push(`更新转单号：${shipment.transferNo ?? '空'} -> ${transferNo ?? '空'}`);
    }
    if (shipment.subOrderNo !== subOrderNo) {
      notes.push(`更新分单号：${shipment.subOrderNo ?? '空'} -> ${subOrderNo ?? '空'}`);
    }
    if (latestTracking !== undefined && shipment.latestTracking !== latestTracking) {
      notes.push(`更新最新轨迹：${latestTracking}`);
    }
    if (shipment.status !== nextStatus) {
      notes.push(`更新状态：${shipmentStatusLabels[shipment.status as ShipmentStatus]} -> ${shipmentStatusLabels[nextStatus]}`);
    }
    if (channel && shipment.channelId !== channel.id) {
      notes.push(`更新渠道：${shipment.channel?.name ?? '空'} -> ${channel.name}`);
    }
    const factUpdates = {
      customerOrderNo: input.customerOrderNo?.trim(),
      productName: input.productName?.trim(),
      destinationCountry: input.destinationCountry?.trim(),
      cargoType: input.cargoType?.trim(),
      settlementMethod: input.settlementMethod?.trim(),
      packageCount: input.packageCount,
      receivableWeightKg: input.receivableWeightKg,
      agentWeightKg: input.agentWeightKg ?? input.receivableWeightKg,
      volumeCbm: input.volumeCbm,
      declarationRequired: input.declarationRequired,
      sensitive: input.sensitive
    };
    if (factUpdates.customerOrderNo && shipment.customerOrderNo !== factUpdates.customerOrderNo) notes.push(`更新客户单号：${shipment.customerOrderNo} -> ${factUpdates.customerOrderNo}`);
    if (factUpdates.productName && (shipment as any).productName !== factUpdates.productName) notes.push(`更新品名：${(shipment as any).productName ?? '空'} -> ${factUpdates.productName}`);
    if (factUpdates.destinationCountry && shipment.destinationCountry !== factUpdates.destinationCountry) notes.push(`更新目的地：${shipment.destinationCountry} -> ${factUpdates.destinationCountry}`);
    if (etaAt) {
      notes.push(`更新 ETA：${etaAt.toISOString()}`);
    }
    if (etdAt) {
      notes.push(`更新 ETD：${etdAt.toISOString()}`);
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        latestTracking: latestTracking ?? shipment.latestTracking,
        transferNo,
        subOrderNo,
        ...(channel ? { channelId: channel.id } : {}),
        ...(factUpdates.customerOrderNo ? { customerOrderNo: factUpdates.customerOrderNo } : {}),
        ...(factUpdates.productName ? { productName: factUpdates.productName } : {}),
        ...(factUpdates.destinationCountry ? { destinationCountry: factUpdates.destinationCountry } : {}),
        ...(factUpdates.cargoType ? { cargoType: factUpdates.cargoType } : {}),
        ...(factUpdates.settlementMethod ? { settlementMethod: factUpdates.settlementMethod } : {}),
        ...(factUpdates.packageCount !== undefined ? { packageCount: factUpdates.packageCount } : {}),
        ...(factUpdates.receivableWeightKg !== undefined ? { receivableWeightKg: factUpdates.receivableWeightKg } : {}),
        ...(factUpdates.agentWeightKg !== undefined ? { agentWeightKg: factUpdates.agentWeightKg } : {}),
        ...(factUpdates.volumeCbm !== undefined ? { volumeCbm: factUpdates.volumeCbm } : {}),
        ...(factUpdates.declarationRequired !== undefined ? { declarationRequired: factUpdates.declarationRequired } : {}),
        ...(factUpdates.sensitive !== undefined ? { sensitive: factUpdates.sensitive } : {}),
        status: nextStatus,
        etaAt: etaAt ?? shipment.etaAt,
        etdAt: etdAt ?? shipment.etdAt,
        trackingStaleDays: latestTracking !== undefined ? 0 : shipment.trackingStaleDays,
        ...(latestTracking !== undefined
          ? {
              trackingEvents: {
                create: {
                  status: latestTracking,
                  happenedAt: new Date(),
                  visibleToCustomer: true,
                  carrier: shipment.channel?.carrier.name ?? undefined,
                  transferNo: transferNo ?? undefined,
                  rawContent: latestTracking,
                  source: 'MANUAL_ENTRY',
                  kind: 'LOGISTICS'
                }
              }
            }
          : {})
      },
      include: shipmentIncludes
    });

    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, nextStatus, notes.length > 0 ? `人工修改运单：${notes.join('；')}` : '人工修改运单');
    const beforeMapped = mapShipment(shipment);
    const mapped = mapShipment(updated);
    const transferNoChanged = beforeMapped.transferNo !== mapped.transferNo;
    const label = transferNoChanged && mapped.transferNo
      ? await this.prisma.shipmentLabel.findFirst({
          where: { shipmentId: shipment.id, transferNo: mapped.transferNo, status: 'CREATED' },
          orderBy: { createdAt: 'desc' }
        })
      : null;
    const trackingWebsite = input.trackingWebsite?.trim() || (mapped.transferNo ? trackingWebsiteForCarrier(mapped.carrier, mapped.transferNo) : undefined);
    const trackingWebsiteTouched = input.trackingWebsite !== undefined || input.trackingWebsiteVisibleToSales !== undefined;
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.operational.update',
        target: shipment.id,
        before: toAuditJson(beforeMapped),
        after: toAuditJson({
          ...mapped,
          ...(statusRemark ? { statusRemark, remark: statusRemark, comment: statusRemark } : {}),
          ...(trackingWebsiteTouched
            ? {
                trackingWebsite,
                trackingWebsiteVisibleToSales: input.trackingWebsiteVisibleToSales ?? false
              }
            : {}),
          ...(transferNoChanged
            ? {
                transferNoFrom: beforeMapped.transferNo,
                transferNoTo: mapped.transferNo,
                transferNoFilledBy: principal.username,
                transferNoFilledAt: new Date().toISOString(),
                labelUrl: label?.labelUrl ?? undefined
              }
            : {})
        })
      }
    });
    if (currentStatus !== nextStatus || (nextStatus === 'SIGNED' && input.status === 'SIGNED')) {
      const statusAt = new Date().toISOString();
      const statusEnteredAt = await this.shipmentStatusEnteredAt(shipment, currentStatus);
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'customer_service.status.update',
          target: shipment.id,
          before: toAuditJson({ status: currentStatus, statusAt: statusEnteredAt }),
          after: toAuditJson({
            status: nextStatus,
            statusFrom: currentStatus,
            statusTo: nextStatus,
            statusAt,
            dwellHours: dwellHours(statusEnteredAt, statusAt),
            latestTracking: mapped.latestTracking,
            etaAt: mapped.etaAt,
            etdAt: mapped.etdAt,
            changedBy: principal.username,
            ...(statusRemark ? { statusRemark, remark: statusRemark, comment: statusRemark } : {})
          })
        }
      });
    }
    if (beforeMapped.etaAt !== mapped.etaAt || beforeMapped.etdAt !== mapped.etdAt) {
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'customer_service.eta.update',
          target: shipment.id,
          before: toAuditJson({ etaAt: beforeMapped.etaAt, etdAt: beforeMapped.etdAt }),
          after: toAuditJson({ etaAt: mapped.etaAt, etdAt: mapped.etdAt, status: mapped.status })
        }
      });
    }
    if (currentStatus !== 'SIGNED' && nextStatus === 'SIGNED') {
      const signedAt = new Date().toISOString();
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'shipment.sign',
          target: shipment.id,
          before: toAuditJson(beforeMapped),
          after: toAuditJson(mapped)
        }
      });
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'customer_service.signature.confirm',
          target: shipment.id,
          before: toAuditJson({ status: currentStatus }),
          after: toAuditJson({
            status: nextStatus,
            statusFrom: currentStatus,
            statusTo: nextStatus,
            signedBy: principal.username,
            signatureConfirmedBy: principal.username,
            signedAt,
            signatureConfirmedAt: signedAt,
            transferNo: mapped.transferNo,
            ...(statusRemark ? { statusRemark, remark: statusRemark, comment: statusRemark } : {})
          })
        }
      });
    }
    if (currentStatus === 'OUTBOUNDED' && nextStatus === 'WAITING_DEPARTURE' && mapped.transferNo) {
      await this.ensureCarrierTask(mapped.id, mapped.carrier, mapped.transferNo);
    }
    void this.lineage?.recordEvent('orders.management.update', {
      actorUsername: principal.username,
      businessId: mapped.id,
      payload: {
        shipmentId: mapped.id,
        systemOrderNo: mapped.systemOrderNo,
        customerOrderNo: mapped.customerOrderNo,
        statusFrom: currentStatus,
        statusTo: mapped.status,
        transferNoFrom: beforeMapped.transferNo,
        transferNoTo: mapped.transferNo,
        channelIdFrom: shipment.channelId,
        channelIdTo: updated.channelId,
        etaAt: mapped.etaAt,
        etdAt: mapped.etdAt,
        latestTracking: mapped.latestTracking,
        statusRemark
      },
      sourceRefs: [{ nodeType: 'shipment', id: mapped.id }],
      metrics: {
        statusChanged: currentStatus !== mapped.status ? 1 : 0,
        transferNoChanged: beforeMapped.transferNo !== mapped.transferNo ? 1 : 0,
        etaChanged: beforeMapped.etaAt !== mapped.etaAt ? 1 : 0,
        etdChanged: beforeMapped.etdAt !== mapped.etdAt ? 1 : 0
      }
    });
    if (transferNoChanged) {
      void this.lineage?.recordEvent('customer_service.transfer.update', {
        actorUsername: principal.username,
        businessId: mapped.id,
        payload: {
          shipmentId: mapped.id,
          systemOrderNo: mapped.systemOrderNo,
          customerOrderNo: mapped.customerOrderNo,
          status: mapped.status,
          transferNoFrom: beforeMapped.transferNo,
          transferNoTo: mapped.transferNo,
          subOrderNoFrom: beforeMapped.subOrderNo,
          subOrderNoTo: mapped.subOrderNo,
          trackingWebsite,
          trackingWebsiteVisibleToSales: trackingWebsiteTouched ? input.trackingWebsiteVisibleToSales ?? false : undefined,
          transferNoFilledBy: principal.username,
          transferNoFilledAt: new Date().toISOString(),
          labelId: label?.id,
          labelUrl: label?.labelUrl ?? undefined
        },
        sourceRefs: [
          { nodeType: 'shipment', id: mapped.id },
          ...(label ? [{ nodeType: 'warehouse_label', id: label.id }] : [])
        ],
        metrics: { transferNoChanged: 1, hasLabel: label ? 1 : 0 }
      });
    }
    if (beforeMapped.etaAt !== mapped.etaAt || beforeMapped.etdAt !== mapped.etdAt) {
      void this.lineage?.recordEvent('customer_service.departed.update', {
        actorUsername: principal.username,
        businessId: mapped.id,
        payload: {
          shipmentId: mapped.id,
          systemOrderNo: mapped.systemOrderNo,
          customerOrderNo: mapped.customerOrderNo,
          status: mapped.status,
          etaFrom: beforeMapped.etaAt,
          etaTo: mapped.etaAt,
          etdFrom: beforeMapped.etdAt,
          etdTo: mapped.etdAt,
          latestTracking: mapped.latestTracking,
          updatedBy: principal.username
        },
        sourceRefs: [{ nodeType: 'shipment', id: mapped.id }],
        metrics: {
          etaChanged: beforeMapped.etaAt !== mapped.etaAt ? 1 : 0,
          etdChanged: beforeMapped.etdAt !== mapped.etdAt ? 1 : 0
        }
      });
    }
    if (currentStatus !== mapped.status || (mapped.status === 'SIGNED' && input.status === 'SIGNED')) {
      const statusEventKey = customerServiceStatusLineageKey(mapped.status);
      if (statusEventKey) {
        void this.lineage?.recordEvent(statusEventKey, {
          actorUsername: principal.username,
          businessId: mapped.id,
          payload: {
            shipmentId: mapped.id,
            systemOrderNo: mapped.systemOrderNo,
            customerOrderNo: mapped.customerOrderNo,
            statusFrom: currentStatus,
            statusTo: mapped.status,
            latestTracking: mapped.latestTracking,
            etaAt: mapped.etaAt,
            etdAt: mapped.etdAt,
            transferNo: mapped.transferNo,
            statusRemark,
            changedBy: principal.username
          },
          sourceRefs: [{ nodeType: 'shipment', id: mapped.id }],
          metrics: { statusChanged: currentStatus !== mapped.status ? 1 : 0 }
        });
      }
    }
    return mapped;
  }

  async registerShipmentPayment(principal: Principal, shipmentId: string, input: ShipmentPaymentUpdateInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
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

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        paymentAmountUsd: hasUsd ? Number(input.paymentAmountUsd) : null,
        paymentAmountCny: hasCny ? Number(input.paymentAmountCny) : null,
        paymentMethod: input.paymentMethod
      },
      include: shipmentIncludes
    });

    await this.createEvent(
      shipment.id,
      shipment.status as ShipmentStatus,
      shipment.status as ShipmentStatus,
      `登记收款：USD ${hasUsd ? Number(input.paymentAmountUsd).toFixed(2) : '未知'} / RMB ${hasCny ? Number(input.paymentAmountCny).toFixed(2) : '未知'} / ${input.paymentMethod}`
    );
    return mapShipment(updated);
  }

  async importTrackingEvents(principal: Principal, request: BulkTrackingApplyRequest): Promise<BulkTrackingApplyResponse> {
    if (!Array.isArray(request.updates) || request.updates.length === 0) {
      throw new BadRequestException('没有可导入的轨迹记录');
    }

    const latestByShipmentId = new Map<string, { latestTracking: string; happenedAt: Date }>();
    const visibleShipmentIds = new Set<string>();
    for (const item of request.updates) {
      const shipment = await this.getVisibleShipment(principal, item.shipmentId);
      const latestTracking = item.latestTracking?.trim();
      if (!latestTracking) {
        throw new BadRequestException('最新轨迹不能为空');
      }
      const happenedAt = this.parseRequiredTrackingDate(item.trackingDate);
      visibleShipmentIds.add(shipment.id);
      await this.prisma.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status: latestTracking,
          happenedAt,
          visibleToCustomer: true,
          rawContent: latestTracking,
          carrier: shipment.channel?.carrier.name ?? undefined,
          transferNo: shipment.transferNo ?? undefined,
          source: 'MANUAL_IMPORT',
          kind: 'LOGISTICS'
        }
      });
      const current = latestByShipmentId.get(shipment.id);
      if (!current || happenedAt.getTime() >= current.happenedAt.getTime()) {
        latestByShipmentId.set(shipment.id, { latestTracking, happenedAt });
      }
    }

    const updated: Shipment[] = [];
    for (const shipmentId of visibleShipmentIds) {
      const latest = latestByShipmentId.get(shipmentId);
      if (!latest) continue;
      const current = await this.prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
      const row = await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          latestTracking: latest.latestTracking,
          trackingStaleDays: 0
        },
        include: shipmentIncludes
      });
      await this.createEvent(shipmentId, current.status as ShipmentStatus, current.status as ShipmentStatus, `批量添加轨迹：${latest.latestTracking}`);
      updated.push(mapShipment(row));
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'tracking.manual_import',
        target: 'shipments/tracking-events/import',
        after: {
          fileName: request.fileName,
          rawRowCount: request.rawRowCount ?? request.updates.length,
          successCount: updated.length,
          successRowCount: request.updates.length,
          failedRowCount: request.failedRowCount ?? 0,
          unmatchedCount: request.unmatchedOrderNos?.length ?? 0,
          affectedShipmentCount: updated.length
        }
      }
    });
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
          fileName: request.fileName,
          rawRowCount: request.rawRowCount ?? request.updates.length,
          successCount: updated.length,
          successRowCount: request.updates.length,
          failedRowCount: request.failedRowCount ?? 0,
          unmatchedCount: request.unmatchedOrderNos?.length ?? 0,
          affectedShipmentCount: updated.length,
          shipmentIds: updated.map((shipment) => shipment.id),
          systemOrderNos: updated.map((shipment) => shipment.systemOrderNo)
        },
        sourceRefs,
        metrics: {
          rawRowCount: request.rawRowCount ?? request.updates.length,
          successCount: updated.length,
          successRowCount: request.updates.length,
          failedRowCount: request.failedRowCount ?? 0,
          unmatchedCount: request.unmatchedOrderNos?.length ?? 0,
          affectedShipmentCount: updated.length
        }
      });
      await Promise.all(updated.map((shipment) => this.lineage?.recordEvent('tracking.latest.add_event', {
        actorUsername: principal.username,
        businessId: `${shipment.id}:${importBusinessId}`,
        payload: {
          source: 'manual_import',
          shipmentId: shipment.id,
          systemOrderNo: shipment.systemOrderNo,
          status: shipment.latestTracking,
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
      failedRowCount: request.failedRowCount ?? 0,
      unmatchedCount: request.unmatchedOrderNos?.length ?? 0,
      affectedShipmentCount: updated.length
    };
  }

  async deleteShipment(principal: Principal, shipmentId: string): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (shipment.deletedAt) {
      throw new NotFoundException('运单不存在');
    }
    await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, '人工删除运单');
    const deleted = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { deletedAt: new Date() },
      include: shipmentIncludes
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.delete',
        target: shipment.id,
        before: JSON.parse(JSON.stringify(mapShipment(shipment))),
        after: JSON.parse(JSON.stringify(mapShipment(deleted)))
      }
    });
    const mappedDeleted = mapShipment(deleted);
    void this.lineage?.recordEvent('orders.management.delete_restore', {
      actorUsername: principal.username,
      businessId: mappedDeleted.id,
      payload: {
        action: 'delete',
        shipmentId: mappedDeleted.id,
        systemOrderNo: mappedDeleted.systemOrderNo,
        customerOrderNo: mappedDeleted.customerOrderNo,
        status: mappedDeleted.status,
        deletedAt: mappedDeleted.deletedAt
      },
      sourceRefs: [{ nodeType: 'shipment', id: mappedDeleted.id }],
      metrics: { deleted: 1 }
    });
    return mappedDeleted;
  }

  async getCarrierTasks(principal: Principal): Promise<CarrierTaskSummary[]> {
    const canViewErrors = await this.hasPermission(principal.role, 'tracking:carrier-task:error-view');
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const tasks = await this.prisma.carrierTask.findMany({
      where: {
        shipment: {
          deletedAt: null,
          ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
          ...(operatorCustomerScope ? { customer: { salesperson: { in: operatorCustomerScope } } } : {})
        }
      },
      include: { shipment: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return tasks.map((task) => {
      const mapped = mapCarrierTask(task);
      return canViewErrors ? mapped : { ...mapped, lastError: undefined };
    });
  }

  async runCarrierTask(principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    const task = await this.prisma.carrierTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    await this.getVisibleShipment(principal, task.shipmentId);
    return this.executeCarrierTask(taskId, body.fail === true, principal, 'run');
  }

  async retryCarrierTask(principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    const task = await this.prisma.carrierTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    await this.getVisibleShipment(principal, task.shipmentId);
    if (task.status !== 'FAILED') {
      throw new BadRequestException('只有失败任务可以重试');
    }
    await this.prisma.carrierTask.update({
      where: { id: task.id },
      data: { status: 'PENDING', lastError: null }
    });
    return this.executeCarrierTask(taskId, body.fail === true, principal, 'retry');
  }

  async createShipmentLabel(principal: Principal, shipmentId: string): Promise<LabelCreateResponse> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (shipment.status !== 'WAITING_DISPATCH') {
      throw new BadRequestException('当前状态不允许申请面单');
    }

    const existing = await this.prisma.shipmentLabel.findFirst({
      where: { shipmentId: shipment.id, status: 'CREATED' },
      orderBy: { createdAt: 'desc' }
    });
    if (existing) {
      return { label: mapShipmentLabel(existing), shipment: mapShipment(shipment) };
    }

    const now = new Date();
    const sequence = await this.nextLabelSequence(now);
    const carrier = toCarrierAdapterCode(shipment.channel?.carrier.name ?? '');
    const labelNo = `LBL${formatDate(now)}${String(sequence).padStart(5, '0')}`;
    const transferNo = createMockTransferNo(carrier, now, sequence);
    const label = await this.prisma.shipmentLabel.create({
      data: {
        shipmentId: shipment.id,
        carrier,
        channelName: shipment.channel?.name ?? '',
        labelNo,
        transferNo,
        labelUrl: `/mock-labels/${labelNo}.pdf`,
        status: 'CREATED',
        createdAt: now
      }
    });

    await this.prisma.shipmentEvent.create({
      data: { shipmentId: shipment.id, fromStatus: shipment.status, toStatus: shipment.status, note: '申请模拟面单' }
    });
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { transferNo },
      include: shipmentIncludes
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.label.create',
        target: shipment.id,
        before: toAuditJson({ status: shipment.status, transferNo: shipment.transferNo }),
        after: toAuditJson({
          labelId: label.id,
          labelNo,
          labelUrl: label.labelUrl,
          transferNo,
          transferNoFilledBy: principal.username,
          transferNoFilledAt: now.toISOString(),
          trackingWebsite: trackingWebsiteForCarrier(updated.channel?.carrier.name ?? '', transferNo),
          trackingWebsiteVisibleToSales: false,
          status: updated.status
        })
      }
    });

    const mappedLabel = mapShipmentLabel(label);
    const mappedShipment = mapShipment(updated);
    void this.lineage?.recordEvent('warehouse.queue.label', {
      actorUsername: principal.username,
      businessId: mappedShipment.id,
      payload: {
        action: 'shipment_label_create',
        shipmentId: mappedShipment.id,
        systemOrderNo: mappedShipment.systemOrderNo,
        labelId: mappedLabel.id,
        labelNo,
        labelUrl: mappedLabel.labelUrl,
        transferNo
      },
      sourceRefs: [{ nodeType: 'shipment', id: mappedShipment.id }],
      metrics: { labelCount: 1 }
    });
    return { label: mappedLabel, shipment: mappedShipment };
  }

  async uploadShipmentLabel(
    principal: Principal,
    shipmentId: string,
    input: { fileName: string; mimeType: string; sizeBytes: number; url: string; transferNo?: string }
  ): Promise<LabelCreateResponse> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
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
    const sequence = await this.nextLabelSequence(now);
    const carrier = toCarrierAdapterCode(shipment.channel?.carrier.name ?? '');
    const labelNo = `UPL${formatDate(now)}${String(sequence).padStart(5, '0')}`;
    const label = await this.prisma.shipmentLabel.create({
      data: {
        shipmentId: shipment.id,
        carrier,
        channelName: shipment.channel?.name ?? '',
        labelNo,
        transferNo,
        labelUrl: input.url,
        status: 'CREATED',
        createdAt: now
      }
    });
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { transferNo, latestTracking: '已上传面单', trackingStaleDays: 0 },
      include: shipmentIncludes
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.label.upload',
        target: shipment.id,
        before: toAuditJson({ transferNo: shipment.transferNo }),
        after: toAuditJson({
          labelId: label.id,
          labelNo,
          labelUrl: label.labelUrl,
          transferNo,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          uploadedBy: principal.username,
          uploadedAt: now.toISOString()
        })
      }
    });
    const mappedLabel = mapShipmentLabel(label);
    const mappedShipment = mapShipment(updated);
    void this.lineage?.recordEvent('warehouse.queue.label', {
      actorUsername: principal.username,
      businessId: mappedShipment.id,
      payload: {
        action: 'shipment_label_upload',
        shipmentId: mappedShipment.id,
        systemOrderNo: mappedShipment.systemOrderNo,
        labelId: mappedLabel.id,
        labelNo,
        labelUrl: mappedLabel.labelUrl,
        transferNo,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes
      },
      sourceRefs: [{ nodeType: 'shipment', id: mappedShipment.id }],
      metrics: { labelCount: 1, sizeBytes: input.sizeBytes }
    });
    return { label: mappedLabel, shipment: mappedShipment };
  }

  async uploadShipmentBusinessInvoice(
    principal: Principal,
    shipmentId: string,
    input: { fileName: string; mimeType: string; sizeBytes: number; url: string }
  ) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (!shipment.agentId) {
      throw new BadRequestException('运单未选择代理，不能上传发票');
    }
    if (!shipment.agent?.invoiceTemplateUrl) {
      throw new BadRequestException('代理未维护发票模板');
    }
    const now = new Date();
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        businessInvoiceName: input.fileName,
        businessInvoiceUrl: input.url,
        businessInvoiceUploadedBy: principal.username,
        businessInvoiceUploadedAt: now
      },
      include: shipmentIncludes
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.business_invoice.upload',
        target: shipment.id,
        before: toAuditJson({
          businessInvoiceName: (shipment as any).businessInvoiceName,
          businessInvoiceUrl: (shipment as any).businessInvoiceUrl
        }),
        after: toAuditJson({
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          url: input.url,
          agentId: shipment.agentId,
          agentName: shipment.agent?.name,
          templateName: shipment.agent?.invoiceTemplateName,
          uploadedBy: principal.username,
          uploadedAt: now.toISOString()
        })
      }
    });
    return { shipment: mapShipment(updated), fileName: input.fileName, url: input.url };
  }

  async getShipmentLabels(principal: Principal, shipmentId: string): Promise<ShipmentLabelSummary[]> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const labels = await this.prisma.shipmentLabel.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { createdAt: 'desc' }
    });
    return labels.map(mapShipmentLabel);
  }

  async voidShipmentLabel(principal: Principal, shipmentId: string, labelId: string): Promise<ShipmentLabelSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const label = await this.prisma.shipmentLabel.findFirst({ where: { id: labelId, shipmentId: shipment.id } });
    if (!label) {
      throw new NotFoundException('面单不存在');
    }
    if (shipment.status !== 'WAITING_DISPATCH') {
      throw new BadRequestException('已发货运单不能作废面单');
    }
    if (label.status !== 'CREATED') {
      throw new BadRequestException('面单已作废');
    }

    const now = new Date();
    const updatedLabel = await this.prisma.shipmentLabel.update({
      where: { id: label.id },
      data: { status: 'VOIDED', voidedAt: now }
    });
    if (shipment.transferNo === label.transferNo) {
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: { transferNo: null }
      });
    }

    return mapShipmentLabel(updatedLabel);
  }

  async addTrackingEvent(principal: Principal, shipmentId: string, input: TrackingEventInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const event = await this.prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status: input.status,
        happenedAt: new Date(input.happenedAt),
        visibleToCustomer: input.visibleToCustomer ?? true,
        location: input.location?.trim() || undefined,
        carrier: input.carrier?.trim() || shipment.channel?.carrier.name || undefined,
        transferNo: input.transferNo?.trim() || shipment.transferNo || undefined,
        rawContent: input.rawContent?.trim() || input.status,
        source: input.source ?? 'MANUAL_ENTRY',
        kind: 'LOGISTICS'
      }
    });

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { latestTracking: input.status, trackingStaleDays: 0 },
      include: shipmentIncludes
    });
    const mapped = mapShipment(updated);
    void this.lineage?.recordEvent('tracking.latest.add_event', {
      actorUsername: principal.username,
      businessId: event.id,
      payload: {
        source: 'manual_add',
        trackingEventId: event.id,
        shipmentId: mapped.id,
        systemOrderNo: mapped.systemOrderNo,
        status: input.status,
        happenedAt: event.happenedAt.toISOString(),
        visibleToCustomer: event.visibleToCustomer,
        trackingStaleDays: mapped.trackingStaleDays
      },
      sourceRefs: [{ nodeType: 'shipment', id: mapped.id }],
      metrics: { trackingStaleDays: mapped.trackingStaleDays }
    });

    return mapped;
  }

  async getProblemTickets(principal: Principal): Promise<ProblemTicketSummary[]> {
    const rows = await this.prisma.problemTicket.findMany({
      where:
        principal.role === 'CUSTOMER'
          ? { customerVisible: true, shipment: { customerId: principal.customerId } }
          : undefined,
      include: {
        shipment: { include: { customer: true } },
        replies: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return rows.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: row.shipment.systemOrderNo,
      customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
      reason: row.reason,
      status: row.status,
      customerVisible: row.customerVisible,
      createdAt: row.createdAt.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      closedBy: (row as any).closedBy ?? undefined,
      closeReason: (row as any).closeReason ?? undefined,
      assistanceReason: (row as any).assistanceReason ?? undefined,
      assistanceRequestedAt: (row as any).assistanceAt?.toISOString?.(),
      tagSnapshot: ((row as any).tagSnapshot as string[] | null) ?? undefined,
      replies: row.replies.map((reply) => ({
        id: reply.id,
        author: reply.author,
        message: reply.message,
        createdAt: reply.createdAt.toISOString()
      }))
    }));
  }

  async createProblemTicket(principal: Principal, shipmentId: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const ticket = await this.prisma.problemTicket.create({
      data: {
        shipmentId: shipment.id,
        reason: input.reason,
        status: 'OPEN',
        customerVisible: input.customerVisible ?? true
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'problem.ticket.create',
        target: ticket.id,
        after: { shipmentId: shipment.id, status: ticket.status, customerVisible: ticket.customerVisible }
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'customer_service.issue.attach',
        target: ticket.id,
        after: {
          shipmentId: shipment.id,
          originalStatus: shipment.status,
          originalStatusPool: shipment.status,
          issueId: ticket.id,
          issueType: ticket.reason,
          customerVisible: ticket.customerVisible,
          handledBy: principal.username,
          attachedAt: ticket.createdAt.toISOString()
        }
      }
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
        attachedAt: ticket.createdAt.toISOString()
      },
      sourceRefs: [{ nodeType: 'shipment', id: shipment.id }],
      metrics: { customerVisible: ticket.customerVisible ? 1 : 0, replyCount: 0 }
    });

    return (await this.getProblemTickets({ ...principal, role: 'ADMIN' })).find((item) => item.id === ticket.id)!;
  }

  async replyProblemTicket(principal: Principal, ticketId: string, message: string): Promise<ProblemTicketSummary> {
    const ticket = await this.getVisibleProblemTicket(principal, ticketId);
    await this.prisma.problemReply.create({
      data: {
        ticketId: ticket.id,
        author: principal.role === 'CUSTOMER' ? '客户' : principal.username,
        message
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'problem.ticket.reply',
        target: ticket.id,
        after: { message }
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'customer_service.issue.update',
        target: ticket.id,
        after: {
          issueId: ticket.id,
          shipmentId: ticket.shipmentId,
          status: ticket.status,
          originalStatusPool: ticket.shipment?.status,
          handledBy: principal.username,
          message
        }
      }
    });
    void this.lineage?.recordEvent('customer_service.problems.change', {
      actorUsername: principal.username,
      businessId: ticket.id,
      payload: {
        action: 'reply',
        issueId: ticket.id,
        shipmentId: ticket.shipmentId,
        systemOrderNo: ticket.shipment.systemOrderNo,
        status: ticket.status,
        handledBy: principal.username,
        message
      },
      sourceRefs: [{ nodeType: 'shipment', id: ticket.shipmentId }],
      metrics: { replyAdded: 1 }
    });

    return (await this.getProblemTickets(principal)).find((item) => item.id === ticketId)!;
  }

  async closeProblemTicket(principal: Principal, ticketId: string, reason?: string): Promise<ProblemTicketSummary> {
    const ticket = await this.getVisibleProblemTicket(principal, ticketId);
    const closedAt = new Date();
    await this.prisma.problemTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt, closedBy: principal.username, closeReason: reason?.trim() || '已解决' } as any
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'problem.ticket.close',
        target: ticket.id,
        before: { status: ticket.status },
        after: { status: 'CLOSED' }
      }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'customer_service.issue.close',
        target: ticket.id,
        before: { status: ticket.status },
        after: {
          issueId: ticket.id,
          shipmentId: ticket.shipmentId,
          status: 'CLOSED',
          originalStatusPool: ticket.shipment?.status,
          handledBy: principal.username,
          closedAt: closedAt.toISOString()
        }
      }
    });
    void this.lineage?.recordEvent('customer_service.problems.change', {
      actorUsername: principal.username,
      businessId: ticket.id,
      payload: {
        action: 'close',
        issueId: ticket.id,
        shipmentId: ticket.shipmentId,
        systemOrderNo: ticket.shipment.systemOrderNo,
        statusFrom: ticket.status,
        statusTo: 'CLOSED',
        originalStatusPool: ticket.shipment?.status,
        handledBy: principal.username,
        closedAt: closedAt.toISOString()
      },
      sourceRefs: [{ nodeType: 'shipment', id: ticket.shipmentId }],
      metrics: { closed: 1 }
    });

    return (await this.getProblemTickets({ ...principal, role: 'ADMIN' })).find((item) => item.id === ticketId)!;
  }

  async assistProblemTicket(principal: Principal, ticketId: string, reason: string): Promise<ProblemTicketSummary> {
    const ticket = await this.getVisibleProblemTicket(principal, ticketId);
    const trimmed = reason.trim();
    if (!trimmed) throw new BadRequestException('请填写协助说明');
    if (ticket.status === 'CLOSED') throw new BadRequestException('已关闭问题件不能请求协助');
    await this.prisma.problemTicket.update({ where: { id: ticket.id }, data: { status: 'ASSISTANCE_REQUIRED' } });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'problem.ticket.assist', target: ticket.id, before: { status: ticket.status }, after: { status: 'ASSISTANCE_REQUIRED', assistanceReason: trimmed, assistanceRequestedAt: new Date().toISOString() } } });
    return (await this.getProblemTickets({ ...principal, role: 'ADMIN' })).find((item) => item.id === ticketId)!;
  }

  private async quoteFromRules(input: PricingRuleQuoteRequest): Promise<PricingRuleQuoteResponse> {
    const [rules, fuelRates, surcharges, exchangeRates, channels] = await Promise.all([
      (this.prisma as any).pricingRule.findMany({ include: { channel: true } }),
      this.prisma.fuelRate.findMany({ orderBy: { activeAt: 'desc' } }),
      this.prisma.surcharge.findMany({ where: { enabled: true } }),
      (this.prisma as any).exchangeRate.findMany({ where: { enabled: true }, orderBy: { activeAt: 'desc' } }),
      this.prisma.channel.findMany()
    ]);
    const channelMap = new Map(channels.map((channel) => [channel.id, channel.name]));
    try {
      return quoteWithPricingRules({
        ...input,
        rules: rules.map(mapPricingRule),
        fuelRates: fuelRates.map((fuelRate) => ({
          id: fuelRate.id,
          channelId: fuelRate.channelId,
          channelName: channelMap.get(fuelRate.channelId) ?? fuelRate.channelId,
          rate: Number(fuelRate.rate),
          activeAt: fuelRate.activeAt.toISOString()
        })),
        surcharges: surcharges.map((surcharge) => ({
          id: surcharge.id,
          name: surcharge.name,
          amount: Number(surcharge.amount),
          enabled: surcharge.enabled
        })),
        exchangeRates: exchangeRates.map((exchangeRate: any) => ({
          id: exchangeRate.id,
          baseCurrency: exchangeRate.baseCurrency,
        quoteCurrency: exchangeRate.quoteCurrency,
        rate: Number(exchangeRate.rate),
        activeAt: exchangeRate.activeAt.toISOString(),
        endAt: exchangeRate.endAt?.toISOString(),
        enabled: exchangeRate.enabled
      }))
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

  private ensureAdmin(principal: Principal, message = '只有管理员可以执行该操作') {
    if (principal.role !== 'ADMIN') {
      throw new ForbiddenException(message);
    }
  }

  private ensurePricingManager(principal: Principal, message = '只有管理员或市场可以执行该操作') {
    // Endpoint decorators enforce the action-specific pricing permission. Do
    // not re-introduce the old role-only market gate here: it would make saved
    // fine-grained role grants ineffective.
    this.ensureStaffPricingAccess(principal);
    void message;
  }

  private ensureWarehouseAccess(principal: Principal) {
    if (!['ADMIN', 'WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role)) {
      throw new ForbiddenException('当前角色不能操作仓库管理');
    }
  }

  private async hasAnyPermission(role: RoleKey, permissions: PermissionKey[]) {
    for (const permission of permissions) {
      if (await this.hasPermission(role, permission)) return true;
    }
    return false;
  }

  private async ensureTransferDataApproved(principal: Principal, shipmentId: string) {
    const missing: string[] = [];
    if (!await this.isCustomerServiceDataApproved(shipmentId, 'business')) missing.push('business_data');
    if (!await this.isCustomerServiceDataApproved(shipmentId, 'agent')) missing.push('agent_data');
    if (missing.length === 0) return;
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'workflow.guard_denied',
        target: shipmentId,
        after: toAuditJson({ guard: 'transferNo.requires_data_approval', missing })
      }
    });
    throw new BadRequestException('业务数据和代理数据均确认后才能填写转单号');
  }

  private async isCustomerServiceDataApproved(shipmentId: string, kind: 'business' | 'agent') {
    const latest = await this.prisma.auditLog.findFirst({ where: { target: shipmentId, action: { in: [`customer_service.${kind}_data.approved`, `customer_service.${kind}_data.reversed`] } }, orderBy: { createdAt: 'desc' } });
    return latest?.action === `customer_service.${kind}_data.approved`;
  }

  private validateCustomerServiceData(body: { packageCount: number; weightKg: number; volumeCbm: number; chargeWeightKg: number }) {
    if (!Number.isInteger(Number(body.packageCount)) || Number(body.packageCount) <= 0 || ![body.weightKg, body.volumeCbm, body.chargeWeightKg].every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) {
      throw new BadRequestException('件数、总量、体积和计费重必须为大于 0 的有效值');
    }
  }

  private async ensureCustomerServiceDataEditable(principal: Principal, shipment: ShipmentWithRelations, kind: 'business' | 'agent') {
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) throw new ForbiddenException('只有客服或管理员可以维护数据确认');
    if (shipment.status !== 'OUTBOUNDED') throw new BadRequestException('订单已进入后续流程，不能修改数据确认');
    if (await this.isCustomerServiceDataApproved(shipment.id, kind)) throw new BadRequestException(`${kind === 'business' ? '业务' : '代理'}数据已审核，请先反审核`);
  }

  private async reverseCustomerServiceData(principal: Principal, shipmentId: string, kind: 'business' | 'agent', reason?: string): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) throw new ForbiddenException('只有客服或管理员可以反审核数据确认');
    if (!reason?.trim()) throw new BadRequestException('反审核必须填写原因');
    if (shipment.status !== 'OUTBOUNDED' || shipment.transferNo) throw new BadRequestException('订单已进入后续流程，不能反审核');
    if (!await this.isCustomerServiceDataApproved(shipmentId, kind)) throw new BadRequestException(`${kind === 'business' ? '业务' : '代理'}数据尚未审核`);
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: `customer_service.${kind}_data.reversed`, target: shipmentId, after: toAuditJson({ status: shipment.status, reason: reason.trim(), reviewedBy: principal.username, reviewedAt: new Date().toISOString() }) } });
    return mapShipment(shipment);
  }

  private async ensureFinanceItemManageAccess(principal: Principal, type?: ShipmentFinanceItemType, shipment?: { status?: string }) {
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

  private ensureBusinessCostEditableAfterDispatch(principal: Principal, type: ShipmentFinanceItemType | undefined, shipment: any) {
    if (type !== 'BUSINESS_COST' || !this.isAfterRouteDispatch(shipment.status)) return;
    if (this.operatorCustomerScope(principal)) {
      throw new ForbiddenException('排货后业务员不能修改业务成本，请联系客服或财务处理');
    }
  }

  private async createBusinessCostChangeNotificationAudit(
    principal: Principal,
    type: ShipmentFinanceItemType | undefined,
    shipment: any,
    before: any,
    after: any
  ) {
    if (type !== 'BUSINESS_COST' || !this.isAfterRouteDispatch(shipment.status)) return;
    if (!['CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE', 'FINANCE', 'UG_FINANCE', 'ADMIN'].includes(principal.role)) return;
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'notification.wecom.business_cost_changed.pending',
        target: after?.id ?? before?.id ?? shipment.id,
        before: before ? toAuditJson(before) : null,
        after: toAuditJson({
          shipmentId: shipment.id,
          systemOrderNo: shipment.systemOrderNo,
          status: shipment.status,
          fee: after,
          operator: principal.username
        })
      }
    });
  }

  private validateFinanceItemInput(type: ShipmentFinanceItemType, input: ShipmentFinanceItemCreateInput | ShipmentFinanceItemUpdateInput) {
    if (input.name !== undefined && !input.name.trim()) {
      throw new BadRequestException('费用名称不能为空');
    }
    if (input.amount !== undefined && (!Number.isFinite(Number(input.amount)) || Number(input.amount) < 0)) {
      throw new BadRequestException('费用金额必须大于等于 0');
    }
    if (type === 'BUSINESS_COST' && input.unitPrice !== undefined && Number(input.unitPrice) < 0) {
      throw new BadRequestException('单价必须大于等于 0');
    }
    if ((type === 'BUSINESS_COST' || type === 'PAYABLE') && input.chargeWeightKg !== undefined && Number(input.chargeWeightKg) < 0) {
      throw new BadRequestException('计费重必须大于等于 0');
    }
    if (type === 'PAYABLE' && input.unitPrice !== undefined && Number(input.unitPrice) < 0) {
      throw new BadRequestException('单价必须大于等于 0');
    }
  }

  private resolveShipmentFinanceItemAmount(type: ShipmentFinanceItemType, input: ShipmentFinanceItemCreateInput | ShipmentFinanceItemUpdateInput, current?: any) {
    const chargeWeightKg = input.chargeWeightKg ?? current?.chargeWeightKg;
    const unitPrice = input.unitPrice ?? current?.unitPrice;
    if ((type === 'BUSINESS_COST' || type === 'PAYABLE') && chargeWeightKg !== undefined && chargeWeightKg !== null && unitPrice !== undefined && unitPrice !== null) {
      return roundMoney(Number(chargeWeightKg) * Number(unitPrice));
    }
    return Number(input.amount ?? current?.amount ?? 0);
  }

  private isFinanceAmountOverridden(input: { amount?: unknown; chargeWeightKg?: unknown; unitPrice?: unknown }) {
    const amount = Number(input.amount ?? 0);
    const chargeWeightKg = Number(input.chargeWeightKg ?? 0);
    const unitPrice = Number(input.unitPrice ?? 0);
    if (!Number.isFinite(amount) || !Number.isFinite(chargeWeightKg) || !Number.isFinite(unitPrice)) return false;
    if (chargeWeightKg <= 0 || unitPrice <= 0) return false;
    return Math.abs(amount - chargeWeightKg * unitPrice) > 0.01;
  }

  private async getShipmentFinanceDetailUsdToRmbRate(rows: Array<{ currency?: string }>) {
    if (!rows.some((row) => (row.currency ?? 'RMB').toUpperCase() === 'USD')) return 1;
    const today = new Date();
    const rate = await (this.prisma as any).exchangeRate.findFirst({
      where: { baseCurrency: 'USD', quoteCurrency: 'RMB', enabled: true, activeAt: { lte: today }, OR: [{ endAt: null }, { endAt: { gte: today } }] },
      orderBy: { activeAt: 'desc' }
    });
    if (!rate) {
      throw new BadRequestException('缺少 USD 到 RMB 的系统汇率，无法计算单票费用合计');
    }
    return Number(rate.rate);
  }

  private toShipmentFinanceDetailRmbAmount(amount: number, currency: string, usdRate: number) {
    const normalized = currency.toUpperCase() === 'CNY' ? 'RMB' : currency.toUpperCase();
    if (normalized === 'RMB') return roundMoney(amount);
    if (normalized === 'USD') return roundMoney(amount * usdRate);
    throw new BadRequestException(`暂不支持 ${currency} 单票费用折算 RMB`);
  }

  private ensureOrderEntryAccess(principal: Principal) {
    if (!['ADMIN', 'FINANCE', 'UG_FINANCE', 'OPERATOR', 'UG_BUSINESS', 'UG_MARKET', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('当前角色不能使用内部录单');
    }
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

  private canViewOrderEntryPayables(principal: Principal) {
    return ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(principal.role);
  }

  private canUseSensitiveOrderEntryPayables(principal: Principal) {
    return ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(principal.role);
  }

  private canEditOrderEntryEntryAt(principal: Principal) {
    return principal.role === 'ADMIN' || ['FINANCE', 'UG_FINANCE'].includes(principal.role);
  }

  private resolveOrderEntryEntryAt(principal: Principal, value: string | undefined, fallback: Date) {
    if (value && this.canEditOrderEntryEntryAt(principal)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return fallback;
  }

  async ensureOrderEntryInputAccess(principal: Principal, input: OrderEntryCreateInput, currentShipmentId?: string) {
    this.ensureOrderEntryAccess(principal);
    if (currentShipmentId) {
      const operatorCustomerScope = this.operatorCustomerScope(principal);
      const scopedOwnerWhere = operatorCustomerScope
        ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
        : {};
      const current = await this.prisma.shipment.findFirst({
        where: {
          id: currentShipmentId,
          deletedAt: null,
          ...(operatorCustomerScope ? scopedOwnerWhere : {})
        } as any,
        select: { id: true, status: true }
      });
      if (!current) {
        throw new NotFoundException('录单草稿不存在');
      }
      if (!['DRAFT', 'REVIEW_REJECTED'].includes(current.status)) {
        throw new BadRequestException('只有草稿或退回修改的录单可以继续编辑');
      }
    }
    await this.resolveOrderEntryCustomer(principal, input.shipment.customerId, input.shipment.customerCode);
    const rawPayables = input.payables ?? [];
    if (!this.canUseSensitiveOrderEntryPayables(principal) && rawPayables.some((row) => row.agentName?.trim() || row.paymentNo?.trim())) {
      throw new ForbiddenException('当前角色不能录入代理或付款敏感信息');
    }
    const payables = this.normalizeOrderEntryFinanceItems('PAYABLE', rawPayables);
    if (!this.canViewOrderEntryPayables(principal) && payables.length) {
      throw new ForbiddenException('当前角色不能录入应付费用');
    }
  }

  private async prepareOrderEntryInput(principal: Principal, input: OrderEntryCreateInput, currentShipmentId?: string) {
    const shipment = input.shipment;
    const customer = await this.resolveOrderEntryCustomer(principal, shipment.customerId, shipment.customerCode);
    const packageIds = Array.from(new Set((input.warehousePackageIds ?? []).map((id) => id.trim()).filter(Boolean)));
    const packages = packageIds.length
      ? await (this.prisma as any).warehousePackage.findMany({ where: { id: { in: packageIds } } })
      : [];
    if (packages.length !== packageIds.length) {
      throw new BadRequestException('部分仓库包裹不存在');
    }
    if (packages.some((pkg: any) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      throw new BadRequestException('理货后包裹待重新过机，完成测量后才能录单');
    }
    const boundPackage = packages.find((pkg: any) => {
      if (!pkg.shipmentId && !pkg.systemOrderNo) return false;
      return currentShipmentId ? pkg.shipmentId !== currentShipmentId : true;
    });
    if (boundPackage) {
      throw new BadRequestException('选中的仓库包裹已绑定运单，请重新选择待录单包裹');
    }

    const receivables = this.normalizeOrderEntryFinanceItems('RECEIVABLE', input.receivables);
    const businessCosts = this.normalizeOrderEntryFinanceItems('BUSINESS_COST', input.businessCosts);
    const rawPayables = input.payables ?? [];
    if (!this.canUseSensitiveOrderEntryPayables(principal) && (
      shipment.agentId?.trim()
      || rawPayables.some((row) => row.agentName?.trim() || row.paymentNo?.trim())
      || businessCosts.some((row) => row.agentName?.trim())
    )) {
      throw new ForbiddenException('当前角色不能录入代理或付款敏感信息');
    }
    const payables = this.normalizeOrderEntryFinanceItems('PAYABLE', rawPayables);
    if (!this.canViewOrderEntryPayables(principal) && payables.length) {
      throw new ForbiddenException('当前角色不能录入应付费用');
    }
    const requestedChannel = shipment.channelId?.trim() || shipment.receivingChannel?.trim();
    const channel = shipment.channelId?.trim()
      ? await this.prisma.channel.findFirst({ where: { id: shipment.channelId.trim() } })
      : shipment.receivingChannel?.trim()
        ? await this.prisma.channel.findFirst({ where: { name: shipment.receivingChannel.trim() } })
        : null;
    if (requestedChannel && !channel) throw new BadRequestException('公司渠道不存在，请从基础资料库重新选择');
    if (channel && !channel.enabled && input.submitForReview) throw new BadRequestException('所选公司渠道已停用，请重新选择启用渠道');
    if (input.submitForReview && !channel) throw new BadRequestException('提交审核前必须选择公司渠道');
    if (input.submitForReview) {
      this.validateOrderEntryRequiredFields(input, packageIds, receivables, businessCosts);
    }
    const totals = packages.reduce(
      (summary: { packageCount: number; weightKg: number; cbm: number; chargeWeightKg: number }, pkg: any) => {
        const packageCount = Math.max(1, Number(pkg.packageCount ?? 1) || 1);
        return {
          packageCount: summary.packageCount + packageCount,
          // 仓库记录为单件实重；方数已经是该记录全部件数的总方数。
          weightKg: summary.weightKg + Math.max(0, Number(pkg.weightKg ?? 0) || 0) * packageCount,
          cbm: summary.cbm + Math.max(0, Number(pkg.totalCbm ?? pkg.cbm ?? 0) || 0),
          chargeWeightKg: summary.chargeWeightKg + Number(pkg.chargeableWeightKg ?? pkg.weightKg ?? 0)
        };
      },
      { packageCount: 0, weightKg: 0, cbm: 0, chargeWeightKg: 0 }
    );
    const isWarehouseAutoMatched = packages.length > 0 && shipment.cargoDataSource === 'AUTO_MATCHED';
    const hasManualCargo = shipment.cargoDataSource === 'MANUAL_ADJUSTED'
      || (!isWarehouseAutoMatched && (
        shipment.packageCount !== undefined
        || shipment.actualWeightKg !== undefined
        || shipment.volumeCbm !== undefined
        || shipment.chargeableWeightKg !== undefined
      ));
    const automaticCargo = {
      packageCount: totals.packageCount || packages.length,
      actualWeightKg: Math.max(0, totals.weightKg),
      volumeCbm: Math.max(0, totals.cbm)
    };
    const manualCargo = {
      packageCount: Math.max(0, Number(shipment.packageCount ?? totals.packageCount ?? packages.length)),
      actualWeightKg: Math.max(0, Number(shipment.actualWeightKg ?? totals.weightKg)),
      volumeCbm: Math.max(0, Number(shipment.volumeCbm ?? totals.cbm))
    };
    const cargo = hasManualCargo ? manualCargo : automaticCargo;
    const channelWeightKg = channel
      ? (hasManualCargo
        ? calculateCompanyChannelChargeWeightFromCargo(this.toCompanyChannelWeightRule(channel), cargo)
        : calculateCompanyChannelChargeWeight(this.toCompanyChannelWeightRule(channel), packages.map((pkg: any) => ({
            packageCount: Number(pkg.packageCount ?? 1), weightKg: Number(pkg.weightKg ?? 0), lengthCm: Number(pkg.lengthCm ?? 0), widthCm: Number(pkg.widthCm ?? 0), heightCm: Number(pkg.heightCm ?? 0)
          }))))
      : Number((hasManualCargo ? Math.max(cargo.actualWeightKg, cargo.volumeCbm * 200) : (totals.chargeWeightKg || totals.weightKg)).toFixed(2));
    const chargeWeightKg = shipment.chargeWeightOverridden
      ? Number(shipment.chargeableWeightKg ?? 0)
      : Number(channelWeightKg.toFixed(2));
    if (input.submitForReview && chargeWeightKg <= 0) {
      throw new BadRequestException('提交审核前必须有计费重');
    }
    if (input.submitForReview && channel) {
      await this.getShipmentFinanceDetailUsdToRmbRate([...receivables, ...businessCosts, ...payables]);
    }
    return {
      customer,
      shipment: { ...shipment, channelId: channel?.id ?? shipment.channelId, receivingChannel: channel?.name ?? shipment.receivingChannel },
      packageIds,
      totals: {
        packageCount: cargo.packageCount || totals.packageCount || packages.length,
        weightKg: Number(cargo.actualWeightKg.toFixed(2)),
        cbm: Number(cargo.volumeCbm.toFixed(6)),
        chargeWeightKg
      },
      warehousePackages: packages.map(mapWarehousePackage),
      financeItems: this.applyOrderEntryChannelChargeWeight(
        [...receivables, ...businessCosts, ...(this.canViewOrderEntryPayables(principal) ? payables : [])],
        chargeWeightKg || undefined
      )
    };
  }

  private applyOrderEntryChannelChargeWeight(rows: OrderEntryFinanceItemInput[], chargeWeightKg?: number) {
    if (!chargeWeightKg || chargeWeightKg <= 0) return rows;
    return rows.map((row) => {
      const unitPrice = Number(row.unitPrice ?? 0);
      return {
        ...row,
        chargeWeightKg,
        ...(unitPrice > 0 && !row.amountOverridden ? { amount: roundMoney(chargeWeightKg * unitPrice), amountOverridden: false } : {})
      };
    });
  }

  private toCompanyChannelWeightRule(channel: any) {
    return {
      volumeDivisor: Number(channel.volumeDivisor ?? 5000),
      multiPieceWeightRule: channel.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: channel.singleWeightRoundingRule ?? 'ACTUAL',
      settlementWeightRule: channel.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: channel.settlementWeightRoundingRule ?? 'NONE',
      largeCargoThresholdKg: channel.largeCargoThresholdKg === null ? undefined : Number(channel.largeCargoThresholdKg ?? 0)
    };
  }

  private async resolveOrderEntryCustomer(principal: Principal, customerId?: string, customerCode?: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        ...(customerId ? { id: customerId } : {}),
        ...(!customerId && customerCode ? { code: customerCode.trim() } : {})
      }
    });
    if (!customer) {
      throw new BadRequestException('客户不存在，请先维护客户资料');
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope) {
      if (!customer.salesperson || !scope.includes(customer.salesperson)) {
        throw new ForbiddenException('业务员只能录入自己名下客户');
      }
    }
    return customer;
  }

  private validateOrderEntryRequiredFields(
    input: OrderEntryCreateInput,
    packageIds: string[],
    receivables: OrderEntryFinanceItemInput[],
    businessCosts: OrderEntryFinanceItemInput[]
  ) {
    const shipment = input.shipment;
    if (!shipment.customerId && !shipment.customerCode?.trim()) {
      throw new BadRequestException('提交审核前必须选择客户');
    }
    if (!shipment.customerOrderNo?.trim()) {
      throw new BadRequestException('提交审核前必须填写客户单号');
    }
    if (!(shipment.outboundOrderNo?.trim() || shipment.systemOrderNo?.trim())) {
      throw new BadRequestException('提交审核前必须填写出货单号');
    }
    if (!shipment.destinationCountry?.trim()) {
      throw new BadRequestException('提交审核前必须填写目的地');
    }
    if (shipment.declarationRequired === undefined || shipment.declarationRequired === null) {
      throw new BadRequestException('提交审核前必须选择是否报关');
    }
    if (!shipment.cargoType?.trim()) {
      throw new BadRequestException('提交审核前必须填写货物属性');
    }
    if (!shipment.productName?.trim()) {
      throw new BadRequestException('提交审核前必须填写品名');
    }
    if (!shipment.settlementMethod?.trim()) {
      throw new BadRequestException('提交审核前必须填写结算方式');
    }
    const hasManualCargo = shipment.cargoDataSource === 'MANUAL_ADJUSTED'
      || shipment.packageCount !== undefined
      || shipment.actualWeightKg !== undefined
      || shipment.volumeCbm !== undefined
      || shipment.chargeableWeightKg !== undefined;
    if (!packageIds.length && !hasManualCargo) {
      throw new BadRequestException('提交审核前请匹配仓库货物或填写货物数据');
    }
    if (hasManualCargo && (Number(shipment.packageCount ?? 0) <= 0 || Number(shipment.chargeableWeightKg ?? 0) <= 0)) {
      throw new BadRequestException('提交审核前请填写有效件数和计费重');
    }
    if (!receivables.length) {
      throw new BadRequestException('提交审核前必须录入至少一条应收费用');
    }
    if (!businessCosts.length) {
      throw new BadRequestException('提交审核前必须录入至少一条业务成本');
    }
  }

  private normalizeOrderEntryFinanceItems(type: ShipmentFinanceItemType, rows: OrderEntryFinanceItemInput[] = []): OrderEntryFinanceItemInput[] {
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

  private async createOrderEntryFinanceItems(tx: any, principal: Principal, shipmentId: string, rows: OrderEntryFinanceItemInput[]) {
    if (!rows.length) return [];
    for (const row of rows) {
      this.validateFinanceItemInput(row.type, row);
    }
    const created = [];
    for (const row of rows) {
      created.push(await tx.shipmentFinanceItem.create({
        data: {
        shipmentId,
        type: row.type,
        name: row.name.trim(),
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
        createdBy: principal.username
        }
      }));
    }
    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.order_entry.finance_items.replace',
        target: `shipment:${shipmentId}`,
        after: toAuditJson(rows.map((row) => ({ type: row.type, name: row.name, amount: row.amount, currency: row.currency })))
      }
    });
    return created;
  }

  private async applyOrderEntryReceiptMatches(tx: any, principal: Principal, customerId: string, inputs: OrderEntryFinanceItemInput[], createdItems: any[]) {
    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index];
      const item = createdItems[index];
      if (input.type !== 'RECEIVABLE' || !input.receiptId || !item?.id) continue;
      const receipt = await tx.waterReceipt.findUnique({ where: { id: input.receiptId } });
      if (!receipt) throw new BadRequestException('选择的水单不存在');
      if (receipt.customerId !== customerId) throw new BadRequestException('只能匹配同客户编号下的水单');
      if (!['ARRIVED', 'PARTIAL_MATCHED'].includes(receipt.status)) throw new BadRequestException('只能匹配已到账且未归档的水单');
      if ((item.currency ?? 'RMB') !== (receipt.currency ?? 'RMB')) throw new BadRequestException('水单币种与应收币种不一致');
      const amount = roundMoney(Math.min(Number(input.receiptMatchAmount ?? item.amount), Number(item.amount)));
      if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('水单匹配金额必须大于 0');
      if (amount > Number(receipt.balance)) throw new BadRequestException('匹配金额不能超过水单余额');
      await tx.waterReceiptMatch.create({
        data: { waterReceiptId: receipt.id, receivableFinanceItemId: item.id, shipmentId: item.shipmentId, amount, source: 'MANUAL' }
      });
      const nextReceived = roundMoney(Number(item.receivedAmount ?? 0) + amount);
      await tx.shipmentFinanceItem.update({
        where: { id: item.id },
        data: {
          receivedAmount: nextReceived,
          receiptStatus: nextReceived >= Number(item.amount) ? 'RECEIVED' : 'PARTIAL',
          receivedAt: nextReceived >= Number(item.amount) ? new Date() : null,
          paymentNo: receipt.receiptNo,
          receiptMatchSource: 'MANUAL',
          receiptMatchHint: null
        }
      });
      const nextMatched = roundMoney(Number(receipt.matchedAmount) + amount);
      const nextBalance = roundMoney(Number(receipt.amount) - nextMatched);
      await tx.waterReceipt.update({
        where: { id: receipt.id },
        data: {
          matchedAmount: nextMatched,
          balance: nextBalance,
          status: nextBalance <= 0 ? 'ARCHIVED' : 'PARTIAL_MATCHED',
          archivedAt: nextBalance <= 0 ? new Date() : receipt.archivedAt
        }
      });
      const account = await tx.customerAccount.findFirst({ where: { customerId: receipt.customerId, currency: receipt.currency ?? 'RMB' } });
      if (account) {
        await tx.customerAccount.update({ where: { id: account.id }, data: { balance: roundMoney(Number(account.balance) - amount) } });
      }
      if (receipt.accountLedgerId) {
        await tx.accountLedger.update({ where: { id: receipt.accountLedgerId }, data: { balance: nextBalance } });
      }
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'shipment.order_entry.receipt_match',
          target: `waterReceipt:${receipt.id}`,
          after: toAuditJson({ receivableFinanceItemId: item.id, amount, receiptNo: receipt.receiptNo })
        }
      });
    }
  }

  private async findFinanceItem(shipmentId: string, feeId: string) {
    const item = await (this.prisma as any).shipmentFinanceItem.findFirst({ where: { id: feeId, shipmentId } });
    if (!item) {
      throw new NotFoundException('费用项目不存在');
    }
    return item;
  }

  private toFinanceItemSummary(item: any, shipment: { systemOrderNo: string; customer?: { code: string; name: string }; customerName?: string; agent?: { name: string } | null; agentName?: string }) {
    if (item.type === 'RECEIVABLE') {
      return this.toReceivableFinanceSummary(item, shipment, shipment.customer ? `${shipment.customer.code}-${shipment.customer.name}` : shipment.customerName ?? '');
    }
    if (item.type === 'PAYABLE') {
      return this.toPayableFinanceSummary(item, shipment);
    }
    return this.toBusinessCostFinanceSummary(item, shipment);
  }

  private async buildReceivableAuditListResponse(rows: ReceivableAuditSummary[], query: ReceivableAuditListQuery): Promise<ReceivableAuditListResponse> {
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
    const decorated = await this.decorateReceivableRows(filtered);
    const activeRows = decorated.filter((row) => !row.voided);
    const amountByCurrency = Array.from(
      activeRows.reduce((map, row) => {
        const currency = row.currency ?? 'RMB';
        map.set(currency, roundMoney((map.get(currency) ?? 0) + row.amount));
        return map;
      }, new Map<string, number>())
    ).map(([currency, amount]) => ({ currency, amount }));
    const totals = {
      amountByCurrency,
      rmbTotal: roundMoney(activeRows.reduce((sum, row) => sum + (row.rmbAmount ?? 0), 0)),
      pendingCount: activeRows.filter((row) => row.reconciliationStatus !== 'CONFIRMED').length,
      confirmedCount: activeRows.filter((row) => row.reconciliationStatus === 'CONFIRMED').length,
      voidedCount: decorated.filter((row) => row.voided).length
    };
    const sorted = [...decorated].sort((left, right) => this.compareReceivableRows(left, right, query.sortBy, query.sortOrder));
    const { page, pageSize, rows: pagedRows } = this.paginateRows(sorted, query);
    return {
      rows: pagedRows,
      totals,
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

  private async decorateReceivableRows(rows: ReceivableAuditSummary[]): Promise<ReceivableAuditSummary[]> {
    const usdRate = await this.getUsdToRmbRate(rows);
    const receiptIds = Array.from(new Set(rows.map((row) => row.paymentNo).filter((value): value is string => Boolean(value))));
    const ledgers = receiptIds.length
      ? await this.prisma.accountLedger.findMany({ where: { id: { in: receiptIds } } })
      : [];
    const ledgerMap = new Map(ledgers.map((ledger) => [ledger.id, ledger]));
    const waterReceipts = receiptIds.length
      ? await (this.prisma as any).waterReceipt.findMany({ where: { OR: [{ id: { in: receiptIds } }, { receiptNo: { in: receiptIds } }] } })
      : [];
    const waterReceiptMap = new Map<string, any>(waterReceipts.flatMap((receipt: any) => [[receipt.id, receipt], [receipt.receiptNo, receipt]]));
    const decorated = rows.map((row) => {
      const currency = row.currency ?? 'RMB';
      const rmbAmount = this.toReceivableRmbAmount(row.amount, currency, usdRate);
      const ledger = row.paymentNo ? ledgerMap.get(row.paymentNo) : undefined;
      const receipt = row.paymentNo ? waterReceiptMap.get(row.paymentNo) : undefined;
      return {
        ...row,
        currency,
        rmbAmount,
        matchedReceiptNo: row.paymentNo,
        receiptBalance: receipt ? Number(receipt.balance) : ledger ? Number(ledger.balance) : undefined
      };
    });
    const orderTotals = decorated.reduce((map, row) => {
      if (row.voided) return map;
      map.set(row.systemOrderNo, roundMoney((map.get(row.systemOrderNo) ?? 0) + (row.rmbAmount ?? 0)));
      return map;
    }, new Map<string, number>());
    return decorated.map((row) => ({ ...row, orderRmbTotal: orderTotals.get(row.systemOrderNo) ?? 0 }));
  }

  private waterReceiptInclude() {
    return {
      voucher: true,
      matches: {
        where: { voided: false },
        include: {
          receivableFinanceItem: true,
          shipment: { include: { customer: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    };
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

  private async findCustomerForWaterReceipt(customerId?: string, customerCode?: string) {
    if (!customerId && !customerCode) return undefined;
    const customer = await this.prisma.customer.findFirst({
      where: {
        ...(customerId ? { id: customerId } : {}),
        ...(customerCode ? { code: customerCode } : {})
      }
    });
    if (!customer) throw new BadRequestException('客户不存在');
    return customer;
  }

  private async nextWaterReceiptNo(now = new Date()) {
    const ymd = this.waterReceiptDateKey(now);
    const prefix = `SD${ymd}`;
    const rows = await (this.prisma as any).waterReceipt.findMany({
      where: { receiptNo: { startsWith: prefix } },
      select: { receiptNo: true }
    });
    const pattern = new RegExp(`^${prefix}(\\d{3})$`);
    const maxSeq = rows.reduce((max: number, row: { receiptNo?: string }) => {
      const seq = row.receiptNo?.match(pattern)?.[1];
      return seq ? Math.max(max, Number(seq)) : max;
    }, 0);
    if (maxSeq >= 999) throw new BadRequestException('水单编号生成失败，请重试');
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  }

  private waterReceiptDateKey(receiptDate: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(receiptDate).replaceAll('-', '');
  }

  private isPrismaUniqueConstraintError(error: unknown) {
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'P2002';
  }

  private async findWaterReceiptById(id: string) {
    const row = await (this.prisma as any).waterReceipt.findFirst({ where: { OR: [{ id }, { receiptNo: id }] }, include: this.waterReceiptInclude() });
    if (!row) throw new NotFoundException('水单不存在');
    return row;
  }

  private async requireUniqueWaterReceiptPaymentNo(value: string | undefined, currentId?: string) {
    const paymentNo = sanitizeManualPaymentNo(value);
    if (!paymentNo) throw new BadRequestException('付款编号不能为空');
    const rows = await (this.prisma as any).waterReceipt.findMany({
      where: { paymentNo: { not: null } },
      select: { id: true, paymentNo: true }
    }) as Array<{ id: string; paymentNo?: string | null }>;
    if (rows.some((row) => row.id !== currentId && sanitizeManualPaymentNo(row.paymentNo ?? undefined) === paymentNo)) {
      throw new BadRequestException('付款编号已存在，不能重复录入');
    }
    return paymentNo;
  }

  private async findOrCreateWaterReceiptFromLedger(ledger: any) {
    const existing = await (this.prisma as any).waterReceipt.findFirst({ where: { accountLedgerId: ledger.id }, include: this.waterReceiptInclude() });
    if (existing) return existing;
    const customer = await this.prisma.customer.findUnique({ where: { id: ledger.partyId } });
    const receiptNo = await this.nextWaterReceiptNo();
    return (this.prisma as any).waterReceipt.create({
      data: {
        receiptNo,
        site: '思远收款',
        customerId: customer?.id,
        customerCode: customer?.code,
        customerName: customer ? `${customer.code}-${customer.name}` : ledger.partyId,
      salesperson: customer?.salesperson,
      receiptMethod: ledger.note ?? '账户收款',
      receiptDate: ledger.createdAt,
      currency: 'RMB',
      amount: ledger.amount,
        matchedAmount: roundMoney(Number(ledger.amount) - Number(ledger.balance)),
        balance: ledger.balance,
        paymentNo: undefined,
        status: Number(ledger.balance) <= 0 ? 'ARCHIVED' : 'ARRIVED',
        remark: ledger.note,
        arrivedAt: ledger.createdAt,
        arrivedBy: 'system',
        accountLedgerId: ledger.id
      },
      include: this.waterReceiptInclude()
    });
  }

  private toWaterReceiptVoucherSummary(row: any): WaterReceiptVoucherSummary {
    return {
      id: row.id,
      waterReceiptId: row.waterReceiptId,
      fileName: row.fileName,
      mimeType: row.mimeType ?? undefined,
      sizeBytes: row.sizeBytes ?? undefined,
      url: row.url ?? undefined,
      uploadedBy: row.uploadedBy ?? undefined,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? undefined
    };
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

  private toWaterReceiptSummary(row: any): WaterReceiptSummary {
    const matches = (row.matches ?? []).map((match: any) => ({
      id: match.id,
      waterReceiptId: match.waterReceiptId,
      receivableFinanceItemId: match.receivableFinanceItemId,
      shipmentId: match.shipmentId,
      systemOrderNo: match.shipment?.systemOrderNo ?? '',
      customerCode: match.shipment?.customer?.code ?? row.customerCode ?? '',
      feeName: match.receivableFinanceItem?.name ?? '应收费用',
      amount: Number(match.amount),
      source: match.source === 'AUTO' ? 'AUTO' : 'MANUAL',
      voided: match.voided,
      voidedAt: match.voidedAt?.toISOString?.() ?? match.voidedAt ?? undefined,
      createdAt: match.createdAt?.toISOString?.() ?? match.createdAt ?? undefined
    }));
    return {
      id: row.id,
      receiptNo: row.receiptNo,
      site: row.site,
      customerId: row.customerId ?? undefined,
      customerCode: row.customerCode ?? undefined,
      customerName: row.customerName ?? undefined,
      salesperson: row.salesperson ?? undefined,
      receiptMethod: row.receiptMethod ?? undefined,
      receiptDate: row.receiptDate?.toISOString?.() ?? row.receiptDate,
      currency: row.currency ?? 'RMB',
      amount: Number(row.amount),
      matchedAmount: Number(row.matchedAmount ?? 0),
      balance: Number(row.balance),
      paymentNo: row.paymentNo ?? undefined,
      status: row.status,
      remark: row.remark ?? undefined,
      arrivedAt: row.arrivedAt?.toISOString?.() ?? row.arrivedAt ?? undefined,
      arrivedBy: row.arrivedBy ?? undefined,
      archivedAt: row.archivedAt?.toISOString?.() ?? row.archivedAt ?? undefined,
      voidedAt: row.voidedAt?.toISOString?.() ?? row.voidedAt ?? undefined,
      voidedReason: row.voidedReason ?? undefined,
      accountLedgerId: row.accountLedgerId ?? undefined,
      voucher: row.voucher ? this.toWaterReceiptVoucherSummary(row.voucher) : undefined,
      matches,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? undefined,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt ?? undefined
    };
  }

  private buildWaterReceiptListResponse(rows: WaterReceiptSummary[], query: WaterReceiptListQuery = {}): WaterReceiptListResponse {
    const keyword = (value: string | undefined, needle: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const inDateRange = (value: string | undefined, from?: string, to?: string) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
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
        && (query.maxAmount === undefined || row.amount <= Number(query.maxAmount))
        && inDateRange(row.receiptDate, query.dateFrom, query.dateTo);
    });
    const sortBy = query.sortBy ?? 'receiptDate';
    const sortOrder = query.sortOrder ?? 'desc';
    filtered.sort((left, right) => {
      const valueOf = (row: WaterReceiptSummary) => {
        if (sortBy === 'amount') return row.amount;
        if (sortBy === 'balance') return row.balance;
        if (sortBy === 'receiptNo') return row.receiptNo;
        if (sortBy === 'customerCode') return row.customerCode ?? '';
        if (sortBy === 'createdAt') return row.createdAt ?? '';
        return row.receiptDate;
      };
      const result = valueOf(left) > valueOf(right) ? 1 : valueOf(left) < valueOf(right) ? -1 : 0;
      return sortOrder === 'asc' ? result : -result;
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

  private async getUsdToRmbRate(rows: ReceivableAuditSummary[]) {
    if (!rows.some((row) => (row.currency ?? 'RMB').toUpperCase() === 'USD')) {
      return 1;
    }
    const today = new Date();
    const rate = await (this.prisma as any).exchangeRate.findFirst({
      where: { baseCurrency: 'USD', quoteCurrency: 'RMB', enabled: true, activeAt: { lte: today }, OR: [{ endAt: null }, { endAt: { gte: today } }] },
      orderBy: { activeAt: 'desc' }
    });
    if (!rate) {
      throw new BadRequestException('缺少 USD 到 RMB 的系统汇率，无法计算应收合计');
    }
    return Number(rate.rate);
  }

  private toReceivableRmbAmount(amount: number, currency: string, usdRate: number) {
    const normalized = currency.toUpperCase() === 'CNY' ? 'RMB' : currency.toUpperCase();
    if (normalized === 'RMB') return roundMoney(amount);
    if (normalized === 'USD') return roundMoney(amount * usdRate);
    throw new BadRequestException(`暂不支持 ${currency} 应收折算 RMB`);
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

  private toReceivableAuditSummary(row: any, sourceType: 'SYSTEM' | 'MANUAL'): ReceivableAuditSummary {
    const customerName = `${row.shipment.customer.code}-${row.shipment.customer.name}`;
    const createdAt = this.resolveReceivableAuditCreatedAt(row);
    return {
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: row.shipment.systemOrderNo,
      customerName,
      customerId: row.shipment.customerId,
      customerCode: row.shipment.customer.code,
      customerOrderNo: row.shipment.customerOrderNo ?? undefined,
      transferNo: row.shipment.transferNo ?? undefined,
      salesperson: row.shipment.customer.salesperson ?? row.shipment.entryBy ?? row.shipment.salespersonName ?? undefined,
      name: row.name,
      amount: Number(row.amount),
      settled: Boolean(row.settled),
      type: 'RECEIVABLE',
      currency: row.currency ?? 'RMB',
      settlementMethod: this.resolveReceivableSettlementMethod(row),
	      paymentNo: row.paymentNo ?? undefined,
	      reconciliationStatus: row.reconciliationStatus ?? 'PENDING',
	      receivedAmount: Number(row.receivedAmount ?? 0),
      receiptStatus: row.receiptStatus ?? 'UNPAID',
      receiptMatchSource: row.receiptMatchSource === 'AUTO' ? 'AUTO' : row.receiptMatchSource === 'MANUAL' ? 'MANUAL' : undefined,
      receiptMatchHint: row.receiptMatchHint ?? undefined,
	      receivedAt: row.receivedAt?.toISOString?.() ?? row.receivedAt ?? undefined,
	      createdAt,
      createdBy: row.createdBy ?? undefined,
      reviewedAt: row.reviewedAt?.toISOString?.() ?? row.reviewedAt ?? undefined,
      reviewedBy: row.reviewedBy ?? undefined,
      remark: row.remark ?? undefined,
      locked: row.reconciliationStatus === 'CONFIRMED' || row.locked === true,
      voided: row.voided ?? false,
      sourceType
    };
  }

  private resolveReceivableAuditCreatedAt(row: any) {
    const reviewedAt = row.shipment?.businessReviewedAt;
    const createdAt = row.createdAt;
    if (reviewedAt && createdAt) {
      const reviewedTime = new Date(reviewedAt).getTime();
      const createdTime = new Date(createdAt).getTime();
      if (!Number.isNaN(reviewedTime) && !Number.isNaN(createdTime) && createdTime <= reviewedTime) {
        return reviewedAt?.toISOString?.() ?? reviewedAt;
      }
    }
    return createdAt?.toISOString?.() ?? createdAt ?? undefined;
  }

  private toManualReceivableAuditSummary(item: any): ReceivableAuditSummary {
    return {
      ...this.toReceivableAuditSummary(
        {
          ...item,
          settled: item.reconciliationStatus === 'CONFIRMED' || item.reconciliationStatus === 'LOCKED',
        },
        'MANUAL'
      ),
      locked: item.locked,
      sourceType: 'MANUAL'
    };
  }

  private toReceivableReviewAuditSnapshot(row: any, principal: Principal, statusFrom: string | undefined, statusTo: string, action: 'audit' | 'reverse') {
    const receivedAmount = Number(row.receivedAmount ?? 0);
    const receiptStatus = row.receiptStatus ?? 'UNPAID';
    const paymentNo = row.paymentNo ?? undefined;
    return {
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: row.shipment?.systemOrderNo,
      customerCode: row.shipment?.customer?.code,
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
      reviewedBy: row.reviewedBy ?? (action === 'audit' ? principal.username : undefined),
      reviewedAt: row.reviewedAt?.toISOString?.() ?? row.reviewedAt ?? undefined,
      reversedBy: action === 'reverse' ? principal.username : undefined,
      reversedAt: action === 'reverse' ? new Date().toISOString() : undefined,
      locked: row.locked ?? statusTo === 'CONFIRMED'
    };
  }

  private toReceivableFinanceSummary(item: any, shipment: { systemOrderNo: string }, customerName: string): ReceivableFeeSummary {
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      outboundOrderNo: shipment.systemOrderNo,
      systemOrderNo: shipment.systemOrderNo,
      customerName,
      salesperson: (shipment as { entryBy?: string; customer?: { salesperson?: string | null }; salespersonName?: string }).entryBy
        ?? (shipment as { customer?: { salesperson?: string | null } }).customer?.salesperson
        ?? (shipment as { salespersonName?: string }).salespersonName
        ?? undefined,
      name: item.name,
      amount: Number(item.amount),
      settled: item.reconciliationStatus === 'CONFIRMED' || item.reconciliationStatus === 'LOCKED',
      type: 'RECEIVABLE',
      currency: item.currency,
      settlementMethod: this.resolveReceivableSettlementMethod({ ...shipment, settlementMethod: item.settlementMethod }),
      paymentNo: item.paymentNo ?? undefined,
      matchedReceiptNo: item.paymentNo ?? undefined,
      reconciliationStatus: item.reconciliationStatus,
      receivedAmount: Number(item.receivedAmount ?? 0),
      receiptStatus: item.receiptStatus ?? 'UNPAID',
      receiptMatchSource: item.receiptMatchSource === 'AUTO' ? 'AUTO' : item.receiptMatchSource === 'MANUAL' ? 'MANUAL' : undefined,
      receiptMatchHint: item.receiptMatchHint ?? undefined,
      receivedAt: item.receivedAt?.toISOString?.() ?? item.receivedAt ?? undefined,
      createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
      createdBy: item.createdBy ?? undefined,
      reviewedAt: item.reviewedAt?.toISOString?.() ?? item.reviewedAt ?? undefined,
      reviewedBy: item.reviewedBy ?? undefined,
      remark: item.remark ?? undefined,
      locked: item.locked,
      voided: item.voided,
      sourceType: 'MANUAL',
      amountOverridden: item.amountOverridden ?? false
    };
  }

  private resolveReceivableSettlementMethod(row: any): string {
    const direct = row?.settlementMethod?.trim?.() || row?.settlementMethod;
    if (direct) return direct;
    const customerDefault = row?.shipment?.customer?.defaultSettlementMethod ?? row?.customer?.defaultSettlementMethod;
    if (customerDefault?.trim?.()) return customerDefault.trim();
    if (customerDefault) return customerDefault;
    return DEFAULT_RECEIVABLE_SETTLEMENT_METHOD;
  }

  private ensureReceivableAuditEditable(row: any) {
    if (row.voided) {
      throw new BadRequestException('应收费用已作废');
    }
    if (row.locked || row.reconciliationStatus === 'CONFIRMED' || row.reconciliationStatus === 'LOCKED') {
      throw new BadRequestException('应收费用已审核，请先反审核');
    }
  }

  private async ensureReceivableNotSettledForReverseAudit(id: string) {
    const item = await (this.prisma as any).shipmentFinanceItem.findUnique({
      where: { id },
      select: { receivedAmount: true, receiptStatus: true, paymentNo: true }
    });
    const receivedAmount = Number(item?.receivedAmount ?? 0);
    if (receivedAmount > 0 || (item?.receiptStatus && item.receiptStatus !== 'UNPAID')) {
      throw new BadRequestException('该应收已匹配水单，请先在水单匹配撤销匹配后再反审核');
    }
    const activeMatch = await (this.prisma as any).waterReceiptMatch.findFirst({
      where: { receivableFinanceItemId: id, voided: false }
    });
    if (activeMatch) {
      throw new BadRequestException('该应收存在有效水单匹配，请先撤销匹配后再反审核');
    }
  }

  private async findReceivableFinanceItemById(id: string) {
    const item = await (this.prisma as any).shipmentFinanceItem.findFirst({
      where: { id, type: 'RECEIVABLE' },
      include: { shipment: { include: { customer: true, agent: true } } }
    });
    if (!item) {
      throw new NotFoundException('应收费用不存在');
    }
    return item;
  }

  private async findShipmentForReceivableAudit(principal: Principal, input: ReceivableAuditCreateInput) {
    const systemOrderNo = input.outboundOrderNo?.trim() || input.systemOrderNo?.trim();
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        deletedAt: null,
        ...(input.shipmentId ? { id: input.shipmentId } : {}),
        ...(systemOrderNo ? { systemOrderNo } : {}),
        ...(input.customerOrderNo ? { customerOrderNo: input.customerOrderNo } : {}),
        ...(input.transferNo ? { transferNo: input.transferNo } : {}),
        ...(input.customerCode ? { customer: { code: input.customerCode } } : {}),
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
      },
      include: { customer: true, agent: true, channel: true }
    });
    if (!shipment) {
      throw new NotFoundException('未匹配到出货单号，请检查出货单号、转单号或客户编号');
    }
    return shipment;
  }

  private businessCostAuditInclude() {
    return {
      shipment: {
        include: {
          customer: true,
          agent: true,
          receivableFees: true,
          financeItems: { where: { voided: false } }
        }
      }
    };
  }

  private payableAuditInclude() {
    return {
      shipment: {
        include: {
          customer: true,
          agent: true,
          channel: true,
          receivableFees: true,
          financeItems: { where: { voided: false } }
        }
      }
    };
  }

  private payablePaymentApplicationInclude() {
    return {
      bankAccount: true,
      payeeBankAccount: true,
      attachments: { orderBy: { createdAt: 'desc' } },
      paymentApplicationItem: { include: { paymentApplication: true } },
      payableFinanceItem: { include: this.payableAuditInclude() },
      shipment: { include: { customer: true, agent: true, channel: true } }
    };
  }

  private paymentApplicationInclude() {
    return {
      bankAccount: true,
      vouchers: { orderBy: { createdAt: 'desc' } },
      items: {
        include: {
          payablePaymentApplication: { include: this.payablePaymentApplicationInclude() },
          payableFinanceItem: true,
          shipment: { include: { customer: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    };
  }

  private assertPayeeBankMatchesPending(bank: any | undefined, rows: PendingPaymentSummary[]) {
    if (!bank) return;
    const bankSummary = this.toPayeeBankAccountSummary(bank);
    for (const row of rows) {
      if (bankSummary.currency !== row.currency) throw new BadRequestException('收款银行币种必须与待付款币种一致');
      if (!row.agentName) {
        continue;
      }
      if (!this.samePayeeAgent(bankSummary.agentName, row.agentName)) throw new BadRequestException('收款银行代理必须与待付款代理一致');
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

  private async withPendingBillVouchers(rows: any[]): Promise<any[]> {
    const pendingIds = Array.from(new Set(rows.flatMap((row) => (row.items ?? []).map((item: any) => item.payablePaymentApplicationId).filter(Boolean))));
    if (!pendingIds.length) return rows;
    const vouchers = await (this.prisma as any).paymentVoucher.findMany({
      where: { pendingPaymentId: { in: pendingIds }, voucherType: { not: 'PAYMENT_RECEIPT' } },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map((row) => {
      const ids = new Set((row.items ?? []).map((item: any) => item.payablePaymentApplicationId));
      return { ...row, pendingBillVouchers: vouchers.filter((voucher: any) => ids.has(voucher.pendingPaymentId)) };
    });
  }

  private async findShipmentForFinanceAudit(principal: Principal, input: {
    shipmentId?: string;
    outboundOrderNo?: string;
    systemOrderNo?: string;
    customerOrderNo?: string;
    transferNo?: string;
    customerCode?: string;
  }) {
    const systemOrderNo = input.outboundOrderNo?.trim() || input.systemOrderNo?.trim();
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        deletedAt: null,
        ...(input.shipmentId ? { id: input.shipmentId } : {}),
        ...(systemOrderNo ? { systemOrderNo } : {}),
        ...(input.customerOrderNo ? { customerOrderNo: input.customerOrderNo } : {}),
        ...(input.transferNo ? { transferNo: input.transferNo } : {}),
        ...(input.customerCode ? { customer: { code: input.customerCode } } : {}),
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
      },
      include: { customer: true, agent: true }
    });
    if (!shipment) {
      throw new NotFoundException('未匹配到出货单号，请检查出货单号、转单号或客户编号');
    }
    return shipment;
  }

  private toPayableAuditShipmentMatchSummary(shipment: any): PayableAuditShipmentMatchSummary {
    return {
      shipmentId: shipment.id,
      customerCode: shipment.customer.code,
      customerName: `${shipment.customer.code}-${shipment.customer.name}`,
      customerOrderNo: shipment.customerOrderNo ?? undefined,
      outboundOrderNo: shipment.systemOrderNo,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo ?? undefined,
      salesperson: shipment.customer.salesperson ?? shipment.entryBy ?? shipment.salespersonName ?? undefined,
      agentName: shipment.agent?.name ?? undefined,
      agentChannel: shipment.channel?.name ?? undefined
    };
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

  private canAccessBusinessCostShipment(principal: Principal, shipment: any) {
    if (principal.role !== 'OPERATOR') return true;
    const salesperson = shipment.entryBy ?? shipment.customer?.salesperson ?? shipment.salespersonName ?? shipment.salesperson;
    return Boolean(salesperson && this.operatorCustomerScope(principal)?.includes(salesperson));
  }

  private canAccessBusinessCostRow(principal: Principal, row: any, canViewAll: boolean) {
    if (canViewAll || principal.role !== 'OPERATOR') return true;
    return this.canAccessBusinessCostShipment(principal, row.shipment);
  }

  private async buildBusinessCostAuditListResponse(rows: BusinessCostAuditSummary[], query: BusinessCostAuditListQuery): Promise<BusinessCostAuditListResponse> {
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
    const decorated = await this.decorateBusinessCostRows(filtered);
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
      pagination: {
        page,
        pageSize,
        totalItems: sorted.length
      }
    };
  }

  private async decorateBusinessCostRows(rows: BusinessCostAuditSummary[]): Promise<BusinessCostAuditSummary[]> {
    const usdRate = await this.getBusinessCostUsdToRmbRate(rows);
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

  private async getBusinessCostUsdToRmbRate(rows: BusinessCostAuditSummary[]) {
    if (!rows.some((row) => (row.currency ?? 'RMB').toUpperCase() === 'USD')) return 1;
    const today = new Date();
    const rate = await (this.prisma as any).exchangeRate.findFirst({
      where: { baseCurrency: 'USD', quoteCurrency: 'RMB', enabled: true, activeAt: { lte: today }, OR: [{ endAt: null }, { endAt: { gte: today } }] },
      orderBy: { activeAt: 'desc' }
    });
    if (!rate) {
      throw new BadRequestException('缺少 USD 到 RMB 的系统汇率，无法计算业务成本合计');
    }
    return Number(rate.rate);
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
    return {
      successCount: rows.length,
      failureCount: failures.length,
      rows,
      failures
    };
  }

  private async buildPayableAuditListResponse(rows: PayableAuditSummary[], query: PayableAuditListQuery): Promise<PayableAuditListResponse> {
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
        && keyword(row.agentName, query.agent)
        && keyword(row.name, query.feeName)
        && keyword(row.createdBy, query.createdBy)
        && keyword(row.reviewedBy, query.reviewedBy)
        && keyword(row.paymentNo, query.paymentNo)
        && keyword(row.remark, query.remark)
        && inRange(row.createdAt, query.createdFrom, query.createdTo)
        && inRange(row.reviewedAt, query.reviewedFrom, query.reviewedTo);
    });
    const decorated = await this.decoratePayableRows(filtered);
    const activeRows = decorated.filter((row) => !row.voided);
    const amountByCurrency = Array.from(
      activeRows.reduce((map, row) => {
        const currency = row.currency ?? 'RMB';
        map.set(currency, roundMoney((map.get(currency) ?? 0) + row.amount));
        return map;
      }, new Map<string, number>())
    ).map(([currency, amount]) => ({ currency, amount }));
    const sorted = [...decorated].sort((left, right) => this.comparePayableRows(left, right, query.sortBy, query.sortOrder));
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Number(query.pageSize) === -1 ? sorted.length || 1 : Math.min(10000, Math.max(1, Number(query.pageSize ?? 10) || 10));
    return {
      rows: sorted.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
      totals: {
        amountByCurrency,
        rmbTotal: roundMoney(activeRows.reduce((sum, row) => sum + (row.rmbAmount ?? 0), 0)),
        pendingCount: activeRows.filter((row) => row.reconciliationStatus !== 'CONFIRMED').length,
        confirmedCount: activeRows.filter((row) => row.reconciliationStatus === 'CONFIRMED').length,
        voidedCount: filtered.filter((row) => row.voided).length,
        receivableProfitTotal: activeRows.some((row) => row.canViewProfit)
          ? roundMoney(activeRows.reduce((sum, row) => sum + (row.receivableProfit ?? 0), 0))
          : undefined,
        operationProfitTotal: activeRows.some((row) => row.canViewProfit)
          ? roundMoney(activeRows.reduce((sum, row) => sum + (row.operationProfit ?? 0), 0))
          : undefined
      },
      pagination: { page, pageSize, totalItems: sorted.length }
    };
  }

  private async decoratePayableRows(rows: PayableAuditSummary[]): Promise<PayableAuditSummary[]> {
    const usdRate = await this.getPayableUsdToRmbRate(rows);
    const decorated = rows.map((row) => {
      const currency = row.currency ?? 'RMB';
      return { ...row, currency, rmbAmount: this.toPayableRmbAmount(row.amount, currency, usdRate) };
    });
    const orderTotals = decorated.reduce((map, row) => {
      if (row.voided) return map;
      map.set(row.systemOrderNo, roundMoney((map.get(row.systemOrderNo) ?? 0) + (row.rmbAmount ?? 0)));
      return map;
    }, new Map<string, number>());
    return decorated.map((row) => ({ ...row, orderRmbTotal: orderTotals.get(row.systemOrderNo) ?? 0 }));
  }

  private async getPayableUsdToRmbRate(rows: PayableAuditSummary[]) {
    if (!rows.some((row) => (row.currency ?? 'RMB').toUpperCase() === 'USD')) return 1;
    const today = new Date();
    const rate = await (this.prisma as any).exchangeRate.findFirst({
      where: { baseCurrency: 'USD', quoteCurrency: 'RMB', enabled: true, activeAt: { lte: today }, OR: [{ endAt: null }, { endAt: { gte: today } }] },
      orderBy: { activeAt: 'desc' }
    });
    if (!rate) {
      throw new BadRequestException('缺少 USD 到 RMB 的系统汇率，无法计算应付合计');
    }
    return Number(rate.rate);
  }

  private toPayableRmbAmount(amount: number, currency: string, usdRate: number) {
    const normalized = currency.toUpperCase() === 'CNY' ? 'RMB' : currency.toUpperCase();
    if (normalized === 'RMB') return roundMoney(amount);
    if (normalized === 'USD') return roundMoney(amount * usdRate);
    throw new BadRequestException(`暂不支持 ${currency} 应付折算 RMB`);
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
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue), 'zh-Hans-CN') * direction;
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
    if (chargeWeightKg !== undefined && unitPrice !== undefined) {
      return Number((Number(chargeWeightKg) * Number(unitPrice)).toFixed(2));
    }
    return fallback;
  }

  private async isRouteAgentPayable(item: any) {
    const hasRouteCostShape = item.type === 'PAYABLE'
      && item.name === '代理成本'
      && item.amountOverridden === false
      && item.chargeWeightKg !== null
      && item.chargeWeightKg !== undefined
      && item.unitPrice !== null
      && item.unitPrice !== undefined;
    if (!hasRouteCostShape) return false;
    const routeLogs = await this.prisma.auditLog.findMany({
      where: { target: item.shipmentId, action: 'shipment.route' },
      select: { after: true }
    });
    return routeLogs.some((row: any) => this.routeLogMatchesPayable(row.after, item));
  }

  private routeLogMatchesPayable(after: unknown, item: any) {
    const row = after as { payableTotal?: number; chargeWeightKg?: number; unitPrice?: number } | undefined;
    if (!row) return false;
    return Math.abs(Number(row.payableTotal) - Number(item.amount)) < 0.01
      && Math.abs(Number(row.chargeWeightKg) - Number(item.chargeWeightKg)) < 0.01
      && Math.abs(Number(row.unitPrice) - Number(item.unitPrice)) < 0.01;
  }

  private async hasBusinessDataApproval(shipmentId: string) {
    return Boolean(await this.prisma.auditLog.findFirst({
      where: { target: shipmentId, action: 'customer_service.business_data.approved' },
      select: { id: true }
    }));
  }

  private async isBusinessEnteredPayable(item: any) {
    if (item.type !== 'PAYABLE' || !item.createdBy) return false;
    const creator = await this.prisma.user.findUnique({ where: { username: item.createdBy }, select: { roleId: true } });
    return Boolean(creator && isSalesScopedRole(creator.roleId));
  }

  private async canExposePayableToFinance(item: any) {
    return await this.isRouteAgentPayable(item) || !await this.isBusinessEnteredPayable(item) || await this.hasBusinessDataApproval(item.shipmentId);
  }

  private async ensurePayableReadyForFinance(item: any) {
    if (!await this.canExposePayableToFinance(item)) throw new BadRequestException('客服确认数据后才能审核该应付费用');
  }

  private async canExposePendingPaymentToFinance(row: any) {
    return !row.payableFinanceItem || await this.canExposePayableToFinance(row.payableFinanceItem);
  }

  private async ensurePendingPaymentReadyForFinance(row: any) {
    if (!await this.canExposePendingPaymentToFinance(row)) throw new BadRequestException('客服确认数据后才能申请付款');
  }

  private async upsertPayablePaymentApplication(item: any) {
    return (this.prisma as any).payablePaymentApplication.upsert({
      where: { payableFinanceItemId: item.id },
      create: {
        payableFinanceItemId: item.id,
        shipmentId: item.shipmentId,
        amount: item.amount,
        currency: item.currency ?? 'RMB',
        paymentNo: item.paymentNo,
        status: 'PENDING',
        applicationStatus: 'PENDING',
        appliedAt: null,
        invalidatedAt: null,
        remark: item.remark
      },
      update: {
        amount: item.amount,
        currency: item.currency ?? 'RMB',
        paymentNo: item.paymentNo,
        status: 'PENDING',
        applicationStatus: 'PENDING',
        appliedAt: null,
        invalidatedAt: null,
        remark: item.remark
      }
    });
  }

  private async findBusinessCostFinanceItemById(id: string) {
    const item = await (this.prisma as any).shipmentFinanceItem.findFirst({
      where: { id, type: 'BUSINESS_COST' },
      include: this.businessCostAuditInclude()
    });
    if (!item) {
      throw new NotFoundException('业务成本不存在');
    }
    return item;
  }

  private async findPayableFinanceItemById(id: string) {
    const item = await (this.prisma as any).shipmentFinanceItem.findFirst({
      where: { id, type: 'PAYABLE' },
      include: this.payableAuditInclude()
    });
    if (!item) {
      throw new NotFoundException('应付费用不存在');
    }
    return item;
  }

  private async findPayablePaymentApplicationById(id: string) {
    const application = await (this.prisma as any).payablePaymentApplication.findUnique({
      where: { id },
      include: this.payablePaymentApplicationInclude()
    });
    if (!application) {
      throw new NotFoundException('待付款记录不存在');
    }
    return application;
  }

  private async findPaymentApplicationById(id: string) {
    const application = await (this.prisma as any).paymentApplication.findUnique({
      where: { id },
      include: this.paymentApplicationInclude()
    });
    if (!application) {
      throw new NotFoundException('付款申请不存在');
    }
    return application;
  }

  private async nextPaymentApplicationNo() {
    const prefix = `FKSQ${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
    const count = await (this.prisma as any).paymentApplication.count({ where: { applicationNo: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private ensureBusinessCostAuditEditable(row: any) {
    if (row.voided) {
      throw new BadRequestException('业务成本已作废');
    }
    if (row.locked || row.reconciliationStatus === 'CONFIRMED' || row.reconciliationStatus === 'LOCKED') {
      throw new BadRequestException('业务成本已审核，请先反审核');
    }
  }

  private ensurePayableAuditEditable(row: any) {
    if (row.voided) {
      throw new BadRequestException('应付费用已作废');
    }
    if (row.locked || row.reconciliationStatus === 'CONFIRMED' || row.reconciliationStatus === 'LOCKED') {
      throw new BadRequestException('应付费用已审核，请先反审核');
    }
  }

  private calculateBusinessCostAmount(chargeWeightKg?: number, unitPrice?: number, fallback = 0) {
    if (chargeWeightKg !== undefined && unitPrice !== undefined) {
      return Number((Number(chargeWeightKg) * Number(unitPrice)).toFixed(2));
    }
    return fallback;
  }

  private toBusinessCostAuditSummary(item: any, visibility: { canViewAgent: boolean; canViewProfit: boolean } = { canViewAgent: true, canViewProfit: true }): BusinessCostAuditSummary {
    const shipment = item.shipment;
    const receivableFees = (shipment.receivableFees ?? []).filter((row: any) => !row.voided);
    const financeItems = (shipment.financeItems ?? []).filter((row: any) => !row.voided);
    const receivableTotal = [
      ...receivableFees.map((row: any) => Number(row.amount)),
      ...financeItems.filter((row: any) => row.type === 'RECEIVABLE').map((row: any) => Number(row.amount))
    ].reduce((sum, amount) => sum + amount, 0);
    const businessCostTotal = financeItems
      .filter((row: any) => row.type === 'BUSINESS_COST')
      .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
    const customerName = `${shipment.customer.code}-${shipment.customer.name}`;

    return {
      ...this.toBusinessCostFinanceSummary(item, shipment),
      customerCode: shipment.customer.code,
      customerName,
      customerOrderNo: shipment.customerOrderNo ?? undefined,
      outboundOrderNo: shipment.systemOrderNo,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo ?? undefined,
      salesperson: shipment.customer.salesperson ?? shipment.entryBy ?? shipment.salespersonName ?? undefined,
      agentName: visibility.canViewAgent ? item.agentName ?? shipment.agent?.name ?? undefined : undefined,
      receivableTotal,
      businessCostTotal,
      businessProfit: visibility.canViewProfit ? Number((receivableTotal - businessCostTotal).toFixed(2)) : undefined,
      canViewAgent: visibility.canViewAgent,
      canViewProfit: visibility.canViewProfit
    };
  }

  private toBusinessCostReviewAuditSnapshot(item: any, principal: Principal, statusFrom: string | undefined, statusTo: string, action: 'audit' | 'reverse') {
    const shipment = item.shipment;
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      systemOrderNo: shipment?.systemOrderNo,
      customerCode: shipment?.customer?.code,
      salesperson: shipment?.customer?.salesperson ?? shipment?.salespersonName ?? undefined,
      name: item.name,
      chargeWeightKg: item.chargeWeightKg === null || item.chargeWeightKg === undefined ? undefined : Number(item.chargeWeightKg),
      unitPrice: item.unitPrice === null || item.unitPrice === undefined ? undefined : Number(item.unitPrice),
      amount: Number(item.amount),
      currency: item.currency ?? 'RMB',
      statusFrom: statusFrom ?? 'PENDING',
      statusTo,
      reviewStatus: statusTo,
      reviewedBy: item.reviewedBy ?? (action === 'audit' ? principal.username : undefined),
      reviewedAt: item.reviewedAt?.toISOString?.() ?? item.reviewedAt ?? undefined,
      reversedBy: action === 'reverse' ? principal.username : undefined,
      reversedAt: action === 'reverse' ? new Date().toISOString() : undefined,
      locked: item.locked
    };
  }

  private toPayableReviewAuditSnapshot(item: any, principal: Principal, statusFrom: string | undefined, statusTo: string, action: 'audit' | 'reverse', application?: any) {
    const shipment = item.shipment;
    const agentName = item.agentName ?? shipment?.agent?.name ?? undefined;
    const channelName = shipment?.channel?.name ?? undefined;
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      systemOrderNo: shipment?.systemOrderNo,
      customerCode: shipment?.customer?.code,
      realAgentName: agentName,
      agentName,
      agentChannel: channelName,
      channelName,
      chargeWeightKg: item.chargeWeightKg === null || item.chargeWeightKg === undefined ? undefined : Number(item.chargeWeightKg),
      unitPrice: item.unitPrice === null || item.unitPrice === undefined ? undefined : Number(item.unitPrice),
      amount: Number(item.amount),
      currency: item.currency ?? 'RMB',
      routingSource: shipment?.agentId || shipment?.channelId ? 'ROUTING' : 'MANUAL',
      supplierBillNo: item.paymentNo ?? undefined,
      paymentNo: item.paymentNo ?? undefined,
      pendingPaymentId: application?.id,
      pendingPaymentStatus: application?.status,
      statusFrom: statusFrom ?? 'PENDING',
      statusTo,
      reviewStatus: statusTo,
      reviewedBy: item.reviewedBy ?? (action === 'audit' ? principal.username : undefined),
      reviewedAt: item.reviewedAt?.toISOString?.() ?? item.reviewedAt ?? undefined,
      reversedBy: action === 'reverse' ? principal.username : undefined,
      reversedAt: action === 'reverse' ? new Date().toISOString() : undefined,
      locked: item.locked
    };
  }

  private toPayableAuditSummary(item: any, visibility: { canViewSensitivePayable: boolean; canViewProfit: boolean } = { canViewSensitivePayable: true, canViewProfit: true }): PayableAuditSummary {
    const shipment = item.shipment;
    const receivableFees = (shipment.receivableFees ?? []).filter((row: any) => !row.voided);
    const financeItems = (shipment.financeItems ?? []).filter((row: any) => !row.voided);
    const receivableTotal = [
      ...receivableFees.map((row: any) => Number(row.amount)),
      ...financeItems.filter((row: any) => row.type === 'RECEIVABLE').map((row: any) => Number(row.amount))
    ].reduce((sum, amount) => sum + amount, 0);
    const businessCostTotal = financeItems
      .filter((row: any) => row.type === 'BUSINESS_COST')
      .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
    const payableTotal = financeItems
      .filter((row: any) => row.type === 'PAYABLE')
      .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
    const customerName = `${shipment.customer.code}-${shipment.customer.name}`;
    const base = this.toPayableFinanceSummary(item, shipment);

    return {
      ...base,
      amount: visibility.canViewSensitivePayable ? base.amount : 0,
      agentName: visibility.canViewSensitivePayable ? item.agentName ?? shipment.agent?.name ?? undefined : undefined,
      customerCode: shipment.customer.code,
      customerName,
      customerOrderNo: shipment.customerOrderNo ?? undefined,
      outboundOrderNo: shipment.systemOrderNo,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo ?? undefined,
      agentChannel: shipment.channel?.name ?? undefined,
      salesperson: shipment.entryBy ?? shipment.customer.salesperson ?? shipment.salespersonName ?? undefined,
      payableTotal: visibility.canViewSensitivePayable ? Number(payableTotal.toFixed(2)) : 0,
      receivableProfit: visibility.canViewProfit ? Number((receivableTotal - payableTotal).toFixed(2)) : undefined,
      operationProfit: visibility.canViewProfit ? Number((businessCostTotal - payableTotal).toFixed(2)) : undefined,
      canViewSensitivePayable: visibility.canViewSensitivePayable,
      canViewProfit: visibility.canViewProfit
    };
  }

  private toAgentBankAccountSummary(row: any): AgentBankAccountSummary {
    return {
      id: row.id,
      agentId: row.agentId ?? undefined,
      agentName: row.agentName,
      accountName: row.accountName,
      bankName: row.bankName,
      bankAccountNo: row.bankAccountNo,
      currency: row.currency ?? 'RMB',
      remark: row.remark ?? undefined,
      enabled: row.enabled,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? undefined,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt ?? undefined
    };
  }

  private normalizePaymentCurrency(value?: string): 'RMB' | 'USD' {
    const currency = (value ?? 'RMB').toUpperCase();
    if (currency === 'RMB' || currency === 'USD') return currency;
    throw new BadRequestException('待付款第一版仅支持 RMB / USD');
  }

  private toPayeeBankAccountSummary(row: any): PayeeBankAccountSummary {
    return {
      id: row.id,
      agentId: row.agentId ?? undefined,
      agentName: row.agentName,
      accountName: row.accountName,
      bankName: row.bankName,
      bankAccountNo: row.bankAccountNo,
      currency: this.normalizePaymentCurrency(row.currency),
      remark: row.remark ?? undefined,
      enabled: row.enabled,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? undefined,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt ?? undefined
    };
  }

  private toPaymentVoucherSummary(row: any, pending?: any, application?: any): PaymentVoucherSummary {
    const paymentApplication = application ?? pending?.paymentApplicationItem?.paymentApplication;
    const payable = pending?.payableFinanceItem;
    const shipment = pending?.shipment ?? payable?.shipment;
    return {
      id: row.id,
      paymentApplicationId: row.paymentApplicationId ?? paymentApplication?.id ?? undefined,
      pendingPaymentId: row.pendingPaymentId ?? undefined,
      voucherType: row.voucherType ?? 'BILL',
      payableFinanceItemId: pending?.payableFinanceItemId,
      systemOrderNo: shipment?.systemOrderNo,
      transferNo: row.transferNo ?? shipment?.transferNo ?? undefined,
      agentChannel: shipment?.channel?.name ?? undefined,
      chargeWeightKg: payable?.chargeWeightKg === null || payable?.chargeWeightKg === undefined ? undefined : Number(payable.chargeWeightKg),
      unitPrice: payable?.unitPrice === null || payable?.unitPrice === undefined ? undefined : Number(payable.unitPrice),
      payableAmount: pending?.amount === null || pending?.amount === undefined ? undefined : Number(pending.amount),
      paymentApplicationNo: paymentApplication?.applicationNo,
      paidPaymentId: paymentApplication?.status === 'PAID' ? paymentApplication.id : undefined,
      paidAt: paymentApplication?.status === 'PAID' ? paymentApplication.paidAt?.toISOString?.() ?? paymentApplication.paidAt ?? undefined : undefined,
      billNo: row.billNo ?? undefined,
      agentName: row.agentName ?? undefined,
      billDate: row.billDate?.toISOString?.() ?? row.billDate ?? undefined,
      currency: row.currency ?? undefined,
      billAmount: row.billAmount === null || row.billAmount === undefined ? undefined : Number(row.billAmount),
      status: row.status ?? 'IMPORTED',
      differenceType: row.differenceType ?? undefined,
      differenceAmount: row.differenceAmount === null || row.differenceAmount === undefined ? undefined : Number(row.differenceAmount),
      differenceReason: row.differenceReason ?? undefined,
      differenceStatus: row.differenceStatus ?? undefined,
      differenceHandledBy: row.differenceHandledBy ?? undefined,
      differenceHandledAt: row.differenceHandledAt?.toISOString?.() ?? row.differenceHandledAt ?? undefined,
      extraFeeType: row.extraFeeType ?? undefined,
      extraFeeAmount: row.extraFeeAmount === null || row.extraFeeAmount === undefined ? undefined : Number(row.extraFeeAmount),
      extraFeeCurrency: row.extraFeeCurrency ?? undefined,
      extraFeeAgentName: row.extraFeeAgentName ?? undefined,
      extraFeeCustomerCode: row.extraFeeCustomerCode ?? undefined,
      extraFeeSystemOrderNo: row.extraFeeSystemOrderNo ?? undefined,
      extraFeeOccurredAt: row.extraFeeOccurredAt?.toISOString?.() ?? row.extraFeeOccurredAt ?? undefined,
      extraFeeFinanceItemId: row.extraFeeFinanceItemId ?? undefined,
      extraFeeRemark: row.extraFeeRemark ?? undefined,
      kuayueBillNo: row.kuayueBillNo ?? undefined,
      kuayueCustomerCode: row.kuayueCustomerCode ?? undefined,
      kuayueSystemOrderNo: row.kuayueSystemOrderNo ?? undefined,
      kuayueAmount: row.kuayueAmount === null || row.kuayueAmount === undefined ? undefined : Number(row.kuayueAmount),
      kuayueCurrency: row.kuayueCurrency ?? undefined,
      kuayueBillDate: row.kuayueBillDate?.toISOString?.() ?? row.kuayueBillDate ?? undefined,
      kuayueStatus: row.kuayueStatus ?? undefined,
      fileName: row.fileName,
      mimeType: row.mimeType ?? undefined,
      sizeBytes: row.sizeBytes ?? undefined,
      url: row.url ?? undefined,
      uploadedBy: row.uploadedBy ?? undefined,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? undefined
    };
  }

  private paymentApplicationVouchers(row: any): PaymentVoucherSummary[] {
    const vouchers = [...(row.pendingBillVouchers ?? []), ...(row.vouchers ?? [])].map((item: any) => this.toPaymentVoucherSummary(item));
    return Array.from(new Map(vouchers.map((item) => [item.id, item])).values());
  }

  private maskBankAccountNo(accountNo: string | undefined, canView: boolean) {
    if (!accountNo || canView) return accountNo;
    return accountNo.length <= 4 ? '****' : `${'*'.repeat(Math.max(4, accountNo.length - 4))}${accountNo.slice(-4)}`;
  }

  private toPendingPaymentSummary(row: any, vouchers: any[] = []): PendingPaymentSummary {
    const shipment = row.shipment ?? row.payableFinanceItem?.shipment;
    const payable = row.payableFinanceItem;
    const paymentApplication = row.paymentApplicationItem?.paymentApplication;
    const status = (row.applicationStatus === 'APPLIED' || paymentApplication?.status === 'WAITING_PAYMENT')
      ? 'APPLIED'
      : row.status;
    return {
      id: row.id,
      payableFinanceItemId: row.payableFinanceItemId,
      paymentApplicationId: paymentApplication?.id,
      shipmentId: row.shipmentId,
      date: row.appliedAt?.toISOString?.() ?? row.appliedAt ?? row.createdAt?.toISOString?.() ?? row.createdAt,
      agentName: payable?.agentName ?? shipment.agent?.name ?? undefined,
      salesperson: shipment.customer?.salesperson ?? shipment.entryBy ?? shipment.salespersonName ?? undefined,
      customerCode: shipment.customer.code,
      customerName: `${shipment.customer.code}-${shipment.customer.name}`,
      outboundOrderNo: shipment.systemOrderNo,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo ?? undefined,
      feeName: payable?.name ?? '应付费用',
      amount: Number(row.amount),
      currency: this.normalizePaymentCurrency(row.currency),
      remark: row.remark ?? undefined,
      status,
      bankAccount: row.payeeBankAccount ? this.toPayeeBankAccountSummary(row.payeeBankAccount) : undefined,
      vouchers: vouchers.map((item) => this.toPaymentVoucherSummary(item)),
      paymentApplicationNo: paymentApplication?.applicationNo,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? undefined,
      appliedAt: row.appliedAt?.toISOString?.() ?? row.appliedAt ?? undefined
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
      const valueOf = (row: PendingPaymentSummary) => {
        if (sortBy === 'amount') return row.amount;
        if (sortBy === 'currency') return row.currency;
        if (sortBy === 'agentName') return row.agentName ?? '';
        if (sortBy === 'systemOrderNo') return row.systemOrderNo;
        if (sortBy === 'customerCode') return row.customerCode;
        return row.date;
      };
      const result = valueOf(left) > valueOf(right) ? 1 : valueOf(left) < valueOf(right) ? -1 : 0;
      return sortOrder === 'asc' ? result : -result;
    });
    const totals = filtered.reduce((acc, row) => {
      const bucket = acc.amountByCurrency.find((item) => item.currency === row.currency);
      if (bucket) bucket.amount = Number((bucket.amount + row.amount).toFixed(2));
      else acc.amountByCurrency.push({ currency: row.currency, amount: row.amount });
      return acc;
    }, { count: filtered.length, amountByCurrency: [] as Array<{ currency: 'RMB' | 'USD'; amount: number }> });
    const { page, pageSize, rows: pagedRows } = this.paginateRows(filtered, query);
    return {
      rows: pagedRows,
      totals,
      pagination: { page, pageSize, totalItems: filtered.length }
    };
  }

  private toPaymentApplicationSummary(row: any): PaymentApplicationSummary {
    return {
      id: row.id,
      applicationNo: row.applicationNo,
      agentName: row.agentName,
      currency: this.normalizePaymentCurrency(row.currency),
      totalAmount: Number(row.totalAmount),
      status: row.status,
      bankAccount: row.bankAccount ? this.toPayeeBankAccountSummary(row.bankAccount) : undefined,
      remark: row.remark ?? undefined,
      payerBankName: row.payerBankName ?? undefined,
      payerBankAccountName: row.payerBankAccountName ?? undefined,
      payerBankAccountNo: row.payerBankAccountNo ?? undefined,
      paidAt: row.paidAt?.toISOString?.() ?? row.paidAt ?? undefined,
      paidBy: row.paidBy ?? undefined,
      paidRemark: row.paidRemark ?? undefined,
      reversedAt: row.reversedAt?.toISOString?.() ?? row.reversedAt ?? undefined,
      reversedBy: row.reversedBy ?? undefined,
      reverseReason: row.reverseReason ?? undefined,
      appliedBy: row.appliedBy ?? undefined,
      appliedAt: row.appliedAt?.toISOString?.() ?? row.appliedAt ?? undefined,
      canceledAt: row.canceledAt?.toISOString?.() ?? row.canceledAt ?? undefined,
      items: (row.items ?? []).map((item: any) => ({
        id: item.id,
        pendingPaymentId: item.payablePaymentApplicationId,
        payableFinanceItemId: item.payableFinanceItemId,
        shipmentId: item.shipmentId,
        outboundOrderNo: item.shipment?.systemOrderNo ?? item.payablePaymentApplication?.systemOrderNo ?? '',
        systemOrderNo: item.shipment?.systemOrderNo ?? item.payablePaymentApplication?.systemOrderNo ?? '',
        customerCode: item.shipment?.customer?.code ?? item.payablePaymentApplication?.shipment?.customer?.code ?? '',
        feeName: item.payableFinanceItem?.name ?? item.payablePaymentApplication?.payableFinanceItem?.name ?? '应付费用',
        amount: Number(item.amount),
        currency: this.normalizePaymentCurrency(item.currency)
      })),
      vouchers: this.paymentApplicationVouchers(row)
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

  private toPaidPaymentSummary(row: any, canViewBank: boolean): PaidPaymentSummary {
    const items = (row.items ?? []).map((item: any) => ({
      id: item.id,
      pendingPaymentId: item.payablePaymentApplicationId,
      payableFinanceItemId: item.payableFinanceItemId,
      shipmentId: item.shipmentId,
      outboundOrderNo: item.shipment?.systemOrderNo ?? item.payablePaymentApplication?.shipment?.systemOrderNo ?? '',
      systemOrderNo: item.shipment?.systemOrderNo ?? item.payablePaymentApplication?.shipment?.systemOrderNo ?? '',
      customerCode: item.shipment?.customer?.code ?? item.payablePaymentApplication?.shipment?.customer?.code ?? '',
      feeName: item.payableFinanceItem?.name ?? item.payablePaymentApplication?.payableFinanceItem?.name ?? '应付费用',
      amount: Number(item.amount),
      currency: this.normalizePaymentCurrency(item.currency)
    }));
    const firstItem = row.items?.[0];
    const firstShipment = firstItem?.shipment ?? firstItem?.payablePaymentApplication?.shipment;
    const vouchers = this.paymentApplicationVouchers(row);
    const bankAccount = row.bankAccount ? this.toPayeeBankAccountSummary(row.bankAccount) : undefined;
    if (bankAccount) {
      bankAccount.bankAccountNo = this.maskBankAccountNo(bankAccount.bankAccountNo, canViewBank) ?? bankAccount.bankAccountNo;
    }
    return {
      id: row.id,
      applicationNo: row.applicationNo,
      date: row.paidAt?.toISOString?.() ?? row.paidAt ?? row.appliedAt?.toISOString?.() ?? row.appliedAt,
      agentName: row.agentName,
      salesperson: firstShipment?.customer?.salesperson ?? firstShipment?.salespersonName ?? undefined,
      customerCode: items[0]?.customerCode,
      outboundOrderNo: items.length === 1 ? items[0]?.systemOrderNo : `${items[0]?.systemOrderNo ?? '-'} 等${items.length}票`,
      systemOrderNo: items.length === 1 ? items[0]?.systemOrderNo : `${items[0]?.systemOrderNo ?? '-'} 等${items.length}票`,
      feeName: items.length === 1 ? items[0]?.feeName : `${items[0]?.feeName ?? '应付费用'} 等${items.length}项`,
      currency: this.normalizePaymentCurrency(row.currency),
      totalAmount: Number(row.totalAmount),
      remark: row.remark ?? row.paidRemark ?? undefined,
      status: row.status,
      billVouchers: vouchers.filter((item: PaymentVoucherSummary) => item.voucherType !== 'PAYMENT_RECEIPT'),
      waterReceipts: vouchers.filter((item: PaymentVoucherSummary) => item.voucherType === 'PAYMENT_RECEIPT'),
      payeeBankAccount: bankAccount,
      payerBankName: row.payerBankName ?? undefined,
      payerBankAccountName: row.payerBankAccountName ?? undefined,
      payerBankAccountNo: this.maskBankAccountNo(row.payerBankAccountNo ?? undefined, canViewBank),
      paidAt: row.paidAt?.toISOString?.() ?? row.paidAt ?? undefined,
      paidBy: row.paidBy ?? undefined,
      paidRemark: row.paidRemark ?? undefined,
      items
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
    return {
      rows: pagedRows,
      totals,
      pagination: { page, pageSize, totalItems: filtered.length }
    };
  }

  private toPayableFinanceSummary(item: any, shipment: { agent?: { name: string } | null; agentName?: string }): PayableFeeSummary {
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      name: item.name,
      amount: Number(item.amount),
      settled: item.reconciliationStatus === 'CONFIRMED' || item.reconciliationStatus === 'LOCKED',
      salesperson: (shipment as { entryBy?: string; customer?: { salesperson?: string | null }; salespersonName?: string }).entryBy
        ?? (shipment as { customer?: { salesperson?: string | null } }).customer?.salesperson
        ?? (shipment as { salespersonName?: string }).salespersonName
        ?? undefined,
      agentName: item.agentName ?? shipment.agent?.name ?? shipment.agentName ?? undefined,
      type: 'PAYABLE',
      currency: item.currency,
      settlementMethod: item.settlementMethod ?? undefined,
      paymentNo: item.paymentNo ?? undefined,
      reconciliationStatus: item.reconciliationStatus,
      createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
      createdBy: item.createdBy ?? undefined,
      reviewedAt: item.reviewedAt?.toISOString?.() ?? item.reviewedAt ?? undefined,
      reviewedBy: item.reviewedBy ?? undefined,
      remark: item.remark ?? undefined,
      locked: item.locked,
      voided: item.voided,
      sourceType: 'MANUAL',
      chargeWeightKg: item.chargeWeightKg === null || item.chargeWeightKg === undefined ? undefined : Number(item.chargeWeightKg),
      unitPrice: item.unitPrice === null || item.unitPrice === undefined ? undefined : Number(item.unitPrice),
      amountOverridden: item.amountOverridden ?? false
    };
  }

  private toBusinessCostFinanceSummary(item: any, shipment?: { agent?: { name: string } | null; agentName?: string }) {
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      name: item.name,
      amount: Number(item.amount),
      settled: item.reconciliationStatus === 'CONFIRMED' || item.reconciliationStatus === 'LOCKED',
      salesperson: (shipment as { entryBy?: string; customer?: { salesperson?: string | null }; salespersonName?: string } | undefined)?.entryBy
        ?? (shipment as { customer?: { salesperson?: string | null } } | undefined)?.customer?.salesperson
        ?? (shipment as { salespersonName?: string } | undefined)?.salespersonName
        ?? undefined,
      agentName: item.agentName ?? shipment?.agent?.name ?? shipment?.agentName ?? undefined,
      type: 'BUSINESS_COST' as const,
      currency: item.currency,
      settlementMethod: item.settlementMethod ?? undefined,
      reconciliationStatus: item.reconciliationStatus,
      createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
      createdBy: item.createdBy ?? undefined,
      reviewedAt: item.reviewedAt?.toISOString?.() ?? item.reviewedAt ?? undefined,
      reviewedBy: item.reviewedBy ?? undefined,
      remark: item.remark ?? undefined,
      locked: item.locked,
      voided: item.voided,
      sourceType: 'MANUAL' as const,
      chargeWeightKg: item.chargeWeightKg === null || item.chargeWeightKg === undefined ? undefined : Number(item.chargeWeightKg),
      unitPrice: item.unitPrice === null || item.unitPrice === undefined ? undefined : Number(item.unitPrice),
      amountOverridden: item.amountOverridden ?? false
    };
  }

  private operatorCustomerScope(principal: Principal) {
    if (principal.role === 'UG_MARKET' || !isSalesScopedRole(principal.role)) {
      return undefined;
    }
    return Array.from(new Set([principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value))));
  }

  private ensureCustomerMasterAccess(principal: Principal, customer: { salesperson?: string | null } | null) {
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const scope = this.operatorCustomerScope(principal);
    if (scope && (!customer.salesperson || !scope.includes(customer.salesperson))) {
      throw new ForbiddenException('业务员只能操作自己名下客户');
    }
  }

  private async resolveCustomerSalespersonAssignment(principal: Principal, requested: string | undefined, current?: string) {
    const scope = this.operatorCustomerScope(principal);
    if (scope) return principal.username;
    if (requested === undefined) return current;
    const username = requested.trim();
    if (!username) return undefined;
    const account = await this.prisma.user.findUnique({ where: { username }, include: { role: true } });
    if (!account || !account.enabled || !isSalesScopedRole(account.role.name)) {
      throw new BadRequestException('业务员归属必须选择启用状态的业务员账号');
    }
    return account.username;
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

  private async resolveWarehousePackageOwner(customerCode: string) {
    const customer = await this.prisma.customer.findFirst({ where: { code: customerCode, enabled: true }, select: { code: true, name: true, salesperson: true } });
    const salesperson = customer?.salesperson?.trim() || null;
    const user = salesperson
      ? await this.prisma.user.findUnique({ where: { username: salesperson }, select: { site: true } })
      : null;
    return {
      customerName: customer ? `${customer.code}-${customer.name}` : null,
      salesperson,
      site: user?.site?.trim() || null
    };
  }

  private async loadAgentMarkupRules(includeDisabled = false): Promise<AgentMarkupSummary[]> {
    const rows = await (this.prisma as any).agentMarkupRule.findMany({
      where: { deletedAt: null, ...(includeDisabled ? {} : { enabled: true }) },
      orderBy: [{ priority: 'asc' }, { priceBookId: 'asc' }, { agentName: 'asc' }, { channelName: 'asc' }, { realChannelName: 'asc' }]
    });
    return rows.map(mapAgentMarkupRule);
  }

  private async loadPriceBookRowsForMarkupValidation(module?: LegacyPricingModule | 'unclassified', sources?: ActivePriceBookAgentSource[]): Promise<PriceBookRowSummary[]> {
    const activeSources = sources ?? await this.loadActivePriceBookAgentSources(module);
    const priceBookIds = Array.from(new Set(activeSources.map((source) => source.priceBookId).filter(Boolean)));
    if (!priceBookIds.length) {
      return [];
    }
    const [books, rows] = await Promise.all([
      (this.prisma as any).priceBook.findMany({
        where: { id: { in: priceBookIds }, deletedAt: null },
        select: { id: true, fileName: true, agentShortName: true }
      }),
      (this.prisma as any).priceBookRow.findMany({ where: { priceBookId: { in: priceBookIds } } })
    ]);
    const activeFilesWithPriceRows = new Set(rows.map((row: any) => row.priceBookId));
    const fallbackBooks = books.filter((book: any) => !activeFilesWithPriceRows.has(book.id));
    const fallbackFiles = Array.from(new Set(fallbackBooks.map((book: any) => String(book.fileName ?? '').trim()).filter(Boolean)));
    const fallbackBookByFileName = new Map<string, { id: string; agentShortName?: string }>(
      fallbackBooks.map((book: any) => [String(book.fileName ?? '').trim(), { id: book.id, agentShortName: book.agentShortName ?? undefined }])
    );
    const legacyWhere: Record<string, unknown> = { deletedAt: null, fileName: { in: fallbackFiles } };
    if (module && module !== 'unclassified') {
      legacyWhere.module = module;
    }
    const legacySources = fallbackFiles.length && module !== 'unclassified'
      ? await (this.prisma as any).legacyPricingSource.findMany({ where: legacyWhere, include: { rows: true } })
      : [];
    const legacyFallbackRows = legacySources
      .flatMap((source: any) => source.rows.map((row: any) => {
        const legacyRow = mapLegacyPricingRow(row, source);
        const fallbackBook = fallbackBookByFileName.get(String(source.fileName ?? '').trim());
        return {
          ...legacyRowToPriceBookRow(legacyRow, legacyRow.costPerKg ?? legacyRow.cbmPrice ?? 0, legacyRow.maxWeightKg ?? legacyRow.minWeightKg ?? 1),
          priceBookId: fallbackBook?.id ?? legacyRow.sourceId ?? 'legacy',
          agentName: fallbackBook?.agentShortName ?? legacyRow.agentName
        };
      }));
    return [...rows.map(mapPriceBookRow), ...legacyFallbackRows];
  }

  private async loadActivePriceBookAgentSources(module?: LegacyPricingModule | 'unclassified'): Promise<ActivePriceBookAgentSource[]> {
    const activeBooks = await (this.prisma as any).priceBook.findMany({
      where: { deletedAt: null },
      select: { id: true, fileName: true, agentShortName: true, targetModule: true }
    });
    const scopedBooks = activeBooks.filter((book: any) => {
      const bookModule = normalizeAgentMarkupLegacyModule(book.targetModule);
      if (!module) return true;
      return module === 'unclassified' ? !bookModule : bookModule === module;
    });
    const activeBookIds = scopedBooks.map((book: any) => book.id);
    const priceRowCounts = activeBookIds.length
      ? await (this.prisma as any).priceBookRow.groupBy({
          by: ['priceBookId'],
          where: { priceBookId: { in: activeBookIds } },
          _count: { _all: true }
        })
      : [];
    const priceRowBookIdSet = new Set(priceRowCounts.map((row: any) => row.priceBookId));
    const legacyFallbackBookIds = Array.from(new Set(
      scopedBooks
        .map((book: any) => book.id)
        .filter((bookId: string) => !priceRowBookIdSet.has(bookId))
    ));
    const legacySources = legacyFallbackBookIds.length
      ? await (this.prisma as any).legacyPricingSource.findMany({
          where: { priceBookId: { in: legacyFallbackBookIds }, deletedAt: null },
          select: { id: true, priceBookId: true, fileName: true }
        })
      : [];
    const legacySourceIds = legacySources.map((source: any) => source.id);
    const legacyAgents = legacySourceIds.length
      ? await (this.prisma as any).legacyPricingRow.groupBy({
          by: ['sourceId'],
          where: { sourceId: { in: legacySourceIds } },
          _count: { _all: true }
        })
      : [];
    const bookById = new Map<string, { id: string; fileName: string; agentShortName?: string; legacyModule?: LegacyPricingModule }>(scopedBooks.map((book: any) => [book.id, { id: book.id, fileName: book.fileName, agentShortName: book.agentShortName ?? undefined, legacyModule: normalizeAgentMarkupLegacyModule(book.targetModule) }]));
    const sourceById = new Map<string, { id: string; priceBookId?: string; fileName: string }>(legacySources.map((source: any) => [source.id, { id: source.id, priceBookId: source.priceBookId ?? undefined, fileName: source.fileName }]));
    return [
      ...priceRowCounts.map((row: any) => {
        const book = bookById.get(row.priceBookId);
        return {
          agentName: book?.agentShortName ?? '',
          priceBookId: row.priceBookId,
          fileName: book?.fileName ?? '',
          lineCount: Number(row._count?._all ?? 0),
          legacyModule: book?.legacyModule
        };
      }),
      ...legacyAgents.map((row: any) => {
        const source = sourceById.get(row.sourceId);
        const book = source?.priceBookId ? bookById.get(source.priceBookId) : undefined;
        return {
          agentName: book?.agentShortName ?? '',
          priceBookId: book?.id ?? '',
          fileName: source?.fileName ?? '',
          lineCount: Number(row._count?._all ?? 0),
          legacyModule: book?.legacyModule
        };
      })
    ].filter((source) => source.agentName && source.fileName);
  }

  private async nextWarehouseConsolidationNo(packages: WarehousePackageSummary[], mode: WarehouseConsolidationCreateInput['mode']) {
    const customerOrderNos = Array.from(new Set(packages.map((pkg) => pkg.customerOrderNo.trim()).filter(Boolean)));
    const prefix = customerOrderNos.length === 1 ? customerOrderNos[0] : 'MIX';
    const actionCode = mode === 'MERGE_AND_SHIP' ? 'OUT' : 'MERGE';
    const existing = await (this.prisma as any).warehouseConsolidation.count({
      where: { consolidationNo: { startsWith: `${prefix}-${actionCode}` } }
    });
    return `${prefix}-${actionCode}${String(existing + 1).padStart(3, '0')}`;
  }

  private async nextWarehouseTallyTaskNo(customerCode: string) {
    const existing = await (this.prisma as any).warehouseTallyTask.findMany({
      where: { taskNo: { startsWith: customerCode } },
      select: { taskNo: true }
    });
    return nextWarehouseTallyTaskNo(customerCode, existing.map((task: { taskNo: string }) => task.taskNo));
  }

  private async nextWarehouseRetallyTaskNo(previousTaskNo: string) {
    const baseTaskNo = previousTaskNo.match(/^(.*LH)\d{2}$/)?.[1] ?? previousTaskNo;
    const existing = await (this.prisma as any).warehouseTallyTask.findMany({
      where: { taskNo: { startsWith: baseTaskNo } },
      select: { taskNo: true }
    });
    return nextWarehouseRetallyTaskNo(previousTaskNo, existing.map((task: { taskNo: string }) => task.taskNo));
  }

  private async nextSystemOrderNo(businessType: BusinessType, date: Date): Promise<string> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const count = await this.prisma.shipment.count({ where: { createdAt: { gte: start, lt: end } } });
    return createSystemOrderNo(businessType, date, count + 1);
  }

  private async nextLabelSequence(date: Date): Promise<number> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const count = await this.prisma.shipmentLabel.count({ where: { createdAt: { gte: start, lt: end } } });
    return count + 1;
  }

  private async ensureCarrierTask(shipmentId: string, carrier: string, transferNo: string) {
    const existing = await this.prisma.carrierTask.findFirst({
      where: { shipmentId, type: 'TRACKING_SYNC' }
    });
    if (existing) {
      return existing;
    }
    return this.prisma.carrierTask.create({
      data: {
        shipmentId,
        type: 'TRACKING_SYNC',
        carrier: toCarrierAdapterCode(carrier),
        transferNo,
        status: 'PENDING',
        attempts: 0
      }
    });
  }

  private async executeCarrierTask(taskId: string, fail: boolean, principal: Principal, action: 'run' | 'retry'): Promise<CarrierTaskRunResponse> {
    const task = await this.prisma.carrierTask.findUnique({
      where: { id: taskId },
      include: { shipment: { include: shipmentIncludes } }
    });
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    if (task.status === 'SUCCESS') {
      throw new BadRequestException('已成功任务不能重复执行');
    }

    if (fail) {
      const failed = await this.prisma.carrierTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', attempts: { increment: 1 }, lastError: '模拟承运商接口失败' },
        include: { shipment: { include: { customer: true } } }
      });
      const mappedShipment = mapShipment(task.shipment);
      void this.lineage?.recordEvent('tracking.tasks.run', {
        actorUsername: principal.username,
        businessId: task.id,
        payload: {
          action,
          taskId: task.id,
          shipmentId: mappedShipment.id,
          systemOrderNo: mappedShipment.systemOrderNo,
          carrier: task.carrier,
          transferNo: task.transferNo,
          statusTo: failed.status,
          attempts: failed.attempts,
          lastError: failed.lastError,
          operatedAt: new Date().toISOString()
        },
        sourceRefs: [{ nodeType: 'shipment', id: mappedShipment.id }, { nodeType: 'carrier_tracking_task', id: task.id }],
        metrics: { attempts: failed.attempts, failed: 1, success: 0 }
      });
      return { task: mapCarrierTask(failed), shipment: mapShipment(task.shipment) };
    }

    const now = new Date();
    const trackingStatus = createMockTrackingStatus(toCarrierAdapterCode(task.carrier), task.transferNo);
    const [updatedTask, updatedShipment] = await this.prisma.$transaction([
      this.prisma.carrierTask.update({
        where: { id: task.id },
        data: { status: 'SUCCESS', attempts: { increment: 1 }, lastError: null, completedAt: now },
        include: { shipment: { include: { customer: true } } }
      }),
      this.prisma.shipment.update({
        where: { id: task.shipmentId },
        data: {
          latestTracking: trackingStatus,
          trackingStaleDays: 0,
          trackingEvents: {
            create: {
              status: trackingStatus,
              happenedAt: now,
              visibleToCustomer: true,
              carrier: task.carrier,
              transferNo: task.transferNo,
              rawContent: trackingStatus,
              source: 'CARRIER_API',
              kind: 'LOGISTICS'
            }
          }
        },
        include: shipmentIncludes
      })
    ]);
    const mappedShipment = mapShipment(updatedShipment);
    const mappedTask = mapCarrierTask(updatedTask);
    void this.lineage?.recordEvent('tracking.tasks.run', {
      actorUsername: principal.username,
      businessId: updatedTask.id,
      payload: {
        action,
        taskId: updatedTask.id,
        shipmentId: mappedShipment.id,
        systemOrderNo: mappedShipment.systemOrderNo,
        carrier: updatedTask.carrier,
        transferNo: updatedTask.transferNo,
        statusTo: updatedTask.status,
        attempts: updatedTask.attempts,
        completedAt: updatedTask.completedAt?.toISOString?.() ?? mappedTask.completedAt,
        trackingStatus
      },
      sourceRefs: [{ nodeType: 'shipment', id: mappedShipment.id }, { nodeType: 'carrier_tracking_task', id: updatedTask.id }],
      metrics: { attempts: updatedTask.attempts, failed: 0, success: 1 }
    });
    void this.lineage?.recordEvent('tracking.latest.add_event', {
      actorUsername: principal.username,
      businessId: `${mappedShipment.id}:${now.toISOString()}`,
      payload: {
        source: 'carrier_task',
        taskId: updatedTask.id,
        shipmentId: mappedShipment.id,
        systemOrderNo: mappedShipment.systemOrderNo,
        carrier: updatedTask.carrier,
        transferNo: updatedTask.transferNo,
        status: trackingStatus,
        happenedAt: now.toISOString(),
        trackingStaleDays: mappedShipment.trackingStaleDays
      },
      sourceRefs: [{ nodeType: 'shipment', id: mappedShipment.id }, { nodeType: 'carrier_tracking_task', id: updatedTask.id }],
      metrics: { trackingStaleDays: mappedShipment.trackingStaleDays }
    });

    return { task: mappedTask, shipment: mappedShipment };
  }

  private async getVisibleShipment(principal: Principal, shipmentId: string) {
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope
          ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
          : {})
      },
      include: shipmentIncludes
    });

    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }

    return shipment;
  }

  private async getReviewVisibleShipment(principal: Principal, shipmentId: string, includeDeleted: boolean) {
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const scopedOwnerWhere = operatorCustomerScope
      ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
      : {};
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      } as any,
      include: shipmentIncludes
    });
    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }
    return shipment;
  }

  private async isShipmentSubmittedBySalesScopedUser(shipment: { entryBy?: string | null }) {
    if (!shipment.entryBy) return false;
    const user = await (this.prisma as any).user.findUnique({ where: { username: shipment.entryBy }, select: { roleId: true } });
    return Boolean(user?.roleId && isSalesScopedRole(user.roleId));
  }

  private async cleanupOverdueReviewShipments(principal: Principal) {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const scopedOwnerWhere = operatorCustomerScope
      ? { OR: [{ entryBy: { in: operatorCustomerScope } }, { customer: { salesperson: { in: operatorCustomerScope } } }] }
      : {};
    const rows = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        status: { in: ['DRAFT', 'REVIEW_PENDING'] as ShipmentStatus[] },
        createdAt: { lt: cutoff },
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      } as any,
      include: shipmentIncludes
    });

    for (const row of rows) {
      const updated = await this.prisma.shipment.update({
        where: { id: row.id },
        data: {
          deletedAt: new Date(),
          deletedBy: 'system',
          deletedReason: '超过 3 天未审核自动删除',
          deleteType: 'SYSTEM_TIMEOUT'
        },
        include: shipmentIncludes
      });
      await this.createEvent(row.id, row.status as ShipmentStatus, row.status as ShipmentStatus, '超过 3 天未审核自动删除');
      await this.prisma.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'shipment.review.timeout_delete',
          target: row.id,
          before: toAuditJson(mapShipment(row)),
          after: toAuditJson(mapShipment(updated))
        }
      });
    }
  }

  private isReviewPendingStatus(status: ShipmentStatus): boolean {
    return status === 'DRAFT' || status === 'REVIEW_PENDING';
  }

  private async buildShipmentReviewDetail(principal: Principal, shipment: any): Promise<ShipmentReviewDetailSummary> {
    const mappedShipment = mapShipment(shipment);
    const packageIds = Array.from(new Set([...(shipment.draftWarehousePackageIds ?? [])].filter(Boolean)));
    const warehousePackages = await this.prisma.warehousePackage.findMany({
      where: {
        OR: [
          { shipmentId: shipment.id },
          ...(packageIds.length ? [{ id: { in: packageIds } }] : [])
        ]
      },
      orderBy: [{ scanTime: 'asc' }, { createdAt: 'asc' }]
    });
    const packageRows = warehousePackages.map(mapShipmentReviewWarehousePackage);
    const packageFallback = packageRows.length > 0
      ? packageRows
      : [{
          id: `${shipment.id}-package`,
          customerOrderNo: shipment.customerOrderNo,
          packageCount: shipment.packageCount,
          weightKg: Number(shipment.receivableWeightKg),
          lengthCm: 0,
          widthCm: 0,
          heightCm: 0,
          cbm: Number(shipment.volumeCbm ?? 0),
          volumetricWeightKg: Number(shipment.agentWeightKg),
          chargeableWeightKg: Number(shipment.receivableWeightKg),
          exceptions: []
        } satisfies ShipmentReviewPackageSummary];
    const canViewFinanceDetail = ['ADMIN', 'FINANCE', 'UG_FINANCE', 'OPERATOR', 'UG_BUSINESS', 'UG_MARKET', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role);
    const finance = canViewFinanceDetail
      ? await this.getShipmentFinanceDetail(principal, shipment.id, { includeDeleted: Boolean(shipment.deletedAt) })
      : {
          shipmentId: shipment.id,
          systemOrderNo: shipment.systemOrderNo,
          receivables: [],
          businessCosts: [],
          receivableTotal: 0
        } satisfies ShipmentFinanceDetailSummary;
    const statusEvents = await this.prisma.shipmentEvent.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { createdAt: 'asc' }
    });
    const trackingEvents = await this.prisma.trackingEvent.findMany({
      where: { shipmentId: shipment.id, kind: 'LOGISTICS' },
      orderBy: { happenedAt: 'asc' }
    });
    const relatedAuditLogs = await this.prisma.auditLog.findMany({
      where: { target: { in: [shipment.id, `shipment:${shipment.id}`] } },
      select: { actorId: true, createdAt: true }
    });
    const actorIds = [...new Set(relatedAuditLogs.map((row) => row.actorId))];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true } })
      : [];
    const usernamesByActorId = new Map(actors.map((row) => [row.id, row.username]));
    const tickets = await this.prisma.problemTicket.findMany({
      where: { shipmentId: shipment.id },
      include: { shipment: { include: { customer: true } }, replies: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    });
    const events: ShipmentReviewEventSummary[] = statusEvents.map((event) => ({
      id: event.id,
      type: 'STATUS',
      title: '状态流转',
      note: event.note ?? undefined,
      fromStatus: event.fromStatus ?? undefined,
      toStatus: event.toStatus,
      createdAt: event.createdAt.toISOString()
    }));
    const internalTrackingEvents: ShipmentReviewEventSummary[] = statusEvents
      .filter((event) => canViewFinanceDetail || !isSensitiveInternalTrackingNote(event.note))
      .map((event) => ({
        id: event.id,
        type: 'STATUS',
        title: internalTrackingAction(event.note),
        note: event.note ?? undefined,
        stage: shipmentStatusLabels[event.toStatus as ShipmentStatus],
        sourceModule: internalTrackingSourceModule(event.note),
        action: internalTrackingAction(event.note),
        fromStatus: event.fromStatus ?? undefined,
        toStatus: event.toStatus as ShipmentStatus,
        createdAt: event.createdAt.toISOString(),
        operator: internalTrackingOperator(event.createdAt, relatedAuditLogs, usernamesByActorId)
      }));
    const logisticsTrackingEvents: ShipmentLogisticsTrackingEventSummary[] = trackingEvents.map((event) => ({
      id: event.id,
      trackingAt: event.happenedAt.toISOString(),
      node: event.status,
      location: event.location ?? undefined,
      carrier: event.carrier ?? shipment.channel?.carrier.name ?? undefined,
      transferNo: event.transferNo ?? shipment.transferNo ?? undefined,
      rawContent: event.rawContent ?? event.status,
      source: logisticsTrackingSourceLabel(event.source)
    }));
    return {
      shipment: this.redactOrderEntrySensitiveShipment(principal, mappedShipment),
      packages: packageFallback,
      finance,
      events,
      internalTrackingEvents,
      logisticsTrackingEvents,
      problemTickets: tickets.map(mapProblemTicketSummary),
      files: [],
      approvalWarnings: this.getShipmentReviewApprovalWarnings(mappedShipment, packageFallback, finance),
      overdue: this.isShipmentReviewOverdue(mappedShipment)
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
    if (packages.length === 0) warnings.push('单件明细缺失');
    if (!finance.receivables.length || finance.receivableTotal <= 0) warnings.push('应收费用缺失');
    if (!finance.businessCosts?.length || (finance.businessCostTotal ?? 0) <= 0) warnings.push('业务成本缺失');
    return warnings;
  }

  private isShipmentReviewOverdue(shipment: Shipment): boolean {
    const createdAt = new Date(shipment.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt > 3 * 24 * 60 * 60 * 1000;
  }

  private async getVisibleProblemTicket(principal: Principal, ticketId: string) {
    const ticket = await this.prisma.problemTicket.findFirst({
      where: {
        id: ticketId,
        ...(principal.role === 'CUSTOMER' ? { customerVisible: true, shipment: { customerId: principal.customerId } } : {})
      },
      include: { shipment: true }
    });
    if (!ticket) {
      throw new NotFoundException('问题件不存在');
    }
    return ticket;
  }

  private async shipmentStatusEnteredAt(shipment: any, status: ShipmentStatus) {
    const row = await this.prisma.auditLog.findFirst({
      where: {
        target: shipment.id,
        action: { in: ['customer_service.status.update', 'shipment.operational.update', 'shipment.dispatch', 'shipment.review.approve'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    const after = row?.after as { status?: string; statusTo?: string; statusAt?: string } | null | undefined;
    if (after?.status === status || after?.statusTo === status) {
      return after.statusAt ?? row?.createdAt.toISOString();
    }
    return shipment.outboundAt?.toISOString?.() ?? shipment.reviewedAt?.toISOString?.() ?? shipment.createdAt?.toISOString?.();
  }

  private async updateShipmentStatus(
    shipmentId: string,
    fromStatus: ShipmentStatus,
    toStatus: ShipmentStatus,
    note: string
  ): Promise<Shipment> {
    await this.createEvent(shipmentId, fromStatus, toStatus, note);
    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: toStatus },
      include: shipmentIncludes
    });
    return mapShipment(updated);
  }

  private async createEvent(shipmentId: string, fromStatus: ShipmentStatus | null, toStatus: ShipmentStatus, note: string) {
    await this.prisma.shipmentEvent.create({
      data: { shipmentId, fromStatus, toStatus, note }
    });
  }

  private parseTrackingDate(value: string | number): Date {
    if (typeof value === 'number') {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
      return Number.isNaN(date.getTime()) ? new Date() : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private parseRequiredTrackingDate(value: string | number): Date {
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
}

function isSensitiveInternalTrackingNote(note?: string | null): boolean {
  return /应付|付款|收款|利润|成本|金额|财务/.test(note ?? '');
}

function internalTrackingSourceModule(note?: string | null): string {
  const value = note ?? '';
  if (/入库|理货|出库|面单/.test(value)) return '仓库管理';
  if (/排货|代理退回/.test(value)) return '待排货';
  if (/收款|应付|成本|财务/.test(value)) return '财务管理';
  if (/审核|录单|草稿|预报|删除|恢复/.test(value)) return '业务录单';
  return '订单生命周期';
}

function internalTrackingAction(note?: string | null): string {
  const value = note?.trim() ?? '';
  if (/提交审核/.test(value)) return '提交审核';
  if (/自审通过/.test(value)) return '自审通过';
  if (/审核驳回/.test(value)) return '审核退回';
  if (/排货/.test(value)) return '排货';
  if (/出库/.test(value)) return '出库';
  if (/入库/.test(value)) return '仓库入库';
  if (/删除/.test(value)) return '删除';
  if (/恢复/.test(value)) return '恢复';
  if (/面单/.test(value)) return '面单处理';
  return '状态更新';
}

function logisticsTrackingSourceLabel(source?: string | null): string {
  return ({
    CARRIER_API: '承运商接口',
    THIRD_PARTY: '第三方轨迹平台',
    MANUAL_IMPORT: '人工导入',
    MANUAL_ENTRY: '人工录入'
  } as Record<string, string>)[source ?? ''] ?? '外部物流数据';
}

function internalTrackingOperator(
  eventAt: Date,
  auditLogs: Array<{ actorId: string; createdAt: Date }>,
  usernamesByActorId: Map<string, string>
): string | undefined {
  const nearest = auditLogs
    .map((log) => ({ ...log, distance: Math.abs(log.createdAt.getTime() - eventAt.getTime()) }))
    .sort((left, right) => left.distance - right.distance)[0];
  return nearest && nearest.distance <= 60_000 ? usernamesByActorId.get(nearest.actorId) : undefined;
}

const shipmentIncludes = {
  customer: true,
  channel: { include: { carrier: true } },
  agent: true,
  financeItems: { where: { voided: false }, orderBy: { createdAt: 'desc' } },
  trackingEvents: { where: { kind: 'LOGISTICS' }, orderBy: { happenedAt: 'desc' }, take: 1 },
  problemTickets: true
} as const;

function formatRoutePayableRemark(agentChannelName: string, otherFee: number, otherFeeRemark?: string) {
  return `市场排货渠道：${agentChannelName}${otherFee > 0 ? `；其他费用：${otherFee}${otherFeeRemark ? `；其他费用备注：${otherFeeRemark}` : ''}` : ''}`;
}

function parseRoutePayableRemark(remark?: string | null): { agentChannelName?: string; otherFee?: number } {
  if (!remark?.startsWith('市场排货渠道：')) {
    return {};
  }
  const body = remark.replace('市场排货渠道：', '');
  const parts = body.split('；');
  const otherFeePart = parts.find((part) => part.startsWith('其他费用：'));
  const otherFee = otherFeePart ? Number(otherFeePart.replace('其他费用：', '')) : undefined;
  return {
    agentChannelName: parts[0] || undefined,
    otherFee: Number.isFinite(otherFee) ? otherFee : undefined
  };
}

type ShipmentDispatchArchiveFields = {
  handoverNo?: string;
  outboundBy?: string;
  batchDispatchSource?: string;
  outboundAt?: string;
};

function normalizeShipmentDispatchArchive(value: unknown): ShipmentDispatchArchiveFields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const row = value as Record<string, unknown>;
  return {
    handoverNo: typeof row.handoverNo === 'string' ? row.handoverNo : undefined,
    outboundBy: typeof row.outboundBy === 'string' ? row.outboundBy : undefined,
    batchDispatchSource: typeof row.batchDispatchSource === 'string' ? row.batchDispatchSource : undefined,
    outboundAt: typeof row.outboundAt === 'string' ? row.outboundAt : undefined
  };
}

function applyShipmentDispatchArchiveFields(shipment: Shipment, archive?: ShipmentDispatchArchiveFields): Shipment {
  if (!archive) {
    return shipment;
  }
  return {
    ...shipment,
    handoverNo: archive.handoverNo ?? shipment.handoverNo,
    outboundBy: archive.outboundBy ?? shipment.outboundBy,
    batchDispatchSource: archive.batchDispatchSource ?? shipment.batchDispatchSource,
    outboundAt: shipment.outboundAt ?? archive.outboundAt
  };
}

function mapShipment(row: ShipmentWithRelations): Shipment {
  const routePayable = row.financeItems?.find((item) => item.type === 'PAYABLE' && item.name === '代理成本' && !item.voided);
  const routeRemark = parseRoutePayableRemark(routePayable?.remark);
  const latestExternalTracking = (row as any).trackingEvents?.[0];
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    entryAt: (row as any).entryAt?.toISOString?.() ?? (row as any).entryAt ?? undefined,
    customerName: `${row.customer.code}-${row.customer.name}`,
    customerId: row.customer.id,
    customerCode: row.customer.code,
    salesperson: row.customer.salesperson ?? (row as any).entryBy ?? undefined,
    customerOrderNo: row.customerOrderNo,
    outboundOrderNo: row.systemOrderNo,
    systemOrderNo: row.systemOrderNo,
    transferNo: row.transferNo ?? undefined,
    subOrderNo: (row as any).subOrderNo ?? undefined,
    draftWarehousePackageIds: row.draftWarehousePackageIds ?? [],
    inboundNo: (row as any).inboundNo ?? undefined,
    outboundAt: (row as any).outboundAt?.toISOString?.() ?? (row as any).outboundAt ?? undefined,
    productName: (row as any).productName ?? undefined,
    declarationRequired: (row as any).declarationRequired ?? false,
    sensitive: (row as any).sensitive ?? false,
    cargoType: (row as any).cargoType ?? undefined,
    volumeCbm: (row as any).volumeCbm === null || (row as any).volumeCbm === undefined ? undefined : Number((row as any).volumeCbm),
    actualWeightKg: (row as any).actualWeightKg === null || (row as any).actualWeightKg === undefined ? undefined : Number((row as any).actualWeightKg),
    weightKg: (row as any).actualWeightKg === null || (row as any).actualWeightKg === undefined ? undefined : Number((row as any).actualWeightKg),
    cargoDataSource: (row as any).cargoDataSource === 'MANUAL_ADJUSTED' ? 'MANUAL_ADJUSTED' : 'AUTO_MATCHED',
    chargeWeightOverridden: Boolean((row as any).chargeWeightOverridden),
    settlementMethod: (row as any).settlementMethod ?? undefined,
    tradeTerms: (row as any).tradeTerms ?? undefined,
    fbaInboundNo: (row as any).fbaInboundNo ?? undefined,
    receiverName: (row as any).receiverName ?? undefined,
    receiverCompany: (row as any).receiverCompany ?? undefined,
    receiverPhone: (row as any).receiverPhone ?? undefined,
    receiverAddress: (row as any).receiverAddress ?? undefined,
    receiverCountry: (row as any).receiverCountry ?? undefined,
    receiverState: (row as any).receiverState ?? undefined,
    receiverPostalCode: (row as any).receiverPostalCode ?? undefined,
    fbaWarehouseCode: (row as any).fbaWarehouseCode ?? undefined,
    entryBy: (row as any).entryBy ?? undefined,
    businessReviewedBy: (row as any).businessReviewedBy ?? undefined,
    businessReviewedAt: (row as any).businessReviewedAt?.toISOString?.() ?? (row as any).businessReviewedAt ?? undefined,
    reviewedBy: (row as any).reviewedBy ?? undefined,
    reviewedAt: (row as any).reviewedAt?.toISOString?.() ?? (row as any).reviewedAt ?? undefined,
    reviewRejectedReason: (row as any).reviewRejectedReason ?? undefined,
    deletedAt: (row as any).deletedAt?.toISOString?.() ?? (row as any).deletedAt ?? undefined,
    deletedBy: (row as any).deletedBy ?? undefined,
    deletedReason: (row as any).deletedReason ?? undefined,
    deleteType: (row as any).deleteType ?? undefined,
    restoredAt: (row as any).restoredAt?.toISOString?.() ?? (row as any).restoredAt ?? undefined,
    restoredBy: (row as any).restoredBy ?? undefined,
    restoreMode: (row as any).restoreMode ?? undefined,
    etaAt: row.etaAt?.toISOString(),
    etdAt: row.etdAt?.toISOString(),
    remark: (row as any).remark ?? undefined,
    businessType: row.businessType as BusinessType,
    packageType: row.packageType as 'DOC' | 'WPX' | 'PAK',
    destinationCountry: row.destinationCountry,
    carrier: row.channel?.carrier.name ?? '',
    packageCount: row.packageCount,
    receivableWeightKg: Number(row.receivableWeightKg),
    agentWeightKg: Number(row.agentWeightKg),
    chargeableWeightKg: Number(row.receivableWeightKg),
    latestTracking: (row as any).trackingEvents ? (latestExternalTracking?.status ?? '') : (row.latestTracking ?? ''),
    latestTrackingUpdatedAt: latestExternalTracking?.happenedAt?.toISOString?.() ?? latestExternalTracking?.happenedAt ?? undefined,
    trackingStaleDays: row.trackingStaleDays,
    isRemoteArea: row.isRemoteArea,
    status: row.status as ShipmentStatus,
    channelId: row.channelId ?? undefined,
    channelName: row.channel?.name ?? '',
    agentId: row.agentId ?? undefined,
    agentName: row.agent?.name ?? '',
    routedAt: routePayable?.createdAt instanceof Date ? routePayable.createdAt.toISOString() : routePayable?.createdAt,
    routeAgentChannelName: routeRemark.agentChannelName,
    routeChargeWeightKg: routePayable?.chargeWeightKg === null || routePayable?.chargeWeightKg === undefined ? undefined : Number(routePayable.chargeWeightKg),
    routeUnitPrice: routePayable?.unitPrice === null || routePayable?.unitPrice === undefined ? undefined : Number(routePayable.unitPrice),
    routeOtherFee: routeRemark.otherFee,
    routeCostTotal: routePayable?.amount === null || routePayable?.amount === undefined ? undefined : Number(routePayable.amount),
    routeCurrency: routePayable?.currency ?? undefined,
    shippingMarkRequired: (row as any).shippingMarkRequired === true,
    businessInvoiceName: (row as any).businessInvoiceName ?? undefined,
    businessInvoiceUrl: (row as any).businessInvoiceUrl ?? undefined,
    businessInvoiceUploadedBy: (row as any).businessInvoiceUploadedBy ?? undefined,
    businessInvoiceUploadedAt: (row as any).businessInvoiceUploadedAt?.toISOString?.() ?? (row as any).businessInvoiceUploadedAt ?? undefined,
    paymentAmountUsd: row.paymentAmountUsd === null ? undefined : Number(row.paymentAmountUsd),
    paymentAmountCny: row.paymentAmountCny === null ? undefined : Number(row.paymentAmountCny),
    paymentMethod: row.paymentMethod === null ? undefined : row.paymentMethod as ShipmentPaymentMethod,
    hasProblemTicket: row.problemTickets.some((ticket) => ticket.status !== 'CLOSED')
  };
}

function mapShipmentLabel(row: {
  id: string;
  shipmentId: string;
  carrier: string;
  channelName: string;
  labelNo: string;
  transferNo: string;
  labelUrl: string;
  status: string;
  createdAt: Date;
  voidedAt: Date | null;
}): ShipmentLabelSummary {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    carrier: toCarrierAdapterCode(row.carrier),
    channelName: row.channelName,
    labelNo: row.labelNo,
    transferNo: row.transferNo,
    labelUrl: row.labelUrl,
    status: row.status as ShipmentLabelSummary['status'],
    createdAt: row.createdAt.toISOString(),
    voidedAt: row.voidedAt?.toISOString()
  };
}

function mapPricingRule(row: any): PricingRuleSummary {
  return {
    id: row.id,
    channelId: row.channelId,
    channelName: row.channel?.name ?? row.channelName ?? row.channelId,
    destinationCountry: row.destinationCountry,
    minWeightKg: Number(row.minWeightKg),
    maxWeightKg: Number(row.maxWeightKg),
    ratePerKg: Number(row.ratePerKg),
    currency: row.currency,
    enabled: row.enabled
  };
}

function mapPriceBook(row: any, legacyModuleCounts?: Partial<Record<LegacyPricingModule, number>>, importedRowCount = 0): PriceBookSummary {
  const priceRowCount = Array.isArray(row.rows) ? row.rows.length : Number(row._count?.rows ?? row.rowCount ?? 0);
  const legacyRowCount = legacyModuleCounts
    ? Object.values(legacyModuleCounts).reduce((sum, value) => sum + Number(value ?? 0), 0)
    : 0;
  return {
    id: row.id,
    fileName: row.fileName,
    agentId: row.agentId ?? undefined,
    agentShortName: row.agentShortName ?? undefined,
    rowCount: Math.max(priceRowCount, Number(importedRowCount ?? 0), legacyRowCount),
    importedAt: row.importedAt.toISOString(),
    customRemark: row.remark ?? undefined,
    remark: row.remark ?? undefined,
    ...(row.targetModule ? { targetModule: row.targetModule } : {}),
    ...(row.parserRuleVersion !== undefined && row.parserRuleVersion !== null ? { parserRuleVersion: Number(row.parserRuleVersion) } : {}),
    ...(row.refreshStatus ? { refreshStatus: row.refreshStatus } : {}),
    ...(row.lastRuleRefreshAt ? { lastRuleRefreshAt: row.lastRuleRefreshAt.toISOString?.() ?? new Date(row.lastRuleRefreshAt).toISOString() } : {}),
    ...(legacyModuleCounts && Object.keys(legacyModuleCounts).length ? { legacyModuleCounts } : {})
  };
}

function mapDubaiPriceDisplayVersion(version: any) {
  return {
    id: version.id,
    priceBookId: version.priceBookId ?? undefined,
    originalName: version.originalName,
    status: version.status,
    isActive: Boolean(version.isActive),
    isActiveAir: Boolean(version.isActiveAir),
    isActiveSea: Boolean(version.isActiveSea),
    salesSafe: Boolean(version.salesSafe),
    message: version.message ?? undefined,
    unassignedSheets: Array.isArray(version.unassignedSheets) ? version.unassignedSheets.map(String) : undefined,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
    pages: (version.pages ?? []).map((page: any) => ({
      id: page.id,
      mode: page.mode,
      sheetName: page.sheetName,
      pageNo: Number(page.pageNo)
    }))
  };
}

function mapPriceBookRow(row: any): PriceBookRowSummary {
  return {
    id: row.id,
    priceBookId: row.priceBookId,
    agentName: row.agentName,
    carrierName: row.carrierName ?? undefined,
    sourceSheetName: row.sourceSheetName ?? undefined,
    channelName: row.channelName,
    businessRouteName: row.businessRouteName ?? undefined,
    realChannelName: row.realChannelName ?? undefined,
    warehouseCode: row.warehouseCode ?? undefined,
    destinationCountry: row.destinationCountry,
    postalRule: row.postalRule ?? undefined,
    minWeightKg: Number(row.minWeightKg),
    maxWeightKg: Number(row.maxWeightKg),
    costPerKg: Number(row.costPerKg),
    cbmPrice: row.cbmPrice === null || row.cbmPrice === undefined ? undefined : Number(row.cbmPrice),
    priceTierLabel: row.priceTierLabel ?? undefined,
    densityDiscountRules: Array.isArray(row.densityDiscountRules) ? row.densityDiscountRules : undefined,
    currency: row.currency,
    transitDays: row.transitDays ?? undefined,
    transitLabel: sanitizePricingTransitLabel(row.transitLabel) ?? undefined,
    quoteSourceType: row.quoteSourceType ?? 'local',
    surchargeFee: row.surchargeFee === null || row.surchargeFee === undefined ? undefined : Number(row.surchargeFee),
    surchargeDetails: Array.isArray(row.surchargeDetails) ? row.surchargeDetails : [],
    productSurchargeRemark: row.productSurchargeRemark ?? undefined,
    specialRemark: row.specialRemark ?? undefined
  };
}

function mapAgentMarkupRule(row: any): AgentMarkupSummary {
  return {
    id: row.id,
    priceBookId: row.priceBookId ?? undefined,
    legacyModule: normalizeAgentMarkupLegacyModule(row.legacyModule),
    agentName: row.agentName,
    channelName: row.channelName ?? undefined,
    realChannelName: row.realChannelName ?? undefined,
    destinationCountry: row.destinationCountry ?? undefined,
    markupPerKg: Number(row.markupPerKg),
    markupType: row.markupType ?? 'WEIGHT',
    markupValue: row.markupValue === null || row.markupValue === undefined ? Number(row.markupPerKg) : Number(row.markupValue),
    markupUnit: row.markupUnit ?? undefined,
    minChargeableValue: row.minChargeableValue === null || row.minChargeableValue === undefined ? undefined : Number(row.minChargeableValue),
    maxChargeableValue: row.maxChargeableValue === null || row.maxChargeableValue === undefined ? undefined : Number(row.maxChargeableValue),
    priority: row.priority ?? 100,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? undefined,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt ?? undefined,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
    enabled: row.enabled
  };
}

function mapAgentChannelCustomRemark(row: any): AgentChannelCustomRemarkSummary {
  return {
    id: row.id,
    legacyModule: row.legacyModule as LegacyPricingModule,
    agentName: row.agentName,
    channelName: row.channelName,
    realChannelName: row.realChannelName ?? undefined,
    content: row.content,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString()
  };
}

function isAgentLevelMarkupRuleForHealth(rule: AgentMarkupSummary) {
  return !rule.deletedAt && isAgentLevelMarkupRuleScope(rule);
}

function isAgentLevelMarkupRuleScope(rule: AgentMarkupSummary) {
  return !rule.channelName && !rule.realChannelName && !rule.destinationCountry;
}

function createDefaultAgentMarkupRule(agentName: string, priceBookId?: string, legacyModule?: LegacyPricingModule): AgentMarkupSummary {
  return {
    id: priceBookId ? `price-agent:${legacyModule ?? 'unclassified'}:${priceBookId}:${agentName}` : `price-agent:${legacyModule ?? 'unclassified'}:${agentName}`,
    priceBookId,
    legacyModule,
    agentName,
    markupPerKg: 0.5,
    markupType: 'WEIGHT',
    markupValue: 0.5,
    priority: 100,
    enabled: true
  };
}

function mapPriceBookImportJob(row: any, book?: PriceBookSummary): PriceBookImportJobSummary {
  const rawErrorSummary = Array.isArray(row.errorSummary) ? row.errorSummary : [];
  return {
    id: row.id,
    fileName: row.fileName,
    agentId: row.agentId ?? undefined,
    agentShortName: row.agentShortName ?? undefined,
    status: row.status as PriceBookImportJobSummary['status'],
    processedRows: Number(row.processedRows ?? 0),
    totalRows: Number(row.totalRows ?? 0),
    failedRows: Number(row.failedRows ?? 0),
    message: row.message ?? undefined,
    errorSummary: rawErrorSummary
      .map((item: any) => ({ index: Number(item?.index ?? 0), reason: String(item?.reason ?? '') }))
      .filter((item: { index: number; reason: string }) => item.index > 0 && item.reason),
    book,
    createdAt: row.createdAt?.toISOString?.() ?? new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt?.toISOString?.() ?? new Date(row.updatedAt).toISOString(),
    completedAt: row.completedAt ? row.completedAt?.toISOString?.() ?? new Date(row.completedAt).toISOString() : undefined
  };
}

function mapCarrierTask(row: {
  id: string;
  shipmentId: string;
  type: string;
  carrier: string;
  transferNo: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  shipment: { systemOrderNo: string; customer: { code: string; name: string } };
}): CarrierTaskSummary {
  return {
      id: row.id,
      shipmentId: row.shipmentId,
	      systemOrderNo: row.shipment.systemOrderNo,
    customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
    type: row.type as CarrierTaskSummary['type'],
    carrier: toCarrierAdapterCode(row.carrier),
    transferNo: row.transferNo,
    status: row.status as CarrierTaskSummary['status'],
    attempts: row.attempts,
    lastError: row.lastError ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString()
  };
}

function normalizeAgentMarkupInput(input: AgentMarkupCreateInput | AgentMarkupUpdateInput | AgentMarkupSummary): AgentMarkupSummary {
  const markupType = input.markupType ?? 'WEIGHT';
  const rawValue = input.markupValue ?? input.markupPerKg ?? 0;
  const markupValue = roundMoney(Number(rawValue));
  return {
    id: 'id' in input ? input.id : '',
    priceBookId: input.priceBookId?.trim() || undefined,
    legacyModule: normalizeAgentMarkupLegacyModule(input.legacyModule),
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
    const matchingChannels = priceRows.filter((row) => row.channelName === rule.channelName && row.priceBookId === rule.priceBookId
      && (!rule.realChannelName || (row.realChannelName?.trim() || row.channelName) === rule.realChannelName)
      && row.destinationCountry === rule.destinationCountry);
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
    (item.priceBookId ?? '') === (rule.priceBookId ?? '') &&
    (item.legacyModule ?? '') === (rule.legacyModule ?? '') &&
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

interface ActivePriceBookAgentSource {
  agentName: string;
  priceBookId: string;
  fileName: string;
  lineCount: number;
  legacyModule?: LegacyPricingModule;
}

function findAgentMarkupRulesByScope(rules: AgentMarkupSummary[], rule: AgentMarkupSummary) {
  return rules.filter((item) =>
    !item.deletedAt &&
    (item.priceBookId ?? '') === (rule.priceBookId ?? '') &&
    (item.legacyModule ?? '') === (rule.legacyModule ?? '') &&
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
    if (!source.agentName || deletedAgentLevelRules.has(agentMarkupScopeKey({ agentName: source.agentName, legacyModule: source.legacyModule })) || deletedAgentLevelRules.has(agentMarkupScopeKey({ agentName: source.agentName })) || scopedRules.has(key)) {
      continue;
    }
    const fallback = agentLevelFallbackRules.get(agentMarkupScopeKey({ agentName: source.agentName, legacyModule: source.legacyModule }));
    next.push({
      id: `price-agent:${source.priceBookId}:${source.agentName}`,
      priceBookId: source.priceBookId,
      legacyModule: source.legacyModule,
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

const OLD_ORIGINAL_AGENT_NAMES = ['亿阳国际', '深圳振韵国际'] as const;

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

function normalizeAgentMarkupLegacyModule(value: unknown): LegacyPricingModule | undefined {
  return isLegacyPricingModule(value)
    ? value
    : undefined;
}

function normalizeAgentMarkupModuleQuery(value: unknown): LegacyPricingModule | 'unclassified' | undefined {
  if (value === 'unclassified') return 'unclassified';
  return normalizeAgentMarkupLegacyModule(value);
}

interface AgentMarkupBatchScopeInput {
  agentName?: string;
  priceBookId?: string;
  legacyModule?: LegacyPricingModule;
}

function buildAgentMarkupBatchWhere(input: { ids?: string[]; agentNames?: string[]; scopes?: AgentMarkupBatchScopeInput[] }) {
  const ids = normalizeStringList(input.ids);
  const agentNames = normalizeStringList(input.agentNames);
  const scopes = normalizeAgentMarkupBatchScopes(input);
  const OR = [
    ...(ids.length ? [{ id: { in: ids } }] : []),
    ...(agentNames.length ? [{ agentName: { in: agentNames } }] : []),
    ...scopes.map((scope) => ({ agentName: scope.agentName, priceBookId: scope.priceBookId ?? null, legacyModule: scope.legacyModule ?? null }))
  ];
  if (!OR.length) {
    throw new BadRequestException('请选择要操作的加价规则');
  }
  return { deletedAt: null, OR };
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

function filterPriceBookRowsByAgentMarkupModule(priceRows: PriceBookRowSummary[], module: LegacyPricingModule | 'unclassified' | undefined, sources: ActivePriceBookAgentSource[]) {
  if (!module) {
    return priceRows;
  }
  if (module === 'unclassified') {
    return [];
  }
  const priceBookIds = new Set(sources.filter((source) => source.legacyModule === module).map((source) => source.priceBookId).filter(Boolean));
  return priceRows.filter((row) => row.priceBookId && priceBookIds.has(row.priceBookId));
}

function filterAgentMarkupSourcesByModule(sources: ActivePriceBookAgentSource[], module: LegacyPricingModule | 'unclassified' | undefined) {
  if (!module) {
    return sources;
  }
  if (module === 'unclassified') {
    return sources.filter((source) => !source.legacyModule);
  }
  return sources.filter((source) => source.legacyModule === module);
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

function filterAgentMarkupRulesByModuleSources(rules: AgentMarkupSummary[], module: LegacyPricingModule | 'unclassified' | undefined, sources: ActivePriceBookAgentSource[]) {
  if (!module) {
    return rules;
  }
  const priceBookIds = new Set(sources.map((source) => source.priceBookId).filter(Boolean));
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

function hasPriceBookRowMarkupControls(query: PriceBookRowsQuery) {
  const amount = String(query.markupAmount ?? 'ALL').trim();
  const source = String(query.markupSource ?? 'ALL').trim();
  const sort = String(query.markupSort ?? 'NONE').trim();
  return (amount && amount !== 'ALL') || (source && source !== 'ALL') || sort === 'ASC' || sort === 'DESC';
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

function buildAgentMarkupPreview(rule: AgentMarkupSummary, priceRows: PriceBookRowSummary[], logs: Array<{ action: string; createdAt?: Date | string }>): AgentMarkupPreviewResponse {
  const rows = matchingPriceRowsForRule(rule, priceRows);
  return {
    rule: { ...rule, hitCount: rows.length },
    scope: {
      channelLabel: rule.channelName ?? '全部渠道',
      realChannelLabel: rule.realChannelName ?? '全部线路',
      countryLabel: rule.destinationCountry ?? '全部国家'
    },
    stats: {
      priceBookRows: rows.length,
      channels: new Set(rows.map((row) => row.channelName)).size,
      countries: new Set(rows.map((row) => row.destinationCountry)).size
    },
    examples: rows.slice(0, 8).map((row) => ({
      id: row.id,
      channelName: row.channelName,
      realChannelName: row.realChannelName,
      destinationCountry: row.destinationCountry,
      weightSegmentLabel: `${row.minWeightKg}-${row.maxWeightKg}kg`
    })),
    recentChanges: logs.slice(0, 5).map((log) => ({
      action: log.action,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt ?? new Date().toISOString())
    }))
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

function safeTime(value?: string) {
  const time = Date.parse(value ?? '');
  return Number.isFinite(time) ? time : 0;
}

function logPricingLookupTiming(stage: string, startedAt: number, details: Record<string, unknown> = {}) {
  const durationMs = Date.now() - startedAt;
  if (durationMs >= PRICING_LOOKUP_TIMING_WARN_MS) {
    console.warn(`[pricing.lookup] ${stage}`, { durationMs, ...details });
  }
  return durationMs;
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

function mapShipmentReviewWarehousePackage(row: any): ShipmentReviewPackageSummary {
  return {
    id: row.id,
    warehousePackageId: row.id,
    customerOrderNo: row.customerOrderNo,
    domesticTrackingNo: row.domesticTrackingNo ?? undefined,
    packageNo: row.labelNo ?? row.sourcePackageNo ?? row.combinedOrderNo ?? undefined,
    packageCount: row.packageCount,
    weightKg: Number(row.weightKg),
    lengthCm: Number(row.lengthCm),
    widthCm: Number(row.widthCm),
    heightCm: Number(row.heightCm),
    cbm: Number(row.cbm),
    volumetricWeightKg: Number(row.volumetricWeightKg),
    chargeableWeightKg: Number(row.chargeableWeightKg),
    inboundAt: row.scanTime?.toISOString?.() ?? row.scanTime ?? undefined,
    warehouseRemark: row.remark ?? undefined,
    exceptions: Array.isArray(row.exceptions) ? row.exceptions : []
  };
}

function mapProblemTicketSummary(row: any): ProblemTicketSummary {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    systemOrderNo: row.shipment?.systemOrderNo ?? '',
    customerName: row.shipment?.customer ? `${row.shipment.customer.code}-${row.shipment.customer.name}` : '',
    reason: row.reason,
    status: row.status,
    customerVisible: row.customerVisible,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    replies: (row.replies ?? []).map((reply: any) => ({
      id: reply.id,
      ticketId: reply.ticketId,
      author: reply.author,
      message: reply.message,
      customerVisible: reply.customerVisible,
      createdAt: reply.createdAt?.toISOString?.() ?? reply.createdAt
    }))
  };
}

function buildWarehousePackageData(input: WarehousePackageCreateInput) {
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
  const parsedScanTime = input.scanTime ? new Date(input.scanTime) : undefined;
  const scanTime = parsedScanTime && !Number.isNaN(parsedScanTime.getTime()) ? parsedScanTime : new Date();
  return {
    customerCode,
    customerOrderNo,
    domesticTrackingNo,
    combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
    labelNo: createWarehouseInboundLabelNo(customerCode, domesticTrackingNo, packageIndex, expectedTotalPackageCount),
    receivingChannel: '外部标签识别',
    destinationCountry: null,
    expectedTotalPackageCount,
    packageIndex,
    packageCount,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    cbm,
    volumetricWeightKg,
    chargeableWeightKg: roundMoney(Math.max(weightKg, volumetricWeightKg)),
    divisor: 6000,
    roundingRule: 'NONE',
    scanTime,
    remark: input.remark?.trim() || null,
    manualException: input.manualException?.trim() || null,
    scanSource: input.scanSource?.trim() || null,
    status: 'RECEIVED',
    exceptions: packageIndex < expectedTotalPackageCount ? ['部分到仓'] : []
  };
}

function mapWarehouseConsolidation(row: any, packageIds: string[]): WarehouseConsolidationSummary {
  return {
    id: row.id,
    consolidationNo: row.consolidationNo,
    mode: row.mode,
    shipmentId: row.shipmentId ?? undefined,
    systemOrderNo: row.systemOrderNo ?? undefined,
    packageIds,
    totalPackages: row.totalPackages,
    totalActualWeightKg: Number(row.totalActualWeightKg),
    totalVolumetricWeightKg: Number(row.totalVolumetricWeightKg),
    totalChargeableWeightKg: Number(row.totalChargeableWeightKg),
    createdAt: row.createdAt.toISOString()
  };
}

function toCarrierAdapterCode(carrier: string): CarrierAdapterCode {
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

function trackingWebsiteForCarrier(carrier: string, transferNo: string) {
  const encoded = encodeURIComponent(transferNo);
  const code = toCarrierAdapterCode(carrier);
  if (code === 'UPS') return `https://www.ups.com/track?tracknum=${encoded}`;
  if (code === 'DHL') return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encoded}`;
  if (code === 'FEDEX') return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
  if (code === 'USPS') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
  return undefined;
}

function dwellHours(from?: string, to = new Date().toISOString()) {
  const start = from ? new Date(from).getTime() : NaN;
  const end = new Date(to).getTime();
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round(((end - start) / 3600000) * 100) / 100) : 0;
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

type LegacyPricingRowInternal = {
  id: string;
  sourceId?: string;
  sourceFile?: string;
  module: LegacyPricingModule;
  agentName: string;
  origin?: string;
  channelName: string;
  serviceName?: string;
  warehouseCode?: string;
  destinationCountry?: string;
  postalRule?: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  costPerKg?: number;
  cbmPrice?: number;
  tierLabel?: string;
  transitLabel?: string;
  productSurchargeRemark?: string;
  specialRemark?: string;
  remark?: string;
  productCategory?: string;
  region?: string;
  serviceContent?: string;
  inboundRequirement?: string;
  channelCode?: string;
  raw?: Record<string, unknown>;
};

const legacyModuleLabels: Record<LegacyPricingModule, string> = {
  amazon: '亚马逊查询',
  inquiry: '欧洲超大件综合查询',
  europeExpress: '欧洲空海运铁路快递查询',
  southAfrica: '南非专线查询',
  usaAirSea: '美国空海运查询',
  canadaAirSea: '加拿大空海查询',
  dubaiAirSea: '迪拜空海运查询'
};

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

function legacyCargoCapabilityText(row: Partial<LegacyPricingRowInternal & PriceBookRowSummary>): string {
  return [
    row.channelName,
    (row as any).realChannelName,
    row.serviceName,
    (row as any).businessRouteName,
    row.origin,
    row.sourceFile,
    (row as any).sourceSheetName,
    row.remark,
    row.productSurchargeRemark,
    row.specialRemark,
    row.raw ? JSON.stringify(row.raw) : ''
  ].filter(Boolean).join(' ');
}

function legacyRowSupportsLargeCargo(row: Partial<LegacyPricingRowInternal & PriceBookRowSummary>): boolean {
  const routeText = [
    row.channelName,
    (row as any).realChannelName,
    row.serviceName,
    (row as any).businessRouteName,
    row.origin,
    row.sourceFile,
    (row as any).sourceSheetName
  ].filter(Boolean).join(' ');
  const positive = /卡派|卡航|卡车|海卡|超大件|大件|托盘|卡板|打托|木箱|木架|尾板|truck|oversize/i;
  if (positive.test(routeText)) return true;
  const fullText = legacyCargoCapabilityText(row);
  if (/(不收|不接|不接受|不可接|拒收|不承接).{0,12}(超大件|大件|托盘|卡板|打托|木箱|木架)/.test(fullText)) {
    return false;
  }
  return positive.test(fullText);
}

function filterLegacyRowsByCargoProfile<T extends Partial<LegacyPricingRowInternal & PriceBookRowSummary>>(rows: T[], module: LegacyPricingModule, profile: LargeCargoProfile): T[] {
  if (module === 'southAfrica') return rows;
  if (module === 'europeExpress') {
    const chihanTruckRows = rows.filter(isChihanEuropeTruckLegacyRow);
    if (profile.isLargeCargo) {
      if (chihanTruckRows.length) return chihanTruckRows;
      throw new BadRequestException(largeCargoRedirectMessage(profile));
    }
    return rows.filter((row) => !legacyRowSupportsLargeCargo(row) || isChihanEuropeTruckLegacyRow(row));
  }
  if ((module === 'inquiry' || module === 'amazon') && profile.isLargeCargo) {
    return rows.filter((row) => legacyRowSupportsLargeCargo(row));
  }
  return rows;
}

function isEuropeTransportMode(value: unknown): value is 'AIR' | 'SEA' | 'RAIL' | 'SEA_RAIL' {
  return value === 'AIR' || value === 'SEA' || value === 'RAIL' || value === 'SEA_RAIL';
}

function legacyEuropeOversizeTransportMode(row: Pick<LegacyPricingRowInternal, 'channelName' | 'serviceName' | 'origin' | 'raw'>) {
  const persisted = textValue(row.raw?.transportMode)?.toUpperCase();
  if (isEuropeTransportMode(persisted)) return persisted;
  return inferEuropeTransportMode({
    channelName: row.channelName,
    realChannelName: textValue(row.raw?.realChannelName),
    businessRouteName: row.serviceName,
    sourceSheetName: row.origin
  });
}

function legacyEuropeOversizeCargoType(row: Pick<LegacyPricingRowInternal, 'channelName' | 'serviceName' | 'origin' | 'raw'>) {
  const persisted = textValue(row.raw?.cargoType)?.toUpperCase();
  if (persisted === 'BATTERY') return 'BATTERY' as const;
  if (persisted === 'GENERAL') return 'GENERAL' as const;
  return inferEuropeOversizeCargoType({
    channelName: row.channelName,
    realChannelName: textValue(row.raw?.realChannelName),
    businessRouteName: row.serviceName,
    sourceSheetName: row.origin
  });
}

function requestedEuropeOversizeCargoType(input: Pick<LegacyPricingQuoteRequest, 'cargoType' | 'productName' | 'packageInfo'>) {
  if (input.cargoType === 'BATTERY') return 'BATTERY' as const;
  if (input.cargoType === 'GENERAL') return 'GENERAL' as const;
  return undefined;
}

function legacyInquiryTransportMatches(row: LegacyPricingRowInternal, channel?: string) {
  const requested = normalizeEuropeTransportModeFilter(channel);
  const mode = legacyEuropeOversizeTransportMode(row);
  return mode !== 'UNCLASSIFIED' && (!requested || mode === requested);
}

function legacyInquiryCargoMatches(row: LegacyPricingRowInternal, input: Pick<LegacyPricingQuoteRequest, 'cargoType' | 'productName' | 'packageInfo'>) {
  const requested = requestedEuropeOversizeCargoType(input);
  return !requested || legacyEuropeOversizeCargoType(row) === requested;
}

function isChihanEuropeTruckLegacyRow(row: Partial<LegacyPricingRowInternal & PriceBookRowSummary>) {
  const routeText = [row.channelName, (row as any).realChannelName, row.serviceName, (row as any).businessRouteName, row.origin, (row as any).sourceSheetName]
    .filter(Boolean)
    .join(' ');
  return /驰汉|CCH/i.test(String(row.agentName ?? '')) && /卡车.*海运双清/.test(routeText);
}

function legacyTaxInclusionMatches(row: Pick<LegacyPricingRowInternal, 'channelName' | 'serviceName' | 'raw'>, taxInclusion?: 'INCLUDED' | 'EXCLUDED') {
  if (!taxInclusion) return true;
  const routeText = [row.channelName, row.serviceName, textValue(row.raw?.realChannelName)].filter(Boolean).join(' ');
  if (taxInclusion === 'INCLUDED') return /(?:包税|含税)/.test(routeText) && !/(?:不包税|不含税|未包税)/.test(routeText);
  return /(?:不包税|不含税|未包税)/.test(routeText);
}

function mapLegacyPricingSource(source: any): LegacyPricingSourceSummary {
  return {
    id: source.id,
    module: source.module,
    fileName: source.fileName,
    rowCount: source.rowCount ?? source.rows?.length ?? 0,
    importedAt: source.importedAt instanceof Date ? source.importedAt.toISOString() : String(source.importedAt ?? new Date().toISOString()),
    status: source.status === 'error' ? 'error' : 'ok',
    message: source.message ?? undefined
  };
}

function mapLegacyPricingRow(row: any, source?: any): LegacyPricingRowInternal {
  const raw = typeof row.raw === 'object' && row.raw ? row.raw as Record<string, unknown> : {};
  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceFile: source?.fileName,
    module: row.module,
    agentName: row.agentName,
    origin: row.origin ?? undefined,
    channelName: row.channelName,
    serviceName: row.serviceName ?? undefined,
    warehouseCode: row.warehouseCode ?? undefined,
    destinationCountry: row.destinationCountry ?? undefined,
    postalRule: row.postalRule ?? undefined,
    minWeightKg: row.minWeightKg === null || row.minWeightKg === undefined ? undefined : Number(row.minWeightKg),
    maxWeightKg: row.maxWeightKg === null || row.maxWeightKg === undefined ? undefined : Number(row.maxWeightKg),
    costPerKg: row.costPerKg === null || row.costPerKg === undefined ? undefined : Number(row.costPerKg),
    cbmPrice: row.cbmPrice === null || row.cbmPrice === undefined ? undefined : Number(row.cbmPrice),
    tierLabel: row.tierLabel ?? undefined,
    transitLabel: sanitizePricingTransitLabel(row.transitLabel) ?? undefined,
    productSurchargeRemark: row.productSurchargeRemark ?? undefined,
    specialRemark: row.specialRemark ?? undefined,
    remark: row.remark ?? undefined,
    productCategory: textValue(raw.productCategory ?? raw['产品类别']),
    region: textValue(raw.region ?? raw['区域']),
    serviceContent: textValue(raw.serviceContent ?? raw['服务内容']),
    inboundRequirement: textValue(raw.inboundRequirement ?? raw['入仓要求'] ?? raw['进仓地']),
    channelCode: textValue(raw.channelCode ?? raw['渠道代码'] ?? raw['通道代码']),
    raw
  };
}

function normalizeLegacyRawRow(module: LegacyPricingModule, fileName: string, row: Record<string, unknown>): LegacyPricingRowInternal {
  const raw = row ?? {};
  const agentName = textValue(raw.agentName ?? raw['代理'] ?? raw.agent ?? raw['代理名称']) || '未知代理';
  const channelName = textValue(raw.channelName ?? raw.channel ?? raw['渠道'] ?? raw.service ?? raw['服务']) || '未命名渠道';
  const minWeightKg = numberValue(raw.minWeightKg ?? raw.minKg ?? raw['最小重量'] ?? raw['minKg']);
  const maxWeightKg = numberValue(raw.maxWeightKg ?? raw.maxKg ?? raw['最大重量'] ?? raw['maxKg']);
  const costPerKg = numberValue(raw.costPerKg ?? raw.price ?? raw['成本单价'] ?? raw['单价'] ?? raw['12KG+'] ?? raw['51KG+']);
  return {
    id: textValue(raw.id) || `legacy-${module}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    module,
    sourceFile: fileName,
    agentName,
    origin: textValue(raw.origin ?? raw['出货仓/报价组']),
    channelName,
    serviceName: textValue(raw.serviceName ?? raw.service),
    warehouseCode: textValue(raw.warehouseCode ?? raw['仓库代码']),
    destinationCountry: textValue(raw.destinationCountry ?? raw.country ?? raw['国家'] ?? raw['目的地']),
    postalRule: textValue(raw.postalRule ?? raw['邮编规则']),
    minWeightKg,
    maxWeightKg,
    costPerKg,
    cbmPrice: numberValue(raw.cbmPrice ?? raw['按方包税'] ?? raw['按方不包税'] ?? raw['按方未标注']),
    tierLabel: textValue(raw.tierLabel ?? raw.label ?? raw['重量段']),
    transitLabel: textValue(raw.transitLabel ?? raw['参考时效'] ?? raw['时效']),
    productSurchargeRemark: textValue(raw.productSurchargeRemark ?? raw['产品附加']),
    specialRemark: textValue(raw.specialRemark ?? raw['特别说明'] ?? raw['尺寸要求']),
    remark: textValue(raw.remark ?? raw.notes ?? raw['备注']),
    productCategory: textValue(raw.productCategory ?? raw['产品类别']),
    region: textValue(raw.region ?? raw['区域']),
    serviceContent: textValue(raw.serviceContent ?? raw['服务内容']),
    inboundRequirement: textValue(raw.inboundRequirement ?? raw['入仓要求'] ?? raw['进仓地']),
    channelCode: textValue(raw.channelCode ?? raw['渠道代码'] ?? raw['通道代码']),
    raw
  };
}

function legacyPricingRowCreateData(module: LegacyPricingModule, row: LegacyPricingRowInternal) {
  return {
    module,
    agentName: row.agentName,
    origin: row.origin ?? null,
    channelName: row.channelName,
    serviceName: row.serviceName ?? null,
    warehouseCode: row.warehouseCode ?? null,
    destinationCountry: row.destinationCountry ?? null,
    postalRule: row.postalRule ?? null,
    minWeightKg: row.minWeightKg ?? null,
    maxWeightKg: row.maxWeightKg ?? null,
    costPerKg: row.costPerKg ?? null,
    cbmPrice: row.cbmPrice ?? null,
    tierLabel: row.tierLabel ?? null,
    transitLabel: sanitizePricingTransitLabel(row.transitLabel) ?? null,
    productSurchargeRemark: row.productSurchargeRemark ?? null,
    specialRemark: row.specialRemark ?? null,
    remark: row.remark ?? null,
    raw: row.raw ?? {}
  };
}

function priceBookRowToLegacyPricingRow(row: PriceBookRowSummary, targetModule?: LegacyPricingModule): LegacyPricingRowInternal {
  const module = targetModule ?? inferLegacyModuleFromPriceRow(row);
  const cbmPrice = Number(row.cbmPrice);
  const isCbm = isCbmPriceBookImportRow(row);
  return {
    id: row.id,
    sourceId: row.priceBookId,
    module,
    agentName: row.agentName,
    origin: row.sourceSheetName,
    channelName: row.channelName,
    serviceName: row.businessRouteName,
    warehouseCode: row.warehouseCode,
    destinationCountry: row.destinationCountry,
    postalRule: row.postalRule,
    minWeightKg: row.minWeightKg,
    maxWeightKg: row.maxWeightKg,
    costPerKg: isCbm ? undefined : row.costPerKg,
    cbmPrice: Number.isFinite(cbmPrice) && cbmPrice > 0 ? cbmPrice : undefined,
    tierLabel: row.priceTierLabel || inferAmazonWeightBandFromMin(row.minWeightKg) || `${row.minWeightKg}KG+`,
    transitLabel: sanitizePricingTransitLabel(row.transitLabel),
    productSurchargeRemark: row.productSurchargeRemark,
    specialRemark: row.specialRemark,
    productCategory: row.productCategory,
    region: row.region,
    serviceContent: row.serviceContent,
    inboundRequirement: row.inboundRequirement,
    channelCode: row.channelCode,
    raw: { ...row }
  };
}

function isCbmPriceBookImportRow(row: Pick<PriceBookRowSummary, 'cbmPrice' | 'priceTierLabel'>) {
  return (Number(row.cbmPrice) > 0) || /^按方/.test(String(row.priceTierLabel ?? ''));
}

function groupLegacyRowsByModule(rows: PriceBookRowSummary[], fileName: string, targetModule?: PriceBookImportTargetModule) {
  const grouped = new Map<LegacyPricingModule, LegacyPricingRowInternal[]>();
  for (const row of rows) {
    const legacyRow = priceBookRowToLegacyPricingRow(row, targetModule);
    legacyRow.id = randomUUID();
    legacyRow.sourceFile = fileName;
    const current = grouped.get(legacyRow.module) ?? [];
    current.push(legacyRow);
    grouped.set(legacyRow.module, current);
  }
  return grouped;
}

function inferLegacyModuleFromPriceRow(row: PriceBookRowSummary): LegacyPricingModule {
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

function normalizePriceBookImportTargetModule(value: unknown): PriceBookImportTargetModule {
  if (isLegacyPricingModule(value)) {
    return value;
  }
  throw new BadRequestException('请选择本次导入适用的查价模块');
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

function defaultLegacyModuleDestination(module: LegacyPricingModule): string | undefined {
  // Amazon query books are scoped by the selected import module, not by a
  // hard-coded country. A route to Canada can therefore be quoted from the
  // Amazon module when it has a matching warehouse code.
  if (module === 'amazon') return undefined;
  if (module === 'southAfrica') return '南非';
  if (module === 'canadaAirSea') return '加拿大';
  if (module === 'dubaiAirSea') return '迪拜';
  return '美国';
}

function buildLegacyModuleCountsByFile(sources: any[]) {
  const result = new Map<string, Partial<Record<LegacyPricingModule, number>>>();
  for (const source of sources) {
    const fileName = String(source.fileName ?? '');
    if (!fileName) continue;
    const module = source.module as LegacyPricingModule;
    const counts = result.get(fileName) ?? {};
    counts[module] = (counts[module] ?? 0) + Number(source.rowCount ?? source.rows?.length ?? 0);
    result.set(fileName, counts);
  }
  return result;
}

function buildLegacyPricingMeta(rows: LegacyPricingRowInternal[], canViewInternalPricing = true): LegacyPricingMetaResponse {
  const modules = (Object.keys(legacyModuleLabels) as LegacyPricingModule[]).map((key) => {
    const moduleRows = rows.filter((row) => row.module === key);
    return {
      key,
      label: legacyModuleLabels[key],
      rowCount: moduleRows.length,
      sourceCount: new Set(moduleRows.map((row) => row.sourceId ?? row.sourceFile).filter(Boolean)).size
    };
  });
  return {
    modules,
    agents: canViewInternalPricing ? uniqueSorted(rows.map((row) => row.agentName)) : [],
    origins: uniqueAmazonOriginWarehouseNames(rows.filter((row) => row.module === 'amazon').map((row) => row.origin)),
    warehouseCodes: uniqueSorted(rows.map((row) => row.warehouseCode)),
    tiers: uniqueAmazonWeightBandsFromLegacyRows(rows.filter((row) => row.module === 'amazon'))
  };
}

function createLegacyPricingQuote(
  principal: Principal,
  input: LegacyPricingQuoteRequest,
  rows: LegacyPricingRowInternal[],
  persistedMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules,
  activePriceBookByFileName: Map<string, { id: string; fileName: string; agentShortName?: string; remark?: string }> = new Map()
): LegacyPricingQuoteResponse {
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
  const cargoProfile = createLargeCargoProfile(input);
  const moduleRows = filterLegacyRowsByCargoProfile(withOpenEndedHighestLegacyTiers(rows.filter((row) => row.module === input.module)), input.module, cargoProfile)
    .filter((row) => legacyTaxInclusionMatches(row, input.taxInclusion))
    .filter((row) => input.module !== 'inquiry' || legacyInquiryCargoMatches(row, input));
  const postalScopedRows = input.module === 'usaAirSea'
    ? selectUsPostalPriceRows(moduleRows, input.postalCode)
    : moduleRows;
  const matchedRows = postalScopedRows
    .filter((row) => !input.agentName || row.agentName === input.agentName)
    .filter((row) => input.module !== 'canadaAirSea' || canadaAddressTypeMatchesWarehouseCode(row.warehouseCode, input.canadaAddressType, input.amazonCode))
    .filter((row) => legacyAmazonWarehouseMatches(row.warehouseCode, input.amazonCode))
    .filter((row) => legacyAmazonOriginMatches(row, input.origin))
    .filter((row) => !input.destinationCountry?.trim() || !row.destinationCountry || countryMatches(row.destinationCountry, input.destinationCountry))
    .filter((row) => legacyChannelMatches(row, input.channel))
    .filter((row) => legacyAmazonWeightBandMatches(row, input))
    .filter((row) => legacyWeightMatches(row, chargeableWeightKg, input.volumeCbm, input.module))
    .filter((row) => legacyProductMatches(row, input.productName))
    .filter((row) => input.module === 'usaAirSea' || legacyPostalMatches(row, input.postalCode, input.address))
    .filter((row) => !input.onlyQuotable || Number.isFinite(row.costPerKg ?? row.cbmPrice));
  const filtered = selectMostSpecificLegacyWarehouseRows(matchedRows, input);
  const activePriceBooks = Array.from(new Map([...activePriceBookByFileName.values()].map((book) => [book.id, book])).values());
  const moduleMarkupRules = filterAgentMarkupRulesByModule(persistedMarkupRules, input.module, moduleRows.map((row) => legacyRowToPriceBookRow(row, row.costPerKg ?? row.cbmPrice ?? 0, row.maxWeightKg ?? row.minWeightKg ?? 1)));
  const markupRules = buildSyncedAgentMarkupRules(moduleMarkupRules, buildLegacyAgentSourcesFromRows(moduleRows, activePriceBooks, input.module)).filter((rule) => rule.enabled && !rule.deletedAt);
  const markupRuleIndex = buildMarkupRuleIndex(markupRules);
  const canViewInternalPricing = canViewPricingInternalRoute(principal.role);
  const unitPreview = input.module === 'europeExpress' && (!Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0);
  const recommendations = filtered
    .map((row) => legacyRowToRecommendation(row, input, chargeableWeightKg, markupRuleIndex, canViewInternalPricing, activePriceBookByFileName))
    .filter((row): row is LegacyPricingRecommendation => Boolean(row))
    .sort((left, right) => unitPreview
      ? left.salesUnitPrice - right.salesUnitPrice || left.salesTotal - right.salesTotal
      : left.salesTotal - right.salesTotal || left.salesUnitPrice - right.salesUnitPrice);
  const responseRecommendations = recommendations.slice(0, PRICING_LOOKUP_RESPONSE_LIMIT);
  const fastestRecommendations = recommendations
    .filter((item) => Number.isFinite(parseTransitDaysFromLabel(item.transitLabel)))
    .sort((left, right) => parseTransitDaysFromLabel(left.transitLabel) - parseTransitDaysFromLabel(right.transitLabel) || left.salesTotal - right.salesTotal)
    .slice(0, 3);
  return {
    module: input.module,
    query: input,
    recommendations: responseRecommendations,
    cheapestRecommendations: recommendations.slice(0, 3),
    fastestRecommendations,
    selected: recommendations[0],
    agentErrors: seedAgentQuoteErrors,
    metrics: {
      matchedRows: recommendations.length,
      agents: new Set(recommendations.map((row) => row.agentName)).size,
      channels: new Set(recommendations.map((row) => row.channelName)).size,
      sources: new Set(recommendations.map((row) => row.sourceId ?? row.sourceFile).filter(Boolean)).size
    }
  };
}

function legacyRowToRecommendation(
  row: LegacyPricingRowInternal,
  input: LegacyPricingQuoteRequest,
  chargeableWeightKg: number,
  markupRuleIndex: Map<string, AgentMarkupSummary[]>,
  canViewInternalPricing: boolean,
  activePriceBookByFileName: Map<string, { id: string; fileName: string; agentShortName?: string; remark?: string }> = new Map()
): LegacyPricingRecommendation | null {
  const kgPrice = Number(row.costPerKg);
  const cbmPrice = Number(row.cbmPrice);
  const volumeCbm = Number(input.volumeCbm ?? 0);
  const unitPreview = input.module === 'europeExpress' && (!Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) && Number(cbmPrice ?? 0) <= 0 && Number.isFinite(kgPrice) && kgPrice > 0;
  const quoteWeightKg = unitPreview ? 1 : chargeableWeightKg;
  let quoteMode: LegacyPricingRecommendation['quoteMode'] = 'kg';
  let costUnitPrice = kgPrice;
  let costTotal = roundMoney(kgPrice * quoteWeightKg);
  if ((!Number.isFinite(costUnitPrice) || costUnitPrice <= 0) && Number.isFinite(cbmPrice) && cbmPrice > 0 && volumeCbm > 0) {
    quoteMode = 'cbm';
    costUnitPrice = cbmPrice;
    costTotal = roundMoney(cbmPrice * volumeCbm);
  }
  if (!Number.isFinite(costTotal) || costTotal <= 0 || quoteWeightKg <= 0) {
    return null;
  }
  const priceLike = legacyRowToPriceBookRow(row, costUnitPrice, quoteWeightKg);
  const activeBook = (row.sourceFile ? activePriceBookByFileName.get(row.sourceFile) : undefined)
    ?? (row.sourceId ? activePriceBookByFileName.get(row.sourceId) : undefined);
  const ownerAgentName = activeBook?.agentShortName ?? row.agentName;
  if (activeBook) {
    priceLike.priceBookId = activeBook.id;
  }
  const markupCandidates = [
    ...(markupRuleIndex.get(markupRuleIndexKey(ownerAgentName, activeBook?.id)) ?? []),
    ...(markupRuleIndex.get(markupRuleIndexKey(ownerAgentName)) ?? [])
  ];
  const markup = findBestMarkupRule(markupCandidates, priceLike, ownerAgentName, { unit: quoteMode === 'cbm' ? 'CBM' : 'KG', value: quoteMode === 'cbm' ? volumeCbm : quoteWeightKg });
  if (!markup) return null;
  const markupResult = applyAgentMarkup(costUnitPrice, quoteMode === 'cbm' ? volumeCbm : quoteWeightKg, markup);
  const displayRow = normalizePricingImportRowForModule({
    channelName: row.channelName,
    realChannelName: row.raw?.realChannelName as string | undefined,
    businessRouteName: row.serviceName,
    sourceSheetName: row.origin,
    transitLabel: row.transitLabel,
    specialRemark: row.specialRemark,
    productSurchargeRemark: row.productSurchargeRemark
  }, row.module);
  const publicCode = publicPricingRouteCode(displayRow.channelName, row.serviceName);
  const transportMode = row.module === 'inquiry' ? legacyEuropeOversizeTransportMode(row) : undefined;
  const cargoType = row.module === 'inquiry' ? legacyEuropeOversizeCargoType(row) : undefined;
  const requirementAgentNames = [ownerAgentName, row.agentName];
  const productSurchargeRemark = sanitizePricingChannelRequirement(row.productSurchargeRemark, requirementAgentNames);
  const specialRemark = sanitizePricingChannelRequirement(row.specialRemark, requirementAgentNames);
  const remark = sanitizePricingChannelRequirement(row.remark, requirementAgentNames);
  const customRemark = activeBook?.remark?.trim() || undefined;
  return {
    id: row.id,
    module: row.module,
    ...(canViewInternalPricing ? { sourceId: row.sourceId, sourceFile: row.sourceFile } : {}),
    agentName: canViewInternalPricing ? ownerAgentName : publicCode,
    origin: canViewInternalPricing ? row.origin : undefined,
    channelName: canViewInternalPricing ? displayRow.channelName : publicCode,
    serviceName: canViewInternalPricing ? row.serviceName : publicCode,
    ...(transportMode && transportMode !== 'UNCLASSIFIED' ? { transportMode } : {}),
    ...(cargoType ? { cargoType } : {}),
    warehouseCode: row.warehouseCode,
    destinationCountry: row.destinationCountry,
    postalRule: row.postalRule,
    weightSegmentLabel: input.module === 'amazon'
      ? normalizeAmazonCbmTier(row.tierLabel) ?? row.tierLabel ?? normalizeAmazonWeightBand(input.weightBand ?? input.tier) ?? inferAmazonWeightBandFromMin(row.minWeightKg) ?? `${row.minWeightKg ?? 0}-${row.maxWeightKg ?? 99999}kg`
      : row.tierLabel || `${row.minWeightKg ?? 0}-${row.maxWeightKg ?? 99999}kg`,
    quoteMode,
    tierLabel: row.tierLabel,
    ...(canViewInternalPricing ? { costUnitPrice } : {}),
    salesUnitPrice: markupResult.salesRatePerKg,
    ...(canViewInternalPricing ? { costTotal } : {}),
    salesTotal: markupResult.totalSales,
    ...(canViewInternalPricing ? { grossProfit: roundMoney(markupResult.totalSales - costTotal), markup, calculation: buildPricingCalculationBreakdown(priceLike, markup, quoteMode === 'cbm' ? 'CBM' : 'KG', quoteMode === 'cbm' ? volumeCbm : quoteWeightKg, costUnitPrice, markupResult) } : {}),
    chargeableWeightKg: unitPreview ? 0 : chargeableWeightKg,
    volumeCbm: volumeCbm || undefined,
    transitLabel: sanitizePricingTransitLabel(displayRow.transitLabel) ?? '时效待确认',
    productSurchargeRemark,
    specialRemark,
    ...(customRemark ? { customRemark } : {}),
    ...(remark ? { remark } : {}),
    raw: canViewInternalPricing ? row.raw : undefined
  };
}

function combinePricingDisplayRemarks(...remarks: Array<string | null | undefined>) {
  return Array.from(new Set(remarks
    .map((remark) => remark?.trim())
    .filter((remark): remark is string => Boolean(remark)))).join('\n') || undefined;
}

const amazonOriginWarehouseNames = [
  '义乌仓',
  '华东',
  '华南',
  '厦门/泉州/福州',
  '天津/南昌/石家庄',
  '武汉/长沙/成都',
  '汕头',
  '济南/潍坊',
  '深圳/广州仓',
  '西安/沧州/保定',
  '重庆',
  '青岛/郑州/温州/台州/连云港/南京/合肥'
];

function normalizeAmazonOriginWarehouseName(value: unknown): string | undefined {
  const text = String(value ?? '')
    .replace(/[／｜|、，,；;]/g, '/')
    .replace(/\s+/g, '')
    .replace(/^(?:出货仓|起运仓|发货仓|发货地|起运地|来源地|仓库区域|揽收区域|报价组)[:：]?/, '')
    .trim();
  if (!text) return undefined;
  const compact = text.replace(/[()（）]/g, '');
  if (/^(?:仓库编码|仓库代码|亚马逊代码|FBA仓库代码|仓库|编码)$/i.test(compact)) {
    return undefined;
  }
  const matched = amazonOriginWarehouseNames.find((name) => compact.includes(name.replace(/[()（）]/g, '')));
  if (matched) return matched;
  if (/深圳/.test(compact) && /广州/.test(compact)) {
    return '深圳/广州仓';
  }
  if (/欧洲|西班牙|英国|铁路|空派|快递|海运|专线|渠道|DHL|UPS|FEDEX|美西|美东|包税|双清|卡派|海卡/i.test(compact)) {
    return undefined;
  }
  if (/(仓|华东|华南|义乌|深圳|广州|汕头|厦门|泉州|福州|天津|南昌|石家庄|武汉|长沙|成都|济南|潍坊|西安|沧州|保定|重庆|青岛|郑州|温州|台州|连云港|南京|合肥)/.test(compact)) {
    return compact.slice(0, 30);
  }
  return undefined;
}

function uniqueAmazonOriginWarehouseNames(values: Array<unknown>): string[] {
  const unique = new Set(values.map(normalizeAmazonOriginWarehouseName).filter((value): value is string => Boolean(value)));
  return [...unique].sort((left, right) => {
    const leftIndex = amazonOriginWarehouseNames.indexOf(left);
    const rightIndex = amazonOriginWarehouseNames.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
    }
    return left.localeCompare(right, 'zh-CN');
  });
}

function legacyAmazonOriginMatches(row: LegacyPricingRowInternal, origin?: string) {
  if (row.module !== 'amazon') return true;
  const normalized = normalizeAmazonOriginWarehouseName(origin);
  if (!normalized) return true;
  return normalizeAmazonOriginWarehouseName(row.origin) === normalized;
}

function normalizeAmazonCbmTier(value?: string | number | null): '按方包税' | '按方不包税' | '按方未标注' | undefined {
  const text = String(value ?? '').trim().replace(/\s+/g, '');
  if (!/按方|CBM|方/i.test(text)) return undefined;
  if (/不包税|不含税|未包税/.test(text)) return '按方不包税';
  if (/包税|含税/.test(text)) return '按方包税';
  return '按方未标注';
}

function amazonWeightBandMinimum(value?: string | number | null): number | undefined {
  const text = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const weight = Number(match[1]);
  return Number.isFinite(weight) ? weight : undefined;
}

function normalizeAmazonWeightBand(value?: string | number | null): string | undefined {
  const weight = amazonWeightBandMinimum(value);
  if (weight === undefined) return undefined;
  // A source workbook's tier is authoritative. Do not collapse 21KG+, 45KG+
  // or any other valid source tier into the historic 12/51/100 UI buckets.
  return `${weight}KG+`;
}

function inferAmazonWeightBandFromMin(minWeightKg?: number | null): string | undefined {
  const min = Number(minWeightKg ?? 0);
  if (!Number.isFinite(min)) return undefined;
  return normalizeAmazonWeightBand(min);
}

function uniqueAmazonWeightBandsFromLegacyRows(rows: Array<Pick<LegacyPricingRowInternal, 'tierLabel' | 'minWeightKg' | 'cbmPrice'>>) {
  return Array.from(new Set(rows
    .filter((row) => !normalizeAmazonCbmTier(row.tierLabel) && Number(row.cbmPrice ?? 0) <= 0)
    .map((row) => row.tierLabel?.trim() || inferAmazonWeightBandFromMin(row.minWeightKg))
    .filter((label): label is string => Boolean(label))))
    .sort((left, right) => (amazonWeightBandMinimum(left) ?? 0) - (amazonWeightBandMinimum(right) ?? 0));
}

function inferAmazonWeightBandFromLegacyRows(rows: Array<Pick<LegacyPricingRowInternal, 'tierLabel' | 'minWeightKg' | 'maxWeightKg' | 'cbmPrice'>>, chargeableWeightKg: number) {
  const weight = Number(chargeableWeightKg);
  if (!Number.isFinite(weight) || weight <= 0) return undefined;
  const matching = rows
    .filter((row) => !normalizeAmazonCbmTier(row.tierLabel) && Number(row.cbmPrice ?? 0) <= 0)
    .filter((row) => weight >= Number(row.minWeightKg ?? 0) && weight <= Number(row.maxWeightKg ?? Number.MAX_SAFE_INTEGER));
  const candidates = matching.length ? matching : rows
    .filter((row) => !normalizeAmazonCbmTier(row.tierLabel) && Number(row.cbmPrice ?? 0) <= 0)
    .filter((row) => weight >= Number(row.minWeightKg ?? 0));
  return candidates
    .map((row) => ({ label: row.tierLabel?.trim() || inferAmazonWeightBandFromMin(row.minWeightKg), minimum: Number(row.minWeightKg ?? 0) }))
    .filter((item): item is { label: string; minimum: number } => Boolean(item.label))
    .sort((left, right) => right.minimum - left.minimum)[0]?.label;
}

function priceRowAmazonWeightBandMatches(row: PriceBookRowSummary, weightBand?: string) {
  const cbmTier = normalizeAmazonCbmTier(weightBand);
  const rowCbmTier = normalizeAmazonCbmTier(row.priceTierLabel);
  if (cbmTier) return Number(row.cbmPrice ?? 0) > 0 && (rowCbmTier ? rowCbmTier === cbmTier : true);
  if (Number(row.cbmPrice ?? 0) > 0) return false;
  return true;
}

function legacyAmazonWeightBandMatches(row: LegacyPricingRowInternal, input: LegacyPricingQuoteRequest) {
  if (input.module !== 'amazon') return true;
  const selectedCbmTier = normalizeAmazonCbmTier(input.weightBand ?? input.tier);
  const rowCbmTier = normalizeAmazonCbmTier(row.tierLabel);
  if (selectedCbmTier) {
    return Number(row.cbmPrice ?? 0) > 0 && (rowCbmTier ? rowCbmTier === selectedCbmTier : true);
  }
  if (Number(row.cbmPrice ?? 0) > 0) return false;
  return true;
}

function legacyAmazonWarehouseMatches(rowWarehouseCode?: string | null, inputWarehouseCode?: string | null) {
  const inputCode = normalizeWarehouseCode(inputWarehouseCode ?? undefined);
  if (!inputCode) return true;
  const rowCode = normalizeWarehouseCode(rowWarehouseCode ?? undefined);
  if (!rowCode) return false;
  return matchWarehouseCodeRule(rowCode, inputCode) !== undefined;
}

function selectMostSpecificLegacyWarehouseRows(rows: LegacyPricingRowInternal[], input: LegacyPricingQuoteRequest) {
  if (input.module !== 'amazon' || !normalizeWarehouseCode(input.amazonCode)) return rows;
  const ranked = rows
    .map((row) => ({ row, rank: matchWarehouseCodeRule(row.warehouseCode, input.amazonCode) }))
    .filter((candidate): candidate is { row: LegacyPricingRowInternal; rank: 0 | 1 } => candidate.rank !== undefined);
  const bestRank = Math.min(...ranked.map((candidate) => candidate.rank));
  return Number.isFinite(bestRank) ? ranked.filter((candidate) => candidate.rank === bestRank).map((candidate) => candidate.row) : [];
}

function legacyWeightMatches(row: LegacyPricingRowInternal, chargeableWeightKg: number, volumeCbm?: number, module?: LegacyPricingModule) {
  if (row.cbmPrice && Number(volumeCbm ?? 0) > 0) return cbmTierMatches(row.tierLabel, Number(volumeCbm ?? 0));
  const min = row.minWeightKg ?? 0;
  const max = row.maxWeightKg ?? 999999;
  if (module === 'europeExpress' && (!Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0)) {
    return Number.isFinite(row.costPerKg) && Number(row.costPerKg) > 0;
  }
  if (!Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) return !row.costPerKg;
  return chargeableWeightKg >= min && chargeableWeightKg <= max;
}

function withOpenEndedHighestLegacyTiers(rows: LegacyPricingRowInternal[]) {
  const highestMinimumByRoute = new Map<string, number>();
  for (const row of rows) {
    if (Number(row.cbmPrice ?? 0) > 0 || !isOpenEndedKgTier(row.tierLabel)) continue;
    const key = [row.sourceId, row.sourceFile, row.module, row.agentName, row.origin, row.channelName, row.serviceName, row.warehouseCode, row.destinationCountry, row.postalRule].join('\u0001');
    highestMinimumByRoute.set(key, Math.max(highestMinimumByRoute.get(key) ?? Number.NEGATIVE_INFINITY, Number(row.minWeightKg ?? 0)));
  }
  return rows.map((row) => {
    if (Number(row.cbmPrice ?? 0) > 0 || !isOpenEndedKgTier(row.tierLabel)) return row;
    const key = [row.sourceId, row.sourceFile, row.module, row.agentName, row.origin, row.channelName, row.serviceName, row.warehouseCode, row.destinationCountry, row.postalRule].join('\u0001');
    return highestMinimumByRoute.get(key) === Number(row.minWeightKg ?? 0) && Number(row.maxWeightKg ?? 99999) < 99999
      ? { ...row, maxWeightKg: 99999 }
      : row;
  });
}

function isOpenEndedKgTier(label?: string) {
  const text = String(label ?? '').trim();
  return !normalizeAmazonCbmTier(text) && /(?:kg|kgs|公斤)?\s*(?:\+|以上)$/i.test(text);
}

function cbmTierMatches(tierLabel: string | undefined, volumeCbm: number) {
  if (!Number.isFinite(volumeCbm) || volumeCbm <= 0) return false;
  const text = String(tierLabel ?? '').toUpperCase().replace(/\s+/g, '');
  const range = text.match(/(\d+(?:\.\d+)?)\s*[-~－—]\s*(\d+(?:\.\d+)?)\s*CBM?/);
  if (range) {
    return volumeCbm >= Number(range[1]) && volumeCbm <= Number(range[2]);
  }
  const above = text.match(/(\d+(?:\.\d+)?)\s*CBM?\+/) ?? text.match(/(\d+(?:\.\d+)?)\s*CBM?以上/);
  if (above) {
    return volumeCbm > Number(above[1]);
  }
  return true;
}

function legacyChannelMatches(row: LegacyPricingRowInternal, channel?: string) {
  if (row.module === 'inquiry') {
    return legacyInquiryTransportMatches(row, channel);
  }
  if (row.module === 'europeExpress') {
    const mode = inferEuropeTransportMode({
      channelName: row.channelName,
      realChannelName: String((row.raw as Record<string, unknown> | undefined)?.realChannelName ?? ''),
      businessRouteName: row.serviceName,
      sourceSheetName: row.origin
    });
    if (mode === 'UNCLASSIFIED') return false;
    const requested = normalizeEuropeTransportModeFilter(channel);
    return !requested || mode === requested;
  }
  const query = channel?.trim().toLowerCase();
  if (!query) return true;
  // Display channels for the two Europe modules are deliberately normalized to
  // "Sheet - price group". Keep the original imported route text searchable so
  // filtering by a real transport keyword (for example "空派") still works.
  const haystack = `${row.channelName} ${row.serviceName ?? ''} ${row.origin ?? ''} ${row.remark ?? ''} ${JSON.stringify(row.raw ?? {})}`.toLowerCase();
  if (haystack.includes(query)) return true;
  if (query.includes('快递')) return /快递|空派|派送|dhl|ups|fedex|express/.test(haystack);
  if (query.includes('海运')) return /海运|海派|海卡|卡派|卡车|truck/.test(haystack);
  if (query.includes('铁路')) return /铁路|铁派|rail/.test(haystack);
  if (query.includes('空运')) return /空运|空派|air/.test(haystack);
  return false;
}

function legacyProductMatches(row: LegacyPricingRowInternal, productName?: string) {
  const query = productName?.trim().toLowerCase();
  if (!query || row.module !== 'southAfrica') return true;
  const haystack = `${row.channelName} ${row.serviceName ?? ''} ${row.tierLabel ?? ''} ${row.remark ?? ''} ${row.productSurchargeRemark ?? ''} ${row.specialRemark ?? ''} ${JSON.stringify(row.raw ?? {})}`.toLowerCase();
  return query.split(/[,，、\s]+/).filter(Boolean).some((word) => haystack.includes(word)) || /衣服|服饰|纺织|textile|clothes|garment/.test(`${query} ${haystack}`);
}

function legacyPostalMatches(row: LegacyPricingRowInternal, postalCode?: string, address?: string) {
  const rule = row.postalRule?.trim();
  if (!rule) return true;
  if (row.module === 'inquiry' || row.module === 'europeExpress') {
    return matchesEuropeanPostalRule(rule, postalCode);
  }
  const query = `${postalCode ?? ''} ${address ?? ''}`.trim().toLowerCase();
  if (!query) return true;
  return rule.toLowerCase().split(/[,，、\s/]+/).filter(Boolean).some((part) => query.includes(part) || part.includes(query));
}

function selectUsPostalPriceRows(rows: LegacyPricingRowInternal[], postalCode?: string) {
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
    .filter((item): item is { row: LegacyPricingRowInternal; match: NonNullable<ReturnType<typeof matchUsPostalRule>> } => Boolean(item.match));
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

function legacyRowToPriceBookRow(row: LegacyPricingRowInternal, costPerKg: number, chargeableWeightKg: number): PriceBookRowSummary {
  return {
    id: row.id,
    priceBookId: textValue(row.raw?.priceBookId) ?? row.sourceId ?? 'legacy',
    agentName: row.agentName,
    carrierName: inferBackendPriceCarrierName({ channelName: row.channelName } as PriceBookRowSummary),
    sourceSheetName: textValue(row.raw?.sourceSheetName) ?? row.sourceFile,
    channelName: row.channelName,
    realChannelName: textValue(row.raw?.realChannelName) ?? row.serviceName ?? row.channelName,
    warehouseCode: row.warehouseCode,
    destinationCountry: row.destinationCountry ?? '',
    minWeightKg: row.minWeightKg ?? 0,
    maxWeightKg: row.maxWeightKg ?? Math.max(chargeableWeightKg, 99999),
    costPerKg,
    cbmPrice: row.cbmPrice,
    priceTierLabel: row.tierLabel,
    currency: 'RMB',
    transitLabel: row.transitLabel,
    productSurchargeRemark: row.productSurchargeRemark,
    specialRemark: row.specialRemark,
    productCategory: row.productCategory,
    region: row.region,
    serviceContent: row.serviceContent,
    inboundRequirement: row.inboundRequirement,
    channelCode: row.channelCode
  };
}

function mapSouthAfricaRateImage(row: any): SouthAfricaRateImageSummary {
  return {
    id: row.id,
    fileName: row.fileName,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes ?? 0),
    url: row.url ?? row.storagePath ?? undefined,
    uploadedBy: row.uploadedBy ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
  };
}

function mapSouthAfricaRateRule(row: any): SouthAfricaRateRuleSummary {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    ratePerCbm: row.ratePerCbm === null || row.ratePerCbm === undefined ? undefined : Number(row.ratePerCbm),
    consult: row.consult === true,
    remark: row.remark ?? undefined,
    sourceImageId: row.sourceImageId ?? undefined,
    enabled: row.enabled !== false,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)
  };
}

function defaultSouthAfricaRateRuleMeta(): Pick<SouthAfricaRateRuleSummary, 'id' | 'createdAt' | 'updatedAt'> {
  const now = new Date().toISOString();
  return { id: '', createdAt: now, updatedAt: now };
}

function normalizeSouthAfricaRateRule(input: SouthAfricaRateRuleInput, meta: Pick<SouthAfricaRateRuleSummary, 'id' | 'createdAt' | 'updatedAt'> = defaultSouthAfricaRateRuleMeta()): SouthAfricaRateRuleSummary {
  const category = input.category?.trim();
  const name = input.name?.trim();
  if (!category || !name) throw new BadRequestException('物料分类和名称不能为空');
  const keywords = Array.from(new Set([...normalizeSouthAfricaKeywords(input.keywords), category, name]));
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

const SOUTH_AFRICA_DEFAULT_REMARK = '无牌无侵权；约翰内斯堡自提、低消0.5CBM  报关件需要单询';

function createSouthAfricaLookupResponse(input: SouthAfricaLookupRequest, rules: SouthAfricaRateRuleSummary[], images: SouthAfricaRateImageSummary[]): SouthAfricaLookupResponse {
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
  const recommendations = rules
    .map((rule) => {
      const matchedKeywords = rule.keywords.filter((keyword: string) => keyword && haystack.includes(keyword.toLowerCase()));
      const categoryMatched = query.category && rule.category === query.category ? 10000 : 0;
      const longestKeywordLength = matchedKeywords.reduce((length, keyword) => Math.max(length, keyword.length), 0);
      const exactKeywordBonus = matchedKeywords.some((keyword) => keyword === productName) ? 100 : 0;
      return { rule, matchedKeywords, score: exactKeywordBonus + categoryMatched + matchedKeywords.length * 10 + longestKeywordLength };
    })
    .filter((item) => item.score > 0 || Boolean(query.category && item.rule.category === query.category))
    .sort((left, right) => right.score - left.score || left.rule.category.localeCompare(right.rule.category, 'zh-CN'))
    .slice(0, 5)
    .map((item) => buildSouthAfricaLookupResult(item.rule, item.matchedKeywords, query, images));
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
    quoteText: [
      `南非SA海运DDP专线：${query.productName}`,
      `分类：${rule.category}/${rule.name}`,
      `计费方：${chargeableCbm.toFixed(3)}CBM`,
      `运费：${formatSouthAfricaRmb(rule.ratePerCbm ?? 0)}/CBM，运费 ${formatSouthAfricaRmb(freightFee)}`,
      `备注：${remark}`
    ].join('\n')
  };
}

function formatSouthAfricaRmb(value: number) {
  return `¥${roundMoney(value).toFixed(2)}`;
}

function uniqueSorted(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function textValue(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function numberValue(value: unknown): number | undefined {
  const number = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function countryMatches(rowCountry: string, inputCountry?: string) {
  const left = normalizeLegacyCountry(rowCountry);
  const right = normalizeLegacyCountry(inputCountry ?? '');
  return !right || left === right || left.includes(right) || right.includes(left);
}

function legacyCountryQueryValues(value: string): string[] {
  const normalized = normalizeLegacyCountry(value);
  return Array.from(new Set([value.trim(), normalized].filter(Boolean)));
}

function normalizeLegacyCountry(value: string) {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    france: '法国',
    fr: '法国',
    germany: '德国',
    de: '德国',
    italy: '意大利',
    it: '意大利',
    spain: '西班牙',
    es: '西班牙',
    canada: '加拿大',
    ca: '加拿大',
    usa: '美国',
    us: '美国',
    'united states': '美国',
    'south africa': '南非'
  };
  return aliases[normalized] ?? normalized;
}

function parseTransitDaysFromLabel(label?: string) {
  const match = String(label ?? '').match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function createBackendPriceLookup(
  principal: Principal,
  input: PriceLookupRequest,
  priceRows: PriceBookRowSummary[],
  priceBooks: Array<Pick<PriceBookSummary, 'id' | 'fileName' | 'remark' | 'agentShortName'>>,
  persistedMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules
): PriceLookupResponse {
  const destinationCountry = input.destinationCountry?.trim();
  const chargeableWeightKg = calculateLookupChargeableWeight(input);
  const warehouseProfile = createWarehouseLookupProfile(input);
  const effectivePriceRows = withOpenEndedHighestPriceTiers(priceRows);
  if ((!destinationCountry && !warehouseProfile.code) || !Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) {
    throw new BadRequestException('目的地和计费重不能为空');
  }

  const priceBookRemarkMap = new Map(priceBooks.map((book) => [book.id, book.remark?.trim() || undefined]));
  const priceBookFileNameMap = new Map(priceBooks.map((book) => [book.id, book.fileName]));
  const priceBookAgentNameMap = new Map(priceBooks.map((book) => [book.id, book.agentShortName?.trim() || undefined]));
  const markupSources = buildPriceBookAgentSourcesFromRows(effectivePriceRows, priceBookFileNameMap, priceBookAgentNameMap);
  const markupRules = buildSyncedAgentMarkupRules(persistedMarkupRules, markupSources).filter((rule) => !('deletedAt' in rule) || !rule.deletedAt);
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
      const quoteMode = cbmPrice > 0 && normalizeAmazonCbmTier(input.weightBand) && volumeCbm > 0 ? 'cbm' : 'kg';
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
    .sort((left, right) => matchedTransitDays(left) - matchedTransitDays(right) || left.totalSales - right.totalSales)
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

function findBestMarkupRule(markupRules: AgentMarkupSummary[], price: PriceBookRowSummary, ownerAgentName = price.agentName, chargeable?: { unit: 'KG' | 'CBM'; value: number }): AgentMarkupSummary | undefined {
  const destination = price.destinationCountry.trim();
  const channel = price.channelName.trim();
  const realChannel = (price.realChannelName?.trim() || price.channelName.trim());
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
    route: {
      priceBookId: route.priceBookId,
      agentName: route.agentName,
      channelName: route.channelName,
      realChannelName: route.realChannelName,
      destinationCountry: route.destinationCountry,
      markupUnit: route.markupUnit,
      sourceSheets: Array.from(new Set(routeRows.map((row) => row.sourceSheetName).filter((value): value is string => Boolean(value))))
    },
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
  const exists = priceRows.some((row) => (agentNameByPriceBookId.get(row.priceBookId) ?? row.agentName).trim() === input.agentName.trim() && row.channelName.trim() === input.channelName.trim());
  if (!exists) throw new BadRequestException('渠道必须来自当前模块该代理已导入的真实价格表');
}

function attachCustomRemarksToPriceLookup(
  response: PriceLookupResponse,
  priceRows: PriceBookRowSummary[],
  priceBooks: Array<Pick<PriceBookSummary, 'id' | 'agentShortName' | 'remark' | 'targetModule'>>,
  remarks: AgentChannelCustomRemarkSummary[]
): PriceLookupResponse {
  const rowById = new Map(priceRows.map((row) => [row.id, row]));
  const bookById = new Map(priceBooks.map((book) => [book.id, book]));
  const decorate = (recommendation: PriceLookupRecommendation) => {
    const row = rowById.get(recommendation.price.id);
    if (!row) return recommendation;
    const book = bookById.get(row.priceBookId);
    const legacyModule = book?.targetModule;
    if (!legacyModule || legacyModule === 'dubaiAirSea') return recommendation;
    const agentName = book.agentShortName?.trim() || row.agentName;
    const content = remarks.find((remark) => remark.enabled && remark.legacyModule === legacyModule && remark.agentName === agentName && remark.channelName === row.channelName)?.content;
    const safeContent = sanitizePricingChannelRequirement(content, [agentName, row.agentName]);
    const customRemark = combinePricingDisplayRemarks(recommendation.customRemark, recommendation.remark, safeContent);
    return customRemark ? { ...recommendation, customRemark } : recommendation;
  };
  const recommendations = response.recommendations.map(decorate);
  const byId = new Map(recommendations.map((item) => [item.price.id, item]));
  return {
    ...response,
    recommendations,
    cheapestRecommendations: response.cheapestRecommendations.map((item) => byId.get(item.price.id) ?? decorate(item)),
    fastestRecommendations: response.fastestRecommendations.map((item) => byId.get(item.price.id) ?? decorate(item))
  };
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

function buildPriceBookAgentSourcesFromRows(priceRows: PriceBookRowSummary[], fileNameByBookId: Map<string, string>, agentNameByBookId: Map<string, string | undefined> = new Map(), legacyModule?: LegacyPricingModule): ActivePriceBookAgentSource[] {
  const grouped = new Map<string, ActivePriceBookAgentSource>();
  for (const row of priceRows) {
    const fileName = fileNameByBookId.get(row.priceBookId) ?? '';
    const agentName = agentNameByBookId.get(row.priceBookId) ?? row.agentName;
    const source: ActivePriceBookAgentSource = { priceBookId: fileName ? row.priceBookId : '', fileName, agentName, lineCount: 0, legacyModule };
    const key = agentMarkupScopeKey(source);
    const current = grouped.get(key) ?? source;
    current.lineCount += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()];
}

function buildLegacyAgentSourcesFromRows(rows: LegacyPricingRowInternal[], activeBooks: Array<{ id: string; fileName: string; agentShortName?: string }>, legacyModule?: LegacyPricingModule): ActivePriceBookAgentSource[] {
  const bookByFileName = new Map(activeBooks.map((book) => [book.fileName, book]));
  const grouped = new Map<string, ActivePriceBookAgentSource>();
  for (const row of rows) {
    const fileName = row.sourceFile?.trim() ?? '';
    const book = fileName ? bookByFileName.get(fileName) : undefined;
    const source: ActivePriceBookAgentSource = book
      ? { priceBookId: book.id, fileName: book.fileName, agentName: book.agentShortName ?? row.agentName, lineCount: 0, legacyModule: legacyModule ?? row.module }
      : { priceBookId: '', fileName, agentName: row.agentName, lineCount: 0, legacyModule: legacyModule ?? row.module };
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

function redactPriceBookRowsResponse(response: PriceBookRowsResponse, visibility: PricingFieldVisibility): PriceBookRowsResponse {
  return { ...response, rows: redactPriceBookRows(response.rows, visibility) };
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
  return value?.trim().replace(/\s+/g, '').toUpperCase() ?? '';
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
  const ruleRank = matchWarehouseCodeRule(rowWarehouseCode, profile.code);
  if (ruleRank !== undefined) {
    return ruleRank;
  }
  if (profile.warehouseCodes.has(rowWarehouseCode)) {
    return 2;
  }
  const searchableText = [row.channelName, row.realChannelName, row.businessRouteName, row.sourceSheetName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  return profile.keywords.some((keyword) => searchableText.includes(keyword.toUpperCase())) ? 3 : undefined;
}

function selectPriceRowsForLookup(
  priceRows: PriceBookRowSummary[],
  warehouseProfile: ReturnType<typeof createWarehouseLookupProfile>,
  destinationCountry: string | undefined,
  chargeableWeightKg: number,
  weightBand?: string,
  volumeCbm?: number
) {
  const strictCbmTier = normalizeAmazonCbmTier(weightBand);
  const strictWeightBand = strictCbmTier ?? normalizeAmazonWeightBand(weightBand);
  const candidates = priceRows
    .map((row) => ({ row, rank: getWarehouseMatchRank(row, warehouseProfile) }))
    .filter(
      (candidate): candidate is { row: PriceBookRowSummary; rank: number } =>
        candidate.rank !== undefined &&
        (destinationCountry ? candidate.row.destinationCountry === destinationCountry : candidate.rank < 3) &&
        priceRowAmazonWeightBandMatches(candidate.row, strictWeightBand) &&
        (Number(candidate.row.cbmPrice ?? 0) > 0
          ? Number(volumeCbm ?? 0) > 0 && cbmTierMatches(candidate.row.priceTierLabel, Number(volumeCbm ?? 0))
          : strictCbmTier ? Number(volumeCbm ?? 0) > 0 : chargeableWeightKg >= candidate.row.minWeightKg)
    );

  const ranks = [...new Set(candidates.map((candidate) => candidate.rank))].sort((left, right) => left - right);
  for (const rank of ranks) {
    const rankCandidates = candidates.filter((candidate) => candidate.rank === rank);
    const exactWeightRows = rankCandidates
      .filter((candidate) => chargeableWeightKg <= candidate.row.maxWeightKg)
      .map((candidate) => candidate.row);
    if (exactWeightRows.length) {
      const highestMinimum = Math.max(...exactWeightRows.map((row) => row.minWeightKg));
      return exactWeightRows.filter((row) => row.minWeightKg === highestMinimum);
    }
    if (strictCbmTier) {
      return [];
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

function withOpenEndedHighestPriceTiers(rows: PriceBookRowSummary[]) {
  const highestMinimumByRoute = new Map<string, number>();
  for (const row of rows) {
    if (Number(row.cbmPrice ?? 0) > 0 || !isOpenEndedKgTier(row.priceTierLabel)) continue;
    const key = [row.priceBookId, row.agentName, row.sourceSheetName, row.channelName, row.businessRouteName, row.realChannelName, row.warehouseCode, row.destinationCountry].join('\u0001');
    highestMinimumByRoute.set(key, Math.max(highestMinimumByRoute.get(key) ?? Number.NEGATIVE_INFINITY, row.minWeightKg));
  }
  return rows.map((row) => {
    if (Number(row.cbmPrice ?? 0) > 0 || !isOpenEndedKgTier(row.priceTierLabel)) return row;
    const key = [row.priceBookId, row.agentName, row.sourceSheetName, row.channelName, row.businessRouteName, row.realChannelName, row.warehouseCode, row.destinationCountry].join('\u0001');
    return highestMinimumByRoute.get(key) === row.minWeightKg && row.maxWeightKg < 99999
      ? { ...row, maxWeightKg: 99999 }
      : row;
  });
}

function buildPriceRowWarehouseWhere(warehouseProfile: ReturnType<typeof createWarehouseLookupProfile>): Record<string, unknown>[] {
  if (!warehouseProfile.code) return [];
  const warehouseCodes = [...warehouseProfile.warehouseCodes]
    .map((code) => code.trim())
    .filter(Boolean);
  const keywords = warehouseProfile.keywords;
  const prefixCandidates = warehouseCodePrefixCandidates(warehouseProfile.code);
  return [
    ...Array.from(new Set(warehouseCodes)).map((code) => ({ warehouseCode: { equals: code, mode: 'insensitive' } })),
    ...prefixCandidates.map((code) => ({ warehouseCode: { equals: code, mode: 'insensitive' } })),
    ...keywords.flatMap((keyword) => [
      { channelName: { contains: keyword, mode: 'insensitive' } },
      { realChannelName: { contains: keyword, mode: 'insensitive' } },
      { sourceSheetName: { contains: keyword, mode: 'insensitive' } }
    ])
  ];
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

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(Date.now());
}

function mapAgentChannel(channel: { id: string; agentId: string; channelName: string; enabled: boolean; agent: { name: string; shortName?: string | null } }): AgentChannelSummary {
  return {
    id: channel.id,
    agentId: channel.agentId,
    agentName: channel.agent.shortName || channel.agent.name,
    channelName: channel.channelName,
    enabled: channel.enabled
  };
}

function mapChannelCategory(category: { id: string; name: string; enabled: boolean }): ChannelCategorySummary {
  return { id: category.id, name: category.name, enabled: category.enabled };
}

function mapSite(site: { id: string; sortOrder: number; name: string; enabled: boolean }): SiteSummary {
  return { id: site.id, sortOrder: site.sortOrder, name: site.name, enabled: site.enabled };
}

function isStaffRoleName(role: string): boolean {
  return role !== 'CUSTOMER';
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

function normalizeRoleGroupInput(input: RoleGroupInput, fallbackSortOrder = 0) {
  const label = input.label?.trim();
  if (!label) {
    throw new BadRequestException('用户组名称不能为空');
  }
  return {
    label,
    description: normalizeOptionalText(input.description, 80),
    site: normalizeOptionalText(input.site, 40),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : fallbackSortOrder,
    enabled: input.enabled !== false,
    templateRole: input.templateRole || 'OPERATOR'
  };
}

function createRoleGroupCode(label: string): string {
  return `UG_${Buffer.from(label).toString('hex').slice(0, 24).toUpperCase()}`;
}

function mapRoleRow(row: PrismaRole & { permissions?: PrismaPermission[] }): RolePermissionRow {
  const permissions = row.permissions?.map((item) => item.code as PermissionKey) ?? defaultPermissionsForRole(row.name as RoleKey);
  return buildRolePermissionRow(row.name as RoleKey, permissions, {
    label: row.label ?? getRoleMetadata(row.name as RoleKey).label,
    description: row.description ?? undefined,
    site: row.site ?? undefined,
    sortOrder: row.sortOrder,
    enabled: row.enabled,
    systemBuiltin: row.systemBuiltin
  });
}

function mapChannel(channel: {
  id: string;
  name: string;
  carrierId: string;
  carrier: { name: string };
  enabled: boolean;
  volumeDivisor: number;
  roundingRule?: string | null;
  businessType?: string | null;
  category?: string | null;
  multiPieceWeightRule?: string | null;
  singleWeightRoundingRule?: string | null;
  settlementWeightRule?: string | null;
  settlementWeightRoundingRule?: string | null;
  largeCargoThresholdKg?: unknown;
  remoteAreaRule?: string | null;
}): ChannelSummary {
  return {
    id: channel.id,
    name: channel.name,
    carrierId: channel.carrierId,
    carrierName: channel.carrier.name,
    businessType: (channel.businessType ?? 'EXPRESS') as BusinessType,
    category: channel.category ?? channel.carrier.name,
    volumeDivisor: channel.volumeDivisor,
    multiPieceWeightRule: channel.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
    singleWeightRoundingRule: channel.singleWeightRoundingRule ?? channel.roundingRule ?? 'ACTUAL',
    settlementWeightRule: channel.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
    settlementWeightRoundingRule: channel.settlementWeightRoundingRule ?? channel.roundingRule ?? 'NONE',
    largeCargoThresholdKg: channel.largeCargoThresholdKg === null || channel.largeCargoThresholdKg === undefined ? undefined : Number(channel.largeCargoThresholdKg),
    remoteAreaRule: channel.remoteAreaRule ?? 'NONE',
    enabled: channel.enabled
  };
}

function resolveStoredRolePermissions(role: RoleKey, permissions?: PermissionKey[]): PermissionKey[] {
  if (!permissions) {
    return defaultPermissionsForRole(role);
  }
  const normalized = normalizeRolePermissions(role, permissions);
  return normalized;
}

function normalizeStaffProfile(input: StaffProfileInput) {
  const gender = staffGenderValues.includes(input.gender as (typeof staffGenderValues)[number]) ? input.gender : 'UNKNOWN';
  return {
    name: normalizeOptionalText(input.name, 40),
    phone: normalizeOptionalText(input.phone, 30),
    gender,
    nickname: normalizeOptionalText(input.nickname, 40),
    site: normalizeOptionalText(input.site, 40)
  };
}

function normalizeStaffProfileUpdate(input: StaffAccountUpdateInput) {
  return {
    ...(input.name !== undefined ? { name: normalizeOptionalText(input.name, 40) } : {}),
    ...(input.phone !== undefined ? { phone: normalizeOptionalText(input.phone, 30) } : {}),
    ...(input.gender !== undefined ? { gender: staffGenderValues.includes(input.gender as (typeof staffGenderValues)[number]) ? input.gender : 'UNKNOWN' } : {}),
    ...(input.nickname !== undefined ? { nickname: normalizeOptionalText(input.nickname, 40) } : {}),
    ...(input.site !== undefined ? { site: normalizeOptionalText(input.site, 40) } : {})
  };
}

function normalizeOptionalText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function pickStaffProfile(user: {
  name?: string | null;
  phone?: string | null;
  gender?: string | null;
  nickname?: string | null;
  departmentId?: string | null;
  department?: { name: string } | null;
  site?: string | null;
}) {
  return {
    name: user.name ?? null,
    phone: user.phone ?? null,
    gender: user.gender ?? 'UNKNOWN',
    nickname: user.nickname ?? null,
    departmentId: user.departmentId ?? null,
    department: user.department?.name ?? null,
    site: user.site ?? null
  };
}

function mapStaffAccount(user: {
  id: string;
  username: string;
  name?: string | null;
  phone?: string | null;
  gender?: string | null;
  nickname?: string | null;
  departmentId?: string | null;
  department?: { name: string } | null;
  site?: string | null;
  enabled: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  role: { name: string; label?: string | null };
}): StaffAccountSummary {
  return {
    id: user.id,
    username: user.username,
    name: user.name ?? undefined,
    phone: user.phone ?? undefined,
    gender: (user.gender as StaffAccountSummary['gender']) ?? undefined,
    nickname: user.nickname ?? undefined,
    departmentId: user.departmentId ?? undefined,
    department: user.department?.name ?? undefined,
    site: user.site ?? undefined,
    role: user.role.name as StaffAccountRoleKey,
    roleLabel: user.role.label ?? getRoleMetadata(user.role.name as RoleKey).label,
    enabled: user.enabled,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString()
  };
}

function inferIpRegion(ip: string): string {
  const normalized = ip.replace('::ffff:', '');
  if (normalized === '::1' || normalized === '127.0.0.1' || normalized === 'localhost') {
    return '本机';
  }
  if (/^(10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[0-1])\\.)/.test(normalized)) {
    return '内网';
  }
  if (!normalized || normalized === '未知') {
    return '未知';
  }
  return '公网 IP，地区待解析';
}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function formatDate(date: Date): string {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
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

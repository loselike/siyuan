import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Permission as PrismaPermission, Role as PrismaRole, Shipment as PrismaShipment } from '@prisma/client';
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
  type AgentCreateInput,
  type AgentChannelCreateInput,
  type AgentChannelSummary,
  type AgentChannelUpdateInput,
  type AgentBankAccountInput,
  type AgentBankAccountSummary,
  type AgentMarkupCreateInput,
  type AgentMarkupExportResponse,
  type AgentMarkupImportResponse,
  type AgentMarkupListQuery,
  type AgentMarkupListResponse,
  type AgentMarkupPreviewResponse,
  type AgentMarkupSummary,
  type AgentMarkupUpdateInput,
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
  type PriceBookRemarkUpdateInput,
  type PriceBooksResponse,
  type PriceBookRowSummary,
  type PriceBookSummary,
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
  type LineShipmentPoolResponse,
  type ShipmentLabelSummary,
  type ShipmentOperationalUpdateInput,
  type ShipmentPaymentUpdateInput,
  type ShipmentPaymentMethod,
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
  type WarehousePackageStatus,
  type WarehousePackageSummary,
  type WarehousePackageUpdateInput,
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
  type WaterReceiptSummary,
  type WaterReceiptUnmatchInput,
  type WaterReceiptUpdateInput,
  type WaterReceiptVoucherInput,
  type WaterReceiptVoucherSummary
} from '@siyuan/shared';
import { getPasswordStrengthError, hashPassword } from './password.js';
import { PrismaService } from './prisma.service.js';
import {
  allPermissions,
  buildRolePermissionRow,
  defaultPermissionsForRole,
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
    createdAt: row.createdAt.toISOString()
  };
}

function auditModuleFromPath(path: string) {
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
export class PrismaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

  async getShipments(principal: Principal): Promise<Shipment[]> {
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const rows = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? { customer: { salesperson: { in: operatorCustomerScope } } } : {})
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

    return rows.map((row) => this.maskShipmentListFields(principal, { ...mapShipment(row), site: row.customer.salesperson ? salespersonSites.get(row.customer.salesperson) : undefined }));
  }

  async getShipmentStatusCounts(principal: Principal) {
    return summarizeStatusCounts(await this.getShipments(principal));
  }

  async getLineShipmentPool(principal: Principal, query: LineShipmentPoolQuery = {}): Promise<LineShipmentPoolResponse> {
    const allRows = (await this.getShipments(principal)).filter((shipment) => shipment.businessType === 'DEDICATED_LINE');
    return summarizeLineShipmentPool(allRows, query);
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
      this.prisma.agent.findMany({ orderBy: { name: 'asc' } }),
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
        integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
        warehouseAddress1: agent.warehouseAddress1 ?? undefined,
        warehouseAddress2: agent.warehouseAddress2 ?? undefined,
        warehouseAddress3: agent.warehouseAddress3 ?? undefined,
        warehouseContact: agent.warehouseContact ?? undefined,
        invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
        invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
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

  async createCustomer(principal: Principal, input: CustomerCreateInput): Promise<CustomerSummary> {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('客户代码和名称不能为空');
    }
    const code = input.code.trim();
    const existing = await this.prisma.customer.findFirst({ where: { code } });
    if (existing) {
      throw new BadRequestException('客户代码已存在');
    }
    const salesperson = principal.username;
    const customer = await this.prisma.customer.create({
      data: {
        id: `c-${code}`,
        code,
        name: input.name.trim(),
        customerSource: input.customerSource?.trim() || null,
        salesperson,
        defaultSettlementMethod: input.defaultSettlementMethod?.trim() || null
      }
    });
    await this.prisma.customerAccount.create({
      data: { id: `ca-${customer.code}-cny`, customerId: customer.id, balance: 0, currency: 'RMB' }
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
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer.create', target: customer.id, after: JSON.parse(JSON.stringify(summary)) } });
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
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        code,
        name: input.name.trim(),
        customerSource: input.customerSource?.trim() || null,
        salesperson: before?.salesperson ?? principal.username,
        defaultSettlementMethod: input.defaultSettlementMethod?.trim() || null,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
      }
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
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.customer.update', target: id, before: before ? JSON.parse(JSON.stringify(before)) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
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
    const contactCount = await this.prisma.customerContact.count({ where: { customerId, enabled: true } });
    if (contactCount >= 4) {
      throw new BadRequestException('每个客户最多维护四组收货人');
    }
    const contact = await this.prisma.customerContact.create({
      data: {
        customerId,
        name: input.name.trim(),
        company: input.company?.trim() || null,
        phone: input.phone?.trim(),
        email: input.email?.trim(),
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
    const agent = await this.prisma.agent.create({
      data: {
        id: `a-${slug(input.name)}`,
        name: input.name.trim(),
        code: input.code?.trim() || input.name.trim().toUpperCase().slice(0, 6),
        shortName: input.shortName?.trim() || input.name.trim(),
        integrationType: input.integrationType ?? 'MANUAL',
        warehouseAddress1: input.warehouseAddress1?.trim() || null,
        warehouseAddress2: input.warehouseAddress2?.trim() || null,
        warehouseAddress3: input.warehouseAddress3?.trim() || null,
        warehouseContact: input.warehouseContact?.trim() || null,
        invoiceTemplateName: input.invoiceTemplateName?.trim() || null,
        invoiceTemplateUrl: input.invoiceTemplateUrl?.trim() || null
      }
    });
    const summary = {
      id: agent.id,
      code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
      shortName: agent.shortName ?? agent.name,
      name: agent.name,
      integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
      warehouseAddress1: agent.warehouseAddress1 ?? undefined,
      warehouseAddress2: agent.warehouseAddress2 ?? undefined,
      warehouseAddress3: agent.warehouseAddress3 ?? undefined,
      warehouseContact: agent.warehouseContact ?? undefined,
      invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
      invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
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
    const agent = await this.prisma.agent.update({
      where: { id },
      data: {
        name: input.name.trim(),
        code: input.code?.trim() || undefined,
        shortName: input.shortName?.trim() || input.name.trim(),
        integrationType: input.integrationType ?? undefined,
        warehouseAddress1: input.warehouseAddress1?.trim() || null,
        warehouseAddress2: input.warehouseAddress2?.trim() || null,
        warehouseAddress3: input.warehouseAddress3?.trim() || null,
        warehouseContact: input.warehouseContact?.trim() || null,
        invoiceTemplateName: input.invoiceTemplateName?.trim() || null,
        invoiceTemplateUrl: input.invoiceTemplateUrl?.trim() || null,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined
      }
    });
    const summary = {
      id: agent.id,
      code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
      shortName: agent.shortName ?? agent.name,
      name: agent.name,
      integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
      warehouseAddress1: agent.warehouseAddress1 ?? undefined,
      warehouseAddress2: agent.warehouseAddress2 ?? undefined,
      warehouseAddress3: agent.warehouseAddress3 ?? undefined,
      warehouseContact: agent.warehouseContact ?? undefined,
      invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
      invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
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
      integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
      warehouseAddress1: agent.warehouseAddress1 ?? undefined,
      warehouseAddress2: agent.warehouseAddress2 ?? undefined,
      warehouseAddress3: agent.warehouseAddress3 ?? undefined,
      warehouseContact: agent.warehouseContact ?? undefined,
      invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
      invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
      enabled: agent.enabled
    };
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'master_data.agent.update', target: id, before: before ? JSON.parse(JSON.stringify(before)) : undefined, after: JSON.parse(JSON.stringify(summary)) } });
    return summary;
  }

  async createAgentChannel(principal: Principal, input: AgentChannelCreateInput): Promise<AgentChannelSummary> {
    if (!(await this.hasPermission(principal.role, 'master-data:agents:write'))) {
      throw new ForbiddenException('没有代理资料维护权限');
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
      availablePermissions: permissionDefinitions,
      roles: [...missingBuiltins, ...persistedRows].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.label.localeCompare(right.label))
    };
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
        ...(query.site?.trim() ? { site: query.site.trim() } : {}),
        ...(query.status && query.status !== 'ALL' ? { enabled: query.status === 'ENABLED' } : {}),
        ...(keyword
          ? {
              OR: [
                { username: { contains: keyword } },
                { name: { contains: keyword } },
                { nickname: { contains: keyword } },
                { phone: { contains: keyword } },
                { role: { label: { contains: keyword } } }
              ]
            }
          : {})
      },
      include: { role: true },
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
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
      gender: (user.gender as StaffAccountSummary['gender']) ?? undefined,
      nickname: user.nickname ?? undefined,
      site: user.site ?? undefined,
      role: user.role.name as StaffAccountRoleKey,
      roleLabel: user.role.label ?? getRoleMetadata(user.role.name as RoleKey).label,
      enabled: user.enabled,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: lastLoginByUserId.get(user.id),
      createdAt: user.createdAt.toISOString()
    }));
  }

  async getSites(principal: Principal): Promise<SiteSummary[]> {
    this.ensureAdmin(principal, '只有管理员可以查看站点');
    const sites = await this.prisma.site.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return sites.map(mapSite);
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
        enabled: input.enabled !== false
      },
      include: { role: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.create',
        target: `user:${user.id}`,
        after: { username: user.username, role: user.role.name, enabled: user.enabled, ...pickStaffProfile(user), mustChangePassword: user.mustChangePassword }
      }
    });
    return {
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
      gender: (user.gender as StaffAccountSummary['gender']) ?? undefined,
      nickname: user.nickname ?? undefined,
      site: user.site ?? undefined,
      role: user.role.name as StaffAccountRoleKey,
      roleLabel: user.role.label ?? getRoleMetadata(user.role.name as RoleKey).label,
      enabled: user.enabled,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt.toISOString()
    };
  }

  async updateStaffAccount(principal: Principal, id: string, input: StaffAccountUpdateInput): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护员工账号');
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
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
    const data: Record<string, unknown> = {
      ...(username ? { username } : {}),
      ...normalizeStaffProfileUpdate(input),
      ...(roleId ? { roleId } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled === true } : {}),
      ...(password ? { passwordHash: hashPassword(password), mustChangePassword: true } : {})
    };
    const user = await this.prisma.user.update({ where: { id }, data, include: { role: true } });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.update',
        target: `user:${id}`,
        before: { username: existing.username, role: existing.role.name, enabled: existing.enabled, ...pickStaffProfile(existing) },
        after: { username: user.username, role: user.role.name, enabled: user.enabled, ...pickStaffProfile(user), passwordChanged: Boolean(password) }
      }
    });
    return mapStaffAccount(user);
  }

  async updateStaffAccountEnabled(principal: Principal, id: string, input: EnabledUpdateInput): Promise<StaffAccountSummary> {
    this.ensureAdmin(principal, '只有管理员可以启停员工账号');
    if (id === principal.id && input.enabled !== true) {
      throw new BadRequestException('不能停用当前登录账号');
    }
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!existing || !isStaffRoleName(existing.role.name)) {
      throw new NotFoundException('员工账号不存在');
    }
    const user = await this.prisma.user.update({ where: { id }, data: { enabled: input.enabled === true }, include: { role: true } });
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
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!existing || !isStaffRoleName(existing.role.name)) {
      throw new NotFoundException('员工账号不存在');
    }
    const user = await this.prisma.user.update({ where: { id }, data: { enabled: false }, include: { role: true } });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.staff.delete',
        target: `user:${id}`,
        before: { username: existing.username, role: existing.role.name, enabled: existing.enabled, ...pickStaffProfile(existing) },
        after: { username: user.username, role: user.role.name, enabled: user.enabled, ...pickStaffProfile(user) }
      }
    });
    return mapStaffAccount(user);
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
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!existing || !isStaffRoleName(existing.role.name)) {
      throw new NotFoundException('员工账号不存在');
    }
    const site = normalizeOptionalText(input.site, 40);
    const user = await this.prisma.user.update({
      where: { id },
      data: { site },
      include: { role: true }
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
    return {
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
      gender: (user.gender as StaffAccountSummary['gender']) ?? undefined,
      nickname: user.nickname ?? undefined,
      site: user.site ?? undefined,
      role: user.role.name as StaffAccountRoleKey,
      roleLabel: user.role.label ?? getRoleMetadata(user.role.name as RoleKey).label,
      enabled: user.enabled,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt.toISOString()
    };
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
    input: { method: string; path: string; result: 'SUCCESS' | 'FAILED'; durationMs: number; errorMessage?: string }
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: `${auditModuleFromPath(input.path)}.request.${auditKindFromRequest(input.method, input.path)}${input.result === 'FAILED' ? '.failed' : ''}`,
        target: `${input.method.toUpperCase()} ${input.path}`.trim(),
        after: {
          status: input.result,
          durationMs: input.durationMs,
          errorMessage: input.errorMessage
        }
      }
    });
  }

  quote(input: PricingQuoteRequest) {
    return calculateQuote(input);
  }

  async lookupPrice(principal: Principal, input: PriceLookupRequest): Promise<PriceLookupResponse> {
    this.ensureStaffPricingAccess(principal);
    const [books, markupRules] = await Promise.all([
      (this.prisma as any).priceBook.findMany({
        where: { deletedAt: null },
        include: { rows: true },
        orderBy: { importedAt: 'desc' }
      }),
      this.loadAgentMarkupRules()
    ]);
    return createBackendPriceLookup(
      principal,
      input,
      books.flatMap((book: any) => book.rows.map(mapPriceBookRow)),
      books.map(mapPriceBook),
      markupRules
    );
  }

  async getAgentMarkupRules(principal: Principal, query: AgentMarkupListQuery = {}): Promise<AgentMarkupListResponse> {
    this.ensureAdmin(principal, '只有管理员可以查看代理加价规则');
    const [rules, books] = await Promise.all([
      this.loadAgentMarkupRules(true),
      (this.prisma as any).priceBook.findMany({ where: { deletedAt: null }, include: { rows: true } })
    ]);
    return buildAgentMarkupListResponse(rules, books.flatMap((book: any) => book.rows.map(mapPriceBookRow)), query);
  }

  async previewAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupPreviewResponse> {
    this.ensureAdmin(principal, '只有管理员可以查看规则命中线路');
    const [current, books, logs] = await Promise.all([
      (this.prisma as any).agentMarkupRule.findFirst({ where: { id, deletedAt: null } }),
      (this.prisma as any).priceBook.findMany({ where: { deletedAt: null }, include: { rows: true } }),
      this.prisma.auditLog.findMany({ where: { target: id }, orderBy: { createdAt: 'desc' }, take: 5 })
    ]);
    if (!current) {
      throw new NotFoundException('代理加价规则不存在');
    }
    return buildAgentMarkupPreview(mapAgentMarkupRule(current), books.flatMap((book: any) => book.rows.map(mapPriceBookRow)), logs);
  }

  async exportAgentMarkupRules(principal: Principal, query: AgentMarkupListQuery = {}): Promise<AgentMarkupExportResponse> {
    this.ensureAdmin(principal, '只有管理员可以导出代理加价规则');
    const response = await this.getAgentMarkupRules(principal, { ...query, page: 1, pageSize: -1 });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.export', target: 'agent-markup-rules', after: { count: response.rows.length } }
    });
    return { rows: response.rows, exportedAt: new Date().toISOString() };
  }

  async importAgentMarkupRules(principal: Principal, input: { rows?: AgentMarkupCreateInput[] }): Promise<AgentMarkupImportResponse> {
    this.ensureAdmin(principal, '只有管理员可以导入代理加价规则');
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

  async createAgentMarkupRule(principal: Principal, input: AgentMarkupCreateInput): Promise<AgentMarkupSummary> {
    this.ensureAdmin(principal, '只有管理员可以新增代理加价规则');
    const normalized = normalizeAgentMarkupInput(input);
    const priceRows = await this.loadPriceBookRowsForMarkupValidation();
    const currentRules = await this.loadAgentMarkupRules(true);
    validateAgentMarkupRule(normalized, priceRows, currentRules);
    const markupValue = normalized.markupValue ?? normalized.markupPerKg;
    if (!input.agentName?.trim() || !Number.isFinite(markupValue) || markupValue < 0) {
      throw new BadRequestException('代理名称和加价金额不能为空');
    }
    const row = await (this.prisma as any).agentMarkupRule.create({
      data: {
        agentName: normalized.agentName,
        channelName: normalized.channelName ?? null,
        realChannelName: normalized.realChannelName ?? null,
        destinationCountry: normalized.destinationCountry ?? null,
        markupPerKg: normalized.markupPerKg,
        markupType: normalized.markupType,
        markupValue: normalized.markupValue,
        priority: normalized.priority,
        enabled: normalized.enabled
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.create', target: row.id, after: { ...mapAgentMarkupRule(row) } }
    });
    return mapAgentMarkupRule(row);
  }

  async updateAgentMarkupRule(principal: Principal, id: string, input: AgentMarkupUpdateInput): Promise<AgentMarkupSummary> {
    this.ensureAdmin(principal, '只有管理员可以修改代理加价规则');
    const current = await (this.prisma as any).agentMarkupRule.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      throw new NotFoundException('代理加价规则不存在');
    }
    const normalized = normalizeAgentMarkupInput({ ...mapAgentMarkupRule(current), ...input });
    const priceRows = await this.loadPriceBookRowsForMarkupValidation();
    const currentRules = await this.loadAgentMarkupRules(true);
    validateAgentMarkupRule(normalized, priceRows, currentRules, id);
    const row = await (this.prisma as any).agentMarkupRule.update({
      where: { id },
      data: {
        ...(input.agentName !== undefined ? { agentName: normalized.agentName } : {}),
        ...(input.channelName !== undefined ? { channelName: normalized.channelName ?? null } : {}),
        ...(input.realChannelName !== undefined ? { realChannelName: normalized.realChannelName ?? null } : {}),
        ...(input.destinationCountry !== undefined ? { destinationCountry: normalized.destinationCountry ?? null } : {}),
        ...(input.markupPerKg !== undefined || input.markupValue !== undefined || input.markupType !== undefined ? { markupPerKg: normalized.markupPerKg, markupType: normalized.markupType, markupValue: normalized.markupValue } : {}),
        ...(input.priority !== undefined ? { priority: normalized.priority } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {})
      }
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup.update', target: id, before: { ...mapAgentMarkupRule(current) }, after: { ...mapAgentMarkupRule(row) } }
    });
    return mapAgentMarkupRule(row);
  }

  async deleteAgentMarkupRule(principal: Principal, id: string): Promise<AgentMarkupSummary> {
    this.ensureAdmin(principal, '只有管理员可以删除代理加价规则');
    const current = await (this.prisma as any).agentMarkupRule.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      throw new NotFoundException('代理加价规则不存在');
    }
    const deleted = await (this.prisma as any).agentMarkupRule.update({ where: { id }, data: { enabled: false, deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'pricing.markup_rule.delete', target: id, before: { ...mapAgentMarkupRule(current) }, after: { ...mapAgentMarkupRule(deleted) } }
    });
    return mapAgentMarkupRule(deleted);
  }

  async getPriceBooks(principal: Principal): Promise<PriceBooksResponse> {
    this.ensureAdmin(principal, '只有管理员可以查看价格表明细');
    const books = await (this.prisma as any).priceBook.findMany({
      where: { deletedAt: null },
      include: { rows: true },
      orderBy: { importedAt: 'desc' }
    });

    return {
      books: books.map(mapPriceBook),
      rows: books.flatMap((book: any) => book.rows.map(mapPriceBookRow))
    };
  }

  async importPriceBook(principal: Principal, input: PriceBookImportInput): Promise<{ book: PriceBookSummary; rows: PriceBookRowSummary[] }> {
    this.ensureAdmin(principal, '只有管理员可以导入价格表');
    if (!input.fileName?.trim()) {
      throw new BadRequestException('价格表名称不能为空');
    }
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      throw new BadRequestException('价格表没有可导入的报价行');
    }
    input.rows.forEach((row, index) => {
      if (!row.agentName?.trim() || !row.channelName?.trim() || !row.destinationCountry?.trim() || !Number.isFinite(row.minWeightKg) || !Number.isFinite(row.maxWeightKg) || !Number.isFinite(row.costPerKg) || row.maxWeightKg <= row.minWeightKg || row.costPerKg <= 0) {
        throw new BadRequestException(`第 ${index + 1} 行报价数据不完整`);
      }
    });

    const created = await (this.prisma as any).priceBook.create({
      data: {
        fileName: input.fileName.trim(),
        rows: {
          create: input.rows.map((row) => ({
            agentName: row.agentName.trim(),
            carrierName: row.carrierName?.trim() || null,
            sourceSheetName: row.sourceSheetName?.trim() || null,
            channelName: row.channelName.trim(),
            businessRouteName: row.businessRouteName?.trim() || null,
            realChannelName: row.realChannelName?.trim() || row.channelName.trim(),
            warehouseCode: row.warehouseCode?.trim() || null,
            destinationCountry: row.destinationCountry.trim(),
            minWeightKg: row.minWeightKg,
            maxWeightKg: row.maxWeightKg,
            costPerKg: row.costPerKg,
            currency: row.currency?.trim().toUpperCase() || 'RMB',
            transitDays: row.transitDays ?? null,
            transitLabel: row.transitLabel?.trim() || null,
            quoteSourceType: row.quoteSourceType ?? 'local',
            surchargeFee: row.surchargeFee ?? null,
            surchargeDetails: row.surchargeDetails ?? [],
            productSurchargeRemark: row.productSurchargeRemark?.trim() || null,
            specialRemark: row.specialRemark?.trim() || null
          }))
        }
      },
      include: { rows: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.import',
        target: created.id,
        after: { fileName: created.fileName, rowCount: created.rows.length }
      }
    });
    return { book: mapPriceBook(created), rows: created.rows.map(mapPriceBookRow) };
  }

  async updatePriceBookRemark(principal: Principal, id: string, input: PriceBookRemarkUpdateInput): Promise<PriceBookSummary> {
    this.ensureAdmin(principal, '只有管理员可以维护价格表备注');
    const current = await (this.prisma as any).priceBook.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      throw new NotFoundException('价格表不存在');
    }
    const updated = await (this.prisma as any).priceBook.update({
      where: { id },
      data: { remark: input.remark?.trim() || null },
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
    return mapPriceBook(updated);
  }

  async deletePriceBook(principal: Principal, id: string): Promise<PriceBookSummary> {
    this.ensureAdmin(principal, '只有管理员可以删除价格表');
    const current = await (this.prisma as any).priceBook.findFirst({ where: { id, deletedAt: null }, include: { rows: true } });
    if (!current) {
      throw new NotFoundException('价格表不存在');
    }
    const deleted = await (this.prisma as any).priceBook.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: { rows: true }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'pricing.price_book.delete',
        target: id,
        before: { fileName: current.fileName, rowCount: current.rows.length },
        after: { deletedAt: deleted.deletedAt }
      }
    });
    return mapPriceBook(deleted);
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

  async getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    const rows = await (this.prisma as any).warehousePackage.findMany({ orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }] });
    return rows.map(mapWarehousePackage);
  }

  async getWarehouseTodayReceipts(principal: Principal, query: WarehouseTodayQuery): Promise<WarehouseTodayResponse> {
    if (!(await this.hasPermission(principal.role, 'warehouse:read'))) {
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
    const summaries: WarehousePackageSummary[] = rows.map(mapWarehousePackage);
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
    if (!(await this.hasPermission(principal.role, 'warehouse:read'))) {
      throw new ForbiddenException('当前角色不能查看在仓数据');
    }
    const salesScope = this.operatorCustomerScope(principal);
    const where: any = { status: { notIn: ['CONSOLIDATED', 'SHIPPED'] } };
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
    const summaries: WarehousePackageSummary[] = rows.map(mapWarehousePackage);
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

  async getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]> {
    const packages = await this.getWarehousePackages(principal);
    return summarizeWarehousePackageGroups(packages);
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
    return mapWarehousePackage(created);
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
    return {
      sourcePackage: sourceSummary,
      packages: created.map(mapWarehousePackage)
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
    return mapWarehousePackage(updated);
  }

  async updateWarehousePackage(principal: Principal, id: string, input: WarehousePackageUpdateInput): Promise<WarehousePackageSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehousePackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('仓库包裹不存在');
    }
    const packageCount = input.packageCount === undefined ? Number(existing.packageCount) : Math.max(1, Math.floor(Number(input.packageCount) || 1));
    const weightKg = input.weightKg === undefined ? Number(existing.weightKg) : roundMoney(Number(input.weightKg) || 0);
    const lengthCm = input.lengthCm === undefined ? Number(existing.lengthCm) : roundMoney(Number(input.lengthCm) || 0);
    const widthCm = input.widthCm === undefined ? Number(existing.widthCm) : roundMoney(Number(input.widthCm) || 0);
    const heightCm = input.heightCm === undefined ? Number(existing.heightCm) : roundMoney(Number(input.heightCm) || 0);
    const cbm = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 1000000);
    const volumetricWeightKg = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 6000);
    const updated = await (this.prisma as any).warehousePackage.update({
      where: { id },
      data: {
        packageCount,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        cbm,
        volumetricWeightKg,
        chargeableWeightKg: roundMoney(Math.max(weightKg, volumetricWeightKg)),
        ...(input.scanTime !== undefined ? { scanTime: input.scanTime ? new Date(input.scanTime) : null } : {}),
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
    return mapWarehousePackage(updated);
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

  async getWarehouseConsolidationItems(principal: Principal, id: string): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    const items = await (this.prisma as any).warehouseConsolidationItem.findMany({
      where: { consolidationId: id },
      include: { package: true },
      orderBy: { id: 'asc' }
    });
    return items.map((item: any) => mapWarehousePackage(item.package));
  }

  async getWarehouseTallyTasks(principal: Principal, query: WarehouseTallyTaskListQuery = {}): Promise<WarehouseTallyTaskSummary[]> {
    if (!(await this.hasPermission(principal.role, 'warehouse:read'))) {
      throw new ForbiddenException('当前角色不能查看理货任务');
    }
    const scope = this.operatorCustomerScope(principal);
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.customerCode?.trim()) {
      where.customerCode = { contains: query.customerCode.trim(), mode: 'insensitive' };
    }
    if (query.combinedOrderNo?.trim()) {
      where.sourceCombinedOrderNo = { contains: query.combinedOrderNo.trim(), mode: 'insensitive' };
    }
    if (scope) {
      where.salesperson = { in: scope };
    }
    const rows = await (this.prisma as any).warehouseTallyTask.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }]
    });
    return rows.map(mapWarehouseTallyTask);
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
      where: { id: { in: packageIds }, status: { notIn: ['CONSOLIDATED', 'SHIPPED'] } },
      orderBy: [{ createdAt: 'asc' }]
    });
    if (packages.length !== packageIds.length) {
      throw new BadRequestException('部分包裹不存在、已合票或已出库，不能发起理货');
    }
    const summaries: WarehousePackageSummary[] = packages.map(mapWarehousePackage);
    const first = summaries[0];
    const taskNo = await this.nextWarehouseTallyTaskNo(first.combinedOrderNo);
    const totalPackageCount = summaries.reduce((sum, pkg) => sum + pkg.packageCount, 0);
    const totalWeightKg = roundMoney(summaries.reduce((sum, pkg) => sum + pkg.weightKg * pkg.packageCount, 0));
    const totalVolumetricWeightKg = roundMoney(summaries.reduce((sum, pkg) => sum + (pkg.totalVolumetricWeightKg ?? pkg.volumetricWeightKg), 0));
    const totalVolumetricWeightKg5000 = roundMoney(summaries.reduce((sum, pkg) => sum + (pkg.totalVolumetricWeightKg5000 ?? pkg.volumetricWeightKg5000 ?? 0), 0));
    const created = await (this.prisma as any).warehouseTallyTask.create({
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
    const summary = mapWarehouseTallyTask(created);
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'warehouse.tally.create', target: created.id, after: toAuditJson(summary) }
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
    return mapWarehouseTallyTask(updated);
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
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.tally.complete',
        target: id,
        before: toAuditJson(mapWarehouseTallyTask(existing)),
        after: toAuditJson(mapWarehouseTallyTask(updated))
      }
    });
    return mapWarehouseTallyTask(updated);
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
    const labelNo = before.labelNo ?? `${before.taskNo}-LBL`;
    const labelQrContent = buildWarehouseTallyLabelQrContent(before, labelNo);
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
    return mapWarehouseTallyTask(updated);
  }

  async printWarehouseTallyTaskLabel(principal: Principal, id: string): Promise<WarehouseTallyTaskSummary> {
    return this.markWarehouseTallyTaskLabelOutput(principal, id, 'print');
  }

  async downloadWarehouseTallyTaskLabel(principal: Principal, id: string): Promise<WarehouseTallyTaskSummary> {
    return this.markWarehouseTallyTaskLabelOutput(principal, id, 'download');
  }

  private async markWarehouseTallyTaskLabelOutput(principal: Principal, id: string, action: 'print' | 'download'): Promise<WarehouseTallyTaskSummary> {
    this.ensureWarehouseAccess(principal);
    const existing = await (this.prisma as any).warehouseTallyTask.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('理货任务不存在');
    }
    const before = mapWarehouseTallyTask(existing);
    if (!before.labelNo || !before.labelQrContent || before.labelStatus !== 'GENERATED') {
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
    return mapWarehouseTallyTask(updated);
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
    const rows = await (this.prisma as any).waterReceipt.findMany({
      where: {
        ...(canViewAll || principal.role === 'ADMIN' || ['FINANCE', 'UG_FINANCE'].includes(principal.role) ? {} : { salesperson: principal.username }),
        ...(query.status && query.status !== 'ALL' ? { status: query.status } : query.includeArchived ? {} : { status: { notIn: ['ARCHIVED', 'VOIDED'] } })
      },
      include: this.waterReceiptInclude(),
      orderBy: { receiptDate: 'desc' }
    });
    return this.buildWaterReceiptListResponse(rows.map((row: any) => this.toWaterReceiptSummary(row)), query);
  }

  async createWaterReceipt(principal: Principal, input: WaterReceiptCreateInput): Promise<WaterReceiptSummary> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:manage');
    const customer = await this.findCustomerForWaterReceipt(input.customerId, input.customerCode);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('水单金额必须大于 0');
    const receiptDate = new Date(input.receiptDate);
    if (Number.isNaN(receiptDate.getTime())) throw new BadRequestException('到账日期无效');
    const receiptNo = await this.nextWaterReceiptNo(receiptDate);
    const created = await (this.prisma as any).waterReceipt.create({
      data: {
        receiptNo,
        site: input.site?.trim() || '思远收款',
        customerId: customer?.id,
        customerCode: customer?.code ?? input.customerCode,
        customerName: customer ? `${customer.code}-${customer.name}` : undefined,
        salesperson: customer?.salesperson,
        receiptMethod: input.receiptMethod ?? '账户收款',
        receiptDate,
        currency: input.currency ?? 'RMB',
        amount,
        balance: amount,
        paymentNo: input.paymentNo,
        remark: input.remark,
        status: 'PENDING'
      },
      include: this.waterReceiptInclude()
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.create', target: created.id, after: created } });
    return this.toWaterReceiptSummary(created);
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
    const updated = await (this.prisma as any).waterReceipt.update({
      where: { id },
      data: {
        ...(customer ? { customerId: customer.id, customerCode: customer.code, customerName: `${customer.code}-${customer.name}`, salesperson: customer.salesperson } : {}),
        ...(input.site !== undefined ? { site: input.site?.trim() || '思远收款' } : {}),
        ...(input.receiptMethod !== undefined ? { receiptMethod: input.receiptMethod } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.receiptDate ? { receiptDate: new Date(input.receiptDate) } : {}),
        ...(input.amount !== undefined ? { amount: nextAmount, balance: roundMoney(nextAmount - matchedAmount), adjustReason: input.adjustReason } : {}),
        ...(input.paymentNo !== undefined ? { paymentNo: input.paymentNo } : {}),
        ...(input.remark !== undefined ? { remark: input.remark } : {})
      },
      include: this.waterReceiptInclude()
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.update', target: id, before: current, after: updated } });
    return this.toWaterReceiptSummary(updated);
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
    return this.toWaterReceiptSummary(updated);
  }

  async getWaterReceiptMatchableReceivables(principal: Principal, id: string): Promise<ReceivableAuditSummary[]> {
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:read');
    const receipt = await this.findWaterReceiptById(id);
    if (!receipt.customerId) return [];
    const rows = await (this.prisma as any).shipmentFinanceItem.findMany({
      where: {
        type: 'RECEIVABLE',
        voided: false,
        reconciliationStatus: 'CONFIRMED',
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
    if (!['ARRIVED', 'PARTIAL_MATCHED', 'MATCHED'].includes(receipt.status)) throw new BadRequestException('只有已到账水单可以匹配订单');
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
      if (item.voided || item.reconciliationStatus !== 'CONFIRMED') throw new BadRequestException('只能匹配已审核且未作废的应收');
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
        await (tx as any).waterReceiptMatch.create({ data: { waterReceiptId: id, receivableFinanceItemId: item.id, shipmentId: item.shipmentId, amount, createdAt: matchedAt } });
        await (tx as any).shipmentFinanceItem.update({
          where: { id: item.id },
          data: {
            receivedAmount: nextReceived,
            receiptStatus: nextReceived >= Number(item.amount) ? 'RECEIVED' : 'PARTIAL',
            receivedAt: nextReceived >= Number(item.amount) ? new Date() : item.receivedAt,
            paymentNo: receipt.receiptNo
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
            matchedAmountDelta: totalMatch,
            receiptBalanceBefore: Number(receipt.balance),
            receiptBalanceAfter: nextBalance,
            accountBalanceBefore,
            accountBalanceAfter,
            customerAccountBalance: accountBalanceAfter
          } as any
        }
      });
      return row;
    });
    return this.toWaterReceiptSummary(updated);
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
          data: { receivedAmount: nextReceived, receiptStatus: nextReceived <= 0 ? 'UNPAID' : 'PARTIAL', receivedAt: nextReceived <= 0 ? null : item.receivedAt }
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
    return this.toWaterReceiptSummary(updated);
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
    await this.ensureWaterReceiptPermission(principal, 'finance:water-receipt:voucher');
    if (!input.fileName?.trim()) throw new BadRequestException('水单凭证文件名不能为空');
    await this.findWaterReceiptById(id);
    const row = await (this.prisma as any).waterReceiptVoucher.upsert({
      where: { waterReceiptId: id },
      update: { fileName: input.fileName.trim(), mimeType: input.mimeType, sizeBytes: input.sizeBytes, url: input.url, uploadedBy: principal.username },
      create: { waterReceiptId: id, fileName: input.fileName.trim(), mimeType: input.mimeType, sizeBytes: input.sizeBytes, url: input.url, uploadedBy: principal.username }
    });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.water_receipt.voucher', target: id, after: row } });
    return this.toWaterReceiptVoucherSummary(row);
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
      throw new BadRequestException('该应付已支付，请先在待支付/已支付模块反核销');
    }
    if (activePaymentItem?.paymentApplication?.status === 'WAITING_PAYMENT') {
      await this.cancelPaymentApplication(principal, activePaymentItem.paymentApplication.id, { reason: '应付反审核自动撤回待支付申请' });
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
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id },
      data: { voided: true, reconciliationStatus: 'VOIDED', voidedAt: new Date() },
      include: this.payableAuditInclude()
    });
    await this.prisma.auditLog.create({
      data: { actorId: principal.id, action: 'finance.payable.void', target: id, before: current, after: updated }
    });
    return this.toPayableAuditSummary(updated, { canViewSensitivePayable, canViewProfit });
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
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payable.batch_void', target: `payables:${(input.ids ?? []).join(',')}`, after: JSON.parse(JSON.stringify(result)) } });
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
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment.bank.save', target: created.id, after: created } });
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
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payment.bank.use_once', target: created.id, after: created } });
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
      this.assertPayeeBankMatchesPending(bank, [summary]);
      const key = `${summary.agentName ?? '未指定代理'}|${bank?.bankAccountNo ?? 'NO_BANK'}|${summary.currency}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    const created: PaymentApplicationSummary[] = [];
    for (const rows of groups.values()) {
      const first = this.toPendingPaymentSummary(rows[0]);
      const bank = selectedBank ?? rows[0].payeeBankAccount;
      const totalAmount = rows.reduce((sum: number, row: any) => sum + Number(row.amount), 0);
      const applicationNo = await this.nextPaymentApplicationNo();
      const application = await (this.prisma as any).paymentApplication.create({
        data: {
          applicationNo,
          agentName: first.agentName ?? '未指定代理',
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
    await this.ensurePayablePermission(principal, 'finance:payable:paid-read');
    const canViewBank = await this.hasPermission(principal.role, 'finance:payable:paid-bank-view');
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
    await this.ensurePayablePermission(principal, 'finance:payable:paid-confirm');
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
    return this.toPaidPaymentSummary(enriched, await this.hasPermission(principal.role, 'finance:payable:paid-bank-view'));
  }

  async updatePaidPayment(principal: Principal, id: string, input: PaidPaymentUpdateInput): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-confirm');
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
    return this.toPaidPaymentSummary(enriched, await this.hasPermission(principal.role, 'finance:payable:paid-bank-view'));
  }

  async reversePaidPayment(principal: Principal, id: string, input: PaidPaymentReverseInput = {}): Promise<PaidPaymentSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-reverse');
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
    return this.toPaidPaymentSummary(enriched, await this.hasPermission(principal.role, 'finance:payable:paid-bank-view'));
  }

  async exportPaidPayments(principal: Principal, input: PaidPaymentExportRequest): Promise<PaidPaymentExportResponse> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-export');
    const response = await this.getPaidPayments(principal, { ...(input.query ?? {}), page: 1, pageSize: -1 });
    const allRows = response.rows;
    const rows = input.ids?.length ? allRows.filter((row) => input.ids?.includes(row.id)) : allRows;
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.paid_payment.export', target: input.ids?.join(',') ?? 'query', after: JSON.parse(JSON.stringify({ count: rows.length, query: input.query })) } });
    return { rows, exportedAt: new Date().toISOString() };
  }

  async addPaymentWaterReceipt(principal: Principal, input: PaymentWaterReceiptInput): Promise<PaymentVoucherSummary> {
    await this.ensurePayablePermission(principal, 'finance:payable:paid-voucher');
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

  async getAgentBankAccounts(principal: Principal, query: { agentName?: string; agentId?: string } = {}): Promise<AgentBankAccountSummary[]> {
    await this.ensurePayablePermission(principal, 'finance:payable:bank');
    const rows = await (this.prisma as any).agentBankAccount.findMany({
      where: {
        enabled: true,
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
      enabled: true
    };
    if (!data.agentName || !data.accountName || !data.bankName || !data.bankAccountNo) {
      throw new BadRequestException('代理、户名、银行和账号不能为空');
    }
    const created = await (this.prisma as any).agentBankAccount.create({ data });
    await this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'finance.payable.bank.save', target: created.id, after: created } });
    return this.toAgentBankAccountSummary(created);
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
    const salesScope = this.operatorCustomerScope(principal);
    const canViewOwnOrderPayables = Boolean(salesScope && (
      ((shipment as any).entryBy && salesScope.includes((shipment as any).entryBy))
      || (shipment.customer.salesperson && salesScope.includes(shipment.customer.salesperson))
    ));
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
        status: { in: ['DRAFT', 'REVIEW_PENDING'] as ShipmentStatus[] },
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? scopedOwnerWhere : {})
      } as any,
      include: shipmentIncludes,
      orderBy: { createdAt: 'asc' }
    });
    return rows.map(mapShipment);
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
    if (shipment.deletedAt && !(await this.hasPermission(principal.role, 'orders:review:restore'))) {
      throw new NotFoundException('运单不存在');
    }
    return this.buildShipmentReviewDetail(principal, shipment);
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
    const canBusinessReview = Boolean(this.operatorCustomerScope(principal)) || (principal.role === 'ADMIN' && options.businessReview === true);
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
          latestTracking: '业务员自审通过，进入待排货',
          trackingStaleDays: 0,
          trackingEvents: { create: { status: '业务员自审通过，进入待排货', happenedAt: new Date(), visibleToCustomer: true } }
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
    if (!isFinalReviewRole(principal.role)) {
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
        latestTracking: `审核驳回：${reason}`,
        trackingStaleDays: 0,
        trackingEvents: { create: { status: `审核驳回：${reason}`, happenedAt: new Date(), visibleToCustomer: true } }
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
      || (operatorCustomerScope && !operatorCustomerScope.includes((shipment as any).entryBy ?? shipment.customer.salesperson ?? ''))
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
    return { ...detailBeforeDelete, shipment: mapShipment(updated) };
  }

  async restoreShipment(principal: Principal, shipmentId: string, input: ReviewRestoreInputWithManual = {}): Promise<ShipmentReviewDetailSummary> {
    if (!(await this.hasPermission(principal.role, 'orders:review:restore'))) {
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
    return this.buildShipmentReviewDetail(principal, updated);
  }

  async permanentlyDeleteShipmentReview(principal: Principal, shipmentId: string): Promise<{ id: string; deleted: true }> {
    if (!(await this.hasPermission(principal.role, 'orders:review:purge'))) {
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

    return { id: shipmentId, deleted: true };
  }

  async createShipmentFinanceItem(principal: Principal, shipmentId: string, input: ShipmentFinanceItemCreateInput) {
    await this.ensureFinanceItemManageAccess(principal, input.type);
    this.validateFinanceItemInput(input.type, input);
    const shipment = await this.getVisibleShipment(principal, shipmentId);
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
    await this.createBusinessCostChangeNotificationAudit(principal, input.type, shipment, null, item);
    return this.toFinanceItemSummary(item, shipment);
  }

  async getOrderEntryWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    this.ensureOrderEntryAccess(principal);
    const where: any = { shipmentId: null, systemOrderNo: null };
    const scope = this.operatorCustomerScope(principal);
    if (scope) {
      const customers = await this.prisma.customer.findMany({
        where: { salesperson: { in: scope } },
        select: { code: true }
      });
      where.customerCode = { in: customers.map((customer) => customer.code) };
    }
    const rows = await (this.prisma as any).warehousePackage.findMany({
      where,
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    return rows.map(mapWarehousePackage);
  }

  async createOrderEntry(principal: Principal, input: OrderEntryCreateInput): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    if (input.shipment.transferNo?.trim()) {
      throw new BadRequestException('录单阶段不能填写转单号，请在出库后完成双审核再填写');
    }
    const normalized = await this.prepareOrderEntryInput(principal, input);
    const now = new Date();
    const entryAt = this.resolveOrderEntryEntryAt(principal, normalized.shipment.entryAt, now);
    const status = input.submitForReview ? 'REVIEW_PENDING' : 'DRAFT';
    const latestTracking = input.submitForReview ? '财务录单创建，待审核' : '财务录单保存草稿';
    const systemOrderNo = normalized.shipment.systemOrderNo?.trim() || (await this.nextSystemOrderNo(normalized.shipment.businessType, now));
    if (await this.prisma.shipment.findUnique({ where: { systemOrderNo } })) {
      throw new BadRequestException(`运单号 ${systemOrderNo} 已存在，请更换后再提交`);
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
          latestTracking,
          trackingStaleDays: 0,
          isRemoteArea: false,
          draftWarehousePackageIds: input.submitForReview ? [] : normalized.packageIds,
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
          events: { create: { toStatus: status, note: input.submitForReview ? '录单提交审核' : '录单保存草稿' } },
          trackingEvents: { create: { status: latestTracking, happenedAt: now } }
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

    return this.getOrderEntryDetail(principal, created.id);
  }

  async getOrderEntryDetail(principal: Principal, shipmentId: string): Promise<OrderEntryDetailSummary> {
    this.ensureOrderEntryAccess(principal);
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
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
    return {
      shipment: mappedShipment,
      packages: packages.map(mapWarehousePackage),
      receivables: financeItems
        .filter((item) => item.type === 'RECEIVABLE')
        .map((item) => this.toReceivableFinanceSummary(item, shipment, mappedShipment.customerName)),
      businessCosts: financeItems
        .filter((item) => item.type === 'BUSINESS_COST')
        .map((item) => this.toBusinessCostFinanceSummary(item, shipment)),
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
    const current = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, deletedAt: null },
      include: { ...shipmentIncludes, financeItems: { where: { voided: false } } }
    });
    if (!current) {
      throw new NotFoundException('录单草稿不存在');
    }
    if (!['DRAFT', 'REVIEW_REJECTED'].includes(current.status)) {
      throw new BadRequestException('只有草稿或退回修改的录单可以继续编辑');
    }
    const normalized = await this.prepareOrderEntryInput(principal, input, current.id);
    const now = new Date();
    const entryAt = this.resolveOrderEntryEntryAt(principal, normalized.shipment.entryAt, current.entryAt ?? current.createdAt ?? now);
    const nextStatus = input.submitForReview ? 'REVIEW_PENDING' : 'DRAFT';
    const latestTracking = input.submitForReview ? '财务录单提交审核' : '财务录单草稿已更新';
    const nextSystemOrderNo = normalized.shipment.systemOrderNo?.trim() || current.systemOrderNo;
    const duplicated = await this.prisma.shipment.findUnique({ where: { systemOrderNo: nextSystemOrderNo } });
    if (duplicated && duplicated.id !== current.id) {
      throw new BadRequestException(`运单号 ${nextSystemOrderNo} 已存在，请更换后再提交`);
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
          latestTracking,
          draftWarehousePackageIds: input.submitForReview ? [] : normalized.packageIds,
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
      await tx.trackingEvent.create({
        data: { shipmentId: current.id, status: latestTracking, happenedAt: now, visibleToCustomer: false }
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

    return this.getOrderEntryDetail(principal, current.id);
  }

  async updateShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string, input: ShipmentFinanceItemUpdateInput) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const current = await this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, current.type);
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
    await this.createBusinessCostChangeNotificationAudit(principal, current.type, shipment, current, updated);
    return this.toFinanceItemSummary(updated, shipment);
  }

  async deleteShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const current = await this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, current.type);
    if (current.voided) {
      throw new BadRequestException('费用已作废');
    }
    if (current.locked) {
      throw new BadRequestException('费用已锁定，请先解锁');
    }
    this.ensureBusinessCostEditableAfterDispatch(principal, current.type, shipment);
    const updated = await (this.prisma as any).shipmentFinanceItem.update({
      where: { id: current.id },
      data: { voided: true, reconciliationStatus: 'VOIDED', voidedAt: new Date() }
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.finance_item.void',
        target: updated.id,
        before: current,
        after: updated
      }
    });
    await this.createBusinessCostChangeNotificationAudit(principal, current.type, shipment, current, updated);
    return this.toFinanceItemSummary(updated, shipment);
  }

  async lockShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const current = await this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, current.type);
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
    return this.toFinanceItemSummary(updated, shipment);
  }

  async unlockShipmentFinanceItem(principal: Principal, shipmentId: string, feeId: string) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const current = await this.findFinanceItem(shipment.id, feeId);
    await this.ensureFinanceItemManageAccess(principal, current.type);
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
        : input.systemOrderNo?.trim() || (await this.nextSystemOrderNo(input.businessType, now));
    const requestedWarehousePackageIds = Array.from(
      new Set([...(input.warehousePackageIds ?? []), ...(input.draftWarehousePackageIds ?? [])].map((id) => id.trim()).filter(Boolean))
    );
    const shouldBindWarehousePackages = input.bindWarehousePackages ?? Boolean((input.warehousePackageIds ?? []).length);
    const warehousePackageIdsToBind = shouldBindWarehousePackages ? requestedWarehousePackageIds : [];
    const draftWarehousePackageIds = shouldBindWarehousePackages ? [] : requestedWarehousePackageIds;
    if (requestedWarehousePackageIds.length) {
      const packages = await this.prisma.warehousePackage.findMany({
        where: { id: { in: requestedWarehousePackageIds } },
        select: { id: true, shipmentId: true, systemOrderNo: true }
      });
      if (packages.length !== requestedWarehousePackageIds.length) {
        throw new BadRequestException('部分仓库包裹不存在');
      }
      const boundPackage = shouldBindWarehousePackages ? packages.find((pkg) => pkg.shipmentId || pkg.systemOrderNo) : undefined;
      if (boundPackage) {
        throw new BadRequestException('选中的仓库包裹已绑定运单，请重新选择待录单包裹');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          customerId,
          channelId: input.channelId,
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
          latestTracking,
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
          events: { create: { toStatus: initialStatus, note: this.isReviewPendingStatus(initialStatus) ? '创建出货订单' : '创建预报' } },
          trackingEvents: { create: { status: latestTracking, happenedAt: now } }
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
    if (!canTransitionShipment(shipment.status as ShipmentStatus, 'WAITING_DISPATCH')) {
      throw new BadRequestException('当前状态不允许排货');
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

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).shipmentFinanceItem.updateMany({
        where: { shipmentId: shipment.id, type: 'PAYABLE', name: '代理成本', voided: false, locked: false },
        data: { voided: true, voidedAt: new Date(routedAt) }
      });
      await (tx as any).shipmentFinanceItem.create({
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

    const updated = await this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'WAITING_DISPATCH', '排货');
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'shipment.route',
        target: shipment.id,
        before: {
          status: shipment.status,
          channelId: shipment.channelId,
          agentId: shipment.agentId
        },
        after: {
          status: updated.status,
          routeStatus: 'WAITING_DISPATCH',
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
    const warehousePackageIds = warehousePackages.map((pkg: any) => pkg.id);
    const handoverNo = `HD-${shipment.systemOrderNo}`;
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
    return updated;
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
    return { ...mapShipment(updatedRow), routeReturnedAt: returnedAt };
  }

  async approveShipmentBusinessData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以审核业务数据');
    }
    if (!['WAITING_DISPATCH', 'OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'].includes(shipment.status)) {
      throw new BadRequestException('排货后才能审核业务数据');
    }
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
    return mapped;
  }

  async approveShipmentAgentData(principal: Principal, shipmentId: string, body: { remark?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
      throw new ForbiddenException('只有客服或管理员可以审核代理数据');
    }
    if (!['WAITING_DISPATCH', 'OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'].includes(shipment.status)) {
      throw new BadRequestException('排货后才能审核代理数据');
    }
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
    return mapped;
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

    if (transferNo && transferNo !== shipment.transferNo) {
      if (!['ADMIN', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role)) {
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
    if (currentStatus !== 'SIGNED' && nextStatus === 'SIGNED') {
      const salesperson = shipment.customer?.salesperson;
      if (principal.role !== 'ADMIN' && (!salesperson || salesperson !== principal.username)) {
        await this.recordPermissionDenied(principal, { permissions: ['customer_service:signature:confirm'], method: 'PATCH', path: `/api/shipments/${shipmentId}/operational` });
        throw new ForbiddenException('只能由订单归属业务员确认签收');
      }
    }
    if (nextStatus === 'DEPARTED' && (!(etaAt ?? shipment.etaAt) || !(etdAt ?? shipment.etdAt))) {
      throw new BadRequestException('确认离港前必须填写 ETA 和 ETD');
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
                  visibleToCustomer: true
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
    if (currentStatus !== nextStatus) {
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
            changedBy: principal.username
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
            transferNo: mapped.transferNo
          })
        }
      });
    }
    if (currentStatus === 'OUTBOUNDED' && nextStatus === 'WAITING_DEPARTURE' && mapped.transferNo) {
      await this.ensureCarrierTask(mapped.id, mapped.carrier, mapped.transferNo);
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

    const updated: Shipment[] = [];
    for (const item of request.updates) {
      const shipment = await this.getVisibleShipment(principal, item.shipmentId);
      const latestTracking = item.latestTracking?.trim();
      if (!latestTracking) {
        throw new BadRequestException('最新轨迹不能为空');
      }
      const happenedAt = this.parseTrackingDate(item.trackingDate);
      const row = await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          latestTracking,
          trackingStaleDays: 0,
          trackingEvents: {
            create: {
              status: latestTracking,
              happenedAt,
              visibleToCustomer: true
            }
          }
        },
        include: shipmentIncludes
      });
      await this.createEvent(shipment.id, shipment.status as ShipmentStatus, shipment.status as ShipmentStatus, `批量添加轨迹：${latestTracking}`);
      updated.push(mapShipment(row));
    }

    return { updated };
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
    return mapShipment(deleted);
  }

  async getCarrierTasks(principal: Principal): Promise<CarrierTaskSummary[]> {
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
    return tasks.map(mapCarrierTask);
  }

  async runCarrierTask(principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    const task = await this.prisma.carrierTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    await this.getVisibleShipment(principal, task.shipmentId);
    return this.executeCarrierTask(taskId, body.fail === true);
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
    return this.executeCarrierTask(taskId, body.fail === true);
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
    await this.ensureTransferDataApproved(principal, shipment.id);
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
    await this.prisma.trackingEvent.create({
      data: { shipmentId: shipment.id, status: '已生成面单', happenedAt: now, visibleToCustomer: true }
    });
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { transferNo, latestTracking: '已生成面单', trackingStaleDays: 0 },
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

    return { label: mapShipmentLabel(label), shipment: mapShipment(updated) };
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
    return { label: mapShipmentLabel(label), shipment: mapShipment(updated) };
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
        data: { transferNo: null, latestTracking: '面单已作废', trackingStaleDays: 0 }
      });
      await this.prisma.trackingEvent.create({
        data: { shipmentId: shipment.id, status: '面单已作废', happenedAt: now, visibleToCustomer: false }
      });
    }

    return mapShipmentLabel(updatedLabel);
  }

  async addTrackingEvent(principal: Principal, shipmentId: string, input: TrackingEventInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status: input.status,
        happenedAt: new Date(input.happenedAt),
        visibleToCustomer: input.visibleToCustomer ?? true
      }
    });

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { latestTracking: input.status, trackingStaleDays: 0 },
      include: shipmentIncludes
    });

    return mapShipment(updated);
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

    return (await this.getProblemTickets(principal)).find((item) => item.id === ticketId)!;
  }

  async closeProblemTicket(principal: Principal, ticketId: string): Promise<ProblemTicketSummary> {
    const ticket = await this.getVisibleProblemTicket(principal, ticketId);
    const closedAt = new Date();
    await this.prisma.problemTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt }
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
    const approval = await this.prisma.auditLog.findFirst({
      where: {
        target: shipmentId,
        action: 'customer_service.business_data.approved'
      }
    });
    const missing = approval ? [] : ['business_data'];
    if (missing.length === 0) return;
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'workflow.guard_denied',
        target: shipmentId,
        after: toAuditJson({ guard: 'transferNo.requires_data_approval', missing })
      }
    });
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

  private canViewOrderEntryPayables(principal: Principal) {
    return ['ADMIN', 'FINANCE', 'UG_FINANCE', 'OPERATOR', 'UG_BUSINESS', 'UG_MARKET', 'CUSTOMER_SERVICE', 'UG_CUSTOMER_SERVICE'].includes(principal.role);
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
    if (!this.canUseSensitiveOrderEntryPayables(principal) && rawPayables.some((row) => row.agentName?.trim() || row.paymentNo?.trim())) {
      throw new ForbiddenException('当前角色不能录入代理或付款敏感信息');
    }
    const payables = this.normalizeOrderEntryFinanceItems('PAYABLE', rawPayables);
    if (!this.canViewOrderEntryPayables(principal) && payables.length) {
      throw new ForbiddenException('当前角色不能录入应付费用');
    }
    const channel = shipment.channelId?.trim()
      ? await this.prisma.channel.findFirst({ where: { id: shipment.channelId.trim(), enabled: true } })
      : shipment.receivingChannel?.trim()
        ? await this.prisma.channel.findFirst({ where: { name: shipment.receivingChannel.trim(), enabled: true } })
        : null;
    if (input.submitForReview) {
      this.validateOrderEntryRequiredFields(input, packageIds, receivables, businessCosts);
    }
    const totals = packages.reduce(
      (summary: { packageCount: number; weightKg: number; cbm: number; chargeWeightKg: number }, pkg: any) => ({
        packageCount: summary.packageCount + Number(pkg.packageCount ?? 0),
        weightKg: summary.weightKg + Number(pkg.weightKg ?? 0),
        cbm: summary.cbm + Number(pkg.cbm ?? 0),
        chargeWeightKg: summary.chargeWeightKg + Number(pkg.chargeableWeightKg ?? pkg.weightKg ?? 0)
      }),
      { packageCount: 0, weightKg: 0, cbm: 0, chargeWeightKg: 0 }
    );
    if (input.submitForReview && totals.chargeWeightKg <= 0) {
      throw new BadRequestException('提交审核前必须有计费重');
    }
    return {
      customer,
      shipment: { ...shipment, channelId: channel?.id ?? shipment.channelId, receivingChannel: channel?.name ?? shipment.receivingChannel },
      packageIds,
      totals: {
        packageCount: totals.packageCount || packages.length,
        weightKg: Number(totals.weightKg.toFixed(2)),
        cbm: Number(totals.cbm.toFixed(6)),
        chargeWeightKg: Number((totals.chargeWeightKg || totals.weightKg).toFixed(2))
      },
      warehousePackages: packages.map(mapWarehousePackage),
      financeItems: [...receivables, ...businessCosts, ...(this.canViewOrderEntryPayables(principal) ? payables : [])]
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
    if (!shipment.systemOrderNo?.trim()) {
      throw new BadRequestException('提交审核前必须填写运单号');
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
    if (!packageIds.length) {
      throw new BadRequestException('提交审核前必须选择至少一条仓库货物');
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
        data: { waterReceiptId: receipt.id, receivableFinanceItemId: item.id, shipmentId: item.shipmentId, amount }
      });
      const nextReceived = roundMoney(Number(item.receivedAmount ?? 0) + amount);
      await tx.shipmentFinanceItem.update({
        where: { id: item.id },
        data: {
          receivedAmount: nextReceived,
          receiptStatus: nextReceived >= Number(item.amount) ? 'RECEIVED' : 'PARTIAL',
          receivedAt: nextReceived >= Number(item.amount) ? new Date() : null,
          paymentNo: receipt.receiptNo
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
    if (!(await this.hasPermission(principal.role, permission))) {
      throw new ForbiddenException('当前角色没有水单权限');
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

  private async nextWaterReceiptNo(receiptDate: Date) {
    const ymd = receiptDate.toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = `SD${ymd}`;
    const count = await (this.prisma as any).waterReceipt.count({ where: { receiptNo: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  private async findWaterReceiptById(id: string) {
    const row = await (this.prisma as any).waterReceipt.findFirst({ where: { OR: [{ id }, { receiptNo: id }] }, include: this.waterReceiptInclude() });
    if (!row) throw new NotFoundException('水单不存在');
    return row;
  }

  private async findOrCreateWaterReceiptFromLedger(ledger: any) {
    const existing = await (this.prisma as any).waterReceipt.findFirst({ where: { accountLedgerId: ledger.id }, include: this.waterReceiptInclude() });
    if (existing) return existing;
    const customer = await this.prisma.customer.findUnique({ where: { id: ledger.partyId } });
    const receiptNo = await this.nextWaterReceiptNo(ledger.createdAt);
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
        paymentNo: ledger.id,
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
      salesperson: row.shipment.entryBy ?? row.shipment.customer.salesperson ?? row.shipment.salespersonName ?? undefined,
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
      throw new BadRequestException('该应收已匹配水单，请先在收款管理撤销匹配后再反审核');
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
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        deletedAt: null,
        ...(input.shipmentId ? { id: input.shipmentId } : {}),
        ...(input.systemOrderNo ? { systemOrderNo: input.systemOrderNo } : {}),
        ...(input.customerOrderNo ? { customerOrderNo: input.customerOrderNo } : {}),
        ...(input.transferNo ? { transferNo: input.transferNo } : {}),
        ...(input.customerCode ? { customer: { code: input.customerCode } } : {}),
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
      },
      include: { customer: true, agent: true, channel: true }
    });
    if (!shipment) {
      throw new NotFoundException('未匹配到运单，请检查运单号、转单号或客户编号');
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
        if (bankSummary.enabled !== false) throw new BadRequestException('待付款代理缺失，不能选择收款银行');
        continue;
      }
      if (!this.samePayeeAgent(bankSummary.agentName, row.agentName)) throw new BadRequestException('收款银行代理必须与待付款代理一致');
    }
  }

  private samePayeeAgent(left: string, right: string) {
    const a = left.trim().toLowerCase();
    const b = right.trim().toLowerCase();
    return a === b || a.includes(b) || b.includes(a);
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
    systemOrderNo?: string;
    customerOrderNo?: string;
    transferNo?: string;
    customerCode?: string;
  }) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        deletedAt: null,
        ...(input.shipmentId ? { id: input.shipmentId } : {}),
        ...(input.systemOrderNo ? { systemOrderNo: input.systemOrderNo } : {}),
        ...(input.customerOrderNo ? { customerOrderNo: input.customerOrderNo } : {}),
        ...(input.transferNo ? { transferNo: input.transferNo } : {}),
        ...(input.customerCode ? { customer: { code: input.customerCode } } : {}),
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
      },
      include: { customer: true, agent: true }
    });
    if (!shipment) {
      throw new NotFoundException('未匹配到运单，请检查运单号、转单号或客户编号');
    }
    return shipment;
  }

  private toPayableAuditShipmentMatchSummary(shipment: any): PayableAuditShipmentMatchSummary {
    return {
      shipmentId: shipment.id,
      customerCode: shipment.customer.code,
      customerName: `${shipment.customer.code}-${shipment.customer.name}`,
      customerOrderNo: shipment.customerOrderNo ?? undefined,
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo ?? undefined,
      salesperson: shipment.entryBy ?? shipment.customer.salesperson ?? shipment.salespersonName ?? undefined,
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
    if (!(await this.hasPermission(principal.role, permission))) {
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
      systemOrderNo: shipment.systemOrderNo,
      transferNo: shipment.transferNo ?? undefined,
      salesperson: shipment.entryBy ?? shipment.customer.salesperson ?? shipment.salespersonName ?? undefined,
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
      salesperson: shipment.entryBy ?? shipment.customer?.salesperson ?? shipment.salespersonName ?? undefined,
      customerCode: shipment.customer.code,
      customerName: `${shipment.customer.code}-${shipment.customer.name}`,
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

  private toPaidPaymentSummary(row: any, canViewBank: boolean): PaidPaymentSummary {
    const items = (row.items ?? []).map((item: any) => ({
      id: item.id,
      pendingPaymentId: item.payablePaymentApplicationId,
      payableFinanceItemId: item.payableFinanceItemId,
      shipmentId: item.shipmentId,
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

  private buildPaidPaymentListResponse(rows: PaidPaymentSummary[], query: PaidPaymentListQuery = {}): PaidPaymentListResponse {
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
    if (!isSalesScopedRole(principal.role)) {
      return undefined;
    }
    return Array.from(new Set([principal.username, principal.name, principal.nickname, 'operator', '业务员'].filter((value): value is string => Boolean(value))));
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

  private async resolveWarehousePackageOwner(customerCode: string) {
    const customer = await this.prisma.customer.findUnique({ where: { code: customerCode }, select: { code: true, name: true, salesperson: true } });
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
      orderBy: [{ priority: 'asc' }, { agentName: 'asc' }, { channelName: 'asc' }, { realChannelName: 'asc' }]
    });
    return rows.map(mapAgentMarkupRule);
  }

  private async loadPriceBookRowsForMarkupValidation(): Promise<PriceBookRowSummary[]> {
    const books = await (this.prisma as any).priceBook.findMany({ where: { deletedAt: null }, include: { rows: true } });
    return books.flatMap((book: any) => book.rows.map(mapPriceBookRow));
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

  private async nextWarehouseTallyTaskNo(combinedOrderNo: string) {
    const existing = await (this.prisma as any).warehouseTallyTask.count({
      where: { taskNo: { startsWith: `${combinedOrderNo}-TL` } }
    });
    return `${combinedOrderNo}-TL${String(existing + 1).padStart(3, '0')}`;
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

  private async executeCarrierTask(taskId: string, fail: boolean): Promise<CarrierTaskRunResponse> {
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
          trackingEvents: { create: { status: trackingStatus, happenedAt: now, visibleToCustomer: true } }
        },
        include: shipmentIncludes
      })
    ]);

    return { task: mapCarrierTask(updatedTask), shipment: mapShipment(updatedShipment) };
  }

  private async getVisibleShipment(principal: Principal, shipmentId: string) {
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(operatorCustomerScope ? { customer: { salesperson: { in: operatorCustomerScope } } } : {})
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
    const finance = await this.getShipmentFinanceDetail(principal, shipment.id, { includeDeleted: Boolean(shipment.deletedAt) });
    const statusEvents = await this.prisma.shipmentEvent.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { createdAt: 'asc' }
    });
    const trackingEvents = await this.prisma.trackingEvent.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { happenedAt: 'asc' }
    });
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
    const tracking: ShipmentReviewEventSummary[] = trackingEvents.map((event) => ({
      id: event.id,
      type: 'TRACKING',
      title: event.status,
      toStatus: mappedShipment.status,
      createdAt: event.happenedAt.toISOString()
    }));
    return {
      shipment: mappedShipment,
      packages: packageFallback,
      finance,
      events,
      trackingEvents: tracking,
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
}

const shipmentIncludes = {
  customer: true,
  channel: { include: { carrier: true } },
  agent: true,
  financeItems: { where: { voided: false }, orderBy: { createdAt: 'desc' } },
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

function mapShipment(row: ShipmentWithRelations): Shipment {
  const routePayable = row.financeItems?.find((item) => item.type === 'PAYABLE' && item.name === '代理成本' && !item.voided);
  const routeRemark = parseRoutePayableRemark(routePayable?.remark);
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    entryAt: (row as any).entryAt?.toISOString?.() ?? (row as any).entryAt ?? undefined,
    customerName: `${row.customer.code}-${row.customer.name}`,
    customerId: row.customer.id,
    customerCode: row.customer.code,
    salesperson: (row as any).entryBy ?? row.customer.salesperson ?? undefined,
    customerOrderNo: row.customerOrderNo,
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
    latestTracking: row.latestTracking ?? '',
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

function mapPriceBook(row: any): PriceBookSummary {
  return {
    id: row.id,
    fileName: row.fileName,
    rowCount: Array.isArray(row.rows) ? row.rows.length : Number(row.rowCount ?? 0),
    importedAt: row.importedAt.toISOString(),
    remark: row.remark ?? undefined
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
    minWeightKg: Number(row.minWeightKg),
    maxWeightKg: Number(row.maxWeightKg),
    costPerKg: Number(row.costPerKg),
    currency: row.currency,
    transitDays: row.transitDays ?? undefined,
    transitLabel: row.transitLabel ?? undefined,
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
    agentName: row.agentName,
    channelName: row.channelName ?? undefined,
    realChannelName: row.realChannelName ?? undefined,
    destinationCountry: row.destinationCountry ?? undefined,
    markupPerKg: Number(row.markupPerKg),
    markupType: row.markupType ?? 'WEIGHT',
    markupValue: row.markupValue === null || row.markupValue === undefined ? Number(row.markupPerKg) : Number(row.markupValue),
    priority: row.priority ?? 100,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? undefined,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt ?? undefined,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
    enabled: row.enabled
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

function mapWarehousePackage(row: any): WarehousePackageSummary {
  const packageCount = Number(row.packageCount);
  const lengthCm = Number(row.lengthCm);
  const widthCm = Number(row.widthCm);
  const heightCm = Number(row.heightCm);
  const sides = [lengthCm, widthCm, heightCm].sort((left, right) => right - left);
  const girthCm = roundMoney((sides[0] ?? 0) + 2 * ((sides[1] ?? 0) + (sides[2] ?? 0)));
  const totalVolumetricWeightKg5000 = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 5000);
  return {
    id: row.id,
    customerCode: row.customerCode,
    customerName: row.customerName ?? undefined,
    site: row.site ?? undefined,
    salesperson: row.salesperson ?? undefined,
    customerOrderNo: row.customerOrderNo,
    domesticTrackingNo: row.domesticTrackingNo,
    combinedOrderNo: row.combinedOrderNo,
    labelNo: row.labelNo ?? undefined,
    sourcePackageId: row.sourcePackageId ?? undefined,
    sourcePackageNo: row.sourcePackageNo ?? undefined,
    systemOrderNo: row.systemOrderNo ?? undefined,
    shipmentId: row.shipmentId ?? undefined,
    receivingChannel: row.receivingChannel,
    destinationCountry: row.destinationCountry ?? undefined,
    expectedTotalPackageCount: row.expectedTotalPackageCount ?? undefined,
    packageIndex: row.packageIndex ?? undefined,
    packageCount,
    weightKg: Number(row.weightKg),
    lengthCm,
    widthCm,
    heightCm,
    girthCm,
    cbm: Number(row.cbm),
    totalCbm: Number(row.cbm),
    volumetricWeightKg: Number(row.volumetricWeightKg),
    volumetricWeightKg5000: totalVolumetricWeightKg5000,
    totalVolumetricWeightKg: Number(row.volumetricWeightKg),
    totalVolumetricWeightKg5000,
    chargeableWeightKg: Number(row.chargeableWeightKg),
    divisor: row.divisor,
    roundingRule: row.roundingRule,
    scanTime: row.scanTime?.toISOString(),
    remark: row.remark ?? undefined,
    manualException: row.manualException ?? undefined,
    scanSource: row.scanSource ?? undefined,
    inboundAt: row.scanTime?.toISOString(),
    receiptSourceId: row.sourcePackageId ?? row.id,
    tallyStatus: row.status === 'RECEIVED' ? '待理货' : '已理货',
    splitStatus: row.sourcePackageId ? '拆票子票' : '原始票',
    consolidationStatus: row.status === 'CONSOLIDATED' ? '已合票' : '未合票',
    outboundStatus: row.status === 'SHIPPED' ? '已出库' : '未出库',
    status: row.status as WarehousePackageStatus,
    exceptions: row.exceptions ?? [],
    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt.toISOString()
  };
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
  const scanTime = input.scanTime ? new Date(input.scanTime) : new Date();
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

function parseWarehouseCombinedOrderNo(value?: string) {
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

function resolveWarehouseTodayRange(query: WarehouseTodayQuery) {
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

function mapWarehouseTallyTask(row: any): WarehouseTallyTaskSummary {
  return {
    id: row.id,
    taskNo: row.taskNo,
    status: row.status,
    packageIds: [...(row.packageIds ?? [])],
    sourcePackageId: row.sourcePackageId,
    sourceCombinedOrderNo: row.sourceCombinedOrderNo,
    customerCode: row.customerCode,
    customerName: row.customerName ?? undefined,
    salesperson: row.salesperson ?? undefined,
    packageCount: row.packageCount,
    originalWeightKg: Number(row.originalWeightKg),
    originalLengthCm: Number(row.originalLengthCm),
    originalWidthCm: Number(row.originalWidthCm),
    originalHeightCm: Number(row.originalHeightCm),
    originalVolumetricWeightKg: Number(row.originalVolumetricWeightKg),
    originalVolumetricWeightKg5000: Number(row.originalVolumetricWeightKg5000),
    tallyRequirement: row.tallyRequirement,
    remark: row.remark ?? undefined,
    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
    completedPackageCount: row.completedPackageCount ?? undefined,
    completedWeightKg: row.completedWeightKg === null || row.completedWeightKg === undefined ? undefined : Number(row.completedWeightKg),
    completedLengthCm: row.completedLengthCm === null || row.completedLengthCm === undefined ? undefined : Number(row.completedLengthCm),
    completedWidthCm: row.completedWidthCm === null || row.completedWidthCm === undefined ? undefined : Number(row.completedWidthCm),
    completedHeightCm: row.completedHeightCm === null || row.completedHeightCm === undefined ? undefined : Number(row.completedHeightCm),
    completedVolumetricWeightKg: row.completedVolumetricWeightKg === null || row.completedVolumetricWeightKg === undefined ? undefined : Number(row.completedVolumetricWeightKg),
    completedVolumetricWeightKg5000: row.completedVolumetricWeightKg5000 === null || row.completedVolumetricWeightKg5000 === undefined ? undefined : Number(row.completedVolumetricWeightKg5000),
    completedBy: row.completedBy ?? undefined,
    completedAt: row.completedAt?.toISOString?.() ?? undefined,
    labelStatus: row.labelStatus ?? 'NOT_GENERATED',
    labelNo: row.labelNo ?? undefined,
    labelQrContent: row.labelQrContent ?? undefined,
    labelGeneratedAt: row.labelGeneratedAt?.toISOString?.() ?? undefined,
    labelGeneratedBy: row.labelGeneratedBy ?? undefined,
    labelPrintedAt: row.labelPrintedAt?.toISOString?.() ?? undefined,
    labelPrintedBy: row.labelPrintedBy ?? undefined,
    labelDownloadedAt: row.labelDownloadedAt?.toISOString?.() ?? undefined,
    labelDownloadedBy: row.labelDownloadedBy ?? undefined
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
      id: `${first.customerOrderNo}-${first.domesticTrackingNo}`,
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

function createBackendPriceLookup(
  principal: Principal,
  input: PriceLookupRequest,
  priceRows: PriceBookRowSummary[],
  priceBooks: Array<Pick<PriceBookSummary, 'id' | 'remark'>>,
  persistedMarkupRules: AgentMarkupSummary[] = defaultAgentMarkupRules
): PriceLookupResponse {
  const destinationCountry = input.destinationCountry?.trim();
  const chargeableWeightKg = calculateLookupChargeableWeight(input);
  const warehouseProfile = createWarehouseLookupProfile(input);
  if ((!destinationCountry && !warehouseProfile.code) || !Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) {
    throw new BadRequestException('目的地和计费重不能为空');
  }

  const priceBookRemarkMap = new Map(priceBooks.map((book) => [book.id, book.remark?.trim() || undefined]));
  const markupRules = (persistedMarkupRules.length ? persistedMarkupRules : defaultAgentMarkupRules).filter((rule) => !('deletedAt' in rule) || !rule.deletedAt);
  const matchedPrices = selectPriceRowsForLookup(priceRows, warehouseProfile, destinationCountry, chargeableWeightKg);
  if (!matchedPrices.length) {
    throw new BadRequestException('没有匹配的代理成本价');
  }

  const isAdmin = principal.role === 'ADMIN';
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
      return {
        price: isAdmin ? { ...price } : omitInternalPriceFields(price),
        ...(isAdmin ? { markup } : {}),
        channelName: price.channelName,
        carrierName: price.carrierName?.trim() || inferBackendPriceCarrierName(price),
        agentName: price.agentName,
        realChannelName,
        isRouteMapped: Boolean(businessRouteName),
        quoteSourceType: price.quoteSourceType ?? 'local',
        weightSegmentLabel: `${price.minWeightKg}-${price.maxWeightKg}kg`,
        salesRatePerKg,
        freightFee: totalSales,
        surchargeFee,
        totalFee: roundMoney(totalSales + surchargeFee),
        freightUnitPrice: salesRatePerKg,
        totalUnitPrice: roundMoney((totalSales + surchargeFee) / chargeableWeightKg),
        ...(isAdmin ? { totalCost, grossProfit: roundMoney(totalSales - totalCost) } : {}),
        totalSales,
        transitLabel: price.transitLabel ?? '时效待确认',
        surchargeDetails: price.surchargeDetails ?? [],
        ...(price.productSurchargeRemark ? { productSurchargeRemark: price.productSurchargeRemark } : {}),
        ...(price.specialRemark ? { specialRemark: price.specialRemark } : {}),
        ...(businessRouteName ? { businessRouteName } : {}),
        ...(price.priceBookId && priceBookRemarkMap.get(price.priceBookId) ? { remark: priceBookRemarkMap.get(price.priceBookId) } : {})
      };
    })
    .filter((recommendation): recommendation is PriceLookupRecommendation => Boolean(recommendation));

  if (!recommendations.length) {
    throw new BadRequestException('没有启用的代理加价规则');
  }

  const cheapestRecommendations = [...recommendations].sort((left, right) => left.totalSales - right.totalSales || left.salesRatePerKg - right.salesRatePerKg).slice(0, 3);
  const fastestRecommendations = [...recommendations].sort((left, right) => matchedTransitDays(left) - matchedTransitDays(right) || left.totalSales - right.totalSales).slice(0, 3);
  const bestRecommendation = cheapestRecommendations[0];
  if (!bestRecommendation) {
    throw new BadRequestException('没有可用报价');
  }

  return {
    price: bestRecommendation.price,
    ...(isAdmin && bestRecommendation.markup ? { markup: bestRecommendation.markup } : {}),
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
    ...(isAdmin ? { totalCost: bestRecommendation.totalCost, grossProfit: bestRecommendation.grossProfit } : {}),
    totalSales: bestRecommendation.totalSales,
    totalPrice: bestRecommendation.totalSales
  };
}

function findBestMarkupRule(markupRules: AgentMarkupSummary[], price: PriceBookRowSummary): AgentMarkupSummary | undefined {
  const destination = price.destinationCountry.trim();
  const channel = price.channelName.trim();
  const realChannel = (price.realChannelName?.trim() || price.channelName.trim());
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

function omitInternalPriceFields(price: PriceBookRowSummary): PriceLookupRecommendation['price'] {
  return { ...price, costPerKg: undefined };
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

function pickStaffProfile(user: { name?: string | null; phone?: string | null; gender?: string | null; nickname?: string | null; site?: string | null }) {
  return {
    name: user.name ?? null,
    phone: user.phone ?? null,
    gender: user.gender ?? 'UNKNOWN',
    nickname: user.nickname ?? null,
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

function nextWarehouseSplitSequence(rootCombinedOrderNo: string, combinedOrderNos: string[]) {
  const prefix = `${rootCombinedOrderNo}-`;
  return combinedOrderNos.reduce((max, combinedOrderNo) => {
    if (!combinedOrderNo.startsWith(prefix)) return max;
    const suffix = Number(combinedOrderNo.slice(prefix.length));
    return Number.isInteger(suffix) && suffix > max ? suffix : max;
  }, 0) + 1;
}

function formatDate(date: Date): string {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

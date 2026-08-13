import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  WarehousePackageSummary,
  WarehouseTallySortRule,
  WarehouseTallySortRulesUpdateInput,
  WarehouseTallyTaskListQuery,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';
import { createDefaultWarehouseTallySortRules, sortWarehouseTallyTasks, warehouseTallyChannels } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { PrismaService } from '../../prisma.service.js';
import { isAdministratorRole, isSalesScopedRole, type PermissionKey, type Principal } from '../../rbac.js';
import { WAREHOUSE_TALLY_AGGREGATE_CORRECTION_ARCHIVE_REASON } from '../../warehouse-tally-aggregate-correction.js';
import {
  loadWarehouseTallyTaskOutputPackages,
  mapWarehousePackage,
  mapWarehouseTallyTask,
  resolveWarehouseTallyRecentCutoff
} from '../warehouse-query.shared.js';

export const WAREHOUSE_TALLY_QUERY_REPOSITORY = 'WAREHOUSE_TALLY_QUERY_REPOSITORY';

export interface WarehouseTallyQueryRepository {
  getWarehouseConsolidationItems(principal: Principal, id: string): Promise<WarehousePackageSummary[]>;
  getWarehouseTallySortRules(principal: Principal): Promise<WarehouseTallySortRule[]>;
  updateWarehouseTallySortRules(principal: Principal, input: WarehouseTallySortRulesUpdateInput): Promise<WarehouseTallySortRule[]>;
  getWarehouseTallyTasks(principal: Principal, query?: WarehouseTallyTaskListQuery): Promise<WarehouseTallyTaskSummary[]>;
  getWarehouseTallyTaskSourcePackages(principal: Principal, id: string): Promise<WarehousePackageSummary[]>;
  getWarehouseTallyTaskHistoryChain(principal: Principal, packageId: string): Promise<WarehouseTallyTaskSummary[]>;
  getWarehouseTallyTaskOutputPackages(principal: Principal, id: string): Promise<WarehousePackageSummary[]>;
}

@Injectable()
export class PrismaWarehouseTallyQueryRepository implements WarehouseTallyQueryRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PrismaRepository) private readonly permissions: Pick<PrismaRepository, 'hasPermission'>
  ) {}

  async getWarehouseConsolidationItems(principal: Principal, id: string): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    await this.ensurePendingViewNotBlocked(principal);
    const items = await (this.prisma as any).warehouseConsolidationItem.findMany({
      where: { consolidationId: id },
      include: { package: true },
      orderBy: { id: 'asc' }
    });
    return items.map((item: any) => mapWarehousePackage(item.package));
  }

  async getWarehouseTallySortRules(principal: Principal): Promise<WarehouseTallySortRule[]> {
    this.ensureWarehouseAccess(principal);
    await this.ensurePendingViewNotBlocked(principal);
    return this.readWarehouseTallySortRules();
  }

  async updateWarehouseTallySortRules(
    principal: Principal,
    input: WarehouseTallySortRulesUpdateInput
  ): Promise<WarehouseTallySortRule[]> {
    this.ensureWarehouseAccess(principal);
    await this.ensurePendingUpdateAllowed(principal);
    const rules = normalizeWarehouseTallySortRuleInput(input);
    return this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRawUnsafe("SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended('warehouse-tally-sort-rules', 0))");
      const beforeRows = await tx.warehouseTallySortRule.findMany({ orderBy: [{ sortOrder: 'asc' }, { channel: 'asc' }] });
      for (const rule of rules) {
        await tx.warehouseTallySortRule.upsert({
          where: { channel: rule.channel },
          create: { ...rule, updatedBy: principal.username },
          update: { sortOrder: rule.sortOrder, preferredTimeSlot: rule.preferredTimeSlot, enabled: rule.enabled, updatedBy: principal.username }
        });
      }
      const updatedRows = await tx.warehouseTallySortRule.findMany({ orderBy: [{ sortOrder: 'asc' }, { channel: 'asc' }] });
      const before = mapWarehouseTallySortRules(beforeRows);
      const updated = mapWarehouseTallySortRules(updatedRows);
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'warehouse.tally.sort_rules.update',
          target: 'warehouse:tally-sort-rules',
          before: JSON.parse(JSON.stringify(before)),
          after: JSON.parse(JSON.stringify(updated))
        }
      });
      return updated;
    });
  }

  async getWarehouseTallyTasks(
    principal: Principal,
    query: WarehouseTallyTaskListQuery = {}
  ): Promise<WarehouseTallyTaskSummary[]> {
    if (query.status && query.status !== 'PENDING' && query.status !== 'COMPLETED') {
      throw new BadRequestException('理货任务状态无效');
    }
    const canViewPending = await this.permissions.hasPermission(principal.role, 'warehouse:tally-pending:view')
      && !(await this.isPendingViewBlocked(principal));
    const canViewCompleted = await this.permissions.hasPermission(principal.role, 'warehouse:tally-completed:view')
      && !(await this.isCompletedViewBlocked(principal));
    if (!canViewPending && !canViewCompleted) {
      throw new ForbiddenException('当前角色不能查看理货任务');
    }
    if (query.status === 'PENDING' && !canViewPending) {
      throw new ForbiddenException('当前用户组已屏蔽查看未完成理货');
    }
    const requestsCompleted = query.status === 'COMPLETED'
      || query.completedScope === 'RECENT'
      || query.completedScope === 'HISTORY'
      || Boolean(query.completedFrom)
      || Boolean(query.completedTo);
    if (requestsCompleted && !canViewCompleted) {
      throw new ForbiddenException('当前角色不能查看已完成理货');
    }
    const scope = this.operatorCustomerScope(principal);
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    } else if (!canViewPending) {
      where.status = 'COMPLETED';
    } else if (!canViewCompleted) {
      where.status = 'PENDING';
    }
    if (query.customerCode?.trim()) {
      where.customerCode = { contains: query.customerCode.trim(), mode: 'insensitive' };
    }
    if (query.combinedOrderNo?.trim()) {
      where.sourceCombinedOrderNo = { contains: query.combinedOrderNo.trim(), mode: 'insensitive' };
    }
    if (query.completedScope === 'RECENT' || query.completedScope === 'HISTORY' || query.completedFrom || query.completedTo) {
      where.status = 'COMPLETED';
      const completedAt: Record<string, Date> = {};
      if (query.completedScope === 'RECENT') {
        completedAt.gte = resolveWarehouseTallyRecentCutoff();
      } else if (query.completedScope === 'HISTORY') {
        completedAt.lt = resolveWarehouseTallyRecentCutoff();
      }
      if (query.completedFrom?.trim()) {
        completedAt.gte = new Date(query.completedFrom.trim());
      }
      if (query.completedTo?.trim()) {
        completedAt.lt = new Date(query.completedTo.trim());
      }
      where.completedAt = completedAt;
    }
    if (scope) {
      where.salesperson = { in: scope };
    }
    const rows = await (this.prisma as any).warehouseTallyTask.findMany({
      where,
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }]
    });
    const completedRows = rows.filter((row: any) => row.status === 'COMPLETED' && row.tallyProgressStatus !== 'CANCELLED');
    const outputRows = completedRows.length
      ? await (this.prisma as any).warehousePackage.findMany({
        where: {
          tallyTaskId: { in: completedRows.map((row: any) => row.id) },
          status: { not: 'TALLIED_ARCHIVED' }
        },
        orderBy: [{ packageIndex: 'asc' }, { createdAt: 'asc' }]
      })
      : [];
    const sourceIdsByTask = new Map<string, Set<string>>(completedRows.map((row: any) => [row.id, new Set<string>(row.packageIds ?? [])]));
    const outputsByTask = new Map<string, WarehousePackageSummary[]>();
    outputRows.forEach((output: any) => {
      if (sourceIdsByTask.get(output.tallyTaskId)?.has(output.id)) return;
      if (output.archivedReason === WAREHOUSE_TALLY_AGGREGATE_CORRECTION_ARCHIVE_REASON) return;
      outputsByTask.set(output.tallyTaskId, [...(outputsByTask.get(output.tallyTaskId) ?? []), mapWarehousePackage(output)]);
    });
    const mappedRows: WarehouseTallyTaskSummary[] = rows.map((row: any) => ({
      ...mapWarehouseTallyTask(row),
      outputPackages: outputsByTask.get(row.id) ?? []
    }));
    const activeRows = mappedRows.filter((row) => row.status === 'PENDING');
    const sortRules = await this.readWarehouseTallySortRules();
    const inProgressRows = activeRows
      .filter((row) => row.tallyProgressStatus === 'IN_PROGRESS')
      .sort(compareWarehouseTallyTaskCreation);
    const waitingRows = sortWarehouseTallyTasks(
      activeRows.filter((row) => row.tallyProgressStatus !== 'IN_PROGRESS'),
      new Date(),
      sortRules
    );
    const pendingRows = [...inProgressRows, ...waitingRows];
    return query.status === 'PENDING' ? pendingRows : [...pendingRows, ...mappedRows.filter((row) => row.status !== 'PENDING')];
  }

  async getWarehouseTallyTaskSourcePackages(
    principal: Principal,
    id: string
  ): Promise<WarehousePackageSummary[]> {
    await this.ensurePendingViewNotBlocked(principal);
    if (!(await this.hasAnyPermission(principal, ['warehouse:tally-pending:detail-view']))) {
      throw new ForbiddenException('当前角色不能查看理货原始包裹');
    }
    const scope = this.operatorCustomerScope(principal);
    const task: { packageIds: string[] } | null = await (this.prisma as any).warehouseTallyTask.findFirst({
      where: {
        id,
        status: 'PENDING',
        ...(scope ? { salesperson: { in: scope } } : {})
      },
      select: { packageIds: true }
    });
    if (!task) {
      throw new NotFoundException('未完成理货任务不存在或当前账号无权查看');
    }
    const rows = await (this.prisma as any).warehousePackage.findMany({
      where: { id: { in: task.packageIds } }
    });
    if (rows.length !== task.packageIds.length) {
      throw new BadRequestException('理货任务的原始包裹数据不完整，请联系管理员核对');
    }
    const rowById = new Map<string, any>(rows.map((row: any) => [row.id, row]));
    return task.packageIds
      .map((packageId) => rowById.get(packageId))
      .filter(Boolean)
      .map((row) => mapWarehousePackage(row));
  }

  async getWarehouseTallyTaskHistoryChain(
    principal: Principal,
    packageId: string
  ): Promise<WarehouseTallyTaskSummary[]> {
    await this.ensureCompletedViewNotBlocked(principal);
    if (!(await this.hasAnyPermission(principal, ['warehouse:in-stock:tally-record-view']))) {
      throw new ForbiddenException('当前角色不能查看理货历史');
    }
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new BadRequestException('缺少仓库包裹编号');
    }
    const scope = this.operatorCustomerScope(principal);
    const requestedPackage: { customerCode: string; salesperson?: string | null } | null = await this.prisma.warehousePackage.findUnique({
      where: { id: normalizedPackageId },
      select: { customerCode: true, salesperson: true }
    });
    if (scope && (!requestedPackage?.salesperson || !scope.includes(requestedPackage.salesperson))) {
      return [];
    }
    const scopedCustomerCode = scope ? requestedPackage?.customerCode : undefined;
    const visitedTaskIds: string[] = [];
    const chain: WarehouseTallyTaskSummary[] = [];
    let currentPackageId: string | undefined = normalizedPackageId;

    while (currentPackageId && chain.length < 20) {
      const lookupPackageId = currentPackageId;
      const currentPackage: { tallyTaskId?: string | null; tallyTaskNo?: string | null } | null = await (this.prisma as any).warehousePackage.findUnique({
        where: { id: lookupPackageId },
        select: { tallyTaskId: true, tallyTaskNo: true }
      });
      const task: any = await (this.prisma as any).warehouseTallyTask.findFirst({
        where: {
          status: 'COMPLETED',
          ...(visitedTaskIds.length ? { id: { notIn: visitedTaskIds } } : {}),
          ...(scopedCustomerCode ? { customerCode: scopedCustomerCode } : {}),
          OR: [
            ...(currentPackage?.tallyTaskId ? [{ id: currentPackage.tallyTaskId }] : []),
            ...(currentPackage?.tallyTaskNo ? [{ taskNo: currentPackage.tallyTaskNo }] : []),
            { appliedPackageId: lookupPackageId },
            { sourcePackageId: lookupPackageId },
            { packageIds: { has: lookupPackageId } }
          ]
        },
        orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }]
      });
      if (!task) break;
      visitedTaskIds.push(task.id);
      chain.push(mapWarehouseTallyTask(task));
      currentPackageId = task.sourcePackageId;
    }

    return chain.reverse();
  }

  async getWarehouseTallyTaskOutputPackages(
    principal: Principal,
    id: string
  ): Promise<WarehousePackageSummary[]> {
    await this.ensureCompletedViewNotBlocked(principal);
    if (!(await this.hasAnyPermission(principal, ['warehouse:tally-completed:view']))) {
      throw new ForbiddenException('当前角色不能查看理货结果包裹');
    }
    return loadWarehouseTallyTaskOutputPackages(this.prisma, id);
  }

  private ensureWarehouseAccess(principal: Principal) {
    if (!isAdministratorRole(principal.role) && !['WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role)) {
      throw new ForbiddenException('当前角色不能操作仓库管理');
    }
  }

  private async hasAnyPermission(principal: Principal, permissionKeys: PermissionKey[]) {
    for (const permission of permissionKeys) {
      if (await this.permissions.hasPermission(principal.role, permission)) return true;
    }
    return false;
  }

  private async isPendingViewBlocked(principal: Principal) {
    return !isAdministratorRole(principal.role)
      && await this.permissions.hasPermission(principal.role, 'warehouse:tally-pending:view-block');
  }

  private async isCompletedViewBlocked(principal: Principal) {
    return !isAdministratorRole(principal.role)
      && await this.permissions.hasPermission(principal.role, 'warehouse:tally-completed:view-block');
  }

  private async ensurePendingViewNotBlocked(principal: Principal) {
    if (await this.isPendingViewBlocked(principal)) {
      throw new ForbiddenException('当前用户组已屏蔽查看未完成理货');
    }
  }

  private async ensurePendingUpdateAllowed(principal: Principal) {
    if (!(await this.permissions.hasPermission(principal.role, 'warehouse:tally-pending:task-update'))) {
      throw new ForbiddenException('当前角色不能修改理货排序规则');
    }
    if (!isAdministratorRole(principal.role)
      && await this.permissions.hasPermission(principal.role, 'warehouse:tally-pending:update-block')) {
      throw new ForbiddenException('当前用户组已屏蔽修改未完成理货');
    }
  }

  private async ensureCompletedViewNotBlocked(principal: Principal) {
    if (await this.isCompletedViewBlocked(principal)) {
      throw new ForbiddenException('当前用户组已屏蔽查看已完成理货');
    }
  }

  private operatorCustomerScope(principal: Principal) {
    const explicitlySalesScoped = principal.dataScope === 'SALES_OWN';
    if (!explicitlySalesScoped && (principal.role === 'UG_MARKET' || !isSalesScopedRole(principal.role))) {
      return undefined;
    }
    return Array.from(new Set([principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value))));
  }

  private async readWarehouseTallySortRules(): Promise<WarehouseTallySortRule[]> {
    const rows = await (this.prisma as any).warehouseTallySortRule.findMany({ orderBy: [{ sortOrder: 'asc' }, { channel: 'asc' }] });
    return mapWarehouseTallySortRules(rows);
  }
}

function mapWarehouseTallySortRules(rows: any[]): WarehouseTallySortRule[] {
  const byChannel = new Map(rows.map((row) => [row.channel, row]));
  return createDefaultWarehouseTallySortRules().map((fallback) => {
    const row = byChannel.get(fallback.channel);
    if (!row) return fallback;
    const sortOrder = Number(row.sortOrder);
    return {
      channel: fallback.channel,
      sortOrder: Number.isInteger(sortOrder) && sortOrder >= 1 && sortOrder <= 999 ? sortOrder : fallback.sortOrder,
      preferredTimeSlot: row.preferredTimeSlot === 'MORNING' || row.preferredTimeSlot === 'AFTERNOON' || row.preferredTimeSlot === 'ALL_DAY'
        ? row.preferredTimeSlot
        : fallback.preferredTimeSlot,
      enabled: typeof row.enabled === 'boolean' ? row.enabled : fallback.enabled,
      updatedAt: row.updatedAt?.toISOString?.(),
      updatedBy: row.updatedBy ?? undefined
    };
  }).sort((left, right) => left.sortOrder - right.sortOrder || left.channel.localeCompare(right.channel));
}

function normalizeWarehouseTallySortRuleInput(input: WarehouseTallySortRulesUpdateInput) {
  const inputRules = input?.rules;
  if (!Array.isArray(inputRules) || inputRules.length !== warehouseTallyChannels.length) {
    throw new BadRequestException('请完整维护全部理货渠道排序规则');
  }
  const byChannel = new Map(inputRules.map((rule) => [rule?.channel, rule]));
  if (byChannel.size !== warehouseTallyChannels.length || warehouseTallyChannels.some((channel) => !byChannel.has(channel))) {
    throw new BadRequestException('理货排序规则必须包含且仅包含快递、空运、卡航、铁路、海运');
  }
  return warehouseTallyChannels.map((channel) => {
    const rule = byChannel.get(channel)!;
    const sortOrder = Number(rule.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 999) {
      throw new BadRequestException('理货排序号须为 1 到 999 的整数');
    }
    if (!['MORNING', 'AFTERNOON', 'ALL_DAY'].includes(rule.preferredTimeSlot)) {
      throw new BadRequestException('理货优先时段无效');
    }
    if (typeof rule.enabled !== 'boolean') {
      throw new BadRequestException('理货渠道启用状态无效');
    }
    return { channel, sortOrder, preferredTimeSlot: rule.preferredTimeSlot, enabled: rule.enabled };
  });
}

function compareWarehouseTallyTaskCreation(
  left: Pick<WarehouseTallyTaskSummary, 'createdAt' | 'taskNo' | 'id'>,
  right: Pick<WarehouseTallyTaskSummary, 'createdAt' | 'taskNo' | 'id'>
) {
  const createdDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return (Number.isFinite(createdDifference) && createdDifference !== 0 ? createdDifference : 0)
    || String(left.taskNo ?? left.id).localeCompare(String(right.taskNo ?? right.id), 'zh-Hans-CN');
}

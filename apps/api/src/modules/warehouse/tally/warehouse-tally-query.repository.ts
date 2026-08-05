import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  WarehousePackageSummary,
  WarehouseTallyTaskListQuery,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { PrismaService } from '../../prisma.service.js';
import { isSalesScopedRole, type PermissionKey, type Principal } from '../../rbac.js';
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
    const items = await (this.prisma as any).warehouseConsolidationItem.findMany({
      where: { consolidationId: id },
      include: { package: true },
      orderBy: { id: 'asc' }
    });
    return items.map((item: any) => mapWarehousePackage(item.package));
  }

  async getWarehouseTallyTasks(
    principal: Principal,
    query: WarehouseTallyTaskListQuery = {}
  ): Promise<WarehouseTallyTaskSummary[]> {
    if (!(await this.hasAnyPermission(principal, ['warehouse:tally-pending:view', 'warehouse:tally-completed:view']))) {
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
    const completedRows = rows.filter((row: any) => row.status === 'COMPLETED');
    const outputRows = completedRows.length
      ? await (this.prisma as any).warehousePackage.findMany({
        where: { tallyTaskId: { in: completedRows.map((row: any) => row.id) } },
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
    return rows.map((row: any) => ({
      ...mapWarehouseTallyTask(row),
      outputPackages: outputsByTask.get(row.id) ?? []
    }));
  }

  async getWarehouseTallyTaskSourcePackages(
    principal: Principal,
    id: string
  ): Promise<WarehousePackageSummary[]> {
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
    if (!(await this.hasAnyPermission(principal, ['warehouse:tally-completed:view']))) {
      throw new ForbiddenException('当前角色不能查看理货结果包裹');
    }
    return loadWarehouseTallyTaskOutputPackages(this.prisma, id);
  }

  private ensureWarehouseAccess(principal: Principal) {
    if (!['ADMIN', 'WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role)) {
      throw new ForbiddenException('当前角色不能操作仓库管理');
    }
  }

  private async hasAnyPermission(principal: Principal, permissionKeys: PermissionKey[]) {
    for (const permission of permissionKeys) {
      if (await this.permissions.hasPermission(principal.role, permission)) return true;
    }
    return false;
  }

  private operatorCustomerScope(principal: Principal) {
    const explicitlySalesScoped = principal.dataScope === 'SALES_OWN';
    if (!explicitlySalesScoped && (principal.role === 'UG_MARKET' || !isSalesScopedRole(principal.role))) {
      return undefined;
    }
    return Array.from(new Set([principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value))));
  }
}

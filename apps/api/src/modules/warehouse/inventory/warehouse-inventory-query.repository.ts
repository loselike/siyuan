import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type {
  WarehouseInStockPageQuery,
  WarehouseInStockPageResponse,
  WarehousePackageGroupSummary,
  WarehousePackageSummary
} from '@siyuan/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service.js';
import { isAdministratorRole, type PermissionKey, type Principal } from '../../rbac.js';
import {
  mapWarehousePackagesWithConfirmedTally,
  resolveWarehouseTallyRecentCutoff,
  summarizeWarehousePackageGroups
} from '../warehouse-query.shared.js';
import { resolveWarehouseTodayRange } from '../warehouse-domain.shared.js';

export const WAREHOUSE_INVENTORY_QUERY_REPOSITORY = 'WAREHOUSE_INVENTORY_QUERY_REPOSITORY';
export const WAREHOUSE_INVENTORY_QUERY_AUTHORIZER = 'WAREHOUSE_INVENTORY_QUERY_AUTHORIZER';

export interface WarehouseInventoryQueryAuthorizer {
  hasPermission(role: Principal['role'], permission: PermissionKey): Promise<boolean>;
}

interface WarehouseInStockAggregateRow {
  totalItems: bigint;
  receiptTickets: bigint;
  totalPackages: bigint;
  totalWeightKg: Prisma.Decimal | number;
  totalCbm: Prisma.Decimal | number;
  pendingTallyTickets: bigint;
  exceptionTickets: bigint;
}

export interface MojiaWarehouseDuplicateQuery {
  combinedOrderNo: string;
  scanTime?: string;
  remark?: string;
}

export interface WarehouseInventoryQueryRepository {
  getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]>;
  getWarehouseInStockPage(principal: Principal, query: WarehouseInStockPageQuery): Promise<WarehouseInStockPageResponse>;
  getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]>;
  getWarehouseManualReceiptCustomers(principal: Principal): Promise<Array<{ code: string; name: string }>>;
  findDuplicateMojiaPackage(
    principal: Principal,
    query: MojiaWarehouseDuplicateQuery
  ): Promise<{ combinedOrderNo: string } | undefined>;
}

@Injectable()
export class PrismaWarehouseInventoryQueryRepository implements WarehouseInventoryQueryRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WAREHOUSE_INVENTORY_QUERY_AUTHORIZER)
    private readonly authorizer: WarehouseInventoryQueryAuthorizer
  ) {}

  async getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    const [canToday, canInStock] = await Promise.all([
      this.authorizer.hasPermission(principal.role, 'warehouse:today-receipt:view'),
      this.authorizer.hasPermission(principal.role, 'warehouse:in-stock:view')
    ]);
    if (!canToday && !canInStock) throw new ForbiddenException('没有仓库包裹查看权限');
    const warehouseWideScope = isAdministratorRole(principal.role)
      || ['WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role);
    const salespeople = principal.departmentTeamScope?.filter(Boolean).length
      ? principal.departmentTeamScope!.filter(Boolean)
      : [principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value));
    const ownedCustomerCodes = warehouseWideScope ? undefined : (await this.prisma.customer.findMany({
      where: { salesperson: { in: salespeople } },
      select: { code: true }
    })).map((customer) => customer.code);
    const today = resolveWarehouseTodayRange({});
    const rows = await (this.prisma as any).warehousePackage.findMany({
      where: {
        ...(!canInStock ? { scanTime: { gte: today.start, lt: today.end } } : {}),
        ...(ownedCustomerCodes ? { customerCode: { in: ownedCustomerCodes } } : {})
      },
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    return mapWarehousePackagesWithConfirmedTally(this.prisma, rows);
  }

  async getWarehouseInStockPage(
    principal: Principal,
    query: WarehouseInStockPageQuery
  ): Promise<WarehouseInStockPageResponse> {
    const page = Math.max(1, Math.trunc(Number(query.page) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(Number(query.pageSize) || 10)));
    const warehouseWideScope = isAdministratorRole(principal.role)
      || ['WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role);
    // 数据范围由服务端岗位/权限派生；客户端 dataScope 只用于展示偏好，不能扩权。
    const businessCustomerScoped = !warehouseWideScope;
    const salespeople = principal.departmentTeamScope?.filter(Boolean).length
      ? principal.departmentTeamScope!.filter(Boolean)
      : [principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value));
    const ownedCustomerCodes = businessCustomerScoped
      ? (await this.prisma.customer.findMany({
          where: { salesperson: { in: salespeople } },
          select: { code: true }
        })).map((customer) => customer.code)
      : undefined;
    const where: Record<string, unknown> = query.status === 'TALLIED_ARCHIVED'
      ? { status: 'TALLIED_ARCHIVED', archivedAt: { gte: resolveWarehouseTallyRecentCutoff() } }
      : { status: 'RECEIVED' };
    if (query.site?.trim() && !businessCustomerScoped) where.site = query.site.trim();
    if (query.customerOrderNo?.trim()) {
      where.customerOrderNo = { contains: query.customerOrderNo.trim(), mode: 'insensitive' };
    }
    if (query.domesticTrackingNo?.trim()) {
      where.domesticTrackingNo = { contains: query.domesticTrackingNo.trim(), mode: 'insensitive' };
    }
    if (query.combinedOrderNo?.trim()) {
      where.combinedOrderNo = { contains: query.combinedOrderNo.trim(), mode: 'insensitive' };
    }
    if (ownedCustomerCodes) where.customerCode = { in: ownedCustomerCodes };
    if (query.operationKeyword?.trim()) {
      const normalizedKeyword = query.operationKeyword.trim().toLowerCase();
      const logs = await this.prisma.auditLog.findMany({
        where: { action: { startsWith: 'warehouse.' } },
        select: { target: true, action: true, before: true, after: true },
        take: 500
      });
      const ids = Array.from(new Set(logs
        .filter((row) => `${row.action} ${row.target} ${JSON.stringify(row.before ?? '')} ${JSON.stringify(row.after ?? '')}`.toLowerCase().includes(normalizedKeyword))
        .map((row) => row.target)
        .filter(Boolean)));
      where.id = ids.length ? { in: ids } : { in: ['__none__'] };
    }

    const aggregateWhere = buildWarehouseInStockAggregateWhere(where);
    const [aggregateRows, pageRows, waitingDispatchTickets] = await Promise.all([
      this.prisma.$queryRaw<WarehouseInStockAggregateRow[]>(Prisma.sql`
        WITH "filtered" AS (
          SELECT
            "combinedOrderNo",
            "customerOrderNo",
            "domesticTrackingNo",
            "packageCount",
            "weightKg",
            "cbm",
            "status",
            "manualException",
            "exceptions"
          FROM "WarehousePackage"
          WHERE ${aggregateWhere}
        ),
        "tickets" AS (
          SELECT
            COALESCE(NULLIF("combinedOrderNo", ''), "customerOrderNo" || '-' || "domesticTrackingNo") AS "ticketKey",
            BOOL_OR("status" = 'RECEIVED') AS "pendingTally",
            BOOL_OR(("manualException" IS NOT NULL AND "manualException" <> '') OR cardinality("exceptions") > 0) AS "hasException"
          FROM "filtered"
          GROUP BY 1
        )
        SELECT
          COUNT(*)::bigint AS "totalItems",
          (SELECT COUNT(*)::bigint FROM "tickets") AS "receiptTickets",
          COALESCE(SUM("packageCount"), 0)::bigint AS "totalPackages",
          COALESCE(SUM("weightKg"::double precision * "packageCount"), 0::double precision) AS "totalWeightKg",
          COALESCE(SUM("cbm"::double precision), 0::double precision) AS "totalCbm",
          (SELECT COUNT(*)::bigint FROM "tickets" WHERE "pendingTally") AS "pendingTallyTickets",
          (SELECT COUNT(*)::bigint FROM "tickets" WHERE "hasException") AS "exceptionTickets"
        FROM "filtered"
      `),
      this.prisma.warehousePackage.findMany({
        where,
        orderBy: [{ scanTime: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.shipment.count({
        where: {
          status: 'WAITING_DISPATCH',
          ...(businessCustomerScoped ? { customer: { salesperson: principal.username } } : {})
        }
      })
    ]);
    const summaries = await mapWarehousePackagesWithConfirmedTally(this.prisma, pageRows);
    const customerCodes = Array.from(new Set(summaries.map((row) => row.customerCode).filter(Boolean)));
    const maintainedCustomers = customerCodes.length
      ? await this.prisma.customer.findMany({
          where: { code: { in: customerCodes } },
          select: { code: true, salesperson: true }
        })
      : [];
    const maintainedCustomerCodes = new Set(maintainedCustomers.map((customer) => customer.code));
    const salespersonByCustomerCode = new Map(
      maintainedCustomers.map((customer) => [customer.code, customer.salesperson?.trim() || undefined])
    );
    const scopedRows = summaries.map((row) => ({
      ...row,
      customerMaintained: maintainedCustomerCodes.has(row.customerCode),
      salesperson: salespersonByCustomerCode.get(row.customerCode)
    }));
    const visibleRows = businessCustomerScoped
      ? scopedRows.map(({ site: _site, ...row }) => row)
      : scopedRows;
    const aggregate = aggregateRows[0] ?? emptyWarehouseInStockAggregate();
    const totalItems = Number(aggregate.totalItems);
    const response: WarehouseInStockPageResponse = {
      totals: {
        receiptTickets: Number(aggregate.receiptTickets),
        totalPackages: Number(aggregate.totalPackages),
        totalWeightKg: roundWarehouseAggregate(aggregate.totalWeightKg),
        totalCbm: roundWarehouseAggregate(aggregate.totalCbm),
        waitingDispatchTickets,
        pendingTallyTickets: Number(aggregate.pendingTallyTickets),
        exceptionTickets: Number(aggregate.exceptionTickets)
      },
      rows: visibleRows,
      pagination: { page, pageSize, totalItems }
    };
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'warehouse.in_stock.view',
        target: 'warehouse:in-stock',
        after: JSON.parse(JSON.stringify({ query, rowCount: visibleRows.length, totalItems }))
      }
    });
    return response;
  }

  async getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]> {
    return summarizeWarehousePackageGroups(await this.getWarehousePackages(principal));
  }

  async getWarehouseManualReceiptCustomers(principal: Principal) {
    const salesScope = principal.dataScope === 'SALES_OWN'
      ? [principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value))
      : principal.departmentTeamScope?.filter(Boolean);
    let siteSalespeople: string[] | undefined;
    if (principal.role !== 'ADMIN' && !principal.shipmentAllView && !salesScope?.length) {
      if (!principal.site) throw new ForbiddenException('当前岗位未配置客户或站点数据范围');
      siteSalespeople = (await this.prisma.user.findMany({ where: { site: principal.site, enabled: true }, select: { username: true } }))
        .map((user) => user.username);
    }
    const customers = await this.prisma.customer.findMany({
      where: {
        enabled: true,
        ...(principal.role !== 'ADMIN' && !principal.shipmentAllView ? { salesperson: { in: salesScope?.length ? salesScope : siteSalespeople ?? [] } } : {})
      },
      select: { code: true, name: true },
      orderBy: { code: 'asc' }
    });
    return customers.map((customer) => ({ code: customer.code, name: customer.name }));
  }

  async findDuplicateMojiaPackage(
    principal: Principal,
    query: MojiaWarehouseDuplicateQuery
  ): Promise<{ combinedOrderNo: string } | undefined> {
    const scanTimeSecond = query.scanTime ? Math.floor(new Date(query.scanTime).getTime() / 1000) : undefined;
    const row = await (this.prisma as any).warehousePackage.findFirst({
      where: {
        combinedOrderNo: query.combinedOrderNo,
        scanSource: '墨家设备',
        ...(scanTimeSecond
          ? { scanTime: { gte: new Date(scanTimeSecond * 1000), lt: new Date((scanTimeSecond + 1) * 1000) } }
          : {}),
        ...(query.remark ? { remark: query.remark } : {})
      },
      select: { combinedOrderNo: true },
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    return row ? { combinedOrderNo: query.combinedOrderNo } : undefined;
  }

}

function buildWarehouseInStockAggregateWhere(where: Record<string, unknown>): Prisma.Sql {
  const filters: Prisma.Sql[] = [];
  const status = typeof where.status === 'string' ? where.status : undefined;
  if (status) filters.push(Prisma.sql`"status" = ${status}`);
  const archivedAt = where.archivedAt as { gte?: Date } | undefined;
  if (archivedAt?.gte) filters.push(Prisma.sql`"archivedAt" >= ${archivedAt.gte}`);
  if (typeof where.site === 'string') filters.push(Prisma.sql`"site" = ${where.site}`);
  appendInsensitiveContainsFilter(filters, 'customerOrderNo', where.customerOrderNo);
  appendInsensitiveContainsFilter(filters, 'domesticTrackingNo', where.domesticTrackingNo);
  appendInsensitiveContainsFilter(filters, 'combinedOrderNo', where.combinedOrderNo);
  appendStringInFilter(filters, 'customerCode', where.customerCode);
  appendStringInFilter(filters, 'id', where.id);
  if (!filters.length) throw new Error('仓库在库汇总缺少查询范围');
  return Prisma.join(filters, ' AND ');
}

function appendInsensitiveContainsFilter(
  filters: Prisma.Sql[],
  column: 'customerOrderNo' | 'domesticTrackingNo' | 'combinedOrderNo',
  value: unknown
) {
  const contains = (value as { contains?: unknown } | undefined)?.contains;
  if (typeof contains !== 'string') return;
  const pattern = `%${contains}%`;
  if (column === 'customerOrderNo') filters.push(Prisma.sql`"customerOrderNo" ILIKE ${pattern}`);
  if (column === 'domesticTrackingNo') filters.push(Prisma.sql`"domesticTrackingNo" ILIKE ${pattern}`);
  if (column === 'combinedOrderNo') filters.push(Prisma.sql`"combinedOrderNo" ILIKE ${pattern}`);
}

function appendStringInFilter(
  filters: Prisma.Sql[],
  column: 'customerCode' | 'id',
  value: unknown
) {
  const values = (value as { in?: unknown } | undefined)?.in;
  if (!Array.isArray(values) || values.some((item) => typeof item !== 'string')) return;
  if (!values.length) {
    filters.push(Prisma.sql`FALSE`);
    return;
  }
  if (column === 'customerCode') filters.push(Prisma.sql`"customerCode" IN (${Prisma.join(values)})`);
  if (column === 'id') filters.push(Prisma.sql`"id" IN (${Prisma.join(values)})`);
}

function emptyWarehouseInStockAggregate(): WarehouseInStockAggregateRow {
  return {
    totalItems: 0n,
    receiptTickets: 0n,
    totalPackages: 0n,
    totalWeightKg: 0,
    totalCbm: 0,
    pendingTallyTickets: 0n,
    exceptionTickets: 0n
  };
}

function roundWarehouseAggregate(value: Prisma.Decimal | number): number {
  return Math.round(Number(value) * 100) / 100;
}

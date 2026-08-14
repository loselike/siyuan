import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma.service.js';
import type { Principal, PermissionKey } from '../../rbac.js';
import { isAdministratorRole, isBusinessAgentRestrictedRole } from '../../rbac.js';
import type { WarehouseInStockQuery, WarehouseInStockResponse } from '@siyuan/shared/warehouse';
import {
  mapWarehousePackagesWithConfirmedTally,
  resolveWarehouseTallyRecentCutoff
} from '../warehouse-query.shared.js';
import { summarizeWarehouseInStockTotals } from './warehouse-inventory-query.logic.js';

export interface WarehouseInStockQueryAuthorizer {
  hasPermission(role: Principal['role'], permission: PermissionKey): Promise<boolean>;
}

/**
 * The in-stock list is kept as one explicit strategy so both the public
 * legacy repository method and the warehouse module adapter use the same
 * permission, scope, filtering, mapping and audit contract.
 */
export async function getWarehouseInStock(
  prisma: PrismaService,
  authorizer: WarehouseInStockQueryAuthorizer,
  principal: Principal,
  query: WarehouseInStockQuery
): Promise<WarehouseInStockResponse> {
  if (!(await authorizer.hasPermission(principal.role, 'warehouse:in-stock:view'))) {
    throw new ForbiddenException('当前角色不能查看在仓数据');
  }
  const warehouseWideScope = isAdministratorRole(principal.role)
    || ['WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role);
  // 业务员默认只看当前归属给自己的客户；主动选择“全部”时可读取全仓货物事实数据。
  const businessCustomerScoped = !warehouseWideScope && !isBusinessAgentRestrictedRole(principal.role);
  const salespeople = principal.departmentTeamScope?.filter(Boolean).length
    ? principal.departmentTeamScope!.filter(Boolean)
    : [principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value));
  const ownedCustomerCodes = businessCustomerScoped
    ? (await prisma.customer.findMany({
      where: { salesperson: { in: salespeople } },
      select: { code: true }
    })).map((customer) => customer.code)
    : undefined;
  const archivedOnly = query.status === 'TALLIED_ARCHIVED';
  const where: Record<string, unknown> = archivedOnly
    ? { status: 'TALLIED_ARCHIVED', archivedAt: { gte: resolveWarehouseTallyRecentCutoff() } }
    : { status: 'RECEIVED' };
  if (query.site?.trim() && !businessCustomerScoped) {
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
  if (query.keyword?.trim()) {
    const keyword = query.keyword.trim();
    where.OR = [
      { customerCode: { contains: keyword, mode: 'insensitive' } },
      { customerName: { contains: keyword, mode: 'insensitive' } },
      { customerOrderNo: { contains: keyword, mode: 'insensitive' } },
      { domesticTrackingNo: { contains: keyword, mode: 'insensitive' } },
      { combinedOrderNo: { contains: keyword, mode: 'insensitive' } },
      { systemOrderNo: { contains: keyword, mode: 'insensitive' } },
      { receivingChannel: { contains: keyword, mode: 'insensitive' } },
      { destinationCountry: { contains: keyword, mode: 'insensitive' } },
      { site: { contains: keyword, mode: 'insensitive' } }
    ];
  }
  if (ownedCustomerCodes) {
    where.customerCode = { in: ownedCustomerCodes };
  }
  if (query.operationKeyword?.trim()) {
    const keyword = query.operationKeyword.trim();
    const logs = await (prisma as any).auditLog.findMany({
      where: { action: { startsWith: 'warehouse.' } },
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
  const rows = await (prisma as any).warehousePackage.findMany({
    where,
    orderBy: [{ scanTime: 'desc' }, { createdAt: 'desc' }]
  });
  const summaries = await mapWarehousePackagesWithConfirmedTally(prisma, rows);
  const customerCodes = Array.from(new Set(summaries.map((row) => row.customerCode).filter(Boolean)));
  const maintainedCustomers = customerCodes.length
    ? await prisma.customer.findMany({
      where: { code: { in: customerCodes } },
      select: { code: true, salesperson: true }
    })
    : [];
  const maintainedCustomerCodes = new Set(maintainedCustomers.map((customer) => customer.code));
  const salespersonByCustomerCode = new Map(
    maintainedCustomers.map((customer) => [customer.code, customer.salesperson?.trim() || undefined])
  );
  const currentlyOwnedCustomerCodes = businessCustomerScoped
    ? new Set(maintainedCustomers
      .filter((customer) => customer.salesperson && salespeople.includes(customer.salesperson))
      .map((customer) => customer.code))
    : undefined;
  const scopedSummaries = summaries
    .filter((row) => !currentlyOwnedCustomerCodes || currentlyOwnedCustomerCodes.has(row.customerCode))
    .map((row) => ({
      ...row,
      customerMaintained: maintainedCustomerCodes.has(row.customerCode),
      salesperson: salespersonByCustomerCode.get(row.customerCode)
    }));
  const visibleRows = businessCustomerScoped
    ? scopedSummaries.map(({ site: _site, ...row }) => row)
    : scopedSummaries;
  const waitingDispatchTickets = await prisma.shipment.count({
    where: {
      status: 'WAITING_DISPATCH',
      ...(businessCustomerScoped ? { customer: { salesperson: { in: salespeople } } } : {})
    }
  });
  const response: WarehouseInStockResponse = {
    totals: summarizeWarehouseInStockTotals(scopedSummaries, waitingDispatchTickets),
    rows: visibleRows
  };
  await prisma.auditLog.create({
    data: {
      actorId: principal.id,
      action: 'warehouse.in_stock.view',
      target: 'warehouse:in-stock',
      after: JSON.parse(JSON.stringify({ query, rowCount: visibleRows.length }))
    }
  });
  return response;
}

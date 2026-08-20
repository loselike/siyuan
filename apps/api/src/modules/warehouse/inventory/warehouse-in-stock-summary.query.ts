import { ForbiddenException } from '@nestjs/common';
import type { WarehouseInStockResponse } from '@siyuan/shared/warehouse';
import type { PrismaService } from '../../prisma.service.js';
import {
  isAdministratorRole,
  isBusinessAgentRestrictedRole,
  type PermissionKey,
  type Principal
} from '../../rbac.js';
import { queryWarehouseInStockAggregate } from './warehouse-in-stock-aggregate.query.js';

export interface WarehouseInStockSummaryAuthorizer {
  hasPermission(role: Principal['role'], permission: PermissionKey): Promise<boolean>;
}

/**
 * Shared Prisma summary strategy used by the module adapter and the legacy
 * repository wrapper. Keeping the policy, aggregate and audit write together
 * prevents the two entry points from drifting during the strangler migration.
 */
export async function getWarehouseInStockSummary(
  prisma: PrismaService,
  authorizer: WarehouseInStockSummaryAuthorizer,
  principal: Principal
): Promise<Pick<WarehouseInStockResponse, 'totals'>> {
  const canDashboard = await authorizer.hasPermission(principal.role, 'warehouse:dashboard:view');
  const canInStock = canDashboard || await authorizer.hasPermission(principal.role, 'warehouse:in-stock:view');
  if (!canDashboard && !canInStock) {
    throw new ForbiddenException('当前角色不能查看仓库看板或在仓汇总');
  }
  const warehouseWideScope = isAdministratorRole(principal.role)
    || ['WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role);
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
  const [aggregate, waitingDispatchTickets] = await Promise.all([
    queryWarehouseInStockAggregate(prisma, {
      status: 'RECEIVED',
      ...(ownedCustomerCodes ? { customerCode: { in: ownedCustomerCodes } } : {})
    }, businessCustomerScoped ? salespeople : undefined),
    prisma.shipment.count({
      where: {
        status: 'WAITING_DISPATCH',
        ...(businessCustomerScoped ? { customer: { salesperson: { in: salespeople } } } : {})
      }
    })
  ]);
  const response = {
    totals: {
      receiptTickets: aggregate.receiptTickets,
      totalPackages: aggregate.totalPackages,
      totalWeightKg: aggregate.totalWeightKg,
      totalCbm: aggregate.totalCbm,
      waitingDispatchTickets,
      pendingTallyTickets: aggregate.pendingTallyTickets,
      exceptionTickets: aggregate.exceptionTickets
    }
  };
  await prisma.auditLog.create({
    data: {
      actorId: principal.id,
      action: 'warehouse.in_stock.view',
      target: 'warehouse:in-stock',
      after: JSON.parse(JSON.stringify({ query: {}, rowCount: aggregate.totalItems }))
    }
  });
  return response;
}

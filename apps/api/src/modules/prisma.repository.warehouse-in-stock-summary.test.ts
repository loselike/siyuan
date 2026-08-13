import { describe, expect, it, vi } from 'vitest';
import { PrismaRepository } from './prisma.repository.js';
import type { PrismaService } from './prisma.service.js';
import type { Principal } from './rbac.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };

describe('PrismaRepository warehouse in-stock summary', () => {
  it('uses the database aggregate while preserving totals and audit row count', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{
      totalItems: 2n,
      receiptTickets: 1n,
      totalPackages: 3n,
      totalWeightKg: 25,
      totalCbm: 0.08,
      pendingTallyTickets: 1n,
      exceptionTickets: 1n
    }]);
    const auditCreate = vi.fn().mockResolvedValue({});
    const repository = new PrismaRepository({
      $queryRaw: queryRaw,
      shipment: { count: vi.fn().mockResolvedValue(3) },
      auditLog: { create: auditCreate }
    } as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);

    await expect(repository.getWarehouseInStockSummary(admin)).resolves.toEqual({
      totals: {
        receiptTickets: 1,
        totalPackages: 3,
        totalWeightKg: 25,
        totalCbm: 0.08,
        waitingDispatchTickets: 3,
        pendingTallyTickets: 1,
        exceptionTickets: 1
      }
    });

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'warehouse.in_stock.view',
        target: 'warehouse:in-stock',
        after: { query: {}, rowCount: 2 }
      })
    }));
  });

  it('keeps the business team customer scope and waiting-dispatch scope unchanged', async () => {
    const business: Principal = {
      id: 'u-business',
      username: 'operator',
      role: 'OPERATOR',
      departmentTeamScope: ['operator', 'teammate']
    };
    const customerFindMany = vi.fn().mockResolvedValue([{ code: 'C001' }, { code: 'C002' }]);
    const queryRaw = vi.fn().mockResolvedValue([{
      totalItems: 1n,
      receiptTickets: 1n,
      totalPackages: 1n,
      totalWeightKg: 10,
      totalCbm: 0.06,
      pendingTallyTickets: 1n,
      exceptionTickets: 0n
    }]);
    const shipmentCount = vi.fn().mockResolvedValue(2);
    const repository = new PrismaRepository({
      customer: { findMany: customerFindMany },
      $queryRaw: queryRaw,
      shipment: { count: shipmentCount },
      auditLog: { create: vi.fn().mockResolvedValue({}) }
    } as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);

    await repository.getWarehouseInStockSummary(business);

    expect(customerFindMany).toHaveBeenCalledTimes(1);
    expect(customerFindMany).toHaveBeenCalledWith({
      where: { salesperson: { in: ['operator', 'teammate'] } },
      select: { code: true }
    });
    const aggregateSql = queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(aggregateSql.sql).toContain('"customerCode" IN (?,?)');
    expect(aggregateSql.sql).toContain('"Customer"."salesperson" IN (?,?)');
    expect(aggregateSql.values).toEqual(['RECEIVED', 'C001', 'C002', 'operator', 'teammate']);
    expect(shipmentCount).toHaveBeenCalledWith({
      where: {
        status: 'WAITING_DISPATCH',
        customer: { salesperson: { in: ['operator', 'teammate'] } }
      }
    });
  });

  it('keeps an empty business customer scope empty inside the aggregate statement', async () => {
    const business: Principal = { id: 'u-empty', username: 'nobody', role: 'OPERATOR' };
    const queryRaw = vi.fn().mockResolvedValue([{
      totalItems: 0n,
      receiptTickets: 0n,
      totalPackages: 0n,
      totalWeightKg: 0,
      totalCbm: 0,
      pendingTallyTickets: 0n,
      exceptionTickets: 0n
    }]);
    const repository = new PrismaRepository({
      customer: { findMany: vi.fn().mockResolvedValue([]) },
      $queryRaw: queryRaw,
      shipment: { count: vi.fn().mockResolvedValue(0) },
      auditLog: { create: vi.fn().mockResolvedValue({}) }
    } as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);

    await expect(repository.getWarehouseInStockSummary(business)).resolves.toEqual({
      totals: {
        receiptTickets: 0,
        totalPackages: 0,
        totalWeightKg: 0,
        totalCbm: 0,
        waitingDispatchTickets: 0,
        pendingTallyTickets: 0,
        exceptionTickets: 0
      }
    });

    const aggregateSql = queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(aggregateSql.sql.match(/FALSE/g)).toHaveLength(1);
    expect(aggregateSql.values).toEqual(['RECEIVED', 'nobody']);
  });
});

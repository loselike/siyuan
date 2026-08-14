import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma.service.js';
import type { Principal } from '../../rbac.js';
import { PrismaWarehouseInventoryQueryRepository } from './warehouse-inventory-query.repository.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const operator: Principal = { id: 'u-operator', username: 'operator', role: 'OPERATOR' };

function packageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pkg-1',
    customerCode: 'C001',
    customerOrderNo: 'ORDER-1',
    domesticTrackingNo: 'SF001',
    combinedOrderNo: 'ORDER-1-SF001',
    receivingChannel: '仓库设备',
    expectedTotalPackageCount: 3,
    packageIndex: 1,
    packageCount: 1,
    weightKg: 10,
    lengthCm: 50,
    widthCm: 40,
    heightCm: 30,
    cbm: 0.06,
    volumetricWeightKg: 10,
    chargeableWeightKg: 10,
    divisor: 6000,
    roundingRule: 'NONE',
    scanTime: new Date('2026-07-25T01:00:00.000Z'),
    status: 'RECEIVED',
    exceptions: [],
    createdAt: new Date('2026-07-25T01:00:00.000Z'),
    ...overrides
  };
}

function createRepository(prisma: Record<string, unknown>) {
  return new PrismaWarehouseInventoryQueryRepository(
    prisma as unknown as PrismaService,
    { hasPermission: vi.fn().mockImplementation(async (role: Principal['role']) => role === 'ADMIN') }
  );
}

describe('PrismaWarehouseInventoryQueryRepository', () => {
  it('keeps package ordering, confirmed tally state and response mapping unchanged', async () => {
    const packageFindMany = vi.fn().mockResolvedValue([
      packageRow(),
      packageRow({ id: 'pkg-2', packageIndex: 2, tallyTaskId: 'task-completed', tallyTaskNo: 'TL-002' }),
      packageRow({ id: 'pkg-3', customerOrderNo: 'ORDER-2', domesticTrackingNo: 'SF002', combinedOrderNo: 'ORDER-2-SF002' })
    ]);
    const tallyFindMany = vi.fn().mockResolvedValue([
      { id: 'task-pending', taskNo: 'TL-001', status: 'PENDING', tallyProgressStatus: 'IN_PROGRESS', packageIds: ['pkg-1'], appliedPackageId: null },
      { id: 'task-completed', taskNo: 'TL-002', status: 'COMPLETED', tallyProgressStatus: 'COMPLETED', packageIds: ['pkg-source'], appliedPackageId: 'pkg-2' }
    ]);
    const repository = createRepository({
      warehousePackage: { findMany: packageFindMany },
      warehouseTallyTask: { findMany: tallyFindMany }
    });

    const result = await repository.getWarehousePackages(admin);

    expect(packageFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    expect(tallyFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { packageIds: { hasSome: ['pkg-1', 'pkg-2', 'pkg-3'] } },
          { appliedPackageId: { in: ['pkg-1', 'pkg-2', 'pkg-3'] } },
          { id: { in: ['task-completed'] } }
        ]
      },
      select: {
        id: true,
        taskNo: true,
        status: true,
        packageIds: true,
        appliedPackageId: true,
        createdAt: true,
        tallyProgressStatus: true
      },
      orderBy: { createdAt: 'asc' }
    });
    expect(result).toEqual([
      expect.objectContaining({ id: 'pkg-1', tallyTaskId: 'task-pending', tallyTaskNo: 'TL-001', tallyCompleted: false, tallyStatus: '理货中' }),
      expect.objectContaining({ id: 'pkg-2', tallyTaskId: 'task-completed', tallyTaskNo: 'TL-002', tallyCompleted: true, tallyStatus: '已理货' }),
      expect.objectContaining({ id: 'pkg-3', tallyTaskId: undefined, tallyTaskNo: undefined, tallyCompleted: false, tallyStatus: '待理货' })
    ]);
  });

  it('keeps package grouping and enabled-customer ordering unchanged', async () => {
    const packageFindMany = vi.fn().mockResolvedValue([
      packageRow(),
      packageRow({ id: 'pkg-2', packageIndex: 2, weightKg: 12, scanTime: new Date('2026-07-25T02:00:00.000Z') })
    ]);
    const customerFindMany = vi.fn().mockResolvedValue([
      { code: 'C001', name: '客户一' },
      { code: 'C002', name: '客户二' }
    ]);
    const repository = createRepository({
      warehousePackage: { findMany: packageFindMany },
      warehouseTallyTask: { findMany: vi.fn().mockResolvedValue([]) },
      customer: { findMany: customerFindMany }
    });

    await expect(repository.getWarehousePackageGroups(admin)).resolves.toEqual([
      expect.objectContaining({
        combinedOrderNo: 'ORDER-1-SF001',
        expectedTotalPackageCount: 3,
        arrivedPackageCount: 2,
        remainingPackageCount: 1,
        totalActualWeightKg: 22,
        latestScanTime: '2026-07-25T02:00:00.000Z'
      })
    ]);
    await expect(repository.getWarehouseManualReceiptCustomers(admin)).resolves.toEqual([
      { code: 'C001', name: '客户一' },
      { code: 'C002', name: '客户二' }
    ]);
    expect(customerFindMany).toHaveBeenCalledWith({
      where: { enabled: true },
      select: { code: true, name: true },
      orderBy: { code: 'asc' }
    });
  });

  it('finds a Mojia duplicate with one indexed row query instead of loading inventory', async () => {
    const packageFindFirst = vi.fn().mockResolvedValue({ combinedOrderNo: 'ORDER-1-SF001' });
    const packageFindMany = vi.fn();
    const tallyFindMany = vi.fn();
    const repository = createRepository({
      warehousePackage: { findFirst: packageFindFirst, findMany: packageFindMany },
      warehouseTallyTask: { findMany: tallyFindMany }
    });

    await expect(repository.findDuplicateMojiaPackage(admin, {
      combinedOrderNo: 'ORDER-1-SF001',
      scanTime: '2026-07-25T01:00:00.987Z',
      remark: '设备号：MJ20210327'
    })).resolves.toEqual({ combinedOrderNo: 'ORDER-1-SF001' });

    expect(packageFindFirst).toHaveBeenCalledWith({
      where: {
        combinedOrderNo: 'ORDER-1-SF001',
        scanSource: '墨家设备',
        scanTime: {
          gte: new Date('2026-07-25T01:00:00.000Z'),
          lt: new Date('2026-07-25T01:00:01.000Z')
        },
        remark: '设备号：MJ20210327'
      },
      select: { combinedOrderNo: true },
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    expect(packageFindMany).not.toHaveBeenCalled();
    expect(tallyFindMany).not.toHaveBeenCalled();
  });

  it('keeps invalid-time and empty-remark duplicate matching semantics unchanged', async () => {
    const packageFindFirst = vi.fn().mockResolvedValue(null);
    const repository = createRepository({
      warehousePackage: { findFirst: packageFindFirst },
      warehouseTallyTask: { findMany: vi.fn() }
    });

    await expect(repository.findDuplicateMojiaPackage(admin, {
      combinedOrderNo: 'ORDER-1-SF001',
      scanTime: 'bad-time',
      remark: ''
    })).resolves.toBeUndefined();

    expect(packageFindFirst).toHaveBeenCalledWith({
      where: {
        combinedOrderNo: 'ORDER-1-SF001',
        scanSource: '墨家设备'
      },
      select: { combinedOrderNo: true },
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
  });

  it('keeps warehouse inventory full-scope for a recognized business role', async () => {
    const scopedRow = packageRow({ site: '深圳仓' });
    const packageFindMany = vi.fn().mockResolvedValue([scopedRow]);
    const queryRaw = vi.fn().mockResolvedValue([{
      totalItems: 1n,
      receiptTickets: 1n,
      totalPackages: 1n,
      totalWeightKg: 10,
      totalCbm: 0.06,
      pendingTallyTickets: 1n,
      exceptionTickets: 0n
    }]);
    const customerFindMany = vi.fn().mockResolvedValue([{ code: 'C001', salesperson: 'operator' }]);
    const repository = createRepository({
      warehousePackage: { findMany: packageFindMany },
      $queryRaw: queryRaw,
      warehouseTallyTask: { findMany: vi.fn().mockResolvedValue([]) },
      customer: { findMany: customerFindMany },
      shipment: { count: vi.fn().mockResolvedValue(0) },
      auditLog: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn() }
    });

    const response = await repository.getWarehouseInStockPage(operator, { dataScope: 'OWN' });

    expect(response.rows).toEqual([expect.objectContaining({ site: '深圳仓', salesperson: 'operator' })]);
    expect(packageFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'RECEIVED' }
    }));
    const aggregateSql = queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(aggregateSql.sql).not.toContain('"customerCode" IN (?)');
    expect(aggregateSql.values).toEqual(['RECEIVED']);
  });

  it('keeps page totals and audit semantics while avoiding an unbounded package read', async () => {
    const pageRows = [packageRow({ id: 'pkg-page-2', packageCount: 2, weightKg: 4, cbm: 0.03 })];
    const packageFindMany = vi.fn().mockResolvedValue(pageRows);
    const queryRaw = vi.fn().mockResolvedValue([{
      totalItems: 3n,
      receiptTickets: 2n,
      totalPackages: 6n,
      totalWeightKg: 29,
      totalCbm: 0.12,
      pendingTallyTickets: 2n,
      exceptionTickets: 1n
    }]);
    const auditCreate = vi.fn().mockResolvedValue({});
    const repository = createRepository({
      warehousePackage: {
        findMany: packageFindMany
      },
      warehouseTallyTask: { findMany: vi.fn().mockResolvedValue([]) },
      customer: { findMany: vi.fn().mockResolvedValue([{ code: 'C001', salesperson: 'operator' }]) },
      shipment: { count: vi.fn().mockResolvedValue(4) },
      auditLog: { create: auditCreate, findMany: vi.fn() },
      $queryRaw: queryRaw
    });

    await expect(repository.getWarehouseInStockPage(admin, { page: 2, pageSize: 1 })).resolves.toEqual({
      totals: {
        receiptTickets: 2,
        totalPackages: 6,
        totalWeightKg: 29,
        totalCbm: 0.12,
        waitingDispatchTickets: 4,
        pendingTallyTickets: 2,
        exceptionTickets: 1
      },
      rows: [expect.objectContaining({ id: 'pkg-page-2', packageCount: 2 })],
      pagination: { page: 2, pageSize: 1, totalItems: 3 }
    });

    expect(packageFindMany).toHaveBeenCalledTimes(1);
    expect(packageFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 1, take: 1 }));
    expect(queryRaw).toHaveBeenCalledTimes(1);
    const aggregateSql = queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(aggregateSql.sql).toContain('"WarehouseTallyTask"');
    expect(aggregateSql.sql).toContain('ANY(task."packageIds")');
    expect(aggregateSql.sql).toContain('task."status" = \'PENDING\'');
    expect(aggregateSql.sql).toContain('task."tallyProgressStatus" IN (\'WAITING\', \'IN_PROGRESS\')');
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'warehouse.in_stock.view',
        target: 'warehouse:in-stock',
        after: { query: { page: 2, pageSize: 1 }, rowCount: 1, totalItems: 3 }
      })
    });
  });

  it('keeps every supported page filter parameterized in the aggregate query', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{
      totalItems: 0n,
      receiptTickets: 0n,
      totalPackages: 0n,
      totalWeightKg: 0,
      totalCbm: 0,
      pendingTallyTickets: 0n,
      exceptionTickets: 0n
    }]);
    const auditFindMany = vi.fn().mockResolvedValue([{
      target: 'pkg-filtered',
      action: 'warehouse.receipt.create',
      before: null,
      after: { operator: '张三' }
    }]);
    const repository = createRepository({
      warehousePackage: { findMany: vi.fn().mockResolvedValue([]) },
      warehouseTallyTask: { findMany: vi.fn().mockResolvedValue([]) },
      shipment: { count: vi.fn().mockResolvedValue(0) },
      auditLog: { create: vi.fn().mockResolvedValue({}), findMany: auditFindMany },
      $queryRaw: queryRaw
    });

    await repository.getWarehouseInStockPage(admin, {
      status: 'TALLIED_ARCHIVED',
      site: '深圳仓',
      customerOrderNo: '订单',
      domesticTrackingNo: 'SF',
      combinedOrderNo: '合单',
      operationKeyword: '张三'
    });

    const aggregateSql = queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(aggregateSql.sql).toContain('"archivedAt" >= ?');
    expect(aggregateSql.sql).toContain('"site" = ?');
    expect(aggregateSql.sql).toContain('"customerOrderNo" ILIKE ?');
    expect(aggregateSql.sql).toContain('"domesticTrackingNo" ILIKE ?');
    expect(aggregateSql.sql).toContain('"combinedOrderNo" ILIKE ?');
    expect(aggregateSql.sql).toContain('"id" IN (?)');
    expect(aggregateSql.values).toEqual([
      'TALLIED_ARCHIVED',
      expect.any(Date),
      '深圳仓',
      '%订单%',
      '%SF%',
      '%合单%',
      'pkg-filtered'
    ]);
  });
});

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
    { hasPermission: vi.fn().mockResolvedValue(false) }
  );
}

describe('PrismaWarehouseInventoryQueryRepository', () => {
  it('returns one in-stock page while calculating totals from a narrow full-set projection', async () => {
    const rows = [packageRow({ id: 'pkg-2' }), packageRow({ id: 'pkg-1' })];
    const packageFindMany = vi.fn().mockImplementation((args: { select?: unknown }) =>
      args.select
        ? Promise.resolve(rows.map((row) => ({
            customerCode: row.customerCode,
            combinedOrderNo: row.combinedOrderNo,
            customerOrderNo: row.customerOrderNo,
            domesticTrackingNo: row.domesticTrackingNo,
            packageCount: row.packageCount,
            weightKg: row.weightKg,
            cbm: row.cbm,
            status: row.status,
            manualException: (row as Record<string, unknown>).manualException,
            exceptions: row.exceptions
          })))
        : Promise.resolve([rows[0]])
    );
    const auditCreate = vi.fn().mockResolvedValue({});
    const repository = createRepository({
      warehousePackage: { findMany: packageFindMany },
      warehouseTallyTask: { findMany: vi.fn().mockResolvedValue([]) },
      customer: { findMany: vi.fn().mockResolvedValue([{ code: 'C001', salesperson: 'sales-1' }]) },
      shipment: { count: vi.fn().mockResolvedValue(3) },
      auditLog: { create: auditCreate, findMany: vi.fn() }
    });

    await expect(repository.getWarehouseInStockPage(admin, { page: 2, pageSize: 1 }))
      .resolves.toEqual(expect.objectContaining({
        pagination: { page: 2, pageSize: 1, totalItems: 2 },
        rows: [expect.objectContaining({ id: 'pkg-2', customerMaintained: true, salesperson: 'sales-1' })],
        totals: expect.objectContaining({ receiptTickets: 1, totalPackages: 2, waitingDispatchTickets: 3 })
      }));

    expect(packageFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'RECEIVED' },
      skip: 1,
      take: 1,
      orderBy: [{ scanTime: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
    }));
    expect(packageFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'RECEIVED' },
      select: expect.not.objectContaining({ id: true, remark: true })
    }));
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'warehouse.in_stock.view' })
    }));
  });

  it('keeps package ordering, confirmed tally state and response mapping unchanged', async () => {
    const packageFindMany = vi.fn().mockResolvedValue([
      packageRow(),
      packageRow({ id: 'pkg-2', packageIndex: 2, tallyTaskId: 'task-completed', tallyTaskNo: 'TL-002' }),
      packageRow({ id: 'pkg-3', customerOrderNo: 'ORDER-2', domesticTrackingNo: 'SF002', combinedOrderNo: 'ORDER-2-SF002' })
    ]);
    const tallyFindMany = vi.fn().mockResolvedValue([
      { id: 'task-pending', taskNo: 'TL-001', status: 'PENDING', packageIds: ['pkg-1'], appliedPackageId: null },
      { id: 'task-completed', taskNo: 'TL-002', status: 'COMPLETED', packageIds: ['pkg-source'], appliedPackageId: 'pkg-2' }
    ]);
    const repository = createRepository({
      warehousePackage: { findMany: packageFindMany },
      warehouseTallyTask: { findMany: tallyFindMany }
    });

    const result = await repository.getWarehousePackages(admin);

    expect(packageFindMany).toHaveBeenCalledWith({
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
      select: { id: true, taskNo: true, status: true, packageIds: true, appliedPackageId: true, createdAt: true },
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

  it('enforces the owned-customer scope and strips site for a business role', async () => {
    const scopedRow = packageRow({ site: '深圳仓' });
    const packageFindMany = vi.fn().mockImplementation((args: { select?: unknown }) =>
      Promise.resolve(args.select
        ? [{
            customerCode: 'C001',
            combinedOrderNo: scopedRow.combinedOrderNo,
            customerOrderNo: scopedRow.customerOrderNo,
            domesticTrackingNo: scopedRow.domesticTrackingNo,
            packageCount: 1,
            weightKg: 10,
            cbm: 0.06,
            status: 'RECEIVED',
            manualException: null,
            exceptions: []
          }]
        : [scopedRow])
    );
    const customerFindMany = vi.fn()
      .mockResolvedValueOnce([{ code: 'C001' }])
      .mockResolvedValueOnce([{ code: 'C001', salesperson: 'operator' }]);
    const repository = createRepository({
      warehousePackage: { findMany: packageFindMany },
      warehouseTallyTask: { findMany: vi.fn().mockResolvedValue([]) },
      customer: { findMany: customerFindMany },
      shipment: { count: vi.fn().mockResolvedValue(0) },
      auditLog: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn() }
    });

    const response = await repository.getWarehouseInStockPage(operator, { dataScope: 'ALL' });

    expect(response.rows).toEqual([expect.not.objectContaining({ site: expect.anything() })]);
    expect(packageFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'RECEIVED', customerCode: { in: ['C001'] } }
    }));
  });
});

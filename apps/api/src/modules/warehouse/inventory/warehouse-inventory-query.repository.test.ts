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
  return new PrismaWarehouseInventoryQueryRepository(prisma as unknown as PrismaService);
}

describe('PrismaWarehouseInventoryQueryRepository', () => {
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
      select: { id: true, taskNo: true, status: true, packageIds: true, appliedPackageId: true }
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

  it('keeps the warehouse-role rejection text unchanged', async () => {
    const packageFindMany = vi.fn();
    const customerFindMany = vi.fn();
    const repository = createRepository({
      warehousePackage: { findMany: packageFindMany },
      warehouseTallyTask: { findMany: vi.fn() },
      customer: { findMany: customerFindMany }
    });

    await expect(repository.getWarehousePackages(operator)).rejects.toThrow('当前角色不能操作仓库管理');
    await expect(repository.getWarehouseManualReceiptCustomers(operator)).rejects.toThrow('当前角色不能操作仓库管理');
    await expect(repository.findDuplicateMojiaPackage(operator, { combinedOrderNo: 'ORDER-1-SF001' }))
      .rejects.toThrow('当前角色不能操作仓库管理');
    expect(packageFindMany).not.toHaveBeenCalled();
    expect(customerFindMany).not.toHaveBeenCalled();
  });
});

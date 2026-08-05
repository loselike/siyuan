import { describe, expect, it, vi } from 'vitest';
import type { PrismaRepository } from '../../prisma.repository.js';
import type { PrismaService } from '../../prisma.service.js';
import { PrismaWarehouseTallyQueryRepository } from './warehouse-tally-query.repository.js';
import {
  warehouseTallyAdminPrincipal as admin,
  warehouseTallyOperatorPrincipal as operator,
  warehouseTallyPackageRow as packageRow,
  warehouseTallyTaskRow as tallyTaskRow
} from './test-support/warehouse-tally-query.factory.js';

function createRepository(prisma: Record<string, unknown>, allowed = true) {
  const permissions = {
    hasPermission: vi.fn().mockResolvedValue(allowed)
  } as unknown as Pick<PrismaRepository, 'hasPermission'>;
  return {
    repository: new PrismaWarehouseTallyQueryRepository(prisma as unknown as PrismaService, permissions),
    permissions
  };
}

describe('PrismaWarehouseTallyQueryRepository', () => {
  it('keeps tally filters, salesperson scope and output-package mapping unchanged', async () => {
    const taskFindMany = vi.fn().mockResolvedValue([tallyTaskRow()]);
    const packageFindMany = vi.fn().mockResolvedValue([
      packageRow({ tallyTaskId: 'task-1' }),
      packageRow({ id: 'pkg-source', tallyTaskId: 'task-1' })
    ]);
    const { repository } = createRepository({
      warehouseTallyTask: { findMany: taskFindMany },
      warehousePackage: { findMany: packageFindMany }
    });

    const result = await repository.getWarehouseTallyTasks(operator, {
      status: 'COMPLETED',
      customerCode: ' C001 ',
      combinedOrderNo: ' SF001 '
    });

    expect(taskFindMany).toHaveBeenCalledWith({
      where: {
        status: 'COMPLETED',
        customerCode: { contains: 'C001', mode: 'insensitive' },
        sourceCombinedOrderNo: { contains: 'SF001', mode: 'insensitive' },
        salesperson: { in: ['operator', '业务员', '小思'] }
      },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }]
    });
    expect(packageFindMany).toHaveBeenCalledWith({
      where: { tallyTaskId: { in: ['task-1'] } },
      orderBy: [{ packageIndex: 'asc' }, { createdAt: 'asc' }]
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'task-1',
        taskNo: 'TL-001',
        outputPackages: [
          expect.objectContaining({ id: 'pkg-output', tallyStatus: '已理货', chargeableWeightKg: 10 })
        ]
      })
    ]);
  });

  it('keeps consolidation mapping and tally history-chain lookup unchanged', async () => {
    const consolidationFindMany = vi.fn().mockResolvedValue([{ package: packageRow() }]);
    const packageFindUnique = vi.fn()
      .mockResolvedValueOnce({ customerCode: 'C001', salesperson: 'operator' })
      .mockResolvedValue({ tallyTaskId: 'task-1', tallyTaskNo: 'TL-001' });
    const taskFindFirst = vi.fn().mockResolvedValue(tallyTaskRow());
    const { repository } = createRepository({
      warehouseConsolidationItem: { findMany: consolidationFindMany },
      warehousePackage: { findUnique: packageFindUnique },
      warehouseTallyTask: { findFirst: taskFindFirst }
    });

    await expect(repository.getWarehouseConsolidationItems(admin, 'consolidation-1')).resolves.toEqual([
      expect.objectContaining({ id: 'pkg-output', combinedOrderNo: 'ORDER-1-SF001' })
    ]);
    await expect(repository.getWarehouseTallyTaskHistoryChain(operator, ' pkg-output ')).resolves.toEqual([
      expect.objectContaining({ id: 'task-1', taskNo: 'TL-001' })
    ]);
    expect(consolidationFindMany).toHaveBeenCalledWith({
      where: { consolidationId: 'consolidation-1' },
      include: { package: true },
      orderBy: { id: 'asc' }
    });
    expect(taskFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'COMPLETED',
        customerCode: 'C001'
      })
    }));
  });

  it('keeps output fallback, missing-task error and permission denial unchanged', async () => {
    const outputPackageFindMany = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([packageRow({ id: 'pkg-source' })]);
    const taskFindUnique = vi.fn().mockResolvedValue(tallyTaskRow());
    const { repository } = createRepository({
      warehouseTallyTask: { findUnique: taskFindUnique },
      warehousePackage: { findMany: outputPackageFindMany }
    });

    await expect(repository.getWarehouseTallyTaskOutputPackages(admin, 'task-1')).resolves.toEqual([
      expect.objectContaining({ id: 'pkg-source' })
    ]);
    expect(outputPackageFindMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: ['pkg-source'] } },
      orderBy: [{ packageIndex: 'asc' }, { createdAt: 'asc' }]
    });

    const { repository: missingRepository } = createRepository({
      warehouseTallyTask: { findUnique: vi.fn().mockResolvedValue(null) },
      warehousePackage: { findMany: vi.fn() }
    });
    await expect(missingRepository.getWarehouseTallyTaskOutputPackages(admin, 'missing')).rejects.toThrow('理货任务不存在');

    const deniedFindMany = vi.fn();
    const { repository: deniedRepository } = createRepository({
      warehouseTallyTask: { findMany: deniedFindMany }
    }, false);
    await expect(deniedRepository.getWarehouseTallyTasks(operator)).rejects.toThrow('当前角色不能查看理货任务');
    expect(deniedFindMany).not.toHaveBeenCalled();
  });
});

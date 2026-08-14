import { describe, expect, it, vi } from 'vitest';
import { PrismaRepository } from './prisma.repository.js';
import type { PrismaService } from './prisma.service.js';
import type { PermissionKey, Principal } from './rbac.js';

const scopedUser: Principal = {
  id: 'u-scoped',
  username: 'scoped',
  name: '受限用户',
  role: 'WAREHOUSE_TODAY_ONLY'
};

function repositoryFor(findMany: ReturnType<typeof vi.fn>) {
  return new PrismaRepository({
    customer: { findMany: vi.fn().mockResolvedValue([]) },
    warehousePackage: { findMany },
    shipment: { count: vi.fn().mockResolvedValue(0) },
    auditLog: { create: vi.fn().mockResolvedValue({}) }
  } as unknown as PrismaService);
}

describe('PrismaRepository warehouse today receipt scope', () => {
  it('keeps historical date selection for roles that can also view in-stock data', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = repositoryFor(findMany);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);

    await repository.getWarehouseTodayReceipts(scopedUser, {
      datePreset: 'CUSTOM',
      customFrom: '2026-06-12',
      customTo: '2026-06-12'
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        scanTime: {
          gte: new Date('2026-06-11T16:00:00.000Z'),
          lt: new Date('2026-06-12T16:00:00.000Z')
        }
      })
    }));
  });

  it('clamps historical date input to today without in-stock permission', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T02:00:00.000Z'));
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = repositoryFor(findMany);
    vi.spyOn(repository, 'hasPermission').mockImplementation(async (_role, permission: PermissionKey) => (
      permission === 'warehouse:today-receipt:view'
    ));

    try {
      await repository.getWarehouseTodayReceipts(scopedUser, {
        datePreset: 'CUSTOM',
        customFrom: '2026-06-12',
        customTo: '2026-06-12'
      });
    } finally {
      vi.useRealTimers();
    }

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        scanTime: {
          gte: new Date('2026-08-13T16:00:00.000Z'),
          lt: new Date('2026-08-14T16:00:00.000Z')
        }
      })
    }));
  });
});

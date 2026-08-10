import { describe, expect, it, vi } from 'vitest';
import { PrismaRepository } from './prisma.repository.js';
import type { PrismaService } from './prisma.service.js';
import type { Principal } from './rbac.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };

describe('PrismaRepository warehouse in-stock summary', () => {
  it('selects only total fields and preserves the existing ticket calculations', async () => {
    const warehousePackageFindMany = vi.fn().mockResolvedValue([
      {
        combinedOrderNo: 'ORDER-1',
        customerOrderNo: 'C001-1',
        domesticTrackingNo: 'SF001',
        packageCount: 2,
        weightKg: 10,
        cbm: 0.06,
        status: 'RECEIVED',
        manualException: null,
        exceptions: []
      },
      {
        combinedOrderNo: 'ORDER-1',
        customerOrderNo: 'C001-1',
        domesticTrackingNo: 'SF002',
        packageCount: 1,
        weightKg: 5,
        cbm: 0.02,
        status: 'RECEIVED',
        manualException: '破损',
        exceptions: []
      }
    ]);
    const auditCreate = vi.fn().mockResolvedValue({});
    const repository = new PrismaRepository({
      warehousePackage: { findMany: warehousePackageFindMany },
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

    expect(warehousePackageFindMany).toHaveBeenCalledWith({
      where: { status: 'RECEIVED' },
      select: {
        customerCode: true,
        combinedOrderNo: true,
        customerOrderNo: true,
        domesticTrackingNo: true,
        packageCount: true,
        weightKg: true,
        cbm: true,
        status: true,
        manualException: true,
        exceptions: true
      }
    });
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'warehouse.in_stock.view',
        target: 'warehouse:in-stock'
      })
    }));
  });
});

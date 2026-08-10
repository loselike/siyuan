import { describe, expect, it, vi } from 'vitest';
import { PrismaRepository } from './prisma.repository.js';
import type { PrismaService } from './prisma.service.js';
import type { Principal } from './rbac.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };

function rentPackage(id: string, weightKg: number, cbm: number) {
  return {
    id,
    sourcePackageId: null,
    site: '深圳仓',
    salesperson: 'sales-1',
    customerCode: 'C001',
    customerName: '测试客户',
    domesticTrackingNo: 'SF001',
    packageCount: 1,
    weightKg,
    cbm,
    scanTime: new Date('2026-08-01T00:00:00.000Z'),
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    status: 'RECEIVED',
    measurementStatus: 'MEASURED',
    shipmentId: null
  };
}

describe('PrismaRepository warehouse rent page grouping', () => {
  it('loads every member of a rent group selected by the current page ids', async () => {
    const pageRow = rentPackage('pkg-page', 10, 0.1);
    const otherPageRow = rentPackage('pkg-other-page', 20, 0.2);
    const warehousePackageFindMany = vi.fn()
      .mockResolvedValueOnce([{ site: '深圳仓', customerCode: 'C001', domesticTrackingNo: 'SF001' }])
      .mockResolvedValueOnce([pageRow, otherPageRow]);
    const repository = new PrismaRepository({
      warehousePackage: { findMany: warehousePackageFindMany },
      warehouseRentRule: { findMany: vi.fn().mockResolvedValue([]) },
      shipment: { findMany: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({}) }
    } as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);

    const response = await repository.getWarehouseRentDetails(admin, {
      status: 'IN_STOCK',
      packageIds: ['pkg-page']
    });

    expect(warehousePackageFindMany).toHaveBeenNthCalledWith(1, {
      where: {
        status: { in: ['RECEIVED', 'CONSOLIDATED', 'SHIPPED'] },
        id: { in: ['pkg-page'] }
      },
      select: { site: true, customerCode: true, domesticTrackingNo: true }
    });
    expect(warehousePackageFindMany).toHaveBeenNthCalledWith(2, {
      where: {
        status: { in: ['RECEIVED', 'CONSOLIDATED', 'SHIPPED'] },
        OR: [{ site: '深圳仓', customerCode: 'C001', domesticTrackingNo: 'SF001' }]
      },
      orderBy: [{ scanTime: 'desc' }, { createdAt: 'desc' }]
    });
    expect(response.rows).toEqual([
      expect.objectContaining({ totalWeightKg: 30, totalCbm: 0.3 })
    ]);
  });
});

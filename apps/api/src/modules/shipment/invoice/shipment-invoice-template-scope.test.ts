import { describe, expect, it, vi } from 'vitest';
import { InMemoryRepository } from '../../in-memory.repository.js';
import { PrismaRepository } from '../../prisma.repository.js';
import type { PrismaService } from '../../prisma.service.js';
import type { Principal } from '../../rbac.js';

const manager: Principal = {
  id: 'manager-id',
  username: 'manager',
  role: 'UG_BUSINESS_MANAGER',
  departmentTeamScope: ['operator']
};

describe('shipment invoice template scope', () => {
  it('uses the same customer-or-entry team scope for the Prisma template lookup', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = new PrismaRepository({
      shipment: { findFirst }
    } as unknown as PrismaService);

    await expect(repository.downloadShipmentInvoiceTemplate(manager, 'team-shipment')).rejects.toThrow('运单不存在');

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'team-shipment',
        deletedAt: null,
        OR: [
          { entryBy: { in: ['operator'] } },
          { customer: { salesperson: { in: ['operator'] } } }
        ]
      })
    }));
  });

  it('does not extend the Prisma team read scope to invoice upload', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = new PrismaRepository({ shipment: { findFirst } } as unknown as PrismaService);

    await expect(repository.uploadShipmentBusinessInvoice(manager, 'team-shipment', {
      fileName: 'invoice.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 10,
      url: '/api/uploads/business-invoices/invoice.xlsx'
    })).rejects.toThrow('运单不存在');

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'team-shipment',
        OR: [
          { entryBy: { in: ['manager'] } },
          { customer: { salesperson: { in: ['manager'] } } }
        ]
      })
    }));
  });

  it('uses team customer ownership only for InMemory overview/template reads, not invoice upload', async () => {
    const repository = new InMemoryRepository();
    const outsider = { ...manager, id: 'outsider-id', username: 'outsider', departmentTeamScope: ['nobody'] };

    const visible = await repository.getShipments(manager);
    const hidden = await repository.getShipments(outsider);

    expect(visible.map((shipment) => shipment.id)).toContain('s-seed-1');
    expect(hidden.map((shipment) => shipment.id)).not.toContain('s-seed-1');
    await expect(repository.downloadShipmentInvoiceTemplate(manager, 's-seed-1')).rejects.toThrow('仅已排货及之后状态的运单可以下载发票模板');
    await expect(repository.downloadShipmentInvoiceTemplate(outsider, 's-seed-1')).rejects.toThrow('运单不存在');
    await expect(repository.uploadShipmentBusinessInvoice(manager, 's-seed-1', {
      fileName: 'invoice.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 10,
      url: '/api/uploads/business-invoices/invoice.xlsx'
    })).rejects.toThrow('运单不存在');
  });
});

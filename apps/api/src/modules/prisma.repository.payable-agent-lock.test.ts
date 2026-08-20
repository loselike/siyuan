import { describe, expect, it, vi } from 'vitest';
import { PrismaRepository } from './prisma.repository.js';
import type { PrismaService } from './prisma.service.js';
import type { Principal } from './rbac.js';

const financePrincipal: Principal = {
  id: 'u-finance',
  username: 'finance',
  role: 'FINANCE'
};

describe('PrismaRepository payable agent serialization', () => {
  it('locks the shipment and re-reads its current agent before creating a payable', async () => {
    const events: string[] = [];
    const createdItem = {
      id: 'payable-1',
      shipmentId: 'shipment-1',
      type: 'PAYABLE',
      name: '代理运费',
      amount: 100,
      currency: 'RMB',
      settlementMethod: '月结',
      agentId: 'agent-new',
      agentName: '新代理'
    };
    const tx = {
      shipmentFinanceItem: {
        create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
          events.push('create-payable');
          expect(data).toEqual(expect.objectContaining({ agentId: 'agent-new', agentName: '新代理' }));
          return createdItem;
        })
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) }
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx))
    };
    const repository = new PrismaRepository(prisma as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);
    vi.spyOn(repository as any, 'findShipmentForFinanceAudit')
      .mockImplementationOnce(async () => {
        events.push('initial-read');
        return { id: 'shipment-1', settlementMethod: '月结', agent: { id: 'agent-old', name: '旧代理' } };
      })
      .mockImplementationOnce(async (...args: unknown[]) => {
        const database = args[2];
        expect(database).toBe(tx);
        events.push('locked-read');
        return { id: 'shipment-1', settlementMethod: '月结', agent: { id: 'agent-new', name: '新代理' } };
      });
    vi.spyOn(repository as any, 'lockShipmentRow').mockImplementation(async (...args: unknown[]) => {
      const [database, shipmentId] = args;
      expect(database).toBe(tx);
      expect(shipmentId).toBe('shipment-1');
      events.push('lock');
    });
    vi.spyOn(repository as any, 'resolveFinanceAgent').mockImplementation(async (...args: unknown[]) => {
      const [database, , agent] = args;
      expect(database).toBe(tx);
      expect(agent).toEqual({ id: 'agent-new', name: '新代理' });
      events.push('resolve-agent');
      return agent;
    });
    vi.spyOn(repository as any, 'toPayableAuditSummary').mockReturnValue(createdItem);

    await expect(repository.createPayableAudit(financePrincipal, {
      shipmentId: 'shipment-1',
      name: '代理运费',
      amount: 100,
      currency: 'RMB'
    })).resolves.toBe(createdItem);

    expect(events).toEqual([
      'initial-read',
      'lock',
      'locked-read',
      'resolve-agent',
      'create-payable'
    ]);
  });

  it('locks and re-reads the payable shipment before updating it', async () => {
    const events: string[] = [];
    const snapshot = {
      id: 'payable-1',
      shipmentId: 'shipment-1',
      name: '旧费用',
      amount: 100,
      currency: 'RMB',
      settlementMethod: '月结',
      paymentNo: null,
      agentId: 'agent-old',
      agentName: '旧代理',
      chargeWeightKg: null,
      unitPrice: null,
      remark: null,
      locked: false,
      voided: false,
      reconciliationStatus: 'PENDING',
      shipment: { agent: { id: 'agent-old', name: '旧代理' }, settlementMethod: '月结' }
    };
    const locked = {
      ...snapshot,
      agentId: 'agent-new',
      agentName: '新代理',
      shipment: { agent: { id: 'agent-new', name: '新代理' }, settlementMethod: '月结' }
    };
    const updated = { ...locked, name: '新费用' };
    const tx = {
      shipmentFinanceItem: {
        update: vi.fn().mockImplementation(async () => {
          events.push('update-payable');
          return updated;
        })
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) }
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx))
    };
    const repository = new PrismaRepository(prisma as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);
    vi.spyOn(repository as any, 'findPayableFinanceItemById')
      .mockImplementationOnce(async () => {
        events.push('initial-read');
        return snapshot;
      })
      .mockImplementationOnce(async (...args: unknown[]) => {
        expect(args[1]).toBe(tx);
        events.push('locked-read');
        return locked;
      });
    vi.spyOn(repository as any, 'lockShipmentRow').mockImplementation(async (...args: unknown[]) => {
      expect(args).toEqual([tx, 'shipment-1']);
      events.push('lock');
    });
    vi.spyOn(repository as any, 'toPayableAuditSummary').mockReturnValue(updated);

    await expect(repository.updatePayableAudit(financePrincipal, 'payable-1', {
      name: '新费用'
    })).resolves.toBe(updated);

    expect(events).toEqual(['initial-read', 'lock', 'locked-read', 'update-payable']);
  });

  it('keeps the shipment lock through payable audit, readiness, and payment materialization', async () => {
    const events: string[] = [];
    const snapshot = { id: 'payable-1', shipmentId: 'shipment-1' };
    const locked = {
      ...snapshot,
      amount: 100,
      currency: 'RMB',
      reconciliationStatus: 'PENDING',
      voided: false,
      shipment: { outboundAt: new Date('2026-08-20T00:00:00Z'), transferNo: 'TR-1' }
    };
    const updated = { ...locked, reconciliationStatus: 'CONFIRMED' };
    const application = { id: 'application-1' };
    const tx = {
      shipmentFinanceItem: {
        update: vi.fn().mockImplementation(async () => {
          events.push('audit-payable');
          return updated;
        })
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) }
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx))
    };
    const repository = new PrismaRepository(prisma as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);
    vi.spyOn(repository as any, 'findPayableFinanceItemById')
      .mockImplementationOnce(async () => {
        events.push('initial-read');
        return snapshot;
      })
      .mockImplementationOnce(async (...args: unknown[]) => {
        expect(args[1]).toBe(tx);
        events.push('locked-read');
        return locked;
      });
    vi.spyOn(repository as any, 'lockShipmentRow').mockImplementation(async (...args: unknown[]) => {
      expect(args).toEqual([tx, 'shipment-1']);
      events.push('lock');
    });
    vi.spyOn(repository as any, 'ensurePayableReadyForFinance').mockImplementation(async (...args: unknown[]) => {
      expect(args).toEqual([locked, tx]);
      events.push('readiness');
    });
    vi.spyOn(repository as any, 'financeProfitReviewSnapshotData').mockResolvedValue({
      profitExchangeRate: 1,
      profitRmbAmount: 100,
      profitEffectiveAt: new Date('2026-08-20T00:00:00Z')
    });
    vi.spyOn(repository as any, 'upsertPayablePaymentApplication').mockImplementation(async (...args: unknown[]) => {
      expect(args).toEqual([updated, tx]);
      events.push('materialize-payment');
      return application;
    });
    vi.spyOn(repository as any, 'toPayableReviewAuditSnapshot').mockReturnValue({});
    vi.spyOn(repository as any, 'toPayableAuditSummary').mockReturnValue(updated);

    await expect(repository.auditPayableAudit(financePrincipal, 'payable-1')).resolves.toBe(updated);

    expect(events).toEqual([
      'initial-read',
      'lock',
      'locked-read',
      'readiness',
      'audit-payable',
      'materialize-payment'
    ]);
  });
});

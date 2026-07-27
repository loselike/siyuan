import { describe, expect, it, vi } from 'vitest';
import type { Shipment } from '@siyuan/shared';
import { PrismaRepository } from './prisma.repository.js';
import type { PrismaService } from './prisma.service.js';
import type { PermissionKey, Principal } from './rbac.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const service: Principal = { id: 'u-service', username: 'service', role: 'CUSTOMER_SERVICE' };

function createRepository(prisma: Record<string, unknown>) {
  return new PrismaRepository(prisma as unknown as PrismaService);
}

describe('PrismaRepository transfer shipment query', () => {
  it('conjoins an optional database predicate with the existing visibility scope', async () => {
    const shipmentFindMany = vi.fn().mockResolvedValue([]);
    const repository = createRepository({
      shipment: { findMany: shipmentFindMany },
      user: { findMany: vi.fn().mockResolvedValue([]) }
    });
    Object.assign(repository, { hasAnyPermission: vi.fn().mockResolvedValue(false) });

    await repository.getShipments(admin, {
      where: { status: 'OUTBOUNDED', OR: [{ transferNo: null }, { transferNo: '' }] }
    });

    expect(shipmentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { deletedAt: null },
          { status: 'OUTBOUNDED', OR: [{ transferNo: null }, { transferNo: '' }] }
        ]
      }
    }));
  });

  it('pushes transfer and exact salesperson scope down while preserving field pruning', async () => {
    const getShipments = vi.fn().mockResolvedValue([{
      id: 'shipment-1',
      status: 'OUTBOUNDED',
      salesperson: 'service',
      outboundAt: '2026-07-27T00:00:00.000Z',
      agentName: '代理一',
      channelName: '渠道一',
      routeAgentChannelName: '代理渠道一',
      agentWeightKg: 12,
      declarationRequired: true,
      sensitive: true
    } as Shipment]);
    const repository = createRepository({
      auditLog: {
        findMany: vi.fn().mockResolvedValue([
          { target: 'shipment-1', action: 'customer_service.business_data.approved' },
          { target: 'shipment-1', action: 'customer_service.agent_data.approved' }
        ])
      }
    });
    vi.spyOn(repository, 'getShipments').mockImplementation(getShipments);
    vi.spyOn(repository, 'hasPermission').mockImplementation(async (_role, permission: PermissionKey) => (
      permission === 'customer-service:transfer:view'
      || permission === 'customer-service:transfer:view-outbound-time'
    ));

    const rows = await repository.customerServiceTransferShipments(service);

    expect(getShipments).toHaveBeenCalledWith(service, {
      where: {
        status: 'OUTBOUNDED',
        OR: [{ transferNo: null }, { transferNo: '' }],
        AND: {
          OR: [
            { customer: { salesperson: 'service' } },
            { customer: { salesperson: null }, entryBy: 'service' }
          ]
        }
      }
    });
    expect(rows).toEqual([{
      id: 'shipment-1',
      status: 'OUTBOUNDED',
      salesperson: 'service',
      outboundAt: '2026-07-27T00:00:00.000Z'
    }]);
  });
});

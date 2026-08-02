import { describe, expect, it, vi } from 'vitest';
import type { Shipment } from '@siyuan/shared';
import { PrismaRepository } from './prisma.repository.js';
import type { PrismaService } from './prisma.service.js';
import type { PermissionKey, Principal } from './rbac.js';

const service: Principal = { id: 'u-service', username: 'service', role: 'CUSTOMER_SERVICE' };

function createRepository(prisma: Record<string, unknown>) {
  return new PrismaRepository(prisma as unknown as PrismaService);
}

describe('PrismaRepository transfer shipment query', () => {
  it('preserves transfer filtering, approval filtering and field pruning', async () => {
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
          { target: 'shipment-1', action: 'customer_service.business_data.approved', createdAt: new Date('2026-07-27T00:00:01.000Z') },
          { target: 'shipment-1', action: 'customer_service.agent_data.approved', createdAt: new Date('2026-07-27T00:00:01.000Z') }
        ])
      }
    });
    vi.spyOn(repository, 'getShipments').mockImplementation(getShipments);
    vi.spyOn(repository, 'hasPermission').mockImplementation(async (_role, permission: PermissionKey) => (
      permission === 'customer-service:transfer:view'
      || permission === 'customer-service:transfer:view-outbound-time'
    ));

    const rows = await repository.customerServiceTransferShipments(service);

    expect(getShipments).toHaveBeenCalledWith(service);
    expect(rows).toEqual([{
      id: 'shipment-1',
      status: 'OUTBOUNDED',
      salesperson: 'service',
      outboundAt: '2026-07-27T00:00:00.000Z'
    }]);
  });
});

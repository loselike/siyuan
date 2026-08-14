import type { Shipment } from '@siyuan/shared';
import { describe, expect, it } from 'vitest';
import { InMemoryRepository } from '../../in-memory.repository.js';
import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const service: Principal = { id: 'u-cs', username: 'service', role: 'UG_CUSTOMER_SERVICE' };

type MutableRepositoryState = {
  shipments: Array<Shipment & { customerId: string }>;
  rolePermissionMatrix: Record<RoleKey, PermissionKey[]>;
  auditLogs: Array<{
    id: string;
    action: string;
    target: string;
    actorId: string;
    actorUsername: string;
    createdAt: string;
    after?: unknown;
  }>;
};

function repositoryState(repository: InMemoryRepository): MutableRepositoryState {
  return repository as unknown as MutableRepositoryState;
}

describe('customer service data confirm characterization', () => {
  it('keeps current-cycle approval/snapshot selection and business-only field scoping', async () => {
    const repository = new InMemoryRepository();
    const state = repositoryState(repository);
    const shipment = state.shipments[0];
    Object.assign(shipment, {
      status: 'OUTBOUNDED',
      outboundAt: '2026-06-10T08:00:00.000Z',
      packageCount: 3,
      actualWeightKg: 20,
      weightKg: 20,
      volumeCbm: 0.2,
      receivableWeightKg: 22,
      chargeableWeightKg: 22,
      declarationRequired: true,
      sensitive: true,
      cargoDataSource: 'BUSINESS',
      chargeWeightOverridden: true,
      agentId: 'agent-sensitive',
      agentName: '代理敏感名称',
      agentWeightKg: 21,
      channelId: 'channel-sensitive',
      channelName: '代理敏感渠道',
      carrier: '代理敏感承运商',
      routeAgentChannelName: '代理线路',
      routeChargeWeightKg: 21,
      routeUnitPrice: 8,
      routeOtherFee: 2,
      routeCostTotal: 170,
      routeCurrency: 'RMB',
      routeCostSummary: { mainFreight: 168, otherFees: [], totals: [] }
    });
    state.auditLogs.push(
      {
        id: 'old-business-approval',
        action: 'customer_service.business_data.approved',
        target: shipment.id,
        actorId: admin.id,
        actorUsername: admin.username,
        createdAt: '2026-06-09T12:00:00.000Z',
        after: { dataConfirmationCycleStartedAt: '2026-06-09T08:00:00.000Z' }
      },
      {
        id: 'current-business-update',
        action: 'customer_service.business_data.updated',
        target: shipment.id,
        actorId: admin.id,
        actorUsername: admin.username,
        createdAt: '2026-06-10T09:00:00.000Z',
        after: {
          dataConfirmationCycleStartedAt: shipment.outboundAt,
          snapshot: { packageCount: '4', weightKg: '23', volumeCbm: '0.3', chargeWeightKg: '24' }
        }
      },
      {
        id: 'current-business-approval',
        action: 'customer_service.business_data.approved',
        target: shipment.id,
        actorId: admin.id,
        actorUsername: admin.username,
        createdAt: '2026-06-10T10:00:00.000Z',
        after: { dataConfirmationCycleStartedAt: shipment.outboundAt }
      }
    );
    await repository.updateRolePermissions(admin, service.role, [
      'customer-service:data-confirm:view',
      'customer-service:data-confirm:business-view'
    ]);

    const rows = await repository.customerServiceDataConfirmShipments(service);
    const row = rows.find((item) => item.shipment.id === shipment.id);

    expect(row).toEqual(expect.objectContaining({
      businessDataApproved: true,
      businessDataSnapshot: { packageCount: 4, weightKg: 23, volumeCbm: 0.3, chargeWeightKg: 24 }
    }));
    expect(row).not.toHaveProperty('agentDataApproved');
    expect(row).not.toHaveProperty('agentDataSnapshot');
    expect(row?.shipment).toEqual(expect.objectContaining({ packageCount: 3, actualWeightKg: 20, volumeCbm: 0.2 }));
    for (const key of [
      'agentId', 'agentName', 'agentWeightKg', 'channelId', 'channelName', 'carrier', 'routeAgentChannelName',
      'routeChargeWeightKg', 'routeUnitPrice', 'routeOtherFee', 'routeCostTotal', 'routeCurrency', 'routeCostSummary'
    ]) {
      expect(row?.shipment).not.toHaveProperty(key);
    }
  });

  it('keeps latest current-cycle reversal and agent-only field scoping', async () => {
    const repository = new InMemoryRepository();
    const state = repositoryState(repository);
    const shipment = state.shipments[0];
    Object.assign(shipment, {
      status: 'OUTBOUNDED',
      outboundAt: '2026-06-10T08:00:00.000Z',
      packageCount: 3,
      actualWeightKg: 20,
      weightKg: 20,
      volumeCbm: 0.2,
      receivableWeightKg: 22,
      chargeableWeightKg: 22,
      declarationRequired: true,
      sensitive: true,
      cargoDataSource: 'BUSINESS',
      chargeWeightOverridden: true,
      agentName: '代理名称',
      agentWeightKg: 21,
      channelName: '代理渠道'
    });
    state.auditLogs.push(
      {
        id: 'current-agent-approval',
        action: 'customer_service.agent_data.approved',
        target: shipment.id,
        actorId: admin.id,
        actorUsername: admin.username,
        createdAt: '2026-06-10T09:00:00.000Z',
        after: { dataConfirmationCycleStartedAt: shipment.outboundAt }
      },
      {
        id: 'current-agent-reversal',
        action: 'customer_service.agent_data.reversed',
        target: shipment.id,
        actorId: admin.id,
        actorUsername: admin.username,
        createdAt: '2026-06-10T10:00:00.000Z',
        after: { dataConfirmationCycleStartedAt: shipment.outboundAt }
      }
    );
    await repository.updateRolePermissions(admin, service.role, [
      'customer-service:data-confirm:view',
      'customer-service:data-confirm:agent-view'
    ]);

    const rows = await repository.customerServiceDataConfirmShipments(service);
    const row = rows.find((item) => item.shipment.id === shipment.id);

    expect(row?.agentDataApproved).toBe(false);
    expect(row).not.toHaveProperty('businessDataApproved');
    expect(row?.shipment).toEqual(expect.objectContaining({ channelName: '代理渠道' }));
    for (const key of [
      'packageCount', 'actualWeightKg', 'weightKg', 'volumeCbm', 'receivableWeightKg', 'chargeableWeightKg',
      'declarationRequired', 'sensitive', 'cargoDataSource', 'chargeWeightOverridden'
    ]) {
      expect(row?.shipment).not.toHaveProperty(key);
    }
  });
});

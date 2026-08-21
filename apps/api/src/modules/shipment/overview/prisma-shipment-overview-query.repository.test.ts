import { describe, expect, it, vi } from 'vitest';
import { globalFieldMaskKeys, type PermissionKey, type Principal } from '../../rbac.js';
import { PrismaShipmentOverviewQueryRepository } from './prisma-shipment-overview-query.repository.js';

const configuredMarker = 'system-internal:role-permissions-configured';

function fieldMasks(overrides: Partial<NonNullable<Principal['globalFieldMasks']>> = {}) {
  return {
    ...Object.fromEntries(globalFieldMaskKeys.map((key) => [key, false])),
    ...overrides
  } as Principal['globalFieldMasks'];
}

function shipmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shipment-1',
    createdAt: new Date('2026-08-20T01:00:00.000Z'),
    entryAt: new Date('2026-08-20T01:00:00.000Z'),
    customerId: 'customer-1',
    customerOrderNo: 'ORDER-1',
    systemOrderNo: 'SYS-1',
    transferNo: null,
    draftWarehousePackageIds: [],
    etaAt: null,
    etdAt: null,
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: 'US',
    packageCount: 1,
    receivableWeightKg: 12,
    agentWeightKg: 11,
    latestTracking: '',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status: 'WAITING_DISPATCH',
    channelId: 'channel-1',
    agentId: 'agent-1',
    paymentAmountUsd: 10,
    paymentAmountCny: 70,
    paymentMethod: 'BANK_TRANSFER',
    entryBy: 'market',
    customer: { id: 'customer-1', code: '9409', name: '测试客户', salesperson: 'market' },
    channel: { name: '渠道 A', carrier: { name: '承运商 A' } },
    agent: { name: '代理 A', invoiceTemplates: [] },
    receivableFees: [],
    financeItems: [{
      type: 'PAYABLE',
      name: '代理成本',
      amount: 88,
      currency: 'RMB',
      chargeWeightKg: 11,
      unitPrice: 8,
      remark: '市场排货渠道：代理渠道 A',
      voided: false,
      createdAt: new Date('2026-08-20T02:00:00.000Z')
    }],
    payableFees: [],
    trackingEvents: [],
    problemTickets: [],
    ...overrides
  };
}

function setup(permissions: PermissionKey[], row = shipmentRow()) {
  let shipmentQuery: unknown;
  const prisma = {
    role: {
      findUnique: vi.fn(async () => ({
        enabled: true,
        permissions: [configuredMarker, ...permissions].map((code) => ({ code }))
      }))
    },
    shipment: {
      findMany: vi.fn(async (query) => {
        shipmentQuery = query;
        return [row];
      })
    },
    user: {
      findMany: vi.fn(async () => [{ username: String((row.customer as { salesperson: string }).salesperson), site: '深圳思远' }])
    },
    auditLog: { findMany: vi.fn(async () => []) },
    shipmentStageHistory: { findMany: vi.fn(async () => []) },
    problemTicket: { findMany: vi.fn(async () => []) },
    userModuleReadState: { findMany: vi.fn(async () => []) },
    warehousePackage: { findMany: vi.fn(async () => []) },
    warehouseTallyTask: { findMany: vi.fn(async () => []) }
  };
  return {
    repository: new PrismaShipmentOverviewQueryRepository(prisma as never),
    prisma,
    shipmentQuery: () => shipmentQuery
  };
}

describe('PrismaShipmentOverviewQueryRepository', () => {
  it('delegates permission reads to the injected control-plane reader', async () => {
    const hasPermission = vi.fn(async () => true);
    const getPermissionsForRole = vi.fn(async () => ['business:shipment:list'] as PermissionKey[]);
    const repository = new PrismaShipmentOverviewQueryRepository({} as never, {
      hasPermission,
      getPermissionsForRole
    } as never);

    await expect(repository.hasPermission('OPERATOR', 'business:shipment:list')).resolves.toBe(true);
    await expect(repository.getPermissionsForRole('OPERATOR')).resolves.toEqual(['business:shipment:list']);
    expect(hasPermission).toHaveBeenCalledWith('OPERATOR', 'business:shipment:list');
    expect(getPermissionsForRole).toHaveBeenCalledWith('OPERATOR');
  });

  it('keeps market site scope and payable/agent field visibility on the real Prisma path', async () => {
    const { repository, shipmentQuery } = setup([
      'market:routed:view',
      'market:routed:replace-agent',
      'master-data:agents:read',
      'business:shipment:agent-weight-view'
    ]);
    const principal: Principal = {
      id: 'market-id',
      username: 'market',
      role: 'UG_MARKET',
      site: '深圳思远',
      globalFieldMasks: fieldMasks()
    };

    const rows = await repository.getShipments(principal, { marketSiteScope: true, routeCostScope: 'ROUTED' });

    expect(shipmentQuery()).toEqual(expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        AND: [expect.objectContaining({ OR: expect.any(Array) })]
      })
    }));
    expect(rows).toEqual([expect.objectContaining({
      id: 'shipment-1',
      site: '深圳思远',
      agentName: '代理 A',
      routeCostTotal: 88,
      routeAgentChannelName: '代理渠道 A'
    })]);
    expect(rows[0]).not.toHaveProperty('agentWeightKg');
    expect(rows[0]).not.toHaveProperty('paymentAmountUsd');
    expect(rows[0]).not.toHaveProperty('paymentAmountCny');
    expect(rows[0]).not.toHaveProperty('paymentMethod');
  });

  it('keeps sales-own filtering and agent/cost trimming on the real Prisma path', async () => {
    const row = shipmentRow({
      entryBy: 'operator',
      customer: { id: 'customer-1', code: '9409', name: '测试客户', salesperson: 'operator' }
    });
    const { repository, shipmentQuery } = setup(['business:shipment:list'], row);
    const principal: Principal = {
      id: 'operator-id',
      username: 'operator',
      role: 'OPERATOR',
      dataScope: 'SALES_OWN',
      globalFieldMasks: fieldMasks()
    };

    const rows = await repository.getShipments(principal);

    expect(shipmentQuery()).toEqual(expect.objectContaining({
      where: expect.objectContaining({
        AND: [expect.objectContaining({ OR: [
          { entryBy: { in: ['operator'] } },
          { customer: { salesperson: { in: ['operator'] } } }
        ] })]
      })
    }));
    expect(rows[0]).toEqual(expect.objectContaining({
      id: 'shipment-1',
      agentName: '',
      agentShortName: '',
      routeAgentChannelName: '',
      agentWeightKg: 11
    }));
    expect(rows[0]).not.toHaveProperty('routeCostTotal');
    expect(rows[0]).not.toHaveProperty('routeCurrency');
  });

  it('keeps template availability without exposing template or agent identity when agent read is absent', async () => {
    const row = shipmentRow({
      entryBy: 'operator',
      customer: { id: 'customer-1', code: '9409', name: '测试客户', salesperson: 'operator' },
      agent: {
        name: '代理 A',
        invoiceTemplates: [{
          id: 'template-1',
          name: '代理 A 发票模板',
          url: '/api/uploads/invoice-templates/template-1.xlsx'
        }]
      }
    });
    const { repository } = setup(['business:shipment:list'], row);
    const principal: Principal = {
      id: 'operator-id',
      username: 'operator',
      role: 'OPERATOR',
      dataScope: 'SALES_OWN',
      globalFieldMasks: fieldMasks()
    };

    const rows = await repository.getShipments(principal);

    expect(rows[0]).toEqual(expect.objectContaining({
      id: 'shipment-1',
      invoiceTemplateAvailable: true,
      invoiceTemplateOptions: [{ id: 'template-1' }]
    }));
    expect(rows[0].agentName).toBeFalsy();
    expect(rows[0].agentShortName).toBeFalsy();
  });

  it('keeps disabled non-admin roles fail-closed', async () => {
    const { repository, prisma } = setup(['business:shipment:list']);
    prisma.role.findUnique.mockResolvedValueOnce({
      enabled: false,
      permissions: [{ code: configuredMarker }, { code: 'business:shipment:list' }]
    });

    await expect(repository.hasPermission('OPERATOR', 'business:shipment:list')).resolves.toBe(false);
  });
});

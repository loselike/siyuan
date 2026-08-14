import { describe, expect, it, vi } from 'vitest';
import type { MasterDataSnapshot } from '@siyuan/shared';
import { DataController } from '../data.controller.js';
import type { Principal } from '../rbac.js';

const snapshot: MasterDataSnapshot = {
  customers: [
    { id: 'customer-own', code: 'OWN', name: '自有客户', salesperson: 'R-sales', enabled: true },
    { id: 'customer-other', code: 'OTHER', name: '其他客户', salesperson: 'operator', enabled: true }
  ],
  contacts: [
    { id: 'contact-own', customerId: 'customer-own', customerName: 'OWN-自有客户', name: '自有联系人', enabled: true },
    { id: 'contact-other', customerId: 'customer-other', customerName: 'OTHER-其他客户', name: '其他联系人', enabled: true }
  ],
  customerUsers: [
    { id: 'user-own', customerId: 'customer-own', customerName: 'OWN-自有客户', username: 'own-user', enabled: true },
    { id: 'user-other', customerId: 'customer-other', customerName: 'OTHER-其他客户', username: 'other-user', enabled: true }
  ],
  agents: [{ id: 'agent-1', code: 'AGENT', shortName: '代理', name: '真实代理', createdAt: '2026-08-13T00:00:00.000Z', enabled: true }],
  agentChannels: [{ id: 'agent-channel-1', agentId: 'agent-1', agentName: '代理', channelName: '代理渠道', enabled: true }],
  carriers: [{ id: 'carrier-1', name: '承运商', enabled: true }],
  channelCategories: [{ id: 'category-1', name: '快递', enabled: true }],
  channels: [{ id: 'channel-1', name: '公司渠道', businessType: 'EXPRESS', category: '快递', volumeDivisor: 6000, multiPieceWeightRule: 'SUM_THEN_COMPARE', singleWeightRoundingRule: 'ACTUAL', settlementWeightRule: 'MAX_ACTUAL_VOLUME', settlementWeightRoundingRule: 'NONE', remoteAreaRule: 'NONE', enabled: true }],
  surcharges: [{ id: 'surcharge-1', name: '附加费', amount: 1, enabled: true }],
  fuelRates: [{ id: 'fuel-1', channelId: 'channel-1', channelName: '公司渠道', rate: 0.1, activeAt: '2026-08-13T00:00:00.000Z' }],
  exchangeRates: [{ id: 'rate-1', baseCurrency: 'USD', quoteCurrency: 'RMB', rate: 7, activeAt: '2026-08-13T00:00:00.000Z', enabled: true }],
  roles: ['ADMIN', 'UG_BUSINESS']
};

function controllerWithPermissions(granted: readonly string[]) {
  const repository = {
    getMasterData: vi.fn().mockResolvedValue(snapshot),
    hasPermission: vi.fn().mockImplementation(async (_role: string, permission: string) => granted.includes(permission))
  };
  return {
    repository,
    controller: new DataController(repository as never, {} as never)
  };
}

describe('master-data query characterization', () => {
  it('keeps the administrator snapshot complete while selecting every protected collection', async () => {
    const principal: Principal = { id: 'admin', username: 'admin', role: 'ADMIN' };
    const granted = [
      'master-data:customers:read', 'master-data:finance:read', 'master-data:agents:read',
      'master-data:agent-channels:read', 'master-data:channels:read',
      'master-data:channel-categories:read', 'master-data:exchange-rates:read'
    ];
    const { controller, repository } = controllerWithPermissions(granted);

    await expect(controller.masterData({ user: principal })).resolves.toEqual(snapshot);
    expect(repository.getMasterData).toHaveBeenCalledWith({
      customers: true, customerSalespeople: undefined, financeCatalog: true, agents: true,
      agentChannels: true, channels: true, channelCategories: true, exchangeRates: true
    });
  });

  it('keeps sales ownership and empty unauthorized collections unchanged', async () => {
    const principal: Principal = { id: 'sales', username: 'R-sales', name: '业务员姓名', nickname: '业务员昵称', role: 'UG_BUSINESS' };
    const granted = [
      'master-data:customers:read', 'master-data:finance:read', 'master-data:channels:read',
      'master-data:channel-categories:read', 'master-data:exchange-rates:read'
    ];
    const { controller, repository } = controllerWithPermissions(granted);

    await expect(controller.masterData({ user: principal })).resolves.toEqual({
      ...snapshot,
      customers: [snapshot.customers[0]],
      contacts: [snapshot.contacts[0]],
      customerUsers: [snapshot.customerUsers[0]],
      agents: [],
      agentChannels: []
    });
    expect(repository.getMasterData).toHaveBeenCalledWith({
      customers: true,
      customerSalespeople: ['R-sales', '业务员姓名', '业务员昵称'],
      financeCatalog: true,
      agents: false,
      agentChannels: false,
      channels: true,
      channelCategories: true,
      exchangeRates: true
    });
  });
});

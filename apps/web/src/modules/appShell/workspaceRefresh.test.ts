import { describe, expect, it, vi } from 'vitest';
import type { PermissionKey } from '../../apiClient';
import {
  createWorkspaceRefreshCoordinator,
  refreshWorkspaceData,
  type WorkspaceRefreshClient,
  type WorkspaceRefreshWriters
} from './workspaceRefresh';

function createHarness() {
  const values = {
    shipments: [{ id: 'shipment-1' }],
    warehouseShipments: [{ id: 'warehouse-shipment-1' }],
    tickets: [{ id: 'ticket-1' }],
    receivables: [{ id: 'receivable-1' }],
    businessCosts: [{ id: 'business-cost-1' }],
    payables: [{ id: 'payable-1' }],
    statements: [{ id: 'statement-1' }],
    accounts: [{ id: 'account-1' }],
    ledger: [{ id: 'ledger-1' }],
    carrierTasks: [{ id: 'carrier-task-1' }],
    masterData: { version: 'loaded' },
    emptyMasterData: { version: 'empty' }
  };
  const calls: string[] = [];
  const method = <T>(name: string, value: T) => vi.fn(async () => {
    calls.push(name);
    return value;
  });
  const client = {
    shipments: method('shipments', values.shipments),
    warehouseDispatchShipments: method('warehouseDispatchShipments', values.warehouseShipments),
    problemTickets: method('problemTickets', values.tickets),
    receivableAudits: method('receivableAudits', { rows: values.receivables }),
    businessCostAudits: method('businessCostAudits', { rows: values.businessCosts }),
    payableAudits: method('payableAudits', { rows: values.payables }),
    customerStatements: method('customerStatements', values.statements),
    customerAccounts: method('customerAccounts', values.accounts),
    accountLedger: method('accountLedger', values.ledger),
    carrierTaskQuery: {
      carrierTasks: method('carrierTasks', values.carrierTasks)
    },
    masterData: method('masterData', values.masterData)
  } as unknown as WorkspaceRefreshClient;
  const writes: Record<string, unknown> = {};
  const writer = (name: string) => vi.fn((value: unknown) => {
    calls.push(`set:${name}`);
    writes[name] = value;
  });
  const writers = {
    setShipments: writer('shipments'),
    setProblemTickets: writer('problemTickets'),
    setReceivables: writer('receivables'),
    setBusinessCostAudits: writer('businessCostAudits'),
    setPayableAudits: writer('payableAudits'),
    setCustomerStatements: writer('customerStatements'),
    setCustomerAccounts: writer('customerAccounts'),
    setAccountLedger: writer('accountLedger'),
    setCarrierTasks: writer('carrierTasks'),
    setMasterData: writer('masterData')
  } as unknown as WorkspaceRefreshWriters;

  return { calls, client, values, writers, writes };
}

const fullPermissions = [
  'business:shipment:list',
  'customer-service:problem:view',
  'finance:receivable:read',
  'finance:business-cost:read',
  'finance:payable:read',
  'tracking:carrier-task:view',
  'master-data:site:read'
] as PermissionKey[];

describe('refreshWorkspaceData', () => {
  it('preserves the full workspace request groups, arguments, outputs, and group order', async () => {
    const harness = createHarness();

    await refreshWorkspaceData({
      client: harness.client,
      user: { role: 'ADMIN' } as never,
      permissions: fullPermissions,
      skipIrrelevantWorkspaceData: false,
      emptyMasterData: harness.values.emptyMasterData as never,
      writers: harness.writers
    });

    expect(harness.client.receivableAudits).toHaveBeenCalledWith({ pageSize: 100 });
    expect(harness.client.businessCostAudits).toHaveBeenCalledWith({ pageSize: 100 });
    expect(harness.client.payableAudits).toHaveBeenCalledWith({ pageSize: 100 });
    expect(harness.writes).toEqual({
      shipments: harness.values.shipments,
      problemTickets: harness.values.tickets,
      receivables: harness.values.receivables,
      businessCostAudits: harness.values.businessCosts,
      payableAudits: harness.values.payables,
      customerStatements: harness.values.statements,
      customerAccounts: harness.values.accounts,
      accountLedger: harness.values.ledger,
      carrierTasks: harness.values.carrierTasks,
      masterData: harness.values.masterData
    });
    expect(harness.calls).toEqual([
      'shipments',
      'problemTickets',
      'set:shipments',
      'set:problemTickets',
      'receivableAudits',
      'businessCostAudits',
      'payableAudits',
      'customerStatements',
      'customerAccounts',
      'accountLedger',
      'set:receivables',
      'set:businessCostAudits',
      'set:payableAudits',
      'set:customerStatements',
      'set:customerAccounts',
      'set:accountLedger',
      'carrierTasks',
      'set:carrierTasks',
      'masterData',
      'set:masterData'
    ]);
  });

  it('preserves the data-confirm skip branch without making workspace requests', async () => {
    const harness = createHarness();

    await refreshWorkspaceData({
      client: harness.client,
      user: { role: 'ADMIN' } as never,
      permissions: fullPermissions,
      skipIrrelevantWorkspaceData: true,
      emptyMasterData: harness.values.emptyMasterData as never,
      writers: harness.writers
    });

    expect(harness.calls).toEqual([
      'set:shipments',
      'set:problemTickets',
      'set:receivables',
      'set:businessCostAudits',
      'set:payableAudits',
      'set:customerStatements',
      'set:customerAccounts',
      'set:accountLedger',
      'set:carrierTasks',
      'set:masterData'
    ]);
    expect(harness.writes).toEqual({
      shipments: [],
      problemTickets: [],
      receivables: [],
      businessCostAudits: [],
      payableAudits: [],
      customerStatements: [],
      customerAccounts: [],
      accountLedger: [],
      carrierTasks: [],
      masterData: harness.values.emptyMasterData
    });
  });

  it('preserves finance and carrier failure fallbacks while continuing to master data', async () => {
    const harness = createHarness();
    vi.mocked(harness.client.receivableAudits).mockRejectedValueOnce(new Error('receivable unavailable'));
    vi.mocked(harness.client.businessCostAudits).mockRejectedValueOnce(new Error('business cost unavailable'));
    vi.mocked(harness.client.payableAudits).mockRejectedValueOnce(new Error('payable unavailable'));
    vi.mocked(harness.client.customerStatements).mockRejectedValueOnce(new Error('statements unavailable'));
    vi.mocked(harness.client.customerAccounts).mockRejectedValueOnce(new Error('accounts unavailable'));
    vi.mocked(harness.client.accountLedger).mockRejectedValueOnce(new Error('ledger unavailable'));
    vi.mocked(harness.client.carrierTaskQuery.carrierTasks).mockRejectedValueOnce(new Error('carrier unavailable'));

    await refreshWorkspaceData({
      client: harness.client,
      user: { role: 'ADMIN' } as never,
      permissions: fullPermissions,
      skipIrrelevantWorkspaceData: false,
      emptyMasterData: harness.values.emptyMasterData as never,
      writers: harness.writers
    });

    expect(harness.writes).toMatchObject({
      receivables: [],
      businessCostAudits: [],
      payableAudits: [],
      customerStatements: [],
      customerAccounts: [],
      accountLedger: [],
      carrierTasks: [],
      masterData: harness.values.masterData
    });
    expect(harness.client.masterData).toHaveBeenCalledOnce();
  });
});

describe('createWorkspaceRefreshCoordinator', () => {
  it('shares one equivalent in-flight refresh without caching the completed result', async () => {
    const coordinator = createWorkspaceRefreshCoordinator();
    let releaseFirstRefresh: (() => void) | undefined;
    const refresh = vi.fn(() => new Promise<void>((resolve) => {
      releaseFirstRefresh = resolve;
    }));

    const first = coordinator.run('admin:full-workspace', refresh);
    const duplicate = coordinator.run('admin:full-workspace', refresh);

    expect(refresh).toHaveBeenCalledOnce();
    expect(duplicate).toBe(first);

    releaseFirstRefresh?.();
    await Promise.all([first, duplicate]);

    const next = coordinator.run('admin:full-workspace', async () => undefined);
    expect(next).not.toBe(first);
    await next;
  });

  it('does not merge different permission or route scopes', async () => {
    const coordinator = createWorkspaceRefreshCoordinator();
    const financeRefresh = vi.fn(async () => undefined);
    const warehouseRefresh = vi.fn(async () => undefined);

    await Promise.all([
      coordinator.run('admin:finance', financeRefresh),
      coordinator.run('admin:warehouse', warehouseRefresh)
    ]);

    expect(financeRefresh).toHaveBeenCalledOnce();
    expect(warehouseRefresh).toHaveBeenCalledOnce();
  });

  it('clears a rejected in-flight refresh so the next call can retry', async () => {
    const coordinator = createWorkspaceRefreshCoordinator();
    const refresh = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined);

    await expect(coordinator.run('admin:full-workspace', refresh)).rejects.toThrow('temporary failure');
    await expect(coordinator.run('admin:full-workspace', refresh)).resolves.toBeUndefined();

    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

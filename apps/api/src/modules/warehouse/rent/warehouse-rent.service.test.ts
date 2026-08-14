import type { WarehouseRentDetailResponse, WarehouseRentRuleSummary } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { WarehouseRentRepository } from './warehouse-rent.repository.js';
import { WarehouseRentService } from './warehouse-rent.service.js';

const principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;

function repositoryStub(overrides: Partial<WarehouseRentRepository> = {}): WarehouseRentRepository {
  return {
    getWarehouseRentDetails: vi.fn(),
    exportWarehouseRentDetails: vi.fn(),
    getWarehouseRentRules: vi.fn(),
    createWarehouseRentRule: vi.fn(),
    updateWarehouseRentRule: vi.fn(),
    deleteWarehouseRentRule: vi.fn(),
    updateWarehouseRentRuleEnabled: vi.fn(),
    ...overrides
  };
}

describe('WarehouseRentService', () => {
  it('preserves all warehouse rent arguments and results through the port', async () => {
    const response = { rows: [] } as unknown as WarehouseRentDetailResponse;
    const rule = { id: 'rent-rule-1' } as WarehouseRentRuleSummary;
    const repository = repositoryStub({
      getWarehouseRentDetails: vi.fn().mockResolvedValue(response),
      exportWarehouseRentDetails: vi.fn().mockResolvedValue(response),
      getWarehouseRentRules: vi.fn().mockResolvedValue([rule]),
      createWarehouseRentRule: vi.fn().mockResolvedValue(rule),
      updateWarehouseRentRule: vi.fn().mockResolvedValue(rule),
      deleteWarehouseRentRule: vi.fn().mockResolvedValue(rule),
      updateWarehouseRentRuleEnabled: vi.fn().mockResolvedValue(rule)
    });
    const service = new WarehouseRentService(repository);
    const query = { status: 'IN_STOCK' as const, hasRent: false };
    const input = {
      name: '标准仓租',
      effectiveFrom: '2099-01-01',
      freeDays: 7,
      billingUnit: 'CBM' as const,
      densityMin: 0,
      unitRate: 8
    };
    const enabledInput = { enabled: false };

    await expect(service.details(principal, query)).resolves.toBe(response);
    await expect(service.exportDetails(principal, query)).resolves.toBe(response);
    await expect(service.rules(principal)).resolves.toEqual([rule]);
    await expect(service.createRule(principal, input)).resolves.toBe(rule);
    await expect(service.updateRule(principal, 'rent-rule-1', input)).resolves.toBe(rule);
    await expect(service.deleteRule(principal, 'rent-rule-1')).resolves.toBe(rule);
    await expect(service.updateRuleEnabled(principal, 'rent-rule-1', enabledInput)).resolves.toBe(rule);

    expect(repository.getWarehouseRentDetails).toHaveBeenCalledWith(principal, query);
    expect(repository.exportWarehouseRentDetails).toHaveBeenCalledWith(principal, query);
    expect(repository.getWarehouseRentRules).toHaveBeenCalledWith(principal);
    expect(repository.createWarehouseRentRule).toHaveBeenCalledWith(principal, input);
    expect(repository.updateWarehouseRentRule).toHaveBeenCalledWith(principal, 'rent-rule-1', input);
    expect(repository.deleteWarehouseRentRule).toHaveBeenCalledWith(principal, 'rent-rule-1');
    expect(repository.updateWarehouseRentRuleEnabled).toHaveBeenCalledWith(principal, 'rent-rule-1', enabledInput);
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing rent rejection');
    const repository = repositoryStub({
      deleteWarehouseRentRule: vi.fn().mockRejectedValue(failure)
    });
    const service = new WarehouseRentService(repository);

    await expect(service.deleteRule(principal, 'rent-rule-1')).rejects.toBe(failure);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { WarehouseTallyQueryRepository } from './warehouse-tally-query.repository.js';
import { WarehouseTallyQueryService } from './warehouse-tally-query.service.js';
import {
  warehouseTallyOperatorPrincipal,
  warehouseTallyPackageSummary,
  warehouseTallyTaskSummary
} from './test-support/warehouse-tally-query.factory.js';

function repositoryStub(
  overrides: Partial<WarehouseTallyQueryRepository> = {}
): WarehouseTallyQueryRepository {
  return {
    getWarehouseConsolidationItems: vi.fn().mockResolvedValue([]),
    getWarehouseTallyTasks: vi.fn().mockResolvedValue([]),
    getWarehouseTallyTaskSourcePackages: vi.fn().mockResolvedValue([]),
    getWarehouseTallyTaskHistoryChain: vi.fn().mockResolvedValue([]),
    getWarehouseTallyTaskOutputPackages: vi.fn().mockResolvedValue([]),
    ...overrides
  };
}

describe('WarehouseTallyQueryService', () => {
  it('preserves the principal and list filters through the service boundary', async () => {
    const tasks = [warehouseTallyTaskSummary()];
    const repository = repositoryStub({
      getWarehouseTallyTasks: vi.fn().mockResolvedValue(tasks)
    });
    const service = new WarehouseTallyQueryService(repository);
    const query = { status: 'COMPLETED' as const, customerCode: ' C001 ' };

    await expect(service.listTasks(warehouseTallyOperatorPrincipal, query)).resolves.toBe(tasks);
    expect(repository.getWarehouseTallyTasks).toHaveBeenCalledWith(warehouseTallyOperatorPrincipal, query);
  });

  it('keeps all tally detail reads on the selected repository adapter', async () => {
    const packages = [warehouseTallyPackageSummary()];
    const history = [warehouseTallyTaskSummary()];
    const repository = repositoryStub({
      getWarehouseConsolidationItems: vi.fn().mockResolvedValue(packages),
      getWarehouseTallyTaskSourcePackages: vi.fn().mockResolvedValue(packages),
      getWarehouseTallyTaskHistoryChain: vi.fn().mockResolvedValue(history),
      getWarehouseTallyTaskOutputPackages: vi.fn().mockResolvedValue(packages)
    });
    const service = new WarehouseTallyQueryService(repository);

    await expect(service.listConsolidationItems(warehouseTallyOperatorPrincipal, 'consolidation-1')).resolves.toBe(packages);
    await expect(service.listTaskSourcePackages(warehouseTallyOperatorPrincipal, 'task-1')).resolves.toBe(packages);
    await expect(service.listTaskHistoryChain(warehouseTallyOperatorPrincipal, 'pkg-output')).resolves.toBe(history);
    await expect(service.listTaskOutputPackages(warehouseTallyOperatorPrincipal, 'task-1')).resolves.toBe(packages);
  });
});

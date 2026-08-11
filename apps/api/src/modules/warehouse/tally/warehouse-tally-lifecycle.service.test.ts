import type { WarehouseTallyTaskSummary } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { WarehouseTallyLifecycleRepository } from './warehouse-tally-lifecycle.repository.js';
import { WarehouseTallyLifecycleService } from './warehouse-tally-lifecycle.service.js';

const principal = { id: 'u-warehouse', username: 'warehouse', role: 'WAREHOUSE' } as Principal;

function repositoryStub(
  overrides: Partial<WarehouseTallyLifecycleRepository> = {}
): WarehouseTallyLifecycleRepository {
  return {
    startWarehouseTallyTask: vi.fn(),
    completeWarehouseTallyTask: vi.fn(),
    cancelCompletedWarehouseTallyTask: vi.fn(),
    ...overrides
  };
}

describe('WarehouseTallyLifecycleService', () => {
  it('preserves start and completed-cancellation arguments and results through the port', async () => {
    const task = { id: 'tally-1' } as WarehouseTallyTaskSummary;
    const repository = repositoryStub({
      startWarehouseTallyTask: vi.fn().mockResolvedValue(task),
      completeWarehouseTallyTask: vi.fn().mockResolvedValue(task),
      cancelCompletedWarehouseTallyTask: vi.fn().mockResolvedValue(task)
    });
    const service = new WarehouseTallyLifecycleService(repository);
    const completeInput = {
      packageCount: 1,
      results: [{ sourcePackageIds: ['package-1'], packageCount: 1 }]
    };
    const input = { reason: '理货选择错误，退回重新处理' };

    await expect(service.start(principal, 'tally-1')).resolves.toBe(task);
    await expect(service.complete(principal, 'tally-1', completeInput)).resolves.toBe(task);
    await expect(service.cancelCompleted(principal, 'tally-1', input)).resolves.toBe(task);
    expect(repository.startWarehouseTallyTask).toHaveBeenCalledWith(principal, 'tally-1');
    expect(repository.completeWarehouseTallyTask).toHaveBeenCalledWith(principal, 'tally-1', completeInput);
    expect(repository.cancelCompletedWarehouseTallyTask).toHaveBeenCalledWith(principal, 'tally-1', input);
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing lifecycle rejection');
    const repository = repositoryStub({
      startWarehouseTallyTask: vi.fn().mockRejectedValue(failure)
    });
    const service = new WarehouseTallyLifecycleService(repository);

    await expect(service.start(principal, 'tally-1')).rejects.toBe(failure);
  });
});

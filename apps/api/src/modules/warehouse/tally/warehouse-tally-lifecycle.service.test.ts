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
    createWarehouseTallyTask: vi.fn(),
    updateWarehouseTallyTask: vi.fn(),
    startWarehouseTallyTask: vi.fn(),
    cancelWarehouseTallyTask: vi.fn(),
    restartWarehouseTallyProblemTask: vi.fn(),
    completeWarehouseTallyTask: vi.fn(),
    reverseReviewWarehouseTallyTask: vi.fn(),
    ...overrides
  };
}

describe('WarehouseTallyLifecycleService', () => {
  it('preserves lifecycle arguments and results through the port', async () => {
    const task = { id: 'tally-1' } as WarehouseTallyTaskSummary;
    const repository = repositoryStub({
      createWarehouseTallyTask: vi.fn().mockResolvedValue(task),
      updateWarehouseTallyTask: vi.fn().mockResolvedValue(task),
      startWarehouseTallyTask: vi.fn().mockResolvedValue(task),
      cancelWarehouseTallyTask: vi.fn().mockResolvedValue(task),
      restartWarehouseTallyProblemTask: vi.fn().mockResolvedValue(task),
      completeWarehouseTallyTask: vi.fn().mockResolvedValue(task),
      reverseReviewWarehouseTallyTask: vi.fn().mockResolvedValue(task)
    });
    const service = new WarehouseTallyLifecycleService(repository);
    const createInput = {
      packageIds: ['package-1'],
      tallyChannel: '空运' as const,
      tallyRequirement: '重新核对'
    };
    const updateInput = { tallyRequirement: '重新核对并贴标' };
    const completeInput = {
      packageCount: 1,
      results: [{ sourcePackageIds: ['package-1'], packageCount: 1 }]
    };
    await expect(service.create(principal, createInput)).resolves.toBe(task);
    await expect(service.update(principal, 'tally-1', updateInput)).resolves.toBe(task);
    await expect(service.start(principal, 'tally-1')).resolves.toBe(task);
    await expect(service.cancel(principal, 'tally-1')).resolves.toBe(task);
    await expect(service.restartProblem(principal, 'tally-1')).resolves.toBe(task);
    await expect(service.complete(principal, 'tally-1', completeInput)).resolves.toBe(task);
    await expect(service.reverseReview(principal, 'tally-1')).resolves.toBe(task);
    expect(repository.createWarehouseTallyTask).toHaveBeenCalledWith(principal, createInput);
    expect(repository.updateWarehouseTallyTask).toHaveBeenCalledWith(principal, 'tally-1', updateInput);
    expect(repository.startWarehouseTallyTask).toHaveBeenCalledWith(principal, 'tally-1');
    expect(repository.cancelWarehouseTallyTask).toHaveBeenCalledWith(principal, 'tally-1');
    expect(repository.restartWarehouseTallyProblemTask).toHaveBeenCalledWith(principal, 'tally-1');
    expect(repository.completeWarehouseTallyTask).toHaveBeenCalledWith(principal, 'tally-1', completeInput);
    expect(repository.reverseReviewWarehouseTallyTask).toHaveBeenCalledWith(principal, 'tally-1');
  });

  it('keeps completed-count updates rejected before repository access', () => {
    const repository = repositoryStub();
    const service = new WarehouseTallyLifecycleService(repository);

    expect(() => service.updateCompletedCount(principal, 'tally-1', { packageCount: 2 }))
      .toThrow('已完成理货不允许直接修改件数，请先反审核');
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

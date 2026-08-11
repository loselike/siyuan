import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { WarehouseTallyCorrectionRepository } from './warehouse-tally-correction.repository.js';
import { WarehouseTallyCorrectionService } from './warehouse-tally-correction.service.js';

const principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;
type Preview = Awaited<ReturnType<WarehouseTallyCorrectionRepository['getWarehouseTallyHistoricalAggregateCorrectionPreview']>>;
type Result = Awaited<ReturnType<WarehouseTallyCorrectionRepository['correctWarehouseTallyHistoricalAggregate']>>;

function repositoryStub(
  overrides: Partial<WarehouseTallyCorrectionRepository> = {}
): WarehouseTallyCorrectionRepository {
  return {
    getWarehouseTallyHistoricalAggregateCorrectionPreview: vi.fn(),
    correctWarehouseTallyHistoricalAggregate: vi.fn(),
    ...overrides
  };
}

describe('WarehouseTallyCorrectionService', () => {
  it('preserves preview and correction arguments and results through the port', async () => {
    const preview = { taskId: 'task-1', eligible: true } as Preview;
    const result = { archivedAggregatePackageId: 'aggregate-1' } as Result;
    const repository = repositoryStub({
      getWarehouseTallyHistoricalAggregateCorrectionPreview: vi.fn().mockResolvedValue(preview),
      correctWarehouseTallyHistoricalAggregate: vi.fn().mockResolvedValue(result)
    });
    const service = new WarehouseTallyCorrectionService(repository);
    const input = {
      sampleIds: ['sample-1', 'sample-2'],
      previewFingerprint: 'fingerprint',
      confirmedPhysicalPieces: true
    };

    await expect(service.preview(principal, 'task-1')).resolves.toBe(preview);
    await expect(service.correct(principal, 'task-1', input)).resolves.toBe(result);
    expect(repository.getWarehouseTallyHistoricalAggregateCorrectionPreview).toHaveBeenCalledWith(principal, 'task-1');
    expect(repository.correctWarehouseTallyHistoricalAggregate).toHaveBeenCalledWith(principal, 'task-1', input);
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing correction rejection');
    const repository = repositoryStub({
      correctWarehouseTallyHistoricalAggregate: vi.fn().mockRejectedValue(failure)
    });
    const service = new WarehouseTallyCorrectionService(repository);

    await expect(service.correct(principal, 'task-1', {
      sampleIds: [],
      previewFingerprint: '',
      confirmedPhysicalPieces: false
    })).rejects.toBe(failure);
  });
});

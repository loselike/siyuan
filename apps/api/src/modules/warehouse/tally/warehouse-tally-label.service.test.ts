import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { WarehouseTallyLabelRepository } from './warehouse-tally-label.repository.js';
import { WarehouseTallyLabelService } from './warehouse-tally-label.service.js';

const principal = { id: 'u-warehouse', username: 'warehouse', role: 'WAREHOUSE' } as Principal;
type GeneratedTask = Awaited<ReturnType<WarehouseTallyLabelRepository['generateWarehouseTallyTaskLabel']>>;
type ScanResult = Awaited<ReturnType<WarehouseTallyLabelRepository['applyWarehouseTallyTaskLabel']>>;

function repositoryStub(
  overrides: Partial<WarehouseTallyLabelRepository> = {}
): WarehouseTallyLabelRepository {
  return {
    generateWarehouseTallyTaskLabel: vi.fn(),
    printWarehouseTallyTaskLabel: vi.fn(),
    downloadWarehouseTallyTaskLabel: vi.fn(),
    applyWarehouseTallyTaskLabel: vi.fn(),
    ...overrides
  };
}

describe('WarehouseTallyLabelService', () => {
  it('preserves label command arguments and results through the port', async () => {
    const task = { id: 'tally-1' } as GeneratedTask;
    const scanResult = { task, package: { id: 'package-1' }, alreadyApplied: true } as ScanResult;
    const repository = repositoryStub({
      generateWarehouseTallyTaskLabel: vi.fn().mockResolvedValue(task),
      printWarehouseTallyTaskLabel: vi.fn().mockResolvedValue(task),
      downloadWarehouseTallyTaskLabel: vi.fn().mockResolvedValue(task),
      applyWarehouseTallyTaskLabel: vi.fn().mockResolvedValue(scanResult)
    });
    const service = new WarehouseTallyLabelService(repository);
    const input = { labelNo: 'TALLY-001' };

    await expect(service.generate(principal, 'tally-1')).resolves.toBe(task);
    await expect(service.print(principal, 'tally-1')).resolves.toBe(task);
    await expect(service.download(principal, 'tally-1')).resolves.toBe(task);
    await expect(service.apply(principal, input)).resolves.toBe(scanResult);
    expect(repository.generateWarehouseTallyTaskLabel).toHaveBeenCalledWith(principal, 'tally-1');
    expect(repository.printWarehouseTallyTaskLabel).toHaveBeenCalledWith(principal, 'tally-1');
    expect(repository.downloadWarehouseTallyTaskLabel).toHaveBeenCalledWith(principal, 'tally-1');
    expect(repository.applyWarehouseTallyTaskLabel).toHaveBeenCalledWith(principal, input);
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing label rejection');
    const repository = repositoryStub({
      generateWarehouseTallyTaskLabel: vi.fn().mockRejectedValue(failure)
    });
    const service = new WarehouseTallyLabelService(repository);

    await expect(service.generate(principal, 'tally-1')).rejects.toBe(failure);
  });
});

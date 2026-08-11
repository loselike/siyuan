import { ForbiddenException } from '@nestjs/common';
import type { WarehouseTallyRepeatStatisticsResponse } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { WarehouseTallyOperationsRepository } from './warehouse-tally-operations.repository.js';
import { WarehouseTallyOperationsService } from './warehouse-tally-operations.service.js';

const principal = { id: 'u-warehouse', username: 'warehouse', role: 'WAREHOUSE' } as Principal;

function repositoryStub(
  overrides: Partial<WarehouseTallyOperationsRepository> = {}
): WarehouseTallyOperationsRepository {
  return {
    hasPermission: vi.fn().mockResolvedValue(true),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined),
    createWarehouseConsolidation: vi.fn(),
    createShipmentFromWarehouseConsolidation: vi.fn(),
    getWarehouseTallyRepeatStatistics: vi.fn(),
    ...overrides
  };
}

describe('WarehouseTallyOperationsService', () => {
  it('preserves consolidation, shipment and repeat-statistics arguments and results', async () => {
    const consolidation = { id: 'consolidation-1' } as Awaited<ReturnType<WarehouseTallyOperationsRepository['createWarehouseConsolidation']>>;
    const statistics = { batches: [] } as unknown as WarehouseTallyRepeatStatisticsResponse;
    const repository = repositoryStub({
      createWarehouseConsolidation: vi.fn().mockResolvedValue(consolidation),
      createShipmentFromWarehouseConsolidation: vi.fn().mockResolvedValue(consolidation),
      getWarehouseTallyRepeatStatistics: vi.fn().mockResolvedValue(statistics)
    });
    const service = new WarehouseTallyOperationsService(repository);
    const input = { packageIds: ['package-1'], mode: 'MERGE_ONLY' as const };
    const query = { datePreset: 'ALL' as const, onlyRepeated: 'true' as const };

    await expect(service.createConsolidation(principal, input)).resolves.toBe(consolidation);
    await expect(service.createShipment(principal, 'consolidation-1')).resolves.toBe(consolidation);
    await expect(service.repeatStatistics(principal, query)).resolves.toBe(statistics);

    expect(repository.hasPermission).toHaveBeenCalledWith(principal.role, 'warehouse:tally-pending:merge-only');
    expect(repository.createWarehouseConsolidation).toHaveBeenCalledWith(principal, input);
    expect(repository.createShipmentFromWarehouseConsolidation).toHaveBeenCalledWith(principal, 'consolidation-1');
    expect(repository.getWarehouseTallyRepeatStatistics).toHaveBeenCalledWith(principal, query);
  });

  it('preserves the dynamic merge-and-ship denial audit and generic error', async () => {
    const repository = repositoryStub({
      hasPermission: vi.fn().mockResolvedValue(false)
    });
    const service = new WarehouseTallyOperationsService(repository);
    const input = { packageIds: ['package-1'], mode: 'MERGE_AND_SHIP' as const };

    await expect(service.createConsolidation(principal, input)).rejects.toEqual(
      new ForbiddenException('没有访问权限')
    );
    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(principal, {
      permissions: ['warehouse:tally-pending:merge-and-ship'],
      method: 'SERVER',
      path: 'warehouse granular action'
    });
    expect(repository.createWarehouseConsolidation).not.toHaveBeenCalled();
  });

  it('keeps the denial outcome when denial auditing itself fails', async () => {
    const repository = repositoryStub({
      hasPermission: vi.fn().mockResolvedValue(false),
      recordPermissionDenied: vi.fn().mockRejectedValue(new Error('audit unavailable'))
    });
    const service = new WarehouseTallyOperationsService(repository);

    await expect(service.createConsolidation(principal, {
      packageIds: ['package-1'],
      mode: 'MERGE_ONLY'
    })).rejects.toEqual(new ForbiddenException('没有访问权限'));
  });
});

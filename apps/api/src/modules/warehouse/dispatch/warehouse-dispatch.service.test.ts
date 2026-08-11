import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { WarehouseDispatchRepository } from './warehouse-dispatch.repository.js';
import { WarehouseDispatchService } from './warehouse-dispatch.service.js';

const principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;

function repositoryStub(
  overrides: Partial<WarehouseDispatchRepository> = {}
): WarehouseDispatchRepository {
  return {
    getWarehouseDispatchShipments: vi.fn(),
    updateWarehouseDispatchDeclaration: vi.fn(),
    getWarehouseHandover: vi.fn(),
    printWarehouseHandover: vi.fn(),
    ...overrides
  };
}

describe('WarehouseDispatchService', () => {
  it('preserves repository arguments and results for all four dispatch operations', async () => {
    const shipments = [{ id: 's-phase19' }];
    const declaration = { id: 's-phase19', declarationRequired: true };
    const handover = { shipmentId: 's-phase19', printCount: 1 };
    const printed = { rows: [handover] };
    const repository = repositoryStub({
      getWarehouseDispatchShipments: vi.fn().mockResolvedValue(shipments),
      updateWarehouseDispatchDeclaration: vi.fn().mockResolvedValue(declaration),
      getWarehouseHandover: vi.fn().mockResolvedValue(handover),
      printWarehouseHandover: vi.fn().mockResolvedValue(printed)
    });
    const service = new WarehouseDispatchService(repository);

    await expect(service.shipments(principal)).resolves.toBe(shipments);
    await expect(service.updateDeclaration(principal, 's-phase19', {
      declarationRequired: true
    })).resolves.toBe(declaration);
    await expect(service.handover(principal, 's-phase19')).resolves.toBe(handover);
    await expect(service.printHandover(principal, {
      shipmentIds: ['s-phase19', 's-phase19']
    })).resolves.toBe(printed);

    expect(repository.getWarehouseDispatchShipments).toHaveBeenCalledWith(principal);
    expect(repository.updateWarehouseDispatchDeclaration).toHaveBeenCalledWith(
      principal,
      's-phase19',
      { declarationRequired: true }
    );
    expect(repository.getWarehouseHandover).toHaveBeenCalledWith(principal, 's-phase19');
    expect(repository.printWarehouseHandover).toHaveBeenCalledWith(principal, {
      shipmentIds: ['s-phase19', 's-phase19']
    });
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing handover rejection');
    const service = new WarehouseDispatchService(repositoryStub({
      printWarehouseHandover: vi.fn().mockRejectedValue(failure)
    }));

    await expect(service.printHandover(principal, { shipmentIds: [] })).rejects.toBe(failure);
  });
});

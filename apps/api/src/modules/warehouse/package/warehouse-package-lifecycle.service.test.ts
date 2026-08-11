import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { WarehousePackageLifecycleRepository } from './warehouse-package-lifecycle.repository.js';
import { WarehousePackageLifecycleService } from './warehouse-package-lifecycle.service.js';

const principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;

function repositoryStub(
  overrides: Partial<WarehousePackageLifecycleRepository> = {}
): WarehousePackageLifecycleRepository {
  return {
    assertWarehouseManualReceiptCustomer: vi.fn(),
    createWarehousePackage: vi.fn(),
    createWarehouseManualReceipt: vi.fn(),
    replenishWarehouseSameSpec: vi.fn(),
    splitWarehousePackage: vi.fn(),
    updateWarehousePackage: vi.fn(),
    updateWarehousePackageRemark: vi.fn(),
    updateWarehousePackageException: vi.fn(),
    ...overrides
  };
}

describe('WarehousePackageLifecycleService', () => {
  it('preserves all lifecycle arguments and results through the port', async () => {
    const directResult = { id: 'package-direct' };
    const manualResult = { totalPackages: 2 };
    const replenishResult = { totalPackageCount: 3 };
    const splitResult = { packages: [{ id: 'package-split' }] };
    const updateResult = { id: 'package-update' };
    const remarkResult = { id: 'package-remark' };
    const exceptionResult = { id: 'package-exception' };
    const repository = repositoryStub({
      assertWarehouseManualReceiptCustomer: vi.fn().mockResolvedValue(undefined),
      createWarehousePackage: vi.fn().mockResolvedValue(directResult),
      createWarehouseManualReceipt: vi.fn().mockResolvedValue(manualResult),
      replenishWarehouseSameSpec: vi.fn().mockResolvedValue(replenishResult),
      splitWarehousePackage: vi.fn().mockResolvedValue(splitResult),
      updateWarehousePackage: vi.fn().mockResolvedValue(updateResult),
      updateWarehousePackageRemark: vi.fn().mockResolvedValue(remarkResult),
      updateWarehousePackageException: vi.fn().mockResolvedValue(exceptionResult)
    });
    const service = new WarehousePackageLifecycleService(repository);
    const directInput = { customerCode: '9409' } as Parameters<typeof service.create>[1];
    const manualInput = { customerCode: '9409' } as Parameters<typeof service.createManualReceipt>[1];
    const replenishInput = { supplementCount: 2, requestId: 'request-1' };
    const splitInput = { pieces: [1, 1], remark: '拆票' };
    const updateInput = { packageCount: 2, weightKg: 12 };
    const remarkInput = { remark: '更新备注' };
    const exceptionInput = { manualException: '外箱破损' };

    await expect(service.create(principal, directInput)).resolves.toBe(directResult);
    await expect(service.createManualReceipt(principal, manualInput)).resolves.toBe(manualResult);
    await expect(service.replenishSameSpec(principal, 'package-1', replenishInput)).resolves.toBe(replenishResult);
    await expect(service.split(principal, 'package-1', splitInput)).resolves.toBe(splitResult);
    await expect(service.update(principal, 'package-1', updateInput)).resolves.toBe(updateResult);
    await expect(service.updateRemark(principal, 'package-1', remarkInput)).resolves.toBe(remarkResult);
    await expect(service.updateException(principal, 'package-1', exceptionInput)).resolves.toBe(exceptionResult);

    expect(repository.assertWarehouseManualReceiptCustomer).toHaveBeenNthCalledWith(1, principal, '9409');
    expect(repository.assertWarehouseManualReceiptCustomer).toHaveBeenNthCalledWith(2, principal, '9409');
    expect(repository.createWarehousePackage).toHaveBeenCalledWith(principal, directInput);
    expect(repository.createWarehouseManualReceipt).toHaveBeenCalledWith(principal, manualInput);
    expect(repository.replenishWarehouseSameSpec).toHaveBeenCalledWith(principal, 'package-1', replenishInput);
    expect(repository.splitWarehousePackage).toHaveBeenCalledWith(principal, 'package-1', splitInput);
    expect(repository.updateWarehousePackage).toHaveBeenCalledWith(principal, 'package-1', updateInput);
    expect(repository.updateWarehousePackageRemark).toHaveBeenCalledWith(principal, 'package-1', remarkInput);
    expect(repository.updateWarehousePackageException).toHaveBeenCalledWith(principal, 'package-1', exceptionInput);

    const assertionCalls = vi.mocked(repository.assertWarehouseManualReceiptCustomer).mock.invocationCallOrder;
    expect(assertionCalls[0]).toBeLessThan(vi.mocked(repository.createWarehousePackage).mock.invocationCallOrder[0]);
    expect(assertionCalls[1]).toBeLessThan(vi.mocked(repository.createWarehouseManualReceipt).mock.invocationCallOrder[0]);
  });

  it('stops direct and manual creation when the existing customer precheck rejects', async () => {
    const failure = new Error('existing customer scope rejection');
    const repository = repositoryStub({
      assertWarehouseManualReceiptCustomer: vi.fn().mockRejectedValue(failure)
    });
    const service = new WarehousePackageLifecycleService(repository);
    const directInput = { customerCode: '9409' } as Parameters<typeof service.create>[1];
    const manualInput = { customerCode: '9409' } as Parameters<typeof service.createManualReceipt>[1];

    await expect(service.create(principal, directInput)).rejects.toBe(failure);
    await expect(service.createManualReceipt(principal, manualInput)).rejects.toBe(failure);
    expect(repository.createWarehousePackage).not.toHaveBeenCalled();
    expect(repository.createWarehouseManualReceipt).not.toHaveBeenCalled();
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing package rejection');
    const repository = repositoryStub({
      splitWarehousePackage: vi.fn().mockRejectedValue(failure)
    });
    const service = new WarehousePackageLifecycleService(repository);

    await expect(service.split(principal, 'package-1', { pieces: [1, 1] })).rejects.toBe(failure);
  });
});

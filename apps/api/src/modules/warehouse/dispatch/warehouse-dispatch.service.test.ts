import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type {
  WarehouseDispatchAuthorizer,
  WarehouseDispatchRepository
} from './warehouse-dispatch.repository.js';
import { WarehouseDispatchService } from './warehouse-dispatch.service.js';

const principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;

function repositoryStub(
  overrides: Partial<WarehouseDispatchRepository> = {}
): WarehouseDispatchRepository {
  return {
    getWarehouseDispatchShipments: vi.fn(),
    updateWarehouseDispatchDeclaration: vi.fn(),
    updateWarehouseDispatchInboundNo: vi.fn(),
    getWarehouseHandover: vi.fn(),
    printWarehouseHandover: vi.fn(),
    dispatchShipment: vi.fn(),
    ...overrides
  };
}

function authorizerStub(
  overrides: Partial<WarehouseDispatchAuthorizer> = {}
): WarehouseDispatchAuthorizer {
  return {
    hasPermission: vi.fn().mockResolvedValue(true),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe('WarehouseDispatchService', () => {
  it('preserves repository arguments and results for all five dispatch operations', async () => {
    const shipments = [{ id: 's-phase19' }];
    const declaration = { id: 's-phase19', declarationRequired: true };
    const handover = { shipmentId: 's-phase19', printCount: 1 };
    const printed = { rows: [handover] };
    const dispatched = { id: 's-phase19', status: 'OUTBOUNDED' };
    const repository = repositoryStub({
      getWarehouseDispatchShipments: vi.fn().mockResolvedValue(shipments),
      updateWarehouseDispatchDeclaration: vi.fn().mockResolvedValue(declaration),
      getWarehouseHandover: vi.fn().mockResolvedValue(handover),
      printWarehouseHandover: vi.fn().mockResolvedValue(printed),
      dispatchShipment: vi.fn().mockResolvedValue(dispatched)
    });
    const authorizer = authorizerStub();
    const service = new WarehouseDispatchService(repository, authorizer);

    await expect(service.shipments(principal)).resolves.toBe(shipments);
    await expect(service.updateDeclaration(principal, 's-phase19', {
      declarationRequired: true
    })).resolves.toBe(declaration);
    await expect(service.handover(principal, 's-phase19')).resolves.toBe(handover);
    await expect(service.printHandover(principal, {
      shipmentIds: ['s-phase19', 's-phase19']
    })).resolves.toBe(printed);
    await expect(service.dispatch(principal, 's-phase19', {
      batchDispatchSource: 'warehouse.batch_dispatch_handover',
      shippingMarkConfirmed: true
    })).resolves.toBe(dispatched);

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
    expect(authorizer.hasPermission).toHaveBeenNthCalledWith(
      1,
      principal.role,
      'warehouse:dispatch-pending:dispatch-confirm'
    );
    expect(authorizer.hasPermission).toHaveBeenNthCalledWith(
      2,
      principal.role,
      'warehouse:dispatch-pending:batch-dispatch-confirm'
    );
    expect(authorizer.hasPermission).toHaveBeenNthCalledWith(
      3,
      principal.role,
      'warehouse:dispatch-pending:shipping-mark-confirm'
    );
    expect(repository.dispatchShipment).toHaveBeenCalledWith(principal, 's-phase19', {
      batchDispatchSource: 'warehouse.batch_dispatch_handover',
      shippingMarkConfirmed: true
    });
  });

  it.each([
    {
      label: 'base confirmation',
      denied: 'warehouse:dispatch-pending:dispatch-confirm' as const,
      input: {},
      checked: ['warehouse:dispatch-pending:dispatch-confirm']
    },
    {
      label: 'batch confirmation',
      denied: 'warehouse:dispatch-pending:batch-dispatch-confirm' as const,
      input: { batchDispatchSource: 'warehouse.batch_dispatch_handover' },
      checked: [
        'warehouse:dispatch-pending:dispatch-confirm',
        'warehouse:dispatch-pending:batch-dispatch-confirm'
      ]
    },
    {
      label: 'shipping mark confirmation',
      denied: 'warehouse:dispatch-pending:shipping-mark-confirm' as const,
      input: { shippingMarkConfirmed: true },
      checked: [
        'warehouse:dispatch-pending:dispatch-confirm',
        'warehouse:dispatch-pending:shipping-mark-confirm'
      ]
    }
  ])('preserves $label denial before repository access', async ({ denied, input, checked }) => {
    const repository = repositoryStub();
    const authorizer = authorizerStub({
      hasPermission: vi.fn().mockImplementation(async (_role, permission) => permission !== denied)
    });
    const service = new WarehouseDispatchService(repository, authorizer);

    await expect(service.dispatch(principal, 's-phase20', input)).rejects.toThrow('没有访问权限');
    expect(authorizer.hasPermission).toHaveBeenCalledTimes(checked.length);
    checked.forEach((permission, index) => {
      expect(authorizer.hasPermission).toHaveBeenNthCalledWith(index + 1, principal.role, permission);
    });
    expect(authorizer.recordPermissionDenied).toHaveBeenCalledWith(principal, {
      permissions: [denied],
      method: 'SERVER',
      path: 'warehouse granular action'
    });
    expect(repository.dispatchShipment).not.toHaveBeenCalled();
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing handover rejection');
    const service = new WarehouseDispatchService(repositoryStub({
      printWarehouseHandover: vi.fn().mockRejectedValue(failure)
    }), authorizerStub());

    await expect(service.printHandover(principal, { shipmentIds: [] })).rejects.toBe(failure);
  });
});

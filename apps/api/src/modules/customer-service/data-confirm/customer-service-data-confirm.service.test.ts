import { ForbiddenException } from '@nestjs/common';
import type { CustomerServiceDataReviewInput, CustomerServiceFinanceItemUpdateInput } from '@siyuan/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionKey, Principal } from '../../rbac.js';
import { CustomerServiceDataConfirmService } from './customer-service-data-confirm.service.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const servicePrincipal: Principal = { id: 'u-service', username: 'service', role: 'UG_CUSTOMER_SERVICE' };
const reviewBody = { remark: '审核' } as CustomerServiceDataReviewInput;
const financeBody = {} as CustomerServiceFinanceItemUpdateInput;

function buildRepository() {
  return {
    hasPermission: vi.fn<(role: string, permission: PermissionKey) => Promise<boolean>>().mockResolvedValue(false),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined),
    approveShipmentBusinessData: vi.fn(),
    approveShipmentAgentData: vi.fn(),
    updateShipmentBusinessData: vi.fn(),
    getCustomerServiceFinanceUpdatePreview: vi.fn().mockResolvedValue({ rows: [] }),
    updateCustomerServiceFinanceItem: vi.fn().mockResolvedValue({ id: 'fee-1' }),
    updateShipmentAgentData: vi.fn(),
    reverseShipmentBusinessData: vi.fn(),
    reverseShipmentAgentData: vi.fn(),
    approveShipmentAllData: vi.fn().mockResolvedValue({ id: 'shipment-1' }),
    reverseShipmentAllData: vi.fn(),
    customerServiceDataConfirmShipmentsPage: vi.fn()
  };
}

describe('CustomerServiceDataConfirmService', () => {
  let repository: ReturnType<typeof buildRepository>;
  let service: CustomerServiceDataConfirmService;

  beforeEach(() => {
    repository = buildRepository();
    service = new CustomerServiceDataConfirmService(repository as never);
  });

  it('keeps omitted cost-preview kind mapped to business permission and repository kind', async () => {
    repository.hasPermission.mockImplementation(async (_role, permission) => permission === 'customer-service:data-confirm:business-update');

    await expect(service.previewFinance(servicePrincipal, 'shipment-1')).resolves.toEqual({ rows: [] });
    expect(repository.hasPermission.mock.calls).toEqual([
      ['UG_CUSTOMER_SERVICE', 'customer-service:data-confirm:business-update'],
      ['UG_CUSTOMER_SERVICE', 'customer-service:data-confirm:business-update-block']
    ]);
    expect(repository.getCustomerServiceFinanceUpdatePreview).toHaveBeenCalledWith(servicePrincipal, 'shipment-1', 'business');
  });

  it('checks both approve-all masks in business-then-agent order before writing', async () => {
    repository.hasPermission.mockImplementation(async (_role, permission) => permission === 'customer-service:data-confirm:agent-approve-block');

    await expect(service.approveAll(servicePrincipal, 'shipment-1', reviewBody)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.hasPermission.mock.calls).toEqual([
      ['UG_CUSTOMER_SERVICE', 'customer-service:data-confirm:business-approve-block'],
      ['UG_CUSTOMER_SERVICE', 'customer-service:data-confirm:agent-approve-block']
    ]);
    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(servicePrincipal, {
      permissions: ['customer-service:data-confirm:agent-approve-block'],
      method: 'SERVER',
      path: 'customer-service masked action: customer-service:data-confirm:agent-approve-block'
    });
    expect(repository.approveShipmentAllData).not.toHaveBeenCalled();
  });

  it('lets administrators bypass action masks exactly as before', async () => {
    await expect(service.approveAll(admin, 'shipment-1', reviewBody)).resolves.toEqual({ id: 'shipment-1' });
    expect(repository.hasPermission).not.toHaveBeenCalled();
    expect(repository.recordPermissionDenied).not.toHaveBeenCalled();
    expect(repository.approveShipmentAllData).toHaveBeenCalledWith(admin, 'shipment-1', reviewBody);
  });

  it('requires the selected agent permission and block check before finance mutation', async () => {
    repository.hasPermission.mockImplementation(async (_role, permission) => permission === 'customer-service:data-confirm:agent-update');

    await expect(service.updateFinanceItem(servicePrincipal, 'shipment-1', 'fee-1', 'agent', financeBody))
      .resolves.toEqual({ id: 'fee-1' });
    expect(repository.hasPermission.mock.calls).toEqual([
      ['UG_CUSTOMER_SERVICE', 'customer-service:data-confirm:agent-update'],
      ['UG_CUSTOMER_SERVICE', 'customer-service:data-confirm:agent-update-block']
    ]);
    expect(repository.updateCustomerServiceFinanceItem).toHaveBeenCalledWith(
      servicePrincipal,
      'shipment-1',
      'fee-1',
      'agent',
      financeBody
    );
  });

  it('preserves the intended forbidden result when denied-audit persistence fails', async () => {
    repository.recordPermissionDenied.mockRejectedValue(new Error('audit unavailable'));

    await expect(service.previewFinance(servicePrincipal, 'shipment-1', 'business')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.getCustomerServiceFinanceUpdatePreview).not.toHaveBeenCalled();
  });
});

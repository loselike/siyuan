import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type {
  CustomerServiceDataConfirmListQuery,
  CustomerServiceDataReviewInput,
  CustomerServiceDataReverseInput,
  CustomerServiceDataUpdateInput,
  CustomerServiceFinanceItemUpdateInput
} from '@siyuan/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionKey, Principal } from '../../rbac.js';
import { CustomerServiceDataConfirmController } from './customer-service-data-confirm.controller.js';
import { CustomerServiceDataConfirmService } from './customer-service-data-confirm.service.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const service: Principal = { id: 'u-service', username: 'service', role: 'UG_CUSTOMER_SERVICE' };
const reviewBody = { remark: '保持原审核请求' } as CustomerServiceDataReviewInput;
const reverseBody: CustomerServiceDataReverseInput = {
  expectedOutboundAt: '2026-06-10T08:00:00.000Z',
  reason: '保持原反审核请求'
};
const updateBody = {} as CustomerServiceDataUpdateInput;
const financeBody = {} as CustomerServiceFinanceItemUpdateInput;
const listQuery = { page: 2, pageSize: 20, outboundOrderNo: 'OUT-1' } as CustomerServiceDataConfirmListQuery;

function buildRepository() {
  return {
    hasPermission: vi.fn<(role: string, permission: PermissionKey) => Promise<boolean>>().mockResolvedValue(true),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined),
    approveShipmentBusinessData: vi.fn().mockResolvedValue({ operation: 'business-approve' }),
    approveShipmentAgentData: vi.fn().mockResolvedValue({ operation: 'agent-approve' }),
    updateShipmentBusinessData: vi.fn().mockResolvedValue({ operation: 'business-update' }),
    getCustomerServiceFinanceUpdatePreview: vi.fn().mockResolvedValue({ rows: [] }),
    updateCustomerServiceFinanceItem: vi.fn().mockResolvedValue({ id: 'fee-1' }),
    updateShipmentAgentData: vi.fn().mockResolvedValue({ operation: 'agent-update' }),
    reverseShipmentBusinessData: vi.fn().mockResolvedValue({ operation: 'business-reverse' }),
    reverseShipmentAgentData: vi.fn().mockResolvedValue({ operation: 'agent-reverse' }),
    approveShipmentAllData: vi.fn().mockResolvedValue({ operation: 'all-approve' }),
    reverseShipmentAllData: vi.fn().mockResolvedValue({ operation: 'all-reverse' }),
    customerServiceDataConfirmShipmentsPage: vi.fn().mockResolvedValue({ rows: [], pagination: { page: 2, pageSize: 20, totalItems: 0 } })
  };
}

describe('customer service data confirm migration characterization', () => {
  let repository: ReturnType<typeof buildRepository>;
  let controller: CustomerServiceDataConfirmController;

  beforeEach(() => {
    repository = buildRepository();
    controller = new CustomerServiceDataConfirmController(
      new CustomerServiceDataConfirmService(repository as never)
    );
  });

  it('delegates all eleven existing routes without changing arguments', async () => {
    await expect(controller.approveShipmentBusinessData({ user: admin }, 'shipment-1', reviewBody)).resolves.toEqual({ operation: 'business-approve' });
    await expect(controller.approveShipmentAgentData({ user: admin }, 'shipment-1', reviewBody)).resolves.toEqual({ operation: 'agent-approve' });
    await expect(controller.updateShipmentBusinessData({ user: admin }, 'shipment-1', updateBody)).resolves.toEqual({ operation: 'business-update' });
    await expect(controller.customerServiceCostPreview({ user: admin }, 'shipment-1', 'agent')).resolves.toEqual({ rows: [] });
    await expect(controller.updateCustomerServiceFinanceItem({ user: admin }, 'shipment-1', 'fee-1', 'business', financeBody)).resolves.toEqual({ id: 'fee-1' });
    await expect(controller.updateShipmentAgentData({ user: admin }, 'shipment-1', updateBody)).resolves.toEqual({ operation: 'agent-update' });
    await expect(controller.reverseShipmentBusinessData({ user: admin }, 'shipment-1', reverseBody)).resolves.toEqual({ operation: 'business-reverse' });
    await expect(controller.reverseShipmentAgentData({ user: admin }, 'shipment-1', reverseBody)).resolves.toEqual({ operation: 'agent-reverse' });
    await expect(controller.approveShipmentAllData({ user: admin }, 'shipment-1', reviewBody)).resolves.toEqual({ operation: 'all-approve' });
    await expect(controller.reverseShipmentAllData({ user: admin }, 'shipment-1', reverseBody)).resolves.toEqual({ operation: 'all-reverse' });
    await expect(controller.customerServiceDataConfirmShipments({ user: admin }, listQuery)).resolves.toEqual({
      rows: [],
      pagination: { page: 2, pageSize: 20, totalItems: 0 }
    });

    expect(repository.approveShipmentBusinessData).toHaveBeenCalledWith(admin, 'shipment-1', reviewBody);
    expect(repository.approveShipmentAgentData).toHaveBeenCalledWith(admin, 'shipment-1', reviewBody);
    expect(repository.updateShipmentBusinessData).toHaveBeenCalledWith(admin, 'shipment-1', updateBody);
    expect(repository.getCustomerServiceFinanceUpdatePreview).toHaveBeenCalledWith(admin, 'shipment-1', 'agent');
    expect(repository.updateCustomerServiceFinanceItem).toHaveBeenCalledWith(admin, 'shipment-1', 'fee-1', 'business', financeBody);
    expect(repository.updateShipmentAgentData).toHaveBeenCalledWith(admin, 'shipment-1', updateBody);
    expect(repository.reverseShipmentBusinessData).toHaveBeenCalledWith(admin, 'shipment-1', reverseBody);
    expect(repository.reverseShipmentAgentData).toHaveBeenCalledWith(admin, 'shipment-1', reverseBody);
    expect(repository.approveShipmentAllData).toHaveBeenCalledWith(admin, 'shipment-1', reviewBody);
    expect(repository.reverseShipmentAllData).toHaveBeenCalledWith(admin, 'shipment-1', reverseBody);
    expect(repository.customerServiceDataConfirmShipmentsPage).toHaveBeenCalledWith(admin, listQuery);
  });

  it('rejects block-mask permissions before repository writes with the existing audit payload', async () => {
    repository.hasPermission.mockImplementation(async (_role, permission) => permission === 'customer-service:data-confirm:business-approve-block');

    await expect(controller.approveShipmentBusinessData({ user: service }, 'shipment-1', reviewBody))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.approveShipmentBusinessData).not.toHaveBeenCalled();
    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(service, {
      permissions: ['customer-service:data-confirm:business-approve-block'],
      method: 'SERVER',
      path: 'customer-service masked action: customer-service:data-confirm:business-approve-block'
    });
  });

  it('keeps kind validation and the additional granular permission check ahead of finance access', async () => {
    await expect(controller.customerServiceCostPreview({ user: service }, 'shipment-1', 'invalid'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.updateCustomerServiceFinanceItem({ user: service }, 'shipment-1', 'fee-1', 'invalid', financeBody))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.getCustomerServiceFinanceUpdatePreview).not.toHaveBeenCalled();
    expect(repository.updateCustomerServiceFinanceItem).not.toHaveBeenCalled();

    repository.hasPermission.mockResolvedValue(false);
    await expect(controller.customerServiceCostPreview({ user: service }, 'shipment-1', 'business'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(service, {
      permissions: ['customer-service:data-confirm:business-update'],
      method: 'SERVER',
      path: 'warehouse granular action'
    });
    expect(repository.getCustomerServiceFinanceUpdatePreview).not.toHaveBeenCalled();
  });
});

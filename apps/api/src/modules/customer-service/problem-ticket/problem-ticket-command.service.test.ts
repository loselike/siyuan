import { ForbiddenException } from '@nestjs/common';
import type { ProblemTicketCreateInput } from '@siyuan/shared/problem-ticket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionKey, Principal } from '../../rbac.js';
import { ProblemTicketCommandService } from './problem-ticket-command.service.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const service: Principal = { id: 'u-service', username: 'service', role: 'UG_CUSTOMER_SERVICE' };
const input: ProblemTicketCreateInput = {
  reason: '保持原问题件请求',
  customerVisible: false,
  tags: ['轨迹异常'],
  pushToSales: true
};

function ticket(id: string) {
  return {
    id,
    shipmentId: 'shipment-1',
    systemOrderNo: 'SY-1',
    customerName: '客户',
    reason: input.reason,
    status: 'OPEN',
    customerVisible: true,
    createdAt: '2026-08-12T00:00:00.000Z',
    replies: []
  };
}

function buildRepository() {
  return {
    hasPermission: vi.fn<(role: string, permission: PermissionKey) => Promise<boolean>>().mockResolvedValue(true),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined),
    assertCustomerServiceProblemCreationAllowed: vi.fn().mockResolvedValue(undefined),
    createProblemTicket: vi.fn().mockResolvedValue(ticket('ticket-create')),
    replyProblemTicket: vi.fn().mockResolvedValue(ticket('ticket-reply')),
    closeProblemTicket: vi.fn().mockResolvedValue({ ...ticket('ticket-close'), status: 'CLOSED' }),
    assistProblemTicket: vi.fn().mockResolvedValue({ ...ticket('ticket-assist'), status: 'ASSISTANCE_REQUIRED' })
  };
}

describe('ProblemTicketCommandService', () => {
  let repository: ReturnType<typeof buildRepository>;
  let serviceUnderTest: ProblemTicketCommandService;

  beforeEach(() => {
    repository = buildRepository();
    serviceUnderTest = new ProblemTicketCommandService(repository as never);
  });

  it('keeps all six repository argument contracts and existing defaults', async () => {
    await serviceUnderTest.createForCustomerService(admin, 'shipment-1', input);
    await serviceUnderTest.createForBusiness(admin, 'shipment-1', input);
    await serviceUnderTest.createForOperations(admin, 'shipment-1', input);
    await serviceUnderTest.reply(admin, 'ticket-1', undefined);
    await serviceUnderTest.close(admin, 'ticket-1', undefined);
    await serviceUnderTest.assist(admin, 'ticket-1', undefined);

    expect(repository.createProblemTicket).toHaveBeenNthCalledWith(1, admin, 'shipment-1', input);
    expect(repository.createProblemTicket).toHaveBeenNthCalledWith(2, admin, 'shipment-1', {
      ...input,
      customerVisible: true,
      pushToSales: undefined
    });
    expect(repository.createProblemTicket).toHaveBeenNthCalledWith(3, admin, 'shipment-1', {
      ...input,
      customerVisible: false,
      pushToSales: undefined
    });
    expect(repository.replyProblemTicket).toHaveBeenCalledWith(admin, 'ticket-1', '');
    expect(repository.closeProblemTicket).toHaveBeenCalledWith(admin, 'ticket-1', undefined);
    expect(repository.assistProblemTicket).toHaveBeenCalledWith(admin, 'ticket-1', '需要协助处理');
  });

  it('keeps granular permission and shipment-stage checks ahead of customer-service creation', async () => {
    repository.hasPermission.mockImplementation(async (_role, permission) => (
      permission === 'customer-service:delivering:problem-create'
    ));

    await serviceUnderTest.createForCustomerService(service, 'shipment-1', input);

    expect(repository.hasPermission).toHaveBeenCalledTimes(8);
    expect(repository.assertCustomerServiceProblemCreationAllowed).toHaveBeenCalledWith(service, 'shipment-1');
    expect(repository.assertCustomerServiceProblemCreationAllowed.mock.invocationCallOrder[0])
      .toBeLessThan(repository.createProblemTicket.mock.invocationCallOrder[0]);
  });

  it('keeps the existing denial audit payload and rejects before repository writes', async () => {
    repository.hasPermission.mockResolvedValue(false);

    await expect(serviceUnderTest.createForCustomerService(service, 'shipment-1', input))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(service, {
      permissions: [
        'customer-service:problem:create',
        'customer-service:pending-routing:problem-create',
        'customer-service:waiting-departure:problem-create',
        'customer-service:departed:problem-create',
        'customer-service:arrived-port:problem-create',
        'customer-service:delivering:problem-create',
        'customer-service:delivering:after-sale-create',
        'customer-service:signed:after-sale-create'
      ],
      method: 'SERVER',
      path: 'customer-service granular action'
    });
    expect(repository.assertCustomerServiceProblemCreationAllowed).not.toHaveBeenCalled();
    expect(repository.createProblemTicket).not.toHaveBeenCalled();
  });

  it('does not write when the existing shipment-stage guard rejects', async () => {
    repository.assertCustomerServiceProblemCreationAllowed.mockRejectedValue(new ForbiddenException('当前角色不能在该运单阶段创建问题件'));

    await expect(serviceUnderTest.createForCustomerService(service, 'shipment-1', input))
      .rejects.toThrow('当前角色不能在该运单阶段创建问题件');
    expect(repository.createProblemTicket).not.toHaveBeenCalled();
  });
});

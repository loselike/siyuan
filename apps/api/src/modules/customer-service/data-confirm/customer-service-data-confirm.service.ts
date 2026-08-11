import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { isAdministratorRole, type PermissionKey, type Principal } from '../../rbac.js';
import {
  CUSTOMER_SERVICE_DATA_CONFIRM_REPOSITORY,
  type CustomerServiceDataConfirmListQuery,
  type CustomerServiceDataConfirmRepository,
  type CustomerServiceDataReviewInput,
  type CustomerServiceDataReverseInput,
  type CustomerServiceDataUpdateInput,
  type CustomerServiceFinanceItemUpdateInput
} from './customer-service-data-confirm.repository.js';

@Injectable()
export class CustomerServiceDataConfirmService {
  constructor(
    @Inject(CUSTOMER_SERVICE_DATA_CONFIRM_REPOSITORY)
    private readonly repository: CustomerServiceDataConfirmRepository
  ) {}

  async approveBusiness(principal: Principal, id: string, body: CustomerServiceDataReviewInput) {
    await this.ensurePermissionUnblocked(principal, 'customer-service:data-confirm:business-approve-block');
    return this.repository.approveShipmentBusinessData(principal, id, body);
  }

  async approveAgent(principal: Principal, id: string, body: CustomerServiceDataReviewInput) {
    await this.ensurePermissionUnblocked(principal, 'customer-service:data-confirm:agent-approve-block');
    return this.repository.approveShipmentAgentData(principal, id, body);
  }

  async updateBusiness(principal: Principal, id: string, body: CustomerServiceDataUpdateInput) {
    await this.ensurePermissionUnblocked(principal, 'customer-service:data-confirm:business-update-block');
    return this.repository.updateShipmentBusinessData(principal, id, body);
  }

  async previewFinance(principal: Principal, id: string, kind?: string) {
    if (kind !== undefined && kind !== 'business' && kind !== 'agent') throw new BadRequestException('费用预览类型无效');
    const normalizedKind = kind === 'agent' ? 'agent' : 'business';
    await this.ensurePermission(
      principal,
      normalizedKind === 'agent'
        ? 'customer-service:data-confirm:agent-update'
        : 'customer-service:data-confirm:business-update'
    );
    await this.ensurePermissionUnblocked(
      principal,
      normalizedKind === 'agent'
        ? 'customer-service:data-confirm:agent-update-block'
        : 'customer-service:data-confirm:business-update-block'
    );
    return this.repository.getCustomerServiceFinanceUpdatePreview(principal, id, normalizedKind);
  }

  async updateFinanceItem(
    principal: Principal,
    id: string,
    feeId: string,
    kind: string,
    body: CustomerServiceFinanceItemUpdateInput
  ) {
    if (kind !== 'business' && kind !== 'agent') throw new BadRequestException('费用修改类型无效');
    await this.ensurePermission(
      principal,
      kind === 'agent'
        ? 'customer-service:data-confirm:agent-update'
        : 'customer-service:data-confirm:business-update'
    );
    await this.ensurePermissionUnblocked(
      principal,
      kind === 'agent'
        ? 'customer-service:data-confirm:agent-update-block'
        : 'customer-service:data-confirm:business-update-block'
    );
    return this.repository.updateCustomerServiceFinanceItem(principal, id, feeId, kind, body);
  }

  async updateAgent(principal: Principal, id: string, body: CustomerServiceDataUpdateInput) {
    await this.ensurePermissionUnblocked(principal, 'customer-service:data-confirm:agent-update-block');
    return this.repository.updateShipmentAgentData(principal, id, body);
  }

  reverseBusiness(principal: Principal, id: string, body: CustomerServiceDataReverseInput) {
    return this.repository.reverseShipmentBusinessData(principal, id, body);
  }

  reverseAgent(principal: Principal, id: string, body: CustomerServiceDataReverseInput) {
    return this.repository.reverseShipmentAgentData(principal, id, body);
  }

  async approveAll(principal: Principal, id: string, body: CustomerServiceDataReviewInput) {
    await this.ensurePermissionUnblocked(principal, 'customer-service:data-confirm:business-approve-block');
    await this.ensurePermissionUnblocked(principal, 'customer-service:data-confirm:agent-approve-block');
    return this.repository.approveShipmentAllData(principal, id, body);
  }

  reverseAll(principal: Principal, id: string, body: CustomerServiceDataReverseInput) {
    return this.repository.reverseShipmentAllData(principal, id, body);
  }

  list(principal: Principal, query: CustomerServiceDataConfirmListQuery) {
    return this.repository.customerServiceDataConfirmShipmentsPage(principal, query);
  }

  private async ensurePermission(principal: Principal, permission: PermissionKey) {
    if (await this.repository.hasPermission(principal.role, permission)) return;
    await this.repository.recordPermissionDenied(principal, {
      permissions: [permission],
      method: 'SERVER',
      path: 'warehouse granular action'
    }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }

  private async ensurePermissionUnblocked(principal: Principal, mask: PermissionKey) {
    if (isAdministratorRole(principal.role) || !(await this.repository.hasPermission(principal.role, mask))) return;
    await this.repository.recordPermissionDenied(principal, {
      permissions: [mask],
      method: 'SERVER',
      path: `customer-service masked action: ${mask}`
    }).catch(() => undefined);
    throw new ForbiddenException('当前角色已屏蔽该操作');
  }
}

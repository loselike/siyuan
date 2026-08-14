import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PermissionKey, Principal } from '../../rbac.js';
import {
  WAREHOUSE_DISPATCH_AUTHORIZER,
  WAREHOUSE_DISPATCH_REPOSITORY,
  type WarehouseDispatchAuthorizer,
  type WarehouseDispatchRepository
} from './warehouse-dispatch.repository.js';

type WarehouseDispatchDeclarationInput = Parameters<WarehouseDispatchRepository['updateWarehouseDispatchDeclaration']>[2];
type WarehouseHandoverPrintInput = Parameters<WarehouseDispatchRepository['printWarehouseHandover']>[1];
type ShipmentDispatchInput = Parameters<WarehouseDispatchRepository['dispatchShipment']>[2];

@Injectable()
export class WarehouseDispatchService {
  constructor(
    @Inject(WAREHOUSE_DISPATCH_REPOSITORY)
    private readonly repository: WarehouseDispatchRepository,
    @Inject(WAREHOUSE_DISPATCH_AUTHORIZER)
    private readonly authorizer: WarehouseDispatchAuthorizer
  ) {}

  shipments(principal: Principal) {
    return this.repository.getWarehouseDispatchShipments(principal);
  }

  updateDeclaration(principal: Principal, shipmentId: string, input: WarehouseDispatchDeclarationInput) {
    return this.repository.updateWarehouseDispatchDeclaration(principal, shipmentId, input);
  }

  handover(principal: Principal, shipmentId: string) {
    return this.repository.getWarehouseHandover(principal, shipmentId);
  }

  printHandover(principal: Principal, input: WarehouseHandoverPrintInput) {
    return this.repository.printWarehouseHandover(principal, input);
  }

  async dispatch(principal: Principal, shipmentId: string, input: ShipmentDispatchInput) {
    await this.ensurePermission(principal, 'warehouse:dispatch-pending:confirm');
    if (input.batchDispatchSource) {
      await this.ensurePermission(principal, 'warehouse:dispatch-pending:confirm');
    }
    if (input.shippingMarkConfirmed) {
      await this.ensurePermission(principal, 'warehouse:dispatch-pending:shipping-mark-confirm');
    }
    return this.repository.dispatchShipment(principal, shipmentId, input);
  }

  private async ensurePermission(principal: Principal, permission: PermissionKey) {
    if (await this.authorizer.hasPermission(principal.role, permission)) return;
    await this.authorizer.recordPermissionDenied(principal, {
      permissions: [permission],
      method: 'SERVER',
      path: 'warehouse granular action'
    }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }
}

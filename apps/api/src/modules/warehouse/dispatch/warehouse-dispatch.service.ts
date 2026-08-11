import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_DISPATCH_REPOSITORY,
  type WarehouseDispatchRepository
} from './warehouse-dispatch.repository.js';

type WarehouseDispatchDeclarationInput = Parameters<WarehouseDispatchRepository['updateWarehouseDispatchDeclaration']>[2];
type WarehouseHandoverPrintInput = Parameters<WarehouseDispatchRepository['printWarehouseHandover']>[1];

@Injectable()
export class WarehouseDispatchService {
  constructor(
    @Inject(WAREHOUSE_DISPATCH_REPOSITORY)
    private readonly repository: WarehouseDispatchRepository
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
}

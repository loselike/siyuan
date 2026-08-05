import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_INVENTORY_QUERY_REPOSITORY,
  type MojiaWarehouseDuplicateQuery,
  type WarehouseInventoryQueryRepository
} from './warehouse-inventory-query.repository.js';

@Injectable()
export class WarehouseInventoryQueryService {
  constructor(
    @Inject(WAREHOUSE_INVENTORY_QUERY_REPOSITORY)
    private readonly repository: WarehouseInventoryQueryRepository
  ) {}

  listPackages(principal: Principal) {
    return this.repository.getWarehousePackages(principal);
  }

  listPackageGroups(principal: Principal) {
    return this.repository.getWarehousePackageGroups(principal);
  }

  listManualReceiptCustomers(principal: Principal) {
    return this.repository.getWarehouseManualReceiptCustomers(principal);
  }

  findDuplicateMojiaPackage(principal: Principal, query: MojiaWarehouseDuplicateQuery) {
    return this.repository.findDuplicateMojiaPackage(principal, query);
  }
}

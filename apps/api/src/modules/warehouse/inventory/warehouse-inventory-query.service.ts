import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import type {
  WarehouseInStockPageQuery,
  WarehouseInStockQuery,
  WarehouseTodayQuery
} from '@siyuan/shared';
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

  listTodayReceipts(principal: Principal, query: WarehouseTodayQuery) {
    return this.repository.getWarehouseTodayReceipts(principal, query);
  }

  listInStock(principal: Principal, query: WarehouseInStockQuery) {
    return this.repository.getWarehouseInStock(principal, query);
  }

  listInStockPage(principal: Principal, query: WarehouseInStockPageQuery) {
    return this.repository.getWarehouseInStockPage(principal, query);
  }

  getInStockSummary(principal: Principal) {
    return this.repository.getWarehouseInStockSummary(principal);
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

import { Inject, Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';
import type { WarehouseInventoryQueryRepository } from './warehouse-inventory-query.repository.js';

@Injectable()
export class LegacyWarehouseInventoryQueryRepository implements WarehouseInventoryQueryRepository {
  constructor(@Inject(PrismaRepository) private readonly repository: WarehouseInventoryQueryRepository) {}

  getWarehousePackages(principal: Principal) {
    return this.repository.getWarehousePackages(principal);
  }

  getWarehousePackageGroups(principal: Principal) {
    return this.repository.getWarehousePackageGroups(principal);
  }

  getWarehouseManualReceiptCustomers(principal: Principal) {
    return this.repository.getWarehouseManualReceiptCustomers(principal);
  }
}

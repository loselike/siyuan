import { Inject, Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';
import type { WarehouseInStockPageQuery } from '@siyuan/shared';
import type {
  MojiaWarehouseDuplicateQuery,
  WarehouseInventoryQueryRepository
} from './warehouse-inventory-query.repository.js';

@Injectable()
export class LegacyWarehouseInventoryQueryRepository implements WarehouseInventoryQueryRepository {
  constructor(@Inject(PrismaRepository) private readonly repository: WarehouseInventoryQueryRepository) {}

  getWarehousePackages(principal: Principal) {
    return this.repository.getWarehousePackages(principal);
  }

  async getWarehouseInStockPage(principal: Principal, query: WarehouseInStockPageQuery) {
    const page = Math.max(1, Math.trunc(Number(query.page) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(Number(query.pageSize) || 10)));
    const response = await (this.repository as unknown as PrismaRepository).getWarehouseInStock(principal, query);
    return {
      ...response,
      rows: response.rows.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, totalItems: response.rows.length }
    };
  }

  getWarehousePackageGroups(principal: Principal) {
    return this.repository.getWarehousePackageGroups(principal);
  }

  getWarehouseManualReceiptCustomers(principal: Principal) {
    return this.repository.getWarehouseManualReceiptCustomers(principal);
  }

  async findDuplicateMojiaPackage(
    principal: Principal,
    query: MojiaWarehouseDuplicateQuery
  ): Promise<{ combinedOrderNo: string } | undefined> {
    const scanTimeSecond = query.scanTime ? Math.floor(new Date(query.scanTime).getTime() / 1000) : undefined;
    const match = (await this.repository.getWarehousePackages(principal)).find((pkg) =>
      pkg.combinedOrderNo === query.combinedOrderNo
      && pkg.scanSource === '墨家设备'
      && (!scanTimeSecond || (pkg.scanTime && Math.floor(new Date(pkg.scanTime).getTime() / 1000) === scanTimeSecond))
      && (!query.remark || pkg.remark === query.remark)
    );
    return match ? { combinedOrderNo: query.combinedOrderNo } : undefined;
  }
}

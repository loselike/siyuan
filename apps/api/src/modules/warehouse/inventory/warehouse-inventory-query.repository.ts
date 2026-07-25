import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { WarehousePackageGroupSummary, WarehousePackageSummary } from '@siyuan/shared';
import { PrismaService } from '../../prisma.service.js';
import type { Principal } from '../../rbac.js';
import {
  mapWarehousePackagesWithConfirmedTally,
  summarizeWarehousePackageGroups
} from '../warehouse-query.shared.js';

export const WAREHOUSE_INVENTORY_QUERY_REPOSITORY = 'WAREHOUSE_INVENTORY_QUERY_REPOSITORY';

export interface WarehouseInventoryQueryRepository {
  getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]>;
  getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]>;
  getWarehouseManualReceiptCustomers(principal: Principal): Promise<Array<{ code: string; name: string }>>;
}

@Injectable()
export class PrismaWarehouseInventoryQueryRepository implements WarehouseInventoryQueryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    this.ensureWarehouseAccess(principal);
    const rows = await (this.prisma as any).warehousePackage.findMany({
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    return mapWarehousePackagesWithConfirmedTally(this.prisma, rows);
  }

  async getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]> {
    return summarizeWarehousePackageGroups(await this.getWarehousePackages(principal));
  }

  async getWarehouseManualReceiptCustomers(principal: Principal) {
    this.ensureWarehouseAccess(principal);
    const customers = await this.prisma.customer.findMany({
      where: { enabled: true },
      select: { code: true, name: true },
      orderBy: { code: 'asc' }
    });
    return customers.map((customer) => ({ code: customer.code, name: customer.name }));
  }

  private ensureWarehouseAccess(principal: Principal) {
    if (!['ADMIN', 'WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(principal.role)) {
      throw new ForbiddenException('当前角色不能操作仓库管理');
    }
  }
}

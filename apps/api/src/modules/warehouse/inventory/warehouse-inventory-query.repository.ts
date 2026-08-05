import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { WarehousePackageGroupSummary, WarehousePackageSummary } from '@siyuan/shared';
import { PrismaService } from '../../prisma.service.js';
import type { Principal } from '../../rbac.js';
import {
  mapWarehousePackagesWithConfirmedTally,
  summarizeWarehousePackageGroups
} from '../warehouse-query.shared.js';

export const WAREHOUSE_INVENTORY_QUERY_REPOSITORY = 'WAREHOUSE_INVENTORY_QUERY_REPOSITORY';

export interface MojiaWarehouseDuplicateQuery {
  combinedOrderNo: string;
  scanTime?: string;
  remark?: string;
}

export interface WarehouseInventoryQueryRepository {
  getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]>;
  getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]>;
  getWarehouseManualReceiptCustomers(principal: Principal): Promise<Array<{ code: string; name: string }>>;
  findDuplicateMojiaPackage(
    principal: Principal,
    query: MojiaWarehouseDuplicateQuery
  ): Promise<{ combinedOrderNo: string } | undefined>;
}

@Injectable()
export class PrismaWarehouseInventoryQueryRepository implements WarehouseInventoryQueryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getWarehousePackages(principal: Principal): Promise<WarehousePackageSummary[]> {
    const rows = await (this.prisma as any).warehousePackage.findMany({
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    return mapWarehousePackagesWithConfirmedTally(this.prisma, rows);
  }

  async getWarehousePackageGroups(principal: Principal): Promise<WarehousePackageGroupSummary[]> {
    return summarizeWarehousePackageGroups(await this.getWarehousePackages(principal));
  }

  async getWarehouseManualReceiptCustomers(principal: Principal) {
    const salesScope = principal.dataScope === 'SALES_OWN'
      ? [principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value))
      : principal.departmentTeamScope?.filter(Boolean);
    let siteSalespeople: string[] | undefined;
    if (principal.role !== 'ADMIN' && !principal.shipmentAllView && !salesScope?.length) {
      if (!principal.site) throw new ForbiddenException('当前岗位未配置客户或站点数据范围');
      siteSalespeople = (await this.prisma.user.findMany({ where: { site: principal.site, enabled: true }, select: { username: true } }))
        .map((user) => user.username);
    }
    const customers = await this.prisma.customer.findMany({
      where: {
        enabled: true,
        ...(principal.role !== 'ADMIN' && !principal.shipmentAllView ? { salesperson: { in: salesScope?.length ? salesScope : siteSalespeople ?? [] } } : {})
      },
      select: { code: true, name: true },
      orderBy: { code: 'asc' }
    });
    return customers.map((customer) => ({ code: customer.code, name: customer.name }));
  }

  async findDuplicateMojiaPackage(
    principal: Principal,
    query: MojiaWarehouseDuplicateQuery
  ): Promise<{ combinedOrderNo: string } | undefined> {
    const scanTimeSecond = query.scanTime ? Math.floor(new Date(query.scanTime).getTime() / 1000) : undefined;
    const row = await (this.prisma as any).warehousePackage.findFirst({
      where: {
        combinedOrderNo: query.combinedOrderNo,
        scanSource: '墨家设备',
        ...(scanTimeSecond
          ? { scanTime: { gte: new Date(scanTimeSecond * 1000), lt: new Date((scanTimeSecond + 1) * 1000) } }
          : {}),
        ...(query.remark ? { remark: query.remark } : {})
      },
      select: { combinedOrderNo: true },
      orderBy: [{ customerOrderNo: 'asc' }, { scanTime: 'asc' }]
    });
    return row ? { combinedOrderNo: query.combinedOrderNo } : undefined;
  }

}

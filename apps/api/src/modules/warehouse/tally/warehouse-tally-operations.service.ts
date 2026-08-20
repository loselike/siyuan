import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PermissionKey, Principal } from '../../rbac.js';
import {
  WAREHOUSE_TALLY_OPERATIONS_REPOSITORY,
  type WarehouseTallyOperationsRepository
} from './warehouse-tally-operations.repository.js';

type WarehouseConsolidationCreateInput = Parameters<
  WarehouseTallyOperationsRepository['createWarehouseConsolidation']
>[1];
type WarehouseTallyRepeatStatisticsQuery = Parameters<
  WarehouseTallyOperationsRepository['getWarehouseTallyRepeatStatistics']
>[1];

@Injectable()
export class WarehouseTallyOperationsService {
  constructor(
    @Inject(WAREHOUSE_TALLY_OPERATIONS_REPOSITORY)
    private readonly repository: WarehouseTallyOperationsRepository
  ) {}

  async createConsolidation(principal: Principal, input: WarehouseConsolidationCreateInput) {
    const permission: PermissionKey = input.mode === 'MERGE_AND_SHIP'
      ? 'warehouse:tally-pending:shipment-create'
      : 'warehouse:tally-pending:process';
    if (!(await this.repository.hasPermission(principal.role, permission))) {
      await this.repository.recordPermissionDenied(principal, {
        permissions: [permission],
        method: 'SERVER',
        path: 'warehouse granular action'
      }).catch(() => undefined);
      throw new ForbiddenException('没有访问权限');
    }
    return this.repository.createWarehouseConsolidation(principal, input);
  }

  createShipment(principal: Principal, id: string) {
    return this.repository.createShipmentFromWarehouseConsolidation(principal, id);
  }

  repeatStatistics(principal: Principal, query: WarehouseTallyRepeatStatisticsQuery) {
    return this.repository.getWarehouseTallyRepeatStatistics(principal, query);
  }
}

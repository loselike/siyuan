import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_TALLY_QUERY_REPOSITORY,
  type WarehouseTallyQueryRepository
} from './warehouse-tally-query.repository.js';

type WarehouseTallyTaskListQuery = NonNullable<Parameters<WarehouseTallyQueryRepository['getWarehouseTallyTasks']>[1]>;

@Injectable()
export class WarehouseTallyQueryService {
  constructor(
    @Inject(WAREHOUSE_TALLY_QUERY_REPOSITORY)
    private readonly repository: WarehouseTallyQueryRepository
  ) {}

  listConsolidationItems(principal: Principal, id: string) {
    return this.repository.getWarehouseConsolidationItems(principal, id);
  }

  listTasks(principal: Principal, query: WarehouseTallyTaskListQuery = {}) {
    return this.repository.getWarehouseTallyTasks(principal, query);
  }

  listTaskSourcePackages(principal: Principal, id: string) {
    return this.repository.getWarehouseTallyTaskSourcePackages(principal, id);
  }

  listTaskHistoryChain(principal: Principal, packageId: string) {
    return this.repository.getWarehouseTallyTaskHistoryChain(principal, packageId);
  }

  listTaskOutputPackages(principal: Principal, id: string) {
    return this.repository.getWarehouseTallyTaskOutputPackages(principal, id);
  }
}

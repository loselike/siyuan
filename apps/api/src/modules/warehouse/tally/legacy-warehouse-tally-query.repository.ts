import { Inject, Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';
import type {
  WarehouseTallyQueryRepository
} from './warehouse-tally-query.repository.js';

@Injectable()
export class LegacyWarehouseTallyQueryRepository implements WarehouseTallyQueryRepository {
  constructor(@Inject(PrismaRepository) private readonly repository: WarehouseTallyQueryRepository) {}

  getWarehouseConsolidationItems(principal: Principal, id: string) {
    return this.repository.getWarehouseConsolidationItems(principal, id);
  }

  getWarehouseTallyTasks(principal: Principal, query?: Parameters<WarehouseTallyQueryRepository['getWarehouseTallyTasks']>[1]) {
    return this.repository.getWarehouseTallyTasks(principal, query);
  }

  getWarehouseTallyTaskSourcePackages(principal: Principal, id: string) {
    return this.repository.getWarehouseTallyTaskSourcePackages(principal, id);
  }

  getWarehouseTallyTaskHistoryChain(principal: Principal, packageId: string) {
    return this.repository.getWarehouseTallyTaskHistoryChain(principal, packageId);
  }

  getWarehouseTallyTaskOutputPackages(principal: Principal, id: string) {
    return this.repository.getWarehouseTallyTaskOutputPackages(principal, id);
  }
}

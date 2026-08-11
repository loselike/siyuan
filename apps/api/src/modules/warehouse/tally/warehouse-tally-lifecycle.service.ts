import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_TALLY_LIFECYCLE_REPOSITORY,
  type WarehouseTallyLifecycleRepository
} from './warehouse-tally-lifecycle.repository.js';

type WarehouseTallyTaskCancelInput = Parameters<
  WarehouseTallyLifecycleRepository['cancelCompletedWarehouseTallyTask']
>[2];

@Injectable()
export class WarehouseTallyLifecycleService {
  constructor(
    @Inject(WAREHOUSE_TALLY_LIFECYCLE_REPOSITORY)
    private readonly repository: WarehouseTallyLifecycleRepository
  ) {}

  start(principal: Principal, id: string) {
    return this.repository.startWarehouseTallyTask(principal, id);
  }

  cancelCompleted(principal: Principal, id: string, input: WarehouseTallyTaskCancelInput) {
    return this.repository.cancelCompletedWarehouseTallyTask(principal, id, input);
  }
}

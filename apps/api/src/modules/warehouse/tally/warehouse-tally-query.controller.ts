import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { WarehouseTallyTaskListQuery } from '@siyuan/shared';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_TALLY_QUERY_REPOSITORY,
  type WarehouseTallyQueryRepository
} from './warehouse-tally-query.repository.js';

@Controller()
export class WarehouseTallyQueryController {
  constructor(
    @Inject(WAREHOUSE_TALLY_QUERY_REPOSITORY)
    private readonly repository: WarehouseTallyQueryRepository
  ) {}

  @Get('warehouse/consolidations/:id/items')
  @RequirePermission('warehouse:tally-pending:detail-view')
  warehouseConsolidationItems(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getWarehouseConsolidationItems(request.user, id);
  }

  @Get('warehouse/tally-tasks')
  @RequirePermission(['warehouse:tally-pending:view', 'warehouse:tally-completed:view'])
  warehouseTallyTasks(@Req() request: { user: Principal }, @Query() query: WarehouseTallyTaskListQuery) {
    return this.repository.getWarehouseTallyTasks(request.user, query);
  }

  @Get('warehouse/tally-task-history-chain')
  @RequirePermission('warehouse:tally-completed:view')
  warehouseTallyTaskHistoryChain(@Req() request: { user: Principal }, @Query('packageId') packageId: string) {
    return this.repository.getWarehouseTallyTaskHistoryChain(request.user, packageId);
  }

  @Get('warehouse/tally-tasks/:id/output-packages')
  @RequirePermission('warehouse:tally-completed:view')
  warehouseTallyTaskOutputPackages(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getWarehouseTallyTaskOutputPackages(request.user, id);
  }
}

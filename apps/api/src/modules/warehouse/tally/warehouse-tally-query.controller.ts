import { Body, Controller, Get, Inject, Param, Put, Query, Req } from '@nestjs/common';
import type { WarehouseTallySortRulesUpdateInput, WarehouseTallyTaskListQuery } from '@siyuan/shared';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseTallyQueryService } from './warehouse-tally-query.service.js';

@Controller()
export class WarehouseTallyQueryController {
  constructor(
    @Inject(WarehouseTallyQueryService)
    private readonly service: WarehouseTallyQueryService
  ) {}

  @Get('warehouse/consolidations/:id/items')
  @RequirePermission('warehouse:tally-pending:view')
  warehouseConsolidationItems(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.listConsolidationItems(request.user, id);
  }

  @Get('warehouse/tally-sort-rules')
  @RequirePermission('warehouse:tally-pending:sort-rule-manage')
  warehouseTallySortRules(@Req() request: { user: Principal }) {
    return this.service.listSortRules(request.user);
  }

  @Put('warehouse/tally-sort-rules')
  @RequirePermission('warehouse:tally-pending:sort-rule-manage')
  updateWarehouseTallySortRules(@Req() request: { user: Principal }, @Body() body: WarehouseTallySortRulesUpdateInput) {
    return this.service.updateSortRules(request.user, body);
  }

  @Get('warehouse/tally-tasks')
  @RequirePermission(['warehouse:tally-pending:view', 'warehouse:tally-pending:problem-view', 'warehouse:tally-completed:view'])
  warehouseTallyTasks(@Req() request: { user: Principal }, @Query() query: WarehouseTallyTaskListQuery) {
    return this.service.listTasks(request.user, query);
  }

  @Get('warehouse/tally-tasks/:id/source-packages')
  @RequirePermission(['warehouse:tally-pending:detail', 'warehouse:tally-pending:process'])
  warehouseTallyTaskSourcePackages(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.listTaskSourcePackages(request.user, id);
  }

  @Get('warehouse/tally-task-history-chain')
  @RequirePermission('warehouse:tally-completed:view')
  warehouseTallyTaskHistoryChain(@Req() request: { user: Principal }, @Query('packageId') packageId: string) {
    return this.service.listTaskHistoryChain(request.user, packageId);
  }

  @Get('warehouse/tally-tasks/:id/output-packages')
  @RequirePermission('warehouse:tally-completed:view')
  warehouseTallyTaskOutputPackages(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.listTaskOutputPackages(request.user, id);
  }
}

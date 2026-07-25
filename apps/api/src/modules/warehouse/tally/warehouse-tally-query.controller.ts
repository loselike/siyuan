import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { WarehouseTallyTaskListQuery } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';

@Controller()
export class WarehouseTallyQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

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

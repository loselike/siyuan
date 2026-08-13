import { Body, Controller, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { RequireAuth, RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseTallyLifecycleService } from './warehouse-tally-lifecycle.service.js';

type WarehouseTallyTaskCreateInput = Parameters<WarehouseTallyLifecycleService['create']>[1];
type WarehouseTallyTaskUpdateInput = Parameters<WarehouseTallyLifecycleService['update']>[2];
type WarehouseTallyTaskCompleteInput = Parameters<WarehouseTallyLifecycleService['complete']>[2];
type WarehouseTallyTaskCancelInput = Parameters<WarehouseTallyLifecycleService['cancelCompleted']>[2];

@Controller()
export class WarehouseTallyLifecycleController {
  constructor(
    @Inject(WarehouseTallyLifecycleService)
    private readonly lifecycle: WarehouseTallyLifecycleService
  ) {}

  @Post('warehouse/tally-tasks')
  @RequirePermission('warehouse:in-stock:tally')
  createWarehouseTallyTask(
    @Req() request: { user: Principal },
    @Body() body: WarehouseTallyTaskCreateInput
  ) {
    return this.lifecycle.create(request.user, body);
  }

  @Patch('warehouse/tally-tasks/:id')
  @RequirePermission('warehouse:tally-pending:edit')
  updateWarehouseTallyTask(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseTallyTaskUpdateInput
  ) {
    return this.lifecycle.update(request.user, id, body);
  }

  @Post('warehouse/tally-tasks/:id/start')
  @RequirePermission('warehouse:tally-pending:process')
  startWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.lifecycle.start(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/cancel')
  @RequirePermission('warehouse:tally-pending:cancel')
  cancelWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.lifecycle.cancel(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/complete')
  @RequirePermission('warehouse:tally-pending:process')
  completeWarehouseTallyTask(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseTallyTaskCompleteInput
  ) {
    return this.lifecycle.complete(request.user, id, body);
  }

  @Patch('warehouse/tally-tasks/:id/completed-count')
  @RequireAuth()
  updateCompletedWarehouseTallyTaskCount(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.lifecycle.updateCompletedCount(request.user, id, body);
  }

  @Post('warehouse/tally-tasks/:id/reverse-review')
  @RequirePermission('warehouse:tally-completed:reverse')
  reverseReviewWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.lifecycle.reverseReview(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/cancel-completed')
  @RequirePermission('warehouse:tally-completed:reverse')
  cancelCompletedWarehouseTallyTask(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseTallyTaskCancelInput
  ) {
    return this.lifecycle.cancelCompleted(request.user, id, body);
  }
}

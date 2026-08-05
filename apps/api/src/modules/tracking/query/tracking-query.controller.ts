import { Controller, ForbiddenException, Get, Inject, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import {
  TRACKING_QUERY_REPOSITORY,
  type TrackingQueryRepository
} from './tracking-query.repository.js';

@Controller()
export class TrackingQueryController {
  constructor(
    @Inject(TRACKING_QUERY_REPOSITORY)
    private readonly repository: TrackingQueryRepository
  ) {}

  @Get('carrier-tasks')
  @RequirePermission('tracking:carrier-task:view')
  carrierTasks(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看承运商任务');
    }
    return this.repository.getCarrierTasks(request.user);
  }
}

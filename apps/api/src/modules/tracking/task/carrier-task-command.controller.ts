import { Body, Controller, Inject, Param, Post, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { CarrierTaskCommandService } from './carrier-task-command.service.js';

@Controller()
export class CarrierTaskCommandController {
  constructor(
    @Inject(CarrierTaskCommandService)
    private readonly commands: CarrierTaskCommandService
  ) {}

  @Post('carrier-tasks/:id/run')
  @RequirePermission('tracking:carrier-task:sync')
  runCarrierTask(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { fail?: boolean } | undefined
  ) {
    return this.commands.run(request.user, id, body);
  }

  @Post('carrier-tasks/:id/retry')
  @RequirePermission('tracking:carrier-task:sync')
  retryCarrierTask(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { fail?: boolean } | undefined
  ) {
    return this.commands.retry(request.user, id, body);
  }
}

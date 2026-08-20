import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import type { TrackingImportCommandInput } from './tracking-import-command.repository.js';
import { TrackingImportCommandService } from './tracking-import-command.service.js';

@Controller()
export class TrackingImportCommandController {
  constructor(
    @Inject(TrackingImportCommandService)
    private readonly commands: TrackingImportCommandService
  ) {}

  @Post('shipments/tracking-events/import')
  @RequirePermission('tracking:external:import')
  async importTrackingEvents(
    @Req() request: { user: Principal },
    @Body() body: TrackingImportCommandInput
  ) {
    return this.commands.import(request.user, body);
  }
}

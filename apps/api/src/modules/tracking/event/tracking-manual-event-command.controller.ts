import { Body, Controller, Inject, Param, Post, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import type { TrackingManualEventInput } from './tracking-manual-event-command.repository.js';
import { TrackingManualEventCommandService } from './tracking-manual-event-command.service.js';

@Controller()
export class TrackingManualEventCommandController {
  constructor(
    @Inject(TrackingManualEventCommandService)
    private readonly commands: TrackingManualEventCommandService
  ) {}

  @Post('shipments/:id/tracking-events')
  @RequirePermission('tracking:external:single-add')
  async addTrackingEvent(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: TrackingManualEventInput
  ) {
    return this.commands.addShipmentEvent(request.user, id, body);
  }

  @Post('operations/line-shipments/:id/tracking-events')
  @RequirePermission('operations:line-shipment:tracking-add')
  async addOperationTrackingEvent(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: TrackingManualEventInput
  ) {
    return this.commands.addOperationShipmentEvent(request.user, id, body);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  TRACKING_MANUAL_EVENT_COMMAND_REPOSITORY,
  type TrackingManualEventCommandRepository,
  type TrackingManualEventInput
} from './tracking-manual-event-command.repository.js';

@Injectable()
export class TrackingManualEventCommandService {
  constructor(
    @Inject(TRACKING_MANUAL_EVENT_COMMAND_REPOSITORY)
    private readonly repository: TrackingManualEventCommandRepository
  ) {}

  async addShipmentEvent(principal: Principal, shipmentId: string, input: TrackingManualEventInput) {
    return this.repository.addTrackingEvent(principal, shipmentId, input);
  }

  async addOperationShipmentEvent(principal: Principal, shipmentId: string, input: TrackingManualEventInput) {
    return this.repository.addTrackingEvent(principal, shipmentId, input);
  }
}

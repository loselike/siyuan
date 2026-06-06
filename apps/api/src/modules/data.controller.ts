import { Controller, Get, Inject, Req } from '@nestjs/common';
import { summarizeStatusCounts } from '@siyuan/shared';
import { InMemoryRepository } from './in-memory.repository.js';
import { RequirePermission } from './require-permission.decorator.js';
import type { Principal } from './rbac.js';

@Controller()
export class DataController {
  constructor(@Inject(InMemoryRepository) private readonly repository: InMemoryRepository) {}

  @Get('health')
  health() {
    return { ok: true, service: 'siyuan-api' };
  }

  @Get('shipments')
  @RequirePermission('shipments:read')
  shipments(@Req() request: { user: Principal }) {
    return this.repository.getShipments(request.user);
  }

  @Get('shipments/status-counts')
  @RequirePermission('shipments:read')
  shipmentStatusCounts(@Req() request: { user: Principal }) {
    return summarizeStatusCounts(this.repository.getShipments(request.user));
  }

  @Get('master-data')
  @RequirePermission('master-data:read')
  masterData() {
    return {
      customers: this.repository.customers,
      channels: this.repository.channels,
      roles: this.repository.getRoles()
    };
  }

  @Get('finance/receivables')
  @RequirePermission('finance:read')
  receivables() {
    return this.repository.receivables;
  }
}

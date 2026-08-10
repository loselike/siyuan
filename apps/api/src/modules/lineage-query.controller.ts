import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { getLineageEventWiringReport } from './lineage-event-coverage.js';
import { PrismaRepository } from './prisma.repository.js';
import { RequirePermission } from './require-permission.decorator.js';
import type { Principal } from './rbac.js';

/**
 * Read-only lineage queries. Permission metadata and repository-side checks
 * stay unchanged; write-side lineage recording remains with its source flow.
 */
@Controller()
export class LineageQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('system/lineage-event-coverage')
  @RequirePermission('system:audit:lineage-view')
  async eventCoverage() {
    return getLineageEventWiringReport();
  }

  @Get('system/lineage/shipment/:shipmentId')
  @RequirePermission('system:audit:lineage-view')
  async shipmentTrace(@Req() request: { user: Principal }, @Param('shipmentId') shipmentId: string) {
    return (this.repository as any).getShipmentLineageTrace(request.user, shipmentId);
  }

  @Get('system/lineage-source/:nodeType/:id')
  @RequirePermission('system:audit:lineage-view')
  async sourceTrace(@Req() request: { user: Principal }, @Param('nodeType') nodeType: string, @Param('id') id: string) {
    return (this.repository as any).getLineageSourceTrace(request.user, nodeType, id);
  }

  @Get('system/lineage/:resultType/:businessId')
  @RequirePermission('system:audit:lineage-view')
  async trace(@Req() request: { user: Principal }, @Param('resultType') resultType: string, @Param('businessId') businessId: string) {
    return (this.repository as any).getLineageTrace(request.user, resultType, businessId);
  }
}

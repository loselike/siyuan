import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseTallyCorrectionService } from './warehouse-tally-correction.service.js';

type WarehouseTallyHistoricalAggregateCorrectionInput = Parameters<
  WarehouseTallyCorrectionService['correct']
>[2];

@Controller()
export class WarehouseTallyCorrectionController {
  constructor(
    @Inject(WarehouseTallyCorrectionService)
    private readonly correction: WarehouseTallyCorrectionService
  ) {}

  @Get('warehouse/tally-tasks/:id/historical-aggregate-correction')
  @RequirePermission('warehouse:tally-history:correct')
  warehouseTallyHistoricalAggregateCorrectionPreview(
    @Req() request: { user: Principal },
    @Param('id') id: string
  ) {
    return this.correction.preview(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/historical-aggregate-correction')
  @RequirePermission('warehouse:tally-history:correct')
  correctWarehouseTallyHistoricalAggregate(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseTallyHistoricalAggregateCorrectionInput
  ) {
    return this.correction.correct(request.user, id, body);
  }
}

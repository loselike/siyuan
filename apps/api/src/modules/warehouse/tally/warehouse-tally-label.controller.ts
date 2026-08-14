import { Body, Controller, Inject, Param, Post, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { WarehouseTallyLabelService } from './warehouse-tally-label.service.js';

type WarehouseTallyLabelScanInput = Parameters<WarehouseTallyLabelService['apply']>[1];

@Controller()
export class WarehouseTallyLabelController {
  constructor(@Inject(WarehouseTallyLabelService) private readonly labels: WarehouseTallyLabelService) {}

  @Post('warehouse/tally-tasks/:id/label')
  @RequirePermission('warehouse:tally-completed:print')
  generate(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.labels.generate(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/label/print')
  @RequirePermission('warehouse:tally-completed:print')
  print(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.labels.print(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/label/download')
  @RequirePermission('warehouse:tally-completed:download')
  download(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.labels.download(request.user, id);
  }

  @Post('warehouse/tally-tasks/label-scan')
  @RequirePermission('warehouse:tally-completed:scan')
  apply(@Req() request: { user: Principal }, @Body() body: WarehouseTallyLabelScanInput) {
    return this.labels.apply(request.user, body);
  }
}

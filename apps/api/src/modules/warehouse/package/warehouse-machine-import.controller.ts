import { Body, Controller, Inject, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import {
  WarehouseMachineImportService,
  type WarehouseMachineImportFile
} from './warehouse-machine-import.service.js';

@Controller()
export class WarehouseMachineImportController {
  constructor(
    @Inject(WarehouseMachineImportService)
    private readonly warehouseMachineImport: WarehouseMachineImportService
  ) {}

  @Post('warehouse/packages/machine-import')
  @RequirePermission(['warehouse:today-receipt:import', 'warehouse:in-stock:import'])
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  execute(
    @Req() request: { user: Principal },
    @UploadedFile() file: WarehouseMachineImportFile | undefined,
    @Body('commit') commit?: string
  ) {
    return this.warehouseMachineImport.execute(request.user, file, commit);
  }
}

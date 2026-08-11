import { extname } from 'node:path';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RequireAuth, RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import type { ShipmentLabelUploadFile } from './shipment-label-file.storage.js';
import { ShipmentLabelLifecycleService } from './shipment-label-lifecycle.service.js';

@Controller()
export class ShipmentLabelLifecycleController {
  constructor(
    @Inject(ShipmentLabelLifecycleService)
    private readonly labels: ShipmentLabelLifecycleService
  ) {}

  @Get('shipments/:id/labels')
  @RequireAuth()
  shipmentLabels(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.labels.labels(request.user, id);
  }

  @Post('shipments/:id/labels')
  @RequirePermission('warehouse:dispatch-pending:label-generate')
  createShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.labels.create(request.user, id);
  }

  @Post('shipments/:id/labels/upload')
  @RequireAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadShipmentLabel(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @UploadedFile() file: ShipmentLabelUploadFile | undefined,
    @Body() body: { transferNo?: string } | undefined
  ) {
    return this.labels.upload(request.user, id, file, body?.transferNo);
  }

  @Get('shipments/:id/labels/:labelId/file')
  @RequireAuth()
  async downloadShipmentLabel(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('labelId') labelId: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.labels.download(request.user, id, labelId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `attachment; filename="shipment-label${extname(file.fileName)}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.buffer);
  }

  @Post('shipments/:id/labels/:labelId/void')
  @RequirePermission('warehouse:dispatch-pending:label-void')
  voidShipmentLabel(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('labelId') labelId: string
  ) {
    return this.labels.void(request.user, id, labelId);
  }
}

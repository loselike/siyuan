import { extname } from 'node:path';
import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RequireAllPermissions, RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import type { ShipmentBusinessInvoiceUploadFile } from './shipment-business-invoice-file.storage.js';
import { ShipmentBusinessInvoiceService } from './shipment-business-invoice.service.js';

@Controller()
export class ShipmentBusinessInvoiceController {
  constructor(
    @Inject(ShipmentBusinessInvoiceService)
    private readonly invoices: ShipmentBusinessInvoiceService
  ) {}

  @Post('shipments/:id/invoice/upload')
  @RequirePermission('business:order-entry:invoice-upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  uploadShipmentBusinessInvoice(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @UploadedFile() file: ShipmentBusinessInvoiceUploadFile | undefined
  ) {
    return this.invoices.upload(request.user, id, file);
  }

  @Get('shipments/:id/invoice-template/download')
  @RequireAllPermissions('business:shipment:list', 'data-scope:sales-own')
  async downloadShipmentInvoiceTemplate(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Query('templateId') templateId: string | undefined,
    @Query('templateSlot') templateSlot: string | undefined,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.invoices.downloadTemplate(request.user, id, templateId, templateSlot);
    const mimeType = file.extension === '.xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const downloadName = `发票模板${file.extension}`;
    response.setHeader('Content-Type', mimeType);
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `attachment; filename="invoice-template${file.extension}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.buffer);
  }

  @Get('shipments/:id/invoice/download')
  @RequirePermission('business:order-entry:invoice-upload')
  async downloadShipmentBusinessInvoice(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.invoices.download(request.user, id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `attachment; filename="business-invoice${extname(file.fileName)}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.buffer);
  }
}

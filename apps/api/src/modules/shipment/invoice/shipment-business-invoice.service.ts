import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  SHIPMENT_BUSINESS_INVOICE_REPOSITORY,
  type ShipmentBusinessInvoiceRepository
} from './shipment-business-invoice.repository.js';
import {
  ShipmentBusinessInvoiceFileStorage,
  type ShipmentBusinessInvoiceUploadFile
} from './shipment-business-invoice-file.storage.js';

@Injectable()
export class ShipmentBusinessInvoiceService {
  constructor(
    @Inject(SHIPMENT_BUSINESS_INVOICE_REPOSITORY)
    private readonly repository: ShipmentBusinessInvoiceRepository,
    @Inject(ShipmentBusinessInvoiceFileStorage)
    private readonly storage: ShipmentBusinessInvoiceFileStorage
  ) {}

  async upload(principal: Principal, shipmentId: string, file: ShipmentBusinessInvoiceUploadFile | undefined) {
    this.assertStaff(principal, '客户不能上传业务发票');
    const stored = await this.storage.store(file);
    return this.repository.uploadShipmentBusinessInvoice(principal, shipmentId, stored);
  }

  downloadTemplate(
    principal: Principal,
    shipmentId: string,
    templateId: string | undefined,
    templateSlot: string | undefined
  ) {
    this.assertStaff(principal, '客户不能下载代理发票模板');
    let resolvedTemplateId = templateId?.trim() || undefined;
    if (!resolvedTemplateId && templateSlot !== undefined) {
      const slot = Number(templateSlot);
      if (slot !== 1 && slot !== 2 && slot !== 3) {
        throw new BadRequestException('发票模板序号必须为 1、2 或 3');
      }
      resolvedTemplateId = `legacy-${slot}`;
    }
    return this.repository.downloadShipmentInvoiceTemplate(principal, shipmentId, resolvedTemplateId);
  }

  download(principal: Principal, shipmentId: string) {
    this.assertStaff(principal, '客户不能下载业务发票');
    return this.repository.downloadShipmentBusinessInvoice(principal, shipmentId);
  }

  private assertStaff(principal: Principal, message: string) {
    if (principal.role === 'CUSTOMER') throw new ForbiddenException(message);
  }
}

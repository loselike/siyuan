import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  WaterReceiptCreateInput,
  WaterReceiptExportRequest,
  WaterReceiptListQuery,
  WaterReceiptMarkArrivedInput,
  WaterReceiptUpdateInput
} from '@siyuan/shared';
import type { Principal } from '../../rbac.js';
import { FinanceCatalogService } from '../catalog/finance-catalog.service.js';
import {
  WATER_RECEIPT_LIFECYCLE_REPOSITORY,
  type WaterReceiptLifecycleRepository
} from './water-receipt-lifecycle.repository.js';

@Injectable()
export class WaterReceiptLifecycleService {
  constructor(
    @Inject(WATER_RECEIPT_LIFECYCLE_REPOSITORY)
    private readonly repository: WaterReceiptLifecycleRepository,
    @Inject(FinanceCatalogService)
    private readonly financeCatalogService: FinanceCatalogService
  ) {}

  list(principal: Principal, query: WaterReceiptListQuery) {
    return this.repository.getWaterReceipts(principal, query);
  }

  listSiteOptions() {
    return this.repository.getEnabledSitesForReference();
  }

  async create(principal: Principal, input: WaterReceiptCreateInput) {
    await this.ensureSettlementMethod(input);
    return this.repository.createWaterReceipt(principal, input);
  }

  async update(principal: Principal, id: string, input: WaterReceiptUpdateInput) {
    if (input.receiptMethod !== undefined) await this.ensureSettlementMethod(input);
    return this.repository.updateWaterReceipt(principal, id, input);
  }

  markArrived(principal: Principal, id: string, input: WaterReceiptMarkArrivedInput) {
    return this.repository.markWaterReceiptArrived(principal, id, input);
  }

  archive(principal: Principal, id: string) {
    return this.repository.archiveWaterReceipt(principal, id);
  }

  void(principal: Principal, id: string, input: { reason?: string }) {
    return this.repository.voidWaterReceipt(principal, id, input);
  }

  deleteVoucher(principal: Principal, id: string) {
    return this.repository.deleteWaterReceiptVoucher(principal, id);
  }

  export(principal: Principal, input: WaterReceiptExportRequest) {
    return this.repository.exportWaterReceipts(principal, input);
  }

  private async ensureSettlementMethod(input: { receiptMethod?: string }) {
    const receiptMethod = input.receiptMethod?.trim();
    if (!receiptMethod) throw new BadRequestException('结算方式不能为空');
    const { items } = await this.financeCatalogService.list({ category: 'SETTLEMENT_METHOD', enabledOnly: true });
    if (!items.some((item) => item.name === receiptMethod)) {
      throw new BadRequestException('结算方式不存在或已停用');
    }
  }
}

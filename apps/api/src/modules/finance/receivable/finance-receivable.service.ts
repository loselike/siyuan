import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  ReceivableAuditBatchInput,
  ReceivableAuditCreateInput,
  ReceivableAuditExportRequest,
  ReceivableAuditListQuery,
  ReceivableAuditUpdateInput,
  ReceivableMatchRequestBatchInput,
  ReceivableMatchRequestUpdateInput,
  ReceivableMatchReviewInput,
  ReceivableReceiptMatchInput,
  WaterReceiptCreateInput,
  WaterReceiptExportRequest,
  WaterReceiptListQuery,
  WaterReceiptMarkArrivedInput,
  WaterReceiptMatchOrdersInput,
  WaterReceiptUnmatchInput,
  WaterReceiptUpdateInput
} from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { FinanceCatalogService } from '../catalog/finance-catalog.service.js';
import type { Principal } from '../../rbac.js';

@Injectable()
export class FinanceReceivableService {
  constructor(
    @Inject(PrismaRepository) private readonly repository: PrismaRepository,
    @Inject(FinanceCatalogService) private readonly financeCatalogService: FinanceCatalogService
  ) {}

  private async ensureWaterReceiptSettlementMethod(input: { receiptMethod?: string }) {
    const receiptMethod = input.receiptMethod?.trim();
    if (!receiptMethod) throw new BadRequestException('结算方式不能为空');
    const { items } = await this.financeCatalogService.list({ category: 'SETTLEMENT_METHOD', enabledOnly: true });
    if (!items.some((item) => item.name === receiptMethod)) {
      throw new BadRequestException('结算方式不存在或已停用');
    }
  }

  receivables(principal: Principal) {
    return this.repository.getReceivables(principal);
  }

  receivableAudits(principal: Principal, query: ReceivableAuditListQuery) {
    return this.repository.getReceivableAudits(principal, query);
  }

  createReceivableAudit(principal: Principal, input: ReceivableAuditCreateInput) {
    return this.repository.createReceivableAudit(principal, input);
  }

  updateReceivableAudit(principal: Principal, id: string, input: ReceivableAuditUpdateInput) {
    return this.repository.updateReceivableAudit(principal, id, input);
  }

  auditReceivableAudit(principal: Principal, id: string) {
    return this.repository.auditReceivableAudit(principal, id);
  }

  approveReceivableMatchRequest(principal: Principal, id: string) {
    return this.repository.approveReceivableMatchRequest(principal, id);
  }

  updateReceivableMatchRequest(principal: Principal, id: string, input: ReceivableMatchRequestUpdateInput) {
    return this.repository.updateReceivableMatchRequest(principal, id, input);
  }

  deleteReceivableMatchRequest(principal: Principal, id: string) {
    return this.repository.deleteReceivableMatchRequest(principal, id);
  }

  reverseReceivableMatchRequest(principal: Principal, id: string, input: ReceivableMatchReviewInput) {
    return this.repository.reverseReceivableMatchRequest(principal, id, input);
  }

  batchApproveReceivableMatchRequests(principal: Principal, input: ReceivableMatchRequestBatchInput) {
    return this.repository.batchApproveReceivableMatchRequests(principal, input);
  }

  batchReverseReceivableMatchRequests(principal: Principal, input: ReceivableMatchRequestBatchInput) {
    return this.repository.batchReverseReceivableMatchRequests(principal, input);
  }

  batchDeleteReceivableMatchRequests(principal: Principal, input: ReceivableMatchRequestBatchInput) {
    return this.repository.batchDeleteReceivableMatchRequests(principal, input);
  }

  reverseAuditReceivableAudit(principal: Principal, id: string) {
    return this.repository.reverseAuditReceivableAudit(principal, id);
  }

  deleteReceivableAudit(principal: Principal, id: string) {
    return this.repository.deleteReceivableAudit(principal, id);
  }

  batchAuditReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput) {
    return this.repository.batchAuditReceivableAudits(principal, input);
  }

  batchReverseAuditReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput) {
    return this.repository.batchReverseAuditReceivableAudits(principal, input);
  }

  batchVoidReceivableAudits(principal: Principal, input: ReceivableAuditBatchInput) {
    return this.repository.batchVoidReceivableAudits(principal, input);
  }

  matchReceivableReceipt(principal: Principal, id: string, input: ReceivableReceiptMatchInput) {
    return this.repository.matchReceivableReceipt(principal, id, input);
  }

  receivableWaterReceiptCandidates(principal: Principal, id: string) {
    return this.repository.getReceivableWaterReceiptCandidates(principal, id);
  }

  exportReceivableAudits(principal: Principal, input: ReceivableAuditExportRequest) {
    return this.repository.exportReceivableAudits(principal, input);
  }

  waterReceipts(principal: Principal, query: WaterReceiptListQuery) {
    return this.repository.getWaterReceipts(principal, query);
  }

  waterReceiptSiteOptions() {
    return this.repository.getEnabledSitesForReference();
  }

  async createWaterReceipt(principal: Principal, input: WaterReceiptCreateInput) {
    await this.ensureWaterReceiptSettlementMethod(input);
    return this.repository.createWaterReceipt(principal, input);
  }

  async updateWaterReceipt(principal: Principal, id: string, input: WaterReceiptUpdateInput) {
    if (input.receiptMethod !== undefined) await this.ensureWaterReceiptSettlementMethod(input);
    return this.repository.updateWaterReceipt(principal, id, input);
  }

  markWaterReceiptArrived(principal: Principal, id: string, input: WaterReceiptMarkArrivedInput) {
    return this.repository.markWaterReceiptArrived(principal, id, input);
  }

  waterReceiptMatchableReceivables(principal: Principal, id: string) {
    return this.repository.getWaterReceiptMatchableReceivables(principal, id);
  }

  matchWaterReceiptOrders(principal: Principal, id: string, input: WaterReceiptMatchOrdersInput) {
    return this.repository.matchWaterReceiptOrders(principal, id, input);
  }

  unmatchWaterReceipt(principal: Principal, id: string, input: WaterReceiptUnmatchInput) {
    return this.repository.unmatchWaterReceipt(principal, id, input);
  }

  archiveWaterReceipt(principal: Principal, id: string) {
    return this.repository.archiveWaterReceipt(principal, id);
  }

  voidWaterReceipt(principal: Principal, id: string, input: { reason?: string }) {
    return this.repository.voidWaterReceipt(principal, id, input);
  }

  deleteWaterReceiptVoucher(principal: Principal, id: string) {
    return this.repository.deleteWaterReceiptVoucher(principal, id);
  }

  exportWaterReceipts(principal: Principal, input: WaterReceiptExportRequest) {
    return this.repository.exportWaterReceipts(principal, input);
  }
}

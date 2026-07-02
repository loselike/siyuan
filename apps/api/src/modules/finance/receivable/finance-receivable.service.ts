import { Inject, Injectable } from '@nestjs/common';
import type {
  ReceivableAuditBatchInput,
  ReceivableAuditCreateInput,
  ReceivableAuditExportRequest,
  ReceivableAuditListQuery,
  ReceivableAuditUpdateInput,
  ReceivableReceiptMatchInput,
  WaterReceiptCreateInput,
  WaterReceiptExportRequest,
  WaterReceiptListQuery,
  WaterReceiptMarkArrivedInput,
  WaterReceiptMatchOrdersInput,
  WaterReceiptUnmatchInput,
  WaterReceiptUpdateInput,
  WaterReceiptVoucherInput
} from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';

@Injectable()
export class FinanceReceivableService {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

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

  exportReceivableAudits(principal: Principal, input: ReceivableAuditExportRequest) {
    return this.repository.exportReceivableAudits(principal, input);
  }

  waterReceipts(principal: Principal, query: WaterReceiptListQuery) {
    return this.repository.getWaterReceipts(principal, query);
  }

  createWaterReceipt(principal: Principal, input: WaterReceiptCreateInput) {
    return this.repository.createWaterReceipt(principal, input);
  }

  updateWaterReceipt(principal: Principal, id: string, input: WaterReceiptUpdateInput) {
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

  uploadWaterReceiptVoucher(principal: Principal, id: string, input: WaterReceiptVoucherInput) {
    return this.repository.uploadWaterReceiptVoucher(principal, id, input);
  }

  exportWaterReceipts(principal: Principal, input: WaterReceiptExportRequest) {
    return this.repository.exportWaterReceipts(principal, input);
  }
}

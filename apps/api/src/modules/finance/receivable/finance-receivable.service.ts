import { Inject, Injectable } from '@nestjs/common';
import type {
  ReceivableAuditBatchInput,
  ReceivableAuditCreateInput,
  ReceivableAuditExportRequest,
  ReceivableAuditListQuery,
  ReceivableAuditUpdateInput,
  ReceivableMatchRequestBatchInput,
  ReceivableMatchRequestUpdateInput,
  ReceivableMatchReviewInput
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

  exportReceivableAudits(principal: Principal, input: ReceivableAuditExportRequest) {
    return this.repository.exportReceivableAudits(principal, input);
  }
}

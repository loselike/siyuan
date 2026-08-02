import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  KuayueImportCommitInput,
  KuayueImportLineClaimInput,
  KuayueImportLineQuery,
  MiscFeeActionInput,
  MiscFeeBusinessAssignmentInput,
  MiscFeeHangBatchApproveInput,
  MiscFeeHangQuery,
  MiscFeeHangRequestInput,
  MiscFeeInput,
  MiscFeeMatchInput,
  MiscFeeQuery,
  MiscFeeUpdateInput,
  MiscFeeVoidInput,
  MarketProfitLedgerQuery,
  FinanceProfitLedgerQuery,
  WarehouseProfitLedgerQuery,
  ProfitSettlementInput,
  ProfitSettlementQuery
} from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';

@Injectable()
export class MiscFeeService {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  list(principal: Principal, query: MiscFeeQuery) {
    return this.repository.getMiscFees(principal, query);
  }

  previewKuayueImport(
    principal: Principal,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    if (!file) throw new BadRequestException('请选择跨越账单文件');
    return this.repository.previewKuayueImport(principal, file);
  }

  commitKuayueImport(principal: Principal, input: KuayueImportCommitInput) {
    return this.repository.commitKuayueImport(principal, input);
  }

  kuayueImportLines(principal: Principal, query: KuayueImportLineQuery) {
    return this.repository.getKuayueImportLines(principal, query);
  }

  claimKuayueImportLine(principal: Principal, lineId: string, input: KuayueImportLineClaimInput) {
    return this.repository.claimKuayueImportLine(principal, lineId, input);
  }

  downloadKuayueImportFile(principal: Principal, batchId: string) {
    return this.repository.downloadKuayueImportFile(principal, batchId);
  }

  downloadAttachment(principal: Principal, attachmentId: string) {
    return this.repository.downloadMiscFeeAttachment(principal, attachmentId);
  }

  detail(principal: Principal, id: string) {
    return this.repository.getMiscFee(principal, id);
  }

  create(principal: Principal, input: MiscFeeInput) {
    return this.repository.createMiscFee(principal, input);
  }

  update(principal: Principal, id: string, input: MiscFeeUpdateInput) {
    return this.repository.updateMiscFee(principal, id, input);
  }

  match(principal: Principal, id: string, input: MiscFeeMatchInput) {
    return this.repository.matchMiscFee(principal, id, input);
  }

  assignBusinessCost(principal: Principal, id: string, input: MiscFeeBusinessAssignmentInput) {
    return this.repository.assignMiscFeeBusinessCost(principal, id, input);
  }

  confirm(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.confirmMiscFee(principal, id, input);
  }

  audit(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.auditMiscFee(principal, id, input);
  }

  directPayAndArchiveKuayue(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.directPayAndArchiveKuayueMiscFee(principal, id, input);
  }

  reverseAudit(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.reverseAuditMiscFee(principal, id, input);
  }

  void(principal: Principal, id: string, input: MiscFeeVoidInput) {
    return this.repository.voidMiscFee(principal, id, input);
  }

  createHangRequest(principal: Principal, id: string, input: MiscFeeHangRequestInput) {
    return this.repository.createMiscFeeHangRequest(principal, id, { ...input, attachment: undefined });
  }

  createHangRequestWithFile(
    principal: Principal,
    id: string,
    input: MiscFeeHangRequestInput,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    purchase: boolean
  ) {
    if (!Number.isInteger(input.version) || input.version < 1) throw new BadRequestException('数据版本不正确，请刷新后重试');
    return this.repository.createMiscFeeHangRequestWithFile(principal, id, input, file, purchase);
  }

  applyPurchasePayment(principal: Principal, id: string, input: MiscFeeHangRequestInput) {
    return this.repository.applyPurchasePayment(principal, id, { ...input, attachment: undefined });
  }

  hangRequests(principal: Principal, query: MiscFeeHangQuery) {
    return this.repository.getMiscFeeHangRequests(principal, query);
  }

  tallyDue(principal: Principal, customerCode: string) {
    return this.repository.getTallyMiscFeeDue(principal, customerCode);
  }

  deliveryShipmentOptions(principal: Principal, customerCode: string) {
    return this.repository.getMiscFeeDeliveryShipmentOptions(principal, customerCode);
  }

  marketProfitLedger(principal: Principal, query: MarketProfitLedgerQuery) {
    return this.repository.getMarketProfitLedger(principal, query);
  }

  warehouseProfitLedger(principal: Principal, query: WarehouseProfitLedgerQuery) {
    return this.repository.getWarehouseProfitLedger(principal, query);
  }

  financeProfitLedger(principal: Principal, query: FinanceProfitLedgerQuery) {
    return this.repository.getFinanceProfitLedger(principal, query);
  }

  exportFinanceProfitLedger(principal: Principal, query: FinanceProfitLedgerQuery) {
    return this.repository.exportFinanceProfitLedger(principal, query);
  }

  approveHang(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.approveMiscFeeHangRequest(principal, id, input);
  }

  batchApproveHang(principal: Principal, input: MiscFeeHangBatchApproveInput) {
    return this.repository.batchApproveMiscFeeHangRequests(principal, input);
  }

  rejectHang(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.rejectMiscFeeHangRequest(principal, id, input);
  }

  withdrawHang(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.withdrawMiscFeeHangRequest(principal, id, input);
  }

  settlements(principal: Principal, query: ProfitSettlementQuery) {
    return this.repository.getProfitSettlements(principal, query);
  }

  settlement(principal: Principal, id: string) {
    return this.repository.getProfitSettlement(principal, id);
  }

  createSettlement(principal: Principal, input: ProfitSettlementInput) {
    return this.repository.createProfitSettlement(principal, input);
  }

  transitionSettlement(principal: Principal, id: string, action: 'submit' | 'audit' | 'reverse-audit' | 'archive', input: MiscFeeActionInput) {
    return this.repository.transitionProfitSettlement(principal, id, action, input);
  }

  recomputeSettlement(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.recomputeProfitSettlement(principal, id, input);
  }

  releaseSettlement(principal: Principal, id: string, input: MiscFeeActionInput) {
    return this.repository.releaseProfitSettlement(principal, id, input);
  }
}

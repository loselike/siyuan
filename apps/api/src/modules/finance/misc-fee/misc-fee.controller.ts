import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
import { RequireAuth } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { MiscFeeService } from './misc-fee.service.js';

@Controller()
export class MiscFeeController {
  constructor(private readonly service: MiscFeeService) {}

  @Get('misc-fees')
  @RequireAuth()
  list(@Req() request: { user: Principal }, @Query() query: MiscFeeQuery) {
    return this.service.list(request.user, query);
  }

  @Post('misc-fees/kuayue/import-preview')
  @RequireAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  previewKuayueImport(
    @Req() request: { user: Principal },
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    return this.service.previewKuayueImport(request.user, file);
  }

  @Post('misc-fees/kuayue/import-commit')
  @RequireAuth()
  commitKuayueImport(@Req() request: { user: Principal }, @Body() body: KuayueImportCommitInput) {
    return this.service.commitKuayueImport(request.user, body);
  }

  @Get('misc-fees/kuayue/import-lines')
  @RequireAuth()
  kuayueImportLines(@Req() request: { user: Principal }, @Query() query: KuayueImportLineQuery) {
    return this.service.kuayueImportLines(request.user, query);
  }

  @Get('misc-fees/tally/due')
  @RequireAuth()
  tallyDue(@Req() request: { user: Principal }, @Query('customerCode') customerCode: string) {
    return this.service.tallyDue(request.user, customerCode);
  }

  @Get('misc-fees/delivery/shipment-options')
  @RequireAuth()
  deliveryShipmentOptions(@Req() request: { user: Principal }, @Query('customerCode') customerCode: string) {
    return this.service.deliveryShipmentOptions(request.user, customerCode);
  }

  @Get('misc-fees/market-profit/ledger')
  @RequireAuth()
  marketProfitLedger(@Req() request: { user: Principal }, @Query() query: MarketProfitLedgerQuery) {
    return this.service.marketProfitLedger(request.user, query);
  }

  @Get('misc-fees/warehouse-profit/ledger')
  @RequireAuth()
  warehouseProfitLedger(@Req() request: { user: Principal }, @Query() query: WarehouseProfitLedgerQuery) {
    return this.service.warehouseProfitLedger(request.user, query);
  }

  @Get('misc-fees/finance-profit/ledger')
  @RequireAuth()
  financeProfitLedger(@Req() request: { user: Principal }, @Query() query: FinanceProfitLedgerQuery) {
    return this.service.financeProfitLedger(request.user, query);
  }

  @Post('misc-fees/finance-profit/export')
  @RequireAuth()
  exportFinanceProfitLedger(@Req() request: { user: Principal }, @Body() body: FinanceProfitLedgerQuery) {
    return this.service.exportFinanceProfitLedger(request.user, body);
  }

  @Post('misc-fees/kuayue/import-lines/:lineId/claim')
  @RequireAuth()
  claimKuayueImportLine(
    @Req() request: { user: Principal },
    @Param('lineId') lineId: string,
    @Body() body: KuayueImportLineClaimInput
  ) {
    return this.service.claimKuayueImportLine(request.user, lineId, body);
  }

  @Get('misc-fee-import-batches/:batchId/file')
  @RequireAuth()
  async downloadKuayueImportFile(
    @Req() request: { user: Principal },
    @Param('batchId') batchId: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.service.downloadKuayueImportFile(request.user, batchId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    return new StreamableFile(file.buffer);
  }

  @Get('misc-fee-attachments/:attachmentId/file')
  @RequireAuth()
  async downloadAttachment(
    @Req() request: { user: Principal },
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.service.downloadAttachment(request.user, attachmentId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    return new StreamableFile(file.buffer);
  }

  @Get('misc-fees/:id')
  @RequireAuth()
  detail(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.detail(request.user, id);
  }

  @Post('misc-fees')
  @RequireAuth()
  create(@Req() request: { user: Principal }, @Body() body: MiscFeeInput) {
    return this.service.create(request.user, body);
  }

  @Patch('misc-fees/:id')
  @RequireAuth()
  update(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeUpdateInput) {
    return this.service.update(request.user, id, body);
  }

  @Post('misc-fees/:id/match')
  @RequireAuth()
  match(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeMatchInput) {
    return this.service.match(request.user, id, body);
  }

  @Post('misc-fees/:id/business-assignment')
  @RequireAuth()
  assignBusinessCost(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeBusinessAssignmentInput) {
    return this.service.assignBusinessCost(request.user, id, body);
  }

  @Post('misc-fees/:id/confirm')
  @RequireAuth()
  confirm(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.confirm(request.user, id, body);
  }

  @Post('misc-fees/:id/audit')
  @RequireAuth()
  audit(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.audit(request.user, id, body);
  }

  @Post('misc-fees/:id/direct-paid-archive')
  @RequireAuth()
  directPayAndArchiveKuayue(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: MiscFeeActionInput
  ) {
    return this.service.directPayAndArchiveKuayue(request.user, id, body);
  }

  @Post('misc-fees/:id/reverse-audit')
  @RequireAuth()
  reverseAudit(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.reverseAudit(request.user, id, body);
  }

  @Post('misc-fees/:id/void')
  @RequireAuth()
  void(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeVoidInput) {
    return this.service.void(request.user, id, body);
  }

  @Post('misc-fees/:id/hang-requests')
  @RequireAuth()
  createHangRequest(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeHangRequestInput) {
    return this.service.createHangRequest(request.user, id, body);
  }

  @Post('misc-fees/:id/hang-requests-with-file')
  @RequireAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  createHangRequestWithFile(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { version?: string; remark?: string; idempotencyKey?: string; purchase?: string },
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    const version = Number(body.version);
    return this.service.createHangRequestWithFile(
      request.user,
      id,
      {
        version,
        remark: body.remark,
        idempotencyKey: body.idempotencyKey
      },
      file,
      body.purchase === 'true'
    );
  }

  @Post('misc-fees/:id/purchase-payment-request')
  @RequireAuth()
  applyPurchasePayment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeHangRequestInput) {
    return this.service.applyPurchasePayment(request.user, id, body);
  }

  @Get('misc-fee-hang-requests')
  @RequireAuth()
  hangRequests(@Req() request: { user: Principal }, @Query() query: MiscFeeHangQuery) {
    return this.service.hangRequests(request.user, query);
  }

  @Post('misc-fee-hang-requests/:id/approve')
  @RequireAuth()
  approveHang(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.approveHang(request.user, id, body);
  }

  @Post('misc-fee-hang-requests/batch-approve')
  @RequireAuth()
  batchApproveHang(@Req() request: { user: Principal }, @Body() body: MiscFeeHangBatchApproveInput) {
    return this.service.batchApproveHang(request.user, body);
  }

  @Post('misc-fee-hang-requests/:id/reject')
  @RequireAuth()
  rejectHang(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.rejectHang(request.user, id, body);
  }

  @Post('misc-fee-hang-requests/:id/withdraw')
  @RequireAuth()
  withdrawHang(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.withdrawHang(request.user, id, body);
  }

  @Get('misc-fee-profit-settlements')
  @RequireAuth()
  settlements(@Req() request: { user: Principal }, @Query() query: ProfitSettlementQuery) {
    return this.service.settlements(request.user, query);
  }

  @Get('misc-fee-profit-settlements/:id')
  @RequireAuth()
  settlement(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.settlement(request.user, id);
  }

  @Post('misc-fee-profit-settlements')
  @RequireAuth()
  createSettlement(@Req() request: { user: Principal }, @Body() body: ProfitSettlementInput) {
    return this.service.createSettlement(request.user, body);
  }

  @Post('misc-fee-profit-settlements/:id/submit')
  @RequireAuth()
  submitSettlement(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.transitionSettlement(request.user, id, 'submit', body);
  }

  @Post('misc-fee-profit-settlements/:id/audit')
  @RequireAuth()
  auditSettlement(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.transitionSettlement(request.user, id, 'audit', body);
  }

  @Post('misc-fee-profit-settlements/:id/reverse-audit')
  @RequireAuth()
  reverseSettlement(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.transitionSettlement(request.user, id, 'reverse-audit', body);
  }

  @Post('misc-fee-profit-settlements/:id/archive')
  @RequireAuth()
  archiveSettlement(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.transitionSettlement(request.user, id, 'archive', body);
  }

  @Post('misc-fee-profit-settlements/:id/recompute')
  @RequireAuth()
  recomputeSettlement(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.recomputeSettlement(request.user, id, body);
  }

  @Post('misc-fee-profit-settlements/:id/release')
  @RequireAuth()
  releaseSettlement(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: MiscFeeActionInput) {
    return this.service.releaseSettlement(request.user, id, body);
  }
}

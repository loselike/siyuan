import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
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
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { RuntimeInputPipe } from '../../runtime-input.pipe.js';
import { parseWaterReceiptMatchOrdersInput } from '../water-receipt/water-receipt-allocation.input.js';
import { WaterReceiptAllocationService } from '../water-receipt/water-receipt-allocation.service.js';
import { FinanceReceivableService } from './finance-receivable.service.js';

@Controller()
export class FinanceReceivableController {
  constructor(
    @Inject(FinanceReceivableService) private readonly service: FinanceReceivableService,
    @Inject(WaterReceiptAllocationService) private readonly waterReceiptAllocationService: WaterReceiptAllocationService
  ) {}

  @Get('finance/receivables')
  @RequirePermission(['finance:receivable:read', 'finance:customer-account:read'])
  async receivables(@Req() request: { user: Principal }) {
    return this.service.receivables(request.user);
  }

  @Get('finance/receivable-audits')
  @RequirePermission('finance:receivable:read')
  async receivableAudits(@Req() request: { user: Principal }, @Query() query: ReceivableAuditListQuery) {
    return this.service.receivableAudits(request.user, query);
  }

  @Post('finance/receivable-audits')
  @RequirePermission('finance:receivable:create')
  async createReceivableAudit(@Req() request: { user: Principal }, @Body() body: ReceivableAuditCreateInput) {
    return this.service.createReceivableAudit(request.user, body);
  }

  @Put('finance/receivable-audits/:id')
  @RequirePermission('finance:receivable:update')
  async updateReceivableAudit(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ReceivableAuditUpdateInput) {
    return this.service.updateReceivableAudit(request.user, id, body);
  }

  @Post('finance/receivable-audits/:id/audit')
  @RequirePermission('finance:receivable:audit')
  async auditReceivableAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.auditReceivableAudit(request.user, id);
  }

  @Post('finance/receivable-match-requests/:id/approve')
  @RequirePermission('finance:water-match:audit')
  async approveReceivableMatchRequest(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.approveReceivableMatchRequest(request.user, id);
  }

  @Put('finance/receivable-match-requests/:id')
  @RequirePermission('finance:water-match:adjust')
  async updateReceivableMatchRequest(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: ReceivableMatchRequestUpdateInput
  ) {
    return this.service.updateReceivableMatchRequest(request.user, id, body);
  }

  @Delete('finance/receivable-match-requests/:id')
  @RequirePermission('finance:water-match:cancel')
  async deleteReceivableMatchRequest(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.deleteReceivableMatchRequest(request.user, id);
  }

  @Post('finance/receivable-match-requests/:id/reverse-audit')
  @RequirePermission('finance:water-match:reverse')
  async reverseReceivableMatchRequest(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: ReceivableMatchReviewInput
  ) {
    return this.service.reverseReceivableMatchRequest(request.user, id, body);
  }

  @Post('finance/receivable-match-requests/batch-approve')
  @RequirePermission('finance:water-match:audit')
  async batchApproveReceivableMatchRequests(
    @Req() request: { user: Principal },
    @Body() body: ReceivableMatchRequestBatchInput
  ) {
    return this.service.batchApproveReceivableMatchRequests(request.user, body);
  }

  @Post('finance/receivable-match-requests/batch-reverse-audit')
  @RequirePermission('finance:water-match:reverse')
  async batchReverseReceivableMatchRequests(
    @Req() request: { user: Principal },
    @Body() body: ReceivableMatchRequestBatchInput
  ) {
    return this.service.batchReverseReceivableMatchRequests(request.user, body);
  }

  @Post('finance/receivable-match-requests/batch-delete')
  @RequirePermission('finance:water-match:cancel')
  async batchDeleteReceivableMatchRequests(
    @Req() request: { user: Principal },
    @Body() body: ReceivableMatchRequestBatchInput
  ) {
    return this.service.batchDeleteReceivableMatchRequests(request.user, body);
  }

  @Post('finance/receivable-audits/:id/reverse-audit')
  @RequirePermission('finance:receivable:reverse')
  async reverseAuditReceivableAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.reverseAuditReceivableAudit(request.user, id);
  }

  @Delete('finance/receivable-audits/:id')
  @RequirePermission('finance:receivable:void')
  async deleteReceivableAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.deleteReceivableAudit(request.user, id);
  }

  @Post('finance/receivable-audits/batch-audit')
  @RequirePermission('finance:receivable:batch-audit')
  async batchAuditReceivableAudits(@Req() request: { user: Principal }, @Body() body: ReceivableAuditBatchInput) {
    return this.service.batchAuditReceivableAudits(request.user, body);
  }

  @Post('finance/receivable-audits/batch-reverse-audit')
  @RequirePermission('finance:receivable:batch-reverse')
  async batchReverseAuditReceivableAudits(@Req() request: { user: Principal }, @Body() body: ReceivableAuditBatchInput) {
    return this.service.batchReverseAuditReceivableAudits(request.user, body);
  }

  @Post('finance/receivable-audits/batch-void')
  @RequirePermission('finance:receivable:batch-void')
  async batchVoidReceivableAudits(@Req() request: { user: Principal }, @Body() body: ReceivableAuditBatchInput) {
    return this.service.batchVoidReceivableAudits(request.user, body);
  }

  @Post('finance/receivable-audits/:id/match-receipt')
  @RequirePermission('finance:water-match:create')
  async matchReceivableReceipt(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ReceivableReceiptMatchInput) {
    return this.waterReceiptAllocationService.matchReceivableReceipt(request.user, id, body);
  }

  @Get('finance/receivable-audits/:id/water-receipt-candidates')
  @RequirePermission(['finance:receivable:match-water', 'finance:water-match:receivable-view', 'finance:water-match:create'])
  async receivableWaterReceiptCandidates(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.waterReceiptAllocationService.listReceivableWaterReceiptCandidates(request.user, id);
  }

  @Post('finance/receivable-audits/export')
  @RequirePermission('finance:receivable:export')
  async exportReceivableAudits(@Req() request: { user: Principal }, @Body() body: ReceivableAuditExportRequest) {
    return this.service.exportReceivableAudits(request.user, body);
  }

  @Get('finance/water-receipts')
  @RequirePermission(['finance:water-receipt:read', 'finance:water-match:read'])
  async waterReceipts(@Req() request: { user: Principal }, @Query() query: WaterReceiptListQuery) {
    return this.service.waterReceipts(request.user, query);
  }

  @Get('finance/water-receipts/site-options')
  @RequirePermission(['finance:water-receipt:create', 'finance:water-receipt:update'])
  async waterReceiptSiteOptions() {
    return this.service.waterReceiptSiteOptions();
  }

  @Post('finance/water-receipts')
  @RequirePermission('finance:water-receipt:create')
  async createWaterReceipt(@Req() request: { user: Principal }, @Body() body: WaterReceiptCreateInput) {
    return this.service.createWaterReceipt(request.user, body);
  }

  @Put('finance/water-receipts/:id')
  @RequirePermission(['finance:water-receipt:update', 'finance:water-receipt:arrived-update'])
  async updateWaterReceipt(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WaterReceiptUpdateInput) {
    return this.service.updateWaterReceipt(request.user, id, body);
  }

  @Post('finance/water-receipts/:id/mark-arrived')
  @RequirePermission('finance:water-receipt:arrive')
  async markWaterReceiptArrived(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WaterReceiptMarkArrivedInput) {
    return this.service.markWaterReceiptArrived(request.user, id, body);
  }

  @Get('finance/water-receipts/:id/matchable-receivables')
  @RequirePermission('finance:water-match:receivable-view')
  async waterReceiptMatchableReceivables(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.waterReceiptAllocationService.listWaterReceiptMatchableReceivables(request.user, id);
  }

  @Post('finance/water-receipts/:id/match-orders')
  @RequirePermission('finance:water-receipt:match')
  async matchWaterReceiptOrders(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body(new RuntimeInputPipe(parseWaterReceiptMatchOrdersInput)) body: WaterReceiptMatchOrdersInput
  ) {
    return this.waterReceiptAllocationService.matchWaterReceiptOrders(request.user, id, body);
  }

  @Post('finance/water-receipts/:id/unmatch')
  @RequirePermission('finance:water-match:cancel')
  async unmatchWaterReceipt(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WaterReceiptUnmatchInput) {
    return this.waterReceiptAllocationService.unmatchWaterReceipt(request.user, id, body);
  }

  @Post('finance/water-receipts/:id/archive')
  @RequirePermission('finance:water-receipt:archive')
  async archiveWaterReceipt(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.archiveWaterReceipt(request.user, id);
  }

  @Post('finance/water-receipts/:id/void')
  @RequirePermission('finance:water-receipt:void')
  async voidWaterReceipt(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.voidWaterReceipt(request.user, id, body);
  }

  @Delete('finance/water-receipts/:id/voucher')
  @RequirePermission('finance:water-receipt:voucher-delete')
  async deleteWaterReceiptVoucher(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.deleteWaterReceiptVoucher(request.user, id);
  }

  @Post('finance/water-receipts/export')
  @RequirePermission('finance:water-receipt:export')
  async exportWaterReceipts(@Req() request: { user: Principal }, @Body() body: WaterReceiptExportRequest) {
    return this.service.exportWaterReceipts(request.user, body);
  }
}

import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
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
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { FinanceReceivableService } from './finance-receivable.service.js';

@Controller()
export class FinanceReceivableController {
  constructor(@Inject(FinanceReceivableService) private readonly service: FinanceReceivableService) {}

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
  @RequirePermission('finance:receivable:match-water')
  async matchReceivableReceipt(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ReceivableReceiptMatchInput) {
    return this.service.matchReceivableReceipt(request.user, id, body);
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

  @Post('finance/water-receipts')
  @RequirePermission('finance:water-receipt:create')
  async createWaterReceipt(@Req() request: { user: Principal }, @Body() body: WaterReceiptCreateInput) {
    return this.service.createWaterReceipt(request.user, body);
  }

  @Put('finance/water-receipts/:id')
  @RequirePermission('finance:water-receipt:update')
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
    return this.service.waterReceiptMatchableReceivables(request.user, id);
  }

  @Post('finance/water-receipts/:id/match-orders')
  @RequirePermission('finance:water-match:create')
  async matchWaterReceiptOrders(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WaterReceiptMatchOrdersInput) {
    return this.service.matchWaterReceiptOrders(request.user, id, body);
  }

  @Post('finance/water-receipts/:id/unmatch')
  @RequirePermission('finance:water-match:cancel')
  async unmatchWaterReceipt(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WaterReceiptUnmatchInput) {
    return this.service.unmatchWaterReceipt(request.user, id, body);
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

  @Post('finance/water-receipts/:id/voucher')
  @RequirePermission('finance:water-receipt:voucher-upload')
  async uploadWaterReceiptVoucher(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WaterReceiptVoucherInput) {
    return this.service.uploadWaterReceiptVoucher(request.user, id, body);
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

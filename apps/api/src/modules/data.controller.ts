import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Inject, NotFoundException, Param, Patch, Post, Put, Query, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { resolveUploadDirectory, resolveUploadRoot } from '../configure-app.js';
import { getLineageEventWiringReport } from './lineage-event-coverage.js';
import type {
  AgentCreateInput,
  AgentDeleteResponse,
  AgentChannelCreateInput,
  AgentChannelUpdateInput,
  AgentMarkupCreateInput,
  AgentMarkupListQuery,
  MarkupRouteListQuery,
  MarkupRoutePreviewBatchInput,
  MarkupRoutePreviewInput,
  MarkupRouteTierBatchReplaceInput,
  MarkupRouteTierReplaceInput,
  AgentMarkupUpdateInput,
  AgentUpdateInput,
  AuditLogQuery,
  BusinessCostAuditBatchInput,
  BusinessCostAuditCreateInput,
  BusinessCostAuditExportRequest,
  BusinessCostAuditListQuery,
  BusinessCostAuditUpdateInput,
  CarrierCreateInput,
  ChannelCreateInput,
  ChannelDeleteResponse,
  ChannelCategoryCreateInput,
  ChannelCategoryUpdateInput,
  ChannelUpdateInput,
  CustomerStatementCreateInput,
  CustomerContactCreateInput,
  CustomerContactUpdateInput,
  CustomerCreateInput,
  CustomerSourceInput,
  CustomerSourceListQuery,
  CustomerUpdateInput,
  CustomerUserCreateInput,
  EnabledUpdateInput,
  ExchangeRateCreateInput,
  ExchangeRateUpdateInput,
  FuelRateCreateInput,
  OrderEntryCreateInput,
  OrderEntryDraftUpdateInput,
  PaymentCreateInput,
  PaymentApplicationCancelInput,
  PaymentApplicationCreateInput,
  PaymentApplicationExportRequest,
  PaymentApplicationUpdateInput,
  PaidPaymentExportRequest,
  PaidPaymentListQuery,
  PaidPaymentReverseInput,
  PaidPaymentUpdateInput,
  PaymentConfirmPaidInput,
  PaymentWaterReceiptInput,
  VoucherImageUploadContext,
  PayableAuditBatchInput,
  PayableAuditListQuery,
  PayableAuditCreateInput,
  PayableAuditExportRequest,
  PayableAuditShipmentMatchInput,
  PayableAuditUpdateInput,
  AgentBankAccountInput,
  PayeeBankAccountInput,
  PendingPaymentListQuery,
  PaymentVoucherArchiveInput,
  PaymentVoucherDifferenceInput,
  PaymentVoucherInput,
  PaymentVoucherListQuery,
  PriceBookImportInput,
  PriceBookBatchDeleteInput,
  PriceBookImportTargetModule,
  PriceBookRowsQuery,
  PriceBookRemarkUpdateInput,
  DubaiPriceDisplayActivateInput,
  DubaiSeaMarkupUpdateInput,
  LegacyPricingImportInput,
  LegacyPricingModule,
  LegacyPricingQuoteResponse,
  LegacyPricingRecommendation,
  LegacyPricingQuoteRequest,
  SouthAfricaLookupRequest,
  SouthAfricaLookupResponse,
  SouthAfricaRateRuleInput,
  SouthAfricaRateRuleSummary,
  PriceLookupRequest,
  PriceLookupRecommendation,
  PriceLookupResponse,
  PricingQuoteRequest,
  PricingRuleCreateInput,
  PricingRuleQuoteRequest,
  ReceivableAdjustmentInput,
  SurchargeCreateInput,
  ShipmentCreateInput,
  ShipmentFinanceItemCreateInput,
  ShipmentFinanceItemUpdateInput,
  ShipmentImportRequest,
  ShipmentOperationalUpdateInput,
  CustomerServiceTransferBatchInput,
  ShipmentPaymentUpdateInput,
  ShipmentRerouteInput,
  ShipmentRouteInput,
  ShipmentRestoreInput,
  ShipmentReviewBasicUpdateInput,
  ShipmentReviewDeleteInput,
  ShipmentReviewRejectInput,
  MasterDataSnapshot,
  NavigationReadStateInput
} from '@siyuan/shared';
import { PrismaRepository } from './prisma.repository.js';
import { FinanceCatalogService } from './finance/catalog/finance-catalog.service.js';
import { buildMasterDataSnapshotSelection, hasSalesOwnDataScope } from './master-data/master-data-snapshot.selection.js';
import { sanitizePricingChannelRequirement } from './pricing-excel.js';
import { RequireAllPermissions, RequireAuth, RequirePermission } from './require-permission.decorator.js';
import { isAdministratorRole, type PermissionKey, type Principal, type RoleKey } from './rbac.js';

const PRICE_BOOK_FILE_IMPORT_MAX_BYTES = 30 * 1024 * 1024;
const SOUTH_AFRICA_RATE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const pricingLookupPermissionByModule: Record<LegacyPricingModule, PermissionKey> = {
  amazon: 'pricing:lookup:amazon',
  inquiry: 'pricing:lookup:europe-oversize',
  europeExpress: 'pricing:lookup:europe-express',
  southAfrica: 'pricing:lookup:south-africa',
  usaAirSea: 'pricing:lookup:usa-air-sea',
  canadaAirSea: 'pricing:lookup:canada-air-sea',
  dubaiAirSea: 'pricing:lookup:dubai-air-sea'
};

@Controller()
export class DataController {
  constructor(
    @Inject(PrismaRepository) private readonly repository: PrismaRepository,
    @Inject(FinanceCatalogService) private readonly financeCatalogService: FinanceCatalogService
  ) {}
  private readonly imageMimeExtensions: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  private readonly excelMimeExtensions: Record<string, string> = {
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/octet-stream': ''
  };

  private sanitizePricingRequirementFields<T extends Pick<PriceLookupRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>>(
    value: T,
    agentNames: Array<string | undefined> = []
  ): T {
    const sanitize = (remark?: string) => sanitizePricingChannelRequirement(remark, agentNames);
    const customRemark = 'customRemark' in value
      ? (value as T & { customRemark?: string }).customRemark?.trim() || undefined
      : undefined;
    return {
      ...value,
      remark: sanitize(value.remark),
      productSurchargeRemark: sanitize(value.productSurchargeRemark),
      specialRemark: sanitize(value.specialRemark),
      ...('customRemark' in value ? { customRemark } : {})
    } as T;
  }

  private sanitizePriceLookupRecommendation(recommendation: PriceLookupRecommendation, agentNames: string[]): PriceLookupRecommendation {
    const names = [...agentNames, recommendation.agentName];
    return {
      ...this.sanitizePricingRequirementFields(recommendation, names),
      price: this.sanitizePricingRequirementFields(recommendation.price, names)
    };
  }

  private sanitizeLegacyPricingRecommendation(recommendation: LegacyPricingRecommendation, agentNames: string[]): LegacyPricingRecommendation {
    const { raw: _raw, ...safe } = recommendation;
    return this.sanitizePricingRequirementFields(safe, [...agentNames, recommendation.agentName]);
  }

  private sanitizePriceLookupResponse(response: PriceLookupResponse, agentNames: string[]): PriceLookupResponse {
    const bestRecommendation = response.recommendations.find((item) => item.price.id === response.price.id);
    return {
      ...response,
      price: this.sanitizePricingRequirementFields(response.price, [...agentNames, bestRecommendation?.agentName]),
      recommendations: response.recommendations.map((item) => this.sanitizePriceLookupRecommendation(item, agentNames)),
      cheapestRecommendations: response.cheapestRecommendations.map((item) => this.sanitizePriceLookupRecommendation(item, agentNames)),
      fastestRecommendations: response.fastestRecommendations.map((item) => this.sanitizePriceLookupRecommendation(item, agentNames))
    };
  }

  private sanitizeLegacyPricingQuoteResponse(response: LegacyPricingQuoteResponse, agentNames: string[]): LegacyPricingQuoteResponse {
    const sanitize = (item: LegacyPricingRecommendation) => this.sanitizeLegacyPricingRecommendation(item, agentNames);
    return {
      ...response,
      recommendations: response.recommendations.map(sanitize),
      cheapestRecommendations: response.cheapestRecommendations.map(sanitize),
      fastestRecommendations: response.fastestRecommendations.map(sanitize),
      ...(response.selected ? { selected: sanitize(response.selected) } : {})
    };
  }

  private sanitizeSouthAfricaLookupResponse(response: SouthAfricaLookupResponse): SouthAfricaLookupResponse {
    const sanitize = (item: NonNullable<SouthAfricaLookupResponse['result']>) => {
      const remark = sanitizePricingChannelRequirement(item.remark);
      const quoteText = sanitizePricingChannelRequirement(item.quoteText) ?? '';
      return { ...item, remark, quoteText };
    };
    const recommendations = response.recommendations.map(sanitize);
    return {
      ...response,
      recommendations,
      ...(response.result ? { result: recommendations.find((item) => item.id === response.result?.id) ?? sanitize(response.result) } : {})
    };
  }

  private async sanitizeSouthAfricaRateRuleForPrincipal(principal: Principal, rule: SouthAfricaRateRuleSummary): Promise<SouthAfricaRateRuleSummary> {
    if (await this.hasAnyPermission(principal.role, ['pricing:markup:southAfrica:view'])) return rule;
    const { costPerCbm: _costPerCbm, markupPerCbm: _markupPerCbm, ...businessRule } = rule;
    return businessRule;
  }

  private async hasAnyPermission(role: RoleKey, permissions: PermissionKey[]) {
    const checks = await Promise.all(permissions.map((permission) => this.repository.hasPermission(role, permission)));
    return checks.some(Boolean);
  }

  private async ensurePermission(principal: Principal, permission: PermissionKey) {
    if (await this.repository.hasPermission(principal.role, permission)) return;
    await (this.repository as any).recordPermissionDenied?.(principal, {
      permissions: [permission],
      method: 'SERVER',
      path: 'warehouse granular action'
    }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }

  private async ensureAnyPermission(principal: Principal, permissions: PermissionKey[]) {
    if (await this.hasAnyPermission(principal.role, permissions)) return;
    await (this.repository as any).recordPermissionDenied?.(principal, { permissions, method: 'SERVER', path: 'customer-service granular action' }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }

  private async ensureOrderEntryFeeNamesEnabled(input: OrderEntryCreateInput) {
    const { items } = await this.financeCatalogService.list({ category: 'FEE_NAME', enabledOnly: true });
    const enabledNames = new Set(items.map((item) => item.name.trim()).filter(Boolean));
    const rows = [...(input.receivables ?? []), ...(input.businessCosts ?? []), ...(input.payables ?? [])];
    const invalidNames = new Set<string>();
    for (const row of rows) {
      const name = row.name?.trim() ?? '';
      const amount = Number(row.amount ?? 0);
      const chargeWeightKg = Number(row.chargeWeightKg ?? 0);
      const unitPrice = Number(row.unitPrice ?? 0);
      const effective = amount > 0 || (chargeWeightKg > 0 && unitPrice > 0);
      if (!effective) continue;
      if (!name) {
        throw new BadRequestException('有效费用行必须选择费用名称');
      }
      if (!enabledNames.has(name)) invalidNames.add(name);
    }
    if (invalidNames.size > 0) {
      throw new BadRequestException(`费用名称「${Array.from(invalidNames).join('、')}」不在启用的费用名称资料库中，请先到基础资料库维护`);
    }
  }

  private async ensureOrderEntryFinanceWritePermissions(principal: Principal, input: OrderEntryCreateInput, method: 'POST' | 'PUT', path: string) {
    const hasBusinessCost = (input.businessCosts ?? []).some((row) => (
      Boolean(row.name?.trim()) || Number(row.amount ?? 0) > 0 || Number(row.unitPrice ?? 0) > 0
    ));
    if (hasBusinessCost && !isAdministratorRole(principal.role)
      && !await this.repository.hasPermission(principal.role, 'business:order-entry:business-cost')) {
      await this.repository.recordPermissionDenied(principal, { permissions: ['business:order-entry:business-cost'], method, path });
      throw new ForbiddenException('没有业务成本权限');
    }
    const hasPayable = (input.payables ?? []).some((row) => (
      Boolean(row.name?.trim()) || Number(row.amount ?? 0) > 0 || Number(row.unitPrice ?? 0) > 0
    ));
    if (hasPayable && !isAdministratorRole(principal.role)
      && !await this.repository.hasPermission(principal.role, 'business:order-entry:payable-fee')) {
      await this.repository.recordPermissionDenied(principal, { permissions: ['business:order-entry:payable-fee'], method, path });
      throw new ForbiddenException('没有应付费用权限');
    }
  }
  private scopeMasterDataCustomers(principal: Principal, snapshot: MasterDataSnapshot): MasterDataSnapshot {
    if (!hasSalesOwnDataScope(principal)) return snapshot;
    const scope = new Set([principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value)));
    const customers = snapshot.customers.filter((customer) => customer.salesperson && scope.has(customer.salesperson));
    const customerIds = new Set(customers.map((customer) => customer.id));
    return {
      ...snapshot,
      customers,
      contacts: snapshot.contacts.filter((contact) => customerIds.has(contact.customerId)),
      customerUsers: snapshot.customerUsers.filter((user) => customerIds.has(user.customerId))
    };
  }

  @Post('navigation/read-state')
  @RequirePermission('business:shipment:list')
  async markNavigationRead(@Req() request: { user: Principal }, @Body() input: NavigationReadStateInput) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不使用员工端导航角标');
    return this.repository.markNavigationRead(request.user, input);
  }

  @Get('shipments/review-pending')
  @RequirePermission('business:review:view')
  async reviewPendingShipments(@Req() request: { user: Principal }) {
    return this.repository.getReviewPendingShipments(request.user);
  }

  @Get('shipments/review-deleted')
  @RequirePermission('business:review:view')
  async reviewDeletedShipments(@Req() request: { user: Principal }) {
    return this.repository.getReviewDeletedShipments(request.user);
  }

  @Get('shipments/order-entry/drafts')
  @RequirePermission('business:order-entry:draft-view')
  async orderEntryDrafts(@Req() request: { user: Principal }) {
    ensureInternalOrderEntryScope(request.user);
    return this.repository.getOrderEntryDrafts(request.user);
  }

  @Post('shipments/order-entry')
  @RequirePermission(['business:order-entry:edit', 'business:order-entry:create'])
  async createOrderEntry(@Req() request: { user: Principal }, @Body() body: OrderEntryCreateInput) {
    ensureInternalOrderEntryScope(request.user);
    if (body.submitForReview && !await this.repository.hasPermission(request.user.role, 'business:order-entry:submit-review')) {
      await this.repository.recordPermissionDenied(request.user, { permissions: ['business:order-entry:submit-review'], method: 'POST', path: '/api/shipments/order-entry' });
      throw new ForbiddenException('没有提交审核权限');
    }
    await this.ensureOrderEntryFinanceWritePermissions(request.user, body, 'POST', '/api/shipments/order-entry');
    await this.repository.ensureOrderEntryInputAccess(request.user, body);
    await this.ensureOrderEntryFeeNamesEnabled(body);
    return this.repository.createOrderEntry(request.user, body);
  }

  @Put('shipments/:id/order-entry-draft')
  @RequirePermission(['business:order-entry:edit', 'business:order-entry:draft-edit', 'business:review:edit'])
  async updateOrderEntryDraft(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: OrderEntryDraftUpdateInput) {
    ensureInternalOrderEntryScope(request.user);
    if (body.submitForReview && !await this.repository.hasPermission(request.user.role, 'business:order-entry:submit-review')) {
      await this.repository.recordPermissionDenied(request.user, { permissions: ['business:order-entry:submit-review'], method: 'PUT', path: `/api/shipments/${id}/order-entry-draft` });
      throw new ForbiddenException('没有提交审核权限');
    }
    await this.ensureOrderEntryFinanceWritePermissions(request.user, body, 'PUT', `/api/shipments/${id}/order-entry-draft`);
    await this.repository.ensureOrderEntryInputAccess(request.user, body, id);
    await this.ensureOrderEntryFeeNamesEnabled(body);
    return this.repository.updateOrderEntryDraft(request.user, id, body);
  }

  @Delete('shipments/:id/order-entry-draft')
  @RequirePermission('business:order-entry:draft-delete')
  async deleteOrderEntryDraft(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewDeleteInput) {
    ensureInternalOrderEntryScope(request.user);
    return this.repository.deleteOrderEntryDraft(request.user, id, body);
  }

  @Get('shipments/:id/review-detail')
  @RequirePermission('business:review:view')
  async shipmentReviewDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getShipmentReviewDetail(request.user, id);
  }

  @Get('shipments/:id/package-detail')
  @RequirePermission([
    'business:shipment:detail',
    'operations:line-shipment:detail',
    'warehouse:outbounded:view'
  ])
  async shipmentPackageDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看内部单件货物明细');
    }
    return this.repository.getShipmentPackageDetail(request.user, id);
  }

  @Put('shipments/:id/review-basic')
  @RequirePermission('business:review:edit')
  async updateShipmentReviewBasic(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewBasicUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('当前角色不能修改待审核运单资料');
    }
    return this.repository.updateShipmentReviewBasic(request.user, id, body);
  }

  @Post('shipments/:id/review/approve')
  @RequirePermission('business:review:edit')
  async approveShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body?: { businessReview?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能审核运单');
    }
    return this.repository.approveShipmentReview(request.user, id, { businessReview: body?.businessReview === true });
  }

  @Post('shipments/:id/review/reject')
  @RequirePermission('business:review:edit')
  async rejectShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewRejectInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能驳回运单');
    }
    return this.repository.rejectShipmentReview(request.user, id, body);
  }

  @Post('shipments/:id/review/reverse')
  @RequirePermission('business:review:edit')
  async reverseShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { reason?: string } = {}) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不能反审核运单');
    return this.repository.reverseShipmentReview(request.user, id, body);
  }

  @Delete('shipments/:id/review')
  @RequirePermission('business:review:edit')
  async deleteShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewDeleteInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    return this.repository.deleteShipmentReview(request.user, id, body);
  }

  @Post('shipments/:id/restore')
  @RequirePermission('business:review:edit')
  async restoreShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentRestoreInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能恢复运单');
    }
    return this.repository.restoreShipment(request.user, id, body);
  }

  @Delete('shipments/:id/review/permanent')
  @RequirePermission('business:review:edit')
  async permanentlyDeleteShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.permanentlyDeleteShipmentReview(request.user, id);
  }

  @Post('shipments')
  @RequirePermission('business:order-entry:create')
  async createShipment(@Req() request: { user: Principal }, @Body() body: ShipmentCreateInput) {
    if (request.user.role !== 'CUSTOMER') ensureInternalOrderEntryScope(request.user);
    return this.repository.createShipment(request.user, body);
  }

  @Post('shipments/import')
  @RequirePermission(['operations:line-shipment:import', 'operations:import-quality:upload'])
  async importShipments(@Req() request: { user: Principal }, @Body() body: ShipmentImportRequest) {
    return this.repository.importShipments(request.user, body);
  }

  @Post('shipments/:id/receive')
  @RequirePermission('warehouse:today-receipt:edit')
  async receiveShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.receiveShipment(request.user, id);
  }

  @Post('shipments/:id/route')
  @RequireAuth()
  async routeShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentRouteInput) {
    if (body.approve === false) {
      await this.ensurePermission(request.user, 'market:pending-routing:assign');
      await this.ensurePermission(request.user, 'market:pending-routing:save-draft');
    } else {
      await this.ensurePermission(request.user, 'market:pending-routing:confirm');
      await this.ensurePermission(request.user, 'market:pending-routing:audit');
    }
    return this.repository.routeShipment(request.user, id, body);
  }

  @Post('shipments/:id/reroute')
  @RequirePermission('market:routed:reroute')
  async rerouteShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentRerouteInput) {
    return this.repository.rerouteShipment(request.user, id, body);
  }

  @Delete('shipments/:id/pending-routing')
  @RequirePermission('market:pending-routing:delete')
  async deletePendingRoutingShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewDeleteInput) {
    return this.repository.deletePendingRoutingShipment(request.user, id, body);
  }

  @Post('master-data/agent-invoice-template/upload')
  @RequirePermission('master-data:agents:invoice-template-manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadAgentInvoiceTemplate(
    @Req() request: { user: Principal },
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能上传代理发票模板');
    }
    if (!file) throw new BadRequestException('请上传代理发票模板');
    const normalizedFile = { ...file, originalname: normalizeUploadedFileName(file.originalname) };
    this.assertExcelFile(normalizedFile);
    const uploadRoot = resolveUploadRoot();
    const uploadDir = join(uploadRoot, 'invoice-templates');
    await mkdir(uploadDir, { recursive: true });
    const extension = extname(normalizedFile.originalname).toLowerCase();
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    await writeFile(join(uploadDir, fileName), normalizedFile.buffer);
    return {
      fileName: normalizedFile.originalname,
      url: `/api/uploads/${basename(uploadDir)}/${fileName}`
    };
  }

  @Patch('shipments/:id/operational')
  @RequireAuth()
  async updateShipmentOperational(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentOperationalUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能人工修改运单');
    }
    const baseActionPermissions: PermissionKey[] = body.status === 'DEPARTED'
      ? ['customer-service:waiting-departure:confirm-departure']
      : body.status === 'ARRIVED_PORT'
        ? ['customer-service:departed:confirm-arrived-port']
        : body.status === 'DELIVERING'
          ? ['customer-service:arrived-port:confirm-delivering']
          : body.status === 'SIGNED'
            ? ['customer-service:delivering:confirm-signed', 'customer-service:signed:confirm']
            : body.transferNo !== undefined || body.subOrderNo !== undefined
              ? ['customer-service:waiting-departure:update-transfer-no', 'customer-service:transfer:write']
              : body.etdAt !== undefined || body.etaAt !== undefined
                ? ['customer-service:waiting-departure:update-etd-eta', 'customer-service:departed:update-eta']
                : body.vesselVoyage !== undefined
                  ? ['customer-service:waiting-departure:update-info', 'customer-service:departed:update-info', 'customer-service:arrived-port:update-info', 'customer-service:delivering:update-info']
                : body.trackingWebsite !== undefined
                  ? ['customer-service:waiting-departure:update-tracking-website', 'customer-service:departed:update-tracking-website', 'customer-service:arrived-port:update-tracking-website']
                  : ['customer-service:waiting-departure:update-info', 'customer-service:departed:update-info', 'customer-service:arrived-port:update-info', 'customer-service:delivering:update-info'];
    const currentStatus = await this.repository.getShipmentStatusForPermission(request.user, id);
    const isRoutedSameStatus = currentStatus === 'WAITING_DISPATCH'
      && (body.status === undefined || body.status === 'WAITING_DISPATCH');
    if (currentStatus === 'WAITING_SORT'
      && (body.status === 'WAITING_DISPATCH' || body.channelId !== undefined)) {
      throw new BadRequestException('待排货的状态和渠道请通过市场排货入口修改');
    }
    if (isRoutedSameStatus) {
      await this.ensurePermission(request.user, 'market:routed:update');
    } else {
      await this.ensureAnyPermission(request.user, baseActionPermissions);
    }
    return this.repository.updateShipmentOperational(request.user, id, body);
  }

  @Patch('operations/line-shipments/:id/operational')
  @RequirePermission('operations:line-shipment:status-update')
  async updateOperationShipmentOperational(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentOperationalUpdateInput) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不能人工修改运单');
    await this.ensurePermission(request.user, 'operations:line-shipment:process');
    if (body.status === 'WAITING_DISPATCH' || body.channelId !== undefined) {
      throw new BadRequestException('排货状态和渠道请通过市场排货入口修改');
    }
    return this.repository.updateShipmentOperational(request.user, id, body, { enforceOperationsLineShipmentStageEdit: true });
  }

  @Get('customer-service/shipments')
  @RequireAuth()
  async customerServiceShipments(@Req() request: { user: Principal }) {
    await this.ensureAnyPermission(request.user, [
      'customer-service:pending-routing:view',
      'customer-service:data-confirm:view',
      'customer-service:transfer:view',
      'customer-service:waiting-departure:view',
      'customer-service:departed:view',
      'customer-service:arrived-port:view',
      'customer-service:delivering:view',
      'customer-service:signed:view'
    ]);
    const rows = await this.repository.customerServiceShipments(request.user);
    return rows;
  }

  @Post('customer-service/transfer-shipments/fill')
  @RequireAuth()
  async fillCustomerServiceTransferShipments(@Req() request: { user: Principal }, @Body() body: CustomerServiceTransferBatchInput) {
    await this.ensurePermission(request.user, 'customer-service:transfer:write');
    if (body.rows.length > 1) await this.ensurePermission(request.user, 'customer-service:transfer:batch-write');
    if (body.rows.some((row) => Boolean(row.subOrderNo?.trim()))) await this.ensurePermission(request.user, 'customer-service:transfer:sub-order-write');
    if (body.rows.some((row) => Boolean(row.pushToSales))) await this.ensurePermission(request.user, 'customer-service:transfer:push-sales');
    return this.repository.fillCustomerServiceTransferShipments(request.user, body);
  }

  @Post('shipments/:id/payment')
  @RequirePermission('business:shipment:payment-record')
  async registerShipmentPayment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentPaymentUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能登记收款');
    }
    return this.repository.registerShipmentPayment(request.user, id, body);
  }

  @Delete('shipments/:id')
  @RequirePermission('business:shipment:delete')
  async deleteShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    return this.repository.deleteShipment(request.user, id);
  }

  @Post('shipments/:id/fees/generate')
  @RequirePermission('finance:receivable:create')
  async generateShipmentFees(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { baseRatePerKg: number; payableRatePerKg: number; fuelRate: number; surcharges?: Array<{ name: string; amount: number }> }
  ) {
    return this.repository.generateShipmentFees(request.user, id, body);
  }

  @Get('shipments/:id/finance-detail')
  @RequirePermission([
    'customer-service:data-confirm:business-update',
    'business:shipment:finance-detail-view',
    'business:order-entry:view',
    'business:order-entry:business-cost',
    'business:order-entry:payable-fee',
    'market:pending-routing:detail',
    'market:pending-routing:business-cost-view',
    'market:pending-routing:payable-cost-view',
    'business:shipment:payable-view',
    'business:shipment:profit-view',
    'business:order-fee:profit-view',
    'finance:receivable:detail',
    'finance:business-cost:read',
    'finance:business-cost:view-profit',
    'finance:order-fee:payable:view',
    'finance:order-fee:profit:receivable-payable',
    'finance:order-fee:profit:receivable-business',
    'finance:order-fee:profit:business-payable',
    'finance:payable:view-sensitive',
    'finance:payable:view-profit'
  ])
  async getShipmentFinanceDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    const customerServicePendingView = await this.repository.hasPermission(request.user.role, 'customer-service:pending-routing:view');
    if (customerServicePendingView) {
      const shipment = (await this.repository.getShipments(request.user)).find((item) => item.id === id);
      if (shipment?.status === 'WAITING_SORT') {
        await this.ensurePermission(request.user, 'customer-service:pending-routing:fee-detail-view');
      }
    }
    return this.repository.getShipmentFinanceDetail(request.user, id);
  }

  @Post('shipments/:id/receivable-adjustments')
  @RequirePermission('finance:receivable:update')
  async addReceivableAdjustment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ReceivableAdjustmentInput) {
    return this.repository.addReceivableAdjustment(request.user, id, body);
  }

  @Post('shipments/:id/finance-items')
  @RequirePermission(['business:order-entry:edit', 'business:order-entry:business-cost', 'business:order-entry:payable-fee', 'business:order-fee:create', 'market:pending-routing:update'])
  async createShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentFinanceItemCreateInput) {
    return this.repository.createShipmentFinanceItem(request.user, id, body);
  }

  @Put('shipments/:id/finance-items/:feeId')
  @RequirePermission(['business:order-entry:edit', 'business:order-entry:business-cost', 'business:order-entry:payable-fee', 'business:order-fee:update', 'market:pending-routing:update'])
  async updateShipmentFinanceItem(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('feeId') feeId: string,
    @Body() body: ShipmentFinanceItemUpdateInput
  ) {
    return this.repository.updateShipmentFinanceItem(request.user, id, feeId, body);
  }

  @Delete('shipments/:id/finance-items/:feeId')
  @RequirePermission(['business:order-entry:edit', 'business:order-entry:business-cost', 'business:order-entry:payable-fee', 'business:order-fee:delete', 'market:pending-routing:update'])
  async deleteShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Param('feeId') feeId: string) {
    return this.repository.deleteShipmentFinanceItem(request.user, id, feeId);
  }

  @Post('shipments/:id/review-business-costs')
  @RequirePermission('business:order-entry:business-cost')
  async createPendingReviewBusinessCost(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentFinanceItemCreateInput) {
    return this.repository.createPendingReviewBusinessCost(request.user, id, body);
  }

  @Put('shipments/:id/review-business-costs/:feeId')
  @RequirePermission('business:order-entry:business-cost')
  async updatePendingReviewBusinessCost(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('feeId') feeId: string,
    @Body() body: ShipmentFinanceItemUpdateInput
  ) {
    return this.repository.updatePendingReviewBusinessCost(request.user, id, feeId, body);
  }

  @Delete('shipments/:id/review-business-costs/:feeId')
  @RequirePermission('business:order-entry:business-cost')
  async deletePendingReviewBusinessCost(@Req() request: { user: Principal }, @Param('id') id: string, @Param('feeId') feeId: string) {
    return this.repository.deletePendingReviewBusinessCost(request.user, id, feeId);
  }

  @Post('shipments/:id/finance-items/:feeId/lock')
  @RequirePermission('business:order-fee:lock')
  async lockShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Param('feeId') feeId: string) {
    return this.repository.lockShipmentFinanceItem(request.user, id, feeId);
  }

  @Post('shipments/:id/finance-items/:feeId/unlock')
  @RequirePermission('business:order-fee:unlock')
  async unlockShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Param('feeId') feeId: string) {
    return this.repository.unlockShipmentFinanceItem(request.user, id, feeId);
  }

  @Get('master-data')
  @RequirePermission([
    'master-data:customers:read',
    'master-data:finance:read',
    'master-data:agents:read',
    'master-data:agent-channels:read',
    'master-data:channels:read',
    'master-data:channel-categories:read',
    'master-data:remote-areas:read',
    'master-data:exchange-rates:read',
    'master-data:assistant:read'
  ])
  async masterData(@Req() request: { user: Principal }) {
    const canReadCustomers = await this.hasAnyPermission(request.user.role, ['master-data:customers:read']);
    const canReadFinanceCatalog = await this.hasAnyPermission(request.user.role, ['master-data:finance:read']);
    const canReadAgents = await this.repository.hasPermission(request.user.role, 'master-data:agents:read');
    const canReadAgentChannels = await this.hasAnyPermission(request.user.role, ['master-data:agent-channels:read']);
    const canReadChannels = await this.repository.hasPermission(request.user.role, 'master-data:channels:read');
    const canReadChannelCategories = await this.hasAnyPermission(request.user.role, ['master-data:channel-categories:read']);
    const canReadExchangeRates = await this.hasAnyPermission(request.user.role, ['master-data:exchange-rates:read']);
    const snapshot = await this.repository.getMasterData(buildMasterDataSnapshotSelection(request.user, {
      customers: canReadCustomers, financeCatalog: canReadFinanceCatalog,
      agents: canReadAgents, agentChannels: canReadAgentChannels,
      channels: canReadChannels, channelCategories: canReadChannelCategories,
      exchangeRates: canReadExchangeRates
    }));
    let result = snapshot;
    if (!canReadCustomers) {
      result = { ...result, customers: [], contacts: [], customerUsers: [] };
    }
    if (!canReadFinanceCatalog) {
      result = { ...result, surcharges: [], fuelRates: [] };
    }
    if (!canReadAgents) {
      result = { ...result, agents: [] };
    }
    if (!canReadAgentChannels) {
      result = { ...result, agentChannels: [] };
    }
    if (!canReadChannels) {
      result = { ...result, channels: [] };
    }
    if (!canReadChannelCategories) {
      result = { ...result, channelCategories: [] };
    }
    if (!canReadExchangeRates) {
      result = { ...result, exchangeRates: [] };
    }
    return this.scopeMasterDataCustomers(request.user, result);
  }

  @Get('master-data/customers')
  @RequirePermission('master-data:customers:read')
  async masterDataCustomers(@Req() request: { user: Principal }) {
    return this.scopeMasterDataCustomers(request.user, await this.repository.getMasterData()).customers;
  }

  @Get('master-data/customer-sources')
  @RequirePermission('master-data:customers:read')
  async masterDataCustomerSources(@Query('keyword') keyword?: string, @Query('enabledOnly') enabledOnly?: string) {
    const query: CustomerSourceListQuery = { keyword, enabledOnly: enabledOnly === 'true' };
    return this.repository.listCustomerSources(query);
  }

  @Post('master-data/customer-sources')
  @RequirePermission('master-data:customers:create')
  async createMasterDataCustomerSource(@Req() request: { user: Principal }, @Body() body: CustomerSourceInput) {
    return this.repository.createCustomerSource(request.user, body);
  }

  @Put('master-data/customer-sources/:id')
  @RequirePermission('master-data:customers:update')
  async updateMasterDataCustomerSource(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: Partial<CustomerSourceInput>) {
    return this.repository.updateCustomerSource(request.user, id, body);
  }

  @Delete('master-data/customer-sources/:id')
  @RequirePermission('master-data:customers:delete')
  async deleteMasterDataCustomerSource(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteCustomerSource(request.user, id);
  }

  @Post('master-data/customers')
  @RequirePermission('master-data:customers:create')
  async createMasterDataCustomer(@Req() request: { user: Principal }, @Body() body: CustomerCreateInput) {
    return this.repository.createCustomer(request.user, body);
  }

  @Put('master-data/customers/:id')
  @RequirePermission('master-data:customers:update')
  async updateMasterDataCustomer(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerUpdateInput) {
    return this.repository.updateCustomer(request.user, id, body);
  }

  @Post('master-data/customers/:id/contacts')
  @RequirePermission('master-data:customers:contacts-manage')
  async createMasterDataCustomerContact(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerContactCreateInput) {
    return this.repository.createCustomerContact(request.user, id, body);
  }

  @Put('master-data/customers/:id/contacts/:contactId')
  @RequirePermission('master-data:customers:contacts-manage')
  async updateMasterDataCustomerContact(@Req() request: { user: Principal }, @Param('id') id: string, @Param('contactId') contactId: string, @Body() body: CustomerContactUpdateInput) {
    return this.repository.updateCustomerContact(request.user, id, contactId, body);
  }

  @Post('master-data/customers/:id/users')
  @RequirePermission('master-data:customers:user-create')
  async createMasterDataCustomerUser(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerUserCreateInput) {
    return this.repository.createCustomerUser(request.user, id, body);
  }

  @Put('master-data/customers/:id/enabled')
  @RequirePermission('master-data:customers:enable')
  async updateMasterDataCustomerEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateCustomerEnabled(request.user, id, body);
  }

  @Delete('master-data/customers/:id')
  @RequirePermission('master-data:customers:delete')
  async deleteMasterDataCustomer(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteCustomer(request.user, id);
  }

  @Post('master-data/agents')
  @RequirePermission('master-data:agents:create')
  async createMasterDataAgent(@Req() request: { user: Principal }, @Body() body: AgentCreateInput) {
    return this.repository.createAgent(request.user, body);
  }

  @Put('master-data/agents/:id')
  @RequirePermission('master-data:agents:update')
  async updateMasterDataAgent(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentUpdateInput) {
    return this.repository.updateAgent(request.user, id, body);
  }

  @Put('master-data/agents/:id/enabled')
  @RequirePermission('master-data:agents:enable')
  async updateMasterDataAgentEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateAgentEnabled(request.user, id, body);
  }

  @Post('master-data/agents/batch-enabled')
  @RequirePermission('master-data:agents:batch-enable')
  async batchUpdateMasterDataAgentsEnabled(@Req() request: { user: Principal }, @Body() body: { ids?: string[]; enabled?: boolean }) {
    const ids = Array.from(new Set((body.ids ?? []).map((id) => String(id).trim()).filter(Boolean)));
    if (!ids.length) {
      throw new BadRequestException('请选择代理资料');
    }
    const rows = [];
    for (const id of ids) {
      rows.push(await this.repository.updateAgentEnabled(request.user, id, { enabled: body.enabled === true }));
    }
    return { successCount: rows.length, rows };
  }

  @Post('master-data/agents/batch-delete')
  @RequirePermission('master-data:agents:batch-delete')
  async batchDeleteMasterDataAgents(@Req() request: { user: Principal }, @Body() body: { ids?: string[] }): Promise<AgentDeleteResponse> {
    const ids = Array.from(new Set((body.ids ?? []).map((id) => String(id).trim()).filter(Boolean)));
    if (!ids.length) {
      throw new BadRequestException('请选择代理资料');
    }
    return this.repository.deleteAgents(request.user, ids);
  }

  @Delete('master-data/agents/:id')
  @RequirePermission('master-data:agents:delete')
  async deleteMasterDataAgent(@Req() request: { user: Principal }, @Param('id') id: string): Promise<AgentDeleteResponse> {
    return this.repository.deleteAgents(request.user, [id]);
  }

  @Post('master-data/agent-channels')
  @RequirePermission('master-data:agent-channels:create')
  async createMasterDataAgentChannel(@Req() request: { user: Principal }, @Body() body: AgentChannelCreateInput) {
    return this.repository.createAgentChannel(request.user, body);
  }

  @Put('master-data/agent-channels/:id')
  @RequirePermission('master-data:agent-channels:update')
  async updateMasterDataAgentChannel(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentChannelUpdateInput) {
    return this.repository.updateAgentChannel(request.user, id, body);
  }

  @Put('master-data/agent-channels/:id/enabled')
  @RequirePermission('master-data:agent-channels:enable')
  async updateMasterDataAgentChannelEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateAgentChannelEnabled(request.user, id, body);
  }

  @Delete('master-data/agent-channels/:id')
  @RequirePermission('master-data:agent-channels:delete')
  async deleteMasterDataAgentChannel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteAgentChannel(request.user, id);
  }

  @Post('master-data/carriers')
  @RequirePermission('master-data:channels:carrier-manage')
  async createMasterDataCarrier(@Req() request: { user: Principal }, @Body() body: CarrierCreateInput) {
    return this.repository.createCarrier(request.user, body);
  }

  @Put('master-data/carriers/:id/enabled')
  @RequirePermission('master-data:channels:carrier-enable')
  async updateMasterDataCarrierEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateCarrierEnabled(request.user, id, body);
  }

  @Post('master-data/channels')
  @RequirePermission('master-data:channels:create')
  async createMasterDataChannel(@Req() request: { user: Principal }, @Body() body: ChannelCreateInput) {
    return this.repository.createChannel(request.user, body);
  }

  @Put('master-data/channels/:id')
  @RequirePermission('master-data:channels:update')
  async updateMasterDataChannel(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ChannelUpdateInput) {
    return this.repository.updateChannel(request.user, id, body);
  }

  @Put('master-data/channels/:id/enabled')
  @RequirePermission('master-data:channels:enable')
  async updateMasterDataChannelEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateChannelEnabled(request.user, id, body);
  }

  @Post('master-data/channels/batch-delete')
  @RequirePermission('master-data:channels:batch-delete')
  async batchDeleteMasterDataChannels(@Req() request: { user: Principal }, @Body() body: { ids?: string[] }): Promise<ChannelDeleteResponse> {
    const ids = Array.from(new Set((body.ids ?? []).map((id) => String(id).trim()).filter(Boolean)));
    if (!ids.length) {
      throw new BadRequestException('请选择公司渠道');
    }
    return this.repository.deleteChannels(request.user, ids);
  }

  @Delete('master-data/channels/:id')
  @RequirePermission('master-data:channels:delete')
  async deleteMasterDataChannel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteChannel(request.user, id);
  }

  @Post('master-data/channel-categories')
  @RequirePermission('master-data:channel-categories:create')
  async createMasterDataChannelCategory(@Req() request: { user: Principal }, @Body() body: ChannelCategoryCreateInput) {
    return this.repository.createChannelCategory(request.user, body);
  }

  @Put('master-data/channel-categories/:id')
  @RequirePermission('master-data:channel-categories:update')
  async updateMasterDataChannelCategory(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ChannelCategoryUpdateInput) {
    return this.repository.updateChannelCategory(request.user, id, body);
  }

  @Put('master-data/channel-categories/:id/enabled')
  @RequirePermission('master-data:channel-categories:enable')
  async updateMasterDataChannelCategoryEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateChannelCategoryEnabled(request.user, id, body);
  }

  @Delete('master-data/channel-categories/:id')
  @RequirePermission('master-data:channel-categories:delete')
  async deleteMasterDataChannelCategory(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteChannelCategory(request.user, id);
  }

  @Post('master-data/surcharges')
  @RequirePermission('master-data:finance:surcharge-manage')
  async createMasterDataSurcharge(@Req() request: { user: Principal }, @Body() body: SurchargeCreateInput) {
    return this.repository.createSurcharge(request.user, body);
  }

  @Put('master-data/surcharges/:id/enabled')
  @RequirePermission('master-data:finance:surcharge-enable')
  async updateMasterDataSurchargeEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateSurchargeEnabled(request.user, id, body);
  }

  @Post('master-data/fuel-rates')
  @RequirePermission('master-data:finance:fuel-rate-manage')
  async createMasterDataFuelRate(@Req() request: { user: Principal }, @Body() body: FuelRateCreateInput) {
    return this.repository.createFuelRate(request.user, body);
  }

  @Post('master-data/exchange-rates')
  @RequirePermission('master-data:exchange-rates:create')
  async createMasterDataExchangeRate(@Req() request: { user: Principal }, @Body() body: ExchangeRateCreateInput) {
    return this.repository.createExchangeRate(request.user, body);
  }

  @Put('master-data/exchange-rates/:id')
  @RequirePermission('master-data:exchange-rates:update')
  async updateMasterDataExchangeRate(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ExchangeRateUpdateInput) {
    return this.repository.updateExchangeRate(request.user, id, body);
  }

  @Delete('master-data/exchange-rates/:id')
  @RequirePermission('master-data:exchange-rates:disable')
  async deleteMasterDataExchangeRate(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.updateExchangeRate(request.user, id, { enabled: false });
  }

  @Get('system/audit-logs')
  @RequirePermission('system:audit:read')
  async systemAuditLogs(@Req() request: { user: Principal }, @Query() query: AuditLogQuery) {
    return this.repository.getAuditLogs(request.user, query);
  }

  @Post('pricing/quote')
  @RequireAllPermissions('pricing:lookup:amazon', 'pricing:lookup:europe-oversize', 'pricing:lookup:europe-express', 'pricing:lookup:south-africa', 'pricing:lookup:usa-air-sea', 'pricing:lookup:canada-air-sea', 'pricing:lookup:dubai-air-sea')
  quote(@Req() request: { user: Principal }, @Body() body: PricingQuoteRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
    }
    return this.repository.quote(body);
  }

  @Get('pricing/books/rule-refresh-progress')
  @RequirePermission('pricing:price-books:health')
  async priceBookRuleRefreshProgress(@Req() request: { user: Principal }) {
    return this.repository.getPriceBookRuleRefreshProgress(request.user);
  }

  @Get('pricing/book-rows')
  @RequirePermission('pricing:price-books:view')
  async priceBookRows(@Req() request: { user: Principal }, @Query() query: PriceBookRowsQuery) {
    return this.repository.getPriceBookRows(request.user, undefined, query);
  }

  @Get('pricing/books/:id/rows')
  @RequirePermission(['pricing:price-books:view', 'pricing:price-books:export', 'pricing:price-books:update', 'pricing:price-books:delete', 'pricing:markup:amazon:view', 'pricing:markup:inquiry:view', 'pricing:markup:europeExpress:view', 'pricing:markup:southAfrica:view', 'pricing:markup:usaAirSea:view', 'pricing:markup:canadaAirSea:view', 'pricing:markup:dubaiAirSea:view'])
  async priceBookRowsByBook(@Req() request: { user: Principal }, @Param('id') id: string, @Query() query: PriceBookRowsQuery) {
    return this.repository.getPriceBookRows(request.user, id, query);
  }

  @Get('pricing/books/:id/markup-routes')
  @RequirePermission(['pricing:markup:amazon:view', 'pricing:markup:inquiry:view', 'pricing:markup:europeExpress:view', 'pricing:markup:southAfrica:view', 'pricing:markup:usaAirSea:view', 'pricing:markup:canadaAirSea:view', 'pricing:markup:dubaiAirSea:view'])
  async markupRoutesByBook(@Req() request: { user: Principal }, @Param('id') id: string, @Query() query: MarkupRouteListQuery) {
    return this.repository.getMarkupRoutes(request.user, id, query);
  }

  @Get('pricing/books/:id/download')
  @RequirePermission('pricing:price-books:export')
  async downloadPriceBook(@Req() request: { user: Principal }, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.repository.downloadPriceBook(request.user, id);
    const extension = extname(file.fileName).toLowerCase();
    const mimeType = extension === '.xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    response.setHeader('Content-Type', mimeType);
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `attachment; filename="price-book${extension || '.xlsx'}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    return new StreamableFile(file.buffer);
  }

  @Post('pricing/cleanup-old-original-agents')
  @RequirePermission('pricing:price-books:update')
  async cleanupOldOriginalAgents(@Req() request: { user: Principal }, @Body() body: { dryRun?: boolean }) {
    return this.repository.cleanupOldOriginalAgentData(request.user, { dryRun: body?.dryRun !== false });
  }

  @Post('pricing/lookup')
  @RequirePermission(['pricing:lookup:amazon', 'pricing:lookup:europe-oversize', 'pricing:lookup:europe-express', 'pricing:lookup:south-africa', 'pricing:lookup:usa-air-sea', 'pricing:lookup:canada-air-sea', 'pricing:lookup:dubai-air-sea'])
  async priceLookup(@Req() request: { user: Principal }, @Body() body: PriceLookupRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
    }
    if (!isAdministratorRole(request.user.role)) {
      const requiredPermissions = body.module
        ? [pricingLookupPermissionByModule[body.module]]
        : Object.values(pricingLookupPermissionByModule);
      const granted = await Promise.all(requiredPermissions.map((permission) => this.repository.hasPermission(request.user.role, permission)));
      if (!granted.every(Boolean)) {
        throw new ForbiddenException('当前用户组未分配该查价模块');
      }
    }
    const [response, agentNames] = await Promise.all([
      this.repository.lookupPrice(request.user, body),
      this.repository.getPricingAgentNames()
    ]);
    return this.sanitizePriceLookupResponse(response, agentNames);
  }

  @Post('pricing/legacy/amazon/quote')
  @RequirePermission('pricing:lookup:amazon')
  async legacyAmazonQuote(@Req() request: { user: Principal }, @Body() body: Omit<LegacyPricingQuoteRequest, 'module'>) {
    const [response, agentNames] = await Promise.all([this.repository.quoteLegacyPricing(request.user, { ...body, module: 'amazon' }), this.repository.getPricingAgentNames()]);
    return this.sanitizeLegacyPricingQuoteResponse(response, agentNames);
  }

  @Post('pricing/legacy/inquiry/quote')
  @RequirePermission('pricing:lookup:europe-oversize')
  async legacyInquiryQuote(@Req() request: { user: Principal }, @Body() body: Omit<LegacyPricingQuoteRequest, 'module'>) {
    const [response, agentNames] = await Promise.all([this.repository.quoteLegacyPricing(request.user, { ...body, module: 'inquiry' }), this.repository.getPricingAgentNames()]);
    return this.sanitizeLegacyPricingQuoteResponse(response, agentNames);
  }

  @Post('pricing/legacy/europe-express/quote')
  @RequirePermission('pricing:lookup:europe-express')
  async legacyEuropeExpressQuote(@Req() request: { user: Principal }, @Body() body: Omit<LegacyPricingQuoteRequest, 'module'>) {
    const [response, agentNames] = await Promise.all([this.repository.quoteLegacyPricing(request.user, { ...body, module: 'europeExpress' }), this.repository.getPricingAgentNames()]);
    return this.sanitizeLegacyPricingQuoteResponse(response, agentNames);
  }

  @Post('pricing/legacy/south-africa/quote')
  @RequirePermission('pricing:lookup:south-africa')
  async legacySouthAfricaQuote(@Req() request: { user: Principal }, @Body() body: Omit<LegacyPricingQuoteRequest, 'module'>) {
    const [response, agentNames] = await Promise.all([this.repository.quoteLegacyPricing(request.user, { ...body, module: 'southAfrica' }), this.repository.getPricingAgentNames()]);
    return this.sanitizeLegacyPricingQuoteResponse(response, agentNames);
  }

  @Post('pricing/legacy/usa-air-sea/quote')
  @RequirePermission('pricing:lookup:usa-air-sea')
  async legacyUsaAirSeaQuote(@Req() request: { user: Principal }, @Body() body: Omit<LegacyPricingQuoteRequest, 'module'>) {
    const [response, agentNames] = await Promise.all([this.repository.quoteLegacyPricing(request.user, { ...body, module: 'usaAirSea' }), this.repository.getPricingAgentNames()]);
    return this.sanitizeLegacyPricingQuoteResponse(response, agentNames);
  }

  @Post('pricing/legacy/canada-air-sea/quote')
  @RequirePermission('pricing:lookup:canada-air-sea')
  async legacyCanadaAirSeaQuote(@Req() request: { user: Principal }, @Body() body: Omit<LegacyPricingQuoteRequest, 'module'>) {
    const [response, agentNames] = await Promise.all([this.repository.quoteLegacyPricing(request.user, { ...body, module: 'canadaAirSea' }), this.repository.getPricingAgentNames()]);
    return this.sanitizeLegacyPricingQuoteResponse(response, agentNames);
  }

  @Post('pricing/legacy/dubai-air-sea/quote')
  @RequirePermission('pricing:lookup:dubai-air-sea')
  async legacyDubaiAirSeaQuote() {
    throw new BadRequestException('迪拜空海运模块仅支持价格表浏览');
  }

  @Get('pricing/legacy/dubai-air-sea/table')
  @RequirePermission('pricing:lookup:dubai-air-sea')
  async legacyDubaiAirSeaTable(@Req() request: { user: Principal }) {
    const [table, agentNames] = await Promise.all([this.repository.getDubaiPriceTable(request.user), this.repository.getPricingAgentNames()]);
    const sanitize = (row: typeof table.air[number]) => ({
      ...row,
      inboundRequirement: sanitizePricingChannelRequirement(row.inboundRequirement, agentNames),
      channelRequirement: sanitizePricingChannelRequirement(row.channelRequirement, agentNames)
    });
    return { ...table, air: table.air.map(sanitize), sea: table.sea.map(sanitize) };
  }

  @Get('pricing/legacy/dubai-air-sea/display-pages/:id/image')
  @RequirePermission('pricing:lookup:dubai-air-sea')
  async legacyDubaiAirSeaDisplayPageImage(@Req() request: { user: Principal }, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.repository.getDubaiPriceDisplayPageImage(request.user, id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', `inline; filename="dubai-price-${id}.png"`);
    return new StreamableFile(file.buffer);
  }

  @Get('pricing/legacy/dubai-air-sea/display-versions/:versionId/pages/:pageId/image')
  @RequirePermission('pricing:price-books:view')
  async legacyDubaiAirSeaDisplayVersionPageImage(
    @Req() request: { user: Principal },
    @Param('versionId') versionId: string,
    @Param('pageId') pageId: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.repository.getDubaiPriceDisplayVersionPageImage(request.user, versionId, pageId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', `inline; filename="dubai-price-${pageId}.png"`);
    return new StreamableFile(file.buffer);
  }

  @Put('pricing/legacy/dubai-air-sea/display-versions/:id/activate')
  @RequirePermission('pricing:price-books:update')
  async activateLegacyDubaiAirSeaDisplayVersion(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: DubaiPriceDisplayActivateInput) {
    return this.repository.activateDubaiPriceDisplayVersion(request.user, id, body);
  }

  @Post('pricing/legacy/dubai-air-sea/display-versions/:id/retry')
  @RequirePermission('pricing:price-books:update')
  async retryLegacyDubaiAirSeaDisplayVersion(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.retryDubaiPriceDisplayVersion(request.user, id);
  }

  @Post('pricing/legacy/dubai-air-sea/display-versions/:id/sea-markup')
  @RequirePermission('pricing:markup:dubaiAirSea:update')
  async updateLegacyDubaiSeaMarkup(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: DubaiSeaMarkupUpdateInput) {
    return this.repository.updateDubaiSeaMarkup(request.user, id, body);
  }

  @Post('pricing/south-africa/lookup')
  @RequirePermission('pricing:lookup:south-africa')
  async southAfricaLookup(@Req() request: { user: Principal }, @Body() body: SouthAfricaLookupRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
    }
    return this.sanitizeSouthAfricaLookupResponse(await this.repository.lookupSouthAfricaPricing(request.user, body));
  }

  @Get('pricing/south-africa/rules')
  @RequirePermission('pricing:lookup:south-africa')
  async southAfricaRateRules(@Req() request: { user: Principal }) {
    const response = await this.repository.getSouthAfricaRateRules(request.user);
    const canViewCostMarkup = await this.hasAnyPermission(request.user.role, ['pricing:markup:southAfrica:view']);
    return {
      ...response,
      rules: response.rules.map((rule) => {
        const sanitized = { ...rule, remark: sanitizePricingChannelRequirement(rule.remark) };
        if (canViewCostMarkup) return sanitized;
        const { costPerCbm: _costPerCbm, markupPerCbm: _markupPerCbm, ...businessRule } = sanitized;
        return businessRule;
      })
    };
  }

  @Post('pricing/south-africa/rules')
  @RequirePermission('pricing:markup:southAfrica:create')
  async createSouthAfricaRateRule(@Req() request: { user: Principal }, @Body() body: SouthAfricaRateRuleInput) {
    return this.sanitizeSouthAfricaRateRuleForPrincipal(request.user, await this.repository.createSouthAfricaRateRule(request.user, body));
  }

  @Put('pricing/south-africa/rules/:id')
  @RequirePermission('pricing:markup:southAfrica:update')
  async updateSouthAfricaRateRule(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: SouthAfricaRateRuleInput) {
    return this.sanitizeSouthAfricaRateRuleForPrincipal(request.user, await this.repository.updateSouthAfricaRateRule(request.user, id, body));
  }

  @Patch('pricing/south-africa/rules/:id/enabled')
  @RequirePermission('pricing:markup:southAfrica:status')
  async updateSouthAfricaRateRuleEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { enabled?: boolean }) {
    return this.sanitizeSouthAfricaRateRuleForPrincipal(request.user, await this.repository.updateSouthAfricaRateRuleEnabled(request.user, id, body));
  }

  @Delete('pricing/south-africa/rules/:id')
  @RequirePermission('pricing:markup:southAfrica:delete')
  async deleteSouthAfricaRateRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.sanitizeSouthAfricaRateRuleForPrincipal(request.user, await this.repository.deleteSouthAfricaRateRule(request.user, id));
  }

  @Post('pricing/south-africa/images')
  @RequirePermission('pricing:price-books:import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: SOUTH_AFRICA_RATE_IMAGE_MAX_BYTES } }))
  async uploadSouthAfricaRateImage(
    @Req() request: { user: Principal },
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    if (!file) throw new BadRequestException('请上传南非价格表图片');
    const normalizedFile = { ...file, originalname: normalizeUploadedFileName(file.originalname) };
    this.assertVoucherImage(normalizedFile);
    const uploadRoot = process.env.UPLOAD_DIR
      ? process.env.UPLOAD_DIR
      : process.env.NODE_ENV === 'production'
        ? '/app/uploads'
        : join(process.cwd(), 'uploads');
    const uploadDir = join(uploadRoot, 'pricing-south-africa');
    await mkdir(uploadDir, { recursive: true });
    const extension = this.imageMimeExtensions[normalizedFile.mimetype] ?? extname(normalizedFile.originalname).toLowerCase();
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, normalizedFile.buffer);
    return this.repository.createSouthAfricaRateImage(request.user, {
      fileName,
      originalName: normalizedFile.originalname,
      mimeType: normalizedFile.mimetype,
      sizeBytes: normalizedFile.size,
      url: `/uploads/pricing-south-africa/${fileName}`
    });
  }

  @Post('pricing/legacy/sources/import')
  @RequirePermission('pricing:price-books:import')
  async importLegacyPricingSource(@Req() request: { user: Principal }, @Body() body: LegacyPricingImportInput) {
    return this.repository.importLegacyPricingSource(request.user, body);
  }

  @Delete('pricing/legacy/sources/:id')
  @RequirePermission('pricing:price-books:delete')
  async deleteLegacyPricingSource(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteLegacyPricingSource(request.user, id);
  }

  @Post('pricing/legacy/rebuild')
  @RequirePermission('pricing:price-books:update')
  async rebuildLegacyPricing(@Req() request: { user: Principal }, @Body() body: { module?: LegacyPricingModule }) {
    return this.repository.rebuildLegacyPricing(request.user, body.module);
  }

  @Get('pricing/markup-rules')
  @RequirePermission(['pricing:markup:amazon:view', 'pricing:markup:inquiry:view', 'pricing:markup:europeExpress:view', 'pricing:markup:southAfrica:view', 'pricing:markup:usaAirSea:view', 'pricing:markup:canadaAirSea:view', 'pricing:markup:dubaiAirSea:view'])
  async agentMarkupRules(@Req() request: { user: Principal }, @Query() query: AgentMarkupListQuery) {
    return this.repository.getAgentMarkupRules(request.user, query);
  }

  @Get('pricing/markup-rules/export')
  @RequirePermission(['pricing:markup:amazon:export', 'pricing:markup:inquiry:export', 'pricing:markup:europeExpress:export', 'pricing:markup:southAfrica:export', 'pricing:markup:usaAirSea:export', 'pricing:markup:canadaAirSea:export', 'pricing:markup:dubaiAirSea:export'])
  async exportAgentMarkupRules(@Req() request: { user: Principal }, @Query() query: AgentMarkupListQuery) {
    return this.repository.exportAgentMarkupRules(request.user, query);
  }

  @Post('pricing/markup-rules/import')
  @RequirePermission(['pricing:markup:amazon:import', 'pricing:markup:inquiry:import', 'pricing:markup:europeExpress:import', 'pricing:markup:southAfrica:import', 'pricing:markup:usaAirSea:import', 'pricing:markup:canadaAirSea:import', 'pricing:markup:dubaiAirSea:import'])
  async importAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { rows?: AgentMarkupCreateInput[] }) {
    return this.repository.importAgentMarkupRules(request.user, body);
  }

  @Post('pricing/markup-rules/batch-upsert')
  @RequirePermission(['pricing:markup:amazon:import', 'pricing:markup:inquiry:import', 'pricing:markup:europeExpress:import', 'pricing:markup:southAfrica:import', 'pricing:markup:usaAirSea:import', 'pricing:markup:canadaAirSea:import', 'pricing:markup:dubaiAirSea:import'])
  async batchUpsertAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { rows?: AgentMarkupCreateInput[] }) {
    return this.repository.batchUpsertAgentMarkupRules(request.user, body);
  }

  @Post('pricing/markup-rules/batch-status')
  @RequirePermission(['pricing:markup:amazon:status', 'pricing:markup:inquiry:status', 'pricing:markup:europeExpress:status', 'pricing:markup:southAfrica:status', 'pricing:markup:usaAirSea:status', 'pricing:markup:canadaAirSea:status', 'pricing:markup:dubaiAirSea:status'])
  async batchUpdateAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { ids?: string[]; agentNames?: string[]; scopes?: Array<{ agentName?: string; priceBookId?: string; legacyModule?: LegacyPricingModule }>; enabled?: boolean }) {
    return this.repository.batchUpdateAgentMarkupRules(request.user, body);
  }

  @Post('pricing/markup-rules/batch-delete')
  @RequirePermission(['pricing:markup:amazon:delete', 'pricing:markup:inquiry:delete', 'pricing:markup:europeExpress:delete', 'pricing:markup:southAfrica:delete', 'pricing:markup:usaAirSea:delete', 'pricing:markup:canadaAirSea:delete', 'pricing:markup:dubaiAirSea:delete'])
  async batchDeleteAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { ids?: string[]; agentNames?: string[]; scopes?: Array<{ agentName?: string; priceBookId?: string; legacyModule?: LegacyPricingModule }> }) {
    return this.repository.batchDeleteAgentMarkupRules(request.user, body);
  }

  @Get('pricing/markup-rules/:id/preview')
  @RequirePermission(['pricing:markup:amazon:view', 'pricing:markup:inquiry:view', 'pricing:markup:europeExpress:view', 'pricing:markup:southAfrica:view', 'pricing:markup:usaAirSea:view', 'pricing:markup:canadaAirSea:view', 'pricing:markup:dubaiAirSea:view'])
  async previewAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.previewAgentMarkupRule(request.user, id);
  }

  @Post('pricing/markup-rules/route-preview')
  @RequirePermission(['pricing:markup:amazon:view', 'pricing:markup:inquiry:view', 'pricing:markup:europeExpress:view', 'pricing:markup:southAfrica:view', 'pricing:markup:usaAirSea:view', 'pricing:markup:canadaAirSea:view', 'pricing:markup:dubaiAirSea:view'])
  async previewMarkupRoute(@Req() request: { user: Principal }, @Body() body: MarkupRoutePreviewInput) {
    return this.repository.previewMarkupRoute(request.user, body);
  }

  @Post('pricing/markup-rules/route-preview/batch')
  @RequirePermission(['pricing:markup:amazon:view', 'pricing:markup:inquiry:view', 'pricing:markup:europeExpress:view', 'pricing:markup:southAfrica:view', 'pricing:markup:usaAirSea:view', 'pricing:markup:canadaAirSea:view', 'pricing:markup:dubaiAirSea:view'])
  async previewMarkupRoutesBatch(@Req() request: { user: Principal }, @Body() body: MarkupRoutePreviewBatchInput) {
    return this.repository.previewMarkupRoutesBatch(request.user, body);
  }

  @Post('pricing/markup-rules/route-tiers')
  @RequirePermission(['pricing:markup:amazon:tier', 'pricing:markup:inquiry:tier', 'pricing:markup:europeExpress:tier', 'pricing:markup:southAfrica:tier', 'pricing:markup:usaAirSea:tier', 'pricing:markup:canadaAirSea:tier', 'pricing:markup:dubaiAirSea:tier'])
  async replaceMarkupRouteTiers(@Req() request: { user: Principal }, @Body() body: MarkupRouteTierReplaceInput) {
    return this.repository.replaceMarkupRouteTiers(request.user, body);
  }

  @Post('pricing/markup-rules/route-tiers/batch')
  @RequirePermission(['pricing:markup:amazon:tier', 'pricing:markup:inquiry:tier', 'pricing:markup:europeExpress:tier', 'pricing:markup:southAfrica:tier', 'pricing:markup:usaAirSea:tier', 'pricing:markup:canadaAirSea:tier', 'pricing:markup:dubaiAirSea:tier'])
  async replaceMarkupRouteTiersBatch(@Req() request: { user: Principal }, @Body() body: MarkupRouteTierBatchReplaceInput) {
    return this.repository.replaceMarkupRouteTiersBatch(request.user, body);
  }

  @Post('pricing/markup-rules/migrate-pricebook-scopes')
  @RequireAllPermissions('pricing:markup:amazon:tier', 'pricing:markup:inquiry:tier', 'pricing:markup:europeExpress:tier', 'pricing:markup:southAfrica:tier', 'pricing:markup:usaAirSea:tier', 'pricing:markup:canadaAirSea:tier', 'pricing:markup:dubaiAirSea:tier')
  async migrateLegacyMarkupRouteScopes(@Req() request: { user: Principal }) {
    return this.repository.migrateLegacyMarkupRouteScopes(request.user);
  }

  @Post('pricing/markup-rules')
  @RequirePermission(['pricing:markup:amazon:create', 'pricing:markup:inquiry:create', 'pricing:markup:europeExpress:create', 'pricing:markup:southAfrica:create', 'pricing:markup:usaAirSea:create', 'pricing:markup:canadaAirSea:create', 'pricing:markup:dubaiAirSea:create'])
  async createAgentMarkupRule(@Req() request: { user: Principal }, @Body() body: AgentMarkupCreateInput) {
    return this.repository.createAgentMarkupRule(request.user, body);
  }

  @Put('pricing/markup-rules/:id')
  @RequirePermission(['pricing:markup:amazon:update', 'pricing:markup:inquiry:update', 'pricing:markup:europeExpress:update', 'pricing:markup:southAfrica:update', 'pricing:markup:usaAirSea:update', 'pricing:markup:canadaAirSea:update', 'pricing:markup:dubaiAirSea:update'])
  async updateAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentMarkupUpdateInput) {
    return this.repository.updateAgentMarkupRule(request.user, id, body);
  }

  @Delete('pricing/markup-rules/:id')
  @RequirePermission(['pricing:markup:amazon:delete', 'pricing:markup:inquiry:delete', 'pricing:markup:europeExpress:delete', 'pricing:markup:southAfrica:delete', 'pricing:markup:usaAirSea:delete', 'pricing:markup:canadaAirSea:delete', 'pricing:markup:dubaiAirSea:delete'])
  async deleteAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteAgentMarkupRule(request.user, id);
  }

  @Post('pricing/books/import')
  @RequirePermission('pricing:price-books:import')
  async importPriceBook(@Req() request: { user: Principal }, @Body() body: PriceBookImportInput, @Query('returnRows') returnRows?: string) {
    return this.repository.importPriceBook(request.user, body, { returnRows: false });
  }

  @Post('pricing/books/import-jobs')
  @RequirePermission('pricing:price-books:import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PRICE_BOOK_FILE_IMPORT_MAX_BYTES } }))
  async createPriceBookImportJob(
    @Req() request: { user: Principal },
    @Body('targetModule') targetModule: PriceBookImportTargetModule | undefined,
    @Body('agentId') agentId: string | undefined,
    @Body('agentShortName') agentShortName: string | undefined,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    if (!file) {
      throw new BadRequestException('请选择价格表文件');
    }
    if (file.size > PRICE_BOOK_FILE_IMPORT_MAX_BYTES || file.buffer.length > PRICE_BOOK_FILE_IMPORT_MAX_BYTES) {
      throw new BadRequestException('价格表文件过大，最大支持 30MB，请拆分后导入');
    }
    const normalizedFile = { ...file, originalname: normalizeUploadedFileName(file.originalname) };
    this.assertExcelFile(normalizedFile);
    const uploadDir = resolveUploadDirectory('pricing-imports');
    await mkdir(uploadDir.dir, { recursive: true });
    const extension = extname(normalizedFile.originalname).toLowerCase();
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    const filePath = join(uploadDir.dir, fileName);
    await writeFile(filePath, file.buffer);
    return this.repository.createPriceBookImportJob(request.user, {
      fileName: normalizedFile.originalname,
      targetModule,
      agentId,
      agentShortName,
      buffer: file.buffer,
      filePath
    });
  }

  @Post('pricing/books/import-jobs/:id/retry')
  @RequirePermission('pricing:price-books:import')
  async retryPriceBookImportJob(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.retryPriceBookImportJob(request.user, id);
  }

  @Put('pricing/books/:id/remark')
  @RequirePermission('pricing:price-books:update')
  async updatePriceBookRemark(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PriceBookRemarkUpdateInput) {
    return this.repository.updatePriceBookRemark(request.user, id, body);
  }

  @Delete('pricing/books/:id')
  @RequirePermission('pricing:price-books:delete')
  async deletePriceBook(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deletePriceBook(request.user, id);
  }

  @Post('pricing/books/batch-delete')
  @RequirePermission('pricing:price-books:delete')
  async batchDeletePriceBooks(@Req() request: { user: Principal }, @Body() body: PriceBookBatchDeleteInput) {
    return this.repository.batchDeletePriceBooks(request.user, body.ids);
  }

  @Get('pricing/rules')
  @RequireAllPermissions('pricing:markup:amazon:tier', 'pricing:markup:inquiry:tier', 'pricing:markup:europeExpress:tier', 'pricing:markup:southAfrica:tier', 'pricing:markup:usaAirSea:tier', 'pricing:markup:canadaAirSea:tier', 'pricing:markup:dubaiAirSea:tier')
  async pricingRules(@Req() request: { user: Principal }) {
    return this.repository.getPricingRules(request.user);
  }

  @Post('pricing/rules')
  @RequireAllPermissions('pricing:markup:amazon:tier', 'pricing:markup:inquiry:tier', 'pricing:markup:europeExpress:tier', 'pricing:markup:southAfrica:tier', 'pricing:markup:usaAirSea:tier', 'pricing:markup:canadaAirSea:tier', 'pricing:markup:dubaiAirSea:tier')
  async createPricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleCreateInput) {
    return this.repository.createPricingRule(request.user, body);
  }

  @Put('pricing/rules/:id/enabled')
  @RequireAllPermissions('pricing:markup:amazon:tier', 'pricing:markup:inquiry:tier', 'pricing:markup:europeExpress:tier', 'pricing:markup:southAfrica:tier', 'pricing:markup:usaAirSea:tier', 'pricing:markup:canadaAirSea:tier', 'pricing:markup:dubaiAirSea:tier')
  async updatePricingRuleEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updatePricingRuleEnabled(request.user, id, body);
  }

  @Post('pricing/rules/quote')
  @RequireAllPermissions('pricing:lookup:amazon', 'pricing:lookup:europe-oversize', 'pricing:lookup:europe-express', 'pricing:lookup:south-africa', 'pricing:lookup:usa-air-sea', 'pricing:lookup:canada-air-sea', 'pricing:lookup:dubai-air-sea')
  async quotePricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleQuoteRequest) {
    return this.repository.quotePricingRule(request.user, body);
  }

  @Get('finance/business-cost-audits')
  @RequirePermission('finance:business-cost:read')
  async businessCostAudits(@Req() request: { user: Principal }, @Query() query: BusinessCostAuditListQuery) {
    return this.repository.getBusinessCostAudits(request.user, query);
  }

  @Get('finance/dashboard')
  @RequirePermission('finance:dashboard:view')
  async financeDashboard(@Req() request: { user: Principal }) {
    return this.repository.getFinanceDashboard(request.user);
  }

  @Post('finance/business-cost-audits')
  @RequirePermission('finance:business-cost:manage')
  async createBusinessCostAudit(@Req() request: { user: Principal }, @Body() body: BusinessCostAuditCreateInput) {
    return this.repository.createBusinessCostAudit(request.user, body);
  }

  @Put('finance/business-cost-audits/:id')
  @RequirePermission('finance:business-cost:manage')
  async updateBusinessCostAudit(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: BusinessCostAuditUpdateInput) {
    return this.repository.updateBusinessCostAudit(request.user, id, body);
  }

  @Post('finance/business-cost-audits/:id/audit')
  @RequirePermission('finance:business-cost:batch-audit')
  async auditBusinessCostAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.auditBusinessCostAudit(request.user, id);
  }

  @Post('finance/business-cost-audits/:id/reverse-audit')
  @RequirePermission('finance:business-cost:batch-reverse')
  async reverseAuditBusinessCostAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.reverseAuditBusinessCostAudit(request.user, id);
  }

  @Delete('finance/business-cost-audits/:id')
  @RequirePermission('finance:business-cost:batch-void')
  async deleteBusinessCostAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteBusinessCostAudit(request.user, id);
  }

  @Post('finance/business-cost-audits/batch-audit')
  @RequirePermission('finance:business-cost:audit')
  async batchAuditBusinessCostAudits(@Req() request: { user: Principal }, @Body() body: BusinessCostAuditBatchInput) {
    return this.repository.batchAuditBusinessCostAudits(request.user, body);
  }

  @Post('finance/business-cost-audits/batch-reverse-audit')
  @RequirePermission('finance:business-cost:reverse')
  async batchReverseAuditBusinessCostAudits(@Req() request: { user: Principal }, @Body() body: BusinessCostAuditBatchInput) {
    return this.repository.batchReverseAuditBusinessCostAudits(request.user, body);
  }

  @Post('finance/business-cost-audits/batch-void')
  @RequirePermission('finance:business-cost:void')
  async batchVoidBusinessCostAudits(@Req() request: { user: Principal }, @Body() body: BusinessCostAuditBatchInput) {
    return this.repository.batchVoidBusinessCostAudits(request.user, body);
  }

  @Post('finance/business-cost-audits/export')
  @RequirePermission('finance:business-cost:export')
  async exportBusinessCostAudits(@Req() request: { user: Principal }, @Body() body: BusinessCostAuditExportRequest) {
    return this.repository.exportBusinessCostAudits(request.user, body);
  }

  @Get('finance/payable-audits')
  @RequirePermission('finance:payable:read')
  async payableAudits(@Req() request: { user: Principal }, @Query() query: PayableAuditListQuery) {
    return this.repository.getPayableAudits(request.user, query);
  }

  @Post('finance/payable-audits')
  @RequirePermission('finance:payable:match-shipment')
  async createPayableAudit(@Req() request: { user: Principal }, @Body() body: PayableAuditCreateInput) {
    return this.repository.createPayableAudit(request.user, body);
  }

  @Post('finance/payable-audits/match-shipment')
  @RequirePermission('finance:payable:manage')
  async matchPayableAuditShipment(@Req() request: { user: Principal }, @Body() body: PayableAuditShipmentMatchInput) {
    return this.repository.matchPayableAuditShipment(request.user, body);
  }

  @Put('finance/payable-audits/:id')
  @RequirePermission('finance:payable:manage')
  async updatePayableAudit(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PayableAuditUpdateInput) {
    return this.repository.updatePayableAudit(request.user, id, body);
  }

  @Post('finance/payable-audits/:id/audit')
  @RequirePermission('finance:payable:batch-audit')
  async auditPayableAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.auditPayableAudit(request.user, id);
  }

  @Post('finance/payable-audits/:id/reverse-audit')
  @RequirePermission('finance:payable:batch-reverse')
  async reverseAuditPayableAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.reverseAuditPayableAudit(request.user, id);
  }

  @Delete('finance/payable-audits/:id')
  @RequirePermission('finance:payable:batch-void')
  async deletePayableAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deletePayableAudit(request.user, id);
  }

  @Post('finance/payable-audits/batch-audit')
  @RequirePermission('finance:payable:audit')
  async batchAuditPayableAudits(@Req() request: { user: Principal }, @Body() body: PayableAuditBatchInput) {
    return this.repository.batchAuditPayableAudits(request.user, body);
  }

  @Post('finance/payable-audits/batch-reverse-audit')
  @RequirePermission('finance:payable:reverse')
  async batchReverseAuditPayableAudits(@Req() request: { user: Principal }, @Body() body: PayableAuditBatchInput) {
    return this.repository.batchReverseAuditPayableAudits(request.user, body);
  }

  @Post('finance/payable-audits/batch-void')
  @RequirePermission('finance:payable:void')
  async batchVoidPayableAudits(@Req() request: { user: Principal }, @Body() body: PayableAuditBatchInput) {
    return this.repository.batchVoidPayableAudits(request.user, body);
  }

  @Post('finance/payable-audits/export')
  @RequirePermission('finance:payable:export')
  async exportPayableAudits(@Req() request: { user: Principal }, @Body() body: PayableAuditExportRequest) {
    return this.repository.exportPayableAudits(request.user, body);
  }

  @Get('finance/pending-payments')
  @RequirePermission('finance:pending-payment:read')
  async pendingPayments(@Req() request: { user: Principal }, @Query() query: PendingPaymentListQuery) {
    return this.repository.getPendingPayments(request.user, query);
  }

  @Post('finance/payment-applications')
  @RequirePermission('finance:pending-payment:create')
  @UseInterceptors(FileInterceptor('voucherFile', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async createPaymentApplications(
    @Req() request: { user: Principal },
    @Body() body: PaymentApplicationCreateInput & { payload?: string },
    @UploadedFile() voucherFile: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    let input: PaymentApplicationCreateInput;
    try {
      input = typeof body.payload === 'string' ? JSON.parse(body.payload) as PaymentApplicationCreateInput : body;
    } catch {
      throw new BadRequestException('付款申请参数无效');
    }
    if (!input || !Array.isArray(input.pendingPaymentIds)) {
      throw new BadRequestException('付款申请参数无效');
    }
    if (!voucherFile) {
      throw new BadRequestException('请在发起付款申请时上传供应商账单截图');
    }

    let persistedVoucherPath: string | undefined;
    if (voucherFile) {
      const normalizedFile = { ...voucherFile, originalname: normalizeUploadedFileName(voucherFile.originalname) };
      this.assertVoucherImage(normalizedFile);
      const uploadDir = resolveUploadDirectory('vouchers');
      await mkdir(uploadDir.dir, { recursive: true });
      const extension = this.imageMimeExtensions[normalizedFile.mimetype];
      const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
      persistedVoucherPath = join(uploadDir.dir, fileName);
      await writeFile(persistedVoucherPath, normalizedFile.buffer);
      input = {
        ...input,
        voucher: {
          voucherType: input.voucher?.voucherType ?? 'BILL',
          fileName: normalizedFile.originalname,
          mimeType: normalizedFile.mimetype,
          sizeBytes: normalizedFile.size,
          url: `${uploadDir.publicPath}/${fileName}`
        }
      };
    }

    try {
      return await this.repository.createPaymentApplications(request.user, input);
    } catch (error) {
      if (persistedVoucherPath) {
        await unlink(persistedVoucherPath).catch(() => undefined);
      }
      throw error;
    }
  }

  @Put('finance/payment-applications/:id')
  @RequirePermission('finance:pending-payment:update')
  async updatePaymentApplication(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentApplicationUpdateInput) {
    return this.repository.updatePaymentApplication(request.user, id, body);
  }

  @Post('finance/payment-applications/:id/cancel')
  @RequirePermission('finance:pending-payment:cancel')
  async cancelPaymentApplication(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentApplicationCancelInput) {
    return this.repository.cancelPaymentApplication(request.user, id, body);
  }

  @Post('finance/payment-applications/export')
  @RequirePermission('finance:pending-payment:export')
  async exportPaymentApplications(@Req() request: { user: Principal }, @Body() body: PaymentApplicationExportRequest) {
    return this.repository.exportPaymentApplications(request.user, body);
  }

  @Get('finance/payee-bank-accounts')
  @RequirePermission('finance:pending-payment:bank-select')
  async payeeBankAccounts(@Req() request: { user: Principal }, @Query() query: { agentName?: string; agentId?: string; currency?: 'RMB' | 'USD' }) {
    return this.repository.getPayeeBankAccounts(request.user, query);
  }

  @Post('finance/payee-bank-accounts')
  @RequirePermission('finance:pending-payment:bank-manage')
  async upsertPayeeBankAccount(@Req() request: { user: Principal }, @Body() body: PayeeBankAccountInput) {
    return this.repository.upsertPayeeBankAccount(request.user, body);
  }

  @Post('finance/payment-vouchers')
  @RequirePermission('finance:agent-bill:import')
  async addPaymentVoucher(@Req() request: { user: Principal }, @Body() body: PaymentVoucherInput) {
    return this.repository.addPaymentVoucher(request.user, body);
  }

  @Get('finance/payment-vouchers')
  @RequirePermission('finance:agent-bill:read')
  async paymentVouchers(@Req() request: { user: Principal }, @Query() query: PaymentVoucherListQuery) {
    return this.repository.getPaymentVouchers(request.user, query);
  }

  @Delete('finance/pending-payment-bill-vouchers/:id')
  @RequirePermission('finance:pending-payment:bill-voucher-upload')
  async deletePendingPaymentBillVoucher(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deletePendingPaymentBillVoucher(request.user, id);
  }

  @Patch('finance/payment-vouchers/:id/difference')
  @RequirePermission('finance:agent-bill:difference-manage')
  async updatePaymentVoucherDifference(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentVoucherDifferenceInput) {
    return this.repository.updatePaymentVoucherDifference(request.user, id, body);
  }

  @Patch('finance/payment-vouchers/:id/archive')
  @RequirePermission('finance:agent-bill:archive')
  async updatePaymentVoucherArchive(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentVoucherArchiveInput) {
    return this.repository.updatePaymentVoucherArchive(request.user, id, body);
  }

  @Get('uploads/vouchers/:fileName')
  @RequireAuth()
  async downloadVoucherImage(
    @Req() request: { user: Principal },
    @Param('fileName') fileName: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const storedFileName = basename(fileName);
    if (storedFileName !== fileName || !/^[A-Za-z0-9._-]+$/.test(storedFileName)) {
      throw new BadRequestException('凭证文件名不正确');
    }
    const metadata = await this.repository.getVoucherImageFileAccess(request.user, storedFileName);
    const buffer = await readFile(join(resolveUploadDirectory('vouchers').dir, storedFileName)).catch(() => null);
    if (!buffer) throw new NotFoundException('凭证图片不存在');
    response.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(metadata.fileName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(buffer);
  }

  @Post('finance/voucher-images')
  @RequireAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadVoucherImage(
    @Req() request: { user: Principal },
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Body() body: {
      context?: VoucherImageUploadContext;
      pendingPaymentId?: string;
      paymentApplicationId?: string;
      waterReceiptId?: string;
    }
  ) {
    if (!file) throw new BadRequestException('请上传图片');
    const normalizedFile = { ...file, originalname: normalizeUploadedFileName(file.originalname) };
    const context = body.context as VoucherImageUploadContext | 'PENDING_PAYMENT_BILL' | undefined;
    if (!context) throw new BadRequestException('缺少凭证类型');
    if (context === 'PENDING_PAYMENT_BILL') {
      throw new BadRequestException('请在发起付款申请时上传供应商账单截图');
    }
    this.assertVoucherImage(normalizedFile);
    const requiredPermission: PermissionKey = context === 'PAYMENT_APPLICATION_BILL'
      ? 'finance:pending-payment:payment-voucher-upload'
      : context === 'PAID_PAYMENT_RECEIPT'
        ? 'finance:paid-payment:voucher-upload'
        : 'finance:water-receipt:voucher-upload';
    await this.ensurePermission(request.user, requiredPermission);
    if (context === 'PAYMENT_APPLICATION_BILL' && !body.paymentApplicationId) throw new BadRequestException('缺少付款申请');
    if (context === 'PAID_PAYMENT_RECEIPT' && !body.paymentApplicationId) throw new BadRequestException('缺少付款申请');
    if (context === 'WATER_RECEIPT' && !body.waterReceiptId) throw new BadRequestException('缺少水单');

    const uploadDir = resolveUploadDirectory('vouchers');
    await mkdir(uploadDir.dir, { recursive: true });
    const extension = this.imageMimeExtensions[normalizedFile.mimetype];
    const fileName = new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + randomUUID() + extension;
    const filePath = join(uploadDir.dir, fileName);
    await writeFile(filePath, normalizedFile.buffer);
    const url = uploadDir.publicPath + '/' + fileName;
    const input: PaymentVoucherInput = {
      fileName: normalizedFile.originalname,
      mimeType: normalizedFile.mimetype,
      sizeBytes: normalizedFile.size,
      url
    };

    try {
      if (context === 'PAYMENT_APPLICATION_BILL') {
        const paymentApplicationId = body.paymentApplicationId;
        if (!paymentApplicationId) throw new BadRequestException('缺少付款申请');
        return this.repository.addPaymentVoucher(request.user, { ...input, paymentApplicationId, voucherType: 'BILL' }, 'finance:pending-payment:payment-voucher-upload');
      }
      if (context === 'PAID_PAYMENT_RECEIPT') {
        const paymentApplicationId = body.paymentApplicationId;
        if (!paymentApplicationId) throw new BadRequestException('缺少付款申请');
        return this.repository.addPaymentWaterReceipt(request.user, { ...input, paymentApplicationId, voucherType: 'PAYMENT_RECEIPT' });
      }
      if (context === 'WATER_RECEIPT') {
        const waterReceiptId = body.waterReceiptId;
        if (!waterReceiptId) throw new BadRequestException('缺少水单');
        return this.repository.uploadWaterReceiptVoucher(request.user, waterReceiptId, input);
      }
      throw new BadRequestException('不支持的凭证类型');
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
  }

  private assertVoucherImage(file: { mimetype: string; originalname: string; buffer: Buffer }) {
    if (!this.imageMimeExtensions[file.mimetype]) {
      throw new BadRequestException('仅支持 PNG、JPG、WEBP、GIF 图片');
    }
    const originalExt = extname(file.originalname).toLowerCase();
    if (originalExt === '.svg' || originalExt === '.pdf' || originalExt === '.xlsx' || originalExt === '.xls') {
      throw new BadRequestException('仅支持图片，不支持表格、PDF 或 SVG');
    }
    const buffer = file.buffer;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isGif = buffer.subarray(0, 3).toString('ascii') === 'GIF';
    const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isPng && !isJpeg && !isGif && !isWebp) {
      throw new BadRequestException('图片内容格式无效');
    }
  }

  private assertExcelFile(file: { mimetype: string; originalname: string; buffer: Buffer }) {
    const extension = extname(file.originalname).toLowerCase();
    if (!['.xls', '.xlsx'].includes(extension) || extension === '.xlsm') {
      throw new BadRequestException('仅支持 .xls/.xlsx Excel 文件');
    }
    if (!(file.mimetype in this.excelMimeExtensions) && file.mimetype !== '') {
      throw new BadRequestException('仅支持 Excel 文件');
    }
    const isXlsxContent = file.buffer.subarray(0, 2).toString('ascii') === 'PK';
    const oleHeader = file.buffer.subarray(0, 4);
    const isXlsContent = oleHeader[0] === 0xd0 && oleHeader[1] === 0xcf && oleHeader[2] === 0x11 && oleHeader[3] === 0xe0;
    if (extension === '.xlsx' && isXlsContent) {
      throw new BadRequestException('文件扩展名为 .xlsx，但内容实际是 .xls，请改为 .xls 后上传');
    }
    if (extension === '.xlsx' && !isXlsxContent) {
      throw new BadRequestException('XLSX 内容格式无效');
    }
    if (extension === '.xls' && isXlsxContent) {
      throw new BadRequestException('文件扩展名为 .xls，但内容实际是 .xlsx，请改为 .xlsx 后上传');
    }
    if (extension === '.xls' && !isXlsContent) {
      throw new BadRequestException('XLS 内容格式无效');
    }
  }

  @Get('finance/paid-payments')
  @RequirePermission('finance:paid-payment:read')
  async paidPayments(@Req() request: { user: Principal }, @Query() query: PaidPaymentListQuery) {
    return this.repository.getPaidPayments(request.user, query);
  }

  @Post('finance/payment-applications/:id/confirm-paid')
  @RequirePermission('finance:paid-payment:confirm')
  async confirmPaymentApplicationPaid(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentConfirmPaidInput) {
    return this.repository.confirmPaymentApplicationPaid(request.user, id, body);
  }

  @Put('finance/paid-payments/:id')
  @RequirePermission('finance:paid-payment:update')
  async updatePaidPayment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaidPaymentUpdateInput) {
    return this.repository.updatePaidPayment(request.user, id, body);
  }

  @Post('finance/paid-payments/:id/reverse')
  @RequirePermission('finance:paid-payment:reverse')
  async reversePaidPayment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaidPaymentReverseInput) {
    return this.repository.reversePaidPayment(request.user, id, body);
  }

  @Post('finance/paid-payments/export')
  @RequirePermission('finance:paid-payment:export')
  async exportPaidPayments(@Req() request: { user: Principal }, @Body() body: PaidPaymentExportRequest) {
    return this.repository.exportPaidPayments(request.user, body);
  }

  @Post('finance/payment-water-receipts')
  @RequirePermission('finance:paid-payment:voucher-upload')
  async addPaymentWaterReceipt(@Req() request: { user: Principal }, @Body() body: PaymentWaterReceiptInput) {
    return this.repository.addPaymentWaterReceipt(request.user, body);
  }

  @Get('finance/agent-bank-accounts')
  @RequirePermission(['master-data:agents:bank-view', 'finance:paid-payment:bank-view'])
  async agentBankAccounts(@Req() request: { user: Principal }, @Query() query: { agentName?: string; agentId?: string; includeDisabled?: string | boolean }) {
    return this.repository.getAgentBankAccounts(request.user, query);
  }

  @Post('finance/agent-bank-accounts')
  @RequirePermission(['master-data:agents:bank-manage', 'finance:pending-payment:bank-manage'])
  async upsertAgentBankAccount(@Req() request: { user: Principal }, @Body() body: AgentBankAccountInput) {
    return this.repository.upsertAgentBankAccount(request.user, body);
  }

  @Get('finance/customer-statements')
  @RequirePermission('finance:customer-account:read')
  async customerStatements(@Req() request: { user: Principal }) {
    return this.repository.getCustomerStatements(request.user);
  }

  @Post('finance/customer-statements')
  @RequirePermission('finance:receivable:create')
  async createCustomerStatement(@Req() request: { user: Principal }, @Body() body: CustomerStatementCreateInput) {
    return this.repository.createCustomerStatement(request.user, body);
  }

  @Get('finance/customer-accounts')
  @RequirePermission('finance:customer-account:read')
  async customerAccounts(@Req() request: { user: Principal }) {
    return this.repository.getCustomerAccounts(request.user);
  }

  @Get('finance/account-ledger')
  @RequirePermission('finance:customer-account:read')
  async accountLedger(@Req() request: { user: Principal }) {
    return this.repository.getAccountLedger(request.user);
  }

  @Post('finance/payments')
  @RequirePermission('finance:receivable:create')
  async createPayment(@Req() request: { user: Principal }, @Body() body: PaymentCreateInput) {
    return this.repository.createPayment(request.user, body);
  }
}

function normalizeUploadedFileName(fileName: string) {
  const raw = String(fileName ?? '').trim();
  if (!raw) return '未命名文件';
  const candidates = [raw];
  for (let index = 0; index < 2; index += 1) {
    const decoded = Buffer.from(candidates[index], 'latin1').toString('utf8');
    if (!decoded || decoded === candidates[index] || decoded.includes('�')) break;
    candidates.push(decoded);
  }
  const normalized = candidates.find((candidate) => /[\u4e00-\u9fff]/.test(candidate) && !candidate.includes('�')) ?? raw;
  return normalized.replace(/[\\/:\0]/g, '_').trim() || '未命名文件';
}

function ensureInternalOrderEntryScope(principal: Principal) {
  if (principal.role === 'CUSTOMER') throw new ForbiddenException('当前角色不能使用内部录单');
  if (principal.shipmentAllView || principal.dataScope === 'SALES_OWN' || principal.departmentTeamScope?.length) return;
  throw new ForbiddenException('当前岗位未配置录单数据范围');
}

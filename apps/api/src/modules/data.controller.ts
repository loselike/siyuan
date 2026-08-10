import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Inject, Logger, NotFoundException, Param, Patch, Post, Put, Query, Req, Res, StreamableFile, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
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
  ShipmentDispatchInput,
  WarehouseHandoverPrintInput,
  WarehouseRentDetailQuery,
  WarehouseRentRuleEnabledInput,
  WarehouseRentRuleInput,
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
  CommonTagCreateInput,
  CommonTagUpdateInput,
  ProblemTicketCreateInput,
  ReceivableAdjustmentInput,
  SurchargeCreateInput,
  RoleGroupInput,
  BulkTrackingApplyRequest,
  ShipmentCreateInput,
  ShipmentFinanceItemCreateInput,
  ShipmentFinanceItemUpdateInput,
  ShipmentImportRequest,
  ShipmentOperationalUpdateInput,
  CustomerServiceDataConfirmListQuery,
  CustomerServiceDataReviewInput,
  CustomerServiceDataReverseInput,
  CustomerServiceDataUpdateInput,
  CustomerServiceFinanceItemUpdateInput,
  CustomerServiceFinanceUpdatePreview,
  CustomerServiceFinanceUpdatePreviewRow,
  CustomerServiceTransferBatchInput,
  ShipmentPaymentUpdateInput,
  ShipmentRerouteInput,
  ShipmentRouteInput,
  ShipmentRestoreInput,
  ShipmentReviewBasicUpdateInput,
  ShipmentReviewDeleteInput,
  ShipmentReviewRejectInput,
  SiteCreateInput,
  SiteUpdateInput,
  StaffAccountCreateInput,
  StaffAccountPasswordResetInput,
  StaffAccountQuery,
  StaffAccountUpdateInput,
  TrackingEventInput,
  WarehouseConsolidationCreateInput,
  WarehouseManualReceiptCreateInput,
  WarehouseSameSpecReplenishInput,
  WarehousePackageCreateInput,
  WarehousePackageSplitInput,
  WarehousePackageUpdateInput,
  WarehouseTallyTaskCompleteInput,
  WarehouseTallyTaskCompletedCountUpdateInput,
  WarehouseTallyTaskCreateInput,
  WarehouseTallyLabelScanInput,
  WarehouseTallyHistoricalAggregateCorrectionInput,
  WarehouseTallyRepeatStatisticsQuery,
  WarehouseTallyTaskUpdateInput,
  MasterDataSnapshot,
  NavigationReadStateInput
} from '@siyuan/shared';
import { PrismaRepository } from './prisma.repository.js';
import { FinanceCatalogService } from './finance/catalog/finance-catalog.service.js';
import { sanitizePricingChannelRequirement } from './pricing-excel.js';
import { parseWarehouseMachineWorkbook } from './warehouse-machine-import.js';
import { RequireAuth, RequirePermission } from './require-permission.decorator.js';
import { isAdministratorRole, isSalesScopedRole, type PermissionKey, type Principal, type RoleKey } from './rbac.js';
import { WarehouseInventoryQueryService } from './warehouse/inventory/warehouse-inventory-query.service.js';

const PRICE_BOOK_FILE_IMPORT_MAX_BYTES = 30 * 1024 * 1024;
const SOUTH_AFRICA_RATE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const MOJIA_REQUEST_SAMPLE_RETENTION_MS = 72 * 60 * 60 * 1000;
const MOJIA_REQUEST_SAMPLE_MAX_BYTES = 16 * 1024;
const MOJIA_REQUEST_SAMPLE_MAX_PENDING_WRITES = 100;
const MOJIA_REQUEST_SAMPLE_WRITE_CONCURRENCY = 2;

@Controller()
export class DataController {
  constructor(
    @Inject(PrismaRepository) private readonly repository: PrismaRepository,
    @Inject(FinanceCatalogService) private readonly financeCatalogService: FinanceCatalogService,
    @Inject(WarehouseInventoryQueryService)
    private readonly warehouseInventoryQueries: WarehouseInventoryQueryService
  ) {}

  private readonly imageMimeExtensions: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  private readonly logger = new Logger(DataController.name);
  private readonly mojiaRequestSampleWriteQueue: Array<{
    run: () => void;
    drop: () => void;
    priority: boolean;
  }> = [];
  private mojiaRequestSampleActiveWrites = 0;
  private readonly labelFileMimeExtensions: Record<string, string> = {
    ...this.imageMimeExtensions,
    'application/pdf': '.pdf'
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
    if (await this.hasAnyPermission(principal.role, ['pricing:south-africa:cost-markup-view'])) return rule;
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

  private async ensureOrderEntryBusinessCostWritePermission(principal: Principal, input: OrderEntryCreateInput, method: 'POST' | 'PUT', path: string) {
    const hasBusinessCost = (input.businessCosts ?? []).some((row) => (
      Boolean(row.name?.trim()) || Number(row.amount ?? 0) > 0 || Number(row.unitPrice ?? 0) > 0
    ));
    const hasLegacyWrite = await this.repository.hasPermission(principal.role, 'business:order-entry:business-cost-write');
    const isMasked = !isAdministratorRole(principal.role)
      && await this.repository.hasPermission(principal.role, 'business:order-entry:business-cost-mask');
    const hasModuleWrite = await this.repository.hasPermission(principal.role, 'business:order-entry:view');
    if (!hasBusinessCost || (!isMasked && (hasLegacyWrite || hasModuleWrite || isAdministratorRole(principal.role)))) return;
    await this.repository.recordPermissionDenied(principal, { permissions: ['business:order-entry:business-cost-write'], method, path });
    throw new ForbiddenException('没有填写业务成本权限');
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

  private ensureMojiaDeviceToken(headers: Record<string, string | string[] | undefined>, queryToken?: string) {
    const expected = process.env.MOJIA_DEVICE_TOKEN?.trim();
    const headerValue = headers['x-device-token'];
    const actual = (Array.isArray(headerValue) ? headerValue[0] : headerValue)?.trim() || queryToken?.trim();
    if (!expected || actual !== expected) {
      throw new UnauthorizedException('设备 token 无效');
    }
  }

  private toWarehousePackageInput(body: MojiaMeasurementInput): WarehousePackageCreateInput {
    const barcode = String(body.barcode ?? body.orderNo ?? '').trim();
    const separatorIndex = barcode.search(/[-－—–]/);
    if (!barcode && !body.customerCode) {
      throw new BadRequestException('请填写条码');
    }
    const measuredAt = normalizeMojiaMeasuredAt(body.measuredAt);
    const deviceNo = String(body.deviceNo ?? body.machineNo ?? '').trim();
    const customerOrderNo = String(
      body.customerCode ?? (separatorIndex > 0 ? barcode.slice(0, separatorIndex) : '待补客户')
    ).trim();
    const parsedTrackingNo = separatorIndex > 0 ? barcode.slice(separatorIndex + 1).trim() : '';
    const providedTrackingNo = body.trackingNo !== undefined ? String(body.trackingNo).trim() : parsedTrackingNo;
    const domesticTrackingNo = providedTrackingNo || '待补充';
    const remark = deviceNo ? `设备号：${deviceNo}` : '';
    return {
      customerCode: customerOrderNo,
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
      expectedTotalPackageCount: positiveInt(body.expectedTotalPackageCount, 1),
      packageIndex: positiveInt(body.packageIndex, 1),
      packageCount: positiveInt(body.packageCount, 1),
      weightKg: positiveNumber(body.weightKg ?? body.weight, 'weight'),
      lengthCm: positiveNumber(body.lengthCm ?? body.length, 'length'),
      widthCm: positiveNumber(body.widthCm ?? body.width, 'width'),
      heightCm: positiveNumber(body.heightCm ?? body.height, 'height'),
      scanTime: measuredAt,
      scanSource: '墨家设备',
      remark: remark || undefined
    };
  }

  @Post('integrations/mojia/measurements')
  async receiveMojiaMeasurement(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('token') queryToken: string | undefined,
    @Body() body: MojiaMeasurementInput
  ) {
    this.ensureMojiaDeviceToken(headers, queryToken);
    const startedAt = Date.now();
    const measurement = body && typeof body === 'object' ? body : {};
    const sampleId = this.createMojiaRequestSample(measurement);
    try {
      const barcode = String(measurement.barcode ?? measurement.orderNo ?? '').trim();
      if (barcode) {
        const matched = await this.repository.applyWarehouseTallyMeasurementByBarcode(mojiaPrincipal, {
          barcode,
          weightKg: positiveNumber(measurement.weightKg ?? measurement.weight, 'weight'),
          lengthCm: positiveNumber(measurement.lengthCm ?? measurement.length, 'length'),
          widthCm: positiveNumber(measurement.widthCm ?? measurement.width, 'width'),
          heightCm: positiveNumber(measurement.heightCm ?? measurement.height, 'height'),
          measuredAt: normalizeMojiaMeasuredAt(measurement.measuredAt),
          deviceNo: String(measurement.deviceNo ?? measurement.machineNo ?? '').trim() || undefined
        });
        if (matched) {
          this.completeMojiaRequestSample(sampleId, 'SUCCESS', matched.package.id);
          return { result: 'true', message: `${matched.package.labelNo} ${matched.alreadyApplied ? '已接收' : '复测覆盖成功'}` };
        }
      }
      const input = this.toWarehousePackageInput(measurement);
      const duplicate = await this.findDuplicateMojiaPackage(input);
      if (duplicate) {
        this.completeMojiaRequestSample(sampleId, 'SUCCESS');
        return { result: 'true', message: `${duplicate.combinedOrderNo} 已接收` };
      }
      const created = await this.repository.createWarehousePackage(mojiaPrincipal, input);
      this.completeMojiaRequestSample(sampleId, 'SUCCESS', created.id);
      return { result: 'true', message: `${created.combinedOrderNo} 录入成功` };
    } catch (error) {
      const message = error instanceof Error ? error.message : '录入失败';
      this.completeMojiaRequestSample(sampleId, 'FAILED', undefined, message);
      await this.recordMojiaPushFailure(message, startedAt);
      return { result: 'false', message };
    }
  }

  private createMojiaRequestSample(body: MojiaMeasurementInput): Promise<string | undefined> {
    try {
      const receivedAt = new Date();
      const parsedPayload = sanitizeMojiaRequestSamplePayload(body as Record<string, unknown>);
      const serialized = JSON.stringify(parsedPayload);
      const originalBytes = Buffer.byteLength(serialized, 'utf8');
      const payload = originalBytes <= MOJIA_REQUEST_SAMPLE_MAX_BYTES
        ? parsedPayload
        : {
            _sampling: {
              omitted: true,
              reason: 'PAYLOAD_TOO_LARGE',
              originalBytes,
              fieldCount: Object.keys(parsedPayload).length,
              fieldNames: Object.keys(parsedPayload).slice(0, 20).map((field) => field.slice(0, 80))
            }
          };
      return this.enqueueMojiaRequestSampleWrite(() => this.repository.createMojiaRequestSample({
        deviceNo: String(body.deviceNo ?? body.machineNo ?? '').trim() || undefined,
        payload,
        payloadHash: createHash('sha256').update(serialized).digest('hex'),
        receivedAt,
        expiresAt: new Date(receivedAt.getTime() + MOJIA_REQUEST_SAMPLE_RETENTION_MS)
      }));
    } catch {
      this.logger.warn('墨家请求采样写入失败，业务接收继续执行');
      return Promise.resolve(undefined);
    }
  }

  private completeMojiaRequestSample(
    sampleId: Promise<string | undefined>,
    result: 'SUCCESS' | 'FAILED',
    warehousePackageId?: string,
    errorMessage?: string
  ) {
    void sampleId.then((resolvedSampleId) => {
      if (!resolvedSampleId) return;
      void this.enqueueMojiaRequestSampleWrite(async () => {
        await this.repository.completeMojiaRequestSample(resolvedSampleId, {
          result,
          warehousePackageId,
          errorMessage: errorMessage?.slice(0, 1000),
          completedAt: new Date()
        });
      }, true);
    });
  }

  private enqueueMojiaRequestSampleWrite<T>(task: () => Promise<T>, priority = false): Promise<T | undefined> {
    if (!priority && this.mojiaRequestSampleWriteQueue.length >= MOJIA_REQUEST_SAMPLE_MAX_PENDING_WRITES) {
      this.logger.warn('墨家请求采样队列已满，本次采样已丢弃');
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
      const queued = {
        priority,
        drop: () => resolve(undefined),
        run: () => {
          this.mojiaRequestSampleActiveWrites += 1;
          void task()
            .then(resolve)
            .catch(() => {
              this.logger.warn('墨家请求采样后台写入失败，业务接收结果不受影响');
              resolve(undefined);
            })
            .finally(() => {
              this.mojiaRequestSampleActiveWrites -= 1;
              this.drainMojiaRequestSampleWriteQueue();
            });
        }
      };
      if (priority) {
        if (this.mojiaRequestSampleWriteQueue.length >= MOJIA_REQUEST_SAMPLE_MAX_PENDING_WRITES) {
          let normalIndex = -1;
          for (let index = this.mojiaRequestSampleWriteQueue.length - 1; index >= 0; index -= 1) {
            if (!this.mojiaRequestSampleWriteQueue[index]?.priority) {
              normalIndex = index;
              break;
            }
          }
          if (normalIndex >= 0) this.mojiaRequestSampleWriteQueue.splice(normalIndex, 1)[0]?.drop();
        }
        this.mojiaRequestSampleWriteQueue.unshift(queued);
      } else {
        this.mojiaRequestSampleWriteQueue.push(queued);
      }
      this.drainMojiaRequestSampleWriteQueue();
    });
  }

  private drainMojiaRequestSampleWriteQueue() {
    while (
      this.mojiaRequestSampleActiveWrites < MOJIA_REQUEST_SAMPLE_WRITE_CONCURRENCY
      && this.mojiaRequestSampleWriteQueue.length > 0
    ) {
      this.mojiaRequestSampleWriteQueue.shift()?.run();
    }
  }

  private async recordMojiaPushFailure(message: string, startedAt: number) {
    await (this.repository as any).recordHttpAudit?.(mojiaPrincipal, {
      method: 'POST',
      path: '/api/integrations/mojia/measurements',
      result: 'FAILED',
      durationMs: Date.now() - startedAt,
      errorMessage: message
    }).catch(() => undefined);
  }

  private async findDuplicateMojiaPackage(input: WarehousePackageCreateInput) {
    return this.warehouseInventoryQueries.findDuplicateMojiaPackage(mojiaPrincipal, {
      combinedOrderNo: input.combinedOrderNo as string,
      scanTime: input.scanTime,
      remark: input.remark
    });
  }

  @Post('navigation/read-state')
  @RequirePermission('business:shipment:list')
  async markNavigationRead(@Req() request: { user: Principal }, @Body() input: NavigationReadStateInput) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不使用员工端导航角标');
    return this.repository.markNavigationRead(request.user, input);
  }

  @Get('shipments/review-pending')
  @RequirePermission('business:review:list')
  async reviewPendingShipments(@Req() request: { user: Principal }) {
    return this.repository.getReviewPendingShipments(request.user);
  }

  @Get('shipments/review-deleted')
  @RequirePermission('business:review:deleted-list')
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
  @RequirePermission('business:order-entry:create')
  async createOrderEntry(@Req() request: { user: Principal }, @Body() body: OrderEntryCreateInput) {
    ensureInternalOrderEntryScope(request.user);
    const followupPermission = body.submitForReview ? 'business:order-entry:submit-review' : 'business:order-entry:draft-save';
    if (!await this.repository.hasPermission(request.user.role, followupPermission)) {
      await this.repository.recordPermissionDenied(request.user, { permissions: [followupPermission], method: 'POST', path: '/api/shipments/order-entry' });
      throw new ForbiddenException(body.submitForReview ? '没有提交审核权限' : '没有保存草稿权限');
    }
    await this.ensureOrderEntryBusinessCostWritePermission(request.user, body, 'POST', '/api/shipments/order-entry');
    await this.repository.ensureOrderEntryInputAccess(request.user, body);
    await this.ensureOrderEntryFeeNamesEnabled(body);
    return this.repository.createOrderEntry(request.user, body);
  }

  @Put('shipments/:id/order-entry-draft')
  @RequirePermission('business:order-entry:draft-save')
  async updateOrderEntryDraft(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: OrderEntryDraftUpdateInput) {
    ensureInternalOrderEntryScope(request.user);
    if (body.submitForReview && !await this.repository.hasPermission(request.user.role, 'business:order-entry:submit-review')) {
      await this.repository.recordPermissionDenied(request.user, { permissions: ['business:order-entry:submit-review'], method: 'PUT', path: `/api/shipments/${id}/order-entry-draft` });
      throw new ForbiddenException('没有提交审核权限');
    }
    await this.ensureOrderEntryBusinessCostWritePermission(request.user, body, 'PUT', `/api/shipments/${id}/order-entry-draft`);
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
  @RequirePermission('business:review:detail')
  async shipmentReviewDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getShipmentReviewDetail(request.user, id);
  }

  @Get('shipments/:id/package-detail')
  @RequirePermission([
    'business:review:detail',
    'business:shipment:detail',
    'operations:line-shipment:detail',
    'warehouse:outbounded:detail-view'
  ])
  async shipmentPackageDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看内部单件货物明细');
    }
    return this.repository.getShipmentPackageDetail(request.user, id);
  }

  @Put('shipments/:id/review-basic')
  @RequirePermission('business:shipment:update-basic')
  async updateShipmentReviewBasic(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewBasicUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('当前角色不能修改待审核运单资料');
    }
    return this.repository.updateShipmentReviewBasic(request.user, id, body);
  }

  @Post('shipments/:id/review/approve')
  @RequirePermission('business:review:approve')
  async approveShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body?: { businessReview?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能审核运单');
    }
    return this.repository.approveShipmentReview(request.user, id, { businessReview: body?.businessReview === true });
  }

  @Post('shipments/:id/review/reject')
  @RequirePermission('business:review:reject')
  async rejectShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewRejectInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能驳回运单');
    }
    return this.repository.rejectShipmentReview(request.user, id, body);
  }

  @Post('shipments/:id/review/reverse')
  @RequirePermission('business:review:reverse')
  async reverseShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { reason?: string } = {}) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不能反审核运单');
    return this.repository.reverseShipmentReview(request.user, id, body);
  }

  @Delete('shipments/:id/review')
  @RequirePermission('business:review:delete')
  async deleteShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewDeleteInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    return this.repository.deleteShipmentReview(request.user, id, body);
  }

  @Post('shipments/:id/restore')
  @RequirePermission('business:review:restore')
  async restoreShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentRestoreInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能恢复运单');
    }
    return this.repository.restoreShipment(request.user, id, body);
  }

  @Delete('shipments/:id/review/permanent')
  @RequirePermission('business:review:purge')
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
  @RequirePermission('warehouse:today-receipt:update')
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

  @Post('shipments/:id/dispatch')
  @RequireAuth()
  async dispatchShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentDispatchInput) {
    await this.ensurePermission(request.user, 'warehouse:dispatch-pending:dispatch-confirm');
    if (body.batchDispatchSource) {
      await this.ensurePermission(request.user, 'warehouse:dispatch-pending:batch-dispatch-confirm');
    }
    if (body.shippingMarkConfirmed) {
      await this.ensurePermission(request.user, 'warehouse:dispatch-pending:shipping-mark-confirm');
    }
    return this.repository.dispatchShipment(request.user, id, body);
  }

  @Post('warehouse/handover/print')
  @RequirePermission('warehouse:dispatch-pending:handover-print')
  async printWarehouseHandover(@Req() request: { user: Principal }, @Body() body: WarehouseHandoverPrintInput) {
    return this.repository.printWarehouseHandover(request.user, body);
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

  @Post('shipments/:id/business-data/approve')
  @RequirePermission('customer-service:data-confirm:business-approve')
  async approveShipmentBusinessData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReviewInput) {
    return this.repository.approveShipmentBusinessData(request.user, id, body);
  }

  @Post('shipments/:id/agent-data/approve')
  @RequirePermission('customer-service:data-confirm:agent-approve')
  async approveShipmentAgentData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReviewInput) {
    return this.repository.approveShipmentAgentData(request.user, id, body);
  }

  @Patch('shipments/:id/business-data')
  @RequirePermission('customer-service:data-confirm:business-update')
  async updateShipmentBusinessData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataUpdateInput) {
    return this.repository.updateShipmentBusinessData(request.user, id, body);
  }

  @Get('shipments/:id/customer-service/cost-preview')
  @RequirePermission(['customer-service:data-confirm:business-update', 'customer-service:data-confirm:agent-update'])
  async customerServiceCostPreview(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Query('kind') kind?: string
  ): Promise<CustomerServiceFinanceUpdatePreview> {
    if (kind !== undefined && kind !== 'business' && kind !== 'agent') throw new BadRequestException('费用预览类型无效');
    return this.repository.getCustomerServiceFinanceUpdatePreview(request.user, id, kind === 'agent' ? 'agent' : 'business');
  }

  @Put('shipments/:id/customer-service/finance-items/:feeId')
  @RequirePermission(['customer-service:data-confirm:business-update', 'customer-service:data-confirm:agent-update'])
  async updateCustomerServiceFinanceItem(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('feeId') feeId: string,
    @Query('kind') kind: string,
    @Body() body: CustomerServiceFinanceItemUpdateInput
  ): Promise<CustomerServiceFinanceUpdatePreviewRow> {
    if (kind !== 'business' && kind !== 'agent') throw new BadRequestException('费用修改类型无效');
    return this.repository.updateCustomerServiceFinanceItem(request.user, id, feeId, kind, body);
  }

  @Patch('shipments/:id/agent-data')
  @RequirePermission('customer-service:data-confirm:agent-update')
  async updateShipmentAgentData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataUpdateInput) {
    return this.repository.updateShipmentAgentData(request.user, id, body);
  }

  @Post('shipments/:id/business-data/reverse')
  @RequirePermission('customer-service:data-confirm:reverse')
  async reverseShipmentBusinessData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReverseInput) {
    return this.repository.reverseShipmentBusinessData(request.user, id, body);
  }

  @Post('shipments/:id/agent-data/reverse')
  @RequirePermission('customer-service:data-confirm:reverse')
  async reverseShipmentAgentData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReverseInput) {
    return this.repository.reverseShipmentAgentData(request.user, id, body);
  }

  @Post('shipments/:id/data-confirmation/approve-all')
  @RequirePermission('customer-service:data-confirm:approve-all')
  async approveShipmentAllData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReviewInput) {
    return this.repository.approveShipmentAllData(request.user, id, body);
  }

  @Post('shipments/:id/data-confirmation/reverse-all')
  @RequirePermission('customer-service:data-confirm:reverse')
  async reverseShipmentAllData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReverseInput) {
    return this.repository.reverseShipmentAllData(request.user, id, body);
  }

  @Patch('shipments/:id/operational')
  @RequireAuth()
  async updateShipmentOperational(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentOperationalUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能人工修改运单');
    }
    const actionPermissions: PermissionKey[] = body.status === 'DEPARTED'
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
                : body.trackingWebsite !== undefined
                  ? ['customer-service:waiting-departure:update-tracking-website', 'customer-service:departed:update-tracking-website', 'customer-service:arrived-port:update-tracking-website']
                  : ['customer-service:waiting-departure:update-info', 'customer-service:departed:update-info', 'customer-service:arrived-port:update-info', 'customer-service:delivering:update-info'];
    await this.ensureAnyPermission(request.user, actionPermissions);
    return this.repository.updateShipmentOperational(request.user, id, body);
  }

  @Patch('operations/line-shipments/:id/operational')
  @RequirePermission('operations:line-shipment:status-update')
  async updateOperationShipmentOperational(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentOperationalUpdateInput) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不能人工修改运单');
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
    return this.repository.customerServiceShipments(request.user);
  }

  @Get('customer-service/data-confirm-shipments')
  @RequirePermission('customer-service:data-confirm:view')
  async customerServiceDataConfirmShipments(@Req() request: { user: Principal }, @Query() query: CustomerServiceDataConfirmListQuery) {
    return this.repository.customerServiceDataConfirmShipmentsPage(request.user, query);
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

  @Post('shipments/tracking-events/import')
  @RequireAuth()
  async importTrackingEvents(@Req() request: { user: Principal }, @Body() body: BulkTrackingApplyRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能批量导入轨迹');
    }
    await this.ensurePermission(request.user, 'tracking:external:import-confirm');
    await this.ensurePermission(request.user, 'tracking:external:overwrite');
    return this.repository.importTrackingEvents(request.user, body);
  }

  @Delete('shipments/:id')
  @RequirePermission('business:shipment:delete')
  async deleteShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    return this.repository.deleteShipment(request.user, id);
  }

  @Post('shipments/:id/labels')
  @RequirePermission('warehouse:dispatch-pending:label-generate')
  async createShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能申请面单');
    }
    return this.repository.createShipmentLabel(request.user, id);
  }

  @Post('shipments/:id/labels/upload')
  @RequireAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadShipmentLabel(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Body() body: { transferNo?: string }
  ) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能上传面单');
    }
    await this.ensureAnyPermission(request.user, ['business:order-entry:label-upload', 'customer-service:transfer:label-upload', 'customer-service:waiting-departure:label-upload']);
    if (!file) throw new BadRequestException('请上传面单');
    this.assertShipmentLabelFile(file);
    const uploadRoot = resolveUploadRoot();
    const uploadDir = process.env.LABEL_UPLOAD_DIR ?? join(uploadRoot, 'labels');
    await mkdir(uploadDir, { recursive: true });
    const extension = this.labelFileMimeExtensions[file.mimetype];
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    await writeFile(join(uploadDir, fileName), file.buffer);
    return this.repository.uploadShipmentLabel(request.user, id, {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: `/api/uploads/${basename(uploadDir)}/${fileName}`,
      transferNo: body.transferNo
    });
  }

  @Post('shipments/:id/invoice/upload')
  @RequirePermission('business:order-entry:invoice-upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadShipmentBusinessInvoice(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能上传业务发票');
    }
    if (!file) throw new BadRequestException('请上传业务发票');
    this.assertExcelFile(file);
    const uploadRoot = resolveUploadRoot();
    const uploadDir = join(uploadRoot, 'business-invoices');
    await mkdir(uploadDir, { recursive: true });
    const extension = extname(file.originalname).toLowerCase();
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    await writeFile(join(uploadDir, fileName), file.buffer);
    return this.repository.uploadShipmentBusinessInvoice(request.user, id, {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: `/api/uploads/${basename(uploadDir)}/${fileName}`
    });
  }

  @Get('shipments/:id/invoice-template/download')
  @RequirePermission('business:order-entry:invoice-upload')
  async downloadShipmentInvoiceTemplate(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Query('templateId') templateId: string | undefined,
    @Query('templateSlot') templateSlot: string | undefined,
    @Res({ passthrough: true }) response: Response
  ) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能下载代理发票模板');
    }
    let resolvedTemplateId = templateId?.trim() || undefined;
    if (!resolvedTemplateId && templateSlot !== undefined) {
      const slot = Number(templateSlot);
      if (slot !== 1 && slot !== 2 && slot !== 3) {
        throw new BadRequestException('发票模板序号必须为 1、2 或 3');
      }
      resolvedTemplateId = `legacy-${slot}`;
    }
    const file = await this.repository.downloadShipmentInvoiceTemplate(request.user, id, resolvedTemplateId);
    const mimeType = file.extension === '.xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const downloadName = `发票模板${file.extension}`;
    response.setHeader('Content-Type', mimeType);
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `attachment; filename="invoice-template${file.extension}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.buffer);
  }

  @Get('shipments/:id/invoice/download')
  @RequirePermission('business:order-entry:invoice-upload')
  async downloadShipmentBusinessInvoice(@Req() request: { user: Principal }, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不能下载业务发票');
    const file = await this.repository.downloadShipmentBusinessInvoice(request.user, id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `attachment; filename="business-invoice${extname(file.fileName)}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.buffer);
  }

  @Get('shipments/:id/labels/:labelId/file')
  @RequireAuth()
  async downloadShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string, @Param('labelId') labelId: string, @Res({ passthrough: true }) response: Response) {
    if (request.user.role === 'CUSTOMER') throw new ForbiddenException('客户不能下载内部面单');
    await this.ensureAnyPermission(request.user, ['warehouse:dispatch-pending:label-view', 'customer-service:transfer:label-view']);
    const file = await this.repository.downloadShipmentLabel(request.user, id, labelId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `attachment; filename="shipment-label${extname(file.fileName)}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.buffer);
  }

  @Post('shipments/:id/labels/:labelId/void')
  @RequirePermission('warehouse:dispatch-pending:label-void')
  async voidShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string, @Param('labelId') labelId: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能作废面单');
    }
    return this.repository.voidShipmentLabel(request.user, id, labelId);
  }

  @Post('carrier-tasks/:id/run')
  @RequirePermission('tracking:carrier-task:run')
  async runCarrierTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { fail?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能执行承运商任务');
    }
    return this.repository.runCarrierTask(request.user, id, body);
  }

  @Post('carrier-tasks/:id/retry')
  @RequirePermission('tracking:carrier-task:retry')
  async retryCarrierTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { fail?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能重试承运商任务');
    }
    return this.repository.retryCarrierTask(request.user, id, body);
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
    'business:order-entry:business-cost-view',
    'business:order-entry:business-cost-write',
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
    return this.repository.getShipmentFinanceDetail(request.user, id);
  }

  @Post('shipments/:id/receivable-adjustments')
  @RequirePermission('finance:receivable:update')
  async addReceivableAdjustment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ReceivableAdjustmentInput) {
    return this.repository.addReceivableAdjustment(request.user, id, body);
  }

  @Post('shipments/:id/finance-items')
  @RequirePermission('business:order-fee:create')
  async createShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentFinanceItemCreateInput) {
    return this.repository.createShipmentFinanceItem(request.user, id, body);
  }

  @Put('shipments/:id/finance-items/:feeId')
  @RequirePermission('business:order-fee:update')
  async updateShipmentFinanceItem(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('feeId') feeId: string,
    @Body() body: ShipmentFinanceItemUpdateInput
  ) {
    return this.repository.updateShipmentFinanceItem(request.user, id, feeId, body);
  }

  @Delete('shipments/:id/finance-items/:feeId')
  @RequirePermission('business:order-fee:delete')
  async deleteShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Param('feeId') feeId: string) {
    return this.repository.deleteShipmentFinanceItem(request.user, id, feeId);
  }

  @Post('shipments/:id/review-business-costs')
  @RequirePermission(['business:order-entry:business-cost-write', 'business:order-entry:view'])
  async createPendingReviewBusinessCost(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentFinanceItemCreateInput) {
    return this.repository.createPendingReviewBusinessCost(request.user, id, body);
  }

  @Put('shipments/:id/review-business-costs/:feeId')
  @RequirePermission(['business:order-entry:business-cost-write', 'business:order-entry:view'])
  async updatePendingReviewBusinessCost(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('feeId') feeId: string,
    @Body() body: ShipmentFinanceItemUpdateInput
  ) {
    return this.repository.updatePendingReviewBusinessCost(request.user, id, feeId, body);
  }

  @Delete('shipments/:id/review-business-costs/:feeId')
  @RequirePermission(['business:order-entry:business-cost-write', 'business:order-entry:view'])
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

  @Post('shipments/:id/tracking-events')
  @RequirePermission('tracking:external:single-add')
  async addTrackingEvent(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: TrackingEventInput) {
    return this.repository.addTrackingEvent(request.user, id, body);
  }

  @Post('operations/line-shipments/:id/tracking-events')
  @RequirePermission('operations:line-shipment:tracking-add')
  async addOperationTrackingEvent(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: TrackingEventInput) {
    return this.repository.addTrackingEvent(request.user, id, body);
  }

  @Get('customer-service/problem-tags')
  @RequireAuth()
  async problemTicketCommonTags(@Req() request: { user: Principal }) {
    await this.ensureAnyPermission(request.user, ['customer-service:problem:view', 'customer-service:problem:create', 'customer-service:pending-routing:problem-create', 'customer-service:waiting-departure:problem-create', 'customer-service:departed:problem-create', 'customer-service:arrived-port:problem-create', 'customer-service:delivering:problem-create', 'customer-service:delivering:after-sale-create', 'customer-service:signed:after-sale-create', 'operations:line-shipment:problem-create', 'business:shipment:problem-create']);
    return this.repository.getProblemTicketCommonTags(request.user);
  }

  @Post('customer-service/problem-tags')
  @RequirePermission('customer-service:problem:tag-manage')
  async createProblemTicketCommonTag(@Req() request: { user: Principal }, @Body() body: CommonTagCreateInput) {
    return this.repository.createProblemTicketCommonTag(request.user, body);
  }

  @Put('customer-service/problem-tags/:id')
  @RequirePermission('customer-service:problem:tag-manage')
  async updateProblemTicketCommonTag(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CommonTagUpdateInput) {
    return this.repository.updateProblemTicketCommonTag(request.user, id, body);
  }

  @Delete('customer-service/problem-tags/:id')
  @RequirePermission('customer-service:problem:tag-manage')
  async deleteProblemTicketCommonTag(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteProblemTicketCommonTag(request.user, id);
  }

  @Post('shipments/:id/problem-tickets')
  @RequireAuth()
  async createProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    await this.ensureAnyPermission(request.user, ['customer-service:problem:create', 'customer-service:pending-routing:problem-create', 'customer-service:waiting-departure:problem-create', 'customer-service:departed:problem-create', 'customer-service:arrived-port:problem-create', 'customer-service:delivering:problem-create', 'customer-service:delivering:after-sale-create', 'customer-service:signed:after-sale-create']);
    await this.repository.assertCustomerServiceProblemCreationAllowed(request.user, id);
    return this.repository.createProblemTicket(request.user, id, body);
  }

  @Post('business/shipments/:id/problem-tickets')
  @RequirePermission('business:shipment:problem-create')
  async createBusinessProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    return this.repository.createProblemTicket(request.user, id, { ...body, customerVisible: true, pushToSales: undefined });
  }

  @Post('operations/line-shipments/:id/problem-tickets')
  @RequirePermission('operations:line-shipment:problem-create')
  async createOperationProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    return this.repository.createProblemTicket(request.user, id, { ...body, customerVisible: false, pushToSales: undefined });
  }

  @Post('problem-tickets/:id/replies')
  @RequirePermission('customer-service:problem:reply')
  async replyProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { message?: string }) {
    return this.repository.replyProblemTicket(request.user, id, body.message ?? '');
  }

  @Post('problem-tickets/:id/close')
  @RequirePermission('customer-service:problem:close')
  async closeProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.repository.closeProblemTicket(request.user, id, body.reason);
  }

  @Post('problem-tickets/:id/assist')
  @RequirePermission('customer-service:problem:assist')
  async assistProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.repository.assistProblemTicket(request.user, id, body.reason ?? '需要协助处理');
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
    const snapshot = await this.repository.getMasterData();
    const canReadCustomers = await this.hasAnyPermission(request.user.role, ['master-data:customers:read']);
    const canReadFinanceCatalog = await this.hasAnyPermission(request.user.role, ['master-data:finance:read']);
    const canReadAgents = await this.repository.hasPermission(request.user.role, 'master-data:agents:read');
    const canReadAgentChannels = await this.hasAnyPermission(request.user.role, ['master-data:agent-channels:read']);
    const canReadChannels = await this.repository.hasPermission(request.user.role, 'master-data:channels:read');
    const canReadChannelCategories = await this.hasAnyPermission(request.user.role, ['master-data:channel-categories:read']);
    const canReadExchangeRates = await this.hasAnyPermission(request.user.role, ['master-data:exchange-rates:read']);
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

  @Get('system/roles')
  @RequirePermission(['system:user-groups:read', 'system:role-permissions:read'])
  async systemRoles() {
    return this.repository.getRolePermissionMatrix();
  }

  @Post('system/roles')
  @RequirePermission('system:user-groups:create')
  async createSystemRole(@Req() request: { user: Principal }, @Body() body: RoleGroupInput) {
    return this.repository.createRoleGroup(request.user, body);
  }

  @Put('system/roles/:role')
  @RequirePermission('system:user-groups:update')
  async updateSystemRole(@Req() request: { user: Principal }, @Param('role') role: RoleKey, @Body() body: RoleGroupInput) {
    return this.repository.updateRoleGroup(request.user, role, body);
  }

  @Put('system/roles/:role/enabled')
  @RequirePermission('system:user-groups:enable')
  async updateSystemRoleEnabled(@Req() request: { user: Principal }, @Param('role') role: RoleKey, @Body() body: EnabledUpdateInput) {
    return this.repository.updateRoleGroupEnabled(request.user, role, body);
  }

  @Delete('system/roles/:role')
  @RequirePermission('system:user-groups:delete')
  async deleteSystemRole(@Req() request: { user: Principal }, @Param('role') role: RoleKey) {
    return this.repository.deleteRoleGroup(request.user, role);
  }

  @Get('system/staff-accounts')
  @RequirePermission('system:accounts:read')
  async systemStaffAccounts(@Req() request: { user: Principal }, @Query() query: StaffAccountQuery) {
    return this.repository.getStaffAccounts(request.user, query);
  }

  @Post('system/sites')
  @RequirePermission('system:sites:create')
  async createSystemSite(@Req() request: { user: Principal }, @Body() body: SiteCreateInput) {
    return this.repository.createSite(request.user, body);
  }

  @Put('system/sites/:id')
  @RequirePermission('system:sites:update')
  async updateSystemSite(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: SiteUpdateInput) {
    return this.repository.updateSite(request.user, id, body);
  }

  @Put('system/sites/:id/enabled')
  @RequirePermission('system:sites:enable')
  async updateSystemSiteEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateSiteEnabled(request.user, id, body);
  }

  @Post('system/staff-accounts')
  @RequirePermission('system:accounts:create')
  async createSystemStaffAccount(@Req() request: { user: Principal }, @Body() body: StaffAccountCreateInput) {
    return this.repository.createStaffAccount(request.user, body);
  }

  @Put('system/staff-accounts/:id/enabled')
  @RequirePermission('system:accounts:enable')
  async updateSystemStaffAccountEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateStaffAccountEnabled(request.user, id, body);
  }

  @Put('system/staff-accounts/:id')
  @RequirePermission('system:accounts:update-profile')
  async updateSystemStaffAccount(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: StaffAccountUpdateInput) {
    if (body.role) await this.ensurePermission(request.user, 'system:accounts:update-role');
    if (body.site !== undefined) await this.ensurePermission(request.user, 'system:accounts:update-site');
    if (body.enabled !== undefined) await this.ensurePermission(request.user, 'system:accounts:enable');
    if (body.password !== undefined) await this.ensurePermission(request.user, 'system:accounts:reset-password');
    // 部门调整当前复用账号资料维护权限；部门不联动用户组或站点。
    return this.repository.updateStaffAccount(request.user, id, body);
  }

  @Delete('system/staff-accounts/:id')
  @RequirePermission('system:accounts:delete')
  async deleteSystemStaffAccount(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteStaffAccount(request.user, id);
  }

  @Post('system/staff-accounts/reset-passwords')
  @RequirePermission('system:accounts:reset-password')
  async resetSystemStaffAccountPasswords(@Req() request: { user: Principal }, @Body() body: StaffAccountPasswordResetInput) {
    return this.repository.resetStaffAccountPasswords(request.user, body);
  }

  @Put('system/staff-accounts/:id/site')
  @RequirePermission('system:accounts:update-site')
  async updateSystemStaffAccountSite(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { site?: string }
  ) {
    return this.repository.updateStaffAccountSite(request.user, id, body);
  }

  @Put('system/roles/:role/permissions')
  @RequirePermission('system:role-permissions:save')
  async updateRolePermissions(
    @Req() request: { user: Principal },
    @Param('role') role: RoleKey,
    @Body() body: { permissions?: PermissionKey[] }
  ) {
    return this.repository.updateRolePermissions(request.user, role, body.permissions ?? []);
  }

  @Put('system/roles/:role/permissions/copy')
  @RequirePermission('system:role-permissions:copy-role')
  async copyRolePermissions(
    @Req() request: { user: Principal },
    @Param('role') role: RoleKey,
    @Body() body: { sourceRoleKey?: RoleKey }
  ) {
    return this.repository.copyRolePermissions(request.user, role, body.sourceRoleKey);
  }

  @Get('system/audit-logs')
  @RequirePermission('system:audit:read')
  async systemAuditLogs(@Req() request: { user: Principal }, @Query() query: AuditLogQuery) {
    return this.repository.getAuditLogs(request.user, query);
  }

  @Post('pricing/quote')
  @RequirePermission('pricing:lookup:view')
  quote(@Req() request: { user: Principal }, @Body() body: PricingQuoteRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
    }
    return this.repository.quote(body);
  }

  @Get('pricing/books/rule-refresh-progress')
  @RequirePermission('pricing:price-books:sync-health-view')
  async priceBookRuleRefreshProgress(@Req() request: { user: Principal }) {
    return this.repository.getPriceBookRuleRefreshProgress(request.user);
  }

  @Get('pricing/book-rows')
  @RequirePermission('pricing:price-books:rows-view')
  async priceBookRows(@Req() request: { user: Principal }, @Query() query: PriceBookRowsQuery) {
    return this.repository.getPriceBookRows(request.user, undefined, query);
  }

  @Get('pricing/books/:id/rows')
  @RequirePermission('pricing:price-books:rows-view')
  async priceBookRowsByBook(@Req() request: { user: Principal }, @Param('id') id: string, @Query() query: PriceBookRowsQuery) {
    return this.repository.getPriceBookRows(request.user, id, query);
  }

  @Get('pricing/books/:id/markup-routes')
  @RequirePermission('pricing:markup-tier:read')
  async markupRoutesByBook(@Req() request: { user: Principal }, @Param('id') id: string, @Query() query: MarkupRouteListQuery) {
    return this.repository.getMarkupRoutes(request.user, id, query);
  }

  @Get('pricing/books/:id/download')
  @RequirePermission('pricing:price-books:rows-view')
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
  @RequirePermission('pricing:price-books:cleanup-original-agents')
  async cleanupOldOriginalAgents(@Req() request: { user: Principal }, @Body() body: { dryRun?: boolean }) {
    return this.repository.cleanupOldOriginalAgentData(request.user, { dryRun: body?.dryRun !== false });
  }

  @Post('pricing/lookup')
  @RequirePermission('pricing:lookup:view')
  async priceLookup(@Req() request: { user: Principal }, @Body() body: PriceLookupRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
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
  @RequirePermission('pricing:dubai-display:markup-view')
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
  @RequirePermission(['pricing:lookup:dubai-image-view', 'pricing:dubai-display:active-view'])
  async legacyDubaiAirSeaDisplayPageImage(@Req() request: { user: Principal }, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.repository.getDubaiPriceDisplayPageImage(request.user, id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', `inline; filename="dubai-price-${id}.png"`);
    return new StreamableFile(file.buffer);
  }

  @Get('pricing/legacy/dubai-air-sea/display-versions/:versionId/pages/:pageId/image')
  @RequirePermission('pricing:dubai-display:versions-view')
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
  @RequirePermission('pricing:dubai-display:activate')
  async activateLegacyDubaiAirSeaDisplayVersion(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: DubaiPriceDisplayActivateInput) {
    return this.repository.activateDubaiPriceDisplayVersion(request.user, id, body);
  }

  @Post('pricing/legacy/dubai-air-sea/display-versions/:id/retry')
  @RequirePermission('pricing:dubai-display:retry')
  async retryLegacyDubaiAirSeaDisplayVersion(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.retryDubaiPriceDisplayVersion(request.user, id);
  }

  @Post('pricing/legacy/dubai-air-sea/display-versions/:id/sea-markup')
  @RequirePermission('pricing:dubai-display:markup-update')
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
  @RequirePermission('pricing:south-africa:rules-read')
  async southAfricaRateRules(@Req() request: { user: Principal }) {
    const response = await this.repository.getSouthAfricaRateRules(request.user);
    const canViewCostMarkup = await this.hasAnyPermission(request.user.role, ['pricing:south-africa:cost-markup-view']);
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
  @RequirePermission('pricing:south-africa:rules-create')
  async createSouthAfricaRateRule(@Req() request: { user: Principal }, @Body() body: SouthAfricaRateRuleInput) {
    return this.sanitizeSouthAfricaRateRuleForPrincipal(request.user, await this.repository.createSouthAfricaRateRule(request.user, body));
  }

  @Put('pricing/south-africa/rules/:id')
  @RequirePermission('pricing:south-africa:rules-update')
  async updateSouthAfricaRateRule(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: SouthAfricaRateRuleInput) {
    return this.sanitizeSouthAfricaRateRuleForPrincipal(request.user, await this.repository.updateSouthAfricaRateRule(request.user, id, body));
  }

  @Patch('pricing/south-africa/rules/:id/enabled')
  @RequirePermission('pricing:south-africa:rules-enable')
  async updateSouthAfricaRateRuleEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { enabled?: boolean }) {
    return this.sanitizeSouthAfricaRateRuleForPrincipal(request.user, await this.repository.updateSouthAfricaRateRuleEnabled(request.user, id, body));
  }

  @Delete('pricing/south-africa/rules/:id')
  @RequirePermission('pricing:south-africa:rules-delete')
  async deleteSouthAfricaRateRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.sanitizeSouthAfricaRateRuleForPrincipal(request.user, await this.repository.deleteSouthAfricaRateRule(request.user, id));
  }

  @Post('pricing/south-africa/images')
  @RequirePermission('pricing:south-africa:image-upload')
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
  @RequirePermission('pricing:price-books:legacy-source-import')
  async importLegacyPricingSource(@Req() request: { user: Principal }, @Body() body: LegacyPricingImportInput) {
    return this.repository.importLegacyPricingSource(request.user, body);
  }

  @Delete('pricing/legacy/sources/:id')
  @RequirePermission('pricing:price-books:legacy-source-delete')
  async deleteLegacyPricingSource(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteLegacyPricingSource(request.user, id);
  }

  @Post('pricing/legacy/rebuild')
  @RequirePermission('pricing:price-books:legacy-rebuild')
  async rebuildLegacyPricing(@Req() request: { user: Principal }, @Body() body: { module?: LegacyPricingModule }) {
    return this.repository.rebuildLegacyPricing(request.user, body.module);
  }

  @Get('pricing/markup-rules')
  @RequirePermission('pricing:markup:read')
  async agentMarkupRules(@Req() request: { user: Principal }, @Query() query: AgentMarkupListQuery) {
    return this.repository.getAgentMarkupRules(request.user, query);
  }

  @Get('pricing/markup-rules/export')
  @RequirePermission('pricing:markup:export')
  async exportAgentMarkupRules(@Req() request: { user: Principal }, @Query() query: AgentMarkupListQuery) {
    return this.repository.exportAgentMarkupRules(request.user, query);
  }

  @Post('pricing/markup-rules/import')
  @RequirePermission('pricing:markup:import')
  async importAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { rows?: AgentMarkupCreateInput[] }) {
    return this.repository.importAgentMarkupRules(request.user, body);
  }

  @Post('pricing/markup-rules/batch-upsert')
  @RequirePermission('pricing:markup:batch-upsert')
  async batchUpsertAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { rows?: AgentMarkupCreateInput[] }) {
    return this.repository.batchUpsertAgentMarkupRules(request.user, body);
  }

  @Post('pricing/markup-rules/batch-status')
  @RequirePermission('pricing:markup:batch-enable')
  async batchUpdateAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { ids?: string[]; agentNames?: string[]; scopes?: Array<{ agentName?: string; priceBookId?: string; legacyModule?: LegacyPricingModule }>; enabled?: boolean }) {
    return this.repository.batchUpdateAgentMarkupRules(request.user, body);
  }

  @Post('pricing/markup-rules/batch-delete')
  @RequirePermission('pricing:markup:batch-delete')
  async batchDeleteAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { ids?: string[]; agentNames?: string[]; scopes?: Array<{ agentName?: string; priceBookId?: string; legacyModule?: LegacyPricingModule }> }) {
    return this.repository.batchDeleteAgentMarkupRules(request.user, body);
  }

  @Get('pricing/markup-rules/:id/preview')
  @RequirePermission('pricing:markup:preview')
  async previewAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.previewAgentMarkupRule(request.user, id);
  }

  @Post('pricing/markup-rules/route-preview')
  @RequirePermission('pricing:markup-tier:read')
  async previewMarkupRoute(@Req() request: { user: Principal }, @Body() body: MarkupRoutePreviewInput) {
    return this.repository.previewMarkupRoute(request.user, body);
  }

  @Post('pricing/markup-rules/route-preview/batch')
  @RequirePermission('pricing:markup-tier:read')
  async previewMarkupRoutesBatch(@Req() request: { user: Principal }, @Body() body: MarkupRoutePreviewBatchInput) {
    return this.repository.previewMarkupRoutesBatch(request.user, body);
  }

  @Post('pricing/markup-rules/route-tiers')
  @RequirePermission('pricing:markup-tier:update')
  async replaceMarkupRouteTiers(@Req() request: { user: Principal }, @Body() body: MarkupRouteTierReplaceInput) {
    return this.repository.replaceMarkupRouteTiers(request.user, body);
  }

  @Post('pricing/markup-rules/route-tiers/batch')
  @RequirePermission('pricing:markup-tier:update')
  async replaceMarkupRouteTiersBatch(@Req() request: { user: Principal }, @Body() body: MarkupRouteTierBatchReplaceInput) {
    return this.repository.replaceMarkupRouteTiersBatch(request.user, body);
  }

  @Post('pricing/markup-rules/migrate-pricebook-scopes')
  @RequirePermission('pricing:markup:update')
  async migrateLegacyMarkupRouteScopes(@Req() request: { user: Principal }) {
    return this.repository.migrateLegacyMarkupRouteScopes(request.user);
  }

  @Post('pricing/markup-rules')
  @RequirePermission('pricing:markup:default-create')
  async createAgentMarkupRule(@Req() request: { user: Principal }, @Body() body: AgentMarkupCreateInput) {
    return this.repository.createAgentMarkupRule(request.user, body);
  }

  @Put('pricing/markup-rules/:id')
  @RequirePermission('pricing:markup:update')
  async updateAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentMarkupUpdateInput) {
    return this.repository.updateAgentMarkupRule(request.user, id, body);
  }

  @Delete('pricing/markup-rules/:id')
  @RequirePermission('pricing:markup:delete')
  async deleteAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteAgentMarkupRule(request.user, id);
  }

  @Post('pricing/books/import')
  @RequirePermission('pricing:price-books:import')
  async importPriceBook(@Req() request: { user: Principal }, @Body() body: PriceBookImportInput, @Query('returnRows') returnRows?: string) {
    return this.repository.importPriceBook(request.user, body, { returnRows: false });
  }

  @Post('pricing/books/import-jobs')
  @RequirePermission('pricing:price-books:upload')
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
  @RequirePermission('pricing:price-books:upload')
  async retryPriceBookImportJob(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.retryPriceBookImportJob(request.user, id);
  }

  @Put('pricing/books/:id/remark')
  @RequirePermission('pricing:price-books:remark-update')
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
  @RequirePermission('pricing:markup-tier:read')
  async pricingRules(@Req() request: { user: Principal }) {
    return this.repository.getPricingRules(request.user);
  }

  @Post('pricing/rules')
  @RequirePermission('pricing:markup-tier:create')
  async createPricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleCreateInput) {
    return this.repository.createPricingRule(request.user, body);
  }

  @Put('pricing/rules/:id/enabled')
  @RequirePermission('pricing:markup-tier:enable')
  async updatePricingRuleEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updatePricingRuleEnabled(request.user, id, body);
  }

  @Post('pricing/rules/quote')
  @RequirePermission('pricing:lookup:view')
  async quotePricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleQuoteRequest) {
    return this.repository.quotePricingRule(request.user, body);
  }

  @Get('warehouse/rent-details')
  @RequirePermission('warehouse:rent-detail:view')
  async warehouseRentDetails(@Req() request: { user: Principal }, @Query() query: WarehouseRentDetailQuery) {
    return this.repository.getWarehouseRentDetails(request.user, query);
  }

  @Get('warehouse/rent-details/export')
  @RequirePermission('warehouse:rent-detail:export')
  async exportWarehouseRentDetails(@Req() request: { user: Principal }, @Query() query: WarehouseRentDetailQuery) {
    return this.repository.exportWarehouseRentDetails(request.user, query);
  }

  @Get('warehouse/rent-rules')
  @RequirePermission('warehouse:rent-rule:view')
  async warehouseRentRules(@Req() request: { user: Principal }) {
    return this.repository.getWarehouseRentRules(request.user);
  }

  @Post('warehouse/rent-rules')
  @RequirePermission('warehouse:rent-rule:manage')
  async createWarehouseRentRule(@Req() request: { user: Principal }, @Body() body: WarehouseRentRuleInput) {
    return this.repository.createWarehouseRentRule(request.user, body);
  }

  @Put('warehouse/rent-rules/:id')
  @RequirePermission('warehouse:rent-rule:manage')
  async updateWarehouseRentRule(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseRentRuleInput
  ) {
    return this.repository.updateWarehouseRentRule(request.user, id, body);
  }

  @Delete('warehouse/rent-rules/:id')
  @RequirePermission('warehouse:rent-rule:manage')
  async deleteWarehouseRentRule(
    @Req() request: { user: Principal },
    @Param('id') id: string
  ) {
    return this.repository.deleteWarehouseRentRule(request.user, id);
  }

  @Put('warehouse/rent-rules/:id/enabled')
  @RequirePermission('warehouse:rent-rule:manage')
  async updateWarehouseRentRuleEnabled(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseRentRuleEnabledInput
  ) {
    return this.repository.updateWarehouseRentRuleEnabled(request.user, id, body);
  }

  @Post('warehouse/packages/machine-import')
  @RequirePermission('warehouse:in-stock:machine-import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async warehouseMachineImport(
    @Req() request: { user: Principal },
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Body('commit') commit?: string
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('请上传机器过机 Excel 文件');
    const normalizedFile = { ...file, originalname: normalizeUploadedFileName(file.originalname) };
    this.assertExcelFile(normalizedFile);
    const parsed = parseWarehouseMachineWorkbook(normalizedFile.buffer, normalizedFile.originalname);
    if (String(commit).toLowerCase() === 'true') {
      return this.repository.importWarehouseMachineImport(request.user, parsed, {
        fileHash: createHash('sha256').update(normalizedFile.buffer).digest('hex')
      });
    }
    return this.repository.previewWarehouseMachineImport(request.user, parsed);
  }

  @Post('warehouse/packages')
  @RequirePermission('warehouse:today-receipt:manual-create')
  async createWarehousePackage(@Req() request: { user: Principal }, @Body() body: WarehousePackageCreateInput) {
    await this.repository.assertWarehouseManualReceiptCustomer(request.user, body.customerCode);
    return this.repository.createWarehousePackage(request.user, body);
  }

  @Post('warehouse/packages/manual-receipt')
  @RequirePermission('warehouse:today-receipt:manual-create')
  async createWarehouseManualReceipt(@Req() request: { user: Principal }, @Body() body: WarehouseManualReceiptCreateInput) {
    await this.repository.assertWarehouseManualReceiptCustomer(request.user, body.customerCode);
    return this.repository.createWarehouseManualReceipt(request.user, body);
  }

  @Post('warehouse/packages/:id/same-spec-replenish')
  @RequirePermission('warehouse:in-stock:same-spec-replenish')
  async replenishWarehouseSameSpec(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehouseSameSpecReplenishInput) {
    return this.repository.replenishWarehouseSameSpec(request.user, id, body);
  }

  @Post('warehouse/packages/:id/split')
  @RequirePermission('warehouse:in-stock:split')
  async splitWarehousePackage(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehousePackageSplitInput) {
    return this.repository.splitWarehousePackage(request.user, id, body);
  }

  @Patch('warehouse/packages/:id')
  @RequirePermission('warehouse:in-stock:update')
  async updateWarehousePackage(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehousePackageUpdateInput) {
    return this.repository.updateWarehousePackage(request.user, id, body);
  }

  @Put('warehouse/packages/:id/remark')
  @RequirePermission('warehouse:in-stock:update')
  async updateWarehousePackageRemark(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { remark?: string }) {
    return this.repository.updateWarehousePackageRemark(request.user, id, body);
  }

  @Patch('warehouse/packages/:id/exception')
  @RequirePermission('warehouse:in-stock:update')
  async updateWarehousePackageException(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { manualException?: string }) {
    return this.repository.updateWarehousePackageException(request.user, id, body);
  }

  @Post('warehouse/consolidations')
  @RequireAuth()
  async createWarehouseConsolidation(@Req() request: { user: Principal }, @Body() body: WarehouseConsolidationCreateInput) {
    await this.ensurePermission(request.user, body.mode === 'MERGE_AND_SHIP' ? 'warehouse:tally-pending:merge-and-ship' : 'warehouse:tally-pending:merge-only');
    return this.repository.createWarehouseConsolidation(request.user, body);
  }

  @Post('warehouse/consolidations/:id/create-shipment')
  @RequirePermission('warehouse:tally-pending:merge-and-ship')
  async createWarehouseConsolidationShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.createShipmentFromWarehouseConsolidation(request.user, id);
  }

  @Get('warehouse/tally-repeat-statistics')
  @RequirePermission('warehouse:tally-completed:view')
  async warehouseTallyRepeatStatistics(
    @Req() request: { user: Principal },
    @Query() query: WarehouseTallyRepeatStatisticsQuery
  ) {
    return this.repository.getWarehouseTallyRepeatStatistics(request.user, query);
  }

  @Post('warehouse/tally-tasks')
  @RequirePermission('warehouse:tally-pending:task-create')
  async createWarehouseTallyTask(@Req() request: { user: Principal }, @Body() body: WarehouseTallyTaskCreateInput) {
    return this.repository.createWarehouseTallyTask(request.user, body);
  }

  @Patch('warehouse/tally-tasks/:id')
  @RequirePermission('warehouse:tally-pending:task-update')
  async updateWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehouseTallyTaskUpdateInput) {
    return this.repository.updateWarehouseTallyTask(request.user, id, body);
  }

  @Post('warehouse/tally-tasks/:id/cancel')
  @RequirePermission('warehouse:tally-pending:task-cancel')
  async cancelWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.cancelWarehouseTallyTask(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/complete')
  @RequirePermission('warehouse:tally-pending:task-process')
  async completeWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehouseTallyTaskCompleteInput) {
    return this.repository.completeWarehouseTallyTask(request.user, id, body);
  }

  @Patch('warehouse/tally-tasks/:id/completed-count')
  @RequireAuth()
  async updateCompletedWarehouseTallyTaskCount(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseTallyTaskCompletedCountUpdateInput
  ) {
    return this.repository.updateCompletedWarehouseTallyTaskCount(request.user, id, body);
  }

  @Post('warehouse/tally-tasks/:id/reverse-review')
  @RequirePermission('warehouse:tally-completed:reverse-review')
  async reverseReviewWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.reverseReviewWarehouseTallyTask(request.user, id);
  }

  @Get('warehouse/tally-tasks/:id/historical-aggregate-correction')
  @RequirePermission('warehouse:tally-history:correct')
  async warehouseTallyHistoricalAggregateCorrectionPreview(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getWarehouseTallyHistoricalAggregateCorrectionPreview(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/historical-aggregate-correction')
  @RequirePermission('warehouse:tally-history:correct')
  async correctWarehouseTallyHistoricalAggregate(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: WarehouseTallyHistoricalAggregateCorrectionInput
  ) {
    return this.repository.correctWarehouseTallyHistoricalAggregate(request.user, id, body);
  }

  @Post('warehouse/tally-tasks/:id/label')
  @RequirePermission('warehouse:tally-label:generate')
  async generateWarehouseTallyTaskLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.generateWarehouseTallyTaskLabel(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/label/print')
  @RequirePermission(['warehouse:tally-label:print', 'warehouse:tally-label:reprint'])
  async printWarehouseTallyTaskLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.printWarehouseTallyTaskLabel(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/label/download')
  @RequirePermission('warehouse:tally-label:download')
  async downloadWarehouseTallyTaskLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.downloadWarehouseTallyTaskLabel(request.user, id);
  }

  @Post('warehouse/tally-tasks/label-scan')
  @RequirePermission('warehouse:tally-label:scan-apply')
  async applyWarehouseTallyTaskLabel(@Req() request: { user: Principal }, @Body() body: WarehouseTallyLabelScanInput) {
    return this.repository.applyWarehouseTallyTaskLabel(request.user, body);
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
  async createPaymentApplications(@Req() request: { user: Principal }, @Body() body: PaymentApplicationCreateInput) {
    return this.repository.createPaymentApplications(request.user, body);
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
    const context = body.context;
    if (!context) throw new BadRequestException('缺少凭证类型');
    this.assertVoucherImage(normalizedFile);
    const requiredPermission: PermissionKey = context === 'WATER_RECEIPT'
      ? 'finance:water-receipt:voucher-upload'
      : context === 'PAID_PAYMENT_RECEIPT'
        ? 'finance:paid-payment:voucher-upload'
        : context === 'PENDING_PAYMENT_BILL'
          ? 'finance:pending-payment:bill-voucher-upload'
          : 'finance:pending-payment:payment-voucher-upload';
    await this.ensurePermission(request.user, requiredPermission);
    if (context === 'PENDING_PAYMENT_BILL' && !body.pendingPaymentId) throw new BadRequestException('缺少待付款记录');
    if (context === 'PAYMENT_APPLICATION_BILL' && !body.paymentApplicationId) throw new BadRequestException('缺少付款申请');
    if (context === 'PAID_PAYMENT_RECEIPT' && !body.paymentApplicationId) throw new BadRequestException('缺少付款申请');
    if (context === 'WATER_RECEIPT' && !body.waterReceiptId) throw new BadRequestException('缺少水单');
    if (context === 'WATER_RECEIPT' && body.waterReceiptId) {
      await this.repository.assertWaterReceiptVoucherUploadAccess(request.user, body.waterReceiptId);
    }
    if (context === 'PENDING_PAYMENT_BILL' && body.pendingPaymentId) {
      await this.repository.assertPendingPaymentVoucherUploadAccess(
        request.user,
        body.pendingPaymentId,
        'finance:pending-payment:bill-voucher-upload'
      );
    }
    if (context === 'PAYMENT_APPLICATION_BILL' && body.paymentApplicationId) {
      await this.repository.assertPaymentApplicationVoucherUploadAccess(
        request.user,
        body.paymentApplicationId,
        'finance:pending-payment:payment-voucher-upload'
      );
    }

    const uploadDir = resolveUploadDirectory('vouchers');
    await mkdir(uploadDir.dir, { recursive: true });
    const extension = this.imageMimeExtensions[normalizedFile.mimetype];
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    const filePath = join(uploadDir.dir, fileName);
    await writeFile(filePath, normalizedFile.buffer);

    const url = `${uploadDir.publicPath}/${fileName}`;
    const input: PaymentVoucherInput = {
      fileName: normalizedFile.originalname,
      mimeType: normalizedFile.mimetype,
      sizeBytes: normalizedFile.size,
      url
    };

    if (context === 'PENDING_PAYMENT_BILL') {
      const pendingPaymentId = body.pendingPaymentId;
      if (!pendingPaymentId) throw new BadRequestException('缺少待付款记录');
      try {
        return await this.repository.addPaymentVoucher(
          request.user,
          { ...input, pendingPaymentId, voucherType: 'BILL' },
          'finance:pending-payment:bill-voucher-upload'
        );
      } catch (error) {
        await unlink(filePath).catch(() => undefined);
        throw error;
      }
    }
    if (context === 'PAYMENT_APPLICATION_BILL') {
      const paymentApplicationId = body.paymentApplicationId;
      if (!paymentApplicationId) throw new BadRequestException('缺少付款申请');
      try {
        return await this.repository.addPaymentVoucher(
          request.user,
          { ...input, paymentApplicationId, voucherType: 'BILL' },
          'finance:pending-payment:payment-voucher-upload'
        );
      } catch (error) {
        await unlink(filePath).catch(() => undefined);
        throw error;
      }
    }
    if (context === 'PAID_PAYMENT_RECEIPT') {
      const paymentApplicationId = body.paymentApplicationId;
      if (!paymentApplicationId) throw new BadRequestException('缺少付款申请');
      return this.repository.addPaymentWaterReceipt(request.user, { ...input, paymentApplicationId, voucherType: 'PAYMENT_RECEIPT' });
    }
    if (context === 'WATER_RECEIPT') {
      const waterReceiptId = body.waterReceiptId;
      if (!waterReceiptId) throw new BadRequestException('缺少水单');
      try {
        return await this.repository.uploadWaterReceiptVoucher(request.user, waterReceiptId, input);
      } catch (error) {
        await unlink(filePath).catch(() => undefined);
        throw error;
      }
    }
    throw new BadRequestException('不支持的凭证类型');
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

  private assertShipmentLabelFile(file: { mimetype: string; originalname: string; buffer: Buffer }) {
    if (!this.labelFileMimeExtensions[file.mimetype]) {
      throw new BadRequestException('仅支持图片或 PDF 面单');
    }
    if (file.mimetype === 'application/pdf') {
      if (extname(file.originalname).toLowerCase() !== '.pdf' || file.buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
        throw new BadRequestException('PDF 面单内容格式无效');
      }
      return;
    }
    this.assertVoucherImage(file);
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

function hasSalesOwnDataScope(principal: Principal): boolean {
  return principal.dataScope === 'SALES_OWN'
    || (isSalesScopedRole(principal.role) && principal.role !== 'UG_MARKET');
}

function sanitizeMojiaRequestSamplePayload(value: Record<string, unknown>): Record<string, unknown> {
  return sanitizeMojiaRequestSampleValue(value, 0) as Record<string, unknown>;
}

function sanitizeMojiaRequestSampleValue(value: unknown, depth: number): unknown {
  if (!value || typeof value !== 'object') return value;
  if (depth >= 8) return '[OMITTED_MAX_DEPTH]';
  if (Array.isArray(value)) return value.map((item) => sanitizeMojiaRequestSampleValue(item, depth + 1));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
    key,
    isMojiaRequestSampleSensitiveKey(key)
      ? '[REDACTED]'
      : sanitizeMojiaRequestSampleValue(child, depth + 1)
  ]));
}

function isMojiaRequestSampleSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return /密码|令牌|密钥|签名|口令|凭证/.test(key)
    || normalized === 'auth'
    || normalized === 'jwt'
    || normalized === 'bearer'
    || normalized.includes('authorization')
    || normalized.endsWith('token')
    || normalized.endsWith('password')
    || normalized.endsWith('passwd')
    || normalized.endsWith('pwd')
    || normalized.endsWith('secret')
    || normalized.endsWith('credential')
    || normalized.endsWith('cookie')
    || normalized.endsWith('apikey')
    || normalized.endsWith('accesskey')
    || normalized.endsWith('privatekey')
    || normalized.endsWith('sessionid')
    || normalized.endsWith('sessionkey')
    || normalized.endsWith('signature')
    || normalized === 'sign';
}

type MojiaMeasurementInput = {
  orderNo?: unknown;
  barcode?: unknown;
  customerCode?: unknown;
  trackingNo?: unknown;
  length?: unknown;
  width?: unknown;
  height?: unknown;
  weight?: unknown;
  lengthCm?: unknown;
  widthCm?: unknown;
  heightCm?: unknown;
  weightKg?: unknown;
  packageCount?: unknown;
  packageIndex?: unknown;
  expectedTotalPackageCount?: unknown;
  measuredAt?: unknown;
  machineNo?: unknown;
  deviceNo?: unknown;
};

const mojiaPrincipal: Principal = {
  id: 'system-mojia-device',
  username: 'mojia-device',
  role: 'WAREHOUSE',
  name: '墨家设备'
};

function positiveNumber(value: unknown, field: string): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new BadRequestException(`${field} 必须是大于 0 的数字`);
  }
  return numberValue;
}

function positiveInt(value: unknown, fallback: number): number {
  const numberValue = Math.floor(Number(value) || fallback);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function normalizeMojiaMeasuredAt(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const numeric = Number(raw);
  const normalizedRaw = raw.replace(/^(\d{4})[./](\d{1,2})[./](\d{1,2})[ T/](\d{1,2}:\d{1,2}(?::\d{1,2})?)$/, '$1-$2-$3 $4');
  const date = Number.isFinite(numeric)
    ? new Date(raw.length <= 10 ? numeric * 1000 : numeric)
    : new Date(normalizedRaw);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setMilliseconds(0);
  return date.toISOString();
}
function ensureInternalOrderEntryScope(principal: Principal) {
  if (principal.role === 'CUSTOMER') throw new ForbiddenException('当前角色不能使用内部录单');
  if (principal.shipmentAllView || principal.dataScope === 'SALES_OWN' || principal.departmentTeamScope?.length) return;
  throw new ForbiddenException('当前岗位未配置录单数据范围');
}

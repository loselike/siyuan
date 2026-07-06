import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Inject, Param, Patch, Post, Put, Query, Req, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  AgentCreateInput,
  AgentChannelCreateInput,
  AgentChannelUpdateInput,
  AgentMarkupCreateInput,
  AgentMarkupListQuery,
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
  ChannelCategoryCreateInput,
  ChannelCategoryUpdateInput,
  ChannelUpdateInput,
  CustomerStatementCreateInput,
  CustomerContactCreateInput,
  CustomerContactUpdateInput,
  CustomerCreateInput,
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
  PriceBookRemarkUpdateInput,
  PriceLookupRequest,
  PricingQuoteRequest,
  PricingRuleCreateInput,
  PricingRuleQuoteRequest,
  ProblemTicketCreateInput,
  ReceivableAdjustmentInput,
  SurchargeCreateInput,
  RoleGroupInput,
  BulkTrackingApplyRequest,
  ShipmentCreateInput,
  LineShipmentPoolQuery,
  ShipmentFinanceItemCreateInput,
  ShipmentFinanceItemUpdateInput,
  ShipmentImportRequest,
  ShipmentOperationalUpdateInput,
  ShipmentPaymentUpdateInput,
  ShipmentRerouteInput,
  ShipmentRouteInput,
  ShipmentRestoreInput,
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
  WarehouseInStockQuery,
  WarehousePackageCreateInput,
  WarehousePackageSplitInput,
  WarehousePackageUpdateInput,
  WarehouseTallyTaskCompleteInput,
  WarehouseTallyTaskCreateInput,
  WarehouseTallyTaskListQuery,
  WarehouseTallyTaskUpdateInput,
  WarehouseTodayQuery,
  MasterDataSnapshot
} from '@siyuan/shared';
import { PrismaRepository } from './prisma.repository.js';
import { RequirePermission } from './require-permission.decorator.js';
import { type PermissionKey, type Principal, type RoleKey } from './rbac.js';

@Controller()
export class DataController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  private readonly imageMimeExtensions: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  private readonly labelFileMimeExtensions: Record<string, string> = {
    ...this.imageMimeExtensions,
    'application/pdf': '.pdf'
  };
  private readonly excelMimeExtensions: Record<string, string> = {
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/octet-stream': ''
  };

  private async hasAnyPermission(role: RoleKey, permissions: PermissionKey[]) {
    const checks = await Promise.all(permissions.map((permission) => this.repository.hasPermission(role, permission)));
    return checks.some(Boolean);
  }

  private scopeMasterDataCustomers(principal: Principal, snapshot: MasterDataSnapshot): MasterDataSnapshot {
    if (!isSalesScopedRole(principal.role)) return snapshot;
    const scope = new Set([principal.username, principal.name, principal.nickname, 'operator', '业务员'].filter((value): value is string => Boolean(value)));
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
    if (separatorIndex <= 0) {
      throw new BadRequestException('orderNo 必须是 客户编号-快递单号');
    }
    const customerOrderNo = String(body.customerCode ?? barcode.slice(0, separatorIndex)).trim();
    const domesticTrackingNo = String(body.trackingNo ?? barcode.slice(separatorIndex + 1)).trim();
    const measuredAt = typeof body.measuredAt === 'string' ? body.measuredAt.trim() : undefined;
    const deviceNo = String(body.deviceNo ?? body.machineNo ?? '').trim();
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
      scanTime: measuredAt || undefined,
      scanSource: '墨家设备',
      remark: deviceNo ? `设备号：${deviceNo}` : undefined
    };
  }

  @Get('health')
  health() {
    return { ok: true, service: 'siyuan-api' };
  }

  @Post('integrations/mojia/measurements')
  async receiveMojiaMeasurement(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('token') queryToken: string | undefined,
    @Body() body: MojiaMeasurementInput
  ) {
    this.ensureMojiaDeviceToken(headers, queryToken);
    try {
      const input = this.toWarehousePackageInput(body);
      const duplicate = await this.findDuplicateMojiaPackage(input);
      if (duplicate) {
        return { result: 'true', message: `${duplicate.combinedOrderNo} 已接收` };
      }
      const created = await this.repository.createWarehousePackage(mojiaPrincipal, input);
      return { result: 'true', message: `${created.combinedOrderNo} 录入成功` };
    } catch (error) {
      return { result: 'false', message: error instanceof Error ? error.message : '录入失败' };
    }
  }

  private async findDuplicateMojiaPackage(input: WarehousePackageCreateInput) {
    const combinedOrderNo = input.combinedOrderNo;
    const scanTime = input.scanTime ? new Date(input.scanTime).getTime() : undefined;
    const packages = await this.repository.getWarehousePackages(mojiaPrincipal);
    return packages.find((pkg) =>
      pkg.combinedOrderNo === combinedOrderNo
      && pkg.scanSource === '墨家设备'
      && (!scanTime || (pkg.scanTime && new Date(pkg.scanTime).getTime() === scanTime))
      && (!input.remark || pkg.remark === input.remark)
    );
  }

  @Get('shipments')
  @RequirePermission('orders:read')
  async shipments(@Req() request: { user: Principal }) {
    return this.repository.getShipments(request.user);
  }

  @Get('operations/line-shipments')
  @RequirePermission('orders:read')
  async lineShipments(@Req() request: { user: Principal }, @Query() query: LineShipmentPoolQuery) {
    return this.repository.getLineShipmentPool(request.user, query);
  }

  @Get('shipments/status-counts')
  @RequirePermission('orders:read')
  async shipmentStatusCounts(@Req() request: { user: Principal }) {
    return this.repository.getShipmentStatusCounts(request.user);
  }

  @Get('shipments/review-pending')
  @RequirePermission('orders:read')
  async reviewPendingShipments(@Req() request: { user: Principal }) {
    return this.repository.getReviewPendingShipments(request.user);
  }

  @Get('shipments/review-deleted')
  @RequirePermission('orders:review:restore')
  async reviewDeletedShipments(@Req() request: { user: Principal }) {
    return this.repository.getReviewDeletedShipments(request.user);
  }

  @Get('shipments/order-entry/packages')
  @RequirePermission('orders:read')
  async orderEntryPackages(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER' || request.user.role === 'WAREHOUSE') {
      throw new ForbiddenException('当前角色不能使用内部录单');
    }
    return this.repository.getOrderEntryWarehousePackages(request.user);
  }

  @Post('shipments/order-entry')
  @RequirePermission('orders:read')
  async createOrderEntry(@Req() request: { user: Principal }, @Body() body: OrderEntryCreateInput) {
    if (request.user.role === 'CUSTOMER' || request.user.role === 'WAREHOUSE') {
      throw new ForbiddenException('当前角色不能使用内部录单');
    }
    return this.repository.createOrderEntry(request.user, body);
  }

  @Get('shipments/:id/order-entry')
  @RequirePermission('orders:read')
  async orderEntryDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER' || request.user.role === 'WAREHOUSE') {
      throw new ForbiddenException('当前角色不能使用内部录单');
    }
    return this.repository.getOrderEntryDetail(request.user, id);
  }

  @Put('shipments/:id/order-entry-draft')
  @RequirePermission('orders:read')
  async updateOrderEntryDraft(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: OrderEntryDraftUpdateInput) {
    if (request.user.role === 'CUSTOMER' || request.user.role === 'WAREHOUSE') {
      throw new ForbiddenException('当前角色不能使用内部录单');
    }
    return this.repository.updateOrderEntryDraft(request.user, id, body);
  }

  @Get('shipments/:id/review-detail')
  @RequirePermission('orders:read')
  async shipmentReviewDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getShipmentReviewDetail(request.user, id);
  }

  @Post('shipments/:id/review/approve')
  @RequirePermission(['orders:write', 'finance:settle'])
  async approveShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body?: { businessReview?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能审核运单');
    }
    return this.repository.approveShipmentReview(request.user, id, { businessReview: body?.businessReview === true });
  }

  @Post('shipments/:id/review/reject')
  @RequirePermission(['orders:write', 'finance:settle'])
  async rejectShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewRejectInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能驳回运单');
    }
    return this.repository.rejectShipmentReview(request.user, id, body);
  }

  @Delete('shipments/:id/review')
  @RequirePermission('orders:write')
  async deleteShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentReviewDeleteInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    return this.repository.deleteShipmentReview(request.user, id, body);
  }

  @Post('shipments/:id/restore')
  @RequirePermission('orders:review:restore')
  async restoreShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentRestoreInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能恢复运单');
    }
    return this.repository.restoreShipment(request.user, id, body);
  }

  @Delete('shipments/:id/review/permanent')
  @RequirePermission('orders:review:purge')
  async permanentlyDeleteShipmentReview(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.permanentlyDeleteShipmentReview(request.user, id);
  }

  @Post('shipments')
  @RequirePermission('orders:write')
  async createShipment(@Req() request: { user: Principal }, @Body() body: ShipmentCreateInput) {
    return this.repository.createShipment(request.user, body);
  }

  @Post('shipments/import')
  @RequirePermission('orders:write')
  async importShipments(@Req() request: { user: Principal }, @Body() body: ShipmentImportRequest) {
    return this.repository.importShipments(request.user, body);
  }

  @Post('shipments/:id/receive')
  @RequirePermission('warehouse:write')
  async receiveShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.receiveShipment(request.user, id);
  }

  @Post('shipments/:id/route')
  @RequirePermission('routing:write')
  async routeShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentRouteInput) {
    return this.repository.routeShipment(request.user, id, body);
  }

  @Post('shipments/:id/reroute')
  @RequirePermission('routing:write')
  async rerouteShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentRerouteInput) {
    return this.repository.rerouteShipment(request.user, id, body);
  }

  @Post('shipments/:id/dispatch')
  @RequirePermission('warehouse:write')
  async dispatchShipment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentDispatchInput) {
    return this.repository.dispatchShipment(request.user, id, body);
  }

  @Post('master-data/agent-invoice-template/upload')
  @RequirePermission('master-data:write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadAgentInvoiceTemplate(
    @Req() request: { user: Principal },
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined
  ) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能上传代理发票模板');
    }
    if (!file) throw new BadRequestException('请上传代理发票模板');
    this.assertExcelFile(file);
    const uploadRoot = process.env.UPLOAD_DIR
      ? join(process.env.UPLOAD_DIR, '..')
      : process.env.NODE_ENV === 'production'
        ? '/app/uploads'
        : join(process.cwd(), 'uploads');
    const uploadDir = join(uploadRoot, 'invoice-templates');
    await mkdir(uploadDir, { recursive: true });
    const extension = extname(file.originalname).toLowerCase();
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    await writeFile(join(uploadDir, fileName), file.buffer);
    return {
      fileName: file.originalname,
      url: `/api/uploads/${basename(uploadDir)}/${fileName}`
    };
  }

  @Post('shipments/:id/business-data/approve')
  @RequirePermission('orders:write')
  async approveShipmentBusinessData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { remark?: string }) {
    return this.repository.approveShipmentBusinessData(request.user, id, body);
  }

  @Post('shipments/:id/agent-data/approve')
  @RequirePermission('orders:write')
  async approveShipmentAgentData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { remark?: string }) {
    return this.repository.approveShipmentAgentData(request.user, id, body);
  }

  @Patch('shipments/:id/operational')
  @RequirePermission('orders:write')
  async updateShipmentOperational(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentOperationalUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能人工修改运单');
    }
    return this.repository.updateShipmentOperational(request.user, id, body);
  }

  @Post('shipments/:id/payment')
  @RequirePermission('orders:write')
  async registerShipmentPayment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentPaymentUpdateInput) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能登记收款');
    }
    return this.repository.registerShipmentPayment(request.user, id, body);
  }

  @Post('shipments/tracking-events/import')
  @RequirePermission('tracking:write')
  async importTrackingEvents(@Req() request: { user: Principal }, @Body() body: BulkTrackingApplyRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能批量导入轨迹');
    }
    return this.repository.importTrackingEvents(request.user, body);
  }

  @Delete('shipments/:id')
  @RequirePermission('orders:write')
  async deleteShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能删除运单');
    }
    return this.repository.deleteShipment(request.user, id);
  }

  @Post('shipments/:id/labels')
  @RequirePermission('warehouse:write')
  async createShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能申请面单');
    }
    return this.repository.createShipmentLabel(request.user, id);
  }

  @Post('shipments/:id/labels/upload')
  @RequirePermission('orders:write')
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
    if (!file) throw new BadRequestException('请上传面单');
    this.assertShipmentLabelFile(file);
    const uploadRoot = process.env.UPLOAD_DIR
      ? join(process.env.UPLOAD_DIR, '..')
      : process.env.NODE_ENV === 'production'
        ? '/app/uploads'
        : join(process.cwd(), 'uploads');
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
  @RequirePermission('orders:write')
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
    const uploadRoot = process.env.UPLOAD_DIR
      ? join(process.env.UPLOAD_DIR, '..')
      : process.env.NODE_ENV === 'production'
        ? '/app/uploads'
        : join(process.cwd(), 'uploads');
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

  @Get('shipments/:id/labels')
  @RequirePermission('warehouse:read')
  async shipmentLabels(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看内部面单');
    }
    return this.repository.getShipmentLabels(request.user, id);
  }

  @Post('shipments/:id/labels/:labelId/void')
  @RequirePermission('warehouse:write')
  async voidShipmentLabel(@Req() request: { user: Principal }, @Param('id') id: string, @Param('labelId') labelId: string) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能作废面单');
    }
    return this.repository.voidShipmentLabel(request.user, id, labelId);
  }

  @Get('carrier-tasks')
  @RequirePermission('tracking:read')
  async carrierTasks(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能查看承运商任务');
    }
    return this.repository.getCarrierTasks(request.user);
  }

  @Post('carrier-tasks/:id/run')
  @RequirePermission('tracking:write')
  async runCarrierTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { fail?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能执行承运商任务');
    }
    return this.repository.runCarrierTask(request.user, id, body);
  }

  @Post('carrier-tasks/:id/retry')
  @RequirePermission('tracking:write')
  async retryCarrierTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { fail?: boolean }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能重试承运商任务');
    }
    return this.repository.retryCarrierTask(request.user, id, body);
  }

  @Post('shipments/:id/fees/generate')
  @RequirePermission('finance:settle')
  async generateShipmentFees(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { baseRatePerKg: number; payableRatePerKg: number; fuelRate: number; surcharges?: Array<{ name: string; amount: number }> }
  ) {
    return this.repository.generateShipmentFees(request.user, id, body);
  }

  @Get('shipments/:id/finance-detail')
  @RequirePermission('orders:read')
  async getShipmentFinanceDetail(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getShipmentFinanceDetail(request.user, id);
  }

  @Post('shipments/:id/receivable-adjustments')
  @RequirePermission('finance:settle')
  async addReceivableAdjustment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ReceivableAdjustmentInput) {
    return this.repository.addReceivableAdjustment(request.user, id, body);
  }

  @Post('shipments/:id/finance-items')
  @RequirePermission('orders:read')
  async createShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ShipmentFinanceItemCreateInput) {
    return this.repository.createShipmentFinanceItem(request.user, id, body);
  }

  @Put('shipments/:id/finance-items/:feeId')
  @RequirePermission('orders:read')
  async updateShipmentFinanceItem(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('feeId') feeId: string,
    @Body() body: ShipmentFinanceItemUpdateInput
  ) {
    return this.repository.updateShipmentFinanceItem(request.user, id, feeId, body);
  }

  @Delete('shipments/:id/finance-items/:feeId')
  @RequirePermission('orders:read')
  async deleteShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Param('feeId') feeId: string) {
    return this.repository.deleteShipmentFinanceItem(request.user, id, feeId);
  }

  @Post('shipments/:id/finance-items/:feeId/lock')
  @RequirePermission('orders:read')
  async lockShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Param('feeId') feeId: string) {
    return this.repository.lockShipmentFinanceItem(request.user, id, feeId);
  }

  @Post('shipments/:id/finance-items/:feeId/unlock')
  @RequirePermission('orders:read')
  async unlockShipmentFinanceItem(@Req() request: { user: Principal }, @Param('id') id: string, @Param('feeId') feeId: string) {
    return this.repository.unlockShipmentFinanceItem(request.user, id, feeId);
  }

  @Post('shipments/:id/tracking-events')
  @RequirePermission('tracking:write')
  async addTrackingEvent(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: TrackingEventInput) {
    return this.repository.addTrackingEvent(request.user, id, body);
  }

  @Get('problem-tickets')
  @RequirePermission('problems:read')
  async problemTickets(@Req() request: { user: Principal }) {
    return this.repository.getProblemTickets(request.user);
  }

  @Post('shipments/:id/problem-tickets')
  @RequirePermission('problems:write')
  async createProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ProblemTicketCreateInput) {
    return this.repository.createProblemTicket(request.user, id, body);
  }

  @Post('problem-tickets/:id/replies')
  @RequirePermission('problems:write')
  async replyProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { message?: string }) {
    return this.repository.replyProblemTicket(request.user, id, body.message ?? '');
  }

  @Post('problem-tickets/:id/close')
  @RequirePermission('problems:write')
  async closeProblemTicket(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.closeProblemTicket(request.user, id);
  }

  @Get('master-data')
  @RequirePermission([
    'master-data:read',
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
    const canReadCustomers = await this.hasAnyPermission(request.user.role, ['master-data:read', 'master-data:customers:read']);
    const canReadFinanceCatalog = await this.hasAnyPermission(request.user.role, ['master-data:read', 'master-data:finance:read']);
    const canReadAgents = await this.repository.hasPermission(request.user.role, 'master-data:agents:read');
    const canReadAgentChannels = await this.hasAnyPermission(request.user.role, ['master-data:agents:read', 'master-data:agent-channels:read']);
    const canReadChannels = await this.repository.hasPermission(request.user.role, 'master-data:channels:read');
    const canReadChannelCategories = await this.hasAnyPermission(request.user.role, ['master-data:channels:read', 'master-data:channel-categories:read']);
    const canReadExchangeRates = await this.hasAnyPermission(request.user.role, ['master-data:read', 'master-data:exchange-rates:read']);
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
  @RequirePermission(['master-data:read', 'master-data:customers:read'])
  async masterDataCustomers(@Req() request: { user: Principal }) {
    return this.scopeMasterDataCustomers(request.user, await this.repository.getMasterData()).customers;
  }

  @Post('master-data/customers')
  @RequirePermission(['master-data:write', 'master-data:customers:write'])
  async createMasterDataCustomer(@Req() request: { user: Principal }, @Body() body: CustomerCreateInput) {
    return this.repository.createCustomer(request.user, body);
  }

  @Put('master-data/customers/:id')
  @RequirePermission(['master-data:write', 'master-data:customers:write'])
  async updateMasterDataCustomer(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerUpdateInput) {
    return this.repository.updateCustomer(request.user, id, body);
  }

  @Post('master-data/customers/:id/contacts')
  @RequirePermission(['master-data:write', 'master-data:customers:write'])
  async createMasterDataCustomerContact(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerContactCreateInput) {
    return this.repository.createCustomerContact(request.user, id, body);
  }

  @Put('master-data/customers/:id/contacts/:contactId')
  @RequirePermission(['master-data:write', 'master-data:customers:write'])
  async updateMasterDataCustomerContact(@Req() request: { user: Principal }, @Param('id') id: string, @Param('contactId') contactId: string, @Body() body: CustomerContactUpdateInput) {
    return this.repository.updateCustomerContact(request.user, id, contactId, body);
  }

  @Post('master-data/customers/:id/users')
  @RequirePermission(['master-data:write', 'master-data:customers:write'])
  async createMasterDataCustomerUser(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerUserCreateInput) {
    return this.repository.createCustomerUser(request.user, id, body);
  }

  @Put('master-data/customers/:id/enabled')
  @RequirePermission(['master-data:write', 'master-data:customers:write'])
  async updateMasterDataCustomerEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateCustomerEnabled(request.user, id, body);
  }

  @Delete('master-data/customers/:id')
  @RequirePermission(['master-data:write', 'master-data:customers:write'])
  async deleteMasterDataCustomer(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteCustomer(request.user, id);
  }

  @Get('master-data/agents')
  @RequirePermission('master-data:agents:read')
  async masterDataAgents() {
    return (await this.repository.getMasterData()).agents;
  }

  @Post('master-data/agents')
  @RequirePermission('master-data:agents:write')
  async createMasterDataAgent(@Req() request: { user: Principal }, @Body() body: AgentCreateInput) {
    return this.repository.createAgent(request.user, body);
  }

  @Put('master-data/agents/:id')
  @RequirePermission('master-data:agents:write')
  async updateMasterDataAgent(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentUpdateInput) {
    return this.repository.updateAgent(request.user, id, body);
  }

  @Put('master-data/agents/:id/enabled')
  @RequirePermission('master-data:agents:write')
  async updateMasterDataAgentEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateAgentEnabled(request.user, id, body);
  }

  @Get('master-data/agent-channels')
  @RequirePermission(['master-data:agents:read', 'master-data:agent-channels:read'])
  async masterDataAgentChannels() {
    return (await this.repository.getMasterData()).agentChannels;
  }

  @Post('master-data/agent-channels')
  @RequirePermission(['master-data:agents:write', 'master-data:agent-channels:write'])
  async createMasterDataAgentChannel(@Req() request: { user: Principal }, @Body() body: AgentChannelCreateInput) {
    return this.repository.createAgentChannel(request.user, body);
  }

  @Put('master-data/agent-channels/:id')
  @RequirePermission(['master-data:agents:write', 'master-data:agent-channels:write'])
  async updateMasterDataAgentChannel(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentChannelUpdateInput) {
    return this.repository.updateAgentChannel(request.user, id, body);
  }

  @Put('master-data/agent-channels/:id/enabled')
  @RequirePermission(['master-data:agents:write', 'master-data:agent-channels:write'])
  async updateMasterDataAgentChannelEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateAgentChannelEnabled(request.user, id, body);
  }

  @Get('master-data/carriers')
  @RequirePermission('master-data:read')
  async masterDataCarriers() {
    return (await this.repository.getMasterData()).carriers;
  }

  @Post('master-data/carriers')
  @RequirePermission('master-data:write')
  async createMasterDataCarrier(@Req() request: { user: Principal }, @Body() body: CarrierCreateInput) {
    return this.repository.createCarrier(request.user, body);
  }

  @Put('master-data/carriers/:id/enabled')
  @RequirePermission('master-data:write')
  async updateMasterDataCarrierEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateCarrierEnabled(request.user, id, body);
  }

  @Get('master-data/channels')
  @RequirePermission('master-data:channels:read')
  async masterDataChannels() {
    return (await this.repository.getMasterData()).channels;
  }

  @Post('master-data/channels')
  @RequirePermission('master-data:channels:write')
  async createMasterDataChannel(@Req() request: { user: Principal }, @Body() body: ChannelCreateInput) {
    return this.repository.createChannel(request.user, body);
  }

  @Put('master-data/channels/:id')
  @RequirePermission('master-data:channels:write')
  async updateMasterDataChannel(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ChannelUpdateInput) {
    return this.repository.updateChannel(request.user, id, body);
  }

  @Put('master-data/channels/:id/enabled')
  @RequirePermission('master-data:channels:write')
  async updateMasterDataChannelEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateChannelEnabled(request.user, id, body);
  }

  @Get('master-data/channel-categories')
  @RequirePermission(['master-data:channels:read', 'master-data:channel-categories:read'])
  async masterDataChannelCategories() {
    return (await this.repository.getMasterData()).channelCategories;
  }

  @Post('master-data/channel-categories')
  @RequirePermission(['master-data:channels:write', 'master-data:channel-categories:write'])
  async createMasterDataChannelCategory(@Req() request: { user: Principal }, @Body() body: ChannelCategoryCreateInput) {
    return this.repository.createChannelCategory(request.user, body);
  }

  @Put('master-data/channel-categories/:id')
  @RequirePermission(['master-data:channels:write', 'master-data:channel-categories:write'])
  async updateMasterDataChannelCategory(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ChannelCategoryUpdateInput) {
    return this.repository.updateChannelCategory(request.user, id, body);
  }

  @Put('master-data/channel-categories/:id/enabled')
  @RequirePermission(['master-data:channels:write', 'master-data:channel-categories:write'])
  async updateMasterDataChannelCategoryEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateChannelCategoryEnabled(request.user, id, body);
  }

  @Get('master-data/surcharges')
  @RequirePermission(['master-data:read', 'master-data:finance:read'])
  async masterDataSurcharges() {
    return (await this.repository.getMasterData()).surcharges;
  }

  @Post('master-data/surcharges')
  @RequirePermission(['master-data:write', 'master-data:finance:write'])
  async createMasterDataSurcharge(@Req() request: { user: Principal }, @Body() body: SurchargeCreateInput) {
    return this.repository.createSurcharge(request.user, body);
  }

  @Put('master-data/surcharges/:id/enabled')
  @RequirePermission(['master-data:write', 'master-data:finance:write'])
  async updateMasterDataSurchargeEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateSurchargeEnabled(request.user, id, body);
  }

  @Get('master-data/fuel-rates')
  @RequirePermission(['master-data:read', 'master-data:finance:read'])
  async masterDataFuelRates() {
    return (await this.repository.getMasterData()).fuelRates;
  }

  @Post('master-data/fuel-rates')
  @RequirePermission(['master-data:write', 'master-data:finance:write'])
  async createMasterDataFuelRate(@Req() request: { user: Principal }, @Body() body: FuelRateCreateInput) {
    return this.repository.createFuelRate(request.user, body);
  }

  @Get('master-data/exchange-rates')
  @RequirePermission(['master-data:read', 'master-data:exchange-rates:read'])
  async masterDataExchangeRates() {
    return (await this.repository.getMasterData()).exchangeRates;
  }

  @Post('master-data/exchange-rates')
  @RequirePermission(['master-data:write', 'master-data:exchange-rates:write'])
  async createMasterDataExchangeRate(@Req() request: { user: Principal }, @Body() body: ExchangeRateCreateInput) {
    return this.repository.createExchangeRate(request.user, body);
  }

  @Put('master-data/exchange-rates/:id')
  @RequirePermission(['master-data:write', 'master-data:exchange-rates:write'])
  async updateMasterDataExchangeRate(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: ExchangeRateUpdateInput) {
    return this.repository.updateExchangeRate(request.user, id, body);
  }

  @Delete('master-data/exchange-rates/:id')
  @RequirePermission(['master-data:write', 'master-data:exchange-rates:write'])
  async deleteMasterDataExchangeRate(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.updateExchangeRate(request.user, id, { enabled: false });
  }

  @Get('system/roles')
  @RequirePermission('system:manage')
  async systemRoles() {
    return this.repository.getRolePermissionMatrix();
  }

  @Post('system/roles')
  @RequirePermission('system:manage')
  async createSystemRole(@Req() request: { user: Principal }, @Body() body: RoleGroupInput) {
    return this.repository.createRoleGroup(request.user, body);
  }

  @Put('system/roles/:role')
  @RequirePermission('system:manage')
  async updateSystemRole(@Req() request: { user: Principal }, @Param('role') role: RoleKey, @Body() body: RoleGroupInput) {
    return this.repository.updateRoleGroup(request.user, role, body);
  }

  @Put('system/roles/:role/enabled')
  @RequirePermission('system:manage')
  async updateSystemRoleEnabled(@Req() request: { user: Principal }, @Param('role') role: RoleKey, @Body() body: EnabledUpdateInput) {
    return this.repository.updateRoleGroupEnabled(request.user, role, body);
  }

  @Get('system/staff-accounts')
  @RequirePermission('system:manage')
  async systemStaffAccounts(@Req() request: { user: Principal }, @Query() query: StaffAccountQuery) {
    return this.repository.getStaffAccounts(request.user, query);
  }

  @Get('system/sites')
  @RequirePermission('system:manage')
  async systemSites(@Req() request: { user: Principal }) {
    return this.repository.getSites(request.user);
  }

  @Post('system/sites')
  @RequirePermission('system:manage')
  async createSystemSite(@Req() request: { user: Principal }, @Body() body: SiteCreateInput) {
    return this.repository.createSite(request.user, body);
  }

  @Put('system/sites/:id')
  @RequirePermission('system:manage')
  async updateSystemSite(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: SiteUpdateInput) {
    return this.repository.updateSite(request.user, id, body);
  }

  @Put('system/sites/:id/enabled')
  @RequirePermission('system:manage')
  async updateSystemSiteEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateSiteEnabled(request.user, id, body);
  }

  @Post('system/staff-accounts')
  @RequirePermission('system:manage')
  async createSystemStaffAccount(@Req() request: { user: Principal }, @Body() body: StaffAccountCreateInput) {
    return this.repository.createStaffAccount(request.user, body);
  }

  @Put('system/staff-accounts/:id/enabled')
  @RequirePermission('system:manage')
  async updateSystemStaffAccountEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updateStaffAccountEnabled(request.user, id, body);
  }

  @Put('system/staff-accounts/:id')
  @RequirePermission('system:manage')
  async updateSystemStaffAccount(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: StaffAccountUpdateInput) {
    return this.repository.updateStaffAccount(request.user, id, body);
  }

  @Delete('system/staff-accounts/:id')
  @RequirePermission('system:manage')
  async deleteSystemStaffAccount(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteStaffAccount(request.user, id);
  }

  @Post('system/staff-accounts/reset-passwords')
  @RequirePermission('system:manage')
  async resetSystemStaffAccountPasswords(@Req() request: { user: Principal }, @Body() body: StaffAccountPasswordResetInput) {
    return this.repository.resetStaffAccountPasswords(request.user, body);
  }

  @Put('system/staff-accounts/:id/site')
  @RequirePermission('system:manage')
  async updateSystemStaffAccountSite(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { site?: string }
  ) {
    return this.repository.updateStaffAccountSite(request.user, id, body);
  }

  @Put('system/roles/:role/permissions')
  @RequirePermission('system:manage')
  async updateRolePermissions(
    @Req() request: { user: Principal },
    @Param('role') role: RoleKey,
    @Body() body: { permissions?: PermissionKey[] }
  ) {
    return this.repository.updateRolePermissions(request.user, role, body.permissions ?? []);
  }

  @Get('system/audit-logs')
  @RequirePermission('system:manage')
  async systemAuditLogs(@Req() request: { user: Principal }, @Query() query: AuditLogQuery) {
    return this.repository.getAuditLogs(request.user, query);
  }

  @Post('pricing/quote')
  @RequirePermission('pricing:lookup')
  quote(@Body() body: PricingQuoteRequest) {
    return this.repository.quote(body);
  }

  @Get('pricing/books')
  @RequirePermission('pricing:manage')
  async priceBooks(@Req() request: { user: Principal }) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以查看价格表明细');
    }
    return this.repository.getPriceBooks(request.user);
  }

  @Post('pricing/lookup')
  @RequirePermission('pricing:lookup')
  async priceLookup(@Req() request: { user: Principal }, @Body() body: PriceLookupRequest) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
    }
    return this.repository.lookupPrice(request.user, body);
  }

  @Get('pricing/markup-rules')
  @RequirePermission('pricing:manage')
  async agentMarkupRules(@Req() request: { user: Principal }, @Query() query: AgentMarkupListQuery) {
    return this.repository.getAgentMarkupRules(request.user, query);
  }

  @Get('pricing/markup-rules/export')
  @RequirePermission('pricing:manage')
  async exportAgentMarkupRules(@Req() request: { user: Principal }, @Query() query: AgentMarkupListQuery) {
    return this.repository.exportAgentMarkupRules(request.user, query);
  }

  @Post('pricing/markup-rules/import')
  @RequirePermission('pricing:manage')
  async importAgentMarkupRules(@Req() request: { user: Principal }, @Body() body: { rows?: AgentMarkupCreateInput[] }) {
    return this.repository.importAgentMarkupRules(request.user, body);
  }

  @Get('pricing/markup-rules/:id/preview')
  @RequirePermission('pricing:manage')
  async previewAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.previewAgentMarkupRule(request.user, id);
  }

  @Post('pricing/markup-rules')
  @RequirePermission('pricing:manage')
  async createAgentMarkupRule(@Req() request: { user: Principal }, @Body() body: AgentMarkupCreateInput) {
    return this.repository.createAgentMarkupRule(request.user, body);
  }

  @Put('pricing/markup-rules/:id')
  @RequirePermission('pricing:manage')
  async updateAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: AgentMarkupUpdateInput) {
    return this.repository.updateAgentMarkupRule(request.user, id, body);
  }

  @Delete('pricing/markup-rules/:id')
  @RequirePermission('pricing:manage')
  async deleteAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.deleteAgentMarkupRule(request.user, id);
  }

  @Post('pricing/books/import')
  @RequirePermission('pricing:manage')
  async importPriceBook(@Req() request: { user: Principal }, @Body() body: PriceBookImportInput) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以导入价格表');
    }
    return this.repository.importPriceBook(request.user, body);
  }

  @Put('pricing/books/:id/remark')
  @RequirePermission('pricing:manage')
  async updatePriceBookRemark(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PriceBookRemarkUpdateInput) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以维护价格表备注');
    }
    return this.repository.updatePriceBookRemark(request.user, id, body);
  }

  @Delete('pricing/books/:id')
  @RequirePermission('pricing:manage')
  async deletePriceBook(@Req() request: { user: Principal }, @Param('id') id: string) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以删除价格表');
    }
    return this.repository.deletePriceBook(request.user, id);
  }

  @Get('pricing/rules')
  @RequirePermission('pricing:manage')
  async pricingRules(@Req() request: { user: Principal }) {
    return this.repository.getPricingRules(request.user);
  }

  @Post('pricing/rules')
  @RequirePermission('pricing:manage')
  async createPricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleCreateInput) {
    return this.repository.createPricingRule(request.user, body);
  }

  @Put('pricing/rules/:id/enabled')
  @RequirePermission('pricing:manage')
  async updatePricingRuleEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.repository.updatePricingRuleEnabled(request.user, id, body);
  }

  @Post('pricing/rules/quote')
  @RequirePermission('pricing:lookup')
  async quotePricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleQuoteRequest) {
    return this.repository.quotePricingRule(request.user, body);
  }

  @Get('warehouse/packages')
  @RequirePermission('warehouse:read')
  async warehousePackages(@Req() request: { user: Principal }) {
    return this.repository.getWarehousePackages(request.user);
  }

  @Get('warehouse/today-receipts')
  @RequirePermission('warehouse:read')
  async warehouseTodayReceipts(@Req() request: { user: Principal }, @Query() query: WarehouseTodayQuery) {
    return this.repository.getWarehouseTodayReceipts(request.user, query);
  }

  @Get('warehouse/in-stock')
  @RequirePermission('warehouse:read')
  async warehouseInStock(@Req() request: { user: Principal }, @Query() query: WarehouseInStockQuery) {
    return this.repository.getWarehouseInStock(request.user, query);
  }

  @Get('warehouse/package-groups')
  @RequirePermission('warehouse:read')
  async warehousePackageGroups(@Req() request: { user: Principal }) {
    return this.repository.getWarehousePackageGroups(request.user);
  }

  @Post('warehouse/packages')
  @RequirePermission('warehouse:write')
  async createWarehousePackage(@Req() request: { user: Principal }, @Body() body: WarehousePackageCreateInput) {
    return this.repository.createWarehousePackage(request.user, body);
  }

  @Post('warehouse/packages/:id/split')
  @RequirePermission('warehouse:write')
  async splitWarehousePackage(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehousePackageSplitInput) {
    return this.repository.splitWarehousePackage(request.user, id, body);
  }

  @Patch('warehouse/packages/:id')
  @RequirePermission('warehouse:write')
  async updateWarehousePackage(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehousePackageUpdateInput) {
    return this.repository.updateWarehousePackage(request.user, id, body);
  }

  @Put('warehouse/packages/:id/remark')
  @RequirePermission('warehouse:write')
  async updateWarehousePackageRemark(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { remark?: string }) {
    return this.repository.updateWarehousePackageRemark(request.user, id, body);
  }

  @Patch('warehouse/packages/:id/exception')
  @RequirePermission('warehouse:write')
  async updateWarehousePackageException(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: { manualException?: string }) {
    return this.repository.updateWarehousePackageException(request.user, id, body);
  }

  @Post('warehouse/consolidations')
  @RequirePermission('warehouse:write')
  async createWarehouseConsolidation(@Req() request: { user: Principal }, @Body() body: WarehouseConsolidationCreateInput) {
    return this.repository.createWarehouseConsolidation(request.user, body);
  }

  @Post('warehouse/consolidations/:id/create-shipment')
  @RequirePermission('warehouse:write')
  async createWarehouseConsolidationShipment(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.createShipmentFromWarehouseConsolidation(request.user, id);
  }

  @Get('warehouse/consolidations/:id/items')
  @RequirePermission('warehouse:read')
  async warehouseConsolidationItems(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getWarehouseConsolidationItems(request.user, id);
  }

  @Get('warehouse/tally-tasks')
  @RequirePermission('warehouse:read')
  async warehouseTallyTasks(@Req() request: { user: Principal }, @Query() query: WarehouseTallyTaskListQuery) {
    return this.repository.getWarehouseTallyTasks(request.user, query);
  }

  @Post('warehouse/tally-tasks')
  @RequirePermission('warehouse:write')
  async createWarehouseTallyTask(@Req() request: { user: Principal }, @Body() body: WarehouseTallyTaskCreateInput) {
    return this.repository.createWarehouseTallyTask(request.user, body);
  }

  @Patch('warehouse/tally-tasks/:id')
  @RequirePermission('warehouse:write')
  async updateWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehouseTallyTaskUpdateInput) {
    return this.repository.updateWarehouseTallyTask(request.user, id, body);
  }

  @Post('warehouse/tally-tasks/:id/complete')
  @RequirePermission('warehouse:write')
  async completeWarehouseTallyTask(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: WarehouseTallyTaskCompleteInput) {
    return this.repository.completeWarehouseTallyTask(request.user, id, body);
  }

  @Post('warehouse/tally-tasks/:id/label')
  @RequirePermission('warehouse:write')
  async generateWarehouseTallyTaskLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.generateWarehouseTallyTaskLabel(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/label/print')
  @RequirePermission('warehouse:write')
  async printWarehouseTallyTaskLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.printWarehouseTallyTaskLabel(request.user, id);
  }

  @Post('warehouse/tally-tasks/:id/label/download')
  @RequirePermission('warehouse:write')
  async downloadWarehouseTallyTaskLabel(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.downloadWarehouseTallyTaskLabel(request.user, id);
  }

  @Get('finance/business-cost-audits')
  @RequirePermission('finance:business-cost:read')
  async businessCostAudits(@Req() request: { user: Principal }, @Query() query: BusinessCostAuditListQuery) {
    return this.repository.getBusinessCostAudits(request.user, query);
  }

  @Get('finance/dashboard')
  @RequirePermission(['finance:read', 'finance:business-cost:read', 'finance:payable:read', 'finance:payable:payment', 'finance:payable:paid-read', 'finance:water-receipt:read'])
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
  @RequirePermission('finance:business-cost:audit')
  async auditBusinessCostAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.auditBusinessCostAudit(request.user, id);
  }

  @Post('finance/business-cost-audits/:id/reverse-audit')
  @RequirePermission('finance:business-cost:reverse')
  async reverseAuditBusinessCostAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.reverseAuditBusinessCostAudit(request.user, id);
  }

  @Delete('finance/business-cost-audits/:id')
  @RequirePermission('finance:business-cost:void')
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
  @RequirePermission('finance:payable:manage')
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
  @RequirePermission('finance:payable:audit')
  async auditPayableAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.auditPayableAudit(request.user, id);
  }

  @Post('finance/payable-audits/:id/reverse-audit')
  @RequirePermission('finance:payable:reverse')
  async reverseAuditPayableAudit(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.reverseAuditPayableAudit(request.user, id);
  }

  @Delete('finance/payable-audits/:id')
  @RequirePermission('finance:payable:void')
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
  @RequirePermission('finance:payable:payment')
  async pendingPayments(@Req() request: { user: Principal }, @Query() query: PendingPaymentListQuery) {
    return this.repository.getPendingPayments(request.user, query);
  }

  @Post('finance/payment-applications')
  @RequirePermission('finance:payable:payment')
  async createPaymentApplications(@Req() request: { user: Principal }, @Body() body: PaymentApplicationCreateInput) {
    return this.repository.createPaymentApplications(request.user, body);
  }

  @Put('finance/payment-applications/:id')
  @RequirePermission('finance:payable:payment')
  async updatePaymentApplication(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentApplicationUpdateInput) {
    return this.repository.updatePaymentApplication(request.user, id, body);
  }

  @Post('finance/payment-applications/:id/cancel')
  @RequirePermission('finance:payable:payment')
  async cancelPaymentApplication(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentApplicationCancelInput) {
    return this.repository.cancelPaymentApplication(request.user, id, body);
  }

  @Post('finance/payment-applications/export')
  @RequirePermission('finance:payable:export')
  async exportPaymentApplications(@Req() request: { user: Principal }, @Body() body: PaymentApplicationExportRequest) {
    return this.repository.exportPaymentApplications(request.user, body);
  }

  @Get('finance/payee-bank-accounts')
  @RequirePermission('finance:payable:bank')
  async payeeBankAccounts(@Req() request: { user: Principal }, @Query() query: { agentName?: string; agentId?: string; currency?: 'RMB' | 'USD' }) {
    return this.repository.getPayeeBankAccounts(request.user, query);
  }

  @Post('finance/payee-bank-accounts')
  @RequirePermission('finance:payable:bank')
  async upsertPayeeBankAccount(@Req() request: { user: Principal }, @Body() body: PayeeBankAccountInput) {
    return this.repository.upsertPayeeBankAccount(request.user, body);
  }

  @Post('finance/payment-vouchers')
  @RequirePermission('finance:payable:attachment')
  async addPaymentVoucher(@Req() request: { user: Principal }, @Body() body: PaymentVoucherInput) {
    return this.repository.addPaymentVoucher(request.user, body);
  }

  @Get('finance/payment-vouchers')
  @RequirePermission('finance:payable:read')
  async paymentVouchers(@Req() request: { user: Principal }, @Query() query: PaymentVoucherListQuery) {
    return this.repository.getPaymentVouchers(request.user, query);
  }

  @Patch('finance/payment-vouchers/:id/difference')
  @RequirePermission('finance:payable:attachment')
  async updatePaymentVoucherDifference(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentVoucherDifferenceInput) {
    return this.repository.updatePaymentVoucherDifference(request.user, id, body);
  }

  @Patch('finance/payment-vouchers/:id/archive')
  @RequirePermission('finance:payable:attachment')
  async updatePaymentVoucherArchive(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentVoucherArchiveInput) {
    return this.repository.updatePaymentVoucherArchive(request.user, id, body);
  }

  @Post('finance/voucher-images')
  @RequirePermission(['finance:payable:attachment', 'finance:payable:paid-voucher', 'finance:water-receipt:voucher'])
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
    const context = body.context;
    if (!context) throw new BadRequestException('缺少凭证类型');
    this.assertVoucherImage(file);
    const requiredPermission: PermissionKey = context === 'WATER_RECEIPT'
      ? 'finance:water-receipt:voucher'
      : context === 'PAID_PAYMENT_RECEIPT'
        ? 'finance:payable:paid-voucher'
        : 'finance:payable:attachment';
    if (!(await this.repository.hasPermission(request.user.role, requiredPermission))) {
      throw new ForbiddenException('没有访问权限');
    }
    if (context === 'PENDING_PAYMENT_BILL' && !body.pendingPaymentId) throw new BadRequestException('缺少待付款记录');
    if (context === 'PAYMENT_APPLICATION_BILL' && !body.paymentApplicationId) throw new BadRequestException('缺少付款申请');
    if (context === 'PAID_PAYMENT_RECEIPT' && !body.paymentApplicationId) throw new BadRequestException('缺少付款申请');
    if (context === 'WATER_RECEIPT' && !body.waterReceiptId) throw new BadRequestException('缺少水单');

    const uploadDir = process.env.UPLOAD_DIR ?? (process.env.NODE_ENV === 'production' ? '/app/uploads/vouchers' : join(process.cwd(), 'uploads/vouchers'));
    await mkdir(uploadDir, { recursive: true });
    const extension = this.imageMimeExtensions[file.mimetype];
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    await writeFile(join(uploadDir, fileName), file.buffer);

    const url = `/api/uploads/${basename(uploadDir)}/${fileName}`;
    const input: PaymentVoucherInput = {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url
    };

    if (context === 'PENDING_PAYMENT_BILL') {
      const pendingPaymentId = body.pendingPaymentId;
      if (!pendingPaymentId) throw new BadRequestException('缺少待付款记录');
      return this.repository.addPaymentVoucher(request.user, { ...input, pendingPaymentId, voucherType: 'BILL' });
    }
    if (context === 'PAYMENT_APPLICATION_BILL') {
      const paymentApplicationId = body.paymentApplicationId;
      if (!paymentApplicationId) throw new BadRequestException('缺少付款申请');
      return this.repository.addPaymentVoucher(request.user, { ...input, paymentApplicationId, voucherType: 'BILL' });
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
      throw new BadRequestException('仅支持 .xls/.xlsx 发票模板');
    }
    if (!(file.mimetype in this.excelMimeExtensions) && file.mimetype !== '') {
      throw new BadRequestException('仅支持 Excel 发票模板');
    }
    if (extension === '.xlsx' && file.buffer.subarray(0, 2).toString('ascii') !== 'PK') {
      throw new BadRequestException('XLSX 内容格式无效');
    }
    if (extension === '.xls') {
      const oleHeader = file.buffer.subarray(0, 4);
      if (!(oleHeader[0] === 0xd0 && oleHeader[1] === 0xcf && oleHeader[2] === 0x11 && oleHeader[3] === 0xe0)) {
        throw new BadRequestException('XLS 内容格式无效');
      }
    }
  }

  @Get('finance/paid-payments')
  @RequirePermission('finance:payable:paid-read')
  async paidPayments(@Req() request: { user: Principal }, @Query() query: PaidPaymentListQuery) {
    return this.repository.getPaidPayments(request.user, query);
  }

  @Post('finance/payment-applications/:id/confirm-paid')
  @RequirePermission('finance:payable:paid-confirm')
  async confirmPaymentApplicationPaid(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaymentConfirmPaidInput) {
    return this.repository.confirmPaymentApplicationPaid(request.user, id, body);
  }

  @Put('finance/paid-payments/:id')
  @RequirePermission('finance:payable:paid-confirm')
  async updatePaidPayment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaidPaymentUpdateInput) {
    return this.repository.updatePaidPayment(request.user, id, body);
  }

  @Post('finance/paid-payments/:id/reverse')
  @RequirePermission('finance:payable:paid-reverse')
  async reversePaidPayment(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: PaidPaymentReverseInput) {
    return this.repository.reversePaidPayment(request.user, id, body);
  }

  @Post('finance/paid-payments/export')
  @RequirePermission('finance:payable:paid-export')
  async exportPaidPayments(@Req() request: { user: Principal }, @Body() body: PaidPaymentExportRequest) {
    return this.repository.exportPaidPayments(request.user, body);
  }

  @Post('finance/payment-water-receipts')
  @RequirePermission('finance:payable:paid-voucher')
  async addPaymentWaterReceipt(@Req() request: { user: Principal }, @Body() body: PaymentWaterReceiptInput) {
    return this.repository.addPaymentWaterReceipt(request.user, body);
  }

  @Get('finance/agent-bank-accounts')
  @RequirePermission('finance:payable:bank')
  async agentBankAccounts(@Req() request: { user: Principal }, @Query() query: { agentName?: string; agentId?: string }) {
    return this.repository.getAgentBankAccounts(request.user, query);
  }

  @Post('finance/agent-bank-accounts')
  @RequirePermission('finance:payable:bank')
  async upsertAgentBankAccount(@Req() request: { user: Principal }, @Body() body: AgentBankAccountInput) {
    return this.repository.upsertAgentBankAccount(request.user, body);
  }

  @Get('finance/customer-statements')
  @RequirePermission('finance:read')
  async customerStatements(@Req() request: { user: Principal }) {
    return this.repository.getCustomerStatements(request.user);
  }

  @Post('finance/customer-statements')
  @RequirePermission('finance:settle')
  async createCustomerStatement(@Req() request: { user: Principal }, @Body() body: CustomerStatementCreateInput) {
    return this.repository.createCustomerStatement(request.user, body);
  }

  @Get('finance/customer-accounts')
  @RequirePermission('finance:read')
  async customerAccounts(@Req() request: { user: Principal }) {
    return this.repository.getCustomerAccounts(request.user);
  }

  @Get('finance/account-ledger')
  @RequirePermission('finance:read')
  async accountLedger(@Req() request: { user: Principal }) {
    return this.repository.getAccountLedger(request.user);
  }

  @Post('finance/payments')
  @RequirePermission('finance:settle')
  async createPayment(@Req() request: { user: Principal }, @Body() body: PaymentCreateInput) {
    return this.repository.createPayment(request.user, body);
  }
}

function isSalesScopedRole(role: string): boolean {
  return [
    'OPERATOR',
    'UG_MARKET',
    'UG_BUSINESS',
    'UG_SZ_WUHAN',
    'UG_ZZ_SIHUA',
    'UG_WH_JIUYULIAN',
    'UG_BUSINESS_MANAGER',
    'UG_BUSINESS_SUPERVISOR'
  ].includes(role);
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

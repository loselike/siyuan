import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Shipment as PrismaShipment } from '@prisma/client';
import {
  canTransitionShipment,
  calculateQuote,
  createFeeLinesFromQuote,
  createMockTransferNo,
  createMockTrackingStatus,
  createSystemOrderNo,
  summarizeStatement,
  summarizePaymentSettlement,
  summarizeStatusCounts,
  validateShipmentImportRows,
  type AccountLedgerSummary,
  type BusinessType,
  type CarrierAdapterCode,
  type CarrierTaskRunResponse,
  type CarrierTaskSummary,
  type CustomerAccountSummary,
  type CustomerStatementCreateInput,
  type CustomerStatementSummary,
  type LabelCreateResponse,
  type PaymentCreateInput,
  type PaymentCreateResponse,
  type PricingQuoteRequest,
  type ProblemTicketCreateInput,
  type ProblemTicketSummary,
  type ReceivableAdjustmentInput,
  type ReceivableFeeSummary,
  type Shipment,
  type ShipmentCreateInput,
  type ShipmentImportRequest,
  type ShipmentImportResponse,
  type ShipmentLabelSummary,
  type ShipmentStatus,
  type TrackingEventInput
} from '@siyuan/shared';
import { hashPassword } from './password.js';
import { PrismaService } from './prisma.service.js';
import {
  buildRolePermissionRow,
  normalizeRolePermissions,
  permissionDefinitions,
  roleMetadata,
  rolePermissions,
  type PermissionKey,
  type Principal,
  type RoleKey,
  type RolePermissionRow
} from './rbac.js';

type ShipmentWithRelations = PrismaShipment & {
  customer: { code: string; name: string };
  channel: ({ name: string; carrier: { name: string } } | null);
  agent: ({ name: string } | null);
  problemTickets: Array<{ id: string; status: string }>;
};

@Injectable()
export class PrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAccount(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, enabled: true },
      include: { role: true }
    });

    if (!user || user.passwordHash !== hashPassword(password)) {
      return undefined;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role.name as RoleKey,
      customerId: user.customerId ?? undefined
    };
  }

  async getShipments(principal: Principal): Promise<Shipment[]> {
    const rows = await this.prisma.shipment.findMany({
      where: principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : undefined,
      include: shipmentIncludes,
      orderBy: { createdAt: 'desc' }
    });

    return rows.map(mapShipment);
  }

  async getShipmentStatusCounts(principal: Principal) {
    return summarizeStatusCounts(await this.getShipments(principal));
  }

  async getMasterData() {
    const [customers, channels, roles, agents] = await Promise.all([
      this.prisma.customer.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.channel.findMany({ include: { carrier: true }, orderBy: { name: 'asc' } }),
      this.prisma.role.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.agent.findMany({ orderBy: { name: 'asc' } })
    ]);

    return {
      customers,
      channels: channels.map((channel) => ({ ...channel, carrier: channel.carrier.name })),
      agents,
      roles: roles.map((role) => role.name)
    };
  }

  async hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean> {
    if (role === 'ADMIN') {
      return true;
    }
    const row = await this.prisma.role.findUnique({
      where: { name: role },
      include: { permissions: true }
    });
    const permissions = row?.permissions.map((item) => item.code as PermissionKey) ?? rolePermissions[role];
    return permissions.includes(permission);
  }

  async getRolePermissionMatrix(): Promise<{ availablePermissions: typeof permissionDefinitions; roles: RolePermissionRow[] }> {
    const rows = await this.prisma.role.findMany({ include: { permissions: true } });
    const byName = new Map(rows.map((row) => [row.name as RoleKey, row.permissions.map((item) => item.code as PermissionKey)]));
    return {
      availablePermissions: permissionDefinitions,
      roles: (Object.keys(roleMetadata) as RoleKey[]).map((role) => buildRolePermissionRow(role, byName.get(role) ?? rolePermissions[role]))
    };
  }

  async updateRolePermissions(principal: Principal, role: RoleKey, permissions: PermissionKey[]): Promise<RolePermissionRow> {
    const normalized = normalizeRolePermissions(role, permissions);
    const before = (await this.getRolePermissionMatrix()).roles.find((item) => item.key === role)?.permissions ?? [];
    for (const permission of normalized) {
      await this.prisma.permission.upsert({
        where: { code: permission },
        create: { code: permission },
        update: {}
      });
    }
    const updated = await this.prisma.role.update({
      where: { name: role },
      data: { permissions: { set: normalized.map((code) => ({ code })) } },
      include: { permissions: true }
    });
    const after = updated.permissions.map((item) => item.code as PermissionKey);
    await this.prisma.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'system.role_permissions.update',
        target: `role:${role}`,
        before,
        after
      }
    });
    return buildRolePermissionRow(role, after);
  }

  quote(input: PricingQuoteRequest) {
    return calculateQuote(input);
  }

  async getReceivables(principal: Principal): Promise<ReceivableFeeSummary[]> {
    const rows = await this.prisma.receivableFee.findMany({
      where: principal.role === 'CUSTOMER' ? { shipment: { customerId: principal.customerId } } : undefined,
      include: { shipment: { include: { customer: true } } },
      orderBy: { id: 'asc' }
    });

    return rows.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: row.shipment.systemOrderNo,
      customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
      name: row.name,
      amount: Number(row.amount),
      settled: row.settled
    }));
  }

  async generateShipmentFees(
    principal: Principal,
    shipmentId: string,
    input: { baseRatePerKg: number; payableRatePerKg: number; fuelRate: number; surcharges?: Array<{ name: string; amount: number }> }
  ) {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.prisma.receivableFee.deleteMany({ where: { shipmentId: shipment.id, settled: false } });
    await this.prisma.payableFee.deleteMany({ where: { shipmentId: shipment.id, settled: false } });

    const receivableQuote = calculateQuote({
      chargeableWeightKg: Number(shipment.receivableWeightKg),
      baseRatePerKg: input.baseRatePerKg,
      fuelRate: input.fuelRate,
      surcharges: input.surcharges ?? []
    });
    const payableQuote = calculateQuote({
      chargeableWeightKg: Number(shipment.agentWeightKg),
      baseRatePerKg: input.payableRatePerKg,
      fuelRate: input.fuelRate,
      surcharges: []
    });

    await this.prisma.receivableFee.createMany({
      data: createFeeLinesFromQuote(shipment.id, receivableQuote).map((line) => ({
        shipmentId: line.shipmentId,
        name: line.name,
        amount: line.amount
      }))
    });
    await this.prisma.payableFee.createMany({
      data: createFeeLinesFromQuote(shipment.id, payableQuote).map((line) => ({
        shipmentId: line.shipmentId,
        name: line.name,
        amount: line.amount
      }))
    });

    const [receivables, payables] = await Promise.all([
      this.prisma.receivableFee.findMany({
        where: { shipmentId: shipment.id },
        include: { shipment: { include: { customer: true } } },
        orderBy: { id: 'asc' }
      }),
      this.prisma.payableFee.findMany({ where: { shipmentId: shipment.id }, orderBy: { id: 'asc' } })
    ]);

    return {
      receivables: receivables.map((row) => ({
        id: row.id,
        shipmentId: row.shipmentId,
        systemOrderNo: row.shipment.systemOrderNo,
        customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
        name: row.name,
        amount: Number(row.amount),
        settled: row.settled
      })),
      payables: payables.map((row) => ({
        id: row.id,
        shipmentId: row.shipmentId,
        name: row.name,
        amount: Number(row.amount),
        settled: row.settled
      })),
      receivableTotal: receivableQuote.total,
      payableTotal: payableQuote.total
    };
  }

  async addReceivableAdjustment(principal: Principal, shipmentId: string, input: ReceivableAdjustmentInput): Promise<ReceivableFeeSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const fee = await this.prisma.receivableFee.create({
      data: {
        shipmentId: shipment.id,
        name: input.name,
        amount: input.amount
      },
      include: { shipment: { include: { customer: true } } }
    });

    return {
      id: fee.id,
      shipmentId: fee.shipmentId,
      systemOrderNo: fee.shipment.systemOrderNo,
      customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
      name: fee.name,
      amount: Number(fee.amount),
      settled: fee.settled
    };
  }

  async getCustomerStatements(principal: Principal): Promise<CustomerStatementSummary[]> {
    const rows = await this.prisma.customerStatement.findMany({
      where: principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: rows.map((row) => row.customerId) } }
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    return rows.map((row) => {
      const customer = customerMap.get(row.customerId);
      return {
        id: row.id,
        customerId: row.customerId,
        customerName: customer ? `${customer.code}-${customer.name}` : row.customerId,
        periodStart: row.createdAt.toISOString().slice(0, 10),
        periodEnd: row.createdAt.toISOString().slice(0, 10),
        total: Number(row.total),
        feeCount: 0,
        status: row.status as CustomerStatementSummary['status'],
        createdAt: row.createdAt.toISOString()
      };
    });
  }

  async createCustomerStatement(_principal: Principal, input: CustomerStatementCreateInput): Promise<CustomerStatementSummary> {
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const fees = await this.prisma.receivableFee.findMany({
      where: {
        settled: false,
        shipment: {
          customerId: input.customerId,
          createdAt: {
            gte: new Date(`${input.periodStart}T00:00:00.000Z`),
            lte: new Date(`${input.periodEnd}T23:59:59.999Z`)
          }
        }
      },
      include: { shipment: { include: { customer: true } } }
    });
    const draft = summarizeStatement({
      customerId: customer.id,
      customerName: `${customer.code}-${customer.name}`,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      fees: fees.map((fee) => ({
        id: fee.id,
        shipmentId: fee.shipmentId,
        systemOrderNo: fee.shipment.systemOrderNo,
        customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
        name: fee.name,
        amount: Number(fee.amount),
        settled: fee.settled
      }))
    });
    const created = await this.prisma.customerStatement.create({
      data: {
        customerId: customer.id,
        total: draft.total,
        status: draft.status
      }
    });

    return { ...draft, id: created.id, createdAt: created.createdAt.toISOString() };
  }

  async getCustomerAccounts(principal: Principal): Promise<CustomerAccountSummary[]> {
    const rows = await this.prisma.customerAccount.findMany({
      where: principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : undefined,
      include: { customer: true },
      orderBy: { customerId: 'asc' }
    });

    return rows.map((row) => ({
      customerId: row.customerId,
      customerName: `${row.customer.code}-${row.customer.name}`,
      balance: Number(row.balance),
      currency: row.currency
    }));
  }

  async getAccountLedger(principal: Principal): Promise<AccountLedgerSummary[]> {
    const rows = await this.prisma.accountLedger.findMany({
      where: {
        partyType: 'CUSTOMER',
        ...(principal.role === 'CUSTOMER' ? { partyId: principal.customerId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: rows.map((row) => row.partyId) } }
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    return rows.map((row) => {
      const customer = customerMap.get(row.partyId);
      return {
        id: row.id,
        customerId: row.partyId,
        customerName: customer ? `${customer.code}-${customer.name}` : row.partyId,
        amount: Number(row.amount),
        balance: Number(row.balance),
        note: row.note ?? undefined,
        createdAt: row.createdAt.toISOString()
      };
    });
  }

  async createPayment(_principal: Principal, input: PaymentCreateInput): Promise<PaymentCreateResponse> {
    if (input.amount <= 0) {
      throw new BadRequestException('收款金额必须大于 0');
    }
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new BadRequestException('客户不存在');
    }
    const account = await this.prisma.customerAccount.upsert({
      where: { id: `ca-${customer.code}-cny` },
      update: {},
      create: { id: `ca-${customer.code}-cny`, customerId: customer.id, balance: 0, currency: 'CNY' },
      include: { customer: true }
    });
    const feeIds = input.feeIds ?? [];
    const fees = await this.prisma.receivableFee.findMany({
      where: { id: { in: feeIds } },
      include: { shipment: { include: { customer: true } } }
    });
    if (fees.length !== feeIds.length) {
      throw new BadRequestException('应收费用不存在');
    }
    if (fees.some((fee) => fee.shipment.customerId !== input.customerId)) {
      throw new BadRequestException('应收费用不属于该客户');
    }
    if (fees.some((fee) => fee.settled)) {
      throw new BadRequestException('应收费用已核销');
    }
    const settledAmount = roundMoney(fees.reduce((sum, fee) => sum + Number(fee.amount), 0));
    if (input.amount < settledAmount) {
      throw new BadRequestException('收款金额不足以核销选中费用');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          partyType: 'CUSTOMER',
          partyId: input.customerId,
          amount: input.amount
        }
      });
      const afterReceiptBalance = roundMoney(Number(account.balance) + input.amount);
      await tx.customerAccount.update({
        where: { id: account.id },
        data: { balance: afterReceiptBalance }
      });
      await tx.accountLedger.create({
        data: {
          partyType: 'CUSTOMER',
          partyId: input.customerId,
          amount: input.amount,
          balance: afterReceiptBalance,
          note: input.note?.trim() || '收款登记'
        }
      });

      let finalBalance = afterReceiptBalance;
      if (settledAmount > 0) {
        finalBalance = roundMoney(afterReceiptBalance - settledAmount);
        await tx.receivableFee.updateMany({ where: { id: { in: feeIds } }, data: { settled: true } });
        await tx.customerAccount.update({
          where: { id: account.id },
          data: { balance: finalBalance }
        });
        await tx.accountLedger.create({
          data: {
            partyType: 'CUSTOMER',
            partyId: input.customerId,
            amount: -settledAmount,
            balance: finalBalance,
            note: '核销应收费用'
          }
        });
        await tx.settlement.createMany({
          data: fees.map((fee) => ({
            paymentId: payment.id,
            feeId: fee.id,
            amount: Number(fee.amount)
          }))
        });
      }

      let statement: CustomerStatementSummary | undefined;
      if (input.statementId) {
        const updated = await tx.customerStatement.updateMany({
          where: { id: input.statementId, customerId: input.customerId },
          data: { status: 'SETTLED' }
        });
        if (updated.count > 0) {
          const row = await tx.customerStatement.findUnique({ where: { id: input.statementId } });
          if (row) {
            statement = {
              id: row.id,
              customerId: row.customerId,
              customerName: `${customer.code}-${customer.name}`,
              periodStart: row.createdAt.toISOString().slice(0, 10),
              periodEnd: row.createdAt.toISOString().slice(0, 10),
              total: Number(row.total),
              feeCount: 0,
              status: row.status as CustomerStatementSummary['status'],
              createdAt: row.createdAt.toISOString()
            };
          }
        }
      }

      return {
        payment,
        accountBalance: finalBalance,
        statement
      };
    });

    const paymentSummary = summarizePaymentSettlement({
      id: result.payment.id,
      customerId: customer.id,
      customerName: `${customer.code}-${customer.name}`,
      amount: Number(result.payment.amount),
      settledAmount,
      createdAt: result.payment.createdAt.toISOString()
    });

    return {
      payment: paymentSummary,
      account: {
        customerId: customer.id,
        customerName: `${customer.code}-${customer.name}`,
        balance: result.accountBalance,
        currency: account.currency
      },
      settledFees: fees.map((fee) => ({
        id: fee.id,
        shipmentId: fee.shipmentId,
        systemOrderNo: fee.shipment.systemOrderNo,
        customerName: `${fee.shipment.customer.code}-${fee.shipment.customer.name}`,
        name: fee.name,
        amount: Number(fee.amount),
        settled: true
      })),
      statement: result.statement
    };
  }

  async createShipment(principal: Principal, input: ShipmentCreateInput): Promise<Shipment> {
    const customerId = principal.role === 'CUSTOMER' ? principal.customerId : input.customerId;
    if (!customerId) {
      throw new BadRequestException('缺少客户');
    }

    if (principal.role === 'CUSTOMER' && input.customerId && input.customerId !== principal.customerId) {
      throw new ForbiddenException('客户不能为其他客户创建预报');
    }

    const now = new Date();
    const systemOrderNo = await this.nextSystemOrderNo(input.businessType, now);
    const created = await this.prisma.shipment.create({
      data: {
        customerId,
        channelId: input.channelId,
        customerOrderNo: input.customerOrderNo.trim(),
        systemOrderNo,
        businessType: input.businessType,
        status: 'DECLARED',
        destinationCountry: input.destinationCountry.trim(),
        packageType: input.packageType,
        packageCount: input.packageCount,
        receivableWeightKg: input.receivableWeightKg,
        agentWeightKg: input.agentWeightKg ?? input.receivableWeightKg,
        latestTracking: '客户已预报',
        trackingStaleDays: 0,
        isRemoteArea: false,
        createdAt: now,
        packages: {
          create: {
            lengthCm: 0,
            widthCm: 0,
            heightCm: 0,
            actualKg: input.receivableWeightKg,
            volumeKg: input.receivableWeightKg
          }
        },
        events: { create: { toStatus: 'DECLARED', note: '创建预报' } },
        trackingEvents: { create: { status: '客户已预报', happenedAt: now } }
      },
      include: shipmentIncludes
    });

    return mapShipment(created);
  }

  async importShipments(principal: Principal, request: ShipmentImportRequest): Promise<ShipmentImportResponse> {
    const validation = validateShipmentImportRows(request.rows);
    const created: Shipment[] = [];
    const customerId = principal.role === 'CUSTOMER' ? principal.customerId : request.customerId;

    if (!customerId) {
      throw new BadRequestException('缺少客户');
    }

    for (const row of validation.validRows) {
      const channel = await this.prisma.channel.findFirst({
        where: { name: { contains: row.channelName } }
      });
      created.push(
        await this.createShipment(principal, {
          customerId,
          customerOrderNo: row.customerOrderNo,
          businessType: 'EXPRESS',
          packageType: 'WPX',
          destinationCountry: row.destinationCountry,
          packageCount: 1,
          receivableWeightKg: row.weightKg,
          agentWeightKg: row.weightKg,
          channelId: channel?.id
        })
      );
    }

    return { created, errors: validation.errors };
  }

  async receiveShipment(principal: Principal, shipmentId: string): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (shipment.status === 'DECLARED') {
      if (!canTransitionShipment('DECLARED', 'WAITING_RECEIVE') || !canTransitionShipment('WAITING_RECEIVE', 'WAITING_SORT')) {
        throw new BadRequestException('当前状态不允许确认收货');
      }
      await this.createEvent(shipment.id, 'DECLARED', 'WAITING_RECEIVE', '确认到仓');
      return this.updateShipmentStatus(shipment.id, 'WAITING_RECEIVE', 'WAITING_SORT', '确认收货');
    }

    if (!canTransitionShipment(shipment.status as ShipmentStatus, 'WAITING_SORT')) {
      throw new BadRequestException('当前状态不允许确认收货');
    }

    return this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'WAITING_SORT', '确认收货');
  }

  async routeShipment(principal: Principal, shipmentId: string, body: { channelId?: string; agentId?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (!body.channelId) {
      throw new BadRequestException('缺少渠道');
    }
    if (!canTransitionShipment(shipment.status as ShipmentStatus, 'WAITING_DISPATCH')) {
      throw new BadRequestException('当前状态不允许排货');
    }

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { channelId: body.channelId, agentId: body.agentId }
    });

    return this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'WAITING_DISPATCH', '排货');
  }

  async dispatchShipment(principal: Principal, shipmentId: string, body: { transferNo?: string }): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const transferNo = body.transferNo ?? shipment.transferNo;
    if (!transferNo) {
      throw new BadRequestException('发货前必须填写转单号');
    }
    const voidedLabel = await this.prisma.shipmentLabel.findFirst({
      where: { shipmentId: shipment.id, transferNo, status: 'VOIDED' }
    });
    if (voidedLabel) {
      throw new BadRequestException('已作废面单不能发货');
    }
    if (!canTransitionShipment(shipment.status as ShipmentStatus, 'WAITING_ONLINE')) {
      throw new BadRequestException('当前状态不允许发货');
    }

    await this.prisma.shipment.update({ where: { id: shipment.id }, data: { transferNo } });
    const updated = await this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'WAITING_ONLINE', '确认发货');
    await this.ensureCarrierTask(updated.id, updated.carrier, updated.transferNo ?? transferNo);
    return updated;
  }

  async getCarrierTasks(_principal: Principal): Promise<CarrierTaskSummary[]> {
    const tasks = await this.prisma.carrierTask.findMany({
      include: { shipment: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return tasks.map(mapCarrierTask);
  }

  async runCarrierTask(_principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    return this.executeCarrierTask(taskId, body.fail === true);
  }

  async retryCarrierTask(_principal: Principal, taskId: string, body: { fail?: boolean } = {}): Promise<CarrierTaskRunResponse> {
    const task = await this.prisma.carrierTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    if (task.status !== 'FAILED') {
      throw new BadRequestException('只有失败任务可以重试');
    }
    await this.prisma.carrierTask.update({
      where: { id: task.id },
      data: { status: 'PENDING', lastError: null }
    });
    return this.executeCarrierTask(taskId, body.fail === true);
  }

  async createShipmentLabel(principal: Principal, shipmentId: string): Promise<LabelCreateResponse> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    if (shipment.status !== 'WAITING_DISPATCH') {
      throw new BadRequestException('当前状态不允许申请面单');
    }

    const existing = await this.prisma.shipmentLabel.findFirst({
      where: { shipmentId: shipment.id, status: 'CREATED' },
      orderBy: { createdAt: 'desc' }
    });
    if (existing) {
      return { label: mapShipmentLabel(existing), shipment: mapShipment(shipment) };
    }

    const now = new Date();
    const sequence = await this.nextLabelSequence(now);
    const carrier = toCarrierAdapterCode(shipment.channel?.carrier.name ?? '');
    const labelNo = `LBL${formatDate(now)}${String(sequence).padStart(5, '0')}`;
    const transferNo = createMockTransferNo(carrier, now, sequence);
    const label = await this.prisma.shipmentLabel.create({
      data: {
        shipmentId: shipment.id,
        carrier,
        channelName: shipment.channel?.name ?? '',
        labelNo,
        transferNo,
        labelUrl: `/mock-labels/${labelNo}.pdf`,
        status: 'CREATED',
        createdAt: now
      }
    });

    await this.prisma.shipmentEvent.create({
      data: { shipmentId: shipment.id, fromStatus: shipment.status, toStatus: shipment.status, note: '申请模拟面单' }
    });
    await this.prisma.trackingEvent.create({
      data: { shipmentId: shipment.id, status: '已生成面单', happenedAt: now, visibleToCustomer: true }
    });
    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { transferNo, latestTracking: '已生成面单', trackingStaleDays: 0 },
      include: shipmentIncludes
    });

    return { label: mapShipmentLabel(label), shipment: mapShipment(updated) };
  }

  async getShipmentLabels(principal: Principal, shipmentId: string): Promise<ShipmentLabelSummary[]> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const labels = await this.prisma.shipmentLabel.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { createdAt: 'desc' }
    });
    return labels.map(mapShipmentLabel);
  }

  async voidShipmentLabel(principal: Principal, shipmentId: string, labelId: string): Promise<ShipmentLabelSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const label = await this.prisma.shipmentLabel.findFirst({ where: { id: labelId, shipmentId: shipment.id } });
    if (!label) {
      throw new NotFoundException('面单不存在');
    }
    if (shipment.status !== 'WAITING_DISPATCH') {
      throw new BadRequestException('已发货运单不能作废面单');
    }
    if (label.status !== 'CREATED') {
      throw new BadRequestException('面单已作废');
    }

    const now = new Date();
    const updatedLabel = await this.prisma.shipmentLabel.update({
      where: { id: label.id },
      data: { status: 'VOIDED', voidedAt: now }
    });
    if (shipment.transferNo === label.transferNo) {
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: { transferNo: null, latestTracking: '面单已作废', trackingStaleDays: 0 }
      });
      await this.prisma.trackingEvent.create({
        data: { shipmentId: shipment.id, status: '面单已作废', happenedAt: now, visibleToCustomer: false }
      });
    }

    return mapShipmentLabel(updatedLabel);
  }

  async addTrackingEvent(principal: Principal, shipmentId: string, input: TrackingEventInput): Promise<Shipment> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    await this.prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status: input.status,
        happenedAt: new Date(input.happenedAt),
        visibleToCustomer: input.visibleToCustomer ?? true
      }
    });

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { latestTracking: input.status, trackingStaleDays: 0 },
      include: shipmentIncludes
    });

    return mapShipment(updated);
  }

  async getProblemTickets(principal: Principal): Promise<ProblemTicketSummary[]> {
    const rows = await this.prisma.problemTicket.findMany({
      where:
        principal.role === 'CUSTOMER'
          ? { customerVisible: true, shipment: { customerId: principal.customerId } }
          : undefined,
      include: {
        shipment: { include: { customer: true } },
        replies: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return rows.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: row.shipment.systemOrderNo,
      customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
      reason: row.reason,
      status: row.status,
      customerVisible: row.customerVisible,
      createdAt: row.createdAt.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      replies: row.replies.map((reply) => ({
        id: reply.id,
        author: reply.author,
        message: reply.message,
        createdAt: reply.createdAt.toISOString()
      }))
    }));
  }

  async createProblemTicket(principal: Principal, shipmentId: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary> {
    const shipment = await this.getVisibleShipment(principal, shipmentId);
    const ticket = await this.prisma.problemTicket.create({
      data: {
        shipmentId: shipment.id,
        reason: input.reason,
        status: 'OPEN',
        customerVisible: input.customerVisible ?? true
      }
    });

    if (canTransitionShipment(shipment.status as ShipmentStatus, 'PROBLEM')) {
      await this.updateShipmentStatus(shipment.id, shipment.status as ShipmentStatus, 'PROBLEM', '创建问题件');
    }

    return (await this.getProblemTickets({ ...principal, role: 'ADMIN' })).find((item) => item.id === ticket.id)!;
  }

  async replyProblemTicket(principal: Principal, ticketId: string, message: string): Promise<ProblemTicketSummary> {
    const ticket = await this.getVisibleProblemTicket(principal, ticketId);
    await this.prisma.problemReply.create({
      data: {
        ticketId: ticket.id,
        author: principal.role === 'CUSTOMER' ? '客户' : principal.username,
        message
      }
    });

    return (await this.getProblemTickets(principal)).find((item) => item.id === ticketId)!;
  }

  async closeProblemTicket(principal: Principal, ticketId: string): Promise<ProblemTicketSummary> {
    const ticket = await this.getVisibleProblemTicket(principal, ticketId);
    await this.prisma.problemTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt: new Date() }
    });

    return (await this.getProblemTickets({ ...principal, role: 'ADMIN' })).find((item) => item.id === ticketId)!;
  }

  private async nextSystemOrderNo(businessType: BusinessType, date: Date): Promise<string> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const count = await this.prisma.shipment.count({ where: { createdAt: { gte: start, lt: end } } });
    return createSystemOrderNo(businessType, date, count + 1);
  }

  private async nextLabelSequence(date: Date): Promise<number> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const count = await this.prisma.shipmentLabel.count({ where: { createdAt: { gte: start, lt: end } } });
    return count + 1;
  }

  private async ensureCarrierTask(shipmentId: string, carrier: string, transferNo: string) {
    const existing = await this.prisma.carrierTask.findFirst({
      where: { shipmentId, type: 'TRACKING_SYNC' }
    });
    if (existing) {
      return existing;
    }
    return this.prisma.carrierTask.create({
      data: {
        shipmentId,
        type: 'TRACKING_SYNC',
        carrier: toCarrierAdapterCode(carrier),
        transferNo,
        status: 'PENDING',
        attempts: 0
      }
    });
  }

  private async executeCarrierTask(taskId: string, fail: boolean): Promise<CarrierTaskRunResponse> {
    const task = await this.prisma.carrierTask.findUnique({
      where: { id: taskId },
      include: { shipment: { include: shipmentIncludes } }
    });
    if (!task) {
      throw new NotFoundException('承运商任务不存在');
    }
    if (task.status === 'SUCCESS') {
      throw new BadRequestException('已成功任务不能重复执行');
    }

    if (fail) {
      const failed = await this.prisma.carrierTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', attempts: { increment: 1 }, lastError: '模拟承运商接口失败' },
        include: { shipment: { include: { customer: true } } }
      });
      return { task: mapCarrierTask(failed), shipment: mapShipment(task.shipment) };
    }

    const now = new Date();
    const trackingStatus = createMockTrackingStatus(toCarrierAdapterCode(task.carrier), task.transferNo);
    const [updatedTask, updatedShipment] = await this.prisma.$transaction([
      this.prisma.carrierTask.update({
        where: { id: task.id },
        data: { status: 'SUCCESS', attempts: { increment: 1 }, lastError: null, completedAt: now },
        include: { shipment: { include: { customer: true } } }
      }),
      this.prisma.shipment.update({
        where: { id: task.shipmentId },
        data: {
          latestTracking: trackingStatus,
          trackingStaleDays: 0,
          trackingEvents: { create: { status: trackingStatus, happenedAt: now, visibleToCustomer: true } }
        },
        include: shipmentIncludes
      })
    ]);

    return { task: mapCarrierTask(updatedTask), shipment: mapShipment(updatedShipment) };
  }

  private async getVisibleShipment(principal: Principal, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {})
      },
      include: shipmentIncludes
    });

    if (!shipment) {
      throw new NotFoundException('运单不存在');
    }

    return shipment;
  }

  private async getVisibleProblemTicket(principal: Principal, ticketId: string) {
    const ticket = await this.prisma.problemTicket.findFirst({
      where: {
        id: ticketId,
        ...(principal.role === 'CUSTOMER' ? { customerVisible: true, shipment: { customerId: principal.customerId } } : {})
      }
    });
    if (!ticket) {
      throw new NotFoundException('问题件不存在');
    }
    return ticket;
  }

  private async updateShipmentStatus(
    shipmentId: string,
    fromStatus: ShipmentStatus,
    toStatus: ShipmentStatus,
    note: string
  ): Promise<Shipment> {
    await this.createEvent(shipmentId, fromStatus, toStatus, note);
    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: toStatus },
      include: shipmentIncludes
    });
    return mapShipment(updated);
  }

  private async createEvent(shipmentId: string, fromStatus: ShipmentStatus | null, toStatus: ShipmentStatus, note: string) {
    await this.prisma.shipmentEvent.create({
      data: { shipmentId, fromStatus, toStatus, note }
    });
  }
}

const shipmentIncludes = {
  customer: true,
  channel: { include: { carrier: true } },
  agent: true,
  problemTickets: true
} as const;

function mapShipment(row: ShipmentWithRelations): Shipment {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    customerName: `${row.customer.code}-${row.customer.name}`,
    customerOrderNo: row.customerOrderNo,
    systemOrderNo: row.systemOrderNo,
    transferNo: row.transferNo ?? undefined,
    businessType: row.businessType as BusinessType,
    packageType: row.packageType as 'DOC' | 'WPX' | 'PAK',
    destinationCountry: row.destinationCountry,
    carrier: row.channel?.carrier.name ?? '',
    packageCount: row.packageCount,
    receivableWeightKg: Number(row.receivableWeightKg),
    agentWeightKg: Number(row.agentWeightKg),
    latestTracking: row.latestTracking ?? '',
    trackingStaleDays: row.trackingStaleDays,
    isRemoteArea: row.isRemoteArea,
    status: row.status as ShipmentStatus,
    channelName: row.channel?.name ?? '',
    agentName: row.agent?.name ?? '',
    hasProblemTicket: row.problemTickets.some((ticket) => ticket.status !== 'CLOSED')
  };
}

function mapShipmentLabel(row: {
  id: string;
  shipmentId: string;
  carrier: string;
  channelName: string;
  labelNo: string;
  transferNo: string;
  labelUrl: string;
  status: string;
  createdAt: Date;
  voidedAt: Date | null;
}): ShipmentLabelSummary {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    carrier: toCarrierAdapterCode(row.carrier),
    channelName: row.channelName,
    labelNo: row.labelNo,
    transferNo: row.transferNo,
    labelUrl: row.labelUrl,
    status: row.status as ShipmentLabelSummary['status'],
    createdAt: row.createdAt.toISOString(),
    voidedAt: row.voidedAt?.toISOString()
  };
}

function mapCarrierTask(row: {
  id: string;
  shipmentId: string;
  type: string;
  carrier: string;
  transferNo: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  shipment: { systemOrderNo: string; customer: { code: string; name: string } };
}): CarrierTaskSummary {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    systemOrderNo: row.shipment.systemOrderNo,
    customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
    type: row.type as CarrierTaskSummary['type'],
    carrier: toCarrierAdapterCode(row.carrier),
    transferNo: row.transferNo,
    status: row.status as CarrierTaskSummary['status'],
    attempts: row.attempts,
    lastError: row.lastError ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString()
  };
}

function toCarrierAdapterCode(carrier: string): CarrierAdapterCode {
  const normalized = carrier.toUpperCase();
  if (normalized.includes('DHL')) {
    return 'DHL';
  }
  if (normalized.includes('FEDEX')) {
    return 'FEDEX';
  }
  if (normalized.includes('UPS')) {
    return 'UPS';
  }
  if (normalized.includes('USPS')) {
    return 'USPS';
  }
  return 'OTHER';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatDate(date: Date): string {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

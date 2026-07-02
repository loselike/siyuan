import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import type {
  AccountLedgerSummary,
  AgentMarkupSummary,
  AuditLogSummary,
  CarrierTaskSummary,
  CustomerAccountSummary,
  BusinessCostAuditSummary,
  FinanceCatalogItemSummary,
  MasterDataSnapshot,
  AgentBankAccountSummary,
  PayeeBankAccountSummary,
  PaidPaymentSummary,
  PendingPaymentSummary,
  PaymentApplicationSummary,
  PaymentVoucherSummary,
  PayableAuditSummary,
  ProblemTicketSummary,
  PriceBookRowSummary,
  PriceBookSummary,
  PricingRuleSummary,
  ReceivableAuditSummary,
  Shipment,
  ShipmentReviewDetailSummary,
  ShipmentStatus,
  SiteSummary,
  StaffAccountSummary,
  WaterReceiptSummary,
  WarehousePackageSummary,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';
import { App } from '../../App';

type TestPayablePaymentApplication = {
  id: string;
  payableFinanceItemId: string;
  shipmentId: string;
  systemOrderNo: string;
  transferNo?: string;
  customerCode: string;
  customerName: string;
  salesperson?: string;
  agentName?: string;
  feeName?: string;
  amount: number;
  currency: string;
  paymentNo?: string;
  status: 'PENDING' | 'READY' | 'APPLIED' | 'INVALIDATED' | 'PAID';
  applicationStatus?: 'PENDING' | 'APPLIED' | 'INVALIDATED' | 'PAID';
  bankAccount?: AgentBankAccountSummary;
  paymentApplicationNo?: string;
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  invalidatedAt?: string;
  remark?: string;
};
export { App };
export { cleanup };

export const employeeShipments = [
  shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_DISPATCH', '9409-Daloday', { agentName: '' }),
  shipment('s-3', 'SYGJ06061230003', 'LBL-0606-US', 'WAITING_DISPATCH', '9409-Daloday', { carrier: 'UPS', channelName: 'UPS 加美线', agentName: '加美代理' }),
  shipment('s-confirm', 'SYGJ06061230004', 'OUT-CONFIRM', 'OUTBOUNDED', '9409-Daloday', {
    destinationCountry: '美国',
    packageCount: 2,
    receivableWeightKg: 12.5,
    declarationRequired: true,
    sensitive: true,
    outboundAt: '2026-06-06T10:00:00.000Z',
    latestTracking: '仓库已出库，等待客服数据确认'
  }),
  shipment('s-2', 'SYGJ05291344165', 'TILL-0529', 'WAITING_DEPARTURE', '1344-TILL', {
    customerCode: '1344',
    transferNo: '9064656160',
    trackingStaleDays: 9,
    hasProblemTicket: true,
    dispatchedAt: '2026-06-02T10:00:00.000Z'
  }),
  shipment('s-delivering', 'SYGJ06061239999', 'DLV-0606', 'DELIVERING', '9409-Daloday', {
    transferNo: '1ZDELIVERING',
    latestTracking: '已派送，等待业务确认签收',
    outboundAt: '2026-06-02T10:00:00.000Z',
    etdAt: '2026-06-06T10:00:00.000Z',
    etaAt: '2026-06-16T10:00:00.000Z'
  }),
  shipment('s-arrived', 'SYGJ06061238888', 'ARR-0606', 'ARRIVED_PORT', '9409-Daloday', {
    transferNo: '1ZARRIVED',
    latestTracking: '已到港，等待派送/提取',
    outboundAt: '2026-06-02T10:00:00.000Z',
    etdAt: '2026-06-06T10:00:00.000Z',
    etaAt: '2026-06-16T10:00:00.000Z'
  }),
  shipment('s-review', 'SYREVIEW000001', 'OUT-1', 'REVIEW_PENDING', '9409-Daloday', {
    productName: '测试产品',
    cargoType: '普货',
    settlementMethod: '月结',
    declarationRequired: false,
    sensitive: false,
    entryBy: 'operator',
    latestTracking: '财务录单创建，待审核'
  }),
  shipment('s-review-deleted', 'SYREVIEWDEL001', 'OUT-DEL', 'REVIEW_PENDING', '9409-Daloday', {
    productName: '已删除测试产品',
    cargoType: '普货',
    settlementMethod: '月结',
    declarationRequired: false,
    sensitive: false,
    entryBy: 'operator',
    latestTracking: '审核台删除',
    deletedAt: '2026-06-22T10:00:00.000Z',
    deletedBy: 'admin',
    deletedReason: '测试删除',
    deleteType: 'MANUAL'
  })
];
const customerShipments: Shipment[] = [shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_DEPARTURE', '9409-Daloday', { transferNo: 'DHL26060600001', latestTracking: '已生成面单' })];
const shipmentLabels = [
  {
    id: 'lbl-s-3',
    shipmentId: 's-3',
    carrier: 'UPS',
    channelName: 'UPS 加美线',
    labelNo: 'LBL26060600001',
    transferNo: '1Z26060600001',
    labelUrl: '/mock-labels/LBL26060600001.pdf',
    status: 'CREATED',
    createdAt: '2026-06-06T10:00:00.000Z'
  }
];
const problemTickets: ProblemTicketSummary[] = [
  {
    id: 'pt-1',
    shipmentId: 's-2',
    systemOrderNo: 'SYGJ05291344165',
    customerName: '1344-TILL',
    reason: '轨迹超过3天未更新',
    status: 'OPEN',
    customerVisible: true,
    createdAt: '2026-06-06T10:00:00Z',
    replies: []
  }
];
const receivableFees: ReceivableAuditSummary[] = [
  { id: 'rf-1', shipmentId: 's-1', systemOrderNo: 'SYGJ06061230001', customerName: '9409-Daloday', name: '基础运费', amount: 200, settled: false, salesperson: 'Rachel', customerId: 'c-9409', customerCode: '9409', transferNo: 'DHL26060600001', currency: 'USD', settlementMethod: '思远阿里', paymentNo: '4654316987986131', createdAt: '2026-06-17T10:00:00.000Z', createdBy: 'Rachel', reconciliationStatus: 'PENDING', sourceType: 'SYSTEM' },
  { id: 'rf-2', shipmentId: 's-1', systemOrderNo: 'SYGJ06061230001', customerName: '9409-Daloday', name: '燃油费', amount: 30, settled: false, salesperson: 'Rachel', customerId: 'c-9409', customerCode: '9409', transferNo: 'DHL26060600001', currency: 'USD', settlementMethod: '思远阿里', paymentNo: '4654316987986131', createdAt: '2026-06-17T10:00:00.000Z', createdBy: 'Rachel', reconciliationStatus: 'PENDING', sourceType: 'SYSTEM' }
];
const businessCostFees: BusinessCostAuditSummary[] = [
  {
    id: 'bc-1',
    shipmentId: 's-1',
    name: '空运业务成本',
    amount: 160,
    settled: false,
    type: 'BUSINESS_COST',
    currency: 'RMB',
    settlementMethod: '月结',
    paymentNo: 'BC-20260617001',
    reconciliationStatus: 'PENDING',
    createdAt: '2026-06-17T10:30:00.000Z',
    createdBy: 'Rachel',
    remark: '测试业务成本',
    sourceType: 'MANUAL',
    chargeWeightKg: 8,
    unitPrice: 20,
    salesperson: 'Rachel',
    customerCode: '9409',
    customerName: '9409-Daloday',
    customerOrderNo: 'RCV-0606',
    systemOrderNo: 'SYGJ06061230001',
    transferNo: 'DHL26060600001',
    receivableTotal: 230,
    businessCostTotal: 160,
    businessProfit: 70,
    canViewAgent: true,
    canViewProfit: true
  }
];
const payableAuditFees: PayableAuditSummary[] = [
  {
    id: 'pf-audit-1',
    shipmentId: 's-1',
    name: '代理运费',
    amount: 140,
    settled: false,
    agentName: '宇环',
    currency: 'RMB',
    settlementMethod: '月结',
    paymentNo: 'PAY-20260617001',
    reconciliationStatus: 'PENDING',
    createdAt: '2026-06-17T10:40:00.000Z',
    createdBy: 'finance',
    remark: '测试应付',
    sourceType: 'MANUAL',
    salesperson: 'Rachel',
    customerCode: '9409',
    customerName: '9409-Daloday',
    customerOrderNo: 'RCV-0606',
    systemOrderNo: 'SYGJ06061230001',
    transferNo: 'DHL26060600001',
    payableTotal: 140,
    agentChannel: 'DHL HK',
    rmbAmount: 140,
    orderRmbTotal: 140,
    receivableProfit: 90,
    operationProfit: 20,
    canViewSensitivePayable: true,
    canViewProfit: true
  }
];
const initialAgentBankAccounts: AgentBankAccountSummary[] = [{
  id: 'agent-bank-yuhuan-rmb',
  agentId: 'a-yuhuan',
  agentName: '深圳宇环',
  accountName: '深圳宇环',
  bankName: '招商银行深圳分行',
  bankAccountNo: '6222000000009409',
  currency: 'RMB',
  enabled: true,
  createdAt: '2026-06-17T12:45:00.000Z',
  updatedAt: '2026-06-17T12:45:00.000Z'
}];
const agentBankAccounts: AgentBankAccountSummary[] = initialAgentBankAccounts.map((item) => ({ ...item }));
const payablePaymentApplications: TestPayablePaymentApplication[] = [];
const payeeBankAccounts: PayeeBankAccountSummary[] = [{
  id: 'payee-bank-yuhuan-rmb',
  agentId: 'a-yuhuan',
  agentName: '深圳宇环',
  accountName: '深圳宇环',
  bankName: '招商银行深圳分行',
  bankAccountNo: '6222000000009409',
  currency: 'RMB',
  enabled: true,
  createdAt: '2026-06-17T12:45:00.000Z',
  updatedAt: '2026-06-17T12:45:00.000Z'
}];
const paymentApplications: PaymentApplicationSummary[] = [];
const paymentVouchers: PaymentVoucherSummary[] = [];

function createShipmentFinanceResponse(shipmentId: string, role: string) {
  const shipment = employeeShipments.find((item) => item.id === shipmentId);
  const shipmentReceivables = receivableFees.filter((fee) => fee.shipmentId === shipmentId);
  const canViewInternalFinance = role === 'ADMIN' || role === 'FINANCE';
  const payables = payableAuditFees
    .filter((fee) => fee.shipmentId === shipmentId && fee.reconciliationStatus !== 'VOIDED')
    .map((fee) => ({ ...fee, type: 'PAYABLE' as const, chargeWeightKg: fee.chargeWeightKg ?? 8, unitPrice: fee.unitPrice ?? 17.5, amountOverridden: fee.amountOverridden ?? false }));
  const businessCosts = businessCostFees
    .filter((fee) => fee.shipmentId === shipmentId && fee.reconciliationStatus !== 'VOIDED')
    .map((fee) => ({ ...fee, amountOverridden: fee.amountOverridden ?? false }));
  const receivableTotal = shipmentReceivables.reduce((sum, fee) => sum + fee.amount, 0);
  const payableTotal = payables.reduce((sum, fee) => sum + fee.amount, 0);
  const businessCostTotal = businessCosts.reduce((sum, fee) => sum + fee.amount, 0);
  return {
    shipmentId,
    systemOrderNo: shipment?.systemOrderNo ?? 'UNKNOWN',
    agentName: canViewInternalFinance ? shipment?.agentName : undefined,
    receivables: shipmentReceivables,
    payables: canViewInternalFinance ? payables : [],
    businessCosts,
    receivableTotal,
    payableTotal: canViewInternalFinance ? payableTotal : 0,
    businessCostTotal,
    grossProfit: canViewInternalFinance ? receivableTotal - payableTotal : undefined,
    canViewPayables: canViewInternalFinance,
    profitSections: [
      ...(canViewInternalFinance ? [{ key: 'RECEIVABLE_PAYABLE', title: '应收与应付利润', amount: receivableTotal - payableTotal, currency: 'RMB' }] : []),
      { key: 'RECEIVABLE_BUSINESS', title: '应收与业务利润', amount: receivableTotal - businessCostTotal, currency: 'RMB' },
      ...(canViewInternalFinance ? [{ key: 'BUSINESS_PAYABLE', title: '业务与应付利润', amount: businessCostTotal - payableTotal, currency: 'RMB' }] : [])
    ],
    paymentAmountUsd: shipment?.paymentAmountUsd,
    paymentAmountCny: shipment?.paymentAmountCny,
    paymentMethod: shipment?.paymentMethod
  };
}
const customerStatements = [
  {
    id: 'cs-1',
    customerId: 'c-9409',
    customerName: '9409-Daloday',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    total: 230,
    feeCount: 2,
    status: 'DRAFT',
    createdAt: '2026-06-06T10:00:00.000Z'
  }
];
const customerAccounts: CustomerAccountSummary[] = [
  { customerId: 'c-9409', customerName: '9409-Daloday', balance: 10000, currency: 'RMB' }
];
const accountLedger: AccountLedgerSummary[] = [
  { id: 'al-seed-1', customerId: 'c-9409', customerName: '9409-Daloday', amount: 10000, balance: 10000, note: '期初余额', createdAt: '2026-06-01T10:00:00.000Z' }
];
const sites: SiteSummary[] = [
  { id: 'site-shenzhen-siyuan', sortOrder: 1, name: '深圳思远', enabled: true },
  { id: 'site-shenzhen-siyuan-wuhan', sortOrder: 2, name: '深圳思远武汉', enabled: true },
  { id: 'site-zhangzhou-sihua', sortOrder: 3, name: '漳州思华', enabled: true },
  { id: 'site-wuhan-jiuyulian', sortOrder: 4, name: '武汉九域联', enabled: true }
];
const waterReceipts: WaterReceiptSummary[] = [
  {
    id: 'wr-seed-1',
    receiptNo: 'SD20260601001',
    site: '思远收款',
    customerId: 'c-9409',
    customerCode: '9409',
    customerName: '9409-Daloday',
    salesperson: 'Rachel',
    receiptMethod: '对公',
    receiptDate: '2026-06-01T10:00:00.000Z',
    currency: 'RMB',
    amount: 10000,
    matchedAmount: 0,
    balance: 10000,
    paymentNo: 'PAY-WR-001',
    status: 'ARRIVED',
    matches: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z'
  }
];
const companyChannelDefaults = {
  businessType: 'EXPRESS' as const,
  category: 'DHL',
  volumeDivisor: 5000,
  multiPieceWeightRule: 'SUM_THEN_COMPARE',
  singleWeightRoundingRule: 'ACTUAL',
  settlementWeightRule: 'MAX_ACTUAL_VOLUME',
  settlementWeightRoundingRule: 'NONE',
  remoteAreaRule: 'NONE'
};
const carrierTasks: CarrierTaskSummary[] = [
  {
    id: 'ct-1',
    shipmentId: 's-2',
    systemOrderNo: 'SYGJ05291344165',
    customerName: '1344-TILL',
    type: 'TRACKING_SYNC',
    carrier: 'DHL',
    transferNo: '9064656160',
    status: 'PENDING',
    attempts: 0,
    createdAt: '2026-06-06T10:00:00.000Z',
    updatedAt: '2026-06-06T10:00:00.000Z'
  },
  {
    id: 'ct-2',
    shipmentId: 's-3',
    systemOrderNo: 'SYGJ06061230003',
    customerName: '9409-Daloday',
    type: 'TRACKING_SYNC',
    carrier: 'UPS',
    transferNo: '1Z26060600001',
    status: 'FAILED',
    attempts: 1,
    lastError: '模拟承运商接口失败',
    createdAt: '2026-06-06T10:00:00.000Z',
    updatedAt: '2026-06-06T10:01:00.000Z'
  }
];
const pricingRules: PricingRuleSummary[] = [
  {
    id: 'pr-dhl-us-0-5',
    channelId: 'ch-dhl-hk',
    channelName: 'DHL HK',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 5,
    ratePerKg: 10,
    currency: 'USD',
    enabled: true
  }
];
const importedPriceBooks: PriceBookSummary[] = [];
const importedPriceRows: PriceBookRowSummary[] = [];
const backendSeedPriceRows: PriceBookRowSummary[] = [
  { id: 'price-a-la-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美西快线海卡渠道汇总', channelName: '海运洛杉矶专线', businessRouteName: 'HK-DHL', realChannelName: 'DHK03', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 18, currency: 'RMB', transitDays: 25, transitLabel: '22-28 天' },
  { id: 'price-a-houston-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美中快线海卡渠道汇总', channelName: '海运休斯顿专线', businessRouteName: 'HK-DHL', realChannelName: 'DHK01', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 19, currency: 'RMB', transitDays: 22, transitLabel: '20-25 天' },
  { id: 'price-a-air-la-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美西快线海卡渠道汇总', channelName: '空运洛杉矶专线', realChannelName: 'DHL-A', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 32, currency: 'RMB', transitDays: 7, transitLabel: '5-9 天' }
];
const financeCatalogItems: FinanceCatalogItemSummary[] = [
  { id: 'fc-fee-freight', category: 'FEE_NAME', name: '基础运费', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-fuel', category: 'FEE_NAME', name: '燃油费', currency: 'RMB', sortOrder: 2, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-settlement-monthly', category: 'SETTLEMENT_METHOD', name: '月结', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-cargo-normal', category: 'CARGO_TYPE', name: '普货', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-product-desk', category: 'PRODUCT_NAME', name: '桌子', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }
];
const initialFinanceCatalogItems = financeCatalogItems.map((item) => ({ ...item }));
const agentMarkupRules: AgentMarkupSummary[] = [
  { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, enabled: true },
  { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, enabled: true }
];
const warehousePackages: WarehousePackageSummary[] = [
  { id: 'wh-1399-1', customerCode: '1399', site: '深圳站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, chargeableWeightKg: 50.05, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:07:28.000+08:00', remark: '木架，外箱轻微磨损', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:07:28.000+08:00' },
  { id: 'wh-1399-2', customerCode: '1399', site: '深圳站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 13.9, lengthCm: 130, widthCm: 46, heightCm: 51, cbm: 0.30498, volumetricWeightKg: 50.83, chargeableWeightKg: 50.83, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:08:08.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:08:08.000+08:00' },
  { id: 'wh-1399-3', customerCode: '1399', site: '深圳站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 129, widthCm: 46, heightCm: 51, cbm: 0.302634, volumetricWeightKg: 50.44, chargeableWeightKg: 50.44, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:08:48.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:08:48.000+08:00' },
  { id: 'wh-p710-1', customerCode: 'P710', site: '广州站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', combinedOrderNo: 'P710-999056444656', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 8.6, lengthCm: 90, widthCm: 40, heightCm: 42, cbm: 0.1512, volumetricWeightKg: 25.2, chargeableWeightKg: 25.2, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-09T09:15:03.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-09T09:15:03.000+08:00' }
];
const initialWarehousePackages = warehousePackages.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }));
const warehouseTallyTasks: WarehouseTallyTaskSummary[] = [];
const masterData: MasterDataSnapshot = {
  customers: [{ id: 'c-9409', code: '9409', name: 'Daloday', shortName: 'Daloday', fullName: 'Daloday Inc.', customerType: '直客', salesperson: 'operator', enabled: true }],
  contacts: [{ id: 'cc-9409-main', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Lina', company: 'Daloday Inc.', phone: '13800000001', email: 'lina@example.com', address: '9409 Sample Street', country: 'US', state: 'CA', postalCode: '90001', enabled: true }],
  customerUsers: [{ id: 'u-customer', customerId: 'c-9409', customerName: '9409-Daloday', username: 'customer', enabled: true }],
  agents: [{
    id: 'a-yuhuan',
    code: 'YH',
    shortName: '宇环',
    name: '深圳宇环',
    warehouseAddress1: '深圳市宝安区宇环仓一',
    warehouseAddress2: '深圳市宝安区宇环仓二',
    warehouseAddress3: '深圳市宝安区宇环仓三',
    warehouseContact: '宇环仓库',
    invoiceTemplateName: '宇环发票模板.xlsx',
    invoiceTemplateUrl: '/templates/yuhuan-invoice.xlsx',
    enabled: true
  }],
  agentChannels: [{ id: 'ach-yuhuan-dhl', agentId: 'a-yuhuan', agentName: '宇环', channelName: '宇环 DHL', enabled: true }],
  carriers: [{ id: 'cr-dhl', name: 'DHL', enabled: true }],
  channelCategories: [
    { id: 'cc-ups', name: 'UPS', enabled: true },
    { id: 'cc-dhl', name: 'DHL', enabled: true },
    { id: 'cc-fedex', name: 'FEDEX', enabled: true },
    { id: 'cc-ems', name: 'EMS', enabled: true },
    { id: 'cc-dpd', name: 'DPD', enabled: true },
    { id: 'cc-truck', name: '卡车', enabled: true }
  ],
  channels: [{ id: 'ch-dhl-hk', name: 'DHL HK', carrierId: 'cr-dhl', carrierName: 'DHL', ...companyChannelDefaults, enabled: true }],
  surcharges: [{ id: 'sc-remote', name: '偏远附加费', amount: 50, enabled: true }],
  fuelRates: [{ id: 'fr-dhl', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.15, activeAt: '2026-06-06T00:00:00.000Z' }],
  exchangeRates: [{ id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'RMB', rate: 7.245, activeAt: '2026-06-06T00:00:00.000Z', endAt: '2026-12-31T23:59:59.000Z', enabled: true }],
  roles: ['ADMIN', 'WAREHOUSE', 'CUSTOMER']
};
const systemRoleMatrix = {
  availablePermissions: [
    { code: 'workspace:access', label: '运营工作台', group: '工作台' },
    { code: 'orders:read', label: '运单查看', group: '我的订单' },
    { code: 'orders:write', label: '运单操作', group: '我的订单' },
    { code: 'routing:read', label: '渠道排货查看', group: '渠道排货' },
    { code: 'routing:write', label: '渠道排货操作', group: '渠道排货' },
    { code: 'warehouse:read', label: '仓库查看', group: '仓库管理' },
    { code: 'warehouse:write', label: '仓库操作', group: '仓库管理' },
    { code: 'tracking:read', label: '轨迹查看', group: '轨迹监控' },
    { code: 'tracking:write', label: '轨迹操作', group: '轨迹监控' },
    { code: 'problems:read', label: '问题件查看', group: '问题件' },
    { code: 'problems:write', label: '问题件处理', group: '问题件' },
    { code: 'pricing:lookup', label: '报价查询', group: '报价查价' },
    { code: 'pricing:manage', label: '报价管理', group: '报价查价' },
    { code: 'finance:read', label: '财务查看', group: '财务结算' },
    { code: 'finance:settle', label: '财务核销', group: '财务结算' },
    { code: 'finance:business-cost:read', label: '业务员成本查看', group: '财务结算' },
    { code: 'finance:business-cost:manage', label: '业务员成本维护', group: '财务结算' },
    { code: 'finance:business-cost:audit', label: '业务员成本审核', group: '财务结算' },
    { code: 'finance:business-cost:reverse', label: '业务员成本反审核', group: '财务结算' },
    { code: 'finance:business-cost:void', label: '业务员成本作废', group: '财务结算' },
    { code: 'finance:business-cost:export', label: '业务员成本导出', group: '财务结算' },
    { code: 'finance:business-cost:view-all', label: '业务员成本查看全部', group: '财务结算' },
    { code: 'finance:business-cost:view-agent', label: '业务员成本查看代理', group: '财务结算' },
    { code: 'finance:business-cost:view-profit', label: '业务员成本查看利润', group: '财务结算' },
    { code: 'finance:order-fee:payable:view', label: '单票费用查看应付', group: '财务结算' },
    { code: 'finance:order-fee:payable:manage', label: '单票费用维护应付', group: '财务结算' },
    { code: 'finance:order-fee:profit:receivable-payable', label: '单票费用应收应付利润', group: '财务结算' },
    { code: 'finance:order-fee:profit:receivable-business', label: '单票费用应收业务利润', group: '财务结算' },
    { code: 'finance:order-fee:profit:business-payable', label: '单票费用业务应付利润', group: '财务结算' },
    { code: 'finance:payable:read', label: '应付审核查看', group: '财务结算' },
    { code: 'finance:payable:manage', label: '应付费用维护', group: '财务结算' },
    { code: 'finance:payable:audit', label: '应付费用审核', group: '财务结算' },
    { code: 'finance:payable:reverse', label: '应付反审核', group: '财务结算' },
    { code: 'finance:payable:void', label: '应付作废', group: '财务结算' },
    { code: 'finance:payable:export', label: '应付导出', group: '财务结算' },
    { code: 'finance:payable:payment', label: '待付款维护', group: '财务结算' },
    { code: 'finance:payable:bank', label: '代理银行维护', group: '财务结算' },
    { code: 'finance:payable:attachment', label: '应付账单截图', group: '财务结算' },
    { code: 'finance:payable:view-sensitive', label: '应付敏感字段', group: '财务结算' },
    { code: 'finance:payable:view-profit', label: '应付利润查看', group: '财务结算' },
    { code: 'finance:payable:paid-read', label: '已付款查看', group: '财务结算' },
    { code: 'finance:payable:paid-confirm', label: '确认付款', group: '财务结算' },
    { code: 'finance:payable:paid-reverse', label: '已付款反核销', group: '财务结算' },
    { code: 'finance:payable:paid-export', label: '已付款导出', group: '财务结算' },
    { code: 'finance:payable:paid-voucher', label: '付款水单维护', group: '财务结算' },
    { code: 'finance:payable:paid-bank-view', label: '付款银行查看', group: '财务结算' },
    { code: 'reports:read', label: '统计报表', group: '统计报表' },
    { code: 'master-data:read', label: '基础资料查看', group: '基础资料' },
    { code: 'master-data:write', label: '基础资料维护', group: '基础资料' },
    { code: 'master-data:agents:read', label: '代理资料查看', group: '基础资料' },
    { code: 'master-data:agents:write', label: '代理资料维护', group: '基础资料' },
    { code: 'master-data:channels:read', label: '公司渠道查看', group: '基础资料' },
    { code: 'master-data:channels:write', label: '公司渠道维护', group: '基础资料' },
    { code: 'system:manage', label: '系统设置', group: '系统设置' }
  ],
  roles: [
    {
      key: 'ADMIN',
      label: '管理员组',
      account: 'admin',
      scope: '全局数据',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'orders:review:restore', 'orders:review:purge', 'routing:read', 'routing:write', 'warehouse:read', 'warehouse:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'pricing:manage', 'finance:read', 'finance:settle', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:audit', 'finance:business-cost:reverse', 'finance:business-cost:void', 'finance:business-cost:export', 'finance:business-cost:view-all', 'finance:business-cost:view-agent', 'finance:business-cost:view-profit', 'finance:order-fee:payable:view', 'finance:order-fee:payable:manage', 'finance:order-fee:profit:receivable-payable', 'finance:order-fee:profit:receivable-business', 'finance:order-fee:profit:business-payable', 'finance:payable:read', 'finance:payable:manage', 'finance:payable:audit', 'finance:payable:reverse', 'finance:payable:void', 'finance:payable:export', 'finance:payable:payment', 'finance:payable:bank', 'finance:payable:attachment', 'finance:payable:view-sensitive', 'finance:payable:view-profit', 'finance:payable:paid-read', 'finance:payable:paid-confirm', 'finance:payable:paid-reverse', 'finance:payable:paid-export', 'finance:payable:paid-voucher', 'finance:payable:paid-bank-view', 'reports:read', 'master-data:read', 'master-data:write', 'master-data:agents:read', 'master-data:agents:write', 'master-data:channels:read', 'master-data:channels:write', 'system:manage'],
      restriction: '全部权限'
    },
    {
      key: 'CUSTOMER_SERVICE',
      label: '客服',
      account: 'service',
      scope: '客户与问题件',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'],
      restriction: '不能核销、不能改系统权限'
    },
    {
      key: 'OPERATOR',
      label: '业务员',
      account: 'operator',
      scope: '客户出货与渠道排货',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:view-profit', 'finance:order-fee:profit:receivable-business', 'master-data:read'],
      restriction: '不能改财务、不能改权限'
    },
    {
      key: 'WAREHOUSE',
      label: '仓库',
      account: 'warehouse',
      scope: '入库、理货、打单、出货',
      permissions: ['workspace:access', 'orders:read', 'warehouse:read', 'warehouse:write', 'tracking:read'],
      restriction: '不能访问报价管理、财务和系统设置'
    },
    {
      key: 'FINANCE',
      label: '财务',
      account: 'finance',
      scope: '财务数据',
      permissions: ['workspace:access', 'orders:read', 'orders:review:restore', 'pricing:lookup', 'finance:read', 'finance:settle', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:audit', 'finance:business-cost:reverse', 'finance:business-cost:void', 'finance:business-cost:export', 'finance:business-cost:view-all', 'finance:business-cost:view-agent', 'finance:business-cost:view-profit', 'finance:order-fee:payable:view', 'finance:order-fee:payable:manage', 'finance:order-fee:profit:receivable-payable', 'finance:order-fee:profit:receivable-business', 'finance:order-fee:profit:business-payable', 'finance:payable:read', 'finance:payable:manage', 'finance:payable:audit', 'finance:payable:reverse', 'finance:payable:void', 'finance:payable:export', 'finance:payable:payment', 'finance:payable:bank', 'finance:payable:attachment', 'finance:payable:view-sensitive', 'finance:payable:view-profit', 'finance:payable:paid-read', 'finance:payable:paid-confirm', 'finance:payable:paid-reverse', 'finance:payable:paid-export', 'finance:payable:paid-voucher', 'finance:payable:paid-bank-view', 'reports:read', 'master-data:read'],
      restriction: '不能改系统权限'
    },
    {
      key: 'CUSTOMER',
      label: '客户',
      account: 'customer',
      scope: '本人客户数据',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'finance:read', 'problems:read', 'problems:write', 'pricing:lookup'],
      restriction: '客户门户、本人运单、本人费用、本人问题件'
    }
  ]
};
systemRoleMatrix.roles.forEach((role, index) => {
  (role as Record<string, unknown>).sortOrder = role.key === 'CUSTOMER' ? 106 : 100 + index;
  (role as Record<string, unknown>).enabled = true;
  (role as Record<string, unknown>).systemBuiltin = true;
});
(systemRoleMatrix.roles.find((role) => role.key === 'ADMIN') as Record<string, unknown>).sortOrder = 0;
(systemRoleMatrix.roles.find((role) => role.key === 'ADMIN') as Record<string, unknown>).systemBuiltin = false;
[
  { key: 'UG_WAREHOUSE_RECEIVE', label: '仓库收货', site: '深圳思远', sortOrder: 1, template: 'WAREHOUSE' },
  { key: 'UG_WAREHOUSE_OUTBOUND', label: '仓库出货', site: '深圳思远', sortOrder: 2, template: 'WAREHOUSE' },
  { key: 'UG_CUSTOMER_SERVICE', label: '客服', description: '处理一般客服工作', site: '深圳思远', sortOrder: 3, template: 'CUSTOMER_SERVICE' },
  { key: 'UG_FINANCE', label: '财务', site: '深圳思远', sortOrder: 4, template: 'FINANCE' },
  { key: 'UG_PAYABLE_FINANCE', label: '出入账财务', description: '处理代理结算', site: '深圳思远', sortOrder: 5, template: 'FINANCE' },
  { key: 'UG_MARKET', label: '市场部', description: '处理排货', site: '深圳思远', sortOrder: 6, template: 'OPERATOR' },
  { key: 'UG_BUSINESS', label: '业务部', sortOrder: 7, template: 'OPERATOR' },
  { key: 'UG_SZ_WUHAN', label: '深圳思远武汉', sortOrder: 8, template: 'OPERATOR' },
  { key: 'UG_ZZ_SIHUA', label: '漳州思华', sortOrder: 9, template: 'OPERATOR' },
  { key: 'UG_WH_JIUYULIAN', label: '武汉九域联', sortOrder: 10, template: 'OPERATOR' },
  { key: 'UG_BUSINESS_MANAGER', label: '业务经理', sortOrder: 11, template: 'OPERATOR' },
  { key: 'UG_BUSINESS_SUPERVISOR', label: '业务主管', sortOrder: 12, template: 'OPERATOR' }
].forEach((group) => {
  const template = systemRoleMatrix.roles.find((role) => role.key === group.template);
  (systemRoleMatrix.roles as Array<Record<string, unknown>>).push({
    key: group.key,
    label: group.label,
    account: '-',
    scope: '自定义用户组',
    permissions: [...(template?.permissions ?? [])],
    restriction: '按勾选权限执行',
    description: group.description,
    site: group.site,
    sortOrder: group.sortOrder,
    enabled: true,
    systemBuiltin: false
  });
});
const staffAccounts: StaffAccountSummary[] = [
  { id: 'u-admin', username: 'admin', role: 'ADMIN', roleLabel: '管理员组', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
  { id: 'u-service', username: 'service', role: 'UG_CUSTOMER_SERVICE', roleLabel: '客服', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
  { id: 'u-operator', username: 'operator', role: 'UG_BUSINESS', roleLabel: '业务部', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
  { id: 'u-warehouse', username: 'warehouse', role: 'UG_WAREHOUSE_RECEIVE', roleLabel: '仓库收货', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
  { id: 'u-finance', username: 'finance', role: 'UG_FINANCE', roleLabel: '财务', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' }
];
const auditLogs: AuditLogSummary[] = [
  {
    id: 'audit-master-channel-update',
    actorId: 'u-admin',
    actorUsername: 'admin',
    action: 'master_data.channel.update',
    actionLabel: '修改',
    module: 'master_data',
    moduleLabel: '基础资料',
    target: 'ch-dhl-hk',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { name: 'DHL HK', enabled: true },
    after: { name: 'DHL HK', enabled: false },
    createdAt: '2026-06-28T10:00:00.000Z'
  },
  {
    id: 'audit-security-denied',
    actorId: 'u-service',
    actorUsername: 'service',
    action: 'security.permission.denied',
    actionLabel: '权限拒绝',
    module: 'security',
    moduleLabel: '安全',
    target: 'GET /api/finance/catalog?category=SETTLEMENT_METHOD',
    result: 'FAILED',
    resultLabel: '失败',
    before: { permissions: ['system:manage'] },
    after: { granted: false },
    createdAt: '2026-06-28T10:05:00.000Z'
  },
  {
    id: 'audit-agent-approved-s-2',
    actorId: 'u-service',
    actorUsername: 'service',
    action: 'customer_service.agent_data.approved',
    actionLabel: '代理数据审核通过',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 's-2',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { agentDataReviewStatus: 'PENDING' },
    after: { agentDataReviewStatus: 'APPROVED' },
    createdAt: '2026-06-05T10:00:00.000Z'
  },
  {
    id: 'audit-agent-approved-s-delivering',
    actorId: 'u-service',
    actorUsername: 'service',
    action: 'customer_service.agent_data.approved',
    actionLabel: '代理数据审核通过',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 's-delivering',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { agentDataReviewStatus: 'PENDING' },
    after: { agentDataReviewStatus: 'APPROVED' },
    createdAt: '2026-06-14T10:00:00.000Z'
  },
  {
    id: 'audit-arrived-s-delivering',
    actorId: 'u-admin',
    actorUsername: 'admin',
    action: 'customer_service.status.update',
    actionLabel: '客服状态更新',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 's-delivering',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { status: 'DEPARTED' },
    after: { statusFrom: 'DEPARTED', statusTo: 'ARRIVED_PORT', statusAt: '2026-06-16T10:00:00.000Z', changedBy: 'admin' },
    createdAt: '2026-06-16T10:00:00.000Z'
  },
  {
    id: 'audit-track-s-delivering',
    actorId: 'u-admin',
    actorUsername: 'admin',
    action: 'shipment.operational.update',
    actionLabel: '运单操作更新',
    module: 'orders',
    moduleLabel: '我的订单',
    target: 's-delivering',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: {},
    after: { trackingWebsite: 'https://track.example/1ZDELIVERING', trackingWebsiteVisibleToSales: false },
    createdAt: '2026-06-16T10:01:00.000Z'
  },
  {
    id: 'audit-agent-approved-s-arrived',
    actorId: 'u-service',
    actorUsername: 'service',
    action: 'customer_service.agent_data.approved',
    actionLabel: '代理数据审核通过',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 's-arrived',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { agentDataReviewStatus: 'PENDING' },
    after: { agentDataReviewStatus: 'APPROVED' },
    createdAt: '2026-06-15T10:00:00.000Z'
  },
  {
    id: 'audit-arrived-s-arrived',
    actorId: 'u-admin',
    actorUsername: 'admin',
    action: 'customer_service.status.update',
    actionLabel: '客服状态更新',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 's-arrived',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { status: 'DEPARTED' },
    after: { statusFrom: 'DEPARTED', statusTo: 'ARRIVED_PORT', statusAt: '2026-06-16T09:00:00.000Z', changedBy: 'admin' },
    createdAt: '2026-06-16T09:00:00.000Z'
  },
  {
    id: 'audit-track-s-arrived',
    actorId: 'u-admin',
    actorUsername: 'admin',
    action: 'shipment.operational.update',
    actionLabel: '运单操作更新',
    module: 'orders',
    moduleLabel: '我的订单',
    target: 's-arrived',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: {},
    after: { trackingWebsite: 'https://track.example/1ZARRIVED', trackingWebsiteVisibleToSales: false },
    createdAt: '2026-06-16T09:01:00.000Z'
  },
  {
    id: 'audit-problem-pt-1',
    actorId: 'u-admin',
    actorUsername: 'admin',
    action: 'customer_service.issue.attach',
    actionLabel: '客服挂载问题件',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 'pt-1',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: null,
    after: { shipmentId: 's-2', originalStatus: 'WAITING_DEPARTURE', originalStatusPool: 'WAITING_DEPARTURE', issueId: 'pt-1', issueType: '轨迹超过3天未更新', handledBy: 'admin', attachedAt: '2026-06-06T10:00:00Z' },
    createdAt: '2026-06-06T10:00:00Z'
  }
];

beforeEach(() => {
  localStorage.clear();
  employeeShipments.splice(
    0,
    employeeShipments.length,
    shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_DISPATCH', '9409-Daloday', { agentName: '' }),
    shipment('s-3', 'SYGJ06061230003', 'LBL-0606-US', 'WAITING_DISPATCH', '9409-Daloday', { carrier: 'UPS', channelName: 'UPS 加美线', agentName: '加美代理' }),
    shipment('s-confirm', 'SYGJ06061230004', 'OUT-CONFIRM', 'OUTBOUNDED', '9409-Daloday', {
      destinationCountry: '美国',
      packageCount: 2,
      receivableWeightKg: 12.5,
      declarationRequired: true,
      sensitive: true,
      outboundAt: '2026-06-06T10:00:00.000Z',
      latestTracking: '仓库已出库，等待客服数据确认'
    }),
    shipment('s-2', 'SYGJ05291344165', 'TILL-0529', 'WAITING_DEPARTURE', '1344-TILL', {
      customerCode: '1344',
      transferNo: '9064656160',
      trackingStaleDays: 9,
      hasProblemTicket: true,
      dispatchedAt: '2026-06-02T10:00:00.000Z'
    }),
    shipment('s-delivering', 'SYGJ06061239999', 'DLV-0606', 'DELIVERING', '9409-Daloday', {
      transferNo: '1ZDELIVERING',
      latestTracking: '已派送，等待业务确认签收',
      outboundAt: '2026-06-02T10:00:00.000Z',
      etdAt: '2026-06-06T10:00:00.000Z',
      etaAt: '2026-06-16T10:00:00.000Z'
    }),
    shipment('s-arrived', 'SYGJ06061238888', 'ARR-0606', 'ARRIVED_PORT', '9409-Daloday', {
      transferNo: '1ZARRIVED',
      latestTracking: '已到港，等待派送/提取',
      outboundAt: '2026-06-02T10:00:00.000Z',
      etdAt: '2026-06-06T10:00:00.000Z',
      etaAt: '2026-06-16T10:00:00.000Z'
    }),
    shipment('s-review', 'SYREVIEW000001', 'OUT-1', 'REVIEW_PENDING', '9409-Daloday', {
      productName: '测试产品',
      cargoType: '普货',
      settlementMethod: '月结',
      declarationRequired: false,
      sensitive: false,
      entryBy: 'operator',
      latestTracking: '财务录单创建，待审核'
    }),
    shipment('s-review-deleted', 'SYREVIEWDEL001', 'OUT-DEL', 'REVIEW_PENDING', '9409-Daloday', {
      productName: '已删除测试产品',
      cargoType: '普货',
      settlementMethod: '月结',
      declarationRequired: false,
      sensitive: false,
      entryBy: 'operator',
      latestTracking: '审核台删除',
      deletedAt: '2026-06-22T10:00:00.000Z',
      deletedBy: 'admin',
      deletedReason: '测试删除',
      deleteType: 'MANUAL'
    })
  );
  customerShipments.splice(0, customerShipments.length, shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_DEPARTURE', '9409-Daloday', { transferNo: 'DHL26060600001', latestTracking: '已生成面单' }));
  shipmentLabels.splice(0, shipmentLabels.length, {
    id: 'lbl-s-3',
    shipmentId: 's-3',
    carrier: 'UPS',
    channelName: 'UPS 加美线',
    labelNo: 'LBL26060600001',
    transferNo: '1Z26060600001',
    labelUrl: '/mock-labels/LBL26060600001.pdf',
    status: 'CREATED',
    createdAt: '2026-06-06T10:00:00.000Z'
  });
  problemTickets.splice(0, problemTickets.length, {
    id: 'pt-1',
    shipmentId: 's-2',
    systemOrderNo: 'SYGJ05291344165',
    customerName: '1344-TILL',
    reason: '轨迹超过3天未更新',
    status: 'OPEN',
    customerVisible: true,
    createdAt: '2026-06-06T10:00:00Z',
    replies: []
  });
  receivableFees.forEach((fee) => {
    fee.settled = false;
    fee.reconciliationStatus = 'PENDING';
    fee.reviewedAt = undefined;
    fee.reviewedBy = undefined;
  });
  businessCostFees.splice(0, businessCostFees.length, {
    id: 'bc-1',
    shipmentId: 's-1',
    name: '空运业务成本',
    amount: 160,
    settled: false,
    type: 'BUSINESS_COST',
    currency: 'RMB',
    settlementMethod: '月结',
    paymentNo: 'BC-20260617001',
    reconciliationStatus: 'PENDING',
    createdAt: '2026-06-17T10:30:00.000Z',
    createdBy: 'Rachel',
    remark: '测试业务成本',
    sourceType: 'MANUAL',
    chargeWeightKg: 8,
    unitPrice: 20,
    salesperson: 'Rachel',
    customerCode: '9409',
    customerName: '9409-Daloday',
    customerOrderNo: 'RCV-0606',
    systemOrderNo: 'SYGJ06061230001',
    transferNo: 'DHL26060600001',
    receivableTotal: 230,
    businessCostTotal: 160,
    businessProfit: 70,
    canViewAgent: true,
    canViewProfit: true
  });
  customerAccounts[0] = { customerId: 'c-9409', customerName: '9409-Daloday', balance: 10000, currency: 'RMB' };
  agentBankAccounts.splice(0, agentBankAccounts.length, ...initialAgentBankAccounts.map((item) => ({ ...item })));
  accountLedger.splice(0, accountLedger.length, {
    id: 'al-seed-1',
    customerId: 'c-9409',
    customerName: '9409-Daloday',
    amount: 10000,
    balance: 10000,
    note: '期初余额',
    createdAt: '2026-06-01T10:00:00.000Z'
  });
  payeeBankAccounts.splice(0, payeeBankAccounts.length, {
    id: 'payee-bank-yuhuan-rmb',
    agentId: 'a-yuhuan',
    agentName: '深圳宇环',
    accountName: '深圳宇环',
    bankName: '招商银行深圳分行',
    bankAccountNo: '6222000000009409',
    currency: 'RMB',
    enabled: true,
    createdAt: '2026-06-17T12:45:00.000Z',
    updatedAt: '2026-06-17T12:45:00.000Z'
  });
  masterData.customers.splice(0, masterData.customers.length, {
    id: 'c-9409',
    code: '9409',
    name: 'Daloday',
    shortName: 'Daloday',
    fullName: 'Daloday Inc.',
    customerType: '直客',
    customerSource: '手动录入',
    salesperson: '何俊妮',
    enabled: true
  });
  masterData.contacts.splice(0, masterData.contacts.length, { id: 'cc-9409-main', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Lina', company: 'Daloday Inc.', phone: '13800000001', email: 'lina@example.com', address: '9409 Sample Street', country: 'US', state: 'CA', postalCode: '90001', enabled: true });
  masterData.customerUsers.splice(0, masterData.customerUsers.length, { id: 'u-customer', customerId: 'c-9409', customerName: '9409-Daloday', username: 'customer', enabled: true });
  masterData.agents.splice(0, masterData.agents.length, {
    id: 'a-yuhuan',
    code: 'YH',
    shortName: '宇环',
    name: '深圳宇环',
    warehouseAddress1: '深圳市宝安区宇环仓一',
    warehouseAddress2: '深圳市宝安区宇环仓二',
    warehouseAddress3: '深圳市宝安区宇环仓三',
    warehouseContact: '宇环仓库',
    invoiceTemplateName: '宇环发票模板.xlsx',
    invoiceTemplateUrl: '/templates/yuhuan-invoice.xlsx',
    enabled: true
  });
  masterData.agentChannels.splice(0, masterData.agentChannels.length, { id: 'ach-yuhuan-dhl', agentId: 'a-yuhuan', agentName: '宇环', channelName: '宇环 DHL', enabled: true });
  masterData.carriers.splice(0, masterData.carriers.length, { id: 'cr-dhl', name: 'DHL', enabled: true });
  masterData.channelCategories.splice(
    0,
    masterData.channelCategories.length,
    { id: 'cc-ups', name: 'UPS', enabled: true },
    { id: 'cc-dhl', name: 'DHL', enabled: true },
    { id: 'cc-fedex', name: 'FEDEX', enabled: true },
    { id: 'cc-ems', name: 'EMS', enabled: true },
    { id: 'cc-dpd', name: 'DPD', enabled: true },
    { id: 'cc-truck', name: '卡车', enabled: true }
  );
  masterData.channels.splice(0, masterData.channels.length, { id: 'ch-dhl-hk', name: 'DHL HK', carrierId: 'cr-dhl', carrierName: 'DHL', ...companyChannelDefaults, enabled: true });
  masterData.surcharges.splice(0, masterData.surcharges.length, { id: 'sc-remote', name: '偏远附加费', amount: 50, enabled: true });
  masterData.fuelRates.splice(0, masterData.fuelRates.length, { id: 'fr-dhl', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.15, activeAt: '2026-06-06T00:00:00.000Z' });
  masterData.exchangeRates.splice(0, masterData.exchangeRates.length, { id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'RMB', rate: 7.245, activeAt: '2026-06-06T00:00:00.000Z', endAt: '2026-12-31T23:59:59.000Z', enabled: true });
  pricingRules.splice(0, pricingRules.length, {
    id: 'pr-dhl-us-0-5',
    channelId: 'ch-dhl-hk',
    channelName: 'DHL HK',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 5,
    ratePerKg: 10,
    currency: 'USD',
    enabled: true
  });
  agentMarkupRules.splice(
    0,
    agentMarkupRules.length,
    { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, enabled: true },
    { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, enabled: true }
  );
  warehousePackages.splice(0, warehousePackages.length, ...initialWarehousePackages.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] })));
  warehouseTallyTasks.splice(0, warehouseTallyTasks.length);
  staffAccounts.splice(
    0,
    staffAccounts.length,
    { id: 'u-admin', username: 'admin', role: 'ADMIN', roleLabel: '管理员组', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-service', username: 'service', role: 'UG_CUSTOMER_SERVICE', roleLabel: '客服', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-operator', username: 'operator', role: 'UG_BUSINESS', roleLabel: '业务部', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-warehouse', username: 'warehouse', role: 'UG_WAREHOUSE_RECEIVE', roleLabel: '仓库收货', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-finance', username: 'finance', role: 'UG_FINANCE', roleLabel: '财务', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' }
  );
  sites.splice(
    0,
    sites.length,
    { id: 'site-shenzhen-siyuan', sortOrder: 1, name: '深圳思远', enabled: true },
    { id: 'site-shenzhen-siyuan-wuhan', sortOrder: 2, name: '深圳思远武汉', enabled: true },
    { id: 'site-zhangzhou-sihua', sortOrder: 3, name: '漳州思华', enabled: true },
    { id: 'site-wuhan-jiuyulian', sortOrder: 4, name: '武汉九域联', enabled: true }
  );
  importedPriceBooks.splice(0, importedPriceBooks.length);
  importedPriceRows.splice(0, importedPriceRows.length);
  financeCatalogItems.splice(0, financeCatalogItems.length, ...initialFinanceCatalogItems.map((item) => ({ ...item })));
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-download') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  vi.stubGlobal('fetch', vi.fn(mockFetch));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

export async function renderAndLogin(username: string, password: string) {
  render(<App />);
  await userEvent.type(screen.getByLabelText('账号'), username);
  await userEvent.type(screen.getByLabelText('密码'), password);
  await userEvent.type(await screen.findByLabelText('图片验证码'), 'ABCD');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  await waitFor(() => expect(fetch).toHaveBeenCalled());
}

function buildReceivableAuditResponse(rows: ReceivableAuditSummary[], url = 'http://test.local') {
  const params = new URL(url, 'http://test.local').searchParams;
  const keyword = (value: string | undefined, key: string) => {
    const needle = params.get(key);
    return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
  };
  const filteredRows = rows.filter((row) => {
    const status = params.get('status') ?? 'ALL';
    if (status === 'ALL' && row.voided) return false;
    if (status !== 'ALL' && row.reconciliationStatus !== status) return false;
    const customerNeedle = params.get('customer');
    const customerMatches = !customerNeedle || [row.customerCode, row.customerName, row.customerOrderNo].some((value) => (value ?? '').toLowerCase().includes(customerNeedle.toLowerCase()));
    return customerMatches
      && keyword(row.systemOrderNo, 'systemOrderNo')
      && keyword(row.transferNo, 'transferNo')
      && keyword(row.salesperson, 'salesperson')
      && keyword(row.name, 'feeName')
      && keyword(row.createdBy, 'createdBy')
      && keyword(row.reviewedBy, 'reviewedBy')
      && keyword(row.paymentNo, 'paymentNo')
      && keyword(row.remark, 'remark');
  });
  const decorated = filteredRows.map((row) => {
    const currency = row.currency ?? 'RMB';
    const rmbAmount = currency === 'USD' ? Number((row.amount * 6.6).toFixed(2)) : row.amount;
    const ledger = row.paymentNo ? accountLedger.find((entry) => entry.id === row.paymentNo) : undefined;
    return {
      ...row,
      rmbAmount,
      matchedReceiptNo: row.paymentNo,
      receiptBalance: ledger?.balance
    };
  });
  const orderTotals = decorated.reduce((map, row) => {
    if (row.voided) return map;
    map.set(row.systemOrderNo, Number(((map.get(row.systemOrderNo) ?? 0) + (row.rmbAmount ?? 0)).toFixed(2)));
    return map;
  }, new Map<string, number>());
  const visible = decorated
    .filter((row) => !row.voided)
    .map((row) => ({ ...row, orderRmbTotal: orderTotals.get(row.systemOrderNo) ?? 0 }));
  return {
    rows: visible,
    totals: {
      amountByCurrency: Array.from(visible.reduce((map, row) => {
        const currency = row.currency ?? 'RMB';
        map.set(currency, Number(((map.get(currency) ?? 0) + row.amount).toFixed(2)));
        return map;
      }, new Map<string, number>())).map(([currency, amount]) => ({ currency, amount })),
      rmbTotal: Number(visible.reduce((sum, row) => sum + (row.rmbAmount ?? 0), 0).toFixed(2)),
      pendingCount: visible.filter((row) => row.reconciliationStatus !== 'CONFIRMED').length,
      confirmedCount: visible.filter((row) => row.reconciliationStatus === 'CONFIRMED').length,
      voidedCount: decorated.filter((row) => row.voided).length
    },
    pagination: { page: 1, pageSize: 10, totalItems: visible.length }
  };
}

function buildWaterReceiptResponse(rows: WaterReceiptSummary[], url = 'http://test.local') {
  const params = new URL(url, 'http://test.local').searchParams;
  const keyword = (value: string | undefined, key: string) => {
    const needle = params.get(key);
    return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
  };
  const filtered = rows.filter((row) => {
    const status = params.get('status') ?? 'ALL';
    if (status !== 'ALL' && row.status !== status) return false;
    if (status === 'ALL' && !params.get('includeArchived') && ['ARCHIVED', 'VOIDED'].includes(row.status)) return false;
    return keyword(row.receiptNo, 'receiptNo')
      && keyword(row.customerCode, 'customerCode')
      && keyword(row.salesperson, 'salesperson')
      && keyword(row.receiptMethod, 'receiptMethod')
      && keyword(row.paymentNo, 'paymentNo')
      && keyword(row.remark, 'remark');
  });
  return {
    rows: filtered,
    totals: {
      count: filtered.length,
      pendingCount: filtered.filter((row) => row.status === 'PENDING').length,
      arrivedCount: filtered.filter((row) => row.status !== 'PENDING' && row.status !== 'VOIDED').length,
      matchedCount: filtered.filter((row) => row.status === 'MATCHED').length,
      archivedCount: filtered.filter((row) => row.status === 'ARCHIVED').length,
      amount: Number(filtered.reduce((sum, row) => sum + row.amount, 0).toFixed(2)),
      matchedAmount: Number(filtered.reduce((sum, row) => sum + row.matchedAmount, 0).toFixed(2)),
      balance: Number(filtered.reduce((sum, row) => sum + row.balance, 0).toFixed(2))
    },
    pagination: { page: 1, pageSize: 10, totalItems: filtered.length }
  };
}

function buildBusinessCostAuditResponse(rows: BusinessCostAuditSummary[], url = 'http://test.local') {
  const params = new URL(url, 'http://test.local').searchParams;
  const keyword = (value: string | undefined, key: string) => {
    const needle = params.get(key);
    return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
  };
  const filteredRows = rows.filter((row) => {
    const status = params.get('status') ?? 'ALL';
    if (status === 'ALL' && row.voided) return false;
    if (status !== 'ALL' && row.reconciliationStatus !== status) return false;
    const customerNeedle = params.get('customer');
    const customerMatches = !customerNeedle || [row.customerCode, row.customerName, row.customerOrderNo].some((value) => (value ?? '').toLowerCase().includes(customerNeedle.toLowerCase()));
    return customerMatches
      && keyword(row.systemOrderNo, 'systemOrderNo')
      && keyword(row.transferNo, 'transferNo')
      && keyword(row.salesperson, 'salesperson')
      && keyword(row.name, 'feeName')
      && keyword(row.createdBy, 'createdBy')
      && keyword(row.reviewedBy, 'reviewedBy')
      && keyword(row.paymentNo, 'paymentNo')
      && keyword(row.remark, 'remark');
  });
  const decorated = filteredRows.map((row) => {
    const currency = row.currency ?? 'RMB';
    const rmbAmount = currency === 'USD' ? Number((row.amount * 6.6).toFixed(2)) : row.amount;
    return {
      ...row,
      currency,
      rmbAmount,
      canViewAgent: row.canViewAgent ?? true,
      canViewProfit: row.canViewProfit ?? true
    };
  });
  const orderTotals = decorated.reduce((map, row) => {
    if (row.voided) return map;
    map.set(row.systemOrderNo, Number(((map.get(row.systemOrderNo) ?? 0) + (row.rmbAmount ?? 0)).toFixed(2)));
    return map;
  }, new Map<string, number>());
  const activeRows = decorated.filter((row) => !row.voided);
  const visible = decorated.map((row) => ({ ...row, orderRmbTotal: orderTotals.get(row.systemOrderNo) ?? 0 }));
  return {
    rows: visible,
    totals: {
      amountByCurrency: Array.from(activeRows.reduce((map, row) => {
        const currency = row.currency ?? 'RMB';
        map.set(currency, Number(((map.get(currency) ?? 0) + row.amount).toFixed(2)));
        return map;
      }, new Map<string, number>())).map(([currency, amount]) => ({ currency, amount })),
      rmbTotal: Number(activeRows.reduce((sum, row) => sum + (row.rmbAmount ?? 0), 0).toFixed(2)),
      pendingCount: activeRows.filter((row) => row.reconciliationStatus !== 'CONFIRMED').length,
      confirmedCount: activeRows.filter((row) => row.reconciliationStatus === 'CONFIRMED').length,
      voidedCount: decorated.filter((row) => row.voided).length,
      profitTotal: Number(activeRows.reduce((sum, row) => sum + (row.businessProfit ?? 0), 0).toFixed(2))
    },
    pagination: { page: 1, pageSize: 10, totalItems: visible.length }
  };
}

function buildPayableAuditResponse(rows: PayableAuditSummary[], url = 'http://test.local') {
  const params = new URL(url, 'http://test.local').searchParams;
  const keyword = (value: string | undefined, key: string) => {
    const needle = params.get(key);
    return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
  };
  const filteredRows = rows.filter((row) => {
    const status = params.get('status') ?? 'ALL';
    if (status === 'ALL' && row.voided) return false;
    if (status !== 'ALL' && row.reconciliationStatus !== status) return false;
    const customerNeedle = params.get('customer');
    const customerMatches = !customerNeedle || [row.customerCode, row.customerName, row.customerOrderNo].some((value) => (value ?? '').toLowerCase().includes(customerNeedle.toLowerCase()));
    return customerMatches
      && keyword(row.systemOrderNo, 'systemOrderNo')
      && keyword(row.transferNo, 'transferNo')
      && keyword(row.salesperson, 'salesperson')
      && keyword(row.agentName, 'agent')
      && keyword(row.name, 'feeName')
      && keyword(row.createdBy, 'createdBy')
      && keyword(row.reviewedBy, 'reviewedBy')
      && keyword(row.paymentNo, 'paymentNo')
      && keyword(row.remark, 'remark');
  });
  const decorated = filteredRows.map((row) => ({
    ...row,
    currency: row.currency ?? 'RMB',
    rmbAmount: row.currency === 'USD' ? Number((row.amount * 6.6).toFixed(2)) : row.amount,
    canViewSensitivePayable: row.canViewSensitivePayable ?? true,
    canViewProfit: row.canViewProfit ?? true
  }));
  const orderTotals = decorated.reduce((map, row) => {
    if (row.voided) return map;
    map.set(row.systemOrderNo, Number(((map.get(row.systemOrderNo) ?? 0) + (row.rmbAmount ?? 0)).toFixed(2)));
    return map;
  }, new Map<string, number>());
  const activeRows = decorated.filter((row) => !row.voided);
  const visible = decorated.map((row) => ({ ...row, orderRmbTotal: orderTotals.get(row.systemOrderNo) ?? 0 }));
  return {
    rows: visible,
    totals: {
      amountByCurrency: Array.from(activeRows.reduce((map, row) => {
        const currency = row.currency ?? 'RMB';
        map.set(currency, Number(((map.get(currency) ?? 0) + row.amount).toFixed(2)));
        return map;
      }, new Map<string, number>())).map(([currency, amount]) => ({ currency, amount })),
      rmbTotal: Number(activeRows.reduce((sum, row) => sum + (row.rmbAmount ?? 0), 0).toFixed(2)),
      pendingCount: activeRows.filter((row) => row.reconciliationStatus !== 'CONFIRMED').length,
      confirmedCount: activeRows.filter((row) => row.reconciliationStatus === 'CONFIRMED').length,
      voidedCount: decorated.filter((row) => row.voided).length,
      receivableProfitTotal: Number(activeRows.reduce((sum, row) => sum + (row.receivableProfit ?? 0), 0).toFixed(2)),
      operationProfitTotal: Number(activeRows.reduce((sum, row) => sum + (row.operationProfit ?? 0), 0).toFixed(2))
    },
    pagination: { page: 1, pageSize: 10, totalItems: visible.length }
  };
}

function customerIdForShipment(shipment: Shipment) {
  const code = shipment.customerCode ?? shipment.customerName.split('-')[0];
  return masterData.customers.find((customer) => customer.code === code)?.id ?? `c-${code}`;
}

async function mockFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = String(input);
  const body = init?.body instanceof FormData
    ? Object.fromEntries(init.body.entries())
    : init?.body ? JSON.parse(String(init.body)) : undefined;
  const actorUsername = () => {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    return token.includes('CUSTOMER_SERVICE') ? 'service' : token.includes('OPERATOR') ? 'operator' : 'admin';
  };

  if (url.endsWith('/api/auth/captcha')) {
    return jsonResponse({
      captchaId: 'captcha-test',
      image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
    });
  }

  if (url.endsWith('/api/auth/login')) {
    const roleByUsername: Record<string, string> = {
      admin: 'ADMIN',
      service: 'CUSTOMER_SERVICE',
      operator: 'OPERATOR',
      warehouse: 'WAREHOUSE',
      finance: 'FINANCE',
      customer: 'CUSTOMER'
    };
    const role = roleByUsername[body.username] ?? 'ADMIN';
    const permissions = systemRoleMatrix.roles.find((item) => item.key === role)?.permissions ?? [];
    return jsonResponse({
      accessToken: `${role}-token`,
      user: { id: `u-${body.username}`, username: body.username, role, customerId: role === 'CUSTOMER' ? 'c-9409' : undefined, mustChangePassword: body.username === 'firstlogin' },
      permissions
    });
  }

  if (url.endsWith('/api/auth/login-logs')) {
    return jsonResponse([
      {
        id: 'login-log-1',
        username: 'admin',
        ip: '127.0.0.1',
        region: '本机',
        userAgent: 'Vitest Browser',
        createdAt: '2026-06-12T00:00:00.000Z'
      }
    ]);
  }

  if (url.endsWith('/api/auth/change-password')) {
    return jsonResponse({ ok: true });
  }

  if (url.endsWith('/api/ai/assist')) {
    return jsonResponse({
      provider: 'siliconflow',
      mode: 'live',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      content: `AI 已输出${body.module ?? body.scenario ?? '模块'}建议`
    });
  }

  if (url.endsWith('/api/shipments') && init?.method === 'POST') {
    if (body.transferNo?.trim()) {
      return jsonResponse({ message: '新建运单不能填写转单号，请在出库后完成双审核再填写' }, 400);
    }
    const created = shipment(`s-new-${body.systemOrderNo ?? body.customerOrderNo}`, body.systemOrderNo ?? 'SYGJ26060600021', body.customerOrderNo, body.initialStatus ?? 'DECLARED', '9409-Daloday', {
      destinationCountry: body.destinationCountry,
      receivableWeightKg: body.receivableWeightKg,
      agentWeightKg: body.agentWeightKg ?? body.receivableWeightKg,
      latestTracking: body.latestTracking ?? (body.initialStatus === 'DRAFT' ? '新建出货订单，待审核' : '客户已预报'),
      carrier: body.receivingChannel ?? 'DHL',
      channelName: body.receivingChannel ?? 'DHL HK',
      agentName: '宇环'
    });
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    if (token.includes('CUSTOMER')) {
      upsertMockShipment(customerShipments, created);
    } else {
      upsertMockShipment(employeeShipments, created);
    }
    return jsonResponse(created);
  }

  if (url.endsWith('/api/shipments/s-1/receive')) {
    employeeShipments[0] = { ...employeeShipments[0], status: 'WAITING_RECEIVE', latestTracking: '已收货' };
    return jsonResponse(employeeShipments[0]);
  }

  const routeMatch = url.match(/\/api\/shipments\/([^/]+)\/route$/);
  if (routeMatch) {
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === routeMatch[1]);
    const currentShipment = employeeShipments[shipmentIndex];
    if (!currentShipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    if (!body.agentId || !body.agentChannelName || !body.chargeWeightKg || !body.unitPrice) {
      return jsonResponse({ message: '请先完成代理、渠道和市场成本排货' }, 400);
    }
    const otherFee = Number(body.otherFee || 0);
    if (otherFee > 0 && !String(body.otherFeeRemark ?? '').trim()) {
      return jsonResponse({ message: '请填写其他费用包含内容' }, 400);
    }
    const otherFeeRemark = String(body.otherFeeRemark ?? '').trim();
    const amount = Number((Number(body.chargeWeightKg) * Number(body.unitPrice) + otherFee).toFixed(2));
    employeeShipments[shipmentIndex] = {
      ...currentShipment,
      status: 'WAITING_DISPATCH',
      channelName: currentShipment.channelName || 'DHL HK',
      agentName: '宇环',
      routedAt: new Date().toISOString(),
      routeAgentChannelName: body.agentChannelName,
      routeChargeWeightKg: Number(body.chargeWeightKg),
      routeUnitPrice: Number(body.unitPrice),
      routeOtherFee: otherFee,
      routeCostTotal: amount,
      routeCurrency: body.currency ?? 'RMB',
      latestTracking: '渠道排货已分配渠道'
    };
    payableAuditFees.push({
      id: `pf-route-${payableAuditFees.length + 1}`,
      shipmentId: currentShipment.id,
      name: '代理成本',
      amount,
      settled: false,
      agentName: '宇环',
      currency: body.currency ?? 'RMB',
      chargeWeightKg: Number(body.chargeWeightKg),
      unitPrice: Number(body.unitPrice),
      reconciliationStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      createdBy: actorUsername(),
      remark: `市场排货渠道：${body.agentChannelName}${otherFee > 0 ? `；其他费用：${otherFee}${otherFeeRemark ? `；其他费用备注：${otherFeeRemark}` : ''}` : ''}`,
      sourceType: 'MANUAL',
      salesperson: currentShipment.salesperson,
      customerCode: currentShipment.customerName.split('-')[0],
      customerName: currentShipment.customerName,
      customerOrderNo: currentShipment.customerOrderNo,
      systemOrderNo: currentShipment.systemOrderNo,
      transferNo: currentShipment.transferNo,
      agentChannel: body.agentChannelName,
      payableTotal: amount,
      rmbAmount: amount,
      orderRmbTotal: amount,
      canViewSensitivePayable: true,
      canViewProfit: true
    });
    const sameChannelUsage = payableAuditFees.filter((fee) => fee.agentName === '宇环' && fee.remark?.startsWith(`市场排货渠道：${body.agentChannelName}`)).length;
    if (sameChannelUsage >= 10 && !masterData.agentChannels.some((channel) => channel.agentId === body.agentId && channel.channelName === body.agentChannelName)) {
      masterData.agentChannels.push({
        id: `ach-${String(body.agentId)}-${String(body.agentChannelName).replace(/\s+/g, '-')}`,
        agentId: body.agentId,
        agentName: '宇环',
        channelName: body.agentChannelName,
        enabled: true
      });
    }
    return jsonResponse(employeeShipments[shipmentIndex]);
  }

  const rerouteMatch = url.match(/\/api\/shipments\/([^/]+)\/reroute$/);
  if (rerouteMatch && init?.method === 'POST') {
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === rerouteMatch[1]);
    const currentShipment = employeeShipments[shipmentIndex];
    if (!currentShipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    if (!['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(currentShipment.status)) {
      return jsonResponse({ message: '只有已出库或待离港订单可以退回重排' }, 400);
    }
    if (!body.reason?.trim()) {
      return jsonResponse({ message: '请填写退回原因' }, 400);
    }
    employeeShipments[shipmentIndex] = {
      ...currentShipment,
      status: 'WAITING_SORT',
      latestTracking: '代理退回，等待市场重新排货',
      routeReturnedAt: new Date().toISOString()
    };
    return jsonResponse(employeeShipments[shipmentIndex]);
  }

  const trackingEventMatch = url.match(/\/api\/shipments\/([^/]+)\/tracking-events$/);
  if (trackingEventMatch) {
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === trackingEventMatch[1]);
    if (shipmentIndex === -1) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    employeeShipments[shipmentIndex] = {
      ...employeeShipments[shipmentIndex],
      latestTracking: body.status,
      trackingStaleDays: 0
    };
    return jsonResponse(employeeShipments[shipmentIndex]);
  }

  if (url.endsWith('/api/shipments/s-3/labels') && init?.method === 'POST') {
    employeeShipments[1] = { ...employeeShipments[1], transferNo: '1Z26060600001', latestTracking: '已生成面单' };
    return jsonResponse({ label: shipmentLabels[0], shipment: employeeShipments[1] });
  }

  if (url.endsWith('/api/shipments/s-3/labels')) {
    return jsonResponse(shipmentLabels);
  }

  const dispatchMatch = url.match(/\/api\/shipments\/([^/]+)\/dispatch$/);
  if (dispatchMatch && init?.method === 'POST') {
    const shipmentId = decodeURIComponent(dispatchMatch[1]);
    const index = employeeShipments.findIndex((shipment) => shipment.id === shipmentId);
    if (index < 0) return jsonResponse({ message: '运单不存在' }, 404);
    const current = employeeShipments[index];
    if (!current.agentName || !current.routeAgentChannelName || !current.routeCostTotal) {
      return jsonResponse({ message: '请先完成代理、渠道和市场成本排货' }, 400);
    }
    const updated = {
      ...current,
      status: 'OUTBOUNDED' as const,
      latestTracking: '仓库已出库，等待客服补齐转单号',
      dispatchedAt: '2026-06-06T10:00:00.000Z',
      outboundAt: '2026-06-06T10:00:00.000Z',
      transferNo: body.transferNo ?? current.transferNo
    };
    employeeShipments[index] = updated;
    return jsonResponse(updated, 201);
  }

  const deleteShipmentMatch = url.match(/\/api\/shipments\/([^/]+)$/);
  if (deleteShipmentMatch && init?.method === 'DELETE') {
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === deleteShipmentMatch[1]);
    if (shipmentIndex === -1) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    const [deleted] = employeeShipments.splice(shipmentIndex, 1);
    return jsonResponse(deleted);
  }

  if (url.endsWith('/api/carrier-tasks/ct-1/run')) {
    carrierTasks[0] = { ...carrierTasks[0], status: 'SUCCESS', attempts: 1, completedAt: '2026-06-06T10:02:00.000Z' };
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === 's-2');
    employeeShipments[shipmentIndex] = { ...employeeShipments[shipmentIndex], latestTracking: 'DHL 已揽收 9064656160', trackingStaleDays: 0 };
    return jsonResponse({ task: carrierTasks[0], shipment: employeeShipments[shipmentIndex] });
  }

  if (url.endsWith('/api/carrier-tasks/ct-2/retry')) {
    carrierTasks[1] = { ...carrierTasks[1], status: 'SUCCESS', attempts: 2, lastError: undefined, completedAt: '2026-06-06T10:03:00.000Z' };
    employeeShipments[1] = { ...employeeShipments[1], latestTracking: 'UPS 运输中 1Z26060600001', trackingStaleDays: 0 };
    return jsonResponse({ task: carrierTasks[1], shipment: employeeShipments[1] });
  }

  if (url.endsWith('/api/carrier-tasks')) {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    if (token.includes('CUSTOMER')) {
      return Promise.resolve(new Response('Forbidden', { status: 403 }));
    }
    return jsonResponse(carrierTasks);
  }

  const updateRolePermissionMatch = url.match(/\/api\/system\/roles\/([^/]+)\/permissions$/);
  if (updateRolePermissionMatch) {
    const roleIndex = systemRoleMatrix.roles.findIndex((role) => role.key === updateRolePermissionMatch[1]);
    systemRoleMatrix.roles[roleIndex] = { ...systemRoleMatrix.roles[roleIndex], permissions: body.permissions };
    return jsonResponse(systemRoleMatrix.roles[roleIndex]);
  }

  const updateRoleEnabledMatch = url.match(/\/api\/system\/roles\/([^/]+)\/enabled$/);
  if (updateRoleEnabledMatch && init?.method === 'PUT') {
    const roleIndex = systemRoleMatrix.roles.findIndex((role) => role.key === updateRoleEnabledMatch[1]);
    (systemRoleMatrix.roles as Array<Record<string, unknown>>)[roleIndex] = { ...systemRoleMatrix.roles[roleIndex], enabled: body.enabled === true };
    return jsonResponse(systemRoleMatrix.roles[roleIndex]);
  }

  const updateRoleMatch = url.match(/\/api\/system\/roles\/([^/]+)$/);
  if (updateRoleMatch && init?.method === 'PUT') {
    const roleIndex = systemRoleMatrix.roles.findIndex((role) => role.key === updateRoleMatch[1]);
    (systemRoleMatrix.roles as Array<Record<string, unknown>>)[roleIndex] = {
      ...systemRoleMatrix.roles[roleIndex],
      label: body.label,
      description: body.description,
      site: body.site,
      sortOrder: body.sortOrder,
      enabled: body.enabled !== false
    };
    return jsonResponse(systemRoleMatrix.roles[roleIndex]);
  }

  if (url.endsWith('/api/system/roles') && init?.method === 'POST') {
    const template = systemRoleMatrix.roles.find((role) => role.key === (body.templateRole ?? 'OPERATOR'));
    const role = {
      key: `UG_TEST_${systemRoleMatrix.roles.length}`,
      label: String(body.label ?? ''),
      account: '-',
      scope: '自定义用户组',
      permissions: [...(template?.permissions ?? [])],
      restriction: '按勾选权限执行',
      description: body.description,
      site: body.site,
      sortOrder: body.sortOrder ?? systemRoleMatrix.roles.length,
      enabled: body.enabled !== false,
      systemBuiltin: false
    };
    (systemRoleMatrix.roles as Array<Record<string, unknown>>).push(role);
    return jsonResponse(role);
  }

  if (url.endsWith('/api/system/roles')) {
    return jsonResponse(systemRoleMatrix);
  }

  if (url.includes('/api/system/audit-logs')) {
    const params = new URL(url, 'http://test.local').searchParams;
    const keyword = (value: string | undefined, key: string) => {
      const needle = params.get(key);
      return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    };
    const filtered = auditLogs.filter((row) => {
      const result = params.get('result');
      const operator = params.get('operator')?.toLowerCase();
      const operatorMatches = !operator || row.actorUsername.toLowerCase().includes(operator) || row.actorId.toLowerCase().includes(operator);
      return (!result || row.result === result)
        && operatorMatches
        && keyword(row.module, 'module')
        && keyword(row.action, 'action');
    });
    const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
    const pageSize = Math.max(1, Number(params.get('pageSize') ?? 10) || 10);
    const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
    return jsonResponse({ rows, suspiciousDeleteWarnings: [], pagination: { page, pageSize, totalItems: filtered.length } });
  }

  if (url.endsWith('/api/system/sites') && init?.method === 'POST') {
    const name = String(body.name ?? '').trim();
    if (!name) return jsonResponse({ message: '站点名称不能为空' }, 400);
    if (sites.some((site) => site.name === name)) return jsonResponse({ message: '站点名称已存在' }, 400);
    const site = { id: `site-${name.toLowerCase()}`, sortOrder: body.sortOrder ?? Math.max(0, ...sites.map((item) => item.sortOrder)) + 1, name, enabled: true };
    sites.push(site);
    return jsonResponse(site);
  }

  const siteUpdateMatch = url.match(/\/api\/system\/sites\/([^/]+)$/);
  if (siteUpdateMatch && init?.method === 'PUT') {
    const site = sites.find((item) => item.id === siteUpdateMatch[1]);
    const name = String(body.name ?? '').trim();
    if (!site) return jsonResponse({ message: 'Not found' }, 404);
    if (!name) return jsonResponse({ message: '站点名称不能为空' }, 400);
    if (sites.some((item) => item.id !== site.id && item.name === name)) return jsonResponse({ message: '站点名称已存在' }, 400);
    Object.assign(site, { name, sortOrder: body.sortOrder ?? site.sortOrder, enabled: body.enabled ?? site.enabled });
    return jsonResponse(site);
  }

  const siteEnabledMatch = url.match(/\/api\/system\/sites\/([^/]+)\/enabled$/);
  if (siteEnabledMatch && init?.method === 'PUT') {
    const site = sites.find((item) => item.id === siteEnabledMatch[1]);
    if (!site) return jsonResponse({ message: 'Not found' }, 404);
    site.enabled = body.enabled === true;
    return jsonResponse(site);
  }

  if (url.endsWith('/api/system/sites')) {
    return jsonResponse([...sites].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));
  }

  if (url.endsWith('/api/system/staff-accounts') && init?.method === 'POST') {
    const role = body.role ?? 'OPERATOR';
    const roleLabel = systemRoleMatrix.roles.find((item) => item.key === role)?.label ?? '员工';
    const account: StaffAccountSummary = {
      id: `u-${body.username}`,
      username: body.username,
      name: body.name,
      phone: body.phone,
      gender: body.gender,
      nickname: body.nickname,
      site: body.site,
      role,
      roleLabel,
      enabled: body.enabled !== false,
      createdAt: '2026-06-21T10:00:00.000Z'
    };
    staffAccounts.push(account);
    return jsonResponse(account);
  }

  const staffUpdateMatch = url.match(/\/api\/system\/staff-accounts\/([^/?]+)$/);
  if (staffUpdateMatch && init?.method === 'PUT') {
    const account = staffAccounts.find((item) => item.id === staffUpdateMatch[1]);
    if (!account) return jsonResponse({ message: 'Not found' }, 404);
    if (body.username) account.username = body.username;
    if (body.name !== undefined) account.name = body.name || undefined;
    if (body.phone !== undefined) account.phone = body.phone || undefined;
    if (body.gender !== undefined) account.gender = body.gender;
    if (body.nickname !== undefined) account.nickname = body.nickname || undefined;
    if (body.site !== undefined) account.site = body.site || undefined;
    if (body.enabled !== undefined) account.enabled = body.enabled === true;
    if (body.role) {
      account.role = body.role;
      account.roleLabel = systemRoleMatrix.roles.find((item) => item.key === body.role)?.label ?? '员工';
    }
    return jsonResponse(account);
  }

  if (staffUpdateMatch && init?.method === 'DELETE') {
    const account = staffAccounts.find((item) => item.id === staffUpdateMatch[1]);
    if (!account) return jsonResponse({ message: 'Not found' }, 404);
    account.enabled = false;
    return jsonResponse(account);
  }

  if (url.endsWith('/api/system/staff-accounts/reset-passwords')) {
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
    return jsonResponse(
      staffAccounts
        .filter((account) => userIds.includes(account.id))
        .map((account) => ({
          id: account.id,
          username: account.username,
          temporaryPassword: `${account.username}@123`
      }))
    );
  }

  const staffSiteMatch = url.match(/\/api\/system\/staff-accounts\/([^/]+)\/site$/);
  if (staffSiteMatch && init?.method === 'PUT') {
    const account = staffAccounts.find((item) => item.id === staffSiteMatch[1]);
    if (!account) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    account.site = body.site || undefined;
    return jsonResponse(account);
  }

  if (url.includes('/api/system/staff-accounts')) {
    const requestUrl = new URL(url, 'http://localhost');
    const keyword = requestUrl.searchParams.get('keyword')?.toLowerCase();
    const site = requestUrl.searchParams.get('site');
    const role = requestUrl.searchParams.get('role');
    const status = requestUrl.searchParams.get('status') ?? 'ALL';
    return jsonResponse(staffAccounts.filter((account) =>
      (!keyword || [account.username, account.name, account.nickname, account.roleLabel].some((value) => value?.toLowerCase().includes(keyword)))
      && (!site || account.site === site)
      && (!role || account.role === role)
      && (status === 'ALL' || (status === 'ENABLED' ? account.enabled : !account.enabled))
    ));
  }

  if (url.endsWith('/api/master-data/customers') && init?.method === 'POST') {
    const customer = {
      id: `c-${body.code}`,
      code: body.code,
      name: body.name,
      shortName: body.shortName ?? body.name,
      fullName: body.fullName ?? `${body.name} Co., Ltd.`,
      customerType: body.customerType ?? '直客',
      customerSource: body.customerSource ?? undefined,
      salesperson: body.salesperson ?? '',
      defaultSettlementMethod: body.defaultSettlementMethod ?? undefined,
      enabled: true
    };
    masterData.customers.push(customer);
    return jsonResponse(customer);
  }

  const customerUpdateMatch = url.match(/\/api\/master-data\/customers\/([^/]+)$/);
  if (customerUpdateMatch && init?.method === 'PUT') {
    const customer = masterData.customers.find((item) => item.id === customerUpdateMatch[1]);
    if (!customer) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    Object.assign(customer, {
      code: body.code ?? customer.code,
      name: body.name ?? customer.name,
      shortName: body.shortName ?? customer.shortName,
      fullName: body.fullName ?? customer.fullName,
      customerType: body.customerType ?? customer.customerType,
      customerSource: body.customerSource ?? customer.customerSource,
      salesperson: body.salesperson ?? customer.salesperson,
      defaultSettlementMethod: body.defaultSettlementMethod ?? customer.defaultSettlementMethod,
      enabled: body.enabled ?? customer.enabled
    });
    return jsonResponse(customer);
  }

  const customerEnabledMatch = url.match(/\/api\/master-data\/customers\/([^/]+)\/enabled$/);
  if (customerEnabledMatch && init?.method === 'PUT') {
    const customer = masterData.customers.find((item) => item.id === customerEnabledMatch[1]);
    if (!customer) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    customer.enabled = body.enabled === true;
    return jsonResponse(customer);
  }

  if (url.endsWith('/api/master-data/agents') && init?.method === 'POST') {
    const agent = {
      id: `a-${body.code ?? 'm7'}`,
      code: body.code ?? 'M7',
      shortName: body.shortName ?? body.name,
      name: body.name ?? 'M7 Agent',
      integrationType: body.integrationType ?? 'MANUAL',
      warehouseAddress1: body.warehouseAddress1,
      warehouseAddress2: body.warehouseAddress2,
      warehouseAddress3: body.warehouseAddress3,
      warehouseContact: body.warehouseContact,
      invoiceTemplateName: body.invoiceTemplateName,
      invoiceTemplateUrl: body.invoiceTemplateUrl,
      enabled: true
    };
    masterData.agents.push(agent);
    return jsonResponse(agent);
  }

  const agentUpdateMatch = url.match(/\/api\/master-data\/agents\/([^/]+)$/);
  if (agentUpdateMatch && init?.method === 'PUT') {
    const agent = masterData.agents.find((item) => item.id === agentUpdateMatch[1]);
    if (!agent) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    Object.assign(agent, {
      code: body.code ?? agent.code,
      shortName: body.shortName ?? agent.shortName,
      name: body.name ?? agent.name,
      integrationType: body.integrationType ?? agent.integrationType,
      warehouseAddress1: body.warehouseAddress1,
      warehouseAddress2: body.warehouseAddress2,
      warehouseAddress3: body.warehouseAddress3,
      warehouseContact: body.warehouseContact,
      invoiceTemplateName: body.invoiceTemplateName,
      invoiceTemplateUrl: body.invoiceTemplateUrl,
      enabled: body.enabled ?? agent.enabled
    });
    return jsonResponse(agent);
  }

  const agentEnabledMatch = url.match(/\/api\/master-data\/agents\/([^/]+)\/enabled$/);
  if (agentEnabledMatch && init?.method === 'PUT') {
    const agent = masterData.agents.find((item) => item.id === agentEnabledMatch[1]);
    if (!agent) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    agent.enabled = body.enabled === true;
    return jsonResponse(agent);
  }

  if (url.endsWith('/api/master-data/agent-channels') && init?.method === 'POST') {
    const agent = masterData.agents.find((item) => item.id === body.agentId);
    const channel = {
      id: `ach-${body.agentId}-${body.channelName}`,
      agentId: body.agentId,
      agentName: agent?.shortName ?? agent?.name ?? body.agentId,
      channelName: body.channelName,
      enabled: true
    };
    masterData.agentChannels.push(channel);
    return jsonResponse(channel);
  }

  const agentChannelUpdateMatch = url.match(/\/api\/master-data\/agent-channels\/([^/]+)$/);
  if (agentChannelUpdateMatch && init?.method === 'PUT') {
    const channel = masterData.agentChannels.find((item) => item.id === agentChannelUpdateMatch[1]);
    const agent = masterData.agents.find((item) => item.id === body.agentId);
    if (!channel) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    Object.assign(channel, {
      agentId: body.agentId ?? channel.agentId,
      agentName: agent?.shortName ?? agent?.name ?? channel.agentName,
      channelName: body.channelName ?? channel.channelName,
      enabled: body.enabled ?? channel.enabled
    });
    return jsonResponse(channel);
  }

  const agentChannelEnabledMatch = url.match(/\/api\/master-data\/agent-channels\/([^/]+)\/enabled$/);
  if (agentChannelEnabledMatch && init?.method === 'PUT') {
    const channel = masterData.agentChannels.find((item) => item.id === agentChannelEnabledMatch[1]);
    if (!channel) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    channel.enabled = body.enabled === true;
    return jsonResponse(channel);
  }

  const contactUpdateMatch = url.match(/\/api\/master-data\/customers\/([^/]+)\/contacts\/([^/]+)$/);
  if (contactUpdateMatch && init?.method === 'PUT') {
    const contact = masterData.contacts.find((item) => item.customerId === contactUpdateMatch[1] && item.id === contactUpdateMatch[2]);
    if (!contact) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    Object.assign(contact, {
      name: body.name ?? contact.name,
      company: body.company ?? contact.company,
      phone: body.phone ?? contact.phone,
      email: body.email ?? contact.email,
      address: body.address ?? contact.address,
      country: body.country ?? contact.country,
      state: body.state ?? contact.state,
      postalCode: body.postalCode ?? contact.postalCode,
      enabled: body.enabled ?? contact.enabled
    });
    return jsonResponse(contact);
  }

  const contactMatch = url.match(/\/api\/master-data\/customers\/([^/]+)\/contacts$/);
  if (contactMatch && init?.method === 'POST') {
    const customerId = contactMatch[1];
    const customer = masterData.customers.find((item) => item.id === customerId);
    if (masterData.contacts.filter((item) => item.customerId === customerId && item.enabled).length >= 4) {
      return Promise.resolve(new Response('最多维护 4 组收货人', { status: 400 }));
    }
    const contactName = body.name ?? 'M7 Contact';
    const contact = {
      id: `cc-${contactName}`,
      customerId,
      customerName: customer ? `${customer.code}-${customer.name}` : customerId,
      name: contactName,
      company: body.company ?? undefined,
      phone: body.phone ?? '13900000007',
      email: body.email ?? 'm7@example.com',
      address: body.address ?? undefined,
      country: body.country ?? undefined,
      state: body.state ?? undefined,
      postalCode: body.postalCode ?? undefined,
      enabled: true
    };
    masterData.contacts.push(contact);
    return jsonResponse(contact);
  }

  const customerUserMatch = url.match(/\/api\/master-data\/customers\/([^/]+)\/users$/);
  if (customerUserMatch) {
    const customerId = customerUserMatch[1];
    const customer = masterData.customers.find((item) => item.id === customerId);
    const username = body.username ?? 'm7customer';
    const customerUser = {
      id: `u-${username}`,
      customerId,
      customerName: customer ? `${customer.code}-${customer.name}` : customerId,
      username,
      enabled: true
    };
    masterData.customerUsers.push(customerUser);
    return jsonResponse(customerUser);
  }

  if (url.endsWith('/api/master-data/carriers') && init?.method === 'POST') {
    const carrier = { id: 'cr-m7', name: 'M7 Carrier', enabled: true };
    masterData.carriers.push(carrier);
    return jsonResponse(carrier);
  }

  if (url.endsWith('/api/master-data/channels') && init?.method === 'POST') {
    const channel = {
      id: 'ch-m7',
      name: body.name ?? 'M7 Channel',
      carrierId: body.carrierId ?? 'cr-m7',
      carrierName: masterData.carriers.find((carrier) => carrier.id === (body.carrierId ?? 'cr-m7'))?.name ?? 'M7 Carrier',
      businessType: body.businessType ?? 'EXPRESS',
      category: body.category ?? 'DHL',
      volumeDivisor: body.volumeDivisor ?? 5000,
      multiPieceWeightRule: body.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: body.singleWeightRoundingRule ?? 'ACTUAL',
      settlementWeightRule: body.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: body.settlementWeightRoundingRule ?? 'NONE',
      largeCargoThresholdKg: body.largeCargoThresholdKg,
      remoteAreaRule: body.remoteAreaRule ?? 'NONE',
      enabled: body.enabled ?? true
    };
    masterData.channels.push(channel);
    return jsonResponse(channel);
  }

  const channelUpdateMatch = url.match(/\/api\/master-data\/channels\/([^/]+)$/);
  if (channelUpdateMatch && init?.method === 'PUT') {
    const channel = masterData.channels.find((item) => item.id === channelUpdateMatch[1]);
    const carrier = masterData.carriers.find((item) => item.id === body.carrierId);
    if (!channel) return jsonResponse({ message: 'Not found' }, 404);
    Object.assign(channel, {
      name: body.name ?? channel.name,
      carrierId: body.carrierId ?? channel.carrierId,
      carrierName: carrier?.name ?? channel.carrierName,
      businessType: body.businessType ?? channel.businessType,
      category: body.category ?? channel.category,
      volumeDivisor: body.volumeDivisor ?? channel.volumeDivisor,
      multiPieceWeightRule: body.multiPieceWeightRule ?? channel.multiPieceWeightRule,
      singleWeightRoundingRule: body.singleWeightRoundingRule ?? channel.singleWeightRoundingRule,
      settlementWeightRule: body.settlementWeightRule ?? channel.settlementWeightRule,
      settlementWeightRoundingRule: body.settlementWeightRoundingRule ?? channel.settlementWeightRoundingRule,
      largeCargoThresholdKg: body.largeCargoThresholdKg,
      remoteAreaRule: body.remoteAreaRule ?? channel.remoteAreaRule,
      enabled: body.enabled ?? channel.enabled
    });
    return jsonResponse(channel);
  }

  const channelEnabledMatch = url.match(/\/api\/master-data\/channels\/([^/]+)\/enabled$/);
  if (channelEnabledMatch) {
    const channel = masterData.channels.find((item) => item.id === channelEnabledMatch[1]);
    if (!channel) return jsonResponse({ message: 'Not found' }, 404);
    channel.enabled = body.enabled === true;
    return jsonResponse(channel);
  }

  if (url.endsWith('/api/master-data/channel-categories') && init?.method === 'POST') {
    const name = String(body.name ?? '').trim();
    if (!name) return jsonResponse({ message: '类别名称不能为空' }, 400);
    if (masterData.channelCategories.some((item) => item.name === name)) return jsonResponse({ message: '类别名称已存在' }, 400);
    const category = { id: `cc-${name.toLowerCase()}`, name, enabled: true };
    masterData.channelCategories.push(category);
    return jsonResponse(category);
  }

  const channelCategoryUpdateMatch = url.match(/\/api\/master-data\/channel-categories\/([^/]+)$/);
  if (channelCategoryUpdateMatch && init?.method === 'PUT') {
    const category = masterData.channelCategories.find((item) => item.id === channelCategoryUpdateMatch[1]);
    const name = String(body.name ?? '').trim();
    if (!category) return jsonResponse({ message: 'Not found' }, 404);
    if (!name) return jsonResponse({ message: '类别名称不能为空' }, 400);
    if (masterData.channelCategories.some((item) => item.id !== category.id && item.name === name)) return jsonResponse({ message: '类别名称已存在' }, 400);
    Object.assign(category, { name, enabled: body.enabled ?? category.enabled });
    return jsonResponse(category);
  }

  const channelCategoryEnabledMatch = url.match(/\/api\/master-data\/channel-categories\/([^/]+)\/enabled$/);
  if (channelCategoryEnabledMatch) {
    const category = masterData.channelCategories.find((item) => item.id === channelCategoryEnabledMatch[1]);
    if (!category) return jsonResponse({ message: 'Not found' }, 404);
    category.enabled = body.enabled === true;
    return jsonResponse(category);
  }

  if (url.endsWith('/api/master-data/surcharges') && init?.method === 'POST') {
    const surcharge = { id: 'sc-m7', name: 'M7 附加费', amount: 88, enabled: true };
    masterData.surcharges.push(surcharge);
    return jsonResponse(surcharge);
  }

  if (url.endsWith('/api/master-data/fuel-rates') && init?.method === 'POST') {
    const fuelRate = { id: 'fr-m7', channelId: 'ch-m7', channelName: 'M7 Channel', rate: 0.18, activeAt: '2026-06-06T00:00:00.000Z' };
    masterData.fuelRates.push(fuelRate);
    return jsonResponse(fuelRate);
  }

  if (url.endsWith('/api/master-data/exchange-rates') && init?.method === 'POST') {
    const payload = init.body ? JSON.parse(String(init.body)) : {};
    const exchangeRate = {
      id: `er-${payload.baseCurrency ?? 'eur'}-${masterData.exchangeRates.length + 1}`,
      baseCurrency: String(payload.baseCurrency ?? 'EUR').toUpperCase(),
      quoteCurrency: String(payload.quoteCurrency ?? 'RMB').toUpperCase(),
      rate: Number(payload.rate ?? 7.8),
      activeAt: payload.activeAt ?? '2026-06-06T00:00:00.000Z',
      endAt: payload.endAt ?? '2026-12-31T23:59:59.000Z',
      enabled: true
    };
    masterData.exchangeRates.push(exchangeRate);
    return jsonResponse(exchangeRate);
  }

  const exchangeRateMatch = new URL(url, 'http://test.local').pathname.match(/^\/api\/master-data\/exchange-rates\/([^/]+)$/);
  if (exchangeRateMatch && ['PUT', 'DELETE'].includes(String(init?.method))) {
    const row = masterData.exchangeRates.find((item) => item.id === decodeURIComponent(exchangeRateMatch[1]));
    if (!row) return jsonResponse({ message: '汇率不存在' }, 404);
    const payload = init?.body ? JSON.parse(String(init.body)) : {};
    Object.assign(row, init?.method === 'DELETE'
      ? { enabled: false }
      : {
          baseCurrency: String(payload.baseCurrency ?? row.baseCurrency).toUpperCase(),
          quoteCurrency: String(payload.quoteCurrency ?? row.quoteCurrency).toUpperCase(),
          rate: Number(payload.rate ?? row.rate),
          activeAt: payload.activeAt ?? row.activeAt,
          endAt: payload.endAt ?? row.endAt,
          enabled: payload.enabled ?? row.enabled
        });
    return jsonResponse(row);
  }

  if (url.endsWith('/api/master-data')) {
    return jsonResponse(masterData);
  }

  if (url.includes('/api/finance/catalog/reorder') && init?.method === 'PUT') {
    const categoryItems = financeCatalogItems.filter((item) => item.category === body.category);
    const nextItems = body.orderedIds
      .map((id: string, index: number) => categoryItems.find((item) => item.id === id) ? { ...categoryItems.find((item) => item.id === id)!, sortOrder: index + 1 } : null)
      .filter(Boolean) as FinanceCatalogItemSummary[];
    financeCatalogItems.splice(0, financeCatalogItems.length, ...financeCatalogItems.filter((item) => item.category !== body.category), ...nextItems);
    return jsonResponse({ items: nextItems });
  }

  if (url.includes('/api/finance/catalog') && init?.method === 'POST') {
    const item = {
      id: `fc-${body.category}-${body.name}`,
      category: body.category,
      name: body.name,
      currency: body.currency,
      remark: body.remark,
      sortOrder: body.sortOrder ?? financeCatalogItems.filter((row) => row.category === body.category).length + 1,
      enabled: body.enabled !== false,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z'
    };
    financeCatalogItems.push(item);
    return jsonResponse(item);
  }

  const financeCatalogItemMatch = url.match(/\/api\/finance\/catalog\/([^/?]+)$/);
  if (financeCatalogItemMatch && init?.method === 'PUT') {
    const item = financeCatalogItems.find((row) => row.id === financeCatalogItemMatch[1]);
    if (!item) return jsonResponse({ message: 'Not found' }, 404);
    Object.assign(item, body, { updatedAt: '2026-06-01T00:00:00.000Z' });
    return jsonResponse(item);
  }

  if (financeCatalogItemMatch && init?.method === 'DELETE') {
    const item = financeCatalogItems.find((row) => row.id === financeCatalogItemMatch[1]);
    if (!item) return jsonResponse({ message: 'Not found' }, 404);
    item.enabled = false;
    return jsonResponse(item);
  }

  if (url.includes('/api/finance/catalog')) {
    const parsed = new URL(url, 'http://test.local');
    const category = parsed.searchParams.get('category');
    const keyword = parsed.searchParams.get('keyword')?.trim().toLowerCase() ?? '';
    const enabledOnly = parsed.searchParams.get('enabledOnly') === 'true';
    const items = financeCatalogItems
      .filter((item) => !category || item.category === category)
      .filter((item) => !enabledOnly || item.enabled)
      .filter((item) => !keyword || [item.name, item.currency, item.remark].some((value) => (value ?? '').toLowerCase().includes(keyword)));
    return jsonResponse({ items });
  }

  if (url.endsWith('/api/shipments/review-pending')) {
    return jsonResponse(employeeShipments.filter((shipment) => (shipment.status === 'DRAFT' || shipment.status === 'REVIEW_PENDING') && !shipment.deletedAt));
  }

  if (url.endsWith('/api/shipments/review-deleted')) {
    return jsonResponse(employeeShipments.filter((shipment) => Boolean(shipment.deletedAt)));
  }

  const reviewPermanentDeleteMatch = url.match(/\/api\/shipments\/([^/]+)\/review\/permanent$/);
  if (reviewPermanentDeleteMatch && init?.method === 'DELETE') {
    const index = employeeShipments.findIndex((item) => item.id === reviewPermanentDeleteMatch[1]);
    if (index < 0 || !employeeShipments[index].deletedAt) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    const [removed] = employeeShipments.splice(index, 1);
    return jsonResponse({ id: removed.id, deleted: true });
  }

  const reviewDeleteMatch = url.match(/\/api\/shipments\/([^/]+)\/review$/);
  if (reviewDeleteMatch && init?.method === 'DELETE') {
    const shipment = employeeShipments.find((item) => item.id === reviewDeleteMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    Object.assign(shipment, {
      deletedAt: '2026-06-22T10:00:00.000Z',
      deletedBy: 'admin',
      deletedReason: body.reason || '审核台人工删除',
      deleteType: 'MANUAL'
    });
    return jsonResponse({ shipment, packages: [], finance: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, receivables: [], payables: [], businessCosts: [], receivableTotal: 0, payableTotal: 0 }, events: [], trackingEvents: [], problemTickets: [], files: [], approvalWarnings: [], overdue: false });
  }

  const reviewRestoreMatch = url.match(/\/api\/shipments\/([^/]+)\/restore$/);
  if (reviewRestoreMatch && init?.method === 'POST') {
    const shipment = employeeShipments.find((item) => item.id === reviewRestoreMatch[1]);
    if (!shipment || !shipment.deletedAt) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    Object.assign(shipment, {
      deletedAt: undefined,
      deletedBy: undefined,
      deletedReason: undefined,
      deleteType: undefined,
      restoredAt: '2026-06-22T11:00:00.000Z',
      restoredBy: 'admin',
      restoreMode: body.mode ?? 'KEEP_ORIGINAL_TIME',
      createdAt: body.mode === 'MANUAL_TIME' ? body.manualCreatedAt : shipment.createdAt
    });
    return jsonResponse({ shipment, packages: [], finance: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, receivables: [], payables: [], businessCosts: [], receivableTotal: 0, payableTotal: 0 }, events: [], trackingEvents: [], problemTickets: [], files: [], approvalWarnings: [], overdue: false });
  }

  const reviewDetailMatch = url.match(/\/api\/shipments\/([^/]+)\/review-detail$/);
  if (reviewDetailMatch) {
    const shipment = employeeShipments.find((item) => item.id === reviewDetailMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    const shipmentReceivables = receivableFees.filter((fee) => fee.shipmentId === shipment.id);
    const shipmentBusinessCosts = businessCostFees.filter((fee) => fee.shipmentId === shipment.id);
    const shipmentPayables = payableAuditFees.filter((fee) => fee.shipmentId === shipment.id);
    const detail: ShipmentReviewDetailSummary = {
      shipment,
      packages: [
        {
          id: 'review-pkg-1',
          warehousePackageId: 'wh-review-1',
          customerOrderNo: shipment.customerOrderNo,
          domesticTrackingNo: 'SF123456789',
          packageNo: 'PKG-1',
          packageCount: shipment.packageCount,
          weightKg: shipment.receivableWeightKg,
          lengthCm: 60,
          widthCm: 50,
          heightCm: 40,
          cbm: shipment.volumeCbm ?? 0.12,
          volumetricWeightKg: 20,
          chargeableWeightKg: shipment.agentWeightKg ?? shipment.receivableWeightKg,
          inboundAt: shipment.createdAt,
          exceptions: []
        }
      ],
      finance: {
        shipmentId: shipment.id,
        systemOrderNo: shipment.systemOrderNo,
        agentName: shipment.agentName,
        receivables: shipmentReceivables,
        businessCosts: shipmentBusinessCosts,
        payables: shipmentPayables,
        receivableTotal: shipmentReceivables.reduce((sum, fee) => sum + fee.amount, 0),
        businessCostTotal: shipmentBusinessCosts.reduce((sum, fee) => sum + fee.amount, 0),
        payableTotal: shipmentPayables.reduce((sum, fee) => sum + fee.amount, 0),
        grossProfit: shipmentReceivables.reduce((sum, fee) => sum + fee.amount, 0) - shipmentBusinessCosts.reduce((sum, fee) => sum + fee.amount, 0)
      },
      events: [{ id: 'review-log-1', type: 'AUDIT', title: '提交审核', note: '财务录单创建，待审核', createdAt: shipment.createdAt, operator: shipment.entryBy }],
      trackingEvents: [{ id: 'review-track-1', type: 'TRACKING', title: '待审核', note: shipment.latestTracking, createdAt: shipment.createdAt }],
      problemTickets: [],
      files: [],
      approvalWarnings: shipment.productName ? [] : ['产品名称缺失'],
      overdue: false
    };
    return jsonResponse(detail);
  }

  if (url.endsWith('/api/shipments')) {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    return jsonResponse(token.includes('CUSTOMER') ? customerShipments : employeeShipments);
  }

  const businessApproveMatch = url.match(/\/api\/shipments\/([^/]+)\/business-data\/approve$/);
  if (businessApproveMatch && init?.method === 'POST') {
    const shipment = employeeShipments.find((item) => item.id === businessApproveMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    const actor = actorUsername();
    const now = new Date().toISOString();
    auditLogs.unshift({
      id: `audit-business-data-${auditLogs.length + 1}`,
      actorId: `u-${actor}`,
      actorUsername: actor,
      action: 'customer_service.business_data.approved',
      actionLabel: '业务数据审核通过',
      module: 'customer_service',
      moduleLabel: '客服管理',
      target: shipment.id,
      result: 'SUCCESS',
      resultLabel: '成功',
      before: { status: shipment.status, businessDataReviewStatus: 'PENDING' },
      after: {
        status: shipment.status,
        statusFrom: shipment.status,
        statusTo: shipment.status,
        businessDataReviewStatus: 'APPROVED',
        reviewer: actor,
        reviewedBy: actor,
        reviewedAt: now,
        differenceFeedback: body.remark?.trim() || undefined,
        remark: body.remark?.trim() || undefined,
        customerCode: shipment.customerCode,
        systemOrderNo: shipment.systemOrderNo,
        destinationCountry: shipment.destinationCountry,
        packageCount: shipment.packageCount,
        chargeableWeightKg: shipment.receivableWeightKg,
        declarationRequired: shipment.declarationRequired,
        sensitive: shipment.sensitive,
        customerServiceReceiveStatus: 'BUSINESS_DATA_APPROVED'
      },
      createdAt: now
    });
    return jsonResponse(shipment, 201);
  }

  const operationalMatch = url.match(/\/api\/shipments\/([^/]+)\/operational$/);
  if (operationalMatch && init?.method === 'PATCH') {
    const shipment = employeeShipments.find((item) => item.id === operationalMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    const before = { ...shipment };
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const actorUsername = token.includes('CUSTOMER_SERVICE') ? 'service' : token.includes('OPERATOR') ? 'operator' : 'admin';
    const now = new Date().toISOString();
    const nextStatus = !body.status && shipment.status === 'OUTBOUNDED' && body.transferNo?.trim() && body.transferNo !== shipment.transferNo
      ? 'WAITING_DEPARTURE'
      : body.status ?? shipment.status;
    Object.assign(shipment, {
      latestTracking: body.latestTracking ?? shipment.latestTracking,
      transferNo: body.transferNo !== undefined ? body.transferNo || undefined : shipment.transferNo,
      subOrderNo: body.subOrderNo !== undefined ? body.subOrderNo || undefined : shipment.subOrderNo,
      status: nextStatus,
      etaAt: body.etaAt ?? shipment.etaAt,
      etdAt: body.etdAt ?? shipment.etdAt,
      trackingStaleDays: body.latestTracking ? 0 : shipment.trackingStaleDays
    });
    auditLogs.unshift({
      id: `audit-operational-${auditLogs.length + 1}`,
      actorId: `u-${actorUsername}`,
      actorUsername,
      action: 'shipment.operational.update',
      actionLabel: '运单操作更新',
      module: 'orders',
      moduleLabel: '我的订单',
      target: shipment.id,
      result: 'SUCCESS',
      resultLabel: '成功',
      before,
      after: {
        ...shipment,
        trackingWebsite: body.trackingWebsite,
        trackingWebsiteVisibleToSales: body.trackingWebsiteVisibleToSales
      },
      createdAt: now
    });
    if (before.status !== shipment.status) {
      auditLogs.unshift({
        id: `audit-status-${auditLogs.length + 1}`,
        actorId: `u-${actorUsername}`,
        actorUsername,
        action: 'customer_service.status.update',
        actionLabel: '客服状态更新',
        module: 'customer_service',
        moduleLabel: '客服管理',
        target: shipment.id,
        result: 'SUCCESS',
        resultLabel: '成功',
        before: { status: before.status },
        after: { statusFrom: before.status, statusTo: shipment.status, statusAt: now, changedBy: actorUsername },
        createdAt: now
      });
    }
    if (before.status !== 'SIGNED' && shipment.status === 'SIGNED') {
      shipment.signedAt = now;
      auditLogs.unshift({
        id: `audit-signature-${auditLogs.length + 1}`,
        actorId: `u-${actorUsername}`,
        actorUsername,
        action: 'customer_service.signature.confirm',
        actionLabel: '业务员确认签收',
        module: 'customer_service',
        moduleLabel: '客服管理',
        target: shipment.id,
        result: 'SUCCESS',
        resultLabel: '成功',
        before: { status: before.status },
        after: {
          statusFrom: before.status,
          statusTo: 'SIGNED',
          signedBy: actorUsername,
          signatureConfirmedBy: actorUsername,
          signedAt: now,
          signatureConfirmedAt: now,
          transferNo: shipment.transferNo
        },
        createdAt: now
      });
    }
    return jsonResponse(shipment);
  }

  const uploadLabelMatch = url.match(/\/api\/shipments\/([^/]+)\/labels\/upload$/);
  if (uploadLabelMatch && init?.method === 'POST') {
    const shipment = employeeShipments.find((item) => item.id === uploadLabelMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    const file = body.file as File | undefined;
    const label = {
      id: `lbl-upload-${shipmentLabels.length + 1}`,
      shipmentId: shipment.id,
      carrier: 'UPS',
      channelName: shipment.channelName,
      labelNo: `UPL260606${String(shipmentLabels.length + 1).padStart(5, '0')}`,
      transferNo: shipment.transferNo ?? String(body.transferNo ?? ''),
      labelUrl: `/api/uploads/labels/${file?.name ?? 'label.png'}`,
      status: 'CREATED',
      createdAt: '2026-06-06T12:00:00.000Z'
    };
    shipment.latestTracking = '已上传面单';
    shipmentLabels.unshift(label);
    return jsonResponse({ label, shipment }, 201);
  }

  const createProblemMatch = url.match(/\/api\/shipments\/([^/]+)\/problem-tickets$/);
  if (createProblemMatch && init?.method === 'POST') {
    const shipment = employeeShipments.find((item) => item.id === createProblemMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    shipment.hasProblemTicket = true;
    const ticket = {
      id: `pt-${problemTickets.length + 1}`,
      shipmentId: shipment.id,
      systemOrderNo: shipment.systemOrderNo,
      customerName: shipment.customerName,
      reason: String(body.reason ?? ''),
      status: 'OPEN',
      customerVisible: body.customerVisible ?? true,
      createdAt: '2026-06-06T11:00:00Z',
      replies: []
    };
    problemTickets.unshift(ticket);
    const actor = actorUsername();
    auditLogs.unshift({
      id: `audit-problem-${ticket.id}`,
      actorId: `u-${actor}`,
      actorUsername: actor,
      action: 'customer_service.issue.attach',
      actionLabel: '客服挂载问题件',
      module: 'customer_service',
      moduleLabel: '客服管理',
      target: ticket.id,
      result: 'SUCCESS',
      resultLabel: '成功',
      before: null,
      after: { shipmentId: shipment.id, originalStatus: shipment.status, originalStatusPool: shipment.status, issueId: ticket.id, issueType: ticket.reason, handledBy: actor, attachedAt: ticket.createdAt },
      createdAt: ticket.createdAt
    });
    return jsonResponse(ticket, 201);
  }

  const replyProblemMatch = url.match(/\/api\/problem-tickets\/([^/]+)\/replies$/);
  if (replyProblemMatch && init?.method === 'POST') {
    const ticket = problemTickets.find((item) => item.id === replyProblemMatch[1]);
    if (!ticket) return jsonResponse({ message: '问题件不存在' }, 404);
    const actor = actorUsername();
    const reply = { id: `pr-${ticket.replies.length + 1}`, author: actor, message: String(body.message ?? ''), createdAt: '2026-06-06T12:00:00Z' };
    ticket.replies.push(reply);
    auditLogs.unshift({
      id: `audit-problem-reply-${ticket.id}-${ticket.replies.length}`,
      actorId: `u-${actor}`,
      actorUsername: actor,
      action: 'customer_service.issue.update',
      actionLabel: '客服更新问题件',
      module: 'customer_service',
      moduleLabel: '客服管理',
      target: ticket.id,
      result: 'SUCCESS',
      resultLabel: '成功',
      before: null,
      after: { issueId: ticket.id, shipmentId: ticket.shipmentId, status: ticket.status, handledBy: actor, message: reply.message },
      createdAt: reply.createdAt
    });
    return jsonResponse(ticket, 201);
  }

  const closeProblemMatch = url.match(/\/api\/problem-tickets\/([^/]+)\/close$/);
  if (closeProblemMatch && init?.method === 'POST') {
    const ticket = problemTickets.find((item) => item.id === closeProblemMatch[1]);
    if (!ticket) return jsonResponse({ message: '问题件不存在' }, 404);
    const actor = actorUsername();
    ticket.status = 'CLOSED';
    ticket.closedAt = '2026-06-06T13:00:00Z';
    auditLogs.unshift({
      id: `audit-problem-close-${ticket.id}`,
      actorId: `u-${actor}`,
      actorUsername: actor,
      action: 'customer_service.issue.close',
      actionLabel: '客服关闭问题件',
      module: 'customer_service',
      moduleLabel: '客服管理',
      target: ticket.id,
      result: 'SUCCESS',
      resultLabel: '成功',
      before: { status: 'OPEN' },
      after: { issueId: ticket.id, shipmentId: ticket.shipmentId, status: 'CLOSED', handledBy: actor, closedAt: ticket.closedAt },
      createdAt: ticket.closedAt
    });
    return jsonResponse(ticket, 201);
  }

  const paymentMatch = url.match(/\/api\/shipments\/([^/]+)\/payment$/);
  if (paymentMatch && init?.method === 'POST') {
    const shipment = employeeShipments.find((item) => item.id === paymentMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    Object.assign(shipment, {
      paymentAmountUsd: body.paymentAmountUsd,
      paymentAmountCny: body.paymentAmountCny,
      paymentMethod: body.paymentMethod
    });
    return jsonResponse(shipment);
  }

  if (url.endsWith('/api/shipments/tracking-events/import') && init?.method === 'POST') {
    const updated = (body.updates ?? []).map((item: { shipmentId: string; latestTracking: string }) => {
      const shipment = employeeShipments.find((current) => current.id === item.shipmentId);
      if (!shipment) {
        return undefined;
      }
      Object.assign(shipment, { latestTracking: item.latestTracking, trackingStaleDays: 0 });
      return shipment;
    }).filter(Boolean);
    return jsonResponse({ updated });
  }

  if (url.endsWith('/api/problem-tickets')) {
    return jsonResponse(problemTickets);
  }

  if (url.endsWith('/api/pricing/books/import') && init?.method === 'POST') {
    const book: PriceBookSummary = {
      id: `pb-${importedPriceBooks.length + 1}`,
      fileName: body.fileName,
      rowCount: body.rows.length,
      importedAt: '2026-06-07T13:06:11.000Z'
    };
    const rows: PriceBookRowSummary[] = body.rows.map((row: Omit<PriceBookRowSummary, 'id' | 'priceBookId'>, index: number) => ({
      ...row,
      id: `pbr-${importedPriceRows.length + index + 1}`,
      priceBookId: book.id,
      realChannelName: row.realChannelName ?? row.channelName,
      quoteSourceType: row.quoteSourceType ?? 'local'
    }));
    importedPriceBooks.unshift(book);
    importedPriceRows.unshift(...rows);
    return jsonResponse({ book, rows });
  }

  const priceBookRemarkMatch = url.match(/\/api\/pricing\/books\/([^/]+)\/remark$/);
  if (priceBookRemarkMatch && init?.method === 'PUT') {
    const book = importedPriceBooks.find((item) => item.id === priceBookRemarkMatch[1]);
    if (!book) {
      return jsonResponse({ message: '价格表不存在' }, 404);
    }
    book.remark = body.remark || undefined;
    return jsonResponse(book);
  }

  const priceBookDeleteMatch = url.match(/\/api\/pricing\/books\/([^/]+)$/);
  if (priceBookDeleteMatch && init?.method === 'DELETE') {
    const bookIndex = importedPriceBooks.findIndex((item) => item.id === priceBookDeleteMatch[1]);
    if (bookIndex < 0) {
      return jsonResponse({ message: '价格表不存在' }, 404);
    }
    const [book] = importedPriceBooks.splice(bookIndex, 1);
    for (let index = importedPriceRows.length - 1; index >= 0; index -= 1) {
      if (importedPriceRows[index].priceBookId === book.id) {
        importedPriceRows.splice(index, 1);
      }
    }
    return jsonResponse(book);
  }

  if (url.endsWith('/api/pricing/books')) {
    return jsonResponse({ books: importedPriceBooks, rows: importedPriceRows });
  }

  if (url.endsWith('/api/pricing/markup-rules') && init?.method === 'POST') {
    const rule: AgentMarkupSummary = {
      id: `markup-${agentMarkupRules.length + 1}`,
      agentName: body.agentName,
      channelName: body.channelName,
      realChannelName: body.realChannelName,
      destinationCountry: body.destinationCountry,
      markupPerKg: body.markupPerKg,
      enabled: body.enabled !== false
    };
    agentMarkupRules.unshift(rule);
    return jsonResponse(rule);
  }

  const markupUpdateMatch = url.match(/\/api\/pricing\/markup-rules\/([^/]+)$/);
  if (markupUpdateMatch && init?.method === 'PUT') {
    const rule = agentMarkupRules.find((item) => item.id === markupUpdateMatch[1]);
    if (!rule) {
      return jsonResponse({ message: '加价规则不存在' }, 404);
    }
    Object.assign(rule, body);
    return jsonResponse(rule);
  }

  if (markupUpdateMatch && init?.method === 'DELETE') {
    const index = agentMarkupRules.findIndex((item) => item.id === markupUpdateMatch[1]);
    if (index === -1) {
      return jsonResponse({ message: '加价规则不存在' }, 404);
    }
    const [rule] = agentMarkupRules.splice(index, 1);
    return jsonResponse(rule);
  }

  if (url.endsWith('/api/pricing/markup-rules')) {
    return jsonResponse(agentMarkupRules);
  }

  if (url.endsWith('/api/pricing/lookup') && init?.method === 'POST') {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const isAdmin = token.includes('ADMIN');
    const chargeableWeightKg = Number(body.chargeableWeightKg);
    const warehouseCode = String(body.amazonCode ?? '').trim().toUpperCase();
    const markupRules = agentMarkupRules;
    const bookRemarkMap = new Map(importedPriceBooks.map((book) => [book.id, book.remark]));
    const matchedRows = [...importedPriceRows, ...backendSeedPriceRows].filter(
      (row) =>
        (!row.warehouseCode || !warehouseCode || row.warehouseCode.toUpperCase() === warehouseCode) &&
        row.destinationCountry === body.destinationCountry &&
        chargeableWeightKg >= row.minWeightKg &&
        chargeableWeightKg <= row.maxWeightKg
    );
    const recommendations = matchedRows
      .map((row) => {
        const markup = findBestTestMarkupRule(markupRules, row);
        if (!markup) {
          return undefined;
        }
        const salesRatePerKg = Math.round((row.costPerKg + markup.markupPerKg) * 100) / 100;
        const totalCost = Math.round(row.costPerKg * chargeableWeightKg * 100) / 100;
        const totalSales = Math.round(salesRatePerKg * chargeableWeightKg * 100) / 100;
        const visiblePrice: Omit<PriceBookRowSummary, 'costPerKg'> & { costPerKg?: number } = { ...row };
        if (!isAdmin) {
          visiblePrice.costPerKg = undefined;
        }
        return {
          price: visiblePrice,
          ...(isAdmin ? { markup } : {}),
          channelName: row.channelName,
          carrierName: row.carrierName ?? '专线',
          agentName: row.agentName,
          businessRouteName: row.businessRouteName,
          realChannelName: row.realChannelName ?? row.channelName,
          isRouteMapped: Boolean(row.businessRouteName),
          quoteSourceType: row.quoteSourceType ?? 'local',
          weightSegmentLabel: `${row.minWeightKg}-${row.maxWeightKg}kg`,
          salesRatePerKg,
          freightFee: totalSales,
          surchargeFee: row.surchargeFee ?? 0,
          totalFee: totalSales + (row.surchargeFee ?? 0),
          freightUnitPrice: salesRatePerKg,
          totalUnitPrice: Math.round(((totalSales + (row.surchargeFee ?? 0)) / chargeableWeightKg) * 100) / 100,
          ...(isAdmin ? { totalCost, grossProfit: Math.round((totalSales - totalCost) * 100) / 100 } : {}),
          totalSales,
          transitLabel: row.transitLabel ?? '时效待确认',
          surchargeDetails: row.surchargeDetails ?? [],
          ...(row.productSurchargeRemark ? { productSurchargeRemark: row.productSurchargeRemark } : {}),
          ...(row.specialRemark ? { specialRemark: row.specialRemark } : {}),
          ...(row.priceBookId && bookRemarkMap.get(row.priceBookId) ? { remark: bookRemarkMap.get(row.priceBookId) } : {})
        };
      })
      .filter(Boolean);
    const cheapestRecommendations = [...recommendations].sort((left: any, right: any) => left.totalSales - right.totalSales).slice(0, 3);
    const fastestRecommendations = [...recommendations].sort((left: any, right: any) => (left.price.transitDays ?? 99999) - (right.price.transitDays ?? 99999)).slice(0, 3);
    const best = cheapestRecommendations[0] as any;
    return jsonResponse({
      price: best.price,
      ...(isAdmin ? { markup: best.markup } : {}),
      recommendations,
      cheapestRecommendations,
      fastestRecommendations,
      agentErrors: [{ agentName: 'BSD', quoteCount: 0, errorCode: 'TOKEN_INVALID', errorMessage: 'Token不正确' }],
      amazonCode: body.amazonCode ?? '',
      productName: body.productName ?? '',
      postalCode: body.postalCode ?? '',
      address: body.address ?? '',
      packageInfo: body.packageInfo ?? '',
      channelName: best.channelName,
      chargeableWeightKg,
      weightSegmentLabel: best.weightSegmentLabel,
      salesRatePerKg: best.salesRatePerKg,
      ...(isAdmin ? { totalCost: best.totalCost, grossProfit: best.grossProfit } : {}),
      totalSales: best.totalSales,
      totalPrice: best.totalSales
    });
  }

  if (url.endsWith('/api/pricing/rules') && init?.method === 'POST') {
    const rule = {
      id: 'pr-dhl-us-5-20',
      channelId: 'ch-dhl-hk',
      channelName: 'DHL HK',
      destinationCountry: '美国',
      minWeightKg: 5,
      maxWeightKg: 20,
      ratePerKg: 8,
      currency: 'USD',
      enabled: true
    };
    pricingRules.push(rule);
    return jsonResponse(rule);
  }

  if (url.endsWith('/api/pricing/rules/pr-dhl-us-5-20/enabled')) {
    pricingRules[pricingRules.findIndex((rule) => rule.id === 'pr-dhl-us-5-20')] = {
      ...pricingRules.find((rule) => rule.id === 'pr-dhl-us-5-20')!,
      enabled: body.enabled
    };
    return jsonResponse(pricingRules.find((rule) => rule.id === 'pr-dhl-us-5-20'));
  }

  if (url.endsWith('/api/pricing/rules/quote')) {
    return jsonResponse({
      rule: pricingRules[0],
      freight: 290,
      fuel: 43.5,
      surchargeTotal: 50,
      total: 383.5,
      currency: 'RMB',
      originalCurrency: 'USD',
      exchangeRate: 7.25,
      appliedFuelRate: 0.15,
      appliedSurcharges: [{ name: '偏远附加费', amount: 50 }]
    });
  }

  if (url.endsWith('/api/pricing/rules')) {
    return jsonResponse(pricingRules);
  }

  if (url.endsWith('/api/pricing/quote')) {
    return jsonResponse({ freight: 200, fuel: 30, surchargeTotal: 50, total: 280 });
  }

  if (url.endsWith('/api/shipments/order-entry/packages')) {
    return jsonResponse(warehousePackages.filter((pkg) => !pkg.shipmentId && !pkg.systemOrderNo));
  }

  if (url.endsWith('/api/shipments/order-entry') && init?.method === 'POST') {
    if (body.shipment?.transferNo?.trim()) {
      return jsonResponse({ message: '录单阶段不能填写转单号，请在出库后完成双审核再填写' }, 400);
    }
    const customerCode = body.shipment?.customerCode ?? '1399';
    const selectedPackages = warehousePackages.filter((pkg) => body.warehousePackageIds?.includes(pkg.id));
    const packageCount = selectedPackages.reduce((sum, pkg) => sum + pkg.packageCount, 0) || selectedPackages.length;
    const chargeWeightKg = selectedPackages.reduce((sum, pkg) => sum + pkg.chargeableWeightKg, 0);
    const created: Shipment = {
      id: `entry-${employeeShipments.length + 1}`,
      createdAt: '2026-06-25T10:00:00.000Z',
      customerName: `${customerCode}-${customerCode === '9409' ? 'Daloday' : '仓库客户'}`,
      customerCode,
      salesperson: 'operator',
      customerOrderNo: body.shipment?.customerOrderNo ?? customerCode,
      systemOrderNo: body.shipment?.systemOrderNo ?? `SYENTRY${String(employeeShipments.length + 1).padStart(6, '0')}`,
      subOrderNo: body.shipment?.subOrderNo,
      draftWarehousePackageIds: body.submitForReview ? [] : body.warehousePackageIds,
      productName: body.shipment?.productName,
      declarationRequired: body.shipment?.declarationRequired,
      sensitive: body.shipment?.sensitive,
      cargoType: body.shipment?.cargoType,
      volumeCbm: selectedPackages.reduce((sum, pkg) => sum + pkg.cbm, 0),
      settlementMethod: body.shipment?.settlementMethod,
      tradeTerms: body.shipment?.tradeTerms,
      fbaInboundNo: body.shipment?.fbaInboundNo,
      entryBy: 'admin',
      remark: body.shipment?.remark,
      businessType: body.shipment?.businessType ?? 'DEDICATED_LINE',
      packageType: body.shipment?.packageType ?? 'WPX',
      destinationCountry: body.shipment?.destinationCountry ?? '美国',
      carrier: body.shipment?.receivingChannel ?? '',
      packageCount,
      receivableWeightKg: chargeWeightKg,
      agentWeightKg: chargeWeightKg,
      latestTracking: body.submitForReview ? '财务录单创建，待审核' : '财务录单保存草稿',
      trackingStaleDays: 0,
      isRemoteArea: false,
      status: body.submitForReview ? 'REVIEW_PENDING' : 'DRAFT',
      channelName: body.shipment?.receivingChannel ?? '',
      agentName: body.shipment?.agentName ?? '',
      hasProblemTicket: false
    };
    employeeShipments.unshift(created);
    if (body.submitForReview) {
      selectedPackages.forEach((pkg) => {
        pkg.shipmentId = created.id;
        pkg.systemOrderNo = created.systemOrderNo;
      });
    }
    const createdReceivables = (body.receivables ?? []).map((row: any, index: number): ReceivableAuditSummary => ({
      id: `entry-rf-${receivableFees.length + index + 1}`,
      shipmentId: created.id,
      systemOrderNo: created.systemOrderNo,
      customerName: created.customerName,
      customerCode,
      customerOrderNo: created.customerOrderNo,
      transferNo: created.transferNo,
      salesperson: created.salesperson,
      name: row.name,
      amount: row.amount,
      settled: false,
      type: 'RECEIVABLE',
      currency: row.currency ?? 'RMB',
      settlementMethod: row.settlementMethod,
      paymentNo: row.paymentNo,
      reconciliationStatus: 'PENDING',
      createdAt: created.createdAt,
      createdBy: 'admin',
      remark: row.remark,
      sourceType: 'MANUAL'
    }));
    const createdBusinessCosts = (body.businessCosts ?? []).map((row: any, index: number): BusinessCostAuditSummary => ({
      id: `entry-bc-${businessCostFees.length + index + 1}`,
      shipmentId: created.id,
      name: row.name,
      amount: row.amount,
      settled: false,
      type: 'BUSINESS_COST',
      currency: row.currency ?? 'RMB',
      settlementMethod: row.settlementMethod,
      reconciliationStatus: 'PENDING',
      createdAt: created.createdAt,
      createdBy: 'admin',
      remark: row.remark,
      sourceType: 'MANUAL',
      chargeWeightKg: row.chargeWeightKg,
      unitPrice: row.unitPrice,
      salesperson: created.salesperson,
      customerCode,
      customerName: created.customerName,
      customerOrderNo: created.customerOrderNo,
      systemOrderNo: created.systemOrderNo,
      transferNo: created.transferNo,
      receivableTotal: createdReceivables.reduce((sum: number, fee: ReceivableAuditSummary) => sum + fee.amount, 0),
      businessCostTotal: row.amount,
      businessProfit: Number((createdReceivables.reduce((sum: number, fee: ReceivableAuditSummary) => sum + fee.amount, 0) - row.amount).toFixed(2))
    }));
    const createdPayables = (body.payables ?? []).map((row: any, index: number): PayableAuditSummary => ({
      id: `entry-pf-${payableAuditFees.length + index + 1}`,
      shipmentId: created.id,
      name: row.name,
      amount: row.amount,
      settled: false,
      agentName: row.agentName,
      type: 'PAYABLE',
      currency: row.currency ?? 'RMB',
      settlementMethod: row.settlementMethod,
      paymentNo: row.paymentNo,
      reconciliationStatus: 'PENDING',
      createdAt: created.createdAt,
      createdBy: 'admin',
      remark: row.remark,
      sourceType: 'MANUAL',
      salesperson: created.salesperson,
      customerCode,
      customerName: created.customerName,
      customerOrderNo: created.customerOrderNo,
      systemOrderNo: created.systemOrderNo,
      transferNo: created.transferNo,
      payableTotal: row.amount
    }));
    receivableFees.push(...createdReceivables);
    businessCostFees.push(...createdBusinessCosts);
    payableAuditFees.push(...createdPayables);
    return jsonResponse({
      shipment: created,
      packages: selectedPackages,
      receivables: createdReceivables,
      businessCosts: createdBusinessCosts,
      payables: createdPayables,
      canViewPayables: true
    }, 201);
  }

  if (url.includes('/api/warehouse/today-receipts')) {
    const params = new URL(url, 'http://test.local').searchParams;
    const keyword = (value: string | undefined, key: string) => {
      const needle = params.get(key);
      return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    };
    const rows = warehousePackages.filter((pkg) =>
      (!params.get('site') || pkg.site === params.get('site'))
      && keyword(pkg.customerOrderNo, 'customerOrderNo')
      && keyword(pkg.domesticTrackingNo, 'domesticTrackingNo')
      && keyword(pkg.combinedOrderNo, 'combinedOrderNo')
    );
    const grouped = new Map<string, WarehousePackageSummary[]>();
    rows.forEach((row) => grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]));
    return jsonResponse({
      totals: {
        receiptTickets: grouped.size,
        totalPackages: rows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: Number(rows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0).toFixed(2)),
        totalCbm: Number(rows.reduce((sum, row) => sum + row.cbm, 0).toFixed(3)),
        waitingDispatchTickets: employeeShipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH').length,
        pendingTallyTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length,
        exceptionTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length
      },
      rows
    });
  }

  if (url.includes('/api/warehouse/in-stock')) {
    const params = new URL(url, 'http://test.local').searchParams;
    const keyword = (value: string | undefined, key: string) => {
      const needle = params.get(key);
      return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    };
    const rows = warehousePackages.filter((pkg) =>
      pkg.status !== 'CONSOLIDATED'
      && pkg.status !== 'SHIPPED'
      && (!params.get('site') || pkg.site === params.get('site'))
      && keyword(pkg.customerOrderNo, 'customerOrderNo')
      && keyword(pkg.domesticTrackingNo, 'domesticTrackingNo')
      && keyword(pkg.combinedOrderNo, 'combinedOrderNo')
      && keyword(`${pkg.remark ?? ''} ${pkg.manualException ?? ''} ${pkg.exceptions.join(' ')}`, 'operationKeyword')
    );
    const grouped = new Map<string, WarehousePackageSummary[]>();
    rows.forEach((row) => grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]));
    return jsonResponse({
      totals: {
        receiptTickets: grouped.size,
        totalPackages: rows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: Number(rows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0).toFixed(2)),
        totalCbm: Number(rows.reduce((sum, row) => sum + row.cbm, 0).toFixed(3)),
        waitingDispatchTickets: employeeShipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH').length,
        pendingTallyTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length,
        exceptionTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length
      },
      rows
    });
  }

  if (url.includes('/api/warehouse/tally-tasks') && init?.method !== 'POST' && init?.method !== 'PATCH') {
    const params = new URL(url, 'http://test.local').searchParams;
    const status = params.get('status');
    const combinedOrderNo = params.get('combinedOrderNo');
    const rows = warehouseTallyTasks.filter((task) =>
      (!status || task.status === status)
      && (!combinedOrderNo || task.sourceCombinedOrderNo.includes(combinedOrderNo))
    );
    return jsonResponse(rows.map((task) => ({ ...task, packageIds: [...task.packageIds] })));
  }

  if (url.endsWith('/api/warehouse/tally-tasks') && init?.method === 'POST') {
    const selected = warehousePackages.filter((pkg) => body.packageIds.includes(pkg.id));
    const first = selected[0];
    const task: WarehouseTallyTaskSummary = {
      id: `wht-${warehouseTallyTasks.length + 1}`,
      taskNo: `${first?.combinedOrderNo ?? 'WH'}-TL${String(warehouseTallyTasks.length + 1).padStart(3, '0')}`,
      status: 'PENDING',
      packageIds: selected.map((pkg) => pkg.id),
      sourcePackageId: first?.id ?? '',
      sourceCombinedOrderNo: first?.combinedOrderNo ?? '',
      customerCode: first?.customerCode ?? '',
      customerName: first?.customerName,
      salesperson: first?.salesperson,
      packageCount: selected.reduce((sum, pkg) => sum + pkg.packageCount, 0),
      originalWeightKg: Number(selected.reduce((sum, pkg) => sum + pkg.weightKg * pkg.packageCount, 0).toFixed(2)),
      originalLengthCm: first?.lengthCm ?? 0,
      originalWidthCm: first?.widthCm ?? 0,
      originalHeightCm: first?.heightCm ?? 0,
      originalVolumetricWeightKg: Number(selected.reduce((sum, pkg) => sum + (pkg.totalVolumetricWeightKg ?? pkg.volumetricWeightKg), 0).toFixed(2)),
      originalVolumetricWeightKg5000: Number(selected.reduce((sum, pkg) => sum + (pkg.totalVolumetricWeightKg5000 ?? pkg.volumetricWeightKg5000 ?? 0), 0).toFixed(2)),
      tallyRequirement: body.tallyRequirement,
      remark: body.remark,
      createdBy: 'warehouse',
      createdAt: '2026-06-26T11:00:00.000+08:00',
      labelStatus: 'NOT_GENERATED'
    };
    warehouseTallyTasks.unshift(task);
    return jsonResponse(task, 201);
  }

  if (url.match(/\/api\/warehouse\/tally-tasks\/[^/]+\/complete$/) && init?.method === 'POST') {
    const id = url.split('/').at(-2);
    const index = warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) return jsonResponse({ message: '理货任务不存在' }, 404);
    const task = warehouseTallyTasks[index];
    const packageCount = Number(body.packageCount ?? task.packageCount);
    const lengthCm = Number(body.lengthCm ?? task.originalLengthCm);
    const widthCm = Number(body.widthCm ?? task.originalWidthCm);
    const heightCm = Number(body.heightCm ?? task.originalHeightCm);
    const completed: WarehouseTallyTaskSummary = {
      ...task,
      status: 'COMPLETED',
      completedPackageCount: packageCount,
      completedWeightKg: Number(body.weightKg ?? task.originalWeightKg),
      completedLengthCm: lengthCm,
      completedWidthCm: widthCm,
      completedHeightCm: heightCm,
      completedVolumetricWeightKg: Number(((lengthCm * widthCm * heightCm * packageCount) / 6000).toFixed(2)),
      completedVolumetricWeightKg5000: Number(((lengthCm * widthCm * heightCm * packageCount) / 5000).toFixed(2)),
      completedBy: 'warehouse',
      completedAt: '2026-06-26T12:00:00.000+08:00',
      remark: body.remark || task.remark
    };
    warehouseTallyTasks[index] = completed;
    return jsonResponse(completed, 201);
  }

  if (url.match(/\/api\/warehouse\/tally-tasks\/[^/]+\/label$/) && init?.method === 'POST') {
    const id = url.split('/').at(-2);
    const index = warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) return jsonResponse({ message: '理货任务不存在' }, 404);
    const task = warehouseTallyTasks[index];
    const labelNo = task.labelNo ?? `${task.taskNo}-LBL`;
    const updated: WarehouseTallyTaskSummary = {
      ...task,
      labelStatus: 'GENERATED',
      labelNo,
      labelQrContent: JSON.stringify({
        type: 'WAREHOUSE_TALLY_LABEL',
        labelNo,
        taskNo: task.taskNo,
        customerCode: task.customerCode,
        date: (task.completedAt ?? task.createdAt).slice(0, 10),
        packageCount: task.completedPackageCount ?? task.packageCount,
        sourcePackageId: task.sourcePackageId,
        sourceCombinedOrderNo: task.sourceCombinedOrderNo
      }),
      labelGeneratedAt: '2026-06-26T12:10:00.000+08:00',
      labelGeneratedBy: 'warehouse'
    };
    warehouseTallyTasks[index] = updated;
    return jsonResponse(updated, 201);
  }

  if (url.match(/\/api\/warehouse\/tally-tasks\/[^/]+\/label\/print$/) && init?.method === 'POST') {
    const id = url.split('/').at(-3);
    const index = warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) return jsonResponse({ message: '理货任务不存在' }, 404);
    const updated = { ...warehouseTallyTasks[index], labelPrintedAt: '2026-06-26T12:15:00.000+08:00', labelPrintedBy: 'warehouse' };
    warehouseTallyTasks[index] = updated;
    return jsonResponse(updated, 201);
  }

  if (url.match(/\/api\/warehouse\/tally-tasks\/[^/]+\/label\/download$/) && init?.method === 'POST') {
    const id = url.split('/').at(-3);
    const index = warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) return jsonResponse({ message: '理货任务不存在' }, 404);
    const updated = { ...warehouseTallyTasks[index], labelDownloadedAt: '2026-06-26T12:20:00.000+08:00', labelDownloadedBy: 'warehouse' };
    warehouseTallyTasks[index] = updated;
    return jsonResponse(updated, 201);
  }

  if (url.endsWith('/api/warehouse/packages') && init?.method === 'POST') {
    const customerCode = body.customerCode ?? body.customerOrderNo ?? String(body.combinedOrderNo ?? '').split('-')[0];
    const customerOrderNo = body.customerOrderNo ?? customerCode;
    const domesticTrackingNo = body.domesticTrackingNo ?? String(body.combinedOrderNo ?? '').slice(String(body.combinedOrderNo ?? '').indexOf('-') + 1);
    const packageCount = body.packageCount ?? 1;
    const volume = body.lengthCm * body.widthCm * body.heightCm * packageCount;
    const sides = [body.lengthCm, body.widthCm, body.heightCm].sort((a: number, b: number) => b - a);
    const pkg: WarehousePackageSummary = {
      id: `wh-created-${warehousePackages.length + 1}`,
      customerCode,
      customerName: customerCode === '9409' ? '9409-Daloday' : `${customerCode}-仓库客户`,
      site: '深圳站',
      salesperson: 'operator',
      manualException: body.manualException,
      scanSource: body.scanSource,
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
      labelNo: `${customerCode}-${domesticTrackingNo}-${body.packageIndex}/${body.expectedTotalPackageCount}`,
      expectedTotalPackageCount: body.expectedTotalPackageCount,
      packageIndex: body.packageIndex,
      receivingChannel: '外部标签识别',
      packageCount,
      weightKg: body.weightKg,
      lengthCm: body.lengthCm,
      widthCm: body.widthCm,
      heightCm: body.heightCm,
      girthCm: sides[0] + 2 * (sides[1] + sides[2]),
      cbm: Number((volume / 1000000).toFixed(6)),
      totalCbm: Number((volume / 1000000).toFixed(6)),
      volumetricWeightKg: Number((volume / 6000).toFixed(2)),
      volumetricWeightKg5000: Number((volume / 5000).toFixed(2)),
      totalVolumetricWeightKg: Number((volume / 6000).toFixed(2)),
      totalVolumetricWeightKg5000: Number((volume / 5000).toFixed(2)),
      chargeableWeightKg: Math.max(body.weightKg, Number((volume / 6000).toFixed(2))),
      divisor: 6000,
      roundingRule: 'NONE',
      scanTime: body.scanTime,
      inboundAt: body.scanTime,
      tallyStatus: '待理货',
      splitStatus: '原始票',
      consolidationStatus: '未合票',
      outboundStatus: '未出库',
      remark: body.remark,
      status: 'RECEIVED',
      exceptions: body.expectedTotalPackageCount > body.packageIndex ? ['部分到仓'] : [],
      createdAt: body.scanTime
    };
    pkg.receiptSourceId = pkg.id;
    warehousePackages.unshift(pkg);
    return jsonResponse(pkg, 201);
  }

  const warehousePackageExceptionMatch = url.match(/\/api\/warehouse\/packages\/([^/]+)\/exception$/);
  if (warehousePackageExceptionMatch && init?.method === 'PATCH') {
    const pkg = warehousePackages.find((item) => item.id === warehousePackageExceptionMatch[1]);
    if (!pkg) {
      return jsonResponse({ message: '仓库包裹不存在' }, 404);
    }
    pkg.manualException = body.manualException || undefined;
    return jsonResponse(pkg);
  }

  const warehousePackageSplitMatch = url.match(/\/api\/warehouse\/packages\/([^/]+)\/split$/);
  if (warehousePackageSplitMatch && init?.method === 'POST') {
    const source = warehousePackages.find((item) => item.id === warehousePackageSplitMatch[1]);
    if (!source) {
      return jsonResponse({ message: '仓库包裹不存在' }, 404);
    }
    source.status = 'CONSOLIDATED';
    const pieces = Array.isArray(body.pieces) ? body.pieces.map(Number).filter((item: number) => item > 0) : [];
    const splitCount = pieces.length || Number(body.splitCount) || 2;
    const splitPieces = pieces.length ? pieces : Array.from({ length: splitCount }, () => 1);
    const pieceTotal = splitPieces.reduce((sum: number, item: number) => sum + item, 0);
    const packages = splitPieces.map((pieceCount: number, index: number): WarehousePackageSummary => {
      const ratio = pieceCount / pieceTotal;
      return {
        ...source,
        id: `${source.id}-split-${index + 1}`,
        combinedOrderNo: pieces.length ? `${source.combinedOrderNo}-${index + 1}` : `${source.customerOrderNo}-${source.domesticTrackingNo}-S${index + 1}`,
        labelNo: `${source.customerCode}-${source.domesticTrackingNo}-${index + 1}/${splitCount}`,
        sourcePackageId: source.id,
        sourcePackageNo: source.combinedOrderNo,
        expectedTotalPackageCount: splitCount,
        packageIndex: index + 1,
        packageCount: pieces.length ? pieceCount : 1,
        weightKg: Number((source.weightKg * ratio).toFixed(2)),
        cbm: Number((source.cbm * ratio).toFixed(6)),
        totalCbm: Number((source.cbm * ratio).toFixed(6)),
        volumetricWeightKg: Number((source.volumetricWeightKg * ratio).toFixed(2)),
        volumetricWeightKg5000: Number(((source.lengthCm * source.widthCm * source.heightCm * (pieces.length ? pieceCount : 1)) / 5000).toFixed(2)),
        totalVolumetricWeightKg: Number((source.volumetricWeightKg * ratio).toFixed(2)),
        totalVolumetricWeightKg5000: Number(((source.lengthCm * source.widthCm * source.heightCm * (pieces.length ? pieceCount : 1)) / 5000).toFixed(2)),
        chargeableWeightKg: Number((source.chargeableWeightKg * ratio).toFixed(2)),
        receiptSourceId: source.receiptSourceId ?? source.id,
        tallyStatus: '待理货',
        splitStatus: '拆票子票',
        consolidationStatus: '未合票',
        outboundStatus: '未出库',
        remark: body.remark,
        status: 'RECEIVED',
        exceptions: []
      };
    });
    warehousePackages.unshift(...packages);
    return jsonResponse({ sourcePackage: source, packages }, 201);
  }

  if (url.endsWith('/api/warehouse/packages')) {
    return jsonResponse(warehousePackages);
  }

  const warehousePackageRemarkMatch = url.match(/\/api\/warehouse\/packages\/([^/]+)\/remark$/);
  if (warehousePackageRemarkMatch && init?.method === 'PUT') {
    const pkg = warehousePackages.find((item) => item.id === warehousePackageRemarkMatch[1]);
    if (!pkg) {
      return jsonResponse({ message: '仓库包裹不存在' }, 404);
    }
    pkg.remark = body.remark || undefined;
    return jsonResponse(pkg);
  }

  if (url.endsWith('/api/warehouse/package-groups')) {
    return jsonResponse([
      {
        id: '1399',
        customerCode: '1399',
        customerOrderNo: '1399',
        domesticTrackingNo: 'KY4001036478949',
        combinedOrderNo: '1399-KY4001036478949',
        expectedTotalPackageCount: 10,
        arrivedPackageCount: warehousePackages.filter((pkg) => pkg.customerOrderNo === '1399').length,
        remainingPackageCount: 7,
        totalActualWeightKg: 42.3,
        totalCbm: 0.907902,
        maxLengthCm: 130,
        maxWidthCm: 46,
        maxHeightCm: 51,
        maxVolumetricWeightKg: 51.32,
        totalChargeableWeightKg: 151.32,
        latestScanTime: '2026-06-08T10:12:43.000+08:00'
      }
    ]);
  }

  if (url.endsWith('/api/warehouse/consolidations') && init?.method === 'POST') {
    const selected = warehousePackages.filter((pkg) => body.packageIds.includes(pkg.id));
    const mode = body.mode;
    const consolidationNo = `${selected[0]?.customerOrderNo ?? 'WH'}-${mode === 'MERGE_AND_SHIP' ? 'OUT' : 'MERGE'}001`;
    selected.forEach((pkg) => {
      pkg.status = 'CONSOLIDATED';
    });
    if (mode === 'MERGE_AND_SHIP') {
      employeeShipments.unshift(shipment(`s-${consolidationNo}`, consolidationNo, selected[0]?.customerOrderNo ?? consolidationNo, 'DRAFT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        packageCount: selected.reduce((total, pkg) => total + pkg.packageCount, 0),
        receivableWeightKg: selected.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0),
        agentWeightKg: selected.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0),
        latestTracking: '理货合并创建出货订单，待审核'
      }));
    }
    return jsonResponse({
      id: `whc-${consolidationNo}`,
      consolidationNo,
      mode,
      shipmentId: mode === 'MERGE_AND_SHIP' ? `s-${consolidationNo}` : undefined,
      systemOrderNo: mode === 'MERGE_AND_SHIP' ? consolidationNo : undefined,
      packageIds: selected.map((pkg) => pkg.id),
      totalPackages: selected.reduce((total, pkg) => total + pkg.packageCount, 0),
      totalActualWeightKg: selected.reduce((total, pkg) => total + pkg.weightKg, 0),
      totalVolumetricWeightKg: selected.reduce((total, pkg) => total + pkg.volumetricWeightKg, 0),
      totalChargeableWeightKg: selected.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0),
      createdAt: '2026-06-11T20:00:00.000+08:00'
    });
  }

  if (url.endsWith('/api/finance/receivables')) {
    return jsonResponse(receivableFees);
  }

  if (url.endsWith('/api/finance/dashboard')) {
    const pendingReceivables = receivableFees.filter((row) => row.reconciliationStatus === 'PENDING');
    const pendingBusinessCosts = businessCostFees.filter((row) => row.reconciliationStatus === 'PENDING');
    const pendingPayables = payableAuditFees.filter((row) => row.reconciliationStatus === 'PENDING');
    const matchableWaterReceipts = waterReceipts.filter((row) => ['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status) && row.balance > 0);
    const agentBillDifferences = paymentVouchers.filter((row) => row.differenceStatus === 'PENDING' || row.status === 'DIFFERENCE_PENDING');
    return jsonResponse({
      kpis: [
        { key: 'pending-receivables', title: '待审应收', count: pendingReceivables.length, amount: pendingReceivables.reduce((total, row) => total + row.amount, 0), currency: 'RMB', sectionKey: 'receivables' },
        { key: 'pending-business-costs', title: '待审业务成本', count: pendingBusinessCosts.length, amount: pendingBusinessCosts.reduce((total, row) => total + row.amount, 0), currency: 'RMB', sectionKey: 'business-costs' },
        { key: 'pending-payables', title: '待审应付', count: pendingPayables.length, amount: pendingPayables.reduce((total, row) => total + row.amount, 0), currency: 'RMB', sectionKey: 'payables' },
        { key: 'water-receipts', title: '待匹配水单', count: matchableWaterReceipts.length, amount: matchableWaterReceipts.reduce((total, row) => total + row.balance, 0), currency: 'RMB', sectionKey: 'water-receipts' }
      ],
      todos: [
        { key: 'todo-receivables', title: '应收审核', count: pendingReceivables.length, sectionKey: 'receivables' },
        { key: 'todo-business-costs', title: '业务成本审核', count: pendingBusinessCosts.length, sectionKey: 'business-costs' },
        { key: 'todo-payables', title: '应付审核', count: pendingPayables.length, sectionKey: 'payables' },
        { key: 'todo-water-receipts', title: '水单匹配', count: matchableWaterReceipts.length, sectionKey: 'water-receipts' }
      ],
      exceptions: [
        { key: 'exception-water-balance', title: '到账水单有余额', count: matchableWaterReceipts.length, description: '需继续匹配应收', sectionKey: 'water-receipts' },
        { key: 'exception-agent-bill-difference', title: '代理账单差异待处理', count: agentBillDifferences.length, sectionKey: 'agent-bill-ai' }
      ],
      quickActions: [
        { key: 'quick-receivables', title: '应收审核', sectionKey: 'receivables' },
        { key: 'quick-business-costs', title: '业务成本审核', sectionKey: 'business-costs' },
        { key: 'quick-payables', title: '应付审核', sectionKey: 'payables' },
        { key: 'quick-pending-payments', title: '待付款', sectionKey: 'payment-applications' },
        { key: 'quick-paid-payments', title: '已付款', sectionKey: 'paid-verification' },
        { key: 'quick-water-receipts', title: '水单匹配', sectionKey: 'water-receipts' },
        { key: 'quick-agent-bills', title: '代理账单核对', sectionKey: 'agent-bill-ai' }
      ]
    });
  }

  if (url.includes('/api/finance/water-receipts') && !url.match(/\/api\/finance\/water-receipts\/[^/?]+/)) {
    if (init?.method === 'POST') {
      const customer = masterData.customers.find((item) => item.id === body.customerId || item.code === body.customerCode);
      const receiptDate = body.receiptDate ?? '2026-06-18T10:00:00.000Z';
      const sameDayCount = waterReceipts.filter((row) => row.receiptNo.startsWith(`SD${receiptDate.slice(0, 10).replaceAll('-', '')}`)).length;
      const row: WaterReceiptSummary = {
        id: `wr-${waterReceipts.length + 1}`,
        receiptNo: `SD${receiptDate.slice(0, 10).replaceAll('-', '')}${String(sameDayCount + 1).padStart(3, '0')}`,
        site: body.site || '思远收款',
        customerId: customer?.id,
        customerCode: customer?.code ?? body.customerCode,
        customerName: customer ? `${customer.code}-${customer.name}` : body.customerCode,
        salesperson: customer?.salesperson,
        receiptMethod: body.receiptMethod ?? '对公',
        receiptDate,
        currency: body.currency ?? 'RMB',
        amount: Number(body.amount ?? 0),
        matchedAmount: 0,
        balance: Number(body.amount ?? 0),
        paymentNo: body.paymentNo,
        status: 'PENDING',
        remark: body.remark,
        matches: [],
        createdAt: receiptDate,
        updatedAt: receiptDate
      };
      waterReceipts.unshift(row);
      return jsonResponse(row, 201);
    }
    return jsonResponse(buildWaterReceiptResponse(waterReceipts, url));
  }

  const waterReceiptMatchable = url.match(/\/api\/finance\/water-receipts\/([^/]+)\/matchable-receivables$/);
  if (waterReceiptMatchable) {
    const receipt = waterReceipts.find((row) => row.id === waterReceiptMatchable[1] || row.receiptNo === waterReceiptMatchable[1]);
    const rows = receivableFees.filter((fee) => fee.customerId === receipt?.customerId && fee.reconciliationStatus === 'CONFIRMED' && fee.receiptStatus !== 'RECEIVED');
    return jsonResponse(rows);
  }

  const waterReceiptAction = url.match(/\/api\/finance\/water-receipts\/([^/]+)\/(mark-arrived|match-orders|unmatch|archive|void|voucher)$/);
  if (waterReceiptAction && init?.method === 'POST') {
    const receipt = waterReceipts.find((row) => row.id === waterReceiptAction[1] || row.receiptNo === waterReceiptAction[1]);
    if (!receipt) return jsonResponse({ message: '水单不存在' }, 404);
    const action = waterReceiptAction[2];
    if (action === 'mark-arrived') {
      receipt.status = 'ARRIVED';
      receipt.arrivedAt = body.arrivedAt ?? '2026-06-18T10:00:00.000Z';
      receipt.arrivedBy = 'admin';
      accountLedger.unshift({ id: `al-wr-${accountLedger.length + 1}`, customerId: receipt.customerId ?? '', customerName: receipt.customerName ?? '', amount: receipt.amount, balance: receipt.balance, note: receipt.paymentNo ?? receipt.receiptMethod, createdAt: receipt.arrivedAt ?? '2026-06-18T10:00:00.000Z' });
      return jsonResponse(receipt, 201);
    }
    if (action === 'match-orders') {
      const matches = body.matches ?? [];
      const amount = Number(matches.reduce((sum: number, item: { amount: number }) => sum + Number(item.amount), 0).toFixed(2));
      matches.forEach((match: { receivableFinanceItemId: string; amount: number }) => {
        const fee = receivableFees.find((item) => item.id === match.receivableFinanceItemId);
        if (fee) {
          if ((fee.currency ?? 'RMB') !== (receipt.currency ?? 'RMB')) return;
          const received = Number(((fee.receivedAmount ?? 0) + Number(match.amount)).toFixed(2));
          fee.receivedAmount = received;
          fee.receiptStatus = received >= fee.amount ? 'RECEIVED' : 'PARTIAL';
          fee.receivedAt = fee.receiptStatus === 'RECEIVED' ? '2026-06-18T10:00:00.000Z' : fee.receivedAt;
          fee.paymentNo = receipt.receiptNo;
          receipt.matches.push({ id: `wrm-${receipt.matches.length + 1}`, waterReceiptId: receipt.id, receivableFinanceItemId: fee.id, shipmentId: fee.shipmentId, systemOrderNo: fee.systemOrderNo, customerCode: fee.customerCode, feeName: fee.name, amount: Number(match.amount), createdAt: '2026-06-18T10:00:00.000Z' });
        }
      });
      receipt.matchedAmount = Number((receipt.matchedAmount + amount).toFixed(2));
      receipt.balance = Number((receipt.amount - receipt.matchedAmount).toFixed(2));
      receipt.status = receipt.balance <= 0 ? 'ARCHIVED' : 'PARTIAL_MATCHED';
      return jsonResponse(receipt, 201);
    }
    if (action === 'unmatch') {
      const matchIds = body.matchIds ?? [];
      const matches = receipt.matches.filter((match) => matchIds.includes(match.id) && !match.voided);
      const amount = Number(matches.reduce((sum, match) => sum + match.amount, 0).toFixed(2));
      matches.forEach((match) => {
        match.voided = true;
        match.voidedAt = '2026-06-18T10:05:00.000Z';
        const fee = receivableFees.find((item) => item.id === match.receivableFinanceItemId);
        if (fee) {
          const nextReceived = Math.max(0, Number(((fee.receivedAmount ?? 0) - match.amount).toFixed(2)));
          fee.receivedAmount = nextReceived;
          fee.receiptStatus = nextReceived <= 0 ? 'UNPAID' : 'PARTIAL';
          fee.receivedAt = nextReceived <= 0 ? undefined : fee.receivedAt;
          if (nextReceived <= 0) fee.paymentNo = undefined;
        }
      });
      receipt.matchedAmount = Math.max(0, Number((receipt.matchedAmount - amount).toFixed(2)));
      receipt.balance = Number((receipt.amount - receipt.matchedAmount).toFixed(2));
      receipt.status = receipt.matchedAmount > 0 ? 'PARTIAL_MATCHED' : 'ARRIVED';
      receipt.archivedAt = undefined;
      return jsonResponse(receipt, 201);
    }
    if (action === 'archive') {
      receipt.status = 'ARCHIVED';
      receipt.archivedAt = '2026-06-18T10:00:00.000Z';
      return jsonResponse(receipt, 201);
    }
    if (action === 'void') {
      receipt.status = 'VOIDED';
      receipt.voidedAt = '2026-06-18T10:00:00.000Z';
      receipt.voidedReason = body.reason;
      return jsonResponse(receipt, 201);
    }
    receipt.voucher = { id: `wrv-${receipt.id}`, waterReceiptId: receipt.id, fileName: body.fileName, mimeType: body.mimeType, sizeBytes: body.sizeBytes, url: body.url, uploadedBy: 'admin', createdAt: '2026-06-18T10:00:00.000Z' };
    return jsonResponse(receipt.voucher, 201);
  }

  const waterReceiptUpdate = url.match(/\/api\/finance\/water-receipts\/([^/]+)$/);
  if (waterReceiptUpdate && init?.method === 'PUT') {
    const receipt = waterReceipts.find((row) => row.id === waterReceiptUpdate[1] || row.receiptNo === waterReceiptUpdate[1]);
    if (!receipt) return jsonResponse({ message: '水单不存在' }, 404);
    Object.assign(receipt, body, { updatedAt: '2026-06-18T10:00:00.000Z' });
    return jsonResponse(receipt);
  }

  if (url.endsWith('/api/finance/water-receipts/export') && init?.method === 'POST') {
    return jsonResponse({ rows: buildWaterReceiptResponse(waterReceipts, url).rows, exportedAt: '2026-06-18T10:00:00.000Z' }, 201);
  }

  if (url.includes('/api/finance/receivable-audits') && !url.match(/\/api\/finance\/receivable-audits\/[^/?]+/)) {
    if (init?.method === 'POST') {
      const matchedShipment = employeeShipments.find((item) =>
        item.systemOrderNo === body.systemOrderNo
        || item.customerOrderNo === body.customerOrderNo
        || item.transferNo === body.transferNo
        || item.customerName.startsWith(`${body.customerCode}-`)
      ) ?? employeeShipments[0];
      const row: ReceivableAuditSummary = {
        id: `rf-${receivableFees.length + 1}`,
        shipmentId: matchedShipment.id,
        systemOrderNo: matchedShipment.systemOrderNo,
        customerName: matchedShipment.customerName,
        customerId: customerIdForShipment(matchedShipment),
        customerCode: matchedShipment.customerName.split('-')[0],
        customerOrderNo: matchedShipment.customerOrderNo,
        transferNo: matchedShipment.transferNo,
        salesperson: matchedShipment.salesperson,
        name: body.name,
        amount: Number(body.amount ?? 0),
        settled: false,
        currency: body.currency ?? 'RMB',
        settlementMethod: body.settlementMethod,
        paymentNo: body.paymentNo,
        createdAt: '2026-06-17T12:00:00.000Z',
        createdBy: 'admin',
        reconciliationStatus: 'PENDING',
        remark: body.remark,
        sourceType: 'MANUAL'
      };
      receivableFees.push(row);
      return jsonResponse(row, 201);
    }
    return jsonResponse(buildReceivableAuditResponse(receivableFees, url));
  }

  if (new URL(url, 'http://test.local').pathname === '/api/finance/business-cost-audits') {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body ?? '{}'));
      const matchedShipment = employeeShipments.find((item) =>
        item.systemOrderNo === body.systemOrderNo
        || item.customerOrderNo === body.customerOrderNo
        || item.transferNo === body.transferNo
        || item.customerName.startsWith(`${body.customerCode}-`)
      ) ?? employeeShipments[0];
      const receivableTotal = receivableFees
        .filter((fee) => fee.shipmentId === matchedShipment.id && fee.reconciliationStatus !== 'VOIDED')
        .reduce((sum, fee) => sum + fee.amount, 0);
      const amount = Number(body.amount ?? (Number(body.chargeWeightKg ?? 0) * Number(body.unitPrice ?? 0)));
      const row: BusinessCostAuditSummary = {
        id: `bc-${businessCostFees.length + 1}`,
        shipmentId: matchedShipment.id,
        name: body.name ?? '业务员成本',
        amount,
        settled: false,
        type: 'BUSINESS_COST',
        currency: body.currency ?? 'RMB',
        settlementMethod: body.settlementMethod,
        paymentNo: body.paymentNo,
        reconciliationStatus: 'PENDING',
        createdAt: '2026-06-17T12:00:00.000Z',
        createdBy: 'admin',
        remark: body.remark,
        sourceType: 'MANUAL',
        chargeWeightKg: body.chargeWeightKg,
        unitPrice: body.unitPrice,
        salesperson: matchedShipment.salesperson,
        customerCode: matchedShipment.customerName.split('-')[0],
        customerName: matchedShipment.customerName,
        customerOrderNo: matchedShipment.customerOrderNo,
        systemOrderNo: matchedShipment.systemOrderNo,
        transferNo: matchedShipment.transferNo,
        agentName: body.agentName ?? matchedShipment.agentName,
        receivableTotal,
        businessCostTotal: amount,
        businessProfit: Number((receivableTotal - amount).toFixed(2)),
        canViewAgent: true,
        canViewProfit: true
      };
      businessCostFees.push(row);
      return jsonResponse(row);
    }
    return jsonResponse(buildBusinessCostAuditResponse(businessCostFees, url));
  }

  const businessCostAuditUpdateMatch = url.match(/\/api\/finance\/business-cost-audits\/([^/]+)$/);
  if (businessCostAuditUpdateMatch && init?.method === 'PUT') {
    const fee = businessCostFees.find((item) => item.id === businessCostAuditUpdateMatch[1]);
    if (!fee) return jsonResponse({ message: '业务成本不存在' }, 404);
    const amount = body.amount ?? (body.chargeWeightKg !== undefined && body.unitPrice !== undefined ? Number((Number(body.chargeWeightKg) * Number(body.unitPrice)).toFixed(2)) : fee.amount);
    Object.assign(fee, { ...body, amount });
    return jsonResponse(fee);
  }

  if (businessCostAuditUpdateMatch && init?.method === 'DELETE') {
    const fee = businessCostFees.find((item) => item.id === businessCostAuditUpdateMatch[1]);
    if (!fee) return jsonResponse({ message: '业务成本不存在' }, 404);
    fee.reconciliationStatus = 'VOIDED';
    fee.voided = true;
    return jsonResponse(fee);
  }

  const businessCostAuditActionMatch = url.match(/\/api\/finance\/business-cost-audits\/([^/]+)\/(audit|reverse-audit)$/);
  if (businessCostAuditActionMatch && init?.method === 'POST') {
    const fee = businessCostFees.find((item) => item.id === businessCostAuditActionMatch[1]);
    if (!fee) return jsonResponse({ message: '业务成本不存在' }, 404);
    if (businessCostAuditActionMatch[2] === 'audit') {
      fee.settled = true;
      fee.locked = true;
      fee.reconciliationStatus = 'CONFIRMED';
      fee.reviewedAt = '2026-06-17T12:30:00.000Z';
      fee.reviewedBy = 'admin';
    } else {
      fee.settled = false;
      fee.locked = false;
      fee.reconciliationStatus = 'PENDING';
      fee.reviewedAt = undefined;
      fee.reviewedBy = undefined;
    }
    return jsonResponse(fee);
  }

  if (url.endsWith('/api/finance/business-cost-audits/batch-audit') && init?.method === 'POST') {
    const ids = body.ids ?? [];
    const rows: BusinessCostAuditSummary[] = [];
    ids.forEach((id: string) => {
      const fee = businessCostFees.find((item) => item.id === id && item.reconciliationStatus === 'PENDING');
      if (fee) {
        fee.settled = true;
        fee.locked = true;
        fee.reconciliationStatus = 'CONFIRMED';
        fee.reviewedAt = '2026-06-17T12:30:00.000Z';
        fee.reviewedBy = 'admin';
        rows.push(fee);
      }
    });
    return jsonResponse({ successCount: rows.length, failureCount: ids.length - rows.length, rows, failures: [] });
  }

  if (url.endsWith('/api/finance/business-cost-audits/batch-reverse-audit') && init?.method === 'POST') {
    const ids = body.ids ?? [];
    const rows: BusinessCostAuditSummary[] = [];
    ids.forEach((id: string) => {
      const fee = businessCostFees.find((item) => item.id === id && item.reconciliationStatus === 'CONFIRMED');
      if (fee) {
        fee.settled = false;
        fee.locked = false;
        fee.reconciliationStatus = 'PENDING';
        fee.reviewedAt = undefined;
        fee.reviewedBy = undefined;
        rows.push(fee);
      }
    });
    return jsonResponse({ successCount: rows.length, failureCount: ids.length - rows.length, rows, failures: [] });
  }

  if (url.endsWith('/api/finance/business-cost-audits/batch-void') && init?.method === 'POST') {
    const ids = body.ids ?? [];
    const rows: BusinessCostAuditSummary[] = [];
    ids.forEach((id: string) => {
      const fee = businessCostFees.find((item) => item.id === id && item.reconciliationStatus !== 'CONFIRMED');
      if (fee) {
        fee.reconciliationStatus = 'VOIDED';
        fee.voided = true;
        rows.push(fee);
      }
    });
    return jsonResponse({ successCount: rows.length, failureCount: ids.length - rows.length, rows, failures: [] });
  }

  if (url.endsWith('/api/finance/business-cost-audits/export') && init?.method === 'POST') {
    const ids = body.ids ?? [];
    const rows = ids.length ? businessCostFees.filter((fee) => ids.includes(fee.id)) : businessCostFees.filter((fee) => !fee.voided);
    return jsonResponse({ rows, exportedAt: '2026-06-17T12:40:00.000Z' });
  }

  if (new URL(url, 'http://test.local').pathname === '/api/finance/payable-audits') {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body ?? '{}'));
      const matchedShipment = employeeShipments.find((item) =>
        item.systemOrderNo === body.systemOrderNo
        || item.customerOrderNo === body.customerOrderNo
        || item.transferNo === body.transferNo
        || item.customerName.startsWith(`${body.customerCode}-`)
      ) ?? employeeShipments[0];
      const amount = body.chargeWeightKg !== undefined && body.unitPrice !== undefined
        ? Number((Number(body.chargeWeightKg) * Number(body.unitPrice)).toFixed(2))
        : Number(body.amount ?? 0);
      const row: PayableAuditSummary = {
        id: `pf-audit-${payableAuditFees.length + 1}`,
        shipmentId: matchedShipment.id,
        name: body.name ?? '代理运费',
        amount,
        settled: false,
        agentName: matchedShipment.agentName ?? '宇环',
        currency: body.currency ?? 'RMB',
        settlementMethod: body.settlementMethod,
        paymentNo: body.paymentNo,
        chargeWeightKg: body.chargeWeightKg,
        unitPrice: body.unitPrice,
        reconciliationStatus: 'PENDING',
        createdAt: '2026-06-17T12:10:00.000Z',
        createdBy: 'finance',
        remark: body.remark,
        sourceType: 'MANUAL',
        salesperson: matchedShipment.salesperson,
        customerCode: matchedShipment.customerName.split('-')[0],
        customerName: matchedShipment.customerName,
        customerOrderNo: matchedShipment.customerOrderNo,
        systemOrderNo: matchedShipment.systemOrderNo,
        transferNo: matchedShipment.transferNo,
        agentChannel: matchedShipment.channelName,
        payableTotal: amount,
        rmbAmount: amount,
        orderRmbTotal: amount,
        receivableProfit: 90,
        operationProfit: 20,
        canViewSensitivePayable: true,
        canViewProfit: true
      };
      payableAuditFees.push(row);
      return jsonResponse(row);
    }
    return jsonResponse(buildPayableAuditResponse(payableAuditFees, url));
  }

  const payableAuditUpdateMatch = url.match(/\/api\/finance\/payable-audits\/([^/]+)$/);
  if (payableAuditUpdateMatch && init?.method === 'PUT') {
    const fee = payableAuditFees.find((item) => item.id === payableAuditUpdateMatch[1]);
    if (fee) {
      Object.assign(fee, JSON.parse(String(init.body ?? '{}')));
      return jsonResponse(fee);
    }
  }

  if (payableAuditUpdateMatch && init?.method === 'DELETE') {
    const fee = payableAuditFees.find((item) => item.id === payableAuditUpdateMatch[1]);
    if (fee) {
      fee.reconciliationStatus = 'VOIDED';
      fee.voided = true;
      return jsonResponse(fee);
    }
  }

  const payableAuditActionMatch = url.match(/\/api\/finance\/payable-audits\/([^/]+)\/(audit|reverse-audit)$/);
  if (payableAuditActionMatch && init?.method === 'POST') {
    const fee = payableAuditFees.find((item) => item.id === payableAuditActionMatch[1]);
    if (fee) {
      if (payableAuditActionMatch[2] === 'audit') {
        fee.settled = true;
        fee.reconciliationStatus = 'CONFIRMED';
        fee.reviewedAt = '2026-06-17T12:30:00.000Z';
        fee.reviewedBy = 'admin';
        const existing = payablePaymentApplications.find((item) => item.payableFinanceItemId === fee.id);
        const application: TestPayablePaymentApplication = existing ?? {
          id: `ppa-${payablePaymentApplications.length + 1}`,
          payableFinanceItemId: fee.id,
          shipmentId: fee.shipmentId,
          systemOrderNo: fee.systemOrderNo,
          transferNo: fee.transferNo,
          customerCode: fee.customerCode,
          customerName: fee.customerName,
          salesperson: fee.salesperson,
          agentName: fee.agentName,
          feeName: fee.name,
          amount: fee.amount,
          currency: fee.currency ?? 'RMB',
          paymentNo: fee.paymentNo,
          status: 'PENDING',
          createdAt: '2026-06-17T12:31:00.000Z',
          updatedAt: '2026-06-17T12:31:00.000Z'
        };
        application.status = 'PENDING';
        application.applicationStatus = 'PENDING';
        application.invalidatedAt = undefined;
        application.appliedAt = undefined;
        if (!existing) payablePaymentApplications.push(application);
      } else {
        fee.settled = false;
        fee.reconciliationStatus = 'PENDING';
        fee.reviewedAt = undefined;
        fee.reviewedBy = undefined;
        payablePaymentApplications
          .filter((item) => item.payableFinanceItemId === fee.id && item.status !== 'PAID')
          .forEach((item) => {
            item.status = 'INVALIDATED';
            item.applicationStatus = 'INVALIDATED';
            item.invalidatedAt = '2026-06-17T12:35:00.000Z';
          });
      }
      return jsonResponse(fee);
    }
  }

  if (url.endsWith('/api/finance/payable-audits/batch-audit') && init?.method === 'POST') {
    const body = JSON.parse(String(init.body ?? '{}')) as { ids?: string[] };
    payableAuditFees.forEach((fee) => {
      if (body.ids?.includes(fee.id)) {
        fee.reconciliationStatus = 'CONFIRMED';
        fee.reviewedAt = '2026-06-17T12:30:00.000Z';
        fee.reviewedBy = 'admin';
      }
    });
    return jsonResponse({ successCount: body.ids?.length ?? 0, failureCount: 0, rows: payableAuditFees.filter((fee) => body.ids?.includes(fee.id)), failures: [] });
  }

  if (url.endsWith('/api/finance/payable-audits/batch-reverse-audit') && init?.method === 'POST') {
    const body = JSON.parse(String(init.body ?? '{}')) as { ids?: string[] };
    payableAuditFees.forEach((fee) => {
      if (body.ids?.includes(fee.id)) {
        fee.reconciliationStatus = 'PENDING';
        fee.reviewedAt = undefined;
        fee.reviewedBy = undefined;
      }
    });
    return jsonResponse({ successCount: body.ids?.length ?? 0, failureCount: 0, rows: payableAuditFees.filter((fee) => body.ids?.includes(fee.id)), failures: [] });
  }

  if (url.endsWith('/api/finance/payable-audits/batch-void') && init?.method === 'POST') {
    const body = JSON.parse(String(init.body ?? '{}')) as { ids?: string[] };
    payableAuditFees.forEach((fee) => {
      if (body.ids?.includes(fee.id)) {
        fee.reconciliationStatus = 'VOIDED';
        fee.voided = true;
      }
    });
    return jsonResponse({ successCount: body.ids?.length ?? 0, failureCount: 0, rows: payableAuditFees.filter((fee) => body.ids?.includes(fee.id)), failures: [] });
  }

  if (url.endsWith('/api/finance/payable-audits/export') && init?.method === 'POST') {
    return jsonResponse({ rows: payableAuditFees, exportedAt: '2026-06-17T12:40:00.000Z' });
  }

  if (url.endsWith('/api/finance/voucher-images') && init?.method === 'POST') {
    const file = body.file as File | undefined;
    if (!file?.type?.startsWith('image/')) return jsonResponse({ message: '仅支持图片' }, 400);
    const voucher = {
      id: `payment-voucher-${paymentVouchers.length + 1}`,
      paymentApplicationId: typeof body.paymentApplicationId === 'string' ? body.paymentApplicationId : undefined,
      pendingPaymentId: typeof body.pendingPaymentId === 'string' ? body.pendingPaymentId : undefined,
      voucherType: body.context === 'PAID_PAYMENT_RECEIPT' ? 'PAYMENT_RECEIPT' : 'BILL',
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      url: `/api/uploads/vouchers/${file.name}`,
      uploadedBy: 'finance',
      createdAt: '2026-06-17T12:46:00.000Z'
    };
    if (body.context === 'WATER_RECEIPT' && typeof body.waterReceiptId === 'string') {
      const receipt = waterReceipts.find((row) => row.id === body.waterReceiptId);
      if (receipt) receipt.voucher = { id: `wrv-${receipt.id}`, waterReceiptId: receipt.id, fileName: file.name, mimeType: file.type, sizeBytes: file.size, url: voucher.url, uploadedBy: 'finance', createdAt: voucher.createdAt };
      return jsonResponse(receipt?.voucher ?? voucher, 201);
    }
    paymentVouchers.push(voucher as PaymentVoucherSummary);
    return jsonResponse(voucher, 201);
  }

  const toPendingPayment = (row: TestPayablePaymentApplication): PendingPaymentSummary => {
    const app = paymentApplications.find((item) => item.items.some((entry) => entry.pendingPaymentId === row.id));
    return {
      id: row.id,
      payableFinanceItemId: row.payableFinanceItemId,
      paymentApplicationId: app?.id,
      shipmentId: row.shipmentId,
      date: row.appliedAt ?? row.createdAt ?? '2026-06-17T12:31:00.000Z',
      agentName: row.agentName,
      salesperson: row.salesperson,
      customerCode: row.customerCode,
      customerName: row.customerName,
      systemOrderNo: row.systemOrderNo,
      transferNo: row.transferNo,
      feeName: row.feeName ?? '代理运费',
      amount: row.amount,
      currency: row.currency === 'USD' ? 'USD' : 'RMB',
      remark: row.remark,
      status: row.status === 'APPLIED' || app?.status === 'WAITING_PAYMENT' ? 'APPLIED' : row.status,
      bankAccount: row.bankAccount ? {
        id: row.bankAccount.id,
        agentId: row.bankAccount.agentId,
        agentName: row.bankAccount.agentName,
        accountName: row.bankAccount.accountName,
        bankName: row.bankAccount.bankName,
        bankAccountNo: row.bankAccount.bankAccountNo,
        currency: row.bankAccount.currency === 'USD' ? 'USD' : 'RMB',
        remark: row.bankAccount.remark,
        enabled: row.bankAccount.enabled,
        createdAt: row.bankAccount.createdAt,
        updatedAt: row.bankAccount.updatedAt
      } : undefined,
      vouchers: paymentVouchers.filter((item) => item.pendingPaymentId === row.id),
      paymentApplicationNo: app?.applicationNo,
      createdAt: row.createdAt,
      appliedAt: row.appliedAt
    };
  };

  if (new URL(url, 'http://test.local').pathname === '/api/finance/pending-payments') {
    const search = new URL(url, 'http://test.local').searchParams;
    let rows = payablePaymentApplications.map(toPendingPayment);
    const currency = search.get('currency');
    if (currency && currency !== 'ALL') rows = rows.filter((row) => row.currency === currency);
    const systemOrderNo = search.get('systemOrderNo');
    if (systemOrderNo) rows = rows.filter((row) => row.systemOrderNo.includes(systemOrderNo));
    const amountByCurrency = rows.reduce((list, row) => {
      const bucket = list.find((item) => item.currency === row.currency);
      if (bucket) bucket.amount += row.amount;
      else list.push({ currency: row.currency, amount: row.amount });
      return list;
    }, [] as Array<{ currency: 'RMB' | 'USD'; amount: number }>);
    return jsonResponse({ rows, totals: { count: rows.length, amountByCurrency }, pagination: { page: 1, pageSize: 100, totalItems: rows.length } });
  }

  if (new URL(url, 'http://test.local').pathname === '/api/finance/payee-bank-accounts') {
    if (init?.method === 'POST') {
      const payload = JSON.parse(String(init.body ?? '{}'));
      const bank: PayeeBankAccountSummary = { id: `payee-bank-${payeeBankAccounts.length + 1}`, enabled: true, createdAt: '2026-06-17T12:45:00.000Z', updatedAt: '2026-06-17T12:45:00.000Z', ...payload };
      payeeBankAccounts.push(bank);
      return jsonResponse(bank);
    }
    return jsonResponse(payeeBankAccounts);
  }

  if (new URL(url, 'http://test.local').pathname === '/api/finance/payment-vouchers' && init?.method === 'POST') {
    const payload = JSON.parse(String(init.body ?? '{}'));
    const pending = payload.pendingPaymentId ? payablePaymentApplications.find((row) => row.id === payload.pendingPaymentId) : undefined;
    const paymentApplication = pending ? paymentApplications.find((app) => app.items.some((item) => item.pendingPaymentId === pending.id)) : undefined;
    const pendingSummary = pending ? toPendingPayment(pending) : undefined;
    const payable = pending ? payableAuditFees.find((row) => row.id === pending.payableFinanceItemId) : undefined;
    const voucher: PaymentVoucherSummary = {
      id: `payment-voucher-${paymentVouchers.length + 1}`,
      uploadedBy: 'finance',
      createdAt: '2026-06-17T12:46:00.000Z',
      ...payload,
      payableFinanceItemId: pending?.payableFinanceItemId,
      systemOrderNo: pendingSummary?.systemOrderNo,
      transferNo: payload.transferNo ?? pendingSummary?.transferNo,
      agentChannel: payable?.agentChannel,
      chargeWeightKg: payable?.chargeWeightKg,
      unitPrice: payable?.unitPrice,
      payableAmount: pending?.amount,
      paymentApplicationId: payload.paymentApplicationId ?? paymentApplication?.id,
      paymentApplicationNo: paymentApplication?.applicationNo,
      paidPaymentId: paymentApplication?.status === 'PAID' ? paymentApplication.id : undefined,
      paidAt: paymentApplication?.status === 'PAID' ? paymentApplication.paidAt : undefined
    };
    paymentVouchers.push(voucher);
    return jsonResponse(voucher);
  }
  const differenceMatch = new URL(url, 'http://test.local').pathname.match(/^\/api\/finance\/payment-vouchers\/([^/]+)\/difference$/);
  if (differenceMatch && init?.method === 'PATCH') {
    const payload = JSON.parse(String(init.body ?? '{}'));
    const voucher = paymentVouchers.find((row) => row.id === decodeURIComponent(differenceMatch[1]));
    if (!voucher) return jsonResponse({ message: '代理账单不存在' }, 404);
    Object.assign(voucher, {
      differenceType: payload.differenceType ?? voucher.differenceType,
      differenceAmount: payload.differenceAmount ?? voucher.differenceAmount,
      differenceReason: payload.differenceReason ?? voucher.differenceReason,
      differenceStatus: payload.differenceStatus,
      status: payload.differenceStatus === 'HANDLED' ? 'DIFFERENCE_HANDLED' : 'DIFFERENCE_PENDING',
      differenceHandledBy: payload.differenceStatus === 'HANDLED' ? 'finance' : undefined,
      differenceHandledAt: payload.differenceStatus === 'HANDLED' ? '2026-06-17T13:20:00.000Z' : undefined
    });
    return jsonResponse(voucher);
  }
  const archiveMatch = new URL(url, 'http://test.local').pathname.match(/^\/api\/finance\/payment-vouchers\/([^/]+)\/archive$/);
  if (archiveMatch && init?.method === 'PATCH') {
    const payload = JSON.parse(String(init.body ?? '{}'));
    const voucher = paymentVouchers.find((row) => row.id === decodeURIComponent(archiveMatch[1]));
    if (!voucher) return jsonResponse({ message: '代理账单不存在' }, 404);
    voucher.status = payload.archived ? 'ARCHIVED' : 'MATCHED';
    return jsonResponse(voucher);
  }
  if (new URL(url, 'http://test.local').pathname === '/api/finance/payment-vouchers') {
    const params = new URL(url, 'http://test.local').searchParams;
    const billNo = params.get('billNo')?.toLowerCase();
    const agentName = params.get('agentName')?.toLowerCase();
    const status = params.get('status');
    return jsonResponse(paymentVouchers.filter((voucher) => (!billNo || voucher.billNo?.toLowerCase().includes(billNo)) && (!agentName || voucher.agentName?.toLowerCase().includes(agentName)) && (!status || status === 'ALL' || voucher.status === status)));
  }

  const toPaidPayment = (app: PaymentApplicationSummary): PaidPaymentSummary => {
    const first = app.items[0];
    return {
      id: app.id,
      applicationNo: app.applicationNo,
      date: app.paidAt ?? app.appliedAt ?? '2026-06-17T12:50:00.000Z',
      agentName: app.agentName,
      salesperson: 'Rachel',
      customerCode: first?.customerCode,
      systemOrderNo: app.items.length === 1 ? first?.systemOrderNo : `${first?.systemOrderNo ?? '-'} 等${app.items.length}票`,
      feeName: app.items.length === 1 ? first?.feeName : `${first?.feeName ?? '代理运费'} 等${app.items.length}项`,
      currency: app.currency,
      totalAmount: app.totalAmount,
      remark: app.remark ?? app.paidRemark,
      status: app.status,
      billVouchers: app.vouchers.filter((voucher) => voucher.voucherType !== 'PAYMENT_RECEIPT'),
      waterReceipts: app.vouchers.filter((voucher) => voucher.voucherType === 'PAYMENT_RECEIPT'),
      payeeBankAccount: app.bankAccount,
      payerBankName: app.payerBankName,
      payerBankAccountName: app.payerBankAccountName,
      payerBankAccountNo: app.payerBankAccountNo,
      paidAt: app.paidAt,
      paidBy: app.paidBy,
      paidRemark: app.paidRemark,
      items: app.items
    };
  };

  if (new URL(url, 'http://test.local').pathname === '/api/finance/paid-payments') {
    const search = new URL(url, 'http://test.local').searchParams;
    let rows = paymentApplications.filter((app) => app.status === 'WAITING_PAYMENT' || app.status === 'PAID').map(toPaidPayment);
    const status = search.get('status');
    if (status && status !== 'ALL') rows = rows.filter((row) => row.status === status);
    const currency = search.get('currency');
    if (currency && currency !== 'ALL') rows = rows.filter((row) => row.currency === currency);
    const totals = rows.reduce((acc, row) => {
      if (row.status === 'WAITING_PAYMENT') acc.waitingPaymentCount += 1;
      if (row.status === 'PAID') acc.paidCount += 1;
      const bucket = acc.amountByCurrency.find((item) => item.currency === row.currency);
      if (bucket) bucket.amount += row.totalAmount;
      else acc.amountByCurrency.push({ currency: row.currency, amount: row.totalAmount });
      return acc;
    }, { count: rows.length, waitingPaymentCount: 0, paidCount: 0, amountByCurrency: [] as Array<{ currency: 'RMB' | 'USD'; amount: number }> });
    return jsonResponse({ rows, totals, pagination: { page: 1, pageSize: 100, totalItems: rows.length } });
  }

  const confirmPaidMatch = url.match(/\/api\/finance\/payment-applications\/([^/]+)\/confirm-paid$/);
  if (confirmPaidMatch && init?.method === 'POST') {
    const payload = JSON.parse(String(init.body ?? '{}'));
    const app = paymentApplications.find((item) => item.id === confirmPaidMatch[1]);
    if (!app) return jsonResponse({ message: '付款申请不存在' }, 404);
    if (!String(payload.payerBankName ?? '').trim()) return jsonResponse({ message: '付款方银行不能为空' }, 400);
    if (!String(payload.payerBankAccountNo ?? '').trim()) return jsonResponse({ message: '付款方账号不能为空' }, 400);
    if (!payload.paidAt) return jsonResponse({ message: '付款日期不能为空' }, 400);
    app.status = 'PAID';
    app.payerBankName = payload.payerBankName;
    app.payerBankAccountName = payload.payerBankAccountName;
    app.payerBankAccountNo = payload.payerBankAccountNo;
    app.paidAt = payload.paidAt;
    app.paidBy = 'finance';
    app.paidRemark = payload.paidRemark;
    if (payload.waterReceipt?.fileName) {
      const voucher: PaymentVoucherSummary = { id: `payment-voucher-${paymentVouchers.length + 1}`, paymentApplicationId: app.id, voucherType: 'PAYMENT_RECEIPT', fileName: payload.waterReceipt.fileName, url: payload.waterReceipt.url, uploadedBy: 'finance', createdAt: '2026-06-17T13:00:00.000Z' };
      paymentVouchers.push(voucher);
      app.vouchers.push(voucher);
    }
    app.items.forEach((item) => {
      const pending = payablePaymentApplications.find((row) => row.id === item.pendingPaymentId);
      if (pending) {
        pending.status = 'PAID';
        pending.applicationStatus = 'PAID';
        pending.paymentNo = app.applicationNo;
      }
      const payable = payableAuditFees.find((row) => row.id === item.payableFinanceItemId);
      if (payable) payable.paymentNo = app.applicationNo;
    });
    return jsonResponse(toPaidPayment(app));
  }

  const reversePaidMatch = url.match(/\/api\/finance\/paid-payments\/([^/]+)\/reverse$/);
  if (reversePaidMatch && init?.method === 'POST') {
    const app = paymentApplications.find((item) => item.id === reversePaidMatch[1]);
    if (!app) return jsonResponse({ message: '付款申请不存在' }, 404);
    app.status = 'WAITING_PAYMENT';
    app.paidAt = undefined;
    app.paidBy = undefined;
    app.items.forEach((item) => {
      const pending = payablePaymentApplications.find((row) => row.id === item.pendingPaymentId);
      if (pending) {
        pending.status = 'APPLIED';
        pending.applicationStatus = 'APPLIED';
        pending.paymentNo = undefined;
      }
      const payable = payableAuditFees.find((row) => row.id === item.payableFinanceItemId);
      if (payable) payable.paymentNo = undefined;
    });
    return jsonResponse(toPaidPayment(app));
  }

  const updatePaidMatch = url.match(/\/api\/finance\/paid-payments\/([^/]+)$/);
  if (updatePaidMatch && init?.method === 'PUT') {
    const payload = JSON.parse(String(init.body ?? '{}'));
    const app = paymentApplications.find((item) => item.id === updatePaidMatch[1]);
    if (!app) return jsonResponse({ message: '付款申请不存在' }, 404);
    app.paidRemark = payload.paidRemark ?? app.paidRemark;
    if (payload.waterReceipt?.fileName) {
      const voucher: PaymentVoucherSummary = { id: `payment-voucher-${paymentVouchers.length + 1}`, paymentApplicationId: app.id, voucherType: 'PAYMENT_RECEIPT', fileName: payload.waterReceipt.fileName, url: payload.waterReceipt.url, uploadedBy: 'finance', createdAt: '2026-06-17T13:04:00.000Z' };
      paymentVouchers.push(voucher);
      app.vouchers.push(voucher);
    }
    return jsonResponse(toPaidPayment(app));
  }

  if (url.endsWith('/api/finance/paid-payments/export') && init?.method === 'POST') {
    return jsonResponse({ rows: paymentApplications.map(toPaidPayment), exportedAt: '2026-06-17T13:05:00.000Z' });
  }

  if (url.endsWith('/api/finance/payment-water-receipts') && init?.method === 'POST') {
    const payload = JSON.parse(String(init.body ?? '{}'));
    const voucher: PaymentVoucherSummary = { id: `payment-voucher-${paymentVouchers.length + 1}`, voucherType: 'PAYMENT_RECEIPT', uploadedBy: 'finance', createdAt: '2026-06-17T13:06:00.000Z', ...payload };
    paymentVouchers.push(voucher);
    const app = paymentApplications.find((item) => item.id === payload.paymentApplicationId);
    app?.vouchers.push(voucher);
    return jsonResponse(voucher);
  }

  if (url.endsWith('/api/finance/payment-applications') && init?.method === 'POST') {
    const payload = JSON.parse(String(init.body ?? '{}'));
    let bank: PayeeBankAccountSummary | undefined = payload.bankAccountId ? payeeBankAccounts.find((item) => item.id === payload.bankAccountId) : undefined;
    if (!bank && payload.manualBankAccount) {
      bank = { id: `payee-bank-${payeeBankAccounts.length + 1}`, enabled: true, createdAt: '2026-06-17T12:45:00.000Z', updatedAt: '2026-06-17T12:45:00.000Z', ...payload.manualBankAccount } as PayeeBankAccountSummary;
      payeeBankAccounts.push(bank);
    }
    const selected = payablePaymentApplications.filter((row) => payload.pendingPaymentIds?.includes(row.id));
    const groups = selected.reduce((map, row) => {
      const key = `${row.agentName ?? '未指定代理'}|${bank?.bankAccountNo ?? 'NO_BANK'}|${row.currency ?? 'RMB'}`;
      map.set(key, [...(map.get(key) ?? []), row]);
      return map;
    }, new Map<string, TestPayablePaymentApplication[]>());
    const created = Array.from(groups.values()).map((rows) => {
      const app: PaymentApplicationSummary = {
        id: `payment-app-${paymentApplications.length + 1}`,
        applicationNo: `FKSQ20260617${String(paymentApplications.length + 1).padStart(4, '0')}`,
        agentName: rows[0].agentName ?? '未指定代理',
        currency: rows[0].currency === 'USD' ? 'USD' : 'RMB',
        totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
        status: 'WAITING_PAYMENT',
        bankAccount: bank,
        remark: payload.remark,
        appliedBy: 'admin',
        appliedAt: '2026-06-17T12:50:00.000Z',
        items: rows.map((row, index) => ({
          id: `payment-app-item-${paymentApplications.length + 1}-${index + 1}`,
          pendingPaymentId: row.id,
          payableFinanceItemId: row.payableFinanceItemId,
          shipmentId: row.shipmentId,
          systemOrderNo: row.systemOrderNo,
          customerCode: row.customerCode,
          feeName: row.feeName ?? '代理运费',
          amount: row.amount,
          currency: row.currency === 'USD' ? 'USD' : 'RMB'
        })),
        vouchers: payload.voucher?.fileName ? [{ id: `payment-voucher-${paymentVouchers.length + 1}`, paymentApplicationId: `payment-app-${paymentApplications.length + 1}`, voucherType: payload.voucher.voucherType ?? 'BILL', fileName: payload.voucher.fileName, url: payload.voucher.url, mimeType: payload.voucher.mimeType, uploadedBy: 'admin', createdAt: '2026-06-17T12:50:00.000Z' }] : []
      };
      rows.forEach((row) => {
        row.status = 'APPLIED';
        row.applicationStatus = 'APPLIED';
        row.paymentApplicationNo = app.applicationNo;
        row.appliedAt = app.appliedAt;
      });
      paymentApplications.push(app);
      return app;
    });
    return jsonResponse(created);
  }

  const cancelPaymentApplicationMatch = url.match(/\/api\/finance\/payment-applications\/([^/]+)\/cancel$/);
  if (cancelPaymentApplicationMatch && init?.method === 'POST') {
    const app = paymentApplications.find((item) => item.id === cancelPaymentApplicationMatch[1]);
    if (!app) return jsonResponse({ message: '付款申请不存在' }, 404);
    app.status = 'CANCELED';
    app.canceledAt = '2026-06-17T12:56:00.000Z';
    app.items.forEach((item) => {
      const pending = payablePaymentApplications.find((row) => row.id === item.pendingPaymentId);
      if (pending) {
        pending.status = 'READY';
        pending.applicationStatus = 'PENDING';
        pending.appliedAt = undefined;
        pending.paymentApplicationNo = undefined;
      }
    });
    app.items = [];
    return jsonResponse(app);
  }

  if (url.endsWith('/api/finance/payment-applications/export') && init?.method === 'POST') {
    return jsonResponse({ rows: payablePaymentApplications.map(toPendingPayment), exportedAt: '2026-06-17T12:55:00.000Z' });
  }

  if (new URL(url, 'http://test.local').pathname === '/api/finance/agent-bank-accounts') {
    if (init?.method === 'POST') {
      const payload = JSON.parse(String(init.body ?? '{}'));
      const bank: AgentBankAccountSummary = { id: `bank-${agentBankAccounts.length + 1}`, enabled: true, createdAt: '2026-06-17T12:45:00.000Z', updatedAt: '2026-06-17T12:45:00.000Z', ...payload };
      agentBankAccounts.push(bank);
      return jsonResponse(bank);
    }
    return jsonResponse(agentBankAccounts);
  }

	  const receivableAuditActionMatch = url.match(/\/api\/finance\/receivable-audits\/([^/]+)\/(audit|reverse-audit)$/);
	  if (receivableAuditActionMatch && init?.method === 'POST') {
    const fee = receivableFees.find((item) => item.id === receivableAuditActionMatch[1]);
    if (fee) {
      if (receivableAuditActionMatch[2] === 'audit') {
        fee.settled = true;
        fee.reconciliationStatus = 'CONFIRMED';
        fee.reviewedAt = '2026-06-17T11:00:00.000Z';
        fee.reviewedBy = 'admin';
      } else {
        fee.settled = false;
        fee.reconciliationStatus = 'PENDING';
        fee.reviewedAt = undefined;
        fee.reviewedBy = undefined;
      }
	      return jsonResponse(fee);
	    }
	  }

	  const receivableReceiptMatch = url.match(/\/api\/finance\/receivable-audits\/([^/]+)\/match-receipt$/);
	  if (receivableReceiptMatch && init?.method === 'POST') {
	    const fee = receivableFees.find((item) => item.id === receivableReceiptMatch[1]);
	    const receipt = waterReceipts.find((item) => item.id === body.ledgerId || item.receiptNo === body.ledgerId || item.paymentNo === body.ledgerId);
	    const ledger = accountLedger.find((item) => item.id === body.ledgerId);
	    if (!fee || (!receipt && !ledger)) return jsonResponse({ message: '水单或应收不存在' }, 404);
	    if (receipt && (fee.currency ?? 'RMB') !== (receipt.currency ?? 'RMB')) return jsonResponse({ message: '水单币种与应收币种不一致' }, 400);
	    const amount = Number(body.amount ?? fee.amount);
	    const row = receipt ?? {
	      id: `wr-${waterReceipts.length + 1}`,
	      receiptNo: `SD2026060100${waterReceipts.length + 1}`,
	      site: '思远收款',
	      customerId: ledger?.customerId,
	      customerCode: '9409',
	      customerName: ledger?.customerName,
	      receiptDate: ledger?.createdAt ?? '2026-06-01T10:00:00.000Z',
	      receiptMethod: ledger?.note,
	      amount: ledger?.amount ?? amount,
	      currency: 'RMB',
	      matchedAmount: 0,
	      balance: ledger?.balance ?? amount,
	      status: 'ARRIVED' as const,
	      matches: [],
	      createdAt: ledger?.createdAt,
	      updatedAt: ledger?.createdAt
	    };
	    if (!receipt) waterReceipts.unshift(row);
	    fee.paymentNo = row.receiptNo;
	    fee.receivedAmount = Number(((fee.receivedAmount ?? 0) + amount).toFixed(2));
	    fee.receiptStatus = fee.receivedAmount >= fee.amount ? 'RECEIVED' : 'PARTIAL';
	    row.matchedAmount = Number((row.matchedAmount + amount).toFixed(2));
	    row.balance = Number((row.balance - amount).toFixed(2));
	    if (ledger) ledger.balance = row.balance;
	    return jsonResponse({ ...fee, matchedReceiptNo: row.receiptNo, receiptBalance: row.balance });
	  }

	  const receivableAuditUpdateMatch = url.match(/\/api\/finance\/receivable-audits\/([^/]+)$/);
	  if (receivableAuditUpdateMatch && init?.method === 'DELETE') {
	    const fee = receivableFees.find((item) => item.id === receivableAuditUpdateMatch[1]);
	    if (!fee) return jsonResponse({ message: '应收不存在' }, 404);
	    fee.voided = true;
	    fee.reconciliationStatus = 'VOIDED';
	    return jsonResponse(fee);
	  }

	  if (url.endsWith('/api/finance/receivable-audits/batch-audit') && init?.method === 'POST') {
	    const ids = body.ids ?? [];
	    const rows: ReceivableAuditSummary[] = [];
	    ids.forEach((id: string) => {
	      const fee = receivableFees.find((item) => item.id === id && item.reconciliationStatus === 'PENDING');
	      if (fee) {
	        fee.reconciliationStatus = 'CONFIRMED';
	        fee.reviewedAt = '2026-06-17T11:00:00.000Z';
	        fee.reviewedBy = 'admin';
	        rows.push(fee);
	      }
	    });
	    return jsonResponse({ successCount: rows.length, failureCount: ids.length - rows.length, rows, failures: [] });
	  }

	  if (url.endsWith('/api/finance/receivable-audits/batch-reverse-audit') && init?.method === 'POST') {
	    const ids = body.ids ?? [];
	    const rows: ReceivableAuditSummary[] = [];
	    ids.forEach((id: string) => {
	      const fee = receivableFees.find((item) => item.id === id && item.reconciliationStatus === 'CONFIRMED');
	      if (fee) {
	        fee.reconciliationStatus = 'PENDING';
	        fee.reviewedAt = undefined;
	        fee.reviewedBy = undefined;
	        rows.push(fee);
	      }
	    });
	    return jsonResponse({ successCount: rows.length, failureCount: ids.length - rows.length, rows, failures: [] });
	  }

	  if (url.endsWith('/api/finance/receivable-audits/batch-void') && init?.method === 'POST') {
	    const ids = body.ids ?? [];
	    const rows: ReceivableAuditSummary[] = [];
	    ids.forEach((id: string) => {
	      const fee = receivableFees.find((item) => item.id === id && item.reconciliationStatus !== 'CONFIRMED');
	      if (fee) {
	        fee.reconciliationStatus = 'VOIDED';
	        fee.voided = true;
	        rows.push(fee);
	      }
	    });
	    return jsonResponse({ successCount: rows.length, failureCount: ids.length - rows.length, rows, failures: [] });
	  }

	  if (url.endsWith('/api/finance/receivable-audits/export') && init?.method === 'POST') {
	    const ids = body.ids ?? [];
	    const rows = ids.length ? receivableFees.filter((fee) => ids.includes(fee.id)) : receivableFees.filter((fee) => !fee.voided);
	    return jsonResponse({ rows, exportedAt: '2026-06-17T12:40:00.000Z' });
	  }

	  const shipmentFinanceCreateMatch = url.match(/\/api\/shipments\/([^/]+)\/finance-items$/);
  if (shipmentFinanceCreateMatch && init?.method === 'POST') {
    const shipment = employeeShipments.find((item) => item.id === shipmentFinanceCreateMatch[1]);
    if (!shipment) return jsonResponse({ message: '运单不存在' }, 404);
    const now = '2026-06-25T10:00:00.000Z';
    if (body.type === 'PAYABLE') {
      const row: PayableAuditSummary = {
        id: `pf-m-${payableAuditFees.length + 1}`,
        shipmentId: shipment.id,
        name: body.name,
        amount: Number(body.amount ?? 0),
        settled: false,
        agentName: body.agentName ?? shipment.agentName,
        type: 'PAYABLE',
        currency: body.currency ?? 'RMB',
        settlementMethod: body.settlementMethod,
        paymentNo: body.paymentNo,
        reconciliationStatus: body.reconciliationStatus ?? 'PENDING',
        createdAt: now,
        createdBy: 'admin',
        remark: body.remark,
        sourceType: 'MANUAL',
        chargeWeightKg: body.chargeWeightKg,
        unitPrice: body.unitPrice,
        amountOverridden: body.amountOverridden,
        salesperson: shipment.salesperson,
        customerCode: shipment.customerName.split('-')[0],
        customerName: shipment.customerName,
        customerOrderNo: shipment.customerOrderNo,
        systemOrderNo: shipment.systemOrderNo,
        transferNo: shipment.transferNo,
        payableTotal: Number(body.amount ?? 0)
      };
      payableAuditFees.push(row);
      return jsonResponse(row, 201);
    }
    if (body.type === 'BUSINESS_COST') {
      const row: BusinessCostAuditSummary = {
        id: `bc-m-${businessCostFees.length + 1}`,
        shipmentId: shipment.id,
        name: body.name,
        amount: Number(body.amount ?? 0),
        settled: false,
        type: 'BUSINESS_COST',
        currency: body.currency ?? 'RMB',
        settlementMethod: body.settlementMethod,
        paymentNo: body.paymentNo,
        reconciliationStatus: body.reconciliationStatus ?? 'PENDING',
        createdAt: now,
        createdBy: 'admin',
        remark: body.remark,
        sourceType: 'MANUAL',
        chargeWeightKg: body.chargeWeightKg,
        unitPrice: body.unitPrice,
        amountOverridden: body.amountOverridden,
        salesperson: shipment.salesperson,
        customerCode: shipment.customerName.split('-')[0],
        customerName: shipment.customerName,
        customerOrderNo: shipment.customerOrderNo,
        systemOrderNo: shipment.systemOrderNo,
        transferNo: shipment.transferNo,
        receivableTotal: 0,
        businessCostTotal: Number(body.amount ?? 0),
        businessProfit: 0
      };
      businessCostFees.push(row);
      return jsonResponse(row, 201);
    }
    const row: ReceivableAuditSummary = {
      id: `rf-m-${receivableFees.length + 1}`,
	      shipmentId: shipment.id,
	      systemOrderNo: shipment.systemOrderNo,
	      customerName: shipment.customerName,
	      customerId: customerIdForShipment(shipment),
	      name: body.name,
      amount: Number(body.amount ?? 0),
      settled: false,
      salesperson: shipment.salesperson,
      customerCode: shipment.customerName.split('-')[0],
      customerOrderNo: shipment.customerOrderNo,
      transferNo: shipment.transferNo,
      currency: body.currency ?? 'RMB',
      settlementMethod: body.settlementMethod,
      paymentNo: body.paymentNo,
      createdAt: now,
      createdBy: 'admin',
      reconciliationStatus: body.reconciliationStatus ?? 'PENDING',
      remark: body.remark,
      sourceType: 'MANUAL',
      amountOverridden: body.amountOverridden
    };
    receivableFees.push(row);
    return jsonResponse(row, 201);
  }

  const shipmentFinanceItemMatch = url.match(/\/api\/shipments\/([^/]+)\/finance-items\/([^/]+)(?:\/(lock|unlock))?$/);
  if (shipmentFinanceItemMatch && ['PUT', 'DELETE', 'POST'].includes(init?.method ?? '')) {
    const feeId = shipmentFinanceItemMatch[2];
    const allRows = [...receivableFees, ...businessCostFees, ...payableAuditFees] as Array<ReceivableAuditSummary | BusinessCostAuditSummary | PayableAuditSummary>;
    const row = allRows.find((item) => item.id === feeId);
    if (!row) return jsonResponse({ message: '费用不存在' }, 404);
    if (init?.method === 'DELETE') {
      row.reconciliationStatus = 'VOIDED';
      row.voided = true;
      return jsonResponse(row);
    }
    if (shipmentFinanceItemMatch[3] === 'lock') {
      row.reconciliationStatus = 'LOCKED';
      row.locked = true;
      return jsonResponse(row);
    }
    if (shipmentFinanceItemMatch[3] === 'unlock') {
      row.reconciliationStatus = 'PENDING';
      row.locked = false;
      return jsonResponse(row);
    }
    Object.assign(row, body);
    return jsonResponse(row);
  }

  const financeDetailMatch = url.match(/\/api\/shipments\/([^/]+)\/finance-detail$/);
  if (financeDetailMatch) {
    const role = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '').replace('Bearer ', '').replace('-token', '');
    return jsonResponse(createShipmentFinanceResponse(financeDetailMatch[1], role));
  }

  if (url.endsWith('/api/finance/customer-accounts')) {
    return jsonResponse(customerAccounts);
  }

  if (url.endsWith('/api/finance/account-ledger')) {
    return jsonResponse(accountLedger);
  }

  if (url.endsWith('/api/finance/payments')) {
    const amount = receivableFees.reduce((sum, fee) => sum + (fee.settled ? 0 : fee.amount), 0);
    receivableFees.forEach((fee) => {
      fee.settled = true;
      fee.reconciliationStatus = 'CONFIRMED';
      fee.reviewedAt = '2026-06-06T10:00:00.000Z';
      fee.reviewedBy = 'finance';
    });
    accountLedger.push(
      { id: 'al-pay-1', customerId: 'c-9409', customerName: '9409-Daloday', amount, balance: 10230, note: '收款登记', createdAt: '2026-06-06T10:00:00.000Z' },
      { id: 'al-settle-1', customerId: 'c-9409', customerName: '9409-Daloday', amount: -amount, balance: 10000, note: '核销应收费用', createdAt: '2026-06-06T10:00:00.000Z' }
    );
    return jsonResponse({
      payment: { id: 'pay-1', customerId: 'c-9409', customerName: '9409-Daloday', amount, settledAmount: amount, remainingAmount: 0, createdAt: '2026-06-06T10:00:00.000Z' },
      account: customerAccounts[0],
      settledFees: receivableFees
    });
  }

  if (url.endsWith('/api/finance/customer-statements') && init?.method === 'POST') {
    return jsonResponse(customerStatements[0]);
  }

  if (url.endsWith('/api/finance/customer-statements')) {
    return jsonResponse(customerStatements);
  }

  return jsonResponse({});
}

export function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
}

function upsertMockShipment(collection: Shipment[], shipment: Shipment) {
  const index = collection.findIndex((item) => item.id === shipment.id);
  if (index >= 0) {
    collection[index] = shipment;
  } else {
    collection.unshift(shipment);
  }
}

function findBestTestMarkupRule(markupRules: AgentMarkupSummary[], row: PriceBookRowSummary): AgentMarkupSummary | undefined {
  const channelName = row.channelName.trim();
  const realChannelName = row.realChannelName?.trim() || channelName;
  const destinationCountry = row.destinationCountry.trim();
  return markupRules
    .filter((rule) => rule.enabled && rule.agentName === row.agentName)
    .sort((left, right) => testMarkupSpecificity(right, channelName, realChannelName, destinationCountry) - testMarkupSpecificity(left, channelName, realChannelName, destinationCountry))
    .find((rule) => {
      const channelMatches = !rule.channelName || rule.channelName === channelName;
      const realChannelMatches = !rule.realChannelName || rule.realChannelName === realChannelName;
      const countryMatches = !rule.destinationCountry || rule.destinationCountry === destinationCountry;
      return channelMatches && realChannelMatches && countryMatches;
    });
}

function testMarkupSpecificity(rule: AgentMarkupSummary, channelName: string, realChannelName: string, destinationCountry: string) {
  let score = 0;
  if (rule.channelName && rule.channelName === channelName) {
    score += 2;
  }
  if (rule.realChannelName && rule.realChannelName === realChannelName) {
    score += 4;
  }
  if (rule.destinationCountry && rule.destinationCountry === destinationCountry) {
    score += 1;
  }
  return score;
}

export function shipment(
  id: string,
  systemOrderNo: string,
  customerOrderNo: string,
  status: ShipmentStatus,
  customerName: string,
  overrides: Partial<Shipment> = {}
): Shipment {
  return {
    id,
    createdAt: '2026-06-06T09:40:00.000Z',
    customerName,
    salesperson: customerName.startsWith('9409-') ? 'operator' : 'jylannie',
    customerOrderNo,
    systemOrderNo,
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: '美国',
    carrier: 'DHL',
    packageCount: 1,
    receivableWeightKg: 18,
    agentWeightKg: 18,
    latestTracking: '客户已预报',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status,
    channelName: 'DHL HK',
    agentName: '宇环',
    hasProblemTicket: false,
    ...overrides
  };
}

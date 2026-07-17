import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import type {
  AccountLedgerSummary,
  AgentSummary,
  AgentMarkupSummary,
  AuditLogSummary,
  CarrierTaskSummary,
  CustomerAccountSummary,
  DepartmentSummary,
  BusinessCostAuditSummary,
  FinanceCatalogItemSummary,
  MasterDataSnapshot,
  AgentBankAccountSummary,
  PayeeBankAccountSummary,
  PaidPaymentSummary,
  OrderEntryDetailSummary,
  PendingPaymentSummary,
  PaymentApplicationSummary,
  PaymentVoucherSummary,
  PayableAuditSummary,
  ProblemTicketSummary,
  PriceBookImportJobSummary,
  PriceBookRowSummary,
  PriceBookSummary,
  LegacyPricingModule,
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
import { summarizeLineShipmentPool } from '@siyuan/shared';
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
    handoverNo: 'HD-SYGJ06061230004',
    outboundBy: 'warehouse',
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
    handoverNo: 'HD-SYGJ06061239999',
    outboundBy: 'warehouse',
    etdAt: '2026-06-06T10:00:00.000Z',
    etaAt: '2026-06-16T10:00:00.000Z'
  }),
  shipment('s-arrived', 'SYGJ06061238888', 'ARR-0606', 'ARRIVED_PORT', '9409-Daloday', {
    transferNo: '1ZARRIVED',
    latestTracking: '已到港，等待派送/提取',
    outboundAt: '2026-06-02T10:00:00.000Z',
    handoverNo: 'HD-SYGJ06061238888',
    outboundBy: 'warehouse',
    etdAt: '2026-06-06T10:00:00.000Z',
    etaAt: '2026-06-16T10:00:00.000Z'
  }),
  shipment('s-review', 'SYREVIEW000001', 'OUT-1', 'REVIEW_PENDING', '9409-Daloday', {
    productName: '测试产品',
    cargoType: '普货',
    settlementMethod: '月结',
    declarationRequired: false,
    sensitive: false,
    weightKg: 18,
    volumeCbm: 0.12,
    chargeableWeightKg: 20,
    receivableRmbTotal: 1000,
    entryBy: 'operator',
    businessReviewedBy: 'operator',
    businessReviewedAt: '2026-06-25T09:30:00.000Z',
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
  { id: 'rf-2', shipmentId: 's-1', systemOrderNo: 'SYGJ06061230001', customerName: '9409-Daloday', name: '燃油费', amount: 30, settled: false, salesperson: 'Rachel', customerId: 'c-9409', customerCode: '9409', transferNo: 'DHL26060600001', currency: 'USD', settlementMethod: '思远阿里', paymentNo: '4654316987986131', createdAt: '2026-06-17T10:00:00.000Z', createdBy: 'Rachel', reconciliationStatus: 'PENDING', sourceType: 'SYSTEM' },
  { id: 'rf-3', shipmentId: 's-1', systemOrderNo: 'SYGJ06061230001', customerName: '9409-Daloday', name: '系统匹配费', amount: 120, settled: false, salesperson: 'Rachel', customerId: 'c-9409', customerCode: '9409', transferNo: 'DHL26060600001', currency: 'RMB', settlementMethod: '思远阿里', createdAt: '2026-06-17T10:05:00.000Z', createdBy: 'Rachel', reconciliationStatus: 'PENDING', sourceType: 'SYSTEM' }
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
  const canViewOwnPayables = canViewInternalFinance || (['OPERATOR', 'UG_BUSINESS'].includes(role) && shipment?.salesperson === 'operator');
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
    payables: canViewOwnPayables ? (canViewInternalFinance ? payables : payables.map((fee) => ({ ...fee, agentName: undefined, paymentNo: undefined }))) : [],
    businessCosts,
    receivableTotal,
    payableTotal: canViewOwnPayables ? payableTotal : 0,
    businessCostTotal,
    grossProfit: canViewInternalFinance ? receivableTotal - payableTotal : undefined,
    canViewPayables: canViewOwnPayables,
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
const priceBookImportJobs: PriceBookImportJobSummary[] = [];
const priceBookSourceFiles = new Map<string, File>();
const backendSeedPriceRows: PriceBookRowSummary[] = [
  { id: 'price-a-la-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美西快线海卡渠道汇总', channelName: '海运洛杉矶专线', businessRouteName: 'HK-DHL', realChannelName: 'DHK03', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 18, currency: 'RMB', transitDays: 25, transitLabel: '22-28 天' },
  { id: 'price-a-houston-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美中快线海卡渠道汇总', channelName: '海运休斯顿专线', businessRouteName: 'HK-DHL', realChannelName: 'DHK01', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 19, currency: 'RMB', transitDays: 22, transitLabel: '20-25 天' },
  { id: 'price-a-air-la-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美西快线海卡渠道汇总', channelName: '空运洛杉矶专线', realChannelName: 'DHL-A', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 32, currency: 'RMB', transitDays: 7, transitLabel: '5-9 天' },
  { id: 'price-public-tpd-12-100', priceBookId: 'seed-public', agentName: '拓普达', carrierName: '海运', sourceSheetName: '华东', channelName: 'TPD-S4-美西组合海卡', realChannelName: 'TPD-S4-美西组合海卡', warehouseCode: 'FTW5', destinationCountry: '业务渠道展示国', minWeightKg: 12, maxWeightKg: 100, costPerKg: 10, currency: 'RMB', transitDays: 24, transitLabel: '22-26 天' },
  { id: 'price-public-yy-12-100', priceBookId: 'seed-public', agentName: '亿阳国际', carrierName: '海运', sourceSheetName: '华南', channelName: 'YY黄金达海卡', realChannelName: 'YY黄金达海卡', warehouseCode: 'FTW5', destinationCountry: '业务渠道展示国', minWeightKg: 12, maxWeightKg: 100, costPerKg: 11, currency: 'RMB', transitDays: 25, transitLabel: '23-27 天' },
  { id: 'price-public-english-12-100', priceBookId: 'seed-public', agentName: '英文代理', carrierName: '快递', sourceSheetName: '深圳/广州仓', channelName: 'DHL Express', realChannelName: 'DHL Express', warehouseCode: 'FTW5', destinationCountry: '业务渠道展示国', minWeightKg: 12, maxWeightKg: 100, costPerKg: 12, currency: 'RMB', transitDays: 5, transitLabel: '5-7 天' }
];
const financeCatalogItems: FinanceCatalogItemSummary[] = [
  { id: 'fc-fee-freight-default', category: 'FEE_NAME', name: '运费', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-freight', category: 'FEE_NAME', name: '基础运费', currency: 'RMB', sortOrder: 2, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-fuel', category: 'FEE_NAME', name: '燃油费', currency: 'RMB', sortOrder: 3, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-business-cost', category: 'FEE_NAME', name: '业务员成本', currency: 'RMB', sortOrder: 4, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-disabled', category: 'FEE_NAME', name: '停用费用', currency: 'RMB', sortOrder: 5, enabled: false, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
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
  { id: 'wh-9409-1', customerCode: '9409', site: '深圳站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: '9409', domesticTrackingNo: 'KY94090001', combinedOrderNo: '9409-KY94090001', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 2, packageCount: 1, weightKg: 11.2, lengthCm: 60, widthCm: 40, heightCm: 35, cbm: 0.084, volumetricWeightKg: 14, chargeableWeightKg: 14, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-10T11:08:08.000+08:00', status: 'RECEIVED', exceptions: [], createdAt: '2026-06-10T11:08:08.000+08:00' },
  { id: 'wh-9409-2', customerCode: '9409', site: '深圳站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: '9409', domesticTrackingNo: 'KY94090002', combinedOrderNo: '9409-KY94090002', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 2, packageCount: 1, weightKg: 9.8, lengthCm: 58, widthCm: 39, heightCm: 33, cbm: 0.074646, volumetricWeightKg: 12.44, chargeableWeightKg: 12.44, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-10T10:58:08.000+08:00', status: 'RECEIVED', exceptions: [], createdAt: '2026-06-10T10:58:08.000+08:00' },
  { id: 'wh-1399-1', customerCode: '1399', site: '深圳站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, chargeableWeightKg: 50.05, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:07:28.000+08:00', remark: '木架，外箱轻微磨损', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:07:28.000+08:00' },
  { id: 'wh-1399-2', customerCode: '1399', site: '深圳站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 13.9, lengthCm: 130, widthCm: 46, heightCm: 51, cbm: 0.30498, volumetricWeightKg: 50.83, chargeableWeightKg: 50.83, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:08:08.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:08:08.000+08:00' },
  { id: 'wh-1399-3', customerCode: '1399', site: '深圳站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 129, widthCm: 46, heightCm: 51, cbm: 0.302634, volumetricWeightKg: 50.44, chargeableWeightKg: 50.44, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:08:48.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:08:48.000+08:00' },
  { id: 'wh-p710-1', customerCode: 'P710', site: '广州站', salesperson: 'operator', scanSource: '扫码', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', combinedOrderNo: 'P710-999056444656', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 8.6, lengthCm: 90, widthCm: 40, heightCm: 42, cbm: 0.1512, volumetricWeightKg: 25.2, chargeableWeightKg: 25.2, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-09T09:15:03.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-09T09:15:03.000+08:00' }
];
const initialWarehousePackages = warehousePackages.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }));
const warehouseTallyTasks: WarehouseTallyTaskSummary[] = [];

function withConfirmedWarehouseTally(packages: WarehousePackageSummary[]) {
  const completedTaskByPackageId = new Map<string, WarehouseTallyTaskSummary>();
  const pendingTaskByPackageId = new Map<string, WarehouseTallyTaskSummary>();
  warehouseTallyTasks
    .filter((task) => task.status === 'COMPLETED')
    .forEach((task) => [...task.packageIds, task.appliedPackageId].filter(Boolean).forEach((packageId) => completedTaskByPackageId.set(packageId!, task)));
  warehouseTallyTasks
    .filter((task) => task.status === 'PENDING')
    .forEach((task) => task.packageIds.forEach((packageId) => pendingTaskByPackageId.set(packageId, task)));
  return packages.map((pkg) => {
    const pendingTask = pendingTaskByPackageId.get(pkg.id);
    if (pendingTask) {
      return { ...pkg, tallyTaskId: pendingTask.id, tallyTaskNo: pendingTask.taskNo, tallyCompleted: false, tallyStatus: '理货中' };
    }
    const task = completedTaskByPackageId.get(pkg.id);
    return task
      ? { ...pkg, tallyTaskId: task.id, tallyTaskNo: task.taskNo, tallyCompleted: true, tallyStatus: '已理货' }
      : { ...pkg, tallyTaskId: undefined, tallyTaskNo: undefined, tallyCompleted: false, tallyStatus: '待理货' };
  });
}

const masterData: MasterDataSnapshot = {
  customers: [{ id: 'c-9409', code: '9409', name: 'Daloday', shortName: 'Daloday', fullName: 'Daloday Inc.', customerType: '直客', salesperson: 'operator', enabled: true }],
  contacts: [{ id: 'cc-9409-main', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Lina', company: 'Daloday Inc.', phone: '13800000001', email: 'lina@example.com', address: '9409 Sample Street', country: 'US', state: 'CA', postalCode: '90001', enabled: true }],
  customerUsers: [{ id: 'u-customer', customerId: 'c-9409', customerName: '9409-Daloday', username: 'customer', enabled: true }],
  agents: [{
    id: 'a-yuhuan',
    code: 'YH',
    shortName: '宇环',
    name: '深圳宇环',
    createdAt: '2026-06-01T09:00:00.000Z',
    warehouseAddress1: '深圳市宝安区宇环仓一',
    warehouseAddress2: '深圳市宝安区宇环仓二',
    warehouseAddress3: '深圳市宝安区宇环仓三',
    warehouseContact: '宇环仓库',
    invoiceTemplateName: '宇环发票模板.xlsx',
    invoiceTemplateUrl: '/templates/yuhuan-invoice.xlsx',
    trackingWebsite: 'https://agent-track.example.com?no={transferNo}',
    enabled: true
  }, {
    id: 'a-yiyang',
    code: 'YY',
    shortName: '亿阳国际',
    name: '亿阳国际',
    createdAt: '2026-06-02T09:00:00.000Z',
    enabled: true
  }, {
    id: 'a-topda',
    code: 'TPD',
    shortName: '拓普达',
    name: '拓普达',
    createdAt: '2026-06-03T09:00:00.000Z',
    enabled: true
  }, {
    id: 'a-zhenyun',
    code: 'ZY',
    shortName: '振韵',
    name: '深圳振韵国际',
    createdAt: '2026-06-04T09:00:00.000Z',
    enabled: true
  }, {
    id: 'a-disabled',
    code: 'DIS',
    shortName: '停用代理',
    name: '停用代理',
    createdAt: '2026-05-01T09:00:00.000Z',
    enabled: false
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
const operationPermissionDefinitions = [
  { code: 'operations:line-shipment:view', label: '查看专线运单池', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:detail', label: '查看运单详情', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:process', label: '处理运单', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:status-update', label: '修改运营状态', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:tracking-add', label: '添加运营轨迹', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:problem-create', label: '新建运营问题件', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:import', label: '导入运单', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:internal-log-view', label: '查看内部流通日志', group: '运营工作台 / 专线运单池' },
  { code: 'operations:ai-queue:view', label: '查看 AI 优先队列', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:assist', label: '调用运营 AI 助手', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:mark-read', label: '标记 AI 队列已读', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:handle', label: '处理 AI 推荐任务', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:product-map:view', label: '查看产品地图', group: '运营工作台 / 产品地图' },
  { code: 'operations:product-map:route-view', label: '查看产品渠道关系', group: '运营工作台 / 产品地图' },
  { code: 'operations:product-map:cost-sensitive-view', label: '查看产品地图敏感成本', group: '运营工作台 / 产品地图' },
  { code: 'operations:import-quality:view', label: '查看导入质检', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:upload', label: '上传运单导入文件', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:retry', label: '重试导入', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:error-detail-view', label: '查看导入错误详情', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:confirm', label: '确认导入结果', group: '运营工作台 / 导入质检' }
];
const operationPermissionCodes = operationPermissionDefinitions.map((item) => item.code);
const businessPermissionDefinitions = [
  { code: 'business:dashboard:view', label: '查看业务看板', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:team-view', label: '查看团队统计', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:all-view', label: '查看全部统计', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:trend-view', label: '查看录单趋势', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:pending-review-summary', label: '查看待审核摘要', group: '业务管理 / 业务看板' },
  { code: 'business:order-entry:view', label: '进入录单页面', group: '业务管理 / 录单' },
  { code: 'business:order-entry:warehouse-package-select', label: '选择在仓货物录单', group: '业务管理 / 录单' },
  { code: 'business:order-entry:create', label: '新建录单', group: '业务管理 / 录单' },
  { code: 'business:order-entry:draft-view', label: '查看录单草稿', group: '业务管理 / 录单' },
  { code: 'business:order-entry:draft-save', label: '保存录单草稿', group: '业务管理 / 录单' },
  { code: 'business:order-entry:draft-delete', label: '删除录单草稿', group: '业务管理 / 录单' },
  { code: 'business:order-entry:submit-review', label: '提交审核', group: '业务管理 / 录单' },
  { code: 'business:order-entry:invoice-upload', label: '上传业务发票', group: '业务管理 / 录单' },
  { code: 'business:order-entry:label-upload', label: '上传业务标签', group: '业务管理 / 录单' },
  { code: 'business:order-fee:view', label: '查看订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:create', label: '新增订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:update', label: '修改订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:delete', label: '删除订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:lock', label: '锁定订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:unlock', label: '解锁订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:profit-view', label: '查看订单利润', group: '业务管理 / 录单' },
  { code: 'business:review:list', label: '查看待审核列表', group: '业务管理 / 待审核运单' },
  { code: 'business:review:detail', label: '查看待审核详情', group: '业务管理 / 待审核运单' },
  { code: 'business:review:deleted-list', label: '查看已删除订单', group: '业务管理 / 待审核运单' },
  { code: 'business:review:approve', label: '审核通过', group: '业务管理 / 待审核运单' },
  { code: 'business:review:reject', label: '审核不通过', group: '业务管理 / 待审核运单' },
  { code: 'business:review:reverse', label: '反审核', group: '业务管理 / 待审核运单' },
  { code: 'business:review:delete', label: '删除待审核订单', group: '业务管理 / 待审核运单' },
  { code: 'business:review:restore', label: '恢复已删除订单', group: '业务管理 / 待审核运单' },
  { code: 'business:review:purge', label: '彻底删除订单', group: '业务管理 / 待审核运单' },
  { code: 'business:review:finance-detail-view', label: '查看审核财务明细', group: '业务管理 / 待审核运单' },
  { code: 'business:review:operation-log-view', label: '查看审核操作日志', group: '业务管理 / 待审核运单' },
  { code: 'business:shipment:list', label: '查看运单管理列表', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:detail', label: '查看运单详情', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:self-view', label: '查看本人运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:team-view', label: '查看团队运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:all-view', label: '查看全部运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:update-basic', label: '修改运单基础资料', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:update-operational', label: '修改运单运营资料', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:delete', label: '删除运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:payment-record', label: '登记收付款信息', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:tracking-add', label: '添加运单轨迹', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:problem-create', label: '创建运单问题件', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:finance-detail-view', label: '查看运单财务明细', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:receivable-view', label: '查看运单应收', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:payable-view', label: '查看运单应付', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:profit-view', label: '查看运单利润', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:export', label: '导出运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:column-setting', label: '保存运单列设置', group: '业务管理 / 运单管理' },
  { code: 'business:order-ai:view', label: '查看 AI 订单助手', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:assist', label: '调用 AI 订单助手', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:finance-context', label: '允许 AI 使用财务上下文', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:all-order-context', label: '允许 AI 使用全部订单上下文', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:export-result', label: '导出 AI 订单结果', group: '业务管理 / AI 订单助手' }
] as const;
const businessPermissionCodes = businessPermissionDefinitions.map((item) => item.code);
const warehousePermissionDefinitions = [
  ['warehouse:today-receipt:view', '查看今日收货', '今日收货'], ['warehouse:today-receipt:filter', '筛选今日收货', '今日收货'], ['warehouse:today-receipt:manual-create', '手动添加收货', '今日收货'], ['warehouse:today-receipt:update', '修改收货入仓数据', '今日收货'], ['warehouse:today-receipt:remark-update', '维护收货备注', '今日收货'], ['warehouse:today-receipt:exception-manage', '维护收货异常', '今日收货'], ['warehouse:today-receipt:device-import', '接收设备推送', '今日收货'], ['warehouse:today-receipt:device-log-view', '查看设备推送日志', '今日收货'], ['warehouse:today-receipt:column-setting', '保存今日收货列设置', '今日收货'],
  ['warehouse:in-stock:view', '查看在仓数据', '在仓数据'], ['warehouse:in-stock:update', '修改在仓包裹', '在仓数据'], ['warehouse:in-stock:split', '拆分在仓包裹', '在仓数据'], ['warehouse:in-stock:batch-select', '批量勾选在仓包裹', '在仓数据'], ['warehouse:in-stock:tally-start', '发起理货', '在仓数据'], ['warehouse:in-stock:batch-tally-start', '批量发起理货', '在仓数据'], ['warehouse:in-stock:order-entry-select', '选择包裹录单', '在仓数据'], ['warehouse:in-stock:batch-order-entry', '批量录单', '在仓数据'], ['warehouse:in-stock:tally-record-view', '查看理货记录', '在仓数据'], ['warehouse:in-stock:column-setting', '保存在仓列设置', '在仓数据'],
  ['warehouse:tally-pending:view', '查看未完成理货', '未完成理货'], ['warehouse:tally-pending:task-create', '创建理货任务', '未完成理货'], ['warehouse:tally-pending:task-update', '修改理货任务', '未完成理货'], ['warehouse:tally-pending:task-process', '处理理货', '未完成理货'], ['warehouse:tally-pending:merge-only', '合并成一箱', '未完成理货'], ['warehouse:tally-pending:merge-and-ship', '理货并创建出货单', '未完成理货'], ['warehouse:tally-pending:split', '拆票理货', '未完成理货'], ['warehouse:tally-pending:detail-view', '查看理货明细', '未完成理货'], ['warehouse:tally-pending:history-view', '查看理货记录', '未完成理货'], ['warehouse:tally-pending:filter', '筛选未完成理货', '未完成理货'],
  ['warehouse:tally-completed:view', '查看已完成理货', '已完成理货'], ['warehouse:tally-completed:history-view', '查看已完成理货历史', '已完成理货'], ['warehouse:tally-completed:detail-view', '查看已完成理货详情', '已完成理货'], ['warehouse:tally-label:generate', '生成理货标签', '已完成理货'], ['warehouse:tally-label:reprint', '重打理货标签', '已完成理货'], ['warehouse:tally-label:print', '打印理货标签', '已完成理货'], ['warehouse:tally-label:download', '下载理货标签', '已完成理货'], ['warehouse:tally-label:scan-apply', '扫描应用理货标签', '已完成理货'], ['warehouse:tally-label:overwrite-package', '标签覆盖在仓包裹', '已完成理货'],
  ['warehouse:dispatch-pending:view', '查看待出库', '待出库'], ['warehouse:dispatch-pending:batch-select', '勾选待出库订单', '待出库'], ['warehouse:dispatch-pending:handover-preview', '预览代理交接单', '待出库'], ['warehouse:dispatch-pending:handover-print', '打印代理交接单', '待出库'], ['warehouse:dispatch-pending:dispatch-confirm', '确认出库', '待出库'], ['warehouse:dispatch-pending:batch-dispatch-confirm', '批量确认出库', '待出库'], ['warehouse:dispatch-pending:shipping-mark-confirm', '确认贴唛头', '待出库'], ['warehouse:dispatch-pending:label-generate', '生成内部交货面单', '待出库'], ['warehouse:dispatch-pending:label-view', '查看内部交货面单', '待出库'], ['warehouse:dispatch-pending:label-void', '作废内部交货面单', '待出库'], ['warehouse:dispatch-pending:column-setting', '保存待出库列设置', '待出库'],
  ['warehouse:outbounded:view', '查看已出库历史', '已出库'], ['warehouse:outbounded:handover-view', '查看已出库交接单', '已出库'], ['warehouse:outbounded:detail-view', '查看已出库详情', '已出库'], ['warehouse:outbounded:export', '导出已出库历史', '已出库']
].map(([code, label, section]) => ({ code, label, group: `仓库管理 / ${section}` }));
const warehousePermissionCodes = warehousePermissionDefinitions.map((item) => item.code);
const marketPermissionDefinitions = [
  ['market:dashboard:view', '查看市场看板', '市场看板'], ['market:dashboard:pending-summary', '查看待排货概览', '市场看板'], ['market:dashboard:routed-summary', '查看已排货概览', '市场看板'], ['market:dashboard:weekly-summary', '查看本周排货概览', '市场看板'], ['market:dashboard:agent-stats-view', '查看代理统计', '市场看板'], ['market:dashboard:channel-mode-stats-view', '查看渠道统计', '市场看板'], ['market:dashboard:sensitive-summary-view', '查看敏感货统计', '市场看板'], ['market:dashboard:team-view', '查看团队数据', '市场看板'], ['market:dashboard:all-view', '查看全部数据', '市场看板'],
  ['market:pending-routing:view', '查看待排货', '待排货'], ['market:pending-routing:detail', '查看待排货详情', '待排货'], ['market:pending-routing:assign', '分配代理渠道', '待排货'], ['market:pending-routing:save-draft', '保存排货资料', '待排货'], ['market:pending-routing:confirm', '确认排货', '待排货'], ['market:pending-routing:audit', '审核排货', '待排货'], ['market:pending-routing:update', '修改待排货', '待排货'], ['market:pending-routing:delete', '删除待排货', '待排货'], ['market:pending-routing:operation-log-view', '查看待排货操作日志', '待排货'], ['market:pending-routing:business-cost-view', '查看业务成本', '待排货'], ['market:pending-routing:payable-cost-view', '查看应付成本', '待排货'], ['market:pending-routing:agent-channel-view', '查看代理渠道', '待排货'], ['market:pending-routing:cost-field-view', '查看排货成本字段', '待排货'], ['market:pending-routing:column-setting', '保存待排货列设置', '待排货'],
  ['market:routed:view', '查看已排货', '已排货'], ['market:routed:detail', '查看已排货详情', '已排货'], ['market:routed:update', '修改已排货', '已排货'], ['market:routed:reroute', '退回重排', '已排货'], ['market:routed:log-view', '查看已排货日志', '已排货'], ['market:routed:agent-cost-view', '查看代理成本', '已排货'], ['market:routed:cost-total-view', '查看成本合计', '已排货'], ['market:routed:agent-channel-view', '查看已排货代理渠道', '已排货'], ['market:routed:column-setting', '保存已排货列设置', '已排货'],
  ['market:weekly-routing:view', '查看本周排货数据', '本周排货数据'], ['market:weekly-routing:detail', '查看本周排货详情', '本周排货数据'], ['market:weekly-routing:agent-stats-view', '查看本周代理统计', '本周排货数据'], ['market:weekly-routing:channel-mode-stats-view', '查看本周渠道统计', '本周排货数据'], ['market:weekly-routing:cost-view', '查看本周成本', '本周排货数据'], ['market:weekly-routing:reroute-stats-view', '查看退回重排统计', '本周排货数据'], ['market:weekly-routing:sensitive-stats-view', '查看本周敏感统计', '本周排货数据'], ['market:weekly-routing:export', '导出本周排货数据', '本周排货数据'], ['market:weekly-routing:column-setting', '保存本周排货列设置', '本周排货数据']
].map(([code, label, section]) => ({ code, label, group: `市场管理 / ${section}` }));
const marketPermissionCodes = marketPermissionDefinitions.map((item) => item.code);
const customerServicePermissionDefinitions = [
  ['customer-service:dashboard:view', '查看客服看板', '客服看板'], ['customer-service:data-confirm:view', '查看数据确认', '数据确认'], ['customer-service:data-confirm:business-view', '查看业务数据', '数据确认'], ['customer-service:data-confirm:agent-view', '查看代理数据', '数据确认'], ['customer-service:data-confirm:business-update', '修改业务数据', '数据确认'], ['customer-service:data-confirm:agent-update', '修改代理数据', '数据确认'], ['customer-service:data-confirm:business-approve', '审核业务数据', '数据确认'], ['customer-service:data-confirm:agent-approve', '审核代理数据', '数据确认'], ['customer-service:data-confirm:approve-all', '双数据审核通过', '数据确认'], ['customer-service:data-confirm:reverse', '反审核数据确认', '数据确认'],
  ['customer-service:transfer:view', '查看转单号', '转单号'], ['customer-service:transfer:write', '填写转单号', '转单号'], ['customer-service:transfer:batch-write', '批量填写转单号', '转单号'], ['customer-service:transfer:sub-order-write', '填写分单号', '转单号'], ['customer-service:transfer:push-sales', '推送业务待办', '转单号'], ['customer-service:transfer:view-outbound-time', '查看出库时间', '转单号'], ['customer-service:transfer:view-agent', '查看代理信息', '转单号'], ['customer-service:transfer:view-agent-data', '查看代理数据', '转单号'], ['customer-service:transfer:view-sensitive', '查看敏感字段', '转单号'], ['customer-service:transfer:view-all', '查看全部授权订单', '转单号'],
  ['customer-service:pending-routing:view', '查看待排货', '待排货'], ['customer-service:waiting-departure:view', '查看待离港', '待离港'], ['customer-service:waiting-departure:update-info', '修改待离港资料', '待离港'], ['customer-service:waiting-departure:update-transfer-no', '修改转单号', '待离港'], ['customer-service:waiting-departure:update-etd-eta', '修改 ETD/ETA', '待离港'], ['customer-service:waiting-departure:confirm-departure', '确认离港', '待离港'], ['customer-service:departed:view', '查看已离港', '已离港'], ['customer-service:departed:confirm-arrived-port', '确认到港', '已离港'], ['customer-service:arrived-port:view', '查看已到港', '已到港'], ['customer-service:arrived-port:confirm-delivering', '确认派送', '已到港'], ['customer-service:delivering:view', '查看已派送', '已派送'], ['customer-service:delivering:confirm-signed', '确认签收', '已派送'], ['customer-service:signed:view', '查看已签收', '已签收 / 售后'], ['customer-service:problem:view', '查看问题件', '问题件'], ['customer-service:problem:create', '创建问题件', '问题件'], ['customer-service:problem:reply', '回复问题件', '问题件'], ['customer-service:problem:close', '关闭问题件', '问题件'], ['customer-service:problem:assist', '标记需协助', '问题件'], ['customer-service:problem:after-sale-view', '查看需协助问题件', '问题件']
].map(([code, label, section]) => ({ code, label, group: `客服管理 / ${section}` }));
const customerServicePermissionCodes = customerServicePermissionDefinitions.map((item) => item.code);
const trackingPermissionDefinitions = [
  ['tracking:carrier-task:view', '查看承运商任务', '承运商任务'], ['tracking:carrier-task:detail', '查看任务详情', '承运商任务'], ['tracking:carrier-task:run', '手动同步轨迹', '承运商任务'], ['tracking:carrier-task:retry', '重试失败任务', '承运商任务'], ['tracking:carrier-task:error-view', '查看失败原因', '承运商任务'], ['tracking:carrier-task:log-view', '查看同步日志', '承运商任务'], ['tracking:carrier-task:column-setting', '保存任务列设置', '承运商任务'],
  ['tracking:external:view', '查看外部物流轨迹', '外部物流轨迹'], ['tracking:external:latest-view', '查看最新物流轨迹', '外部物流轨迹'], ['tracking:external:stale-days-view', '查看未更新天数', '外部物流轨迹'], ['tracking:external:detail', '查看轨迹详情', '外部物流轨迹'], ['tracking:external:single-add', '单票添加轨迹', '外部物流轨迹'], ['tracking:external:import-upload', '上传轨迹表', '外部物流轨迹'], ['tracking:external:import-preview', '查看导入预览', '外部物流轨迹'], ['tracking:external:import-confirm', '确认导入轨迹', '外部物流轨迹'], ['tracking:external:import-error-view', '查看失败行', '外部物流轨迹'], ['tracking:external:unmatched-view', '查看未匹配单号', '外部物流轨迹'], ['tracking:external:overwrite', '覆盖最新物流轨迹', '外部物流轨迹'], ['tracking:external:customer-visible-update', '更新客户可见轨迹', '外部物流轨迹'], ['tracking:external:column-setting', '保存轨迹列设置', '外部物流轨迹'], ['tracking:external:export', '导出轨迹列表', '外部物流轨迹']
].map(([code, label, section]) => ({ code, label, group: `物流轨迹管理 / ${section}` }));
const trackingPermissionCodes = trackingPermissionDefinitions.map((item) => item.code);
const masterPermissionDefinitions = [
  ['master-data:customers:read', '查看客户资料', '客户资料'], ['master-data:customers:view-own', '查看本人客户', '客户资料'], ['master-data:customers:view-all', '查看全部客户', '客户资料'], ['master-data:customers:detail', '查看客户详情', '客户资料'], ['master-data:customers:create', '新增客户', '客户资料'], ['master-data:customers:update', '修改客户', '客户资料'], ['master-data:customers:assign-salesperson', '分配业务员', '客户资料'], ['master-data:customers:enable', '启停客户', '客户资料'], ['master-data:customers:delete', '删除客户', '客户资料'], ['master-data:customers:import', '导入客户', '客户资料'], ['master-data:customers:export', '导出客户', '客户资料'], ['master-data:customers:contacts-view', '查看联系人', '客户资料'], ['master-data:customers:contacts-manage', '维护联系人', '客户资料'], ['master-data:customers:contacts-disable', '停用联系人', '客户资料'], ['master-data:customers:user-create', '创建客户账号', '客户资料'], ['master-data:customers:view-sensitive', '查看客户敏感资料', '客户资料'], ['master-data:customers:list-setting', '保存客户列设置', '客户资料'],
  ['master-data:finance:read', '查看财务资料', '财务资料'], ['master-data:finance:fee-name:create', '新增费用名称', '财务资料'], ['master-data:finance:fee-name:update', '修改费用名称', '财务资料'], ['master-data:finance:fee-name:delete', '删除费用名称', '财务资料'], ['master-data:finance:fee-name:reorder', '调整费用名称排序', '财务资料'], ['master-data:finance:settlement:create', '新增结算方式', '财务资料'], ['master-data:finance:settlement:update', '修改结算方式', '财务资料'], ['master-data:finance:settlement:delete', '删除结算方式', '财务资料'], ['master-data:finance:cargo-type:create', '新增货物类型', '财务资料'], ['master-data:finance:cargo-type:update', '修改货物类型', '财务资料'], ['master-data:finance:cargo-type:delete', '删除货物类型', '财务资料'], ['master-data:finance:product-name:create', '新增品名', '财务资料'], ['master-data:finance:product-name:update', '修改品名', '财务资料'], ['master-data:finance:product-name:delete', '删除品名', '财务资料'], ['master-data:finance:surcharge-manage', '维护附加费', '财务资料'], ['master-data:finance:surcharge-enable', '启停附加费', '财务资料'], ['master-data:finance:fuel-rate-manage', '维护燃油费率', '财务资料'], ['master-data:finance:view-sensitive', '查看财务敏感资料', '财务资料'],
  ['master-data:agents:read', '查看代理资料', '代理资料'], ['master-data:agents:detail', '查看代理详情', '代理资料'], ['master-data:agents:create', '新增代理', '代理资料'], ['master-data:agents:update', '修改代理', '代理资料'], ['master-data:agents:enable', '启停代理', '代理资料'], ['master-data:agents:batch-enable', '批量启停代理', '代理资料'], ['master-data:agents:delete', '删除代理', '代理资料'], ['master-data:agents:batch-delete', '批量删除代理', '代理资料'], ['master-data:agents:warehouse-view', '查看代理仓库', '代理资料'], ['master-data:agents:tracking-site-view', '查看轨迹站点', '代理资料'], ['master-data:agents:invoice-template-view', '查看发票模板', '代理资料'], ['master-data:agents:invoice-template-manage', '维护发票模板', '代理资料'], ['master-data:agents:bank-view', '查看代理银行', '代理资料'], ['master-data:agents:bank-manage', '维护代理银行', '代理资料'], ['master-data:agents:integration-type-view', '查看集成类型', '代理资料'], ['master-data:agents:list-setting', '保存代理列设置', '代理资料'],
  ['master-data:agent-channels:read', '查看代理渠道', '代理渠道'], ['master-data:agent-channels:filter-agent', '按代理筛选', '代理渠道'], ['master-data:agent-channels:create', '新增代理渠道', '代理渠道'], ['master-data:agent-channels:update', '修改代理渠道', '代理渠道'], ['master-data:agent-channels:enable', '启停代理渠道', '代理渠道'], ['master-data:agent-channels:delete', '删除代理渠道', '代理渠道'],
  ['master-data:channels:read', '查看公司渠道', '公司渠道'], ['master-data:channels:create', '新增公司渠道', '公司渠道'], ['master-data:channels:update', '修改公司渠道', '公司渠道'], ['master-data:channels:enable', '启停公司渠道', '公司渠道'], ['master-data:channels:delete', '删除公司渠道', '公司渠道'], ['master-data:channels:carrier-manage', '维护承运商', '公司渠道'], ['master-data:channels:carrier-enable', '启停承运商', '公司渠道'], ['master-data:channels:business-type-manage', '维护业务类型', '公司渠道'], ['master-data:channels:category-manage', '维护渠道类别', '公司渠道'], ['master-data:channels:volume-rule-manage', '维护除材积规则', '公司渠道'], ['master-data:channels:weight-rule-manage', '维护多件重量规则', '公司渠道'], ['master-data:channels:settlement-rule-manage', '维护结算重量规则', '公司渠道'], ['master-data:channels:large-cargo-rule-manage', '维护大货规则', '公司渠道'], ['master-data:channels:remote-rule-manage', '维护偏远规则', '公司渠道'],
  ['master-data:channel-categories:read', '查看渠道类别', '渠道类别'], ['master-data:channel-categories:create', '新增渠道类别', '渠道类别'], ['master-data:channel-categories:update', '修改渠道类别', '渠道类别'], ['master-data:channel-categories:enable', '启停渠道类别', '渠道类别'], ['master-data:channel-categories:delete', '删除渠道类别', '渠道类别'],
  ['master-data:remote-areas:read', '查看偏远', '偏远'], ['master-data:remote-areas:file-view', '查看偏远文件', '偏远'], ['master-data:remote-areas:upload', '上传偏远文件', '偏远'], ['master-data:remote-areas:delete', '删除偏远文件', '偏远'], ['master-data:remote-areas:file-paste-upload', '粘贴上传偏远文件', '偏远'], ['master-data:remote-areas:rule-manage', '维护偏远规则', '偏远'],
  ['master-data:exchange-rates:read', '查看汇率', '汇率'], ['master-data:exchange-rates:history-view', '查看汇率历史', '汇率'], ['master-data:exchange-rates:create', '新增汇率', '汇率'], ['master-data:exchange-rates:update', '修改汇率', '汇率'], ['master-data:exchange-rates:disable', '停用汇率', '汇率'], ['master-data:exchange-rates:period-view', '查看期间汇率', '汇率'], ['master-data:exchange-rates:export', '导出汇率', '汇率'],
  ['master-data:assistant:read', '查看资料辅助', '资料辅助'], ['master-data:assistant:ai-check', '执行 AI 校验', '资料辅助'], ['master-data:assistant:missing-warning-view', '查看缺失预警', '资料辅助'], ['master-data:assistant:stats-view', '查看资料统计', '资料辅助'], ['master-data:assistant:suggestion-generate', '生成资料建议', '资料辅助']
].map(([code, label, section]) => ({ code, label, group: `基础资料库 / ${section}` }));
const masterPermissionCodes = masterPermissionDefinitions.map((item) => item.code);
const systemPermissionDefinitions = [
  ['system:user-groups:read', '查看用户组', '用户组'], ['system:accounts:read', '查看员工账号', '用户名'], ['system:sites:read', '查看站点', '站点'], ['system:audit:read', '查看操作日志', '操作日志'], ['system:audit:ip-view', '查看 IP 地址', '操作日志'], ['system:audit:detail-view', '查看审计详情', '操作日志'], ['system:audit:before-after-view', '查看变更前后', '操作日志'], ['system:audit:raw-request-view', '查看原始请求', '操作日志'], ['system:role-permissions:read', '查看角色权限分配', '角色权限分配'], ['system:security:read', '查看权限安全区', '权限安全区'], ['system:ai-security:read', '查看 AI 接口安全', 'AI 接口安全'], ['system:ai-security:permission-check', '执行 AI 权限体检', 'AI 接口安全'], ['system:base-config:read', '查看系统基础配置', '系统基础配置']
].map(([code, label, section]) => ({ code, label, group: `系统管理 / ${section}` }));
const systemPermissionCodes = systemPermissionDefinitions.map((item) => item.code);
const financePermissionDefinitions = [
  'finance:dashboard:view', 'finance:receivable:read', 'finance:receivable:detail', 'finance:receivable:create', 'finance:receivable:update', 'finance:receivable:audit', 'finance:receivable:batch-audit', 'finance:receivable:reverse', 'finance:receivable:batch-reverse', 'finance:receivable:void', 'finance:receivable:batch-void', 'finance:receivable:match-water', 'finance:receivable:export', 'finance:receivable:view-sensitive', 'finance:receivable:view-all',
  'finance:business-cost:detail', 'finance:business-cost:batch-audit', 'finance:business-cost:batch-reverse', 'finance:business-cost:batch-void', 'finance:business-cost:view-sensitive',
  'finance:payable:detail', 'finance:payable:match-shipment', 'finance:payable:batch-audit', 'finance:payable:batch-reverse', 'finance:payable:batch-void',
  'finance:pending-payment:read', 'finance:pending-payment:create', 'finance:pending-payment:update', 'finance:pending-payment:cancel', 'finance:pending-payment:bank-select', 'finance:pending-payment:bank-manage', 'finance:pending-payment:export',
  'finance:paid-payment:read', 'finance:paid-payment:confirm', 'finance:paid-payment:update', 'finance:paid-payment:reverse', 'finance:paid-payment:voucher-upload', 'finance:paid-payment:bank-view', 'finance:paid-payment:export',
  'finance:water-receipt:create', 'finance:water-receipt:update', 'finance:water-receipt:voucher-upload', 'finance:water-receipt:voucher-delete',
  'finance:water-match:read', 'finance:water-match:receivable-view', 'finance:water-match:create', 'finance:water-match:cancel',
  'finance:agent-bill:read', 'finance:agent-bill:import', 'finance:agent-bill:difference-manage', 'finance:agent-bill:difference-resolve', 'finance:agent-bill:archive', 'finance:agent-bill:reverse-archive'
].map((code) => ({ code, label: code, group: `财务管理 / ${code.split(':')[1]}` }));
const financePermissionCodes = financePermissionDefinitions.map((item) => item.code);
const systemRoleMatrix = {
  availablePermissions: [
    { code: 'pricing:lookup:view', label: '进入报价查询', group: '报价查价 / 查价' },
    { code: 'pricing:lookup:amazon', label: '亚马逊查询', group: '报价查价 / 查价' },
    { code: 'pricing:lookup:south-africa', label: '南非专线查询', group: '报价查价 / 查价' },
    { code: 'pricing:lookup:south-africa-table-view', label: '查看南非专线报价表', group: '报价查价 / 查价' },
    { code: 'pricing:lookup:copy-quote', label: '复制报价文案', group: '报价查价 / 查价' },
    { code: 'pricing:south-africa:rules-read', label: '查看南非专线规则', group: '报价查价 / 南非专线规则' },
    { code: 'pricing:price-books:read', label: '查看价格表管理', group: '报价查价 / 价格表管理' },
    { code: 'pricing:price-books:list-view', label: '查看价格表列表', group: '报价查价 / 价格表管理' },
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
    ...operationPermissionDefinitions,
    ...businessPermissionDefinitions,
    ...warehousePermissionDefinitions,
    ...marketPermissionDefinitions,
    ...customerServicePermissionDefinitions,
    ...trackingPermissionDefinitions,
    ...masterPermissionDefinitions,
    ...systemPermissionDefinitions,
    ...financePermissionDefinitions
  ],
  roles: [
    {
      key: 'ADMIN',
      label: '管理员组',
      account: 'admin',
      scope: '全局数据',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'orders:review:restore', 'orders:review:purge', 'routing:read', 'routing:write', 'warehouse:read', 'warehouse:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'pricing:manage', 'finance:read', 'finance:settle', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:audit', 'finance:business-cost:reverse', 'finance:business-cost:void', 'finance:business-cost:export', 'finance:business-cost:view-all', 'finance:business-cost:view-agent', 'finance:business-cost:view-profit', 'finance:order-fee:payable:view', 'finance:order-fee:payable:manage', 'finance:order-fee:profit:receivable-payable', 'finance:order-fee:profit:receivable-business', 'finance:order-fee:profit:business-payable', 'finance:payable:read', 'finance:payable:manage', 'finance:payable:audit', 'finance:payable:reverse', 'finance:payable:void', 'finance:payable:export', 'finance:payable:payment', 'finance:payable:bank', 'finance:payable:attachment', 'finance:payable:view-sensitive', 'finance:payable:view-profit', 'finance:payable:paid-read', 'finance:payable:paid-confirm', 'finance:payable:paid-reverse', 'finance:payable:paid-export', 'finance:payable:paid-voucher', 'finance:payable:paid-bank-view', 'reports:read', 'master-data:read', 'master-data:write', 'master-data:agents:read', 'master-data:agents:write', 'master-data:channels:read', 'master-data:channels:write', 'system:manage', ...operationPermissionCodes, ...businessPermissionCodes, ...warehousePermissionCodes, ...marketPermissionCodes, ...customerServicePermissionCodes, ...trackingPermissionCodes, ...masterPermissionCodes, ...systemPermissionCodes, ...financePermissionCodes],
      restriction: '全部权限'
    },
    {
      key: 'CUSTOMER_SERVICE',
      label: '客服',
      account: 'service',
      scope: '客户与问题件',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'pricing:lookup', 'master-data:read', ...customerServicePermissionCodes],
      restriction: '不能核销、不能改系统权限'
    },
    {
      key: 'OPERATOR',
      label: '业务员',
      account: 'operator',
      scope: '客户出货与渠道排货',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'pricing:lookup', 'pricing:lookup:view', 'pricing:lookup:amazon', 'pricing:lookup:south-africa', 'pricing:lookup:south-africa-table-view', 'pricing:lookup:copy-quote', 'pricing:south-africa:rules-read', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:view-profit', 'finance:order-fee:profit:receivable-business', 'master-data:read', 'master-data:write', ...operationPermissionCodes, 'business:dashboard:view', 'business:dashboard:trend-view', 'business:dashboard:pending-review-summary', 'business:order-entry:view', 'business:order-entry:warehouse-package-select', 'business:order-entry:create', 'business:order-entry:draft-view', 'business:order-entry:draft-save', 'business:order-entry:draft-delete', 'business:order-entry:submit-review', 'business:order-entry:invoice-upload', 'business:order-entry:label-upload', 'business:order-fee:view', 'business:order-fee:create', 'business:order-fee:update', 'business:order-fee:delete', 'business:review:list', 'business:review:detail', 'business:shipment:list', 'business:shipment:detail', 'business:shipment:self-view', 'business:shipment:update-basic', 'business:shipment:tracking-add', 'business:shipment:problem-create', 'business:shipment:column-setting', 'business:order-ai:view', 'business:order-ai:assist'],
      restriction: '不能改财务、不能改权限'
    },
    {
      key: 'WAREHOUSE',
      label: '仓库',
      account: 'warehouse',
      scope: '入库、理货、打单、出货',
      permissions: ['workspace:access', 'orders:read', 'tracking:read', ...warehousePermissionCodes],
      restriction: '不能访问报价管理、财务和系统设置'
    },
    {
      key: 'FINANCE',
      label: '财务',
      account: 'finance',
      scope: '财务数据',
      permissions: ['workspace:access', 'orders:read', 'orders:review:restore', 'pricing:lookup', 'finance:read', 'finance:settle', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:audit', 'finance:business-cost:reverse', 'finance:business-cost:void', 'finance:business-cost:export', 'finance:business-cost:view-all', 'finance:business-cost:view-agent', 'finance:business-cost:view-profit', 'finance:order-fee:payable:view', 'finance:order-fee:payable:manage', 'finance:order-fee:profit:receivable-payable', 'finance:order-fee:profit:receivable-business', 'finance:order-fee:profit:business-payable', 'finance:payable:read', 'finance:payable:manage', 'finance:payable:audit', 'finance:payable:reverse', 'finance:payable:void', 'finance:payable:export', 'finance:payable:payment', 'finance:payable:bank', 'finance:payable:attachment', 'finance:payable:view-sensitive', 'finance:payable:view-profit', 'finance:payable:paid-read', 'finance:payable:paid-confirm', 'finance:payable:paid-reverse', 'finance:payable:paid-export', 'finance:payable:paid-voucher', 'finance:payable:paid-bank-view', 'reports:read', 'master-data:read', ...financePermissionCodes],
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
const testWaterReceiptPermissions = [
  { code: 'finance:water-receipt:read', label: '水单查看', group: '财务结算' },
  { code: 'finance:water-receipt:manage', label: '水单维护', group: '财务结算' },
  { code: 'finance:water-receipt:arrive', label: '水单到账确认', group: '财务结算' },
  { code: 'finance:water-receipt:match', label: '水单匹配应收', group: '财务结算' },
  { code: 'finance:water-receipt:adjust', label: '已到账金额调整', group: '财务结算' },
  { code: 'finance:water-receipt:void', label: '水单作废', group: '财务结算' },
  { code: 'finance:water-receipt:archive', label: '水单归档', group: '财务结算' },
  { code: 'finance:water-receipt:export', label: '水单导出', group: '财务结算' },
  { code: 'finance:water-receipt:voucher', label: '水单凭证维护', group: '财务结算' },
  { code: 'finance:water-receipt:view-all', label: '水单查看全部', group: '财务结算' }
];
testWaterReceiptPermissions.forEach((permission) => {
  if (!systemRoleMatrix.availablePermissions.some((item) => item.code === permission.code)) {
    systemRoleMatrix.availablePermissions.push(permission);
  }
});
systemRoleMatrix.roles.forEach((role, index) => {
  if (['ADMIN', 'FINANCE'].includes(role.key)) {
    testWaterReceiptPermissions.forEach((permission) => {
      if (!role.permissions.includes(permission.code)) role.permissions.push(permission.code);
    });
  }
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
const mockMarketRole = systemRoleMatrix.roles.find((role) => role.key === 'UG_MARKET');
if (mockMarketRole) {
  mockMarketRole.permissions = [
    'workspace:access',
    'orders:read',
    'master-data:read',
    ...marketPermissionCodes
  ];
}
const departments: DepartmentSummary[] = [
  { id: 'department-business', name: '业务部', enabled: true },
  { id: 'department-market', name: '市场部', enabled: true },
  { id: 'department-warehouse', name: '仓储部', enabled: true },
  { id: 'department-customer-service', name: '客服部', enabled: true },
  { id: 'department-finance', name: '财务部', enabled: true },
  { id: 'department-system', name: '系统管理部', enabled: true }
];
const staffAccounts: StaffAccountSummary[] = [
  { id: 'u-admin', username: 'admin', name: '系统管理员', nickname: 'admin', departmentId: 'department-system', department: '系统管理部', role: 'ADMIN', roleLabel: '管理员组', enabled: true, createdAt: '2026-06-01T00:00:00.000Z', lastLoginAt: '2026-07-02T15:12:00.000Z' },
  { id: 'u-service', username: 'service', name: '客服专员', nickname: '王五', departmentId: 'department-customer-service', department: '客服部', site: '深圳思远', role: 'UG_CUSTOMER_SERVICE', roleLabel: '客服', enabled: true, createdAt: '2026-06-01T00:00:00.000Z', lastLoginAt: '2026-07-02T17:41:00.000Z' },
  { id: 'u-operator', username: 'operator', name: '业务操作员', nickname: '赵六', departmentId: 'department-business', department: '业务部', site: '深圳思远', role: 'UG_BUSINESS', roleLabel: '业务部', enabled: true, mustChangePassword: true, createdAt: '2026-06-01T00:00:00.000Z', lastLoginAt: '2026-07-02T16:58:00.000Z' },
  { id: 'u-market', username: 'market', name: '市场专员', nickname: '钱八', departmentId: 'department-market', department: '市场部', site: '深圳思远', role: 'UG_MARKET', roleLabel: '市场部', enabled: true, createdAt: '2026-06-01T00:00:00.000Z', lastLoginAt: '2026-07-02T16:12:00.000Z' },
  { id: 'u-warehouse', username: 'warehouse', name: '仓库操作员', nickname: '刘七', departmentId: 'department-warehouse', department: '仓储部', site: '深圳思远', role: 'UG_WAREHOUSE_RECEIVE', roleLabel: '仓库收货', enabled: true, createdAt: '2026-06-01T00:00:00.000Z', lastLoginAt: '2026-07-02T13:26:00.000Z' },
  { id: 'u-finance', username: 'finance', name: '财务专员', nickname: '李四', departmentId: 'department-finance', department: '财务部', site: '深圳思远', role: 'UG_FINANCE', roleLabel: '财务', enabled: true, createdAt: '2026-06-01T00:00:00.000Z', lastLoginAt: '2026-07-02T18:23:00.000Z' }
];
const auditLogs: AuditLogSummary[] = [
  {
    id: 'audit-auth-profile-admin',
    actorId: 'u-admin',
    actorUsername: 'admin',
    action: 'auth.profile.update',
    actionLabel: '修改个人资料',
    module: 'auth',
    moduleLabel: '认证登录',
    target: 'user:u-admin',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { name: '系统管理员' },
    after: { name: '系统管理员' },
    createdAt: '2026-06-28T10:10:00.000Z'
  },
  {
    id: 'audit-auth-password-admin',
    actorId: 'u-admin',
    actorUsername: 'admin',
    action: 'auth.password.change',
    actionLabel: '修改登录密码',
    module: 'auth',
    moduleLabel: '认证登录',
    target: 'user:u-admin',
    result: 'SUCCESS',
    resultLabel: '成功',
    after: { username: 'admin' },
    createdAt: '2026-06-28T10:08:00.000Z'
  },
  {
    id: 'audit-auth-password-service',
    actorId: 'u-service',
    actorUsername: 'service',
    action: 'auth.password.change',
    actionLabel: '修改登录密码',
    module: 'auth',
    moduleLabel: '认证登录',
    target: 'user:u-service',
    result: 'SUCCESS',
    resultLabel: '成功',
    after: { username: 'service' },
    createdAt: '2026-06-28T10:07:00.000Z'
  },
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
    ipAddress: '203.0.113.10',
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
    ipAddress: '198.51.100.7',
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
    id: 'audit-business-approved-s-2',
    actorId: 'u-service',
    actorUsername: 'service',
    action: 'customer_service.business_data.approved',
    actionLabel: '业务数据审核通过',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 's-2',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { status: 'OUTBOUNDED', businessDataReviewStatus: 'PENDING' },
    after: { statusFrom: 'OUTBOUNDED', statusTo: 'OUTBOUNDED', businessDataReviewStatus: 'APPROVED' },
    createdAt: '2026-06-05T09:50:00.000Z'
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
    id: 'audit-business-approved-s-delivering',
    actorId: 'u-service',
    actorUsername: 'service',
    action: 'customer_service.business_data.approved',
    actionLabel: '业务数据审核通过',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 's-delivering',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { status: 'OUTBOUNDED', businessDataReviewStatus: 'PENDING' },
    after: { statusFrom: 'OUTBOUNDED', statusTo: 'OUTBOUNDED', businessDataReviewStatus: 'APPROVED' },
    createdAt: '2026-06-14T09:50:00.000Z'
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
    id: 'audit-business-approved-s-arrived',
    actorId: 'u-service',
    actorUsername: 'service',
    action: 'customer_service.business_data.approved',
    actionLabel: '业务数据审核通过',
    module: 'customer_service',
    moduleLabel: '客服管理',
    target: 's-arrived',
    result: 'SUCCESS',
    resultLabel: '成功',
    before: { status: 'OUTBOUNDED', businessDataReviewStatus: 'PENDING' },
    after: { statusFrom: 'OUTBOUNDED', statusTo: 'OUTBOUNDED', businessDataReviewStatus: 'APPROVED' },
    createdAt: '2026-06-15T09:50:00.000Z'
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
const initialAuditLogs = auditLogs.map((row) => structuredClone(row));
const navigationReadStates = new Set<string>();

function buildAuditDashboard(rows: AuditLogSummary[]) {
  const isImportant = (row: AuditLogSummary) => row.result === 'FAILED' || /(delete|void|audit|review|permission|role|finance|payment|voucher|receipt|import|export)/i.test(row.action);
  const values = rows.slice(0, 14).map((_row, index) => (index % 4) + 1).reverse();
  const metric = (count: number) => ({ value: count, yesterdayValue: Math.max(0, count - 1), changePercent: count ? 12.5 : 0, trend: values });
  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      total: metric(rows.length),
      failed: metric(rows.filter((row) => row.result === 'FAILED').length),
      important: metric(rows.filter(isImportant).length),
      permissionFinance: metric(rows.filter((row) => /(permission|role|finance|payment|voucher|receipt)/i.test(row.action)).length)
    },
    recentFailedImportant: rows.filter((row) => row.result === 'FAILED' && isImportant(row)).slice(0, 10)
  };
}

beforeEach(() => {
  localStorage.clear();
  navigationReadStates.clear();
  auditLogs.splice(0, auditLogs.length, ...initialAuditLogs.map((row) => structuredClone(row)));
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
      handoverNo: 'HD-SYGJ06061230004',
      outboundBy: 'warehouse',
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
      handoverNo: 'HD-SYGJ06061239999',
      outboundBy: 'warehouse',
      etdAt: '2026-06-06T10:00:00.000Z',
      etaAt: '2026-06-16T10:00:00.000Z'
    }),
    shipment('s-arrived', 'SYGJ06061238888', 'ARR-0606', 'ARRIVED_PORT', '9409-Daloday', {
      transferNo: '1ZARRIVED',
      latestTracking: '已到港，等待派送/提取',
      outboundAt: '2026-06-02T10:00:00.000Z',
      handoverNo: 'HD-SYGJ06061238888',
      outboundBy: 'warehouse',
      etdAt: '2026-06-06T10:00:00.000Z',
      etaAt: '2026-06-16T10:00:00.000Z'
    }),
    shipment('s-review', 'SYREVIEW000001', 'OUT-1', 'REVIEW_PENDING', '9409-Daloday', {
      productName: '测试产品',
      cargoType: '普货',
      settlementMethod: '月结',
      declarationRequired: false,
      sensitive: false,
      weightKg: 18,
      volumeCbm: 0.12,
      chargeableWeightKg: 20,
      receivableRmbTotal: 1000,
      entryBy: 'operator',
      businessReviewedBy: 'operator',
      businessReviewedAt: '2026-06-25T09:30:00.000Z',
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
    fee.receivedAmount = 0;
    fee.receiptStatus = 'UNPAID';
    fee.receivedAt = undefined;
    fee.paymentNo = fee.id === 'rf-3' ? undefined : '4654316987986131';
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
  waterReceipts.splice(0, waterReceipts.length, {
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
    salesperson: 'operator',
    enabled: true
  });
  masterData.contacts.splice(0, masterData.contacts.length, { id: 'cc-9409-main', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Lina', company: 'Daloday Inc.', phone: '13800000001', email: 'lina@example.com', address: '9409 Sample Street', country: 'US', state: 'CA', postalCode: '90001', enabled: true });
  masterData.customerUsers.splice(0, masterData.customerUsers.length, { id: 'u-customer', customerId: 'c-9409', customerName: '9409-Daloday', username: 'customer', enabled: true });
  masterData.agents.splice(0, masterData.agents.length, {
    id: 'a-yuhuan',
    code: 'YH',
    shortName: '宇环',
    name: '深圳宇环',
    createdAt: '2026-06-01T09:00:00.000Z',
    warehouseAddress1: '深圳市宝安区宇环仓一',
    warehouseAddress2: '深圳市宝安区宇环仓二',
    warehouseAddress3: '深圳市宝安区宇环仓三',
    warehouseContact: '宇环仓库',
    invoiceTemplateName: '宇环发票模板.xlsx',
    invoiceTemplateUrl: '/templates/yuhuan-invoice.xlsx',
    trackingWebsite: 'https://agent-track.example.com?no={transferNo}',
    enabled: true
  }, {
    id: 'a-yiyang',
    code: 'YY',
    shortName: '亿阳国际',
    name: '亿阳国际',
    createdAt: '2026-06-02T09:00:00.000Z',
    enabled: true
  }, {
    id: 'a-topda',
    code: 'TPD',
    shortName: '拓普达',
    name: '拓普达',
    createdAt: '2026-06-03T09:00:00.000Z',
    enabled: true
  }, {
    id: 'a-zhenyun',
    code: 'ZY',
    shortName: '振韵',
    name: '深圳振韵国际',
    createdAt: '2026-06-04T09:00:00.000Z',
    enabled: true
  }, {
    id: 'a-disabled',
    code: 'DIS',
    shortName: '停用代理',
    name: '停用代理',
    createdAt: '2026-05-01T09:00:00.000Z',
    enabled: false
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
    { id: 'u-admin', username: 'admin', departmentId: 'department-system', department: '系统管理部', role: 'ADMIN', roleLabel: '管理员组', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-service', username: 'service', departmentId: 'department-customer-service', department: '客服部', role: 'UG_CUSTOMER_SERVICE', roleLabel: '客服', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-operator', username: 'operator', departmentId: 'department-business', department: '业务部', role: 'UG_BUSINESS', roleLabel: '业务部', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-market', username: 'market', departmentId: 'department-market', department: '市场部', role: 'UG_MARKET', roleLabel: '市场部', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-warehouse', username: 'warehouse', departmentId: 'department-warehouse', department: '仓储部', role: 'UG_WAREHOUSE_RECEIVE', roleLabel: '仓库收货', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'u-finance', username: 'finance', departmentId: 'department-finance', department: '财务部', role: 'UG_FINANCE', roleLabel: '财务', enabled: true, createdAt: '2026-06-01T00:00:00.000Z' }
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
  priceBookImportJobs.splice(0, priceBookImportJobs.length);
  priceBookSourceFiles.clear();
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
	    const receipt = row.paymentNo ? waterReceipts.find((entry) => entry.id === row.paymentNo || entry.receiptNo === row.paymentNo) : undefined;
	    return {
	      ...row,
	      rmbAmount,
	      matchedReceiptNo: row.paymentNo,
	      receiptBalance: receipt?.balance ?? ledger?.balance
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

function waterReceiptDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date).replaceAll('-', '');
}

function nextWaterReceiptNoForMock() {
  const key = waterReceiptDateKey();
  const prefix = `SD${key}`;
  const pattern = new RegExp(`^${prefix}(\\d{3})$`);
  const maxSeq = waterReceipts.reduce((max, row) => {
    const seq = row.receiptNo.match(pattern)?.[1];
    return seq ? Math.max(max, Number(seq)) : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

function sanitizeManualPaymentNoForMock(value?: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  const cleaned = String(value).replace(/[\u0000-\u001f\u007f<>]/g, '').trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, 80);
}

function buildBusinessCostAuditResponse(rows: BusinessCostAuditSummary[], url = 'http://test.local') {
  const params = new URL(url, 'http://test.local').searchParams;
  const keyword = (value: string | undefined, key: string) => {
    const needle = params.get(key);
    return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
  };
  const filteredRows = rows.filter((row) => {
    const shipment = employeeShipments.find((item) => item.id === row.shipmentId);
    if (!shipment?.businessReviewedAt) return false;
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
  const actorRole = () => String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '').replace('Bearer ', '').replace('-token', '');
  const actorUsername = () => {
    const token = actorRole();
    if (token.includes('CUSTOMER_SERVICE')) return 'service';
    if (token.includes('OPERATOR')) return 'operator';
    if (token.includes('WAREHOUSE')) return 'warehouse';
    if (token.includes('FINANCE')) return 'finance';
    if (token.includes('UG_MARKET')) return 'market';
    return 'admin';
  };
  const actorAccount = () => staffAccounts.find((account) => account.username === actorUsername()) ?? staffAccounts[0];

  if (url.endsWith('/api/navigation/unread-badges')) {
    const read = (moduleKey: string, sectionKey?: string) => navigationReadStates.has(`${actorUsername()}:${moduleKey}:${sectionKey ?? ''}`);
    const item = (moduleKey: string, sectionKey?: string, count = 0) => ({ moduleKey, sectionKey, unreadCount: read(moduleKey, sectionKey) ? 0 : count, displayCount: String(read(moduleKey, sectionKey) ? 0 : count) });
    return jsonResponse({ items: [
      item('customerService', 'pending-routing', 1),
      item('customerService', 'waitingDeparture', 1),
      item('customerService', 'departed', 0),
      item('customerService', 'problems', 1),
      item('receive', 'consolidation', 1),
      item('receive', 'packages', 1),
      item('receive', 'queue', 1),
      item('workspace', 'shipmentPool', 1),
      item('business', 'order-entry-drafts', 1),
      item('business', 'pending-review', 1),
      item('business', 'order-management', 1),
      item('market', 'pending-routing', 1),
      item('market', 'routed', 1),
      item('finance', 'receivables', 1),
      item('finance', 'payment-applications', 1),
      item('customerService', undefined, 3),
      item('receive', undefined, 3),
      item('workspace', undefined, 1),
      item('business', undefined, 3),
      item('market', undefined, 2),
      item('finance', undefined, 2)
    ] });
  }

  if (url.endsWith('/api/navigation/read-state') && init?.method === 'POST') {
    navigationReadStates.add(`${actorUsername()}:${body.moduleKey}:${body.sectionKey ?? ''}`);
    return jsonResponse({ ok: true, moduleKey: body.moduleKey, sectionKey: body.sectionKey, readAt: new Date().toISOString(), watermark: new Date().toISOString() });
  }

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
      market: 'UG_MARKET',
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

  if (url.endsWith('/api/auth/me')) {
    const account = actorAccount();
    return jsonResponse({
      id: account.id,
      username: account.username,
      role: account.role,
      name: account.name,
      phone: account.phone,
      gender: account.gender,
      nickname: account.nickname,
      mustChangePassword: account.mustChangePassword
    });
  }

  if (url.endsWith('/api/auth/profile') && init?.method === 'PUT') {
    const account = actorAccount();
    const before = { name: account.name, phone: account.phone, gender: account.gender, nickname: account.nickname };
    account.name = body.name;
    account.phone = body.phone;
    account.gender = body.gender;
    account.nickname = body.nickname;
    const after = { name: account.name, phone: account.phone, gender: account.gender, nickname: account.nickname };
    auditLogs.unshift({
      id: `audit-auth-profile-${auditLogs.length + 1}`,
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.profile.update',
      actionLabel: '修改个人资料',
      module: 'auth',
      moduleLabel: '认证登录',
      target: `user:${account.id}`,
      result: 'SUCCESS',
      resultLabel: '成功',
      before,
      after,
      createdAt: '2026-07-09T10:00:00.000Z'
    });
    return jsonResponse({
      id: account.id,
      username: account.username,
      role: account.role,
      name: account.name,
      phone: account.phone,
      gender: account.gender,
      nickname: account.nickname,
      mustChangePassword: account.mustChangePassword
    });
  }

  if (url.endsWith('/api/auth/account-events')) {
    const account = actorAccount();
    const rows = auditLogs.filter((row) => {
      if (row.action.startsWith('auth.login.')) return false;
      if (['auth.profile.update', 'auth.password.change'].includes(row.action)) {
        return row.actorId === account.id && row.target === `user:${account.id}`;
      }
      return row.action.startsWith('system.staff.') && row.target.includes(account.id);
    });
    return jsonResponse(rows);
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
    if (currentShipment.status !== 'WAITING_SORT') {
      return jsonResponse({ message: '当前状态不允许排货' }, 400);
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
      shippingMarkRequired: body.shippingMarkRequired === true,
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

  const pendingRoutingDeleteMatch = url.match(/\/api\/shipments\/([^/]+)\/pending-routing$/);
  if (pendingRoutingDeleteMatch && init?.method === 'DELETE') {
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === pendingRoutingDeleteMatch[1]);
    const currentShipment = employeeShipments[shipmentIndex];
    if (!currentShipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    if (currentShipment.status !== 'WAITING_SORT') {
      return jsonResponse({ message: '只有待排货运单可以删除' }, 400);
    }
    const reason = String(body.reason ?? '').trim();
    if (!reason) {
      return jsonResponse({ message: '请填写删除原因' }, 400);
    }
    const actor = actorUsername();
    const deletedAt = new Date().toISOString();
    const updated = {
      ...currentShipment,
      deletedAt,
      deletedBy: actor,
      deletedReason: reason,
      deleteType: 'MANUAL' as const
    };
    employeeShipments[shipmentIndex] = updated;
    auditLogs.unshift({
      id: `audit-route-delete-${auditLogs.length + 1}`,
      actorId: `u-${actor}`,
      actorUsername: actor,
      action: 'shipment.route.delete',
      actionLabel: '删除待排货',
      module: 'shipment',
      moduleLabel: '运单',
      target: currentShipment.id,
      result: 'SUCCESS',
      resultLabel: '成功',
      before: currentShipment,
      after: {
        ...updated,
        statusBefore: currentShipment.status,
        deleteReason: reason,
        deletedBy: actor,
        deletedAt
      },
      createdAt: deletedAt
    });
    return jsonResponse(updated);
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

  const labelListMatch = url.match(/\/api\/shipments\/([^/]+)\/labels$/);
  if (labelListMatch && (!init?.method || init.method === 'GET')) {
    const shipmentId = decodeURIComponent(labelListMatch[1]);
    return jsonResponse(shipmentLabels.filter((label) => label.shipmentId === shipmentId && label.status === 'CREATED'));
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
    if (current.shippingMarkRequired && body.shippingMarkConfirmed !== true) {
      return jsonResponse({ message: '该票需要贴麦头，请确认已贴麦头后再出库' }, 400);
    }
    const updated = {
      ...current,
      status: 'OUTBOUNDED' as const,
      latestTracking: '仓库已出库，等待客服补齐转单号',
      dispatchedAt: '2026-06-06T10:00:00.000Z',
      outboundAt: '2026-06-06T10:00:00.000Z',
      transferNo: body.transferNo ?? current.transferNo,
      handoverNo: body.handoverNo,
      outboundBy: 'warehouse',
      batchDispatchSource: body.batchDispatchSource
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
        && keyword(row.action, 'action')
        && keyword(row.target, 'target');
    });
    const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
    const pageSize = Math.max(1, Number(params.get('pageSize') ?? 500) || 500);
    const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
    return jsonResponse({ rows, suspiciousDeleteWarnings: [], pagination: { page, pageSize, totalItems: filtered.length }, dashboard: buildAuditDashboard(auditLogs) });
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

  if (url.endsWith('/api/system/departments')) {
    return jsonResponse(departments);
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
      departmentId: body.departmentId,
      department: departments.find((department) => department.id === body.departmentId)?.name,
      site: body.site,
      role,
      roleLabel,
      enabled: body.enabled !== false,
      createdAt: '2026-06-21T10:00:00.000Z'
    };
    staffAccounts.push(account);
    return jsonResponse(account);
  }

  const staffEnabledMatch = url.match(/\/api\/system\/staff-accounts\/([^/]+)\/enabled$/);
  if (staffEnabledMatch && init?.method === 'PUT') {
    const account = staffAccounts.find((item) => item.id === staffEnabledMatch[1]);
    if (!account) return jsonResponse({ message: 'Not found' }, 404);
    account.enabled = body.enabled === true;
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
    if (body.departmentId !== undefined) {
      account.departmentId = body.departmentId || undefined;
      account.department = departments.find((department) => department.id === body.departmentId)?.name;
    }
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
    const departmentId = requestUrl.searchParams.get('departmentId');
    const site = requestUrl.searchParams.get('site');
    const role = requestUrl.searchParams.get('role');
    const status = requestUrl.searchParams.get('status') ?? 'ALL';
    return jsonResponse(staffAccounts.filter((account) =>
      (!keyword || [account.username, account.name, account.department, account.roleLabel].some((value) => value?.toLowerCase().includes(keyword)))
      && (!departmentId || account.departmentId === departmentId)
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

  if (url.endsWith('/api/master-data/customers')) {
    return jsonResponse(masterData.customers);
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

  const customerDeleteMatch = url.match(/\/api\/master-data\/customers\/([^/]+)$/);
  if (customerDeleteMatch && init?.method === 'DELETE') {
    const customerIndex = masterData.customers.findIndex((item) => item.id === customerDeleteMatch[1]);
    if (customerIndex < 0) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    const [customer] = masterData.customers.splice(customerIndex, 1);
    masterData.contacts = masterData.contacts.filter((item) => item.customerId !== customer.id);
    masterData.customerUsers = masterData.customerUsers.filter((item) => item.customerId !== customer.id);
    auditLogs.unshift({
      id: `audit-customer-delete-${auditLogs.length + 1}`,
      actorId: 'u-admin',
      actorUsername: actorUsername(),
      action: 'master_data.customer.delete',
      actionLabel: '删除客户资料',
      module: 'master_data',
      moduleLabel: '基础资料',
      target: customer.id,
      result: 'SUCCESS',
      resultLabel: '成功',
      before: customer,
      createdAt: new Date().toISOString()
    });
    return jsonResponse(customer);
  }

  if (url.endsWith('/api/master-data/agents') && init?.method === 'POST') {
    const baseId = `a-${String(body.code ?? body.shortName ?? body.name ?? 'm7').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')}`;
    const id = masterData.agents.some((agent) => agent.id === baseId) ? `${baseId}-${masterData.agents.length + 1}` : baseId;
    const agent = {
      id,
      code: body.code ?? 'M7',
      shortName: body.shortName ?? body.name,
      name: body.name ?? 'M7 Agent',
      createdAt: new Date().toISOString(),
      integrationType: body.integrationType ?? 'MANUAL',
      warehouseAddress1: body.warehouseAddress1,
      warehouseAddress2: body.warehouseAddress2,
      warehouseAddress3: body.warehouseAddress3,
      warehouseContact: body.warehouseContact,
      invoiceTemplateName: body.invoiceTemplateName,
      invoiceTemplateUrl: body.invoiceTemplateUrl,
      trackingWebsite: body.trackingWebsite,
      enabled: true
    };
    masterData.agents.push(agent);
    return jsonResponse(agent);
  }

  if (url.endsWith('/api/master-data/agents/batch-enabled') && init?.method === 'POST') {
    const ids = Array.from(new Set((body.ids ?? []).map((id: string) => String(id))));
    const rows = ids
      .map((id) => masterData.agents.find((agent) => agent.id === id))
      .filter(Boolean) as AgentSummary[];
    rows.forEach((agent) => {
      agent.enabled = body.enabled === true;
    });
    return jsonResponse({ successCount: rows.length, rows });
  }

  if (url.endsWith('/api/master-data/agents/batch-delete') && init?.method === 'POST') {
    const ids = Array.from(new Set((body.ids ?? []).map((id: string) => String(id))));
    const rows = ids
      .map((id) => masterData.agents.find((agent) => agent.id === id))
      .filter(Boolean) as AgentSummary[];
    const referenced = rows.filter((agent) =>
      masterData.agentChannels.some((channel) => channel.agentId === agent.id) ||
      employeeShipments.some((shipment) => shipment.agentId === agent.id || shipment.agentName === agent.name || shipment.agentName === agent.shortName)
    );
    if (referenced.length) {
      return jsonResponse({ message: `代理资料存在业务引用，不能物理删除：${referenced.map((agent) => agent.shortName ?? agent.name).join('、')}（代理渠道引用或运单引用）` }, 400);
    }
    masterData.agents = masterData.agents.filter((agent) => !ids.includes(agent.id));
    agentBankAccounts.splice(0, agentBankAccounts.length, ...agentBankAccounts.filter((bank) => !ids.includes(bank.agentId ?? '')));
    auditLogs.unshift({
      id: `audit-agent-delete-${auditLogs.length + 1}`,
      actorId: 'u-admin',
      actorUsername: actorUsername(),
      action: 'master_data.agent.delete',
      actionLabel: '物理删除代理资料',
      module: 'master_data',
      moduleLabel: '基础资料',
      target: 'master-data/agents',
      result: 'SUCCESS',
      resultLabel: '成功',
      before: { agents: rows },
      after: { deletedCount: rows.length, agentIds: rows.map((agent) => agent.id), agentShortNames: rows.map((agent) => agent.shortName ?? agent.name), hardDelete: true, deletedAt: new Date().toISOString() },
      createdAt: new Date().toISOString()
    });
    return jsonResponse({ successCount: rows.length, deletedAgents: rows, failures: [], hardDelete: true });
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
      trackingWebsite: body.trackingWebsite,
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

  const agentChannelDeleteMatch = url.match(/\/api\/master-data\/agent-channels\/([^/]+)$/);
  if (agentChannelDeleteMatch && init?.method === 'DELETE') {
    const channel = masterData.agentChannels.find((item) => item.id === agentChannelDeleteMatch[1]);
    if (!channel) return jsonResponse({ message: '代理渠道不存在' }, 404);
    masterData.agentChannels = masterData.agentChannels.filter((item) => item.id !== channel.id);
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
    const contactName = body.name ?? 'M7 Contact';
    const contact = {
      id: `cc-${contactName}`,
      customerId,
      customerName: customer ? `${customer.code}-${customer.name}` : customerId,
      name: contactName,
      company: body.company ?? undefined,
      phone: body.phone ?? '13900000007',
      email: body.email ?? 'm7@example.com',
      fbaWarehouseCode: body.fbaWarehouseCode ?? undefined,
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

  const channelDeleteMatch = url.match(/\/api\/master-data\/channels\/([^/]+)$/);
  if (channelDeleteMatch && init?.method === 'DELETE') {
    const channel = masterData.channels.find((item) => item.id === channelDeleteMatch[1]);
    if (!channel) return jsonResponse({ message: '渠道不存在' }, 404);
    if (employeeShipments.some((shipment) => shipment.channelId === channel.id) || pricingRules.some((rule) => rule.channelId === channel.id) || masterData.fuelRates.some((rate) => rate.channelId === channel.id)) {
      return jsonResponse({ message: '该公司渠道存在运单引用、报价规则引用或燃油费率引用，不能删除' }, 400);
    }
    masterData.channels = masterData.channels.filter((item) => item.id !== channel.id);
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

  const channelCategoryDeleteMatch = url.match(/\/api\/master-data\/channel-categories\/([^/]+)$/);
  if (channelCategoryDeleteMatch && init?.method === 'DELETE') {
    const category = masterData.channelCategories.find((item) => item.id === channelCategoryDeleteMatch[1]);
    if (!category) return jsonResponse({ message: '类别不存在' }, 404);
    if (masterData.channels.some((channel) => channel.category === category.name)) {
      return jsonResponse({ message: '该渠道类别已被公司渠道引用，不能删除' }, 400);
    }
    masterData.channelCategories = masterData.channelCategories.filter((item) => item.id !== category.id);
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
    const role = actorRole();
    const rows = employeeShipments.filter((shipment) => (shipment.status === 'DRAFT' || shipment.status === 'REVIEW_PENDING') && !shipment.deletedAt);
    return jsonResponse(role.includes('OPERATOR') || role.includes('UG_BUSINESS')
      ? rows.filter((shipment) => shipment.entryBy === 'operator' || shipment.salesperson === 'operator')
      : rows);
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

  const reviewApproveMatch = url.match(/\/api\/shipments\/([^/]+)\/review\/approve$/);
  if (reviewApproveMatch && init?.method === 'POST') {
    const shipment = employeeShipments.find((item) => item.id === reviewApproveMatch[1]);
    if (!shipment) return jsonResponse({ message: '运单不存在' }, 404);
    const role = actorRole();
    const actor = actorUsername();
    if (role.includes('OPERATOR') || role.includes('UG_BUSINESS') || (role === 'ADMIN' && body?.businessReview === true)) {
      shipment.status = 'WAITING_SORT';
      shipment.businessReviewedBy = actor;
      shipment.businessReviewedAt = '2026-06-25T10:30:00.000Z';
      shipment.latestTracking = '业务员自审通过，进入待排货';
    } else {
      if (role === 'FINANCE' || role === 'UG_FINANCE') return jsonResponse({ message: '待审核运单不再支持财务终审，请在业务成本审核处理' }, 403);
      return jsonResponse({ message: '当前角色不能终审运单' }, 403);
    }
    return jsonResponse({ shipment, packages: [], finance: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, receivables: [], payables: [], businessCosts: [], receivableTotal: 0, payableTotal: 0 }, events: [], internalTrackingEvents: [], logisticsTrackingEvents: [], problemTickets: [], files: [], approvalWarnings: [], overdue: false });
  }

  const reviewBasicMatch = url.match(/\/api\/shipments\/([^/]+)\/review-basic$/);
  if (reviewBasicMatch && init?.method === 'PUT') {
    const shipment = employeeShipments.find((item) => item.id === reviewBasicMatch[1]);
    if (!shipment) return jsonResponse({ message: '运单不存在' }, 404);
    Object.assign(shipment, {
      customerCode: body.customerCode,
      customerOrderNo: body.customerOrderNo,
      channelName: body.companyChannelName,
      inboundNo: body.inboundNo || undefined,
      productName: body.productName,
      destinationCountry: body.destinationCountry,
      declarationRequired: body.declarationRequired,
      cargoType: body.cargoType,
      subOrderNo: body.subOrderNo || undefined,
      fbaInboundNo: body.fbaInboundNo || undefined,
      settlementMethod: body.settlementMethod,
      remark: body.remark || undefined,
      receiverName: body.receiverName || undefined,
      receiverCompany: body.receiverCompany || undefined,
      receiverPhone: body.receiverPhone || undefined,
      receiverAddress: body.receiverAddress || undefined,
      receiverCountry: body.receiverCountry || undefined,
      receiverState: body.receiverState || undefined,
      receiverPostalCode: body.receiverPostalCode || undefined,
      fbaWarehouseCode: body.fbaWarehouseCode || undefined,
      latestTracking: '待审核资料已修改'
    });
    return jsonResponse({ shipment, packages: [], finance: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, receivables: [], payables: [], businessCosts: [], receivableTotal: 0, payableTotal: 0 }, events: [], internalTrackingEvents: [], logisticsTrackingEvents: [], problemTickets: [], files: [], approvalWarnings: [], overdue: false });
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
    return jsonResponse({ shipment, packages: [], finance: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, receivables: [], payables: [], businessCosts: [], receivableTotal: 0, payableTotal: 0 }, events: [], internalTrackingEvents: [], logisticsTrackingEvents: [], problemTickets: [], files: [], approvalWarnings: [], overdue: false });
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
    return jsonResponse({ shipment, packages: [], finance: { shipmentId: shipment.id, systemOrderNo: shipment.systemOrderNo, receivables: [], payables: [], businessCosts: [], receivableTotal: 0, payableTotal: 0 }, events: [], internalTrackingEvents: [], logisticsTrackingEvents: [], problemTickets: [], files: [], approvalWarnings: [], overdue: false });
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
      internalTrackingEvents: [{ id: 'review-internal-1', type: 'STATUS', title: '提交审核', stage: '待审核', sourceModule: '业务录单', action: '提交审核', note: '财务录单创建，待审核', createdAt: shipment.createdAt, operator: shipment.entryBy }],
      logisticsTrackingEvents: [],
      problemTickets: [],
      files: [],
      approvalWarnings: shipment.productName ? [] : ['产品名称缺失'],
      overdue: false
    };
    return jsonResponse(detail);
  }

  if (url.endsWith('/api/customer-service/transfer-shipments')) {
    const approved = (shipmentId: string, kind: 'business' | 'agent') => auditLogs
      .filter((row) => row.target === shipmentId && [`customer_service.${kind}_data.approved`, `customer_service.${kind}_data.reversed`].includes(row.action))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0]?.action === `customer_service.${kind}_data.approved`;
    return jsonResponse(employeeShipments.filter((shipment) => shipment.status === 'OUTBOUNDED' && approved(shipment.id, 'business') && approved(shipment.id, 'agent')));
  }

  if (url.endsWith('/api/shipments')) {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    return jsonResponse(token.includes('CUSTOMER') ? customerShipments : employeeShipments);
  }

  if (url.includes('/api/operations/line-shipments')) {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const rows = token.includes('CUSTOMER') ? customerShipments : employeeShipments;
    const query = Object.fromEntries(new URL(url, 'http://test.local').searchParams.entries());
    const businessDataApprovedShipmentIds = auditLogs
      .filter((row) => row.action === 'customer_service.business_data.approved')
      .map((row) => row.target);
    const afterSaleShipmentIds = auditLogs
      .filter((row) => {
        if (row.action !== 'customer_service.issue.attach') return false;
        const after = row.after as Record<string, unknown> | null;
        return after?.originalStatusPool === 'SIGNED' && typeof after.shipmentId === 'string';
      })
      .map((row) => (row.after as Record<string, string>).shipmentId);
    return jsonResponse(summarizeLineShipmentPool(rows, { ...query, datePreset: 'ALL' }, { businessDataApprovedShipmentIds, afterSaleShipmentIds }));
  }

  const dataApproveMatch = url.match(/\/api\/shipments\/([^/]+)\/(business-data|agent-data)\/approve$/);
  const allDataApproveMatch = url.match(/\/api\/shipments\/([^/]+)\/data-confirmation\/approve-all$/);
  if ((dataApproveMatch || allDataApproveMatch) && init?.method === 'POST') {
    const shipmentId = dataApproveMatch?.[1] ?? allDataApproveMatch?.[1];
    const shipment = employeeShipments.find((item) => item.id === shipmentId);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    const actor = actorUsername();
    const now = new Date().toISOString();
    const reviewKinds = allDataApproveMatch ? ['business', 'agent'] as const : [dataApproveMatch![2] === 'business-data' ? 'business' : 'agent'] as const;
    for (const kind of reviewKinds) {
      auditLogs.unshift({
        id: `audit-${kind}-data-${auditLogs.length + 1}`,
        actorId: `u-${actor}`,
        actorUsername: actor,
        action: `customer_service.${kind}_data.approved`,
        actionLabel: `${kind === 'business' ? '业务' : '代理'}数据审核通过`,
        module: 'customer_service',
        moduleLabel: '客服管理',
        target: shipment.id,
        result: 'SUCCESS',
        resultLabel: '成功',
        before: { status: shipment.status, [`${kind}DataReviewStatus`]: 'PENDING' },
        after: {
          status: shipment.status,
          statusFrom: shipment.status,
          statusTo: shipment.status,
          [`${kind}DataReviewStatus`]: 'APPROVED',
          reviewer: actor,
          reviewedBy: actor,
          reviewedAt: now,
          differenceFeedback: body.remark?.trim() || undefined,
          remark: body.remark?.trim() || undefined,
          customerCode: shipment.customerCode,
          systemOrderNo: shipment.systemOrderNo,
          destinationCountry: shipment.destinationCountry,
          packageCount: shipment.packageCount,
          chargeableWeightKg: kind === 'business' ? shipment.receivableWeightKg : shipment.agentWeightKg,
          declarationRequired: shipment.declarationRequired,
          sensitive: shipment.sensitive,
          customerServiceReceiveStatus: `${kind.toUpperCase()}_DATA_APPROVED`
        },
        createdAt: now
      });
    }
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
    const nextStatus = body.status ?? shipment.status;
    const channel = body.channelId ? masterData.channels.find((item) => item.id === body.channelId) : undefined;
    Object.assign(shipment, {
      latestTracking: body.latestTracking ?? shipment.latestTracking,
      transferNo: body.transferNo !== undefined ? body.transferNo || undefined : shipment.transferNo,
      subOrderNo: body.subOrderNo !== undefined ? body.subOrderNo || undefined : shipment.subOrderNo,
      channelName: channel?.name ?? shipment.channelName,
      carrier: channel?.carrierName ?? shipment.carrier,
      customerOrderNo: body.customerOrderNo ?? shipment.customerOrderNo,
      productName: body.productName ?? shipment.productName,
      destinationCountry: body.destinationCountry ?? shipment.destinationCountry,
      cargoType: body.cargoType ?? shipment.cargoType,
      settlementMethod: body.settlementMethod ?? shipment.settlementMethod,
      packageCount: body.packageCount ?? shipment.packageCount,
      receivableWeightKg: body.receivableWeightKg ?? shipment.receivableWeightKg,
      agentWeightKg: body.agentWeightKg ?? body.receivableWeightKg ?? shipment.agentWeightKg,
      volumeCbm: body.volumeCbm ?? shipment.volumeCbm,
      declarationRequired: body.declarationRequired ?? shipment.declarationRequired,
      sensitive: body.sensitive ?? shipment.sensitive,
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
    const latestByShipmentId = new Map<string, { latestTracking: string; trackingDate: string | number }>();
    (body.updates ?? []).forEach((item: { shipmentId: string; latestTracking: string; trackingDate: string | number }) => {
      const current = latestByShipmentId.get(item.shipmentId);
      if (!current || Number(new Date(String(item.trackingDate).replace(/\//g, '-')).getTime()) >= Number(new Date(String(current.trackingDate).replace(/\//g, '-')).getTime())) {
        latestByShipmentId.set(item.shipmentId, item);
      }
    });
    const updated = [...latestByShipmentId.entries()].map(([shipmentId, item]) => {
      const shipment = employeeShipments.find((current) => current.id === shipmentId);
      if (!shipment) {
        return undefined;
      }
      Object.assign(shipment, { latestTracking: item.latestTracking, latestTrackingUpdatedAt: new Date(String(item.trackingDate).replace(/\//g, '-')).toISOString(), trackingStaleDays: 0 });
      return shipment;
    }).filter(Boolean);
    return jsonResponse({
      updated,
      importedCount: updated.length,
      importedRowCount: body.updates?.length ?? 0,
      failedRowCount: body.failedRowCount ?? 0,
      unmatchedCount: body.unmatchedOrderNos?.length ?? 0,
      affectedShipmentCount: updated.length
    });
  }

  if (url.endsWith('/api/problem-tickets')) {
    return jsonResponse(problemTickets);
  }

  if (new URL(url, 'http://test.local').pathname.endsWith('/api/pricing/books/import-jobs') && init?.method === 'POST') {
    const file = body.file as File | undefined;
    const targetModule = body.targetModule as PriceBookImportJobSummary['targetModule'] | undefined;
    if (!file) {
      return jsonResponse({ message: '请选择价格表文件' }, 400);
    }
    if (!targetModule) {
      return jsonResponse({ message: '请选择本次导入适用的查价模块' }, 400);
    }
    const boundAgent = resolveTestEnabledPriceBookAgent(body);
    if (!boundAgent) {
      return jsonResponse({ message: '请选择所属代理' }, 400);
    }
    const priceBookId = `pb-${importedPriceBooks.length + 1}`;
    const isTopda = file.name.includes('拓普达');
    const isZhenyun = file.name.includes('振韵');
    const isEuropeExpress = file.name.includes('欧洲快递');
    const agentName = boundAgent.shortName;
    const channelName = isTopda ? '拓普达美线' : isZhenyun ? '欧洲空派快递派' : `${agentName}渠道`;
    const destinationCountry = isZhenyun ? '法国' : '美国';
    const rows: PriceBookRowSummary[] = isEuropeExpress ? [
      {
        id: `pbr-${importedPriceRows.length + 1}`,
        priceBookId,
        agentName,
        carrierName: '专线',
        sourceSheetName: '欧洲空海运铁路快递',
        channelName: '欧洲快递高价',
        realChannelName: '欧洲快递高价',
        destinationCountry: '法国',
        minWeightKg: 0,
        maxWeightKg: 10,
        costPerKg: 30,
        currency: 'RMB',
        quoteSourceType: 'local'
      },
      {
        id: `pbr-${importedPriceRows.length + 2}`,
        priceBookId,
        agentName,
        carrierName: '专线',
        sourceSheetName: '欧洲空海运铁路快递',
        channelName: '欧洲快递低价',
        realChannelName: '欧洲快递低价',
        destinationCountry: '法国',
        minWeightKg: 50,
        maxWeightKg: 100,
        costPerKg: 20,
        currency: 'RMB',
        quoteSourceType: 'local'
      }
    ] : [{
      id: `pbr-${importedPriceRows.length + 1}`,
      priceBookId,
      agentName,
      carrierName: '专线',
      sourceSheetName: '价格表',
      channelName,
      realChannelName: channelName,
      destinationCountry,
      minWeightKg: 0,
      maxWeightKg: 1000,
      costPerKg: isZhenyun ? 26.5 : 18,
      currency: 'RMB',
      quoteSourceType: 'local'
    }];
    const book: PriceBookSummary = {
      id: priceBookId,
      fileName: file.name,
      agentId: boundAgent.id,
      agentShortName: boundAgent.shortName,
      rowCount: rows.length,
      importedAt: '2026-06-07T13:06:11.000Z',
      legacyModuleCounts: { [targetModule]: rows.length }
    };
    importedPriceBooks.unshift(book);
    importedPriceRows.unshift(...rows);
    priceBookSourceFiles.set(priceBookId, file);
    const now = '2026-06-07T13:06:12.000Z';
    const job: PriceBookImportJobSummary = {
      id: `pb-job-${priceBookImportJobs.length + 1}`,
      fileName: file.name,
      targetModule,
      agentId: boundAgent.id,
      agentShortName: boundAgent.shortName,
      status: 'SUCCESS',
      processedRows: rows.length,
      totalRows: rows.length,
      failedRows: 0,
      message: `导入完成：${rows.length} 行`,
      book,
      createdAt: now,
      updatedAt: now,
      completedAt: now
    };
    priceBookImportJobs.unshift(job);
    return jsonResponse({ job });
  }

  const priceBookImportJobMatch = url.match(/\/api\/pricing\/books\/import-jobs\/([^/?]+)$/);
  if (priceBookImportJobMatch && init?.method !== 'POST') {
    const job = priceBookImportJobs.find((item) => item.id === priceBookImportJobMatch[1]);
    return job ? jsonResponse({ job }) : jsonResponse({ message: '价格表导入任务不存在' }, 404);
  }

  if (new URL(url, 'http://test.local').pathname.endsWith('/api/pricing/books/import') && init?.method === 'POST') {
    if (!body.targetModule) {
      return jsonResponse({ message: '请选择本次导入适用的查价模块' }, 400);
    }
    const boundAgent = resolveTestEnabledPriceBookAgent(body);
    if (!boundAgent) {
      return jsonResponse({ message: '请选择所属代理' }, 400);
    }
    const rows: PriceBookRowSummary[] = body.rows.map((row: Omit<PriceBookRowSummary, 'id' | 'priceBookId'>, index: number) => ({
      ...row,
      id: `pbr-${importedPriceRows.length + index + 1}`,
      priceBookId: `pb-${importedPriceBooks.length + 1}`,
      agentName: boundAgent.shortName,
      realChannelName: row.realChannelName ?? row.channelName,
      quoteSourceType: row.quoteSourceType ?? 'local'
    }));
    const book: PriceBookSummary = {
      id: `pb-${importedPriceBooks.length + 1}`,
      fileName: body.fileName,
      agentId: boundAgent.id,
      agentShortName: boundAgent.shortName,
      rowCount: body.rows.length,
      importedAt: '2026-06-07T13:06:11.000Z',
      legacyModuleCounts: { [body.targetModule]: rows.length }
    };
    importedPriceBooks.unshift(book);
    importedPriceRows.unshift(...rows);
    const returnRows = new URL(url, 'http://test.local').searchParams.get('returnRows') !== 'false';
    return jsonResponse({ book, rowCount: rows.length, legacyModuleCounts: book.legacyModuleCounts, rows: returnRows ? rows : [] });
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

  if (url.includes('/api/pricing/books?') || url.endsWith('/api/pricing/books')) {
    const includeRows = new URL(url, 'http://test.local').searchParams.get('includeRows') === 'true';
    return jsonResponse({ books: importedPriceBooks, rows: includeRows ? importedPriceRows.slice(0, 200) : [] });
  }

  const priceBookDownloadMatch = url.match(/\/api\/pricing\/books\/([^/]+)\/download$/);
  if (priceBookDownloadMatch) {
    const file = priceBookSourceFiles.get(priceBookDownloadMatch[1]);
    if (!file) return jsonResponse({ message: '原始价格表文件不可用，无法下载' }, 400);
    return new Response(file, {
      headers: {
        'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="price-book.xlsx"; filename*=UTF-8''${encodeURIComponent(file.name)}`
      }
    });
  }

  const priceBookRowsMatch = url.match(/\/api\/pricing\/books\/([^/]+)\/rows/);
  if (priceBookRowsMatch || url.includes('/api/pricing/book-rows')) {
    const requestUrl = new URL(url, 'http://test.local');
    const page = Math.max(1, Number(requestUrl.searchParams.get('page') ?? 1));
    const pageSize = Math.max(1, Number(requestUrl.searchParams.get('pageSize') ?? 100));
    const agentName = requestUrl.searchParams.get('agentName') ?? '';
    const channelName = requestUrl.searchParams.get('channelName') ?? '';
    const sourceSheetName = requestUrl.searchParams.get('sourceSheetName') ?? '';
    const filtered = importedPriceRows
      .filter((row) => !priceBookRowsMatch || row.priceBookId === priceBookRowsMatch[1])
      .filter((row) => !agentName || row.agentName.includes(agentName))
      .filter((row) => !channelName || row.channelName.includes(channelName))
      .filter((row) => !sourceSheetName || (row.sourceSheetName ?? row.channelName).includes(sourceSheetName));
    return jsonResponse({
      rows: filtered.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, totalItems: filtered.length }
    });
  }

  if (url.includes('/api/pricing/sync-health')) {
    const requestUrl = new URL(url, 'http://test.local');
    const page = Math.max(1, Number(requestUrl.searchParams.get('page') ?? 1));
    const pageSize = Math.max(1, Number(requestUrl.searchParams.get('pageSize') ?? 50));
    const bookById = new Map(importedPriceBooks.map((book) => [book.id, book]));
    const groups = new Map<string, { id: string; fileName: string; agentName: string; lineCount: number; sheetNames: Set<string>; countries: Set<string>; markupRule?: AgentMarkupSummary; status: 'synced' | 'default' | 'disabled' | 'missing' }>();
    importedPriceRows.forEach((row) => {
      const book = bookById.get(row.priceBookId);
      if (!book) return;
      const key = `${row.priceBookId}\u0001${row.agentName}`;
      const rule = agentMarkupRules.find((item) => !item.deletedAt && item.agentName === row.agentName && !item.channelName && !item.realChannelName && !item.destinationCountry);
      const current = groups.get(key) ?? {
        id: key,
        fileName: book.fileName,
        agentName: row.agentName,
        lineCount: 0,
        sheetNames: new Set<string>(),
        countries: new Set<string>(),
        markupRule: rule ?? { id: `price-agent:${row.agentName}`, agentName: row.agentName, markupPerKg: 0.5, markupType: 'WEIGHT', markupValue: 0.5, enabled: true },
        status: rule ? (rule.enabled ? 'synced' : 'disabled') : 'default'
      };
      current.lineCount += 1;
      if (row.sourceSheetName) current.sheetNames.add(row.sourceSheetName);
      current.countries.add(row.destinationCountry);
      groups.set(key, current);
    });
    const rows = Array.from(groups.values()).map((row) => ({
      id: row.id,
      fileName: row.fileName,
      agentName: row.agentName,
      lineCount: row.lineCount,
      sheetCount: row.sheetNames.size,
      countryCount: row.countries.size,
      markupRule: row.markupRule,
      status: row.status
    }));
    const activeAgents = new Set(rows.map((row) => row.agentName));
    return jsonResponse({
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      orphanRules: agentMarkupRules.filter((rule) => !rule.deletedAt && !rule.channelName && !rule.realChannelName && !rule.destinationCountry && !activeAgents.has(rule.agentName)),
      stats: {
        sources: new Set(rows.map((row) => row.fileName)).size,
        agents: activeAgents.size,
        lines: rows.reduce((sum, row) => sum + row.lineCount, 0),
        activeAgents: rows.filter((row) => row.markupRule?.enabled).length
      },
      pagination: { page, pageSize, totalItems: rows.length }
    });
  }

  const routePreviewPath = '/api/pricing/markup-rules/route-preview';
  const routeTiersPath = '/api/pricing/markup-rules/route-tiers';
  const buildRoutePreview = (input: any) => {
    const realChannelName = input.realChannelName || input.channelName;
    const routeRows = importedPriceRows.filter((row) => row.priceBookId === input.priceBookId
      && row.channelName === input.channelName
      && (row.realChannelName ?? row.channelName) === realChannelName
      && row.destinationCountry === input.destinationCountry
      && (input.markupUnit === 'CBM' ? Number(row.cbmPrice ?? 0) > 0 : Number(row.cbmPrice ?? 0) <= 0));
    if (!routeRows.length) return jsonResponse({ message: '当前价格表未找到该真实线路' }, 404);
    const chargeableValue = Number(input.chargeableValue ?? 0);
    const selected = routeRows.find((row) => chargeableValue >= row.minWeightKg && chargeableValue < row.maxWeightKg) ?? routeRows[0];
    const tier = agentMarkupRules.filter((rule) => !rule.deletedAt && rule.enabled && rule.priceBookId === input.priceBookId
      && rule.agentName === input.agentName && rule.channelName === input.channelName
      && (rule.realChannelName ?? rule.channelName) === realChannelName && rule.destinationCountry === input.destinationCountry
      && rule.markupUnit === input.markupUnit && chargeableValue >= Number(rule.minChargeableValue ?? 0)
      && (rule.maxChargeableValue === undefined || chargeableValue < Number(rule.maxChargeableValue)))
      .sort((left, right) => Number(left.minChargeableValue ?? 0) - Number(right.minChargeableValue ?? 0))[0];
    const unitPrice = input.markupUnit === 'CBM' ? Number(selected.cbmPrice ?? 0) : Number(selected.costPerKg);
    const configuredValue = Number(tier?.markupValue ?? tier?.markupPerKg ?? 0.5);
    const totalMarkup = configuredValue * chargeableValue;
    return jsonResponse({
      route: { ...input, realChannelName, sourceSheets: Array.from(new Set(routeRows.map((row) => row.sourceSheetName).filter(Boolean))) },
      rows: routeRows,
      rules: agentMarkupRules.filter((rule) => !rule.deletedAt && rule.enabled && rule.priceBookId === input.priceBookId && rule.agentName === input.agentName && rule.channelName === input.channelName && (rule.realChannelName ?? rule.channelName) === realChannelName && rule.destinationCountry === input.destinationCountry && rule.markupUnit === input.markupUnit),
      selectedCostRowId: selected.id,
      calculation: {
        chargeable: { unit: input.markupUnit, value: chargeableValue },
        cost: { priceBookId: selected.priceBookId, sourceSheetName: selected.sourceSheetName, weightSegmentLabel: `${selected.minWeightKg}-${selected.maxWeightKg}${input.markupUnit}`, unitPrice },
        markup: { source: tier ? 'LINE_TIER' : 'VIRTUAL_DEFAULT', ruleId: tier?.id, rangeLabel: tier ? `${tier.minChargeableValue}-${tier.maxChargeableValue ?? '不限'}${input.markupUnit}` : undefined, type: 'WEIGHT', configuredValue, effectiveUnitMarkup: configuredValue, totalMarkup },
        sale: { unitPrice: unitPrice + configuredValue, totalPrice: (unitPrice + configuredValue) * chargeableValue }
      }
    });
  };
  if (url.endsWith(routePreviewPath) && init?.method === 'POST') return buildRoutePreview(body);
  if (url.endsWith(routeTiersPath) && init?.method === 'POST') {
    const realChannelName = body.realChannelName || body.channelName;
    for (let index = agentMarkupRules.length - 1; index >= 0; index -= 1) {
      const rule = agentMarkupRules[index];
      if (rule.priceBookId === body.priceBookId && rule.agentName === body.agentName && rule.channelName === body.channelName
        && (rule.realChannelName ?? rule.channelName) === realChannelName && rule.destinationCountry === body.destinationCountry && rule.markupUnit === body.markupUnit) agentMarkupRules.splice(index, 1);
    }
    (body.tiers ?? []).forEach((tier: any, index: number) => agentMarkupRules.unshift({ id: `markup-route-${Date.now()}-${index}`, priceBookId: body.priceBookId, agentName: body.agentName, channelName: body.channelName, realChannelName: realChannelName === body.channelName ? undefined : realChannelName, destinationCountry: body.destinationCountry, markupType: 'WEIGHT', markupValue: Number(tier.markupValue), markupPerKg: Number(tier.markupValue), markupUnit: body.markupUnit, minChargeableValue: Number(tier.minChargeableValue), maxChargeableValue: tier.maxChargeableValue, priority: 10, enabled: true }));
    return buildRoutePreview(body);
  }
  if (url.endsWith('/api/pricing/markup-rules/migrate-pricebook-scopes') && init?.method === 'POST') return jsonResponse({ migratedCount: 0, archivedCount: 0, skippedCount: 0 });

  if (url.endsWith('/api/pricing/markup-rules/batch-upsert') && init?.method === 'POST') {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const savedRows = rows.map((row: any) => {
      const priority = row.priority ?? 100;
      const existing = agentMarkupRules.find((item) =>
        item.agentName === row.agentName &&
        (item.channelName ?? '') === (row.channelName ?? '') &&
        (item.realChannelName ?? '') === (row.realChannelName ?? '') &&
        (item.destinationCountry ?? '') === (row.destinationCountry ?? '') &&
        (item.priority ?? 100) === priority
      );
      if (existing) {
        Object.assign(existing, {
          agentName: row.agentName,
          channelName: row.channelName,
          realChannelName: row.realChannelName,
          destinationCountry: row.destinationCountry,
          markupType: row.markupType ?? 'WEIGHT',
          markupValue: row.markupValue ?? row.markupPerKg,
          markupPerKg: row.markupPerKg,
          priority,
          enabled: row.enabled !== false
        });
        return { ...existing };
      }
      const rule: AgentMarkupSummary = {
        id: `markup-${agentMarkupRules.length + 1}`,
        agentName: row.agentName,
        channelName: row.channelName,
        realChannelName: row.realChannelName,
        destinationCountry: row.destinationCountry,
        markupType: row.markupType ?? 'WEIGHT',
        markupValue: row.markupValue ?? row.markupPerKg,
        markupPerKg: row.markupPerKg,
        priority,
        enabled: row.enabled !== false
      };
      agentMarkupRules.unshift(rule);
      return { ...rule };
    });
    return jsonResponse({ successCount: savedRows.length, errorRows: [], rows: savedRows });
  }

  if (url.endsWith('/api/pricing/markup-rules/batch-status') && init?.method === 'POST') {
    const ids = new Set(Array.isArray(body?.ids) ? body.ids : []);
    const agentNames = new Set(Array.isArray(body?.agentNames) ? body.agentNames : []);
    const rows = agentMarkupRules.filter((rule) => !rule.deletedAt && (ids.has(rule.id) || agentNames.has(rule.agentName)));
    rows.forEach((rule) => {
      rule.enabled = body.enabled === true;
    });
    return jsonResponse({ successCount: rows.length, rows });
  }

  if (url.endsWith('/api/pricing/markup-rules/batch-delete') && init?.method === 'POST') {
    const ids = new Set(Array.isArray(body?.ids) ? body.ids : []);
    const agentNames = new Set(Array.isArray(body?.agentNames) ? body.agentNames : []);
    const rows = agentMarkupRules.filter((rule) => !rule.deletedAt && (ids.has(rule.id) || agentNames.has(rule.agentName)));
    rows.forEach((rule) => {
      rule.enabled = false;
      rule.deletedAt = '2026-07-07T00:00:00.000Z';
    });
    return jsonResponse({ successCount: rows.length, rows });
  }

  if (url.endsWith('/api/pricing/markup-rules') && init?.method === 'POST') {
    const rule: AgentMarkupSummary = {
      id: `markup-${agentMarkupRules.length + 1}`,
      agentName: body.agentName,
      channelName: body.channelName,
      realChannelName: body.realChannelName,
      destinationCountry: body.destinationCountry,
      markupType: body.markupType ?? 'WEIGHT',
      markupValue: body.markupValue ?? body.markupPerKg,
      markupPerKg: body.markupPerKg,
      priority: body.priority ?? 100,
      enabled: body.enabled !== false
    };
    agentMarkupRules.unshift(rule);
    return jsonResponse(rule);
  }

  const markupPreviewMatch = url.match(/\/api\/pricing\/markup-rules\/([^/]+)\/preview$/);
  if (markupPreviewMatch) {
    const rule = agentMarkupRules.find((item) => item.id === markupPreviewMatch[1]);
    if (!rule) {
      return jsonResponse({ message: '加价规则不存在' }, 404);
    }
    const rows = [...importedPriceRows, ...backendSeedPriceRows].filter((row) =>
      row.agentName === rule.agentName &&
      (!rule.channelName || row.channelName === rule.channelName) &&
      (!rule.realChannelName || (row.realChannelName ?? row.channelName) === rule.realChannelName) &&
      (!rule.destinationCountry || row.destinationCountry === rule.destinationCountry)
    );
    return jsonResponse({
      rule: { ...rule, hitCount: rows.length },
      scope: {
        channelLabel: rule.channelName ?? '全部渠道',
        realChannelLabel: rule.realChannelName ?? '全部线路',
        countryLabel: rule.destinationCountry ?? '全部国家'
      },
      stats: {
        priceBookRows: rows.length,
        channels: new Set(rows.map((row) => row.channelName)).size,
        countries: new Set(rows.map((row) => row.destinationCountry)).size
      },
      examples: rows.map((row) => ({
        id: row.id,
        channelName: row.channelName,
        realChannelName: row.realChannelName,
        destinationCountry: row.destinationCountry,
        weightSegmentLabel: `${row.minWeightKg}-${row.maxWeightKg}kg`
      })),
      recentChanges: []
    });
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

  if (url.includes('/api/pricing/markup-rules?') || url.endsWith('/api/pricing/markup-rules')) {
    const parsedUrl = new URL(url, 'http://localhost');
    const detail = parsedUrl.searchParams.get('detail') === 'true';
    const status = parsedUrl.searchParams.get('status') ?? 'ALL';
    const agentName = parsedUrl.searchParams.get('agentName') ?? '';
    const syncedAgentMarkupRules = [...agentMarkupRules];
    const agentsWithRule = new Set(syncedAgentMarkupRules.filter((rule) => !rule.deletedAt).map((rule) => rule.agentName));
    Array.from(new Set(importedPriceRows.map((row) => row.agentName))).forEach((priceAgentName) => {
      if (!priceAgentName || agentsWithRule.has(priceAgentName)) {
        return;
      }
      syncedAgentMarkupRules.push({
        id: `price-agent:${priceAgentName}`,
        agentName: priceAgentName,
        markupPerKg: 0.5,
        markupType: 'WEIGHT',
        markupValue: 0.5,
        priority: 100,
        enabled: true
      });
      agentsWithRule.add(priceAgentName);
    });
    const visibleRules = syncedAgentMarkupRules
      .filter((rule) => !rule.deletedAt)
      .filter((rule) => !agentName || rule.agentName.includes(agentName))
      .filter((rule) => status === 'ENABLED' ? rule.enabled : status === 'DISABLED' ? !rule.enabled : true);
    const groupedRules = Array.from(
      visibleRules.reduce((groups, rule) => {
        const rows = groups.get(rule.agentName) ?? [];
        rows.push(rule);
        groups.set(rule.agentName, rows);
        return groups;
      }, new Map<string, AgentMarkupSummary[]>())
    ).map(([name, rules]) => {
      const primary = [...rules].sort((left, right) =>
        [left.channelName, left.realChannelName, left.destinationCountry].filter(Boolean).length -
        [right.channelName, right.realChannelName, right.destinationCountry].filter(Boolean).length ||
        (left.priority ?? 100) - (right.priority ?? 100)
      )[0];
      const hitIds = new Set(
        [...importedPriceRows, ...backendSeedPriceRows]
          .filter((row) => row.agentName === name)
          .map((row) => row.id)
      );
      return {
        ...primary,
        id: `agent:${name}`,
        agentName: name,
        channelName: undefined,
        realChannelName: undefined,
        destinationCountry: undefined,
        enabled: rules.some((rule) => rule.enabled),
        ruleCount: rules.length,
        hitCount: hitIds.size
      };
    });
    const rows = detail ? visibleRules : groupedRules;
    return jsonResponse({
      metrics: {
        totalRules: syncedAgentMarkupRules.length,
        enabledRules: syncedAgentMarkupRules.filter((rule) => rule.enabled).length,
        disabledRules: syncedAgentMarkupRules.filter((rule) => !rule.enabled).length,
        unmatchedQuotes: 0
      },
      rows,
      pagination: {
        page: 1,
        pageSize: rows.length,
        totalItems: rows.length
      }
    });
  }

  if (url.endsWith('/api/pricing/legacy/quote-meta')) {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const canViewInternalPricing = testCanViewPricingInternalRoute(token);
    const rows = [...importedPriceRows, ...backendSeedPriceRows];
    const amazonRows = rows.filter((row) => row.warehouseCode || /亚马逊|amazon|fba/i.test(`${row.sourceSheetName ?? ''} ${row.channelName}`));
    return jsonResponse({
      modules: [
        { key: 'amazon', label: '亚马逊查询', rowCount: rows.filter((row) => row.warehouseCode).length, sourceCount: importedPriceBooks.length },
        { key: 'inquiry', label: '欧洲海运超大件查询', rowCount: rows.length, sourceCount: importedPriceBooks.length },
        { key: 'europeExpress', label: '欧洲空海运铁路快递查询', rowCount: rows.length, sourceCount: importedPriceBooks.length },
        { key: 'southAfrica', label: '南非专线查询', rowCount: rows.filter((row) => row.destinationCountry === '南非').length, sourceCount: importedPriceBooks.length }
      ],
      agents: canViewInternalPricing ? [...new Set(rows.map((row) => row.agentName))] : [],
      origins: testUniqueAmazonOriginWarehouseNames(amazonRows.map((row) => row.sourceSheetName)),
      warehouseCodes: [...new Set(rows.map((row) => row.warehouseCode).filter(Boolean))],
      tiers: ['12KG+', '51KG+', '100KG+']
    });
  }

  if (url.match(/\/api\/pricing\/legacy\/(amazon|inquiry|europe-express|south-africa)\/quote$/) && init?.method === 'POST') {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const canViewInternalPricing = testCanViewPricingInternalRoute(token);
    const chargeableWeightKg = Number(body.chargeableWeightKg);
    const moduleKey: LegacyPricingModule = url.includes('/europe-express/') ? 'europeExpress' : url.includes('/south-africa/') ? 'southAfrica' : url.includes('/inquiry/') ? 'inquiry' : 'amazon';
    const unitPreview = moduleKey === 'europeExpress' && (!Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0);
    const warehouseCode = String(body.amazonCode ?? '').trim().toUpperCase();
    const requestedWeightBand = moduleKey === 'amazon' ? testNormalizeAmazonWeightBand(body.weightBand ?? body.tier) : undefined;
    const requestedOrigin = moduleKey === 'amazon' ? testNormalizeAmazonOriginWarehouseName(body.origin) : undefined;
    const bookRemarkMap = new Map(importedPriceBooks.map((book) => [book.id, book.remark]));
    const matchedRows = [...importedPriceRows, ...backendSeedPriceRows].filter(
      (row) =>
        (!row.warehouseCode || !warehouseCode || row.warehouseCode.toUpperCase() === warehouseCode) &&
        row.destinationCountry === body.destinationCountry &&
        (!requestedOrigin || testNormalizeAmazonOriginWarehouseName(row.sourceSheetName) === requestedOrigin) &&
        (!requestedWeightBand || testInferAmazonWeightBandFromMin(row.minWeightKg) === requestedWeightBand) &&
        (unitPreview || chargeableWeightKg >= row.minWeightKg) &&
        chargeableWeightKg <= row.maxWeightKg
    );
    const recommendations = matchedRows
      .map((row) => {
        const markup = findBestTestMarkupRule(agentMarkupRules, row) ?? createDefaultTestMarkupRule(row.agentName);
        const quoteWeightKg = unitPreview ? 1 : chargeableWeightKg;
        const salesUnitPrice = Math.round((row.costPerKg + markup.markupPerKg) * 100) / 100;
        const costTotal = Math.round(row.costPerKg * quoteWeightKg * 100) / 100;
        const salesTotal = Math.round(salesUnitPrice * quoteWeightKg * 100) / 100;
        const publicCode = testPublicPricingRouteCode(row.channelName, row.realChannelName, row.businessRouteName);
        return {
          id: row.id,
          module: moduleKey,
          ...(canViewInternalPricing ? { sourceId: row.priceBookId } : {}),
          agentName: canViewInternalPricing ? row.agentName : publicCode,
          origin: canViewInternalPricing ? row.sourceSheetName : undefined,
          channelName: canViewInternalPricing ? row.channelName : publicCode,
          serviceName: canViewInternalPricing ? row.businessRouteName : publicCode,
          warehouseCode: row.warehouseCode,
          destinationCountry: row.destinationCountry,
          weightSegmentLabel: requestedWeightBand ?? `${row.minWeightKg}-${row.maxWeightKg}kg`,
          quoteMode: 'kg',
          ...(canViewInternalPricing ? { costUnitPrice: row.costPerKg } : {}),
          salesUnitPrice,
          ...(canViewInternalPricing ? { costTotal } : {}),
          salesTotal,
          ...(canViewInternalPricing ? { grossProfit: Math.round((salesTotal - costTotal) * 100) / 100, markup } : {}),
          chargeableWeightKg: unitPreview ? 0 : chargeableWeightKg,
          transitLabel: row.transitLabel ?? '时效待确认',
          ...(row.productSurchargeRemark ? { productSurchargeRemark: row.productSurchargeRemark } : {}),
          ...(row.specialRemark ? { specialRemark: row.specialRemark } : {}),
          ...(row.priceBookId && bookRemarkMap.get(row.priceBookId) ? { remark: bookRemarkMap.get(row.priceBookId) } : {})
        };
      })
      .filter(Boolean)
      .sort((left: any, right: any) => unitPreview ? left.salesUnitPrice - right.salesUnitPrice : left.salesTotal - right.salesTotal);
    return jsonResponse({
      module: moduleKey,
      query: body,
      recommendations,
      cheapestRecommendations: [...recommendations].sort((left: any, right: any) => left.salesTotal - right.salesTotal).slice(0, 3),
      fastestRecommendations: recommendations.filter((item: any) => /\\d/.test(item.transitLabel)).slice(0, 3),
      selected: recommendations[0],
      agentErrors: [],
      metrics: {
        matchedRows: recommendations.length,
        agents: new Set(recommendations.map((row: any) => row.agentName)).size,
        channels: new Set(recommendations.map((row: any) => row.channelName)).size,
        sources: new Set(recommendations.map((row: any) => row.sourceId).filter(Boolean)).size
      }
    });
  }

  if (url.endsWith('/api/pricing/lookup') && init?.method === 'POST') {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const canViewInternalPricing = testCanViewPricingInternalRoute(token);
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
        const publicCode = testPublicPricingRouteCode(row.channelName, row.realChannelName, row.businessRouteName);
        const visiblePrice: Omit<PriceBookRowSummary, 'costPerKg'> & { costPerKg?: number } = { ...row };
        if (!canViewInternalPricing) {
          visiblePrice.priceBookId = '';
          visiblePrice.costPerKg = undefined;
          visiblePrice.agentName = publicCode;
          visiblePrice.channelName = publicCode;
          visiblePrice.realChannelName = publicCode;
          visiblePrice.businessRouteName = publicCode;
          visiblePrice.sourceSheetName = undefined;
          visiblePrice.lineMarkupPerKg = undefined;
          visiblePrice.markupSource = undefined;
        }
        return {
          price: visiblePrice,
          ...(canViewInternalPricing ? { markup } : {}),
          channelName: canViewInternalPricing ? row.channelName : publicCode,
          carrierName: row.carrierName ?? '专线',
          agentName: canViewInternalPricing ? row.agentName : publicCode,
          businessRouteName: canViewInternalPricing ? row.businessRouteName : publicCode,
          realChannelName: canViewInternalPricing ? row.realChannelName ?? row.channelName : publicCode,
          isRouteMapped: Boolean(row.businessRouteName),
          quoteSourceType: row.quoteSourceType ?? 'local',
          weightSegmentLabel: `${row.minWeightKg}-${row.maxWeightKg}kg`,
          salesRatePerKg,
          freightFee: totalSales,
          surchargeFee: row.surchargeFee ?? 0,
          totalFee: totalSales + (row.surchargeFee ?? 0),
          freightUnitPrice: salesRatePerKg,
          totalUnitPrice: Math.round(((totalSales + (row.surchargeFee ?? 0)) / chargeableWeightKg) * 100) / 100,
          ...(canViewInternalPricing ? { totalCost, grossProfit: Math.round((totalSales - totalCost) * 100) / 100 } : {}),
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
    const fastestRecommendations = recommendations
      .filter((item: any) => Number.isFinite(item.price.transitDays))
      .sort((left: any, right: any) => left.price.transitDays - right.price.transitDays || left.totalSales - right.totalSales)
      .slice(0, 3);
    const best = cheapestRecommendations[0] as any;
    return jsonResponse({
      price: best.price,
      ...(canViewInternalPricing ? { markup: best.markup } : {}),
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
      ...(canViewInternalPricing ? { totalCost: best.totalCost, grossProfit: best.grossProfit } : {}),
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

  if (url.includes('/api/shipments/order-entry/packages')) {
    const requestUrl = new URL(url, 'http://localhost');
    const customerCode = requestUrl.searchParams.get('customerCode')?.trim();
    const domesticTrackingNo = requestUrl.searchParams.get('domesticTrackingNo')?.trim().toLowerCase();
    const packageIds = Array.from(new Set(requestUrl.searchParams.getAll('packageIds').flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean)));
    const customer = customerCode ? masterData.customers.find((item) => item.code === customerCode) : undefined;
    const role = actorRole();
    if (!customerCode && !packageIds.length) {
      return jsonResponse([]);
    }
    if (customerCode && !customer) {
      return jsonResponse([]);
    }
    if (customer && (role.includes('OPERATOR') || role.includes('UG_BUSINESS')) && customer.salesperson !== actorUsername()) {
      return jsonResponse([]);
    }
    const draftOccupiedPackageIds = new Set(
      employeeShipments
        .flatMap((shipment) => shipment.draftWarehousePackageIds ?? [])
        .filter(Boolean)
    );
    return jsonResponse(
      withConfirmedWarehouseTally(warehousePackages
        .filter((pkg) =>
          (!customerCode || pkg.customerCode === customerCode)
          && (!packageIds.length || packageIds.includes(pkg.id))
          && !pkg.shipmentId
          && !pkg.systemOrderNo
          && pkg.measurementStatus !== 'PENDING_REMEASURE'
          && !draftOccupiedPackageIds.has(pkg.id)
          && !['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'].includes(pkg.status)
          && (!(role.includes('OPERATOR') || role.includes('UG_BUSINESS')) || masterData.customers.find((item) => item.code === pkg.customerCode)?.salesperson === actorUsername())
          && (!domesticTrackingNo || (pkg.domesticTrackingNo ?? '').toLowerCase().includes(domesticTrackingNo))
        )
        .sort((left, right) => new Date(right.scanTime ?? 0).getTime() - new Date(left.scanTime ?? 0).getTime()))
    );
  }

  if (url.endsWith('/api/shipments/order-entry/drafts')) {
    const role = actorRole();
    const username = actorUsername();
    return jsonResponse(
      employeeShipments
        .filter((shipment) => ['DRAFT', 'REVIEW_REJECTED'].includes(shipment.status))
        .filter((shipment) => !(role.includes('OPERATOR') || role.includes('UG_BUSINESS')) || shipment.entryBy === username || shipment.salesperson === username)
    );
  }

  if (url.endsWith('/api/shipments/order-entry') && init?.method === 'POST') {
    if (body.shipment?.transferNo?.trim()) {
      return jsonResponse({ message: '录单阶段不能填写转单号，请在出库后完成双审核再填写' }, 400);
    }
    const customerCode = body.shipment?.customerCode ?? '1399';
    const actor = actorUsername();
    const selectedPackages = warehousePackages.filter((pkg) => body.warehousePackageIds?.includes(pkg.id));
    const packageCount = selectedPackages.reduce((sum, pkg) => sum + pkg.packageCount, 0) || selectedPackages.length;
    const chargeWeightKg = selectedPackages.reduce((sum, pkg) => sum + pkg.chargeableWeightKg, 0);
    const created: Shipment = {
      id: `entry-${employeeShipments.length + 1}`,
      createdAt: '2026-06-25T10:00:00.000Z',
      customerName: `${customerCode}-${customerCode === '9409' ? 'Daloday' : '仓库客户'}`,
      customerCode,
      salesperson: actor,
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
      fbaWarehouseCode: body.shipment?.fbaWarehouseCode,
      receiverName: body.shipment?.receiverName,
      receiverCompany: body.shipment?.receiverCompany,
      receiverPhone: body.shipment?.receiverPhone,
      receiverAddress: body.shipment?.receiverAddress,
      receiverCountry: body.shipment?.receiverCountry,
      receiverState: body.shipment?.receiverState,
      receiverPostalCode: body.shipment?.receiverPostalCode,
      entryBy: actor,
      businessReviewedBy: undefined,
      businessReviewedAt: undefined,
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
      createdBy: actor,
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
      createdBy: actor,
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
      createdBy: actor,
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

  const orderEntryDetailMatch = url.match(/\/api\/shipments\/([^/]+)\/order-entry$/);
  if (orderEntryDetailMatch && (!init?.method || init.method === 'GET')) {
    const shipmentId = orderEntryDetailMatch[1];
    const shipment = employeeShipments.find((item) => item.id === shipmentId);
    if (!shipment) return jsonResponse({ message: '录单不存在' }, 404);
    const draftPackageIds = new Set(shipment.draftWarehousePackageIds ?? []);
    const packages = warehousePackages.filter((pkg) => pkg.shipmentId === shipment.id || draftPackageIds.has(pkg.id));
    return jsonResponse({
      shipment,
      packages,
      receivables: receivableFees.filter((fee) => fee.shipmentId === shipment.id),
      businessCosts: businessCostFees.filter((fee) => fee.shipmentId === shipment.id),
      payables: ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(actorRole())
        ? payableAuditFees.filter((fee) => fee.shipmentId === shipment.id)
        : [],
      canViewPayables: ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(actorRole())
    } satisfies OrderEntryDetailSummary);
  }

  const orderEntryDraftUpdateMatch = url.match(/\/api\/shipments\/([^/]+)\/order-entry-draft$/);
  if (orderEntryDraftUpdateMatch && init?.method === 'PUT') {
    const shipmentId = orderEntryDraftUpdateMatch[1];
    const current = employeeShipments.find((item) => item.id === shipmentId);
    if (!current) return jsonResponse({ message: '录单草稿不存在' }, 404);
    if (!['DRAFT', 'REVIEW_REJECTED'].includes(current.status)) {
      return jsonResponse({ message: '只有草稿或退回修改的录单可以继续编辑' }, 400);
    }
    const selectedPackages = warehousePackages.filter((pkg) => body.warehousePackageIds?.includes(pkg.id));
    const packageCount = selectedPackages.reduce((sum, pkg) => sum + pkg.packageCount, 0) || selectedPackages.length;
    const chargeWeightKg = selectedPackages.reduce((sum, pkg) => sum + pkg.chargeableWeightKg, 0);
    Object.assign(current, {
      customerCode: body.shipment?.customerCode ?? current.customerCode,
      customerName: `${body.shipment?.customerCode ?? current.customerCode}-${body.shipment?.customerCode === '9409' ? 'Daloday' : '仓库客户'}`,
      customerOrderNo: body.shipment?.customerOrderNo ?? current.customerOrderNo,
      systemOrderNo: body.shipment?.systemOrderNo ?? current.systemOrderNo,
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
      fbaWarehouseCode: body.shipment?.fbaWarehouseCode,
      receiverName: body.shipment?.receiverName,
      receiverCompany: body.shipment?.receiverCompany,
      receiverPhone: body.shipment?.receiverPhone,
      receiverAddress: body.shipment?.receiverAddress,
      receiverCountry: body.shipment?.receiverCountry,
      receiverState: body.shipment?.receiverState,
      receiverPostalCode: body.shipment?.receiverPostalCode,
      entryBy: actorUsername(),
      salesperson: actorUsername(),
      status: body.submitForReview ? 'REVIEW_PENDING' : 'DRAFT',
      channelName: body.shipment?.receivingChannel ?? current.channelName,
      carrier: body.shipment?.receivingChannel ?? current.carrier,
      destinationCountry: body.shipment?.destinationCountry ?? current.destinationCountry,
      packageCount,
      receivableWeightKg: chargeWeightKg,
      agentWeightKg: chargeWeightKg,
      latestTracking: body.submitForReview ? '财务录单提交审核' : '财务录单草稿已更新'
    });
    if (body.submitForReview) {
      selectedPackages.forEach((pkg) => {
        pkg.shipmentId = current.id;
        pkg.systemOrderNo = current.systemOrderNo;
      });
    }
    const packages = selectedPackages;
    return jsonResponse({
      shipment: current,
      packages,
      receivables: receivableFees.filter((fee) => fee.shipmentId === current.id),
      businessCosts: businessCostFees.filter((fee) => fee.shipmentId === current.id),
      payables: ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(actorRole()) ? payableAuditFees.filter((fee) => fee.shipmentId === current.id) : [],
      canViewPayables: ['ADMIN', 'FINANCE', 'UG_FINANCE'].includes(actorRole())
    } satisfies OrderEntryDetailSummary);
  }

  if (url.endsWith('/api/warehouse/manual-receipt/customers')) {
    return jsonResponse(masterData.customers
      .filter((customer) => customer.enabled)
      .map((customer) => ({ code: customer.code, name: customer.name })));
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
    const confirmedRows = withConfirmedWarehouseTally(rows);
    const grouped = new Map<string, WarehousePackageSummary[]>();
    confirmedRows.forEach((row) => grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]));
    return jsonResponse({
      totals: {
        receiptTickets: grouped.size,
        totalPackages: confirmedRows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: Number(confirmedRows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0).toFixed(2)),
        totalCbm: Number(confirmedRows.reduce((sum, row) => sum + row.cbm, 0).toFixed(3)),
        waitingDispatchTickets: employeeShipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH').length,
        pendingTallyTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length,
        exceptionTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length
      },
      rows: confirmedRows
    });
  }

  if (url.includes('/api/warehouse/in-stock')) {
    const params = new URL(url, 'http://test.local').searchParams;
    const keyword = (value: string | undefined, key: string) => {
      const needle = params.get(key);
      return !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    };
    const archivedOnly = params.get('status') === 'TALLIED_ARCHIVED';
    const rows = warehousePackages.filter((pkg) =>
      (archivedOnly
        ? pkg.status === 'TALLIED_ARCHIVED'
        : pkg.status !== 'CONSOLIDATED'
          && pkg.status !== 'SHIPPED'
          && pkg.status !== 'TALLIED_ARCHIVED')
      && (!params.get('site') || pkg.site === params.get('site'))
      && keyword(pkg.customerOrderNo, 'customerOrderNo')
      && keyword(pkg.domesticTrackingNo, 'domesticTrackingNo')
      && keyword(pkg.combinedOrderNo, 'combinedOrderNo')
      && keyword(`${pkg.remark ?? ''} ${pkg.manualException ?? ''} ${pkg.exceptions.join(' ')}`, 'operationKeyword')
    );
    const confirmedRows = withConfirmedWarehouseTally(rows);
    const grouped = new Map<string, WarehousePackageSummary[]>();
    confirmedRows.forEach((row) => grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]));
    return jsonResponse({
      totals: {
        receiptTickets: grouped.size,
        totalPackages: confirmedRows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: Number(confirmedRows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0).toFixed(2)),
        totalCbm: Number(confirmedRows.reduce((sum, row) => sum + row.cbm, 0).toFixed(3)),
        waitingDispatchTickets: employeeShipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH').length,
        pendingTallyTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length,
        exceptionTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length
      },
      rows: confirmedRows
    });
  }

  if (url.includes('/api/warehouse/tally-task-history-chain')) {
    const packageId = new URL(url, 'http://test.local').searchParams.get('packageId') ?? '';
    const visited = new Set<string>();
    const chain: WarehouseTallyTaskSummary[] = [];
    let currentPackageId: string | undefined = packageId;
    while (currentPackageId && chain.length < 20) {
      const lookupPackageId: string = currentPackageId;
      const pkg: WarehousePackageSummary | undefined = warehousePackages.find((item) => item.id === lookupPackageId);
      const task: WarehouseTallyTaskSummary | undefined = warehouseTallyTasks
        .filter((item) => item.status === 'COMPLETED' && !visited.has(item.id))
        .filter((item) => item.id === pkg?.tallyTaskId
          || item.taskNo === pkg?.tallyTaskNo
          || item.appliedPackageId === lookupPackageId
          || item.sourcePackageId === lookupPackageId
          || item.packageIds.includes(lookupPackageId))
        .sort((left, right) => new Date(right.completedAt ?? right.createdAt).getTime() - new Date(left.completedAt ?? left.createdAt).getTime())[0];
      if (!task) break;
      visited.add(task.id);
      chain.push({ ...task, packageIds: [...task.packageIds] });
      currentPackageId = task.sourcePackageId;
    }
    return jsonResponse(chain.reverse());
  }

  if (url.match(/\/api\/warehouse\/tally-tasks\/[^/]+\/output-packages/)) {
    const id = url.split('/').at(-2) ?? '';
    const task = warehouseTallyTasks.find((item) => item.id === id);
    if (!task) return jsonResponse({ message: '理货任务不存在' }, 404);
    const sourceIds = new Set(task.packageIds);
    const outputs = warehousePackages.filter((pkg) => pkg.tallyTaskId === id && !sourceIds.has(pkg.id));
    return jsonResponse(outputs.length ? outputs : warehousePackages.filter((pkg) => sourceIds.has(pkg.id)));
  }

  if (url.includes('/api/warehouse/tally-tasks') && init?.method !== 'POST' && init?.method !== 'PATCH') {
    const params = new URL(url, 'http://test.local').searchParams;
    const status = params.get('status');
    const combinedOrderNo = params.get('combinedOrderNo');
    const rows = warehouseTallyTasks.filter((task) =>
      (!status || task.status === status)
      && (!combinedOrderNo || task.sourceCombinedOrderNo.includes(combinedOrderNo))
    );
    return jsonResponse(rows.map((task) => {
      const sourceIds = new Set(task.packageIds);
      const outputPackages = task.status === 'COMPLETED'
        ? warehousePackages.filter((pkg) => pkg.tallyTaskId === task.id && !sourceIds.has(pkg.id))
        : [];
      return {
        ...task,
        packageIds: [...task.packageIds],
        outputPackages: outputPackages.map((pkg) => ({ ...pkg, exceptions: [...pkg.exceptions] }))
      };
    }));
  }

  if (url.endsWith('/api/warehouse/tally-tasks/label-scan') && init?.method === 'POST') {
    const labelNo = String(body.labelNo ?? '').trim();
    const index = warehouseTallyTasks.findIndex((task) => task.labelNo === labelNo);
    if (index < 0) return jsonResponse({ message: '理货标签不存在' }, 404);

    const task = warehouseTallyTasks[index];
    if (task.appliedPackageId) {
      const existing = warehousePackages.find((pkg) => pkg.id === task.appliedPackageId);
      if (existing) {
        return jsonResponse({ task, package: existing, alreadyApplied: true }, 201);
      }
    }

    const sourcePackages = warehousePackages.filter((pkg) => task.packageIds.includes(pkg.id));
    const source = sourcePackages.find((pkg) => pkg.id === task.sourcePackageId) ?? sourcePackages[0];
    if (!source) return jsonResponse({ message: '来源包裹不存在' }, 404);

    const packageCount = Math.max(1, Number(task.completedPackageCount ?? task.packageCount ?? 1));
    const totalWeightKg = Number(task.completedWeightKg ?? task.originalWeightKg ?? source.weightKg * source.packageCount);
    const lengthCm = Number(task.completedLengthCm ?? task.originalLengthCm ?? source.lengthCm);
    const widthCm = Number(task.completedWidthCm ?? task.originalWidthCm ?? source.widthCm);
    const heightCm = Number(task.completedHeightCm ?? task.originalHeightCm ?? source.heightCm);
    const singleCbm = Number(((lengthCm * widthCm * heightCm) / 1000000).toFixed(6));
    const totalCbm = Number((singleCbm * packageCount).toFixed(6));
    const singleVolumetric6000 = Number(((lengthCm * widthCm * heightCm) / 6000).toFixed(2));
    const singleVolumetric5000 = Number(((lengthCm * widthCm * heightCm) / 5000).toFixed(2));
    const scanTime = '2026-06-26T12:30:00.000+08:00';
    const sides = [lengthCm, widthCm, heightCm].sort((a, b) => b - a);
    const appliedPackage: WarehousePackageSummary = {
      ...source,
      id: `wh-tally-applied-${warehousePackages.length + 1}`,
      labelNo: task.labelNo,
      sourcePackageId: source.id,
      sourcePackageNo: source.combinedOrderNo,
      archivedByPackageId: undefined,
      archivedByPackageNo: undefined,
      archivedReason: undefined,
      archivedAt: undefined,
      tallyTaskId: task.id,
      tallyTaskNo: task.taskNo,
      receivingChannel: '理货后标签扫描',
      packageCount,
      weightKg: Number((totalWeightKg / packageCount).toFixed(6)),
      lengthCm,
      widthCm,
      heightCm,
      girthCm: sides[0] + 2 * (sides[1] + sides[2]),
      cbm: singleCbm,
      totalCbm,
      volumetricWeightKg: singleVolumetric6000,
      volumetricWeightKg5000: singleVolumetric5000,
      totalVolumetricWeightKg: Number((singleVolumetric6000 * packageCount).toFixed(2)),
      totalVolumetricWeightKg5000: Number((singleVolumetric5000 * packageCount).toFixed(2)),
      chargeableWeightKg: Math.max(Number((totalWeightKg / packageCount).toFixed(6)), singleVolumetric6000),
      scanTime,
      inboundAt: scanTime,
      scanSource: '理货后标签扫描',
      tallyStatus: '已理货',
      splitStatus: '原始票',
      consolidationStatus: '未合票',
      outboundStatus: '未出库',
      status: 'RECEIVED',
      createdBy: 'warehouse',
      createdAt: scanTime
    };

    sourcePackages.forEach((pkg) => {
      pkg.status = 'TALLIED_ARCHIVED';
      pkg.archivedByPackageId = appliedPackage.id;
      pkg.archivedByPackageNo = appliedPackage.combinedOrderNo;
      pkg.archivedReason = '理货标签扫描覆盖';
      pkg.archivedAt = scanTime;
      pkg.tallyTaskId = task.id;
      pkg.tallyTaskNo = task.taskNo;
      pkg.tallyStatus = '理货归档';
    });
    warehousePackages.unshift(appliedPackage);

    const updated: WarehouseTallyTaskSummary = {
      ...task,
      appliedPackageId: appliedPackage.id,
      appliedPackageNo: appliedPackage.combinedOrderNo,
      labelAppliedAt: scanTime,
      labelAppliedBy: 'warehouse'
    };
    warehouseTallyTasks[index] = updated;
    return jsonResponse({ task: updated, package: appliedPackage, alreadyApplied: false }, 201);
  }

  if (url.endsWith('/api/warehouse/tally-tasks') && init?.method === 'POST') {
    const selected = warehousePackages.filter((pkg) => body.packageIds.includes(pkg.id));
    if (selected.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      return jsonResponse({ message: '理货后包裹待重新过机，完成测量后才能再次理货' }, 400);
    }
    const retallyPackages = selected.filter((pkg) => pkg.tallyTaskId || pkg.tallyTaskNo || pkg.tallyStatus === '已理货');
    if (retallyPackages.length && (selected.length !== 1 || retallyPackages.length !== 1)) {
      return jsonResponse({ message: '二次理货一次只能选择一个已完成理货的包裹' }, 400);
    }
    const existingTask = warehouseTallyTasks.find((task) => task.status === 'PENDING' && selected.some((pkg) => task.packageIds.includes(pkg.id)));
    if (existingTask) {
      return jsonResponse({ message: '包裹已有未完成理货任务' }, 400);
    }
    const first = selected[0];
    const previousTask = warehouseTallyTasks.find((task) => task.id === first?.tallyTaskId || task.taskNo === first?.tallyTaskNo);
    const previousBase = previousTask
      ? previousTask.taskNo.match(/^(.*LH)\d{2}$/)?.[1] ?? (previousTask.taskNo.endsWith('LH') ? previousTask.taskNo : `${previousTask.taskNo}LH`)
      : undefined;
    const retallySequence = previousBase
      ? Math.max(1, ...warehouseTallyTasks.map((task) => Number(task.taskNo.match(new RegExp(`^${previousBase}(\\d{2})$`))?.[1]) || (task.taskNo === previousBase ? 1 : 0))) + 1
      : 0;
    const task: WarehouseTallyTaskSummary = {
      id: `wht-${warehouseTallyTasks.length + 1}`,
      taskNo: previousBase
        ? `${previousBase}${String(Math.max(2, retallySequence)).padStart(2, '0')}`
        : `${first?.combinedOrderNo ?? 'WH'}-TL${String(warehouseTallyTasks.length + 1).padStart(3, '0')}`,
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
    if (Array.isArray(body.results) && body.results.length) {
      const sources = warehousePackages.filter((pkg) => task.packageIds.includes(pkg.id));
      const completedAt = '2026-06-26T12:00:00.000+08:00';
      const outputs: WarehousePackageSummary[] = body.results.map((result: { sourcePackageIds: string[]; packageCount: number }, resultIndex: number) => {
        const source = sources.find((pkg) => result.sourcePackageIds.includes(pkg.id)) ?? sources[0];
        const totalOutputs = body.results.length;
        return {
          ...source,
          id: `wh-tally-${task.id}-${resultIndex + 1}`,
          labelNo: totalOutputs === 1 ? task.taskNo : `${task.taskNo}-${String(resultIndex + 1).padStart(2, '0')}`,
          sourcePackageId: source.id,
          sourcePackageNo: source.sourcePackageNo ?? source.combinedOrderNo,
          tallyTaskId: task.id,
          tallyTaskNo: task.taskNo,
          expectedTotalPackageCount: totalOutputs,
          packageIndex: resultIndex + 1,
          packageCount: Number(result.packageCount),
          weightKg: 0,
          lengthCm: 0,
          widthCm: 0,
          heightCm: 0,
          cbm: 0,
          volumetricWeightKg: 0,
          chargeableWeightKg: 0,
          scanTime: undefined,
          scanSource: '理货待重新过机',
          measurementStatus: 'PENDING_REMEASURE',
          tallyStatus: '已理货',
          status: 'RECEIVED',
          createdAt: completedAt
        };
      });
      sources.forEach((source) => {
        source.status = 'TALLIED_ARCHIVED';
        source.archivedByPackageId = outputs[0].id;
        source.archivedByPackageNo = outputs[0].combinedOrderNo;
        source.archivedReason = '理货完成';
        source.archivedAt = completedAt;
        source.tallyTaskId ??= task.id;
        source.tallyTaskNo ??= task.taskNo;
      });
      warehousePackages.unshift(...outputs);
      const completed: WarehouseTallyTaskSummary = {
        ...task,
        status: 'COMPLETED',
        completedPackageCount: outputs.reduce((sum, pkg) => sum + pkg.packageCount, 0),
        completedWeightKg: undefined,
        completedLengthCm: undefined,
        completedWidthCm: undefined,
        completedHeightCm: undefined,
        completedVolumetricWeightKg: undefined,
        completedVolumetricWeightKg5000: undefined,
        completedBy: 'warehouse',
        completedAt,
        remark: body.remark || task.remark,
        labelStatus: 'GENERATED',
        labelNo: task.taskNo,
        labelGeneratedAt: completedAt,
        labelGeneratedBy: 'warehouse'
      };
      warehouseTallyTasks[index] = completed;
      return jsonResponse(completed, 201);
    }
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
    warehousePackages.forEach((pkg) => {
      if (task.packageIds.includes(pkg.id)) {
        pkg.tallyTaskId = completed.id;
        pkg.tallyTaskNo = completed.taskNo;
        pkg.tallyStatus = '已理货';
      }
    });
    return jsonResponse(completed, 201);
  }

  if (url.match(/\/api\/warehouse\/tally-tasks\/[^/]+\/label$/) && init?.method === 'POST') {
    const id = url.split('/').at(-2);
    const index = warehouseTallyTasks.findIndex((task) => task.id === id);
    if (index < 0) return jsonResponse({ message: '理货任务不存在' }, 404);
    const task = warehouseTallyTasks[index];
    const labelNo = task.taskNo;
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

  if (url.endsWith('/api/warehouse/tally-tasks/label-scan') && init?.method === 'POST') {
    const taskIndex = warehouseTallyTasks.findIndex((task) => task.labelNo === body.labelNo);
    if (taskIndex < 0) return jsonResponse({ message: '理货标签不存在' }, 404);
    const task = warehouseTallyTasks[taskIndex];
    const existing = warehousePackages.find((pkg) => pkg.combinedOrderNo === task.sourceCombinedOrderNo && pkg.tallyTaskId === task.id);
    const volume = (task.completedLengthCm ?? task.originalLengthCm) * (task.completedWidthCm ?? task.originalWidthCm) * (task.completedHeightCm ?? task.originalHeightCm) * (task.completedPackageCount ?? task.packageCount);
    const pkg: WarehousePackageSummary = existing ?? {
      id: `wh-tallied-${warehousePackages.length + 1}`,
      customerCode: task.customerCode,
      customerName: task.customerName ?? `${task.customerCode}-仓库客户`,
      site: '深圳站',
      salesperson: task.salesperson,
      customerOrderNo: task.customerCode,
      domesticTrackingNo: task.sourceCombinedOrderNo.split('-').slice(1).join('-'),
      combinedOrderNo: task.sourceCombinedOrderNo,
      receivingChannel: '理货标签',
      expectedTotalPackageCount: task.completedPackageCount ?? task.packageCount,
      packageIndex: 1,
      packageCount: task.completedPackageCount ?? task.packageCount,
      weightKg: task.completedWeightKg ?? task.originalWeightKg,
      lengthCm: task.completedLengthCm ?? task.originalLengthCm,
      widthCm: task.completedWidthCm ?? task.originalWidthCm,
      heightCm: task.completedHeightCm ?? task.originalHeightCm,
      cbm: Number((volume / 1000000).toFixed(6)),
      totalCbm: Number((volume / 1000000).toFixed(6)),
      volumetricWeightKg: Number((volume / 6000).toFixed(2)),
      volumetricWeightKg5000: Number((volume / 5000).toFixed(2)),
      totalVolumetricWeightKg: Number((volume / 6000).toFixed(2)),
      totalVolumetricWeightKg5000: Number((volume / 5000).toFixed(2)),
      chargeableWeightKg: Math.max(task.completedWeightKg ?? task.originalWeightKg, Number((volume / 6000).toFixed(2))),
      divisor: 6000,
      roundingRule: 'NONE',
      scanTime: task.completedAt ?? task.createdAt,
      inboundAt: task.completedAt ?? task.createdAt,
      tallyStatus: '已理货',
      splitStatus: '原始票',
      consolidationStatus: '未合票',
      outboundStatus: '未出库',
      remark: task.remark,
      status: 'RECEIVED',
      exceptions: [],
      tallyTaskId: task.id,
      createdAt: task.completedAt ?? task.createdAt
    };
    if (!existing) warehousePackages.unshift(pkg);
    const updated = { ...task, labelAppliedAt: '2026-06-26T12:25:00.000+08:00', labelAppliedBy: 'warehouse' };
    warehouseTallyTasks[taskIndex] = updated;
    return jsonResponse({ task: updated, package: pkg, alreadyApplied: Boolean(existing) }, 201);
  }

  if (url.endsWith('/api/warehouse/packages/manual-receipt') && init?.method === 'POST') {
    const customerCode = body.customerCode ?? body.customerOrderNo ?? String(body.combinedOrderNo ?? '').split('-')[0];
    const customer = masterData.customers.find((item) => item.code === customerCode && item.enabled);
    if (!customer) {
      return jsonResponse({ message: '客户编号不存在，请从客户资料中选择' }, 400);
    }
    const customerOrderNo = body.customerOrderNo ?? customerCode;
    const domesticTrackingNo = body.domesticTrackingNo ?? String(body.combinedOrderNo ?? '').slice(String(body.combinedOrderNo ?? '').indexOf('-') + 1);
    const cartonSpecs = Array.isArray(body.cartonSpecs) ? body.cartonSpecs : [];
    const packages: WarehousePackageSummary[] = cartonSpecs.map((spec: any, index: number) => {
      const packageCount = spec.packageCount ?? 1;
      const volume = spec.lengthCm * spec.widthCm * spec.heightCm * packageCount;
      const sides = [spec.lengthCm, spec.widthCm, spec.heightCm].sort((a: number, b: number) => b - a);
      const pkg: WarehousePackageSummary = {
        id: `wh-created-${warehousePackages.length + index + 1}`,
        customerCode,
        customerName: `${customer.code}-${customer.name}`,
        site: '深圳站',
        salesperson: 'operator',
        manualException: body.manualException,
        scanSource: body.scanSource,
        customerOrderNo,
        domesticTrackingNo,
        combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
        labelNo: `${customerCode}-${domesticTrackingNo}-${index + 1}/${cartonSpecs.length}`,
        expectedTotalPackageCount: cartonSpecs.length,
        packageIndex: index + 1,
        receivingChannel: '外部标签识别',
        packageCount,
        weightKg: spec.weightKg,
        lengthCm: spec.lengthCm,
        widthCm: spec.widthCm,
        heightCm: spec.heightCm,
        girthCm: sides[0] + 2 * (sides[1] + sides[2]),
        cbm: Number((volume / 1000000).toFixed(6)),
        totalCbm: Number((volume / 1000000).toFixed(6)),
        volumetricWeightKg: Number((volume / 6000).toFixed(2)),
        volumetricWeightKg5000: Number((volume / 5000).toFixed(2)),
        totalVolumetricWeightKg: Number((volume / 6000).toFixed(2)),
        totalVolumetricWeightKg5000: Number((volume / 5000).toFixed(2)),
        chargeableWeightKg: Math.max(spec.weightKg * packageCount, Number((volume / 6000).toFixed(2))),
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
        exceptions: [],
        createdAt: body.scanTime
      };
      pkg.receiptSourceId = pkg.id;
      return pkg;
    });
    warehousePackages.unshift(...packages);
    return jsonResponse({
      packages,
      totalCartonSpecs: packages.length,
      totalPackages: packages.reduce((sum: number, pkg: WarehousePackageSummary) => sum + pkg.packageCount, 0)
    }, 201);
  }

  if (url.endsWith('/api/warehouse/packages') && init?.method === 'POST') {
    const customerCode = body.customerCode ?? body.customerOrderNo ?? String(body.combinedOrderNo ?? '').split('-')[0];
    const customer = masterData.customers.find((item) => item.code === customerCode && item.enabled);
    if (body.scanSource === '手动添加' && !customer) {
      return jsonResponse({ message: '客户编号不存在，请从客户资料中选择' }, 400);
    }
    const customerOrderNo = body.customerOrderNo ?? customerCode;
    const domesticTrackingNo = body.domesticTrackingNo ?? String(body.combinedOrderNo ?? '').slice(String(body.combinedOrderNo ?? '').indexOf('-') + 1);
    const packageCount = body.packageCount ?? 1;
    const volume = body.lengthCm * body.widthCm * body.heightCm * packageCount;
    const sides = [body.lengthCm, body.widthCm, body.heightCm].sort((a: number, b: number) => b - a);
    const pkg: WarehousePackageSummary = {
      id: `wh-created-${warehousePackages.length + 1}`,
      customerCode,
      customerName: customer ? `${customer.code}-${customer.name}` : `${customerCode}-仓库客户`,
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

  const warehousePackageUpdateMatch = url.match(/\/api\/warehouse\/packages\/([^/]+)$/);
  if (warehousePackageUpdateMatch && init?.method === 'PATCH') {
    const pkg = warehousePackages.find((item) => item.id === warehousePackageUpdateMatch[1]);
    if (!pkg) {
      return jsonResponse({ message: '仓库包裹不存在' }, 404);
    }
    if (pkg.status !== 'RECEIVED' || pkg.shipmentId) {
      return jsonResponse({ message: '已合票、已出库、已归档或已绑定运单的包裹不能直接修改' }, 400);
    }
    const combinedValue = String(body.combinedOrderNo ?? '');
    const splitIndex = combinedValue.indexOf('-');
    const customerCode = String(body.customerCode ?? body.customerOrderNo ?? (splitIndex > 0 ? combinedValue.slice(0, splitIndex) : pkg.customerCode)).trim();
    const customerOrderNo = String(body.customerOrderNo ?? body.customerCode ?? (splitIndex > 0 ? combinedValue.slice(0, splitIndex) : pkg.customerOrderNo)).trim();
    const domesticTrackingNo = String(body.domesticTrackingNo ?? (splitIndex > 0 ? combinedValue.slice(splitIndex + 1) : pkg.domesticTrackingNo)).trim();
    const packageCount = Math.max(1, Number(body.packageCount ?? pkg.packageCount));
    const weightKg = Number(body.weightKg ?? pkg.weightKg);
    const lengthCm = Number(body.lengthCm ?? pkg.lengthCm);
    const widthCm = Number(body.widthCm ?? pkg.widthCm);
    const heightCm = Number(body.heightCm ?? pkg.heightCm);
    const volume = lengthCm * widthCm * heightCm * packageCount;
    const sides = [lengthCm, widthCm, heightCm].sort((left, right) => right - left);
    Object.assign(pkg, {
      customerCode,
      customerName: customerCode === '9409' ? '9409-Daloday' : `${customerCode}-仓库客户`,
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
      expectedTotalPackageCount: Math.max(1, Number(body.expectedTotalPackageCount ?? pkg.expectedTotalPackageCount ?? packageCount)),
      packageIndex: Math.max(1, Number(body.packageIndex ?? pkg.packageIndex ?? 1)),
      packageCount,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      girthCm: sides[0] + 2 * (sides[1] + sides[2]),
      cbm: Number((volume / 1000000).toFixed(6)),
      totalCbm: Number((volume / 1000000).toFixed(6)),
      volumetricWeightKg: Number((volume / 6000).toFixed(2)),
      volumetricWeightKg5000: Number((volume / 5000).toFixed(2)),
      totalVolumetricWeightKg: Number((volume / 6000).toFixed(2)),
      totalVolumetricWeightKg5000: Number((volume / 5000).toFixed(2)),
      chargeableWeightKg: Math.max(weightKg, Number((volume / 6000).toFixed(2))),
      scanTime: body.scanTime ?? pkg.scanTime,
      inboundAt: body.scanTime ?? pkg.inboundAt,
      remark: body.remark || undefined,
      manualException: body.manualException || undefined
    });
    pkg.labelNo = `${pkg.customerCode}-${pkg.domesticTrackingNo}-${pkg.packageIndex ?? 1}/${pkg.expectedTotalPackageCount ?? pkg.packageCount}`;
    return jsonResponse(pkg);
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
      const row: WaterReceiptSummary = {
        id: `wr-${waterReceipts.length + 1}`,
        receiptNo: nextWaterReceiptNoForMock(),
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
        paymentNo: sanitizeManualPaymentNoForMock(body.paymentNo),
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
  if (waterReceiptAction && init?.method === 'DELETE' && waterReceiptAction[2] === 'voucher') {
    const receipt = waterReceipts.find((row) => row.id === waterReceiptAction[1] || row.receiptNo === waterReceiptAction[1]);
    if (!receipt) return jsonResponse({ message: '水单不存在' }, 404);
    receipt.voucher = undefined;
    return jsonResponse({ deleted: true });
  }
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
      if (!['ARRIVED', 'PARTIAL_MATCHED'].includes(receipt.status)) {
        return jsonResponse({ message: '水单未到账，不能匹配订单' }, 400);
      }
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
    Object.assign(receipt, body, {
      paymentNo: body.paymentNo === undefined ? receipt.paymentNo : sanitizeManualPaymentNoForMock(body.paymentNo),
      updatedAt: '2026-06-18T10:00:00.000Z'
    });
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
    const keyword = (value: string | undefined, needle: string | null) => !needle || (value ?? '').toLowerCase().includes(needle.toLowerCase());
    const dateInRange = (value: string | undefined, from: string | null, to: string | null) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
    const status = search.get('status');
    if (status && status !== 'ALL') rows = rows.filter((row) => row.status === status);
    const currency = search.get('currency');
    if (currency && currency !== 'ALL') rows = rows.filter((row) => row.currency === currency);
    rows = rows.filter((row) =>
      keyword(row.agentName, search.get('agent'))
      && keyword(row.salesperson, search.get('salesperson'))
      && keyword(row.customerCode, search.get('customerCode'))
      && keyword(row.systemOrderNo, search.get('systemOrderNo'))
      && keyword(row.feeName, search.get('feeName'))
      && keyword(row.remark, search.get('remark'))
      && keyword(row.payeeBankAccount?.accountName, search.get('payeeName'))
      && keyword(row.payeeBankAccount?.bankAccountNo, search.get('bankAccountNo'))
      && keyword(row.payerBankName, search.get('payerBank'))
      && (!search.get('amount') || row.totalAmount === Number(search.get('amount')))
      && dateInRange(row.date, search.get('applicationDateFrom'), search.get('applicationDateTo'))
      && dateInRange(row.paidAt, search.get('paidDateFrom'), search.get('paidDateTo'))
    );
    const totals = rows.reduce((acc, row) => {
      if (row.status === 'WAITING_PAYMENT') acc.waitingPaymentCount += 1;
      if (row.status === 'PAID') acc.paidCount += 1;
      const bucket = acc.amountByCurrency.find((item) => item.currency === row.currency);
      if (bucket) bucket.amount += row.totalAmount;
      else acc.amountByCurrency.push({ currency: row.currency, amount: row.totalAmount });
      return acc;
    }, { count: rows.length, waitingPaymentCount: 0, paidCount: 0, amountByCurrency: [] as Array<{ currency: 'RMB' | 'USD'; amount: number }> });
    const page = Number(search.get('page') ?? 1);
    const pageSize = Number(search.get('pageSize') ?? 10);
    const pagedRows = pageSize > 0 ? rows.slice((page - 1) * pageSize, page * pageSize) : rows;
    return jsonResponse({ rows: pagedRows, totals, pagination: { page, pageSize: pageSize > 0 ? pageSize : rows.length, totalItems: rows.length } });
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
      const existing = payload.id ? agentBankAccounts.find((item) => item.id === payload.id) : undefined;
      const bank: AgentBankAccountSummary = {
        id: existing?.id ?? `bank-${agentBankAccounts.length + 1}`,
        enabled: payload.enabled ?? true,
        createdAt: existing?.createdAt ?? '2026-06-17T12:45:00.000Z',
        updatedAt: '2026-06-17T12:45:00.000Z',
        ...payload
      };
      if (existing) Object.assign(existing, bank);
      else agentBankAccounts.push(bank);
      const payee = payeeBankAccounts.find((item) =>
        ((bank.agentId && item.agentId === bank.agentId) || item.agentName === bank.agentName)
        && item.bankAccountNo === bank.bankAccountNo
      );
      const payeePayload: PayeeBankAccountSummary = {
        id: payee?.id ?? `payee-bank-${payeeBankAccounts.length + 1}`,
        agentId: bank.agentId,
        agentName: bank.agentName,
        accountName: bank.accountName,
        bankName: bank.bankName,
        bankAccountNo: bank.bankAccountNo,
        currency: bank.currency === 'USD' ? 'USD' : 'RMB',
        remark: bank.remark,
        enabled: bank.enabled,
        createdAt: payee?.createdAt ?? '2026-06-17T12:45:00.000Z',
        updatedAt: '2026-06-17T12:45:00.000Z'
      };
      if (payee) Object.assign(payee, payeePayload);
      else payeeBankAccounts.push(payeePayload);
      return jsonResponse(bank);
    }
    const includeDisabled = new URL(url, 'http://test.local').searchParams.get('includeDisabled') === 'true';
    return jsonResponse(agentBankAccounts.filter((item) => includeDisabled || item.enabled));
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

function deriveTestPriceBookAgentName(fileName?: string) {
  const baseName = String(fileName ?? '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.(xlsx|xls)$/i, '')
    .trim();
  return baseName
    .replace(/^\d+(?:\.\d+)*(?:\s*[-_—–－]\s*)?/, '')
    .replace(/^(?:自定义|custom)[-_—–－\s]*/i, '')
    .trim();
}

function cleanTestOldOriginalAgentName(fileName: string | undefined, agentName: string) {
  const ownerAgentName = deriveTestPriceBookAgentName(fileName);
  const originalAgentName = String(agentName ?? '').trim();
  if (originalAgentName === '亿阳国际' && ownerAgentName === '拓普达') {
    return ownerAgentName;
  }
  if (originalAgentName === '深圳振韵国际' && ownerAgentName === '振韵') {
    return ownerAgentName;
  }
  return agentName;
}

function resolveTestEnabledPriceBookAgent(input: { agentId?: string; agentShortName?: string } | Record<string, unknown>) {
  const agentId = typeof input.agentId === 'string' ? input.agentId.trim() : '';
  const agentShortName = typeof input.agentShortName === 'string' ? input.agentShortName.trim() : '';
  const agent = masterData.agents.find((item) =>
    item.enabled &&
    ((agentId && item.id === agentId) || (agentShortName && (item.shortName ?? item.name) === agentShortName))
  );
  return agent ? { id: agent.id, shortName: agent.shortName ?? agent.name } : null;
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

function createDefaultTestMarkupRule(agentName: string): AgentMarkupSummary {
  return {
    id: `price-agent:${agentName}`,
    agentName,
    markupPerKg: 0.5,
    markupType: 'WEIGHT',
    markupValue: 0.5,
    priority: 100,
    enabled: true
  };
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

function testNormalizeAmazonWeightBand(value?: string | number | null): '12KG+' | '50KG+' | '100KG+' | undefined {
  const text = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const weight = Number(match[1]);
  if (!Number.isFinite(weight)) return undefined;
  if (weight >= 100) return '100KG+';
  if (weight >= 50) return '50KG+';
  return '12KG+';
}

function testInferAmazonWeightBandFromMin(minWeightKg?: number | null): '12KG+' | '50KG+' | '100KG+' | undefined {
  const min = Number(minWeightKg ?? 0);
  if (!Number.isFinite(min)) return undefined;
  if (min >= 100) return '100KG+';
  if (min >= 50) return '50KG+';
  return '12KG+';
}

function testCanViewPricingInternalRoute(token: string): boolean {
  return token.includes('ADMIN') || token.includes('UG_MARKET');
}

function testPublicPricingRouteCode(...values: Array<string | undefined>): string {
  for (const value of values) {
    const displayName = testExtractChinesePricingRouteName(value);
    if (displayName) return displayName;
  }
  return '可报价线路';
}

const testAmazonOriginWarehouseNames = [
  '义乌仓',
  '华东',
  '华南',
  '厦门/泉州/福州',
  '天津/南昌/石家庄',
  '武汉/长沙/成都',
  '汕头',
  '济南/潍坊',
  '深圳/广州仓',
  '西安/沧州/保定',
  '重庆',
  '青岛/郑州/温州/台州/连云港/南京/合肥'
];

function testNormalizeAmazonOriginWarehouseName(value: unknown): string | undefined {
  const text = String(value ?? '')
    .replace(/[／｜|、，,；;]/g, '/')
    .replace(/\s+/g, '')
    .replace(/^(?:出货仓|起运仓|发货仓|发货地|起运地|来源地|仓库区域|揽收区域|报价组)[:：]?/, '')
    .trim();
  if (!text) return undefined;
  const compact = text.replace(/[()（）]/g, '');
  const matched = testAmazonOriginWarehouseNames.find((name) => compact.includes(name.replace(/[()（）]/g, '')));
  if (matched) return matched;
  if (/欧洲|西班牙|英国|铁路|空派|快递|海运|专线|渠道|DHL|UPS|FEDEX|美西|美东|包税|双清|卡派|海卡/i.test(compact)) {
    return undefined;
  }
  if (/(仓|华东|华南|义乌|深圳|广州|汕头|厦门|泉州|福州|天津|南昌|石家庄|武汉|长沙|成都|济南|潍坊|西安|沧州|保定|重庆|青岛|郑州|温州|台州|连云港|南京|合肥)/.test(compact)) {
    return compact.slice(0, 30);
  }
  return undefined;
}

function testUniqueAmazonOriginWarehouseNames(values: Array<unknown>): string[] {
  const unique = new Set(values.map(testNormalizeAmazonOriginWarehouseName).filter((value): value is string => Boolean(value)));
  return [...unique].sort((left, right) => {
    const leftIndex = testAmazonOriginWarehouseNames.indexOf(left);
    const rightIndex = testAmazonOriginWarehouseNames.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
    }
    return left.localeCompare(right, 'zh-CN');
  });
}

function testExtractChinesePricingRouteName(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  const cleaned = text
    .replace(/[A-Za-z0-9_]+/g, '')
    .replace(/[－–—]/g, '-')
    .replace(/[^\u3400-\u9FFF\s\-、，,（）()]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[-\s,，、]+|[-\s,，、]+$/g, '')
    .trim();
  return /[\u3400-\u9FFF]/.test(cleaned) ? cleaned : undefined;
}

function buildTestLegacyModuleCounts(rows: PriceBookRowSummary[]) {
  const counts: PriceBookSummary['legacyModuleCounts'] = {};
  for (const row of rows) {
    const source = `${row.sourceSheetName ?? ''} ${row.channelName ?? ''} ${row.realChannelName ?? ''} ${row.businessRouteName ?? ''} ${row.destinationCountry ?? ''}`.toLowerCase();
    const module = row.warehouseCode?.trim() || /仓库|fba|amazon|亚马逊/.test(source)
      ? 'amazon'
      : /南非|south africa|south-africa/.test(source)
        ? 'southAfrica'
        : !/超大件|大件/.test(source) && /空海运|铁路|快递|空运|空派|express|rail|air|fedex|dhl|ups/.test(source)
          ? 'europeExpress'
          : /超大件|海运|海卡|卡派|卡车|truck|oversize|大件/.test(source)
            ? 'inquiry'
            : 'europeExpress';
    counts[module] = (counts[module] ?? 0) + 1;
  }
  return counts;
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
    latestTrackingUpdatedAt: '2026-06-06T09:40:00.000Z',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status,
    channelName: 'DHL HK',
    agentName: '宇环',
    hasProblemTicket: false,
    ...overrides
  };
}

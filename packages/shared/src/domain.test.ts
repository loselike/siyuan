import { describe, expect, it } from 'vitest';
import {
  calculateChargeableWeight,
  calculateCompanyChannelChargeWeight,
  calculateCompanyChannelChargeWeightFromCargo,
  calculateQuote,
  quoteWithPricingRules,
  createFeeLinesFromQuote,
  summarizeStatement,
  summarizePaymentSettlement,
  summarizeMasterDataSnapshot,
  canTransitionShipment,
  createAutomationPlan,
  createFulfillmentAdvice,
  calculateTransitTimeLabel,
  createBulkTrackingImportResult,
  getAvailableFulfillmentActions,
  summarizeFulfillmentStages,
  createShipmentInsights,
  getModuleCoverageSummary,
  validateShipmentImportRows,
  createSystemOrderNo,
  createMockTransferNo,
  createMockTrackingStatus,
  hasUsPostalRuleOverlap,
  isUsPostalRuleSyntax,
  matchUsPostalRule,
  canAccessStaffMenu,
  getVisibleStaffMenuKeys,
  summarizeLineShipmentPool,
  type CarrierTaskSummary,
  type AccountLedgerSummary,
  type CustomerAccountSummary,
  type MasterDataSnapshot,
  type PaymentCreateResponse,
  type PaymentSummary,
  type PricingRuleSummary,
  type ShipmentLabelSummary,
  type Shipment,
  ShipmentStatus
} from './index';

describe('US postal-code pricing rules', () => {
  it('matches five-digit ZIP codes by the documented leading-digit groups', () => {
    expect(matchUsPostalRule('5-7（邮编）', '65644')).toEqual(expect.objectContaining({ priority: 3, matchedLabel: '5-7' }));
    expect(matchUsPostalRule('4、5、6、7邮编', '65644')).toEqual(expect.objectContaining({ priority: 3 }));
    expect(matchUsPostalRule('0-1-2-4（邮编）', '35644')).toBeUndefined();
    expect(matchUsPostalRule('0-1-2-4（邮编）', '25644')).toEqual(expect.objectContaining({ priority: 3 }));
    expect(matchUsPostalRule('96-99（邮编）', '98101')).toEqual(expect.objectContaining({ specificity: 3 }));
    expect(matchUsPostalRule('美西-邮编8-9', '90155')).toEqual(expect.objectContaining({ priority: 3 }));
    expect(matchUsPostalRule('80000-99999', '90155')).toEqual(expect.objectContaining({ priority: 2 }));
  });

  it('keeps postal-rule validation and overlap checks aligned with matching', () => {
    expect(isUsPostalRuleSyntax('5-7（邮编）')).toBe(true);
    expect(isUsPostalRuleSyntax('4、5、6、7邮编')).toBe(true);
    expect(isUsPostalRuleSyntax('96-99（邮编）')).toBe(true);
    expect(isUsPostalRuleSyntax('时效 5-7天')).toBe(false);
    expect(hasUsPostalRuleOverlap(['5-7（邮编）', '6（邮编）'])).toBe(true);
  });
});

describe('role menu access', () => {
  it('keeps system settings admin-only and separates operation from finance menus', () => {
    expect(getVisibleStaffMenuKeys('ADMIN')).toEqual(expect.arrayContaining(['settings', 'finance', 'receive', 'market', 'business', 'logisticsTracking', 'customerService']));
    expect(canAccessStaffMenu('ADMIN', 'settings')).toBe(true);

    expect(getVisibleStaffMenuKeys('OPERATOR')).toEqual(expect.arrayContaining(['business', 'market', 'logisticsTracking', 'pricing', 'master', 'receive']));
    expect(canAccessStaffMenu('OPERATOR', 'settings')).toBe(false);
    expect(canAccessStaffMenu('OPERATOR', 'finance')).toBe(false);
    expect(canAccessStaffMenu('OPERATOR', 'receive')).toBe(true);

    expect(getVisibleStaffMenuKeys('WAREHOUSE')).toEqual(expect.arrayContaining(['workspace', 'receive', 'logisticsTracking']));
    expect(canAccessStaffMenu('WAREHOUSE', 'receive')).toBe(true);
    expect(canAccessStaffMenu('WAREHOUSE', 'pricing')).toBe(false);

    expect(getVisibleStaffMenuKeys('FINANCE')).toEqual(expect.arrayContaining(['workspace', 'finance', 'pricing', 'master']));
    expect(canAccessStaffMenu('FINANCE', 'settings')).toBe(false);
    expect(canAccessStaffMenu('FINANCE', 'receive')).toBe(false);

    expect(getVisibleStaffMenuKeys('CUSTOMER')).toEqual([]);
  });
});

describe('shipment state transitions', () => {
  it('allows the order lifecycle from audit to signature', () => {
    const path: ShipmentStatus[] = [
      'DRAFT',
      'WAITING_SORT',
      'WAITING_DISPATCH',
      'OUTBOUNDED',
      'WAITING_DEPARTURE',
      'DEPARTED',
      'ARRIVED_PORT',
      'DELIVERING',
      'SIGNED'
    ];

    for (let index = 0; index < path.length - 1; index += 1) {
      expect(canTransitionShipment(path[index], path[index + 1])).toBe(true);
    }
  });

  it('blocks an invalid jump from draft directly to signed', () => {
    expect(canTransitionShipment('DRAFT', 'SIGNED')).toBe(false);
  });
});

describe('shipment weight and quote calculations', () => {
  it('uses the larger value between actual weight and volumetric weight', () => {
    const result = calculateChargeableWeight({
      actualWeightKg: 8.1,
      lengthCm: 60,
      widthCm: 50,
      heightCm: 40,
      divisor: 5000
    });

    expect(result.volumetricWeightKg).toBe(24);
    expect(result.chargeableWeightKg).toBe(24);
  });

  it('uses the selected company channel divisor and settlement rounding rules', () => {
    const packages = [{ packageCount: 1, weightKg: 8.1, lengthCm: 60, widthCm: 50, heightCm: 40 }];
    const common = {
      multiPieceWeightRule: 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: 'ACTUAL',
      settlementWeightRule: 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: 'NONE'
    } as const;

    expect(calculateCompanyChannelChargeWeight({ ...common, volumeDivisor: 5000 }, packages)).toBe(24);
    expect(calculateCompanyChannelChargeWeight({ ...common, volumeDivisor: 6000, settlementWeightRoundingRule: 'LARGE_1_SMALL_0_5' }, packages)).toBe(20);
  });

  it('applies package count to both single-package actual weight and volume', () => {
    const rule = {
      volumeDivisor: 5000,
      multiPieceWeightRule: 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: 'ACTUAL',
      settlementWeightRule: 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: 'NONE'
    } as const;

    expect(calculateCompanyChannelChargeWeight(rule, [{
      packageCount: 3,
      weightKg: 10,
      lengthCm: 20,
      widthCm: 20,
      heightCm: 20
    }])).toBe(30);
  });

  it('recalculates aggregate manual cargo with the selected company channel divisor', () => {
    const rule = {
      volumeDivisor: 5000,
      multiPieceWeightRule: 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: 'ACTUAL',
      settlementWeightRule: 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: 'NONE'
    } as const;
    expect(calculateCompanyChannelChargeWeightFromCargo(rule, { packageCount: 2, actualWeightKg: 8, volumeCbm: 0.12 })).toBe(24);
  });

  it('calculates receivable quote with fuel and surcharges', () => {
    const quote = calculateQuote({
      chargeableWeightKg: 12,
      baseRatePerKg: 31,
      fuelRate: 0.18,
      surcharges: [
        { name: '偏远费', amount: 80 },
        { name: '超长费', amount: 120 }
      ]
    });

    expect(quote.freight).toBe(372);
    expect(quote.fuel).toBe(66.96);
    expect(quote.surchargeTotal).toBe(200);
    expect(quote.total).toBe(638.96);
  });

  it('creates named fee lines from a quote with receivable adjustments', () => {
    const quote = calculateQuote({
      chargeableWeightKg: 10,
      baseRatePerKg: 20,
      fuelRate: 0.15,
      surcharges: [{ name: '偏远费', amount: 50 }]
    });

    const lines = createFeeLinesFromQuote('shipment-1', quote, [
      { name: '人工优惠', amount: -15 },
      { name: '地址更正费', amount: 20 }
    ]);

    expect(lines).toEqual([
      { shipmentId: 'shipment-1', name: '基础运费', amount: 200 },
      { shipmentId: 'shipment-1', name: '燃油费', amount: 30 },
      { shipmentId: 'shipment-1', name: '附加费', amount: 50 },
      { shipmentId: 'shipment-1', name: '人工优惠', amount: -15 },
      { shipmentId: 'shipment-1', name: '地址更正费', amount: 20 }
    ]);
  });

  it('quotes from enabled channel pricing rules with fuel, surcharges, and exchange rates', () => {
    const rules: PricingRuleSummary[] = [
      {
        id: 'pr-disabled',
        channelId: 'ch-dhl-hk',
        channelName: 'DHL HK',
        destinationCountry: '美国',
        minWeightKg: 0,
        maxWeightKg: 5,
        ratePerKg: 8,
        currency: 'USD',
        enabled: false
      },
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

    const quote = quoteWithPricingRules({
      channelId: 'ch-dhl-hk',
      destinationCountry: '美国',
      chargeableWeightKg: 4,
      rules,
      fuelRates: [
        { id: 'fr-old', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.1, activeAt: '2026-06-01T00:00:00.000Z' },
        { id: 'fr-new', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.15, activeAt: '2026-06-06T00:00:00.000Z' }
      ],
      surcharges: [
        { id: 'sc-remote', name: '偏远附加费', amount: 50, enabled: true },
        { id: 'sc-disabled', name: '停用费', amount: 999, enabled: false }
      ],
      exchangeRates: [
        { id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'RMB', rate: 7.25, activeAt: '2026-06-06T00:00:00.000Z', enabled: true }
      ]
    });

    expect(quote.rule.id).toBe('pr-dhl-us-0-5');
    expect(quote.exchangeRate).toBe(7.25);
    expect(quote.freight).toBe(290);
    expect(quote.fuel).toBe(43.5);
    expect(quote.surchargeTotal).toBe(50);
    expect(quote.total).toBe(383.5);
  });

  it('fails pricing rule quote when no enabled rule matches the channel country and weight', () => {
    expect(() =>
      quoteWithPricingRules({
        channelId: 'ch-dhl-hk',
        destinationCountry: '加拿大',
        chargeableWeightKg: 4,
        rules: [],
        fuelRates: [],
        surcharges: [],
        exchangeRates: []
      })
    ).toThrow('无可用报价规则');
  });

  it('summarizes customer statement totals from unsettled fee lines', () => {
    const statement = summarizeStatement({
      customerId: 'c-9409',
      customerName: '9409-Daloday',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-06',
      fees: [
        { id: 'f-1', shipmentId: 's-1', systemOrderNo: 'SY1', customerName: '9409-Daloday', name: '基础运费', amount: 200, settled: false },
        { id: 'f-2', shipmentId: 's-1', systemOrderNo: 'SY1', customerName: '9409-Daloday', name: '燃油费', amount: 30, settled: false },
        { id: 'f-3', shipmentId: 's-2', systemOrderNo: 'SY2', customerName: '9409-Daloday', name: '已结算费用', amount: 99, settled: true }
      ]
    });

    expect(statement.total).toBe(230);
    expect(statement.feeCount).toBe(2);
    expect(statement.status).toBe('DRAFT');
  });
});

describe('AI-friendly shipment insights', () => {
  it('flags stale tracking and problem shipments with suggested actions', () => {
    const insights = createShipmentInsights({
      status: 'WAITING_ONLINE',
      trackingStaleDays: 6,
      isRemoteArea: true,
      hasProblemTicket: true,
      chargeableWeightKg: 56,
      carrier: 'DHL'
    });

    expect(insights.riskLevel).toBe('high');
    expect(insights.tags).toContain('轨迹超时');
    expect(insights.tags).toContain('偏远地区');
    expect(insights.suggestedActions).toContain('优先联系代理确认上网节点');
  });
});

describe('shipment import validation', () => {
  it('returns row-level errors for duplicate order numbers and invalid logistics data', () => {
    const result = validateShipmentImportRows([
      { customerOrderNo: 'A-001', destinationCountry: '美国', weightKg: 2.4, channelName: 'USPS 小包线' },
      { customerOrderNo: 'A-001', destinationCountry: '德国', weightKg: 1.2, channelName: 'DHL HK' },
      { customerOrderNo: 'A-003', destinationCountry: '', weightKg: -1, channelName: '' }
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toEqual([
      { rowNumber: 2, field: 'customerOrderNo', message: '出货单号重复' },
      { rowNumber: 3, field: 'destinationCountry', message: '目的地国家不能为空' },
      { rowNumber: 3, field: 'weightKg', message: '重量必须大于 0' },
      { rowNumber: 3, field: 'channelName', message: '渠道不能为空' }
    ]);
  });
});

describe('API DTO helpers', () => {
  it('generates system order numbers with business prefix and daily sequence', () => {
    expect(createSystemOrderNo('EXPRESS', new Date('2026-06-06T10:00:00Z'), 12)).toBe('SYGJ26060600012');
    expect(createSystemOrderNo('SMALL_PACKET', new Date('2026-06-06T10:00:00Z'), 3)).toBe('SYXB26060600003');
    expect(createSystemOrderNo('DEDICATED_LINE', new Date('2026-06-06T10:00:00Z'), 99)).toBe('SYZX26060600099');
  });

  it('generates mock transfer numbers by carrier adapter prefix', () => {
    const date = new Date('2026-06-06T10:00:00Z');

    expect(createMockTransferNo('DHL', date, 7)).toBe('DHL26060600007');
    expect(createMockTransferNo('FEDEX', date, 7)).toBe('FDX26060600007');
    expect(createMockTransferNo('UPS', date, 7)).toBe('1Z26060600007');
    expect(createMockTransferNo('USPS', date, 7)).toBe('USPS26060600007');
    expect(createMockTransferNo('OTHER', date, 7)).toBe('SIM26060600007');
  });

  it('represents created and voided shipment labels for staff-only label workflows', () => {
    const label: ShipmentLabelSummary = {
      id: 'lbl-1',
      shipmentId: 's-1',
      carrier: 'DHL',
      channelName: 'DHL HK',
      labelNo: 'LBL26060600001',
      transferNo: 'DHL26060600001',
      labelUrl: '/mock-labels/LBL26060600001.pdf',
      status: 'CREATED',
      createdAt: '2026-06-06T10:00:00.000Z'
    };

    expect(label.status).toBe('CREATED');
    expect({ ...label, status: 'VOIDED', voidedAt: '2026-06-06T11:00:00.000Z' }).toMatchObject({
      status: 'VOIDED',
      voidedAt: '2026-06-06T11:00:00.000Z'
    });
  });

  it('generates stable mock tracking statuses by carrier', () => {
    expect(createMockTrackingStatus('DHL', 'DHL26060600001')).toBe('DHL 已揽收 DHL26060600001');
    expect(createMockTrackingStatus('FEDEX', 'FDX26060600001')).toBe('FEDEX 运输中 FDX26060600001');
    expect(createMockTrackingStatus('UPS', '1Z26060600001')).toBe('UPS 运输中 1Z26060600001');
    expect(createMockTrackingStatus('USPS', 'USPS26060600001')).toBe('USPS 已交邮 USPS26060600001');
    expect(createMockTrackingStatus('OTHER', 'SIM26060600001')).toBe('承运商已接收 SIM26060600001');
  });

  it('represents carrier task states for tracking sync workflows', () => {
    const task: CarrierTaskSummary = {
      id: 'ct-1',
      shipmentId: 's-1',
      systemOrderNo: 'SYGJ26060600001',
      customerName: '9409-Daloday',
      type: 'TRACKING_SYNC',
      carrier: 'UPS',
      transferNo: '1Z26060600001',
      status: 'FAILED',
      attempts: 1,
      lastError: '模拟承运商接口失败',
      createdAt: '2026-06-06T10:00:00.000Z',
      updatedAt: '2026-06-06T10:01:00.000Z'
    };

    expect(task.status).toBe('FAILED');
    expect({ ...task, status: 'SUCCESS', lastError: undefined, completedAt: '2026-06-06T10:02:00.000Z' }).toMatchObject({
      status: 'SUCCESS',
      completedAt: '2026-06-06T10:02:00.000Z'
    });
  });

  it('represents customer account balances, receipts, and settlement ledger entries', () => {
    const account: CustomerAccountSummary = {
      customerId: 'c-9409',
      customerName: '9409-Daloday',
      balance: 10000,
      currency: 'RMB'
    };
    const payment: PaymentSummary = summarizePaymentSettlement({
      id: 'pay-1',
      customerId: 'c-9409',
      customerName: '9409-Daloday',
      amount: 230,
      settledAmount: 230,
      createdAt: '2026-06-06T10:00:00.000Z'
    });
    const ledger: AccountLedgerSummary[] = [
      { id: 'al-1', customerId: 'c-9409', customerName: '9409-Daloday', amount: 230, balance: 10230, note: '收款登记', createdAt: '2026-06-06T10:00:00.000Z' },
      { id: 'al-2', customerId: 'c-9409', customerName: '9409-Daloday', amount: -230, balance: 10000, note: '核销应收费用', createdAt: '2026-06-06T10:00:00.000Z' }
    ];
    const response: PaymentCreateResponse = {
      payment,
      account,
      settledFees: [
        { id: 'rf-1', shipmentId: 's-1', systemOrderNo: 'SYGJ26060600001', customerName: '9409-Daloday', name: '基础运费', amount: 200, settled: true },
        { id: 'rf-2', shipmentId: 's-1', systemOrderNo: 'SYGJ26060600001', customerName: '9409-Daloday', name: '燃油费', amount: 30, settled: true }
      ]
    };

    expect(response.payment.remainingAmount).toBe(0);
    expect(response.account.balance).toBe(10000);
    expect(ledger.map((item) => item.amount)).toEqual([230, -230]);
  });

  it('represents master data snapshots with customers, channels, fees, fuel rates, and exchange rates', () => {
    const snapshot: MasterDataSnapshot = {
      customers: [
        { id: 'c-9409', code: '9409', name: 'Daloday', enabled: true }
      ],
      contacts: [
        { id: 'cc-1', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Lina', phone: '13800000001', email: 'lina@example.com', enabled: true }
      ],
      customerUsers: [
        { id: 'u-customer', customerId: 'c-9409', customerName: '9409-Daloday', username: 'customer', enabled: true }
      ],
      agents: [
        { id: 'a-yuhuan', name: '宇环', createdAt: '2026-06-01T00:00:00.000Z', enabled: true }
      ],
      agentChannels: [
        { id: 'ach-yuhuan-dhl', agentId: 'a-yuhuan', agentName: '宇环', channelName: '宇环 DHL', enabled: true }
      ],
      carriers: [
        { id: 'cr-dhl', name: 'DHL', enabled: true }
      ],
      channelCategories: [
        { id: 'cc-dhl', name: 'DHL', enabled: true }
      ],
      channels: [
        {
          id: 'ch-dhl-hk',
          name: 'DHL HK',
          carrierId: 'cr-dhl',
          carrierName: 'DHL',
          businessType: 'EXPRESS',
          category: 'DHL',
          volumeDivisor: 5000,
          multiPieceWeightRule: 'SUM_THEN_COMPARE',
          singleWeightRoundingRule: 'ACTUAL',
          settlementWeightRule: 'MAX_ACTUAL_VOLUME',
          settlementWeightRoundingRule: 'NONE',
          remoteAreaRule: 'NONE',
          enabled: true
        }
      ],
      surcharges: [
        { id: 'sc-remote', name: '偏远附加费', amount: 50, enabled: true }
      ],
      fuelRates: [
        { id: 'fr-dhl', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.15, activeAt: '2026-06-06T00:00:00.000Z' }
      ],
      exchangeRates: [
        { id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'RMB', rate: 7.245, activeAt: '2026-06-06T00:00:00.000Z', enabled: true }
      ],
      roles: ['ADMIN', 'CUSTOMER']
    };

    const summary = summarizeMasterDataSnapshot(snapshot);

    expect(snapshot.customers[0].enabled).toBe(true);
    expect(snapshot.channels[0].carrierName).toBe('DHL');
    expect(snapshot.exchangeRates[0].rate).toBe(7.245);
    expect(summary.enabledCustomers).toBe(1);
    expect(summary.enabledChannels).toBe(1);
    expect(summary.activeExchangeRates).toBe(1);
  });
});

describe('AI automation planning', () => {
  it('prioritizes high-risk shipments and proposes executable workflow actions', () => {
    const plan = createAutomationPlan([
      {
        id: 'slow-problem',
        createdAt: '2026-06-01 10:00',
        customerName: 'A 客户',
        customerOrderNo: 'A-001',
        systemOrderNo: 'SY001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        carrier: 'DHL',
        packageCount: 1,
        receivableWeightKg: 55,
        agentWeightKg: 54,
        latestTracking: '离开扫描',
        trackingStaleDays: 8,
        isRemoteArea: true,
        status: 'WAITING_ONLINE',
        channelName: 'DHL HK',
        agentName: '宇环',
        hasProblemTicket: true
      }
    ]);

    expect(plan[0].shipmentId).toBe('slow-problem');
    expect(plan[0].priority).toBe('urgent');
    expect(plan[0].actions).toContain('同步客户异常说明');
    expect(plan[0].actions).toContain('复核应收/应付费用差异');
  });
});

describe('module coverage catalog', () => {
  it('covers employee, customer, finance, AI, and integration surfaces', () => {
    const summary = getModuleCoverageSummary();

    expect(summary.totalModules).toBeGreaterThanOrEqual(12);
    expect(summary.surfaces).toEqual(expect.arrayContaining(['员工端', '客户端', 'AI 助手', '开放集成']));
    expect(summary.phaseOneModules).toEqual(
      expect.arrayContaining(['我的订单', '报价查价', '财务结算', '问题件中心'])
    );
  });
});

describe('fulfillment workflow rules', () => {
  it('returns executable actions for each shipment state', () => {
    expect(getAvailableFulfillmentActions({ status: 'DRAFT' })).toEqual(['confirm-declare', 'reject-declare']);
    expect(getAvailableFulfillmentActions({ status: 'REVIEW_REJECTED' })).toEqual([]);
    expect(getAvailableFulfillmentActions({ status: 'WAITING_SORT' })).toEqual(['assign-route']);
    expect(getAvailableFulfillmentActions({ status: 'WAITING_DISPATCH' })).toEqual(['confirm-dispatch']);
    expect(getAvailableFulfillmentActions({ status: 'OUTBOUNDED', hasTransferNo: false })).toContain(
      'fill-transfer-no'
    );
    expect(getAvailableFulfillmentActions({ status: 'WAITING_DEPARTURE' })).toEqual(['add-tracking', 'create-problem']);
    expect(getAvailableFulfillmentActions({ status: 'ARRIVED_PORT' })).toEqual(['add-tracking', 'create-problem']);
    expect(getAvailableFulfillmentActions({ status: 'DELIVERING' })).toEqual(['add-tracking', 'create-problem']);
    expect(getAvailableFulfillmentActions({ status: 'SIGNED' })).toEqual([]);
  });

  it('summarizes fulfillment stages by business type', () => {
    const summary = summarizeFulfillmentStages([
      sampleShipment('a', 'EXPRESS', 'DRAFT'),
      sampleShipment('c', 'EXPRESS', 'WAITING_SORT'),
      sampleShipment('d', 'EXPRESS', 'WAITING_DISPATCH'),
      sampleShipment('e', 'EXPRESS', 'OUTBOUNDED'),
      sampleShipment('f', 'EXPRESS', 'PROBLEM'),
      sampleShipment('g', 'SMALL_PACKET', 'DRAFT')
    ]);

    expect(summary).toEqual({
      reviewing: 1,
      declared: 0,
      receiving: 0,
      sorting: 1,
      dispatching: 1,
      online: 1,
      signing: 0,
      exception: 1
    });
  });

  it('summarizes fulfillment stages across all business types for unified dedicated-line view', () => {
    const summary = summarizeFulfillmentStages(
      [
        sampleShipment('a', 'EXPRESS', 'DRAFT'),
        sampleShipment('b', 'SMALL_PACKET', 'OUTBOUNDED'),
        sampleShipment('c', 'DEDICATED_LINE', 'WAITING_SORT'),
        sampleShipment('d', 'DEDICATED_LINE', 'WAITING_DISPATCH'),
        sampleShipment('e', 'SMALL_PACKET', 'WAITING_DEPARTURE'),
        sampleShipment('f', 'EXPRESS', 'PROBLEM')
      ],
      'ALL'
    );

    expect(summary).toEqual({
      reviewing: 1,
      declared: 0,
      receiving: 0,
      sorting: 1,
      dispatching: 1,
      online: 2,
      signing: 0,
      exception: 1
    });
  });

  it('creates AI fulfillment advice for missing transfer number and stale tracking', () => {
    const advice = createFulfillmentAdvice(
      sampleShipment('risk', 'EXPRESS', 'OUTBOUNDED', {
        transferNo: undefined,
        trackingStaleDays: 7,
        hasProblemTicket: true,
        receivableWeightKg: 55,
        agentWeightKg: 53
      })
    );

    expect(advice.priority).toBe('urgent');
    expect(advice.nextAction).toBe('补齐转单号');
    expect(advice.riskReasons).toEqual(expect.arrayContaining(['缺少转单号', '轨迹 7 天未更新', '存在问题件']));
    expect(advice.customerMessage).toContain('我们已优先跟进');
  });

  it('keeps line-shipment problem filter scoped to real problem shipments', () => {
    const result = summarizeLineShipmentPool([
      sampleShipment('problem-status', 'DEDICATED_LINE', 'PROBLEM'),
      sampleShipment('problem-ticket', 'DEDICATED_LINE', 'DELIVERING', { hasProblemTicket: true }),
      sampleShipment('stale-only', 'DEDICATED_LINE', 'WAITING_DISPATCH', { trackingStaleDays: 3 }),
      sampleShipment('missing-transfer', 'DEDICATED_LINE', 'OUTBOUNDED', { transferNo: undefined })
    ], {
      statusGroup: 'PROBLEM',
      datePreset: 'ALL'
    });

    expect(result.statusCounts.PROBLEM).toBe(2);
    expect(result.rows.map((row) => row.shipment.id)).toEqual(expect.arrayContaining(['problem-status', 'problem-ticket']));
    expect(result.metrics.riskCount).toBe(4);
  });

  it('filters line shipments to the latest 30 calendar days', () => {
    const withinThirtyDays = new Date();
    withinThirtyDays.setDate(withinThirtyDays.getDate() - 29);
    const beforeThirtyDays = new Date();
    beforeThirtyDays.setDate(beforeThirtyDays.getDate() - 30);

    const result = summarizeLineShipmentPool([
      sampleShipment('within-thirty-days', 'DEDICATED_LINE', 'WAITING_SORT', { createdAt: withinThirtyDays.toISOString() }),
      sampleShipment('before-thirty-days', 'DEDICATED_LINE', 'WAITING_SORT', { createdAt: beforeThirtyDays.toISOString() })
    ], {
      statusGroup: 'ALL',
      datePreset: 'LAST_30_DAYS'
    });

    expect(result.rows.map((row) => row.shipment.id)).toEqual(['within-thirty-days']);
  });

  it('separates customer-service data confirm and transfer-number pools in line shipments', () => {
    const shipments = [
      sampleShipment('data-confirm', 'DEDICATED_LINE', 'OUTBOUNDED'),
      sampleShipment('transfer-no-outbounded', 'DEDICATED_LINE', 'OUTBOUNDED'),
      sampleShipment('transfer-no-waiting', 'DEDICATED_LINE', 'WAITING_DEPARTURE', { transferNo: 'TRK-001' }),
      sampleShipment('other-status', 'DEDICATED_LINE', 'WAITING_SORT')
    ];

    const options = {
      businessDataApprovedShipmentIds: ['transfer-no-outbounded', 'transfer-no-waiting'],
      agentDataApprovedShipmentIds: ['transfer-no-outbounded', 'transfer-no-waiting']
    };
    const dataConfirm = summarizeLineShipmentPool(shipments, { statusGroup: 'DATA_CONFIRM', datePreset: 'ALL' }, options);
    const transferNo = summarizeLineShipmentPool(shipments, { statusGroup: 'TRANSFER_NO', datePreset: 'ALL' }, options);

    expect(dataConfirm.statusCounts.DATA_CONFIRM).toBe(1);
    expect(dataConfirm.rows.map((row) => row.shipment.id)).toEqual(['data-confirm']);
    expect(transferNo.statusCounts.TRANSFER_NO).toBe(1);
    expect(transferNo.rows.map((row) => row.shipment.id)).toEqual(['transfer-no-outbounded']);
  });

  it('keeps line-shipment after-sale filter scoped to signed problem tickets', () => {
    const shipments = [
      sampleShipment('after-sale', 'DEDICATED_LINE', 'SIGNED', { hasProblemTicket: true }),
      sampleShipment('problem-not-after-sale', 'DEDICATED_LINE', 'DELIVERING', { hasProblemTicket: true }),
      sampleShipment('signed-no-problem', 'DEDICATED_LINE', 'SIGNED')
    ];

    const result = summarizeLineShipmentPool(shipments, { statusGroup: 'AFTER_SALE', datePreset: 'ALL' }, {
      afterSaleShipmentIds: ['after-sale']
    });

    expect(result.statusCounts.AFTER_SALE).toBe(1);
    expect(result.rows.map((row) => row.shipment.id)).toEqual(['after-sale']);
  });

  it('calculates transit time from dispatch to signature and in-transit duration', () => {
    expect(
      calculateTransitTimeLabel(
        sampleShipment('signed', 'EXPRESS', 'SIGNED', {
          dispatchedAt: '2026-06-01T10:00:00.000Z',
          signedAt: '2026-06-04T09:00:00.000Z'
        }),
        '2026-06-06T10:00:00.000Z'
      )
    ).toBe('签收 3 天');

    expect(
      calculateTransitTimeLabel(
        sampleShipment('online', 'EXPRESS', 'WAITING_ONLINE', {
          dispatchedAt: '2026-06-02T10:00:00.000Z'
        }),
        '2026-06-06T10:00:00.000Z'
      )
    ).toBe('在途 4 天');

    expect(calculateTransitTimeLabel(sampleShipment('waiting', 'EXPRESS', 'WAITING_DISPATCH'), '2026-06-06T10:00:00.000Z')).toBe('未出货');
  });

  it('creates bulk tracking updates by keeping latest dated row per order number', () => {
    const shipments = [
      sampleShipment('a', 'EXPRESS', 'WAITING_ONLINE', {
        customerOrderNo: 'OUT-1001',
        systemOrderNo: 'SY1001',
        latestTracking: '旧轨迹'
      }),
      sampleShipment('b', 'EXPRESS', 'WAITING_DISPATCH', {
        customerOrderNo: 'OUT-1002',
        systemOrderNo: 'SY1002',
        latestTracking: '旧轨迹'
      })
    ];

    const result = createBulkTrackingImportResult(
      [
        { customerOrderNo: 'OUT-1001', date: '2026-06-01 09:00', description: '到达处理中心', location: '深圳' },
        { customerOrderNo: 'OUT-1001', date: '2026-06-03 18:00', description: '航班已起飞', location: '香港' },
        { customerOrderNo: 'OUT-1002', date: '2026-06-02', description: '已揽收', location: '广州' },
        { customerOrderNo: 'MISS-1', date: '2026-06-04', description: '未匹配轨迹', location: '上海' }
      ],
      shipments
    );

    expect(result.updates).toEqual([
      {
        shipmentId: 'a',
        customerOrderNo: 'OUT-1001',
        trackingDate: '2026-06-01 09:00',
        latestTracking: '到达处理中心（深圳）',
        description: '到达处理中心',
        location: '深圳',
        rowNumber: 2
      },
      {
        shipmentId: 'a',
        customerOrderNo: 'OUT-1001',
        trackingDate: '2026-06-03 18:00',
        latestTracking: '航班已起飞（香港）',
        description: '航班已起飞',
        location: '香港',
        rowNumber: 3
      },
      {
        shipmentId: 'b',
        customerOrderNo: 'OUT-1002',
        trackingDate: '2026-06-02',
        latestTracking: '已揽收（广州）',
        description: '已揽收',
        location: '广州',
        rowNumber: 4
      }
    ]);
    expect(result.unmatchedOrderNos).toEqual(['MISS-1']);
    expect(result.shipmentPreviews).toEqual(expect.arrayContaining([
      expect.objectContaining({ shipmentId: 'a', trackingCount: 2, latestTracking: '航班已起飞（香港）' }),
      expect.objectContaining({ shipmentId: 'b', trackingCount: 1, latestTracking: '已揽收（广州）' })
    ]));
  });
});

function sampleShipment(
  id: string,
  businessType: 'EXPRESS' | 'SMALL_PACKET' | 'DEDICATED_LINE',
  status: ShipmentStatus,
  overrides: Partial<Shipment> = {}
): Shipment {
  return {
    ...sampleShipmentBase(id, businessType, status),
    ...overrides
  };
}

function sampleShipmentBase(
  id: string,
  businessType: 'EXPRESS' | 'SMALL_PACKET' | 'DEDICATED_LINE',
  status: ShipmentStatus
) {
  return {
    id,
    createdAt: '2026-06-06 10:00',
    customerName: '测试客户',
    customerOrderNo: `CO-${id}`,
    systemOrderNo: `SY-${id}`,
    businessType,
    packageType: 'WPX' as const,
    destinationCountry: '美国',
    carrier: 'DHL',
    packageCount: 1,
    receivableWeightKg: 10,
    agentWeightKg: 10,
    latestTracking: '已预报',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status,
    channelName: 'DHL HK',
    agentName: '宇环',
    hasProblemTicket: false
  };
}

import { describe, expect, it } from 'vitest';
import {
  calculateChargeableWeight,
  calculateQuote,
  createFeeLinesFromQuote,
  summarizeStatement,
  summarizePaymentSettlement,
  canTransitionShipment,
  createAutomationPlan,
  createFulfillmentAdvice,
  getAvailableFulfillmentActions,
  summarizeFulfillmentStages,
  createShipmentInsights,
  getModuleCoverageSummary,
  validateShipmentImportRows,
  createSystemOrderNo,
  createMockTransferNo,
  createMockTrackingStatus,
  type CarrierTaskSummary,
  type AccountLedgerSummary,
  type CustomerAccountSummary,
  type PaymentCreateResponse,
  type PaymentSummary,
  type ShipmentLabelSummary,
  type Shipment,
  ShipmentStatus
} from './index';

describe('shipment state transitions', () => {
  it('allows the happy path from draft to signed', () => {
    const path: ShipmentStatus[] = [
      'DRAFT',
      'DECLARED',
      'WAITING_RECEIVE',
      'WAITING_SORT',
      'WAITING_DISPATCH',
      'WAITING_ONLINE',
      'WAITING_SIGNED',
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
      { rowNumber: 2, field: 'customerOrderNo', message: '客户单号重复' },
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
      currency: 'CNY'
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
      expect.arrayContaining(['运单履约', '报价查价', '财务结算', '问题件中心'])
    );
  });
});

describe('fulfillment workflow rules', () => {
  it('returns executable actions for each shipment state', () => {
    expect(getAvailableFulfillmentActions({ status: 'DECLARED' })).toEqual(['confirm-receive', 'create-problem']);
    expect(getAvailableFulfillmentActions({ status: 'WAITING_SORT' })).toEqual([
      'assign-route',
      'create-problem',
      'mark-return'
    ]);
    expect(getAvailableFulfillmentActions({ status: 'WAITING_DISPATCH', hasTransferNo: false })).toContain(
      'fill-transfer-no'
    );
    expect(getAvailableFulfillmentActions({ status: 'SIGNED' })).toEqual(['add-tracking']);
  });

  it('summarizes fulfillment stages by business type', () => {
    const summary = summarizeFulfillmentStages([
      sampleShipment('a', 'EXPRESS', 'DECLARED'),
      sampleShipment('b', 'EXPRESS', 'WAITING_RECEIVE'),
      sampleShipment('c', 'EXPRESS', 'WAITING_SORT'),
      sampleShipment('d', 'EXPRESS', 'WAITING_DISPATCH'),
      sampleShipment('e', 'EXPRESS', 'WAITING_ONLINE'),
      sampleShipment('f', 'EXPRESS', 'STUCK'),
      sampleShipment('g', 'SMALL_PACKET', 'DECLARED')
    ]);

    expect(summary).toEqual({
      declared: 1,
      receiving: 1,
      sorting: 1,
      dispatching: 1,
      online: 1,
      signing: 0,
      exception: 1
    });
  });

  it('creates AI fulfillment advice for missing transfer number and stale tracking', () => {
    const advice = createFulfillmentAdvice(
      sampleShipment('risk', 'EXPRESS', 'WAITING_ONLINE', {
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

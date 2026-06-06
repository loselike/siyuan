export type BusinessType = 'EXPRESS' | 'SMALL_PACKET' | 'DEDICATED_LINE';

export type ShipmentStatus =
  | 'DRAFT'
  | 'DECLARED'
  | 'WAITING_RECEIVE'
  | 'WAITING_SORT'
  | 'WAITING_DISPATCH'
  | 'WAITING_ONLINE'
  | 'WAITING_SIGNED'
  | 'WAITING_RETURN'
  | 'PROBLEM'
  | 'STUCK'
  | 'SIGNED'
  | 'CANCELLED';

export type RiskLevel = 'low' | 'medium' | 'high';
export type FulfillmentAction =
  | 'confirm-declare'
  | 'confirm-receive'
  | 'assign-route'
  | 'confirm-dispatch'
  | 'fill-transfer-no'
  | 'add-tracking'
  | 'mark-return'
  | 'create-problem';

export interface Shipment {
  id: string;
  createdAt: string;
  customerName: string;
  customerOrderNo: string;
  systemOrderNo: string;
  transferNo?: string;
  businessType: BusinessType;
  packageType: 'DOC' | 'WPX' | 'PAK';
  destinationCountry: string;
  carrier: string;
  packageCount: number;
  receivableWeightKg: number;
  agentWeightKg: number;
  latestTracking: string;
  trackingStaleDays: number;
  isRemoteArea: boolean;
  status: ShipmentStatus;
  channelName: string;
  agentName: string;
  hasProblemTicket: boolean;
}

export type CarrierAdapterCode = 'DHL' | 'FEDEX' | 'UPS' | 'USPS' | 'OTHER';
export type ShipmentLabelStatus = 'CREATED' | 'VOIDED';
export type CarrierTaskStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type CarrierTaskType = 'TRACKING_SYNC';

export interface LabelCreateRequest {
  shipmentId: string;
  carrier: CarrierAdapterCode;
  channelName: string;
}

export interface ShipmentLabelSummary {
  id: string;
  shipmentId: string;
  carrier: CarrierAdapterCode;
  channelName: string;
  labelNo: string;
  transferNo: string;
  labelUrl: string;
  status: ShipmentLabelStatus;
  createdAt: string;
  voidedAt?: string;
}

export interface LabelCreateResponse {
  label: ShipmentLabelSummary;
  shipment: Shipment;
}

export interface CarrierTaskSummary {
  id: string;
  shipmentId: string;
  systemOrderNo: string;
  customerName: string;
  type: CarrierTaskType;
  carrier: CarrierAdapterCode;
  transferNo: string;
  status: CarrierTaskStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CarrierTaskRunResponse {
  task: CarrierTaskSummary;
  shipment: Shipment;
}

export interface ChargeableWeightInput {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  divisor?: number;
}

export interface QuoteInput {
  chargeableWeightKg: number;
  baseRatePerKg: number;
  fuelRate: number;
  surcharges: Array<{ name: string; amount: number }>;
}

export interface QuoteResponse {
  freight: number;
  fuel: number;
  surchargeTotal: number;
  total: number;
}

export interface PricingQuoteRequest extends QuoteInput {
  customerId?: string;
  channelId?: string;
  destinationCountry: string;
}

export interface FeeLineInput {
  name: string;
  amount: number;
}

export interface FeeLineDraft extends FeeLineInput {
  shipmentId: string;
}

export interface ReceivableFeeSummary {
  id: string;
  shipmentId: string;
  systemOrderNo: string;
  customerName: string;
  name: string;
  amount: number;
  settled: boolean;
}

export interface ReceivableAdjustmentInput {
  name: string;
  amount: number;
}

export interface CustomerStatementCreateInput {
  customerId: string;
  periodStart: string;
  periodEnd: string;
}

export interface CustomerStatementSummary {
  id?: string;
  customerId: string;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  total: number;
  feeCount: number;
  status: 'DRAFT' | 'CONFIRMED' | 'SETTLED';
  createdAt?: string;
}

export interface CustomerAccountSummary {
  customerId: string;
  customerName: string;
  balance: number;
  currency: string;
}

export interface PaymentCreateInput {
  customerId: string;
  amount: number;
  feeIds?: string[];
  statementId?: string;
  note?: string;
}

export interface PaymentSummary {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  settledAmount: number;
  remainingAmount: number;
  createdAt: string;
}

export interface AccountLedgerSummary {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  balance: number;
  note?: string;
  createdAt: string;
}

export interface PaymentCreateResponse {
  payment: PaymentSummary;
  account: CustomerAccountSummary;
  settledFees: ReceivableFeeSummary[];
  statement?: CustomerStatementSummary;
}

export interface StatementSummaryInput {
  customerId: string;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  fees: ReceivableFeeSummary[];
}

export interface PaymentSettlementInput {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  settledAmount: number;
  createdAt: string;
}

export interface ShipmentInsightInput {
  status: ShipmentStatus;
  trackingStaleDays: number;
  isRemoteArea: boolean;
  hasProblemTicket: boolean;
  chargeableWeightKg: number;
  carrier: string;
}

export interface ShipmentInsight {
  riskLevel: RiskLevel;
  tags: string[];
  summary: string;
  suggestedActions: string[];
}

export interface ShipmentImportRow {
  customerOrderNo: string;
  destinationCountry: string;
  weightKg: number;
  channelName: string;
}

export interface ShipmentImportError {
  rowNumber: number;
  field: keyof ShipmentImportRow;
  message: string;
}

export interface ShipmentImportValidationResult {
  validRows: ShipmentImportRow[];
  errors: ShipmentImportError[];
}

export interface ShipmentCreateInput {
  customerId?: string;
  customerOrderNo: string;
  businessType: BusinessType;
  packageType: 'DOC' | 'WPX' | 'PAK';
  destinationCountry: string;
  packageCount: number;
  receivableWeightKg: number;
  agentWeightKg?: number;
  channelId?: string;
}

export interface ShipmentImportRequest {
  customerId?: string;
  rows: ShipmentImportRow[];
}

export interface ShipmentImportResponse {
  created: Shipment[];
  errors: ShipmentImportError[];
}

export interface ShipmentActionResponse {
  shipment: Shipment;
  message: string;
}

export interface TrackingEventInput {
  status: string;
  happenedAt: string;
  visibleToCustomer?: boolean;
}

export interface ProblemTicketCreateInput {
  reason: string;
  customerVisible?: boolean;
}

export interface ProblemTicketSummary {
  id: string;
  shipmentId: string;
  systemOrderNo: string;
  customerName: string;
  reason: string;
  status: string;
  customerVisible: boolean;
  createdAt: string;
  closedAt?: string;
  replies: Array<{ id: string; author: string; message: string; createdAt: string }>;
}

export type AutomationPriority = 'urgent' | 'high' | 'normal';

export interface AutomationPlanItem {
  shipmentId: string;
  priority: AutomationPriority;
  title: string;
  actions: string[];
}

export type ProductSurface = '员工端' | '客户端' | 'AI 助手' | '开放集成';
export type ModulePhase = 'phase-one' | 'phase-two';

export interface ProductModule {
  name: string;
  surface: ProductSurface;
  phase: ModulePhase;
  capabilities: string[];
  aiEnhancements: string[];
}

export interface FulfillmentActionContext {
  status: ShipmentStatus;
  hasTransferNo?: boolean;
}

export interface FulfillmentStageSummary {
  declared: number;
  receiving: number;
  sorting: number;
  dispatching: number;
  online: number;
  signing: number;
  exception: number;
}

export interface FulfillmentAdvice {
  priority: AutomationPriority;
  nextAction: string;
  riskReasons: string[];
  customerMessage: string;
}

export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  DRAFT: '草稿',
  DECLARED: '已预报',
  WAITING_RECEIVE: '待收货',
  WAITING_SORT: '待排货',
  WAITING_DISPATCH: '待发货',
  WAITING_ONLINE: '待上网',
  WAITING_SIGNED: '待签收',
  WAITING_RETURN: '待退货',
  PROBLEM: '问题件',
  STUCK: '滞留件',
  SIGNED: '已签收',
  CANCELLED: '已取消'
};

export const businessTypeLabels: Record<BusinessType, string> = {
  EXPRESS: '快递',
  SMALL_PACKET: '小包',
  DEDICATED_LINE: '专线'
};

export const productModules: ProductModule[] = [
  {
    name: '运单履约',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['预报', '导入运单', '收货', '打单', '排货', '发货', '转单号', '退货', '滞留件'],
    aiEnhancements: ['异常优先级排序', '自动生成处理建议', '批量操作风险提示']
  },
  {
    name: '运营工作台',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['业务类型切换', '状态池', '多字段筛选', '批量操作', '轨迹监控'],
    aiEnhancements: ['今日待办摘要', '轨迹超时解释', '客户沟通草稿']
  },
  {
    name: '收货打单',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['收货扫描', '面单生成', '重量复核', '包裹明细'],
    aiEnhancements: ['重量异常识别', '面单信息补全']
  },
  {
    name: '报价查价',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['客户报价', '代理成本价', '分区', '燃油', '附加费', '价格试算'],
    aiEnhancements: ['自然语言查价', '报价差异解释', '推荐最优渠道']
  },
  {
    name: '问题件中心',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['新建问题', '回复查看', '关闭问题', '附件', '客户可见状态'],
    aiEnhancements: ['自动归类问题原因', '生成客户回复', 'SLA 超时提醒']
  },
  {
    name: '财务结算',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['应收费用', '应付费用', '客户对账', '代理对账', '收付款', '核销', '余额流水'],
    aiEnhancements: ['费用差异解释', '欠费风险提示', '对账单摘要']
  },
  {
    name: '统计报表',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['运单报表', '收货统计', '发货统计', '应收应付分析', '利润分析'],
    aiEnhancements: ['经营异常洞察', '利润波动解释']
  },
  {
    name: '基础资料',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['客户', '代理', '承运商', '渠道', '国家地区', '费用名称', '汇率'],
    aiEnhancements: ['资料缺失检查', '渠道配置建议']
  },
  {
    name: '客户门户',
    surface: '客户端',
    phase: 'phase-one',
    capabilities: ['预报运单', '我的运单', '问题件', '价格查询', '费用明细', '对账单', '账户余额'],
    aiEnhancements: ['智能录单', '物流问答', '费用解释']
  },
  {
    name: '系统设置',
    surface: '员工端',
    phase: 'phase-one',
    capabilities: ['公司资料', '模板', '通知', '轨迹规则', '状态字典', '权限'],
    aiEnhancements: ['配置健康检查', '规则冲突提示']
  },
  {
    name: 'AI 助手',
    surface: 'AI 助手',
    phase: 'phase-one',
    capabilities: ['智能录单', '异常解释', '客户回复', '费用问答', '日报生成'],
    aiEnhancements: ['上下文任务编排', '可审计建议记录']
  },
  {
    name: '开放 API',
    surface: '开放集成',
    phase: 'phase-two',
    capabilities: ['代理 API', '承运商 API', '轨迹抓取', '打印套件', '电子秤', 'PDA', '微信入口'],
    aiEnhancements: ['接口失败诊断', '自动重试建议']
  }
];

const allowedTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  DRAFT: ['DECLARED', 'CANCELLED'],
  DECLARED: ['WAITING_RECEIVE', 'CANCELLED'],
  WAITING_RECEIVE: ['WAITING_SORT', 'PROBLEM', 'WAITING_RETURN'],
  WAITING_SORT: ['WAITING_DISPATCH', 'PROBLEM', 'WAITING_RETURN'],
  WAITING_DISPATCH: ['WAITING_ONLINE', 'PROBLEM', 'WAITING_RETURN'],
  WAITING_ONLINE: ['WAITING_SIGNED', 'PROBLEM', 'STUCK', 'WAITING_RETURN'],
  WAITING_SIGNED: ['SIGNED', 'PROBLEM', 'STUCK'],
  WAITING_RETURN: ['CANCELLED'],
  PROBLEM: ['WAITING_RECEIVE', 'WAITING_SORT', 'WAITING_DISPATCH', 'WAITING_ONLINE', 'CANCELLED'],
  STUCK: ['WAITING_ONLINE', 'WAITING_SIGNED', 'PROBLEM'],
  SIGNED: [],
  CANCELLED: []
};

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function calculateChargeableWeight(input: ChargeableWeightInput) {
  const divisor = input.divisor ?? 5000;
  const volumetricWeightKg = round2((input.lengthCm * input.widthCm * input.heightCm) / divisor);
  const chargeableWeightKg = Math.max(input.actualWeightKg, volumetricWeightKg);

  return {
    actualWeightKg: round2(input.actualWeightKg),
    volumetricWeightKg,
    chargeableWeightKg: round2(chargeableWeightKg)
  };
}

export function calculateQuote(input: QuoteInput): QuoteResponse {
  const freight = round2(input.chargeableWeightKg * input.baseRatePerKg);
  const fuel = round2(freight * input.fuelRate);
  const surchargeTotal = round2(input.surcharges.reduce((sum, item) => sum + item.amount, 0));

  return {
    freight,
    fuel,
    surchargeTotal,
    total: round2(freight + fuel + surchargeTotal)
  };
}

export function createFeeLinesFromQuote(
  shipmentId: string,
  quote: QuoteResponse,
  adjustments: FeeLineInput[] = []
): FeeLineDraft[] {
  const lines: FeeLineDraft[] = [
    { shipmentId, name: '基础运费', amount: quote.freight },
    { shipmentId, name: '燃油费', amount: quote.fuel }
  ];

  if (quote.surchargeTotal !== 0) {
    lines.push({ shipmentId, name: '附加费', amount: quote.surchargeTotal });
  }

  for (const adjustment of adjustments) {
    if (adjustment.amount !== 0) {
      lines.push({ shipmentId, name: adjustment.name, amount: round2(adjustment.amount) });
    }
  }

  return lines;
}

export function summarizeStatement(input: StatementSummaryInput): CustomerStatementSummary {
  const unsettledFees = input.fees.filter((fee) => !fee.settled);
  return {
    customerId: input.customerId,
    customerName: input.customerName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    total: round2(unsettledFees.reduce((sum, fee) => sum + fee.amount, 0)),
    feeCount: unsettledFees.length,
    status: 'DRAFT'
  };
}

export function summarizePaymentSettlement(input: PaymentSettlementInput): PaymentSummary {
  return {
    id: input.id,
    customerId: input.customerId,
    customerName: input.customerName,
    amount: round2(input.amount),
    settledAmount: round2(input.settledAmount),
    remainingAmount: round2(input.amount - input.settledAmount),
    createdAt: input.createdAt
  };
}

export function createShipmentInsights(input: ShipmentInsightInput): ShipmentInsight {
  const tags: string[] = [];
  const suggestedActions: string[] = [];
  let score = 0;

  if (input.trackingStaleDays >= 5) {
    score += 3;
    tags.push('轨迹超时');
    suggestedActions.push('优先联系代理确认上网节点');
  } else if (input.trackingStaleDays >= 3) {
    score += 1;
    tags.push('轨迹需关注');
  }

  if (input.isRemoteArea) {
    score += 1;
    tags.push('偏远地区');
    suggestedActions.push('核对偏远费是否已计入报价');
  }

  if (input.hasProblemTicket || input.status === 'PROBLEM') {
    score += 3;
    tags.push('存在问题件');
    suggestedActions.push('查看问题件回复并同步客户');
  }

  if (input.chargeableWeightKg >= 50) {
    score += 1;
    tags.push('大重量');
    suggestedActions.push('复核实重和材积重，避免财务差异');
  }

  const riskLevel: RiskLevel = score >= 5 ? 'high' : score >= 2 ? 'medium' : 'low';
  const summary =
    riskLevel === 'high'
      ? `${input.carrier} 运单存在高风险节点，建议今日优先处理。`
      : riskLevel === 'medium'
        ? `${input.carrier} 运单有可控风险，建议进入跟进队列。`
        : `${input.carrier} 运单暂无明显风险。`;

  return {
    riskLevel,
    tags: tags.length ? tags : ['正常'],
    summary,
    suggestedActions: suggestedActions.length ? suggestedActions : ['保持常规轨迹监控']
  };
}

export function validateShipmentImportRows(rows: ShipmentImportRow[]): ShipmentImportValidationResult {
  const seenOrderNos = new Set<string>();
  const errors: ShipmentImportError[] = [];
  const validRows: ShipmentImportRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const normalizedOrderNo = row.customerOrderNo.trim();
    const rowErrors: ShipmentImportError[] = [];

    if (!normalizedOrderNo) {
      rowErrors.push({ rowNumber, field: 'customerOrderNo', message: '客户单号不能为空' });
    } else if (seenOrderNos.has(normalizedOrderNo)) {
      rowErrors.push({ rowNumber, field: 'customerOrderNo', message: '客户单号重复' });
    }

    if (!row.destinationCountry.trim()) {
      rowErrors.push({ rowNumber, field: 'destinationCountry', message: '目的地国家不能为空' });
    }

    if (!Number.isFinite(row.weightKg) || row.weightKg <= 0) {
      rowErrors.push({ rowNumber, field: 'weightKg', message: '重量必须大于 0' });
    }

    if (!row.channelName.trim()) {
      rowErrors.push({ rowNumber, field: 'channelName', message: '渠道不能为空' });
    }

    if (rowErrors.length === 0) {
      validRows.push({ ...row, customerOrderNo: normalizedOrderNo });
    }

    if (normalizedOrderNo) {
      seenOrderNos.add(normalizedOrderNo);
    }

    errors.push(...rowErrors);
  });

  return { validRows, errors };
}

export function createSystemOrderNo(businessType: BusinessType, date: Date, sequence: number): string {
  const prefixes: Record<BusinessType, string> = {
    EXPRESS: 'GJ',
    SMALL_PACKET: 'XB',
    DEDICATED_LINE: 'ZX'
  };
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const serial = String(sequence).padStart(5, '0');

  return `SY${prefixes[businessType]}${year}${month}${day}${serial}`;
}

export function createMockTransferNo(carrier: CarrierAdapterCode, date: Date, sequence: number): string {
  const prefixes: Record<CarrierAdapterCode, string> = {
    DHL: 'DHL',
    FEDEX: 'FDX',
    UPS: '1Z',
    USPS: 'USPS',
    OTHER: 'SIM'
  };
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const serial = String(sequence).padStart(5, '0');

  return `${prefixes[carrier]}${year}${month}${day}${serial}`;
}

export function createMockTrackingStatus(carrier: CarrierAdapterCode, transferNo: string): string {
  const messages: Record<CarrierAdapterCode, string> = {
    DHL: 'DHL 已揽收',
    FEDEX: 'FEDEX 运输中',
    UPS: 'UPS 运输中',
    USPS: 'USPS 已交邮',
    OTHER: '承运商已接收'
  };
  return `${messages[carrier]} ${transferNo}`;
}

export function createAutomationPlan(shipments: Shipment[]): AutomationPlanItem[] {
  return shipments
    .map((shipment) => {
      const insight = createShipmentInsights({
        status: shipment.status,
        trackingStaleDays: shipment.trackingStaleDays,
        isRemoteArea: shipment.isRemoteArea,
        hasProblemTicket: shipment.hasProblemTicket,
        chargeableWeightKg: shipment.receivableWeightKg,
        carrier: shipment.carrier
      });
      const actions = new Set<string>(insight.suggestedActions);

      if (shipment.hasProblemTicket || shipment.status === 'PROBLEM') {
        actions.add('同步客户异常说明');
      }

      if (Math.abs(shipment.receivableWeightKg - shipment.agentWeightKg) >= 1 || shipment.receivableWeightKg >= 50) {
        actions.add('复核应收/应付费用差异');
      }

      if (!shipment.transferNo && ['WAITING_DISPATCH', 'WAITING_ONLINE', 'WAITING_SIGNED'].includes(shipment.status)) {
        actions.add('补齐转单号后再推进状态');
      }

      const priority: AutomationPriority =
        insight.riskLevel === 'high' ? 'urgent' : insight.riskLevel === 'medium' ? 'high' : 'normal';

      return {
        shipmentId: shipment.id,
        priority,
        title: `${shipment.systemOrderNo} · ${shipment.customerName}`,
        actions: Array.from(actions)
      };
    })
    .sort((a, b) => automationPriorityWeight(b.priority) - automationPriorityWeight(a.priority));
}

export function getAvailableFulfillmentActions(context: FulfillmentActionContext): FulfillmentAction[] {
  const hasTransferNo = context.hasTransferNo ?? true;
  const actionsByStatus: Record<ShipmentStatus, FulfillmentAction[]> = {
    DRAFT: ['confirm-declare', 'create-problem'],
    DECLARED: ['confirm-receive', 'create-problem'],
    WAITING_RECEIVE: ['confirm-receive', 'create-problem', 'mark-return'],
    WAITING_SORT: ['assign-route', 'create-problem', 'mark-return'],
    WAITING_DISPATCH: ['confirm-dispatch', 'add-tracking', 'create-problem'],
    WAITING_ONLINE: ['add-tracking', 'create-problem', 'mark-return'],
    WAITING_SIGNED: ['add-tracking', 'create-problem'],
    WAITING_RETURN: ['add-tracking', 'create-problem'],
    PROBLEM: ['add-tracking', 'mark-return'],
    STUCK: ['add-tracking', 'create-problem', 'mark-return'],
    SIGNED: ['add-tracking'],
    CANCELLED: []
  };
  const actions = actionsByStatus[context.status];

  if (!hasTransferNo && ['WAITING_DISPATCH', 'WAITING_ONLINE', 'WAITING_SIGNED'].includes(context.status)) {
    return ['fill-transfer-no', ...actions.filter((action) => action !== 'fill-transfer-no')];
  }

  return actions;
}

export function summarizeFulfillmentStages(shipments: Shipment[], businessType: BusinessType = 'EXPRESS'): FulfillmentStageSummary {
  const scopedShipments = shipments.filter((shipment) => shipment.businessType === businessType);

  return {
    declared: scopedShipments.filter((shipment) => shipment.status === 'DECLARED').length,
    receiving: scopedShipments.filter((shipment) => shipment.status === 'WAITING_RECEIVE').length,
    sorting: scopedShipments.filter((shipment) => shipment.status === 'WAITING_SORT').length,
    dispatching: scopedShipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH').length,
    online: scopedShipments.filter((shipment) => shipment.status === 'WAITING_ONLINE').length,
    signing: scopedShipments.filter((shipment) => shipment.status === 'WAITING_SIGNED').length,
    exception: scopedShipments.filter((shipment) => ['WAITING_RETURN', 'PROBLEM', 'STUCK'].includes(shipment.status)).length
  };
}

export function createFulfillmentAdvice(shipment: Shipment): FulfillmentAdvice {
  const riskReasons: string[] = [];

  if (!shipment.transferNo && ['WAITING_DISPATCH', 'WAITING_ONLINE', 'WAITING_SIGNED'].includes(shipment.status)) {
    riskReasons.push('缺少转单号');
  }

  if (shipment.trackingStaleDays >= 3) {
    riskReasons.push(`轨迹 ${shipment.trackingStaleDays} 天未更新`);
  }

  if (shipment.hasProblemTicket || shipment.status === 'PROBLEM') {
    riskReasons.push('存在问题件');
  }

  if (Math.abs(shipment.receivableWeightKg - shipment.agentWeightKg) >= 1) {
    riskReasons.push('计费重量差异');
  }

  const priority: AutomationPriority =
    riskReasons.length >= 3 || shipment.trackingStaleDays >= 7 ? 'urgent' : riskReasons.length >= 1 ? 'high' : 'normal';
  const nextAction = !shipment.transferNo && ['WAITING_DISPATCH', 'WAITING_ONLINE', 'WAITING_SIGNED'].includes(shipment.status)
    ? '补齐转单号'
    : shipment.hasProblemTicket || shipment.status === 'PROBLEM'
      ? '处理问题件'
      : shipment.trackingStaleDays >= 3
        ? '跟进轨迹'
        : nextActionFromStatus(shipment.status);

  return {
    priority,
    nextAction,
    riskReasons: riskReasons.length ? riskReasons : ['暂无明显异常'],
    customerMessage:
      priority === 'urgent'
        ? `您好，${shipment.systemOrderNo} 我们已优先跟进，将同步最新处理进展。`
        : `您好，${shipment.systemOrderNo} 当前节点为${shipmentStatusLabels[shipment.status]}，我们会持续跟进。`
  };
}

export function getModuleCoverageSummary() {
  return {
    totalModules: productModules.length,
    surfaces: Array.from(new Set(productModules.map((module) => module.surface))),
    phaseOneModules: productModules.filter((module) => module.phase === 'phase-one').map((module) => module.name),
    phaseTwoModules: productModules.filter((module) => module.phase === 'phase-two').map((module) => module.name)
  };
}

export function summarizeStatusCounts(shipments: Shipment[]) {
  return Object.keys(shipmentStatusLabels).reduce(
    (summary, status) => ({
      ...summary,
      [status]: shipments.filter((shipment) => shipment.status === status).length
    }),
    {} as Record<ShipmentStatus, number>
  );
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function automationPriorityWeight(priority: AutomationPriority): number {
  return priority === 'urgent' ? 3 : priority === 'high' ? 2 : 1;
}

function nextActionFromStatus(status: ShipmentStatus): string {
  const labels: Partial<Record<ShipmentStatus, string>> = {
    DRAFT: '确认预报',
    DECLARED: '确认收货',
    WAITING_RECEIVE: '确认收货',
    WAITING_SORT: '分配渠道',
    WAITING_DISPATCH: '确认发货',
    WAITING_ONLINE: '跟进上网',
    WAITING_SIGNED: '跟进签收',
    WAITING_RETURN: '处理退货',
    STUCK: '处理滞留',
    SIGNED: '归档',
    CANCELLED: '无需处理'
  };

  return labels[status] ?? '处理异常';
}

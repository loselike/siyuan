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

export function calculateQuote(input: QuoteInput) {
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

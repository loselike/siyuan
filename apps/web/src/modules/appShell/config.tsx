import type { ReactNode } from 'react';
import type { ThemeConfig } from 'antd/es/config-provider/context';
import { Activity, Boxes, CircleDollarSign, Gauge, Headphones, Landmark, PackagePlus, Route, Settings, Truck, Users } from 'lucide-react';
import {
  summarizeFulfillmentStages,
  type BusinessType,
  type MasterDataSnapshot,
  type Shipment,
  type ShipmentStatus,
  type StaffGender,
  type StaffMenuKey
} from '@siyuan/shared';
import { orderAuditStages, type OrdersAuditStageKey } from '../orders/OrdersPage';

export const demoOperationalNow = '2026-06-06T10:00:00.000Z';
export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2458d3',
    colorInfo: '#2458d3',
    colorSuccess: '#2f7d32',
    colorWarning: '#b76e00',
    colorError: '#c9351d',
    colorText: '#142033',
    colorTextSecondary: '#5f6f86',
    colorBorder: '#d6e0ec',
    colorBgLayout: '#eef3f8',
    colorBgContainer: '#ffffff',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    controlHeight: 38
  },
  components: {
    Button: {
      borderRadius: 7,
      controlHeight: 38
    },
    Card: {
      borderRadiusLG: 8,
      paddingLG: 22
    },
    Input: {
      borderRadius: 7,
      controlHeight: 38
    },
    InputNumber: {
      borderRadius: 7,
      controlHeight: 38
    },
    Table: {
      borderColor: '#dfe7f1',
      headerBg: '#f5f8fc',
      headerColor: '#1f2d43',
      rowHoverBg: '#f7fbff'
    },
    Tag: {
      borderRadiusSM: 5
    }
  }
};

export const staffGenderOptions: Array<{ label: string; value: StaffGender }> = [
  { label: '未填写', value: 'UNKNOWN' },
  { label: '男', value: 'MALE' },
  { label: '女', value: 'FEMALE' },
  { label: '其他', value: 'OTHER' }
];

export function getStaffGenderLabel(gender?: string) {
  return staffGenderOptions.find((item) => item.value === gender)?.label ?? '未填写';
}

export function getPasswordStrengthErrorForUi(password?: string) {
  const value = password ?? '';
  if (value.length < 8) {
    return '密码长度需大于或等于 8 位';
  }
  const typeCount = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^a-zA-Z0-9]/.test(value)
  ].filter(Boolean).length;
  if (typeCount < 3) {
    return '密码至少包含大写字母、小写字母、数字、特殊字符中的 3 类';
  }
  return undefined;
}

export function passwordStrengthRule() {
  return {
    validator(_: unknown, value?: string) {
      const error = getPasswordStrengthErrorForUi(value);
      return error ? Promise.reject(new Error(error)) : Promise.resolve();
    }
  };
}

export type ShipmentColumnOrderMode = 'default' | 'customerFirst' | 'agentFirst' | 'custom';
export type ShipmentColumnKey =
  | 'createdAt'
  | 'customerName'
  | 'salesperson'
  | 'systemOrderNo'
  | 'transferNo'
  | 'destinationCountry'
  | 'channel'
  | 'agent'
  | 'packageCount'
  | 'weight'
  | 'latestTracking'
  | 'status'
  | 'transitTime'
  | 'paymentAmount'
  | 'paymentCurrency'
  | 'paymentMethod'
  | 'remark';

export const shipmentColumnOrderStorageKey = 'siyuan-shipment-column-order-mode';
export const shipmentCustomColumnOrderStorageKey = 'siyuan-shipment-custom-column-order';
export const shipmentHiddenColumnsStorageKey = 'siyuan-shipment-hidden-columns';
export const defaultShipmentColumnOrder: ShipmentColumnKey[] = [
  'createdAt',
  'customerName',
  'salesperson',
  'systemOrderNo',
  'transferNo',
  'destinationCountry',
  'channel',
  'agent',
  'packageCount',
  'weight',
  'latestTracking',
  'status',
  'transitTime',
  'paymentAmount',
  'paymentCurrency',
  'paymentMethod',
  'remark'
];
export const defaultHiddenShipmentColumns: ShipmentColumnKey[] = [];
export const shipmentColumnOrderOptions: Array<{ value: ShipmentColumnOrderMode; label: string }> = [
  { value: 'default', label: '默认顺序' },
  { value: 'customerFirst', label: '客户优先' },
  { value: 'agentFirst', label: '代理优先' },
  { value: 'custom', label: '自定义顺序' }
];
export const shipmentColumnOrders: Record<ShipmentColumnOrderMode, ShipmentColumnKey[]> = {
  default: defaultShipmentColumnOrder,
  customerFirst: [
    'customerName',
    'salesperson',
    'systemOrderNo',
    'transferNo',
    'createdAt',
    'destinationCountry',
    'channel',
    'agent',
    'packageCount',
    'weight',
    'latestTracking',
    'status',
    'transitTime',
    'paymentAmount',
    'paymentCurrency',
    'paymentMethod',
    'remark'
  ],
  agentFirst: [
    'agent',
    'channel',
    'salesperson',
    'customerName',
    'systemOrderNo',
    'transferNo',
    'destinationCountry',
    'createdAt',
    'packageCount',
    'weight',
    'latestTracking',
    'status',
    'transitTime',
    'paymentAmount',
    'paymentCurrency',
    'paymentMethod',
    'remark'
  ],
  custom: defaultShipmentColumnOrder
};
export const shipmentColumnLabels: Record<ShipmentColumnKey, string> = {
  createdAt: '创建时间',
  customerName: '客户名称',
  salesperson: '业务员归属',
  systemOrderNo: '运单号',
  transferNo: '转单号',
  destinationCountry: '目的地',
  channel: '渠道',
  agent: '代理',
  packageCount: '件数',
  weight: '应收/代理计费重',
  latestTracking: '最新轨迹',
  status: '状态',
  transitTime: '时效',
  paymentAmount: '收款金额',
  paymentCurrency: '收款币种',
  paymentMethod: '收款方式',
  remark: '备注'
};

export function isShipmentColumnOrderMode(value: string | null): value is ShipmentColumnOrderMode {
  return value === 'default' || value === 'customerFirst' || value === 'agentFirst' || value === 'custom';
}

export function sanitizeShipmentColumnOrder(value: unknown): ShipmentColumnKey[] {
  if (!Array.isArray(value)) {
    return defaultShipmentColumnOrder;
  }
  const known = value.filter((key): key is ShipmentColumnKey => defaultShipmentColumnOrder.includes(key as ShipmentColumnKey));
  const missing = defaultShipmentColumnOrder.filter((key) => !known.includes(key));
  return [...known, ...missing];
}

export function sanitizeHiddenShipmentColumns(value: unknown): ShipmentColumnKey[] {
  if (!Array.isArray(value)) {
    return defaultHiddenShipmentColumns;
  }
  return value.filter((key): key is ShipmentColumnKey => defaultShipmentColumnOrder.includes(key as ShipmentColumnKey));
}


export const emptyMasterData: MasterDataSnapshot = {
  customers: [],
  contacts: [],
  customerUsers: [],
  agents: [],
  agentChannels: [],
  carriers: [],
  channelCategories: [],
  channels: [],
  surcharges: [],
  fuelRates: [],
  exchangeRates: [],
  roles: []
};

export const statusOrder: ShipmentStatus[] = [
  'DRAFT',
  'REVIEW_REJECTED',
  'WAITING_SORT',
  'WAITING_DISPATCH',
  'OUTBOUNDED',
  'WAITING_DEPARTURE',
  'DEPARTED',
  'ARRIVED_PORT',
  'DELIVERING',
  'PROBLEM',
  'SIGNED'
];

export const editableShipmentStatuses: ShipmentStatus[] = [
  'DRAFT',
  'REVIEW_REJECTED',
  'WAITING_SORT',
  'WAITING_DISPATCH',
  'OUTBOUNDED',
  'WAITING_DEPARTURE',
  'DEPARTED',
  'ARRIVED_PORT',
  'DELIVERING',
  'PROBLEM',
  'SIGNED',
  'CANCELLED'
];

export const menuItems: Array<{ key: StaffMenuKey; icon: ReactNode; label: string }> = [
  { key: 'workspace', icon: <Gauge size={16} />, label: '运营工作台' },
  { key: 'pricing', icon: <CircleDollarSign size={16} />, label: '报价查价' },
  { key: 'business', icon: <Boxes size={16} />, label: '业务管理' },
  { key: 'receive', icon: <PackagePlus size={16} />, label: '仓库管理' },
  { key: 'market', icon: <Route size={16} />, label: '市场管理' },
  { key: 'customerService', icon: <Headphones size={16} />, label: '客服管理' },
  { key: 'logisticsTracking', icon: <Truck size={16} />, label: '物流轨迹管理' },
  { key: 'finance', icon: <Landmark size={16} />, label: '财务管理' },
  { key: 'master', icon: <Users size={16} />, label: '基础资料库' },
  { key: 'settings', icon: <Settings size={16} />, label: '系统管理' }
];

export const importCheckRows = [
  { customerOrderNo: 'AI-0606-001', destinationCountry: '美国', weightKg: 2.4, channelName: 'USPS 小包线' },
  { customerOrderNo: 'AI-0606-001', destinationCountry: '德国', weightKg: 1.2, channelName: 'DHL HK' },
  { customerOrderNo: 'AI-0606-003', destinationCountry: '', weightKg: -1, channelName: '' }
];

export type MenuKey = StaffMenuKey;
export type FulfillmentStageKey = 'all' | 'reviewing' | 'declared' | 'receiving' | 'sorting' | 'dispatching' | 'online' | 'signing' | 'exception';
export const businessWorkspaceConfigs: Record<
  BusinessType,
  {
    description: string;
    metrics: Array<{ title: string; extra?: string }>;
    batchActions: string[];
    assistantCopy: string;
    focusTitle: string;
    focusItems: Array<{ title: string; description: string }>;
  }
> = {
  EXPRESS: {
    description: '快递业务聚焦商业快件、转单号、偏远识别、渠道排货和上网签收时效。',
    metrics: [
      { title: '待处理运单' },
      { title: '轨迹风险', extra: 'DHL / FedEx / UPS 自动识别' },
      { title: '预计应收', extra: '含燃油与偏远附加费' },
      { title: '今日签收率', extra: '快件妥投表现' }
    ],
    batchActions: ['批量修改', '复制运单', '获取转单号', '日终处理', '新建问题', '回复/查看', '单证审核', '添加轨迹', '轨迹对接设置'],
    assistantCopy: '用自然语言批量生成运单、解释快递报价差异、总结问题件、自动生成客户回复。',
    focusTitle: '快递作业重点',
    focusItems: [
      { title: '转单号', description: 'DHL、FedEx、UPS 转单号获取与补录' },
      { title: '偏远/附加费', description: '识别偏远、燃油、超长超重等附加成本' },
      { title: '上网签收', description: '跟进离港、上网、妥投和退件节点' }
    ]
  },
  SMALL_PACKET: {
    description: '轻小件批量预报、邮袋交接、挂号/平邮转单和上网时效跟进。',
    metrics: [
      { title: '待处理小包' },
      { title: '上网风险', extra: '超过 5 天未上网自动识别' },
      { title: '预估运费' },
      { title: '今日交邮率', extra: '邮袋交接完成度' }
    ],
    batchActions: ['批量预报', '邮袋交接', '挂号转单号', '平邮批量上网', '重量分段复核', '批量添加轨迹', '新建问题', '客户通知'],
    assistantCopy: '',
    focusTitle: '小包作业重点',
    focusItems: [
      { title: '邮袋交接', description: '按客户批次、邮袋号、目的国集中交邮' },
      { title: '克重分段', description: '按 0-2kg 小包克重段复核成本与报价' },
      { title: '挂号/平邮', description: '区分可追踪挂号和平邮上网策略' }
    ]
  },
  DEDICATED_LINE: {
    description: '',
    metrics: [
      { title: '待处理运单' },
      { title: '履约风险', extra: '转单、清关、尾程、轨迹异常' },
      { title: '预计应收', extra: '运费、燃油、偏远和派送费合计' },
      { title: '今日完成率', extra: '上网、签收、入仓综合表现' }
    ],
    batchActions: ['批量装板', '排舱确认', '生成装箱单', '头程发货', '尾程转单', '清关资料审核', '新建问题', '添加轨迹'],
    assistantCopy: '',
    focusTitle: '专线聚合作业重点',
    focusItems: [
      { title: '装板/排舱', description: '按航线、板位、仓库批次确认头程计划' },
      { title: '清关资料', description: '审核箱单、发票、品名、税号和查验资料' },
      { title: '尾程转单', description: '补齐 UPS/FedEx/本地卡派尾程单号' }
    ]
  }
};

export const routingFulfillmentStages: Array<{ key: FulfillmentStageKey; label: string; statuses: ShipmentStatus[] }> = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'sorting', label: '待排货', statuses: ['WAITING_SORT'] },
  { key: 'dispatching', label: '待出库', statuses: ['WAITING_DISPATCH'] }
];

export function getRouteCategory(channelName: string) {
  return channelName.trim().split(/[\s/-]+/)[0] || channelName;
}

export function getFulfillmentStageCount(summary: ReturnType<typeof summarizeFulfillmentStages>, stageKey: FulfillmentStageKey) {
  if (stageKey === 'all') {
    return Object.values(summary).reduce((total, count) => total + count, 0);
  }

  return summary[stageKey];
}

export function getFulfillmentAuditStageCount(shipments: Shipment[], stageKey: OrdersAuditStageKey) {
  const stage = orderAuditStages.find((item) => item.key === stageKey);
  return stage ? shipments.filter(stage.predicate).length : 0;
}

export interface ModulePageConfig {
  title: string;
  description: string;
  capabilities: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
  queue: Array<{ item: string; owner: string; status: string }>;
  stats: Array<{ label: string; value: string; helper: string }>;
  records: Array<{ primary: string; secondary: string; metric: string; status: string }>;
}

export const modulePageConfigs: Partial<Record<MenuKey, ModulePageConfig>> = {
  receive: {
    title: '仓库管理中心',
    description: '覆盖包裹件重尺、理货合并拆分、面单队列&待仓库出货和交接资料，作为仓库作业主入口。',
    capabilities: ['包裹明细', '理货管理', '面单队列&待仓库出货', '收货交接单'],
    aiEnhancements: ['重量异常识别', '面单信息补全', '重复扫描提醒'],
    siliconFlowScenarios: ['识别预报重量与实重差异', '根据品名补全面单申报要素', '生成异常入库内部说明'],
    stats: [
      { label: '待出库', value: '18', helper: '渠道确认后等待仓库处理' },
      { label: '待理货', value: '9', helper: '分批到仓待合并' },
      { label: '收货异常', value: '3', helper: '件重尺或资料待复核' }
    ],
    records: [
      { primary: 'OUT-0606-001', secondary: '9409-Daloday / SYGJ06061230001 / 待仓库出库', metric: '实重 2.36kg / 预报 2.10kg', status: '待出库' },
      { primary: '面单生成批次 LBL-0606-US', secondary: '美国 USPS 小包线 / 6 票', metric: '已生成 4 / 待补 2', status: '待补申报' },
      { primary: '重量复核 WR-0606-02', secondary: 'SYGJ06059409051 / 德国', metric: '材积重 3.20kg', status: '待复核' }
    ],
    queue: [
      { item: 'SYGJ06061230001', owner: '仓库一组', status: '待扫描' },
      { item: 'SYGJ06059409051', owner: '仓库二组', status: '待复重' }
    ]
  },
  routing: {
    title: '渠道排货中心',
    description: '沉淀手动排货、规则排货、代理分配、承运商选择和转单号获取能力。',
    capabilities: ['规则排货', '手动分配渠道', '代理/承运商选择', '转单号获取', '排货日志'],
    aiEnhancements: ['推荐最优渠道', '批量操作风险提示', '渠道配置建议'],
    siliconFlowScenarios: ['按国家/重量/时效推荐渠道', '解释成本倒挂原因', '生成批量排货风险提示'],
    stats: [
      { label: '待排货', value: '21', helper: '需要渠道/代理确认' },
      { label: '缺转单号', value: '7', helper: '可手工补齐或模拟获取' },
      { label: '成本预警', value: '2', helper: '报价低于代理成本' }
    ],
    records: [
      { primary: 'DHL HK 优先', secondary: '美国 2-5kg / 时效 4-7 天', metric: '预计利润 ¥38.60/票', status: '推荐' },
      { primary: 'UPS 加美线', secondary: '加拿大 5-20kg / 代理 宇环', metric: '成本 ¥31.20/kg', status: '待确认' },
      { primary: 'FedEx AU 促销', secondary: '澳大利亚偏远区需附加费', metric: '偏远费 ¥95.00', status: '需复核' }
    ],
    queue: [
      { item: 'FEDEX AU 促销', owner: '操作主管', status: '待确认成本' },
      { item: '英国 FBA 空派', owner: '专线组', status: '待排舱' }
    ]
  },
  tracking: {
    title: '轨迹监控中心',
    description: '集中处理轨迹录入、轨迹同步、未上网、长时间未更新和客户可见轨迹。',
    capabilities: ['轨迹列表', '手工添加轨迹', '轨迹未更新监控', '客户可见轨迹', '轨迹规则'],
    aiEnhancements: ['轨迹超时解释', '客户沟通草稿', '接口失败诊断'],
    siliconFlowScenarios: ['解释轨迹超过 3 天未更新', '生成客户可见延误说明', '诊断承运商接口失败原因'],
    stats: [
      { label: '未更新', value: '12', helper: '超过 5 天无新轨迹' },
      { label: '待离港', value: '6', helper: '已出库待补齐离港节点' },
      { label: '客户可见', value: '48', helper: '今日同步轨迹条数' }
    ],
    records: [
      { primary: '9064656160', secondary: 'SYGJ05291344165 / 客户可见轨迹 / USPS 小包线', metric: '9 天未更新', status: '高风险' },
      { primary: 'SYGJ06061230003', secondary: '清关延误 / 德国 DHL', metric: '最后轨迹：到达目的国', status: '需说明' },
      { primary: 'TRK-0606-MANUAL', secondary: '手工轨迹：航班起飞', metric: '同步 14 票', status: '待发布' }
    ],
    queue: [
      { item: 'SYGJ05291344165', owner: '客服组', status: '超时跟进' },
      { item: 'SYGJ06061230003', owner: '异常组', status: '清关延误' }
    ]
  },
  problems: {
    title: '问题件中心',
    description: '管理问题件新建、回复、关闭、附件和客户可见状态。',
    capabilities: ['新建问题', '回复查看', '关闭问题', '附件', '客户可见状态'],
    aiEnhancements: ['自动归类问题原因', '生成客户回复', 'SLA 超时提醒'],
    siliconFlowScenarios: ['按原因归类问题件', '生成客户回复草稿', '总结问题件关闭说明'],
    stats: [
      { label: '待回复', value: '8', helper: '客户可见问题件' },
      { label: '待关闭', value: '5', helper: '内部已处理待复核' },
      { label: 'SLA 超时', value: '2', helper: '超过承诺响应时间' }
    ],
    records: [
      { primary: '轨迹超过3天未更新', secondary: 'SYGJ05291344165 / 客户可见 / 代理待回复', metric: 'SLA 18h', status: '待员工回复' },
      { primary: '清关资料缺失', secondary: 'SYGJ06061230003 / 客户可见', metric: 'SLA 18h', status: '待客户回复' },
      { primary: '客户退件：不出', secondary: 'SYGJ06059409051 / 内部处理', metric: '附件 2 个', status: '待关闭' },
      { primary: '重量差异申诉', secondary: '9409-Daloday / 收货复重', metric: '差异 0.42kg', status: '待员工回复' }
    ],
    queue: [
      { item: '清关资料待客户补充', owner: '客服组', status: '待客户回复' },
      { item: '客户退件：不出', owner: '操作组', status: '待关闭' }
    ]
  },
  pricing: {
    title: '报价查价中心',
    description: '按已维护的代理价格表和加价规则，为业务员快速生成可对外报价。',
    capabilities: ['亚马逊查价', '欧洲海运超大件查价', '欧洲空海运铁路快递查价', '南非专线查价', '业务员报价'],
    aiEnhancements: ['解释报价匹配条件', '提醒低毛利报价', '生成客户报价话术'],
    siliconFlowScenarios: ['解释当前报价匹配依据', '生成客户报价文案', '识别报价条件缺失'],
    stats: [
      { label: '今日试算', value: '34', helper: '客户与销售查价' },
      { label: '报价产品', value: '16', helper: '按渠道/国家/分区' },
      { label: '待复核价', value: '4', helper: '燃油或偏远费变动' }
    ],
    records: [
      { primary: '美国 2.4kg', secondary: 'DHL HK / 分区 US-2 / 燃油附加费 18%', metric: '¥96.80', status: '可报价' },
      { primary: '美国 12kg DHL', secondary: '分区 US-2 / 燃油 18%', metric: '¥410.00', status: '可报价' },
      { primary: '德国 3kg 小包', secondary: 'DHL Paket / 普货', metric: '¥128.50', status: '含挂号费' },
      { primary: '澳大利亚偏远费', secondary: '邮编 6714 / FedEx AU', metric: '¥95.00', status: '需提示客户' }
    ],
    queue: [
      { item: '美国 DHL 12kg 试算', owner: '销售组', status: '待报价' },
      { item: '澳大利亚偏远费', owner: '财务组', status: '待复核' }
    ]
  },
  finance: {
    title: '财务结算中心',
    description: '闭环应收、应付、对账、收付款、核销和余额流水。',
    capabilities: ['应收费用', '应付费用', '客户对账', '代理对账', '收付款', '核销', '余额流水'],
    aiEnhancements: ['费用差异解释', '欠费风险提示', '对账单摘要'],
    siliconFlowScenarios: ['解释应收应付差异', '生成客户对账单摘要', '识别欠费与超授信风险'],
    stats: [
      { label: '应收', value: '¥18,642', helper: '今日已生成费用' },
      { label: '应付', value: '¥13,908', helper: '代理/承运商成本' },
      { label: '待核销', value: '11', helper: '收付款未匹配' }
    ],
    records: [
      { primary: 'INV-202606-9409', secondary: '9409-Daloday / 客户对账 / 应收 ¥1,864.20', metric: '利润 ¥356.80', status: '待核销' },
      { primary: '宇环代理账单', secondary: '代理对账 / DHL HK 38 票', metric: '应付 ¥7,230.60', status: '待确认' },
      { primary: '客户充值 PAY-0606-01', secondary: '银行转账 / 财务已认领', metric: '¥5,000.00', status: '待入账' }
    ],
    queue: [
      { item: '9409-Daloday 应收', owner: '财务组', status: '待核销' },
      { item: '宇环代理账单', owner: '财务组', status: '待对账' }
    ]
  },
  reports: {
    title: '统计报表中心',
    description: '提供运单、收货、发货、应收应付和利润分析报表。',
    capabilities: ['运单报表', '收货统计', '发货统计', '应收应付分析', '利润分析'],
    aiEnhancements: ['经营异常洞察', '利润波动解释', '日报生成'],
    siliconFlowScenarios: ['生成运营日报', '解释利润波动', '识别收发货异常趋势'],
    stats: [
      { label: '今日发货', value: '46', helper: '快递/小包/专线合计' },
      { label: '今日收货', value: '58', helper: '仓库扫描完成' },
      { label: '利润率', value: '18.6%', helper: '按已发货费用估算' }
    ],
    records: [
      { primary: '日报-2026-06-06', secondary: '快递 31 / 小包 10 / 专线 5', metric: '利润率 18.6%', status: '可导出' },
      { primary: '收货统计 RCV-0606', secondary: '仓库一组 34 / 仓库二组 24', metric: '异常 3 票', status: '已汇总' },
      { primary: '应收应付分析', secondary: '应收 ¥18,642 / 应付 ¥13,908', metric: '毛利 ¥4,734', status: '待复核' }
    ],
    queue: [
      { item: '今日发货统计', owner: '运营主管', status: '可生成' },
      { item: '本周利润分析', owner: '管理层', status: '待汇总' }
    ]
  },
  master: {
    title: '基础资料中心',
    description: '维护客户、代理、承运商、渠道、国家地区、费用名称和汇率。',
    capabilities: ['客户', '代理', '承运商', '渠道', '国家地区', '费用名称', '汇率'],
    aiEnhancements: ['资料缺失检查', '渠道配置建议', '规则冲突提示'],
    siliconFlowScenarios: ['识别客户资料缺失', '检查渠道配置冲突', '生成资料维护建议'],
    stats: [
      { label: '客户', value: '126', helper: '启用 118 / 停用 8' },
      { label: '渠道', value: '42', helper: '绑定代理与承运商' },
      { label: '汇率', value: '7.2450', helper: 'USD 对 RMB' }
    ],
    records: [
      { primary: '9409-Daloday', secondary: '客户 / 月结 / 联系人 Lina', metric: '授信 ¥50,000', status: '启用' },
      { primary: 'HKD01 代理价', secondary: '代理 宇环 / DHL HK 成本', metric: '更新 2026-06-06', status: '待更新' },
      { primary: 'USPS 小包线', secondary: '承运商 USPS / 国家 美国', metric: '材积 6000', status: '启用' }
    ],
    queue: [
      { item: 'HKD01 成本价更新', owner: '产品组', status: '待更新' },
      { item: '客户联系人', owner: '客服组', status: '缺资料' }
    ]
  },
  settings: {
    title: '系统设置中心',
    description: '承载公司资料、模板、通知、轨迹规则、状态字典和权限设置。',
    capabilities: ['公司资料', '模板', '通知', '轨迹规则', '状态字典', '权限'],
    aiEnhancements: ['配置健康检查', '规则冲突提示', '权限风险提示'],
    siliconFlowScenarios: ['检查权限冲突', '解释角色权限差异', '生成系统配置变更说明'],
    stats: [
      { label: '员工角色', value: '5', helper: '管理员/客服/业务员/仓库/财务' },
      { label: '模板', value: '14', helper: '面单、通知、对账单' },
      { label: '审计项', value: '9', helper: '高风险操作写日志' }
    ],
    records: [
      { primary: '状态字典', secondary: '待审核 -> 待排货 -> 待出库 -> 已出库', metric: '新链路状态', status: '启用' },
      { primary: '转单提醒', secondary: '已出库超过 2 天且缺转单号', metric: '影响 7 票', status: '已开启' },
      { primary: '财务核销权限', secondary: '仅 ADMIN / FINANCE 可操作', metric: '2 个角色', status: '需审计' }
    ],
    queue: [
      { item: '轨迹规则', owner: '管理员', status: '待检查' },
      { item: '角色权限', owner: '管理员', status: '待复核' }
    ]
  }
};

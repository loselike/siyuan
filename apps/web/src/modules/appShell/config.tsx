import type { ReactNode } from 'react';
import type { ThemeConfig } from 'antd/es/config-provider/context';
import { Boxes, CircleDollarSign, Gauge, Headphones, Landmark, PackagePlus, Route, Settings, Truck, Users } from 'lucide-react';
import {
  type BusinessType,
  type MasterDataSnapshot,
  type Shipment,
  type ShipmentStatus,
  type StaffGender,
  type StaffMenuKey
} from '@siyuan/shared';
import { orderLifecycleStages, type OrdersLifecycleStageKey } from '../orders/OrdersPage';

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
  systemOrderNo: '出货单号',
  transferNo: '转单号',
  destinationCountry: '目的地',
  channel: '渠道',
  agent: '代理',
  packageCount: '件数',
  weight: '应收/代理计费重',
  latestTracking: '最新物流轨迹',
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

export interface StaffAppRoute {
  menuKey: MenuKey;
  sectionKey?: string;
}

const staffMenuRouteSegments: Record<MenuKey, string> = {
  workspace: 'workspace',
  business: 'business',
  orders: 'business',
  receive: 'warehouse',
  market: 'market',
  routing: 'market',
  customerService: 'customer-service',
  tracking: 'tracking',
  logisticsTracking: 'tracking',
  problems: 'customer-service',
  pricing: 'pricing',
  finance: 'finance',
  reports: 'workspace',
  master: 'master',
  settings: 'settings'
};

const routeSegmentAliases: Record<string, MenuKey> = {
  workspace: 'workspace',
  pricing: 'pricing',
  business: 'business',
  warehouse: 'receive',
  market: 'market',
  'customer-service': 'customerService',
  tracking: 'logisticsTracking',
  finance: 'finance',
  master: 'master',
  settings: 'settings'
};

const sectionRouteAliases: Partial<Record<MenuKey, Record<string, string>>> = {
  pricing: { lookup: 'quote', priceBooks: 'price-books' },
  receive: { packages: 'in-stock', consolidation: 'pending-tally', 'completed-consolidation': 'completed-tally', queue: 'pending-dispatch' },
  finance: { 'payment-applications': 'pending-payment' }
};

function toRouteSegment(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function getStaffModuleHref(menuKey: MenuKey) {
  return `/app/${staffMenuRouteSegments[menuKey]}`;
}

export function getStaffSectionHref(menuKey: MenuKey, sectionKey?: string) {
  const moduleHref = getStaffModuleHref(menuKey);
  if (!sectionKey) return moduleHref;
  const configuredSegment = sectionRouteAliases[menuKey]?.[sectionKey];
  return `${moduleHref}/${configuredSegment ?? toRouteSegment(sectionKey)}`;
}

export function parseStaffAppRoute(pathname: string): StaffAppRoute | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'app' || !parts[1]) return null;
  const menuKey = routeSegmentAliases[parts[1]];
  if (!menuKey) return null;
  return { menuKey, sectionKey: parts[2] };
}

export function resolveStaffSectionKey(menuKey: MenuKey, sectionSegment: string | undefined, sectionKeys: string[]) {
  if (!sectionSegment) return undefined;
  const aliases = sectionRouteAliases[menuKey] ?? {};
  const aliasMatch = Object.entries(aliases).find(([, segment]) => segment === sectionSegment)?.[0];
  if (aliasMatch && sectionKeys.includes(aliasMatch)) return aliasMatch;
  return sectionKeys.find((key) => toRouteSegment(key) === sectionSegment);
}

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

export function getRouteCategory(channelName: string) {
  return channelName.trim().split(/[\s/-]+/)[0] || channelName;
}

export function getShipmentLifecycleStageCount(shipments: Shipment[], stageKey: OrdersLifecycleStageKey) {
  const stage = orderLifecycleStages.find((item) => item.key === stageKey);
  return stage ? shipments.filter(stage.predicate).length : 0;
}

export interface ModulePageConfig {
  title: string;
  description: string;
  capabilities: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
}

export const modulePageConfigs: Partial<Record<MenuKey, ModulePageConfig>> = {
  receive: {
    title: '仓库管理中心',
    description: '覆盖包裹件重尺、理货合并拆分、面单队列&待仓库出货和交接资料，作为仓库作业主入口。',
    capabilities: ['包裹明细', '理货管理', '面单队列&待仓库出货', '收货交接单'],
    aiEnhancements: ['重量异常识别', '面单信息补全', '重复扫描提醒'],
    siliconFlowScenarios: ['识别预报重量与实重差异', '根据品名补全面单申报要素', '生成异常入库内部说明'],
  },
  routing: {
    title: '渠道排货中心',
    description: '沉淀手动排货、规则排货、代理分配、承运商选择和转单号获取能力。',
    capabilities: ['规则排货', '手动分配渠道', '代理/承运商选择', '转单号获取', '排货日志'],
    aiEnhancements: ['推荐最优渠道', '批量操作风险提示', '渠道配置建议'],
    siliconFlowScenarios: ['按国家/重量/时效推荐渠道', '解释成本倒挂原因', '生成批量排货风险提示'],
  },
  tracking: {
    title: '轨迹监控中心',
    description: '集中处理轨迹录入、轨迹同步、未上网、长时间未更新和客户可见轨迹。',
    capabilities: ['轨迹列表', '手工添加轨迹', '轨迹未更新监控', '客户可见轨迹', '轨迹规则'],
    aiEnhancements: ['轨迹超时解释', '客户沟通草稿', '接口失败诊断'],
    siliconFlowScenarios: ['解释轨迹超过 3 天未更新', '生成客户可见延误说明', '诊断承运商接口失败原因'],
  },
  problems: {
    title: '问题件中心',
    description: '管理问题件新建、回复、关闭、附件和客户可见状态。',
    capabilities: ['新建问题', '回复查看', '关闭问题', '附件', '客户可见状态'],
    aiEnhancements: ['自动归类问题原因', '生成客户回复', 'SLA 超时提醒'],
    siliconFlowScenarios: ['按原因归类问题件', '生成客户回复草稿', '总结问题件关闭说明'],
  },
  pricing: {
    title: '报价查价中心',
    description: '按已维护的代理价格表和加价规则，为业务员快速生成可对外报价。',
    capabilities: ['亚马逊查价', '欧洲海运超大件查价', '欧洲空海运铁路快递查价', '南非专线查价', '业务员报价'],
    aiEnhancements: ['解释报价匹配条件', '提醒低毛利报价', '生成客户报价话术'],
    siliconFlowScenarios: ['解释当前报价匹配依据', '生成客户报价文案', '识别报价条件缺失'],
  },
  finance: {
    title: '财务结算中心',
    description: '闭环应收、应付、对账、收付款、核销和余额流水。',
    capabilities: ['应收费用', '应付费用', '客户对账', '代理对账', '收付款', '核销', '余额流水'],
    aiEnhancements: ['费用差异解释', '欠费风险提示', '对账单摘要'],
    siliconFlowScenarios: ['解释应收应付差异', '生成客户对账单摘要', '识别欠费与超授信风险'],
  },
  reports: {
    title: '统计报表中心',
    description: '提供运单、收货、发货、应收应付和利润分析报表。',
    capabilities: ['运单报表', '收货统计', '发货统计', '应收应付分析', '利润分析'],
    aiEnhancements: ['经营异常洞察', '利润波动解释', '日报生成'],
    siliconFlowScenarios: ['生成运营日报', '解释利润波动', '识别收发货异常趋势'],
  },
  master: {
    title: '基础资料中心',
    description: '维护客户、代理、承运商、渠道、国家地区、费用名称和汇率。',
    capabilities: ['客户', '代理', '承运商', '渠道', '国家地区', '费用名称', '汇率'],
    aiEnhancements: ['资料缺失检查', '渠道配置建议', '规则冲突提示'],
    siliconFlowScenarios: ['识别客户资料缺失', '检查渠道配置冲突', '生成资料维护建议'],
  },
  settings: {
    title: '系统设置中心',
    description: '承载公司资料、模板、通知、轨迹规则、状态字典和权限设置。',
    capabilities: ['公司资料', '模板', '通知', '轨迹规则', '状态字典', '权限'],
    aiEnhancements: ['配置健康检查', '规则冲突提示', '权限风险提示'],
    siliconFlowScenarios: ['检查权限冲突', '解释角色权限差异', '生成系统配置变更说明'],
  }
};

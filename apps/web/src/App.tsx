import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  Flex,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Activity,
  Banknote,
  Bot,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  FileInput,
  FileText,
  Gauge,
  Landmark,
  LogOut,
  PackageCheck,
  PackagePlus,
  UserCircle,
  Route,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Truck,
  Users
} from 'lucide-react';
import {
  businessTypeLabels,
  canTransitionShipment,
  calculateTransitTimeLabel,
  createAutomationPlan,
  createBulkTrackingImportResult,
  createFulfillmentAdvice,
  createShipmentInsights,
  getAvailableFulfillmentActions,
  getModuleCoverageSummary,
  productModules,
  shipmentStatusLabels,
  summarizeFulfillmentStages,
  summarizeMasterDataSnapshot,
  summarizeStatusCounts,
  validateShipmentImportRows,
  type AccountLedgerSummary,
  type AgentIntegrationType,
  type AgentSummary,
  type BusinessType,
  type BulkTrackingImportResult,
  type BulkTrackingImportRow,
  type CarrierTaskSummary,
  type CustomerAccountSummary,
  type CustomerSummary,
  type CustomerStatementSummary,
  type FulfillmentAction,
  type MasterDataSnapshot,
  type PriceBookImportInput,
  type PriceLookupResponse,
  type PriceLookupRecommendation,
  type ReceivableFeeSummary,
  type Shipment,
  type ShipmentPaymentUpdateInput,
  type ShipmentPaymentMethod,
  type StaffRoleKey,
  type StaffMenuKey,
  type ShipmentStatus,
  type WarehouseConsolidationSummary,
  type WarehousePackageStatus,
  type WarehousePackageSummary
} from '@siyuan/shared';
import { ApiClient, type AiAssistResponse, type LoginLogSummary, type PermissionKey, type Principal, type RoleKey, type RolePermissionMatrix, type RolePermissionRow, type Session } from './apiClient';
import { warehouseScanTestRows } from './warehouseScanTestData';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const demoOperationalNow = '2026-06-06T10:00:00.000Z';
const appTheme = {
  token: {
    colorPrimary: '#2458d3',
    colorInfo: '#2458d3',
    colorSuccess: '#2f7d32',
    colorWarning: '#b76e00',
    colorError: '#c9351d',
    colorText: '#182033',
    colorTextSecondary: '#68758a',
    colorBorder: '#d9e1ec',
    colorBgLayout: '#eef2f7',
    colorBgContainer: '#ffffff',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    controlHeight: 38
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 38
    },
    Card: {
      borderRadiusLG: 8,
      paddingLG: 22
    },
    Input: {
      borderRadius: 6,
      controlHeight: 38
    },
    InputNumber: {
      borderRadius: 6,
      controlHeight: 38
    },
    Table: {
      borderColor: '#e3eaf3',
      headerBg: '#f7f9fc',
      headerColor: '#243047',
      rowHoverBg: '#f6f9ff'
    },
    Tag: {
      borderRadiusSM: 5
    }
  }
};
const tenRowTablePagination = {
  pageSize: 10,
  showSizeChanger: false,
  showTotal: (total: number) => `共 ${total} 条`
};

interface AiResult {
  title: string;
  response: AiAssistResponse;
}

interface OutboundOrderFormValues {
  customerName: string;
  customerOrderNo: string;
  systemOrderNo?: string;
  transferNo?: string;
  remark?: string;
  destinationCountry: string;
  carrier: string;
  customReceivingChannel?: string;
  packageCount: number;
  receivableWeightKg: number;
  agentWeightKg: number;
}

const receivingChannelOptions = ['海运DDP', '空运DDP', '快递', '整柜到门', '整柜到港', '拼箱到港', '空运到机场', '代购', '自定义'];

interface MasterCustomerFormValues {
  customerCode: string;
  customerShortName: string;
  customerFullName: string;
  customerType: string;
  salesperson: string;
  customerEnabled: 'true' | 'false';
}

interface MasterAgentFormValues {
  agentCode: string;
  agentShortName: string;
  agentName: string;
  agentIntegrationType: AgentIntegrationType;
  agentEnabled: 'true' | 'false';
}

interface ImportedPriceRow {
  id: string;
  priceBookId?: string;
  agentName: string;
  carrierName?: string;
  sourceSheetName?: string;
  channelName: string;
  businessRouteName?: string;
  realChannelName?: string;
  warehouseCode?: string;
  destinationCountry: string;
  minWeightKg: number;
  maxWeightKg: number;
  costPerKg: number;
  currency: string;
  transitDays?: number;
  transitLabel?: string;
  remark?: string;
  quoteSourceType?: QuoteSourceType;
  surchargeFee?: number;
  surchargeDetails?: SurchargeDetail[];
}

interface AgentMarkupRule {
  id: string;
  agentName: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupPerKg: number;
  enabled: boolean;
}

interface PriceBookRecord {
  id: string;
  fileName: string;
  rowCount: number;
  importedAt: string;
  remark?: string;
}

type QuoteSourceType = 'local' | 'agentApi';

interface SurchargeDetail {
  name: string;
  amount: number;
}

type PriceRecommendation = PriceLookupRecommendation;
type PriceLookupResult = PriceLookupResponse;

interface PriceLookupFormValues {
  amazonCode?: string;
  productName?: string;
  postalCode?: string;
  address?: string;
  packageInfo?: string;
  destinationCountry: string;
  chargeableWeightKg: number;
  actualWeightKg?: number;
  volumeCbm?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageCount?: number;
  unitActualWeightKg?: number;
}

interface AgentMarkupFormValues {
  agentName: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupPerKg: number;
  enabled: 'true' | 'false';
}

interface PriceBookRemarkFormValues {
  remark?: string;
}

interface ModuleSubNavItem {
  key: string;
  label: string;
  description?: string;
}

interface EditShipmentOperationalFormValues {
  latestTracking: string;
  transferNo?: string;
  status: ShipmentStatus;
}

interface ShipmentPaymentFormValues {
  paymentAmountUsd?: number;
  paymentAmountCny?: number;
  paymentMethod: ShipmentPaymentMethod;
}

interface RoutingAssignmentFormValues {
  agentId?: string;
  manualAgentName?: string;
  channelId?: string;
  manualChannelName?: string;
}

interface ShipmentOperationLog {
  id: string;
  operatedAt: string;
  operator: string;
  action: string;
}

type ShipmentLogViewMode = 'operation' | 'routing';
type ShipmentEditSource = 'operation' | 'routing';

const emptyMasterData: MasterDataSnapshot = {
  customers: [],
  contacts: [],
  customerUsers: [],
  agents: [],
  carriers: [],
  channels: [],
  surcharges: [],
  fuelRates: [],
  exchangeRates: [],
  roles: []
};

const statusOrder: ShipmentStatus[] = [
  'DRAFT',
  'WAITING_RECEIVE',
  'WAITING_SORT',
  'WAITING_DISPATCH',
  'WAITING_ONLINE',
  'WAITING_SIGNED',
  'WAITING_RETURN',
  'PROBLEM',
  'STUCK',
  'SIGNED'
];

const editableShipmentStatuses: ShipmentStatus[] = [
  'DRAFT',
  'DECLARED',
  'WAITING_RECEIVE',
  'WAITING_SORT',
  'WAITING_DISPATCH',
  'WAITING_ONLINE',
  'WAITING_SIGNED',
  'WAITING_RETURN',
  'PROBLEM',
  'STUCK',
  'SIGNED',
  'CANCELLED'
];

const shipmentPaymentMethods: ShipmentPaymentMethod[] = ['对公', '对私', '阿里店铺', '外汇'];

const menuItems: Array<{ key: StaffMenuKey; icon: ReactNode; label: string }> = [
  { key: 'workspace', icon: <Gauge size={16} />, label: '运营工作台' },
  { key: 'orders', icon: <Boxes size={16} />, label: '运单履约' },
  { key: 'routing', icon: <Route size={16} />, label: '渠道排货' },
  { key: 'receive', icon: <PackagePlus size={16} />, label: '仓库管理' },
  { key: 'tracking', icon: <Activity size={16} />, label: '轨迹监控' },
  { key: 'problems', icon: <TicketCheck size={16} />, label: '问题件中心' },
  { key: 'pricing', icon: <CircleDollarSign size={16} />, label: '报价查价' },
  { key: 'finance', icon: <Landmark size={16} />, label: '财务结算' },
  { key: 'reports', icon: <ClipboardCheck size={16} />, label: '统计报表' },
  { key: 'master', icon: <Users size={16} />, label: '基础资料' },
  { key: 'settings', icon: <Settings size={16} />, label: '系统设置' }
];

const importCheckRows = [
  { customerOrderNo: 'AI-0606-001', destinationCountry: '美国', weightKg: 2.4, channelName: 'USPS 小包线' },
  { customerOrderNo: 'AI-0606-001', destinationCountry: '德国', weightKg: 1.2, channelName: 'DHL HK' },
  { customerOrderNo: 'AI-0606-003', destinationCountry: '', weightKg: -1, channelName: '' }
];

type MenuKey = StaffMenuKey;
type FulfillmentStageKey = 'all' | 'reviewing' | 'declared' | 'receiving' | 'sorting' | 'dispatching' | 'online' | 'signing' | 'exception';
type FulfillmentAuditStageKey = 'all' | 'reviewing' | 'approved' | 'rejected';
type RoutingBoardAction = 'add-tracking';

const businessWorkspaceConfigs: Record<
  BusinessType,
  {
    description: string;
    metrics: Array<{ title: string; extra: string }>;
    batchActions: string[];
    assistantCopy: string;
    focusTitle: string;
    focusItems: Array<{ title: string; description: string }>;
  }
> = {
  EXPRESS: {
    description: '快递业务聚焦商业快件、转单号、偏远识别、渠道排货和上网签收时效。',
    metrics: [
      { title: '待处理运单', extra: '按快递渠道聚合' },
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
      { title: '待处理小包', extra: '按客户批次和邮袋聚合' },
      { title: '上网风险', extra: '超过 5 天未上网自动识别' },
      { title: '预估运费', extra: '按克重段、挂号费、燃油计算' },
      { title: '今日交邮率', extra: '邮袋交接完成度' }
    ],
    batchActions: ['批量预报', '邮袋交接', '挂号转单号', '平邮批量上网', '重量分段复核', '批量添加轨迹', '新建问题', '客户通知'],
    assistantCopy: 'AI 可按克重段识别报价异常、提醒未交邮袋批次，并生成客户上网延迟说明。',
    focusTitle: '小包作业重点',
    focusItems: [
      { title: '邮袋交接', description: '按客户批次、邮袋号、目的国集中交邮' },
      { title: '克重分段', description: '按 0-2kg 小包克重段复核成本与报价' },
      { title: '挂号/平邮', description: '区分可追踪挂号和平邮上网策略' }
    ]
  },
  DEDICATED_LINE: {
    description: '专线聚合视图统一承载原快递、小包、专线数据，集中处理渠道履约、清关节点、头程/尾程轨迹和异常风险。',
    metrics: [
      { title: '待处理运单', extra: '快递/小包/专线统一聚合' },
      { title: '履约风险', extra: '转单、清关、尾程、轨迹异常' },
      { title: '预计应收', extra: '运费、燃油、偏远和派送费合计' },
      { title: '今日完成率', extra: '上网、签收、入仓综合表现' }
    ],
    batchActions: ['批量装板', '排舱确认', '生成装箱单', '头程发货', '尾程转单', '清关资料审核', '新建问题', '添加轨迹'],
    assistantCopy: 'AI 可解释清关/排舱延误、提示大货成本倒挂，并生成客户节点汇报。',
    focusTitle: '专线聚合作业重点',
    focusItems: [
      { title: '装板/排舱', description: '按航线、板位、仓库批次确认头程计划' },
      { title: '清关资料', description: '审核箱单、发票、品名、税号和查验资料' },
      { title: '尾程转单', description: '补齐 UPS/FedEx/本地卡派尾程单号' }
    ]
  }
};

const fulfillmentAuditStages: Array<{ key: FulfillmentAuditStageKey; label: string; predicate: (shipment: Shipment) => boolean }> = [
  { key: 'all', label: '全部', predicate: () => true },
  { key: 'reviewing', label: '待审核', predicate: (shipment) => shipment.status === 'DRAFT' },
  { key: 'approved', label: '审核通过', predicate: (shipment) => shipment.status !== 'DRAFT' && shipment.status !== 'CANCELLED' },
  { key: 'rejected', label: '审核不通过', predicate: (shipment) => shipment.status === 'CANCELLED' }
];

const routingFulfillmentStages: Array<{ key: FulfillmentStageKey; label: string; statuses: ShipmentStatus[] }> = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'sorting', label: '待排货', statuses: ['WAITING_SORT'] },
  { key: 'dispatching', label: '已排货', statuses: ['WAITING_DISPATCH'] }
];

function getRouteCategory(channelName: string) {
  return channelName.trim().split(/[\s/-]+/)[0] || channelName;
}

function inferPriceCarrierName(row: ImportedPriceRow) {
  if (row.carrierName?.trim()) {
    return row.carrierName.trim();
  }

  const source = `${row.realChannelName ?? ''} ${row.businessRouteName ?? ''} ${row.channelName}`.toLowerCase();
  if (/dhl|dhk/.test(source)) {
    return 'DHL';
  }
  if (/ups|1z/.test(source)) {
    return 'UPS';
  }
  if (/fedex|fdx/.test(source)) {
    return 'FEDEX';
  }
  if (/aramex/.test(source)) {
    return 'Aramex';
  }
  if (/usps/.test(source)) {
    return 'USPS';
  }
  if (/海|空|专线/.test(source)) {
    return '专线';
  }
  return '其他';
}

function getQuoteSourceLabel(sourceType: QuoteSourceType) {
  return sourceType === 'agentApi' ? '代理接口' : '本地价格表';
}

function getFulfillmentStageCount(summary: ReturnType<typeof summarizeFulfillmentStages>, stageKey: FulfillmentStageKey) {
  if (stageKey === 'all') {
    return Object.values(summary).reduce((total, count) => total + count, 0);
  }

  return summary[stageKey];
}

function getFulfillmentAuditStageCount(shipments: Shipment[], stageKey: FulfillmentAuditStageKey) {
  const stage = fulfillmentAuditStages.find((item) => item.key === stageKey);
  return stage ? shipments.filter(stage.predicate).length : 0;
}

interface ModulePageConfig {
  title: string;
  description: string;
  capabilities: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
  queue: Array<{ item: string; owner: string; status: string }>;
  stats: Array<{ label: string; value: string; helper: string }>;
  records: Array<{ primary: string; secondary: string; metric: string; status: string }>;
}

const modulePageConfigs: Partial<Record<MenuKey, ModulePageConfig>> = {
  receive: {
    title: '仓库管理中心',
    description: '覆盖入库收货、包裹件重尺、合票出货、面单队列&待仓库出货和收货异常，作为仓库作业主入口。',
    capabilities: ['入库收货', '包裹明细', '合票出货', '面单队列&待仓库出货', '收货异常'],
    aiEnhancements: ['重量异常识别', '面单信息补全', '重复扫描提醒'],
    siliconFlowScenarios: ['识别预报重量与实重差异', '根据品名补全面单申报要素', '生成异常入库内部说明'],
    stats: [
      { label: '待入库', value: '18', helper: '审核后等待仓库确认' },
      { label: '待合票', value: '9', helper: '分批到仓待合并' },
      { label: '收货异常', value: '3', helper: '件重尺或资料待复核' }
    ],
    records: [
      { primary: 'RCV-0606-001', secondary: '9409-Daloday / SYGJ06061230001 / 扫描收货', metric: '实重 2.36kg / 预报 2.10kg', status: '待确认收货' },
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
      { label: '待上网', value: '6', helper: '已发货未上网' },
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
    description: '通过 XLS 导入代理成本价，再按代理维护业务员加价规则并快速查价。',
    capabilities: ['价格表导入', '代理成本价', '代理加价规则', '业务员报价', '价格查询'],
    aiEnhancements: ['识别价格表字段', '解释代理加价差异', '提醒低毛利报价'],
    siliconFlowScenarios: ['解析价格表字段并给出导入建议', '解释代理成本价与业务员报价差异', '识别加价规则异常'],
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
      { label: '汇率', value: '7.2450', helper: 'USD 对 CNY' }
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
      { primary: '状态字典', secondary: 'DRAFT -> DECLARED -> WAITING_RECEIVE', metric: '12 个状态', status: '启用' },
      { primary: '转单提醒', secondary: '待上网超过 2 天且缺转单号', metric: '影响 7 票', status: '已开启' },
      { primary: '财务核销权限', secondary: '仅 ADMIN / FINANCE 可操作', metric: '2 个角色', status: '需审计' }
    ],
    queue: [
      { item: '轨迹规则', owner: '管理员', status: '待检查' },
      { item: '角色权限', owner: '管理员', status: '待复核' }
    ]
  }
};

function LoginPage({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin() {
    setSubmitting(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch {
      setError('账号或密码错误');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ConfigProvider theme={appTheme}>
      <div className="login-shell">
        <Card className="login-card">
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div>
              <Title level={2}>登录思远物流</Title>
              <Text type="secondary">员工端 / 客户端按角色自动进入对应工作台。</Text>
            </div>
            {error ? <Alert type="error" message={error} showIcon /> : null}
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <label>
                <Text strong>账号</Text>
                <Input aria-label="账号" value={username} onChange={(event) => setUsername(event.target.value)} />
              </label>
              <label>
                <Text strong>密码</Text>
                <Input.Password aria-label="密码" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <Button type="primary" block loading={submitting} aria-label="登录" onClick={submitLogin}>
                登录
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    </ConfigProvider>
  );
}

function CustomerPortal({
  user,
  shipments,
  problemTickets,
  receivables,
  statements,
  accounts,
  ledger,
  onLogout,
  onCreate
}: {
  user: Principal;
  shipments: Shipment[];
  problemTickets: Array<{ id: string; reason: string; status: string; customerVisible: boolean }>;
  receivables: ReceivableFeeSummary[];
  statements: CustomerStatementSummary[];
  accounts: CustomerAccountSummary[];
  ledger: AccountLedgerSummary[];
  onLogout: () => void;
  onCreate: (input: {
    customerOrderNo: string;
    businessType: BusinessType;
    packageType: 'DOC' | 'WPX' | 'PAK';
    destinationCountry: string;
    packageCount: number;
    receivableWeightKg: number;
    agentWeightKg: number;
    channelId?: string;
  }) => Promise<void>;
}) {
  const [customerOrderNo, setCustomerOrderNo] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [weight, setWeight] = useState('1');
  const [notice, setNotice] = useState('');

  async function submitDeclaration() {
    await onCreate({
      customerOrderNo,
      businessType: 'EXPRESS',
      packageType: 'WPX',
      destinationCountry,
      packageCount: 1,
      receivableWeightKg: Number(weight),
      agentWeightKg: Number(weight),
      channelId: 'ch-dhl-hk'
    });
    setNotice('预报已提交');
    setCustomerOrderNo('');
    setDestinationCountry('');
    setWeight('1');
  }

  return (
    <ConfigProvider theme={appTheme}>
      <Layout className="app-shell">
        <Header className="topbar">
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Space>
              <div className="brand-mark">S</div>
              <div>
                <Text className="brand-title">思远物流</Text>
                <Text className="brand-subtitle">客户工作台 · {user.username}</Text>
              </div>
            </Space>
            <Button onClick={onLogout}>退出</Button>
          </Flex>
        </Header>
        <Content className="content">
          <Flex className="page-heading" justify="space-between" align="center">
            <div>
              <Title level={2}>客户门户</Title>
              <Text type="secondary">预报运单、查询轨迹、处理问题件、查看费用和对账单。</Text>
            </div>
            <Space>
              <Button>价格查询</Button>
              <Button>费用明细</Button>
              <Button type="primary">账户余额</Button>
            </Space>
          </Flex>

          {notice ? <Alert className="notice-bar" type="success" message={notice} showIcon /> : null}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card title="新建预报">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <label>
                    <Text strong>客户单号</Text>
                    <Input aria-label="客户单号" value={customerOrderNo} onChange={(event) => setCustomerOrderNo(event.target.value)} />
                  </label>
                  <label>
                    <Text strong>目的地国家</Text>
                    <Input aria-label="目的地国家" value={destinationCountry} onChange={(event) => setDestinationCountry(event.target.value)} />
                  </label>
                  <label>
                    <Text strong>重量</Text>
                    <Input aria-label="重量" value={weight} onChange={(event) => setWeight(event.target.value)} />
                  </label>
                  <Button type="primary" block onClick={submitDeclaration}>
                    提交预报
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card title="我的运单">
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={shipments}
                  pagination={tenRowTablePagination}
                  columns={[
                    { title: '客户单号', dataIndex: 'customerOrderNo' },
                    { title: '系统单号', dataIndex: 'systemOrderNo' },
                    { title: '转单号', dataIndex: 'transferNo', render: (value?: string) => value ?? '待生成' },
                    { title: '目的地', dataIndex: 'destinationCountry' },
                    { title: '状态', dataIndex: 'status', render: (status: ShipmentStatus) => shipmentStatusLabels[status] },
                    { title: '最新轨迹', dataIndex: 'latestTracking' }
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="问题件">
                <Space direction="vertical" className="ai-list">
                  {problemTickets.map((ticket) => (
                    <Alert key={ticket.id} type={ticket.status === 'CLOSED' ? 'success' : 'warning'} message={ticket.reason} showIcon />
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="客户常用功能">
                <Space wrap>
                  <Button>偏远/邮编查询</Button>
                  <Button>黑名单查询</Button>
                  <Button>对账单</Button>
                  <Button>个人中心</Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="费用明细">
                <Space direction="vertical" className="ai-list">
                  {receivables.map((fee) => (
                    <Flex key={fee.id} justify="space-between">
                      <Text>{fee.name}</Text>
                      <Text strong>{formatCurrency(fee.amount)}</Text>
                    </Flex>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="对账单草稿">
                <Space direction="vertical" className="ai-list">
                  {statements.map((statement) => (
                    <Flex key={statement.id ?? `${statement.customerId}-${statement.periodStart}`} justify="space-between">
                      <Text>{statement.periodStart} - {statement.periodEnd}</Text>
                      <Text strong>{formatCurrency(statement.total)}</Text>
                    </Flex>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="账户余额">
                <Space direction="vertical" className="ai-list">
                  {accounts.map((account) => (
                    <Flex key={account.customerId} justify="space-between">
                      <Text>{account.customerName}</Text>
                      <Text strong>{formatCurrency(account.balance)}</Text>
                    </Flex>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="账户流水">
                <Space direction="vertical" className="ai-list">
                  {ledger.map((entry) => (
                    <Flex key={entry.id} justify="space-between">
                      <Text>{entry.note ?? '账户变动'}</Text>
                      <Text strong>{formatCurrency(entry.amount)}</Text>
                    </Flex>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export function App() {
  const [outboundOrderForm] = Form.useForm<OutboundOrderFormValues>();
  const selectedReceivingChannel = Form.useWatch('carrier', outboundOrderForm);
  const [masterCustomerForm] = Form.useForm<MasterCustomerFormValues>();
  const [masterAgentForm] = Form.useForm<MasterAgentFormValues>();
  const [editShipmentForm] = Form.useForm<EditShipmentOperationalFormValues>();
  const [shipmentPaymentForm] = Form.useForm<ShipmentPaymentFormValues>();
  const [routingAssignmentForm] = Form.useForm<RoutingAssignmentFormValues>();
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem('siyuan-session');
    return raw ? (JSON.parse(raw) as Session) : null;
  });
  const [activeMenuKey, setActiveMenuKey] = useState<MenuKey>('workspace');
  const businessType: BusinessType = 'DEDICATED_LINE';
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState('shipmentPool');
  const [activeFulfillmentSection, setActiveFulfillmentSection] = useState('stageBoard');
  const [selectedFulfillmentStage, setSelectedFulfillmentStage] = useState<FulfillmentAuditStageKey>('all');
  const [selectedRoutingStage, setSelectedRoutingStage] = useState<FulfillmentStageKey>('all');
  const [keyword, setKeyword] = useState('');
  const [localShipments, setLocalShipments] = useState<Shipment[]>([]);
  const [shipmentOperationLogs, setShipmentOperationLogs] = useState<Record<string, ShipmentOperationLog[]>>({});
  const [problemTickets, setProblemTickets] = useState<Awaited<ReturnType<ApiClient['problemTickets']>>>([]);
  const [receivables, setReceivables] = useState<ReceivableFeeSummary[]>([]);
  const [customerStatements, setCustomerStatements] = useState<CustomerStatementSummary[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccountSummary[]>([]);
  const [accountLedger, setAccountLedger] = useState<AccountLedgerSummary[]>([]);
  const [masterData, setMasterData] = useState<MasterDataSnapshot>(emptyMasterData);
  const [carrierTasks, setCarrierTasks] = useState<CarrierTaskSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [outboundOrderOpen, setOutboundOrderOpen] = useState(false);
  const [masterCustomerOpen, setMasterCustomerOpen] = useState(false);
  const [masterAgentOpen, setMasterAgentOpen] = useState(false);
  const [editingMasterCustomer, setEditingMasterCustomer] = useState<CustomerSummary | null>(null);
  const [editingMasterAgent, setEditingMasterAgent] = useState<AgentSummary | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editingShipmentSource, setEditingShipmentSource] = useState<ShipmentEditSource>('operation');
  const [routingAssignmentShipment, setRoutingAssignmentShipment] = useState<Shipment | null>(null);
  const [collectingShipment, setCollectingShipment] = useState<Shipment | null>(null);
  const [pendingShipmentPayment, setPendingShipmentPayment] = useState<{
    shipment: Shipment;
    input: ShipmentPaymentUpdateInput;
  } | null>(null);
  const [logViewingShipment, setLogViewingShipment] = useState<Shipment | null>(null);
  const [logViewingMode, setLogViewingMode] = useState<ShipmentLogViewMode>('operation');
  const [bulkTrackingOpen, setBulkTrackingOpen] = useState(false);
  const [bulkTrackingFileName, setBulkTrackingFileName] = useState<string | null>(null);
  const [bulkTrackingRows, setBulkTrackingRows] = useState<BulkTrackingImportRow[]>([]);
  const [bulkTrackingResult, setBulkTrackingResult] = useState<BulkTrackingImportResult | null>(null);
  const [bulkTrackingError, setBulkTrackingError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [personalCenterOpen, setPersonalCenterOpen] = useState(false);
  const [loginLogs, setLoginLogs] = useState<LoginLogSummary[]>([]);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  const [passwordForm] = Form.useForm();
  const businessWorkspaceConfig = businessWorkspaceConfigs.DEDICATED_LINE;
  const apiClient = useMemo(
    () => new ApiClient(() => session?.accessToken ?? null, handleUnauthorized),
    [session?.accessToken]
  );
  const visibleMenuKeys = useMemo(
    () => (session && session.user.role !== 'CUSTOMER' ? getVisibleStaffMenuKeysByPermissions(session.permissions ?? [], session.user.role) : []),
    [session]
  );
  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => visibleMenuKeys.includes(item.key)),
    [visibleMenuKeys]
  );
  const currentMenuKey = useMemo<MenuKey>(
    () =>
      session && session.user.role !== 'CUSTOMER' && visibleMenuKeys.includes(activeMenuKey)
        ? activeMenuKey
        : visibleMenuKeys[0] ?? 'workspace',
    [activeMenuKey, session, visibleMenuKeys]
  );

  useEffect(() => {
    if (!session) {
      return;
    }
    void refreshWorkspace(apiClient);
  }, [apiClient, session]);

  useEffect(() => {
    if (!session || session.user.role === 'CUSTOMER') {
      return;
    }
    if (!visibleMenuKeys.includes(activeMenuKey)) {
      setActiveMenuKey(visibleMenuKeys[0] ?? 'workspace');
    }
  }, [activeMenuKey, session, visibleMenuKeys]);

  function handleUnauthorized() {
    localStorage.removeItem('siyuan-session');
    setSession(null);
    setLocalShipments([]);
    setProblemTickets([]);
    setReceivables([]);
    setCustomerStatements([]);
    setCustomerAccounts([]);
    setAccountLedger([]);
    setMasterData(emptyMasterData);
    setCarrierTasks([]);
    setAiResult(null);
  }

  async function refreshWorkspace(client = apiClient, user = session?.user) {
    const canReadFinance = user?.role === 'ADMIN' || user?.role === 'FINANCE' || user?.role === 'CUSTOMER';
    const canReadCarrierTasks = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SERVICE' || user?.role === 'OPERATOR' || user?.role === 'WAREHOUSE';
    const canReadMasterData = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SERVICE' || user?.role === 'OPERATOR' || user?.role === 'FINANCE';
    const canReadProblems = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SERVICE' || user?.role === 'OPERATOR' || user?.role === 'CUSTOMER';
    const [nextShipments, nextTickets] = await Promise.all([
      client.shipments(),
      canReadProblems ? client.problemTickets() : Promise.resolve([])
    ]);
    setLocalShipments(nextShipments);
    setProblemTickets(nextTickets);
    if (canReadFinance) {
      const [nextReceivables, nextStatements, nextAccounts, nextLedger] = await Promise.all([
        client.receivables(),
        client.customerStatements(),
        client.customerAccounts(),
        client.accountLedger()
      ]);
      setReceivables(nextReceivables);
      setCustomerStatements(nextStatements);
      setCustomerAccounts(nextAccounts);
      setAccountLedger(nextLedger);
    } else {
      setReceivables([]);
      setCustomerStatements([]);
      setCustomerAccounts([]);
      setAccountLedger([]);
    }
    if (canReadCarrierTasks) {
      try {
        setCarrierTasks(await client.carrierTasks());
      } catch {
        setCarrierTasks([]);
      }
    } else {
      setCarrierTasks([]);
    }
    if (canReadMasterData) {
      setMasterData(await client.masterData());
    } else {
      setMasterData(emptyMasterData);
    }
  }

  async function handleLogin(username: string, password: string) {
    const nextSession = await apiClient.login(username, password);
    localStorage.setItem('siyuan-session', JSON.stringify(nextSession));
    setSession(nextSession);
    setActiveMenuKey(getVisibleStaffMenuKeysByPermissions(nextSession.permissions ?? [], nextSession.user.role)[0] ?? 'workspace');
    const loginClient = new ApiClient(() => nextSession.accessToken, handleUnauthorized);
    await refreshWorkspace(loginClient, nextSession.user);
  }

  async function openPersonalCenter() {
    setPersonalCenterOpen(true);
    setLoginLogsLoading(true);
    try {
      setLoginLogs(await apiClient.loginLogs());
    } finally {
      setLoginLogsLoading(false);
    }
  }

  async function submitPasswordChange() {
    const values = await passwordForm.validateFields();
    await apiClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword
    });
    passwordForm.resetFields();
    setNotice('密码已修改，请使用新密码重新登录');
    setPersonalCenterOpen(false);
    handleUnauthorized();
  }

  const visibleShipments = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return localShipments.filter((shipment) => {
      const matchesStatus = selectedStatus === 'ALL' || shipment.status === selectedStatus;
      const matchesKeyword =
        normalized.length === 0 ||
        [
          shipment.customerName,
          shipment.customerOrderNo,
          shipment.systemOrderNo,
          shipment.transferNo,
          shipment.destinationCountry,
          shipment.carrier,
          shipment.channelName,
          shipment.agentName
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalized));

      return matchesStatus && matchesKeyword;
    });
  }, [keyword, localShipments, selectedStatus]);

  const businessShipments = useMemo(
    () => localShipments,
    [localShipments]
  );
  const statusCounts = summarizeStatusCounts(businessShipments);
  const aiQueue = useMemo(
    () =>
      businessShipments
        .map((shipment) => ({
          shipment,
          insight: createShipmentInsights({
            status: shipment.status,
            trackingStaleDays: shipment.trackingStaleDays,
            isRemoteArea: shipment.isRemoteArea,
            hasProblemTicket: shipment.hasProblemTicket,
            chargeableWeightKg: shipment.receivableWeightKg,
            carrier: shipment.carrier
          })
        }))
        .filter(({ insight }) => insight.riskLevel !== 'low')
        .sort((a, b) => riskWeight(b.insight.riskLevel) - riskWeight(a.insight.riskLevel)),
    [businessShipments]
  );
  const automationPlan = useMemo(() => createAutomationPlan(businessShipments).slice(0, 4), [businessShipments]);
  const importValidation = useMemo(() => validateShipmentImportRows(importCheckRows), []);
  const moduleSummary = getModuleCoverageSummary();
  const spotlightModules = productModules.filter((module) =>
    ['运单履约', '问题件中心', '客户门户', 'AI 助手', '开放 API', '系统设置'].includes(module.name)
  );
  const fulfillmentStageSummary = summarizeFulfillmentStages(localShipments, 'ALL');
  const fulfillmentAuditMetricCards = [
    {
      title: '待审核',
      value: getFulfillmentAuditStageCount(businessShipments, 'reviewing'),
      extra: '新建出货订单待确认',
      icon: <ClipboardCheck />
    },
    {
      title: '审核通过',
      value: getFulfillmentAuditStageCount(businessShipments, 'approved'),
      extra: '可进入后续仓库/排货流程',
      icon: <ShieldCheck />
    },
    {
      title: '审核不通过',
      value: getFulfillmentAuditStageCount(businessShipments, 'rejected'),
      extra: '需修改资料后重新处理',
      icon: <TicketCheck />
    },
    {
      title: '已收款',
      value: businessShipments.filter((shipment) => shipment.paymentAmountUsd !== undefined || shipment.paymentAmountCny !== undefined).length,
      extra: '已登记收款金额或方式',
      icon: <CircleDollarSign />
    }
  ];
  const fulfillmentShipments = useMemo(() => {
    const activeStage = fulfillmentAuditStages.find((stage) => stage.key === selectedFulfillmentStage);
    return activeStage ? businessShipments.filter(activeStage.predicate) : businessShipments;
  }, [businessShipments, selectedFulfillmentStage]);
  const routingFulfillmentShipments = useMemo(() => {
    const activeStage = routingFulfillmentStages.find((stage) => stage.key === selectedRoutingStage);
    return businessShipments.filter(
      (shipment) => selectedRoutingStage === 'all' || activeStage?.statuses.includes(shipment.status)
    );
  }, [businessShipments, selectedRoutingStage]);
  const fulfillmentAdviceQueue = useMemo(
    () =>
      businessShipments
        .map((shipment) => ({ shipment, advice: createFulfillmentAdvice(shipment) }))
        .filter((item) => item.advice.priority !== 'normal')
        .slice(0, 5),
    [businessShipments]
  );
  const allShipmentLogs = logViewingShipment
    ? shipmentOperationLogs[logViewingShipment.id] ?? [
        {
          id: `initial-${logViewingShipment.id}`,
          operatedAt: logViewingShipment.createdAt,
          operator: '系统',
          action: '创建/导入运单'
        }
      ]
    : [];
  const shipmentLogs =
    logViewingMode === 'routing'
      ? allShipmentLogs.filter((log) => log.action.startsWith('渠道排货：'))
      : allShipmentLogs;

  function openShipmentLogModal(record: Shipment, mode: ShipmentLogViewMode) {
    setLogViewingMode(mode);
    setLogViewingShipment(record);
  }

  function appendShipmentOperationLog(shipmentId: string, action: string) {
    const operator = session?.user.username ?? '未知用户';
    setShipmentOperationLogs((current) => ({
      ...current,
      [shipmentId]: [
        {
          id: `shipment-log-${Date.now()}-${current[shipmentId]?.length ?? 0}`,
          operatedAt: new Date().toISOString(),
          operator,
          action
        },
        ...(current[shipmentId] ?? [])
      ]
    }));
  }

  function upsertLocalShipment(shipment: Shipment) {
    setLocalShipments((current) => {
      const exists = current.some((item) => item.id === shipment.id);
      return exists ? current.map((item) => (item.id === shipment.id ? shipment : item)) : [shipment, ...current];
    });
  }

  const columns: ColumnsType<Shipment> = [
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 145,
      render: (value: string) => formatBeijingDateTime(value),
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt)
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      width: 170,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          <Text type="secondary">{record.customerOrderNo}</Text>
        </Space>
      )
    },
    {
      title: '系统单号 / 转单号',
      dataIndex: 'systemOrderNo',
      width: 190,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text copyable={{ text: record.transferNo ? `${value}\n${record.transferNo}` : value }}>{value}</Text>
          <Text type="secondary">{record.transferNo ?? '待获取转单号（快递号）'}</Text>
        </Space>
      )
    },
    {
      title: '目的地',
      dataIndex: 'destinationCountry',
      width: 110,
      render: (value: string, record) => (
        <Space>
          <span>{value}</span>
          {record.isRemoteArea ? <Tag color="gold">偏远</Tag> : null}
        </Space>
      )
    },
    {
      title: '承运商',
      dataIndex: 'carrier',
      width: 90
    },
    {
      title: '件数',
      dataIndex: 'packageCount',
      width: 70,
      align: 'right'
    },
    {
      title: '应收/代理计费重',
      width: 140,
      render: (_, record) => `${record.receivableWeightKg.toFixed(3)} / ${record.agentWeightKg.toFixed(3)}`
    },
    {
      title: '最新轨迹',
      dataIndex: 'latestTracking',
      width: 160,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text>{value}</Text>
          <Text type={record.trackingStaleDays >= 5 ? 'danger' : 'secondary'}>
            {record.trackingStaleDays ? `${record.trackingStaleDays} 天未更新` : '今日更新'}
          </Text>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: ShipmentStatus) => <StatusTag status={status} />
    },
    {
      title: '时效',
      width: 110,
      render: (_, record) => <Text>{calculateTransitTimeLabel(record, demoOperationalNow)}</Text>
    },
    {
      title: '渠道 / 代理',
      width: 180,
      render: (_, record) => {
        if (session?.user.role === 'OPERATOR') {
          return <Text>{getRouteCategory(record.channelName)}</Text>;
        }

        return (
          <Space direction="vertical" size={0}>
            <Text>{record.channelName}</Text>
            <Text type="secondary">{record.agentName}</Text>
          </Space>
        );
      }
    },
    {
      title: '收款金额',
      width: 130,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.paymentAmountUsd === undefined && record.paymentAmountCny === undefined ? (
            <Text type="secondary">未知</Text>
          ) : (
            <>
              <Text>{record.paymentAmountUsd === undefined ? 'USD 未知' : formatUsd(record.paymentAmountUsd)}</Text>
              <Text type="secondary">{record.paymentAmountCny === undefined ? 'CNY 未知' : formatCurrency(record.paymentAmountCny)}</Text>
            </>
          )}
        </Space>
      )
    },
    {
      title: '收款方式',
      dataIndex: 'paymentMethod',
      width: 110,
      render: (value?: ShipmentPaymentMethod) => <Tag color={value ? 'blue' : 'default'}>{value ?? '未知'}</Tag>
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 180,
      render: (value?: string) => <Text type={value ? undefined : 'secondary'}>{value || '无备注'}</Text>
    }
  ];

  const auditStatusColumn: ColumnsType<Shipment>[number] = {
    title: '审核状态',
    width: 110,
    render: (_, record) => {
      if (record.status === 'DRAFT') {
        return <Tag color="warning">待审核</Tag>;
      }
      if (record.status === 'CANCELLED') {
        return <Tag color="red">未通过</Tag>;
      }
      return <Tag color="green">已通过</Tag>;
    }
  };

  const fulfillmentColumns: ColumnsType<Shipment> = [
    ...columns,
    auditStatusColumn,
    {
      title: 'AI 下一步',
      width: 170,
      render: (_, record) => {
        const advice = createFulfillmentAdvice(record);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{advice.nextAction}</Text>
            <Text type={advice.priority === 'urgent' ? 'danger' : 'secondary'}>{advice.riskReasons[0]}</Text>
          </Space>
        );
      }
    },
    {
      title: '履约操作',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
	          {(() => {
            const actions = getAvailableFulfillmentActions({
	            status: record.status,
	            hasTransferNo: Boolean(record.transferNo)
	          }).filter((action) => !['confirm-receive', 'assign-route', 'mark-return', 'create-problem', 'fill-transfer-no', 'confirm-dispatch', 'add-tracking'].includes(action)).slice(0, 3);
            return (
              <>
                {actions.map((action) =>
                  action === 'confirm-declare' ? (
                    <Popconfirm
                      key={action}
                      title="确认审核通过？"
                      description="审核通过后，该订单会进入已入库队列，并同步到仓库管理。"
                      okText="审核通过"
                      cancelText="取消"
                      onConfirm={() => handleFulfillmentAction(record, action)}
                    >
                      <Button size="small">{fulfillmentActionLabels[action]}</Button>
                    </Popconfirm>
                  ) : action === 'reject-declare' ? (
                    <Popconfirm
                      key={action}
                      title="确认审核不通过？"
                      description="审核不通过后，该订单会进入审核不通过列表，等待业务员修改资料。"
                      okText="审核不通过"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleFulfillmentAction(record, action)}
                    >
                      <Button size="small" danger>
                        {fulfillmentActionLabels[action]}
                      </Button>
                    </Popconfirm>
                  ) : action === 'confirm-dispatch' ? (
                    <Popconfirm
                      key={action}
                      title="确认发货？"
                      description="确认后订单会进入待上网阶段，并生成后续轨迹跟进任务。"
                      okText="确认发货并进入待上网"
                      cancelText="取消"
                      onConfirm={() => handleFulfillmentAction(record, action)}
                    >
                      <Button size="small">{fulfillmentActionLabels[action]}</Button>
                    </Popconfirm>
                  ) : (
                    <Button key={action} size="small" onClick={() => handleFulfillmentAction(record, action)}>
                      {fulfillmentActionLabels[action]}
                    </Button>
                  )
                )}
                {record.status === 'DRAFT' ? (
                  <Button size="small" onClick={() => openEditShipmentOperationalModal(record)}>
                    修改
                  </Button>
                ) : null}
                <Button size="small" onClick={() => openShipmentPaymentModal(record)}>
                  收款
                </Button>
                <Button size="small" onClick={() => openShipmentLogModal(record, 'operation')}>
                  操作日志
                </Button>
                <Popconfirm
                  title="确认删除该运单？"
                  description="删除后该运单会从当前工作台移除，请确认这不是仍需处理的业务单。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDeleteShipment(record)}
                >
                  <Button size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </>
            );
          })()}
        </Space>
      )
    }
  ];

  const routingBaseColumns: ColumnsType<Shipment> = columns.map((column) =>
    column.title === '状态'
      ? {
          ...column,
          render: (status: ShipmentStatus) => <RoutingStatusTag status={status} />
        }
      : column
  );

  const routingFulfillmentColumns: ColumnsType<Shipment> = [
    ...routingBaseColumns,
    auditStatusColumn,
    {
      title: '排货建议',
      width: 170,
      render: (_, record) => {
        const advice = createFulfillmentAdvice(record);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{record.transferNo ? '跟进排货节点' : '补齐转单号'}</Text>
            <Text type={advice.priority === 'urgent' ? 'danger' : 'secondary'}>{advice.riskReasons[0]}</Text>
          </Space>
        );
      }
    },
    {
      title: '排货操作',
      width: 250,
      fixed: 'right',
      render: (_, record) => {
        const actions = getAvailableFulfillmentActions({
          status: record.status,
          hasTransferNo: Boolean(record.transferNo)
        });
        const canAssignRoute = record.status === 'WAITING_SORT';
        const canAddTracking = actions.includes('add-tracking');
        const canManualEdit = ['WAITING_SORT', 'WAITING_DISPATCH', 'WAITING_ONLINE', 'WAITING_SIGNED', 'PROBLEM', 'STUCK'].includes(record.status);

        return (
          <Space wrap>
            {canAssignRoute ? (
              <Button size="small" onClick={() => openRoutingAssignmentModal(record)}>
                分配渠道
              </Button>
            ) : null}
            {canAddTracking ? (
              <Button size="small" onClick={() => handleRoutingBoardAction(record, 'add-tracking')}>
                添加轨迹
              </Button>
            ) : null}
            {canManualEdit ? (
              <Button size="small" onClick={() => openEditShipmentOperationalModal(record, 'routing')}>
                修改
              </Button>
            ) : null}
            <Button size="small" onClick={() => openShipmentLogModal(record, 'routing')}>
              排货日志
            </Button>
            <Popconfirm
              title="确认删除该运单？"
              description="删除后该运单会从渠道排货工作台移除，请确认这不是仍需处理的业务单。"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteShipment(record)}
            >
              <Button size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  function openOutboundOrderModal() {
    outboundOrderForm.setFieldsValue({
      customerName: '9409-Daloday',
      customerOrderNo: `OUT-${localShipments.length + 1}`,
      systemOrderNo: `SYOUT${String(localShipments.length + 1).padStart(6, '0')}`,
      destinationCountry: '美国',
      carrier: '快递',
      customReceivingChannel: undefined,
      packageCount: 1,
      receivableWeightKg: 18,
      agentWeightKg: 18
    });
    setOutboundOrderOpen(true);
  }

  async function handleDeleteShipment(record: Shipment) {
    await apiClient.deleteShipment(record.id);
    setLocalShipments((current) => current.filter((shipment) => shipment.id !== record.id));
    if (editingShipment?.id === record.id) {
      setEditingShipment(null);
      setEditingShipmentSource('operation');
    }
    if (collectingShipment?.id === record.id) {
      setCollectingShipment(null);
    }
    if (logViewingShipment?.id === record.id) {
      setLogViewingShipment(null);
    }
    setNotice(`已人工删除运单 ${record.systemOrderNo}`);
  }

  async function handleCreateOutboundOrder() {
    const values = await outboundOrderForm.validateFields();
    const systemOrderNo = values.systemOrderNo?.trim() || `SYOUT${Date.now()}`;
    const customerInput = values.customerName.trim();
    const customer = masterData.customers.find((item) =>
      [item.code, item.name, item.shortName, item.fullName, `${item.code}-${item.name}`].filter(Boolean).includes(customerInput)
    ) ?? masterData.customers[0];
    const carrierInput = values.carrier.trim();
    const receivingChannel = carrierInput === '自定义' ? values.customReceivingChannel?.trim() : carrierInput;
    const channel = masterData.channels.find((item) => item.name === receivingChannel || item.carrierName === receivingChannel || item.name.includes(receivingChannel ?? '')) ?? masterData.channels[0];

    if (!customer) {
      setNotice('请先在基础资料维护客户，再创建出货订单');
      return;
    }

    const created = await apiClient.createShipment({
      customerId: customer.id,
      customerOrderNo: values.customerOrderNo.trim(),
      systemOrderNo,
      transferNo: values.transferNo?.trim() || undefined,
      businessType: 'DEDICATED_LINE',
      packageType: 'WPX',
      destinationCountry: values.destinationCountry.trim(),
      packageCount: values.packageCount,
      receivableWeightKg: values.receivableWeightKg,
      agentWeightKg: values.agentWeightKg,
      channelId: channel?.id,
      receivingChannel,
      initialStatus: 'DRAFT',
      latestTracking: '新建出货订单，待审核'
    });
    const shipment = values.remark?.trim() ? { ...created, remark: values.remark.trim() } : created;

    upsertLocalShipment(shipment);
    appendShipmentOperationLog(created.id, `新建出货订单：${systemOrderNo}`);
    setSelectedFulfillmentStage('all');
    setOutboundOrderOpen(false);
    outboundOrderForm.resetFields();
    setNotice(`已创建出货订单 ${systemOrderNo}，等待审核`);
  }

  async function handleFulfillmentAction(record: Shipment, action: FulfillmentAction) {
    const actionResult = resolveFulfillmentAction(record, action);

    if (!actionResult.ok) {
      setNotice(actionResult.message);
      return;
    }

    const updated =
      action === 'confirm-receive'
        ? await apiClient.receiveShipment(record.id)
        : action === 'reject-declare'
          ? await apiClient.updateShipmentOperational(record.id, {
              status: actionResult.patch?.status,
              latestTracking: actionResult.patch?.latestTracking
            })
        : action === 'assign-route'
          ? await apiClient.routeShipment(record.id, { channelId: 'ch-dhl-hk', agentId: 'a-yuhuan' })
          : action === 'confirm-dispatch' || action === 'fill-transfer-no'
            ? await apiClient.dispatchShipment(record.id, { transferNo: record.transferNo ?? `TRK-${record.systemOrderNo}` })
            : action === 'add-tracking'
              ? await apiClient.addTrackingEvent(record.id, { status: '手工轨迹更新', happenedAt: new Date().toISOString() })
              : action === 'create-problem'
                ? (await apiClient.createProblemTicket(record.id, { reason: '人工创建问题件', customerVisible: true }), { ...record, hasProblemTicket: true, status: 'PROBLEM' as ShipmentStatus })
                : { ...record, ...actionResult.patch };

    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    appendShipmentOperationLog(record.id, actionResult.message);
    setNotice(actionResult.message);
  }

  async function handleWarehouseDispatchShipment(record: Shipment) {
    const updated = await apiClient.dispatchShipment(record.id, { transferNo: record.transferNo ?? `TRK-${record.systemOrderNo}` });
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    appendShipmentOperationLog(record.id, '仓库管理：确认出货');
    setNotice(`仓库已确认 ${record.systemOrderNo} 出货，进入待上网`);
  }

  function openRoutingAssignmentModal(record: Shipment) {
    const matchedAgent = masterData.agents.find((agent) =>
      [agent.name, agent.shortName, agent.code].filter(Boolean).includes(record.agentName)
    );
    const matchedChannel = masterData.channels.find((channel) => channel.name === record.channelName);

    routingAssignmentForm.setFieldsValue({
      agentId: matchedAgent?.id ?? masterData.agents.find((agent) => agent.enabled)?.id,
      manualAgentName: undefined,
      channelId: matchedChannel?.id ?? masterData.channels.find((channel) => channel.enabled)?.id,
      manualChannelName: undefined
    });
    setRoutingAssignmentShipment(record);
  }

  async function resolveRoutingAgent(values: RoutingAssignmentFormValues) {
    const manualAgentName = values.manualAgentName?.trim();
    const selectedAgent = values.agentId ? masterData.agents.find((agent) => agent.id === values.agentId) : undefined;
    const matchedManualAgent = manualAgentName
      ? masterData.agents.find((agent) => [agent.name, agent.shortName, agent.code].filter(Boolean).includes(manualAgentName))
      : undefined;

    if (matchedManualAgent ?? selectedAgent) {
      return matchedManualAgent ?? selectedAgent;
    }

    if (!manualAgentName) {
      return undefined;
    }

    const createdAgent = await apiClient.createAgent({
      name: manualAgentName,
      shortName: manualAgentName,
      code: manualAgentName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || undefined,
      integrationType: 'MANUAL'
    });
    setMasterData((current) => ({ ...current, agents: [...current.agents, createdAgent] }));
    return createdAgent;
  }

  async function resolveRoutingChannel(values: RoutingAssignmentFormValues) {
    const manualChannelName = values.manualChannelName?.trim();
    const selectedChannel = values.channelId ? masterData.channels.find((channel) => channel.id === values.channelId) : undefined;
    const matchedManualChannel = manualChannelName ? masterData.channels.find((channel) => channel.name === manualChannelName) : undefined;

    if (matchedManualChannel ?? selectedChannel) {
      return matchedManualChannel ?? selectedChannel;
    }

    if (!manualChannelName) {
      return undefined;
    }

    const carrier = masterData.carriers.find((item) => item.enabled) ?? (await apiClient.createCarrier({ name: '自定义承运商' }));
    if (!masterData.carriers.some((item) => item.id === carrier.id)) {
      setMasterData((current) => ({ ...current, carriers: [...current.carriers, carrier] }));
    }
    const createdChannel = await apiClient.createChannel({ name: manualChannelName, carrierId: carrier.id });
    setMasterData((current) => ({ ...current, channels: [...current.channels, createdChannel] }));
    return createdChannel;
  }

  async function handleConfirmRoutingAssignment() {
    if (!routingAssignmentShipment) {
      return;
    }
    if (routingAssignmentShipment.status !== 'WAITING_SORT') {
      setNotice('当前状态不允许执行分配渠道');
      return;
    }

    const values = await routingAssignmentForm.validateFields();
    const agent = await resolveRoutingAgent(values);
    const channel = await resolveRoutingChannel(values);

    if (!channel) {
      setNotice('请选择或手动输入发货渠道');
      return;
    }

    const updated = await apiClient.routeShipment(routingAssignmentShipment.id, { channelId: channel.id, agentId: agent?.id });
    const patched: Shipment = {
      ...updated,
      channelName: channel.name,
      carrier: channel.carrierName,
      agentName: agent?.name ?? updated.agentName
    };
    setLocalShipments((current) => current.map((shipment) => (shipment.id === routingAssignmentShipment.id ? patched : shipment)));
    appendShipmentOperationLog(routingAssignmentShipment.id, `渠道排货：分配渠道（代理：${agent?.name ?? '未指定'}，渠道：${channel.name}）`);
    setRoutingAssignmentShipment(null);
    routingAssignmentForm.resetFields();
    setNotice('渠道排货已分配渠道，进入仓库管理的面单队列&待仓库出货');
  }

  async function handleRoutingBoardAction(record: Shipment, action: RoutingBoardAction) {
    if (action === 'add-tracking') {
      if (!getAvailableFulfillmentActions({ status: record.status, hasTransferNo: Boolean(record.transferNo) }).includes('add-tracking')) {
        setNotice('当前状态不允许执行添加轨迹');
        return;
      }
      const updated = await apiClient.addTrackingEvent(record.id, { status: '渠道排货人工轨迹更新', happenedAt: new Date().toISOString() });
      setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
      appendShipmentOperationLog(record.id, '渠道排货：添加轨迹');
      setNotice('渠道排货已添加轨迹');
      return;
    }
  }

  function openEditShipmentOperationalModal(record: Shipment, source: ShipmentEditSource = 'operation') {
    setEditingShipmentSource(source);
    setEditingShipment(record);
    editShipmentForm.setFieldsValue({
      latestTracking: record.latestTracking,
      transferNo: record.transferNo ?? '',
      status: record.status
    });
  }

  async function handleSubmitShipmentOperationalEdit() {
    if (!editingShipment) {
      return;
    }

    const values = await editShipmentForm.validateFields();
    const oldTransferNo = editingShipment.transferNo ?? '空';
    const nextTransferNo = values.transferNo?.trim() || undefined;
    const updated = await apiClient.updateShipmentOperational(editingShipment.id, {
      latestTracking: values.latestTracking.trim(),
      transferNo: nextTransferNo,
      status: values.status
    });
    setLocalShipments((current) => current.map((shipment) => (shipment.id === editingShipment.id ? updated : shipment)));
    const logPrefix = editingShipmentSource === 'routing' ? '渠道排货：' : '';
    if (oldTransferNo !== (nextTransferNo ?? '空')) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新转单号：${oldTransferNo} -> ${nextTransferNo ?? '空'}`);
    }
    if (editingShipment.latestTracking !== updated.latestTracking) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新最新轨迹：${updated.latestTracking}`);
    }
    if (editingShipment.status !== updated.status) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新状态：${shipmentStatusLabels[editingShipment.status]} -> ${shipmentStatusLabels[updated.status]}`);
    }
    setEditingShipment(null);
    setEditingShipmentSource('operation');
    editShipmentForm.resetFields();
    setNotice(`已人工修改 ${updated.systemOrderNo} 的轨迹、转单号和状态`);
  }

  function openShipmentPaymentModal(record: Shipment) {
    setCollectingShipment(record);
    shipmentPaymentForm.setFieldsValue({
      paymentAmountUsd: record.paymentAmountUsd,
      paymentAmountCny: record.paymentAmountCny,
      paymentMethod: record.paymentMethod ?? '对公'
    });
  }

  async function handleSubmitShipmentPayment() {
    if (!collectingShipment) {
      return;
    }

    const values = await shipmentPaymentForm.validateFields();
    const hasUsd = values.paymentAmountUsd !== undefined && values.paymentAmountUsd !== null;
    const hasCny = values.paymentAmountCny !== undefined && values.paymentAmountCny !== null;

    if (!hasUsd && !hasCny) {
      shipmentPaymentForm.setFields([
        { name: 'paymentAmountUsd', errors: ['USD 或 CNY 至少填写一个'] },
        { name: 'paymentAmountCny', errors: ['USD 或 CNY 至少填写一个'] }
      ]);
      return;
    }

    const paymentInput: ShipmentPaymentUpdateInput = {
      paymentAmountUsd: hasUsd ? Number(values.paymentAmountUsd) : undefined,
      paymentAmountCny: hasCny ? Number(values.paymentAmountCny) : undefined,
      paymentMethod: values.paymentMethod
    };

    setPendingShipmentPayment({ shipment: collectingShipment, input: paymentInput });
  }

  async function confirmShipmentPayment() {
    if (!pendingShipmentPayment) {
      return;
    }

    const { shipment, input } = pendingShipmentPayment;
    const updated = await apiClient.registerShipmentPayment(shipment.id, input);
    setLocalShipments((current) => current.map((item) => (item.id === shipment.id ? updated : item)));
    appendShipmentOperationLog(shipment.id, `登记收款：${formatPaymentSummary(updated.paymentAmountUsd, updated.paymentAmountCny)} / ${updated.paymentMethod ?? '未登记'}`);
    setCollectingShipment(null);
    setPendingShipmentPayment(null);
    shipmentPaymentForm.resetFields();
    setNotice(`已登记收款 ${updated.systemOrderNo}：${formatPaymentSummary(updated.paymentAmountUsd, updated.paymentAmountCny)} / ${updated.paymentMethod ?? '未登记'}`);
  }

  function openBulkTrackingImportModal() {
    setBulkTrackingOpen(true);
    setBulkTrackingFileName(null);
    setBulkTrackingRows([]);
    setBulkTrackingResult(null);
    setBulkTrackingError(null);
  }

  async function handleBulkTrackingFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBulkTrackingError(null);

    try {
      const rows = parseBulkTrackingWorkbook(await readFileAsArrayBuffer(file));
      const result = createBulkTrackingImportResult(rows, localShipments);
      setBulkTrackingRows(rows);
      setBulkTrackingResult(result);
      setBulkTrackingFileName(file.name);
    } catch (error) {
      setBulkTrackingRows([]);
      setBulkTrackingResult(null);
      setBulkTrackingError(error instanceof Error ? error.message : '轨迹表解析失败');
    } finally {
      event.target.value = '';
    }
  }

  async function handleConfirmBulkTrackingImport() {
    if (!bulkTrackingResult || bulkTrackingResult.updates.length === 0) {
      setBulkTrackingError('没有可导入的轨迹记录');
      return;
    }

    const response = await apiClient.importTrackingEvents({ updates: bulkTrackingResult.updates });
    const updatedByShipmentId = new Map(response.updated.map((shipment) => [shipment.id, shipment]));
    setLocalShipments((current) => current.map((shipment) => updatedByShipmentId.get(shipment.id) ?? shipment));
    bulkTrackingResult.updates.forEach((update) => {
      appendShipmentOperationLog(update.shipmentId, `批量添加轨迹：${formatTrackingImportDate(update.trackingDate)} ${update.latestTracking}`);
    });
    setBulkTrackingOpen(false);
    setNotice(`已批量导入轨迹 ${bulkTrackingResult.updates.length} 票，未匹配 ${bulkTrackingResult.unmatchedOrderNos.length} 个单号`);
  }

  async function handleReceiveShipment(record: Shipment) {
    const updated = await apiClient.receiveShipment(record.id);
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    appendShipmentOperationLog(record.id, '仓库管理确认收货');
    setNotice('已确认收货，进入待排货');
  }

  async function handleRunCarrierTask(task: CarrierTaskSummary) {
    const response = await apiClient.runCarrierTask(task.id);
    setCarrierTasks((current) => current.map((item) => (item.id === response.task.id ? response.task : item)));
    setLocalShipments((current) => current.map((shipment) => (shipment.id === response.shipment.id ? response.shipment : shipment)));
    setNotice(`轨迹同步成功：${response.shipment.latestTracking}`);
  }

  async function handleRetryCarrierTask(task: CarrierTaskSummary) {
    const response = await apiClient.retryCarrierTask(task.id);
    setCarrierTasks((current) => current.map((item) => (item.id === response.task.id ? response.task : item)));
    setLocalShipments((current) => current.map((shipment) => (shipment.id === response.shipment.id ? response.shipment : shipment)));
    setNotice(`轨迹同步成功：${response.shipment.latestTracking}`);
  }

  async function handleCreateCustomerStatement() {
    const statement = await apiClient.createCustomerStatement({
      customerId: 'c-9409',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30'
    });
    setCustomerStatements((current) => [statement, ...current.filter((item) => item.id !== statement.id)]);
    setNotice(`对账单草稿 ¥${statement.total}`);
  }

  async function handleCreatePayment() {
    const selectedFees = receivables.filter((fee) => fee.customerName.startsWith('9409-') && !fee.settled);
    const amount = selectedFees.reduce((sum, fee) => sum + fee.amount, 0);
    const response = await apiClient.createPayment({
      customerId: 'c-9409',
      amount,
      feeIds: selectedFees.map((fee) => fee.id),
      note: '收款登记'
    });
    setReceivables((current) =>
      current.map((fee) => response.settledFees.find((settledFee) => settledFee.id === fee.id) ?? fee)
    );
    setCustomerAccounts((current) => current.map((account) => (account.customerId === response.account.customerId ? response.account : account)));
    setAccountLedger(await apiClient.accountLedger());
    setNotice(`收款已核销 ¥${response.payment.settledAmount}`);
  }

  async function handleCreateMasterCustomer() {
    setEditingMasterCustomer(null);
    masterCustomerForm.setFieldsValue({ customerType: '直客', customerEnabled: 'true' });
    setMasterCustomerOpen(true);
  }

  async function handleEditMasterCustomer(customer: CustomerSummary) {
    setEditingMasterCustomer(customer);
    masterCustomerForm.setFieldsValue({
      customerCode: customer.code,
      customerShortName: customer.shortName ?? customer.name,
      customerFullName: customer.fullName ?? `${customer.name} Co., Ltd.`,
      customerType: customer.customerType ?? '直客',
      salesperson: customer.salesperson ?? '',
      customerEnabled: customer.enabled ? 'true' : 'false'
    });
    setMasterCustomerOpen(true);
  }

  async function handleSubmitMasterCustomer() {
    const values = await masterCustomerForm.validateFields();
    const customerCode = values.customerCode.trim();
    const customerShortName = values.customerShortName.trim();
    const customerFullName = values.customerFullName.trim();
    const customerType = values.customerType.trim();
    const salesperson = values.salesperson.trim();
    const input = {
      code: customerCode,
      name: customerShortName,
      shortName: customerShortName,
      fullName: customerFullName,
      customerType,
      salesperson,
      enabled: values.customerEnabled === 'true'
    };
    const customer = editingMasterCustomer
      ? await apiClient.updateCustomer(editingMasterCustomer.id, input)
      : await apiClient.createCustomer(input);
    setMasterData((current) => ({
      ...current,
      customers: [...current.customers.filter((item) => item.id !== customer.id), customer]
    }));
    setMasterCustomerOpen(false);
    setEditingMasterCustomer(null);
    masterCustomerForm.resetFields();
    setNotice(editingMasterCustomer ? `${customer.code}-${customer.name} 已更新` : `已创建客户 ${customer.code}-${customer.name}，业务员 ${salesperson}`);
  }

  async function handleDisableMasterCustomer(customer: CustomerSummary) {
    const updatedCustomer = await apiClient.updateCustomerEnabled(customer.id, { enabled: false });
    setMasterData((current) => ({
      ...current,
      customers: current.customers.map((item) => (item.id === updatedCustomer.id ? updatedCustomer : item))
    }));
    setNotice(`${updatedCustomer.code}-${updatedCustomer.name} 已停用`);
  }

  async function handleCreateMasterAgent() {
    setEditingMasterAgent(null);
    masterAgentForm.setFieldsValue({ agentIntegrationType: 'MANUAL', agentEnabled: 'true' });
    setMasterAgentOpen(true);
  }

  async function handleEditMasterAgent(agent: AgentSummary) {
    setEditingMasterAgent(agent);
    masterAgentForm.setFieldsValue({
      agentCode: agent.code ?? '',
      agentShortName: agent.shortName ?? agent.name,
      agentName: agent.name,
      agentIntegrationType: agent.integrationType ?? 'MANUAL',
      agentEnabled: agent.enabled ? 'true' : 'false'
    });
    setMasterAgentOpen(true);
  }

  async function handleSubmitMasterAgent() {
    const values = await masterAgentForm.validateFields();
    const input = {
      code: values.agentCode.trim(),
      shortName: values.agentShortName.trim(),
      name: values.agentName.trim(),
      integrationType: values.agentIntegrationType,
      enabled: values.agentEnabled === 'true'
    };
    const agent = editingMasterAgent
      ? await apiClient.updateAgent(editingMasterAgent.id, input)
      : await apiClient.createAgent(input);
    setMasterData((current) => ({
      ...current,
      agents: [...current.agents.filter((item) => item.id !== agent.id), agent]
    }));
    setMasterAgentOpen(false);
    setEditingMasterAgent(null);
    masterAgentForm.resetFields();
    setNotice(editingMasterAgent ? `${agent.name} 已更新` : `${agent.name} 已创建`);
  }

  async function handleDisableMasterAgent(agent: AgentSummary) {
    const updatedAgent = await apiClient.updateAgentEnabled(agent.id, { enabled: false });
    setMasterData((current) => ({
      ...current,
      agents: current.agents.map((item) => (item.id === updatedAgent.id ? updatedAgent : item))
    }));
    setNotice(`${updatedAgent.name} 已停用`);
  }

  async function handleAiAssist(input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) {
    setAiLoading(true);
    try {
      const response = await apiClient.aiAssist(input);
      setAiResult({ title: input.task ?? input.scenario ?? input.module ?? 'AI 辅助处理', response });
    } catch (error) {
      setAiResult({
        title: input.task ?? 'AI 辅助处理',
        response: {
          provider: 'siliconflow',
          mode: 'mock',
          model: 'local-error',
          content: error instanceof Error ? error.message : 'AI 调用失败，请稍后重试'
        }
      });
    } finally {
      setAiLoading(false);
    }
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (session.user.role === 'CUSTOMER') {
    return (
      <CustomerPortal
        user={session.user}
        shipments={localShipments}
        problemTickets={problemTickets}
        receivables={receivables}
        statements={customerStatements}
        accounts={customerAccounts}
        ledger={accountLedger}
        onLogout={handleUnauthorized}
        onCreate={async (input) => {
          const created = await apiClient.createShipment(input);
          upsertLocalShipment(created);
        }}
      />
    );
  }

  return (
    <ConfigProvider theme={appTheme}>
      <Layout className="app-shell">
        <Sider className="sidebar" width={232}>
          <div className="brand">
            <div className="brand-mark">S</div>
            <div>
              <Text className="brand-title">思远物流</Text>
              <Text className="brand-subtitle">AI TMS / OMS</Text>
            </div>
          </div>
          <Menu
            className="side-menu"
            mode="inline"
            selectedKeys={[currentMenuKey]}
            items={visibleMenuItems}
            onClick={({ key }) => setActiveMenuKey(key as MenuKey)}
          />
          <Card className="sidebar-card" size="small">
            <Space direction="vertical" size={8}>
              <Flex align="center" gap={8}>
                <Bot size={16} />
                <Text strong>AI 助手在线</Text>
              </Flex>
              <Text type="secondary">可辅助录单、识别异常、解释费用、生成客户回复。</Text>
            </Space>
          </Card>
        </Sider>
        <Layout>
          <Header className="topbar">
            <Space className="business-switch" role="group" aria-label="业务类型">
              <Button
                type="primary"
                onClick={() => {
                  setSelectedStatus('ALL');
                  setActiveMenuKey('workspace');
                }}
              >
                专线 {localShipments.length}
              </Button>
            </Space>
            <Input
              className="global-search"
              prefix={<Search size={16} />}
              placeholder="搜索客户、内部单号、快递号、国家、渠道"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              allowClear
            />
            <Space>
              <Button icon={<UserCircle size={16} />} onClick={() => void openPersonalCenter()}>
                个人中心
              </Button>
              <Button icon={<ShieldCheck size={16} />}>权限视图</Button>
              <Button
                type="primary"
                icon={<Sparkles size={16} />}
                loading={aiLoading}
                onClick={() =>
                  handleAiAssist({
                    module: '全局工作流',
                    task: '生成跨模块处理建议',
                    prompt: `请基于当前专线聚合业务、${businessShipments.length}票运单、${aiQueue.length}个风险项，输出今日优先处理建议。`,
                    context: { businessType: 'DEDICATED_LINE_AGGREGATED', shipmentCount: businessShipments.length, riskCount: aiQueue.length }
                  })
                }
              >
                AI 工作流
              </Button>
            </Space>
          </Header>
          <Modal
            title="个人中心"
            open={personalCenterOpen}
            width={920}
            destroyOnHidden
            footer={(
              <Space>
                <Button icon={<LogOut size={16} />} onClick={handleUnauthorized}>
                  退出登录
                </Button>
                <Button onClick={() => setPersonalCenterOpen(false)}>关闭</Button>
              </Space>
            )}
            onCancel={() => setPersonalCenterOpen(false)}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <Card size="small" title="账号信息">
                  <Space direction="vertical" size={8}>
                    <Text type="secondary">当前账号</Text>
                    <Text strong>{session.user.username}</Text>
                    <Text type="secondary">当前角色</Text>
                    <Tag color={session.user.role === 'ADMIN' ? 'red' : 'blue'}>{getRoleDisplayName(session.user.role)}</Tag>
                  </Space>
                </Card>
                <Card size="small" title="修改密码" className="personal-center-card">
                  <Form form={passwordForm} layout="vertical">
                    <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
                      <Input.Password />
                    </Form.Item>
                    <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6, message: '新密码至少 6 位' }]}>
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      name="confirmPassword"
                      label="确认新密码"
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: '请再次输入新密码' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('两次输入的新密码不一致'));
                          }
                        })
                      ]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Button type="primary" block onClick={() => void submitPasswordChange()}>
                      保存新密码
                    </Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} lg={16}>
                <Card size="small" title="登录日志">
                  <Table<LoginLogSummary>
                    rowKey="id"
                    size="small"
                    loading={loginLogsLoading}
                    pagination={tenRowTablePagination}
                    dataSource={loginLogs}
                    columns={[
                      { title: '登录时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
                      { title: 'IP', dataIndex: 'ip', width: 140 },
                      { title: '地区', dataIndex: 'region', width: 140 },
                      { title: '设备', dataIndex: 'userAgent', ellipsis: true, render: (value?: string) => value ?? '-' }
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          </Modal>
          <Content className="content">
            {aiResult ? (
              <Alert
                className="notice-bar"
                type={aiResult.response.mode === 'live' ? 'success' : 'info'}
                showIcon
                closable
                onClose={() => setAiResult(null)}
                message={`${aiResult.title} · ${aiResult.response.mode === 'live' ? '硅基流动实时输出' : '本地兜底输出'}`}
                description={
                  <Space direction="vertical" size={6}>
                    <Text type="secondary">{aiResult.response.model}</Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{aiResult.response.content}</Text>
                  </Space>
                }
              />
            ) : null}
            {currentMenuKey === 'orders' ? (
              <>
                <Flex justify="space-between" align="center" className="page-heading">
                  <div>
                    <Title level={2}>运单履约中心</Title>
                    <Text type="secondary">围绕预报、入库、排货、发货、转单号和异常处理的前端闭环工作台。</Text>
                  </div>
                  <Space>
                    <Button icon={<FileInput size={16} />}>导入履约运单</Button>
                    <Button icon={<PackagePlus size={16} />} onClick={openOutboundOrderModal}>新建出货订单</Button>
                    <Button
                      type="primary"
                      icon={<Sparkles size={16} />}
                      loading={aiLoading}
                      onClick={() =>
                        handleAiAssist({
                          module: '运单履约',
                          task: '批量履约处理建议',
                          prompt: '请根据待审核、审核通过、审核不通过和收款状态，输出订单审核优先级、资料风险提醒和客户沟通话术。',
                          context: { auditMetrics: fulfillmentAuditMetricCards.map(({ title, value }) => ({ title, value })), samples: businessShipments.slice(0, 5) }
                        })
                      }
                    >
                      AI 批量处理
                    </Button>
                  </Space>
                </Flex>

                {notice ? <Alert className="notice-bar" type={notice.includes('不允许') ? 'error' : 'success'} showIcon message={notice} /> : null}

                <Row gutter={[16, 16]}>
                  {fulfillmentAuditMetricCards.map((metric) => (
                    <Col xs={24} md={12} xl={6} key={metric.title}>
                      <MetricCard icon={metric.icon} title={metric.title} value={metric.value} extra={metric.extra} />
                    </Col>
                  ))}
                </Row>

                <ModuleSubWorkspace
                  items={[
                    { key: 'stageBoard', label: '履约阶段看板', description: '状态池与单票操作' },
                    { key: 'aiAssistant', label: 'AI 履约助手', description: '风险识别与话术建议' }
                  ]}
                  activeKey={activeFulfillmentSection}
                  onChange={setActiveFulfillmentSection}
                >
                  {activeFulfillmentSection === 'stageBoard' ? (
                    <Card
                      className="fulfillment-board-card"
                      title={
                        <Flex align="center" gap={8}>
                          <Boxes size={18} />
                          <span>履约阶段看板</span>
                        </Flex>
                      }
                      extra={<Text type="secondary">所有动作仅更新本地 mock 状态，不触发真实发货</Text>}
                    >
                      <div className="fulfillment-board-toolbar">
                        <div className="status-strip fulfillment-status-strip">
                          {fulfillmentAuditStages.map((stage) => {
                            const count = getFulfillmentAuditStageCount(businessShipments, stage.key);
                            return (
                              <Button
                                key={stage.key}
                                type={selectedFulfillmentStage === stage.key ? 'primary' : 'default'}
                                onClick={() => setSelectedFulfillmentStage(stage.key)}
                              >
                                {stage.label} {count}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <Table
                        className="fulfillment-table"
                        rowKey="id"
                        columns={fulfillmentColumns}
                        dataSource={fulfillmentShipments}
                        size="small"
                        pagination={tenRowTablePagination}
                        scroll={{ x: 1600 }}
                      />
                    </Card>
                  ) : null}

                  {activeFulfillmentSection === 'aiAssistant' ? (
                    <Card
                      className="fulfillment-ai-card"
                      title={
                        <Flex align="center" gap={8}>
                          <Bot size={18} />
                          <span>AI 履约助手</span>
                        </Flex>
                      }
                    >
                      <div className="fulfillment-ai-grid">
                        {fulfillmentAdviceQueue.map(({ shipment, advice }) => (
                          <Card key={shipment.id} size="small" className={`risk-card risk-${advice.priority === 'urgent' ? 'high' : 'medium'}`}>
                            <Flex justify="space-between" align="start">
                              <Space direction="vertical" size={4}>
                                <Text strong>{advice.nextAction}</Text>
                                <Text type="secondary">{shipment.systemOrderNo}</Text>
                              </Space>
                              <Tag color={advice.priority === 'urgent' ? 'red' : 'orange'}>
                                {advice.priority === 'urgent' ? '紧急' : '高优先'}
                              </Tag>
                            </Flex>
                            <Space wrap className="risk-tags">
                              {advice.riskReasons.map((reason) => (
                                <Tag key={reason}>{reason}</Tag>
                              ))}
                            </Space>
                            <Alert type={advice.priority === 'urgent' ? 'error' : 'warning'} showIcon message={advice.customerMessage} />
                          </Card>
                        ))}
                      </div>
                    </Card>
                  ) : null}
                </ModuleSubWorkspace>

                <Modal
                  title="新建出货订单"
                  open={outboundOrderOpen}
                  okText="创建订单"
                  cancelText="取消"
                  width={760}
                  onOk={() => void handleCreateOutboundOrder().catch(() => undefined)}
                  onCancel={() => setOutboundOrderOpen(false)}
                >
                  <Alert
                    className="notice-bar"
                    type="info"
                    showIcon
                    message="创建时间会自动补充，订单创建后先进入待审核；审核通过后才进入仓库管理入库队列。"
                  />
                  <Form form={outboundOrderForm} layout="vertical">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="customerName" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="customerOrderNo" label="客户单号" rules={[{ required: true, message: '请输入客户单号' }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="systemOrderNo" label="系统单号">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="transferNo" label="转单号">
                          <Input placeholder="请输入快递单号" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="destinationCountry" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="carrier" label="收货渠道" rules={[{ required: true, message: '请选择收货渠道' }]}>
                          <Select
                            options={receivingChannelOptions.map((value) => ({ label: value, value }))}
                            onChange={(value) => {
                              if (value !== '自定义') {
                                outboundOrderForm.setFieldValue('customReceivingChannel', undefined);
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      {selectedReceivingChannel === '自定义' ? (
                        <Col xs={24} md={12}>
                          <Form.Item name="customReceivingChannel" label="自定义收货渠道" rules={[{ required: true, message: '请输入自定义收货渠道' }]}>
                            <Input placeholder="请输入自定义收货渠道" />
                          </Form.Item>
                        </Col>
                      ) : null}
                      <Col xs={24} md={8}>
                        <Form.Item name="packageCount" label="件数" rules={[{ required: true, message: '请输入件数' }]}>
                          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="receivableWeightKg" label="应收计费重" rules={[{ required: true, message: '请输入应收计费重' }]}>
                          <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="agentWeightKg" label="代理计费重" rules={[{ required: true, message: '请输入代理计费重' }]}>
                          <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item name="remark" label="备注">
                          <Input.TextArea rows={3} placeholder="可填写客户要求、入库说明、排货注意事项等" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Modal>

                <Modal
                  title="人工修改轨迹与状态"
                  open={Boolean(editingShipment)}
                  destroyOnHidden
                  okText="确认修改"
                  cancelText="取消"
                  width={560}
                  onOk={() => void handleSubmitShipmentOperationalEdit().catch(() => undefined)}
                  onCancel={() => {
                    setEditingShipment(null);
                    setEditingShipmentSource('operation');
                    editShipmentForm.resetFields();
                  }}
                >
                  <Alert
                    className="notice-bar"
                    type="warning"
                    showIcon
                    message="人工修改会直接覆盖该票最新轨迹、转单号和状态，并写入后端操作记录。"
                  />
                  <Form form={editShipmentForm} layout="vertical">
                    <Form.Item
                      name="latestTracking"
                      label="最新轨迹"
                      rules={[{ required: true, whitespace: true, message: '请输入最新轨迹' }]}
                    >
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="transferNo" label="转单号">
                      <Input placeholder="可直接修改或清空快递号" />
                    </Form.Item>
                    <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                      <select aria-label="状态" className="native-select">
                        {editableShipmentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {shipmentStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </Form.Item>
                  </Form>
                </Modal>

                <Modal
                  title="分配渠道"
                  open={Boolean(routingAssignmentShipment)}
                  destroyOnHidden
                  okText="确认分配"
                  cancelText="取消"
                  width={680}
                  onOk={() => void handleConfirmRoutingAssignment().catch(() => undefined)}
                  onCancel={() => {
                    setRoutingAssignmentShipment(null);
                    routingAssignmentForm.resetFields();
                  }}
                >
                  <Alert
                    className="notice-bar"
                    type="info"
                    showIcon
                    message="可从基础资料选择代理与发货渠道；如果手动输入新代理或新渠道，系统会先写入基础资料，再执行排货。"
                  />
                  <Form form={routingAssignmentForm} layout="vertical">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="agentId" label="代理">
                          <Select
                            allowClear
                            showSearch
                            placeholder="选择基础资料里的代理"
                            optionFilterProp="label"
                            options={masterData.agents
                              .filter((agent) => agent.enabled)
                              .map((agent) => ({
                                label: [agent.shortName, agent.name].filter(Boolean).join(' / '),
                                value: agent.id
                              }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="manualAgentName" label="手动代理">
                          <Input placeholder="基础资料没有时可手动输入" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="channelId" label="发货渠道">
                          <Select
                            allowClear
                            showSearch
                            placeholder="选择基础资料里的渠道"
                            optionFilterProp="label"
                            options={masterData.channels
                              .filter((channel) => channel.enabled)
                              .map((channel) => ({
                                label: `${channel.name} / ${channel.carrierName}`,
                                value: channel.id
                              }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="manualChannelName" label="手动发货渠道">
                          <Input placeholder="基础资料没有时可手动输入" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Modal>

                <Modal
                  title="登记收款金额"
                  open={Boolean(collectingShipment)}
                  destroyOnHidden
                  okText="确认收款"
                  cancelText="取消"
                  width={560}
                  onOk={() => void handleSubmitShipmentPayment().catch(() => undefined)}
                  onCancel={() => {
                    setCollectingShipment(null);
                    setPendingShipmentPayment(null);
                    shipmentPaymentForm.resetFields();
                  }}
                >
                  <Alert
                    className="notice-bar"
                    type="info"
                    showIcon
                    message="未登记前金额和付款方式显示为未知；确认收款后会写入后端并保留操作记录。"
                  />
                  <Form form={shipmentPaymentForm} layout="vertical">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="paymentAmountUsd"
                          label="收款金额 USD"
                        >
                          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="paymentAmountCny"
                          label="收款金额 CNY"
                        >
                          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="paymentMethod" label="收款方式" rules={[{ required: true, message: '请选择收款方式' }]}>
                      <select aria-label="收款方式" className="native-select">
                        {shipmentPaymentMethods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </Form.Item>
                  </Form>
                </Modal>

                <Modal
                  title="确认登记收款？"
                  open={Boolean(pendingShipmentPayment)}
                  destroyOnHidden
                  okText="确认收款"
                  cancelText="取消"
                  onOk={() => void confirmShipmentPayment().catch((error) => {
                    setNotice(error instanceof Error ? error.message : '登记收款失败');
                  })}
                  onCancel={() => setPendingShipmentPayment(null)}
                >
                  {pendingShipmentPayment ? (
                    <Alert
                      className="notice-bar"
                      type="warning"
                      showIcon
                      message={`${pendingShipmentPayment.shipment.systemOrderNo} 将登记 ${formatPaymentSummary(
                        pendingShipmentPayment.input.paymentAmountUsd,
                        pendingShipmentPayment.input.paymentAmountCny
                      )} / ${pendingShipmentPayment.input.paymentMethod}`}
                    />
                  ) : null}
                </Modal>

                <Modal
                  title="批量添加轨迹"
                  open={bulkTrackingOpen}
                  destroyOnHidden
                  okText="确认导入"
                  cancelText="取消"
                  width={760}
                  okButtonProps={{ disabled: !bulkTrackingResult || bulkTrackingResult.updates.length === 0 }}
                  onOk={() => void handleConfirmBulkTrackingImport().catch((error) => {
                    setBulkTrackingError(error instanceof Error ? error.message : '轨迹导入失败');
                  })}
                  onCancel={() => setBulkTrackingOpen(false)}
                >
                  <Alert
                    className="notice-bar"
                    type="info"
                    showIcon
                    message="客户单号为内部单号，转单号为快递号；支持按任一单号匹配。同一单号多条轨迹只取日期最新的一条。"
                  />
                  <Space direction="vertical" size={12} className="ai-list">
                    <div>
                      <label className="upload-label" htmlFor="bulk-tracking-upload">
                        导入轨迹表
                      </label>
                      <input
                        id="bulk-tracking-upload"
                        aria-label="导入轨迹表"
                        className="file-input"
                        type="file"
                        accept=".xls,.xlsx"
                        onChange={(event) => void handleBulkTrackingFileChange(event)}
                      />
                    </div>
                    {bulkTrackingFileName ? <Text type="secondary">{bulkTrackingFileName}</Text> : null}
                    {bulkTrackingError ? <Alert type="error" showIcon message={bulkTrackingError} /> : null}
                    {bulkTrackingResult ? (
                      <>
                        <Space wrap>
                          <Tag color="default">原始轨迹 {bulkTrackingRows.length} 行</Tag>
                          <Tag color="blue">待更新 {bulkTrackingResult.updates.length} 票</Tag>
                          <Tag color={bulkTrackingResult.unmatchedOrderNos.length ? 'orange' : 'green'}>
                            未匹配 {bulkTrackingResult.unmatchedOrderNos.length} 个单号
                          </Tag>
                        </Space>
                        {bulkTrackingResult.unmatchedOrderNos.length ? (
                          <Text type="secondary">未匹配：{bulkTrackingResult.unmatchedOrderNos.join('、')}</Text>
                        ) : null}
                        <Table
                          rowKey="shipmentId"
                          size="small"
                          pagination={tenRowTablePagination}
                          dataSource={bulkTrackingResult.updates.slice(0, 6)}
                          columns={[
                            { title: '匹配单号', dataIndex: 'customerOrderNo' },
                            { title: '轨迹日期', dataIndex: 'trackingDate', render: (value) => formatTrackingImportDate(value) },
                            { title: '将写入最新轨迹', dataIndex: 'latestTracking' }
                          ]}
                        />
                      </>
                    ) : null}
                  </Space>
                </Modal>

                <Modal
                  title={<span id="shipment-operation-log-title">{logViewingMode === 'routing' ? '排货日志' : '操作日志'}</span>}
                  aria-labelledby="shipment-operation-log-title"
                  open={Boolean(logViewingShipment)}
                  destroyOnHidden
                  width={760}
                  footer={<Button onClick={() => setLogViewingShipment(null)}>关闭</Button>}
                  onCancel={() => setLogViewingShipment(null)}
                >
                  <Alert
                    className="notice-bar"
                    type="info"
                    showIcon
                    message={
                      logViewingShipment
                        ? `${logViewingShipment.systemOrderNo} ${logViewingMode === 'routing' ? '排货生命周期记录' : '全生命周期操作记录'}`
                        : logViewingMode === 'routing'
                          ? '单票排货生命周期记录'
                          : '单票全生命周期操作记录'
                    }
                  />
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={tenRowTablePagination}
                    dataSource={shipmentLogs}
                    columns={[
                      { title: '操作时间', dataIndex: 'operatedAt', width: 210, render: (value: string) => formatBeijingDateTime(value) },
                      { title: '操作人员', dataIndex: 'operator', width: 130 },
                      { title: '操作动作', dataIndex: 'action' }
                    ]}
                  />
                </Modal>
              </>
            ) : currentMenuKey === 'settings' ? (
              <SystemSettingsPage apiClient={apiClient} onAiAssist={handleAiAssist} aiLoading={aiLoading} />
            ) : currentMenuKey === 'master' ? (
              <>
                <MasterDataPage
                  masterData={masterData}
                  notice={notice}
                  onAiAssist={handleAiAssist}
                  aiLoading={aiLoading}
                  onCreateCustomer={handleCreateMasterCustomer}
                  onEditCustomer={handleEditMasterCustomer}
                  onDisableCustomer={handleDisableMasterCustomer}
                  onCreateAgent={handleCreateMasterAgent}
                  onEditAgent={handleEditMasterAgent}
                  onDisableAgent={handleDisableMasterAgent}
                />
                <Modal
                  title={editingMasterCustomer ? '编辑客户' : '新建客户'}
                  open={masterCustomerOpen}
                  destroyOnHidden
                  okText={editingMasterCustomer ? '保存客户' : '创建客户'}
                  cancelText="取消"
                  width={560}
                  onOk={() => void handleSubmitMasterCustomer()}
                  onCancel={() => {
                    setMasterCustomerOpen(false);
                    setEditingMasterCustomer(null);
                  }}
                >
                  <Alert
                    className="notice-bar"
                    type="info"
                    showIcon
                    message="客户资料只维护客户主数据和业务员；删除会停用客户，不做物理删除。"
                  />
                  <Form form={masterCustomerForm} layout="vertical">
                    <Form.Item
                      name="customerCode"
                      label="客户编码"
                      rules={[{ required: true, whitespace: true, message: '请输入客户编码' }]}
                    >
                      <Input placeholder="例如 9409" />
                    </Form.Item>
                    <Form.Item
                      name="customerShortName"
                      label="客户简称"
                      rules={[{ required: true, whitespace: true, message: '请输入客户简称' }]}
                    >
                      <Input placeholder="例如 Daloday" />
                    </Form.Item>
                    <Form.Item
                      name="customerFullName"
                      label="客户全称"
                      rules={[{ required: true, whitespace: true, message: '请输入客户全称' }]}
                    >
                      <Input placeholder="例如 Daloday Inc." />
                    </Form.Item>
                    <Form.Item
                      name="customerType"
                      label="客户类型"
                      rules={[{ required: true, whitespace: true, message: '请输入客户类型' }]}
                    >
                      <Input placeholder="例如 直客" />
                    </Form.Item>
                    <Form.Item
                      name="salesperson"
                      label="业务员"
                      rules={[{ required: true, whitespace: true, message: '请输入业务员' }]}
                    >
                      <Input placeholder="例如 mira" />
                    </Form.Item>
                    <Form.Item
                      name="customerEnabled"
                      label="状态"
                      rules={[{ required: true, message: '请选择状态' }]}
                    >
                      <select className="native-select" aria-label="客户状态">
                        <option value="true">启用</option>
                        <option value="false">停用</option>
                      </select>
                    </Form.Item>
                  </Form>
                </Modal>
                <Modal
                  title={editingMasterAgent ? '编辑代理' : '新建代理'}
                  open={masterAgentOpen}
                  destroyOnHidden
                  okText={editingMasterAgent ? '保存代理' : '创建代理'}
                  cancelText="取消"
                  width={620}
                  onOk={() => void handleSubmitMasterAgent()}
                  onCancel={() => {
                    setMasterAgentOpen(false);
                    setEditingMasterAgent(null);
                    masterAgentForm.resetFields();
                  }}
                >
                  <Alert
                    className="notice-bar"
                    type="info"
                    showIcon
                    message="代理资料只维护编码、简称、名称、状态和对接类型；删除会转为停用，不做物理删除。"
                  />
                  <Form form={masterAgentForm} layout="vertical">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="agentCode"
                          label="代理编码"
                          rules={[{ required: true, whitespace: true, message: '请输入代理编码' }]}
                        >
                          <Input placeholder="例如 SZJST" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="agentShortName"
                          label="代理简称"
                          rules={[{ required: true, whitespace: true, message: '请输入代理简称' }]}
                        >
                          <Input placeholder="例如 加时特" />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item
                          name="agentName"
                          label="代理名称"
                          rules={[{ required: true, whitespace: true, message: '请输入代理名称' }]}
                        >
                          <Input placeholder="例如 深圳加时特" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="agentEnabled" label="状态" initialValue="true">
                          <select aria-label="代理状态" className="native-select">
                            <option value="true">启用</option>
                            <option value="false">停用</option>
                          </select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="agentIntegrationType" label="代理对接类型" initialValue="MANUAL">
                          <select aria-label="代理对接类型" className="native-select">
                            <option value="MANUAL">手工</option>
                            <option value="API">API 对接</option>
                            <option value="PLATFORM">平台对接</option>
                            <option value="OTHER">其他</option>
                          </select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Modal>

              </>
            ) : currentMenuKey === 'pricing' ? (
              <PricingPage
                apiClient={apiClient}
                role={session.user.role}
                notice={notice}
                onNotice={setNotice}
              />
            ) : currentMenuKey === 'finance' ? (
              <FinancePage
                receivables={receivables}
                statements={customerStatements}
                accounts={customerAccounts}
                ledger={accountLedger}
                notice={notice}
                onCreateStatement={handleCreateCustomerStatement}
                onCreatePayment={handleCreatePayment}
              />
            ) : currentMenuKey === 'receive' ? (
              <ReceiveLabelPage
                apiClient={apiClient}
                shipments={businessShipments}
                notice={notice}
                onReceive={handleReceiveShipment}
                onDispatch={handleWarehouseDispatchShipment}
              />
            ) : currentMenuKey === 'tracking' ? (
              <TrackingTaskPage
                shipments={businessShipments}
                tasks={carrierTasks}
                notice={notice}
                onRunTask={handleRunCarrierTask}
                onRetryTask={handleRetryCarrierTask}
              />
            ) : modulePageConfigs[currentMenuKey] ? (
              <GenericModulePage
                config={modulePageConfigs[currentMenuKey]}
                fulfillmentStageSummary={currentMenuKey === 'routing' ? fulfillmentStageSummary : undefined}
                fulfillmentShipments={currentMenuKey === 'routing' ? routingFulfillmentShipments : undefined}
                fulfillmentColumns={currentMenuKey === 'routing' ? routingFulfillmentColumns : undefined}
                selectedFulfillmentStage={currentMenuKey === 'routing' ? selectedRoutingStage : undefined}
                onSelectFulfillmentStage={currentMenuKey === 'routing' ? setSelectedRoutingStage : undefined}
                onOpenBulkTrackingImport={currentMenuKey === 'routing' ? undefined : openBulkTrackingImportModal}
                notice={notice}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : (
              <>
            <Flex justify="space-between" align="center" className="page-heading">
              <div>
                <Title level={2}>AI 物流运营工作台</Title>
                <Text type="secondary">
                  {businessWorkspaceConfig.description}
                </Text>
              </div>
              <Space>
                <Button icon={<FileInput size={16} />}>导入运单</Button>
                <Button icon={<PackagePlus size={16} />}>新建预报</Button>
                <Button
                  type="primary"
                  icon={<Bot size={16} />}
                  loading={aiLoading}
                  onClick={() =>
                    handleAiAssist({
                      module: '运营工作台',
                      task: '智能录单建议',
                      prompt: '请把当前导入质检错误转成录单修正建议，并给客服一段可直接发送给客户的说明。',
                      context: { importErrors: importValidation.errors, businessType }
                    })
                  }
                >
                  智能录单
                </Button>
              </Space>
            </Flex>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}>
                <MetricCard icon={<Truck />} title={businessWorkspaceConfig.metrics[0].title} value={businessShipments.length} extra={businessWorkspaceConfig.metrics[0].extra} />
              </Col>
              <Col xs={24} md={12} xl={6}>
                <MetricCard
                  icon={<Activity />}
                  title={businessWorkspaceConfig.metrics[1].title}
                  value={aiQueue.filter((item) => item.insight.tags.includes('轨迹超时')).length}
                  extra={businessWorkspaceConfig.metrics[1].extra}
                />
              </Col>
              <Col xs={24} md={12} xl={6}>
                <MetricCard icon={<Banknote />} title={businessWorkspaceConfig.metrics[2].title} value="¥ 18,642" extra={businessWorkspaceConfig.metrics[2].extra} />
              </Col>
              <Col xs={24} md={12} xl={6}>
                <MetricCard icon={<PackageCheck />} title={businessWorkspaceConfig.metrics[3].title} value="92%" extra={<Progress percent={92} showInfo={false} />} />
              </Col>
            </Row>

            <ModuleSubWorkspace
              items={[
                { key: 'shipmentPool', label: `${businessTypeLabels[businessType]}运单池`, description: '筛选与批量处理' },
                { key: 'aiQueue', label: 'AI 优先队列', description: '风险项与建议' },
                { key: 'productMap', label: '产品地图', description: '模块覆盖关系' },
                { key: 'importQuality', label: '导入质检', description: '导入错误与计划' }
              ]}
              activeKey={activeWorkspaceSection}
              onChange={setActiveWorkspaceSection}
            >
              {activeWorkspaceSection === 'shipmentPool' ? (
                <Card
                  className="workspace-focus-card"
                  title={
                    <Flex align="center" gap={8}>
                      <FileText size={18} />
                      <span>{businessTypeLabels[businessType]}运单池</span>
                    </Flex>
                  }
                  extra={<Text type="secondary">筛选、状态池、批量动作统一在一个工作面</Text>}
                >
                  <div className="status-strip">
                    <Button
                      type={selectedStatus === 'ALL' ? 'primary' : 'default'}
                      onClick={() => setSelectedStatus('ALL')}
                    >
                      全部 {businessShipments.length}
                    </Button>
                    {statusOrder.map((status) => (
                      <Button
                        key={status}
                        type={selectedStatus === status ? 'primary' : 'default'}
                        onClick={() => setSelectedStatus(status)}
                      >
                        {shipmentStatusLabels[status]} {statusCounts[status] ?? 0}
                      </Button>
                    ))}
                  </div>

                  <div className="batch-bar">
                    <Space wrap>
                      {businessWorkspaceConfig.batchActions.map((action) => (
                        <Button key={action} size="small">
                          {action}
                        </Button>
                      ))}
                    </Space>
                  </div>

                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={visibleShipments}
                    size="small"
                    pagination={tenRowTablePagination}
                    scroll={{ x: 1320 }}
                  />
                </Card>
              ) : null}

              {activeWorkspaceSection === 'aiQueue' ? (
                <div className="workspace-panel-stack">
                  <Card
                    title={
                      <Flex align="center" gap={8}>
                        <Bot size={18} />
                        <span>AI 优先处理队列</span>
                      </Flex>
                    }
                  >
                    <div className="fulfillment-ai-grid">
                      {aiQueue.map(({ shipment, insight }) => (
                        <Card key={shipment.id} size="small" className={`risk-card risk-${insight.riskLevel}`}>
                          <Flex justify="space-between" align="start">
                            <Space direction="vertical" size={4}>
                              <Text strong>{shipment.systemOrderNo}</Text>
                              <Text type="secondary">
                                {shipment.customerName} · {shipment.destinationCountry}
                              </Text>
                            </Space>
                            <Badge status={insight.riskLevel === 'high' ? 'error' : 'warning'} text={riskLabel(insight.riskLevel)} />
                          </Flex>
                          <Text className="risk-summary">{insight.summary}</Text>
                          <Space wrap className="risk-tags">
                            {insight.tags.map((tag) => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                          </Space>
                          <Alert type={insight.riskLevel === 'high' ? 'error' : 'warning'} showIcon message={insight.suggestedActions[0]} />
                        </Card>
                      ))}
                    </div>
                  </Card>

                  <Card className="assistant-card">
                    <Space direction="vertical" size={10}>
                      <Flex align="center" gap={8}>
                        <Sparkles size={18} />
                        <Text strong>下一步 AI 赋能</Text>
                      </Flex>
                      <Text type="secondary">{businessWorkspaceConfig.assistantCopy}</Text>
                      <Button
                        type="primary"
                        icon={<Send size={16} />}
                        loading={aiLoading}
                        onClick={() =>
                          handleAiAssist({
                            module: '运营工作台',
                            task: '生成今日处理建议',
                            prompt: businessWorkspaceConfig.assistantCopy,
                            context: { automationPlan, focusItems: businessWorkspaceConfig.focusItems }
                          })
                        }
                      >
                        生成今日处理建议
                      </Button>
                    </Space>
                  </Card>
                </div>
              ) : null}

              {activeWorkspaceSection === 'productMap' ? (
                <Card
                  className="workspace-focus-card"
                  title={
                    <Flex align="center" gap={8}>
                      <Boxes size={18} />
                      <Title level={3} className="card-heading">
                        全模块产品地图
                      </Title>
                    </Flex>
                  }
                  extra={<Text type="secondary">一期先闭环核心业务，二期接入硬件、微信和开放 API</Text>}
                >
                  <div className="surface-strip">
                    {moduleSummary.surfaces.map((surface) => (
                      <Tag key={surface} color={surface === 'AI 助手' ? 'blue' : 'default'}>
                        {surface}
                      </Tag>
                    ))}
                  </div>
                  <Row gutter={[12, 12]}>
                    {spotlightModules.map((module) => (
                      <Col xs={24} md={12} key={module.name}>
                        <div className="module-card">
                          <Flex justify="space-between" align="center">
                            <Text strong>
                              {module.name === '开放 API'
                                ? '开放接口与设备'
                                : module.name === 'AI 助手'
                                  ? '智能助手中心'
                                  : module.name}
                            </Text>
                            <Tag color={module.phase === 'phase-one' ? 'green' : 'gold'}>
                              {module.phase === 'phase-one' ? '一期' : '二期'}
                            </Tag>
                          </Flex>
                          <Text type="secondary">{module.capabilities.slice(0, 4).join(' / ')}</Text>
                          <div className="ai-enhancement">AI 增强：{module.aiEnhancements[0]}</div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card>
              ) : null}

              {activeWorkspaceSection === 'importQuality' ? (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card
                      title={
                        <Flex align="center" gap={8}>
                          <FileInput size={18} />
                          <span>智能导入质检</span>
                        </Flex>
                      }
                    >
                      <Space direction="vertical" size={12} className="quality-panel">
                        <Flex justify="space-between">
                          <Text>可导入行</Text>
                          <Text strong>{importValidation.validRows.length}</Text>
                        </Flex>
                        <Flex justify="space-between">
                          <Text>待修正问题</Text>
                          <Text strong type="danger">
                            {importValidation.errors.length}
                          </Text>
                        </Flex>
                        {importValidation.errors.slice(0, 3).map((error) => (
                          <Alert
                            key={`${error.rowNumber}-${error.field}`}
                            type="warning"
                            showIcon
                            message={`第 ${error.rowNumber} 行：${error.message}`}
                          />
                        ))}
                      </Space>
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card className="automation-card" title="AI 自动化计划">
                      <Space direction="vertical" size={10} className="quality-panel">
                        {automationPlan.map((item) => (
                          <div key={item.shipmentId} className="automation-item">
                            <Flex justify="space-between" align="center">
                              <Text strong>{item.title}</Text>
                              <Tag color={item.priority === 'urgent' ? 'red' : item.priority === 'high' ? 'orange' : 'default'}>
                                {item.priority === 'urgent' ? '紧急' : item.priority === 'high' ? '高优先' : '普通'}
                              </Tag>
                            </Flex>
                            <Text type="secondary">{item.actions.slice(0, 2).join('；')}</Text>
                          </div>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                </Row>
              ) : null}
            </ModuleSubWorkspace>
              </>
            )}
            <Modal
              title="批量添加轨迹"
              open={bulkTrackingOpen && currentMenuKey !== 'orders'}
              destroyOnHidden
              okText="确认导入"
              cancelText="取消"
              width={760}
              okButtonProps={{ disabled: !bulkTrackingResult || bulkTrackingResult.updates.length === 0 }}
              onOk={() => void handleConfirmBulkTrackingImport().catch((error) => {
                setBulkTrackingError(error instanceof Error ? error.message : '轨迹导入失败');
              })}
              onCancel={() => setBulkTrackingOpen(false)}
            >
              <Alert
                className="notice-bar"
                type="info"
                showIcon
                message="客户单号为内部单号，转单号为快递号；支持按任一单号匹配。同一单号多条轨迹只取日期最新的一条。"
              />
              <Space direction="vertical" size={12} className="ai-list">
                <div>
                  <label className="upload-label" htmlFor="bulk-tracking-upload-global">
                    导入轨迹表
                  </label>
                  <input
                    id="bulk-tracking-upload-global"
                    aria-label="导入轨迹表"
                    className="file-input"
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={(event) => void handleBulkTrackingFileChange(event)}
                  />
                </div>
                {bulkTrackingFileName ? <Text type="secondary">{bulkTrackingFileName}</Text> : null}
                {bulkTrackingError ? <Alert type="error" showIcon message={bulkTrackingError} /> : null}
                {bulkTrackingResult ? (
                  <>
                    <Space wrap>
                      <Tag color="default">原始轨迹 {bulkTrackingRows.length} 行</Tag>
                      <Tag color="blue">待更新 {bulkTrackingResult.updates.length} 票</Tag>
                      <Tag color={bulkTrackingResult.unmatchedOrderNos.length ? 'orange' : 'green'}>
                        未匹配 {bulkTrackingResult.unmatchedOrderNos.length} 个单号
                      </Tag>
                    </Space>
                    {bulkTrackingResult.unmatchedOrderNos.length ? (
                      <Text type="secondary">未匹配：{bulkTrackingResult.unmatchedOrderNos.join('、')}</Text>
                    ) : null}
                    <Table
                      rowKey="shipmentId"
                      size="small"
                      pagination={tenRowTablePagination}
                      dataSource={bulkTrackingResult.updates.slice(0, 6)}
                      columns={[
                        { title: '匹配单号', dataIndex: 'customerOrderNo' },
                        { title: '轨迹日期', dataIndex: 'trackingDate', render: (value) => formatTrackingImportDate(value) },
                        { title: '将写入最新轨迹', dataIndex: 'latestTracking' }
                      ]}
                    />
                  </>
                ) : null}
              </Space>
            </Modal>
            <Modal
              title="人工修改轨迹与状态"
              open={Boolean(editingShipment) && currentMenuKey !== 'orders'}
              destroyOnHidden
              okText="确认修改"
              cancelText="取消"
              width={560}
              onOk={() => void handleSubmitShipmentOperationalEdit().catch(() => undefined)}
              onCancel={() => {
                setEditingShipment(null);
                setEditingShipmentSource('operation');
                editShipmentForm.resetFields();
              }}
            >
              <Alert
                className="notice-bar"
                type="warning"
                showIcon
                  message={
                    editingShipmentSource === 'routing'
                      ? '从渠道排货入口修改会写入排货日志，并同步覆盖该票最新轨迹、转单号和状态。'
                    : '人工修改会直接覆盖该票最新轨迹、转单号和状态，并写入后端操作记录。'
                }
              />
              <Form form={editShipmentForm} layout="vertical">
                <Form.Item
                  name="latestTracking"
                  label="最新轨迹"
                  rules={[{ required: true, whitespace: true, message: '请输入最新轨迹' }]}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="transferNo" label="转单号">
                  <Input placeholder="可直接修改或清空快递号" />
                </Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <select aria-label="状态" className="native-select">
                    {editableShipmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {shipmentStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </Form.Item>
              </Form>
            </Modal>
            <Modal
              title="分配渠道"
              open={Boolean(routingAssignmentShipment) && currentMenuKey !== 'orders'}
              destroyOnHidden
              okText="确认分配"
              cancelText="取消"
              width={680}
              onOk={() => void handleConfirmRoutingAssignment().catch(() => undefined)}
              onCancel={() => {
                setRoutingAssignmentShipment(null);
                routingAssignmentForm.resetFields();
              }}
            >
              <Alert
                className="notice-bar"
                type="info"
                showIcon
                message="可从基础资料选择代理与发货渠道；如果手动输入新代理或新渠道，系统会先写入基础资料，再执行排货。"
              />
              <Form form={routingAssignmentForm} layout="vertical">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="agentId" label="代理">
                      <Select
                        allowClear
                        showSearch
                        placeholder="选择基础资料里的代理"
                        optionFilterProp="label"
                        options={masterData.agents
                          .filter((agent) => agent.enabled)
                          .map((agent) => ({
                            label: [agent.shortName, agent.name].filter(Boolean).join(' / '),
                            value: agent.id
                          }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="manualAgentName" label="手动代理">
                      <Input placeholder="基础资料没有时可手动输入" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="channelId" label="发货渠道">
                      <Select
                        allowClear
                        showSearch
                        placeholder="选择基础资料里的渠道"
                        optionFilterProp="label"
                        options={masterData.channels
                          .filter((channel) => channel.enabled)
                          .map((channel) => ({
                            label: `${channel.name} / ${channel.carrierName}`,
                            value: channel.id
                          }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="manualChannelName" label="手动发货渠道">
                      <Input placeholder="基础资料没有时可手动输入" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Modal>
            <Modal
              title={<span id="shipment-operation-log-title-global">{logViewingMode === 'routing' ? '排货日志' : '操作日志'}</span>}
              aria-labelledby="shipment-operation-log-title-global"
              open={Boolean(logViewingShipment) && currentMenuKey !== 'orders'}
              destroyOnHidden
              width={760}
              footer={<Button onClick={() => setLogViewingShipment(null)}>关闭</Button>}
              onCancel={() => setLogViewingShipment(null)}
            >
              <Alert
                className="notice-bar"
                type="info"
                showIcon
                message={
                  logViewingShipment
                    ? `${logViewingShipment.systemOrderNo} ${logViewingMode === 'routing' ? '排货生命周期记录' : '全生命周期操作记录'}`
                    : logViewingMode === 'routing'
                      ? '单票排货生命周期记录'
                      : '单票全生命周期操作记录'
                }
              />
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={shipmentLogs}
                columns={[
                  { title: '操作时间', dataIndex: 'operatedAt', width: 210, render: (value: string) => formatBeijingDateTime(value) },
                  { title: '操作人员', dataIndex: 'operator', width: 130 },
                  { title: '操作动作', dataIndex: 'action' }
                ]}
              />
            </Modal>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

function parseBulkTrackingWorkbook(arrayBuffer: ArrayBuffer): BulkTrackingImportRow[] {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('轨迹表为空');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, defval: '' });
  const [headers, ...dataRows] = rows;
  if (!headers?.length) {
    throw new Error('轨迹表缺少表头');
  }

  const orderIndex = findHeaderIndex(headers, ['客户单号或者转单号', '客户单号或转单号', '内部单号或者快递号', '内部单号或快递号', '客户单号', '内部单号', '转单号', '快递号', '单号', '订单号']);
  const dateIndex = findHeaderIndex(headers, ['日期', '时间', '轨迹时间', '扫描时间']);
  const descriptionIndex = findHeaderIndex(headers, ['描述', '轨迹描述', '内容', '轨迹内容']);
  const locationIndex = findHeaderIndex(headers, ['位置', '地点', 'location', '国家']);

  if (orderIndex < 0 || dateIndex < 0 || descriptionIndex < 0) {
    throw new Error('轨迹表必须包含客户单号或者转单号、日期、描述');
  }

  return dataRows
    .map((row) => ({
      customerOrderNo: cellToText(row[orderIndex]),
      date: typeof row[dateIndex] === 'number' ? (row[dateIndex] as number) : cellToText(row[dateIndex]),
      description: cellToText(row[descriptionIndex]),
      location: locationIndex >= 0 ? cellToText(row[locationIndex]) : undefined
    }))
    .filter((row) => row.customerOrderNo && row.description);
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('无法读取轨迹表文件'));
    };
    reader.onerror = () => reject(new Error('无法读取轨迹表文件'));
    reader.readAsArrayBuffer(file);
  });
}

function findHeaderIndex(headers: Array<string | number | null>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function findLooseHeaderIndex(headers: Array<string | number | null>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => {
    const normalizedHeader = normalizeHeader(header);
    return normalizedAliases.some((alias) => normalizedHeader.includes(alias));
  });
}

function normalizeHeader(value: string | number | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function cellToText(value: string | number | null | undefined) {
  return String(value ?? '').trim();
}

function formatTrackingImportDate(value: string | number) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return String(value);
    }
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')} ${String(parsed.H).padStart(2, '0')}:${String(parsed.M).padStart(2, '0')}`;
  }

  return value;
}

const seedImportedPriceRows: ImportedPriceRow[] = [
  {
    id: 'price-a-us-0-5',
    agentName: 'a代理',
    carrierName: 'DHL',
    channelName: 'DHL HK',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHL代理',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 5,
    costPerKg: 22,
    currency: 'CNY',
    transitDays: 5,
    transitLabel: '4-7 天'
  },
  {
    id: 'price-a-la-0-1000',
    agentName: 'a代理',
    carrierName: 'DHL',
    sourceSheetName: 'YY美西快线海卡渠道汇总',
    channelName: '海运洛杉矶专线',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHK03',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 1000,
    costPerKg: 18,
    currency: 'CNY',
    transitDays: 25,
    transitLabel: '22-28 天'
  },
  {
    id: 'price-a-houston-0-1000',
    agentName: 'a代理',
    carrierName: 'DHL',
    sourceSheetName: 'YY美中快线海卡渠道汇总',
    channelName: '海运休斯顿专线',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHK01',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 1000,
    costPerKg: 19,
    currency: 'CNY',
    transitDays: 22,
    transitLabel: '20-25 天'
  },
  {
    id: 'price-a-air-la-0-1000',
    agentName: 'a代理',
    carrierName: 'DHL',
    sourceSheetName: 'YY美西快线海卡渠道汇总',
    channelName: '空运洛杉矶专线',
    realChannelName: 'DHL-A',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 1000,
    costPerKg: 32,
    currency: 'CNY',
    transitDays: 7,
    transitLabel: '5-9 天'
  },
  {
    id: 'price-a-us-5-20',
    agentName: 'a代理',
    carrierName: 'DHL',
    channelName: 'DHL HK',
    businessRouteName: 'HK-DHL',
    realChannelName: 'DHL代理',
    destinationCountry: '美国',
    minWeightKg: 5,
    maxWeightKg: 20,
    costPerKg: 20,
    currency: 'CNY',
    transitDays: 5,
    transitLabel: '4-7 天'
  },
  {
    id: 'price-b-us-0-5',
    agentName: 'b代理',
    carrierName: 'UPS',
    channelName: 'UPS 加美线',
    businessRouteName: 'HK-UPS蓝单',
    realChannelName: 'UPS-HK-C蓝单',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 5,
    costPerKg: 21.5,
    currency: 'CNY',
    transitDays: 8,
    transitLabel: '6-10 天'
  }
];

function calculatePriceChargeableWeight(values: Partial<PriceLookupFormValues>): number {
  const packageCount = values.packageCount ?? 1;
  const dimensionWeight =
    values.lengthCm && values.widthCm && values.heightCm
      ? (values.lengthCm * values.widthCm * values.heightCm * packageCount) / 6000
      : 0;
  const volumeWeight = values.volumeCbm ? values.volumeCbm * 167 : 0;
  const actualWeight = values.actualWeightKg ?? (values.unitActualWeightKg ? values.unitActualWeightKg * packageCount : 0);
  return roundMoney(Math.max(dimensionWeight, volumeWeight, actualWeight));
}

function parsePriceWorkbook(arrayBuffer: ArrayBuffer): ImportedPriceRow[] {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  if (!workbook.SheetNames.length) {
    throw new Error('价格表为空');
  }

  const canonicalRows = parseCanonicalPriceWorkbook(workbook);
  if (canonicalRows.length) {
    return canonicalRows;
  }

  const warehouseSummaryRows = parseWarehouseSummaryPriceWorkbook(workbook);
  if (warehouseSummaryRows.length) {
    return warehouseSummaryRows;
  }

  throw new Error('价格表必须包含代理、渠道、目的地、最小重量、最大重量、成本单价，或包含对应渠道、仓库编码、12KG+/51KG+等卡派汇总表头');
}

function parseCanonicalPriceWorkbook(workbook: XLSX.WorkBook): ImportedPriceRow[] {
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, defval: '' });
    const [headers, ...dataRows] = rows;
    if (!headers?.length) {
      return [];
    }

    const agentIndex = findHeaderIndex(headers, ['代理', '代理名称', 'agent']);
    const channelIndex = findHeaderIndex(headers, ['渠道', '渠道名称', 'channel']);
    const carrierIndex = findHeaderIndex(headers, ['承运商', '承运商大类', 'carrier']);
    const businessRouteIndex = findHeaderIndex(headers, ['承运路线', '内部路线', '业务路线', 'businessRoute', 'route']);
    const realChannelIndex = findHeaderIndex(headers, ['渠道报价表', '真实渠道', '报价渠道', '代理渠道', 'agentChannelName', 'realChannelName']);
    const countryIndex = findHeaderIndex(headers, ['目的地', '目的国', '国家', 'destination']);
    const minWeightIndex = findHeaderIndex(headers, ['最小重量', '起始重量', 'minWeight', 'min']);
    const maxWeightIndex = findHeaderIndex(headers, ['最大重量', '结束重量', 'maxWeight', 'max']);
    const costIndex = findHeaderIndex(headers, ['成本单价', '代理成本价', '成本价', '单价', 'cost']);
    const currencyIndex = findHeaderIndex(headers, ['币种', 'currency']);
    const warehouseIndex = findHeaderIndex(headers, ['仓库编码', '亚马逊代码', 'FBA仓库代码', 'warehouse']);
    const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '时效', '运输时效', 'transit']);

    if (agentIndex < 0 || channelIndex < 0 || countryIndex < 0 || minWeightIndex < 0 || maxWeightIndex < 0 || costIndex < 0) {
      return [];
    }

    return dataRows
      .map((row, index) => ({
        id: `import-price-${Date.now()}-${sheetName}-${index}`,
        agentName: cellToText(row[agentIndex]),
        sourceSheetName: sheetName.trim() || sheetName,
        channelName: cellToText(row[channelIndex]),
        carrierName: carrierIndex >= 0 ? cellToText(row[carrierIndex]) || undefined : undefined,
        businessRouteName: businessRouteIndex >= 0 ? cellToText(row[businessRouteIndex]) || undefined : undefined,
        realChannelName: realChannelIndex >= 0 ? cellToText(row[realChannelIndex]) || undefined : cellToText(row[channelIndex]),
        warehouseCode: warehouseIndex >= 0 ? cellToText(row[warehouseIndex]) || undefined : undefined,
        destinationCountry: cellToText(row[countryIndex]),
        minWeightKg: cellToNumber(row[minWeightIndex]),
        maxWeightKg: cellToNumber(row[maxWeightIndex]),
        costPerKg: cellToNumber(row[costIndex]),
        currency: currencyIndex >= 0 ? cellToText(row[currencyIndex]) || 'CNY' : 'CNY',
        transitDays: transitIndex >= 0 ? parseTransitDays(row[transitIndex]) : undefined,
          transitLabel: transitIndex >= 0 ? cellToText(row[transitIndex]) || undefined : undefined
      }))
      .filter((row) => row.agentName && row.channelName && row.destinationCountry && row.maxWeightKg > row.minWeightKg && row.costPerKg > 0);
  });
}

function parseWarehouseSummaryPriceWorkbook(workbook: XLSX.WorkBook): ImportedPriceRow[] {
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, defval: '' });
    const sheetWarehouseCode = findSheetWarehouseCode(rows);
    const headerIndex = rows.findIndex((row, index) => {
      const channelHeaderIndex = findHeaderIndex(row, ['对应渠道', '下单渠道']);
      if (channelHeaderIndex < 0 || (findHeaderIndex(row, ['仓库编码', '亚马逊代码', 'FBA仓库代码']) < 0 && !sheetWarehouseCode)) {
        return false;
      }
      const currentRowHasWeightTier = row.some((cell) => Boolean(getImportedWeightRange(cell)));
      const nextRowHasWeightTier = (rows[index + 1] ?? []).some((cell) => Boolean(getImportedWeightRange(cell)));
      return currentRowHasWeightTier || nextRowHasWeightTier;
    });
    if (headerIndex < 0) {
      return [];
    }

    const headers = rows[headerIndex];
    const secondaryHeaders = rows[headerIndex + 1] ?? [];
    const channelIndex = findHeaderIndex(headers, ['对应渠道', '下单渠道']);
    const warehouseIndex = findHeaderIndex(headers, ['仓库编码', '亚马逊代码', 'FBA仓库代码']);
    const transitIndex = findLooseHeaderIndex(headers, ['参考时效', '时效', '时效赔付']) >= 0
      ? findLooseHeaderIndex(headers, ['参考时效', '时效', '时效赔付'])
      : findLooseHeaderIndex(secondaryHeaders, ['参考时效', '时效', '时效赔付']);
    const tierColumns = Array.from({ length: Math.max(headers.length, secondaryHeaders.length) })
      .map((_, columnIndex) => ({ columnIndex, range: getImportedWeightRange(headers[columnIndex]) ?? getImportedWeightRange(secondaryHeaders[columnIndex]) }))
      .filter((item): item is { columnIndex: number; range: { minWeightKg: number; maxWeightKg: number } } => Boolean(item.range));

    let inheritedChannelName = '';
    return rows.slice(headerIndex + 1).flatMap((row, rowIndex) => {
      const rowChannelName = cellToText(row[channelIndex]);
      if (rowChannelName) {
        inheritedChannelName = normalizeImportedChannelName(rowChannelName);
      }
      const channelName = rowChannelName ? normalizeImportedChannelName(rowChannelName) : inheritedChannelName;
      const warehouseCode = warehouseIndex >= 0 ? cellToText(row[warehouseIndex]) : sheetWarehouseCode;
      const warehouseCodes = splitImportedWarehouseCodes(warehouseCode);
      const transitLabel = transitIndex >= 0 ? cellToText(row[transitIndex]) || undefined : undefined;
      if (!channelName || !warehouseCodes.length) {
        return [];
      }

      return tierColumns
        .flatMap(({ columnIndex, range }) =>
          warehouseCodes.map((code) => ({
            id: `import-price-${Date.now()}-${sheetName}-${rowIndex}-${columnIndex}-${code}`,
            agentName: '亿阳国际',
            sourceSheetName: sheetName.trim() || sheetName,
            carrierName: inferPriceCarrierName({ id: 'parse-preview', agentName: '亿阳国际', channelName, destinationCountry: '美国', minWeightKg: range.minWeightKg, maxWeightKg: range.maxWeightKg, costPerKg: 1, currency: 'CNY' }),
            channelName,
            realChannelName: channelName,
            warehouseCode: code,
            destinationCountry: '美国',
            minWeightKg: range.minWeightKg,
            maxWeightKg: range.maxWeightKg,
            costPerKg: cellToNumber(row[columnIndex]),
            currency: 'CNY',
            transitDays: parseTransitDays(transitLabel),
            transitLabel
          }))
        )
        .filter((price) => price.costPerKg > 0);
    });
  });
}

function normalizeImportedChannelName(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item && !item.includes('按方包税') && !item.startsWith('船司')) ?? value.trim();
}

function splitImportedWarehouseCodes(value: string) {
  const normalized = value
    .replace(/[，、;；/]/g, ' ')
    .replace(/\([^)]*\)|（[^）]*）/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!normalized) {
    return [];
  }
  return Array.from(new Set(normalized.split(' ').filter((item) => /^[A-Z]{2,6}\d[A-Z0-9]*$/.test(item))));
}

function findSheetWarehouseCode(rows: Array<Array<string | number | null>>) {
  const amazonCodePattern = /^[A-Z]{2,5}\d[A-Z0-9]*$/;
  for (const row of rows.slice(0, 5)) {
    for (const cell of row) {
      const value = cellToText(cell).replace(/\s+/g, '').toUpperCase();
      if (amazonCodePattern.test(value)) {
        return value;
      }
    }
  }
  return '';
}

function getImportedWeightRange(value: string | number | null | undefined) {
  const header = normalizeHeader(value).replace(/\s+/g, '');
  if (header.includes('12kg+')) {
    return { minWeightKg: 12, maxWeightKg: 50.999 };
  }
  if (header.includes('51kg+')) {
    return { minWeightKg: 51, maxWeightKg: 99.999 };
  }
  if (header.includes('100kg+')) {
    return { minWeightKg: 100, maxWeightKg: 99999 };
  }
  return null;
}

function parseTransitDays(value: string | number | null | undefined) {
  if (typeof value === 'number' && value > 0) {
    return value;
  }

  const text = cellToText(value);
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number).filter((item) => item > 0) ?? [];
  if (!numbers.length) {
    return undefined;
  }

  return Math.min(...numbers);
}

function cellToNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }
  return Number(String(value ?? '').trim()) || 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

const clientRoleRows = [
  { role: '客户管理员', scope: '客户公司全部运单', permissions: '预报、导入、对账、余额、成员管理' },
  { role: '客户操作员', scope: '本人创建运单', permissions: '预报、导入、问题件回复、轨迹查询' },
  { role: '客户财务', scope: '客户公司账务', permissions: '对账单、费用明细、账户余额、付款记录' }
];

function SystemSettingsPage({
  apiClient,
  onAiAssist,
  aiLoading
}: {
  apiClient: ApiClient;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [roleMatrix, setRoleMatrix] = useState<RolePermissionMatrix | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Record<RoleKey, PermissionKey[]>>({
    ADMIN: [],
    CUSTOMER_SERVICE: [],
    OPERATOR: [],
    WAREHOUSE: [],
    FINANCE: [],
    CUSTOMER: []
  });
  const [activeSettingsSection, setActiveSettingsSection] = useState('accounts');
  const settingsSubItems: ModuleSubNavItem[] = [
    { key: 'accounts', label: '员工账号管理', description: '账号与数据范围' },
    { key: 'rolePermissions', label: '角色权限分配', description: '员工端权限' },
    { key: 'clientPermissions', label: '客户端角色权限', description: '客户门户边界' },
    { key: 'security', label: '权限安全区', description: '风险边界提示' },
    { key: 'aiSecurity', label: 'AI 接口安全', description: '密钥与调用入口' },
    { key: 'audit', label: '高危操作审计', description: '审计规则' },
    { key: 'baseConfig', label: '系统基础配置', description: '模板与状态字典' }
  ];

  const handleSettingAction = (message: string) => {
    setSettingsNotice(message);
  };

  useEffect(() => {
    let mounted = true;
    void apiClient.rolePermissions().then((matrix) => {
      if (!mounted) {
        return;
      }
      setRoleMatrix(matrix);
      setDraftPermissions(
        matrix.roles.reduce(
          (acc, role) => ({ ...acc, [role.key]: role.permissions }),
          { ADMIN: [], CUSTOMER_SERVICE: [], OPERATOR: [], WAREHOUSE: [], FINANCE: [], CUSTOMER: [] } as Record<RoleKey, PermissionKey[]>
        )
      );
    });
    return () => {
      mounted = false;
    };
  }, [apiClient]);

  const allRoleRows = roleMatrix?.roles ?? [];
  const roleRows = allRoleRows.filter((role) => role.key !== 'CUSTOMER');
  const permissionGroups = Object.entries(
    (roleMatrix?.availablePermissions ?? []).reduce<Record<string, RolePermissionMatrix['availablePermissions']>>((acc, permission) => {
      acc[permission.group] = [...(acc[permission.group] ?? []), permission];
      return acc;
    }, {})
  );

  async function saveRolePermissions(role: RolePermissionRow) {
    const updated = await apiClient.updateRolePermissions(role.key, draftPermissions[role.key] ?? []);
    setRoleMatrix((current) =>
      current
        ? {
            ...current,
            roles: current.roles.map((item) => (item.key === updated.key ? updated : item))
          }
        : current
    );
    setDraftPermissions((current) => ({ ...current, [updated.key]: updated.permissions }));
    setSettingsNotice(`${updated.label}权限已保存，RBAC 即时生效`);
  }

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>系统设置中心</Title>
          <Text type="secondary">系统管理员 · 最大权限</Text>
        </div>
        <Space>
          <Button icon={<FileInput size={16} />} onClick={() => handleSettingAction('已模拟导入员工与角色配置')}>
            导入配置
          </Button>
          <Button icon={<ClipboardCheck size={16} />} onClick={() => handleSettingAction('已模拟导出权限矩阵')}>
            导出权限
          </Button>
          <Button
            type="primary"
            icon={<Sparkles size={16} />}
            loading={aiLoading}
            onClick={() =>
              onAiAssist({
                module: '系统设置',
                task: '权限体检',
                prompt: '请检查管理员、客服、业务员、仓库、财务的权限边界，重点关注报价管理、财务核销、系统设置这些高风险能力。',
                context: { roles: roleRows.map((role) => ({ key: role.key, label: role.label, permissions: role.permissions })) }
              })
            }
          >
            AI 权限体检
          </Button>
        </Space>
      </Flex>

      {settingsNotice ? <Alert className="notice-bar" type="success" showIcon message={settingsNotice} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard icon={<ShieldCheck />} title="管理员权限" value="100%" extra="菜单、按钮、数据范围、系统参数" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Users />} title="员工角色" value={roleRows.length || 5} extra="管理员/客服/业务员/仓库/财务" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Activity />} title="审计项" value="9" extra="权限修改必须写入 audit_logs" />
        </Col>
      </Row>

      <ModuleSubWorkspace items={settingsSubItems} activeKey={activeSettingsSection} onChange={setActiveSettingsSection}>
      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24}>
          {activeSettingsSection === 'accounts' ? (
          <Card
            title={
              <Flex align="center" gap={8}>
                <Users size={18} />
                <span>员工账号管理</span>
              </Flex>
            }
            extra={
              <Space>
                <Button size="small" onClick={() => handleSettingAction('已模拟新建员工账号')}>
                  新建员工
                </Button>
                <Button size="small" onClick={() => handleSettingAction('已模拟员工账号重置密码')}>
                  员工账号重置密码
                </Button>
              </Space>
            }
          >
            <Table
              rowKey="key"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={roleRows}
              loading={!roleMatrix}
              columns={[
                { title: '角色', dataIndex: 'label', width: 130, render: (value: string, record) => <Tag color={record.key === 'ADMIN' ? 'red' : record.key === 'CUSTOMER' ? 'green' : 'blue'}>{value}</Tag> },
                { title: '账号', dataIndex: 'account', width: 130, render: (value: string) => <Text code>{value}</Text> },
                { title: '数据范围', dataIndex: 'scope', width: 160 },
                { title: '边界', dataIndex: 'restriction' }
              ]}
            />
          </Card>
          ) : null}

          {activeSettingsSection === 'rolePermissions' ? (
          <Card className="module-grid" title="角色权限分配">
            <Table
              rowKey="key"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={roleRows}
              loading={!roleMatrix}
              columns={[
                { title: '角色', dataIndex: 'label', width: 120, render: (value: string) => <Text strong>{value}</Text> },
                {
                  title: '可配置权限',
                  render: (_, record) =>
                    record.key === 'ADMIN' ? (
                      <Space wrap>
                        {record.permissions.map((permission) => (
                          <Tag key={permission} color="red">{roleMatrix?.availablePermissions.find((item) => item.code === permission)?.label ?? permission}</Tag>
                        ))}
                      </Space>
                    ) : (
                      <Space direction="vertical" size={10} className="role-permission-groups">
                        {permissionGroups.map(([group, permissions]) => (
                          <div key={group} className="role-permission-group">
                            <Text type="secondary" className="role-permission-group-title">{group}</Text>
                            <Space wrap>
                              {permissions.map((permission) => (
                                <Checkbox
                                  key={permission.code}
                                  checked={(draftPermissions[record.key] ?? []).includes(permission.code)}
                                  onChange={(event) =>
                                    setDraftPermissions((current) => {
                                      const currentPermissions = new Set(current[record.key] ?? []);
                                      if (event.target.checked) {
                                        currentPermissions.add(permission.code);
                                      } else {
                                        currentPermissions.delete(permission.code);
                                      }
                                      return { ...current, [record.key]: [...currentPermissions] };
                                    })
                                  }
                                >
                                  {permission.label}
                                </Checkbox>
                              ))}
                            </Space>
                          </div>
                        ))}
                      </Space>
                    )
                },
                {
                  title: '操作',
                  width: 150,
                  render: (_, record) => (
                    <Button size="small" disabled={record.key === 'ADMIN'} onClick={() => saveRolePermissions(record)}>
                      保存{record.label.replace('系统管理员', '管理员')}权限
                    </Button>
                  )
                }
              ]}
            />
          </Card>
          ) : null}

          {activeSettingsSection === 'clientPermissions' ? (
          <Card className="module-grid" title="分配客户端角色权限">
            <Table
              rowKey="role"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={clientRoleRows}
              columns={[
                { title: '客户端角色', dataIndex: 'role', width: 150 },
                { title: '数据范围', dataIndex: 'scope', width: 180 },
                { title: '可用能力', dataIndex: 'permissions' }
              ]}
            />
          </Card>
          ) : null}
        </Col>

        <Col xs={24}>
          {activeSettingsSection === 'security' ? (
          <Card
            title={
              <Flex align="center" gap={8}>
                <ShieldCheck size={18} />
                <span>权限安全区</span>
              </Flex>
            }
          >
            <Space direction="vertical" size={12} className="quality-panel">
              <Alert type="success" showIcon message="系统管理员默认拥有最大权限" />
              <Alert type="warning" showIcon message="客服不能改财务核销" />
              <Alert type="warning" showIcon message="财务不能改系统权限" />
              <Alert type="info" showIcon message="客户只能访问本人或所属客户公司的数据" />
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'aiSecurity' ? (
          <Card className="automation-card" title="AI 接口安全">
            <Space direction="vertical" size={10} className="quality-panel">
              <Tag color="blue">硅基流动</Tag>
              <Alert type="success" showIcon message="所有 AI 调用统一走后端 /api/ai/assist" />
              <Alert type="warning" showIcon message="SILICONFLOW_API_KEY 只读取环境变量，不写入前端代码" />
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'audit' ? (
          <Card className="automation-card" title="高危操作审计">
            <Space direction="vertical" size={10} className="quality-panel">
              {['权限修改必须写入 audit_logs', '员工账号重置密码必须记录操作人', '角色权限分配需要保存前后变化', '系统参数修改需要二次确认'].map((item) => (
                <Alert key={item} type="info" showIcon message={item} />
              ))}
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'baseConfig' ? (
          <Card className="automation-card" title="系统基础配置">
            <Space wrap>
              {['公司资料', '模板', '通知', '轨迹规则', '状态字典', '转单提醒'].map((item) => (
                <Button key={item} onClick={() => handleSettingAction(`已进入${item}模拟配置`)}>
                  {item}
                </Button>
              ))}
            </Space>
          </Card>
          ) : null}
        </Col>
      </Row>
      </ModuleSubWorkspace>
    </>
  );
}

const agentIntegrationLabels: Record<AgentIntegrationType, string> = {
  MANUAL: '手工',
  API: 'API 对接',
  PLATFORM: '平台对接',
  OTHER: '其他'
};

function MasterDataPage({
  masterData,
  notice,
  onAiAssist,
  aiLoading,
  onCreateCustomer,
  onEditCustomer,
  onDisableCustomer,
  onCreateAgent,
  onEditAgent,
  onDisableAgent
}: {
  masterData: MasterDataSnapshot;
  notice: string | null;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  onCreateCustomer: () => Promise<void>;
  onEditCustomer: (customer: CustomerSummary) => Promise<void>;
  onDisableCustomer: (customer: CustomerSummary) => Promise<void>;
  onCreateAgent: () => Promise<void>;
  onEditAgent: (agent: AgentSummary) => Promise<void>;
  onDisableAgent: (agent: AgentSummary) => Promise<void>;
}) {
  const summary = summarizeMasterDataSnapshot(masterData);
  const [customerFilters, setCustomerFilters] = useState({
    name: '',
    code: '',
    status: 'ALL',
    customerType: 'ALL',
    salesperson: ''
  });
  const [appliedCustomerFilters, setAppliedCustomerFilters] = useState(customerFilters);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerListSettingOpen, setCustomerListSettingOpen] = useState(false);
  const [customerDisableConfirmOpen, setCustomerDisableConfirmOpen] = useState(false);
  const [showCustomerStatus, setShowCustomerStatus] = useState(true);
  const [showCustomerType, setShowCustomerType] = useState(true);
  const [agentFilters, setAgentFilters] = useState({
    name: '',
    code: '',
    status: 'ALL',
    integrationType: 'ALL'
  });
  const [appliedAgentFilters, setAppliedAgentFilters] = useState(agentFilters);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentListSettingOpen, setAgentListSettingOpen] = useState(false);
  const [agentDisableConfirmOpen, setAgentDisableConfirmOpen] = useState(false);
  const [showAgentStatus, setShowAgentStatus] = useState(true);
  const [showAgentIntegrationType, setShowAgentIntegrationType] = useState(true);
  const [activeMasterSection, setActiveMasterSection] = useState('customers');
  const masterSubItems: ModuleSubNavItem[] = [
    { key: 'customers', label: '客户资料', description: '客户编码、简称、全称' },
    { key: 'agents', label: '代理资料', description: '代理编码、简称、名称' },
    { key: 'assistant', label: '资料辅助', description: '体检与快捷维护' }
  ];
  const customerRows = masterData.customers.map((customer) => ({
    ...customer,
    shortName: customer.shortName ?? customer.name,
    fullName: customer.fullName ?? `${customer.name} Co., Ltd.`,
    customerType: customer.customerType ?? '直客',
    salesperson: customer.salesperson || '未分配'
  }));
  const filteredCustomerRows = customerRows.filter((customer) => {
    const nameKeyword = appliedCustomerFilters.name.trim().toLowerCase();
    const codeKeyword = appliedCustomerFilters.code.trim().toLowerCase();
    const salespersonKeyword = appliedCustomerFilters.salesperson.trim().toLowerCase();
    const matchesName = !nameKeyword || `${customer.shortName} ${customer.fullName}`.toLowerCase().includes(nameKeyword);
    const matchesCode = !codeKeyword || customer.code.toLowerCase().includes(codeKeyword);
    const matchesSalesperson = !salespersonKeyword || customer.salesperson.toLowerCase().includes(salespersonKeyword);
    const matchesStatus =
      appliedCustomerFilters.status === 'ALL' ||
      (appliedCustomerFilters.status === 'ENABLED' ? customer.enabled : !customer.enabled);
    const matchesType = appliedCustomerFilters.customerType === 'ALL' || customer.customerType === appliedCustomerFilters.customerType;
    return matchesName && matchesCode && matchesSalesperson && matchesStatus && matchesType;
  });
  const selectedCustomer = customerRows.find((customer) => customer.id === selectedCustomerId) ?? null;
  const customerColumns: ColumnsType<(typeof customerRows)[number]> = [
    { title: '客户编码', dataIndex: 'code', width: 120, render: (value: string) => <Text strong>{value}</Text> },
    { title: '客户简称', dataIndex: 'shortName', width: 170, render: (value: string) => <Text strong>{value}</Text> },
    { title: '客户全称', dataIndex: 'fullName' },
    ...(showCustomerType
      ? [
          {
            title: '客户类型',
            dataIndex: 'customerType',
            width: 110,
            render: (value: string) => <Tag>{value}</Tag>
          }
        ]
      : []),
    { title: '业务员', dataIndex: 'salesperson', width: 120 },
    ...(showCustomerStatus
      ? [
          {
            title: '状态',
            dataIndex: 'enabled',
            width: 90,
            render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
          }
        ]
      : [])
  ];
  const agentRows = masterData.agents.map((agent) => ({
    ...agent,
    code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
    shortName: agent.shortName ?? agent.name,
    integrationType: agent.integrationType ?? 'MANUAL'
  }));
  const filteredAgentRows = agentRows.filter((agent) => {
    const nameKeyword = appliedAgentFilters.name.trim().toLowerCase();
    const codeKeyword = appliedAgentFilters.code.trim().toLowerCase();
    const matchesName = !nameKeyword || `${agent.shortName} ${agent.name}`.toLowerCase().includes(nameKeyword);
    const matchesCode = !codeKeyword || agent.code.toLowerCase().includes(codeKeyword);
    const matchesStatus =
      appliedAgentFilters.status === 'ALL' ||
      (appliedAgentFilters.status === 'ENABLED' ? agent.enabled : !agent.enabled);
    const matchesType = appliedAgentFilters.integrationType === 'ALL' || agent.integrationType === appliedAgentFilters.integrationType;
    return matchesName && matchesCode && matchesStatus && matchesType;
  });
  const selectedAgent = agentRows.find((agent) => agent.id === selectedAgentId) ?? null;
  const agentColumns: ColumnsType<(typeof agentRows)[number]> = [
    { title: '代理编码', dataIndex: 'code', width: 140, render: (value: string) => <Text strong>{value}</Text> },
    { title: '代理简称', dataIndex: 'shortName', width: 180, render: (value: string) => <Text strong>{value}</Text> },
    { title: '代理名称', dataIndex: 'name' },
    ...(showAgentStatus
      ? [
          {
            title: '状态',
            dataIndex: 'enabled',
            width: 90,
            render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
          }
        ]
      : []),
    ...(showAgentIntegrationType
      ? [
          {
            title: '对接类型',
            dataIndex: 'integrationType',
            width: 130,
            render: (value: AgentIntegrationType) => <Tag>{agentIntegrationLabels[value]}</Tag>
          }
        ]
      : [])
  ];
  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>基础资料中心</Title>
          <Text type="secondary">按手册维护客户资料和代理资料，支持查询、增删改和列表设置。</Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<Sparkles size={16} />}
            loading={aiLoading}
            onClick={() =>
              onAiAssist({
                module: '基础资料',
                task: '资料体检',
                prompt: '请检查客户资料和代理资料的完整性，输出缺失项和处理顺序。',
                context: { masterData }
              })
            }
          >
            AI 资料体检
          </Button>
        </Space>
      </Flex>

      {notice ? <Alert className="notice-bar" type="success" showIcon message={notice} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard icon={<Users />} title="客户资料" value={summary.enabledCustomers} extra="客户编码、简称、全称、类型、业务员" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Route />} title="代理资料" value={summary.enabledAgents} extra={`${summary.enabledChannels} 条渠道 / ${summary.enabledCarriers} 个承运商`} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<FileText />} title="费用/汇率" value={summary.enabledSurcharges} extra={`${summary.activeExchangeRates} 条启用汇率`} />
        </Col>
      </Row>

      <ModuleSubWorkspace items={masterSubItems} activeKey={activeMasterSection} onChange={setActiveMasterSection}>
      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24}>
          {activeMasterSection === 'customers' ? (
          <Card className="module-grid" title="客户资料">
            <Space direction="vertical" size={12} className="ai-list">
              <div className="agent-filter-panel">
                <label>
                  <span>客户名称</span>
                  <Input
                    aria-label="客户名称筛选"
                    value={customerFilters.name}
                    onChange={(event) => setCustomerFilters((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  <span>客户编码</span>
                  <Input
                    aria-label="客户编码筛选"
                    value={customerFilters.code}
                    onChange={(event) => setCustomerFilters((current) => ({ ...current, code: event.target.value }))}
                  />
                </label>
                <label>
                  <span>状态</span>
                  <select
                    aria-label="客户状态筛选"
                    className="native-select"
                    value={customerFilters.status}
                    onChange={(event) => setCustomerFilters((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="ALL">--全部--</option>
                    <option value="ENABLED">启用</option>
                    <option value="DISABLED">停用</option>
                  </select>
                </label>
                <label>
                  <span>客户类型</span>
                  <select
                    aria-label="客户类型筛选"
                    className="native-select"
                    value={customerFilters.customerType}
                    onChange={(event) => setCustomerFilters((current) => ({ ...current, customerType: event.target.value }))}
                  >
                    <option value="ALL">--全部--</option>
                    {[...new Set(customerRows.map((customer) => customer.customerType))].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>业务员</span>
                  <Input
                    aria-label="业务员筛选"
                    value={customerFilters.salesperson}
                    onChange={(event) => setCustomerFilters((current) => ({ ...current, salesperson: event.target.value }))}
                  />
                </label>
                <Space>
                  <Button type="primary" onClick={() => setAppliedCustomerFilters(customerFilters)}>
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      const emptyFilters = { name: '', code: '', status: 'ALL', customerType: 'ALL', salesperson: '' };
                      setCustomerFilters(emptyFilters);
                      setAppliedCustomerFilters(emptyFilters);
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </div>
              <Space wrap className="surface-strip">
                <Button size="small" aria-label="增加客户" onClick={() => void onCreateCustomer()}>
                  增加
                </Button>
                <Button size="small" aria-label="修改客户" disabled={!selectedCustomer} onClick={() => selectedCustomer && void onEditCustomer(selectedCustomer)}>
                  修改
                </Button>
                <Popconfirm
                  title="确认停用该客户？"
                  description="停用后该客户将不再作为可用客户资料展示，不会物理删除历史数据。"
                  okText="确认停用"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedCustomer}
                  destroyOnHidden
                  open={customerDisableConfirmOpen}
                  onOpenChange={(open) => setCustomerDisableConfirmOpen(Boolean(selectedCustomer && open))}
                  onConfirm={async () => {
                    if (selectedCustomer) {
                      await onDisableCustomer(selectedCustomer);
                    }
                    setCustomerDisableConfirmOpen(false);
                  }}
                  onCancel={() => setCustomerDisableConfirmOpen(false)}
                >
                  <Button size="small" aria-label="删除客户" disabled={!selectedCustomer}>
                    删除
                  </Button>
                </Popconfirm>
                <Button size="small" aria-label="客户列表设置" onClick={() => setCustomerListSettingOpen(true)}>
                  列表设置
                </Button>
              </Space>
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={filteredCustomerRows}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedCustomerId ? [selectedCustomerId] : [],
                  onChange: (keys) => setSelectedCustomerId(String(keys[0] ?? ''))
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedCustomerId(record.id)
                })}
                columns={customerColumns}
              />
            </Space>
            <Modal
              title="客户列表设置"
              open={customerListSettingOpen}
              destroyOnHidden
              okText="确定"
              cancelText="取消"
              onOk={() => setCustomerListSettingOpen(false)}
              onCancel={() => setCustomerListSettingOpen(false)}
            >
              <Space direction="vertical">
                <Checkbox checked={showCustomerType} onChange={(event) => setShowCustomerType(event.target.checked)}>
                  显示客户类型
                </Checkbox>
                <Checkbox checked={showCustomerStatus} onChange={(event) => setShowCustomerStatus(event.target.checked)}>
                  显示状态
                </Checkbox>
              </Space>
            </Modal>
          </Card>
          ) : null}

          {activeMasterSection === 'agents' ? (
          <Card className="module-grid" title="代理资料">
            <Space direction="vertical" size={12} className="ai-list">
              <div className="agent-filter-panel">
                <label>
                  <span>代理名称</span>
                  <Input
                    aria-label="代理名称筛选"
                    value={agentFilters.name}
                    onChange={(event) => setAgentFilters((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  <span>代理编码</span>
                  <Input
                    aria-label="代理编码筛选"
                    value={agentFilters.code}
                    onChange={(event) => setAgentFilters((current) => ({ ...current, code: event.target.value }))}
                  />
                </label>
                <label>
                  <span>状态</span>
                  <select
                    aria-label="代理状态筛选"
                    className="native-select"
                    value={agentFilters.status}
                    onChange={(event) => setAgentFilters((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="ALL">--全部--</option>
                    <option value="ENABLED">启用</option>
                    <option value="DISABLED">停用</option>
                  </select>
                </label>
                <label>
                  <span>代理对接类型</span>
                  <select
                    aria-label="代理对接类型筛选"
                    className="native-select"
                    value={agentFilters.integrationType}
                    onChange={(event) => setAgentFilters((current) => ({ ...current, integrationType: event.target.value }))}
                  >
                    <option value="ALL">--全部--</option>
                    <option value="MANUAL">手工</option>
                    <option value="API">API 对接</option>
                    <option value="PLATFORM">平台对接</option>
                    <option value="OTHER">其他</option>
                  </select>
                </label>
                <Space>
                  <Button type="primary" onClick={() => setAppliedAgentFilters(agentFilters)}>
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      const emptyFilters = { name: '', code: '', status: 'ALL', integrationType: 'ALL' };
                      setAgentFilters(emptyFilters);
                      setAppliedAgentFilters(emptyFilters);
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </div>
              <Space wrap className="surface-strip">
                <Button size="small" aria-label="增加代理" onClick={() => void onCreateAgent()}>
                  增加
                </Button>
                <Button size="small" aria-label="修改代理" disabled={!selectedAgent} onClick={() => selectedAgent && void onEditAgent(selectedAgent)}>
                  修改
                </Button>
                <Popconfirm
                  title="确认停用该代理？"
                  description="停用后该代理将不再作为可用代理资料展示，不会物理删除历史数据。"
                  okText="确认停用"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedAgent}
                  destroyOnHidden
                  open={agentDisableConfirmOpen}
                  onOpenChange={(open) => setAgentDisableConfirmOpen(Boolean(selectedAgent && open))}
                  onConfirm={async () => {
                    if (selectedAgent) {
                      await onDisableAgent(selectedAgent);
                    }
                    setAgentDisableConfirmOpen(false);
                  }}
                  onCancel={() => setAgentDisableConfirmOpen(false)}
                >
                  <Button size="small" aria-label="删除代理" disabled={!selectedAgent}>
                    删除
                  </Button>
                </Popconfirm>
                <Button size="small" aria-label="代理列表设置" onClick={() => setAgentListSettingOpen(true)}>
                  列表设置
                </Button>
              </Space>
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={filteredAgentRows}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedAgentId ? [selectedAgentId] : [],
                  onChange: (keys) => setSelectedAgentId(String(keys[0] ?? ''))
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedAgentId(record.id)
                })}
                columns={agentColumns}
              />
            </Space>
            <Modal
              title="代理列表设置"
              open={agentListSettingOpen}
              destroyOnHidden
              okText="确定"
              cancelText="取消"
              onOk={() => setAgentListSettingOpen(false)}
              onCancel={() => setAgentListSettingOpen(false)}
            >
              <Space direction="vertical">
                <Checkbox checked={showAgentStatus} onChange={(event) => setShowAgentStatus(event.target.checked)}>
                  显示状态
                </Checkbox>
                <Checkbox checked={showAgentIntegrationType} onChange={(event) => setShowAgentIntegrationType(event.target.checked)}>
                  显示代理对接类型
                </Checkbox>
              </Space>
            </Modal>
          </Card>
          ) : null}

        </Col>

        {activeMasterSection === 'assistant' ? (
        <Col xs={24}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <Bot size={18} />
                <span>AI 资料助手</span>
              </Flex>
            }
          >
            <Space direction="vertical" size={12} className="quality-panel">
              <Tag color="blue">硅基流动</Tag>
              <Alert type="info" showIcon message="客户联系人缺手机号时提醒客服补齐" />
              <Alert type="warning" showIcon message="代理 API 对接预留不需要填写真实 key" />
              <Alert type="warning" showIcon message="汇率超过 24 小时未更新时提示复核" />
              <Alert type="info" showIcon message="模板权限变更写入 audit_logs" />
            </Space>
          </Card>

          <Card className="automation-card" title="快捷维护">
            <Space wrap>
              <Tag>客户 {masterData.customers.length}</Tag>
              <Tag>渠道 {masterData.channels.length}</Tag>
              <Tag>费用 {masterData.surcharges.length}</Tag>
              <Tag>燃油 {masterData.fuelRates.length}</Tag>
              <Tag>汇率 {masterData.exchangeRates.length}</Tag>
            </Space>
          </Card>
        </Col>
        ) : null}
      </Row>
      </ModuleSubWorkspace>
    </>
  );
}

function PricingPage({
  apiClient,
  role,
  notice,
  onNotice
}: {
  apiClient: ApiClient;
  role: StaffRoleKey;
  notice: string | null;
  onNotice: (message: string | null) => void;
}) {
  const [lookupForm] = Form.useForm<PriceLookupFormValues>();
  const [markupForm] = Form.useForm<AgentMarkupFormValues>();
  const [priceBookRemarkForm] = Form.useForm<PriceBookRemarkFormValues>();
  const [priceRows, setPriceRows] = useState<ImportedPriceRow[]>(() => [...seedImportedPriceRows]);
  const [priceBooks, setPriceBooks] = useState<PriceBookRecord[]>([]);
  const [markupRules, setMarkupRules] = useState<AgentMarkupRule[]>([]);
  const [selectedMarkupRuleId, setSelectedMarkupRuleId] = useState<string | null>(null);
  const [selectedPriceBookId, setSelectedPriceBookId] = useState<string | null>(null);
  const [editingMarkupRule, setEditingMarkupRule] = useState<AgentMarkupRule | null>(null);
  const [markupModalOpen, setMarkupModalOpen] = useState(false);
  const [markupChannelDetailOpen, setMarkupChannelDetailOpen] = useState(false);
  const [markupSheetFilter, setMarkupSheetFilter] = useState('ALL');
  const [batchMarkupPerKg, setBatchMarkupPerKg] = useState(0.5);
  const [priceBookRemarkModalOpen, setPriceBookRemarkModalOpen] = useState(false);
  const [lookupResult, setLookupResult] = useState<PriceLookupResult | null>(null);
  const [selectedPriceRecommendation, setSelectedPriceRecommendation] = useState<PriceRecommendation | null>(null);
  const selectedMarkupRule = markupRules.find((rule) => rule.id === selectedMarkupRuleId) ?? null;
  const selectedPriceBook = priceBooks.find((book) => book.id === selectedPriceBookId) ?? null;
  const selectedMarkupChannelRows = selectedMarkupRule
    ? priceRows.filter((row) =>
        row.agentName === selectedMarkupRule.agentName &&
        (!selectedMarkupRule.channelName || row.channelName === selectedMarkupRule.channelName)
      )
    : [];
  const getMarkupRowSmallTableName = (row: ImportedPriceRow) => row.sourceSheetName?.trim() || row.channelName?.trim() || '未标记小表';
  const selectedMarkupSheetOptions = Array.from(
    new Set(selectedMarkupChannelRows.map(getMarkupRowSmallTableName))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const filteredMarkupChannelRows = selectedMarkupChannelRows.filter((row) => {
    return markupSheetFilter === 'ALL' || getMarkupRowSmallTableName(row) === markupSheetFilter;
  });
  const canViewMarkupDetails = role === 'ADMIN';
  const pricingSubItems = [
    { key: 'lookup', label: '查价', description: '业务员报价查询' },
    ...(canViewMarkupDetails
      ? [
          { key: 'markup', label: '代理加价规则', description: '维护业务员加价' },
          { key: 'priceBooks', label: '价格表管理', description: '导入与备注维护' }
        ]
      : [])
  ];
  const [activePricingSection, setActivePricingSection] = useState('lookup');
  const volumeCbm = Form.useWatch('volumeCbm', lookupForm);
  const actualWeightKg = Form.useWatch('actualWeightKg', lookupForm);
  const lengthCm = Form.useWatch('lengthCm', lookupForm);
  const widthCm = Form.useWatch('widthCm', lookupForm);
  const heightCm = Form.useWatch('heightCm', lookupForm);
  const packageCount = Form.useWatch('packageCount', lookupForm);
  const unitActualWeightKg = Form.useWatch('unitActualWeightKg', lookupForm);
  const calculatedChargeableWeight = calculatePriceChargeableWeight({
    volumeCbm,
    actualWeightKg,
    lengthCm,
    widthCm,
    heightCm,
    packageCount,
    unitActualWeightKg
  });
  useEffect(() => {
    if (calculatedChargeableWeight > 0) {
      lookupForm.setFieldValue('chargeableWeightKg', calculatedChargeableWeight);
    }
  }, [calculatedChargeableWeight, lookupForm]);

  useEffect(() => {
    let alive = true;
    if (!canViewMarkupDetails) {
      setPriceBooks([]);
      setPriceRows([]);
      return () => {
        alive = false;
      };
    }
    Promise.all([apiClient.priceBooks(), apiClient.agentMarkupRules()])
      .then(([response, rules]) => {
        if (!alive) {
          return;
        }
        setPriceBooks(response.books);
        setPriceRows([...response.rows, ...seedImportedPriceRows]);
        setMarkupRules(rules);
      })
      .catch((error) => {
        if (alive) {
          onNotice(error instanceof Error ? `价格与加价规则加载失败：${error.message}` : '价格与加价规则加载失败');
        }
      });
    return () => {
      alive = false;
    };
  }, [apiClient, canViewMarkupDetails, onNotice]);

  function openCreateMarkupRule() {
    setEditingMarkupRule(null);
    markupForm.setFieldsValue({ agentName: '', channelName: '', realChannelName: '', destinationCountry: '', markupPerKg: 0.5, enabled: 'true' });
    setMarkupModalOpen(true);
  }

  function openEditMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    openEditSpecificMarkupRule(selectedMarkupRule);
  }

  function openMarkupChannelDetail() {
    if (!selectedMarkupRule) {
      return;
    }
    setMarkupSheetFilter('ALL');
    setBatchMarkupPerKg(selectedMarkupRule.markupPerKg);
    setMarkupChannelDetailOpen(true);
  }

  function openEditSpecificMarkupRule(rule: AgentMarkupRule) {
    setEditingMarkupRule(rule);
    markupForm.setFieldsValue({
      agentName: rule.agentName,
      channelName: rule.channelName,
      realChannelName: rule.realChannelName,
      destinationCountry: rule.destinationCountry,
      markupPerKg: rule.markupPerKg,
      enabled: rule.enabled ? 'true' : 'false'
    });
    setMarkupModalOpen(true);
  }

  function findLineMarkupRule(row: ImportedPriceRow) {
    const realChannelName = row.realChannelName ?? row.channelName;
    return markupRules.find(
      (rule) =>
        rule.enabled &&
        rule.agentName === row.agentName &&
        rule.channelName === row.channelName &&
        rule.realChannelName === realChannelName &&
        rule.destinationCountry === row.destinationCountry
    );
  }

  function openCreateLineMarkupRule(row: ImportedPriceRow) {
    setMarkupChannelDetailOpen(false);
    setEditingMarkupRule(null);
    markupForm.setFieldsValue({
      agentName: row.agentName,
      channelName: row.channelName,
      realChannelName: row.realChannelName ?? row.channelName,
      destinationCountry: row.destinationCountry,
      markupPerKg: selectedMarkupRule?.markupPerKg ?? 0.5,
      enabled: 'true'
    });
    setMarkupModalOpen(true);
  }

  function openEditLineMarkupRule(rule: AgentMarkupRule) {
    setMarkupChannelDetailOpen(false);
    openEditSpecificMarkupRule(rule);
  }

  async function handleSubmitMarkupRule() {
    const values = await markupForm.validateFields();
    const payload = {
      agentName: values.agentName.trim(),
      channelName: values.channelName?.trim() || undefined,
      realChannelName: values.realChannelName?.trim() || undefined,
      destinationCountry: values.destinationCountry?.trim() || undefined,
      markupPerKg: values.markupPerKg,
      enabled: values.enabled === 'true'
    };
    const rule: AgentMarkupRule = editingMarkupRule
      ? await apiClient.updateAgentMarkupRule(editingMarkupRule.id, payload)
      : await apiClient.createAgentMarkupRule(payload);
    setMarkupRules((current) => [rule, ...current.filter((item) => item.id !== rule.id)]);
    setSelectedMarkupRuleId(rule.id);
    setMarkupModalOpen(false);
    markupForm.resetFields();
    onNotice(`${rule.agentName} 加价规则已${editingMarkupRule ? '更新' : '新增'}：+${formatCurrency(rule.markupPerKg)}/kg`);
  }

  async function handleBatchApplySheetMarkup() {
    if (!selectedMarkupRule || filteredMarkupChannelRows.length === 0) {
      onNotice('当前筛选没有可加价的线路');
      return;
    }
    if (!Number.isFinite(batchMarkupPerKg) || batchMarkupPerKg < 0) {
      onNotice('请输入有效的业务员加价');
      return;
    }

    try {
      const updatedRules = await Promise.all(
        filteredMarkupChannelRows.map((row) => {
          const existing = findLineMarkupRule(row);
          const payload = {
            agentName: row.agentName,
            channelName: row.channelName,
            realChannelName: row.realChannelName ?? row.channelName,
            destinationCountry: row.destinationCountry,
            markupPerKg: batchMarkupPerKg,
            enabled: true
          };
          return existing
            ? apiClient.updateAgentMarkupRule(existing.id, payload)
            : apiClient.createAgentMarkupRule(payload);
        })
      );
      setMarkupRules((current) => {
        const updatedById = new Map(updatedRules.map((rule) => [rule.id, rule]));
        const existingIds = new Set(current.map((rule) => rule.id));
        const merged = current.map((rule) => updatedById.get(rule.id) ?? rule);
        const created = updatedRules.filter((rule) => !existingIds.has(rule.id));
        return [...created, ...merged];
      });
      const filterLabel = markupSheetFilter === 'ALL' ? '全部小表' : markupSheetFilter;
      onNotice(`已为 ${updatedRules.length} 条 ${filterLabel} 线路统一设置 +${formatCurrency(batchMarkupPerKg)}/kg`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '批量加价失败');
    }
  }

  function disableSelectedMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    void apiClient.deleteAgentMarkupRule(selectedMarkupRule.id).then((updated) => {
      setMarkupRules((current) => current.map((rule) => (rule.id === updated.id ? updated : rule)));
      onNotice(`${selectedMarkupRule.agentName} 加价规则已停用`);
    }).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则停用失败');
    });
  }

  function openEditPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    priceBookRemarkForm.setFieldsValue({ remark: selectedPriceBook.remark ?? '' });
    setPriceBookRemarkModalOpen(true);
  }

  async function handleSubmitPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    const values = await priceBookRemarkForm.validateFields();
    const remark = values.remark?.trim() || undefined;
    try {
      const updated = await apiClient.updatePriceBookRemark(selectedPriceBook.id, { remark });
      setPriceBooks((current) => current.map((book) => (book.id === updated.id ? updated : book)));
      setPriceBookRemarkModalOpen(false);
      priceBookRemarkForm.resetFields();
      onNotice(`${updated.fileName} 备注已更新`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表备注更新失败');
    }
  }

  async function handlePriceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const parsedRows = parsePriceWorkbook(await readFileAsArrayBuffer(file));
      const rows: PriceBookImportInput['rows'] = parsedRows.map(({ id: _id, priceBookId: _priceBookId, remark: _remark, ...row }) => row);
      const imported = await apiClient.importPriceBook({ fileName: file.name, rows });
      setPriceBooks((current) => [imported.book, ...current.filter((book) => book.id !== imported.book.id)]);
      setSelectedPriceBookId(imported.book.id);
      setPriceRows((current) => [...imported.rows, ...current.filter((row) => row.priceBookId !== imported.book.id)]);
      onNotice(`已导入价格表 ${file.name}，新增 ${imported.rows.length} 条代理成本价`);
      event.target.value = '';
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表导入失败');
    }
  }

  async function deleteSelectedPriceBook() {
    const selectedBook = priceBooks.find((book) => book.id === selectedPriceBookId);
    if (!selectedBook) {
      return;
    }

    try {
      await apiClient.deletePriceBook(selectedBook.id);
      setPriceBooks((current) => current.filter((book) => book.id !== selectedBook.id));
      setPriceRows((current) => current.filter((row) => row.priceBookId !== selectedBook.id));
      setSelectedPriceBookId(null);
      onNotice(`已删除价格表 ${selectedBook.fileName}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表删除失败');
    }
  }

  async function runLookup() {
    try {
      const values = await lookupForm.validateFields();
      const result = await apiClient.lookupPrice({
        ...values
      });
      setLookupResult(result);
      setSelectedPriceRecommendation(null);
      onNotice(
        canViewMarkupDetails
          ? `${result.price.agentName} ${result.price.destinationCountry} ${result.chargeableWeightKg}kg 报价 ${formatCurrency(result.totalSales)}`
          : `${result.channelName} ${result.price.destinationCountry} ${result.chargeableWeightKg}kg 报价 ${formatCurrency(result.totalSales)}`
      );
    } catch (error) {
      if (error instanceof Error) {
        onNotice(error.message);
      }
    }
  }

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>报价查价中心</Title>
          <Text type="secondary">{canViewMarkupDetails ? '导入代理价格表，按代理维护加价规则，快速得到业务员报价。' : '输入目的地、重量和货物信息，快速得到可对外使用的报价。'}</Text>
        </div>
        <Space>
          <Button type="primary" icon={<CircleDollarSign size={16} />} onClick={() => void runLookup()}>
            查询报价
          </Button>
        </Space>
      </Flex>

      {notice ? <Alert className="notice-bar" type="success" showIcon message={notice} /> : null}

      <Row gutter={[16, 16]}>
        {canViewMarkupDetails ? (
          <Col xs={24} md={8}>
            <MetricCard icon={<FileInput />} title="代理成本价" value={String(priceRows.length)} extra="XLS 导入和手工维护" />
          </Col>
        ) : null}
        {canViewMarkupDetails ? (
          <Col xs={24} md={8}>
            <MetricCard icon={<Banknote />} title="加价规则" value={String(markupRules.filter((rule) => rule.enabled).length)} extra="按代理维护 +0.5 / +1" />
          </Col>
        ) : null}
        <Col xs={24} md={canViewMarkupDetails ? 8 : 12}>
          <MetricCard
            icon={<PackageCheck />}
            title="最近查价"
            value={lookupResult ? formatCurrency(lookupResult.totalSales) : '待查询'}
            extra={lookupResult ? (canViewMarkupDetails ? lookupResult.price.agentName : `${lookupResult.price.destinationCountry} / ${lookupResult.channelName}`) : '输入国家/重量查询'}
          />
        </Col>
      </Row>

      <ModuleSubWorkspace items={pricingSubItems} activeKey={activePricingSection} onChange={setActivePricingSection}>
        {(activePricingSection === 'lookup' || activePricingSection === 'markup') ? (
          <Row gutter={[16, 16]} className="main-grid">
        {activePricingSection === 'lookup' ? (
        <Col xs={24}>
          <Card className="module-grid pricing-lookup-card" title="查价">
            <Form
              form={lookupForm}
              name="priceLookupForm"
              layout="vertical"
              className="pricing-lookup-form"
              initialValues={{
                amazonCode: 'AMZ-US-001',
                productName: '桌子，椅子',
                destinationCountry: '美国',
                postalCode: '60750',
                address: 'France 549 rue du maubon Choisy au bac',
                packageInfo: '',
                volumeCbm: 5,
                packageCount: 1,
                chargeableWeightKg: 835
              }}
            >
              <div className="pricing-form-section">
                <Text className="pricing-section-title">基础信息</Text>
                <Row gutter={[12, 8]}>
                  <Col xs={24}>
                    <Form.Item name="productName" label="品名">
                      <Input placeholder="如 桌子，椅子" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="amazonCode" label="亚马逊代码">
                      <Input placeholder="如 AMZ-US-001" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="destinationCountry" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="postalCode" label="邮编">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item name="address" label="地址">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="packageInfo" label="数据/包装（可选）">
                      <Input.TextArea rows={3} placeholder="如 1个木箱、2托、纸箱货" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div className="pricing-form-section pricing-form-section-muted">
                <Flex justify="space-between" align="center" gap={12} wrap="wrap">
                  <Text className="pricing-section-title">计费信息</Text>
                  <Text type="secondary" className="pricing-section-hint">没有尺寸时直接填方数，系统按 CBM x 167 自动算计费重。</Text>
                </Flex>
                <Row gutter={[12, 8]}>
                  <Col xs={24} md={8}>
                    <Form.Item name="actualWeightKg" label="实际重量 KG">
                      <InputNumber min={0} precision={3} placeholder="没有可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="volumeCbm" label="方数 CBM">
                      <InputNumber min={0} precision={3} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="chargeableWeightKg" label="计费重 kg" rules={[{ required: true, message: '请输入计费重' }]}>
                      <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <div className="chargeable-weight-panel">
                      <Text strong>自动计费重</Text>
                      <Title level={3}>{calculatedChargeableWeight > 0 ? calculatedChargeableWeight : 0} KG</Title>
                    </div>
                  </Col>
                  <Col xs={24}>
                    <Text type="secondary" className="pricing-section-hint">有详细尺寸再填</Text>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="lengthCm" label="长 cm">
                      <InputNumber min={0} precision={2} placeholder="可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="widthCm" label="宽 cm">
                      <InputNumber min={0} precision={2} placeholder="可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="heightCm" label="高 cm">
                      <InputNumber min={0} precision={2} placeholder="可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="packageCount" label="件数">
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="unitActualWeightKg" label="单件实重 KG">
                      <InputNumber min={0} precision={3} placeholder="不知道可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <Flex justify="flex-end" className="pricing-form-actions">
                <Button aria-label="查价查询" type="primary" icon={<CircleDollarSign size={16} />} onClick={() => void runLookup()}>
                  查询报价
                </Button>
              </Flex>
            </Form>
            {lookupResult ? (
              <div className="pricing-result">
                <div className="pricing-result-summary">
                  <div className="pricing-result-hero">
                    <Text type="secondary">报价</Text>
                    <Title level={3}>报价 {formatCurrency(lookupResult.totalSales)}</Title>
                    <Text type="secondary">
                      {lookupResult.channelName} / {lookupResult.weightSegmentLabel}
                    </Text>
                  </div>
                  <div className="pricing-result-metrics">
                    <div>
                      <Text type="secondary">推荐渠道</Text>
                      <Text strong>{lookupResult.channelName}</Text>
                    </div>
                    <div>
                      <Text type="secondary">计费重</Text>
                      <Text strong>{lookupResult.chargeableWeightKg.toFixed(3)} kg</Text>
                    </div>
                    <div>
                      <Text type="secondary">得出总价</Text>
                      <Text strong>得出总价：{formatCurrency(lookupResult.totalPrice)}</Text>
                    </div>
                  </div>
                </div>

                <div className="pricing-result-grid">
                  <div className="pricing-result-item">
                    <Text type="secondary">亚马逊代码</Text>
                    <Text strong>亚马逊代码：{lookupResult.amazonCode || '未填写'}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">品名</Text>
                    <Text strong>品名：{lookupResult.productName || '未填写'}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">邮编</Text>
                    <Text strong>邮编：{lookupResult.postalCode || '未填写'}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">重量段</Text>
                    <Text strong>重量段：{lookupResult.weightSegmentLabel}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">单价</Text>
                    <Text strong>单价：{formatKgCurrencyRate(lookupResult.salesRatePerKg)}/kg</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">目的地 / 渠道</Text>
                    <Text strong>目的地：{lookupResult.price.destinationCountry} / 渠道：{lookupResult.channelName}</Text>
                  </div>
                  {lookupResult.price.warehouseCode ? (
                    <div className="pricing-result-item">
                      <Text type="secondary">仓库编码</Text>
                      <Text strong>{lookupResult.price.warehouseCode}</Text>
                    </div>
                  ) : null}
                </div>

                {canViewMarkupDetails ? (
                  <div className="pricing-result-grid pricing-admin-only">
                    <div className="pricing-result-item">
                      <Text type="secondary">代理成本</Text>
                      <Text strong>{lookupResult.price.costPerKg === undefined ? '后端未返回' : `${lookupResult.price.currency} ${formatKgRate(lookupResult.price.costPerKg)}/kg`}</Text>
                    </div>
                    <div className="pricing-result-item">
                      <Text type="secondary">代理加价</Text>
                      <Text strong>{lookupResult.markup ? `代理加价：+${formatCurrency(lookupResult.markup.markupPerKg)}/kg` : '后端未返回'}</Text>
                    </div>
                    <div className="pricing-result-item">
                      <Text type="secondary">成本合计</Text>
                      <Text strong>{lookupResult.totalCost === undefined ? '后端未返回' : `成本合计：${formatCurrency(lookupResult.totalCost)}`}</Text>
                    </div>
                    <div className="pricing-result-item">
                      <Text type="secondary">毛利</Text>
                      <Text strong>{lookupResult.grossProfit === undefined ? '后端未返回' : `毛利 ${formatCurrency(lookupResult.grossProfit)}`}</Text>
                    </div>
                  </div>
                ) : null}

                <Row gutter={[12, 12]} className="pricing-recommendations">
                  <Col xs={24} md={12}>
                    <Card size="small" title="最便宜 Top3" className="pricing-recommendation-card">
                      <Space direction="vertical" size={8} className="full-width">
                        {lookupResult.cheapestRecommendations.map((item, index) => (
                          <button
                            type="button"
                            className="pricing-recommendation"
                            key={`cheap-${item.price.id}`}
                            onClick={() => setSelectedPriceRecommendation(item)}
                          >
                            <Flex justify="space-between" align="center">
                              <Text strong>{index + 1}. {item.channelName}</Text>
                              <Tag color={index === 0 ? 'green' : 'blue'}>{formatCurrency(item.totalSales)}</Tag>
                            </Flex>
                            {item.remark ? <Tag color="cyan" className="pricing-note-tag">有备注</Tag> : null}
                            {index === 0 ? <Text type="secondary">推荐渠道：{item.channelName}</Text> : null}
                            <Text type="secondary">渠道报价表：{item.realChannelName}</Text>
                            <Text type="secondary">
                              {canViewMarkupDetails ? `${item.price.agentName} / ` : ''}
                              {item.transitLabel} / {item.weightSegmentLabel}
                            </Text>
                            {canViewMarkupDetails && item.price.costPerKg !== undefined ? <Text type="secondary">代理成本单价 {formatKgCurrencyRate(item.price.costPerKg)}/kg</Text> : null}
                            <Text type="secondary">
                              单价 {formatKgCurrencyRate(item.salesRatePerKg)}/kg
                              {canViewMarkupDetails && item.grossProfit !== undefined ? `，毛利 ${formatCurrency(item.grossProfit)}` : ''}
                            </Text>
                          </button>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" title="最快 Top3" className="pricing-recommendation-card">
                      <Space direction="vertical" size={8} className="full-width">
                        {lookupResult.fastestRecommendations.map((item, index) => (
                          <button
                            type="button"
                            className="pricing-recommendation"
                            key={`fast-${item.price.id}`}
                            onClick={() => setSelectedPriceRecommendation(item)}
                          >
                            <Flex justify="space-between" align="center">
                              <Text strong>{index + 1}. {item.channelName}</Text>
                              <Tag color={index === 0 ? 'purple' : 'geekblue'}>{item.transitLabel}</Tag>
                            </Flex>
                            {item.remark ? <Tag color="cyan" className="pricing-note-tag">有备注</Tag> : null}
                            <Text type="secondary">渠道报价表：{item.realChannelName}</Text>
                            <Text type="secondary">
                              {canViewMarkupDetails ? `${item.price.agentName} / ` : ''}
                              {formatCurrency(item.totalSales)} / {item.weightSegmentLabel}
                            </Text>
                            {canViewMarkupDetails && item.price.costPerKg !== undefined ? <Text type="secondary">代理成本单价 {formatKgCurrencyRate(item.price.costPerKg)}/kg</Text> : null}
                            <Text type="secondary">
                              单价 {formatKgCurrencyRate(item.salesRatePerKg)}/kg
                              {canViewMarkupDetails && item.grossProfit !== undefined ? `，毛利 ${formatCurrency(item.grossProfit)}` : ''}
                            </Text>
                          </button>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : (
              <Text type="secondary">输入亚马逊代码、目的地和计费重后点击查询，系统会从报价数据库匹配渠道。</Text>
            )}
          </Card>
        </Col>
        ) : null}

        <Modal
          title="报价详情"
          open={Boolean(selectedPriceRecommendation)}
          destroyOnHidden
          footer={
            <Button type="primary" onClick={() => setSelectedPriceRecommendation(null)}>
              关闭
            </Button>
          }
          onCancel={() => setSelectedPriceRecommendation(null)}
        >
          {selectedPriceRecommendation ? (
            <Space direction="vertical" size={14} className="full-width pricing-detail-modal">
              <div className="pricing-result-grid">
                <div className="pricing-result-item">
                  <Text type="secondary">渠道</Text>
                  <Text strong>{selectedPriceRecommendation.channelName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">承运商</Text>
                  <Text strong>{selectedPriceRecommendation.carrierName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">承运路线</Text>
                  <Text strong>{selectedPriceRecommendation.businessRouteName ?? '未绑定路线'}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">渠道报价表</Text>
                  <Text strong>{selectedPriceRecommendation.realChannelName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">报价来源</Text>
                  <Text strong>{getQuoteSourceLabel(selectedPriceRecommendation.quoteSourceType)}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">总报价</Text>
                  <Text strong>{formatCurrency(selectedPriceRecommendation.totalSales)}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">时效</Text>
                  <Text strong>{selectedPriceRecommendation.transitLabel}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">重量段</Text>
                  <Text strong>{selectedPriceRecommendation.weightSegmentLabel}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">单价</Text>
                  <Text strong>{formatKgCurrencyRate(selectedPriceRecommendation.salesRatePerKg)}/kg</Text>
                </div>
                {selectedPriceRecommendation.price.warehouseCode ? (
                  <div className="pricing-result-item">
                    <Text type="secondary">仓库编码</Text>
                    <Text strong>{selectedPriceRecommendation.price.warehouseCode}</Text>
                  </div>
                ) : null}
              </div>

              {canViewMarkupDetails ? (
                <div className="pricing-result-grid pricing-admin-only">
                  <div className="pricing-result-item">
                    <Text type="secondary">代理</Text>
                    <Text strong>{selectedPriceRecommendation.price.agentName}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">代理成本单价</Text>
                    <Text strong>{selectedPriceRecommendation.price.costPerKg === undefined ? '后端未返回' : `${selectedPriceRecommendation.price.currency} ${formatKgRate(selectedPriceRecommendation.price.costPerKg)}/kg`}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">成本合计</Text>
                    <Text strong>{selectedPriceRecommendation.totalCost === undefined ? '后端未返回' : formatCurrency(selectedPriceRecommendation.totalCost)}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">毛利</Text>
                    <Text strong>{selectedPriceRecommendation.grossProfit === undefined ? '后端未返回' : formatCurrency(selectedPriceRecommendation.grossProfit)}</Text>
                  </div>
                </div>
              ) : null}

              <div className="pricing-detail-note">
                <Text type="secondary">完整备注</Text>
                <Text>{selectedPriceRecommendation.remark || '暂无备注'}</Text>
              </div>
            </Space>
          ) : null}
        </Modal>

        {activePricingSection === 'markup' && canViewMarkupDetails ? (
          <Col xs={24}>
            <Card
              className="module-grid"
              title="代理加价规则"
              extra={
                <Space>
                  <Button size="small" onClick={openCreateMarkupRule}>增加</Button>
                  <Button size="small" disabled={!selectedMarkupRule} onClick={openEditMarkupRule}>修改</Button>
                  <Button size="small" disabled={!selectedMarkupRule} onClick={openMarkupChannelDetail}>查看线路</Button>
                  <Popconfirm
                    title="确认停用该加价规则？"
                    description="停用后业务员报价不会再使用该规则，请确认报价策略已经更新。"
                    okText="确认停用"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    disabled={!selectedMarkupRule}
                    onConfirm={disableSelectedMarkupRule}
                  >
                    <Button size="small" disabled={!selectedMarkupRule}>删除</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={markupRules}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedMarkupRuleId ? [selectedMarkupRuleId] : [],
                  onChange: (keys) => setSelectedMarkupRuleId(String(keys[0] ?? ''))
                }}
                onRow={(record) => ({ onClick: () => setSelectedMarkupRuleId(record.id) })}
                columns={[
                  { title: '代理', dataIndex: 'agentName' },
                  { title: '渠道', dataIndex: 'channelName', render: (value?: string) => value || <Text type="secondary">全部渠道</Text> },
                  { title: '线路自定义', dataIndex: 'realChannelName', render: (value?: string) => value || <Text type="secondary">全部线路</Text> },
                  { title: '国家', dataIndex: 'destinationCountry', render: (value?: string) => value || <Text type="secondary">全部国家</Text> },
                  { title: '业务员加价', render: (_, rule) => `+${formatCurrency(rule.markupPerKg)}/kg`, width: 160 },
                  { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
                ]}
              />
            </Card>
          </Col>
        ) : null}
          </Row>
        ) : null}

      {activePricingSection === 'priceBooks' && canViewMarkupDetails ? (
          <Card
            className="module-grid"
            title="价格表管理"
            extra={
              <Space>
                <Button size="small" icon={<FileInput size={14} />}>
                  <label className="file-button-label">
                    增加价格表
                    <input aria-label="增加价格表" type="file" accept=".xls,.xlsx" onChange={(event) => void handlePriceFileChange(event)} />
                  </label>
                </Button>
                <Button size="small" disabled={!selectedPriceBookId} onClick={openEditPriceBookRemark}>
                  修改备注
                </Button>
                <Popconfirm
                  title="确认删除该价格表？"
                  description="删除后该价格表导入的报价行会从当前报价库移除。"
                  okText="删除价格表"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedPriceBookId}
                  onConfirm={deleteSelectedPriceBook}
                >
                  <Button size="small" disabled={!selectedPriceBookId}>
                    删除价格表
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Table
              rowKey="id"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={priceBooks}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedPriceBookId ? [selectedPriceBookId] : [],
                onChange: (keys) => setSelectedPriceBookId(String(keys[0] ?? ''))
              }}
              onRow={(record) => ({ onClick: () => setSelectedPriceBookId(record.id) })}
              columns={[
                { title: '价格表名称', dataIndex: 'fileName' },
                { title: '备注', dataIndex: 'remark', width: 120, render: (remark?: string) => (remark ? <Tag color="cyan">有备注</Tag> : <Text type="secondary">未填写</Text>) },
                { title: '导入行数', dataIndex: 'rowCount', width: 120 },
                { title: '导入时间', dataIndex: 'importedAt', width: 220, render: (value: string) => new Date(value).toLocaleString('zh-CN') }
              ]}
            />
          </Card>
      ) : null}
      </ModuleSubWorkspace>

      <Modal
        title="修改价格表备注"
        open={priceBookRemarkModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSubmitPriceBookRemark()}
        onCancel={() => setPriceBookRemarkModalOpen(false)}
      >
        <Form form={priceBookRemarkForm} name="priceBookRemarkForm" layout="vertical">
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={5} placeholder="填写该价格表的尺寸要求、附加费说明、特殊限制等备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedMarkupRule ? `${selectedMarkupRule.agentName} 渠道线路详情` : '渠道线路详情'}
        open={markupChannelDetailOpen}
        destroyOnHidden
        width={920}
        footer={<Button type="primary" onClick={() => setMarkupChannelDetailOpen(false)}>关闭</Button>}
        onCancel={() => setMarkupChannelDetailOpen(false)}
      >
        <Space direction="vertical" size={12} className="full-width">
          <Alert
            className="notice-bar"
            type="info"
            showIcon
            message="代理基准加价会长期作用于该代理后续导入的价格表；某条真实渠道已有自定义规则时，可在这里直接修改。"
          />
          <div className="pricing-line-toolbar">
            <Space wrap size={12}>
              <label className="compact-field">
                <span>小表</span>
                <select
                  aria-label="按小表筛选线路"
                  className="native-select"
                  value={markupSheetFilter}
                  onChange={(event) => setMarkupSheetFilter(event.target.value)}
                >
                  <option value="ALL">全部小表</option>
                  {selectedMarkupSheetOptions.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>{sheetName}</option>
                  ))}
                </select>
              </label>
              <label className="compact-field">
                <span>批量加价</span>
                <input
                  aria-label="批量业务员加价 / kg"
                  className="native-number"
                  type="number"
                  min={0}
                  step={0.1}
                  value={batchMarkupPerKg}
                  onChange={(event) => setBatchMarkupPerKg(Number(event.target.value))}
                />
              </label>
              <Button type="primary" onClick={() => void handleBatchApplySheetMarkup()}>
                批量统一加价
              </Button>
              <Tag color="blue">当前 {filteredMarkupChannelRows.length} 条线路</Tag>
            </Space>
          </div>
          <Table
            rowKey="id"
            size="small"
            pagination={tenRowTablePagination}
            dataSource={filteredMarkupChannelRows}
            columns={[
              { title: '代理', dataIndex: 'agentName', width: 110 },
              { title: '小表', width: 180, render: (_, row) => getMarkupRowSmallTableName(row) },
              { title: '真实渠道/线路', dataIndex: 'realChannelName', width: 160, render: (value: string | undefined, row) => value || row.channelName },
              { title: '目的地', dataIndex: 'destinationCountry', width: 100 },
              { title: '重量段', render: (_, row) => `${row.minWeightKg}-${row.maxWeightKg}kg`, width: 130 },
              { title: '时效', dataIndex: 'transitLabel', width: 110, render: (value?: string) => value || '待确认' },
              {
                title: '当前加价',
                width: 120,
                render: (_, row) => {
                  const rule = findLineMarkupRule(row);
                  return rule ? `+${formatCurrency(rule.markupPerKg)}/kg` : <Text type="secondary">基准 +{formatCurrency(selectedMarkupRule?.markupPerKg ?? 0)}/kg</Text>;
                }
              },
              {
                title: '操作',
                width: 120,
                render: (_, row) => {
                  const rule = findLineMarkupRule(row);
                  return (
                    <Button size="small" onClick={() => (rule ? openEditLineMarkupRule(rule) : openCreateLineMarkupRule(row))}>
                      {rule ? '修改加价' : '自定义加价'}
                    </Button>
                  );
                }
              }
            ]}
          />
        </Space>
      </Modal>

      <Modal
        title={editingMarkupRule ? '修改代理加价' : '新增代理加价'}
        open={markupModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSubmitMarkupRule()}
        onCancel={() => setMarkupModalOpen(false)}
      >
        <Form form={markupForm} name="markupRuleForm" layout="vertical">
          <Form.Item name="agentName" label="代理" rules={[{ required: true, whitespace: true, message: '请输入代理' }]}>
            <Input placeholder="例如 a代理" />
          </Form.Item>
          <Form.Item name="channelName" label="渠道（可选）">
            <Input placeholder="例如 海运洛杉矶专线；为空表示该代理全部渠道" />
          </Form.Item>
          <Form.Item name="realChannelName" label="线路自定义（可选）">
            <Input placeholder="例如 DHK03；填写后优先于渠道统一加价" />
          </Form.Item>
          <Form.Item name="destinationCountry" label="国家（可选）">
            <Input placeholder="例如 美国；为空表示全部国家" />
          </Form.Item>
          <Form.Item name="markupPerKg" label="业务员加价 / kg" rules={[{ required: true, message: '请输入加价金额' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="enabled" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <select className="native-select" aria-label="加价规则状态">
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function FinancePage({
  receivables,
  statements,
  accounts,
  ledger,
  notice,
  onCreateStatement,
  onCreatePayment
}: {
  receivables: ReceivableFeeSummary[];
  statements: CustomerStatementSummary[];
  accounts: CustomerAccountSummary[];
  ledger: AccountLedgerSummary[];
  notice: string | null;
  onCreateStatement: () => Promise<void>;
  onCreatePayment: () => Promise<void>;
}) {
  const total = receivables.filter((fee) => !fee.settled).reduce((sum, fee) => sum + fee.amount, 0);
  const primaryAccount = accounts.find((account) => account.customerId === 'c-9409') ?? accounts[0];
  const [activeFinanceSection, setActiveFinanceSection] = useState('receivables');
  const financeSubItems: ModuleSubNavItem[] = [
    { key: 'receivables', label: '应收费用', description: '费用明细' },
    { key: 'statements', label: '客户对账单', description: '账单草稿' },
    { key: 'ledger', label: '账户流水', description: '余额变化' }
  ];

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>财务结算中心</Title>
          <Text type="secondary">M3 最小闭环：应收费用、调整项和客户对账单草稿。</Text>
        </div>
        <Space>
          <Button icon={<Landmark size={16} />} onClick={onCreateStatement}>
            生成 9409 对账单
          </Button>
          <Button type="primary" icon={<Banknote size={16} />} onClick={onCreatePayment}>
            登记 9409 收款并核销
          </Button>
        </Space>
      </Flex>

      {notice ? <Alert className="notice-bar" type="success" showIcon message={notice} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard icon={<Banknote />} title="未结应收" value={formatCurrency(total)} extra={`${receivables.length} 条费用`} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<FileText />} title="对账草稿" value={statements.length} extra="客户账单待确认" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<CircleDollarSign />} title="账户余额" value={primaryAccount ? formatCurrency(primaryAccount.balance) : '¥0.00'} extra={primaryAccount?.customerName ?? '待初始化'} />
        </Col>
      </Row>

      <ModuleSubWorkspace items={financeSubItems} activeKey={activeFinanceSection} onChange={setActiveFinanceSection}>
      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24}>
          {activeFinanceSection === 'receivables' ? (
          <Card title="应收费用">
            <Table
              rowKey="id"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={receivables}
              columns={[
                { title: '系统单号', dataIndex: 'systemOrderNo' },
                { title: '客户', dataIndex: 'customerName' },
                { title: '费用名称', dataIndex: 'name' },
                { title: '金额', dataIndex: 'amount', render: (value: number) => formatCurrency(value) },
                { title: '状态', dataIndex: 'settled', render: (settled: boolean) => (settled ? '已结算' : '未结算') }
              ]}
            />
          </Card>
          ) : null}
        </Col>
        <Col xs={24}>
          {activeFinanceSection === 'statements' ? (
          <Card title="客户对账单">
            <Space wrap className="surface-strip">
              <Tag>客户对账</Tag>
              <Tag>INV-202606-9409</Tag>
              <Tag>硅基流动</Tag>
            </Space>
            <Space direction="vertical" className="ai-list">
              {statements.map((statement) => (
                <Alert
                  key={statement.id ?? `${statement.customerId}-${statement.periodStart}`}
                  type="info"
                  showIcon
                  message={`对账单草稿 ${formatCurrency(statement.total)}`}
                  description={`${statement.customerName} · ${statement.periodStart} - ${statement.periodEnd}`}
                />
              ))}
            </Space>
          </Card>
          ) : null}
          {activeFinanceSection === 'ledger' ? (
          <Card className="module-grid" title="账户流水">
            <Table
              rowKey="id"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={ledger}
              columns={[
                { title: '客户', dataIndex: 'customerName' },
                { title: '摘要', dataIndex: 'note', render: (value?: string) => value ?? '账户变动' },
                { title: '金额', dataIndex: 'amount', render: (value: number) => formatCurrency(value) },
                { title: '余额', dataIndex: 'balance', render: (value: number) => formatCurrency(value) }
              ]}
            />
          </Card>
          ) : null}
        </Col>
      </Row>
      </ModuleSubWorkspace>
    </>
  );
}

interface WarehouseInboundPackage {
  id: string;
  shipmentId: string;
  systemOrderNo: string;
  customerOrderNo: string;
  domesticTrackingNo: string;
  warehouseEntryNo: string;
  receivingChannel: string;
  destinationCountry: string;
  expectedTotalPackageCount?: number;
  scanTime?: string;
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  cbm: number;
  status: WarehousePackageStatus;
  exceptions: string[];
}

interface WarehouseRemainingPackageRow {
  id: string;
  customerOrderNo: string;
  packageSequence: string;
  status: string;
  note: string;
}

interface WarehousePackageDraft {
  receivingChannel: string;
  destinationCountry: string;
  customsMode: string;
  taxPayment: string;
  cargoProperty: string;
  packageType: string;
  postalCode: string;
  warehouseSite: string;
  totalPackageCount: number;
  domesticTrackingNo: string;
  warehouseEntryNo: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
  divisor: number;
}

interface WarehouseConsolidationRecord {
  id: string;
  packageIds: string[];
  outboundOrderNo: string;
  transferNo?: string;
  mode: 'MERGE_ONLY' | 'MERGE_AND_SHIP';
  totalPackages: number;
  totalActualWeightKg: number;
  totalVolumetricWeightKg: number;
  totalChargeableWeightKg: number;
}

interface WarehouseOutboundLabel {
  id: string;
  consolidationId: string;
  labelNo: string;
  outboundOrderNo: string;
  destinationCountry: string;
  totalPackages: number;
  pieceIndex: number;
}

type WarehouseLabelQueueRow =
  | { id: string; kind: 'shipment'; shipment: Shipment }
  | { id: string; kind: 'consolidation'; consolidation: WarehouseConsolidationRecord };

interface WarehouseHandoverRow {
  id: string;
  outboundOrderNo: string;
  customerName: string;
  customerOrderNo: string;
  destinationCountry: string;
  packageCount: number;
  chargeableWeightKg: number;
  channelName: string;
  status: string;
}

function calculateWarehousePackageMetrics(values: Pick<WarehousePackageDraft, 'weightKg' | 'lengthCm' | 'widthCm' | 'heightCm' | 'packageCount' | 'divisor'>) {
  const cbm = (values.lengthCm * values.widthCm * values.heightCm * values.packageCount) / 1_000_000;
  const volumetricWeightKg = (values.lengthCm * values.widthCm * values.heightCm * values.packageCount) / values.divisor;
  const actualWeightKg = values.weightKg * values.packageCount;
  return {
    cbm,
    volumetricWeightKg,
    chargeableWeightKg: Math.max(actualWeightKg, volumetricWeightKg)
  };
}

function createWarehouseExceptions(pkg: WarehouseInboundPackage, expectedTotalPackageCount?: number) {
  const exceptions: string[] = [];
  if (!pkg.receivingChannel.trim()) {
    exceptions.push('缺少收货渠道');
  }
  if (!pkg.destinationCountry.trim()) {
    exceptions.push('缺少目的国家');
  }
  if (!pkg.domesticTrackingNo.trim()) {
    exceptions.push('箱号缺失');
  }
  if (pkg.weightKg <= 0) {
    exceptions.push('重量为 0');
  }
  if (pkg.lengthCm <= 0 || pkg.widthCm <= 0 || pkg.heightCm <= 0) {
    exceptions.push('尺寸缺失');
  }
  if (expectedTotalPackageCount && pkg.packageCount !== expectedTotalPackageCount && expectedTotalPackageCount === 1 && pkg.packageCount > 1) {
    exceptions.push('件数与预报不一致');
  }
  return exceptions;
}

function createInitialWarehousePackages(shipments: Shipment[]): WarehouseInboundPackage[] {
  const target = shipments.find((shipment) => shipment.status === 'WAITING_RECEIVE') ?? shipments[0];
  if (!target) {
    return [];
  }

  return Array.from({ length: 10 }, (_, index) => {
    const metrics = calculateWarehousePackageMetrics({
      weightKg: 8 + index * 0.2,
      lengthCm: 48 + index,
      widthCm: 36,
      heightCm: 32,
      packageCount: 1,
      divisor: 5000
    });
    const pkg: WarehouseInboundPackage = {
      id: `wh-seed-${index + 1}`,
      shipmentId: target.id,
      systemOrderNo: target.systemOrderNo,
      customerOrderNo: target.customerOrderNo,
      domesticTrackingNo: `SF${String(index + 1).padStart(6, '0')}`,
      warehouseEntryNo: `WH-A-${String(index + 1).padStart(3, '0')}`,
      receivingChannel: '海运休斯顿专线',
      destinationCountry: target.destinationCountry,
      packageCount: 1,
      weightKg: 8 + index * 0.2,
      lengthCm: 48 + index,
      widthCm: 36,
      heightCm: 32,
      volumetricWeightKg: metrics.volumetricWeightKg,
      chargeableWeightKg: metrics.chargeableWeightKg,
      cbm: metrics.cbm,
      status: 'RECEIVED',
      exceptions: []
    };
    return { ...pkg, exceptions: createWarehouseExceptions(pkg) };
  });
}

function createWarehouseApiPackages(): WarehouseInboundPackage[] {
  const arrivedCountByKey = new Map<string, number>();
  const expectedCountByKey = new Map<string, number>();

  warehouseScanTestRows.forEach((row) => {
    const { customerOrderNo, domesticTrackingNo } = parseWarehousePackageCode(row.combinedOrderNo);
    const groupKey = `${customerOrderNo}-${domesticTrackingNo}`;
    arrivedCountByKey.set(groupKey, (arrivedCountByKey.get(groupKey) ?? 0) + 1);
    if (row.expectedTotalPackageCount) {
      expectedCountByKey.set(groupKey, row.expectedTotalPackageCount);
    }
  });

  return warehouseScanTestRows.map((row, index) => {
    const { customerOrderNo, domesticTrackingNo } = parseWarehousePackageCode(row.combinedOrderNo);
    const groupKey = `${customerOrderNo}-${domesticTrackingNo}`;
    const expectedTotalPackageCount = expectedCountByKey.get(groupKey);
    const arrivedCount = arrivedCountByKey.get(groupKey) ?? 1;
    const pkg: WarehouseInboundPackage = {
      id: `wh-api-${index + 1}`,
      shipmentId: `api-${customerOrderNo}`,
      systemOrderNo: `API仓库-${customerOrderNo}`,
      customerOrderNo,
      domesticTrackingNo,
      warehouseEntryNo: '',
      receivingChannel: '仓库接口返回',
      destinationCountry: '',
      expectedTotalPackageCount,
      scanTime: normalizeWarehouseScanTime(row.scanTime),
      packageCount: 1,
      weightKg: row.weightKg,
      lengthCm: row.lengthCm,
      widthCm: row.widthCm,
      heightCm: row.heightCm,
      volumetricWeightKg: row.volumetricWeightKg,
      chargeableWeightKg: Math.max(row.weightKg, row.volumetricWeightKg),
      cbm: row.cbm,
      status: 'RECEIVED',
      exceptions: []
    };
    const exceptions = createWarehouseExceptions(pkg);
    if (expectedTotalPackageCount && arrivedCount < expectedTotalPackageCount) {
      exceptions.push(`部分到仓 ${arrivedCount}/${expectedTotalPackageCount}`);
    }
    return {
      ...pkg,
      exceptions
    };
  });
}

function parseWarehousePackageCode(value: string) {
  const normalized = value.trim();
  const separatorIndex = normalized.search(/[-－—–]/);
  if (separatorIndex <= 0) {
    return { customerOrderNo: normalized, domesticTrackingNo: '' };
  }
  return {
    customerOrderNo: normalized.slice(0, separatorIndex).trim(),
    domesticTrackingNo: normalized.slice(separatorIndex + 1).trim()
  };
}

function normalizeWarehouseScanTime(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})\/(\d{2}):(\d{2})'(\d{2})"?$/);
  if (!match) {
    return trimmed;
  }
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatWarehousePackageNo(pkg: Pick<WarehouseInboundPackage, 'customerOrderNo' | 'domesticTrackingNo'>) {
  return pkg.domesticTrackingNo ? `${pkg.customerOrderNo}-${pkg.domesticTrackingNo}` : pkg.customerOrderNo;
}

function mapWarehouseApiPackageToInbound(pkg: WarehousePackageSummary): WarehouseInboundPackage {
  return {
    id: pkg.id,
    shipmentId: pkg.shipmentId ?? `api-${pkg.customerOrderNo}`,
    systemOrderNo: pkg.systemOrderNo ?? `API仓库-${pkg.customerOrderNo}`,
    customerOrderNo: pkg.customerOrderNo,
    domesticTrackingNo: pkg.domesticTrackingNo,
    warehouseEntryNo: '',
    receivingChannel: pkg.receivingChannel,
    destinationCountry: pkg.destinationCountry ?? '',
    expectedTotalPackageCount: pkg.expectedTotalPackageCount,
    scanTime: pkg.scanTime ? formatBeijingDateTime(pkg.scanTime) : undefined,
    packageCount: pkg.packageCount,
    weightKg: pkg.weightKg,
    lengthCm: pkg.lengthCm,
    widthCm: pkg.widthCm,
    heightCm: pkg.heightCm,
    volumetricWeightKg: pkg.volumetricWeightKg,
    chargeableWeightKg: pkg.chargeableWeightKg,
    cbm: pkg.cbm,
    status: pkg.status,
    exceptions: pkg.exceptions
  };
}

function withWarehouseCustomerProgress(packages: WarehouseInboundPackage[]): WarehouseInboundPackage[] {
  return packages.map((pkg) => {
    if (!pkg.expectedTotalPackageCount) {
      return pkg;
    }
    const arrivedCount = packages.filter((item) => item.customerOrderNo === pkg.customerOrderNo).length;
    const progressException = arrivedCount < pkg.expectedTotalPackageCount ? `部分到仓 ${arrivedCount}/${pkg.expectedTotalPackageCount}` : undefined;
    return {
      ...pkg,
      exceptions: Array.from(new Set([...(pkg.exceptions ?? []), ...(progressException ? [progressException] : [])]))
    };
  });
}

function ReceiveLabelPage({
  apiClient,
  shipments,
  notice,
  onReceive,
  onDispatch
}: {
  apiClient: ApiClient;
  shipments: Shipment[];
  notice: string | null;
  onReceive: (record: Shipment) => Promise<void>;
  onDispatch: (record: Shipment) => Promise<void>;
}) {
  const config = modulePageConfigs.receive!;
  const workQueue = shipments.filter((shipment) =>
    ['DECLARED', 'WAITING_RECEIVE', 'WAITING_SORT', 'WAITING_DISPATCH'].includes(shipment.status)
  );
  const [activeReceiveSection, setActiveReceiveSection] = useState('inbound');
  const [warehousePackages, setWarehousePackages] = useState<WarehouseInboundPackage[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [consolidations, setConsolidations] = useState<WarehouseConsolidationRecord[]>([]);
  const [selectedConsolidationId, setSelectedConsolidationId] = useState<string | null>(null);
  const [warehouseOutboundLabelsByConsolidationId, setWarehouseOutboundLabelsByConsolidationId] = useState<Record<string, WarehouseOutboundLabel[]>>({});
  const [warehouseShipmentLabelsByShipmentId, setWarehouseShipmentLabelsByShipmentId] = useState<Record<string, WarehouseOutboundLabel[]>>({});
  const [dispatchedConsolidationIds, setDispatchedConsolidationIds] = useState<string[]>([]);
  const [dispatchingWarehouseShipmentIds, setDispatchingWarehouseShipmentIds] = useState<string[]>([]);
  const [warehouseNotice, setWarehouseNotice] = useState<string | null>(null);
  const [packageCustomerOrderQuery, setPackageCustomerOrderQuery] = useState('');
  const [consolidationPackageQuery, setConsolidationPackageQuery] = useState('');
  const [packageDraft, setPackageDraft] = useState<WarehousePackageDraft>({
    receivingChannel: '仓库接口返回',
    destinationCountry: '美国',
    customsMode: '其它',
    taxPayment: '收件人',
    cargoProperty: '普货',
    packageType: 'WPX',
    postalCode: '',
    warehouseSite: '深圳站点',
    totalPackageCount: 1,
    domesticTrackingNo: '',
    warehouseEntryNo: '',
    weightKg: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    packageCount: 1,
    divisor: 5000
  });
  useEffect(() => {
    let alive = true;
    apiClient.warehousePackages()
      .then((rows) => {
        if (!alive) return;
        setWarehousePackages(withWarehouseCustomerProgress(rows.map(mapWarehouseApiPackageToInbound)));
      })
      .catch(() => {
        if (!alive) return;
        setWarehousePackages(withWarehouseCustomerProgress([...createWarehouseApiPackages(), ...createInitialWarehousePackages(shipments)]));
      });
    return () => {
      alive = false;
    };
  }, [apiClient, shipments]);
  const selectedReceiptShipment = workQueue.find((shipment) => shipment.status === 'WAITING_RECEIVE') ?? workQueue[0];
  const currentShipmentPackages = selectedReceiptShipment
    ? warehousePackages.filter((pkg) => pkg.shipmentId === selectedReceiptShipment.id)
    : [];
  const draftMetrics = calculateWarehousePackageMetrics(packageDraft);
  const normalizedPackageCustomerOrderQuery = packageCustomerOrderQuery.trim();
  const searchedWarehousePackages = normalizedPackageCustomerOrderQuery
    ? warehousePackages.filter((pkg) => pkg.customerOrderNo === normalizedPackageCustomerOrderQuery)
    : [];
  const expectedPackageCount = searchedWarehousePackages.reduce(
    (max, pkg) => Math.max(max, pkg.expectedTotalPackageCount ?? 0),
    0
  );
  const handledPackageCount = searchedWarehousePackages.length;
  const remainingPackageCount = Math.max(expectedPackageCount - handledPackageCount, 0);
  const remainingPackageRows: WarehouseRemainingPackageRow[] = Array.from({ length: remainingPackageCount }, (_, index) => {
    const sequence = handledPackageCount + index + 1;
    return {
      id: `${normalizedPackageCustomerOrderQuery}-remaining-${sequence}`,
      customerOrderNo: normalizedPackageCustomerOrderQuery,
      packageSequence: `剩余第 ${sequence} 件`,
      status: '待接口回传',
      note: `预计共 ${expectedPackageCount} 件，已处理 ${handledPackageCount} 件`
    };
  });
  const selectedConsolidation = consolidations.find((record) => record.id === selectedConsolidationId);
  const selectedConsolidationPackages = selectedConsolidation
    ? warehousePackages.filter((pkg) => selectedConsolidation.packageIds.includes(pkg.id))
    : [];
  const normalizedConsolidationPackageQuery = consolidationPackageQuery.trim().toLowerCase();
  const availableConsolidationPackages = warehousePackages.filter((pkg) => pkg.status !== 'CONSOLIDATED');
  const filteredConsolidationPackages = normalizedConsolidationPackageQuery
    ? availableConsolidationPackages.filter((pkg) => {
        const searchable = [
          formatWarehousePackageNo(pkg),
          pkg.customerOrderNo,
          pkg.domesticTrackingNo,
          pkg.systemOrderNo
        ].join(' ').toLowerCase();
        return searchable.includes(normalizedConsolidationPackageQuery);
      })
    : availableConsolidationPackages;
  const warehouseOutboundQueue = consolidations.filter(
    (record) => record.mode === 'MERGE_AND_SHIP' && !dispatchedConsolidationIds.includes(record.id)
  );
  const warehouseShipmentQueue = shipments.filter(
    (shipment) => shipment.status === 'WAITING_DISPATCH' && !dispatchingWarehouseShipmentIds.includes(shipment.id)
  );
  const warehouseLabelQueueRows: WarehouseLabelQueueRow[] = [
    ...warehouseShipmentQueue.map((shipment) => ({ id: `shipment-${shipment.id}`, kind: 'shipment' as const, shipment })),
    ...warehouseOutboundQueue.map((record) => ({ id: `consolidation-${record.id}`, kind: 'consolidation' as const, consolidation: record }))
  ];
  const warehouseHandoverRows: WarehouseHandoverRow[] = [
    ...warehouseLabelQueueRows.map((row): WarehouseHandoverRow => {
      if (row.kind === 'shipment') {
        return {
          id: row.id,
          outboundOrderNo: row.shipment.systemOrderNo,
          customerName: row.shipment.customerName,
          customerOrderNo: row.shipment.customerOrderNo,
          destinationCountry: row.shipment.destinationCountry,
          packageCount: Math.max(row.shipment.packageCount, 1),
          chargeableWeightKg: row.shipment.receivableWeightKg,
          channelName: row.shipment.channelName || row.shipment.carrier || '待确认',
          status: '待仓库出货'
        };
      }
      const packages = getConsolidationPackages(row.consolidation);
      return {
        id: row.id,
        outboundOrderNo: row.consolidation.outboundOrderNo,
        customerName: packages[0]?.systemOrderNo ?? '合票包裹',
        customerOrderNo: Array.from(new Set(packages.map((pkg) => pkg.customerOrderNo))).join('、') || '-',
        destinationCountry: getConsolidationDestination(row.consolidation),
        packageCount: row.consolidation.totalPackages,
        chargeableWeightKg: row.consolidation.totalChargeableWeightKg,
        channelName: packages[0]?.receivingChannel || '待确认',
        status: row.consolidation.mode === 'MERGE_AND_SHIP' ? '合票待出货' : '仅合并'
      };
    }),
    ...consolidations
      .filter((record) => record.mode === 'MERGE_ONLY')
      .map((record): WarehouseHandoverRow => {
        const packages = getConsolidationPackages(record);
        return {
          id: `merge-only-${record.id}`,
          outboundOrderNo: record.outboundOrderNo,
          customerName: packages[0]?.systemOrderNo ?? '合票包裹',
          customerOrderNo: Array.from(new Set(packages.map((pkg) => pkg.customerOrderNo))).join('、') || '-',
          destinationCountry: getConsolidationDestination(record),
          packageCount: record.totalPackages,
          chargeableWeightKg: record.totalChargeableWeightKg,
          channelName: packages[0]?.receivingChannel || '待确认',
          status: '仅合并未出货'
        };
      })
  ];

  function getConsolidationPackages(record: WarehouseConsolidationRecord) {
    return warehousePackages.filter((pkg) => record.packageIds.includes(pkg.id));
  }

  function getConsolidationDestination(record: WarehouseConsolidationRecord) {
    return getConsolidationPackages(record).find((pkg) => pkg.destinationCountry.trim())?.destinationCountry ?? '待确认国家';
  }

  function printWarehouseOutboundLabels(record: WarehouseConsolidationRecord) {
    const destinationCountry = getConsolidationDestination(record);
    const labelNo = createWarehouseInternalLabelNo(record.outboundOrderNo);
    const labels = Array.from({ length: record.totalPackages }, (_, index): WarehouseOutboundLabel => ({
      id: `${record.id}-label-${index + 1}`,
      consolidationId: record.id,
      labelNo,
      outboundOrderNo: record.outboundOrderNo,
      destinationCountry,
      totalPackages: record.totalPackages,
      pieceIndex: index + 1
    }));
    setWarehouseOutboundLabelsByConsolidationId((current) => ({
      ...current,
      [record.id]: labels
    }));
    setWarehouseNotice(`已生成 ${record.outboundOrderNo} 面单 ${record.totalPackages} 张`);
  }

  function printWarehouseShipmentLabels(record: Shipment) {
    const totalPackages = Math.max(record.packageCount, 1);
    const labelNo = createWarehouseInternalLabelNo(record.systemOrderNo);
    const labels = Array.from({ length: totalPackages }, (_, index): WarehouseOutboundLabel => ({
      id: `${record.id}-warehouse-label-${index + 1}`,
      consolidationId: record.id,
      labelNo,
      outboundOrderNo: record.systemOrderNo,
      destinationCountry: record.destinationCountry,
      totalPackages,
      pieceIndex: index + 1
    }));
    setWarehouseShipmentLabelsByShipmentId((current) => ({
      ...current,
      [record.id]: labels
    }));
    setWarehouseNotice(`已生成仓库出货面单 ${record.systemOrderNo} ${totalPackages} 张`);
  }

  function dispatchWarehouseOutbound(record: WarehouseConsolidationRecord) {
    setDispatchedConsolidationIds((current) => Array.from(new Set([...current, record.id])));
    setWarehouseNotice(`已出货 ${record.outboundOrderNo}`);
  }

  async function dispatchWarehouseShipment(record: Shipment) {
    await onDispatch(record);
    setDispatchingWarehouseShipmentIds((current) => Array.from(new Set([...current, record.id])));
    setWarehouseNotice(`已出货 ${record.systemOrderNo}`);
  }

  function getWarehouseQueueOutboundNo(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.systemOrderNo : row.consolidation.outboundOrderNo;
  }

  function getWarehouseQueueDestination(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.destinationCountry : getConsolidationDestination(row.consolidation);
  }

  function getWarehouseQueuePackageCount(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? Math.max(row.shipment.packageCount, 1) : row.consolidation.totalPackages;
  }

  function getWarehouseQueueChargeableWeight(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.receivableWeightKg : row.consolidation.totalChargeableWeightKg;
  }

  function getWarehouseQueueLabels(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment'
      ? warehouseShipmentLabelsByShipmentId[row.shipment.id] ?? []
      : warehouseOutboundLabelsByConsolidationId[row.consolidation.id] ?? [];
  }

  function createWarehouseHandoverHtml(rows: WarehouseHandoverRow[]) {
    const createdAt = formatBeijingDateTime(new Date().toISOString());
    const tableRows = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.outboundOrderNo)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.customerOrderNo)}</td>
        <td>${escapeHtml(row.destinationCountry)}</td>
        <td>${row.packageCount}</td>
        <td>${row.chargeableWeightKg.toFixed(2)} kg</td>
        <td>${escapeHtml(row.channelName)}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>
    `).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>思远物流收货交接单</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #111827; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .meta { color: #64748b; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d8e1ee; padding: 8px 10px; font-size: 12px; text-align: left; }
    th { background: #f4f7fb; font-weight: 700; }
  </style>
</head>
<body>
  <h1>思远物流收货交接单</h1>
  <div class="meta">生成时间：${escapeHtml(createdAt)}；共 ${rows.length} 条交接记录</div>
  <table>
    <thead>
      <tr>
        <th>出货单号</th>
        <th>客户/来源</th>
        <th>客户单号</th>
        <th>出货国家</th>
        <th>出货件数</th>
        <th>计费重</th>
        <th>渠道</th>
        <th>状态</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;
  }

  function downloadWarehouseHandoverWord() {
    if (!warehouseHandoverRows.length) {
      setWarehouseNotice('当前暂无可导出的收货交接单数据');
      return;
    }
    downloadHtmlFile(createWarehouseHandoverHtml(warehouseHandoverRows), `思远物流-收货交接单-${Date.now()}.doc`, 'application/msword;charset=utf-8');
    setWarehouseNotice('已生成收货交接单 Word 文件');
  }

  function printWarehouseHandoverPdf() {
    if (!warehouseHandoverRows.length) {
      setWarehouseNotice('当前暂无可导出的收货交接单数据');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setWarehouseNotice('浏览器阻止了打印窗口，请允许弹窗后重试');
      return;
    }
    printWindow.document.write(createWarehouseHandoverHtml(warehouseHandoverRows));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setWarehouseNotice('已打开收货交接单 PDF 打印窗口');
  }

  const receiveSubItems: ModuleSubNavItem[] = [
    { key: 'inbound', label: '入库收货', description: '渠道与国家确认' },
    { key: 'packages', label: '包裹明细', description: '件重尺采集' },
    { key: 'consolidation', label: '合票出货', description: '多包裹合并' },
    { key: 'queue', label: '面单队列&待仓库出货', description: '打单与出货确认' },
    { key: 'exceptions', label: '收货交接单', description: '交接资料输出' }
  ];
  function formatWarehouseInboundProgress(pkg: WarehouseInboundPackage) {
    if (!pkg.expectedTotalPackageCount) {
      return '-';
    }
    const arrived = warehousePackages.filter((item) => item.customerOrderNo === pkg.customerOrderNo).length;
    return `已到 ${arrived}/${pkg.expectedTotalPackageCount}`;
  }

  const warehousePackageColumns: ColumnsType<WarehouseInboundPackage> = [
    { title: '系统单号', dataIndex: 'systemOrderNo', width: 150 },
    {
      title: '客户单号-快递单号',
      width: 210,
      render: (_, record) => <Text strong>{formatWarehousePackageNo(record)}</Text>
    },
    { title: '收货渠道', dataIndex: 'receivingChannel', width: 150 },
    {
      title: '到仓进度',
      width: 110,
      render: (_, record) => formatWarehouseInboundProgress(record)
    },
    { title: '件数', dataIndex: 'packageCount', width: 80 },
    { title: '实重', dataIndex: 'weightKg', width: 90, render: (value: number) => value.toFixed(2) },
    { title: '尺寸 cm', width: 130, render: (_, record) => `${record.lengthCm}×${record.widthCm}×${record.heightCm}` },
    { title: '方数', dataIndex: 'cbm', width: 100, render: (value: number) => value.toFixed(6) },
    { title: '材积重', dataIndex: 'volumetricWeightKg', width: 100, render: (value: number) => value.toFixed(2) },
    { title: '计费重', dataIndex: 'chargeableWeightKg', width: 100, render: (value: number) => value.toFixed(2) },
    { title: '扫描时间', dataIndex: 'scanTime', width: 150, render: (value?: string) => value || '-' },
    {
      title: '异常',
      dataIndex: 'exceptions',
      width: 180,
      render: (exceptions: string[]) =>
        exceptions.length ? (
          <Space wrap>{exceptions.map((item) => <Tag color="warning" key={item}>{item}</Tag>)}</Space>
        ) : (
          <Tag color="green">正常</Tag>
      )
    }
  ];
  const warehouseRemainingPackageColumns: ColumnsType<WarehouseRemainingPackageRow> = [
    { title: '客户单号', dataIndex: 'customerOrderNo', width: 140 },
    { title: '剩余件序号', dataIndex: 'packageSequence', width: 160 },
    { title: '状态', dataIndex: 'status', width: 130, render: (value: string) => <Tag color="warning">{value}</Tag> },
    { title: '说明', dataIndex: 'note' }
  ];
  function patchPackageDraft(patch: Partial<WarehousePackageDraft>) {
    setPackageDraft((current) => ({ ...current, ...patch }));
  }

  function addWarehousePackage() {
    if (!selectedReceiptShipment) {
      setWarehouseNotice('当前没有可入库的订单');
      return;
    }

    const metrics = calculateWarehousePackageMetrics(packageDraft);
    const pkg: WarehouseInboundPackage = {
      id: `wh-local-${Date.now()}`,
      shipmentId: selectedReceiptShipment.id,
      systemOrderNo: selectedReceiptShipment.systemOrderNo,
      customerOrderNo: selectedReceiptShipment.customerOrderNo,
      domesticTrackingNo: packageDraft.domesticTrackingNo.trim(),
      warehouseEntryNo: packageDraft.warehouseEntryNo.trim(),
      receivingChannel: packageDraft.receivingChannel.trim(),
      destinationCountry: packageDraft.destinationCountry.trim(),
      packageCount: packageDraft.packageCount,
      weightKg: packageDraft.weightKg,
      lengthCm: packageDraft.lengthCm,
      widthCm: packageDraft.widthCm,
      heightCm: packageDraft.heightCm,
      volumetricWeightKg: metrics.volumetricWeightKg,
      chargeableWeightKg: metrics.chargeableWeightKg,
      cbm: metrics.cbm,
      status: 'RECEIVED',
      exceptions: []
    };
    const nextPackage = { ...pkg, exceptions: createWarehouseExceptions(pkg, packageDraft.totalPackageCount) };
    setWarehousePackages((current) => [nextPackage, ...current]);
    setWarehouseNotice(`已新增包裹明细 ${nextPackage.domesticTrackingNo || nextPackage.systemOrderNo}`);
    patchPackageDraft({
      domesticTrackingNo: '',
      warehouseEntryNo: '',
      weightKg: 0,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
      packageCount: 1
    });
  }

  function confirmWarehouseInbound() {
    if (!packageDraft.receivingChannel.trim() || !packageDraft.destinationCountry.trim()) {
      setWarehouseNotice('请先填写收货渠道和目的国家');
      return;
    }
    if (!selectedReceiptShipment) {
      setWarehouseNotice('当前没有可确认入库的订单');
      return;
    }
    void onReceive(selectedReceiptShipment);
    setWarehouseNotice(`已确认 ${selectedReceiptShipment.systemOrderNo} 入库，包裹明细可继续补录`);
  }

  function toggleWarehousePackage(packageId: string, checked: boolean) {
    setSelectedPackageIds((current) =>
      checked ? Array.from(new Set([...current, packageId])) : current.filter((id) => id !== packageId)
    );
  }

  async function consolidateSelectedPackages(mode: WarehouseConsolidationRecord['mode']) {
    const selected = warehousePackages.filter((pkg) => selectedPackageIds.includes(pkg.id) && pkg.status !== 'CONSOLIDATED');
    if (!selected.length) {
      setWarehouseNotice('请先选择要合并的入库包裹');
      return;
    }
    let created: WarehouseConsolidationSummary | undefined;
    try {
      created = await apiClient.createWarehouseConsolidation({ packageIds: selected.map((pkg) => pkg.id), mode });
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '合并包裹失败');
      return;
    }
    const record: WarehouseConsolidationRecord = {
      id: created.id,
      packageIds: created.packageIds,
      outboundOrderNo: created.systemOrderNo ?? created.consolidationNo,
      mode: created.mode,
      totalPackages: created.totalPackages,
      totalActualWeightKg: created.totalActualWeightKg,
      totalVolumetricWeightKg: created.totalVolumetricWeightKg,
      totalChargeableWeightKg: created.totalChargeableWeightKg
    };
    setConsolidations((current) => [record, ...current]);
    setWarehousePackages((current) =>
      current.map((pkg) => (record.packageIds.includes(pkg.id) ? { ...pkg, status: 'CONSOLIDATED' } : pkg))
    );
    setSelectedPackageIds([]);
    setWarehouseNotice(
      mode === 'MERGE_AND_SHIP'
        ? `已合并 ${record.totalPackages} 个入库包裹并生成出货单 ${record.outboundOrderNo}`
        : `已合并 ${record.totalPackages} 个入库包裹，暂不出货`
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>{config.title}</Title>
          <Text type="secondary">{config.description}</Text>
        </div>
        <Space>
          <Button icon={<PackageCheck size={16} />}>收货扫描</Button>
          <Button type="primary" icon={<FileText size={16} />}>模拟面单</Button>
        </Space>
      </Flex>

      {notice ? <Alert className="notice-bar" type={notice.includes('不允许') ? 'error' : 'success'} showIcon message={notice} /> : null}
      {warehouseNotice ? <Alert className="notice-bar" type={warehouseNotice.includes('请先') ? 'warning' : 'success'} showIcon message={warehouseNotice} /> : null}

      <Row gutter={[16, 16]}>
        {config.stats.map((stat) => (
          <Col xs={24} md={8} key={stat.label}>
            <MetricCard icon={<PackagePlus />} title={stat.label} value={stat.value} extra={stat.helper} />
          </Col>
        ))}
      </Row>

      <ModuleSubWorkspace items={receiveSubItems} activeKey={activeReceiveSection} onChange={setActiveReceiveSection}>
      {activeReceiveSection === 'inbound' ? (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="入库收货">
          <Card size="small" title="扫描 / 载入货物" className="warehouse-scan-card">
            <Row gutter={[16, 12]} align="middle">
              <Col xs={24} md={10}>
                <Input aria-label="扫描单号" placeholder="扫描客户单号、系统单号、箱号" value={selectedReceiptShipment?.systemOrderNo ?? ''} readOnly />
              </Col>
              <Col xs={24} md={14}>
                <Space direction="vertical" size={2}>
                  <Text strong>{selectedReceiptShipment?.systemOrderNo ?? '暂无待入库订单'}</Text>
                  <Text type="secondary">当前订单：{selectedReceiptShipment?.customerName ?? '暂无'} / {selectedReceiptShipment?.customerOrderNo ?? '-'}</Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Card>

        <Card title="待入库订单">
          <Table
            rowKey="id"
            columns={[
              { title: '系统单号', dataIndex: 'systemOrderNo' },
              { title: '客户单号', dataIndex: 'customerOrderNo' },
              { title: '客户', dataIndex: 'customerName' },
              { title: '目的地', dataIndex: 'destinationCountry' },
              { title: '状态', dataIndex: 'status', render: (status: ShipmentStatus) => <StatusTag status={status} /> }
            ]}
            dataSource={workQueue.filter((shipment) => shipment.status === 'WAITING_RECEIVE')}
            size="small"
            pagination={tenRowTablePagination}
          />
        </Card>

        <Card title="API 包裹数据明细" extra={<Tag color="blue">仓库接口返回</Tag>}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="此处只展示仓库 API 返回的包裹明细：客户单号、快递单号、实重、长宽高、方数、材积重、扫描时间和到仓进度。"
            />
            <Table
              rowKey="id"
              columns={warehousePackageColumns}
              dataSource={warehousePackages.filter((pkg) => pkg.shipmentId.startsWith('api-'))}
              size="small"
              pagination={tenRowTablePagination}
              scroll={{ x: 1500 }}
            />
          </Space>
        </Card>

        <Card title="件重尺录入">
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8} xl={4}>
              <Text strong>总件数</Text>
              <Input aria-label="总件数" value={packageDraft.totalPackageCount} onChange={(event) => patchPackageDraft({ totalPackageCount: Number(event.target.value) || 0 })} />
            </Col>
            <Col xs={24} md={8} xl={4}>
              <Text strong>国内快递号/箱号</Text>
              <Input aria-label="国内快递号/箱号" value={packageDraft.domesticTrackingNo} onChange={(event) => patchPackageDraft({ domesticTrackingNo: event.target.value })} />
            </Col>
            <Col xs={24} md={8} xl={4}>
              <Text strong>入仓号</Text>
              <Input aria-label="入仓号" value={packageDraft.warehouseEntryNo} onChange={(event) => patchPackageDraft({ warehouseEntryNo: event.target.value })} />
            </Col>
            <Col xs={24} md={8} xl={3}>
              <Text strong>重量 kg</Text>
              <Input aria-label="重量 kg" value={packageDraft.weightKg} onChange={(event) => patchPackageDraft({ weightKg: Number(event.target.value) || 0 })} />
            </Col>
            <Col xs={24} md={8} xl={3}>
              <Text strong>长 cm</Text>
              <Input aria-label="长 cm" value={packageDraft.lengthCm} onChange={(event) => patchPackageDraft({ lengthCm: Number(event.target.value) || 0 })} />
            </Col>
            <Col xs={24} md={8} xl={3}>
              <Text strong>宽 cm</Text>
              <Input aria-label="宽 cm" value={packageDraft.widthCm} onChange={(event) => patchPackageDraft({ widthCm: Number(event.target.value) || 0 })} />
            </Col>
            <Col xs={24} md={8} xl={3}>
              <Text strong>高 cm</Text>
              <Input aria-label="高 cm" value={packageDraft.heightCm} onChange={(event) => patchPackageDraft({ heightCm: Number(event.target.value) || 0 })} />
            </Col>
            <Col xs={24} md={8} xl={3}>
              <Text strong>件数</Text>
              <Input aria-label="明细件数" value={packageDraft.packageCount} onChange={(event) => patchPackageDraft({ packageCount: Number(event.target.value) || 0 })} />
            </Col>
          </Row>
          <Flex justify="space-between" align="center" className="warehouse-summary-strip">
            <Space wrap>
              <Tag color="blue">材积重 {draftMetrics.volumetricWeightKg.toFixed(2)} kg</Tag>
              <Tag color="green">计费重 {draftMetrics.chargeableWeightKg.toFixed(2)} kg</Tag>
              <Tag color="cyan">方数 {draftMetrics.cbm.toFixed(3)} CBM</Tag>
            </Space>
            <Space>
              <Button onClick={addWarehousePackage}>新增包裹明细</Button>
              <Button type="primary" onClick={confirmWarehouseInbound}>确认入库</Button>
            </Space>
          </Flex>
        </Card>

        <Card title="本单包裹明细">
          <Table
            rowKey="id"
            columns={warehousePackageColumns}
            dataSource={currentShipmentPackages}
            size="small"
            pagination={tenRowTablePagination}
            scroll={{ x: 1280 }}
          />
        </Card>
      </Space>
      ) : null}

      {activeReceiveSection === 'packages' ? (
      <Card title="包裹明细">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Input.Search
            aria-label="客户单号精确查询"
            allowClear
            placeholder="输入客户单号精确查询，例如 1399"
            value={packageCustomerOrderQuery}
            onChange={(event) => setPackageCustomerOrderQuery(event.target.value)}
          />
          {normalizedPackageCustomerOrderQuery ? (
            expectedPackageCount ? (
              <Alert
                type={remainingPackageCount ? 'warning' : 'success'}
                showIcon
                message={`客户单号 ${normalizedPackageCustomerOrderQuery}：应到 ${expectedPackageCount} 件，已处理 ${handledPackageCount} 件，剩余 ${remainingPackageCount} 件`}
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                message={`未找到客户单号 ${normalizedPackageCustomerOrderQuery} 的预计总件数，请等待仓库接口返回完整批次信息。`}
              />
            )
          ) : (
            <Alert type="info" showIcon message="输入客户单号后，系统会按预计总件数剔除已处理包裹，只展示剩余待处理件。" />
          )}
          {normalizedPackageCustomerOrderQuery && expectedPackageCount ? (
            <Table<WarehouseRemainingPackageRow>
              rowKey="id"
              columns={warehouseRemainingPackageColumns}
              dataSource={remainingPackageRows}
              size="small"
              pagination={tenRowTablePagination}
              scroll={{ x: 760 }}
            />
          ) : (
            <Table<WarehouseInboundPackage>
              rowKey="id"
              columns={warehousePackageColumns}
              dataSource={warehousePackages}
              size="small"
              pagination={tenRowTablePagination}
              scroll={{ x: 1280 }}
            />
          )}
        </Space>
      </Card>
      ) : null}

      {activeReceiveSection === 'consolidation' ? (
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="可合并包裹">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Search
                aria-label="合票包裹搜索"
                allowClear
                placeholder="搜索客户单号或快递单号，例如 P710、999056444656"
                value={consolidationPackageQuery}
                onChange={(event) => setConsolidationPackageQuery(event.target.value)}
              />
              <Table<WarehouseInboundPackage>
                rowKey="id"
                dataSource={filteredConsolidationPackages}
                size="small"
                pagination={tenRowTablePagination}
                scroll={{ x: 900 }}
                columns={[
                  {
                    title: '',
                    width: 52,
                    render: (_, pkg) => (
                      <Checkbox
                        aria-label={`选择 ${formatWarehousePackageNo(pkg)} ${pkg.id}`}
                        checked={selectedPackageIds.includes(pkg.id)}
                        onChange={(event) => toggleWarehousePackage(pkg.id, event.target.checked)}
                      />
                    )
                  },
                  {
                    title: '客户单号-快递单号',
                    width: 230,
                    render: (_, pkg) => <Text strong>{formatWarehousePackageNo(pkg)}</Text>
                  },
                  { title: '系统单号', dataIndex: 'systemOrderNo', width: 150 },
                  { title: '实重', dataIndex: 'weightKg', width: 90, render: (value: number) => `${value.toFixed(2)} kg` },
                  { title: '尺寸 cm', width: 130, render: (_, pkg) => `${pkg.lengthCm}×${pkg.widthCm}×${pkg.heightCm}` },
                  { title: '计费重', dataIndex: 'chargeableWeightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
                  {
                    title: '到仓进度',
                    width: 110,
                    render: (_, pkg) => formatWarehouseInboundProgress(pkg)
                  }
                ]}
              />
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="合票预览">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Statistic title="已选包裹" value={selectedPackageIds.length} suffix="个" />
              <Button block onClick={() => void consolidateSelectedPackages('MERGE_ONLY')}>合并包裹</Button>
              <Button type="primary" block onClick={() => void consolidateSelectedPackages('MERGE_AND_SHIP')}>合并包裹出货</Button>
              <Text type="secondary">合并包裹只归并批次，不生成出货动作；合并包裹出货会生成内部出货单。原包裹明细仍保留追溯。</Text>
            </Space>
          </Card>
          <Card title="合票记录" className="warehouse-consolidation-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              {consolidations.length ? consolidations.map((record) => (
                <Flex key={record.id} justify="space-between" align="center">
                  <Space direction="vertical" size={0}>
                    <Text strong>{record.outboundOrderNo}</Text>
                    <Text type="secondary">{record.totalPackages} 个包裹 / 计费重 {record.totalChargeableWeightKg.toFixed(2)} kg</Text>
                  </Space>
                  <Space>
                    <Tag color={record.mode === 'MERGE_AND_SHIP' ? 'green' : 'blue'}>{record.mode === 'MERGE_AND_SHIP' ? '合并出货' : '仅合并'}</Tag>
                    <Button size="small" onClick={() => setSelectedConsolidationId(record.id)}>
                      查看明细
                    </Button>
                  </Space>
                </Flex>
              )) : <Text type="secondary">暂无合票记录</Text>}
            </Space>
          </Card>
        </Col>
      </Row>
      ) : null}

      {activeReceiveSection === 'queue' ? (
      <Card title="面单队列&待仓库出货">
        <Table<WarehouseLabelQueueRow>
          rowKey="id"
          dataSource={warehouseLabelQueueRows}
          size="small"
          pagination={tenRowTablePagination}
          scroll={{ x: 980 }}
          columns={[
            { title: '出货单号', width: 150, render: (_, record) => getWarehouseQueueOutboundNo(record) },
            { title: '出货国家', width: 120, render: (_, record) => getWarehouseQueueDestination(record) },
            { title: '出货件数', width: 100, render: (_, record) => `${getWarehouseQueuePackageCount(record)} 件` },
            { title: '计费重', width: 110, render: (_, record) => `${getWarehouseQueueChargeableWeight(record).toFixed(2)} kg` },
            { title: '状态', width: 120, render: () => <Tag color="processing">待仓库出货</Tag> },
            {
              title: '面单内容',
              render: (_, record) => {
                const labels = getWarehouseQueueLabels(record);
                return labels.length ? (
                  <div className="warehouse-label-preview-grid">
                    {labels.map((label) => (
                      <WarehouseInternalLabelCard key={label.id} label={label} />
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">待打单</Text>
                );
              }
            },
            {
              title: '操作',
              width: 150,
              fixed: 'right',
              render: (_, record) => {
                const hasLabels = Boolean(getWarehouseQueueLabels(record).length);
                return (
                  <Space wrap>
                    <Button
                      aria-label="打单"
                      size="small"
                      type="primary"
                      onClick={() => {
                        if (record.kind === 'shipment') {
                          printWarehouseShipmentLabels(record.shipment);
                          return;
                        }
                        printWarehouseOutboundLabels(record.consolidation);
                      }}
                    >
                      打单
                    </Button>
                    <Popconfirm
                      title="确认出货？"
                      description="确认后该出货单会离开面单队列，后续进入出货后的轨迹跟进。"
                      okText="确认出货"
                      cancelText="取消"
                      onConfirm={() => {
                        if (record.kind === 'shipment') {
                          void dispatchWarehouseShipment(record.shipment);
                          return;
                        }
                        dispatchWarehouseOutbound(record.consolidation);
                      }}
                      disabled={!hasLabels}
                    >
                      <Button aria-label="出货" size="small" disabled={!hasLabels}>
                        出货
                      </Button>
                    </Popconfirm>
                  </Space>
                );
              }
            }
          ]}
          locale={{ emptyText: '暂无待打单出货单，请先在渠道排货中分配渠道，或在合票出货中选择“合并包裹出货”。' }}
        />
      </Card>
      ) : null}

      {activeReceiveSection === 'exceptions' ? (
      <Card
        title="收货交接单"
        extra={(
          <Space>
            <Button onClick={downloadWarehouseHandoverWord}>下载 Word</Button>
            <Button type="primary" onClick={printWarehouseHandoverPdf}>导出 PDF</Button>
          </Space>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="交接单从渠道排货后的待仓库出货单与合票记录生成，用于仓库与代理交货核对。"
          />
          <Table<WarehouseHandoverRow>
            rowKey="id"
            columns={[
              { title: '出货单号', dataIndex: 'outboundOrderNo', width: 150 },
              { title: '客户/来源', dataIndex: 'customerName', width: 150 },
              { title: '客户单号', dataIndex: 'customerOrderNo', width: 160 },
              { title: '出货国家', dataIndex: 'destinationCountry', width: 120 },
              { title: '出货件数', dataIndex: 'packageCount', width: 100, render: (value: number) => `${value} 件` },
              { title: '计费重', dataIndex: 'chargeableWeightKg', width: 110, render: (value: number) => `${value.toFixed(2)} kg` },
              { title: '渠道', dataIndex: 'channelName', width: 160 },
              { title: '状态', dataIndex: 'status', width: 130, render: (value: string) => <Tag color={value.includes('出货') ? 'processing' : 'blue'}>{value}</Tag> }
            ]}
            dataSource={warehouseHandoverRows}
            size="small"
            pagination={tenRowTablePagination}
            scroll={{ x: 1080 }}
            locale={{ emptyText: '暂无交接单数据，请先完成渠道排货或合票出货。' }}
          />
        </Space>
      </Card>
      ) : null}
      </ModuleSubWorkspace>

      <Modal
        title="合票包裹明细"
        open={Boolean(selectedConsolidation)}
        onCancel={() => setSelectedConsolidationId(null)}
        footer={null}
        width={1100}
      >
        {selectedConsolidation ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`${selectedConsolidation.outboundOrderNo}：${selectedConsolidation.totalPackages} 个原始包裹，计费重 ${selectedConsolidation.totalChargeableWeightKg.toFixed(2)} kg`}
            />
            <Table<WarehouseInboundPackage>
              rowKey="id"
              columns={warehousePackageColumns}
              dataSource={selectedConsolidationPackages}
              size="small"
              pagination={tenRowTablePagination}
              scroll={{ x: 1280 }}
            />
          </Space>
        ) : null}
      </Modal>
    </>
  );
}

function TrackingTaskPage({
  shipments,
  tasks,
  notice,
  onRunTask,
  onRetryTask
}: {
  shipments: Shipment[];
  tasks: CarrierTaskSummary[];
  notice: string | null;
  onRunTask: (task: CarrierTaskSummary) => Promise<void>;
  onRetryTask: (task: CarrierTaskSummary) => Promise<void>;
}) {
  const config = modulePageConfigs.tracking!;
  const staleCount = shipments.filter((shipment) => shipment.trackingStaleDays >= 5).length;
  const [activeTrackingSection, setActiveTrackingSection] = useState('tasks');
  const trackingSubItems: ModuleSubNavItem[] = [
    { key: 'tasks', label: '承运商任务', description: '轨迹同步任务' },
    { key: 'latest', label: '最新轨迹', description: '运单轨迹概览' }
  ];
  const taskColumns: ColumnsType<CarrierTaskSummary> = [
    { title: '系统单号', dataIndex: 'systemOrderNo' },
    { title: '客户', dataIndex: 'customerName' },
    { title: '承运商', dataIndex: 'carrier', width: 90 },
    { title: '转单号', dataIndex: 'transferNo' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: CarrierTaskSummary['status']) => (
        <Tag color={status === 'SUCCESS' ? 'green' : status === 'FAILED' ? 'red' : 'gold'}>
          {status === 'SUCCESS' ? '成功' : status === 'FAILED' ? '失败' : '待执行'}
        </Tag>
      )
    },
    { title: '尝试次数', dataIndex: 'attempts', width: 90 },
    { title: '错误信息', dataIndex: 'lastError', render: (value?: string) => value ?? '-' },
    {
      title: '操作',
      width: 160,
      render: (_, task) => (
        <Space>
          {task.status === 'PENDING' ? (
            <Button size="small" onClick={() => void onRunTask(task)}>
              同步轨迹
            </Button>
          ) : null}
          {task.status === 'FAILED' ? (
            <Button size="small" onClick={() => void onRetryTask(task)}>
              重试
            </Button>
          ) : null}
        </Space>
      )
    }
  ];

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>{config.title}</Title>
          <Text type="secondary">{config.description}</Text>
        </div>
        <Button type="primary" icon={<Activity size={16} />}>承运商任务</Button>
      </Flex>

      {notice ? <Alert className="notice-bar" type={notice.includes('失败') ? 'warning' : 'success'} showIcon message={notice} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard icon={<Activity />} title="承运商任务" value={tasks.length} extra="手动同步轨迹" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Truck />} title="未更新" value={staleCount} extra="超过 5 天无新轨迹" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Sparkles />} title="硅基流动" value="AI" extra="轨迹超时解释" />
        </Col>
      </Row>

      <ModuleSubWorkspace items={trackingSubItems} activeKey={activeTrackingSection} onChange={setActiveTrackingSection}>
      {activeTrackingSection === 'tasks' ? (
      <Card title="承运商任务">
        <Table rowKey="id" size="small" pagination={tenRowTablePagination} columns={taskColumns} dataSource={tasks} />
      </Card>
      ) : null}

      {activeTrackingSection === 'latest' ? (
      <Card className="module-card" title="最新轨迹">
        <Space direction="vertical" className="ai-list">
          {shipments.map((shipment) => (
            <Alert key={shipment.id} type={shipment.trackingStaleDays >= 5 ? 'warning' : 'info'} showIcon message={shipment.latestTracking} description={shipment.systemOrderNo} />
          ))}
        </Space>
      </Card>
      ) : null}
      </ModuleSubWorkspace>
    </>
  );
}

function GenericModulePage({
  config,
  fulfillmentStageSummary,
  fulfillmentShipments,
  fulfillmentColumns,
  selectedFulfillmentStage,
  onSelectFulfillmentStage,
  onOpenBulkTrackingImport,
  notice,
  onAiAssist,
  aiLoading
}: {
  config?: ModulePageConfig;
  fulfillmentStageSummary?: ReturnType<typeof summarizeFulfillmentStages>;
  fulfillmentShipments?: Shipment[];
  fulfillmentColumns?: ColumnsType<Shipment>;
  selectedFulfillmentStage?: FulfillmentStageKey;
  onSelectFulfillmentStage?: (stage: FulfillmentStageKey) => void;
  onOpenBulkTrackingImport?: () => void;
  notice?: string | null;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const genericSubItems = useMemo<ModuleSubNavItem[]>(() => {
    if (!config) {
      return [];
    }
    return [
      ...(fulfillmentStageSummary ? [{ key: 'fulfillment', label: '履约阶段看板', description: '同步履约数据' }] : []),
      { key: 'records', label: '模拟业务数据', description: '业务对象列表' },
      { key: 'queue', label: '模块待办', description: '待处理事项' },
      { key: 'ai', label: 'AI 赋能', description: '建议与风险' },
      { key: 'actions', label: '快捷动作', description: '常用操作' }
    ];
  }, [config, fulfillmentStageSummary]);
  const [activeGenericSection, setActiveGenericSection] = useState(() => genericSubItems[0]?.key ?? 'records');

  useEffect(() => {
    if (genericSubItems.length && !genericSubItems.some((item) => item.key === activeGenericSection)) {
      setActiveGenericSection(genericSubItems[0].key);
    }
  }, [activeGenericSection, genericSubItems]);

  if (!config) {
    return null;
  }

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>{config.title}</Title>
          <Text type="secondary">{config.description}</Text>
          <div>
            <Tag color="blue">硅基流动</Tag>
          </div>
        </div>
        <Space>
          <Button icon={<FileInput size={16} />}>导入</Button>
          <Button icon={<ClipboardCheck size={16} />}>导出</Button>
          <Button
            type="primary"
            icon={<Sparkles size={16} />}
            loading={aiLoading}
            onClick={() =>
              onAiAssist({
                module: config.title,
                task: 'AI 辅助处理',
                prompt: `请围绕${config.title}的核心能力，输出当前优先处理事项、风险说明和可发给客户或内部同事的沟通建议。`,
                context: {
                  stats: config.stats,
                  records: config.records,
                  queue: config.queue,
                  scenarios: config.siliconFlowScenarios
                }
              })
            }
          >
            AI 辅助处理
          </Button>
        </Space>
      </Flex>

      {notice ? <Alert className="notice-bar" type={notice.includes('不允许') ? 'error' : 'success'} showIcon message={notice} /> : null}

      <Row gutter={[16, 16]}>
        {config.stats.map((stat) => (
          <Col xs={24} md={8} key={stat.label}>
            <MetricCard icon={<Activity />} title={stat.label} value={stat.value} extra={stat.helper} />
          </Col>
        ))}
      </Row>

      <ModuleSubWorkspace items={genericSubItems} activeKey={activeGenericSection} onChange={setActiveGenericSection}>
      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24}>
          {activeGenericSection === 'fulfillment' && fulfillmentStageSummary ? (
            <Card
              className="module-grid"
              title={
                <Flex align="center" gap={8}>
                  <Boxes size={18} />
                  <span>履约阶段看板</span>
                </Flex>
              }
              extra={<Text type="secondary">同一批履约数据，渠道排货侧可同步查看</Text>}
            >
              <Space wrap>
                {routingFulfillmentStages.map((stage) => (
                  <Button
                    key={stage.key}
                    type={stage.key === (selectedFulfillmentStage ?? 'all') ? 'primary' : 'default'}
                    onClick={() => onSelectFulfillmentStage?.(stage.key)}
                  >
                    {stage.label} {getFulfillmentStageCount(fulfillmentStageSummary, stage.key)}
                  </Button>
                ))}
                {onOpenBulkTrackingImport ? (
                  <Button onClick={onOpenBulkTrackingImport}>
                    批量添加轨迹
                  </Button>
                ) : null}
              </Space>
              {fulfillmentShipments && fulfillmentColumns ? (
                <Table
                  className="fulfillment-table"
                  rowKey="id"
                  size="small"
                  columns={fulfillmentColumns}
                  dataSource={fulfillmentShipments}
                  pagination={tenRowTablePagination}
                  scroll={{ x: 1720 }}
                />
              ) : null}
            </Card>
          ) : null}

          {activeGenericSection === 'records' ? (
          <Card className="module-grid" title="模拟业务数据">
            <Table
              rowKey="primary"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={config.records}
              columns={[
                {
                  title: '业务对象',
                  dataIndex: 'primary',
                  render: (value: string, record) => (
                    <Space direction="vertical" size={0}>
                      <Text strong>{value}</Text>
                      <Text type="secondary">{record.secondary}</Text>
                    </Space>
                  )
                },
                { title: '关键指标', dataIndex: 'metric', width: 180 },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 130,
                  render: (value: string) => <Tag color={value.includes('风险') || value.includes('超时') ? 'red' : 'blue'}>{value}</Tag>
                },
                {
                  title: '操作',
                  width: 180,
                  render: () => (
                    <Space>
                      <Button size="small">查看</Button>
                      <Button size="small">模拟处理</Button>
                    </Space>
                  )
                }
              ]}
            />
          </Card>
          ) : null}

          {activeGenericSection === 'queue' ? (
          <Card className="module-grid" title="模块待办">
            <Table
              rowKey="item"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={config.queue}
              columns={[
                { title: '事项', dataIndex: 'item' },
                { title: '负责人', dataIndex: 'owner', width: 120 },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 140,
                  render: (value: string) => <Tag color="blue">{value}</Tag>
                },
                {
                  title: '操作',
                  width: 180,
                  render: () => (
                    <Space>
                      <Button size="small">查看</Button>
                      <Button size="small">处理</Button>
                    </Space>
                  )
                }
              ]}
            />
          </Card>
          ) : null}
        </Col>

        <Col xs={24}>
          {activeGenericSection === 'ai' ? (
          <Card
            title={
              <Flex align="center" gap={8}>
                <Bot size={18} />
                <span>AI 赋能</span>
              </Flex>
            }
          >
            <Space direction="vertical" size={12} className="quality-panel">
              <Tag color="blue">硅基流动</Tag>
              {config.aiEnhancements.map((item) => (
                <Alert key={item} type="info" showIcon message={item} />
              ))}
              {config.siliconFlowScenarios.map((item) => (
                <Alert key={item} type="success" showIcon message={`硅基流动场景：${item}`} />
              ))}
              <Alert type="warning" showIcon message="API Key 仅由后端环境变量读取，前端不保存密钥" />
            </Space>
          </Card>
          ) : null}

          {activeGenericSection === 'actions' ? (
          <Card className="automation-card" title="快捷动作">
            <Space wrap>
              <Button>批量修改</Button>
              <Button>生成说明</Button>
              <Button>同步客户</Button>
              <Button>写入审计</Button>
            </Space>
          </Card>
          ) : null}
        </Col>
      </Row>
      </ModuleSubWorkspace>
    </>
  );
}

function MetricCard(props: { icon: ReactNode; title: string; value: string | number; extra: ReactNode }) {
  return (
    <Card className="metric-card">
      <Flex justify="space-between" align="start">
        <Statistic title={props.title} value={props.value} />
        <div className="metric-icon">{props.icon}</div>
      </Flex>
      <div className="metric-extra">{props.extra}</div>
    </Card>
  );
}

function WarehouseInternalLabelCard({ label }: { label: WarehouseOutboundLabel }) {
  return (
    <div className="warehouse-internal-label" aria-label={`内部交货面单 ${label.labelNo} ${label.pieceIndex}/${label.totalPackages}`}>
      <Text className="warehouse-label-title" type="secondary">内部交货面单</Text>
      <div className="warehouse-label-barcode" aria-label={`条形码 ${label.labelNo}`}>
        {createWarehouseBarcodeBars(label.labelNo).map((width, index) => (
          <span key={`${label.labelNo}-${index}`} style={{ width }} />
        ))}
      </div>
      <Text className="warehouse-label-no">{label.labelNo}</Text>
      <Text className="warehouse-label-piece">{label.pieceIndex}/{label.totalPackages}</Text>
      <Text className="warehouse-label-country">{label.destinationCountry}</Text>
      <Text className="warehouse-label-order" type="secondary">{label.outboundOrderNo}</Text>
    </div>
  );
}

function ModuleSubWorkspace({
  items,
  activeKey,
  onChange,
  children
}: {
  items: ModuleSubNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  children: ReactNode;
}) {
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];

  if (!activeItem) {
    return <>{children}</>;
  }

  return (
    <div className="module-sub-workspace">
      <aside className="module-sub-nav" aria-label="二级功能">
        {items.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`module-sub-nav-item${item.key === activeItem.key ? ' is-active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span>{item.label}</span>
            {item.description ? <small>{item.description}</small> : null}
          </button>
        ))}
      </aside>
      <section className="module-sub-content" aria-label={activeItem.label}>
        {children}
      </section>
    </div>
  );
}

function StatusTag({ status }: { status: ShipmentStatus }) {
  const colorMap: Partial<Record<ShipmentStatus, string>> = {
    WAITING_SORT: 'blue',
    WAITING_DISPATCH: 'cyan',
    WAITING_ONLINE: 'orange',
    WAITING_RETURN: 'volcano',
    PROBLEM: 'red',
    STUCK: 'magenta',
    SIGNED: 'green'
  };

  return <Tag color={colorMap[status] ?? 'default'}>{shipmentStatusLabels[status]}</Tag>;
}

function RoutingStatusTag({ status }: { status: ShipmentStatus }) {
  if (status === 'WAITING_DISPATCH') {
    return <Tag color="cyan">已排货</Tag>;
  }

  return <StatusTag status={status} />;
}

function riskWeight(risk: string) {
  return risk === 'high' ? 3 : risk === 'medium' ? 2 : 1;
}

function riskLabel(risk: string) {
  return risk === 'high' ? '高风险' : risk === 'medium' ? '需关注' : '正常';
}

function formatCurrency(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

function formatKgRate(amount: number) {
  return (Math.round(amount * 100) / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatKgCurrencyRate(amount: number) {
  return `¥${formatKgRate(amount)}`;
}

function getRoleDisplayName(role: RoleKey) {
  const labels: Record<RoleKey, string> = {
    ADMIN: '系统管理员',
    CUSTOMER_SERVICE: '客服',
    OPERATOR: '业务员',
    WAREHOUSE: '仓库',
    FINANCE: '财务',
    CUSTOMER: '客户'
  };
  return labels[role];
}

function getVisibleStaffMenuKeysByPermissions(permissions: PermissionKey[], role: RoleKey): StaffMenuKey[] {
  if (role === 'ADMIN') {
    return menuItems.map((item) => item.key);
  }
  const permissionSet = new Set(permissions);
  const canAny = (...keys: PermissionKey[]) => keys.some((key) => permissionSet.has(key));
  const rules: Array<[StaffMenuKey, boolean]> = [
    ['workspace', permissionSet.has('workspace:access')],
    ['orders', canAny('orders:read', 'orders:write')],
    ['routing', canAny('routing:read', 'routing:write')],
    ['receive', canAny('warehouse:read', 'warehouse:write')],
    ['tracking', canAny('tracking:read', 'tracking:write')],
    ['problems', canAny('problems:read', 'problems:write')],
    ['pricing', canAny('pricing:lookup', 'pricing:manage')],
    ['finance', canAny('finance:read', 'finance:settle')],
    ['reports', permissionSet.has('reports:read')],
    ['master', canAny('master-data:read', 'master-data:write')],
    ['settings', permissionSet.has('system:manage')]
  ];
  return rules.filter(([, visible]) => visible).map(([key]) => key);
}

function formatUsd(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatBeijingDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => part.toString().padStart(2, '0');

  return [
    `${beijingTime.getUTCFullYear()}-${pad(beijingTime.getUTCMonth() + 1)}-${pad(beijingTime.getUTCDate())}`,
    `${pad(beijingTime.getUTCHours())}:${pad(beijingTime.getUTCMinutes())}:${pad(beijingTime.getUTCSeconds())}`
  ].join(' ');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function downloadHtmlFile(html: string, fileName: string, mimeType: string) {
  const blob = new globalThis.Blob([html], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatPaymentSummary(usd?: number, cny?: number) {
  const usdText = usd === undefined ? 'USD 未知' : formatUsd(usd);
  const cnyText = cny === undefined ? 'CNY 未知' : formatCurrency(cny);
  return `${usdText} / ${cnyText}`;
}

function createWarehouseInternalLabelNo(source: string) {
  const hash = Array.from(source).reduce((total, char, index) => total + char.charCodeAt(0) * (index + 17), 0);
  return `A${(hash % 1_000_000).toString().padStart(6, '0')}`;
}

function createWarehouseBarcodeBars(labelNo: string) {
  const seed = Array.from(labelNo).reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);
  return Array.from({ length: 30 }, (_, index) => 2 + ((seed + index * 7 + labelNo.charCodeAt(index % labelNo.length)) % 5));
}

const fulfillmentActionLabels: Record<FulfillmentAction, string> = {
  'confirm-declare': '审核通过',
  'reject-declare': '审核不通过',
  'confirm-receive': '确认收货',
  'assign-route': '分配渠道',
  'confirm-dispatch': '确认发货',
  'fill-transfer-no': '填写转单号',
  'add-tracking': '添加轨迹',
  'mark-return': '标记退货',
  'create-problem': '创建问题件'
};

function resolveFulfillmentAction(record: Shipment, action: FulfillmentAction): {
  ok: boolean;
  message: string;
  patch?: Partial<Shipment>;
} {
  if (!getAvailableFulfillmentActions({ status: record.status, hasTransferNo: Boolean(record.transferNo) }).includes(action)) {
    return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
  }

  if (action === 'confirm-receive') {
    if (!canTransitionShipment(record.status, 'WAITING_SORT')) {
      return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
    }
    return {
      ok: true,
      message: '已确认收货，进入待排货',
      patch: { status: 'WAITING_SORT', latestTracking: '收货扫描', trackingStaleDays: 0 }
    };
  }

  if (action === 'confirm-declare') {
    if (!canTransitionShipment(record.status, 'DECLARED')) {
      return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
    }
    return {
      ok: true,
      message: '已审核通过，进入已入库队列',
      patch: { status: 'WAITING_RECEIVE', latestTracking: '审核通过，等待仓库入库确认', trackingStaleDays: 0 }
    };
  }

  if (action === 'reject-declare') {
    if (!canTransitionShipment(record.status, 'CANCELLED')) {
      return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
    }
    return {
      ok: true,
      message: '已审核不通过，等待业务员修改资料',
      patch: { status: 'CANCELLED', latestTracking: '审核不通过，资料需修改后重新提交', trackingStaleDays: 0 }
    };
  }

  if (action === 'assign-route') {
    return {
      ok: true,
      message: '已分配渠道，进入仓库管理的面单队列&待仓库出货',
      patch: { status: 'WAITING_DISPATCH', channelName: record.channelName || 'AI 推荐渠道' }
    };
  }

  if (action === 'confirm-dispatch') {
    return {
      ok: true,
      message: '已确认发货，进入待上网',
      patch: { status: 'WAITING_ONLINE', latestTracking: '已发货', dispatchedAt: demoOperationalNow }
    };
  }

  if (action === 'fill-transfer-no') {
    return {
      ok: true,
      message: '已填写转单号',
      patch: { transferNo: `${record.carrier}${record.systemOrderNo.slice(-6)}` }
    };
  }

  if (action === 'add-tracking') {
    return {
      ok: true,
      message: '已添加轨迹',
      patch: { latestTracking: '人工新增轨迹', trackingStaleDays: 0 }
    };
  }

  if (action === 'mark-return') {
    return {
      ok: true,
      message: '已标记退货',
      patch: { status: 'WAITING_RETURN', latestTracking: '已标记退货' }
    };
  }

  if (action === 'create-problem') {
    return {
      ok: true,
      message: '已创建问题件',
      patch: { status: 'PROBLEM', hasProblemTicket: true, latestTracking: '新建问题件' }
    };
  }

  return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
}

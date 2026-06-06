import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  Flex,
  Input,
  Layout,
  Menu,
  Progress,
  Row,
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
  PackageCheck,
  PackagePlus,
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
  canAccessStaffMenu,
  canTransitionShipment,
  createAutomationPlan,
  createFulfillmentAdvice,
  createShipmentInsights,
  getAvailableFulfillmentActions,
  getVisibleStaffMenuKeys,
  getModuleCoverageSummary,
  productModules,
  shipmentStatusLabels,
  summarizeFulfillmentStages,
  summarizeMasterDataSnapshot,
  summarizeStatusCounts,
  validateShipmentImportRows,
  type AccountLedgerSummary,
  type BusinessType,
  type CarrierTaskSummary,
  type CustomerAccountSummary,
  type CustomerStatementSummary,
  type FulfillmentAction,
  type MasterDataSnapshot,
  type PricingRuleQuoteResponse,
  type PricingRuleSummary,
  type ReceivableFeeSummary,
  type Shipment,
  type ShipmentLabelSummary,
  type StaffMenuKey,
  type ShipmentStatus
} from '@siyuan/shared';
import { ApiClient, type AiAssistResponse, type PermissionKey, type Principal, type RoleKey, type RolePermissionMatrix, type RolePermissionRow, type Session } from './apiClient';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface AiResult {
  title: string;
  response: AiAssistResponse;
}

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
  'DECLARED',
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

const menuItems: Array<{ key: StaffMenuKey; icon: ReactNode; label: string }> = [
  { key: 'workspace', icon: <Gauge size={16} />, label: '运营工作台' },
  { key: 'orders', icon: <Boxes size={16} />, label: '运单履约' },
  { key: 'receive', icon: <PackagePlus size={16} />, label: '收货打单' },
  { key: 'routing', icon: <Route size={16} />, label: '渠道排货' },
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
type FulfillmentStageKey = 'all' | 'declared' | 'receiving' | 'sorting' | 'dispatching' | 'online' | 'signing' | 'exception';

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

const fulfillmentStages: Array<{ key: FulfillmentStageKey; label: string; statuses: ShipmentStatus[] }> = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'declared', label: '已预报', statuses: ['DECLARED'] },
  { key: 'receiving', label: '待收货', statuses: ['WAITING_RECEIVE'] },
  { key: 'sorting', label: '待排货', statuses: ['WAITING_SORT'] },
  { key: 'dispatching', label: '待发货', statuses: ['WAITING_DISPATCH'] },
  { key: 'online', label: '待上网', statuses: ['WAITING_ONLINE'] },
  { key: 'signing', label: '待签收', statuses: ['WAITING_SIGNED'] },
  { key: 'exception', label: '退货/滞留', statuses: ['WAITING_RETURN', 'PROBLEM', 'STUCK'] }
];

interface ModulePageConfig {
  title: string;
  description: string;
  capabilities: string[];
  childFunctions: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
  queue: Array<{ item: string; owner: string; status: string }>;
  stats: Array<{ label: string; value: string; helper: string }>;
  records: Array<{ primary: string; secondary: string; metric: string; status: string }>;
}

const modulePageConfigs: Partial<Record<MenuKey, ModulePageConfig>> = {
  receive: {
    title: '收货打单中心',
    description: '覆盖收货扫描、重量复核、包裹明细和面单生成，适合作为仓库作业入口。',
    capabilities: ['收货扫描', '面单生成', '重量复核', '包裹明细', '异常入库'],
    childFunctions: ['扫描收货', '批量收货', '打单录入', '重量复核', '包裹明细', '面单预览', '异常入库', '重复扫描提醒'],
    aiEnhancements: ['重量异常识别', '面单信息补全', '重复扫描提醒'],
    siliconFlowScenarios: ['识别预报重量与实重差异', '根据品名补全面单申报要素', '生成异常入库内部说明'],
    stats: [
      { label: '待收货', value: '18', helper: '今日仓库扫描队列' },
      { label: '待打单', value: '9', helper: '已复重未出面单' },
      { label: '重量异常', value: '3', helper: '实重与预报差异超 15%' }
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
    childFunctions: ['规则排货', '手动排货', '批量排货', '代理分配', '承运商选择', '获取转单号', '填写转单号', '排货日志'],
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
    childFunctions: ['轨迹列表', '手工添加轨迹', '客户可见轨迹', '未上网监控', '未更新队列', '标记上网', '标记签收', '生成客户说明'],
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
    childFunctions: ['新建问题', '回复/查看', '客户回复模拟', '关闭问题', '上传附件', '客户可见状态', '关联运单', 'SLA 跟进'],
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
    description: '支持客户报价、代理成本价、分区、燃油、附加费和价格试算。',
    capabilities: ['客户报价', '代理成本价', '分区', '燃油', '附加费', '价格试算'],
    childFunctions: ['客户报价', '代理成本价', '渠道报价', '国家分区', '重量段规则', '燃油附加费', '偏远附加费', '价格试算'],
    aiEnhancements: ['自然语言查价', '报价差异解释', '推荐最优渠道'],
    siliconFlowScenarios: ['自然语言查价转结构化试算', '解释客户价与代理成本差异', '按利润和时效推荐报价'],
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
    childFunctions: ['应收费用', '应付费用', '客户对账', '代理对账', '生成对账单', '收款登记', '付款登记', '核销', '余额流水'],
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
    childFunctions: ['运单报表', '收货统计', '发货统计', '应收应付分析', '利润分析', '客户报表', '代理报表', '日报生成'],
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
    childFunctions: ['客户创建', '客户端账号创建', '创建客户联系人', '代理创建', '代理账号创建', '电子词典-费用名称', '触发器', '汇率'],
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
    childFunctions: ['新建员工', '修改员工角色', '员工账号重置密码', '角色权限分配', '分配客户端角色权限', '模板权限设置', '轨迹规则', '状态字典'],
    aiEnhancements: ['配置健康检查', '规则冲突提示', '权限风险提示'],
    siliconFlowScenarios: ['检查权限冲突', '解释角色权限差异', '生成系统配置变更说明'],
    stats: [
      { label: '角色', value: '5', helper: '管理员/客服/操作/财务/客户' },
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2458d3',
          borderRadius: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
        }
      }}
    >
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2458d3',
          borderRadius: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
        }
      }}
    >
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
                  pagination={false}
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
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem('siyuan-session');
    return raw ? (JSON.parse(raw) as Session) : null;
  });
  const [activeMenuKey, setActiveMenuKey] = useState<MenuKey>('workspace');
  const businessType: BusinessType = 'DEDICATED_LINE';
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [selectedFulfillmentStage, setSelectedFulfillmentStage] = useState<FulfillmentStageKey>('all');
  const [keyword, setKeyword] = useState('');
  const [localShipments, setLocalShipments] = useState<Shipment[]>([]);
  const [problemTickets, setProblemTickets] = useState<Awaited<ReturnType<ApiClient['problemTickets']>>>([]);
  const [receivables, setReceivables] = useState<ReceivableFeeSummary[]>([]);
  const [customerStatements, setCustomerStatements] = useState<CustomerStatementSummary[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccountSummary[]>([]);
  const [accountLedger, setAccountLedger] = useState<AccountLedgerSummary[]>([]);
  const [masterData, setMasterData] = useState<MasterDataSnapshot>(emptyMasterData);
  const [shipmentLabels, setShipmentLabels] = useState<Record<string, ShipmentLabelSummary[]>>({});
  const [carrierTasks, setCarrierTasks] = useState<CarrierTaskSummary[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRuleSummary[]>([]);
  const [quoteResult, setQuoteResult] = useState<PricingRuleQuoteResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const businessWorkspaceConfig = businessWorkspaceConfigs.DEDICATED_LINE;
  const apiClient = useMemo(
    () => new ApiClient(() => session?.accessToken ?? null, handleUnauthorized),
    [session?.accessToken]
  );
  const visibleMenuKeys = useMemo(
    () => (session && session.user.role !== 'CUSTOMER' ? getVisibleStaffMenuKeys(session.user.role) : []),
    [session]
  );
  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => visibleMenuKeys.includes(item.key)),
    [visibleMenuKeys]
  );
  const currentMenuKey = useMemo<MenuKey>(
    () =>
      session && session.user.role !== 'CUSTOMER' && canAccessStaffMenu(session.user.role, activeMenuKey)
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
    if (!canAccessStaffMenu(session.user.role, activeMenuKey)) {
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
    setShipmentLabels({});
    setCarrierTasks([]);
    setPricingRules([]);
    setQuoteResult(null);
    setAiResult(null);
  }

  async function refreshWorkspace(client = apiClient, user = session?.user) {
    const [nextShipments, nextTickets, nextReceivables, nextStatements, nextAccounts, nextLedger] = await Promise.all([
      client.shipments(),
      client.problemTickets(),
      client.receivables(),
      client.customerStatements(),
      client.customerAccounts(),
      client.accountLedger()
    ]);
    setLocalShipments(nextShipments);
    setProblemTickets(nextTickets);
    setReceivables(nextReceivables);
    setCustomerStatements(nextStatements);
    setCustomerAccounts(nextAccounts);
    setAccountLedger(nextLedger);
    if (user?.role !== 'CUSTOMER') {
      const [nextTasks, nextMasterData, nextPricingRules] = await Promise.all([
        client.carrierTasks(),
        client.masterData(),
        client.pricingRules()
      ]);
      setCarrierTasks(nextTasks);
      setMasterData(nextMasterData);
      setPricingRules(nextPricingRules);
    } else {
      setCarrierTasks([]);
      setMasterData(emptyMasterData);
      setPricingRules([]);
    }
  }

  async function handleLogin(username: string, password: string) {
    const nextSession = await apiClient.login(username, password);
    localStorage.setItem('siyuan-session', JSON.stringify(nextSession));
    setSession(nextSession);
    setActiveMenuKey(getVisibleStaffMenuKeys(nextSession.user.role)[0] ?? 'workspace');
    const loginClient = new ApiClient(() => nextSession.accessToken, handleUnauthorized);
    await refreshWorkspace(loginClient, nextSession.user);
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
  const fulfillmentShipments = useMemo(() => {
    const activeStage = fulfillmentStages.find((stage) => stage.key === selectedFulfillmentStage);
    return businessShipments.filter(
      (shipment) => selectedFulfillmentStage === 'all' || activeStage?.statuses.includes(shipment.status)
    );
  }, [businessShipments, selectedFulfillmentStage]);
  const fulfillmentAdviceQueue = useMemo(
    () =>
      businessShipments
        .map((shipment) => ({ shipment, advice: createFulfillmentAdvice(shipment) }))
        .filter((item) => item.advice.priority !== 'normal')
        .slice(0, 5),
    [businessShipments]
  );

  const columns: ColumnsType<Shipment> = [
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 145,
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
          <Text copyable>{value}</Text>
          <Text type="secondary">{record.transferNo ?? '待获取转单号'}</Text>
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
      title: '渠道 / 代理',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.channelName}</Text>
          <Text type="secondary">{record.agentName}</Text>
        </Space>
      )
    }
  ];

  const fulfillmentColumns: ColumnsType<Shipment> = [
    ...columns,
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
          }).slice(0, 3);
            return (
              <>
                {actions.map((action) => (
                  <Button key={action} size="small" onClick={() => handleFulfillmentAction(record, action)}>
                    {fulfillmentActionLabels[action]}
                  </Button>
                ))}
                {!actions.includes('confirm-receive') ? (
                  <Button size="small" onClick={() => handleFulfillmentAction(record, 'confirm-receive')}>
                    确认收货
                  </Button>
                ) : null}
              </>
            );
          })()}
        </Space>
      )
    }
  ];

  async function handleFulfillmentAction(record: Shipment, action: FulfillmentAction) {
    const actionResult = resolveFulfillmentAction(record, action);

    if (!actionResult.ok) {
      setNotice(actionResult.message);
      return;
    }

    const updated =
      action === 'confirm-receive'
        ? await apiClient.receiveShipment(record.id)
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
    setNotice(actionResult.message);
  }

  async function handleReceiveShipment(record: Shipment) {
    const updated = await apiClient.receiveShipment(record.id);
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    setNotice('已确认收货，进入待排货');
  }

  async function handleRouteShipment(record: Shipment) {
    const updated = await apiClient.routeShipment(record.id, { channelId: 'ch-dhl-hk', agentId: 'a-yuhuan' });
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    setNotice('已排货，进入待发货');
  }

  async function handleCreateShipmentLabel(record: Shipment) {
    const response = await apiClient.createShipmentLabel(record.id);
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? response.shipment : shipment)));
    setShipmentLabels((current) => ({ ...current, [record.id]: [response.label, ...(current[record.id] ?? []).filter((label) => label.id !== response.label.id)] }));
    setNotice(`已生成模拟面单 ${response.label.transferNo}`);
  }

  async function handleLoadShipmentLabels(record: Shipment) {
    const labels = await apiClient.shipmentLabels(record.id);
    setShipmentLabels((current) => ({ ...current, [record.id]: labels }));
    setNotice(labels.length ? `已读取 ${labels.length} 张面单` : '暂无面单记录');
  }

  async function handleVoidShipmentLabel(record: Shipment, label: ShipmentLabelSummary) {
    const updatedLabel = await apiClient.voidShipmentLabel(record.id, label.id);
    setShipmentLabels((current) => ({
      ...current,
      [record.id]: (current[record.id] ?? []).map((item) => (item.id === updatedLabel.id ? updatedLabel : item))
    }));
    setLocalShipments((current) =>
      current.map((shipment) =>
        shipment.id === record.id && shipment.transferNo === updatedLabel.transferNo
          ? { ...shipment, transferNo: undefined, latestTracking: '面单已作废' }
          : shipment
      )
    );
    setNotice('面单已作废');
  }

  async function handleDispatchShipment(record: Shipment) {
    const updated = await apiClient.dispatchShipment(record.id, {});
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    setCarrierTasks(await apiClient.carrierTasks());
    setNotice('已确认发货，进入待上网');
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

  async function handleQuote() {
    const quote = await apiClient.quotePricingRule({
      channelId: 'ch-dhl-hk',
      destinationCountry: '美国',
      chargeableWeightKg: 4
    });
    setQuoteResult(quote);
  }

  async function handleCreatePricingRule() {
    const rule = await apiClient.createPricingRule({
      channelId: 'ch-dhl-hk',
      destinationCountry: '美国',
      minWeightKg: 5,
      maxWeightKg: 20,
      ratePerKg: 8,
      currency: 'USD'
    });
    setPricingRules((current) => [rule, ...current.filter((item) => item.id !== rule.id)]);
    setNotice(`已新建报价规则 ${rule.channelName} ${rule.minWeightKg}-${rule.maxWeightKg}kg`);
  }

  async function handleTogglePricingRule(rule: PricingRuleSummary) {
    const updated = await apiClient.updatePricingRuleEnabled(rule.id, { enabled: !rule.enabled });
    setPricingRules((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setNotice(`${updated.minWeightKg}-${updated.maxWeightKg}kg ${updated.enabled ? '已启用' : '已停用'}`);
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
    const customer = await apiClient.createCustomer({ code: '7777', name: 'M7-Test' });
    setMasterData((current) => ({ ...current, customers: [...current.customers.filter((item) => item.id !== customer.id), customer] }));
    setNotice('基础资料客户已创建');
  }

  async function handleCreateMasterContact() {
    const customerId = masterData.customers.find((customer) => customer.code === '7777')?.id ?? masterData.customers[0]?.id;
    if (!customerId) {
      return;
    }
    const contact = await apiClient.createCustomerContact(customerId, { name: 'M7 Contact', phone: '13900000007', email: 'm7@example.com' });
    setMasterData((current) => ({ ...current, contacts: [...current.contacts.filter((item) => item.id !== contact.id), contact] }));
    setNotice('客户联系人已创建');
  }

  async function handleCreateMasterCustomerUser() {
    const customerId = masterData.customers.find((customer) => customer.code === '7777')?.id ?? masterData.customers[0]?.id;
    if (!customerId) {
      return;
    }
    const customerUser = await apiClient.createCustomerUser(customerId, { username: 'm7customer', password: 'm7pass123' });
    setMasterData((current) => ({ ...current, customerUsers: [...current.customerUsers.filter((item) => item.id !== customerUser.id), customerUser] }));
    setNotice('客户门户账号已创建');
  }

  async function handleCreateMasterCarrier() {
    const carrier = await apiClient.createCarrier({ name: 'M7 Carrier' });
    setMasterData((current) => ({ ...current, carriers: [...current.carriers.filter((item) => item.id !== carrier.id), carrier] }));
    setNotice('承运商已创建');
  }

  async function handleCreateMasterChannel() {
    const carrierId = masterData.carriers.find((carrier) => carrier.name === 'M7 Carrier')?.id ?? masterData.carriers[0]?.id;
    if (!carrierId) {
      return;
    }
    const channel = await apiClient.createChannel({ name: 'M7 Channel', carrierId });
    setMasterData((current) => ({ ...current, channels: [...current.channels.filter((item) => item.id !== channel.id), channel] }));
    setNotice('渠道已创建');
  }

  async function handleCreateMasterAgent() {
    const agent = await apiClient.createAgent({ name: 'M7 Agent' });
    setMasterData((current) => ({ ...current, agents: [...current.agents.filter((item) => item.id !== agent.id), agent] }));
    setNotice('代理已创建');
  }

  async function handleCreateMasterSurcharge() {
    const surcharge = await apiClient.createSurcharge({ name: 'M7 附加费', amount: 88 });
    setMasterData((current) => ({ ...current, surcharges: [...current.surcharges.filter((item) => item.id !== surcharge.id), surcharge] }));
    setNotice('附加费已创建');
  }

  async function handleCreateMasterFuelRate() {
    const channelId = masterData.channels.find((channel) => channel.name === 'M7 Channel')?.id ?? masterData.channels[0]?.id;
    if (!channelId) {
      return;
    }
    const fuelRate = await apiClient.createFuelRate({ channelId, rate: 0.18, activeAt: '2026-06-06T00:00:00.000Z' });
    setMasterData((current) => ({ ...current, fuelRates: [...current.fuelRates.filter((item) => item.id !== fuelRate.id), fuelRate] }));
    setNotice('燃油费率已创建');
  }

  async function handleCreateMasterExchangeRate() {
    const exchangeRate = await apiClient.createExchangeRate({ baseCurrency: 'EUR', quoteCurrency: 'CNY', rate: 7.8, activeAt: '2026-06-06T00:00:00.000Z' });
    setMasterData((current) => ({ ...current, exchangeRates: [...current.exchangeRates.filter((item) => item.id !== exchangeRate.id), exchangeRate] }));
    setNotice('汇率已创建');
  }

  async function handleToggleMasterChannel(channelId: string, enabled: boolean) {
    const channel = await apiClient.updateChannelEnabled(channelId, { enabled });
    setMasterData((current) => ({ ...current, channels: current.channels.map((item) => (item.id === channel.id ? channel : item)) }));
    setNotice(`${channel.name} 已${channel.enabled ? '启用' : '停用'}`);
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
          setLocalShipments((current) => [created, ...current]);
        }}
      />
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2458d3',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
        }
      }}
    >
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
              placeholder="搜索客户、单号、转单号、国家、渠道"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              allowClear
            />
            <Space>
              <Text type="secondary">{session.user.username}</Text>
              <Button icon={<ShieldCheck size={16} />}>权限视图</Button>
              <Button onClick={handleUnauthorized}>退出</Button>
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
                    <Text type="secondary">围绕预报、收货、排货、发货、转单号和异常处理的前端闭环工作台。</Text>
                  </div>
                  <Space>
                    <Button icon={<FileInput size={16} />}>导入履约运单</Button>
                    <Button icon={<PackagePlus size={16} />}>新建预报</Button>
                    <Button
                      type="primary"
                      icon={<Sparkles size={16} />}
                      loading={aiLoading}
                      onClick={() =>
                        handleAiAssist({
                          module: '运单履约',
                          task: '批量履约处理建议',
                          prompt: '请根据待预报、待收货、待排货、待发货、待上网和异常件，输出批量处理顺序、风险提醒和客户沟通话术。',
                          context: { fulfillmentStageSummary, samples: businessShipments.slice(0, 5) }
                        })
                      }
                    >
                      AI 批量处理
                    </Button>
                  </Space>
                </Flex>

                {notice ? <Alert className="notice-bar" type={notice.includes('不允许') ? 'error' : 'success'} showIcon message={notice} /> : null}

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8} xl={4}>
                    <MetricCard icon={<FileText />} title="待预报" value={fulfillmentStageSummary.declared} extra="客户资料待确认" />
                  </Col>
                  <Col xs={24} md={8} xl={4}>
                    <MetricCard icon={<PackagePlus />} title="待收货" value={fulfillmentStageSummary.receiving} extra="仓库扫描入口" />
                  </Col>
                  <Col xs={24} md={8} xl={4}>
                    <MetricCard icon={<Route />} title="待排货" value={fulfillmentStageSummary.sorting} extra="渠道/代理分配" />
                  </Col>
                  <Col xs={24} md={8} xl={4}>
                    <MetricCard icon={<Send />} title="待发货" value={fulfillmentStageSummary.dispatching} extra="出库确认" />
                  </Col>
                  <Col xs={24} md={8} xl={4}>
                    <MetricCard icon={<Activity />} title="待上网" value={fulfillmentStageSummary.online} extra="轨迹跟进" />
                  </Col>
                  <Col xs={24} md={8} xl={4}>
                    <MetricCard icon={<TicketCheck />} title="异常件" value={fulfillmentStageSummary.exception} extra="问题/退货/滞留" />
                  </Col>
                </Row>

                <Row gutter={[16, 16]} className="main-grid">
                  <Col xs={24} xl={17}>
                    <Card
                      title={
                        <Flex align="center" gap={8}>
                          <Boxes size={18} />
                          <span>履约阶段看板</span>
                        </Flex>
                      }
                      extra={<Text type="secondary">所有动作仅更新本地 mock 状态，不触发真实发货</Text>}
                    >
                      <div className="status-strip">
                        {fulfillmentStages.map((stage) => {
                          const count =
                            stage.key === 'all'
                              ? businessShipments.length
                              : fulfillmentStageSummary[stage.key as keyof typeof fulfillmentStageSummary];
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

                      <div className="batch-bar">
                        <Space wrap>
                          <Button size="small" onClick={() => setNotice('已模拟批量排货，进入待发货队列')}>批量排货</Button>
                          <Button size="small" onClick={() => setNotice('已模拟批量获取转单号')}>批量获取转单号</Button>
                          <Button size="small" onClick={() => setNotice('已模拟批量添加轨迹')}>批量添加轨迹</Button>
                          <Button size="small" onClick={() => setNotice('已模拟批量标记异常')}>批量标记异常</Button>
                        </Space>
                      </div>

                      <Table
                        rowKey="id"
                        columns={fulfillmentColumns}
                        dataSource={fulfillmentShipments}
                        size="small"
                        pagination={{ pageSize: 8 }}
                        scroll={{ x: 1600 }}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} xl={7}>
                    <Card
                      title={
                        <Flex align="center" gap={8}>
                          <Bot size={18} />
                          <span>AI 履约助手</span>
                        </Flex>
                      }
                    >
                      <Space direction="vertical" size={12} className="ai-list">
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
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </>
            ) : currentMenuKey === 'settings' ? (
              <SystemSettingsPage apiClient={apiClient} onAiAssist={handleAiAssist} aiLoading={aiLoading} />
            ) : currentMenuKey === 'master' ? (
              <MasterDataPage
                masterData={masterData}
                notice={notice}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
                onCreateCustomer={handleCreateMasterCustomer}
                onCreateContact={handleCreateMasterContact}
                onCreateCustomerUser={handleCreateMasterCustomerUser}
                onCreateAgent={handleCreateMasterAgent}
                onCreateCarrier={handleCreateMasterCarrier}
                onCreateChannel={handleCreateMasterChannel}
                onCreateSurcharge={handleCreateMasterSurcharge}
                onCreateFuelRate={handleCreateMasterFuelRate}
                onCreateExchangeRate={handleCreateMasterExchangeRate}
                onToggleChannel={handleToggleMasterChannel}
              />
            ) : currentMenuKey === 'pricing' ? (
              <PricingPage
                quoteResult={quoteResult}
                pricingRules={pricingRules}
                notice={notice}
                onQuote={handleQuote}
                onCreatePricingRule={handleCreatePricingRule}
                onTogglePricingRule={handleTogglePricingRule}
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
                shipments={businessShipments}
                labelsByShipmentId={shipmentLabels}
                notice={notice}
                onReceive={handleReceiveShipment}
                onRoute={handleRouteShipment}
                onCreateLabel={handleCreateShipmentLabel}
                onLoadLabels={handleLoadShipmentLabels}
                onVoidLabel={handleVoidShipmentLabel}
                onDispatch={handleDispatchShipment}
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
              <GenericModulePage config={modulePageConfigs[currentMenuKey]} onAiAssist={handleAiAssist} aiLoading={aiLoading} />
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

            <Row gutter={[16, 16]} className="main-grid">
              <Col xs={24} xl={17}>
                <Card
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
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 1320 }}
                  />
                </Card>
              </Col>
              <Col xs={24} xl={7}>
                <Card
                  title={
                    <Flex align="center" gap={8}>
                      <Bot size={18} />
                      <span>AI 优先处理队列</span>
                    </Flex>
                  }
                >
                  <Space direction="vertical" size={12} className="ai-list">
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
                        <Alert
                          type={insight.riskLevel === 'high' ? 'error' : 'warning'}
                          showIcon
                          message={insight.suggestedActions[0]}
                        />
                      </Card>
                    ))}
                  </Space>
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
                      block
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

                <Card className="automation-card" title={businessWorkspaceConfig.focusTitle}>
                  <Space direction="vertical" size={10} className="quality-panel">
                    {businessWorkspaceConfig.focusItems.map((item) => (
                      <div key={item.title} className="automation-item">
                        <Text strong>{item.title}</Text>
                        <Text type="secondary">{item.description}</Text>
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="module-grid">
              <Col xs={24} xl={16}>
                <Card
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
              </Col>

              <Col xs={24} xl={8}>
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
              </>
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
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
    FINANCE: [],
    CUSTOMER: []
  });

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
          { ADMIN: [], CUSTOMER_SERVICE: [], OPERATOR: [], FINANCE: [], CUSTOMER: [] } as Record<RoleKey, PermissionKey[]>
        )
      );
    });
    return () => {
      mounted = false;
    };
  }, [apiClient]);

  const roleRows = roleMatrix?.roles ?? [];
  const permissionOptions =
    roleMatrix?.availablePermissions.map((permission) => ({
      label: permission.label,
      value: permission.code
    })) ?? [];

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
                prompt: '请检查管理员、客服、操作、财务、客户的权限边界，指出高风险配置和建议的审计项。',
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
          <MetricCard icon={<Users />} title="角色账号" value={roleRows.length || 5} extra="管理员/客服/操作/财务/客户" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Activity />} title="审计项" value="9" extra="权限修改必须写入 audit_logs" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24} xl={15}>
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
              pagination={false}
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

          <Card className="module-grid" title="角色权限分配">
            <Table
              rowKey="key"
              size="small"
              pagination={false}
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
                      <Checkbox.Group
                        options={permissionOptions}
                        value={draftPermissions[record.key]}
                        onChange={(values) =>
                          setDraftPermissions((current) => ({
                            ...current,
                            [record.key]: values as PermissionKey[]
                          }))
                        }
                      />
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

          <Card className="module-grid" title="分配客户端角色权限">
            <Table
              rowKey="role"
              size="small"
              pagination={false}
              dataSource={clientRoleRows}
              columns={[
                { title: '客户端角色', dataIndex: 'role', width: 150 },
                { title: '数据范围', dataIndex: 'scope', width: 180 },
                { title: '可用能力', dataIndex: 'permissions' }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={9}>
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

          <Card className="automation-card" title="AI 接口安全">
            <Space direction="vertical" size={10} className="quality-panel">
              <Tag color="blue">硅基流动</Tag>
              <Alert type="success" showIcon message="所有 AI 调用统一走后端 /api/ai/assist" />
              <Alert type="warning" showIcon message="SILICONFLOW_API_KEY 只读取环境变量，不写入前端代码" />
            </Space>
          </Card>

          <Card className="automation-card" title="高危操作审计">
            <Space direction="vertical" size={10} className="quality-panel">
              {['权限修改必须写入 audit_logs', '员工账号重置密码必须记录操作人', '角色权限分配需要保存前后变化', '系统参数修改需要二次确认'].map((item) => (
                <Alert key={item} type="info" showIcon message={item} />
              ))}
            </Space>
          </Card>

          <Card className="automation-card" title="系统基础配置">
            <Space wrap>
              {['公司资料', '模板', '通知', '轨迹规则', '状态字典', '转单提醒'].map((item) => (
                <Button key={item} onClick={() => handleSettingAction(`已进入${item}模拟配置`)}>
                  {item}
                </Button>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  );
}

function MasterDataPage({
  masterData,
  notice,
  onAiAssist,
  aiLoading,
  onCreateCustomer,
  onCreateContact,
  onCreateCustomerUser,
  onCreateAgent,
  onCreateCarrier,
  onCreateChannel,
  onCreateSurcharge,
  onCreateFuelRate,
  onCreateExchangeRate,
  onToggleChannel
}: {
  masterData: MasterDataSnapshot;
  notice: string | null;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  onCreateCustomer: () => Promise<void>;
  onCreateContact: () => Promise<void>;
  onCreateCustomerUser: () => Promise<void>;
  onCreateAgent: () => Promise<void>;
  onCreateCarrier: () => Promise<void>;
  onCreateChannel: () => Promise<void>;
  onCreateSurcharge: () => Promise<void>;
  onCreateFuelRate: () => Promise<void>;
  onCreateExchangeRate: () => Promise<void>;
  onToggleChannel: (channelId: string, enabled: boolean) => Promise<void>;
}) {
  const summary = summarizeMasterDataSnapshot(masterData);
  const customerRows = masterData.customers.map((customer) => ({
    ...customer,
    displayName: `${customer.code}-${customer.name}`,
    contactCount: masterData.contacts.filter((contact) => contact.customerId === customer.id).length,
    userCount: masterData.customerUsers.filter((user) => user.customerId === customer.id).length
  }));
  const rateRows = [
    ...masterData.fuelRates.map((rate) => ({
      id: rate.id,
      type: '燃油',
      name: `${rate.channelName} ${rate.rate}`,
      detail: rate.activeAt.slice(0, 10),
      enabled: true
    })),
    ...masterData.exchangeRates.map((rate) => ({
      id: rate.id,
      type: '汇率',
      name: `${rate.baseCurrency}/${rate.quoteCurrency} ${rate.rate}`,
      detail: rate.activeAt.slice(0, 10),
      enabled: rate.enabled
    }))
  ];

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>基础资料中心</Title>
          <Text type="secondary">按手册维护客户、代理、基础数据、费用名称、汇率、单证模板和模板权限。</Text>
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
                prompt: '请检查客户、代理、承运商、渠道、费用名称、汇率、模板权限的资料完整性，输出缺失项和处理顺序。',
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
          <MetricCard icon={<Users />} title="客户/联系人" value={summary.enabledCustomers} extra={`${masterData.contacts.length} 个联系人 / ${masterData.customerUsers.length} 个账号`} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Route />} title="代理/渠道" value={summary.enabledChannels} extra={`${summary.enabledAgents} 个代理 / ${summary.enabledCarriers} 个承运商`} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<FileText />} title="费用/汇率" value={summary.enabledSurcharges} extra={`${summary.activeExchangeRates} 条启用汇率`} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24} xl={15}>
          <Card
            title="客户、联系人与账号"
            extra={
              <Space wrap>
                <Button size="small" onClick={() => void onCreateCustomer()}>新建客户</Button>
                <Button size="small" onClick={() => void onCreateContact()}>创建客户联系人</Button>
                <Button size="small" onClick={() => void onCreateCustomerUser()}>客户端账号创建</Button>
              </Space>
            }
          >
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={customerRows}
              columns={[
                { title: '客户', dataIndex: 'displayName', render: (value: string) => <Text strong>{value}</Text> },
                { title: '联系人', dataIndex: 'contactCount', width: 90 },
                { title: '账号', dataIndex: 'userCount', width: 90 },
                { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
              ]}
            />
            <Space wrap className="surface-strip">
              {masterData.contacts.map((contact) => <Tag key={contact.id}>{contact.name}</Tag>)}
              {masterData.customerUsers.map((user) => <Tag key={user.id}>{user.username}</Tag>)}
            </Space>
          </Card>

          <Card className="module-grid" title="代理、承运商与渠道">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={masterData.channels}
              columns={[
                { title: '渠道', dataIndex: 'name', render: (value: string) => <Text strong>{value}</Text> },
                { title: '承运商', dataIndex: 'carrierName', width: 140 },
                { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
                {
                  title: '操作',
                  width: 150,
                  render: (_, channel) => (
                    <Button size="small" onClick={() => void onToggleChannel(channel.id, !channel.enabled)}>
                      {channel.enabled ? `停用 ${channel.name}` : `启用 ${channel.name}`}
                    </Button>
                  )
                }
              ]}
            />
            <Space wrap className="surface-strip">
              <Button size="small" onClick={() => void onCreateAgent()}>新建代理</Button>
              <Button size="small" onClick={() => void onCreateCarrier()}>新建承运商</Button>
              <Button size="small" onClick={() => void onCreateChannel()}>新建渠道</Button>
              {masterData.agents.map((agent) => <Tag key={agent.id}>{agent.name}</Tag>)}
              {masterData.carriers.map((carrier) => <Tag key={carrier.id}>{carrier.name}</Tag>)}
            </Space>
          </Card>

          <Card className="module-grid" title="费用、燃油与汇率">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={[
                ...masterData.surcharges.map((item) => ({ id: item.id, type: '附加费', name: item.name, detail: formatCurrency(item.amount), enabled: item.enabled })),
                ...rateRows
              ]}
              columns={[
                { title: '类型', dataIndex: 'type', width: 100, render: (value: string) => <Tag>{value}</Tag> },
                { title: '名称', dataIndex: 'name', render: (value: string) => <Text strong>{value}</Text> },
                { title: '说明', dataIndex: 'detail', width: 140 },
                { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
              ]}
            />
            <Space wrap className="surface-strip">
              <Button size="small" onClick={() => void onCreateSurcharge()}>新建附加费</Button>
              <Button size="small" onClick={() => void onCreateFuelRate()}>新建燃油费率</Button>
              <Button size="small" onClick={() => void onCreateExchangeRate()}>新建汇率</Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={9}>
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
      </Row>
    </>
  );
}

function PricingPage({
  quoteResult,
  pricingRules,
  notice,
  onQuote,
  onCreatePricingRule,
  onTogglePricingRule
}: {
  quoteResult: PricingRuleQuoteResponse | null;
  pricingRules: PricingRuleSummary[];
  notice: string | null;
  onQuote: () => Promise<void>;
  onCreatePricingRule: () => Promise<void>;
  onTogglePricingRule: (rule: PricingRuleSummary) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function runQuote() {
    setLoading(true);
    try {
      await onQuote();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>报价查价中心</Title>
          <Text type="secondary">按渠道、目的国、重量段匹配报价规则，并自动套用燃油、附加费和汇率。</Text>
        </div>
        <Space>
          <Button icon={<PackageCheck size={16} />} onClick={() => void onCreatePricingRule()}>
            新建报价规则
          </Button>
          <Button type="primary" icon={<CircleDollarSign size={16} />} loading={loading} onClick={runQuote}>
            试算报价
          </Button>
        </Space>
      </Flex>

      {notice ? <Alert className="notice-bar" type="success" showIcon message={notice} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard icon={<Banknote />} title="计费重" value="4kg" extra="DHL HK / 美国" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Activity />} title="燃油" value={quoteResult ? `${Math.round(quoteResult.appliedFuelRate * 100)}%` : '待试算'} extra="取渠道最新启用费率" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<PackageCheck />} title="附加费" value={quoteResult ? formatCurrency(quoteResult.surchargeTotal) : '待试算'} extra="启用附加费自动加入" />
        </Col>
      </Row>

      <Card className="module-grid" title="报价结果">
        {quoteResult ? (
          <Space direction="vertical" size={10}>
            <Text>基础运费 {formatCurrency(quoteResult.freight)}</Text>
            <Text>燃油费 {formatCurrency(quoteResult.fuel)}</Text>
            <Text>附加费 {formatCurrency(quoteResult.surchargeTotal)}</Text>
            <Text>匹配规则 {quoteResult.rule.channelName} / {quoteResult.rule.destinationCountry} / {quoteResult.rule.minWeightKg}-{quoteResult.rule.maxWeightKg}kg</Text>
            <Text>汇率 {quoteResult.originalCurrency}/CNY {quoteResult.exchangeRate}</Text>
            <Title level={3}>报价合计 {formatCurrency(quoteResult.total)}</Title>
          </Space>
        ) : (
          <Text type="secondary">点击试算报价后显示费用拆分。</Text>
        )}
      </Card>

      <Card className="module-grid" title="报价规则台账">
        <Space wrap className="surface-strip">
          <Tag>燃油附加费</Tag>
          <Tag>美国 2.4kg</Tag>
          <Tag>规则报价</Tag>
        </Space>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={pricingRules}
          columns={[
            {
              title: '规则',
              render: (_, rule) => <Text strong>{rule.channelName} / {rule.destinationCountry} / {rule.minWeightKg}-{rule.maxWeightKg}kg</Text>
            },
            { title: '单价', render: (_, rule) => `${rule.currency} ${rule.ratePerKg}/kg`, width: 140 },
            { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
            {
              title: '操作',
              width: 140,
              render: (_, rule) => (
                <Button size="small" onClick={() => void onTogglePricingRule(rule)}>
                  {rule.enabled ? `停用 ${rule.minWeightKg}-${rule.maxWeightKg}kg` : `启用 ${rule.minWeightKg}-${rule.maxWeightKg}kg`}
                </Button>
              )
            }
          ]}
        />
      </Card>
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

      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24} xl={15}>
          <Card title="应收费用">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
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
        </Col>
        <Col xs={24} xl={9}>
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
          <Card className="module-grid" title="账户流水">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={ledger}
              columns={[
                { title: '客户', dataIndex: 'customerName' },
                { title: '摘要', dataIndex: 'note', render: (value?: string) => value ?? '账户变动' },
                { title: '金额', dataIndex: 'amount', render: (value: number) => formatCurrency(value) },
                { title: '余额', dataIndex: 'balance', render: (value: number) => formatCurrency(value) }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function ReceiveLabelPage({
  shipments,
  labelsByShipmentId,
  notice,
  onReceive,
  onRoute,
  onCreateLabel,
  onLoadLabels,
  onVoidLabel,
  onDispatch
}: {
  shipments: Shipment[];
  labelsByShipmentId: Record<string, ShipmentLabelSummary[]>;
  notice: string | null;
  onReceive: (record: Shipment) => Promise<void>;
  onRoute: (record: Shipment) => Promise<void>;
  onCreateLabel: (record: Shipment) => Promise<void>;
  onLoadLabels: (record: Shipment) => Promise<void>;
  onVoidLabel: (record: Shipment, label: ShipmentLabelSummary) => Promise<void>;
  onDispatch: (record: Shipment) => Promise<void>;
}) {
  const config = modulePageConfigs.receive!;
  const workQueue = shipments.filter((shipment) =>
    ['DECLARED', 'WAITING_RECEIVE', 'WAITING_SORT', 'WAITING_DISPATCH'].includes(shipment.status)
  );
  const columns: ColumnsType<Shipment> = [
    {
      title: '系统单号 / 客户单号',
      dataIndex: 'systemOrderNo',
      width: 210,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          <Text type="secondary">{record.customerOrderNo}</Text>
        </Space>
      )
    },
    { title: '客户', dataIndex: 'customerName', width: 150 },
    { title: '承运商', dataIndex: 'carrier', width: 90 },
    {
      title: '渠道 / 代理',
      width: 170,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.channelName}</Text>
          <Text type="secondary">{record.agentName || '待分配'}</Text>
        </Space>
      )
    },
    { title: '转单号', dataIndex: 'transferNo', width: 170, render: (value?: string) => value ?? '待申请面单' },
    { title: '状态', dataIndex: 'status', width: 110, render: (status: ShipmentStatus) => <StatusTag status={status} /> },
    {
      title: '操作',
      width: 330,
      fixed: 'right',
      render: (_, record) => {
        const labels = labelsByShipmentId[record.id] ?? [];
        const activeLabel = labels.find((label) => label.status === 'CREATED');
        return (
          <Space wrap>
            {record.status === 'DECLARED' || record.status === 'WAITING_RECEIVE' ? (
              <Button size="small" onClick={() => void onReceive(record)}>
                确认收货
              </Button>
            ) : null}
            {record.status === 'WAITING_SORT' ? (
              <Button size="small" onClick={() => void onRoute(record)}>
                排货
              </Button>
            ) : null}
            {record.status === 'WAITING_DISPATCH' ? (
              <>
                <Button size="small" type="primary" onClick={() => void onCreateLabel(record)}>
                  申请面单
                </Button>
                <Button size="small" onClick={() => void onLoadLabels(record)}>
                  查看面单
                </Button>
                {activeLabel ? (
                  <Button size="small" danger onClick={() => void onVoidLabel(record, activeLabel)}>
                    作废面单
                  </Button>
                ) : null}
                <Button size="small" disabled={!record.transferNo} onClick={() => void onDispatch(record)}>
                  确认发货
                </Button>
              </>
            ) : null}
          </Space>
        );
      }
    }
  ];

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

      <Row gutter={[16, 16]}>
        {config.stats.map((stat) => (
          <Col xs={24} md={8} key={stat.label}>
            <MetricCard icon={<PackagePlus />} title={stat.label} value={stat.value} extra={stat.helper} />
          </Col>
        ))}
      </Row>

      <Card className="module-card">
        <Space wrap>
          {config.childFunctions.map((item) => (
            <Tag key={item}>{item}</Tag>
          ))}
        </Space>
      </Card>

      <Card title="API 收货打单队列">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={workQueue}
          size="small"
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1280 }}
          expandable={{
            expandedRowRender: (record) => {
              const labels = labelsByShipmentId[record.id] ?? [];
              return labels.length ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {labels.map((label) => (
                    <Flex key={label.id} justify="space-between" align="center">
                      <Space>
                        <Tag color={label.status === 'CREATED' ? 'green' : 'default'}>{label.status === 'CREATED' ? '已生成' : '已作废'}</Tag>
                        <Text>{label.labelNo}</Text>
                        <Text strong>{label.transferNo}</Text>
                        <Text type="secondary">{label.labelUrl}</Text>
                      </Space>
                    </Flex>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">暂无面单记录</Text>
              );
            }
          }}
        />
      </Card>

      <Card className="module-card" title="文档覆盖样例">
        <Space direction="vertical">
          {config.records.map((record) => (
            <Text key={record.primary}>{record.primary} · {record.secondary}</Text>
          ))}
        </Space>
      </Card>
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

      <Card className="module-card">
        <Space wrap>
          {config.childFunctions.map((item) => (
            <Tag key={item}>{item}</Tag>
          ))}
          <Tag>9064656160</Tag>
          <Tag>硅基流动</Tag>
        </Space>
      </Card>

      <Card title="承运商任务">
        <Table rowKey="id" size="small" pagination={false} columns={taskColumns} dataSource={tasks} />
      </Card>

      <Card className="module-card" title="最新轨迹">
        <Space direction="vertical" className="ai-list">
          {shipments.map((shipment) => (
            <Alert key={shipment.id} type={shipment.trackingStaleDays >= 5 ? 'warning' : 'info'} showIcon message={shipment.latestTracking} description={shipment.systemOrderNo} />
          ))}
        </Space>
      </Card>
    </>
  );
}

function GenericModulePage({
  config,
  onAiAssist,
  aiLoading
}: {
  config?: ModulePageConfig;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
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

      <Row gutter={[16, 16]}>
        {config.stats.map((stat) => (
          <Col xs={24} md={8} key={stat.label}>
            <MetricCard icon={<Activity />} title={stat.label} value={stat.value} extra={stat.helper} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24} xl={15}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <Boxes size={18} />
                <span>核心能力</span>
              </Flex>
            }
          >
            <Row gutter={[12, 12]}>
              {config.capabilities.map((capability) => (
                <Col xs={24} sm={12} lg={8} key={capability}>
                  <div className="module-card compact-module-card">
                    <Text strong>{capability}</Text>
                    <Text type="secondary">查询、筛选、批量处理、状态记录</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>

          <Card className="module-grid" title="功能点">
            <Space wrap>
              {config.childFunctions.map((child) => (
                <Tag key={child}>{child}</Tag>
              ))}
            </Space>
          </Card>

          <Card className="module-grid" title="模拟业务数据">
            <Table
              rowKey="primary"
              size="small"
              pagination={false}
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

          <Card className="module-grid" title="模块待办">
            <Table
              rowKey="item"
              size="small"
              pagination={false}
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
        </Col>

        <Col xs={24} xl={9}>
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

          <Card className="automation-card" title="快捷动作">
            <Space wrap>
              <Button>批量修改</Button>
              <Button>生成说明</Button>
              <Button>同步客户</Button>
              <Button>写入审计</Button>
            </Space>
          </Card>
        </Col>
      </Row>
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

function riskWeight(risk: string) {
  return risk === 'high' ? 3 : risk === 'medium' ? 2 : 1;
}

function riskLabel(risk: string) {
  return risk === 'high' ? '高风险' : risk === 'medium' ? '需关注' : '正常';
}

function formatCurrency(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

const fulfillmentActionLabels: Record<FulfillmentAction, string> = {
  'confirm-declare': '确认预报',
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

  if (action === 'assign-route') {
    return {
      ok: true,
      message: '已分配渠道，进入待发货',
      patch: { status: 'WAITING_DISPATCH', channelName: record.channelName || 'AI 推荐渠道' }
    };
  }

  if (action === 'confirm-dispatch') {
    return {
      ok: true,
      message: '已确认发货，进入待上网',
      patch: { status: 'WAITING_ONLINE', latestTracking: '已发货' }
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

  return {
    ok: true,
    message: '已确认预报',
    patch: { status: 'DECLARED', latestTracking: '已预报' }
  };
}

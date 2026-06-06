import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
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
  canTransitionShipment,
  createAutomationPlan,
  createFulfillmentAdvice,
  createShipmentInsights,
  getAvailableFulfillmentActions,
  getModuleCoverageSummary,
  productModules,
  shipmentStatusLabels,
  summarizeFulfillmentStages,
  summarizeStatusCounts,
  validateShipmentImportRows,
  type BusinessType,
  type FulfillmentAction,
  type Shipment,
  type ShipmentStatus
} from '@siyuan/shared';
import { businessTabs, shipments } from './data';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

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

const menuItems = [
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

type MenuKey = 'workspace' | 'orders' | 'receive' | 'routing' | 'tracking' | 'problems' | 'pricing' | 'finance' | 'reports' | 'master' | 'settings';
type FulfillmentStageKey = 'all' | 'declared' | 'receiving' | 'sorting' | 'dispatching' | 'online' | 'signing' | 'exception';

const businessWorkspaceConfigs: Record<
  BusinessType,
  {
    description: string;
    metrics: Array<{ title: string; extra: string }>;
    batchActions: string[];
    assistantCopy: string;
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
    assistantCopy: '用自然语言批量生成运单、解释快递报价差异、总结问题件、自动生成客户回复。'
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
    assistantCopy: 'AI 可按克重段识别报价异常、提醒未交邮袋批次，并生成客户上网延迟说明。'
  },
  DEDICATED_LINE: {
    description: '专线业务聚焦 FBA/海外仓大货、装板排舱、清关节点和头程/尾程轨迹。',
    metrics: [
      { title: '待处理专线', extra: '按航线、板位和仓库聚合' },
      { title: '清关风险', extra: '查验、资料缺失、尾程异常' },
      { title: '预计应收', extra: '头程、尾程、派送费合计' },
      { title: '今日入仓率', extra: 'FBA / 海外仓签收表现' }
    ],
    batchActions: ['批量装板', '排舱确认', '生成装箱单', '头程发货', '尾程转单', '清关资料审核', '新建问题', '添加轨迹'],
    assistantCopy: 'AI 可解释清关/排舱延误、提示大货成本倒挂，并生成客户节点汇报。'
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
  aiEnhancements: string[];
  queue: Array<{ item: string; owner: string; status: string }>;
  stats: Array<{ label: string; value: string; helper: string }>;
  records: Array<{ primary: string; secondary: string; metric: string; status: string }>;
}

const modulePageConfigs: Partial<Record<MenuKey, ModulePageConfig>> = {
  receive: {
    title: '收货打单中心',
    description: '覆盖收货扫描、重量复核、包裹明细和面单生成，适合作为仓库作业入口。',
    capabilities: ['收货扫描', '面单生成', '重量复核', '包裹明细', '异常入库'],
    aiEnhancements: ['重量异常识别', '面单信息补全', '重复扫描提醒'],
    stats: [
      { label: '待收货', value: '18', helper: '今日仓库扫描队列' },
      { label: '待打单', value: '9', helper: '已复重未出面单' },
      { label: '重量异常', value: '3', helper: '实重与预报差异超 15%' }
    ],
    records: [
      { primary: '入库扫描批次 RCV-0606-A', secondary: '9409-Daloday / SYGJ06061230001', metric: '实重 2.36kg / 预报 2.10kg', status: '待确认收货' },
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
    stats: [
      { label: '未更新', value: '12', helper: '超过 5 天无新轨迹' },
      { label: '待上网', value: '6', helper: '已发货未上网' },
      { label: '客户可见', value: '48', helper: '今日同步轨迹条数' }
    ],
    records: [
      { primary: 'SYGJ05291344165', secondary: '客户可见 / USPS 小包线', metric: '9 天未更新', status: '高风险' },
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
    stats: [
      { label: '待回复', value: '8', helper: '客户可见问题件' },
      { label: '待关闭', value: '5', helper: '内部已处理待复核' },
      { label: 'SLA 超时', value: '2', helper: '超过承诺响应时间' }
    ],
    records: [
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
    aiEnhancements: ['自然语言查价', '报价差异解释', '推荐最优渠道'],
    stats: [
      { label: '今日试算', value: '34', helper: '客户与销售查价' },
      { label: '报价产品', value: '16', helper: '按渠道/国家/分区' },
      { label: '待复核价', value: '4', helper: '燃油或偏远费变动' }
    ],
    records: [
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
    stats: [
      { label: '应收', value: '¥18,642', helper: '今日已生成费用' },
      { label: '应付', value: '¥13,908', helper: '代理/承运商成本' },
      { label: '待核销', value: '11', helper: '收付款未匹配' }
    ],
    records: [
      { primary: '9409-Daloday', secondary: '应收 ¥1,864.20 / 账户余额 ¥8,420.00', metric: '利润 ¥356.80', status: '待核销' },
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
    stats: [
      { label: '今日发货', value: '46', helper: '快递/小包/专线合计' },
      { label: '今日收货', value: '58', helper: '仓库扫描完成' },
      { label: '利润率', value: '18.6%', helper: '按已发货费用估算' }
    ],
    records: [
      { primary: '今日发货 46', secondary: '快递 31 / 小包 10 / 专线 5', metric: '利润率 18.6%', status: '可导出' },
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

export function App() {
  const [activeMenuKey, setActiveMenuKey] = useState<MenuKey>('workspace');
  const [businessType, setBusinessType] = useState<BusinessType>('EXPRESS');
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [selectedFulfillmentStage, setSelectedFulfillmentStage] = useState<FulfillmentStageKey>('all');
  const [keyword, setKeyword] = useState('');
  const [localShipments, setLocalShipments] = useState<Shipment[]>(shipments);
  const [notice, setNotice] = useState<string | null>(null);
  const businessWorkspaceConfig = businessWorkspaceConfigs[businessType];

  const visibleShipments = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return localShipments.filter((shipment) => {
      const matchesBusiness = shipment.businessType === businessType;
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

      return matchesBusiness && matchesStatus && matchesKeyword;
    });
  }, [businessType, keyword, localShipments, selectedStatus]);

  const businessShipments = useMemo(
    () => localShipments.filter((shipment) => shipment.businessType === businessType),
    [businessType, localShipments]
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
  const fulfillmentStageSummary = summarizeFulfillmentStages(localShipments, businessType);
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

  function handleFulfillmentAction(record: Shipment, action: FulfillmentAction) {
    const actionResult = resolveFulfillmentAction(record, action);

    if (!actionResult.ok) {
      setNotice(actionResult.message);
      return;
    }

    setLocalShipments((current) =>
      current.map((shipment) => (shipment.id === record.id ? { ...shipment, ...actionResult.patch } : shipment))
    );
    setNotice(actionResult.message);
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
              <Text className="brand-title">思源物流</Text>
              <Text className="brand-subtitle">AI TMS / OMS</Text>
            </div>
          </div>
          <Menu
            className="side-menu"
            mode="inline"
            selectedKeys={[activeMenuKey]}
            items={menuItems}
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
              {businessTabs.map((tab) => {
                const count = localShipments.filter((shipment) => shipment.businessType === tab.key).length;
                return (
                  <Button
                    key={tab.key}
                    type={businessType === tab.key ? 'primary' : 'default'}
                    onClick={() => {
                      setBusinessType(tab.key);
                      setSelectedStatus('ALL');
                      setActiveMenuKey('workspace');
                    }}
                  >
                    {tab.label} {count}
                  </Button>
                );
              })}
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
              <Button icon={<ShieldCheck size={16} />}>权限视图</Button>
              <Button type="primary" icon={<Sparkles size={16} />}>
                AI 工作流
              </Button>
            </Space>
          </Header>
          <Content className="content">
            {activeMenuKey === 'orders' ? (
              <>
                <Flex justify="space-between" align="center" className="page-heading">
                  <div>
                    <Title level={2}>运单履约中心</Title>
                    <Text type="secondary">围绕预报、收货、排货、发货、转单号和异常处理的前端闭环工作台。</Text>
                  </div>
                  <Space>
                    <Button icon={<FileInput size={16} />}>导入履约运单</Button>
                    <Button icon={<PackagePlus size={16} />}>新建预报</Button>
                    <Button type="primary" icon={<Sparkles size={16} />}>
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
            ) : modulePageConfigs[activeMenuKey] ? (
              <GenericModulePage config={modulePageConfigs[activeMenuKey]} />
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
                <Button type="primary" icon={<Bot size={16} />}>
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
                    <Button type="primary" block icon={<Send size={16} />}>
                      生成今日处理建议
                    </Button>
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

function GenericModulePage({ config }: { config?: ModulePageConfig }) {
  if (!config) {
    return null;
  }

  return (
    <>
      <Flex justify="space-between" align="center" className="page-heading">
        <div>
          <Title level={2}>{config.title}</Title>
          <Text type="secondary">{config.description}</Text>
        </div>
        <Space>
          <Button icon={<FileInput size={16} />}>导入</Button>
          <Button icon={<ClipboardCheck size={16} />}>导出</Button>
          <Button type="primary" icon={<Sparkles size={16} />}>
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
              {config.aiEnhancements.map((item) => (
                <Alert key={item} type="info" showIcon message={item} />
              ))}
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

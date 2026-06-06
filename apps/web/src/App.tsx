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
}

const modulePageConfigs: Partial<Record<MenuKey, ModulePageConfig>> = {
  receive: {
    title: '收货打单中心',
    description: '覆盖收货扫描、重量复核、包裹明细和面单生成，适合作为仓库作业入口。',
    capabilities: ['收货扫描', '面单生成', '重量复核', '包裹明细', '异常入库'],
    aiEnhancements: ['重量异常识别', '面单信息补全', '重复扫描提醒'],
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
    queue: [
      { item: 'SYGJ05291344165', owner: '客服组', status: '9 天未更新' },
      { item: 'SYGJ06061230003', owner: '异常组', status: '清关延误' }
    ]
  },
  problems: {
    title: '问题件中心',
    description: '管理问题件新建、回复、关闭、附件和客户可见状态。',
    capabilities: ['新建问题', '回复查看', '关闭问题', '附件', '客户可见状态'],
    aiEnhancements: ['自动归类问题原因', '生成客户回复', 'SLA 超时提醒'],
    queue: [
      { item: '清关资料缺失', owner: '客服组', status: '待客户回复' },
      { item: '客户退件：不出', owner: '操作组', status: '待关闭' }
    ]
  },
  pricing: {
    title: '报价查价中心',
    description: '支持客户报价、代理成本价、分区、燃油、附加费和价格试算。',
    capabilities: ['客户报价', '代理成本价', '分区', '燃油', '附加费', '价格试算'],
    aiEnhancements: ['自然语言查价', '报价差异解释', '推荐最优渠道'],
    queue: [
      { item: '美国 12kg DHL', owner: '销售组', status: '待报价' },
      { item: '澳大利亚偏远费', owner: '财务组', status: '待复核' }
    ]
  },
  finance: {
    title: '财务结算中心',
    description: '闭环应收、应付、对账、收付款、核销和余额流水。',
    capabilities: ['应收费用', '应付费用', '客户对账', '代理对账', '收付款', '核销', '余额流水'],
    aiEnhancements: ['费用差异解释', '欠费风险提示', '对账单摘要'],
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
    queue: [
      { item: 'HKD01 代理价', owner: '产品组', status: '待更新' },
      { item: '客户联系人', owner: '客服组', status: '缺资料' }
    ]
  },
  settings: {
    title: '系统设置中心',
    description: '承载公司资料、模板、通知、轨迹规则、状态字典和权限设置。',
    capabilities: ['公司资料', '模板', '通知', '轨迹规则', '状态字典', '权限'],
    aiEnhancements: ['配置健康检查', '规则冲突提示', '权限风险提示'],
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
                  吸收易抵达核心业务闭环，重构为状态驱动、风险优先、可扩展的现代运营台。
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
                <MetricCard icon={<Truck />} title="待处理运单" value={businessShipments.length} extra="按业务类型聚合" />
              </Col>
              <Col xs={24} md={12} xl={6}>
                <MetricCard
                  icon={<Activity />}
                  title="轨迹风险"
                  value={aiQueue.filter((item) => item.insight.tags.includes('轨迹超时')).length}
                  extra="AI 自动识别"
                />
              </Col>
              <Col xs={24} md={12} xl={6}>
                <MetricCard icon={<Banknote />} title="预计应收" value="¥ 18,642" extra="含燃油与附加费" />
              </Col>
              <Col xs={24} md={12} xl={6}>
                <MetricCard icon={<PackageCheck />} title="今日签收率" value="92%" extra={<Progress percent={92} showInfo={false} />} />
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
                      <Button size="small">批量修改</Button>
                      <Button size="small">复制运单</Button>
                      <Button size="small">获取转单号</Button>
                      <Button size="small">日终处理</Button>
                      <Button size="small">新建问题</Button>
                      <Button size="small">回复/查看</Button>
                      <Button size="small">单证审核</Button>
                      <Button size="small">添加轨迹</Button>
                      <Button size="small">轨迹对接设置</Button>
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
                    <Text type="secondary">用自然语言批量生成运单、解释报价差异、总结问题件、自动生成客户回复。</Text>
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

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
  createShipmentInsights,
  shipmentStatusLabels,
  summarizeStatusCounts,
  type BusinessType,
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

export function App() {
  const [businessType, setBusinessType] = useState<BusinessType>('EXPRESS');
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [keyword, setKeyword] = useState('');

  const visibleShipments = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return shipments.filter((shipment) => {
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
  }, [businessType, keyword, selectedStatus]);

  const businessShipments = useMemo(
    () => shipments.filter((shipment) => shipment.businessType === businessType),
    [businessType]
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
          <Menu className="side-menu" mode="inline" selectedKeys={['workspace']} items={menuItems} />
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
                const count = shipments.filter((shipment) => shipment.businessType === tab.key).length;
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
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
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

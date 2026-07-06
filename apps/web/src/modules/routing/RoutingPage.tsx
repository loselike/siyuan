import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import { Activity, Boxes, ClipboardCheck, FileInput, RotateCcw, Sparkles } from 'lucide-react';
import {
  createFulfillmentAdvice,
  shipmentStatusLabels,
  type BusinessCostAuditSummary,
  type FulfillmentStageSummary,
  type MasterDataSnapshot,
  type Shipment,
  type ShipmentStatus
} from '@siyuan/shared';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPageHeader, CompactMetricCard, ManagedTable, MetricCard, RoutingStatusTag, StatusTag, renderNoticeBar, tenRowTablePagination } from '../shared/ui';

const { Text } = Typography;

export type RoutingStageKey = 'all' | 'sorting' | 'dispatching';

export interface RoutingAssignmentFormValues {
  agentId?: string;
  manualAgentName?: string;
  channelId?: string;
  manualChannelName?: string;
  agentChannelName?: string;
  chargeWeightKg?: number;
  unitPrice?: number;
  otherFee?: number;
  otherFeeRemark?: string;
  currency?: string;
  shippingMarkRequired?: boolean;
}

export interface RoutingPageConfig {
  title: string;
  description: string;
  capabilities: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
  queue: Array<{ item: string; owner: string; status: string }>;
  stats: Array<{ label: string; value: string; helper: string }>;
  records: Array<{ primary: string; secondary: string; metric: string; status: string }>;
}

const routingFulfillmentStages: Array<{ key: RoutingStageKey; label: string; statuses: ShipmentStatus[] }> = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'sorting', label: '待排货', statuses: ['WAITING_SORT'] },
  { key: 'dispatching', label: '待出库', statuses: ['WAITING_DISPATCH'] }
];

type MarketStatRow = { name: string; count: number };

function getFulfillmentStageCount(summary: FulfillmentStageSummary, stageKey: RoutingStageKey) {
  if (stageKey === 'all') {
    return Object.values(summary).reduce((total, count) => total + count, 0);
  }

  return summary[stageKey];
}

function inferRoutingMode(shipment: Shipment) {
  const channel = `${shipment.routeAgentChannelName || ''} ${shipment.channelName || ''}`;
  if (/空运|空派|航班/.test(channel)) return '空运';
  if (/海运|海卡|海派|船/.test(channel)) return '海运';
  return '其他渠道';
}

function getRoutingStageTime(shipment: Shipment) {
  if (shipment.status === 'WAITING_SORT') return shipment.reviewedAt ?? shipment.createdAt;
  if (shipment.status === 'WAITING_DISPATCH') return shipment.routedAt ?? shipment.createdAt;
  if (shipment.status === 'OUTBOUNDED') return shipment.outboundAt ?? shipment.createdAt;
  return shipment.createdAt;
}

function summarizeTop(rows: string[], limit = 5): MarketStatRow[] {
  const sorted = [...rows.reduce((map, name) => map.set(name, (map.get(name) || 0) + 1), new Map<string, number>())]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
  if (sorted.length <= limit) return sorted;
  const visible = sorted.slice(0, limit - 1);
  return [...visible, { name: '其他', count: sorted.slice(limit - 1).reduce((total, item) => total + item.count, 0) }];
}




export function RoutingPage({
  config,
  notice,
  stageSummary,
  shipments,
  baseColumns,
  auditStatusColumn,
  selectedStage,
  onSelectStage,
  assignmentShipment,
  assignmentForm,
  masterData,
  businessCostAudits,
  onOpenAssignment,
  onCancelAssignment,
  onConfirmAssignment,
  onRerouteShipment,
  onEditShipment,
  onViewRoutingLog,
  onAiAssist,
  aiLoading
}: {
  config: RoutingPageConfig;
  notice?: string | null;
  stageSummary: FulfillmentStageSummary;
  shipments: Shipment[];
  baseColumns: ColumnsType<Shipment>;
  auditStatusColumn: ColumnsType<Shipment>[number];
  selectedStage: RoutingStageKey;
  onSelectStage: (stage: RoutingStageKey) => void;
  assignmentShipment: Shipment | null;
  assignmentForm: FormInstance<RoutingAssignmentFormValues>;
  masterData: MasterDataSnapshot;
  businessCostAudits?: BusinessCostAuditSummary[];
  onOpenAssignment: (shipment: Shipment) => void;
  onCancelAssignment: () => void;
  onConfirmAssignment: () => Promise<boolean>;
  onRerouteShipment: (shipment: Shipment, reason: string) => Promise<void>;
  onEditShipment: (shipment: Shipment) => void;
  onViewRoutingLog: (shipment: Shipment) => void;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const routingSubItems = useMemo<ModuleSubNavItem[]>(
    () => [
      { key: 'market-dashboard', label: '市场看板', description: '市场作业总览' },
      { key: 'pending-routing', label: '待排货', description: '市场排货' },
      { key: 'routed', label: '已排货', description: '等待仓库出库' },
      { key: 'weekly-routing', label: '本周排货数据', description: '排货统计' },
    ],
    []
  );
  const [activeSection, setActiveSection] = useState(() => routingSubItems[0].key);
  const [rerouteShipment, setRerouteShipment] = useState<Shipment | null>(null);
  const [rerouteForm] = Form.useForm<{ reason?: string }>();
  const watchedChargeWeight = Form.useWatch('chargeWeightKg', assignmentForm);
  const watchedUnitPrice = Form.useWatch('unitPrice', assignmentForm);
  const watchedOtherFee = Form.useWatch('otherFee', assignmentForm);
  const watchedAgentId = Form.useWatch('agentId', assignmentForm);
  const routeCostPreview = Number(watchedChargeWeight || 0) * Number(watchedUnitPrice || 0) + Number(watchedOtherFee || 0);

  useEffect(() => {
    if (!routingSubItems.some((item) => item.key === activeSection)) {
      setActiveSection(routingSubItems[0].key);
    }
  }, [activeSection, routingSubItems]);

  const pendingShipments = useMemo(() => shipments.filter((shipment) => shipment.status === 'WAITING_SORT'), [shipments]);
  const routedShipments = useMemo(() => shipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH'), [shipments]);
  const returnableShipments = useMemo(() => shipments.filter((shipment) => ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(shipment.status)), [shipments]);
  const weekStart = useMemo(() => {
    const date = new Date();
    const day = date.getDay() || 7;
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - day + 1);
    return date.getTime();
  }, []);
  const dayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);
  const weeklyRoutedShipments = useMemo(
    () => shipments.filter((shipment) => shipment.routedAt && new Date(shipment.routedAt).getTime() >= weekStart),
    [shipments, weekStart]
  );
  const todayRoutedShipments = useMemo(
    () => shipments.filter((shipment) => shipment.routedAt && new Date(shipment.routedAt).getTime() >= dayStart),
    [shipments, dayStart]
  );
  const todayOutboundShipments = useMemo(
    () => shipments.filter((shipment) => shipment.outboundAt && new Date(shipment.outboundAt).getTime() >= dayStart),
    [shipments, dayStart]
  );
  const weeklyOutboundShipmentsWithAgent = useMemo(
    () => shipments.filter((shipment) => shipment.agentName && shipment.outboundAt && new Date(shipment.outboundAt).getTime() >= weekStart),
    [shipments, weekStart]
  );
  const weeklyNewAgentCount = useMemo(() => {
    const firstOutboundByAgent = new Map<string, number>();
    for (const shipment of shipments) {
      if (!shipment.agentName || !shipment.outboundAt) continue;
      const outboundTime = new Date(shipment.outboundAt).getTime();
      const current = firstOutboundByAgent.get(shipment.agentName);
      if (current === undefined || outboundTime < current) {
        firstOutboundByAgent.set(shipment.agentName, outboundTime);
      }
    }
    return [...firstOutboundByAgent.values()].filter((firstOutboundAt) => firstOutboundAt >= weekStart).length;
  }, [shipments, weekStart]);
  const reroutedThisWeek = useMemo(
    () => shipments.filter((shipment) => shipment.routeReturnedAt && new Date(shipment.routeReturnedAt).getTime() >= weekStart),
    [shipments, weekStart]
  );
  const weeklyAgentStats = useMemo(
    () => summarizeTop(weeklyRoutedShipments.map((shipment) => shipment.agentName || '未分配')),
    [weeklyRoutedShipments]
  );
  const weeklyChannelModeStats = useMemo(
    () => summarizeTop(weeklyRoutedShipments.map(inferRoutingMode), 3),
    [weeklyRoutedShipments]
  );
  const weeklySensitiveCount = useMemo(
    () => weeklyRoutedShipments.filter((shipment) => shipment.sensitive === true).length,
    [weeklyRoutedShipments]
  );
  const weeklyDeclaredCount = useMemo(
    () => weeklyRoutedShipments.filter((shipment) => shipment.declarationRequired === true).length,
    [weeklyRoutedShipments]
  );

  const formatAmount = (amount?: number, currency = 'RMB') => typeof amount === 'number' ? `${amount.toFixed(2)} ${currency}` : '-';
  const formatWeight = (weight?: number) => typeof weight === 'number' ? `${weight.toFixed(3)} kg` : '-';
  const sameShipmentFees = (shipment: Shipment) => (businessCostAudits ?? []).filter((fee) => fee.shipmentId === shipment.id || fee.systemOrderNo === shipment.systemOrderNo);
  const renderFeeRows = (rows: BusinessCostAuditSummary[]) => rows.length ? (
    <Space direction="vertical" size={0}>
      {rows.map((row) => <Text key={row.id}>{row.name} {formatAmount(row.amount, row.currency)}</Text>)}
    </Space>
  ) : <Text type="secondary">-</Text>;
  const renderMarketStatList = (rows: MarketStatRow[], emptyText: string) => rows.length ? (
    <Space direction="vertical" size={6} className="market-dashboard-list">
      {rows.map((row) => (
        <Flex key={row.name} justify="space-between" align="center" className="market-dashboard-list-row">
          <Text>{row.name}</Text>
          <Tag color="blue">{row.count} 票</Tag>
        </Flex>
      ))}
    </Space>
  ) : <Text type="secondary">{emptyText}</Text>;
  const agentChannelOptions = useMemo(
    () => masterData.agentChannels
      .filter((channel) => channel.enabled && (!watchedAgentId || channel.agentId === watchedAgentId))
      .map((channel) => ({
        value: channel.channelName,
        label: channel.agentName ? `${channel.channelName} / ${channel.agentName}` : channel.channelName
      })),
    [masterData.agentChannels, watchedAgentId]
  );

  const marketColumns: ColumnsType<Shipment> = useMemo(
    () => [
      { title: '进入时间', dataIndex: 'createdAt', width: 160, render: (_: string, record) => new Date(getRoutingStageTime(record)).toLocaleString('zh-CN', { hour12: false }) },
      { title: '站点', dataIndex: 'site', width: 90, render: (value?: string) => value || '-' },
      { title: '业务员', dataIndex: 'salesperson', width: 100, render: (value?: string) => value || '-' },
      { title: '客户编号', dataIndex: 'customerCode', width: 100, render: (value: string | undefined, record) => value || record.customerName.split('-')[0] },
      { title: '客户', dataIndex: 'customerName', width: 150 },
      { title: '运单号', dataIndex: 'systemOrderNo', width: 180 },
      { title: '货物数据', width: 140, render: (_, record) => `${record.packageCount} 件 / ${record.receivableWeightKg.toFixed(2)} kg` },
      { title: '目的地', dataIndex: 'destinationCountry', width: 90 },
      { title: '代理', dataIndex: 'agentName', width: 130, render: (value?: string) => value || '待分配' },
      { title: '代理渠道', dataIndex: 'routeAgentChannelName', width: 150, render: (value: string | undefined, record) => value || record.channelName || '待分配' },
      { title: '计费重', dataIndex: 'routeChargeWeightKg', width: 110, align: 'right', render: (value?: number) => formatWeight(value) },
      { title: '单价', dataIndex: 'routeUnitPrice', width: 100, align: 'right', render: (value: number | undefined, record) => formatAmount(value, record.routeCurrency) },
      { title: '其他费用', dataIndex: 'routeOtherFee', width: 110, align: 'right', render: (value: number | undefined, record) => formatAmount(value, record.routeCurrency) },
      { title: '总成本', dataIndex: 'routeCostTotal', width: 110, align: 'right', render: (value: number | undefined, record) => formatAmount(value, record.routeCurrency) },
      { title: '状态', dataIndex: 'status', width: 110, render: (status: ShipmentStatus) => <RoutingStatusTag status={status} /> },
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
        width: 260,
        fixed: 'right',
        render: (_, record) => {
          const canAssignRoute = record.status === 'WAITING_SORT';
          const canManualEdit = record.status === 'WAITING_DISPATCH';
          const canReroute = ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(record.status);

          return (
            <Space wrap>
              {canAssignRoute ? (
                <Button size="small" onClick={() => onOpenAssignment(record)}>
                  排货
                </Button>
              ) : null}
              {canManualEdit ? (
                <Button size="small" onClick={() => onEditShipment(record)}>
                  修改
                </Button>
              ) : null}
              <Button size="small" onClick={() => onViewRoutingLog(record)}>
                排货日志
              </Button>
              {canReroute ? (
                <Button size="small" icon={<RotateCcw size={14} />} onClick={() => setRerouteShipment(record)}>
                  退回重排
                </Button>
              ) : null}
            </Space>
          );
        }
      }
    ],
    [onEditShipment, onOpenAssignment, onViewRoutingLog]
  );

  const weeklyColumns: ColumnsType<Shipment> = useMemo(
    () => marketColumns.filter((column) => column.title !== '排货建议'),
    [marketColumns]
  );
  const pendingColumns: ColumnsType<Shipment> = useMemo(
    () => marketColumns.filter((column) => !['计费重', '单价', '其他费用', '总成本'].includes(String(column.title))),
    [marketColumns]
  );
  const routedColumns: ColumnsType<Shipment> = useMemo(
    () => {
      const costColumns: ColumnsType<Shipment> = [
        { title: '业务成本', width: 180, render: (_, record) => renderFeeRows(sameShipmentFees(record)) },
        {
          title: '业务成本合计',
          width: 130,
          align: 'right',
          render: (_, record) => formatAmount(sameShipmentFees(record).reduce((sum, fee) => sum + fee.amount, 0))
        },
        {
          title: '市场成本',
          width: 150,
          render: (_, record) => record.routeCostTotal ? <Text>代理成本 {formatAmount(record.routeCostTotal, record.routeCurrency)}</Text> : <Text type="secondary">-</Text>
        },
        { title: '市场成本合计', width: 130, align: 'right', render: (_, record) => formatAmount(record.routeCostTotal, record.routeCurrency) }
      ];
      const statusIndex = marketColumns.findIndex((column) => column.title === '状态');
      const columns = statusIndex >= 0
        ? [...marketColumns.slice(0, statusIndex), ...costColumns, ...marketColumns.slice(statusIndex)]
        : [...marketColumns, ...costColumns];
      return columns.map((column) => column.title === '进入时间'
        ? { ...column, title: '排货时间', render: (_: unknown, record: Shipment) => new Date(getRoutingStageTime(record)).toLocaleString('zh-CN', { hour12: false }) }
        : column);
    },
    [businessCostAudits, marketColumns]
  );

  return (
    <>
      <AppPageHeader
        title={config.title}
        description={<><span>{config.description}</span><div><Tag color="blue">硅基流动</Tag></div></>}
        actions={(
          <AppActionGroup>
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
          </AppActionGroup>
        )}
      />

      {renderNoticeBar(notice)}

      <ModuleSubWorkspace items={routingSubItems} activeKey={activeSection} onChange={setActiveSection}>
        <Row gutter={[16, 16]} className="main-grid">
          <Col xs={24}>
            {activeSection === 'market-dashboard' ? (
              <Space direction="vertical" size={12} className="full-width market-dashboard">
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12} md={6} xl={3}><CompactMetricCard icon={<Boxes />} title="待排货" value={pendingShipments.length} extra="待市场排货" /></Col>
                  <Col xs={24} sm={12} md={6} xl={3}><CompactMetricCard icon={<Activity />} title="已排货" value={routedShipments.length} extra="待仓库出库" /></Col>
                  <Col xs={24} sm={12} md={6} xl={3}><CompactMetricCard icon={<ClipboardCheck />} title="今日排货" value={todayRoutedShipments.length} extra="今天已排票数" /></Col>
                  <Col xs={24} sm={12} md={6} xl={3}><CompactMetricCard icon={<Boxes />} title="今日出货" value={todayOutboundShipments.length} extra="仓库今日出库" /></Col>
                  <Col xs={24} sm={12} md={6} xl={3}><CompactMetricCard icon={<ClipboardCheck />} title="本周排货" value={weeklyRoutedShipments.length} extra="按排货时间" /></Col>
                  <Col xs={24} sm={12} md={6} xl={3}><CompactMetricCard icon={<Activity />} title="本周出货代理数量" value={weeklyOutboundShipmentsWithAgent.length} extra="代理出货次数" /></Col>
                  <Col xs={24} sm={12} md={6} xl={3}><CompactMetricCard icon={<Boxes />} title="本周新代理" value={weeklyNewAgentCount} extra="首次本周出货" /></Col>
                  <Col xs={24} sm={12} md={6} xl={3}><CompactMetricCard icon={<RotateCcw />} title="退回重排" value={reroutedThisWeek.length} extra="本周退回" /></Col>
                </Row>
                <Card className="module-grid market-dashboard-weekly" title="本周排货数据">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} lg={8}>
                      <Text strong>本周排货代理</Text>
                      {renderMarketStatList(weeklyAgentStats, '本周暂无排货代理')}
                    </Col>
                    <Col xs={24} lg={8}>
                      <Text strong>本周排货渠道（空运/海运）</Text>
                      {renderMarketStatList(weeklyChannelModeStats, '本周暂无排货渠道')}
                    </Col>
                    <Col xs={12} lg={4}>
                      <Statistic title="本周敏感货物" value={weeklySensitiveCount} suffix="票" />
                      <Text type="secondary">带电/带磁/敏感</Text>
                    </Col>
                    <Col xs={12} lg={4}>
                      <Statistic title="本周报关货物" value={weeklyDeclaredCount} suffix="票" />
                      <Text type="secondary">需要报关</Text>
                    </Col>
                  </Row>
                </Card>
              </Space>
            ) : null}

            {activeSection === 'pending-routing' ? (
              <Card className="module-grid" title="待排货">
                <ManagedTable
                  rowKey="id"
                  size="small"
                  columns={pendingColumns}
                  dataSource={pendingShipments}
                  pagination={tenRowTablePagination}
                  minimumScrollX={1480}
                  columnSettings={{ storageKey: 'sunny.routing.pending.columns', title: '待排货列设置' }}
                />
              </Card>
            ) : null}

            {activeSection === 'routed' ? (
              <Card className="module-grid" title="已排货">
                <ManagedTable
                  rowKey="id"
                  size="small"
                  columns={routedColumns}
                  dataSource={routedShipments}
                  pagination={tenRowTablePagination}
                  minimumScrollX={2480}
                  columnSettings={{ storageKey: 'sunny.routing.routed.columns', title: '已排货列设置' }}
                />
              </Card>
            ) : null}

            {activeSection === 'weekly-routing' ? (
              <Space direction="vertical" size={16} className="full-width">
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}><MetricCard icon={<ClipboardCheck />} title="本周已排" value={weeklyRoutedShipments.length} extra="市场已分配代理渠道" /></Col>
                  <Col xs={24} md={8}><MetricCard icon={<Activity />} title="本周未出库" value={weeklyRoutedShipments.filter((item) => item.status === 'WAITING_DISPATCH').length} extra="等待仓库确认出库" /></Col>
                  <Col xs={24} md={8}><MetricCard icon={<Boxes />} title="本周已出库" value={weeklyRoutedShipments.filter((item) => item.status !== 'WAITING_DISPATCH').length} extra="仓库已确认出库或后续状态" /></Col>
                </Row>
                <Card className="module-grid" title="本周排货明细">
                  <ManagedTable
                    rowKey="id"
                    size="small"
                    columns={weeklyColumns}
                    dataSource={[...weeklyRoutedShipments, ...returnableShipments.filter((item) => !weeklyRoutedShipments.some((row) => row.id === item.id))]}
                    pagination={tenRowTablePagination}
                    minimumScrollX={1750}
                    columnSettings={{ storageKey: 'sunny.routing.weekly.columns', title: '本周排货列设置' }}
                  />
                </Card>
              </Space>
            ) : null}
          </Col>
        </Row>
      </ModuleSubWorkspace>

      <Modal
        title="市场排货"
        open={Boolean(assignmentShipment)}
        destroyOnHidden
        okText="确认排货"
        cancelText="取消"
        width={680}
        onOk={async () => {
          if (await onConfirmAssignment()) {
            setActiveSection('routed');
          }
        }}
        onCancel={onCancelAssignment}
      >
        <Alert
          className="notice-bar"
          type="info"
          showIcon
          message="代理从基础资料选择，代理渠道由市场手动填写；总成本按计费重乘单价加其他费用生成应付费用。"
        />
        <Form form={assignmentForm} layout="vertical">
          <Form.Item name="channelId" hidden>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="agentId" label="代理" rules={[{ required: true, message: '请选择代理' }]}>
                <Select
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
              <Form.Item name="agentChannelName" label="代理渠道" rules={[{ required: true, whitespace: true, message: '请输入代理渠道' }]}>
                <AutoComplete
                  options={agentChannelOptions}
                  placeholder="例如 宇环 DHL"
                  filterOption={(input, option) => String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="chargeWeightKg" label="计费重" rules={[{ required: true, message: '请填写计费重' }]}>
                <InputNumber className="full-width" min={0.001} precision={3} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="unitPrice" label="单价" rules={[{ required: true, message: '请填写单价' }]}>
                <InputNumber className="full-width" min={0.01} precision={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="otherFee" label="其他费用" initialValue={0}>
                <InputNumber className="full-width" min={0} precision={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="currency" label="币种" initialValue="RMB">
                <Select options={[{ label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                name="otherFeeRemark"
                label="其他费用备注"
                rules={[{
                  validator: (_, value) => {
                    const otherFee = Number(assignmentForm.getFieldValue('otherFee') || 0);
                    if (otherFee > 0 && !String(value ?? '').trim()) {
                      return Promise.reject(new Error('请填写其他费用包含内容'));
                    }
                    return Promise.resolve();
                  }
                }]}
              >
                <Input.TextArea rows={2} placeholder="例如偏远费、住宅费、超长超重费等" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="总成本">
                <Text strong>{Number.isFinite(routeCostPreview) && routeCostPreview > 0 ? `${routeCostPreview.toFixed(2)} ${assignmentForm.getFieldValue('currency') ?? 'RMB'}` : '-'}</Text>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="shippingMarkRequired" valuePropName="checked" initialValue={false}>
                <Checkbox>需要贴麦头</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="代理退回重排"
        open={Boolean(rerouteShipment)}
        destroyOnHidden
        okText="确认退回"
        cancelText="取消"
        onOk={() => void rerouteForm.validateFields().then((values) => onRerouteShipment(rerouteShipment!, values.reason!.trim())).then(() => {
          setRerouteShipment(null);
          rerouteForm.resetFields();
        }).catch(() => undefined)}
        onCancel={() => {
          setRerouteShipment(null);
          rerouteForm.resetFields();
        }}
      >
        <Form form={rerouteForm} layout="vertical">
          <Form.Item name="reason" label="退回原因" rules={[{ required: true, whitespace: true, message: '请填写退回原因' }]}>
            <Input.TextArea rows={4} placeholder="例如代理仓无法出货，需要退回重排" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

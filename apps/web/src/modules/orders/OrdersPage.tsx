import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Upload
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import { Bot, Boxes, FileInput, PackagePlus, Sparkles } from 'lucide-react';
import {
  createFulfillmentAdvice,
  shipmentStatusLabels,
  type MasterDataSnapshot,
  type Shipment,
  type ShipmentStatus
} from '@siyuan/shared';
import { formatBeijingDateTime } from '../shared/format';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import type { RoutingAssignmentFormValues } from '../routing/RoutingPage';

const { Text } = Typography;

export type OrdersLifecycleStageKey = 'all' | 'review' | 'warehouse' | 'inTransit' | 'problem' | 'completed';

export const orderLifecycleStages: Array<{ key: OrdersLifecycleStageKey; label: string; predicate: (shipment: Shipment) => boolean }> = [
  { key: 'all', label: '全部', predicate: () => true },
  { key: 'review', label: '审核处理', predicate: (shipment) => ['DRAFT', 'REVIEW_PENDING', 'REVIEW_REJECTED'].includes(shipment.status) },
  { key: 'warehouse', label: '仓内待出', predicate: (shipment) => ['DECLARED', 'WAITING_RECEIVE', 'WAITING_SORT', 'WAITING_DISPATCH'].includes(shipment.status) },
  { key: 'inTransit', label: '运输中', predicate: (shipment) => ['OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'WAITING_ONLINE', 'WAITING_SIGNED', 'WAITING_RETURN'].includes(shipment.status) },
  { key: 'problem', label: '问题件', predicate: (shipment) => ['PROBLEM', 'STUCK'].includes(shipment.status) || shipment.hasProblemTicket },
  { key: 'completed', label: '已完成', predicate: (shipment) => ['SIGNED', 'CANCELLED'].includes(shipment.status) }
];

export function lifecycleStatusColor(status: ShipmentStatus) {
  if (status === 'SIGNED') return 'success';
  if (status === 'CANCELLED') return 'default';
  if (['PROBLEM', 'STUCK', 'REVIEW_REJECTED'].includes(status)) return 'error';
  if (['DRAFT', 'REVIEW_PENDING', 'WAITING_RECEIVE', 'WAITING_SORT', 'WAITING_DISPATCH'].includes(status)) return 'warning';
  return 'processing';
}

export interface OutboundOrderFormValues {
  customerName: string;
  customerOrderNo: string;
  systemOrderNo?: string;
  remark?: string;
  destinationCountry: string;
  carrier: string;
  customReceivingChannel?: string;
  packageCount: number;
  receivableWeightKg: number;
  agentWeightKg: number;
}

export interface EditShipmentOperationalFormValues {
  latestTracking: string;
  transferNo?: string;
  channelId?: string;
  customerOrderNo?: string;
  productName?: string;
  destinationCountry?: string;
  packageCount?: number;
  receivableWeightKg?: number;
  agentWeightKg?: number;
  declarationRequired?: boolean;
  sensitive?: boolean;
  cargoType?: string;
  volumeCbm?: number;
  settlementMethod?: string;
  status: ShipmentStatus;
  etaAt?: string;
  etdAt?: string;
}

export interface ShipmentOperationLog {
  id: string;
  operatedAt: string;
  operator: string;
  action: string;
}

type ShipmentLogViewMode = 'operation' | 'routing';

const receivingChannelOptions = ['海运DDP', '空运DDP', '快递', '整柜到门', '整柜到港', '拼箱到港', '空运到机场', '代购', '自定义'];

export function OrdersPage({
  notice,
  shipments,
  columns,
  metricCards,
  selectedStage,
  onSelectStage,
  activeSection,
  onActiveSectionChange,
  outboundOrderOpen,
  outboundOrderForm,
  selectedReceivingChannel,
  onOpenOutboundOrder,
  onCreateOutboundOrder,
  onCloseOutboundOrder,
  editingShipment,
  editShipmentForm,
  editableStatuses,
  onSubmitShipmentOperationalEdit,
  onCancelShipmentOperationalEdit,
  routingAssignmentShipment,
  routingAssignmentForm,
  masterData,
  onConfirmRoutingAssignment,
  onCancelRoutingAssignment,
  onUploadShipmentBusinessInvoice,
  logViewingShipment,
  logViewingMode,
  shipmentLogs,
  onCloseShipmentLog,
  onAiAssist,
  aiLoading,
  permissions,
  role
}: {
  notice?: string | null;
  shipments: Shipment[];
  columns: ColumnsType<Shipment>;
  metricCards: Array<{ title: string; value: string | number; extra: ReactNode; icon: ReactNode }>;
  selectedStage: OrdersLifecycleStageKey;
  onSelectStage: (stage: OrdersLifecycleStageKey) => void;
  activeSection: string;
  onActiveSectionChange: (section: string) => void;
  outboundOrderOpen: boolean;
  outboundOrderForm: FormInstance<OutboundOrderFormValues>;
  selectedReceivingChannel?: string;
  onOpenOutboundOrder: () => void;
  onCreateOutboundOrder: () => Promise<void>;
  onCloseOutboundOrder: () => void;
  editingShipment: Shipment | null;
  editShipmentForm: FormInstance<EditShipmentOperationalFormValues>;
  editableStatuses: ShipmentStatus[];
  onSubmitShipmentOperationalEdit: () => Promise<void>;
  onCancelShipmentOperationalEdit: () => void;
  routingAssignmentShipment: Shipment | null;
  routingAssignmentForm: FormInstance<RoutingAssignmentFormValues>;
  masterData: MasterDataSnapshot;
  onConfirmRoutingAssignment: () => Promise<boolean>;
  onCancelRoutingAssignment: () => void;
  onUploadShipmentBusinessInvoice: (shipment: Shipment, file: File) => Promise<void>;
  logViewingShipment: Shipment | null;
  logViewingMode: ShipmentLogViewMode;
  shipmentLogs: ShipmentOperationLog[];
  onCloseShipmentLog: () => void;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  permissions: import('../../apiClient').PermissionKey[];
  role: import('../../apiClient').RoleKey;
}) {
  const hasBusinessPermission = (permission: import('../../apiClient').PermissionKey) => role === 'ADMIN' || permissions.includes(permission);
  const [createdFrom, setCreatedFrom] = useState<string>();
  const [createdTo, setCreatedTo] = useState<string>();
  const [customerKeyword, setCustomerKeyword] = useState('');
  const filteredShipments = useMemo(() => {
    const keyword = customerKeyword.trim().toLowerCase();
    return shipments.filter((shipment) => {
      const createdAt = shipment.createdAt.slice(0, 10);
      if (createdFrom && createdAt < createdFrom) return false;
      if (createdTo && createdAt > createdTo) return false;
      return !keyword || [shipment.customerCode, shipment.customerName].some((value) => value?.toLowerCase().includes(keyword));
    });
  }, [createdFrom, createdTo, customerKeyword, shipments]);
  const filteredStageShipments = useMemo(() => {
    const stage = orderLifecycleStages.find((item) => item.key === selectedStage);
    return stage ? filteredShipments.filter(stage.predicate) : filteredShipments;
  }, [filteredShipments, selectedStage]);
  const orderSubItems = useMemo<ModuleSubNavItem[]>(
    () => [
      { key: 'stageBoard', label: '订单预览', description: '状态池与单票操作' },
      { key: 'invoiceTasks', label: '待上传发票', description: '下载代理模板并上传业务发票' },
      { key: 'aiAssistant', label: 'AI 订单助手', description: '风险识别与话术建议' }
    ],
    []
  );

  const fulfillmentAdviceQueue = useMemo(
    () =>
      shipments
        .map((shipment) => ({ shipment, advice: createFulfillmentAdvice(shipment) }))
        .filter((item) => item.advice.priority !== 'normal')
        .slice(0, 5),
    [shipments]
  );

  const invoiceTaskShipments = useMemo(
    () =>
      shipments.filter((shipment) =>
        Boolean(shipment.agentId || shipment.agentName)
        && !['DRAFT', 'REVIEW_PENDING', 'REVIEW_REJECTED', 'WAITING_RECEIVE', 'WAITING_SORT', 'CANCELLED'].includes(shipment.status)
      ),
    [shipments]
  );

  const invoiceColumns = useMemo<ColumnsType<Shipment>>(
    () => [
      { title: '出货单号', dataIndex: 'systemOrderNo', width: 180 },
      { title: '客户编号', dataIndex: 'customerCode', width: 120, render: (value?: string) => value || '-' },
      { title: '代理', dataIndex: 'agentName', width: 160, render: (value?: string) => value || '-' },
      {
        title: '模板',
        key: 'template',
        width: 180,
        render: (_, shipment) => {
          const agent = masterData.agents.find((item) => item.id === shipment.agentId || item.name === shipment.agentName || item.shortName === shipment.agentName);
          if (!agent?.invoiceTemplateUrl) return <Tag color="red">代理未维护模板</Tag>;
          return <a href={agent.invoiceTemplateUrl} target="_blank" rel="noreferrer">{agent.invoiceTemplateName || '下载模板'}</a>;
        }
      },
      {
        title: '业务发票',
        key: 'businessInvoice',
        width: 190,
        render: (_, shipment) =>
          shipment.businessInvoiceUrl ? (
            <a href={shipment.businessInvoiceUrl} target="_blank" rel="noreferrer">{shipment.businessInvoiceName || '下载发票'}</a>
          ) : (
            <Tag color="orange">待业务上传发票</Tag>
          )
      },
      {
        title: '上传人/时间',
        key: 'uploaded',
        width: 210,
        render: (_, shipment) => shipment.businessInvoiceUploadedAt ? `${shipment.businessInvoiceUploadedBy ?? '-'} / ${formatBeijingDateTime(shipment.businessInvoiceUploadedAt)}` : '-'
      },
      {
        title: '操作',
        key: 'actions',
        width: 140,
        fixed: 'right',
        render: (_, shipment) => {
          const agent = masterData.agents.find((item) => item.id === shipment.agentId || item.name === shipment.agentName || item.shortName === shipment.agentName);
          return (
            <Upload
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              showUploadList={false}
              disabled={!agent?.invoiceTemplateUrl}
              beforeUpload={(file) => {
                void onUploadShipmentBusinessInvoice(shipment, file as File);
                return false;
              }}
            >
              <Button size="small" type="primary" disabled={!agent?.invoiceTemplateUrl}>上传发票</Button>
            </Upload>
          );
        }
      }
    ],
    [masterData.agents, onUploadShipmentBusinessInvoice]
  );

  useEffect(() => {
    if (!orderSubItems.some((item) => item.key === activeSection)) {
      onActiveSectionChange(orderSubItems[0].key);
    }
  }, [activeSection, onActiveSectionChange, orderSubItems]);

  return (
    <AppPage>
      <AppPageHeader
        title="我的运单生命周期"
        description="本人录入或归属的运单始终保留在这里；审核、仓内、运输、签收和问题件按当前节点更新。"
        actions={
          <AppActionGroup>
            {hasBusinessPermission('business:order-entry:invoice-upload') ? <Button icon={<FileInput size={16} />}>导入履约运单</Button> : null}
            {hasBusinessPermission('business:order-entry:create') ? <Button icon={<PackagePlus size={16} />} onClick={onOpenOutboundOrder}>新建出货订单</Button> : null}
            {hasBusinessPermission('business:order-ai:assist') ? <Button
              type="primary"
              icon={<Sparkles size={16} />}
              loading={aiLoading}
              onClick={() =>
                onAiAssist({
                  module: '业务管理',
                  task: '批量履约处理建议',
                  prompt: '请根据本人运单的当前生命周期节点、最新物流轨迹、问题件和超时风险，输出处理优先级与客户沟通话术。',
                  context: {
                    auditMetrics: metricCards.map(({ title, value }) => ({ title, value })),
                    samples: shipments.slice(0, 5)
                  }
                })
              }
            >
              AI 批量处理
            </Button> : null}
          </AppActionGroup>
        }
      />

      {renderNoticeBar(notice)}

      <Row gutter={[16, 16]}>
        {metricCards.map((metric) => (
          <Col xs={24} md={12} xl={6} key={metric.title}>
            <MetricCard icon={metric.icon} title={metric.title} value={metric.value} extra={metric.extra} />
          </Col>
        ))}
      </Row>

      <ModuleSubWorkspace items={orderSubItems} activeKey={activeSection} onChange={onActiveSectionChange}>
        {activeSection === 'stageBoard' ? (
          <Card
            className="fulfillment-board-card"
            title={
              <Flex align="center" gap={8}>
                <Boxes size={18} />
                <span>全生命周期运单</span>
              </Flex>
            }
          >
            <div className="fulfillment-board-toolbar">
              <div className="status-strip fulfillment-status-strip">
                {orderLifecycleStages.map((stage) => {
                  const count = filteredShipments.filter(stage.predicate).length;
                  return (
                    <Button
                      key={stage.key}
                      type={selectedStage === stage.key ? 'primary' : 'default'}
                      onClick={() => onSelectStage(stage.key)}
                    >
                      {stage.label} {count}
                    </Button>
                  );
                })}
              </div>
            </div>
            <Space wrap className="fulfillment-board-filters">
              <Input type="date" aria-label="开始日期" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value || undefined)} />
              <Input type="date" aria-label="结束日期" value={createdTo} onChange={(event) => setCreatedTo(event.target.value || undefined)} />
              <Input allowClear aria-label="客户编号或客户名称" placeholder="客户编号 / 客户名称" value={customerKeyword} onChange={(event) => setCustomerKeyword(event.target.value)} />
              <Button onClick={() => { setCreatedFrom(undefined); setCreatedTo(undefined); setCustomerKeyword(''); onSelectStage('all'); }}>重置</Button>
            </Space>

            <ManagedTable
              className="fulfillment-table"
              rowKey="id"
              columns={columns}
              dataSource={filteredStageShipments}
              size="small"
              pagination={tenRowTablePagination}
              minimumScrollX={1200}
            />
          </Card>
        ) : null}

        {activeSection === 'invoiceTasks' && hasBusinessPermission('business:order-entry:invoice-upload') ? (
          <Card
            className="fulfillment-board-card"
            title={
              <Flex align="center" gap={8}>
                <FileInput size={18} />
                <span>待业务上传发票</span>
              </Flex>
            }
          >
            <ManagedTable
              className="fulfillment-table"
              rowKey="id"
              columns={invoiceColumns}
              dataSource={invoiceTaskShipments}
              size="small"
              pagination={tenRowTablePagination}
              minimumScrollX={1100}
            />
          </Card>
        ) : null}

        {activeSection === 'aiAssistant' && hasBusinessPermission('business:order-ai:view') ? (
          <Card
            className="fulfillment-ai-card"
            title={
              <Flex align="center" gap={8}>
                <Bot size={18} />
                <span>AI 订单助手</span>
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
        onOk={() => void onCreateOutboundOrder().catch(() => undefined)}
        onCancel={onCloseOutboundOrder}
      >
        <Alert
          className="notice-bar"
          type="info"
          showIcon
          message="创建时间会自动补充，订单创建后先进入待审核；审核通过后进入待排货队列。"
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
              <Form.Item name="systemOrderNo" label="出货单号">
                <Input />
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
        title="人工修改物流轨迹与状态"
        open={Boolean(editingShipment)}
        destroyOnHidden
        okText="确认修改"
        cancelText="取消"
        width={560}
        onOk={() => void onSubmitShipmentOperationalEdit().catch(() => undefined)}
        onCancel={onCancelShipmentOperationalEdit}
      >
        <Alert
          className="notice-bar"
          type="warning"
          showIcon
          message="人工修改会直接覆盖该票最新物流轨迹、转单号和状态；内部生命周期节点不会写入物流轨迹。"
        />
        <Form form={editShipmentForm} layout="vertical">
          <Form.Item
            name="latestTracking"
            label="最新物流轨迹"
            rules={[{ required: true, whitespace: true, message: '请输入最新物流轨迹' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="transferNo" label="转单号">
            <Input placeholder="可直接修改或清空快递号" />
          </Form.Item>
          <Form.Item name="channelId" label="发货渠道">
            <Select
              allowClear
              showSearch
              placeholder="选择发货渠道"
              optionFilterProp="label"
              options={masterData.channels
                .filter((channel) => channel.enabled)
                .map((channel) => ({
                  label: `${channel.name} / ${channel.carrierName}`,
                  value: channel.id
              }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="customerOrderNo" label="客户单号">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="productName" label="品名">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="destinationCountry" label="目的地">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="cargoType" label="货物属性">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="packageCount" label="件数">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="receivableWeightKg" label="实重/计费重">
                <InputNumber min={0} precision={3} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="volumeCbm" label="体积 CBM">
                <InputNumber min={0} precision={3} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="settlementMethod" label="结算方式">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Space size={16}>
                <Form.Item name="declarationRequired" valuePropName="checked" noStyle>
                  <Checkbox>报关</Checkbox>
                </Form.Item>
                <Form.Item name="sensitive" valuePropName="checked" noStyle>
                  <Checkbox>敏感</Checkbox>
                </Form.Item>
              </Space>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="etdAt" label="ETD">
                <Input placeholder="例：2026-06-16 10:00" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="etaAt" label="ETA">
                <Input placeholder="例：2026-06-26 10:00" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <select aria-label="状态" className="native-select">
              {editableStatuses.map((status) => (
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
        onOk={() => void onConfirmRoutingAssignment().catch(() => undefined)}
        onCancel={onCancelRoutingAssignment}
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
        title={<span id="shipment-operation-log-title">{logViewingMode === 'routing' ? '排货日志' : '操作日志'}</span>}
        aria-labelledby="shipment-operation-log-title"
        open={Boolean(logViewingShipment)}
        destroyOnHidden
        width={760}
        footer={<Button onClick={onCloseShipmentLog}>关闭</Button>}
        onCancel={onCloseShipmentLog}
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
        <ManagedTable
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
    </AppPage>
  );
}

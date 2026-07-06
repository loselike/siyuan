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
  Statistic,
  Table,
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
  type ShipmentOperationalUpdateInput,
  type ShipmentPaymentMethod,
  type ShipmentPaymentUpdateInput,
  type ShipmentStatus
} from '@siyuan/shared';
import { formatBeijingDateTime } from '../shared/format';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import type { RoutingAssignmentFormValues } from '../routing/RoutingPage';

const { Text } = Typography;

export type OrdersAuditStageKey = 'all' | 'reviewing' | 'approved' | 'rejected';

export const orderAuditStages: Array<{ key: OrdersAuditStageKey; label: string; predicate: (shipment: Shipment) => boolean }> = [
  { key: 'all', label: '全部', predicate: () => true },
  { key: 'reviewing', label: '待审核', predicate: (shipment) => shipment.status === 'DRAFT' },
  { key: 'approved', label: '审核通过', predicate: (shipment) => !['DRAFT', 'REVIEW_REJECTED', 'CANCELLED'].includes(shipment.status) },
  { key: 'rejected', label: '审核不通过', predicate: (shipment) => shipment.status === 'REVIEW_REJECTED' }
];

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

export interface ShipmentPaymentFormValues {
  paymentAmountUsd?: number;
  paymentAmountCny?: number;
  paymentMethod: ShipmentPaymentMethod;
}

export interface ShipmentOperationLog {
  id: string;
  operatedAt: string;
  operator: string;
  action: string;
}

type ShipmentLogViewMode = 'operation' | 'routing';

const receivingChannelOptions = ['海运DDP', '空运DDP', '快递', '整柜到门', '整柜到港', '拼箱到港', '空运到机场', '代购', '自定义'];

const shipmentPaymentMethods: ShipmentPaymentMethod[] = ['对公', '对私', '阿里店铺', '外汇'];



export function OrdersPage({
  notice,
  shipments,
  visibleShipments,
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
  collectingShipment,
  shipmentPaymentForm,
  onSubmitShipmentPayment,
  onCancelShipmentPayment,
  pendingShipmentPayment,
  onConfirmShipmentPayment,
  onCancelPendingShipmentPayment,
  onUploadShipmentBusinessInvoice,
  logViewingShipment,
  logViewingMode,
  shipmentLogs,
  onCloseShipmentLog,
  formatPaymentSummary,
  onAiAssist,
  aiLoading
}: {
  notice?: string | null;
  shipments: Shipment[];
  visibleShipments: Shipment[];
  columns: ColumnsType<Shipment>;
  metricCards: Array<{ title: string; value: string | number; extra: ReactNode; icon: ReactNode }>;
  selectedStage: OrdersAuditStageKey;
  onSelectStage: (stage: OrdersAuditStageKey) => void;
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
  collectingShipment: Shipment | null;
  shipmentPaymentForm: FormInstance<ShipmentPaymentFormValues>;
  onSubmitShipmentPayment: () => Promise<void>;
  onCancelShipmentPayment: () => void;
  pendingShipmentPayment: { shipment: Shipment; input: ShipmentPaymentUpdateInput } | null;
  onConfirmShipmentPayment: () => Promise<void>;
  onCancelPendingShipmentPayment: () => void;
  onUploadShipmentBusinessInvoice: (shipment: Shipment, file: File) => Promise<void>;
  logViewingShipment: Shipment | null;
  logViewingMode: ShipmentLogViewMode;
  shipmentLogs: ShipmentOperationLog[];
  onCloseShipmentLog: () => void;
  formatPaymentSummary: (usd?: number, cny?: number) => string;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
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
      { title: '运单号', dataIndex: 'systemOrderNo', width: 180 },
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
        title="我的订单中心"
        description="围绕预报、入库、排货、发货、转单号和异常处理的前端闭环工作台。"
        actions={
          <AppActionGroup>
            <Button icon={<FileInput size={16} />}>导入履约运单</Button>
            <Button icon={<PackagePlus size={16} />} onClick={onOpenOutboundOrder}>新建出货订单</Button>
            <Button
              type="primary"
              icon={<Sparkles size={16} />}
              loading={aiLoading}
              onClick={() =>
                onAiAssist({
                  module: '我的订单',
                  task: '批量履约处理建议',
                  prompt: '请根据待审核、审核通过、审核不通过和收款状态，输出订单审核优先级、资料风险提醒和客户沟通话术。',
                  context: {
                    auditMetrics: metricCards.map(({ title, value }) => ({ title, value })),
                    samples: shipments.slice(0, 5)
                  }
                })
              }
            >
              AI 批量处理
            </Button>
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
                <span>订单预览</span>
              </Flex>
            }
          >
            <div className="fulfillment-board-toolbar">
              <div className="status-strip fulfillment-status-strip">
                {orderAuditStages.map((stage) => {
                  const count = shipments.filter(stage.predicate).length;
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

            <ManagedTable
              className="fulfillment-table"
              rowKey="id"
              columns={columns}
              dataSource={visibleShipments}
              size="small"
              pagination={tenRowTablePagination}
              minimumScrollX={1200}
            />
          </Card>
        ) : null}

        {activeSection === 'invoiceTasks' ? (
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

        {activeSection === 'aiAssistant' ? (
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
              <Form.Item name="systemOrderNo" label="系统单号">
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
        title="人工修改轨迹与状态"
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
          message="人工修改会直接覆盖该票最新轨迹、转单号和状态，并写入操作记录。"
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
        title="登记收款金额"
        open={Boolean(collectingShipment)}
        destroyOnHidden
        okText="确认收款"
        cancelText="取消"
        width={560}
        onOk={() => void onSubmitShipmentPayment().catch(() => undefined)}
        onCancel={onCancelShipmentPayment}
      >
        <Alert
          className="notice-bar"
          type="info"
          showIcon
          message="未登记前金额和付款方式显示为未知；确认收款后会保留操作记录。"
        />
        <Form form={shipmentPaymentForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="paymentAmountUsd" label="收款金额 USD">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="paymentAmountCny" label="收款金额 RMB">
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
        onOk={() => void onConfirmShipmentPayment()}
        onCancel={onCancelPendingShipmentPayment}
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
    </AppPage>
  );
}

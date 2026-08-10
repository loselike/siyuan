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
  Tag,
  Typography,
  Upload
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import { Bot, Boxes, FileDown, FileInput, PackagePlus, Sparkles } from 'lucide-react';
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
import { agentFieldLabels } from '../shared/agentFieldLabels';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';
import { getShipmentTransportTimeText } from '../shared/shipmentTransportTime';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedDualViewTable, ManagedTable, MetricCard, renderNoticeBar, tenRowTablePagination, type ManagedTableColumns } from '../shared/ui';
import type { RoutingAssignmentFormValues } from '../routing/RoutingPage';

const { Text } = Typography;

export type OrdersLifecycleStageKey = 'all' | 'review' | 'approved' | 'warehouse' | 'inTransit' | 'problem' | 'completed';

export const orderLifecycleStages: Array<{ key: OrdersLifecycleStageKey; label: string; predicate: (shipment: Shipment) => boolean }> = [
  { key: 'all', label: '全部', predicate: () => true },
  { key: 'review', label: '审核处理', predicate: (shipment) => ['REVIEW_PENDING', 'REVIEW_REJECTED'].includes(shipment.status) },
  { key: 'approved', label: '已审核', predicate: (shipment) => Boolean(shipment.businessReviewedAt) },
  { key: 'warehouse', label: '已排货', predicate: (shipment) => shipment.status === 'WAITING_DISPATCH' },
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

export function orderManagementStatusLabel(status: ShipmentStatus) {
  return status === 'WAITING_DISPATCH' ? '已排货' : shipmentStatusLabels[status];
}

export function canDownloadOrderInvoiceTemplate(shipment: Pick<Shipment, 'status' | 'invoiceTemplateAvailable'>) {
  return shipment.status === 'WAITING_DISPATCH' && shipment.invoiceTemplateAvailable === true;
}

const orderManagementAgentRestrictedRoles = new Set([
  'OPERATOR',
  'UG_BUSINESS',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR'
]);

export function canViewOrderManagementAgentDetails(role: import('../../apiClient').RoleKey) {
  return !orderManagementAgentRestrictedRoles.has(role);
}

export function canViewOrderManagementAgentWeight(
  permissions: readonly import('../../apiClient').PermissionKey[]
) {
  return permissions.includes('business:shipment:agent-weight-view');
}

export function formatOrderManagementWeight(weight?: number) {
  return typeof weight === 'number' ? weight.toFixed(3) : '-';
}

export function resolveOrderManagementAgentShortName(
  shipment: Pick<Shipment, 'agentId' | 'agentName'>,
  agents: MasterDataSnapshot['agents']
) {
  const agentName = shipment.agentName?.trim();
  const agent = agents.find((item) =>
    (shipment.agentId && item.id === shipment.agentId)
    || (agentName && (item.shortName === agentName || item.name === agentName))
  );
  return agent?.shortName?.trim() || agent?.code?.trim() || '-';
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
type OrderManagementDensity = 'compact' | 'dense';

const precisionLedgerColumnWidths: Record<string, number> = {
  createdAt: 88,
  customerName: 88,
  salesperson: 76,
  systemOrderNo: 98,
  transferNo: 92,
  destinationCountry: 60,
  channel: 76,
  agent: 100,
  packageCount: 50,
  receivableWeight: 90,
  agentWeight: 90,
  trackingStatus: 80,
  transportTime: 80,
  transitTime: 56,
  stageDwell: 96,
  paymentAmount: 70,
  paymentCurrency: 62,
  paymentMethod: 68,
  remark: 62,
  lifecycleStatus: 72,
  auditStatus: 68,
  actions: 78
};

type OrderMatrixField = {
  key: string;
  label: string;
  className?: string;
};

function findManagedOrderColumn(columns: ManagedTableColumns<Shipment>, key: string) {
  return columns.find((column) => String(column.key) === key);
}

function getOrderColumnDataValue(record: Shipment, dataIndex: unknown) {
  if (typeof dataIndex === 'string' || typeof dataIndex === 'number') {
    return (record as unknown as Record<string | number, unknown>)[dataIndex];
  }
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce<unknown>((value, segment) => {
      if (!value || typeof value !== 'object') return undefined;
      return (value as Record<string | number, unknown>)[segment];
    }, record);
  }
  return undefined;
}

function renderOrderColumnValue(
  columns: ManagedTableColumns<Shipment>,
  key: string,
  record: Shipment,
  index: number
) {
  const column = findManagedOrderColumn(columns, key);
  if (!column) return <Text type="secondary">-</Text>;

  const shouldUseCellRenderer = ['systemOrderNo', 'destinationCountry', 'channel', 'agent', 'actions'].includes(key);
  if (!shouldUseCellRenderer && column.recordDetail && column.recordDetail.value) {
    return column.recordDetail.value(record, index);
  }

  const dataIndex = 'dataIndex' in column ? column.dataIndex : undefined;
  if ('render' in column && typeof column.render === 'function') {
    return column.render(getOrderColumnDataValue(record, dataIndex), record, index) as ReactNode;
  }

  const value = getOrderColumnDataValue(record, dataIndex);
  return value === undefined || value === null || value === '' ? <Text type="secondary">-</Text> : String(value);
}

function renderOrderMatrixCell(
  columns: ManagedTableColumns<Shipment>,
  fields: OrderMatrixField[],
  record: Shipment,
  index: number,
  valueOverrides: Partial<Record<string, ReactNode>> = {}
) {
  return (
    <div className="order-matrix-cell">
      {fields.map((field) => (
        <div className={`order-matrix-field ${field.className ?? ''}`} key={field.key}>
          <span className="order-matrix-label">{field.label}</span>
          <div className="order-matrix-value">
            {field.key in valueOverrides ? valueOverrides[field.key] : renderOrderColumnValue(columns, field.key, record, index)}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderOrderMatrixDateTime(value: string) {
  const [date, time] = value.split(' ');
  return (
    <span className="order-matrix-datetime" title={value}>
      <span className="order-matrix-date">{date}</span>
      {time ? <span className="order-matrix-time">{time}</span> : null}
    </span>
  );
}

const receivingChannelOptions = ['海运DDP', '空运DDP', '快递', '整柜到门', '整柜到港', '拼箱到港', '空运到机场', '代购', '自定义'];

const shipmentPaymentMethods: ShipmentPaymentMethod[] = ['对公', '对私', '阿里店铺', '外汇'];

export type OrderManagementFilters = {
  createdFrom?: string;
  createdTo?: string;
  customerKeyword: string;
  outboundOrderKeyword: string;
};

function createEmptyOrderManagementFilters(): OrderManagementFilters {
  return { customerKeyword: '', outboundOrderKeyword: '' };
}

export function matchesOrderManagementFilters(shipment: Shipment, filters: OrderManagementFilters) {
  const createdAt = shipment.createdAt.slice(0, 10);
  if (filters.createdFrom && createdAt < filters.createdFrom) return false;
  if (filters.createdTo && createdAt > filters.createdTo) return false;
  const customerKeyword = filters.customerKeyword.toLowerCase();
  if (customerKeyword && ![shipment.customerCode, shipment.customerName].some((value) => value?.toLowerCase().includes(customerKeyword))) return false;
  const outboundOrderKeyword = filters.outboundOrderKeyword.toLowerCase();
  return !outboundOrderKeyword || resolveShipmentOutboundOrderNo(shipment).toLowerCase().includes(outboundOrderKeyword);
}



export function OrdersPage({
  notice,
  shipments,
  visibleShipments,
  columns,
  matrixSourceColumns,
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
  onDownloadShipmentInvoiceTemplate,
  onDownloadShipmentBusinessInvoice,
  logViewingShipment,
  logViewingMode,
  shipmentLogs,
  onCloseShipmentLog,
  formatPaymentSummary,
  onAiAssist,
  aiLoading,
  permissions,
  role
}: {
  notice?: string | null;
  shipments: Shipment[];
  visibleShipments: Shipment[];
  columns: ManagedTableColumns<Shipment>;
  matrixSourceColumns: ManagedTableColumns<Shipment>;
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
  collectingShipment: Shipment | null;
  shipmentPaymentForm: FormInstance<ShipmentPaymentFormValues>;
  onSubmitShipmentPayment: () => Promise<void>;
  onCancelShipmentPayment: () => void;
  pendingShipmentPayment: { shipment: Shipment; input: ShipmentPaymentUpdateInput } | null;
  onConfirmShipmentPayment: () => Promise<void>;
  onCancelPendingShipmentPayment: () => void;
  onUploadShipmentBusinessInvoice: (shipment: Shipment, file: File) => Promise<void>;
  onDownloadShipmentInvoiceTemplate: (shipment: Shipment) => Promise<void>;
  onDownloadShipmentBusinessInvoice: (shipment: Shipment) => Promise<void>;
  logViewingShipment: Shipment | null;
  logViewingMode: ShipmentLogViewMode;
  shipmentLogs: ShipmentOperationLog[];
  onCloseShipmentLog: () => void;
  formatPaymentSummary: (usd?: number, cny?: number) => string;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  permissions: import('../../apiClient').PermissionKey[];
  role: import('../../apiClient').RoleKey;
}) {
  const hasBusinessPermission = (permission: import('../../apiClient').PermissionKey) => role === 'ADMIN' || permissions.includes(permission);
  const showAgentDetails = canViewOrderManagementAgentDetails(role);
  const showAgentWeight = canViewOrderManagementAgentWeight(permissions);
  const [tableDensity, setTableDensity] = useState<OrderManagementDensity>('compact');
  const [downloadingInvoiceTemplateId, setDownloadingInvoiceTemplateId] = useState<string>();
  const [downloadingBusinessInvoiceId, setDownloadingBusinessInvoiceId] = useState<string>();
  const [filterDraft, setFilterDraft] = useState<OrderManagementFilters>(createEmptyOrderManagementFilters);
  const [appliedFilters, setAppliedFilters] = useState<OrderManagementFilters>(createEmptyOrderManagementFilters);
  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => matchesOrderManagementFilters(shipment, appliedFilters));
  }, [appliedFilters, shipments]);
  const applyFilters = () => {
    setAppliedFilters({
      ...filterDraft,
      customerKeyword: filterDraft.customerKeyword.trim(),
      outboundOrderKeyword: filterDraft.outboundOrderKeyword.trim()
    });
  };
  const resetFilters = () => {
    setFilterDraft(createEmptyOrderManagementFilters());
    setAppliedFilters(createEmptyOrderManagementFilters());
    onSelectStage('approved');
  };
  const filteredStageShipments = useMemo(() => {
    const stage = orderLifecycleStages.find((item) => item.key === selectedStage);
    return stage ? filteredShipments.filter(stage.predicate) : filteredShipments;
  }, [filteredShipments, selectedStage]);
  const downloadInvoiceTemplateFromDetail = async (shipment: Shipment) => {
    setDownloadingInvoiceTemplateId(shipment.id);
    try {
      await onDownloadShipmentInvoiceTemplate(shipment);
    } finally {
      setDownloadingInvoiceTemplateId(undefined);
    }
  };
  const downloadBusinessInvoice = async (shipment: Shipment) => {
    setDownloadingBusinessInvoiceId(shipment.id);
    try {
      await onDownloadShipmentBusinessInvoice(shipment);
    } finally {
      setDownloadingBusinessInvoiceId(undefined);
    }
  };
  const precisionLedgerColumns = useMemo<ManagedTableColumns<Shipment>>(
    () => columns.map((column) => {
      const key = String(column.key);
      const width = precisionLedgerColumnWidths[key];
      return width ? { ...column, width } : column;
    }),
    [columns]
  );
  const orderRecordDetailColumns: ManagedTableColumns<Shipment> = [
    ...matrixSourceColumns,
    ...(hasBusinessPermission('business:order-entry:invoice-upload') ? [{
      key: 'invoiceTemplateDownload',
      title: '发票模板',
      render: () => null,
      recordDetail: {
        label: '发票模板',
        span: 2 as const,
        interactive: true,
        value: (shipment: Shipment) => (
          <Space size={10}>
            <Button
              type="primary"
              icon={<FileDown size={14} />}
              disabled={!canDownloadOrderInvoiceTemplate(shipment)}
              loading={downloadingInvoiceTemplateId === shipment.id}
              onClick={() => void downloadInvoiceTemplateFromDetail(shipment)}
            >
              下载发票模板
            </Button>
            {!canDownloadOrderInvoiceTemplate(shipment) ? (
              <Text type="secondary">
                {shipment.status === 'WAITING_DISPATCH' ? '对应代理未维护可下载的发票模板' : '仅已排货运单可下载'}
              </Text>
            ) : null}
          </Space>
        )
      }
    }] : [])
  ];
  const matrixColumns = useMemo<ManagedTableColumns<Shipment>>(
    () => [
      {
        key: 'matrixBasic',
        title: '基础信息',
        width: 160,
        className: 'order-matrix-group-basic',
        render: (_, record, index) => renderOrderMatrixCell(matrixSourceColumns, [
          { key: 'createdAt', label: '创建时间', className: 'order-matrix-field-datetime' },
          { key: 'customerName', label: '客户名称' },
          { key: 'salesperson', label: '业务员归属' }
        ], record, index, {
          createdAt: renderOrderMatrixDateTime(formatBeijingDateTime(record.createdAt))
        })
      },
      {
        key: 'matrixOrder',
        title: '运单信息',
        width: 145,
        className: 'order-matrix-group-order',
        render: (_, record, index) => renderOrderMatrixCell(matrixSourceColumns, [
          { key: 'systemOrderNo', label: '出货单号' },
          { key: 'transferNo', label: '转单号' }
        ], record, index)
      },
      {
        key: 'matrixRoute',
        title: '路线与代理',
        width: showAgentDetails ? 210 : 180,
        className: `order-matrix-group-route${showAgentDetails ? '' : ' order-matrix-group-route-restricted'}`,
        render: (_, record, index) => renderOrderMatrixCell(matrixSourceColumns, [
          { key: 'destinationCountry', label: '目的地' },
          { key: 'channel', label: '公司渠道' },
          ...(showAgentDetails ? [
            { key: 'agentShortName', label: agentFieldLabels.shortName },
            { key: 'agentChannel', label: agentFieldLabels.channel }
          ] : [])
        ], record, index, showAgentDetails ? {
          agentShortName: <Text type={resolveOrderManagementAgentShortName(record, masterData.agents) === '-' ? 'secondary' : undefined}>
            {resolveOrderManagementAgentShortName(record, masterData.agents)}
          </Text>,
          agentChannel: <Text type={record.routeAgentChannelName ? undefined : 'secondary'}>
            {record.routeAgentChannelName || '-'}
          </Text>
        } : undefined)
      },
      {
        key: 'matrixCargoPayment',
        title: '货物与计费',
        width: showAgentWeight ? 278 : 230,
        className: 'order-matrix-group-cargo',
        render: (_, record, index) => renderOrderMatrixCell(matrixSourceColumns, [
          { key: 'packageCount', label: '件数' },
          { key: 'receivableWeight', label: '应收计费重' },
          ...(showAgentWeight ? [{ key: 'agentWeight', label: '代理计费重' }] : []),
          { key: 'paymentAmount', label: '应收金额' },
          { key: 'paymentCurrency', label: '应收币种' },
          { key: 'paymentMethod', label: '结算方式' }
        ], record, index, {
          paymentAmount: <Text type={record.receivableSummary?.amounts.length ? undefined : 'secondary'}>
            {record.receivableSummary?.amounts.length
              ? record.receivableSummary.amounts.map(({ currency, amount }) => `${currency} ${amount.toFixed(2)}`).join(' / ')
              : '未知'}
          </Text>
        })
      },
      {
        key: 'matrixFulfillment',
        title: '履约状态',
        width: 195,
        className: 'order-matrix-group-fulfillment',
        render: (_, record, index) => renderOrderMatrixCell(matrixSourceColumns, [
          { key: 'trackingStatus', label: '轨迹状态', className: 'order-matrix-field-wrap order-matrix-field-status-copy' },
          { key: 'transportTime', label: '运输时间', className: 'order-matrix-field-status-copy' },
          { key: 'transitTime', label: '时效', className: 'order-matrix-field-status-copy' },
          { key: 'lifecycleStatus', label: '当前节点' },
          { key: 'stageDwell', label: '节点停留' },
          { key: 'auditStatus', label: '审核状态' }
        ], record, index, {
          trackingStatus: <span className="order-matrix-status-text" title={record.latestTracking || '-'}>{record.latestTracking || '-'}</span>,
          transportTime: <span className="order-matrix-status-text">{getShipmentTransportTimeText(record)}</span>,
          transitTime: <span className="order-matrix-status-text">{renderOrderColumnValue(matrixSourceColumns, 'transitTime', record, index)}</span>
        })
      },
      {
        key: 'matrixRemark',
        title: '备注',
        width: 70,
        render: (_, record) => (
          <Text className="order-matrix-remark" title={record.remark || '无备注'} type={record.remark ? undefined : 'secondary'}>
            {record.remark || '无备注'}
          </Text>
        )
      },
      {
        key: 'matrixActions',
        title: '操作',
        width: 90,
        className: 'order-matrix-actions',
        render: (_, record, index) => renderOrderColumnValue(matrixSourceColumns, 'actions', record, index)
      }
    ],
    [formatPaymentSummary, masterData.agents, matrixSourceColumns, showAgentDetails, showAgentWeight]
  );
  const tableDensityToolbar = (
    <Select<OrderManagementDensity>
      aria-label="表格密度"
      size="small"
      value={tableDensity}
      options={[
        { label: '紧凑', value: 'compact' },
        { label: '高密度', value: 'dense' }
      ]}
      onChange={setTableDensity}
    />
  );
  const tableFilterToolbar = (
    <Space wrap className="fulfillment-board-filters">
      <Input
        type="date"
        aria-label="开始日期"
        value={filterDraft.createdFrom}
        onChange={(event) => setFilterDraft((current) => ({ ...current, createdFrom: event.target.value || undefined }))}
        onPressEnter={applyFilters}
      />
      <Input
        type="date"
        aria-label="结束日期"
        value={filterDraft.createdTo}
        onChange={(event) => setFilterDraft((current) => ({ ...current, createdTo: event.target.value || undefined }))}
        onPressEnter={applyFilters}
      />
      <Input
        allowClear
        aria-label="客户编号或客户名称"
        placeholder="客户编号 / 客户名称"
        value={filterDraft.customerKeyword}
        onChange={(event) => setFilterDraft((current) => ({ ...current, customerKeyword: event.target.value }))}
        onPressEnter={applyFilters}
      />
      <Input
        allowClear
        aria-label="出货单号"
        placeholder="出货单号"
        value={filterDraft.outboundOrderKeyword}
        onChange={(event) => setFilterDraft((current) => ({ ...current, outboundOrderKeyword: event.target.value }))}
        onPressEnter={applyFilters}
      />
      <Button type="primary" onClick={applyFilters}>查询</Button>
      <Button onClick={resetFilters}>重置</Button>
    </Space>
  );
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
      { title: '出货单号', dataIndex: 'systemOrderNo', width: 180, render: (_: string, shipment) => resolveShipmentOutboundOrderNo(shipment) },
      { title: '客户编号', dataIndex: 'customerCode', width: 120, render: (value?: string) => value || '-' },
      { title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 190, render: (value?: string) => value || '-' },
      {
        title: '模板',
        key: 'template',
        width: 180,
        render: (_, shipment) => {
          const agent = masterData.agents.find((item) => item.id === shipment.agentId || item.name === shipment.agentName || item.shortName === shipment.agentName);
          if (!agent?.invoiceTemplateUrl) return <Tag color="red">代理未维护模板</Tag>;
          return (
            <Button
              type="link"
              size="small"
              loading={downloadingInvoiceTemplateId === shipment.id}
              disabled={!canDownloadOrderInvoiceTemplate(shipment)}
              onClick={() => void downloadInvoiceTemplateFromDetail(shipment)}
            >
              {agent.invoiceTemplateName || '下载模板'}
            </Button>
          );
        }
      },
      {
        title: '业务发票',
        key: 'businessInvoice',
        width: 190,
        render: (_, shipment) =>
          shipment.businessInvoiceUrl ? (
            <Button
              type="link"
              size="small"
              loading={downloadingBusinessInvoiceId === shipment.id}
              onClick={() => void downloadBusinessInvoice(shipment)}
            >
              {shipment.businessInvoiceName || '下载发票'}
            </Button>
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
    [downloadingBusinessInvoiceId, downloadingInvoiceTemplateId, masterData.agents, onUploadShipmentBusinessInvoice]
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

            <ManagedDualViewTable
              viewStorageKey="sunny.business.order-management.table-view"
              defaultView="ledger"
              viewAriaLabel="运单表格视图"
              views={{
                matrix: {
                  columns: matrixColumns,
                  tableProps: {
                    className: 'fulfillment-table fulfillment-matrix-table',
                    tableLayout: 'fixed',
                    minimumScrollX: 0,
                    resizableColumns: true,
                    columnSettings: {
                      storageKey: 'sunny.business.order-management.matrix-columns',
                      title: '矩阵列设置',
                      lockedKeys: ['matrixActions']
                    },
                    rowClassName: (record) => `fulfillment-matrix-row fulfillment-matrix-row-${lifecycleStatusColor(record.status)}`,
                    recordDetail: hasBusinessPermission('business:shipment:detail') ? {
                      title: '运单详情',
                      ariaLabel: (record) => `查看运单 ${record.systemOrderNo} 详情`,
                      columns: orderRecordDetailColumns
                    } : false
                  }
                },
                ledger: {
                  columns: precisionLedgerColumns,
                  shellClassName: 'fulfillment-board-card-columns',
                  tableProps: {
                    className: 'fulfillment-table',
                    minimumScrollX: 1200,
                    recordDetail: hasBusinessPermission('business:shipment:detail') ? {
                      title: '运单详情',
                      ariaLabel: (record) => `查看运单 ${record.systemOrderNo} 详情`,
                      columns: orderRecordDetailColumns
                    } : false
                  }
                }
              }}
              rowKey="id"
              dataSource={filteredStageShipments}
              size="small"
              density={tableDensity}
              pagination={tenRowTablePagination}
              toolbarLeading={tableFilterToolbar}
              toolbarActions={tableDensityToolbar}
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
              recordDetail={{ title: '发票任务详情' }}
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
              <Form.Item name="customerOrderNo" label="出货单号" rules={[{ required: true, message: '请输入出货单号' }]}>
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
            {showAgentWeight ? (
              <Col xs={24} md={8}>
                <Form.Item name="agentWeightKg" label="代理计费重" rules={[{ required: true, message: '请输入代理计费重' }]}>
                  <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ) : null}
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
                  label: [channel.name, channel.carrierName].filter(Boolean).join(' / '),
                  value: channel.id
              }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="customerOrderNo" label="出货单号">
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
                  {orderManagementStatusLabel(status)}
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
                      label: [channel.name, channel.carrierName].filter(Boolean).join(' / '),
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
        className="shipment-operation-log-modal"
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
          className="shipment-operation-log-table"
          recordDetail={false}
          rowKey="id"
          size="small"
          pagination={shipmentLogs.length > 10 ? tenRowTablePagination : false}
          dataSource={shipmentLogs}
          sticky={false}
          minimumScrollX={0}
          resizableColumns={false}
          columnSettings={false}
          tableLayout="fixed"
          columns={[
            { title: '操作时间', dataIndex: 'operatedAt', width: 180, render: (value: string) => formatBeijingDateTime(value) },
            { title: '操作人员', dataIndex: 'operator', width: 96 },
            { title: '操作动作', dataIndex: 'action' }
          ]}
        />
      </Modal>
    </AppPage>
  );
}

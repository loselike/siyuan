import { useEffect, useRef, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Space, Spin, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { shipmentStatusLabels, type AgentSummary, type AuditLogSummary, type BusinessCostAuditSummary, type CustomerServiceDataConfirmRow, type ProblemTicketCreateInput, type ProblemTicketSummary, type Shipment, type ShipmentFinanceDetailSummary, type ShipmentLabelSummary, type ShipmentStatus } from '@siyuan/shared';
import type { ApiClient } from '../../apiClient';
import { agentFieldLabels } from '../shared/agentFieldLabels';
import { formatBeijingDateTime, formatBeijingDateTimeInputValue, isBeijingCurrentWeek, isBeijingToday, parseBeijingDateTimeInputToIso } from '../shared/format';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { createPendingRoutingColumns } from '../shared/pendingRoutingColumns';
import { ShipmentRiskFlag, isShipmentRiskFlagActive } from '../shared/ShipmentRiskFlag';
import { AppDateTimePicker, AppPageHeader, ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, ManagedTable, StatusTag, tenRowTablePagination, type ManagedTableColumns } from '../shared/ui';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';
import { TrackingWebsiteLink } from './TrackingWebsiteLink';
import { ProblemTicketCreateModal } from './ProblemTicketCreateModal';

const { Text } = Typography;
const allowedLabelFileTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
const dataConfirmRowsCache = new WeakMap<ApiClient, CustomerServiceDataConfirmRow[]>();

const statusSections: Record<string, ShipmentStatus[]> = {
  dataConfirm: ['OUTBOUNDED'],
  transferNo: ['OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'],
  waitingDeparture: ['WAITING_DEPARTURE'],
  departed: ['DEPARTED'],
  arrivedPort: ['ARRIVED_PORT'],
  delivering: ['DELIVERING'],
  signed: ['SIGNED']
};

type DepartureFormValues = {
  newTransferNo?: string;
  subOrderNo?: string;
  etdAt?: string;
  etaAt?: string;
  trackingWebsite?: string;
  trackingWebsiteVisibleToSales?: boolean;
  pushToSales?: boolean;
  statusRemark?: string;
};

type CustomerServiceTaskTone = 'amber' | 'blue' | 'green' | 'red' | 'gray';
type CustomerServiceDashboardTask = {
  key: string;
  label: string;
  value: number | string;
  helper: string;
  section: string;
  tone: CustomerServiceTaskTone;
};
type CustomerServiceDashboardGroup = {
  title: string;
  helper: string;
  items: CustomerServiceDashboardTask[];
};

type CustomerServiceAuditIndex = Map<string, AuditLogSummary>;

function auditIndexKey(target: string, discriminator: string) {
  return `${target}\u0000${discriminator}`;
}

function rememberLatest(map: Map<string, AuditLogSummary>, key: string, row: AuditLogSummary) {
  const current = map.get(key);
  if (!current || Date.parse(row.createdAt) > Date.parse(current.createdAt)) map.set(key, row);
}

export function buildCustomerServiceAuditIndex(
  logs: AuditLogSummary[],
  dataConfirmationCycleStartedAtByShipment: ReadonlyMap<string, string | undefined> = new Map()
): CustomerServiceAuditIndex {
  const index: CustomerServiceAuditIndex = new Map();
  logs.forEach((row) => {
    rememberLatest(index, auditIndexKey(row.target, `action:${row.action}`), row);
    const reviewMatch = /^customer_service\.(business|agent)_data\.(approved|reversed)$/.exec(row.action);
    const dataCycleStartedAt = dataConfirmationCycleStartedAtByShipment.get(row.target);
    if (reviewMatch && auditBelongsToDataConfirmationCycle(row, dataCycleStartedAt)) {
      rememberLatest(index, auditIndexKey(row.target, `review:${reviewMatch[1]}`), row);
    }
    const updateMatch = /^customer_service\.(business|agent)_data\.updated$/.exec(row.action);
    if (updateMatch && auditBelongsToDataConfirmationCycle(row, dataCycleStartedAt)) {
      rememberLatest(index, auditIndexKey(row.target, `data:${updateMatch[1]}`), row);
    }
    const after = getAuditAfter(row);
    if (row.action === 'customer_service.status.update' && typeof after.statusTo === 'string') {
      rememberLatest(index, auditIndexKey(row.target, `status:${after.statusTo}`), row);
    }
    if (row.action === 'shipment.operational.update' && 'trackingWebsite' in after) {
      rememberLatest(index, auditIndexKey(row.target, 'tracking'), row);
    }
    if (['customer_service.issue.attach', 'customer_service.issue.update', 'customer_service.issue.close'].includes(row.action)) {
      rememberLatest(index, auditIndexKey(row.target, 'problem'), row);
    }
  });
  return index;
}

function getDashboardTaskNumericValue(value: number | string) {
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatFeeAmount(amount?: number, currency = 'RMB') {
  return typeof amount === 'number' ? `${amount.toFixed(2)} ${currency}` : '-';
}

function renderFinanceRows(rows: Array<{ id: string; name: string; amount: number; currency?: string }>, emptyText: string) {
  return rows.length ? (
    <Space direction="vertical" size={4} className="full-width">
      {rows.map((row) => (
        <Space key={row.id} className="full-width" style={{ justifyContent: 'space-between' }}>
          <Text>{row.name}</Text>
          <Text strong>{formatFeeAmount(row.amount, row.currency)}</Text>
        </Space>
      ))}
    </Space>
  ) : <Text type="secondary">{emptyText}</Text>;
}

type WaitingColumnKey =
  | 'entryAt'
  | 'outboundAt'
  | 'salesperson'
  | 'customerCode'
  | 'destinationCountry'
  | 'productName'
  | 'packageCount'
  | 'actualWeight'
  | 'volumeCbm'
  | 'chargeWeight'
  | 'agentWeightKg'
  | 'businessReviewStatus'
  | 'agentPackageCount'
  | 'agentActualWeight'
  | 'agentVolumeCbm'
  | 'agentReviewStatus'
  | 'declarationRequired'
  | 'sensitive'
  | 'agentName'
  | 'carrier'
  | 'channelName'
  | 'routeAgentChannelName'
  | 'systemOrderNo'
  | 'transferNo'
  | 'etdAt'
  | 'etaAt'
  | 'action';
type DepartedColumnKey =
  | 'entryAt'
  | 'outboundAt'
  | 'salesperson'
  | 'customerCode'
  | 'destinationCountry'
  | 'productName'
  | 'packageCount'
  | 'actualWeight'
  | 'chargeWeight'
  | 'declarationRequired'
  | 'sensitive'
  | 'agentName'
  | 'carrier'
  | 'channelName'
  | 'routeAgentChannelName'
  | 'systemOrderNo'
  | 'transferNo'
  | 'agentData'
  | 'etdAt'
  | 'etaAt'
  | 'trackingWebsite'
  | 'handler'
  | 'handledAt'
  | 'action';
type ProblemCategory = 'all' | 'preDeparture' | 'arrivedPort' | 'delivering' | 'assistance' | 'history';
type ProblemColumnKey =
  | 'entryAt'
  | 'outboundAt'
  | 'category'
  | 'dwellDays'
  | 'salesperson'
  | 'customerCode'
  | 'destinationCountry'
  | 'systemOrderNo'
  | 'transferNo'
  | 'productName'
  | 'packageCount'
  | 'actualWeight'
  | 'chargeWeight'
  | 'agentName'
  | 'carrier'
  | 'channelName'
  | 'routeAgentChannelName'
  | 'reason'
  | 'declarationRequired'
  | 'sensitive'
  | 'agentData'
  | 'etdAt'
  | 'etaAt'
  | 'trackingWebsite'
  | 'handler'
  | 'handledAt'
  | 'action';
type ProblemRow = {
  ticket: ProblemTicketSummary;
  shipment?: Shipment;
  category: Exclude<ProblemCategory, 'all'>;
  categoryLabel: string;
  dwellDays: number;
};
const defaultWaitingColumnOrder: WaitingColumnKey[] = [
  'entryAt',
  'outboundAt',
  'salesperson',
  'customerCode',
  'destinationCountry',
  'productName',
  'packageCount',
  'actualWeight',
  'chargeWeight',
  'agentWeightKg',
  'declarationRequired',
  'sensitive',
  'agentName',
  'carrier',
  'channelName',
  'routeAgentChannelName',
  'systemOrderNo',
  'transferNo',
  'etdAt',
  'etaAt',
  'action'
];
const defaultDepartedColumnOrder: DepartedColumnKey[] = [
  'entryAt',
  'outboundAt',
  'salesperson',
  'customerCode',
  'destinationCountry',
  'productName',
  'packageCount',
  'actualWeight',
  'chargeWeight',
  'declarationRequired',
  'sensitive',
  'agentName',
  'carrier',
  'channelName',
  'routeAgentChannelName',
  'systemOrderNo',
  'transferNo',
  'agentData',
  'etdAt',
  'etaAt',
  'trackingWebsite',
  'handler',
  'handledAt',
  'action'
];
const defaultProblemColumnOrder: ProblemColumnKey[] = [
  'entryAt',
  'outboundAt',
  'category',
  'dwellDays',
  'salesperson',
  'customerCode',
  'destinationCountry',
  'systemOrderNo',
  'transferNo',
  'productName',
  'packageCount',
  'actualWeight',
  'chargeWeight',
  'agentName',
  'carrier',
  'channelName',
  'routeAgentChannelName',
  'reason',
  'declarationRequired',
  'sensitive',
  'agentData',
  'etdAt',
  'etaAt',
  'trackingWebsite',
  'handler',
  'handledAt',
  'action'
];

const problemCategoryLabels: Record<Exclude<ProblemCategory, 'all'>, string> = {
  preDeparture: '离港前问题件',
  arrivedPort: '到港问题件',
  delivering: '派送问题件',
  assistance: '需协助问题件',
  history: '问题件历史'
};

type DataConfirmFormValues = {
  remark?: string;
  packageCount?: number;
  weightKg?: number;
  volumeCbm?: number;
  chargeWeightKg?: number;
  pushToSales?: boolean;
};

type DataConfirmApproveTarget = {
  shipment: Shipment;
  kind: 'business' | 'agent';
};

type LifecycleStatusAction = {
  shipment: Shipment;
  targetStatus: ShipmentStatus;
  latestTracking: string;
  targetSection: string;
  title: string;
  okText: string;
  successText: string;
  errorText: string;
};

export function CustomerServicePage({
  shipments: workspaceShipments,
  problemTickets,
  businessCostAudits = [],
  agents = [],
  apiClient,
  onShipmentUpdated,
  onProblemTicketCreated,
  onProblemTicketUpdated,
  onNotice,
  initialSection = 'service-dashboard',
  permissions = [],
  role
}: {
  shipments: Shipment[];
  problemTickets: ProblemTicketSummary[];
  businessCostAudits?: BusinessCostAuditSummary[];
  agents?: AgentSummary[];
  apiClient?: ApiClient;
  onShipmentUpdated?: (shipment: Shipment) => void;
  onProblemTicketCreated?: (ticket: ProblemTicketSummary) => void;
  onProblemTicketUpdated?: (ticket: ProblemTicketSummary) => void;
  onNotice?: (notice: string) => void;
  initialSection?: string;
  permissions?: string[];
  role?: string;
}) {
  const canReadWorkspaceShipments = permissions.includes('business:shipment:list');
  const canReadCustomerServiceStatusPool = [
    'customer-service:pending-routing:view',
    'customer-service:data-confirm:view',
    'customer-service:transfer:view',
    'customer-service:waiting-departure:view',
    'customer-service:departed:view',
    'customer-service:arrived-port:view',
    'customer-service:delivering:view',
    'customer-service:signed:view'
  ].some((permission) => permissions.includes(permission));
  const [customerServiceShipments, setCustomerServiceShipments] = useState<Shipment[]>([]);
  const shipments = canReadWorkspaceShipments ? workspaceShipments : customerServiceShipments;
  const [activeSection, setActiveSection] = useState(initialSection);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [departureForm] = Form.useForm<DepartureFormValues>();
  const [dataConfirmForm] = Form.useForm<DataConfirmFormValues>();
  const [dataEditForm] = Form.useForm<DataConfirmFormValues>();
  const [dataReverseForm] = Form.useForm<{ reason?: string }>();
  const [departureShipment, setDepartureShipment] = useState<Shipment | null>(null);
  const [problemShipment, setProblemShipment] = useState<Shipment | null>(null);
  const [dataConfirmShipment, setDataConfirmShipment] = useState<Shipment | null>(null);
  const [dataConfirmDetailShipment, setDataConfirmDetailShipment] = useState<Shipment | null>(null);
  const [dataConfirmApproveTarget, setDataConfirmApproveTarget] = useState<DataConfirmApproveTarget | null>(null);
  const [dataEditTarget, setDataEditTarget] = useState<{ shipment: Shipment; kind: 'business' | 'agent' } | null>(null);
  const [dataReverseTarget, setDataReverseTarget] = useState<{ shipment: Shipment; kind: 'business' | 'agent' | 'all' } | null>(null);
  const [labelShipment, setLabelShipment] = useState<Shipment | null>(null);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [departedColumnSettingsOpen, setDepartedColumnSettingsOpen] = useState(false);
  const [arrivedPortColumnSettingsOpen, setArrivedPortColumnSettingsOpen] = useState(false);
  const [deliveringColumnSettingsOpen, setDeliveringColumnSettingsOpen] = useState(false);
  const [waitingColumnOrder, setWaitingColumnOrder] = useState<WaitingColumnKey[]>(defaultWaitingColumnOrder);
  const [hiddenWaitingColumns, setHiddenWaitingColumns] = useState<WaitingColumnKey[]>([]);
  const [departedColumnOrder, setDepartedColumnOrder] = useState<DepartedColumnKey[]>(defaultDepartedColumnOrder);
  const [hiddenDepartedColumns, setHiddenDepartedColumns] = useState<DepartedColumnKey[]>([]);
  const [arrivedPortColumnOrder, setArrivedPortColumnOrder] = useState<DepartedColumnKey[]>(defaultDepartedColumnOrder);
  const [hiddenArrivedPortColumns, setHiddenArrivedPortColumns] = useState<DepartedColumnKey[]>([]);
  const [deliveringColumnOrder, setDeliveringColumnOrder] = useState<DepartedColumnKey[]>(defaultDepartedColumnOrder);
  const [hiddenDeliveringColumns, setHiddenDeliveringColumns] = useState<DepartedColumnKey[]>([]);
  const [problemCategory, setProblemCategory] = useState<ProblemCategory>('all');
  const [problemColumnSettingsOpen, setProblemColumnSettingsOpen] = useState(false);
  const [departureConfirmError, setDepartureConfirmError] = useState<string | null>(null);
  const [problemColumnOrder, setProblemColumnOrder] = useState<ProblemColumnKey[]>(defaultProblemColumnOrder);
  const [hiddenProblemColumns, setHiddenProblemColumns] = useState<ProblemColumnKey[]>([]);
  const [problemFilters, setProblemFilters] = useState({
    salesperson: '',
    minDwellDays: '',
    customerCode: '',
    systemOrderNo: '',
    destinationCountry: '',
    agentName: ''
  });
  const [customerServiceAuditLogs, setCustomerServiceAuditLogs] = useState<AuditLogSummary[]>([]);
  const [dataConfirmRows, setDataConfirmRows] = useState<CustomerServiceDataConfirmRow[]>(() => apiClient ? dataConfirmRowsCache.get(apiClient) ?? [] : []);
  const [dataConfirmHasLoaded, setDataConfirmHasLoaded] = useState(() => Boolean(apiClient && dataConfirmRowsCache.has(apiClient)));
  const [dataConfirmLoading, setDataConfirmLoading] = useState(false);
  const [dataConfirmLoadError, setDataConfirmLoadError] = useState<string | null>(null);
  const dataConfirmRequestIdRef = useRef(0);
  const dataConfirmationCycleStartedAtByShipment = useMemo(
    () => new Map([...shipments, ...dataConfirmRows.map((row) => row.shipment)].map((shipment) => [shipment.id, shipment.outboundAt])),
    [dataConfirmRows, shipments]
  );
  const customerServiceAuditIndex = useMemo(
    () => buildCustomerServiceAuditIndex(customerServiceAuditLogs, dataConfirmationCycleStartedAtByShipment),
    [customerServiceAuditLogs, dataConfirmationCycleStartedAtByShipment]
  );
  const [submittingDeparture, setSubmittingDeparture] = useState(false);
  const [submittingDataConfirm, setSubmittingDataConfirm] = useState(false);
  const [submittingSingleDataConfirm, setSubmittingSingleDataConfirm] = useState(false);
  const [submittingDataEdit, setSubmittingDataEdit] = useState(false);
  const [dataEditError, setDataEditError] = useState<string | null>(null);
  const [uploadingLabel, setUploadingLabel] = useState(false);
  const [pendingLabelFile, setPendingLabelFile] = useState<File | null>(null);
  const [labelPreviewUrl, setLabelPreviewUrl] = useState<string | null>(null);
  const [labelRows, setLabelRows] = useState<Record<string, ShipmentLabelSummary[]>>({});
  const [labelLoading, setLabelLoading] = useState(false);
  const [feeDetailShipment, setFeeDetailShipment] = useState<Shipment | null>(null);
  const [feeDetail, setFeeDetail] = useState<ShipmentFinanceDetailSummary | null>(null);
  const [feeDetailLoading, setFeeDetailLoading] = useState(false);
  const [lifecycleStatusAction, setLifecycleStatusAction] = useState<LifecycleStatusAction | null>(null);
  const [lifecycleStatusRemark, setLifecycleStatusRemark] = useState('');
  const [submittingLifecycleStatus, setSubmittingLifecycleStatus] = useState(false);
  const [transferRows, setTransferRows] = useState<Shipment[]>([]);
  const [selectedTransferIds, setSelectedTransferIds] = useState<string[]>([]);
  const [transferFillRows, setTransferFillRows] = useState<Shipment[]>([]);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferForm] = Form.useForm<{ rows: Array<{ transferNo?: string; subOrderNo?: string; pushToSales?: boolean }> }>();
  const canTransferView = permissions.includes('customer-service:transfer:view');
  const canTransferWrite = permissions.includes('customer-service:transfer:write');
  const canTransferBatchWrite = permissions.includes('customer-service:transfer:batch-write');
  const canViewTransferOutboundAt = permissions.includes('customer-service:transfer:view-outbound-time');
  const canViewTransferAgent = permissions.includes('customer-service:transfer:view-agent');
  const canViewTransferAgentData = permissions.includes('customer-service:transfer:view-agent-data');
  const canViewTransferSensitive = permissions.includes('customer-service:transfer:view-sensitive');
  const canViewDataConfirmBusiness = permissions.includes('customer-service:data-confirm:business-view');
  const canViewDataConfirmAgent = permissions.includes('customer-service:data-confirm:agent-view');
  const can = (permission: string) => permissions.includes(permission);
  const canProblemView = can('customer-service:problem:view');
  const canColumnSetting: Record<string, boolean> = {
    dataConfirm: can('customer-service:data-confirm:column-setting'), transferNo: can('customer-service:transfer:column-setting'),
    'pending-routing': can('customer-service:pending-routing:column-setting'), waitingDeparture: can('customer-service:waiting-departure:column-setting'),
    departed: can('customer-service:departed:column-setting'), arrivedPort: can('customer-service:arrived-port:column-setting'),
    delivering: can('customer-service:delivering:column-setting'), signed: can('customer-service:signed:column-setting'),
    problems: can('customer-service:problem:column-setting'), afterSale: can('customer-service:problem:column-setting')
  };
  const items: ModuleSubNavItem[] = [
    ...(can('customer-service:dashboard:view') ? [{ key: 'service-dashboard', label: '客服看板' }] : []),
    ...(can('customer-service:pending-routing:view') ? [{ key: 'pending-routing', label: '待排货' }] : []),
    ...(can('customer-service:data-confirm:view') ? [{ key: 'dataConfirm', label: '数据确认' }] : []),
    ...(canTransferView ? [{ key: 'transferNo', label: '转单号' }] : []),
    ...(can('customer-service:waiting-departure:view') ? [{ key: 'waitingDeparture', label: '待离港' }] : []),
    ...(can('customer-service:departed:view') ? [{ key: 'departed', label: '已离港' }] : []),
    ...(can('customer-service:arrived-port:view') ? [{ key: 'arrivedPort', label: '已到港' }] : []),
    ...(can('customer-service:delivering:view') ? [{ key: 'delivering', label: '已派送' }] : []),
    ...(can('customer-service:signed:view') ? [{ key: 'signed', label: '已签收' }] : []),
    ...(canProblemView ? [{ key: 'problems', label: '问题件' }] : []),
    ...(can('customer-service:problem:after-sale-view') || can('customer-service:signed:after-sale-view') ? [{ key: 'afterSale', label: '需协助问题件' }] : [])
  ];
  useEffect(() => {
    if (canReadWorkspaceShipments || !canReadCustomerServiceStatusPool || !apiClient) return;
    let cancelled = false;
    apiClient.customerServiceShipments()
      .then((rows) => {
        if (!cancelled) setCustomerServiceShipments(rows);
      })
      .catch((error) => {
        if (!cancelled) message.error(error instanceof Error ? error.message : '客服状态池加载失败');
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, canReadCustomerServiceStatusPool, canReadWorkspaceShipments]);
  useEffect(() => {
    if (canReadWorkspaceShipments || !canReadCustomerServiceStatusPool || !workspaceShipments.length) return;
    setCustomerServiceShipments((current) => {
      const next = new Map(current.map((shipment) => [shipment.id, shipment]));
      workspaceShipments.forEach((shipment) => next.set(shipment.id, shipment));
      return [...next.values()];
    });
  }, [canReadCustomerServiceStatusPool, canReadWorkspaceShipments, workspaceShipments]);
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);
  useEffect(() => {
    if (items.length && !items.some((item) => item.key === activeSection)) setActiveSection(items[0].key);
  }, [activeSection, items]);
  useEffect(() => {
    if (activeSection !== 'waitingDeparture') {
      setDepartureConfirmError(null);
    }
  }, [activeSection]);
  useEffect(() => () => clearPendingLabelFile(), []);
  const dataConfirmReviewByShipmentId = useMemo(
    () => new Map(dataConfirmRows.map((row) => [row.shipment.id, row])),
    [dataConfirmRows]
  );
  const rows = useMemo(() => {
    if (activeSection === 'dataConfirm') return dataConfirmRows.map((row) => row.shipment);
    const statuses = statusSections[activeSection] ?? [];
    if (!statuses.length) return [];
    return shipments.filter((shipment) => {
      if (!statuses.includes(shipment.status)) return false;
      if (activeSection === 'transferNo') return isBusinessDataApproved(shipment.id, customerServiceAuditIndex)
        && isAgentDataApproved(shipment.id, customerServiceAuditIndex);
      return true;
    });
  }, [activeSection, customerServiceAuditIndex, dataConfirmRows, shipments]);
  const shipmentById = useMemo(() => new Map(shipments.map((shipment) => [shipment.id, shipment])), [shipments]);
  const waitingDepartureDateHint = useMemo(() => {
    const waitingRows = shipments.filter((shipment) => shipment.status === 'WAITING_DEPARTURE');
    const missingBoth = waitingRows.filter((shipment) => !shipment.etdAt && !shipment.etaAt).length;
    const missingEtd = waitingRows.filter((shipment) => !shipment.etdAt && shipment.etaAt).length;
    const missingEta = waitingRows.filter((shipment) => shipment.etdAt && !shipment.etaAt).length;
    if (missingBoth) return `待离港有 ${missingBoth} 票需补充 ETD/ATD 和 ETA/ATA`;
    if (missingEtd) return `待离港有 ${missingEtd} 票需补充 ETD/ATD`;
    if (missingEta) return `待离港有 ${missingEta} 票需补充 ETA/ATA`;
    return waitingRows.length ? '日期已完整，待确认离港' : null;
  }, [shipments]);
  const pendingRoutingShipments = useMemo(() => shipments.filter((shipment) => shipment.status === 'WAITING_SORT'), [shipments]);
  const currentLabel = labelShipment ? latestCreatedLabel(labelRows[labelShipment.id] ?? []) : undefined;
  const renderWaitingDepartureActions = (row: Shipment) => (
    <Space size={6} className="customer-service-waiting-departure-actions">
      <Button size="small" onClick={() => openDepartureModal(row)}>
        修改
      </Button>
      <Button size="small" type="primary" onClick={() => confirmDeparted(row)}>
        确认离港
      </Button>
      <Button size="small" onClick={() => openProblemModal(row)}>
        问题件
      </Button>
      <Button size="small" onClick={() => openLabelModal(row)}>
        {hasShipmentLabel(row, labelRows) ? '查看面单' : '上传面单'}
      </Button>
      {hasShipmentLabel(row, labelRows) ? <Tag color="green">已上传面单</Tag> : null}
    </Space>
  );
  const columns: ColumnsType<Shipment> = [
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 170, render: (_: string, row) => resolveShipmentOutboundOrderNo(row) },
    { title: '出货单号', dataIndex: 'customerOrderNo', width: 150 },
    { title: '客户', dataIndex: 'customerName', width: 160 },
    { title: '转单号', dataIndex: 'transferNo', width: 160, render: (value?: string) => value || '-' },
    { title: '最新物流轨迹', dataIndex: 'latestTracking' },
    { title: '状态', dataIndex: 'status', width: 120, render: (status: ShipmentStatus) => <StatusTag status={status} /> }
  ];
  const waitingColumnMap: Record<WaitingColumnKey, ManagedTableColumns<Shipment>[number]> = {
    entryAt: { title: '运单创建时间', dataIndex: 'entryAt', width: 170, render: (_: string | undefined, row) => formatBeijingDateTime(row.entryAt ?? row.createdAt) },
    outboundAt: { title: '出库时间', dataIndex: 'outboundAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    salesperson: { title: '业务员', dataIndex: 'salesperson', width: 110, render: (value?: string) => value || '-' },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 110, render: (value?: string) => value || '-' },
    destinationCountry: { title: '目的地', dataIndex: 'destinationCountry', width: 100 },
    productName: { title: '品名', dataIndex: 'productName', width: 130, render: (value?: string) => value || '-' },
    packageCount: { title: '件数', dataIndex: 'packageCount', width: 80 },
    actualWeight: { title: '业务重量 KG', dataIndex: 'actualWeightKg', width: 110, render: (value: number | undefined, row) => value ?? row.receivableWeightKg ?? '-' },
    volumeCbm: { title: '业务体积 CBM', dataIndex: 'volumeCbm', width: 115, render: (value: number | undefined) => value ?? '-' },
    chargeWeight: { title: '计费重', dataIndex: 'receivableWeightKg', width: 90 },
    agentWeightKg: { title: '代理计费重', dataIndex: 'agentWeightKg', width: 110 },
    businessReviewStatus: { title: '业务审核状态', key: 'businessReviewStatus', width: 110, render: (_, row) => isBusinessDataApproved(row.id, customerServiceAuditIndex) ? <Tag color="green">已审核</Tag> : <Tag>待审核</Tag> },
    agentPackageCount: { title: '代理件数', key: 'agentPackageCount', width: 100, render: (_, row) => getLatestDataSnapshot(row.id, customerServiceAuditIndex, 'agent')?.packageCount ?? row.packageCount ?? '-' },
    agentActualWeight: { title: '代理重量 KG', key: 'agentActualWeight', width: 110, render: (_, row) => getLatestDataSnapshot(row.id, customerServiceAuditIndex, 'agent')?.weightKg ?? row.actualWeightKg ?? row.receivableWeightKg ?? '-' },
    agentVolumeCbm: { title: '代理体积 CBM', key: 'agentVolumeCbm', width: 115, render: (_, row) => getLatestDataSnapshot(row.id, customerServiceAuditIndex, 'agent')?.volumeCbm ?? row.volumeCbm ?? '-' },
    agentReviewStatus: { title: '代理审核状态', key: 'agentReviewStatus', width: 110, render: (_, row) => isAgentDataApproved(row.id, customerServiceAuditIndex) ? <Tag color="green">已审核</Tag> : <Tag>待审核</Tag> },
    declarationRequired: { title: '报关', dataIndex: 'declarationRequired', width: 80, render: (value?: boolean) => <ShipmentRiskFlag value={value} /> },
    sensitive: { title: '敏感', dataIndex: 'sensitive', width: 80, render: (value?: boolean) => <ShipmentRiskFlag value={value} /> },
    agentName: { title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 190, render: (value?: string) => value || '-' },
    carrier: { title: '承运商', dataIndex: 'carrier', width: 120, render: (value?: string) => value || '-' },
    channelName: { title: '公司渠道', dataIndex: 'channelName', width: 150, render: (value?: string) => value || '-' },
    routeAgentChannelName: { title: agentFieldLabels.channel, dataIndex: 'routeAgentChannelName', width: 150, render: (value?: string) => value || '-' },
    systemOrderNo: { title: '出货单号', dataIndex: 'systemOrderNo', width: 170, render: (_: string, row) => resolveShipmentOutboundOrderNo(row) },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 150, render: (value?: string) => value || '-' },
    etdAt: { title: 'ETD/ATD', dataIndex: 'etdAt', width: 150, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    etaAt: { title: 'ETA/ATA', dataIndex: 'etaAt', width: 150, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 190,
      resizable: false,
      render: (_, row) => renderWaitingDepartureActions(row)
    }
  };
  const waitingDepartureColumns = waitingColumnOrder
    .filter((key) => !hiddenWaitingColumns.includes(key))
    .map((key) => waitingColumnMap[key]);
  const waitingDepartureMatrixColumns: ManagedTableColumns<Shipment> = [
    {
      key: 'matrixBasic',
      title: '基础信息',
      width: 190,
      className: 'managed-matrix-group-primary',
      render: (_, row) => (
        <ManagedMatrixCell
          labelWidth={74}
          fields={[
            { key: 'entryAt', label: '运单创建时间', value: <ManagedMatrixDateTime value={formatBeijingDateTime(row.entryAt ?? row.createdAt)} /> },
            { key: 'outboundAt', label: '出库时间', value: row.outboundAt ? <ManagedMatrixDateTime value={formatBeijingDateTime(row.outboundAt)} /> : '-' },
            { key: 'salesperson', label: '业务员', value: row.salesperson || '-' },
            { key: 'customerCode', label: '客户编号', value: row.customerCode || '-', emphasis: true }
          ]}
        />
      )
    },
    {
      key: 'matrixCargo',
      title: '货物信息',
      width: 170,
      render: (_, row) => (
        <ManagedMatrixCell
          labelWidth={58}
          fields={[
            { key: 'destinationCountry', label: '目的地', value: row.destinationCountry || '-' },
            { key: 'productName', label: '品名', value: row.productName || '-', title: row.productName, wrap: true },
            { key: 'packageCount', label: '件数', value: row.packageCount ?? '-' },
            { key: 'declarationRequired', label: '报关', value: <ShipmentRiskFlag value={row.declarationRequired} /> },
            { key: 'sensitive', label: '敏感', value: <ShipmentRiskFlag value={row.sensitive} /> }
          ]}
        />
      )
    },
    {
      key: 'matrixMeasurement',
      title: '重量体积',
      width: 190,
      render: (_, row) => (
        <ManagedMatrixCell
          labelWidth={82}
          fields={[
            { key: 'actualWeight', label: '业务重量 KG', value: row.actualWeightKg ?? row.receivableWeightKg ?? '-' },
            { key: 'volumeCbm', label: '业务体积 CBM', value: row.volumeCbm ?? '-' },
            { key: 'chargeWeight', label: '计费重', value: row.receivableWeightKg ?? '-' },
            { key: 'agentWeightKg', label: '代理计费重', value: row.agentWeightKg ?? '-' }
          ]}
        />
      )
    },
    {
      key: 'matrixRoute',
      title: '路线与代理',
      width: 230,
      render: (_, row) => (
        <ManagedMatrixCell
          labelWidth={82}
          fields={[
            { key: 'agentName', label: agentFieldLabels.detailedCompanyName, value: row.agentName || '-', title: row.agentName, wrap: true },
            { key: 'carrier', label: '承运商', value: row.carrier || '-' },
            { key: 'channelName', label: '公司渠道', value: row.channelName || '-', title: row.channelName, wrap: true },
            { key: 'routeAgentChannelName', label: agentFieldLabels.channel, value: row.routeAgentChannelName || '-', title: row.routeAgentChannelName, wrap: true }
          ]}
        />
      )
    },
    {
      key: 'matrixShipment',
      title: '运单节点',
      width: 220,
      render: (_, row) => (
        <ManagedMatrixCell
          labelWidth={62}
          fields={[
            { key: 'systemOrderNo', label: '出货单号', value: resolveShipmentOutboundOrderNo(row), emphasis: true },
            { key: 'transferNo', label: '转单号', value: row.transferNo || '-' },
            { key: 'etdAt', label: 'ETD/ATD', value: row.etdAt ? <ManagedMatrixDateTime value={formatBeijingDateTime(row.etdAt)} /> : '-' },
            { key: 'etaAt', label: 'ETA/ATA', value: row.etaAt ? <ManagedMatrixDateTime value={formatBeijingDateTime(row.etaAt)} /> : '-' }
          ]}
        />
      )
    },
    {
      key: 'matrixActions',
      title: '操作',
      fixed: 'right',
      width: 170,
      render: (_, row) => renderWaitingDepartureActions(row)
    }
  ];
  const dataConfirmColumnOrder: WaitingColumnKey[] = [
    'entryAt',
    'outboundAt',
    'salesperson',
    'customerCode',
    'destinationCountry',
    'productName',
    'packageCount',
    'actualWeight',
    'volumeCbm',
    'chargeWeight',
    'businessReviewStatus',
    'agentPackageCount',
    'agentActualWeight',
    'agentVolumeCbm',
    'agentWeightKg',
    'agentReviewStatus',
    'declarationRequired',
    'sensitive',
    'agentName',
    'carrier',
    'channelName',
    'routeAgentChannelName',
    'systemOrderNo',
    'transferNo',
    'action'
  ];
  const businessDataConfirmColumnKeys = new Set<WaitingColumnKey>(['packageCount', 'actualWeight', 'volumeCbm', 'chargeWeight', 'businessReviewStatus', 'declarationRequired', 'sensitive']);
  const agentDataConfirmColumnKeys = new Set<WaitingColumnKey>(['agentPackageCount', 'agentActualWeight', 'agentVolumeCbm', 'agentWeightKg', 'agentReviewStatus', 'agentName', 'carrier', 'channelName', 'routeAgentChannelName']);
  const dataConfirmColumns: ColumnsType<Shipment> = dataConfirmColumnOrder
    .filter((key) => (canViewDataConfirmBusiness || !businessDataConfirmColumnKeys.has(key))
      && (canViewDataConfirmAgent || !agentDataConfirmColumnKeys.has(key)))
    .map((key) => (
    key === 'action'
      ? {
          title: '操作',
          key: 'action',
          fixed: 'right',
          width: 430,
          render: (_, row) => {
            const review = dataConfirmReviewByShipmentId.get(row.id);
            const businessApproved = review?.businessDataApproved === true;
            const agentApproved = review?.agentDataApproved === true;
            return (
              <Space size={4} wrap>
                <Button size="small" onClick={() => setDataConfirmDetailShipment(row)}>
                  详情
                </Button>
                {!businessApproved ? <>{can('customer-service:data-confirm:business-approve') ? <Button size="small" onClick={() => setDataConfirmApproveTarget({ shipment: row, kind: 'business' })}>业务审核</Button> : null}{can('customer-service:data-confirm:business-update') ? <Button size="small" onClick={() => openDataEdit(row, 'business')}>业务修改</Button> : null}</> : can('customer-service:data-confirm:reverse') ? <Button size="small" danger onClick={() => openDataReverse(row, 'business')}>业务反审核</Button> : null}
                {!agentApproved ? <>{can('customer-service:data-confirm:agent-approve') ? <Button size="small" onClick={() => setDataConfirmApproveTarget({ shipment: row, kind: 'agent' })}>代理审核</Button> : null}{can('customer-service:data-confirm:agent-update') ? <Button size="small" onClick={() => openDataEdit(row, 'agent')}>代理修改</Button> : null}</> : can('customer-service:data-confirm:reverse') ? <Button size="small" danger onClick={() => openDataReverse(row, 'agent')}>代理反审核</Button> : null}
                {!businessApproved && !agentApproved && can('customer-service:data-confirm:approve-all') ? <Button size="small" type="primary" onClick={() => openDataConfirmModal(row)}>全部审核</Button> : null}
                {businessApproved && agentApproved && can('customer-service:data-confirm:reverse') ? <Button size="small" danger onClick={() => openDataReverse(row, 'all')}>全部反审核</Button> : null}
              </Space>
            );
          }
        }
      : key === 'businessReviewStatus'
        ? { title: '业务审核状态', key, width: 110, render: (_, row) => dataConfirmReviewByShipmentId.get(row.id)?.businessDataApproved ? <Tag color="green">已审核</Tag> : <Tag>待审核</Tag> }
        : key === 'agentPackageCount'
          ? { title: '代理件数', key, width: 100, render: (_, row) => dataConfirmReviewByShipmentId.get(row.id)?.agentDataSnapshot?.packageCount ?? row.packageCount ?? '-' }
          : key === 'agentActualWeight'
            ? { title: '代理重量 KG', key, width: 110, render: (_, row) => dataConfirmReviewByShipmentId.get(row.id)?.agentDataSnapshot?.weightKg ?? row.actualWeightKg ?? row.receivableWeightKg ?? '-' }
            : key === 'agentVolumeCbm'
              ? { title: '代理体积 CBM', key, width: 115, render: (_, row) => dataConfirmReviewByShipmentId.get(row.id)?.agentDataSnapshot?.volumeCbm ?? row.volumeCbm ?? '-' }
              : key === 'agentReviewStatus'
                ? { title: '代理审核状态', key, width: 110, render: (_, row) => dataConfirmReviewByShipmentId.get(row.id)?.agentDataApproved ? <Tag color="green">已审核</Tag> : <Tag>待审核</Tag> }
      : waitingColumnMap[key]
    ));
  const departedColumnMap: Record<DepartedColumnKey, ColumnsType<Shipment>[number]> = {
    entryAt: { title: '运单创建时间', dataIndex: 'entryAt', width: 170, render: (_: string | undefined, row) => formatBeijingDateTime(row.entryAt ?? row.createdAt) },
    outboundAt: { title: '出库时间', dataIndex: 'outboundAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    salesperson: { title: '业务员', dataIndex: 'salesperson', width: 110, render: (value?: string) => value || '-' },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 110, render: (value?: string) => value || '-' },
    destinationCountry: { title: '目的地', dataIndex: 'destinationCountry', width: 100 },
    productName: { title: '品名', dataIndex: 'productName', width: 130, render: (value?: string) => value || '-' },
    packageCount: { title: '件数', dataIndex: 'packageCount', width: 80 },
    actualWeight: { title: '实重', dataIndex: 'receivableWeightKg', width: 90 },
    chargeWeight: { title: '计费重', dataIndex: 'receivableWeightKg', width: 90 },
    declarationRequired: { title: '报关', dataIndex: 'declarationRequired', width: 80, render: (value?: boolean) => <ShipmentRiskFlag value={value} /> },
    sensitive: { title: '敏感', dataIndex: 'sensitive', width: 80, render: (value?: boolean) => <ShipmentRiskFlag value={value} /> },
    agentName: { title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 190, render: (value?: string) => value || '-' },
    carrier: { title: '承运商', dataIndex: 'carrier', width: 120, render: (value?: string) => value || '-' },
    channelName: { title: '公司渠道', dataIndex: 'channelName', width: 150, render: (value?: string) => value || '-' },
    routeAgentChannelName: { title: agentFieldLabels.channel, dataIndex: 'routeAgentChannelName', width: 150, render: (value?: string) => value || '-' },
    systemOrderNo: { title: '出货单号', dataIndex: 'systemOrderNo', width: 170, render: (_: string, row) => resolveShipmentOutboundOrderNo(row) },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 150, render: (value?: string) => value || '-' },
    agentData: { title: '代理数据', key: 'agentData', width: 100, render: (_, row) => isAgentDataApproved(row.id, customerServiceAuditIndex) ? '已确认' : '-' },
    etdAt: { title: 'ETD/ATD', dataIndex: 'etdAt', width: 150, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    etaAt: { title: 'ETA/ATA', dataIndex: 'etaAt', width: 150, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    trackingWebsite: {
      title: '查件网址',
      key: 'trackingWebsite',
      width: 220,
      render: (_, row) => renderTrackingWebsite(row, customerServiceAuditIndex)
    },
    handler: { title: '处理人', key: 'handler', width: 110, render: (_, row) => getStatusLog(row.id, customerServiceAuditIndex, 'DEPARTED')?.actorUsername ?? '-' },
    handledAt: { title: '处理时间', key: 'handledAt', width: 170, render: (_, row) => formatMaybeDateTime(getStatusLog(row.id, customerServiceAuditIndex, 'DEPARTED')?.createdAt) },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 260,
      render: (_, row) => (
        <Space size={6}>
          {can('customer-service:departed:update-info') ? <Button size="small" onClick={() => openDepartedEditModal(row)}>
            修改
          </Button> : null}
          {can('customer-service:departed:confirm-arrived-port') ? <Button size="small" type="primary" onClick={() => markArrivedPort(row)}>
            确认到港
          </Button> : null}
          {can('customer-service:departed:problem-create') ? <Button size="small" onClick={() => openProblemModal(row)}>
            问题件
          </Button> : null}
        </Space>
      )
    }
  };
  const departedColumns = departedColumnOrder
    .filter((key) => !hiddenDepartedColumns.includes(key))
    .map((key) => departedColumnMap[key]);
  const arrivedPortColumnMap: Record<DepartedColumnKey, ColumnsType<Shipment>[number]> = {
    ...departedColumnMap,
    handler: { title: '处理人', key: 'handler', width: 110, render: (_, row) => getStatusLog(row.id, customerServiceAuditIndex, 'ARRIVED_PORT')?.actorUsername ?? '-' },
    handledAt: { title: '处理时间', key: 'handledAt', width: 170, render: () => '-' },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 230,
      render: (_, row) => (
        <Space size={6}>
          {can('customer-service:arrived-port:update-info') ? <Button size="small" onClick={() => openDepartedEditModal(row)}>
            修改
          </Button> : null}
          {can('customer-service:arrived-port:confirm-delivering') ? <Button size="small" type="primary" onClick={() => markDelivering(row)}>
            确认派送/增加批注
          </Button> : null}
          {can('customer-service:arrived-port:problem-create') ? <Button size="small" onClick={() => openProblemModal(row)}>
            问题件
          </Button> : null}
        </Space>
      )
    }
  };
  const arrivedPortColumns = arrivedPortColumnOrder
    .filter((key) => !hiddenArrivedPortColumns.includes(key))
    .map((key) => arrivedPortColumnMap[key]);
  const deliveringColumnMap: Record<DepartedColumnKey, ColumnsType<Shipment>[number]> = {
    ...departedColumnMap,
    handler: { title: '处理人', key: 'handler', width: 110, render: (_, row) => getStatusLog(row.id, customerServiceAuditIndex, 'ARRIVED_PORT')?.actorUsername ?? '-' },
    handledAt: { title: '处理时间', key: 'handledAt', width: 170, render: (_, row) => formatMaybeDateTime(getStatusLog(row.id, customerServiceAuditIndex, 'DELIVERING')?.createdAt) },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 280,
      render: (_, row) => (
        <Space size={6}>
          {can('customer-service:delivering:update-info') ? <Button size="small" onClick={() => openDepartedEditModal(row)}>
            修改
          </Button> : null}
          {can('customer-service:delivering:confirm-signed') ? <Button size="small" type="primary" onClick={() => markSigned(row)}>
            确认签收/增加批注
          </Button> : null}
          {can('customer-service:delivering:after-sale-create') || can('customer-service:delivering:problem-create') ? <Button size="small" onClick={() => openProblemModal(row)}>
            售后问题
          </Button> : null}
        </Space>
      )
    }
  };
  const deliveringColumns = deliveringColumnOrder
    .filter((key) => !hiddenDeliveringColumns.includes(key))
    .map((key) => deliveringColumnMap[key]);
  const signedProblemActionColumns: ColumnsType<Shipment> = [
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 260,
      render: (_, row) => (
        <Space size={6}>
          {can('customer-service:signed:remark') ? <Button size="small" onClick={() => openDepartedEditModal(row)}>
            修改
          </Button> : null}
          {can('customer-service:signed:remark') ? <Button size="small" type="primary" onClick={() => addSignedRemark(row)}>
            增加批注
          </Button> : null}
          {can('customer-service:signed:after-sale-create') ? <Button size="small" onClick={() => openProblemModal(row)}>问题件</Button> : null}
        </Space>
      )
    }
  ];
  const rawProblemRows = useMemo(() => {
    return problemTickets.map((ticket) => {
      const shipment = shipmentById.get(ticket.shipmentId);
      const category = getProblemCategory(ticket, shipment, customerServiceAuditIndex);
      return {
        ticket,
        shipment,
        category,
        categoryLabel: problemCategoryLabels[category],
        dwellDays: problemDwellDays(ticket.createdAt)
      };
    });
  }, [customerServiceAuditIndex, problemTickets, shipmentById]);
  const problemRows = useMemo(() => {
    const minDwellDays = Number(problemFilters.minDwellDays);
    return rawProblemRows.filter((row) => {
      if (problemCategory === 'all' && row.ticket.status === 'CLOSED') return false;
      if (problemCategory !== 'all' && row.category !== problemCategory) return false;
      const shipment = row.shipment;
      return keywordMatch(shipment?.salesperson, problemFilters.salesperson)
        && (!Number.isFinite(minDwellDays) || !problemFilters.minDwellDays || row.dwellDays >= minDwellDays)
        && keywordMatch(shipment?.customerCode, problemFilters.customerCode)
        && keywordMatch(resolveShipmentOutboundOrderNo(row.shipment ?? row.ticket), problemFilters.systemOrderNo)
        && keywordMatch(shipment?.destinationCountry, problemFilters.destinationCountry)
        && keywordMatch(shipment?.agentName, problemFilters.agentName);
    });
  }, [problemCategory, problemFilters, rawProblemRows]);
  const afterSaleRows = useMemo(() => rawProblemRows.filter((row) => row.category === 'assistance'), [rawProblemRows]);
  const problemCategoryCounts = useMemo(() => {
    const counts: Record<Exclude<ProblemCategory, 'all'>, number> = { preDeparture: 0, arrivedPort: 0, delivering: 0, assistance: 0, history: 0 };
    rawProblemRows.forEach((row) => {
      counts[row.category] += 1;
    });
    return counts;
  }, [rawProblemRows]);
  const dashboardMetrics = useMemo(() => {
    const currentStatusCounts = new Map<ShipmentStatus, number>();
    shipments.forEach((shipment) => currentStatusCounts.set(shipment.status, (currentStatusCounts.get(shipment.status) ?? 0) + 1));
    const weeklyStatusCounts = new Map<string, number>();
    customerServiceAuditLogs.forEach((row) => {
      const after = getAuditAfter(row);
      if (row.action === 'customer_service.status.update' && typeof after.statusTo === 'string' && isCurrentWeek(row.createdAt)) {
        weeklyStatusCounts.set(after.statusTo, (weeklyStatusCounts.get(after.statusTo) ?? 0) + 1);
      }
    });
    const currentStatusCount = (status: ShipmentStatus) => currentStatusCounts.get(status) ?? 0;
    const weeklyStatusCount = (status: ShipmentStatus) => weeklyStatusCounts.get(status) ?? 0;
    const todayEntryCount = shipments.filter((shipment) => isToday(shipment.entryAt ?? shipment.createdAt)).length;
    const dataConfirmCount = shipments.filter((shipment) => shipment.status === 'OUTBOUNDED'
      && (!isBusinessDataApproved(shipment.id, customerServiceAuditIndex)
        || !isAgentDataApproved(shipment.id, customerServiceAuditIndex))).length;
    const missingTransferCount = shipments.filter((shipment) =>
      ['OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'].includes(shipment.status)
      && isBusinessDataApproved(shipment.id, customerServiceAuditIndex)
      && isAgentDataApproved(shipment.id, customerServiceAuditIndex)
      && !shipment.transferNo
    ).length;
    const pendingRoutingCount = pendingRoutingShipments.length;
    const openProblemCount = problemTickets.filter((ticket) => ticket.status !== 'CLOSED').length;
    const afterSaleOpenCount = rawProblemRows.filter((row) => row.category === 'assistance').length;
    const slaTimeoutCount = shipments.filter((shipment) => (shipment.trackingStaleDays ?? 0) >= 5).length;
    const missingTrackingRiskCount = shipments.filter((shipment) =>
      ['WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING'].includes(shipment.status)
      && (!shipment.latestTracking || (shipment.trackingStaleDays ?? 0) > 0)
    ).length;
    const weeklyProblemCount = problemTickets.filter((ticket) => isCurrentWeek(ticket.createdAt)).length;
    const weeklyNewCustomerCount = new Set(
      shipments
        .filter((shipment) => shipment.systemOrderNo.includes('001') && isCurrentWeek(shipment.entryAt ?? shipment.createdAt))
        .map((shipment) => shipment.customerCode || shipment.customerName || shipment.systemOrderNo)
    ).size;
    const weeklySignedCount = weeklyStatusCount('SIGNED');
    const weeklyFlowTotal = weeklyStatusCount('DEPARTED') + weeklyStatusCount('ARRIVED_PORT') + weeklyStatusCount('DELIVERING') + weeklySignedCount;
    const completionRate = weeklyFlowTotal ? Math.round((weeklySignedCount / weeklyFlowTotal) * 100) : 0;
    const groups: CustomerServiceDashboardGroup[] = [
      {
        title: '今日待处理',
        helper: todayEntryCount ? `今日新增 ${todayEntryCount} 单，优先补齐关键节点` : '今日暂无新增录单',
        items: [
          { key: 'dataConfirm', label: '数据确认', value: dataConfirmCount, helper: '待核对出库后业务数据', section: 'dataConfirm', tone: dataConfirmCount ? 'amber' : 'gray' },
          { key: 'transferNo', label: '缺转单号', value: missingTransferCount, helper: '已确认数据但未补转单号', section: 'transferNo', tone: missingTransferCount ? 'amber' : 'gray' },
          { key: 'pending-routing', label: '待排货', value: pendingRoutingCount, helper: '待市场排货，只读跟进', section: 'pending-routing', tone: pendingRoutingCount ? 'amber' : 'gray' },
          { key: 'waitingDeparture', label: '待离港', value: currentStatusCount('WAITING_DEPARTURE'), helper: '等待离港确认', section: 'waitingDeparture', tone: currentStatusCount('WAITING_DEPARTURE') ? 'blue' : 'gray' }
        ]
      },
      {
        title: '运输流转',
        helper: '按客服状态池跟进运输节点',
        items: [
          { key: 'departed', label: '已离港', value: currentStatusCount('DEPARTED'), helper: '待跟进到港', section: 'departed', tone: currentStatusCount('DEPARTED') ? 'blue' : 'gray' },
          { key: 'arrivedPort', label: '已到港', value: currentStatusCount('ARRIVED_PORT'), helper: '待派送或提取', section: 'arrivedPort', tone: currentStatusCount('ARRIVED_PORT') ? 'blue' : 'gray' },
          { key: 'delivering', label: '已派送', value: currentStatusCount('DELIVERING'), helper: '等待签收归档', section: 'delivering', tone: currentStatusCount('DELIVERING') ? 'blue' : 'gray' },
          { key: 'signed', label: '已签收', value: currentStatusCount('SIGNED'), helper: '已完成客户侧结果', section: 'signed', tone: currentStatusCount('SIGNED') ? 'green' : 'gray' }
        ]
      },
      {
        title: '异常与 SLA',
        helper: openProblemCount || slaTimeoutCount ? '优先处理红色风险项' : '暂无异常风险',
        items: [
          { key: 'openProblems', label: '未关闭问题件', value: openProblemCount, helper: '仍需客服闭环', section: 'problems', tone: openProblemCount ? 'red' : 'gray' },
          { key: 'afterSale', label: '需协助问题件', value: afterSaleOpenCount, helper: '等待协助处理', section: 'afterSale', tone: afterSaleOpenCount ? 'red' : 'gray' },
          { key: 'slaTimeout', label: '超时跟进', value: slaTimeoutCount, helper: '轨迹停留超过 5 天', section: 'departed', tone: slaTimeoutCount ? 'red' : 'gray' },
          { key: 'trackingRisk', label: '缺轨迹风险', value: missingTrackingRiskCount, helper: '轨迹缺失或已停滞', section: 'departed', tone: missingTrackingRiskCount ? 'red' : 'gray' }
        ]
      },
      {
        title: '本周结果',
        helper: completionRate ? `本周完成率 ${completionRate}%` : '本周暂无完成结果',
        items: [
          { key: 'weeklyNewCustomers', label: '本周新客户', value: weeklyNewCustomerCount, helper: '按本周录单客户去重', section: 'service-dashboard', tone: weeklyNewCustomerCount ? 'green' : 'gray' },
          { key: 'weeklyProblems', label: '本周异常件', value: weeklyProblemCount, helper: '本周新建问题件', section: 'problems', tone: weeklyProblemCount ? 'red' : 'gray' },
          { key: 'weeklySigned', label: '本周已签收', value: weeklySignedCount, helper: '本周流转到签收', section: 'signed', tone: weeklySignedCount ? 'green' : 'gray' },
          { key: 'completionRate', label: '完成率', value: `${completionRate}%`, helper: '签收 / 本周流转结果', section: 'signed', tone: completionRate ? 'green' : 'gray' }
        ]
      }
    ];
    const maxValue = Math.max(1, ...groups.flatMap((group) => group.items.map((item) => getDashboardTaskNumericValue(item.value))));
    return { groups, maxValue };
  }, [customerServiceAuditIndex, customerServiceAuditLogs, pendingRoutingShipments.length, problemTickets, rawProblemRows, shipments]);
  const problemColumnMap: Record<ProblemColumnKey, ColumnsType<ProblemRow>[number]> = {
    entryAt: { title: '运单创建时间', key: 'entryAt', width: 170, render: (_, row) => row.shipment ? formatBeijingDateTime(row.shipment.entryAt ?? row.shipment.createdAt) : '-' },
    outboundAt: { title: '出库时间', key: 'outboundAt', width: 170, render: (_, row) => row.shipment?.outboundAt ? formatBeijingDateTime(row.shipment.outboundAt) : '-' },
    category: { title: '问题件类别', dataIndex: 'categoryLabel', width: 130 },
    dwellDays: { title: '问题件停留时间', dataIndex: 'dwellDays', width: 130, render: (value: number) => `${value}天` },
    salesperson: { title: '业务员', key: 'salesperson', width: 110, render: (_, row) => row.shipment?.salesperson || '-' },
    customerCode: { title: '客户编号', key: 'customerCode', width: 110, render: (_, row) => row.shipment?.customerCode || '-' },
    destinationCountry: { title: '目的地', key: 'destinationCountry', width: 100, render: (_, row) => row.shipment?.destinationCountry || '-' },
    systemOrderNo: { title: '出货单号', key: 'systemOrderNo', width: 170, render: (_, row) => resolveShipmentOutboundOrderNo(row.shipment ?? row.ticket) },
    transferNo: { title: '转单号', key: 'transferNo', width: 150, render: (_, row) => row.shipment?.transferNo || '-' },
    productName: { title: '品名', key: 'productName', width: 130, render: (_, row) => row.shipment?.productName || '-' },
    packageCount: { title: '件数', key: 'packageCount', width: 80, render: (_, row) => row.shipment?.packageCount ?? '-' },
    actualWeight: { title: '实重', key: 'actualWeight', width: 90, render: (_, row) => row.shipment?.receivableWeightKg ?? '-' },
    chargeWeight: { title: '计费重', key: 'chargeWeight', width: 90, render: (_, row) => row.shipment?.receivableWeightKg ?? '-' },
    agentName: { title: agentFieldLabels.detailedCompanyName, key: 'agentName', width: 190, render: (_, row) => row.shipment?.agentName || '-' },
    carrier: { title: '承运商', key: 'carrier', width: 120, render: (_, row) => row.shipment?.carrier || '-' },
    channelName: { title: '公司渠道', key: 'channelName', width: 150, render: (_, row) => row.shipment?.channelName || '-' },
    routeAgentChannelName: { title: agentFieldLabels.channel, key: 'routeAgentChannelName', width: 150, render: (_, row) => row.shipment?.routeAgentChannelName || '-' },
    reason: { title: '问题件内容', key: 'reason', width: 220, render: (_, row) => row.ticket.reason },
    declarationRequired: { title: '报关', key: 'declarationRequired', width: 80, render: (_, row) => <ShipmentRiskFlag value={row.shipment ? row.shipment.declarationRequired : '-'} /> },
    sensitive: { title: '敏感', key: 'sensitive', width: 80, render: (_, row) => <ShipmentRiskFlag value={row.shipment ? row.shipment.sensitive : '-'} /> },
    agentData: { title: '代理数据', key: 'agentData', width: 100, render: (_, row) => row.shipment && isAgentDataApproved(row.shipment.id, customerServiceAuditIndex) ? '已确认' : '-' },
    etdAt: { title: 'ETD/ATD', key: 'etdAt', width: 150, render: (_, row) => row.shipment?.etdAt ? formatBeijingDateTime(row.shipment.etdAt) : '-' },
    etaAt: { title: 'ETA/ATA', key: 'etaAt', width: 150, render: (_, row) => row.shipment?.etaAt ? formatBeijingDateTime(row.shipment.etaAt) : '-' },
    trackingWebsite: { title: '查件网址', key: 'trackingWebsite', width: 220, render: (_, row) => row.shipment ? renderTrackingWebsite(row.shipment, customerServiceAuditIndex) : '-' },
    handler: { title: '处理人', key: 'handler', width: 110, render: (_, row) => getProblemHandleLog(row.ticket.id, customerServiceAuditIndex)?.actorUsername ?? '-' },
    handledAt: { title: '处理时间', key: 'handledAt', width: 170, render: (_, row) => formatMaybeDateTime(getProblemHandleLog(row.ticket.id, customerServiceAuditIndex)?.createdAt) },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_, row) => (
        <Space size={6}>
          {can('customer-service:problem:close') ? <Button size="small" type="primary" disabled={row.ticket.status === 'CLOSED'} onClick={() => void closeProblem(row.ticket)}>
            问题件已经解决
          </Button> : null}
          {can('customer-service:problem:assist') ? <Popconfirm
            title="确认标记需协助？"
            description="确认后售后状态会标记为需协助。"
            okText="确认需协助"
            cancelText="取消"
            onConfirm={() => void requestProblemAssist(row.ticket)}
            disabled={row.ticket.status === 'CLOSED'}
          >
            <Button size="small" disabled={row.ticket.status === 'CLOSED'}>
              问题件需协助
            </Button>
          </Popconfirm> : null}
        </Space>
      )
    }
  };
  const baseProblemColumns = problemColumnOrder.map((key) => problemColumnMap[key]);
  const problemColumns = baseProblemColumns;
  const afterSaleColumns: ColumnsType<ProblemRow> = [
    ...baseProblemColumns.filter((column) => column.key !== 'category' && column.key !== 'action'),
    {
      title: '售后状态',
      key: 'afterSaleStatus',
      width: 110,
      render: (_, row) => getAfterSaleStatus(row)
    },
    problemColumnMap.action
  ];
  const pendingRoutingColumns = useMemo(
    () => createPendingRoutingColumns({
      businessCostAudits,
      mode: 'customerService',
      onViewFees: can('customer-service:pending-routing:fee-detail-view') ? (shipment) => void openFeeDetail(shipment) : undefined,
      canViewBusinessCost: false,
      canViewPayableCost: false,
      canViewAgentChannel: can('customer-service:pending-routing:agent-view')
    }),
    [businessCostAudits, permissions]
  );
  const activeLabel = items.find((item) => item.key === activeSection)?.label ?? '客服管理';

  async function refreshCustomerServiceAuditLogs() {
    if (!apiClient) return;
    const responses = await Promise.all([
      apiClient.auditQuery.auditLogs({ action: 'customer_service.status.update' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.business_data.approved' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.agent_data.approved' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.business_data.reversed' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.agent_data.reversed' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.business_data.updated' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.agent_data.updated' }),
      apiClient.auditQuery.auditLogs({ action: 'shipment.operational.update' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.issue.attach' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.issue.update' }),
      apiClient.auditQuery.auditLogs({ action: 'customer_service.issue.close' })
    ]);
    setCustomerServiceAuditLogs(responses.flatMap((response) => response.rows));
  }

  async function refreshCustomerServiceDataConfirmRows() {
    if (!apiClient) return;
    const requestId = ++dataConfirmRequestIdRef.current;
    const hasCachedRows = dataConfirmRowsCache.has(apiClient);
    const cachedRows = dataConfirmRowsCache.get(apiClient);
    if (hasCachedRows && cachedRows) {
      setDataConfirmRows(cachedRows);
      setDataConfirmHasLoaded(true);
    }
    setDataConfirmLoading(true);
    setDataConfirmLoadError(null);
    try {
      const nextRows = await apiClient.customerServiceDataConfirmShipments();
      if (requestId === dataConfirmRequestIdRef.current) {
        dataConfirmRowsCache.set(apiClient, nextRows);
        setDataConfirmRows(nextRows);
        setDataConfirmHasLoaded(true);
      }
    } catch (error) {
      if (requestId === dataConfirmRequestIdRef.current) {
        if (!hasCachedRows) {
          setDataConfirmRows([]);
          setDataConfirmHasLoaded(false);
        }
        setDataConfirmLoadError(error instanceof Error ? error.message : '数据确认列表加载失败');
      }
    } finally {
      if (requestId === dataConfirmRequestIdRef.current) {
        setDataConfirmLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!apiClient || !['service-dashboard', 'transferNo', 'departed', 'arrivedPort', 'delivering', 'problems', 'afterSale'].includes(activeSection)) return;
    let cancelled = false;
    refreshCustomerServiceAuditLogs()
      .catch(() => {
        if (!cancelled) setCustomerServiceAuditLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSection, apiClient]);
  useEffect(() => {
    if (!apiClient) {
      setDataConfirmRows([]);
      setDataConfirmHasLoaded(false);
      return;
    }
    const hasCachedRows = dataConfirmRowsCache.has(apiClient);
    setDataConfirmRows(dataConfirmRowsCache.get(apiClient) ?? []);
    setDataConfirmHasLoaded(hasCachedRows);
  }, [apiClient]);
  useEffect(() => {
    if (activeSection !== 'dataConfirm' || !apiClient) return;
    void refreshCustomerServiceDataConfirmRows();
  }, [activeSection, apiClient]);
  useEffect(() => {
    if (activeSection !== 'transferNo' || !apiClient || !canTransferView) return;
    apiClient.customerServiceTransferShipments().then(setTransferRows).catch((error) => message.error(error instanceof Error ? error.message : '转单号列表加载失败'));
  }, [activeSection, apiClient, canTransferView]);

  function openTransferFill(shipmentsToFill: Shipment[]) {
    if (!shipmentsToFill.length) return;
    setTransferFillRows(shipmentsToFill);
    transferForm.setFieldsValue({ rows: shipmentsToFill.map(() => ({ pushToSales: false })) });
  }

  async function submitTransferFill() {
    if (!apiClient) return;
    const values = await transferForm.validateFields();
    const rows = transferFillRows.map((shipment, index) => ({ shipmentId: shipment.id, transferNo: values.rows[index]?.transferNo?.trim() ?? '', subOrderNo: values.rows[index]?.subOrderNo?.trim() || undefined, pushToSales: values.rows[index]?.pushToSales === true }));
    const duplicate = rows.map((row) => row.transferNo).find((value, index, all) => value && all.indexOf(value) !== index);
    if (duplicate) { message.error(`同一批次转单号重复：${duplicate}`); return; }
    setTransferSubmitting(true);
    try {
      const response = await apiClient.fillCustomerServiceTransferShipments({ rows });
      response.results.filter((row) => row.success && row.shipment).forEach((row) => onShipmentUpdated?.(row.shipment!));
      const failed = response.results.filter((row) => !row.success);
      if (failed.length) message.warning(`成功 ${response.results.length - failed.length} 票；失败：${failed.map((row) => `${row.systemOrderNo ?? row.shipmentId} ${row.reason}`).join('；')}`);
      else onNotice?.(`已填写 ${response.results.length} 票转单号，订单已进入待离港`);
      setTransferRows((current) => current.filter((row) => !response.results.some((result) => result.success && result.shipmentId === row.id)));
      setSelectedTransferIds([]);
      setTransferFillRows([]);
      transferForm.resetFields();
      setActiveSection('waitingDeparture');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '填写转单号失败');
    } finally { setTransferSubmitting(false); }
  }

  const transferColumns = useMemo<ColumnsType<Shipment>>(() => {
    const result: ColumnsType<Shipment> = [
      { title: '运单创建时间', dataIndex: 'createdAt', width: 165, sorter: (a, b) => a.createdAt.localeCompare(b.createdAt), render: formatBeijingDateTime },
      ...(canViewTransferOutboundAt ? [{ title: '出库时间', dataIndex: 'outboundAt', width: 165, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' }] : []),
      { title: '业务员', dataIndex: 'salesperson', width: 95 }, { title: '出货单号', dataIndex: 'systemOrderNo', width: 170, render: (_: string, row) => resolveShipmentOutboundOrderNo(row) },
      ...(canViewTransferAgent ? [{ title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 190 }, { title: agentFieldLabels.channel, dataIndex: 'routeAgentChannelName', width: 140, render: (value?: string) => value || '-' }] : []),
      { title: '客户编号', dataIndex: 'customerCode', width: 100 }, { title: '目的地', dataIndex: 'destinationCountry', width: 95 }, { title: '业务渠道', dataIndex: 'channelName', width: 130 },
      { title: '业务件数', dataIndex: 'packageCount', width: 90 }, { title: '业务总量', dataIndex: 'receivableWeightKg', width: 95 }, { title: '业务体积', dataIndex: 'volumeCbm', width: 95 }, { title: '业务计费重', dataIndex: 'receivableWeightKg', width: 100 },
      ...(canViewTransferAgentData ? [{ title: '代理计费重', dataIndex: 'agentWeightKg', width: 105 }] : []),
      { title: '品名', dataIndex: 'productName', width: 120 },
      ...(canViewTransferSensitive ? [{ title: '报关', dataIndex: 'declarationRequired', width: 70, render: (value?: boolean) => <ShipmentRiskFlag value={value} /> }, { title: '敏感', dataIndex: 'sensitive', width: 70, render: (value?: boolean) => <ShipmentRiskFlag value={value} /> }] : []),
      { title: '操作', key: 'action', fixed: 'right', width: 115, render: (_, row) => <Button size="small" type="primary" disabled={!canTransferWrite} onClick={() => openTransferFill([row])}>填写转单号</Button> }
    ];
    return result;
  }, [canTransferWrite, canViewTransferAgent, canViewTransferAgentData, canViewTransferOutboundAt, canViewTransferSensitive]);

  function openDepartureModal(shipment: Shipment) {
    setDepartureShipment(shipment);
    const tracking = getShipmentTrackingMeta(shipment.id, customerServiceAuditIndex);
    departureForm.setFieldsValue({
      newTransferNo: shipment.transferNo ?? '',
      subOrderNo: shipment.subOrderNo ?? '',
      etdAt: toDatetimeLocalValue(shipment.etdAt),
      etaAt: toDatetimeLocalValue(shipment.etaAt),
      trackingWebsite: tracking.url ?? agentTrackingWebsiteForShipment(shipment, agents) ?? trackingWebsiteForShipment(shipment),
      trackingWebsiteVisibleToSales: tracking.visibleToSales ?? false,
      pushToSales: false,
      statusRemark: ''
    });
  }

  function openDepartedEditModal(shipment: Shipment) {
    setDepartureShipment(shipment);
    const tracking = getShipmentTrackingMeta(shipment.id, customerServiceAuditIndex);
    departureForm.setFieldsValue({
      newTransferNo: shipment.transferNo ?? '',
      subOrderNo: shipment.subOrderNo ?? '',
      etdAt: toDatetimeLocalValue(shipment.etdAt),
      etaAt: toDatetimeLocalValue(shipment.etaAt),
      trackingWebsite: tracking.url ?? agentTrackingWebsiteForShipment(shipment, agents) ?? trackingWebsiteForShipment(shipment),
      trackingWebsiteVisibleToSales: tracking.visibleToSales ?? false,
      pushToSales: false,
      statusRemark: ''
    });
  }

  function openProblemModal(shipment: Shipment) {
    setProblemShipment(shipment);
  }

  function openDataConfirmModal(shipment: Shipment) {
    setDataConfirmShipment(shipment);
    dataConfirmForm.setFieldsValue({ remark: '' });
  }

  function openDataEdit(shipment: Shipment, kind: 'business' | 'agent') {
    setDataEditError(null);
    setDataEditTarget({ shipment, kind });
    dataEditForm.setFieldsValue({
      packageCount: shipment.packageCount,
      weightKg: kind === 'business' ? shipment.actualWeightKg ?? shipment.receivableWeightKg : shipment.agentWeightKg,
      volumeCbm: shipment.volumeCbm ?? 0.001,
      chargeWeightKg: kind === 'business' ? shipment.receivableWeightKg : shipment.agentWeightKg,
      remark: '',
      pushToSales: false
    });
  }

  function openDataReverse(shipment: Shipment, kind: 'business' | 'agent' | 'all') {
    setDataReverseTarget({ shipment, kind });
    dataReverseForm.setFieldsValue({ reason: '' });
  }

  function openLabelModal(shipment: Shipment) {
    setLabelShipment(shipment);
    clearPendingLabelFile();
    if (!apiClient) return;
    setLabelLoading(true);
    apiClient.shipmentLabels(shipment.id)
      .then((labels) => {
        setLabelRows((current) => ({ ...current, [shipment.id]: labels }));
      })
      .catch((error) => {
        message.error(error instanceof Error ? error.message : '面单加载失败');
      })
      .finally(() => setLabelLoading(false));
  }

  async function submitDeparture() {
    if (!departureShipment || !apiClient) {
      return;
    }
    const values = await departureForm.validateFields();
    setSubmittingDeparture(true);
    try {
      const newTransferNo = values.newTransferNo?.trim();
      const subOrderNo = values.subOrderNo?.trim();
      const statusRemark = values.statusRemark?.trim();
      const updated = await apiClient.updateShipmentOperational(departureShipment.id, {
        transferNo: newTransferNo || departureShipment.transferNo,
        subOrderNo: subOrderNo || departureShipment.subOrderNo,
        latestTracking: departureShipment.latestTracking,
        etdAt: values.etdAt ? parseBeijingDateTimeInputToIso(values.etdAt) : undefined,
        etaAt: values.etaAt ? parseBeijingDateTimeInputToIso(values.etaAt) : undefined,
        trackingWebsite: values.trackingWebsite,
        trackingWebsiteVisibleToSales: values.trackingWebsiteVisibleToSales ?? false,
        ...(statusRemark ? { statusRemark } : {})
      });
      onShipmentUpdated?.(updated);
      await refreshCustomerServiceAuditLogs();
      onNotice?.(`${updated.systemOrderNo} 已修改信息${values.pushToSales ? '，业务推送待企业微信接入' : ''}`);
      setDepartureShipment(null);
      departureForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '修改信息失败');
    } finally {
      setSubmittingDeparture(false);
    }
  }

  function openLifecycleStatusAction(action: LifecycleStatusAction) {
    setLifecycleStatusAction(action);
    setLifecycleStatusRemark('');
  }

  function confirmDeparted(shipment: Shipment) {
    if (shipment.status !== 'WAITING_DEPARTURE') {
      const errorMessage = '只有待离港运单可以确认离港';
      setDepartureConfirmError(errorMessage);
      message.error(errorMessage);
      return;
    }
    if (!shipment.etdAt || !shipment.etaAt) {
      const errorMessage = departureDateMissingMessage(shipment);
      setDepartureConfirmError(errorMessage);
      message.error(errorMessage);
      openDepartureModal(shipment);
      return;
    }
    openLifecycleStatusAction({
      shipment,
      targetStatus: 'DEPARTED',
      latestTracking: '已离港',
      targetSection: 'departed',
      title: '确认离港',
      okText: '确认离港',
      successText: '已确认离港',
      errorText: '确认离港失败'
    });
  }

  function markArrivedPort(shipment: Shipment) {
    openLifecycleStatusAction({
      shipment,
      targetStatus: 'ARRIVED_PORT',
      latestTracking: '已到港',
      targetSection: 'arrivedPort',
      title: '确认到港',
      okText: '确认到港',
      successText: '已确认到港',
      errorText: '确认到港失败'
    });
  }

  function markDelivering(shipment: Shipment) {
    openLifecycleStatusAction({
      shipment,
      targetStatus: 'DELIVERING',
      latestTracking: '已派送/提取',
      targetSection: 'delivering',
      title: '确认派送/增加批注',
      okText: '确认派送',
      successText: '已派送/提取',
      errorText: '确认派送失败'
    });
  }

  function markSigned(shipment: Shipment) {
    openLifecycleStatusAction({
      shipment,
      targetStatus: 'SIGNED',
      latestTracking: '已签收',
      targetSection: 'signed',
      title: '确认签收/增加批注',
      okText: '确认签收',
      successText: '已正常签收归档',
      errorText: '确认签收失败'
    });
  }

  function addSignedRemark(shipment: Shipment) {
    openLifecycleStatusAction({
      shipment,
      targetStatus: 'SIGNED',
      latestTracking: shipment.latestTracking || '已签收',
      targetSection: 'signed',
      title: '增加批注',
      okText: '保存批注',
      successText: '已增加批注',
      errorText: '增加批注失败'
    });
  }

  async function submitLifecycleStatusAction() {
    if (!lifecycleStatusAction || !apiClient) return;
    setSubmittingLifecycleStatus(true);
    try {
      const keepCurrentSection = lifecycleStatusAction.targetStatus === 'DEPARTED';
      const statusRemark = lifecycleStatusRemark.trim();
      const updated = await apiClient.updateShipmentOperational(lifecycleStatusAction.shipment.id, {
        status: lifecycleStatusAction.targetStatus,
        latestTracking: lifecycleStatusAction.latestTracking,
        ...(statusRemark ? { statusRemark } : {})
      });
      onShipmentUpdated?.(updated);
      if (keepCurrentSection) {
        void refreshCustomerServiceAuditLogs().catch(() => undefined);
      } else {
        await refreshCustomerServiceAuditLogs();
      }
      onNotice?.(`${updated.systemOrderNo} ${lifecycleStatusAction.successText}`);
      setDepartureConfirmError(null);
      if (!keepCurrentSection) {
        setActiveSection(lifecycleStatusAction.targetSection);
      }
      setLifecycleStatusAction(null);
      setLifecycleStatusRemark('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : lifecycleStatusAction.errorText;
      if (lifecycleStatusAction.targetStatus === 'DEPARTED') {
        setDepartureConfirmError(errorMessage);
      }
      message.error(errorMessage);
    } finally {
      setSubmittingLifecycleStatus(false);
    }
  }

  async function submitProblem(input: ProblemTicketCreateInput) {
    if (!problemShipment || !apiClient) {
      throw new Error('请选择需要创建问题件的运单');
    }
    const ticket = await apiClient.createProblemTicket(problemShipment.id, input);
    onProblemTicketCreated?.(ticket);
    onShipmentUpdated?.({ ...problemShipment, hasProblemTicket: true });
    setProblemCategory(problemCategoryForStatus(problemShipment.status));
    setActiveSection('problems');
    await refreshCustomerServiceAuditLogs();
    onNotice?.(`${problemShipment.systemOrderNo} 已创建问题件${input.pushToSales ? '，业务推送待企业微信接入' : ''}`);
  }

  async function submitDataConfirm() {
    if (!dataConfirmShipment || !apiClient) {
      return;
    }
    const values = await dataConfirmForm.validateFields();
    setSubmittingDataConfirm(true);
    try {
      const updated = await apiClient.approveShipmentAllData(dataConfirmShipment.id, { remark: values.remark, expectedOutboundAt: dataConfirmShipment.outboundAt! });
      onShipmentUpdated?.(updated);
      await refreshCustomerServiceDataConfirmRows();
      onNotice?.(`${updated.systemOrderNo} 业务与代理数据均已审核，已进入转单号`);
      setDataConfirmShipment(null);
      dataConfirmForm.resetFields();
      setActiveSection('transferNo');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '数据确认失败');
    } finally {
      setSubmittingDataConfirm(false);
    }
  }

  async function approveData(shipment: Shipment, kind: 'business' | 'agent') {
    if (!apiClient) return false;
    try {
      const updated = kind === 'business'
        ? await apiClient.approveShipmentBusinessData(shipment.id, { expectedOutboundAt: shipment.outboundAt! })
        : await apiClient.approveShipmentAgentData(shipment.id, { expectedOutboundAt: shipment.outboundAt! });
      onShipmentUpdated?.(updated);
      await refreshCustomerServiceDataConfirmRows();
      onNotice?.(`${updated.systemOrderNo}${kind === 'business' ? '业务' : '代理'}数据已审核`);
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : '数据审核失败');
      return false;
    }
  }

  async function submitSingleDataConfirm() {
    if (!dataConfirmApproveTarget) return;
    setSubmittingSingleDataConfirm(true);
    try {
      const approved = await approveData(dataConfirmApproveTarget.shipment, dataConfirmApproveTarget.kind);
      if (approved) setDataConfirmApproveTarget(null);
    } finally {
      setSubmittingSingleDataConfirm(false);
    }
  }

  async function submitDataEdit() {
    if (!dataEditTarget || !apiClient) return;
    const values = await dataEditForm.validateFields();
    setDataEditError(null);
    setSubmittingDataEdit(true);
    try {
      const input = { packageCount: Number(values.packageCount), weightKg: Number(values.weightKg), volumeCbm: Number(values.volumeCbm), chargeWeightKg: Number(values.chargeWeightKg), expectedOutboundAt: dataEditTarget.shipment.outboundAt!, remark: values.remark?.trim(), ...(dataEditTarget.kind === 'business' ? { pushToSales: values.pushToSales === true } : {}) };
      const updated = dataEditTarget.kind === 'business'
        ? await apiClient.updateShipmentBusinessData(dataEditTarget.shipment.id, input)
        : await apiClient.updateShipmentAgentData(dataEditTarget.shipment.id, input);
      onShipmentUpdated?.(updated);
      await refreshCustomerServiceDataConfirmRows();
      onNotice?.(`${updated.systemOrderNo}${dataEditTarget.kind === 'business' ? '业务' : '代理'}数据已修改`);
      setDataEditTarget(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '数据修改失败';
      setDataEditError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSubmittingDataEdit(false);
    }
  }

  async function submitDataReverse() {
    if (!dataReverseTarget || !apiClient) return;
    const { reason } = await dataReverseForm.validateFields();
    try {
      const updated = dataReverseTarget.kind === 'business'
        ? await apiClient.reverseShipmentBusinessData(dataReverseTarget.shipment.id, { reason: reason!, expectedOutboundAt: dataReverseTarget.shipment.outboundAt! })
        : dataReverseTarget.kind === 'agent'
          ? await apiClient.reverseShipmentAgentData(dataReverseTarget.shipment.id, { reason: reason!, expectedOutboundAt: dataReverseTarget.shipment.outboundAt! })
          : await apiClient.reverseShipmentAllData(dataReverseTarget.shipment.id, { reason: reason!, expectedOutboundAt: dataReverseTarget.shipment.outboundAt! });
      onShipmentUpdated?.(updated);
      await refreshCustomerServiceDataConfirmRows();
      onNotice?.(`${updated.systemOrderNo} 数据反审核完成`);
      setDataReverseTarget(null);
      setActiveSection('dataConfirm');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '反审核失败');
    }
  }

  function validateLabelFile(file?: File) {
    if (!file) return false;
    if (!allowedLabelFileTypes.includes(file.type)) {
      message.error('仅支持图片或 PDF 面单');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('面单不能超过 10MB');
      return false;
    }
    return true;
  }

  function clearPendingLabelFile() {
    setPendingLabelFile(null);
    setLabelPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function selectPendingLabelFile(file?: File) {
    if (!file || !validateLabelFile(file)) return;
    clearPendingLabelFile();
    setPendingLabelFile(file);
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      setLabelPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function confirmUploadLabelFile() {
    if (!pendingLabelFile || !labelShipment || !apiClient) return;
    setUploadingLabel(true);
    try {
      const response = await apiClient.uploadShipmentLabel(labelShipment.id, { file: pendingLabelFile, transferNo: labelShipment.transferNo });
      onShipmentUpdated?.(response.shipment);
      setLabelRows((current) => ({
        ...current,
        [labelShipment.id]: [response.label, ...(current[labelShipment.id] ?? []).filter((label) => label.id !== response.label.id)]
      }));
      onNotice?.(`${response.shipment.systemOrderNo} 已上传面单`);
      clearPendingLabelFile();
      setLabelShipment(null);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传面单失败');
    } finally {
      setUploadingLabel(false);
    }
  }

  async function openFeeDetail(shipment: Shipment) {
    setFeeDetailShipment(shipment);
    setFeeDetail(null);
    if (!apiClient) return;
    setFeeDetailLoading(true);
    try {
      setFeeDetail(await apiClient.shipmentFinanceDetail(shipment.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '费用明细加载失败');
    } finally {
      setFeeDetailLoading(false);
    }
  }

  async function closeProblem(ticket: ProblemTicketSummary) {
    if (!apiClient) return;
    try {
      const updated = await apiClient.closeProblemTicket(ticket.id);
      onProblemTicketUpdated?.(updated);
      await refreshCustomerServiceAuditLogs();
      onNotice?.(`${ticket.systemOrderNo} 问题件已经解决`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '关闭问题件失败');
    }
  }

  async function requestProblemAssist(ticket: ProblemTicketSummary) {
    if (!apiClient) return;
    try {
      const updated = await apiClient.assistProblemTicket(ticket.id, '客服标记为需协助问题件');
      onProblemTicketUpdated?.(updated);
      await refreshCustomerServiceAuditLogs();
      onNotice?.(`${ticket.systemOrderNo} 已进入需协助问题件`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标记需协助失败');
    }
  }

  function moveWaitingColumn(key: WaitingColumnKey, offset: -1 | 1) {
    setWaitingColumnOrder((current) => {
      if (key === 'action') return current;
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      const businessColumns = current.filter((item) => item !== 'action');
      if (index < 0 || nextIndex < 0 || nextIndex >= businessColumns.length) return current;
      const next = [...businessColumns];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return [...next, ...current.filter((item) => item === 'action')];
    });
  }

  function moveWaitingColumnToFirst(key: WaitingColumnKey) {
    setWaitingColumnOrder((current) => key === 'action' || current[0] === key ? current : [key, ...current.filter((item) => item !== key && item !== 'action'), ...current.filter((item) => item === 'action')]);
  }

  function toggleWaitingColumn(key: WaitingColumnKey) {
    if (key === 'action') return;
    setHiddenWaitingColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveDepartedColumn(key: DepartedColumnKey, offset: -1 | 1) {
    setDepartedColumnOrder((current) => {
      if (key === 'action') return current;
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      const businessColumns = current.filter((item) => item !== 'action');
      if (index < 0 || nextIndex < 0 || nextIndex >= businessColumns.length) return current;
      const next = [...businessColumns];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return [...next, ...current.filter((item) => item === 'action')];
    });
  }

  function moveDepartedColumnToFirst(key: DepartedColumnKey) {
    setDepartedColumnOrder((current) => key === 'action' || current[0] === key ? current : [key, ...current.filter((item) => item !== key && item !== 'action'), ...current.filter((item) => item === 'action')]);
  }

  function toggleDepartedColumn(key: DepartedColumnKey) {
    if (key === 'action') return;
    setHiddenDepartedColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveArrivedPortColumn(key: DepartedColumnKey, offset: -1 | 1) {
    setArrivedPortColumnOrder((current) => {
      if (key === 'action') return current;
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      const businessColumns = current.filter((item) => item !== 'action');
      if (index < 0 || nextIndex < 0 || nextIndex >= businessColumns.length) return current;
      const next = [...businessColumns];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return [...next, ...current.filter((item) => item === 'action')];
    });
  }

  function moveArrivedPortColumnToFirst(key: DepartedColumnKey) {
    setArrivedPortColumnOrder((current) => key === 'action' || current[0] === key ? current : [key, ...current.filter((item) => item !== key && item !== 'action'), ...current.filter((item) => item === 'action')]);
  }

  function toggleArrivedPortColumn(key: DepartedColumnKey) {
    if (key === 'action') return;
    setHiddenArrivedPortColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveDeliveringColumn(key: DepartedColumnKey, offset: -1 | 1) {
    setDeliveringColumnOrder((current) => {
      if (key === 'action') return current;
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      const businessColumns = current.filter((item) => item !== 'action');
      if (index < 0 || nextIndex < 0 || nextIndex >= businessColumns.length) return current;
      const next = [...businessColumns];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return [...next, ...current.filter((item) => item === 'action')];
    });
  }

  function moveDeliveringColumnToFirst(key: DepartedColumnKey) {
    setDeliveringColumnOrder((current) => key === 'action' || current[0] === key ? current : [key, ...current.filter((item) => item !== key && item !== 'action'), ...current.filter((item) => item === 'action')]);
  }

  function toggleDeliveringColumn(key: DepartedColumnKey) {
    if (key === 'action') return;
    setHiddenDeliveringColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveProblemColumn(key: ProblemColumnKey, offset: -1 | 1) {
    setProblemColumnOrder((current) => {
      if (key === 'action') return current;
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      const businessColumns = current.filter((item) => item !== 'action');
      if (index < 0 || nextIndex < 0 || nextIndex >= businessColumns.length) return current;
      const next = [...businessColumns];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return [...next, ...current.filter((item) => item === 'action')];
    });
  }

  function moveProblemColumnToFirst(key: ProblemColumnKey) {
    setProblemColumnOrder((current) => key === 'action' || current[0] === key ? current : [key, ...current.filter((item) => item !== key && item !== 'action'), ...current.filter((item) => item === 'action')]);
  }

  function toggleProblemColumn(key: ProblemColumnKey) {
    if (key === 'action') return;
    setHiddenProblemColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function tableColumnsForSection() {
    if (activeSection === 'dataConfirm') return dataConfirmColumns;
    if (activeSection === 'waitingDeparture') return waitingDepartureColumns;
    if (activeSection === 'departed') return departedColumns;
    if (activeSection === 'arrivedPort') return arrivedPortColumns;
    if (activeSection === 'delivering') return deliveringColumns;
    if (activeSection === 'transferNo') return transferColumns;
    if (activeSection === 'signed') return [...columns, ...signedProblemActionColumns];
    return columns;
  }

  return (
    <>
      <AppPageHeader title="客服管理" description="客服状态池、轨迹跟进、问题件和售后。" />
      <ModuleSubWorkspace items={items} activeKey={activeSection} onChange={setActiveSection}>
        {activeSection === 'service-dashboard' ? (
          <Card title="客服看板" className="customer-service-dashboard">
            <div className="customer-service-task-grid">
              {dashboardMetrics.groups.map((group) => (
                <Card
                  key={group.title}
                  size="small"
                  title={(
                    <Space direction="vertical" size={0}>
                      <span className="customer-service-task-group-title">{group.title}</span>
                      <Text type="secondary" className="customer-service-task-group-helper">{group.helper}</Text>
                    </Space>
                  )}
                  className="customer-service-task-group"
                >
                  <div className="customer-service-task-list">
                    {group.items.map((item) => {
                      const valueNumber = getDashboardTaskNumericValue(item.value);
                      const progressWidth = Math.min(100, Math.round((valueNumber / dashboardMetrics.maxValue) * 100));
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={`customer-service-task-card customer-service-task-card-${item.tone}`}
                          onClick={() => setActiveSection(item.section)}
                        >
                          <span className="customer-service-task-copy">
                            <span className="customer-service-task-label">{item.label}</span>
                            <span className="customer-service-task-helper">{item.helper}</span>
                            <span className="customer-service-task-track" aria-hidden="true">
                              {valueNumber > 0 ? <span style={{ width: `${progressWidth}%` }} /> : null}
                            </span>
                          </span>
                          <strong className="customer-service-task-value">{item.value}</strong>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ) : null}
        {activeSection === 'problems' ? (
          <Card title="问题件">
            <Space direction="vertical" size={12} className="full-width">
              <Space wrap>
                <Button type={problemCategory === 'all' ? 'primary' : 'default'} onClick={() => setProblemCategory('all')}>
                  全部 {problemTickets.length}
                </Button>
                {Object.entries(problemCategoryLabels).map(([key, label]) => (
                  <Button key={key} type={problemCategory === key ? 'primary' : 'default'} onClick={() => setProblemCategory(key as ProblemCategory)}>
                    {label} {problemCategoryCounts[key as Exclude<ProblemCategory, 'all'>]}
                  </Button>
                ))}
              </Space>
              <Space wrap>
                <Input allowClear placeholder="业务员" value={problemFilters.salesperson} onChange={(event) => setProblemFilters((current) => ({ ...current, salesperson: event.target.value }))} />
                <Input allowClear type="number" min={0} placeholder="停留时间最少天数" value={problemFilters.minDwellDays} onChange={(event) => setProblemFilters((current) => ({ ...current, minDwellDays: event.target.value }))} />
                <Input allowClear placeholder="客户编号" value={problemFilters.customerCode} onChange={(event) => setProblemFilters((current) => ({ ...current, customerCode: event.target.value }))} />
                <Input allowClear placeholder="出货单号" value={problemFilters.systemOrderNo} onChange={(event) => setProblemFilters((current) => ({ ...current, systemOrderNo: event.target.value }))} />
                <Input allowClear placeholder="目的地" value={problemFilters.destinationCountry} onChange={(event) => setProblemFilters((current) => ({ ...current, destinationCountry: event.target.value }))} />
                <Input allowClear placeholder={agentFieldLabels.detailedCompanyName} value={problemFilters.agentName} onChange={(event) => setProblemFilters((current) => ({ ...current, agentName: event.target.value }))} />
                <Button onClick={() => setProblemFilters({ salesperson: '', minDwellDays: '', customerCode: '', systemOrderNo: '', destinationCountry: '', agentName: '' })}>重置</Button>
              </Space>
              <ManagedTable recordDetail={{ title: '问题件详情' }} rowKey={(row) => row.ticket.id} size="small" columns={problemColumns} dataSource={problemRows} pagination={tenRowTablePagination} minimumScrollX={3300} columnSettings={canColumnSetting.problems ? { storageKey: 'sunny.customer-service.problem.columns', title: '问题件列设置', defaultHiddenKeys: hiddenProblemColumns, defaultColumnOrder: problemColumnOrder, lockedKeys: ['action'] } : undefined} />
            </Space>
          </Card>
        ) : null}
        {activeSection === 'afterSale' ? (
          <Card title="需协助问题件">
            <ManagedTable recordDetail={{ title: '需协助问题件详情' }} rowKey={(row) => row.ticket.id} size="small" columns={afterSaleColumns} dataSource={afterSaleRows} pagination={tenRowTablePagination} minimumScrollX={3300} columnSettings={canColumnSetting.afterSale ? { storageKey: 'sunny.customer-service.after-sale.columns', title: '需协助问题件列设置', defaultHiddenKeys: hiddenProblemColumns, defaultColumnOrder: problemColumnOrder, lockedKeys: ['action'] } : undefined} />
          </Card>
        ) : null}
        {activeSection === 'pending-routing' ? (
          <Card title="待排货">
            <ManagedTable
              recordDetail={{ title: '客服待排货详情' }}
              rowKey="id"
              size="small"
              columns={pendingRoutingColumns}
              dataSource={pendingRoutingShipments}
              pagination={tenRowTablePagination}
              minimumScrollX={2100}
              locale={{ emptyText: '暂无待排货订单' }}
            />
          </Card>
        ) : null}
        {activeSection in statusSections ? (
          <Card
            title={activeLabel}
            extra={activeSection === 'dataConfirm' && dataConfirmHasLoaded && dataConfirmLoadError
              ? <Text type="warning">刷新失败，当前显示上次数据</Text>
              : activeSection === 'dataConfirm' && dataConfirmHasLoaded && dataConfirmLoading
                ? <Space size={6}><Spin size="small" /><Text type="secondary">正在刷新</Text></Space>
                : undefined}
          >
            <Space direction="vertical" size={12} className="full-width">
              {activeSection === 'waitingDeparture' && departureConfirmError ? (
                <Alert type="error" showIcon message={departureConfirmError} />
              ) : null}
              {activeSection === 'waitingDeparture' && waitingDepartureDateHint ? (
                <Alert type={waitingDepartureDateHint.startsWith('日期已完整') ? 'success' : 'warning'} showIcon message={waitingDepartureDateHint} />
              ) : null}
              {activeSection === 'dataConfirm' && dataConfirmLoadError && !dataConfirmHasLoaded ? (
                <Alert
                  type="error"
                  showIcon
                  message="数据确认列表加载失败"
                  description={dataConfirmLoadError}
                  action={<Button size="small" onClick={() => void refreshCustomerServiceDataConfirmRows()}>重试</Button>}
                />
              ) : null}
              {activeSection === 'transferNo' && canTransferWrite ? <Button type="primary" disabled={!selectedTransferIds.length || (selectedTransferIds.length > 1 && !canTransferBatchWrite)} onClick={() => openTransferFill(transferRows.filter((row) => selectedTransferIds.includes(row.id)))}>填写转单号</Button> : null}
              {activeSection === 'waitingDeparture' ? (
                <ManagedDualViewTable
                  viewStorageKey="sunny.customer-service.waiting-departure.table-view"
                  defaultView="ledger"
                  viewAriaLabel="待离港表格视图"
                  views={{
                    matrix: {
                      columns: waitingDepartureMatrixColumns,
                      tableProps: {
                        className: 'customer-service-waiting-departure-matrix-table',
                        tableLayout: 'fixed',
                        minimumScrollX: 1170,
                        resizableColumns: true,
                        recordDetail: { title: '待离港详情' },
                        columnSettings: canColumnSetting.waitingDeparture ? {
                          storageKey: 'sunny.customer-service.waiting-departure.matrix-columns',
                          title: '待离港矩阵列设置',
                          lockedKeys: ['matrixActions']
                        } : undefined
                      }
                    },
                    ledger: {
                      columns: waitingDepartureColumns,
                      tableProps: {
                        className: 'customer-service-waiting-departure-ledger-table',
                        minimumScrollX: 2460,
                        recordDetail: { title: '待离港详情' },
                        columnSettings: canColumnSetting.waitingDeparture ? {
                          storageKey: 'sunny.customer-service.waitingDeparture.columns',
                          title: '待离港列设置',
                          lockedKeys: ['action']
                        } : undefined
                      }
                    }
                  }}
                  rowKey="id"
                  size="small"
                  dataSource={rows}
                  loading={false}
                  pagination={tenRowTablePagination}
                />
              ) : (
                <ManagedTable
                  recordDetail={{ title: `${activeLabel}详情` }}
                  rowKey="id"
                  size="small"
                  columns={tableColumnsForSection()}
                  dataSource={activeSection === 'transferNo' ? transferRows : rows}
                  loading={false}
                  locale={activeSection === 'dataConfirm' ? {
                    emptyText: dataConfirmLoading && !dataConfirmHasLoaded
                      ? <Space size={8}><Spin size="small" /><Text type="secondary">正在加载数据</Text></Space>
                      : dataConfirmLoadError && !dataConfirmHasLoaded
                        ? '数据加载失败，请重试'
                        : '暂无待确认数据'
                  } : undefined}
                  rowSelection={activeSection === 'transferNo' && canTransferWrite ? { selectedRowKeys: selectedTransferIds, onChange: (keys) => setSelectedTransferIds(keys.map(String)), fixed: true } : undefined}
                  pagination={tenRowTablePagination}
                  minimumScrollX={['departed', 'arrivedPort', 'delivering'].includes(activeSection) ? 2850 : activeSection === 'dataConfirm' ? 2100 : activeSection === 'transferNo' ? 1350 : activeSection === 'signed' ? 1200 : 1080}
                  columnSettings={canColumnSetting[activeSection] ? {
                    storageKey: `sunny.customer-service.${activeSection}.columns`,
                    title: `${activeLabel}列设置`,
                    lockedKeys: ['action']
                  } : undefined}
                />
              )}
            </Space>
          </Card>
        ) : null}
      </ModuleSubWorkspace>
      <Modal className="customer-service-transfer-modal" title={transferFillRows.length > 1 ? '批量填写转单号' : '填写转单号'} open={transferFillRows.length > 0} onCancel={() => setTransferFillRows([])} onOk={() => void submitTransferFill()} confirmLoading={transferSubmitting} width={640} destroyOnHidden>
        <Form form={transferForm} layout="vertical">
          <Form.List name="rows">
            {() => (
              <div className="customer-service-transfer-form-list">
                {transferFillRows.map((shipment, index) => (
                  <section className="customer-service-transfer-form-item" key={shipment.id}>
                    {transferFillRows.length > 1 ? <Text strong className="customer-service-transfer-form-sequence">第 {index + 1} 票</Text> : null}
                    <div className="customer-service-transfer-order-info">
                      <div>
                        <Text type="secondary">客户编号</Text>
                        <Text strong>{shipment.customerCode || '-'}</Text>
                      </div>
                      <div>
                        <Text type="secondary">出货单号</Text>
                        <Text strong copyable>{shipment.systemOrderNo || '-'}</Text>
                      </div>
                    </div>
                    <Form.Item name={[index, 'transferNo']} label="转单号" rules={[{ required: true, whitespace: true, message: '请填写转单号' }]}>
                      <Input autoFocus={index === 0} aria-label={transferFillRows.length > 1 ? `转单号 ${index + 1}` : '转单号'} placeholder="请填写转单号" />
                    </Form.Item>
                    {can('customer-service:transfer:sub-order-write') ? (
                      <Form.Item name={[index, 'subOrderNo']} label="分单号">
                        <Input aria-label={transferFillRows.length > 1 ? `分单号 ${index + 1}` : '分单号'} placeholder="选填" />
                      </Form.Item>
                    ) : null}
                    {can('customer-service:transfer:push-sales') ? (
                      <Form.Item name={[index, 'pushToSales']} valuePropName="checked" className="customer-service-transfer-push-option">
                        <Checkbox>同步推送业务</Checkbox>
                      </Form.Item>
                    ) : null}
                  </section>
                ))}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
      <Modal
        title="费用明细"
        open={Boolean(feeDetailShipment)}
        onCancel={() => {
          setFeeDetailShipment(null);
          setFeeDetail(null);
        }}
        footer={<Button onClick={() => {
          setFeeDetailShipment(null);
          setFeeDetail(null);
        }}>关闭</Button>}
        width={720}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} className="full-width">
          <Space direction="vertical" size={2}>
            <Text strong>{feeDetailShipment ? resolveShipmentOutboundOrderNo(feeDetailShipment) : '-'}</Text>
            <Text type="secondary">客户：{feeDetailShipment?.customerCode || feeDetailShipment?.customerName || '-'}</Text>
          </Space>
          {feeDetailLoading ? (
            <Text type="secondary">费用明细加载中...</Text>
          ) : (
            <>
              <Space direction="vertical" size={8} className="full-width">
                <Text strong>应收费用</Text>
                {renderFinanceRows(feeDetail?.receivables ?? [], '暂无应收费用')}
                <Text type="secondary">应收合计：{formatFeeAmount(feeDetail?.receivableTotal, feeDetail?.receivables?.[0]?.currency)}</Text>
              </Space>
              <Space direction="vertical" size={8} className="full-width">
                <Text strong>业务成本</Text>
                {renderFinanceRows(feeDetail?.businessCosts ?? [], '暂无业务成本')}
                <Text type="secondary">业务成本合计：{formatFeeAmount(feeDetail?.businessCostTotal, feeDetail?.businessCosts?.[0]?.currency)}</Text>
              </Space>
            </>
          )}
        </Space>
      </Modal>
      <Modal
        className="customer-service-operational-edit-modal"
        title="修改信息"
        open={Boolean(departureShipment)}
        onCancel={() => setDepartureShipment(null)}
        onOk={() => void submitDeparture()}
        confirmLoading={submittingDeparture}
        okText="确定"
        cancelText="取消"
        width={1120}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' } }}
        destroyOnHidden
      >
        <Form form={departureForm} layout="vertical" className="customer-service-operational-edit-form">
          <Text strong className="customer-service-operational-edit-summary-title">基础信息</Text>
          <div className="customer-service-operational-edit-summary" aria-label="基础信息">
            <div>
              <Text type="secondary">客户编号</Text>
              <Text strong>{departureShipment?.customerCode || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">出货单号</Text>
              <Text strong>{departureShipment?.systemOrderNo || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">当前转单号</Text>
              <Text strong>{departureShipment?.transferNo || '-'}</Text>
            </div>
          </div>
          <div className="customer-service-operational-edit-primary-grid">
            <section className="customer-service-operational-edit-section">
              <Text strong className="customer-service-operational-edit-section-title">转单信息</Text>
              <div className="customer-service-operational-edit-two-column">
                <Form.Item name="newTransferNo" label="新转单号">
                  <Input size="small" placeholder="留空则保留当前转单号" />
                </Form.Item>
                <Form.Item name="subOrderNo" label="分单号">
                  <Input size="small" placeholder="选填" />
                </Form.Item>
              </div>
            </section>
            <section className="customer-service-operational-edit-section">
              <Text strong className="customer-service-operational-edit-section-title">轨迹信息</Text>
              <div className="customer-service-operational-edit-two-column">
                <Form.Item name="etdAt" label="ETD/ATD">
                  <AppDateTimePicker size="small" />
                </Form.Item>
                <Form.Item name="etaAt" label="ETA/ATA">
                  <AppDateTimePicker size="small" />
                </Form.Item>
                <Form.Item name="trackingWebsite" label="查询网站" className="customer-service-operational-edit-wide-field">
                  <Input size="small" placeholder="默认按转单号生成，可手动填写" />
                </Form.Item>
              </div>
            </section>
          </div>
          <div className="customer-service-operational-edit-secondary-grid">
            <section className="customer-service-operational-edit-section">
              <Text strong className="customer-service-operational-edit-section-title">同步选项</Text>
              <div className="customer-service-operational-edit-checks">
                <Form.Item name="trackingWebsiteVisibleToSales" valuePropName="checked">
                  <Checkbox>查询网站对业务显示</Checkbox>
                </Form.Item>
                <Form.Item name="pushToSales" valuePropName="checked">
                  <Checkbox>网站是否推送业务</Checkbox>
                </Form.Item>
              </div>
            </section>
            <section className="customer-service-operational-edit-section">
              <Text strong className="customer-service-operational-edit-section-title">批注</Text>
              <Form.Item name="statusRemark" label="本次修改说明">
                <Input.TextArea maxLength={300} rows={2} showCount placeholder="可留空；填写后写入本次修改审计" />
              </Form.Item>
            </section>
          </div>
        </Form>
      </Modal>
      <Modal
        title={lifecycleStatusAction?.title ?? '状态确认'}
        open={Boolean(lifecycleStatusAction)}
        onCancel={() => {
          setLifecycleStatusAction(null);
          setLifecycleStatusRemark('');
        }}
        onOk={() => void submitLifecycleStatusAction()}
        confirmLoading={submittingLifecycleStatus}
        okText={lifecycleStatusAction?.okText ?? '确认'}
        cancelText="取消"
        destroyOnHidden
      >
        <Space direction="vertical" size={12} className="full-width">
          <Space direction="vertical" size={2}>
            <Text strong>{lifecycleStatusAction ? resolveShipmentOutboundOrderNo(lifecycleStatusAction.shipment) : '-'}</Text>
            <Text type="secondary">客户编号：{lifecycleStatusAction?.shipment.customerCode || '-'}</Text>
            <Text type="secondary">转单号：{lifecycleStatusAction?.shipment.transferNo || '-'}</Text>
            <Text type="secondary">当前状态：{lifecycleStatusAction ? shipmentStatusLabels[lifecycleStatusAction.shipment.status] : '-'}</Text>
          </Space>
          <Form layout="vertical">
            <Form.Item label={lifecycleStatusAction?.targetStatus === 'ARRIVED_PORT' ? '到港批注（选填）' : '批注'}>
              <Input.TextArea
                aria-label={lifecycleStatusAction?.targetStatus === 'ARRIVED_PORT' ? '到港批注（选填）' : '批注'}
                value={lifecycleStatusRemark}
                maxLength={300}
                rows={4}
                showCount
                placeholder="可留空；填写后写入本次状态记录"
                onChange={(event) => setLifecycleStatusRemark(event.target.value)}
              />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
      <Modal
        title="运单详情"
        open={Boolean(dataConfirmDetailShipment)}
        onCancel={() => setDataConfirmDetailShipment(null)}
        footer={<Button onClick={() => setDataConfirmDetailShipment(null)}>关闭</Button>}
        width={760}
        destroyOnHidden
      >
        <div className="customer-service-detail-grid">
          {buildDataConfirmDetailItems(dataConfirmDetailShipment, canViewDataConfirmBusiness, canViewDataConfirmAgent).map((item) => (
            <div className="customer-service-detail-item" key={item.label}>
              <Text type="secondary">{item.label}</Text>
              <Text strong>{item.label === '报关' || item.label === '敏感' ? <ShipmentRiskFlag value={item.value} /> : item.value}</Text>
            </div>
          ))}
        </div>
      </Modal>
      <Modal
        title={dataConfirmApproveTarget?.kind === 'agent' ? '确认代理审核' : '确认业务审核'}
        open={Boolean(dataConfirmApproveTarget)}
        onCancel={() => {
          if (!submittingSingleDataConfirm) setDataConfirmApproveTarget(null);
        }}
        onOk={() => void submitSingleDataConfirm()}
        confirmLoading={submittingSingleDataConfirm}
        okText={dataConfirmApproveTarget?.kind === 'agent' ? '确认代理审核' : '确认业务审核'}
        cancelText="取消"
        closable={!submittingSingleDataConfirm}
        maskClosable={!submittingSingleDataConfirm}
        width={460}
        destroyOnHidden
      >
        <Space direction="vertical" size={8} className="full-width">
          <Text>出货单号：<Text strong>{dataConfirmApproveTarget ? resolveShipmentOutboundOrderNo(dataConfirmApproveTarget.shipment) : '-'}</Text></Text>
          <Text type="secondary">
            确认后将把{dataConfirmApproveTarget?.kind === 'agent' ? '代理' : '业务'}数据标记为已审核，并保留本次审核记录。
          </Text>
        </Space>
      </Modal>
      <Modal
        className="customer-service-all-audit-modal"
        title="全部审核"
        open={Boolean(dataConfirmShipment)}
        onCancel={() => setDataConfirmShipment(null)}
        onOk={() => void submitDataConfirm()}
        confirmLoading={submittingDataConfirm}
        okText="全部审核"
        cancelText="取消"
        width={880}
        destroyOnHidden
      >
        <Form form={dataConfirmForm} layout="vertical" className="customer-service-all-audit-form">
          <div className="customer-service-all-audit-summary">
            <Text strong>{dataConfirmShipment ? resolveShipmentOutboundOrderNo(dataConfirmShipment) : '-'}</Text>
            <Text type="secondary">客户：{dataConfirmShipment?.customerCode || '-'}</Text>
          </div>
          <div className="customer-service-all-audit-grid">
            <Form.Item label="目的国家">
              <Input readOnly value={dataConfirmShipment?.destinationCountry || '-'} />
            </Form.Item>
            <Form.Item label="出货件数">
              <Input readOnly value={dataConfirmShipment?.packageCount ?? '-'} />
            </Form.Item>
            <Form.Item label="计费重量">
              <Input readOnly value={dataConfirmShipment?.receivableWeightKg ?? '-'} />
            </Form.Item>
            <Form.Item label="是否报关">
              <Input className={isShipmentRiskFlagActive(dataConfirmShipment?.declarationRequired) ? 'shipment-risk-input-active' : undefined} readOnly value={dataConfirmShipment?.declarationRequired ? '是' : '否'} />
            </Form.Item>
            <Form.Item label="是否敏感">
              <Input className={isShipmentRiskFlagActive(dataConfirmShipment?.sensitive) ? 'shipment-risk-input-active' : undefined} readOnly value={dataConfirmShipment?.sensitive ? '是' : '否'} />
            </Form.Item>
          </div>
          <Form.Item name="remark" label="备注" className="customer-service-all-audit-remark">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`${dataEditTarget?.kind === 'business' ? '业务' : '代理'}数据修改 · ${dataEditTarget?.shipment.systemOrderNo || '-'}`}
        open={Boolean(dataEditTarget)}
        onCancel={() => {
          setDataEditError(null);
          setDataEditTarget(null);
        }}
        onOk={() => void submitDataEdit()}
        okText="保存修改"
        confirmLoading={submittingDataEdit}
        destroyOnHidden
      >
        <Form form={dataEditForm} layout="vertical">
          <Text type="secondary">客户编号：{dataEditTarget?.shipment.customerCode || '-'} / 出货单号：{dataEditTarget ? resolveShipmentOutboundOrderNo(dataEditTarget.shipment) : '-'}</Text>
          {dataEditError ? <Alert type="error" showIcon message={dataEditError} style={{ marginTop: 16 }} /> : null}
          <Form.Item name="packageCount" label="件数" rules={[{ required: true, message: '请填写件数' }]}><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="weightKg" label="实际重量 KG" rules={[{ required: true, message: '请填写实际重量' }]}><InputNumber min={0.001} precision={3} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="volumeCbm" label="体积 CBM" rules={[{ required: true, message: '请填写体积' }]}><InputNumber min={0.001} precision={3} style={{ width: '100%' }} /></Form.Item>
          <Form.Item
            name="chargeWeightKg"
            label={`${dataEditTarget?.kind === 'business' ? '业务' : '代理'}计费重 KG`}
            extra="公式费用按计费重 × 单价同步更新"
            rules={[{ required: true, message: '请填写计费重' }]}
          >
            <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="修改备注"><Input.TextArea rows={3} /></Form.Item>
          {dataEditTarget?.kind === 'business' ? <Form.Item name="pushToSales" valuePropName="checked"><Checkbox>推送业务</Checkbox></Form.Item> : null}
        </Form>
      </Modal>
      <Modal
        title="数据反审核"
        open={Boolean(dataReverseTarget)}
        onCancel={() => setDataReverseTarget(null)}
        onOk={() => void submitDataReverse()}
        okText="确认反审核"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={dataReverseForm} layout="vertical">
          <Text type="secondary">{dataReverseTarget ? resolveShipmentOutboundOrderNo(dataReverseTarget.shipment) : '-'} 将回到可修改的数据确认状态。</Text>
          <Form.Item name="reason" label="反审核原因" rules={[{ required: true, whitespace: true, message: '请填写反审核原因' }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
      <Modal
        title="面单上传"
        open={Boolean(labelShipment)}
        onCancel={() => {
          clearPendingLabelFile();
          setLabelShipment(null);
        }}
        footer={
          pendingLabelFile ? (
            <Space>
              <Button onClick={() => {
                clearPendingLabelFile();
                setLabelShipment(null);
              }}>
                取消
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>修改</Button>
              <Button type="primary" loading={uploadingLabel} onClick={() => void confirmUploadLabelFile()}>
                确认上传
              </Button>
            </Space>
          ) : currentLabel ? (
            <Space>
              <Button onClick={() => setLabelShipment(null)}>关闭</Button>
              <Button href={currentLabel.labelUrl} target="_blank" rel="noreferrer">
                查看/下载
              </Button>
              <Button type="primary" onClick={() => fileInputRef.current?.click()}>
                修改/替换面单
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={() => setLabelShipment(null)}>关闭</Button>
              <Button type="primary" disabled>
                确认上传
              </Button>
            </Space>
          )
        }
        destroyOnHidden
      >
        <input
          ref={fileInputRef}
          hidden
          aria-label="选择面单文件"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            selectPendingLabelFile(file);
          }}
        />
        <div
          className="customer-service-upload-dropzone"
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            selectPendingLabelFile(event.dataTransfer.files[0]);
          }}
          onPaste={(event) => {
            const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith('image/') || item.type === 'application/pdf');
            if (file) {
              event.preventDefault();
              selectPendingLabelFile(file);
            }
          }}
        >
          <Text strong>{pendingLabelFile ? '已选择面单，确认后上传' : '添加文件 / 拖拽 / 复制图片 / 截图'}</Text>
          <Text type="secondary">支持图片或 PDF，选择后先预览，点击确认上传才保存</Text>
        </div>
        {labelLoading ? <Alert style={{ marginTop: 12 }} type="info" message="正在加载已上传面单" /> : null}
        {currentLabel && !pendingLabelFile ? (
          <Card size="small" style={{ marginTop: 12 }} title="当前面单">
            <Space direction="vertical" size={4}>
              <Text>面单号：{currentLabel.labelNo}</Text>
              <Text>转单号：{currentLabel.transferNo || '-'}</Text>
              <Text type="secondary">上传时间：{formatBeijingDateTime(currentLabel.createdAt)}</Text>
              <Button href={currentLabel.labelUrl} target="_blank" rel="noreferrer">
                查看/下载
              </Button>
            </Space>
          </Card>
        ) : null}
        {pendingLabelFile ? (
          <Card size="small" style={{ marginTop: 12 }} title="待确认面单">
            <Space direction="vertical" size={8} className="full-width">
              <Space wrap>
                <Tag color="blue">{pendingLabelFile.type || '未知类型'}</Tag>
                <Text strong>{pendingLabelFile.name}</Text>
                <Text type="secondary">{formatLabelFileSize(pendingLabelFile.size)}</Text>
              </Space>
              {pendingLabelFile.type.startsWith('image/') && labelPreviewUrl ? (
                <img className="customer-service-label-preview" src={labelPreviewUrl} alt="面单预览" />
              ) : labelPreviewUrl ? (
                <Button href={labelPreviewUrl} target="_blank" rel="noreferrer">
                  预览 PDF
                </Button>
              ) : null}
            </Space>
          </Card>
        ) : null}
      </Modal>
      {apiClient ? <ProblemTicketCreateModal
        shipment={problemShipment}
        apiClient={apiClient}
        role={role ?? ''}
        permissions={permissions}
        defaultCustomerVisible
        showPushToSales
        onCancel={() => setProblemShipment(null)}
        onSubmit={submitProblem}
      /> : null}
      <Modal
        title="待离港列设置"
        open={columnSettingsOpen}
        onCancel={() => setColumnSettingsOpen(false)}
        footer={<Button onClick={() => setColumnSettingsOpen(false)}>关闭</Button>}
      >
        <Space direction="vertical" className="full-width">
          {waitingColumnOrder.map((key, index) => (
            <Space key={key} className="customer-service-column-setting-row">
              <Checkbox checked={!hiddenWaitingColumns.includes(key)} disabled={key === 'action'} onChange={() => toggleWaitingColumn(key)}>
                {String(waitingColumnMap[key].title)}
              </Checkbox>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveWaitingColumnToFirst(key)}>移到首行</Button>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveWaitingColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={key === 'action' || index === waitingColumnOrder.length - 2} onClick={() => moveWaitingColumn(key, 1)}>下移</Button>
            </Space>
          ))}
        </Space>
      </Modal>
      <Modal
        title="已离港列设置"
        open={departedColumnSettingsOpen}
        onCancel={() => setDepartedColumnSettingsOpen(false)}
        footer={<Button onClick={() => setDepartedColumnSettingsOpen(false)}>关闭</Button>}
      >
        <Space direction="vertical" className="full-width">
          {departedColumnOrder.map((key, index) => (
            <Space key={key} className="customer-service-column-setting-row">
              <Checkbox checked={!hiddenDepartedColumns.includes(key)} disabled={key === 'action'} onChange={() => toggleDepartedColumn(key)}>
                {String(departedColumnMap[key].title)}
              </Checkbox>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveDepartedColumnToFirst(key)}>移到首行</Button>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveDepartedColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={key === 'action' || index === departedColumnOrder.length - 2} onClick={() => moveDepartedColumn(key, 1)}>下移</Button>
            </Space>
          ))}
        </Space>
      </Modal>
      <Modal
        title="已到港列设置"
        open={arrivedPortColumnSettingsOpen}
        onCancel={() => setArrivedPortColumnSettingsOpen(false)}
        footer={<Button onClick={() => setArrivedPortColumnSettingsOpen(false)}>关闭</Button>}
      >
        <Space direction="vertical" className="full-width">
          {arrivedPortColumnOrder.map((key, index) => (
            <Space key={key} className="customer-service-column-setting-row">
              <Checkbox checked={!hiddenArrivedPortColumns.includes(key)} disabled={key === 'action'} onChange={() => toggleArrivedPortColumn(key)}>
                {String(arrivedPortColumnMap[key].title)}
              </Checkbox>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveArrivedPortColumnToFirst(key)}>移到首行</Button>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveArrivedPortColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={key === 'action' || index === arrivedPortColumnOrder.length - 2} onClick={() => moveArrivedPortColumn(key, 1)}>下移</Button>
            </Space>
          ))}
        </Space>
      </Modal>
      <Modal
        title="已派送列设置"
        open={deliveringColumnSettingsOpen}
        onCancel={() => setDeliveringColumnSettingsOpen(false)}
        footer={<Button onClick={() => setDeliveringColumnSettingsOpen(false)}>关闭</Button>}
      >
        <Space direction="vertical" className="full-width">
          {deliveringColumnOrder.map((key, index) => (
            <Space key={key} className="customer-service-column-setting-row">
              <Checkbox checked={!hiddenDeliveringColumns.includes(key)} disabled={key === 'action'} onChange={() => toggleDeliveringColumn(key)}>
                {String(deliveringColumnMap[key].title)}
              </Checkbox>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveDeliveringColumnToFirst(key)}>移到首行</Button>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveDeliveringColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={key === 'action' || index === deliveringColumnOrder.length - 2} onClick={() => moveDeliveringColumn(key, 1)}>下移</Button>
            </Space>
          ))}
        </Space>
      </Modal>
      <Modal
        title="问题件列设置"
        open={problemColumnSettingsOpen}
        onCancel={() => setProblemColumnSettingsOpen(false)}
        footer={<Button onClick={() => setProblemColumnSettingsOpen(false)}>关闭</Button>}
      >
        <Space direction="vertical" className="full-width">
          {problemColumnOrder.map((key, index) => (
            <Space key={key} className="customer-service-column-setting-row">
              <Checkbox checked={!hiddenProblemColumns.includes(key)} disabled={key === 'action'} onChange={() => toggleProblemColumn(key)}>
                {String(problemColumnMap[key].title)}
              </Checkbox>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveProblemColumnToFirst(key)}>移到首行</Button>
              <Button size="small" disabled={key === 'action' || index === 0} onClick={() => moveProblemColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={key === 'action' || index === problemColumnOrder.length - 2} onClick={() => moveProblemColumn(key, 1)}>下移</Button>
            </Space>
          ))}
        </Space>
      </Modal>
    </>
  );
}

function toDatetimeLocalValue(value?: string) {
  return value ? formatBeijingDateTimeInputValue(value) || undefined : undefined;
}

function buildDataConfirmDetailItems(
  shipment: Shipment | null,
  canViewBusiness: boolean,
  canViewAgent: boolean
): Array<{ label: string; value: string }> {
  if (!shipment) return [];
  const value = (input: unknown) => input === undefined || input === null || input === '' ? '-' : String(input);
  return [
    { label: '运单创建时间', value: formatBeijingDateTime(shipment.entryAt ?? shipment.createdAt) },
    { label: '出库时间', value: shipment.outboundAt ? formatBeijingDateTime(shipment.outboundAt) : '-' },
    { label: '业务员', value: value(shipment.salesperson) },
    { label: '客户编号', value: value(shipment.customerCode) },
    { label: '客户名称', value: value(shipment.customerName) },
    { label: '目的地', value: value(shipment.destinationCountry) },
    { label: '品名', value: value(shipment.productName) },
    ...(canViewBusiness ? [
      { label: '件数', value: value(shipment.packageCount) },
      { label: '实重', value: value(shipment.receivableWeightKg) },
      { label: '计费重', value: value(shipment.receivableWeightKg) },
      { label: '报关', value: shipment.declarationRequired ? '是' : '否' },
      { label: '敏感', value: shipment.sensitive ? '是' : '否' }
    ] : []),
    ...(canViewAgent ? [
      { label: '代理计费重', value: value(shipment.agentWeightKg) },
      { label: agentFieldLabels.detailedCompanyName, value: value(shipment.agentName) },
      { label: '承运商', value: value(shipment.carrier) },
      { label: '公司渠道', value: value(shipment.channelName) },
      { label: agentFieldLabels.channel, value: value(shipment.routeAgentChannelName) }
    ] : []),
    { label: '出货单号', value: value(resolveShipmentOutboundOrderNo(shipment)) },
    { label: '转单号', value: value(shipment.transferNo) },
    { label: '状态', value: value(shipment.status) },
    { label: '最新物流轨迹', value: value(shipment.latestTracking) },
    { label: '备注', value: value(shipment.remark) }
  ];
}

function formatMaybeDateTime(value?: string) {
  return value ? formatBeijingDateTime(value) : '-';
}

function getAuditAfter(row: AuditLogSummary): Record<string, unknown> {
  return row.after && typeof row.after === 'object' ? row.after as Record<string, unknown> : {};
}

function getStatusLog(shipmentId: string, index: CustomerServiceAuditIndex, status: ShipmentStatus) {
  return index.get(auditIndexKey(shipmentId, `status:${status}`));
}

function getProblemCategory(ticket: ProblemTicketSummary, shipment: Shipment | undefined, index: CustomerServiceAuditIndex): Exclude<ProblemCategory, 'all'> {
  if (ticket.status === 'CLOSED') return 'history';
  if (ticket.status === 'ASSISTANCE_REQUIRED') return 'assistance';
  const attach = index.get(auditIndexKey(ticket.id, 'action:customer_service.issue.attach'));
  const after = attach ? getAuditAfter(attach) : {};
  const status = typeof after.originalStatusPool === 'string'
    ? after.originalStatusPool
    : typeof after.originalStatus === 'string'
      ? after.originalStatus
      : shipment?.status;
  return problemCategoryForStatus(status);
}

function problemCategoryForStatus(status?: string): Exclude<ProblemCategory, 'all'> {
  if (status === 'DEPARTED') return 'arrivedPort';
  if (status === 'ARRIVED_PORT') return 'arrivedPort';
  if (status === 'DELIVERING') return 'delivering';
  if (status === 'SIGNED') return 'preDeparture';
  return 'preDeparture';
}

function problemDwellDays(createdAt: string) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86400000));
}

function getAfterSaleStatus(row: ProblemRow) {
  if (row.ticket.status === 'CLOSED') return <Tag color="green">已解决</Tag>;
  if (row.ticket.replies.some((reply) => reply.message.includes('问题件需协助'))) return <Tag color="orange">需协助</Tag>;
  if (/赔付|破损|丢失|少件|退款|补发/.test(row.ticket.reason)) return <Tag color="red">需赔付</Tag>;
  return <Tag>待处理</Tag>;
}

function isCurrentWeek(value?: string) {
  return isBeijingCurrentWeek(value);
}

function isToday(value?: string) {
  return isBeijingToday(value);
}

function keywordMatch(value: unknown, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return String(value ?? '').toLowerCase().includes(normalized);
}

function getProblemHandleLog(ticketId: string, index: CustomerServiceAuditIndex) {
  return index.get(auditIndexKey(ticketId, 'problem'));
}

function isAgentDataApproved(shipmentId: string, index: CustomerServiceAuditIndex) {
  return isCurrentDataApproved(shipmentId, index, 'agent');
}

function isBusinessDataApproved(shipmentId: string, index: CustomerServiceAuditIndex) {
  return isCurrentDataApproved(shipmentId, index, 'business');
}

function isCurrentDataApproved(shipmentId: string, index: CustomerServiceAuditIndex, kind: 'business' | 'agent') {
  const latest = index.get(auditIndexKey(shipmentId, `review:${kind}`));
  return latest?.action === `customer_service.${kind}_data.approved`;
}

function departureDateMissingMessage(shipment: Shipment) {
  if (!shipment.etdAt && !shipment.etaAt) return '确认离港前请先填写 ETD/ATD 和 ETA/ATA';
  if (!shipment.etdAt) return '确认离港前请先填写 ETD/ATD';
  return '确认离港前请先填写 ETA/ATA';
}

function getLatestDataSnapshot(shipmentId: string, index: CustomerServiceAuditIndex, kind: 'business' | 'agent') {
  const row = index.get(auditIndexKey(shipmentId, `data:${kind}`));
  const snapshot = row ? getAuditAfter(row).snapshot : undefined;
  return snapshot && typeof snapshot === 'object' ? snapshot as { packageCount?: number; weightKg?: number; volumeCbm?: number; chargeWeightKg?: number } : undefined;
}

function auditBelongsToDataConfirmationCycle(row: AuditLogSummary, outboundAt?: string) {
  const cycleStartedAt = outboundAt ? Date.parse(outboundAt) : Number.NaN;
  if (!Number.isFinite(cycleStartedAt)) return true;
  const auditedCycleStartedAt = getAuditAfter(row).dataConfirmationCycleStartedAt;
  if (typeof auditedCycleStartedAt === 'string') return Date.parse(auditedCycleStartedAt) === cycleStartedAt;
  return Date.parse(row.createdAt) >= cycleStartedAt;
}

function getShipmentTrackingMeta(shipmentId: string, index: CustomerServiceAuditIndex) {
  const row = index.get(auditIndexKey(shipmentId, 'tracking'));
  const after = row ? getAuditAfter(row) : {};
  return {
    url: typeof after.trackingWebsite === 'string' ? after.trackingWebsite : undefined,
    visibleToSales: typeof after.trackingWebsiteVisibleToSales === 'boolean' ? after.trackingWebsiteVisibleToSales : undefined
  };
}

function renderTrackingWebsite(shipment: Shipment, index: CustomerServiceAuditIndex) {
  const tracking = getShipmentTrackingMeta(shipment.id, index);
  const url = tracking.url ?? trackingWebsiteForShipment(shipment);
  if (!url) return '-';
  return <TrackingWebsiteLink url={url} prefix={tracking.visibleToSales ? undefined : '屏蔽：'} />;
}

function latestCreatedLabel(labels: ShipmentLabelSummary[]) {
  return labels
    .filter((label) => label.status === 'CREATED')
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function hasShipmentLabel(shipment: Shipment, labelsByShipment: Record<string, ShipmentLabelSummary[]>) {
  if (latestCreatedLabel(labelsByShipment[shipment.id] ?? [])) return true;
  return /已上传面单|已生成面单/.test(shipment.latestTracking ?? '');
}

function formatLabelFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function agentTrackingWebsiteForShipment(shipment: Shipment, agents: AgentSummary[]) {
  const agent = agents.find((item) =>
    (shipment.agentId && item.id === shipment.agentId) ||
    [item.name, item.shortName, item.code].filter(Boolean).includes(shipment.agentName)
  );
  const template = agent?.trackingWebsite?.trim();
  if (!template) return undefined;
  if (!template.includes('{transferNo}')) return template;
  return template.replaceAll('{transferNo}', encodeURIComponent(shipment.transferNo ?? ''));
}

function trackingWebsiteForShipment(shipment: Shipment) {
  if (!shipment.transferNo) return undefined;
  const carrier = shipment.carrier.toLowerCase();
  if (carrier.includes('ups')) return `https://www.ups.com/track?tracknum=${encodeURIComponent(shipment.transferNo)}`;
  if (carrier.includes('dhl')) return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(shipment.transferNo)}`;
  if (carrier.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(shipment.transferNo)}`;
  return shipment.transferNo;
}

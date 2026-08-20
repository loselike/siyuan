import type { Key, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Boxes, ChevronDown, ChevronUp, ClipboardList, FileInput, Filter, PackagePlus, RotateCcw, Search, Send, ShieldAlert, Sparkles, Truck, Wallet, Warehouse } from 'lucide-react';
import { Alert, Badge, Button, Card, Col, Dropdown, Flex, Input, Modal, Progress, Row, Select, Space, Tag, Typography, message } from 'antd';
import { businessTypeLabels, lineShipmentStageEditPermissionCode, shipmentStatusLabels, type BusinessType, type LineShipmentFinanceTotal, type LineShipmentPoolQuery, type LineShipmentPoolResponse, type LineShipmentPoolRow, type LineShipmentStatusGroup, type ProblemTicketCreateInput, type Shipment, type ShipmentStatus, type ShipmentInternalFlowLogResponse } from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../apiClient';
import { ModuleSubWorkspace } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedDualViewTable, MetricCard, riskLabel, type ManagedTableColumn } from '../shared/ui';
import { formatBeijingDateTime } from '../shared/format';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';
import { getShipmentStageDwellSeconds, getShipmentStageDwellText } from '../shared/shipmentStageDwell';
import { getGlobalFieldMaskVisibility } from '../shared/globalFieldMask';
import { ProblemTicketCreateModal } from '../customerService/ProblemTicketCreateModal';

const { Title } = Typography;

type LinePoolDetailColumnKey =
  | 'createdAt'
  | 'stageDwell'
  | 'customerName'
  | 'customerCode'
  | 'salesperson'
  | 'orderNo'
  | 'transferNo'
  | 'destinationCountry'
  | 'channelName'
  | 'agentName'
  | 'agentShortName'
  | 'agentChannel'
  | 'status'
  | 'receivableStatus'
  | 'businessCost'
  | 'payableStatus'
  | 'packageSummary'
  | 'receivable'
  | 'payableCost'
  | 'latestTracking'
  | 'packageCount'
  | 'weightKg'
  | 'volumeCbm'
  | 'packageNos'
  | 'payment'
  | 'remark'
  | 'action';
type LinePoolMatrixColumnKey = 'matrixBasic' | 'matrixOrder' | 'matrixCompany' | 'matrixAgent' | 'matrixPayment' | 'matrixFulfillment' | 'action';

interface BusinessWorkspaceConfig {
  description: string;
  metrics: Array<{ title: string; extra?: ReactNode }>;
  batchActions: string[];
  assistantCopy: string;
  focusItems: Array<{ title: string; description: string }>;
}

interface RiskInsight {
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  tags: string[];
  suggestedActions: string[];
}

interface AutomationPlanItem {
  shipmentId: string;
  title: string;
  priority: 'urgent' | 'high' | 'normal';
  actions: string[];
}

interface ModuleSummary {
  surfaces: string[];
}

interface ProductModuleSummary {
  name: string;
  phase: string;
  capabilities: string[];
  aiEnhancements: string[];
}

interface ImportValidationSummary {
  validRows: unknown[];
  errors: Array<{ rowNumber: number; field: string; message: string }>;
}

// Keep this independent from the former custom column-settings modal. ManagedTable owns
// the setting shape and persistence; sharing a key mixed an array and an object format.
const linePoolColumnSettingsStorageKey = 'siyuan-line-pool-matrix-columns-v1';
const linePoolLedgerColumnSettingsStorageKey = 'siyuan-line-pool-ledger-columns-v1';
const linePoolViewStorageKey = 'siyuan-line-pool-table-view-v1';
const defaultLinePoolDetailColumnOrder: LinePoolDetailColumnKey[] = [
  'createdAt',
  'stageDwell',
  'customerCode',
  'salesperson',
  'orderNo',
  'transferNo',
  'packageSummary',
  'channelName',
  'receivable',
  'agentShortName',
  'agentChannel',
  'payableCost',
  'receivableStatus',
  'businessCost',
  'payableStatus',
  'status',
  'latestTracking',
  'action'
];
const defaultLinePoolMatrixColumnOrder: LinePoolMatrixColumnKey[] = ['matrixBasic', 'matrixOrder', 'matrixCompany', 'matrixAgent', 'matrixPayment', 'matrixFulfillment', 'action'];
// The fixed, full-width table treats these values as stable allocation weights:
// long identifiers and package summaries receive more room without making widths
// jump when filtering or paging. ManagedTable still lets users override them by drag.
export const linePoolMatrixColumnWeights = {
  matrixBasic: 180,
  matrixOrder: 160,
  matrixCompany: 220,
  matrixAgent: 220,
  matrixPayment: 250,
  matrixFulfillment: 160
} as const;
const linePoolColumnLabels: Record<LinePoolMatrixColumnKey, string> = {
  matrixBasic: '基础信息',
  matrixOrder: '运单信息',
  matrixCompany: '公司数据',
  matrixAgent: '代理数据',
  matrixPayment: '款项状态',
  matrixFulfillment: '履约与跟进',
  action: '操作'
};
const linePoolColumnSettings = {
  storageKey: linePoolColumnSettingsStorageKey,
  title: '专线运单池列设置',
  labels: linePoolColumnLabels,
  defaultHiddenKeys: [],
  defaultColumnOrder: defaultLinePoolMatrixColumnOrder,
  lockedKeys: ['action']
};
const linePoolLedgerColumnSettings = {
  storageKey: linePoolLedgerColumnSettingsStorageKey,
  title: '专线运单池精密台账列设置',
  labels: {
    createdAt: '创建时间',
    stageDwell: '停留时间',
    customerName: '客户名称',
    customerCode: '客户编号',
    salesperson: '业务员归属',
    orderNo: '出货单号',
    transferNo: '转单号',
    destinationCountry: '目的地',
    packageSummary: '件数/重量/体积 CBM',
    channelName: '公司渠道',
    receivable: '应收',
    agentName: '代理详细公司名',
    agentShortName: '代理简称',
    agentChannel: '代理渠道',
    payableCost: '应付成本',
    receivableStatus: '应收状态',
    businessCost: '业务成本',
    payableStatus: '应付状态',
    status: '运单状态',
    latestTracking: '物流最新轨迹',
    packageCount: '件数',
    weightKg: '重量',
    volumeCbm: '体积 CBM',
    packageNos: '包裹单号',
    payment: '收款',
    remark: '备注',
    action: '操作'
  },
  defaultHiddenKeys: ['customerName', 'destinationCountry', 'agentName', 'packageCount', 'weightKg', 'volumeCbm', 'packageNos', 'payment', 'remark'],
  defaultColumnOrder: defaultLinePoolDetailColumnOrder,
  lockedKeys: ['action']
};
const linePoolTableLocale = { emptyText: '暂无符合条件的运单' };

export function getOperationsFieldVisibility(role: RoleKey, permissions: readonly string[]) {
  return getGlobalFieldMaskVisibility(role, permissions);
}

function getLinePoolRowKey(row: LineShipmentPoolRow) {
  return row.shipment.id;
}

function isSameLinePoolQuery(left: LineShipmentPoolQuery, right: LineShipmentPoolQuery) {
  return left.statusGroup === right.statusGroup
    && left.keyword === right.keyword
    && left.datePreset === right.datePreset
    && left.sortBy === right.sortBy
    && left.sortOrder === right.sortOrder
    && left.page === right.page
    && left.pageSize === right.pageSize;
}

function LinePoolStatusButton({ active, danger, children, onClick }: { active: boolean; danger?: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <Button type={active ? 'primary' : 'default'} danger={danger} onClick={onClick}>
      {children}
    </Button>
  );
}

function statusColor(status: ShipmentStatus) {
  if (['SIGNED', 'OUTBOUNDED', 'DEPARTED'].includes(status)) return 'green';
  if (['PROBLEM', 'STUCK', 'REVIEW_REJECTED'].includes(status)) return 'red';
  if (['WAITING_DISPATCH', 'WAITING_SORT', 'WAITING_DEPARTURE'].includes(status)) return 'cyan';
  return 'blue';
}

/**
 * The operations workspace is table-dense. Keep its static labels and cell
 * copy out of Ant Design Typography's ResizeObserver/ellipsis state machine,
 * which can recursively remeasure inside a scrollable table in production.
 */
function OperationText({
  children,
  className,
  strong,
  type
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  type?: 'secondary' | 'success' | 'warning' | 'danger';
}) {
  const content = strong ? <strong>{children}</strong> : children;
  return (
    <span className={['ant-typography', type ? `ant-typography-${type}` : null, className].filter(Boolean).join(' ')}>
      {content}
    </span>
  );
}

function LinePoolMatrixCell({
  fields
}: {
  fields: Array<{ key: string; label: string; value: ReactNode; wrap?: boolean }>;
}) {
  return (
    <div className="line-pool-matrix-cell">
      {fields.map((field) => (
        <div className={`line-pool-matrix-field${field.wrap ? ' line-pool-matrix-field-wrap' : ''}`} key={field.key}>
          <span className="line-pool-matrix-label">{field.label}</span>
          <div className="line-pool-matrix-value">{field.value}</div>
        </div>
      ))}
    </div>
  );
}

function LinePoolMatrixDateTime({ value }: { value: string }) {
  const [date, time] = value.split(' ');
  return (
    <span className="line-pool-matrix-datetime" title={value}>
      <strong>{date}</strong>
      {time ? <span>{time}</span> : null}
    </span>
  );
}

function formatOptionalNumber(value: unknown, fractionDigits: number) {
  if (value === null || value === undefined || value === '') return '—';
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized.toFixed(fractionDigits) : '—';
}

export function formatLinePoolPackageSummary(row: LineShipmentPoolRow) {
  const summary = row.packageSummary;
  if (summary) {
    return `${formatOptionalNumber(summary.packageCount, 0)}件 / ${formatOptionalNumber(summary.totalWeightKg, 3)} KG / ${formatOptionalNumber(summary.totalCbm, 3)} CBM`;
  }
  const fallbackWeight = row.shipment.agentWeightKg
    ?? row.shipment.chargeableWeightKg
    ?? row.shipment.receivableWeightKg
    ?? row.shipment.weightKg;
  return `${formatOptionalNumber(row.shipment.packageCount, 0)}件 / ${formatOptionalNumber(fallbackWeight, 3)} KG`;
}

function formatLinePoolFinanceAmount(amount: number, currency: string) {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatLinePoolFinanceTotals(totals: LineShipmentFinanceTotal[] | undefined, includeBillingUnits = false) {
  if (!totals?.length) return '—';
  return totals.map((total) => {
    const billingUnit = includeBillingUnits && total.billingUnits?.length ? ` · ${total.billingUnits.join('/')}` : '';
    return `${formatLinePoolFinanceAmount(total.amount, total.currency)}${billingUnit}`;
  }).join(' / ');
}

const linePoolReceivableStatusLabels = {
  UNMATCHED: '未匹配',
  PENDING_REVIEW: '未审核',
  APPROVED: '已审核'
} as const;
const linePoolPayableStatusLabels = {
  UNPAID: '未付',
  PAID: '已付',
  APPROVED: '已审核'
} as const;

function linePoolStatusTag(label: string | undefined, color: 'default' | 'orange' | 'green' | 'red' | 'blue' = 'default') {
  return label ? <Tag color={color}>{label}</Tag> : '—';
}

function linePoolCustomerCode(row: LineShipmentPoolRow) {
  return row.shipment.customerCode || row.shipment.customerName.split('-')[0] || '—';
}

export const linePoolOutboundOrderNoColumnTitle = '出货单号';

export function formatLinePoolOutboundOrderNo(row: LineShipmentPoolRow) {
  return resolveShipmentOutboundOrderNo(row.shipment);
}

export function OperationsPage({
  businessWorkspaceConfig,
  aiQueue,
  importValidation,
  businessType,
  onAiAssist,
  aiLoading,
  activeWorkspaceSection,
  onActiveWorkspaceSectionChange,
  automationPlan,
  moduleSummary,
  spotlightModules,
  apiClient,
  permissions,
  role,
  onViewShipment,
  onProcessShipment
}: {
  businessWorkspaceConfig: BusinessWorkspaceConfig;
  aiQueue: Array<{ shipment: Shipment; insight: RiskInsight }>;
  importValidation: ImportValidationSummary;
  businessType: BusinessType;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  activeWorkspaceSection: string;
  onActiveWorkspaceSectionChange: (section: string) => void;
  automationPlan: AutomationPlanItem[];
  moduleSummary: ModuleSummary;
  spotlightModules: ProductModuleSummary[];
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role: RoleKey;
  onViewShipment: (shipment: Shipment) => void;
  onProcessShipment: (shipment: Shipment) => void;
}) {
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = useCallback((permission: PermissionKey) => role === 'ADMIN' || permissionSet.has(permission), [permissionSet, role]);
  const canViewLinePool = can('operations:line-shipment:view');
  const canViewAiQueue = can('operations:ai-queue:view');
  const canViewProductMap = can('operations:product-map:view');
  const canViewImportQuality = can('operations:import-quality:view');
  const canViewSensitive = can('operations:line-shipment:process') || can('operations:product-map:cost-sensitive-view');
  const fieldVisibility = useMemo(() => getOperationsFieldVisibility(role, permissions), [permissions, role]);
  const visibleLinePoolDetailColumnOrder = useMemo(
    () => defaultLinePoolDetailColumnOrder.filter((key) =>
      (key !== 'agentName' || fieldVisibility.showAgentCompanyName)
      && (key !== 'agentShortName' || fieldVisibility.showAgentShortName)
      && (key !== 'agentChannel' || fieldVisibility.showAgentChannel)
      && (key !== 'payableCost' || fieldVisibility.showPayableCost)
      && (key !== 'payableStatus' || fieldVisibility.showPayableStatus)
    ),
    [fieldVisibility]
  );
  const visibleLinePoolMatrixColumnOrder = useMemo(
    () => defaultLinePoolMatrixColumnOrder.filter((key) =>
      key !== 'matrixAgent'
      || fieldVisibility.showAgentShortName
      || fieldVisibility.showAgentChannel
      || fieldVisibility.showPayableCost
    ),
    [fieldVisibility]
  );
  const linePoolColumnSettingsForRole = useMemo(
    () => ({
      ...linePoolColumnSettings,
      labels: Object.fromEntries(visibleLinePoolMatrixColumnOrder.map((key) => [key, linePoolColumnLabels[key]])),
      defaultColumnOrder: visibleLinePoolMatrixColumnOrder
    }),
    [visibleLinePoolMatrixColumnOrder]
  );
  const linePoolLedgerColumnSettingsForRole = useMemo(
    () => ({
      ...linePoolLedgerColumnSettings,
      labels: Object.fromEntries(visibleLinePoolDetailColumnOrder.map((key) => [key, linePoolLedgerColumnSettings.labels[key]])),
      defaultHiddenKeys: linePoolLedgerColumnSettings.defaultHiddenKeys.filter((key) => visibleLinePoolDetailColumnOrder.includes(key as LinePoolDetailColumnKey)),
      defaultColumnOrder: visibleLinePoolDetailColumnOrder
    }),
    [visibleLinePoolDetailColumnOrder]
  );
  const canProcess = can('operations:line-shipment:process') && can('operations:line-shipment:status-update');
  const canProcessLineShipment = useCallback((row: LineShipmentPoolRow) => {
    if (!canProcess || role === 'ADMIN') return canProcess;
    return (row.editStages ?? []).every((stage) =>
      permissionSet.has(lineShipmentStageEditPermissionCode(stage) as PermissionKey)
    );
  }, [canProcess, permissionSet, role]);
  const workspaceItems = useMemo(() => [
    canViewLinePool ? { key: 'shipmentPool', label: `${businessTypeLabels[businessType]}运单池`, description: '筛选与批量处理' } : null,
    canViewAiQueue ? { key: 'aiQueue', label: 'AI 优先队列', description: '风险项与建议' } : null,
    canViewProductMap ? { key: 'productMap', label: '产品地图', description: '模块覆盖关系' } : null,
    canViewImportQuality ? { key: 'importQuality', label: '导入质检', description: '导入错误与计划' } : null
  ].filter((item): item is { key: string; label: string; description: string } => Boolean(item)), [businessType, canViewAiQueue, canViewImportQuality, canViewLinePool, canViewProductMap]);
  const [linePoolQuery, setLinePoolQuery] = useState<LineShipmentPoolQuery>({
    statusGroup: 'ALL',
    datePreset: 'LAST_30_DAYS',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    pageSize: 10
  });
  const [linePoolDraft, setLinePoolDraft] = useState({
    keyword: '',
    datePreset: 'LAST_30_DAYS' as LineShipmentPoolQuery['datePreset'],
    sortBy: 'createdAt' as LineShipmentPoolQuery['sortBy'],
    sortOrder: 'desc' as LineShipmentPoolQuery['sortOrder']
  });
  const [linePoolFiltersCollapsed, setLinePoolFiltersCollapsed] = useState(false);
  const [linePoolResponse, setLinePoolResponse] = useState<LineShipmentPoolResponse | null>(null);
  const [linePoolLoading, setLinePoolLoading] = useState(false);
  const [flowLog, setFlowLog] = useState<ShipmentInternalFlowLogResponse | null>(null);
  const flowLogItems = Array.isArray(flowLog?.items) ? flowLog.items : [];
  const [selectedLineShipmentIds, setSelectedLineShipmentIds] = useState<Key[]>([]);
  const [problemShipment, setProblemShipment] = useState<Shipment | null>(null);
  const linePoolRequestIdRef = useRef(0);

  const fetchLinePool = useCallback(async (nextQuery: LineShipmentPoolQuery) => {
    const requestId = ++linePoolRequestIdRef.current;
    setLinePoolLoading(true);
    try {
      const response = await apiClient.lineShipmentPool(nextQuery);
      if (requestId !== linePoolRequestIdRef.current) return;
      setLinePoolResponse(response);
      setSelectedLineShipmentIds((current) => (current.length ? [] : current));
    } finally {
      if (requestId === linePoolRequestIdRef.current) setLinePoolLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (activeWorkspaceSection !== 'shipmentPool') return;
    void fetchLinePool(linePoolQuery);
  }, [activeWorkspaceSection, fetchLinePool, linePoolQuery]);

  useEffect(() => {
    if (activeWorkspaceSection !== 'shipmentPool') return;
    const refreshVisibleLinePool = () => {
      if (document.visibilityState === 'visible') void fetchLinePool(linePoolQuery);
    };
    window.addEventListener('focus', refreshVisibleLinePool);
    document.addEventListener('visibilitychange', refreshVisibleLinePool);
    return () => {
      window.removeEventListener('focus', refreshVisibleLinePool);
      document.removeEventListener('visibilitychange', refreshVisibleLinePool);
    };
  }, [activeWorkspaceSection, fetchLinePool, linePoolQuery]);

  useEffect(() => {
    if (workspaceItems.some((item) => item.key === activeWorkspaceSection)) return;
    onActiveWorkspaceSectionChange(workspaceItems[0]?.key ?? '');
  }, [activeWorkspaceSection, onActiveWorkspaceSectionChange, workspaceItems]);

  const linePoolMetrics = linePoolResponse?.metrics;
  const linePoolRows = linePoolResponse?.rows ?? [];
  const selectedLineRows = useMemo(
    () => linePoolRows.filter((row) => selectedLineShipmentIds.includes(row.shipment.id)),
    [linePoolRows, selectedLineShipmentIds]
  );

  const openUnavailableAction = useCallback((action: string) => {
    Modal.info({
      title: action,
      content: '该动作暂未开放。'
    });
  }, []);

  const handleLinePoolStatus = useCallback((statusGroup: LineShipmentStatusGroup) => {
    const next = { ...linePoolQuery, statusGroup, page: 1 };
    if (isSameLinePoolQuery(linePoolQuery, next)) {
      void fetchLinePool(next);
      return;
    }
    setLinePoolQuery(next);
  }, [fetchLinePool, linePoolQuery]);

  const handleLinePoolSearch = useCallback(() => {
    const next = {
      ...linePoolQuery,
      keyword: linePoolDraft.keyword,
      datePreset: linePoolDraft.datePreset,
      sortBy: linePoolDraft.sortBy,
      sortOrder: linePoolDraft.sortOrder,
      page: 1
    };
    if (isSameLinePoolQuery(linePoolQuery, next)) {
      void fetchLinePool(next);
      return;
    }
    setLinePoolQuery(next);
  }, [fetchLinePool, linePoolDraft, linePoolQuery]);

  const handleLinePoolReset = useCallback(() => {
    const nextQuery: LineShipmentPoolQuery = { statusGroup: 'ALL', datePreset: 'LAST_30_DAYS', sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 10 };
    setLinePoolDraft({ keyword: '', datePreset: 'LAST_30_DAYS', sortBy: 'createdAt', sortOrder: 'desc' });
    if (isSameLinePoolQuery(linePoolQuery, nextQuery)) {
      void fetchLinePool(nextQuery);
      return;
    }
    setLinePoolQuery(nextQuery);
  }, [fetchLinePool, linePoolQuery]);

  const openSelectedProblem = useCallback(() => {
    const shipment = selectedLineRows[0]?.shipment;
    if (!shipment) return;
    setProblemShipment(shipment);
  }, [selectedLineRows]);

  const submitSelectedProblem = useCallback(async (input: ProblemTicketCreateInput) => {
    if (!problemShipment) throw new Error('请选择需要创建问题件的运单');
    await apiClient.createOperationProblemTicket(problemShipment.id, { ...input, customerVisible: false, pushToSales: undefined });
    message.success('已创建问题件');
    await fetchLinePool(linePoolQuery);
  }, [apiClient, fetchLinePool, linePoolQuery, problemShipment]);

  const addSelectedTracking = useCallback(async () => {
    const shipment = selectedLineRows[0]?.shipment;
    if (!shipment) return;
    await apiClient.addOperationTrackingEvent(shipment.id, { status: '运营工作台追加轨迹', happenedAt: new Date().toISOString(), visibleToCustomer: false });
    message.success('已追加轨迹');
    void fetchLinePool(linePoolQuery);
  }, [apiClient, fetchLinePool, linePoolQuery, selectedLineRows]);

  const linePoolDetailColumnMap = useMemo<Record<LinePoolDetailColumnKey, ManagedTableColumn<LineShipmentPoolRow>>>(() => ({
    createdAt: {
      key: 'createdAt',
      title: '创建时间',
      width: 120,
      sortValue: (row) => row.shipment.createdAt,
      render: (_, row) => {
        const [date, time] = formatBeijingDateTime(row.shipment.createdAt).split(' ');
        return <div className="line-pool-cell-stack"><span>{date}</span><OperationText type="secondary">{time}</OperationText></div>;
      }
    },
    customerName: {
      key: 'customerName',
      title: '客户名称',
      width: 160,
      sortValue: (row) => row.shipment.customerName,
      ellipsis: true,
      render: (_, row) => row.shipment.customerName
    },
    customerCode: {
      key: 'customerCode',
      title: '客户编号',
      width: 135,
      sortValue: (row) => linePoolCustomerCode(row),
      ellipsis: true,
      render: (_, row) => linePoolCustomerCode(row)
    },
    salesperson: {
      key: 'salesperson',
      title: '业务员归属',
      width: 100,
      sortValue: (row) => row.shipment.salesperson ?? '',
      ellipsis: true,
      render: (_, row) => row.shipment.salesperson ?? '-'
    },
    orderNo: {
      key: 'orderNo',
      title: linePoolOutboundOrderNoColumnTitle,
      width: 190,
      sortValue: formatLinePoolOutboundOrderNo,
      render: (_, row) => <div className="line-pool-cell-stack"><Button type="link" className="line-pool-link" onClick={() => onViewShipment(row.shipment)}>{formatLinePoolOutboundOrderNo(row)}</Button><OperationText type="secondary">{row.shipment.transferNo || '待获取快递号'}</OperationText></div>
    },
    transferNo: {
      key: 'transferNo',
      title: '转单号',
      width: 160,
      sortValue: (row) => row.shipment.transferNo ?? '',
      render: (_, row) => row.shipment.transferNo || '待获取快递号'
    },
    destinationCountry: {
      key: 'destinationCountry',
      title: '目的地',
      width: 90,
      sortValue: (row) => row.shipment.destinationCountry,
      render: (_, row) => row.shipment.destinationCountry
    },
    channelName: {
      key: 'channelName',
      title: '公司渠道',
      width: 150,
      sortValue: (row) => row.shipment.channelName ?? '',
      ellipsis: true,
      render: (_, row) => row.shipment.channelName || '-'
    },
    stageDwell: {
      key: 'stageDwell',
      title: '停留时间',
      width: 105,
      sortValue: (row) => getShipmentStageDwellSeconds(row.shipment),
      render: (_, row) => getShipmentStageDwellText(row.shipment)
    },
    packageSummary: {
      key: 'packageSummary',
      title: '件数/重量/体积 CBM',
      width: 210,
      sortValue: (row) => row.packageSummary?.totalWeightKg ?? row.shipment.agentWeightKg ?? row.shipment.receivableWeightKg,
      render: (_, row) => formatLinePoolPackageSummary(row)
    },
    receivable: {
      key: 'receivable',
      title: '应收',
      width: 155,
      sortValue: (row) => row.financeSummary?.receivableTotals.reduce((total, item) => total + item.amount, 0) ?? 0,
      render: (_, row) => canViewSensitive ? formatLinePoolFinanceTotals(row.financeSummary?.receivableTotals) : '-'
    },
    agentName: {
      key: 'agentName',
      title: '代理详细公司名',
      width: 210,
      sortValue: (row) => row.shipment.agentName ?? '',
      ellipsis: true,
      render: (_, row) => row.shipment.agentName || '-'
    },
    agentShortName: {
      key: 'agentShortName',
      title: '代理简称',
      width: 150,
      sortValue: (row) => row.shipment.agentShortName ?? '',
      ellipsis: true,
      render: (_, row) => row.shipment.agentShortName || '-'
    },
    agentChannel: {
      key: 'agentChannel',
      title: '代理渠道',
      width: 170,
      sortValue: (row) => row.shipment.routeAgentChannelName ?? '',
      ellipsis: true,
      render: (_, row) => row.shipment.routeAgentChannelName || '-'
    },
    payableCost: {
      key: 'payableCost',
      title: '应付成本',
      width: 155,
      sortValue: (row) => row.financeSummary?.payableCostTotals?.reduce((total, item) => total + item.amount, 0) ?? row.shipment.routeCostTotal ?? 0,
      render: (_, row) => canViewSensitive
        ? formatLinePoolFinanceTotals(row.financeSummary?.payableCostTotals) === '—'
          ? row.shipment.routeCostTotal === undefined ? '—' : formatLinePoolFinanceAmount(row.shipment.routeCostTotal, row.shipment.routeCurrency || 'RMB')
          : formatLinePoolFinanceTotals(row.financeSummary?.payableCostTotals)
        : '-'
    },
    status: { key: 'status', title: '运单状态', width: 100, sortValue: (row) => row.shipment.status, render: (_, row) => <Tag color={statusColor(row.shipment.status)}>{shipmentStatusLabels[row.shipment.status]}</Tag> },
    receivableStatus: {
      key: 'receivableStatus',
      title: '应收状态',
      width: 110,
      sortValue: (row) => row.financeSummary?.receivableStatus ?? '',
      render: (_, row) => canViewSensitive ? linePoolStatusTag(row.financeSummary?.receivableStatus ? linePoolReceivableStatusLabels[row.financeSummary.receivableStatus] : undefined, row.financeSummary?.receivableStatus === 'APPROVED' ? 'green' : row.financeSummary?.receivableStatus === 'PENDING_REVIEW' ? 'orange' : 'default') : '-'
    },
    businessCost: {
      key: 'businessCost',
      title: '业务成本',
      width: 170,
      sortValue: (row) => row.financeSummary?.businessCostTotals.reduce((total, item) => total + item.amount, 0) ?? 0,
      render: (_, row) => canViewSensitive ? formatLinePoolFinanceTotals(row.financeSummary?.businessCostTotals, true) : '-'
    },
    payableStatus: {
      key: 'payableStatus',
      title: '应付状态',
      width: 100,
      sortValue: (row) => row.financeSummary?.payableStatus ?? '',
      render: (_, row) => canViewSensitive ? linePoolStatusTag(row.financeSummary?.payableStatus ? linePoolPayableStatusLabels[row.financeSummary.payableStatus] : undefined, row.financeSummary?.payableStatus === 'APPROVED' ? 'green' : row.financeSummary?.payableStatus === 'PAID' ? 'blue' : 'orange') : '-'
    },
    latestTracking: {
      key: 'latestTracking',
      title: '物流最新轨迹',
      width: 210,
      sortValue: (row) => row.latestTracking,
      render: (_, row) => <div className="line-pool-cell-stack"><span>{row.latestTracking || '-'}</span><OperationText type="secondary">{row.shipment.trackingStaleDays > 0 ? `${row.shipment.trackingStaleDays} 天未更新` : '今日更新'}</OperationText></div>
    },
    packageCount: {
      key: 'packageCount',
      title: '件数',
      width: 75,
      align: 'right',
      sortValue: (row) => row.packageSummary?.packageCount ?? row.shipment.packageCount,
      render: (_, row) => `${formatOptionalNumber(row.packageSummary?.packageCount ?? row.shipment.packageCount, 0)}件`
    },
    weightKg: {
      key: 'weightKg',
      title: '重量',
      width: 95,
      align: 'right',
      sortValue: (row) => row.packageSummary?.totalWeightKg ?? row.shipment.agentWeightKg ?? row.shipment.chargeableWeightKg ?? row.shipment.receivableWeightKg ?? row.shipment.weightKg,
      render: (_, row) => `${formatOptionalNumber(
        row.packageSummary?.totalWeightKg
          ?? row.shipment.agentWeightKg
          ?? row.shipment.chargeableWeightKg
          ?? row.shipment.receivableWeightKg
          ?? row.shipment.weightKg,
        3
      )} KG`
    },
    volumeCbm: {
      key: 'volumeCbm',
      title: '体积 CBM',
      width: 90,
      align: 'right',
      sortValue: (row) => row.packageSummary?.totalCbm ?? row.shipment.volumeCbm ?? 0,
      render: (_, row) => {
        const value = row.packageSummary?.totalCbm ?? row.shipment.volumeCbm;
        return value === undefined ? '—' : `${formatOptionalNumber(value, 3)} CBM`;
      }
    },
    packageNos: {
      key: 'packageNos',
      title: '包裹单号',
      width: 180,
      sortValue: (row) => row.packageSummary?.domesticTrackingNos?.join('、') ?? '',
      ellipsis: true,
      render: (_, row) => row.packageSummary?.domesticTrackingNos?.filter(Boolean).join('、') || '暂无包裹摘要'
    },
    payment: { key: 'payment', title: '收款', width: 105, sortValue: (row) => row.receivableAmount ?? 0, render: (_, row) => canViewSensitive ? <Tag color={row.receivableAmount ? 'red' : 'default'}>{row.receivableAmount ? '未收款' : '未知'}</Tag> : '-' },
    remark: { key: 'remark', title: '备注', width: 140, sortValue: (row) => row.shipment.remark, render: (_, row) => canViewSensitive ? row.shipment.remark || '无备注' : '-' },
    action: {
      key: 'action',
      title: '操作',
      width: 104,
      fixed: 'right',
      sortable: false,
      render: (_, row) => (
        <div className="line-pool-row-actions">
          {canProcessLineShipment(row) ? <Button size="small" type="primary" onClick={() => onProcessShipment(row.shipment)}>处理</Button> : null}
          {can('operations:line-shipment:detail') ? <Button size="small" onClick={() => onViewShipment(row.shipment)}>详情</Button> : null}
          {can('operations:line-shipment:internal-log-view') ? (
            <Button
              size="small"
              onClick={() => void apiClient.lineShipmentInternalFlowLog(row.shipment.id).then(setFlowLog).catch((error) => message.error(error instanceof Error ? error.message : '日志加载失败'))}
            >
              日志
            </Button>
          ) : null}
        </div>
      )
    }
  }), [apiClient, can, canProcessLineShipment, canViewSensitive, onProcessShipment, onViewShipment]);
  const linePoolDetailColumns = useMemo(
    () => visibleLinePoolDetailColumnOrder.map((key) => linePoolDetailColumnMap[key]),
    [linePoolDetailColumnMap, visibleLinePoolDetailColumnOrder]
  );
  const linePoolColumns = useMemo<ManagedTableColumn<LineShipmentPoolRow>[]>(
    () => [
      {
        key: 'matrixBasic',
        title: '基础信息',
        width: linePoolMatrixColumnWeights.matrixBasic,
        className: 'line-pool-matrix-group-basic',
        sortValue: (row) => linePoolCustomerCode(row),
        render: (_, row) => (
          <LinePoolMatrixCell fields={[
            { key: 'createdAt', label: '创建时间', value: (() => { const [date, time] = formatBeijingDateTime(row.shipment.createdAt).split(' '); return <div className="line-pool-cell-stack"><span>{date}</span><OperationText type="secondary">{time}</OperationText></div>; })() },
            { key: 'customerCode', label: '客户编号', value: <strong>{linePoolCustomerCode(row)}</strong> },
            { key: 'salesperson', label: '业务员归属', value: row.shipment.salesperson ?? '-' }
          ]} />
        )
      },
      {
        key: 'matrixOrder',
        title: '运单信息',
        width: linePoolMatrixColumnWeights.matrixOrder,
        className: 'line-pool-matrix-group-order',
        sortValue: formatLinePoolOutboundOrderNo,
        render: (_, row) => (
          <LinePoolMatrixCell fields={[
            {
              key: 'systemOrderNo',
              label: '出货单号',
              value: <Button type="link" className="line-pool-link" onClick={() => onViewShipment(row.shipment)}>{resolveShipmentOutboundOrderNo(row.shipment)}</Button>
            },
            { key: 'transferNo', label: '转单号', value: row.shipment.transferNo || '待获取快递号' }
          ]} />
        )
      },
      {
        key: 'matrixCompany',
        title: '公司数据',
        width: linePoolMatrixColumnWeights.matrixCompany,
        className: 'line-pool-matrix-group-company',
        sortValue: (row) => row.shipment.channelName ?? '',
        render: (_, row) => (
          <LinePoolMatrixCell fields={[
            { key: 'packageSummary', label: '件数/重量/体积 CBM', value: formatLinePoolPackageSummary(row) },
            { key: 'channelName', label: '公司渠道', value: row.shipment.channelName || '-' },
            { key: 'receivable', label: '应收', value: canViewSensitive ? formatLinePoolFinanceTotals(row.financeSummary?.receivableTotals) : '-' }
          ]} />
        )
      },
      ...(fieldVisibility.showAgentShortName || fieldVisibility.showAgentChannel || fieldVisibility.showPayableCost ? [{
        key: 'matrixAgent',
        title: fieldVisibility.showAgentShortName || fieldVisibility.showAgentChannel ? '代理数据' : '应付信息',
        width: linePoolMatrixColumnWeights.matrixAgent,
        className: 'line-pool-matrix-group-agent',
        sortValue: (row: LineShipmentPoolRow) => `${row.shipment.agentName ?? ''}|${row.shipment.routeAgentChannelName ?? ''}`,
        render: (_: unknown, row: LineShipmentPoolRow) => (
          <LinePoolMatrixCell fields={[
            ...(fieldVisibility.showAgentShortName ? [{ key: 'agentShortName', label: '代理简称', value: row.shipment.agentShortName || '-' }] : []),
            ...(fieldVisibility.showAgentChannel ? [{ key: 'agentChannel', label: '代理渠道', value: row.shipment.routeAgentChannelName || '-', wrap: true }] : []),
            ...(fieldVisibility.showPayableCost ? [{
              key: 'payableCost',
              label: '应付成本',
              value: canViewSensitive
                ? formatLinePoolFinanceTotals(row.financeSummary?.payableCostTotals) === '—'
                  ? row.shipment.routeCostTotal === undefined ? '—' : formatLinePoolFinanceAmount(row.shipment.routeCostTotal, row.shipment.routeCurrency || 'RMB')
                  : formatLinePoolFinanceTotals(row.financeSummary?.payableCostTotals)
                : '-'
            }] : [])
          ]} />
        )
      } satisfies ManagedTableColumn<LineShipmentPoolRow>] : []),
      {
        key: 'matrixPayment',
        title: '款项状态',
        width: linePoolMatrixColumnWeights.matrixPayment,
        className: 'line-pool-matrix-group-payment',
        sortValue: (row) => row.financeSummary?.receivableStatus ?? '',
        render: (_, row) => (
          <LinePoolMatrixCell fields={[
            {
              key: 'receivableStatus',
              label: '应收状态',
              value: canViewSensitive
                ? linePoolStatusTag(row.financeSummary?.receivableStatus ? linePoolReceivableStatusLabels[row.financeSummary.receivableStatus] : undefined, row.financeSummary?.receivableStatus === 'APPROVED' ? 'green' : row.financeSummary?.receivableStatus === 'PENDING_REVIEW' ? 'orange' : 'default')
                : '-'
            },
            { key: 'businessCost', label: '业务成本', value: canViewSensitive ? formatLinePoolFinanceTotals(row.financeSummary?.businessCostTotals) : '-' },
            ...(fieldVisibility.showPayableStatus ? [{
              key: 'payableStatus',
              label: '应付状态',
              value: canViewSensitive
                ? linePoolStatusTag(row.financeSummary?.payableStatus ? linePoolPayableStatusLabels[row.financeSummary.payableStatus] : undefined, row.financeSummary?.payableStatus === 'APPROVED' ? 'green' : row.financeSummary?.payableStatus === 'PAID' ? 'blue' : 'orange')
                : '-'
            }] : [])
          ]} />
        )
      },
      {
        key: 'matrixFulfillment',
        title: '履约与跟进',
        width: linePoolMatrixColumnWeights.matrixFulfillment,
        className: 'line-pool-matrix-group-fulfillment',
        sortValue: (row) => row.shipment.status,
        render: (_, row) => (
          <LinePoolMatrixCell fields={[
            {
              key: 'status',
              label: '运单状态',
              value: <Tag color={statusColor(row.shipment.status)}>{shipmentStatusLabels[row.shipment.status]}</Tag>
            },
            { key: 'latestTracking', label: '物流最新轨迹', value: row.latestTracking || '-', wrap: true },
            { key: 'stageDwell', label: '停留时间', value: getShipmentStageDwellText(row.shipment) },
            {
              key: 'trackingFreshness',
              label: '更新时效',
              value: row.shipment.trackingStaleDays > 0 ? `${row.shipment.trackingStaleDays} 天未更新` : '今日更新'
            },
            ...(canViewSensitive && row.shipment.remark
              ? [{ key: 'remark', label: '备注', value: row.shipment.remark, wrap: true }]
              : [])
          ]} />
        )
      },
      linePoolDetailColumnMap.action
    ],
    [canViewSensitive, fieldVisibility, linePoolDetailColumnMap, onViewShipment]
  );
  const linePoolRowSelection = useMemo(
    () => ({ selectedRowKeys: selectedLineShipmentIds, onChange: setSelectedLineShipmentIds, columnWidth: 36 }),
    [selectedLineShipmentIds]
  );
  const handleLinePoolPageChange = useCallback((page: number, pageSize: number) => {
    setLinePoolQuery((current) => {
      const next = { ...current, page, pageSize };
      return isSameLinePoolQuery(current, next) ? current : next;
    });
  }, []);
  const linePoolPagination = useMemo(
    () => ({
      current: linePoolResponse?.pagination?.page ?? 1,
      pageSize: linePoolResponse?.pagination?.pageSize ?? 10,
      total: linePoolResponse?.pagination?.totalItems ?? 0,
      onChange: handleLinePoolPageChange
    }),
    [handleLinePoolPageChange, linePoolResponse?.pagination?.page, linePoolResponse?.pagination?.pageSize, linePoolResponse?.pagination?.totalItems]
  );

  return (
    <AppPage>
      <AppPageHeader
        title="AI 物流运营工作台"
        actions={(
          <AppActionGroup>
            <div className="operations-completion">
              <span>今日完成率</span>
              <strong>{linePoolMetrics?.todayCompletionRate ?? 0}%</strong>
              <Progress percent={linePoolMetrics?.todayCompletionRate ?? 0} showInfo={false} />
            </div>
            {can('operations:line-shipment:import') || can('operations:import-quality:upload') ? <Button icon={<FileInput size={16} />} onClick={() => openUnavailableAction('导入运单')}>导入运单</Button> : null}
            {canProcess ? <Button icon={<PackagePlus size={16} />} onClick={() => openUnavailableAction('新建预报')}>新建预报</Button> : null}
            {can('operations:ai-queue:assist') ? <Button
              type="primary"
              icon={<Bot size={16} />}
              loading={aiLoading}
              onClick={() =>
                onAiAssist({
                  module: '运营工作台',
                  task: '智能录单建议',
                  prompt: '请把当前导入质检错误转成录单修正建议，并给客服一段可直接发送给客户的说明。',
                  context: { importErrors: importValidation.errors, businessType }
                })
              }
            >
              智能录单
            </Button> : null}
          </AppActionGroup>
        )}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Truck />} title="待处理运单" value={linePoolMetrics?.pendingCount ?? 0} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<ShieldAlert />}
            title="履约风险"
            value={linePoolMetrics?.riskCount ?? 0}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Warehouse />} title="今日待出库" value={linePoolMetrics?.todayDispatchCount ?? 0} />
        </Col>
        {canViewSensitive ? <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Wallet />} title="预计应收" value={`¥ ${Math.round(linePoolMetrics?.estimatedReceivable ?? 0).toLocaleString()}`} />
        </Col> : null}
      </Row>

      {workspaceItems.length ? <ModuleSubWorkspace
        items={workspaceItems}
        activeKey={activeWorkspaceSection}
        onChange={onActiveWorkspaceSectionChange}
      >
        {activeWorkspaceSection === 'shipmentPool' ? (
          <Card
            className="workspace-focus-card line-pool-card"
            title={
              <Flex align="center" gap={8}>
                <ClipboardList size={18} />
                <span>专线运单池</span>
                <OperationText type="secondary">共 {linePoolResponse?.pagination?.totalItems ?? 0} 单</OperationText>
              </Flex>
            }
            extra={(
              <Space size={18}>
                <Button
                  className="line-pool-collapse-button"
                  type="link"
                  icon={linePoolFiltersCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                  iconPosition="end"
                  onClick={() => setLinePoolFiltersCollapsed((current) => !current)}
                >
                  {linePoolFiltersCollapsed ? '展开' : '收起'}
                </Button>
                <OperationText type="secondary">今日更新 {linePoolMetrics?.todayUpdatedCount ?? 0} 条</OperationText>
              </Space>
            )}
          >
            {!linePoolFiltersCollapsed ? (
              <div className="line-pool-filter-panel">
                <div className="line-pool-status-strip">
                  <div className="line-pool-status-group">
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'ALL'} onClick={() => handleLinePoolStatus('ALL')}>全部 {linePoolResponse?.statusCounts?.ALL ?? 0}</LinePoolStatusButton>
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'REVIEW_PENDING'} onClick={() => handleLinePoolStatus('REVIEW_PENDING')}>待审核 {linePoolResponse?.statusCounts?.REVIEW_PENDING ?? 0}</LinePoolStatusButton>
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'REVIEW_REJECTED'} onClick={() => handleLinePoolStatus('REVIEW_REJECTED')}>审核不通过 {linePoolResponse?.statusCounts?.REVIEW_REJECTED ?? 0}</LinePoolStatusButton>
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'OUTBOUNDED'} onClick={() => handleLinePoolStatus('OUTBOUNDED')}>已出库 {linePoolResponse?.statusCounts?.OUTBOUNDED ?? 0}</LinePoolStatusButton>
                  </div>
                  <span className="line-pool-status-divider" aria-hidden="true" />
                  <div className="line-pool-status-group">
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'WAITING_SORT'} onClick={() => handleLinePoolStatus('WAITING_SORT')}>待排货 {linePoolResponse?.statusCounts?.WAITING_SORT ?? 0}</LinePoolStatusButton>
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'WAITING_DISPATCH'} onClick={() => handleLinePoolStatus('WAITING_DISPATCH')}>待出库 {linePoolResponse?.statusCounts?.WAITING_DISPATCH ?? 0}</LinePoolStatusButton>
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'ARRIVED_PORT'} onClick={() => handleLinePoolStatus('ARRIVED_PORT')}>已到港 {linePoolResponse?.statusCounts?.ARRIVED_PORT ?? 0}</LinePoolStatusButton>
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'DELIVERING'} onClick={() => handleLinePoolStatus('DELIVERING')}>已派送 {linePoolResponse?.statusCounts?.DELIVERING ?? 0}</LinePoolStatusButton>
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'SIGNED'} onClick={() => handleLinePoolStatus('SIGNED')}>已签收 {linePoolResponse?.statusCounts?.SIGNED ?? 0}</LinePoolStatusButton>
                  </div>
                  <span className="line-pool-status-divider" aria-hidden="true" />
                  <div className="line-pool-status-group line-pool-status-group-alert">
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'PROBLEM'} danger onClick={() => handleLinePoolStatus('PROBLEM')}>问题件 {linePoolResponse?.statusCounts?.PROBLEM ?? 0}</LinePoolStatusButton>
                    <LinePoolStatusButton active={linePoolQuery.statusGroup === 'AFTER_SALE'} danger onClick={() => handleLinePoolStatus('AFTER_SALE')}>售后 {linePoolResponse?.statusCounts?.AFTER_SALE ?? 0}</LinePoolStatusButton>
                  </div>
                  <span className="line-pool-status-divider" aria-hidden="true" />
                  <Select
                    className="line-pool-custom-status"
                    aria-label="自定义状态"
                    placeholder="自定义"
                    value={['DATA_CONFIRM', 'TRANSFER_NO', 'WAITING_DEPARTURE', 'DEPARTED'].includes(linePoolQuery.statusGroup ?? '')
                      ? linePoolQuery.statusGroup
                      : undefined}
                    options={[
                      { value: 'DATA_CONFIRM', label: `数据确认 ${linePoolResponse?.statusCounts?.DATA_CONFIRM ?? 0}` },
                      { value: 'TRANSFER_NO', label: `转单号 ${linePoolResponse?.statusCounts?.TRANSFER_NO ?? 0}` },
                      { value: 'WAITING_DEPARTURE', label: `待离港 ${linePoolResponse?.statusCounts?.WAITING_DEPARTURE ?? 0}` },
                      { value: 'DEPARTED', label: `已离港 ${linePoolResponse?.statusCounts?.DEPARTED ?? 0}` }
                    ]}
                    onChange={(value) => handleLinePoolStatus(value)}
                  />
                </div>

                <div className="line-pool-filter-strip">
                  <Input
                    allowClear
                    prefix={<Search size={16} />}
                    value={linePoolDraft.keyword}
                    placeholder={fieldVisibility.showAgentShortName || fieldVisibility.showAgentChannel
                      ? '搜索客户 / 出货单号 / 快递号 / 转单号 / 渠道 / 代理'
                      : '搜索客户 / 出货单号 / 快递号 / 转单号 / 渠道'}
                    onChange={(event) => setLinePoolDraft((current) => ({ ...current, keyword: event.target.value }))}
                    onPressEnter={handleLinePoolSearch}
                  />
                  <Space.Compact className="line-pool-date-presets">
                    {[
                      ['LAST_30_DAYS', '近1个月'],
                      ['TODAY', '今天'],
                      ['LAST_7_DAYS', '近7天'],
                      ['ALL', '全部']
                    ].map(([value, label]) => (
                      <Button key={value} type={linePoolDraft.datePreset === value ? 'primary' : 'default'} onClick={() => setLinePoolDraft((current) => ({ ...current, datePreset: value as LineShipmentPoolQuery['datePreset'] }))}>
                        {label}
                      </Button>
                    ))}
                  </Space.Compact>
                  <Select
                    className="line-pool-sort-select"
                    value={linePoolDraft.sortBy}
                    options={[
                      { value: 'createdAt', label: '默认顺序' },
                      { value: 'customerName', label: '按客户' },
                      { value: 'systemOrderNo', label: '按单号' },
                      { value: 'status', label: '按状态' }
                    ]}
                    onChange={(value) => setLinePoolDraft((current) => ({ ...current, sortBy: value }))}
                  />
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      selectable: true,
                      selectedKeys: [linePoolDraft.sortOrder ?? 'desc'],
                      items: [
                        { key: 'desc', label: '降序排列' },
                        { key: 'asc', label: '升序排列' }
                      ],
                      onClick: ({ key }) => setLinePoolDraft((current) => ({ ...current, sortOrder: key as LineShipmentPoolQuery['sortOrder'] }))
                    }}
                  >
                    <Button icon={<Filter size={16} />}>更多筛选</Button>
                  </Dropdown>
                  <Button type="primary" icon={<Search size={16} />} onClick={handleLinePoolSearch}>查询</Button>
                  <Button icon={<RotateCcw size={16} />} onClick={handleLinePoolReset}>重置</Button>
                </div>
              </div>
            ) : null}

            <div className="line-pool-batch-bar">
              <OperationText>已选 {selectedLineShipmentIds.length} 单</OperationText>
              {can('operations:line-shipment:problem-create') ? <Button type="primary" disabled={!selectedLineShipmentIds.length} onClick={openSelectedProblem}>新建问题</Button> : null}
              {can('operations:line-shipment:tracking-add') ? <Button disabled={!selectedLineShipmentIds.length} onClick={() => void addSelectedTracking()}>添加轨迹</Button> : null}
            </div>

            <ManagedDualViewTable<LineShipmentPoolRow>
              viewStorageKey={linePoolViewStorageKey}
              defaultView="matrix"
              viewAriaLabel="专线运单池表格视图"
              views={{
                matrix: {
                  columns: linePoolColumns,
                  tableProps: {
                    recordDetail: { title: '运单池详情', columns: linePoolDetailColumns },
                    className: 'line-pool-table line-pool-unified-font line-pool-matrix-table',
                    tableLayout: 'fixed',
                    minimumScrollX: 0,
                    columnSettings: linePoolColumnSettingsForRole
                  }
                },
                ledger: {
                  columns: linePoolDetailColumns,
                  tableProps: {
                    recordDetail: { title: '运单池详情' },
                    className: 'line-pool-table line-pool-unified-font line-pool-ledger-table',
                    minimumScrollX: 1420,
                    columnSettings: linePoolLedgerColumnSettingsForRole
                  }
                }
              }}
              rowKey={getLinePoolRowKey}
              loading={linePoolLoading}
              dataSource={linePoolRows}
              size="small"
              rowSelection={linePoolRowSelection}
              locale={linePoolTableLocale}
              pagination={linePoolPagination}
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
                        <OperationText strong>{shipment.systemOrderNo}</OperationText>
                        <OperationText type="secondary">
                          {shipment.customerName} · {shipment.destinationCountry}
                        </OperationText>
                      </Space>
                      <Badge status={insight.riskLevel === 'high' ? 'error' : 'warning'} text={riskLabel(insight.riskLevel)} />
                    </Flex>
                    <OperationText className="risk-summary">{insight.summary}</OperationText>
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
                  <OperationText strong>下一步 AI 赋能</OperationText>
                </Flex>
                {businessWorkspaceConfig.assistantCopy ? <OperationText type="secondary">{businessWorkspaceConfig.assistantCopy}</OperationText> : null}
                {can('operations:ai-queue:assist') ? <Button
                  type="primary"
                  icon={<Send size={16} />}
                  loading={aiLoading}
                  onClick={() =>
                    onAiAssist({
                      module: '运营工作台',
                      task: '生成今日处理建议',
                      prompt: businessWorkspaceConfig.assistantCopy || '请根据当前运单风险和作业重点生成今日处理建议。',
                      context: { automationPlan, focusItems: businessWorkspaceConfig.focusItems }
                    })
                  }
                >
                  生成今日处理建议
                </Button> : null}
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
                      <OperationText strong>
                        {module.name === '开放 API'
                          ? '开放接口与设备'
                          : module.name === 'AI 助手'
                            ? '智能助手中心'
                            : module.name}
                      </OperationText>
                      <Tag color={module.phase === 'phase-one' ? 'green' : 'gold'}>
                        {module.phase === 'phase-one' ? '一期' : '二期'}
                      </Tag>
                    </Flex>
                    <OperationText type="secondary">{(can('operations:product-map:cost-sensitive-view') ? module.capabilities : module.capabilities.filter((item) => !/成本|代理|报价/.test(item))).slice(0, 4).join(' / ')}</OperationText>
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
                    <OperationText>可导入行</OperationText>
                    <OperationText strong>{importValidation.validRows.length}</OperationText>
                  </Flex>
                  <Flex justify="space-between">
                    <OperationText>待修正问题</OperationText>
                    <OperationText strong type="danger">
                      {importValidation.errors.length}
                    </OperationText>
                  </Flex>
                  {can('operations:import-quality:error-detail-view') ? importValidation.errors.slice(0, 3).map((error) => (
                    <Alert
                      key={`${error.rowNumber}-${error.field}`}
                      type="warning"
                      showIcon
                      message={`第 ${error.rowNumber} 行：${error.message}`}
                    />
                  )) : importValidation.errors.length ? <Alert type="warning" showIcon message="存在待修正导入数据，暂无查看错误行详情权限。" /> : null}
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="automation-card" title="AI 自动化计划">
                <Space direction="vertical" size={10} className="quality-panel">
                  {automationPlan.map((item) => (
                    <div key={item.shipmentId} className="automation-item">
                      <Flex justify="space-between" align="center">
                        <OperationText strong>{item.title}</OperationText>
                        <Tag color={item.priority === 'urgent' ? 'red' : item.priority === 'high' ? 'orange' : 'default'}>
                          {item.priority === 'urgent' ? '紧急' : item.priority === 'high' ? '高优先' : '普通'}
                        </Tag>
                      </Flex>
                      <OperationText type="secondary">{item.actions.slice(0, 2).join('；')}</OperationText>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        ) : null}
      </ModuleSubWorkspace> : <Alert type="warning" showIcon message="当前角色未获得运营工作台任何功能权限。" />}
      <Modal
        title="内部流通操作日志"
        className="internal-flow-log-modal"
        width={760}
        open={Boolean(flowLog)}
        footer={<Button onClick={() => setFlowLog(null)}>关闭</Button>}
        onCancel={() => setFlowLog(null)}
      >
        {flowLogItems.length ? (
          <div className="internal-flow-log-table" role="table" aria-label="内部流通操作日志">
            <div className="internal-flow-log-row internal-flow-log-header" role="row">
              <strong role="columnheader">阶段</strong>
              <strong role="columnheader">操作时间与人员</strong>
              <strong role="columnheader">操作内容</strong>
            </div>
            {flowLogItems.map((item, index) => (
              <div key={item.key} className={`internal-flow-log-row${index === flowLogItems.length - 1 ? ' latest-flow-log' : ''}`} role="row">
                <div role="cell"><OperationText strong>{item.stage}</OperationText></div>
                <div className="internal-flow-log-operator" role="cell">
                  <OperationText>{item.happenedAt ? formatBeijingDateTime(item.happenedAt) : '暂无记录'}</OperationText>
                  <OperationText type="secondary">{item.operator ?? '系统'}</OperationText>
                </div>
                <div role="cell"><OperationText>{item.summary}</OperationText></div>
              </div>
            ))}
          </div>
        ) : <OperationText type="secondary">暂无记录</OperationText>}
      </Modal>
      <ProblemTicketCreateModal
        shipment={problemShipment}
        apiClient={apiClient}
        role={role}
        permissions={permissions}
        defaultCustomerVisible={false}
        showCustomerVisible={false}
        onCancel={() => setProblemShipment(null)}
        onSubmit={submitSelectedProblem}
      />
    </AppPage>
  );
}

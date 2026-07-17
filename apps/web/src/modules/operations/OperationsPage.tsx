import type { Key, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Boxes, ClipboardList, FileInput, PackagePlus, RotateCcw, Search, Send, ShieldAlert, Sparkles, Truck, Wallet, Warehouse } from 'lucide-react';
import { Alert, Badge, Button, Card, Col, Dropdown, Flex, Input, Modal, Progress, Row, Select, Space, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { businessTypeLabels, shipmentStatusLabels, type BusinessType, type LineShipmentPoolQuery, type LineShipmentPoolResponse, type LineShipmentPoolRow, type LineShipmentStatusGroup, type Shipment, type ShipmentStatus, type ShipmentInternalFlowLogResponse } from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../apiClient';
import { ModuleSubWorkspace } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, riskLabel, tenRowTablePagination, type ManagedTableColumn } from '../shared/ui';
import { formatBeijingDateTime } from '../shared/format';

const { Title } = Typography;

type ShipmentColumnOrderMode = 'default' | 'customerFirst' | 'agentFirst' | 'custom';
type LinePoolColumnKey = 'createdAt' | 'customerSales' | 'orderNo' | 'route' | 'status' | 'latestTracking' | 'volumeFee' | 'payment' | 'remark' | 'action';

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
const linePoolColumnSettingsStorageKey = 'siyuan-line-pool-managed-columns-v2';
const defaultLinePoolColumnOrder: LinePoolColumnKey[] = ['createdAt', 'customerSales', 'orderNo', 'route', 'status', 'latestTracking', 'volumeFee', 'payment', 'remark', 'action'];
const linePoolColumnLabels: Record<LinePoolColumnKey, string> = {
  createdAt: '创建时间',
  customerSales: '客户信息 / 业务员',
  orderNo: '单号',
  route: '路由',
  status: '状态',
  latestTracking: '最新物流轨迹',
  volumeFee: '货量 / 包裹',
  payment: '收款',
  remark: '备注',
  action: '操作'
};
const linePoolColumnSettings = {
  storageKey: linePoolColumnSettingsStorageKey,
  title: '专线运单池列设置',
  labels: linePoolColumnLabels,
  defaultHiddenKeys: [],
  defaultColumnOrder: defaultLinePoolColumnOrder,
  lockedKeys: ['action']
};
const linePoolTableLocale = { emptyText: '暂无符合条件的运单' };

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
    <Button type={active ? 'primary' : 'default'} danger={danger && !active} onClick={onClick}>
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

function formatOptionalNumber(value: unknown, fractionDigits: number) {
  if (value === null || value === undefined || value === '') return '—';
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized.toFixed(fractionDigits) : '—';
}

export function formatLinePoolPackageSummary(row: LineShipmentPoolRow) {
  const summary = row.packageSummary;
  if (summary) {
    return `${formatOptionalNumber(summary.packageCount, 0)}件 / ${formatOptionalNumber(summary.totalWeightKg, 3)}kg / ${formatOptionalNumber(summary.totalCbm, 3)}方`;
  }
  const fallbackWeight = row.shipment.agentWeightKg
    ?? row.shipment.chargeableWeightKg
    ?? row.shipment.receivableWeightKg
    ?? row.shipment.weightKg;
  return `${formatOptionalNumber(row.shipment.packageCount, 0)}件 / ${formatOptionalNumber(fallbackWeight, 3)}kg`;
}

export function OperationsPage({
  businessWorkspaceConfig,
  aiQueue,
  importValidation,
  businessType,
  onAiAssist,
  aiLoading,
  onOpenColumnSettings,
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
  businessShipments: Shipment[];
  aiQueue: Array<{ shipment: Shipment; insight: RiskInsight }>;
  importValidation: ImportValidationSummary;
  businessType: BusinessType;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  selectedStatus: ShipmentStatus | 'ALL';
  onSelectStatus: (status: ShipmentStatus | 'ALL') => void;
  statusOrder: ShipmentStatus[];
  statusCounts: Partial<Record<ShipmentStatus, number>>;
  shipmentColumnOrderMode: ShipmentColumnOrderMode;
  onShipmentColumnOrderModeChange: (mode: ShipmentColumnOrderMode) => void;
  shipmentColumnOrderOptions: Array<{ value: ShipmentColumnOrderMode; label: string }>;
  onOpenColumnSettings: () => void;
  workspaceColumns: ColumnsType<Shipment>;
  visibleShipments: Shipment[];
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
  const canProcess = can('operations:line-shipment:process') && can('operations:line-shipment:status-update');
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
    pageSize: 20
  });
  const [linePoolDraft, setLinePoolDraft] = useState({ keyword: '', datePreset: 'LAST_30_DAYS' as LineShipmentPoolQuery['datePreset'], sortBy: 'createdAt' as LineShipmentPoolQuery['sortBy'] });
  const [linePoolResponse, setLinePoolResponse] = useState<LineShipmentPoolResponse | null>(null);
  const [linePoolLoading, setLinePoolLoading] = useState(false);
  const [flowLog, setFlowLog] = useState<ShipmentInternalFlowLogResponse | null>(null);
  const [selectedLineShipmentIds, setSelectedLineShipmentIds] = useState<Key[]>([]);

  const fetchLinePool = useCallback(async (nextQuery: LineShipmentPoolQuery) => {
    setLinePoolLoading(true);
    try {
      const response = await apiClient.lineShipmentPool(nextQuery);
      setLinePoolResponse(response);
      setSelectedLineShipmentIds((current) => (current.length ? [] : current));
    } finally {
      setLinePoolLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (activeWorkspaceSection !== 'shipmentPool') return;
    void fetchLinePool(linePoolQuery);
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
    setLinePoolQuery((current) => {
      const next = { ...current, statusGroup, page: 1 };
      return isSameLinePoolQuery(current, next) ? current : next;
    });
  }, []);

  const handleLinePoolSearch = useCallback(() => {
    setLinePoolQuery((current) => {
      const next = {
        ...current,
        keyword: linePoolDraft.keyword,
        datePreset: linePoolDraft.datePreset,
        sortBy: linePoolDraft.sortBy,
        page: 1
      };
      return isSameLinePoolQuery(current, next) ? current : next;
    });
  }, [linePoolDraft]);

  const handleLinePoolReset = useCallback(() => {
    const nextQuery: LineShipmentPoolQuery = { statusGroup: 'ALL', datePreset: 'LAST_30_DAYS', sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 20 };
    setLinePoolDraft({ keyword: '', datePreset: 'LAST_30_DAYS', sortBy: 'createdAt' });
    setLinePoolQuery(nextQuery);
  }, []);

  const createSelectedProblem = useCallback(async () => {
    const shipment = selectedLineRows[0]?.shipment;
    if (!shipment) return;
    await apiClient.createOperationProblemTicket(shipment.id, { reason: '运营工作台批量创建问题件', customerVisible: false });
    message.success('已创建问题件');
    void fetchLinePool(linePoolQuery);
  }, [apiClient, fetchLinePool, linePoolQuery, selectedLineRows]);

  const addSelectedTracking = useCallback(async () => {
    const shipment = selectedLineRows[0]?.shipment;
    if (!shipment) return;
    await apiClient.addOperationTrackingEvent(shipment.id, { status: '运营工作台追加轨迹', happenedAt: new Date().toISOString(), visibleToCustomer: false });
    message.success('已追加轨迹');
    void fetchLinePool(linePoolQuery);
  }, [apiClient, fetchLinePool, linePoolQuery, selectedLineRows]);

  const linePoolColumnMap = useMemo<Record<LinePoolColumnKey, ManagedTableColumn<LineShipmentPoolRow>>>(() => ({
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
    customerSales: {
      key: 'customerSales',
      title: '客户信息 / 业务员',
      width: 170,
      sortValue: (row) => row.shipment.customerName,
      render: (_, row) => <div className="line-pool-cell-stack"><OperationText strong>{row.shipment.customerName}</OperationText><OperationText type="secondary">{row.shipment.salesperson ?? '-'}</OperationText></div>
    },
    orderNo: {
      key: 'orderNo',
      title: '单号',
      width: 190,
      sortValue: (row) => row.shipment.systemOrderNo,
      render: (_, row) => <div className="line-pool-cell-stack"><Button type="link" className="line-pool-link" onClick={() => onViewShipment(row.shipment)}>{row.shipment.systemOrderNo}</Button><OperationText type="secondary">{row.shipment.transferNo || '待获取快递号'}</OperationText></div>
    },
    route: {
      key: 'route',
      title: '路由',
      width: 220,
      sortValue: (row) => `${row.shipment.destinationCountry}|${row.shipment.channelName ?? ''}|${row.shipment.agentName ?? ''}`,
      render: (_, row) => <div className="line-pool-cell-stack"><span>{row.shipment.destinationCountry}</span><span>{row.shipment.channelName || '-'}</span><OperationText type="secondary">{row.shipment.agentName || '-'}</OperationText></div>
    },
    status: { key: 'status', title: '状态', width: 100, sortValue: (row) => row.shipment.status, render: (_, row) => <Tag color={statusColor(row.shipment.status)}>{shipmentStatusLabels[row.shipment.status]}</Tag> },
    latestTracking: {
      key: 'latestTracking',
      title: '最新物流轨迹',
      width: 210,
      sortValue: (row) => row.latestTracking,
      render: (_, row) => <div className="line-pool-cell-stack"><span>{row.latestTracking || '-'}</span><OperationText type="secondary">{row.shipment.trackingStaleDays > 0 ? `${row.shipment.trackingStaleDays} 天未更新` : '今日更新'}</OperationText></div>
    },
    volumeFee: {
      key: 'volumeFee',
      title: '货量 / 包裹',
      width: 190,
      sortValue: (row) => row.packageSummary?.totalWeightKg ?? row.shipment.agentWeightKg ?? row.shipment.chargeableWeightKg ?? row.shipment.receivableWeightKg ?? row.shipment.weightKg,
      render: (_, row) => {
        const summary = row.packageSummary;
        const trackingPreview = Array.isArray(summary?.domesticTrackingNos) ? summary.domesticTrackingNos.slice(0, 2).join('、') : '';
        return (
          <div className="line-pool-cell-stack">
            <span>{formatLinePoolPackageSummary(row)}</span>
            <OperationText type="secondary">{trackingPreview || '暂无包裹摘要'}</OperationText>
          </div>
        );
      }
    },
    payment: { key: 'payment', title: '收款', width: 105, sortValue: (row) => row.receivableAmount ?? 0, render: (_, row) => canViewSensitive ? <Tag color={row.receivableAmount ? 'red' : 'default'}>{row.receivableAmount ? '未收款' : '未知'}</Tag> : '-' },
    remark: { key: 'remark', title: '备注', width: 140, sortValue: (row) => row.shipment.remark, render: (_, row) => canViewSensitive ? row.shipment.remark || '无备注' : '-' },
    action: {
      key: 'action',
      title: '操作',
      width: 164,
      fixed: 'right',
      sortable: false,
      render: (_, row) => (
        <Space size={4}>
          {canProcess ? <Button size="small" type="primary" onClick={() => onProcessShipment(row.shipment)}>处理</Button> : null}
          {can('operations:line-shipment:detail') ? <Button size="small" onClick={() => onViewShipment(row.shipment)}>详情</Button> : null}
          {can('operations:line-shipment:internal-log-view') ? (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [{ key: 'internal-log', label: '操作日志' }],
                onClick: () => void apiClient.lineShipmentInternalFlowLog(row.shipment.id).then(setFlowLog).catch((error) => message.error(error instanceof Error ? error.message : '操作日志加载失败'))
              }}
            >
              <Button size="small">更多</Button>
            </Dropdown>
          ) : null}
        </Space>
      )
    }
  }), [apiClient, can, canProcess, canViewSensitive, onProcessShipment, onViewShipment]);
  const linePoolColumns = useMemo(
    () => defaultLinePoolColumnOrder.map((key) => linePoolColumnMap[key]),
    [linePoolColumnMap]
  );
  const linePoolRowSelection = useMemo(
    () => ({ selectedRowKeys: selectedLineShipmentIds, onChange: setSelectedLineShipmentIds }),
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
      pageSize: linePoolResponse?.pagination?.pageSize ?? 20,
      total: linePoolResponse?.pagination?.totalItems ?? 0,
      showSizeChanger: false,
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
              <Space>
                <OperationText type="secondary">今日更新 {linePoolMetrics?.todayUpdatedCount ?? 0} 条</OperationText>
              </Space>
            )}
          >
            <div className="line-pool-status-strip">
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'ALL'} onClick={() => handleLinePoolStatus('ALL')}>全部 {linePoolResponse?.statusCounts?.ALL ?? 0}</LinePoolStatusButton>
              <OperationText type="secondary">审核:</OperationText>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'REVIEW_PENDING'} onClick={() => handleLinePoolStatus('REVIEW_PENDING')}>待审核 {linePoolResponse?.statusCounts?.REVIEW_PENDING ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'REVIEW_REJECTED'} onClick={() => handleLinePoolStatus('REVIEW_REJECTED')}>审核不通过 {linePoolResponse?.statusCounts?.REVIEW_REJECTED ?? 0}</LinePoolStatusButton>
              <OperationText type="secondary">仓库:</OperationText>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'WAITING_SORT'} onClick={() => handleLinePoolStatus('WAITING_SORT')}>待排货 {linePoolResponse?.statusCounts?.WAITING_SORT ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'WAITING_DISPATCH'} onClick={() => handleLinePoolStatus('WAITING_DISPATCH')}>待出库 {linePoolResponse?.statusCounts?.WAITING_DISPATCH ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'OUTBOUNDED'} onClick={() => handleLinePoolStatus('OUTBOUNDED')}>已出库 {linePoolResponse?.statusCounts?.OUTBOUNDED ?? 0}</LinePoolStatusButton>
              <OperationText type="secondary">客服:</OperationText>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'DATA_CONFIRM'} onClick={() => handleLinePoolStatus('DATA_CONFIRM')}>数据确认 {linePoolResponse?.statusCounts?.DATA_CONFIRM ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'TRANSFER_NO'} onClick={() => handleLinePoolStatus('TRANSFER_NO')}>转单号 {linePoolResponse?.statusCounts?.TRANSFER_NO ?? 0}</LinePoolStatusButton>
              <OperationText type="secondary">运输:</OperationText>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'WAITING_DEPARTURE'} onClick={() => handleLinePoolStatus('WAITING_DEPARTURE')}>待离港 {linePoolResponse?.statusCounts?.WAITING_DEPARTURE ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'DEPARTED'} onClick={() => handleLinePoolStatus('DEPARTED')}>已离港 {linePoolResponse?.statusCounts?.DEPARTED ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'ARRIVED_PORT'} onClick={() => handleLinePoolStatus('ARRIVED_PORT')}>已到港 {linePoolResponse?.statusCounts?.ARRIVED_PORT ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'DELIVERING'} onClick={() => handleLinePoolStatus('DELIVERING')}>已派送 {linePoolResponse?.statusCounts?.DELIVERING ?? 0}</LinePoolStatusButton>
              <OperationText type="secondary">签收:</OperationText>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'SIGNED'} onClick={() => handleLinePoolStatus('SIGNED')}>已签收 {linePoolResponse?.statusCounts?.SIGNED ?? 0}</LinePoolStatusButton>
              <OperationText type="secondary">异常:</OperationText>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'PROBLEM'} danger onClick={() => handleLinePoolStatus('PROBLEM')}>问题件 {linePoolResponse?.statusCounts?.PROBLEM ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'AFTER_SALE'} danger onClick={() => handleLinePoolStatus('AFTER_SALE')}>售后 {linePoolResponse?.statusCounts?.AFTER_SALE ?? 0}</LinePoolStatusButton>
            </div>

            <div className="line-pool-filter-strip">
              <Input
                allowClear
                prefix={<Search size={16} />}
                value={linePoolDraft.keyword}
                placeholder="搜索客户 / 运单号 / 快递号 / 转单号 / 渠道 / 代理"
                onChange={(event) => setLinePoolDraft((current) => ({ ...current, keyword: event.target.value }))}
              />
              <Space.Compact>
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
                value={linePoolDraft.sortBy}
                options={[
                  { value: 'createdAt', label: '默认顺序' },
                  { value: 'customerName', label: '按客户' },
                  { value: 'systemOrderNo', label: '按单号' },
                  { value: 'status', label: '按状态' }
                ]}
                onChange={(value) => setLinePoolDraft((current) => ({ ...current, sortBy: value }))}
              />
              <Button type="primary" icon={<Search size={16} />} onClick={handleLinePoolSearch}>查询</Button>
              <Button icon={<RotateCcw size={16} />} onClick={handleLinePoolReset}>重置</Button>
              <Button type="link">收起</Button>
            </div>

            <div className="line-pool-batch-bar">
              <OperationText>已选 {selectedLineShipmentIds.length} 单</OperationText>
              {can('operations:line-shipment:problem-create') ? <Button type="primary" disabled={!selectedLineShipmentIds.length} onClick={() => void createSelectedProblem()}>新建问题</Button> : null}
              {can('operations:line-shipment:tracking-add') ? <Button disabled={!selectedLineShipmentIds.length} onClick={() => void addSelectedTracking()}>添加轨迹</Button> : null}
            </div>

            <ManagedTable<LineShipmentPoolRow>
              className="line-pool-table"
              rowKey={getLinePoolRowKey}
              loading={linePoolLoading}
              columns={linePoolColumns}
              dataSource={linePoolRows}
              size="small"
              rowSelection={linePoolRowSelection}
              minimumScrollX={1420}
              columnSettings={linePoolColumnSettings}
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
      <Modal title="内部流通操作日志" open={Boolean(flowLog)} footer={<Button onClick={() => setFlowLog(null)}>关闭</Button>} onCancel={() => setFlowLog(null)}>
        <Space direction="vertical" className="full-width">{flowLog?.items.length ? flowLog.items.map((item, index) => <Card key={item.key} size="small" className={index === flowLog.items.length - 1 ? 'latest-flow-log' : ''}><OperationText strong>{item.stage}</OperationText><br /><OperationText type="secondary">{item.happenedAt ? formatBeijingDateTime(item.happenedAt) : '暂无记录'} / {item.operator ?? '系统'}</OperationText><br /><OperationText>{item.summary}</OperationText></Card>) : <OperationText type="secondary">暂无记录</OperationText>}</Space>
      </Modal>
    </AppPage>
  );
}

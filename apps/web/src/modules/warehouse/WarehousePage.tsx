import type { Key, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntdApp, AutoComplete, Button, Card, Checkbox, Col, Descriptions, Drawer, Flex, Input, InputNumber, Modal, Popconfirm, Radio, Row, Segmented, Space, Statistic, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Download, FileText, PackageCheck, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { type BusinessCostAuditSummary, type MiscFeeTallyDueItem, type Shipment, type StaffRoleKey, type WarehouseConsolidationSummary, type WarehouseInStockPageResponse, type WarehouseInStockQuery, type WarehouseInStockTotals, type WarehouseMachineImportResponse, type WarehouseManualReceiptCartonSpecInput, type WarehouseManualReceiptCreateInput, type WarehouseManualReceiptCustomerOption, type WarehousePackageSummary, type WarehousePackageUpdateInput, type WarehouseTallyHistoricalAggregateCorrectionPreview, type WarehouseTallyHistoricalAggregateScanSummary, type WarehouseTallyRepeatBatchSummary, type WarehouseTallyRepeatOperatorSummary, type WarehouseTallyRepeatStatisticsQuery, type WarehouseTallyRepeatStatisticsResponse, type WarehouseTallyTaskSummary, type WarehouseTodayQuery, type WarehouseTodayTotals } from '@siyuan/shared';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';
import { getShipmentStageDwellSeconds, getShipmentStageDwellText } from '../shared/shipmentStageDwell';
import { ApiClient, type PermissionKey } from '../../apiClient';
import { formatBeijingDateTime, formatBeijingDateTimeInputValue, parseBeijingDateTimeInputToIso } from '../shared/format';
import { agentFieldLabels } from '../shared/agentFieldLabels';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { createPendingRoutingColumns } from '../shared/pendingRoutingColumns';
import { PlaceholderPanel } from '../shared/PlaceholderPanel';
import { ShipmentRiskFlag, isShipmentRiskFlagActive } from '../shared/ShipmentRiskFlag';
import { AppActionGroup, AppDatePicker, AppPage, AppPageHeader, ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, ManagedTable, MetricCard, paginationWhenNeeded, renderFilterActions, renderFilterField, renderNoticeBar, resolveListPaginationChange, tenRowTablePagination, type ManagedTableColumns } from '../shared/ui';
import {
  calculateWarehousePackageMetrics,
  calculateWarehouseVolumetricWeight,
  escapeHtml,
  formatWarehousePackageNo,
  parseWarehousePackageCode
} from './utils';
import { WarehouseTallyHistoryChain } from './WarehouseTallyHistoryChain';
import { WarehouseCompletedTallyPanel } from './WarehouseCompletedTallyPanel';
import { WarehouseSplitTicketFields } from './WarehouseSplitTicketFields';
import { createWarehouseTallyLabelHtml, printWarehouseTallyLabelHtml } from './warehouse-tally-print';
import {
  canOpenWarehouseSplit,
  createEvenWarehouseSplitPieces,
  resizeWarehouseSplitPieces,
  validateWarehouseSplitPieces,
  type WarehouseSplitPiece
} from './warehouseSplitDraft';
import { composeWarehouseDeviceRemark, splitWarehouseDeviceRemark } from './warehouseDeviceRemark';
import { resolveWarehouseMeasurementStatusPresentation } from './warehouseMeasurementStatus';
import { WarehouseRentDetailPanel } from './WarehouseRentDetailPanel';
import { WarehouseMachineImportModal } from './WarehouseMachineImportModal';
import { WarehouseCreateTallyModal } from './WarehouseCreateTallyModal';
import { WarehouseCompleteTallyModal, type WarehouseTallySourceItem } from './WarehouseCompleteTallyModal';
import { downloadWarehouseMachineExport, isWarehouseMachineExportReady, resolveWarehouseMachineExportRecords } from './warehouseMachineExport';
import {
  calculateCartonSpecTotals,
  attachWarehouseRentDetails,
  canEditUnenteredWarehousePackage,
  createEmptyCartonSpec,
  createInitialWarehousePackages,
  createWarehouseApiPackages,
  createWarehouseHandoverNo,
  currentPageIds,
  defaultInStockColumnKeys,
  defaultTodayReceiptColumnKeys,
  formatWarehouseDateTimeInputValue,
  isRecentWarehouseTallyArchive,
  isRecentWarehouseTallyTask,
  isTalliedWarehousePackage,
  isWarehouseCustomerUnmaintained,
  isWarehousePackageTallyInProgress,
  mapWarehouseApiPackageToInbound,
  warehouseQueueColumnLabels,
  warehouseQueueColumnSettingsKey,
  warehouseQueueDefaultColumnKeys,
  withWarehouseCustomerProgress,
  type TallyTaskCompleteDraft,
  type WarehouseConsolidationRecord,
  type WarehouseHandoverRow,
  type WarehouseInboundPackage,
  type WarehouseLabelQueueRow,
  type WarehousePackageDraft,
  type WarehousePackageEditDraft
} from './warehousePageModel';
import { canUseWarehouseSameSpecReplenish } from './warehouseSameSpecPermission';

export { canEditUnenteredWarehousePackage } from './warehousePageModel';

export function getWarehouseOutboundRemark(shipment?: Shipment) {
  return shipment?.warehouseOutboundRemark?.trim() || undefined;
}

export function isEligibleWarehouseSameSpecSource(record: WarehouseInboundPackage) {
  return canEditUnenteredWarehousePackage(record)
    && !isWarehousePackageTallyInProgress(record)
    && !record.tallyTaskId
    && !record.sourcePackageId
    && Boolean(record.scanSource)
    && record.scanSource !== '手动添加'
    && record.scanSource !== '同箱规补录'
    && record.measurementStatus === 'MEASURED'
    && record.packageCount === 1
    && record.weightKg > 0
    && record.lengthCm > 0
    && record.widthCm > 0
    && record.heightCm > 0
    && !record.actualSystemOrderNo
    && !record.shipmentId;
}

export function hasWarehousePackageEditChanges(
  record: WarehouseInboundPackage,
  draft: WarehousePackageEditDraft
) {
  return draft.customerCode.trim() !== (record.customerCode || record.customerOrderNo).trim()
    || draft.domesticTrackingNo.trim() !== record.domesticTrackingNo.trim()
    || draft.combinedOrderNo.trim() !== record.combinedOrderNo.trim()
    || Number(draft.packageIndex) !== Number(record.packageIndex ?? 1)
    || draft.scanTime !== formatWarehouseDateTimeInputValue(record.scanTime || record.inboundAt || record.createdAt)
    || Number(draft.packageCount) !== Number(record.packageCount)
    || Number(draft.weightKg) !== Number(record.weightKg)
    || Number(draft.lengthCm) !== Number(record.lengthCm)
    || Number(draft.widthCm) !== Number(record.widthCm)
    || Number(draft.heightCm) !== Number(record.heightCm)
    || draft.remark.trim() !== (record.remark ?? '').trim()
    || draft.manualException.trim() !== (record.manualException ?? '').trim();
}

interface WarehouseSameSpecPendingRequest {
  requestId: string;
  supplementCount: number;
  draft: WarehousePackageEditDraft;
}

function warehouseSameSpecPendingStorageKey(packageId: string) {
  return `warehouse:same-spec-replenish:${packageId}`;
}

function readWarehouseSameSpecPendingRequest(packageId: string): WarehouseSameSpecPendingRequest | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(warehouseSameSpecPendingStorageKey(packageId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WarehouseSameSpecPendingRequest>;
    if (!parsed.requestId || !Number.isInteger(parsed.supplementCount) || parsed.supplementCount! < 1 || !parsed.draft) {
      return null;
    }
    return parsed as WarehouseSameSpecPendingRequest;
  } catch {
    return null;
  }
}

function writeWarehouseSameSpecPendingRequest(packageId: string, pending: WarehouseSameSpecPendingRequest) {
  try {
    const storage = globalThis.sessionStorage;
    if (!storage) return false;
    const key = warehouseSameSpecPendingStorageKey(packageId);
    const serialized = JSON.stringify(pending);
    storage.setItem(key, serialized);
    return storage.getItem(key) === serialized;
  } catch {
    return false;
  }
}

function clearWarehouseSameSpecPendingRequest(packageId: string) {
  try {
    globalThis.sessionStorage?.removeItem(warehouseSameSpecPendingStorageKey(packageId));
  } catch {
    // Storage cleanup failure must not turn a confirmed request into a second request in this modal.
  }
}

const { Text } = Typography;
type WarehouseHandoverPrintOrientation = 'landscape' | 'portrait';
const warehouseTablePageSize = 10;
const warehousePageCacheTtlMs = 15_000;
const defaultWarehouseTodayFilters: WarehouseTodayQuery = {
  dataScope: 'OWN',
  datePreset: 'TODAY',
  site: '',
  customerOrderNo: '',
  domesticTrackingNo: '',
  combinedOrderNo: ''
};
const defaultWarehouseInStockFilters: WarehouseInStockQuery = {
  dataScope: 'OWN',
  site: '',
  customerOrderNo: '',
  domesticTrackingNo: '',
  combinedOrderNo: '',
  operationKeyword: ''
};
const defaultWarehouseTallyRepeatFilters: WarehouseTallyRepeatStatisticsQuery = {
  datePreset: '30D',
  operator: '',
  keyword: '',
  onlyRepeated: true
};
const emptyWarehouseTallyRepeatStatistics: WarehouseTallyRepeatStatisticsResponse = {
  summary: {
    completedBatchCount: 0,
    repeatedBatchCount: 0,
    extraTallyCount: 0,
    repeatRate: 0,
    maxTallyCount: 0
  },
  salespeople: [],
  operators: [],
  batches: [],
  updatedAt: ''
};

type WarehouseRowsSnapshot<TTotals> = {
  updatedAt: number;
  rows: WarehouseInboundPackage[];
  totals: TTotals;
};

type WarehousePageCache = {
  packages?: { updatedAt: number; rows: WarehouseInboundPackage[] };
  todayByQuery: Map<string, WarehouseRowsSnapshot<WarehouseTodayTotals>>;
  inStockByQuery: Map<string, WarehouseRowsSnapshot<WarehouseInStockTotals>>;
  completedArchive?: { updatedAt: number; rows: WarehouseInboundPackage[] };
  tallyTasks?: { updatedAt: number; rows: WarehouseTallyTaskSummary[] };
};

const warehousePageCache = new WeakMap<ApiClient, WarehousePageCache>();

function getWarehousePageCache(apiClient: ApiClient) {
  const cached = warehousePageCache.get(apiClient);
  if (cached) return cached;
  const created: WarehousePageCache = {
    todayByQuery: new Map(),
    inStockByQuery: new Map()
  };
  warehousePageCache.set(apiClient, created);
  return created;
}

function isFreshWarehouseSnapshot(updatedAt: number) {
  return Date.now() - updatedAt <= warehousePageCacheTtlMs;
}

function warehouseQueryKey(query: WarehouseTodayQuery | WarehouseInStockQuery) {
  return JSON.stringify(query);
}

function downloadHtmlFile(html: string, fileName: string, mimeType: string) {
  const blob = new globalThis.Blob([html], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * 未完成理货是仓库待办队列，按业务实际提交理货需求的时间先进先出。
 * 时间异常的历史记录置后，并以任务号稳定兜底，避免刷新时任务跳位。
 */
export function sortPendingTallyTasksByRequestTime(tasks: WarehouseTallyTaskSummary[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    const leftValid = Number.isFinite(leftTime);
    const rightValid = Number.isFinite(rightTime);
    if (leftValid && rightValid && leftTime !== rightTime) return leftTime - rightTime;
    if (leftValid !== rightValid) return leftValid ? -1 : 1;
    return left.taskNo.localeCompare(right.taskNo, 'zh-Hans-CN');
  });
}

export function formatWarehouseHandoverEntryNo(shipment: Pick<Shipment, 'inboundNo'>) {
  return shipment.inboundNo?.trim() || '-';
}

export function getWarehouseHandoverChannelName(shipment: Pick<Shipment, 'routeAgentChannelName'>) {
  return shipment.routeAgentChannelName?.trim() || '-';
}

type WarehouseHandoverTemplateRow = WarehouseHandoverRow & { agentChannelName?: string };

function getWarehouseHandoverTemplateChannel(row: WarehouseHandoverRow) {
  return (row as WarehouseHandoverTemplateRow).agentChannelName?.trim() || '-';
}

export function WarehousePage({
  apiClient,
  refreshVersion = 0,
  initialSection,
  notificationTarget,
  onNotificationTargetHandled,
  role,
  permissions = [],
  shipments,
  businessCostAudits = [],
  notice,
  onDispatch,
  canCreateOrderEntry = false,
  onCreateOrderEntryFromWarehouse,
  onShipmentUpdated,
  findShipmentBySystemOrderNo,
  renderShipmentOrderNoLink
}: {
  apiClient: ApiClient;
  refreshVersion?: number;
  initialSection?: string;
  notificationTarget?: { type: string; id: string };
  onNotificationTargetHandled?: (target: { type: string; id: string }) => void;
  role: StaffRoleKey;
  permissions?: PermissionKey[];
  shipments: Shipment[];
  businessCostAudits?: BusinessCostAuditSummary[];
  notice: string | null;
  onDispatch: (record: Shipment, options?: { shippingMarkConfirmed?: boolean; handoverNo?: string; batchDispatchSource?: string; miscFeeIdsToMatch?: string[] }) => Promise<void>;
  canCreateOrderEntry?: boolean;
  onCreateOrderEntryFromWarehouse?: (packageIds: string[]) => void;
  onShipmentUpdated?: (shipment: Shipment) => void;
  findShipmentBySystemOrderNo: (systemOrderNo?: string) => Shipment | undefined;
  renderShipmentOrderNoLink: (systemOrderNo?: string, options?: { shipment?: Shipment; subtitle?: string; copyText?: string }) => ReactNode;
}) {
  const { message, modal } = AntdApp.useApp();
  const config = {
    title: '仓库管理中心',
    description: '覆盖包裹件重尺、理货合并拆分、面单队列&待仓库出货和交接资料，作为仓库作业主入口。'
  };
  const hasWarehousePermission = (permission: PermissionKey) => role === 'ADMIN' || permissions.includes(permission);
  const canTodayReceiptView = hasWarehousePermission('warehouse:today-receipt:view');
  const canTodayReceiptCreate = hasWarehousePermission('warehouse:today-receipt:manual-create');
  const canInStockView = hasWarehousePermission('warehouse:in-stock:view');
  const canWarehouseMachineImport = hasWarehousePermission('warehouse:in-stock:machine-import');
  const canInStockUpdate = hasWarehousePermission('warehouse:in-stock:update');
  const canInStockSameSpecReplenish = canUseWarehouseSameSpecReplenish(role, permissions);
  const canReplenishWarehouseSameSpec = (record: WarehouseInboundPackage) => canInStockSameSpecReplenish
    && isEligibleWarehouseSameSpecSource(record);
  const canToggleTodayDataScope = canTodayReceiptView && permissions.includes('data-scope:sales-own');
  const canTodayReceiptRemark = canInStockUpdate;
  const canTodayReceiptException = canInStockUpdate;
  const canInStockSelect = hasWarehousePermission('warehouse:in-stock:batch-select');
  const canTallyStart = hasWarehousePermission('warehouse:in-stock:tally-start') || hasWarehousePermission('warehouse:in-stock:batch-tally-start');
  const canInStockSplit = hasWarehousePermission('warehouse:in-stock:split');
  const canInStockTallyRecordView = canInStockView || hasWarehousePermission('warehouse:in-stock:tally-record-view');
  const canTallyPendingView = hasWarehousePermission('warehouse:tally-pending:view');
  const canTallyUpdate = hasWarehousePermission('warehouse:tally-pending:task-update');
  const canTallyCancel = hasWarehousePermission('warehouse:tally-pending:task-cancel');
  const canTallyProcess = hasWarehousePermission('warehouse:tally-pending:task-process');
  const canTallyDetail = hasWarehousePermission('warehouse:tally-pending:detail-view');
  const canTallyCompletedView = hasWarehousePermission('warehouse:tally-completed:view');
  const canTallyCompletedDetail = hasWarehousePermission('warehouse:tally-completed:detail-view');
  const canTallyCompletedReverseReview = hasWarehousePermission('warehouse:tally-completed:reverse-review');
  const canTallyHistoryCorrect = hasWarehousePermission('warehouse:tally-history:correct');
  const canTallyLabelGenerate = hasWarehousePermission('warehouse:tally-label:generate');
  const canTallyLabelPrint = hasWarehousePermission('warehouse:tally-label:print') || hasWarehousePermission('warehouse:tally-label:reprint');
  const canTallyLabelDownload = hasWarehousePermission('warehouse:tally-label:download');
  const canDispatchView = hasWarehousePermission('warehouse:dispatch-pending:view');
  const canDispatchSelect = hasWarehousePermission('warehouse:dispatch-pending:batch-select');
  const canHandoverPrint = hasWarehousePermission('warehouse:dispatch-pending:handover-print');
  const canDispatchConfirm = hasWarehousePermission('warehouse:dispatch-pending:dispatch-confirm');
  const canBatchDispatchConfirm = hasWarehousePermission('warehouse:dispatch-pending:batch-dispatch-confirm');
  const canShippingMarkConfirm = hasWarehousePermission('warehouse:dispatch-pending:shipping-mark-confirm');
  const canEditDispatchDeclaration = hasWarehousePermission('warehouse:dispatch-pending:declaration-update');
  const canOutboundedView = hasWarehousePermission('warehouse:outbounded:view');
  const canRentDetailView = hasWarehousePermission('warehouse:rent-detail:view');
  const canRentDetailExport = hasWarehousePermission('warehouse:rent-detail:export');
  const canRentRuleView = hasWarehousePermission('warehouse:rent-rule:view');
  const canRentRuleManage = hasWarehousePermission('warehouse:rent-rule:manage');
  const workQueue = shipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH');
  const pendingRoutingShipments = shipments.filter((shipment) => shipment.status === 'WAITING_SORT');
  const initialCache = getWarehousePageCache(apiClient);
  const cachedPackages = initialCache.packages && isFreshWarehouseSnapshot(initialCache.packages.updatedAt)
    ? initialCache.packages.rows
    : [];
  const cachedToday = initialCache.todayByQuery.get(warehouseQueryKey(defaultWarehouseTodayFilters));
  const cachedCompletedArchive = initialCache.completedArchive && isFreshWarehouseSnapshot(initialCache.completedArchive.updatedAt)
    ? initialCache.completedArchive.rows
    : [];
  const cachedTallyTasks = initialCache.tallyTasks && isFreshWarehouseSnapshot(initialCache.tallyTasks.updatedAt)
    ? initialCache.tallyTasks.rows
    : [];
  const [activeReceiveSection, setActiveReceiveSection] = useState(initialSection ?? 'today');
  const [warehousePackages, setWarehousePackages] = useState<WarehouseInboundPackage[]>(cachedPackages);
  const warehousePackagesFallbackRef = useRef<Promise<WarehouseInboundPackage[]> | null>(null);
  const shipmentsRef = useRef(shipments);
  shipmentsRef.current = shipments;
  const [todayReceiptRows, setTodayReceiptRows] = useState<WarehouseInboundPackage[]>(
    cachedToday && isFreshWarehouseSnapshot(cachedToday.updatedAt) ? cachedToday.rows : []
  );
  const [todayReceiptRowsQueryKey, setTodayReceiptRowsQueryKey] = useState<string | null>(
    cachedToday && isFreshWarehouseSnapshot(cachedToday.updatedAt)
      ? warehouseQueryKey(defaultWarehouseTodayFilters)
      : null
  );
  const [todayTotals, setTodayTotals] = useState<WarehouseTodayTotals>(cachedToday && isFreshWarehouseSnapshot(cachedToday.updatedAt)
    ? cachedToday.totals
    : {
    receiptTickets: 0,
    totalPackages: 0,
    totalWeightKg: 0,
    totalCbm: 0,
    waitingDispatchTickets: 0,
    pendingTallyTickets: 0,
    exceptionTickets: 0
  });
  const emptyTodayFilters = defaultWarehouseTodayFilters;
  const [todayFilterDraft, setTodayFilterDraft] = useState<WarehouseTodayQuery>(emptyTodayFilters);
  const [todayFilters, setTodayFilters] = useState<WarehouseTodayQuery>(emptyTodayFilters);
  const [todayReceiptRefreshVersion, setTodayReceiptRefreshVersion] = useState(0);
  const [selectedTodayPackageIds, setSelectedTodayPackageIds] = useState<string[]>([]);
  const [todayReceiptPagination, setTodayReceiptPagination] = useState({ current: 1, pageSize: warehouseTablePageSize });
  const [selectedWarehouseQueueRowIds, setSelectedWarehouseQueueRowIds] = useState<string[]>([]);
  const [batchHandoverOpen, setBatchHandoverOpen] = useState(false);
  const [batchHandoverRemark, setBatchHandoverRemark] = useState('');
  const [batchHandoverPrintOrientation, setBatchHandoverPrintOrientation] = useState<WarehouseHandoverPrintOrientation>('landscape');
  const [batchShippingMarkConfirmed, setBatchShippingMarkConfirmed] = useState(false);
  const [batchDispatching, setBatchDispatching] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [manualReceiptDrawerOpen, setManualReceiptDrawerOpen] = useState(false);
  const [machineImportOpen, setMachineImportOpen] = useState(false);
  const [machineExporting, setMachineExporting] = useState(false);
  const [manualReceiptCustomers, setManualReceiptCustomers] = useState<WarehouseManualReceiptCustomerOption[]>([]);
  const [manualReceiptCustomersLoading, setManualReceiptCustomersLoading] = useState(false);
  const [exceptionDraft, setExceptionDraft] = useState('');
  const emptyInStockFilters = defaultWarehouseInStockFilters;
  const [inStockFilterDraft, setInStockFilterDraft] = useState<WarehouseInStockQuery>(emptyInStockFilters);
  const [inStockFilters, setInStockFilters] = useState<WarehouseInStockQuery>(emptyInStockFilters);
  const [inStockRefreshVersion, setInStockRefreshVersion] = useState(0);
  const [inStockLoading, setInStockLoading] = useState(false);
  const inStockQueryFeedbackRef = useRef(false);
  const [inStockRows, setInStockRows] = useState<WarehouseInboundPackage[]>([]);
  const [inStockRowsQueryKey, setInStockRowsQueryKey] = useState<string | null>(null);
  const [completedTallyArchiveRows, setCompletedTallyArchiveRows] = useState<WarehouseInboundPackage[]>(cachedCompletedArchive);
  const [inStockTotals, setInStockTotals] = useState<WarehouseInStockTotals>({
    receiptTickets: 0,
    totalPackages: 0,
    totalWeightKg: 0,
    totalCbm: 0,
    waitingDispatchTickets: 0,
    pendingTallyTickets: 0,
    exceptionTickets: 0
  });
  const [inStockTotalItems, setInStockTotalItems] = useState(0);
  const [selectedInStockPackageIds, setSelectedInStockPackageIds] = useState<string[]>([]);
  const [inStockPagination, setInStockPagination] = useState({ current: 1, pageSize: warehouseTablePageSize });
  const [tallyTaskPackageIds, setTallyTaskPackageIds] = useState<string[]>([]);
  const [tallyTasks, setTallyTasks] = useState<WarehouseTallyTaskSummary[]>(cachedTallyTasks);
  const [tallyRequirementDraft, setTallyRequirementDraft] = useState('');
  const [editingTallyTask, setEditingTallyTask] = useState<WarehouseTallyTaskSummary | null>(null);
  const [editingTallyPackageIds, setEditingTallyPackageIds] = useState<string[]>([]);
  const [editingTallyRequirement, setEditingTallyRequirement] = useState('');
  const [editingTallyRemark, setEditingTallyRemark] = useState('');
  const [editingTallySubmitting, setEditingTallySubmitting] = useState(false);
  const [cancellingTallyTask, setCancellingTallyTask] = useState<WarehouseTallyTaskSummary | null>(null);
  const [cancellingTallySubmitting, setCancellingTallySubmitting] = useState(false);
  const [completingTallyTask, setCompletingTallyTask] = useState<WarehouseTallyTaskSummary | null>(null);
  const [editingCompletedTallyTask, setEditingCompletedTallyTask] = useState<WarehouseTallyTaskSummary | null>(null);
  const [editingCompletedTallyCount, setEditingCompletedTallyCount] = useState(1);
  const [editingCompletedTallySubmitting, setEditingCompletedTallySubmitting] = useState(false);
  const [tallyCompleteError, setTallyCompleteError] = useState<string | null>(null);
  const [tallyCompleteSubmitting, setTallyCompleteSubmitting] = useState(false);
  const tallyCompleteSubmittingRef = useRef(false);
  const [completedTallyView, setCompletedTallyView] = useState<'tasks' | 'history' | 'repeat-statistics'>('tasks');
  const [tallyRepeatStatistics, setTallyRepeatStatistics] = useState<WarehouseTallyRepeatStatisticsResponse>(emptyWarehouseTallyRepeatStatistics);
  const [tallyRepeatFilterDraft, setTallyRepeatFilterDraft] = useState<WarehouseTallyRepeatStatisticsQuery>(defaultWarehouseTallyRepeatFilters);
  const [tallyRepeatFilters, setTallyRepeatFilters] = useState<WarehouseTallyRepeatStatisticsQuery>(defaultWarehouseTallyRepeatFilters);
  const [tallyRepeatStatisticsView, setTallyRepeatStatisticsView] = useState<'operators' | 'batches'>('operators');
  const [tallyRepeatStatisticsLoading, setTallyRepeatStatisticsLoading] = useState(false);
  const [tallyRepeatRefreshVersion, setTallyRepeatRefreshVersion] = useState(0);
  const [tallyRepeatOperatorOptions, setTallyRepeatOperatorOptions] = useState<string[]>([]);
  const [selectedTallyTaskDetails, setSelectedTallyTaskDetails] = useState<WarehouseTallyTaskSummary[]>([]);
  const [tallyCorrectionTask, setTallyCorrectionTask] = useState<WarehouseTallyTaskSummary | null>(null);
  const [tallyCorrectionPreview, setTallyCorrectionPreview] = useState<WarehouseTallyHistoricalAggregateCorrectionPreview | null>(null);
  const [tallyCorrectionLoading, setTallyCorrectionLoading] = useState(false);
  const [tallyCorrectionConfirmed, setTallyCorrectionConfirmed] = useState(false);
  const [selectedTallySourcePackages, setSelectedTallySourcePackages] = useState<WarehousePackageSummary[]>();
  const [tallySourcePackagesLoading, setTallySourcePackagesLoading] = useState(false);
  const [tallySourcePackagesError, setTallySourcePackagesError] = useState<string>();
  const tallyTaskDetailRequestRef = useRef(0);
  const [notificationPackageDetailTarget, setNotificationPackageDetailTarget] = useState<WarehouseInboundPackage | null>(null);
  const [tallyCompleteDraft, setTallyCompleteDraft] = useState<TallyTaskCompleteDraft>({
    packageCount: 1,
    weightKg: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    remark: ''
  });
  const [tallyProcessMode, setTallyProcessMode] = useState<'KEEP' | 'MERGE' | 'SPLIT'>('KEEP');
  const [tallyProcessSourceIds, setTallyProcessSourceIds] = useState<string[]>([]);
  const [tallySplitPieces, setTallySplitPieces] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [tallyPackagePagination, setTallyPackagePagination] = useState({ current: 1, pageSize: warehouseTablePageSize });
  const [consolidations, setConsolidations] = useState<WarehouseConsolidationRecord[]>([]);
  const [selectedConsolidationId, setSelectedConsolidationId] = useState<string | null>(null);
  const [dispatchingWarehouseShipmentIds, setDispatchingWarehouseShipmentIds] = useState<string[]>([]);
  const [warehouseNotice, setWarehouseNotice] = useState<string | null>(null);
  const [declarationEditShipment, setDeclarationEditShipment] = useState<Shipment | null>(null);
  const [declarationEditValue, setDeclarationEditValue] = useState(false);
  const [declarationEditSubmitting, setDeclarationEditSubmitting] = useState(false);
  const [orderEntryPreparing, setOrderEntryPreparing] = useState(false);
  const emptyConsolidationPackageFilters = {
    customerCode: '',
    systemOrderNo: '',
    domesticTrackingNo: '',
    tallyStatus: 'ALL'
  };
  const [consolidationPackageFilterDraft, setConsolidationPackageFilterDraft] = useState(emptyConsolidationPackageFilters);
  const [consolidationPackageFilters, setConsolidationPackageFilters] = useState(emptyConsolidationPackageFilters);
  const [splittingPackage, setSplittingPackage] = useState<WarehouseInboundPackage | null>(null);
  const [sameSpecSupplementCount, setSameSpecSupplementCount] = useState(0);
  const [sameSpecRequestId, setSameSpecRequestId] = useState('');
  const [sameSpecRequestAttempted, setSameSpecRequestAttempted] = useState(false);
  const [splitDraft, setSplitDraft] = useState<{
    splitCount: number;
    pieces: WarehouseSplitPiece[];
    remark: string;
  }>({ splitCount: 2, pieces: [null, null], remark: '' });
  const [packageDraft, setPackageDraft] = useState<WarehousePackageDraft>({
    customerCode: '',
    combinedOrderNo: '',
    totalPackageCount: 1,
    packageIndex: 1,
    domesticTrackingNo: '',
    scanTime: formatBeijingDateTimeInputValue(),
    weightKg: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    packageCount: 1,
    divisor: 6000,
    remark: '',
    manualException: '',
    cartonSpecs: [createEmptyCartonSpec()]
  });
  const [editingPackage, setEditingPackage] = useState<WarehouseInboundPackage | null>(null);
  const [packageEditDraft, setPackageEditDraft] = useState<WarehousePackageEditDraft | null>(null);
  const [savingPackageEdit, setSavingPackageEdit] = useState(false);
  const needsTodayReceipts = activeReceiveSection === 'dashboard' || activeReceiveSection === 'today';
  const needsInStockSummary = activeReceiveSection === 'dashboard';
  const needsInStock = ['packages', 'consolidation'].includes(activeReceiveSection);
  const needsCompletedArchive = activeReceiveSection === 'dashboard' || activeReceiveSection === 'completed-consolidation';
  const needsTallyTasks = ['dashboard', 'consolidation', 'completed-consolidation'].includes(activeReceiveSection);
  const mergeWarehousePackages = useCallback((
    rows: WarehouseInboundPackage[],
    options: { recalculateCustomerProgress?: boolean } = {}
  ) => {
    setWarehousePackages((current) => {
      const rowById = new Map(current.map((row) => [row.id, row]));
      rows.forEach((row) => rowById.set(row.id, row));
      const mergedRows = options.recalculateCustomerProgress === false
        ? [...rowById.values()]
        : withWarehouseCustomerProgress([...rowById.values()]);
      getWarehousePageCache(apiClient).packages = { updatedAt: Date.now(), rows: mergedRows };
      return mergedRows;
    });
  }, [apiClient]);
  const loadWarehousePackagesFallback = useCallback(() => {
    if (!warehousePackagesFallbackRef.current) {
      warehousePackagesFallbackRef.current = apiClient.warehouseQuery.warehousePackages()
        .then((rows) => {
          const mappedRows = withWarehouseCustomerProgress(rows.map(mapWarehouseApiPackageToInbound));
          getWarehousePageCache(apiClient).packages = { updatedAt: Date.now(), rows: mappedRows };
          return mappedRows;
        })
        .catch(() => withWarehouseCustomerProgress([
          ...createWarehouseApiPackages(),
          ...createInitialWarehousePackages(shipmentsRef.current)
        ]));
    }
    return warehousePackagesFallbackRef.current;
  }, [apiClient]);
  useEffect(() => {
    warehousePackagesFallbackRef.current = null;
  }, [loadWarehousePackagesFallback, refreshVersion]);
  useEffect(() => {
    if (initialSection) setActiveReceiveSection(initialSection);
  }, [initialSection]);
  useEffect(() => {
    if (!notificationTarget) return;
    let alive = true;
    const finish = () => {
      if (alive) onNotificationTargetHandled?.(notificationTarget);
    };
    if (notificationTarget.type === 'WAREHOUSE_PACKAGE') {
      if (!canInStockView) {
        setWarehouseNotice('当前账号没有查看通知关联在仓货物的权限');
        finish();
        return () => { alive = false; };
      }
      setActiveReceiveSection('packages');
      void apiClient.warehouseQuery.warehousePackages()
        .then((rows) => {
          if (!alive) return;
          const target = rows.find((row) => row.id === notificationTarget.id);
          if (target) {
            setNotificationPackageDetailTarget(withWarehouseCustomerProgress([mapWarehouseApiPackageToInbound(target)])[0]);
          } else {
            setWarehouseNotice('通知关联的在仓货物已不存在或当前账号无查看权限');
          }
        })
        .catch((error) => {
          if (alive) setWarehouseNotice(error instanceof Error ? error.message : '加载通知关联在仓货物失败');
        })
        .finally(finish);
      return () => { alive = false; };
    }
    if (notificationTarget.type === 'WAREHOUSE_TALLY') {
      if (!canTallyCompletedView || !canTallyCompletedDetail) {
        if (!canInStockView) {
          setWarehouseNotice('当前账号没有查看通知关联理货记录的权限');
          finish();
          return () => { alive = false; };
        }
        setActiveReceiveSection('packages');
        void apiClient.warehouseQuery.warehousePackages()
          .then((packages) => {
            if (!alive) return;
            const packageTarget = packages.find((item) => item.tallyTaskId === notificationTarget.id);
            if (packageTarget) {
              setNotificationPackageDetailTarget(withWarehouseCustomerProgress([mapWarehouseApiPackageToInbound(packageTarget)])[0]);
            } else {
              setWarehouseNotice('通知关联的理货货物已不存在或当前账号无查看权限');
            }
          })
          .catch((error) => {
            if (alive) setWarehouseNotice(error instanceof Error ? error.message : '加载通知关联理货货物失败');
          })
          .finally(finish);
        return () => { alive = false; };
      }
      void apiClient.warehouseQuery.warehouseTallyTasks()
        .then((tasks) => {
          if (!alive) return;
          const target = tasks.find((task) => task.id === notificationTarget.id);
          if (!target) {
            setWarehouseNotice('通知关联的理货任务已不存在或当前账号无查看权限');
            return;
          }
          setActiveReceiveSection('completed-consolidation');
          setSelectedTallyTaskDetails([target]);
        })
        .catch((error) => {
          if (alive) setWarehouseNotice(error instanceof Error ? error.message : '加载通知关联理货记录失败');
        })
        .finally(finish);
      return () => { alive = false; };
    }
    finish();
    return () => { alive = false; };
  }, [apiClient, canInStockView, canTallyCompletedDetail, canTallyCompletedView, notificationTarget, onNotificationTargetHandled]);
  useEffect(() => {
    if (!manualReceiptDrawerOpen) return;
    let cancelled = false;
    setManualReceiptCustomersLoading(true);
    void apiClient.warehouseQuery.warehouseManualReceiptCustomers()
      .then((customers) => {
        if (!cancelled) setManualReceiptCustomers(customers);
      })
      .catch((error: unknown) => {
        if (!cancelled) setWarehouseNotice(error instanceof Error ? error.message : '客户资料加载失败');
      })
      .finally(() => {
        if (!cancelled) setManualReceiptCustomersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, manualReceiptDrawerOpen]);
  useEffect(() => {
    if (!canTodayReceiptView && !canInStockView && !canTallyCompletedView) {
      setWarehousePackages([]);
    }
  }, [canInStockView, canTallyCompletedView, canTodayReceiptView]);
  useEffect(() => {
    if (!canTodayReceiptView) {
      setTodayReceiptRows([]);
      setTodayReceiptRowsQueryKey(null);
      return;
    }
    if (!needsTodayReceipts) return;
    let alive = true;
    setTodayReceiptRowsQueryKey(null);
    apiClient.warehouseQuery.warehouseTodayReceipts(todayFilters)
      .then((response) => {
        if (!alive) return;
        const mappedRows = response.rows.map(mapWarehouseApiPackageToInbound);
        getWarehousePageCache(apiClient).todayByQuery.set(warehouseQueryKey(todayFilters), {
          updatedAt: Date.now(),
          rows: mappedRows,
          totals: response.totals
        });
        setTodayReceiptRows(mappedRows);
        setTodayReceiptRowsQueryKey(warehouseQueryKey(todayFilters));
        mergeWarehousePackages(mappedRows);
        setTodayTotals(response.totals);
        setSelectedTodayPackageIds([]);
        setTodayReceiptPagination((current) => ({ ...current, current: 1 }));
      })
      .catch(async () => {
        // OWN 视图不能在接口失败时退回未经客户归属过滤的全仓快照。
        const warehousePackageFallback = canToggleTodayDataScope && todayFilters.dataScope !== 'ALL'
          ? []
          : await loadWarehousePackagesFallback();
        if (!alive) return;
        const fallbackRows = filterTodayRows(warehousePackageFallback, todayFilters, role);
        mergeWarehousePackages(fallbackRows);
        setTodayReceiptRows(fallbackRows);
        setTodayReceiptRowsQueryKey(null);
        setTodayTotals(calculateTodayTotals(fallbackRows, workQueue.length));
        setSelectedTodayPackageIds([]);
        setTodayReceiptPagination((current) => ({ ...current, current: 1 }));
      });
    return () => {
      alive = false;
    };
  }, [apiClient, canTodayReceiptView, canToggleTodayDataScope, loadWarehousePackagesFallback, mergeWarehousePackages, needsTodayReceipts, refreshVersion, role, todayFilters, todayReceiptRefreshVersion, workQueue.length]);
  useEffect(() => {
    if (!canInStockView) {
      setInStockRows([]);
      setInStockRowsQueryKey(null);
      setInStockTotalItems(0);
      setInStockLoading(false);
      return;
    }
    if (!needsInStock) return;
    let alive = true;
    const shouldShowQueryFeedback = inStockQueryFeedbackRef.current;
    inStockQueryFeedbackRef.current = false;
    const queryKey = warehouseQueryKey(inStockFilters);
    setInStockLoading(true);
    setInStockRowsQueryKey(null);
    const serverPaginated = activeReceiveSection === 'packages';
    const request = serverPaginated
      ? apiClient.warehouseQuery.warehouseInStockPage({
          ...inStockFilters,
          page: inStockPagination.current,
          pageSize: inStockPagination.pageSize
        })
      : apiClient.warehouseQuery.warehouseInStock(inStockFilters);
    request
      .then((response) => {
        if (!alive) return;
        const mappedRows = response.rows.map(mapWarehouseApiPackageToInbound);
        const totalItems = serverPaginated
          ? (response as WarehouseInStockPageResponse).pagination.totalItems
          : mappedRows.length;
        if (!serverPaginated) {
          getWarehousePageCache(apiClient).inStockByQuery.set(queryKey, {
            updatedAt: Date.now(),
            rows: mappedRows,
            totals: response.totals
          });
        }
        setInStockRows(mappedRows);
        setInStockRowsQueryKey(queryKey);
        setInStockTotalItems(totalItems);
        mergeWarehousePackages(mappedRows, { recalculateCustomerProgress: !serverPaginated });
        setInStockTotals(response.totals);
        setSelectedInStockPackageIds([]);
        if (shouldShowQueryFeedback) {
          message.success(`查询成功，共 ${totalItems} 条`);
        }

        // 仓租是辅助展示数据，不应阻塞在仓主查询。主结果先显示，仓租返回后再补齐。
        if (canRentDetailView && mappedRows.length) {
          void apiClient.warehouseRentDetails({
            status: 'IN_STOCK',
            packageIds: mappedRows.map((row) => row.id)
          })
            .then((rentResponse) => {
              if (!alive) return;
              const rowsWithRent = attachWarehouseRentDetails(mappedRows, rentResponse.rows);
              if (!serverPaginated) {
                getWarehousePageCache(apiClient).inStockByQuery.set(queryKey, {
                  updatedAt: Date.now(),
                  rows: rowsWithRent,
                  totals: response.totals
                });
              }
              setInStockRows(rowsWithRent);
              mergeWarehousePackages(rowsWithRent, { recalculateCustomerProgress: !serverPaginated });
            })
            .catch(() => undefined);
        }
      })
      .catch(async (error) => {
        const warehousePackageFallback = await loadWarehousePackagesFallback();
        if (!alive) return;
        // OWN 视图不能在接口失败时退回未经客户归属过滤的全仓快照。
        const businessCustomerScoped = !['ADMIN', 'WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(role)
          && !canInStockUpdate;
        const fallbackRows = businessCustomerScoped
          ? []
          : filterInStockRows(warehousePackageFallback, inStockFilters, role);
        mergeWarehousePackages(fallbackRows);
        const pageRows = serverPaginated
          ? fallbackRows.slice(
              (inStockPagination.current - 1) * inStockPagination.pageSize,
              inStockPagination.current * inStockPagination.pageSize
            )
          : fallbackRows;
        setInStockRows(pageRows);
        setInStockRowsQueryKey(null);
        setInStockTotalItems(fallbackRows.length);
        setInStockTotals(calculateTodayTotals(fallbackRows, workQueue.length));
        setSelectedInStockPackageIds([]);
        if (shouldShowQueryFeedback) {
          message.error(error instanceof Error ? error.message : '查询失败，请稍后重试');
        }
      })
      .finally(() => {
        if (alive) setInStockLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeReceiveSection, apiClient, canInStockUpdate, canInStockView, canRentDetailView, inStockFilters, inStockPagination.current, inStockPagination.pageSize, inStockRefreshVersion, loadWarehousePackagesFallback, mergeWarehousePackages, message, needsInStock, refreshVersion, role, workQueue.length]);
  useEffect(() => {
    if (!canInStockView || !needsInStockSummary) return;
    let alive = true;
    apiClient.warehouseQuery.warehouseInStockSummary()
      .then((response) => {
        if (alive) setInStockTotals(response.totals);
      })
      .catch(async () => {
        const warehousePackageFallback = await loadWarehousePackagesFallback();
        if (!alive) return;
        const fallbackRows = filterInStockRows(warehousePackageFallback, {}, role);
        mergeWarehousePackages(fallbackRows);
        setInStockTotals(calculateTodayTotals(fallbackRows, workQueue.length));
      });
    return () => {
      alive = false;
    };
  }, [apiClient, canInStockView, loadWarehousePackagesFallback, mergeWarehousePackages, needsInStockSummary, refreshVersion, role, workQueue.length]);
  useEffect(() => {
    if (!canTallyCompletedView) {
      setCompletedTallyArchiveRows([]);
      return;
    }
    if (!needsCompletedArchive) return;
    let alive = true;
    apiClient.warehouseQuery.warehouseInStock({ status: 'TALLIED_ARCHIVED' })
      .then((response) => {
        if (!alive) return;
        const mappedRows = response.rows.map(mapWarehouseApiPackageToInbound).filter(isRecentWarehouseTallyArchive);
        getWarehousePageCache(apiClient).completedArchive = { updatedAt: Date.now(), rows: mappedRows };
        setCompletedTallyArchiveRows(mappedRows);
        mergeWarehousePackages(mappedRows);
      })
      .catch(async () => {
        const warehousePackageFallback = await loadWarehousePackagesFallback();
        if (!alive) return;
        const fallbackRows = warehousePackageFallback.filter((pkg) => pkg.status === 'TALLIED_ARCHIVED' && isRecentWarehouseTallyArchive(pkg));
        mergeWarehousePackages(fallbackRows);
        setCompletedTallyArchiveRows(fallbackRows);
      });
    return () => {
      alive = false;
    };
  }, [apiClient, canTallyCompletedView, loadWarehousePackagesFallback, mergeWarehousePackages, needsCompletedArchive, refreshVersion]);
  useEffect(() => {
    if (!canTallyPendingView && !canTallyCompletedView) {
      setTallyTasks([]);
      return;
    }
    if (!needsTallyTasks) return;
    let alive = true;
    const loadTallyTasks = () => {
      void apiClient.warehouseQuery.warehouseTallyTasks()
        .then((rows) => {
          if (!alive) return;
          getWarehousePageCache(apiClient).tallyTasks = { updatedAt: Date.now(), rows };
          setTallyTasks(rows);
        })
        .catch(() => {
          // Keep the last successful snapshot during a transient polling failure.
        });
    };
    loadTallyTasks();
    const refreshTimer = activeReceiveSection === 'completed-consolidation'
      ? window.setInterval(loadTallyTasks, 5000)
      : undefined;
    return () => {
      alive = false;
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
    };
  }, [activeReceiveSection, apiClient, canTallyCompletedView, canTallyPendingView, needsTallyTasks, refreshVersion]);
  useEffect(() => {
    if (
      activeReceiveSection !== 'completed-consolidation'
      || completedTallyView !== 'repeat-statistics'
      || !canTallyCompletedView
    ) return;
    let alive = true;
    setTallyRepeatStatisticsLoading(true);
    void apiClient.warehouseTallyRepeatStatistics(tallyRepeatFilters)
      .then((response) => {
        if (!alive) return;
        setTallyRepeatStatistics(response);
        setTallyRepeatOperatorOptions((current) => Array.from(new Set([
          ...current,
          ...response.operators.map((item) => item.operator)
        ])).sort((left, right) => left.localeCompare(right, 'zh-CN')));
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setWarehouseNotice(error instanceof Error ? error.message : '重复理货统计加载失败');
      })
      .finally(() => {
        if (alive) setTallyRepeatStatisticsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [
    activeReceiveSection,
    apiClient,
    canTallyCompletedView,
    completedTallyView,
    refreshVersion,
    tallyRepeatFilters,
    tallyRepeatRefreshVersion
  ]);
  const draftMetrics = calculateCartonSpecTotals(packageDraft.cartonSpecs);
  const selectedManualReceiptCustomer = manualReceiptCustomers.find((customer) => customer.code === packageDraft.customerCode.trim());
  const manualReceiptCustomerOptions = manualReceiptCustomers.map((customer) => ({
    value: customer.code,
    label: `${customer.code} - ${customer.name}`
  }));
  const includesFilter = (value: string | undefined, keyword: string) =>
    !keyword.trim() || (value ?? '').toLowerCase().includes(keyword.trim().toLowerCase());
  const isOperatorView = !['ADMIN', 'WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(role)
    && !canInStockUpdate;
  const viewingAllTodayData = canToggleTodayDataScope && todayFilters.dataScope === 'ALL';
  const orderEntryActionLabel = '录单';
  function filterTodayRows(rows: WarehouseInboundPackage[], filters: WarehouseTodayQuery, currentRole: StaffRoleKey) {
    const keyword = (value: string | undefined, needle: string | undefined) =>
      !needle?.trim() || (value ?? '').toLowerCase().includes(needle.trim().toLowerCase());
    return rows
      .filter((pkg) =>
        (currentRole === 'OPERATOR' || !filters.site?.trim() || pkg.site === filters.site.trim())
        && keyword(pkg.customerOrderNo, filters.customerOrderNo)
        && keyword(pkg.domesticTrackingNo, filters.domesticTrackingNo)
        && keyword(pkg.combinedOrderNo, filters.combinedOrderNo)
      )
      .map((pkg) => (currentRole === 'OPERATOR' ? { ...pkg, site: undefined } : pkg));
  }
  function calculateTodayTotals(rows: WarehouseInboundPackage[], waitingDispatchTickets: number): WarehouseTodayTotals {
    const grouped = new Map<string, WarehouseInboundPackage[]>();
    rows.forEach((row) => {
      grouped.set(row.combinedOrderNo, [...(grouped.get(row.combinedOrderNo) ?? []), row]);
    });
    return {
      receiptTickets: grouped.size,
      totalPackages: rows.reduce((sum, row) => sum + row.packageCount, 0),
      totalWeightKg: Number(rows.reduce((sum, row) => sum + row.weightKg * row.packageCount, 0).toFixed(2)),
      totalCbm: Number(rows.reduce((sum, row) => sum + row.cbm, 0).toFixed(3)),
      waitingDispatchTickets,
      pendingTallyTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.status === 'RECEIVED')).length,
      exceptionTickets: Array.from(grouped.values()).filter((items) => items.some((item) => item.manualException || item.exceptions.length)).length
    };
  }
  function allPackageExceptions(pkg: WarehouseInboundPackage) {
    return [...(pkg.exceptions ?? []), ...(pkg.manualException ? [pkg.manualException] : [])].filter(Boolean);
  }
  function isInStockPackage(pkg: WarehouseInboundPackage) {
    return pkg.status !== 'CONSOLIDATED' && pkg.status !== 'SHIPPED';
  }
  function updateTodayFilterDraft(patch: Partial<WarehouseTodayQuery>) {
    setTodayFilterDraft((current) => ({ ...current, ...patch }));
  }
  function filterInStockRows(rows: WarehouseInboundPackage[], filters: WarehouseInStockQuery, currentRole: StaffRoleKey) {
    const keyword = (value: string | undefined, needle: string | undefined) =>
      !needle?.trim() || (value ?? '').toLowerCase().includes(needle.trim().toLowerCase());
    return rows
      .filter((pkg) =>
        isInStockPackage(pkg)
        && (currentRole === 'OPERATOR' || !filters.site?.trim() || pkg.site === filters.site.trim())
        && keyword(pkg.customerOrderNo, filters.customerOrderNo)
        && keyword(pkg.domesticTrackingNo, filters.domesticTrackingNo)
        && keyword(pkg.combinedOrderNo, filters.combinedOrderNo)
        && keyword(`${pkg.remark ?? ''} ${pkg.manualException ?? ''} ${(pkg.exceptions ?? []).join(' ')}`, filters.operationKeyword)
      )
      .map((pkg) => (currentRole === 'OPERATOR' ? { ...pkg, site: undefined } : pkg));
  }
  function updateInStockFilterDraft(patch: Partial<WarehouseInStockQuery>) {
    setInStockFilterDraft((current) => ({ ...current, ...patch }));
  }
  function toggleTodayPackage(packageId: string, checked: boolean) {
    setSelectedTodayPackageIds((current) =>
      checked ? Array.from(new Set([...current, packageId])) : current.filter((id) => id !== packageId)
    );
  }
  function renderWarehouseSelectAllHeader(
    rowIds: string[],
    selectedIds: string[],
    updateSelectedIds: (updater: (current: string[]) => string[]) => void,
    label: string
  ) {
    const selectableIds = Array.from(new Set(rowIds));
    const selectedCount = selectableIds.filter((id) => selectedIds.includes(id)).length;
    return (
      <Checkbox
        aria-label={label}
        checked={selectableIds.length > 0 && selectedCount === selectableIds.length}
        indeterminate={selectedCount > 0 && selectedCount < selectableIds.length}
        disabled={!selectableIds.length}
        onChange={(event) => {
          const checked = event.target.checked;
          const selectableIdSet = new Set(selectableIds);
          updateSelectedIds((current) => checked
            ? Array.from(new Set([...current.filter((id) => !selectableIdSet.has(id)), ...selectableIds]))
            : current.filter((id) => !selectableIdSet.has(id))
          );
        }}
      />
    );
  }
  const todaySiteOptions = Array.from(new Set(warehousePackages.map((pkg) => pkg.site).filter((site): site is string => Boolean(site)))).sort();
  const selectedConsolidation = consolidations.find((record) => record.id === selectedConsolidationId);
  const selectedConsolidationPackages = selectedConsolidation
    ? warehousePackages.filter((pkg) => selectedConsolidation.packageIds.includes(pkg.id))
    : [];
  const pendingTallyTasks = useMemo(
    () => sortPendingTallyTasksByRequestTime(tallyTasks.filter((task) => task.status === 'PENDING')),
    [tallyTasks]
  );
  const editingTallyPackageOptions = useMemo(() => {
    if (!editingTallyTask) return [];
    const blockedPackageIds = new Set(
      pendingTallyTasks
        .filter((task) => task.id !== editingTallyTask.id)
        .flatMap((task) => task.packageIds)
    );
    const candidateById = new Map(
      [...warehousePackages, ...inStockRows, ...todayReceiptRows].map((pkg) => [pkg.id, pkg])
    );
    return [...candidateById.values()]
      .filter((pkg) =>
        pkg.status === 'RECEIVED'
        && pkg.customerCode === editingTallyTask.customerCode
        && pkg.measurementStatus !== 'PENDING_REMEASURE'
        && !blockedPackageIds.has(pkg.id)
      )
      .sort((left, right) => (left.inboundAt ?? left.createdAt ?? '').localeCompare(right.inboundAt ?? right.createdAt ?? ''));
  }, [editingTallyTask, inStockRows, pendingTallyTasks, todayReceiptRows, warehousePackages]);
  const completedTallyTasks = tallyTasks.filter((task) => task.status === 'COMPLETED' && isRecentWarehouseTallyTask(task));
  const completedTallyTaskByKey = useMemo(() => {
    const taskByKey = new Map<string, WarehouseTallyTaskSummary>();
    tallyTasks
      .filter((task) => task.status === 'COMPLETED')
      .forEach((task) => {
        taskByKey.set(task.id, task);
        taskByKey.set(task.taskNo, task);
      });
    return taskByKey;
  }, [tallyTasks]);
  const recentCompletedTallyArchiveRows = completedTallyArchiveRows.filter(isRecentWarehouseTallyArchive);
  const availableConsolidationPackages = warehousePackages.filter((pkg) => isInStockPackage(pkg) && pkg.status === 'RECEIVED');
  const filteredConsolidationPackages = availableConsolidationPackages.filter((pkg) =>
    includesFilter(pkg.customerCode || pkg.customerOrderNo, consolidationPackageFilters.customerCode)
    && includesFilter(pkg.systemOrderNo, consolidationPackageFilters.systemOrderNo)
    && includesFilter(pkg.domesticTrackingNo, consolidationPackageFilters.domesticTrackingNo)
    && (consolidationPackageFilters.tallyStatus === 'ALL' || pkg.status === consolidationPackageFilters.tallyStatus)
  );
  const todayReceiptCurrentPageIds = currentPageIds(todayReceiptRows, todayReceiptPagination.current, todayReceiptPagination.pageSize);
  const tallyPackageCurrentPageIds = currentPageIds(filteredConsolidationPackages, tallyPackagePagination.current, tallyPackagePagination.pageSize);
  const filteredConsolidationPackageIdsKey = filteredConsolidationPackages.map((row) => row.id).join('\u0000');
  useEffect(() => {
    const visibleIds = new Set(todayReceiptRows.map((row) => row.id));
    setSelectedTodayPackageIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [todayReceiptRows]);
  useEffect(() => {
    const visibleIds = new Set(inStockRows.map((row) => row.id));
    setSelectedInStockPackageIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [inStockRows]);
  useEffect(() => {
    const visibleIds = new Set(filteredConsolidationPackages.map((row) => row.id));
    setSelectedPackageIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredConsolidationPackageIdsKey]);
  const selectedWarehousePackages = warehousePackages.filter(
    (pkg) => selectedPackageIds.includes(pkg.id) && isInStockPackage(pkg)
  );
  const selectedWarehouseCustomerCodes = Array.from(new Set(selectedWarehousePackages.map((pkg) => pkg.customerOrderNo).filter(Boolean)));
  const selectedWarehousePackageNoPreview = selectedWarehousePackages.length
    ? `${selectedWarehousePackages[0].customerOrderNo || 'WH'}-MERGE-001`
    : '选择包裹后生成';
  const selectedWarehouseTotals = selectedWarehousePackages.reduce(
    (total, pkg) => ({
      packages: total.packages + pkg.packageCount,
      actualWeightKg: total.actualWeightKg + pkg.weightKg,
      volumetricWeightKg: total.volumetricWeightKg + pkg.volumetricWeightKg,
      chargeableWeightKg: total.chargeableWeightKg + pkg.chargeableWeightKg
    }),
    { packages: 0, actualWeightKg: 0, volumetricWeightKg: 0, chargeableWeightKg: 0 }
  );
  const warehouseOutboundQueue = consolidations.filter((record) => record.mode === 'MERGE_AND_SHIP');
  const warehouseShipmentQueue = shipments.filter(
    (shipment) => shipment.status === 'WAITING_DISPATCH' && !dispatchingWarehouseShipmentIds.includes(shipment.id)
  );
  const warehouseLabelQueueRows: WarehouseLabelQueueRow[] = [
    ...warehouseShipmentQueue.map((shipment) => ({ id: `shipment-${shipment.id}`, kind: 'shipment' as const, shipment })),
    ...warehouseOutboundQueue.map((record) => ({ id: `consolidation-${record.id}`, kind: 'consolidation' as const, consolidation: record }))
  ];
  const warehouseLabelQueueRowIdsKey = warehouseLabelQueueRows.map((row) => row.id).join('\u0000');
  useEffect(() => {
    const visibleIds = new Set(warehouseLabelQueueRows.map((row) => row.id));
    setSelectedWarehouseQueueRowIds((current) => {
      const next = current.filter((id) => visibleIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [warehouseLabelQueueRowIdsKey]);
  const warehouseQueueRowSelection = useMemo(() => {
    if (!canDispatchSelect) return undefined;
    const visibleRowIds = new Set(warehouseLabelQueueRows.map((row) => row.id));
    return {
      selectedRowKeys: selectedWarehouseQueueRowIds,
      onChange: (keys: Key[]) => setSelectedWarehouseQueueRowIds(keys.map(String).filter((key) => visibleRowIds.has(key))),
      fixed: true,
      getCheckboxProps: (record: WarehouseLabelQueueRow) => ({
        disabled: false,
        'aria-label': `选择待出库订单 ${getWarehouseQueueOutboundNo(record)}`
      })
    };
  }, [canDispatchSelect, selectedWarehouseQueueRowIds, warehouseLabelQueueRowIdsKey]);
  const selectedWarehouseQueueRows = warehouseLabelQueueRows.filter((row) => selectedWarehouseQueueRowIds.includes(row.id));
  const selectedWarehouseQueueTicketCount = selectedWarehouseQueueRows.length;
  const selectedWarehouseQueueHandoverRows = selectedWarehouseQueueRows.map(createWarehouseHandoverRowFromQueue);
  const selectedWarehouseQueueHandoverGroups = groupWarehouseHandoverRowsByAgent(selectedWarehouseQueueHandoverRows);
  const selectedWarehouseQueueRequiresShippingMark = selectedWarehouseQueueRows.some((row) => row.kind === 'shipment' && row.shipment.shippingMarkRequired);
  const selectedWarehouseQueuePackageCount = selectedWarehouseQueueRows.reduce((sum, row) => sum + getWarehouseQueuePackageCount(row), 0);
  // 看板与待出库队列共用同一行集，避免示例数与实际作业数据分叉。
  const dashboardStats = [
    { label: '待出库', value: warehouseLabelQueueRows.length, helper: '渠道确认后等待仓库处理' },
    { label: '待理货', value: inStockTotals.pendingTallyTickets, helper: '分批到仓待合并' },
    { label: '收货异常', value: inStockTotals.exceptionTickets, helper: '件重尺或资料待复核' }
  ];
  const warehouseOutboundedRows: WarehouseHandoverRow[] = shipments
    .filter((shipment) => Boolean(shipment.outboundAt || shipment.dispatchedAt))
    .map(createWarehouseOutboundedRowFromShipment)
    .sort((a, b) => new Date(b.outboundAt ?? 0).getTime() - new Date(a.outboundAt ?? 0).getTime());
  const packageEditMetrics = packageEditDraft ? calculateWarehousePackageMetrics({
    weightKg: packageEditDraft.weightKg,
    lengthCm: packageEditDraft.lengthCm,
    widthCm: packageEditDraft.widthCm,
    heightCm: packageEditDraft.heightCm,
    packageCount: packageEditDraft.packageCount,
    divisor: 5000
  }) : null;

  function getConsolidationPackages(record: WarehouseConsolidationRecord) {
    return warehousePackages.filter((pkg) => record.packageIds.includes(pkg.id));
  }

  function createWarehouseHandoverRowFromQueue(row: WarehouseLabelQueueRow): WarehouseHandoverRow {
    if (row.kind === 'shipment') {
      const channelName = row.shipment.channelName || row.shipment.carrier || '待确认';
      const agentChannelName = getWarehouseHandoverChannelName(row.shipment);
      const agentName = row.shipment.agentName?.trim() || '待确认代理';
      return Object.assign({
        id: row.id,
        agentGroupName: formatWarehouseHandoverGroup(agentName),
        handoverNo: createWarehouseHandoverNo(row.shipment.systemOrderNo),
        inboundOrderNos: row.shipment.systemOrderNo,
        outboundOrderNo: resolveShipmentOutboundOrderNo(row.shipment),
        waybillNo: row.shipment.systemOrderNo,
        warehouseEntryNo: formatWarehouseHandoverEntryNo(row.shipment),
        cargoName: formatWarehouseHandoverCargoName(row.shipment),
        customerName: row.shipment.customerName,
        customerOrderNo: row.shipment.customerOrderNo,
        destinationCountry: row.shipment.destinationCountry,
        packageCount: Math.max(row.shipment.packageCount, 1),
        inboundTimes: formatBeijingDateTime(row.shipment.createdAt),
        chargeableWeightKg: row.shipment.receivableWeightKg,
        channelName,
        agentName,
        customsRefundText: row.shipment.declarationRequired ? '是' : '否',
        status: '待仓库出货'
      }, { agentChannelName });
    }
    const packages = getConsolidationPackages(row.consolidation);
    const channelName = packages[0]?.receivingChannel || '待确认';
    const agentName = '待确认代理';
    return Object.assign({
      id: row.id,
      agentGroupName: formatWarehouseHandoverGroup(undefined),
      handoverNo: createWarehouseHandoverNo(row.consolidation.outboundOrderNo),
      inboundOrderNos: formatWarehouseHandoverInboundNos(packages),
      outboundOrderNo: row.consolidation.outboundOrderNo,
      waybillNo: row.consolidation.outboundOrderNo,
      warehouseEntryNo: '-',
      cargoName: formatWarehouseHandoverCargoName(undefined, packages),
      customerName: packages[0]?.systemOrderNo ?? '理货包裹',
      customerOrderNo: Array.from(new Set(packages.map((pkg) => pkg.customerOrderNo))).join('、') || '-',
      destinationCountry: getConsolidationDestination(row.consolidation),
      packageCount: row.consolidation.totalPackages,
      inboundTimes: formatWarehouseHandoverInboundTimes(packages),
      chargeableWeightKg: row.consolidation.totalChargeableWeightKg,
      channelName,
      agentName,
      customsRefundText: '-',
      status: row.consolidation.mode === 'MERGE_AND_SHIP' ? '理货待出货' : '仅理货'
    }, { agentChannelName: '-' });
  }

  function createWarehouseOutboundedRowFromShipment(shipment: Shipment): WarehouseHandoverRow {
    const channelName = shipment.channelName || shipment.carrier || '待确认';
    const agentChannelName = getWarehouseHandoverChannelName(shipment);
    const agentName = shipment.agentName?.trim() || '待确认代理';
    return Object.assign({
      id: `outbounded-${shipment.id}`,
      agentGroupName: formatWarehouseHandoverGroup(agentName),
      handoverNo: shipment.handoverNo || createWarehouseHandoverNo(shipment.systemOrderNo),
      inboundOrderNos: shipment.inboundNo || shipment.fbaInboundNo || shipment.systemOrderNo,
      outboundOrderNo: resolveShipmentOutboundOrderNo(shipment),
      waybillNo: shipment.systemOrderNo,
      warehouseEntryNo: formatWarehouseHandoverEntryNo(shipment),
      cargoName: formatWarehouseHandoverCargoName(shipment),
      customerName: shipment.customerName,
      customerOrderNo: shipment.customerOrderNo,
      destinationCountry: shipment.destinationCountry,
      packageCount: Math.max(shipment.packageCount, 1),
      inboundTimes: formatBeijingDateTime(shipment.createdAt),
      chargeableWeightKg: shipment.receivableWeightKg,
      channelName,
      agentName,
      customsRefundText: shipment.declarationRequired ? '是' : '否',
      status: shipment.status === 'OUTBOUNDED' ? '已出库' : '已出库历史',
      outboundAt: shipment.outboundAt || shipment.dispatchedAt,
      outboundBy: shipment.outboundBy || '仓库'
    }, { agentChannelName });
  }

  function formatWarehouseHandoverGroup(agentName?: string) {
    const agent = agentName?.trim() || '待确认代理';
    return agent;
  }

  function groupWarehouseHandoverRowsByAgent(rows: WarehouseHandoverRow[]) {
    const groups = new Map<string, WarehouseHandoverRow[]>();
    rows.forEach((row) => {
      const key = row.agentGroupName || formatWarehouseHandoverGroup(undefined);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    return Array.from(groups.entries()).map(([groupName, groupRows]) => ({ groupName, rows: groupRows }));
  }

  function formatWarehouseHandoverInboundNos(packages: WarehouseInboundPackage[]) {
    const values = packages.map((pkg) => pkg.labelNo || formatWarehousePackageNo(pkg));
    return Array.from(new Set(values)).join('、') || '-';
  }

  function formatWarehouseHandoverInboundTimes(packages: WarehouseInboundPackage[]) {
    const values = packages.map((pkg) => pkg.scanTime || '-').filter((value) => value !== '-');
    return Array.from(new Set(values)).join('、') || '-';
  }

  function formatWarehouseHandoverCargoName(shipment?: Shipment, packages: WarehouseInboundPackage[] = []) {
    const fromShipment = shipment?.productName?.trim() || shipment?.cargoType?.trim();
    if (fromShipment) {
      return fromShipment;
    }
    const fromPackageRemark = packages.map((pkg) => pkg.remark?.trim()).find(Boolean);
    return fromPackageRemark || '-';
  }

  function getConsolidationDestination(record: WarehouseConsolidationRecord) {
    return getConsolidationPackages(record).find((pkg) => pkg.destinationCountry.trim())?.destinationCountry ?? '待确认国家';
  }

  function formatWarehouseConsolidationMode(mode: WarehouseConsolidationRecord['mode']) {
    return mode === 'MERGE_AND_SHIP' ? '理货并出货' : '仅理货';
  }

  async function selectTallyMiscFeesForDispatch(record: Shipment): Promise<string[] | null> {
    if (!record.customerCode) return [];
    const due = await apiClient.miscFeeTallyDue(record.customerCode);
    const rows = due.rows.filter((row) => row.dueLevel !== 'OPTIONAL');
    if (!rows.length) return [];
    const selected = new Set(rows.filter((row) => row.confirmationStatus === 'CONFIRMED').map((row) => row.id));
    return new Promise((resolve) => {
      modal.confirm({
        title: due.mandatoryCount ? '存在满 60 天理货杂费，出库前必须处理' : '发现待匹配理货杂费',
        width: 620,
        okText: '匹配并继续出库',
        cancelText: '取消出库',
        content: (
          <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 12 }}>
            {rows.map((fee: MiscFeeTallyDueItem) => {
              const mandatory = fee.dueLevel === 'MANDATORY';
              const warehouseConfirmed = fee.confirmationStatus === 'CONFIRMED';
              return (
                <Checkbox
                  key={fee.id}
                  defaultChecked={warehouseConfirmed}
                  disabled={mandatory || !warehouseConfirmed}
                  onChange={(event) => event.target.checked ? selected.add(fee.id) : selected.delete(fee.id)}
                >
                  <Space size={6} wrap>
                    <Text strong>{fee.feeName}</Text>
                    <Text>{fee.businessAmount === undefined ? '待仓库补充金额' : `${fee.businessAmount.toFixed(2)} ${fee.businessCurrency}`}</Text>
                    {!warehouseConfirmed ? <Tag color="gold">待仓库确认</Tag> : null}
                    <Tag color={mandatory ? 'red' : 'orange'}>{fee.ageDays} 天{mandatory ? '·必须处理' : ''}</Tag>
                  </Space>
                </Checkbox>
              );
            })}
            <Text type="secondary">仓库确认且满 30 天的记录可匹配到本运单；满 60 天记录必须处理。</Text>
          </Space>
        ),
        onOk: () => resolve(Array.from(selected)),
        onCancel: () => resolve(null)
      });
    });
  }

  async function dispatchWarehouseShipment(record: Shipment, options: { shippingMarkConfirmed?: boolean; handoverNo?: string; batchDispatchSource?: string; miscFeeIdsToMatch?: string[] } = {}): Promise<boolean> {
    const miscFeeIdsToMatch = options.miscFeeIdsToMatch ?? await selectTallyMiscFeesForDispatch(record);
    if (miscFeeIdsToMatch === null) return false;
    await onDispatch(record, { ...options, miscFeeIdsToMatch });
    setDispatchingWarehouseShipmentIds((current) => Array.from(new Set([...current, record.id])));
    setWarehouseNotice(`已出货 ${resolveShipmentOutboundOrderNo(record)}`);
    return true;
  }

  function getWarehouseQueueOutboundNo(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? resolveShipmentOutboundOrderNo(row.shipment) : row.consolidation.outboundOrderNo;
  }

  function getWarehouseQueueDestination(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.destinationCountry : getConsolidationDestination(row.consolidation);
  }

  function getWarehouseQueuePackageCount(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? Math.max(row.shipment.packageCount, 1) : row.consolidation.totalPackages;
  }

  function getWarehouseQueueChargeableWeight(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.receivableWeightKg : row.consolidation.totalChargeableWeightKg;
  }

  function getWarehouseQueueCreatedAt(row: WarehouseLabelQueueRow) {
    if (row.kind === 'shipment') {
      return row.shipment.entryAt || row.shipment.createdAt;
    }
    const packages = getConsolidationPackages(row.consolidation);
    return packages[0]?.createdAt || packages[0]?.scanTime || new Date().toISOString();
  }

  function getWarehouseQueueSalesperson(row: WarehouseLabelQueueRow) {
    if (row.kind === 'shipment') {
      return row.shipment.salesperson || '-';
    }
    const packages = getConsolidationPackages(row.consolidation);
    return packages[0]?.salesperson || '-';
  }

  function getWarehouseQueueAgentChannel(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.routeAgentChannelName || '-' : '-';
  }

  function getWarehouseQueueCustomerCode(row: WarehouseLabelQueueRow) {
    if (row.kind === 'shipment') {
      return row.shipment.customerCode || row.shipment.customerName.split('-')[0] || '-';
    }
    const packages = getConsolidationPackages(row.consolidation);
    return packages[0]?.customerCode || packages[0]?.customerName?.split('-')[0] || '-';
  }

  function getWarehouseQueueTotalWeight(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.receivableWeightKg : row.consolidation.totalActualWeightKg;
  }

  function getWarehouseQueueVolume(row: WarehouseLabelQueueRow) {
    if (row.kind === 'shipment') {
      return row.shipment.volumeCbm ?? 0;
    }
    return getConsolidationPackages(row.consolidation).reduce((sum, pkg) => sum + (pkg.totalCbm ?? pkg.cbm), 0);
  }

  function getWarehouseQueueChannel(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.channelName || row.shipment.carrier || '-' : getConsolidationPackages(row.consolidation)[0]?.receivingChannel || '-';
  }

  function getWarehouseQueueAgent(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.agentName || '-' : '待确认代理';
  }

  function getWarehouseQueueProductName(row: WarehouseLabelQueueRow) {
    if (row.kind === 'shipment') {
      return row.shipment.productName || row.shipment.cargoType || '-';
    }
    return formatWarehouseHandoverCargoName(undefined, getConsolidationPackages(row.consolidation));
  }

  function getWarehouseQueueDeclarationRequired(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' && row.shipment.declarationRequired ? '是' : '否';
  }

  function openWarehouseDeclarationEdit(shipment: Shipment) {
    if (!canEditDispatchDeclaration || shipment.status !== 'WAITING_DISPATCH') return;
    setDeclarationEditShipment(shipment);
    setDeclarationEditValue(shipment.declarationRequired === true);
  }

  async function saveWarehouseDeclarationEdit() {
    if (!declarationEditShipment) return;
    setDeclarationEditSubmitting(true);
    try {
      const updated = await apiClient.updateWarehouseDispatchDeclaration(declarationEditShipment.id, {
        declarationRequired: declarationEditValue
      });
      onShipmentUpdated?.(updated);
      setDeclarationEditShipment(null);
      message.success(`${updated.systemOrderNo} 已更新为${updated.declarationRequired ? '报关' : '不报关'}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '报关状态修改失败');
    } finally {
      setDeclarationEditSubmitting(false);
    }
  }

  function getWarehouseQueueSensitive(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' && row.shipment.sensitive ? '是' : '否';
  }

  function renderShippingMarkTag(required?: boolean) {
    return required ? <Tag color="error">需贴唛头</Tag> : <Text type="secondary">-</Text>;
  }

  function renderWarehouseOutboundRemark(record: WarehouseLabelQueueRow) {
    const remark = record.kind === 'shipment' ? getWarehouseOutboundRemark(record.shipment) : undefined;
    return remark ? <Text strong>{remark}</Text> : <Text type="secondary">-</Text>;
  }

  const warehouseQueueColumns: ColumnsType<WarehouseLabelQueueRow> = [
    {
      key: 'createdAt',
      title: '运单创建时间',
      width: 150,
      sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => new Date(getWarehouseQueueCreatedAt(a)).getTime() - new Date(getWarehouseQueueCreatedAt(b)).getTime(),
      render: (_: unknown, record: WarehouseLabelQueueRow) => formatBeijingDateTime(getWarehouseQueueCreatedAt(record))
    },
    {
      key: 'stageDwell',
      title: '停留时间',
      width: 105,
      sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => (a.kind === 'shipment' ? getShipmentStageDwellSeconds(a.shipment) : -1) - (b.kind === 'shipment' ? getShipmentStageDwellSeconds(b.shipment) : -1),
      render: (_: unknown, record: WarehouseLabelQueueRow) => record.kind === 'shipment' ? getShipmentStageDwellText(record.shipment) : '-'
    },
    {
      key: 'salesperson',
      title: '业务员',
      width: 110,
      sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueueSalesperson(a).localeCompare(getWarehouseQueueSalesperson(b)),
      render: (_: unknown, record: WarehouseLabelQueueRow) => getWarehouseQueueSalesperson(record)
    },
    {
      key: 'outboundNo',
      title: '出货单号',
      width: 170,
      sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueueOutboundNo(a).localeCompare(getWarehouseQueueOutboundNo(b)),
      render: (_: unknown, record: WarehouseLabelQueueRow) => renderShipmentOrderNoLink(getWarehouseQueueOutboundNo(record), { shipment: record.kind === 'shipment' ? record.shipment : findShipmentBySystemOrderNo(record.consolidation.outboundOrderNo) })
    },
    { key: 'agent', title: agentFieldLabels.detailedCompanyName, width: 180, sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueueAgent(a).localeCompare(getWarehouseQueueAgent(b)), render: (_: unknown, record: WarehouseLabelQueueRow) => getWarehouseQueueAgent(record) },
    { key: 'agentChannel', title: agentFieldLabels.channel, width: 120, render: (_: unknown, record: WarehouseLabelQueueRow) => getWarehouseQueueAgentChannel(record) },
    { key: 'customerCode', title: '客户编号', width: 110, sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueueCustomerCode(a).localeCompare(getWarehouseQueueCustomerCode(b)), render: (_: unknown, record: WarehouseLabelQueueRow) => getWarehouseQueueCustomerCode(record) },
    { key: 'destination', title: '目的地', width: 90, sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueueDestination(a).localeCompare(getWarehouseQueueDestination(b)), render: (_: unknown, record: WarehouseLabelQueueRow) => getWarehouseQueueDestination(record) },
    { key: 'channel', title: '公司渠道', width: 120, render: (_: unknown, record: WarehouseLabelQueueRow) => getWarehouseQueueChannel(record) },
    {
      key: 'businessData',
      title: '业务数据',
      children: [
        { key: 'packageCount', title: '件数', width: 78, sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueuePackageCount(a) - getWarehouseQueuePackageCount(b), render: (_: unknown, record: WarehouseLabelQueueRow) => `${getWarehouseQueuePackageCount(record)} 件` },
        { key: 'totalWeight', title: '总量', width: 88, sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueueTotalWeight(a) - getWarehouseQueueTotalWeight(b), render: (_: unknown, record: WarehouseLabelQueueRow) => `${getWarehouseQueueTotalWeight(record).toFixed(2)} KG` },
        { key: 'volume', title: '体积 CBM', width: 88, sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueueVolume(a) - getWarehouseQueueVolume(b), render: (_: unknown, record: WarehouseLabelQueueRow) => `${getWarehouseQueueVolume(record).toFixed(3)} CBM` },
        { key: 'chargeableWeight', title: '计费重', width: 90, sorter: (a: WarehouseLabelQueueRow, b: WarehouseLabelQueueRow) => getWarehouseQueueChargeableWeight(a) - getWarehouseQueueChargeableWeight(b), render: (_: unknown, record: WarehouseLabelQueueRow) => `${getWarehouseQueueChargeableWeight(record).toFixed(2)} KG` }
      ]
    },
    { key: 'shippingMark', title: '唛头', width: 96, render: (_: unknown, record: WarehouseLabelQueueRow) => record.kind === 'shipment' ? renderShippingMarkTag(record.shipment.shippingMarkRequired) : <Text type="secondary">-</Text> },
    { key: 'warehouseOutboundRemark', title: '出库备注', width: 220, className: 'managed-table-wrap-cell', render: (_: unknown, record: WarehouseLabelQueueRow) => renderWarehouseOutboundRemark(record) },
    { key: 'productName', title: '品名', width: 130, render: (_: unknown, record: WarehouseLabelQueueRow) => getWarehouseQueueProductName(record) },
    {
      key: 'declaration',
      title: '报关',
      width: 96,
      render: (_: unknown, record: WarehouseLabelQueueRow) => {
        const value = getWarehouseQueueDeclarationRequired(record);
        if (record.kind !== 'shipment' || record.shipment.status !== 'WAITING_DISPATCH' || !canEditDispatchDeclaration) {
          return <ShipmentRiskFlag value={value} />;
        }
        return (
          <Button
            type="link"
            size="small"
            aria-label={`修改报关状态 ${record.shipment.systemOrderNo}`}
            onClick={() => openWarehouseDeclarationEdit(record.shipment)}
          >
            <ShipmentRiskFlag value={value} />
          </Button>
        );
      }
    },
    { key: 'sensitive', title: '敏感', width: 74, render: (_: unknown, record: WarehouseLabelQueueRow) => <ShipmentRiskFlag value={getWarehouseQueueSensitive(record)} /> }
  ];

  function createWarehouseHandoverHtml(
    rows: WarehouseHandoverRow[],
    handoverRemark: string,
    orientation: WarehouseHandoverPrintOrientation
  ) {
    const createdAt = formatBeijingDateTime(new Date().toISOString());
    const isPortrait = orientation === 'portrait';
    const pageWidth = isPortrait ? '190mm' : '273mm';
    const groups = groupWarehouseHandoverRowsByAgent(rows);
    const tableSections = groups.map(({ groupName, rows: groupRows }, index) => {
      const totalPackages = groupRows.reduce((sum, row) => sum + row.packageCount, 0);
      const remarkRow = handoverRemark
        ? `<tr class="handover-remark-row">
                <th>交接备注</th>
                <td colspan="6" class="handover-remark">${escapeHtml(handoverRemark)}</td>
              </tr>`
        : '';
      const tableRows = groupRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.waybillNo)}</td>
        <td>${escapeHtml(row.warehouseEntryNo)}</td>
        <td>${escapeHtml(getWarehouseHandoverTemplateChannel(row))}</td>
        <td>${escapeHtml(row.cargoName)}</td>
        <td>${row.packageCount}</td>
        <td class="${isShipmentRiskFlagActive(row.customsRefundText) ? 'shipment-risk-flag-active' : ''}">${escapeHtml(row.customsRefundText)}</td>
        <td>${escapeHtml(row.destinationCountry)}</td>
      </tr>
    `).join('');
      return `
        <section class="agent-handover ${index > 0 ? 'page-break' : ''}">
          <table class="agent-handover-table">
            <thead>
              <tr>
                <th class="company-title" colspan="7">深圳思远国际货运代理有限公司</th>
              </tr>
              <tr>
                <th class="field-label">代理</th>
                <td class="field-value" colspan="2">${escapeHtml(groupName)}</td>
                <th class="field-label">出货时间</th>
                <td class="field-value" colspan="3">${escapeHtml(createdAt)}</td>
              </tr>
              <tr>
                <th>出货单号</th>
                <th>入仓号</th>
                <th>渠道</th>
                <th>品名</th>
                <th>件数</th>
                <th>是否<br />报关退税</th>
                <th>目的地</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              ${remarkRow}
              <tr>
                <th class="summary-label">票数</th>
                <td class="summary-value" colspan="2">${groupRows.length}</td>
                <th class="summary-label">件数</th>
                <td class="summary-value" colspan="3">${totalPackages}</td>
              </tr>
              <tr>
                <td class="receiver-sign" colspan="7">收件人：</td>
              </tr>
            </tbody>
          </table>
        </section>
      `;
    }).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>思远物流代理交接单</title>
  <style>
    @page { size: A4 ${orientation}; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { width: ${pageWidth}; margin: 0; }
    body { font-family: "Microsoft YaHei", "SimHei", Arial, sans-serif; color: #000; }
    .page-break { break-before: page; page-break-before: always; }
    .agent-handover { width: ${pageWidth}; break-inside: avoid-page; page-break-inside: avoid; }
    .agent-handover-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: .35mm solid #111; padding: 1mm 1.2mm; text-align: center; vertical-align: middle; overflow-wrap: anywhere; }
    .company-title { height: 10mm; font-size: 5.5mm; line-height: 1.1; font-weight: 800; }
    .field-label { height: 12mm; font-size: 3.8mm; font-weight: 800; }
    .field-value { font-size: 3.2mm; font-weight: 700; }
    thead tr:nth-child(3) th { height: 11mm; font-size: 3.2mm; line-height: 1.15; font-weight: 800; }
    tbody td { height: 10mm; font-size: 2.8mm; }
    .handover-remark-row th, .handover-remark-row td { min-height: 10mm; font-size: 3mm; }
    .handover-remark { text-align: left; white-space: pre-wrap; }
    .summary-label { height: 11mm; font-size: 3.8mm; font-weight: 800; }
    .summary-value { font-size: 4.2mm; font-weight: 800; }
    .receiver-sign { height: 10mm; text-align: left; padding-left: 48%; font-size: 3.2mm; font-weight: 800; }
    .shipment-risk-flag-active { color: #c9351d; font-weight: 800; }
    ${isPortrait ? `
    .company-title { font-size: 4.6mm; }
    .field-label { font-size: 3.1mm; }
    .field-value { font-size: 2.7mm; }
    thead tr:nth-child(3) th { font-size: 2.6mm; }
    tbody td { font-size: 2.4mm; }
    .handover-remark-row th, .handover-remark-row td { font-size: 2.6mm; }
    .summary-label { font-size: 3.1mm; }
    .summary-value { font-size: 3.6mm; }
    .receiver-sign { font-size: 2.8mm; }
    ` : ''}
  </style>
</head>
<body>
  ${tableSections}
</body>
</html>`;
  }

  function openBatchWarehouseHandover() {
    if (!selectedWarehouseQueueTicketCount) {
      setWarehouseNotice('请先勾选待出库订单');
      return;
    }
    setBatchShippingMarkConfirmed(false);
    setBatchHandoverRemark('');
    setBatchHandoverPrintOrientation('landscape');
    setBatchHandoverOpen(true);
  }

  async function printSelectedWarehouseHandover() {
    if (!selectedWarehouseQueueHandoverRows.length) {
      setWarehouseNotice('当前暂无可打印的代理交接单');
      return;
    }
    const shipmentRows = selectedWarehouseQueueRows.filter((row): row is Extract<WarehouseLabelQueueRow, { kind: 'shipment' }> => row.kind === 'shipment');
    if (shipmentRows.length !== selectedWarehouseQueueRows.length) {
      setWarehouseNotice('理货合并记录不支持代理交接单，请仅选择待出库运单');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setWarehouseNotice('浏览器阻止了打印窗口，请允许弹窗后重试');
      return;
    }
    const handoverRows = [...selectedWarehouseQueueHandoverRows];
    printWindow.document.write(createWarehouseHandoverHtml(
      handoverRows,
      batchHandoverRemark.trim(),
      batchHandoverPrintOrientation
    ));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    try {
      await apiClient.printWarehouseHandover({ shipmentIds: shipmentRows.map((row) => row.shipment.id) });
      setBatchHandoverOpen(false);
      setWarehouseNotice(`已打印 ${shipmentRows.length} 个待出库订单的代理交接单，可继续确认出货`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '批量出货失败');
    } finally { setBatchDispatching(false); }
  }

  async function dispatchPrintedWarehouseShipments() {
    const shipmentRows = selectedWarehouseQueueRows.filter((row): row is Extract<WarehouseLabelQueueRow, { kind: 'shipment' }> => row.kind === 'shipment');
    if (!shipmentRows.length || shipmentRows.length !== selectedWarehouseQueueRows.length) {
      setWarehouseNotice('请仅选择已打印交接单的待出库运单');
      return;
    }
    if (selectedWarehouseQueueRequiresShippingMark && (!canShippingMarkConfirm || !batchShippingMarkConfirmed)) {
      setWarehouseNotice(canShippingMarkConfirm ? '所选订单包含需贴唛头，请确认已贴唛头后再出货' : '当前角色没有确认贴唛头权限');
      return;
    }
    setBatchDispatching(true);
    try {
      for (const row of shipmentRows) {
        const dispatched = await dispatchWarehouseShipment(row.shipment, {
          shippingMarkConfirmed: row.shipment.shippingMarkRequired ? true : undefined,
          batchDispatchSource: 'warehouse.handover_dispatch'
        });
        if (!dispatched) throw new Error('已取消批量出货');
      }
      setSelectedWarehouseQueueRowIds([]);
      setWarehouseNotice(`已出货 ${shipmentRows.length} 个待出库订单`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '出货失败');
    } finally { setBatchDispatching(false); }
  }

  const receiveSubItems: ModuleSubNavItem[] = [
    { key: 'dashboard', label: '仓库看板', description: '仓库作业总览' },
    { key: 'today', label: '今日收货', description: '扫描与收货入库' },
    { key: 'packages', label: '在仓数据', description: '件重尺采集' },
    { key: 'consolidation', label: '未完成理货', description: '合并 / 拆分 / 出货准备' },
    { key: 'completed-consolidation', label: '已完成理货', description: '近 1 个月' },
    { key: 'pending-routing', label: '待排货', description: '待市场排货' },
    { key: 'queue', label: '待出库', description: '打单与出货确认' },
    { key: 'outbounded', label: '已出库', description: '仓库出库历史' },
    { key: 'rent-details', label: '仓租细分表', description: '逐票仓租计算与规则' }
  ].filter((item) => ({
    dashboard: canTodayReceiptView || canInStockView || canTallyPendingView || canTallyCompletedView || canDispatchView || canOutboundedView || canRentDetailView,
    today: canTodayReceiptView,
    packages: canInStockView,
    consolidation: canTallyPendingView,
    'completed-consolidation': canTallyCompletedView,
    'pending-routing': false,
    queue: canDispatchView,
    outbounded: canOutboundedView,
    'rent-details': canRentDetailView
  })[item.key]);

  useEffect(() => {
    if (!receiveSubItems.some((item) => item.key === activeReceiveSection)) {
      setActiveReceiveSection(receiveSubItems[0]?.key ?? 'dashboard');
    }
  }, [activeReceiveSection, receiveSubItems]);
  function formatWarehouseInboundProgress(pkg: WarehouseInboundPackage) {
    if (!pkg.expectedTotalPackageCount) {
      return '-';
    }
    const arrived = warehousePackages.filter((item) => item.customerOrderNo === pkg.customerOrderNo).length;
    return `已到 ${arrived}/${pkg.expectedTotalPackageCount}`;
  }

  function createWarehousePackageEditDraft(record: WarehouseInboundPackage): WarehousePackageEditDraft {
    return {
      customerCode: record.customerCode || record.customerOrderNo,
      combinedOrderNo: record.combinedOrderNo,
      domesticTrackingNo: record.domesticTrackingNo,
      expectedTotalPackageCount: record.expectedTotalPackageCount ?? record.packageCount,
      packageIndex: record.packageIndex ?? 1,
      scanTime: formatWarehouseDateTimeInputValue(record.scanTime || record.inboundAt || record.createdAt),
      weightKg: record.weightKg,
      lengthCm: record.lengthCm,
      widthCm: record.widthCm,
      heightCm: record.heightCm,
      packageCount: record.packageCount,
      remark: record.remark ?? '',
      manualException: record.manualException ?? ''
    };
  }

  function openWarehousePackageEdit(record: WarehouseInboundPackage) {
    if (!canEditUnenteredWarehousePackage(record)) {
      setWarehouseNotice('已合票、已出库、已归档或已绑定运单的包裹不能直接修改');
      return;
    }
    setEditingPackage(record);
    const pendingRequest = readWarehouseSameSpecPendingRequest(record.id);
    setPackageEditDraft(pendingRequest?.draft ?? createWarehousePackageEditDraft(record));
    setSameSpecSupplementCount(pendingRequest?.supplementCount ?? 0);
    setSameSpecRequestId(pendingRequest?.requestId ?? (globalThis.crypto?.randomUUID?.() ?? `same-spec-${Date.now()}`));
    setSameSpecRequestAttempted(Boolean(pendingRequest));
  }

  function closeWarehousePackageEdit(options?: { completed?: boolean }) {
    if (editingPackage && options?.completed) {
      clearWarehouseSameSpecPendingRequest(editingPackage.id);
    }
    setEditingPackage(null);
    setPackageEditDraft(null);
    setSameSpecSupplementCount(0);
    setSameSpecRequestId('');
    setSameSpecRequestAttempted(false);
  }

  function updateSameSpecSupplementCount(value: number) {
    if (sameSpecRequestAttempted) return;
    setSameSpecSupplementCount(value);
  }

  function patchPackageEditDraft(patch: Partial<WarehousePackageEditDraft>) {
    setPackageEditDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function patchPackageEditCustomerCode(customerCode: string) {
    if (!packageEditDraft) return;
    const currentAuto = packageEditDraft.customerCode && packageEditDraft.domesticTrackingNo ? `${packageEditDraft.customerCode}-${packageEditDraft.domesticTrackingNo}` : '';
    const nextAuto = customerCode && packageEditDraft.domesticTrackingNo ? `${customerCode}-${packageEditDraft.domesticTrackingNo}` : '';
    patchPackageEditDraft({
      customerCode,
      combinedOrderNo: !packageEditDraft.combinedOrderNo || packageEditDraft.combinedOrderNo === currentAuto ? nextAuto : packageEditDraft.combinedOrderNo
    });
  }

  function patchPackageEditTrackingNo(domesticTrackingNo: string) {
    if (!packageEditDraft) return;
    const currentAuto = packageEditDraft.customerCode && packageEditDraft.domesticTrackingNo ? `${packageEditDraft.customerCode}-${packageEditDraft.domesticTrackingNo}` : '';
    const nextAuto = packageEditDraft.customerCode && domesticTrackingNo ? `${packageEditDraft.customerCode}-${domesticTrackingNo}` : '';
    patchPackageEditDraft({
      domesticTrackingNo,
      combinedOrderNo: !packageEditDraft.combinedOrderNo || packageEditDraft.combinedOrderNo === currentAuto ? nextAuto : packageEditDraft.combinedOrderNo
    });
  }

  function patchPackageEditCombinedOrderNo(combinedOrderNo: string) {
    const parsed = parseWarehousePackageCode(combinedOrderNo);
    patchPackageEditDraft({
      combinedOrderNo,
      ...(parsed.customerOrderNo ? { customerCode: parsed.customerOrderNo } : {}),
      ...(parsed.domesticTrackingNo ? { domesticTrackingNo: parsed.domesticTrackingNo } : {})
    });
  }

  function applyUpdatedWarehousePackage(updated: WarehousePackageSummary) {
    const mapped = mapWarehouseApiPackageToInbound(updated);
    setWarehousePackages((current) =>
      withWarehouseCustomerProgress(current.map((pkg) => (pkg.id === mapped.id ? mapped : pkg)))
    );
    setTodayReceiptRows((current) => {
      const next = current.map((pkg) => (pkg.id === mapped.id ? mapped : pkg));
      setTodayTotals((totals) => calculateTodayTotals(next, totals.waitingDispatchTickets));
      return next;
    });
    setInStockRows((current) => {
      const next = current.map((pkg) => (pkg.id === mapped.id ? mapped : pkg));
      setInStockTotals((totals) => calculateTodayTotals(next, totals.waitingDispatchTickets));
      return next;
    });
    setCompletedTallyArchiveRows((current) => current.map((pkg) => (pkg.id === mapped.id ? mapped : pkg)));
  }

  async function saveWarehousePackageEdit() {
    if (!editingPackage || !packageEditDraft) return;
    const supplementCount = Number(sameSpecSupplementCount);
    const pendingSourceChanged = sameSpecRequestAttempted
      && hasWarehousePackageEditChanges(editingPackage, packageEditDraft);
    const baseFieldsChanged = !sameSpecRequestAttempted
      && hasWarehousePackageEditChanges(editingPackage, packageEditDraft);
    const identityFieldsChanged = packageEditDraft.customerCode.trim() !== (editingPackage.customerCode || editingPackage.customerOrderNo).trim()
      || packageEditDraft.domesticTrackingNo.trim() !== editingPackage.domesticTrackingNo.trim()
      || packageEditDraft.combinedOrderNo.trim() !== editingPackage.combinedOrderNo.trim();
    const customerCode = packageEditDraft.customerCode.trim();
    const combinedParts = parseWarehousePackageCode(packageEditDraft.combinedOrderNo.trim());
    const customerOrderNo = combinedParts.customerOrderNo || customerCode;
    const domesticTrackingNo = combinedParts.domesticTrackingNo || packageEditDraft.domesticTrackingNo.trim();
    if (!customerCode) {
      setWarehouseNotice('请填写客户编号');
      return;
    }
    if (!domesticTrackingNo) {
      setWarehouseNotice('请填写快递单号');
      return;
    }
    if (pendingSourceChanged) {
      setWarehouseNotice('当前包裹已与待确认补录快照不一致，已停止自动重试，请联系管理员核对');
      return;
    }
    if (!Number.isInteger(supplementCount) || supplementCount < 0 || supplementCount > 500) {
      setWarehouseNotice('同箱规补录数量必须为 0 至 500 的整数');
      return;
    }
    if (supplementCount > 0 && !canReplenishWarehouseSameSpec(editingPackage)) {
      setWarehouseNotice('仅已过机、重尺有效、未录单且未理货的原始记录可以同箱规补录');
      return;
    }
    if (supplementCount > 0 && packageEditDraft.packageCount !== 1) {
      setWarehouseNotice('同箱规补录的来源记录件数必须为 1');
      return;
    }
    if (supplementCount > 0 && (
      packageEditDraft.weightKg <= 0
      || packageEditDraft.lengthCm <= 0
      || packageEditDraft.widthCm <= 0
      || packageEditDraft.heightCm <= 0
    )) {
      setWarehouseNotice('同箱规补录要求单件实重和长宽高均大于 0');
      return;
    }
    if (supplementCount > 0 && !sameSpecRequestId) {
      setWarehouseNotice('补录请求已失效，请关闭后重新打开');
      return;
    }
    if (baseFieldsChanged && !canInStockUpdate) {
      setWarehouseNotice('当前角色只能同箱规补录，不能修改包裹基础数据');
      return;
    }
    const input: WarehousePackageUpdateInput = {
      customerCode,
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
      packageIndex: packageEditDraft.packageIndex,
      packageCount: packageEditDraft.packageCount,
      weightKg: packageEditDraft.weightKg,
      lengthCm: packageEditDraft.lengthCm,
      widthCm: packageEditDraft.widthCm,
      heightCm: packageEditDraft.heightCm,
      scanTime: packageEditDraft.scanTime ? parseBeijingDateTimeInputToIso(packageEditDraft.scanTime) : undefined,
      remark: packageEditDraft.remark.trim() || undefined,
      manualException: packageEditDraft.manualException.trim() || undefined
    };
    setSavingPackageEdit(true);
    let updatedPackage: WarehousePackageSummary | null = null;
    let baseUpdateCompleted = false;
    try {
      if (baseFieldsChanged) {
        updatedPackage = await apiClient.updateWarehousePackage(editingPackage.id, input);
        baseUpdateCompleted = true;
        applyUpdatedWarehousePackage(updatedPackage);
        setEditingPackage(mapWarehouseApiPackageToInbound(updatedPackage));
      }
      if (supplementCount > 0) {
        const pendingRequest = {
          requestId: sameSpecRequestId,
          supplementCount,
          draft: packageEditDraft
        };
        if (!writeWarehouseSameSpecPendingRequest(editingPackage.id, pendingRequest)) {
          setWarehouseNotice('浏览器无法保存补录请求，为避免重复补录已取消提交');
          return;
        }
        setSameSpecRequestAttempted(true);
        const result = await apiClient.replenishWarehouseSameSpec(editingPackage.id, {
          supplementCount,
          requestId: sameSpecRequestId
        });
        const packages = result.packages.map(mapWarehouseApiPackageToInbound);
        const applyReplenishment = (rows: WarehouseInboundPackage[]) => [
          ...packages,
          ...rows.filter((pkg) => !packages.some((created) => created.id === pkg.id))
        ];
        setWarehousePackages((current) => withWarehouseCustomerProgress(applyReplenishment(current)));
        setInStockRows((current) => {
          const next = applyReplenishment(current);
          setInStockTotals((totals) => calculateTodayTotals(next, totals.waitingDispatchTickets));
          return next;
        });
        const combinedOrderNo = updatedPackage?.combinedOrderNo ?? editingPackage.combinedOrderNo;
        setWarehouseNotice(baseUpdateCompleted
          ? `包裹 ${combinedOrderNo} 已保存，并新增 ${packages.length} 条同箱规单件记录`
          : `已新增 ${packages.length} 条同箱规单件记录，原记录保持不变`);
      } else if (updatedPackage) {
        setWarehouseNotice(`包裹 ${updatedPackage.combinedOrderNo} 已保存`);
      } else {
        setWarehouseNotice('没有需要保存的修改');
      }
      if (identityFieldsChanged || supplementCount > 0) {
        setInStockRefreshVersion((current) => current + 1);
      }
      closeWarehousePackageEdit({ completed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      setWarehouseNotice(baseUpdateCompleted
        ? `包裹基础数据已保存，但同箱规补录失败：${message}`
        : supplementCount > 0
          ? `同箱规补录失败：${message}；请在当前弹窗直接重试`
          : `包裹修改失败：${message}`);
    } finally {
      setSavingPackageEdit(false);
    }
  }

  async function updateWarehousePackageRemark(packageId: string, remark: string) {
    setWarehousePackages((current) => current.map((pkg) => (pkg.id === packageId ? { ...pkg, remark } : pkg)));
    setTodayReceiptRows((current) => current.map((pkg) => (pkg.id === packageId ? { ...pkg, remark } : pkg)));
    try {
      const updated = await apiClient.updateWarehousePackageRemark(packageId, { remark });
      setWarehousePackages((current) =>
        withWarehouseCustomerProgress(current.map((pkg) => (pkg.id === packageId ? mapWarehouseApiPackageToInbound(updated) : pkg)))
      );
      setTodayReceiptRows((current) => current.map((pkg) => (pkg.id === packageId ? mapWarehouseApiPackageToInbound(updated) : pkg)));
      setWarehouseNotice('包裹备注已保存');
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '包裹备注保存失败');
    }
  }

  async function addTodayManualException() {
    if (!selectedTodayPackageIds.length) {
      setWarehouseNotice('请先勾选需要标记异常的包裹');
      return;
    }
    const manualException = exceptionDraft.trim();
    try {
      const updatedRows = await Promise.all(
        selectedTodayPackageIds.map((id) => apiClient.updateWarehousePackageException(id, { manualException }))
      );
      const mappedRows = updatedRows.map(mapWarehouseApiPackageToInbound);
      setWarehousePackages((current) =>
        withWarehouseCustomerProgress(current.map((pkg) => mappedRows.find((row) => row.id === pkg.id) ?? pkg))
      );
      setTodayReceiptRows((current) => current.map((pkg) => mappedRows.find((row) => row.id === pkg.id) ?? pkg));
      setExceptionModalOpen(false);
      setExceptionDraft('');
      setSelectedTodayPackageIds([]);
      setWarehouseNotice(manualException ? `已为 ${updatedRows.length} 个包裹添加异常` : `已清空 ${updatedRows.length} 个包裹的人工异常`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '添加异常失败');
    }
  }

  function patchTodayManualCustomerCode(customerCode: string) {
    const currentAuto = packageDraft.customerCode && packageDraft.domesticTrackingNo ? `${packageDraft.customerCode}-${packageDraft.domesticTrackingNo}` : '';
    const nextAuto = customerCode && packageDraft.domesticTrackingNo ? `${customerCode}-${packageDraft.domesticTrackingNo}` : '';
    patchPackageDraft({
      customerCode,
      combinedOrderNo: !packageDraft.combinedOrderNo || packageDraft.combinedOrderNo === currentAuto ? nextAuto : packageDraft.combinedOrderNo
    });
  }

  function patchTodayManualTrackingNo(domesticTrackingNo: string) {
    const currentAuto = packageDraft.customerCode && packageDraft.domesticTrackingNo ? `${packageDraft.customerCode}-${packageDraft.domesticTrackingNo}` : '';
    const nextAuto = packageDraft.customerCode && domesticTrackingNo ? `${packageDraft.customerCode}-${domesticTrackingNo}` : '';
    patchPackageDraft({
      domesticTrackingNo,
      combinedOrderNo: !packageDraft.combinedOrderNo || packageDraft.combinedOrderNo === currentAuto ? nextAuto : packageDraft.combinedOrderNo
    });
  }

  async function addTodayManualPackage() {
    if (!packageDraft.customerCode.trim()) {
      setWarehouseNotice('请先填写客户编号');
      return;
    }
    if (!packageDraft.domesticTrackingNo.trim()) {
      setWarehouseNotice('请先填写快递单号');
      return;
    }
    const invalidSpecIndex = packageDraft.cartonSpecs.findIndex((spec) =>
      spec.weightKg <= 0
      || spec.lengthCm <= 0
      || spec.widthCm <= 0
      || spec.heightCm <= 0
      || !Number.isInteger(spec.packageCount)
      || spec.packageCount <= 0
    );
    if (invalidSpecIndex >= 0) {
      setWarehouseNotice(`第 ${invalidSpecIndex + 1} 条箱规需完整填写重量、长宽高和正整数件数`);
      return;
    }
    const combinedParts = parseWarehousePackageCode(packageDraft.combinedOrderNo.trim());
    const customerOrderNo = combinedParts.customerOrderNo || packageDraft.customerCode.trim();
    const domesticTrackingNo = combinedParts.domesticTrackingNo || packageDraft.domesticTrackingNo.trim();
    const input: WarehouseManualReceiptCreateInput = {
      customerCode: packageDraft.customerCode.trim(),
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
      cartonSpecs: packageDraft.cartonSpecs,
      scanTime: packageDraft.scanTime ? parseBeijingDateTimeInputToIso(packageDraft.scanTime) : new Date().toISOString(),
      remark: packageDraft.remark.trim() || undefined,
      manualException: packageDraft.manualException.trim() || undefined,
      scanSource: '手动添加'
    };
    try {
      const created = await apiClient.createWarehouseManualReceipt(input);
      const nextPackages = created.packages.map(mapWarehouseApiPackageToInbound);
      setWarehousePackages((current) => withWarehouseCustomerProgress([...nextPackages, ...current]));
      setTodayReceiptRows((current) => [...nextPackages, ...current]);
      setTodayTotals((current) => calculateTodayTotals([...nextPackages, ...todayReceiptRows], current.waitingDispatchTickets));
      setTodayReceiptRowsQueryKey(null);
      setWarehouseNotice(`已手动添加收货 ${created.packages[0]?.combinedOrderNo ?? input.combinedOrderNo}，箱规 ${created.totalCartonSpecs} 条 / ${created.totalPackages} 件`);
      patchPackageDraft({
        domesticTrackingNo: '',
        combinedOrderNo: '',
        scanTime: formatBeijingDateTimeInputValue(),
        weightKg: 0,
        lengthCm: 0,
        widthCm: 0,
        heightCm: 0,
        packageCount: 1,
        packageIndex: Math.min(packageDraft.totalPackageCount, packageDraft.packageIndex + 1),
        remark: '',
        manualException: '',
        cartonSpecs: [createEmptyCartonSpec()]
      });
      setTodayFilters((current) => ({ ...current }));
      setManualReceiptDrawerOpen(false);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '手动添加收货失败');
    }
  }

  const todayReceiptColumnDefinitions: Record<string, ColumnsType<WarehouseInboundPackage>[number]> = {
    select: {
      title: renderWarehouseSelectAllHeader(
        todayReceiptCurrentPageIds,
        selectedTodayPackageIds,
        setSelectedTodayPackageIds,
        '全选今日收货包裹'
      ),
      key: 'select',
      width: 56,
      fixed: 'left',
      render: (_, record) => (
        <Checkbox
          aria-label={`选择今日收货 ${formatWarehousePackageNo(record)}`}
          checked={selectedTodayPackageIds.includes(record.id)}
          onChange={(event) => toggleTodayPackage(record.id, event.target.checked)}
        />
      )
    },
    site: { title: '站点', dataIndex: 'site', width: 110, render: (value?: string) => value || '-' },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 110, sorter: (a, b) => a.customerCode.localeCompare(b.customerCode) },
    customerName: { title: '客户名称', dataIndex: 'customerName', width: 150, render: (value?: string) => value || '-' },
    customerOrderNo: { title: '客户编号', dataIndex: 'customerOrderNo', width: 120, sorter: (a, b) => a.customerOrderNo.localeCompare(b.customerOrderNo) },
    domesticTrackingNo: { title: '快递单号', dataIndex: 'domesticTrackingNo', width: 150, sorter: (a, b) => a.domesticTrackingNo.localeCompare(b.domesticTrackingNo) },
    combinedOrderNo: {
      title: '客户编号-快递单号',
      dataIndex: 'combinedOrderNo',
      width: 240,
      fixed: 'left',
      sorter: (a, b) => a.combinedOrderNo.localeCompare(b.combinedOrderNo),
      render: (value: string) => <Text strong className="warehouse-today-order-no">{value}</Text>
    },
    packageCount: { title: '件数', dataIndex: 'packageCount', width: 80, align: 'right', sorter: (a, b) => a.packageCount - b.packageCount },
    weightKg: { title: '单件实重', dataIndex: 'weightKg', width: 110, align: 'right', sorter: (a, b) => a.weightKg - b.weightKg, render: (value: number, record) => record.measurementStatus === 'PENDING_REMEASURE' ? '-' : value.toFixed(2) },
    dimensions: { title: '尺寸 cm', key: 'dimensions', width: 130, render: (_, record) => record.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${record.lengthCm}×${record.widthCm}×${record.heightCm}` },
    girth: {
      title: '围长 cm',
      key: 'girth',
      width: 100,
      align: 'right',
      sorter: (a, b) => (a.girthCm ?? calculatePackageGirth(a)) - (b.girthCm ?? calculatePackageGirth(b)),
      render: (_, record) => record.measurementStatus === 'PENDING_REMEASURE'
        ? '-'
        : (record.girthCm ?? calculatePackageGirth(record)).toFixed(0)
    },
    cbm: { title: '单件体积 CBM', dataIndex: 'cbm', width: 110, align: 'right', sorter: (a, b) => a.cbm - b.cbm, render: (value: number) => `${value.toFixed(6)} CBM` },
    vol5000: { title: '单件5000材积', key: 'vol5000', width: 130, align: 'right', render: (_, record) => (record.volumetricWeightKg5000 ?? calculateWarehouseVolumetricWeight(record, 5000)).toFixed(2) },
    vol6000: { title: '单件6000材积', key: 'vol6000', width: 130, align: 'right', render: (_, record) => calculateWarehouseVolumetricWeight(record, 6000).toFixed(2) },
    scanTime: { title: '扫描时间', dataIndex: 'scanTime', width: 160, defaultSortOrder: 'descend', sorter: (a, b) => (a.scanTime ?? '').localeCompare(b.scanTime ?? ''), render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    deviceNo: {
      title: '设备号',
      key: 'deviceNo',
      width: 150,
      render: (_, record) => splitWarehouseDeviceRemark(record.scanSource, record.remark).deviceNo || '-'
    },
    createdBy: { title: '操作人', dataIndex: 'createdBy', width: 110, render: (value?: string) => value || '-' },
    createdAt: { title: '操作时间', dataIndex: 'createdAt', width: 160, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    exceptions: {
      title: '异常',
      key: 'exceptions',
      width: 180,
      render: (_, record) => {
        const exceptions = allPackageExceptions(record);
        if (!exceptions.length) return '';
        return (
          <Tooltip title={exceptions.join('；')}>
            <Space wrap>{exceptions.map((item) => <Tag color="warning" key={item}>{item}</Tag>)}</Space>
          </Tooltip>
        );
      }
    },
    remark: {
      title: '备注',
      dataIndex: 'remark',
      width: 220,
      render: (value: string | undefined, record) => {
        const parts = splitWarehouseDeviceRemark(record.scanSource, value);
        return canTodayReceiptRemark
          && canEditUnenteredWarehousePackage(record)
          && !isWarehousePackageTallyInProgress(record)
          ? <Input
              defaultValue={parts.businessRemark}
              aria-label={`今日收货备注 ${record.combinedOrderNo}`}
              onBlur={(event) => void updateWarehousePackageRemark(
                record.id,
                composeWarehouseDeviceRemark(parts.deviceNo, event.target.value)
              )}
            />
          : (parts.businessRemark || '');
      }
    },
    ...(canRentDetailView ? {
      warehouseRent: {
        title: '仓租',
        dataIndex: 'warehouseRentAmountRmb',
        width: 104,
        align: 'right' as const,
        sorter: (a: WarehouseInboundPackage, b: WarehouseInboundPackage) =>
          (a.warehouseRentAmountRmb ?? -1) - (b.warehouseRentAmountRmb ?? -1),
        render: (value: number | undefined) => (value === undefined ? '-' : `¥${value.toFixed(2)}`)
      },
      warehouseDays: {
        title: '在仓天数',
        dataIndex: 'warehouseDays',
        width: 104,
        align: 'right' as const,
        sorter: (a: WarehouseInboundPackage, b: WarehouseInboundPackage) =>
          (a.warehouseDays ?? -1) - (b.warehouseDays ?? -1),
        render: (value: number | undefined) => (value === undefined ? '-' : `${value} 天`)
      }
    } : {}),
    actions: {
      title: '操作',
      key: 'actions',
      width: 60,
      fixed: 'right',
      align: 'center',
      className: 'warehouse-today-action-column',
      render: (_, record) => canInStockUpdate && canEditUnenteredWarehousePackage(record) ? (
        <Button size="small" onClick={() => openWarehousePackageEdit(record)}>修改</Button>
      ) : null
    }
  };
  const todayReceiptColumnKeys = Object.keys(todayReceiptColumnDefinitions)
    .filter((key) => (key !== 'site' || !isOperatorView) && (key !== 'actions' || canInStockUpdate));
  const todayReceiptColumns = todayReceiptColumnKeys
    .map((key) => todayReceiptColumnDefinitions[key])
    .filter(Boolean) as ColumnsType<WarehouseInboundPackage>;

  const todayReceiptMatrixColumns: ManagedTableColumns<WarehouseInboundPackage> = [
    ...(todayReceiptColumnKeys.includes('select') ? [{ ...todayReceiptColumnDefinitions.select, key: 'select' }] : []),
    {
      key: 'matrixInformation',
      title: '',
      width: 960,
      className: 'managed-matrix-group-primary',
      render: (_: unknown, record: WarehouseInboundPackage) => {
        const deviceNo = splitWarehouseDeviceRemark(record.scanSource, record.remark).deviceNo;
        const exceptions = allPackageExceptions(record);
        const remark = splitWarehouseDeviceRemark(record.scanSource, record.remark).businessRemark;
        return (
          <ManagedMatrixCell
            columns={5}
            labelWidth={66}
            fields={[
              { key: 'scanTime', label: '扫描时间', value: <ManagedMatrixDateTime value={record.scanTime ? formatBeijingDateTime(record.scanTime) : undefined} /> },
              !isOperatorView ? { key: 'site', label: '站点', value: record.site || '-' } : null,
              { key: 'deviceNo', label: '设备号', value: deviceNo || '-' },
              { key: 'customerCode', label: '客户编号', value: record.customerCode || '-' },
              { key: 'customerName', label: '客户名称', value: record.customerName || '-', title: record.customerName, wrap: true },
              { key: 'combinedOrderNo', label: '组合号', value: renderWarehousePackageNoWithTallyMark(record), title: record.combinedOrderNo, emphasis: true },
              { key: 'domesticTrackingNo', label: '快递单号', value: record.domesticTrackingNo || '-', title: record.domesticTrackingNo },
              { key: 'packageCount', label: '件数', value: `${record.packageCount} 件` },
              { key: 'weightKg', label: '单件实重', value: record.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${record.weightKg.toFixed(2)} KG` },
              { key: 'dimensions', label: '尺寸', value: record.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${record.lengthCm}×${record.widthCm}×${record.heightCm} cm` },
              { key: 'girth', label: '围长', value: record.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${(record.girthCm ?? calculatePackageGirth(record)).toFixed(0)} cm` },
              { key: 'cbm', label: '单件体积 CBM', value: record.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${record.cbm.toFixed(6)} CBM` },
              { key: 'vol5000', label: '5000材积', value: record.measurementStatus === 'PENDING_REMEASURE' ? '-' : (record.volumetricWeightKg5000 ?? calculateWarehouseVolumetricWeight(record, 5000)).toFixed(2) },
              { key: 'vol6000', label: '6000材积', value: record.measurementStatus === 'PENDING_REMEASURE' ? '-' : calculateWarehouseVolumetricWeight(record, 6000).toFixed(2) },
              {
                key: 'exceptions',
                label: '异常',
                value: exceptions.length ? <Space wrap size={[4, 4]}>{exceptions.map((item) => <Tag color="warning" key={item}>{item}</Tag>)}</Space> : <Text type="secondary">暂无异常</Text>,
                title: exceptions.join('；'),
                wrap: true
              },
              remark ? { key: 'remark', label: '备注', value: remark, title: remark, wrap: true } : null
            ]}
          />
        );
      }
    },
    ...(todayReceiptColumnKeys.includes('actions') ? [{ ...todayReceiptColumnDefinitions.actions, key: 'actions', title: '', width: 60, resizable: false, fixed: 'right' as const }] : [])
  ];

  function calculatePackageGirth(record: WarehouseInboundPackage) {
    const sides = [record.lengthCm, record.widthCm, record.heightCm].sort((a, b) => b - a);
    return sides[0] + 2 * (sides[1] + sides[2]);
  }
  function calculateSingleCbm(record: WarehouseInboundPackage) {
    return (record.lengthCm * record.widthCm * record.heightCm) / 1000000;
  }
  function calculateSingleVolumetricWeight(record: WarehouseInboundPackage, divisor: number) {
    return (record.lengthCm * record.widthCm * record.heightCm) / divisor;
  }
  function renderWarehousePackageNoWithTallyMark(record: WarehouseInboundPackage) {
    return (
      <Space size={6} wrap>
        <Text strong className="warehouse-today-order-no">{record.combinedOrderNo}</Text>
        {isTalliedWarehousePackage(record) && canInStockTallyRecordView ? (
          <Tooltip title="已理货，点击查看理货记录">
            <button
              aria-label={`查看理货记录 ${record.combinedOrderNo}`}
              className="warehouse-tally-mark-button"
              onClick={() => void openTallyTaskDetailForPackage(record)}
              style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}
              type="button"
            >
              <Tag color="processing" style={{ marginInlineEnd: 0 }}>理</Tag>
            </button>
          </Tooltip>
        ) : null}
        {isWarehousePackageTallyInProgress(record) ? <Tag color="orange" style={{ marginInlineEnd: 0 }}>理货中</Tag> : null}
      </Space>
    );
  }

  function renderWarehouseCustomerCode(record: WarehouseInboundPackage) {
    if (!isWarehouseCustomerUnmaintained(record)) return record.customerCode || '-';
    return (
      <Space size={4} wrap className="warehouse-customer-unmaintained">
        <Text type="danger" strong>{record.customerCode || '-'}</Text>
        <Tag color="error">未建档</Tag>
      </Space>
    );
  }

  function renderWarehouseCustomerName(record: WarehouseInboundPackage) {
    return isWarehouseCustomerUnmaintained(record)
      ? <Text type="danger">未维护客户资料</Text>
      : (record.customerName || '-');
  }

  const inStockPackageIds = inStockRows.map((record) => record.id);
  const selectedInStockPackageIdSet = new Set(selectedInStockPackageIds);
  const selectedInStockPackages = inStockRows.filter((record) => selectedInStockPackageIdSet.has(record.id));
  const selectedInStockPackageCount = inStockPackageIds.filter((id) => selectedInStockPackageIdSet.has(id)).length;
  const selectedInStockTotals = selectedInStockPackages.reduce(
    (totals, record) => ({
      packageCount: totals.packageCount + record.packageCount,
      weightKg: totals.weightKg + record.weightKg * record.packageCount,
      cbm: totals.cbm + calculateSingleCbm(record) * record.packageCount
    }),
    { packageCount: 0, weightKg: 0, cbm: 0 }
  );
  const allInStockPackagesSelected = inStockPackageIds.length > 0 && selectedInStockPackageCount === inStockPackageIds.length;
  const toggleAllInStockPackages = () => {
    setSelectedInStockPackageIds(allInStockPackagesSelected ? [] : inStockPackageIds);
  };
  const selectedUnmaintainedCustomerPackages = inStockRows.filter((record) =>
    selectedInStockPackageIdSet.has(record.id) && isWarehouseCustomerUnmaintained(record)
  );

  const inStockColumnDefinitions: Record<string, ManagedTableColumns<WarehouseInboundPackage>[number]> = {
    site: { title: '站点', dataIndex: 'site', width: 110, render: (value?: string) => value || '-' },
    salesperson: { title: '业务员归属', dataIndex: 'salesperson', width: 120, sorter: (a, b) => (a.salesperson ?? '').localeCompare(b.salesperson ?? '', 'zh-Hans-CN'), render: (value?: string) => value?.trim() || '-' },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 150, sorter: (a, b) => a.customerCode.localeCompare(b.customerCode), render: (_, record) => renderWarehouseCustomerCode(record) },
    customerName: { title: '客户名称', dataIndex: 'customerName', width: 150, render: (_, record) => renderWarehouseCustomerName(record) },
    domesticTrackingNo: { title: '快递单号', dataIndex: 'domesticTrackingNo', width: 150, sorter: (a, b) => a.domesticTrackingNo.localeCompare(b.domesticTrackingNo) },
    combinedOrderNo: {
      title: '客户编号-快递单号',
      dataIndex: 'combinedOrderNo',
      width: 240,
      fixed: 'left',
      sorter: (a, b) => a.combinedOrderNo.localeCompare(b.combinedOrderNo),
      render: (_, record) => renderWarehousePackageNoWithTallyMark(record)
    },
    packageCount: { title: '件数', dataIndex: 'packageCount', width: 80, align: 'right', sorter: (a, b) => a.packageCount - b.packageCount },
    weightKg: { title: '单件实重', dataIndex: 'weightKg', width: 110, align: 'right', sorter: (a, b) => a.weightKg - b.weightKg, render: (value: number) => value.toFixed(2) },
    dimensions: {
      title: '尺寸 cm',
      key: 'dimensions',
      width: 130,
      sorter: (a, b) => `${a.lengthCm}×${a.widthCm}×${a.heightCm}`.localeCompare(`${b.lengthCm}×${b.widthCm}×${b.heightCm}`, 'zh-Hans-CN', { numeric: true }),
      render: (_, record) => `${record.lengthCm}×${record.widthCm}×${record.heightCm}`
    },
    cbm: { title: '单件体积 CBM', dataIndex: 'cbm', width: 110, align: 'right', sorter: (a, b) => calculateSingleCbm(a) - calculateSingleCbm(b), render: (_, record) => `${calculateSingleCbm(record).toFixed(6)} CBM` },
    girth: { title: '围长 cm', key: 'girth', width: 100, align: 'right', sorter: (a, b) => (a.girthCm ?? calculatePackageGirth(a)) - (b.girthCm ?? calculatePackageGirth(b)), render: (_, record) => record.measurementStatus === 'PENDING_REMEASURE' ? '-' : (record.girthCm ?? calculatePackageGirth(record)).toFixed(0) },
    vol5000: { title: '单件5000材积', key: 'vol5000', width: 130, align: 'right', sorter: (a, b) => calculateSingleVolumetricWeight(a, 5000) - calculateSingleVolumetricWeight(b, 5000), render: (_, record) => calculateSingleVolumetricWeight(record, 5000).toFixed(2) },
    vol6000: { title: '单件6000材积', key: 'vol6000', width: 130, align: 'right', sorter: (a, b) => calculateSingleVolumetricWeight(a, 6000) - calculateSingleVolumetricWeight(b, 6000), render: (_, record) => calculateSingleVolumetricWeight(record, 6000).toFixed(2) },
    scanTime: {
      title: '入仓时间',
      dataIndex: 'inboundAt',
      width: 160,
      sorter: (a, b) => (a.inboundAt ?? a.scanTime ?? '').localeCompare(b.inboundAt ?? b.scanTime ?? ''),
      render: (value: string | undefined, record) => {
        const timestamp = value || record.scanTime;
        return timestamp ? formatBeijingDateTime(timestamp) : '-';
      }
    },
    totalWeight: { title: '总实重', key: 'totalWeight', width: 110, align: 'right', sorter: (a, b) => (a.weightKg * a.packageCount) - (b.weightKg * b.packageCount), render: (_, record) => (record.weightKg * record.packageCount).toFixed(2) },
    totalCbm: { title: '总体积 CBM', key: 'totalCbm', width: 110, align: 'right', sorter: (a, b) => (calculateSingleCbm(a) * a.packageCount) - (calculateSingleCbm(b) * b.packageCount), render: (_, record) => `${(calculateSingleCbm(record) * record.packageCount).toFixed(3)} CBM` },
    totalVol5000: { title: '总5000材积', key: 'totalVol5000', width: 130, align: 'right', sorter: (a, b) => (calculateSingleVolumetricWeight(a, 5000) * a.packageCount) - (calculateSingleVolumetricWeight(b, 5000) * b.packageCount), render: (_, record) => (calculateSingleVolumetricWeight(record, 5000) * record.packageCount).toFixed(2) },
    totalVol6000: { title: '总6000材积', key: 'totalVol6000', width: 130, align: 'right', sorter: (a, b) => (calculateSingleVolumetricWeight(a, 6000) * a.packageCount) - (calculateSingleVolumetricWeight(b, 6000) * b.packageCount), render: (_, record) => (calculateSingleVolumetricWeight(record, 6000) * record.packageCount).toFixed(2) },
    tallyStatus: { title: '理货状态', dataIndex: 'tallyStatus', width: 110, sorter: (a, b) => (a.tallyStatus || '待理货').localeCompare(b.tallyStatus || '待理货', 'zh-Hans-CN'), render: (value?: string) => value || '待理货' },
    measurementStatus: {
      title: '测量状态',
      dataIndex: 'measurementStatus',
      width: 110,
      sorter: (a, b) => Number(a.measurementStatus !== 'PENDING_REMEASURE') - Number(b.measurementStatus !== 'PENDING_REMEASURE'),
      render: (_, record) => {
        const presentation = resolveWarehouseMeasurementStatusPresentation(record);
        return <Tag color={presentation.color}>{presentation.label}</Tag>;
      }
    },
    splitStatus: { title: '拆票状态', dataIndex: 'splitStatus', width: 110, sorter: (a, b) => (a.splitStatus || '原始票').localeCompare(b.splitStatus || '原始票', 'zh-Hans-CN'), render: (value?: string) => value || '原始票' },
    consolidationStatus: { title: '合票状态', dataIndex: 'consolidationStatus', width: 110, sorter: (a, b) => (a.consolidationStatus || '未合票').localeCompare(b.consolidationStatus || '未合票', 'zh-Hans-CN'), render: (value?: string) => value || '未合票' },
    outboundStatus: { title: '出库状态', dataIndex: 'outboundStatus', width: 110, sorter: (a, b) => (a.outboundStatus || '未出库').localeCompare(b.outboundStatus || '未出库', 'zh-Hans-CN'), render: (value?: string) => value || '未出库' },
    remark: {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      render: (value: string | undefined, record) => canInStockUpdate
        && canEditUnenteredWarehousePackage(record)
        && !isWarehousePackageTallyInProgress(record) ? (
        <Input
          size="small"
          value={value ?? ''}
          placeholder="备注"
          onChange={(event) => {
            const remark = event.target.value;
            setInStockRows((current) => current.map((pkg) => (pkg.id === record.id ? { ...pkg, remark } : pkg)));
            setWarehousePackages((current) => current.map((pkg) => (pkg.id === record.id ? { ...pkg, remark } : pkg)));
          }}
          onBlur={(event) => void updateWarehousePackageRemark(record.id, event.target.value)}
          onPressEnter={(event) => event.currentTarget.blur()}
        />
      ) : (value || '-')
    },
    exceptions: {
      title: '异常',
      key: 'exceptions',
      width: 180,
      sorter: (a, b) => allPackageExceptions(a).join('；').localeCompare(allPackageExceptions(b).join('；'), 'zh-Hans-CN'),
      render: (_, record) => {
        const exceptions = allPackageExceptions(record);
        if (!exceptions.length) return '';
        return (
          <Tooltip title={exceptions.join('；')}>
            <Space wrap>{exceptions.map((item) => <Tag color="warning" key={item}>{item}</Tag>)}</Space>
          </Tooltip>
        );
      }
    },
    actions: {
      title: '操作',
      key: 'actions',
      width: 76,
      resizable: false,
      fixed: 'right',
      align: 'center',
      className: 'warehouse-in-stock-action-column',
      render: (_, record) => {
        const pendingRemeasure = record.measurementStatus === 'PENDING_REMEASURE';
        const boundOrderNo = record.systemOrderNo?.trim();
        const alreadyBound = Boolean(record.shipmentId);
        const customerUnmaintained = isWarehouseCustomerUnmaintained(record);
        return (
        <div className="warehouse-in-stock-row-actions">
          {canInStockUpdate || canInStockSameSpecReplenish || canTallyStart || canInStockSplit ? (
            <>
              {(canInStockUpdate && canEditUnenteredWarehousePackage(record)) || canReplenishWarehouseSameSpec(record)
                ? <Button size="small" onClick={() => openWarehousePackageEdit(record)}>修改</Button>
                : null}
              {canTallyStart ? <Button size="small" disabled={pendingRemeasure} title={pendingRemeasure ? '完成重新过机后才能再次理货' : undefined} onClick={() => openWarehouseTallyTask([record.id])}>理货</Button> : null}
              {canInStockSplit ? <Button
                size="small"
                disabled={!canOpenWarehouseSplit(record.packageCount, pendingRemeasure)}
                title={pendingRemeasure ? '完成重新过机后才能拆票' : undefined}
                onClick={() => {
                  setSplittingPackage(record);
                  setSplitDraft({
                    splitCount: 2,
                    pieces: createEvenWarehouseSplitPieces(record.packageCount, 2),
                    remark: ''
                  });
                }}
              >
                拆票
              </Button> : null}
            </>
          ) : null}
          {canCreateOrderEntry ? <Button
            size="small"
            type="primary"
            loading={orderEntryPreparing && !alreadyBound && !pendingRemeasure && !customerUnmaintained}
            disabled={customerUnmaintained || pendingRemeasure || alreadyBound || orderEntryPreparing}
            title={customerUnmaintained
              ? `请先在基础资料库维护客户 ${record.customerCode} 后再录单`
              : pendingRemeasure
                ? '完成重新过机后才能录单'
              : alreadyBound
                ? `已绑定运单${boundOrderNo ? ` ${boundOrderNo}` : ''}`
                : undefined}
            onClick={() => void openOrderEntryFromInStock([record.id])}
          >{alreadyBound ? '已录单' : orderEntryActionLabel}</Button> : null}
        </div>
        );
      }
    }
  };
  const inStockColumnKeys = Object.keys(inStockColumnDefinitions)
    .filter((key) => (key !== 'site' || !isOperatorView) && ((canInStockSelect || canInStockUpdate || canTallyStart || canInStockSplit || canCreateOrderEntry) || (key !== 'select' && key !== 'actions')));
  const inStockColumns = inStockColumnKeys
    .map((key) => inStockColumnDefinitions[key])
    .filter(Boolean) as ManagedTableColumns<WarehouseInboundPackage>;

  const inStockMatrixColumns: ManagedTableColumns<WarehouseInboundPackage> = [
    {
      key: 'matrixInformation',
      title: '',
      width: 960,
      className: 'managed-matrix-group-primary',
      render: (_: unknown, record: WarehouseInboundPackage) => {
        const inboundTime = record.inboundAt || record.scanTime;
        const measurement = resolveWarehouseMeasurementStatusPresentation(record);
        const exceptions = allPackageExceptions(record);
        const remark = splitWarehouseDeviceRemark(record.scanSource, record.remark).businessRemark;
        return (
          <ManagedMatrixCell
            columns={5}
            labelWidth={66}
            fields={[
              { key: 'inboundAt', label: '入仓时间', value: <ManagedMatrixDateTime value={inboundTime ? formatBeijingDateTime(inboundTime) : undefined} /> },
              !isOperatorView ? { key: 'site', label: '站点', value: record.site || '-' } : null,
              { key: 'salesperson', label: '业务员归属', value: record.salesperson?.trim() || '-' },
              { key: 'customerCode', label: '客户编号', value: renderWarehouseCustomerCode(record), title: record.customerCode, wrap: true },
              { key: 'customerName', label: '客户名称', value: renderWarehouseCustomerName(record), title: record.customerName, wrap: true },
              { key: 'combinedOrderNo', label: '组合号', value: renderWarehousePackageNoWithTallyMark(record), title: record.combinedOrderNo, emphasis: true },
              { key: 'domesticTrackingNo', label: '快递单号', value: record.domesticTrackingNo || '-', title: record.domesticTrackingNo },
              { key: 'packageCount', label: '件数', value: `${record.packageCount} 件` },
              { key: 'singleWeight', label: '单件实重', value: `${record.weightKg.toFixed(2)} KG` },
              { key: 'dimensions', label: '尺寸', value: `${record.lengthCm}×${record.widthCm}×${record.heightCm} cm` },
              { key: 'girth', label: '围长', value: `${(record.girthCm ?? calculatePackageGirth(record)).toFixed(0)} cm` },
              { key: 'totalWeight', label: '总实重', value: `${(record.weightKg * record.packageCount).toFixed(2)} KG` },
              { key: 'totalCbm', label: '总体积 CBM', value: `${(calculateSingleCbm(record) * record.packageCount).toFixed(3)} CBM` },
              canRentDetailView ? { key: 'warehouseRent', label: '仓租', value: record.warehouseRentAmountRmb === undefined ? '-' : `¥${record.warehouseRentAmountRmb.toFixed(2)}` } : null,
              canRentDetailView ? { key: 'warehouseDays', label: '在仓天数', value: record.warehouseDays === undefined ? '-' : `${record.warehouseDays} 天` } : null,
              { key: 'tallyStatus', label: '理货', value: record.tallyStatus || '待理货' },
              { key: 'measurementStatus', label: '测量', value: <Tag color={measurement.color}>{measurement.label}</Tag> },
              { key: 'outboundStatus', label: '出库', value: record.outboundStatus || '未出库' },
              { key: 'splitStatus', label: '拆票', value: record.splitStatus || '原始票' },
              { key: 'consolidationStatus', label: '合票', value: record.consolidationStatus || '未合票' },
              {
                key: 'exceptions',
                label: '异常',
                value: exceptions.length ? <Space wrap size={[4, 4]}>{exceptions.map((item) => <Tag color="warning" key={item}>{item}</Tag>)}</Space> : <Text type="secondary">暂无异常</Text>,
                title: exceptions.join('；'),
                wrap: true
              },
              remark ? { key: 'remark', label: '备注', value: remark, title: remark, wrap: true } : null
            ]}
          />
        );
      }
    },
    ...(inStockColumnKeys.includes('actions') ? [{ ...inStockColumnDefinitions.actions, key: 'actions', title: '操作', width: 76, resizable: false, fixed: 'right' as const }] : [])
  ];

  const warehousePackageColumns: ColumnsType<WarehouseInboundPackage> = [
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 150, render: (value: string | undefined, record) => {
      const shipment = findShipmentBySystemOrderNo(value);
      return renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(shipment ?? record), { shipment, subtitle: shipment ? '点击查看详情' : '仓库入库单' });
    } },
    {
      title: '客户单号-快递单号',
      width: 210,
      render: (_, record) => renderWarehousePackageNoWithTallyMark(record)
    },
    {
      title: '到仓进度',
      width: 110,
      render: (_, record) => formatWarehouseInboundProgress(record)
    },
    { title: '件数', dataIndex: 'packageCount', width: 80 },
    { title: '实重', dataIndex: 'weightKg', width: 90, render: (value: number) => value.toFixed(2) },
    { title: '尺寸 cm', width: 130, render: (_, record) => `${record.lengthCm}×${record.widthCm}×${record.heightCm}` },
    { title: '围长 cm', width: 100, render: (_, record) => (record.girthCm ?? calculatePackageGirth(record)).toFixed(0) },
    { title: '体积 CBM', dataIndex: 'cbm', width: 100, render: (value: number) => `${value.toFixed(6)} CBM` },
    { title: '5000材积', width: 110, render: (_, record) => calculateWarehouseVolumetricWeight(record, 5000).toFixed(2) },
    { title: '6000材积', width: 110, render: (_, record) => calculateWarehouseVolumetricWeight(record, 6000).toFixed(2) },
    { title: '扫描时间', dataIndex: 'scanTime', width: 150, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 220,
      render: (value: string | undefined, record) => canInStockUpdate
        && canEditUnenteredWarehousePackage(record)
        && !isWarehousePackageTallyInProgress(record) ? (
        <Input
          size="small"
          value={value ?? ''}
          placeholder="木架、木箱、破损等"
          onChange={(event) => {
            const remark = event.target.value;
            setWarehousePackages((current) => current.map((pkg) => (pkg.id === record.id ? { ...pkg, remark } : pkg)));
          }}
          onBlur={(event) => void updateWarehousePackageRemark(record.id, event.target.value)}
          onPressEnter={(event) => event.currentTarget.blur()}
        />
      ) : (value || '-')
    },
    {
      title: '异常',
      dataIndex: 'exceptions',
      width: 180,
      render: (exceptions: string[]) =>
        exceptions.length ? (
          <Space wrap>{exceptions.map((item) => <Tag color="warning" key={item}>{item}</Tag>)}</Space>
        ) : (
          <Tag color="green">正常</Tag>
      )
    }
  ];
  function patchPackageDraft(patch: Partial<WarehousePackageDraft>) {
    setPackageDraft((current) => ({ ...current, ...patch }));
  }

  function patchCartonSpec(index: number, patch: Partial<WarehouseManualReceiptCartonSpecInput>) {
    setPackageDraft((current) => ({
      ...current,
      cartonSpecs: current.cartonSpecs.map((spec, specIndex) => (specIndex === index ? { ...spec, ...patch } : spec))
    }));
  }

  function addCartonSpec() {
    setPackageDraft((current) => ({ ...current, cartonSpecs: [...current.cartonSpecs, createEmptyCartonSpec()] }));
  }

  function removeCartonSpec(index: number) {
    setPackageDraft((current) => ({
      ...current,
      cartonSpecs: current.cartonSpecs.length <= 1
        ? current.cartonSpecs
        : current.cartonSpecs.filter((_, specIndex) => specIndex !== index)
    }));
  }

  async function splitSelectedWarehousePackage() {
    if (!splittingPackage) {
      return;
    }
    const validationMessage = validateWarehouseSplitPieces(
      splitDraft.pieces,
      splitDraft.splitCount
    );
    if (validationMessage) {
      setWarehouseNotice(validationMessage);
      return;
    }
    const pieces = splitDraft.pieces.map((piece) => Number(piece));
    try {
      const result = await apiClient.splitWarehousePackage(splittingPackage.id, {
        pieces,
        remark: splitDraft.remark.trim() || undefined
      });
      const source = mapWarehouseApiPackageToInbound(result.sourcePackage);
      const packages = result.packages.map(mapWarehouseApiPackageToInbound);
      setWarehousePackages((current) =>
        withWarehouseCustomerProgress([
          ...packages,
          ...current.map((pkg) => (pkg.id === source.id ? source : pkg))
        ])
      );
      setInStockRows((current) => [...packages, ...current.filter((pkg) => pkg.id !== source.id)]);
      setSelectedInStockPackageIds((current) => current.filter((id) => id !== source.id));
      setInStockTotals((current) => calculateTodayTotals([...packages, ...inStockRows.filter((pkg) => pkg.id !== source.id)], current.waitingDispatchTickets));
      setWarehouseNotice(`已拆分 ${splittingPackage.combinedOrderNo} 为 ${packages.length} 个新票`);
      setSplittingPackage(null);
      setSplitDraft({ splitCount: 2, pieces: [null, null], remark: '' });
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '拆分入库箱失败');
    }
  }

  async function openOrderEntryFromInStock(packageIds: string[]) {
    const ids = Array.from(new Set(packageIds)).filter(Boolean);
    if (!ids.length) {
      setWarehouseNotice('请先勾选需要录单的包裹');
      return;
    }
    const selectedPackages = ids
      .map((id) => [...inStockRows, ...warehousePackages, ...todayReceiptRows].find((pkg) => pkg.id === id))
      .filter((pkg): pkg is WarehouseInboundPackage => Boolean(pkg));
    if (selectedPackages.length !== ids.length) {
      setWarehouseNotice('部分仓库包裹已变化，请刷新在仓数据后重新选择');
      return;
    }
    if (selectedPackages.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      setWarehouseNotice('理货后包裹待重新过机，完成测量后才能录单');
      return;
    }
    const unmaintainedCustomerCodes = Array.from(new Set(selectedPackages
      .filter(isWarehouseCustomerUnmaintained)
      .map((pkg) => pkg.customerCode.trim())
      .filter(Boolean)));
    if (unmaintainedCustomerCodes.length) {
      setWarehouseNotice(`客户资料不存在，请先在基础资料库维护客户 ${unmaintainedCustomerCodes.join('、')} 后再录单`);
      return;
    }
    setOrderEntryPreparing(true);
    try {
      const eligiblePackages = await apiClient.orderEntryPackages({ packageIds: ids });
      const eligibleIds = eligiblePackages.map((pkg) => pkg.id);
      const eligibleIdSet = new Set(eligibleIds);
      const excludedPackages = selectedPackages.filter((pkg) => !eligibleIdSet.has(pkg.id));
      if (!eligibleIds.length) {
        setWarehouseNotice('所选包裹均不可录单：可能已绑定运单、被草稿占用或待重新过机');
        return;
      }
      if (!excludedPackages.length) {
        onCreateOrderEntryFromWarehouse?.(eligibleIds);
        return;
      }
      modal.confirm({
        title: '部分包裹不可录单',
        content: (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Alert
              type="warning"
              showIcon
              message={`已选 ${ids.length} 件，${eligibleIds.length} 件可录单，${excludedPackages.length} 件将被排除`}
              description="系统会保留这些包裹的在仓记录，不会重复绑定到新运单。"
            />
            <div aria-label="不可录单包裹列表">
              {excludedPackages.map((pkg) => {
                const reason = pkg.measurementStatus === 'PENDING_REMEASURE'
                  ? '待重新过机'
                  : pkg.shipmentId
                    ? `已绑定运单${pkg.systemOrderNo ? ` ${pkg.systemOrderNo}` : ''}`
                    : '已被录单草稿占用或状态已变化';
                return <div key={pkg.id}>{pkg.combinedOrderNo || pkg.id}：{reason}</div>;
              })}
            </div>
          </Space>
        ),
        okText: `仅录入可用 ${eligibleIds.length} 件`,
        cancelText: '返回检查',
        onOk: () => onCreateOrderEntryFromWarehouse?.(eligibleIds)
      });
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '校验录单包裹失败');
    } finally {
      setOrderEntryPreparing(false);
    }
  }

  function openWarehouseTallyTask(packageIds: string[]) {
    const ids = Array.from(new Set(packageIds)).filter(Boolean);
    if (!ids.length) {
      setWarehouseNotice('请先勾选需要理货的在仓包裹');
      return;
    }
    const selectedPackages = ids
      .map((id) => [...inStockRows, ...warehousePackages, ...todayReceiptRows].find((pkg) => pkg.id === id))
      .filter((pkg): pkg is WarehouseInboundPackage => Boolean(pkg));
    if (selectedPackages.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      setWarehouseNotice('理货后包裹待重新过机，完成测量后才能再次理货');
      return;
    }
    const talliedPackages = selectedPackages.filter(isTalliedWarehousePackage);
    if (talliedPackages.length && (selectedPackages.length !== 1 || talliedPackages.length !== 1)) {
      setWarehouseNotice('二次理货一次只能选择一个已完成理货的包裹');
      return;
    }
    setTallyTaskPackageIds(ids);
    setTallyRequirementDraft('');
  }

  async function createWarehouseTallyTask() {
    if (!tallyTaskPackageIds.length) {
      setWarehouseNotice('请先选择要理货的在仓包裹');
      return;
    }
    if (!tallyRequirementDraft.trim()) {
      setWarehouseNotice('请填写理货需求');
      return;
    }
    try {
      const created = await apiClient.createWarehouseTallyTask({
        packageIds: tallyTaskPackageIds,
        tallyRequirement: tallyRequirementDraft.trim()
      });
      setTallyTasks((current) => [created, ...current.filter((task) => task.id !== created.id)]);
      setTallyTaskPackageIds([]);
      setTallyRequirementDraft('');
      setSelectedInStockPackageIds([]);
      setActiveReceiveSection('consolidation');
      setWarehouseNotice(`已发起理货任务 ${created.taskNo}`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '发起理货失败');
    }
  }

  function openEditTallyTask(task: WarehouseTallyTaskSummary) {
    setEditingTallyTask(task);
    setEditingTallyPackageIds(task.packageIds);
    setEditingTallyRequirement(task.tallyRequirement);
    setEditingTallyRemark(task.remark ?? '');
  }

  function closeEditTallyTask() {
    if (editingTallySubmitting) return;
    setEditingTallyTask(null);
    setEditingTallyPackageIds([]);
    setEditingTallyRequirement('');
    setEditingTallyRemark('');
  }

  async function updatePendingTallyTask() {
    if (!editingTallyTask || editingTallySubmitting) return;
    if (!editingTallyPackageIds.length) {
      setWarehouseNotice('理货任务至少保留一个在仓包裹');
      return;
    }
    if (!editingTallyRequirement.trim()) {
      setWarehouseNotice('请填写理货需求');
      return;
    }
    setEditingTallySubmitting(true);
    try {
      const updated = await apiClient.updateWarehouseTallyTask(editingTallyTask.id, {
        packageIds: editingTallyPackageIds,
        tallyRequirement: editingTallyRequirement.trim(),
        remark: editingTallyRemark.trim()
      });
      setTallyTasks((current) => current.map((task) => task.id === updated.id ? updated : task));
      setInStockRefreshVersion((current) => current + 1);
      setEditingTallyTask(null);
      setEditingTallyPackageIds([]);
      setEditingTallyRequirement('');
      setEditingTallyRemark('');
      setWarehouseNotice(`理货任务 ${updated.taskNo} 已修改`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '修改理货任务失败');
    } finally {
      setEditingTallySubmitting(false);
    }
  }

  async function cancelPendingTallyTask() {
    if (!cancellingTallyTask || cancellingTallySubmitting) return;
    setCancellingTallySubmitting(true);
    try {
      const cancelled = await apiClient.cancelWarehouseTallyTask(cancellingTallyTask.id);
      setTallyTasks((current) => current.map((task) => task.id === cancelled.id ? cancelled : task));
      setSelectedInStockPackageIds([]);
      setInStockRefreshVersion((current) => current + 1);
      setCancellingTallyTask(null);
      setWarehouseNotice(`理货任务 ${cancelled.taskNo} 已取消，原包裹可重新发起理货`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '取消理货任务失败');
    } finally {
      setCancellingTallySubmitting(false);
    }
  }

  function openCompleteTallyTask(task: WarehouseTallyTaskSummary) {
    setTallyCompleteError(null);
    setTallyCompleteSubmitting(false);
    tallyCompleteSubmittingRef.current = false;
    setCompletingTallyTask(task);
    setTallyCompleteDraft({
      packageCount: task.packageCount,
      weightKg: task.originalWeightKg,
      lengthCm: task.originalLengthCm,
      widthCm: task.originalWidthCm,
      heightCm: task.originalHeightCm,
      remark: task.remark ?? ''
    });
    setTallyProcessMode('KEEP');
    setTallyProcessSourceIds([]);
    setTallySplitPieces('');
  }

  async function openPendingTallyTaskDetails(task: WarehouseTallyTaskSummary) {
    const requestId = tallyTaskDetailRequestRef.current + 1;
    tallyTaskDetailRequestRef.current = requestId;
    setSelectedTallyTaskDetails([task]);
    setSelectedTallySourcePackages(undefined);
    setTallySourcePackagesError(undefined);
    setTallySourcePackagesLoading(true);
    try {
      const rows = await apiClient.warehouseQuery.warehouseTallyTaskSourcePackages(task.id);
      if (tallyTaskDetailRequestRef.current !== requestId) return;
      setSelectedTallySourcePackages(rows);
    } catch (error) {
      if (tallyTaskDetailRequestRef.current !== requestId) return;
      setTallySourcePackagesError(error instanceof Error ? error.message : '原始包裹加载失败');
    } finally {
      if (tallyTaskDetailRequestRef.current === requestId) {
        setTallySourcePackagesLoading(false);
      }
    }
  }

  async function completeWarehouseTallyTask() {
    if (!completingTallyTask || tallyCompleteSubmittingRef.current) {
      return;
    }
    setTallyCompleteError(null);
    let printWindow: Window | null = null;
    let completedTask: WarehouseTallyTaskSummary | undefined;
    try {
      const sourcePackages = completingTallyTask.packageIds
        .map((id) => [...inStockRows, ...warehousePackages, ...todayReceiptRows].find((pkg) => pkg.id === id))
        .filter((pkg): pkg is WarehouseInboundPackage => Boolean(pkg));
      if (sourcePackages.length !== completingTallyTask.packageIds.length) {
        setTallyCompleteError('无法加载本理货任务的全部原始包裹，请刷新后重试');
        return;
      }
      const keepResult = (pkg: WarehouseInboundPackage) => ({
        sourcePackageIds: [pkg.id],
        packageCount: pkg.packageCount
      });
      let results = sourcePackages.map(keepResult);
      if (tallyProcessMode === 'MERGE') {
        const selectedIds = tallyProcessSourceIds.length ? tallyProcessSourceIds : sourcePackages.map((pkg) => pkg.id);
        if (selectedIds.length < 2) {
          setTallyCompleteError('合并理货至少选择两个任务内原始包裹');
          return;
        }
        results = [
          {
            sourcePackageIds: selectedIds,
            packageCount: tallyCompleteDraft.packageCount
          },
          ...sourcePackages.filter((pkg) => !selectedIds.includes(pkg.id)).map(keepResult)
        ];
      }
      if (tallyProcessMode === 'SPLIT') {
        if (tallyProcessSourceIds.length !== 1) {
          setTallyCompleteError('拆票理货只能选择一个任务内原始包裹');
          return;
        }
        const source = sourcePackages.find((pkg) => pkg.id === tallyProcessSourceIds[0])!;
        const pieces = tallySplitPieces.split(/[,，\s]+/).map((item) => Math.floor(Number(item))).filter((item) => Number.isFinite(item) && item > 0);
        if (pieces.length < 2 || pieces.reduce((sum, item) => sum + item, 0) !== source.packageCount) {
          setTallyCompleteError(`拆票件数必须至少两票且合计等于原包裹 ${source.packageCount} 件`);
          return;
        }
        results = [
          ...pieces.map((piece) => ({
            sourcePackageIds: [source.id],
            packageCount: piece
          })),
          ...sourcePackages.filter((pkg) => pkg.id !== source.id).map(keepResult)
        ];
      }
      tallyCompleteSubmittingRef.current = true;
      setTallyCompleteSubmitting(true);
      printWindow = window.open('', '_blank');
      if (printWindow) printWindow.opener = null;
      const completed = await apiClient.completeWarehouseTallyTask(completingTallyTask.id, {
        packageCount: tallyCompleteDraft.packageCount,
        remark: tallyCompleteDraft.remark,
        results
      });
      completedTask = completed;
      setTallyTasks((current) => current.map((task) => (task.id === completed.id ? completed : task)));
      setCompletingTallyTask(null);
      setTallyCompleteError(null);
      setActiveReceiveSection('completed-consolidation');
      setWarehouseNotice(`已完成理货任务 ${completed.taskNo}，正在准备打印标签`);

      let printStarted = false;
      let printError: string | null = null;
      try {
        const outputPackages = await apiClient.warehouseQuery.warehouseTallyTaskOutputPackages(completed.id);
        const printed = await apiClient.printWarehouseTallyTaskLabel(completed.id);
        printStarted = printWarehouseTallyLabelHtml(createWarehouseTallyLabelHtml(printed, outputPackages), printWindow);
        setTallyTasks((current) => current.map((task) => (task.id === completed.id ? printed : task)));
        if (!printStarted) {
          printError = '浏览器拦截了自动打印';
        }
      } catch (error) {
        printWindow?.close();
        printError = error instanceof Error ? error.message : '自动打印失败';
      }

      let refreshFailed = false;
      try {
        const refreshedInStock = await apiClient.warehouseQuery.warehouseInStock(inStockFilters);
        setInStockRows(refreshedInStock.rows.map(mapWarehouseApiPackageToInbound).map((pkg) => completed.packageIds.includes(pkg.id)
          ? pkg
          : pkg));
        setInStockTotals(refreshedInStock.totals);
      } catch {
        refreshFailed = true;
      }
      if (printError || refreshFailed) {
        setWarehouseNotice(`已完成理货任务 ${completed.taskNo}${printError ? `，但${printError}` : ''}${refreshFailed ? '，列表刷新失败，请手动刷新页面' : ''}；可在已完成理货中重新打印`);
      } else {
        setWarehouseNotice(printStarted
          ? `已完成理货任务 ${completed.taskNo}，标签已送至打印`
          : `已完成理货任务 ${completed.taskNo}；可在已完成理货中重新打印`);
      }
    } catch (error) {
      printWindow?.close();
      if (completedTask) {
        setTallyTasks((current) => current.map((task) => (task.id === completedTask!.id ? completedTask! : task)));
        setCompletingTallyTask(null);
        setActiveReceiveSection('completed-consolidation');
        setWarehouseNotice(`已完成理货任务 ${completedTask.taskNo}，但自动打印失败：${error instanceof Error ? error.message : '请手动重打标签'}`);
      } else {
        setTallyCompleteError(error instanceof Error ? error.message : '完成理货失败');
      }
    } finally {
      tallyCompleteSubmittingRef.current = false;
      setTallyCompleteSubmitting(false);
    }
  }

  function replaceTallyTask(updated: WarehouseTallyTaskSummary) {
    setTallyTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
  }

  function openEditCompletedTallyCount(task: WarehouseTallyTaskSummary) {
    setEditingCompletedTallyTask(task);
    setEditingCompletedTallyCount(task.completedPackageCount ?? 1);
  }

  async function updateCompletedTallyCount() {
    if (!editingCompletedTallyTask || editingCompletedTallySubmitting) return;
    setEditingCompletedTallySubmitting(true);
    try {
      const updated = await apiClient.reverseReviewWarehouseTallyTask(editingCompletedTallyTask.id);
      replaceTallyTask(updated);
      setSelectedTallyTaskDetails((current) => current.map((task) => task.id === updated.id ? updated : task));
      setEditingCompletedTallyTask(null);
      setInStockRefreshVersion((current) => current + 1);
      setActiveReceiveSection('consolidation');
      setWarehouseNotice(`理货任务 \${updated.taskNo} 已反审核，原包裹已回到未完成理货，可重新勾选后完成`);
      message.success('反审核成功，已回到未完成理货');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '理货反审核失败');
    } finally {
      setEditingCompletedTallySubmitting(false);
    }
  }

  async function openHistoricalAggregateCorrection(task: WarehouseTallyTaskSummary) {
    setTallyCorrectionLoading(true);
    try {
      const preview = await apiClient.warehouseTallyHistoricalAggregateCorrectionPreview(task.id);
      if (!preview.eligible) {
        if (preview.alreadyCorrected) {
          message.info('该历史聚合理货数据已经完成纠正');
        } else {
          message.error(preview.reason || '该历史理货任务不能纠正');
        }
        return;
      }
      setTallyCorrectionTask(task);
      setTallyCorrectionPreview(preview);
      setTallyCorrectionConfirmed(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '无法加载历史聚合理货纠正数据');
    } finally {
      setTallyCorrectionLoading(false);
    }
  }

  async function confirmHistoricalAggregateCorrection() {
    if (!tallyCorrectionTask || !tallyCorrectionPreview?.eligible || !tallyCorrectionPreview.previewFingerprint || !tallyCorrectionConfirmed) return;
    setTallyCorrectionLoading(true);
    try {
      const result = await apiClient.correctWarehouseTallyHistoricalAggregate(tallyCorrectionTask.id, {
        sampleIds: tallyCorrectionPreview.scans.map((scan) => scan.sampleId),
        previewFingerprint: tallyCorrectionPreview.previewFingerprint,
        confirmedPhysicalPieces: true
      });
      const correctedTask = { ...result.task, outputPackages: result.correctedPackages };
      replaceTallyTask(correctedTask);
      setSelectedTallyTaskDetails((current) => current.map((task) => task.id === correctedTask.id ? correctedTask : task));
      setTallyCorrectionTask(null);
      setTallyCorrectionPreview(null);
      setTallyCorrectionConfirmed(false);
      setInStockRefreshVersion((current) => current + 1);
      setWarehouseNotice(`理货任务 ${result.task.taskNo} 已拆分为 ${result.correctedPackages.length} 条真实包裹记录，请重新打印标签`);
      message.success('历史聚合理货数据纠正完成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '历史聚合理货数据纠正失败');
    } finally {
      setTallyCorrectionLoading(false);
    }
  }

  async function generateWarehouseTallyLabel(task: WarehouseTallyTaskSummary) {
    try {
      const updated = await apiClient.generateWarehouseTallyTaskLabel(task.id);
      replaceTallyTask(updated);
      setWarehouseNotice(`已生成理货标签 ${updated.labelNo ?? updated.taskNo}`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '生成理货标签失败');
    }
  }

  async function printWarehouseTallyLabel(task: WarehouseTallyTaskSummary) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setWarehouseNotice('打印窗口被浏览器拦截，请允许本站弹出窗口后重试');
      return;
    }
    printWindow.opener = null;
    try {
      const updated = await apiClient.printWarehouseTallyTaskLabel(task.id);
      const outputPackages = await apiClient.warehouseQuery.warehouseTallyTaskOutputPackages(task.id);
      replaceTallyTask(updated);
      if (!printWarehouseTallyLabelHtml(createWarehouseTallyLabelHtml(updated, outputPackages), printWindow)) {
        if (!printWindow.closed) printWindow.close();
        setWarehouseNotice('无法打开打印预览，请允许本站弹出窗口后重试');
        return;
      }
      setWarehouseNotice(`已记录理货标签打印 ${updated.labelNo ?? updated.taskNo}`);
    } catch (error) {
      if (!printWindow.closed) printWindow.close();
      setWarehouseNotice(error instanceof Error ? error.message : '打印理货标签失败');
    }
  }

  async function downloadWarehouseTallyLabel(task: WarehouseTallyTaskSummary) {
    try {
      const updated = await apiClient.downloadWarehouseTallyTaskLabel(task.id);
      const outputPackages = await apiClient.warehouseQuery.warehouseTallyTaskOutputPackages(task.id);
      replaceTallyTask(updated);
      downloadHtmlFile(createWarehouseTallyLabelHtml(updated, outputPackages), `理货后标签-${updated.labelNo ?? updated.taskNo}.html`, 'text/html;charset=utf-8');
      setWarehouseNotice(`已下载理货标签 ${updated.labelNo ?? updated.taskNo}`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '下载理货标签失败');
    }
  }

  async function openTallyTaskDetailForPackage(record: WarehouseInboundPackage) {
    try {
      const chain = await apiClient.warehouseQuery.warehouseTallyTaskHistoryChain(record.id);
      if (chain.length) {
        setTallyTasks((current) => [...chain, ...current.filter((item) => !chain.some((task) => task.id === item.id))]);
        setSelectedTallyTaskDetails(chain);
        return;
      }
    } catch {
      // Fall through to the completed tally list so the user still has a recovery path.
    }
    setCompletedTallyView('history');
    setActiveReceiveSection('completed-consolidation');
    setWarehouseNotice('未找到直接关联的理货任务，请在已完成理货历史按组合号查询');
  }

  async function openTallyRepeatBatchHistory(batch: WarehouseTallyRepeatBatchSummary) {
    try {
      const chain = await apiClient.warehouseQuery.warehouseTallyTaskHistoryChain(batch.latestSourcePackageId);
      if (!chain.length) {
        setWarehouseNotice('未找到该批次的理货链路');
        return;
      }
      setTallyTasks((current) => [...chain, ...current.filter((item) => !chain.some((task) => task.id === item.id))]);
      setSelectedTallyTaskDetails(chain);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '理货链路加载失败');
    }
  }

  function queryTallyRepeatStatistics() {
    setTallyRepeatFilters({ ...tallyRepeatFilterDraft });
    setTallyRepeatRefreshVersion((current) => current + 1);
  }

  function resetTallyRepeatStatistics() {
    const reset = { ...defaultWarehouseTallyRepeatFilters };
    setTallyRepeatFilterDraft(reset);
    setTallyRepeatFilters(reset);
    setTallyRepeatStatisticsView('operators');
    setTallyRepeatRefreshVersion((current) => current + 1);
  }

  function showOperatorRepeatBatches(record: WarehouseTallyRepeatOperatorSummary) {
    const nextFilters = {
      ...tallyRepeatFilters,
      operator: record.operator,
      onlyRepeated: true
    };
    setTallyRepeatFilterDraft(nextFilters);
    setTallyRepeatFilters(nextFilters);
    setTallyRepeatStatisticsView('batches');
    setTallyRepeatRefreshVersion((current) => current + 1);
  }

  function toggleWarehousePackage(packageId: string, checked: boolean) {
    setSelectedPackageIds((current) =>
      checked ? Array.from(new Set([...current, packageId])) : current.filter((id) => id !== packageId)
    );
  }

  async function consolidateSelectedPackages(mode: WarehouseConsolidationRecord['mode']) {
    const selected = warehousePackages.filter((pkg) => selectedPackageIds.includes(pkg.id) && isInStockPackage(pkg));
    if (!selected.length) {
      setWarehouseNotice('请先选择要合并的入库包裹');
      return;
    }
    if (selected.some((pkg) => pkg.measurementStatus === 'PENDING_REMEASURE')) {
      setWarehouseNotice('理货后包裹待重新过机，完成测量后才能合票或出货');
      return;
    }
    let created: WarehouseConsolidationSummary | undefined;
    try {
      created = await apiClient.createWarehouseConsolidation({ packageIds: selected.map((pkg) => pkg.id), mode });
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '理货合并失败');
      return;
    }
    const record: WarehouseConsolidationRecord = {
      id: created.id,
      packageIds: created.packageIds,
      outboundOrderNo: created.systemOrderNo ?? created.consolidationNo,
      mode: created.mode,
      totalPackages: created.totalPackages,
      totalActualWeightKg: created.totalActualWeightKg,
      totalVolumetricWeightKg: created.totalVolumetricWeightKg,
      totalChargeableWeightKg: created.totalChargeableWeightKg
    };
    setConsolidations((current) => [record, ...current]);
    setWarehousePackages((current) =>
      current.map((pkg) => (record.packageIds.includes(pkg.id) ? { ...pkg, status: 'CONSOLIDATED' } : pkg))
    );
    setSelectedPackageIds([]);
    setWarehouseNotice(
      mode === 'MERGE_AND_SHIP'
        ? `已理货合并 ${record.totalPackages} 个入库包裹并生成出货单 ${record.outboundOrderNo}`
        : `已理货合并 ${record.totalPackages} 个入库包裹，暂不出货`
    );
  }

  function handleWarehouseMachineImported(result: WarehouseMachineImportResponse) {
    setTodayReceiptRowsQueryKey(null);
    setInStockRowsQueryKey(null);
    setSelectedTodayPackageIds([]);
    setSelectedInStockPackageIds([]);
    setTodayReceiptPagination((current) => ({ ...current, current: 1 }));
    setInStockPagination((current) => ({ ...current, current: 1 }));
    setTodayReceiptRefreshVersion((current) => current + 1);
    setInStockRefreshVersion((current) => current + 1);
    setWarehouseNotice(`已导入 ${result.importedRows} 条机器过机数据，跳过 ${result.totalRows - result.importedRows} 条`);
  }

  async function handleWarehouseMachineExport() {
    if (!isWarehouseMachineExportReady(inStockRowsQueryKey, warehouseQueryKey(inStockFilters))) {
      setWarehouseNotice('在仓数据正在更新，请加载完成后再下载');
      return;
    }
    setMachineExporting(true);
    try {
      const selectedPageRecords = resolveWarehouseMachineExportRecords(inStockRows, selectedInStockPackageIds);
      const fullResponse = selectedPageRecords.selected
        ? undefined
        : await apiClient.warehouseQuery.warehouseInStock(inStockFilters);
      const { selected, records } = selectedPageRecords.selected
        ? selectedPageRecords
        : resolveWarehouseMachineExportRecords(fullResponse?.rows.map(mapWarehouseApiPackageToInbound) ?? [], []);
      if (!records.length) {
        setWarehouseNotice('当前没有可下载的在仓数据');
        return;
      }
      const physicalPieceCount = await downloadWarehouseMachineExport(records, selected);
      setWarehouseNotice(selected
        ? `已下载勾选的 ${physicalPieceCount} 件在仓数据`
        : `已下载当前筛选结果全部 ${physicalPieceCount} 件在仓数据`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '在仓数据下载失败');
    } finally {
      setMachineExporting(false);
    }
  }

  async function handleTodayWarehouseMachineExport() {
    if (!isWarehouseMachineExportReady(todayReceiptRowsQueryKey, warehouseQueryKey(todayFilters))) {
      setWarehouseNotice('今日收货数据正在更新，请加载完成后再下载');
      return;
    }
    const { selected, records } = resolveWarehouseMachineExportRecords(todayReceiptRows, selectedTodayPackageIds);
    if (!records.length) {
      setWarehouseNotice('当前没有可下载的今日收货数据');
      return;
    }
    setMachineExporting(true);
    try {
      const physicalPieceCount = await downloadWarehouseMachineExport(records, selected, '今日收货');
      setWarehouseNotice(selected
        ? `已下载勾选的 ${physicalPieceCount} 件今日收货数据`
        : `已下载当前筛选结果全部 ${physicalPieceCount} 件今日收货数据`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '今日收货数据下载失败');
    } finally {
      setMachineExporting(false);
    }
  }

  const pendingRoutingColumns = createPendingRoutingColumns({ businessCostAudits, mode: 'warehouse' });
  const tallySourceItems: WarehouseTallySourceItem[] = (completingTallyTask?.packageIds ?? []).map((packageId) => {
    const pkg = [...inStockRows, ...warehousePackages, ...todayReceiptRows].find((item) => item.id === packageId);
    return {
      id: packageId,
      label: pkg ? `${formatWarehousePackageNo(pkg)} / ${pkg.packageCount} 件 / ${pkg.weightKg.toFixed(2)} KG` : packageId
    };
  });

  return (
    <AppPage>
      <AppPageHeader
        title={config.title}
        description={activeReceiveSection === 'dashboard' ? config.description : undefined}
        actions={
          <AppActionGroup>
            <Button icon={<PackageCheck size={16} />}>收货扫描</Button>
            <Button type="primary" icon={<FileText size={16} />}>模拟面单</Button>
          </AppActionGroup>
        }
      />

      {renderNoticeBar(notice)}
      {renderNoticeBar(warehouseNotice)}

      {activeReceiveSection === 'dashboard' ? (
        <Row gutter={[16, 16]}>
          {dashboardStats.map((stat) => (
            <Col xs={24} md={8} key={stat.label}>
              <MetricCard icon={<PackagePlus />} title={stat.label} value={stat.value} extra={stat.helper} />
            </Col>
          ))}
        </Row>
      ) : null}

      <ModuleSubWorkspace items={receiveSubItems} activeKey={activeReceiveSection} onChange={setActiveReceiveSection}>
      {activeReceiveSection === 'dashboard' ? <PlaceholderPanel title="仓库看板" /> : null}
      {activeReceiveSection === 'rent-details' ? (
        <WarehouseRentDetailPanel
          apiClient={apiClient}
          canExport={canRentDetailExport}
          canViewRules={canRentRuleView}
          canManageRules={canRentRuleManage}
        />
      ) : null}
      {activeReceiveSection === 'completed-consolidation' ? (
        <WarehouseCompletedTallyPanel
          view={completedTallyView}
          onViewChange={setCompletedTallyView}
          completedTasks={completedTallyTasks}
          completedArchiveRows={recentCompletedTallyArchiveRows}
          completedTaskByKey={completedTallyTaskByKey}
          canViewDetail={canTallyCompletedDetail}
          canUpdateCount={canTallyCompletedReverseReview}
          canGenerateLabel={canTallyLabelGenerate}
          canPrintLabel={canTallyLabelPrint}
          canDownloadLabel={canTallyLabelDownload}
          onViewTask={(task) => setSelectedTallyTaskDetails([task])}
          onUpdateCount={openEditCompletedTallyCount}
          onGenerateLabel={(task) => void generateWarehouseTallyLabel(task)}
          onPrintLabel={(task) => void printWarehouseTallyLabel(task)}
          onDownloadLabel={(task) => void downloadWarehouseTallyLabel(task)}
          repeatStatistics={tallyRepeatStatistics}
          repeatFilterDraft={tallyRepeatFilterDraft}
          repeatOperatorOptions={tallyRepeatOperatorOptions}
          repeatStatisticsLoading={tallyRepeatStatisticsLoading}
          repeatStatisticsView={tallyRepeatStatisticsView}
          setRepeatFilterDraft={setTallyRepeatFilterDraft}
          onQueryRepeatStatistics={queryTallyRepeatStatistics}
          onResetRepeatStatistics={resetTallyRepeatStatistics}
          onRepeatStatisticsViewChange={setTallyRepeatStatisticsView}
          onShowOperatorRepeatBatches={showOperatorRepeatBatches}
          onOpenRepeatBatchHistory={(record) => void openTallyRepeatBatchHistory(record)}
        />
      ) : null}
      {activeReceiveSection === 'pending-routing' ? (
        <Card
          title={(
            <Space size={12}>
              <span>待排货</span>
              <Text type="secondary">共 {pendingRoutingShipments.length} 票</Text>
            </Space>
          )}
        >
          <ManagedTable<Shipment>
            recordDetail={{ title: '待排货运单详情' }}
            rowKey="id"
            dataSource={pendingRoutingShipments}
            size="small"
            pagination={tenRowTablePagination}
            scroll={{ x: 2100 }}
            columns={pendingRoutingColumns}
            columnSettingsPlacement="toolbar"
            columnSettings={{ storageKey: 'sunny.warehouse.pendingRouting.columns', title: '待排货列设置' }}
            locale={{ emptyText: '暂无待排货订单，已完成理货或审核通过后的订单会进入这里。' }}
          />
        </Card>
      ) : null}
      {activeReceiveSection === 'today' ? (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Card className="warehouse-today-overview">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Row gutter={[10, 10]} className="warehouse-today-filter-grid">
              <Col xs={24} md={8} xl={3}>
                {renderFilterField('日期范围', (
                  <select
                    aria-label="今日收货日期范围"
                    className="native-select"
                    value={todayFilterDraft.datePreset ?? 'TODAY'}
                    onChange={(event) => updateTodayFilterDraft({ datePreset: event.target.value as WarehouseTodayQuery['datePreset'] })}
                  >
                    <option value="TODAY">今日</option>
                    <option value="WEEK">本周</option>
                    <option value="LAST_7_DAYS">最近 7 天</option>
                    <option value="MONTH">本月</option>
                    <option value="CUSTOM">自定义</option>
                  </select>
                ))}
              </Col>
              {todayFilterDraft.datePreset === 'CUSTOM' ? (
                <>
                  <Col xs={24} md={8} xl={3}>
                    {renderFilterField('开始日期', (
                      <AppDatePicker aria-label="今日收货开始日期" value={todayFilterDraft.customFrom ?? ''} onChange={(value) => updateTodayFilterDraft({ customFrom: value })} />
                    ))}
                  </Col>
                  <Col xs={24} md={8} xl={3}>
                    {renderFilterField('结束日期', (
                      <AppDatePicker aria-label="今日收货结束日期" value={todayFilterDraft.customTo ?? ''} onChange={(value) => updateTodayFilterDraft({ customTo: value })} />
                    ))}
                  </Col>
                </>
              ) : null}
              {!isOperatorView ? (
                <Col xs={24} md={8} xl={3}>
                  {renderFilterField('站点', (
                    <select
                      aria-label="今日收货站点筛选"
                      className="native-select"
                      value={todayFilterDraft.site ?? ''}
                      onChange={(event) => updateTodayFilterDraft({ site: event.target.value })}
                    >
                      <option value="">全部站点</option>
                      {todaySiteOptions.map((site) => <option value={site} key={site}>{site}</option>)}
                    </select>
                  ))}
                </Col>
              ) : null}
              <Col xs={24} md={8} xl={3}>
                {renderFilterField('客户编号', (
                  <Input aria-label="今日收货客户编号筛选" value={todayFilterDraft.customerOrderNo ?? ''} onChange={(event) => updateTodayFilterDraft({ customerOrderNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={3}>
                {renderFilterField('快递单号', (
                  <Input aria-label="今日收货快递单号筛选" value={todayFilterDraft.domesticTrackingNo ?? ''} onChange={(event) => updateTodayFilterDraft({ domesticTrackingNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterField('客户编号-快递单号', (
                  <Input aria-label="今日收货组合号筛选" value={todayFilterDraft.combinedOrderNo ?? ''} onChange={(event) => updateTodayFilterDraft({ combinedOrderNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterActions(
                  () => {
                    setTodayReceiptPagination((current) => ({ ...current, current: 1 }));
                    setTodayFilters({ ...todayFilterDraft });
                  },
                  () => {
                    setTodayFilterDraft(emptyTodayFilters);
                    setTodayReceiptPagination((current) => ({ ...current, current: 1 }));
                    setTodayFilters(emptyTodayFilters);
                  }
                )}
              </Col>
            </Row>

            <div className="warehouse-today-metrics">
              <Statistic title="收货票数" value={todayTotals.receiptTickets} suffix="票" />
              <Statistic title="总件数" value={todayTotals.totalPackages} suffix="件" />
              <Statistic title="总重量" value={todayTotals.totalWeightKg} suffix="KG" precision={2} />
              <Statistic title="总体积" value={todayTotals.totalCbm} suffix="CBM" precision={3} />
              <Statistic title="待出库" value={todayTotals.waitingDispatchTickets} suffix="票" />
              <Statistic title="待理货" value={todayTotals.pendingTallyTickets} suffix="票" />
              <Statistic className={todayTotals.exceptionTickets ? 'warehouse-today-metric-warning' : undefined} title="异常" value={todayTotals.exceptionTickets} suffix="票" />
            </div>
          </Space>
        </Card>

        <Card
          className="warehouse-today-table-card"
          title={(
            <Space size={12}>
              <span>收货明细</span>
              <Text type="secondary">共 {todayReceiptRows.length} 条</Text>
              {canToggleTodayDataScope ? <Space.Compact>
                <Button
                  size="small"
                  type={viewingAllTodayData ? 'default' : 'primary'}
                  onClick={() => {
                    setTodayFilterDraft((current) => ({ ...current, dataScope: 'OWN' }));
                    setTodayFilters((current) => ({ ...current, dataScope: 'OWN' }));
                    setTodayReceiptPagination((current) => ({ ...current, current: 1 }));
                  }}
                >查看我的客户数据</Button>
                <Button
                  size="small"
                  type={viewingAllTodayData ? 'primary' : 'default'}
                  onClick={() => {
                    setTodayFilterDraft((current) => ({ ...current, dataScope: 'ALL' }));
                    setTodayFilters((current) => ({ ...current, dataScope: 'ALL' }));
                    setTodayReceiptPagination((current) => ({ ...current, current: 1 }));
                  }}
                >查看仓库全部数据</Button>
              </Space.Compact> : null}
              {selectedTodayPackageIds.length ? <Tag color="blue">已选 {selectedTodayPackageIds.length}</Tag> : null}
            </Space>
          )}
          extra={(
            <Space wrap>
              <Button
                icon={<Download size={15} />}
                loading={machineExporting}
                disabled={!todayReceiptRows.length || !isWarehouseMachineExportReady(todayReceiptRowsQueryKey, warehouseQueryKey(todayFilters))}
                title={!isWarehouseMachineExportReady(todayReceiptRowsQueryKey, warehouseQueryKey(todayFilters))
                  ? '今日收货数据加载完成后可下载'
                  : selectedTodayPackageIds.length
                  ? `下载已选 ${selectedTodayPackageIds.length} 条记录`
                  : '未勾选时下载当前筛选结果全部数据'}
                onClick={() => void handleTodayWarehouseMachineExport()}
              >{selectedTodayPackageIds.length ? `下载已选（${selectedTodayPackageIds.length}）` : '批量下载'}</Button>
              {canWarehouseMachineImport ? <Button onClick={() => setMachineImportOpen(true)}>批量导入</Button> : null}
              {canTodayReceiptException ? (
                <Button
                  onClick={() => {
                    if (!selectedTodayPackageIds.length) {
                      setWarehouseNotice('请先勾选需要标记异常的包裹');
                      return;
                    }
                    setExceptionModalOpen(true);
                  }}
                >
                  添加异常
                </Button>
              ) : null}
              {canTodayReceiptCreate ? <Button type="primary" onClick={() => setManualReceiptDrawerOpen(true)}>手动添加收货</Button> : null}
            </Space>
          )}
        >
          <ManagedDualViewTable<WarehouseInboundPackage>
            viewStorageKey="sunny.warehouse.today.view-v1"
            viewAriaLabel="今日收货表格视图"
            defaultView="matrix"
            shellClassName="warehouse-today-dual-table"
            views={{
              matrix: {
                label: '矩阵视图',
                columns: todayReceiptMatrixColumns,
                tableProps: {
                  className: 'warehouse-today-matrix-table',
                  minimumScrollX: 0,
                  tableLayout: 'fixed',
                  recordDetail: { title: '今日收货详情', columns: todayReceiptColumns },
                  columnSettings: {
                    storageKey: 'sunny.warehouse.today.matrix-columns-v2',
                    title: '收货矩阵列设置',
                    lockedKeys: ['select', 'actions']
                  }
                }
              },
              ledger: {
                label: '精密台账模式',
                columns: todayReceiptColumns,
                tableProps: {
                  className: 'warehouse-today-ledger-table',
                  minimumScrollX: 1400,
                  recordDetail: { title: '今日收货详情' },
                  columnSettings: {
                    storageKey: 'sunny.warehouse.today.columns',
                    title: '收货明细列设置',
                    lockedKeys: ['select', 'actions'],
                    defaultHiddenKeys: todayReceiptColumnKeys.filter((key) => !defaultTodayReceiptColumnKeys.includes(key))
                  }
                }
              }
            }}
            rowKey="id"
            dataSource={todayReceiptRows}
            size="small"
            pagination={{
              ...tenRowTablePagination,
              ...todayReceiptPagination,
              onChange: (current, pageSize) => setTodayReceiptPagination((previous) => resolveListPaginationChange(previous, current, pageSize))
            }}
            columnSettingsPlacement="toolbar"
          />
        </Card>

        <Drawer
          title="手动添加收货"
          width={760}
          open={manualReceiptDrawerOpen}
          onClose={() => setManualReceiptDrawerOpen(false)}
          destroyOnHidden={false}
          footer={(
            <Flex justify="space-between" align="center" gap={12} className="warehouse-today-drawer-footer">
              <Space wrap>
                <Tag color="cyan">箱规 {packageDraft.cartonSpecs.length} 条</Tag>
                <Tag color="blue">总件数 {draftMetrics.totalPackages} 件</Tag>
                <Tag color="purple">总体积 {draftMetrics.totalCbm.toFixed(3)} CBM</Tag>
                <Tag color="geekblue">总实重 {draftMetrics.totalActualWeightKg.toFixed(2)} KG</Tag>
              </Space>
              <Button type="primary" onClick={() => void addTodayManualPackage()}>确认添加收货</Button>
            </Flex>
          )}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Text strong>基础信息</Text>
              <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
                <Col xs={24} md={12}>
                  <Text strong>客户编号</Text>
                  <AutoComplete
                    aria-label="手动添加客户编号"
                    className="warehouse-manual-receipt-customer-select"
                    style={{ width: '100%' }}
                    value={packageDraft.customerCode}
                    options={manualReceiptCustomerOptions}
                    placeholder={manualReceiptCustomersLoading ? '正在加载客户资料' : '输入客户编号或名称搜索'}
                    filterOption={(inputValue, option) => String(option?.label ?? '').toLowerCase().includes(inputValue.toLowerCase())}
                    onChange={patchTodayManualCustomerCode}
                    onSelect={patchTodayManualCustomerCode}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>客户名称 / 匹配状态</Text>
                  <Input
                    aria-label="手动添加客户名称"
                    value={selectedManualReceiptCustomer?.name ?? (packageDraft.customerCode.trim() ? '待客户建档匹配' : '')}
                    placeholder="已建档客户自动带出；未建档编号可先收货"
                    readOnly
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>快递单号</Text>
                  <Input aria-label="手动添加快递单号" value={packageDraft.domesticTrackingNo} onChange={(event) => patchTodayManualTrackingNo(event.target.value)} />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>客户编号-快递单号</Text>
                  <Input
                    aria-label="手动添加客户编号-快递单号"
                    value={packageDraft.combinedOrderNo}
                    onChange={(event) => patchPackageDraft({ combinedOrderNo: event.target.value })}
                  />
                </Col>
              </Row>
            </div>

            <div>
              <Flex justify="space-between" align="center" className="warehouse-carton-spec-header">
                <Text strong>箱规</Text>
                <Text type="secondary">一条箱规保存为一行在仓记录</Text>
              </Flex>
              <div className="warehouse-carton-specs" role="group" aria-label="手动添加箱规">
                {packageDraft.cartonSpecs.map((spec, index) => (
                  <div className="warehouse-carton-spec-row" key={`carton-${index}`}>
                    <div className="warehouse-carton-spec-index">#{index + 1}</div>
                    <div className="warehouse-carton-spec-field">
                      <Text strong>重量 KG</Text>
                      <InputNumber
                        aria-label={`第 ${index + 1} 条箱规重量 KG`}
                        min={0}
                        precision={2}
                        value={spec.weightKg}
                        onChange={(value) => patchCartonSpec(index, { weightKg: Number(value) || 0 })}
                      />
                    </div>
                    <div className="warehouse-carton-dimensions">
                      <div className="warehouse-carton-spec-field">
                        <Text strong>长 cm</Text>
                        <InputNumber
                          aria-label={`第 ${index + 1} 条箱规长 cm`}
                          min={0}
                          precision={2}
                          value={spec.lengthCm}
                          onChange={(value) => patchCartonSpec(index, { lengthCm: Number(value) || 0 })}
                        />
                      </div>
                      <div className="warehouse-carton-spec-field">
                        <Text strong>宽 cm</Text>
                        <InputNumber
                          aria-label={`第 ${index + 1} 条箱规宽 cm`}
                          min={0}
                          precision={2}
                          value={spec.widthCm}
                          onChange={(value) => patchCartonSpec(index, { widthCm: Number(value) || 0 })}
                        />
                      </div>
                      <div className="warehouse-carton-spec-field">
                        <Text strong>高 cm</Text>
                        <InputNumber
                          aria-label={`第 ${index + 1} 条箱规高 cm`}
                          min={0}
                          precision={2}
                          value={spec.heightCm}
                          onChange={(value) => patchCartonSpec(index, { heightCm: Number(value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="warehouse-carton-spec-field warehouse-carton-count">
                      <Text strong>件数</Text>
                      <InputNumber
                        aria-label={`第 ${index + 1} 条箱规件数`}
                        min={1}
                        precision={0}
                        value={spec.packageCount}
                        onChange={(value) => patchCartonSpec(index, { packageCount: Math.max(1, Math.floor(Number(value) || 1)) })}
                      />
                    </div>
                    <div className="warehouse-carton-actions">
                      <Tooltip title="新增箱规">
                        <Button aria-label={`在第 ${index + 1} 条后新增箱规`} icon={<Plus size={16} />} onClick={addCartonSpec} />
                      </Tooltip>
                      <Tooltip title={packageDraft.cartonSpecs.length <= 1 ? '至少保留一条箱规' : '删除箱规'}>
                        <Button
                          aria-label={`删除第 ${index + 1} 条箱规`}
                          icon={<Trash2 size={16} />}
                          disabled={packageDraft.cartonSpecs.length <= 1}
                          onClick={() => removeCartonSpec(index)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Text strong>备注异常</Text>
              <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
                <Col xs={24}>
                  <Text strong>扫描时间</Text>
                  <Input aria-label="手动添加扫描时间" type="datetime-local" value={packageDraft.scanTime} onChange={(event) => patchPackageDraft({ scanTime: event.target.value })} />
                </Col>
                <Col xs={24}>
                  <Text strong>备注</Text>
                  <Input aria-label="手动添加备注" value={packageDraft.remark} onChange={(event) => patchPackageDraft({ remark: event.target.value })} />
                </Col>
                <Col xs={24}>
                  <Text strong>异常</Text>
                  <Input aria-label="手动添加异常" value={packageDraft.manualException} onChange={(event) => patchPackageDraft({ manualException: event.target.value })} />
                </Col>
              </Row>
            </div>
          </Space>
        </Drawer>
      </Space>
      ) : null}
      {activeReceiveSection === 'packages' ? (
      <div className="warehouse-in-stock-workspace">
        <section className="warehouse-in-stock-summary" aria-label="在仓筛选与汇总">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Row gutter={[10, 10]} className="warehouse-today-filter-grid">
              {!isOperatorView ? (
                <Col xs={24} md={8} xl={3}>
                  {renderFilterField('站点', (
                    <select
                      aria-label="在仓站点筛选"
                      className="native-select"
                      value={inStockFilterDraft.site ?? ''}
                      onChange={(event) => updateInStockFilterDraft({ site: event.target.value })}
                    >
                      <option value="">全部站点</option>
                      {todaySiteOptions.map((site) => <option value={site} key={site}>{site}</option>)}
                    </select>
                  ))}
                </Col>
              ) : null}
              <Col xs={24} md={8} xl={4}>
                {renderFilterField('客户编号', (
                  <Input aria-label="在仓客户编号筛选" value={inStockFilterDraft.customerOrderNo ?? ''} onChange={(event) => updateInStockFilterDraft({ customerOrderNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterField('快递单号', (
                  <Input aria-label="在仓快递单号筛选" value={inStockFilterDraft.domesticTrackingNo ?? ''} onChange={(event) => updateInStockFilterDraft({ domesticTrackingNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={5}>
                {renderFilterField('客户编号-快递单号', (
                  <Input aria-label="在仓组合号筛选" value={inStockFilterDraft.combinedOrderNo ?? ''} onChange={(event) => updateInStockFilterDraft({ combinedOrderNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterField('操作日志', (
                  <Input aria-label="在仓操作日志查找" value={inStockFilterDraft.operationKeyword ?? ''} onChange={(event) => updateInStockFilterDraft({ operationKeyword: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterActions(
                  () => {
                    inStockQueryFeedbackRef.current = true;
                    setInStockPagination((current) => ({ ...current, current: 1 }));
                    setInStockFilters({ ...inStockFilterDraft });
                  },
                  () => {
                    setInStockFilterDraft(emptyInStockFilters);
                    setInStockPagination((current) => ({ ...current, current: 1 }));
                    setInStockFilters(emptyInStockFilters);
                  }
                )}
              </Col>
            </Row>
            <div className="warehouse-today-metrics">
              <Statistic title="收货票数" value={inStockTotals.receiptTickets} suffix="票" />
              <Statistic title="件数" value={inStockTotals.totalPackages} suffix="件" />
              <Statistic title="重量" value={inStockTotals.totalWeightKg} suffix="KG" precision={2} />
              <Statistic title="体积" value={inStockTotals.totalCbm} suffix="CBM" precision={3} />
              <Statistic title="待出库" value={inStockTotals.waitingDispatchTickets} suffix="票" />
              <Statistic title="待理货" value={inStockTotals.pendingTallyTickets} suffix="票" />
              <Statistic className={inStockTotals.exceptionTickets ? 'warehouse-today-metric-warning' : undefined} title="异常" value={inStockTotals.exceptionTickets} suffix="票" />
            </div>
          </Space>
        </section>

        <section className="warehouse-in-stock-table-section">
          <Flex className="warehouse-in-stock-table-toolbar" justify="space-between" align="center" gap={12} wrap>
            <Space size={12}>
              <span>在仓数据</span>
              <Text type="secondary">共 {inStockTotalItems} 条</Text>
              <Button size="small" disabled={!inStockPackageIds.length} onClick={toggleAllInStockPackages}>
                {allInStockPackagesSelected ? '取消全选本页' : `全选本页（${inStockPackageIds.length}）`}
              </Button>
              {selectedInStockPackageCount ? <Space size={8} aria-live="polite">
                <Tag color="blue">已选 {selectedInStockPackageCount} 条</Tag>
                <Text type="secondary">总件数 {selectedInStockTotals.packageCount} 件</Text>
                <Text type="secondary">总重量 {selectedInStockTotals.weightKg.toFixed(2)} KG</Text>
                <Text type="secondary">总体积 {selectedInStockTotals.cbm.toFixed(3)} CBM</Text>
              </Space> : null}
              {selectedUnmaintainedCustomerPackages.length ? <Tag color="error" aria-live="polite">含 {selectedUnmaintainedCustomerPackages.length} 件客户未建档</Tag> : null}
            </Space>
            <Space wrap>
              <Button
                icon={<Download size={15} />}
                loading={machineExporting}
                disabled={!inStockRows.length || !isWarehouseMachineExportReady(inStockRowsQueryKey, warehouseQueryKey(inStockFilters))}
                title={!isWarehouseMachineExportReady(inStockRowsQueryKey, warehouseQueryKey(inStockFilters))
                  ? '在仓数据加载完成后可下载'
                  : selectedInStockPackageCount
                  ? `下载已选 ${selectedInStockPackageCount} 条记录`
                  : '未勾选时下载当前筛选结果全部数据'}
                onClick={() => void handleWarehouseMachineExport()}
              >{selectedInStockPackageCount ? `下载已选（${selectedInStockPackageCount}）` : '批量下载'}</Button>
              {canWarehouseMachineImport ? <Button onClick={() => setMachineImportOpen(true)}>批量导入</Button> : null}
              {canTallyStart ? <Button onClick={() => openWarehouseTallyTask(selectedInStockPackageIds)}>批量理货</Button> : null}
              {canCreateOrderEntry ? <Button
                type="primary"
                loading={orderEntryPreparing && !selectedUnmaintainedCustomerPackages.length}
                disabled={Boolean(selectedUnmaintainedCustomerPackages.length) || orderEntryPreparing}
                title={selectedUnmaintainedCustomerPackages.length ? '请先补充所选包裹的客户资料后再录单' : undefined}
                onClick={() => void openOrderEntryFromInStock(selectedInStockPackageIds)}
              >批量录单</Button> : null}
            </Space>
          </Flex>
          <ManagedDualViewTable<WarehouseInboundPackage>
            viewStorageKey="sunny.warehouse.inStock.view-v1"
            viewAriaLabel="在仓数据表格视图"
            defaultView="matrix"
            shellClassName="warehouse-in-stock-dual-table"
            views={{
              matrix: {
                label: '矩阵视图',
                columns: inStockMatrixColumns,
                tableProps: {
                  className: 'warehouse-in-stock-matrix-table',
                  minimumScrollX: 0,
                  tableLayout: 'fixed',
                  // 矩阵视图同样保留选择列表头，使表头全选框可用。
                  showHeader: true,
                  onRow: (record) => ({
                    className: isWarehouseCustomerUnmaintained(record) ? 'warehouse-customer-unmaintained-row' : undefined
                  }),
                  recordDetail: canInStockView ? {
                    title: '在仓货物详情',
                    columns: inStockColumns,
                    ariaLabel: (record) => `查看在仓货物 ${formatWarehousePackageNo(record)} 详情`
                  } : false,
                  columnSettings: hasWarehousePermission('warehouse:in-stock:column-setting') ? {
                    storageKey: 'sunny.warehouse.inStock.matrix-columns-v1',
                    title: '在仓矩阵列设置',
                    lockedKeys: ['actions']
                  } : false
                }
              },
              ledger: {
                label: '精密台账模式',
                columns: inStockColumns,
                tableProps: {
                  className: 'warehouse-in-stock-ledger-table',
                  minimumScrollX: 1400,
                  onRow: (record) => ({
                    className: isWarehouseCustomerUnmaintained(record) ? 'warehouse-customer-unmaintained-row' : undefined
                  }),
                  recordDetail: canInStockView ? {
                    title: '在仓货物详情',
                    ariaLabel: (record) => `查看在仓货物 ${formatWarehousePackageNo(record)} 详情`
                  } : false,
                  columnSettings: hasWarehousePermission('warehouse:in-stock:column-setting') ? {
                    storageKey: 'sunny.warehouse.inStock.columns',
                    title: '在仓数据列设置',
                    lockedKeys: ['actions'],
                    defaultHiddenKeys: inStockColumnKeys.filter((key) => !defaultInStockColumnKeys.includes(key))
                  } : false
                }
              }
            }}
            rowKey="id"
            dataSource={inStockRows}
            loading={inStockLoading}
            recordDetailTarget={notificationPackageDetailTarget ? { key: `notification-warehouse-package:${notificationPackageDetailTarget.id}`, record: notificationPackageDetailTarget } : null}
            size="small"
            rowSelection={(canInStockSelect || canInStockUpdate || canTallyStart || canInStockSplit || canCreateOrderEntry) ? {
              selectedRowKeys: selectedInStockPackageIds,
              onChange: (selectedRowKeys) => setSelectedInStockPackageIds(selectedRowKeys.map(String)),
              getTitleCheckboxProps: () => ({ 'aria-label': '全选在仓包裹' }),
              getCheckboxProps: (record) => ({ title: `选择在仓包裹 ${formatWarehousePackageNo(record)}` })
            } : undefined}
            pagination={{
              ...tenRowTablePagination,
              ...inStockPagination,
              total: inStockTotalItems,
              onChange: (current, pageSize) => setInStockPagination((previous) => resolveListPaginationChange(previous, current, pageSize))
            }}
            columnSettingsPlacement="toolbar"
          />
        </section>
      </div>
      ) : null}

      {activeReceiveSection === 'consolidation' ? (
      <Space direction="vertical" size={16} className="warehouse-tally-workspace">
          <Card
            title={(
              <Space size={12}>
                <span>未完成理货</span>
                <Text type="secondary">共 {pendingTallyTasks.length} 条</Text>
              </Space>
            )}
          >
            <ManagedTable<WarehouseTallyTaskSummary>
              recordDetail={{ title: '未完成理货任务详情' }}
              rowKey="id"
              dataSource={pendingTallyTasks}
              size="small"
              pagination={tenRowTablePagination}
              columnSettingsPlacement="toolbar"
              scroll={{ x: 1400 }}
              locale={{ emptyText: '暂无未完成理货，请先从在仓数据发起理货' }}
              columns={[
                { title: '理货任务号', dataIndex: 'taskNo', width: 210 },
                { title: '来源组合号', dataIndex: 'sourceCombinedOrderNo', width: 210 },
                { title: '客户编号', dataIndex: 'customerCode', width: 100 },
                { title: '件数', dataIndex: 'packageCount', width: 80, align: 'right' },
                { title: '原始重量', dataIndex: 'originalWeightKg', width: 110, align: 'right', render: (value: number) => `${value.toFixed(2)} KG` },
                { title: '原始尺寸', width: 130, render: (_, task) => `${task.originalLengthCm}×${task.originalWidthCm}×${task.originalHeightCm}` },
                { title: '5000/6000材积', width: 150, render: (_, task) => `${task.originalVolumetricWeightKg5000.toFixed(2)} / ${task.originalVolumetricWeightKg.toFixed(2)}` },
                { title: '理货需求', dataIndex: 'tallyRequirement', width: 240 },
                { title: '需求发起人', dataIndex: 'createdBy', width: 100, render: (value?: string) => value || '-' },
                { title: '需求发起时间', dataIndex: 'createdAt', width: 170, defaultSortOrder: 'ascend', sorter: (a, b) => a.createdAt.localeCompare(b.createdAt), render: (value: string) => formatBeijingDateTime(value) },
                { title: '备注', dataIndex: 'remark', width: 180, render: (value?: string) => value || '-' },
                {
                  title: '操作',
                  key: 'actions',
                  width: 310,
                  fixed: 'right',
                  render: (_, task) => (
                    <Space size={6} wrap>
                      {canTallyDetail ? <Button size="small" onClick={() => void openPendingTallyTaskDetails(task)}>查看任务</Button> : null}
                      {canTallyUpdate ? <Button size="small" onClick={() => openEditTallyTask(task)}>修改</Button> : null}
                      {canTallyProcess ? <Button size="small" type="primary" onClick={() => openCompleteTallyTask(task)}>处理理货</Button> : null}
                      {canTallyCancel ? <Button size="small" danger onClick={() => setCancellingTallyTask(task)}>取消任务</Button> : null}
                    </Space>
                  )
                }
              ]}
            />
          </Card>
          <div hidden>
          <Card
            className="warehouse-tally-package-card"
            title={(
              <Space direction="vertical" size={2}>
                <Text strong>待理货包裹</Text>
                <Text type="secondary">先搜索并勾选原始入库包裹，再在下方执行合并、拆分或创建出货单</Text>
              </Space>
            )}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={[10, 10]} className="module-filter-grid">
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('业务员唛头', (
                    <Input
                      aria-label="理货业务员唛头筛选"
                      placeholder="例如 1399"
                      value={consolidationPackageFilterDraft.customerCode}
                      onChange={(event) => setConsolidationPackageFilterDraft((current) => ({ ...current, customerCode: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('入库单号', (
                    <Input
                      aria-label="理货入库单号筛选"
                      placeholder="例如 API仓库-1399"
                      value={consolidationPackageFilterDraft.systemOrderNo}
                      onChange={(event) => setConsolidationPackageFilterDraft((current) => ({ ...current, systemOrderNo: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('快递单号', (
                    <Input
                      aria-label="理货快递单号筛选"
                      placeholder="例如 KY400..."
                      value={consolidationPackageFilterDraft.domesticTrackingNo}
                      onChange={(event) => setConsolidationPackageFilterDraft((current) => ({ ...current, domesticTrackingNo: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterField('理货状态', (
                    <select
                      aria-label="理货状态筛选"
                      className="native-select"
                      value={consolidationPackageFilterDraft.tallyStatus}
                      onChange={(event) => setConsolidationPackageFilterDraft((current) => ({ ...current, tallyStatus: event.target.value }))}
                    >
                      <option value="ALL">全部状态</option>
                      <option value="INBOUND">待理货</option>
                      <option value="SPLIT">已拆分</option>
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterActions(
                    () => {
                      setTallyPackagePagination((current) => ({ ...current, current: 1 }));
                      setConsolidationPackageFilters(consolidationPackageFilterDraft);
                    },
                    () => {
                      setConsolidationPackageFilterDraft(emptyConsolidationPackageFilters);
                      setTallyPackagePagination((current) => ({ ...current, current: 1 }));
                      setConsolidationPackageFilters(emptyConsolidationPackageFilters);
                    }
                  )}
                </Col>
              </Row>
              <ManagedTable<WarehouseInboundPackage>
                recordDetail={false}
                rowKey="id"
                dataSource={filteredConsolidationPackages}
                size="small"
                pagination={{
                  ...tenRowTablePagination,
                  ...tallyPackagePagination,
                  onChange: (current, pageSize) => setTallyPackagePagination((previous) => resolveListPaginationChange(previous, current, pageSize))
                }}
                columnSettingsPlacement="toolbar"
                scroll={{ x: 900 }}
                columns={[
                  {
                    title: renderWarehouseSelectAllHeader(
                      tallyPackageCurrentPageIds,
                      selectedPackageIds,
                      setSelectedPackageIds,
                      '全选待理货包裹'
                    ),
                    key: 'select',
                    width: 52,
                    fixed: 'left',
                    render: (_, pkg) => (
                      <Checkbox
                        aria-label={`选择 ${formatWarehousePackageNo(pkg)} ${pkg.id}`}
                        checked={selectedPackageIds.includes(pkg.id)}
                        onChange={(event) => toggleWarehousePackage(pkg.id, event.target.checked)}
                      />
                    )
                  },
                  {
                    title: '客户单号-快递单号',
                    width: 230,
                    render: (_, pkg) => (
                      <Space direction="vertical" size={0}>
                        <Text strong>{formatWarehousePackageNo(pkg)}</Text>
                        {pkg.sourcePackageNo ? <Text type="secondary">来源：{pkg.sourcePackageNo}</Text> : null}
                        {pkg.packageIndex && pkg.expectedTotalPackageCount ? (
                          <Text type="secondary">箱序：{pkg.packageIndex}/{pkg.expectedTotalPackageCount}</Text>
                        ) : null}
                      </Space>
                    )
                  },
                  { title: '出货单号', dataIndex: 'systemOrderNo', width: 150, render: (value: string | undefined, record) => {
                    const shipment = findShipmentBySystemOrderNo(value);
                    return renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(shipment ?? record), { shipment, subtitle: shipment ? '点击查看详情' : '仓库入库单' });
                  } },
                  { title: '实重', dataIndex: 'weightKg', width: 90, render: (value: number) => `${value.toFixed(2)} KG` },
                  { title: '尺寸 cm', width: 130, render: (_, pkg) => `${pkg.lengthCm}×${pkg.widthCm}×${pkg.heightCm}` },
                  { title: '计费重', dataIndex: 'chargeableWeightKg', width: 100, render: (value: number) => `${value.toFixed(2)} KG` },
                  {
                    title: '到仓进度',
                    width: 110,
                    render: (_, pkg) => formatWarehouseInboundProgress(pkg)
                  },
                  {
                    title: '操作',
                    width: 90,
                    render: (_, pkg) => (canInStockSplit ? <Button size="small" onClick={() => setSplittingPackage(pkg)}>拆分成多箱</Button> : null)
                  }
                ]}
              />
            </Space>
          </Card>
          </div>
        <div hidden>
        <Row gutter={[16, 16]} className="warehouse-tally-action-row">
        <Col xs={24} lg={10}>
          <Card
            className="warehouse-tally-action-card"
            title={(
              <Space direction="vertical" size={2}>
                <Text strong>理货操作区</Text>
                <Text type="secondary">确认选中包裹后执行仓库动作</Text>
              </Space>
            )}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div className="warehouse-tally-selected-count">
                <Statistic title="已选包裹" value={selectedPackageIds.length} suffix="个" />
              </div>
              <div className="warehouse-tally-preview">
                <div>
                  <Text type="secondary">新理货单号</Text>
                  <Text strong>{selectedWarehousePackageNoPreview}</Text>
                </div>
                <div>
                  <Text type="secondary">来源客户</Text>
                  <Text strong>{selectedWarehouseCustomerCodes.join('、') || '-'}</Text>
                </div>
                <div>
                  <Text type="secondary">合计件数</Text>
                  <Text strong>{selectedWarehouseTotals.packages} 件</Text>
                </div>
                <div>
                  <Text type="secondary">计费重</Text>
                  <Text strong>{selectedWarehouseTotals.chargeableWeightKg.toFixed(2)} KG</Text>
                </div>
              </div>
              {hasWarehousePermission('warehouse:tally-pending:merge-only') || hasWarehousePermission('warehouse:tally-pending:merge-and-ship') ? (
                <div className="warehouse-tally-action-buttons">
                  {hasWarehousePermission('warehouse:tally-pending:merge-only') ? <Button block onClick={() => void consolidateSelectedPackages('MERGE_ONLY')}>合并成一箱</Button> : null}
                  {hasWarehousePermission('warehouse:tally-pending:merge-and-ship') ? <Button type="primary" block onClick={() => void consolidateSelectedPackages('MERGE_AND_SHIP')}>理货并创建出货单</Button> : null}
                </div>
              ) : null}
              <Alert
                type="info"
                showIcon
                message="动作说明"
                description="合并成一箱只生成理货记录，不进入出货；理货并创建出货单会进入订单审核链路。原始入库包裹、快递号、箱序、重量尺寸和备注都会保留追溯。"
              />
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="理货记录" className="warehouse-consolidation-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              {consolidations.length ? consolidations.map((record) => (
                <Flex key={record.id} justify="space-between" align="center">
                  <Space direction="vertical" size={0}>
                    <Text strong>{record.outboundOrderNo}</Text>
                    <Text type="secondary">{record.totalPackages} 个包裹 / 计费重 {record.totalChargeableWeightKg.toFixed(2)} KG</Text>
                  </Space>
                  <Space>
                    <Tag color={record.mode === 'MERGE_AND_SHIP' ? 'green' : 'blue'}>{formatWarehouseConsolidationMode(record.mode)}</Tag>
                    <Button size="small" onClick={() => setSelectedConsolidationId(record.id)}>
                      查看明细
                    </Button>
                  </Space>
                </Flex>
              )) : <Text type="secondary">暂无理货记录</Text>}
            </Space>
          </Card>
        </Col>
      </Row>
      </div>
      </Space>
      ) : null}

      {activeReceiveSection === 'queue' ? (
      <Card
        title="待出库"
        extra={(
          <Space>
            {canDispatchSelect && (canHandoverPrint || (canDispatchConfirm && canBatchDispatchConfirm)) ? (
              <>
                <Tag color={selectedWarehouseQueueTicketCount ? 'blue' : 'default'}>已选 {selectedWarehouseQueueTicketCount} 票 / {selectedWarehouseQueuePackageCount} 件</Tag>
                {canHandoverPrint ? <Button onClick={openBatchWarehouseHandover}>打印代理交接单</Button> : null}
                {canDispatchConfirm && canBatchDispatchConfirm ? <Popconfirm title="确认出货？" description="仅已打印有效代理交接单的订单可出货。" okText="确认出货" cancelText="取消" onConfirm={() => void dispatchPrintedWarehouseShipments()}>
                  <Button type="primary" loading={batchDispatching}>出货</Button>
                </Popconfirm> : null}
              </>
            ) : null}
          </Space>
        )}
      >
        <ManagedTable<WarehouseLabelQueueRow>
          recordDetail={{ title: '待出库详情' }}
          rowKey="id"
          dataSource={warehouseLabelQueueRows}
          size="small"
          pagination={tenRowTablePagination}
          rowSelection={warehouseQueueRowSelection}
          minimumScrollX={1720}
          columnSettingsPlacement="toolbar"
          className="warehouse-label-queue-table"
          columns={warehouseQueueColumns}
          columnSettings={hasWarehousePermission('warehouse:dispatch-pending:column-setting') ? {
            storageKey: warehouseQueueColumnSettingsKey,
            title: '待出库列设置',
            labels: warehouseQueueColumnLabels,
            defaultColumnOrder: warehouseQueueDefaultColumnKeys
          } : undefined}
          locale={{ emptyText: '暂无待打单出货单，请先在渠道排货中分配渠道，或在理货管理中选择“理货并创建出货单”。' }}
        />
      </Card>
      ) : null}

      {activeReceiveSection === 'outbounded' ? (
      <Card
        title="已出库"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="已出库为仓库阶段历史存档，按出库时间保留已打印交接单并完成出库的订单。"
          />
          <ManagedTable<WarehouseHandoverRow>
            recordDetail={{ title: '已出库交接详情' }}
            rowKey="id"
            columns={[
              { title: '交接单号', dataIndex: 'handoverNo', width: 180 },
              { title: '出货单号', dataIndex: 'outboundOrderNo', width: 190, render: (value?: string) => renderShipmentOrderNoLink(value) },
              {
                title: '客户/目的地',
                key: 'customerDestination',
                width: 180,
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Text>{record.customerName || '-'}</Text>
                    <Text type="secondary">{record.destinationCountry || '-'}</Text>
                  </Space>
                )
              },
              { title: '出货件数', dataIndex: 'packageCount', width: 100, render: (value: number) => `${value} 件` },
              { title: '计费重', dataIndex: 'chargeableWeightKg', width: 110, render: (value: number) => `${value.toFixed(2)} KG` },
              { title: '公司渠道', dataIndex: 'channelName', width: 160 },
              { title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 190 },
              { title: '出库时间', dataIndex: 'outboundAt', width: 170, render: (value?: string) => (value ? formatBeijingDateTime(value) : '-') },
              { title: '操作人', dataIndex: 'outboundBy', width: 100, render: (value?: string) => value || '-' },
              { title: '状态', dataIndex: 'status', width: 130, render: (value: string) => <Tag color="blue">{value}</Tag> }
            ]}
            dataSource={warehouseOutboundedRows}
            size="small"
            pagination={tenRowTablePagination}
            columnSettingsPlacement="toolbar"
            scroll={{ x: 1450 }}
            locale={{ emptyText: '暂无已出库订单。' }}
          />
        </Space>
      </Card>
      ) : null}
      </ModuleSubWorkspace>

      <Drawer
        title={selectedTallyTaskDetails[0]?.status === 'PENDING' ? '未完成理货任务详情' : '理货历史详情'}
        open={selectedTallyTaskDetails.length > 0}
        onClose={() => {
          tallyTaskDetailRequestRef.current += 1;
          setSelectedTallyTaskDetails([]);
          setSelectedTallySourcePackages(undefined);
          setTallySourcePackagesLoading(false);
          setTallySourcePackagesError(undefined);
        }}
        width="min(1180px, calc(100vw - 32px))"
      >
        <WarehouseTallyHistoryChain
          tasks={selectedTallyTaskDetails}
          sourcePackages={selectedTallySourcePackages}
          sourcePackagesLoading={tallySourcePackagesLoading}
          sourcePackagesError={tallySourcePackagesError}
          canCorrectHistoricalAggregate={canTallyHistoryCorrect}
          correctionLoading={tallyCorrectionLoading}
          onCorrectHistoricalAggregate={(task) => void openHistoricalAggregateCorrection(task)}
        />
      </Drawer>

      <Modal
        title="纠正历史聚合理货数据"
        open={Boolean(tallyCorrectionTask && tallyCorrectionPreview)}
        width={820}
        okText="确认拆分并归档旧数据"
        cancelText="取消"
        confirmLoading={tallyCorrectionLoading}
        okButtonProps={{ disabled: !tallyCorrectionConfirmed }}
        onOk={() => void confirmHistoricalAggregateCorrection()}
        onCancel={() => {
          if (tallyCorrectionLoading) return;
          setTallyCorrectionTask(null);
          setTallyCorrectionPreview(null);
          setTallyCorrectionConfirmed(false);
        }}
      >
        {tallyCorrectionPreview ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="warning"
              showIcon
              message={`将旧聚合记录拆成 ${tallyCorrectionPreview.expectedPackageCount} 条真实包裹记录`}
              description="旧聚合记录只归档、不删除；原始设备扫描记录保持不变。完成后旧条码停止入库，新包裹使用独立标签，需重新打印。"
            />
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="理货任务号">{tallyCorrectionPreview.taskNo}</Descriptions.Item>
              <Descriptions.Item label="旧聚合标签">{tallyCorrectionPreview.legacyPackageNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="旧记录件数">{tallyCorrectionPreview.expectedPackageCount} 件</Descriptions.Item>
              <Descriptions.Item label="有效扫描">{tallyCorrectionPreview.scans.length} 条</Descriptions.Item>
            </Descriptions>
            <ManagedTable<WarehouseTallyHistoricalAggregateScanSummary>
              aria-label="历史聚合理货有效扫描"
              rowKey="sampleId"
              dataSource={tallyCorrectionPreview.scans}
              size="small"
              pagination={false}
              columnSettings={false}
              recordDetail={false}
              resizableColumns={false}
              minimumScrollX={720}
              scroll={{ x: 720 }}
              columns={[
                { title: '件序', width: 70, render: (_value, _row, index) => `${index + 1}/${tallyCorrectionPreview.expectedPackageCount}` },
                { title: '实重', dataIndex: 'weightKg', width: 90, align: 'right', render: (value: number) => `${value.toFixed(2)} KG` },
                { title: '尺寸 cm', width: 130, render: (_, row) => `${row.lengthCm}×${row.widthCm}×${row.heightCm}` },
                { title: '设备号', dataIndex: 'deviceNo', width: 120, render: (value?: string) => value || '-' },
                { title: '设备结果', dataIndex: 'result', width: 100, render: (value: 'SUCCESS' | 'FAILED') => value === 'SUCCESS' ? <Tag color="success">已入库</Tag> : <Tag color="warning">冲突保留</Tag> },
                { title: '扫描时间', dataIndex: 'receivedAt', width: 170, render: (value: string) => formatBeijingDateTime(value) }
              ]}
            />
            <Checkbox checked={tallyCorrectionConfirmed} onChange={(event) => setTallyCorrectionConfirmed(event.target.checked)}>
              我已逐行核对：以上每条扫描数据分别对应一个不同的实体包裹，不是同一包裹的重复扫描。
            </Checkbox>
          </Space>
        ) : null}
      </Modal>

      <Modal
        title="修改报关"
        open={Boolean(declarationEditShipment)}
        onCancel={() => {
          if (!declarationEditSubmitting) setDeclarationEditShipment(null);
        }}
        onOk={() => void saveWarehouseDeclarationEdit()}
        okText="保存修改"
        cancelText="取消"
        confirmLoading={declarationEditSubmitting}
        cancelButtonProps={{ disabled: declarationEditSubmitting }}
        closable={!declarationEditSubmitting}
        maskClosable={!declarationEditSubmitting}
        width={380}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">
            {declarationEditShipment?.systemOrderNo} 当前：{declarationEditShipment?.declarationRequired ? '报关' : '不报关'}
          </Text>
          <Radio.Group
            value={declarationEditValue}
            onChange={(event) => setDeclarationEditValue(event.target.value === true)}
          >
            <Space direction="vertical">
              <Radio value={true}>报关</Radio>
              <Radio value={false}>不报关</Radio>
            </Space>
          </Radio.Group>
        </Space>
      </Modal>

      <Modal
        title={editingCompletedTallyTask ? `反审核理货任务 · ${editingCompletedTallyTask.taskNo}` : '反审核理货任务'}
        open={Boolean(editingCompletedTallyTask)}
        onCancel={() => {
          if (!editingCompletedTallySubmitting) setEditingCompletedTallyTask(null);
        }}
        onOk={() => void updateCompletedTallyCount()}
        okText="确认反审核"
        cancelText="取消"
        confirmLoading={editingCompletedTallySubmitting}
        cancelButtonProps={{ disabled: editingCompletedTallySubmitting }}
        closable={!editingCompletedTallySubmitting}
        maskClosable={!editingCompletedTallySubmitting}
        width={520}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="已完成理货不允许直接修改件数"
          />
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="理货任务号">{editingCompletedTallyTask?.taskNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="理货后件数">{editingCompletedTallyTask?.completedPackageCount ?? '-'} 件</Descriptions.Item>
          </Descriptions>
        </Space>
      </Modal>

      <Modal
        title="代理交接单"
        open={batchHandoverOpen}
        onCancel={() => {
          setBatchHandoverOpen(false);
          setBatchHandoverRemark('');
          setBatchHandoverPrintOrientation('landscape');
        }}
        width={1180}
        footer={[
          <Button key="cancel" onClick={() => {
            setBatchHandoverOpen(false);
            setBatchHandoverRemark('');
            setBatchHandoverPrintOrientation('landscape');
          }}>取消</Button>,
          <Button
            key="print"
            type="primary"
            aria-label="打印"
            loading={batchDispatching}
            onClick={() => void printSelectedWarehouseHandover()}
          >
            打印
          </Button>
        ]}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={`已选择 ${selectedWarehouseQueueHandoverRows.length} 个待出库订单，按代理/渠道拆成 ${selectedWarehouseQueueHandoverGroups.length} 张交接单。`}
            description="交接单已按系统订单数据自动填写。点击打印只留存交接单，订单仍保留在待出库。"
          />
          <div className="warehouse-agent-handover-print-setting">
            <span>纸张方向</span>
            <Segmented<WarehouseHandoverPrintOrientation>
              value={batchHandoverPrintOrientation}
              onChange={(value) => setBatchHandoverPrintOrientation(value)}
              options={[
                { label: '横向（推荐）', value: 'landscape' },
                { label: '竖向', value: 'portrait' }
              ]}
            />
            <Text type="secondary">横向适合 7 列完整显示；竖向会自动缩小字体并保留全部字段。</Text>
          </div>
          <div className="warehouse-agent-handover-remark-editor">
            <label htmlFor="warehouse-handover-remark">交接备注（本次打印）</label>
            <Input.TextArea
              id="warehouse-handover-remark"
              value={batchHandoverRemark}
              onChange={(event) => setBatchHandoverRemark(event.target.value)}
              placeholder="需要交接人注意的事项可填写在这里，将显示在每张交接单的“交接备注”行。"
              autoSize={{ minRows: 2, maxRows: 4 }}
              maxLength={120}
              showCount
            />
          </div>
          {selectedWarehouseQueueRequiresShippingMark && canShippingMarkConfirm ? (
            <Checkbox
              checked={batchShippingMarkConfirmed}
              onChange={(event) => setBatchShippingMarkConfirmed(event.target.checked)}
            >
              已确认所选需贴唛头订单均已贴好唛头
            </Checkbox>
          ) : null}
          {selectedWarehouseQueueRequiresShippingMark && !canShippingMarkConfirm ? (
            <Alert type="warning" showIcon message="当前角色没有确认贴唛头权限，不能处理需贴唛头订单。" />
          ) : null}
          {selectedWarehouseQueueHandoverGroups.map(({ groupName, rows }) => (
            <div key={groupName} className="warehouse-agent-handover-preview">
              <div className="warehouse-agent-handover-company">深圳思远国际货运代理有限公司</div>
              <div className="warehouse-agent-handover-meta">
                <div className="warehouse-agent-handover-label">代理</div>
                <div className="warehouse-agent-handover-value">{groupName}</div>
                <div className="warehouse-agent-handover-label">出货时间</div>
                <div className="warehouse-agent-handover-value">{formatBeijingDateTime(new Date().toISOString())}</div>
              </div>
              <table className="warehouse-agent-handover-table">
                <thead>
                  <tr>
                    <th>出货单号</th>
                    <th>入仓号</th>
                    <th>渠道</th>
                    <th>品名</th>
                    <th>件数</th>
                    <th>是否<br />报关退税</th>
                    <th>目的地</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.waybillNo}</td>
                      <td>{row.warehouseEntryNo}</td>
                      <td>{getWarehouseHandoverTemplateChannel(row)}</td>
                      <td>{row.cargoName}</td>
                      <td>{row.packageCount}</td>
                      <td><ShipmentRiskFlag value={row.customsRefundText} /></td>
                      <td>{row.destinationCountry}</td>
                    </tr>
                  ))}
                  <tr>
                    <th>票数</th>
                    <td colSpan={3}>{rows.length}</td>
                    <th>件数</th>
                    <td colSpan={3}>{rows.reduce((sum, row) => sum + row.packageCount, 0)}</td>
                  </tr>
                  <tr>
                    <td colSpan={7} className="warehouse-agent-handover-receiver">收件人：</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </Space>
      </Modal>

      <Modal
        title="添加异常"
        open={exceptionModalOpen}
        onCancel={() => {
          setExceptionModalOpen(false);
          setExceptionDraft('');
        }}
        onOk={() => void addTodayManualException()}
        okText="确认添加异常"
        cancelText="取消"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">已选择 {selectedTodayPackageIds.length} 个包裹。清空内容并确认时，只清除人工异常，系统异常仍会保留。</Text>
          <Input.TextArea
            aria-label="异常内容"
            rows={4}
            placeholder="例如包装破损、外箱潮湿、尺寸需复核"
            value={exceptionDraft}
            onChange={(event) => setExceptionDraft(event.target.value)}
          />
        </Space>
      </Modal>
      <Modal
        title="修改入仓包裹"
        open={Boolean(editingPackage && packageEditDraft)}
        onCancel={() => {
          if (!savingPackageEdit) closeWarehousePackageEdit();
        }}
        onOk={() => void saveWarehousePackageEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={savingPackageEdit}
        closable={!savingPackageEdit}
        keyboard={!savingPackageEdit}
        maskClosable={!savingPackageEdit}
        cancelButtonProps={{ disabled: savingPackageEdit }}
        width={760}
        destroyOnHidden
      >
        {editingPackage && packageEditDraft ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`正在修改 ${editingPackage.combinedOrderNo}`}
              description="可同时修改入仓基础数据和补录同箱规记录；不改变理货、录单、出库或财务流程。"
            />
            {sameSpecRequestAttempted ? (
              <Alert
                type="warning"
                showIcon
                message="上次补录结果待确认"
                description="输入已锁定，请直接点击保存，系统将使用同一请求号安全重试。"
              />
            ) : null}
            <div>
              <Text strong>基础信息</Text>
              <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
                <Col xs={24} md={8}>
                  <Text strong>客户编号</Text>
                  <Input aria-label="修改客户编号" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} value={packageEditDraft.customerCode} onChange={(event) => patchPackageEditCustomerCode(event.target.value)} />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>快递单号</Text>
                  <Input aria-label="修改快递单号" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} value={packageEditDraft.domesticTrackingNo} onChange={(event) => patchPackageEditTrackingNo(event.target.value)} />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>客户编号-快递单号</Text>
                  <Input aria-label="修改客户编号-快递单号" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} value={packageEditDraft.combinedOrderNo} onChange={(event) => patchPackageEditCombinedOrderNo(event.target.value)} />
                </Col>
                {canInStockSameSpecReplenish ? (
                  <Col xs={12} md={8}>
                    <Text strong>同箱规补录</Text>
                    <InputNumber
                      aria-label="同箱规补录箱数"
                      min={0}
                      max={500}
                      precision={0}
                      value={sameSpecSupplementCount}
                      disabled={!canReplenishWarehouseSameSpec(editingPackage) || savingPackageEdit || sameSpecRequestAttempted}
                      onChange={(value) => updateSameSpecSupplementCount(Number(value ?? 0))}
                      placeholder="填写新增箱数"
                      style={{ width: '100%' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {canReplenishWarehouseSameSpec(editingPackage)
                        ? `将新增 ${sameSpecSupplementCount || 0} 条、每条 1 件；原记录不变`
                        : '仅支持未理货、未录单的原始过机记录'}
                    </Text>
                  </Col>
                ) : null}
                <Col xs={12} md={8}>
                  <Text strong>件序号</Text>
                  <InputNumber aria-label="修改件序号" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} min={1} precision={0} value={packageEditDraft.packageIndex} onChange={(value) => patchPackageEditDraft({ packageIndex: Number(value) || 1 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>扫描时间</Text>
                  <Input aria-label="修改扫描时间" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} type="datetime-local" value={packageEditDraft.scanTime} onChange={(event) => patchPackageEditDraft({ scanTime: event.target.value })} />
                </Col>
              </Row>
            </div>

            <div>
              <Text strong>件重尺</Text>
              <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
                <Col xs={12} md={6}>
                  <Text strong>单件实重</Text>
                  <InputNumber aria-label="修改单件实重" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} min={0} precision={2} value={packageEditDraft.weightKg} onChange={(value) => patchPackageEditDraft({ weightKg: Number(value) || 0 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={12} md={4}>
                  <Text strong>长 cm</Text>
                  <InputNumber aria-label="修改长 cm" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} min={0} precision={1} value={packageEditDraft.lengthCm} onChange={(value) => patchPackageEditDraft({ lengthCm: Number(value) || 0 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={12} md={4}>
                  <Text strong>宽 cm</Text>
                  <InputNumber aria-label="修改宽 cm" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} min={0} precision={1} value={packageEditDraft.widthCm} onChange={(value) => patchPackageEditDraft({ widthCm: Number(value) || 0 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={12} md={4}>
                  <Text strong>高 cm</Text>
                  <InputNumber aria-label="修改高 cm" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} min={0} precision={1} value={packageEditDraft.heightCm} onChange={(value) => patchPackageEditDraft({ heightCm: Number(value) || 0 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={12} md={6}>
                  <Text strong>件数</Text>
                  <InputNumber aria-label="修改件数" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} min={1} precision={0} value={packageEditDraft.packageCount} onChange={(value) => patchPackageEditDraft({ packageCount: Number(value) || 1 })} style={{ width: '100%' }} />
                </Col>
              </Row>
              {packageEditMetrics ? (
                <Space wrap style={{ marginTop: 12 }}>
                  <Tag color="cyan">体积 {packageEditMetrics.cbm.toFixed(3)} CBM</Tag>
                  <Tag color="blue">5000材积 {calculateWarehouseVolumetricWeight(packageEditDraft, 5000).toFixed(2)} KG</Tag>
                  <Tag color="purple">6000材积 {calculateWarehouseVolumetricWeight(packageEditDraft, 6000).toFixed(2)} KG</Tag>
                </Space>
              ) : null}
            </div>

            <div>
              <Text strong>备注异常</Text>
              <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
                <Col xs={24} md={12}>
                  <Text strong>备注</Text>
                  <Input.TextArea aria-label="修改备注" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} rows={3} value={packageEditDraft.remark} onChange={(event) => patchPackageEditDraft({ remark: event.target.value })} />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>人工异常</Text>
                  <Input.TextArea aria-label="修改人工异常" disabled={!canInStockUpdate || savingPackageEdit || sameSpecRequestAttempted} rows={3} value={packageEditDraft.manualException} onChange={(event) => patchPackageEditDraft({ manualException: event.target.value })} />
                </Col>
              </Row>
            </div>
          </Space>
        ) : null}
      </Modal>
      <Modal
        title="理货明细"
        open={Boolean(selectedConsolidation)}
        onCancel={() => setSelectedConsolidationId(null)}
        footer={null}
        width={1100}
      >
        {selectedConsolidation ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`${selectedConsolidation.outboundOrderNo}：${formatWarehouseConsolidationMode(selectedConsolidation.mode)}，${selectedConsolidation.totalPackages} 个原始包裹，计费重 ${selectedConsolidation.totalChargeableWeightKg.toFixed(2)} KG`}
            />
            <ManagedTable<WarehouseInboundPackage>
              recordDetail={false}
              rowKey="id"
              columns={warehousePackageColumns}
              dataSource={selectedConsolidationPackages}
              size="small"
              pagination={paginationWhenNeeded(selectedConsolidationPackages.length)}
              sticky={false}
              resizableColumns={false}
              columnSettings={false}
              scroll={{ x: 1280 }}
            />
          </Space>
        ) : null}
      </Modal>
      <WarehouseCreateTallyModal
        open={Boolean(tallyTaskPackageIds.length)}
        selectedCount={tallyTaskPackageIds.length}
        requirement={tallyRequirementDraft}
        onRequirementChange={setTallyRequirementDraft}
        onCancel={() => {
          setTallyTaskPackageIds([]);
          setTallyRequirementDraft('');
        }}
        onConfirm={() => void createWarehouseTallyTask()}
      />
      <Modal
        title={editingTallyTask ? `修改理货任务 ${editingTallyTask.taskNo}` : '修改理货任务'}
        open={Boolean(editingTallyTask)}
        onCancel={closeEditTallyTask}
        onOk={() => void updatePendingTallyTask()}
        okText="保存修改"
        cancelText="取消"
        confirmLoading={editingTallySubmitting}
        cancelButtonProps={{ disabled: editingTallySubmitting }}
        closable={!editingTallySubmitting}
        maskClosable={!editingTallySubmitting}
        width={720}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={`当前选择 ${editingTallyPackageIds.length} 个箱规记录`}
            description="可补选遗漏箱规或移除误选箱规；保存后系统会重新汇总件数、重量和材积。"
          />
          <div>
            <Text strong>原始在仓包裹</Text>
            <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8, padding: 10, border: '1px solid #d9e2f2', borderRadius: 8 }}>
              <Checkbox.Group
                value={editingTallyPackageIds}
                onChange={(values) => setEditingTallyPackageIds(values.map(String))}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {editingTallyPackageOptions.map((pkg) => (
                    <Checkbox key={pkg.id} value={pkg.id}>
                      {formatWarehousePackageNo(pkg)} · {pkg.combinedOrderNo} · {pkg.packageCount} 件 · {pkg.weightKg.toFixed(2)} KG
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </div>
          </div>
          <div>
            <Text strong>理货需求</Text>
            <Input.TextArea aria-label="修改理货需求" rows={3} value={editingTallyRequirement} onChange={(event) => setEditingTallyRequirement(event.target.value)} />
          </div>
          <div>
            <Text strong>备注</Text>
            <Input.TextArea aria-label="修改理货备注" rows={2} value={editingTallyRemark} onChange={(event) => setEditingTallyRemark(event.target.value)} />
          </div>
        </Space>
      </Modal>
      <Modal
        title="取消理货任务"
        open={Boolean(cancellingTallyTask)}
        onCancel={() => {
          if (!cancellingTallySubmitting) setCancellingTallyTask(null);
        }}
        onOk={() => void cancelPendingTallyTask()}
        okText="确认取消任务"
        cancelText="返回"
        okButtonProps={{ danger: true }}
        confirmLoading={cancellingTallySubmitting}
        cancelButtonProps={{ disabled: cancellingTallySubmitting }}
        closable={!cancellingTallySubmitting}
        maskClosable={!cancellingTallySubmitting}
      >
        <Alert
          type="warning"
          showIcon
          message={cancellingTallyTask ? `确认取消理货任务 ${cancellingTallyTask.taskNo}？` : '确认取消理货任务？'}
          description="任务和操作记录会保留，不会删除原包裹；取消后原包裹可重新发起理货。已完成的理货任务不能取消。"
        />
      </Modal>
      <WarehouseCompleteTallyModal
        open={Boolean(completingTallyTask)}
        taskNo={completingTallyTask?.taskNo}
        sourceItems={tallySourceItems}
        error={tallyCompleteError}
        submitting={tallyCompleteSubmitting}
        mode={tallyProcessMode}
        selectedSourceIds={tallyProcessSourceIds}
        splitPieces={tallySplitPieces}
        draft={tallyCompleteDraft}
        onCancel={() => {
          if (tallyCompleteSubmittingRef.current) return;
          setCompletingTallyTask(null);
          setTallyCompleteError(null);
        }}
        onConfirm={() => void completeWarehouseTallyTask()}
        onModeChange={(mode) => {
          setTallyProcessMode(mode);
          setTallyProcessSourceIds([]);
        }}
        onSourceIdsChange={setTallyProcessSourceIds}
        onSplitPiecesChange={setTallySplitPieces}
        onDraftChange={(patch) => setTallyCompleteDraft((current) => ({ ...current, ...patch }))}
      />
      <Modal
        title="拆分入库箱"
        open={Boolean(splittingPackage)}
        onCancel={() => setSplittingPackage(null)}
        onOk={() => void splitSelectedWarehousePackage()}
        okText="确认拆分"
        cancelText="取消"
        okButtonProps={{
          disabled: Boolean(splittingPackage && validateWarehouseSplitPieces(
            splitDraft.pieces,
            splitDraft.splitCount
          ))
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={splittingPackage ? `来源箱：${splittingPackage.combinedOrderNo}` : '请选择要拆分的入库箱'}
          />
          <WarehouseSplitTicketFields
            splitCount={splitDraft.splitCount}
            pieces={splitDraft.pieces}
            totalPieces={splittingPackage?.packageCount ?? 0}
            onSplitCountChange={(nextCount) => setSplitDraft((current) => ({
              ...current,
              splitCount: nextCount,
              pieces: resizeWarehouseSplitPieces(current.pieces, nextCount)
            }))}
            onPieceChange={(index, piece) => setSplitDraft((current) => ({
              ...current,
              pieces: current.pieces.map((currentPiece, pieceIndex) => (
                pieceIndex === index ? piece : currentPiece
              ))
            }))}
          />
          <div>
            <Text strong>拆分备注</Text>
            <Input
              aria-label="拆分备注"
              placeholder="例如拆成 2 箱便于理货"
              value={splitDraft.remark}
              onChange={(event) => setSplitDraft((current) => ({ ...current, remark: event.target.value }))}
            />
          </div>
        </Space>
      </Modal>
      <WarehouseMachineImportModal
        open={machineImportOpen}
        apiClient={apiClient}
        onClose={() => setMachineImportOpen(false)}
        onImported={handleWarehouseMachineImported}
      />
    </AppPage>
  );
}

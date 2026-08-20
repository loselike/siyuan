import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, App as AntdApp, AutoComplete, Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Segmented, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import { Activity, Boxes, ClipboardCheck, FileInput, RotateCcw, Sparkles } from 'lucide-react';
import {
  createFulfillmentAdvice,
  type FinanceBillingUnit,
  type FinanceCatalogItemSummary,
  shipmentStatusLabels,
  type BusinessCostAuditSummary,
  type PayableAuditSummary,
  type ShipmentFinanceDetailSummary,
  type ShipmentAgentReplacementAuditSummary,
  type ShipmentAgentReplacementInput,
  type ShipmentAgentReplacementPreview,
  type MasterDataSnapshot,
  type Shipment,
  type ShipmentStatus
} from '@siyuan/shared';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { createPendingRoutingColumns } from '../shared/pendingRoutingColumns';
import { getGlobalFieldMaskVisibility } from '../shared/globalFieldMask';
import { downloadCsv } from '../finance/exportCsv';
import { createRoutingFeeNameOptions } from './routingFeeCatalog';
import { getRoutingAgentShortName } from './routingAgentDisplay';
import { formatRoutingFeeStatus } from './routingFeeStatus';
import { selectRecentRoutedShipmentHistory, selectRoutedShipmentHistory } from './routingHistory';
import { getRoutingPeriodSnapshot, type RoutingDataPeriod } from './routingPeriod';
import { emptyRoutedShipmentFilters, filterRoutedShipments, type RoutedShipmentFilters } from './routingRoutedFilters';
import { getRoutedPayableDisplay } from './routedPayableDisplay';
import { AppActionGroup, AppDateRangePicker, AppPageHeader, ManagedTable, MetricCard, RoutingStatusTag, StatusTag, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import { formatBeijingDateTime, getBeijingDayStartTimestamp } from '../shared/format';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';
import type { PermissionKey } from '../../apiClient';

const { Text } = Typography;

const agentReplacementAllowedStatuses = new Set<ShipmentStatus>(['OUTBOUNDED']);

function calculateCostAmount(chargeWeightKg?: number, unitPrice?: number, fallback?: number) {
  const weight = Number(chargeWeightKg);
  const price = Number(unitPrice);
  if (Number.isFinite(weight) && Number.isFinite(price) && weight >= 0 && price >= 0
    && chargeWeightKg !== undefined && chargeWeightKg !== null
    && unitPrice !== undefined && unitPrice !== null) {
    return Number((weight * price).toFixed(2));
  }
  return fallback;
}

export type RoutingStageKey = 'all' | 'sorting' | 'dispatching';

export interface RoutingAssignmentFormValues {
  destinationCountry?: string;
  agentId?: string;
  manualAgentName?: string;
  channelId?: string;
  manualChannelName?: string;
  agentChannelName?: string;
  shippingMarkRequired?: boolean;
  warehouseOutboundRemark?: string;
  saveAgentChannelToMasterData?: boolean;
}

export interface RoutingPageConfig {
  title: string;
  description: string;
  capabilities: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
}

type MarketStatRow = { name: string; count: number };
type MarketStatusTone = 'amber' | 'blue' | 'green' | 'red' | 'indigo' | 'gray';
type MarketStatusAction = {
  label: string;
  value: number;
  helper: string;
  tone: MarketStatusTone;
  sectionKey: string;
};
type MarketStatusGroup = {
  title: string;
  description: string;
  tone: MarketStatusTone;
  icon: ReactNode;
  actions: MarketStatusAction[];
};
type PendingRoutingFilters = {
  salesperson: string;
  customerCode: string;
  systemOrderNo: string;
};

const emptyPendingRoutingFilters: PendingRoutingFilters = {
  salesperson: '',
  customerCode: '',
  systemOrderNo: ''
};

function matchesRoutingFilter(value: string | undefined, keyword: string) {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  return !normalizedKeyword || (value ?? '').toLocaleLowerCase().includes(normalizedKeyword);
}

export function filterPendingRoutingShipments(shipments: Shipment[], filters: PendingRoutingFilters) {
  return shipments.filter((shipment) => (
    matchesRoutingFilter(shipment.salesperson, filters.salesperson)
    && matchesRoutingFilter(shipment.customerCode, filters.customerCode)
    && (
      matchesRoutingFilter(resolveShipmentOutboundOrderNo(shipment), filters.systemOrderNo)
      || matchesRoutingFilter(shipment.systemOrderNo, filters.systemOrderNo)
    )
  ));
}
type PendingRoutingCostRow = {
  id: string;
  shipmentId: string;
  name: string;
  amount: number;
  currency?: string;
  rmbAmount?: number;
  chargeWeightKg?: number;
  unitPrice?: number;
  billingUnit?: FinanceBillingUnit;
  billingQuantity?: number;
  reconciliationStatus?: string;
  marketEditable?: boolean;
  customerCode?: string;
  systemOrderNo?: string;
  transferNo?: string;
};

type PendingRoutingCostEditor = {
  type: 'BUSINESS_COST' | 'PAYABLE';
  id?: string;
  name: string;
  currency: string;
  billingUnit?: FinanceBillingUnit;
  billingQuantity?: number;
  chargeWeightKg?: number;
  unitPrice?: number;
  amount?: number;
};

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

function formatAgentReplacementAuditValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value !== 'object') return String(value);
  const item = value as Record<string, unknown>;
  if (typeof item.billingQuantity === 'number' && typeof item.unitPrice === 'number') {
    const currency = typeof item.currency === 'string' ? item.currency : 'RMB';
    const unit = item.billingUnit === 'CBM' ? 'CBM' : 'KG';
    const amount = typeof item.amount === 'number' ? item.amount : item.billingQuantity * item.unitPrice;
    return `${String(item.name ?? '费用')} / ${item.billingQuantity} ${unit} × ${item.unitPrice} ${currency} = ${Number(amount).toFixed(2)} ${currency}${item.remark ? ` / ${String(item.remark)}` : ''}`;
  }
  return JSON.stringify(item);
}




export function RoutingPage({
  config,
  notice,
  shipments,
  assignmentShipment,
  assignmentForm,
  masterData,
  feeNameCatalogItems,
  businessCostAudits,
  payableAudits,
  assignmentFinanceDetail,
  permissions,
  isAdministrator,
  onOpenAssignment,
  onApproveRouting,
  onCancelAssignment,
  onConfirmAssignment,
  onRerouteShipment,
  onLoadAgentReplacementPreview,
  onReplaceShipmentAgent,
  onRejectAgentChangeRequest,
  onLoadAgentReplacementHistory,
  onViewRoutingLog,
  onViewPendingRoutingLog,
  onReturnReview,
  onSavePendingRoutingCost,
  onDeletePendingRoutingCost,
  onLoadRoutingReportExportRows,
  onAiAssist,
  aiLoading
}: {
  config: RoutingPageConfig;
  notice?: string | null;
  shipments: Shipment[];
  assignmentShipment: Shipment | null;
  assignmentForm: FormInstance<RoutingAssignmentFormValues>;
  masterData: MasterDataSnapshot;
  feeNameCatalogItems?: FinanceCatalogItemSummary[];
  businessCostAudits?: BusinessCostAuditSummary[];
  payableAudits?: PayableAuditSummary[];
  assignmentFinanceDetail?: ShipmentFinanceDetailSummary;
  permissions: PermissionKey[];
  isAdministrator?: boolean;
  onOpenAssignment: (shipment: Shipment, mode?: 'assign' | 'update' | 'business-cost' | 'payable-cost') => void;
  onApproveRouting: (shipment: Shipment) => Promise<void>;
  onCancelAssignment: () => void;
  onConfirmAssignment: (approve: boolean) => Promise<boolean>;
  onRerouteShipment: (shipment: Shipment, reason: string) => Promise<void>;
  onLoadAgentReplacementPreview: (shipment: Shipment) => Promise<ShipmentAgentReplacementPreview>;
  onReplaceShipmentAgent: (shipment: Shipment, input: ShipmentAgentReplacementInput) => Promise<void>;
  onRejectAgentChangeRequest: (shipment: Shipment, requestId: string, reason: string) => Promise<void>;
  onLoadAgentReplacementHistory: (shipment: Shipment) => Promise<ShipmentAgentReplacementAuditSummary[]>;
  onViewRoutingLog: (shipment: Shipment) => void;
  onViewPendingRoutingLog: (shipment: Shipment) => void;
  onReturnReview: (shipment: Shipment) => Promise<void> | void;
  onSavePendingRoutingCost: (shipment: Shipment, type: 'BUSINESS_COST' | 'PAYABLE', feeId: string | undefined, input: { name: string; currency: string; billingUnit?: FinanceBillingUnit; billingQuantity?: number; chargeWeightKg?: number; unitPrice?: number; amount: number }) => Promise<void>;
  onDeletePendingRoutingCost: (shipment: Shipment, feeId: string) => Promise<void>;
  onLoadRoutingReportExportRows: () => Promise<Shipment[]>;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const { message: messageApi } = AntdApp.useApp();
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = (permission: PermissionKey) => permissionSet.has(permission);
  const fieldVisibility = useMemo(
    () => getGlobalFieldMaskVisibility(isAdministrator ? 'ADMIN' : undefined, permissions),
    [isAdministrator, permissions]
  );
  const canViewDashboard = can('market:dashboard:view');
  const canViewPending = can('market:pending-routing:view');
  const canViewRouted = can('market:routed:view');
  const canViewWeekly = can('market:routing-report:view');
  const routeRequiredMaskActive = !fieldVisibility.showAgentData
    || !fieldVisibility.showAgentShortName
    || !fieldVisibility.showAgentCompanyName
    || !fieldVisibility.showAgentChannel
    || !fieldVisibility.showPayableCost
    || !fieldVisibility.showPayableStatus;
  const canAssign = can('market:pending-routing:route') && !routeRequiredMaskActive;
  const canUpdatePending = can('market:pending-routing:edit') && !routeRequiredMaskActive;
  const canSaveDraft = canAssign || canUpdatePending;
  const canConfirm = can('market:pending-routing:approve') && !routeRequiredMaskActive;
  const canReroute = can('market:routed:reroute');
  const canReplaceAgent = can('market:routed:replace-agent') && !routeRequiredMaskActive;
  const canViewPendingLog = can('market:pending-routing:operation-log:view');
  const canViewRoutedLog = can('market:routed:routing-log:view');
  const canReturnReview = can('market:pending-routing:return-review');
  const canViewBusinessCost = can('market:pending-routing:business-cost:view');
  const canViewPayableCost = can('market:pending-routing:payable-cost:view') && fieldVisibility.showPayableCost;
  const canViewAgentChannel = fieldVisibility.showAgentData
    && fieldVisibility.showAgentShortName
    && fieldVisibility.showAgentCompanyName
    && fieldVisibility.showAgentChannel;
  const canViewRouteCost = (canAssign || canUpdatePending || canViewRouted) && fieldVisibility.showPayableCost;
  const canCreateAgentChannel = canViewAgentChannel && can('master-data:agent-channels:create');
  const routingSubItems = useMemo<ModuleSubNavItem[]>(
    () => [
      canViewDashboard ? { key: 'market-dashboard', label: '市场看板', description: '市场作业总览' } : null,
      canViewPending ? { key: 'pending-routing', label: '待排货', description: '市场排货' } : null,
      canViewRouted ? { key: 'routed', label: '已排货', description: '等待仓库出库' } : null,
      canViewWeekly ? { key: 'weekly-routing', label: '排货数据', description: '周期排货统计' } : null
    ].filter(Boolean) as ModuleSubNavItem[],
    [canViewDashboard, canViewPending, canViewRouted, canViewWeekly]
  );
  const [activeSection, setActiveSection] = useState(() => routingSubItems[0]?.key ?? 'market-dashboard');
  const [businessClock, setBusinessClock] = useState(() => Date.now());
  const [routingDataPeriod, setRoutingDataPeriod] = useState<RoutingDataPeriod>('week');
  const [rerouteShipment, setRerouteShipment] = useState<Shipment | null>(null);
  const [agentReplacementShipment, setAgentReplacementShipment] = useState<Shipment | null>(null);
  const [agentReplacementPreview, setAgentReplacementPreview] = useState<ShipmentAgentReplacementPreview | null>(null);
  const [agentReplacementLoading, setAgentReplacementLoading] = useState(false);
  const [agentReplacementSubmitting, setAgentReplacementSubmitting] = useState(false);
  const [agentReplacementHistoryShipment, setAgentReplacementHistoryShipment] = useState<Shipment | null>(null);
  const [agentReplacementHistory, setAgentReplacementHistory] = useState<ShipmentAgentReplacementAuditSummary[]>([]);
  const [agentReplacementHistoryLoading, setAgentReplacementHistoryLoading] = useState(false);
  const [routingReportExporting, setRoutingReportExporting] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [rerouteForm] = Form.useForm<{ reason?: string }>();
  const [agentReplacementForm] = Form.useForm<ShipmentAgentReplacementInput>();
  const [costEditor, setCostEditor] = useState<PendingRoutingCostEditor | null>(null);
  const [costSaving, setCostSaving] = useState(false);
  const [pendingFilterDraft, setPendingFilterDraft] = useState<PendingRoutingFilters>(emptyPendingRoutingFilters);
  const [pendingFilters, setPendingFilters] = useState<PendingRoutingFilters>(emptyPendingRoutingFilters);
  const [pendingPagination, setPendingPagination] = useState({ current: 1, pageSize: 10 });
  const [routedFilterDraft, setRoutedFilterDraft] = useState<RoutedShipmentFilters>(emptyRoutedShipmentFilters);
  const [routedFilters, setRoutedFilters] = useState<RoutedShipmentFilters>(emptyRoutedShipmentFilters);
  const [routedPagination, setRoutedPagination] = useState({ current: 1, pageSize: 10 });
  const [routedView, setRoutedView] = useState<'recent' | 'history'>('recent');
  const watchedAgentId = Form.useWatch('agentId', assignmentForm);
  const watchedReplacementAgentId = Form.useWatch('agentId', agentReplacementForm);
  const feeNameOptions = useMemo(() => createRoutingFeeNameOptions(feeNameCatalogItems ?? []), [feeNameCatalogItems]);

  useEffect(() => {
    if (!routingSubItems.some((item) => item.key === activeSection)) {
      setActiveSection(routingSubItems[0].key);
    }
  }, [activeSection, routingSubItems]);

  useEffect(() => {
    const timer = window.setInterval(() => setBusinessClock(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  function openAssignment(shipment: Shipment, mode: 'assign' | 'update' | 'business-cost' | 'payable-cost') {
    if (mode !== 'business-cost' && mode !== 'payable-cost' && !canViewAgentChannel) {
      messageApi.warning('代理字段已按权限屏蔽，当前账号不能进行排货分配。');
      return;
    }
    onOpenAssignment(shipment, mode);
  }

  async function openAgentReplacement(shipment: Shipment) {
    setAgentReplacementShipment(shipment);
    setAgentReplacementPreview(null);
    setAgentReplacementLoading(true);
    agentReplacementForm.resetFields();
    try {
      const preview = await onLoadAgentReplacementPreview(shipment);
      setAgentReplacementPreview(preview);
      agentReplacementForm.setFieldsValue({
        requestId: preview.request.id,
        agentId: preview.agentId,
        agentChannelId: preview.agentChannelId,
        agentChannelName: preview.agentChannelName ?? '',
        resolutionNote: '',
        payables: preview.payables.map((payable) => ({
          id: payable.id,
          name: payable.name,
          currency: payable.currency === 'USD' ? 'USD' : 'RMB',
          billingUnit: payable.billingUnit ?? 'KG',
          billingQuantity: payable.billingQuantity ?? payable.chargeWeightKg ?? 0,
          unitPrice: payable.unitPrice,
          remark: payable.remark
        }))
      });
    } catch (error) {
      setAgentReplacementShipment(null);
      messageApi.error(error instanceof Error ? error.message : '更换代理资料加载失败');
    } finally {
      setAgentReplacementLoading(false);
    }
  }

  function closeAgentReplacement() {
    if (agentReplacementSubmitting) return;
    setAgentReplacementShipment(null);
    setAgentReplacementPreview(null);
    agentReplacementForm.resetFields();
  }

  async function submitAgentReplacement() {
    if (!agentReplacementShipment || agentReplacementPreview?.paymentState === 'PAYMENT_BLOCKED') return;
    try {
      const values = await agentReplacementForm.validateFields();
      setAgentReplacementSubmitting(true);
      await onReplaceShipmentAgent(agentReplacementShipment, {
        ...values,
        agentChannelName: values.agentChannelName.trim(),
        resolutionNote: values.resolutionNote.trim(),
        payables: values.payables.map((payable) => ({
          ...payable,
          name: payable.name.trim(),
          remark: payable.remark?.trim() || undefined
        }))
      });
      setAgentReplacementSubmitting(false);
      closeAgentReplacement();
    } catch (error) {
      if (error instanceof Error) messageApi.error(error.message);
      setAgentReplacementSubmitting(false);
    }
  }

  async function rejectAgentChangeRequest() {
    if (!agentReplacementShipment || !agentReplacementPreview) return;
    const resolutionNote = agentReplacementForm.getFieldValue('resolutionNote')?.trim();
    if (!resolutionNote) {
      agentReplacementForm.setFields([{ name: 'resolutionNote', errors: ['请填写市场处理备注'] }]);
      return;
    }
    try {
      setAgentReplacementSubmitting(true);
      await onRejectAgentChangeRequest(agentReplacementShipment, agentReplacementPreview.request.id, resolutionNote);
      setAgentReplacementSubmitting(false);
      closeAgentReplacement();
    } catch (error) {
      if (error instanceof Error) messageApi.error(error.message);
      setAgentReplacementSubmitting(false);
    }
  }

  async function openAgentReplacementHistory(shipment: Shipment) {
    setAgentReplacementHistoryShipment(shipment);
    setAgentReplacementHistory([]);
    setAgentReplacementHistoryLoading(true);
    try {
      setAgentReplacementHistory(await onLoadAgentReplacementHistory(shipment));
    } catch (error) {
      setAgentReplacementHistoryShipment(null);
      messageApi.error(error instanceof Error ? error.message : '更换代理记录加载失败');
    } finally {
      setAgentReplacementHistoryLoading(false);
    }
  }

  const submitAssignment = async (approve: boolean) => {
    if (costEditor) {
      messageApi.warning('请先保存或取消正在编辑的费用明细。');
      return false;
    }
    try {
      const values = await assignmentForm.validateFields();
      if (!values.agentId) {
        messageApi.warning('请先在基本信息选择代理。');
        return false;
      }
    } catch {
      messageApi.warning('请先在基本信息补齐国家、代理和代理渠道。');
      return false;
    }

    setAssignmentSubmitting(true);
    try {
      return await onConfirmAssignment(approve);
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const pendingShipments = useMemo(() => shipments.filter((shipment) => shipment.status === 'WAITING_SORT'), [shipments]);
  const filteredPendingShipments = useMemo(
    () => filterPendingRoutingShipments(pendingShipments, pendingFilters),
    [pendingFilters, pendingShipments]
  );
  const applyPendingRoutingFilters = () => {
    setPendingFilters({
      salesperson: pendingFilterDraft.salesperson.trim(),
      customerCode: pendingFilterDraft.customerCode.trim(),
      systemOrderNo: pendingFilterDraft.systemOrderNo.trim()
    });
    setPendingPagination((current) => ({ ...current, current: 1 }));
  };
  const resetPendingRoutingFilters = () => {
    setPendingFilterDraft(emptyPendingRoutingFilters);
    setPendingFilters(emptyPendingRoutingFilters);
    setPendingPagination((current) => ({ ...current, current: 1 }));
  };
  const routedShipments = useMemo(() => selectRoutedShipmentHistory(shipments), [shipments]);
  const recentRoutedShipments = useMemo(
    () => selectRecentRoutedShipmentHistory(shipments, businessClock),
    [businessClock, shipments]
  );
  const scopedRoutedShipments = routedView === 'history' ? routedShipments : recentRoutedShipments;
  const filteredRoutedShipments = useMemo(
    () => filterRoutedShipments(scopedRoutedShipments, masterData.agents, routedFilters),
    [masterData.agents, routedFilters, scopedRoutedShipments]
  );
  const routedAgentShortNameOptions = useMemo(
    () => [...new Set(scopedRoutedShipments
      .map((shipment) => getRoutingAgentShortName(shipment, masterData.agents))
      .filter((shortName) => shortName !== '-'))]
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))
      .map((shortName) => ({ label: shortName, value: shortName })),
    [masterData.agents, scopedRoutedShipments]
  );
  const applyRoutedFilters = () => {
    setRoutedFilters({ ...routedFilterDraft, agentShortName: routedFilterDraft.agentShortName.trim() });
    setRoutedPagination((current) => ({ ...current, current: 1 }));
  };
  const resetRoutedFilters = () => {
    setRoutedFilterDraft(emptyRoutedShipmentFilters);
    setRoutedFilters(emptyRoutedShipmentFilters);
    setRoutedPagination((current) => ({ ...current, current: 1 }));
  };
  const waitingDispatchShipments = useMemo(
    () => routedShipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH'),
    [routedShipments]
  );
  const returnableShipments = useMemo(() => shipments.filter((shipment) => ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(shipment.status)), [shipments]);
  const dayStart = useMemo(() => getBeijingDayStartTimestamp(businessClock), [businessClock]);
  const routingPeriodLabel = routingDataPeriod === 'week' ? '本周' : '本月';
  const periodSnapshot = useMemo(
    () => getRoutingPeriodSnapshot(shipments, routingDataPeriod, businessClock),
    [businessClock, routingDataPeriod, shipments]
  );
  const periodRoutedShipments = periodSnapshot.routedShipments;
  const periodDetailShipments = useMemo(
    () => [...periodRoutedShipments, ...returnableShipments.filter((item) => !periodRoutedShipments.some((row) => row.id === item.id))],
    [periodRoutedShipments, returnableShipments]
  );
  const todayRoutedShipments = useMemo(
    () => shipments.filter((shipment) => shipment.routedAt && new Date(shipment.routedAt).getTime() >= dayStart),
    [shipments, dayStart]
  );
  const todayOutboundShipments = useMemo(
    () => shipments.filter((shipment) => shipment.outboundAt && new Date(shipment.outboundAt).getTime() >= dayStart),
    [shipments, dayStart]
  );
  const periodOutboundShipments = periodSnapshot.outboundShipments;
  const reroutedInPeriod = periodSnapshot.reroutedShipments;
  const periodAgentStats = useMemo(
    () => summarizeTop(periodRoutedShipments.map((shipment) => shipment.agentName || '未分配')),
    [periodRoutedShipments]
  );
  const periodChannelModeStats = useMemo(
    () => summarizeTop(periodRoutedShipments.map(inferRoutingMode), 3),
    [periodRoutedShipments]
  );
  const periodSensitiveCount = periodSnapshot.sensitiveCount;
  const periodDeclaredCount = periodSnapshot.declaredCount;

  async function exportRoutingReport() {
    setRoutingReportExporting(true);
    try {
      const rows = await onLoadRoutingReportExportRows();
      const headers = [
        { key: 'routedAt', label: '排货时间' },
        { key: 'site', label: '站点' },
        { key: 'salesperson', label: '业务员' },
        { key: 'customerCode', label: '客户编号' },
        { key: 'customerName', label: '客户' },
        { key: 'systemOrderNo', label: '出货单号' },
        { key: 'transferNo', label: '转单号' },
        { key: 'cargo', label: '货物数据' },
        { key: 'destinationCountry', label: '目的地' },
        ...(canViewAgentChannel ? [
          { key: 'agentName', label: '代理' },
          { key: 'routeAgentChannelName', label: '代理渠道' }
        ] : []),
        { key: 'status', label: '状态' }
      ];
      downloadCsv(
        `排货数据-${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows.map((shipment) => ({
          ...shipment,
          routedAt: shipment.routedAt ? new Date(shipment.routedAt).toLocaleString('zh-CN', { hour12: false }) : '',
          customerCode: shipment.customerCode || shipment.customerName.split('-')[0],
          routeAgentChannelName: shipment.routeAgentChannelName || shipment.channelName || '',
          cargo: `${shipment.packageCount} 件 / ${shipment.receivableWeightKg.toFixed(2)} KG`,
          status: shipmentStatusLabels[shipment.status]
        })) as Array<Record<string, unknown>>
      );
      messageApi.success(`已导出 ${rows.length} 条排货数据`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '排货数据导出失败');
    } finally {
      setRoutingReportExporting(false);
    }
  }
  const marketStatusGroups = useMemo<MarketStatusGroup[]>(() => [
    {
      title: '待处理',
      description: '需要市场立即排货',
      tone: pendingShipments.length > 0 ? 'amber' : 'gray',
      icon: <Boxes size={18} />,
      actions: [
        {
          label: '待排货',
          value: pendingShipments.length,
          helper: canViewAgentChannel ? '等待市场分配代理渠道' : '等待市场处理',
          tone: pendingShipments.length > 0 ? 'amber' : 'gray',
          sectionKey: 'pending-routing'
        }
      ]
    },
    {
      title: '流转中',
      description: '排货历史与当前待出库进度',
      tone: waitingDispatchShipments.length > 0 ? 'blue' : 'gray',
      icon: <Activity size={18} />,
      actions: [
        {
          label: '已排货/待出库',
          value: routedShipments.length,
          helper: `排货历史，其中 ${waitingDispatchShipments.length} 票待出库`,
          tone: routedShipments.length > 0 ? 'blue' : 'gray',
          sectionKey: 'routed'
        },
        {
          label: '今日排货',
          value: todayRoutedShipments.length,
          helper: '今天完成排货的票数',
          tone: todayRoutedShipments.length > 0 ? 'blue' : 'gray',
          sectionKey: 'weekly-routing'
        }
      ]
    },
    {
      title: '今日结果',
      description: `仓库出库与${routingPeriodLabel}完成情况`,
      tone: todayOutboundShipments.length > 0 || periodOutboundShipments.length > 0 ? 'green' : 'gray',
      icon: <ClipboardCheck size={18} />,
      actions: [
        {
          label: '今日出货',
          value: todayOutboundShipments.length,
          helper: '仓库今日确认出库',
          tone: todayOutboundShipments.length > 0 ? 'green' : 'gray',
          sectionKey: 'weekly-routing'
        },
        {
          label: `${routingPeriodLabel}已出库`,
          value: periodOutboundShipments.length,
          helper: `${routingPeriodLabel}已完成出库`,
          tone: periodOutboundShipments.length > 0 ? 'green' : 'gray',
          sectionKey: 'weekly-routing'
        }
      ]
    },
    {
      title: `${routingPeriodLabel}风险`,
      description: '异常与特殊处理提醒',
      tone: reroutedInPeriod.length > 0 ? 'red' : (periodSensitiveCount > 0 || periodDeclaredCount > 0 ? 'indigo' : 'gray'),
      icon: <RotateCcw size={18} />,
      actions: [
        {
          label: '退回重排',
          value: reroutedInPeriod.length,
          helper: `${routingPeriodLabel}退回需复核`,
          tone: reroutedInPeriod.length > 0 ? 'red' : 'gray',
          sectionKey: 'weekly-routing'
        },
        {
          label: '敏感货物',
          value: periodSensitiveCount,
          helper: '带电/带磁/敏感',
          tone: periodSensitiveCount > 0 ? 'indigo' : 'gray',
          sectionKey: 'weekly-routing'
        },
        {
          label: '报关货物',
          value: periodDeclaredCount,
          helper: `${routingPeriodLabel}需要报关`,
          tone: periodDeclaredCount > 0 ? 'indigo' : 'gray',
          sectionKey: 'weekly-routing'
        }
      ]
    }
  ], [
    canViewAgentChannel,
    pendingShipments.length,
    periodDeclaredCount,
    periodOutboundShipments.length,
    periodSensitiveCount,
    reroutedInPeriod.length,
    routedShipments.length,
    routingPeriodLabel,
    todayOutboundShipments.length,
    todayRoutedShipments.length,
    waitingDispatchShipments.length
  ]);

  const renderRoutingPeriodSelector = (ariaLabel: string) => (
    <Segmented<RoutingDataPeriod>
      aria-label={ariaLabel}
      size="small"
      options={[
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' }
      ]}
      value={routingDataPeriod}
      onChange={setRoutingDataPeriod}
    />
  );

  const formatAmount = (amount?: number, currency = 'RMB') => typeof amount === 'number' ? `${amount.toFixed(2)} ${currency}` : '-';
  const formatWeight = (weight?: number) => typeof weight === 'number' ? `${weight.toFixed(3)} KG` : '-';
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
  const replacementAgentChannelOptions = useMemo(
    () => watchedReplacementAgentId ? masterData.agentChannels
      .filter((channel) => channel.enabled && channel.agentId === watchedReplacementAgentId)
      .map((channel) => ({ label: channel.channelName, value: channel.id })) : [],
    [masterData.agentChannels, watchedReplacementAgentId]
  );

  const marketColumns: ColumnsType<Shipment> = useMemo(
    () => [
      { title: '进入时间', dataIndex: 'createdAt', width: 160, render: (_: string, record) => new Date(getRoutingStageTime(record)).toLocaleString('zh-CN', { hour12: false }) },
      { title: '站点', dataIndex: 'site', width: 90, render: (value?: string) => value || '-' },
      { title: '业务员', dataIndex: 'salesperson', width: 100, render: (value?: string) => value || '-' },
      { title: '客户编号', dataIndex: 'customerCode', width: 100, render: (value: string | undefined, record) => value || record.customerName.split('-')[0] },
      { title: '客户', dataIndex: 'customerName', width: 150 },
      {
        title: '出货单号', dataIndex: 'systemOrderNo', width: 180,
        render: (value: string, record) => (
          <Space size={2}>
            <Text>{value}</Text>
            {record.agentReplacementCount ? (
              <Button
                type="link"
                size="small"
                aria-label={`查看 ${value} 更换代理记录`}
                style={{ paddingInline: 0 }}
                onClick={() => void openAgentReplacementHistory(record)}
              >
                (G)
              </Button>
            ) : null}
          </Space>
        )
      },
      { title: '货物数据', width: 140, render: (_, record) => `${record.packageCount} 件 / ${record.receivableWeightKg.toFixed(2)} kg` },
      { title: '目的地', dataIndex: 'destinationCountry', width: 90 },
      ...(canViewRouteCost ? [
        { title: '代理计费重', width: 112, render: (_: unknown, record: Shipment) => getRoutedPayableDisplay(record).billingQuantity },
        { title: '代理单价', width: 132, render: (_: unknown, record: Shipment) => getRoutedPayableDisplay(record).unitPrice },
        { title: '代理其他费用', width: 144, render: (_: unknown, record: Shipment) => getRoutedPayableDisplay(record).otherFees },
        { title: '代理总成本', width: 144, render: (_: unknown, record: Shipment) => getRoutedPayableDisplay(record).total }
      ] : []),
      ...(canViewAgentChannel ? [
        { title: '代理', dataIndex: 'agentName', width: 130, render: (value?: string) => value || '待分配' },
        { title: '代理渠道', dataIndex: 'routeAgentChannelName', width: 150, render: (value: string | undefined, record: Shipment) => value || record.channelName || '待分配' }
      ] : []),
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
          const canRerouteRecord = ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(record.status);
          const hasPendingAgentChangeRequest = record.agentChangeRequest?.status === 'PENDING';

          return (
            <Space wrap>
              {canAssignRoute && canAssign ? (
                <Button size="small" onClick={() => openAssignment(record, 'assign')}>
                  排货
                </Button>
              ) : null}
              {canViewRoutedLog ? <Button size="small" onClick={() => onViewRoutingLog(record)}>排货日志</Button> : null}
              {canViewBusinessCost ? (
                <Button size="small" onClick={() => openAssignment(record, 'business-cost')}>业务成本</Button>
              ) : null}
              {hasPendingAgentChangeRequest ? <Tag color="processing">待变更</Tag> : null}
              {canReplaceAgent && hasPendingAgentChangeRequest && agentReplacementAllowedStatuses.has(record.status) ? (
                <Button size="small" type="primary" onClick={() => void openAgentReplacement(record)}>处理变更</Button>
              ) : null}
              {canRerouteRecord && canReroute && canViewAgentChannel ? (
                <Button size="small" icon={<RotateCcw size={14} />} onClick={() => setRerouteShipment(record)}>
                  退回重排
                </Button>
              ) : null}
            </Space>
          );
        }
      }
    ],
    [canAssign, canReplaceAgent, canReroute, canViewAgentChannel, canViewBusinessCost, canViewRouteCost, canViewRoutedLog, onViewRoutingLog]
  );

  const weeklyColumns: ColumnsType<Shipment> = useMemo(() => {
    const columns = marketColumns.filter((column) => column.title !== '排货建议' && column.title !== '排货操作');
    if (!canReroute) return columns;
    return [
      ...columns,
      {
        title: '排货操作',
        width: 112,
        fixed: 'right',
        render: (_: unknown, record: Shipment) => canViewAgentChannel && ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(record.status) ? (
          <Button size="small" icon={<RotateCcw size={14} />} onClick={() => setRerouteShipment(record)}>
            退回重排
          </Button>
        ) : null
      }
    ];
  }, [canReroute, marketColumns]);
  const pendingColumns: ColumnsType<Shipment> = useMemo(
    () => createPendingRoutingColumns({
      businessCostAudits,
      payableAudits,
      mode: 'market',
      onRoute: canAssign ? (shipment) => openAssignment(shipment, 'assign') : undefined,
      onApprove: canConfirm ? (shipment) => void onApproveRouting(shipment) : undefined,
      onModify: canUpdatePending ? (shipment) => openAssignment(shipment, 'update') : undefined,
      onViewFees: canViewBusinessCost ? (shipment) => openAssignment(shipment, 'business-cost') : undefined,
      onViewPayableFees: canViewPayableCost ? (shipment) => openAssignment(shipment, 'payable-cost') : undefined,
      onViewLog: canViewPendingLog ? onViewPendingRoutingLog : undefined,
      onReturnReview: canReturnReview ? onReturnReview : undefined,
      canViewBusinessCost,
      canViewPayableCost,
      canViewAgentChannel,
      canViewRouteCost
    }),
    [businessCostAudits, canAssign, canConfirm, canReturnReview, canUpdatePending, canViewAgentChannel, canViewBusinessCost, canViewPayableCost, canViewPendingLog, canViewRouteCost, onApproveRouting, onReturnReview, onViewPendingRoutingLog, payableAudits]
  );

  const assignmentBusinessCosts = useMemo(
    () => assignmentShipment
      ? (assignmentFinanceDetail?.businessCosts ?? (businessCostAudits ?? []).filter((fee) => fee.shipmentId === assignmentShipment.id || fee.systemOrderNo === assignmentShipment.systemOrderNo))
        .map((fee) => ({ ...fee, customerCode: assignmentShipment.customerCode, systemOrderNo: assignmentShipment.systemOrderNo, transferNo: assignmentShipment.transferNo }))
      : [],
    [assignmentShipment, assignmentFinanceDetail, businessCostAudits]
  );
  const assignmentPayables = useMemo(
    () => assignmentShipment
      ? (assignmentFinanceDetail?.payables ?? (payableAudits ?? []).filter((fee) => fee.shipmentId === assignmentShipment.id || fee.systemOrderNo === assignmentShipment.systemOrderNo))
        .map((fee) => ({ ...fee, customerCode: assignmentShipment.customerCode, systemOrderNo: assignmentShipment.systemOrderNo, transferNo: assignmentShipment.transferNo }))
      : [],
    [assignmentShipment, assignmentFinanceDetail, payableAudits]
  );
  function openCostEditor(
    type: 'BUSINESS_COST' | 'PAYABLE',
    row?: { id: string; name: string; currency?: string; billingUnit?: FinanceBillingUnit; billingQuantity?: number; chargeWeightKg?: number; unitPrice?: number; amount?: number },
    billingUnitOverride?: FinanceBillingUnit
  ) {
    const billingUnit = billingUnitOverride ?? row?.billingUnit ?? 'KG';
    const billingQuantity = billingUnitOverride !== undefined && billingUnitOverride !== (row?.billingUnit ?? 'KG')
      ? billingUnitOverride === 'CBM' ? assignmentShipment?.volumeCbm : row?.chargeWeightKg
      : row?.billingQuantity ?? row?.chargeWeightKg;
    setCostEditor({
      type,
      id: row?.id,
      name: row?.name ?? '',
      currency: row?.currency ?? 'RMB',
      billingUnit,
      billingQuantity,
      chargeWeightKg: billingUnit === 'KG' ? billingQuantity : undefined,
      unitPrice: row?.unitPrice,
      amount: calculateCostAmount(billingQuantity, row?.unitPrice, row?.amount)
    });
  }

  function updateCostEditor(values: Partial<PendingRoutingCostEditor>, calculateAmount = false) {
    setCostEditor((current) => {
      if (!current) return current;
      const next = { ...current, ...values };
      const quantity = next.billingQuantity;
      if (calculateAmount) next.amount = calculateCostAmount(quantity, next.unitPrice);
      return next;
    });
  }

  function getCostEditorAmount(editor: PendingRoutingCostEditor) {
    const quantity = editor.billingQuantity;
    return calculateCostAmount(quantity, editor.unitPrice, editor.amount);
  }

  async function saveCostEditor() {
    if (!assignmentShipment || !costEditor) return;
    if (!costEditor.name.trim()) {
      messageApi.warning('请选择费用名称。');
      return;
    }
    if (!costEditor.currency) {
      messageApi.warning('请选择币种。');
      return;
    }
    if (costEditor.billingQuantity === undefined) {
      messageApi.warning(`请填写${costEditor.billingUnit === 'CBM' ? 'CBM 体积' : 'KG 计费重'}。`);
      return;
    }
    if (!costEditor.id && costEditor.unitPrice === undefined) {
      messageApi.warning('请填写单价。');
      return;
    }
    if (getCostEditorAmount(costEditor) === undefined) {
      messageApi.warning('请填写总金额。');
      return;
    }
    setCostSaving(true);
    try {
      await onSavePendingRoutingCost(assignmentShipment, costEditor.type, costEditor.id, {
        name: costEditor.name.trim(),
        currency: costEditor.currency,
        billingUnit: costEditor.billingUnit ?? 'KG',
        billingQuantity: costEditor.billingQuantity,
        chargeWeightKg: (costEditor.billingUnit ?? 'KG') === 'KG' ? costEditor.billingQuantity : undefined,
        unitPrice: costEditor.unitPrice,
        amount: getCostEditorAmount(costEditor) ?? 0
      });
      setCostEditor(null);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '费用保存失败，请稍后重试。');
    } finally {
      setCostSaving(false);
    }
  }

  function renderCostTab(type: 'BUSINESS_COST' | 'PAYABLE', rows: PendingRoutingCostRow[]) {
    const total = rows.reduce((sum, row) => sum + Number(row.rmbAmount ?? row.amount ?? 0), 0);
    const newFeeNameOptions = type === 'PAYABLE'
      ? feeNameOptions.filter((item) => item.value !== '代理成本')
      : feeNameOptions;
    const amountColumnIndex = type === 'BUSINESS_COST' ? 7 : 8;
    const canManageCost = type === 'BUSINESS_COST'
      ? canViewBusinessCost && (can('market:pending-routing:business-cost:create') || can('market:pending-routing:business-cost:edit') || can('market:pending-routing:business-cost:delete'))
      : canViewPayableCost && (can('market:pending-routing:payable-cost:create') || can('market:pending-routing:payable-cost:edit') || can('market:pending-routing:payable-cost:delete'));
    const canCreateCost = canManageCost && (type === 'BUSINESS_COST' ? can('market:pending-routing:business-cost:create') : can('market:pending-routing:payable-cost:create'));
    const canUpdateCost = canManageCost && (type === 'BUSINESS_COST' ? can('market:pending-routing:business-cost:edit') : can('market:pending-routing:payable-cost:edit'));
    const canDeleteCost = canManageCost && (type === 'BUSINESS_COST' ? can('market:pending-routing:business-cost:delete') : can('market:pending-routing:payable-cost:delete'));
    // Create-only roles still need the operation column while the temporary
    // row is being edited so they can save or cancel the new fee.
    const canOperateCost = canCreateCost || canUpdateCost || canDeleteCost;
    const editingThisType = costEditor?.type === type;
    const editableRows: PendingRoutingCostRow[] = editingThisType && !costEditor.id && assignmentShipment
      ? [...rows, {
          id: '__new_cost__', shipmentId: assignmentShipment.id, name: '', amount: 0,
          currency: costEditor.currency, customerCode: assignmentShipment.customerCode,
          systemOrderNo: assignmentShipment.systemOrderNo, transferNo: assignmentShipment.transferNo
        }]
      : rows;
    const isEditingRow = (row: PendingRoutingCostRow) => editingThisType && (costEditor.id ? row.id === costEditor.id : row.id === '__new_cost__');
    return (
      <Space direction="vertical" size={12} className="full-width">
        <Flex justify="space-between" align="center">
          <Text type="secondary">总金额 = 计费数量 × 每单位单价；例如 0.50 KG × 49 RMB/KG = 24.50 RMB。可选择 KG 或 CBM，合计按 RMB 口径展示。</Text>
          {canCreateCost ? <Button size="small" disabled={Boolean(costEditor)} onClick={() => openCostEditor(type)}>新增费用</Button> : null}
        </Flex>
        <ManagedTable
          className="routing-assignment-cost-table"
          size="small"
          rowKey="id"
          pagination={false}
          scroll={{ x: 1080 }}
          dataSource={editableRows}
          locale={{ emptyText: '暂无费用明细' }}
          columns={([
            {
              title: '费用名称', dataIndex: 'name', width: 150,
              render: (value: string, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <Select aria-label="费用名称" showSearch optionFilterProp="label" placeholder="选择费用名称"
                  value={costEditor?.name || undefined} options={costEditor?.id ? feeNameOptions : newFeeNameOptions} notFoundContent="暂无启用费用名称"
                  onChange={(name) => {
                    const currency = feeNameOptions.find((item) => item.value === name)?.currency;
                    updateCostEditor({ name, ...(currency === 'RMB' || currency === 'USD' ? { currency } : {}) });
                  }} />
              ) : value
            },
            { title: '客户编号', dataIndex: 'customerCode', width: 100 },
            { title: '运单号', dataIndex: 'systemOrderNo', width: 150 },
            { title: '转单号', dataIndex: 'transferNo', width: 130, render: (value?: string) => value || '-' },
            ...(type === 'PAYABLE' ? [{ title: '对账状态', dataIndex: 'reconciliationStatus', width: 100, render: (value?: string) => formatRoutingFeeStatus(value) }] : []),
            {
              title: '币种', dataIndex: 'currency', width: 90,
              render: (value: string | undefined, row: PendingRoutingCostRow) => isEditingRow(row)
                ? <Select aria-label="币种" value={costEditor?.currency} options={[{ label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} onChange={(currency) => updateCostEditor({ currency })} />
                : value
            },
            {
              title: '计费方式 / 数量',
              dataIndex: 'billingQuantity', width: 190,
              render: (value: number | undefined, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <Space.Compact>
                  <Select aria-label="计费方式" value={costEditor?.billingUnit ?? 'KG'} options={[{ label: '计费重（KG）', value: 'KG' }, { label: '体积（CBM）', value: 'CBM' }]}
                    onChange={(billingUnit: FinanceBillingUnit) => {
                      const billingQuantity = billingUnit === 'CBM' ? assignmentShipment?.volumeCbm : costEditor?.chargeWeightKg;
                      updateCostEditor({ billingUnit, billingQuantity, chargeWeightKg: billingUnit === 'KG' ? billingQuantity : undefined }, true);
                    }} style={{ width: 112 }} />
                  <InputNumber aria-label="计费数量" min={0} precision={costEditor?.billingUnit === 'CBM' ? 6 : 3} value={costEditor?.billingQuantity}
                    onChange={(billingQuantity) => updateCostEditor({ billingQuantity: billingQuantity ?? undefined }, true)} />
                </Space.Compact>
              ) : `${(row.billingQuantity ?? row.chargeWeightKg ?? 0).toFixed(row.billingUnit === 'CBM' ? 6 : 2)} ${row.billingUnit === 'CBM' ? 'CBM' : 'KG'}`
            },
            {
              title: '单位单价', dataIndex: 'unitPrice', width: 200,
              render: (value: number | undefined, row: PendingRoutingCostRow) => isEditingRow(row)
                ? <Space.Compact block>
                    <InputNumber aria-label="单位单价" min={0} precision={2} value={costEditor?.unitPrice} style={{ width: 112 }}
                      onChange={(unitPrice) => updateCostEditor({ unitPrice: unitPrice ?? undefined }, true)} />
                    <Input aria-label="单位单价单位" readOnly tabIndex={-1} value={`${costEditor?.currency ?? 'RMB'}/${costEditor?.billingUnit === 'CBM' ? 'CBM' : 'KG'}`} style={{ width: 82 }} />
                  </Space.Compact>
                : value === undefined ? '-' : `${value.toFixed(2)} ${row.currency ?? 'RMB'}/${row.billingUnit === 'CBM' ? 'CBM' : 'KG'}`
            },
            {
              title: '总金额', dataIndex: 'amount', width: 120,
              render: (value: number, row: PendingRoutingCostRow) => isEditingRow(row)
                ? <InputNumber aria-label="总金额" min={0} precision={2} value={costEditor?.amount}
                    disabled={costEditor?.unitPrice !== undefined && costEditor.billingQuantity !== undefined}
                    onChange={(amount) => updateCostEditor({ amount: amount ?? undefined })} />
                : `${value.toFixed(2)} ${row.currency ?? 'RMB'}`
            },
            canOperateCost ? {
              title: '操作', width: 120, fixed: 'right' as const,
              render: (_: unknown, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <Space size={4}><Button size="small" type="primary" loading={costSaving} onClick={() => void saveCostEditor()}>保存</Button><Button size="small" disabled={costSaving} onClick={() => setCostEditor(null)}>取消</Button></Space>
              ) : <Space size={4}>
                {canUpdateCost && row.marketEditable !== false ? <Button size="small" disabled={Boolean(costEditor)} onClick={() => openCostEditor(type, row)}>修改</Button> : null}
                {canDeleteCost && row.marketEditable !== false ? (
                  <Popconfirm
                    title="确认删除该费用？"
                    description="删除后费用明细将从该运单中移除，且不能恢复。"
                    okText="确认删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => assignmentShipment && void onDeletePendingRoutingCost(assignmentShipment, row.id)}
                  >
                    <Button size="small" danger disabled={Boolean(costEditor)}>删除</Button>
                  </Popconfirm>
                ) : null}
              </Space>
            } : null
          ].filter(Boolean) as ColumnsType<PendingRoutingCostRow>)}
          summary={() => <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={amountColumnIndex}>合计（RMB）</Table.Summary.Cell><Table.Summary.Cell index={amountColumnIndex}>{total.toFixed(2)} RMB</Table.Summary.Cell>{canOperateCost ? <Table.Summary.Cell index={amountColumnIndex + 1} /> : null}</Table.Summary.Row>}
        />
      </Space>
    );
  }
  const routedColumns: ColumnsType<Shipment> = useMemo(
    () => {
      const costColumns: ColumnsType<Shipment> = [];
      if (canViewBusinessCost) {
        costColumns.push(
          { title: '业务成本', width: 150, render: (_: unknown, record: Shipment) => renderFeeRows(sameShipmentFees(record)) },
          {
            title: '业务成本合计', width: 112, align: 'right',
            render: (_: unknown, record: Shipment) => formatAmount(sameShipmentFees(record).reduce((sum, fee) => sum + fee.amount, 0))
          }
        );
      }
      const statusIndex = marketColumns.findIndex((column) => column.title === '状态');
      const routedOperationalColumns: ColumnsType<Shipment> = [
        {
          key: 'warehouseOutboundRemark',
          dataIndex: 'warehouseOutboundRemark',
          title: '出库备注',
          width: 220,
          render: (value?: string) => value || '-'
        },
        {
          key: 'outboundAt',
          title: '出库时间',
          width: 136,
          render: (_: unknown, record: Shipment) => record.outboundAt ? formatBeijingDateTime(record.outboundAt) : '-'
        }
      ];
      const columns = statusIndex >= 0
        ? [...marketColumns.slice(0, statusIndex), ...costColumns, ...routedOperationalColumns, ...marketColumns.slice(statusIndex)]
        : [...marketColumns, ...costColumns, ...routedOperationalColumns];
      const agentIndex = columns.findIndex((column) => column.title === '代理');
      const columnsWithAgentShortName = agentIndex >= 0
        ? [
            ...columns.slice(0, agentIndex + 1),
            {
              key: 'agentShortName',
              title: '代理简称',
              width: 96,
              render: (_: unknown, record: Shipment) => getRoutingAgentShortName(record, masterData.agents),
              sorter: (left: Shipment, right: Shipment) => getRoutingAgentShortName(left, masterData.agents)
                .localeCompare(getRoutingAgentShortName(right, masterData.agents), 'zh-CN')
            },
            ...columns.slice(agentIndex + 1)
          ]
        : columns;
      const routedColumnWidths = new Map<string, number>([
        ['录单时间', 136],
        ['进入时间', 136],
        ['站点', 72],
        ['业务员', 82],
        ['客户编号', 92],
        ['客户', 132],
        ['出货单号', 152],
        ['转单号', 132],
        ['件数', 72],
        ['应收计费重', 104],
        ['目的地', 76],
        ['代理', 104],
        ['代理简称', 96],
        ['代理渠道', 130],
        ['出库备注', 220],
        ['出库时间', 136],
        ['状态', 96],
        ['排货操作', 168]
      ]);
      const routedDataColumns: ColumnsType<Shipment> = [];
      columnsWithAgentShortName.forEach((column) => {
        const title = String(column.title ?? '');
        const baseColumn = routedColumnWidths.has(title) ? { ...column, width: routedColumnWidths.get(title) } : column;
        if (title === '进入时间') {
          routedDataColumns.push(
            {
              key: 'createdAt',
              dataIndex: 'createdAt',
              title: '录单时间',
              width: 136,
              render: (value: string) => formatBeijingDateTime(value),
              sorter: (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
            },
            {
              ...baseColumn,
              key: 'routedAt',
              title: '排货时间',
              render: (_: unknown, record: Shipment) => formatBeijingDateTime(record.routedAt ?? record.createdAt),
              sorter: (left, right) => new Date(left.routedAt ?? left.createdAt).getTime() - new Date(right.routedAt ?? right.createdAt).getTime()
            }
          );
          return;
        }
        if (title === '出货单号') {
          routedDataColumns.push(
            baseColumn,
            {
              key: 'transferNo',
              dataIndex: 'transferNo',
              title: '转单号',
              width: 132,
              render: (value?: string) => value || '-'
            }
          );
          return;
        }
        if (title === '货物数据') {
          routedDataColumns.push(
            {
              key: 'packageCount',
              dataIndex: 'packageCount',
              title: '件数',
              width: 72,
              align: 'right',
              render: (value: number) => `${value} 件`
            },
            {
              key: 'receivableWeightKg',
              dataIndex: 'receivableWeightKg',
              title: '应收计费重',
              width: 104,
              align: 'right',
              render: (value?: number) => formatWeight(value)
            }
          );
          return;
        }
        routedDataColumns.push(baseColumn);
      });
      return routedDataColumns;
    },
    [businessCostAudits, canViewBusinessCost, marketColumns, masterData.agents]
  );

  return (
    <>
      <AppPageHeader
        title={config.title}
        description={<><span>{config.description}</span><div><Tag color="blue">硅基流动</Tag></div></>}
        actions={(
          <AppActionGroup>
            {activeSection === 'weekly-routing' && can('market:routing-report:export') ? (
              <Button icon={<ClipboardCheck size={16} />} loading={routingReportExporting} onClick={() => void exportRoutingReport()}>导出</Button>
            ) : null}
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
                    dashboard: marketStatusGroups.map((group) => ({
                      title: group.title,
                      actions: group.actions.map(({ label, value, helper }) => ({ label, value, helper }))
                    })),
                    pendingShipments: pendingShipments.slice(0, 20).map((shipment) => ({
                      systemOrderNo: shipment.systemOrderNo,
                      customerName: shipment.customerName,
                      destinationCountry: shipment.destinationCountry
                    })),
                    routedShipments: routedShipments.slice(0, 20).map((shipment) => ({
                      systemOrderNo: shipment.systemOrderNo,
                      channelName: shipment.channelName,
                      ...(canViewAgentChannel ? { agentName: shipment.agentName, routeAgentChannelName: shipment.routeAgentChannelName } : {}),
                      status: shipment.status
                    })),
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
                <div className="market-dashboard-task-grid">
                  {marketStatusGroups.map((group) => (
                    <Card
                      key={group.title}
                      className={`market-status-card market-status-card-${group.tone}`}
                      title={(
                        <Flex align="center" gap={8} className="market-status-title">
                          <span className={`market-status-icon market-status-icon-${group.tone}`}>{group.icon}</span>
                          <span>{group.title}</span>
                        </Flex>
                      )}
                    >
                      <Text type="secondary" className="market-status-description">{group.description}</Text>
                      <Space direction="vertical" size={8} className="full-width market-status-actions">
                        {group.actions.filter((action) => (
                          action.sectionKey === 'pending-routing' ? canViewPending
                            : action.sectionKey === 'routed' ? canViewRouted
                              : canViewWeekly
                        )).map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            className={`market-status-row market-status-row-${action.tone}`}
                            aria-label={`${action.label} ${action.value} 票 ${action.helper}`}
                            onClick={() => setActiveSection(action.sectionKey)}
                          >
                            <span className="market-status-row-copy">
                              <span className="market-status-row-label">{action.label}</span>
                              <span className="market-status-row-helper">{action.helper}</span>
                            </span>
                            <span className="market-status-row-value">{action.value}</span>
                          </button>
                        ))}
                      </Space>
                    </Card>
                  ))}
                </div>
                <Card
                  className="module-grid market-dashboard-weekly"
                  title={`${routingPeriodLabel}排货数据`}
                  extra={renderRoutingPeriodSelector('市场看板统计周期')}
                >
                  <Row gutter={[16, 12]}>
                    {canViewAgentChannel ? <Col xs={24} lg={8}>
                      <Text strong>{routingPeriodLabel}排货代理</Text>
                      {renderMarketStatList(periodAgentStats, `${routingPeriodLabel}暂无排货代理`)}
                    </Col> : null}
                    {canViewAgentChannel ? <Col xs={24} lg={8}>
                      <Text strong>{routingPeriodLabel}排货渠道（空运/海运）</Text>
                      {renderMarketStatList(periodChannelModeStats, `${routingPeriodLabel}暂无排货渠道`)}
                    </Col> : null}
                    <>
                    <Col xs={12} lg={4}>
                      <Statistic title={`${routingPeriodLabel}敏感货物`} value={periodSensitiveCount} suffix="票" />
                      <Text type="secondary">带电/带磁/敏感</Text>
                    </Col>
                    <Col xs={12} lg={4}>
                      <Statistic title={`${routingPeriodLabel}报关货物`} value={periodDeclaredCount} suffix="票" />
                      <Text type="secondary">需要报关</Text>
                    </Col>
                    </>
                  </Row>
                </Card>
              </Space>
            ) : null}

            {activeSection === 'pending-routing' ? (
              <Card className="module-grid routing-pending-card" title="待排货">
                <ManagedTable
                  rowKey="id"
                  size="small"
                  columns={pendingColumns}
                  dataSource={filteredPendingShipments}
                  pagination={{
                    ...tenRowTablePagination,
                    current: pendingPagination.current,
                    pageSize: pendingPagination.pageSize,
                    onChange: (current, pageSize) => setPendingPagination({ current, pageSize })
                  }}
                  minimumScrollX={2530}
                  onRow={canUpdatePending ? (record) => ({ onDoubleClick: () => openAssignment(record, 'update') }) : undefined}
                  toolbarLeading={(
                    <div className="routing-pending-filter-bar" role="search" aria-label="待排货筛选">
                      <label className="routing-pending-filter-field">
                        <span>业务员</span>
                        <Input
                          aria-label="按业务员筛选"
                          allowClear
                          size="small"
                          value={pendingFilterDraft.salesperson}
                          onChange={(event) => setPendingFilterDraft((current) => ({ ...current, salesperson: event.target.value }))}
                          onPressEnter={applyPendingRoutingFilters}
                        />
                      </label>
                      <label className="routing-pending-filter-field">
                        <span>客户编号</span>
                        <Input
                          aria-label="按客户编号筛选"
                          allowClear
                          size="small"
                          value={pendingFilterDraft.customerCode}
                          onChange={(event) => setPendingFilterDraft((current) => ({ ...current, customerCode: event.target.value }))}
                          onPressEnter={applyPendingRoutingFilters}
                        />
                      </label>
                      <label className="routing-pending-filter-field">
                        <span>出货单号</span>
                        <Input
                          aria-label="按出货单号筛选"
                          allowClear
                          size="small"
                          value={pendingFilterDraft.systemOrderNo}
                          onChange={(event) => setPendingFilterDraft((current) => ({ ...current, systemOrderNo: event.target.value }))}
                          onPressEnter={applyPendingRoutingFilters}
                        />
                      </label>
                      <div className="routing-pending-filter-actions">
                        <Button size="small" type="primary" onClick={applyPendingRoutingFilters}>查询</Button>
                        <Button size="small" onClick={resetPendingRoutingFilters}>重置</Button>
                        <Text type="secondary">显示 {filteredPendingShipments.length} / 共 {pendingShipments.length} 条</Text>
                      </div>
                    </div>
                  )}
                  columnSettingsPlacement="column"
                  columnSettings={{ storageKey: 'sunny.routing.pending.columns.market-review-v2', title: '待排货列设置' }}
                />
              </Card>
            ) : null}

            {activeSection === 'routed' ? (
              <Card
                className="module-grid routing-routed-card"
                title={(
                  <Space size={12} wrap>
                    <span>已排货</span>
                    <Segmented
                      aria-label="已排货数据范围"
                      size="small"
                      value={routedView}
                      options={[
                        { label: '近30天', value: 'recent' },
                        { label: '全部历史', value: 'history' }
                      ]}
                      onChange={(value) => {
                        setRoutedView(value as 'recent' | 'history');
                        setRoutedPagination((current) => ({ ...current, current: 1 }));
                      }}
                    />
                  </Space>
                )}
              >
                <ManagedTable
                  rowKey="id"
                  size="small"
                  className="routing-routed-table"
                  columns={routedColumns}
                  dataSource={filteredRoutedShipments}
                  locale={{ emptyText: routedView === 'history' ? '暂无排货历史' : '近30天暂无已排货记录' }}
                  pagination={{
                    ...tenRowTablePagination,
                    current: routedPagination.current,
                    pageSize: routedPagination.pageSize,
                    onChange: (current, pageSize) => setRoutedPagination({ current, pageSize })
                  }}
                  minimumScrollX={2850}
                  toolbarLeading={(
                    <div className="routing-routed-filter-bar" role="search" aria-label={routedView === 'history' ? '排货历史筛选' : '已排货筛选'}>
                      <label className="routing-pending-filter-field routing-routed-filter-field routing-routed-date-filter">
                        <span>录单时间</span>
                        <AppDateRangePicker
                          aria-label="按录单时间筛选"
                          size="small"
                          value={[routedFilterDraft.entryDateFrom || undefined, routedFilterDraft.entryDateTo || undefined]}
                          onChange={([entryDateFrom, entryDateTo]) => setRoutedFilterDraft((current) => ({
                            ...current,
                            entryDateFrom: entryDateFrom ?? '',
                            entryDateTo: entryDateTo ?? ''
                          }))}
                        />
                      </label>
                      <label className="routing-pending-filter-field routing-routed-filter-field">
                        <span>代理简称</span>
                        <Select
                          aria-label="按代理简称筛选"
                          allowClear
                          showSearch
                          size="small"
                          optionFilterProp="label"
                          options={routedAgentShortNameOptions}
                          placeholder="全部代理"
                          value={routedFilterDraft.agentShortName || undefined}
                          onChange={(agentShortName?: string) => setRoutedFilterDraft((current) => ({ ...current, agentShortName: agentShortName ?? '' }))}
                        />
                      </label>
                      <div className="routing-pending-filter-actions routing-routed-filter-actions">
                        <Button size="small" type="primary" onClick={applyRoutedFilters}>查询</Button>
                        <Button size="small" onClick={resetRoutedFilters}>重置</Button>
                        <Text type="secondary">
                          显示 {filteredRoutedShipments.length} / {routedView === 'history' ? '全部历史' : '近30天'}共 {scopedRoutedShipments.length} 条
                        </Text>
                      </div>
                    </div>
                  )}
                  columnSettingsPlacement="column"
                  columnSettings={{ storageKey: 'sunny.routing.routed.columns', title: '已排货列设置' }}
                />
              </Card>
            ) : null}

            {activeSection === 'weekly-routing' ? (
              <Space direction="vertical" size={16} className="full-width">
                <Flex justify="space-between" align="center" gap={12} wrap className="routing-period-toolbar">
                  <Text strong>{routingPeriodLabel}排货概览</Text>
                  {renderRoutingPeriodSelector('排货明细统计周期')}
                </Flex>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}><MetricCard icon={<ClipboardCheck />} title={`${routingPeriodLabel}已排`} value={periodRoutedShipments.length} extra={canViewAgentChannel ? '市场已分配代理渠道' : '市场已完成排货'} /></Col>
                  <Col xs={24} md={8}><MetricCard icon={<Activity />} title={`${routingPeriodLabel}未出库`} value={periodRoutedShipments.filter((item) => item.status === 'WAITING_DISPATCH').length} extra="等待仓库确认出库" /></Col>
                  <Col xs={24} md={8}><MetricCard icon={<Boxes />} title={`${routingPeriodLabel}已出库`} value={periodRoutedShipments.filter((item) => item.status !== 'WAITING_DISPATCH').length} extra="仓库已确认出库或后续状态" /></Col>
                </Row>
                <Card className="module-grid" title={`${routingPeriodLabel}排货明细`}>
                  <ManagedTable
                    rowKey="id"
                    size="small"
                    columns={weeklyColumns}
                    dataSource={periodDetailShipments}
                    pagination={tenRowTablePagination}
                    minimumScrollX={1750}
                    columnSettings={{ storageKey: 'sunny.routing.weekly.columns', title: '排货数据列设置' }}
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
        width={1320}
        className="routing-assignment-modal"
        footer={(
          <Space>
            <Button disabled={assignmentSubmitting || costSaving} onClick={() => { setCostEditor(null); onCancelAssignment(); }}>取消</Button>
            {canViewAgentChannel && canSaveDraft ? <Button type="primary" loading={assignmentSubmitting} onClick={() => void submitAssignment(false)}>确认保存</Button> : null}
          </Space>
        )}
        onCancel={() => { setCostEditor(null); onCancelAssignment(); }}
      >
        <Alert
          className="notice-bar"
          type="info"
          showIcon
          message={canViewBusinessCost || canViewPayableCost
            ? '这里保存代理与渠道等排货资料；业务成本和应付成本请在下方费用明细中维护。返回列表点击审核后，订单才会进入仓库待出库。'
            : '这里仅保存代理与渠道等排货资料；返回列表点击审核后，订单才会进入仓库待出库。'}
        />
        <div className="routing-assignment-sections">
          {canViewAgentChannel ? (
            <section className="routing-assignment-section" aria-labelledby="routing-assignment-basic-title">
              <div className="routing-assignment-section-header">
                <Text strong id="routing-assignment-basic-title">基本信息</Text>
                <Text type="secondary">订单资料、代理与渠道</Text>
              </div>
              <div className="routing-assignment-section-body routing-assignment-basic-body">
                {assignmentShipment ? (
                  <Card size="small" className="routing-assignment-context" title="订单信息">
                    <Row gutter={[16, 6]}>
                      <Col xs={12} md={6}>日期：{new Date(assignmentShipment.reviewedAt ?? assignmentShipment.createdAt).toLocaleDateString('zh-CN')}</Col>
                      <Col xs={12} md={6}>站点：{assignmentShipment.site || '-'}</Col>
                      <Col xs={12} md={6}>业务员：{assignmentShipment.salesperson || '-'}</Col>
                      <Col xs={12} md={6}>客户编号：{assignmentShipment.customerCode || '-'}</Col>
                      <Col xs={12} md={6}>出货单号：{assignmentShipment.systemOrderNo}</Col>
                      <Col xs={12} md={6}>公司渠道：{assignmentShipment.channelName || '-'}</Col>
                      <Col xs={24} md={12}>货物数据：{assignmentShipment.packageCount} 件 / {assignmentShipment.receivableWeightKg.toFixed(2)} kg / {assignmentShipment.volumeCbm?.toFixed(3) ?? '0.000'} CBM</Col>
                      <Col xs={12} md={6}>亚马逊代码：{assignmentShipment.fbaWarehouseCode?.trim() || '-'}</Col>
                      <Col xs={12} md={6}>邮编：{assignmentShipment.receiverPostalCode?.trim() || '-'}</Col>
                      <Col xs={24} md={12}>备注：{assignmentShipment.remark?.trim() || '-'}</Col>
                    </Row>
                  </Card>
                ) : null}
                <Form form={assignmentForm} layout="vertical" className="routing-assignment-form">
                  <Form.Item name="channelId" hidden>
                    <Input />
                  </Form.Item>
                  <Row gutter={[14, 0]}>
                    <Col xs={24} sm={12} lg={5}>
                      <Form.Item name="destinationCountry" label="国家" rules={[{ required: true, whitespace: true, message: '请选择国家' }]}>
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={5}>
                      <Form.Item name="agentId" label="代理">
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
                    <Col xs={24} sm={16} lg={9}>
                      <Form.Item name="agentChannelName" label="代理渠道" rules={[{ required: true, whitespace: true, message: '请输入代理渠道' }]}>
                        <AutoComplete
                          options={agentChannelOptions}
                          placeholder="例如 宇环 DHL"
                          filterOption={(input, option) => String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                        />
                      </Form.Item>
                      {canCreateAgentChannel ? (
                        <Form.Item name="saveAgentChannelToMasterData" valuePropName="checked" initialValue={false}>
                          <Checkbox>保存代理渠道到资料库</Checkbox>
                        </Form.Item>
                      ) : null}
                    </Col>
                    <Col xs={24} sm={8} lg={5}>
                      <Form.Item name="shippingMarkRequired" label="出库要求" valuePropName="checked" initialValue={false} style={{ marginBottom: 8 }}>
                        <Checkbox>需要贴麦头</Checkbox>
                      </Form.Item>
                      <Form.Item
                        name="warehouseOutboundRemark"
                        label="出库备注（推送仓库）"
                        rules={[{ max: 500, message: '出库备注不能超过 500 个字符' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input.TextArea
                          rows={2}
                          maxLength={500}
                          showCount
                          placeholder="例如：易碎、需加固、分箱贴标"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </div>
            </section>
          ) : null}

          {canViewBusinessCost ? (
            <section className="routing-assignment-section" aria-labelledby="routing-assignment-business-cost-title">
              <div className="routing-assignment-section-header">
                <Text strong id="routing-assignment-business-cost-title">业务成本</Text>
                <Text type="secondary">录单产生的客户侧成本</Text>
              </div>
              <div className="routing-assignment-section-body routing-assignment-cost-body">
                {renderCostTab('BUSINESS_COST', assignmentBusinessCosts)}
              </div>
            </section>
          ) : null}

          {canViewPayableCost ? (
            <section className="routing-assignment-section" aria-labelledby="routing-assignment-payable-cost-title">
              <div className="routing-assignment-section-header">
                <Text strong id="routing-assignment-payable-cost-title">应付成本</Text>
                <Text type="secondary">代理侧计费与应付明细</Text>
              </div>
              <div className="routing-assignment-section-body routing-assignment-cost-body">
                {renderCostTab('PAYABLE', assignmentPayables)}
              </div>
            </section>
          ) : null}
        </div>
      </Modal>
      <Modal
        title={agentReplacementShipment ? `处理代理变更 · ${agentReplacementShipment.systemOrderNo}` : '处理代理变更'}
        open={Boolean(agentReplacementShipment)}
        destroyOnHidden
        width={1120}
        confirmLoading={agentReplacementSubmitting}
        footer={(
          <Space>
            <Button disabled={agentReplacementSubmitting} onClick={closeAgentReplacement}>取消</Button>
            <Button danger disabled={agentReplacementLoading || !agentReplacementPreview} loading={agentReplacementSubmitting} onClick={() => void rejectAgentChangeRequest()}>驳回申请</Button>
            <Button type="primary" disabled={agentReplacementLoading || !agentReplacementPreview || agentReplacementPreview.paymentState === 'PAYMENT_BLOCKED'} loading={agentReplacementSubmitting} onClick={() => void submitAgentReplacement()}>确认变更</Button>
          </Space>
        )}
        onCancel={closeAgentReplacement}
      >
        {agentReplacementLoading ? (
          <Alert type="info" showIcon message="正在读取代理、应付和付款状态…" />
        ) : agentReplacementPreview ? (
          <Space direction="vertical" size={14} className="full-width">
            <Card size="small" title="客服变更申请">
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>变更原因：{agentReplacementPreview.request.reason || '-'}</Col>
                <Col xs={24} md={6}>发起人：{agentReplacementPreview.request.requestedBy}</Col>
                <Col xs={24} md={6}>发起时间：{formatBeijingDateTime(agentReplacementPreview.request.requestedAt)}</Col>
                <Col xs={24} md={12}>当前代理：{agentReplacementPreview.agentName || '-'}</Col>
                <Col xs={24} md={12}>当前代理渠道：{agentReplacementPreview.agentChannelName || '-'}</Col>
              </Row>
            </Card>
            <Alert
              showIcon
              type={agentReplacementPreview.paymentState === 'PAYMENT_BLOCKED'
                ? 'error'
                : agentReplacementPreview.paymentState === 'AUDITED_REQUIRES_REVIEW' ? 'warning' : 'info'}
              message={agentReplacementPreview.paymentState === 'PAYMENT_BLOCKED'
                ? '该票已进入付款申请、付款、凭证或结算链路，不能更换代理。请先撤销付款链路。'
                : agentReplacementPreview.paymentState === 'AUDITED_REQUIRES_REVIEW'
                  ? '该票应付已审核。确认后原应付将作废，并生成待审核的新应付。'
                  : '该票应付尚未审核。确认后将在原记录上更新，并完整记录前后差异。'}
            />
            <Form form={agentReplacementForm} layout="vertical" disabled={agentReplacementPreview.paymentState === 'PAYMENT_BLOCKED'}>
              <Form.Item name="requestId" hidden><Input /></Form.Item>
              <Form.Item name="agentChannelName" hidden><Input /></Form.Item>
              <Row gutter={[14, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="agentId" label="代理" rules={[{ required: true, message: '请选择代理' }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="选择基础资料里的代理"
                      options={masterData.agents.filter((agent) => agent.enabled).map((agent) => ({
                        value: agent.id,
                        label: [agent.shortName, agent.name].filter(Boolean).join(' / ')
                      }))}
                      onChange={() => agentReplacementForm.setFieldsValue({ agentChannelId: undefined, agentChannelName: '' })}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="agentChannelId" label="代理渠道" rules={[{ required: true, message: '请选择代理渠道' }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder={watchedReplacementAgentId ? '选择代理渠道' : '请先选择代理'}
                      disabled={!watchedReplacementAgentId}
                      options={replacementAgentChannelOptions}
                      onChange={(agentChannelId) => {
                        const option = replacementAgentChannelOptions.find((item) => item.value === agentChannelId);
                        agentReplacementForm.setFieldValue('agentChannelName', option?.label ?? '');
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.List name="payables">
                {(fields) => (
                  <Space direction="vertical" size={10} className="full-width">
                    <Flex justify="space-between" align="center">
                      <Text strong>应付成本</Text>
                      <Text type="secondary">仅更新原有费用；计费数量 × 单价自动形成新金额。</Text>
                    </Flex>
                    {fields.length ? fields.map((field, index) => (
                      <Card key={field.key} size="small" title={`费用 ${index + 1}`}>
                        <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                        <Row gutter={[12, 0]}>
                          <Col xs={24} md={5}>
                            <Form.Item name={[field.name, 'name']} label="费用名称" rules={[{ required: true, whitespace: true, message: '请填写费用名称' }]}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={3}>
                            <Form.Item name={[field.name, 'currency']} label="币种" rules={[{ required: true }]}>
                              <Select options={[{ label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={3}>
                            <Form.Item name={[field.name, 'billingUnit']} label="计费单位" rules={[{ required: true }]}>
                              <Select options={[{ label: 'KG', value: 'KG' }, { label: 'CBM', value: 'CBM' }]} />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={4}>
                            <Form.Item name={[field.name, 'billingQuantity']} label="计费数量" rules={[{ required: true, message: '请填写计费数量' }]}>
                              <InputNumber min={0} precision={6} className="full-width" />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={4}>
                            <Form.Item name={[field.name, 'unitPrice']} label="单价" rules={[{ required: true, message: '请填写单价' }]}>
                              <InputNumber min={0} precision={2} className="full-width" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={5}>
                            <Form.Item label="总金额" shouldUpdate noStyle>
                              {() => {
                                const payable = agentReplacementForm.getFieldValue(['payables', index]) as ShipmentAgentReplacementInput['payables'][number] | undefined;
                                const amount = Number(payable?.billingQuantity ?? 0) * Number(payable?.unitPrice ?? 0);
                                return (
                                  <Form.Item label="总金额">
                                    <Input value={`${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'} ${payable?.currency ?? 'RMB'}`} disabled />
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>
                          </Col>
                          <Col xs={24}>
                            <Form.Item name={[field.name, 'remark']} label="费用备注" rules={[{ max: 500, message: '费用备注不能超过 500 个字符' }]} style={{ marginBottom: 0 }}>
                              <Input placeholder="选填" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    )) : <Alert type="info" showIcon message="该票当前没有有效应付成本，本次仅更新代理和代理渠道。" />}
                  </Space>
                )}
              </Form.List>

              <Form.Item
                name="resolutionNote"
                label="市场处理备注"
                rules={[
                  { required: true, whitespace: true, message: '请填写市场处理备注' },
                  { max: 500, message: '市场处理备注不能超过 500 个字符' }
                ]}
                style={{ marginTop: 14, marginBottom: 0 }}
              >
                <Input.TextArea rows={3} maxLength={500} showCount placeholder="填写处理结果；确认变更或驳回都会记录此备注" />
              </Form.Item>
            </Form>
          </Space>
        ) : null}
      </Modal>

      <Modal
        title={agentReplacementHistoryShipment ? `${agentReplacementHistoryShipment.systemOrderNo}(G) · 更换代理记录` : '更换代理记录'}
        open={Boolean(agentReplacementHistoryShipment)}
        width={900}
        footer={<Button onClick={() => setAgentReplacementHistoryShipment(null)}>关闭</Button>}
        onCancel={() => setAgentReplacementHistoryShipment(null)}
      >
        {agentReplacementHistoryLoading ? (
          <Alert type="info" showIcon message="正在读取更换记录…" />
        ) : agentReplacementHistory.length ? (
          <Space direction="vertical" size={12} className="full-width">
            {agentReplacementHistory.map((entry) => (
              <Card
                key={entry.id}
                size="small"
                title={`${new Date(entry.changedAt).toLocaleString('zh-CN', { hour12: false })} · ${entry.changedBy}`}
                extra={<Tag color={entry.state === 'AUDITED_RECREATED' ? 'gold' : 'blue'}>{entry.state === 'AUDITED_RECREATED' ? '原应付作废并重建待审' : '未审应付原位更新'}</Tag>}
              >
                <Space direction="vertical" size={2}>
                  <Text>客服变更原因：{entry.requestReason || '-'}</Text>
                  <Text>市场处理备注：{entry.resolutionNote || '-'}</Text>
                </Space>
                <Table
                  rowKey="field"
                  size="small"
                  pagination={false}
                  style={{ marginTop: 10 }}
                  dataSource={entry.changes}
                  columns={[
                    { title: '字段', dataIndex: 'label', width: 150 },
                    { title: '修改前', dataIndex: 'before', render: formatAgentReplacementAuditValue },
                    { title: '修改后', dataIndex: 'after', render: formatAgentReplacementAuditValue }
                  ]}
                />
              </Card>
            ))}
          </Space>
        ) : <Alert type="info" showIcon message="暂无更换代理记录" />}
      </Modal>
      <Modal
        title="代理退回重排"
        open={Boolean(rerouteShipment) && canViewAgentChannel}
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

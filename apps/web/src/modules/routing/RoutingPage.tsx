import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, App as AntdApp, AutoComplete, Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Segmented, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import { Activity, Boxes, ClipboardCheck, RotateCcw, Sparkles } from 'lucide-react';
import {
  createFulfillmentAdvice,
  type BusinessCostAuditSummary,
  type FinanceCatalogItemSummary,
  type PayableAuditSummary,
  type ShipmentFinanceDetailSummary,
  type MasterDataSnapshot,
  type Shipment,
  type ShipmentStatus
} from '@siyuan/shared';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { agentFieldLabels } from '../shared/agentFieldLabels';
import { createPendingRoutingColumns } from '../shared/pendingRoutingColumns';
import { getRoutingAgentChannelName, getRoutingAgentShortName } from './routingAgentDisplay';
import { createRoutingFeeNameOptions } from './routingFeeCatalog';
import { selectRecentRoutedShipmentHistory, selectRoutedShipmentHistory } from './routingHistory';
import { getRoutingPeriodSnapshot, type RoutingDataPeriod } from './routingPeriod';
import { emptyRoutedShipmentFilters, filterRoutedShipments, type RoutedShipmentFilters } from './routingRoutedFilters';
import { formatRoutingFeeStatus } from './routingFeeStatus';
import { countryOptions, filterLocationOption } from '../finance/entry/countryStateOptions';
import { AppActionGroup, AppDateRangePicker, AppPageHeader, ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, ManagedTable, MetricCard, RoutingStatusTag, renderNoticeBar, resolveListPaginationChange, tenRowTablePagination, type ManagedTableColumns } from '../shared/ui';
import type { PermissionKey } from '../../apiClient';
import { formatBeijingDate, formatBeijingDateTime, getBeijingDayStartTimestamp } from '../shared/format';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';

const { Text } = Typography;

export interface RoutingAssignmentFormValues {
  destinationCountry?: string;
  agentId?: string;
  channelId?: string;
  manualChannelName?: string;
  agentChannelName?: string;
  shippingMarkRequired?: boolean;
  saveAgentChannelToMasterData?: boolean;
}

export interface RoutingPageConfig {
  title: string;
  description: string;
  capabilities: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
}

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

function normalizeAgentChannelName(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function matchesRoutingFilter(value: string | undefined, keyword: string) {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  return !normalizedKeyword || (value ?? '').toLocaleLowerCase().includes(normalizedKeyword);
}

export function filterPendingRoutingShipments(shipments: Shipment[], filters: PendingRoutingFilters) {
  return shipments.filter((shipment) => (
    matchesRoutingFilter(shipment.salesperson, filters.salesperson)
    && matchesRoutingFilter(shipment.customerCode, filters.customerCode)
    && (matchesRoutingFilter(resolveShipmentOutboundOrderNo(shipment), filters.systemOrderNo) || matchesRoutingFilter(shipment.systemOrderNo, filters.systemOrderNo))
  ));
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
  key: 'pending' | 'routing' | 'outbound' | 'risk';
  title: string;
  description: string;
  tone: MarketStatusTone;
  icon: ReactNode;
  actions: MarketStatusAction[];
};
type PendingRoutingCostRow = {
  id: string;
  shipmentId: string;
  name: string;
  amount: number;
  currency?: string;
  rmbAmount?: number;
  chargeWeightKg?: number;
  unitPrice?: number;
  reconciliationStatus?: string;
  customerCode?: string;
  systemOrderNo?: string;
  transferNo?: string;
};

type PendingRoutingCostEditor = {
  type: 'BUSINESS_COST' | 'PAYABLE';
  id?: string;
  name: string;
  currency: string;
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
  onOpenAssignment,
  onApproveRouting,
  onCancelAssignment,
  onConfirmAssignment,
  onRerouteShipment,
  onEditShipment,
  onViewRoutingLog,
  onViewPendingRoutingLog,
  onSavePendingRoutingCost,
  onDeletePendingRoutingCost,
  onAiAssist,
  aiLoading
}: {
  config: RoutingPageConfig;
  notice?: string | null;
  shipments: Shipment[];
  assignmentShipment: Shipment | null;
  assignmentForm: FormInstance<RoutingAssignmentFormValues>;
  masterData: MasterDataSnapshot;
  feeNameCatalogItems: FinanceCatalogItemSummary[];
  businessCostAudits?: BusinessCostAuditSummary[];
  payableAudits?: PayableAuditSummary[];
  assignmentFinanceDetail?: ShipmentFinanceDetailSummary;
  permissions: PermissionKey[];
  onOpenAssignment: (shipment: Shipment) => void;
  onApproveRouting: (shipment: Shipment) => Promise<void>;
  onCancelAssignment: () => void;
  onConfirmAssignment: () => Promise<boolean>;
  onRerouteShipment: (shipment: Shipment, reason: string) => Promise<void>;
  onEditShipment: (shipment: Shipment) => void;
  onViewRoutingLog: (shipment: Shipment) => void;
  onViewPendingRoutingLog: (shipment: Shipment) => void;
  onSavePendingRoutingCost: (shipment: Shipment, type: 'BUSINESS_COST' | 'PAYABLE', feeId: string | undefined, input: { name: string; currency: string; chargeWeightKg?: number; unitPrice?: number; amount: number }) => Promise<void>;
  onDeletePendingRoutingCost: (shipment: Shipment, feeId: string) => Promise<void>;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const { message: messageApi } = AntdApp.useApp();
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = (permission: PermissionKey) => permissionSet.has(permission);
  const canViewDashboard = can('market:dashboard:view');
  const canViewPending = can('market:pending-routing:view');
  const canViewRouted = can('market:routed:view');
  const canViewWeekly = can('market:weekly-routing:view');
  const canAssign = can('market:pending-routing:assign');
  const canSaveDraft = can('market:pending-routing:save-draft');
  const canConfirm = can('market:pending-routing:confirm') && can('market:pending-routing:audit');
  const canUpdatePending = can('market:pending-routing:update');
  const canUpdateRouted = can('market:routed:update');
  const canReroute = can('market:routed:reroute');
  const canViewPendingLog = can('market:pending-routing:operation-log-view');
  const canViewRoutedLog = can('market:routed:log-view');
  const canViewBusinessCost = can('market:pending-routing:business-cost-view');
  const canViewPayableCost = can('market:pending-routing:payable-cost-view');
  const canViewAgentChannel = can('market:pending-routing:agent-channel-view') || can('market:routed:agent-channel-view');
  const canViewRouteCosts = can('market:pending-routing:cost-field-view') || can('market:routed:agent-cost-view') || can('market:routed:cost-total-view');
  const routingSubItems = useMemo<ModuleSubNavItem[]>(
    () => [
      canViewDashboard ? { key: 'market-dashboard', label: '市场看板', description: '市场作业总览' } : null,
      canViewPending ? { key: 'pending-routing', label: '待排货', description: '市场排货' } : null,
      canViewRouted ? { key: 'routed', label: '已排货', description: '等待仓库出库' } : null,
      canViewWeekly ? { key: 'weekly-routing', label: '排货数据', description: '按本周或本月统计' } : null
    ].filter(Boolean) as ModuleSubNavItem[],
    [canViewDashboard, canViewPending, canViewRouted, canViewWeekly]
  );
  const [activeSection, setActiveSection] = useState(() => routingSubItems[0]?.key ?? 'market-dashboard');
  const [businessClock, setBusinessClock] = useState(() => Date.now());
  const [routingDataPeriod, setRoutingDataPeriod] = useState<RoutingDataPeriod>('week');
  const [rerouteShipment, setRerouteShipment] = useState<Shipment | null>(null);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [rerouteForm] = Form.useForm<{ reason?: string }>();
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
  const watchedAgentChannelName = Form.useWatch('agentChannelName', assignmentForm);
  const feeNameOptions = useMemo(() => createRoutingFeeNameOptions(feeNameCatalogItems), [feeNameCatalogItems]);

  useEffect(() => {
    if (!routingSubItems.some((item) => item.key === activeSection)) {
      setActiveSection(routingSubItems[0].key);
    }
  }, [activeSection, routingSubItems]);

  useEffect(() => {
    const timer = window.setInterval(() => setBusinessClock(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submitAssignment = async () => {
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
      return await onConfirmAssignment();
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
  const marketStatusGroups = useMemo<MarketStatusGroup[]>(() => [
    {
      key: 'pending',
      title: '待处理',
      description: '需要市场立即排货',
      tone: pendingShipments.length > 0 ? 'amber' : 'gray',
      icon: <Boxes size={18} />,
      actions: [
        {
          label: '待排货',
          value: pendingShipments.length,
          helper: '等待市场分配代理渠道',
          tone: pendingShipments.length > 0 ? 'amber' : 'gray',
          sectionKey: 'pending-routing'
        }
      ]
    },
    {
      key: 'routing',
      title: '流转中',
      description: '排货历史与当前待出库进度',
      tone: waitingDispatchShipments.length > 0 ? 'blue' : 'gray',
      icon: <Activity size={18} />,
      actions: [
        {
          label: '已排货',
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
      key: 'outbound',
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
      key: 'risk',
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
    pendingShipments.length,
    periodDeclaredCount,
    periodOutboundShipments.length,
    periodSensitiveCount,
    reroutedInPeriod.length,
    routedShipments.length,
    waitingDispatchShipments.length,
    routingPeriodLabel,
    todayOutboundShipments.length,
    todayRoutedShipments.length
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
    () => watchedAgentId ? masterData.agentChannels
      .filter((channel) => channel.enabled && channel.agentId === watchedAgentId)
      .map((channel) => ({
        value: channel.channelName,
        label: channel.channelName
      })) : [],
    [masterData.agentChannels, watchedAgentId]
  );
  const selectedAgent = useMemo(
    () => masterData.agents.find((agent) => agent.id === watchedAgentId),
    [masterData.agents, watchedAgentId]
  );
  const matchedAgentChannel = useMemo(() => {
    const normalizedName = normalizeAgentChannelName(watchedAgentChannelName);
    if (!watchedAgentId || !normalizedName) return undefined;
    const matchingChannels = masterData.agentChannels.filter((channel) => (
      channel.agentId === watchedAgentId
      && normalizeAgentChannelName(channel.channelName) === normalizedName
    ));
    return matchingChannels.find((channel) => channel.enabled) ?? matchingChannels[0];
  }, [masterData.agentChannels, watchedAgentChannelName, watchedAgentId]);
  const isNewAgentChannel = Boolean(
    watchedAgentId
    && normalizeAgentChannelName(watchedAgentChannelName)
    && !matchedAgentChannel
  );
  const isDisabledAgentChannel = matchedAgentChannel?.enabled === false;

  const marketColumns: ColumnsType<Shipment> = useMemo(
    () => [
      { title: '进入时间', dataIndex: 'createdAt', width: 160, render: (_: string, record) => formatBeijingDateTime(getRoutingStageTime(record)) },
      { title: '站点', dataIndex: 'site', width: 90, render: (value?: string) => value || '-' },
      { title: '业务员', dataIndex: 'salesperson', width: 100, render: (value?: string) => value || '-' },
      { title: '客户编号', dataIndex: 'customerCode', width: 100, render: (value: string | undefined, record) => value || record.customerName.split('-')[0] },
      { title: '客户', dataIndex: 'customerName', width: 150 },
      { title: '出货单号', dataIndex: 'systemOrderNo', width: 180, render: (_: string, record) => resolveShipmentOutboundOrderNo(record) },
      { key: 'cargoData', title: '货物数据', width: 140, render: (_, record) => `${record.packageCount} 件 / ${record.receivableWeightKg.toFixed(2)} kg` },
      { title: '目的地', dataIndex: 'destinationCountry', width: 90 },
      ...(canViewAgentChannel ? [
        { title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 190, className: 'managed-table-wrap-cell', render: (value?: string) => value || '待分配' },
        { title: agentFieldLabels.channel, dataIndex: 'routeAgentChannelName', width: 150, className: 'managed-table-wrap-cell', render: (_: string | undefined, record: Shipment) => getRoutingAgentChannelName(record) }
      ] : []),
      ...(canViewRouteCosts ? [
        { title: '计费重', dataIndex: 'routeChargeWeightKg', width: 110, align: 'right' as const, render: (value?: number) => formatWeight(value) },
        { title: '单价', dataIndex: 'routeUnitPrice', width: 100, align: 'right' as const, render: (value: number | undefined, record: Shipment) => formatAmount(value, record.routeCurrency) },
        { title: '其他费用', dataIndex: 'routeOtherFee', width: 110, align: 'right' as const, render: (value: number | undefined, record: Shipment) => formatAmount(value, record.routeCurrency) },
        { title: '总成本', dataIndex: 'routeCostTotal', width: 110, align: 'right' as const, render: (value: number | undefined, record: Shipment) => formatAmount(value, record.routeCurrency) }
      ] : []),
      { title: '状态', dataIndex: 'status', width: 110, render: (status: ShipmentStatus) => <RoutingStatusTag status={status} /> },
      {
        key: 'routingAdvice',
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
        key: 'routingAction',
        title: '排货操作',
        width: 68,
        resizable: false,
        fixed: 'right',
        className: 'routing-routed-action-column',
        render: (_, record) => {
          const canAssignRoute = record.status === 'WAITING_SORT';
          const canManualEdit = record.status === 'WAITING_DISPATCH';
          const canRerouteRecord = ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(record.status);

          return (
            <Space direction="vertical" size={4} className="routing-routed-actions">
              {canAssignRoute && canAssign ? (
                <Button size="small" onClick={() => onOpenAssignment(record)}>
                  排货
                </Button>
              ) : null}
              {canManualEdit && canUpdateRouted ? (
                <Button size="small" onClick={() => onEditShipment(record)}>
                  修改
                </Button>
              ) : null}
              {canViewRoutedLog ? <Button size="small" onClick={() => onViewRoutingLog(record)}>排货日志</Button> : null}
              {canRerouteRecord && canReroute ? (
                <Button size="small" onClick={() => setRerouteShipment(record)}>
                  退回重排
                </Button>
              ) : null}
            </Space>
          );
        }
      }
    ],
    [canAssign, canReroute, canUpdateRouted, canViewAgentChannel, canViewRouteCosts, canViewRoutedLog, onEditShipment, onOpenAssignment, onViewRoutingLog]
  );

  const weeklyColumns: ColumnsType<Shipment> = useMemo(
    () => marketColumns.filter((column) => column.title !== '排货建议'),
    [marketColumns]
  );
  const pendingColumns: ColumnsType<Shipment> = useMemo(
    () => createPendingRoutingColumns({
      businessCostAudits,
      payableAudits,
      mode: 'market',
      presentation: 'matrix',
      onRoute: canAssign ? onOpenAssignment : undefined,
      onApprove: canConfirm ? (shipment) => void onApproveRouting(shipment) : undefined,
      onModify: canUpdatePending ? onOpenAssignment : undefined,
      onViewLog: canViewPendingLog ? onViewPendingRoutingLog : undefined,
      canViewBusinessCost,
      canViewPayableCost,
      canViewAgentChannel
    }),
    [businessCostAudits, payableAudits, canAssign, canConfirm, canUpdatePending, canViewAgentChannel, canViewBusinessCost, canViewPayableCost, canViewPendingLog, onApproveRouting, onOpenAssignment, onViewPendingRoutingLog]
  );
  const pendingDetailColumns: ColumnsType<Shipment> = useMemo(
    () => createPendingRoutingColumns({
      businessCostAudits,
      payableAudits,
      mode: 'market',
      presentation: 'columns',
      onRoute: canAssign ? onOpenAssignment : undefined,
      onApprove: canConfirm ? (shipment) => void onApproveRouting(shipment) : undefined,
      onModify: canUpdatePending ? onOpenAssignment : undefined,
      onViewLog: canViewPendingLog ? onViewPendingRoutingLog : undefined,
      canViewBusinessCost,
      canViewPayableCost,
      canViewAgentChannel
    }),
    [businessCostAudits, payableAudits, canAssign, canConfirm, canUpdatePending, canViewAgentChannel, canViewBusinessCost, canViewPayableCost, canViewPendingLog, onApproveRouting, onOpenAssignment, onViewPendingRoutingLog]
  );

  const assignmentBusinessCosts = useMemo(
    () => assignmentShipment
      ? (assignmentFinanceDetail?.businessCosts ?? (businessCostAudits ?? []).filter((fee) => fee.shipmentId === assignmentShipment.id || fee.systemOrderNo === assignmentShipment.systemOrderNo))
        .map((fee) => ({ ...fee, customerCode: assignmentShipment.customerCode, systemOrderNo: resolveShipmentOutboundOrderNo(assignmentShipment), transferNo: assignmentShipment.transferNo }))
      : [],
    [assignmentShipment, assignmentFinanceDetail, businessCostAudits]
  );
  const assignmentPayables = useMemo(
    () => assignmentShipment
      ? (assignmentFinanceDetail?.payables ?? (payableAudits ?? []).filter((fee) => fee.shipmentId === assignmentShipment.id || fee.systemOrderNo === assignmentShipment.systemOrderNo))
        .map((fee) => ({ ...fee, customerCode: assignmentShipment.customerCode, systemOrderNo: resolveShipmentOutboundOrderNo(assignmentShipment), transferNo: assignmentShipment.transferNo }))
      : [],
    [assignmentShipment, assignmentFinanceDetail, payableAudits]
  );

  function openCostEditor(type: 'BUSINESS_COST' | 'PAYABLE', row?: { id: string; name: string; currency?: string; chargeWeightKg?: number; unitPrice?: number; amount?: number }) {
    setCostEditor({
      type,
      id: row?.id,
      name: row?.name ?? '',
      currency: row?.currency ?? 'RMB',
      chargeWeightKg: row?.chargeWeightKg,
      unitPrice: row?.unitPrice,
      amount: row?.amount
    });
  }

  function updateCostEditor(values: Partial<PendingRoutingCostEditor>, calculateAmount = false) {
    setCostEditor((current) => {
      if (!current) return current;
      const next = { ...current, ...values };
      if (calculateAmount && next.chargeWeightKg !== undefined && next.unitPrice !== undefined) {
        next.amount = Number((next.chargeWeightKg * next.unitPrice).toFixed(2));
      }
      return next;
    });
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
    if (costEditor.amount === undefined) {
      messageApi.warning('请填写总金额。');
      return;
    }
    setCostSaving(true);
    try {
      await onSavePendingRoutingCost(assignmentShipment, costEditor.type, costEditor.id, {
        name: costEditor.name.trim(),
        currency: costEditor.currency,
        chargeWeightKg: costEditor.chargeWeightKg,
        unitPrice: costEditor.unitPrice,
        amount: costEditor.amount
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
    const canEditCost = canUpdatePending && (type === 'BUSINESS_COST' ? canViewBusinessCost : canViewPayableCost);
    const editingThisType = costEditor?.type === type;
    const editableRows: PendingRoutingCostRow[] = editingThisType && !costEditor.id && assignmentShipment
      ? [...rows, {
          id: '__new_cost__',
          shipmentId: assignmentShipment.id,
          name: '',
          amount: 0,
          currency: costEditor.currency,
          customerCode: assignmentShipment.customerCode,
          systemOrderNo: resolveShipmentOutboundOrderNo(assignmentShipment),
          transferNo: assignmentShipment.transferNo
        }]
      : rows;
    const isEditingRow = (row: PendingRoutingCostRow) => editingThisType && (costEditor.id ? row.id === costEditor.id : row.id === '__new_cost__');
    return (
      <Space direction="vertical" size={12} className="full-width">
        <Flex justify="space-between" align="center">
          <Text type="secondary">按运单归并；金额优先按计费重 × 单价自动计算，合计按 RMB 口径展示。</Text>
          {canEditCost ? <Button size="small" disabled={Boolean(costEditor)} onClick={() => openCostEditor(type)}>新增费用</Button> : null}
        </Flex>
        <Table
          className="routing-assignment-cost-table"
          size="small"
          rowKey="id"
          pagination={false}
          scroll={{ x: 1080 }}
          dataSource={editableRows}
          locale={{ emptyText: '暂无费用明细' }}
          columns={[
            {
              title: '费用名称', dataIndex: 'name', width: 150,
              render: (value: string, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <Select
                  aria-label="费用名称"
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择费用名称"
                  value={costEditor?.name || undefined}
                  options={feeNameOptions}
                  notFoundContent="暂无启用费用名称"
                  onChange={(name) => {
                    const currency = feeNameOptions.find((item) => item.value === name)?.currency;
                    updateCostEditor({ name, ...(currency === 'RMB' || currency === 'USD' ? { currency } : {}) });
                  }}
                />
              ) : value
            },
            { title: '客户编号', dataIndex: 'customerCode', width: 100 },
            { title: '出货单号', dataIndex: 'systemOrderNo', width: 150 },
            { title: '转单号', dataIndex: 'transferNo', width: 130, render: (value?: string) => value || '-' },
            { title: '对账状态', dataIndex: 'reconciliationStatus', width: 100, render: (value?: string) => formatRoutingFeeStatus(value) },
            {
              title: '币种', dataIndex: 'currency', width: 90,
              render: (value: string | undefined, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <Select aria-label="币种" value={costEditor?.currency} options={[{ label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} onChange={(currency) => updateCostEditor({ currency })} />
              ) : value
            },
            {
              title: '计费重', dataIndex: 'chargeWeightKg', width: 105,
              render: (value: number | undefined, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <InputNumber aria-label="计费重" min={0} precision={3} value={costEditor?.chargeWeightKg} onChange={(chargeWeightKg) => updateCostEditor({ chargeWeightKg: chargeWeightKg ?? undefined }, true)} />
              ) : value ? `${value.toFixed(2)} kg` : '-'
            },
            {
              title: '单价', dataIndex: 'unitPrice', width: 100,
              render: (value: number | undefined, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <InputNumber aria-label="单价" min={0} precision={2} value={costEditor?.unitPrice} onChange={(unitPrice) => updateCostEditor({ unitPrice: unitPrice ?? undefined }, true)} />
              ) : value?.toFixed(2) ?? '-'
            },
            {
              title: '总金额', dataIndex: 'amount', width: 120,
              render: (value: number, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <InputNumber aria-label="总金额" min={0} precision={2} value={costEditor?.amount} onChange={(amount) => updateCostEditor({ amount: amount ?? undefined })} />
              ) : `${value.toFixed(2)} ${row.currency ?? 'RMB'}`
            },
            canEditCost ? {
              title: '操作', width: 120, fixed: 'right' as const, render: (_: unknown, row: PendingRoutingCostRow) => isEditingRow(row) ? (
                <Space size={4}>
                  <Button size="small" type="primary" loading={costSaving} onClick={() => void saveCostEditor()}>保存</Button>
                  <Button size="small" disabled={costSaving} onClick={() => setCostEditor(null)}>取消</Button>
                </Space>
              ) : (
                <Space size={4}>
                  <Button size="small" disabled={Boolean(costEditor)} onClick={() => openCostEditor(type, row)}>修改</Button>
                  <Button size="small" danger disabled={Boolean(costEditor)} onClick={() => assignmentShipment && void onDeletePendingRoutingCost(assignmentShipment, row.id)}>删除</Button>
                </Space>
              )
            } : null
          ].filter(Boolean) as ColumnsType<PendingRoutingCostRow>}
          summary={() => <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={8}>合计（RMB）</Table.Summary.Cell><Table.Summary.Cell index={8}>{total.toFixed(2)} RMB</Table.Summary.Cell><Table.Summary.Cell index={9} /></Table.Summary.Row>}
        />
      </Space>
    );
  }
  const routedColumns: ManagedTableColumns<Shipment> = useMemo(
    () => {
      const costColumns: ColumnsType<Shipment> = [];
      if (canViewBusinessCost) {
        costColumns.push(
          { key: 'businessCosts', title: '业务成本', width: 150, render: (_: unknown, record: Shipment) => renderFeeRows(sameShipmentFees(record)) },
          {
            key: 'businessCostTotal',
            title: '业务成本合计', width: 112, align: 'right',
            render: (_: unknown, record: Shipment) => formatAmount(sameShipmentFees(record).reduce((sum, fee) => sum + fee.amount, 0))
          }
        );
      }
      if (canViewRouteCosts) {
        costColumns.push(
          {
            key: 'marketCosts',
            title: '市场成本', width: 128,
            render: (_: unknown, record: Shipment) => record.routeCostTotal ? <Text>代理成本 {formatAmount(record.routeCostTotal, record.routeCurrency)}</Text> : <Text type="secondary">-</Text>
          },
          { key: 'marketCostTotal', title: '市场成本合计', width: 112, align: 'right', render: (_: unknown, record: Shipment) => formatAmount(record.routeCostTotal, record.routeCurrency) }
        );
      }
      const statusIndex = marketColumns.findIndex((column) => column.title === '状态');
      const outboundTimeColumn = {
        key: 'outboundAt',
        title: '出库时间',
        width: 136,
        render: (_: unknown, record: Shipment) => record.outboundAt ? formatBeijingDateTime(record.outboundAt) : '-'
      };
      const columns = statusIndex >= 0
        ? [...marketColumns.slice(0, statusIndex), ...costColumns, outboundTimeColumn, ...marketColumns.slice(statusIndex)]
        : [...marketColumns, ...costColumns];
      const agentIndex = columns.findIndex((column) => column.title === agentFieldLabels.detailedCompanyName);
      const columnsWithAgentShortName = agentIndex >= 0
        ? [
            ...columns.slice(0, agentIndex + 1),
            {
              key: 'agentShortName',
              title: agentFieldLabels.shortName,
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
        [agentFieldLabels.detailedCompanyName, 190],
        [agentFieldLabels.shortName, 96],
        [agentFieldLabels.channel, 150],
        ['计费重', 92],
        ['单价', 88],
        ['其他费用', 96],
        ['总成本', 96],
        ['出库时间', 136],
        ['状态', 96],
        ['排货操作', 68]
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
    [businessCostAudits, canViewBusinessCost, canViewRouteCosts, marketColumns, masterData.agents]
  );

  const routedMatrixColumns: ManagedTableColumns<Shipment> = useMemo(() => {
    const actionColumn = routedColumns.find((column) => String(column.title ?? '') === '排货操作');
    return [
      {
        key: 'matrixInformation',
        title: '信息',
        width: 960,
        className: 'managed-matrix-group-primary',
        render: (_: unknown, record: Shipment) => {
          const businessCosts = sameShipmentFees(record);
          const businessCostTotal = businessCosts.reduce((sum, fee) => sum + fee.amount, 0);
          const advice = createFulfillmentAdvice(record);
          return (
            <ManagedMatrixCell
              columns={4}
              labelWidth={76}
              fields={[
                { key: 'createdAt', label: '录单时间', value: <ManagedMatrixDateTime value={formatBeijingDateTime(record.createdAt)} /> },
                { key: 'routedAt', label: '排货时间', value: <ManagedMatrixDateTime value={formatBeijingDateTime(record.routedAt ?? record.createdAt)} /> },
                { key: 'site', label: '站点', value: record.site || '-' },
                { key: 'salesperson', label: '业务员', value: record.salesperson || '-' },
                { key: 'customerCode', label: '客户编号', value: record.customerCode || record.customerName.split('-')[0] || '-' },
                { key: 'customer', label: '客户', value: record.customerName, title: record.customerName, wrap: true, emphasis: true },
                { key: 'systemOrderNo', label: '出货单号', value: resolveShipmentOutboundOrderNo(record), title: resolveShipmentOutboundOrderNo(record), emphasis: true },
                { key: 'transferNo', label: '转单号', value: record.transferNo || '-', title: record.transferNo },
                { key: 'destinationCountry', label: '目的地', value: record.destinationCountry || '-' },
                { key: 'packageCount', label: '件数', value: `${record.packageCount} 件` },
                { key: 'receivableWeightKg', label: '应收计费重', value: formatWeight(record.receivableWeightKg) },
                canViewAgentChannel ? { key: 'agentName', label: agentFieldLabels.detailedCompanyName, value: record.agentName || '待分配', title: record.agentName, wrap: true } : null,
                canViewAgentChannel ? { key: 'agentShortName', label: agentFieldLabels.shortName, value: getRoutingAgentShortName(record, masterData.agents) } : null,
                canViewAgentChannel ? { key: 'agentChannel', label: agentFieldLabels.channel, value: getRoutingAgentChannelName(record), title: getRoutingAgentChannelName(record), wrap: true } : null,
                canViewBusinessCost ? { key: 'businessCostTotal', label: '业务成本合计', value: formatAmount(businessCostTotal), emphasis: true } : null,
                canViewRouteCosts ? { key: 'routeChargeWeightKg', label: '代理计费重', value: formatWeight(record.routeChargeWeightKg) } : null,
                canViewRouteCosts ? { key: 'routeUnitPrice', label: '代理单价', value: formatAmount(record.routeUnitPrice, record.routeCurrency) } : null,
                canViewRouteCosts ? { key: 'routeOtherFee', label: '代理其他费用', value: formatAmount(record.routeOtherFee, record.routeCurrency) } : null,
                canViewRouteCosts ? { key: 'routeCostTotal', label: '代理成本合计', value: formatAmount(record.routeCostTotal, record.routeCurrency), emphasis: true } : null,
                { key: 'status', label: '状态', value: <RoutingStatusTag status={record.status} /> },
                { key: 'outboundAt', label: '出库时间', value: record.outboundAt ? <ManagedMatrixDateTime value={formatBeijingDateTime(record.outboundAt)} /> : '-' },
                { key: 'advice', label: '下一步', value: advice.nextAction, wrap: true },
                { key: 'riskReasons', label: '风险原因', value: advice.riskReasons.join('、'), title: advice.riskReasons.join('、'), wrap: true },
                record.remark ? { key: 'remark', label: '备注', value: record.remark, title: record.remark, wrap: true } : null
              ]}
            />
          );
        }
      },
      actionColumn
        ? {
            ...actionColumn,
            title: '操作',
            width: 68,
            fixed: 'right'
          }
        : {
            key: 'routingAction',
            title: '操作',
            width: 68,
            resizable: false,
            fixed: 'right',
            className: 'routing-routed-action-column',
            render: () => null
          }
    ];
  }, [canViewAgentChannel, canViewBusinessCost, canViewRouteCosts, masterData.agents, routedColumns]);

  return (
    <>
      <AppPageHeader
        title={config.title}
        description={<><span>{config.description}</span><div><Tag color="blue">硅基流动</Tag></div></>}
        actions={(
          <AppActionGroup>
            {can('market:weekly-routing:export') ? <Button icon={<ClipboardCheck size={16} />}>导出</Button> : null}
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
                      agentName: shipment.agentName,
                      channelName: shipment.channelName,
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
                      key={group.key}
                      className={`market-status-card market-status-card-${group.tone}`}
                      title={(
                        <Flex align="center" gap={8} className="market-status-title">
                          <span className={`market-status-icon market-status-icon-${group.tone}`}>{group.icon}</span>
                          <span>{group.title}</span>
                        </Flex>
                      )}
                      extra={group.key === 'risk' ? renderRoutingPeriodSelector('风险统计周期') : undefined}
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
                  extra={renderRoutingPeriodSelector('排货汇总统计周期')}
                >
                  <Row gutter={[16, 12]}>
                    {can('market:dashboard:agent-stats-view') ? <Col xs={24} lg={8}>
                      <Text strong>{routingPeriodLabel}排货代理</Text>
                      {renderMarketStatList(periodAgentStats, `${routingPeriodLabel}暂无排货代理`)}
                    </Col> : null}
                    {can('market:dashboard:channel-mode-stats-view') ? <Col xs={24} lg={8}>
                      <Text strong>{routingPeriodLabel}排货渠道（空运/海运）</Text>
                      {renderMarketStatList(periodChannelModeStats, `${routingPeriodLabel}暂无排货渠道`)}
                    </Col> : null}
                    {can('market:dashboard:sensitive-summary-view') ? <>
                    <Col xs={12} lg={4}>
                      <Statistic title={`${routingPeriodLabel}敏感货物`} value={periodSensitiveCount} suffix="票" />
                      <Text type="secondary">带电/带磁/敏感</Text>
                    </Col>
                    <Col xs={12} lg={4}>
                      <Statistic title={`${routingPeriodLabel}报关货物`} value={periodDeclaredCount} suffix="票" />
                      <Text type="secondary">需要报关</Text>
                    </Col>
                    </> : null}
                  </Row>
                </Card>
              </Space>
            ) : null}

            {activeSection === 'pending-routing' ? (
              <Card className="module-grid routing-pending-card" title="待排货">
                <ManagedDualViewTable
                  viewStorageKey="sunny.routing.pending.view-v1"
                  viewAriaLabel="待排货表格视图"
                  defaultView="matrix"
                  shellClassName="routing-pending-dual-table"
                  views={{
                    matrix: {
                      label: '矩阵视图',
                      columns: pendingColumns,
                      tableProps: {
                        className: 'routing-pending-table routing-pending-matrix-table',
                        rowClassName: 'pending-routing-matrix-row',
                        minimumScrollX: 1220,
                        recordDetail: { title: '待排货详情', columns: pendingDetailColumns },
                        columnSettings: can('market:pending-routing:column-setting')
                          ? { storageKey: 'sunny.routing.pending.columns.market-matrix-v3', title: '待排货矩阵列设置' }
                          : undefined
                      }
                    },
                    ledger: {
                      label: '精密台账模式',
                      columns: pendingDetailColumns,
                      tableProps: {
                        className: 'routing-pending-table routing-pending-ledger-table',
                        minimumScrollX: 1750,
                        recordDetail: { title: '待排货详情', columns: pendingDetailColumns },
                        columnSettings: can('market:pending-routing:column-setting')
                          ? { storageKey: 'sunny.routing.pending.columns.market-ledger-v1', title: '待排货精密台账列设置' }
                          : undefined
                      }
                    }
                  }}
                  rowKey="id"
                  size="small"
                  density="compact"
                  dataSource={filteredPendingShipments}
                  pagination={{
                    ...tenRowTablePagination,
                    current: pendingPagination.current,
                    pageSize: pendingPagination.pageSize,
                    onChange: (current, pageSize) => setPendingPagination((previous) => resolveListPaginationChange(previous, current, pageSize))
                  }}
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
                  columnSettingsPlacement="toolbar"
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
                        { label: '排货历史', value: 'history' }
                      ]}
                      onChange={(value) => {
                        setRoutedView(value as 'recent' | 'history');
                        setRoutedPagination((current) => ({ ...current, current: 1 }));
                      }}
                    />
                  </Space>
                )}
              >
                <ManagedDualViewTable
                  viewStorageKey="sunny.routing.routed.view-v1"
                  viewAriaLabel="已排货表格视图"
                  defaultView="matrix"
                  shellClassName="routing-routed-dual-table"
                  views={{
                    matrix: {
                      label: '矩阵视图',
                      columns: routedMatrixColumns,
                      tableProps: {
                        className: 'routing-routed-table routing-routed-matrix-table',
                        minimumScrollX: 0,
                        tableLayout: 'fixed',
                        showHeader: false,
                        recordDetail: {
                          title: routedView === 'history' ? '排货历史详情' : '已排货详情',
                          columns: routedColumns
                        },
                        columnSettings: can('market:routed:column-setting')
                          ? { storageKey: 'sunny.routing.routed.matrix-columns-v2', title: '已排货矩阵列设置' }
                          : false
                      }
                    },
                    ledger: {
                      label: '精密台账模式',
                      columns: routedColumns,
                      tableProps: {
                        className: 'routing-routed-table routing-routed-ledger-table',
                        minimumScrollX: 2376,
                        recordDetail: { title: routedView === 'history' ? '排货历史详情' : '已排货详情' },
                        columnSettings: can('market:routed:column-setting')
                          ? { storageKey: 'sunny.routing.routed.columns', title: '已排货台账列设置' }
                          : false
                      }
                    }
                  }}
                  rowKey="id"
                  size="small"
                  dataSource={filteredRoutedShipments}
                  locale={{ emptyText: routedView === 'history' ? '暂无排货历史' : '近30天暂无已排货记录' }}
                  pagination={{
                    ...tenRowTablePagination,
                    current: routedPagination.current,
                    pageSize: routedPagination.pageSize,
                    onChange: (current, pageSize) => setRoutedPagination((previous) => resolveListPaginationChange(previous, current, pageSize))
                  }}
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
                  columnSettingsPlacement="toolbar"
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
                  <Col xs={24} md={8}><MetricCard icon={<ClipboardCheck />} title={`${routingPeriodLabel}已排`} value={periodRoutedShipments.length} extra="市场已分配代理渠道" /></Col>
                  <Col xs={24} md={8}><MetricCard icon={<Activity />} title={`${routingPeriodLabel}未出库`} value={periodRoutedShipments.filter((item) => item.status === 'WAITING_DISPATCH').length} extra="等待仓库确认出库" /></Col>
                  <Col xs={24} md={8}><MetricCard icon={<Boxes />} title={`${routingPeriodLabel}已出库`} value={periodRoutedShipments.filter((item) => item.status !== 'WAITING_DISPATCH').length} extra="仓库已确认出库或后续状态" /></Col>
                </Row>
                <Card className="module-grid" title={`${routingPeriodLabel}排货明细`}>
                  <ManagedTable
                    recordDetail={{ title: `${routingPeriodLabel}排货详情` }}
                    rowKey="id"
                    size="small"
                    columns={weeklyColumns}
                    dataSource={periodDetailShipments}
                    pagination={tenRowTablePagination}
                    minimumScrollX={1750}
                    columnSettings={can('market:weekly-routing:column-setting') ? { storageKey: 'sunny.routing.weekly.columns', title: '排货数据列设置' } : undefined}
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
            {canSaveDraft ? <Button type="primary" loading={assignmentSubmitting} onClick={() => void submitAssignment()}>保存</Button> : null}
          </Space>
        )}
        onCancel={() => { setCostEditor(null); onCancelAssignment(); }}
      >
        <Alert
          className="notice-bar"
          type="info"
          showIcon
          message="保存后返回待排货列表点击审核，审核通过后进入已排货并同步进入仓库待出库。业务成本和应付成本请在下方费用明细中维护。"
        />
        <div className="routing-assignment-sections">
          <section className="routing-assignment-section" aria-labelledby="routing-assignment-basic-title">
            <div className="routing-assignment-section-header">
              <Text strong id="routing-assignment-basic-title">基本信息</Text>
              <Text type="secondary">订单资料、代理与渠道</Text>
            </div>
            <div className="routing-assignment-section-body routing-assignment-basic-body">
              {assignmentShipment ? (
                <Card size="small" className="routing-assignment-context">
                  <Row gutter={[16, 6]}>
                    <Col xs={12} md={6}>日期：{formatBeijingDate(assignmentShipment.reviewedAt ?? assignmentShipment.createdAt)}</Col>
                    <Col xs={12} md={6}>站点：{assignmentShipment.site || '-'}</Col>
                    <Col xs={12} md={6}>业务员：{assignmentShipment.salesperson || '-'}</Col>
                    <Col xs={12} md={6}>客户编号：{assignmentShipment.customerCode || '-'}</Col>
                    <Col xs={12} md={6}>出货单号：{resolveShipmentOutboundOrderNo(assignmentShipment)}</Col>
                    <Col xs={12} md={6}>公司渠道：{assignmentShipment.channelName || '-'}</Col>
                    <Col xs={24} md={12}>货物数据：{assignmentShipment.packageCount} 件 / {assignmentShipment.receivableWeightKg.toFixed(2)} kg / {assignmentShipment.volumeCbm?.toFixed(3) ?? '0.000'} CBM</Col>
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
                      <AutoComplete options={countryOptions} placeholder="例如 美国 / USA" filterOption={filterLocationOption} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={5}>
                    <Form.Item name="agentId" label="代理">
                      <Select
                        showSearch
                        placeholder="选择基础资料里的代理"
                        optionFilterProp="label"
                        onChange={() => assignmentForm.setFieldsValue({
                          agentChannelName: undefined,
                          saveAgentChannelToMasterData: false
                        })}
                        options={masterData.agents
                          .filter((agent) => agent.enabled)
                          .map((agent) => ({
                            label: [agent.shortName, agent.name].filter(Boolean).join(' / '),
                            value: agent.id
                          }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={16} lg={10}>
                    <Form.Item
                      name="agentChannelName"
                      label="代理渠道"
                      extra={isDisabledAgentChannel
                        ? '该渠道已停用，请先到代理渠道资料库启用或输入其他渠道'
                        : watchedAgentId ? '输入可模糊匹配已有渠道；没有匹配项时可直接录入' : '请先选择代理'}
                      rules={[
                        { required: true, whitespace: true, message: '请输入代理渠道' },
                        {
                          validator: () => isDisabledAgentChannel
                            ? Promise.reject(new Error('该代理渠道已停用'))
                            : Promise.resolve()
                        }
                      ]}
                    >
                      <AutoComplete
                        options={agentChannelOptions}
                        disabled={!watchedAgentId}
                        placeholder={watchedAgentId ? '搜索或输入代理渠道' : '选择代理后录入渠道'}
                        filterOption={(input, option) => normalizeAgentChannelName(String(option?.value ?? '')).includes(normalizeAgentChannelName(input))}
                        onChange={() => assignmentForm.setFieldValue('saveAgentChannelToMasterData', false)}
                      />
                    </Form.Item>
                    {isNewAgentChannel ? (
                      <div className="routing-agent-channel-new">
                        <Tag color="orange">新渠道</Tag>
                        <Form.Item name="saveAgentChannelToMasterData" valuePropName="checked" initialValue={false} noStyle>
                          <Checkbox>
                            将“{watchedAgentChannelName?.trim()}”新增到{selectedAgent?.shortName || selectedAgent?.name || '当前代理'}的代理渠道资料库
                          </Checkbox>
                        </Form.Item>
                      </div>
                    ) : null}
                  </Col>
                  <Col xs={24} sm={8} lg={4}>
                    <Form.Item name="shippingMarkRequired" label="出库要求" valuePropName="checked" initialValue={false}>
                      <Checkbox>需要贴麦头</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </div>
          </section>

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

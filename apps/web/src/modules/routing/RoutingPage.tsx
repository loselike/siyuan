import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntdApp, AutoComplete, Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import { Activity, Boxes, ClipboardCheck, FileInput, RotateCcw, Sparkles } from 'lucide-react';
import {
  createFulfillmentAdvice,
  shipmentStatusLabels,
  type BusinessCostAuditSummary,
  type PayableAuditSummary,
  type ShipmentFinanceDetailSummary,
  type MasterDataSnapshot,
  type Shipment,
  type ShipmentStatus
} from '@siyuan/shared';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { createPendingRoutingColumns } from '../shared/pendingRoutingColumns';
import { countryOptions, filterLocationOption } from '../finance/entry/countryStateOptions';
import { downloadCsv } from '../finance/exportCsv';
import { AppActionGroup, AppPageHeader, ManagedTable, MetricCard, RoutingStatusTag, StatusTag, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import type { PermissionKey } from '../../apiClient';

const { Text } = Typography;

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
  chargeWeightKg?: number;
  unitPrice?: number;
  otherFee?: number;
  otherFeeRemark?: string;
  currency?: string;
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
type PendingRoutingCostRow = {
  id: string;
  shipmentId: string;
  name: string;
  amount: number;
  currency?: string;
  rmbAmount?: number;
  chargeWeightKg?: number;
  unitPrice?: number;
  marketEditable?: boolean;
  customerCode?: string;
  systemOrderNo?: string;
  transferNo?: string;
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
  businessCostAudits,
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
  businessCostAudits?: BusinessCostAuditSummary[];
  payableAudits?: PayableAuditSummary[];
  assignmentFinanceDetail?: ShipmentFinanceDetailSummary;
  permissions: PermissionKey[];
  isAdministrator?: boolean;
  onOpenAssignment: (shipment: Shipment, mode?: 'assign' | 'update') => void;
  onApproveRouting: (shipment: Shipment) => Promise<void>;
  onCancelAssignment: () => void;
  onConfirmAssignment: (approve: boolean) => Promise<boolean>;
  onRerouteShipment: (shipment: Shipment, reason: string) => Promise<void>;
  onEditShipment: (shipment: Shipment) => void;
  onViewRoutingLog: (shipment: Shipment) => void;
  onViewPendingRoutingLog: (shipment: Shipment) => void;
  onReturnReview: (shipment: Shipment) => Promise<void> | void;
  onSavePendingRoutingCost: (shipment: Shipment, type: 'BUSINESS_COST' | 'PAYABLE', feeId: string | undefined, input: { name: string; currency: string; chargeWeightKg?: number; unitPrice?: number; amount: number }) => Promise<void>;
  onDeletePendingRoutingCost: (shipment: Shipment, feeId: string) => Promise<void>;
  onLoadRoutingReportExportRows: () => Promise<Shipment[]>;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const { message: messageApi } = AntdApp.useApp();
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = (permission: PermissionKey) => permissionSet.has(permission);
  const hasGlobalMask = (mask: 'agent-short-name' | 'agent-company-name' | 'agent-channel' | 'agent-data' | 'payable-cost') =>
    can(`system:global-mask:${mask}` as PermissionKey);
  const canViewDashboard = can('market:dashboard:view');
  const canViewPending = can('market:pending-routing:view');
  const canViewRouted = can('market:routed:view');
  const canViewWeekly = can('market:routing-report:view');
  const canAssign = can('market:pending-routing:route');
  const canSaveDraft = canAssign || can('market:pending-routing:edit');
  const canCreateAgentChannel = can('master-data:agent-channels:create');
  const canConfirm = can('market:pending-routing:approve');
  const canUpdatePending = can('market:pending-routing:edit');
  const canUpdateRouted = can('market:routed:edit');
  const canReroute = can('market:routed:reroute');
  const canViewPendingLog = can('market:pending-routing:operation-log:view');
  const canViewRoutedLog = can('market:routed:routing-log:view');
  const canReturnReview = can('market:pending-routing:return-review');
  const canViewBusinessCost = can('market:pending-routing:business-cost:view');
  const canViewAgentChannel = !hasGlobalMask('agent-data')
    && !hasGlobalMask('agent-short-name')
    && !hasGlobalMask('agent-company-name')
    && !hasGlobalMask('agent-channel');
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
  const [rerouteShipment, setRerouteShipment] = useState<Shipment | null>(null);
  const [routingReportExporting, setRoutingReportExporting] = useState(false);
  const [assignmentActiveTab, setAssignmentActiveTab] = useState('basic');
  const requestedAssignmentTabRef = useRef<'basic' | 'business-cost'>('basic');
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [rerouteForm] = Form.useForm<{ reason?: string }>();
  const [costEditor, setCostEditor] = useState<{ id?: string } | null>(null);
  const [costForm] = Form.useForm<{ name?: string; currency?: string; chargeWeightKg?: number; unitPrice?: number; amount?: number }>();
  const watchedAgentId = Form.useWatch('agentId', assignmentForm);
  const editingCostWeight = Form.useWatch('chargeWeightKg', costForm);
  const editingCostUnitPrice = Form.useWatch('unitPrice', costForm);
  const editingCostAmount = Form.useWatch('amount', costForm);

  useEffect(() => {
    if (!routingSubItems.some((item) => item.key === activeSection)) {
      setActiveSection(routingSubItems[0].key);
    }
  }, [activeSection, routingSubItems]);

  useEffect(() => {
    if (assignmentShipment) {
      setAssignmentActiveTab(requestedAssignmentTabRef.current);
      requestedAssignmentTabRef.current = 'basic';
    }
  }, [assignmentShipment?.id]);

  function openAssignment(shipment: Shipment, mode: 'assign' | 'update' | 'business-cost') {
    requestedAssignmentTabRef.current = mode === 'business-cost' ? 'business-cost' : 'basic';
    onOpenAssignment(shipment, mode === 'business-cost' ? 'update' : mode);
  }

  const submitAssignment = async (approve: boolean) => {
    try {
      const values = await assignmentForm.validateFields();
      if (!values.agentId) {
        setAssignmentActiveTab('basic');
        messageApi.warning('请先在基本信息选择代理。');
        return false;
      }
    } catch {
      setAssignmentActiveTab('basic');
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
  const routedShipments = useMemo(
    () => shipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH'
      || (canReroute && ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(shipment.status))),
    [canReroute, shipments]
  );
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
  const weeklyOutboundShipments = useMemo(
    () => shipments.filter((shipment) => shipment.outboundAt && new Date(shipment.outboundAt).getTime() >= weekStart),
    [shipments, weekStart]
  );
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
          helper: '等待市场分配代理渠道',
          tone: pendingShipments.length > 0 ? 'amber' : 'gray',
          sectionKey: 'pending-routing'
        }
      ]
    },
    {
      title: '流转中',
      description: '已完成排货，等待仓库出库',
      tone: routedShipments.length > 0 ? 'blue' : 'gray',
      icon: <Activity size={18} />,
      actions: [
        {
          label: '已排货/待出库',
          value: routedShipments.length,
          helper: '已进入仓库出库前置阶段',
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
      description: '仓库出库与本周完成情况',
      tone: todayOutboundShipments.length > 0 || weeklyOutboundShipments.length > 0 ? 'green' : 'gray',
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
          label: '本周已出库',
          value: weeklyOutboundShipments.length,
          helper: '本周已完成出库',
          tone: weeklyOutboundShipments.length > 0 ? 'green' : 'gray',
          sectionKey: 'weekly-routing'
        }
      ]
    },
    {
      title: '本周风险',
      description: '异常与特殊处理提醒',
      tone: reroutedThisWeek.length > 0 ? 'red' : (weeklySensitiveCount > 0 || weeklyDeclaredCount > 0 ? 'indigo' : 'gray'),
      icon: <RotateCcw size={18} />,
      actions: [
        {
          label: '退回重排',
          value: reroutedThisWeek.length,
          helper: '本周退回需复核',
          tone: reroutedThisWeek.length > 0 ? 'red' : 'gray',
          sectionKey: 'weekly-routing'
        },
        {
          label: '敏感货物',
          value: weeklySensitiveCount,
          helper: '带电/带磁/敏感',
          tone: weeklySensitiveCount > 0 ? 'indigo' : 'gray',
          sectionKey: 'weekly-routing'
        },
        {
          label: '报关货物',
          value: weeklyDeclaredCount,
          helper: '本周需要报关',
          tone: weeklyDeclaredCount > 0 ? 'indigo' : 'gray',
          sectionKey: 'weekly-routing'
        }
      ]
    }
  ], [
    pendingShipments.length,
    reroutedThisWeek.length,
    routedShipments.length,
    todayOutboundShipments.length,
    todayRoutedShipments.length,
    weeklyDeclaredCount,
    weeklyOutboundShipments.length,
    weeklySensitiveCount
  ]);

  const formatAmount = (amount?: number, currency = 'RMB') => typeof amount === 'number' ? `${amount.toFixed(2)} ${currency}` : '-';
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
      { title: '出货单号', dataIndex: 'systemOrderNo', width: 180 },
      { title: '货物数据', width: 140, render: (_, record) => `${record.packageCount} 件 / ${record.receivableWeightKg.toFixed(2)} kg` },
      { title: '目的地', dataIndex: 'destinationCountry', width: 90 },
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
          const canManualEdit = record.status === 'WAITING_DISPATCH';
          const canRerouteRecord = ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(record.status);

          return (
            <Space wrap>
              {canAssignRoute && canAssign ? (
                <Button size="small" onClick={() => openAssignment(record, 'assign')}>
                  排货
                </Button>
              ) : null}
              {canManualEdit && canUpdateRouted ? (
                <Button size="small" onClick={() => onEditShipment(record)}>
                  修改
                </Button>
              ) : null}
              {canViewRoutedLog ? <Button size="small" onClick={() => onViewRoutingLog(record)}>排货日志</Button> : null}
              {canViewBusinessCost ? (
                <Button size="small" onClick={() => openAssignment(record, 'business-cost')}>业务成本</Button>
              ) : null}
              {canRerouteRecord && canReroute ? (
                <Button size="small" icon={<RotateCcw size={14} />} onClick={() => setRerouteShipment(record)}>
                  退回重排
                </Button>
              ) : null}
            </Space>
          );
        }
      }
    ],
    [canAssign, canReroute, canUpdateRouted, canViewAgentChannel, canViewBusinessCost, canViewRoutedLog, onEditShipment, onViewRoutingLog]
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
        render: (_: unknown, record: Shipment) => ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(record.status) ? (
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
      mode: 'market',
      onRoute: canAssign ? (shipment) => openAssignment(shipment, 'assign') : undefined,
      onApprove: canConfirm ? (shipment) => void onApproveRouting(shipment) : undefined,
      onModify: canUpdatePending ? (shipment) => openAssignment(shipment, 'update') : undefined,
      onViewFees: canViewBusinessCost ? (shipment) => openAssignment(shipment, 'business-cost') : undefined,
      onViewLog: canViewPendingLog ? onViewPendingRoutingLog : undefined,
      onReturnReview: canReturnReview ? onReturnReview : undefined,
      canViewBusinessCost,
      canViewPayableCost: false,
      canViewAgentChannel
    }),
    [businessCostAudits, canAssign, canConfirm, canReturnReview, canUpdatePending, canViewAgentChannel, canViewBusinessCost, canViewPendingLog, onApproveRouting, onReturnReview, onViewPendingRoutingLog]
  );

  const assignmentBusinessCosts = useMemo(
    () => assignmentShipment
      ? (assignmentFinanceDetail?.businessCosts ?? (businessCostAudits ?? []).filter((fee) => fee.shipmentId === assignmentShipment.id || fee.systemOrderNo === assignmentShipment.systemOrderNo))
        .map((fee) => ({ ...fee, customerCode: assignmentShipment.customerCode, systemOrderNo: assignmentShipment.systemOrderNo, transferNo: assignmentShipment.transferNo }))
      : [],
    [assignmentShipment, assignmentFinanceDetail, businessCostAudits]
  );
  function openCostEditor(row?: { id: string; name: string; currency?: string; chargeWeightKg?: number; unitPrice?: number; amount?: number }) {
    costForm.setFieldsValue({
      name: row?.name ?? '', currency: row?.currency ?? 'RMB', chargeWeightKg: row?.chargeWeightKg,
      unitPrice: row?.unitPrice, amount: row?.amount
    });
    setCostEditor({ id: row?.id });
  }

  function renderCostTab(rows: PendingRoutingCostRow[]) {
    const total = rows.reduce((sum, row) => sum + Number(row.rmbAmount ?? row.amount ?? 0), 0);
    const canCreateCost = can('market:pending-routing:business-cost:create');
    const canUpdateCost = can('market:pending-routing:business-cost:edit');
    const canDeleteCost = can('market:pending-routing:business-cost:delete');
    const canOperateCost = canUpdateCost || canDeleteCost;
    return (
      <Space direction="vertical" size={12} className="full-width">
        <Flex justify="space-between" align="center">
          <Text type="secondary">按运单归并；金额优先按计费重 × 单价自动计算，合计按 RMB 口径展示。</Text>
          {canCreateCost ? <Button size="small" onClick={() => openCostEditor()}>新增费用</Button> : null}
        </Flex>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          scroll={{ x: 920 }}
          dataSource={rows}
          locale={{ emptyText: '暂无费用明细' }}
          columns={[
            { title: '费用名称', dataIndex: 'name', width: 130 },
            { title: '客户编号', dataIndex: 'customerCode', width: 100 },
            { title: '运单号', dataIndex: 'systemOrderNo', width: 150 },
            { title: '转单号', dataIndex: 'transferNo', width: 130, render: (value?: string) => value || '-' },
            { title: '币种', dataIndex: 'currency', width: 76 },
            { title: '计费重', dataIndex: 'chargeWeightKg', width: 90, render: (value?: number) => value ? `${value.toFixed(2)} kg` : '-' },
            { title: '单价', dataIndex: 'unitPrice', width: 86, render: (value?: number) => value?.toFixed(2) ?? '-' },
            { title: '总金额', dataIndex: 'amount', width: 110, render: (value: number, row: PendingRoutingCostRow) => `${value.toFixed(2)} ${row.currency ?? 'RMB'}` },
            canOperateCost ? {
              title: '操作', width: 112, fixed: 'right' as const, render: (_: unknown, row: PendingRoutingCostRow) => (
                <Space size={4}>
                  {canUpdateCost
                    && row.marketEditable !== false
                    ? <Button size="small" onClick={() => openCostEditor(row)}>修改</Button>
                    : null}
                  {canDeleteCost
                    && row.marketEditable !== false
                    ? <Button size="small" danger onClick={() => assignmentShipment && void onDeletePendingRoutingCost(assignmentShipment, row.id)}>删除</Button>
                    : null}
                </Space>
              )
            } : null
          ].filter(Boolean) as ColumnsType<PendingRoutingCostRow>}
          summary={() => <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={7}>合计（RMB）</Table.Summary.Cell><Table.Summary.Cell index={7}>{total.toFixed(2)} RMB</Table.Summary.Cell><Table.Summary.Cell index={8} /></Table.Summary.Row>}
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
      const columns = statusIndex >= 0
        ? [...marketColumns.slice(0, statusIndex), ...costColumns, ...marketColumns.slice(statusIndex)]
        : [...marketColumns, ...costColumns];
      const routedColumnWidths = new Map<string, number>([
        ['进入时间', 136],
        ['站点', 72],
        ['业务员', 82],
        ['客户编号', 92],
        ['客户', 132],
        ['运单号', 152],
        ['货物数据', 118],
        ['目的地', 76],
        ['代理', 104],
        ['代理渠道', 130],
        ['状态', 96],
        ['排货操作', 168]
      ]);
      return columns.map((column) => {
        const title = String(column.title ?? '');
        const baseColumn = routedColumnWidths.has(title) ? { ...column, width: routedColumnWidths.get(title) } : column;
        return title === '进入时间'
          ? { ...baseColumn, title: '排货时间', render: (_: unknown, record: Shipment) => new Date(getRoutingStageTime(record)).toLocaleString('zh-CN', { hour12: false }) }
          : baseColumn;
      });
    },
    [businessCostAudits, canViewBusinessCost, marketColumns]
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
                <Card className="module-grid market-dashboard-weekly" title="本周排货数据">
                  <Row gutter={[16, 12]}>
                    {canViewAgentChannel ? <Col xs={24} lg={8}>
                      <Text strong>本周排货代理</Text>
                      {renderMarketStatList(weeklyAgentStats, '本周暂无排货代理')}
                    </Col> : null}
                    {canViewAgentChannel ? <Col xs={24} lg={8}>
                      <Text strong>本周排货渠道（空运/海运）</Text>
                      {renderMarketStatList(weeklyChannelModeStats, '本周暂无排货渠道')}
                    </Col> : null}
                    <>
                    <Col xs={12} lg={4}>
                      <Statistic title="本周敏感货物" value={weeklySensitiveCount} suffix="票" />
                      <Text type="secondary">带电/带磁/敏感</Text>
                    </Col>
                    <Col xs={12} lg={4}>
                      <Statistic title="本周报关货物" value={weeklyDeclaredCount} suffix="票" />
                      <Text type="secondary">需要报关</Text>
                    </Col>
                    </>
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
                  minimumScrollX={2120}
                  onRow={canUpdatePending ? (record) => ({ onDoubleClick: () => openAssignment(record, 'update') }) : undefined}
                  columnSettingsPlacement="column"
                  columnSettings={{ storageKey: 'sunny.routing.pending.columns.market-review-v2', title: '待排货列设置' }}
                />
              </Card>
            ) : null}

            {activeSection === 'routed' ? (
              <Card className="module-grid" title="已排货">
                <ManagedTable
                  rowKey="id"
                  size="small"
                  className="routing-routed-table"
                  columns={routedColumns}
                  dataSource={routedShipments}
                  pagination={tenRowTablePagination}
                  minimumScrollX={2100}
                  columnSettingsPlacement="column"
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
                <Card className="module-grid" title="排货明细">
                  <ManagedTable
                    rowKey="id"
                    size="small"
                    columns={weeklyColumns}
                    dataSource={[...weeklyRoutedShipments, ...returnableShipments.filter((item) => !weeklyRoutedShipments.some((row) => row.id === item.id))]}
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
        width={680}
        footer={(
          <Space>
            <Button disabled={assignmentSubmitting} onClick={onCancelAssignment}>取消</Button>
            {canSaveDraft ? <Button type="primary" loading={assignmentSubmitting} onClick={() => void submitAssignment(false)}>确认保存</Button> : null}
          </Space>
        )}
        onCancel={onCancelAssignment}
      >
        <Alert
          className="notice-bar"
          type="info"
          showIcon
          message="这里仅保存代理与渠道等排货资料；返回列表点击审核后，订单才会进入仓库待出库。"
        />
        <Tabs
          activeKey={assignmentActiveTab}
          onChange={setAssignmentActiveTab}
          items={[
            {
              key: 'basic',
              label: '基本信息',
              disabled: !canSaveDraft,
              children: <>
        {assignmentShipment ? (
          <Card size="small" className="routing-assignment-context" title="订单信息">
            <Row gutter={[12, 8]}>
              <Col span={12}>日期：{new Date(assignmentShipment.reviewedAt ?? assignmentShipment.createdAt).toLocaleDateString('zh-CN')}</Col>
              <Col span={12}>站点：{assignmentShipment.site || '-'}</Col>
              <Col span={12}>业务员：{assignmentShipment.salesperson || '-'}</Col>
              <Col span={12}>客户编号：{assignmentShipment.customerCode || '-'}</Col>
              <Col span={12}>出货单号：{assignmentShipment.systemOrderNo}</Col>
              <Col span={12}>公司渠道：{assignmentShipment.channelName || '-'}</Col>
              <Col span={12}>货物数据：{assignmentShipment.packageCount} 件 / {assignmentShipment.receivableWeightKg.toFixed(2)} kg / {assignmentShipment.volumeCbm?.toFixed(3) ?? '0.000'} CBM</Col>
            </Row>
          </Card>
        ) : null}
        <Form form={assignmentForm} layout="vertical">
          <Form.Item name="channelId" hidden>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="destinationCountry" label="国家" rules={[{ required: true, whitespace: true, message: '请选择国家' }]}>
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
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
            <Col xs={24} md={12}>
              <Form.Item name="agentChannelName" label="代理渠道" rules={[{ required: true, whitespace: true, message: '请输入代理渠道' }]}>
                <AutoComplete
                  options={agentChannelOptions}
                  placeholder="例如 宇环 DHL"
                  filterOption={(input, option) => String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            {canCreateAgentChannel ? (
              <Col xs={24} md={12}>
                <Form.Item name="saveAgentChannelToMasterData" valuePropName="checked" initialValue={false}>
                  <Checkbox>保存代理渠道到资料库</Checkbox>
                </Form.Item>
              </Col>
            ) : null}
            <Col xs={24}>
              <Form.Item name="shippingMarkRequired" valuePropName="checked" initialValue={false}>
                <Checkbox>需要贴麦头</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Form>
              </>
            },
            ...(canViewBusinessCost ? [{ key: 'business-cost', label: '业务成本', children: renderCostTab(assignmentBusinessCosts) }] : [])
          ]}
        />
      </Modal>

      <Modal
        title={costEditor ? '业务成本费用' : '费用'}
        open={Boolean(costEditor)}
        destroyOnHidden
        okText="保存费用"
        cancelText="取消"
        onCancel={() => { setCostEditor(null); costForm.resetFields(); }}
        onOk={() => void costForm.validateFields().then(async (values) => {
          if (!assignmentShipment || !costEditor) return;
          const calculated = calculateCostAmount(values.chargeWeightKg, values.unitPrice, values.amount);
          if (calculated === undefined) {
            messageApi.error('请输入总金额，或同时填写计费重和单价');
            return;
          }
          await onSavePendingRoutingCost(assignmentShipment, 'BUSINESS_COST', costEditor.id, {
            name: values.name!.trim(), currency: values.currency ?? 'RMB', chargeWeightKg: values.chargeWeightKg,
            unitPrice: values.unitPrice, amount: calculated
          });
          setCostEditor(null);
          costForm.resetFields();
        })}
      >
        <Form
          form={costForm}
          layout="vertical"
          onValuesChange={(_changed, values) => {
            const calculated = calculateCostAmount(values.chargeWeightKg, values.unitPrice);
            if (calculated !== undefined) costForm.setFieldValue('amount', calculated);
          }}
        >
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="name" label="费用名称" rules={[{ required: true, whitespace: true, message: '请输入费用名称' }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="currency" label="币种" rules={[{ required: true }]}><Select options={[{ label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="chargeWeightKg" label="计费重"><InputNumber min={0} precision={3} className="full-width" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="unitPrice" label="单价"><InputNumber min={0} precision={2} className="full-width" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="amount" label="总金额" extra="计费重和单价均填写后自动计算"><InputNumber min={0} precision={2} className="full-width" disabled={calculateCostAmount(editingCostWeight, editingCostUnitPrice) !== undefined} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="自动总金额"><Text strong>{Number(editingCostWeight || 0) > 0 && Number(editingCostUnitPrice || 0) > 0 ? `${(Number(editingCostWeight) * Number(editingCostUnitPrice)).toFixed(2)} ${costForm.getFieldValue('currency') ?? 'RMB'}` : `${Number(editingCostAmount || 0).toFixed(2)} ${costForm.getFieldValue('currency') ?? 'RMB'}`}</Text></Form.Item></Col>
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

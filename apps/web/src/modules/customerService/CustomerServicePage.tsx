import { useEffect, useRef, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, Modal, Progress, Space, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AuditLogSummary, ProblemTicketSummary, Shipment, ShipmentStatus } from '@siyuan/shared';
import type { ApiClient } from '../../apiClient';
import { formatBeijingDateTime } from '../shared/format';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppPageHeader, ManagedTable, StatusTag, tenRowTablePagination } from '../shared/ui';

const { Text } = Typography;

const statusSections: Record<string, ShipmentStatus[]> = {
  dataConfirm: ['OUTBOUNDED'],
  transferNo: ['OUTBOUNDED'],
  waitingDeparture: ['WAITING_DEPARTURE'],
  departed: ['DEPARTED'],
  arrivedPort: ['ARRIVED_PORT'],
  delivering: ['DELIVERING'],
  signed: ['SIGNED']
};

type DepartureFormValues = {
  etdAt: string;
  etaAt: string;
  trackingWebsite?: string;
  trackingWebsiteVisibleToSales?: boolean;
  websiteSyncToSales?: boolean;
  pushToSales?: boolean;
};

type ProblemFormValues = {
  tags?: string[];
  reason?: string;
  customerVisible?: boolean;
  pushToSales?: boolean;
};

const waitingProblemTagOptions = ['数据不对', '起运港查验'];
const departedProblemTagOptions = ['目的港运港查验', '集装箱被甩在XX码头'];
const arrivedPortProblemTagOptions = ['联系不上收货人', '收货人地址错误'];
const afterSaleProblemTagOptions = ['货物丢失', '货物破损'];
type WaitingColumnKey =
  | 'entryAt'
  | 'outboundAt'
  | 'salesperson'
  | 'customerCode'
  | 'destinationCountry'
  | 'productName'
  | 'packageCount'
  | 'actualWeight'
  | 'chargeWeight'
  | 'agentWeightKg'
  | 'declarationRequired'
  | 'sensitive'
  | 'agentName'
  | 'carrier'
  | 'channelName'
  | 'systemOrderNo'
  | 'transferNo'
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
  | 'systemOrderNo'
  | 'transferNo'
  | 'agentData'
  | 'etdAt'
  | 'etaAt'
  | 'trackingWebsite'
  | 'handler'
  | 'handledAt'
  | 'action';
type ProblemCategory = 'all' | 'preDeparture' | 'arrivedPort' | 'delivering' | 'afterSale';
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
  'systemOrderNo',
  'transferNo',
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
  afterSale: '售后'
};

type DepartureModalMode = 'confirm' | 'editDeparted';

type TransferFormValues = {
  newTransferNo: string;
  subOrderNo?: string;
  pushToSales?: boolean;
};

type DataConfirmFormValues = {
  remark?: string;
};

export function CustomerServicePage({
  shipments,
  problemTickets,
  apiClient,
  onShipmentUpdated,
  onProblemTicketCreated,
  onProblemTicketUpdated,
  onNotice
}: {
  shipments: Shipment[];
  problemTickets: ProblemTicketSummary[];
  apiClient?: ApiClient;
  onShipmentUpdated?: (shipment: Shipment) => void;
  onProblemTicketCreated?: (ticket: ProblemTicketSummary) => void;
  onProblemTicketUpdated?: (ticket: ProblemTicketSummary) => void;
  onNotice?: (notice: string) => void;
}) {
  const [activeSection, setActiveSection] = useState('service-dashboard');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [departureForm] = Form.useForm<DepartureFormValues>();
  const [problemForm] = Form.useForm<ProblemFormValues>();
  const [transferForm] = Form.useForm<TransferFormValues>();
  const [dataConfirmForm] = Form.useForm<DataConfirmFormValues>();
  const [departureShipment, setDepartureShipment] = useState<Shipment | null>(null);
  const [departureModalMode, setDepartureModalMode] = useState<DepartureModalMode>('confirm');
  const [problemShipment, setProblemShipment] = useState<Shipment | null>(null);
  const [transferShipment, setTransferShipment] = useState<Shipment | null>(null);
  const [dataConfirmShipment, setDataConfirmShipment] = useState<Shipment | null>(null);
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
  const [submittingDeparture, setSubmittingDeparture] = useState(false);
  const [submittingProblem, setSubmittingProblem] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [submittingDataConfirm, setSubmittingDataConfirm] = useState(false);
  const [uploadingLabel, setUploadingLabel] = useState(false);
  const items: ModuleSubNavItem[] = [
    { key: 'service-dashboard', label: '客服看板' },
    { key: 'dataConfirm', label: '数据确认' },
    { key: 'transferNo', label: '转单号' },
    { key: 'waitingDeparture', label: '待离港' },
    { key: 'departed', label: '已离港' },
    { key: 'arrivedPort', label: '已到港' },
    { key: 'delivering', label: '已派送' },
    { key: 'signed', label: '已签收' },
    { key: 'problems', label: '问题件' },
    { key: 'afterSale', label: '售后' }
  ];
  const rows = useMemo(() => {
    const statuses = statusSections[activeSection] ?? [];
    if (!statuses.length) return [];
    return shipments.filter((shipment) => {
      if (!statuses.includes(shipment.status)) return false;
      if (activeSection === 'dataConfirm') return !isBusinessDataApproved(shipment.id, customerServiceAuditLogs);
      if (activeSection === 'transferNo') return isBusinessDataApproved(shipment.id, customerServiceAuditLogs);
      return true;
    });
  }, [activeSection, customerServiceAuditLogs, shipments]);
  const shipmentById = useMemo(() => new Map(shipments.map((shipment) => [shipment.id, shipment])), [shipments]);
  const columns: ColumnsType<Shipment> = [
    { title: '运单号', dataIndex: 'systemOrderNo', width: 170 },
    { title: '客户单号', dataIndex: 'customerOrderNo', width: 150 },
    { title: '客户', dataIndex: 'customerName', width: 160 },
    { title: '转单号', dataIndex: 'transferNo', width: 160, render: (value?: string) => value || '-' },
    { title: '最新轨迹', dataIndex: 'latestTracking' },
    { title: '状态', dataIndex: 'status', width: 120, render: (status: ShipmentStatus) => <StatusTag status={status} /> }
  ];
  const waitingColumnMap: Record<WaitingColumnKey, ColumnsType<Shipment>[number]> = {
    entryAt: { title: '运单创建时间', dataIndex: 'entryAt', width: 170, render: (_: string | undefined, row) => formatBeijingDateTime(row.entryAt ?? row.createdAt) },
    outboundAt: { title: '出库时间', dataIndex: 'outboundAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    salesperson: { title: '业务员', dataIndex: 'salesperson', width: 110, render: (value?: string) => value || '-' },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 110, render: (value?: string) => value || '-' },
    destinationCountry: { title: '目的地', dataIndex: 'destinationCountry', width: 100 },
    productName: { title: '品名', dataIndex: 'productName', width: 130, render: (value?: string) => value || '-' },
    packageCount: { title: '件数', dataIndex: 'packageCount', width: 80 },
    actualWeight: { title: '实重', dataIndex: 'receivableWeightKg', width: 90 },
    chargeWeight: { title: '计费重', dataIndex: 'receivableWeightKg', width: 90 },
    agentWeightKg: { title: '代理计费重', dataIndex: 'agentWeightKg', width: 110 },
    declarationRequired: { title: '报关', dataIndex: 'declarationRequired', width: 80, render: (value?: boolean) => value ? '是' : '否' },
    sensitive: { title: '敏感', dataIndex: 'sensitive', width: 80, render: (value?: boolean) => value ? '是' : '否' },
    agentName: { title: '代理', dataIndex: 'agentName', width: 130, render: (value?: string) => value || '-' },
    carrier: { title: '业务渠道', dataIndex: 'carrier', width: 130 },
    channelName: { title: '代理渠道', dataIndex: 'channelName', width: 150, render: (value?: string) => value || '-' },
    systemOrderNo: { title: '出货单号', dataIndex: 'systemOrderNo', width: 170 },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 150, render: (value?: string) => value || '-' },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 270,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" type="primary" onClick={() => openDepartureModal(row)}>
            已离港
          </Button>
          <Button size="small" onClick={() => openProblemModal(row)}>
            问题件
          </Button>
          <Button size="small" onClick={() => openTransferModal(row)}>
            修改转单号
          </Button>
          <Button size="small" onClick={() => openLabelModal(row)}>
            上传面单
          </Button>
        </Space>
      )
    }
  };
  const waitingDepartureColumns = waitingColumnOrder
    .filter((key) => !hiddenWaitingColumns.includes(key))
    .map((key) => waitingColumnMap[key]);
  const dataConfirmColumnOrder: WaitingColumnKey[] = [
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
    'systemOrderNo',
    'transferNo',
    'action'
  ];
  const dataConfirmColumns: ColumnsType<Shipment> = dataConfirmColumnOrder.map((key) => (
    key === 'action'
      ? {
          title: '操作',
          key: 'action',
          fixed: 'right',
          width: 100,
          render: (_, row) => (
            <Button size="small" type="primary" onClick={() => openDataConfirmModal(row)}>
              确认
            </Button>
          )
        }
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
    declarationRequired: { title: '报关', dataIndex: 'declarationRequired', width: 80, render: (value?: boolean) => value ? '是' : '否' },
    sensitive: { title: '敏感', dataIndex: 'sensitive', width: 80, render: (value?: boolean) => value ? '是' : '否' },
    agentName: { title: '代理', dataIndex: 'agentName', width: 130, render: (value?: string) => value || '-' },
    carrier: { title: '业务渠道', dataIndex: 'carrier', width: 130 },
    channelName: { title: '代理渠道', dataIndex: 'channelName', width: 150, render: (value?: string) => value || '-' },
    systemOrderNo: { title: '出货单号', dataIndex: 'systemOrderNo', width: 170 },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 150, render: (value?: string) => value || '-' },
    agentData: { title: '代理数据', key: 'agentData', width: 100, render: (_, row) => isAgentDataApproved(row.id, customerServiceAuditLogs) ? '已确认' : '-' },
    etdAt: { title: 'ETD/ATD', dataIndex: 'etdAt', width: 150, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    etaAt: { title: 'ETA/ATA', dataIndex: 'etaAt', width: 150, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    trackingWebsite: {
      title: '查件网址',
      key: 'trackingWebsite',
      width: 220,
      render: (_, row) => renderTrackingWebsite(row, customerServiceAuditLogs)
    },
    handler: { title: '处理人', key: 'handler', width: 110, render: (_, row) => getDepartedStatusLog(row.id, customerServiceAuditLogs)?.actorUsername ?? '-' },
    handledAt: { title: '处理时间', key: 'handledAt', width: 170, render: (_, row) => formatMaybeDateTime(getDepartedStatusLog(row.id, customerServiceAuditLogs)?.createdAt) },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 190,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" onClick={() => openDepartedEditModal(row)}>
            修改
          </Button>
          <Button size="small" type="primary" onClick={() => void markArrivedPort(row)}>
            已到港
          </Button>
          <Button size="small" onClick={() => openProblemModal(row)}>
            问题件
          </Button>
        </Space>
      )
    }
  };
  const departedColumns = departedColumnOrder
    .filter((key) => !hiddenDepartedColumns.includes(key))
    .map((key) => departedColumnMap[key]);
  const arrivedPortColumnMap: Record<DepartedColumnKey, ColumnsType<Shipment>[number]> = {
    ...departedColumnMap,
    handler: { title: '处理人', key: 'handler', width: 110, render: (_, row) => getArrivedPortStatusLog(row.id, customerServiceAuditLogs)?.actorUsername ?? '-' },
    handledAt: { title: '处理时间', key: 'handledAt', width: 170, render: () => '-' },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 230,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" onClick={() => openDepartedEditModal(row)}>
            修改
          </Button>
          <Button size="small" type="primary" onClick={() => void markDelivering(row)}>
            已派送/提取
          </Button>
          <Button size="small" onClick={() => openProblemModal(row)}>
            问题件
          </Button>
        </Space>
      )
    }
  };
  const arrivedPortColumns = arrivedPortColumnOrder
    .filter((key) => !hiddenArrivedPortColumns.includes(key))
    .map((key) => arrivedPortColumnMap[key]);
  const deliveringColumnMap: Record<DepartedColumnKey, ColumnsType<Shipment>[number]> = {
    ...departedColumnMap,
    handler: { title: '处理人', key: 'handler', width: 110, render: (_, row) => getArrivedPortStatusLog(row.id, customerServiceAuditLogs)?.actorUsername ?? '-' },
    handledAt: { title: '处理时间', key: 'handledAt', width: 170, render: (_, row) => formatMaybeDateTime(getDeliveringStatusLog(row.id, customerServiceAuditLogs)?.createdAt) },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" type="primary" onClick={() => void markSigned(row)}>
            正常签收（归档）
          </Button>
          <Button size="small" onClick={() => openProblemModal(row)}>
            售后问题
          </Button>
        </Space>
      )
    }
  };
  const deliveringColumns = deliveringColumnOrder
    .filter((key) => !hiddenDeliveringColumns.includes(key))
    .map((key) => deliveringColumnMap[key]);
  const actionColumns: ColumnsType<Shipment> = [
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 270,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" onClick={() => openProblemModal(row)}>
            问题件
          </Button>
          <Button size="small" onClick={() => openTransferModal(row)}>
            修改转单号
          </Button>
          <Button size="small" onClick={() => openLabelModal(row)}>
            上传面单
          </Button>
        </Space>
      )
    }
  ];
  const signedProblemActionColumns: ColumnsType<Shipment> = [
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 120,
      render: (_, row) => <Button size="small" onClick={() => openProblemModal(row)}>问题件</Button>
    }
  ];
  const rawProblemRows = useMemo(() => {
    return problemTickets.map((ticket) => {
      const shipment = shipmentById.get(ticket.shipmentId);
      const category = getProblemCategory(ticket, shipment, customerServiceAuditLogs);
      return {
        ticket,
        shipment,
        category,
        categoryLabel: problemCategoryLabels[category],
        dwellDays: problemDwellDays(ticket.createdAt)
      };
    });
  }, [customerServiceAuditLogs, problemTickets, shipmentById]);
  const problemRows = useMemo(() => {
    const minDwellDays = Number(problemFilters.minDwellDays);
    return rawProblemRows.filter((row) => {
      if (problemCategory !== 'all' && row.category !== problemCategory) return false;
      const shipment = row.shipment;
      return keywordMatch(shipment?.salesperson, problemFilters.salesperson)
        && (!Number.isFinite(minDwellDays) || !problemFilters.minDwellDays || row.dwellDays >= minDwellDays)
        && keywordMatch(shipment?.customerCode, problemFilters.customerCode)
        && keywordMatch(row.ticket.systemOrderNo, problemFilters.systemOrderNo)
        && keywordMatch(shipment?.destinationCountry, problemFilters.destinationCountry)
        && keywordMatch(shipment?.agentName, problemFilters.agentName);
    });
  }, [problemCategory, problemFilters, rawProblemRows]);
  const afterSaleRows = useMemo(() => rawProblemRows.filter((row) => row.category === 'afterSale'), [rawProblemRows]);
  const problemCategoryCounts = useMemo(() => {
    const counts: Record<Exclude<ProblemCategory, 'all'>, number> = { preDeparture: 0, arrivedPort: 0, delivering: 0, afterSale: 0 };
    problemTickets.forEach((ticket) => {
      const category = getProblemCategory(ticket, shipmentById.get(ticket.shipmentId), customerServiceAuditLogs);
      counts[category] += 1;
    });
    return counts;
  }, [customerServiceAuditLogs, problemTickets, shipmentById]);
  const dashboardMetrics = useMemo(() => {
    const currentStatusCount = (status: ShipmentStatus) => shipments.filter((shipment) => shipment.status === status).length;
    const weeklyStatusCount = (status: ShipmentStatus) => customerServiceAuditLogs.filter((row) => {
      const after = getAuditAfter(row);
      return row.action === 'customer_service.status.update' && after.statusTo === status && isCurrentWeek(row.createdAt);
    }).length;
    const openProblemCount = problemTickets.filter((ticket) => ticket.status !== 'CLOSED').length;
    const weeklyProblemCount = problemTickets.filter((ticket) => isCurrentWeek(ticket.createdAt)).length;
    const weeklyCards = [
      { key: 'weeklyProblems', label: '本周异常件', value: weeklyProblemCount, section: 'problems' },
      { key: 'weeklyDeparted', label: '本周已离港', value: weeklyStatusCount('DEPARTED'), section: 'departed' },
      { key: 'weeklyArrived', label: '本周已到港', value: weeklyStatusCount('ARRIVED_PORT'), section: 'arrivedPort' },
      { key: 'weeklyDelivering', label: '本周已派送', value: weeklyStatusCount('DELIVERING'), section: 'delivering' },
      { key: 'weeklySigned', label: '本周已签收', value: weeklyStatusCount('SIGNED'), section: 'signed' }
    ];
    const poolCards = [
      { key: 'waitingDeparture', label: '待离港', value: currentStatusCount('WAITING_DEPARTURE'), section: 'waitingDeparture' },
      { key: 'departed', label: '已离港', value: currentStatusCount('DEPARTED'), section: 'departed' },
      { key: 'arrivedPort', label: '已到港', value: currentStatusCount('ARRIVED_PORT'), section: 'arrivedPort' },
      { key: 'delivering', label: '已派送', value: currentStatusCount('DELIVERING'), section: 'delivering' },
      { key: 'signed', label: '已签收', value: currentStatusCount('SIGNED'), section: 'signed' },
      { key: 'openProblems', label: '未关闭问题件', value: openProblemCount, section: 'problems' }
    ];
    const maxValue = Math.max(1, ...weeklyCards.map((item) => item.value), ...poolCards.map((item) => item.value));
    return { weeklyCards, poolCards, maxValue };
  }, [customerServiceAuditLogs, problemTickets, shipments]);
  const problemColumnMap: Record<ProblemColumnKey, ColumnsType<ProblemRow>[number]> = {
    entryAt: { title: '运单创建时间', key: 'entryAt', width: 170, render: (_, row) => row.shipment ? formatBeijingDateTime(row.shipment.entryAt ?? row.shipment.createdAt) : '-' },
    outboundAt: { title: '出库时间', key: 'outboundAt', width: 170, render: (_, row) => row.shipment?.outboundAt ? formatBeijingDateTime(row.shipment.outboundAt) : '-' },
    category: { title: '问题件类别', dataIndex: 'categoryLabel', width: 130 },
    dwellDays: { title: '问题件停留时间', dataIndex: 'dwellDays', width: 130, render: (value: number) => `${value}天` },
    salesperson: { title: '业务员', key: 'salesperson', width: 110, render: (_, row) => row.shipment?.salesperson || '-' },
    customerCode: { title: '客户编号', key: 'customerCode', width: 110, render: (_, row) => row.shipment?.customerCode || '-' },
    destinationCountry: { title: '目的地', key: 'destinationCountry', width: 100, render: (_, row) => row.shipment?.destinationCountry || '-' },
    systemOrderNo: { title: '出货单号', key: 'systemOrderNo', width: 170, render: (_, row) => row.ticket.systemOrderNo },
    transferNo: { title: '转单号', key: 'transferNo', width: 150, render: (_, row) => row.shipment?.transferNo || '-' },
    productName: { title: '品名', key: 'productName', width: 130, render: (_, row) => row.shipment?.productName || '-' },
    packageCount: { title: '件数', key: 'packageCount', width: 80, render: (_, row) => row.shipment?.packageCount ?? '-' },
    actualWeight: { title: '实重', key: 'actualWeight', width: 90, render: (_, row) => row.shipment?.receivableWeightKg ?? '-' },
    chargeWeight: { title: '计费重', key: 'chargeWeight', width: 90, render: (_, row) => row.shipment?.receivableWeightKg ?? '-' },
    agentName: { title: '代理', key: 'agentName', width: 130, render: (_, row) => row.shipment?.agentName || '-' },
    carrier: { title: '业务渠道', key: 'carrier', width: 130, render: (_, row) => row.shipment?.carrier || '-' },
    channelName: { title: '代理渠道', key: 'channelName', width: 150, render: (_, row) => row.shipment?.channelName || '-' },
    reason: { title: '问题件内容', key: 'reason', width: 220, render: (_, row) => row.ticket.reason },
    declarationRequired: { title: '报关', key: 'declarationRequired', width: 80, render: (_, row) => row.shipment ? row.shipment.declarationRequired ? '是' : '否' : '-' },
    sensitive: { title: '敏感', key: 'sensitive', width: 80, render: (_, row) => row.shipment ? row.shipment.sensitive ? '是' : '否' : '-' },
    agentData: { title: '代理数据', key: 'agentData', width: 100, render: (_, row) => row.shipment && isAgentDataApproved(row.shipment.id, customerServiceAuditLogs) ? '已确认' : '-' },
    etdAt: { title: 'ETD/ATD', key: 'etdAt', width: 150, render: (_, row) => row.shipment?.etdAt ? formatBeijingDateTime(row.shipment.etdAt) : '-' },
    etaAt: { title: 'ETA/ATA', key: 'etaAt', width: 150, render: (_, row) => row.shipment?.etaAt ? formatBeijingDateTime(row.shipment.etaAt) : '-' },
    trackingWebsite: { title: '查件网址', key: 'trackingWebsite', width: 220, render: (_, row) => row.shipment ? renderTrackingWebsite(row.shipment, customerServiceAuditLogs) : '-' },
    handler: { title: '处理人', key: 'handler', width: 110, render: (_, row) => getProblemHandleLog(row.ticket.id, customerServiceAuditLogs)?.actorUsername ?? '-' },
    handledAt: { title: '处理时间', key: 'handledAt', width: 170, render: (_, row) => formatMaybeDateTime(getProblemHandleLog(row.ticket.id, customerServiceAuditLogs)?.createdAt) },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" type="primary" disabled={row.ticket.status === 'CLOSED'} onClick={() => void closeProblem(row.ticket)}>
            问题件已经解决
          </Button>
          <Button size="small" disabled={row.ticket.status === 'CLOSED'} onClick={() => void requestProblemAssist(row.ticket)}>
            问题件需协助
          </Button>
        </Space>
      )
    }
  };
  const problemColumns = problemColumnOrder
    .filter((key) => !hiddenProblemColumns.includes(key))
    .map((key) => problemColumnMap[key]);
  const afterSaleColumns: ColumnsType<ProblemRow> = [
    ...problemColumns.filter((column) => column.key !== 'category' && column.key !== 'action'),
    {
      title: '售后状态',
      key: 'afterSaleStatus',
      width: 110,
      render: (_, row) => getAfterSaleStatus(row)
    },
    problemColumnMap.action
  ];
  const activeLabel = items.find((item) => item.key === activeSection)?.label ?? '客服管理';

  async function refreshCustomerServiceAuditLogs() {
    if (!apiClient) return;
    const responses = await Promise.all([
      apiClient.auditLogs({ action: 'customer_service.status.update' }),
      apiClient.auditLogs({ action: 'customer_service.business_data.approved' }),
      apiClient.auditLogs({ action: 'customer_service.agent_data.approved' }),
      apiClient.auditLogs({ action: 'shipment.operational.update' }),
      apiClient.auditLogs({ action: 'customer_service.signature.confirm' }),
      apiClient.auditLogs({ action: 'customer_service.issue.attach' }),
      apiClient.auditLogs({ action: 'customer_service.issue.update' }),
      apiClient.auditLogs({ action: 'customer_service.issue.close' })
    ]);
    setCustomerServiceAuditLogs(responses.flatMap((response) => response.rows));
  }

  useEffect(() => {
    if (!apiClient || !['service-dashboard', 'dataConfirm', 'transferNo', 'departed', 'arrivedPort', 'delivering', 'problems', 'afterSale'].includes(activeSection)) return;
    let cancelled = false;
    refreshCustomerServiceAuditLogs()
      .catch(() => {
        if (!cancelled) setCustomerServiceAuditLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSection, apiClient]);

  function openDepartureModal(shipment: Shipment) {
    setDepartureModalMode('confirm');
    setDepartureShipment(shipment);
    departureForm.setFieldsValue({
      etdAt: toDatetimeLocalValue(shipment.etdAt),
      etaAt: toDatetimeLocalValue(shipment.etaAt),
      trackingWebsite: undefined,
      trackingWebsiteVisibleToSales: false,
      websiteSyncToSales: false,
      pushToSales: false
    });
  }

  function openDepartedEditModal(shipment: Shipment) {
    setDepartureModalMode('editDeparted');
    setDepartureShipment(shipment);
    const tracking = getShipmentTrackingMeta(shipment.id, customerServiceAuditLogs);
    departureForm.setFieldsValue({
      etdAt: toDatetimeLocalValue(shipment.etdAt),
      etaAt: toDatetimeLocalValue(shipment.etaAt),
      trackingWebsite: tracking.url ?? trackingWebsiteForShipment(shipment),
      trackingWebsiteVisibleToSales: tracking.visibleToSales ?? false,
      websiteSyncToSales: false,
      pushToSales: false
    });
  }

  function openProblemModal(shipment: Shipment) {
    setProblemShipment(shipment);
    problemForm.setFieldsValue({
      tags: [],
      reason: '',
      customerVisible: true,
      pushToSales: false
    });
  }

  function openTransferModal(shipment: Shipment) {
    setTransferShipment(shipment);
    transferForm.setFieldsValue({
      newTransferNo: shipment.transferNo ?? '',
      subOrderNo: shipment.subOrderNo ?? '',
      pushToSales: false
    });
  }

  function openDataConfirmModal(shipment: Shipment) {
    setDataConfirmShipment(shipment);
    dataConfirmForm.setFieldsValue({ remark: '' });
  }

  function openLabelModal(shipment: Shipment) {
    setLabelShipment(shipment);
  }

  async function submitDeparture() {
    if (!departureShipment || !apiClient) {
      return;
    }
    const values = await departureForm.validateFields();
    setSubmittingDeparture(true);
    try {
      if (departureModalMode === 'editDeparted') {
        const updated = await apiClient.updateShipmentOperational(departureShipment.id, {
          latestTracking: departureShipment.latestTracking,
          etdAt: values.etdAt,
          etaAt: values.etaAt,
          trackingWebsite: values.trackingWebsite,
          trackingWebsiteVisibleToSales: values.trackingWebsiteVisibleToSales ?? false
        });
        onShipmentUpdated?.(updated);
        await refreshCustomerServiceAuditLogs();
        onNotice?.(`${updated.systemOrderNo} 已修改轨迹信息${values.pushToSales || values.websiteSyncToSales ? '，业务推送待企业微信接入' : ''}`);
        setDepartureShipment(null);
        departureForm.resetFields();
        return;
      }
      const updated = await apiClient.updateShipmentOperational(departureShipment.id, {
        status: 'DEPARTED',
        latestTracking: '已离港',
        etdAt: values.etdAt,
        etaAt: values.etaAt,
        trackingWebsite: values.trackingWebsite,
        trackingWebsiteVisibleToSales: values.trackingWebsiteVisibleToSales ?? false
      });
      onShipmentUpdated?.(updated);
      onNotice?.(`${updated.systemOrderNo} 已确认离港${values.pushToSales ? '，业务推送待企业微信接入' : ''}`);
      setDepartureShipment(null);
      departureForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认离港失败');
    } finally {
      setSubmittingDeparture(false);
    }
  }

  async function markArrivedPort(shipment: Shipment) {
    if (!apiClient) return;
    try {
      const updated = await apiClient.updateShipmentOperational(shipment.id, {
        status: 'ARRIVED_PORT',
        latestTracking: '已到港'
      });
      onShipmentUpdated?.(updated);
      onNotice?.(`${updated.systemOrderNo} 已确认到港`);
      setActiveSection('arrivedPort');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认到港失败');
    }
  }

  async function markDelivering(shipment: Shipment) {
    if (!apiClient) return;
    try {
      const updated = await apiClient.updateShipmentOperational(shipment.id, {
        status: 'DELIVERING',
        latestTracking: '已派送/提取'
      });
      onShipmentUpdated?.(updated);
      onNotice?.(`${updated.systemOrderNo} 已派送/提取`);
      setActiveSection('delivering');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认派送失败');
    }
  }

  async function markSigned(shipment: Shipment) {
    if (!apiClient) return;
    try {
      const updated = await apiClient.updateShipmentOperational(shipment.id, {
        status: 'SIGNED',
        latestTracking: '已签收'
      });
      onShipmentUpdated?.(updated);
      onNotice?.(`${updated.systemOrderNo} 已正常签收归档`);
      setActiveSection('signed');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认签收失败');
    }
  }

  async function submitProblem() {
    if (!problemShipment || !apiClient) {
      return;
    }
    const values = await problemForm.validateFields();
    const reason = [...(values.tags ?? []), values.reason?.trim()].filter(Boolean).join('；');
    if (!reason) {
      problemForm.setFields([{ name: 'reason', errors: ['请选择标签或填写问题原因'] }]);
      return;
    }
    setSubmittingProblem(true);
    try {
      const ticket = await apiClient.createProblemTicket(problemShipment.id, {
        reason,
        customerVisible: values.customerVisible ?? true
      });
      onProblemTicketCreated?.(ticket);
      onShipmentUpdated?.({ ...problemShipment, hasProblemTicket: true });
      setProblemCategory(problemCategoryForStatus(problemShipment.status));
      setActiveSection('problems');
      await refreshCustomerServiceAuditLogs();
      onNotice?.(`${problemShipment.systemOrderNo} 已创建问题件${values.pushToSales ? '，业务推送待企业微信接入' : ''}`);
      setProblemShipment(null);
      problemForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建问题件失败');
    } finally {
      setSubmittingProblem(false);
    }
  }

  async function submitTransfer() {
    if (!transferShipment || !apiClient) {
      return;
    }
    const values = await transferForm.validateFields();
    setSubmittingTransfer(true);
    try {
      const updated = await apiClient.updateShipmentOperational(transferShipment.id, {
        transferNo: values.newTransferNo,
        subOrderNo: values.subOrderNo,
        latestTracking: '客服修改转单号',
        trackingWebsiteVisibleToSales: false
      });
      onShipmentUpdated?.(updated);
      onNotice?.(`${updated.systemOrderNo} 已修改转单号${values.pushToSales ? '，业务推送待企业微信接入' : ''}`);
      setTransferShipment(null);
      transferForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '修改转单号失败');
    } finally {
      setSubmittingTransfer(false);
    }
  }

  async function submitDataConfirm() {
    if (!dataConfirmShipment || !apiClient) {
      return;
    }
    const values = await dataConfirmForm.validateFields();
    setSubmittingDataConfirm(true);
    try {
      const updated = await apiClient.approveShipmentBusinessData(dataConfirmShipment.id, { remark: values.remark });
      onShipmentUpdated?.(updated);
      await refreshCustomerServiceAuditLogs();
      onNotice?.(`${updated.systemOrderNo} 数据确认完成，已进入转单号`);
      setDataConfirmShipment(null);
      dataConfirmForm.resetFields();
      setActiveSection('transferNo');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '数据确认失败');
    } finally {
      setSubmittingDataConfirm(false);
    }
  }

  async function uploadLabelFile(file?: File) {
    if (!file || !labelShipment || !apiClient) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      message.error('仅支持图片或 PDF 面单');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('面单不能超过 10MB');
      return;
    }
    setUploadingLabel(true);
    try {
      const response = await apiClient.uploadShipmentLabel(labelShipment.id, { file, transferNo: labelShipment.transferNo });
      onShipmentUpdated?.(response.shipment);
      onNotice?.(`${response.shipment.systemOrderNo} 已上传面单`);
      setLabelShipment(null);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传面单失败');
    } finally {
      setUploadingLabel(false);
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
      const updated = await apiClient.replyProblemTicket(ticket.id, '问题件需协助');
      onProblemTicketUpdated?.(updated);
      await refreshCustomerServiceAuditLogs();
      onNotice?.(`${ticket.systemOrderNo} 已标记需协助`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标记需协助失败');
    }
  }

  function moveWaitingColumn(key: WaitingColumnKey, offset: -1 | 1) {
    setWaitingColumnOrder((current) => {
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function toggleWaitingColumn(key: WaitingColumnKey) {
    if (key === 'action') return;
    setHiddenWaitingColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveDepartedColumn(key: DepartedColumnKey, offset: -1 | 1) {
    setDepartedColumnOrder((current) => {
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function toggleDepartedColumn(key: DepartedColumnKey) {
    if (key === 'action') return;
    setHiddenDepartedColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveArrivedPortColumn(key: DepartedColumnKey, offset: -1 | 1) {
    setArrivedPortColumnOrder((current) => {
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function toggleArrivedPortColumn(key: DepartedColumnKey) {
    if (key === 'action') return;
    setHiddenArrivedPortColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveDeliveringColumn(key: DepartedColumnKey, offset: -1 | 1) {
    setDeliveringColumnOrder((current) => {
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function toggleDeliveringColumn(key: DepartedColumnKey) {
    if (key === 'action') return;
    setHiddenDeliveringColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveProblemColumn(key: ProblemColumnKey, offset: -1 | 1) {
    setProblemColumnOrder((current) => {
      const index = current.indexOf(key);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
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
    if (activeSection === 'transferNo') return [...columns, ...actionColumns];
    if (activeSection === 'signed') return [...columns, ...signedProblemActionColumns];
    return columns;
  }

  return (
    <>
      <AppPageHeader title="客服管理" description="客服状态池、轨迹跟进、问题件和售后。" />
      <ModuleSubWorkspace items={items} activeKey={activeSection} onChange={setActiveSection}>
        {activeSection === 'service-dashboard' ? (
          <Card title="客服看板">
            <Space direction="vertical" size={16} className="full-width">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {dashboardMetrics.weeklyCards.map((item) => (
                  <Card key={item.key} size="small" hoverable onClick={() => setActiveSection(item.section)} role="button">
                    <Space direction="vertical" size={8} className="full-width">
                      <Text type="secondary">{item.label}</Text>
                      <Text strong style={{ fontSize: 28 }}>{item.value}</Text>
                      <Progress showInfo={false} percent={Math.round((item.value / dashboardMetrics.maxValue) * 100)} />
                    </Space>
                  </Card>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {dashboardMetrics.poolCards.map((item) => (
                  <Card key={item.key} size="small" hoverable onClick={() => setActiveSection(item.section)} role="button">
                    <Space direction="vertical" size={8} className="full-width">
                      <Text type="secondary">{item.label}</Text>
                      <Text strong style={{ fontSize: 24 }}>{item.value}</Text>
                      <Progress showInfo={false} percent={Math.round((item.value / dashboardMetrics.maxValue) * 100)} status={item.value > 0 ? 'active' : 'normal'} />
                    </Space>
                  </Card>
                ))}
              </div>
            </Space>
          </Card>
        ) : null}
        {activeSection === 'problems' ? (
          <Card title="问题件" extra={<Button size="small" onClick={() => setProblemColumnSettingsOpen(true)}>列设置</Button>}>
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
                <Input allowClear placeholder="运单号" value={problemFilters.systemOrderNo} onChange={(event) => setProblemFilters((current) => ({ ...current, systemOrderNo: event.target.value }))} />
                <Input allowClear placeholder="目的地" value={problemFilters.destinationCountry} onChange={(event) => setProblemFilters((current) => ({ ...current, destinationCountry: event.target.value }))} />
                <Input allowClear placeholder="代理" value={problemFilters.agentName} onChange={(event) => setProblemFilters((current) => ({ ...current, agentName: event.target.value }))} />
                <Button onClick={() => setProblemFilters({ salesperson: '', minDwellDays: '', customerCode: '', systemOrderNo: '', destinationCountry: '', agentName: '' })}>重置</Button>
              </Space>
              <ManagedTable rowKey={(row) => row.ticket.id} size="small" columns={problemColumns} dataSource={problemRows} pagination={tenRowTablePagination} minimumScrollX={3300} />
            </Space>
          </Card>
        ) : null}
        {activeSection === 'afterSale' ? (
          <Card title="售后" extra={<Button size="small" onClick={() => setProblemColumnSettingsOpen(true)}>列设置</Button>}>
            <ManagedTable rowKey={(row) => row.ticket.id} size="small" columns={afterSaleColumns} dataSource={afterSaleRows} pagination={tenRowTablePagination} minimumScrollX={3300} />
          </Card>
        ) : null}
        {activeSection in statusSections ? (
          <Card
            title={activeLabel}
            extra={
              activeSection === 'waitingDeparture'
                ? <Button size="small" onClick={() => setColumnSettingsOpen(true)}>列设置</Button>
                : activeSection === 'departed'
                  ? <Button size="small" onClick={() => setDepartedColumnSettingsOpen(true)}>列设置</Button>
                  : activeSection === 'arrivedPort'
                    ? <Button size="small" onClick={() => setArrivedPortColumnSettingsOpen(true)}>列设置</Button>
                    : activeSection === 'delivering'
                      ? <Button size="small" onClick={() => setDeliveringColumnSettingsOpen(true)}>列设置</Button>
                      : null
            }
          >
            <ManagedTable
              rowKey="id"
              size="small"
              columns={tableColumnsForSection()}
              dataSource={rows}
              pagination={tenRowTablePagination}
              minimumScrollX={activeSection === 'waitingDeparture' ? 2460 : ['departed', 'arrivedPort', 'delivering'].includes(activeSection) ? 2850 : activeSection === 'dataConfirm' ? 2100 : activeSection === 'transferNo' ? 1350 : activeSection === 'signed' ? 1200 : 1080}
            />
          </Card>
        ) : null}
      </ModuleSubWorkspace>
      <Modal
        title={departureModalMode === 'editDeparted' ? '修改' : '确认已离港'}
        open={Boolean(departureShipment)}
        onCancel={() => setDepartureShipment(null)}
        onOk={() => void submitDeparture()}
        confirmLoading={submittingDeparture}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={departureForm} layout="vertical">
          <Space direction="vertical" size={2} className="full-width">
            <Text strong>{departureShipment?.systemOrderNo}</Text>
            <Text type="secondary">转单号：{departureShipment?.transferNo || '-'}</Text>
          </Space>
          <Form.Item name="etdAt" label="ETD/ATD" rules={[{ required: true, message: '请选择 ETD/ATD' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="etaAt" label="ETA/ATA" rules={[{ required: true, message: '请选择 ETA/ATA' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="trackingWebsite" label="查询网站">
            <Input placeholder="默认按转单号生成，可手动填写" />
          </Form.Item>
          <Form.Item name="trackingWebsiteVisibleToSales" valuePropName="checked">
            <Checkbox>查询网站对业务显示</Checkbox>
          </Form.Item>
          <Form.Item name="websiteSyncToSales" valuePropName="checked">
            <Checkbox>网站是否同步业务</Checkbox>
          </Form.Item>
          <Form.Item name="pushToSales" valuePropName="checked">
            <Checkbox>是否推送业务</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="数据确认"
        open={Boolean(dataConfirmShipment)}
        onCancel={() => setDataConfirmShipment(null)}
        onOk={() => void submitDataConfirm()}
        confirmLoading={submittingDataConfirm}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={dataConfirmForm} layout="vertical">
          <Space direction="vertical" size={2} className="full-width">
            <Text strong>{dataConfirmShipment?.systemOrderNo}</Text>
            <Text type="secondary">客户：{dataConfirmShipment?.customerCode || '-'}</Text>
          </Space>
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
            <Input readOnly value={dataConfirmShipment?.declarationRequired ? '是' : '否'} />
          </Form.Item>
          <Form.Item label="是否敏感">
            <Input readOnly value={dataConfirmShipment?.sensitive ? '是' : '否'} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="修改转单号"
        open={Boolean(transferShipment)}
        onCancel={() => setTransferShipment(null)}
        onOk={() => void submitTransfer()}
        confirmLoading={submittingTransfer}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item label="客户编号">
            <Input readOnly value={transferShipment?.customerCode || '-'} />
          </Form.Item>
          <Form.Item label="运单号">
            <Input readOnly value={transferShipment?.systemOrderNo || '-'} />
          </Form.Item>
          <Form.Item label="转单号">
            <Input readOnly value={transferShipment?.transferNo || '-'} />
          </Form.Item>
          <Form.Item name="newTransferNo" label="新转单号" rules={[{ required: true, whitespace: true, message: '请输入新转单号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subOrderNo" label="分单号">
            <Input />
          </Form.Item>
          <Form.Item name="pushToSales" valuePropName="checked">
            <Checkbox>是否推送业务</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="面单上传"
        open={Boolean(labelShipment)}
        onCancel={() => setLabelShipment(null)}
        footer={<Button onClick={() => setLabelShipment(null)}>关闭</Button>}
        destroyOnClose
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
            void uploadLabelFile(file);
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
            void uploadLabelFile(event.dataTransfer.files[0]);
          }}
          onPaste={(event) => {
            const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith('image/') || item.type === 'application/pdf');
            if (file) {
              event.preventDefault();
              void uploadLabelFile(file);
            }
          }}
        >
          <Text strong>{uploadingLabel ? '上传中...' : '添加文件 / 拖拽 / 复制图片 / 截图'}</Text>
          <Text type="secondary">支持图片或 PDF，上传后保存到当前运单面单</Text>
        </div>
      </Modal>
      <Modal
        title="创建问题件"
        open={Boolean(problemShipment)}
        onCancel={() => setProblemShipment(null)}
        onOk={() => void submitProblem()}
        confirmLoading={submittingProblem}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={problemForm} layout="vertical">
          <Space direction="vertical" size={2} className="full-width">
            <Text strong>{problemShipment?.systemOrderNo}</Text>
            <Text type="secondary">客户：{problemShipment?.customerCode || '-'} / 转单号：{problemShipment?.transferNo || '-'}</Text>
          </Space>
          <Form.Item name="tags" label="常用标签">
            <Checkbox.Group options={problemShipment?.status === 'SIGNED' || problemShipment?.status === 'DELIVERING' ? afterSaleProblemTagOptions : problemShipment?.status === 'ARRIVED_PORT' ? arrivedPortProblemTagOptions : problemShipment?.status === 'DEPARTED' ? departedProblemTagOptions : waitingProblemTagOptions} />
          </Form.Item>
          <Form.Item name="reason" label="问题原因">
            <Input.TextArea rows={5} placeholder="选择标签后可补充说明，也可以纯手写" />
          </Form.Item>
          <Form.Item name="customerVisible" valuePropName="checked">
            <Checkbox>客户可见</Checkbox>
          </Form.Item>
          <Form.Item name="pushToSales" valuePropName="checked">
            <Checkbox>是否推送业务</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
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
              <Button size="small" disabled={index === 0} onClick={() => moveWaitingColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={index === waitingColumnOrder.length - 1} onClick={() => moveWaitingColumn(key, 1)}>下移</Button>
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
              <Button size="small" disabled={index === 0} onClick={() => moveDepartedColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={index === departedColumnOrder.length - 1} onClick={() => moveDepartedColumn(key, 1)}>下移</Button>
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
              <Button size="small" disabled={index === 0} onClick={() => moveArrivedPortColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={index === arrivedPortColumnOrder.length - 1} onClick={() => moveArrivedPortColumn(key, 1)}>下移</Button>
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
              <Button size="small" disabled={index === 0} onClick={() => moveDeliveringColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={index === deliveringColumnOrder.length - 1} onClick={() => moveDeliveringColumn(key, 1)}>下移</Button>
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
              <Button size="small" disabled={index === 0} onClick={() => moveProblemColumn(key, -1)}>上移</Button>
              <Button size="small" disabled={index === problemColumnOrder.length - 1} onClick={() => moveProblemColumn(key, 1)}>下移</Button>
            </Space>
          ))}
        </Space>
      </Modal>
    </>
  );
}

function toDatetimeLocalValue(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 16);
}

function formatMaybeDateTime(value?: string) {
  return value ? formatBeijingDateTime(value) : '-';
}

function getAuditAfter(row: AuditLogSummary): Record<string, unknown> {
  return row.after && typeof row.after === 'object' ? row.after as Record<string, unknown> : {};
}

function getDepartedStatusLog(shipmentId: string, logs: AuditLogSummary[]) {
  return logs
    .filter((row) => {
      const after = getAuditAfter(row);
      return row.action === 'customer_service.status.update' && row.target === shipmentId && after.statusTo === 'DEPARTED';
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function getArrivedPortStatusLog(shipmentId: string, logs: AuditLogSummary[]) {
  return logs
    .filter((row) => {
      const after = getAuditAfter(row);
      return row.action === 'customer_service.status.update' && row.target === shipmentId && after.statusTo === 'ARRIVED_PORT';
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function getDeliveringStatusLog(shipmentId: string, logs: AuditLogSummary[]) {
  return logs
    .filter((row) => {
      const after = getAuditAfter(row);
      return row.action === 'customer_service.status.update' && row.target === shipmentId && after.statusTo === 'DELIVERING';
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function getSignatureConfirmLog(shipmentId: string, logs: AuditLogSummary[]) {
  return logs
    .filter((row) => row.action === 'customer_service.signature.confirm' && row.target === shipmentId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function getProblemCategory(ticket: ProblemTicketSummary, shipment: Shipment | undefined, logs: AuditLogSummary[]): Exclude<ProblemCategory, 'all'> {
  const attach = logs
    .filter((row) => row.action === 'customer_service.issue.attach' && row.target === ticket.id)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  const after = attach ? getAuditAfter(attach) : {};
  const status = typeof after.originalStatusPool === 'string'
    ? after.originalStatusPool
    : typeof after.originalStatus === 'string'
      ? after.originalStatus
      : shipment?.status;
  return problemCategoryForStatus(status);
}

function problemCategoryForStatus(status?: string): Exclude<ProblemCategory, 'all'> {
  if (status === 'ARRIVED_PORT') return 'arrivedPort';
  if (status === 'DELIVERING') return 'delivering';
  if (status === 'SIGNED') return 'afterSale';
  return 'preDeparture';
}

function problemDwellDays(createdAt: string) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86400000));
}

function getAfterSaleStatus(row: ProblemRow) {
  if (row.ticket.status === 'CLOSED') return '已解决';
  if (row.ticket.replies.some((reply) => reply.message.includes('问题件需协助'))) return '处理中';
  if (/赔付|破损|丢失|少件|退款|补发/.test(row.ticket.reason)) return '需赔付';
  return '待处理';
}

function isCurrentWeek(value?: string) {
  const time = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(time)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return time >= start.getTime() && time < end.getTime();
}

function keywordMatch(value: unknown, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return String(value ?? '').toLowerCase().includes(normalized);
}

function getProblemHandleLog(ticketId: string, logs: AuditLogSummary[]) {
  return logs
    .filter((row) => ['customer_service.issue.attach', 'customer_service.issue.update', 'customer_service.issue.close'].includes(row.action) && row.target === ticketId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function isAgentDataApproved(shipmentId: string, logs: AuditLogSummary[]) {
  return logs.some((row) => row.action === 'customer_service.agent_data.approved' && row.target === shipmentId);
}

function isBusinessDataApproved(shipmentId: string, logs: AuditLogSummary[]) {
  return logs.some((row) => row.action === 'customer_service.business_data.approved' && row.target === shipmentId);
}

function getShipmentTrackingMeta(shipmentId: string, logs: AuditLogSummary[]) {
  const row = logs
    .filter((item) => item.action === 'shipment.operational.update' && item.target === shipmentId && 'trackingWebsite' in getAuditAfter(item))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  const after = row ? getAuditAfter(row) : {};
  return {
    url: typeof after.trackingWebsite === 'string' ? after.trackingWebsite : undefined,
    visibleToSales: typeof after.trackingWebsiteVisibleToSales === 'boolean' ? after.trackingWebsiteVisibleToSales : undefined
  };
}

function renderTrackingWebsite(shipment: Shipment, logs: AuditLogSummary[]) {
  const tracking = getShipmentTrackingMeta(shipment.id, logs);
  const url = tracking.url ?? trackingWebsiteForShipment(shipment);
  if (!url) return '-';
  return tracking.visibleToSales ? url : `屏蔽：${url}`;
}

function trackingWebsiteForShipment(shipment: Shipment) {
  if (!shipment.transferNo) return undefined;
  const carrier = shipment.carrier.toLowerCase();
  if (carrier.includes('ups')) return `https://www.ups.com/track?tracknum=${encodeURIComponent(shipment.transferNo)}`;
  if (carrier.includes('dhl')) return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(shipment.transferNo)}`;
  if (carrier.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(shipment.transferNo)}`;
  return shipment.transferNo;
}

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Col, Drawer, Flex, Input, InputNumber, Modal, Popconfirm, Popover, Row, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileText, PackageCheck, PackagePlus } from 'lucide-react';
import { shipmentStatusLabels, type Shipment, type ShipmentStatus, type StaffRoleKey, type WarehouseConsolidationSummary, type WarehouseInStockQuery, type WarehouseInStockTotals, type WarehousePackageCreateInput, type WarehousePackageStatus, type WarehousePackageSummary, type WarehouseTallyTaskSummary, type WarehouseTodayQuery, type WarehouseTodayResponse, type WarehouseTodayTotals } from '@siyuan/shared';
import { ApiClient } from '../../apiClient';
import { warehouseScanTestRows } from '../../warehouseScanTestData';
import { formatBeijingDateTime } from '../shared/format';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { PlaceholderPanel } from '../shared/PlaceholderPanel';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, StatusTag, renderFilterActions, renderFilterField, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import {
  calculateWarehousePackageMetrics,
  calculateWarehouseVolumetricWeight,
  createWarehouseBarcodeBars,
  createWarehouseExceptions,
  createWarehouseInternalLabelNo,
  escapeHtml,
  formatWarehousePackageNo,
  normalizeWarehouseScanTime,
  parseWarehousePackageCode
} from './utils';

const { Text } = Typography;

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

function createWarehouseTallyLabelHtml(task: WarehouseTallyTaskSummary) {
  const labelNo = task.labelNo ?? `${task.taskNo}-LBL`;
  const qrContent = task.labelQrContent ?? '';
  const labelDate = (task.completedAt ?? task.labelGeneratedAt ?? task.createdAt).slice(0, 10);
  const barcodeBars = createWarehouseBarcodeBars(labelNo)
    .map((width) => `<span style="display:inline-block;width:${width}px;height:44px;background:#111;margin-right:2px"></span>`)
    .join('');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labelNo)}</title>
  <style>
    body { font-family: Arial, "Microsoft YaHei", sans-serif; margin: 24px; color: #111; }
    .label { width: 360px; border: 2px solid #111; padding: 16px; }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; font-size: 13px; }
    .qr { margin-top: 12px; word-break: break-all; font-size: 11px; border-top: 1px solid #ddd; padding-top: 8px; }
    .bars { margin: 12px 0; white-space: nowrap; overflow: hidden; }
  </style>
</head>
<body>
  <section class="label">
    <div class="title">理货后标签 ${escapeHtml(labelNo)}</div>
    <div class="bars">${barcodeBars}</div>
    <div class="row"><strong>客户编号</strong><span>${escapeHtml(task.customerCode)}</span></div>
    <div class="row"><strong>日期</strong><span>${escapeHtml(labelDate)}</span></div>
    <div class="row"><strong>件数</strong><span>${task.completedPackageCount ?? task.packageCount}</span></div>
    <div class="row"><strong>关联仓库包裹</strong><span>${escapeHtml(task.sourcePackageId)}</span></div>
    <div class="row"><strong>组合号</strong><span>${escapeHtml(task.sourceCombinedOrderNo)}</span></div>
    <div class="qr">${escapeHtml(qrContent)}</div>
  </section>
</body>
</html>`;
}




interface WarehouseInboundPackage {
  id: string;
  shipmentId: string;
  systemOrderNo: string;
  customerCode: string;
  customerName?: string;
  site?: string;
  salesperson?: string;
  customerOrderNo: string;
  domesticTrackingNo: string;
  combinedOrderNo: string;
  labelNo?: string;
  sourcePackageId?: string;
  sourcePackageNo?: string;
  warehouseEntryNo: string;
  receivingChannel: string;
  destinationCountry: string;
  expectedTotalPackageCount?: number;
  packageIndex?: number;
  scanTime?: string;
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  girthCm?: number;
  volumetricWeightKg: number;
  volumetricWeightKg5000?: number;
  totalVolumetricWeightKg?: number;
  totalVolumetricWeightKg5000?: number;
  chargeableWeightKg: number;
  cbm: number;
  totalCbm?: number;
  remark?: string;
  manualException?: string;
  scanSource?: string;
  inboundAt?: string;
  receiptSourceId?: string;
  tallyStatus?: string;
  splitStatus?: string;
  consolidationStatus?: string;
  outboundStatus?: string;
  status: WarehousePackageStatus;
  exceptions: string[];
  createdBy?: string;
  createdAt?: string;
}

interface WarehouseRemainingPackageRow {
  id: string;
  customerOrderNo: string;
  packageSequence: string;
  status: string;
  note: string;
}

interface WarehousePackageDraft {
  customerCode: string;
  combinedOrderNo: string;
  totalPackageCount: number;
  packageIndex: number;
  domesticTrackingNo: string;
  scanTime: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
  divisor: number;
  remark: string;
  manualException: string;
}

interface WarehouseConsolidationRecord {
  id: string;
  packageIds: string[];
  outboundOrderNo: string;
  transferNo?: string;
  mode: 'MERGE_ONLY' | 'MERGE_AND_SHIP';
  totalPackages: number;
  totalActualWeightKg: number;
  totalVolumetricWeightKg: number;
  totalChargeableWeightKg: number;
}

interface TallyTaskCompleteDraft {
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  remark: string;
}

interface WarehouseOutboundLabel {
  id: string;
  consolidationId: string;
  labelNo: string;
  outboundOrderNo: string;
  destinationCountry: string;
  totalPackages: number;
  pieceIndex: number;
}

function createWarehouseDateTimeInputValue(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type WarehouseLabelQueueRow =
  | { id: string; kind: 'shipment'; shipment: Shipment }
  | { id: string; kind: 'consolidation'; consolidation: WarehouseConsolidationRecord };

interface WarehouseHandoverRow {
  id: string;
  handoverNo: string;
  inboundOrderNos: string;
  outboundOrderNo: string;
  customerName: string;
  customerOrderNo: string;
  destinationCountry: string;
  packageCount: number;
  inboundTimes: string;
  chargeableWeightKg: number;
  channelName: string;
  status: string;
}

function createWarehouseHandoverNo(outboundOrderNo: string) {
  return `HD-${outboundOrderNo || 'PENDING'}`;
}

function createInitialWarehousePackages(shipments: Shipment[]): WarehouseInboundPackage[] {
  const target = shipments.find((shipment) => shipment.status === 'WAITING_DISPATCH') ?? shipments[0];
  if (!target) {
    return [];
  }

  return Array.from({ length: 10 }, (_, index) => {
    const metrics = calculateWarehousePackageMetrics({
      weightKg: 8 + index * 0.2,
      lengthCm: 48 + index,
      widthCm: 36,
      heightCm: 32,
      packageCount: 1,
      divisor: 5000
    });
    const pkg: WarehouseInboundPackage = {
      id: `wh-seed-${index + 1}`,
      shipmentId: target.id,
      systemOrderNo: target.systemOrderNo,
      customerCode: target.customerOrderNo.slice(0, 8),
      customerOrderNo: target.customerOrderNo,
      domesticTrackingNo: `SF${String(index + 1).padStart(6, '0')}`,
      combinedOrderNo: `${target.customerOrderNo}-SF${String(index + 1).padStart(6, '0')}`,
      labelNo: `${target.customerOrderNo.slice(0, 8)}-SF${String(index + 1).padStart(6, '0')}-${index + 1}/10`,
      warehouseEntryNo: `WH-A-${String(index + 1).padStart(3, '0')}`,
      receivingChannel: '海运休斯顿专线',
      destinationCountry: target.destinationCountry,
      expectedTotalPackageCount: 10,
      packageIndex: index + 1,
      packageCount: 1,
      weightKg: 8 + index * 0.2,
      lengthCm: 48 + index,
      widthCm: 36,
      heightCm: 32,
      volumetricWeightKg: metrics.volumetricWeightKg,
      chargeableWeightKg: metrics.chargeableWeightKg,
      cbm: metrics.cbm,
      remark: index === 0 ? '木架，外箱轻微磨损' : undefined,
      status: 'RECEIVED',
      exceptions: []
    };
    return { ...pkg, exceptions: createWarehouseExceptions(pkg) };
  });
}

function createWarehouseApiPackages(): WarehouseInboundPackage[] {
  const arrivedCountByKey = new Map<string, number>();
  const expectedCountByKey = new Map<string, number>();

  warehouseScanTestRows.forEach((row) => {
    const { customerOrderNo, domesticTrackingNo } = parseWarehousePackageCode(row.combinedOrderNo);
    const groupKey = `${customerOrderNo}-${domesticTrackingNo}`;
    arrivedCountByKey.set(groupKey, (arrivedCountByKey.get(groupKey) ?? 0) + 1);
    if (row.expectedTotalPackageCount) {
      expectedCountByKey.set(groupKey, row.expectedTotalPackageCount);
    }
  });

  return warehouseScanTestRows.map((row, index) => {
    const { customerOrderNo, domesticTrackingNo } = parseWarehousePackageCode(row.combinedOrderNo);
    const groupKey = `${customerOrderNo}-${domesticTrackingNo}`;
    const expectedTotalPackageCount = expectedCountByKey.get(groupKey);
    const arrivedCount = arrivedCountByKey.get(groupKey) ?? 1;
    const pkg: WarehouseInboundPackage = {
      id: `wh-api-${index + 1}`,
      shipmentId: `api-${customerOrderNo}`,
      systemOrderNo: `API仓库-${customerOrderNo}`,
      customerCode: customerOrderNo.slice(0, 8),
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: row.combinedOrderNo,
      labelNo: `${customerOrderNo.slice(0, 8)}-${domesticTrackingNo}-${index + 1}/${expectedTotalPackageCount ?? arrivedCount}`,
      warehouseEntryNo: '',
      receivingChannel: '仓库接口返回',
      destinationCountry: '',
      expectedTotalPackageCount,
      scanTime: normalizeWarehouseScanTime(row.scanTime),
      packageCount: 1,
      weightKg: row.weightKg,
      lengthCm: row.lengthCm,
      widthCm: row.widthCm,
      heightCm: row.heightCm,
      volumetricWeightKg: row.volumetricWeightKg,
      chargeableWeightKg: Math.max(row.weightKg, row.volumetricWeightKg),
      cbm: row.cbm,
      remark: index === 0 ? '木架，外箱轻微磨损' : undefined,
      status: 'RECEIVED',
      exceptions: []
    };
    const exceptions = createWarehouseExceptions(pkg);
    if (expectedTotalPackageCount && arrivedCount < expectedTotalPackageCount) {
      exceptions.push(`部分到仓 ${arrivedCount}/${expectedTotalPackageCount}`);
    }
    return {
      ...pkg,
      exceptions
    };
  });
}




function mapWarehouseApiPackageToInbound(pkg: WarehousePackageSummary): WarehouseInboundPackage {
  return {
    id: pkg.id,
    shipmentId: pkg.shipmentId ?? `api-${pkg.customerOrderNo}`,
    systemOrderNo: pkg.systemOrderNo ?? `API仓库-${pkg.customerOrderNo}`,
    customerCode: pkg.customerCode,
    customerName: pkg.customerName,
    site: pkg.site,
    salesperson: pkg.salesperson,
    customerOrderNo: pkg.customerOrderNo,
    domesticTrackingNo: pkg.domesticTrackingNo,
    combinedOrderNo: pkg.combinedOrderNo,
    labelNo: pkg.labelNo,
    sourcePackageId: pkg.sourcePackageId,
    sourcePackageNo: pkg.sourcePackageNo,
    warehouseEntryNo: '',
    receivingChannel: pkg.receivingChannel,
    destinationCountry: pkg.destinationCountry ?? '',
    expectedTotalPackageCount: pkg.expectedTotalPackageCount,
    packageIndex: pkg.packageIndex,
    scanTime: pkg.scanTime ? formatBeijingDateTime(pkg.scanTime) : undefined,
    packageCount: pkg.packageCount,
    weightKg: pkg.weightKg,
    lengthCm: pkg.lengthCm,
    widthCm: pkg.widthCm,
    heightCm: pkg.heightCm,
    girthCm: pkg.girthCm,
    volumetricWeightKg: pkg.volumetricWeightKg,
    volumetricWeightKg5000: pkg.volumetricWeightKg5000,
    totalVolumetricWeightKg: pkg.totalVolumetricWeightKg,
    totalVolumetricWeightKg5000: pkg.totalVolumetricWeightKg5000,
    chargeableWeightKg: pkg.chargeableWeightKg,
    cbm: pkg.cbm,
    totalCbm: pkg.totalCbm,
    remark: pkg.remark,
    manualException: pkg.manualException,
    scanSource: pkg.scanSource,
    inboundAt: pkg.inboundAt ? formatBeijingDateTime(pkg.inboundAt) : undefined,
    receiptSourceId: pkg.receiptSourceId,
    tallyStatus: pkg.tallyStatus,
    splitStatus: pkg.splitStatus,
    consolidationStatus: pkg.consolidationStatus,
    outboundStatus: pkg.outboundStatus,
    status: pkg.status,
    exceptions: pkg.exceptions,
    createdBy: pkg.createdBy,
    createdAt: pkg.createdAt ? formatBeijingDateTime(pkg.createdAt) : undefined
  };
}

function withWarehouseCustomerProgress(packages: WarehouseInboundPackage[]): WarehouseInboundPackage[] {
  return packages.map((pkg) => {
    if (!pkg.expectedTotalPackageCount) {
      return pkg;
    }
    const arrivedCount = packages.filter((item) => item.customerOrderNo === pkg.customerOrderNo).length;
    const progressException = arrivedCount < pkg.expectedTotalPackageCount ? `部分到仓 ${arrivedCount}/${pkg.expectedTotalPackageCount}` : undefined;
    return {
      ...pkg,
      exceptions: Array.from(new Set([...(pkg.exceptions ?? []), ...(progressException ? [progressException] : [])]))
    };
  });
}

export function WarehousePage({
  apiClient,
  role,
  canWriteWarehouse = false,
  shipments,
  notice,
  onDispatch,
  onRoute,
  canRouteShipments = false,
  findShipmentBySystemOrderNo,
  renderShipmentOrderNoLink,
  onCreateOrderEntry
}: {
  apiClient: ApiClient;
  role: StaffRoleKey;
  canWriteWarehouse?: boolean;
  shipments: Shipment[];
  notice: string | null;
  onDispatch: (record: Shipment) => Promise<void>;
  onRoute?: (record: Shipment) => Promise<void>;
  canRouteShipments?: boolean;
  findShipmentBySystemOrderNo: (systemOrderNo?: string) => Shipment | undefined;
  renderShipmentOrderNoLink: (systemOrderNo?: string, options?: { shipment?: Shipment; subtitle?: string; copyText?: string }) => ReactNode;
  onCreateOrderEntry?: (packageIds: string[]) => void;
}) {
  const config = {
    title: '仓库管理中心',
    description: '覆盖包裹件重尺、理货合并拆分、面单队列&待仓库出货和交接资料，作为仓库作业主入口。',
    stats: [
      { label: '待出库', value: '18', helper: '渠道确认后等待仓库处理' },
      { label: '待理货', value: '9', helper: '分批到仓待合并' },
      { label: '收货异常', value: '3', helper: '件重尺或资料待复核' }
    ]
  };
  const workQueue = shipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH');
  const pendingRoutingShipments = shipments.filter((shipment) => shipment.status === 'WAITING_SORT');
  const [activeReceiveSection, setActiveReceiveSection] = useState('today');
  const [warehousePackages, setWarehousePackages] = useState<WarehouseInboundPackage[]>([]);
  const [todayReceiptRows, setTodayReceiptRows] = useState<WarehouseInboundPackage[]>([]);
  const [todayTotals, setTodayTotals] = useState<WarehouseTodayTotals>({
    receiptTickets: 0,
    totalPackages: 0,
    totalWeightKg: 0,
    totalCbm: 0,
    waitingDispatchTickets: 0,
    pendingTallyTickets: 0,
    exceptionTickets: 0
  });
  const emptyTodayFilters: WarehouseTodayQuery = { datePreset: 'TODAY', site: '', customerOrderNo: '', domesticTrackingNo: '', combinedOrderNo: '' };
  const [todayFilterDraft, setTodayFilterDraft] = useState<WarehouseTodayQuery>(emptyTodayFilters);
  const [todayFilters, setTodayFilters] = useState<WarehouseTodayQuery>(emptyTodayFilters);
  const [selectedTodayPackageIds, setSelectedTodayPackageIds] = useState<string[]>([]);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [manualReceiptDrawerOpen, setManualReceiptDrawerOpen] = useState(false);
  const [exceptionDraft, setExceptionDraft] = useState('');
  const [visibleTodayColumns, setVisibleTodayColumns] = useState<string[]>([
    'select',
    'site',
    'customerCode',
    'combinedOrderNo',
    'packageCount',
    'weightKg',
    'dimensions',
    'cbm',
    'vol5000',
    'vol6000',
    'scanTime',
    'remark',
    'exceptions'
  ]);
  const emptyInStockFilters: WarehouseInStockQuery = { site: '', customerOrderNo: '', domesticTrackingNo: '', combinedOrderNo: '', operationKeyword: '' };
  const [inStockFilterDraft, setInStockFilterDraft] = useState<WarehouseInStockQuery>(emptyInStockFilters);
  const [inStockFilters, setInStockFilters] = useState<WarehouseInStockQuery>(emptyInStockFilters);
  const [inStockRows, setInStockRows] = useState<WarehouseInboundPackage[]>([]);
  const [inStockTotals, setInStockTotals] = useState<WarehouseInStockTotals>({
    receiptTickets: 0,
    totalPackages: 0,
    totalWeightKg: 0,
    totalCbm: 0,
    waitingDispatchTickets: 0,
    pendingTallyTickets: 0,
    exceptionTickets: 0
  });
  const [selectedInStockPackageIds, setSelectedInStockPackageIds] = useState<string[]>([]);
  const [visibleInStockColumns, setVisibleInStockColumns] = useState<string[]>([
    'select',
    'site',
    'customerCode',
    'combinedOrderNo',
    'packageCount',
    'weightKg',
    'dimensions',
    'cbm',
    'girth',
    'vol5000',
    'vol6000',
    'scanTime',
    'totalWeight',
    'totalCbm',
    'totalVol5000',
    'totalVol6000',
    'remark',
    'exceptions',
    'actions'
  ]);
  const [inStockConsolidationIds, setInStockConsolidationIds] = useState<string[]>([]);
  const [tallyTaskPackageIds, setTallyTaskPackageIds] = useState<string[]>([]);
  const [tallyTasks, setTallyTasks] = useState<WarehouseTallyTaskSummary[]>([]);
  const [tallyRequirementDraft, setTallyRequirementDraft] = useState('');
  const [completingTallyTask, setCompletingTallyTask] = useState<WarehouseTallyTaskSummary | null>(null);
  const [tallyCompleteDraft, setTallyCompleteDraft] = useState<TallyTaskCompleteDraft>({
    packageCount: 1,
    weightKg: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    remark: ''
  });
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [consolidations, setConsolidations] = useState<WarehouseConsolidationRecord[]>([]);
  const [selectedConsolidationId, setSelectedConsolidationId] = useState<string | null>(null);
  const [warehouseOutboundLabelsByConsolidationId, setWarehouseOutboundLabelsByConsolidationId] = useState<Record<string, WarehouseOutboundLabel[]>>({});
  const [warehouseShipmentLabelsByShipmentId, setWarehouseShipmentLabelsByShipmentId] = useState<Record<string, WarehouseOutboundLabel[]>>({});
  const [dispatchedConsolidationIds, setDispatchedConsolidationIds] = useState<string[]>([]);
  const [dispatchingWarehouseShipmentIds, setDispatchingWarehouseShipmentIds] = useState<string[]>([]);
  const [warehouseNotice, setWarehouseNotice] = useState<string | null>(null);
  const emptyPackageDetailFilters = {
    customerOrderNo: '',
    domesticTrackingNo: '',
    customerCode: '',
    remark: '',
    arrivalStatus: 'ALL'
  };
  const emptyConsolidationPackageFilters = {
    customerCode: '',
    systemOrderNo: '',
    domesticTrackingNo: '',
    tallyStatus: 'ALL'
  };
  const [packageDetailFilterDraft, setPackageDetailFilterDraft] = useState(emptyPackageDetailFilters);
  const [packageDetailFilters, setPackageDetailFilters] = useState(emptyPackageDetailFilters);
  const [consolidationPackageFilterDraft, setConsolidationPackageFilterDraft] = useState(emptyConsolidationPackageFilters);
  const [consolidationPackageFilters, setConsolidationPackageFilters] = useState(emptyConsolidationPackageFilters);
  const [splittingPackage, setSplittingPackage] = useState<WarehouseInboundPackage | null>(null);
  const [splitDraft, setSplitDraft] = useState({ splitCount: 2, pieces: '', remark: '' });
  const [packageDraft, setPackageDraft] = useState<WarehousePackageDraft>({
    customerCode: '',
    combinedOrderNo: '',
    totalPackageCount: 1,
    packageIndex: 1,
    domesticTrackingNo: '',
    scanTime: createWarehouseDateTimeInputValue(),
    weightKg: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    packageCount: 1,
    divisor: 6000,
    remark: '',
    manualException: ''
  });
  useEffect(() => {
    let alive = true;
    apiClient.warehousePackages()
      .then((rows) => {
        if (!alive) return;
        setWarehousePackages(withWarehouseCustomerProgress(rows.map(mapWarehouseApiPackageToInbound)));
      })
      .catch(() => {
        if (!alive) return;
        setWarehousePackages(withWarehouseCustomerProgress([...createWarehouseApiPackages(), ...createInitialWarehousePackages(shipments)]));
      });
    return () => {
      alive = false;
    };
  }, [apiClient, shipments]);
  useEffect(() => {
    let alive = true;
    apiClient.warehouseTodayReceipts(todayFilters)
      .then((response) => {
        if (!alive) return;
        setTodayReceiptRows(response.rows.map(mapWarehouseApiPackageToInbound));
        setTodayTotals(response.totals);
        setSelectedTodayPackageIds([]);
      })
      .catch(() => {
        if (!alive) return;
        const fallbackRows = filterTodayRows(warehousePackages, todayFilters, role);
        setTodayReceiptRows(fallbackRows);
        setTodayTotals(calculateTodayTotals(fallbackRows, workQueue.length));
        setSelectedTodayPackageIds([]);
      });
    return () => {
      alive = false;
    };
  }, [apiClient, role, todayFilters, warehousePackages, workQueue.length]);
  useEffect(() => {
    let alive = true;
    apiClient.warehouseInStock(inStockFilters)
      .then((response) => {
        if (!alive) return;
        setInStockRows(response.rows.map(mapWarehouseApiPackageToInbound));
        setInStockTotals(response.totals);
        setSelectedInStockPackageIds([]);
      })
      .catch(() => {
        if (!alive) return;
        const fallbackRows = filterInStockRows(warehousePackages, inStockFilters, role);
        setInStockRows(fallbackRows);
        setInStockTotals(calculateTodayTotals(fallbackRows, workQueue.length));
        setSelectedInStockPackageIds([]);
      });
    return () => {
      alive = false;
    };
  }, [apiClient, inStockFilters, role, warehousePackages, workQueue.length]);
  useEffect(() => {
    let alive = true;
    apiClient.warehouseTallyTasks()
      .then((rows) => {
        if (!alive) return;
        setTallyTasks(rows);
      })
      .catch(() => {
        if (!alive) return;
        setTallyTasks([]);
      });
    return () => {
      alive = false;
    };
  }, [apiClient]);
  const selectedReceiptShipment = workQueue[0];
  const currentShipmentPackages = selectedReceiptShipment
    ? warehousePackages.filter((pkg) => pkg.shipmentId === selectedReceiptShipment.id)
    : [];
  const draftMetrics = calculateWarehousePackageMetrics(packageDraft);
  const inboundLabelPreview = {
    customerCode: packageDraft.customerCode.trim() || '未录入',
    domesticTrackingNo: packageDraft.domesticTrackingNo.trim() || '未录入快递号',
    packageIndex: Math.max(1, packageDraft.packageIndex || 1),
    totalPackageCount: Math.max(1, packageDraft.totalPackageCount || 1),
    scanTime: formatBeijingDateTime(new Date().toISOString())
  };
  const getWarehouseArrivedCount = (pkg: WarehouseInboundPackage) =>
    warehousePackages.filter((item) => item.customerOrderNo === pkg.customerOrderNo).length;
  const resolveWarehouseArrivalStatus = (pkg: WarehouseInboundPackage) => {
    const businessExceptions = (pkg.exceptions ?? []).filter((item) => !item.startsWith('部分到仓'));
    if (businessExceptions.length) return 'EXCEPTION';
    if (!pkg.expectedTotalPackageCount) return 'UNKNOWN';
    return getWarehouseArrivedCount(pkg) >= pkg.expectedTotalPackageCount ? 'COMPLETE' : 'PARTIAL';
  };
  const includesFilter = (value: string | undefined, keyword: string) =>
    !keyword.trim() || (value ?? '').toLowerCase().includes(keyword.trim().toLowerCase());
  const isOperatorView = role === 'OPERATOR';
  const canCreateOrderEntryFromWarehouse = Boolean(onCreateOrderEntry) && !['WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(role);
  const consolidationActionLabel = canCreateOrderEntryFromWarehouse ? '合票录单' : '合票';
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
  function toggleTodayColumn(columnKey: string, checked: boolean) {
    setVisibleTodayColumns((current) =>
      checked ? Array.from(new Set([...current, columnKey])) : current.filter((key) => key !== columnKey)
    );
  }
  function toggleInStockPackage(packageId: string, checked: boolean) {
    setSelectedInStockPackageIds((current) =>
      checked ? Array.from(new Set([...current, packageId])) : current.filter((id) => id !== packageId)
    );
  }
  function toggleInStockColumn(columnKey: string, checked: boolean) {
    setVisibleInStockColumns((current) =>
      checked ? Array.from(new Set([...current, columnKey])) : current.filter((key) => key !== columnKey)
    );
  }
  const todaySiteOptions = Array.from(new Set(warehousePackages.map((pkg) => pkg.site).filter((site): site is string => Boolean(site)))).sort();
  const normalizedPackageCustomerOrderQuery = packageDetailFilters.customerOrderNo.trim();
  const searchedWarehousePackages = normalizedPackageCustomerOrderQuery
    ? warehousePackages.filter((pkg) => pkg.customerOrderNo === normalizedPackageCustomerOrderQuery)
    : [];
  const filteredWarehousePackages = warehousePackages.filter((pkg) =>
    includesFilter(pkg.customerOrderNo, packageDetailFilters.customerOrderNo)
    && includesFilter(pkg.domesticTrackingNo, packageDetailFilters.domesticTrackingNo)
    && includesFilter(pkg.customerCode, packageDetailFilters.customerCode)
    && includesFilter(pkg.remark, packageDetailFilters.remark)
    && (packageDetailFilters.arrivalStatus === 'ALL' || resolveWarehouseArrivalStatus(pkg) === packageDetailFilters.arrivalStatus)
  );
  const expectedPackageCount = searchedWarehousePackages.reduce(
    (max, pkg) => Math.max(max, pkg.expectedTotalPackageCount ?? 0),
    0
  );
  const handledPackageCount = searchedWarehousePackages.length;
  const remainingPackageCount = Math.max(expectedPackageCount - handledPackageCount, 0);
  const remainingPackageRows: WarehouseRemainingPackageRow[] = Array.from({ length: remainingPackageCount }, (_, index) => {
    const sequence = handledPackageCount + index + 1;
    return {
      id: `${normalizedPackageCustomerOrderQuery}-remaining-${sequence}`,
      customerOrderNo: normalizedPackageCustomerOrderQuery,
      packageSequence: `剩余第 ${sequence} 件`,
      status: '待接口回传',
      note: `预计共 ${expectedPackageCount} 件，已处理 ${handledPackageCount} 件`
    };
  });
  const selectedConsolidation = consolidations.find((record) => record.id === selectedConsolidationId);
  const selectedConsolidationPackages = selectedConsolidation
    ? warehousePackages.filter((pkg) => selectedConsolidation.packageIds.includes(pkg.id))
    : [];
  const pendingTallyTasks = tallyTasks.filter((task) => task.status === 'PENDING');
  const completedTallyTasks = tallyTasks.filter((task) => task.status === 'COMPLETED');
  const availableConsolidationPackages = warehousePackages.filter(isInStockPackage);
  const filteredConsolidationPackages = availableConsolidationPackages.filter((pkg) =>
    includesFilter(pkg.customerCode || pkg.customerOrderNo, consolidationPackageFilters.customerCode)
    && includesFilter(pkg.systemOrderNo, consolidationPackageFilters.systemOrderNo)
    && includesFilter(pkg.domesticTrackingNo, consolidationPackageFilters.domesticTrackingNo)
    && (consolidationPackageFilters.tallyStatus === 'ALL' || pkg.status === consolidationPackageFilters.tallyStatus)
  );
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
  const warehouseOutboundQueue = consolidations.filter(
    (record) => record.mode === 'MERGE_AND_SHIP' && !dispatchedConsolidationIds.includes(record.id)
  );
  const warehouseShipmentQueue = shipments.filter(
    (shipment) => shipment.status === 'WAITING_DISPATCH' && !dispatchingWarehouseShipmentIds.includes(shipment.id)
  );
  const warehouseLabelQueueRows: WarehouseLabelQueueRow[] = [
    ...warehouseShipmentQueue.map((shipment) => ({ id: `shipment-${shipment.id}`, kind: 'shipment' as const, shipment })),
    ...warehouseOutboundQueue.map((record) => ({ id: `consolidation-${record.id}`, kind: 'consolidation' as const, consolidation: record }))
  ];
  const warehouseHandoverRows: WarehouseHandoverRow[] = [
    ...warehouseLabelQueueRows.map((row): WarehouseHandoverRow => {
      if (row.kind === 'shipment') {
        return {
          id: row.id,
          handoverNo: createWarehouseHandoverNo(row.shipment.systemOrderNo),
          inboundOrderNos: row.shipment.systemOrderNo,
          outboundOrderNo: row.shipment.systemOrderNo,
          customerName: row.shipment.customerName,
          customerOrderNo: row.shipment.customerOrderNo,
          destinationCountry: row.shipment.destinationCountry,
          packageCount: Math.max(row.shipment.packageCount, 1),
          inboundTimes: formatBeijingDateTime(row.shipment.createdAt),
          chargeableWeightKg: row.shipment.receivableWeightKg,
          channelName: row.shipment.channelName || row.shipment.carrier || '待确认',
          status: '待仓库出货'
        };
      }
      const packages = getConsolidationPackages(row.consolidation);
      return {
        id: row.id,
        handoverNo: createWarehouseHandoverNo(row.consolidation.outboundOrderNo),
        inboundOrderNos: formatWarehouseHandoverInboundNos(packages),
        outboundOrderNo: row.consolidation.outboundOrderNo,
        customerName: packages[0]?.systemOrderNo ?? '理货包裹',
        customerOrderNo: Array.from(new Set(packages.map((pkg) => pkg.customerOrderNo))).join('、') || '-',
        destinationCountry: getConsolidationDestination(row.consolidation),
        packageCount: row.consolidation.totalPackages,
        inboundTimes: formatWarehouseHandoverInboundTimes(packages),
        chargeableWeightKg: row.consolidation.totalChargeableWeightKg,
        channelName: packages[0]?.receivingChannel || '待确认',
        status: row.consolidation.mode === 'MERGE_AND_SHIP' ? '理货待出货' : '仅理货'
      };
    }),
    ...consolidations
      .filter((record) => record.mode === 'MERGE_ONLY')
      .map((record): WarehouseHandoverRow => {
        const packages = getConsolidationPackages(record);
        return {
          id: `merge-only-${record.id}`,
          handoverNo: createWarehouseHandoverNo(record.outboundOrderNo),
          inboundOrderNos: formatWarehouseHandoverInboundNos(packages),
          outboundOrderNo: record.outboundOrderNo,
          customerName: packages[0]?.systemOrderNo ?? '理货包裹',
          customerOrderNo: Array.from(new Set(packages.map((pkg) => pkg.customerOrderNo))).join('、') || '-',
          destinationCountry: getConsolidationDestination(record),
          packageCount: record.totalPackages,
          inboundTimes: formatWarehouseHandoverInboundTimes(packages),
          chargeableWeightKg: record.totalChargeableWeightKg,
          channelName: packages[0]?.receivingChannel || '待确认',
          status: '仅理货未出货'
        };
      })
  ];

  function getConsolidationPackages(record: WarehouseConsolidationRecord) {
    return warehousePackages.filter((pkg) => record.packageIds.includes(pkg.id));
  }

  function formatWarehouseHandoverInboundNos(packages: WarehouseInboundPackage[]) {
    const values = packages.map((pkg) => pkg.labelNo || formatWarehousePackageNo(pkg));
    return Array.from(new Set(values)).join('、') || '-';
  }

  function formatWarehouseHandoverInboundTimes(packages: WarehouseInboundPackage[]) {
    const values = packages.map((pkg) => pkg.scanTime || '-').filter((value) => value !== '-');
    return Array.from(new Set(values)).join('、') || '-';
  }

  function getConsolidationDestination(record: WarehouseConsolidationRecord) {
    return getConsolidationPackages(record).find((pkg) => pkg.destinationCountry.trim())?.destinationCountry ?? '待确认国家';
  }

  function formatWarehouseConsolidationMode(mode: WarehouseConsolidationRecord['mode']) {
    return mode === 'MERGE_AND_SHIP' ? '理货并出货' : '仅理货';
  }

  function printWarehouseOutboundLabels(record: WarehouseConsolidationRecord) {
    const destinationCountry = getConsolidationDestination(record);
    const labelNo = createWarehouseInternalLabelNo(record.outboundOrderNo);
    const labels = Array.from({ length: record.totalPackages }, (_, index): WarehouseOutboundLabel => ({
      id: `${record.id}-label-${index + 1}`,
      consolidationId: record.id,
      labelNo,
      outboundOrderNo: record.outboundOrderNo,
      destinationCountry,
      totalPackages: record.totalPackages,
      pieceIndex: index + 1
    }));
    setWarehouseOutboundLabelsByConsolidationId((current) => ({
      ...current,
      [record.id]: labels
    }));
    setWarehouseNotice(`已生成 ${record.outboundOrderNo} 面单 ${record.totalPackages} 张`);
  }

  function printWarehouseShipmentLabels(record: Shipment) {
    const totalPackages = Math.max(record.packageCount, 1);
    const labelNo = createWarehouseInternalLabelNo(record.systemOrderNo);
    const labels = Array.from({ length: totalPackages }, (_, index): WarehouseOutboundLabel => ({
      id: `${record.id}-warehouse-label-${index + 1}`,
      consolidationId: record.id,
      labelNo,
      outboundOrderNo: record.systemOrderNo,
      destinationCountry: record.destinationCountry,
      totalPackages,
      pieceIndex: index + 1
    }));
    setWarehouseShipmentLabelsByShipmentId((current) => ({
      ...current,
      [record.id]: labels
    }));
    setWarehouseNotice(`已生成仓库出货面单 ${record.systemOrderNo} ${totalPackages} 张`);
  }

  function dispatchWarehouseOutbound(record: WarehouseConsolidationRecord) {
    setDispatchedConsolidationIds((current) => Array.from(new Set([...current, record.id])));
    setWarehouseNotice(`已出货 ${record.outboundOrderNo}`);
  }

  async function dispatchWarehouseShipment(record: Shipment) {
    await onDispatch(record);
    setDispatchingWarehouseShipmentIds((current) => Array.from(new Set([...current, record.id])));
    setWarehouseNotice(`已出货 ${record.systemOrderNo}`);
  }

  function getWarehouseQueueOutboundNo(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.systemOrderNo : row.consolidation.outboundOrderNo;
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

  function getWarehouseQueueChannel(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.channelName || '-' : '-';
  }

  function getWarehouseQueueAgent(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' ? row.shipment.agentName || '-' : '-';
  }

  function getWarehouseQueueStageTime(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment' && row.shipment.routedAt ? formatBeijingDateTime(row.shipment.routedAt) : '-';
  }

  function getWarehouseQueueLabels(row: WarehouseLabelQueueRow) {
    return row.kind === 'shipment'
      ? warehouseShipmentLabelsByShipmentId[row.shipment.id] ?? []
      : warehouseOutboundLabelsByConsolidationId[row.consolidation.id] ?? [];
  }

  function createWarehouseHandoverHtml(rows: WarehouseHandoverRow[]) {
    const createdAt = formatBeijingDateTime(new Date().toISOString());
    const tableRows = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.handoverNo)}</td>
        <td>${escapeHtml(row.inboundOrderNos)}</td>
        <td>${escapeHtml(row.outboundOrderNo)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.customerOrderNo)}</td>
        <td>${escapeHtml(row.destinationCountry)}</td>
        <td>${row.packageCount}</td>
        <td>${escapeHtml(row.inboundTimes)}</td>
        <td>${row.chargeableWeightKg.toFixed(2)} kg</td>
        <td>${escapeHtml(row.channelName)}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>
    `).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>思远物流收货交接单</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #111827; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .meta { color: #64748b; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d8e1ee; padding: 8px 10px; font-size: 12px; text-align: left; }
    th { background: #f4f7fb; font-weight: 700; }
  </style>
</head>
<body>
  <h1>思远物流收货交接单</h1>
  <div class="meta">生成时间：${escapeHtml(createdAt)}；共 ${rows.length} 条交接记录</div>
  <table>
    <thead>
      <tr>
        <th>交接单号</th>
        <th>入库单号</th>
        <th>出货单号</th>
        <th>客户/来源</th>
        <th>客户单号</th>
        <th>出货国家</th>
        <th>出货件数</th>
        <th>入库时间</th>
        <th>计费重</th>
        <th>渠道</th>
        <th>状态</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;
  }

  function downloadWarehouseHandoverWord() {
    if (!warehouseHandoverRows.length) {
      setWarehouseNotice('当前暂无可导出的收货交接单数据');
      return;
    }
    downloadHtmlFile(createWarehouseHandoverHtml(warehouseHandoverRows), `思远物流-收货交接单-${Date.now()}.doc`, 'application/msword;charset=utf-8');
    setWarehouseNotice('已生成收货交接单 Word 文件');
  }

  function printWarehouseHandoverPdf() {
    if (!warehouseHandoverRows.length) {
      setWarehouseNotice('当前暂无可导出的收货交接单数据');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setWarehouseNotice('浏览器阻止了打印窗口，请允许弹窗后重试');
      return;
    }
    printWindow.document.write(createWarehouseHandoverHtml(warehouseHandoverRows));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setWarehouseNotice('已打开收货交接单 PDF 打印窗口');
  }

  const receiveSubItems: ModuleSubNavItem[] = [
    { key: 'dashboard', label: '仓库看板', description: '仓库作业总览' },
    { key: 'today', label: '今日收货', description: '扫描与收货入库' },
    { key: 'packages', label: '在仓数据', description: '件重尺采集' },
    { key: 'consolidation', label: '未完成理货', description: '合并 / 拆分 / 出货准备' },
    { key: 'completed-consolidation', label: '已完成理货', description: '已理货数据' },
    { key: 'pending-routing', label: '待排货', description: '待市场排货' },
    { key: 'queue', label: '待出库', description: '打单与出货确认' },
    { key: 'inbound', label: '待出库订单', description: '旧收货明细入口' },
    { key: 'exceptions', label: '收货交接单', description: '交接资料输出' }
  ];
  function formatWarehouseInboundProgress(pkg: WarehouseInboundPackage) {
    if (!pkg.expectedTotalPackageCount) {
      return '-';
    }
    const arrived = warehousePackages.filter((item) => item.customerOrderNo === pkg.customerOrderNo).length;
    return `已到 ${arrived}/${pkg.expectedTotalPackageCount}`;
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
    const combinedParts = parseWarehousePackageCode(packageDraft.combinedOrderNo.trim());
    const customerOrderNo = combinedParts.customerOrderNo || packageDraft.customerCode.trim();
    const domesticTrackingNo = combinedParts.domesticTrackingNo || packageDraft.domesticTrackingNo.trim();
    const input: WarehousePackageCreateInput = {
      customerCode: packageDraft.customerCode.trim(),
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: `${customerOrderNo}-${domesticTrackingNo}`,
      expectedTotalPackageCount: packageDraft.totalPackageCount,
      packageIndex: packageDraft.packageIndex,
      packageCount: packageDraft.packageCount,
      weightKg: packageDraft.weightKg,
      lengthCm: packageDraft.lengthCm,
      widthCm: packageDraft.widthCm,
      heightCm: packageDraft.heightCm,
      scanTime: packageDraft.scanTime ? new Date(packageDraft.scanTime).toISOString() : new Date().toISOString(),
      remark: packageDraft.remark.trim() || undefined,
      manualException: packageDraft.manualException.trim() || undefined,
      scanSource: '手动添加'
    };
    try {
      const created = await apiClient.createWarehousePackage(input);
      const nextPackage = mapWarehouseApiPackageToInbound(created);
      setWarehousePackages((current) => withWarehouseCustomerProgress([nextPackage, ...current]));
      setTodayReceiptRows((current) => [nextPackage, ...current]);
      setTodayTotals((current) => calculateTodayTotals([nextPackage, ...todayReceiptRows], current.waitingDispatchTickets));
      setWarehouseNotice(`已手动添加收货 ${nextPackage.combinedOrderNo}`);
      patchPackageDraft({
        domesticTrackingNo: '',
        combinedOrderNo: '',
        scanTime: createWarehouseDateTimeInputValue(),
        weightKg: 0,
        lengthCm: 0,
        widthCm: 0,
        heightCm: 0,
        packageCount: 1,
        packageIndex: Math.min(packageDraft.totalPackageCount, packageDraft.packageIndex + 1),
        remark: '',
        manualException: ''
      });
      setTodayFilters((current) => ({ ...current }));
      setManualReceiptDrawerOpen(false);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '手动添加收货失败');
    }
  }

  const todayReceiptColumnDefinitions: Record<string, ColumnsType<WarehouseInboundPackage>[number]> = {
    select: {
      title: '',
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
    customerOrderNo: { title: '客户单号', dataIndex: 'customerOrderNo', width: 120, sorter: (a, b) => a.customerOrderNo.localeCompare(b.customerOrderNo) },
    domesticTrackingNo: { title: '快递单号', dataIndex: 'domesticTrackingNo', width: 150, sorter: (a, b) => a.domesticTrackingNo.localeCompare(b.domesticTrackingNo) },
    combinedOrderNo: {
      title: '客户单号-快递单号',
      dataIndex: 'combinedOrderNo',
      width: 240,
      fixed: 'left',
      sorter: (a, b) => a.combinedOrderNo.localeCompare(b.combinedOrderNo),
      render: (value: string) => <Text strong className="warehouse-today-order-no">{value}</Text>
    },
    packageCount: { title: '件数', dataIndex: 'packageCount', width: 80, align: 'right', sorter: (a, b) => a.packageCount - b.packageCount },
    weightKg: { title: '单件实重', dataIndex: 'weightKg', width: 110, align: 'right', sorter: (a, b) => a.weightKg - b.weightKg, render: (value: number) => value.toFixed(2) },
    dimensions: { title: '尺寸 cm', key: 'dimensions', width: 130, render: (_, record) => `${record.lengthCm}×${record.widthCm}×${record.heightCm}` },
    cbm: { title: '单件方数', dataIndex: 'cbm', width: 110, align: 'right', sorter: (a, b) => a.cbm - b.cbm, render: (value: number) => value.toFixed(6) },
    vol5000: { title: '单件5000材积', key: 'vol5000', width: 130, align: 'right', render: (_, record) => (record.volumetricWeightKg5000 ?? calculateWarehouseVolumetricWeight(record, 5000)).toFixed(2) },
    vol6000: { title: '单件6000材积', key: 'vol6000', width: 130, align: 'right', render: (_, record) => calculateWarehouseVolumetricWeight(record, 6000).toFixed(2) },
    scanTime: { title: '扫描时间', dataIndex: 'scanTime', width: 160, defaultSortOrder: 'descend', sorter: (a, b) => (a.scanTime ?? '').localeCompare(b.scanTime ?? ''), render: (value?: string) => value || '-' },
    remark: {
      title: '备注',
      dataIndex: 'remark',
      width: 220,
      render: (value: string | undefined, record) => canWriteWarehouse
        ? <Input defaultValue={value} aria-label={`今日收货备注 ${record.combinedOrderNo}`} onBlur={(event) => void updateWarehousePackageRemark(record.id, event.target.value)} />
        : (value || '')
    },
    createdBy: { title: '操作人', dataIndex: 'createdBy', width: 110, render: (value?: string) => value || '-' },
    createdAt: { title: '操作时间', dataIndex: 'createdAt', width: 160, render: (value?: string) => value || '-' },
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
    }
  };
  const todayReceiptColumns = visibleTodayColumns
    .filter((key) => (key !== 'site' || !isOperatorView) && (canWriteWarehouse || key !== 'select'))
    .map((key) => todayReceiptColumnDefinitions[key])
    .filter(Boolean) as ColumnsType<WarehouseInboundPackage>;

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

  const inStockColumnDefinitions: Record<string, ColumnsType<WarehouseInboundPackage>[number]> = {
    select: {
      title: '',
      key: 'select',
      width: 56,
      fixed: 'left',
      render: (_, record) => (
        <Checkbox
          aria-label={`选择在仓包裹 ${formatWarehousePackageNo(record)}`}
          checked={selectedInStockPackageIds.includes(record.id)}
          onChange={(event) => toggleInStockPackage(record.id, event.target.checked)}
        />
      )
    },
    site: { title: '站点', dataIndex: 'site', width: 110, render: (value?: string) => value || '-' },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 110, sorter: (a, b) => a.customerCode.localeCompare(b.customerCode) },
    customerName: { title: '客户名称', dataIndex: 'customerName', width: 150, render: (value?: string) => value || '-' },
    domesticTrackingNo: { title: '快递单号', dataIndex: 'domesticTrackingNo', width: 150, sorter: (a, b) => a.domesticTrackingNo.localeCompare(b.domesticTrackingNo) },
    combinedOrderNo: {
      title: '客户单号-快递单号',
      dataIndex: 'combinedOrderNo',
      width: 240,
      fixed: 'left',
      sorter: (a, b) => a.combinedOrderNo.localeCompare(b.combinedOrderNo),
      render: (value: string) => <Text strong className="warehouse-today-order-no">{value}</Text>
    },
    packageCount: { title: '件数', dataIndex: 'packageCount', width: 80, align: 'right', sorter: (a, b) => a.packageCount - b.packageCount },
    weightKg: { title: '单件实重', dataIndex: 'weightKg', width: 110, align: 'right', sorter: (a, b) => a.weightKg - b.weightKg, render: (value: number) => value.toFixed(2) },
    dimensions: { title: '尺寸 cm', key: 'dimensions', width: 130, render: (_, record) => `${record.lengthCm}×${record.widthCm}×${record.heightCm}` },
    cbm: { title: '单件方数', dataIndex: 'cbm', width: 110, align: 'right', sorter: (a, b) => calculateSingleCbm(a) - calculateSingleCbm(b), render: (_, record) => calculateSingleCbm(record).toFixed(6) },
    girth: { title: '围长', key: 'girth', width: 90, align: 'right', sorter: (a, b) => (a.girthCm ?? calculatePackageGirth(a)) - (b.girthCm ?? calculatePackageGirth(b)), render: (_, record) => (record.girthCm ?? calculatePackageGirth(record)).toFixed(0) },
    vol5000: { title: '单件5000材积', key: 'vol5000', width: 130, align: 'right', render: (_, record) => calculateSingleVolumetricWeight(record, 5000).toFixed(2) },
    vol6000: { title: '单件6000材积', key: 'vol6000', width: 130, align: 'right', render: (_, record) => calculateSingleVolumetricWeight(record, 6000).toFixed(2) },
    scanTime: { title: '入仓时间', dataIndex: 'inboundAt', width: 160, sorter: (a, b) => (a.inboundAt ?? a.scanTime ?? '').localeCompare(b.inboundAt ?? b.scanTime ?? ''), render: (value: string | undefined, record) => value || record.scanTime || '-' },
    totalWeight: { title: '总实重', key: 'totalWeight', width: 110, align: 'right', render: (_, record) => (record.weightKg * record.packageCount).toFixed(2) },
    totalCbm: { title: '总体积', key: 'totalCbm', width: 110, align: 'right', render: (_, record) => (calculateSingleCbm(record) * record.packageCount).toFixed(3) },
    totalVol5000: { title: '总5000材积', key: 'totalVol5000', width: 130, align: 'right', render: (_, record) => (calculateSingleVolumetricWeight(record, 5000) * record.packageCount).toFixed(2) },
    totalVol6000: { title: '总6000材积', key: 'totalVol6000', width: 130, align: 'right', render: (_, record) => (calculateSingleVolumetricWeight(record, 6000) * record.packageCount).toFixed(2) },
    tallyStatus: { title: '理货状态', dataIndex: 'tallyStatus', width: 110, render: (value?: string) => value || '待理货' },
    splitStatus: { title: '拆票状态', dataIndex: 'splitStatus', width: 110, render: (value?: string) => value || '原始票' },
    consolidationStatus: { title: '合票状态', dataIndex: 'consolidationStatus', width: 110, render: (value?: string) => value || '未合票' },
    outboundStatus: { title: '出库状态', dataIndex: 'outboundStatus', width: 110, render: (value?: string) => value || '未出库' },
    remark: {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      render: (value: string | undefined, record) => (
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
      )
    },
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
    actions: {
      title: '操作',
      key: 'actions',
      width: 230,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          {canCreateOrderEntryFromWarehouse ? <Button size="small" onClick={() => onCreateOrderEntry?.([record.id])}>录单</Button> : null}
          {canWriteWarehouse ? (
            <>
              <Button size="small" onClick={() => openWarehouseTallyTask([record.id])}>理货</Button>
              <Button
                size="small"
                onClick={() => {
                  const left = Math.max(1, Math.floor(record.packageCount / 2));
                  const right = Math.max(1, record.packageCount - left);
                  setSplittingPackage(record);
                  setSplitDraft({ splitCount: 2, pieces: record.packageCount > 1 ? `${left},${right}` : '', remark: '' });
                }}
              >
                拆票
              </Button>
              <Button size="small" type="primary" onClick={() => openInStockConsolidation([record.id])}>合票</Button>
            </>
          ) : null}
        </Space>
      )
    }
  };
  const inStockColumns = visibleInStockColumns
    .filter((key) => (key !== 'site' || !isOperatorView) && (canWriteWarehouse || (key !== 'select' && key !== 'actions')))
    .map((key) => inStockColumnDefinitions[key])
    .filter(Boolean) as ColumnsType<WarehouseInboundPackage>;

  const warehousePackageColumns: ColumnsType<WarehouseInboundPackage> = [
    { title: '系统单号', dataIndex: 'systemOrderNo', width: 150, render: (value?: string) => renderShipmentOrderNoLink(value, { subtitle: findShipmentBySystemOrderNo(value) ? '点击查看详情' : '仓库入库单' }) },
    {
      title: '客户单号-快递单号',
      width: 210,
      render: (_, record) => <Text strong>{formatWarehousePackageNo(record)}</Text>
    },
    {
      title: '到仓进度',
      width: 110,
      render: (_, record) => formatWarehouseInboundProgress(record)
    },
    { title: '件数', dataIndex: 'packageCount', width: 80 },
    { title: '实重', dataIndex: 'weightKg', width: 90, render: (value: number) => value.toFixed(2) },
    { title: '尺寸 cm', width: 130, render: (_, record) => `${record.lengthCm}×${record.widthCm}×${record.heightCm}` },
    { title: '方数', dataIndex: 'cbm', width: 100, render: (value: number) => value.toFixed(6) },
    { title: '5000材积', width: 110, render: (_, record) => calculateWarehouseVolumetricWeight(record, 5000).toFixed(2) },
    { title: '6000材积', width: 110, render: (_, record) => calculateWarehouseVolumetricWeight(record, 6000).toFixed(2) },
    { title: '扫描时间', dataIndex: 'scanTime', width: 150, render: (value?: string) => value || '-' },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 220,
      render: (value: string | undefined, record) => (
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
      )
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
  const warehouseRemainingPackageColumns: ColumnsType<WarehouseRemainingPackageRow> = [
    { title: '客户单号', dataIndex: 'customerOrderNo', width: 140 },
    { title: '剩余件序号', dataIndex: 'packageSequence', width: 160 },
    { title: '状态', dataIndex: 'status', width: 130, render: (value: string) => <Tag color="warning">{value}</Tag> },
    { title: '说明', dataIndex: 'note' }
  ];
  function patchPackageDraft(patch: Partial<WarehousePackageDraft>) {
    setPackageDraft((current) => ({ ...current, ...patch }));
  }

  async function addWarehousePackage() {
    if (!packageDraft.customerCode.trim()) {
      setWarehouseNotice('请先填写业务员唛头');
      return;
    }
    if (!packageDraft.domesticTrackingNo.trim()) {
      setWarehouseNotice('请先填写快递单号');
      return;
    }
    const input: WarehousePackageCreateInput = {
      customerCode: packageDraft.customerCode.trim(),
      customerOrderNo: packageDraft.customerCode.trim(),
      domesticTrackingNo: packageDraft.domesticTrackingNo.trim(),
      expectedTotalPackageCount: packageDraft.totalPackageCount,
      packageIndex: packageDraft.packageIndex,
      packageCount: packageDraft.packageCount,
      weightKg: packageDraft.weightKg,
      lengthCm: packageDraft.lengthCm,
      widthCm: packageDraft.widthCm,
      heightCm: packageDraft.heightCm,
      scanTime: new Date().toISOString(),
      remark: packageDraft.remark.trim() || undefined,
      manualException: packageDraft.manualException.trim() || undefined,
      scanSource: '手动添加'
    };
    try {
      const created = await apiClient.createWarehousePackage(input);
      const nextPackage = mapWarehouseApiPackageToInbound(created);
      setWarehousePackages((current) => withWarehouseCustomerProgress([nextPackage, ...current]));
      setWarehouseNotice(`已新增入库包裹 ${nextPackage.combinedOrderNo}`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '新增入库包裹失败');
      return;
    }
    patchPackageDraft({
      domesticTrackingNo: '',
      weightKg: 0,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
      packageCount: 1,
      packageIndex: Math.min(packageDraft.totalPackageCount, packageDraft.packageIndex + 1),
      remark: '',
      manualException: ''
    });
  }

  async function splitSelectedWarehousePackage() {
    if (!splittingPackage) {
      return;
    }
    const pieces = splitDraft.pieces
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
    try {
      const result = await apiClient.splitWarehousePackage(splittingPackage.id, {
        splitCount: pieces.length ? undefined : splitDraft.splitCount,
        pieces: pieces.length ? pieces : undefined,
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
      setWarehouseNotice(`已拆分 ${splittingPackage.combinedOrderNo} 为 ${packages.length} 个新箱`);
      setSplittingPackage(null);
      setSplitDraft({ splitCount: 2, pieces: '', remark: '' });
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '拆分入库箱失败');
    }
  }

  function openInStockConsolidation(packageIds: string[]) {
    const ids = Array.from(new Set(packageIds)).filter(Boolean);
    if (!ids.length) {
      setWarehouseNotice(`请先勾选需要${consolidationActionLabel}的包裹`);
      return;
    }
    setInStockConsolidationIds(ids);
    setTallyRequirementDraft('');
  }

  function openWarehouseTallyTask(packageIds: string[]) {
    const ids = Array.from(new Set(packageIds)).filter(Boolean);
    if (!ids.length) {
      setWarehouseNotice('请先勾选需要理货的在仓包裹');
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

  function openCompleteTallyTask(task: WarehouseTallyTaskSummary) {
    setCompletingTallyTask(task);
    setTallyCompleteDraft({
      packageCount: task.packageCount,
      weightKg: task.originalWeightKg,
      lengthCm: task.originalLengthCm,
      widthCm: task.originalWidthCm,
      heightCm: task.originalHeightCm,
      remark: task.remark ?? ''
    });
  }

  async function completeWarehouseTallyTask() {
    if (!completingTallyTask) {
      return;
    }
    try {
      const completed = await apiClient.completeWarehouseTallyTask(completingTallyTask.id, tallyCompleteDraft);
      setTallyTasks((current) => current.map((task) => (task.id === completed.id ? completed : task)));
      setCompletingTallyTask(null);
      setWarehouseNotice(`已完成理货任务 ${completed.taskNo}`);
      setActiveReceiveSection('completed-consolidation');
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '完成理货失败');
    }
  }

  function replaceTallyTask(updated: WarehouseTallyTaskSummary) {
    setTallyTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
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
    try {
      const updated = await apiClient.printWarehouseTallyTaskLabel(task.id);
      replaceTallyTask(updated);
      setWarehouseNotice(`已记录理货标签打印 ${updated.labelNo ?? updated.taskNo}`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '打印理货标签失败');
    }
  }

  async function downloadWarehouseTallyLabel(task: WarehouseTallyTaskSummary) {
    try {
      const updated = await apiClient.downloadWarehouseTallyTaskLabel(task.id);
      replaceTallyTask(updated);
      downloadHtmlFile(createWarehouseTallyLabelHtml(updated), `理货后标签-${updated.labelNo ?? updated.taskNo}.html`, 'text/html;charset=utf-8');
      setWarehouseNotice(`已下载理货标签 ${updated.labelNo ?? updated.taskNo}`);
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '下载理货标签失败');
    }
  }

  async function consolidateInStockPackages() {
    if (!inStockConsolidationIds.length) {
      setWarehouseNotice(`请先选择要${consolidationActionLabel}的包裹`);
      return;
    }
    try {
      const created = await apiClient.createWarehouseConsolidation({
        packageIds: inStockConsolidationIds,
        mode: 'MERGE_ONLY',
        tallyRequirement: tallyRequirementDraft.trim() || undefined
      });
      const packageIds = [...inStockConsolidationIds];
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
      setInStockRows((current) => current.filter((pkg) => !record.packageIds.includes(pkg.id)));
      setSelectedInStockPackageIds([]);
      setInStockConsolidationIds([]);
      setTallyRequirementDraft('');
      setInStockFilters((current) => ({ ...current }));
      setWarehouseNotice(canCreateOrderEntryFromWarehouse ? `已合票 ${record.outboundOrderNo}，已进入录单草稿` : `已合票 ${record.outboundOrderNo}`);
      if (canCreateOrderEntryFromWarehouse) {
        onCreateOrderEntry?.(packageIds);
      }
    } catch (error) {
      setWarehouseNotice(error instanceof Error ? error.message : '合票生成运单失败');
    }
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

  async function routeWarehouseShipment(record: Shipment) {
    if (!onRoute) {
      setWarehouseNotice('当前账号没有排货入口');
      return;
    }
    await onRoute(record);
    setActiveReceiveSection('queue');
    setWarehouseNotice(`已排货 ${record.systemOrderNo}，进入待出库`);
  }

  const pendingRoutingColumns: ColumnsType<Shipment> = [
    { title: '站点', dataIndex: 'site', width: 100, render: (value?: string) => value || '-' },
    { title: '业务员', dataIndex: 'salesperson', width: 110, render: (value?: string) => value || '-' },
    { title: '渠道', dataIndex: 'channelName', width: 160, render: (value?: string) => value || '待分配' },
    { title: '目的地', dataIndex: 'destinationCountry', width: 120, render: (value?: string) => value || '-' },
    { title: '状态', width: 110, render: () => <Tag color="processing">{shipmentStatusLabels.WAITING_SORT}</Tag> },
    {
      title: '操作',
      width: 120,
      fixed: 'right',
      render: (_, record) => canRouteShipments ? (
        <Button size="small" type="primary" onClick={() => void routeWarehouseShipment(record)}>
          排货
        </Button>
      ) : <Text type="secondary">只读</Text>
    }
  ];

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
          {config.stats.map((stat) => (
            <Col xs={24} md={8} key={stat.label}>
              <MetricCard icon={<PackagePlus />} title={stat.label} value={stat.value} extra={stat.helper} />
            </Col>
          ))}
        </Row>
      ) : null}

      <ModuleSubWorkspace items={receiveSubItems} activeKey={activeReceiveSection} onChange={setActiveReceiveSection}>
      {activeReceiveSection === 'dashboard' ? <PlaceholderPanel title="仓库看板" /> : null}
      {activeReceiveSection === 'completed-consolidation' ? (
        <Card
          title={(
            <Space size={12}>
              <span>已完成理货</span>
              <Text type="secondary">共 {completedTallyTasks.length} 条</Text>
            </Space>
          )}
        >
          <Table<WarehouseTallyTaskSummary>
            rowKey="id"
            dataSource={completedTallyTasks}
            size="small"
            pagination={tenRowTablePagination}
            scroll={{ x: 1500 }}
            columns={[
              { title: '理货任务号', dataIndex: 'taskNo', width: 210 },
              { title: '来源组合号', dataIndex: 'sourceCombinedOrderNo', width: 210 },
              { title: '原始件数', dataIndex: 'packageCount', width: 90, align: 'right' },
              { title: '原始重量', dataIndex: 'originalWeightKg', width: 110, align: 'right', render: (value: number) => `${value.toFixed(2)} kg` },
              { title: '原始尺寸', width: 130, render: (_, task) => `${task.originalLengthCm}×${task.originalWidthCm}×${task.originalHeightCm}` },
              { title: '理货后件数', dataIndex: 'completedPackageCount', width: 110, align: 'right' },
              { title: '理货后重量', dataIndex: 'completedWeightKg', width: 120, align: 'right', render: (value?: number) => (value === undefined ? '-' : `${value.toFixed(2)} kg`) },
              { title: '理货后尺寸', width: 130, render: (_, task) => task.completedLengthCm ? `${task.completedLengthCm}×${task.completedWidthCm}×${task.completedHeightCm}` : '-' },
              { title: '5000/6000材积', width: 150, render: (_, task) => `${(task.completedVolumetricWeightKg5000 ?? 0).toFixed(2)} / ${(task.completedVolumetricWeightKg ?? 0).toFixed(2)}` },
              { title: '完成人', dataIndex: 'completedBy', width: 100, render: (value?: string) => value || '-' },
              { title: '完成时间', dataIndex: 'completedAt', width: 170, render: (value?: string) => value || '-' },
              { title: '标签号', dataIndex: 'labelNo', width: 180, render: (value?: string) => value || '-' },
              { title: '二维码内容', dataIndex: 'labelQrContent', width: 260, ellipsis: true, render: (value?: string) => value || '-' },
              {
                title: '标签状态',
                dataIndex: 'labelStatus',
                width: 180,
                render: (_, task) => (
                  <Space size={4} wrap>
                    <Tag color={task.labelStatus === 'GENERATED' ? 'green' : 'default'}>{task.labelStatus === 'GENERATED' ? '已生成' : '待生成'}</Tag>
                    {task.labelPrintedAt ? <Tag color="blue">已打印</Tag> : null}
                    {task.labelDownloadedAt ? <Tag color="purple">已下载</Tag> : null}
                  </Space>
                )
              },
              {
                title: '标签操作',
                key: 'labelActions',
                width: 220,
                fixed: 'right',
                render: (_, task) => canWriteWarehouse ? (
                  <Space size={6}>
                    <Button size="small" onClick={() => void generateWarehouseTallyLabel(task)}>{task.labelNo ? '重打标签' : '生成标签'}</Button>
                    <Button size="small" disabled={!task.labelNo} onClick={() => void printWarehouseTallyLabel(task)}>打印</Button>
                    <Button size="small" disabled={!task.labelNo} onClick={() => void downloadWarehouseTallyLabel(task)}>下载</Button>
                  </Space>
                ) : null
              }
            ]}
          />
        </Card>
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
          <Table<Shipment>
            rowKey="id"
            dataSource={pendingRoutingShipments}
            size="small"
            pagination={tenRowTablePagination}
            scroll={{ x: 720 }}
            columns={pendingRoutingColumns}
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
                      <Input type="date" aria-label="今日收货开始日期" value={todayFilterDraft.customFrom ?? ''} onChange={(event) => updateTodayFilterDraft({ customFrom: event.target.value })} />
                    ))}
                  </Col>
                  <Col xs={24} md={8} xl={3}>
                    {renderFilterField('结束日期', (
                      <Input type="date" aria-label="今日收货结束日期" value={todayFilterDraft.customTo ?? ''} onChange={(event) => updateTodayFilterDraft({ customTo: event.target.value })} />
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
                {renderFilterField('客户单号', (
                  <Input aria-label="今日收货客户单号筛选" value={todayFilterDraft.customerOrderNo ?? ''} onChange={(event) => updateTodayFilterDraft({ customerOrderNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={3}>
                {renderFilterField('快递单号', (
                  <Input aria-label="今日收货快递单号筛选" value={todayFilterDraft.domesticTrackingNo ?? ''} onChange={(event) => updateTodayFilterDraft({ domesticTrackingNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterField('客户单号-快递单号', (
                  <Input aria-label="今日收货组合单号筛选" value={todayFilterDraft.combinedOrderNo ?? ''} onChange={(event) => updateTodayFilterDraft({ combinedOrderNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterActions(
                  () => setTodayFilters({ ...todayFilterDraft }),
                  () => {
                    setTodayFilterDraft(emptyTodayFilters);
                    setTodayFilters(emptyTodayFilters);
                  }
                )}
              </Col>
            </Row>

            <div className="warehouse-today-metrics">
              <Statistic title="收货票数" value={todayTotals.receiptTickets} suffix="票" />
              <Statistic title="总件数" value={todayTotals.totalPackages} suffix="件" />
              <Statistic title="总重量" value={todayTotals.totalWeightKg} suffix="kg" precision={2} />
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
              {selectedTodayPackageIds.length ? <Tag color="blue">已选 {selectedTodayPackageIds.length}</Tag> : null}
            </Space>
          )}
          extra={(
            <Space wrap>
              {canWriteWarehouse ? (
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
              <Popover
                trigger="click"
                placement="bottomRight"
                content={(
                  <div className="warehouse-today-column-popover">
                    {Object.keys(todayReceiptColumnDefinitions)
                      .filter((key) => key !== 'select' && (key !== 'site' || !isOperatorView))
                      .map((key) => (
                        <Checkbox key={key} checked={visibleTodayColumns.includes(key)} onChange={(event) => toggleTodayColumn(key, event.target.checked)}>
                          {String(todayReceiptColumnDefinitions[key].title)}
                        </Checkbox>
                      ))}
                  </div>
                )}
              >
                <Button>列设置</Button>
              </Popover>
              {canWriteWarehouse ? <Button type="primary" onClick={() => setManualReceiptDrawerOpen(true)}>手动添加收货</Button> : null}
            </Space>
          )}
        >
          <ManagedTable<WarehouseInboundPackage>
            rowKey="id"
            columns={todayReceiptColumns}
            dataSource={todayReceiptRows}
            size="small"
            pagination={tenRowTablePagination}
            minimumScrollX={1400}
          />
        </Card>

        <Drawer
          title="手动添加收货"
          width={560}
          open={manualReceiptDrawerOpen}
          onClose={() => setManualReceiptDrawerOpen(false)}
          destroyOnClose={false}
          footer={(
            <Flex justify="space-between" align="center" gap={12} className="warehouse-today-drawer-footer">
              <Space wrap>
                <Tag color="cyan">单件方数 {draftMetrics.cbm.toFixed(3)} CBM</Tag>
                <Tag color="blue">单件5000材积 {calculateWarehouseVolumetricWeight(packageDraft, 5000).toFixed(2)} kg</Tag>
                <Tag color="purple">单件6000材积 {calculateWarehouseVolumetricWeight(packageDraft, 6000).toFixed(2)} kg</Tag>
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
                  <Input aria-label="手动添加客户编号" value={packageDraft.customerCode} onChange={(event) => patchTodayManualCustomerCode(event.target.value)} />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>快递单号</Text>
                  <Input aria-label="手动添加快递单号" value={packageDraft.domesticTrackingNo} onChange={(event) => patchTodayManualTrackingNo(event.target.value)} />
                </Col>
                <Col xs={24}>
                  <Text strong>客户单号-快递单号</Text>
                  <Input
                    aria-label="手动添加客户单号-快递单号"
                    value={packageDraft.combinedOrderNo}
                    onChange={(event) => patchPackageDraft({ combinedOrderNo: event.target.value })}
                  />
                </Col>
              </Row>
            </div>

            <div>
              <Text strong>件重尺</Text>
              <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
                <Col xs={12} md={8}>
                  <Text strong>件数</Text>
                  <Input aria-label="手动添加件数" value={packageDraft.packageCount} onChange={(event) => patchPackageDraft({ packageCount: Number(event.target.value) || 1 })} />
                </Col>
                <Col xs={12} md={8}>
                  <Text strong>单件实重</Text>
                  <Input aria-label="手动添加单件实重" value={packageDraft.weightKg} onChange={(event) => patchPackageDraft({ weightKg: Number(event.target.value) || 0 })} />
                </Col>
                <Col xs={12} md={8}>
                  <Text strong>长 cm</Text>
                  <Input aria-label="手动添加长 cm" value={packageDraft.lengthCm} onChange={(event) => patchPackageDraft({ lengthCm: Number(event.target.value) || 0 })} />
                </Col>
                <Col xs={12} md={8}>
                  <Text strong>宽 cm</Text>
                  <Input aria-label="手动添加宽 cm" value={packageDraft.widthCm} onChange={(event) => patchPackageDraft({ widthCm: Number(event.target.value) || 0 })} />
                </Col>
                <Col xs={12} md={8}>
                  <Text strong>高 cm</Text>
                  <Input aria-label="手动添加高 cm" value={packageDraft.heightCm} onChange={(event) => patchPackageDraft({ heightCm: Number(event.target.value) || 0 })} />
                </Col>
              </Row>
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
      {activeReceiveSection === 'inbound' ? (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="待出库订单">
          <Card size="small" title="扫描 / 载入待出库订单" className="warehouse-scan-card">
            <Row gutter={[16, 12]} align="middle">
              <Col xs={24} md={10}>
                <Input aria-label="扫描单号" placeholder="扫描客户单号、运单号、箱号" value={selectedReceiptShipment?.systemOrderNo ?? ''} readOnly />
              </Col>
              <Col xs={24} md={14}>
                <Space direction="vertical" size={2}>
                  <Text strong>{selectedReceiptShipment?.systemOrderNo ?? '暂无待出库订单'}</Text>
                  <Text type="secondary">当前订单：{selectedReceiptShipment?.customerName ?? '暂无'} / {selectedReceiptShipment?.customerOrderNo ?? '-'}</Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Card>

        <Card title="待出库订单">
          <Table
            rowKey="id"
            columns={[
              { title: '系统单号', dataIndex: 'systemOrderNo', render: (value: string, record: Shipment) => renderShipmentOrderNoLink(value, { shipment: record }) },
              { title: '客户单号', dataIndex: 'customerOrderNo' },
              { title: '客户', dataIndex: 'customerName' },
              { title: '目的地', dataIndex: 'destinationCountry' },
              { title: '状态', dataIndex: 'status', render: (status: ShipmentStatus) => <StatusTag status={status} /> }
            ]}
            dataSource={workQueue}
            size="small"
            pagination={tenRowTablePagination}
          />
        </Card>

        <Card title="API 包裹数据明细" extra={<Tag color="blue">仓库接口返回</Tag>}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="此处只展示仓库 API 返回的包裹明细：客户单号、快递单号、实重、长宽高、方数、5000/6000材积、扫描时间、备注和到仓进度。"
            />
            <Table
              rowKey="id"
              columns={warehousePackageColumns}
              dataSource={warehousePackages.filter((pkg) => pkg.shipmentId.startsWith('api-'))}
              size="small"
              pagination={tenRowTablePagination}
              scroll={{ x: 1500 }}
            />
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={9}>
            <Card title="入库标签预览">
              <WarehouseInboundLabelCard
                customerCode={inboundLabelPreview.customerCode}
                domesticTrackingNo={inboundLabelPreview.domesticTrackingNo}
                packageIndex={inboundLabelPreview.packageIndex}
                totalPackageCount={inboundLabelPreview.totalPackageCount}
                scanTime={inboundLabelPreview.scanTime}
              />
              <Button block className="warehouse-label-print-button">打印当前入库标签</Button>
            </Card>
          </Col>
          <Col xs={24} xl={15}>
            <Card title="快速入库录入">
              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Text strong>业务员唛头</Text>
                  <Input maxLength={8} aria-label="业务员唛头" placeholder="最长 8 位" value={packageDraft.customerCode} onChange={(event) => patchPackageDraft({ customerCode: event.target.value })} />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>快递单号</Text>
                  <Input maxLength={64} aria-label="快递单号" placeholder="支持长快递号/设备条码" value={packageDraft.domesticTrackingNo} onChange={(event) => patchPackageDraft({ domesticTrackingNo: event.target.value })} />
                </Col>
                <Col xs={12} md={4}>
                  <Text strong>总箱数</Text>
                  <Input aria-label="总箱数" value={packageDraft.totalPackageCount} onChange={(event) => patchPackageDraft({ totalPackageCount: Number(event.target.value) || 1 })} />
                </Col>
                <Col xs={12} md={4}>
                  <Text strong>当前箱序</Text>
                  <Input aria-label="当前箱序" value={packageDraft.packageIndex} onChange={(event) => patchPackageDraft({ packageIndex: Number(event.target.value) || 1 })} />
                </Col>
                <Col xs={24} md={4}>
                  <Text strong>重量 kg</Text>
                  <Input aria-label="重量 kg" value={packageDraft.weightKg} onChange={(event) => patchPackageDraft({ weightKg: Number(event.target.value) || 0 })} />
                </Col>
                <Col xs={24} md={4}>
                  <Text strong>长 cm</Text>
                  <Input aria-label="长 cm" value={packageDraft.lengthCm} onChange={(event) => patchPackageDraft({ lengthCm: Number(event.target.value) || 0 })} />
                </Col>
                <Col xs={24} md={4}>
                  <Text strong>宽 cm</Text>
                  <Input aria-label="宽 cm" value={packageDraft.widthCm} onChange={(event) => patchPackageDraft({ widthCm: Number(event.target.value) || 0 })} />
                </Col>
                <Col xs={24} md={4}>
                  <Text strong>高 cm</Text>
                  <Input aria-label="高 cm" value={packageDraft.heightCm} onChange={(event) => patchPackageDraft({ heightCm: Number(event.target.value) || 0 })} />
                </Col>
                <Col xs={24} md={4}>
                  <Text strong>件数</Text>
                  <Input aria-label="明细件数" value={packageDraft.packageCount} onChange={(event) => patchPackageDraft({ packageCount: Number(event.target.value) || 1 })} />
                </Col>
                <Col xs={24}>
                  <Text strong>备注</Text>
                  <Input aria-label="入库备注" placeholder="木架、木箱、超大件、手测等" value={packageDraft.remark} onChange={(event) => patchPackageDraft({ remark: event.target.value })} />
                </Col>
              </Row>
              <Flex justify="space-between" align="center" className="warehouse-summary-strip">
                <Space wrap>
                  <Tag color="cyan">方数 {draftMetrics.cbm.toFixed(3)} CBM</Tag>
                  <Tag color="blue">6000材积 {draftMetrics.volumetricWeightKg.toFixed(2)} kg</Tag>
                  <Tag color="green">计费重 {draftMetrics.chargeableWeightKg.toFixed(2)} kg</Tag>
                </Space>
                {canWriteWarehouse ? <Button type="primary" onClick={() => void addWarehousePackage()}>新增入库包裹</Button> : null}
              </Flex>
            </Card>
          </Col>
        </Row>

        <Card title="本单包裹明细">
          <Table
            rowKey="id"
            columns={warehousePackageColumns}
            dataSource={currentShipmentPackages}
            size="small"
            pagination={tenRowTablePagination}
            scroll={{ x: 1280 }}
          />
        </Card>
      </Space>
      ) : null}

      {activeReceiveSection === 'packages' ? (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="warehouse-today-overview">
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
                {renderFilterField('客户单号', (
                  <Input aria-label="在仓客户单号筛选" value={inStockFilterDraft.customerOrderNo ?? ''} onChange={(event) => updateInStockFilterDraft({ customerOrderNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterField('快递单号', (
                  <Input aria-label="在仓快递单号筛选" value={inStockFilterDraft.domesticTrackingNo ?? ''} onChange={(event) => updateInStockFilterDraft({ domesticTrackingNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={5}>
                {renderFilterField('客户单号-快递单号', (
                  <Input aria-label="在仓组合单号筛选" value={inStockFilterDraft.combinedOrderNo ?? ''} onChange={(event) => updateInStockFilterDraft({ combinedOrderNo: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterField('操作日志', (
                  <Input aria-label="在仓操作日志查找" value={inStockFilterDraft.operationKeyword ?? ''} onChange={(event) => updateInStockFilterDraft({ operationKeyword: event.target.value })} />
                ))}
              </Col>
              <Col xs={24} md={8} xl={4}>
                {renderFilterActions(
                  () => setInStockFilters({ ...inStockFilterDraft }),
                  () => {
                    setInStockFilterDraft(emptyInStockFilters);
                    setInStockFilters(emptyInStockFilters);
                  }
                )}
              </Col>
            </Row>
            <div className="warehouse-today-metrics">
              <Statistic title="收货票数" value={inStockTotals.receiptTickets} suffix="票" />
              <Statistic title="件数" value={inStockTotals.totalPackages} suffix="件" />
              <Statistic title="重量" value={inStockTotals.totalWeightKg} suffix="kg" precision={2} />
              <Statistic title="体积" value={inStockTotals.totalCbm} suffix="CBM" precision={3} />
              <Statistic title="待出库" value={inStockTotals.waitingDispatchTickets} suffix="票" />
              <Statistic title="待理货" value={inStockTotals.pendingTallyTickets} suffix="票" />
              <Statistic className={inStockTotals.exceptionTickets ? 'warehouse-today-metric-warning' : undefined} title="异常" value={inStockTotals.exceptionTickets} suffix="票" />
            </div>
          </Space>
        </Card>

        <Card
          className="warehouse-today-table-card"
          title={(
            <Space size={12}>
              <span>在仓数据</span>
              <Text type="secondary">共 {inStockRows.length} 条</Text>
              {selectedInStockPackageIds.length ? <Tag color="blue">已选 {selectedInStockPackageIds.length}</Tag> : null}
            </Space>
          )}
          extra={(
            <Space wrap>
              {canWriteWarehouse ? <Button onClick={() => openWarehouseTallyTask(selectedInStockPackageIds)}>批量理货</Button> : null}
              {canWriteWarehouse ? <Button type="primary" onClick={() => openInStockConsolidation(selectedInStockPackageIds)}>{consolidationActionLabel}</Button> : null}
              <Popover
                trigger="click"
                placement="bottomRight"
                content={(
                  <div className="warehouse-today-column-popover">
                    {Object.keys(inStockColumnDefinitions)
                      .filter((key) => key !== 'select' && (key !== 'site' || !isOperatorView))
                      .map((key) => (
                        <Checkbox key={key} checked={visibleInStockColumns.includes(key)} onChange={(event) => toggleInStockColumn(key, event.target.checked)}>
                          {String(inStockColumnDefinitions[key].title)}
                        </Checkbox>
                      ))}
                  </div>
                )}
              >
                <Button>列设置</Button>
              </Popover>
            </Space>
          )}
        >
          <ManagedTable<WarehouseInboundPackage>
            rowKey="id"
            columns={inStockColumns}
            dataSource={inStockRows}
            size="small"
            pagination={tenRowTablePagination}
            minimumScrollX={1400}
          />
        </Card>
      </Space>
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
            <Table<WarehouseTallyTaskSummary>
              rowKey="id"
              dataSource={pendingTallyTasks}
              size="small"
              pagination={tenRowTablePagination}
              scroll={{ x: 1400 }}
              locale={{ emptyText: '暂无未完成理货，请先从在仓数据发起理货' }}
              columns={[
                { title: '理货任务号', dataIndex: 'taskNo', width: 210 },
                { title: '来源组合号', dataIndex: 'sourceCombinedOrderNo', width: 210 },
                { title: '客户编号', dataIndex: 'customerCode', width: 100 },
                { title: '件数', dataIndex: 'packageCount', width: 80, align: 'right' },
                { title: '原始重量', dataIndex: 'originalWeightKg', width: 110, align: 'right', render: (value: number) => `${value.toFixed(2)} kg` },
                { title: '原始尺寸', width: 130, render: (_, task) => `${task.originalLengthCm}×${task.originalWidthCm}×${task.originalHeightCm}` },
                { title: '5000/6000材积', width: 150, render: (_, task) => `${task.originalVolumetricWeightKg5000.toFixed(2)} / ${task.originalVolumetricWeightKg.toFixed(2)}` },
                { title: '理货需求', dataIndex: 'tallyRequirement', width: 240 },
                { title: '创建人', dataIndex: 'createdBy', width: 100, render: (value?: string) => value || '-' },
                { title: '创建时间', dataIndex: 'createdAt', width: 170 },
                { title: '备注', dataIndex: 'remark', width: 180, render: (value?: string) => value || '-' },
                {
                  title: '操作',
                  key: 'actions',
                  width: 110,
                  fixed: 'right',
                  render: (_, task) => (canWriteWarehouse ? <Button size="small" type="primary" onClick={() => openCompleteTallyTask(task)}>完成理货</Button> : null)
                }
              ]}
            />
          </Card>
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
                    () => setConsolidationPackageFilters(consolidationPackageFilterDraft),
                    () => {
                      setConsolidationPackageFilterDraft(emptyConsolidationPackageFilters);
                      setConsolidationPackageFilters(emptyConsolidationPackageFilters);
                    }
                  )}
                </Col>
              </Row>
              <Table<WarehouseInboundPackage>
                rowKey="id"
                dataSource={filteredConsolidationPackages}
                size="small"
                pagination={tenRowTablePagination}
                scroll={{ x: 900 }}
                columns={[
                  {
                    title: '',
                    width: 52,
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
                  { title: '系统单号', dataIndex: 'systemOrderNo', width: 150, render: (value?: string) => renderShipmentOrderNoLink(value, { subtitle: findShipmentBySystemOrderNo(value) ? '点击查看详情' : '仓库入库单' }) },
                  { title: '实重', dataIndex: 'weightKg', width: 90, render: (value: number) => `${value.toFixed(2)} kg` },
                  { title: '尺寸 cm', width: 130, render: (_, pkg) => `${pkg.lengthCm}×${pkg.widthCm}×${pkg.heightCm}` },
                  { title: '计费重', dataIndex: 'chargeableWeightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
                  {
                    title: '到仓进度',
                    width: 110,
                    render: (_, pkg) => formatWarehouseInboundProgress(pkg)
                  },
                  {
                    title: '操作',
                    width: 90,
                    render: (_, pkg) => (canWriteWarehouse ? <Button size="small" onClick={() => setSplittingPackage(pkg)}>拆分成多箱</Button> : null)
                  }
                ]}
              />
            </Space>
          </Card>
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
                  <Text strong>{selectedWarehouseTotals.chargeableWeightKg.toFixed(2)} kg</Text>
                </div>
              </div>
              {canWriteWarehouse ? (
                <div className="warehouse-tally-action-buttons">
                  <Button block onClick={() => void consolidateSelectedPackages('MERGE_ONLY')}>合并成一箱</Button>
                  <Button type="primary" block onClick={() => void consolidateSelectedPackages('MERGE_AND_SHIP')}>理货并创建出货单</Button>
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
                    <Text type="secondary">{record.totalPackages} 个包裹 / 计费重 {record.totalChargeableWeightKg.toFixed(2)} kg</Text>
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
      </Space>
      ) : null}

      {activeReceiveSection === 'queue' ? (
      <Card title="面单队列&待仓库出货">
        <Table<WarehouseLabelQueueRow>
          rowKey="id"
          dataSource={warehouseLabelQueueRows}
          size="small"
          pagination={tenRowTablePagination}
          scroll={{ x: 1320 }}
          columns={[
            { title: '出货单号', width: 210, render: (_, record) => renderShipmentOrderNoLink(getWarehouseQueueOutboundNo(record), { shipment: record.kind === 'shipment' ? record.shipment : findShipmentBySystemOrderNo(record.consolidation.outboundOrderNo) }) },
            { title: '出货国家', width: 120, render: (_, record) => getWarehouseQueueDestination(record) },
            { title: '出货件数', width: 100, render: (_, record) => `${getWarehouseQueuePackageCount(record)} 件` },
            { title: '计费重', width: 110, render: (_, record) => `${getWarehouseQueueChargeableWeight(record).toFixed(2)} kg` },
            { title: '进入待出库时间', width: 170, render: (_, record) => getWarehouseQueueStageTime(record) },
            { title: '渠道', width: 150, render: (_, record) => getWarehouseQueueChannel(record) },
            { title: '代理', width: 130, render: (_, record) => getWarehouseQueueAgent(record) },
            { title: '状态', width: 120, render: () => <Tag color="processing">待仓库出货</Tag> },
            {
              title: '面单内容',
              render: (_, record) => {
                const labels = getWarehouseQueueLabels(record);
                return labels.length ? (
                  <div className="warehouse-label-preview-grid">
                    {labels.map((label) => (
                      <WarehouseInternalLabelCard key={label.id} label={label} />
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">待打单</Text>
                );
              }
            },
            {
              title: '操作',
              width: 150,
              fixed: 'right',
              render: (_, record) => {
                const hasLabels = Boolean(getWarehouseQueueLabels(record).length);
                return (
                  <Space wrap>
                    {canWriteWarehouse ? (
                      <>
                        <Button
                          aria-label="打单"
                          size="small"
                          type="primary"
                          onClick={() => {
                            if (record.kind === 'shipment') {
                              printWarehouseShipmentLabels(record.shipment);
                              return;
                            }
                            printWarehouseOutboundLabels(record.consolidation);
                          }}
                        >
                          打单
                        </Button>
                        <Popconfirm
                          title="确认出货？"
                          description="确认后该出货单会离开面单队列，后续进入出货后的轨迹跟进。"
                          okText="确认出货"
                          cancelText="取消"
                          onConfirm={() => {
                            if (record.kind === 'shipment') {
                              void dispatchWarehouseShipment(record.shipment);
                              return;
                            }
                            dispatchWarehouseOutbound(record.consolidation);
                          }}
                          disabled={!hasLabels}
                        >
                          <Button aria-label="出货" size="small" disabled={!hasLabels}>
                            出货
                          </Button>
                        </Popconfirm>
                      </>
                    ) : null}
                  </Space>
                );
              }
            }
          ]}
          locale={{ emptyText: '暂无待打单出货单，请先在渠道排货中分配渠道，或在理货管理中选择“理货并创建出货单”。' }}
        />
      </Card>
      ) : null}

      {activeReceiveSection === 'exceptions' ? (
      <Card
        title="收货交接单"
        extra={(
          <Space>
            <Button onClick={downloadWarehouseHandoverWord}>下载 Word</Button>
            <Button type="primary" onClick={printWarehouseHandoverPdf}>导出 PDF</Button>
          </Space>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="交接单从渠道排货后的待仓库出货单与理货记录生成，用于仓库与代理交货核对。"
          />
          <Table<WarehouseHandoverRow>
            rowKey="id"
            columns={[
              { title: '交接单号', dataIndex: 'handoverNo', width: 180 },
              {
                title: '入库单号',
                dataIndex: 'inboundOrderNos',
                width: 230,
                render: (value: string) => <Text className="warehouse-handover-trace">{value}</Text>
              },
              { title: '出货单号', dataIndex: 'outboundOrderNo', width: 190, render: (value?: string) => renderShipmentOrderNoLink(value) },
              { title: '客户/来源', dataIndex: 'customerName', width: 150 },
              { title: '客户单号', dataIndex: 'customerOrderNo', width: 160 },
              { title: '出货国家', dataIndex: 'destinationCountry', width: 120 },
              { title: '出货件数', dataIndex: 'packageCount', width: 100, render: (value: number) => `${value} 件` },
              {
                title: '入库时间',
                dataIndex: 'inboundTimes',
                width: 200,
                render: (value: string) => <Text className="warehouse-handover-trace">{value}</Text>
              },
              { title: '计费重', dataIndex: 'chargeableWeightKg', width: 110, render: (value: number) => `${value.toFixed(2)} kg` },
              { title: '渠道', dataIndex: 'channelName', width: 160 },
              { title: '状态', dataIndex: 'status', width: 130, render: (value: string) => <Tag color={value.includes('出货') ? 'processing' : 'blue'}>{value}</Tag> }
            ]}
            dataSource={warehouseHandoverRows}
            size="small"
            pagination={tenRowTablePagination}
            scroll={{ x: 1660 }}
            locale={{ emptyText: '暂无交接单数据，请先完成渠道排货或理货创建出货单。' }}
          />
        </Space>
      </Card>
      ) : null}
      </ModuleSubWorkspace>

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
              message={`${selectedConsolidation.outboundOrderNo}：${formatWarehouseConsolidationMode(selectedConsolidation.mode)}，${selectedConsolidation.totalPackages} 个原始包裹，计费重 ${selectedConsolidation.totalChargeableWeightKg.toFixed(2)} kg`}
            />
            <Table<WarehouseInboundPackage>
              rowKey="id"
              columns={warehousePackageColumns}
              dataSource={selectedConsolidationPackages}
              size="small"
              pagination={tenRowTablePagination}
              scroll={{ x: 1280 }}
            />
          </Space>
        ) : null}
      </Modal>
      <Modal
        title="发起理货"
        open={Boolean(tallyTaskPackageIds.length)}
        onCancel={() => {
          setTallyTaskPackageIds([]);
          setTallyRequirementDraft('');
        }}
        onOk={() => void createWarehouseTallyTask()}
        okText="确认发起"
        cancelText="取消"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert type="info" showIcon message={`已选择 ${tallyTaskPackageIds.length} 个在仓包裹，提交后进入未完成理货。`} />
          <div>
            <Text strong>理货需求</Text>
            <Input.TextArea
              aria-label="理货需求"
              rows={4}
              placeholder="例如拆分 50/25，保留原箱唛头"
              value={tallyRequirementDraft}
              onChange={(event) => setTallyRequirementDraft(event.target.value)}
            />
          </div>
        </Space>
      </Modal>
      <Modal
        title="完成理货"
        open={Boolean(completingTallyTask)}
        onCancel={() => setCompletingTallyTask(null)}
        onOk={() => void completeWarehouseTallyTask()}
        okText="确认完成"
        cancelText="取消"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={completingTallyTask ? `来源：${completingTallyTask.sourceCombinedOrderNo}` : '请选择理货任务'}
          />
          <Row gutter={[10, 10]}>
            <Col span={8}>
              {renderFilterField('理货后件数', (
                <InputNumber min={1} value={tallyCompleteDraft.packageCount} onChange={(value) => setTallyCompleteDraft((current) => ({ ...current, packageCount: Number(value ?? 1) }))} />
              ))}
            </Col>
            <Col span={8}>
              {renderFilterField('理货后重量', (
                <InputNumber min={0} value={tallyCompleteDraft.weightKg} onChange={(value) => setTallyCompleteDraft((current) => ({ ...current, weightKg: Number(value ?? 0) }))} />
              ))}
            </Col>
            <Col span={8}>
              {renderFilterField('长 cm', (
                <InputNumber min={0} value={tallyCompleteDraft.lengthCm} onChange={(value) => setTallyCompleteDraft((current) => ({ ...current, lengthCm: Number(value ?? 0) }))} />
              ))}
            </Col>
            <Col span={8}>
              {renderFilterField('宽 cm', (
                <InputNumber min={0} value={tallyCompleteDraft.widthCm} onChange={(value) => setTallyCompleteDraft((current) => ({ ...current, widthCm: Number(value ?? 0) }))} />
              ))}
            </Col>
            <Col span={8}>
              {renderFilterField('高 cm', (
                <InputNumber min={0} value={tallyCompleteDraft.heightCm} onChange={(value) => setTallyCompleteDraft((current) => ({ ...current, heightCm: Number(value ?? 0) }))} />
              ))}
            </Col>
          </Row>
          <div>
            <Text strong>备注</Text>
            <Input.TextArea rows={3} value={tallyCompleteDraft.remark} onChange={(event) => setTallyCompleteDraft((current) => ({ ...current, remark: event.target.value }))} />
          </div>
        </Space>
      </Modal>
      <Modal
        title={consolidationActionLabel}
        open={Boolean(inStockConsolidationIds.length)}
        onCancel={() => {
          setInStockConsolidationIds([]);
          setTallyRequirementDraft('');
        }}
        onOk={() => void consolidateInStockPackages()}
        okText={canCreateOrderEntryFromWarehouse ? '确认合票并录单' : '确认合票'}
        cancelText="取消"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert type="info" showIcon message={canCreateOrderEntryFromWarehouse ? `已选择 ${inStockConsolidationIds.length} 个在仓包裹，确认后会合票并进入录单草稿。` : `已选择 ${inStockConsolidationIds.length} 个在仓包裹，确认后只做仓库合票。`} />
          <div>
            <Text strong>理货需求</Text>
            <Input.TextArea
              aria-label="合票理货需求"
              rows={4}
              placeholder="例如同一票货物合票，制作运单"
              value={tallyRequirementDraft}
              onChange={(event) => setTallyRequirementDraft(event.target.value)}
            />
          </div>
        </Space>
      </Modal>
      <Modal
        title="拆分入库箱"
        open={Boolean(splittingPackage)}
        onCancel={() => setSplittingPackage(null)}
        onOk={() => void splitSelectedWarehousePackage()}
        okText="确认拆分"
        cancelText="取消"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={splittingPackage ? `来源箱：${splittingPackage.combinedOrderNo}` : '请选择要拆分的入库箱'}
          />
          <div>
            <Text strong>拆分箱数</Text>
            <Input
              aria-label="拆分箱数"
              value={splitDraft.splitCount}
              onChange={(event) => setSplitDraft((current) => ({ ...current, splitCount: Number(event.target.value) || 2 }))}
            />
          </div>
          <div>
            <Text strong>拆分件数组合</Text>
            <Input
              aria-label="拆分件数组合"
              placeholder="例如 50,25；留空则按箱数平均拆"
              value={splitDraft.pieces}
              onChange={(event) => setSplitDraft((current) => ({ ...current, pieces: event.target.value }))}
            />
          </div>
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
    </AppPage>
  );
}

function WarehouseInboundLabelCard({
  customerCode,
  domesticTrackingNo,
  packageIndex,
  totalPackageCount,
  scanTime
}: {
  customerCode: string;
  domesticTrackingNo: string;
  packageIndex: number;
  totalPackageCount: number;
  scanTime: string;
}) {
  return (
    <div className="warehouse-inbound-label" aria-label={`入库标签 ${customerCode} ${domesticTrackingNo} ${packageIndex}/${totalPackageCount}`}>
      <div className="warehouse-inbound-barcode" aria-label={`入库条形码 ${customerCode}-${domesticTrackingNo}-${packageIndex}/${totalPackageCount}`}>
        {Array.from({ length: 38 }, (_, index) => <span key={index} style={{ width: index % 4 === 0 ? 3 : 1 }} />)}
      </div>
      <Text className="warehouse-inbound-mark">{customerCode}</Text>
      <Text className="warehouse-inbound-tracking">{domesticTrackingNo}</Text>
      <Text className="warehouse-inbound-piece">{packageIndex}/{totalPackageCount}</Text>
      <Text className="warehouse-inbound-time">{scanTime}</Text>
    </div>
  );
}

function WarehouseInternalLabelCard({ label }: { label: WarehouseOutboundLabel }) {
  return (
    <div className="warehouse-internal-label" aria-label={`内部交货面单 ${label.labelNo} ${label.pieceIndex}/${label.totalPackages}`}>
      <Text className="warehouse-label-title" type="secondary">内部交货面单</Text>
      <div className="warehouse-label-barcode" aria-label={`条形码 ${label.labelNo}`}>
        {createWarehouseBarcodeBars(label.labelNo).map((width, index) => (
          <span key={`${label.labelNo}-${index}`} style={{ width }} />
        ))}
      </div>
      <Text className="warehouse-label-no">{label.labelNo}</Text>
      <Text className="warehouse-label-piece">{label.pieceIndex}/{label.totalPackages}</Text>
      <Text className="warehouse-label-country">{label.destinationCountry}</Text>
      <Text className="warehouse-label-order" type="secondary">{label.outboundOrderNo}</Text>
    </div>
  );
}

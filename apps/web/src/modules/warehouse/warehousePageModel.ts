import type {
  Shipment,
  WarehouseManualReceiptCartonSpecInput,
  WarehousePackageStatus,
  WarehousePackageSummary,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';
import { warehouseScanTestRows } from '../../warehouseScanTestData';
import { formatBeijingDateTime } from '../shared/format';
import {
  calculateWarehousePackageMetrics,
  calculateWarehouseVolumetricWeight,
  createWarehouseExceptions,
  normalizeWarehouseScanTime,
  parseWarehousePackageCode
} from './utils';

export const defaultTodayReceiptColumnKeys: string[] = [
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
  'exceptions',
  'actions'
];

export const defaultInStockColumnKeys: string[] = [
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
  'measurementStatus',
  'remark',
  'exceptions',
  'actions'
];

const warehouseTablePageSize = 10;

export function currentPageIds<T extends { id: string }>(rows: T[], page: number, pageSize = warehouseTablePageSize) {
  const safePage = Math.max(1, page);
  return rows.slice((safePage - 1) * pageSize, safePage * pageSize).map((row) => row.id);
}

export interface WarehouseInboundPackage {
  id: string;
  shipmentId?: string;
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
  archivedByPackageId?: string;
  archivedByPackageNo?: string;
  archivedReason?: string;
  archivedAt?: string;
  tallyTaskId?: string;
  tallyTaskNo?: string;
  tallyCompleted?: boolean;
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
  measurementStatus?: 'MEASURED' | 'PENDING_REMEASURE';
  measurementMatchedAt?: string;
  measurementMatchedBy?: string;
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

export function canEditUnenteredWarehousePackage(record: Pick<WarehouseInboundPackage, 'shipmentId'>) {
  return !record.shipmentId;
}

export interface WarehousePackageDraft {
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
  cartonSpecs: WarehouseManualReceiptCartonSpecInput[];
}

export interface WarehousePackageEditDraft {
  customerCode: string;
  combinedOrderNo: string;
  domesticTrackingNo: string;
  expectedTotalPackageCount: number;
  packageIndex: number;
  scanTime: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
  remark: string;
  manualException: string;
}

export interface WarehouseConsolidationRecord {
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

export interface TallyTaskCompleteDraft {
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  remark: string;
}

export function createWarehouseDateTimeInputValue(date = new Date()) {
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().slice(0, 16);
}

export function parseBeijingDateTimeInputToIso(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
  }
  const [, year, month, day, hour, minute, second = '00'] = match;
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - 8,
    Number(minute),
    Number(second)
  )).toISOString();
}

export function createEmptyCartonSpec(): WarehouseManualReceiptCartonSpecInput {
  return { weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0, packageCount: 1 };
}

export function calculateCartonSpecTotals(cartonSpecs: WarehouseManualReceiptCartonSpecInput[]) {
  return cartonSpecs.reduce(
    (totals, spec) => ({
      totalPackages: totals.totalPackages + spec.packageCount,
      totalCbm: totals.totalCbm + calculateWarehousePackageMetrics({ ...spec, divisor: 6000 }).cbm,
      totalActualWeightKg: totals.totalActualWeightKg + spec.weightKg * spec.packageCount,
      totalVol5000: totals.totalVol5000 + calculateWarehouseVolumetricWeight(spec, 5000),
      totalVol6000: totals.totalVol6000 + calculateWarehouseVolumetricWeight(spec, 6000)
    }),
    { totalPackages: 0, totalCbm: 0, totalActualWeightKg: 0, totalVol5000: 0, totalVol6000: 0 }
  );
}

export function formatWarehouseDateTimeInputValue(value?: string) {
  if (!value) {
    return createWarehouseDateTimeInputValue();
  }
  const readableMatch = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (readableMatch) {
    return `${readableMatch[1]}T${readableMatch[2]}:${readableMatch[3]}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? createWarehouseDateTimeInputValue() : createWarehouseDateTimeInputValue(parsed);
}

function resolveWarehouseTallyRecentCutoff() {
  const now = new Date();
  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return new Date(Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth() - 1, beijingNow.getUTCDate(), -8, 0, 0, 0));
}

export function isRecentWarehouseTallyTask(task: WarehouseTallyTaskSummary) {
  if (!task.completedAt) return false;
  return new Date(task.completedAt) >= resolveWarehouseTallyRecentCutoff();
}

export function isRecentWarehouseTallyArchive(record: WarehouseInboundPackage) {
  if (!record.archivedAt) return false;
  return new Date(record.archivedAt) >= resolveWarehouseTallyRecentCutoff();
}

export function isTalliedWarehousePackage(record: Pick<WarehouseInboundPackage, 'tallyCompleted'>) {
  return record.tallyCompleted === true;
}

export function isWarehousePackageTallyInProgress(record: Pick<WarehouseInboundPackage, 'tallyTaskId' | 'tallyCompleted' | 'tallyStatus'>) {
  return Boolean(record.tallyTaskId) && record.tallyCompleted !== true && record.tallyStatus === '理货中';
}

export type WarehouseLabelQueueRow =
  | { id: string; kind: 'shipment'; shipment: Shipment }
  | { id: string; kind: 'consolidation'; consolidation: WarehouseConsolidationRecord };

export interface WarehouseHandoverRow {
  id: string;
  agentGroupName?: string;
  handoverNo: string;
  inboundOrderNos: string;
  outboundOrderNo: string;
  waybillNo: string;
  warehouseEntryNo: string;
  cargoName: string;
  customerName: string;
  customerOrderNo: string;
  destinationCountry: string;
  packageCount: number;
  inboundTimes: string;
  chargeableWeightKg: number;
  channelName: string;
  agentName: string;
  customsRefundText: string;
  remark: string;
  status: string;
  outboundAt?: string;
  outboundBy?: string;
}

export type WarehouseQueueColumnKey =
  | 'createdAt'
  | 'salesperson'
  | 'outboundNo'
  | 'agent'
  | 'agentChannel'
  | 'customerCode'
  | 'destination'
  | 'channel'
  | 'packageCount'
  | 'totalWeight'
  | 'volume'
  | 'chargeableWeight'
  | 'shippingMark'
  | 'productName'
  | 'declaration'
  | 'sensitive';

export const warehouseQueueColumnSettingsKey = 'warehouse-label-queue-columns:visible-business-fields';

export const warehouseQueueDefaultColumnKeys: WarehouseQueueColumnKey[] = [
  'createdAt',
  'salesperson',
  'outboundNo',
  'agent',
  'agentChannel',
  'customerCode',
  'destination',
  'channel',
  'packageCount',
  'totalWeight',
  'volume',
  'chargeableWeight',
  'shippingMark',
  'productName',
  'declaration',
  'sensitive'
];

export const warehouseQueueColumnLabels: Record<WarehouseQueueColumnKey, string> = {
  createdAt: '运单创建时间',
  salesperson: '业务员',
  outboundNo: '出货单号',
  agent: '代理',
  agentChannel: '代理渠道',
  customerCode: '客户编号',
  destination: '目的地',
  channel: '渠道',
  packageCount: '业务数据：件数',
  totalWeight: '业务数据：总量',
  volume: '业务数据：体积',
  chargeableWeight: '业务数据：计费重',
  shippingMark: '唛头',
  productName: '品名',
  declaration: '报关',
  sensitive: '敏感'
};

export function createWarehouseHandoverNo(outboundOrderNo: string) {
  return `HD-${outboundOrderNo || 'PENDING'}`;
}

export function createInitialWarehousePackages(shipments: Shipment[]): WarehouseInboundPackage[] {
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

export function createWarehouseApiPackages(): WarehouseInboundPackage[] {
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
      shipmentId: undefined,
      systemOrderNo: `API仓库-${customerOrderNo}`,
      customerCode: customerOrderNo.slice(0, 8),
      customerOrderNo,
      domesticTrackingNo,
      combinedOrderNo: row.combinedOrderNo,
      labelNo: `${customerOrderNo.slice(0, 8)}-${domesticTrackingNo}-${index + 1}/${expectedTotalPackageCount ?? arrivedCount}`,
      warehouseEntryNo: '',
      receivingChannel: '仓库设备',
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

export function mapWarehouseApiPackageToInbound(pkg: WarehousePackageSummary): WarehouseInboundPackage {
  return {
    id: pkg.id,
    shipmentId: pkg.shipmentId,
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
    archivedByPackageId: pkg.archivedByPackageId,
    archivedByPackageNo: pkg.archivedByPackageNo,
    archivedReason: pkg.archivedReason,
    archivedAt: pkg.archivedAt ? formatBeijingDateTime(pkg.archivedAt) : undefined,
    tallyTaskId: pkg.tallyTaskId,
    tallyTaskNo: pkg.tallyTaskNo,
    tallyCompleted: pkg.tallyCompleted === true,
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
    measurementStatus: pkg.measurementStatus,
    measurementMatchedAt: pkg.measurementMatchedAt,
    measurementMatchedBy: pkg.measurementMatchedBy,
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

export function withWarehouseCustomerProgress(packages: WarehouseInboundPackage[]): WarehouseInboundPackage[] {
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

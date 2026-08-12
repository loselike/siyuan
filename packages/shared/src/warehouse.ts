export type WarehousePackageStatus = 'RECEIVED' | 'CONSOLIDATED' | 'SHIPPED' | 'TALLIED_ARCHIVED';
export type WarehouseConsolidationMode = 'MERGE_ONLY' | 'MERGE_AND_SHIP';
export type WarehouseRoundingRule = 'NONE' | 'HALF_UP' | 'INTEGER_UP';
export type WarehouseTallyTaskStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type WarehouseTallyLabelStatus = 'NOT_GENERATED' | 'GENERATED';
export type WarehouseMeasurementStatus = 'MEASURED' | 'PENDING_REMEASURE';
export type WarehouseTallyLifecycleStatus = '待理货' | '理货中' | '已理货' | '二次理货';
export type WarehouseTallyChannel = '快递' | '空运' | '卡航' | '铁路' | '海运';
export type WarehouseTallyProgressStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export const warehouseTallyChannels: WarehouseTallyChannel[] = ['快递', '空运', '卡航', '铁路', '海运'];
export const warehouseTallyProgressStatusLabels: Record<WarehouseTallyProgressStatus, string> = {
  WAITING: '待理货',
  IN_PROGRESS: '理货中',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
};

function warehouseTallyBeijingHour(now: Date): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hourCycle: 'h23'
  }).format(now);
  return Number(hour);
}

export function warehouseTallyChannelPriority(channel: string | undefined, now = new Date()): number {
  const morningOrder = ['快递', '空运', '卡航', '铁路', '海运'];
  const afternoonOrder = ['空运', '快递', '卡航', '铁路', '海运'];
  const order = warehouseTallyBeijingHour(now) < 12 ? morningOrder : afternoonOrder;
  const index = order.indexOf(channel ?? '');
  return index >= 0 ? index : order.length;
}

export function sortWarehouseTallyTasks<T extends { tallyChannel?: string; createdAt: string; taskNo?: string; id?: string }>(
  tasks: T[],
  now = new Date()
): T[] {
  return [...tasks].sort((left, right) => {
    const channelOrder = warehouseTallyChannelPriority(left.tallyChannel, now) - warehouseTallyChannelPriority(right.tallyChannel, now);
    if (channelOrder !== 0) return channelOrder;
    const createdOrder = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    if (Number.isFinite(createdOrder) && createdOrder !== 0) return createdOrder;
    return (left.taskNo ?? left.id ?? '').localeCompare(right.taskNo ?? right.id ?? '', 'zh-Hans-CN');
  });
}

/**
 * 同一包裹在首次理货任务号后追加 02、03...，均属于二次理货生命周期。
 * 同日不同任务的序号位于 LH 之前，不应被误判为二次理货。
 */
export function isWarehouseRetallyTaskNo(taskNo?: string) {
  const round = Number(taskNo?.trim().match(/LH(\d{2})$/)?.[1]);
  return Number.isInteger(round) && round >= 2;
}

/** 统一生成包裹在任意模块展示的理货生命周期标签。 */
export function resolveWarehouseTallyLifecycleStatus(input: {
  tallyTaskId?: string;
  tallyTaskNo?: string;
  tallyCompleted?: boolean;
}): WarehouseTallyLifecycleStatus {
  if (!input.tallyTaskId && !input.tallyTaskNo) return '待理货';
  if (input.tallyCompleted !== true) return '理货中';
  if (isWarehouseRetallyTaskNo(input.tallyTaskNo)) return '二次理货';
  return '已理货';
}

export interface WarehousePackageSummary {
  id: string;
  customerCode: string;
  /** Whether the package customer code currently exists in customer master data. */
  customerMaintained?: boolean;
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
  /** Only true when a matching warehouse tally task has actually completed. */
  tallyCompleted?: boolean;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  shipmentId?: string;
  receivingChannel: string;
  destinationCountry?: string;
  expectedTotalPackageCount?: number;
  packageIndex?: number;
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  girthCm?: number;
  cbm: number;
  totalCbm?: number;
  volumetricWeightKg: number;
  volumetricWeightKg5000?: number;
  totalVolumetricWeightKg?: number;
  totalVolumetricWeightKg5000?: number;
  chargeableWeightKg: number;
  divisor: number;
  roundingRule: WarehouseRoundingRule;
  scanTime?: string;
  remark?: string;
  manualException?: string;
  scanSource?: string;
  measurementStatus?: WarehouseMeasurementStatus;
  measurementMatchedAt?: string;
  measurementMatchedBy?: string;
  inboundAt?: string;
  receiptSourceId?: string;
  tallyStatus?: WarehouseTallyLifecycleStatus;
  splitStatus?: string;
  consolidationStatus?: string;
  outboundStatus?: string;
  status: WarehousePackageStatus;
  exceptions: string[];
  createdBy?: string;
  createdAt: string;
}

export interface WarehousePackageCreateInput {
  customerCode?: string;
  customerOrderNo?: string;
  combinedOrderNo?: string;
  domesticTrackingNo: string;
  expectedTotalPackageCount: number;
  packageIndex: number;
  packageCount?: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  scanTime?: string;
  remark?: string;
  manualException?: string;
  scanSource?: string;
}

export interface WarehouseManualReceiptCartonSpecInput {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
}

export interface WarehouseManualReceiptCreateInput extends Omit<WarehousePackageCreateInput, 'expectedTotalPackageCount' | 'packageIndex' | 'packageCount' | 'weightKg' | 'lengthCm' | 'widthCm' | 'heightCm'> {
  cartonSpecs: WarehouseManualReceiptCartonSpecInput[];
}

export interface WarehouseManualReceiptCreateResponse {
  packages: WarehousePackageSummary[];
  totalCartonSpecs: number;
  totalPackages: number;
}

/** 从一条原始过机箱生成同箱规、单件补录的请求。 */
export interface WarehouseSameSpecReplenishInput {
  supplementCount: number;
  requestId: string;
}

export interface WarehouseSameSpecReplenishResponse {
  sourcePackageId: string;
  totalPackageCount: number;
  packages: WarehousePackageSummary[];
  idempotent?: boolean;
}

export interface WarehouseManualReceiptCustomerOption {
  code: string;
  name: string;
}

export type WarehouseMachineImportIssueType =
  | 'INVALID'
  | 'DUPLICATE_FILE'
  | 'CONFLICT_FILE'
  | 'DUPLICATE_SYSTEM'
  | 'DUPLICATE_BATCH';

export interface WarehouseMachineImportIssue {
  type: WarehouseMachineImportIssueType;
  sheetName: string;
  rowNumber: number;
  barcode?: string;
  reason: string;
}

export interface WarehouseMachineImportSampleRow {
  sheetName: string;
  rowNumber: number;
  barcode: string;
  customerCode: string;
  domesticTrackingNo: string;
  packageCount: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  cbm: number;
  volumetricWeightKg: number;
  scanTime: string;
  remark?: string;
}

export interface WarehouseMachineImportResponse {
  fileName: string;
  committed: boolean;
  totalRows: number;
  validRows: number;
  importableRows: number;
  importedRows: number;
  invalidRows: number;
  duplicateFileRows: number;
  duplicateSystemRows: number;
  issueCount: number;
  issues: WarehouseMachineImportIssue[];
  samples: WarehouseMachineImportSampleRow[];
  dateFrom?: string;
  dateTo?: string;
}

export interface WarehousePackageUpdateInput {
  customerCode?: string;
  customerOrderNo?: string;
  domesticTrackingNo?: string;
  combinedOrderNo?: string;
  expectedTotalPackageCount?: number;
  packageIndex?: number;
  packageCount?: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  scanTime?: string;
  remark?: string;
  manualException?: string;
}

export interface WarehousePackageDeleteInput {
  ids: string[];
  reason: string;
}

export interface WarehousePackageDeleteResponse {
  deletedIds: string[];
  deletedCount: number;
}

export type WarehouseTodayDatePreset = 'TODAY' | 'WEEK' | 'LAST_7_DAYS' | 'MONTH' | 'CUSTOM';

export interface WarehouseTodayQuery {
  dataScope?: 'OWN' | 'ALL';
  datePreset?: WarehouseTodayDatePreset;
  customFrom?: string;
  customTo?: string;
  site?: string;
  customerOrderNo?: string;
  domesticTrackingNo?: string;
  combinedOrderNo?: string;
}

export interface WarehouseTodayTotals {
  receiptTickets: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
  waitingDispatchTickets: number;
  pendingTallyTickets: number;
  exceptionTickets: number;
}

export interface WarehouseTodayResponse {
  totals: WarehouseTodayTotals;
  rows: WarehousePackageSummary[];
}

export interface WarehouseInStockQuery {
  dataScope?: 'OWN' | 'ALL';
  site?: string;
  customerOrderNo?: string;
  domesticTrackingNo?: string;
  combinedOrderNo?: string;
  operationKeyword?: string;
  status?: WarehousePackageStatus;
}

export interface WarehouseInStockPageQuery extends WarehouseInStockQuery {
  page?: number;
  pageSize?: number;
}

export type WarehouseInStockTotals = WarehouseTodayTotals;

export interface WarehouseInStockResponse {
  totals: WarehouseInStockTotals;
  rows: WarehousePackageSummary[];
}

export interface WarehouseInStockPageResponse extends WarehouseInStockResponse {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  };
}

export type WarehouseRentBillingUnit = 'CBM' | 'KG';
export type WarehouseRentPeriodUnit = 'DAY' | 'MONTH';
export type WarehouseRentStatus = 'IN_STOCK' | 'OUTBOUNDED';

export interface WarehouseRentRuleSummary {
  id: string;
  name: string;
  site?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  freeDays: number;
  freePeriodUnit: WarehouseRentPeriodUnit;
  billingUnit: WarehouseRentBillingUnit;
  billingCycleUnit: WarehouseRentPeriodUnit;
  densityMin: number;
  densityMax?: number;
  unitRate: number;
  currency: 'RMB';
  enabled: boolean;
  remark?: string;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface WarehouseRentRuleInput {
  name: string;
  site?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  freeDays: number;
  freePeriodUnit?: WarehouseRentPeriodUnit;
  billingUnit: WarehouseRentBillingUnit;
  billingCycleUnit?: WarehouseRentPeriodUnit;
  densityMin: number;
  densityMax?: number;
  unitRate: number;
  enabled?: boolean;
  remark?: string;
}

export interface WarehouseRentRuleEnabledInput {
  enabled: boolean;
}

export interface WarehouseRentDetailQuery {
  packageIds?: string[];
  site?: string;
  salesperson?: string;
  customerCode?: string;
  domesticTrackingNo?: string;
  inboundFrom?: string;
  inboundTo?: string;
  outboundFrom?: string;
  outboundTo?: string;
  status?: WarehouseRentStatus;
  hasRent?: boolean;
}

export interface WarehouseRentDetailSummary {
  id: string;
  site?: string;
  salesperson?: string;
  customerCode: string;
  customerName?: string;
  domesticTrackingNo: string;
  packageCount: number;
  totalWeightKg: number;
  totalCbm: number;
  densityKgPerCbm: number;
  inboundAt: string;
  outboundAt?: string;
  warehouseDays: number;
  freeDays: number;
  freePeriodUnit?: WarehouseRentPeriodUnit;
  chargeDays: number;
  billingUnit?: WarehouseRentBillingUnit;
  billingCycleUnit?: WarehouseRentPeriodUnit;
  billingQuantity: number;
  unitRate: number;
  rentAmountRmb: number;
  status: WarehouseRentStatus;
  matchedRuleId?: string;
  matchedRuleName?: string;
}

export interface WarehouseRentDetailTotals {
  inStockCount: number;
  overdueCount: number;
  currentRentAmountRmb: number;
  outboundedRentAmountRmb: number;
}

export interface WarehouseRentDetailResponse {
  totals: WarehouseRentDetailTotals;
  rows: WarehouseRentDetailSummary[];
  sites: string[];
  salespeople: string[];
}

export interface WarehousePackageSplitInput {
  splitCount?: number;
  pieces?: number[];
  remark?: string;
}

export interface WarehousePackageSplitResponse {
  sourcePackage: WarehousePackageSummary;
  packages: WarehousePackageSummary[];
}

export interface WarehousePackageGroupSummary {
  id: string;
  customerCode: string;
  customerOrderNo: string;
  domesticTrackingNo: string;
  combinedOrderNo: string;
  expectedTotalPackageCount: number;
  arrivedPackageCount: number;
  remainingPackageCount: number;
  totalActualWeightKg: number;
  totalCbm: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  maxVolumetricWeightKg: number;
  totalChargeableWeightKg: number;
  latestScanTime?: string;
}

export interface WarehouseConsolidationSummary {
  id: string;
  consolidationNo: string;
  mode: WarehouseConsolidationMode;
  shipmentId?: string;
  outboundOrderNo?: string;
  systemOrderNo?: string;
  packageIds: string[];
  totalPackages: number;
  totalActualWeightKg: number;
  totalVolumetricWeightKg: number;
  totalChargeableWeightKg: number;
  createdAt: string;
}

export interface WarehouseConsolidationCreateInput {
  packageIds: string[];
  mode: WarehouseConsolidationMode;
  tallyRequirement?: string;
}

export interface WarehouseTallyTaskSummary {
  id: string;
  taskNo: string;
  status: WarehouseTallyTaskStatus;
  tallyChannel?: WarehouseTallyChannel;
  tallyProgressStatus?: WarehouseTallyProgressStatus;
  tallyStartedAt?: string;
  tallyStartedBy?: string;
  rootTallyTaskId?: string;
  previousTallyTaskId?: string;
  tallySequence?: number;
  packageIds: string[];
  sourcePackageId: string;
  sourceCombinedOrderNo: string;
  customerCode: string;
  customerName?: string;
  salesperson?: string;
  packageCount: number;
  originalWeightKg: number;
  originalLengthCm: number;
  originalWidthCm: number;
  originalHeightCm: number;
  originalVolumetricWeightKg: number;
  originalVolumetricWeightKg5000: number;
  tallyRequirement: string;
  remark?: string;
  createdBy?: string;
  createdAt: string;
  completedPackageCount?: number;
  completedWeightKg?: number;
  completedLengthCm?: number;
  completedWidthCm?: number;
  completedHeightCm?: number;
  completedVolumetricWeightKg?: number;
  completedVolumetricWeightKg5000?: number;
  completedBy?: string;
  completedAt?: string;
  labelStatus: WarehouseTallyLabelStatus;
  labelNo?: string;
  labelQrContent?: string;
  labelGeneratedAt?: string;
  labelGeneratedBy?: string;
  labelPrintedAt?: string;
  labelPrintedBy?: string;
  labelDownloadedAt?: string;
  labelDownloadedBy?: string;
  appliedPackageId?: string;
  appliedPackageNo?: string;
  labelAppliedAt?: string;
  labelAppliedBy?: string;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  outputPackages?: WarehousePackageSummary[];
}

export interface WarehouseTallyTaskListQuery {
  status?: WarehouseTallyTaskStatus;
  customerCode?: string;
  combinedOrderNo?: string;
  completedScope?: 'RECENT' | 'HISTORY' | 'ALL';
  completedFrom?: string;
  completedTo?: string;
}

export type WarehouseTallyRepeatDatePreset = '30D' | '90D' | 'ALL';

export interface WarehouseTallyRepeatStatisticsQuery {
  datePreset?: WarehouseTallyRepeatDatePreset;
  salesperson?: string;
  operator?: string;
  keyword?: string;
  onlyRepeated?: boolean | string;
}

export interface WarehouseTallyRepeatStatisticsSummary {
  completedBatchCount: number;
  repeatedBatchCount: number;
  extraTallyCount: number;
  repeatRate: number;
  maxTallyCount: number;
}

export interface WarehouseTallyRepeatSalespersonSummary extends WarehouseTallyRepeatStatisticsSummary {
  salesperson: string;
  latestRepeatedAt?: string;
}

export interface WarehouseTallyRepeatOperatorSummary extends WarehouseTallyRepeatStatisticsSummary {
  operator: string;
  completedTaskCount: number;
  latestCompletedAt?: string;
  latestRepeatedAt?: string;
}

export interface WarehouseTallyRepeatBatchSummary {
  rootTallyTaskId: string;
  rootTaskNo: string;
  salesperson: string;
  tallyOperators: string[];
  customerCode: string;
  customerName?: string;
  sourceCombinedOrderNo: string;
  tallyCount: number;
  firstCompletedAt: string;
  lastCompletedAt: string;
  latestTaskId: string;
  latestTaskNo: string;
  latestSourcePackageId: string;
  latestTallyRequirement: string;
  latestCompletedBy?: string;
}

export interface WarehouseTallyRepeatStatisticsResponse {
  summary: WarehouseTallyRepeatStatisticsSummary;
  salespeople: WarehouseTallyRepeatSalespersonSummary[];
  operators: WarehouseTallyRepeatOperatorSummary[];
  batches: WarehouseTallyRepeatBatchSummary[];
  updatedAt: string;
}

export interface WarehouseTallyTaskCreateInput {
  packageIds: string[];
  tallyRequirement: string;
  tallyChannel: WarehouseTallyChannel;
  remark?: string;
}

export interface WarehouseTallyTaskUpdateInput {
  packageIds?: string[];
  tallyRequirement?: string;
  remark?: string;
}

export interface WarehouseTallyTaskCancelInput {
  reason: string;
}

export interface WarehouseTallyTaskCompletedCountUpdateInput {
  packageCount: number;
}

export interface WarehouseTallyTaskCompleteInput {
  packageCount: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  remark?: string;
  /** 任务内每个最终包裹的来源；服务端据此按理货后实体件逐条建档。 */
  results: WarehouseTallyTaskPackageResultInput[];
}

export interface WarehouseTallyTaskPackageResultInput {
  sourcePackageIds: string[];
  packageCount: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface WarehouseTallyHistoricalAggregateScanSummary {
  sampleId: string;
  receivedAt: string;
  deviceNo?: string;
  result: 'SUCCESS' | 'FAILED';
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface WarehouseTallyHistoricalAggregateCorrectionPreview {
  taskId: string;
  taskNo: string;
  eligible: boolean;
  reason?: string;
  alreadyCorrected: boolean;
  legacyPackageId?: string;
  legacyPackageNo?: string;
  expectedPackageCount: number;
  scans: WarehouseTallyHistoricalAggregateScanSummary[];
  previewFingerprint?: string;
}

export interface WarehouseTallyHistoricalAggregateCorrectionInput {
  sampleIds: string[];
  previewFingerprint: string;
  confirmedPhysicalPieces: boolean;
}

export interface WarehouseTallyHistoricalAggregateCorrectionResult {
  task: WarehouseTallyTaskSummary;
  correctedPackages: WarehousePackageSummary[];
  archivedAggregatePackageId: string;
  alreadyCorrected: boolean;
}

export interface WarehouseTallyLabelScanInput {
  labelNo: string;
}

export interface WarehouseTallyLabelScanResponse {
  task: WarehouseTallyTaskSummary;
  package: WarehousePackageSummary;
  alreadyApplied: boolean;
}

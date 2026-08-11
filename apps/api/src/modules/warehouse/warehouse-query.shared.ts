import { NotFoundException } from '@nestjs/common';
import type {
  WarehousePackageGroupSummary,
  WarehousePackageStatus,
  WarehousePackageSummary,
  WarehouseTallyTaskSummary,
  WarehouseTallyProgressStatus
} from '@siyuan/shared';
import { resolveWarehouseTallyLifecycleStatus, warehouseTallyChannels } from '@siyuan/shared';
import type { PrismaService } from '../prisma.service.js';
import { WAREHOUSE_TALLY_AGGREGATE_CORRECTION_ARCHIVE_REASON } from '../warehouse-tally-aggregate-correction.js';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function mapWarehousePackage(row: any): WarehousePackageSummary {
  const packageCount = Number(row.packageCount);
  const lengthCm = Number(row.lengthCm);
  const widthCm = Number(row.widthCm);
  const heightCm = Number(row.heightCm);
  const sides = [lengthCm, widthCm, heightCm].sort((left, right) => right - left);
  const girthCm = roundMoney((sides[0] ?? 0) + 2 * ((sides[1] ?? 0) + (sides[2] ?? 0)));
  const totalVolumetricWeightKg5000 = roundMoney((lengthCm * widthCm * heightCm * packageCount) / 5000);
  const tallyTaskId = row.tallyTaskId ?? undefined;
  const tallyTaskNo = row.tallyTaskNo ?? undefined;
  const tallyCompleted = Boolean(tallyTaskId || tallyTaskNo);
  return {
    id: row.id,
    customerCode: row.customerCode,
    customerName: row.customerName ?? undefined,
    site: row.site ?? undefined,
    salesperson: row.salesperson ?? undefined,
    customerOrderNo: row.customerOrderNo,
    domesticTrackingNo: row.domesticTrackingNo,
    combinedOrderNo: row.combinedOrderNo,
    labelNo: row.labelNo ?? undefined,
    sourcePackageId: row.sourcePackageId ?? undefined,
    sourcePackageNo: row.sourcePackageNo ?? undefined,
    archivedByPackageId: row.archivedByPackageId ?? undefined,
    archivedByPackageNo: row.archivedByPackageNo ?? undefined,
    archivedReason: row.archivedReason ?? undefined,
    archivedAt: row.archivedAt?.toISOString?.() ?? undefined,
    tallyTaskId,
    tallyTaskNo,
    tallyCompleted,
    outboundOrderNo: row.systemOrderNo ?? undefined,
    systemOrderNo: row.systemOrderNo ?? undefined,
    shipmentId: row.shipmentId ?? undefined,
    receivingChannel: row.receivingChannel,
    destinationCountry: row.destinationCountry ?? undefined,
    expectedTotalPackageCount: row.expectedTotalPackageCount ?? undefined,
    packageIndex: row.packageIndex ?? undefined,
    packageCount,
    weightKg: Number(row.weightKg),
    lengthCm,
    widthCm,
    heightCm,
    girthCm,
    cbm: Number(row.cbm),
    totalCbm: Number(row.cbm),
    volumetricWeightKg: Number(row.volumetricWeightKg),
    volumetricWeightKg5000: totalVolumetricWeightKg5000,
    totalVolumetricWeightKg: Number(row.volumetricWeightKg),
    totalVolumetricWeightKg5000,
    chargeableWeightKg: Number(row.chargeableWeightKg),
    divisor: row.divisor,
    roundingRule: row.roundingRule,
    scanTime: row.scanTime?.toISOString(),
    remark: row.remark ?? undefined,
    manualException: row.manualException ?? undefined,
    scanSource: row.scanSource ?? undefined,
    measurementStatus: row.measurementStatus ?? 'MEASURED',
    measurementMatchedAt: row.measurementMatchedAt?.toISOString?.() ?? undefined,
    measurementMatchedBy: row.measurementMatchedBy ?? undefined,
    inboundAt: row.scanTime?.toISOString(),
    receiptSourceId: row.sourcePackageId ?? row.id,
    tallyStatus: resolveWarehouseTallyLifecycleStatus({ tallyTaskId, tallyTaskNo, tallyCompleted }),
    splitStatus: row.sourcePackageId ? '拆票子票' : '原始票',
    consolidationStatus: row.status === 'CONSOLIDATED' ? '已合票' : '未合票',
    outboundStatus: row.status === 'SHIPPED' ? '已出库' : '未出库',
    status: row.status as WarehousePackageStatus,
    exceptions: row.exceptions ?? [],
    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt.toISOString()
  };
}

export async function mapWarehousePackagesWithConfirmedTally(
  prisma: PrismaService,
  rows: any[]
): Promise<WarehousePackageSummary[]> {
  const rowIds = rows.map((row) => row.id);
  const tallyTasks = rowIds.length
    ? await (prisma as any).warehouseTallyTask.findMany({
      where: {
        OR: [
          { packageIds: { hasSome: rowIds } },
          { appliedPackageId: { in: rowIds } },
          { id: { in: rows.map((row) => row.tallyTaskId).filter(Boolean) } }
        ]
      },
      select: { id: true, taskNo: true, status: true, tallyProgressStatus: true, packageIds: true, appliedPackageId: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    })
    : [];
  const completedTaskByPackageId = new Map<string, { id: string; taskNo: string }>();
  const pendingTaskByPackageId = new Map<string, { id: string; taskNo: string; tallyProgressStatus?: WarehouseTallyProgressStatus }>();
  const taskById = new Map<string, { id: string; taskNo: string; status: string; tallyProgressStatus?: WarehouseTallyProgressStatus }>(
    tallyTasks.map((task: any) => [task.id, { id: task.id, taskNo: task.taskNo, status: task.status, tallyProgressStatus: task.tallyProgressStatus }])
  );
  tallyTasks.forEach((task: any) => {
    const packageIds = task.status === 'PENDING' ? task.packageIds : [...task.packageIds, task.appliedPackageId].filter(Boolean);
    packageIds.forEach((packageId: string) => {
      const target = task.status === 'PENDING' ? pendingTaskByPackageId : completedTaskByPackageId;
      target.set(packageId, { id: task.id, taskNo: task.taskNo, ...(task.status === 'PENDING' ? { tallyProgressStatus: task.tallyProgressStatus } : {}) });
    });
  });
  return rows.map((row) => {
    const summary = mapWarehousePackage(row);
    const directTask = row.tallyTaskId ? taskById.get(row.tallyTaskId) : undefined;
    const pendingTask = pendingTaskByPackageId.get(row.id)
      ?? (directTask?.status === 'PENDING' ? { id: directTask.id, taskNo: directTask.taskNo } : undefined);
    if (pendingTask) {
      return {
        ...summary,
        tallyTaskId: pendingTask.id,
        tallyTaskNo: pendingTask.taskNo,
        tallyCompleted: false,
        tallyStatus: pendingTask.tallyProgressStatus === 'IN_PROGRESS' ? '理货中' : '待理货'
      };
    }
    const task = completedTaskByPackageId.get(row.id)
      ?? (row.tallyTaskId && row.tallyTaskNo ? { id: row.tallyTaskId, taskNo: row.tallyTaskNo } : undefined);
    return task
      ? {
        ...summary,
        tallyTaskId: task.id,
        tallyTaskNo: task.taskNo,
        tallyCompleted: true,
        tallyStatus: resolveWarehouseTallyLifecycleStatus({ tallyTaskId: task.id, tallyTaskNo: task.taskNo, tallyCompleted: true })
      }
      : { ...summary, tallyTaskId: undefined, tallyTaskNo: undefined, tallyCompleted: false, tallyStatus: '待理货' };
  });
}

export function summarizeWarehousePackageGroups(packages: WarehousePackageSummary[]): WarehousePackageGroupSummary[] {
  const groups = new Map<string, WarehousePackageSummary[]>();
  for (const pkg of packages) {
    const key = `${pkg.customerOrderNo}__${pkg.domesticTrackingNo}`;
    groups.set(key, [...(groups.get(key) ?? []), pkg]);
  }
  return Array.from(groups.values()).map((items) => {
    const first = items[0];
    const expected = Math.max(...items.map((item) => item.expectedTotalPackageCount ?? items.length));
    const maxByVolume = items.reduce((best, item) => (item.volumetricWeightKg > best.volumetricWeightKg ? item : best), first);
    return {
      id: `${first.customerOrderNo}-${first.domesticTrackingNo}`,
      customerCode: first.customerCode,
      customerOrderNo: first.customerOrderNo,
      domesticTrackingNo: first.domesticTrackingNo,
      combinedOrderNo: first.combinedOrderNo,
      expectedTotalPackageCount: expected,
      arrivedPackageCount: items.length,
      remainingPackageCount: Math.max(expected - items.length, 0),
      totalActualWeightKg: roundMoney(items.reduce((total, item) => total + item.weightKg * item.packageCount, 0)),
      totalCbm: roundMoney(items.reduce((total, item) => total + item.cbm, 0)),
      maxLengthCm: maxByVolume.lengthCm,
      maxWidthCm: maxByVolume.widthCm,
      maxHeightCm: maxByVolume.heightCm,
      maxVolumetricWeightKg: maxByVolume.volumetricWeightKg,
      totalChargeableWeightKg: roundMoney(items.reduce((total, item) => total + item.chargeableWeightKg, 0)),
      latestScanTime: items.map((item) => item.scanTime).filter(Boolean).sort().at(-1)
    };
  });
}

export function mapWarehouseTallyTask(row: any): WarehouseTallyTaskSummary {
  return {
    id: row.id,
    taskNo: row.taskNo,
    status: row.status,
    tallyChannel: warehouseTallyChannels.includes(row.tallyChannel) ? row.tallyChannel : undefined,
    tallyProgressStatus: row.status === 'COMPLETED'
      ? 'COMPLETED'
      : row.tallyProgressStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'WAITING',
    tallyStartedAt: row.tallyStartedAt?.toISOString?.() ?? undefined,
    tallyStartedBy: row.tallyStartedBy ?? undefined,
    rootTallyTaskId: row.rootTallyTaskId ?? row.id,
    previousTallyTaskId: row.previousTallyTaskId ?? undefined,
    tallySequence: row.tallySequence ?? 1,
    packageIds: [...(row.packageIds ?? [])],
    sourcePackageId: row.sourcePackageId,
    sourceCombinedOrderNo: row.sourceCombinedOrderNo,
    customerCode: row.customerCode,
    customerName: row.customerName ?? undefined,
    salesperson: row.salesperson ?? undefined,
    packageCount: row.packageCount,
    originalWeightKg: Number(row.originalWeightKg),
    originalLengthCm: Number(row.originalLengthCm),
    originalWidthCm: Number(row.originalWidthCm),
    originalHeightCm: Number(row.originalHeightCm),
    originalVolumetricWeightKg: Number(row.originalVolumetricWeightKg),
    originalVolumetricWeightKg5000: Number(row.originalVolumetricWeightKg5000),
    tallyRequirement: row.tallyRequirement,
    remark: row.remark ?? undefined,
    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
    completedPackageCount: row.completedPackageCount ?? undefined,
    completedWeightKg: row.completedWeightKg === null || row.completedWeightKg === undefined ? undefined : Number(row.completedWeightKg),
    completedLengthCm: row.completedLengthCm === null || row.completedLengthCm === undefined ? undefined : Number(row.completedLengthCm),
    completedWidthCm: row.completedWidthCm === null || row.completedWidthCm === undefined ? undefined : Number(row.completedWidthCm),
    completedHeightCm: row.completedHeightCm === null || row.completedHeightCm === undefined ? undefined : Number(row.completedHeightCm),
    completedVolumetricWeightKg: row.completedVolumetricWeightKg === null || row.completedVolumetricWeightKg === undefined ? undefined : Number(row.completedVolumetricWeightKg),
    completedVolumetricWeightKg5000: row.completedVolumetricWeightKg5000 === null || row.completedVolumetricWeightKg5000 === undefined ? undefined : Number(row.completedVolumetricWeightKg5000),
    completedBy: row.completedBy ?? undefined,
    completedAt: row.completedAt?.toISOString?.() ?? undefined,
    labelStatus: row.labelStatus ?? 'NOT_GENERATED',
    labelNo: row.labelNo ?? undefined,
    labelQrContent: row.labelQrContent ?? undefined,
    labelGeneratedAt: row.labelGeneratedAt?.toISOString?.() ?? undefined,
    labelGeneratedBy: row.labelGeneratedBy ?? undefined,
    labelPrintedAt: row.labelPrintedAt?.toISOString?.() ?? undefined,
    labelPrintedBy: row.labelPrintedBy ?? undefined,
    labelDownloadedAt: row.labelDownloadedAt?.toISOString?.() ?? undefined,
    labelDownloadedBy: row.labelDownloadedBy ?? undefined,
    appliedPackageId: row.appliedPackageId ?? undefined,
    appliedPackageNo: row.appliedPackageNo ?? undefined,
    labelAppliedAt: row.labelAppliedAt?.toISOString?.() ?? undefined,
    labelAppliedBy: row.labelAppliedBy ?? undefined
  };
}

export function resolveWarehouseTallyRecentCutoff() {
  const now = new Date();
  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return new Date(Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth() - 1, beijingNow.getUTCDate(), -8, 0, 0, 0));
}

export async function loadWarehouseTallyTaskOutputPackages(
  prisma: PrismaService,
  id: string
): Promise<WarehousePackageSummary[]> {
  const task = await (prisma as any).warehouseTallyTask.findUnique({ where: { id } });
  if (!task) throw new NotFoundException('理货任务不存在');
  const rows = await (prisma as any).warehousePackage.findMany({
    where: {
      tallyTaskId: id,
      id: { notIn: task.packageIds },
      status: { not: 'TALLIED_ARCHIVED' },
      OR: [
        { archivedReason: null },
        { archivedReason: { not: WAREHOUSE_TALLY_AGGREGATE_CORRECTION_ARCHIVE_REASON } }
      ]
    },
    orderBy: [{ packageIndex: 'asc' }, { createdAt: 'asc' }]
  });
  if (rows.length) return rows.map(mapWarehousePackage);
  const legacyRows = await (prisma as any).warehousePackage.findMany({
    where: { id: { in: task.packageIds } },
    orderBy: [{ packageIndex: 'asc' }, { createdAt: 'asc' }]
  });
  return legacyRows.map(mapWarehousePackage);
}

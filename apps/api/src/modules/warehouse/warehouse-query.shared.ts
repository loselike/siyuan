import { NotFoundException } from '@nestjs/common';
import type {
  WarehousePackageStatus,
  WarehousePackageSummary,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';
import type { PrismaService } from '../prisma.service.js';

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
    tallyTaskId: undefined,
    tallyTaskNo: undefined,
    tallyCompleted: false,
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
    tallyStatus: '待理货',
    splitStatus: row.sourcePackageId ? '拆票子票' : '原始票',
    consolidationStatus: row.status === 'CONSOLIDATED' ? '已合票' : '未合票',
    outboundStatus: row.status === 'SHIPPED' ? '已出库' : '未出库',
    status: row.status as WarehousePackageStatus,
    exceptions: row.exceptions ?? [],
    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt.toISOString()
  };
}

export function mapWarehouseTallyTask(row: any): WarehouseTallyTaskSummary {
  return {
    id: row.id,
    taskNo: row.taskNo,
    status: row.status,
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
    where: { tallyTaskId: id, id: { notIn: task.packageIds } },
    orderBy: [{ packageIndex: 'asc' }, { createdAt: 'asc' }]
  });
  if (rows.length) return rows.map(mapWarehousePackage);
  const legacyRows = await (prisma as any).warehousePackage.findMany({
    where: { id: { in: task.packageIds } },
    orderBy: [{ packageIndex: 'asc' }, { createdAt: 'asc' }]
  });
  return legacyRows.map(mapWarehousePackage);
}

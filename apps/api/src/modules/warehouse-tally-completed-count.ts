import type { WarehousePackageSummary, WarehouseTallyTaskSummary } from '@siyuan/shared';
import { MAX_WAREHOUSE_TALLY_PHYSICAL_PIECES } from './warehouse-tally-physical-results.js';

export const WAREHOUSE_TALLY_COUNT_ADJUSTMENT_ARCHIVE_REASON = '理货件数调整';

export type WarehouseTallyCompletedCountEditPlan =
  | {
    ok: true;
    changed: boolean;
    currentPackageCount: number;
    desiredPackageCount: number;
    archiveOutputIds: string[];
  }
  | { ok: false; reason: string };

export function planWarehouseTallyCompletedCountEdit(
  task: WarehouseTallyTaskSummary,
  outputs: WarehousePackageSummary[],
  desiredPackageCount: number
): WarehouseTallyCompletedCountEditPlan {
  if (task.status !== 'COMPLETED') {
    return { ok: false, reason: '只有已完成理货任务可以修改件数' };
  }
  if (!Number.isSafeInteger(desiredPackageCount) || desiredPackageCount < 1) {
    return { ok: false, reason: '理货后件数必须是正整数' };
  }
  if (desiredPackageCount > MAX_WAREHOUSE_TALLY_PHYSICAL_PIECES) {
    return { ok: false, reason: `理货后件数不能超过 ${MAX_WAREHOUSE_TALLY_PHYSICAL_PIECES} 件` };
  }
  if (!outputs.length) {
    return { ok: false, reason: '理货结果包裹不存在，请刷新后重试' };
  }
  if (outputs.some((pkg) => pkg.packageCount !== 1)) {
    return { ok: false, reason: '历史聚合理货结果不能直接修改件数，请先纠正聚合数据' };
  }
  if (outputs.some((pkg) => pkg.status !== 'RECEIVED')) {
    return { ok: false, reason: '理货结果已进入合票或出库流程，不能修改件数' };
  }
  if (outputs.some((pkg) => pkg.measurementStatus !== 'PENDING_REMEASURE')) {
    return { ok: false, reason: '理货结果已重新过机，不能修改件数' };
  }
  if (outputs.some((pkg) => pkg.systemOrderNo || pkg.shipmentId)) {
    return { ok: false, reason: '理货结果已录单，不能修改件数' };
  }
  const currentPackageCount = outputs.length;
  if (task.completedPackageCount !== currentPackageCount) {
    return { ok: false, reason: '理货结果与任务汇总不一致，请刷新后重试' };
  }
  const orderedOutputs = [...outputs].sort((left, right) => (
    (left.packageIndex ?? 0) - (right.packageIndex ?? 0) || left.id.localeCompare(right.id)
  ));
  return {
    ok: true,
    changed: desiredPackageCount !== currentPackageCount,
    currentPackageCount,
    desiredPackageCount,
    archiveOutputIds: desiredPackageCount < currentPackageCount
      ? orderedOutputs.slice(desiredPackageCount).map((pkg) => pkg.id)
      : []
  };
}

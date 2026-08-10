import type { WarehouseTallyTaskSummary } from '@siyuan/shared';

export const historicalAggregateCorrectionReason = '历史聚合理货纠正';

export type CompletedTallyArchiveRow = {
  tallyTaskId?: string;
  tallyTaskNo?: string;
  archivedReason?: string;
};

export type CompletedTallyArchiveRecordKind = 'ORIGINAL_SOURCE' | 'HISTORICAL_AGGREGATE_CORRECTION';

export type CompletedTallyArchiveSummary = {
  taskNo: string;
  originalPackageCount: number;
  completedPackageCount: number;
  archiveRecordCount: number;
  originalSourceRecordCount: number;
  correctionRecordCount: number;
};

export function resolveCompletedTallyArchiveRecordKind(
  row: Pick<CompletedTallyArchiveRow, 'archivedReason'>
): CompletedTallyArchiveRecordKind {
  return row.archivedReason === historicalAggregateCorrectionReason
    ? 'HISTORICAL_AGGREGATE_CORRECTION'
    : 'ORIGINAL_SOURCE';
}

export function buildCompletedTallyArchiveSummaries(
  rows: CompletedTallyArchiveRow[],
  tasks: WarehouseTallyTaskSummary[]
): CompletedTallyArchiveSummary[] {
  const taskByKey = new Map<string, WarehouseTallyTaskSummary>();
  tasks
    .filter((task) => task.status === 'COMPLETED')
    .forEach((task) => {
      taskByKey.set(task.id, task);
      taskByKey.set(task.taskNo, task);
    });

  const grouped = new Map<string, CompletedTallyArchiveSummary>();
  rows.forEach((row) => {
    const task = taskByKey.get(row.tallyTaskId ?? '') ?? taskByKey.get(row.tallyTaskNo ?? '');
    if (!task || task.completedPackageCount === undefined) return;

    const existing = grouped.get(task.id) ?? {
      taskNo: task.taskNo,
      originalPackageCount: task.packageCount,
      completedPackageCount: task.completedPackageCount,
      archiveRecordCount: 0,
      originalSourceRecordCount: 0,
      correctionRecordCount: 0
    };
    existing.archiveRecordCount += 1;
    if (resolveCompletedTallyArchiveRecordKind(row) === 'HISTORICAL_AGGREGATE_CORRECTION') {
      existing.correctionRecordCount += 1;
    } else {
      existing.originalSourceRecordCount += 1;
    }
    grouped.set(task.id, existing);
  });

  return Array.from(grouped.values()).filter((summary) => (
    summary.originalPackageCount !== summary.completedPackageCount
    || summary.correctionRecordCount > 0
  ));
}

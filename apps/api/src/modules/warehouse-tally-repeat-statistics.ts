import type {
  WarehouseTallyRepeatBatchSummary,
  WarehouseTallyRepeatOperatorSummary,
  WarehouseTallyRepeatStatisticsQuery,
  WarehouseTallyRepeatStatisticsResponse,
  WarehouseTallyRepeatStatisticsSummary,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';

const UNASSIGNED_SALESPERSON = '未归属';
const UNRECORDED_OPERATOR = '未记录';

type CompletedTallyTask = WarehouseTallyTaskSummary & { completedAt: string };

function roundRate(value: number) {
  return Math.round(value * 10) / 10;
}

function summarizeBatches(batches: WarehouseTallyRepeatBatchSummary[]): WarehouseTallyRepeatStatisticsSummary {
  const repeated = batches.filter((batch) => batch.tallyCount > 1);
  return {
    completedBatchCount: batches.length,
    repeatedBatchCount: repeated.length,
    extraTallyCount: repeated.reduce((sum, batch) => sum + batch.tallyCount - 1, 0),
    repeatRate: batches.length ? roundRate((repeated.length / batches.length) * 100) : 0,
    maxTallyCount: batches.reduce((max, batch) => Math.max(max, batch.tallyCount), 0)
  };
}

function dateCutoff(query: WarehouseTallyRepeatStatisticsQuery, now: Date) {
  if (query.datePreset === 'ALL') return undefined;
  const days = query.datePreset === '90D' ? 90 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function includesKeyword(batch: WarehouseTallyRepeatBatchSummary, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return [
    batch.rootTaskNo,
    batch.latestTaskNo,
    batch.customerCode,
    batch.customerName,
    batch.sourceCombinedOrderNo,
    batch.salesperson,
    ...batch.tallyOperators,
    batch.latestTallyRequirement
  ].some((value) => (value ?? '').toLowerCase().includes(normalized));
}

export function summarizeWarehouseTallyRepeats(
  tasks: readonly WarehouseTallyTaskSummary[],
  query: WarehouseTallyRepeatStatisticsQuery = {},
  now = new Date()
): WarehouseTallyRepeatStatisticsResponse {
  const completedTasks = tasks
    .filter((task): task is CompletedTallyTask => task.status === 'COMPLETED' && Boolean(task.completedAt))
    .sort((left, right) => {
      const sequenceDifference = (left.tallySequence ?? 1) - (right.tallySequence ?? 1);
      return sequenceDifference || new Date(left.completedAt).getTime() - new Date(right.completedAt).getTime();
    });
  const grouped = new Map<string, CompletedTallyTask[]>();
  completedTasks.forEach((task) => {
    const rootId = task.rootTallyTaskId || task.id;
    grouped.set(rootId, [...(grouped.get(rootId) ?? []), task]);
  });

  const cutoff = dateCutoff(query, now);
  const salespersonFilter = query.salesperson?.trim();
  const operatorFilter = query.operator?.trim();
  const batches = Array.from(grouped.entries())
    .map(([rootTallyTaskId, chain]): WarehouseTallyRepeatBatchSummary => {
      const ordered = [...chain].sort((left, right) =>
        (left.tallySequence ?? 1) - (right.tallySequence ?? 1)
        || new Date(left.completedAt).getTime() - new Date(right.completedAt).getTime()
      );
      const root = ordered[0];
      const latest = ordered[ordered.length - 1];
      return {
        rootTallyTaskId,
        rootTaskNo: root.taskNo,
        salesperson: root.salesperson?.trim() || latest.salesperson?.trim() || UNASSIGNED_SALESPERSON,
        tallyOperators: Array.from(new Set(ordered.map((task) => task.completedBy?.trim() || UNRECORDED_OPERATOR))),
        customerCode: root.customerCode,
        customerName: root.customerName,
        sourceCombinedOrderNo: root.sourceCombinedOrderNo,
        tallyCount: ordered.length,
        firstCompletedAt: root.completedAt,
        lastCompletedAt: latest.completedAt,
        latestTaskId: latest.id,
        latestTaskNo: latest.taskNo,
        latestSourcePackageId: latest.sourcePackageId,
        latestTallyRequirement: latest.tallyRequirement,
        latestCompletedBy: latest.completedBy
      };
    })
    .filter((batch) => !cutoff || new Date(batch.lastCompletedAt) >= cutoff)
    .filter((batch) => !salespersonFilter || batch.salesperson === salespersonFilter)
    .filter((batch) => !operatorFilter || batch.tallyOperators.includes(operatorFilter))
    .filter((batch) => includesKeyword(batch, query.keyword ?? ''))
    .sort((left, right) => new Date(right.lastCompletedAt).getTime() - new Date(left.lastCompletedAt).getTime());

  const salespersonGroups = new Map<string, WarehouseTallyRepeatBatchSummary[]>();
  batches.forEach((batch) => {
    salespersonGroups.set(batch.salesperson, [...(salespersonGroups.get(batch.salesperson) ?? []), batch]);
  });
  const salespeople = Array.from(salespersonGroups.entries())
    .map(([salesperson, salespersonBatches]) => ({
      salesperson,
      ...summarizeBatches(salespersonBatches),
      latestRepeatedAt: salespersonBatches
        .filter((batch) => batch.tallyCount > 1)
        .sort((left, right) => new Date(right.lastCompletedAt).getTime() - new Date(left.lastCompletedAt).getTime())[0]?.lastCompletedAt
    }))
    .sort((left, right) =>
      right.repeatedBatchCount - left.repeatedBatchCount
      || right.extraTallyCount - left.extraTallyCount
      || left.salesperson.localeCompare(right.salesperson, 'zh-CN')
    );

  const includedRootIds = new Set(batches.map((batch) => batch.rootTallyTaskId));
  const operatorGroups = new Map<string, CompletedTallyTask[]>();
  completedTasks
    .filter((task) => includedRootIds.has(task.rootTallyTaskId || task.id))
    .forEach((task) => {
      const operator = task.completedBy?.trim() || UNRECORDED_OPERATOR;
      if (operatorFilter && operator !== operatorFilter) return;
      operatorGroups.set(operator, [...(operatorGroups.get(operator) ?? []), task]);
    });
  const batchByRootId = new Map(batches.map((batch) => [batch.rootTallyTaskId, batch]));
  const operators: WarehouseTallyRepeatOperatorSummary[] = Array.from(operatorGroups.entries())
    .map(([operator, operatorTasks]) => {
      const operatorRootIds = new Set(operatorTasks.map((task) => task.rootTallyTaskId || task.id));
      const repeatedTasks = operatorTasks.filter((task) => (task.tallySequence ?? 1) > 1);
      const repeatedRootIds = new Set(repeatedTasks.map((task) => task.rootTallyTaskId || task.id));
      const latestCompletedAt = [...operatorTasks]
        .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())[0]?.completedAt;
      const latestRepeatedAt = [...repeatedTasks]
        .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())[0]?.completedAt;
      return {
        operator,
        completedTaskCount: operatorTasks.length,
        completedBatchCount: operatorRootIds.size,
        repeatedBatchCount: repeatedRootIds.size,
        extraTallyCount: repeatedTasks.length,
        repeatRate: operatorRootIds.size ? roundRate((repeatedRootIds.size / operatorRootIds.size) * 100) : 0,
        maxTallyCount: Array.from(operatorRootIds).reduce(
          (max, rootId) => Math.max(max, batchByRootId.get(rootId)?.tallyCount ?? 0),
          0
        ),
        latestCompletedAt,
        latestRepeatedAt
      };
    })
    .sort((left, right) =>
      right.extraTallyCount - left.extraTallyCount
      || right.completedTaskCount - left.completedTaskCount
      || left.operator.localeCompare(right.operator, 'zh-CN')
    );

  const onlyRepeated = query.onlyRepeated === true || query.onlyRepeated === 'true';
  return {
    summary: summarizeBatches(batches),
    salespeople,
    operators,
    batches: onlyRepeated ? batches.filter((batch) => batch.tallyCount > 1) : batches,
    updatedAt: now.toISOString()
  };
}

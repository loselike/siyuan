import type {
  WarehouseTallyRepeatAgentSummary,
  WarehouseTallyRepeatBatchSummary,
  WarehouseTallyRepeatCustomerSummary,
  WarehouseTallyRepeatOperatorSummary,
  WarehouseTallyRepeatSalespersonSummary,
  WarehouseTallyRepeatStatisticsQuery,
  WarehouseTallyRepeatStatisticsResponse,
  WarehouseTallyRepeatStatisticsSummary,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';

const UNASSIGNED_AGENT = '未关联代理';
const UNASSIGNED_SALESPERSON = '未归属';
const UNRECORDED_OPERATOR = '未记录';

type CompletedTallyTask = WarehouseTallyTaskSummary & {
  completedAt: string;
  /** Resolved from the source package's linked shipment when available. */
  agentShortName?: string;
};

type RepeatBatch = WarehouseTallyRepeatBatchSummary;

interface DimensionMetrics extends WarehouseTallyRepeatStatisticsSummary {
  latestCompletedAt?: string;
  latestRepeatedAt?: string;
}

function roundRate(value: number) {
  return Math.round(value * 10) / 10;
}

function latestTimestamp(batches: RepeatBatch[], repeatedOnly = false) {
  return [...batches]
    .filter((batch) => !repeatedOnly || batch.periodExtraTallyCount > 0)
    .sort((left, right) => new Date(right.lastCompletedAt).getTime() - new Date(left.lastCompletedAt).getTime())[0]
    ?.lastCompletedAt;
}

function summarizeBatches(batches: RepeatBatch[]): WarehouseTallyRepeatStatisticsSummary {
  const repeated = batches.filter((batch) => batch.periodExtraTallyCount > 0);
  return {
    completedBatchCount: batches.length,
    repeatedBatchCount: repeated.length,
    tallyCount: batches.reduce((sum, batch) => sum + batch.periodTallyCount, 0),
    extraTallyCount: batches.reduce((sum, batch) => sum + batch.periodExtraTallyCount, 0),
    repeatRate: batches.length ? roundRate((repeated.length / batches.length) * 100) : 0,
    maxTallyCount: batches.reduce((max, batch) => Math.max(max, batch.periodTallyCount), 0)
  };
}

function dimensionMetrics(batches: RepeatBatch[]): DimensionMetrics {
  return {
    ...summarizeBatches(batches),
    latestCompletedAt: latestTimestamp(batches),
    latestRepeatedAt: latestTimestamp(batches, true)
  };
}

function dateCutoff(query: WarehouseTallyRepeatStatisticsQuery, now: Date) {
  if (query.datePreset === 'ALL') return undefined;
  const days = query.datePreset === '90D' ? 90 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function includesKeyword(batch: RepeatBatch, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return [
    batch.rootTaskNo,
    batch.latestTaskNo,
    batch.agentShortName,
    batch.customerCode,
    batch.customerName,
    batch.sourceCombinedOrderNo,
    batch.salesperson,
    ...batch.tallyOperators,
    batch.latestTallyRequirement
  ].some((value) => (value ?? '').toLowerCase().includes(normalized));
}

function uniqueNonEmpty(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

export function summarizeWarehouseTallyRepeats(
  tasks: readonly WarehouseTallyTaskSummary[],
  query: WarehouseTallyRepeatStatisticsQuery = {},
  now = new Date()
): WarehouseTallyRepeatStatisticsResponse {
  const completedTasks = tasks
    .filter((task): task is CompletedTallyTask => task.status === 'COMPLETED' && task.tallyProgressStatus !== 'CANCELLED' && Boolean(task.completedAt))
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
    .map(([rootTallyTaskId, chain]): RepeatBatch | null => {
      const ordered = [...chain].sort((left, right) =>
        (left.tallySequence ?? 1) - (right.tallySequence ?? 1)
        || new Date(left.completedAt).getTime() - new Date(right.completedAt).getTime()
      );
      const periodTasks = cutoff
        ? ordered.filter((task) => new Date(task.completedAt) >= cutoff)
        : ordered;
      if (!periodTasks.length) return null;
      const root = ordered[0]!;
      const latest = ordered[ordered.length - 1]!;
      const firstInPeriod = periodTasks[0]!;
      const latestInPeriod = periodTasks[periodTasks.length - 1]!;
      const agentShortName = uniqueNonEmpty(ordered.map((task) => task.agentShortName)).join('、') || UNASSIGNED_AGENT;
      const tallyOperators = uniqueNonEmpty(ordered.map((task) => task.completedBy));
      return {
        rootTallyTaskId,
        rootTaskNo: root.taskNo,
        agentShortName,
        salesperson: root.salesperson?.trim() || latest.salesperson?.trim() || UNASSIGNED_SALESPERSON,
        tallyOperators: tallyOperators.length ? tallyOperators : [UNRECORDED_OPERATOR],
        customerCode: root.customerCode,
        customerName: root.customerName || latest.customerName,
        sourceCombinedOrderNo: root.sourceCombinedOrderNo,
        tallyCount: ordered.length,
        periodTallyCount: periodTasks.length,
        periodExtraTallyCount: periodTasks.filter((task) => (task.tallySequence ?? 1) > 1).length,
        firstCompletedAt: firstInPeriod.completedAt,
        lastCompletedAt: latestInPeriod.completedAt,
        latestTaskId: latest.id,
        latestTaskNo: latest.taskNo,
        latestSourcePackageId: latest.sourcePackageId,
        latestTallyRequirement: latest.tallyRequirement,
        latestCompletedBy: latest.completedBy
      };
    })
    .filter((batch): batch is RepeatBatch => Boolean(batch))
    .filter((batch) => !salespersonFilter || batch.salesperson === salespersonFilter)
    .filter((batch) => !operatorFilter || batch.tallyOperators.includes(operatorFilter))
    .filter((batch) => includesKeyword(batch, query.keyword ?? ''))
    .sort((left, right) => new Date(right.lastCompletedAt).getTime() - new Date(left.lastCompletedAt).getTime());

  const salespersonGroups = new Map<string, RepeatBatch[]>();
  const customerGroups = new Map<string, RepeatBatch[]>();
  const agentGroups = new Map<string, RepeatBatch[]>();
  batches.forEach((batch) => {
    salespersonGroups.set(batch.salesperson, [...(salespersonGroups.get(batch.salesperson) ?? []), batch]);
    customerGroups.set(batch.customerCode, [...(customerGroups.get(batch.customerCode) ?? []), batch]);
    const agent = batch.agentShortName || UNASSIGNED_AGENT;
    agentGroups.set(agent, [...(agentGroups.get(agent) ?? []), batch]);
  });

  const sortDimensionRows = <T extends DimensionMetrics>(rows: T[]) => rows.sort((left, right) =>
    right.extraTallyCount - left.extraTallyCount
    || right.tallyCount - left.tallyCount
    || (right.latestCompletedAt ?? '').localeCompare(left.latestCompletedAt ?? '')
  );
  const salespeople: WarehouseTallyRepeatSalespersonSummary[] = sortDimensionRows(
    Array.from(salespersonGroups.entries()).map(([salesperson, groupedBatches]) => ({
      salesperson,
      ...dimensionMetrics(groupedBatches)
    }))
  );
  const customers: WarehouseTallyRepeatCustomerSummary[] = sortDimensionRows(
    Array.from(customerGroups.entries()).map(([customerCode, groupedBatches]) => ({
      customerCode,
      customerName: groupedBatches.find((batch) => batch.customerName)?.customerName,
      ...dimensionMetrics(groupedBatches)
    }))
  );
  const agents: WarehouseTallyRepeatAgentSummary[] = sortDimensionRows(
    Array.from(agentGroups.entries()).map(([agentShortName, groupedBatches]) => ({
      agentShortName,
      ...dimensionMetrics(groupedBatches)
    }))
  );

  const includedRootIds = new Set(batches.map((batch) => batch.rootTallyTaskId));
  const periodTasks = completedTasks.filter((task) => {
    const rootId = task.rootTallyTaskId || task.id;
    return includedRootIds.has(rootId) && (!cutoff || new Date(task.completedAt) >= cutoff);
  });
  const batchByRootId = new Map(batches.map((batch) => [batch.rootTallyTaskId, batch]));
  const operatorGroups = new Map<string, CompletedTallyTask[]>();
  periodTasks.forEach((task) => {
    const operator = task.completedBy?.trim() || UNRECORDED_OPERATOR;
    if (operatorFilter && operator !== operatorFilter) return;
    operatorGroups.set(operator, [...(operatorGroups.get(operator) ?? []), task]);
  });
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
        tallyCount: operatorTasks.length,
        repeatedBatchCount: repeatedRootIds.size,
        extraTallyCount: repeatedTasks.length,
        repeatRate: operatorRootIds.size ? roundRate((repeatedRootIds.size / operatorRootIds.size) * 100) : 0,
        maxTallyCount: Array.from(operatorRootIds).reduce(
          (max, rootId) => Math.max(max, batchByRootId.get(rootId)?.periodTallyCount ?? 0),
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
    agents,
    customers,
    salespeople,
    operators,
    batches: onlyRepeated ? batches.filter((batch) => batch.periodExtraTallyCount > 0) : batches,
    updatedAt: now.toISOString()
  };
}

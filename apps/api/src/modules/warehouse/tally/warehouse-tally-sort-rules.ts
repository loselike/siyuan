import { BadRequestException } from '@nestjs/common';
import type {
  WarehouseTallySortRule,
  WarehouseTallySortRulesUpdateInput,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';
import {
  createDefaultWarehouseTallySortRules,
  sortWarehouseTallyTasks,
  warehouseTallyChannels
} from '@siyuan/shared';

export function mapWarehouseTallySortRules(rows: any[]): WarehouseTallySortRule[] {
  const byChannel = new Map(rows.map((row) => [row.channel, row]));
  return createDefaultWarehouseTallySortRules().map((fallback) => {
    const row = byChannel.get(fallback.channel);
    if (!row) return fallback;
    const sortOrder = Number(row.sortOrder);
    return {
      channel: fallback.channel,
      sortOrder: Number.isInteger(sortOrder) && sortOrder >= 1 && sortOrder <= 999 ? sortOrder : fallback.sortOrder,
      preferredTimeSlot: row.preferredTimeSlot === 'MORNING' || row.preferredTimeSlot === 'AFTERNOON' || row.preferredTimeSlot === 'ALL_DAY'
        ? row.preferredTimeSlot
        : fallback.preferredTimeSlot,
      enabled: typeof row.enabled === 'boolean' ? row.enabled : fallback.enabled,
      updatedAt: row.updatedAt?.toISOString?.() ?? (typeof row.updatedAt === 'string' ? row.updatedAt : undefined),
      updatedBy: row.updatedBy ?? undefined
    };
  }).sort((left, right) => left.sortOrder - right.sortOrder || left.channel.localeCompare(right.channel));
}

export function normalizeWarehouseTallySortRuleInput(input: WarehouseTallySortRulesUpdateInput) {
  const inputRules = input?.rules;
  if (!Array.isArray(inputRules) || inputRules.length !== warehouseTallyChannels.length) {
    throw new BadRequestException('请完整维护全部理货渠道排序规则');
  }
  const byChannel = new Map(inputRules.map((rule) => [rule?.channel, rule]));
  if (byChannel.size !== warehouseTallyChannels.length || warehouseTallyChannels.some((channel) => !byChannel.has(channel))) {
    throw new BadRequestException('理货排序规则必须包含且仅包含快递、空运、卡航、铁路、海运');
  }
  return warehouseTallyChannels.map((channel) => {
    const rule = byChannel.get(channel)!;
    const sortOrder = Number(rule.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 999) {
      throw new BadRequestException('理货排序号须为 1 到 999 的整数');
    }
    if (rule.preferredTimeSlot !== 'MORNING' && rule.preferredTimeSlot !== 'AFTERNOON' && rule.preferredTimeSlot !== 'ALL_DAY') {
      throw new BadRequestException('理货优先时段无效');
    }
    if (typeof rule.enabled !== 'boolean') {
      throw new BadRequestException('理货渠道启用状态无效');
    }
    return { channel, sortOrder, preferredTimeSlot: rule.preferredTimeSlot, enabled: rule.enabled };
  });
}

export function sortPendingWarehouseTallyTasks(
  tasks: WarehouseTallyTaskSummary[],
  rules: WarehouseTallySortRule[],
  now = new Date()
) {
  const inProgress = tasks
    .filter((task) => task.tallyProgressStatus === 'IN_PROGRESS')
    .sort(compareWarehouseTallyTaskCreation);
  const waiting = sortWarehouseTallyTasks(
    tasks.filter((task) => task.tallyProgressStatus !== 'IN_PROGRESS'),
    now,
    rules
  );
  return [...inProgress, ...waiting];
}

function compareWarehouseTallyTaskCreation(
  left: Pick<WarehouseTallyTaskSummary, 'createdAt' | 'taskNo' | 'id'>,
  right: Pick<WarehouseTallyTaskSummary, 'createdAt' | 'taskNo' | 'id'>
) {
  const createdDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return (Number.isFinite(createdDifference) && createdDifference !== 0 ? createdDifference : 0)
    || String(left.taskNo ?? left.id).localeCompare(String(right.taskNo ?? right.id), 'zh-Hans-CN');
}

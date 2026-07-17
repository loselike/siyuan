const BEIJING_TIME_ZONE = 'Asia/Shanghai';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatBeijingMonthDay(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BEIJING_TIME_ZONE,
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!month || !day) {
    throw new Error('无法生成理货任务日期');
  }
  return `${month}${day}`;
}

/**
 * 理货任务号：客户编号 + 月日 +（同日第二单起两位编号）+ LH。
 * 首单不带 01；已生成的旧版 01 视为首单，保证切换规则后继续从 02 递增。
 */
export function nextWarehouseTallyTaskNo(customerCode: string, existingTaskNos: readonly string[], date = new Date()) {
  const prefix = `${customerCode}${formatBeijingMonthDay(date)}`;
  const firstTaskNo = `${prefix}LH`;
  const sequencePattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)LH$`);
  let highestSequence = 0;

  existingTaskNos.forEach((taskNo) => {
    if (taskNo === firstTaskNo) {
      highestSequence = Math.max(highestSequence, 1);
      return;
    }
    const match = taskNo.match(sequencePattern);
    const sequence = Number(match?.[1]);
    if (Number.isInteger(sequence) && sequence >= 1) {
      highestSequence = Math.max(highestSequence, sequence);
    }
  });

  return highestSequence === 0
    ? firstTaskNo
    : `${prefix}${String(Math.max(2, highestSequence + 1)).padStart(2, '0')}LH`;
}

/**
 * 同一包裹再次理货时沿用首次理货任务号，并在 LH 后追加两位轮次。
 */
export function nextWarehouseRetallyTaskNo(previousTaskNo: string, existingTaskNos: readonly string[]) {
  const normalized = previousTaskNo.trim();
  const previousMatch = normalized.match(/^(.*LH)(\d{2})$/);
  const baseTaskNo = previousMatch?.[1] ?? (normalized.endsWith('LH') ? normalized : `${normalized}LH`);
  const sequencePattern = new RegExp(`^${escapeRegExp(baseTaskNo)}(\\d{2})$`);
  let highestSequence = previousMatch ? Number(previousMatch[2]) : 1;

  existingTaskNos.forEach((taskNo) => {
    if (taskNo === baseTaskNo) {
      highestSequence = Math.max(highestSequence, 1);
      return;
    }
    const sequence = Number(taskNo.match(sequencePattern)?.[1]);
    if (Number.isInteger(sequence) && sequence >= 2) {
      highestSequence = Math.max(highestSequence, sequence);
    }
  });

  return `${baseTaskNo}${String(Math.max(2, highestSequence + 1)).padStart(2, '0')}`;
}

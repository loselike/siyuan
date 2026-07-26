export function formatCurrency(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

export function formatUsd(amount: number) {
  return `$${amount.toFixed(2)}`;
}

type DateTimeValue = string | number | Date;

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

function parseDateTimeValue(value: DateTimeValue) {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function formatDateParts(date: Date, includeTime: boolean) {
  const beijingTime = new Date(date.getTime() + BEIJING_OFFSET_MS);
  const pad = (part: number) => part.toString().padStart(2, '0');
  const dateText = `${beijingTime.getUTCFullYear()}-${pad(beijingTime.getUTCMonth() + 1)}-${pad(beijingTime.getUTCDate())}`;
  if (!includeTime) return dateText;
  return `${dateText} ${pad(beijingTime.getUTCHours())}:${pad(beijingTime.getUTCMinutes())}:${pad(beijingTime.getUTCSeconds())}`;
}

export function formatBeijingDateTime(value: DateTimeValue) {
  const date = parseDateTimeValue(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDateParts(date, true);
}

export function formatBeijingDate(value: DateTimeValue) {
  const date = parseDateTimeValue(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDateParts(date, false);
}

/** Calendar-only business dates must not move to another day through timezone conversion. */
export function formatBusinessDate(value?: DateTimeValue) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return formatBeijingDate(value);
}

export function formatBeijingDateTimeInputValue(value: DateTimeValue = new Date()) {
  const date = parseDateTimeValue(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 16);
}

export function parseBeijingDateTimeInputToIso(value: string) {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!matched) return value;
  const [, year, month, day, hour, minute, second = '00'] = matched;
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - 8,
    Number(minute),
    Number(second)
  )).toISOString();
}

export function getBeijingDayStartTimestamp(value: DateTimeValue = new Date()) {
  const dateKey = formatBeijingDate(value);
  const timestamp = Date.parse(`${dateKey}T00:00:00+08:00`);
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

export function getBeijingWeekStartTimestamp(value: DateTimeValue = new Date()) {
  const dayStart = getBeijingDayStartTimestamp(value);
  if (!Number.isFinite(dayStart)) return NaN;
  const weekday = new Date(dayStart + BEIJING_OFFSET_MS).getUTCDay();
  return dayStart - ((weekday + 6) % 7) * 24 * 60 * 60 * 1000;
}

export function isBeijingToday(value?: DateTimeValue, now: DateTimeValue = new Date()) {
  if (value === undefined || value === null || value === '') return false;
  const timestamp = parseDateTimeValue(value).getTime();
  const start = getBeijingDayStartTimestamp(now);
  return Number.isFinite(timestamp) && Number.isFinite(start) && timestamp >= start && timestamp < start + 24 * 60 * 60 * 1000;
}

export function isBeijingCurrentWeek(value?: DateTimeValue, now: DateTimeValue = new Date()) {
  if (value === undefined || value === null || value === '') return false;
  const timestamp = parseDateTimeValue(value).getTime();
  const start = getBeijingWeekStartTimestamp(now);
  return Number.isFinite(timestamp) && Number.isFinite(start) && timestamp >= start && timestamp < start + 7 * 24 * 60 * 60 * 1000;
}

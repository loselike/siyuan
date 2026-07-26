import { describe, expect, it } from 'vitest';
import {
  formatBeijingDate,
  formatBeijingDateTime,
  formatBeijingDateTimeInputValue,
  formatBusinessDate,
  getBeijingDayStartTimestamp,
  getBeijingWeekStartTimestamp,
  isBeijingCurrentWeek,
  isBeijingToday,
  parseBeijingDateTimeInputToIso
} from './format';

describe('Beijing time formatting', () => {
  it('converts UTC system timestamps to Beijing time', () => {
    expect(formatBeijingDateTime('2026-07-19T04:01:00.079Z')).toBe('2026-07-19 12:01:00');
    expect(formatBeijingDate('2026-07-18T16:30:00.000Z')).toBe('2026-07-19');
  });

  it('preserves calendar-only business dates without timezone shifting', () => {
    expect(formatBusinessDate('2026-07-19')).toBe('2026-07-19');
    expect(formatBusinessDate('2026-07-19T23:59:59.000Z')).toBe('2026-07-20');
    expect(formatBusinessDate('2026-07-20T00:30:00+08:00')).toBe('2026-07-20');
  });

  it('round-trips datetime-local values as Beijing time', () => {
    expect(formatBeijingDateTimeInputValue('2026-07-19T04:01:00.000Z')).toBe('2026-07-19T12:01');
    expect(parseBeijingDateTimeInputToIso('2026-07-19T12:01')).toBe('2026-07-19T04:01:00.000Z');
  });

  it('uses Beijing calendar boundaries for today and current-week metrics', () => {
    const now = '2026-07-19T04:00:00.000Z';
    expect(getBeijingDayStartTimestamp(now)).toBe(Date.parse('2026-07-19T00:00:00+08:00'));
    expect(getBeijingWeekStartTimestamp(now)).toBe(Date.parse('2026-07-13T00:00:00+08:00'));
    expect(isBeijingToday('2026-07-18T16:01:00.000Z', now)).toBe(true);
    expect(isBeijingCurrentWeek('2026-07-12T16:01:00.000Z', now)).toBe(true);
    expect(isBeijingCurrentWeek('2026-07-12T15:59:59.000Z', now)).toBe(false);
  });
});

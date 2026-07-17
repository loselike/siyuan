import { describe, expect, it } from 'vitest';
import { nextWarehouseRetallyTaskNo, nextWarehouseTallyTaskNo } from './warehouse-tally-task-number.js';

describe('nextWarehouseTallyTaskNo', () => {
  const juneTwentySecond = new Date('2026-06-22T09:00:00.000+08:00');

  it('uses the required first-task format without 01', () => {
    expect(nextWarehouseTallyTaskNo('1399', [], juneTwentySecond)).toBe('13990622LH');
  });

  it('starts the same-day sequence from 02 and keeps it increasing', () => {
    expect(nextWarehouseTallyTaskNo('1399', ['13990622LH'], juneTwentySecond)).toBe('1399062202LH');
    expect(nextWarehouseTallyTaskNo('1399', ['13990622LH', '1399062202LH', '1399062203LH'], juneTwentySecond)).toBe('1399062204LH');
  });

  it('continues from existing 01 task numbers created by the incorrect rule', () => {
    expect(nextWarehouseTallyTaskNo('P704', ['P704062201LH'], juneTwentySecond)).toBe('P704062202LH');
  });
});

describe('nextWarehouseRetallyTaskNo', () => {
  it('starts the same-package tally cycle from 02 after LH', () => {
    expect(nextWarehouseRetallyTaskNo('13990622LH', ['13990622LH'])).toBe('13990622LH02');
  });

  it('keeps the same-package tally cycle increasing', () => {
    expect(nextWarehouseRetallyTaskNo('13990622LH02', ['13990622LH', '13990622LH02'])).toBe('13990622LH03');
  });

  it('preserves the independent same-day task sequence before LH', () => {
    expect(nextWarehouseRetallyTaskNo('1399062202LH', ['1399062202LH'])).toBe('1399062202LH02');
  });
});

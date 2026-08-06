import { describe, expect, it } from 'vitest';
import {
  isWarehouseRetallyTaskNo as isWarehouseRetallyTaskNoFromIndex,
  resolveWarehouseTallyLifecycleStatus as resolveWarehouseTallyLifecycleStatusFromIndex,
  type WarehousePackageStatus
} from './index.js';
import {
  isWarehouseRetallyTaskNo,
  resolveWarehouseTallyLifecycleStatus
} from './warehouse.js';

describe('warehouse shared contract boundary', () => {
  it('keeps the root entrypoint exports bound to the extracted warehouse module', () => {
    expect(isWarehouseRetallyTaskNoFromIndex).toBe(isWarehouseRetallyTaskNo);
    expect(resolveWarehouseTallyLifecycleStatusFromIndex).toBe(resolveWarehouseTallyLifecycleStatus);
  });

  it('preserves tally lifecycle classification through the root entrypoint', () => {
    const status: WarehousePackageStatus = 'RECEIVED';

    expect(status).toBe('RECEIVED');
    expect(isWarehouseRetallyTaskNoFromIndex('94760803LH')).toBe(false);
    expect(isWarehouseRetallyTaskNoFromIndex('94760803LH02')).toBe(true);
    expect(resolveWarehouseTallyLifecycleStatusFromIndex({})).toBe('待理货');
    expect(resolveWarehouseTallyLifecycleStatusFromIndex({ tallyTaskId: 'task-1' })).toBe('理货中');
    expect(resolveWarehouseTallyLifecycleStatusFromIndex({ tallyTaskId: 'task-1', tallyCompleted: true })).toBe('已理货');
    expect(resolveWarehouseTallyLifecycleStatusFromIndex({ tallyTaskNo: '94760803LH02', tallyCompleted: true })).toBe('二次理货');
  });
});

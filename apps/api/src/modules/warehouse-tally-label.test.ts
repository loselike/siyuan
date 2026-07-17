import { describe, expect, it } from 'vitest';
import { createWarehouseTallyPackageLabelNo } from './warehouse-tally-label.js';

describe('createWarehouseTallyPackageLabelNo', () => {
  it('keeps the task number for a single output package', () => {
    expect(createWarehouseTallyPackageLabelNo('13990622LH', 1, 1)).toBe('13990622LH');
  });

  it('adds a unique package suffix for multiple output packages', () => {
    expect(createWarehouseTallyPackageLabelNo('1399062202LH', 5, 8)).toBe('1399062202LH-05');
  });

  it('keeps the retally cycle before the package suffix', () => {
    expect(createWarehouseTallyPackageLabelNo('13990622LH02', 2, 3)).toBe('13990622LH02-02');
  });
});

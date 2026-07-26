import type { WarehouseManualReceiptCreateInput, WarehousePackageSummary, WarehouseTallyTaskSummary } from '@siyuan/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildWarehouseManualReceiptPackageInputs,
  buildWarehouseTallyLabelQrContent,
  createWarehouseInboundLabelNo,
  nextWarehouseSplitSequence,
  normalizeOrderEntryPackageIds,
  parseWarehouseCombinedOrderNo,
  resolveWarehouseTodayRange,
  warehousePackageActualWeightTotal,
  warehousePackageSplitTotals
} from './warehouse-domain.shared.js';

const receipt = (cartonSpecs: WarehouseManualReceiptCreateInput['cartonSpecs']): WarehouseManualReceiptCreateInput => ({
  customerCode: 'C001',
  combinedOrderNo: 'SO001－SF001',
  domesticTrackingNo: '',
  cartonSpecs,
  scanTime: '2026-07-26T08:00:00.000Z'
});
const carton = { weightKg: 10, lengthCm: 50, widthCm: 40, heightCm: 30, packageCount: 2 };
const pkg = (overrides: Partial<WarehousePackageSummary> = {}) =>
  ({ packageCount: 2, weightKg: 10, cbm: 0.12, volumetricWeightKg: 20, volumetricWeightKg5000: 24, ...overrides }) as WarehousePackageSummary;

afterEach(() => vi.useRealTimers());

describe('warehouse domain shared helpers', () => {
  it('keeps combined-order parsing, manual receipt mapping and validation texts unchanged', () => {
    expect(parseWarehouseCombinedOrderNo(' SO001—SF001 ')).toEqual({ customerOrderNo: 'SO001', domesticTrackingNo: 'SF001' });
    expect(parseWarehouseCombinedOrderNo('SO001')).toEqual({ customerOrderNo: 'SO001', domesticTrackingNo: '' });
    expect(buildWarehouseManualReceiptPackageInputs(receipt([carton]))).toEqual([
      expect.objectContaining({
        customerCode: 'C001',
        customerOrderNo: 'SO001',
        domesticTrackingNo: 'SF001',
        combinedOrderNo: 'SO001-SF001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 2,
        scanSource: '手动添加'
      })
    ]);
    const invalid: Array<[WarehouseManualReceiptCreateInput['cartonSpecs'], string]> = [
      [[], '请至少填写一条箱规'],
      [[{ ...carton, weightKg: 0 }], '第 1 条箱规重量必须大于 0'],
      [[{ ...carton, lengthCm: 0 }], '第 1 条箱规长宽高必须大于 0'],
      [[{ ...carton, packageCount: 0 }], '第 1 条箱规件数必须为正整数']
    ];
    invalid.forEach(([specs, message]) => expect(() => buildWarehouseManualReceiptPackageInputs(receipt(specs))).toThrow(message));
  });

  it('keeps Beijing today, week, rolling-week, month and custom boundaries unchanged', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T07:30:00.000Z'));
    const iso = (preset: Parameters<typeof resolveWarehouseTodayRange>[0]) => {
      const range = resolveWarehouseTodayRange(preset);
      return [range.start.toISOString(), range.end.toISOString()];
    };
    expect(iso({ datePreset: 'TODAY' })).toEqual(['2026-07-25T16:00:00.000Z', '2026-07-26T16:00:00.000Z']);
    expect(iso({ datePreset: 'WEEK' })).toEqual(['2026-07-19T16:00:00.000Z', '2026-07-26T16:00:00.000Z']);
    expect(iso({ datePreset: 'LAST_7_DAYS' })).toEqual(['2026-07-19T16:00:00.000Z', '2026-07-26T16:00:00.000Z']);
    expect(iso({ datePreset: 'MONTH' })).toEqual(['2026-06-30T16:00:00.000Z', '2026-07-31T16:00:00.000Z']);
    expect(iso({ datePreset: 'CUSTOM', customFrom: '2026-07-02', customTo: '2026-07-05' })).toEqual([
      '2026-07-01T16:00:00.000Z',
      '2026-07-05T16:00:00.000Z'
    ]);
  });

  it('keeps labels, IDs, split totals and split sequence unchanged', () => {
    const task = {
      taskNo: 'TL-001', customerCode: 'C001', completedAt: '2026-07-26T08:00:00.000Z', completedPackageCount: 3,
      packageCount: 2, sourcePackageId: 'pkg-1', sourceCombinedOrderNo: 'SO001-SF001'
    } as WarehouseTallyTaskSummary;
    expect(createWarehouseInboundLabelNo('C001', 'SF001', 2, 3)).toBe('C001-SF001-2/3');
    expect(JSON.parse(buildWarehouseTallyLabelQrContent(task, 'LBL-001'))).toEqual(expect.objectContaining({ labelNo: 'LBL-001', date: '2026-07-26', packageCount: 3 }));
    expect(normalizeOrderEntryPackageIds([' pkg-1,pkg-2 ', 'pkg-2', 'pkg-3'])).toEqual(['pkg-1', 'pkg-2', 'pkg-3']);
    expect(warehousePackageActualWeightTotal(pkg())).toBe(20);
    expect(warehousePackageActualWeightTotal(pkg({ sourcePackageId: 'root' }))).toBe(10);
    expect(warehousePackageSplitTotals([pkg(), pkg({ sourcePackageId: 'root', packageCount: 1, weightKg: 7.236, cbm: 0.056, volumetricWeightKg: 9.876, volumetricWeightKg5000: 11.111 })]))
      .toEqual({ packageCount: 3, weightKg: 27.24, cbm: 0.18, volumetricWeightKg: 29.88, volumetricWeightKg5000: 35.11 });
    expect(nextWarehouseSplitSequence('SO001-SF001', ['SO001-SF001-1', 'SO001-SF001-3', 'SO001-SF001-X'])).toBe(4);
  });
});

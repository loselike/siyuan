import { describe, expect, it } from 'vitest';
import {
  calculateCartonSpecTotals,
  createWarehouseApiPackages,
  currentPageIds,
  parseBeijingDateTimeInputToIso,
  withWarehouseCustomerProgress,
  type WarehouseInboundPackage
} from './warehousePageModel';

describe('warehouse page model', () => {
  it('keeps paging, Beijing time conversion and carton totals unchanged', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ id: `row-${index + 1}` }));
    expect(currentPageIds(rows, 2)).toEqual(['row-11', 'row-12']);
    expect(currentPageIds(rows, 0, 2)).toEqual(['row-1', 'row-2']);
    expect(parseBeijingDateTimeInputToIso('2026-07-25T08:30')).toBe('2026-07-25T00:30:00.000Z');

    const totals = calculateCartonSpecTotals([
      { weightKg: 10, lengthCm: 100, widthCm: 50, heightCm: 40, packageCount: 2 }
    ]);
    expect(totals.totalPackages).toBe(2);
    expect(totals.totalActualWeightKg).toBe(20);
    expect(totals.totalCbm).toBeCloseTo(0.4);
    expect(totals.totalVol5000).toBeCloseTo(80);
    expect(totals.totalVol6000).toBeCloseTo(66.6667);
  });

  it('keeps scan fixtures and customer arrival progress unchanged', () => {
    const fixtureRows = createWarehouseApiPackages();
    const partialRow = fixtureRows.find((row) => row.combinedOrderNo === '1399-KY4001036478949');
    expect(partialRow).toMatchObject({
      customerOrderNo: '1399',
      domesticTrackingNo: 'KY4001036478949',
      expectedTotalPackageCount: 10,
      scanTime: '2026-06-08 10:07:28'
    });
    expect(partialRow?.exceptions).toContain('部分到仓 3/10');
    expect(partialRow?.labelNo).toContain('/10');

    const base = {
      customerOrderNo: 'ORDER-1',
      expectedTotalPackageCount: 3,
      exceptions: ['木架']
    } as WarehouseInboundPackage;
    const progressed = withWarehouseCustomerProgress([
      { ...base, id: 'pkg-1' },
      { ...base, id: 'pkg-2' }
    ]);
    expect(progressed[0].exceptions).toEqual(['木架', '部分到仓 2/3']);
    expect(progressed[1].exceptions).toEqual(['木架', '部分到仓 2/3']);
  });
});

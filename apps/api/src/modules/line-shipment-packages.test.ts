import { describe, expect, it } from 'vitest';
import type { Shipment, WarehousePackageSummary } from '@siyuan/shared';
import { buildLineShipmentPackageSummaries } from './line-shipment-packages.js';

describe('line shipment package resolver', () => {
  it('uses one package relation contract for formal, draft, and tally-result packages', () => {
    const shipments = [
      shipment('formal', 'OUT-FORMAL'),
      shipment('draft', 'OUT-DRAFT', ['pkg-draft']),
      shipment('tally', 'OUT-TALLY', ['pkg-source'])
    ];
    const packages = [
      pkg('pkg-formal', { shipmentId: 'formal', domesticTrackingNo: 'KY-FORMAL' }),
      pkg('pkg-draft', { domesticTrackingNo: 'KY-DRAFT' }),
      pkg('pkg-source', {
        status: 'TALLIED_ARCHIVED',
        domesticTrackingNo: 'KY-SOURCE',
        archivedByPackageId: 'pkg-result',
        tallyTaskId: 'task-1'
      }),
      pkg('pkg-result', {
        sourcePackageId: 'pkg-source',
        domesticTrackingNo: 'KY-RESULT',
        packageCount: 2,
        weightKg: 5,
        tallyTaskId: 'task-1'
      })
    ];

    const result = buildLineShipmentPackageSummaries(shipments, packages);

    expect(result.formal.domesticTrackingNos).toEqual(['KY-FORMAL']);
    expect(result.draft.domesticTrackingNos).toEqual(['KY-DRAFT']);
    expect(result.tally.domesticTrackingNos).toEqual(expect.arrayContaining(['KY-SOURCE', 'KY-RESULT']));
    expect(result.tally.packageCount).toBe(2);
    expect(result.tally.totalWeightKg).toBe(5);
  });
});

function shipment(id: string, systemOrderNo: string, draftWarehousePackageIds: string[] = []): Shipment {
  return { id, systemOrderNo, draftWarehousePackageIds } as Shipment;
}

function pkg(id: string, overrides: Partial<WarehousePackageSummary> = {}): WarehousePackageSummary {
  return {
    id,
    customerCode: '9409',
    customerOrderNo: 'CUST-1',
    domesticTrackingNo: `KY-${id}`,
    combinedOrderNo: `9409-${id}`,
    packageCount: 1,
    weightKg: 1,
    cbm: 0.01,
    status: 'RECEIVED',
    exceptions: [],
    ...overrides
  } as WarehousePackageSummary;
}

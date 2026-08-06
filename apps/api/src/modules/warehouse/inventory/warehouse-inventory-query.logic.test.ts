import { describe, expect, it } from 'vitest';
import { summarizeWarehouseInStockTotals } from './warehouse-inventory-query.logic.js';

describe('summarizeWarehouseInStockTotals', () => {
  it('preserves piece, weight, volume, ticket and exception totals for the fixed warehouse sample', () => {
    expect(summarizeWarehouseInStockTotals([
      {
        combinedOrderNo: 'ORDER-1',
        customerOrderNo: 'C001-1',
        domesticTrackingNo: 'SF001',
        packageCount: 2,
        weightKg: 10,
        cbm: 0.06,
        status: 'RECEIVED',
        exceptions: []
      },
      {
        combinedOrderNo: 'ORDER-1',
        customerOrderNo: 'C001-1',
        domesticTrackingNo: 'SF002',
        packageCount: 1,
        weightKg: 5,
        cbm: 0.02,
        status: 'RECEIVED',
        manualException: '破损',
        exceptions: []
      }
    ], 3)).toEqual({
      receiptTickets: 1,
      totalPackages: 3,
      totalWeightKg: 25,
      totalCbm: 0.08,
      waitingDispatchTickets: 3,
      pendingTallyTickets: 1,
      exceptionTickets: 1
    });
  });

  it('keeps fallback ticket grouping and two-decimal rounding deterministic', () => {
    expect(summarizeWarehouseInStockTotals([
      {
        customerOrderNo: 'C002-1',
        domesticTrackingNo: 'SF100',
        packageCount: 1,
        weightKg: 1.005,
        cbm: 0.015,
        status: 'TALLIED_ARCHIVED',
        exceptions: ['超长']
      },
      {
        customerOrderNo: 'C003-1',
        domesticTrackingNo: 'SF200',
        packageCount: 0,
        weightKg: null,
        cbm: null,
        status: 'RECEIVED',
        exceptions: []
      }
    ], 0)).toEqual({
      receiptTickets: 2,
      totalPackages: 1,
      totalWeightKg: 1,
      totalCbm: 0.02,
      waitingDispatchTickets: 0,
      pendingTallyTickets: 1,
      exceptionTickets: 1
    });
  });
});

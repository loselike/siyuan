export interface WarehouseInStockTotalsRow {
  combinedOrderNo?: string | null;
  customerOrderNo?: string | null;
  domesticTrackingNo?: string | null;
  packageCount?: number | null;
  weightKg?: number | null;
  cbm?: number | null;
  status?: string | null;
  tallyCompleted?: boolean | null;
  manualException?: unknown;
  exceptions?: readonly unknown[] | null;
}

export interface WarehouseInStockTotals {
  receiptTickets: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
  waitingDispatchTickets: number;
  pendingTallyTickets: number;
  exceptionTickets: number;
}

export function summarizeWarehouseInStockTotals(
  rows: readonly WarehouseInStockTotalsRow[],
  waitingDispatchTickets: number,
  ticketKey: (row: WarehouseInStockTotalsRow) => string = defaultWarehouseTicketKey
): WarehouseInStockTotals {
  const grouped = new Map<string, WarehouseInStockTotalsRow[]>();
  rows.forEach((row) => {
    const key = ticketKey(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });

  return {
    receiptTickets: grouped.size,
    totalPackages: rows.reduce((sum, row) => sum + Number(row.packageCount ?? 0), 0),
    totalWeightKg: roundWarehouseTotal(rows.reduce(
      (sum, row) => sum + Number(row.weightKg ?? 0) * Number(row.packageCount ?? 0),
      0
    )),
    totalCbm: roundWarehouseTotal(rows.reduce((sum, row) => sum + Number(row.cbm ?? 0), 0)),
    waitingDispatchTickets,
    pendingTallyTickets: Array.from(grouped.values()).filter((items) =>
      items.some((item) => item.status === 'RECEIVED' && item.tallyCompleted !== true)
    ).length,
    exceptionTickets: Array.from(grouped.values()).filter((items) =>
      items.some((item) => item.manualException || (Array.isArray(item.exceptions) && item.exceptions.length))
    ).length
  };
}

function defaultWarehouseTicketKey(row: WarehouseInStockTotalsRow): string {
  return row.combinedOrderNo || `${row.customerOrderNo}-${row.domesticTrackingNo}`;
}

function roundWarehouseTotal(value: number): number {
  return Math.round(value * 100) / 100;
}

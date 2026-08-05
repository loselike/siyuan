import type {
  WarehouseInStockQuery,
  WarehouseInStockResponse,
  WarehouseManualReceiptCustomerOption,
  WarehousePackageSummary,
  WarehouseTallyTaskListQuery,
  WarehouseTallyTaskSummary,
  WarehouseTodayQuery,
  WarehouseTodayResponse
} from '@siyuan/shared';

export type WarehouseQueryRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export class WarehouseQueryClient {
  constructor(private readonly request: WarehouseQueryRequest) {}

  warehousePackages(): Promise<WarehousePackageSummary[]> {
    return this.request('/warehouse/packages');
  }

  warehouseManualReceiptCustomers(): Promise<WarehouseManualReceiptCustomerOption[]> {
    return this.request('/warehouse/manual-receipt/customers');
  }

  warehouseTodayReceipts(query: WarehouseTodayQuery = {}): Promise<WarehouseTodayResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/today-receipts${search ? `?${search}` : ''}`);
  }

  warehouseInStock(query: WarehouseInStockQuery = {}): Promise<WarehouseInStockResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/in-stock${search ? `?${search}` : ''}`);
  }

  warehouseInStockSummary(): Promise<Pick<WarehouseInStockResponse, 'totals'>> {
    return this.request('/warehouse/in-stock-summary');
  }

  warehouseTallyTasks(query: WarehouseTallyTaskListQuery = {}): Promise<WarehouseTallyTaskSummary[]> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/warehouse/tally-tasks${search ? `?${search}` : ''}`);
  }

  warehouseTallyTaskSourcePackages(id: string): Promise<WarehousePackageSummary[]> {
    return this.request(`/warehouse/tally-tasks/${encodeURIComponent(id)}/source-packages`);
  }

  warehouseTallyTaskOutputPackages(id: string): Promise<WarehousePackageSummary[]> {
    return this.request(`/warehouse/tally-tasks/${id}/output-packages`);
  }

  warehouseTallyTaskHistoryChain(packageId: string): Promise<WarehouseTallyTaskSummary[]> {
    return this.request(`/warehouse/tally-task-history-chain?packageId=${encodeURIComponent(packageId)}`);
  }
}

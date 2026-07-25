import type {
  WarehouseInStockQuery,
  WarehouseInStockResponse,
  WarehouseManualReceiptCustomerOption,
  WarehousePackageSummary,
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
}

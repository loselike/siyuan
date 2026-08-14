import type {
  CustomerSourceInput,
  CustomerSourceListQuery,
  CustomerSourceListResponse,
  CustomerSourceSummary
} from '@siyuan/shared/customer-source';

export interface CustomerSourceClient {
  customerSources(query?: CustomerSourceListQuery): Promise<CustomerSourceListResponse>;
  createCustomerSource(input: CustomerSourceInput): Promise<CustomerSourceSummary>;
  updateCustomerSource(id: string, input: Partial<CustomerSourceInput>): Promise<CustomerSourceSummary>;
  deleteCustomerSource(id: string): Promise<{ id: string; deleted: boolean }>;
}

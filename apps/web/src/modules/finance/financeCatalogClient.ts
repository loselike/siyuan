import type {
  FinanceCatalogItemInput,
  FinanceCatalogItemSummary,
  FinanceCatalogListQuery,
  FinanceCatalogListResponse,
  FinanceCatalogReorderInput
} from '@siyuan/shared/finance-catalog';

export interface FinanceCatalogClient {
  financeCatalog(query?: FinanceCatalogListQuery): Promise<FinanceCatalogListResponse>;
  createFinanceCatalogItem(input: FinanceCatalogItemInput): Promise<FinanceCatalogItemSummary>;
  updateFinanceCatalogItem(id: string, input: Partial<FinanceCatalogItemInput>): Promise<FinanceCatalogItemSummary>;
  disableFinanceCatalogItem(id: string): Promise<FinanceCatalogItemSummary>;
  deleteFinanceCatalogItem(id: string): Promise<{ id: string; deleted: boolean }>;
  reorderFinanceCatalogItems(input: FinanceCatalogReorderInput): Promise<FinanceCatalogListResponse>;
}

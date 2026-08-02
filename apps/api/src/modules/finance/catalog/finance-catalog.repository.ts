import type { FinanceCatalogCategory, FinanceCatalogListQuery } from '@siyuan/shared/finance-catalog';
import { mapFinanceCatalogItem, type FinanceCatalogRow } from './finance-catalog.types.js';

export const FINANCE_CATALOG_REPOSITORY = 'FINANCE_CATALOG_REPOSITORY';

export type FinanceCatalogCreateData = {
  category: FinanceCatalogCategory;
  sortOrder?: number;
  name: string;
  currency?: string | null;
  remark?: string | null;
  enabled?: boolean;
};

export type FinanceCatalogUpdateData = Partial<Omit<FinanceCatalogCreateData, 'category'>>;

export interface FinanceCatalogRepository {
  ensureDefaults(): Promise<void>;
  normalizeCurrencies(): Promise<void>;
  findMany(query: FinanceCatalogListQuery): Promise<FinanceCatalogRow[]>;
  findById(id: string): Promise<FinanceCatalogRow | null>;
  findEnabledByName(category: FinanceCatalogCategory, name: string, excludeId?: string): Promise<FinanceCatalogRow | null>;
  nextSortOrder(category: FinanceCatalogCategory): Promise<number>;
  create(data: FinanceCatalogCreateData): Promise<FinanceCatalogRow>;
  update(id: string, data: FinanceCatalogUpdateData): Promise<FinanceCatalogRow>;
  delete(id: string): Promise<FinanceCatalogRow>;
  reorder(category: FinanceCatalogCategory, orderedIds: string[]): Promise<{ before: FinanceCatalogRow[]; after: FinanceCatalogRow[] }>;
}

export function mapFinanceCatalogRows(rows: FinanceCatalogRow[]) {
  return rows.map(mapFinanceCatalogItem);
}

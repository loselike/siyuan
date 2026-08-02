import { Injectable } from '@nestjs/common';
import type { FinanceCatalogCategory, FinanceCatalogListQuery } from '@siyuan/shared/finance-catalog';
import type {
  FinanceCatalogCreateData,
  FinanceCatalogRepository,
  FinanceCatalogUpdateData
} from './finance-catalog.repository.js';
import { normalizeDefaultFinanceCatalogItems, type FinanceCatalogRow } from './finance-catalog.types.js';

@Injectable()
export class InMemoryFinanceCatalogRepository implements FinanceCatalogRepository {
  private items: FinanceCatalogRow[] = normalizeDefaultFinanceCatalogItems().map((item, index) => ({
    id: `catalog-${index + 1}`,
    ...item,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  async ensureDefaults() {
    if (this.items.length > 0) return;
    this.items = normalizeDefaultFinanceCatalogItems().map((item, index) => ({
      id: `catalog-${index + 1}`,
      ...item,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  async normalizeCurrencies() {
    this.items = this.items.map((item) => (item.currency === 'CNY' ? { ...item, currency: 'RMB' } : item));
  }

  async findMany(query: FinanceCatalogListQuery) {
    const keyword = query.keyword?.trim();
    return this.items
      .filter((item) => (query.category ? item.category === query.category : true))
      .filter((item) => (query.enabledOnly ? item.enabled : true))
      .filter((item) => (keyword ? item.name.includes(keyword) || (item.remark ?? '').includes(keyword) : true))
      .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder);
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findEnabledByName(category: FinanceCatalogCategory, name: string, excludeId?: string) {
    return this.items.find((item) => item.category === category && item.name === name && item.enabled && item.id !== excludeId) ?? null;
  }

  async nextSortOrder(category: FinanceCatalogCategory) {
    return Math.max(0, ...this.items.filter((item) => item.category === category).map((item) => item.sortOrder)) + 1;
  }

  async create(data: FinanceCatalogCreateData) {
    const now = new Date();
    const row: FinanceCatalogRow = {
      id: `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      enabled: data.enabled !== false,
      sortOrder: data.sortOrder ?? (await this.nextSortOrder(data.category)),
      currency: data.currency ?? null,
      remark: data.remark ?? null,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    this.items.push(row);
    return row;
  }

  async update(id: string, data: FinanceCatalogUpdateData) {
    const current = await this.findById(id);
    if (!current) throw new Error('finance catalog row not found');
    const next = { ...current, ...data, updatedAt: new Date() };
    this.items = this.items.map((item) => (item.id === id ? next : item));
    return next;
  }

  async delete(id: string) {
    const current = await this.findById(id);
    if (!current) throw new Error('finance catalog row not found');
    this.items = this.items.filter((item) => item.id !== id);
    return current;
  }

  async reorder(category: FinanceCatalogCategory, orderedIds: string[]) {
    const before = await this.findMany({ category });
    const rowById = new Map(before.map((row) => [row.id, row]));
    const orderedRows = [
      ...orderedIds.map((id) => rowById.get(id)).filter(Boolean),
      ...before.filter((row) => !orderedIds.includes(row.id))
    ] as FinanceCatalogRow[];
    orderedRows.forEach((row, index) => {
      row.sortOrder = index + 1;
      row.updatedAt = new Date();
    });
    const after = await this.findMany({ category });
    return { before, after };
  }
}

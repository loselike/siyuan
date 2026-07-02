import { Inject, Injectable } from '@nestjs/common';
import type { FinanceCatalogCategory, FinanceCatalogListQuery } from '@siyuan/shared';
import { PrismaService } from '../../prisma.service.js';
import { mapFinanceCatalogItem, normalizeDefaultFinanceCatalogItems, type FinanceCatalogRow } from './finance-catalog.types.js';

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
  reorder(category: FinanceCatalogCategory, orderedIds: string[]): Promise<{ before: FinanceCatalogRow[]; after: FinanceCatalogRow[] }>;
  writeAudit(input: { actorId: string; action: string; target: string; before?: unknown; after?: unknown }): Promise<void>;
}

@Injectable()
export class PrismaFinanceCatalogRepository implements FinanceCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    const count = await (this.prisma as any).financeCatalogItem.count();
    if (count > 0) return;
    await (this.prisma as any).financeCatalogItem.createMany({ data: normalizeDefaultFinanceCatalogItems() });
  }

  async normalizeCurrencies() {
    await (this.prisma as any).financeCatalogItem.updateMany({
      where: { currency: 'CNY' },
      data: { currency: 'RMB' }
    });
  }

  async findMany(query: FinanceCatalogListQuery) {
    const keyword = query.keyword?.trim();
    return (this.prisma as any).financeCatalogItem.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.enabledOnly ? { enabled: true } : {}),
        ...(keyword ? { OR: [{ name: { contains: keyword } }, { remark: { contains: keyword } }] } : {})
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
  }

  async findById(id: string) {
    return (this.prisma as any).financeCatalogItem.findUnique({ where: { id } });
  }

  async findEnabledByName(category: FinanceCatalogCategory, name: string, excludeId?: string) {
    return (this.prisma as any).financeCatalogItem.findFirst({
      where: {
        category,
        name,
        enabled: true,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });
  }

  async nextSortOrder(category: FinanceCatalogCategory) {
    const latest = await (this.prisma as any).financeCatalogItem.findFirst({
      where: { category },
      orderBy: { sortOrder: 'desc' }
    });
    return (latest?.sortOrder ?? 0) + 1;
  }

  async create(data: FinanceCatalogCreateData) {
    return (this.prisma as any).financeCatalogItem.create({ data });
  }

  async update(id: string, data: FinanceCatalogUpdateData) {
    return (this.prisma as any).financeCatalogItem.update({ where: { id }, data });
  }

  async reorder(category: FinanceCatalogCategory, orderedIds: string[]) {
    const rows = await (this.prisma as any).financeCatalogItem.findMany({
      where: { category },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
    const rowById = new Map(rows.map((row: FinanceCatalogRow) => [row.id, row]));
    const orderedRows = [
      ...orderedIds.map((id) => rowById.get(id)).filter(Boolean),
      ...rows.filter((row: FinanceCatalogRow) => !orderedIds.includes(row.id))
    ] as FinanceCatalogRow[];
    await this.prisma.$transaction(
      orderedRows.map((row, index) =>
        (this.prisma as any).financeCatalogItem.update({
          where: { id: row.id },
          data: { sortOrder: index + 1 }
        })
      )
    );
    const refreshed = await (this.prisma as any).financeCatalogItem.findMany({
      where: { category },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
    return { before: rows, after: refreshed };
  }

  async writeAudit(input: { actorId: string; action: string; target: string; before?: unknown; after?: unknown }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        target: input.target,
        before: input.before === undefined ? undefined : (input.before as any),
        after: input.after === undefined ? undefined : (input.after as any)
      }
    });
  }
}

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

  async writeAudit() {
    return;
  }
}

export function mapFinanceCatalogRows(rows: FinanceCatalogRow[]) {
  return rows.map(mapFinanceCatalogItem);
}

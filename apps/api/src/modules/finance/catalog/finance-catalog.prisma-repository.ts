import { Injectable } from '@nestjs/common';
import type { FinanceCatalogCategory, FinanceCatalogListQuery } from '@siyuan/shared/finance-catalog';
import { PrismaService } from '../../prisma.service.js';
import type {
  FinanceCatalogCreateData,
  FinanceCatalogRepository,
  FinanceCatalogUpdateData
} from './finance-catalog.repository.js';
import { normalizeDefaultFinanceCatalogItems, type FinanceCatalogRow } from './finance-catalog.types.js';

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

  async delete(id: string) {
    return (this.prisma as any).financeCatalogItem.delete({ where: { id } });
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
}

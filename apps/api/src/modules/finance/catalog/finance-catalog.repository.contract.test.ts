import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryFinanceCatalogRepository } from './finance-catalog.in-memory-repository.js';
import { PrismaFinanceCatalogRepository } from './finance-catalog.prisma-repository.js';
import type { FinanceCatalogRepository } from './finance-catalog.repository.js';
import type { FinanceCatalogRow } from './finance-catalog.types.js';

function createFakePrisma() {
  let nextId = 1;
  let rows: FinanceCatalogRow[] = [];
  const matches = (row: FinanceCatalogRow, where: Record<string, any> = {}) => {
    if (where.category && row.category !== where.category) return false;
    if (where.name && row.name !== where.name) return false;
    if (where.enabled !== undefined && row.enabled !== where.enabled) return false;
    if (where.id?.not && row.id === where.id.not) return false;
    if (where.OR && !where.OR.some((condition: Record<string, any>) => (
      condition.name?.contains ? row.name.includes(condition.name.contains) : (row.remark ?? '').includes(condition.remark?.contains ?? '')
    ))) return false;
    return true;
  };
  const sorted = (items: FinanceCatalogRow[], orderBy?: Array<Record<string, 'asc' | 'desc'>>) => [...items].sort((left, right) => {
    for (const order of orderBy ?? []) {
      const [key, direction] = Object.entries(order)[0] as [keyof FinanceCatalogRow, 'asc' | 'desc'];
      const result = String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'zh-Hans-CN', { numeric: true });
      if (result) return direction === 'desc' ? -result : result;
    }
    return 0;
  });
  const financeCatalogItem = {
    count: async () => rows.length,
    createMany: async ({ data }: { data: FinanceCatalogRow[] }) => {
      rows = data.map((row) => ({ ...row, id: `default-${nextId++}`, createdAt: new Date(), updatedAt: new Date() }));
    },
    updateMany: async ({ where, data }: { where: Record<string, any>; data: Partial<FinanceCatalogRow> }) => {
      rows = rows.map((row) => (matches(row, where) ? { ...row, ...data } : row));
    },
    findMany: async ({ where = {}, orderBy }: { where?: Record<string, any>; orderBy?: Array<Record<string, 'asc' | 'desc'>> }) => (
      sorted(rows.filter((row) => matches(row, where)), orderBy)
    ),
    findUnique: async ({ where }: { where: { id: string } }) => rows.find((row) => row.id === where.id) ?? null,
    findFirst: async ({ where = {}, orderBy }: { where?: Record<string, any>; orderBy?: Record<string, 'asc' | 'desc'> }) => (
      sorted(rows.filter((row) => matches(row, where)), orderBy ? [orderBy] : undefined)[0] ?? null
    ),
    create: async ({ data }: { data: Omit<FinanceCatalogRow, 'id'> }) => {
      const row = { id: `created-${nextId++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<FinanceCatalogRow> }) => {
      const current = rows.find((row) => row.id === where.id);
      if (!current) throw new Error('finance catalog row not found');
      const next = { ...current, ...data, updatedAt: new Date() };
      rows = rows.map((row) => (row.id === where.id ? next : row));
      return next;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const current = rows.find((row) => row.id === where.id);
      if (!current) throw new Error('finance catalog row not found');
      rows = rows.filter((row) => row.id !== where.id);
      return current;
    }
  };
  return {
    financeCatalogItem,
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations)
  };
}

function repositoryContract(name: string, createRepository: () => FinanceCatalogRepository) {
  describe(name, () => {
    let repository: FinanceCatalogRepository;

    beforeEach(async () => {
      repository = createRepository();
      await repository.ensureDefaults();
    });

    it('creates the same defaults and applies the same list filters', async () => {
      await repository.normalizeCurrencies();

      const feeNames = await repository.findMany({ category: 'FEE_NAME', keyword: '运费', enabledOnly: true });
      expect(feeNames.map((row) => row.name)).toEqual(expect.arrayContaining(['运费', '基础运费', '客户运费', '代理运费']));
      expect(feeNames.every((row) => row.category === 'FEE_NAME' && row.enabled)).toBe(true);
    });

    it('keeps create, lookup, update, reorder and delete semantics aligned', async () => {
      const first = await repository.create({ category: 'PRODUCT_NAME', name: '产品甲', sortOrder: 1, enabled: true });
      const second = await repository.create({ category: 'PRODUCT_NAME', name: '产品乙', sortOrder: 2, enabled: true });

      expect(await repository.findEnabledByName('PRODUCT_NAME', '产品甲')).toMatchObject({ id: first.id });
      expect(await repository.nextSortOrder('PRODUCT_NAME')).toBe(3);
      await repository.update(first.id, { name: '产品甲改', enabled: false });
      expect(await repository.findById(first.id)).toMatchObject({ name: '产品甲改', enabled: false });

      const reordered = await repository.reorder('PRODUCT_NAME', [second.id, first.id]);
      expect(reordered.after.slice(0, 2).map((row) => row.id)).toEqual([second.id, first.id]);
      expect(reordered.after.map((row) => row.sortOrder)).toEqual([1, 2, 3, 4]);

      expect(await repository.delete(first.id)).toMatchObject({ id: first.id });
      expect(await repository.findById(first.id)).toBeNull();
    });
  });
}

repositoryContract('InMemoryFinanceCatalogRepository contract', () => new InMemoryFinanceCatalogRepository());
repositoryContract('PrismaFinanceCatalogRepository contract', () => (
  new PrismaFinanceCatalogRepository(createFakePrisma() as never)
));

import { BadRequestException } from '@nestjs/common';
import {
  defaultFinanceCatalogItems,
  type FinanceCatalogCategory,
  type FinanceCatalogItemInput,
  type FinanceCatalogItemSummary
} from '@siyuan/shared';

export type FinanceCatalogRow = {
  id: string;
  category: string;
  sortOrder: number;
  name: string;
  currency?: string | null;
  remark?: string | null;
  enabled: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export const financeCatalogCategories: FinanceCatalogCategory[] = ['FEE_NAME', 'SETTLEMENT_METHOD', 'CARGO_TYPE'];
const financeCatalogCurrencies = ['RMB', 'USD', 'HKD'];

export function normalizeFinanceCurrency(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  return normalized === 'CNY' ? 'RMB' : normalized;
}

export function normalizeFinanceCatalogInput(input: Partial<FinanceCatalogItemInput>, options: { requireCategory: boolean; requireName: boolean }) {
  const data: Record<string, unknown> = {};
  if (input.category !== undefined) {
    if (!financeCatalogCategories.includes(input.category)) {
      throw new BadRequestException('财务资料库分类不正确');
    }
    data.category = input.category;
  } else if (options.requireCategory) {
    throw new BadRequestException('财务资料库分类不能为空');
  }

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('名称不能为空');
    }
    data.name = name;
  } else if (options.requireName) {
    throw new BadRequestException('名称不能为空');
  }

  if (input.sortOrder !== undefined) {
    data.sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;
  }
  if (input.currency !== undefined) {
    const currency = normalizeFinanceCurrency(input.currency);
    if (currency && !financeCatalogCurrencies.includes(currency)) {
      throw new BadRequestException('币种只支持 RMB、USD、HKD');
    }
    data.currency = currency;
  }
  if (input.remark !== undefined) {
    data.remark = input.remark?.trim() || null;
  }
  if (input.enabled !== undefined) {
    data.enabled = input.enabled !== false;
  }
  return data;
}

export function mapFinanceCatalogItem(row: FinanceCatalogRow): FinanceCatalogItemSummary {
  return {
    id: row.id,
    category: row.category as FinanceCatalogCategory,
    sortOrder: row.sortOrder,
    name: row.name,
    currency: normalizeFinanceCurrency(row.currency) ?? undefined,
    remark: row.remark ?? undefined,
    enabled: row.enabled,
    createdAt: formatCatalogDate(row.createdAt),
    updatedAt: formatCatalogDate(row.updatedAt)
  };
}

export function normalizeDefaultFinanceCatalogItems() {
  return defaultFinanceCatalogItems.map((item) => ({
    category: item.category,
    sortOrder: item.sortOrder,
    name: item.name,
    currency: normalizeFinanceCurrency(item.currency),
    remark: item.remark ?? null,
    enabled: item.enabled
  }));
}

export function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function formatCatalogDate(value?: Date | string | null) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  FinanceCatalogCategory,
  FinanceCatalogItemInput,
  FinanceCatalogListQuery,
  FinanceCatalogListResponse,
  FinanceCatalogReorderInput
} from '@siyuan/shared';
import type { Principal } from '../../rbac.js';
import {
  FINANCE_CATALOG_REPOSITORY,
  mapFinanceCatalogRows,
  type FinanceCatalogCreateData,
  type FinanceCatalogRepository
} from './finance-catalog.repository.js';
import {
  financeCatalogCategories,
  mapFinanceCatalogItem,
  normalizeFinanceCatalogInput,
  toAuditJson
} from './finance-catalog.types.js';

@Injectable()
export class FinanceCatalogService {
  constructor(@Inject(FINANCE_CATALOG_REPOSITORY) private readonly repository: FinanceCatalogRepository) {}

  async list(queryOrCategory?: FinanceCatalogListQuery | FinanceCatalogCategory): Promise<FinanceCatalogListResponse> {
    const query: FinanceCatalogListQuery = typeof queryOrCategory === 'string' ? { category: queryOrCategory } : queryOrCategory ?? {};
    if (query.category && !financeCatalogCategories.includes(query.category)) {
      throw new BadRequestException('财务资料库分类不正确');
    }
    await this.repository.ensureDefaults();
    await this.repository.normalizeCurrencies();
    const rows = await this.repository.findMany(query);
    return { items: mapFinanceCatalogRows(rows) };
  }

  async create(principal: Principal, input: FinanceCatalogItemInput) {
    this.ensureManageAccess(principal);
    const data = normalizeFinanceCatalogInput(input, { requireCategory: true, requireName: true });
    const category = data.category as FinanceCatalogCategory;
    const name = data.name as string;
    await this.ensureUniqueName(category, name);
    if (data.sortOrder === undefined || data.sortOrder === 0) {
      data.sortOrder = await this.repository.nextSortOrder(category);
    }
    if (category === 'SETTLEMENT_METHOD' && !data.currency) {
      data.currency = 'RMB';
    }
    const row = await this.repository.create(data as FinanceCatalogCreateData);
    const summary = mapFinanceCatalogItem(row);
    await this.repository.writeAudit({
      actorId: principal.id,
      action: 'finance.catalog.create',
      target: `financeCatalogItem:${row.id}`,
      after: toAuditJson(summary)
    });
    return summary;
  }

  async update(principal: Principal, id: string, input: Partial<FinanceCatalogItemInput>) {
    this.ensureManageAccess(principal);
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('财务资料不存在');
    }
    const data = normalizeFinanceCatalogInput(input, { requireCategory: false, requireName: false });
    delete data.category;
    const nextName = (data.name as string | undefined) ?? current.name;
    const nextEnabled = (data.enabled as boolean | undefined) ?? current.enabled;
    if (nextEnabled) {
      await this.ensureUniqueName(current.category as FinanceCatalogCategory, nextName, id);
    }
    if (current.category === 'SETTLEMENT_METHOD' && input.currency !== undefined && !data.currency) {
      throw new BadRequestException('结算方式必须配置默认币种');
    }
    const row = await this.repository.update(id, data);
    const summary = mapFinanceCatalogItem(row);
    const enabledChanged = input.enabled !== undefined && input.enabled !== current.enabled;
    await this.repository.writeAudit({
      actorId: principal.id,
      action: enabledChanged ? (summary.enabled ? 'finance.catalog.enable' : 'finance.catalog.disable') : 'finance.catalog.update',
      target: `financeCatalogItem:${id}`,
      before: toAuditJson(mapFinanceCatalogItem(current)),
      after: toAuditJson(summary)
    });
    return summary;
  }

  async disable(principal: Principal, id: string) {
    this.ensureManageAccess(principal);
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('财务资料不存在');
    }
    const row = await this.repository.update(id, { enabled: false });
    const summary = mapFinanceCatalogItem(row);
    await this.repository.writeAudit({
      actorId: principal.id,
      action: 'finance.catalog.disable',
      target: `financeCatalogItem:${id}`,
      before: toAuditJson(mapFinanceCatalogItem(current)),
      after: toAuditJson(summary)
    });
    return summary;
  }

  async reorder(principal: Principal, input: FinanceCatalogReorderInput): Promise<FinanceCatalogListResponse> {
    this.ensureManageAccess(principal);
    if (!financeCatalogCategories.includes(input.category)) {
      throw new BadRequestException('财务资料库分类不正确');
    }
    if (!Array.isArray(input.orderedIds) || input.orderedIds.length === 0) {
      throw new BadRequestException('排序列表不能为空');
    }
    await this.repository.ensureDefaults();
    const rows = await this.repository.findMany({ category: input.category });
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const unknownId = input.orderedIds.find((id) => !rowById.has(id));
    if (unknownId) {
      throw new BadRequestException('排序列表包含不属于该分类的资料');
    }
    const result = await this.repository.reorder(input.category, input.orderedIds);
    await this.repository.writeAudit({
      actorId: principal.id,
      action: 'finance.catalog.reorder',
      target: `financeCatalogCategory:${input.category}`,
      before: toAuditJson(mapFinanceCatalogRows(result.before)),
      after: toAuditJson(mapFinanceCatalogRows(result.after))
    });
    return { items: mapFinanceCatalogRows(result.after) };
  }

  private ensureManageAccess(principal: Principal) {
    if (principal.role === 'ADMIN' || principal.role === 'FINANCE') return;
    throw new ForbiddenException('当前角色不能维护该类单票费用');
  }

  private async ensureUniqueName(category: FinanceCatalogCategory, name: string, excludeId?: string) {
    const existing = await this.repository.findEnabledByName(category, name, excludeId);
    if (existing) {
      throw new BadRequestException('同一分类下已存在启用中的同名资料');
    }
  }
}

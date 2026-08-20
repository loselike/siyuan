import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  FinanceCatalogCategory,
  FinanceCatalogItemInput,
  FinanceCatalogListQuery,
  FinanceCatalogListResponse,
  FinanceCatalogReorderInput
} from '@siyuan/shared/finance-catalog';
import type { PermissionKey, Principal } from '../../rbac.js';
import {
  FINANCE_CATALOG_AUTHORIZER,
  type FinanceCatalogAuthorizer
} from './finance-catalog.authorization.js';
import {
  FINANCE_CATALOG_AUDIT_WRITER,
  type FinanceCatalogAuditWriter
} from './finance-catalog.audit.js';
import {
  FINANCE_CATALOG_REPOSITORY,
  mapFinanceCatalogRows,
  type FinanceCatalogCreateData,
  type FinanceCatalogRepository
} from './finance-catalog.repository.js';
import {
  financeCatalogCategories,
  FinanceCatalogInputError,
  mapFinanceCatalogItem,
  normalizeFinanceCatalogInput,
  toAuditJson
} from './finance-catalog.types.js';

@Injectable()
export class FinanceCatalogService {
  constructor(
    @Inject(FINANCE_CATALOG_REPOSITORY) private readonly repository: FinanceCatalogRepository,
    @Inject(FINANCE_CATALOG_AUDIT_WRITER) private readonly auditWriter: FinanceCatalogAuditWriter,
    @Inject(FINANCE_CATALOG_AUTHORIZER) private readonly authorizer: FinanceCatalogAuthorizer
  ) {}

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
    return this.createWithPermissions(principal, input);
  }

  async createProductName(
    principal: Principal,
    input: Pick<FinanceCatalogItemInput, 'name' | 'enabled' | 'remark'>
  ) {
    return this.createWithPermissions(principal, { ...input, category: 'PRODUCT_NAME' }, [
      'business:order-entry:edit',
      'business:order-entry:create',
      'business:order-entry:draft-edit'
    ]);
  }

  private async createWithPermissions(
    principal: Principal,
    input: FinanceCatalogItemInput,
    additionalPermissions: PermissionKey[] = []
  ) {
    const data = this.normalizeInput(input, { requireCategory: true, requireName: true });
    const category = data.category as FinanceCatalogCategory;
    await this.ensureWritePermission(principal, category, 'create', additionalPermissions);
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
    await this.auditWriter.write({
      actorId: principal.id,
      principal,
      action: 'finance.catalog.create',
      target: `financeCatalogItem:${row.id}`,
      after: toAuditJson(summary)
    });
    return summary;
  }

  async update(principal: Principal, id: string, input: Partial<FinanceCatalogItemInput>) {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('财务资料不存在');
    }
    await this.ensureWritePermission(principal, current.category as FinanceCatalogCategory, 'update');
    const data = this.normalizeInput(input, { requireCategory: false, requireName: false });
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
    await this.auditWriter.write({
      actorId: principal.id,
      principal,
      action: enabledChanged ? (summary.enabled ? 'finance.catalog.enable' : 'finance.catalog.disable') : 'finance.catalog.update',
      target: `financeCatalogItem:${id}`,
      before: toAuditJson(mapFinanceCatalogItem(current)),
      after: toAuditJson(summary)
    });
    return summary;
  }

  async disable(principal: Principal, id: string) {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('财务资料不存在');
    }
    await this.ensureWritePermission(principal, current.category as FinanceCatalogCategory, 'update');
    const row = await this.repository.update(id, { enabled: false });
    const summary = mapFinanceCatalogItem(row);
    await this.auditWriter.write({
      actorId: principal.id,
      principal,
      action: 'finance.catalog.disable',
      target: `financeCatalogItem:${id}`,
      before: toAuditJson(mapFinanceCatalogItem(current)),
      after: toAuditJson(summary)
    });
    return summary;
  }

  async delete(principal: Principal, id: string) {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('财务资料不存在');
    }
    await this.ensureWritePermission(principal, current.category as FinanceCatalogCategory, 'delete');
    const deleted = await this.repository.delete(id);
    const summary = mapFinanceCatalogItem(deleted);
    await this.auditWriter.write({
      actorId: principal.id,
      principal,
      action: 'finance.catalog.delete',
      target: `financeCatalogItem:${id}`,
      before: toAuditJson(summary)
    });
    return { id, deleted: true };
  }

  async reorder(principal: Principal, input: FinanceCatalogReorderInput): Promise<FinanceCatalogListResponse> {
    if (!financeCatalogCategories.includes(input.category)) {
      throw new BadRequestException('财务资料库分类不正确');
    }
    await this.ensureWritePermission(principal, input.category, 'reorder');
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
    await this.auditWriter.write({
      actorId: principal.id,
      principal,
      action: 'finance.catalog.reorder',
      target: `financeCatalogCategory:${input.category}`,
      before: toAuditJson(mapFinanceCatalogRows(result.before)),
      after: toAuditJson(mapFinanceCatalogRows(result.after))
    });
    return { items: mapFinanceCatalogRows(result.after) };
  }

  private async ensureUniqueName(category: FinanceCatalogCategory, name: string, excludeId?: string) {
    const existing = await this.repository.findEnabledByName(category, name, excludeId);
    if (existing) {
      throw new BadRequestException('同一分类下已存在启用中的同名资料');
    }
  }

  private async ensureWritePermission(
    principal: Principal,
    category: FinanceCatalogCategory,
    action: 'create' | 'update' | 'delete' | 'reorder',
    additionalPermissions: PermissionKey[] = []
  ) {
    const permission = financeCatalogWritePermission(category, action);
    if (await this.authorizer.hasPermission(principal.role, permission)) return;
    for (const additionalPermission of additionalPermissions) {
      if (await this.authorizer.hasPermission(principal.role, additionalPermission)) return;
    }
    await this.authorizer.recordPermissionDenied(principal, {
      permissions: [permission, ...additionalPermissions],
      method: 'SERVER',
      path: `finance/catalog/${category.toLowerCase()}/${action}`
    }).catch(() => undefined);
    throw new ForbiddenException('没有维护该类财务资料的权限');
  }

  private normalizeInput(
    input: Partial<FinanceCatalogItemInput>,
    options: { requireCategory: boolean; requireName: boolean }
  ) {
    try {
      return normalizeFinanceCatalogInput(input, options);
    } catch (error) {
      if (error instanceof FinanceCatalogInputError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}

function financeCatalogWritePermission(
  category: FinanceCatalogCategory,
  action: 'create' | 'update' | 'delete' | 'reorder'
): PermissionKey {
  if (category === 'FEE_NAME') {
    return `master-data:finance:fee-name:${action}` as PermissionKey;
  }
  const section = category === 'SETTLEMENT_METHOD'
    ? 'settlement'
    : category === 'CARGO_TYPE'
      ? 'cargo-type'
      : 'product-name';
  const effectiveAction = action === 'reorder' ? 'update' : action;
  return `master-data:finance:${section}:${effectiveAction}` as PermissionKey;
}

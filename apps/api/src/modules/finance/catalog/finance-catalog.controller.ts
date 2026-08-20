import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import type {
  FinanceCatalogCategory,
  FinanceCatalogItemInput,
  FinanceCatalogListQuery,
  FinanceCatalogReorderInput
} from '@siyuan/shared/finance-catalog';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { FinanceCatalogService } from './finance-catalog.service.js';

@Controller()
export class FinanceCatalogController {
  constructor(@Inject(FinanceCatalogService) private readonly service: FinanceCatalogService) {}

  @Get('finance/catalog')
  @RequirePermission(['finance:dashboard:view', 'master-data:finance:read'])
  async financeCatalogItems(
    @Query('category') category?: FinanceCatalogCategory,
    @Query('keyword') keyword?: string,
    @Query('enabledOnly') enabledOnly?: string
  ) {
    const query: FinanceCatalogListQuery = {
      category,
      keyword,
      enabledOnly: enabledOnly === 'true'
    };
    return this.service.list(query);
  }

  @Post('finance/catalog')
  @RequirePermission([
    'master-data:finance:fee-name:create',
    'master-data:finance:settlement:create',
    'master-data:finance:cargo-type:create',
    'master-data:finance:product-name:create'
  ])
  async createFinanceCatalogItem(@Req() request: { user: Principal }, @Body() body: FinanceCatalogItemInput) {
    return this.service.create(request.user, body);
  }

  @Post('finance/catalog/product-name')
  @RequirePermission([
    'master-data:finance:product-name:create',
    'business:order-entry:edit',
    'business:order-entry:create',
    'business:order-entry:draft-edit'
  ])
  async createFinanceProductName(
    @Req() request: { user: Principal },
    @Body() body: Pick<FinanceCatalogItemInput, 'name' | 'enabled' | 'remark'>
  ) {
    return this.service.createProductName(request.user, body);
  }

  @Put('finance/catalog/reorder')
  @RequirePermission(['master-data:finance:fee-name:reorder'])
  async reorderFinanceCatalogItems(@Req() request: { user: Principal }, @Body() body: FinanceCatalogReorderInput) {
    return this.service.reorder(request.user, body);
  }

  @Put('finance/catalog/:id')
  @RequirePermission([
    'master-data:finance:fee-name:update',
    'master-data:finance:settlement:update',
    'master-data:finance:cargo-type:update',
    'master-data:finance:product-name:update'
  ])
  async updateFinanceCatalogItem(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: Partial<FinanceCatalogItemInput>) {
    return this.service.update(request.user, id, body);
  }

  @Delete('finance/catalog/:id')
  @RequirePermission([
    'master-data:finance:fee-name:delete',
    'master-data:finance:settlement:delete',
    'master-data:finance:cargo-type:delete',
    'master-data:finance:product-name:delete'
  ])
  async deleteFinanceCatalogItem(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.delete(request.user, id);
  }
}

import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import type {
  FinanceCatalogCategory,
  FinanceCatalogItemInput,
  FinanceCatalogListQuery,
  FinanceCatalogReorderInput
} from '@siyuan/shared';
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
  @RequirePermission(['finance:dashboard:view', 'master-data:finance:write'])
  async createFinanceCatalogItem(@Req() request: { user: Principal }, @Body() body: FinanceCatalogItemInput) {
    return this.service.create(request.user, body);
  }

  @Put('finance/catalog/reorder')
  @RequirePermission(['finance:dashboard:view', 'master-data:finance:write'])
  async reorderFinanceCatalogItems(@Req() request: { user: Principal }, @Body() body: FinanceCatalogReorderInput) {
    return this.service.reorder(request.user, body);
  }

  @Put('finance/catalog/:id')
  @RequirePermission(['finance:dashboard:view', 'master-data:finance:write'])
  async updateFinanceCatalogItem(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: Partial<FinanceCatalogItemInput>) {
    return this.service.update(request.user, id, body);
  }

  @Delete('finance/catalog/:id')
  @RequirePermission(['finance:dashboard:view', 'master-data:finance:write'])
  async deleteFinanceCatalogItem(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.delete(request.user, id);
  }
}

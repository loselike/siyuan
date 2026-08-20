import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { CustomerSourceInput, CustomerSourceListQuery } from '@siyuan/shared/customer-source';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { CustomerSourceService } from './customer-source.service.js';

@Controller('master-data/customer-sources')
export class CustomerSourceController {
  constructor(
    @Inject(CustomerSourceService)
    private readonly customerSources: CustomerSourceService
  ) {}

  @Get()
  @RequirePermission('master-data:customers:read')
  async list(
    @Req() request: { user: Principal },
    @Query('keyword') keyword?: string,
    @Query('enabledOnly') enabledOnly?: string
  ) {
    const query: CustomerSourceListQuery = { keyword, enabledOnly: enabledOnly === 'true' };
    return this.customerSources.list(request.user, query);
  }

  @Post()
  @RequirePermission('master-data:customers:create')
  async create(@Req() request: { user: Principal }, @Body() body: CustomerSourceInput) {
    return this.customerSources.create(request.user, body);
  }

  @Put(':id')
  @RequirePermission('master-data:customers:update')
  async update(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: Partial<CustomerSourceInput>
  ) {
    return this.customerSources.update(request.user, id, body);
  }

  @Delete(':id')
  @RequirePermission('master-data:customers:delete')
  async delete(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.customerSources.delete(request.user, id);
  }
}

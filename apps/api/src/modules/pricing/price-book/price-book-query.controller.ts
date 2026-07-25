import { BadRequestException, Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { LegacyPricingModule, PriceBookImportTargetModule } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';

@Controller()
export class PriceBookQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('pricing/books')
  @RequirePermission('pricing:price-books:list-view')
  priceBooks(
    @Req() request: { user: Principal },
    @Query('includeRows') includeRows?: string,
    @Query('targetModule') targetModule?: PriceBookImportTargetModule
  ) {
    if (includeRows === 'true') {
      throw new BadRequestException('价格表列表不支持返回完整明细，请使用分页线路接口');
    }
    return this.repository.getPriceBooks(request.user, false, targetModule);
  }

  @Get('pricing/sync-health')
  @RequirePermission('pricing:price-books:sync-health-view')
  pricingSyncHealth(
    @Req() request: { user: Principal },
    @Query() query: { page?: number; pageSize?: number; legacyModule?: LegacyPricingModule | 'unclassified' }
  ) {
    return this.repository.getPricingSyncHealth(request.user, query);
  }

  @Get('pricing/books/import-jobs/:id')
  @RequirePermission('pricing:price-books:import-job-view')
  priceBookImportJob(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.getPriceBookImportJob(request.user, id);
  }
}

import { BadRequestException, Controller, ForbiddenException, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { LegacyPricingModule, PriceBookImportJobListQuery, PriceBookImportTargetModule } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { PRICE_BOOK_QUERY_REPOSITORY, type PriceBookQueryRepository } from './price-book-query.repository.js';

@Controller()
export class PriceBookQueryController {
  constructor(
    @Inject(PrismaRepository) private readonly repository: PrismaRepository,
    @Inject(PRICE_BOOK_QUERY_REPOSITORY) private readonly priceBookQueries: PriceBookQueryRepository
  ) {}

  @Get('pricing/books')
  @RequirePermission(['pricing:price-books:view', 'pricing:price-books:import', 'pricing:price-books:export', 'pricing:price-books:update', 'pricing:price-books:delete', 'pricing:price-books:health'])
  priceBooks(
    @Req() request: { user: Principal },
    @Query('includeRows') includeRows?: string,
    @Query('targetModule') targetModule?: PriceBookImportTargetModule | 'unclassified'
  ) {
    if (includeRows === 'true') {
      throw new BadRequestException('价格表列表不支持返回完整明细，请使用分页线路接口');
    }
    return this.repository.getPriceBooks(request.user, false, targetModule);
  }

  @Get('pricing/sync-health')
  @RequirePermission('pricing:price-books:health')
  pricingSyncHealth(
    @Req() request: { user: Principal },
    @Query() query: { page?: number; pageSize?: number; legacyModule?: LegacyPricingModule | 'unclassified' }
  ) {
    return this.repository.getPricingSyncHealth(request.user, query);
  }

  @Get('pricing/books/import-jobs/:id')
  @RequirePermission('pricing:price-books:import')
  priceBookImportJob(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.priceBookQueries.getPriceBookImportJob(request.user, id);
  }

  @Get('pricing/books/import-jobs')
  @RequirePermission('pricing:price-books:import')
  priceBookImportJobs(@Req() request: { user: Principal }, @Query() query: PriceBookImportJobListQuery) {
    return this.priceBookQueries.getPriceBookImportJobs(request.user, query);
  }

  @Get('pricing/legacy/sources')
  @RequirePermission('pricing:price-books:view')
  legacyPricingSources(@Req() request: { user: Principal }, @Query('module') module?: LegacyPricingModule) {
    return this.repository.getLegacyPricingSources(request.user, module);
  }

  @Get('pricing/legacy/health-report')
  @RequirePermission('pricing:price-books:health')
  legacyPricingHealth(@Req() request: { user: Principal }, @Query('module') module?: LegacyPricingModule) {
    return this.repository.getLegacyPricingHealth(request.user, module);
  }

  @Get('pricing/legacy/quote-meta')
  @RequirePermission(['pricing:lookup:amazon', 'pricing:lookup:europe-oversize', 'pricing:lookup:europe-express', 'pricing:lookup:south-africa', 'pricing:lookup:usa-air-sea', 'pricing:lookup:canada-air-sea', 'pricing:lookup:dubai-air-sea'])
  async legacyPricingMeta(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
    }
    return this.repository.getLegacyPricingMeta(request.user);
  }

  @Get('pricing/legacy/dubai-air-sea/display')
  @RequirePermission('pricing:lookup:dubai-air-sea')
  async legacyDubaiAirSeaDisplay(@Req() request: { user: Principal }) {
    return this.repository.getDubaiPriceDisplay(request.user);
  }

  @Get('pricing/legacy/dubai-air-sea/display-versions')
  @RequirePermission('pricing:price-books:view')
  async legacyDubaiAirSeaDisplayVersions(@Req() request: { user: Principal }) {
    return this.repository.getDubaiPriceDisplayVersions(request.user);
  }

  @Get('pricing/south-africa/images')
  @RequirePermission('pricing:lookup:south-africa')
  async southAfricaRateImages(@Req() request: { user: Principal }) {
    return this.repository.getSouthAfricaRateImages(request.user);
  }
}

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
  @RequirePermission('pricing:price-books:list-view')
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
    return this.priceBookQueries.getPriceBookImportJob(request.user, id);
  }

  @Get('pricing/books/import-jobs')
  @RequirePermission('pricing:price-books:import-job-view')
  priceBookImportJobs(@Req() request: { user: Principal }, @Query() query: PriceBookImportJobListQuery) {
    return this.priceBookQueries.getPriceBookImportJobs(request.user, query);
  }

  @Get('pricing/legacy/sources')
  @RequirePermission('pricing:price-books:legacy-source-view')
  legacyPricingSources(@Req() request: { user: Principal }, @Query('module') module?: LegacyPricingModule) {
    return this.repository.getLegacyPricingSources(request.user, module);
  }

  @Get('pricing/legacy/health-report')
  @RequirePermission('pricing:price-books:health-report-view')
  legacyPricingHealth(@Req() request: { user: Principal }, @Query('module') module?: LegacyPricingModule) {
    return this.repository.getLegacyPricingHealth(request.user, module);
  }

  @Get('pricing/legacy/quote-meta')
  @RequirePermission('pricing:lookup:meta-view')
  async legacyPricingMeta(@Req() request: { user: Principal }) {
    if (request.user.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部查价');
    }
    return this.repository.getLegacyPricingMeta(request.user);
  }

  @Get('pricing/legacy/dubai-air-sea/display')
  @RequirePermission(['pricing:lookup:dubai-image-view', 'pricing:dubai-display:active-view'])
  async legacyDubaiAirSeaDisplay(@Req() request: { user: Principal }) {
    return this.repository.getDubaiPriceDisplay(request.user);
  }

  @Get('pricing/legacy/dubai-air-sea/display-versions')
  @RequirePermission('pricing:dubai-display:versions-view')
  async legacyDubaiAirSeaDisplayVersions(@Req() request: { user: Principal }) {
    return this.repository.getDubaiPriceDisplayVersions(request.user);
  }

  @Get('pricing/south-africa/images')
  @RequirePermission('pricing:south-africa:image-view')
  async southAfricaRateImages(@Req() request: { user: Principal }) {
    return this.repository.getSouthAfricaRateImages(request.user);
  }
}

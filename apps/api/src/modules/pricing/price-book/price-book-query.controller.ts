import { extname } from 'node:path';
import { BadRequestException, Controller, ForbiddenException, Get, Inject, Param, Query, Req, Res, StreamableFile } from '@nestjs/common';
import type { LegacyPricingModule, MarkupRouteListQuery, PriceBookImportJobListQuery, PriceBookImportTargetModule, PriceBookRowsQuery } from '@siyuan/shared';
import type { Response } from 'express';
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

  @Get('pricing/books/rule-refresh-progress')
  @RequirePermission('pricing:price-books:health')
  async priceBookRuleRefreshProgress(@Req() request: { user: Principal }) {
    return this.repository.getPriceBookRuleRefreshProgress(request.user);
  }

  @Get('pricing/book-rows')
  @RequirePermission('pricing:price-books:view')
  async priceBookRows(@Req() request: { user: Principal }, @Query() query: PriceBookRowsQuery) {
    return this.repository.getPriceBookRows(request.user, undefined, query);
  }

  @Get('pricing/books/:id/rows')
  @RequirePermission([
    'pricing:price-books:view',
    'pricing:price-books:export',
    'pricing:price-books:update',
    'pricing:price-books:delete',
    'pricing:markup:amazon:view',
    'pricing:markup:inquiry:view',
    'pricing:markup:europeExpress:view',
    'pricing:markup:southAfrica:view',
    'pricing:markup:usaAirSea:view',
    'pricing:markup:canadaAirSea:view',
    'pricing:markup:dubaiAirSea:view'
  ])
  async priceBookRowsByBook(@Req() request: { user: Principal }, @Param('id') id: string, @Query() query: PriceBookRowsQuery) {
    return this.repository.getPriceBookRows(request.user, id, query);
  }

  @Get('pricing/books/:id/markup-routes')
  @RequirePermission([
    'pricing:markup:amazon:view',
    'pricing:markup:inquiry:view',
    'pricing:markup:europeExpress:view',
    'pricing:markup:southAfrica:view',
    'pricing:markup:usaAirSea:view',
    'pricing:markup:canadaAirSea:view',
    'pricing:markup:dubaiAirSea:view'
  ])
  async markupRoutesByBook(@Req() request: { user: Principal }, @Param('id') id: string, @Query() query: MarkupRouteListQuery) {
    return this.repository.getMarkupRoutes(request.user, id, query);
  }

  @Get('pricing/books/:id/download')
  @RequirePermission('pricing:price-books:export')
  async downloadPriceBook(@Req() request: { user: Principal }, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.repository.downloadPriceBook(request.user, id);
    const extension = extname(file.fileName).toLowerCase();
    const mimeType = extension === '.xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    response.setHeader('Content-Type', mimeType);
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `attachment; filename="price-book${extension || '.xlsx'}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    return new StreamableFile(file.buffer);
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

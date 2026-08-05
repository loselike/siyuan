import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  LegacyPricingModule,
  PriceBookImportJobListQuery,
  PriceBookImportJobListResponse,
  PriceBookImportJobResponse
} from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { PrismaService } from '../../prisma.service.js';
import type { Principal } from '../../rbac.js';
import { mapPriceBook, mapPriceBookImportJob } from './price-book-query.mapper.js';

export const PRICE_BOOK_QUERY_REPOSITORY = 'PRICE_BOOK_QUERY_REPOSITORY';

export interface PriceBookQueryRepository {
  getPriceBookImportJob(principal: Principal, id: string): Promise<PriceBookImportJobResponse>;
  getPriceBookImportJobs(principal: Principal, query?: PriceBookImportJobListQuery): Promise<PriceBookImportJobListResponse>;
}

@Injectable()
export class PrismaPriceBookQueryRepository implements PriceBookQueryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPriceBookImportJob(principal: Principal, id: string): Promise<PriceBookImportJobResponse> {
    this.ensureStaffPricingAccess(principal);
    const job = await (this.prisma as any).priceBookImportJob.findFirst({ where: { id } });
    if (!job) throw new NotFoundException('价格表导入任务不存在');
    const book = job.priceBookId
      ? await (this.prisma as any).priceBook.findFirst({ where: { id: job.priceBookId } })
      : null;
    const legacySources = book
      ? await (this.prisma as any).legacyPricingSource.findMany({ where: { priceBookId: book.id, deletedAt: null } })
      : [];
    const legacyCounts = book
      ? Object.fromEntries(legacySources.map((source: any) => [source.module, source.rowCount])) as Partial<Record<LegacyPricingModule, number>>
      : undefined;
    return { job: mapPriceBookImportJob(job, book ? mapPriceBook(book, legacyCounts) : undefined) };
  }

  async getPriceBookImportJobs(principal: Principal, query: PriceBookImportJobListQuery = {}): Promise<PriceBookImportJobListResponse> {
    this.ensureStaffPricingAccess(principal);
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.targetModule === 'unclassified') where.targetModule = null;
    else if (query.targetModule) where.targetModule = query.targetModule;
    const [rows, totalItems] = await Promise.all([
      (this.prisma as any).priceBookImportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      (this.prisma as any).priceBookImportJob.count({ where })
    ]);
    return {
      jobs: rows.map((row: any) => mapPriceBookImportJob(row)),
      pagination: { page, pageSize, totalItems }
    };
  }

  private ensureStaffPricingAccess(principal: Principal) {
    if (principal.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能访问内部报价规则');
    }
  }
}

@Injectable()
export class LegacyPriceBookQueryRepository implements PriceBookQueryRepository {
  constructor(@Inject(PrismaRepository) private readonly repository: PriceBookQueryRepository) {}

  getPriceBookImportJob(principal: Principal, id: string) {
    return this.repository.getPriceBookImportJob(principal, id);
  }

  getPriceBookImportJobs(principal: Principal, query: PriceBookImportJobListQuery = {}) {
    return this.repository.getPriceBookImportJobs(principal, query);
  }
}

import type {
  DubaiPriceDisplayResponse,
  DubaiPriceDisplayVersionListResponse,
  LegacyPricingMetaResponse,
  LegacyPricingModule,
  PriceBookImportJobResponse,
  PriceBookImportTargetModule,
  PriceBookRowsQuery,
  PriceBookRowsResponse,
  PriceBooksResponse,
  PricingRuleRefreshProgressResponse,
  PricingSyncHealthResponse,
  SouthAfricaRateRuleListResponse
} from '@siyuan/shared';

export interface PricingSyncHealthQuery {
  page?: number;
  pageSize?: number;
  legacyModule?: LegacyPricingModule | 'unclassified';
}

export type PriceBookQueryRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export class PriceBookQueryClient {
  constructor(private readonly request: PriceBookQueryRequest) {}

  priceBooks(
    options: { includeRows?: boolean; targetModule?: PriceBookImportTargetModule } = {}
  ): Promise<PriceBooksResponse> {
    const params = new globalThis.URLSearchParams();
    if (options.includeRows === false) {
      params.set('includeRows', 'false');
    }
    if (options.targetModule) {
      params.set('targetModule', options.targetModule);
    }
    const search = params.toString();
    return this.request(`/pricing/books${search ? `?${search}` : ''}`);
  }

  priceBookImportJob(id: string): Promise<PriceBookImportJobResponse> {
    return this.request(`/pricing/books/import-jobs/${id}`);
  }

  priceBookRows(priceBookId?: string, query: PriceBookRowsQuery = {}): Promise<PriceBookRowsResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const path = priceBookId ? `/pricing/books/${priceBookId}/rows` : '/pricing/book-rows';
    const search = params.toString();
    return this.request(`${path}${search ? `?${search}` : ''}`);
  }

  pricingSyncHealth(query: PricingSyncHealthQuery = {}): Promise<PricingSyncHealthResponse> {
    const params = new globalThis.URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    if (query.legacyModule) params.set('legacyModule', String(query.legacyModule));
    const search = params.toString();
    return this.request(`/pricing/sync-health${search ? `?${search}` : ''}`);
  }

  priceBookRuleRefreshProgress(): Promise<PricingRuleRefreshProgressResponse> {
    return this.request('/pricing/books/rule-refresh-progress');
  }

  dubaiPriceDisplay(): Promise<DubaiPriceDisplayResponse> {
    return this.request('/pricing/legacy/dubai-air-sea/display');
  }

  dubaiPriceDisplayVersions(): Promise<DubaiPriceDisplayVersionListResponse> {
    return this.request('/pricing/legacy/dubai-air-sea/display-versions');
  }

  legacyPricingMeta(): Promise<LegacyPricingMetaResponse> {
    return this.request('/pricing/legacy/quote-meta');
  }

  southAfricaRateRules(): Promise<SouthAfricaRateRuleListResponse> {
    return this.request('/pricing/south-africa/rules');
  }
}

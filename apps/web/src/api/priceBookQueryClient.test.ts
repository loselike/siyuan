import type {
  DubaiPriceDisplayResponse,
  DubaiPriceDisplayVersionListResponse,
  DubaiPriceTableResponse,
  PriceBookImportJobResponse,
  PriceBookRowsResponse,
  PriceBooksResponse,
  PricingRuleRefreshProgressResponse,
  PricingSyncHealthResponse
} from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { PriceBookQueryClient, type PriceBookQueryRequest } from './priceBookQueryClient';

describe('PriceBookQueryClient', () => {
  it('keeps price-book list query serialization unchanged', async () => {
    const response: PriceBooksResponse = { books: [], rows: [] };
    const request = vi.fn().mockResolvedValue(response) as PriceBookQueryRequest;
    const client = new PriceBookQueryClient(request);

    await expect(client.priceBooks({ includeRows: false, targetModule: 'inquiry' })).resolves.toBe(response);
    await client.priceBooks({ includeRows: true });
    await client.priceBooks();

    expect(request).toHaveBeenNthCalledWith(1, '/pricing/books?includeRows=false&targetModule=inquiry');
    expect(request).toHaveBeenNthCalledWith(2, '/pricing/books');
    expect(request).toHaveBeenNthCalledWith(3, '/pricing/books');
  });

  it('keeps scoped and global price-book row paths and filters unchanged', async () => {
    const response = {
      rows: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0 }
    } as PriceBookRowsResponse;
    const request = vi.fn().mockResolvedValue(response) as PriceBookQueryRequest;
    const client = new PriceBookQueryClient(request);

    await expect(client.priceBookRows('book/001', {
      page: 2,
      pageSize: 50,
      agentName: '深圳 仓',
      channelName: '',
      targetModule: undefined
    })).resolves.toBe(response);
    await client.priceBookRows(undefined, { page: 1 });
    await client.priceBookRows();

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/pricing/books/book/001/rows?page=2&pageSize=50&agentName=%E6%B7%B1%E5%9C%B3+%E4%BB%93'
    );
    expect(request).toHaveBeenNthCalledWith(2, '/pricing/book-rows?page=1');
    expect(request).toHaveBeenNthCalledWith(3, '/pricing/book-rows');
  });

  it('keeps sync-health query serialization unchanged', async () => {
    const response = {
      rows: [],
      orphanRules: [],
      stats: { sources: 0, agents: 0, lines: 0, activeAgents: 0 },
      pagination: { page: 1, pageSize: 20, totalItems: 0 }
    } satisfies PricingSyncHealthResponse;
    const request = vi.fn().mockResolvedValue(response) as PriceBookQueryRequest;
    const client = new PriceBookQueryClient(request);

    await expect(client.pricingSyncHealth({
      page: 2,
      pageSize: 100,
      legacyModule: 'unclassified'
    })).resolves.toBe(response);
    await client.pricingSyncHealth({ page: 0, pageSize: 0 });

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/pricing/sync-health?page=2&pageSize=100&legacyModule=unclassified'
    );
    expect(request).toHaveBeenNthCalledWith(2, '/pricing/sync-health');
  });

  it('keeps import-job polling and rule-refresh progress paths unchanged', async () => {
    const importJob = { job: { id: 'job-1' } } as PriceBookImportJobResponse;
    const progress = {
      generatedAt: '2026-07-25T00:00:00.000Z',
      modules: []
    } satisfies PricingRuleRefreshProgressResponse;
    const request = vi.fn()
      .mockResolvedValueOnce(importJob)
      .mockResolvedValueOnce(progress) as PriceBookQueryRequest;
    const client = new PriceBookQueryClient(request);

    await expect(client.priceBookImportJob('job-1')).resolves.toBe(importJob);
    await expect(client.priceBookRuleRefreshProgress()).resolves.toBe(progress);

    expect(request).toHaveBeenNthCalledWith(1, '/pricing/books/import-jobs/job-1');
    expect(request).toHaveBeenNthCalledWith(2, '/pricing/books/rule-refresh-progress');
  });

  it('keeps Dubai table, active display, and display-version paths unchanged', async () => {
    const table = {} as DubaiPriceTableResponse;
    const display = {} as DubaiPriceDisplayResponse;
    const versions = { versions: [] } as DubaiPriceDisplayVersionListResponse;
    const request = vi.fn()
      .mockResolvedValueOnce(table)
      .mockResolvedValueOnce(display)
      .mockResolvedValueOnce(versions) as PriceBookQueryRequest;
    const client = new PriceBookQueryClient(request);

    await expect(client.dubaiPriceTable()).resolves.toBe(table);
    await expect(client.dubaiPriceDisplay()).resolves.toBe(display);
    await expect(client.dubaiPriceDisplayVersions()).resolves.toBe(versions);

    expect(request).toHaveBeenNthCalledWith(1, '/pricing/legacy/dubai-air-sea/table');
    expect(request).toHaveBeenNthCalledWith(2, '/pricing/legacy/dubai-air-sea/display');
    expect(request).toHaveBeenNthCalledWith(3, '/pricing/legacy/dubai-air-sea/display-versions');
  });

  it('passes query errors through without changing their message', async () => {
    const request = vi.fn().mockRejectedValue(new Error('没有访问权限')) as PriceBookQueryRequest;
    const client = new PriceBookQueryClient(request);

    await expect(client.priceBooks()).rejects.toThrow('没有访问权限');
  });
});

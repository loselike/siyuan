import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';

describe('ApiClient gateway errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a module-neutral message for gateway failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><title>502 Bad Gateway</title></html>', { status: 502 })));
    const client = new ApiClient(() => null, vi.fn());

    await expect(client.shipments()).rejects.toThrow('服务暂不可用，请稍后重试');
  });
});

describe('ApiClient price-book query compatibility', () => {
  it('forwards legacy read methods to the price-book query client', async () => {
    const client = new ApiClient(() => null, vi.fn());
    const priceBooks = vi.spyOn(client.priceBookQuery, 'priceBooks').mockResolvedValue({ books: [], rows: [] });
    const priceBookRows = vi.spyOn(client.priceBookQuery, 'priceBookRows').mockResolvedValue({
      rows: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0 }
    });
    const pricingSyncHealth = vi.spyOn(client.priceBookQuery, 'pricingSyncHealth').mockResolvedValue({
      rows: [],
      orphanRules: [],
      stats: { sources: 0, agents: 0, lines: 0, activeAgents: 0 },
      pagination: { page: 1, pageSize: 20, totalItems: 0 }
    });
    const priceBookRuleRefreshProgress = vi.spyOn(
      client.priceBookQuery,
      'priceBookRuleRefreshProgress'
    ).mockResolvedValue({ generatedAt: '2026-07-25T00:00:00.000Z', modules: [] });
    const priceBookImportJob = vi.spyOn(client.priceBookQuery, 'priceBookImportJob').mockResolvedValue({
      job: {
        id: 'job-1',
        fileName: 'price-book.xlsx',
        status: 'PENDING',
        processedRows: 0,
        totalRows: 0,
        failedRows: 0,
        createdAt: '2026-07-25T00:00:00.000Z',
        updatedAt: '2026-07-25T00:00:00.000Z'
      }
    });
    const listOptions = { includeRows: false, targetModule: 'inquiry' as const };
    const rowQuery = { page: 2, pageSize: 50, agentName: '测试代理' };
    const healthQuery = { page: 1, pageSize: 20, legacyModule: 'inquiry' as const };

    await client.priceBooks(listOptions);
    await client.priceBookRows('book-1', rowQuery);
    await client.pricingSyncHealth(healthQuery);
    await client.priceBookRuleRefreshProgress();
    await client.priceBookImportJob('job-1');

    expect(priceBooks).toHaveBeenCalledWith(listOptions);
    expect(priceBookRows).toHaveBeenCalledWith('book-1', rowQuery);
    expect(pricingSyncHealth).toHaveBeenCalledWith(healthQuery);
    expect(priceBookRuleRefreshProgress).toHaveBeenCalledOnce();
    expect(priceBookImportJob).toHaveBeenCalledWith('job-1');
  });
});

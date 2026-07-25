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

describe('ApiClient markup query compatibility', () => {
  it('forwards legacy read methods to the markup query client', async () => {
    const client = new ApiClient(() => null, vi.fn());
    const listResponse = {
      metrics: {
        totalRules: 0,
        enabledRules: 0,
        disabledRules: 0,
        unmatchedQuotes: 0
      },
      rows: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0 }
    };
    const agentMarkupRules = vi.spyOn(client.markupQuery, 'agentMarkupRules').mockResolvedValue(listResponse);
    const previewAgentMarkupRule = vi.spyOn(client.markupQuery, 'previewAgentMarkupRule').mockResolvedValue({
      rule: { id: 'markup-1' },
      scope: {},
      stats: {},
      examples: [],
      recentChanges: []
    } as never);
    const exportResponse = { rows: [], exportedAt: '2026-07-25T00:00:00.000Z' };
    const exportAgentMarkupRules = vi.spyOn(client.markupQuery, 'exportAgentMarkupRules').mockResolvedValue(exportResponse);
    const query = { legacyModule: 'inquiry' as const, agentName: '测试代理', page: 1, pageSize: 20 };

    await client.agentMarkupRules(query);
    await client.previewAgentMarkupRule('markup-1');
    await client.exportAgentMarkupRules(query);

    expect(agentMarkupRules).toHaveBeenCalledWith(query);
    expect(previewAgentMarkupRule).toHaveBeenCalledWith('markup-1');
    expect(exportAgentMarkupRules).toHaveBeenCalledWith(query);
  });
});

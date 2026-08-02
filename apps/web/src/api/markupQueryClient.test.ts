import type {
  AgentMarkupExportResponse,
  AgentMarkupListResponse
} from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { MarkupQueryClient, type MarkupQueryRequest } from './markupQueryClient';

const emptyListResponse: AgentMarkupListResponse = {
  metrics: {
    totalRules: 0,
    enabledRules: 0,
    disabledRules: 0,
    unmatchedQuotes: 0,
    systemDefaultScopes: 0
  },
  rows: [],
  filterOptions: { agentNames: [], channelNames: [], realChannelNames: [], destinationCountries: [] },
  pagination: { page: 1, pageSize: 20, totalItems: 0 }
};

describe('MarkupQueryClient', () => {
  it('keeps markup list query serialization unchanged', async () => {
    const request = vi.fn().mockResolvedValue(emptyListResponse) as MarkupQueryRequest;
    const client = new MarkupQueryClient(request);

    await expect(client.agentMarkupRules({
      legacyModule: 'inquiry',
      agentName: '测试 代理',
      channelName: '',
      status: 'ALL',
      detail: true,
      includeHits: false,
      page: 2,
      pageSize: 50
    })).resolves.toBe(emptyListResponse);
    await client.agentMarkupRules();

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/pricing/markup-rules?legacyModule=inquiry&agentName=%E6%B5%8B%E8%AF%95+%E4%BB%A3%E7%90%86&status=ALL&detail=true&includeHits=false&page=2&pageSize=50'
    );
    expect(request).toHaveBeenNthCalledWith(2, '/pricing/markup-rules');
  });

  it('keeps markup export query serialization unchanged', async () => {
    const response: AgentMarkupExportResponse = {
      rows: [],
      exportedAt: '2026-07-25T00:00:00.000Z'
    };
    const request = vi.fn().mockResolvedValue(response) as MarkupQueryRequest;
    const client = new MarkupQueryClient(request);

    await expect(client.exportAgentMarkupRules({
      priceBookId: 'book-1',
      destinationCountry: '南非',
      page: 0,
      pageSize: undefined
    })).resolves.toBe(response);

    expect(request).toHaveBeenCalledWith(
      '/pricing/markup-rules/export?priceBookId=book-1&destinationCountry=%E5%8D%97%E9%9D%9E&page=0'
    );
  });

  it('passes markup query errors through without changing their message', async () => {
    const request = vi.fn().mockRejectedValue(new Error('没有访问权限')) as MarkupQueryRequest;
    const client = new MarkupQueryClient(request);

    await expect(client.agentMarkupRules()).rejects.toThrow('没有访问权限');
  });
});

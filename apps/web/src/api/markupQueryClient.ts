import type {
  AgentMarkupExportResponse,
  AgentMarkupListQuery,
  AgentMarkupListResponse
} from '@siyuan/shared';

export type MarkupQueryRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

function queryString(query: AgentMarkupListQuery): string {
  const params = new globalThis.URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      params.set(key, String(value));
    }
  });
  const search = params.toString();
  return search ? `?${search}` : '';
}

export class MarkupQueryClient {
  constructor(private readonly request: MarkupQueryRequest) {}

  agentMarkupRules(query: AgentMarkupListQuery = {}): Promise<AgentMarkupListResponse> {
    return this.request(`/pricing/markup-rules${queryString(query)}`);
  }

  exportAgentMarkupRules(query: AgentMarkupListQuery = {}): Promise<AgentMarkupExportResponse> {
    return this.request(`/pricing/markup-rules/export${queryString(query)}`);
  }
}

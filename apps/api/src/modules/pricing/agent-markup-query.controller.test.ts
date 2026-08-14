import type { AgentMarkupListQuery } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { AgentMarkupQueryController } from './agent-markup-query.controller.js';
import type { Principal } from '../rbac.js';

const principal: Principal = { id: 'admin-1', username: 'admin', role: 'ADMIN' };

function createController() {
  const repository = {
    getAgentMarkupRules: vi.fn().mockResolvedValue({ rows: [], pagination: { page: 1, pageSize: 20, totalItems: 0 } }),
    exportAgentMarkupRules: vi.fn().mockResolvedValue({ fileName: 'markup-rules.xlsx', rows: [] }),
    previewAgentMarkupRule: vi.fn().mockResolvedValue({ rule: null, hits: [] })
  };
  return {
    repository,
    controller: new AgentMarkupQueryController(repository as never)
  };
}

describe('AgentMarkupQueryController', () => {
  it('preserves list, export and preview repository contracts', async () => {
    const { controller, repository } = createController();
    const query = { page: 2, pageSize: 50, legacyModule: 'amazon', includeHits: true } as AgentMarkupListQuery;

    await controller.agentMarkupRules({ user: principal }, query);
    await controller.exportAgentMarkupRules({ user: principal }, query);
    await controller.previewAgentMarkupRule({ user: principal }, 'markup-1');

    expect(repository.getAgentMarkupRules).toHaveBeenCalledWith(principal, query);
    expect(repository.exportAgentMarkupRules).toHaveBeenCalledWith(principal, query);
    expect(repository.previewAgentMarkupRule).toHaveBeenCalledWith(principal, 'markup-1');
  });
});

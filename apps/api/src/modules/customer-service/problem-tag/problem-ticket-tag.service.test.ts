import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { ProblemTicketTagRepository } from './problem-ticket-tag.repository.js';
import { problemTicketTagReadPermissions, ProblemTicketTagService } from './problem-ticket-tag.service.js';

const servicePrincipal = { id: 'u-service', username: 'service', role: 'UG_CUSTOMER_SERVICE' } as Principal;
const financePrincipal = { id: 'u-finance', username: 'finance', role: 'UG_FINANCE' } as Principal;

function setup() {
  const repository = {
    hasPermission: vi.fn(),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined),
    getProblemTicketCommonTags: vi.fn(),
    createProblemTicketCommonTag: vi.fn(),
    updateProblemTicketCommonTag: vi.fn(),
    deleteProblemTicketCommonTag: vi.fn()
  } as unknown as ProblemTicketTagRepository;
  return { repository, service: new ProblemTicketTagService(repository) };
}

describe('ProblemTicketTagService', () => {
  it('preserves the full read-permission set and forwards the repository result when any permission passes', async () => {
    const { repository, service } = setup();
    const result = [{ id: 'tag-1', name: '标签' }];
    vi.mocked(repository.hasPermission).mockImplementation(async (_role, permission) => permission === 'business:shipment:problem-create');
    vi.mocked(repository.getProblemTicketCommonTags).mockResolvedValue(result as never);

    await expect(service.list(servicePrincipal)).resolves.toBe(result);
    expect(repository.hasPermission).toHaveBeenCalledTimes(problemTicketTagReadPermissions.length);
    problemTicketTagReadPermissions.forEach((permission, index) => {
      expect(repository.hasPermission).toHaveBeenNthCalledWith(index + 1, servicePrincipal.role, permission);
    });
    expect(repository.getProblemTicketCommonTags).toHaveBeenCalledWith(servicePrincipal);
  });

  it('preserves denial evidence and keeps audit failures non-blocking', async () => {
    const { repository, service } = setup();
    vi.mocked(repository.hasPermission).mockResolvedValue(false);
    vi.mocked(repository.recordPermissionDenied).mockRejectedValue(new Error('audit unavailable'));

    await expect(service.list(financePrincipal)).rejects.toThrow('没有访问权限');
    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(financePrincipal, {
      permissions: problemTicketTagReadPermissions,
      method: 'SERVER',
      path: 'customer-service granular action'
    });
    expect(repository.getProblemTicketCommonTags).not.toHaveBeenCalled();
  });

  it('forwards create, update and delete commands without changing inputs or results', async () => {
    const { repository, service } = setup();
    const created = { id: 'tag-1', name: '新标签' };
    const updated = { id: 'tag-1', name: '更新标签' };
    const deleted = { id: 'tag-1', name: '更新标签' };
    vi.mocked(repository.createProblemTicketCommonTag).mockResolvedValue(created as never);
    vi.mocked(repository.updateProblemTicketCommonTag).mockResolvedValue(updated as never);
    vi.mocked(repository.deleteProblemTicketCommonTag).mockResolvedValue(deleted as never);

    await expect(service.create(servicePrincipal, { name: '  新标签  ' })).resolves.toBe(created);
    await expect(service.update(servicePrincipal, 'tag-1', { name: '更新标签' })).resolves.toBe(updated);
    await expect(service.delete(servicePrincipal, 'tag-1')).resolves.toBe(deleted);
    expect(repository.createProblemTicketCommonTag).toHaveBeenCalledWith(servicePrincipal, { name: '  新标签  ' });
    expect(repository.updateProblemTicketCommonTag).toHaveBeenCalledWith(servicePrincipal, 'tag-1', { name: '更新标签' });
    expect(repository.deleteProblemTicketCommonTag).toHaveBeenCalledWith(servicePrincipal, 'tag-1');
  });

  it('preserves command repository errors without translation', async () => {
    const { repository, service } = setup();
    const error = new Error('常用标签不存在');
    vi.mocked(repository.updateProblemTicketCommonTag).mockRejectedValue(error);

    await expect(service.update(servicePrincipal, 'missing', { name: '不存在' })).rejects.toBe(error);
  });
});

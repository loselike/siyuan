import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { CarrierTaskCommandRepository } from './carrier-task-command.repository.js';
import { CarrierTaskCommandService } from './carrier-task-command.service.js';

const admin = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;
const customer = { id: 'u-customer', username: 'customer', role: 'CUSTOMER' } as Principal;

function setup() {
  const repository = {
    runCarrierTask: vi.fn(),
    retryCarrierTask: vi.fn()
  } as unknown as CarrierTaskCommandRepository;
  return { repository, service: new CarrierTaskCommandService(repository) };
}

describe('CarrierTaskCommandService', () => {
  it('forwards run bodies, including undefined, without adding defaults or translating results', async () => {
    const { repository, service } = setup();
    const failed = { task: { status: 'FAILED' } };
    const succeeded = { task: { status: 'SUCCESS' } };
    vi.mocked(repository.runCarrierTask).mockResolvedValueOnce(failed as never).mockResolvedValueOnce(succeeded as never);

    await expect(service.run(admin, 'task-1', { fail: true })).resolves.toBe(failed);
    await expect(service.run(admin, 'task-2', undefined)).resolves.toBe(succeeded);
    expect(repository.runCarrierTask).toHaveBeenNthCalledWith(1, admin, 'task-1', { fail: true });
    expect(repository.runCarrierTask).toHaveBeenNthCalledWith(2, admin, 'task-2', undefined);
  });

  it('forwards retry bodies and repository exceptions unchanged', async () => {
    const { repository, service } = setup();
    const result = { task: { status: 'SUCCESS' } };
    vi.mocked(repository.retryCarrierTask).mockResolvedValueOnce(result as never);
    await expect(service.retry(admin, 'task-1', {})).resolves.toBe(result);
    expect(repository.retryCarrierTask).toHaveBeenCalledWith(admin, 'task-1', {});

    const failure = new Error('repository failure');
    vi.mocked(repository.retryCarrierTask).mockRejectedValueOnce(failure);
    await expect(service.retry(admin, 'task-2', { fail: true })).rejects.toBe(failure);
  });

  it('preserves customer-specific defenses and never reaches the repository', () => {
    const { repository, service } = setup();
    expect(() => service.run(customer, 'task-1', {})).toThrow('客户不能执行承运商任务');
    expect(() => service.retry(customer, 'task-1', {})).toThrow('客户不能重试承运商任务');
    expect(repository.runCarrierTask).not.toHaveBeenCalled();
    expect(repository.retryCarrierTask).not.toHaveBeenCalled();
  });
});

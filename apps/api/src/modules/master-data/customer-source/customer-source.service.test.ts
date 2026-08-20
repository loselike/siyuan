import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { CustomerSourceRepository } from './customer-source.repository.js';
import { CustomerSourceService } from './customer-source.service.js';

const principal: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };

function setup() {
  const repository = {
    listCustomerSources: vi.fn(),
    createCustomerSource: vi.fn(),
    updateCustomerSource: vi.fn(),
    deleteCustomerSource: vi.fn()
  } as unknown as CustomerSourceRepository;
  return { repository, service: new CustomerSourceService(repository) };
}

describe('CustomerSourceService', () => {
  it('forwards the current query and command contracts without transforming them', async () => {
    const { repository, service } = setup();
    const query = { keyword: '  来源  ', enabledOnly: true };
    const createInput = { name: '  展会  ', enabled: true };
    const updateInput = { remark: '  原样交给现有适配器  ', enabled: false };

    await service.list(principal, query);
    await service.create(principal, createInput);
    await service.update(principal, 'source-1', updateInput);
    await service.delete(principal, 'source-1');

    expect(repository.listCustomerSources).toHaveBeenCalledWith(principal, query);
    expect(repository.createCustomerSource).toHaveBeenCalledWith(principal, createInput);
    expect(repository.updateCustomerSource).toHaveBeenCalledWith(principal, 'source-1', updateInput);
    expect(repository.deleteCustomerSource).toHaveBeenCalledWith(principal, 'source-1');
  });
});

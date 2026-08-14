import { Inject, Injectable } from '@nestjs/common';
import type { CustomerSourceInput, CustomerSourceListQuery } from '@siyuan/shared/customer-source';
import type { Principal } from '../../rbac.js';
import { CUSTOMER_SOURCE_REPOSITORY, type CustomerSourceRepository } from './customer-source.repository.js';

@Injectable()
export class CustomerSourceService {
  constructor(
    @Inject(CUSTOMER_SOURCE_REPOSITORY)
    private readonly repository: CustomerSourceRepository
  ) {}

  async list(query: CustomerSourceListQuery) {
    return this.repository.listCustomerSources(query);
  }

  async create(principal: Principal, input: CustomerSourceInput) {
    return this.repository.createCustomerSource(principal, input);
  }

  async update(principal: Principal, id: string, input: Partial<CustomerSourceInput>) {
    return this.repository.updateCustomerSource(principal, id, input);
  }

  async delete(principal: Principal, id: string) {
    return this.repository.deleteCustomerSource(principal, id);
  }
}

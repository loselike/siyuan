import type { CustomerSourceInput, CustomerSourceListQuery } from '@siyuan/shared/customer-source';
import type { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';

export const CUSTOMER_SOURCE_REPOSITORY = Symbol('CUSTOMER_SOURCE_REPOSITORY');

export interface CustomerSourceRepository {
  listCustomerSources(query?: CustomerSourceListQuery): ReturnType<PrismaRepository['listCustomerSources']>;
  createCustomerSource(principal: Principal, input: CustomerSourceInput): ReturnType<PrismaRepository['createCustomerSource']>;
  updateCustomerSource(principal: Principal, id: string, input: Partial<CustomerSourceInput>): ReturnType<PrismaRepository['updateCustomerSource']>;
  deleteCustomerSource(principal: Principal, id: string): ReturnType<PrismaRepository['deleteCustomerSource']>;
}

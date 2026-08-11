import type { PrismaRepository } from '../../prisma.repository.js';

export const WAREHOUSE_RENT_REPOSITORY = Symbol('WAREHOUSE_RENT_REPOSITORY');

/**
 * Stable application port for the existing warehouse rent behavior.
 * PrismaRepository and InMemoryRepository remain the adapters so calculation,
 * visibility, versioning, transactions and audits remain unchanged.
 */
export type WarehouseRentRepository = Pick<
  PrismaRepository,
  | 'getWarehouseRentDetails'
  | 'exportWarehouseRentDetails'
  | 'getWarehouseRentRules'
  | 'createWarehouseRentRule'
  | 'updateWarehouseRentRule'
  | 'deleteWarehouseRentRule'
  | 'updateWarehouseRentRuleEnabled'
>;

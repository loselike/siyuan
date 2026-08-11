import type { PrismaRepository } from '../../prisma.repository.js';

export const WAREHOUSE_DISPATCH_REPOSITORY = Symbol('WAREHOUSE_DISPATCH_REPOSITORY');

/**
 * Stable application port for warehouse dispatch and agent handover behavior.
 * PrismaRepository and InMemoryRepository retain visibility, state, transaction,
 * versioning and audit semantics while transport depends on this narrow boundary.
 */
export type WarehouseDispatchRepository = Pick<
  PrismaRepository,
  | 'getWarehouseDispatchShipments'
  | 'updateWarehouseDispatchDeclaration'
  | 'getWarehouseHandover'
  | 'printWarehouseHandover'
>;

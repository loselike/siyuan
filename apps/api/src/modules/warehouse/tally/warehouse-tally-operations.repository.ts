import type { PrismaRepository } from '../../prisma.repository.js';

export const WAREHOUSE_TALLY_OPERATIONS_REPOSITORY = Symbol('WAREHOUSE_TALLY_OPERATIONS_REPOSITORY');

/**
 * Stable port for the remaining warehouse tally statistics and consolidation
 * operations. The existing repositories remain the adapters so permissions,
 * transactions, package writes, shipment creation and audits stay unchanged.
 */
export type WarehouseTallyOperationsRepository = Pick<
  PrismaRepository,
  | 'hasPermission'
  | 'recordPermissionDenied'
  | 'createWarehouseConsolidation'
  | 'createShipmentFromWarehouseConsolidation'
  | 'getWarehouseTallyRepeatStatistics'
>;

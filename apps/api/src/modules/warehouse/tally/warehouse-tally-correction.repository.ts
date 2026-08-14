import type { PrismaRepository } from '../../prisma.repository.js';

export const WAREHOUSE_TALLY_CORRECTION_REPOSITORY = Symbol('WAREHOUSE_TALLY_CORRECTION_REPOSITORY');

/**
 * Stable port for the existing historical aggregate correction workflow.
 *
 * The Prisma adapter retains permission and site checks, preview fingerprint,
 * serializable transaction, package replacement, audit and lineage behavior.
 */
export type WarehouseTallyCorrectionRepository = Pick<
  PrismaRepository,
  | 'getWarehouseTallyHistoricalAggregateCorrectionPreview'
  | 'correctWarehouseTallyHistoricalAggregate'
>;

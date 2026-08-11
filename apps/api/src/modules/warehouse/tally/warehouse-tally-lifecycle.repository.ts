import type { PrismaRepository } from '../../prisma.repository.js';

export const WAREHOUSE_TALLY_LIFECYCLE_REPOSITORY = Symbol('WAREHOUSE_TALLY_LIFECYCLE_REPOSITORY');

/**
 * Stable port for the existing warehouse tally lifecycle behavior.
 *
 * PrismaRepository and InMemoryRepository remain the adapters so their
 * current permissions, state transitions, package writes and audits stay
 * unchanged while controller wiring moves behind an application boundary.
 */
export type WarehouseTallyLifecycleRepository = Pick<
  PrismaRepository,
  'startWarehouseTallyTask' | 'completeWarehouseTallyTask' | 'cancelCompletedWarehouseTallyTask'
>;

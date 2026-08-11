import type { PrismaRepository } from '../../prisma.repository.js';

export const WAREHOUSE_TALLY_LABEL_REPOSITORY = Symbol('WAREHOUSE_TALLY_LABEL_REPOSITORY');

/**
 * Stable port for the existing warehouse tally label workflow.
 *
 * The current adapters retain permission checks, label state, package lookup,
 * audits and lineage while transport wiring moves behind this boundary.
 */
export type WarehouseTallyLabelRepository = Pick<
  PrismaRepository,
  | 'generateWarehouseTallyTaskLabel'
  | 'printWarehouseTallyTaskLabel'
  | 'downloadWarehouseTallyTaskLabel'
  | 'applyWarehouseTallyTaskLabel'
>;

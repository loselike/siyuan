import type { PrismaRepository } from '../../prisma.repository.js';

export const MOJIA_MEASUREMENT_REPOSITORY = Symbol('MOJIA_MEASUREMENT_REPOSITORY');

/**
 * Stable application port for the existing Mojia device ingestion flow.
 * Both production and in-memory adapters retain their current persistence,
 * idempotency, tally and audit behavior.
 */
export type MojiaMeasurementRepository = Pick<
  PrismaRepository,
  | 'applyWarehouseTallyMeasurementByBarcode'
  | 'completeMojiaRequestSample'
  | 'createMojiaRequestSample'
  | 'createWarehousePackage'
  | 'recordHttpAudit'
>;

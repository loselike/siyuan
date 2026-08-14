import type { PrismaRepository } from '../../prisma.repository.js';

export const WAREHOUSE_MACHINE_IMPORT_REPOSITORY = Symbol('WAREHOUSE_MACHINE_IMPORT_REPOSITORY');

/**
 * Stable application port for the existing machine-workbook import behavior.
 * Parsing remains outside the adapters while PrismaRepository and
 * InMemoryRepository retain permission, duplicate, transaction and audit rules.
 */
export type WarehouseMachineImportRepository = Pick<
  PrismaRepository,
  'previewWarehouseMachineImport' | 'importWarehouseMachineImport'
>;

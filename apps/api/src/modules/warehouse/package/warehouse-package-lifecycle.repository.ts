import type { PrismaRepository } from '../../prisma.repository.js';

export const WAREHOUSE_PACKAGE_LIFECYCLE_REPOSITORY = Symbol('WAREHOUSE_PACKAGE_LIFECYCLE_REPOSITORY');

/**
 * Stable application port for the existing warehouse package lifecycle.
 * PrismaRepository and InMemoryRepository remain the adapters so validation,
 * scope, idempotency, transactions and audits keep their current behavior.
 */
export type WarehousePackageLifecycleRepository = Pick<
  PrismaRepository,
  | 'assertWarehouseManualReceiptCustomer'
  | 'createWarehousePackage'
  | 'createWarehouseManualReceipt'
  | 'replenishWarehouseSameSpec'
  | 'splitWarehousePackage'
  | 'updateWarehousePackage'
  | 'updateWarehousePackageRemark'
  | 'updateWarehousePackageException'
>;

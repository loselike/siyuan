import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module.js';
import { usePrismaRepository } from '../../data-access.module.js';
import { LegacyWarehouseInventoryQueryRepository } from './legacy-warehouse-inventory-query.repository.js';
import {
  PrismaWarehouseInventoryQueryRepository,
  WAREHOUSE_INVENTORY_QUERY_REPOSITORY
} from './warehouse-inventory-query.repository.js';
import { WarehouseInventoryQueryService } from './warehouse-inventory-query.service.js';
import { WarehousePackagesQueryController } from './warehouse-packages-query.controller.js';

describe('WarehouseInventoryModule wiring', () => {
  let closeModule: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await closeModule?.();
    closeModule = undefined;
  });

  it('resolves the package query slice with the configured data adapter', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    closeModule = () => moduleRef.close();

    expect(moduleRef.get(WarehousePackagesQueryController)).toBeInstanceOf(WarehousePackagesQueryController);
    expect(moduleRef.get(WarehouseInventoryQueryService)).toBeInstanceOf(WarehouseInventoryQueryService);
    expect(moduleRef.get(WAREHOUSE_INVENTORY_QUERY_REPOSITORY)).toBeInstanceOf(
      usePrismaRepository
        ? PrismaWarehouseInventoryQueryRepository
        : LegacyWarehouseInventoryQueryRepository
    );
  });
});

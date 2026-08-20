import { Module } from '@nestjs/common';
import { DataAccessModule, usePrismaRepository } from '../../data-access.module.js';
import { PrismaRepository } from '../../prisma.repository.js';
import { LegacyWarehouseInventoryQueryRepository } from './legacy-warehouse-inventory-query.repository.js';
import { WarehouseInventoryQueryController } from './warehouse-inventory-query.controller.js';
import {
  PrismaWarehouseInventoryQueryRepository,
  WAREHOUSE_INVENTORY_QUERY_AUTHORIZER,
  WAREHOUSE_INVENTORY_QUERY_REPOSITORY
} from './warehouse-inventory-query.repository.js';
import { WarehouseInventoryQueryService } from './warehouse-inventory-query.service.js';

const warehouseInventoryQueryRepositoryProvider = usePrismaRepository
  ? { provide: WAREHOUSE_INVENTORY_QUERY_REPOSITORY, useClass: PrismaWarehouseInventoryQueryRepository }
  : { provide: WAREHOUSE_INVENTORY_QUERY_REPOSITORY, useClass: LegacyWarehouseInventoryQueryRepository };

const warehouseInventoryQueryAuthorizerProvider = {
  provide: WAREHOUSE_INVENTORY_QUERY_AUTHORIZER,
  useFactory: (repository: PrismaRepository) => ({
    hasPermission: repository.hasPermission.bind(repository)
  }),
  inject: [PrismaRepository]
};

@Module({
  imports: [DataAccessModule],
  controllers: [WarehouseInventoryQueryController],
  providers: [
    WarehouseInventoryQueryService,
    warehouseInventoryQueryRepositoryProvider,
    warehouseInventoryQueryAuthorizerProvider
  ],
  exports: [WarehouseInventoryQueryService]
})
export class WarehouseInventoryModule {}

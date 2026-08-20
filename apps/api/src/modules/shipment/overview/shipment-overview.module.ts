import { Module } from '@nestjs/common';
import { DataAccessModule, usePrismaRepository } from '../../data-access.module.js';
import { LegacyShipmentOverviewQueryRepository } from './legacy-shipment-overview-query.repository.js';
import { PrismaShipmentOverviewQueryRepository } from './prisma-shipment-overview-query.repository.js';
import { ShipmentOverviewQueryController } from './shipment-overview-query.controller.js';
import { SHIPMENT_OVERVIEW_QUERY_REPOSITORY } from './shipment-overview-query.repository.js';
import { ShipmentOverviewQueryService } from './shipment-overview-query.service.js';

const shipmentOverviewQueryRepositoryProvider = {
  provide: SHIPMENT_OVERVIEW_QUERY_REPOSITORY,
  useExisting: usePrismaRepository
    ? PrismaShipmentOverviewQueryRepository
    : LegacyShipmentOverviewQueryRepository
};

@Module({
  imports: [DataAccessModule],
  controllers: [ShipmentOverviewQueryController],
  providers: [
    ShipmentOverviewQueryService,
    ...(usePrismaRepository ? [] : [LegacyShipmentOverviewQueryRepository]),
    shipmentOverviewQueryRepositoryProvider
  ],
  exports: [ShipmentOverviewQueryService]
})
export class ShipmentOverviewModule {}

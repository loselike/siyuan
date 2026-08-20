import { Module } from '@nestjs/common';
import { DataAccessModule } from '../../data-access.module.js';
import { PrismaRepository } from '../../prisma.repository.js';
import { ShipmentOverviewQueryController } from './shipment-overview-query.controller.js';
import { SHIPMENT_OVERVIEW_QUERY_REPOSITORY } from './shipment-overview-query.repository.js';
import { ShipmentOverviewQueryService } from './shipment-overview-query.service.js';

const shipmentOverviewQueryRepositoryProvider = {
  provide: SHIPMENT_OVERVIEW_QUERY_REPOSITORY,
  useExisting: PrismaRepository
};

@Module({
  imports: [DataAccessModule],
  controllers: [ShipmentOverviewQueryController],
  providers: [ShipmentOverviewQueryService, shipmentOverviewQueryRepositoryProvider],
  exports: [ShipmentOverviewQueryService]
})
export class ShipmentOverviewModule {}

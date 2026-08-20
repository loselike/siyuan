import { Module } from '@nestjs/common';
import { DataAccessModule } from '../../data-access.module.js';
import { LegacyShipmentOverviewQueryRepository } from './legacy-shipment-overview-query.repository.js';
import { ShipmentOverviewQueryController } from './shipment-overview-query.controller.js';
import { SHIPMENT_OVERVIEW_QUERY_REPOSITORY } from './shipment-overview-query.repository.js';
import { ShipmentOverviewQueryService } from './shipment-overview-query.service.js';

const shipmentOverviewQueryRepositoryProvider = {
  provide: SHIPMENT_OVERVIEW_QUERY_REPOSITORY,
  useClass: LegacyShipmentOverviewQueryRepository
};

@Module({
  imports: [DataAccessModule],
  controllers: [ShipmentOverviewQueryController],
  providers: [ShipmentOverviewQueryService, shipmentOverviewQueryRepositoryProvider],
  exports: [ShipmentOverviewQueryService]
})
export class ShipmentOverviewModule {}

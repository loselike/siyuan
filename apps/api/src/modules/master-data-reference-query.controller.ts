import { Controller, Get, Inject } from '@nestjs/common';
import { RequirePermission } from './require-permission.decorator.js';
import { PrismaRepository } from './prisma.repository.js';

/**
 * Read-only master-data reference endpoints.
 *
 * These handlers intentionally keep the existing route, permission and
 * response contracts while leaving writes and permission-scoped aggregates in
 * DataController until their call graphs are independently mapped.
 */
@Controller()
export class MasterDataReferenceQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('master-data/surcharges')
  @RequirePermission('master-data:finance:read')
  async masterDataSurcharges() {
    return (await this.repository.getMasterData()).surcharges;
  }

  @Get('master-data/fuel-rates')
  @RequirePermission('master-data:finance:read')
  async masterDataFuelRates() {
    return (await this.repository.getMasterData()).fuelRates;
  }

  @Get('master-data/exchange-rates')
  @RequirePermission('master-data:exchange-rates:read')
  async masterDataExchangeRates() {
    return (await this.repository.getMasterData()).exchangeRates;
  }
}

import { Module } from '@nestjs/common';
import { DatabaseSeedService } from './database-seed.service.js';
import { InMemoryRepository } from './in-memory.repository.js';
import { PrismaRepository } from './prisma.repository.js';
import { PrismaRolePermissionReader } from './prisma-role-permissions.js';
import { PrismaService } from './prisma.service.js';
import { PrismaShipmentOverviewQueryRepository } from './shipment/overview/prisma-shipment-overview-query.repository.js';

export const usePrismaRepository =
  process.env.USE_PRISMA_REPOSITORY === 'false'
    ? false
    : process.env.USE_PRISMA_REPOSITORY === 'true' || Boolean(process.env.DATABASE_URL);

const dataAccessProviders = usePrismaRepository
  ? [PrismaService, PrismaRolePermissionReader, PrismaShipmentOverviewQueryRepository, PrismaRepository, DatabaseSeedService]
  : [{ provide: PrismaRepository, useClass: InMemoryRepository }];

const dataAccessExports = usePrismaRepository
  ? [PrismaService, PrismaRolePermissionReader, PrismaShipmentOverviewQueryRepository, PrismaRepository]
  : [PrismaRepository];

@Module({
  providers: dataAccessProviders,
  exports: dataAccessExports
})
export class DataAccessModule {}

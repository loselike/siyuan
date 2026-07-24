import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { AuthController } from './auth.controller.js';
import { DataController } from './data.controller.js';
import { DatabaseSeedService } from './database-seed.service.js';
import { FinanceCatalogController } from './finance/catalog/finance-catalog.controller.js';
import {
  FINANCE_CATALOG_REPOSITORY,
  InMemoryFinanceCatalogRepository,
  PrismaFinanceCatalogRepository
} from './finance/catalog/finance-catalog.repository.js';
import { FinanceCatalogService } from './finance/catalog/finance-catalog.service.js';
import { FinanceReceivableController } from './finance/receivable/finance-receivable.controller.js';
import { FinanceReceivableService } from './finance/receivable/finance-receivable.service.js';
import { InMemoryRepository } from './in-memory.repository.js';
import { LineageWatcher } from './lineage-watcher.js';
import { PrismaRepository } from './prisma.repository.js';
import { PrismaService } from './prisma.service.js';
import { RbacGuard } from './rbac.guard.js';
import { SystemDirectoryController } from './system/directory/system-directory.controller.js';
import { LegacySystemDirectoryRepository } from './system/directory/legacy-system-directory.repository.js';
import {
  PrismaSystemDirectoryRepository,
  SYSTEM_DIRECTORY_REPOSITORY
} from './system/directory/system-directory.repository.js';
import { SystemDirectoryService } from './system/directory/system-directory.service.js';

const usePrismaRepository =
  process.env.USE_PRISMA_REPOSITORY === 'false'
    ? false
    : process.env.USE_PRISMA_REPOSITORY === 'true' || Boolean(process.env.DATABASE_URL);

const repositoryProviders =
  usePrismaRepository
    ? [PrismaService, PrismaRepository, DatabaseSeedService]
    : [{ provide: PrismaRepository, useClass: InMemoryRepository }];

const financeCatalogRepositoryProvider = usePrismaRepository
  ? { provide: FINANCE_CATALOG_REPOSITORY, useClass: PrismaFinanceCatalogRepository }
  : { provide: FINANCE_CATALOG_REPOSITORY, useClass: InMemoryFinanceCatalogRepository };

const systemDirectoryRepositoryProvider = usePrismaRepository
  ? { provide: SYSTEM_DIRECTORY_REPOSITORY, useClass: PrismaSystemDirectoryRepository }
  : { provide: SYSTEM_DIRECTORY_REPOSITORY, useClass: LegacySystemDirectoryRepository };

@Module({
  controllers: [AuthController, DataController, AiController, FinanceCatalogController, FinanceReceivableController, SystemDirectoryController],
  providers: [
    AiService,
    LineageWatcher,
    ...repositoryProviders,
    financeCatalogRepositoryProvider,
    FinanceCatalogService,
    FinanceReceivableService,
    systemDirectoryRepositoryProvider,
    SystemDirectoryService,
    {
      provide: APP_GUARD,
      useClass: RbacGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}

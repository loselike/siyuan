import { Module } from '@nestjs/common';
import { DataAccessModule, usePrismaRepository } from '../../data-access.module.js';
import { PrismaRepository } from '../../prisma.repository.js';
import { FinanceCatalogController } from './finance-catalog.controller.js';
import {
  FINANCE_CATALOG_AUDIT_WRITER,
  LegacyFinanceCatalogAuditWriter,
  PrismaFinanceCatalogAuditWriter
} from './finance-catalog.audit.js';
import { FINANCE_CATALOG_AUTHORIZER } from './finance-catalog.authorization.js';
import { InMemoryFinanceCatalogRepository } from './finance-catalog.in-memory-repository.js';
import { PrismaFinanceCatalogRepository } from './finance-catalog.prisma-repository.js';
import { FINANCE_CATALOG_REPOSITORY } from './finance-catalog.repository.js';
import { FinanceCatalogService } from './finance-catalog.service.js';

const financeCatalogRepositoryProvider = usePrismaRepository
  ? { provide: FINANCE_CATALOG_REPOSITORY, useClass: PrismaFinanceCatalogRepository }
  : { provide: FINANCE_CATALOG_REPOSITORY, useClass: InMemoryFinanceCatalogRepository };

const financeCatalogAuditWriterProvider = usePrismaRepository
  ? { provide: FINANCE_CATALOG_AUDIT_WRITER, useClass: PrismaFinanceCatalogAuditWriter }
  : { provide: FINANCE_CATALOG_AUDIT_WRITER, useClass: LegacyFinanceCatalogAuditWriter };

const financeCatalogAuthorizerProvider = {
  provide: FINANCE_CATALOG_AUTHORIZER,
  useFactory: (repository: PrismaRepository) => ({
    hasPermission: repository.hasPermission.bind(repository),
    recordPermissionDenied: repository.recordPermissionDenied.bind(repository)
  }),
  inject: [PrismaRepository]
};

@Module({
  imports: [DataAccessModule],
  controllers: [FinanceCatalogController],
  providers: [
    FinanceCatalogService,
    financeCatalogRepositoryProvider,
    financeCatalogAuditWriterProvider,
    financeCatalogAuthorizerProvider
  ],
  exports: [FinanceCatalogService]
})
export class FinanceCatalogModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { AuthController } from './auth.controller.js';
import { CustomerServiceQueryController } from './customer-service/query/customer-service-query.controller.js';
import { DataController } from './data.controller.js';
import { DatabaseSeedService } from './database-seed.service.js';
import { FinanceCatalogController } from './finance/catalog/finance-catalog.controller.js';
import {
  FINANCE_CATALOG_AUDIT_WRITER,
  LegacyFinanceCatalogAuditWriter,
  PrismaFinanceCatalogAuditWriter
} from './finance/catalog/finance-catalog.audit.js';
import { InMemoryFinanceCatalogRepository } from './finance/catalog/finance-catalog.in-memory-repository.js';
import { PrismaFinanceCatalogRepository } from './finance/catalog/finance-catalog.prisma-repository.js';
import { FINANCE_CATALOG_REPOSITORY } from './finance/catalog/finance-catalog.repository.js';
import { FinanceCatalogService } from './finance/catalog/finance-catalog.service.js';
import { PayerBankAccountController } from './finance/payer-bank/payer-bank-account.controller.js';
import {
  InMemoryPayerBankAccountRepository,
  PAYER_BANK_ACCOUNT_REPOSITORY,
  PrismaPayerBankAccountRepository
} from './finance/payer-bank/payer-bank-account.repository.js';
import { PayerBankAccountService } from './finance/payer-bank/payer-bank-account.service.js';
import { FinanceReceivableController } from './finance/receivable/finance-receivable.controller.js';
import { FinanceReceivableService } from './finance/receivable/finance-receivable.service.js';
import { MiscFeeController } from './finance/misc-fee/misc-fee.controller.js';
import { MiscFeeService } from './finance/misc-fee/misc-fee.service.js';
import { InMemoryRepository } from './in-memory.repository.js';
import { LineageWatcher } from './lineage-watcher.js';
import { MasterDataChannelQueryController } from './master-data/channel/master-data-channel-query.controller.js';
import { AnnouncementController, NotificationController, NotificationOperationsController } from './notifications/notification.controller.js';
import {
  InMemoryNotificationService,
  NotificationAuditWorker,
  NotificationService,
  PrismaNotificationService
} from './notifications/notification.service.js';
import { OperationsLineShipmentQueryController } from './operations/line-shipment/operations-line-shipment-query.controller.js';
import { PriceBookQueryController } from './pricing/price-book/price-book-query.controller.js';
import { PrismaRepository } from './prisma.repository.js';
import { PrismaService } from './prisma.service.js';
import { RbacGuard } from './rbac.guard.js';
import { ShipmentFulfillmentQueryController } from './shipment/fulfillment/shipment-fulfillment-query.controller.js';
import { OrderEntryQueryController } from './shipment/order-entry/order-entry-query.controller.js';
import { ShipmentOverviewQueryController } from './shipment/overview/shipment-overview-query.controller.js';
import { SystemDirectoryController } from './system/directory/system-directory.controller.js';
import { LegacySystemDirectoryRepository } from './system/directory/legacy-system-directory.repository.js';
import {
  PrismaSystemDirectoryRepository,
  SYSTEM_DIRECTORY_REPOSITORY
} from './system/directory/system-directory.repository.js';
import { SystemDirectoryService } from './system/directory/system-directory.service.js';
import { WarehouseDispatchQueryController } from './warehouse/dispatch/warehouse-dispatch-query.controller.js';
import { WarehouseInventoryQueryController } from './warehouse/inventory/warehouse-inventory-query.controller.js';
import { LegacyWarehouseInventoryQueryRepository } from './warehouse/inventory/legacy-warehouse-inventory-query.repository.js';
import {
  PrismaWarehouseInventoryQueryRepository,
  WAREHOUSE_INVENTORY_QUERY_REPOSITORY
} from './warehouse/inventory/warehouse-inventory-query.repository.js';
import { LegacyWarehouseTallyQueryRepository } from './warehouse/tally/legacy-warehouse-tally-query.repository.js';
import {
  PrismaWarehouseTallyQueryRepository,
  WAREHOUSE_TALLY_QUERY_REPOSITORY
} from './warehouse/tally/warehouse-tally-query.repository.js';
import { WarehouseTallyQueryController } from './warehouse/tally/warehouse-tally-query.controller.js';

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

const financeCatalogAuditWriterProvider = usePrismaRepository
  ? { provide: FINANCE_CATALOG_AUDIT_WRITER, useClass: PrismaFinanceCatalogAuditWriter }
  : { provide: FINANCE_CATALOG_AUDIT_WRITER, useClass: LegacyFinanceCatalogAuditWriter };

const payerBankAccountRepositoryProvider = usePrismaRepository
  ? { provide: PAYER_BANK_ACCOUNT_REPOSITORY, useClass: PrismaPayerBankAccountRepository }
  : { provide: PAYER_BANK_ACCOUNT_REPOSITORY, useClass: InMemoryPayerBankAccountRepository };

const notificationServiceProvider = usePrismaRepository
  ? { provide: NotificationService, useClass: PrismaNotificationService }
  : { provide: NotificationService, useClass: InMemoryNotificationService };

const systemDirectoryRepositoryProvider = usePrismaRepository
  ? { provide: SYSTEM_DIRECTORY_REPOSITORY, useClass: PrismaSystemDirectoryRepository }
  : { provide: SYSTEM_DIRECTORY_REPOSITORY, useClass: LegacySystemDirectoryRepository };

const warehouseTallyQueryRepositoryProvider = usePrismaRepository
  ? { provide: WAREHOUSE_TALLY_QUERY_REPOSITORY, useClass: PrismaWarehouseTallyQueryRepository }
  : { provide: WAREHOUSE_TALLY_QUERY_REPOSITORY, useClass: LegacyWarehouseTallyQueryRepository };

const warehouseInventoryQueryRepositoryProvider = usePrismaRepository
  ? { provide: WAREHOUSE_INVENTORY_QUERY_REPOSITORY, useClass: PrismaWarehouseInventoryQueryRepository }
  : { provide: WAREHOUSE_INVENTORY_QUERY_REPOSITORY, useClass: LegacyWarehouseInventoryQueryRepository };

@Module({
  controllers: [
    AuthController,
    DataController,
    AiController,
    CustomerServiceQueryController,
    FinanceCatalogController,
    PayerBankAccountController,
    FinanceReceivableController,
    NotificationController,
    AnnouncementController,
    NotificationOperationsController,
    MiscFeeController,
    MasterDataChannelQueryController,
    OperationsLineShipmentQueryController,
    OrderEntryQueryController,
    PriceBookQueryController,
    ShipmentFulfillmentQueryController,
    ShipmentOverviewQueryController,
    SystemDirectoryController,
    WarehouseDispatchQueryController,
    WarehouseInventoryQueryController,
    WarehouseTallyQueryController
  ],
  providers: [
    AiService,
    LineageWatcher,
    ...repositoryProviders,
    financeCatalogRepositoryProvider,
    financeCatalogAuditWriterProvider,
    payerBankAccountRepositoryProvider,
    FinanceCatalogService,
    PayerBankAccountService,
    FinanceReceivableService,
    notificationServiceProvider,
    ...(usePrismaRepository ? [NotificationAuditWorker] : []),
    MiscFeeService,
    systemDirectoryRepositoryProvider,
    SystemDirectoryService,
    warehouseInventoryQueryRepositoryProvider,
    warehouseTallyQueryRepositoryProvider,
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

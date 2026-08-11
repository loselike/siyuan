import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { AuthController } from './auth.controller.js';
import { HealthController } from './health.controller.js';
import { CustomerServiceQueryController } from './customer-service/query/customer-service-query.controller.js';
import { CustomerServiceDataConfirmController } from './customer-service/data-confirm/customer-service-data-confirm.controller.js';
import { CUSTOMER_SERVICE_DATA_CONFIRM_REPOSITORY } from './customer-service/data-confirm/customer-service-data-confirm.repository.js';
import { CustomerServiceDataConfirmService } from './customer-service/data-confirm/customer-service-data-confirm.service.js';
import { ProblemTicketTagController } from './customer-service/problem-tag/problem-ticket-tag.controller.js';
import { PROBLEM_TICKET_TAG_REPOSITORY } from './customer-service/problem-tag/problem-ticket-tag.repository.js';
import { ProblemTicketTagService } from './customer-service/problem-tag/problem-ticket-tag.service.js';
import { LegacyProblemTicketQueryRepository } from './customer-service/problem-ticket/problem-ticket-query.legacy-repository.js';
import { PrismaProblemTicketQueryRepository } from './customer-service/problem-ticket/problem-ticket-query.prisma-repository.js';
import { PROBLEM_TICKET_QUERY_REPOSITORY } from './customer-service/problem-ticket/problem-ticket-query.repository.js';
import { ProblemTicketQueryService } from './customer-service/problem-ticket/problem-ticket-query.service.js';
import { DataController } from './data.controller.js';
import { DatabaseSeedService } from './database-seed.service.js';
import { FinanceCatalogController } from './finance/catalog/finance-catalog.controller.js';
import {
  FINANCE_CATALOG_AUDIT_WRITER,
  LegacyFinanceCatalogAuditWriter,
  PrismaFinanceCatalogAuditWriter
} from './finance/catalog/finance-catalog.audit.js';
import { FINANCE_CATALOG_AUTHORIZER } from './finance/catalog/finance-catalog.authorization.js';
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
import { WATER_RECEIPT_ALLOCATION_REPOSITORY } from './finance/water-receipt/water-receipt-allocation.repository.js';
import { WaterReceiptAllocationService } from './finance/water-receipt/water-receipt-allocation.service.js';
import { WATER_RECEIPT_LIFECYCLE_REPOSITORY } from './finance/water-receipt/water-receipt-lifecycle.repository.js';
import { WaterReceiptLifecycleService } from './finance/water-receipt/water-receipt-lifecycle.service.js';
import { MiscFeeController } from './finance/misc-fee/misc-fee.controller.js';
import { MiscFeeService } from './finance/misc-fee/misc-fee.service.js';
import { InMemoryRepository } from './in-memory.repository.js';
import { LineageWatcher } from './lineage-watcher.js';
import { LineageQueryController } from './lineage-query.controller.js';
import { MasterDataChannelQueryController } from './master-data/channel/master-data-channel-query.controller.js';
import { MasterDataReferenceQueryController } from './master-data-reference-query.controller.js';
import { AnnouncementController, NotificationController, NotificationOperationsController } from './notifications/notification.controller.js';
import {
  InMemoryNotificationService,
  NotificationAuditWorker,
  NotificationService,
  PrismaNotificationService
} from './notifications/notification.service.js';
import { OperationsLineShipmentQueryController } from './operations/line-shipment/operations-line-shipment-query.controller.js';
import { PriceBookQueryController } from './pricing/price-book/price-book-query.controller.js';
import {
  LegacyPriceBookQueryRepository,
  PRICE_BOOK_QUERY_REPOSITORY,
  PrismaPriceBookQueryRepository
} from './pricing/price-book/price-book-query.repository.js';
import { PrismaRepository } from './prisma.repository.js';
import { PrismaService } from './prisma.service.js';
import { RbacGuard } from './rbac.guard.js';
import { ShipmentLabelLifecycleController } from './shipment/fulfillment/shipment-fulfillment-query.controller.js';
import { ShipmentLabelFileStorage } from './shipment/fulfillment/shipment-label-file.storage.js';
import {
  SHIPMENT_LABEL_LIFECYCLE_AUTHORIZER,
  SHIPMENT_LABEL_LIFECYCLE_REPOSITORY
} from './shipment/fulfillment/shipment-label-lifecycle.repository.js';
import { ShipmentLabelLifecycleService } from './shipment/fulfillment/shipment-label-lifecycle.service.js';
import { ShipmentBusinessInvoiceController } from './shipment/invoice/shipment-business-invoice.controller.js';
import { ShipmentBusinessInvoiceFileStorage } from './shipment/invoice/shipment-business-invoice-file.storage.js';
import { SHIPMENT_BUSINESS_INVOICE_REPOSITORY } from './shipment/invoice/shipment-business-invoice.repository.js';
import { ShipmentBusinessInvoiceService } from './shipment/invoice/shipment-business-invoice.service.js';
import { OrderEntryQueryController } from './shipment/order-entry/order-entry-query.controller.js';
import { ShipmentOverviewQueryController } from './shipment/overview/shipment-overview-query.controller.js';
import { SystemDirectoryController } from './system/directory/system-directory.controller.js';
import { LegacySystemDirectoryRepository } from './system/directory/legacy-system-directory.repository.js';
import {
  PrismaSystemDirectoryRepository,
  SYSTEM_DIRECTORY_REPOSITORY
} from './system/directory/system-directory.repository.js';
import { SystemDirectoryService } from './system/directory/system-directory.service.js';
import { TrackingQueryController } from './tracking/query/tracking-query.controller.js';
import { LegacyTrackingQueryRepository } from './tracking/query/legacy-tracking-query.repository.js';
import {
  PrismaTrackingQueryRepository,
  TRACKING_QUERY_REPOSITORY
} from './tracking/query/tracking-query.repository.js';
import { TrackingImportCommandController } from './tracking/import/tracking-import-command.controller.js';
import { TRACKING_IMPORT_COMMAND_REPOSITORY } from './tracking/import/tracking-import-command.repository.js';
import { TrackingImportCommandService } from './tracking/import/tracking-import-command.service.js';
import { TrackingManualEventCommandController } from './tracking/event/tracking-manual-event-command.controller.js';
import { TRACKING_MANUAL_EVENT_COMMAND_REPOSITORY } from './tracking/event/tracking-manual-event-command.repository.js';
import { TrackingManualEventCommandService } from './tracking/event/tracking-manual-event-command.service.js';
import { CarrierTaskCommandController } from './tracking/task/carrier-task-command.controller.js';
import { CARRIER_TASK_COMMAND_REPOSITORY } from './tracking/task/carrier-task-command.repository.js';
import { CarrierTaskCommandService } from './tracking/task/carrier-task-command.service.js';
import { WarehouseDispatchController } from './warehouse/dispatch/warehouse-dispatch-query.controller.js';
import {
  WAREHOUSE_DISPATCH_AUTHORIZER,
  WAREHOUSE_DISPATCH_REPOSITORY
} from './warehouse/dispatch/warehouse-dispatch.repository.js';
import { WarehouseDispatchService } from './warehouse/dispatch/warehouse-dispatch.service.js';
import { WarehouseInventoryQueryController } from './warehouse/inventory/warehouse-inventory-query.controller.js';
import { LegacyWarehouseInventoryQueryRepository } from './warehouse/inventory/legacy-warehouse-inventory-query.repository.js';
import {
  PrismaWarehouseInventoryQueryRepository,
  WAREHOUSE_INVENTORY_QUERY_AUTHORIZER,
  WAREHOUSE_INVENTORY_QUERY_REPOSITORY
} from './warehouse/inventory/warehouse-inventory-query.repository.js';
import { WarehouseInventoryQueryService } from './warehouse/inventory/warehouse-inventory-query.service.js';
import { WarehousePackageLifecycleController } from './warehouse/package/warehouse-package-lifecycle.controller.js';
import { WAREHOUSE_PACKAGE_LIFECYCLE_REPOSITORY } from './warehouse/package/warehouse-package-lifecycle.repository.js';
import { WarehousePackageLifecycleService } from './warehouse/package/warehouse-package-lifecycle.service.js';
import { WarehouseMachineImportController } from './warehouse/package/warehouse-machine-import.controller.js';
import { WAREHOUSE_MACHINE_IMPORT_REPOSITORY } from './warehouse/package/warehouse-machine-import.repository.js';
import { WarehouseMachineImportService } from './warehouse/package/warehouse-machine-import.service.js';
import { WarehouseRentController } from './warehouse/rent/warehouse-rent.controller.js';
import { WAREHOUSE_RENT_REPOSITORY } from './warehouse/rent/warehouse-rent.repository.js';
import { WarehouseRentService } from './warehouse/rent/warehouse-rent.service.js';
import { LegacyWarehouseTallyQueryRepository } from './warehouse/tally/legacy-warehouse-tally-query.repository.js';
import {
  PrismaWarehouseTallyQueryRepository,
  WAREHOUSE_TALLY_QUERY_REPOSITORY
} from './warehouse/tally/warehouse-tally-query.repository.js';
import { WarehouseTallyQueryController } from './warehouse/tally/warehouse-tally-query.controller.js';
import { WarehouseTallyQueryService } from './warehouse/tally/warehouse-tally-query.service.js';
import { WarehouseTallyLabelController } from './warehouse/tally/warehouse-tally-label.controller.js';
import { WAREHOUSE_TALLY_LABEL_REPOSITORY } from './warehouse/tally/warehouse-tally-label.repository.js';
import { WarehouseTallyLabelService } from './warehouse/tally/warehouse-tally-label.service.js';
import { WarehouseTallyCorrectionController } from './warehouse/tally/warehouse-tally-correction.controller.js';
import { WAREHOUSE_TALLY_CORRECTION_REPOSITORY } from './warehouse/tally/warehouse-tally-correction.repository.js';
import { WarehouseTallyCorrectionService } from './warehouse/tally/warehouse-tally-correction.service.js';
import { WarehouseTallyLifecycleController } from './warehouse/tally/warehouse-tally-lifecycle.controller.js';
import { WAREHOUSE_TALLY_LIFECYCLE_REPOSITORY } from './warehouse/tally/warehouse-tally-lifecycle.repository.js';
import { WarehouseTallyLifecycleService } from './warehouse/tally/warehouse-tally-lifecycle.service.js';
import { WarehouseTallyOperationsController } from './warehouse/tally/warehouse-tally-operations.controller.js';
import { WAREHOUSE_TALLY_OPERATIONS_REPOSITORY } from './warehouse/tally/warehouse-tally-operations.repository.js';
import { WarehouseTallyOperationsService } from './warehouse/tally/warehouse-tally-operations.service.js';
import { UserTablePreferenceController } from './user-table-preference.controller.js';
import {
  InMemoryUserTablePreferenceService,
  PrismaUserTablePreferenceService,
  UserTablePreferenceService
} from './user-table-preference.service.js';

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

const financeCatalogAuthorizerProvider = {
  provide: FINANCE_CATALOG_AUTHORIZER,
  useFactory: (repository: PrismaRepository) => ({
    hasPermission: repository.hasPermission.bind(repository),
    recordPermissionDenied: repository.recordPermissionDenied.bind(repository)
  }),
  inject: [PrismaRepository]
};

const waterReceiptAllocationRepositoryProvider = {
  provide: WATER_RECEIPT_ALLOCATION_REPOSITORY,
  useExisting: PrismaRepository
};

const waterReceiptLifecycleRepositoryProvider = {
  provide: WATER_RECEIPT_LIFECYCLE_REPOSITORY,
  useExisting: PrismaRepository
};

const warehouseTallyLifecycleRepositoryProvider = {
  provide: WAREHOUSE_TALLY_LIFECYCLE_REPOSITORY,
  useExisting: PrismaRepository
};

const warehouseTallyLabelRepositoryProvider = {
  provide: WAREHOUSE_TALLY_LABEL_REPOSITORY,
  useExisting: PrismaRepository
};

const warehouseTallyCorrectionRepositoryProvider = {
  provide: WAREHOUSE_TALLY_CORRECTION_REPOSITORY,
  useExisting: PrismaRepository
};

const warehouseTallyOperationsRepositoryProvider = {
  provide: WAREHOUSE_TALLY_OPERATIONS_REPOSITORY,
  useExisting: PrismaRepository
};

const warehouseRentRepositoryProvider = {
  provide: WAREHOUSE_RENT_REPOSITORY,
  useExisting: PrismaRepository
};

const warehousePackageLifecycleRepositoryProvider = {
  provide: WAREHOUSE_PACKAGE_LIFECYCLE_REPOSITORY,
  useExisting: PrismaRepository
};

const warehouseMachineImportRepositoryProvider = {
  provide: WAREHOUSE_MACHINE_IMPORT_REPOSITORY,
  useExisting: PrismaRepository
};

const warehouseDispatchRepositoryProvider = {
  provide: WAREHOUSE_DISPATCH_REPOSITORY,
  useExisting: PrismaRepository
};

const warehouseDispatchAuthorizerProvider = {
  provide: WAREHOUSE_DISPATCH_AUTHORIZER,
  useExisting: PrismaRepository
};

const shipmentLabelLifecycleRepositoryProvider = {
  provide: SHIPMENT_LABEL_LIFECYCLE_REPOSITORY,
  useExisting: PrismaRepository
};

const shipmentLabelLifecycleAuthorizerProvider = {
  provide: SHIPMENT_LABEL_LIFECYCLE_AUTHORIZER,
  useExisting: PrismaRepository
};

const shipmentBusinessInvoiceRepositoryProvider = {
  provide: SHIPMENT_BUSINESS_INVOICE_REPOSITORY,
  useExisting: PrismaRepository
};

const problemTicketQueryRepositoryProvider = usePrismaRepository
  ? { provide: PROBLEM_TICKET_QUERY_REPOSITORY, useClass: PrismaProblemTicketQueryRepository }
  : { provide: PROBLEM_TICKET_QUERY_REPOSITORY, useClass: LegacyProblemTicketQueryRepository };

const problemTicketTagRepositoryProvider = {
  provide: PROBLEM_TICKET_TAG_REPOSITORY,
  useExisting: PrismaRepository
};

const customerServiceDataConfirmRepositoryProvider = {
  provide: CUSTOMER_SERVICE_DATA_CONFIRM_REPOSITORY,
  useExisting: PrismaRepository
};

const payerBankAccountRepositoryProvider = usePrismaRepository
  ? { provide: PAYER_BANK_ACCOUNT_REPOSITORY, useClass: PrismaPayerBankAccountRepository }
  : { provide: PAYER_BANK_ACCOUNT_REPOSITORY, useClass: InMemoryPayerBankAccountRepository };

const notificationServiceProvider = usePrismaRepository
  ? { provide: NotificationService, useClass: PrismaNotificationService }
  : { provide: NotificationService, useClass: InMemoryNotificationService };

const userTablePreferenceServiceProvider = usePrismaRepository
  ? { provide: UserTablePreferenceService, useClass: PrismaUserTablePreferenceService }
  : { provide: UserTablePreferenceService, useClass: InMemoryUserTablePreferenceService };

const systemDirectoryRepositoryProvider = usePrismaRepository
  ? { provide: SYSTEM_DIRECTORY_REPOSITORY, useClass: PrismaSystemDirectoryRepository }
  : { provide: SYSTEM_DIRECTORY_REPOSITORY, useClass: LegacySystemDirectoryRepository };

const warehouseTallyQueryRepositoryProvider = usePrismaRepository
  ? { provide: WAREHOUSE_TALLY_QUERY_REPOSITORY, useClass: PrismaWarehouseTallyQueryRepository }
  : { provide: WAREHOUSE_TALLY_QUERY_REPOSITORY, useClass: LegacyWarehouseTallyQueryRepository };

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

const trackingQueryRepositoryProvider = usePrismaRepository
  ? { provide: TRACKING_QUERY_REPOSITORY, useClass: PrismaTrackingQueryRepository }
  : { provide: TRACKING_QUERY_REPOSITORY, useClass: LegacyTrackingQueryRepository };

const trackingImportCommandRepositoryProvider = {
  provide: TRACKING_IMPORT_COMMAND_REPOSITORY,
  useExisting: PrismaRepository
};

const trackingManualEventCommandRepositoryProvider = {
  provide: TRACKING_MANUAL_EVENT_COMMAND_REPOSITORY,
  useExisting: PrismaRepository
};

const carrierTaskCommandRepositoryProvider = {
  provide: CARRIER_TASK_COMMAND_REPOSITORY,
  useExisting: PrismaRepository
};

const priceBookQueryRepositoryProvider = usePrismaRepository
  ? { provide: PRICE_BOOK_QUERY_REPOSITORY, useClass: PrismaPriceBookQueryRepository }
  : { provide: PRICE_BOOK_QUERY_REPOSITORY, useClass: LegacyPriceBookQueryRepository };

@Module({
  controllers: [
    AuthController,
    HealthController,
    DataController,
    LineageQueryController,
    MasterDataReferenceQueryController,
    AiController,
    CustomerServiceQueryController,
    CustomerServiceDataConfirmController,
    ProblemTicketTagController,
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
    ShipmentBusinessInvoiceController,
    ShipmentLabelLifecycleController,
    ShipmentOverviewQueryController,
    SystemDirectoryController,
    TrackingQueryController,
    TrackingImportCommandController,
    TrackingManualEventCommandController,
    CarrierTaskCommandController,
    WarehouseDispatchController,
    WarehouseInventoryQueryController,
    WarehouseMachineImportController,
    WarehousePackageLifecycleController,
    WarehouseRentController,
    WarehouseTallyCorrectionController,
    WarehouseTallyLabelController,
    WarehouseTallyLifecycleController,
    WarehouseTallyOperationsController,
    WarehouseTallyQueryController,
    UserTablePreferenceController
  ],
  providers: [
    AiService,
    LineageWatcher,
    ...repositoryProviders,
    financeCatalogRepositoryProvider,
    financeCatalogAuditWriterProvider,
    financeCatalogAuthorizerProvider,
    problemTicketQueryRepositoryProvider,
    payerBankAccountRepositoryProvider,
    FinanceCatalogService,
    ProblemTicketQueryService,
    CustomerServiceDataConfirmService,
    customerServiceDataConfirmRepositoryProvider,
    ProblemTicketTagService,
    problemTicketTagRepositoryProvider,
    PayerBankAccountService,
    FinanceReceivableService,
    WaterReceiptAllocationService,
    waterReceiptAllocationRepositoryProvider,
    WaterReceiptLifecycleService,
    waterReceiptLifecycleRepositoryProvider,
    WarehouseInventoryQueryService,
    WarehouseDispatchService,
    warehouseDispatchRepositoryProvider,
    warehouseDispatchAuthorizerProvider,
    ShipmentLabelLifecycleService,
    ShipmentLabelFileStorage,
    shipmentLabelLifecycleRepositoryProvider,
    shipmentLabelLifecycleAuthorizerProvider,
    ShipmentBusinessInvoiceService,
    ShipmentBusinessInvoiceFileStorage,
    shipmentBusinessInvoiceRepositoryProvider,
    WarehouseMachineImportService,
    warehouseMachineImportRepositoryProvider,
    WarehousePackageLifecycleService,
    warehousePackageLifecycleRepositoryProvider,
    WarehouseRentService,
    warehouseRentRepositoryProvider,
    WarehouseTallyQueryService,
    WarehouseTallyCorrectionService,
    warehouseTallyCorrectionRepositoryProvider,
    WarehouseTallyLabelService,
    warehouseTallyLabelRepositoryProvider,
    WarehouseTallyLifecycleService,
    warehouseTallyLifecycleRepositoryProvider,
    WarehouseTallyOperationsService,
    warehouseTallyOperationsRepositoryProvider,
    notificationServiceProvider,
    userTablePreferenceServiceProvider,
    ...(usePrismaRepository ? [NotificationAuditWorker] : []),
    MiscFeeService,
    systemDirectoryRepositoryProvider,
    trackingQueryRepositoryProvider,
    TrackingImportCommandService,
    trackingImportCommandRepositoryProvider,
    TrackingManualEventCommandService,
    trackingManualEventCommandRepositoryProvider,
    CarrierTaskCommandService,
    carrierTaskCommandRepositoryProvider,
    priceBookQueryRepositoryProvider,
    SystemDirectoryService,
    warehouseInventoryQueryRepositoryProvider,
    warehouseInventoryQueryAuthorizerProvider,
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

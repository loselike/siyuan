# Prisma 模型目录基线

> “候选领域”是按模型名称形成的治理假设，必须在后续领域访谈中确认；关系只记录 Prisma 类型引用。

| 模型 | 候选领域 | 关联模型 | 证据 |
| --- | --- | --- | --- |
| `User` | identity-access | `Customer`, `Department`, `LoginLog`, `NotificationDelivery`, `NotificationPreference`, `Role`, `UserModuleReadState`, `WaterReceipt` | `apps/api/prisma/schema.prisma:38` |
| `UserModuleReadState` | identity-access | `User` | `apps/api/prisma/schema.prisma:63` |
| `Role` | identity-access | `Permission`, `User` | `apps/api/prisma/schema.prisma:78` |
| `Permission` | identity-access | `Role` | `apps/api/prisma/schema.prisma:91` |
| `Department` | identity-access | `User` | `apps/api/prisma/schema.prisma:97` |
| `Customer` | master-data | `CustomerAccount`, `CustomerContact`, `Shipment`, `User`, `WaterReceipt` | `apps/api/prisma/schema.prisma:104` |
| `CustomerContact` | master-data | `Customer` | `apps/api/prisma/schema.prisma:119` |
| `CustomerAccount` | master-data | `Customer` | `apps/api/prisma/schema.prisma:135` |
| `Agent` | master-data | `AgentBankAccount`, `AgentChannel`, `PayeeBankAccount`, `PaymentVoucher`, `Shipment`, `ShipmentFinanceItem` | `apps/api/prisma/schema.prisma:143` |
| `AgentChannel` | master-data | `Agent` | `apps/api/prisma/schema.prisma:173` |
| `Carrier` | master-data | `Channel` | `apps/api/prisma/schema.prisma:183` |
| `Channel` | master-data | `Carrier`, `PricingRule`, `Shipment` | `apps/api/prisma/schema.prisma:190` |
| `ChannelCategory` | master-data | — | `apps/api/prisma/schema.prisma:220` |
| `Site` | master-data | — | `apps/api/prisma/schema.prisma:228` |
| `Shipment` | shipment-flow | `Agent`, `CarrierTask`, `Channel`, `Customer`, `PayableFee`, `PayablePaymentApplication`, `PaymentApplicationItem`, `ProblemTicket`, `ReceivableFee`, `ShipmentEvent`, `ShipmentFinanceItem`, `ShipmentLabel`, `ShipmentPackage`, `TrackingEvent`, `WaterReceiptMatch`, `WaterReceiptMatchRequest` | `apps/api/prisma/schema.prisma:239` |
| `ShipmentLabel` | shipment-flow | `Shipment` | `apps/api/prisma/schema.prisma:329` |
| `CarrierTask` | tracking | `Shipment` | `apps/api/prisma/schema.prisma:343` |
| `ShipmentPackage` | shipment-flow | `Shipment` | `apps/api/prisma/schema.prisma:358` |
| `ShipmentEvent` | shipment-flow | `Shipment` | `apps/api/prisma/schema.prisma:369` |
| `TrackingEvent` | tracking | `Shipment` | `apps/api/prisma/schema.prisma:379` |
| `ProblemTicket` | customer-service | `ProblemReply`, `Shipment` | `apps/api/prisma/schema.prisma:396` |
| `CommonTag` | customer-service | — | `apps/api/prisma/schema.prisma:413` |
| `ProblemReply` | customer-service | `ProblemTicket` | `apps/api/prisma/schema.prisma:429` |
| `PriceProduct` | pricing | `PriceRule`, `PriceZone` | `apps/api/prisma/schema.prisma:438` |
| `PriceZone` | pricing | `PriceProduct` | `apps/api/prisma/schema.prisma:446` |
| `PriceRule` | pricing | `PriceProduct` | `apps/api/prisma/schema.prisma:454` |
| `PricingRule` | pricing | `Channel` | `apps/api/prisma/schema.prisma:464` |
| `PriceBook` | pricing | `LegacyPricingSource`, `PriceBookRow` | `apps/api/prisma/schema.prisma:476` |
| `AgentPriceBookDefaultRemark` | pricing | — | `apps/api/prisma/schema.prisma:498` |
| `PriceBookImportJob` | pricing | — | `apps/api/prisma/schema.prisma:510` |
| `DubaiPriceDisplayVersion` | pricing | `DubaiPriceDisplayPage` | `apps/api/prisma/schema.prisma:539` |
| `DubaiPriceDisplayPage` | pricing | `DubaiPriceDisplayVersion` | `apps/api/prisma/schema.prisma:565` |
| `PriceBookRow` | pricing | `PriceBook` | `apps/api/prisma/schema.prisma:581` |
| `LegacyPricingSource` | pricing | `LegacyPricingRow`, `PriceBook` | `apps/api/prisma/schema.prisma:615` |
| `LegacyPricingRow` | pricing | `LegacyPricingSource` | `apps/api/prisma/schema.prisma:632` |
| `AgentMarkupRule` | pricing | — | `apps/api/prisma/schema.prisma:667` |
| `AgentChannelCustomRemark` | pricing | — | `apps/api/prisma/schema.prisma:696` |
| `SouthAfricaRateImage` | pricing | — | `apps/api/prisma/schema.prisma:711` |
| `SouthAfricaRateRule` | pricing | — | `apps/api/prisma/schema.prisma:726` |
| `SouthAfricaLookupPendingReview` | pricing | — | `apps/api/prisma/schema.prisma:748` |
| `WarehousePackage` | warehouse | `WarehouseConsolidationItem` | `apps/api/prisma/schema.prisma:761` |
| `MojiaRequestSample` | warehouse | — | `apps/api/prisma/schema.prisma:818` |
| `WarehouseRentRule` | warehouse | — | `apps/api/prisma/schema.prisma:836` |
| `WarehouseConsolidation` | warehouse | `WarehouseConsolidationItem` | `apps/api/prisma/schema.prisma:861` |
| `WarehouseConsolidationItem` | warehouse | `WarehouseConsolidation`, `WarehousePackage` | `apps/api/prisma/schema.prisma:875` |
| `WarehouseTallyTask` | warehouse | — | `apps/api/prisma/schema.prisma:885` |
| `Surcharge` | finance | — | `apps/api/prisma/schema.prisma:941` |
| `FuelRate` | finance | — | `apps/api/prisma/schema.prisma:948` |
| `ExchangeRate` | finance | — | `apps/api/prisma/schema.prisma:955` |
| `ReceivableFee` | finance | `Shipment`, `WaterReceiptMatch`, `WaterReceiptMatchRequest` | `apps/api/prisma/schema.prisma:965` |
| `PayableFee` | finance | `Shipment` | `apps/api/prisma/schema.prisma:996` |
| `ShipmentFinanceItem` | finance | `Agent`, `PayablePaymentApplication`, `PaymentApplicationItem`, `Shipment`, `WaterReceiptMatch`, `WaterReceiptMatchRequest` | `apps/api/prisma/schema.prisma:1005` |
| `AgentBankAccount` | finance | `Agent`, `PayablePaymentApplication` | `apps/api/prisma/schema.prisma:1048` |
| `PayablePaymentApplication` | finance | `AgentBankAccount`, `PayableBillAttachment`, `PayeeBankAccount`, `PaymentApplicationItem`, `Shipment`, `ShipmentFinanceItem` | `apps/api/prisma/schema.prisma:1067` |
| `PayableBillAttachment` | finance | `PayablePaymentApplication` | `apps/api/prisma/schema.prisma:1096` |
| `PayeeBankAccount` | finance | `Agent`, `PayablePaymentApplication`, `PaymentApplication` | `apps/api/prisma/schema.prisma:1110` |
| `PaymentApplication` | finance | `PayeeBankAccount`, `PaymentApplicationItem`, `PaymentVoucher` | `apps/api/prisma/schema.prisma:1130` |
| `PaymentApplicationItem` | finance | `PayablePaymentApplication`, `PaymentApplication`, `Shipment`, `ShipmentFinanceItem` | `apps/api/prisma/schema.prisma:1163` |
| `PaymentVoucher` | finance | `Agent`, `PaymentApplication` | `apps/api/prisma/schema.prisma:1181` |
| `FinanceCatalogItem` | master-data | — | `apps/api/prisma/schema.prisma:1232` |
| `PayerBankAccount` | master-data | — | `apps/api/prisma/schema.prisma:1246` |
| `CustomerStatement` | finance | — | `apps/api/prisma/schema.prisma:1260` |
| `AgentStatement` | finance | — | `apps/api/prisma/schema.prisma:1268` |
| `Payment` | finance | — | `apps/api/prisma/schema.prisma:1276` |
| `Settlement` | finance | — | `apps/api/prisma/schema.prisma:1284` |
| `AccountLedger` | finance | `WaterReceipt` | `apps/api/prisma/schema.prisma:1292` |
| `WaterReceipt` | finance | `AccountLedger`, `Customer`, `User`, `WaterReceiptMatch`, `WaterReceiptMatchRequest`, `WaterReceiptVoucher` | `apps/api/prisma/schema.prisma:1303` |
| `WaterReceiptMatch` | finance | `ReceivableFee`, `Shipment`, `ShipmentFinanceItem`, `WaterReceipt` | `apps/api/prisma/schema.prisma:1347` |
| `WaterReceiptMatchRequest` | finance | `ReceivableFee`, `Shipment`, `ShipmentFinanceItem`, `WaterReceipt` | `apps/api/prisma/schema.prisma:1372` |
| `WaterReceiptVoucher` | finance | `WaterReceipt` | `apps/api/prisma/schema.prisma:1407` |
| `ImportJob` | platform | — | `apps/api/prisma/schema.prisma:1421` |
| `ExportJob` | platform | — | `apps/api/prisma/schema.prisma:1428` |
| `AuditLog` | platform | — | `apps/api/prisma/schema.prisma:1435` |
| `Announcement` | notifications | `Notification` | `apps/api/prisma/schema.prisma:1449` |
| `Notification` | notifications | `Announcement`, `NotificationDelivery` | `apps/api/prisma/schema.prisma:1472` |
| `NotificationDelivery` | notifications | `Notification`, `User` | `apps/api/prisma/schema.prisma:1502` |
| `NotificationActionTask` | notifications | — | `apps/api/prisma/schema.prisma:1518` |
| `NotificationActionTaskWatermark` | notifications | — | `apps/api/prisma/schema.prisma:1547` |
| `NotificationEventCursor` | notifications | — | `apps/api/prisma/schema.prisma:1559` |
| `NotificationEventProcessing` | notifications | — | `apps/api/prisma/schema.prisma:1567` |
| `NotificationPreference` | notifications | `User` | `apps/api/prisma/schema.prisma:1586` |
| `LoginLog` | identity-access | `User` | `apps/api/prisma/schema.prisma:1599` |

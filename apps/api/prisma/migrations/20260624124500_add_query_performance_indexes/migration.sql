CREATE INDEX IF NOT EXISTS "Shipment_status_createdAt_idx" ON "Shipment"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Shipment_customerId_createdAt_idx" ON "Shipment"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Shipment_deletedAt_createdAt_idx" ON "Shipment"("deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "PriceBook_deletedAt_importedAt_idx" ON "PriceBook"("deletedAt", "importedAt");
CREATE INDEX IF NOT EXISTS "PriceBookRow_priceBookId_idx" ON "PriceBookRow"("priceBookId");
CREATE INDEX IF NOT EXISTS "PriceBookRow_destinationCountry_minWeightKg_maxWeightKg_idx" ON "PriceBookRow"("destinationCountry", "minWeightKg", "maxWeightKg");
CREATE INDEX IF NOT EXISTS "PriceBookRow_warehouseCode_destinationCountry_idx" ON "PriceBookRow"("warehouseCode", "destinationCountry");

CREATE INDEX IF NOT EXISTS "WarehousePackage_customerOrderNo_domesticTrackingNo_idx" ON "WarehousePackage"("customerOrderNo", "domesticTrackingNo");
CREATE INDEX IF NOT EXISTS "WarehousePackage_shipmentId_createdAt_idx" ON "WarehousePackage"("shipmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "WarehousePackage_status_scanTime_idx" ON "WarehousePackage"("status", "scanTime");
CREATE INDEX IF NOT EXISTS "WarehousePackage_combinedOrderNo_idx" ON "WarehousePackage"("combinedOrderNo");

CREATE INDEX IF NOT EXISTS "ReceivableFee_shipmentId_createdAt_idx" ON "ReceivableFee"("shipmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReceivableFee_voided_reconciliationStatus_createdAt_idx" ON "ReceivableFee"("voided", "reconciliationStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "ShipmentFinanceItem_shipmentId_type_idx" ON "ShipmentFinanceItem"("shipmentId", "type");
CREATE INDEX IF NOT EXISTS "ShipmentFinanceItem_type_voided_createdAt_idx" ON "ShipmentFinanceItem"("type", "voided", "createdAt");
CREATE INDEX IF NOT EXISTS "ShipmentFinanceItem_reconciliationStatus_createdAt_idx" ON "ShipmentFinanceItem"("reconciliationStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

CREATE INDEX IF NOT EXISTS "LoginLog_userId_createdAt_idx" ON "LoginLog"("userId", "createdAt");

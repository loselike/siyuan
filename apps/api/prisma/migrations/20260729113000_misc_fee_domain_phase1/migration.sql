-- Dedicated miscellaneous-fee domain. Existing order payable rows keep their
-- ORDER_PAYABLE source and remain valid while customer-level misc payables are added.

CREATE TABLE "MiscFeeImportBatch" (
  "id" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'KUAYUE',
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "fileUrl" TEXT,
  "checksum" TEXT NOT NULL,
  "previewToken" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREVIEW',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "validRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "duplicateRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "committedBy" TEXT,
  "committedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MiscFeeImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MiscFeeImportLine" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "rowNo" INTEGER NOT NULL,
  "dedupeKey" TEXT,
  "kuayueBillNo" TEXT,
  "occurredAt" TIMESTAMP(3),
  "pieceCount" INTEGER,
  "chargeWeightKg" DECIMAL(14,4),
  "freightAmount" DECIMAL(14,2),
  "insuranceAmount" DECIMAL(14,2),
  "overageAmount" DECIMAL(14,2),
  "oversizeAmount" DECIMAL(14,2),
  "discountAmount" DECIMAL(14,2),
  "payableAmount" DECIMAL(14,2),
  "sender" TEXT,
  "receiver" TEXT,
  "serviceType" TEXT,
  "raw" JSONB NOT NULL,
  "valid" BOOLEAN NOT NULL DEFAULT false,
  "duplicate" BOOLEAN NOT NULL DEFAULT false,
  "errors" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MiscFeeImportLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MiscFeeRecord" (
  "id" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "businessNo" TEXT,
  "feeName" TEXT NOT NULL,
  "ownerType" TEXT NOT NULL DEFAULT 'EXTERNAL',
  "ownerName" TEXT,
  "agentId" TEXT,
  "agentName" TEXT,
  "customerId" TEXT NOT NULL,
  "customerCodeSnapshot" TEXT NOT NULL,
  "customerNameSnapshot" TEXT NOT NULL,
  "salespersonSnapshot" TEXT,
  "shipmentId" TEXT,
  "systemOrderNoSnapshot" TEXT,
  "customerOrderNoSnapshot" TEXT,
  "transferNoSnapshot" TEXT,
  "cargoSnapshot" JSONB,
  "customerSnapshot" JSONB,
  "shipmentSnapshot" JSONB,
  "agentSnapshot" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "businessAmount" DECIMAL(14,2) NOT NULL,
  "businessCurrency" TEXT NOT NULL DEFAULT 'RMB',
  "businessSettlementMethod" TEXT,
  "businessExchangeRate" DECIMAL(18,8),
  "businessRmbAmount" DECIMAL(14,2),
  "payableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "payableCurrency" TEXT NOT NULL DEFAULT 'RMB',
  "payableSettlementMethod" TEXT,
  "payableExchangeRate" DECIMAL(18,8),
  "payableRmbAmount" DECIMAL(14,2),
  "matchStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
  "confirmationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "auditStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "hangStatus" TEXT NOT NULL DEFAULT 'NONE',
  "confirmedBy" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "voidedBy" TEXT,
  "voidReason" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdRole" TEXT NOT NULL,
  "createdSite" TEXT,
  "remark" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "idempotencyKey" TEXT,
  "legacyPaymentVoucherId" TEXT,
  "importBatchId" TEXT,
  "importLineId" TEXT,
  "sourceDedupeKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MiscFeeRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MiscFeeHangRequest" (
  "id" TEXT NOT NULL,
  "miscFeeRecordId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "withdrawnBy" TEXT,
  "withdrawnAt" TIMESTAMP(3),
  "remark" TEXT,
  "rejectionReason" TEXT,
  "idempotencyKey" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MiscFeeHangRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MiscFeeAttachment" (
  "id" TEXT NOT NULL,
  "miscFeeRecordId" TEXT NOT NULL,
  "hangRequestId" TEXT,
  "purpose" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "url" TEXT,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MiscFeeAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MiscFeeMatchHistory" (
  "id" TEXT NOT NULL,
  "miscFeeRecordId" TEXT NOT NULL,
  "shipmentId" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "actor" TEXT NOT NULL,
  "fromShipmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MiscFeeMatchHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfitSettlement" (
  "id" TEXT NOT NULL,
  "settlementNo" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "siteScope" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "receivableRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "businessRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "payableRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "unmatchedPayableRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "profitRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "remark" TEXT,
  "createdBy" TEXT NOT NULL,
  "submittedBy" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfitSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfitSettlementLine" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "miscFeeRecordId" TEXT,
  "shipmentId" TEXT,
  "customerCode" TEXT,
  "systemOrderNo" TEXT,
  "salesperson" TEXT,
  "agentName" TEXT,
  "feeName" TEXT NOT NULL,
  "sourceType" TEXT,
  "businessRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "payableRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "receivableRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "profitRmbAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "unmatched" BOOLEAN NOT NULL DEFAULT false,
  "snapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfitSettlementLine_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShipmentFinanceItem" ADD COLUMN "miscFeeRecordId" TEXT;
ALTER TABLE "ShipmentFinanceItem" ADD COLUMN "miscFeeCostRole" TEXT;

ALTER TABLE "PayablePaymentApplication" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'ORDER_PAYABLE';
ALTER TABLE "PayablePaymentApplication" ADD COLUMN "miscFeeRecordId" TEXT;
ALTER TABLE "PayablePaymentApplication" ALTER COLUMN "payableFinanceItemId" DROP NOT NULL;
ALTER TABLE "PayablePaymentApplication" ALTER COLUMN "shipmentId" DROP NOT NULL;

ALTER TABLE "PaymentApplicationItem" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'ORDER_PAYABLE';
ALTER TABLE "PaymentApplicationItem" ADD COLUMN "miscFeeRecordId" TEXT;
ALTER TABLE "PaymentApplicationItem" ALTER COLUMN "payableFinanceItemId" DROP NOT NULL;
ALTER TABLE "PaymentApplicationItem" ALTER COLUMN "shipmentId" DROP NOT NULL;

CREATE UNIQUE INDEX "MiscFeeImportBatch_previewToken_key" ON "MiscFeeImportBatch"("previewToken");
CREATE UNIQUE INDEX "MiscFeeImportBatch_checksum_key" ON "MiscFeeImportBatch"("checksum");
CREATE INDEX "MiscFeeImportBatch_status_createdAt_idx" ON "MiscFeeImportBatch"("status", "createdAt");
CREATE UNIQUE INDEX "MiscFeeImportLine_batchId_rowNo_key" ON "MiscFeeImportLine"("batchId", "rowNo");
CREATE INDEX "MiscFeeImportLine_dedupeKey_idx" ON "MiscFeeImportLine"("dedupeKey");
CREATE INDEX "MiscFeeImportLine_kuayueBillNo_idx" ON "MiscFeeImportLine"("kuayueBillNo");
CREATE INDEX "MiscFeeRecord_businessNo_idx" ON "MiscFeeRecord"("businessNo");
CREATE UNIQUE INDEX "MiscFeeRecord_purchase_businessNo_key" ON "MiscFeeRecord"("businessNo") WHERE "sourceType" = 'PURCHASE' AND "businessNo" IS NOT NULL;
CREATE UNIQUE INDEX "MiscFeeRecord_idempotencyKey_key" ON "MiscFeeRecord"("idempotencyKey");
CREATE UNIQUE INDEX "MiscFeeRecord_legacyPaymentVoucherId_key" ON "MiscFeeRecord"("legacyPaymentVoucherId");
CREATE UNIQUE INDEX "MiscFeeRecord_importLineId_key" ON "MiscFeeRecord"("importLineId");
CREATE UNIQUE INDEX "MiscFeeRecord_sourceDedupeKey_key" ON "MiscFeeRecord"("sourceDedupeKey");
CREATE INDEX "MiscFeeRecord_sourceType_occurredAt_idx" ON "MiscFeeRecord"("sourceType", "occurredAt");
CREATE INDEX "MiscFeeRecord_customerId_occurredAt_idx" ON "MiscFeeRecord"("customerId", "occurredAt");
CREATE INDEX "MiscFeeRecord_shipmentId_occurredAt_idx" ON "MiscFeeRecord"("shipmentId", "occurredAt");
CREATE INDEX "MiscFeeRecord_confirmationStatus_auditStatus_hangStatus_idx" ON "MiscFeeRecord"("confirmationStatus", "auditStatus", "hangStatus");
CREATE INDEX "MiscFeeRecord_ownerType_occurredAt_idx" ON "MiscFeeRecord"("ownerType", "occurredAt");
CREATE INDEX "MiscFeeRecord_createdBy_occurredAt_idx" ON "MiscFeeRecord"("createdBy", "occurredAt");
CREATE UNIQUE INDEX "MiscFeeHangRequest_idempotencyKey_key" ON "MiscFeeHangRequest"("idempotencyKey");
CREATE INDEX "MiscFeeHangRequest_status_requestedAt_idx" ON "MiscFeeHangRequest"("status", "requestedAt");
CREATE INDEX "MiscFeeHangRequest_miscFeeRecordId_status_idx" ON "MiscFeeHangRequest"("miscFeeRecordId", "status");
CREATE INDEX "MiscFeeAttachment_miscFeeRecordId_purpose_createdAt_idx" ON "MiscFeeAttachment"("miscFeeRecordId", "purpose", "createdAt");
CREATE INDEX "MiscFeeAttachment_hangRequestId_createdAt_idx" ON "MiscFeeAttachment"("hangRequestId", "createdAt");
CREATE INDEX "MiscFeeMatchHistory_miscFeeRecordId_createdAt_idx" ON "MiscFeeMatchHistory"("miscFeeRecordId", "createdAt");
CREATE INDEX "MiscFeeMatchHistory_shipmentId_createdAt_idx" ON "MiscFeeMatchHistory"("shipmentId", "createdAt");
CREATE UNIQUE INDEX "ProfitSettlement_settlementNo_key" ON "ProfitSettlement"("settlementNo");
CREATE UNIQUE INDEX "ProfitSettlement_idempotencyKey_key" ON "ProfitSettlement"("idempotencyKey");
CREATE INDEX "ProfitSettlement_type_siteScope_status_periodFrom_periodTo_idx" ON "ProfitSettlement"("type", "siteScope", "status", "periodFrom", "periodTo");
CREATE UNIQUE INDEX "ProfitSettlementLine_settlementId_miscFeeRecordId_key" ON "ProfitSettlementLine"("settlementId", "miscFeeRecordId");
CREATE UNIQUE INDEX "ProfitSettlementLine_sourceKey_key" ON "ProfitSettlementLine"("sourceKey");
CREATE INDEX "ProfitSettlementLine_miscFeeRecordId_idx" ON "ProfitSettlementLine"("miscFeeRecordId");
CREATE INDEX "ProfitSettlementLine_shipmentId_idx" ON "ProfitSettlementLine"("shipmentId");
CREATE UNIQUE INDEX "ShipmentFinanceItem_miscFeeRecordId_miscFeeCostRole_key" ON "ShipmentFinanceItem"("miscFeeRecordId", "miscFeeCostRole");
CREATE UNIQUE INDEX "PayablePaymentApplication_miscFeeRecordId_key" ON "PayablePaymentApplication"("miscFeeRecordId");
CREATE INDEX "PaymentApplicationItem_miscFeeRecordId_idx" ON "PaymentApplicationItem"("miscFeeRecordId");

ALTER TABLE "MiscFeeImportLine" ADD CONSTRAINT "MiscFeeImportLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MiscFeeImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "MiscFeeImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_importLineId_fkey" FOREIGN KEY ("importLineId") REFERENCES "MiscFeeImportLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MiscFeeHangRequest" ADD CONSTRAINT "MiscFeeHangRequest_miscFeeRecordId_fkey" FOREIGN KEY ("miscFeeRecordId") REFERENCES "MiscFeeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MiscFeeAttachment" ADD CONSTRAINT "MiscFeeAttachment_miscFeeRecordId_fkey" FOREIGN KEY ("miscFeeRecordId") REFERENCES "MiscFeeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiscFeeAttachment" ADD CONSTRAINT "MiscFeeAttachment_hangRequestId_fkey" FOREIGN KEY ("hangRequestId") REFERENCES "MiscFeeHangRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiscFeeMatchHistory" ADD CONSTRAINT "MiscFeeMatchHistory_miscFeeRecordId_fkey" FOREIGN KEY ("miscFeeRecordId") REFERENCES "MiscFeeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiscFeeMatchHistory" ADD CONSTRAINT "MiscFeeMatchHistory_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfitSettlementLine" ADD CONSTRAINT "ProfitSettlementLine_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "ProfitSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfitSettlementLine" ADD CONSTRAINT "ProfitSettlementLine_miscFeeRecordId_fkey" FOREIGN KEY ("miscFeeRecordId") REFERENCES "MiscFeeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfitSettlementLine" ADD CONSTRAINT "ProfitSettlementLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShipmentFinanceItem" ADD CONSTRAINT "ShipmentFinanceItem_miscFeeRecordId_fkey" FOREIGN KEY ("miscFeeRecordId") REFERENCES "MiscFeeRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayablePaymentApplication" ADD CONSTRAINT "PayablePaymentApplication_miscFeeRecordId_fkey" FOREIGN KEY ("miscFeeRecordId") REFERENCES "MiscFeeRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentApplicationItem" ADD CONSTRAINT "PaymentApplicationItem_miscFeeRecordId_fkey" FOREIGN KEY ("miscFeeRecordId") REFERENCES "MiscFeeRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayablePaymentApplication" ADD CONSTRAINT "PayablePaymentApplication_exactly_one_source_check" CHECK (
  ("sourceType" = 'ORDER_PAYABLE' AND "payableFinanceItemId" IS NOT NULL AND "miscFeeRecordId" IS NULL)
  OR ("sourceType" = 'MISC_FEE_PAYABLE' AND "payableFinanceItemId" IS NULL AND "miscFeeRecordId" IS NOT NULL)
);
ALTER TABLE "PaymentApplicationItem" ADD CONSTRAINT "PaymentApplicationItem_exactly_one_source_check" CHECK (
  ("sourceType" = 'ORDER_PAYABLE' AND "payableFinanceItemId" IS NOT NULL AND "miscFeeRecordId" IS NULL)
  OR ("sourceType" = 'MISC_FEE_PAYABLE' AND "payableFinanceItemId" IS NULL AND "miscFeeRecordId" IS NOT NULL)
);
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_nonnegative_amounts_check" CHECK (
  "businessAmount" >= 0 AND "payableAmount" >= 0
);
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_source_type_check" CHECK (
  "sourceType" IN ('KUAYUE', 'WAREHOUSE_PICKUP', 'MARKET_PICKUP', 'OTHER_PICKUP', 'TALLY_MISC', 'PURCHASE', 'DELIVERY')
);
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_match_status_check" CHECK ("matchStatus" IN ('UNMATCHED', 'MATCHED'));
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_confirmation_status_check" CHECK ("confirmationStatus" IN ('PENDING', 'CONFIRMED'));
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_audit_status_check" CHECK ("auditStatus" IN ('PENDING', 'APPROVED'));
ALTER TABLE "MiscFeeRecord" ADD CONSTRAINT "MiscFeeRecord_hang_status_check" CHECK ("hangStatus" IN ('NONE', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'));
ALTER TABLE "MiscFeeHangRequest" ADD CONSTRAINT "MiscFeeHangRequest_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'));
ALTER TABLE "ProfitSettlement" ADD CONSTRAINT "ProfitSettlement_type_check" CHECK ("type" IN ('MARKET', 'WAREHOUSE', 'FINANCE'));
ALTER TABLE "ProfitSettlement" ADD CONSTRAINT "ProfitSettlement_status_check" CHECK ("status" IN ('DRAFT', 'PENDING_AUDIT', 'APPROVED', 'ARCHIVED'));
